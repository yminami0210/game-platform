// あそびば（player）M1: 一覧（全演目を同じ大きさの絵札で横に並べる）→ 札を押すと舞台が現れ、
// 扉が開いて札が抜かれ、奥でゲームが始まる → 戻る。
// 演目は catalog.js、ゲームの出し入れと履歴は launcher.js に任せ、ここは見た目と動きだけを持つ。

import { loadCatalog, readBest, gameUrl, ARCADE_ROOT } from "./catalog.js";
import { createLauncher } from "./launcher.js";

const $ = (id) => document.getElementById(id);
const body = document.body;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const pcQuery = matchMedia("(min-width: 900px)");

const OPEN_MS = 620; // 扉 0.35秒＋抜き 0.25秒（0.3秒遅れ）
const CLOSE_MS = 620; // 札が戻り（0.25秒）、扉が畳みかけまで閉じる（0.2秒遅れで 0.35秒）

let games = [];
let stageGame = null;
let extra = {}; // data/fuda.json: 札ごとの上書き（thumb・thumb_pos・unit・aspect・script）
let busy = false;
let openTimer = 0;
let closeTimer = 0;
const lastBest = new Map();
const cardOf = new Map(); // id → li

const launcher = createLauncher({ stage: $("behind"), gameUrl, onOpen, onClose });

// ── 表示の部品 ──

const ex = (g) => extra[g.id] || {};
const fmtScore = (v) => (/^\d+(\.\d+)?$/.test(v) ? Number(v).toLocaleString("ja-JP") : v);
const unitOf = (g) => g.score_unit || ex(g).unit || "点";
const thumbPos = (g) => g.thumb_pos || ex(g).thumb_pos || "";
// 札の絵: fuda.json の thumb（プレイ中を撮り直した 4:3 の絵）があればそれ、無ければ qa/play.png を thumb_pos で切り取る
const thumbUrl = (g) => ex(g).thumb || `${ARCADE_ROOT}games/${encodeURIComponent(g.id)}/qa/play.png`;

