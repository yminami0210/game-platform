// 札の絵（4:3）を、ゲームを実際に動かしてプレイ中の画面から撮る。
// qa/play.png が結果画面などで札の絵に向かないゲームだけ、ここに手順を書く。
// 使い方: リポジトリのルートで `python3 -m http.server 8765` を動かしてから
//   node player/bin/thumbs.mjs            … 下の SHOTS を全部撮って player/data/thumbs/<id>.png へ
// 撮った絵は player/data/fuda.json の "thumb" で札に使う。arcade/ は読むだけ（書き換えない）。
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const BASE = process.env.BASE || "http://localhost:8765/";
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "thumbs");

// 撮り方: 390x844 の画面でゲームを動かし、点数枠・案内文の無い帯を 4:3（390x292）で切り取る
const SHOTS = {
  "001-bloom-chain": {
    // 題の画面を1回押して始め、池の真ん中に1回触れて、蓮が連鎖して咲いている途中を撮る
    steps: async (page) => {
      await page.waitForTimeout(600);
      await page.mouse.click(195, 470);
      await page.waitForTimeout(900);
      await page.mouse.click(196, 420);
      await page.waitForTimeout(1500);
    },
    clip: { x: 0, y: 250, width: 390, height: 292 },
  },
};

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [id, s] of Object.entries(SHOTS)) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    await page.goto(`${BASE}arcade/games/${id}/index.html`, { waitUntil: "load" });
    await s.steps(page);
    const file = path.join(out, `${id}.png`);
    await page.screenshot({ path: file, clip: s.clip });
    console.log(`${file}`);
    await page.close();
  }
} finally {
  await browser.close();
}
