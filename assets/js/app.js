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
  const radKat = document.getElementById("filter-kategori");
  const TYPNAMN = { spel: "Spel", app: "App" };
  let projekt = [];
  let valtTyp = "alla";
  let valdKat = "alla";

  function ruta(p) {
    const etikett = `<span class="etikett">${svg(p.ikon)}${esc(TYPNAMN[p.typ] || p.typ)} · ${esc(p.kategori)}</span>`;
    const bild = p.bild
      ? `<img src="${esc(p.bild)}" alt="${esc(p.alt || p.namn)}" loading="lazy" decoding="async">`
      : `<div class="platshallare">${svg("bild")}<span>Bild kommer</span></div>`;
    const inre = `<div class="ruta-topp"><div><h3>${esc(p.namn)}</h3><p>${esc(p.text)}</p></div>${etikett}</div><div class="miniatyr">${bild}</div>`;
    const klass = `ruta ${p.storlek || "liten"} f-${esc(p.farg)}`;
    const data = `data-typ="${esc(p.typ)}" data-kategori="${esc(p.kategori)}"`;
    return p.lank
      ? `<a class="${klass}" href="${esc(p.lank)}" ${data}>${inre}</a>`
      : `<article class="${klass}" ${data}>${inre}</article>`;
  }

  function nastaRuta() {
    return `<article class="ruta liten nasta" data-typ="nasta" data-kategori=""><div class="ruta-topp"><div><h3>Nästa projekt</h3><p>Något nytt är på gång.</p></div></div><div class="miniatyr platshallare">${svg("plus")}<span>Snart här</span></div></article>`;
  }

  function chip(text, valt, antal, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.setAttribute("aria-pressed", String(valt));
    b.innerHTML = `${esc(text)}${antal != null ? ` <span class="antal">${antal}</span>` : ""}`;
    b.addEventListener("click", onClick);
    return b;
  }

  function ritaFilter() {
    radTyp.replaceChildren(
      chip("Allt", valtTyp === "alla", projekt.length, () => valj("alla")),
      chip("Spel", valtTyp === "spel", projekt.filter((p) => p.typ === "spel").length, () => valj("spel")),
      chip("Appar", valtTyp === "app", projekt.filter((p) => p.typ === "app").length, () => valj("app"))
    );
    const kategorier = [...new Set(projekt.filter((p) => p.typ === "spel").map((p) => p.kategori))];
    radKat.hidden = valtTyp !== "spel";
    radKat.replaceChildren(
      chip("Alla spel", valdKat === "alla", null, () => { valdKat = "alla"; uppdatera(); }),
      ...kategorier.map((k) => chip(k, valdKat === k, null, () => { valdKat = k; uppdatera(); }))
    );
  }

  function valj(typ) {
    valtTyp = typ;
    valdKat = "alla";
    uppdatera();
  }

  function uppdatera() {
    ritaFilter();
    mosaik.querySelectorAll(".ruta").forEach((el) => {
      const typ = el.dataset.typ;
      const passar = typ === "nasta" ? valtTyp === "alla"
        : (valtTyp === "alla" || typ === valtTyp) && (valdKat === "alla" || el.dataset.kategori === valdKat);
      el.classList.toggle("dimmad", !passar);
      if (el.tagName === "A") el.tabIndex = passar ? 0 : -1;
    });
  }

  document.querySelectorAll(".meny a[data-filter]").forEach((a) => {
    a.addEventListener("click", () => valj(a.dataset.filter));
  });

  fetch("/projects.json")
    .then((r) => r.json())
    .then((data) => {
      projekt = data.projekt || [];
      mosaik.innerHTML = projekt.map(ruta).join("") + nastaRuta();
      uppdatera();
    })
    .catch(() => {
      mosaik.innerHTML = '<p class="ingress">Projekten kunde inte laddas just nu. Ladda om sidan.</p>';
    });

  /* ---------- Pixellandskap: Piteå skärgård ---------- */
  const canvas = document.getElementById("landskap");
  const ctx = canvas.getContext("2d");
  const H = 120;
  let W = 320;
  const lugn = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function arNatt() {
    const d = new Date(), h = d.getHours(), m = d.getMonth();
    const vinter = m >= 8 || m <= 2;
    return vinter ? (h < 7 || h >= 16) : (h < 4 || h >= 23);
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

  const himmelCache = {};
  function himmel(t) {
    const nyckel = (natt ? "n" : "d") + W;
    if (himmelCache[nyckel]) { ctx.putImageData(himmelCache[nyckel], 0, 0); return; }
    ritaHimmel();
    himmelCache[nyckel] = ctx.getImageData(0, 0, W, HORISONT);
  }
  function ritaHimmel() {
    const steg = natt
      ? ["#04070F", "#081127", "#0C1A36", "#122544"]
      : ["#2A3566", "#6B4A7E", "#C9687A", "#FF9E5A", "#FFC981"];
    const n = steg.length - 1;
    for (let y = 0; y < HORISONT; y++) {
      const f = (y / HORISONT) * n, i = Math.min(n - 1, Math.floor(f)), r = f - i;
      // grovt rastrerade band, som i gamla spel
      const band = Math.floor(r * 4) / 4;
      for (let x = 0; x < W; x += 1) {
        const dither = ((x + y) % 2 === 0 && (r * 4) % 1 > 0.5) ? 0.25 : 0;
        P(x, y, 1, 1, blanda(steg[i], steg[i + 1], Math.min(1, band + dither)));
      }
    }
  }

  function stjarnor(t) {
    const r = slump(7);
    for (let i = 0; i < W * 0.35; i++) {
      const x = r() * W, y = r() * (HORISONT - 20), fas = r() * 6.28;
      const ljus = 0.5 + 0.5 * Math.sin(t / 700 + fas);
      if (ljus > 0.25) P(x, y, 1, 1, ljus > 0.8 ? "#FFFFFF" : "#9FB2D6");
    }
  }

  function norrsken(t) {
    const gardiner = [
      { y: 30, amp: 7, fart: 0.00035, len: 0.018, farg: ["#6FF2B5", "#2FD6A0"], h: 26 },
      { y: 40, amp: 5, fart: -0.00025, len: 0.026, farg: ["#7BE0FF", "#6FF2B5"], h: 18 },
      { y: 24, amp: 4, fart: 0.0002, len: 0.012, farg: ["#B48CFF", "#6FF2B5"], h: 14 }
    ];
    for (const g of gardiner) {
      for (let x = 0; x < W; x += 1) {
        const v = Math.sin(x * g.len + t * g.fart) * g.amp + Math.sin(x * g.len * 2.3 - t * g.fart * 1.7) * g.amp * 0.4;
        const top = g.y + v;
        const styrka = 0.55 + 0.45 * Math.sin(x * 0.05 + t * 0.0009);
        for (let k = 0; k < g.h; k++) {
          const a = (1 - k / g.h) * styrka * 0.55;
          if ((x + k) % 2 && k > g.h * 0.6) continue; // pixligt utdöende
          ctx.globalAlpha = a;
          P(x, top + k, 1, 1, k < 3 ? g.farg[1] : g.farg[0]);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function sol(t) {
    const cx = Math.round(W * 0.66), cy = HORISONT - 7, r = 9;
    ctx.globalAlpha = 0.35;
    for (let y = -r - 5; y <= r + 5; y++) for (let x = -r - 5; x <= r + 5; x++) {
      const d = Math.hypot(x, y);
      if (d > r && d < r + 5 && (x + y) % 2 === 0) P(cx + x, cy + y, 1, 1, "#FFD9A0");
    }
    ctx.globalAlpha = 1;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d <= r) P(cx + x, cy + y, 1, 1, d < r - 3 ? "#FFF1C9" : "#FFD88A");
    }
  }

  function oar(t) {
    const r = slump(42);
    const farg = natt ? "#0A1628" : "#3B2C4F";
    const trad = natt ? "#08111F" : "#2F2442";
    let x = -10;
    while (x < W) {
      const bredd = 30 + r() * 70, hojd = 3 + r() * 5;
      for (let i = 0; i < bredd; i++) {
        const k = i / bredd, h = Math.round(Math.sin(k * Math.PI) * hojd);
        P(x + i, HORISONT - h, 1, h, farg);
        if (i % 4 === 0 && r() > 0.4) { // tallar på öarna
          const th = 4 + Math.floor(r() * 4);
          for (let j = 0; j < th; j++) { const w = j < th - 2 ? (j < 2 ? 3 : 1 + ((th - j) > 3 ? 2 : 0)) : 1; P(x + i - Math.floor(w / 2), HORISONT - h - j, w, 1, trad); }
        }
      }
      x += bredd + 10 + r() * 50;
    }
  }

  function hav(t) {
    const bas = natt ? ["#0B1B33", "#0E2341", "#11294B"] : ["#4A4F86", "#3A5A8E", "#2C5A88"];
    for (let y = HORISONT; y < H; y++) {
      const k = (y - HORISONT) / (H - HORISONT);
      P(0, y, W, 1, bas[Math.min(2, Math.floor(k * 3))]);
    }
    // glitter och solgata
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
  }

  function strand() {
    // Pite havsbad: sandstrand till vänster
    const sand = natt ? "#4A4A5A" : "#E8C98F", skugga = natt ? "#3A3A4A" : "#C9A66E";
    const bredd = Math.min(140, W * 0.32);
    for (let x = 0; x < bredd; x++) {
      const k = x / bredd;
      const top = Math.round(96 + k * k * 22);
      P(x, top, 1, H - top, sand);
      P(x, top, 1, 1, skugga);
    }
    // parasoll
    const px = Math.round(bredd * 0.32), py = 92;
    const rand = natt ? ["#5A3A44", "#4A4A5A"] : ["#D7263D", "#FFF6E3"];
    for (let i = -7; i <= 7; i++) {
      const h = Math.round(4 - Math.abs(i) * 0.5);
      P(px + i, py - h, 1, h, rand[Math.floor((i + 7) / 3) % 2]);
    }
    P(px, py - 1, 1, 12, natt ? "#2A2A36" : "#6B4A2B");
    // badhandduk
    P(px + 6, py + 9, 9, 2, natt ? "#3A4A6A" : "#2F6FD0");
  }

  function batahus() {
    // klippor, tallar och röda båthus till höger
    const start = Math.max(W * 0.74, W - 110);
    const klipp = natt ? "#1A2232" : "#5B5F73", klippLjus = natt ? "#232C40" : "#7C8197";
    for (let x = start; x < W; x++) {
      const k = (x - start) / (W - start);
      const top = Math.round(100 - Math.sin(Math.min(1, k * 1.6) * Math.PI / 2) * 10);
      P(x, top, 1, H - top, klipp);
      if ((x | 0) % 5 === 0) P(x, top, 1, 1, klippLjus);
    }
    const r = slump(5);
    const tall = natt ? "#0A1A16" : "#1F4D3A";
    for (let i = 0; i < 9; i++) {
      const tx = start + 10 + r() * (W - start - 12), th = 10 + r() * 10, base = 92;
      for (let j = 0; j < th; j++) {
        const w = Math.max(1, Math.round((th - j) / 3));
        P(tx - w / 2, base - j, w, 1, tall);
      }
    }
    const hus = [[start + 18, 22], [start + 46, 18], [start + 70, 20]];
    for (const [hx, hw] of hus) {
      if (hx + hw > W) continue;
      const by = 100, hh = 10;
      const vagg = natt ? "#5C1A22" : "#B3262E", tak = natt ? "#2A0E14" : "#5E1218", vit = natt ? "#8E8E9E" : "#FFF6E3";
      P(hx, by - hh, hw, hh, vagg);
      for (let i = 0; i < 4; i++) P(hx - 1 + i, by - hh - 1 - i, hw + 2 - i * 2, 1, tak);
      P(hx + hw / 2 - 2, by - 6, 4, 6, natt ? "#1A0A0E" : "#3A0C10");
      P(hx, by - hh, 1, hh, vit); P(hx + hw - 1, by - hh, 1, hh, vit);
      if (natt) P(hx + 3, by - 7, 2, 2, "#FFD27A"); // ljus i fönstret
      P(hx - 2, by, hw + 4, 2, natt ? "#2A2A36" : "#6B4A2B"); // brygga
    }
  }

  function palten(t) {
    // Palten flyter i vattnet: halv rund, halv pixel, med lingon på toppen
    const cx = Math.round(W * 0.47), bob = lugn ? 0 : Math.round(Math.sin(t / 650) * 1.2);
    const cy = 98 + bob, r = 7;
    const ljus = natt ? "#B9B2A0" : "#EADFC6", mork = natt ? "#8E8878" : "#CDBB98";
    for (let y = -r; y <= 1; y++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > r) continue;
      if (x > 1 && (x + y) % 3 === 0 && d > r - 2) continue; // pixlig högerhalva
      P(cx + x, cy + y, 1, 1, x + y > 3 ? mork : ljus);
    }
    P(cx - 2, cy - r - 1, 2, 2, "#D7263D");
    P(cx + 1, cy - r - 2, 2, 2, "#D7263D");
    P(cx - 2, cy - r - 1, 1, 1, "#FF7A8A");
    // ringar på vattnet
    const v = natt ? "#2E5A86" : "#9DB4E0";
    const ut = lugn ? 0 : Math.floor((t / 400) % 4);
    P(cx - r - 2 - ut, cy + 2, 3, 1, v);
    P(cx + r + ut, cy + 2, 3, 1, v);
  }

  function rita(t) {
    himmel(t);
    if (natt) { stjarnor(t); norrsken(t); } else { sol(t); }
    oar(t);
    hav(t);
    strand();
    batahus();
    palten(t);
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

  if (!lugn) {
    let senast = 0;
    const loop = (t) => {
      if (t - senast > 90 && document.visibilityState === "visible") { senast = t; rita(t); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();
