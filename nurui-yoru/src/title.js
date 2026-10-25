// タイトル画面と遊び方（図解）。外部ライブラリなし・画像なし。
// 見た目の借り物: 町内の回覧板に挟まるガリ版刷りの「お知らせ」。生成りの紙に墨1色＋差し色1色、線は少し揺れる。

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Klee+One:wght@600&display=swap');
.nt{--bg:#0c1220;--ink:#ebe5d3;--dim:#a19d8c;--warn:#e8a33a;--bad:#e2553f;--ok:#82c6a2;--sumi:#1d2230;
  position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--ink);
  font-family:"Hiragino Sans","Yu Gothic",system-ui,sans-serif;
  padding:calc(env(safe-area-inset-top,0px) + 10px) calc(env(safe-area-inset-right,0px) + 14px) calc(env(safe-area-inset-bottom,0px) + 10px) calc(env(safe-area-inset-left,0px) + 14px);
  display:grid;gap:10px;grid-template-columns:minmax(220px,30%) 1fr;grid-template-rows:1fr;}
.nt *{box-sizing:border-box}
.nt-head{display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:0;position:relative;z-index:1}
.nt h1{font-family:"Klee One","Hiragino Mincho ProN",serif;font-weight:600;font-size:clamp(34px,9vmin,52px);letter-spacing:.12em;margin:0;line-height:1.1;
  text-shadow:2px 1px 0 rgba(232,163,58,.35)}
