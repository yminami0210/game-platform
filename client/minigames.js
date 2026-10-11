// 店を「利用する」とミニゲームが始まる。どの店でどのゲームが遊べるかの表。
// ゲーム本体は別に作る（ミニゲーム工場）。できたら url を入れるだけで、町のその店から遊べるようになる。
// 約束ごと（docs/nanashi/minigames.md）:
//   - ゲームは iframe で開く。URL に ?shop=<店のid>&name=<店名>&player=<遊ぶ人の名前> を付ける
//   - 終わったら window.parent.postMessage({ type: 'nanashi:minigame', result: { score, text } }, '*') を送る
//   - 町はその結果を「〇〇さんが喫茶ひまわりで…」と町のログに残す（LLM 不使用）
export const MINIGAMES = {
  kissa: { title: 'ナポリタンを運べ', verb: 'コーヒーを一杯', url: null },
  shokudo: { title: '大盛りチャレンジ', verb: '定食を食べる', url: null },
  sento: { title: 'のぼせるまで我慢', verb: 'ひとっ風呂', url: null },
  super: { title: 'タイムセール争奪戦', verb: '買い物をする', url: null },
  conbini: { title: 'レジ打ち早押し', verb: '買い物をする', url: null },
  shop: { title: 'おつかいメモ', verb: '買い物をする', url: null },
  mall: { title: 'くじ引き大会', verb: '買い物をする', url: null },
  clinic: { title: 'あっち向いて診察', verb: '診てもらう', url: null },
  post: { title: '年賀状の仕分け', verb: '手紙を出す', url: null },
  koban: { title: '落とし物さがし', verb: '道をたずねる', url: null },
  park: { title: 'ラジオ体操', verb: 'ひと休み', url: null },
  station: { title: '駅名しりとり', verb: '切符を買う', url: null },
};

export const gameFor = (kind) => MINIGAMES[kind] || null;

// ミニゲームの画面を開く。終わったら onResult({ score, text }) を呼ぶ
export function openMinigame(box, { place, player }, onResult) {
  const game = gameFor(place.kind);
  if (!game) return;
  box.hidden = false;
  const head = `<div class="mgHead"><b>${esc(place.name)}</b>｜${esc(game.title)}<button type="button" data-close>閉じる</button></div>`;
  if (!game.url) {
    box.innerHTML = `${head}<div class="mgSoon"><p class="big">${esc(game.title)}</p><p>このお店のミニゲームは準備中です。</p><p class="muted">できあがると、ここで遊べるようになります。いまは「${esc(game.verb)}」だけ記録します。</p><button type="button" class="primary" data-plain>${esc(game.verb)}</button></div>`;
    box.querySelector('[data-plain]').onclick = () => { close(); onResult({ score: null, text: game.verb }); };
  } else {
    const u = new URL(game.url, location.href);
    u.searchParams.set('shop', place.id); u.searchParams.set('name', place.name); u.searchParams.set('player', player || '');
    box.innerHTML = `${head}<iframe title="${esc(game.title)}" src="${esc(u.href)}" allow="autoplay"></iframe>`;
  }
  function onMsg(e) {
    const r = e.data;
    if (!r || r.type !== 'nanashi:minigame' || e.source !== box.querySelector('iframe')?.contentWindow) return;
    close();
    const score = Number.isFinite(Number(r.result?.score)) ? Number(r.result.score) : null;
    onResult({ score, text: String(r.result?.text || game.title).slice(0, 60) });
  }
  function close() { removeEventListener('message', onMsg); box.hidden = true; box.innerHTML = ''; }
  addEventListener('message', onMsg);
  box.querySelector('[data-close]').onclick = close;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
