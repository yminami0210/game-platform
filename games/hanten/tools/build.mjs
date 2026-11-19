// 生成物をつくる: node games/hanten/tools/build.mjs
//  - w/NNN.html   … 作品ごとの共有用ページ（OGP メタ入り。開くと ?id=NNN へ移る）
//  - og/NNN.png   … 作品ごとの OGP 画像 1200x630（最初の一行＋「最後の一行で、この意味が変わる。」）
//  - og/series.png… シリーズの OGP 画像
//  - README.md の「収録作」節（反転の種類・読者が置く前提）
// ラストの一行は、共有ページにも OGP 画像にも載せない。
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const site = JSON.parse(fs.readFileSync(path.join(root, "site.json"), "utf8"));
const SERIES = "反転一行";

export function loadStories() {
  const out = [];
  for (let n = 1; ; n++) {
    const f = path.join(root, "stories", `${String(n).padStart(3, "0")}.json`);
    if (!fs.existsSync(f)) return out;
    out.push(JSON.parse(fs.readFileSync(f, "utf8")));
  }
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const ogDescription = (s) => `「${s.paras[0]}」——最後の一行で、この意味が変わる。一分で読める超短編。`;

function stub(s) {
  const title = `${s.title}｜${SERIES}`;
  const img = new URL(`og/${s.id}.png`, site.baseUrl).href;
  const url = new URL(`w/${s.id}.html`, site.baseUrl).href;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(ogDescription(s))}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(ogDescription(s))}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(img)}">
<link rel="icon" href="../icon.svg" type="image/svg+xml">
<script>location.replace("../?id=${s.id}");</script>
</head>
<body style="font-family:serif;padding:24px">
<p><a href="../?id=${s.id}">${esc(s.title)}を読む</a></p>
</body>
</html>
`;
}

const ogHtml = (body) => `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;background:#16161a;color:#e6e1d6;
  font-family:"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","IPAMincho","IPAPGothic",serif}
.w{position:relative;width:1200px;height:630px;box-sizing:border-box;padding:80px 100px}
.lab{font-size:22px;letter-spacing:.4em;color:#8f8a80;margin:0 0 26px}
.first{text-wrap:balance;font-size:54px;line-height:1.55;letter-spacing:.06em;margin:0}
.turn{margin:44px 0 0;font-size:30px;letter-spacing:.12em;color:#e08a66;display:inline-block;
  border-bottom:2px solid rgba(224,138,102,.6);padding-bottom:10px}
.foot{position:absolute;left:100px;right:100px;bottom:64px;display:flex;justify-content:space-between;align-items:flex-end;
  font-size:24px;letter-spacing:.2em;color:#8f8a80}
.foot b{font-weight:400;color:#e6e1d6;font-size:30px;letter-spacing:.25em}
.big{font-size:96px;letter-spacing:.3em;margin:60px 0 0}
</style><div class="w">${body}</div>`;

export function storyOg(s) {
  const size = s.paras[0].length > 22 ? 46 : 54;
  return ogHtml(`<p class="lab">最初の一行</p>
<p class="first" style="font-size:${size}px">${esc(s.paras[0])}</p>
<p class="turn">最後の一行で、この意味が変わる。</p>
<div class="foot"><span>No.${s.id}　<b>${esc(s.title)}</b></span><span>${SERIES}　一分の超短編</span></div>`);
}
const seriesOg = () => ogHtml(`<p class="lab">一分で読める超短編</p>
<p class="big">${SERIES}</p>
<p class="turn">最後の一行で、物語の意味が変わる。</p>
<div class="foot"><span>毎週一本</span><span></span></div>`);

function readmeSection(all) {
  const rows = all.map((s) => `### No.${s.id}「${s.title}」${s.special ? "（特別回）" : ""}

- 反転の種類: ${s.twist}
- 最初に読んだときに読者が置く前提: ${s.premise}
- 公開予定日: ${s.date}${s.special ? `\n- 形式: ${s.special.replace(/^特別回\s*/, "")}` : ""}
`).join("\n");
  return `<!-- stories:begin（tools/build.mjs が生成。手で編集しない） -->\n${rows}<!-- stories:end -->`;
}

async function main() {
  const all = loadStories();
  fs.mkdirSync(path.join(root, "w"), { recursive: true });
  fs.mkdirSync(path.join(root, "og"), { recursive: true });
  for (const s of all) fs.writeFileSync(path.join(root, "w", `${s.id}.html`), stub(s));

  const readme = path.join(root, "README.md");
  const txt = fs.readFileSync(readme, "utf8");
  fs.writeFileSync(readme, txt.replace(/<!-- stories:begin[\s\S]*?<!-- stories:end -->/, readmeSection(all)));

  const { chromium } = require("playwright");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  for (const [name, html] of [...all.map((s) => [s.id, storyOg(s)]), ["series", seriesOg()]]) {
    await p.setContent(html);
    await p.screenshot({ path: path.join(root, "og", `${name}.png`) });
  }
  await b.close();
  console.log(`built ${all.length} stories`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
