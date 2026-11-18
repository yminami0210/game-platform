(() => {
  "use strict";

  const STORY = window.STORY;
  const KEY = "second-night:v1";
  const THEME_KEY = "second-night:theme";
  const SHARE_TEXT = "『二度目の夜』を読んだ。一度目で閉じないでほしい。二度目、同じ文章がまるで違って見える。 #二度目の夜";

  /* ---------- 保存（失敗しても動く） ---------- */
  const store = {
    load() {
      try { return Object.assign({ clearedFirst: false, found: [] }, JSON.parse(localStorage.getItem(KEY) || "{}")); }
      catch (_) { return { clearedFirst: false, found: [] }; }
    },
    save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* noop */ } }
  };
  let save = store.load();
  const found = new Set(save.found);

  /* ---------- 本文パース ---------- */
  const HINT_RE = /\[\[([\s\S]+?)\|([\s\S]+?)\]\]/g;
  const hints = {};          // id -> { text, note }
  let hintTotal = 0;

  // 段落ごとにトークン化しておく（伏線IDは場面内の出現順で固定）
  const scenes = STORY.scenes.map((sc) => {
    let n = 0;
    const paras = sc.paras.map((p) => {
      const para = typeof p === "string" ? { kind: "p", text: p } : p;
      const tokens = [];
      let last = 0;
      para.text.replace(HINT_RE, (m, text, note, idx) => {
        if (idx > last) tokens.push({ text: para.text.slice(last, idx) });
        const id = `${sc.id}-${++n}`;
        hints[id] = { text, note };
        hintTotal++;
        tokens.push({ text, id });
        last = idx + m.length;
        return m;
      });
      if (last < para.text.length) tokens.push({ text: para.text.slice(last) });
      return { kind: para.kind || "p", tokens };
    });
    return { id: sc.id, title: sc.title, second: !!sc.second, paras };
  });

  /* ---------- DOM ---------- */
  const $ = (id) => document.getElementById(id);
  const app = $("app");
  const el = {
    paras: $("paras"), sceneTitle: $("scene-title"), next: $("btn-next"), tapHint: $("tap-hint"),
    barRun: $("bar-run"), barProgress: $("bar-progress"), barFound: $("bar-found"), page: $("page"),
    sheet: $("sheet"), backdrop: $("sheet-backdrop"), sheetQuote: $("sheet-quote"), sheetNote: $("sheet-note")
  };

  let run = 1;
  let sceneIndex = 0;
  let shownCount = 0;
  let sceneList = [];

  function show(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("is-active", s.id === screenId));
    window.scrollTo(0, 0);
  }

  function setRun(r) {
    run = r;
    app.dataset.run = String(r);
    sceneList = scenes.filter((s) => r === 2 || !s.second);
  }

  /* ---------- タイトル ---------- */
  function renderTitle() {
    setRun(save.clearedFirst ? 2 : 1);
    $("btn-restart-first").hidden = !save.clearedFirst;
    if (save.clearedFirst) {
      $("title-sub").textContent = "同じ夜を、もう一度";
      $("title-lead").innerHTML = "文章は、一度目とまったく同じです。<br>ただ、ところどころの言葉が光っています。<br>触れると、もうひとつの読みが現れます。";
      $("btn-start").textContent = "二度目の夜をはじめる";
    } else {
      $("title-sub").textContent = "十五分の短編";
      $("title-lead").innerHTML = "海辺の古い宿に、ひとりの客がたどり着く。<br>明日の朝、恋人に結婚を申し込むために。";
      $("btn-start").textContent = "はじめる";
    }
    show("screen-title");
  }

  /* ---------- 場面 ---------- */
  function buildPara(p) {
    const node = document.createElement(p.kind === "letter" || p.kind === "diary" ? "div" : "p");
    if (p.kind !== "p") node.classList.add(p.kind);
    for (const t of p.tokens) {
      if (t.id && run === 2) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "hint" + (found.has(t.id) ? " is-found" : "");
        b.dataset.hint = t.id;
        b.textContent = t.text;
        node.appendChild(b);
      } else {
        node.appendChild(document.createTextNode(t.text));
      }
    }
    return node;
  }

  function startScene(i) {
    sceneIndex = i;
    const sc = sceneList[i];
    el.sceneTitle.textContent = sc.title;
    el.paras.textContent = "";
    sc.paras.forEach((p) => {
      const node = buildPara(p);
      if (run === 1) node.classList.add("is-hidden");
      el.paras.appendChild(node);
    });
    el.barRun.textContent = run === 1 ? "一度目の夜" : "二度目の夜";
    el.barProgress.textContent = `${i + 1} / ${sceneList.length}`;
    updateFound();
    if (run === 1) {
      shownCount = 0;
      advance();
    } else {
      shownCount = sc.paras.length;
      [...el.paras.children].forEach((n) => n.classList.add("is-new"));
      finishScene();
    }
    window.scrollTo(0, 0);
  }

  function isLastScene() { return sceneIndex === sceneList.length - 1; }

  function finishScene() {
    el.tapHint.hidden = true;
    el.next.hidden = false;
    el.next.textContent = isLastScene() ? "夜を閉じる" : "次の場面へ";
  }

  function advance() {
    const nodes = el.paras.children;
    if (shownCount >= nodes.length) return;
    const n = nodes[shownCount++];
    n.classList.remove("is-hidden");
    n.classList.add("is-new");
    if (shownCount >= nodes.length) finishScene();
    else { el.tapHint.hidden = false; el.next.hidden = true; }
    // 新しい段落が見えるように
    requestAnimationFrame(() => {
      const r = n.getBoundingClientRect();
      if (r.bottom > window.innerHeight - 120) window.scrollBy({ top: r.bottom - window.innerHeight + 160, behavior: "smooth" });
    });
  }

  function nextScene() {
    if (!isLastScene()) { startScene(sceneIndex + 1); return; }
    if (run === 1) {
      save.clearedFirst = true;
      store.save(save);
      setRun(2);
      show("screen-end1");
    } else {
      $("end2-found").innerHTML =
        `見つけた伏線　${found.size} / ${hintTotal}` +
        (found.size < hintTotal ? "<br>まだ光ったままの言葉が残っています。" : "<br>すべての言葉に、触れました。");
      show("screen-end2");
    }
  }

  function updateFound() {
    el.barFound.hidden = run !== 2;
    el.barFound.textContent = `伏線 ${found.size} / ${hintTotal}`;
  }

  /* ---------- 真相側の読み ---------- */
  let lastFocus = null;
  function openSheet(id, btn) {
    const h = hints[id];
    if (!h) return;
    lastFocus = btn;
    el.sheetQuote.textContent = h.text;
    el.sheetNote.textContent = h.note;
    el.sheet.hidden = false;
    el.backdrop.hidden = false;
    $("sheet-close").focus({ preventScroll: true });
    if (!found.has(id)) {
      found.add(id);
      save.found = [...found];
      store.save(save);
      document.querySelectorAll(`[data-hint="${id}"]`).forEach((b) => b.classList.add("is-found"));
      updateFound();
    }
  }
  function closeSheet() {
    el.sheet.hidden = true;
    el.backdrop.hidden = true;
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- 共有 ---------- */
  function shareUrl() { return location.href.split("#")[0].split("?")[0]; }
  function xIntent() {
    return "https://x.com/intent/post?text=" + encodeURIComponent(SHARE_TEXT) + "&url=" + encodeURIComponent(shareUrl());
  }
  async function share() {
    const toast = $("share-toast");
    if (navigator.share) {
      try { await navigator.share({ title: STORY.title, text: SHARE_TEXT, url: shareUrl() }); return; }
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
    const t = document.documentElement.dataset.theme;
    if (t) return t;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (_) { /* noop */ }

  /* ---------- イベント ---------- */
  $("btn-start").addEventListener("click", () => { setRun(save.clearedFirst ? 2 : 1); show("screen-read"); startScene(0); });
  $("btn-restart-first").addEventListener("click", () => { setRun(1); show("screen-read"); startScene(0); });
  $("btn-second").addEventListener("click", () => { setRun(2); show("screen-read"); startScene(0); });
  $("btn-again").addEventListener("click", () => { setRun(2); show("screen-read"); startScene(0); });
  $("btn-home").addEventListener("click", renderTitle);
  el.next.addEventListener("click", (e) => { e.stopPropagation(); nextScene(); });
  document.querySelectorAll(".js-share").forEach((b) => b.addEventListener("click", share));
  $("link-x").href = xIntent();

  el.page.addEventListener("click", (e) => {
    const h = e.target.closest(".hint");
    if (h) { e.stopPropagation(); openSheet(h.dataset.hint, h); return; }
    if (run === 1) advance();
  });
  el.backdrop.addEventListener("click", closeSheet);
  $("sheet-close").addEventListener("click", closeSheet);

  document.addEventListener("keydown", (e) => {
    if (!el.sheet.hidden) { if (e.key === "Escape") closeSheet(); return; }
    if (!$("screen-read").classList.contains("is-active")) return;
    if (e.target.closest && e.target.closest("button")) return; // ボタン自身の Enter/Space は既定動作に任せる
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      if (shownCount < el.paras.children.length) advance();
      else nextScene();
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