function sentences(text) {
  return (text || "").split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
}
// 台本の地の文: data/fuda.json の script（演じ手の語りに整えた文）を全文。
// 無いときだけ pitch に、controls の最初の「（」か「。」の前までを1文として足す
function scriptText(g) {
  if (ex(g).script) return ex(g).script;
  const out = sentences(g.pitch);
  const ctl = (g.controls || "").split(/[（(。]/)[0].trim();
  if (ctl) out.push(ctl + "。");
  if (out.length < 2 && g.how_to_play) out.push(sentences(g.how_to_play)[0]);
  return out.join("");
}

function setImg(img, g) {
  img.hidden = false;
  img.onerror = () => { img.hidden = true; }; // 絵が無ければ群青の地のまま
  img.src = thumbUrl(g);
  img.style.objectPosition = thumbPos(g);
}

// 判子: 未プレイは「はじめて」、遊んだ後は点数
function fillStamp(el, g) {
  const best = readBest(g);
  el.replaceChildren();
  if (best === null) {
    el.textContent = "はじめて";
  } else {
    const b = document.createElement("b");
    b.textContent = fmtScore(best);
    el.append(b, unitOf(g));
  }
  el.setAttribute("aria-label", best === null ? "まだ遊んでいません" : `ベスト ${fmtScore(best)}${unitOf(g)}`);
}

// 札ごとに違う傾きと欠け、判子の傾きと位置（id から決めるので毎回同じ形）
function shapeOf(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  const cut = () => (rnd() < 0.3 ? 0 : 4 + Math.round(rnd() * 4));
  const [a, b, c, d] = [cut(), cut(), cut(), cut()];
  return {
    jitter: rnd(), // 同じ段の中での傾きの揺れ（0〜1）。向きと紐の長さは段ごとに layout() で決める
    "--st-rot": `${(rnd() * 12 - 6).toFixed(1)}deg`,
    "--st-x": `${Math.round(rnd() * 8)}px`,
    "--st-y": `${Math.round(rnd() * 4 - 2)}px`,
    "--cut": `polygon(0 ${a}px,${a + 2}px 0,calc(100% - ${b}px) ${b ? 1 : 0}px,100% ${b + 2}px,100% calc(100% - ${c}px),calc(100% - ${c + 1}px) 100%,${d}px 100%,0 calc(100% - ${d + 2}px))`,
  };
}

// ── 一覧: 全演目を同じ大きさの絵札で、新しい順に。段ごとの横木に紐で吊った掛け札 ──

const ITO = `<svg class="ito" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M50 0L24 100M50 0L76 100"/></svg><i class="kugi"></i>`;
const DROPS = [22, 34, 27, 31]; // 段ごとの紐の長さ（px）
const jitterOf = new Map(); // li → 0〜1

function renderCards() {
  cardOf.clear();
  jitterOf.clear();
  const items = games.map((g) => {
    const li = document.createElement("li");
    li.className = "fuda";
    li.dataset.id = g.id;
    const { jitter, ...shape } = shapeOf(g.id);
    for (const [k, v] of Object.entries(shape)) li.style.setProperty(k, v);
    jitterOf.set(li, jitter);
    li.innerHTML =
      `<div class="hang"><i class="layer b"></i><i class="layer a"></i>` +
      `<article class="face"><a class="pic" tabindex="-1"><img alt=""><span class="new" hidden>新作</span><h2 class="tag"></h2></a>` +
      `<div class="script ruled"><p></p><div class="act"><span class="stamp"></span><button class="play" type="button">遊ぶ</button></div></div></article>${ITO}</div>`;
    const pic = li.querySelector(".pic");
    pic.href = `#play-${encodeURIComponent(g.id)}`;
    setImg(li.querySelector("img"), g);
    li.querySelector(".new").hidden = !g.isNew;
    li.querySelector(".tag").textContent = g.title;
    li.querySelector(".script p").textContent = scriptText(g);
    fillStamp(li.querySelector(".stamp"), g);
    const play = li.querySelector(".play");
    play.setAttribute("aria-label", `${g.title}を遊ぶ`);
    play.addEventListener("click", () => start(g, li));
    pic.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 別タブで開くのはそのまま
      e.preventDefault();
      start(g, li);
    });
    cardOf.set(g.id, li);
    return li;
  });
  $("cards").replaceChildren(...items);
  layout();
}

// 「明朝の演目」の空き札: 最後の段に空きが出るときだけ1枚吊る
function akiCard() {
  const li = document.createElement("li");
  li.className = "aki";
  li.setAttribute("aria-label", "明朝の演目（あすの朝にかかります）");
  for (const [k, v] of Object.entries(shapeOf("aki"))) if (k !== "jitter") li.style.setProperty(k, v);
  jitterOf.set(li, 0.4);
  li.innerHTML =
    `<div class="hang"><i class="layer b"></i><i class="layer a"></i>` +
    `<div class="face"><div class="pic muji"><span class="tag">明朝の演目</span></div>` +
    `<div class="script ruled"><p>あすの朝、ここに新しい札がかかります。</p></div></div>${ITO}</div>`;
  return li;
}

// 札の数で列を選ぶ: 割り切れる列数 → 1枚足りない列数（明朝の札で埋まる）→ 入るだけの列数
function pickCols(n, max, min) {
  if (max <= min) return Math.max(1, max);
  for (let c = max; c >= min; c--) if (n % c === 0) return c;
  for (let c = max; c >= min; c--) if (n % c === c - 1) return c;
  return max;
}

