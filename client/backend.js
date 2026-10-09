// 接続先の切り替え。
//   server: `npm start` のサーバーにつなぐ（同じ Wi-Fi のスマホからも可）
//   local : サーバーなしで、この端末の中でシミュレーションを回す（GitHub Pages・オフライン用。LLM 不使用＝トークン 0）
// どちらも同じ形のオブジェクトを返すので、main.js は接続先を意識しない。

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* 無視 */ } },
};

export async function createBackend() {
  const q = new URLSearchParams(location.search);
  // GitHub Pages など静的な置き場では、サーバーを探さずにこの端末で動かす
  const staticHost = /\.github\.io$/.test(location.hostname);
  if (q.get('mode') !== 'local' && !staticHost) {
    try {
      const r = await fetch('./api/init', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) return serverBackend(await r.json());
    } catch { /* サーバーなし → local */ }
  }
  return localBackend(q);
}

function serverBackend(init) {
  const es = new EventSource('./events');
  const post = async (path, body) => (await fetch(path, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body) })).json();
  return {
    mode: 'server',
    init,
    on: (type, fn) => es.addEventListener(type, (e) => fn(JSON.parse(e.data))),
    cp: async (id) => { const r = await fetch(`./api/cp/${id}`); return r.ok ? r.json() : null; },
    residents: (f) => post('./api/residents', f),
    avatars: (f) => post('./api/avatars', f),
    goto: (id, b) => post(`./api/avatars/${id}/goto`, b),
    photo: (id, dataUrl) => post(`./api/photos/${id}`, dataUrl).catch(() => {}),
    photoUrl: (id) => `data/photos/${id}.jpg`,
  };
}

const KEY = { state: 'nanashi.local.state', sns: 'nanashi.local.sns', news: 'nanashi.local.news', photos: 'nanashi.local.photos' };

async function localBackend(q) {
  const [{ Simulation }, { ChronicleCore }, { createApi }, { templates }] = await Promise.all([
    import('./shared/sim.js'), import('./shared/chronicle-core.js'), import('./shared/api.js'), import('./shared/templates.js'),
  ]);

  // 保存先は localStorage。容量が小さいので、残すのは住民名簿・SNS 50 件・最新の新聞・写真 6 枚だけ
  class LocalChronicle extends ChronicleCore {
    constructor() {
      super({ sns: ls.get(KEY.sns) || [] });
      this.news = ls.get(KEY.news);
      this.photos = new Map(ls.get(KEY.photos) || []);
    }
    postSns(post) { super.postSns(post); ls.set(KEY.sns, this.sns); }
    persistNews(file, issue) { ls.set(KEY.news, { file: file.slice(5), markdown: issue.markdown }); }
    persistPhoto(_file, dataUrl, id) {
      this.photos.set(id, dataUrl);
      while (this.photos.size > 6) this.photos.delete(this.photos.keys().next().value);
      if (!ls.set(KEY.photos, [...this.photos])) ls.del(KEY.photos);
    }
    photoUrl(id) { return this.photos.get(id) || ''; }
  }

  const chronicle = new LocalChronicle();
  const executor = {
    status: () => ({ mode: 'この端末（LLMなし）', budget: 0, tokens: 0, calls: 0 }),
    run: async (task, input) => ({ text: templates[task](input, Math.random), via: 'template', tokens: 0 }),
  };
  const small = matchMedia('(max-width: 760px)').matches;
  const seed = 7;
  const sim = new Simulation({ seed, population: Number(q.get('pop')) || (small ? 200 : 300), chronicle, executor, saved: ls.get(KEY.state) });
  const api = createApi({ sim, chronicle, executor, seed });
  const speed = Number(q.get('speed')) || 1;

  const handlers = new Map();
  const dispatch = (type, payload) => (handlers.get(type) || []).forEach((fn) => fn(payload));
  chronicle.listeners.add(dispatch);

  let last = performance.now();
  setInterval(() => {
    const now = performance.now();
    sim.tick(Math.min(0.5, (now - last) / 1000), speed);
    last = now;
  }, 100);
  setInterval(() => { dispatch('frame', sim.frame()); dispatch('clock', api.clock()); }, 300);
  let resetting = false;
  const save = () => !resetting && ls.set(KEY.state, sim.serialize());
  setInterval(save, 30000);
  addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());

  const later = (fn) => async (...a) => fn(...a);
  return {
    mode: 'local',
    init: api.init(),
    on: (type, fn) => handlers.set(type, [...(handlers.get(type) || []), fn]),
    cp: later((id) => api.cp(id)),
    residents: later((f) => api.residents(f)),
    avatars: later((f) => { try { return api.avatars(f); } catch (e) { return { error: e.message }; } }),
    goto: later((id, b) => api.goto(id, b)),
    photo: later((id, dataUrl) => api.photo(id, dataUrl)),
    photoUrl: (id) => chronicle.photoUrl(id),
    reset() {
      resetting = true;
      Object.values(KEY).forEach(ls.del);
      ls.del('nanashi.avatar');
      location.reload();
    },
  };
}
