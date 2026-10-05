// あそびば（player）M1: 一覧（舞台＋札の束）→ 押すと同じ舞台の扉が開いてゲームが始まる → 戻る。
// 演目は catalog.js、ゲームの出し入れと履歴は launcher.js に任せ、ここは見た目と動きだけを持つ。

import { loadCatalog, readBest, gameUrl } from "./catalog.js";
import { createLauncher } from "./launcher.js";

const $ = (id) => document.getElementById(id);
const body = document.body;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");

const OPEN_MS = 620; // 扉 0.35秒＋抜き 0.25秒（0.3秒遅れ）
const thumbUrl = (g) => `../arcade/games/${encodeURIComponent(g.id)}/qa/play.png`;

let games = [];
let stageGame = null;
let extra = {}; // data/fuda.json: 札ごとの表示の上書き（thumb_pos・unit）
let busy = false;
let openTimer = 0;
let savedScroll = 0;
const lastBest = new Map();

const launcher = createLauncher({ stage: $("behind"), gameUrl, onOpen, onClose });

// ── 表示の部品 ──

function fmtScore(v) {
  return /^\d+(\.\d+)?$/.test(v) ? Number(v).toLocaleString("ja-JP") : v;
}
const unitOf = (g) => g.score_unit || (extra[g.id] && extra[g.id].unit) || "点";
const thumbPos = (g) => g.thumb_pos || (extra[g.id] && extra[g.id].thumb_pos) || "";

function sentences(text) {
  return (text || "").split(/(?<=。)/).map((s) => s.trim()).filter(Boolean);
}
// 台本の地の文: data/fuda.json の script（手で整えた演じ手の語り）があればそれを使う。
// 無いときだけ pitch を基本に、操作は controls の最初の「（」か「。」の前までを文として足す。
// 2文に満たないときは how_to_play の最初の1文で補う。
function scriptText(g) {
  const own = extra[g.id] && extra[g.id].script;
  if (own) return own;
  const out = sentences(g.pitch);
  const ctl = (g.controls || "").split(/[（(。]/)[0].trim();
  if (ctl) out.push(ctl + "。");
  if (out.length < 3 && g.how_to_play) out.push(sentences(g.how_to_play)[0]);
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
  return best;
}

function bestLabel(g) {
  const best = readBest(g);
  return best === null ? "まだ遊んでいません" : `ベスト ${fmtScore(best)}${unitOf(g)}`;
}

// 札ごとに違う傾きと欠け（id から決めるので毎回同じ形）
function shapeOf(id) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 1000) / 1000;
  const cut = () => (rnd() < 0.3 ? 0 : 4 + Math.round(rnd() * 4));
  const [a, b, c, d] = [cut(), cut(), cut(), cut()];
  // 傾きは ±0.8〜1.5° （目で分かる強さ）、判子は −6〜+6° で位置もずらす
  const tilt = ((rnd() < 0.5 ? -1 : 1) * (0.8 + rnd() * 0.7)).toFixed(2);
  return {
    "--st-rot": `${(rnd() * 12 - 6).toFixed(1)}deg`,
    "--st-x": `${Math.round(rnd() * 10)}px`,
    "--st-y": `${Math.round(rnd() * 5)}px`,
    "--tilt": `${tilt}deg`,
    "--dy": `${Math.round(rnd() * 6)}px`,
    "--dx": `${Math.round(rnd() * 4 - 2)}px`,
    "--cut": `polygon(0 ${a}px,${a + 2}px 0,calc(100% - ${b}px) ${b ? 1 : 0}px,100% ${b + 2}px,100% calc(100% - ${c}px),calc(100% - ${c + 1}px) 100%,${d}px 100%,0 calc(100% - ${d + 2}px))`,
  };
}

// ── 舞台と束 ──