function layout() {
  const list = $("cards");
  if (!games.length) return;
  const wide = innerWidth >= 600;
  const gap = wide ? 28 : 10;
  const maxCols = wide ? Math.max(2, Math.floor((list.clientWidth + gap) / (200 + gap))) : 2;
  const cols = Math.min(pickCols(games.length, Math.min(maxCols, games.length), wide ? 3 : 2), Math.max(maxCols, 1));
  list.style.setProperty("--cols", cols);
  list.querySelector(".aki")?.remove();
  if (games.length % cols) list.append(akiCard());
  // 段ごとに紐の長さと傾きの向きを変える（同じ段は向きをそろえ、大きさだけ揺らす）
  [...list.children].forEach((li, i) => {
    const row = Math.floor(i / cols);
    const sign = row % 2 ? 1 : -1;
    const deg = sign * (2 + jitterOf.get(li));
    li.style.setProperty("--drop", `${DROPS[row % DROPS.length]}px`);
    li.style.setProperty("--tilt", `${deg.toFixed(2)}deg`);
  });
  placeRails();
}

// 横木: 段ごとに1本、端から端まで通す（文字が読み込まれて段の高さが変わったら置き直す）
function placeRails() {
  const list = $("cards");
  const cols = Number(list.style.getPropertyValue("--cols")) || 2;
  const board = list.parentElement;
  board.querySelectorAll(".rail").forEach((r) => r.remove());
  for (let i = 0; i < list.children.length; i += cols) {
    const rail = document.createElement("i");
    rail.className = "rail";
    rail.style.top = `${list.offsetTop + list.children[i].offsetTop}px`;
    board.append(rail);
  }
}
new ResizeObserver(() => placeRails()).observe($("cards"));
let layoutTimer = 0;
window.addEventListener("resize", () => { clearTimeout(layoutTimer); layoutTimer = setTimeout(layout, 60); });

// ── 舞台 ──

function setStage(g) {
  stageGame = g;
  setImg($("stage-img"), g);
  setImg($("pulled-img"), g);
  $("stage-new").hidden = !g.isNew;
  $("stage-title").textContent = g.title;
  $("pulled-title").textContent = g.title;
}

// PC: ゲームの縦横比が決まっているもの（fuda.json の aspect）は、窓と舞台をその比に絞る
// スマホ: 窓の高さをゲームの比に合わせ、余った高さは舞台の上下の板塀に回す（窓の中に無地を残さない）
function fitStage() {
  const st = $("stage");
  st.style.removeProperty("--stage-w");
  st.style.removeProperty("--stage-pad");
  const aspect = stageGame && Number(ex(stageGame).aspect);
  if (!body.classList.contains("staging") || !aspect) return;
  if (pcQuery.matches) {
    const winH = window.innerHeight - 44 - 64 - 30; // 上下の余白・梁・箱の枠
    const w = Math.round(Math.min(820, Math.max(440, winH * aspect + 60)));
    st.style.setProperty("--stage-w", `${w}px`);
    return;
  }
  const win = $("window");
  const spare = win.clientHeight - win.clientWidth / aspect;
  if (spare > 2) st.style.setProperty("--stage-pad", `${Math.floor(spare / 2)}px`);
}
window.addEventListener("resize", fitStage);

// 押した札の絵が、舞台の窓へ入る
function flyIn(g, li) {
  if (!li || reduced.matches) return Promise.resolve();
  // 一覧の札の絵（絵・題字の札・貼り紙）をそのまま写して、窓の中の同じ 4:3 の札の位置へ
  const src = li.querySelector(".pic");
  const from = src.getBoundingClientRect();
  const to = $("stage-card").querySelector(".pic").getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "flying";
  Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  const copy = src.cloneNode(true);
  copy.removeAttribute("href");
  fly.append(copy);
  body.append(fly);
  void fly.offsetWidth;
  fly.style.transform = `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width})`;
  return new Promise((done) => {
    const finish = () => { if (fly.isConnected) { fly.remove(); done(); } };
    fly.addEventListener("transitionend", finish, { once: true });
    setTimeout(finish, 480);
  });
}

// ── 開く ──

async function start(g, li) {
  if (busy || launcher.current) return;
  busy = true;
  clearTimeout(closeTimer);
  setStage(g);
  body.classList.remove("opening", "playing");
  body.classList.add("staging", "landing");
  fitStage();
  await flyIn(g, li);
  body.classList.remove("landing");
  launcher.open(g, { from: "list" });
}

