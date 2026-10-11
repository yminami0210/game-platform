// ナナシ県 3D クライアント: 接続先（サーバー or この端末）から状態を受け、町と CP を描く。スマホ対応。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTown, label, toon } from './town.js';
import { PLACES } from './shared/world.js';
import { createBackend } from './backend.js';

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

// ---- 描画の土台 ----
const canvas = $('#view');
// スマホは解像度と影を控えめにして、電池と発熱を抑える
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE || devicePixelRatio < 2 });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // 影はぼかさない（刷り物の段の陰）
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#eef6f4', 900, 3200); // 空はドーム（town.js）。霧は地平の色に合わせる
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 4000);
const controls = new OrbitControls(camera, canvas);
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 8; controls.maxDistance = 700;
const hemi = new THREE.HemisphereLight('#e6f4f8', '#a9c25a', 1.1);
const sun = new THREE.DirectionalLight('#fff6e0', 1.9);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, far: 900 });
scene.add(hemi, sun, sun.target);

const town = buildTown(scene, init.seed);

// ---- カメラ ----
const CAMS = {
  all: [[90, 150, 470], [0, 0, 30]], // 海の上から、町と山を見上げる（観光案内図の構図）
  office: [[30, 40, 18], [30, 0, -22]],
  officeTall: [[30, 70, 40], [30, 0, -16]], // 縦長画面用
  allTall: [[40, 170, 500], [10, 0, 60]],
  koho: [[0, 14, 0], [0, 0, 0]],
  shotengai: [[-4, 16, 136], [0, 3, 108]],
  station: [[70, 30, 250], [30, 0, 200]],
};
let follow = null;
function setCam(name) {
  follow = null;
  if (name === 'koho') {
    // 広報課の机まわりに寄る
    const d = town.office.desks.filter((x) => x.dept === 'koho');
    const cx = d.reduce((s, x) => s + x.x, 0) / d.length, cz = d.reduce((s, x) => s + x.z, 0) / d.length;
    CAMS.koho = [[cx + 8, 24, cz + 16], [cx + 2, 0, cz + 1]];
  }
  if (name === 'avatar') { follow = myAvatar(); return; }
  const [p, t] = CAMS[name];
  camera.position.set(...p); controls.target.set(...t); controls.update();
}
setCam(MOBILE ? 'allTall' : 'all');
$('#cams').addEventListener('click', (e) => e.target.dataset.cam && setCam(e.target.dataset.cam));

// ---- CP（インスタンス描画） ----
const MAX = 1200;
// 人は案内図の点景のような 2 頭身寄りの人形（頭を大きく、髪をのせる）
const bodyMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.42, 0.7, 3, 8), toon('#ffffff'), MAX);
const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.46, 12, 10), toon('#ffffff'), MAX);
const hairMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), toon('#ffffff'), MAX);
hairMesh.castShadow = false; hairMesh.frustumCulled = false; hairMesh.count = 0;
scene.add(hairMesh);
bodyMesh.castShadow = headMesh.castShadow = true;
bodyMesh.frustumCulled = headMesh.frustumCulled = false; // 位置が毎フレーム変わるので境界球カリングを使わない
bodyMesh.count = headMesh.count = 0;
scene.add(bodyMesh, headMesh);

const ROLE_COLOR = { resident: ['#e8a33a', '#6a9ac8', '#c86a5a', '#7aa86a', '#efe6d0', '#8a7ab8'], worker: ['#3a6aa0', '#4a7a6a'], student: ['#f2c94a', '#ffffff'] };
const SKIN = ['#f3d2b4', '#e8c09c', '#f7dcc4'];
const HAIR = ['#2b2420', '#3d2f26', '#5a4636', '#9a9a9a', '#1f1b18'];
const cps = new Map(); // id -> { idx, info, x, z, tx, tz, state }
const order = [];
function addRoster(list) {
  for (const info of list) {
    if (cps.has(info.id)) continue;
    const idx = order.length;
    order.push(info.id);
    const c = { idx, info, x: 0, z: 0, tx: 0, tz: 0, state: 1, fresh: true };
    cps.set(info.id, c);
    const palette = ROLE_COLOR[info.role] || ['#888888'];
    const color = info.role === 'human' ? info.color || '#e8b730' : info.dept ? DEPTS[info.dept].color : palette[info.id % palette.length];
    bodyMesh.setColorAt(idx, new THREE.Color(color));
    headMesh.setColorAt(idx, new THREE.Color(SKIN[info.id % 3]));
    hairMesh.setColorAt(idx, new THREE.Color(info.age > 64 ? '#d8d4cc' : HAIR[info.id % HAIR.length]));
    if (info.role === 'human') {
      c.tag = label(`★ ${info.name}`, { scale: 7 });
      scene.add(c.tag);
    }
  }
  bodyMesh.count = headMesh.count = hairMesh.count = order.length;
  bodyMesh.instanceColor.needsUpdate = headMesh.instanceColor.needsUpdate = hairMesh.instanceColor.needsUpdate = true;
  $('#pop').textContent = `人口 ${order.length}人`;
}
addRoster(init.roster);

