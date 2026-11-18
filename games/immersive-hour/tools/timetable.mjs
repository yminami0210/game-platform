// 脚本 JSON の整合性チェックと、README 用の時刻表（Markdown）出力。
// 使い方: node tools/timetable.mjs scenarios/shiomi-hotel.json
import { readFileSync } from 'node:fs';

const file = process.argv[2] || new URL('../scenarios/shiomi-hotel.json', import.meta.url);
const sc = JSON.parse(readFileSync(file, 'utf8'));
const L = sc.length;
const roomName = Object.fromEntries(sc.rooms.map(r => [r.id, r.name]));
const charName = Object.fromEntries(sc.characters.map(c => [c.id, c.short]));
const sceneIds = new Set(sc.scenes.map(s => s.id));
const truthIds = new Set(sc.truths.map(t => t.id));

const roomAt = (cid, m) => {
  let r = null;
  for (const e of sc.schedules[cid]) if (e.t <= m) r = e.room;
  return r;
};

const errors = [];
for (const c of sc.characters) {
  const s = sc.schedules[c.id];
  if (!s || s[0].t !== 0) errors.push(`${c.id}: 時刻表が 0 分から始まっていない`);
  s?.forEach(e => { if (!roomName[e.room]) errors.push(`${c.id}: 未知の部屋 ${e.room}`); });
}
for (const s of sc.scenes) {
  if (!roomName[s.room]) errors.push(`${s.id}: 未知の部屋 ${s.room}`);
  if (s.t + s.dur > L) errors.push(`${s.id}: 公演時間をはみ出す`);
  for (let m = s.t; m < s.t + s.dur; m++) {
    for (const c of s.chars) if (roomAt(c, m) !== s.room) errors.push(`${s.id}: ${m}分に ${c} が ${s.room} にいない`);
    for (const c of sc.characters) {
      if (!s.chars.includes(c.id) && roomAt(c.id, m) === s.room) errors.push(`${s.id}: ${m}分に登場しない ${c.id} が同室にいる`);
    }
  }
}
for (const t of sc.truths) {
  for (const r of t.requires) if (!sceneIds.has(r) && !truthIds.has(r)) errors.push(`${t.id}: 未知の要件 ${r}`);
}
const ids = sc.rooms.map(r => r.id);
for (const [a, b] of sc.doors) if (!ids.includes(a) || !ids.includes(b)) errors.push(`扉 ${a}-${b} が不正`);

const pad = n => String(n).padStart(2, '0');
const clock = m => `${pad(sc.clockStart.hour + Math.floor((sc.clockStart.minute + m) / 60))}:${pad((sc.clockStart.minute + m) % 60)}`;

let out = '### 人物ごとの居場所\n\n| 人物 | 時刻表 |\n|---|---|\n';
for (const c of sc.characters) {
  const s = sc.schedules[c.id];
  const segs = s.map((e, i) => `${clock(e.t)}–${clock(i + 1 < s.length ? s[i + 1].t : L)} ${roomName[e.room]}`);
  out += `| ${c.short}（${c.role}） | ${segs.join(' → ')} |\n`;
}
out += '\n### 場面一覧\n\n| ID | 時刻 | 部屋 | 登場 | 場面 | 真相 |\n|---|---|---|---|---|---|\n';
const usedBy = {};
for (const t of sc.truths) for (const r of t.requires) (usedBy[r] ||= []).push(t.title.split(' ')[0]);
for (const s of [...sc.scenes].sort((a, b) => a.t - b.t || a.id.localeCompare(b.id))) {
  out += `| ${s.id} | ${clock(s.t)}–${clock(s.t + s.dur)} | ${roomName[s.room]} | ${s.chars.map(c => charName[c]).join('・')} | ${s.title} | ${(usedBy[s.id] || ['—']).join('、')} |\n`;
}
console.log(out);
if (errors.length) {
  console.error('整合性エラー:\n' + errors.join('\n'));
  process.exit(1);
} else {
  console.error(`OK: 場面 ${sc.scenes.length} / 真相 ${sc.truths.length} / 人物 ${sc.characters.length}`);
}
