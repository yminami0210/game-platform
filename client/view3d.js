// 3D の表示（three.js）。main.js からは view2d（map2d.js）と同じ形の道具として使う。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildTown, label, toon } from './town.js';
import { footprint } from './shared/world.js';

export function createView3D({ canvas, init, layout, mobile, lite }) {
  // WebGL が作れない端末ではここで例外になる → main.js が地図表示に切り替える
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite && (!mobile || devicePixelRatio < 2), powerPreference: 'default' });
  renderer.setPixelRatio(lite ? 1 : Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setClearColor('#8fc8d8');
  renderer.shadowMap.enabled = !lite;
  renderer.shadowMap.type = THREE.PCFShadowMap; // 影はぼかさない（刷り物の段の陰）

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#eef6f4', 900, 3200);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 4000);
  const controls = new OrbitControls(camera, canvas);
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.minDistance = 8; controls.maxDistance = 700;
  const hemi = new THREE.HemisphereLight('#e6f4f8', '#a9c25a', 1.1);
  const sun = new THREE.DirectionalLight('#fff6e0', 1.9);
  sun.castShadow = true;
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.4;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -160, right: 160, top: 160, bottom: -160, far: 900 });
  scene.add(hemi, sun, sun.target);
  const sunDir = new THREE.Vector3(200, 300, 120);

  const town = buildTown(scene, init.seed, layout);

  // ---- カメラ ----
  const CAMS = {
    all: [[70, 150, 445], [0, 0, 30]], // 川の向こうの土手の上から、町と北の大岳を見上げる（観光案内図の構図）
    allTall: [[30, 175, 410], [10, 0, 40]],
    office: [[30, 40, 18], [30, 0, -22]],
    officeTall: [[30, 70, 40], [30, 0, -16]],
    shotengai: [[-4, 16, 136], [0, 3, 108]],
    station: [[70, 34, 90], [30, 0, 18]],
  };
  let follow = null;
  function setCam(name, followCp = null) {
    follow = null;
    if (name === 'avatar') { follow = followCp; return; }
    if (name === 'all' && mobile) name = 'allTall';
    let p, t;
    if (name === 'koho') {
      const d = town.office.desks.filter((x) => x.dept === 'koho');
      const cx = d.reduce((s, x) => s + x.x, 0) / d.length, cz = d.reduce((s, x) => s + x.z, 0) / d.length;
      [p, t] = [[cx + 6, 20, cz + 13], [cx + 1, 0, cz - 1]];
    } else [p, t] = CAMS[name];
    camera.position.set(...p); controls.target.set(...t); controls.update();
  }

  // ---- 人（インスタンス描画）。案内図の点景のような 2 頭身寄りの人形 ----
  const MAX = 1500;
  const bodyMesh = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.42, 0.7, 3, 8), toon('#ffffff'), MAX);
  const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.46, 12, 10), toon('#ffffff'), MAX);
  const hairMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), toon('#ffffff'), MAX);
  for (const m of [bodyMesh, headMesh, hairMesh]) { m.frustumCulled = false; m.count = 0; scene.add(m); }
  bodyMesh.castShadow = headMesh.castShadow = true;
  let people = [];
  const tmp = new THREE.Object3D();

  // ---- 管理者モードの影と枠 ----
  const ghostMat = new THREE.MeshBasicMaterial({ color: '#3fae5a', transparent: true, opacity: 0.45, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat);
  ghost.visible = false; ghost.renderOrder = 5;
  const frameBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: '#f2c230' }));
  frameBox.visible = false;
  scene.add(ghost, frameBox);

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };

  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 64 : 50;
    camera.updateProjectionMatrix();
  }
  const drawSize = new THREE.Vector2();
  let night = 0;

  return {
    mode: '3d',
    setCam,
    rebuild: (l) => town.rebuild(l),
    officeDesks: () => town.office.desks,
    setBusyDepts(busy) {
      for (const [id, lamp] of Object.entries(town.office.lamps)) { lamp.visible = busy.has(id); lamp.material.color.set('#ffb43a'); }
    },
    addPeople(list) {
      for (const c of list) {
        bodyMesh.setColorAt(c.idx, new THREE.Color(c.color));
        headMesh.setColorAt(c.idx, new THREE.Color(c.skin));
        hairMesh.setColorAt(c.idx, new THREE.Color(c.hair));
      }
      people = list.length ? [...people, ...list] : people;
      bodyMesh.count = headMesh.count = hairMesh.count = Math.min(MAX, people.length);
      for (const m of [bodyMesh, headMesh, hairMesh]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
    },
    // 頭上の札（作業中・自分のアバター）
    setBadge(c, text, working) {
      if (c.badge) { scene.remove(c.badge); c.badge.material.map.dispose(); c.badge.material.dispose(); c.badge = null; }
      if (text) { c.badge = label(text, { scale: 9, bg: working ? 'rgba(47,91,160,.96)' : 'rgba(251,250,244,.96)', fg: working ? '#fff' : '#22324f' }); scene.add(c.badge); }
    },
    setTag(c, text) { c.tag = label(text, { scale: 7 }); scene.add(c.tag); },
    setDaylight(day, dusk, h) {
      night = 1 - day;
      scene.fog.color.copy(town.setDaylight(day, dusk));
      sun.intensity = 0.25 + day * 1.7; hemi.intensity = 0.95 + day * 0.2;
      sun.color.set(day < 0.3 ? '#a9bde8' : dusk > 0.2 ? '#ffd2a0' : '#fff6e0');
      hemi.color.set(day < 0.3 ? '#8aa0d8' : '#e6f4f8');
      hemi.groundColor.set(day < 0.3 ? '#2e3f66' : '#a9c25a');
      const a = ((h - 6) / 12) * Math.PI;
      sunDir.set(Math.cos(a) * 300, Math.max(30, Math.sin(a) * 300), 120);
    },
    flyTo(x, z) { controls.target.set(x, 0, z); camera.position.set(x + 12, 14, z + 16); controls.update(); },
    pickCp(e) {
      aim(e);
      const hit = ray.intersectObject(bodyMesh)[0];
      return hit ? people[hit.instanceId] || null : null;
    },
    groundAt(e) {
      aim(e);
      const p = ray.intersectObject(town.ground)[0]?.point;
      return p ? { x: p.x, z: p.z } : null;
    },
    pickBuilding(e) {
      aim(e);
      const hit = ray.intersectObjects(town.pickables(), true)[0];
      if (!hit) return null;
      if (hit.object.userData.houseIds) return hit.object.userData.houseIds[hit.instanceId];
      for (let o = hit.object; o; o = o.parent) if (o.userData?.bid) return o.userData.bid;
      return null;
    },
    setGhost(b, ok) {
      if (!b) { ghost.visible = false; return; }
      const f = footprint(b), h = Math.max(2, b.h || 3);
      ghost.scale.set(f.hx * 2, h, f.hz * 2); ghost.position.set(f.x, h / 2, f.z);
      ghostMat.color.set(ok ? '#3fae5a' : '#d8503e'); ghost.visible = true;
    },
    setFrame(b) {
      if (!b) { frameBox.visible = false; return; }
      const f = footprint(b), h = (b.h || 3) + 1;
      frameBox.scale.set(f.hx * 2 + 1, h, f.hz * 2 + 1); frameBox.position.set(f.x, h / 2, f.z); frameBox.visible = true;
    },
    // 広報課の写真（3D の断面キャプチャ）。640x480 の canvas を返す
    photo(req) {
      const cam = new THREE.PerspectiveCamera(45, 4 / 3, 0.5, 1000);
      cam.position.set(req.x + 22, Math.max(10, req.h + 8), req.z + 30);
      cam.lookAt(req.x, req.h / 2, req.z);
      const size = renderer.getSize(new THREE.Vector2());
      const W = 640, H = 480;
      renderer.setSize(W, H, false);
      const overlays = people.flatMap((c) => [c.tag, c.badge]).filter(Boolean);
      overlays.forEach((o) => (o.visible = false));
      renderer.render(scene, cam);
      overlays.forEach((o) => (o.visible = true));
      const out = document.createElement('canvas');
      out.width = W; out.height = H;
      out.getContext('2d').drawImage(canvas, 0, 0, W, H);
      renderer.setSize(size.x, size.y, false);
      return out;
    },
    // 毎フレーム: 人の位置（main.js が補間済み）を反映して描く
    draw(dt, minuteOfDay) {
      renderer.getSize(drawSize);
      if (drawSize.x !== canvas.clientWidth || drawSize.y !== canvas.clientHeight) resize();
      const time = performance.now() / 1000;
      for (const c of people) {
        if (c.idx >= MAX) continue;
        const hidden = c.state === 4 || c.state === 6 || c.gone;
        const seated = c.state === 2 || c.state === 3;
        const bob = c.moving ? Math.abs(Math.sin(time * 9 + c.idx)) * 0.12 : 0;
        const s = hidden ? 0 : c.info.role === 'student' ? 0.75 : c.info.role === 'human' ? 1.15 : 1;
        const y = (seated ? 0.6 : 0.8) * s + bob;
        const bw = c.bw || 1, bh = c.bh || 1; // 体型（台帳の見た目）
        tmp.position.set(c.x, y, c.z); tmp.scale.set(s * bw, (seated ? s * 0.8 : s) * bh, s * bw); tmp.updateMatrix();
        bodyMesh.setMatrixAt(c.idx, tmp.matrix);
        tmp.position.y = y + (seated ? 0.95 : 1.15) * s * bh; tmp.updateMatrix();
        headMesh.setMatrixAt(c.idx, tmp.matrix);
        tmp.position.y += 0.08 * s; tmp.updateMatrix();
        hairMesh.setMatrixAt(c.idx, tmp.matrix);
        if (c.tag) c.tag.position.set(c.x, 3.6, c.z);
        if (c.badge) { c.badge.position.set(c.x, 3.2, c.z); c.badge.visible = !hidden; }
      }
      bodyMesh.instanceMatrix.needsUpdate = headMesh.instanceMatrix.needsUpdate = hairMesh.instanceMatrix.needsUpdate = true;
      town.tick(dt, minuteOfDay, night);
      if (follow) { controls.target.set(follow.x, 0, follow.z); camera.position.set(follow.x + 10, 12, follow.z + 14); }
      controls.update();
      sun.target.position.copy(controls.target);
      sun.position.copy(controls.target).add(sunDir);
      renderer.render(scene, camera);
    },
    onLost(fn) { canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); fn(); }); },
    debug: { scene },
  };
}