function applyFrame(f) {
  const p = f.p;
  for (let i = 0; i < p.length; i += 4) {
    const c = cps.get(p[i]);
    if (!c) continue;
    c.tx = p[i + 1]; c.tz = p[i + 2]; c.state = p[i + 3];
    if (c.fresh) { c.x = c.tx; c.z = c.tz; c.fresh = false; }
  }
}

const tmp = new THREE.Object3D();
let t0 = performance.now();
function updateCps(dt) {
  const k = Math.min(1, dt * 3);
  const time = performance.now() / 1000;
  for (const c of cps.values()) {
    c.x += (c.tx - c.x) * k; c.z += (c.tz - c.z) * k;
    const moving = Math.abs(c.tx - c.x) + Math.abs(c.tz - c.z) > 0.05;
    const hidden = c.state === 4; // 就寝中は家の中
    const seated = c.state === 2 || c.state === 3;
    const bob = moving ? Math.abs(Math.sin(time * 9 + c.idx)) * 0.12 : 0;
    const s = hidden ? 0 : c.info.role === 'student' ? 0.75 : c.info.role === 'human' ? 1.15 : 1;
    const y = (seated ? 0.6 : 0.8) * s + bob;
    tmp.position.set(c.x, y, c.z); tmp.scale.set(s, seated ? s * 0.8 : s, s); tmp.updateMatrix();
    bodyMesh.setMatrixAt(c.idx, tmp.matrix);
    tmp.position.y = y + (seated ? 0.95 : 1.15) * s; tmp.updateMatrix();
    headMesh.setMatrixAt(c.idx, tmp.matrix);
    tmp.position.y += 0.08 * s; tmp.updateMatrix();
    hairMesh.setMatrixAt(c.idx, tmp.matrix);
    if (c.tag) c.tag.position.set(c.x, 3.6, c.z);
    if (c.badge) { c.badge.position.set(c.x, 3.2, c.z); c.badge.visible = !hidden; }
  }
  bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = hairMesh.instanceMatrix.needsUpdate = true;
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
  for (const [id, lamp] of Object.entries(town.office.lamps)) { lamp.visible = busy.has(id); lamp.material.color.set('#ffb43a'); };
  // CP の頭上に作業バッジ
  const want = new Map(active.filter((t) => t.assignee && t.status !== 'queued').map((t) => [t.assignee, t]));
  for (const c of cps.values()) {
    const t = want.get(c.info.id);
    const text = t ? `${t.status === 'working' ? '作業中' : '移動中'}：${t.title} ${t.status === 'working' ? Math.round(t.progress * 100) + '%' : ''}` : null;
    if (c.badgeText === text) continue;
    if (c.badge) { scene.remove(c.badge); c.badge.material.map.dispose(); c.badge.material.dispose(); c.badge = null; }
    c.badgeText = text;
    if (text) { c.badge = label(text, { scale: 9, bg: t.status === 'working' ? 'rgba(47,91,160,.96)' : 'rgba(251,250,244,.96)', fg: t.status === 'working' ? '#fff' : '#22324f' }); scene.add(c.badge); }
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

document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button, #side section').forEach((x) => x.classList.remove('on'));
  b.classList.add('on');
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
  const roleName = { staff: `${d.deptName} ${d.title || ''}`, worker: `${d.workName || ''} 勤務`, student: '児童', resident: '住民', human: '人間アバター' }[d.role];
  $('#card').hidden = false;
  $('#card').innerHTML = `<b>${esc(d.name)}</b>（${d.age}歳）<span class="muted"> ${esc(roleName)}</span><br>いま: ${esc(d.place)} ／ ${esc(d.activity)}${d.skills?.length ? `<br><span class="muted">スキル: ${esc(d.skills.join(', '))}</span>` : ''}`;
  const c = cps.get(id);
  if (fly && c) { controls.target.set(c.x, 0, c.z); camera.position.set(c.x + 12, 14, c.z + 16); controls.update(); }
}

// ---- 断面キャプチャ（広報課の写真撮影） ----
function takePhoto(req) {
  const cam = new THREE.PerspectiveCamera(45, 4 / 3, 0.5, 1000);
  cam.position.set(req.x + 22, Math.max(10, req.h + 8), req.z + 30);
  cam.lookAt(req.x, req.h / 2, req.z);
  const size = renderer.getSize(new THREE.Vector2());
  const W = 640, H = 480;
  renderer.setSize(W, H, false);
  const overlays = [...cps.values()].flatMap((c) => [c.tag, c.badge]).filter(Boolean);
  overlays.forEach((o) => (o.visible = false)); // 写真には札を写さない
  renderer.render(scene, cam);
  overlays.forEach((o) => (o.visible = true));
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const g = out.getContext('2d');
  g.filter = 'sepia(.35) saturate(.85) contrast(1.05)';
  g.drawImage(canvas, 0, 0, W, H);
  g.filter = 'none';
  // フィルムカメラ風の日付写し込み
  g.font = 'bold 22px monospace'; g.fillStyle = '#ff9a2a';
  g.fillText(`'${String(lastClock?.day ?? 1).padStart(2, '0')} ${lastClock?.time ?? ''}`, W - 170, H - 22);
  renderer.setSize(size.x, size.y, false);
  be.photo(req.photoId, out.toDataURL('image/jpeg', 0.75));
}

// ---- 住民課窓口 ----
$('#workSel').innerHTML = PLACES.filter((p) => !['kencho', 'office', 'park', 'tanbo'].includes(p.kind)).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
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

// ---- クリック（CP 選択・アバター移動） ----
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > (e.pointerType === 'touch' ? 12 : 5)) return; // ドラッグは無視（指は少し甘く）
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if ($('#walkMode').checked && myAvatar()) {
    const hit = ray.intersectObject(town.ground)[0];
    if (hit) be.goto(avatar.cpId, { token: avatar.token, x: hit.point.x, z: hit.point.z });
    return;
  }
  const hit = ray.intersectObject(bodyMesh)[0];
  if (hit) showCp(order[hit.instanceId]); else $('#card').hidden = true;
});

