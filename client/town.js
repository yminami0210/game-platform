// ナナシ県の町並み（少し昭和）。すべて手続き的に生成し、外部アセットは使わない。
import * as THREE from 'three';
import { PLACES, ROAD_STEP, HALF, buildHouses, buildDesks, mulberry32 } from './shared/world.js';
import { DEPARTMENTS } from './shared/lore.js';

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

// 看板テクスチャ（キャンバスに文字を描く）
export function textTexture(text, { bg = '#f4ecd6', fg = '#3b2f22', w = 512, h = 128, font = 'bold 72px serif', border = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4, w - 24);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function windowsTexture(cols, rows, { wall = '#cfc8b8', glass = '#6d7f8c', lit = 0.25 } = {}, rnd = Math.random) {
  const c = document.createElement('canvas');
  c.width = cols * 32; c.height = rows * 32;
  const g = c.getContext('2d');
  g.fillStyle = wall; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    g.fillStyle = rnd() < lit ? '#e8d9a0' : glass;
    g.fillRect(i * 32 + 6, j * 32 + 7, 20, 18);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function box(w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function signBoard(text, x, y, z, w, h, opts = {}, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, opts) }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

// 浮かぶ文字ラベル（スプライト）
export function label(text, { scale = 6, bg = 'rgba(243,234,215,.92)', fg = '#3b2f22' } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, { bg, fg, font: 'bold 56px serif', border: '#b8392f' }), depthTest: false }));
  s.scale.set(scale, scale / 4, 1);
  s.renderOrder = 10;
  return s;
}

export function buildTown(scene, seed) {
  const rnd = mulberry32(seed * 31);
  const world = new THREE.Group();
  scene.add(world);

  // 地面と道路
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 160, HALF * 2 + 160), mat('#9aa36f'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground';
  world.add(ground);
  const roadMat = mat('#5d5a55');
  const lineMat = new THREE.MeshBasicMaterial({ color: '#e8e0c8' });
  const walkMat = mat('#a59d8c');
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
    for (const along of ['x', 'z']) {
      const len = HALF * 2 + 8;
      const sidewalk = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? len : 11, along === 'x' ? 11 : len), walkMat);
      sidewalk.rotation.x = -Math.PI / 2; sidewalk.position.set(along === 'x' ? 0 : k, 0.02, along === 'x' ? k : 0); sidewalk.receiveShadow = true;
      const road = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? len : 7, along === 'x' ? 7 : len), roadMat);
      road.rotation.x = -Math.PI / 2; road.position.set(along === 'x' ? 0 : k, 0.04, along === 'x' ? k : 0); road.receiveShadow = true;
      world.add(sidewalk, road);
      for (let t = -HALF; t < HALF; t += 8) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? 3 : 0.25, along === 'x' ? 0.25 : 3), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(along === 'x' ? t : k, 0.06, along === 'x' ? k : t);
        world.add(dash);
      }
    }
  }

  // 電柱と電線（昭和の空）
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.22, 9, 6);
  const poleMat = mat('#8a8070');
  const poles = [];
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) for (let t = -HALF + 15; t < HALF; t += 30) poles.push([t, k + 5], [k + 5, t]);
  const poleMesh = new THREE.InstancedMesh(poleGeo, poleMat, poles.length);
  const tmp = new THREE.Object3D();
  poles.forEach(([x, z], i) => { tmp.position.set(x, 4.5, z); tmp.updateMatrix(); poleMesh.setMatrixAt(i, tmp.matrix); });
  poleMesh.castShadow = true;
  world.add(poleMesh);
  const wirePts = [];
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
    for (const off of [8.2, 8.8]) {
      wirePts.push(new THREE.Vector3(-HALF + 15, off, k + 5), new THREE.Vector3(HALF - 15, off, k + 5));
      wirePts.push(new THREE.Vector3(k + 5, off, -HALF + 15), new THREE.Vector3(k + 5, off, HALF - 15));
    }
  }
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePts), new THREE.LineBasicMaterial({ color: '#2b2620' })));

  // 住宅（瓦屋根）
  const houses = buildHouses(seed);
  const wallColors = ['#e6dcc6', '#d8cdb5', '#cfc3a8', '#e9e2d2', '#c8b99a'];
  for (const h of houses) {
    const g = new THREE.Group();
    g.position.set(h.x, 0, h.z); g.rotation.y = h.rot;
    g.add(box(h.w, h.h, h.d, mat(wallColors[Math.floor(rnd() * wallColors.length)]), 0, h.h / 2, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.8, 2.6, 4), mat(h.roof));
    roof.position.y = h.h + 1.3; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
    g.add(roof);
    g.add(box(1.4, 2, 0.2, mat('#5a4030'), 0, 1, h.d / 2 + 0.05)); // 玄関
    world.add(g);
  }

  // 施設
  for (const p of PLACES) world.add(buildPlace(p, rnd));

  // 木
  const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
  const leafGeo = new THREE.SphereGeometry(2.2, 7, 6);
  const trees = [];
  for (let i = 0; i < 160; i++) {
    const x = (rnd() - 0.5) * (HALF * 2 + 120), z = (rnd() - 0.5) * (HALF * 2 + 120);
    const nearRoad = (v) => Math.abs(v - Math.round(v / ROAD_STEP) * ROAD_STEP) < 9;
    if ((nearRoad(x) || nearRoad(z)) && Math.abs(x) <= HALF + 5 && Math.abs(z) <= HALF + 5) continue;
    if (PLACES.some((p) => Math.abs(x - p.x) < p.w / 2 + 3 && Math.abs(z - p.z) < p.d / 2 + 3 && p.kind !== 'park')) continue;
    if (houses.some((h) => Math.abs(h.x - x) < 6 && Math.abs(h.z - z) < 6)) continue;
    trees.push([x, z, 0.8 + rnd() * 0.6]);
  }
  const park = PLACES.find((p) => p.id === 'park');
  for (let i = 0; i < 14; i++) trees.push([park.x + (rnd() - 0.5) * park.w, park.z + (rnd() - 0.5) * park.d, 1 + rnd() * 0.4]);
  const trunks = new THREE.InstancedMesh(trunkGeo, mat('#6b4a32'), trees.length);
  const leaves = new THREE.InstancedMesh(leafGeo, mat('#5f7d45'), trees.length);
  trees.forEach(([x, z, s], i) => {
    tmp.position.set(x, 1.5 * s, z); tmp.scale.set(s, s, s); tmp.updateMatrix(); trunks.setMatrixAt(i, tmp.matrix);
    tmp.position.set(x, 4 * s, z); tmp.updateMatrix(); leaves.setMatrixAt(i, tmp.matrix);
  });
  trunks.castShadow = leaves.castShadow = true;
  world.add(trunks, leaves);

  return { world, ground, office: buildOffice(world) };
}

