// 画面（タイトル/あそびかた/ずかん/せってい/リザルト）の生成と切替。ゲームロジックには触らない。
// 文言は data/texts.json、生き物は data/creatures.json。無ければ下の既定値で動く。
const FALLBACK = {
  title: { name: 'トモシムレ', sub: 'ひかりを つれて、おくへ。' },
  buttons: { start: 'ともす', retry: 'もう一度 ともす', toTitle: 'タイトルへ', howto: 'あそびかた', zukan: 'ずかん', settings: 'せってい', back: 'もどる' },
  result: { heading: 'ここまで ひかり', score: 'ひかり', layer: 'たどりついた 層', flowers: 'ともした ねむり花', swarm: 'いちばん多い 群れ', newBest: 'ベスト こうしん。ひかりが ふえたね。', best: 'ベスト' },
  tutorial: ['ゆびで ホタルを みちびく', 'はぐれた子を ひろうと あかるくなる', 'すきまは せまい。ふえすぎに ちゅうい'],
  settings: { sound: '音', vibration: 'ふるえ', reduceMotion: 'うごき控えめ', reset: '記録を消す', resetConfirm1: 'ここまでの 記録を 消しますか？', resetConfirm2: '消した記録は もどりません。よろしいですか？', on: 'あり', off: 'なし', yes: '消す', no: 'やめる' },
  howto: ['ゆびを よこに うごかすと、群れが ついてくる。', 'はぐれた子を ひろうと、明るく ひかりも ふえる。', '群れが 大きいと すきまを ぬけにくい。ときには 端の子が 散っても だいじょうぶ。'],
  zukan: { unknown: '？？？', count: 'みつけた' },
};
const getJson = async url => { try { const r = await fetch(url); return r.ok ? await r.json() : null; } catch { return null; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const merge = (a, b) => { const o = { ...a }; for (const k in b ?? {}) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k] ?? {}, b[k]) : b[k]; return o; };

// 3コマの絵（SVG、自作。紙の上の墨絵。ホタルは墨の輪郭に蛍色を少しずらして重ねる）
const ff = (x, y, r) => `<circle cx="${x + 2}" cy="${y + 2}" r="${r + 2}" fill="#1C1915"/><circle cx="${x}" cy="${y}" r="${r}" fill="#C6DA3C"/>`;
const PANELS = [
  `<svg viewBox="0 0 120 120" aria-hidden="true">${ff(60, 52, 8)}${ff(44, 66, 6)}${ff(76, 68, 6)}${ff(56, 78, 5)}<path d="M18 102 C40 98 80 106 100 101 M100 101 l-9 -6 M100 101 l-8 7 M18 102 l9 -6 M18 102 l8 7" stroke="#1C1915" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M14 66 C10 36 40 14 66 20 C98 26 112 60 100 88 C88 112 40 114 22 92 C16 86 15 76 14 66Z" fill="none" stroke="#1C1915" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>${ff(40, 82, 6)}${ff(52, 92, 5)}<circle cx="87" cy="38" r="15" fill="none" stroke="#1C1915" stroke-width="3"/>${ff(87, 38, 5)}<path d="M58 76 Q74 64 80 52" stroke="#1C1915" stroke-width="3" fill="none" stroke-dasharray="2 7" stroke-linecap="round"/></svg>`,
  `<svg viewBox="0 0 120 120" aria-hidden="true"><path d="M-2 44 L40 46 L38 70 L-2 72Z" fill="#6F8FA8" transform="translate(3 3)"/><path d="M122 42 L82 46 L84 72 L122 70Z" fill="#6F8FA8" transform="translate(3 3)"/><path d="M-2 44 L40 46 L38 70 L-2 72Z M122 42 L82 46 L84 72 L122 70Z" fill="#1C1915"/>${ff(60, 94, 6)}${ff(48, 102, 5)}${ff(72, 102, 5)}${ff(60, 111, 5)}${ff(18, 100, 4)}<path d="M60 84 V58" stroke="#1C1915" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/></svg>`,
];