// ---- サーバーとの接続 ----
let lastClock = init.clock;
// 見本づくり用: ?hour=21 で空と灯りだけその時刻にする
const PREVIEW_HOUR = new URLSearchParams(location.search).has('hour') ? Number(new URLSearchParams(location.search).get('hour')) : null;
function renderClock(c) {
  lastClock = c;
  $('#clock').textContent = `${c.date} ${c.time}`;
  if (c.llm) $('#llm').textContent = `LLM: ${c.llm.mode}｜本日 ${c.llm.tokens}/${c.llm.budget} tok（${c.llm.calls}回）`;
  // 時刻で空の色と日差しを変える
  const h = PREVIEW_HOUR ?? (c.minutes % 1440) / 60;
  // 昼はしっかり明るく、夜も真っ暗にしない（群青の夜に窓と街灯が灯る）
  const day = Math.min(1, Math.max(0, Math.sin(((h - 5.5) / 13) * Math.PI) * 1.6));
  const dusk = Math.max(0, 1 - Math.abs(h - 17.6) / 1.4);
  scene.fog.color.copy(town.setDaylight(day, dusk));
  sun.intensity = 0.25 + day * 1.7; hemi.intensity = 0.55 + day * 0.6;
  sun.color.set(dusk > 0.2 ? '#ffd2a0' : '#fff6e0');
  hemi.color.set(day < 0.3 ? '#8aa0d8' : '#e6f4f8');
  hemi.groundColor.set(day < 0.3 ? '#2e3f66' : '#a9c25a');
  if (day < 0.3) sun.color.set('#a9bde8'); // 月明かり
  const a = ((h - 6) / 12) * Math.PI;
  sun.position.set(Math.cos(a) * 300, Math.max(30, Math.sin(a) * 300), 120);
}
renderClock(init.clock);

be.on('frame', (e) => applyFrame(e));
be.on('clock', (e) => { const c = e; renderClock(c); if (c.tasks) { tasks = c.tasks; renderTasks(); } });
be.on('log', (e) => addLog(e));
be.on('sns', (e) => { const p = e; addSns(p); toast(`ナナシッター: ${p.author} が投稿しました`); });
be.on('news', (e) => { $('#news').innerHTML = md(e.markdown); toast('ナナシ県民新聞が発行されました'); });
be.on('roster', (e) => addRoster(e));
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
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 1 ? 64 : 50; // 縦長のスマホでは広角にして左右が切れないように
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = (now - t0) / 1000; t0 = now;
  updateCps(dt);
  town.tick(dt);
  if (follow) { controls.target.set(follow.x, 0, follow.z); camera.position.set(follow.x + 10, 12, follow.z + 14); }
  controls.update();
  renderer.render(scene, camera);
});
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
  $('#resetLocal').addEventListener('click', () => confirm('この端末の町を消して、はじめからにしますか？') && be.reset());
}
$('#loading').remove();

// ホーム画面に追加したときのオフライン用（https か localhost のときだけ）
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});

window.__nanashi = { cps, scene, setCam, openSheet, mode: be.mode }; // デバッグ用
