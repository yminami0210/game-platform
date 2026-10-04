// ステージの描画。内部 256×144 のキャンバスに描き、画面へ整数倍で拡大する（地図と物語は 384×216 の別キャンバス）。
// core の state を読むだけで、書き換えない（パーティクル等の演出はここで持つ）。
import { T } from '../core/level.js';
import { PAL, bake } from './sprites.js';
import { THEMES } from './themes.js';

const TS = 16;
// 決定的なハッシュ（見た目の揺れ用。毎フレーム同じ結果になる）
const hash = (x, y, k = 0) => { let h = (x * 374761393 + y * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function createRenderer(canvas, view) {
  const W = view.w, H = view.h;
  const screen = canvas.getContext('2d');
  const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
  const g = buf.getContext('2d');
  const big = document.createElement('canvas'); big.width = 384; big.height = 216; // 地図・物語用
  const bigCtx = big.getContext('2d');
  let playerSpr = null; // 設定画から作ったツギのドット絵（sprite.json）
  const spr = bake(document);
  const cloth = makeClothTexture(W, H);
  const fx = { parts: [], pops: [], flash: 0, sx: 1, sy: 1, banner: null };
  let level = null, terrain = null, theme = THEMES.meadow, bg = null, scale = 1, ox = 0, oy = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.floor(window.innerWidth * dpr), ch = Math.floor(window.innerHeight * dpr);
    canvas.width = cw; canvas.height = ch;
    const s = Math.min(cw / W, ch / H);
    // 整数倍がくっきり。ただし画面の15%以上が余るなら、少しにじんでも大きく出す
    scale = s >= 1 && Math.floor(s) / s >= 0.85 ? Math.floor(s) : s;
    ox = Math.floor((cw - W * scale) / 2); oy = Math.floor((ch - H * scale) / 2);
  }
  window.addEventListener('resize', resize); resize();

  function setLevel(L) {
    level = L; theme = THEMES[L.theme] ?? THEMES.meadow;
    terrain = buildTerrain(L, theme);
    bg = buildBackground(theme, W, H);
    fx.parts.length = 0; fx.pops.length = 0;
  }

  // ---- 演出（イベントから） ----
  function puff(x, y, n, color, spread = 40, up = 30, life = 0.4, size = 2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      fx.parts.push({ x, y, vx: Math.cos(a) * spread * Math.random(), vy: -up * Math.random() - 5, g: 60, life, max: life, color, size });
    }
  }
  function threads(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      fx.parts.push({ x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 120, g: 380, life: 0.6, max: 0.6, color: colors[i % colors.length], size: 1, line: true });
    }
  }
  function pop(x, y, text, color = PAL.n) { fx.pops.push({ x, y, text, color, t: 0 }); }

  function onEvents(evs, s) {
    for (const e of evs) {
      switch (e.type) {
        case 'jump': fx.sx = 0.78; fx.sy = 1.22; puff(e.x, e.y, e.run ? 6 : 4, theme.top, 30, 12, 0.3); break;
        case 'land': { const k = Math.min(1, e.v / 330); fx.sx = 1 + 0.35 * k; fx.sy = 1 - 0.3 * k; if (k > 0.3) puff(e.x, e.y, 3 + Math.round(k * 5), PAL.N, 45, 10, 0.35); break; }
        case 'spring': fx.sx = 0.7; fx.sy = 1.35; puff(e.x, e.y, 6, PAL.r, 50, 20, 0.35); break;
        case 'stomp': threads(e.x, e.y, 6, [PAL.R, PAL.n, PAL.a]); puff(e.x, e.y, 5, PAL.O, 50, 25, 0.35); if (e.combo > 1) pop(e.x, e.y - 8, `${e.combo}れんぞく`, PAL.y); break;
        case 'kill': threads(e.x, e.y, 5, [PAL.n, PAL.R]); break;
        case 'coin': puff(e.x, e.y, 3, PAL.y, 30, 30, 0.3, 1); break;
        case 'medal': puff(e.x, e.y, 14, PAL.y, 80, 60, 0.7, 2); fx.flash = 0.12; pop(e.x, e.y - 12, `金ボタン ${s.medals.filter(Boolean).length}/3`, PAL.y); break;
        case 'box': fx.bump = { x: e.x, y: e.y, t: 0 }; break;
        case 'power': puff(e.x, e.y, 16, PAL.O, 70, 50, 0.6, 2); pop(e.x, e.y - 12, '綿毛', PAL.O); break;
        case 'powerdown': puff(e.x, e.y, 18, PAL.O, 90, 60, 0.8, 2); break;
        case 'die': threads(e.x, e.y, 10, [PAL.R, PAL.n, PAL.A]); fx.flash = 0.1; break;
        case 'checkpoint': puff(e.x, e.y - 16, 10, PAL.R, 50, 50, 0.5); pop(e.x, e.y - 30, '待ち針', PAL.n); break;
        case 'crumble': { const tx = e.i % level.w, ty = Math.floor(e.i / level.w); threads(tx * TS + 8, ty * TS + 4, 6, [PAL.N, PAL.n, PAL.W]); break; }
        case 'switch': puff(e.x, e.y, 8, e.sw ? PAL.B : PAL.R, 50, 30, 0.35); break;
        case 'bosshit': threads(e.x, e.y, 14, [PAL.M, PAL.m, PAL.n]); fx.flash = 0.08; break;
        case 'bossdown': puff(e.x, e.y, 40, PAL.m, 120, 80, 1.4, 2); break;
        case 'bossland': puff(e.x, e.y, 10, PAL.N, 70, 20, 0.5); break;
        case 'steam': fx.parts.push({ x: e.x + (Math.random() - 0.5) * 8, y: e.y, vx: 0, vy: -40, g: 0, life: 0.4, max: 0.4, color: PAL.O, size: 2 }); break;
        case 'clear': fx.banner = { text: e.exit === 'secret' ? 'ひみつの出口' : e.exit === 'knot' ? '結び玉をとりもどした' : 'むすんだ', t: 0 }; break;
      }
    }
  }

  // ---- 描画 ----
  function draw(s, dt, t) {
    const V = s.cam;
    let cx = Math.round(V.x), cy = Math.round(V.y);
    if (s.shake > 0) { cx += Math.round((Math.random() - 0.5) * s.shake * 2); cy += Math.round((Math.random() - 0.5) * s.shake * 2); }
    // 空と背景
    g.drawImage(bg.sky, 0, 0);
    // 背景はカメラが下端にいるときを基準に、上へ行くほど少しだけ下がる（視差）
    const up = Math.max(0, level.ph - H - cy);
    drawStrip(bg.clouds, cx * 0.08 + t * 3, 0, 8 + up * 0.04);
    drawStrip(bg.far, cx * 0.18, 0, H - bg.far.height - 22 + up * 0.12);
    drawStrip(bg.props, cx * 0.3, 0, H - bg.props.height - 26 + up * 0.2);
    drawStrip(bg.near, cx * 0.45, 0, H - bg.near.height - 34 + up * 0.3);
    // 地形（焼いたもの）
    g.drawImage(terrain, cx, cy, W, H, 0, 0, W, H);
    g.save(); g.translate(-cx, -cy);
    drawTracks(s);
    drawDynamicTiles(s, cx, cy, t);
    drawEntities(s, t);
    drawItems(s, t);
    for (const e of s.enemies) drawEnemy(e, t);
    if (s.boss) drawBoss(s.boss, t);
    drawPlayer(s, dt, t);
    for (const o of s.shots) drawShot(o);
    drawParticles(dt);
    drawFakeWalls(s, cx, cy);
    drawPops(dt);
    g.restore();
    // 布の質感（1枚を全体に重ねる）
    g.globalAlpha = 0.5; g.drawImage(cloth, 0, 0); g.globalAlpha = 1;
    if (fx.flash > 0) { g.fillStyle = `rgba(247,243,234,${Math.min(0.5, fx.flash * 4)})`; g.fillRect(0, 0, W, H); fx.flash -= dt; }
    present();
  }

  function present(src = buf) {
    screen.imageSmoothingEnabled = false;
    screen.fillStyle = '#1b2a44'; screen.fillRect(0, 0, canvas.width, canvas.height);
    screen.drawImage(src, ox, oy, W * scale, H * scale);
  }
  function setPlayerSprite(json) {
    const out = {};
    for (const [name, rows] of Object.entries(json.frames)) {
      const make = flip => {
        const c = document.createElement('canvas'); c.width = json.w; c.height = json.h;
        const cg = c.getContext('2d');
        rows.forEach((r, y) => [...r].forEach((ch, x) => { const col = json.palette[ch]; if (!col || ch === '.') return; cg.fillStyle = col; cg.fillRect(flip ? json.w - 1 - x : x, y, 1, 1); }));
        return c;
      };
      out[name] = { r: make(false), l: make(true), w: json.w, h: json.h };
    }
    playerSpr = out;
  }

  function drawStrip(c, x, y, top) {
    const w = c.width;
    let sx = Math.floor(x % w); if (sx < 0) sx += w;
    g.drawImage(c, -sx, Math.round(top)); g.drawImage(c, w - sx, Math.round(top));
  }

  function drawTracks(s) {
    // ファスナーの線路（動く範囲が見える）
    for (const m of s.movers) {
      g.fillStyle = PAL.k;
      if (m.vert) {
        const x = m.x0 + 23;
        for (let y = m.y0 - m.range; y <= m.y0 + 4; y += 3) { g.fillRect(x, y, 2, 2); g.fillRect(x + 2, y + 1, 1, 1); }
      } else {
        const y = m.y0 + 3;
        for (let x = m.x0; x <= m.x0 + m.range + 48; x += 3) { g.fillRect(x, y, 2, 2); g.fillRect(x + 1, y + 2, 1, 1); }
      }
    }
    // 蒸気の吹き出し口
    for (const v of s.vents) {
      const bx = v.x + 11, by = v.y + v.h - 5;
      g.fillStyle = PAL.K; g.fillRect(bx, by, 16, 5);
      g.fillStyle = v.on ? PAL.s : PAL.S; for (let i = 0; i < 4; i++) g.fillRect(bx + 2 + i * 3, by + 1, 2, 3);
      if (v.on) {
        g.fillStyle = 'rgba(247,243,234,0.28)';
        for (let i = 0; i < 9; i++) {
          const k = ((s.t * 70 + i * 23) % v.h) / v.h; // 0=吹き出し口 → 1=てっぺん
          const yy = by - k * v.h;
          const ww = 6 + k * 24 + Math.sin(s.t * 6 + i) * 3;
          g.fillRect(Math.round(v.x + 20 - ww / 2 + Math.sin(i * 2.1 + s.t) * 4), Math.round(yy), Math.round(ww), 5);
        }
      }
    }
  }

  function drawDynamicTiles(s, cx, cy, t) {
    const L = s.level;
    const x0 = Math.max(0, Math.floor(cx / TS)), x1 = Math.min(L.w - 1, Math.floor((cx + W) / TS));
    const y0 = Math.max(0, Math.floor(cy / TS)), y1 = Math.min(L.h - 1, Math.floor((cy + H) / TS));
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * L.w + tx, tt = s.tiles[i], x = tx * TS, y = ty * TS;
      switch (tt) {
        case T.COIN: { const f = Math.floor(t * 6 + tx) % 4; const c = f === 1 || f === 3 ? spr.coin2 : spr.coin1; g.drawImage(c.r, x + 4, y + 4 + Math.round(Math.sin(t * 3 + tx) * 1)); break; }
        case T.BOX_POWER: case T.BOX_COIN: drawBasket(x, y + bumpOffset(x, y), false, t); break;
        case T.BOX_USED: drawBasket(x, y + bumpOffset(x, y), true, t); break;
        case T.CRUMBLE: {
          const c = s.crumbles[L.crumbleAt.get(i)];
          const jx = c.st === 1 ? Math.round(Math.sin(c.t * 80) * 1) : 0;
          drawFrayBridge(x + jx, y + (c.st === 1 ? Math.round(c.t * 6) : 0), tx);
          break;
        }
        case T.RED: case T.BLUE: {
          const on = (tt === T.RED) === (s.sw === 0);
          drawSnapBlock(x, y, tt === T.RED ? PAL.R : PAL.B, on);
          break;
        }
      }
    }
    if (fx.bump) { fx.bump.t += 1 / 60; if (fx.bump.t > 0.15) fx.bump = null; }
  }
  function bumpOffset(x, y) { return fx.bump && Math.abs(fx.bump.x - (x + 8)) < 1 && Math.abs(fx.bump.y - y) < 1 ? -Math.round(Math.sin(fx.bump.t / 0.15 * Math.PI) * 4) : 0; }

  function drawBasket(x, y, used, t) {
    // つづら（編んだ箱）。中身ありは茜の紐で結んである
    g.fillStyle = PAL.K; g.fillRect(x, y, 16, 16);
    g.fillStyle = used ? '#6b4a33' : PAL.W; g.fillRect(x + 1, y + 1, 14, 14);
    g.fillStyle = used ? '#7d5a3f' : PAL.w;
    for (let yy = 0; yy < 14; yy += 4) for (let xx = (yy / 4) % 2 * 2; xx < 14; xx += 4) g.fillRect(x + 1 + xx, y + 1 + yy, 2, 2);
    if (!used) {
      g.fillStyle = PAL.R; g.fillRect(x + 7, y + 1, 2, 14); g.fillRect(x + 1, y + 7, 14, 2);
      g.fillStyle = PAL.r; g.fillRect(x + 6, y + 6, 4, 4);
      const k = Math.floor(t * 2) % 2; g.fillStyle = PAL.R; g.fillRect(x + 9 + k, y + 9, 2, 3);
    }
  }
  function drawFrayBridge(x, y, tx) {
    // ほつれ糸の橋: 編んだ帯と、垂れた糸
    g.fillStyle = PAL.K; g.fillRect(x, y + 1, 16, 7);
    g.fillStyle = PAL.N; g.fillRect(x, y + 2, 16, 5);
    g.fillStyle = PAL.n; for (let i = 0; i < 16; i += 4) g.fillRect(x + i + (tx % 2), y + 3, 2, 1);
    g.fillStyle = PAL.W; for (let i = 1; i < 16; i += 4) g.fillRect(x + i, y + 5, 2, 1);
    g.fillStyle = PAL.N;
    for (let i = 0; i < 3; i++) { const hx = x + 3 + i * 5, len = 3 + Math.floor(hash(tx, i) * 6); g.fillRect(hx, y + 8, 1, len); }
  }
  function drawSnapBlock(x, y, color, on) {
    if (on) {
      g.fillStyle = PAL.K; g.fillRect(x, y, 16, 16);
      g.fillStyle = color; g.fillRect(x + 1, y + 1, 14, 14);
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 1, y + 1, 14, 3);
      g.fillStyle = PAL.s; g.fillRect(x + 5, y + 5, 6, 6); g.fillStyle = PAL.S; g.fillRect(x + 7, y + 7, 2, 2);
    } else {
      g.fillStyle = color;
      for (let i = 0; i < 16; i += 3) { g.fillRect(x + i, y, 2, 1); g.fillRect(x + i, y + 15, 2, 1); g.fillRect(x, y + i, 1, 2); g.fillRect(x + 15, y + i, 1, 2); }
    }
  }
  function drawFakeWalls(s, cx, cy) {
    // 見えない壁の奥（中に入ると透ける）
    const L = s.level, p = s.p;
    const x0 = Math.max(0, Math.floor(cx / TS)), x1 = Math.min(L.w - 1, Math.floor((cx + W) / TS));
    const y0 = Math.max(0, Math.floor(cy / TS)), y1 = Math.min(L.h - 1, Math.floor((cy + H) / TS));
    const inside = isNearFake(s);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (s.tiles[ty * L.w + tx] !== T.FAKE) continue;
      const near = inside && Math.abs(tx * TS + 8 - (p.x + 5)) < 40 && Math.abs(ty * TS + 8 - (p.y + 7)) < 40;
      g.globalAlpha = near ? 0.35 : 1;
      g.drawImage(terrain.fakeTile, tx * TS, ty * TS);
      g.globalAlpha = 1;
    }
  }
  function isNearFake(s) {
    const p = s.p, L = s.level;
    for (let ty = Math.floor(p.y / TS) - 1; ty <= Math.floor((p.y + p.h) / TS) + 1; ty++)
      for (let tx = Math.floor(p.x / TS) - 1; tx <= Math.floor((p.x + p.w) / TS) + 1; tx++)
        if (tx >= 0 && ty >= 0 && tx < L.w && ty < L.h && s.tiles[ty * L.w + tx] === T.FAKE) return true;
    return false;
  }

  function drawEntities(s, t) {
    const L = s.level;
    for (const e of L.ents) {
      if (e.kind === 'medal' && !s.medals[e.idx]) {
        const by = Math.round(Math.sin(t * 2.5 + e.idx) * 2);
        g.drawImage(spr.medal.r, e.x + 1, e.y + 1 + by);
        if (Math.floor(t * 3 + e.idx) % 5 === 0) { g.fillStyle = PAL.n; g.fillRect(e.x + 11, e.y + 2 + by, 1, 3); g.fillRect(e.x + 10, e.y + 3 + by, 3, 1); }
      }
      if (e.kind === 'goal' || e.kind === 'secret') drawGoal(e, s, t);
    }
    s.checkpoints.forEach((c, i) => drawCheckpoint(c, i <= s.checkpoint, t));
    for (const sp of s.springs) drawSpring(sp);
    for (const sw of s.switches) drawSwitch(sw, s.sw);
    for (const m of s.movers) drawMover(m);
  }
  function drawGoal(e, s, t) {
    // 結び目の杭: 木の杭にリボン。クリアで結ばれる
    const x = e.x + 5, y = e.y - 32;
    g.fillStyle = PAL.K; g.fillRect(x - 1, y - 1, 8, 50);
    g.fillStyle = e.kind === 'secret' ? PAL.A : PAL.W; g.fillRect(x, y, 6, 48);
    g.fillStyle = e.kind === 'secret' ? PAL.a : PAL.w; g.fillRect(x + 1, y, 2, 48);
    g.fillStyle = PAL.K; g.fillRect(x - 2, y - 3, 10, 3);
    const tied = s.status === 'clear' && s.exit === (e.kind === 'secret' ? 'secret' : 'goal');
    const col = e.kind === 'secret' ? PAL.y : PAL.R;
    g.fillStyle = col;
    if (tied) {
      g.fillRect(x - 6, y + 6, 6, 5); g.fillRect(x + 6, y + 6, 6, 5); g.fillStyle = PAL.K; g.fillRect(x + 1, y + 7, 4, 3);
      g.fillStyle = col; g.fillRect(x - 3, y + 11, 2, 8); g.fillRect(x + 7, y + 11, 2, 9);
    } else {
      for (let i = 0; i < 18; i++) g.fillRect(x + 6 + i, y + 4 + Math.round(Math.sin(t * 5 + i * 0.5) * 2 + i * 0.2), 1, 3);
    }
  }
  function drawCheckpoint(c, on, t) {
    // 待ち針: 立てると頭が茜になり、糸がなびく
    const x = c.x + 7, y = c.y - 16;
    g.fillStyle = PAL.S; g.fillRect(x, y + 6, 2, 26);
    g.fillStyle = PAL.s; g.fillRect(x, y + 6, 1, 26);
    g.fillStyle = PAL.K; g.fillRect(x - 3, y - 1, 8, 8);
    g.fillStyle = on ? PAL.R : PAL.N; g.fillRect(x - 2, y, 6, 6);
    g.fillStyle = on ? PAL.r : PAL.n; g.fillRect(x - 1, y + 1, 2, 2);
    if (on) { g.fillStyle = PAL.R; for (let i = 0; i < 12; i++) g.fillRect(x + 2 + i, y + 8 + Math.round(Math.sin(t * 6 + i * 0.6) * 1.5 + i * 0.3), 1, 1); }
  }
  function drawSpring(sp) {
    // ばねボタン: 大きな茜のボタン。踏むと沈む
    const sq = sp.squash > 0 ? Math.round(sp.squash / 0.18 * 4) : 0;
    const x = sp.x, y = sp.y + sq, h = 7 - sq;
    g.fillStyle = PAL.K; g.fillRect(x, y, 16, h + 1); g.fillRect(x + 1, y - 1, 14, 1);
    g.fillStyle = PAL.R; g.fillRect(x + 1, y, 14, h);
    g.fillStyle = PAL.r; g.fillRect(x + 2, y, 12, 2);
    g.fillStyle = PAL.K; g.fillRect(x + 5, y + 2, 2, 2); g.fillRect(x + 9, y + 2, 2, 2);
    if (h > 4) { g.fillRect(x + 5, y + 5, 2, 1); g.fillRect(x + 9, y + 5, 2, 1); }
    g.fillStyle = PAL.n; g.fillRect(x + 6, y + 3, 4, 1);
  }
  function drawSwitch(sw, state) {
    // スナップ（押しボタン）。いま固い色が中心に出る
    const y = sw.down ? sw.y + 4 : sw.y;
    g.fillStyle = PAL.K; g.fillRect(sw.x + 1, y, 14, sw.y + 6 - y + 1);
    g.fillStyle = PAL.S; g.fillRect(sw.x + 2, y + 1, 12, sw.y + 6 - y - 1);
    g.fillStyle = PAL.s; g.fillRect(sw.x + 3, y + 1, 10, 1);
    g.fillStyle = state ? PAL.B : PAL.R; g.fillRect(sw.x + 6, y + 1, 4, 3);
  }
  function drawMover(m) {
    // ファスナーの引き手の足場
    const x = Math.round(m.x), y = Math.round(m.y);
    g.fillStyle = PAL.K; g.fillRect(x, y, 48, 8);
    g.fillStyle = PAL.S; g.fillRect(x + 1, y + 1, 46, 6);
    g.fillStyle = PAL.s; g.fillRect(x + 1, y + 1, 46, 2);
    g.fillStyle = PAL.K; for (let i = 4; i < 46; i += 6) g.fillRect(x + i, y + 4, 3, 1);
    // 引き手
    g.fillStyle = PAL.K; g.fillRect(x + 20, y + 7, 8, 8);
    g.fillStyle = PAL.Y; g.fillRect(x + 21, y + 8, 6, 6);
    g.fillStyle = PAL.K; g.fillRect(x + 23, y + 10, 2, 2);
  }

  function drawItems(s, t) {
    for (const it of s.items) {
      if (it.kind === 'wata') g.drawImage(spr.wata.r, Math.round(it.x), Math.round(it.y));
    }
    if (s.boss?.knot) {
      const k = s.boss.knot;
      g.drawImage(spr.knot.r, Math.round(k.x), Math.round(k.y + Math.sin(t * 4) * 1));
    }
  }

  function drawEnemy(e, t) {
    if (!e.alive && e.how === 'stomp') {
      // 踏まれてぺしゃんこ
      const s0 = spr[e.type + '1'] ?? spr.iga1;
      g.globalAlpha = Math.max(0, 1 - e.deadT / 0.6);
      g.drawImage(e.dir > 0 ? s0.l : s0.r, Math.round(e.x + e.w / 2 - 8), Math.round(e.y + e.h - 6), 16, 6);
      g.globalAlpha = 1; return;
    }
    if (!e.alive) return;
    const f = Math.floor(t * 6 + e.id) % 2;
    let key = e.type + (f ? '2' : '1');
    if (!spr[key]) key = e.type + '1';
    if (e.type === 'choki') key = e.st === 'hop' ? 'choki2' : (e.st === 'wait' && e.t > 0.45 ? (Math.floor(t * 20) % 2 ? 'choki1' : 'choki2') : 'choki1');
    const sp = spr[key];
    const x = Math.round(e.x + e.w / 2 - 8), y = Math.round(e.y + e.h - 16);
    if (e.type === 'tsumu') {
      g.fillStyle = PAL.n; g.fillRect(Math.round(e.x + e.w / 2), Math.round(e.sy) - 16, 1, Math.round(e.y - e.sy) + 18);
      g.drawImage(sp.r, x, Math.round(e.y) - 1);
      return;
    }
    if (e.type === 'kedama') {
      const sq = e.onGround ? 0.8 : e.vy < 0 ? 1.1 : 1;
      g.drawImage(sp.r, x + Math.round(8 - 8 / sq) / 2, y + Math.round(16 - 16 * sq), 16, Math.round(16 * sq));
      return;
    }
    // 素の絵は左向き（イガ）か右向き（他）
    const facesLeft = e.type === 'iga';
    const flip = facesLeft ? e.dir > 0 : e.dir < 0;
    g.drawImage(flip ? sp.l : sp.r, x, y);
  }

  function drawBoss(b, t) {
    if (b.mode === 'defeat' && b.dropped) return;
    let key = b.mode === 'rest' ? 'boss_rest' : (Math.floor(t * (b.mode === 'swoop' ? 14 : 7)) % 2 ? 'boss_up' : 'boss_down');
    if (b.mode === 'hurt' && Math.floor(t * 10) % 2) key += '_flash';
    if (b.mode === 'defeat') key = Math.floor(t * 8) % 2 ? 'boss_rest_flash' : 'boss_rest';
    const sp = spr[key];
    let x = Math.round(b.x + b.w / 2 - 24), y = Math.round(b.y + b.h - 32);
    if (b.mode === 'windup') x += Math.round(Math.sin(t * 60) * 1.5);
    g.drawImage(b.face > 0 ? sp.r : sp.l, x, y);
    if (b.mode === 'rest') {
      // 息切れの汗
      g.fillStyle = PAL.n;
      const k = (t * 2) % 1;
      g.fillRect(x + 8 - k * 6, y + 10 - k * 8, 2, 2); g.fillRect(x + 38 + k * 6, y + 10 - k * 8, 2, 2);
    }
  }

  function drawPlayer(s, dt, t) {
    const p = s.p;
    fx.sx += (1 - fx.sx) * Math.min(1, dt * 14); fx.sy += (1 - fx.sy) * Math.min(1, dt * 14);
    if (p.inv > 0 && Math.floor(t * 12) % 2 && s.status === 'play') return;
    const running = Math.abs(p.vx) > 8;
    const runF = ['run1', 'run2', 'run3', 'run2'][Math.floor(s.frame * Math.abs(p.vx) / 900) % 4];
    let name;
    if (s.status === 'dead') name = 'dead';
    else if (!p.onGround && p.ride < 0) name = p.vy < 0 ? 'jump' : 'fall';
    else if (p.skid) name = 'skid';
    else name = running ? runF : 'stand';
    const face = p.face > 0 ? 'r' : 'l';
    const cx = Math.round(p.x + p.w / 2), by = Math.round(p.y + p.h);
    let sp, bw, bh;
    if (playerSpr) {
      sp = playerSpr[name] ?? (name === 'skid' ? playerSpr.stand : name === 'dead' ? playerSpr.fall : null) ?? playerSpr.stand;
      bw = sp.w; bh = sp.h;
    } else { sp = spr['tsugi_' + name] ?? spr.tsugi_stand; bw = 24; bh = 24; } // 仮: 16px の絵を 1.5 倍
    const w = Math.round(bw * fx.sx), h = Math.round(bh * fx.sy);
    const x = cx - Math.round(w / 2), y = by - h;
    if (p.power) {
      // 綿毛: 体のまわりに綿のかたまり
      g.fillStyle = PAL.O;
      const k = p.glide ? Math.sin(t * 20) : 0;
      for (const [ax, ay, r] of [[-0.42, 0.25, 3], [0.42, 0.3, 3], [-0.3, 0.75, 2], [0.36, 0.78, 2], [0, 0.02, 3]]) {
        const px0 = Math.round(cx + ax * w + k), py0 = Math.round(y + ay * h);
        g.fillRect(px0 - r, py0 - r + 1, r * 2, r * 2 - 2); g.fillRect(px0 - r + 1, py0 - r, r * 2 - 2, r * 2);
      }
    }
    if (s.status === 'dead') { g.save(); g.translate(x + w / 2, y + h / 2); g.scale(1, -1); g.drawImage(sp[face], -w / 2, -h / 2, w, h); g.restore(); }
    else g.drawImage(sp[face], x, y, w, h);
    if (p.glide) {
      // 滑空中: 綿が帆のように広がる
      g.fillStyle = PAL.O; g.fillRect(cx - 13, y - 3, 26, 3); g.fillStyle = PAL.o; g.fillRect(cx - 12, y - 1, 24, 1);
    }
  }

  function drawShot(o) {
    if (o.kind === 'pin') {
      const sp = spr.pin;
      g.save(); g.translate(Math.round(o.x + o.w / 2), Math.round(o.y + o.h / 2)); g.rotate(Math.atan2(o.vy, o.vx));
      g.drawImage(sp.r, -12, -2); g.restore();
    } else if (o.kind === 'dust') {
      g.drawImage(spr.dust.r, Math.round(o.x), Math.round(o.y));
    }
  }

  function drawParticles(dt) {
    for (const q of fx.parts) {
      q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      g.globalAlpha = Math.max(0, Math.min(1, q.life / q.max * 1.5));
      g.fillStyle = q.color;
      if (q.line) { g.fillRect(Math.round(q.x), Math.round(q.y), 1, 3); g.fillRect(Math.round(q.x - q.vx * 0.01), Math.round(q.y - 2), 1, 2); }
      else g.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
    }
    g.globalAlpha = 1;
    fx.parts = fx.parts.filter(q => q.life > 0);
  }
  function drawPops(dt) {
    g.font = '10px "DotGothic16", monospace'; g.textAlign = 'center';
    for (const q of fx.pops) {
      q.t += dt;
      const y = Math.round(q.y - q.t * 22);
      g.fillStyle = PAL.K; g.fillText(q.text, Math.round(q.x) + 1, y + 1);
      g.fillStyle = q.color; g.fillText(q.text, Math.round(q.x), y);
    }
    fx.pops = fx.pops.filter(q => q.t < 1.1);
  }

  return { setLevel, draw, onEvents, resize, get buffer() { return buf; }, get ctx() { return g; }, bigCtx, presentBig: () => present(big), setPlayerSprite, present, spr, fx, size: () => ({ scale, ox, oy }) };
}

