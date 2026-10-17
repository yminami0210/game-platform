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

    def day(s: str) -> str:
        try:
            d = datetime.date.fromisoformat(str(s))
            return f"{d.month}/{d.day}"
        except ValueError:
            return ""

    notes = "\n".join(
        f'<li class="note{" new" if i == 0 else ""}">'
        f'<a href="games/{html.escape(m["id"])}/index.html">'
        f'<span class="when">{html.escape(day(m.get("created", "")))}</span>'
        f'<span class="title">{html.escape(m["title"])}</span>'
        f'<span class="pitch">{html.escape(m["pitch"])}</span>'
        f'<span class="how">{html.escape(m["controls"])}</span>'
        f'<span class="sign">{html.escape(m["genre"])}より</span></a></li>'
        for i, m in enumerate(shown)
    ) or '<li class="empty">まだ伝言はありません。あしたの朝、最初の1本が書かれます。</li>'
    newest = html.escape(shown[0]["title"]) if shown else "まだなし"
    css = """
:root{--wall:#c7cfca;--wall-line:#b6bfba;--plate:#f6f7f3;--ink:#1d2a2c;--line:#1f7a5a;
--board:#2c4a3e;--frame:#a9afad;--chalk:#ecebe1;--chalk-dim:#bfc7bd;--yellow:#f0d36a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--wall:#1b2223;--wall-line:#232c2d;
--plate:#d9dcd6;--ink:#182224;--line:#2a8a67;--board:#203a30;--frame:#5f6765;--chalk:#e3e2d8;--chalk-dim:#a9b2a8}}
:root[data-theme="dark"]{--wall:#1b2223;--wall-line:#232c2d;--plate:#d9dcd6;--ink:#182224;--line:#2a8a67;
--board:#203a30;--frame:#5f6765;--chalk:#e3e2d8;--chalk-dim:#a9b2a8}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;color:var(--ink);background-color:var(--wall);
background-image:linear-gradient(var(--wall-line) 2px,transparent 2px),linear-gradient(90deg,var(--wall-line) 2px,transparent 2px);
background-size:96px 48px;font-family:"Zen Kaku Gothic New","Hiragino Sans","Yu Gothic",sans-serif;overflow-x:hidden}
.wrap{max-width:1040px;margin:0 auto;padding:28px 16px 48px}
/* 駅名標 */
.station{background:var(--plate);border-radius:6px;padding:18px 0 0;text-align:center;
box-shadow:inset 0 0 0 1px #0001,0 3px 0 #0002;position:relative;overflow:hidden}
.station .kana{display:block;font-size:15px;font-weight:700;letter-spacing:.5em;padding-left:.5em}
.station h1{margin:0;font-size:clamp(52px,14vw,104px);font-weight:900;line-height:1.05;letter-spacing:.12em;padding-left:.12em}
.station .roma{display:block;font-size:15px;font-weight:500;letter-spacing:.08em;margin:4px 0 14px}
.band{background:var(--line);color:#fff;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;
gap:12px;padding:8px 14px;font-size:14px;font-weight:700}
.band .prev{text-align:left}.band .next{text-align:right}
.band small{display:block;font-weight:500;font-size:11px;opacity:.85}
.number{position:absolute;top:14px;left:14px;width:52px;height:52px;border:4px solid var(--line);border-radius:10px;
background:#fff;display:grid;place-items:center;line-height:1;font-weight:900;color:var(--ink)}
.number b{font-size:12px;color:var(--line)}.number span{font-size:20px;font-variant-numeric:tabular-nums}
.posts{display:flex;justify-content:space-between;padding:0 18%;height:22px}
.posts i{width:10px;background:var(--frame)}
/* 伝言板 */
.board{background-color:var(--board);border:12px solid var(--frame);border-bottom-width:28px;border-radius:3px;
padding:22px 18px 18px;position:relative;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.board::after{content:"";position:absolute;left:12%;bottom:-20px;width:38px;height:9px;border-radius:3px;background:var(--chalk);
box-shadow:64px 1px 0 -1px var(--yellow)}
.board h2{margin:0 0 14px;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 20px;
font-family:"Klee One","Zen Kaku Gothic New",sans-serif;font-weight:600;color:var(--chalk-dim);font-size:15px}
.board h2 b{color:var(--chalk);font-size:22px;letter-spacing:.3em}
ol{list-style:none;margin:0;padding:0;columns:320px 3;column-gap:28px}
.note{break-inside:avoid;margin:0 0 22px;transform:rotate(-.6deg)}
.note:nth-child(3n+2){transform:rotate(.5deg) translateX(6px)}
.note:nth-child(4n+3){transform:rotate(-1.1deg) translateX(-3px)}
.note a{display:block;color:var(--chalk);text-decoration:none;font-family:"Klee One","Zen Kaku Gothic New",sans-serif;
padding:8px 4px 10px;border-bottom:1px dashed #ecebe133;text-shadow:0 0 1px #ecebe199,1px 0 0 #ecebe122;line-height:1.7}
.note a:hover .title,.note a:focus-visible .title{text-decoration:underline wavy 1px;text-underline-offset:6px}
.note a:focus-visible{outline:2px dashed var(--yellow);outline-offset:4px}
.when{display:block;font-size:14px;color:var(--chalk-dim);font-variant-numeric:tabular-nums}
.title{display:block;font-size:26px;font-weight:600;line-height:1.3;margin:2px 0 4px;overflow-wrap:anywhere}
.pitch{display:block;font-size:16px}
.how{display:block;font-size:13px;color:var(--chalk-dim);margin-top:6px}
.sign{display:block;text-align:right;font-size:14px;margin-top:4px;color:var(--chalk-dim)}
.new .title,.new .when{color:var(--yellow);text-shadow:0 0 1px #f0d36a99}
.empty{color:var(--chalk);font-family:"Klee One",sans-serif;font-size:18px;padding:12px 0}
footer{margin:20px 2px 0;font-size:13px;color:var(--ink)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) footer{color:var(--chalk-dim)}}
:root[data-theme="dark"] footer{color:var(--chalk-dim)}
@media (max-width:520px){.number{width:42px;height:42px;top:10px;left:10px;border-width:3px}.number span{font-size:16px}
.station .kana,.station .roma{font-size:13px}.band{font-size:12px;gap:8px;padding:8px 10px}
.board{border-width:9px;border-bottom-width:24px;padding:18px 14px 12px}.title{font-size:23px}}
"""
    (ARCADE / "index.html").write_text(f"""<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>あそびば駅 伝言板</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Klee+One:wght@400;600&family=Zen+Kaku+Gothic+New:wght@500;700;900&display=swap" rel="stylesheet">
<style>{css}</style></head><body>
<div class="wrap">
<header class="station">
<div class="number" aria-label="これまでの本数 {len(shown)}"><b>AS</b><span>{len(shown):02d}</span></div>
<span class="kana">あそびば</span>
<h1>遊び場</h1>
<span class="roma">Asobiba</span>
<div class="band"><span class="prev"><small>いちばん新しい</small>{newest}</span><span></span><span class="next"><small>つぎの1本</small>あしたの朝</span></div>
</header>
<div class="posts" aria-hidden="true"><i></i><i></i></div>
<main class="board">
<h2><b>伝言板</b><span>すぐ遊べて、すぐ終わるゲームを毎朝1本書き足しています</span></h2>
<ol>
{notes}
</ol>
</main>
<footer>古い伝言も消さずに残しています。どれでも名前を押すと遊べます。</footer>
</div>
</body></html>
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
