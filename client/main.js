// ナナシ県 3D クライアント: サーバーの状態を SSE で受け、町と CP を描く。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTown, label } from '/town.js';
import { PLACES } from '/shared/world.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 保存できなくても動く */ } },
};

const init = await (await fetch('/api/init')).json();
const DEPTS = Object.fromEntries(init.departments.map((d) => [d.id, d]));

// ---- 描画の土台 ----
const canvas = $('#view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d9cfb4');
scene.fog = new THREE.Fog('#d9cfb4', 220, 620);
const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
const controls = new OrbitControls(camera, canvas);
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 8; controls.maxDistance = 650;
const hemi = new THREE.HemisphereLight('#fff4dc', '#7a6a4a', 0.9);
const sun = new THREE.DirectionalLight('#fff0d0', 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, far: 900 });
scene.add(hemi, sun, sun.target);

const town = buildTown(scene, init.seed);

// ---- カメラ ----
const CAMS = {
  all: [[0, 280, 340], [0, 0, 20]],
  office: [[30, 40, 18], [30, 0, -22]],
  koho: [[0, 14, 0], [0, 0, 0]],
  shotengai: [[0, 22, 150], [0, 0, 108]],
  station: [[70, 30, 250], [30, 0, 200]],
};
let follow = null;
function setCam(name) {
  follow = null;
  if (name === 'koho') {
    // 広報課の机まわりに寄る
    const d = town.office.desks.filter((x) => x.dept === 'koho');
    const cx = d.reduce((s, x) => s + x.x, 0) / d.length, cz = d.reduce((s, x) => s + x.z, 0) / d.length;
    CAMS.koho = [[cx + 10, 16, cz + 20], [cx + 2, 0, cz + 2]];
  }
  if (name === 'avatar') { follow = myAvatar(); return; }
  const [p, t] = CAMS[name];
  camera.position.set(...p); controls.target.set(...t); controls.update();
}
setCam('office');
$('#cams').addEventListener('click', (e) => e.target.dataset.cam && setCam(e.target.dataset.cam));

// ---- CP（インスタンス描画） ----
const MAX = 1200;
const bodyMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.38, 0.9, 3, 8), new THREE.MeshLambertMaterial(), MAX);
const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshLambertMaterial(), MAX);
bodyMesh.castShadow = headMesh.castShadow = true;
bodyMesh.frustumCulled = headMesh.frustumCulled = false; // 位置が毎フレーム変わるので境界球カリングを使わない
bodyMesh.count = headMesh.count = 0;
scene.add(bodyMesh, headMesh);

const ROLE_COLOR = { resident: '#7a8a9a', worker: '#4a6a8a', student: '#e0c050' };
const SKIN = ['#e8c8a8', '#dcb898', '#f0d4b8'];
const cps = new Map(); // id -> { idx, info, x, z, tx, tz, state }
const order = [];
function addRoster(list) {
  for (const info of list) {
    if (cps.has(info.id)) continue;
    const idx = order.length;
    order.push(info.id);
    const c = { idx, info, x: 0, z: 0, tx: 0, tz: 0, state: 1, fresh: true };
    cps.set(info.id, c);
    const color = info.role === 'human' ? info.color || '#e8b730' : info.dept ? DEPTS[info.dept].color : ROLE_COLOR[info.role] || '#888';
    bodyMesh.setColorAt(idx, new THREE.Color(color));
    headMesh.setColorAt(idx, new THREE.Color(SKIN[info.id % 3]));
    if (info.role === 'human') {
      c.tag = label(`★ ${info.name}`, { scale: 7 });
      scene.add(c.tag);
    }
  }
  bodyMesh.count = headMesh.count = order.length;
  bodyMesh.instanceColor.needsUpdate = headMesh.instanceColor.needsUpdate = true;
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
    const y = (seated ? 0.65 : 0.85) * s + bob;
    tmp.position.set(c.x, y, c.z); tmp.scale.set(s, seated ? s * 0.8 : s, s); tmp.updateMatrix();
    bodyMesh.setMatrixAt(c.idx, tmp.matrix);
    tmp.position.y = y + (seated ? 0.95 : 1.1) * s; tmp.updateMatrix();
    headMesh.setMatrixAt(c.idx, tmp.matrix);
    if (c.tag) c.tag.position.set(c.x, 3.6, c.z);
    if (c.badge) { c.badge.position.set(c.x, 3.2, c.z); c.badge.visible = !hidden; }
  }
  bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = true;
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
  for (const [id, lamp] of Object.entries(town.office.lamps)) lamp.material.color.set(busy.has(id) ? '#ff5a3a' : '#555');
  // CP の頭上に作業バッジ
  const want = new Map(active.filter((t) => t.assignee && t.status !== 'queued').map((t) => [t.assignee, t]));
  for (const c of cps.values()) {
    const t = want.get(c.info.id);
    const text = t ? `${t.status === 'working' ? '作業中' : '移動中'}：${t.title} ${t.status === 'working' ? Math.round(t.progress * 100) + '%' : ''}` : null;
    if (c.badgeText === text) continue;
    if (c.badge) { scene.remove(c.badge); c.badge.material.map.dispose(); c.badge.material.dispose(); c.badge = null; }
    c.badgeText = text;
    if (text) { c.badge = label(text, { scale: 9, bg: t.status === 'working' ? 'rgba(184,57,47,.95)' : 'rgba(243,234,215,.95)', fg: t.status === 'working' ? '#fff' : '#3b2f22' }); scene.add(c.badge); }
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
  li.innerHTML = `<span class="via">${esc(p.via)}</span><div class="who">${esc(p.author)}</div><time>${esc(p.time)}</time><div>${esc(p.text)}</div>${p.photo ? `<img src="/data/photos/${esc(p.photo)}.jpg" alt="広報課撮影" onerror="this.remove()">` : ''}`;
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
  const r = await fetch(`/api/cp/${id}`);
  if (!r.ok) return;
  const d = await r.json();
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
  fetch(`/api/photos/${req.photoId}`, { method: 'POST', body: out.toDataURL('image/jpeg', 0.75) }).catch(() => {});
}

