// 反転一行 — 依存なし。作品は stories/NNN.json（001 から連番）。新作はファイルを1つ足すだけ。
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const KEY = "hanten.read.v1";
  const SERIES = "反転一行";
  const BASE = new URL("./", location.href); // games/hanten/

  // ---- 読了記録（localStorage が使えなくても読める） ----
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } },
    add(id) {
      try { const a = store.get(); if (!a.includes(id)) { a.push(id); localStorage.setItem(KEY, JSON.stringify(a)); } } catch { /* 保存できない環境 */ }
    },
  };

  // ---- 作品の読み込み: 001, 002, ... を 404 が出るまで ----
  const pad = (n) => String(n).padStart(3, "0");
  async function loadOne(id) {
    try {
      const r = await fetch(new URL(`stories/${id}.json`, BASE), { cache: "no-cache" });
      return r.ok ? await r.json() : null;
    } catch { return null; }
  }
  async function loadAll() {
    const out = [];
    for (let start = 1; ; start += 8) {
      const batch = await Promise.all(Array.from({ length: 8 }, (_, i) => loadOne(pad(start + i))));
      for (const s of batch) { if (!s) return out; out.push(s); }
    }
  }
  const two = (n) => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`; };
  const isOut = (s) => !s.date || s.date <= today();

  // ---- 共有 ----
  const shareUrl = (s) => new URL(`w/${s.id}.html`, BASE).href;
  // ラストの一行は載せない（載せると本編を開く理由がなくなる）
  const shareText = (s) => `『${s.title}』\n最初の一行：「${s.paras[0]}」\n最後の一行で、この意味が変わる。（一分）\n#${SERIES}`;

  function show(id) { for (const sec of ["list", "reader", "missing"]) $(sec).hidden = sec !== id; window.scrollTo(0, 0); }

  // ---- 一覧 ----
  function renderList(all) {
    const read = store.get();
    const ol = $("works");
    ol.textContent = "";
    const pub = all.filter(isOut).reverse(); // 新しい順
    for (const s of pub) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = `?id=${s.id}`;
      a.dataset.id = s.id;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.append(`No.${s.id}`);
      if (s.special) { const b = document.createElement("span"); b.className = "badge sp"; b.textContent = "特別回"; meta.append(b); }
      if (read.includes(s.id)) { const b = document.createElement("span"); b.className = "badge read"; b.textContent = "読了"; meta.append(b); }
      const t = document.createElement("p"); t.className = "t"; t.textContent = s.title;
      const f = document.createElement("p"); f.className = "first"; f.textContent = s.paras[0];
      a.append(meta, t, f);
      li.append(a);
      ol.append(li);
    }
    // 次回予告（公開日前の話はタイトルと日付だけ）
    const nx = all.find((s) => !isOut(s));
    if (nx) {
      const li = document.createElement("li");
      li.className = "soon";
      const [, m, d] = nx.date.split("-").map(Number);
      li.innerHTML = `<div class="meta"></div><p class="t"></p>`;
      li.querySelector(".meta").textContent = `No.${nx.id}　${m}月${d}日 公開`;
      li.querySelector(".t").textContent = nx.title;
      ol.prepend(li);
    }
    document.title = SERIES;
    show("list");
  }

  // ---- 読む ----
  function renderReader(s, all) {
    const page = $("page");
    const box = $("paras");
    const lines = [...s.paras, s.last];
    let shown = 0;
    $("rNo").textContent = `No.${s.id}`;
    $("rTitle").textContent = s.title;
    $("rSpecial").hidden = !s.special;
    $("rSpecial").textContent = s.special || "";
    page.classList.toggle("monologue", !!s.monologue);
    document.title = `${s.title}｜${SERIES}`;

    const reset = () => {
      shown = 0; box.textContent = ""; $("end").hidden = true; $("hint").hidden = false;
      page.classList.remove("finished"); step();
    };
    function step() {
      if (shown >= lines.length) return;
      const p = document.createElement("p");
      p.textContent = lines[shown];
      if (shown === lines.length - 1) p.className = "lastline";
      box.append(p);
      shown++;
      $("prog").style.width = `${(shown / lines.length) * 100}%`;
      if (shown === lines.length) finish();
      else p.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function finish() {
      store.add(s.id);
      $("hint").hidden = true;
      page.classList.add("finished");
      $("sharePreview").textContent = shareText(s);
      const pub = all.filter(isOut);
      const nx = pub[pub.findIndex((x) => x.id === s.id) + 1];
      $("next").hidden = !nx;
      if (nx) $("next").href = `?id=${nx.id}`;
      setTimeout(() => { $("end").hidden = false; $("end").scrollIntoView({ block: "end", behavior: "smooth" }); }, 900);
    }
    page.onclick = step;
    page.onkeydown = (e) => { if ([" ", "Enter", "ArrowDown", "ArrowRight"].includes(e.key)) { e.preventDefault(); step(); } };
    $("again").onclick = reset;
    $("share").onclick = async () => {
      const text = shareText(s), url = shareUrl(s);
      if (navigator.share) {
        try { await navigator.share({ title: `${s.title}｜${SERIES}`, text, url }); return; }
        catch (e) { if (e && e.name === "AbortError") return; }
      }
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener");
      $("toast").textContent = "投稿画面を開きました";
    };
    show("reader");
    reset();
    page.focus({ preventScroll: true });
  }

  async function main() {
    const all = await loadAll();
    const id = new URLSearchParams(location.search).get("id");
    if (!id) return renderList(all);
    const s = all.find((x) => x.id === id);
    if (!s) return show("missing");
    renderReader(s, all);
  }
  main();
})();
