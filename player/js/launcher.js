// ゲームを始める・終える処理。一覧からも、将来の「街」（住人に話しかける）からも同じ関数で呼ぶ。
// 見た目は持たない。与えられた舞台（stage 要素）に iframe を出し入れし、履歴（戻る操作）と連動させる。
//
//   const launcher = createLauncher({ stage, onOpen, onClose });
//   launcher.open(game, { from: "list" | "town" | ... });   // game は catalog の1件
//   launcher.close();
//
// URL は #play-<ゲームid>。直接その URL で開いてもそのゲームが始まる（resume で処理）。

const HASH_PREFIX = "#play-";

export function createLauncher({ stage, gameUrl, onOpen = () => {}, onClose = () => {} }) {
  let current = null; // { game, from, frame }

  function mount(game, from) {
    unmount();
    const frame = document.createElement("iframe");
    frame.src = gameUrl(game);
    frame.title = game.title;
    frame.allow = "autoplay; fullscreen";
    frame.setAttribute("allowfullscreen", "");
    stage.appendChild(frame);
    current = { game, from, frame };
    // キーボード操作のゲームのため、読み込み後に iframe へ焦点を移す
    frame.addEventListener("load", () => frame.contentWindow && frame.contentWindow.focus());
    onOpen(game, from);
  }

  function unmount() {
    if (!current) return null;
    const closed = current;
    closed.frame.remove(); // iframe を外すとゲームの音・処理も止まる
    current = null;
    return closed;
  }

  function open(game, { from = "list" } = {}) {
    history.pushState({ play: game.id, from }, "", HASH_PREFIX + encodeURIComponent(game.id));
    mount(game, from);
  }

  function close() {
    if (!current) return;
    // 自分で積んだ履歴なら戻る操作と同じ扱いにする（ブラウザの戻ると挙動をそろえる）
    if (history.state && history.state.play) history.back();
    else finish();
  }

  function finish() {
    const closed = unmount();
    if (location.hash.startsWith(HASH_PREFIX)) history.replaceState(null, "", location.pathname + location.search);
    if (closed) onClose(closed.game, closed.from);
  }

  window.addEventListener("popstate", (e) => {
    const id = e.state && e.state.play;
    if (!id && current) finish();
  });

  // #play-<id> で直接開かれたときに、そのゲームを始める
  function resume(findGame) {
    if (!location.hash.startsWith(HASH_PREFIX)) return false;
    const game = findGame(decodeURIComponent(location.hash.slice(HASH_PREFIX.length)));
    if (!game) return false;
    history.replaceState({ play: game.id, from: "link" }, "", location.href);
    mount(game, "link");
    return true;
  }

  return { open, close, resume, get current() { return current && current.game; } };
}
