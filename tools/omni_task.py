"""ルーティン業務の「実行」を OmniRoute 経由の AI にさせる補助スクリプト。

考える（依頼文を作る、次に何をするか決める、最終チェック）のは Claude。書く・1次点検するのは OmniRoute。
設定の正本は Artifact「OmniRoute 運用設定」（https://claude.ai/artifact/9xmFA9SxMfJgCnP96bVVoL）。

使い方:
  python3 tools/omni_task.py <役割> <依頼ファイル> <出力ファイル>
  python3 tools/omni_task.py --check      # OmniRoute が使えるかだけ調べる（使えれば終了コード0）

- 役割: writer（下書き・書き直し）、critic（1次点検。writer と別のモデル）、clerk（集計・とりまとめなどの事務）
  役割ごとのモデルは tools/omni_models.json で決める（OmniRoute のモデル名かコンボ名）
- 依頼ファイル: Claude が作る。必要な資料と指示を全部入れる（実行する AI はプロジェクトのファイルを読めない）。
  秘密情報（API キー、パスワード、個人情報）は入れない
- 出力ファイル: 返答をそのまま書き込む
- 出力ファイルと同じフォルダの「生成記録.md」に、日時・役割・実際に答えたモデル・依頼の指紋・トークン数を追記する

OmniRoute はオーナーの Mac の中（127.0.0.1）だけで動く。止まっていれば裏で起動する（`omniroute serve --daemon`）。
OmniRoute で失敗したら Gemini（tools/gemini_draft.py）に切り替える。それも無いか失敗したら終了コード1で止まる
（そのときは Claude が代筆し、成果物と報告にそう書く）。クラウドのセッションからは OmniRoute に届かないので、
先に --check で確かめる。
"""
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "http://127.0.0.1:20128"
TIMEOUT = 900
SYSTEM = "依頼文に従って、成果物の本文だけを返してください。前置きや説明、締めの挨拶はつけないでください。"
ENV_PATH = "/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:" + os.path.expanduser("~/.local/bin") + ":"
GEMINI_DRAFT = os.path.join(ROOT, "tools", "gemini_draft.py")


def server_up():
    try:
        urllib.request.urlopen(BASE + "/v1/models", timeout=5)
        return True
    except urllib.error.HTTPError:
        return True
    except Exception:
        return False


def ensure_server():
    if server_up():
        return True
    env = dict(os.environ, PATH=ENV_PATH + os.environ.get("PATH", ""))
    try:
        subprocess.run(["omniroute", "serve", "--daemon", "--no-open"], env=env,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        # omniroute が入っていない（クラウドのセッションなど）
        return False
    for _ in range(30):
        if server_up():
            return True
        time.sleep(2)
    return False


def call_omniroute(model, request):
    body = json.dumps({"model": model, "messages": [
        {"role": "system", "content": SYSTEM}, {"role": "user", "content": request}]}).encode("utf-8")
    req = urllib.request.Request(BASE + "/v1/chat/completions", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
        data = json.loads(res.read().decode("utf-8"))
        decision = res.headers.get("X-OmniRoute-Decision", "")
    text = (data["choices"][0]["message"].get("content") or "").strip()
    if not text:
        raise RuntimeError("返答が空でした")
    return text, data.get("model", model), decision, data.get("usage", {}).get("total_tokens", "-")


def write_log(out_path, req_path, request, role, used, tokens):
    log = os.path.join(os.path.dirname(out_path), "生成記録.md")
    new = not os.path.exists(log)
    with open(log, "a", encoding="utf-8") as f:
        if new:
            f.write("# 生成記録\n\n| 日時 | 出力 | 依頼ファイル | 依頼の指紋（SHA-256先頭12桁） | モデル | トークン |\n|---|---|---|---|---|---|\n")
        f.write("| {} | {} | {} | {} | {} | {} |\n".format(
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            os.path.relpath(out_path, ROOT), os.path.relpath(req_path, ROOT),
            hashlib.sha256(request.encode("utf-8")).hexdigest()[:12], f"{role}：{used}", tokens))


def main():
    if sys.argv[1:] == ["--check"]:
        if ensure_server():
            print("OmniRoute: 使える")
            return
        sys.exit("OmniRoute: 使えない（このマシンに無いか、起動できない）")
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    role = sys.argv[1]
    with open(os.path.join(ROOT, "tools", "omni_models.json"), encoding="utf-8") as f:
        models = json.load(f)
    if role not in models:
        sys.exit(f"役割 {role} は tools/omni_models.json にありません（{', '.join(models)}）")
    req_path, out_path = (os.path.abspath(a) for a in sys.argv[2:])
    with open(req_path, encoding="utf-8") as f:
        request = f.read()

    text, error = None, None
    if ensure_server():
        for _ in range(2):
            try:
                text, used, decision, tokens = call_omniroute(models[role], request)
                break
            except urllib.error.HTTPError as e:
                error = f"HTTP {e.code}：{e.read().decode('utf-8', 'replace')[:600]}"
            except Exception as e:
                error = str(e)[:600]
    else:
        error = "OmniRouteを起動できませんでした"

    if text is None:
        if not os.path.exists(GEMINI_DRAFT):
            sys.exit(f"OmniRouteで失敗し、予備の tools/gemini_draft.py もありません。OmniRoute：{error}")
        print(f"OmniRouteで失敗したのでGeminiに切り替えます：{error}", file=sys.stderr)
        r = subprocess.run([sys.executable, GEMINI_DRAFT, req_path, out_path])
        if r.returncode != 0:
            sys.exit(f"OmniRouteもGeminiも失敗しました。OmniRoute：{error}")
        print("（Geminiで代行）")
        return

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text + "\n")
    used_label = used + (f"（{decision}）" if decision else "")
    write_log(out_path, req_path, request, role, used_label, tokens)
    print(f"書き出し：{os.path.relpath(out_path, ROOT)}（{role}：{used_label}、{len(text)}字）")


if __name__ == "__main__":
    main()
