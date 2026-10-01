#!/usr/bin/env python3
"""AI社員チームの進行管理と機械チェック。

監査役（00-auditor）が各担当の成果物を判定するときに、まずこのチェックを通す。
人の目（監査役の読み込み）で見る品質は SKILL.md 側の観点で判定する。

使い方:
  team.py init <slug>                 実行フォルダ runs/<日付>-<slug>/ を作る
  team.py check <run_dir> <stage>     stage の成果物を機械チェック（失敗で exit 1）
  team.py set <run_dir> <stage> <state> [note]
                                      進行状況を更新（state: todo/working/revise/pass/fail）
  team.py status [run_dir]            オフィスの様子（進行状況）を表示。省略時は最新の実行
"""
import datetime
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

TEAM_DIR = Path(__file__).resolve().parent.parent
RUNS_DIR = TEAM_DIR / "runs"
CONFIG = TEAM_DIR / "config.json"

STAGES = [
    ("research", "01 リサーチ"),
    ("writing", "02 記事生成"),
    ("assets", "03 素材挿入"),
    ("quality", "04 品質チェック"),
    ("marketing", "05 集客"),
    ("audit", "00 監査役（総括）"),
]
STAGE_KEYS = [k for k, _ in STAGES]
STATES = {"todo": "・待機", "working": "▶ 作業中", "revise": "↺ 差し戻し", "pass": "✓ 合格", "fail": "✗ 中止"}

URL_RE = re.compile(r"https?://[^\s)>\]]+")
IMG_RE = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)\)")