function onOpen(g, from) {
  if (g !== stageGame) setStage(g);
  body.classList.remove("landing");
  body.classList.add("staging");
  fitStage();
  document.title = `${g.title}｜あそびば`;
  $("live").textContent = `${g.title}を始めました。Esc か「演目にもどる」で一覧へ戻ります。`;
  if (from === "link" || reduced.matches) { enterPlay(); return; }
  void body.offsetWidth;
  body.classList.add("opening");
  openTimer = setTimeout(enterPlay, OPEN_MS);
}

function enterPlay() {
  clearTimeout(openTimer);
  body.classList.add("snap");
  body.classList.remove("opening");
  body.classList.add("playing");
  void body.offsetWidth;
  requestAnimationFrame(() => body.classList.remove("snap"));
  busy = false;
}

// ── 戻る: 札が窓へ戻り、扉が畳みかけまで閉じてから一覧へ ──

function onClose(g) {
  clearTimeout(openTimer);
  busy = true;
  document.title = "あそびば";
  const done = () => {
    body.classList.remove("staging", "opening", "playing", "landing");
    fitStage();
    busy = false;
    refreshScores(g);
    const li = cardOf.get(g.id);
    if (li) {
      li.querySelector(".play").focus({ preventScroll: true });
      const r = li.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) li.scrollIntoView({ block: "center" });
    }
    $("live").textContent = "演目の一覧に戻りました。";
  };
  body.classList.add("snap");
  body.classList.remove("playing");
  if (reduced.matches) { body.classList.remove("snap"); done(); return; }
  body.classList.add("opening");
  void body.offsetWidth;
  body.classList.remove("snap");
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove("opening")));
  closeTimer = setTimeout(done, CLOSE_MS);
}

// 一覧に戻ったらベストスコアを読み直す。更新されていれば、その札の判子を一度弾ませる
function refreshScores(played) {
  const before = lastBest.get(played.id);
  for (const g of games) {
    lastBest.set(g.id, readBest(g));
    const li = cardOf.get(g.id);
    if (li) fillStamp(li.querySelector(".stamp"), g);
  }
  const now = lastBest.get(played.id);
  const li = cardOf.get(played.id);
  if (li && now !== null && now !== before && !reduced.matches) {
    const stamp = li.querySelector(".stamp");
    stamp.classList.remove("bump");
    void stamp.offsetWidth;
    stamp.classList.add("bump");
    stamp.addEventListener("animationend", () => stamp.classList.remove("bump"), { once: true });
  }
}

$("back").addEventListener("click", () => launcher.close());
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && launcher.current) {
    e.preventDefault();
    launcher.close();
  }
});

// ── 読めないとき ──

function showMessage(html) {
  $("notice").hidden = false;
  $("notice-text").innerHTML = html;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ── はじめ ──

async function init() {
  try {
    games = await loadCatalog();
  } catch (e) {
    showMessage(
      `演目の一覧（arcade/catalog.json）を読めませんでした（${esc(e.message)}）。リポジトリのいちばん上のフォルダで <code>npx serve .</code> か <code>python3 -m http.server</code> を動かし、<code>http://localhost:&lt;番号&gt;/player/</code> を開いてください。`,
    );
    return;
  }
  if (!games.length) {
    showMessage("まだ遊べる演目がありません。毎朝ひとつずつ増えていきます。");
    return;
  }
  extra = await fetch("data/fuda.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  for (const g of games) lastBest.set(g.id, readBest(g));
  $("notice").hidden = true;
  renderCards();

  // #play-<id> で直接開かれたら、そのゲームを始める
  if (launcher.resume((id) => games.find((g) => g.id === id))) {
    // 直接開いたときも「戻る」で一覧に来られるよう、一覧の履歴を下に1つ敷く
    const id = stageGame.id;
    history.replaceState(null, "", location.pathname + location.search);
    history.pushState({ play: id, from: "link" }, "", `#play-${encodeURIComponent(id)}`);
  } else if (location.hash.startsWith("#play-")) {
    history.replaceState(null, "", location.pathname + location.search); // 無い演目は一覧へ
  }
}

init();