function buildPlace(p, rnd) {
  const g = new THREE.Group();
  const front = p.z + p.d / 2 + 0.05; // 南（+z）側が正面
  const wall = mat(p.color);
  switch (p.kind) {
    case 'kencho': {
      const tex = windowsTexture(14, 6, { wall: '#c9c3b6' }, rnd);
      const facade = new THREE.MeshLambertMaterial({ map: tex });
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), [wall, wall, mat('#8f897c'), wall, facade, facade]);
      m.position.set(p.x, p.h / 2, p.z); m.castShadow = m.receiveShadow = true;
      g.add(m);
      g.add(box(8, 8, 8, mat('#bdb6a6'), p.x, p.h + 4, p.z)); // 時計塔
      const clock = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshBasicMaterial({ color: '#f4ecd6' }));
      clock.position.set(p.x, p.h + 4.5, p.z + 4.05); g.add(clock);
      const pole = box(0.2, 10, 0.2, mat('#ddd'), p.x + 18, 5, front + 6); g.add(pole);
      g.add(box(3, 2, 0.05, mat('#f4f0e6'), p.x + 19.5, 9, front + 6));
      g.add(signBoard(p.sign, p.x, 5, front + 0.05, 16, 2.6, { bg: '#3b2f22', fg: '#f4ecd6' }));
      break;
    }
    case 'office': {
      // 執務フロア: 屋根なしで中が見える（CP の作業がそのまま見える）
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), mat('#b9ad92'));
      floor.rotation.x = -Math.PI / 2; floor.position.set(p.x, 0.08, p.z); floor.receiveShadow = true;
      g.add(floor);
      const wm = mat('#d6cfbf');
      g.add(box(p.w, 1.4, 0.4, wm, p.x, 0.7, p.z - p.d / 2));
      g.add(box(0.4, 1.4, p.d, wm, p.x - p.w / 2, 0.7, p.z));
      g.add(box(0.4, 1.4, p.d, wm, p.x + p.w / 2, 0.7, p.z));
      g.add(box(p.w / 2 - 4, 1.4, 0.4, wm, p.x - p.w / 4 - 2, 0.7, p.z + p.d / 2));
      g.add(box(p.w / 2 - 4, 1.4, 0.4, wm, p.x + p.w / 4 + 2, 0.7, p.z + p.d / 2));
      break;
    }
    case 'park': {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), mat(p.color));
      lawn.rotation.x = -Math.PI / 2; lawn.position.set(p.x, 0.07, p.z);
      g.add(lawn);
      g.add(box(4, 0.5, 1, mat('#7a5a3a'), p.x - 8, 0.5, p.z + 6));
      g.add(box(4, 0.5, 1, mat('#7a5a3a'), p.x + 8, 0.5, p.z + 6));
      const slide = box(1.2, 0.2, 7, mat('#c84a3a'), p.x, 1.8, p.z - 6); slide.rotation.x = 0.5; g.add(slide);
      g.add(box(0.5, 6, 0.5, mat('#999'), p.x + 12, 3, p.z - 12)); // 時計柱
      break;
    }
    case 'bokujo': case 'tanbo': {
      const field = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), mat(p.kind === 'tanbo' ? '#7f9a55' : p.color));
      field.rotation.x = -Math.PI / 2; field.position.set(p.x, 0.06, p.z);
      g.add(field);
      if (p.kind === 'tanbo') {
        for (let i = -2; i <= 2; i++) g.add(box(0.6, 0.3, p.d, mat('#8a7a55'), p.x + i * (p.w / 5), 0.15, p.z));
        const kakashi = box(0.2, 2.4, 0.2, mat('#6b4a32'), p.x + 5, 1.2, p.z); g.add(kakashi);
        g.add(box(2, 0.2, 0.2, mat('#6b4a32'), p.x + 5, 1.9, p.z));
      } else {
        g.add(box(14, 7, 10, mat('#9a3b2c'), p.x - 18, 3.5, p.z - 14)); // 赤い牛舎
        const roof = new THREE.Mesh(new THREE.ConeGeometry(10, 3, 4), mat('#5a5a5a'));
        roof.position.set(p.x - 18, 8.5, p.z - 14); roof.rotation.y = Math.PI / 4; g.add(roof);
        const cowBody = new THREE.BoxGeometry(2.2, 1.2, 1);
        for (let i = 0; i < 8; i++) {
          const cow = new THREE.Mesh(cowBody, mat(i % 3 ? '#f2f0ea' : '#3a3530'));
          cow.position.set(p.x + (rnd() - 0.3) * p.w * 0.6, 1.1, p.z + (rnd() - 0.5) * p.d * 0.6);
          cow.rotation.y = rnd() * Math.PI; cow.castShadow = true; g.add(cow);
        }
        for (let t = 0; t < 4; t++) {
          const horiz = t % 2 === 0;
          g.add(box(horiz ? p.w : 0.2, 1, horiz ? 0.2 : p.d, mat('#e8e0d0'), p.x + (horiz ? 0 : (t === 1 ? 1 : -1) * p.w / 2), 0.8, p.z + (horiz ? (t === 0 ? 1 : -1) * p.d / 2 : 0)));
        }
      }
      if (p.sign) g.add(signBoard(p.sign, p.x, 3, p.z + p.d / 2 + 1, 8, 1.6, { bg: '#fff', border: '#3b2f22' }));
      break;
    }
    default: {
      const tex = p.h > 7 ? windowsTexture(Math.max(2, Math.round(p.w / 4)), Math.max(1, Math.round(p.h / 4)), { wall: p.color }, rnd) : null;
      const facade = tex ? new THREE.MeshLambertMaterial({ map: tex }) : wall;
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), [wall, wall, mat('#7a7468'), wall, facade, wall]);
      m.position.set(p.x, p.h / 2, p.z); m.castShadow = m.receiveShadow = true;
      g.add(m);
      const signStyle = {
        super: { bg: '#c8392f', fg: '#fff' }, conbini: { bg: '#2f7a4a', fg: '#fff' }, mall: { bg: '#2f4f8a', fg: '#fff' },
        car: { bg: '#fff', fg: '#2f4f8a', border: '#2f4f8a' }, sento: { bg: '#2f3f6a', fg: '#fff' }, kissa: { bg: '#5a2f1f', fg: '#f4d9a0' },
        station: { bg: '#fff', fg: '#3b2f22', border: '#3b2f22' }, school: { bg: '#f4ecd6', fg: '#3b2f22' },
      }[p.kind] || { bg: '#f4ecd6', fg: '#3b2f22', border: '#8a6a4a' };
      const sw = Math.min(p.w * 0.9, p.sign.length * 2.2 + 2);
      g.add(signBoard(p.sign, p.x, p.h - 1.2, front + 0.06, sw, Math.min(2.2, sw / 3.5), signStyle));
      if (p.kind === 'shop' || p.kind === 'kissa' || p.kind === 'shokudo') {
        const awning = box(p.w, 0.15, 2.4, mat(['#c84a3a', '#3a6a9a', '#e0a030', '#4a8a5a'][Math.floor(rnd() * 4)]), p.x, 3, front + 1.1);
        awning.rotation.x = 0.35; g.add(awning);
      }
      if (p.kind === 'sento') {
        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 22, 8), mat('#8a6a5a'));
        chimney.position.set(p.x + p.w / 2 - 2, 11, p.z - p.d / 2 + 2); chimney.castShadow = true; g.add(chimney);
        g.add(signBoard('ゆ', p.x, 1.6, front + 0.1, 2.4, 2.4, { bg: '#2f3f6a', fg: '#fff', w: 128, h: 128, font: 'bold 96px serif' }));
      }
      if (p.kind === 'conbini') {
        for (let i = 0; i < 3; i++) g.add(box(1, 1.8, 0.8, mat(['#c8392f', '#e8e0d0', '#2f6a9a'][i]), p.x + p.w / 2 + 1, 0.9, p.z + p.d / 2 - 1.2 - i * 1.1)); // 自販機
        g.add(box(0.5, 1.3, 0.5, mat('#c8392f'), p.x - p.w / 2 - 1.5, 0.65, front + 1)); // 赤いポスト
      }
      if (p.kind === 'car') {
        const carColors = ['#c84a3a', '#e8e0d0', '#2f4f6a', '#d9c06a', '#3a5a3a'];
        for (let i = 0; i < 5; i++) {
          const cg = new THREE.Group();
          cg.add(box(4.2, 1, 1.8, mat(carColors[i]), 0, 0.8, 0));
          cg.add(box(2.4, 0.8, 1.6, mat('#9ab0bc'), -0.2, 1.7, 0));
          cg.position.set(p.x - p.w / 2 + 4 + i * 6.5, 0, front + 6);
          cg.rotation.y = Math.PI / 2; g.add(cg);
        }
      }
      if (p.kind === 'station') {
        g.add(box(160, 0.4, 3, mat('#6a6058'), p.x, 0.2, p.z + 14));
        for (const dz of [13.3, 14.7]) g.add(box(160, 0.15, 0.15, mat('#999'), p.x, 0.45, p.z + dz));
        g.add(box(44, 1, 5, mat('#b9ad92'), p.x, 0.5, p.z + 9)); // ホーム
      }
      if (p.kind === 'mall') g.add(signBoard('屋上遊園地', p.x, p.h + 2, p.z, 14, 2.4, { bg: '#e0a030', fg: '#fff' }));
    }
  }
  return g;
}

// 執務フロアの机と部署札
function buildOffice(world) {
  const desks = buildDesks();
  const deskMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.8, 1.2), mat('#7a6a55'), desks.length);
  const tmp = new THREE.Object3D();
  desks.forEach((d, i) => { tmp.position.set(d.x, 0.5, d.z + 0.9); tmp.updateMatrix(); deskMesh.setMatrixAt(i, tmp.matrix); });
  deskMesh.castShadow = true;
  world.add(deskMesh);
  const lamps = {};
  for (const dept of DEPARTMENTS) {
    const mine = desks.filter((d) => d.dept === dept.id);
    const cx = mine.reduce((s, d) => s + d.x, 0) / mine.length;
    const minZ = Math.min(...mine.map((d) => d.z));
    const plate = signBoard(dept.name, cx, 2.6, minZ - 1.6, 5, 1.2, { bg: dept.color, fg: '#fff' });
    world.add(plate);
    // 作業中ランプ（タスク実行中に点灯）
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: '#555' }));
    lamp.position.set(cx + 3, 2.6, minZ - 1.6);
    world.add(lamp);
    lamps[dept.id] = lamp;
  }
  return { desks, lamps };
}
