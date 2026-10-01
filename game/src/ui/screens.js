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

// 3コマの絵（SVG、自作）
const PANELS = [
  '<svg viewBox="0 0 120 120"><circle cx="60" cy="70" r="48" fill="#FFC94A" opacity=".15"/><g fill="#FFC94A"><circle cx="60" cy="66" r="7"/><circle cx="46" cy="78" r="5"/><circle cx="74" cy="80" r="5"/><circle cx="52" cy="54" r="4"/></g><path d="M22 104h76M90 98l8 6-8 6M30 98l-8 6 8 6" stroke="#F4F1EA" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  '<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="#FFC94A" opacity=".12"/><g fill="#FFC94A"><circle cx="40" cy="80" r="6"/><circle cx="52" cy="90" r="5"/></g><circle cx="86" cy="38" r="14" fill="none" stroke="#7FE0D4" stroke-width="3"/><circle cx="86" cy="38" r="5" fill="#7FE0D4"/><path d="M62 70Q74 56 80 46" stroke="#F4F1EA" stroke-width="3" fill="none" stroke-dasharray="2 7" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 120 120"><rect x="0" y="48" width="38" height="24" fill="#1E2236" stroke="#3A4160" stroke-width="3"/><rect x="82" y="48" width="38" height="24" fill="#1E2236" stroke="#3A4160" stroke-width="3"/><g fill="#FFC94A"><circle cx="60" cy="96" r="6"/><circle cx="48" cy="104" r="5"/><circle cx="72" cy="104" r="5"/><circle cx="60" cy="112" r="5"/></g><circle cx="22" cy="100" r="3" fill="#FFC94A" opacity=".5"/><path d="M60 88V62" stroke="#F4F1EA" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 7"/></svg>',
];

export async function createScreens({ root, saved, persist, names = [], onStart, onMute, onVibe, onReduce, onReset }) {
  const T = merge(FALLBACK, await getJson('src/data/texts.json'));
  const creatures = (await getJson('src/data/creatures.json'))?.list ?? Array.from({ length: 12 }, (_, i) => ({ id: 'c' + i, name: '' }));
  const el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const btn = (id, label, cls = '') => `<button class="btn ${cls}" id="${id}">${esc(label)}</button>`;
  const screens = {
    title: el(`<section class="screen" id="s-title"><div class="top"><div class="logo">${esc(T.title.name)}</div><div class="tag">${esc(T.title.sub)}</div><div class="orb" aria-hidden="true"></div></div>
      <div class="low">${btn('b-start', T.buttons.start, 'huge')}<div class="row">${btn('b-howto', T.buttons.howto, 'sm')}${btn('b-zukan', T.buttons.zukan, 'sm')}${btn('b-settings', T.buttons.settings, 'sm')}</div><div class="sub" id="t-best"></div></div></section>`),
    howto: el(`<section class="screen" id="s-howto"><h2>${esc(T.buttons.howto)}</h2><div class="panels">${T.howto.map((t, i) => `<div class="panel">${PANELS[i] ?? ''}<p>${esc(t)}</p></div>`).join('')}</div>
      <div class="low">${btn('h-back', T.buttons.back, 'sm')}</div></section>`),
    zukan: el(`<section class="screen" id="s-zukan"><h2>${esc(T.buttons.zukan)} <span class="sub" id="z-count"></span></h2><div class="grid" id="z-grid"></div><div class="low">${btn('z-back', T.buttons.back, 'sm')}</div></section>`),
    settings: el(`<section class="screen" id="s-settings"><h2>${esc(T.buttons.settings)}</h2><div class="rows">
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