export async function createScreens({ root, saved, persist, names = [], onStart, onMute, onVibe, onReduce, onReset }) {
  const T = merge(FALLBACK, await getJson('src/data/texts.json'));
  const creatures = (await getJson('src/data/creatures.json'))?.list ?? Array.from({ length: 12 }, (_, i) => ({ id: 'c' + i, name: '' }));
  const el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const btn = (id, label, cls = '') => `<button class="btn ${cls}" id="${id}">${esc(label)}</button>`;
  const screens = {
    title: el(`<section class="screen" id="s-title"><div class="top"><div class="lit"><svg viewBox="0 0 320 400" preserveAspectRatio="none" aria-hidden="true"><path d="M168 14 C236 8 292 52 301 118 C310 184 296 262 262 322 C236 368 190 392 148 388 C92 384 36 350 22 280 C8 214 20 142 44 88 C68 36 118 18 168 14Z" fill="#C6DA3C" opacity=".55" transform="translate(7 8)"/><path d="M168 14 C236 8 292 52 301 118 C310 184 296 262 262 322 C236 368 190 392 148 388 C92 384 36 350 22 280 C8 214 20 142 44 88 C68 36 118 18 168 14Z" fill="#DDD4B8"/></svg><h1 class="logo">${esc(T.title.name)}</h1><p class="tag">${esc(T.title.sub)}</p><div class="orb" aria-hidden="true"></div></div></div>
      <div class="low">${btn('b-start', T.buttons.start, 'huge')}<div class="row">${btn('b-howto', T.buttons.howto, 'sm')}${btn('b-zukan', T.buttons.zukan, 'sm')}${btn('b-settings', T.buttons.settings, 'sm')}</div><div class="sub" id="t-best"></div></div></section>`),
    howto: el(`<section class="screen paper" id="s-howto"><h2>${esc(T.buttons.howto)}</h2><div class="panels">${T.howto.map((t, i) => `<div class="panel">${PANELS[i] ?? ''}<p>${esc(t)}</p></div>`).join('')}</div>
      <div class="low">${btn('h-back', T.buttons.back, 'sm')}</div></section>`),
    zukan: el(`<section class="screen paper" id="s-zukan"><h2>${esc(T.buttons.zukan)} <span class="sub" id="z-count"></span></h2><div class="grid" id="z-grid"></div><div class="low">${btn('z-back', T.buttons.back, 'sm')}</div></section>`),
    settings: el(`<section class="screen paper" id="s-settings"><h2>${esc(T.buttons.settings)}</h2><div class="rows">
      ${['sound', 'vibration', 'reduceMotion'].map(k => `<div class="srow"><span>${esc(T.settings[k])}</span><button class="tgl" id="tg-${k}" role="switch" aria-checked="false"></button></div>`).join('')}
      <div class="srow"><span>${esc(T.settings.reset)}</span>${btn('r-reset', T.settings.reset, 'sm warn')}</div><div class="confirm" id="r-confirm" hidden><p id="r-msg"></p><div class="row">${btn('r-yes', T.settings.yes, 'sm warn')}${btn('r-no', T.settings.no, 'sm')}</div></div></div>
      <div class="low">${btn('s-back', T.buttons.back, 'sm')}</div></section>`),
    result: el(`<section class="screen" id="s-result"><div class="top"><div class="sub">${esc(T.result.heading)}</div><div class="huge-num" id="r-score">0</div><div class="newbest" id="r-new" hidden>${esc(T.result.newBest)}</div>
      <dl class="stats"><div><dt>${esc(T.result.layer)}</dt><dd id="r-layer"></dd></div><div><dt>${esc(T.result.flowers)}</dt><dd id="r-flowers"></dd></div><div><dt>${esc(T.result.swarm)}</dt><dd id="r-swarm"></dd></div><div><dt>${esc(T.result.best)}</dt><dd id="r-best"></dd></div></dl></div>
      <div class="low">${btn('r-retry', T.buttons.retry, 'huge')}${btn('r-title', T.buttons.toTitle, 'sm')}</div></section>`),
  };
  for (const k in screens) { screens[k].hidden = true; root.appendChild(screens[k]); }
  const $ = id => root.querySelector('#' + id);
  let cur = 'title', from = 'title';
  function show(name) {
    if (['howto', 'zukan', 'settings'].includes(name)) from = cur === 'result' || cur === 'title' ? cur : from;
    cur = name;
    for (const k in screens) screens[k].hidden = k !== name;
    document.body.classList.toggle('playing', name === 'none');
    if (name === 'zukan') renderZukan();
    if (name === 'settings') { $('r-confirm').hidden = true; syncToggles(); }
  }
  function renderZukan() {
    const got = new Set(saved.dex ?? []);
    $('z-grid').innerHTML = creatures.slice(0, 12).map(c => got.has(c.id)
      ? `<div class="cell on"><b>${esc(c.name)}</b><small>${esc(c.desc ?? '')}</small></div>` : `<div class="cell"><b>？</b><small>${esc(T.zukan.unknown)}</small></div>`).join('');
    $('z-count').textContent = `${T.zukan.count} ${creatures.slice(0, 12).filter(c => got.has(c.id)).length} / 12`;
  }
  const flags = { sound: () => !saved.muted, vibration: () => saved.vibe !== false, reduceMotion: () => !!saved.calm };
  function syncToggles() {
    for (const k in flags) { const b = $('tg-' + k), on = flags[k](); b.setAttribute('aria-checked', on); b.textContent = on ? T.settings.on : T.settings.off; }
  }
  const flip = { sound: () => { saved.muted = !saved.muted; onMute?.(saved.muted); }, vibration: () => { saved.vibe = saved.vibe === false; onVibe?.(saved.vibe); }, reduceMotion: () => { saved.calm = !saved.calm; onReduce?.(saved.calm); } };
  for (const k in flip) $('tg-' + k).onclick = () => { flip[k](); persist(); syncToggles(); };
  $('b-start').onclick = () => onStart(); $('r-retry').onclick = () => onStart();
  $('b-howto').onclick = () => show('howto'); $('b-zukan').onclick = () => show('zukan'); $('b-settings').onclick = () => show('settings');
  for (const id of ['h-back', 'z-back', 's-back']) $(id).onclick = () => show(from);
  $('r-title').onclick = () => show('title');
  let step = 0;
  $('r-reset').onclick = () => { step = 1; $('r-msg').textContent = T.settings.resetConfirm1; $('r-confirm').hidden = false; };
  $('r-no').onclick = () => { step = 0; $('r-confirm').hidden = true; };
  $('r-yes').onclick = () => {
    if (step === 1) { step = 2; $('r-msg').textContent = T.settings.resetConfirm2; return; }
    onReset?.(); step = 0; $('r-confirm').hidden = true; setBest(saved.best);
  };
  function setBest(n) { $('t-best').textContent = `${T.result.best} ${n}`; }
  setBest(saved.best);
  return {
    show, setBest, texts: T,
    showResult({ score, layer, flowers = 0, maxN = 0, newBest = false }) {
      $('r-score').textContent = score; $('r-layer').textContent = names[layer - 1] ? `${layer} ${names[layer - 1]}` : layer;
      $('r-flowers').textContent = flowers; $('r-swarm').textContent = maxN; $('r-best').textContent = saved.best; $('r-new').hidden = !newBest;
      show('result');
    },
  };
}