function setStage(g) {
  stageGame = g;
  setImg($("stage-img"), g);
  setImg($("pulled-img"), g);
  $("stage-new").hidden = !g.isNew;
  $("stage-title").textContent = g.title;
  $("pulled-title").textContent = g.title;
  $("script-text").textContent = scriptText(g);
  const stamp = $("stage-stamp");
  stamp.hidden = false;
  stamp.style.setProperty("--st-rot", shapeOf(g.id)["--st-rot"]);
  fillStamp(stamp, g);
  stamp.setAttribute("aria-label", bestLabel(g));
  const play = $("play");
  play.hidden = false;
  play.setAttribute("aria-label", `${g.title}を遊ぶ`);
  renderStack();
}

function renderStack() {
  const list = games.filter((g) => g !== stageGame);
  $("stack").hidden = list.length === 0;
  $("stack-count").textContent = `${list.length}本`;
  const ol = $("stack-list");
  ol.replaceChildren(
    ...list.map((g) => {
      const li = document.createElement("li");
      li.className = "fuda";
      li.dataset.id = g.id;
      for (const [k, v] of Object.entries(shapeOf(g.id))) li.style.setProperty(k, v);
      li.innerHTML = `<i class="layer b"></i><i class="layer a"></i><a class="face"><span class="pic"><img alt=""><span class="tag"></span></span></a>`;
      const a = li.querySelector(".face");
      a.href = `#play/${encodeURIComponent(g.id)}`;
      a.setAttribute("aria-label", `${g.title}（${bestLabel(g)}）を遊ぶ`);
      setImg(li.querySelector("img"), g);
      li.querySelector(".tag").textContent = g.title;
      const best = readBest(g);
      const mark = document.createElement("span");
      if (best === null) {
        mark.className = "stamp";
        mark.textContent = "はじめて";
      } else {
        mark.className = "score";
        const small = document.createElement("small");
        small.textContent = unitOf(g);
        mark.append(fmtScore(best), small);
      }
      a.append(mark);
      a.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // 別タブで開くのはそのまま
        e.preventDefault();
        start(g, li);
      });
      return li;
    }),
  );
}

// ── 開く ──

