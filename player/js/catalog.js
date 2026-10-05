// ミニゲームの一覧を読む。日々のバッチ（/arcade-make）が作る arcade/catalog.json を読むだけで、書き換えない。

const CATALOG_URL = "../arcade/catalog.json";
const BEST_KEYS_URL = "data/best-keys.json";
const PLAYABLE = new Set(["ready", "published"]);

export const gameUrl = (game) => `../arcade/games/${encodeURIComponent(game.id)}/index.html`;

export async function loadCatalog() {
  const [catalog, bestKeys] = await Promise.all([
    fetch(CATALOG_URL, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`catalog.json を読めませんでした（${r.status}）`);
      return r.json();
    }),
    fetch(BEST_KEYS_URL).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);
  // catalog.json は新しい順。遊べるものだけにする
  const games = catalog.games.filter((g) => PLAYABLE.has(g.status));
  return games.map((g, i) => ({
    ...g,
    isNew: i < 2, // 新しい2本に印
    bestKey: g.best_key || bestKeys[g.id] || null,
  }));
}

// ゲームが localStorage に保存しているベストスコア（同じオリジンなので読める）。無ければ null
export function readBest(game) {
  if (!game.bestKey) return null;
  try {
    const v = localStorage.getItem(game.bestKey);
    if (v === null || v === "" || v === "0") return null;
    return v;
  } catch {
    return null;
  }
}
