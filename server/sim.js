// シミュレーション本体。CP は LLM を使わず、決められた暮らしの予定と重み付きランダムで動く。
// 住人は「世帯 → 住まい → 勤め先・学校 → 毎日の予定」で一人ずつ管理する（住民台帳）。
// 町は駅を中心にしたベッドタウン。働く住人の多くは電車で県外へ通い、県外からも人が来る。
import { DEPARTMENTS, DEPT_ROUTINES, GIVEN_F, GIVEN_M, PLACE_ACTIONS, SURNAMES, TOWN_EVENTS, TRIP_WORDS } from './lore.js';
import {
  CATALOG, CITIES, HOUSE_TYPES, KIND_INFO, buildDesks, defaultLayout, makeHouse, mulberry32,
  placementError, platformSpot, routeBetween, spotIn, TRAIN_TIMES, EPOCH_UTC,
} from './world.js';

export const STATE = { walk: 0, idle: 1, desk: 2, task: 3, sleep: 4, wait: 5, away: 6 };
const WEEK = ['月', '火', '水', '木', '金', '土', '日'];
const DEPT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d]));
const SAVE_VERSION = 2;

export const ROLE_LABEL = {
  staff: '県庁職員', worker: '町で勤務', commuter: '県外へ通勤', incommuter: '県外から通勤', student: '児童',
  retired: '隠居', homemaker: '家事', visitor: '来訪者', human: '人間アバター',
};

// 日付は現実の暦と同じ（年だけナナシ暦。2026年 = 1年）
export function dateLabel(day) {
  const d = new Date(EPOCH_UTC + (day - 1) * 86400000);
  return `ナナシ暦${d.getUTCFullYear() - 2025}年 ${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${WEEK[(d.getUTCDay() + 6) % 7]}）`;
}

// 住所（区画から町名を付ける）
export function addressOf(h) {
  const zone = Math.abs(h.x) <= 60 && Math.abs(h.z) <= 60 ? '駅前' : h.z > 120 ? '浜町' : h.z < -120 ? '山手' : h.x < 0 ? '西町' : '東町';
  return `${zone}${String(h.id).replace(/\D/g, '')}番地`;
}

const cityName = (id) => CITIES.find((c) => c.id === id)?.name || '県外';

export class Simulation {
  constructor({ seed = 7, population = 420, commuteShare = 0.85, chronicle, executor, saved = null, startMinutes = 9 * 60 + 30 }) {
    this.rnd = mulberry32(seed);
    this.seed = seed;
    this.commuteShare = commuteShare;
    this.chronicle = chronicle;
    this.executor = executor;
    this.cps = [];
    this.households = new Map();
    this.tasks = [];
    this.nextId = 1;
    this.nextHh = 1;
    this.nextTaskId = 1;
    this.minutes = startMinutes; // 現実の時刻（world.js の realMinutes）から始める。テストでは 1日目 9:30
    this.stats = { arrivals: 0, departures: 0, posts: 0, photos: 0, commutersOut: 0, visitors: 0 };
    this.postedEvents = new Set();
    this.pendingPhotos = new Map();
    if (saved && saved.version === SAVE_VERSION) this.#restore(saved);
    else {
      this.layout = defaultLayout(seed);
      this.#index();
      this.#populate(population);
    }
    this.lastHour = this.hour;
    this.lastDay = this.day;
    this.lastTrainCheck = this.minutes;
    this.nextEventAt = this.minutes + 20;
  }

