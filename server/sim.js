// シミュレーション本体。CP は「決められた選択肢」を重み付きランダムで選ぶだけ（LLM 不使用）。
// スキルを持つ職員だけがタスクボード経由で実タスク（SNS投稿・写真・新聞・住民登録）を行う。
import { DEPARTMENTS, DEPT_ROUTINES, GIVEN_F, GIVEN_M, PLACE_ACTIONS, SURNAMES, TOWN_EVENTS } from './lore.js';
import { PLACES, PLACE_BY_ID, buildDesks, buildHouses, mulberry32, routeBetween, spotIn } from './world.js';

export const STATE = { walk: 0, idle: 1, desk: 2, task: 3, sleep: 4 };
const WEEK = ['月', '火', '水', '木', '金', '土', '日'];
const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));

// 勤め先（県庁以外）と、その職種
const WORKPLACES = ['super', 'conbini1', 'conbini2', 'mall', 'car', 'yaoya', 'sakanaya', 'kissa', 'shoten', 'shokudo', 'sento', 'station', 'bokujo', 'tanbo', 'school'];

export function dateLabel(day) {
  const d0 = day - 1;
  const year = Math.floor(d0 / 360) + 1;
  const month = ((Math.floor(d0 / 30) + 3) % 12) + 1; // 4月始まり、1か月30日
  const date = (d0 % 30) + 1;
  return `ナナシ暦${year}年 ${month}月${date}日（${WEEK[d0 % 7]}）`;
}

export class Simulation {
  constructor({ seed = 7, population = 300, chronicle, executor, saved = null }) {
    this.rnd = mulberry32(seed);
    this.chronicle = chronicle;
    this.executor = executor;
    this.houses = buildHouses(seed);
    this.desks = buildDesks();
    this.cps = [];
    this.tasks = [];
    this.nextId = 1;
    this.nextTaskId = 1;
    this.minutes = 6 * 60 + 30; // 1日目 6:30 から
    this.stats = { arrivals: 0, posts: 0, photos: 0 };
    this.postedEvents = new Set();
    this.lastHour = -1;
    this.lastDay = 1;
    this.nextEventAt = this.minutes + 20;
    this.pendingPhotos = new Map();
    if (saved) this.#restore(saved);
    else this.#populate(population);
  }

  // ---- 時刻 ----
  get day() { return Math.floor(this.minutes / 1440) + 1; }
  get hour() { return Math.floor((this.minutes % 1440) / 60); }
  get weekday() { return (this.day - 1) % 7; }
  timeLabel(m = this.minutes) {
    const h = Math.floor((m % 1440) / 60);
    const mm = Math.floor(m % 60);
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // ---- 住民 ----
  #name(sex) {
    return pick(SURNAMES, this.rnd) + ' ' + pick(sex === 'f' ? GIVEN_F : GIVEN_M, this.rnd);
  }

