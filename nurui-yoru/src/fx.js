// ぬるい夜 — 画面エフェクト（単位 cm）。THREE は引数で受け取る。
export function createFX(THREE, scene, { mobile } = {}) {
  const K = mobile ? 0.5 : 1;
  const ADD = THREE.AdditiveBlending;
  const owned = []; // createFX が持つ geometry/material（dispose で捨てる）
  const own = (o) => (owned.push(o), o);

  // 丸い粒のテクスチャ（共有）
  const dotTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return own(new THREE.CanvasTexture(c));
  })();
  const ptsMat = (color, size, opacity = 1) => own(new THREE.PointsMaterial({
    color, size, map: dotTex, transparent: true, opacity, depthWrite: false, blending: ADD, sizeAttenuation: true, vertexColors: true,
  }));

  // ---------- 汎用の粒プール（burst 用） ----------
  const PN = Math.round(240 * K);
  const pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3);
  const pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pMax = new Float32Array(PN), pBase = new Float32Array(PN * 3);
  const pDrag = new Float32Array(PN);
  const pGeo = own(new THREE.BufferGeometry());
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pts = new THREE.Points(pGeo, ptsMat(0xffffff, 0.35));
  pts.frustumCulled = false; scene.add(pts);
  let pHead = 0;
  for (let i = 0; i < PN; i++) pPos[i * 3 + 1] = -1e5;
  function emit(pos, vel, life, col, drag = 2) {
    const i = pHead; pHead = (pHead + 1) % PN;
    pPos.set([pos.x, pos.y, pos.z], i * 3); pVel.set([vel.x, vel.y, vel.z], i * 3);
    pBase.set([col.r, col.g, col.b], i * 3); pLife[i] = life; pMax[i] = life; pDrag[i] = drag;
  }

  // ---------- 輪（land / bounce / slap） ----------
  const ringGeo = own(new THREE.RingGeometry(0.85, 1, 40));
  const rings = [];
  for (let i = 0; i < 6; i++) {
    const m = own(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: ADD, side: THREE.DoubleSide }));
    const r = new THREE.Mesh(ringGeo, m); r.visible = false; r.renderOrder = 5; scene.add(r);
    rings.push({ mesh: r, t: 0, dur: 1, r0: 1, r1: 4, a: 1 });
  }
  let ringHead = 0;
  function ring(pos, normal, color, r0, r1, dur, a) {
    const R = rings[ringHead]; ringHead = (ringHead + 1) % rings.length;
    R.mesh.position.copy(pos); R.mesh.material.color.set(color);
    R.mesh.lookAt(pos.clone().add(normal)); R.t = 0; R.dur = dur; R.r0 = r0; R.r1 = r1; R.a = a; R.mesh.visible = true;
  }

  // ---------- 吸血の赤い粒（口元へ吸い込まれる） ----------
  const SN = Math.round(24 * K);
  const sPos = new Float32Array(SN * 3), sCol = new Float32Array(SN * 3), sOff = new Float32Array(SN * 4);
  for (let i = 0; i < SN; i++) {
    const th = Math.random() * 6.283; sOff.set([Math.cos(th), Math.sin(th), Math.random(), 0.6 + Math.random() * 0.8], i * 4);
  }
  const sGeo = own(new THREE.BufferGeometry());
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  const suckPts = new THREE.Points(sGeo, ptsMat(0xffffff, 0.18));
  suckPts.frustumCulled = false; suckPts.material.blending = THREE.NormalBlending; scene.add(suckPts);
  let suckA = 0;

  // ---------- 羽の軌跡（短い粒の列） ----------
  const TN = Math.round(28 * K);
  const tPos = new Float32Array(TN * 3), tCol = new Float32Array(TN * 3);
  const tGeo = own(new THREE.BufferGeometry());
  tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const trail = new THREE.Points(tGeo, ptsMat(0xffffff, 0.22));
  trail.frustumCulled = false; scene.add(trail);
  let tHead = 0, tInit = false, trailAcc = 0;

  // ---------- 風圧の線（swat） ----------
  const WN = 7;
  const wPos = new Float32Array(WN * 2 * 3), wCol = new Float32Array(WN * 2 * 3), wSeed = [];
  for (let i = 0; i < WN; i++) wSeed.push({ a: (i / WN) * 6.283 + Math.random() * 0.5, r: 0.5 + Math.random() * 0.5, ph: Math.random() });
  const wGeo = own(new THREE.BufferGeometry());
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  wGeo.setAttribute('color', new THREE.BufferAttribute(wCol, 3));
  const windMat = own(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false, blending: ADD }));
  const wind = new THREE.LineSegments(wGeo, windMat); wind.frustumCulled = false; scene.add(wind);

  // ---------- 面ごとのもの ----------
  let stage = null; // { group, disposables[], dust, ... }
  let prevFog = null, fogBase = null;
  const fogTense = new THREE.Color(0x2a1c2e);

  function clearStage() {
    if (!stage) return;
    scene.remove(stage.group);
    stage.disposables.forEach((d) => d.dispose());
    stage = null;
    if (prevFog !== undefined) scene.fog = prevFog; // 前の fog に戻す
  }

  function setStage({ roomW, roomH, roomD, windowPos, windowSize, moonDir }) {
    clearStage();
    const group = new THREE.Group(); const disposables = [];
    const d = (x) => (disposables.push(x), x);
    const md = moonDir.clone().normalize();
    const ww = windowSize.w, wh = windowSize.h;

    // 月光の筋：窓の矩形から moonDir 方向に伸ばした台形の板（2枚＋上下の面を省いた筒）
    const len = Math.max(roomW, roomH, roomD) * 1.1;
    const shaftMat = d(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0x8fa8d8) }, uA: { value: 0.3 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uColor; uniform float uA;
        void main(){ float along=vUv.y; float edge=sin(vUv.x*3.14159);
          float flick=0.9+0.1*sin(uTime*0.7+vUv.x*9.0);
          float a=uA*edge*(1.0-along)*(1.0-along)*flick; gl_FragColor=vec4(uColor*a,a);} `,
    }));
    // 窓の4辺から筒をつくる（側面4枚をひとつの geometry に）
    const right = new THREE.Vector3().crossVectors(md, new THREE.Vector3(0, 1, 0));
    if (right.lengthSq() < 1e-4) right.set(1, 0, 0); right.normalize();
    // 窓は壁に沿うので、moonDir の水平成分のうち大きい軸を壁の法線にする
    const wNormal = Math.abs(md.x) > Math.abs(md.z) ? new THREE.Vector3(Math.sign(md.x), 0, 0) : new THREE.Vector3(0, 0, Math.sign(md.z) || 1);
    const wRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), wNormal).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
      windowPos.clone().addScaledVector(wRight, (a * ww) / 2).addScaledVector(up, (b * wh) / 2));
    const spread = 1.25;
    const far = corners.map((c) => c.clone().addScaledVector(md, len).addScaledVector(c.clone().sub(windowPos), spread - 1));
    const pos = [], uv = [], idx = [];
    for (let s = 0; s < 4; s++) {
      const a = corners[s], b = corners[(s + 1) % 4], fa = far[s], fb = far[(s + 1) % 4], o = pos.length / 3;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, fb.x, fb.y, fb.z, fa.x, fa.y, fa.z);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    }
    // 中央の板（体積感）
    { const o = pos.length / 3, a = corners[0].clone().lerp(corners[3], 0.5), b = corners[1].clone().lerp(corners[2], 0.5);
      const fa = far[0].clone().lerp(far[3], 0.5), fb = far[1].clone().lerp(far[2], 0.5);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, fb.x, fb.y, fb.z, fa.x, fa.y, fa.z); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
    const shGeo = d(new THREE.BufferGeometry());
    shGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    shGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); shGeo.setIndex(idx);
    const shaft = new THREE.Mesh(shGeo, shaftMat); shaft.renderOrder = 2; group.add(shaft);

    // ほこり：筒の中に散らす
    const DN = Math.round(220 * K);
    const dPos = new Float32Array(DN * 3), dCol = new Float32Array(DN * 3), dT = new Float32Array(DN * 3);
    const dGeo = d(new THREE.BufferGeometry());
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
    for (let i = 0; i < DN; i++) dT.set([Math.random(), Math.random(), Math.random() * 0.85], i * 3);
    const dMat = d(new THREE.PointsMaterial({ size: 0.6, map: dotTex, transparent: true, depthWrite: false, blending: ADD, vertexColors: true }));
    const dust = new THREE.Points(dGeo, dMat); dust.frustumCulled = false; group.add(dust);

    // 出口の目印：窓枠の周りの光の枠
    const glowMat = d(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: ADD, side: THREE.DoubleSide,
      uniforms: { uK: { value: 0.3 }, uColor: { value: new THREE.Color(0x9cc4ff) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: `varying vec2 vUv; uniform float uK; uniform vec3 uColor; uniform vec2 uIn;
        void main(){ vec2 p=abs(vUv-0.5)*2.0; float m=max(p.x,p.y); float a=smoothstep(1.0,0.72,m)*smoothstep(0.55,0.72,m);
          a*=uK; gl_FragColor=vec4(uColor*a,a);} `,
    }));
    const pad = 1.6;
    const glow = new THREE.Mesh(d(new THREE.PlaneGeometry(ww * pad, wh * pad)), glowMat);
    glow.position.copy(windowPos).addScaledVector(wNormal, 0.5);
    glow.lookAt(glow.position.clone().add(wNormal)); glow.renderOrder = 3; group.add(glow);

    // fog
    prevFog = scene.fog;
    fogBase = { color: new THREE.Color(0x0b0f1c), density: 0.0016 };
    scene.fog = new THREE.FogExp2(fogBase.color.getHex(), fogBase.density);

    scene.add(group);
    stage = { group, disposables, shaftMat, glowMat, dust, dPos, dCol, dT, DN, corners, far, md, windowPos: windowPos.clone(), wNormal, ww, wh, tension: 0 };
  }

  const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _c = new THREE.Color();

  function update(dt, st) {
    dt = Math.min(dt, 0.05);
    const t = st.time ?? 0;

    if (stage) {
      const S = stage;
      S.shaftMat.uniforms.uTime.value = t;
      // ほこり：筒の中で、ゆっくり漂う（筒内座標 u,v,s で持つ）
      const [c0, c1, , c3] = S.corners;
      for (let i = 0; i < S.DN; i++) {
        const k = i * 3; let u = S.dT[k], v = S.dT[k + 1], s = S.dT[k + 2];
        u += Math.sin(t * 0.3 + i) * 0.004 * dt; v += (Math.cos(t * 0.23 + i * 1.7) * 0.006 - 0.004) * dt * 2; s += 0.006 * dt;
        if (v < 0) v += 1; if (v > 1) v -= 1; if (u < 0) u += 1; if (u > 1) u -= 1; if (s > 0.85) s = 0;
        S.dT[k] = u; S.dT[k + 1] = v; S.dT[k + 2] = s;
        // 窓面の点 → far 面の点へ
        _v.copy(c0).lerp(c1, u).addScaledVector(_w.copy(c3).sub(c0), v);
        const fx = S.far[0].clone().lerp(S.far[1], u).addScaledVector(_w.copy(S.far[3]).sub(S.far[0]), v);
        _v.lerp(fx, s);
        S.dPos[k] = _v.x; S.dPos[k + 1] = _v.y; S.dPos[k + 2] = _v.z;
        const tw = (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1)) * (1 - s) * 1.2;
        S.dCol[k] = tw * 0.75; S.dCol[k + 1] = tw * 0.85; S.dCol[k + 2] = tw;
      }
      S.dust.geometry.attributes.position.needsUpdate = true; S.dust.geometry.attributes.color.needsUpdate = true;
      // 出口の光：近いほど強く、ゆっくり明滅
      const dist = st.mosPos ? st.mosPos.distanceTo(S.windowPos) : 999;
      const near = THREE.MathUtils.clamp(1 - dist / 260, 0, 1);
      S.glowMat.uniforms.uK.value = (0.45 + 1.2 * near * near) * (0.75 + 0.25 * Math.sin(t * 1.6));
      // 緊張：alertMax>=3
      const target = (st.alertMax ?? 0) >= 3 ? ((st.alertMax - 2) / 2) : 0;
      S.tension += (target - S.tension) * Math.min(1, dt * 1.5);
      if (scene.fog && scene.fog.isFogExp2) {
        scene.fog.color.copy(fogBase.color).lerp(fogTense, S.tension * 0.8);
        scene.fog.density = fogBase.density * (1 + S.tension * 0.9);
      }
      S.shaftMat.uniforms.uA.value = 0.3 * (1 - S.tension * 0.35);
    }

    // 粒プール
    for (let i = 0; i < PN; i++) {
      const k = i * 3;
      if (pLife[i] <= 0) { pCol[k] = pCol[k + 1] = pCol[k + 2] = 0; continue; }
      pLife[i] -= dt; const f = Math.max(0, pLife[i] / pMax[i]), dr = Math.exp(-pDrag[i] * dt);
      pVel[k] *= dr; pVel[k + 1] = pVel[k + 1] * dr - 4 * dt; pVel[k + 2] *= dr;
      pPos[k] += pVel[k] * dt; pPos[k + 1] += pVel[k + 1] * dt; pPos[k + 2] += pVel[k + 2] * dt;
      pCol[k] = pBase[k] * f; pCol[k + 1] = pBase[k + 1] * f; pCol[k + 2] = pBase[k + 2] * f;
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;

    // 輪
    for (const R of rings) {
      if (!R.mesh.visible) continue;
      R.t += dt; const f = R.t / R.dur;
      if (f >= 1) { R.mesh.visible = false; continue; }
      const e = 1 - Math.pow(1 - f, 3);
      R.mesh.scale.setScalar(R.r0 + (R.r1 - R.r0) * e); R.mesh.material.opacity = R.a * (1 - f);
    }

    // 吸血
    const mp = st.mosPos;
    suckA += ((st.sucking ? 1 : 0) - suckA) * Math.min(1, dt * 4);
    for (let i = 0; i < SN; i++) {
      const k = i * 3, o = i * 4;
      let ph = (sOff[o + 2] + t * 0.7 * sOff[o + 3]) % 1; // 0→1 で口元へ
      const r = (1 - ph) * 1.1, a = sOff[o] , b = sOff[o + 1], sw = ph * 4;
      const ca = Math.cos(sw), sa = Math.sin(sw);
      if (mp) {
        sPos[k] = mp.x + (a * ca - b * sa) * r; sPos[k + 1] = mp.y - 0.35 - (1 - ph) * 0.3; sPos[k + 2] = mp.z + (a * sa + b * ca) * r;
      }
      const v = suckA * Math.sin(ph * Math.PI) * (0.7 + 0.3 * (st.blood01 ?? 0));
      sCol[k] = 0.85 * v; sCol[k + 1] = 0.05 * v; sCol[k + 2] = 0.08 * v;
    }
    suckPts.material.opacity = suckA; suckPts.visible = suckA > 0.01;
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;

    // 軌跡
    if (mp) {
      if (!tInit) { for (let i = 0; i < TN; i++) tPos.set([mp.x, mp.y, mp.z], i * 3); tInit = true; }
      const sp = st.mosVel ? st.mosVel.length() : 0;
      const fast = st.landed ? 0 : THREE.MathUtils.clamp((sp - 40) / 120, 0, 1);
      trailAcc += dt;
      if (trailAcc > 1 / 60) {
        trailAcc = 0;
        const k = tHead * 3; tHead = (tHead + 1) % TN;
        const side = (tHead % 2 ? 1 : -1) * 0.35;
        tPos[k] = mp.x + (st.mosVel ? -st.mosVel.z / (sp || 1) : 0) * side; tPos[k + 1] = mp.y + 0.12;
        tPos[k + 2] = mp.z + (st.mosVel ? st.mosVel.x / (sp || 1) : 0) * side;
        tCol[k] = tCol[k + 1] = tCol[k + 2] = fast * 0.5;
        tCol[k + 2] = fast * 0.6;
      }
      for (let i = 0; i < TN; i++) { const k = i * 3; tCol[k] *= 0.9; tCol[k + 1] *= 0.9; tCol[k + 2] *= 0.9; }
      tGeo.attributes.position.needsUpdate = true; tGeo.attributes.color.needsUpdate = true;
    }

    // 風圧の線：at の真上から影の円（at）へ
    const sw = st.swat;
    if (sw && sw.at) {
      wind.visible = true;
      const k01 = THREE.MathUtils.clamp(sw.k, 0, 1), H = 40 * (1 - k01) + 4;
      for (let i = 0; i < WN; i++) {
        const s = wSeed[i], R = 9 * s.r * (0.6 + 0.4 * (1 - k01));
        const x = sw.at.x + Math.cos(s.a) * R, z = sw.at.z + Math.sin(s.a) * R;
        const ph = (t * 3 + s.ph) % 1, y0 = sw.at.y + H * (1 - ph), y1 = y0 - 6 - 10 * k01;
        const o = i * 6;
        wPos[o] = x; wPos[o + 1] = y0; wPos[o + 2] = z;
        wPos[o + 3] = x + (sw.at.x - x) * 0.25; wPos[o + 4] = Math.max(sw.at.y, y1); wPos[o + 5] = z + (sw.at.z - z) * 0.25;
        const a = 0.25 + 0.6 * k01;
        wCol[o] = wCol[o + 1] = wCol[o + 2] = 0; wCol.fill(a, o + 3, o + 6);
      }
      wGeo.attributes.position.needsUpdate = true; wGeo.attributes.color.needsUpdate = true;
    } else wind.visible = false;
  }

  const UP = new THREE.Vector3(0, 1, 0);
  function burst(kind, pos) {
    if (!pos) return;
    const p = pos.clone ? pos.clone() : new THREE.Vector3(pos.x, pos.y, pos.z);
    const n = (x) => Math.max(1, Math.round(x * K));
    if (kind === 'land') {
      ring(p.clone().add(new THREE.Vector3(0, 0.05, 0)), UP, 0xcfe0ff, 0.3, 2.2, 0.6, 0.6);
    } else if (kind === 'bounce') {
      ring(p, UP, 0xffe0b0, 0.4, 3.2, 0.35, 0.9);
      _c.set(0xffe2b8);
      for (let i = 0; i < n(14); i++) { const a = Math.random() * 6.283;
        emit(p, _v.set(Math.cos(a) * 25, 10 + Math.random() * 15, Math.sin(a) * 25), 0.4 + Math.random() * 0.2, _c, 5); }
    } else if (kind === 'miss') {
      _c.set(0xaab8d0);
      for (let i = 0; i < n(40); i++) { const a = Math.random() * 6.283, r = Math.random() * 6;
        _w.set(p.x + Math.cos(a) * r, p.y + 0.3, p.z + Math.sin(a) * r);
        emit(_w, _v.set(Math.cos(a) * (30 + Math.random() * 40), 5 + Math.random() * 10, Math.sin(a) * (30 + Math.random() * 40)), 0.7 + Math.random() * 0.4, _c, 3); }
      ring(p.clone().add(new THREE.Vector3(0, 0.2, 0)), UP, 0x8899bb, 2, 14, 0.5, 0.35);
    } else if (kind === 'slap') {
      ring(p.clone().add(new THREE.Vector3(0, 0.3, 0)), UP, 0xffffff, 1, 16, 0.45, 1.0);
      ring(p.clone().add(new THREE.Vector3(0, 0.3, 0)), UP, 0xffffff, 0.5, 8, 0.3, 0.8);
      _c.set(0xffffff);
      for (let i = 0; i < n(24); i++) { const a = Math.random() * 6.283;
        emit(p, _v.set(Math.cos(a) * 50, 8 + Math.random() * 20, Math.sin(a) * 50), 0.35, _c, 6); }
    } else if (kind === 'clear') {
      const dir = stage ? stage.windowPos.clone().sub(p).normalize() : UP.clone();
      _c.set(0xb8d4ff);
      for (let i = 0; i < n(60); i++) {
        _w.set(p.x + (Math.random() - 0.5) * 6, p.y + (Math.random() - 0.5) * 6, p.z + (Math.random() - 0.5) * 6);
        const s = 60 + Math.random() * 90;
        emit(_w, _v.copy(dir).multiplyScalar(s).add(new THREE.Vector3((Math.random() - 0.5) * 20, 8, (Math.random() - 0.5) * 20)), 1.2 + Math.random() * 0.8, _c, 0.6);
      }
    }
  }

  function dispose() {
    clearStage();
    [pts, suckPts, trail, wind, ...rings.map((r) => r.mesh)].forEach((o) => scene.remove(o));
    owned.forEach((o) => o.dispose());
  }

  return { setStage, update, burst, dispose };
}
