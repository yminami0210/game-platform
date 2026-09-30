#!/usr/bin/env python3
"""AI相棒の安全装置（PreToolUse フック）。

停止ラインに該当する操作を機械的にブロックする。ブロック時は exit 2 で
理由を stderr に出し、Claude に代替案を考えさせる。判定できない入力は通す。
"""
import json
import re
import sys

# Bash コマンドの停止ライン: (パターン, 理由)
BASH_RULES = [
    (r"\brm\s+(-[a-zA-Z]*[rf][a-zA-Z]*\s+)+(/|~|\$HOME)(\s|/?\*?$|$)",
     "ルートやホームディレクトリの一括削除は禁止"),
    (r"\bgit\s+push\b.*(--force\b|-f\b|--force-with-lease\b).*\b(main|master)\b",
     "main/master への force push は禁止"),
    (r"\bgit\s+push\b.*\b(main|master)\b.*(--force\b|-f\b)",
     "main/master への force push は禁止"),
    (r"(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b",
     "取得したスクリプトをそのまま実行するのは禁止（内容を確認してから実行）"),
    (r"(GIT_SSL_NO_VERIFY|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0|--insecure\b|\bcurl\b.*\s-k\b|(?i:sslVerify)[\s=]+false)",
     "TLS 検証の無効化は禁止"),
    (r"\bunset\s+(HTTPS?_PROXY|https?_proxy)\b",
     "プロキシ設定の解除は禁止"),
    (r"\b(printenv|env)\b\s*($|\|)|\becho\s+.*\$\{?[A-Z_]*(TOKEN|SECRET|KEY|PASSWORD)",
     "環境変数（秘密情報を含みうる）の出力は禁止"),
    (r"\bchmod\s+(-R\s+)?777\b",
     "全員書き込み可能な権限の付与は禁止"),
    (r"\bmkfs\b|\bdd\s+.*of=/dev/",
     "ディスクの破壊的操作は禁止"),
    (r":\(\)\s*\{\s*:\|:&\s*\};:",
     "fork bomb は禁止"),
    (r"(rm|mv|>)\s+.*\.claude/(hooks|settings)",
     "安全装置（フック・権限設定）の削除や上書きは禁止"),
    (r"\bgit\s+add\b.*(\.env\b|id_rsa|\.pem\b|credentials)",
     "秘密情報ファイルのコミットは禁止"),
]

# 読み書きしてはいけない秘密情報ファイル
SECRET_PATH = re.compile(
    r"(^|/)(\.env(\.[\w-]+)?|id_(rsa|ed25519|ecdsa)|[^/]*\.pem|[^/]*\.p12|credentials(\.json)?|\.netrc|\.npmrc|\.pypirc)$"
    r"|(^|/)\.(ssh|aws|gnupg)/"
)
SECRET_ALLOW = re.compile(r"\.env\.(example|sample|template)$")


def block(reason: str) -> None:
    print(f"[guard] ブロックしました: {reason}。CLAUDE.md の停止ラインを確認し、安全な代替案を取るかオーナーに相談してください。",
          file=sys.stderr)
    sys.exit(2)


def main() -> None:
    try:
        data = json.load(sys.stdin)
    except Exception:
        return
    tool = data.get("tool_name", "")
    inp = data.get("tool_input") or {}

    if tool == "Bash":
        cmd = inp.get("command", "")
        for pattern, reason in BASH_RULES:
            if re.search(pattern, cmd):
                block(reason)
        return

    if tool in ("Read", "Write", "Edit", "NotebookEdit"):
        path = inp.get("file_path") or inp.get("notebook_path") or ""
        if SECRET_PATH.search(path) and not SECRET_ALLOW.search(path):
            block(f"秘密情報ファイル（{path}）へのアクセス")
        if tool in ("Write", "Edit") and re.search(r"(^|/)\.claude/(hooks/|settings(\.local)?\.json$)", path):
            block("安全装置（フック・権限設定）の書き換えはオーナーの明示的な指示がある場合のみ")


if __name__ == "__main__":
    main()