// ---- 地形を一度だけ焼く ----
function buildTerrain(L, th) {
  const c = document.createElement('canvas'); c.width = L.pw; c.height = L.ph;
  const g = c.getContext('2d');
  const tileAt = (x, y) => (x < 0 || x >= L.w || y < 0 ? T.GROUND : y >= L.h ? T.EMPTY : L.tiles[y * L.w + x]);
  const isGround = t => t === T.GROUND || t === T.FAKE;
  const patch = (x, y) => Math.floor(hash(Math.floor(x / 5), Math.floor(y / 4), 7) * th.ground.length);
  for (let ty = 0; ty < L.h; ty++) for (let tx = 0; tx < L.w; tx++) {
    const t = tileAt(tx, ty), x = tx * TS, y = ty * TS;
    if (t === T.GROUND) drawGroundTile(g, th, tx, ty, x, y, tileAt, isGround, patch);
    else if (t === T.BLOCK) drawSpool(g, tx, ty, x, y);
    else if (t === T.ONEWAY) drawRuler(g, x, y, tx, isOneway(tileAt(tx - 1, ty)), isOneway(tileAt(tx + 1, ty)));
    else if (t === T.SPIKE) drawPins(g, x, y, tx, isSolidStatic(tileAt(tx, ty - 1)) && !isSolidStatic(tileAt(tx, ty + 1)));
  }
  // 見えない壁用の1枚（地面の中身と同じ見た目）
  const f = document.createElement('canvas'); f.width = TS; f.height = TS;
  const fg = f.getContext('2d'); fg.fillStyle = th.ground[0]; fg.fillRect(0, 0, TS, TS);
  fg.fillStyle = th.cross; fg.fillRect(3, 7, 3, 1); fg.fillRect(4, 6, 1, 3); fg.fillRect(11, 2, 3, 1); fg.fillRect(12, 1, 1, 3);
  c.fakeTile = f;
  return c;
}
const isOneway = t => t === T.ONEWAY;
const isSolidStatic = t => t === T.GROUND || t === T.BLOCK;

