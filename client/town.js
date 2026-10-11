// ナナシ県の町並み。見た目の方針は docs/nanashi/design-concept.md（昭和の観光鳥瞰図・絵葉書）。
// 輪郭線（裏返しの殻）＋段の陰（トゥーン）＋手塗りの色ばらつき。外部アセットは使わない。
import * as THREE from 'three';
import { PLACES, ROAD_STEP, HALF, buildHouses, buildDesks, mulberry32 } from './shared/world.js';
import { DEPARTMENTS } from './shared/lore.js';

export const PALETTE = {
  asagi: '#8FC8D8', gunjo: '#2F5BA0', moegi: '#A9C25A', wakatake: '#5E9A62',
  aonibi: '#5D6E7E', sakura: '#F2B8C6', gofun: '#FBFAF4', sumi: '#22324F',
};

// ---- 材質 ------------------------------------------------------------------
const gradientMap = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const toonCache = new Map();
export function toon(color, extra = {}) {
  const key = color + JSON.stringify(Object.keys(extra));
  if (!Object.keys(extra).length && toonCache.has(key)) return toonCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap, ...extra });
  if (!Object.keys(extra).length) toonCache.set(key, m);
  return m;
}
const INK = new THREE.MeshBasicMaterial({ color: PALETTE.sumi, side: THREE.BackSide });

// 色を少しだけずらす（手で塗った不揃い）
function jitter(hex, rnd, amt = 0.06) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  return c.setHSL(hsl.h + (rnd() - 0.5) * amt * 0.3, Math.min(1, hsl.s * (1 + (rnd() - 0.5) * amt)), Math.min(1, hsl.l * (1 + (rnd() - 0.5) * amt)));
}

// 文字を描いたテクスチャ（看板・札）
const FONT_HEAD = '"Kaisei Decol", "Hiragino Mincho ProN", "Yu Mincho", serif';
export function textTexture(text, { bg = PALETTE.gofun, fg = PALETTE.sumi, w = 512, h = 128, font = `700 72px ${FONT_HEAD}`, border = null } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 4, w - 28);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 浮かぶ札（スプライト）。CP の作業中表示などに使う
export function label(text, { scale = 6, bg = 'rgba(251,250,244,.95)', fg = PALETTE.sumi } = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: textTexture(text, { bg, fg, font: `700 54px "Zen Maru Gothic", ${FONT_HEAD}`, border: PALETTE.gunjo }), depthTest: false }));
  s.scale.set(scale, scale / 4, 1);
  s.renderOrder = 10;
  return s;
}

// 窓の模様（色はインスタンスごとに掛け合わせる）と、夜に灯る窓のマスク
function windowTextures(cols, rows, { door = false, lit = 0.45 } = {}, rnd = Math.random) {
  const W = cols * 32, H = rows * 32;
  const make = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const a = make(), e = make();
  const g = a.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * 32 + 7, y = j * 32 + 8;
    if (door && j === rows - 1 && i === Math.floor(cols / 2)) {
      g.fillStyle = '#6b4b36'; g.fillRect(x + 1, y - 2, 16, 26);
      continue;
    }
    g.fillStyle = '#7c95a8'; g.fillRect(x, y, 18, 16);
    g.fillStyle = '#e9eef0'; g.fillRect(x + 8, y, 2, 16); g.fillRect(x, y + 7, 18, 2); // 桟
    if (rnd() < lit) { ge.fillStyle = '#ffd48a'; ge.fillRect(x, y, 18, 16); }
  }
  const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: tex(a), emissiveMap: tex(e) };
}

// 切妻屋根（三角柱）。幅 1・奥行き 1・高さ 1 を基準にして、拡大して使う
function gableGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}
const GABLE = gableGeometry();

// 輪郭線つきの普通のメッシュ
// scale: 形を伸ばすときの倍率。輪郭線の太さは伸ばした後の大きさで揃える
function inked(geo, material, { outline = 0.06, scale = [1, 1, 1] } = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  m.scale.set(...scale);
  g.add(m);
  if (outline) {
    const o = new THREE.Mesh(geo, INK);
    geo.computeBoundingBox();
    const size = new THREE.Vector3();
    geo.boundingBox.getSize(size);
    o.scale.set(...scale.map((k, i) => k + outline / Math.max(size.getComponent(i), 0.01)));
    g.add(o);
  }
  return g;
}

function box(w, h, d, material, x, y, z, opts) {
  const g = inked(new THREE.BoxGeometry(w, h, d), material, opts);
  g.position.set(x, y, z);
  return g;
}