  #populate(n) {
    // 県庁職員（机の数だけ）
    this.desks.forEach((desk, i) => {
      this.addCp({ role: 'staff', dept: desk.dept, seat: desk.seat, desk: i, title: desk.seat === 0 ? '課長' : '主事' }, { silent: true });
    });
    // 店や施設の従業員（各 2〜4 人）
    for (const w of WORKPLACES) {
      const k = w === 'mall' || w === 'school' ? 4 : w.startsWith('conbini') ? 2 : 2 + Math.floor(this.rnd() * 2);
      for (let i = 0; i < k; i++) this.addCp({ role: 'worker', work: w }, { silent: true });
    }
    // 子ども・一般住民
    while (this.cps.length < n) {
      const r = this.rnd();
      this.addCp(r < 0.18 ? { role: 'student', work: 'school', age: 7 + Math.floor(this.rnd() * 6) } : { role: 'resident' }, { silent: true });
    }
  }

  addCp(spec = {}, { silent = false, arriveAt = null } = {}) {
    const sex = spec.sex || (this.rnd() < 0.5 ? 'm' : 'f');
    const home = this.houses[Math.floor(this.rnd() * this.houses.length)];
    const age = spec.age ?? (spec.role === 'resident' ? 20 + Math.floor(this.rnd() * 60) : 20 + Math.floor(this.rnd() * 40));
    const start = arriveAt || [home.x, home.z];
    const cp = {
      id: this.nextId++, name: spec.name || this.#name(sex), sex, age,
      role: spec.role || 'resident', dept: spec.dept || null, seat: spec.seat ?? null, desk: spec.desk ?? null,
      title: spec.title || null, work: spec.work || null, home: home.id, color: spec.color || null,
      x: start[0], z: start[1], path: [], state: STATE.idle, activity: '到着', until: this.minutes, place: null, taskId: null,
    };
    cp.skills = cp.dept ? DEPT_BY_ID[cp.dept].skills : [];
    this.cps.push(cp);
    if (!silent) {
      this.stats.arrivals++;
      this.chronicle.emit('roster', this.roster([cp]));
    }
    return cp;
  }

  #restore(saved) {
    Object.assign(this, { minutes: saved.minutes, nextId: saved.nextId, stats: saved.stats || this.stats });
    this.lastDay = this.day;
    this.nextEventAt = this.minutes + 20;
    for (const c of saved.cps) {
      const home = this.houses.find((h) => h.id === c.home) || this.houses[0];
      this.cps.push({ ...c, x: home.x, z: home.z, path: [], state: STATE.idle, activity: '在宅', until: this.minutes, place: null, taskId: null, skills: c.dept ? DEPT_BY_ID[c.dept].skills : [] });
    }
  }

  serialize() {
    const keep = ['id', 'name', 'sex', 'age', 'role', 'dept', 'seat', 'desk', 'title', 'work', 'home', 'color', 'ownerToken'];
    return { minutes: this.minutes, nextId: this.nextId, stats: this.stats, cps: this.cps.map((c) => Object.fromEntries(keep.map((k) => [k, c[k]]))) };
  }

  roster(list = this.cps) {
    return list.map((c) => ({ id: c.id, name: c.name, role: c.role, dept: c.dept, title: c.title, work: c.work, sex: c.sex, age: c.age, color: c.color, skills: c.skills }));
  }

  // ---- 移動 ----
  #goTo(cp, x, z, place = null) {
    cp.path = routeBetween(cp.x, cp.z, x, z);
    cp.state = STATE.walk;
    cp.place = place;
  }

  // dm: 経過したゲーム内の分。歩く速さはゲーム時間基準（m/分）なので、時間を早回ししても通勤時間は同じ
  #step(cp, dm) {
    let budget = (cp.role === 'student' ? 14 : 12) * dm;
    while (budget > 0 && cp.path.length) {
      const [tx, tz] = cp.path[0];
      const dx = tx - cp.x, dz = tz - cp.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= budget) {
        cp.x = tx; cp.z = tz; budget -= dist; cp.path.shift();
      } else {
        cp.x += (dx / dist) * budget; cp.z += (dz / dist) * budget; budget = 0;
      }
    }
    return cp.path.length === 0;
  }

  // ---- 意思決定（重み付きランダム） ----
  #decide(cp) {
    const h = this.hour;
    const weekend = this.weekday >= 5;
    const night = h >= 23 || h < 6;
    const home = this.houses.find((x) => x.id === cp.home);
    if (cp.role === 'human') return; // 人間アバターは自分で動く

    if (night) return this.#plan(cp, 'home', home, STATE.sleep, 60, '就寝');

    if (cp.role === 'staff' && !weekend && h >= 8 && h < 18 && h !== 12) {
      const d = this.desks[cp.desk];
      const routine = pick(DEPT_ROUTINES[cp.dept], this.rnd);
      return this.#plan(cp, 'office', { x: d.x, z: d.z, exact: true }, STATE.desk, 30 + this.rnd() * 60, routine);
    }
    if ((cp.role === 'worker' || cp.role === 'student') && !weekend && h >= (cp.role === 'student' ? 8 : 9) && h < (cp.role === 'student' ? 15 : 19) && h !== 12) {
      const p = PLACE_BY_ID[cp.work];
      return this.#plan(cp, p.id, p, STATE.desk, 40 + this.rnd() * 60, cp.role === 'student' ? pick(PLACE_ACTIONS.school, this.rnd) : pick(['仕事をした', '店番をした', '品出しをした', '帳簿をつけた'], this.rnd));
    }

    const options = [
      ['home', h >= 20 ? 6 : 2], ['super', h >= 16 && h < 20 ? 4 : 1], ['conbini', 1.5], ['shop', h >= 9 && h < 18 ? 2 : 0.2],
      ['park', h < 18 ? 1.5 : 0.3], ['sento', h >= 16 && h < 23 ? 2 : 0], ['kissa', h >= 9 && h < 19 ? 1.2 : 0],
      ['shokudo', h >= 11 && h < 14 ? 5 : h >= 18 && h < 21 ? 2 : 0], ['mall', weekend ? 3 : 0.6], ['station', 0.5], ['car', 0.15],
    ];
    const kind = weighted(options, this.rnd);
    if (kind === 'home') return this.#plan(cp, 'home', home, STATE.idle, 30 + this.rnd() * 90, pick(PLACE_ACTIONS.home, this.rnd));
    const candidates = PLACES.filter((p) => p.kind === kind || (kind === 'conbini' && p.kind === 'conbini') || (kind === 'shop' && p.kind === 'shop'));
    const p = pick(candidates.length ? candidates : [PLACE_BY_ID.park], this.rnd);
    const acts = PLACE_ACTIONS[p.kind] || PLACE_ACTIONS.shop;
    this.#plan(cp, p.id, p, STATE.idle, 15 + this.rnd() * 45, pick(acts, this.rnd));
  }

  #plan(cp, placeId, target, arriveState, dwell, activity) {
    const [x, z] = target.exact ? [target.x, target.z] : placeId === 'home' ? [target.x, target.z + 5] : spotIn(target, this.rnd);
    this.#goTo(cp, x, z, placeId);
    cp.next = { state: arriveState, dwell, activity };
  }

  #arrive(cp) {
    const n = cp.next || { state: STATE.idle, dwell: 20, activity: 'ひと休みした' };
    cp.next = null;
    cp.state = n.state;
    cp.until = this.minutes + n.dwell;
    cp.activity = n.activity;
    const place = cp.place === 'home' ? '自宅' : cp.place === 'office' ? '県庁' : PLACE_BY_ID[cp.place]?.name || '町なか';
    if (n.state !== STATE.sleep) {
      // 日常の行動はほぼ importance 0（ファイルにのみ残す）。たまに 1 で画面ログへ。
      this.chronicle.log({ day: this.day, time: this.timeLabel(), who: cp.name, cpId: cp.id, place: cp.place, placeName: place, text: `${cp.name}が${place}で${n.activity}`, importance: this.rnd() < 0.04 ? 1 : 0 });
    }
  }

  // ---- 町の出来事 ----
  #townEvent() {
    const today = new Set(this.chronicle.day.map((e) => e.text));
    const fresh = TOWN_EVENTS.filter((e) => !today.has(e.text));
    const ev = pick(fresh.length ? fresh : TOWN_EVENTS, this.rnd);
    const place = PLACE_BY_ID[ev.place];
    const near = this.cps.filter((c) => c.role !== 'human' && Math.abs(c.x - place.x) < 60 && Math.abs(c.z - place.z) < 60);
    const who = pick(near.length ? near : this.cps, this.rnd);
    const e = this.chronicle.log({ day: this.day, time: this.timeLabel(), who: who.name, cpId: who.id, place: place.id, placeName: place.name, text: ev.text, importance: ev.importance, kind: 'event' });
    if (ev.importance >= 3) this.requestTask('photo', { event: e, place: place.id });
  }

  // ---- タスクボード（スキル保持者が実行） ----
  requestTask(type, input = {}) {
    const meta = {
      sns_post: { dept: 'koho', title: 'SNS投稿', duration: 25 },
      photo: { dept: 'koho', title: '写真撮影', duration: 15 },
      newspaper: { dept: 'koho', title: '県民新聞の編集', duration: 60 },
      resident_register: { dept: 'jumin', title: input.human ? 'アバター登録' : '転入手続き', duration: 20 },
    }[type];
    if (!meta) throw new Error(`unknown task ${type}`);
    const external = !!input.external;
    if (external) meta.title += '（Claude Code）';
    const t = { id: this.nextTaskId++, type, ...meta, input, external, externalResult: null, status: 'queued', assignee: null, progress: 0, createdAt: this.minutes };
    this.tasks.push(t);
    this.chronicle.emit('task', this.taskView(t));
    return t;
  }

  #assignTasks() {
    for (const t of this.tasks.filter((x) => x.status === 'queued')) {
      const busy = new Set(this.tasks.filter((x) => x.assignee && x.status !== 'done').map((x) => x.assignee));
      const staff = this.cps.filter((c) => c.dept === t.dept && c.skills.includes(t.type) && !busy.has(c.id));
      if (!staff.length) continue;
      // 課長が新聞、ほかは席にいる人を優先
      const cp = t.type === 'newspaper' ? staff.find((c) => c.seat === 0) || staff[0]
        : staff.find((c) => c.place === 'office' && c.state === STATE.desk) || staff.find((c) => c.seat !== 0) || staff[0];
      t.assignee = cp.id;
      t.status = 'walking';
      cp.taskId = t.id;
      const target = t.type === 'photo' ? PLACE_BY_ID[t.input.place] : null;
      if (target) this.#goTo(cp, ...spotIn(target, this.rnd), target.id);
      else { const d = this.desks[cp.desk]; this.#goTo(cp, d.x, d.z, 'office'); }
      cp.activity = `${t.title}に向かっている`;
      this.chronicle.log({ day: this.day, time: this.timeLabel(), who: cp.name, cpId: cp.id, place: 'office', placeName: '県庁', text: `${DEPT_BY_ID[t.dept].name}の${cp.name}が「${t.title}」に着手`, importance: 1, kind: 'task' });
      this.chronicle.emit('task', this.taskView(t));
    }
  }

  #workTasks() {
    for (const t of this.tasks.filter((x) => x.status === 'walking' || x.status === 'working')) {
      const cp = this.cps.find((c) => c.id === t.assignee);
      if (!cp) { t.status = 'queued'; t.assignee = null; continue; }
      if (t.status === 'walking' && cp.path.length === 0) {
        t.status = 'working';
        t.startedAt = this.minutes;
        cp.state = STATE.task;
        cp.activity = `${t.title}中`;
        if (t.type === 'photo') this.#requestPhoto(t, cp);
        this.chronicle.emit('task', this.taskView(t));
      }
      if (t.status === 'working') {
        cp.state = STATE.task;
        cp.until = this.minutes + 5;
        t.progress = Math.min(1, (this.minutes - t.startedAt) / t.duration);
        // 外部（Claude Code スキル）実行中のタスクは、結果が届くまで 95% で待つ。240 分で打ち切り
        if (t.external && t.externalResult == null) {
          if (this.minutes - t.startedAt > 240) t.external = false;
          else t.progress = Math.min(t.progress, 0.95);
        }
        if (t.progress >= 1) this.#finish(t, cp);
      }
    }
    this.tasks = this.tasks.filter((t) => t.status !== 'done' || this.minutes - t.doneAt < 120);
  }

  #requestPhoto(t, cp) {
    const place = PLACE_BY_ID[t.input.place];
    const photoId = `day${this.day}-task${t.id}`;
    this.pendingPhotos.set(photoId, { taskId: t.id, place: place.id });
    // 接続中のブラウザに「この場所を撮って」と依頼（3D の断面キャプチャ）
    this.chronicle.emit('photo_request', { photoId, x: place.x, z: place.z, h: place.h || 6, cpId: cp.id, title: t.input.event?.text || place.name });
  }

  async #finish(t, cp) {
    t.status = 'done';
    t.doneAt = this.minutes;
    cp.taskId = null;
    cp.state = STATE.idle;
    cp.until = this.minutes; // 次の行動へ
    const author = `${DEPT_BY_ID[t.dept].name} ${cp.name}`;
    const base = { day: this.day, time: this.timeLabel(), who: cp.name, cpId: cp.id, place: 'office', placeName: '県庁' };
    this.chronicle.emit('task', this.taskView(t));
    if (t.type === 'sns_post') {
      const event = t.input.event || { text: '県庁からのお知らせ', placeName: '県庁' };
      const r = t.externalResult != null ? { text: t.externalResult, via: 'claude-code' } : await this.executor.run('sns_post', { event, author: cp.name }, this.day);
      this.stats.posts++;
      this.chronicle.postSns({ id: `p${this.day}-${t.id}`, day: this.day, time: base.time, author, text: r.text, via: r.via, photo: t.input.photo || null });
      this.chronicle.log({ ...base, text: `${author}がナナシッターに投稿した`, importance: 1, kind: 'task' });
    } else if (t.type === 'photo') {
      this.chronicle.log({ ...base, place: t.input.place, placeName: PLACE_BY_ID[t.input.place].name, text: `${author}が${PLACE_BY_ID[t.input.place].name}で写真を撮った`, importance: 1, kind: 'task' });
      // 写真つきの SNS 投稿を続けて依頼する
      const photoId = `day${this.day}-task${t.id}`;
      this.postedEvents.add(t.input.event.text);
      this.requestTask('sns_post', { event: t.input.event, photo: photoId });
    } else if (t.type === 'newspaper') {
      const input = t.input.digest ? t.input : { ...this.digestNow(), dateLabel: dateLabel(this.day) };
      const r = t.externalResult != null ? { text: t.externalResult, via: 'claude-code' } : await this.executor.run('newspaper', input, this.day);
      const file = this.chronicle.publishNews({ day: input.day, markdown: r.text, via: r.via });
      this.chronicle.log({ ...base, text: `ナナシ県民新聞 第${input.day}号が発行された（${file}）`, importance: 2, kind: 'task' });
    } else if (t.type === 'resident_register') {
      const st = PLACE_BY_ID.station;
      const spec = t.input.human
        ? { role: 'human', name: t.input.name, color: t.input.color, age: t.input.age }
        : { role: t.input.role || 'resident', name: t.input.name, work: t.input.work, age: t.input.age };
      const nc = this.addCp(spec, { arriveAt: [st.x + (this.rnd() - 0.5) * 10, st.z - 10] });
      if (t.input.token) nc.ownerToken = t.input.token;
      t.result = { cpId: nc.id };
      this.chronicle.log({ ...base, text: `住民課の${cp.name}が${nc.name}さんの${t.input.human ? 'アバター登録' : '転入届'}を受理。ナナシ駅に到着した`, importance: 2, kind: 'arrival' });
      this.chronicle.emit('registered', { taskId: t.id, cpId: nc.id, human: !!t.input.human, token: t.input.token || null });
    }
  }

  // Claude Code スキルからの完了報告
  completeExternal(id, text) {
    const t = this.tasks.find((x) => x.id === id && x.external && x.status !== 'done');
    if (!t) return false;
    t.externalResult = String(text).slice(0, 4000);
    if (t.status === 'working') t.progress = 1;
    t.duration = 0; // 着席したら即完了
    return true;
  }

  digestNow() {
    return { day: this.day, date: dateLabel(this.day), time: this.timeLabel(), digest: this.chronicle.digest(), stats: { population: this.cps.length, ...this.stats } };
  }

  taskView(t) {
    const cp = this.cps.find((c) => c.id === t.assignee);
    return { id: t.id, type: t.type, external: t.external, title: t.title, dept: t.dept, deptName: DEPT_BY_ID[t.dept].name, status: t.status, progress: t.progress, assignee: t.assignee, assigneeName: cp?.name || null, result: t.result || null };
  }

  // ---- 定期処理 ----
  #hourly() {
    const h = this.hour;
    const weekend = this.weekday >= 5;
    if (h >= 7 && this.pendingNews) {
      this.requestTask('newspaper', this.pendingNews);
      this.pendingNews = null;
    }
    // 広報課: 業務時間中、まだ投稿していない話題を SNS に
    if (!weekend && h >= 9 && h <= 16) {
      const fresh = this.chronicle.day.filter((e) => e.kind === 'event' && !this.postedEvents.has(e.text));
      const pending = this.tasks.some((t) => t.type === 'sns_post' && t.status !== 'done' && !t.input.photo && !t.external);
      if (fresh.length && !pending && this.rnd() < 0.6) {
        const ev = fresh.sort((a, b) => b.importance - a.importance)[0];
        this.postedEvents.add(ev.text);
        this.requestTask('sns_post', { event: ev });
      }
    }
    // 断面スナップショット（毎時）
    const byPlace = {};
    for (const c of this.cps) byPlace[c.place || 'street'] = (byPlace[c.place || 'street'] || 0) + 1;
    this.chronicle.snapshot(this.day, h, { day: this.day, time: this.timeLabel(), date: dateLabel(this.day), population: this.cps.length, byPlace, tasks: this.tasks.map((t) => this.taskView(t)) });
  }

  #daily(prevDay) {
    // 前日分の新聞を朝に作る（素材はローカル要約のダイジェストのみ）
    // 素材は日付が変わった時点で確定し、課長が出勤する朝 7 時に編集を始める
    this.pendingNews = { day: prevDay, dateLabel: dateLabel(prevDay), digest: this.chronicle.digest(), stats: { population: this.cps.length, ...this.stats } };
    this.chronicle.resetDay();
    this.postedEvents.clear();
    this.stats = { arrivals: 0, posts: 0, photos: 0 };
  }

  photoSaved(photoId) {
    if (!this.pendingPhotos.has(photoId)) return false;
    this.pendingPhotos.delete(photoId);
    this.stats.photos++;
    return true;
  }

  // 人間アバターの移動（クライアントから）
  moveHuman(id, token, x, z) {
    const cp = this.cps.find((c) => c.id === id && c.role === 'human' && c.ownerToken && c.ownerToken === token);
    if (!cp) return false;
    this.#goTo(cp, x, z, null);
    cp.next = { state: STATE.idle, dwell: 9999, activity: '散歩中' };
    return true;
  }

  tick(dtReal, gameMinutesPerSecond = 1) {
    this.minutes += dtReal * gameMinutesPerSecond;
    if (this.day !== this.lastDay) { const prev = this.lastDay; this.lastDay = this.day; this.#daily(prev); }
    if (this.hour !== this.lastHour) { this.lastHour = this.hour; this.#hourly(); }
    const h = this.hour;
    if (this.minutes >= this.nextEventAt) {
      if (h >= 7 && h < 22) this.#townEvent();
      this.nextEventAt = this.minutes + 30 + this.rnd() * 60;
    }
    this.#assignTasks();
    this.#workTasks();
    for (const cp of this.cps) {
      if (cp.state === STATE.walk) {
        if (this.#step(cp, dtReal * gameMinutesPerSecond)) {
          if (cp.taskId) continue; // タスクボード側で到着処理
          this.#arrive(cp);
        }
      } else if (cp.state !== STATE.task && this.minutes >= cp.until) {
        this.#decide(cp);
      }
    }
  }

  // クライアントへ送るコンパクトな位置情報 [id, x, z, state, ...]
  frame() {
    const a = new Array(this.cps.length * 4);
    this.cps.forEach((c, i) => {
      a[i * 4] = c.id; a[i * 4 + 1] = Math.round(c.x * 10) / 10; a[i * 4 + 2] = Math.round(c.z * 10) / 10; a[i * 4 + 3] = c.state;
    });
    return { m: Math.floor(this.minutes), p: a };
  }

  clock() {
    return { minutes: Math.floor(this.minutes), day: this.day, time: this.timeLabel(), date: dateLabel(this.day), population: this.cps.length };
  }

  cpDetail(id) {
    const c = this.cps.find((x) => x.id === id);
    if (!c) return null;
    const place = c.place === 'home' ? '自宅' : c.place === 'office' ? '県庁' : PLACE_BY_ID[c.place]?.name || '移動中';
    return { ...this.roster([c])[0], activity: c.activity, place, state: c.state, taskId: c.taskId, deptName: c.dept ? DEPT_BY_ID[c.dept].name : null, workName: c.work ? PLACE_BY_ID[c.work]?.name : null };
  }
}

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

function weighted(options, rnd) {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [k, w] of options) if ((r -= w) <= 0) return k;
  return options[0][0];
}