function drawGroundTile(g, th, tx, ty, x, y, tileAt, isGround, patch) {
  const pid = patch(tx, ty);
  g.fillStyle = th.ground[pid]; g.fillRect(x, y, TS, TS);
  // 刺し子（十字刺し）
  g.fillStyle = th.cross;
  if (th.twill) { for (let i = 0; i < TS; i += 4) g.fillRect(x + ((i + ty * 3) % TS), y + i, 2, 1); }
  else if (th.stripes) { g.fillStyle = th.stripes; g.globalAlpha = 0.25; g.fillRect(x + ((tx % 2) ? 0 : 8), y, 4, TS); g.globalAlpha = 1; }
  else {
    // 当て布ごとに刺し子の柄を変える（十字刺し・横の運針・かすり・山形）
    const kind = Math.floor(hash(Math.floor(tx / 5), Math.floor(ty / 4), 11) * 4);
    if (kind === 0) {
      const ox = (tx + ty) % 2 ? 0 : 8;
      g.fillRect(x + ox + 2, y + 6, 3, 1); g.fillRect(x + ox + 3, y + 5, 1, 3);
      g.fillRect(x + ((ox + 8) % 16) + 2, y + 13, 3, 1); g.fillRect(x + ((ox + 8) % 16) + 3, y + 12, 1, 3);
    } else if (kind === 1) {
      for (let yy = 3; yy < TS; yy += 6) for (let xx = (yy % 4); xx < TS; xx += 5) g.fillRect(x + xx, y + yy, 3, 1);
    } else if (kind === 2) {
      for (let k = 0; k < 3; k++) g.fillRect(x + Math.floor(hash(tx, ty, k + 20) * 13), y + Math.floor(hash(tx, ty, k + 30) * 14), 2, 1);
    } else {
      for (let xx = 0; xx < TS; xx += 4) { const yy = 8 + ((xx / 4) % 2 ? -2 : 2); g.fillRect(x + xx, y + yy, 2, 1); g.fillRect(x + xx + 2, y + 8, 1, 1); }
    }
  }
  // 継ぎ目（隣の布と色が違う所に運針）
  g.fillStyle = th.stitch;
  const R = isGround(tileAt(tx + 1, ty)) && patch(tx + 1, ty) !== pid;
  const D = isGround(tileAt(tx, ty + 1)) && patch(tx, ty + 1) !== pid;
  if (R) for (let i = 1; i < TS; i += 4) g.fillRect(x + 15, y + i + Math.round(hash(tx, ty, i) * 1.2), 1, 2);
  if (D) for (let i = 1; i < TS; i += 4) g.fillRect(x + i + Math.round(hash(tx, ty, i + 9) * 1.2), y + 15, 2, 1);
  const up = isGround(tileAt(tx, ty - 1)) || tileAt(tx, ty - 1) === T.BLOCK && false;
  const left = isGround(tileAt(tx - 1, ty)), right = isGround(tileAt(tx + 1, ty)), down = isGround(tileAt(tx, ty + 1));
  // 縁: 墨の線と、内側の運針
  g.fillStyle = th.groundInk;
  if (!left) g.fillRect(x, y, 1, TS);
  if (!right) g.fillRect(x + 15, y, 1, TS);
  if (!down && ty < 999) g.fillRect(x, y + 15, TS, 1);
  g.fillStyle = th.stitch;
  if (!left) for (let i = 2; i < TS; i += 5) g.fillRect(x + 3, y + i, 1, 3);
  if (!right) for (let i = 2; i < TS; i += 5) g.fillRect(x + 12, y + i, 1, 3);
  if (!up) {
    // 上面: 若草の布をピンキングばさみで切った縁＋運針
    g.fillStyle = th.groundInk; g.fillRect(x, y, TS, 1);
    g.fillStyle = th.top; g.fillRect(x, y + 1, TS, 5);
    g.fillStyle = th.topDark; g.fillRect(x, y + 5, TS, 1);
    for (let i = 0; i < TS; i += 4) { g.fillRect(x + i + 1, y + 6, 2, 1); g.fillRect(x + i + 2, y + 7, 1, 1); }
    g.fillStyle = th.topStitch;
    for (let i = 1; i < TS; i += 5) g.fillRect(x + i + Math.round(hash(tx, ty, i) * 1.4), y + 3, 3, 1);
    if (!left) { g.fillStyle = th.groundInk; g.fillRect(x, y, 1, 7); }
    if (!right) { g.fillStyle = th.groundInk; g.fillRect(x + 15, y, 1, 7); }
    // 草の房（ところどころ）
    if (hash(tx, ty, 3) < 0.28) {
      g.fillStyle = th.topDark; const hx = x + 3 + Math.floor(hash(tx, ty, 4) * 9);
      g.fillRect(hx, y - 2, 1, 3); g.fillRect(hx + 2, y - 3, 1, 4); g.fillRect(hx + 4, y - 1, 1, 2);
    }
  }
}
function drawSpool(g, tx, ty, x, y) {
  // 糸巻き（木の糸巻きに色糸）
  const cols = [PAL.R, PAL.Y, PAL.a, PAL.G];
  const col = cols[Math.floor(hash(tx, ty, 5) * cols.length)];
  g.fillStyle = PAL.K; g.fillRect(x, y, TS, TS);
  g.fillStyle = PAL.w; g.fillRect(x + 1, y + 1, 14, 3); g.fillRect(x + 1, y + 12, 14, 3);
  g.fillStyle = PAL.W; g.fillRect(x + 1, y + 3, 14, 1); g.fillRect(x + 1, y + 14, 14, 1);
  g.fillStyle = col; g.fillRect(x + 2, y + 4, 12, 8);
  g.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 5; i < 12; i += 2) g.fillRect(x + 2, y + i, 12, 1);
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, y + 4, 2, 8);
}
function drawRuler(g, x, y, tx, l, r) {
  // 物差しの足場（下から通り抜けられる）
  g.fillStyle = PAL.K; g.fillRect(x, y, TS, 6);
  g.fillStyle = PAL.y; g.fillRect(x, y + 1, TS, 4);
  g.fillStyle = PAL.Y; g.fillRect(x, y + 4, TS, 1);
  g.fillStyle = PAL.K;
  for (let i = 0; i < TS; i += 2) g.fillRect(x + i, y + 1, 1, (tx * 8 + i / 2) % 5 === 0 ? 3 : 1);
  if (!l) g.fillRect(x, y, 1, 6);
  if (!r) g.fillRect(x + 15, y, 1, 6);
}
function drawPins(g, x, y, tx, ceil) {
  const heads = [PAL.R, PAL.Y, PAL.B, PAL.n];
  for (let i = 0; i < 3; i++) {
    const px = x + 2 + i * 5, hc = heads[(tx + i) % heads.length];
    if (!ceil) {
      g.fillStyle = PAL.S; g.fillRect(px + 1, y + 6, 1, 10); g.fillStyle = PAL.s; g.fillRect(px + 1, y + 6, 1, 4);
      g.fillStyle = PAL.K; g.fillRect(px - 1, y + 9 + (i % 2), 5, 4); g.fillStyle = hc; g.fillRect(px, y + 10 + (i % 2), 3, 2);
      g.fillStyle = PAL.s; g.fillRect(px + 1, y + 5, 1, 1);
    } else {
      g.fillStyle = PAL.S; g.fillRect(px + 1, y, 1, 10);
      g.fillStyle = PAL.K; g.fillRect(px - 1, y + 3 - (i % 2), 5, 4); g.fillStyle = hc; g.fillRect(px, y + 4 - (i % 2), 3, 2);
    }
  }
}

