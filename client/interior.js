// 建物の中の全景（ドールハウスのように手前の壁を外して見せる）。WebGL を使わず Canvas 2D で描くので、どの端末でも見られる。
// 中にいる人は台帳の見た目どおりに描く。働く人はカウンターの内側、お客は席に座る。県庁は部署ごとの机の島。
import { DEPARTMENTS } from './shared/lore.js';
import { drawFigure } from './portrait.js';

const INK = '#22324f';
const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';
const DEPT = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));
// 床と壁の色（種類ごと）
const ROOM = {
  kissa: { floor: '#9a6a48', wall: '#e9d9bf', trim: '#5a2f1f' }, shokudo: { floor: '#b58a5c', wall: '#efe3c8', trim: '#7b4b3a' },
  sento: { floor: '#dfe8ea', wall: '#f4f1e8', trim: '#3f6a78' }, super: { floor: '#e6e3da', wall: '#f7f5ee', trim: '#c8463a' },
  conbini: { floor: '#ecebe6', wall: '#fbfaf4', trim: '#2f8a5a' }, shop: { floor: '#c9b08a', wall: '#efe6d0', trim: '#6c5a4c' },
  clinic: { floor: '#e3e8e6', wall: '#fbfaf4', trim: '#5f9ccc' }, post: { floor: '#ddd6c6', wall: '#f4efe2', trim: '#c8463a' },
  koban: { floor: '#d6d2c6', wall: '#efe9da', trim: '#2f5ba0' }, station: { floor: '#cfcabd', wall: '#efe9da', trim: '#3f6a78' },
  school: { floor: '#b8935f', wall: '#f1e8d2', trim: '#4a8a5a' }, office: { floor: '#cfc6b0', wall: '#f1ede2', trim: '#2f5ba0' },
  house: { floor: '#cdbb7a', wall: '#efe6d0', trim: '#6c5a4c' }, mall: { floor: '#e6e3da', wall: '#f7f5ee', trim: '#2f5ba0' },
  park: { floor: '#a9c25a', wall: '#8fc8d8', trim: '#5e9a62' },
};