// 束の札が、まず舞台の窓へ入る
function flyIn(g, li) {
  const pic = li.querySelector(".pic");
  const from = pic.getBoundingClientRect();
  const scrolled = window.scrollY;
  window.scrollTo(0, 0);
  if (reduced.matches) { setStage(g); return Promise.resolve(); }
  const to = $("window").getBoundingClientRect();
  const fly = document.createElement("div");
  fly.className = "flying";
  Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top + scrolled - window.scrollY}px`, width: `${from.width}px`, height: `${from.height}px` });
  const img = document.createElement("img");
  img.alt = "";
  img.src = thumbUrl(g);
  img.style.objectPosition = thumbPos(g);
  fly.append(img);
  body.append(fly);
  void fly.offsetWidth;
  const fromTop = parseFloat(fly.style.top);
  fly.style.transform = `translate(${to.left - from.left}px,${to.top - fromTop}px) scale(${to.width / from.width},${to.height / from.height})`;
  return new Promise((done) => {
    const finish = () => { setStage(g); fly.remove(); done(); };
    fly.addEventListener("transitionend", finish, { once: true });
    setTimeout(() => fly.isConnected && finish(), 500);
  });
}

async function start(g, li) {
  if (busy || launcher.current) return;
  busy = true;
  savedScroll = window.scrollY;
  if (g !== stageGame && li) {
    await flyIn(g, li);
    savedScroll = 0;
  }
  launcher.open(g, { from: "list" });
}

function onOpen(g, from) {
  if (g !== stageGame) setStage(g);
  document.title = `${g.title}｜あそびば`;
  $("live").textContent = `${g.title}を始めました。Esc か「演目にもどる」で一覧へ戻ります。`;
  if (from === "link" || reduced.matches) { enterPlay(); return; }
  body.classList.add("opening");
  openTimer = setTimeout(enterPlay, OPEN_MS);
}

// 遊ぶ画面（PC）: ゲームの縦横比が決まっているもの（fuda.json の aspect）は、窓と舞台をその比に絞る
const pcQuery = matchMedia("(min-width: 900px)");
function fitStage() {
  const st = $("stage");
  const aspect = stageGame && extra[stageGame.id] && Number(extra[stageGame.id].aspect);
  if (!body.classList.contains("playing") || !aspect || !pcQuery.matches) { st.style.removeProperty("--stage-w"); return; }
  const winH = window.innerHeight - 44 - 64 - 30; // 上下の余白・梁・箱の枠
  const w = Math.round(Math.min(820, Math.max(440, winH * aspect + 60)));
  st.style.setProperty("--stage-w", `${w}px`);
}
window.addEventListener("resize", fitStage);

function enterPlay() {
  clearTimeout(openTimer);
  body.classList.add("snap");
  body.classList.remove("opening");
  body.classList.add("playing");
  fitStage();
  void body.offsetWidth;
  requestAnimationFrame(() => body.classList.remove("snap"));
  busy = false;
}

// ── 戻る ──

function onClose(g) {
  clearTimeout(openTimer);
  body.classList.add("snap");
  body.classList.remove("playing");
  fitStage();
  if (!reduced.matches) body.classList.add("opening"); // 開いた状態から、札が戻り扉が畳みかけまで閉じる
  document.title = "あそびば";
  window.scrollTo(0, savedScroll);
  void body.offsetWidth;
  body.classList.remove("snap");
  requestAnimationFrame(() => requestAnimationFrame(() => body.classList.remove("opening")));
  refreshScores(g);
  $("live").textContent = "演目の一覧に戻りました。";
  $("play").focus({ preventScroll: true });
  busy = false;
}

// 一覧に戻ったらベストスコアを読み直す。更新されていれば判子の点数を一度弾ませる
function refreshScores(played) {
  const before = lastBest.get(played.id);
  for (const g of games) lastBest.set(g.id, readBest(g));
  setStage(stageGame);
  const now = lastBest.get(played.id);
  if (played === stageGame && now !== null && now !== before && !reduced.matches) {
    const stamp = $("stage-stamp");
    setTimeout(() => {
      stamp.classList.remove("bump");
      void stamp.offsetWidth;
      stamp.classList.add("bump");
      stamp.addEventListener("animationend", () => stamp.classList.remove("bump"), { once: true });
    }, 560);
  }
}

$("back").addEventListener("click", () => launcher.close());
$("play").addEventListener("click", () => stageGame && start(stageGame));
$("stage-card").addEventListener("click", () => stageGame && start(stageGame));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && launcher.current) {
    e.preventDefault();
    launcher.close();
  }
});

// ── 読めないとき ──

function showMessage(title, html) {
  $("stage-title").textContent = title;
  $("stage-img").hidden = true;
  $("script-text").innerHTML = html;
  $("play").hidden = true;
  $("stage-stamp").hidden = true;
  $("stack").hidden = true;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ── はじめ ──

async function init() {
  try {
    games = await loadCatalog();
  } catch (e) {
    showMessage(
      "演目が読めません",
      `演目の一覧（arcade/catalog.json）を読めませんでした（${esc(e.message)}）。リポジトリのいちばん上のフォルダで <code>npx serve .</code> か <code>python3 -m http.server</code> を動かし、<code>http://localhost:&lt;番号&gt;/player/</code> を開いてください。`,
    );
    return;
  }
  if (!games.length) {
    showMessage("準備中", "まだ遊べる演目がありません。毎朝ひとつずつ増えていきます。");
    return;
  }
  extra = await fetch("data/fuda.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  for (const g of games) lastBest.set(g.id, readBest(g));
  setStage(games[0]);

  // #play/<id> で直接開かれたら、そのゲームを始める
  if (launcher.resume((id) => games.find((g) => g.id === id))) {
    // 直接開いたときも「戻る」で一覧に来られるよう、一覧の履歴を下に1つ敷く
    const id = stageGame.id;
    history.replaceState(null, "", location.pathname + location.search);
    history.pushState({ play: id, from: "link" }, "", `#play/${encodeURIComponent(id)}`);
  } else if (location.hash.startsWith("#play/")) {
    history.replaceState(null, "", location.pathname + location.search); // 無い演目は一覧へ
  }
}

init();