// ---- 住民課窓口 ----
$('#workSel').innerHTML = PLACES.filter((p) => !['kencho', 'office', 'park', 'tanbo'].includes(p.kind)).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
$('#formResident').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  await fetch('/api/residents', { method: 'POST', body: JSON.stringify(f) });
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
  const r = await (await fetch('/api/avatars', { method: 'POST', body: JSON.stringify(f) })).json();
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
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return; // ドラッグは無視
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if ($('#walkMode').checked && myAvatar()) {
    const hit = ray.intersectObject(town.ground)[0];
    if (hit) fetch(`/api/avatars/${avatar.cpId}/goto`, { method: 'POST', body: JSON.stringify({ token: avatar.token, x: hit.point.x, z: hit.point.z }) });
    return;
  }
  const hit = ray.intersectObject(bodyMesh)[0];
  if (hit) showCp(order[hit.instanceId]); else $('#card').hidden = true;
});

// ---- サーバーとの接続 ----
let lastClock = init.clock;
function renderClock(c) {
  lastClock = c;
  $('#clock').textContent = `${c.date} ${c.time}`;
  if (c.llm) $('#llm').textContent = `LLM: ${c.llm.mode}｜本日 ${c.llm.tokens}/${c.llm.budget} tok（${c.llm.calls}回）`;
  // 時刻で空の色と日差しを変える
  const h = (c.minutes % 1440) / 60;
  const day = Math.max(0, Math.sin(((h - 6) / 12) * Math.PI));
  const sky = new THREE.Color('#1e2438').lerp(new THREE.Color(h > 16 && h < 19 ? '#e8b888' : '#d9cfb4'), Math.min(1, day * 1.6 + 0.08));
  scene.background.copy(sky); scene.fog.color.copy(sky);
  sun.intensity = 0.15 + day * 1.5; hemi.intensity = 0.35 + day * 0.6;
  const a = ((h - 6) / 12) * Math.PI;
  sun.position.set(Math.cos(a) * 300, Math.max(30, Math.sin(a) * 300), 120);
}
renderClock(init.clock);

const es = new EventSource('/events');
es.addEventListener('frame', (e) => applyFrame(JSON.parse(e.data)));
es.addEventListener('clock', (e) => { const c = JSON.parse(e.data); renderClock(c); if (c.tasks) { tasks = c.tasks; renderTasks(); } });
es.addEventListener('log', (e) => addLog(JSON.parse(e.data)));
es.addEventListener('sns', (e) => { const p = JSON.parse(e.data); addSns(p); toast(`ナナシッター: ${p.author} が投稿しました`); });
es.addEventListener('news', (e) => { $('#news').innerHTML = md(JSON.parse(e.data).markdown); toast('ナナシ県民新聞が発行されました'); });
es.addEventListener('roster', (e) => addRoster(JSON.parse(e.data)));
es.addEventListener('photo_request', (e) => takePhoto(JSON.parse(e.data)));
es.addEventListener('photo', (e) => {
  const { photoId, url } = JSON.parse(e.data);
  document.querySelectorAll(`#sns img[src="${url}"]`).forEach((img) => (img.src = url + '?t=' + Date.now()));
  toast(`広報課が写真を撮りました（${photoId}）`);
});
es.addEventListener('registered', (e) => {
  const r = JSON.parse(e.data);
  if (avatar && r.human && r.token === avatar.token) {
    avatar.cpId = r.cpId; store.set('nanashi.avatar', avatar);
    setTimeout(renderAvatar, 600);
    toast('アバター登録が完了しました。ナナシ駅に到着しています');
  }
});

// ---- ループ ----
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
renderer.setAnimationLoop(() => {
  const now = performance.now();
  const dt = (now - t0) / 1000; t0 = now;
  updateCps(dt);
  if (follow) { controls.target.set(follow.x, 0, follow.z); camera.position.set(follow.x + 10, 12, follow.z + 14); }
  controls.update();
  renderer.render(scene, camera);
});
window.__nanashi = { cps, scene, setCam }; // デバッグ用
