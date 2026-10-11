// ナナシ県クライアント: 接続先（サーバー or この端末）から状態を受け、町と CP を描く。スマホ対応。
// 描き方は2つ: 3D（view3d.js、WebGL）と地図（map2d.js、Canvas 2D）。WebGL が使えない端末では自動で地図にする。
import { setupAdmin } from './admin.js';
import { createBackend } from './backend.js';
import { createMap2D } from './map2d.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても動く */ } },
};

const be = await createBackend();
const init = be.init;
const MOBILE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
document.body.classList.toggle('mobile', MOBILE);
document.body.dataset.mode = be.mode;
const DEPTS = Object.fromEntries(init.departments.map((d) => [d.id, d]));
let layout = init.layout;

// 困ったときに理由を画面に出す（スクリーンショットで原因がわかるように）
function showFatal(msg, err) {
  const box = document.getElementById('fatal');
  if (!box || !box.hidden) return;
  box.hidden = false;
  box.querySelector('p').textContent = msg + (err ? `（${String(err.message || err).slice(0, 160)}）` : '');
  box.querySelector('button').onclick = () => setViewPref('2d');
  box.querySelector('button').textContent = '地図の表示で開き直す';
}
addEventListener('error', (e) => showFatal('エラーが起きました', e.error || e.message));
addEventListener('unhandledrejection', (e) => showFatal('エラーが起きました', e.reason));

// ---- 表示の選択: 3D か地図か ----
const q = new URLSearchParams(location.search);
const viewPref = q.get('view') || store.get('nanashi.view') || 'auto'; // auto | 3d | 2d
function setViewPref(v) { store.set('nanashi.view', v); location.reload(); }
function webgl2Available() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}
let canvas = $('#view');
let view = null;
let viewNote = '';
if (viewPref !== '2d' && webgl2Available()) {
  try {
    const { createView3D } = await import('./view3d.js');
    view = createView3D({ canvas, init, layout, mobile: MOBILE, lite: store.get('nanashi.lite') === 1 || q.has('lite') });
    view.onLost(() => showFatal('3D の表示が止まりました（端末のメモリ不足など）'));
  } catch (err) {
    viewNote = `3D が使えないため地図で表示しています（${String(err.message || err).slice(0, 80)}）`;
    // 一度 WebGL を試した canvas は 2D に使えないので、作り直す
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
  }
} else if (viewPref !== '2d') viewNote = 'この端末では 3D が使えないため、地図で表示しています';
if (!view) view = createMap2D({ canvas, init, layout, mobile: MOBILE });
document.body.dataset.view = view.mode;

function setCam(name) { view.setCam(name, name === 'avatar' ? myAvatar() : null); }
setCam('all');
$('#cams').addEventListener('click', (e) => e.target.dataset.cam && setCam(e.target.dataset.cam));
const admin = setupAdmin({ view, canvas, be, getLayout: () => layout, toast });

// ---- 人（CP） ----
const ROLE_COLOR = { resident: ['#e8a33a', '#6a9ac8', '#c86a5a', '#7aa86a', '#efe6d0', '#8a7ab8'], worker: ['#3a6aa0', '#4a7a6a'], student: ['#f2c94a', '#ffffff'] };
const SKIN = ['#f3d2b4', '#e8c09c', '#f7dcc4'];
const HAIR = ['#2b2420', '#3d2f26', '#5a4636', '#9a9a9a', '#1f1b18'];
const cps = new Map(); // id -> { idx, info, x, z, tx, tz, state, color, skin, hair }
const order = [];
function addRoster(list) {
  const added = [];
  for (const info of list) {
    if (cps.has(info.id)) continue;
    const palette = ROLE_COLOR[info.role] || ['#888888'];
    const c = {
      idx: order.length, info, x: 0, z: 0, tx: 0, tz: 0, state: 1, fresh: true,
      color: info.role === 'human' ? info.color || '#e8b730' : info.dept ? DEPTS[info.dept].color : palette[info.id % palette.length],
      skin: SKIN[info.id % 3], hair: info.age > 64 ? '#d8d4cc' : HAIR[info.id % HAIR.length],
    };
    order.push(info.id);
    cps.set(info.id, c);
    added.push(c);
  }
  view.addPeople(added);
  for (const c of added) if (c.info.role === 'human') view.setTag(c, `★ ${c.info.name}`);
}
addRoster(init.roster);

