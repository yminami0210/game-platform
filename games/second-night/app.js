(() => {
  "use strict";

  const STORY = window.STORY;
  const KEY = "second-night:v2";
  const THEME_KEY = "second-night:theme";
  const Q = STORY.quiz.length;

  /* ---------- 保存（使えない環境でも遊べる） ---------- */
  const fresh = () => ({ clearedFirst: false, phase: null, scene: 0, shown: 0, q: 0, answers: [], best: null });
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!s || typeof s !== "object") return fresh();
      const v = Object.assign(fresh(), s);
      // 壊れた／古い保存データでも起動できるように範囲外は捨てる
      const okInt = (n, max) => Number.isInteger(n) && n >= 0 && n < max;
      if (!okInt(v.scene, STORY.scenes.length) || !okInt(v.q, Q) || !Array.isArray(v.answers) ||
          !Number.isInteger(v.shown) || v.shown < 0) {
        return Object.assign(fresh(), { clearedFirst: !!v.clearedFirst });
      }
      return v;
    } catch (_) { return fresh(); }
  }
  let st = load();
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) { /* noop */ } }

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const el = {
    paras: $("paras"), sceneTitle: $("scene-title"), next: $("btn-next"), tapHint: $("tap-hint"),
    barRun: $("bar-run"), barProgress: $("bar-progress"), page: $("page"),
    qLines: $("quiz-lines"), qNext: $("quiz-next"), qProgress: $("quiz-progress"), qFound: $("quiz-found")
  };

  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === id));
    window.scrollTo(0, 0);
  }

  /* ---------- タイトル ---------- */
  function renderTitle() {
    const inProgress = st.phase === "read" || st.phase === "quiz" || st.phase === "epilogue";
    app.dataset.run = st.clearedFirst ? "2" : "1";
    const start = $("btn-start"), sub = $("btn-sub");
    if (inProgress) {
      start.textContent = "つづきから";
      sub.textContent = "最初から読む";
      sub.hidden = false;
    } else if (st.clearedFirst) {
      start.textContent = "答え合わせをする";
      sub.textContent = "最初から読む";
      sub.hidden = false;
    } else {
      start.textContent = "はじめる";
      sub.hidden = true;
    }
    if (st.clearedFirst) {
      $("title-sub").textContent = "同じ夜を、もう一度";
      $("title-lead").innerHTML = "あの文章の中に、<br>二度目には意味が変わる一文が、いくつもある。";
    }
    show("screen-title");
  }

  function resume() {
    if (st.phase === "read") return openRead(st.scene, st.shown);
    if (st.phase === "epilogue") return openEpilogue(st.shown);
    if (st.phase === "quiz" || st.clearedFirst) return openQuiz(st.phase === "quiz" ? st.q : 0, st.phase === "quiz");
    return openRead(0, 0);
  }

  /* ---------- 一度目：本文 ---------- */
  // 本文画面は「一度目の場面」と「終章」の両方で使う
  let cur = null;   // { title, paras, label, progress, onEnd }

  function buildPara(p) {
    const para = typeof p === "string" ? { kind: "p", text: p } : p;
    const node = document.createElement(para.kind === "diary" ? "div" : "p");
    if (para.kind !== "p") node.classList.add(para.kind);
    node.textContent = para.text;
    return node;
  }

  function mountText(view, shown) {
    cur = view;
    el.sceneTitle.textContent = view.title;
    el.barRun.textContent = view.label;
    el.barProgress.textContent = view.progress;
    el.paras.textContent = "";
    view.paras.forEach((p, i) => {
      const n = buildPara(p);
      if (i >= shown) n.classList.add("is-hidden");
      el.paras.appendChild(n);
    });
    cur.shown = Math.max(1, shown);
    [...el.paras.children].slice(0, cur.shown).forEach((n) => n.classList.remove("is-hidden"));
    updateFoot();
    show("screen-read");
    if (cur.shown > 1) requestAnimationFrame(() => scrollToNode(el.paras.children[cur.shown - 1], "auto"));
  }

  function openRead(scene, shown) {
    const sc = STORY.scenes[scene];
    st.phase = "read"; st.scene = scene; st.shown = Math.max(1, shown); persist();
    mountText({
      title: sc.title, paras: sc.paras, label: "一度目の夜", progress: `${scene + 1} / ${STORY.scenes.length}`,
      onAdvance: (n) => { st.shown = n; persist(); },
      onEnd: () => {
        if (scene + 1 < STORY.scenes.length) return openRead(scene + 1, 1);
        st.clearedFirst = true; st.phase = "end1"; persist();
        app.dataset.run = "2";
        show("screen-end1");
      }
    }, st.shown);
  }

  function openEpilogue(shown) {
    st.phase = "epilogue"; st.shown = Math.max(1, shown); persist();
    mountText({
      title: STORY.epilogue.title, paras: STORY.epilogue.paras, label: "二度目の夜", progress: "",
      onAdvance: (n) => { st.shown = n; persist(); },
      onEnd: showResult
    }, st.shown);
  }

  function updateFoot() {
    const done = cur.shown >= cur.paras.length;
    el.tapHint.hidden = done;
    el.next.hidden = !done;
    el.next.textContent = "次へ";
  }

  function scrollToNode(n, behavior) {
    const r = n.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 120) window.scrollBy({ top: r.bottom - window.innerHeight + 160, behavior: behavior || "smooth" });
  }

  function advance() {
    if (!cur || cur.shown >= cur.paras.length) return;
    const n = el.paras.children[cur.shown++];
    n.classList.remove("is-hidden");
    n.classList.add("is-new");
    cur.onAdvance(cur.shown);
    updateFoot();
    requestAnimationFrame(() => scrollToNode(n));
  }

  /* ---------- 二度目：答え合わせ ---------- */
  function foundCount() { return st.answers.filter(Boolean).length; }

  function openQuiz(q, keep) {
    if (!keep) st.answers = [];
    st.phase = "quiz"; st.q = q; persist();
    renderQuestion();
    show("screen-quiz");
  }

  function renderQuestion() {
    const item = STORY.quiz[st.q];
    const answered = st.answers[st.q] !== undefined && st.answers[st.q] !== null;
    el.qProgress.textContent = `${st.q + 1} / ${Q}`;
    el.qFound.textContent = `気づいた ${foundCount()}`;
    el.qLines.textContent = "";
    item.lines.forEach((text, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "qline";
      b.dataset.i = String(i);
      b.textContent = text;
      el.qLines.appendChild(b);
    });
    el.qNext.hidden = true;
    if (answered) reveal(null);
  }

  function choose(i) {
    if (st.answers[st.q] !== undefined && st.answers[st.q] !== null) return;
    const item = STORY.quiz[st.q];
    st.answers[st.q] = i === item.answer;
    persist();
    reveal(i);
  }

  function reveal(chosen) {
    const item = STORY.quiz[st.q];
    [...el.qLines.children].forEach((b, i) => {
      b.disabled = true;
      if (i === item.answer) b.classList.add("is-answer");
      else b.classList.add("is-dim");
      if (chosen !== null && i === chosen && i !== item.answer) b.classList.add("is-missed");
    });
    const note = document.createElement("p");
    note.className = "qnote";
    const who = document.createElement("span");
    who.className = "qnote-who";
    who.textContent = "咲";
    note.append(who, document.createTextNode(item.note));
    el.qLines.children[item.answer].after(note);
    el.qFound.textContent = `気づいた ${foundCount()}`;
    el.qNext.hidden = false;
    el.qNext.textContent = st.q + 1 < Q ? "次へ" : "最後に";
    el.qNext.focus({ preventScroll: true });
    requestAnimationFrame(() => scrollToNode(el.qNext));
  }

  function nextQuestion() {
    if (st.q + 1 < Q) { st.q++; persist(); renderQuestion(); window.scrollTo(0, 0); return; }
    openEpilogue(1);
  }

  /* ---------- 結果と共有 ---------- */
  function shareText() {
    const n = foundCount();
    // 低い点は自虐で誘い、高い点は素直に。どちらも中身には触れない
    const head = n === Q
      ? `『${STORY.title}』、二度目の答え合わせで ${Q}つ全部気づけた。`
      : n <= 2
        ? `『${STORY.title}』、二度目の答え合わせで ${Q}つ中 ${n}つしか気づけなかった。`
        : `『${STORY.title}』、二度目の答え合わせで ${Q}つのうち ${n}つ気づけた。`;
    return `${head}同じ文章が、二度目に違う意味になる。七分。一度目は何も調べずにどうぞ。 #${STORY.title}`;
  }
  function shareUrl() { return location.href.split("#")[0].split("?")[0]; }
  function xIntent() {
    return "https://x.com/intent/post?text=" + encodeURIComponent(shareText()) + "&url=" + encodeURIComponent(shareUrl());
  }

  function showResult() {
    const n = foundCount();
    st.phase = "end2";
    st.best = Math.max(st.best || 0, n);
    persist();
    $("end2-n").textContent = String(n);
    $("end2-of").textContent = String(Q);
    $("end2-found").textContent = "答え合わせに出なかった伏線も、本文にはまだ残っています。";
    $("share-preview").textContent = shareText();
    show("screen-end2");
  }

  async function share() {
    const toast = $("share-toast");
    if (navigator.share) {
      try { await navigator.share({ title: STORY.title, text: shareText(), url: shareUrl() }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    window.open(xIntent(), "_blank", "noopener");
    if (toast) toast.textContent = "X の投稿画面を開きました。";
  }

  /* ---------- テーマ ---------- */
  function applyTheme(t) {
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  function currentTheme() {
    return document.documentElement.dataset.theme ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (_) { /* noop */ }

  /* ---------- イベント ---------- */
  $("btn-start").addEventListener("click", resume);
  $("btn-sub").addEventListener("click", () => { st.phase = null; st.answers = []; openRead(0, 1); });
  $("btn-second").addEventListener("click", () => openQuiz(0, false));
  $("btn-home").addEventListener("click", () => { st.phase = null; persist(); renderTitle(); });
  el.next.addEventListener("click", (e) => { e.stopPropagation(); cur.onEnd(); });
  el.qNext.addEventListener("click", nextQuestion);
  el.qLines.addEventListener("click", (e) => {
    const b = e.target.closest(".qline");
    if (b) choose(Number(b.dataset.i));
  });
  document.querySelectorAll(".js-share").forEach((b) => b.addEventListener("click", share));
  el.page.addEventListener("click", advance);

  document.addEventListener("keydown", (e) => {
    if (!$("screen-read").classList.contains("is-active")) return;
    if (e.target.closest && e.target.closest("button, a")) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (cur.shown < cur.paras.length) advance(); else cur.onEnd();
    }
  });

  $("theme-toggle").addEventListener("click", () => {
    const t = currentTheme() === "dark" ? "light" : "dark";
    applyTheme(t);
    try { localStorage.setItem(THEME_KEY, t); } catch (_) { /* noop */ }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  renderTitle();
})();
