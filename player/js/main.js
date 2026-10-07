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
const thumbUrl = (g) => `${ARCADE_ROOT}games/${encodeURIComponent(g.id)}/qa/play.png`;

let games = [];
let stageGame = null;
let extra = {}; // data/fuda.json: 札ごとの上書き（script・thumb_pos・unit・aspect）
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
  const tilt = ((rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.8)).toFixed(2);
  return {
    "--st-rot": `${(rnd() * 12 - 6).toFixed(1)}deg`,
    "--st-x": `${Math.round(rnd() * 8)}px`,
    "--st-y": `${Math.round(rnd() * 4 - 2)}px`,
    "--tilt": `${tilt}deg`,
    "--dy": `${Math.round(rnd() * 6)}px`,
    "--dx": `${Math.round(rnd() * 4 - 2)}px`,
    "--cut": `polygon(0 ${a}px,${a + 2}px 0,calc(100% - ${b}px) ${b ? 1 : 0}px,100% ${b + 2}px,100% calc(100% - ${c}px),calc(100% - ${c + 1}px) 100%,${d}px 100%,0 calc(100% - ${d + 2}px))`,
  };
}

// ── 一覧: 全演目を同じ大きさの絵札で、新しい順に ──

function renderCards() {
  cardOf.clear();
  $("cards").replaceChildren(
    ...games.map((g) => {
      const li = document.createElement("li");
      li.className = "fuda";
      li.dataset.id = g.id;
      for (const [k, v] of Object.entries(shapeOf(g.id))) li.style.setProperty(k, v);
      li.innerHTML =
        `<i class="layer b"></i><i class="layer a"></i>` +
        `<article class="face"><a class="pic" tabindex="-1"><img alt=""><span class="new" hidden>新作</span><h2 class="tag"></h2></a>` +
        `<div class="script ruled"><p></p><div class="act"><span class="stamp"></span><button class="play" type="button">遊ぶ</button></div></div></article>`;
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
    }),
  );
}

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
function fitStage() {
  const st = $("stage");
  const aspect = stageGame && Number(ex(stageGame).aspect);
  if (!body.classList.contains("staging") || !aspect || !pcQuery.matches) { st.style.removeProperty("--stage-w"); return; }
  const winH = window.innerHeight - 44 - 64 - 30; // 上下の余白・梁・箱の枠
  const w = Math.round(Math.min(820, Math.max(440, winH * aspect + 60)));
  st.style.setProperty("--stage-w", `${w}px`);
}
window.addEventListener("resize", fitStage);

// 押した札の絵が、舞台の窓へ入る
function flyIn(g, li) {
  if (!li || reduced.matches) return Promise.resolve();
  const from = li.querySelector(".pic").getBoundingClientRect();
  const to = $("window").getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "flying";
  Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  const img = document.createElement("img");
  img.alt = "";
  img.src = thumbUrl(g);
  img.style.objectPosition = thumbPos(g);
  fly.append(img);
  body.append(fly);
  void fly.offsetWidth;
  fly.style.transform = `translate(${to.left - from.left}px,${to.top - from.top}px) scale(${to.width / from.width},${to.height / from.height})`;
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