function applyFrame(f) {
  const p = f.p;
  const seen = new Set();
  for (let i = 0; i < p.length; i += 4) seen.add(p[i]);
  for (const c of cps.values()) if (!seen.has(c.info.id)) { c.state = 6; c.fresh = true; } // 県外にいる人は描かない
  for (let i = 0; i < p.length; i += 4) {
    const c = cps.get(p[i]);
    if (!c) continue;
    c.tx = p[i + 1]; c.tz = p[i + 2]; c.state = p[i + 3];
    if (c.fresh) { c.x = c.tx; c.z = c.tz; c.fresh = false; }
  }
}

let t0 = performance.now();
function updateCps(dt) {
  const k = Math.min(1, dt * 3);
  for (const c of cps.values()) {
    c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k;
    c.moving = Math.abs(c.tx - c.x) + Math.abs(c.tz - c.z) > 0.05;
  }
}

// ---- 県庁 業務ボードと「作業中」表示（3D と連動） ----
let tasks = init.tasks;
function renderTasks() {
  const active = tasks.filter((t) => t.status !== 'done');
  $('#tasks').innerHTML = active.length
    ? active.map((t) => `<li><b>${esc(t.deptName)}</b> ${esc(t.title)}<br><span class="muted">${esc(t.assigneeName || '担当者を探しています')}・${{ queued: '受付', walking: '移動中', working: '作業中' }[t.status]}</span><div class="bar"><i style="width:${Math.round(t.progress * 100)}%"></i></div></li>`).join('')
    : '<li class="muted">なし</li>';
  const busy = new Set(active.filter((t) => t.status === 'working').map((t) => t.dept));
  $('#depts').innerHTML = init.departments.map((d) => {
    const staff = order.filter((id) => cps.get(id).info.dept === d.id);
    const atDesk = staff.filter((id) => [2, 3].includes(cps.get(id).state) && Math.abs(cps.get(id).tz + 20) < 16).length;
    return `<li class="${busy.has(d.id) ? 'busy' : ''}"><span class="dot" style="background:${d.color}"></span>${esc(d.name)}${d.skills.length ? ' <span class="muted">◆</span>' : ''}<span class="n">在席 ${atDesk}/${staff.length}</span></li>`;
  }).join('');
  view.setBusyDepts(busy);
  // CP の頭上に作業バッジ
  const want = new Map(active.filter((t) => t.assignee && t.status !== 'queued').map((t) => [t.assignee, t]));
  for (const c of cps.values()) {
    const t = want.get(c.info.id);
    const text = t ? `${t.status === 'working' ? '作業中' : '移動中'}：${t.title} ${t.status === 'working' ? Math.round(t.progress * 100) + '%' : ''}` : null;
    if (c.badgeText === text) continue;
    c.badgeText = text;
    view.setBadge(c, text, t?.status === 'working');
  }
}
renderTasks();

// ---- ログ・SNS・新聞 ----
function addLog(e) {
  const li = document.createElement('li');
  li.className = `i${e.importance}`;
  li.innerHTML = `<time>${esc(e.time)}</time>${esc(e.text)}`;
  if (e.cpId) li.onclick = () => showCp(e.cpId, true);
  $('#log').prepend(li);
  while ($('#log').children.length > 150) $('#log').lastChild.remove();
}
init.logs.forEach(addLog);

function addSns(p) {
  const li = document.createElement('li');
  li.innerHTML = `<span class="via">${esc(p.via)}</span><div class="who">${esc(p.author)}</div><time>${esc(p.time)}</time><div>${esc(p.text)}</div>${p.photo ? `<img data-photo="${esc(p.photo)}" src="${esc(be.photoUrl(p.photo))}" alt="広報課撮影" onerror="this.remove()">` : ''}`;
  $('#sns').prepend(li);
}
init.sns.forEach(addSns);

