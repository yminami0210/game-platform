#!/usr/bin/env bash
# ゲームで使う文字だけのサブセット woff2 を game/fonts/ に作る。文言を変えたら再実行する。
# 使い方: bash studio/tools/fetch-fonts.sh   （要: curl, node。ネットワーク必要。ゲーム本体は外部通信しない）
set -euo pipefail
cd "$(dirname "$0")/../.."
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
OUT=game/fonts; mkdir -p "$OUT"

# 使う全文字（コメント除去済みの非ASCII＋ASCII印字可能文字）
TEXT=$(node -e '
const fs=require("fs");
const files=["game/index.html","game/src/ui/screens.js","game/src/main.js",...fs.readdirSync("game/src/data").filter(f=>f.endsWith(".json")).map(f=>"game/src/data/"+f)];
const set=new Set();
for(let c=0x20;c<0x7f;c++)set.add(String.fromCharCode(c));
for(const f of files){let t=fs.readFileSync(f,"utf8");
  t=t.replace(/<!--[\s\S]*?-->/g,"").replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"").replace(/\s\/\/ .*$/gm,"");
  for(const ch of t)if(ch.codePointAt(0)>0x7f)set.add(ch);}
for(const ch of "０１２３４５６７８９？！、。「」…・ー〜")set.add(ch);
process.stdout.write([...set].join(""));')
ENC=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$TEXT")
echo "chars: $(node -e 'console.log([...process.argv[1]].length)' "$TEXT")"

fetch() { # <Google Fonts family 指定> <出力名>
  local css url
  css=$(curl -sf -A "$UA" "https://fonts.googleapis.com/css2?family=$1&display=swap&text=$ENC")
  url=$(echo "$css" | grep -o 'https://fonts.gstatic.com[^)]*' | head -1)
  curl -sf -A "$UA" "$url" -o "$OUT/$2"; echo "$2 $(wc -c < "$OUT/$2") bytes"
}
fetch "Yuji+Boku" yuji-boku.woff2          # 見出し・ロゴ・数字（墨の木版風）
fetch "Kiwi+Maru:wght@500" kiwi-maru-500.woff2   # 本文・ボタン

# OFL 本文（SIL OFL 1.1）。openfontlicense.org が届かない環境では npm の @fontsource（OFL 全文と著作権表示入り）から取る
if [ ! -s "$OUT/OFL.txt" ]; then
  tmp=$(mktemp -d)
  for p in yuji-boku kiwi-maru; do
    tgz=$(curl -sf "https://registry.npmjs.org/@fontsource/$p/latest" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).dist.tarball))')
    curl -sf "$tgz" | tar xz -C "$tmp"; { echo "== $p =="; cat "$tmp/package/LICENSE"; echo; } >> "$OUT/OFL.txt"; rm -rf "$tmp/package"
  done
fi