.nt-sub{margin:0;color:var(--dim);font-size:14px;line-height:1.5}
.nt-tip{margin:0;font-size:12px;color:var(--ink);border-left:2px solid var(--warn);padding-left:8px;line-height:1.5}
.nt-btns{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.nt button{font:inherit;color:var(--ink);background:transparent;cursor:pointer;-webkit-tap-highlight-color:transparent}
.nt-st{min-height:52px;border:1.5px solid var(--ink);border-radius:5px 9px 6px 8px;padding:6px 14px;text-align:left;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:17px}
.nt-st small{font-size:11px;color:var(--dim);display:block;line-height:1.3}
.nt-st b{font-weight:600}
.nt-st .rec{font-size:12px;color:var(--warn);font-variant-numeric:tabular-nums;white-space:nowrap}
.nt-st:active,.nt-how:active,.nt-close:active{transform:translateY(1px);background:rgba(235,229,211,.08)}
.nt-how{min-height:48px;border:1px dashed var(--dim);border-radius:24px;font-size:14px;color:var(--dim)}
.nt-cards{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;min-height:0;min-width:0;padding-bottom:4px;align-items:stretch;scrollbar-width:thin}
.nt-card{flex:0 0 auto;scroll-snap-align:start;height:100%;aspect-ratio:3/4;max-width:78vw;background:var(--ink);color:var(--sumi);
  border-radius:3px 6px 4px 5px;padding:8px 9px 9px;display:flex;flex-direction:column;position:relative}
.nt-card:nth-child(odd){transform:rotate(-.6deg)} .nt-card:nth-child(even){transform:rotate(.5deg)}
.nt-card h2{margin:0;font-family:"Klee One","Hiragino Mincho ProN",serif;font-weight:600;font-size:16px;display:flex;gap:6px;align-items:baseline}
.nt-card h2 i{font-style:normal;font-size:12px;color:#7a6f58}
.nt-card svg{flex:1;min-height:0;width:100%;display:block}
.nt-card p{margin:0;font-size:12px;line-height:1.4}
.nt-card p em{font-style:normal;color:#b5401f;font-weight:600}
.nt-fly{position:absolute;left:0;top:0;width:34px;height:24px;pointer-events:none;opacity:.8;animation:ntFly 19s ease-in-out infinite;z-index:0}
.nt-fly svg{width:100%;height:100%;animation:ntBob .5s ease-in-out infinite alternate}
@keyframes ntFly{0%{transform:translate(8vw,70vh)}18%{transform:translate(22vw,12vh) rotate(8deg)}35%{transform:translate(18vw,40vh) rotate(-6deg)}
 55%{transform:translate(4vw,20vh)}75%{transform:translate(26vw,80vh) rotate(5deg)}100%{transform:translate(8vw,70vh)}}
@keyframes ntBob{to{transform:translateY(-3px)}}
.nt .wing{animation:ntWing .08s linear infinite alternate;transform-origin:50% 100%;transform-box:fill-box}
@keyframes ntWing{to{transform:scaleY(.4)}}
.nt .knobL{animation:ntKL 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.nt .knobR{animation:ntKR 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ntKL{0%,100%{transform:none}20%,35%{transform:translateY(-9px)}55%,70%{transform:translateX(-9px)}}
@keyframes ntKR{0%,100%{transform:none}20%,35%{transform:translateY(-9px)}55%,70%{transform:translateX(9px)}}
.nt .land{animation:ntLand 2.6s ease-in infinite}
@keyframes ntLand{0%{transform:translateY(-34px)}70%,100%{transform:translateY(0)}}
.nt .ring{animation:ntRing 2.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ntRing{0%,60%{opacity:.5}75%{opacity:1}100%{opacity:.5}}
.nt .gauge{animation:ntGauge 3s linear infinite;transform-box:fill-box;transform-origin:left center}
@keyframes ntGauge{0%{transform:scaleX(.05)}80%,100%{transform:scaleX(1)}}
.nt .eye2{animation:ntEye 3s steps(1) infinite}
.nt .eye1{animation:ntEye1 3s steps(1) infinite}
@keyframes ntEye1{0%,29%{opacity:0}30%,100%{opacity:1}}
@keyframes ntEye{0%,59%{opacity:0}60%,100%{opacity:1}}
.nt .press{animation:ntPress 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes ntPress{0%,5%{transform:scale(1)}10%,85%{transform:scale(.9)}90%{transform:scale(1)}}
.nt .shadow{animation:ntShadow 2.4s ease-in infinite;transform-box:fill-box;transform-origin:center}
@keyframes ntShadow{0%{transform:scale(.3);opacity:0}50%{transform:scale(1);opacity:.55}100%{transform:scale(1.05);opacity:.7}}
.nt .dodge{animation:ntDodge 2.4s ease-out infinite}
@keyframes ntDodge{0%,45%{transform:none}70%,100%{transform:translateX(44px)}}
.nt .exit{animation:ntExit 3.4s ease-in-out infinite}
@keyframes ntExit{0%{transform:translate(-50px,30px);opacity:1}75%{transform:translate(0,0);opacity:1}100%{transform:translate(8px,-4px);opacity:0}}
.nt .glow{animation:ntGlow 1.7s ease-in-out infinite alternate}
@keyframes ntGlow{from{opacity:.45}to{opacity:1}}
.nt-howto{grid-template-columns:1fr;grid-template-rows:auto 1fr auto}
.nt-howto .nt-top{display:flex;align-items:center;justify-content:space-between;gap:10px}
.nt-howto h1{font-size:clamp(22px,6vmin,30px)}
.nt-close{min-height:48px;min-width:120px;border:1.5px solid var(--ink);border-radius:24px;font-size:16px}
.nt-howto .nt-cards{justify-content:safe center}
@media (orientation:portrait){
  .nt{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr) auto}
  .nt-head{display:contents}
  .nt-titleblock{grid-row:1}
  .nt-btns{grid-row:3;margin:0}
  .nt-cards{grid-row:2}
  .nt-card{height:100%;max-height:420px;aspect-ratio:3/4;align-self:center}
  .nt-howto .nt-card{max-height:none}
}
@media (max-height:420px){ .nt-sub{font-size:13px} .nt-st{min-height:48px;padding:4px 12px} .nt-btns{gap:6px} }
@media (prefers-reduced-motion:reduce){ .nt *,.nt-fly{animation:none!important} .nt-fly{display:none} }
`;

let styled = false;
function style(){ if(styled) return; styled = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

const SUMI = '#1d2230', OR = '#e8a33a', RED = '#b5401f', GRN = '#4f9a74';
// 蚊（ヒトスジシマカ。黒地に白の縞）。cx,cy中心、s倍
const mosq = (s=1, fill=SUMI) => `<g transform="scale(${s})">
  <path class="wing" d="M-2 -2 C-10 -14 -2 -16 2 -3 Z" fill="none" stroke="${fill}" stroke-width="1" opacity=".6"/>
  <path class="wing" d="M1 -2 C6 -15 13 -12 4 -2 Z" fill="none" stroke="${fill}" stroke-width="1" opacity=".6"/>
  <path d="M-11 1 L9 -1" stroke="${fill}" stroke-width="4.2" stroke-linecap="round"/>
  <path d="M-7 -1.4v3.6M-3 -1.6v3.6M1 -1.8v3.6" stroke="#ebe5d3" stroke-width="1"/>
  <circle cx="11" cy="-1.5" r="2.4" fill="${fill}"/><path d="M13 -1 L20 1" stroke="${fill}" stroke-width=".9"/>
  <path d="M-4 2 l-4 7 M0 2 l-1 8 M4 1 l4 7" stroke="${fill}" stroke-width=".8" fill="none"/></g>`;

const CARDS = [
 { n:1, h:'うごく', sub:'横持ち・両手', p:'左の親指＝上下と向き。右の親指＝前後と横。', svg:`
  <svg viewBox="0 0 200 150" aria-hidden="true">
   <path d="M18 34 Q17 30 22 29 L178 31 Q183 31 183 36 L182 112 Q182 117 177 117 L22 116 Q17 116 17 111 Z" fill="none" stroke="${SUMI}" stroke-width="2.2"/>
   <circle cx="50" cy="86" r="21" fill="none" stroke="${SUMI}" stroke-width="1.6" stroke-dasharray="3 2"/>
   <circle cx="150" cy="86" r="21" fill="none" stroke="${SUMI}" stroke-width="1.6" stroke-dasharray="3 2"/>
   <g class="knobL"><circle cx="50" cy="86" r="8" fill="${OR}"/></g>
   <g class="knobR"><circle cx="150" cy="86" r="8" fill="${OR}"/></g>
   <path d="M50 58 l-4 6 h8 Z M50 114 l-4 -6 h8 Z M22 86 l6 -4 v8 Z M78 86 l-6 -4 v8 Z" fill="${SUMI}"/>
   <path d="M150 58 l-4 6 h8 Z M150 114 l-4 -6 h8 Z M122 86 l6 -4 v8 Z M178 86 l-6 -4 v8 Z" fill="${SUMI}"/>
   <path d="M6 140 Q14 108 38 100 Q50 98 52 104" fill="none" stroke="${SUMI}" stroke-width="2"/>
   <path d="M194 140 Q186 108 162 100 Q150 98 148 104" fill="none" stroke="${SUMI}" stroke-width="2"/>
   <text x="50" y="50" font-size="11" text-anchor="middle" fill="${SUMI}">上下・向き</text>
   <text x="150" y="50" font-size="11" text-anchor="middle" fill="${SUMI}">前後・横</text>
   <g transform="translate(100 64)">${mosq(1.3)}</g>
  </svg>`},
 { n:2, h:'とまる', sub:'肌に着陸', p:'オレンジの輪に<em>ゆっくり</em>降りる。速いと跳ねる。', svg:`
  <svg viewBox="0 0 200 150" aria-hidden="true">
   <path d="M4 118 Q50 104 100 108 T196 112 L196 150 L4 150 Z" fill="#d9cdb1" stroke="${SUMI}" stroke-width="1.6"/>
   <ellipse class="ring" cx="100" cy="110" rx="30" ry="8" fill="none" stroke="${OR}" stroke-width="3.2"/>
   <g class="land"><g transform="translate(100 100)">${mosq(1.8)}</g></g>
   <path d="M100 30 v40" stroke="${SUMI}" stroke-width="1.4" stroke-dasharray="2 4"/>
   <text x="112" y="48" font-size="12" fill="${SUMI}">そっと</text>
   <g transform="translate(26 40)"><path d="M0 0 l14 26 l10 -14" fill="none" stroke="${RED}" stroke-width="1.6"/><text x="0" y="-4" font-size="10" fill="${RED}">速いと跳ねる</text></g>
  </svg>`},
 { n:3, h:'すう', sub:'長押し', p:'「吸う」を押しつづける。人の目が<em>●</em>に近づく。', svg:`
  <svg viewBox="0 0 200 150" aria-hidden="true">
   <g class="press"><circle cx="54" cy="84" r="30" fill="none" stroke="${SUMI}" stroke-width="2.2"/><text x="54" y="90" font-size="17" text-anchor="middle" fill="${SUMI}">吸う</text></g>
   <path d="M44 128 q10 -16 20 -8" fill="none" stroke="${SUMI}" stroke-width="1.6"/>
   <text x="108" y="40" font-size="11" fill="${SUMI}">血</text>
   <rect x="108" y="46" width="80" height="12" rx="2" fill="none" stroke="${SUMI}" stroke-width="1.4"/>
   <rect class="gauge" x="110" y="48" width="76" height="8" fill="${RED}"/>
   <text x="108" y="86" font-size="11" fill="${SUMI}">人の目</text>
   <g transform="translate(116 102)" stroke="${SUMI}" stroke-width="1.6">
    <circle cx="0" cy="0" r="7" fill="none"/><circle cx="20" cy="0" r="7" fill="none"/><circle cx="40" cy="0" r="7" fill="none"/><circle cx="60" cy="0" r="7" fill="none"/>
    <circle class="eye1" cx="0" cy="0" r="7" fill="${SUMI}"/><circle class="eye2" cx="20" cy="0" r="7" fill="${SUMI}"/>
   </g>
   <text x="108" y="132" font-size="10" fill="${RED}">4つ●で起きる</text>
  </svg>`},
 { n:4, h:'にげる', sub:'0.6秒', p:'手の影が落ちたら<em>0.6秒</em>で影の外へ。', svg:`
  <svg viewBox="0 0 200 150" aria-hidden="true">
   <path d="M4 120 Q60 110 120 116 T196 114 L196 150 L4 150 Z" fill="#d9cdb1" stroke="${SUMI}" stroke-width="1.6"/>
   <g class="shadow"><path d="M60 114 q-6 -14 4 -22 q2 -14 10 -10 q4 -10 12 -4 q8 -6 12 4 q12 0 8 14 q8 8 -2 18 Z" fill="${SUMI}"/></g>
   <g class="dodge"><g transform="translate(84 104)">${mosq(1.6)}</g></g>
   <path d="M60 22 q10 -10 30 -6 l6 20 q-2 10 -14 12 l-20 -6 Z" fill="none" stroke="${SUMI}" stroke-width="1.6" opacity=".6"/>
   <text x="120" y="40" font-size="12" fill="${RED}">パチン</text>
   <text x="134" y="98" font-size="11" fill="${SUMI}">影の外</text>
  </svg>`},
 { n:5, h:'かえる', sub:'5:00まで', p:'光る窓から出ればクリア。血の量が点数。', svg:`
  <svg viewBox="0 0 200 150" aria-hidden="true">
   <rect class="glow" x="132" y="26" width="54" height="50" fill="${OR}" opacity=".7"/>
   <path d="M131 25 h56 v52 h-56 Z M159 25 v52" fill="none" stroke="${SUMI}" stroke-width="2"/>
   <g class="exit"><g transform="translate(150 54)">${mosq(1.4)}</g></g>
   <text x="134" y="92" font-size="11" fill="${SUMI}">ことづけ窓</text>
   <g transform="translate(14 22)" stroke="${SUMI}" fill="none" stroke-width="1.4">
    <circle cx="16" cy="16" r="14"/><path d="M16 16 l8 -8 M16 16 l-10 4 M16 16 l2 11"/><path d="M16 30 v14 M6 46 h20"/>
    <path d="M34 10 q12 -2 22 4 M34 18 q14 0 24 6 M34 26 q10 2 20 8" stroke-dasharray="3 3"/>
   </g>
   <text x="14" y="88" font-size="10" fill="${SUMI}">扇風機＝流される</text>
   <g transform="translate(22 102)" fill="none" stroke="${GRN}" stroke-width="1.6">
    <path d="M0 26 a12 12 0 1 1 12 -12 a7 7 0 1 1 -7 -7"/>
    <path d="M10 2 q-4 -6 2 -10 q6 -4 2 -10" stroke="#7a6f58" stroke-width="1.2"/>
   </g>
   <text x="46" y="122" font-size="10" fill="${SUMI}">煙＝体力が減る</text>
  </svg>`},
];

function cardsHTML(){
  return CARDS.map(c=>`<section class="nt-card"><h2>${c.n}. ${c.h}<i>${c.sub}</i></h2>${c.svg}<p>${c.p}</p></section>`).join('');
}
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));

export function mountTitle(el, { stages = [], onStart, tip = '' } = {}){
  style();
  el.innerHTML = `<div class="nt">
    <div class="nt-fly" aria-hidden="true"><svg viewBox="-14 -18 36 30">${mosq(1, '#ebe5d3')}</svg></div>
    <div class="nt-head">
      <div class="nt-titleblock"><h1>ぬるい夜</h1><p class="nt-sub">夏の夜、あなたは1匹の蚊。</p>${tip?`<p class="nt-tip">${esc(tip)}</p>`:''}</div>
      <div class="nt-btns">
        ${stages.map((s,k)=>`<button class="nt-st" data-k="${k}"><span><b>${s.id}. ${esc(s.short)}</b><small>${esc(s.note||'')}</small></span>${s.best!=null?`<span class="rec">最高 ${s.best} mg</span>`:''}</button>`).join('')}
        <button class="nt-how">遊び方を大きく見る</button>
      </div>
    </div>
    <div class="nt-cards" aria-label="遊び方">${cardsHTML()}</div>
  </div>`;
  el.querySelectorAll('.nt-st').forEach(b=>b.onclick=()=>onStart && onStart(+b.dataset.k));
  el.querySelector('.nt-how').onclick = ()=>{
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;inset:0;z-index:5';
    el.appendChild(layer);
    mountHowTo(layer, { onClose: ()=>layer.remove() });
  };
}

export function mountHowTo(el, { onClose } = {}){
  style();
  el.innerHTML = `<div class="nt nt-howto">
    <div class="nt-top"><h1>遊び方</h1><button class="nt-close">とじる</button></div>
    <div class="nt-cards">${cardsHTML()}</div>
    <p class="nt-sub" style="text-align:center">23:00から5:00まで。叩かれたら終わり。</p>
  </div>`;
  el.querySelector('.nt-close').onclick = ()=>{ el.innerHTML = ''; onClose && onClose(); };
}
