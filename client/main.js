// ナナシ県クライアント: 接続先（サーバー or この端末）から状態を受け、町と CP を描く。スマホ対応。
// 描き方は2つ: 3D（view3d.js、WebGL）と地図（map2d.js、Canvas 2D）。WebGL が使えない端末では自動で地図にする。
import { setupAdmin } from './admin.js';
import { createBackend } from './backend.js';
import { createMap2D } from './map2d.js';
import { createInterior } from './interior.js';
import { createFirstPerson } from './firstperson.js';
import { gameFor, openMinigame } from './minigames.js';
import { drawPortrait, portraitUrl } from './portrait.js';
import { BODY_SHAPE, randomLook } from './shared/looks.js';

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
const interior = createInterior($('#insideView'));
let insideOpen = null; // 開いている建物の中 { kind: 'place'|'house', id, d }
const fpv = createFirstPerson({ canvas: $('#fpView'), seed: init.seed });
fpv.setLayout(layout);

// 見え方は2つ: 全景（つまんで拡大・建物をタップで中の全景）と、人の目線
function setCam(name) { closeOverlays(); view.setCam(name, null); }
setCam('all');
$('#cams').addEventListener('click', (e) => e.target.dataset.cam && setCam(e.target.dataset.cam));
$('#camAvatar').addEventListener('click', () => myAvatar() && openFirstPerson(myAvatar().info.id));
const admin = setupAdmin({ view, canvas, be, getLayout: () => layout, toast });