def load_config() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def body_chars(text: str) -> int:
    """見出し記号・画像・URL・空白を除いた本文の文字数。"""
    text = IMG_RE.sub("", text)
    text = URL_RE.sub("", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    return len(re.sub(r"\s", "", text))


def x_weight(text: str) -> int:
    """X の文字数カウント（全角=2、半角=1、URL=23）。"""
    n = 0
    for url in URL_RE.findall(text):
        n += 23
        text = text.replace(url, "", 1)
    for ch in text:
        n += 1 if ord(ch) < 0x1100 else 2
    return n


def section(text: str, heading: str) -> str:
    """'## heading' から次の '## ' までを返す（無ければ空文字）。"""
    m = re.search(rf"^##\s*{re.escape(heading)}.*?$(.*?)(?=^##\s|\Z)", text, flags=re.M | re.S)
    return m.group(1).strip() if m else ""


def read(run: Path, name: str, errors: list) -> str:
    p = run / name
    if not p.exists():
        errors.append(f"{name} がありません")
        return ""
    return p.read_text(encoding="utf-8")


def check_banned(text: str, name: str, cfg: dict, errors: list) -> None:
    for w in cfg["banned_phrases"]:
        if w in text:
            errors.append(f"{name} に禁止表現「{w}」があります")


def check_images(run: Path, text: str, name: str, errors: list) -> int:
    imgs = IMG_RE.findall(text)
    for alt, src in imgs:
        if not alt.strip():
            errors.append(f"{name}: 画像 {src} に代替テキストがありません")
        if src.startswith("http"):
            continue
        p = run / src
        if not p.exists():
            errors.append(f"{name}: 画像ファイル {src} がありません")
        elif p.suffix == ".svg":
            try:
                ET.parse(p)
            except ET.ParseError as e:
                errors.append(f"{src} が壊れた SVG です（{e}）")
    return len(imgs)


def check_stage(run: Path, stage: str, cfg: dict) -> list:
    errors: list = []
    if stage == "research":
        t = read(run, "01-research.md", errors)
        if t:
            for h in ("テーマ", "読者", "要点", "出典"):
                if not section(t, h):
                    errors.append(f"01-research.md に「## {h}」の節がありません（または空です）")
            urls = set(URL_RE.findall(section(t, "出典")))
            if len(urls) < cfg["min_sources"]:
                errors.append(f"出典 URL が {len(urls)} 件です（{cfg['min_sources']} 件以上必要）")
    elif stage == "writing":
        t = read(run, "02-draft.md", errors)
        if t:
            if not t.lstrip().startswith("# "):
                errors.append("02-draft.md の1行目がタイトル（# ...）ではありません")
            n_sec = len(re.findall(r"^##\s", t, flags=re.M))
            if n_sec < cfg["min_sections"]:
                errors.append(f"見出し（##）が {n_sec} 個です（{cfg['min_sections']} 個以上必要）")
            lo, hi = cfg["article_chars"]
            n = body_chars(t)
            if not lo <= n <= hi:
                errors.append(f"本文が {n} 文字です（{lo}〜{hi} 文字）")
            n_fig = t.count("[[図:")
            if n_fig < cfg["min_figures"]:
                errors.append(f"図の差し込み指示 [[図: ...]] が {n_fig} 個です（{cfg['min_figures']} 個以上必要）")
    elif stage == "assets":
        t = read(run, "03-article.md", errors)
        if t:
            if "[[図:" in t:
                errors.append("03-article.md に未処理の [[図: ...]] が残っています")
            n = check_images(run, t, "03-article.md", errors)
            if n < cfg["min_figures"]:
                errors.append(f"挿入された画像が {n} 枚です（{cfg['min_figures']} 枚以上必要）")
    elif stage == "quality":
        r = read(run, "04-quality.md", errors)
        t = read(run, "final.md", errors)
        if r and not re.search(r"^判定[:：]\s*OK", r, flags=re.M):
            errors.append("04-quality.md に「判定: OK」がありません")
        if t:
            check_banned(t, "final.md", cfg, errors)
            check_images(run, t, "final.md", errors)
            lo, hi = cfg["article_chars"]
            n = body_chars(t)
            if not lo <= n <= hi:
                errors.append(f"final.md の本文が {n} 文字です（{lo}〜{hi} 文字）")
    elif stage == "marketing":
        t = read(run, "05-promo.md", errors)
        if t:
            posts = re.findall(r"^###\s*パターン.*?$\n(.*?)(?=^###\s|^##\s|\Z)", t, flags=re.M | re.S)
            if len(posts) < cfg["promo_patterns"]:
                errors.append(f"告知文パターンが {len(posts)} 個です（{cfg['promo_patterns']} 個以上必要）")
            for i, p in enumerate(posts, 1):
                w = x_weight(p.strip())
                if w > cfg["promo_max_weight"]:
                    errors.append(f"パターン{i} が X の上限を超えています（{w}/{cfg['promo_max_weight']}）")
            check_banned(t, "05-promo.md", cfg, errors)
            if not section(t, "タグ"):
                errors.append("05-promo.md に「## タグ」の節がありません")
    elif stage == "audit":
        t = read(run, "audit.md", errors)
        if t and not section(t, "次のアクション"):
            errors.append("audit.md に「## 次のアクション」がありません")
    else:
        errors.append(f"不明な stage: {stage}（{', '.join(STAGE_KEYS)}）")
    return errors


def status_path(run: Path) -> Path:
    return run / "status.json"


def load_status(run: Path) -> dict:
    return json.loads(status_path(run).read_text(encoding="utf-8"))


def save_status(run: Path, st: dict) -> None:
    status_path(run).write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")


def cmd_init(slug: str) -> None:
    slug = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-") or "run"
    run = RUNS_DIR / f"{datetime.date.today().isoformat()}-{slug}"
    i = 2
    while run.exists():
        run = RUNS_DIR / f"{datetime.date.today().isoformat()}-{slug}-{i}"
        i += 1
    (run / "assets").mkdir(parents=True)
    st = {
        "run": run.name,
        "created": now(),
        "stages": {k: {"state": "todo", "revisions": 0, "note": ""} for k in STAGE_KEYS},
        "feed": [],
    }
    save_status(run, st)
    print(run)


def cmd_set(run: Path, stage: str, state: str, note: str) -> None:
    if stage not in STAGE_KEYS or state not in STATES:
        sys.exit(f"stage は {STAGE_KEYS}、state は {list(STATES)} のどれか")
    st = load_status(run)
    s = st["stages"][stage]
    if state == "revise":
        s["revisions"] += 1
    s["state"], s["note"] = state, note
    st["feed"].append({"at": now(), "stage": stage, "state": state, "note": note})
    save_status(run, st)


def latest_run() -> Path:
    runs = sorted(p for p in RUNS_DIR.iterdir() if (p / "status.json").exists()) if RUNS_DIR.exists() else []
    if not runs:
        sys.exit("まだ実行フォルダがありません（team.py init <slug>）")
    return runs[-1]


def cmd_status(run: Path) -> None:
    st = load_status(run)
    print(f"■ {load_config()['team_name']} オフィス — {st['run']}")
    for key, label in STAGES:
        s = st["stages"][key]
        rev = f"（差し戻し {s['revisions']} 回）" if s["revisions"] else ""
        print(f"  {label:<12} {STATES[s['state']]:<8} {s['note']}{rev}")
    if st["feed"]:
        print("■ ライブフィード（新しい順）")
        for f in reversed(st["feed"][-8:]):
            print(f"  {f['at']}  {dict(STAGES)[f['stage']]}: {STATES[f['state']]} {f['note']}")


def main(argv: list) -> None:
    if len(argv) < 2:
        sys.exit(__doc__)
    cmd = argv[1]
    if cmd == "init" and len(argv) == 3:
        cmd_init(argv[2])
    elif cmd == "check" and len(argv) == 4:
        errors = check_stage(Path(argv[2]), argv[3], load_config())
        if errors:
            print("NG")
            for e in errors:
                print(f"- {e}")
            sys.exit(1)
        print("OK")
    elif cmd == "set" and len(argv) >= 5:
        cmd_set(Path(argv[2]), argv[3], argv[4], " ".join(argv[5:]))
    elif cmd == "status":
        cmd_status(Path(argv[2]) if len(argv) > 2 else latest_run())
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
