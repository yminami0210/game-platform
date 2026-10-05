"""下書きをGemini（Google AI Pro、Antigravity CLI `agy` 経由）に書かせる補助スクリプト。

使い方:
  python3 tools/gemini_draft.py <依頼ファイル> <出力ファイル> [--model gemini-3.1-pro-high]

- 依頼ファイル：Claudeが作る。必要な資料と指示を全部入れる（Geminiはプロジェクトのファイルを読めない）
- 出力ファイル：Geminiの返答をそのまま書き込む
- 出力ファイルと同じフォルダの「生成記録.md」に、日時・モデル・依頼ファイル・トークン数を追記する
- 使えるモデルは `~/.local/bin/agy models` で確かめる

Geminiにはファイルを読み書きさせない（空の一時フォルダで、計画モード（読み取り専用）で動かす）。
失敗したら終了コード1で止まり、理由を表示する（ログイン切れ、利用上限など）。
"""
import datetime
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_MODEL = "gemini-3.1-pro-high"
TIMEOUT = 900
INSTRUCTION = "次の依頼文に従って、成果物の本文だけを返してください。前置きや説明はつけないでください。ファイルの作成や編集はしないでください。\n\n"


def agy_path():
    for p in [shutil.which("agy"), os.path.expanduser("~/.local/bin/agy")]:
        if p and os.path.exists(p):
            return p
    sys.exit("agy コマンドが見つかりません。Antigravity CLI をインストールしてください。")


def main():
    args = sys.argv[1:]
    model = DEFAULT_MODEL
    if "--model" in args:
        i = args.index("--model")
        model = args[i + 1]
        del args[i:i + 2]
    if len(args) != 2:
        sys.exit(__doc__)
    req_path, out_path = (os.path.abspath(a) for a in args)
    request = open(req_path, encoding="utf-8").read()

    with tempfile.TemporaryDirectory() as work:
        r = subprocess.run(
            [agy_path(), "-p", INSTRUCTION + request, "--model", model, "--mode", "plan",
             "--output-format", "json", "--print-timeout", f"{TIMEOUT}s"],
            capture_output=True, text=True, cwd=work, timeout=TIMEOUT + 60,
        )
    try:
        data = json.loads(r.stdout[r.stdout.index("{"):])
    except ValueError:
        data = {}
    text = (data.get("response") or "").strip()
    if r.returncode != 0 or data.get("status") != "SUCCESS" or not text:
        err = r.stderr.replace("ERROR: logging before google.Init: ", "").strip()[-800:] or r.stdout.strip()[-800:]
        sys.exit(f"Geminiでの生成に失敗しました（終了コード {r.returncode}、状態 {data.get('status')}）：{err}")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(text + "\n")

    tokens = data.get("usage", {}).get("total_tokens", "-")
    log = os.path.join(os.path.dirname(out_path), "生成記録.md")
    new = not os.path.exists(log)
    with open(log, "a", encoding="utf-8") as f:
        if new:
            f.write("# 生成記録\n\n| 日時 | 出力 | 依頼ファイル | 依頼の指紋（SHA-256先頭12桁） | モデル | トークン |\n|---|---|---|---|---|---|\n")
        f.write("| {} | {} | {} | {} | {} | {} |\n".format(
            datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            os.path.relpath(out_path, ROOT), os.path.relpath(req_path, ROOT),
            hashlib.sha256(request.encode("utf-8")).hexdigest()[:12], model, tokens))
    print(f"書き出し：{os.path.relpath(out_path, ROOT)}（{model}、{len(text)}字）")


if __name__ == "__main__":
    main()