export function createInterior(canvas) {
  const g = canvas.getContext('2d');
  let detail = null, kind = 'shop', hits = [], W = 0, H = 0, busy = new Map(), t = 0;
  // 床の上の位置（u: 左右 0〜1、v: 奥 0 → 手前 1）を画面に。手前ほど広く大きく
  const geo = () => {
    const top = H * 0.36, bot = H * 0.97;
    return {
      P: (u, v) => { const half = W * (0.36 + 0.12 * v); return [W / 2 + (u - 0.5) * 2 * half, top + v * (bot - top)]; },
      S: (v) => Math.min(H / 520, W / 620) * (0.78 + 0.32 * v), top, bot,
    };
  };

  function box(x, y, w, h, fill, stroke = true) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (stroke) { g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(x, y, w, h); } }
  function label(text, x, y, fs, bg, fg = '#fff') {
    g.font = `700 ${fs}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const tw = g.measureText(text).width + fs * 0.8;
    g.fillStyle = bg; g.fillRect(x - tw / 2, y - fs * 0.7, tw, fs * 1.4);
    g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(x - tw / 2, y - fs * 0.7, tw, fs * 1.4);
    g.fillStyle = fg; g.fillText(text, x, y + 1);
  }

  // 家具と「席」を作る（席: 人が立つ・座る場所）
  function furnish() {
    const { P, S } = geo();
    const items = [], staffSlots = [], seats = [];
    // 床に置いた板（上から見た面に奥行きをつける）
    const slab = (u0, u1, v0, v1, lift, color) => {
      const s = S(v1), [a, ay] = P(u0, v0), [bx] = P(u1, v0), [c, cy] = P(u1, v1), [d] = P(u0, v1);
      g.fillStyle = color; g.strokeStyle = INK; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(a, ay - lift * s); g.lineTo(bx, ay - lift * s); g.lineTo(c, cy - lift * s); g.lineTo(d, cy - lift * s); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(d, cy - lift * s, c - d, 5 * s); g.strokeRect(d, cy - lift * s, c - d, 5 * s);
    };
    const table = (u, v, w = 0.12, color = '#7a5236') => items.push({ v: v + 0.03, draw() {
      const [x, y] = P(u, v + 0.03), s = S(v);
      g.fillStyle = INK; g.fillRect(x - 2 * s, y - 24 * s, 4 * s, 24 * s);
      slab(u - w / 2, u + w / 2, v - 0.04, v + 0.03, 26, color);
    } });
    const counter = (u0, u1, v, color = '#8c5a3c') => items.push({ v, draw() {
      const [x0, y] = P(u0, v), [x1] = P(u1, v), s = S(v);
      box(x0, y - 44 * s, x1 - x0, 44 * s, color); box(x0 - 3 * s, y - 50 * s, x1 - x0 + 6 * s, 7 * s, '#d9c4a0');
    } });
    const shelf = (u0, u1, v, goods) => items.push({ v, draw() {
      const [x0, y] = P(u0, v), [x1] = P(u1, v), s = S(v);
      box(x0, y - 70 * s, x1 - x0, 70 * s, '#d8d2c2');
      for (let r = 0; r < 3; r++) for (let i = 0; i < Math.floor((x1 - x0) / (9 * s)); i++) {
        g.fillStyle = goods[(i + r * 3) % goods.length]; g.fillRect(x0 + 3 * s + i * 9 * s, y - 64 * s + r * 22 * s, 6 * s, 14 * s);
      }
    } });
    const seat = (u, v, seated = true) => seats.push({ u, v, seated });
    const staff = (u, v, seated = false) => { const o = { u, v, seated }; staffSlots.push(o); return o; };
    const k = kind;
    if (k === 'kissa' || k === 'shokudo') {
      counter(0.08, 0.5, 0.18, k === 'kissa' ? '#5a2f1f' : '#7b4b3a');
      staff(0.18, 0.06); staff(0.38, 0.06);
      for (let i = 0; i < 4; i++) seat(0.12 + i * 0.11, 0.26);
      for (const [u, v] of [[0.66, 0.35], [0.86, 0.35], [0.66, 0.72], [0.86, 0.72], [0.3, 0.72]]) { table(u, v); seat(u - 0.07, v - 0.02); seat(u + 0.07, v - 0.02); }
    } else if (k === 'sento') {
      items.push({ v: 0.02, draw() { // 富士山の壁絵（銭湯の定番）
        const [x0] = P(0.05, 0), [x1, y] = P(0.95, 0);
        g.fillStyle = '#8fc8d8'; g.fillRect(x0, y - H * 0.24, x1 - x0, H * 0.2);
        g.fillStyle = '#2f5ba0'; g.beginPath(); g.moveTo(x0 + (x1 - x0) * 0.25, y - H * 0.04); g.lineTo(x0 + (x1 - x0) * 0.5, y - H * 0.22); g.lineTo(x0 + (x1 - x0) * 0.75, y - H * 0.04); g.fill();
        g.fillStyle = '#fbfaf4'; g.beginPath(); g.moveTo(x0 + (x1 - x0) * 0.44, y - H * 0.18); g.lineTo(x0 + (x1 - x0) * 0.5, y - H * 0.22); g.lineTo(x0 + (x1 - x0) * 0.56, y - H * 0.18); g.fill();
      } });
      for (const u0 of [0.08, 0.56]) items.push({ v: 0.3, draw() {
        const [x0, y] = P(u0, 0.3), [x1] = P(u0 + 0.36, 0.3), s = S(0.3);
        box(x0, y - 20 * s, x1 - x0, 20 * s, '#cfe3ea'); g.fillStyle = '#7fc1d8'; g.fillRect(x0 + 3, y - 18 * s, x1 - x0 - 6, 8 * s);
      } });
      items.push({ v: 0.5, draw() { const [x, y] = P(0.5, 0.5), s = S(0.5); box(x - 3 * s, y - 110 * s, 6 * s, 110 * s, '#b58a5c'); } });
      items.push({ v: 0.95, draw() { const [x, y] = P(0.5, 0.95); label('男湯 ｜ 女湯', x, y - 14, 13, '#3f6a78'); } });
      staff(0.5, 0.88, true);
      for (let i = 0; i < 4; i++) { seat(0.12 + i * 0.08, 0.25, true); seat(0.6 + i * 0.08, 0.25, true); }
      for (let i = 0; i < 5; i++) { seat(0.1 + i * 0.07, 0.65, true); seat(0.6 + i * 0.07, 0.65, true); }
    } else if (['super', 'conbini', 'shop', 'mall'].includes(k)) {
      const goods = ['#c8463a', '#e3a62b', '#4a8a5a', '#3a6aa0', '#efe6d0', '#f2b8c6'];
      shelf(0.05, 0.95, 0.02, goods);
      for (const v of [0.3, 0.52]) { shelf(0.08, 0.42, v, goods); shelf(0.56, 0.9, v, goods); }
      counter(0.66, 0.92, 0.82, '#d9d6cc');
      staff(0.79, 0.74); staff(0.3, 0.2);
      for (const [u, v] of [[0.48, 0.25], [0.2, 0.4], [0.72, 0.42], [0.48, 0.62], [0.25, 0.7], [0.5, 0.86], [0.6, 0.95], [0.15, 0.9]]) seat(u, v, false);
    } else if (k === 'clinic' || k === 'post' || k === 'koban' || k === 'station') {
      counter(0.1, 0.9, 0.2, k === 'post' ? '#c8463a' : k === 'clinic' ? '#9fc0c9' : '#8a7a6a');
      staff(0.3, 0.08, true); staff(0.7, 0.08, true); staff(0.5, 0.08, true);
      for (const v of [0.55, 0.8]) { items.push({ v, draw() { const [x0, y] = P(0.15, v), [x1] = P(0.85, v), s = S(v); box(x0, y - 18 * s, x1 - x0, 6 * s, '#7a5236'); } }); for (let i = 0; i < 6; i++) seat(0.2 + i * 0.12, v - 0.02); }
      for (let i = 0; i < 4; i++) seat(0.25 + i * 0.16, 0.32, false);
    } else if (k === 'school') {
      items.push({ v: 0.01, draw() { const [x0, y] = P(0.25, 0), [x1] = P(0.75, 0); box(x0, y - H * 0.2, x1 - x0, H * 0.14, '#2f5a46'); } });
      staff(0.5, 0.08);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { table(0.14 + c * 0.145, 0.3 + r * 0.17, 0.06, '#c9a46a'); seat(0.14 + c * 0.145, 0.33 + r * 0.17); }
    } else if (k === 'office') {
      DEPARTMENTS.forEach((d, i) => {
        const u = 0.14 + (i % 4) * 0.24, v = 0.2 + Math.floor(i / 4) * 0.46;
        items.push({ v: v + 0.25, draw() { const [x, y] = P(u, v - 0.12); label(d.name, x, y - 40 * S(v), Math.max(10, 13 * S(v)), d.color); if (busy.get(d.id)) { g.fillStyle = '#ffb43a'; g.beginPath(); g.arc(x + 46 * S(v), y - 40 * S(v), 6 * S(v), 0, 7); g.fill(); g.stroke(); } } });
        table(u, v, 0.15, '#9a7a5a'); table(u, v + 0.2, 0.15, '#9a7a5a');
        for (let s = 0; s < d.staff; s++) staff(u + (s % 2 ? 0.05 : -0.05), v - 0.02 + Math.floor(s / 2) * 0.2, true).dept = d.id;
      });
      // 窓口の来客
      for (let i = 0; i < 6; i++) seat(0.2 + i * 0.12, 0.97, false);
    } else if (k === 'house') {
      items.push({ v: 0.02, draw() { const [x0, y] = P(0.06, 0), s = S(0); box(x0, y - 60 * s, 46 * s, 50 * s, '#6b5a4c'); box(x0 + 5 * s, y - 55 * s, 36 * s, 26 * s, '#9fb8c0'); } }); // テレビ
      items.push({ v: 0.03, draw() { const [x0, y] = P(0.7, 0), s = S(0); box(x0, y - 80 * s, 60 * s, 70 * s, '#9a6a48'); } }); // たんす
      items.push({ v: 0.5, draw() { const [x, y] = P(0.5, 0.5), s = S(0.5); g.fillStyle = '#7a5236'; g.beginPath(); g.ellipse(x, y - 14 * s, 70 * s, 18 * s, 0, 0, 7); g.fill(); g.stroke(); } }); // ちゃぶ台
      for (const [u, v] of [[0.3, 0.42], [0.7, 0.42], [0.3, 0.66], [0.7, 0.66], [0.5, 0.78], [0.5, 0.3], [0.15, 0.85], [0.85, 0.85]]) seat(u, v, true);
    } else if (k === 'park') {
      items.push({ v: 0.4, draw() { const [x, y] = P(0.25, 0.4), s = S(0.4); g.fillStyle = '#e9dcb0'; g.beginPath(); g.ellipse(x, y, 70 * s, 20 * s, 0, 0, 7); g.fill(); } }); // 砂場
      items.push({ v: 0.3, draw() { const [x, y] = P(0.72, 0.3), s = S(0.3); g.strokeStyle = '#c8463a'; g.lineWidth = 4 * s; g.beginPath(); g.moveTo(x - 40 * s, y); g.lineTo(x - 30 * s, y - 70 * s); g.lineTo(x + 30 * s, y - 70 * s); g.lineTo(x + 40 * s, y); g.stroke(); } }); // ぶらんこ
      for (const [u, v] of [[0.25, 0.38], [0.33, 0.45], [0.18, 0.46], [0.7, 0.33], [0.76, 0.33], [0.5, 0.6], [0.6, 0.75], [0.35, 0.82], [0.8, 0.7], [0.15, 0.7]]) seat(u, v, false);
    } else {
      for (const [u, v] of [[0.3, 0.4], [0.7, 0.4], [0.3, 0.75], [0.7, 0.75]]) { table(u, v); seat(u - 0.07, v - 0.02); seat(u + 0.07, v - 0.02); }
      staff(0.5, 0.1);
    }
    return { items, staffSlots, seats };
  }

  function fit() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (!w || !h) return false;
    if (w !== W || h !== H) { W = w; H = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function draw(dt = 0) {
    if (!detail || !fit()) return;
    t += dt;
    const room = ROOM[kind] || ROOM.shop;
    const { P, S, top, bot } = geo();
    hits = [];
    // 奥の壁と床
    g.fillStyle = room.wall; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, top - H * 0.04, W, H * 0.04);
    g.fillStyle = room.trim; g.fillRect(0, 0, W, H * 0.05);
    if (!['sento', 'school', 'park', 'house'].includes(kind)) for (let i = 0; i < 4; i++) { // 窓
      const x = W * (0.12 + i * 0.22);
      box(x, H * 0.1, W * 0.12, H * 0.16, '#bfdce6'); g.strokeStyle = INK; g.beginPath(); g.moveTo(x + W * 0.06, H * 0.1); g.lineTo(x + W * 0.06, H * 0.26); g.stroke();
    }
    const [lx0, ly0] = P(0, 0), [rx0] = P(1, 0), [lx1, ly1] = P(0, 1), [rx1] = P(1, 1);
    g.fillStyle = room.floor; g.beginPath(); g.moveTo(lx0, ly0); g.lineTo(rx0, ly0); g.lineTo(rx1, ly1); g.lineTo(lx1, ly1); g.closePath(); g.fill();
    // 床の目地（畳・板・タイル）
    g.strokeStyle = 'rgba(34,50,79,.12)'; g.lineWidth = 1;
    for (let i = 1; i < 8; i++) { const [a, b] = P(i / 8, 0), [c, d] = P(i / 8, 1); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
    for (let i = 1; i < 6; i++) { const [a, b] = P(0, i / 6), [c] = P(1, i / 6); g.beginPath(); g.moveTo(a, b); g.lineTo(c, b); g.stroke(); }
    // 横の壁（切り口）
    g.fillStyle = 'rgba(34,50,79,.18)';
    g.beginPath(); g.moveTo(0, top - H * 0.04); g.lineTo(lx0, ly0); g.lineTo(lx1, ly1); g.lineTo(0, ly1); g.fill();
    g.beginPath(); g.moveTo(W, top - H * 0.04); g.lineTo(rx0, ly0); g.lineTo(rx1, ly1); g.lineTo(W, ly1); g.fill();

    const { items, staffSlots, seats } = furnish();
    // 人を席へ（働く人はカウンターの内側。県庁は部署の机）
    const people = detail.people || [];
    const usedStaff = new Set(), usedSeat = new Set();
    const placed = [];
    for (const p of people) {
      let slot = null;
      if (p.worker) {
        const i = staffSlots.findIndex((s, k) => !usedStaff.has(k) && (!s.dept || s.dept === p.dept));
        const pick = kind === 'office' && p.dept ? staffSlots.filter((s) => s.dept === p.dept)[p.seat ?? 0] : null;
        const k2 = pick ? staffSlots.indexOf(pick) : i;
        if (k2 >= 0 && !usedStaff.has(k2)) { usedStaff.add(k2); slot = staffSlots[k2]; }
      }
      if (!slot) {
        const k = seats.findIndex((_, j) => !usedSeat.has(j));
        if (k < 0) continue;
        usedSeat.add(k); slot = seats[k];
      }
      placed.push({ v: slot.v + 0.001, person: p, slot });
    }
    for (const it of [...items, ...placed].sort((a, b) => a.v - b.v)) {
      if (it.draw) { it.draw(); continue; }
      const { person: p, slot } = it;
      const [x, y] = P(slot.u, slot.v), s = S(slot.v);
      const h = (p.age < 13 ? 62 : 84) * s;
      const sway = slot.seated ? 0 : Math.sin(t * 2 + p.id) * 1.5 * s;
      drawFigure(g, p.look, x + sway, y, h, { seated: slot.seated });
      hits.push({ id: p.id, x0: x - h * 0.3, x1: x + h * 0.3, y0: y - h * 1.1, y1: y });
      const task = p.taskId && busy.get(`task${p.taskId}`);
      if (task) label(task, x, y - h * 1.25, Math.max(10, 12 * s), '#2f5ba0');
    }
    // 案内
    if (!people.length) label(detail.open === false ? '準備中（営業時間外）' : 'いまは誰もいません', W / 2, H * 0.62, 15, 'rgba(251,250,244,.95)', INK);
  }

  return {
    // detail: placeDetail か houseDetail の結果。people: 描く人（{id, look, age, worker, dept, seat, taskId}）
    show(d, k) { detail = d; kind = k; },
    setBusy(map) { busy = map; },
    draw,
    pick(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h.id; }
      return null;
    },
  };
}