function signBoard(text, x, y, z, w, h, opts = {}, rotY = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTexture(text, opts) }));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  return m;
}

// 同じ形をたくさん並べる（本体＋輪郭線）
function instanced(geo, material, items, { outline = 0.08, shadow = true } = {}) {
  const body = new THREE.InstancedMesh(geo, material, items.length);
  const ink = outline ? new THREE.InstancedMesh(geo, INK, items.length) : null;
  const o = new THREE.Object3D();
  geo.computeBoundingBox();
  const size = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  items.forEach((it, i) => {
    o.position.set(it.x, it.y ?? 0, it.z);
    o.rotation.set(0, it.rot || 0, 0);
    o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    o.updateMatrix();
    body.setMatrixAt(i, o.matrix);
    if (it.color) body.setColorAt(i, it.color);
    if (ink) {
      const k = (s, n) => s + outline / Math.max(n, 0.01);
      o.scale.set(k(it.sx ?? 1, size.x), k(it.sy ?? 1, size.y), k(it.sz ?? 1, size.z));
      o.updateMatrix();
      ink.setMatrixAt(i, o.matrix);
    }
  });
  body.castShadow = shadow; body.receiveShadow = true;
  const g = new THREE.Group();
  g.add(body);
  if (ink) g.add(ink);
  return g;
}