function md(src) {
  // 最小限の Markdown（見出し・箇条書き・引用・強調）。先にエスケープする。
  return esc(src).split('\n').map((l) => {
    if (l.startsWith('# ')) return `<h1>${l.slice(2)}</h1>`;
    if (l.startsWith('## ')) return `<h2>${l.slice(3)}</h2>`;
    if (l.startsWith('- ')) return `<li>${l.slice(2)}</li>`;
    if (l.startsWith('&gt; ')) return `<blockquote>${l.slice(5)}</blockquote>`;
    return l ? `<p>${l}</p>` : '';
  }).join('').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<em>$1</em>');
}
if (init.news) $('#news').innerHTML = md(init.news.markdown);

let activeTab = 'log';
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button, #side section').forEach((x) => x.classList.remove('on'));
  b.classList.add('on');
  activeTab = b.dataset.tab;
  if (activeTab === 'daicho') renderDaicho();
  $(`#side section[data-pane="${b.dataset.tab}"]`).classList.add('on');
}));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 3500);
}

// ---- CP 情報カード ----
async function showCp(id, fly = false) {
  const d = await be.cp(id);
  if (!d) return;
  $('#card').hidden = false;
  $('#card').innerHTML = `<b>${esc(d.name)}</b>（${d.age}歳）<span class="muted"> ${esc(d.roleLabel)}</span>`
    + `<br>${d.household ? `${esc(d.household)}・` : ''}${esc(d.address)}`
    + (d.workLabel ? `<br>勤め先・学校: ${esc(d.workLabel)}` : '')
    + `<br><span class="muted">きょうの予定: ${esc(d.today)}</span>`
    + `<br>いま: ${esc(d.place)} ／ ${esc(d.activity)}${d.skills?.length ? `<br><span class="muted">スキル: ${esc(d.skills.join(', '))}</span>` : ''}`;
  const c = cps.get(id);
  if (fly && c) view.flyTo(c.x, c.z);
}

// ---- 断面キャプチャ（広報課の写真撮影） ----
function takePhoto(req) {
  const shot = view.photo(req);
  const W = 640, H = 480;
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const g = out.getContext('2d');
  g.filter = 'sepia(.35) saturate(.85) contrast(1.05)';
  g.drawImage(shot, 0, 0, W, H);
  g.filter = 'none';
  // フィルムカメラ風の日付写し込み
  g.font = 'bold 22px monospace'; g.fillStyle = '#ff9a2a';
  g.fillText(`'${String(lastClock?.day ?? 1).padStart(2, '0')} ${lastClock?.time ?? ''}`, W - 170, H - 22);
  be.photo(req.photoId, out.toDataURL('image/jpeg', 0.75));
}

// ---- 住民課窓口 ----
const renderWorkSel = () => ($('#workSel').innerHTML = layout.places.filter((p) => !['kencho', 'office', 'park', 'tanbo'].includes(p.kind)).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join(''));
renderWorkSel();
$('#formResident').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  await be.residents(f);
  toast('転入届を住民課に提出しました。職員が手続きします');
  e.target.reset();
});
let avatar = store.get('nanashi.avatar'); // { token, cpId? }
function myAvatar() { return avatar?.cpId ? cps.get(avatar.cpId) : null; }
function renderAvatar() {
  const st = $('#avatarStatus');
  if (!avatar) { st.textContent = ''; return; }
  if (!avatar.cpId) { st.textContent = '住民課で手続き中です…'; return; }
  st.textContent = `登録済み: ${cps.get(avatar.cpId)?.info.name || ''}（ナナシ駅に到着）`;
  $('#walkWrap').hidden = false; $('#camAvatar').hidden = false;
}
renderAvatar();
$('#formAvatar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const r = await be.avatars(f);
  if (r.error) return toast(r.error);
  avatar = { token: r.token, taskId: r.task.id };
  store.set('nanashi.avatar', avatar);
  renderAvatar();
  toast('アバター登録を申し込みました。住民課の職員が受け付けます');
});

