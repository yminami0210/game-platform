/* 最後の一時間 — イマーシブシアター型ブラウザゲーム
 * 脚本は scenarios/*.json に分離。エンジンは脚本に依存しない。 */
(() => {
  'use strict';

  const params = new URLSearchParams(location.search);
  const FAST = Math.max(1, Number(params.get('fast')) || 1); // テスト用の時間加速
  const MS_PER_MIN = 9000 / FAST; // 等速で 1 分 = 9 秒（1 周 = 3 分）
  const SPEEDS = [1, 2, 4];

  const $ = id => document.getElementById(id);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(k));
    return n;
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, text) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };

  // ---------- 保存 ----------
  const store = {
    load(key) { try { return JSON.parse(localStorage.getItem(key)) || null; } catch { return null; } },
    save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* 保存できない環境でも遊べる */ } },
    remove(key) { try { localStorage.removeItem(key); } catch { /* noop */ } }
  };

  // ---------- 状態 ----------
  let SC, KEY, rooms, chars, adj;
  const S = {
    t: 0, room: null, follow: null, speed: 1, running: false, ended: false,
    lastMin: -1, loopNew: [], loopTruths: [], loopRumor: null,
    save: { loops: 0, seen: {}, witnessed: {}, truths: {}, notes: '' }
  };

  const pad = n => String(n).padStart(2, '0');
  const clockText = m => {
    const tot = SC.clockStart.hour * 60 + SC.clockStart.minute + m;
    return `${pad(Math.floor(tot / 60) % 24)}:${pad(tot % 60)}`;
  };
  const roomAt = (cid, m) => {
    let r = null;
    for (const e of SC.schedules[cid]) if (e.t <= m) r = e; else break;
    return r;
  };
  const charsIn = (room, m) => SC.characters.filter(c => roomAt(c.id, m)?.room === room);
  const activeScene = (room, t) => SC.scenes.find(s => s.room === room && t >= s.t && t < s.t + s.dur);
  const sceneFragments = () => SC.scenes.length;
  const seenCount = () => SC.scenes.filter(s => S.save.seen[s.id]).length;

  // ---------- 読み込み ----------
  async function boot() {
    const list = await (await fetch('scenarios/index.json')).json();
    const pick = list.find(x => x.id === params.get('s')) || list[0];
    SC = await (await fetch('scenarios/' + pick.file)).json();
    KEY = `immersive-hour:v1:${SC.id}`;
    rooms = Object.fromEntries(SC.rooms.map(r => [r.id, r]));
    chars = Object.fromEntries(SC.characters.map(c => [c.id, c]));
    adj = Object.fromEntries(SC.rooms.map(r => [r.id, new Set()]));
    for (const [a, b] of SC.doors) { adj[a].add(b); adj[b].add(a); }
    Object.assign(S.save, sanitizeSave(store.load(KEY)));
    document.title = SC.title;
    $('title').textContent = SC.title;
    $('question').textContent = SC.question || '';
    S.room = SC.startRoom;
    buildMap();
    bindUI();
    render(true);
    showTitleCard();
    requestAnimationFrame(frame);
  }

  // 保存データを現行の脚本に合わせて洗う（旧版の場面・部屋・人物・分が混ざっていても壊れない）
  function sanitizeSave(raw) {
    const r = raw && typeof raw === 'object' ? raw : {};
    const sceneIds = new Set(SC.scenes.map(s => s.id));
    const truthIds = new Set(SC.truths.map(t => t.id));
    const pick = (obj, ok) => Object.fromEntries(Object.entries(obj && typeof obj === 'object' ? obj : {}).filter(([k, v]) => v && ok(k)));
    const witnessed = {};
    for (const c of SC.characters) {
      const w = r.witnessed?.[c.id];
      witnessed[c.id] = Object.fromEntries(Object.entries(w && typeof w === 'object' ? w : {})
        .filter(([m, room]) => Number(m) >= 0 && Number(m) < SC.length && rooms[room]));
    }
    return {
      loops: Number.isFinite(r.loops) && r.loops > 0 ? r.loops : 0,
      seen: pick(r.seen, id => sceneIds.has(id)),
      truths: pick(r.truths, id => truthIds.has(id)),
      witnessed,
      notes: typeof r.notes === 'string' ? r.notes : ''
    };
  }

  // ---------- 時間の進行 ----------
  let prev = performance.now();
  function frame(now) {
    const dt = Math.min(now - prev, 250);
    prev = now;
    if (S.running && !S.ended) {
      let rate = S.speed;
      if (activeScene(S.room, S.t)) rate = Math.min(rate, 1); // 場面中は等速で読ませる
      advance(dt * rate / MS_PER_MIN);
    }
    renderClock();
    requestAnimationFrame(frame);
  }

  function advance(dMin) {
    const target = Math.min(SC.length, S.t + dMin);
    while (S.lastMin + 1 < SC.length && S.lastMin + 1 <= target) {
      S.t = S.lastMin + 1;
      processMinute(S.t);
    }
    S.t = target;
    render();
    if (S.t >= SC.length) endLoop();
  }

  function processMinute(m) {
    S.lastMin = m;
    if (S.follow) {
      const r = roomAt(S.follow, m).room;
      if (r !== S.room) { S.room = r; toast(`${chars[S.follow].short}を追って${rooms[r].name}へ`, 'move'); }
    }
    observe(m);
  }

  // 今いる部屋で見えたものを記録する
  function observe(m) {
    if (m >= SC.length) return;
    let changed = false;
    for (const c of charsIn(S.room, m)) {
      if (S.save.witnessed[c.id][m] !== S.room) { S.save.witnessed[c.id][m] = S.room; changed = true; }
    }
    const sc = activeScene(S.room, m);
    if (sc && !S.save.seen[sc.id]) {
      S.save.seen[sc.id] = true;
      S.loopNew.push(sc.id);
      checkTruths();
      changed = true;
    }
    if (changed) persist();
  }

  // requires の要素が配列なら「どれか1つ」(any-of)
  function truthMet(id) {
    if (Array.isArray(id)) return id.some(truthMet);
    return !!S.save.truths[id] || !!S.save.seen[id];
  }
  function checkTruths() {
    let again = true;
    while (again) {
      again = false;
      for (const tr of SC.truths) {
        if (S.save.truths[tr.id]) continue;
        if (tr.requires.every(truthMet)) {
          S.save.truths[tr.id] = true;
          S.loopTruths.push(tr.id);
          again = true;
        }
      }
    }
  }
  const persist = () => store.save(KEY, S.save);

  // ---------- 移動・追跡 ----------
  function moveTo(id) {
    if (S.ended || id === S.room) return;
    if (!adj[S.room].has(id)) { toast('そこへは隣の部屋を通って行こう'); return; }
    S.follow = null;
    S.room = id;
    if (S.lastMin >= 0) observe(S.lastMin);
    render(true);
  }
  function setFollow(cid) {
    S.follow = S.follow === cid ? null : cid;
    if (S.follow && !S.running && !S.ended) start();
    render(true);
  }

  function start() {
    if (S.ended) return;
    S.running = true;
    if (S.lastMin < 0) processMinute(0);
    render(true);
  }
  function pause() { S.running = false; render(true); }

  function newLoop() {
    Object.assign(S, { t: 0, room: SC.startRoom, follow: null, ended: false, lastMin: -1, loopNew: [], loopTruths: [], loopRumor: null });
    hideOverlay();
    start();
  }

  function endLoop() {
    if (S.ended) return;
    S.ended = true;
    S.running = false;
    S.save.loops = (S.save.loops || 0) + 1;
    checkTruths();
    // その周で手がかりが1つも開かなかったら、進捗の最も高い未開の手がかりを噂として1つ開く
    if (!S.loopTruths.length) {
      let best = null, bestP = -1;
      for (const tr of SC.truths) {
        if (tr.final || S.save.truths[tr.id]) continue;
        const p = tr.requires.filter(truthMet).length / tr.requires.length;
        if (p > bestP) { best = tr; bestP = p; }
      }
      if (best) {
        S.save.truths[best.id] = true;
        S.loopTruths.push(best.id);
        S.loopRumor = best.id;
        checkTruths();
      }
    }
    persist();
    render(true);
    showFinale();
  }

  // ---------- 描画：見取り図 ----------
  const CELL = 100, PADR = 4;
  let roomNodes = {};
  function buildMap() {
    const map = $('map');
    map.innerHTML = '';
    const cols = Math.max(...SC.rooms.map(r => r.x)) + 1;
    const rows = Math.max(...SC.rooms.map(r => r.y)) + 1;
    map.setAttribute('viewBox', `0 0 ${cols * CELL} ${rows * CELL}`);
    for (const [a, b] of SC.doors) {
      const A = rooms[a], B = rooms[b];
      if (A.x === B.x) {
        const y = Math.max(A.y, B.y) * CELL;
        map.append(svg('rect', { class: 'door', x: A.x * CELL + CELL / 2 - 12, y: y - 7, width: 24, height: 14, rx: 3 }));
      } else {
        const x = Math.max(A.x, B.x) * CELL;
        map.append(svg('rect', { class: 'door', x: x - 7, y: A.y * CELL + CELL / 2 - 12, width: 14, height: 24, rx: 3 }));
      }
    }
    for (const r of SC.rooms) {
      const g = svg('g', { class: 'room-g', 'data-room': r.id, tabindex: 0, role: 'button', 'aria-label': r.name });
      g.append(svg('rect', { class: 'room-rect', x: r.x * CELL + PADR, y: r.y * CELL + PADR, width: CELL - PADR * 2, height: CELL - PADR * 2, rx: 6, style: `--tone:${r.tone}` }));
      g.append(svg('text', { class: 'room-label', x: r.x * CELL + CELL / 2, y: r.y * CELL + 24, 'text-anchor': 'middle' }, r.name));
      const layer = svg('g', { class: 'room-layer' });
      g.append(layer);
      g.addEventListener('click', () => moveTo(r.id));
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); moveTo(r.id); } });
      map.append(g);
      roomNodes[r.id] = { g, layer, r };
    }
  }

  function renderMap(m) {
    for (const [id, { g, layer, r }] of Object.entries(roomNodes)) {
      const here = id === S.room;
      g.classList.toggle('here', here);
      g.classList.toggle('near', adj[S.room].has(id));
      layer.innerHTML = '';
      const cx = r.x * CELL + CELL / 2, cy = r.y * CELL + CELL / 2;
      if (here) {
        const ppl = m >= 0 ? charsIn(id, m) : [];
        const n = ppl.length;
        ppl.forEach((c, i) => {
          const x = cx + (i - (n - 1) / 2) * 17;
          layer.append(svg('circle', { cx: x, cy: cy + 18, r: 7.5, fill: c.color, class: S.follow === c.id ? 'dot followed' : 'dot' }));
          layer.append(svg('text', { x, y: cy + 21.5, 'text-anchor': 'middle', class: 'dot-label' }, c.short[0]));
        });
        layer.append(svg('circle', { cx, cy: cy - 6, r: 6, class: 'you' }));
        layer.append(svg('text', { x: cx, y: cy - 16, 'text-anchor': 'middle', class: 'you-label' }, 'あなた'));
      } else if (m >= 0 && adj[S.room].has(id)) {
        const asc = activeScene(id, S.t);
        const n = charsIn(id, m).length;
        if (asc && asc.chars.length) {
          layer.append(svg('text', { x: cx, y: cy + 14, 'text-anchor': 'middle', class: 'murmur' }, '…話し声'));
        } else if (n) {
          for (let i = 0; i < n; i++) layer.append(svg('circle', { cx: cx + (i - (n - 1) / 2) * 12, cy: cy + 18, r: 4, class: 'presence' }));
        }
      }
    }
  }

  // ---------- 描画：部屋パネル ----------
  let lastKey = '';
  function render(force) {
    const m = S.lastMin;
    const sc = m >= 0 ? activeScene(S.room, S.t) : null;
    const nLines = sc ? Math.min(sc.lines.length, Math.floor((S.t - sc.t) / (sc.dur / sc.lines.length)) + 1) : 0;
    const key = [m, S.room, S.follow, sc?.id, nLines, S.running, S.ended, S.speed].join('|');
    if (!force && key === lastKey) return;
    lastKey = key;

    renderMap(m);
    const room = rooms[S.room];
    $('roomName').textContent = room.name;
    $('roomDesc').textContent = room.desc;
    $('roomPanel').style.setProperty('--tone', room.tone);
    const ft = $('followTag');
    ft.hidden = !S.follow;
    if (S.follow) ft.textContent = `${chars[S.follow].short}を追跡中`;

    const people = $('people');
    people.innerHTML = '';
    const present = m >= 0 ? charsIn(S.room, m) : [];
    if (m < 0) people.append(el('p', { class: 'muted' }, '開演を待っている。'));
    else if (!present.length) people.append(el('p', { class: 'muted' }, '誰もいない。'));
    for (const c of present) {
      const following = S.follow === c.id;
      people.append(el('div', { class: 'person', style: `--c:${c.color}` },
        el('span', { class: 'swatch' }),
        el('div', { class: 'p-body' },
          el('div', { class: 'p-name' }, c.name, el('small', {}, ' ', c.role)),
          !sc || !sc.chars.includes(c.id) ? el('div', { class: 'p-idle' }, roomAt(c.id, m).idle) : null),
        el('button', { class: following ? 'follow on' : 'follow', 'data-follow': c.id, onclick: () => setFollow(c.id) }, following ? '追跡中' : '追う')));
    }

    const box = $('scene');
    box.innerHTML = '';
    if (sc) {
      box.append(el('div', { class: 'scene-title' }, `${clockText(sc.t)}　${sc.title}`, S.save.seen[sc.id] ? el('span', { class: 'mark', title: '記録済み' }, ' ✎') : null));
      sc.lines.slice(0, nLines).forEach(ln => box.append(lineNode(ln)));
      box.hidden = false;
    } else box.hidden = true;

    $('playBtn').textContent = S.ended ? '終演' : S.running ? '❚❚ 一時停止' : (m < 0 ? '▶ 開演' : '▶ 再開');
    $('playBtn').disabled = S.ended;
    $('speedBtn').textContent = `×${S.speed}`;
    $('loop').textContent = `第${(S.save.loops || 0) + (S.ended ? 0 : 1)}周`;
    $('frag').textContent = `場面 ${seenCount()}/${sceneFragments()} · 手がかり ${Object.keys(S.save.truths).length}/${SC.truths.length}`;
  }

  function lineNode(ln) {
    if (!ln.who) return el('p', { class: 'narr' }, ln.text);
    const c = chars[ln.who];
    return el('p', { class: 'line', style: `--c:${c.color}` }, el('b', {}, c.short), ln.text);
  }

  function renderClock() {
    $('clock').textContent = clockText(Math.floor(S.t));
    $('timefill').style.width = `${(S.t / SC.length) * 100}%`;
  }

  // ---------- オーバーレイ ----------
  function showSheet(nodes) {
    const sh = $('sheet');
    sh.innerHTML = '';
    sh.append(...nodes.filter(n => n != null && n !== false));
    $('overlay').hidden = false;
    sh.querySelector('button')?.focus();
  }
  function hideOverlay() { $('overlay').hidden = true; }

  function showTitleCard() {
    const loops = S.save.loops || 0;
    showSheet([
      SC.question ? el('p', { class: 'question-lead' }, SC.question) : null,
      el('p', { class: 'eyebrow' }, SC.subtitle),
      el('h2', {}, SC.title),
      ...SC.intro.map(t => el('p', {}, t)),
      el('ul', { class: 'howto' },
        el('li', {}, '見取り図で隣の部屋をタップして移動。'),
        el('li', {}, '部屋にいる人物の「追う」で、その人に付いて回る。'),
        el('li', {}, '見た場面は記録帳に残り、周をまたいで蓄積される。終演のたびに、手がかりが開く。')),
      el('button', { class: 'primary big', id: 'startBtn', onclick: () => { hideOverlay(); start(); } },
        loops ? `第${loops + 1}周を始める` : '開演する')
    ]);
  }

  function clueNodes(list) {
    if (!list.length) return [el('p', { class: 'muted' }, 'この周は、新しい手がかりを得られなかった。')];
    return [el('div', { class: 'new-truths' }, el('b', {}, '開いた手がかり'),
      ...list.map((t, i) => {
        const rumor = S.loopRumor === t.id;
        const paras = t.final ? t.text.slice(0, 1) : t.text;
        const cls = `clue${t.final ? ' final' : ''}${rumor ? ' rumor' : ''}`;
        const note = rumor ? el('small', {}, '終演後、ロビーで耳にした噂') : null;
        if (i === 0) return el('div', { class: cls }, note, el('h3', {}, t.title), ...paras.map(p => el('p', {}, p)));
        return el('details', { class: cls }, el('summary', {}, t.title), note, ...paras.map(p => el('p', {}, p)));
      }))];
  }

  function showFinale() {
    const inRoom = S.room === SC.finale.inRoom;
    const newTruths = S.loopTruths.map(id => SC.truths.find(t => t.id === id));
    const allDone = SC.truths.every(t => S.save.truths[t.id]);
    showSheet([
      el('p', { class: 'eyebrow' }, `第${S.save.loops}周 終演`),
      el('h2', {}, '零時'),
      el('p', {}, inRoom ? 'あなたはロビーで、止まった大時計を見上げていた。' : SC.finale.elsewhere),
      el('p', { class: 'muted' }, `この周で記録した場面：${S.loopNew.length}　/　累計 ${seenCount()}/${sceneFragments()}`),
      ...clueNodes(newTruths),
      allDone ? el('p', { class: 'epilogue' }, 'すべての手がかりがそろった。それでも、この夜はまた始まる。誰かが手紙に封をするまで。') : null,
      el('div', { class: 'row' },
        el('button', { class: 'primary big', id: 'againBtn', onclick: newLoop }, 'もう一度、この一時間へ'),
        el('button', { onclick: () => openBook(newTruths.length ? 'truths' : 'scenes') }, '記録帳を開く'),
        el('button', { id: 'qBtn', onclick: () => openBook('scenes') }, '記録帳の『？』を見る'))
    ]);
  }

  // ---------- 記録帳 ----------
  let bookTab = 'scenes', bookOpenScene = null, bookQ = null;
  function openBook(tab) {
    if (tab) bookTab = tab;
    S.wasRunning = S.running;
    S.running = false;
    $('book').hidden = false;
    renderBook();
  }
  function closeBook() {
    $('book').hidden = true;
    if (S.wasRunning && !S.ended) S.running = true;
    render(true);
  }

  function renderBook() {
    document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === bookTab));
    const body = $('bookBody');
    body.innerHTML = '';
    if (bookTab === 'scenes') {
      body.append(el('p', { class: 'muted' }, `見た場面 ${seenCount()} / ${SC.scenes.length}（周回 ${S.save.loops || 0}）　見た場面をタップで台詞`));
      body.append(el('p', { class: 'muted legend-q' }, '？ ＝ そこで何かが起きていた（まだ見ていない）'));
      const times = [...new Set(SC.scenes.map(s => s.t))].sort((a, b) => a - b);
      const tbl = el('table', { class: 'stable' });
      tbl.append(el('thead', {}, el('tr', {}, el('th', {}, ''), ...SC.rooms.map(r => el('th', { style: `--tone:${r.tone}` }, r.name)))));
      const tb = el('tbody');
      for (const t of times) {
        const here = SC.scenes.filter(s => s.t === t);
        tb.append(el('tr', {}, el('th', { class: 'tm' }, clockText(t)), ...SC.rooms.map(r => {
          const ss = here.filter(s => s.room === r.id);
          return el('td', { style: `--tone:${r.tone}` }, ss.map(sc => S.save.seen[sc.id]
            ? el('button', { class: `sc-btn${bookOpenScene === sc.id ? ' on' : ''}`, 'data-scene': sc.id, onclick: () => { bookOpenScene = bookOpenScene === sc.id ? null : sc.id; renderBook(); } }, sc.title)
            : el('button', { class: `sc-q${bookQ === sc.id ? ' on' : ''}`, 'data-q': sc.id, onclick: () => { bookQ = bookQ === sc.id ? null : sc.id; renderBook(); } }, '？')));
        })));
        const q = here.find(sc => sc.id === bookQ && !S.save.seen[sc.id]);
        if (q) tb.append(el('tr', { class: 'sc-lines q-note' }, el('td', { colspan: SC.rooms.length + 1 }, `${clockText(q.t)} ${rooms[q.room].name} ── まだ見ていない。次の周、この時刻にここへ。`)));
        const op = here.find(sc => sc.id === bookOpenScene);
        if (op) tb.append(el('tr', { class: 'sc-lines' }, el('td', { colspan: SC.rooms.length + 1, style: `--tone:${rooms[op.room].tone}` },
          el('div', { class: 'who' }, `${clockText(op.t)} ${rooms[op.room].name}${op.chars.length ? '　' + op.chars.map(c => chars[c].short).join('・') : ''}`), ...op.lines.map(lineNode))));
      }
      tbl.append(tb);
      body.append(tbl);
    } else if (bookTab === 'people') {
      body.append(el('p', { class: 'muted' }, '同じ部屋で目撃した時刻だけが埋まっていく。誰がいつどこにいたか、時刻表を完成させよう。'));
      for (const c of SC.characters) {
        const w = S.save.witnessed[c.id] || {};
        const bar = el('div', { class: 'tl' });
        for (let m = 0; m < SC.length; m++) {
          const r = w[m];
          bar.append(el('i', { style: r ? `background:${rooms[r].tone}` : '', title: r ? `${clockText(m)} ${rooms[r].name}` : '' }));
        }
        const known = Object.keys(w).length;
        body.append(el('div', { class: 'pcard', style: `--c:${c.color}` },
          el('div', { class: 'p-name' }, el('span', { class: 'swatch' }), c.name, el('small', {}, ` ${c.role} · ${known}/${SC.length}分`)), bar));
      }
      body.append(el('div', { class: 'legend' }, ...SC.rooms.map(r => el('span', {}, el('i', { style: `background:${r.tone}` }), r.name))));
      body.append(el('div', { class: 'tl-axis' }, el('span', {}, clockText(0)), el('span', {}, clockText(30)), el('span', {}, clockText(SC.length - 1))));
    } else {
      for (const tr of SC.truths) {
        const open = S.save.truths[tr.id];
        const got = tr.requires.filter(truthMet).length;
        body.append(el('div', { class: `truth ${open ? 'open' : 'locked'} ${tr.final ? 'final' : ''}`, style: `--c:${chars[tr.char]?.color || '#ccc'}` },
          el('h3', {}, open ? tr.title : '？？？'),
          open ? tr.text.map(p => el('p', {}, p)) : [
            el('div', { class: 'meter' }, el('i', { style: `width:${(got / tr.requires.length) * 100}%` })),
            el('p', { class: 'muted' }, `手がかり ${got}/${tr.requires.length}　${tr.hint}`)
          ]));
      }
      const ta = el('textarea', { id: 'notes', rows: 4, placeholder: '考察メモ（この端末にだけ保存されます）' });
      ta.value = S.save.notes || '';
      ta.addEventListener('input', () => { S.save.notes = ta.value; persist(); });
      body.append(el('h3', { class: 'notes-h' }, '考察メモ'), ta,
        el('div', { class: 'row' },
          el('button', { onclick: shareProgress }, '進み具合を共有'),
          el('button', { class: 'danger', onclick: resetAll }, '記録を消す')));
    }
  }

  async function shareProgress() {
    const titles = SC.truths.filter(t => S.save.truths[t.id]).map(t => t.title);
    const text = `『${SC.title}』${S.save.loops || 0}周 / 場面 ${seenCount()}/${sceneFragments()} / 手がかり ${titles.length}/${SC.truths.length}` +
      (titles.length ? `（${titles.join('・')}）` : '') + '\n#最後の一時間';
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast('クリップボードにコピーしました'); }
    } catch { toast(text); }
  }

  function resetAll() {
    if (!confirm('記録帳と周回数をすべて消します。よろしいですか？')) return;
    store.remove(KEY);
    S.save = { loops: 0, seen: {}, witnessed: {}, truths: {}, notes: '' };
    for (const c of SC.characters) S.save.witnessed[c.id] = {};
    Object.assign(S, { t: 0, room: SC.startRoom, follow: null, ended: false, running: false, lastMin: -1, loopNew: [], loopTruths: [], loopRumor: null });
    $('book').hidden = true;
    render(true);
    showTitleCard();
  }

  // ---------- トースト ----------
  function toast(msg, kind = '') {
    const t = el('div', { class: `toast ${kind}` }, msg);
    $('toasts').append(t);
    const [a, b] = kind === 'truth' ? [4200, 4800] : kind === 'move' ? [1600, 2200] : [2600, 3200];
    setTimeout(() => t.classList.add('out'), a);
    setTimeout(() => t.remove(), b);
  }

  // ---------- 入力 ----------
  function bindUI() {
    $('playBtn').addEventListener('click', () => (S.running ? pause() : start()));
    $('speedBtn').addEventListener('click', () => {
      S.speed = SPEEDS[(SPEEDS.indexOf(S.speed) + 1) % SPEEDS.length];
      render(true);
    });
    $('bookBtn').addEventListener('click', () => openBook());
    $('bookClose').addEventListener('click', closeBook);
    $('book').addEventListener('click', e => { if (e.target.id === 'book') closeBook(); });
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { bookTab = b.dataset.tab; renderBook(); }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('book').hidden) closeBook();
      if (e.key === ' ' && e.target === document.body) { e.preventDefault(); S.running ? pause() : start(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && S.running) pause(); });
  }

  // 自動テスト・デバッグ用の窓口
  window.IH = {
    get state() { return { t: S.t, room: S.room, follow: S.follow, running: S.running, ended: S.ended, loops: S.save.loops, seen: Object.keys(S.save.seen), truths: Object.keys(S.save.truths), rumor: S.loopRumor, loopTruths: S.loopTruths.slice() }; },
    move: moveTo, follow: setFollow, start, pause, newLoop, openBook, closeBook
  };

  boot().catch(err => {
    document.body.append(el('p', { class: 'fatal' }, '脚本を読み込めませんでした。HTTP サーバー経由で開いてください。', el('br'), String(err)));
  });
})();
