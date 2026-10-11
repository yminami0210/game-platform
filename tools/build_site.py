#!/usr/bin/env python3
"""公開サイト（GitHub Pages）を組み立てる。

  python3 tools/build_site.py <出力フォルダ>

載せるのは、遊び場（player/）と、オーナーが公開を承認したミニゲーム
（docs/release/approved-games.json）だけ。社内の資料・企画書・監査記録・
大型タイトル・承認前のゲームは載せない。

出力:
  index.html                 遊び場へ案内する入口（player/ へ移動）
  player/                    遊び場（設計資料・スクショ・テスト・ツールは除く）
  arcade/catalog.json        承認済み かつ ready/published のゲームだけ
  arcade/games/<id>/         index.html と qa/play.png（絵札の絵）
  .nojekyll
"""
import json
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PLAYABLE = {"ready", "published"}
PLAYER_SKIP = {"design", "shots", "tests", "bin", "audit.md", "design.md", "README.md"}

ENTRY = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>あそびば</title>
<meta http-equiv="refresh" content="0; url=player/">
<link rel="canonical" href="player/">
<style>body{margin:0;padding:24px 16px;background:#aea596;color:#2a221d;font:16px/1.7 "Kiwi Maru",serif}a{color:#284a9a}</style>
</head>
<body><p>あそびばへ移動します。移動しないときは <a href="player/">こちら</a> を押してください。</p></body>
</html>
"""


def main(out: Path) -> None:
    approved = {g["id"] for g in json.loads((REPO / "docs/release/approved-games.json").read_text(encoding="utf-8"))["approved"]}
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    (out / "index.html").write_text(ENTRY, encoding="utf-8")
    (out / ".nojekyll").write_text("", encoding="utf-8")

    shutil.copytree(REPO / "player", out / "player", ignore=lambda d, names: [n for n in names if Path(d) == REPO / "player" and n in PLAYER_SKIP])

    catalog = json.loads((REPO / "arcade/catalog.json").read_text(encoding="utf-8"))
    games = [g for g in catalog["games"] if g["id"] in approved and g["status"] in PLAYABLE]
    missing = approved - {g["id"] for g in games}
    if missing:
        sys.exit(f"承認済みなのに catalog に無い、または遊べない状態のゲームがあります: {sorted(missing)}")
    catalog["games"] = games
    (out / "arcade").mkdir()
    (out / "arcade/catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for g in games:
        src, dst = REPO / "arcade/games" / g["id"], out / "arcade/games" / g["id"]
        (dst / "qa").mkdir(parents=True)
        shutil.copy(src / "index.html", dst / "index.html")
        if (src / "qa/play.png").exists():
            shutil.copy(src / "qa/play.png", dst / "qa/play.png")

    size = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"{out}: ゲーム {len(games)} 本（{', '.join(g['id'] for g in games)}）、合計 {size / 1e6:.1f}MB")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(Path(sys.argv[1]).resolve())