// ---- タップ（CP 選択・アバター移動） ----
let downAt = null;
canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
canvas.addEventListener('pointerup', (e) => {
  if (admin.active) return;
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > (e.pointerType === 'touch' ? 12 : 5)) return; // ドラッグは無視（指は少し甘く）
  if ($('#walkMode').checked && myAvatar()) {
    const p = view.groundAt(e);
    if (p) be.goto(avatar.cpId, { token: avatar.token, x: p.x, z: p.z });
    return;
  }
  const c = view.pickCp(e);
  if (c) showCp(c.info.id); else $('#card').hidden = true;
});

// ---- 住民台帳（世帯・住まい・勤め先で一人ずつ） ----
let daicho = null;
async function renderDaicho() {
  daicho = await be.registry();
  const s = daicho.summary;
  $('#daichoSummary').innerHTML = `住民 <b>${s.residents}</b>人・<b>${s.households}</b>世帯（空き部屋 ${s.vacancies}）<br>`
    + `働く人 ${s.workers}人のうち県外へ通う人 <b>${s.commuters}</b>人／県外から通ってくる人 ${s.incommuters}人／来訪者 ${s.visitors}人<br>`
    + `いま県外にいる住民 <b>${s.awayNow}</b>人（${Math.round((100 * s.awayNow) / Math.max(1, s.residents))}%）`;
  drawDaicho();
}
function drawDaicho() {
  if (!daicho) return;
  const q = $('#daichoSearch').value.trim();
  const list = daicho.households.filter((hh) => !q || hh.address.includes(q) || hh.surname.includes(q) || hh.members.some((m) => m.name.includes(q) || m.work.includes(q)));
  $('#daicho').innerHTML = list.slice(0, 200).map((hh) => `<li><b>${esc(hh.surname)}家</b><span class="addr">${esc(hh.address)}${hh.houseType ? `・${esc(hh.houseType)}` : ''}</span>`
    + hh.members.map((m) => `<span class="m${m.away ? ' away' : ''}" data-id="${m.id}">${esc(m.name)}（${m.age}）${esc(m.role)}${m.work ? `・${esc(m.work)}` : ''}${m.away ? ' — 県外' : ''}</span>`).join('') + '</li>').join('')
    || '<li class="muted">見つかりません</li>';
}
$('#daichoSearch').addEventListener('input', drawDaicho);
$('#daicho').addEventListener('click', (e) => { const id = Number(e.target.closest('.m')?.dataset.id); if (id) showCp(id, true); });
setInterval(() => activeTab === 'daicho' && renderDaicho(), 20000);

// ---- サーバーとの接続 ----
let lastClock = init.clock;
// 電車をなめらかに走らせるための「いまのゲーム内の分」（時計の更新のあいだを補う）
let clockSample = { at: performance.now(), m: init.clock.minutes, rate: 1 };
let nightLevel = 0;
const gameMinuteNow = () => clockSample.m + Math.min(2, ((performance.now() - clockSample.at) / 1000) * clockSample.rate);
// 見本づくり用: ?hour=21 で空と灯りだけその時刻にする
const PREVIEW_HOUR = new URLSearchParams(location.search).has('hour') ? Number(new URLSearchParams(location.search).get('hour')) : null;
function renderClock(c) {
  clockSample = { at: performance.now(), m: c.minutes, rate: lastClock && c.minutes > lastClock.minutes ? (c.minutes - lastClock.minutes) / Math.max(0.05, (performance.now() - (clockSample?.at || performance.now())) / 1000) : clockSample?.rate || 1 };
  lastClock = c;
  $('#clock').textContent = `${c.date} ${c.time}`;
  if (c.llm) $('#llm').textContent = `LLM: ${c.llm.mode}｜本日 ${c.llm.tokens}/${c.llm.budget} tok（${c.llm.calls}回）`;
  // 時刻で空の色と日差しを変える
  const h = PREVIEW_HOUR ?? (c.minutes % 1440) / 60;
  // 昼はしっかり明るく、夜も真っ暗にしない（群青の夜に窓と街灯が灯る）
  const day = Math.min(1, Math.max(0, Math.sin(((h - 5.5) / 13) * Math.PI) * 1.6));
  nightLevel = 1 - day;
  $('#pop').textContent = `住民 ${c.population}人（いま町に ${c.inTown}人）`;
  const dusk = Math.max(0, 1 - Math.abs(h - 17.6) / 1.4);
  view.setDaylight(day, dusk, h);
}
renderClock(init.clock);