// ---- 町 -----------------------------------------------------------------------
export function buildTown(scene, seed) {
  const rnd = mulberry32(seed * 31);
  const world = new THREE.Group();
  scene.add(world);
  const nightMats = []; // 夜に灯る材質

  // 空（上は浅葱、地平は白く霞む）
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(PALETTE.asagi) }, bottom: { value: new THREE.Color('#eef6f4') } },
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float h; void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(0.0, 0.45, h)), 1.0); }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), skyMat);
  scene.add(sky);

  // 地面（町の外も萌黄でつなぐ）
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), toon(PALETTE.moegi));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.name = 'ground';
  world.add(ground);

  // 街区ごとに地面の色を少し変える（住宅地は芝、商業地は舗装）
  const lots = [];
  for (let bx = -HALF; bx < HALF; bx += ROAD_STEP) for (let bz = -HALF; bz < HALF; bz += ROAD_STEP) {
    const cx = bx + ROAD_STEP / 2, cz = bz + ROAD_STEP / 2;
    const paved = PLACES.some((p) => Math.abs(p.x - cx) < 30 && Math.abs(p.z - cz) < 30 && !['park', 'bokujo', 'tanbo'].includes(p.kind));
    lots.push({ x: cx, y: 0.02, z: cz, sx: ROAD_STEP - 11, sy: 1, sz: ROAD_STEP - 11, color: jitter(paved ? '#dcd9cc' : '#b9cf72', rnd, 0.1) });
  }
  world.add(instanced(new THREE.BoxGeometry(1, 0.04, 1), toon('#ffffff'), lots, { outline: 0, shadow: false }));

  // 道（案内図のように白っぽく）と白線
  const roadMat = toon('#c9c6bb');
  const walkMat = toon('#e9e6dc');
  const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
    for (const along of ['x', 'z']) {
      const len = HALF * 2 + 11;
      const mk = (w, mat, y) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? len : w, along === 'x' ? w : len), mat);
        m.rotation.x = -Math.PI / 2; m.position.set(along === 'x' ? 0 : k, y, along === 'x' ? k : 0); m.receiveShadow = true;
        world.add(m);
      };
      mk(11, walkMat, 0.05); mk(7, roadMat, 0.07);
      for (let t = -HALF; t < HALF; t += 9) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(along === 'x' ? 3.5 : 0.3, along === 'x' ? 0.3 : 3.5), lineMat);
        dash.rotation.x = -Math.PI / 2; dash.position.set(along === 'x' ? t : k, 0.09, along === 'x' ? k : t);
        world.add(dash);
      }
    }
  }

  // 遠くの山（重なる稜線。遠いほど空の色に近づく）と海
  const mountains = [];
  const ridge = (dist, count, h, color) => {
    for (let i = 0; i < count; i++) {
      const a = Math.PI * (0.92 + (i / (count - 1)) * 1.16) + (rnd() - 0.5) * 0.08; // 北側の半円
      const r = dist + (rnd() - 0.5) * 60;
      const s = h * (0.7 + rnd() * 0.6);
      mountains.push({ x: Math.cos(a) * r, y: 0, z: Math.sin(a) * r, sx: s * 1.9, sy: s, sz: s * 1.6, rot: rnd() * 3, color: jitter(color, rnd, 0.08) });
    }
  };
  const hill = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  // 奥ほど空の色に近く、手前の稜線だけ墨の線（刷り物の山）
  ridge(1050, 11, 200, '#9fc0c9');
  world.add(instanced(hill, toon('#ffffff'), mountains.splice(0), { outline: 0, shadow: false }));
  ridge(840, 13, 140, '#6f9f86');
  world.add(instanced(hill, toon('#ffffff'), mountains.splice(0), { outline: 0, shadow: false }));
  ridge(640, 17, 75, '#4f8a55');
  world.add(instanced(hill, toon('#ffffff'), mountains.splice(0), { outline: 5, shadow: false }));

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1400), toon(PALETTE.gunjo));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.03, 262 + 700);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(3000, 22), toon('#efe3c4'));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.04, 262);
  const shallows = new THREE.Mesh(new THREE.PlaneGeometry(3000, 16), toon('#5f8fc4'));
  shallows.rotation.x = -Math.PI / 2; shallows.position.set(0, 0.05, 280);
  world.add(sea, beach, shallows);
  // 海の点景: 波の線、防波堤と灯台、漁港の船、海水浴場のパラソル
  const waves = [];
  for (let i = 0; i < 320; i++) waves.push({ x: (rnd() - 0.5) * 1500, y: 0.09, z: 292 + Math.pow(rnd(), 1.6) * 520, sx: 2 + rnd() * 4, sy: 1, sz: 1, rot: (rnd() - 0.5) * 0.15 });
  world.add(instanced(new THREE.BoxGeometry(1, 0.05, 0.35), new THREE.MeshBasicMaterial({ color: '#d6e6f3' }), waves, { outline: 0, shadow: false }));
  world.add(box(5, 2.2, 90, toon('#d9d6cc'), 228, 1.1, 318));           // 防波堤（漁港を囲む）
  world.add(box(3.2, 13, 3.2, toon('#fbfaf4'), 228, 6.5, 366));          // 灯台
  world.add(box(4.2, 2.2, 4.2, toon('#d8402f'), 228, 14, 366));
  world.add(box(120, 1.2, 14, toon('#d9d6cc'), 160, 0.6, 270));         // 漁港の岸壁
  const boat = (x, z, rot, color) => {
    const b = new THREE.Group();
    b.add(box(9, 1.6, 3, toon('#fbfaf4'), 0, 0.8, 0));
    b.add(box(3, 2.2, 2.4, toon(color), -1, 2.4, 0));
    b.add(box(0.2, 5, 0.2, toon('#7a5a40'), 2.5, 3.5, 0));
    b.position.set(x, 0, z); b.rotation.y = rot;
    world.add(b);
  };
  [[118, 284, 0.1, '#c8463a'], [138, 285, -0.05, PALETTE.gunjo], [160, 284, 0.08, '#e3a62b'], [182, 286, 0, '#4a8a5a']].forEach((a) => boat(...a));
  boat(-180, 420, 0.6, '#c8463a'); boat(260, 520, -0.4, PALETTE.gunjo);
  const parasols = [];
  for (let i = 0; i < 12; i++) parasols.push({ x: -250 + i * 17 + rnd() * 6, y: 2.6, z: 258 + rnd() * 8, sx: 2.2, sy: 0.9, sz: 2.2, color: new THREE.Color(['#d8503e', '#fbfaf4', '#3a6aa0', '#e3a62b'][i % 4]) });
  world.add(instanced(new THREE.ConeGeometry(1, 1, 10), toon('#ffffff'), parasols, { outline: 0.08 }));
  world.add(instanced(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 4).translate(0, -1.3, 0), toon('#efe9da'), parasols.map((p) => ({ x: p.x, y: 2.6, z: p.z })), { outline: 0 }));

  // 電柱と電線（昭和の空）
  const poles = [];
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) for (let t = -HALF + 15; t < HALF; t += 30) poles.push({ x: t, z: k + 5 }, { x: k + 5, z: t });
  world.add(instanced(new THREE.CylinderGeometry(0.11, 0.15, 9, 6).translate(0, 4.5, 0), toon('#8d8577'), poles, { outline: 0.05 }));
  const wirePts = [];
  for (let k = -HALF; k <= HALF; k += ROAD_STEP) {
    for (const off of [8.3, 8.8]) {
      wirePts.push(new THREE.Vector3(-HALF + 15, off, k + 5), new THREE.Vector3(HALF - 15, off, k + 5));
      wirePts.push(new THREE.Vector3(k + 5, off, -HALF + 15), new THREE.Vector3(k + 5, off, HALF - 15));
    }
  }
  world.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wirePts), new THREE.LineBasicMaterial({ color: '#3a4250', transparent: true, opacity: 0.28 })));

  // 街灯（夜に灯る）
  const lampMat = new THREE.MeshBasicMaterial({ color: '#fff2c8' });
  nightMats.push({ basic: lampMat, day: '#e8e4d8', night: '#ffd27a' });
  const lamps = [];
  // 電柱1本おきに、腕木の先の灯り
  poles.forEach((p, i) => { if (i % 2 === 0) lamps.push({ x: p.x, y: 7.4, z: p.z - 0.9 }); });
  world.add(instanced(new THREE.SphereGeometry(0.45, 8, 6), lampMat, lamps, { outline: 0, shadow: false }));

  // 住宅（壁＋切妻の瓦屋根＋窓）
  const houses = buildHouses(seed);
  const wallTex = windowTextures(3, 2, { door: true, lit: 0.6 }, rnd);
  const wallMat = toon('#ffffff', { map: wallTex.map, emissive: new THREE.Color('#ffc46b'), emissiveMap: wallTex.emissiveMap, emissiveIntensity: 0 });
  nightMats.push({ emissive: wallMat, max: 1.3 });
  const WALLS = ['#f4efe2', '#ece3cf', '#e2e6e2', '#f1e6d8', '#dfe5ea', '#efe9da'];
  const ROOFS = [PALETTE.aonibi, '#4e5d6e', '#6c5a4c', '#3f6a78', '#7b4b3a', '#5d6e7e'];
  const walls = [], roofs = [], parts = [];
  for (const h of houses) {
    const wallColor = jitter(WALLS[Math.floor(rnd() * WALLS.length)], rnd);
    const roofColor = jitter(ROOFS[Math.floor(rnd() * ROOFS.length)], rnd);
    const fx = Math.sin(h.rot), fz = Math.cos(h.rot);  // 正面（道の側）
    const rx = Math.cos(h.rot), rz = -Math.sin(h.rot); // 右手
    const at = (f, r, y, sx, sy, sz, color, rot = h.rot) => parts.push({ x: h.x + fx * f + rx * r, y, z: h.z + fz * f + rz * r, sx, sy, sz, rot, color });
    walls.push({ x: h.x, y: h.h / 2, z: h.z, sx: h.w, sy: h.h, sz: h.d, rot: h.rot, color: wallColor });
    // 切妻の棟は長い辺に沿う。軒を 0.8m 出す
    roofs.push({ x: h.x, y: h.h, z: h.z, sx: h.d + 1.6, sy: h.roofH, sz: h.w + 1.6, rot: h.rot + Math.PI / 2, color: roofColor });
    if (h.type === 'hira') {
      at(h.d / 2 + 0.7, 0, 0.35, h.w * 0.8, 0.3, 1.4, jitter('#b08a62', rnd)); // 縁側
      if (rnd() < 0.7) at(h.d / 2 + 2.6, 0, 0.6, h.w + 1, 1.2, 0.9, jitter('#4f7d4f', rnd)); // 生垣
    } else if (h.type === 'niko') {
      at(h.d / 2 + 0.4, 0, 3.1, h.w * 0.9, 0.25, 0.9, roofColor.clone()); // 一階の庇
      if (rnd() < 0.5) at(h.d / 2 + 2.6, 0, 0.6, h.w + 1, 1.2, 0.9, jitter('#4f7d4f', rnd));
    } else if (h.type === 'apart') {
      at(h.d / 2 + 0.6, 0, 3.0, h.w, 0.25, 1.4, jitter('#e9e6dc', rnd));          // 二階の外廊下
      at(h.d / 2 + 1.25, 0, 3.6, h.w, 0.8, 0.12, jitter('#8d9aa6', rnd));        // 手すり
      at(h.d / 2 + 0.9, h.w / 2 + 0.8, 1.6, 1.2, 0.2, 4.2, jitter('#8d9aa6', rnd)); // 外階段
    } else if (h.type === 'mise') {
      const shop = ['#d8503e', '#3a6aa0', '#e3a62b', '#4a8a5a', '#a0522d'][Math.floor(rnd() * 5)];
      at(h.d / 2 + 0.9, 0, 2.8, h.w, 0.2, 1.8, jitter(shop, rnd));               // 店先のテント
      at(h.d / 2 + 0.06, 0, 4.4, h.w * 0.8, 1.0, 0.12, jitter('#fbfaf4', rnd));  // 看板
    }
  }
  world.add(instanced(new THREE.BoxGeometry(1, 1, 1), wallMat, walls, { outline: 0.1 }));
  world.add(instanced(GABLE, toon('#ffffff'), roofs, { outline: 0.12 }));
  world.add(instanced(new THREE.BoxGeometry(1, 1, 1), toon('#ffffff'), parts, { outline: 0.06 }));

  // 施設
  for (const p of PLACES) world.add(buildPlace(p, rnd, nightMats));

  // 木（丸い玉の2段）と、県庁通りの桜並木
  const trees = [];
  const nearRoad = (v) => Math.abs(v - Math.round(v / ROAD_STEP) * ROAD_STEP) < 9;
  const blocked = (x, z) => PLACES.some((p) => Math.abs(x - p.x) < p.w / 2 + 3 && Math.abs(z - p.z) < p.d / 2 + 3 && p.kind !== 'park')
    || houses.some((h) => Math.abs(h.x - x) < 7 && Math.abs(h.z - z) < 7);
  for (let i = 0; i < 420 && trees.length < 230; i++) {
    const x = (rnd() - 0.5) * (HALF * 2 + 160), z = -HALF - 80 + rnd() * (HALF * 2 + 110);
    if ((nearRoad(x) || nearRoad(z)) && Math.abs(x) <= HALF + 5 && Math.abs(z) <= HALF + 5) continue;
    if (blocked(x, z)) continue;
    trees.push({ x, z, s: 0.8 + rnd() * 0.7, kind: 'tree' });
  }
  const park = PLACES.find((p) => p.id === 'park');
  for (let i = 0; i < 14; i++) trees.push({ x: park.x + (rnd() - 0.5) * park.w * 0.9, z: park.z + (rnd() - 0.5) * park.d * 0.9, s: 1 + rnd() * 0.5, kind: rnd() < 0.5 ? 'sakura' : 'tree' });
  // 桜並木: 県庁の前の通り（z=0）の両側
  for (let x = -HALF + 10; x < HALF; x += 9) {
    if (nearRoad(x)) continue;
    for (const side of [-7.5, 7.5]) trees.push({ x: x + (rnd() - 0.5) * 2, z: side, s: 1.05 + rnd() * 0.25, kind: 'sakura' });
  }
  const trunks = [], crowns = [], tops = [];
  for (const t of trees) {
    const leaf = t.kind === 'sakura' ? jitter(PALETTE.sakura, rnd, 0.08) : jitter(rnd() < 0.5 ? PALETTE.wakatake : '#6fa865', rnd, 0.12);
    trunks.push({ x: t.x, y: 0, z: t.z, sx: t.s, sy: t.s, sz: t.s });
    crowns.push({ x: t.x, y: 3.6 * t.s, z: t.z, sx: 2.6 * t.s, sy: 2.2 * t.s, sz: 2.6 * t.s, color: leaf });
    tops.push({ x: t.x + 0.4 * t.s, y: 5.4 * t.s, z: t.z - 0.3 * t.s, sx: 1.7 * t.s, sy: 1.5 * t.s, sz: 1.7 * t.s, color: leaf.clone().offsetHSL(0, 0, 0.06) });
  }
  world.add(instanced(new THREE.CylinderGeometry(0.28, 0.38, 3, 6).translate(0, 1.5, 0), toon('#7a5a40'), trunks, { outline: 0.05 }));
  const ball = new THREE.IcosahedronGeometry(1, 1);
  world.add(instanced(ball, toon('#ffffff'), crowns, { outline: 0.12 }));
  world.add(instanced(ball, toon('#ffffff'), tops, { outline: 0.1 }));

  // 雲（唯一の、何もしなくても動く飾り）
  const clouds = new THREE.Group();
  const cloudMat = toon('#ffffff');
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const m = new THREE.Mesh(ball, cloudMat);
      m.scale.set(14 + rnd() * 10, 6 + rnd() * 4, 10 + rnd() * 6);
      m.position.set(j * 14 - 20, rnd() * 4, (rnd() - 0.5) * 8);
      c.add(m);
    }
    c.position.set((rnd() - 0.5) * 1200, 150 + rnd() * 60, -500 + rnd() * 900);
    clouds.add(c);
  }
  scene.add(clouds);

  const office = buildOffice(world);

  return {
    world, ground, office,
    // 時刻の反映: day 0（夜）〜1（昼）、dusk 0〜1（夕方らしさ）
    setDaylight(day, dusk) {
      const night = 1 - day;
      for (const n of nightMats) {
        if (n.emissive) n.emissive.emissiveIntensity = Math.max(0, night - 0.25) * (n.max || 1) * 1.4;
        if (n.basic) n.basic.color.set(night > 0.45 ? n.night : n.day);
      }
      const top = new THREE.Color('#203a6b').lerp(new THREE.Color(PALETTE.asagi), day);
      const bottom = new THREE.Color('#4a5f8f').lerp(new THREE.Color('#eef6f4'), day).lerp(new THREE.Color('#f6c99a'), dusk * 0.7);
      skyMat.uniforms.top.value.copy(top);
      skyMat.uniforms.bottom.value.copy(bottom);
      return bottom;
    },
    tick(dt) {
      for (const c of clouds.children) { c.position.x += dt * 3; if (c.position.x > 700) c.position.x = -700; }
    },
  };
}

