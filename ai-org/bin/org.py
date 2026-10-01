#!/usr/bin/env python3
"""AI社員の組織（ai-org）の進行管理と機械チェック。

部署ごとの仕事の流れは departments/<部署>/team.json に書く。このスクリプトは
どの部署でも同じ仕組み（担当 → 監査役 → 合格なら次／不合格なら差し戻し）で回す。

使い方:
  org.py list                              部署と担当（AI社員）の一覧
  org.py validate                          全部署の team.json と担当スキルの整合を確認
  org.py init <部署> <slug> [依頼ファイル]  runs/<日付>-<部署>-<slug>/ を作る
  org.py check <run_dir> <stage>           stage の成果物を機械チェック（失敗で exit 1）
  org.py set <run_dir> <stage> <state> [note]
                                           進行状況を更新（todo/working/revise/pass/fail）
  org.py status [run_dir]                  進行状況を表示（省略時は最新の実行）
"""
import datetime
import json
import re
import shutil
import sys
from pathlib import Path

ORG_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = ORG_DIR.parent
DEPTS_DIR = ORG_DIR / "departments"
RUNS_DIR = ORG_DIR / "runs"
SKILLS_DIR = REPO_DIR / ".claude" / "skills"

STATES = {"todo": "・待機", "working": "▶ 作業中", "revise": "↺ 差し戻し", "pass": "✓ 合格", "fail": "✗ 中止"}
URL_RE = re.compile(r"https?://[^\s)>\]]+")

# どの部署の総括（監査役）にも求める節
AUDIT_SECTIONS = ["総括", "人間の承認が必要なこと", "次のアクション"]
# 全部署共通の禁止事項（秘密情報らしき文字列・断定的な保証表現）
COMMON_BANNED = [
    r"(?i)\b(sk|pk|ghp|xox[bp])[-_][A-Za-z0-9]{16,}",
    r"(?i)password\s*[:=]\s*\S+",
    r"必ず(儲かる|勝てる|通る)",
    r"TODO",
]


def load_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def departments() -> dict:
    return {p.parent.name: load_json(p) for p in sorted(DEPTS_DIR.glob("*/team.json"))}


def dept_of(run: Path) -> dict:
    st = load_status(run)
    return load_json(DEPTS_DIR / st["department"] / "team.json")


def stage_keys(team: dict) -> list:
    return [s["key"] for s in team["stages"]] + ["audit"]


def section(text: str, heading: str) -> str:
    """'## heading' から次の '## ' までを返す（無ければ空文字）。"""
    m = re.search(rf"^##\s*{re.escape(heading)}[^\n]*\n(.*?)(?=^##\s|\Z)", text, flags=re.M | re.S)
    return m.group(1).strip() if m else ""


def chars(text: str) -> int:
    return len(re.sub(r"\s", "", URL_RE.sub("", text)))


def check_output(run: Path, spec: dict, banned: list) -> list:
    """1 つの成果物ファイルを spec（team.json の stage 定義）に照らしてチェックする。"""
    name = spec["output"]
    p = run / name
    if not p.exists():
        return [f"{name} がありません"]
    t = p.read_text(encoding="utf-8")
    errors = []
    for h in spec.get("sections", []):
        if not section(t, h):
            errors.append(f"{name} に「## {h}」の節がありません（または空です）")
    if spec.get("min_urls"):
        src = section(t, spec.get("sources_section", "出典")) or t
        n = len(set(URL_RE.findall(src)))
        if n < spec["min_urls"]:
            errors.append(f"{name} の出典 URL が {n} 件です（{spec['min_urls']} 件以上必要）")
    for pat in spec.get("patterns", []):
        if not re.search(pat, t, flags=re.M):
            errors.append(f"{name} に必須の記載（/{pat}/）がありません")
    lo, hi = spec.get("chars", [0, 10**9])
    n = chars(t)
    if not lo <= n <= hi:
        errors.append(f"{name} が {n} 文字です（{lo}〜{hi} 文字）")
    for pat in COMMON_BANNED + banned:
        m = re.search(pat, t)
        if m:
            errors.append(f"{name} に禁止表現・秘密情報らしき文字列「{m.group(0)[:20]}」があります")
    return errors


def check_stage(run: Path, stage: str) -> list:
    team = dept_of(run)
    banned = team.get("banned", [])
    if stage == "audit":
        spec = {"output": "audit.md", "sections": AUDIT_SECTIONS}
        return check_output(run, spec, banned)
    for s in team["stages"]:
        if s["key"] == stage:
            return check_output(run, s, banned)
    return [f"不明な stage: {stage}（{', '.join(stage_keys(team))}）"]


