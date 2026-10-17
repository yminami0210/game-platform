import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bin"))
import org  # noqa: E402

TEAM = {
    "name": "テスト部",
    "mission": "テスト",
    "human_approval": ["送信"],
    "max_revisions": 2,
    "banned": ["禁止語"],
    "stages": [
        {"key": "a", "label": "01 調査", "skill": "ai-org", "output": "01-a.md",
         "sections": ["結論", "出典"], "min_urls": 2, "patterns": [r"^判定[:：]\s*(OK|NG)"],
         "chars": [10, 500], "review_points": ["x"]},
    ],
}


class OrgTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.saved = org.DEPTS_DIR, org.RUNS_DIR
        org.DEPTS_DIR, org.RUNS_DIR = root / "departments", root / "runs"
        (org.DEPTS_DIR / "test").mkdir(parents=True)
        (org.DEPTS_DIR / "test" / "team.json").write_text(json.dumps(TEAM, ensure_ascii=False))
        (org.DEPTS_DIR / "test" / "learnings.md").write_text("")
        self.run = org.cmd_init("test", "Demo Run")

    def tearDown(self):
        org.DEPTS_DIR, org.RUNS_DIR = self.saved
        self.tmp.cleanup()

    def write(self, name, text):
        (self.run / name).write_text(text, encoding="utf-8")

    def test_validate(self):
        self.assertEqual(org.validate(), [])

    def test_check_stage(self):
        self.assertIn("01-a.md がありません", org.check_stage(self.run, "a"))
        good = "## 結論\n十分な長さの結論です。\n判定: OK\n## 出典\n- https://a.example\n- https://b.example\n"
        self.write("01-a.md", good)
        self.assertEqual(org.check_stage(self.run, "a"), [])
        self.write("01-a.md", good.replace("- https://b.example\n", ""))
        self.assertTrue(any("出典 URL" in e for e in org.check_stage(self.run, "a")))
        self.write("01-a.md", good + "禁止語\n")
        self.assertTrue(any("禁止" in e for e in org.check_stage(self.run, "a")))
        self.write("01-a.md", good + "token: ghp_abcdefghijklmnopqrstuv\n")
        self.assertTrue(any("秘密情報" in e for e in org.check_stage(self.run, "a")))
        self.write("01-a.md", good.replace("判定: OK", ""))
        self.assertTrue(any("必須の記載" in e for e in org.check_stage(self.run, "a")))

    def test_audit_and_status(self):
        self.write("audit.md", "## 総括\nよい\n## 人間の承認が必要なこと\n送信\n## 次のアクション\n次へ\n")
        self.assertEqual(org.check_stage(self.run, "audit"), [])
        org.cmd_set(self.run, "a", "revise", "出典不足")
        st = org.load_status(self.run)
        self.assertEqual(st["department"], "test")
        self.assertEqual(st["stages"]["a"]["revisions"], 1)
        self.assertEqual(list(st["stages"]), ["a", "audit"])

    def test_unknown_stage(self):
        self.assertTrue(org.check_stage(self.run, "zzz")[0].startswith("不明な stage"))


if __name__ == "__main__":
    unittest.main()