// ---- 施設 -----------------------------------------------------------------------
function buildPlace(p, rnd, nightMats) {
  const g = new THREE.Group();
  const front = p.z + p.d / 2 + 0.05; // 南（+z）側が正面
  const wallColor = jitter(p.color, rnd, 0.04);
  const lit = (cols, rows, opts) => {
    const t = windowTextures(cols, rows, opts, rnd);
    const m = toon(wallColor, { map: t.map, emissive: new THREE.Color('#ffc46b'), emissiveMap: t.emissiveMap, emissiveIntensity: 0 });
    nightMats.push({ emissive: m, max: 0.8 });
    return m;
  };
  const plain = toon(wallColor);
  const roofGray = toon('#8c939a');
  const facade = (w, h, d, x, y, z, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [plain, plain, roofGray, plain, mat, plain]);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
    const o = new THREE.Mesh(m.geometry, INK); o.scale.set(1 + 0.12 / w, 1 + 0.12 / h, 1 + 0.12 / d); o.position.copy(m.position);
    g.add(m, o);
  };
  const gable = (w, d, h, y, color, x = p.x, z = p.z) => {
    const r = inked(GABLE, toon(color), { outline: 0.15, scale: [w, h, d] });
    r.position.set(x, y, z);
    g.add(r);
  };

  switch (p.kind) {
    case 'kencho': {
      facade(p.w, p.h, p.d, p.x, p.h / 2, p.z, lit(14, 6, { lit: 0.35 }));
      g.add(box(p.w + 1, 0.8, p.d + 1, toon('#e9e6dc'), p.x, p.h + 0.4, p.z)); // 屋上のへり
      g.add(box(8, 9, 8, toon('#f2efe6'), p.x, p.h + 4.5, p.z)); // 時計塔
      gable(9, 9, 3, p.h + 9, '#3f6a78');
      const clock = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: PALETTE.gofun }));
      clock.position.set(p.x, p.h + 5, p.z + 4.08); g.add(clock);
      const hands = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 1.8), new THREE.MeshBasicMaterial({ color: PALETTE.sumi }));
      hands.position.set(p.x, p.h + 5.6, p.z + 4.1); g.add(hands);
      g.add(box(0.2, 11, 0.2, toon('#dddddd'), p.x + 19, 5.5, front + 5));
      g.add(signBoard('', p.x + 20.5, 10, front + 5, 3, 2, { bg: '#ffffff' }));
      g.add(signBoard(p.sign, p.x, 4.5, front + 0.06, 15, 2.4, { bg: PALETTE.gunjo, fg: PALETTE.gofun }));
      break;
    }
    case 'office': {
      // 執務フロア: 屋根なしで中が見える（CP の作業がそのまま見える）
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), toon('#d9cfb9'));
      floor.rotation.x = -Math.PI / 2; floor.position.set(p.x, 0.1, p.z); floor.receiveShadow = true;
      g.add(floor);
      const wm = toon('#f2efe6');
      g.add(box(p.w, 1.4, 0.4, wm, p.x, 0.7, p.z - p.d / 2));
      g.add(box(0.4, 1.4, p.d, wm, p.x - p.w / 2, 0.7, p.z));
      g.add(box(0.4, 1.4, p.d, wm, p.x + p.w / 2, 0.7, p.z));
      g.add(box(p.w / 2 - 4, 1.4, 0.4, wm, p.x - p.w / 4 - 2, 0.7, p.z + p.d / 2));
      g.add(box(p.w / 2 - 4, 1.4, 0.4, wm, p.x + p.w / 4 + 2, 0.7, p.z + p.d / 2));
      break;
    }
    case 'park': {
      const lawn = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), toon('#9cc767'));
      lawn.rotation.x = -Math.PI / 2; lawn.position.set(p.x, 0.08, p.z);
      g.add(lawn);
      const pond = new THREE.Mesh(new THREE.CircleGeometry(6, 24), toon('#6aa6c8'));
      pond.rotation.x = -Math.PI / 2; pond.position.set(p.x - 6, 0.1, p.z - 4); g.add(pond);
      g.add(box(4, 0.5, 1, toon('#9a6a44'), p.x + 8, 0.5, p.z + 8));
      const slide = box(1.2, 0.2, 7, toon('#d8503e'), p.x + 10, 1.8, p.z - 8); slide.rotation.x = 0.5; g.add(slide);
      break;
    }
    case 'bokujo': case 'tanbo': {
      const field = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), toon(p.kind === 'tanbo' ? '#8fb84a' : '#a6cc6a'));
      field.rotation.x = -Math.PI / 2; field.position.set(p.x, 0.07, p.z);
      g.add(field);
      if (p.kind === 'tanbo') {
        for (let i = -2; i <= 2; i++) g.add(box(0.6, 0.3, p.d, toon('#a08a5a'), p.x + i * (p.w / 5), 0.15, p.z, { outline: 0 }));
        g.add(box(0.2, 2.4, 0.2, toon('#7a5a40'), p.x + 5, 1.2, p.z));
        g.add(box(2, 0.2, 0.2, toon('#7a5a40'), p.x + 5, 1.9, p.z));
        g.add(box(0.9, 0.9, 0.9, toon('#e3a62b'), p.x + 5, 2.8, p.z)); // 案山子の笠
      } else {
        g.add(box(14, 7, 10, toon('#b2402f'), p.x - 12, 3.5, p.z - 14));
        gable(15.5, 11.5, 4, 7, '#efe9da', p.x - 12, p.z - 14);
        g.add(box(3, 12, 3, toon('#c9c3b5'), p.x - 2, 6, p.z - 16)); // サイロ
        for (let i = 0; i < 8; i++) {
          const cow = box(2.2, 1.2, 1, toon(i % 3 ? '#fbfaf4' : '#3a3530'), p.x + (rnd() - 0.3) * p.w * 0.6, 1.1, p.z + (rnd() - 0.2) * p.d * 0.5);
          cow.rotation.y = rnd() * Math.PI; g.add(cow);
        }
        for (let t = 0; t < 4; t++) {
          const horiz = t % 2 === 0;
          g.add(box(horiz ? p.w : 0.2, 1, horiz ? 0.2 : p.d, toon('#fbfaf4'), p.x + (horiz ? 0 : (t === 1 ? 1 : -1) * p.w / 2), 0.8, p.z + (horiz ? (t === 0 ? 1 : -1) * p.d / 2 : 0), { outline: 0 }));
        }
      }
      if (p.sign) g.add(signBoard(p.sign, p.x, 3, p.z + p.d / 2 + 1, 8, 1.6, { bg: PALETTE.gofun, border: PALETTE.gunjo }));
      break;
    }
    default: {
      const tall = p.h > 7;
      facade(p.w, p.h, p.d, p.x, p.h / 2, p.z, tall ? lit(Math.max(2, Math.round(p.w / 4)), Math.max(1, Math.round(p.h / 4)), { lit: 0.5 }) : lit(Math.max(2, Math.round(p.w / 4)), 1, { door: true, lit: 0.8 }));
      // 低い店は切妻の瓦屋根、大きい建物は平屋根のへり
      const roofColors = { shop: '#5d6e7e', kissa: '#7b4b3a', shokudo: '#4e5d6e', sento: '#3f4f60', conbini: null, super: null, car: null, mall: null, station: '#3f6a78', school: '#7b4b3a' };
      const rc = roofColors[p.kind];
      if (rc) gable(p.w + 1.6, p.d + 1.6, p.kind === 'station' || p.kind === 'school' ? 4 : 3.2, p.h, rc);
      else g.add(box(p.w + 0.8, 0.8, p.d + 0.8, toon('#e9e6dc'), p.x, p.h + 0.4, p.z));
      const signStyle = {
        super: { bg: '#c8463a', fg: '#ffffff' }, conbini: { bg: '#2f8a5a', fg: '#ffffff' }, mall: { bg: PALETTE.gunjo, fg: '#ffffff' },
        car: { bg: '#ffffff', fg: PALETTE.gunjo, border: PALETTE.gunjo }, sento: { bg: '#2f4f80', fg: '#ffffff' }, kissa: { bg: '#5a2f1f', fg: '#f6d9a0' },
        station: { bg: '#ffffff', fg: PALETTE.sumi, border: PALETTE.sumi }, school: { bg: PALETTE.gofun, fg: PALETTE.sumi },
      }[p.kind] || { bg: PALETTE.gofun, fg: PALETTE.sumi, border: '#8a6a4a' };
      const sw = Math.min(p.w * 0.9, p.sign.length * 2.2 + 2);
      g.add(signBoard(p.sign, p.x, Math.min(p.h - 1.2, 4.6), front + 0.07, sw, Math.min(2.2, sw / 3.5), signStyle));
      if (p.kind === 'shop' || p.kind === 'kissa' || p.kind === 'shokudo') {
        const awning = box(p.w, 0.15, 2.4, toon(['#d8503e', '#3a6aa0', '#e3a62b', '#4a8a5a'][Math.floor(rnd() * 4)]), p.x, 2.9, front + 1.1);
        awning.rotation.x = 0.35; g.add(awning);
      }
      if (p.kind === 'sento') {
        const chimney = inked(new THREE.CylinderGeometry(0.9, 1.2, 22, 10), toon('#a7826c'), { outline: 0.1 });
        chimney.position.set(p.x + p.w / 2 - 2, 11, p.z - p.d / 2 + 2); g.add(chimney);
        g.add(signBoard('ゆ', p.x, 1.6, front + 0.1, 2.4, 2.4, { bg: '#2f4f80', fg: '#ffffff', w: 128, h: 128, font: `700 96px ${FONT_HEAD}` }));
      }
      if (p.kind === 'conbini') {
        for (let i = 0; i < 3; i++) g.add(box(1, 1.8, 0.8, toon(['#c8463a', '#f2efe6', '#3a6aa0'][i]), p.x + p.w / 2 + 1, 0.9, p.z + p.d / 2 - 1.2 - i * 1.1)); // 自販機
        g.add(box(0.5, 1.3, 0.5, toon('#d8402f'), p.x - p.w / 2 - 1.5, 0.65, front + 1)); // 赤いポスト
      }
      if (p.kind === 'car') {
        const carColors = ['#c8463a', '#f2efe6', PALETTE.gunjo, '#e3c35a', '#4a7a5a'];
        for (let i = 0; i < 5; i++) {
          const cg = new THREE.Group();
          cg.add(box(4.2, 1, 1.8, toon(carColors[i]), 0, 0.8, 0));
          cg.add(box(2.4, 0.8, 1.6, toon('#b8d0dc'), -0.2, 1.7, 0));
          cg.position.set(p.x - p.w / 2 + 4 + i * 6.5, 0, front + 6);
          cg.rotation.y = Math.PI / 2; g.add(cg);
        }
      }
      if (p.kind === 'station') {
        g.add(box(170, 0.4, 3, toon('#9a8f80'), p.x, 0.2, p.z + 14, { outline: 0 }));
        for (const dz of [13.3, 14.7]) g.add(box(170, 0.15, 0.15, toon('#c0c0c0'), p.x, 0.45, p.z + dz, { outline: 0 }));
        g.add(box(44, 1, 5, toon('#e9e6dc'), p.x, 0.5, p.z + 9)); // ホーム
        // 2 両の電車（クリームと朱の昭和の配色）
        for (let i = 0; i < 2; i++) {
          g.add(box(18, 3.4, 3, toon('#f2e6c8'), p.x - 10 + i * 19, 2.3, p.z + 14));
          g.add(box(18.1, 1.1, 3.05, toon('#d8503e'), p.x - 10 + i * 19, 1.3, p.z + 14, { outline: 0 }));
        }
      }
      if (p.kind === 'mall') g.add(signBoard('屋上遊園地', p.x, p.h + 2, p.z, 14, 2.4, { bg: '#e3a62b', fg: '#ffffff' }));
    }
  }
  return g;
}

// 執務フロアの机と部署札
function buildOffice(world) {
  const desks = buildDesks();
  const items = desks.map((d) => ({ x: d.x, y: 0.5, z: d.z + 0.9, sx: 2.2, sy: 0.8, sz: 1.2 }));
  world.add(instanced(new THREE.BoxGeometry(1, 1, 1), toon('#9a7a5a'), items, { outline: 0.08 }));
  const lamps = {};
  for (const dept of DEPARTMENTS) {
    const mine = desks.filter((d) => d.dept === dept.id);
    const cx = mine.reduce((s, d) => s + d.x, 0) / mine.length;
    const minZ = Math.min(...mine.map((d) => d.z));
    world.add(signBoard(dept.name, cx, 2.6, minZ - 1.6, 5, 1.2, { bg: dept.color, fg: '#fff' }));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: '#777' }));
    lamp.position.set(cx + 3, 2.6, minZ - 1.6);
    world.add(lamp);
    lamps[dept.id] = lamp;
  }
  return { desks, lamps };
}
