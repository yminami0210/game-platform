#!/usr/bin/env python3
"""遊び場（player/）を、スマホから開ける claude.ai の Artifact 用に1つのフォルダへ束ねる。

  python3 player/bin/bundle.py <出力フォルダ>

出力フォルダの中身:
  index.html                 player/index.html から <!doctype>/<html>/<head>/<body> を外したもの
                             （Artifact は公開時に自分で外枠を付けるため）。arcade/ の場所を
                             data-arcade-root="arcade/" に切り替える1行を足す
  css/ js/ data/             player/ からそのまま
  arcade/catalog.json        遊べる（ready/published）ゲームだけ
  arcade/games/<id>/index.html, qa/play.png
最後に、Artifact の files 引数に渡す対応表を files.json として書き出す。
元の player/ と arcade/ は書き換えない。
"""
import json
import re
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
PLAYER = REPO / "player"
ARCADE = REPO / "arcade"
PLAYABLE = {"ready", "published"}


def page_body(html: str) -> str:
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    # 外枠が付けるので charset と viewport は外す
    head = re.sub(r'<meta (charset|name="viewport")[^>]*>\n?', "", head)
    root = '<script>document.documentElement.dataset.arcadeRoot = "arcade/";</script>\n'
    return head.strip() + "\n" + root + body.strip() + "\n"


def main(out: Path) -> None:
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / "index.html").write_text(page_body((PLAYER / "index.html").read_text(encoding="utf-8")), encoding="utf-8")
    for d in ("css", "js", "data"):
        shutil.copytree(PLAYER / d, out / d)

    catalog = json.loads((ARCADE / "catalog.json").read_text(encoding="utf-8"))
    catalog["games"] = [g for g in catalog["games"] if g["status"] in PLAYABLE]
    (out / "arcade").mkdir()
    (out / "arcade" / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    for g in catalog["games"]:
        src, dst = ARCADE / "games" / g["id"], out / "arcade" / "games" / g["id"]
        (dst / "qa").mkdir(parents=True)
        shutil.copy(src / "index.html", dst / "index.html")
        if (src / "qa" / "play.png").exists():
            shutil.copy(src / "qa" / "play.png", dst / "qa" / "play.png")

    files = {str(p.relative_to(out)): str(p) for p in sorted(out.rglob("*")) if p.is_file() and p.name != "index.html" or (p.is_file() and p.parent != out)}
    files.pop("index.html", None)
    (out / "files.json").write_text(json.dumps(files, ensure_ascii=False, indent=2), encoding="utf-8")
    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"{out}: ゲーム {len(catalog['games'])} 本、ファイル {len(files) + 1} 個、合計 {size / 1e6:.1f}MB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).resolve())
