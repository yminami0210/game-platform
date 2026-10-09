// API の中身（HTTP に依存しない）。サーバー（index.js）とブラウザ単体モード（client/backend.js）が共有する。
import { DEPARTMENTS } from './lore.js';
import { PLACES } from './world.js';

const cleanName = (s) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20);
const SPAWNABLE_ROLES = new Set(['resident', 'worker', 'student']);
const badRequest = (msg) => Object.assign(new Error(msg), { code: 400 });

function randomToken() {
  const b = new Uint8Array(16);
  globalThis.crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export function createApi({ sim, chronicle, executor, seed }) {
  const tasks = () => sim.tasks.map((t) => sim.taskView(t));
  return {
    init: () => ({
      places: PLACES, departments: DEPARTMENTS, seed, roster: sim.roster(), clock: sim.clock(),
      tasks: tasks(), sns: chronicle.sns, logs: chronicle.recent, news: chronicle.latestNews(), llm: executor.status(),
    }),
    digest: () => sim.digestNow(),
    tasks,
    latestNews: () => chronicle.latestNews(),
    clock: () => ({ ...sim.clock(), llm: executor.status(), tasks: tasks() }),
    cp: (id) => sim.cpDetail(Number(id)),
    // 住民課: 新規 CP の追加（人事機能）
    residents(b = {}) {
      const role = SPAWNABLE_ROLES.has(b.role) ? b.role : 'resident';
      const t = sim.requestTask('resident_register', { name: cleanName(b.name) || undefined, role, work: role === 'worker' ? b.work : role === 'student' ? 'school' : undefined });
      return sim.taskView(t);
    },
    // 住民課: 人間アバターの登録。token を持つ端末だけがそのアバターを動かせる
    avatars(b = {}) {
      const name = cleanName(b.name);
      if (!name) throw badRequest('名前が必要です');
      const color = /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : '#ffcc00';
      const token = randomToken();
      const t = sim.requestTask('resident_register', { human: true, name, color, token });
      return { task: sim.taskView(t), token };
    },
    goto: (id, b = {}) => ({ ok: sim.moveHuman(Number(id), String(b.token || ''), Number(b.x) || 0, Number(b.z) || 0) }),
    // Claude Code スキル用: 外部実行タスクの作成と完了報告（作業中の CP が 3D に表示される）
    createTask(b = {}) {
      if (!['sns_post', 'newspaper'].includes(b.type)) throw badRequest('type は sns_post か newspaper');
      const event = b.topic ? { text: String(b.topic).slice(0, 120), placeName: '県内' } : undefined;
      return sim.taskView(sim.requestTask(b.type, { external: !!b.external, event }));
    },
    complete: (id, b = {}) => ({ ok: sim.completeExternal(Number(id), b.text || '') }),
    // 3D から撮った断面キャプチャ。最初に届いた 1 枚だけを採用する
    photo(photoId, dataUrl) {
      if (!/^[\w-]+$/.test(photoId) || !String(dataUrl).startsWith('data:image/jpeg;base64,')) throw badRequest('bad photo');
      if (!sim.photoSaved(photoId)) return { ok: false };
      chronicle.savePhoto(photoId, dataUrl);
      chronicle.emit('photo', { photoId, url: chronicle.photoUrl(photoId) });
      return { ok: true };
    },
  };
}
