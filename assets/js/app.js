/* Palt & pixel – startsidan */
(() => {
  "use strict";

  /* ---------- Ikoner (enkla linjeikoner) ---------- */
  const IKON = {
    spel: '<path d="M7 8h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 8Z"/><path d="M8 11v4M6 13h4"/><circle cx="15.5" cy="12" r=".8" fill="currentColor"/><circle cx="17.5" cy="14.5" r=".8" fill="currentColor"/>',
    app: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    flagga: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
    vagg: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9.5h18M3 15h18M9 4v5.5M15 9.5V15M9 15v5"/>',
    personer: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15.5 14.4c2.9.1 5.5 2.2 5.5 5.6"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    lista: '<path d="m4 6 2 2 3-3M4 13l2 2 3-3"/><path d="M12 7h8M12 14h8M5 20h.01M12 20h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bild: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.5" r="1.8"/><path d="m21 16-5-5-8 8"/>'
  };
  const svg = (namn) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[namn] || IKON.bild}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Projekt och filter ---------- */
  const mosaik = document.getElementById("mosaik");
  const radTyp = document.getElementById("filter-typ");
  const TYPNAMN = { spel: "Spel", app: "App" };
  let projekt = [];

  function ruta(p) {
    const etikett = `<span class="etikett">${svg(p.ikon)}${esc(TYPNAMN[p.typ] || p.typ)} · ${esc(p.kategori)}</span>`;
    const bild = p.bild && p.storlek !== "bred"
      ? `<img src="${esc(p.bild)}" alt="${esc(p.alt || p.namn)}" loading="lazy" decoding="async">`
      : `<img src="${esc(p.poster)}" alt="" loading="lazy" decoding="async">`;
    const klipp = p.klipp ? `<video muted loop playsinline preload="none" data-klipp="${esc(p.klipp)}" aria-hidden="true"></video>` : "";
    const inre = `<div class="ruta-topp"><div><h3>${esc(p.namn)}</h3><p>${esc(p.text)}</p></div>${etikett}</div><div class="miniatyr">${bild}${klipp}</div>`;
    const klass = `ruta ${p.storlek || "liten"} f-${esc(p.farg)}`;
    return `<a class="${klass}" href="${esc(p.sida)}">${inre}</a>`;
  }

  function nastaRuta() {
    return `<article class="ruta liten nasta"><div class="ruta-topp"><div><h3>Nästa projekt</h3><p>Något nytt är på gång.</p></div></div><div class="miniatyr platshallare">${svg("plus")}<span>Snart</span></div></article>`;
  }

  function ritaVal() {
    const antal = (t) => projekt.filter((p) => t === "alla" || p.typ === t).length;
    radTyp.innerHTML = [["Allt", "alla", "/alla/"], ["Spel", "spel", "/spel/"], ["Appar", "app", "/appar/"]]
      .map(([namn, t, href]) => `<a class="chip" href="${href}">${namn} <span class="antal">${antal(t)}</span></a>`).join("");
  }

  fetch("/projects.json")
    .then((r) => r.json())
    .then((data) => {
      projekt = data.projekt || [];
      mosaik.innerHTML = projekt.map(ruta).join("") + nastaRuta();
      ritaVal();
    })
    .catch(() => {
      mosaik.innerHTML = '<p class="ingress">Projekten kunde inte laddas just nu. Ladda om sidan.</p>';
    });

  /* ---------- Pixellandskap: Piteå skärgård ---------- */
  // Följer klockan (dag/natt) och årstiden. Tryck i bilden: det finns små påskägg.
  const canvas = document.getElementById("landskap");
  const ctx = canvas.getContext("2d");
  const H = 120;
  let W = 320;
  const lugn = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function arstid() {
    const test = new URLSearchParams(location.search).get("arstid");
    if (["vinter", "var", "sommar", "host"].includes(test)) return test;
    const m = new Date().getMonth();
    if (m >= 10 || m <= 2) return "vinter";
    if (m <= 4) return "var";
    if (m <= 7) return "sommar";
    return "host";
  }
  const ARSTID = arstid();
  const VINTER = ARSTID === "vinter";

  function arNatt() {
    const h = new Date().getHours();
    if (ARSTID === "vinter") return h < 8 || h >= 15;
    if (ARSTID === "sommar") return h < 3 || h >= 23;
    return h < 6 || h >= 19;
  }
  let natt = arNatt();
  document.body.classList.toggle("natt", natt);
  document.getElementById("himmel").addEventListener("click", () => {
    natt = !natt;
    document.body.classList.toggle("natt", natt);
    rita(performance.now());
  });

  // Förutsägbar slump, så landskapet ser likadant ut varje gång
  function slump(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  function blanda(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = (pa >> 16) + ((pb >> 16) - (pa >> 16)) * t;
    const g = ((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t;
    const bl = (pa & 255) + ((pb & 255) - (pa & 255)) * t;
    return `rgb(${r | 0},${g | 0},${bl | 0})`;
  }

  const HORISONT = 76;
  // Var saker finns, så att ett tryck kan hitta dem
  const G = { palt: { x: 0, y: 0 }, fabrik: { x: 0, w: 0 }, sol: { x: 0, y: 0 }, hus: [], strand: 0, klippStart: 0 };

  /* ---------- Himmel ---------- */
  const HIMLAR = {
    sommar: ["#2A3566", "#6B4A7E", "#C9687A", "#FF9E5A", "#FFC981"],
    var: ["#3F5C9A", "#7A87C0", "#C7A2C2", "#F2B9A0", "#FFE0B8"],
    host: ["#2D3558", "#5E4A6E", "#A85C5C", "#E08A4A", "#F4B870"],
    vinter: ["#4E6491", "#8C8DB4", "#D6A3A8", "#F2C2A0", "#FBE0C4"]
  };
  const himmelCache = {};
  function himmel() {
    const nyckel = (natt ? "n" : "d") + ARSTID + W;
    if (himmelCache[nyckel]) { ctx.putImageData(himmelCache[nyckel], 0, 0); return; }
    const steg = natt ? ["#04070F", "#081127", "#0C1A36", "#122544"] : HIMLAR[ARSTID];
    const n = steg.length - 1;
    for (let y = 0; y < HORISONT; y++) {
      const f = (y / HORISONT) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i;
      const band = Math.floor(r * 4) / 4;
      for (let x = 0; x < W; x += 1) {
        const dither = ((x + y) % 2 === 0 && (r * 4) % 1 > 0.5) ? 0.25 : 0;
        P(x, y, 1, 1, blanda(steg[i], steg[i + 1], Math.min(1, band + dither)));
      }
    }
    himmelCache[nyckel] = ctx.getImageData(0, 0, W, HORISONT);
  }

  function stjarnor(t) {
    const r = slump(7);
    for (let i = 0; i < W * 0.35; i++) {
      const x = r() * W, y = r() * (HORISONT - 20), fas = r() * 6.28;
      const ljus = 0.5 + 0.5 * Math.sin(t / 700 + fas);
      if (ljus > 0.25) P(x, y, 1, 1, ljus > 0.8 ? "#FFFFFF" : "#9FB2D6");
    }
  }

  let norrskenBoost = 0;
  function norrsken(t) {
    const gardiner = [
      { y: 30, amp: 7, fart: 0.00035, len: 0.018, farg: ["#6FF2B5", "#2FD6A0"], h: 26 },
      { y: 40, amp: 5, fart: -0.00025, len: 0.026, farg: ["#7BE0FF", "#6FF2B5"], h: 18 },
      { y: 24, amp: 4, fart: 0.0002, len: 0.012, farg: ["#B48CFF", "#6FF2B5"], h: 14 }
    ];
    const extra = Math.max(0, norrskenBoost - t) / 4000;
    for (const g of gardiner) {
      for (let x = 0; x < W; x += 1) {
        const v = Math.sin(x * g.len + t * g.fart) * g.amp + Math.sin(x * g.len * 2.3 - t * g.fart * 1.7) * g.amp * 0.4;
        const top = g.y + v - extra * 6;
        const styrka = 0.55 + 0.45 * Math.sin(x * 0.05 + t * 0.0009);
        for (let k = 0; k < g.h + extra * 10; k++) {
          const a = Math.min(1, (1 - k / (g.h + extra * 10)) * styrka * (0.55 + extra * 0.4));
          if ((x + k) % 2 && k > g.h * 0.6) continue;
          ctx.globalAlpha = a;
          P(x, top + k, 1, 1, k < 3 ? g.farg[1] : g.farg[0]);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  let solglasogon = 0;
  function sol(t) {
    // Vintersolen står lågt och är halvt nere vid horisonten
    const cx = Math.round(W * 0.66), cy = VINTER ? HORISONT - 2 : HORISONT - 7, r = VINTER ? 8 : 9;
    G.sol = { x: cx, y: cy, r };
    ctx.globalAlpha = 0.35;
    for (let y = -r - 5; y <= r + 5; y++) for (let x = -r - 5; x <= r + 5; x++) {
      const d = Math.hypot(x, y);
      if (d > r && d < r + 5 && (x + y) % 2 === 0 && cy + y < HORISONT) P(cx + x, cy + y, 1, 1, "#FFD9A0");
    }
    ctx.globalAlpha = 1;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d <= r && cy + y < HORISONT) P(cx + x, cy + y, 1, 1, d < r - 3 ? "#FFF1C9" : "#FFD88A");
    }
    if (solglasogon > t) { // påskägg: solen tar på sig solglasögon
      P(cx - 6, cy - 3, 5, 3, "#1C1C28"); P(cx + 1, cy - 3, 5, 3, "#1C1C28"); P(cx - 1, cy - 3, 2, 1, "#1C1C28");
      P(cx - 5, cy - 3, 1, 1, "#6A6A8A"); P(cx + 2, cy - 3, 1, 1, "#6A6A8A");
      P(cx - 2, cy + 3, 5, 1, "#C9783A");
    }
  }

  /* ---------- Fabriken i Munksund: liten, dimmig, långt bort ---------- */
  function fabrik(t) {
    const x0 = Math.round(W * 0.13), bas = HORISONT;
    G.fabrik = { x: x0 - 2, w: 52 };
    // Dimmig: färgen ligger mellan himlen vid horisonten och öarna, så att fabriken syns men inte tar plats
    const f = natt ? "#0E1828" : blanda(HIMLAR[ARSTID][4], "#3B2C4F", 0.38);
    const block = [[0, 5, 14], [12, 9, 9], [20, 6, 10], [29, 11, 7], [35, 4, 12]]; // [x, höjd, bredd]
    for (const [dx, h, w] of block) P(x0 + dx, bas - h, w, h, f);
    P(x0 + 19, bas - 19, 1, 10, f);          // höga skorstenen
    P(x0 + 33, bas - 17, 1, 8, f);           // smal skorsten
    for (let i = 0; i < 10; i++) P(x0 + 40 + i, bas - 11 + Math.round(i * 0.8), 1, 1, f); // transportbandet
    if (natt) {
      P(x0 + 4, bas - 3, 1, 1, "#E8B25A"); P(x0 + 14, bas - 5, 1, 1, "#E8B25A"); P(x0 + 30, bas - 7, 1, 1, "#E8B25A");
      if (Math.floor(t / 900) % 2) P(x0 + 19, bas - 20, 1, 1, "#C04040"); // flyghinderljus
    }
    // Ånga som driver sakta åt höger och tonar bort
    const anga = natt ? "#33435F" : (VINTER ? "#F4EEF2" : "#EADCE2");
    const kallor = [[x0 + 19, bas - 20, 0.9], [x0 + 33, bas - 18, 0.55], [x0 + 24, bas - 10, 0.45]];
    for (const [sx, sy, storlek] of kallor) {
      for (let k = 0; k < 6; k++) {
        const age = ((t / 70 + k * 37) % 220) / 220;
        const px = sx + age * 26 * storlek + Math.sin(t / 900 + k) * 0.6, py = sy - age * 9 * storlek;
        const r = (1.2 + age * 4) * storlek;
        ctx.globalAlpha = (1 - age) * (natt ? 0.3 : 0.32);
        for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r && (x + y + k) % 2 === 0) P(px + x, py + y, 1, 1, anga);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Öar ---------- */
  function oar() {
    const r = slump(42);
    const farg = natt ? "#0A1628" : "#3B2C4F";
    const trad = natt ? "#08111F" : "#2F2442";
    const sno = natt ? "#4A5878" : "#F2F4FA";
    const lov = ["#C98A2A", "#D7652A", "#E0B03A"];
    let x = -10;
    while (x < W) {
      const bredd = 30 + r() * 70, hojd = 3 + r() * 5;
      for (let i = 0; i < bredd; i++) {
        const k = i / bredd, h = Math.round(Math.sin(k * Math.PI) * hojd);
        P(x + i, HORISONT - h, 1, h, farg);
        if (VINTER && h > 0) P(x + i, HORISONT - h, 1, 1, sno);
        if (i % 4 === 0 && r() > 0.4) {
          const th = 4 + Math.floor(r() * 4);
          const bjork = ARSTID === "host" && r() > 0.6;
          for (let j = 0; j < th; j++) {
            const w = j < th - 2 ? (j < 2 ? 3 : 1 + ((th - j) > 3 ? 2 : 0)) : 1;
            P(x + i - Math.floor(w / 2), HORISONT - h - j, w, 1, bjork && !natt ? lov[(i + j) % 3] : trad);
          }
          if (VINTER) P(x + i, HORISONT - h - th, 1, 1, sno);
        }
      }
      x += bredd + 10 + r() * 50;
    }
  }

  /* ---------- Havet (eller isen) ---------- */
  function hav(t) {
    if (VINTER) {
      const is = natt ? ["#26314C", "#2B3755", "#303E5E"] : ["#C9D6EA", "#D8E2F1", "#E6EDF7"];
      for (let y = HORISONT; y < H; y++) P(0, y, W, 1, is[Math.min(2, Math.floor((y - HORISONT) / (H - HORISONT) * 3))]);
      const r = slump(31);
      const spricka = natt ? "#1E2840" : "#AFC0DA";
      for (let i = 0; i < 7; i++) { // sprickor och skoterspår
        let x = r() * W, y = HORISONT + 4 + r() * (H - HORISONT - 8);
        for (let j = 0; j < 14; j++) { P(x, y, 2, 1, spricka); x += 2; y += r() > 0.6 ? (r() > 0.5 ? 1 : -1) : 0; }
      }
      for (let i = 0; i < W * 0.25; i++) { // glittrande snökristaller
        const x = r() * W, y = HORISONT + 2 + r() * (H - HORISONT - 2), fas = r() * 6.28;
        if (Math.sin(t / 600 + fas) > 0.85) P(x, y, 1, 1, natt ? "#7FA0C8" : "#FFFFFF");
      }
      return;
    }
    const bas = natt ? ["#0B1B33", "#0E2341", "#11294B"]
      : ARSTID === "host" ? ["#3C4470", "#33507A", "#284A72"] : ["#4A4F86", "#3A5A8E", "#2C5A88"];
    for (let y = HORISONT; y < H; y++) {
      const k = (y - HORISONT) / (H - HORISONT);
      P(0, y, W, 1, bas[Math.min(2, Math.floor(k * 3))]);
    }
    const r = slump(99);
    const solX = W * 0.66;
    for (let i = 0; i < W * 0.6; i++) {
      const y = HORISONT + 2 + Math.floor(r() * (H - HORISONT - 2));
      const bas2 = r() * W, fas = r() * 6.28;
      const x = bas2 + Math.sin(t / 900 + fas) * 2;
      const nara = Math.abs(x - solX) < 8 + (y - HORISONT) * 0.6;
      if (Math.sin(t / 500 + fas) > 0.2) {
        const c = natt ? (nara ? "#3FAF8E" : "#1E3A5F") : (nara ? "#FFD08A" : "#6F86B8");
        P(x, y, 2 + (nara ? 2 : 0), 1, c);
      }
    }
    if (ARSTID === "var") { // isflak som driver förbi
      const r2 = slump(17), isf = natt ? "#4A5A7A" : "#EEF3FA";
      for (let i = 0; i < 6; i++) {
        const bw = 6 + r2() * 12, y = HORISONT + 4 + r2() * 30;
        const x = ((r2() * W + t / 400 * (0.5 + r2())) % (W + 30)) - 15;
        P(x, y, bw, 2, isf); P(x + 2, y - 1, bw - 4, 1, isf);
      }
    }
  }

  /* ---------- Stranden (Pite havsbad) ---------- */
  let snogubbe = false;
  function strand() {
    const snotackt = VINTER;
    const sand = snotackt ? (natt ? "#56607A" : "#F4F7FB") : (natt ? "#4A4A5A" : "#E8C98F");
    const skugga = snotackt ? (natt ? "#465068" : "#D6E0EE") : (natt ? "#3A3A4A" : "#C9A66E");
    const bredd = Math.min(140, W * 0.32);
    G.strand = bredd;
    for (let x = 0; x < bredd; x++) {
      const k = x / bredd;
      const top = Math.round(96 + k * k * 22);
      P(x, top, 1, H - top, sand);
      P(x, top, 1, 1, skugga);
    }
    const px = Math.round(bredd * 0.32), py = 92;
    if (ARSTID === "sommar") {
      const rand = natt ? ["#5A3A44", "#4A4A5A"] : ["#D7263D", "#FFF6E3"];
      for (let i = -7; i <= 7; i++) {
        const h = Math.round(4 - Math.abs(i) * 0.5);
        P(px + i, py - h, 1, h, rand[Math.floor((i + 7) / 3) % 2]);
      }
      P(px, py - 1, 1, 12, natt ? "#2A2A36" : "#6B4A2B");
      P(px + 6, py + 9, 9, 2, natt ? "#3A4A6A" : "#2F6FD0");
    } else if (VINTER) {
      // en spark som står och väntar
      const tra = natt ? "#3A2A2A" : "#7A3A22", me = natt ? "#2A2A36" : "#4A4A5A";
      P(px + 2, py + 4, 1, 7, tra); P(px + 2, py + 4, 5, 1, tra); P(px + 6, py + 4, 1, 4, tra);
      P(px + 1, py + 7, 7, 1, tra); P(px - 2, py + 11, 14, 1, me);
      if (snogubbe) { // påskägg: en snögubbe med lingon som knappar
        const s = natt ? "#C8D0E0" : "#FFFFFF", x = px + 22, y = py + 12;
        for (const [r, oy] of [[4, 0], [3, -6], [2, -10]]) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (xx * xx + yy * yy <= r * r) P(x + xx, y + oy + yy, 1, 1, s);
        P(x, y - 6, 1, 1, "#D7263D"); P(x, y - 4, 1, 1, "#D7263D"); P(x, y - 1, 1, 1, "#D7263D");
        P(x - 1, y - 11, 1, 1, "#1C1C28"); P(x + 1, y - 11, 1, 1, "#1C1C28"); P(x + 1, y - 10, 2, 1, "#F08030");
        P(x - 2, y - 13, 5, 1, "#2F6FD0"); P(x - 1, y - 14, 3, 1, "#2F6FD0");
      }
    }
  }

  /* ---------- Båthusen ---------- */
  const lampor = {};
  let katt = 0;
  function batahus() {
    const start = Math.max(W * 0.74, W - 110);
    G.klippStart = start;
    const klipp = natt ? "#1A2232" : "#5B5F73", klippLjus = natt ? "#232C40" : "#7C8197";
    const sno = natt ? "#56607A" : "#F4F7FB";
    for (let x = start; x < W; x++) {
      const k = (x - start) / (W - start);
      const top = Math.round(100 - Math.sin(Math.min(1, k * 1.6) * Math.PI / 2) * 10);
      P(x, top, 1, H - top, klipp);
      if ((x | 0) % 5 === 0) P(x, top, 1, 1, klippLjus);
      if (VINTER) P(x, top, 1, 2, sno);
      else if (ARSTID === "var" && (x | 0) % 7 < 2) P(x, top, 1, 1, sno);
    }
    const r = slump(5);
    const tall = natt ? "#0A1A16" : "#1F4D3A";
    for (let i = 0; i < 9; i++) {
      const tx = start + 10 + r() * (W - start - 12), th = 10 + r() * 10, base = 92;
      for (let j = 0; j < th; j++) {
        const w = Math.max(1, Math.round((th - j) / 3));
        P(tx - w / 2, base - j, w, 1, tall);
        if (VINTER && j % 3 === 0 && w > 1) P(tx - w / 2, base - j, w, 1, sno);
      }
    }
    G.hus = [];
    const hus = [[start + 18, 22], [start + 46, 18], [start + 70, 20]];
    hus.forEach(([hx, hw], n) => {
      if (hx + hw > W) return;
      const by = 100, hh = 10;
      G.hus.push({ x: hx, y: by - hh - 5, w: hw, h: hh + 5, n });
      const vagg = natt ? "#5C1A22" : "#B3262E", tak = natt ? "#2A0E14" : "#5E1218", vit = natt ? "#8E8E9E" : "#FFF6E3";
      P(hx, by - hh, hw, hh, vagg);
      for (let i = 0; i < 4; i++) P(hx - 1 + i, by - hh - 1 - i, hw + 2 - i * 2, 1, VINTER ? sno : tak);
      if (VINTER) P(hx - 1, by - hh - 1, hw + 2, 1, tak);
      P(hx + hw / 2 - 2, by - 6, 4, 6, natt ? "#1A0A0E" : "#3A0C10");
      P(hx, by - hh, 1, hh, vit); P(hx + hw - 1, by - hh, 1, hh, vit);
      const tand = lampor[n] !== undefined ? lampor[n] : natt;
      if (tand) P(hx + 3, by - 7, 2, 2, "#FFD27A");
      P(hx - 2, by, hw + 4, 2, natt ? "#2A2A36" : "#6B4A2B");
      if (n === 0 && katt > performance.now()) { // påskägg: en katt på taket
        const kx = hx + hw / 2, ky = by - hh - 5, c = natt ? "#0A0A12" : "#2A2230";
        P(kx - 2, ky, 4, 2, c); P(kx + 1, ky - 2, 2, 2, c); P(kx + 1, ky - 3, 1, 1, c); P(kx + 2, ky - 3, 1, 1, c); P(kx - 3, ky - 1, 1, 2, c);
        if (natt) { P(kx + 1, ky - 2, 1, 1, "#FFE27A"); }
      }
    });
  }

  /* ---------- Palten ---------- */
  let paltHopp = 0, paltSover = 0;
  function palten(t) {
    const cx = Math.round(W * 0.47);
    let cy = VINTER ? 99 : 98 + (lugn ? 0 : Math.round(Math.sin(t / 650) * 1.2));
    if (paltHopp > t) cy -= Math.round(Math.sin((1 - (paltHopp - t) / 600) * Math.PI) * 6);
    const r = 7;
    G.palt = { x: cx, y: cy - 3 };
    if (VINTER) { // en vak i isen, palten sitter på kanten
      const vak = natt ? "#0B1528" : "#3A5A8E";
      for (let x = -8; x <= 8; x++) { const h = Math.round(Math.sqrt(1 - (x / 8.5) ** 2) * 2.5); P(cx + x + 15, 104 - h, 1, h * 2, vak); }
    }
    const ljus = natt ? "#B9B2A0" : "#EADFC6", mork = natt ? "#8E8878" : "#CDBB98";
    for (let y = -r; y <= 1; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r) continue;
      if (x > 1 && (x + y) % 3 === 0 && d > r - 2) continue;
      P(cx + x, cy + y, 1, 1, x + y > 3 ? mork : ljus);
    }
    P(cx - 2, cy - r - 1, 2, 2, "#D7263D");
    P(cx + 1, cy - r - 2, 2, 2, "#D7263D");
    P(cx - 2, cy - r - 1, 1, 1, "#FF7A8A");
    if (paltSover > t) { P(cx - 3, cy - 3, 2, 1, "#5A5040"); P(cx + 1, cy - 3, 2, 1, "#5A5040"); }
    if (!VINTER) {
      const v = natt ? "#2E5A86" : "#9DB4E0";
      const ut = lugn ? 0 : Math.floor((t / 400) % 4);
      P(cx - r - 2 - ut, cy + 2, 3, 1, v);
      P(cx + r + ut, cy + 2, 3, 1, v);
    }
  }

  /* ---------- Snöfall ---------- */
  function snofall(t) {
    if (!VINTER || lugn) return;
    const r = slump(123);
    for (let i = 0; i < W * 0.18; i++) {
      const x0 = r() * W, fart = 0.004 + r() * 0.006, fas = r() * 100;
      const y = ((t * fart + fas * 3) % (H + 10)) - 5;
      const x = (x0 + Math.sin(t / 1500 + fas) * 4 + W) % W;
      P(x, y, 1, 1, natt ? "#C8D4EA" : "#FFFFFF");
    }
  }

  /* ---------- Pixeltext (egen 3×5-font) ---------- */
  const FONT = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
    F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010",
    K: "101101110101101", L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010",
    P: "110101110100100", Q: "010101101110011", R: "110101110101101", S: "011100010001110", T: "111010010010010",
    U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101", Y: "101101010010010",
    Z: "111001010100111", "Å": "010101111101101", "Ä": "010101111101101", "Ö": "010101101101010",
    0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110", 4: "101101111001001",
    5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
    ".": "000000000000010", ",": "000000000010100", "!": "010010010000010", "?": "110001010000010", "'": "010010000000000",
    "-": "000000111000000", ":": "000010000010000", "<": "001010100010001", ">": "100010001010100", " ": "000000000000000",
    "+": "000010111010000", "=": "000111000111000", "…": "000000000000101"
  };
  const textBredd = (s) => s.length * 4 - 1;
  function pixeltext(s, x, y, c) {
    s = s.toUpperCase();
    for (let i = 0; i < s.length; i++) {
      const g = FONT[s[i]] || FONT["?"];
      for (let k = 0; k < 15; k++) if (g[k] === "1") P(x + i * 4 + (k % 3), y + Math.floor(k / 3), 1, 1, c);
      if (s[i] === "Å") P(x + i * 4 + 1, y - 2, 1, 1, c);
      if (s[i] === "Ä" || s[i] === "Ö") { P(x + i * 4, y - 2, 1, 1, c); P(x + i * 4 + 2, y - 2, 1, 1, c); }
    }
  }

  /* ---------- Påskägg ---------- */
  const PALTTANKAR = [
    "palt", "stekt palt", "fläsk", "flatpalt", "Mmm, smör...", "Mums, lingon...", "Åh, ett glas iskall mjölk...",
    "En palt till?", "Smör i hålet!", "Paltkoma...", "Är det torsdag?", "Kokt i en timme...", "Pitepalt <3",
    "Lingon > sylt", "Mer smör!", "Paltschwimen..."
  ];
  const effekter = [];
  let paltKlick = 0, senastTanke = -1;
  function tanke(x, y, text, ms = 2600) { effekter.push({ typ: "bubbla", x, y, text, start: performance.now(), ms }); vack(); }
  function slumpTanke() { let i; do { i = Math.floor(Math.random() * PALTTANKAR.length); } while (i === senastTanke); senastTanke = i; return PALTTANKAR[i]; }

  function ritaBubbla(e, t) {
    const k = (t - e.start) / e.ms;
    if (k >= 1) return false;
    const alfa = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
    const tb = textBredd(e.text), bw = tb + 8, bh = 11;
    let bx = Math.round(e.x - bw / 2), by = Math.round(e.y - 30 - k * 8);
    bx = Math.max(2, Math.min(W - bw - 2, bx)); by = Math.max(2, by);
    ctx.globalAlpha = alfa;
    const kant = "#2A2440", fyll = "#FFF8EA";
    P(bx + 1, by, bw - 2, bh, fyll); P(bx, by + 1, bw, bh - 2, fyll);
    P(bx + 1, by - 1, bw - 2, 1, kant); P(bx + 1, by + bh, bw - 2, 1, kant);
    P(bx - 1, by + 1, 1, bh - 2, kant); P(bx + bw, by + 1, 1, bh - 2, kant);
    P(bx, by, 1, 1, kant); P(bx + bw - 1, by, 1, 1, kant); P(bx, by + bh - 1, 1, 1, kant); P(bx + bw - 1, by + bh - 1, 1, 1, kant);
    // drömska små bubblor ner mot den som tänker
    const dx = e.x, dy = e.y - 10;
    P(dx, dy, 2, 2, fyll); P(dx, dy - 1, 2, 1, kant);
    P(dx + 2, dy - 6, 3, 3, fyll); P(dx + 2, dy - 7, 3, 1, kant);
    pixeltext(e.text, bx + 4, by + 3, "#3A2E5A");
    ctx.globalAlpha = 1;
    return true;
  }
  function ritaStjarnfall(e, t) {
    const k = (t - e.start) / 900;
    if (k >= 1) return false;
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = (1 - i / 10) * (1 - k);
      P(e.x + (k * 60) - i * 2, e.y + (k * 24) - i * 0.8, 1, 1, i < 2 ? "#FFFFFF" : "#BFD4FF");
    }
    ctx.globalAlpha = 1;
    return true;
  }
  function ritaFisk(e, t) {
    const k = (t - e.start) / 900;
    if (k >= 1) return false;
    const x = e.x - 8 + k * 16, y = e.y - Math.sin(k * Math.PI) * 10;
    const c = natt ? "#8FA8C8" : "#C8D4E4";
    P(x, y, 4, 2, c); P(x + 4, y - 1, 2, 1, c); P(x + 4, y + 2, 2, 1, c); P(x, y, 1, 1, "#1C1C28");
    if (k > 0.85) { P(e.x + 6, e.y - 1, 1, 1, "#FFFFFF"); P(e.x + 9, e.y - 2, 1, 1, "#FFFFFF"); P(e.x + 12, e.y - 1, 1, 1, "#FFFFFF"); }
    return true;
  }
  function ritaFaglar(e, t) {
    const k = (t - e.start) / 3500;
    if (k >= 1) return false;
    const c = natt ? "#C8D4EA" : "#2A2440";
    for (let i = 0; i < 5; i++) {
      const x = -10 + k * (W + 20) - Math.abs(i - 2) * 5, y = e.y + Math.abs(i - 2) * 3, vinge = Math.floor(t / 160 + i) % 2;
      P(x - 2, y - vinge, 2, 1, c); P(x, y, 1, 1, c); P(x + 1, y - vinge, 2, 1, c);
    }
    return true;
  }
  function ritaAkare(e, t) {
    const k = (t - e.start) / 4200;
    if (k >= 1) return false;
    const x = -6 + k * (W + 12), y = e.y + Math.sin(k * 12) * 2, ben = Math.floor(t / 200) % 2;
    P(x, y - 6, 2, 2, "#F2C9A0"); P(x - 1, y - 7, 4, 1, "#D7263D"); // mössa
    P(x, y - 4, 2, 3, "#2F6FD0"); P(x - 1, y - 4, 1, 1, "#2F6FD0"); P(x + 2, y - 3, 1, 1, "#2F6FD0");
    P(x - ben, y - 1, 1, 2, "#2A2440"); P(x + 1 + ben, y - 1, 1, 2, "#2A2440");
    P(x - 2, y + 1, 6, 1, "#9AA8BA");
    return true;
  }
  function ritaPaltregn(e, t) {
    const k = (t - e.start) / 5000;
    if (k >= 1) return false;
    const r = slump(e.fro);
    for (let i = 0; i < 24; i++) {
      const x = r() * W, fart = 0.6 + r(), y = -10 + ((t - e.start) / 40) * fart - r() * 60;
      if (y > H || y < -8) continue;
      for (let yy = -3; yy <= 0; yy++) for (let xx = -3; xx <= 3; xx++) if (xx * xx + yy * yy * 2 <= 10) P(x + xx, y + yy, 1, 1, "#EADFC6");
      P(x - 1, y - 4, 2, 1, "#D7263D");
    }
    return true;
  }
  const RITARE = { bubbla: ritaBubbla, stjarnfall: ritaStjarnfall, fisk: ritaFisk, faglar: ritaFaglar, akare: ritaAkare, paltregn: ritaPaltregn };
  function ritaEffekter(t) {
    for (let i = effekter.length - 1; i >= 0; i--) if (!RITARE[effekter[i].typ](effekter[i], t)) effekter.splice(i, 1);
  }

  function tryck(x, y) {
    const t = performance.now();
    const p = G.palt;
    if (Math.hypot(x - p.x, y - p.y) < 10) {
      paltKlick++;
      paltHopp = t + 600;
      if (paltKlick % 8 === 0) { paltSover = t + 5000; tanke(p.x, p.y, "Paltschwimen... Zzz", 4200); }
      else tanke(p.x, p.y, slumpTanke());
      return;
    }
    const f = G.fabrik;
    if (x >= f.x && x <= f.x + f.w && y > HORISONT - 26 && y < HORISONT + 2) {
      tanke(x, HORISONT - 10, ["Det luktar Piteå!", "Papper till paltpåsen?", "Munksund, hej!"][Math.floor(Math.random() * 3)]);
      return;
    }
    if (!natt && Math.hypot(x - G.sol.x, y - G.sol.y) < G.sol.r + 3) {
      solglasogon = t + 4000; tanke(G.sol.x, G.sol.y - 4, VINTER ? "Brrr, men snyggt." : "Midnattssol, baby!", 3200); vack(); return;
    }
    for (const h of G.hus) {
      if (x >= h.x - 1 && x <= h.x + h.w + 1 && y >= h.y && y <= h.y + h.h + 2) {
        if (h.n === 0) { katt = t + 4500; tanke(h.x + h.w / 2, h.y, "Mjau?", 2600); }
        else { const nu = lampor[h.n] !== undefined ? lampor[h.n] : natt; lampor[h.n] = !nu; tanke(h.x + h.w / 2, h.y, nu ? "Godnatt!" : "Vem där?", 1800); }
        return;
      }
    }
    if (x > G.klippStart && y > 70 && y < 100) { tanke(x, y, natt ? "Hoo-hoo..." : "Kvitt-kvitt!", 2000); return; }
    if (x < G.strand && y > 92) {
      if (VINTER && !snogubbe) { snogubbe = true; tanke(x, y, "En snögubbe!", 2200); }
      else tanke(x, y, VINTER ? "Spark-dags!" : "Doppa tårna?", 2000);
      return;
    }
    if (y > HORISONT + 1) {
      if (VINTER) { effekter.push({ typ: "akare", y: Math.max(HORISONT + 10, Math.min(H - 4, y)), start: t }); tanke(x, y, "Skridskoväder!", 1800); }
      else { effekter.push({ typ: "fisk", x, y, start: t }); tanke(x, y, "Plask!", 1500); }
      vack(); return;
    }
    if (natt) { effekter.push({ typ: "stjarnfall", x, y, start: t }); norrskenBoost = t + 4000; tanke(x, y + 14, "Önska dig palt!", 2200); }
    else { effekter.push({ typ: "faglar", y: Math.max(8, Math.min(HORISONT - 12, y)), start: t }); tanke(x, y + 14, slumpTanke(), 2200); }
    vack();
  }

  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    tryck((e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H);
  });
  // Skriv "palt" på tangentbordet: det regnar palt
  let skrivet = "";
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    skrivet = (skrivet + (e.key || "").toLowerCase()).slice(-4);
    if (skrivet === "palt") { effekter.push({ typ: "paltregn", start: performance.now(), fro: Math.floor(Math.random() * 1e6) }); vack(); }
  });

  function rita(t) {
    himmel();
    if (natt) { stjarnor(t); norrsken(t); } else { sol(t); }
    fabrik(t);
    oar();
    hav(t);
    strand();
    batahus();
    palten(t);
    snofall(t);
    ritaEffekter(t);
  }

  function storlek() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(160, Math.round(H * (r.width / Math.max(1, r.height))));
    canvas.width = W;
    canvas.height = H;
    rita(performance.now());
  }
  window.addEventListener("resize", storlek);
  storlek();

  // Animation: hela tiden om man inte bett om mindre rörelse, annars bara medan ett påskägg pågår
  let loopIgang = false, senast = 0;
  function loop(t) {
    if (t - senast > 90 && document.visibilityState === "visible") { senast = t; rita(t); }
    if (!lugn || effekter.length || paltHopp > t || solglasogon > t || katt > t || paltSover > t) requestAnimationFrame(loop);
    else { loopIgang = false; rita(t); }
  }
  function vack() { if (!loopIgang) { loopIgang = true; requestAnimationFrame(loop); } }
  vack();
})();
