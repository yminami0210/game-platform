#!/usr/bin/env python3
"""ミニゲーム工場（arcade）の管理。

使い方:
  arcade.py new <英語slug>        games/<番号>-<slug>/ を作り、meta.json の雛形を置く（パスを出力）
  arcade.py check <game_dir>      meta.json と企画書の機械チェック（失敗で exit 1）
  arcade.py set <game_dir> <status> [note]
                                  状態を更新（draft / ready / rejected / published）
  arcade.py catalog               catalog.json と遊び場ページ index.html を作り直す
  arcade.py list                  ゲームの一覧（新しい順）と、最近使ったジャンル・操作
"""
import datetime
import html
import json
import re
import sys
from pathlib import Path

ARCADE = Path(__file__).resolve().parent.parent
GAMES = ARCADE / "games"
STATUSES = ["draft", "ready", "rejected", "published"]
META_KEYS = ["title", "pitch", "genre", "controls", "how_to_play", "status", "created"]
PLAN_SECTIONS = ["一行ピッチ", "30秒のコアループ", "操作", "気持ちいい瞬間", "終わり方とスコア", "既存作との違い"]


def games() -> list:
    return sorted(p for p in GAMES.glob("*/meta.json")) if GAMES.exists() else []


def load(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def save(p: Path, d: dict) -> None:
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cmd_new(slug: str) -> None:
    slug = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-") or "game"
    nums = [int(p.parent.name.split("-")[0]) for p in games() if p.parent.name[:3].isdigit()]
    d = GAMES / f"{(max(nums) + 1 if nums else 1):03d}-{slug}"
    d.mkdir(parents=True)
    save(d / "meta.json", {
        "title": "", "pitch": "", "genre": "", "controls": "", "how_to_play": "",
        "status": "draft", "created": datetime.date.today().isoformat(), "note": "",
    })
    print(d)


def section(text: str, heading: str) -> str:
    m = re.search(rf"^##\s*{re.escape(heading)}[^\n]*\n(.*?)(?=^##\s|\Z)", text, flags=re.M | re.S)
    return m.group(1).strip() if m else ""


def check(d: Path) -> list:
    errors = []
    mp = d / "meta.json"
    if not mp.exists():
        return [f"{mp} がありません"]
    meta = load(mp)
    for k in META_KEYS:
        if not str(meta.get(k, "")).strip():
            errors.append(f"meta.json の {k} が空です")
    if meta.get("status") not in STATUSES:
        errors.append(f"status は {STATUSES} のどれか")
    if len(meta.get("pitch", "")) > 60:
        errors.append("pitch は60字以内（一行で言えること）")
    others = [load(p) for p in games() if p.parent.resolve() != d.resolve()]
    if any(o.get("title") == meta.get("title") for o in others):
        errors.append(f"タイトル「{meta.get('title')}」は既にあります")
    plan = d / "plan.md"
    if not plan.exists():
        errors.append("plan.md（企画書）がありません")
    else:
        t = plan.read_text(encoding="utf-8")
        for h in PLAN_SECTIONS:
            if not section(t, h):
                errors.append(f"plan.md に「## {h}」がありません（または空です）")
    if not (d / "index.html").exists():
        errors.append("index.html がありません")
    return errors


def cmd_set(d: Path, status: str, note: str) -> None:
    if status not in STATUSES:
        sys.exit(f"status は {STATUSES} のどれか")
    mp = d / "meta.json"
    meta = load(mp)
    meta["status"], meta["note"] = status, note
    save(mp, meta)


def cmd_catalog() -> None:
    items = []
    for p in reversed(games()):
        m = load(p)
        m["id"] = p.parent.name
        items.append(m)
    save(ARCADE / "catalog.json", {"updated": datetime.date.today().isoformat(), "games": items})
    shown = [m for m in items if m["status"] in ("ready", "published")]
    cards = "\n".join(
        f'<a class="card" href="games/{html.escape(m["id"])}/index.html">'
        f'<span class="genre">{html.escape(m["genre"])}</span>'
        f'<h2>{html.escape(m["title"])}</h2><p>{html.escape(m["pitch"])}</p>'
        f'<small>{html.escape(m["controls"])}</small></a>'
        for m in shown
    ) or "<p>まだゲームがありません。</p>"
    (ARCADE / "index.html").write_text(f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ミニゲーム・アーケード</title>
<style>
:root{{--bg:#f6f3ee;--fg:#22252b;--card:#fff;--muted:#6b6f76;--accent:#c8643b}}
@media (prefers-color-scheme:dark){{:root{{--bg:#16181c;--fg:#eceae6;--card:#22252b;--muted:#a3a6ab;--accent:#f08a5d}}}}
body{{margin:0;background:var(--bg);color:var(--fg);font-family:system-ui,sans-serif}}
header{{padding:24px 16px 8px}}h1{{margin:0;font-size:24px}}header p{{margin:4px 0 0;color:var(--muted)}}
main{{display:grid;gap:12px;padding:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}
.card{{display:block;background:var(--card);border-radius:14px;padding:16px;color:inherit;text-decoration:none;box-shadow:0 1px 3px #0002}}
.card h2{{margin:6px 0;font-size:18px}}.card p{{margin:0 0 8px}}.card small{{color:var(--muted)}}
.genre{{font-size:12px;color:var(--accent);font-weight:600}}
</style></head><body>
<header><h1>ミニゲーム・アーケード</h1><p>すぐ遊べて、すぐ終わる。{len(shown)} 本</p></header>
<main>
{cards}
</main></body></html>
""", encoding="utf-8")
    print(f"catalog: 全 {len(items)} 本 / 遊び場に表示 {len(shown)} 本")


def cmd_list() -> None:
    items = [(p.parent.name, load(p)) for p in reversed(games())]
    for gid, m in items:
        print(f"{gid:<28} {m['status']:<9} {m['genre']:<14} {m['title']}")
    recent = items[:12]
    print("\n最近のジャンル:", ", ".join(m["genre"] for _, m in recent) or "なし")
    print("最近の操作:", ", ".join(m["controls"] for _, m in recent) or "なし")


def main(argv: list) -> None:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "new" and len(argv) == 3:
        cmd_new(argv[2])
    elif cmd == "check" and len(argv) == 3:
        errors = check(Path(argv[2]))
        print("NG\n" + "\n".join(f"- {e}" for e in errors) if errors else "OK")
        sys.exit(1 if errors else 0)
    elif cmd == "set" and len(argv) >= 4:
        cmd_set(Path(argv[2]), argv[3], " ".join(argv[4:]))
    elif cmd == "catalog":
        cmd_catalog()
    elif cmd == "list":
        cmd_list()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