function buildBackground(th, W, H) {
  // 空: 3段の帯をディザでつなぐ
  const sky = document.createElement('canvas'); sky.width = W; sky.height = H;
  const sg = sky.getContext('2d');
  const band = H / th.sky.length;
  th.sky.forEach((c, i) => { sg.fillStyle = c; sg.fillRect(0, Math.floor(i * band), W, Math.ceil(band)); });
  for (let i = 1; i < th.sky.length; i++) {
    sg.fillStyle = th.sky[i];
    const y0 = Math.floor(i * band) - 6;
    for (let y = 0; y < 6; y++) for (let x = (y % 2); x < W; x += 2) if (hash(x, y, i) < y / 6) sg.fillRect(x, y0 + y, 1, 1);
  }
  if (th.tufted) {
    // 砦: ビロードの壁にくるみボタン
    for (let y = 18; y < H; y += 36) for (let x = (y / 36 % 2) * 24 + 12; x < W; x += 48) {
      sg.fillStyle = 'rgba(0,0,0,0.18)'; sg.fillRect(x - 10, y - 1, 20, 1); sg.fillRect(x - 1, y - 10, 1, 20);
      sg.fillStyle = th.hillSeam; sg.fillRect(x - 2, y - 2, 4, 4); sg.fillStyle = 'rgba(0,0,0,0.3)'; sg.fillRect(x - 1, y - 1, 2, 2);
    }
  }
  // 雲: 綿のかたまり
  const clouds = document.createElement('canvas'); clouds.width = 768; clouds.height = 70;
  const cg = clouds.getContext('2d');
  for (let i = 0; i < 6; i++) {
    const cx = 40 + i * 128 + hash(i, 1) * 40, cy = 20 + hash(i, 2) * 30, n = 4 + Math.floor(hash(i, 3) * 3);
    for (let k = 0; k < n; k++) {
      const r = 7 + hash(i, k) * 8, x = cx + k * 9 - n * 4, y = cy - hash(k, i) * 6;
      cg.fillStyle = th.cloudShade; disc(cg, x, y + 2, r);
      cg.fillStyle = th.cloud; disc(cg, x, y, r);
    }
  }
  // 遠景: 継ぎはぎの丘（縫い目つき）
  const far = document.createElement('canvas'); far.width = 768; far.height = 130;
  const fg = far.getContext('2d');
  for (let i = 0; i < 7; i++) {
    const cx = i * 118 + hash(i, 9) * 30, r = 80 + hash(i, 8) * 40, top = 6 + hash(i, 7) * 34;
    fg.fillStyle = th.hillInk; hill(fg, cx, top - 1, r + 1, 130);
    fg.fillStyle = th.hills[i % th.hills.length]; hill(fg, cx, top, r, 130);
    // 布の継ぎ目（縦の運針）
    fg.fillStyle = th.hillSeam;
    for (let y = top + 12; y < 130; y += 5) fg.fillRect(Math.round(cx + Math.sin(y * 0.05 + i) * 4), y, 1, 3);
    for (let x = cx - r * 0.6; x < cx + r * 0.6; x += 5) fg.fillRect(Math.round(x), Math.round(top + 34 + Math.sin(x * 0.04) * 3), 3, 1);
  }
  // 近景: ぽんぽんの茂みとボタンの花
  const near = document.createElement('canvas'); near.width = 768; near.height = 80;
  const ng = near.getContext('2d');
  for (let i = 0; i < 16; i++) {
    const x = i * 48 + hash(i, 4) * 30, h = 18 + hash(i, 5) * 26;
    ng.fillStyle = th.nearInk; ng.fillRect(Math.round(x) - 1, 80 - h, 2, h);
    const r = 9 + hash(i, 6) * 7;
    ng.fillStyle = th.nearInk; disc(ng, x, 80 - h, r + 1);
    ng.fillStyle = th.near[i % 2]; disc(ng, x, 80 - h, r);
    // 毛糸のぽんぽん: 中心から外へ毛糸の筋
    ng.fillStyle = th.nearInk; ng.globalAlpha = 0.35;
    for (let k = 0; k < 14; k++) {
      const a = k / 14 * Math.PI * 2 + hash(i, k) * 0.4;
      for (let t = 0.35; t < 0.95; t += 0.12) ng.fillRect(Math.round(x + Math.cos(a) * r * t), Math.round(80 - h + Math.sin(a) * r * t), 1, 1);
    }
    ng.globalAlpha = 1;
    // 下半分に影、上に1本だけ光
    ng.fillStyle = th.nearInk; ng.globalAlpha = 0.25; ng.fillRect(Math.round(x - r), Math.round(80 - h + r * 0.35), Math.round(r * 2), Math.round(r * 0.7)); ng.globalAlpha = 1;
    ng.fillStyle = 'rgba(255,255,255,0.18)'; ng.fillRect(Math.round(x - r * 0.5), Math.round(80 - h - r * 0.6), Math.round(r * 0.6), 1);
    if (hash(i, 11) < 0.35) {
      const fx = x + 18, fy = 80 - 18 - hash(i, 12) * 14, fc = th.flower[i % th.flower.length];
      ng.globalAlpha = 0.7;
      ng.fillStyle = th.nearInk; ng.fillRect(Math.round(fx), Math.round(fy), 1, 80 - fy);
      ng.fillStyle = th.nearInk; disc(ng, fx, fy, 4);
      ng.fillStyle = fc; disc(ng, fx, fy, 3);
      ng.fillStyle = th.nearInk; ng.fillRect(Math.round(fx) - 1, Math.round(fy) - 1, 1, 1); ng.fillRect(Math.round(fx) + 1, Math.round(fy) + 1, 1, 1);
      ng.globalAlpha = 1;
    }
  }
  return { sky, clouds, far, near, props: buildProps(th) };
}