be.on('frame', (e) => applyFrame(e));
be.on('clock', (e) => { const c = e; renderClock(c); if (c.tasks) { tasks = c.tasks; renderTasks(); } });
be.on('log', (e) => addLog(e));
be.on('sns', (e) => { const p = e; addSns(p); toast(`ナナシッター: ${p.author} が投稿しました`); });
be.on('news', (e) => { $('#news').innerHTML = md(e.markdown); toast('ナナシ県民新聞が発行されました'); });
be.on('roster', (e) => addRoster(e));
be.on('roster_remove', (e) => { const c = cps.get(e.id); if (c) { c.gone = true; view.setBadge(c, null); } });
be.on('layout', (l) => { layout = l; view.rebuild(l); renderWorkSel(); admin.layoutChanged(); if (activeTab === 'daicho') renderDaicho(); });
be.on('photo_request', (e) => takePhoto(e));
be.on('photo', (e) => {
  const { photoId, url } = e;
  document.querySelectorAll(`#sns img[data-photo="${photoId}"]`).forEach((img) => (img.src = be.mode === 'server' ? url + '?t=' + Date.now() : url));
  toast(`広報課が写真を撮りました（${photoId}）`);
});
be.on('registered', (e) => {
  const r = e;
  if (avatar && r.human && r.token === avatar.token) {
    avatar.cpId = r.cpId; store.set('nanashi.avatar', avatar);
    setTimeout(renderAvatar, 600);
    toast('アバター登録が完了しました。ナナシ駅に到着しています');
  }
});

// ---- ループ ----
let failed = 0;
function loop() {
  const now = performance.now();
  const dt = Math.min(0.5, (now - t0) / 1000); t0 = now;
  try {
    updateCps(dt);
    view.draw(dt, gameMinuteNow() % 1440);
    failed = 0;
  } catch (err) {
    if (++failed === 3) showFatal('描画でエラーが起きました', err);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// ---- スマホ: 下のタブで「町だけ」と各シートを切り替える ----
function openSheet(name) {
  document.body.dataset.sheet = name;
  document.querySelectorAll('#mtabs button').forEach((b) => b.classList.toggle('on', b.dataset.sheet === name));
  if (name && name !== 'kencho') document.querySelector(`.tabs button[data-tab="${name}"]`)?.click();
  $('#card').hidden = true;
}
$('#mtabs').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) openSheet(document.body.dataset.sheet === b.dataset.sheet ? '' : b.dataset.sheet);
});
openSheet('');

if (be.mode === 'local') {
  $('#localBox').hidden = false;
  let armed = false;
  $('#resetLocal').addEventListener('click', () => {
    if (armed) return be.reset();
    armed = true;
    $('#resetLocal').textContent = 'もう一度押すと、はじめからになります';
    setTimeout(() => { armed = false; $('#resetLocal').textContent = '町をはじめからにする'; }, 4000);
  });
}
$('#loading').remove();
// 表示の切り替え（3D ⇔ 地図）
$('#viewNow').textContent = view.mode === '3d' ? 'いまは 3D で表示しています' : viewNote || 'いまは地図で表示しています';
$('#liteBtn').textContent = view.mode === '3d' ? '地図の表示に切り替える' : '3D の表示を試す';
$('#liteBtn').addEventListener('click', () => setViewPref(view.mode === '3d' ? '2d' : '3d'));
if (viewNote) toast(viewNote);

// ホーム画面に追加したときのオフライン用（https か localhost のときだけ）
if ('serviceWorker' in navigator && isSecureContext && !window.NANASHI_STANDALONE) navigator.serviceWorker.register('./sw.js').catch(() => {});

window.__nanashi = { cps, setCam, openSheet, mode: be.mode, view: view.mode, debug: view.debug }; // デバッグ用
