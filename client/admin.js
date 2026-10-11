// 管理者モード（シムシティのように建物を選んで、動かす・回す・壊す・建てる）。
// 置けるかどうかはサーバーと同じきまり（world.js の placementError）でその場で判定し、緑／赤の影で見せる。
import * as THREE from 'three';
import { CATALOG, footprint, makeHouse, placementError } from './shared/world.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function setupAdmin({ scene, camera, canvas, town, be, getLayout, toast }) {
  const state = { active: false, mode: 'select', item: null, selected: null, ghost: null, rot: 0, token: '' };
  try { state.token = sessionStorage.getItem('nanashi.adminToken') || ''; } catch { /* 保存できなくても動く */ }

  // 建設メニュー
  $('#adminCatalog').innerHTML = Object.entries(CATALOG).map(([k, c]) => `<button type="button" data-item="${k}">${esc(c.label)}</button>`).join('');

  // 置く場所の影（緑=置ける、赤=置けない）と、選んだ建物の枠
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#3fae5a', transparent: true, opacity: 0.45, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
  ghost.visible = false; ghost.renderOrder = 5;
  scene.add(ghost);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#f2c230' }));
  frame.visible = false;
  scene.add(frame);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const groundAt = (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(town.ground)[0]?.point || null;
  };

  const findBuilding = (id) => getLayout().places.find((p) => p.id === id) || getLayout().houses.find((h) => h.id === id);
  const labelOf = (b) => b.name || `${{ hira: '平屋', niko: '二階建て', apart: '木造アパート', mise: '店舗つき住宅' }[b.type]}（${b.id}）`;

  // 今の影の建物（建てる物、または動かす物）
  function candidate(x, z) {
    if (state.mode === 'place') {
      const c = CATALOG[state.item];
      return c.house ? makeHouse(c.house, x, z, state.rot, '_new') : { id: '_new', kind: c.kind, x: Math.round(x), z: Math.round(z), w: c.w, d: c.d, h: c.h, name: c.label };
    }
    if (state.mode === 'move' && state.selected) {
      const b = findBuilding(state.selected);
      return b && { ...b, x: Math.round(x), z: Math.round(z), rot: b.type ? state.rot : b.rot };
    }
    return null;
  }

  function showGhost(x, z) {
    const b = candidate(x, z);
    if (!b) { ghost.visible = false; return null; }
    const f = footprint(b);
    const err = placementError(getLayout(), b, state.mode === 'move' ? state.selected : null);
    ghost.scale.set(f.hx * 2, Math.max(2, b.h || 3), f.hz * 2);
    ghost.position.set(f.x, Math.max(2, b.h || 3) / 2, f.z);
    ghostMat.color.set(err ? '#d8503e' : '#3fae5a');
    ghost.visible = true;
    state.ghost = { x: b.x, z: b.z, err };
    $('#adminHint').textContent = err ? `置けません: ${err}` : '「ここに決める」で確定します';
    $('#adminConfirm').disabled = !!err;
    return state.ghost;
  }

  function showFrame(b) {
    if (!b) { frame.visible = false; return; }
    const f = footprint(b);
    frame.scale.set(f.hx * 2 + 1, (b.h || 3) + 1, f.hz * 2 + 1);
    frame.position.set(f.x, ((b.h || 3) + 1) / 2, f.z);
    frame.visible = true;
  }

  function render() {
    const b = state.selected && findBuilding(state.selected);
    $('#adminSel').innerHTML = b
      ? `<b>${esc(labelOf(b))}</b>${b.locked ? '<br><span class="muted">町の中心なので動かせません</span>' : ''}`
      : '<span class="muted">建物をタップすると選べます。下の一覧から選ぶと、新しく建てられます。</span>';
    $('#adminMove').disabled = !b || b.locked;
    $('#adminRemove').disabled = !b || b.locked;
    $('#adminRotate').disabled = !(state.mode === 'place' && CATALOG[state.item]?.house) && !(b?.type);
    document.querySelectorAll('#adminCatalog button').forEach((x) => x.classList.toggle('on', state.mode === 'place' && x.dataset.item === state.item));
    $('#adminConfirm').hidden = !(state.mode === 'place' || state.mode === 'move');
    $('#adminConfirm').disabled = !state.ghost || !!state.ghost.err;
    $('#adminCancel').hidden = state.mode === 'select' && !b;
    if (state.mode === 'select') $('#adminHint').textContent = '';
    if (state.mode === 'place') $('#adminHint').textContent ||= '建てたい場所をタップしてください';
    if (state.mode === 'move') $('#adminHint').textContent ||= '移したい場所をタップしてください';
    showFrame(b);
  }

  function reset() {
    Object.assign(state, { mode: 'select', item: null, selected: null, ghost: null, rot: 0 });
    ghost.visible = false;
    $('#adminHint').textContent = '';
    render();
  }

  async function open() {
    const ok = await be.adminCheck(state.token);
    $('#adminTokenRow').hidden = ok;
    state.active = true;
    document.body.classList.add('admin');
    $('#admin').hidden = false;
    $('#adminBtn').classList.add('on');
    reset();
    if (!ok) $('#adminHint').textContent = 'このサーバーでは、ほかの端末から使うには合言葉が要ります';
  }
  function close() {
    state.active = false;
    document.body.classList.remove('admin');
    $('#admin').hidden = true;
    $('#adminBtn').classList.remove('on');
    ghost.visible = false; frame.visible = false;
  }

  $('#adminBtn').addEventListener('click', () => (state.active ? close() : open()));
  $('#adminClose').addEventListener('click', close);
  $('#adminCatalog').addEventListener('click', (e) => {
    const item = e.target.closest('button')?.dataset.item;
    if (!item) return;
    Object.assign(state, { mode: 'place', item, selected: null, ghost: null, rot: 0 });
    $('#adminHint').textContent = '';
    render();
  });
  $('#adminMove').addEventListener('click', () => {
    const b = findBuilding(state.selected);
    if (!b) return;
    Object.assign(state, { mode: 'move', rot: b.rot || 0, ghost: null });
    $('#adminHint').textContent = '';
    render();
  });
  $('#adminRotate').addEventListener('click', async () => {
    state.rot = (state.rot + Math.PI / 2) % (Math.PI * 2);
    if (state.ghost) showGhost(state.ghost.x, state.ghost.z);
    else if (state.mode === 'select' && state.selected) {
      const b = findBuilding(state.selected);
      await send('move', { id: b.id, rot: (b.rot || 0) + Math.PI / 2 }, '向きを変えました');
    }
  });
  $('#adminRemove').addEventListener('click', async () => {
    const b = findBuilding(state.selected);
    if (!b) return;
    // 確かめは画面の中で（もう一度押すと取り壊す）
    if (state.armed !== b.id) {
      state.armed = b.id;
      $('#adminRemove').textContent = 'もう一度押すと取り壊す';
      $('#adminHint').textContent = '住んでいる人は空き家へ引っ越すか、電車で町を出ます';
      setTimeout(() => { if (state.armed === b.id) { state.armed = null; $('#adminRemove').textContent = '取り壊す'; } }, 4000);
      return;
    }
    state.armed = null;
    $('#adminRemove').textContent = '取り壊す';
    if (await send('remove', { id: b.id }, '取り壊しました')) reset();
  });
  $('#adminCancel').addEventListener('click', reset);
  $('#adminConfirm').addEventListener('click', async () => {
    if (!state.ghost || state.ghost.err) return;
    const { x, z } = state.ghost;
    const ok = state.mode === 'place'
      ? await send('add', { item: state.item, x, z, rot: state.rot }, `${CATALOG[state.item].label}を建てました`)
      : await send('move', { id: state.selected, x, z, rot: state.rot }, '移しました');
    if (ok) { const keep = state.mode === 'place' ? state.item : null; reset(); if (keep) Object.assign(state, { mode: 'place', item: keep }); render(); }
  });
  $('#adminTokenSave').addEventListener('click', async () => {
    state.token = $('#adminToken').value.trim();
    try { sessionStorage.setItem('nanashi.adminToken', state.token); } catch { /* 無視 */ }
    const ok = await be.adminCheck(state.token);
    $('#adminTokenRow').hidden = ok;
    toast(ok ? '管理者として使えます' : '合言葉が違います');
  });

  async function send(op, body, done) {
    const r = await be.admin(op, body, state.token);
    if (r?.ok) { toast(done); return true; }
    toast(r?.error || 'うまくいきませんでした');
    return false;
  }

  // タップ: 選ぶ、または影を置く
  let downAt = null;
  canvas.addEventListener('pointerdown', (e) => (downAt = [e.clientX, e.clientY]));
  canvas.addEventListener('pointerup', (e) => {
    if (!state.active || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > (e.pointerType === 'touch' ? 12 : 5)) return;
    if (state.mode === 'place' || state.mode === 'move') {
      const p = groundAt(e);
      if (p) showGhost(p.x, p.z);
      return;
    }
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(town.pickables(), true)[0];
    let id = null;
    if (hit) {
      if (hit.object.userData.houseIds) id = hit.object.userData.houseIds[hit.instanceId];
      else for (let o = hit.object; o && !id; o = o.parent) id = o.userData?.bid || null;
    }
    state.selected = id;
    state.rot = findBuilding(id)?.rot || 0;
    render();
  });
  // パソコンではマウスに影がついてくる
  canvas.addEventListener('pointermove', (e) => {
    if (!state.active || e.pointerType === 'touch' || !(state.mode === 'place' || state.mode === 'move')) return;
    const p = groundAt(e);
    if (p) showGhost(p.x, p.z);
  });

  return {
    get active() { return state.active; },
    layoutChanged() { if (state.active) render(); },
  };
}