// 題材の小道具のシルエット（遠景と近景のあいだ）: 地面に刺さった大きな縫い針と渡した糸／糸巻きの塔／アイロン
function buildProps(th) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 150;
  const g = c.getContext('2d');
  const ink = th.hillInk, body = th.hills[1], light = th.hillSeam;
  const kind = th.props ?? 'needles';
  if (kind === 'needles') {
    const tops = [];
    for (let i = 0; i < 4; i++) {
      const x = 60 + i * 192 + hash(i, 40) * 40, h = 90 + hash(i, 41) * 40, lean = (hash(i, 42) - 0.5) * 0.25;
      const top = 150 - h;
      for (let y = top; y < 150; y++) {
        const xx = Math.round(x + (y - top) * lean);
        const w = y < top + 6 ? 2 : 3;
        g.fillStyle = ink; g.fillRect(xx - 1, y, w + 2, 1);
        g.fillStyle = body; g.fillRect(xx, y, w, 1);
      }
      g.fillStyle = th.sky[0]; g.fillRect(Math.round(x) , top + 8, 1, 6); // 針の穴
      tops.push({ x: x + 1, y: top + 10 });
    }
    // 針の穴どうしに糸を渡す（たるみ）
    g.fillStyle = th.flower[0]; g.globalAlpha = 0.45;
    for (let i = 0; i < tops.length; i++) {
      const a = tops[i], b = i + 1 < tops.length ? tops[i + 1] : { x: tops[0].x + 768, y: tops[0].y };
      for (let t = 0; t <= 1; t += 0.004) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 26;
        g.fillRect(Math.round(x) % 768, Math.round(y), 1, 1);
      }
    }
    g.globalAlpha = 1;
  } else if (kind === 'spools') {
    for (let i = 0; i < 3; i++) {
      const x = 80 + i * 256 + hash(i, 50) * 60, w = 34 + hash(i, 51) * 16, h = 60 + hash(i, 52) * 40, top = 150 - h;
      g.fillStyle = ink; g.fillRect(x - w / 2 - 6, top - 1, w + 12, 8); g.fillRect(x - w / 2 - 6, 143, w + 12, 7);
      g.fillStyle = body; g.fillRect(x - w / 2 - 5, top, w + 10, 6); g.fillRect(x - w / 2 - 5, 144, w + 10, 6);
      g.fillStyle = ink; g.fillRect(x - w / 2 - 1, top + 6, w + 2, h - 12);
      g.fillStyle = th.flower[i % th.flower.length]; g.globalAlpha = 0.55; g.fillRect(x - w / 2, top + 6, w, h - 12); g.globalAlpha = 1;
      g.fillStyle = ink; for (let y = top + 8; y < 142; y += 3) g.fillRect(x - w / 2, y, w, 1);
    }
  } else if (kind === 'irons') {
    for (let i = 0; i < 2; i++) {
      const x = 120 + i * 384 + hash(i, 60) * 80, w = 120, h = 46, base = 150;
      g.fillStyle = ink;
      for (let y = 0; y < h; y++) { const ww = Math.round(w * (0.55 + 0.45 * y / h)); g.fillRect(Math.round(x + w - ww), base - h + y, ww, 1); }
      g.fillStyle = body;
      for (let y = 1; y < h - 1; y++) { const ww = Math.round(w * (0.55 + 0.45 * y / h)) - 2; g.fillRect(Math.round(x + w - ww - 1), base - h + y, ww, 1); }
      // 取っ手
      g.fillStyle = ink; g.fillRect(x + 50, base - h - 22, 50, 6); g.fillRect(x + 54, base - h - 18, 5, 18); g.fillRect(x + 92, base - h - 18, 5, 18);
      g.fillStyle = light; for (let k = 0; k < 6; k++) g.fillRect(x + 40 + k * 12, base - 8, 2, 2);
      // 湯気
      g.fillStyle = light; g.globalAlpha = 0.5;
      for (let k = 0; k < 8; k++) g.fillRect(Math.round(x + 20 + Math.sin(k) * 6), base - h - 10 - k * 7, 6, 3);
      g.globalAlpha = 1;
    }
  }
  return c;
}
function disc(g, cx, cy, r) {
  for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1); }
}
function hill(g, cx, top, r, bottom) {
  for (let y = top; y < bottom; y++) {
    const d = (y - top) / r; const w = Math.round(r * Math.sqrt(Math.min(1, d * (2 - d))) * 1.2);
    g.fillRect(Math.round(cx - w), y, w * 2, 1);
  }
}
function makeClothTexture(W, H) {
  // 平織りの目（縦糸と横糸）を薄く1回だけ描く
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = hash(x, y, 1);
    if ((x + y) % 2 === 0 && v < 0.18) { g.fillStyle = 'rgba(255,250,235,0.10)'; g.fillRect(x, y, 1, 1); }
    else if (v > 0.9) { g.fillStyle = 'rgba(30,20,10,0.08)'; g.fillRect(x, y, 1, 1); }
  }
  return c;
}