// ---- 人（CP）。見た目は住民台帳の部品の組み合わせ（server/looks.js） ----
const cps = new Map(); // id -> { idx, info, look, x, z, tx, tz, state, color, skin, hair, bw, bh }
const order = [];
function addRoster(list) {
  const added = [];
  for (const info of list) {
    if (cps.has(info.id)) continue;
    const look = info.look || {};
    const [bw, bh] = BODY_SHAPE[look.body] || [1, 1];
    const c = {
      idx: order.length, info, look, x: 0, z: 0, tx: 0, tz: 0, state: 1, fresh: true, bw, bh,
      color: info.role === 'human' && !info.look ? info.color || '#e8b730' : look.top || '#3a6aa0',
      skin: look.skin || '#f3d2b4', hair: look.hair === 'bald' ? look.skin || '#f3d2b4' : look.hairColor || '#1f1b18',
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
    if (c.moving) c.heading = Math.atan2(c.tz - c.z, c.tx - c.x); // 歩いている向き（止まるとその向きのまま）
    else if (c.heading == null) c.heading = (c.info.id * 2.399) % (Math.PI * 2); // 最初は人ごとにばらばら
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
  interior.setBusy(new Map([...[...busy].map((d) => [d, true]), ...active.filter((t) => t.assignee).map((t) => [`task${t.id}`, `${t.status === 'working' ? '作業中' : '移動中'}：${t.title}`])]));
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
  li.innerHTML = `<span class="via">${esc(p.via)}</span><div class="who">${esc(p.author)}${p.handle ? ` <span class="muted">${esc(p.handle)}</span>` : ''}</div><time>${esc(p.time)}</time><div>${esc(p.text)}</div>${p.photo ? `<img data-photo="${esc(p.photo)}" src="${esc(be.photoUrl(p.photo))}" alt="広報課撮影" onerror="this.remove()">` : ''}`;
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
function openTab(name) {
  if (MOBILE) openSheet(name); else document.querySelector(`.tabs button[data-tab="${name}"]`)?.click();
}
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

// ---- 詳細カード（人・店・家をタップしたとき） ----
const face = (look, size = 56) => `<img class="face" src="${portraitUrl(look, size * 2)}" width="${size}" height="${size}" alt="">`;
const faces = (list) => `<div class="faces">${list.map((p) => `<img src="${portraitUrl(p.look, 64)}" data-cp="${p.id}" title="${esc(p.name)}（${esc(p.activity || '')}）" alt="${esc(p.name)}">`).join('')}</div>`;
function openCard(html) {
  $('#card').hidden = false;
  $('#card').innerHTML = `<button type="button" class="x" data-act="close" aria-label="閉じる">×</button>${html}`;
}
$('#card').addEventListener('click', (e) => {
  const cpId = Number(e.target.dataset.cp);
  if (cpId) return showCp(cpId);
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const { act, id } = b.dataset;
  if (act === 'close') $('#card').hidden = true;
  if (act === 'fp') openFirstPerson(Number(id));
  if (act === 'daicho') { openTab('daicho'); $('#daichoSearch').value = b.dataset.q || ''; renderDaicho(); }
  if (act === 'inside') openInside(b.dataset.kind, id);
  if (act === 'place') showPlace(id);
  if (act === 'house') showHouse(id);
  if (act === 'use') useShop(id);
});

async function showCp(id, fly = false) {
  const d = await be.cp(id);
  if (!d) return;
  const insideId = d.placeId && !d.walking ? (d.placeId === 'home' ? d.homeId : d.placeId) : null;
  const insideKind = d.placeId === 'home' ? 'house' : 'place';
  openCard(`<div class="who">${face(d.look)}<div><b>${esc(d.name)}</b>（${d.age}歳）<span class="muted"> ${esc(d.roleLabel)}</span>`
    + `<br><span class="muted">${esc(d.lookText)}</span></div></div>`
    + `${d.household ? `${esc(d.household)}・` : ''}${esc(d.address)}`
    + (d.workLabel ? `<br>勤め先・学校: ${esc(d.workLabel)}` : '')
    + `<br><span class="muted">きょうの予定: ${esc(d.today)}</span>`
    + `<br>いま: ${esc(d.place)} ／ ${esc(d.activity)}${d.skills?.length ? `<br><span class="muted">スキル: ${esc(d.skills.join(', '))}</span>` : ''}`
    + `<div class="acts">${d.state !== 6 ? `<button type="button" data-act="fp" data-id="${d.id}">目線で見る</button>` : ''}`
    + (insideId ? `<button type="button" data-act="inside" data-kind="${insideKind}" data-id="${esc(insideId)}">いる建物の中を見る</button>` : '')
    + (d.homeId ? `<button type="button" data-act="house" data-id="${esc(d.homeId)}">住まい</button>` : '')
    + `<button type="button" data-act="daicho" data-q="${esc(d.name)}">台帳で見る</button></div>`);
  const c = cps.get(id);
  if (fly && c && c.state !== 6) view.flyTo(c.x, c.z);
}

async function showPlace(id) {
  const d = await be.place(id);
  if (!d) return;
  const game = gameFor(d.kind);
  openCard(`<b>${esc(d.name)}</b> <span class="muted">${esc(d.kindLabel)}・${esc(d.address)}</span>`
    + `<br>営業 ${esc(d.hours)} <span class="tag ${d.open ? 'open' : 'closed'}">${d.open ? '営業中' : '営業時間外'}</span>`
    + `<br>いま中に <b>${d.hereCount}</b>人${d.coming ? `（向かっている人 ${d.coming}人）` : ''}・きょうのお客 ${d.visitsToday}人`
    + (d.here.length ? faces(d.here.slice(0, 16)) : '')
    + (d.staffCount ? `<br><span class="muted">働く人 ${d.staffCount}人: ${d.staff.slice(0, 4).map((p) => esc(p.name)).join('、')}${d.staffCount > 4 ? ' ほか' : ''}</span>` : '')
    + (d.recent.length ? `<ul class="ev">${d.recent.slice(0, 3).map((e) => `<li>${esc(e.time)} ${esc(e.text)}</li>`).join('')}</ul>` : '')
    + `<div class="acts"><button type="button" data-act="inside" data-kind="place" data-id="${esc(d.id)}">中を見る</button>`
    + (game ? `<button type="button" class="primary" data-act="use" data-id="${esc(d.id)}">利用する（${esc(game.title)}）</button>` : '') + '</div>');
}

async function showHouse(id) {
  const d = await be.house(id);
  if (!d) return;
  const people = d.households.flatMap((hh) => hh.members);
  openCard(`<b>${esc(d.typeLabel)}</b> <span class="muted">${esc(d.address)}</span>`
    + (d.households.length ? d.households.map((hh) => `<br>${hh.unit ? `${esc(hh.unit)} ` : ''}<b>${esc(hh.surname)}家</b> ${hh.members.map((m) => `${esc(m.name.split(' ')[1] || m.name)}（${m.age}）— ${esc(m.where)}`).join('、')}`).join('') : '<br>空き家')
    + (d.units > 1 ? `<br><span class="muted">${d.units}部屋（空き ${d.vacant}）</span>` : '')
    + (people.length ? faces(people) : '')
    + `<div class="acts"><button type="button" data-act="inside" data-kind="house" data-id="${esc(d.id)}">中を見る</button></div>`);
}

// ---- 建物の中の全景 ----
async function openInside(kind, id) {
  $('#card').hidden = true;
  closeFp();
  insideOpen = { kind, id };
  $('#inside').hidden = false;
  await refreshInside();
}
async function refreshInside() {
  if (!insideOpen) return;
  const { kind, id } = insideOpen;
  const d = kind === 'house' ? await be.house(id) : await be.place(id);
  if (!d || !insideOpen || insideOpen.id !== id) return;
  insideOpen.d = d;
  if (kind === 'house') {
    const home = d.households.flatMap((hh) => hh.members).filter((m) => m.where === '家にいる');
    interior.show({ people: home }, 'house');
    $('#insideTitle').textContent = d.households.length ? `${d.households.map((hh) => hh.surname + '家').join('・')}` : '空き家';
    $('#insideSub').textContent = `${d.address}・いま家に ${home.length}人`;
    $('#insideUse').hidden = true;
  } else {
    interior.show({ people: d.here, open: d.open }, d.kind === 'kencho' ? 'office' : d.kind);
    $('#insideTitle').textContent = d.name;
    $('#insideSub').textContent = `${d.open ? '営業中' : '営業時間外'}・いま ${d.hereCount}人・きょうのお客 ${d.visitsToday}人`;
    $('#insideUse').hidden = !gameFor(d.kind);
    $('#insideUse').textContent = gameFor(d.kind) && !MOBILE ? `利用する（${gameFor(d.kind).title}）` : '利用する';
  }
}
setInterval(refreshInside, 3000);
$('#insideClose').addEventListener('click', () => closeOverlays());
$('#insideUse').addEventListener('click', () => insideOpen?.d && useShop(insideOpen.d.id));
$('#insideView').addEventListener('click', (e) => { const id = interior.pick(e); if (id) showCp(id); });
$('#officeInside').addEventListener('click', () => { openSheet(''); openInside('place', 'office'); });

// ---- 人の目線 ----
function openFirstPerson(id) {
  const c = cps.get(id);
  if (!c || c.state === 6 || c.gone) return toast('いまは県外にいるので、目線では見られません');
  $('#card').hidden = true;
  closeInside();
  fpv.setPeople([...cps.values()]);
  fpv.follow(c);
  $('#fp').hidden = false;
  $('#fpFace').src = portraitUrl(c.look, 72);
  $('#fpTitle').textContent = `${c.info.name}の目線`;
  $('#fpSub').textContent = '';
}
let fpDownAt = null;
$('#fpView').addEventListener('pointerdown', (e) => (fpDownAt = [e.clientX, e.clientY]));
$('#fpView').addEventListener('pointerup', (e) => {
  if (!fpDownAt || Math.hypot(e.clientX - fpDownAt[0], e.clientY - fpDownAt[1]) > 10) return;
  const id = fpv.pick(e);
  if (id) showCp(id);
});
$('#fpClose').addEventListener('click', () => closeOverlays());
function closeFp() { $('#fp').hidden = true; fpv.follow(null); }
function closeInside() { $('#inside').hidden = true; insideOpen = null; }
function closeOverlays() { closeFp(); closeInside(); }

// ---- 店を利用する（ミニゲーム） ----
async function useShop(id) {
  const d = insideOpen?.d?.id === id ? insideOpen.d : await be.place(id);
  if (!d) return;
  const me = myAvatar()?.info.name || '';
  openMinigame($('#mg'), { place: d, player: me }, async (r) => {
    const game = gameFor(d.kind);
    const text = r.score != null || r.text !== game.verb ? `「${game.title}」で遊んだ` : game.verb;
    await be.useShop(d.id, { player: me, text, score: r.score });
    toast(`${d.name}を利用しました${r.score != null ? `（${r.score}点）` : ''}`);
    refreshInside();
  });
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
// アバターの見た目（顔・髪・体型・服…を部品から選ぶ）
const PART_LABEL = { face: '顔の形', eyes: '目', brows: 'まゆ', mouth: '口', hair: '髪型', hairColor: '髪の色', skin: '肌', body: '体型', top: '上着', bottom: 'ズボン・スカート', extra: '小物' };
let myLook = randomLook(Math.random, { sex: 'f', age: 30 });
function renderLookParts() {
  $('#lookParts').innerHTML = Object.entries(init.lookParts || {}).map(([k, list]) => `<label>${PART_LABEL[k] || k}<select data-part="${k}">${list.map(([id, name]) => `<option value="${esc(id)}"${myLook[k] === id ? ' selected' : ''}>${esc(name)}</option>`).join('')}</select></label>`).join('');
  $('#lookPreview').src = portraitUrl(myLook, 192);
}
renderLookParts();
$('#lookParts').addEventListener('change', (e) => { const k = e.target.dataset.part; if (k) { myLook[k] = e.target.value; $('#lookPreview').src = portraitUrl(myLook, 192); } });
$('#lookRandom').addEventListener('click', () => { myLook = randomLook(Math.random, { sex: Math.random() < 0.5 ? 'm' : 'f', age: 20 + Math.random() * 50 }); renderLookParts(); });
$('#formAvatar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = { ...Object.fromEntries(new FormData(e.target)), look: myLook, color: myLook.top };
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
  if (c) return showCp(c.info.id);
  // 建物: 店・施設は詳細カード、家は住む世帯
  const bid = view.pickBuilding?.(e);
  if (bid && layout.places.some((p) => p.id === bid)) return showPlace(bid);
  if (bid && layout.houses.some((h) => h.id === bid)) return showHouse(bid);
  $('#card').hidden = true;
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
  const list = daicho.households.filter((hh) => !q || hh.address.includes(q) || hh.surname.includes(q) || hh.members.some((m) => m.name.includes(q) || m.work.includes(q) || m.lookText?.includes(q)));
  $('#daicho').innerHTML = list.slice(0, 200).map((hh) => `<li><b>${esc(hh.surname)}家</b><span class="addr">${esc(hh.address)}${hh.houseType ? `・${esc(hh.houseType)}` : ''}</span>`
    + hh.members.map((m) => `<span class="m${m.away ? ' away' : ''}" data-id="${m.id}"><img src="${portraitUrl(m.look, 48)}" alt="">${esc(m.name)}（${m.age}）${esc(m.role)}${m.work ? `・${esc(m.work)}` : ''}${m.away ? ' — 県外' : ''}<span class="look">${esc(m.lookText)}</span></span>`).join('') + '</li>').join('')
    || '<li class="muted">見つかりません</li>';
}
$('#daichoSearch').addEventListener('input', drawDaicho);
$('#daicho').addEventListener('click', (e) => { const id = Number(e.target.closest('.m')?.dataset.id); if (id) showCp(id, true); });
setInterval(() => activeTab === 'daicho' && renderDaicho(), 20000);

// ---- サーバーとの接続 ----
let lastClock = init.clock;
// 電車をなめらかに走らせるための「いまのゲーム内の分」（時計の更新のあいだを補う）
// 届いた時刻（小数の分）から進む速さを測り、画面の時刻は戻さずになめらかに進める。
// 以前は「分」の切り捨てで受け取っていたため、推定が行き過ぎては戻り、電車が行ったり来たりしていた
const clk = { shown: init.clock.exact ?? init.clock.minutes, target: init.clock.exact ?? init.clock.minutes, at: performance.now(), rate: 1 / 60, ref: null };
function clockSampleIn(m) {
  const now = performance.now();
  if (!clk.ref) clk.ref = { t: now, m };
  const span = (now - clk.ref.t) / 1000;
  if (span >= 2) {
    const r = (m - clk.ref.m) / span;
    if (r >= 0 && r < 200) clk.rate = clk.rate * 0.5 + r * 0.5;
    clk.ref = { t: now, m };
  }
  clk.target = m; clk.at = now;
}
function clockStep(dt) {
  const expected = clk.target + ((performance.now() - clk.at) / 1000) * clk.rate;
  const err = expected - clk.shown;
  if (Math.abs(err) > 5) { clk.shown = expected; return; } // 大きくずれたとき（開き直し・早回し）は合わせる
  clk.shown += Math.max(0, clk.rate * dt + err * Math.min(1, dt * 0.8)); // 決して戻らない
}
let nightLevel = 0;
const gameMinuteNow = () => clk.shown;
// 見本づくり用: ?hour=21 で空と灯りだけその時刻にする
const PREVIEW_HOUR = new URLSearchParams(location.search).has('hour') ? Number(new URLSearchParams(location.search).get('hour')) : null;
function renderClock(c) {
  clockSampleIn(c.exact ?? c.minutes);
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
be.on('roster', (e) => { addRoster(e); if (!$('#fp').hidden) fpv.setPeople([...cps.values()]); });
be.on('roster_remove', (e) => { const c = cps.get(e.id); if (c) { c.gone = true; view.setBadge(c, null); } });
be.on('layout', (l) => { layout = l; view.rebuild(l); fpv.setLayout(l); renderWorkSel(); admin.layoutChanged(); if (activeTab === 'daicho') renderDaicho(); });
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
    clockStep(dt);
    const minute = gameMinuteNow() % 1440;
    if (!$('#fp').hidden) { fpv.setNight(nightLevel); fpv.draw(dt, minute); }
    else if (!$('#inside').hidden) interior.draw(dt);
    else view.draw(dt, minute);
    failed = 0;
  } catch (err) {
    if (++failed === 3) showFatal('描画でエラーが起きました', err);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// ---- スマホ: 下のタブで「町だけ」と各シートを切り替える ----
function openSheet(name) {
  if (name) closeOverlays();
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

window.__nanashi = { minute: () => gameMinuteNow(), cps, setCam, openSheet, showCp, showPlace, showHouse, openInside, openFirstPerson, useShop, get layout() { return layout; }, mode: be.mode, view: view.mode, debug: view.debug }; // デバッグ用