  // ---- 時刻 ----
  get day() { return Math.floor(this.minutes / 1440) + 1; }
  get hour() { return Math.floor((this.minutes % 1440) / 60); }
  get hf() { return (this.minutes % 1440) / 60; }
  get weekday() { return (this.day - 1) % 7; }
  get weekend() { return this.weekday >= 5; }
  dayStart(day = this.day) { return (day - 1) * 1440; }
  timeLabel(m = this.minutes) {
    const h = Math.floor((m % 1440) / 60);
    const mm = Math.floor(m % 60);
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // ---- レイアウト（建物） ----
  #index() {
    this.placeById = Object.fromEntries(this.layout.places.map((p) => [p.id, p]));
    this.houseById = Object.fromEntries(this.layout.houses.map((h) => [h.id, h]));
    this.desks = buildDesks(this.placeById.office);
    this.station = this.placeById.station;
  }
  places(kinds) {
    return this.layout.places.filter((p) => kinds.includes(p.kind));
  }
  #placeName(id) {
    if (id === 'home') return '自宅';
    if (id === 'office') return '県庁';
    if (id === 'out') return '県外';
    return this.placeById[id]?.name || '町なか';
  }

  // ---- 住民 ----
  #given(sex) { return pick(sex === 'f' ? GIVEN_F : GIVEN_M, this.rnd); }
  #between(a, b) { return a + this.rnd() * (b - a); }

  #newPerson({ surname, sex, age, hh = null, home = null, resident = true }) {
    sex = sex || (this.rnd() < 0.5 ? 'm' : 'f');
    const cp = {
      id: this.nextId++, surname, given: this.#given(sex), sex, age, hh, home, resident,
      role: null, dept: null, seat: null, desk: null, title: null, work: null, city: null, color: null,
      // 毎日の予定（その人らしさ）。時は小数（7.5 = 7:30）
      p: {
        wake: age >= 65 ? this.#between(5.2, 6.3) : this.#between(6.0, 7.3),
        sleep: age < 13 ? this.#between(20.5, 21.5) : age >= 65 ? this.#between(21, 22.5) : this.#between(22.5, 23.8),
        leave: this.#between(6.7, 8.1), back: this.#between(17.6, 19.8),
        offDay: Math.floor(this.rnd() * 7), // 町の店で働く人の休み
        fav: {},
      },
      x: 0, z: 0, path: [], state: STATE.idle, activity: '在宅', until: this.minutes, place: null, taskId: null, next: null,
      away: false, returnAt: null, trip: null,
    };
    cp.name = `${surname} ${cp.given}`;
    return cp;
  }

  // 世帯をひとつ作る（家の種類で家族構成を変える）
  #newHousehold(house, unit, { surname = pick(SURNAMES, this.rnd), template = null } = {}) {
    const hh = { id: `hh${this.nextHh++}`, surname, house: house?.id || null, unit, members: [] };
    const add = (sex, age) => {
      const cp = this.#newPerson({ surname, sex, age, hh: hh.id, home: house?.id || null });
      hh.members.push(cp.id);
      this.cps.push(cp);
      return cp;
    };
    const t = template || (house ? { hira: this.rnd() < 0.45 ? 'family' : this.rnd() < 0.6 ? 'elders' : 'elder', niko: 'family', apart: this.rnd() < 0.6 ? 'single' : 'couple', mise: 'shop' }[house.type] : 'single');
    const adultAge = () => Math.round(this.#between(28, 52));
    if (t === 'elders') { add('m', Math.round(this.#between(66, 84))); add('f', Math.round(this.#between(64, 82))); }
    else if (t === 'elder') add(null, Math.round(this.#between(70, 88)));
    else if (t === 'single') add(null, Math.round(this.#between(20, 36)));
    else if (t === 'couple') { const a = Math.round(this.#between(24, 38)); add('m', a); add('f', a - 2); }
    else {
      const a = adultAge();
      add('m', a + 2); add('f', a);
      const kids = t === 'shop' ? Math.floor(this.rnd() * 2) : 1 + Math.floor(this.rnd() * 2);
      for (let i = 0; i < kids; i++) add(null, Math.round(this.#between(6, 17)));
      if (this.rnd() < 0.1) add(null, Math.round(this.#between(70, 86))); // 同居の祖父母
    }
    hh.type = t;
    this.households.set(hh.id, hh);
    return hh;
  }

  #vacancies() {
    const used = new Map();
    for (const hh of this.households.values()) if (hh.house) used.set(hh.house, (used.get(hh.house) || 0) + 1);
    const out = [];
    for (const h of this.layout.houses) for (let u = used.get(h.id) || 0; u < h.units; u++) out.push({ house: h, unit: u });
    return out;
  }

  #populate(n) {
    // 1) 家に世帯を入れていく（人口が n に届くまで。残りは空き家）
    const houses = shuffle([...this.layout.houses], this.rnd);
    for (const house of houses) {
      for (let u = 0; u < house.units && this.cps.length < n; u++) this.#newHousehold(house, u);
      if (this.cps.length >= n) break;
    }
    // 2) 役割を決める
    const working = [];
    for (const hh of this.households.values()) {
      const members = hh.members.map((id) => this.cpById(id));
      const adults = members.filter((c) => c.age >= 20 && c.age < 65);
      if (hh.type === 'shop' && adults[0]) Object.assign(adults.shift(), { role: 'worker', work: 'home' }); // 一階の店を営む
      if (hh.type === 'family' && adults.length === 2 && this.rnd() < 0.3) Object.assign(adults.pop(), { role: 'homemaker' });
      for (const c of members) {
        if (c.role) continue;
        if (c.age < 13) c.role = 'student';
        else if (c.age < 20) Object.assign(c, { role: 'commuter', city: 'nanami', school: true, p: { ...c.p, leave: this.#between(6.9, 7.5), back: this.#between(16.2, 18.2) } }); // 高校はナナミ市
        else if (c.age >= 65) c.role = 'retired';
        else working.push(c);
      }
    }
    // 3) 町の働き口（県庁の机＋店や施設）。住人で埋めるのは働く人の (1 - 通勤率) まで
    const jobs = [
      ...this.desks.map((d, i) => ({ desk: i, dept: d.dept, seat: d.seat })),
      ...this.layout.places.flatMap((p) => Array.from({ length: KIND_INFO[p.kind]?.jobs || 0 }, () => ({ place: p.id }))),
    ];
    shuffle(jobs, this.rnd);
    shuffle(working, this.rnd);
    const inTown = Math.round(working.length * (1 - this.commuteShare));
    working.forEach((c, i) => {
      if (i < inTown && jobs.length) this.#assignJob(c, jobs.pop());
      else Object.assign(c, { role: 'commuter', city: this.rnd() < 0.75 ? 'nanami' : 'otogi' });
    });
    // 4) 余った働き口は、県外から電車で通ってくる人で埋める
    for (const job of jobs) this.#newIncommuter(job);
    // 5) 最初の居場所: 住人は家、通勤者は予定どおり
    for (const c of this.cps) this.#placeAtStart(c);
  }

  #assignJob(c, job) {
    if (job.desk != null) Object.assign(c, { role: 'staff', dept: job.dept, seat: job.seat, desk: job.desk, title: job.seat === 0 ? '課長' : '主事', work: 'office' });
    else Object.assign(c, { role: 'worker', work: job.place });
    c.p.offDay = c.role === 'staff' ? 5 : c.p.offDay;
  }

  #newIncommuter(job) {
    const c = this.#newPerson({ surname: pick(SURNAMES, this.rnd), age: Math.round(this.#between(22, 60)), resident: false });
    c.city = this.rnd() < 0.6 ? 'nanami' : 'otogi';
    this.#assignJob(c, job);
    c.role = c.role === 'staff' ? 'staff' : 'worker';
    c.incoming = true; // 県外から通う人（住まいは県外）
    this.cps.push(c);
    return c;
  }

  #placeAtStart(c) {
    if (!c.resident) {
      // 平日の勤務時間に始まったときは、県外から通う人はもう職場にいる
      const info = this.#workInfo(c);
      if (!this.weekend && this.hf >= c.p.leave && this.hf < info.close) { [c.x, c.z] = platformSpot(this.station, this.rnd); c.place = 'station'; }
      else this.#sendAway(c, this.#nextArrival(c));
      return;
    }
    const home = this.houseById[c.home];
    if (home) { c.x = home.x; c.z = home.z; c.place = 'home'; }
    if (c.role === 'commuter' && !this.weekend && this.hf > c.p.leave && this.hf < c.p.back) this.#sendAway(c, this.dayStart() + c.p.back * 60, 'commute');
  }

  cpById(id) {
    return this.cps.find((c) => c.id === id);
  }

  // 互換: 住民課の「転入」や API から呼ばれる
  addCp(spec = {}, { arriveAt = null } = {}) {
    const vac = this.#vacancies()[0];
    const hh = this.#newHousehold(vac?.house || null, vac?.unit ?? 0, { template: 'single', surname: spec.name?.split(/\s+/)[0] || pick(SURNAMES, this.rnd) });
    const cp = this.cpById(hh.members[0]);
    if (spec.name) { cp.name = spec.name; cp.given = spec.name.split(/\s+/)[1] || ''; }
    if (spec.age) cp.age = spec.age;
    cp.role = spec.role === 'human' ? 'human' : spec.role === 'student' ? 'student' : spec.role === 'worker' && this.placeById[spec.work] ? 'worker' : 'commuter';
    if (cp.role === 'worker') cp.work = spec.work;
    if (cp.role === 'commuter') cp.city = 'nanami';
    cp.color = spec.color || null;
    const [x, z] = arriveAt || platformSpot(this.station, this.rnd);
    Object.assign(cp, { x, z, place: 'station', until: this.minutes });
    this.stats.arrivals++;
    this.chronicle.emit('roster', this.roster([cp]));
    return cp;
  }

  // ---- 保存と復元 ----
  serialize() {
    const keep = ['id', 'name', 'surname', 'given', 'sex', 'age', 'hh', 'home', 'resident', 'incoming', 'school', 'role', 'dept', 'seat', 'desk', 'title', 'work', 'city', 'color', 'ownerToken', 'p', 'away', 'returnAt', 'trip', 'visitPlan'];
    return {
      version: SAVE_VERSION, minutes: this.minutes, nextId: this.nextId, nextHh: this.nextHh, stats: this.stats, layout: this.layout,
      households: [...this.households.values()],
      cps: this.cps.map((c) => Object.fromEntries(keep.filter((k) => c[k] !== undefined).map((k) => [k, c[k]]))),
    };
  }

  #restore(saved) {
    Object.assign(this, { minutes: saved.minutes, nextId: saved.nextId, nextHh: saved.nextHh, stats: { ...this.stats, ...saved.stats }, layout: saved.layout });
    this.#index();
    for (const hh of saved.households) this.households.set(hh.id, hh);
    for (const c of saved.cps) {
      const cp = { ...c, x: 0, z: 0, path: [], state: c.away ? STATE.away : STATE.idle, activity: c.away ? `${cityName(c.city)}にいる` : '在宅', until: this.minutes, place: c.away ? 'out' : 'home', taskId: null, next: null };
      const home = this.houseById[cp.home];
      if (home) { cp.x = home.x; cp.z = home.z; } else { [cp.x, cp.z] = platformSpot(this.station, this.rnd); }
      this.cps.push(cp);
    }
  }

  roster(list = this.cps) {
    return list.map((c) => ({
      id: c.id, name: c.name, role: c.role, dept: c.dept, title: c.title, work: c.work, sex: c.sex, age: c.age, color: c.color,
      skills: c.dept ? DEPT_BY_ID[c.dept].skills : [], resident: c.resident, hh: c.hh,
    }));
  }

  // ---- 移動 ----
  #goTo(cp, x, z, place = null) {
    cp.path = routeBetween(cp.x, cp.z, x, z);
    cp.state = STATE.walk;
    cp.place = place;
  }

  #step(cp, dm) {
    let budget = (cp.age < 13 ? 75 : cp.age >= 70 ? 55 : 70) * dm; // 歩く速さ（m/分。人が歩くくらい）
    while (budget > 0 && cp.path.length) {
      const [tx, tz] = cp.path[0];
      const dx = tx - cp.x, dz = tz - cp.z;
      const dist = Math.hypot(dx, dz);
      if (dist <= budget) { cp.x = tx; cp.z = tz; budget -= dist; cp.path.shift(); }
      else { cp.x += (dx / dist) * budget; cp.z += (dz / dist) * budget; budget = 0; }
    }
    return cp.path.length === 0;
  }

  #plan(cp, placeId, arriveState, dwell, activity) {
    let x, z;
    if (placeId === 'home') {
      const h = this.houseById[cp.home];
      if (!h) return this.#plan(cp, 'station', STATE.idle, dwell, '駅のベンチで休んだ');
      x = h.x + Math.sin(h.rot) * (Math.max(h.w, h.d) / 2 + 1.2); z = h.z + Math.cos(h.rot) * (Math.max(h.w, h.d) / 2 + 1.2);
      x = h.x * 0.7 + x * 0.3; z = h.z * 0.7 + z * 0.3; // 家の中寄り（玄関の内側）
    } else if (placeId === 'office') {
      const d = this.desks[cp.desk]; x = d.x; z = d.z;
    } else if (placeId === 'platform') {
      [x, z] = platformSpot(this.station, this.rnd); placeId = 'station';
    } else {
      const p = this.placeById[placeId];
      if (!p) return this.#plan(cp, 'home', STATE.idle, 30, '家に帰った');
      [x, z] = spotIn(p, this.rnd);
    }
    this.#goTo(cp, x, z, placeId);
    cp.next = { state: arriveState, dwell, activity };
  }

  #arrive(cp) {
    const n = cp.next || { state: STATE.idle, dwell: 20, activity: 'ひと休みした' };
    cp.next = null;
    cp.state = n.state;
    cp.until = this.minutes + n.dwell;
    cp.activity = n.activity;
    if (n.state !== STATE.sleep && n.state !== STATE.wait) {
      const place = this.#placeName(cp.place);
      this.chronicle.log({ day: this.day, time: this.timeLabel(), who: cp.name, cpId: cp.id, place: cp.place, placeName: place, text: `${cp.name}が${place}で${n.activity}`, importance: this.rnd() < 0.03 ? 1 : 0 });
    }
  }

  // ---- 駅と電車 ----
  #nextArrival(c) {
    // 県外から通う人の、次に町に着く時刻（平日の朝）
    let day = this.hf < c.p.leave ? this.day : this.day + 1;
    while ((day - 1) % 7 >= 5) day++;
    return this.dayStart(day) + c.p.leave * 60 + 20;
  }

  #sendAway(c, returnAt, purpose = 'commute') {
    Object.assign(c, { away: true, returnAt, trip: purpose, state: STATE.away, path: [], place: 'out', activity: `${cityName(c.city)}${purpose === 'outing' ? 'へお出かけ中' : 'にいる'}` });
    [c.x, c.z] = platformSpot(this.station, this.rnd);
  }

  // 電車が着いた: 降りる人を町に出し、待っている人を乗せる
  #trainArrives(atMinute) {
    let off = 0, on = 0;
    const leaving = [];
    for (const c of this.cps) {
      if (c.away && c.returnAt != null && c.returnAt <= atMinute + 1) {
        c.away = false; c.returnAt = null; c.trip = null;
        [c.x, c.z] = platformSpot(this.station, this.rnd);
        Object.assign(c, { state: STATE.idle, place: 'station', until: this.minutes, activity: '電車を降りた' });
        off++;
      } else if (c.state === STATE.wait) {
        if (c.trip === 'leave') { leaving.push(c); continue; }
        const back = c.trip === 'outing' ? this.dayStart() + this.#between(15.5, 18) * 60 : c.incoming ? this.#nextArrival(c) : this.dayStart() + c.p.back * 60;
        this.#sendAway(c, back, c.trip || 'commute');
        on++;
        if (c.trip === 'commute' && c.resident) this.stats.commutersOut++;
      }
    }
    for (const c of leaving) this.#removeCp(c, c.resident ? '転出' : '帰った');
    // 昼間は県外から遊びに来る人が降りる
    const h = this.hf;
    if (h >= 9.5 && h <= 14.5 && this.rnd() < 0.55) {
      const n = 1 + Math.floor(this.rnd() * 3);
      for (let i = 0; i < n; i++) this.#spawnVisitor();
      off += n;
    }
    const total = this.cps.length;
    if (on + off >= 6) {
      this.chronicle.log({ day: this.day, time: this.timeLabel(atMinute), who: '駅員', place: 'station', placeName: 'ナナシ駅', text: `${this.timeLabel(atMinute)}の電車で${off}人が降り、${on}人が乗った`, importance: on + off >= 20 ? 2 : 1, kind: 'train' });
    }
    return { off, on, total };
  }

  #spawnVisitor() {
    const c = this.#newPerson({ surname: pick(SURNAMES, this.rnd), age: Math.round(this.#between(18, 75)), resident: false });
    c.role = 'visitor';
    c.city = this.rnd() < 0.5 ? 'nanami' : 'otogi';
    const kinds = ['kissa', 'shop', 'sento', 'shokudo', 'park', 'mall', 'super'];
    c.visitPlan = shuffle(this.places(kinds).map((p) => p.id), this.rnd).slice(0, 2 + Math.floor(this.rnd() * 2));
    [c.x, c.z] = platformSpot(this.station, this.rnd);
    Object.assign(c, { place: 'station', until: this.minutes, activity: `${cityName(c.city)}${pick(TRIP_WORDS.visit, this.rnd)}` });
    this.cps.push(c);
    this.stats.visitors++;
    this.chronicle.emit('roster', this.roster([c]));
  }

  #removeCp(c, reason) {
    this.cps = this.cps.filter((x) => x !== c);
    if (c.hh) {
      const hh = this.households.get(c.hh);
      if (hh) { hh.members = hh.members.filter((id) => id !== c.id); if (!hh.members.length) this.households.delete(c.hh); }
    }
    if (reason === '転出') this.stats.departures++;
    this.chronicle.emit('roster_remove', { id: c.id });
  }

  #goToTrain(cp, trip, activity) {
    cp.trip = trip;
    this.#plan(cp, 'platform', STATE.wait, 999, activity);
  }

  // ---- 意思決定 ----
  #fav(cp, key, kinds) {
    if (!this.placeById[cp.p.fav[key]]) {
      const list = this.places(kinds);
      cp.p.fav[key] = list.length ? pick(list, this.rnd).id : null;
    }
    return cp.p.fav[key];
  }

  #decide(cp) {
    if (cp.role === 'human' || cp.away || cp.state === STATE.wait) return;
    const h = this.hf;
    const wk = this.weekend;

    if (cp.role === 'visitor') {
      const next = cp.visitPlan?.shift();
      if (next && h < 17.5) {
        const p = this.placeById[next];
        if (p) return this.#plan(cp, next, STATE.idle, this.#between(30, 70), pick(PLACE_ACTIONS[p.kind] || PLACE_ACTIONS.shop, this.rnd));
      }
      return this.#goToTrain(cp, 'leave', `${cityName(cp.city)}へ帰る電車を待っている`);
    }

    if (cp.incoming) {
      const info = this.#workInfo(cp);
      if (h < info.close && !wk) return this.#plan(cp, cp.work, STATE.desk, Math.min(60, (info.close - h) * 60), this.#workActivity(cp));
      return this.#goToTrain(cp, 'commute', `${cityName(cp.city)}へ帰る電車を待っている`);
    }

    // 寝る時間
    if (h < cp.p.wake || h >= cp.p.sleep) {
      const until = h >= cp.p.sleep ? (24 - h + cp.p.wake) * 60 : (cp.p.wake - h) * 60;
      return this.#plan(cp, 'home', STATE.sleep, Math.max(20, until), '就寝');
    }

    if (cp.role === 'commuter' && !wk && h >= cp.p.leave && h < cp.p.back - 1 && cp.lastCommute !== this.day) {
      cp.lastCommute = this.day;
      return this.#goToTrain(cp, 'commute', `${cityName(cp.city)}行きの電車を待っている`);
    }
    if ((cp.role === 'staff' || cp.role === 'worker') && this.#atWorkHours(cp)) {
      if (h >= 12 && h < 13 && cp.work !== 'home') return this.#plan(cp, this.#fav(cp, 'eat', ['shokudo', 'kissa', 'conbini']) || 'home', STATE.idle, 40, '昼ごはんを食べた');
      if (cp.work === 'home') return this.#plan(cp, 'home', STATE.desk, 60, '店番をした');
      return this.#plan(cp, cp.work, STATE.desk, this.#between(40, 80), this.#workActivity(cp));
    }
    if (cp.role === 'student' && !wk && h >= 8 && h < 15) {
      const school = this.places(['school'])[0];
      if (school) return this.#plan(cp, school.id, STATE.desk, this.#between(40, 80), pick(PLACE_ACTIONS.school, this.rnd));
    }
    // 週末の県外へのお出かけ（若い人ほど）
    if (wk && h >= 9.5 && h < 11.5 && cp.age >= 18 && cp.age < 60 && cp.lastOuting !== this.day && this.rnd() < 0.25) {
      cp.lastOuting = this.day;
      cp.city = cp.city || 'nanami';
      return this.#goToTrain(cp, 'outing', `${cityName(cp.city)}へ出かける電車を待っている`);
    }
    return this.#leisure(cp, h, wk);
  }

  #workInfo(cp) {
    if (cp.role === 'staff') return { open: 8.5, close: 17.25 };
    if (cp.work === 'home') return { open: 9, close: 19 };
    return KIND_INFO[this.placeById[cp.work]?.kind] || { open: 9, close: 18 };
  }
  #atWorkHours(cp) {
    const { open, close } = this.#workInfo(cp);
    const off = cp.role === 'staff' ? this.weekend : this.weekday === cp.p.offDay;
    const shiftEnd = Math.min(close, open + 9); // 長い営業は早番だけ受け持つ
    return !off && this.hf >= open - 0.2 && this.hf < shiftEnd;
  }
  #workActivity(cp) {
    if (cp.role === 'staff') return pick(DEPT_ROUTINES[cp.dept], this.rnd);
    return pick(['仕事をした', '店番をした', '品出しをした', '帳簿をつけた'], this.rnd);
  }

  #leisure(cp, h, wk) {
    const retired = cp.role === 'retired' || cp.role === 'homemaker';
    const options = [
      ['home', h >= 20 ? 8 : retired ? 3 : 2],
      ['shop', h >= 15.5 && h < 19.5 ? 5 : h >= 10 && h < 12 && retired ? 3 : 0.6],
      ['bath', h >= 16 && h < 22 ? (cp.age >= 60 ? 4 : 1.5) : 0],
      ['kissa', h >= 9 && h < 18 ? (retired ? 2.5 : 1) : 0],
      ['eat', (h >= 11.5 && h < 13.5) || (h >= 18 && h < 20) ? 2.5 : 0],
      ['park', h >= 6 && h < 8 && cp.age >= 60 ? 6 : h < 17 ? (cp.age < 13 ? 4 : 1) : 0.2],
      ['mall', wk && h >= 10 && h < 19 ? 3 : 0.4],
      ['errand', h >= 9 && h < 17 ? 0.6 : 0],
    ];
    const k = weighted(options, this.rnd);
    if (k === 'home') return this.#plan(cp, 'home', STATE.idle, this.#between(40, 120), pick(PLACE_ACTIONS.home, this.rnd));
    const ids = {
      shop: () => this.#fav(cp, 'shop', ['super', 'shop', 'conbini']),
      bath: () => this.#fav(cp, 'bath', ['sento']),
      kissa: () => this.#fav(cp, 'kissa', ['kissa']),
      eat: () => this.#fav(cp, 'eat', ['shokudo', 'kissa']),
      park: () => this.#fav(cp, 'park', ['park']),
      mall: () => this.#fav(cp, 'mall', ['mall', 'car']),
      errand: () => pick(this.places(['post', 'clinic', 'koban', 'conbini', 'shop']), this.rnd)?.id,
    };
    const id = ids[k]();
    const p = this.placeById[id];
    if (!p) return this.#plan(cp, 'home', STATE.idle, 60, pick(PLACE_ACTIONS.home, this.rnd));
    this.#plan(cp, id, STATE.idle, this.#between(20, 60), pick(PLACE_ACTIONS[p.kind] || PLACE_ACTIONS.shop, this.rnd));
  }

  // ---- 町の出来事 ----
  #townEvent() {
    const today = new Set(this.chronicle.day.map((e) => e.text));
    const fresh = TOWN_EVENTS.filter((e) => !today.has(e.text) && this.placeById[e.place]);
    if (!fresh.length) return;
    const ev = pick(fresh, this.rnd);
    const place = this.placeById[ev.place];
    const here = this.cps.filter((c) => !c.away && c.role !== 'human');
    const near = here.filter((c) => Math.abs(c.x - place.x) < 60 && Math.abs(c.z - place.z) < 60);
    const who = pick(near.length ? near : here, this.rnd);
    if (!who) return;
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
      // 県外にいる職員には頼めない
      const staff = this.cps.filter((c) => c.dept === t.dept && DEPT_BY_ID[c.dept].skills.includes(t.type) && !busy.has(c.id) && !c.away && c.state !== STATE.wait);
      if (!staff.length) continue;
      const cp = t.type === 'newspaper' ? staff.find((c) => c.seat === 0) || staff[0]
        : staff.find((c) => c.place === 'office' && c.state === STATE.desk) || staff.find((c) => c.seat !== 0) || staff[0];
      t.assignee = cp.id;
      t.status = 'walking';
      cp.taskId = t.id;
      cp.next = null;
      const target = t.type === 'photo' ? this.placeById[t.input.place] : null;
      if (target) this.#goTo(cp, ...spotIn(target, this.rnd), target.id);
      else { const d = this.desks[cp.desk]; this.#goTo(cp, d.x, d.z, 'office'); }
      cp.activity = `${t.title}に向かっている`;
      this.chronicle.log({ day: this.day, time: this.timeLabel(), who: cp.name, cpId: cp.id, place: 'office', placeName: '県庁', text: `${DEPT_BY_ID[t.dept].name}の${cp.name}が「${t.title}」に着手`, importance: 1, kind: 'task' });
      this.chronicle.emit('task', this.taskView(t));
    }
  }

  #workTasks() {
    for (const t of this.tasks.filter((x) => x.status === 'walking' || x.status === 'working')) {
      const cp = this.cpById(t.assignee);
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
    const place = this.placeById[t.input.place];
    if (!place) return;
    const photoId = `day${this.day}-task${t.id}`;
    this.pendingPhotos.set(photoId, { taskId: t.id, place: place.id });
    this.chronicle.emit('photo_request', { photoId, x: place.x, z: place.z, h: place.h || 6, cpId: cp.id, title: t.input.event?.text || place.name });
  }

  async #finish(t, cp) {
    t.status = 'done';
    t.doneAt = this.minutes;
    cp.taskId = null;
    cp.state = STATE.idle;
    cp.until = this.minutes;
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
      const pn = this.#placeName(t.input.place);
      this.chronicle.log({ ...base, place: t.input.place, placeName: pn, text: `${author}が${pn}で写真を撮った`, importance: 1, kind: 'task' });
      this.postedEvents.add(t.input.event.text);
      this.requestTask('sns_post', { event: t.input.event, photo: `day${this.day}-task${t.id}` });
    } else if (t.type === 'newspaper') {
      const input = t.input.digest ? t.input : { ...this.digestNow(), dateLabel: dateLabel(this.day) };
      const r = t.externalResult != null ? { text: t.externalResult, via: 'claude-code' } : await this.executor.run('newspaper', input, this.day);
      const file = this.chronicle.publishNews({ day: input.day, markdown: r.text, via: r.via });
      this.chronicle.log({ ...base, text: `ナナシ県民新聞 第${input.day}号が発行された（${file}）`, importance: 2, kind: 'task' });
    } else if (t.type === 'resident_register') {
      const vac = this.#vacancies();
      if (!vac.length && !t.input.human) {
        t.result = { error: '空き家がない' };
        this.chronicle.log({ ...base, text: `住民課の${cp.name}が転入の相談を受けたが、空き家がなくお断りした`, importance: 1, kind: 'arrival' });
        return;
      }
      const spec = t.input.human
        ? { role: 'human', name: t.input.name, color: t.input.color, age: t.input.age }
        : { role: t.input.role || 'commuter', name: t.input.name, work: t.input.work, age: t.input.age };
      const nc = this.addCp(spec);
      if (t.input.token) nc.ownerToken = t.input.token;
      t.result = { cpId: nc.id };
      const home = this.houseById[nc.home];
      this.chronicle.log({ ...base, text: `住民課の${cp.name}が${nc.name}さんの${t.input.human ? 'アバター登録' : '転入届'}を受理（${home ? addressOf(home) : '仮住まい'}）。ナナシ駅に着いた`, importance: 2, kind: 'arrival' });
      this.chronicle.emit('registered', { taskId: t.id, cpId: nc.id, human: !!t.input.human, token: t.input.token || null });
    }
  }

  completeExternal(id, text) {
    const t = this.tasks.find((x) => x.id === id && x.external && x.status !== 'done');
    if (!t) return false;
    t.externalResult = String(text).slice(0, 4000);
    if (t.status === 'working') t.progress = 1;
    t.duration = 0;
    return true;
  }

  digestNow() {
    return { day: this.day, date: dateLabel(this.day), time: this.timeLabel(), digest: this.chronicle.digest(), stats: { population: this.residentCount(), ...this.stats } };
  }

  taskView(t) {
    const cp = this.cpById(t.assignee);
    return { id: t.id, type: t.type, external: t.external, title: t.title, dept: t.dept, deptName: DEPT_BY_ID[t.dept].name, status: t.status, progress: t.progress, assignee: t.assignee, assigneeName: cp?.name || null, result: t.result || null };
  }

  // ---- 管理者（シムシティのように建物を動かす・建てる・壊す） ----
  #layoutChanged(note) {
    this.layout.version = (this.layout.version || 1) + 1;
    this.#index();
    this.chronicle.emit('layout', this.layout);
    this.chronicle.log({ day: this.day, time: this.timeLabel(), who: '県庁 土木課', place: 'office', placeName: '県庁', text: note, importance: 2, kind: 'build' });
  }

  adminAdd({ item, x, z, rot = 0 }) {
    const c = CATALOG[item];
    if (!c) return { error: 'その建物は建てられません' };
    const id = `${c.house ? 'h' : 'p'}x${this.layout.nextId++}`;
    let b;
    if (c.house) b = makeHouse(c.house, x, z, snapRot(rot), id);
    else {
      const used = new Set(this.layout.places.map((p) => p.name));
      const name = c.names.find((n) => !used.has(n)) || `${c.names[0]}${this.layout.nextId}`;
      b = { id, name, kind: c.kind, x: Math.round(x), z: Math.round(z), w: c.w, d: c.d, h: c.h, color: c.color, sign: name.replace(/^ナナシ/, '') };
    }
    const err = placementError(this.layout, b);
    if (err) { this.layout.nextId--; return { error: err }; }
    (c.house ? this.layout.houses : this.layout.places).push(b);
    // 働き口ができたら、まずは県外から通ってくる人で埋まる
    if (!c.house) for (let i = 0; i < (KIND_INFO[b.kind]?.jobs || 0); i++) this.#newIncommuter({ place: b.id });
    this.#layoutChanged(`${c.house ? `${HOUSE_TYPES[c.house].label}（${addressOf(b)}）` : b.name}が新しく建った`);
    return { ok: true, id };
  }

  adminMove({ id, x, z, rot }) {
    const b = this.placeById[id] || this.houseById[id];
    if (!b) return { error: '建物が見つかりません' };
    if (b.locked) return { error: `${b.name}は動かせません（町の中心のため）` };
    const moved = { ...b, x: Math.round(x ?? b.x), z: Math.round(z ?? b.z), rot: b.type ? snapRot(rot ?? b.rot) : b.rot };
    const err = placementError(this.layout, moved, id);
    if (err) return { error: err };
    Object.assign(b, moved);
    // 動いた家に住む人・向かっている人は、次の行動で新しい場所へ行く
    for (const c of this.cps) if (c.place === id || (c.home === id && c.place === 'home' && !c.away)) { c.path = []; c.until = this.minutes; if (c.state === STATE.walk) c.state = STATE.idle; }
    this.#layoutChanged(`${b.name || addressOf(b)}が移転した`);
    return { ok: true };
  }

  adminRemove({ id }) {
    const place = this.placeById[id], house = this.houseById[id];
    const b = place || house;
    if (!b) return { error: '建物が見つかりません' };
    if (b.locked) return { error: `${b.name}は取り壊せません（町の中心のため）` };
    if (house) {
      this.layout.houses = this.layout.houses.filter((h) => h !== house);
      this.#index();
      // 住んでいた世帯は空き家へ引っ越す。空きがなければ電車で転出する
      for (const hh of [...this.households.values()].filter((x) => x.house === id)) {
        const vac = this.#vacancies()[0];
        if (vac) { hh.house = vac.house.id; hh.unit = vac.unit; for (const m of hh.members) { const c = this.cpById(m); if (c) { c.home = vac.house.id; c.until = this.minutes; } } }
        else for (const m of hh.members) { const c = this.cpById(m); if (c && !c.away) this.#goToTrain(c, 'leave', '引っ越しのため駅へ向かっている'); else if (c) this.#removeCp(c, '転出'); }
      }
    } else {
      this.layout.places = this.layout.places.filter((p) => p !== place);
      this.#index();
      // 勤め先がなくなった人: 住人は県外へ通勤、県外から来ていた人はもう来ない
      for (const c of [...this.cps]) {
        if (c.work !== id) continue;
        if (c.incoming) this.#removeCp(c, '帰った');
        else Object.assign(c, { role: 'commuter', work: null, city: 'nanami', until: this.minutes });
      }
    }
    this.#layoutChanged(`${b.name || `${HOUSE_TYPES[b.type].label}（${addressOf(b)}）`}が取り壊された`);
    return { ok: true };
  }

  // ---- 住民台帳 ----
  residentCount() {
    return this.cps.filter((c) => c.resident).length;
  }

  registry() {
    const households = [...this.households.values()].map((hh) => {
      const h = this.houseById[hh.house];
      return {
        id: hh.id, surname: hh.surname, address: h ? addressOf(h) + (h.units > 1 ? ` ${hh.unit + 1}号室` : '') : '仮住まい', houseType: h ? HOUSE_TYPES[h.type].label : null,
        members: hh.members.map((id) => this.cpById(id)).filter(Boolean).map((c) => ({ id: c.id, name: c.name, age: c.age, role: ROLE_LABEL[c.role] || c.role, work: this.#workLabel(c), away: c.away })),
      };
    });
    const residents = this.cps.filter((c) => c.resident);
    const workers = residents.filter((c) => ['staff', 'worker', 'commuter'].includes(c.role));
    return {
      households,
      summary: {
        residents: residents.length, households: households.length, vacancies: this.#vacancies().length,
        commuters: residents.filter((c) => c.role === 'commuter').length, workers: workers.length,
        incommuters: this.cps.filter((c) => c.incoming).length, visitors: this.cps.filter((c) => c.role === 'visitor').length,
        awayNow: residents.filter((c) => c.away).length, inTownNow: this.cps.filter((c) => !c.away).length,
      },
    };
  }

  #workLabel(c) {
    if (c.role === 'staff') return `ナナシ県庁 ${DEPT_BY_ID[c.dept].name}${c.title ? ' ' + c.title : ''}`;
    if (c.role === 'worker') return c.work === 'home' ? '自宅で店を営む' : this.#placeName(c.work);
    if (c.role === 'commuter') return `${cityName(c.city)}の${c.school ? '高校' : '会社'}`;
    if (c.role === 'student') return this.places(['school'])[0]?.name || '学校';
    return '';
  }

  cpDetail(id) {
    const c = this.cpById(Number(id));
    if (!c) return null;
    const hh = this.households.get(c.hh);
    const h = this.houseById[c.home];
    const t = (x) => `${Math.floor(x)}:${String(Math.round((x % 1) * 60)).padStart(2, '0')}`;
    let today = '';
    if (c.role === 'commuter') today = `${t(c.p.leave)}ごろ駅へ → ${cityName(c.city)}で${c.school ? '授業' : '仕事'} → ${t(c.p.back)}ごろの電車で帰る`;
    else if (c.incoming) today = `${cityName(c.city)}から朝の電車で来て、夕方に帰る`;
    else if (c.role === 'staff' || c.role === 'worker') today = `${t(this.#workInfo(c).open)}から仕事（休み: ${WEEK[c.p.offDay]}曜${c.role === 'staff' ? '・土日' : ''}）`;
    else if (c.role === 'student') today = '8:00〜15:00 学校、そのあと公園か家';
    else if (c.role === 'visitor') today = `${cityName(c.city)}から日帰りで来ている`;
    else today = `${t(c.p.wake)}に起きて、町で過ごす`;
    return {
      ...this.roster([c])[0], activity: c.activity, place: c.away ? cityName(c.city) : this.#placeName(c.place), state: c.state, taskId: c.taskId,
      roleLabel: ROLE_LABEL[c.role] || c.role, household: hh ? `${hh.surname}家（${hh.members.length}人）` : null,
      address: h ? addressOf(h) + (h.units > 1 && hh ? ` ${hh.unit + 1}号室` : '') : c.resident ? '仮住まい' : `${cityName(c.city)}在住`,
      workLabel: this.#workLabel(c), today, deptName: c.dept ? DEPT_BY_ID[c.dept].name : null,
    };
  }

  // ---- 定期処理 ----
  #hourly() {
    const h = this.hour;
    if (h >= 7 && this.pendingNews) { this.requestTask('newspaper', this.pendingNews); this.pendingNews = null; }
    if (!this.weekend && h >= 9 && h <= 16) {
      const fresh = this.chronicle.day.filter((e) => e.kind === 'event' && !this.postedEvents.has(e.text));
      const pending = this.tasks.some((t) => t.type === 'sns_post' && t.status !== 'done' && !t.input.photo && !t.external);
      if (fresh.length && !pending && this.rnd() < 0.6) {
        const ev = fresh.sort((a, b) => b.importance - a.importance)[0];
        this.postedEvents.add(ev.text);
        this.requestTask('sns_post', { event: ev });
      }
    }
    // 空き家があれば、ときどき県外から引っ越してくる（転入届は住民課が受け付ける）
    if (h === 10 && this.rnd() < 0.5 && this.#vacancies().length) this.requestTask('resident_register', { role: 'commuter' });
    const byPlace = {};
    for (const c of this.cps) byPlace[c.away ? 'out' : c.place || 'street'] = (byPlace[c.away ? 'out' : c.place || 'street'] || 0) + 1;
    this.chronicle.snapshot(this.day, h, { day: this.day, time: this.timeLabel(), date: dateLabel(this.day), population: this.residentCount(), inTown: this.cps.filter((c) => !c.away).length, byPlace, tasks: this.tasks.map((t) => this.taskView(t)) });
  }

  #daily(prevDay) {
    this.pendingNews = { day: prevDay, dateLabel: dateLabel(prevDay), digest: this.chronicle.digest(), stats: { population: this.residentCount(), ...this.stats } };
    this.chronicle.resetDay();
    this.postedEvents.clear();
    this.stats = { arrivals: 0, departures: 0, posts: 0, photos: 0, commutersOut: 0, visitors: 0 };
  }

  photoSaved(photoId) {
    if (!this.pendingPhotos.has(photoId)) return false;
    this.pendingPhotos.delete(photoId);
    this.stats.photos++;
    return true;
  }

  moveHuman(id, token, x, z) {
    const cp = this.cps.find((c) => c.id === id && c.role === 'human' && c.ownerToken && c.ownerToken === token);
    if (!cp) return false;
    this.#goTo(cp, x, z, null);
    cp.next = { state: STATE.idle, dwell: 9999, activity: '散歩中' };
    return true;
  }

  // 現実の時刻に合わせて進める。少しの遅れはなめらかに、30分以上離れていたら一気に飛ぶ
  advanceTo(target, dtReal) {
    const delta = target - this.minutes;
    if (delta <= 0) return;
    if (delta > 30) return this.jumpTo(target);
    this.tick(dtReal, delta / Math.max(dtReal, 0.001));
  }

  // アプリを閉じていたあいだを飛ばす: 時刻を合わせ、全員をその時刻にいるはずの場所へ置き直す
  jumpTo(target) {
    const prevDay = this.day;
    this.minutes = target;
    if (this.day !== prevDay) { this.lastDay = this.day; this.#daily(this.day - 1); }
    this.lastHour = this.hour;
    this.nextEventAt = this.minutes + 20;
    for (const t of this.tasks) if (t.status !== 'done') { t.status = 'done'; t.doneAt = this.minutes; }
    for (const c of [...this.cps]) {
      if (c.role === 'visitor') { this.#removeCp(c, '帰った'); continue; }
      Object.assign(c, { path: [], next: null, taskId: null, away: false, returnAt: null, trip: null, state: STATE.idle, until: this.minutes });
      if (c.role === 'human') continue;
      this.#placeAtStart(c);
    }
  }

  tick(dtReal, gameMinutesPerSecond = 1) {
    const before = this.minutes;
    this.minutes += dtReal * gameMinutesPerSecond;
    if (this.day !== this.lastDay) { const prev = this.lastDay; this.lastDay = this.day; this.#daily(prev); }
    if (this.hour !== this.lastHour) { this.lastHour = this.hour; this.#hourly(); }
    // 電車の到着（時刻表どおり）
    for (const t of TRAIN_TIMES) {
      for (const dayOff of [0, 1440]) {
        const at = this.dayStart() + t - dayOff;
        if (at > before && at <= this.minutes) this.#trainArrives(at);
      }
    }
    if (this.minutes >= this.nextEventAt) {
      if (this.hour >= 7 && this.hour < 22) this.#townEvent();
      this.nextEventAt = this.minutes + 30 + this.rnd() * 60;
    }
    this.#assignTasks();
    this.#workTasks();
    const dm = dtReal * gameMinutesPerSecond;
    for (const cp of this.cps) {
      if (cp.state === STATE.away) continue;
      if (cp.state === STATE.walk) {
        if (this.#step(cp, dm)) {
          if (cp.taskId) continue;
          this.#arrive(cp);
        }
      } else if (cp.state !== STATE.task && cp.state !== STATE.wait && this.minutes >= cp.until) {
        this.#decide(cp);
      }
    }
  }

  // クライアントへ送る位置 [id, x, z, state, ...]。県外にいる人は送らない
  frame() {
    const here = this.cps.filter((c) => c.state !== STATE.away);
    const a = new Array(here.length * 4);
    here.forEach((c, i) => {
      a[i * 4] = c.id; a[i * 4 + 1] = Math.round(c.x * 10) / 10; a[i * 4 + 2] = Math.round(c.z * 10) / 10; a[i * 4 + 3] = c.state;
    });
    return { m: Math.floor(this.minutes), p: a };
  }

  clock() {
    return {
      minutes: Math.floor(this.minutes), day: this.day, time: this.timeLabel(), date: dateLabel(this.day),
      population: this.residentCount(), inTown: this.cps.filter((c) => !c.away).length, away: this.cps.filter((c) => c.resident && c.away).length,
    };
  }
}

function snapRot(r) {
  const q = Math.round((r || 0) / (Math.PI / 2));
  return (((q % 4) + 4) % 4) * (Math.PI / 2);
}

function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}

function shuffle(arr, rnd) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

function weighted(options, rnd) {
  const total = options.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [k, w] of options) if ((r -= w) <= 0) return k;
  return options[0][0];
}

