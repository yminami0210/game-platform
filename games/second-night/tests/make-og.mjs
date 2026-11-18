// OGP 画像（1200x630）を HTML から生成する。node games/second-night/tests/make-og.mjs
// 文字だけで作る（外部画像なし）。明朝体は IPA明朝 などローカルにあるものを使う。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "og.png");

const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;width:1200px;height:630px;background:#121316;color:#e4dfd4;
  font-family:"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","IPAMincho",serif;}
.wrap{position:relative;width:1200px;height:630px;box-sizing:border-box;padding:84px 110px;}
.line{font-size:58px;letter-spacing:.08em;line-height:1.4;margin:0;}
.one{color:#5f5b54}
.two{margin-top:0;display:inline-block;background:linear-gradient(transparent 64%,rgba(217,139,108,.18) 64%);
  text-decoration:underline dotted rgba(217,139,108,.8);text-decoration-thickness:2px;text-underline-offset:16px}
.lab{font-size:20px;letter-spacing:.5em;color:#9a958a;margin:0 0 14px}
.lab2{color:#d98b6c}
.title{position:absolute;right:110px;bottom:80px;text-align:right}
.t{font-size:44px;letter-spacing:.3em;margin:0}
.t b{font-weight:400;color:#d98b6c}
.s{font-size:20px;letter-spacing:.2em;color:#9a958a;margin:16px 0 0}
</style><div class="wrap">
<p class="lab">一度目</p><p class="line one">「——おかえり、なさい」</p>
<p class="lab lab2" style="margin-top:40px">二度目</p><p class="line two">「——おかえり、なさい」</p>
<div class="title"><p class="t"><b>二</b>度目の夜</p><p class="s">七分の短編　同じ文章を、もう一度</p></div>
</div>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html);
await p.screenshot({ path: out });
await b.close();
console.log("wrote", out);