def validate() -> list:
    errors = []
    for name, team in departments().items():
        for k in ("name", "mission", "stages", "human_approval"):
            if k not in team:
                errors.append(f"{name}/team.json に {k} がありません")
        keys = [s.get("key") for s in team.get("stages", [])]
        if len(keys) != len(set(keys)) or "audit" in keys:
            errors.append(f"{name}: stage の key が重複しているか、予約語 audit を使っています")
        for s in team.get("stages", []):
            for k in ("key", "label", "skill", "output", "review_points"):
                if k not in s:
                    errors.append(f"{name}/{s.get('key')}: {k} がありません")
            skill = SKILLS_DIR / s.get("skill", "?") / "SKILL.md"
            if not skill.exists():
                errors.append(f"{name}/{s.get('key')}: スキル {skill.relative_to(REPO_DIR)} がありません")
            for pat in s.get("patterns", []) + team.get("banned", []):
                try:
                    re.compile(pat)
                except re.error as e:
                    errors.append(f"{name}: 正規表現 {pat} が不正です（{e}）")
        if not (DEPTS_DIR / name / "learnings.md").exists():
            errors.append(f"{name}: learnings.md がありません")
    return errors


def status_path(run: Path) -> Path:
    return run / "status.json"


def load_status(run: Path) -> dict:
    return load_json(status_path(run))


def save_status(run: Path, st: dict) -> None:
    status_path(run).write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).astimezone().strftime("%Y-%m-%d %H:%M")


def cmd_init(dept: str, slug: str, request: str = "") -> Path:
    depts = departments()
    if dept not in depts:
        sys.exit(f"部署 {dept} がありません（{', '.join(depts)}）")
    slug = re.sub(r"[^a-z0-9-]+", "-", slug.lower()).strip("-") or "run"
    base = f"{datetime.date.today().isoformat()}-{dept}-{slug}"
    run, i = RUNS_DIR / base, 2
    while run.exists():
        run, i = RUNS_DIR / f"{base}-{i}", i + 1
    run.mkdir(parents=True)
    if request:
        shutil.copy(request, run / "00-request.md")
    st = {
        "run": run.name,
        "department": dept,
        "created": now(),
        "stages": {k: {"state": "todo", "revisions": 0, "note": ""} for k in stage_keys(depts[dept])},
        "feed": [],
    }
    save_status(run, st)
    print(run)
    return run


def cmd_set(run: Path, stage: str, state: str, note: str) -> None:
    st = load_status(run)
    if stage not in st["stages"] or state not in STATES:
        sys.exit(f"stage は {list(st['stages'])}、state は {list(STATES)} のどれか")
    s = st["stages"][stage]
    if state == "revise":
        s["revisions"] += 1
    s["state"], s["note"] = state, note
    st["feed"].append({"at": now(), "stage": stage, "state": state, "note": note})
    save_status(run, st)


def latest_run() -> Path:
    runs = sorted(RUNS_DIR.glob("*/status.json")) if RUNS_DIR.exists() else []
    if not runs:
        sys.exit("まだ実行フォルダがありません（org.py init <部署> <slug>）")
    return max(runs, key=lambda p: p.stat().st_mtime).parent


def cmd_status(run: Path) -> None:
    st = load_status(run)
    team = dept_of(run)
    labels = {s["key"]: s["label"] for s in team["stages"]} | {"audit": "監査役（総括）"}
    print(f"■ {team['name']} — {st['run']}")
    for key, s in st["stages"].items():
        rev = f"（差し戻し {s['revisions']} 回）" if s["revisions"] else ""
        print(f"  {labels[key]:<14} {STATES[s['state']]:<8} {s['note']}{rev}")
    if st["feed"]:
        print("■ ライブフィード（新しい順）")
        for f in reversed(st["feed"][-8:]):
            print(f"  {f['at']}  {labels[f['stage']]}: {STATES[f['state']]} {f['note']}")


def cmd_list() -> None:
    for name, team in departments().items():
        print(f"■ {name}: {team['name']} — {team['mission']}")
        for s in team["stages"]:
            print(f"  {s['label']:<16} /{s['skill']:<22} → {s['output']}")
        print("  監査役（総括）       /org-auditor            → audit.md")


def main(argv: list) -> None:
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "list":
        cmd_list()
    elif cmd == "validate":
        errors = validate()
        print("NG\n" + "\n".join(f"- {e}" for e in errors) if errors else "OK")
        sys.exit(1 if errors else 0)
    elif cmd == "init" and len(argv) in (4, 5):
        cmd_init(argv[2], argv[3], argv[4] if len(argv) == 5 else "")
    elif cmd == "check" and len(argv) == 4:
        errors = check_stage(Path(argv[2]), argv[3])
        print("NG\n" + "\n".join(f"- {e}" for e in errors) if errors else "OK")
        sys.exit(1 if errors else 0)
    elif cmd == "set" and len(argv) >= 5:
        cmd_set(Path(argv[2]), argv[3], argv[4], " ".join(argv[5:]))
    elif cmd == "status":
        cmd_status(Path(argv[2]) if len(argv) > 2 else latest_run())
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv)
