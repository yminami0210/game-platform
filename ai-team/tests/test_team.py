import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "bin"))
import team  # noqa: E402

CFG = team.load_config()
PARA = "AIを使うと日々の作業がとても楽になります。具体的な手順を順番に説明していきます。" * 16
SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>'


def article(figs: str) -> str:
    return f"# タイトル\n\n{PARA}\n\n## 一\n{PARA}\n{figs}\n## 二\n{PARA}\n\n## 三\n{PARA}\n"


class CheckTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.run = Path(self.tmp.name)
        (self.run / "assets").mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, name, text):
        (self.run / name).write_text(text, encoding="utf-8")

    def check(self, stage):
        return team.check_stage(self.run, stage, CFG)

    def test_research(self):
        self.write("01-research.md", "## テーマ\nx\n## 読者\ny\n## 要点\nz\n## 出典\n- https://a.example\n")
        self.assertTrue(any("出典 URL" in e for e in self.check("research")))
        self.write("01-research.md", "## テーマ\nx\n## 読者\ny\n## 要点\nz\n## 出典\n"
                   "- https://a.example\n- https://b.example\n- https://c.example\n")
        self.assertEqual(self.check("research"), [])

    def test_writing(self):
        self.write("02-draft.md", article("[[図: 全体像]]\n[[図: 手順]]\n"))
        self.assertEqual(self.check("writing"), [])
        self.write("02-draft.md", "本文だけ")
        self.assertGreaterEqual(len(self.check("writing")), 3)

    def test_assets(self):
        self.write("03-article.md", article("![全体像](assets/a.svg)\n![手順](assets/b.svg)\n"))
        self.assertTrue(any("画像ファイル" in e for e in self.check("assets")))
        (self.run / "assets/a.svg").write_text(SVG)
        (self.run / "assets/b.svg").write_text("<svg>")
        self.assertTrue(any("壊れた SVG" in e for e in self.check("assets")))
        (self.run / "assets/b.svg").write_text(SVG)
        self.assertEqual(self.check("assets"), [])

    def test_quality(self):
        (self.run / "assets/a.svg").write_text(SVG)
        self.write("04-quality.md", "判定: OK\n")
        self.write("final.md", article("![図](assets/a.svg)\nいかがでしたか\n"))
        self.assertTrue(any("禁止表現" in e for e in self.check("quality")))
        self.write("final.md", article("![図](assets/a.svg)\n"))
        self.assertEqual(self.check("quality"), [])

    def test_marketing(self):
        ok = "## 告知文\n### パターン1\n短い告知\n### パターン2\n短い告知\n### パターン3\n短い告知\n## タグ\n#AI\n"
        self.write("05-promo.md", ok)
        self.assertEqual(self.check("marketing"), [])
        self.write("05-promo.md", ok.replace("### パターン3\n短い告知", "### パターン3\n" + "長" * 141))
        self.assertTrue(any("上限" in e for e in self.check("marketing")))

    def test_x_weight(self):
        self.assertEqual(team.x_weight("ab"), 2)
        self.assertEqual(team.x_weight("あ"), 2)
        self.assertEqual(team.x_weight("https://example.com/very/long/path"), 23)


class StatusTest(unittest.TestCase):
    def test_init_set(self):
        with tempfile.TemporaryDirectory() as d:
            team.RUNS_DIR = Path(d)
            team.cmd_init("Test Run!")
            run = next(Path(d).iterdir())
            self.assertTrue(run.name.endswith("-test-run"))
            team.cmd_set(run, "research", "revise", "出典不足")
            st = team.load_status(run)
            self.assertEqual(st["stages"]["research"]["revisions"], 1)
            self.assertEqual(st["feed"][-1]["note"], "出典不足")


if __name__ == "__main__":
    unittest.main()
