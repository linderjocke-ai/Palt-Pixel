'use strict';
(() => {
/* =====================================================================
   FRONTLINJE – isometriskt realtidsstrategispel
   ===================================================================== */
const TW = 64, TH = 32, HW = 32, HH = 16, EL = 9, PAD = 130, OYM = 230;
const SPR = 0.513;                 // skala från renderade sprites till spelets pixlar
let N = 64, OX = 0, OY = OYM, WW = 0, WH = 0;
const P = (x, y, e) => [(x - y) * HW + OX, (x + y) * HH + OY - (e || 0) * EL];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const $ = id => document.getElementById(id);
function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sm = t => t * t * (3 - 2 * t);

/* ---------------------------------------------------------------- lag */
const TEAMS = [
  { name: 'Blå', c: '#2f7bf6', rgb: [47, 123, 246], light: '#8cbcff' },
  { name: 'Röd', c: '#e5484d', rgb: [229, 72, 77], light: '#ff9a9d' },
  { name: 'Grön', c: '#22b35e', rgb: [34, 179, 94], light: '#86efac' },
  { name: 'Orange', c: '#f59e0b', rgb: [245, 158, 11], light: '#fcd34d' },
];
const ME = 0;

/* ---------------------------------------------------------------- regler */
const UT = {
  worker: { n: 'Arbetare', hp: 45, sp: 1.6, sight: 5, cls: 'inf', dmg: 0 },
  scout: { n: 'Spanare', hp: 70, sp: 2.4, sight: 9, cls: 'inf', dmg: 5, rate: 1, rng: 3.5, vs: { inf: 1, veh: .35, air: 0, bld: .3 }, proj: 'bullet' },
  soldier: { n: 'Soldat', cost: 60, time: 12, b: 'barracks', hp: 100, sp: 1.5, sight: 6, cls: 'inf', dmg: 10, rate: 1, rng: 3.5, vs: { inf: 1.4, veh: .5, air: 0, bld: .6 }, proj: 'bullet' },
  rocket: { n: 'Raketsoldat', cost: 100, time: 16, b: 'barracks', req: ['inf', 1], hp: 85, sp: 1.4, sight: 6, cls: 'inf', dmg: 26, rate: 2, rng: 4.6, vs: { inf: .5, veh: 1.6, air: 1.4, bld: 1 }, proj: 'missile' },
  tank: { n: 'Svävvagn', cost: 220, time: 22, b: 'factory', hp: 340, sp: 1.7, sight: 6, cls: 'veh', dmg: 42, rate: 2.2, rng: 4.8, vs: { inf: 1.3, veh: 1.2, air: 0, bld: 1.5 }, proj: 'rail' },
  aa: { n: 'Luftvärn', cost: 160, time: 18, b: 'factory', hp: 240, sp: 1.8, sight: 7, cls: 'veh', dmg: 30, rate: 1.1, rng: 6.5, vs: { inf: 0, veh: 0, air: 1.8, bld: 0 }, proj: 'missile' },
  radar: { n: 'Radarbil', cost: 120, time: 14, b: 'factory', hp: 160, sp: 2.1, sight: 13, cls: 'veh', dmg: 0 },
  heli: { n: 'Helikopter', cost: 260, time: 24, b: 'airfield', hp: 230, sp: 2.7, sight: 7, cls: 'air', dmg: 26, rate: 1.4, rng: 4.2, vs: { inf: 1.2, veh: 1.4, air: 0, bld: 1 }, proj: 'bolt', alt: 64 },
  jet: { n: 'Jaktplan', cost: 340, time: 28, b: 'airfield', req: ['air', 1], hp: 190, sp: 4.2, sight: 8, cls: 'air', dmg: 44, rate: 2, rng: 5, vs: { inf: .8, veh: 1.1, air: 1.7, bld: .8 }, proj: 'missile', alt: 112 },
  airship: { n: 'Luftskepp', cost: 220, time: 22, b: 'airfield', hp: 420, sp: .9, sight: 14, cls: 'air', dmg: 0, alt: 92 },
};
const BT = {
  hq: { n: 'Högkvarter', F: 3, hp: 2400, terr: 7, sight: 9, en: 12 },
  power: { n: 'Kraftverk', F: 2, cost: 120, time: 18, hp: 600, terr: 4, sight: 5, en: 25 },
  barracks: { n: 'Baracker', F: 2, cost: 150, time: 22, hp: 700, terr: 4, sight: 5, en: -5, trains: ['soldier', 'rocket'] },
  factory: { n: 'Fabrik', F: 2, cost: 300, time: 32, hp: 900, terr: 4, sight: 5, en: -8, need: 'barracks', trains: ['tank', 'aa', 'radar'] },
  airfield: { n: 'Lufthamn', F: 2, cost: 400, time: 38, hp: 800, terr: 4, sight: 6, en: -8, need: 'factory', trains: ['heli', 'jet', 'airship'] },
  lab: { n: 'Forskning', F: 2, cost: 250, time: 28, hp: 650, terr: 4, sight: 5, en: -6, need: 'barracks' },
  radartower: { n: 'Radartorn', F: 1, cost: 200, time: 20, hp: 450, terr: 4, sight: 15, en: -4 },
  turret: { n: 'Försvarstorn', F: 1, cost: 160, time: 16, hp: 700, terr: 2.5, sight: 7, en: -3, dmg: 30, rate: 1.4, rng: 6.5, vs: { inf: 1.2, veh: 1.2, air: .9, bld: 0 }, proj: 'rail' },
};
const BUILD_LIST = ['power', 'barracks', 'factory', 'airfield', 'lab', 'radartower', 'turret'];
const RS = {
  inf: { n: 'Infanteri', cost: [150, 300, 500], time: [30, 45, 60], cls: 'inf', unlock: ['Raketsoldat', '', ''] },
  veh: { n: 'Fordon', cost: [200, 350, 550], time: [35, 50, 65], cls: 'veh', unlock: ['', '', ''] },
  air: { n: 'Flyg', cost: [250, 400, 600], time: [40, 55, 70], cls: 'air', unlock: ['Jaktplan', '', ''] },
};
const DIFF = [
  { n: 'Lätt', inc: .75, think: 3, thr: 7, wave: 260, first: 330 },
  { n: 'Normal', inc: 1, think: 2, thr: 11, wave: 190, first: 230 },
  { n: 'Svår', inc: 1.3, think: 1.2, thr: 14, wave: 140, first: 160 },
];
const CLS_OF = t => UT[t] ? UT[t].cls : 'bld';

/* ---------------------------------------------------------------- tillgångar */
const AS = {};
let MAN = null;
async function loadAssets(progress) {
  MAN = await (await fetch('assets/manifest.json')).json();
  const names = Object.keys(MAN); let done = 0;
  const li = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  await Promise.all(names.map(async n => {
    const m = MAN[n];
    const img = await li('assets/' + n + '.png');
    const mask = m.mask ? await li('assets/' + n + '_m.png') : null;
    AS[n] = Object.assign({}, m, { img, mask, tint: {} });
    progress(++done / names.length);
  }));
}
function tinted(name, team) {
  const a = AS[name];
  if (team == null || team < 0 || !a.mask) return a.img;
  if (a.tint[team]) return a.tint[team];
  const w = a.img.width, h = a.img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
  mg.drawImage(a.mask, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = TEAMS[team].c; mg.fillRect(0, 0, w, h);
  g.drawImage(a.img, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(m, 0, 0);
  g.globalCompositeOperation = 'destination-in'; g.drawImage(a.img, 0, 0);
  g.globalCompositeOperation = 'source-over';
  // lätt glöd i lagfärg
  g.globalAlpha = .18; g.globalCompositeOperation = 'lighter'; g.drawImage(m, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  a.tint[team] = c; return c;
}
function drawSprite(c, name, team, frame, x, y, sc, alpha) {
  const a = AS[name]; if (!a) return;
  const img = tinted(name, team), r = a.res, s = (sc || 1) * SPR;
  if (alpha != null) c.globalAlpha = alpha;
  c.drawImage(img, frame * r, 0, r, r, x - a.ax * s, y - a.ay * s, r * s, r * s);
  if (alpha != null) c.globalAlpha = 1;
}
function thumb(name, team, frame, size) {
  const a = AS[name], c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const r = a.res, img = tinted(name, team), cls = UT[name] ? UT[name].cls : 'bld';
  let crop, cxp, cyp;
  if (cls === 'inf') { crop = 96; cxp = a.ax + 6; cyp = a.ay - 40; }
  else if (cls === 'veh') { crop = r * .66; cxp = a.ax; cyp = a.ay - 24; }
  else if (cls === 'air') { crop = r * (name === 'airship' ? .8 : .66); cxp = a.ax; cyp = a.ay; }
  else { crop = r * .8; cxp = a.ax; cyp = a.ay - r * .2; }
  g.drawImage(img, frame * r + cxp - crop / 2, cyp - crop / 2, crop, crop, 0, 0, size, size);
  return c.toDataURL();
}
/* ---------------------------------------------------------------- spelstatus */
let G = null;   // hela speltillståndet
let TL = null;  // terräng (genereras från fröet)

function mapGen(seed, size, nEnemies) {
  N = size; OX = N * HW + PAD; OY = OYM; WW = N * TW + PAD * 2; WH = N * TH + OY + PAD + 70;
  const R = rng(seed);
  const GL = 64, lat = []; for (let i = 0; i < GL * GL; i++) lat.push(R());
  const vn = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = sm(x - xi), v = sm(y - yi); const g = (a, b) => lat[((a % GL) + GL) % GL + (((b % GL) + GL) % GL) * GL]; return (g(xi, yi) * (1 - u) + g(xi + 1, yi) * u) * (1 - v) + (g(xi, yi + 1) * (1 - u) + g(xi + 1, yi + 1) * u) * v; };
  const fbm = (x, y) => vn(x / 12 + 3, y / 12 + 1) * .52 + vn(x / 6 + 11, y / 6 + 5) * .28 + vn(x / 3 + 3, y / 3 + 9) * .14 + vn(x / 1.5 + 7, y / 1.5 + 2) * .06;
  const corners = { left: [.17, .83], right: [.83, .17], top: [.17, .17], bottom: [.83, .83] };
  const order = nEnemies === 1 ? ['right'] : nEnemies === 2 ? ['top', 'bottom'] : ['right', 'top', 'bottom'];
  const bases = [corners.left, ...order.map(k => corners[k])].map(([a, b]) => [Math.round(a * N) + .5, Math.round(b * N) + .5]);
  // utposter
  const outs = []; let tries = 0; const want = Math.round(N * N / 300);
  while (outs.length < want && tries++ < 4000) {
    const x = 4 + Math.floor(R() * (N - 8)) + .5, y = 4 + Math.floor(R() * (N - 8)) + .5;
    if (bases.some(b => dist(x, y, b[0], b[1]) < 11)) continue;
    if (outs.some(o => dist(x, y, o[0], o[1]) < 8.5)) continue;
    outs.push([x, y]);
  }
  const flats = [...bases.map(b => [b[0], b[1], 6.8]), ...outs.map(o => [o[0], o[1], 2.4])];
  const T = new Array(N * N); let mn = 9, mx = -9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const n = fbm(i, j); T[i + j * N] = { n }; mn = Math.min(mn, n); mx = Math.max(mx, n); }
  T.forEach((t, k) => {
    const i = k % N, j = (k / N) | 0; let n = (t.n - mn) / (mx - mn);
    for (const [fx, fy, r] of flats) { const d = dist(i + .5, j + .5, fx, fy); if (d < r + 2) { const w = clamp((d - r) / 2, 0, 1); n = .44 * (1 - w) + n * w; } }
    t.n = n; t.v = R() - .5; setType(t);
  });
  function setType(t) {
    const n = t.n; t.t = n < .26 ? 'w' : n < .31 ? 's' : n < .6 ? 'g' : n < .7 ? 'f' : 'r';
    t.e = t.t === 'w' ? 0 : t.t === 's' ? 1 : t.t === 'g' ? (n > .5 ? 2 : 1) : t.t === 'f' ? 2 : Math.min(7, 3 + Math.floor((n - .7) * 16));
  }
  const tile = (i, j) => (i < 0 || j < 0 || i >= N || j >= N) ? null : T[i + j * N];
  const pass = t => t && t.t !== 'w' && t.t !== 'r';
  // se till att allt går att nå från spelarens bas
  const reach = () => { const seen = new Uint8Array(N * N); const q = [Math.floor(bases[0][0]) + Math.floor(bases[0][1]) * N]; seen[q[0]] = 1;
    while (q.length) { const k = q.pop(), i = k % N, j = (k / N) | 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const t = tile(i + a, j + b); const kk = i + a + (j + b) * N; if (t && !seen[kk] && pass(t)) { seen[kk] = 1; q.push(kk); } } } return seen; };
  for (let pass_ = 0; pass_ < 3; pass_++) {
    const seen = reach(); let carved = false;
    for (const [x, y] of [...bases.slice(1), ...outs]) {
      if (seen[Math.floor(x) + Math.floor(y) * N]) continue;
      carved = true; const [bx, by] = bases[0]; const steps = Math.ceil(dist(x, y, bx, by) * 2);
      for (let s = 0; s <= steps; s++) { const px = x + (bx - x) * s / steps, py = y + (by - y) * s / steps;
        for (const [a, b] of [[0, 0], [1, 0], [0, 1]]) { const t = tile(Math.floor(px) + a, Math.floor(py) + b); if (t && !pass(t)) { t.n = t.t === 'w' ? .3 : .55; setType(t); if (t.t === 'w') { t.n = .32; setType(t); } } } }
    }
    if (!carved) break;
  }
  // rekvisita (träd, stenar) och kristallfält
  const props = new Array(N * N).fill(null);
  const fields = [];
  const addField = (x, y) => { const i = Math.floor(x), j = Math.floor(y); const t = tile(i, j); if (!t || !pass(t)) return; if (fields.some(f => f.i === i && f.j === j)) return; fields.push({ i, j, amt: 2200, max: 2200, kind: R() < .65 ? 'crystal' : 'crystal2' }); };
  bases.forEach(([x, y]) => { const ax = x < N / 2 ? -1 : 1, ay = y < N / 2 ? -1 : 1; addField(x + ax * 4.6, y - ay * .5); addField(x + ax * 1, y + ay * 4.6); addField(x + ax * 4, y + ay * 3.6); });
  outs.forEach(([x, y]) => { addField(x + 1.6, y - 1.1); addField(x - 1.2, y + 1.5); });
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const t = tile(i, j), r = rng(seed + i * 7919 + j * 104729);
    if (flats.some(([fx, fy, rr]) => dist(i + .5, j + .5, fx, fy) < rr + .6)) continue;
    if (fields.some(f => f.i === i && f.j === j)) continue;
    const pick = a => a[Math.floor(r() * a.length)];
    if (t.t === 'f') props[i + j * N] = [{ s: r() < .2 ? pick(['birch0', 'birch1']) : pick(['pine0', 'pine1', 'pine2']), x: .3 + r() * .2, y: .3 + r() * .2, k: .9 + r() * .3 }, ...(r() < .6 ? [{ s: pick(['pine0', 'pine1', 'pine2']), x: .62 + r() * .2, y: .62 + r() * .2, k: .8 + r() * .3 }] : [])];
    else if (t.t === 'g' && r() < .07) props[i + j * N] = [{ s: pick(['pine0', 'pine1', 'birch0', 'birch1']), x: .5, y: .5, k: .85 + r() * .3 }];
    else if (t.t === 'r' && t.e < 6 && r() < .3) props[i + j * N] = [{ s: pick(['rock0', 'rock1']), x: .5, y: .5, k: .9 + r() * .5 }];
    else if (t.t === 's' && r() < .04) props[i + j * N] = [{ s: 'rock1', x: .5, y: .5, k: .5 }];
  }
  return { T, tile, pass, props, bases, outs, fields };
}

/* ---------------------------------------------------------------- terrängbitar */
const CW = 512, CP = 3; let SC = 1.25; const CH = new Map(); const CMAX = 46;
const corners4 = (i, j, e) => { const [x, y] = P(i, j, e); return [[x, y], [x + HW, y + HH], [x, y + TH], [x - HW, y + HH]]; };
function poly(c, p, fill, stroke, lw) { c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (let k = 1; k < p.length; k++) c.lineTo(p[k][0], p[k][1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); } }
function lg(c, x0, y0, x1, y1, a, b) { const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
const Et = (i, j) => { const t = TL.tile(i, j); return t ? t.e : 0; };
function topCol(t, i, j) {
  const v = t.v, occ = (Et(i - 1, j) > t.e ? 1 : 0) + (Et(i, j - 1) > t.e ? 1 : 0);
  switch (t.t) {
    case 'w': return `hsl(${197 + v * 6},58%,${24 + t.n * 58}%)`;
    case 's': return `hsl(${42 + v * 5},48%,${68 + v * 5 - occ * 6}%)`;
    case 'g': return `hsl(${92 + v * 12},${36 + v * 8}%,${42 + v * 5 + (t.e - 1) * 3 - occ * 7}%)`;
    case 'f': return `hsl(${110 + v * 10},32%,${32 + v * 4 - occ * 6}%)`;
    default: if (t.e >= 6) return `hsl(${208 + v * 8},${18 + v * 6}%,${88 + v * 4 - occ * 5}%)`; return `hsl(${30 + v * 12},${7 + v * 4}%,${50 + (t.e - 3) * 4 + v * 6 - occ * 7}%)`;
  }
}
function drawTile(g, i, j) {
  const t = TL.tile(i, j), c4 = corners4(i, j, t.e), [tp, r, b, l] = c4;
  const dl = t.e * EL + (j === N - 1 ? 46 : 0), dr = t.e * EL + (i === N - 1 ? 46 : 0);
  const lc = t.t === 'r' ? ['#86827a', '#55524d'] : t.t === 'w' ? ['#2f7b93', '#173b4a'] : ['#8f6f48', '#4a3725'];
  const rc = t.t === 'r' ? ['#6a6761', '#43413d'] : t.t === 'w' ? ['#25637a', '#12303c'] : ['#735739', '#3b2c1d'];
  if (dl > 0) poly(g, [l, b, [b[0], b[1] + dl], [l[0], l[1] + dl]], lg(g, 0, l[1], 0, l[1] + dl, lc[0], lc[1]));
  if (dr > 0) poly(g, [b, r, [r[0], r[1] + dr], [b[0], b[1] + dr]], lg(g, 0, r[1], 0, r[1] + dr, rc[0], rc[1]));
  if ((t.t === 'g' || t.t === 'f') && (dl > 0 || dr > 0)) { if (dl > 0) poly(g, [l, b, [b[0], b[1] + 3], [l[0], l[1] + 3]], 'rgba(56,94,38,.95)'); if (dr > 0) poly(g, [b, r, [r[0], r[1] + 3], [b[0], b[1] + 3]], 'rgba(44,76,30,.95)'); }
  if (t.t === 'r' && (dl > 0 || dr > 0)) { g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 1; for (let s = 6; s < Math.max(dl, dr); s += 7) { g.beginPath(); g.moveTo(l[0], l[1] + Math.min(s, dl)); g.lineTo(b[0], b[1] + s); g.lineTo(r[0], r[1] + Math.min(s, dr)); g.stroke(); } }
  poly(g, c4, topCol(t, i, j));
  const rr = rng(i * 131 + j * 977 + 11), [x, y] = tp;
  if (t.t === 'g' || t.t === 'f') {
    g.strokeStyle = t.t === 'g' ? 'rgba(28,66,18,.28)' : 'rgba(8,36,8,.32)'; g.lineWidth = 1;
    for (let k = 0; k < 6; k++) { const u = rr(), v = rr(), px = x + (u - v) * HW, py = y + (u + v) * HH; g.beginPath(); g.moveTo(px, py); g.lineTo(px + (rr() - .5) * 2.4, py - 3.2); g.stroke(); }
    g.fillStyle = 'rgba(255,255,215,.12)'; for (let k = 0; k < 3; k++) { const u = rr(), v = rr(); g.fillRect(x + (u - v) * HW, y + (u + v) * HH, 1.6, 1.6); }
  }
  if (t.t === 's') { g.fillStyle = 'rgba(120,90,40,.25)'; for (let k = 0; k < 7; k++) { const u = rr(), v = rr(); g.fillRect(x + (u - v) * HW, y + (u + v) * HH, 1.3, 1.3); } }
  if (t.t === 'w') {
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; for (let k = 0; k < 2; k++) { const u = rr(), v = rr(), px = x + (u - v) * HW * .7, py = y + HH + (u + v - 1) * HH * .7; g.beginPath(); g.moveTo(px - 6, py); g.quadraticCurveTo(px, py - 2.5, px + 6, py); g.stroke(); }
    g.strokeStyle = 'rgba(232,250,255,.6)'; g.lineWidth = 2.2;
    for (const [a, cc, p1, p2] of [[i - 1, j, c4[0], c4[3]], [i, j - 1, c4[0], c4[1]], [i + 1, j, c4[1], c4[2]], [i, j + 1, c4[2], c4[3]]]) { const q = TL.tile(a, cc); if (q && q.t !== 'w') { g.beginPath(); g.moveTo(p1[0], p1[1]); g.lineTo(p2[0], p2[1]); g.stroke(); } }
  } else { g.strokeStyle = 'rgba(0,0,0,.05)'; g.lineWidth = 1; g.beginPath(); g.moveTo(...tp); g.lineTo(...r); g.lineTo(...b); g.lineTo(...l); g.closePath(); g.stroke(); }
}
function renderChunk(kx, ky) {
  const x0 = kx * CW - CP, y0 = ky * CW - CP, w = CW + CP * 2;
  const cv = document.createElement('canvas'); cv.width = Math.ceil(w * SC); cv.height = Math.ceil(w * SC);
  const g = cv.getContext('2d'); g.setTransform(SC, 0, 0, SC, -x0 * SC, -y0 * SC);
  const sMin = Math.max(0, Math.floor((y0 - 180 - OY) / HH)), sMax = Math.min(2 * N - 2, Math.ceil((y0 + w + 240 - OY) / HH));
  const dMin = Math.floor((x0 - 160 - OX) / HW), dMax = Math.ceil((x0 + w + 120 - OX) / HW);
  for (let s = sMin; s <= sMax; s++) {
    const i0 = Math.max(0, s - N + 1, Math.ceil((s + dMin) / 2)), i1 = Math.min(N - 1, s, Math.floor((s + dMax) / 2)); if (i0 > i1) continue;
    for (let i = i0; i <= i1; i++) drawTile(g, i, s - i);
    for (let i = i0; i <= i1; i++) { const pr = TL.props[i + (s - i) * N]; if (!pr) continue; const t = TL.tile(i, s - i);
      for (const p of pr) { const [x, y] = P(i + p.x, s - i + p.y, t.e); drawSprite(g, p.s, null, 0, x, y, p.k); } }
  }
  return cv;
}
function getChunk(kx, ky, make) { const k = kx + ',' + ky; let c = CH.get(k); if (c) { CH.delete(k); CH.set(k, c); return c; } if (!make) return null; c = renderChunk(kx, ky); CH.set(k, c); while (CH.size > CMAX) CH.delete(CH.keys().next().value); return c; }

/* ---------------------------------------------------------------- nytt spel */
let nextId = 1;
function newGame(opts) {
  const seed = opts.seed || (Math.random() * 1e9) | 0;
  TL = mapGen(seed, opts.size, opts.enemies); CH.clear();
  G = {
    v: 1, seed, opts, time: 0, speed: 1, over: null,
    teams: [], units: [], blds: [], outs: [], fields: TL.fields.map(f => ({ ...f })),
    explored: new Uint8Array(N * N), msgs: [], stats: { built: 0, trained: 0, lost: 0, killed: 0 },
  };
  for (let k = 0; k <= opts.enemies; k++) {
    G.teams.push({ id: k, ore: 400, recruits: k === ME ? 10 : 10, recT: 0, res: { inf: 0, veh: 0, air: 0 }, rsch: null, alive: true, ai: k !== ME ? { next: 2 + k, wave: 0, attackAt: opts.peace * 60 + DIFF[opts.diff].first, buildIdx: 0, lastAlarm: -99 } : null });
  }
  TL.bases.slice(0, opts.enemies + 1).forEach(([x, y], k) => {
    const i = Math.floor(x) - 1, j = Math.floor(y) - 1;
    addBuilding('hq', k, i, j, 1);
  });
  TL.outs.forEach(([x, y], k) => G.outs.push({ id: nextId++, i: Math.floor(x), j: Math.floor(y), owner: -1, cap: 0, capT: -1 }));
  afterLoad();
}
function afterLoad() {
  buildOcc(); recomputeTerritory(); computeFog(true);
  const hq = G.blds.find(b => b.t === 'hq' && b.team === ME);
  if (hq) { const [x, y] = P(hq.i + 1.5, hq.j + 1.5, 1); cam = [x + 60, y - 10]; }
  zoom = innerWidth < 760 ? .75 : 1.0; clampCam();
  buildMiniBase(); refreshBuildBar(); selU = []; selB = null; mode = null; updateCtx();
}

/* ---------------------------------------------------------------- entiteter */
function addBuilding(t, team, i, j, prog) {
  const d = BT[t];
  const b = { id: nextId++, t, team, i, j, F: d.F, hp: d.hp * (prog >= 1 ? 1 : .1), mhp: d.hp, prog: prog || 0, q: [], qt: 0, rally: null, cd: 0, tgt: 0, hitT: -99 };
  G.blds.push(b); return b;
}
function addUnit(t, team, x, y) {
  const d = UT[t], lvl = G.teams[team].res[d.cls] || 0;
  const u = { id: nextId++, t, team, x, y, hp: d.hp * (1 + .2 * lvl), mhp: d.hp * (1 + .2 * lvl), dir: 1, path: null, order: 'idle', tgt: 0, dest: null, cd: Math.random(), ez: Et(Math.floor(x), Math.floor(y)), carry: 0, fld: -1, gs: 0, gt: 0, acq: Math.random() * .5, hitT: -99, rp: 0 };
  G.units.push(u); return u;
}
const byId = new Map();
function reindex() { byId.clear(); for (const u of G.units) byId.set(u.id, u); for (const b of G.blds) byId.set(b.id, b); }
const isB = e => e && e.F !== undefined;
const cx = e => isB(e) ? e.i + e.F / 2 : e.x;
const cy = e => isB(e) ? e.j + e.F / 2 : e.y;

/* ---------------------------------------------------------------- beläggning, territorium, dimma */
let OCC = null;      // 0 fritt, annars byggnads-id
function buildOcc() {
  OCC = new Int32Array(N * N);
  for (const b of G.blds) for (let a = 0; a < b.F; a++) for (let c = 0; c < b.F; c++) OCC[b.i + a + (b.j + c) * N] = b.id;
  for (const o of G.outs) OCC[o.i + o.j * N] = -1;
  for (const f of G.fields) if (f.amt > 0) OCC[f.i + f.j * N] = -2;
}
let TER = null, TERD = null, TERLIST = [], TERSEG = [];
function recomputeTerritory() {
  TER = new Int8Array(N * N).fill(-1); TERD = new Float32Array(N * N).fill(1e9);
  const src = [];
  for (const b of G.blds) src.push([b.i + b.F / 2, b.j + b.F / 2, BT[b.t].terr, b.team]);
  for (const o of G.outs) if (o.owner >= 0) src.push([o.i + .5, o.j + .5, 3.6, o.owner]);
  for (const [x, y, r, tm] of src) {
    for (let j = Math.max(0, Math.floor(y - r)); j <= Math.min(N - 1, Math.floor(y + r)); j++) for (let i = Math.max(0, Math.floor(x - r)); i <= Math.min(N - 1, Math.floor(x + r)); i++) {
      const d = dist(i + .5, j + .5, x, y), k = i + j * N; if (d > r) continue; const t = TL.T[k]; if (t.t === 'w') continue;
      if (d < TERD[k]) { TERD[k] = d; TER[k] = tm; }
    }
  }
  TERLIST = []; TERSEG = G.teams.map(() => []);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const k = i + j * N, o = TER[k]; if (o < 0) continue; TERLIST.push(k);
    const c4 = corners4(i, j, TL.T[k].e);
    for (const [a, b, p1, p2] of [[i - 1, j, c4[0], c4[3]], [i, j - 1, c4[0], c4[1]], [i + 1, j, c4[1], c4[2]], [i, j + 1, c4[2], c4[3]]]) {
      const ok = a >= 0 && b >= 0 && a < N && b < N ? TER[a + b * N] : -1; if (ok !== o) TERSEG[o].push(p1[0], p1[1], p2[0], p2[1], k);
    }
  }
  miniDirty = true;
}
const CIRC = {};
function circle(r) { const k = Math.round(r * 2) / 2; if (CIRC[k]) return CIRC[k]; const a = []; const R = Math.ceil(k); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= k * k) a.push(dx, dy); return CIRC[k] = a; }
let VIS = null;
function computeFog(all) {
  if (!VIS) VIS = [];
  for (let t = 0; t < G.teams.length; t++) {
    if (!all && t !== ME && (G.time * 10 | 0) % 2) continue;
    const v = VIS[t] = (VIS[t] && VIS[t].length === N * N) ? VIS[t].fill(0) : new Uint8Array(N * N);
    const stamp = (x, y, r) => { const c = circle(r), i0 = Math.floor(x), j0 = Math.floor(y); for (let k = 0; k < c.length; k += 2) { const i = i0 + c[k], j = j0 + c[k + 1]; if (i >= 0 && j >= 0 && i < N && j < N) v[i + j * N] = 1; } };
    for (const u of G.units) if (u.team === t) stamp(u.x, u.y, UT[u.t].sight);
    for (const b of G.blds) if (b.team === t) stamp(b.i + b.F / 2, b.j + b.F / 2, BT[b.t].sight * (b.prog >= 1 ? 1 : .6));
    for (const o of G.outs) if (o.owner === t) stamp(o.i + .5, o.j + .5, 4);
    if (t === ME) for (let k = 0; k < v.length; k++) if (v[k]) G.explored[k] = 1;
  }
  fogDirty = true;
}
const visible = (team, x, y) => { const i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < N && j < N && VIS[team][i + j * N] === 1; };

/* ---------------------------------------------------------------- vägsökning */
function passableTile(i, j, ignoreId) {
  if (i < 0 || j < 0 || i >= N || j >= N) return false;
  const t = TL.T[i + j * N]; if (t.t === 'w' || t.t === 'r') return false;
  const o = OCC[i + j * N]; return o === 0 || o === -1 || (ignoreId && o === ignoreId);
}
function nearestFree(x, y) {
  const i0 = Math.floor(x), j0 = Math.floor(y); if (passableTile(i0, j0)) return [i0 + .5, j0 + .5];
  for (let r = 1; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (passableTile(i0 + dx, j0 + dy)) return [i0 + dx + .5, j0 + dy + .5]; }
  return [x, y];
}
const heap = { a: [], push(k, f) { const a = this.a; a.push([f, k]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break;[a[p], a[i]] = [a[i], a[p]]; i = p; } }, pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break;[a[m], a[i]] = [a[i], a[m]]; i = m; } } return top[1]; } };
let GS = null, GF = null, GP = null, GSTAMP = null, gstamp = 0;
function findPath(sx, sy, tx, ty) {
  if (!GS || GS.length !== N * N) { GS = new Float32Array(N * N); GP = new Int32Array(N * N); GSTAMP = new Int32Array(N * N); GF = new Uint8Array(N * N); }
  gstamp++;
  const si = clamp(Math.floor(sx), 0, N - 1), sj = clamp(Math.floor(sy), 0, N - 1);
  let [fx, fy] = passableTile(Math.floor(tx), Math.floor(ty)) ? [tx, ty] : nearestFree(tx, ty);
  const ti = Math.floor(fx), tj = Math.floor(fy), goal = ti + tj * N, start = si + sj * N;
  heap.a.length = 0; GSTAMP[start] = gstamp; GS[start] = 0; GP[start] = -1; GF[start] = 0; heap.push(start, 0);
  let best = start, bestH = 1e9, it = 0;
  while (heap.a.length && it++ < 9000) {
    const k = heap.pop(); if (GF[k] === 2 && GSTAMP[k] === gstamp) continue; GF[k] = 2;
    if (k === goal) { best = k; break; }
    const i = k % N, j = (k / N) | 0; const h = Math.hypot(i - ti, j - tj); if (h < bestH) { bestH = h; best = k; }
    for (let d = 0; d < 8; d++) {
      const di = [1, -1, 0, 0, 1, 1, -1, -1][d], dj = [0, 0, 1, -1, 1, -1, 1, -1][d], ni = i + di, nj = j + dj;
      if (!passableTile(ni, nj)) continue; if (di && dj && (!passableTile(i + di, j) || !passableTile(i, j + dj))) continue;
      const nk = ni + nj * N, t = TL.T[nk];
      const cost = GS[k] + (di && dj ? 1.414 : 1) * (t.t === 'f' ? 1.3 : 1) + Math.abs(t.e - TL.T[k].e) * .2;
      if (GSTAMP[nk] === gstamp && (GF[nk] === 2 || GS[nk] <= cost)) continue;
      GSTAMP[nk] = gstamp; GS[nk] = cost; GP[nk] = k; GF[nk] = 1; heap.push(nk, cost + Math.hypot(ni - ti, nj - tj));
    }
  }
  const pts = []; let k = best; while (k !== -1 && k !== start) { pts.push([k % N + .5, ((k / N) | 0) + .5]); k = GP[k]; }
  pts.reverse();
  // förenkla: hoppa över punkter med fri sikt
  const out = []; let cxp = sx, cyp = sy;
  for (let a = 0; a < pts.length; a++) { if (a < pts.length - 1 && lineFree(cxp, cyp, pts[a + 1][0], pts[a + 1][1])) continue; out.push(pts[a]); cxp = pts[a][0]; cyp = pts[a][1]; }
  if (best === goal) out.push([fx, fy]);
  return out;
}
function lineFree(x0, y0, x1, y1) { const n = Math.ceil(dist(x0, y0, x1, y1) * 3); for (let s = 1; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; if (!passableTile(Math.floor(x), Math.floor(y))) return false; } return true; }
let pathQ = [];
function orderMove(u, x, y, kind) {
  u.order = kind || 'move'; u.dest = [x, y]; u.tgt = kind === 'attack' ? u.tgt : 0; u.path = null;
  if (UT[u.t].alt) { u.path = [[x, y]]; return; }
  pathQ.push(u.id);
}
function processPaths() {
  let n = 0;
  while (pathQ.length && n < 10) {
    const u = byId.get(pathQ.shift()); if (!u || !u.dest) continue; n++;
    u.path = findPath(u.x, u.y, u.dest[0], u.dest[1]);
  }
}
function formation(units, x, y, kind) {
  const ground = units.filter(u => !UT[u.t].alt), air = units.filter(u => UT[u.t].alt);
  const spots = []; const i0 = Math.floor(x), j0 = Math.floor(y);
  for (let r = 0; spots.length < ground.length && r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; if (spots.length >= ground.length) break; if (passableTile(i0 + dx, j0 + dy)) spots.push([i0 + dx + .5, j0 + dy + .5]); }
  ground.sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y)).forEach((u, k) => { const s = spots[k] || [x, y]; orderMove(u, s[0] + (k === 0 ? x - i0 - .5 : 0), s[1] + (k === 0 ? y - j0 - .5 : 0), kind); });
  air.forEach((u, k) => { const a = k * 2.4, r = k ? .8 + k * .25 : 0; orderMove(u, x + Math.cos(a) * r, y + Math.sin(a) * r, kind); });
}

/* ---------------------------------------------------------------- spatial index */
let SPI = new Map();
function buildSpatial() { SPI.clear(); for (const u of G.units) { const k = (u.x | 0) + (u.y | 0) * 1000; let a = SPI.get(k); if (!a) SPI.set(k, a = []); a.push(u); } }
function unitsNear(x, y, r, fn) { const i0 = Math.floor(x - r), i1 = Math.floor(x + r), j0 = Math.floor(y - r), j1 = Math.floor(y + r); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const a = SPI.get(i + j * 1000); if (a) for (const u of a) fn(u); } }

/* ---------------------------------------------------------------- strid */
const projs = [], fx = [];
function canHit(vs, target) { return vs && (vs[CLS_OF(target.t)] || 0) > 0; }
function findTarget(team, x, y, r, vs, preferUnits) {
  let best = null, bd = 1e9;
  unitsNear(x, y, r, u => { if (u.team === team || !G.teams[u.team].alive) return; if (!canHit(vs, u)) return; if (!visible(team, u.x, u.y)) return; const d = dist(x, y, u.x, u.y) - (UT[u.t].dmg ? .5 : 0); if (d < r && d < bd) { bd = d; best = u; } });
  if (best && preferUnits) return best;
  if (vs && vs.bld > 0) for (const b of G.blds) { if (b.team === team) continue; const d = dist(x, y, b.i + b.F / 2, b.j + b.F / 2) - b.F / 2; if (d < r && d + 1.5 < bd && visible(team, b.i + b.F / 2, b.j + b.F / 2)) { bd = d + 1.5; best = b; } }
  return best;
}
function lvlMult(team, cls) { return 1 + .2 * (G.teams[team].res[cls] || 0); }
function fire(src, tgt, d, team) {
  const sx = cx(src), sy = cy(src), tx = cx(tgt), ty = cy(tgt);
  const sz = (UT[src.t] && UT[src.t].alt) || (isB(src) ? 22 : 10), tz = (UT[tgt.t] && UT[tgt.t].alt) || (isB(tgt) ? 18 : 8);
  const dd = dist(sx, sy, tx, ty), kind = d.proj || 'bullet';
  const spd = kind === 'bullet' ? 30 : kind === 'rail' ? 26 : kind === 'bolt' ? 18 : 9;
  const cls = isB(src) ? 'bld' : UT[src.t].cls;
  const dmg = d.dmg * (d.vs[CLS_OF(tgt.t)] || 0) * (cls === 'bld' ? 1 : lvlMult(team, cls));
  projs.push({ sx, sy, sz, tx, ty, tz, t: 0, dur: Math.max(.06, dd / spd), kind, tgt: tgt.id, dmg, team, src: src.id });
}
function damage(e, dmg, team, srcId) {
  if (!e || e.hp <= 0) return;
  e.hp -= dmg; e.hitT = G.time; e.lastAtk = team;
  if (!isB(e) && e.order === 'idle' && UT[e.t].dmg) { const s = byId.get(srcId); if (s && s.hp > 0 && canHit(UT[e.t].vs, s)) { e.tgt = s.id; e.order = 'attack'; } }
  if (e.team === ME && G.time - (G.alarmT || -99) > 20) { G.alarmT = G.time; toast(isB(e) ? 'Din bas är under attack!' : 'Dina trupper är under attack!', 'warn'); alarmPos = [cx(e), cy(e)]; }
  if (e.hp <= 0) kill(e, team);
}
let alarmPos = null;
function kill(e, by) {
  const big = isB(e) ? 1.6 + e.F * .4 : UT[e.t].cls === 'inf' ? .5 : 1;
  boom(cx(e), cy(e), (UT[e.t] && UT[e.t].alt) || (isB(e) ? 10 : 4), big);
  if (isB(e)) {
    G.blds.splice(G.blds.indexOf(e), 1); buildOcc(); recomputeTerritory();
    if (e.t === 'hq') eliminate(e.team, by);
    if (selB === e) { selB = null; updateCtx(); }
  } else {
    G.units.splice(G.units.indexOf(e), 1);
    const si = selU.indexOf(e); if (si >= 0) { selU.splice(si, 1); updateCtx(); }
  }
  if (e.team === ME) G.stats.lost++; else if (by === ME) G.stats.killed++;
  byId.delete(e.id);
}
function eliminate(team, by) {
  const tm = G.teams[team]; if (!tm.alive) return; tm.alive = false;
  for (const u of G.units.filter(u => u.team === team)) { u.hp = 0; boom(u.x, u.y, 4, .5); }
  G.units = G.units.filter(u => u.team !== team);
  for (const b of G.blds.filter(b => b.team === team)) boom(b.i + b.F / 2, b.j + b.F / 2, 10, 1.5);
  G.blds = G.blds.filter(b => b.team !== team);
  for (const o of G.outs) if (o.owner === team) o.owner = -1;
  buildOcc(); recomputeTerritory(); reindex();
  if (team === ME) { endGame(false); }
  else { toast(TEAMS[team].name + ' är besegrad!', 'good'); if (!G.teams.some(t => t.id !== ME && t.alive)) endGame(true); }
}
function boom(x, y, z, s) { fx.push({ k: 'boom', x, y, z, t: 0, dur: .9 * s + .3, s }); for (let n = 0; n < 8 * s; n++) fx.push({ k: 'spark', x, y, z, vx: (Math.random() - .5) * 3 * s, vy: (Math.random() - .5) * 3 * s, vz: 20 + Math.random() * 40 * s, t: 0, dur: .5 + Math.random() * .4 }); }

/* ---------------------------------------------------------------- simulering */
let fogDirty = true, miniDirty = true;
function step(dt) {
  G.time += dt;
  reindex(); buildSpatial(); processPaths();
  economy(dt); production(dt); outposts(dt);
  for (const u of G.units.slice()) if (u.hp > 0) unitStep(u, dt);
  for (const b of G.blds.slice()) if (b.hp > 0 && b.t === 'turret' && b.prog >= 1) turretStep(b, dt);
  separation(dt);
  for (let k = projs.length - 1; k >= 0; k--) { const p = projs[k]; p.t += dt; if (p.t >= p.dur) { projs.splice(k, 1); const e = byId.get(p.tgt); if (e && e.hp > 0) { damage(e, p.dmg, p.team, p.src); fx.push({ k: 'hit', x: p.tx, y: p.ty, z: p.tz, t: 0, dur: .3, kind: p.kind }); } } }
  for (let k = fx.length - 1; k >= 0; k--) { const f = fx[k]; f.t += dt; if (f.k === 'spark') { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 120 * dt; } if (f.t >= f.dur) fx.splice(k, 1); }
  for (const tm of G.teams) if (tm.ai && tm.alive) aiStep(tm, dt);
  G.fogT = (G.fogT || 0) - dt; if (G.fogT <= 0) { G.fogT = .25; computeFog(false); }
}
function energy(team) { let p = 0, u = 0; for (const b of G.blds) if (b.team === team && b.prog >= 1) { const e = BT[b.t].en; if (e > 0) p += e; else u -= e; } return [u, p]; }
function economy(dt) {
  for (const tm of G.teams) {
    if (!tm.alive) continue;
    tm.recT += dt; if (tm.recT >= 40) { tm.recT = 0; if (tm.recruits < 15) tm.recruits++; }
    let outs = 0; for (const o of G.outs) if (o.owner === tm.id) outs++;
    tm.ore += outs * 1.2 * dt * (tm.ai ? DIFF[G.opts.diff].inc : 1);
    if (tm.rsch) { const [u, p] = energy(tm.id); tm.rsch.t -= dt * (u > p ? .5 : 1); if (tm.rsch.t <= 0) { tm.res[tm.rsch.k]++; const cls = RS[tm.rsch.k].cls; for (const un of G.units) if (un.team === tm.id && UT[un.t].cls === cls) { un.mhp *= (1 + .2 * tm.res[tm.rsch.k]) / (1 + .2 * (tm.res[tm.rsch.k] - 1)); un.hp *= (1 + .2 * tm.res[tm.rsch.k]) / (1 + .2 * (tm.res[tm.rsch.k] - 1)); } if (tm.id === ME) { toast('Forskning klar: ' + RS[tm.rsch.k].n + ' nivå ' + tm.res[tm.rsch.k], 'good'); refreshBuildBar(); updateCtx(); } tm.rsch = null; } }
  }
}
function production(dt) {
  for (const b of G.blds) {
    const tm = G.teams[b.team];
    const [u, p] = energy(b.team), slow = u > p ? .5 : 1;
    if (b.prog < 1) { b.prog = Math.min(1, b.prog + dt / BT[b.t].time * (tm.ai ? DIFF[G.opts.diff].inc : 1)); b.hp = Math.min(b.mhp, b.hp + b.mhp * .9 * dt / BT[b.t].time); if (b.prog >= 1) { recomputeTerritory(); if (b.team === ME) { toast(BT[b.t].n + ' är färdigbyggd', 'good'); refreshBuildBar(); if (selB === b) updateCtx(); } } continue; }
    if (!b.q.length) continue;
    b.qt -= dt * slow; if (b.qt > 0) continue;
    const t = b.q.shift(); const d = UT[t];
    const [ex, ey] = nearestFree(b.i + b.F + .3, b.j + b.F + .3);
    const un = addUnit(t, b.team, ex, ey); G.stats.trained += b.team === ME ? 1 : 0;
    if (b.rally) { if (t === 'worker') autoGather(un); else orderMove(un, b.rally[0], b.rally[1], 'amove'); }
    else if (!d.alt) orderMove(un, ex + (Math.random() - .5) * 1.5 + .8, ey + (Math.random() - .5) * 1.5 + .8);
    if (b.q.length) b.qt = UT[b.q[0]].time;
    if (b.team === ME && selB === b) updateCtx();
  }
}
function outposts(dt) {
  for (const o of G.outs) {
    const present = new Set(); let scouts = 0;
    unitsNear(o.i + .5, o.j + .5, 2.2, u => { if (UT[u.t].alt || u.t === 'worker') return; if (dist(u.x, u.y, o.i + .5, o.j + .5) > 2.2) return; present.add(u.team); if (u.t === 'scout') scouts++; });
    if (present.size === 1) {
      const tm = [...present][0];
      if (tm !== o.owner) {
        if (o.capT !== tm) { o.capT = tm; o.cap = 0; }
        o.cap += dt / 8 * (scouts ? 2 : 1);
        if (o.cap >= 1) { const prev = o.owner; o.owner = tm; o.cap = 0; o.capT = -1; recomputeTerritory(); if (tm === ME) toast('Utpost erövrad!', 'good'); else if (prev === ME) toast('En utpost har gått förlorad', 'warn'); }
      } else { o.cap = Math.max(0, o.cap - dt / 8); }
    } else if (present.size === 0) { o.cap = Math.max(0, o.cap - dt / 16); if (o.cap === 0) o.capT = -1; }
  }
}
function depots(team) { const a = []; for (const b of G.blds) if (b.team === team && b.t === 'hq') a.push([b.i + 1.5, b.j + 1.5, 2.3]); for (const o of G.outs) if (o.owner === team) a.push([o.i + .5, o.j + .5, 1.3]); return a; }
function autoGather(u, fid) {
  let best = -1, bd = 1e9;
  if (fid != null && G.fields[fid] && G.fields[fid].amt > 0) best = fid;
  else G.fields.forEach((f, k) => { if (f.amt <= 0) return; let d = dist(u.x, u.y, f.i + .5, f.j + .5); const o = TER[f.i + f.j * N]; if (o !== u.team) d += o >= 0 ? 60 : 12; if (d < bd) { bd = d; best = k; } });
  if (best < 0) { u.order = 'idle'; return; }
  u.fld = best; u.gs = u.carry > 0 ? 2 : 0; u.order = 'gather';
  const f = G.fields[best]; const [x, y] = nearestFree(f.i + .5 + (u.x > f.i ? .7 : -.7), f.j + .5 + (u.y > f.j ? .7 : -.7));
  if (u.gs === 0) { u.dest = [x, y]; u.path = null; pathQ.push(u.id); } else returnOre(u);
}
function returnOre(u) {
  const ds = depots(u.team); if (!ds.length) { u.order = 'idle'; return; }
  let best = ds[0], bd = 1e9; for (const d of ds) { const dd = dist(u.x, u.y, d[0], d[1]); if (dd < bd) { bd = dd; best = d; } }
  u.gs = 2; u.dep = best; u.dest = nearestFree(best[0] + (u.x > best[0] ? best[2] * .7 : -best[2] * .7), best[1] + (u.y > best[1] ? best[2] * .7 : -best[2] * .7)); u.path = null; pathQ.push(u.id);
}
function moveAlong(u, dt) {
  const d = UT[u.t];
  if (!u.path || !u.path.length) return true;
  const [px, py] = u.path[0]; const dx = px - u.x, dy = py - u.y, L = Math.hypot(dx, dy);
  const t = TL.tile(Math.floor(u.x), Math.floor(u.y)); const sp = d.sp * (d.alt ? 1 : t && t.t === 'f' ? .8 : 1) * dt;
  if (L <= sp) { u.x = px; u.y = py; u.path.shift(); }
  else { u.x += dx / L * sp; u.y += dy / L * sp; setDir(u, dx, dy); }
  return !u.path.length;
}
function setDir(u, dx, dy) { const a = Math.atan2(-dy, dx); u.dir = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; }
function unitStep(u, dt) {
  const d = UT[u.t];
  u.ez += (Et(Math.floor(u.x), Math.floor(u.y)) - u.ez) * Math.min(1, dt * 6);
  u.cd -= dt;
  if (u.t === 'worker') return workerStep(u, dt);
  if (u.path === null && u.dest && !d.alt && pathQ.indexOf(u.id) < 0) pathQ.push(u.id);
  // målval
  u.acq -= dt;
  if (d.dmg && u.acq <= 0) {
    u.acq = .4;
    const cur = byId.get(u.tgt);
    const valid = cur && cur.hp > 0 && visible(u.team, cx(cur), cy(cur));
    if (!valid) u.tgt = 0;
    if ((u.order === 'idle' || u.order === 'amove' || (u.order === 'attack' && !valid))) {
      const rr = u.order === 'idle' ? d.sight : d.sight;
      const t = findTarget(u.team, u.x, u.y, rr, d.vs, true);
      if (t) { if (u.order !== 'attack') u.resume = u.order === 'amove' ? u.dest : null; u.tgt = t.id; u.order = 'attack'; u.path = null; u.rp = 0; }
      else if (u.order === 'attack') { if (u.resume) { orderMove(u, u.resume[0], u.resume[1], 'amove'); u.resume = null; } else { u.order = 'idle'; u.dest = null; u.path = null; } }
    }
  }
  if (u.order === 'attack') {
    const t = byId.get(u.tgt); if (!t || t.hp <= 0) { u.order = 'idle'; u.tgt = 0; return; }
    const tx = cx(t), ty = cy(t), dd = dist(u.x, u.y, tx, ty) - (isB(t) ? t.F / 2 : 0);
    if (dd <= d.rng) {
      u.path = null; setDir(u, tx - u.x, ty - u.y);
      if (u.cd <= 0) { u.cd = d.rate; fire(u, t, d, u.team); }
    } else {
      u.rp -= dt;
      if (d.alt) { u.path = [[tx, ty]]; }
      else if (u.rp <= 0 || !u.path) { u.rp = 1.2; u.dest = [tx, ty]; u.path = u.path || []; pathQ.push(u.id); }
      moveAlong(u, dt);
    }
    return;
  }
  if (u.order === 'move' || u.order === 'amove') {
    if (u.path && moveAlong(u, dt)) { u.order = 'idle'; u.path = null; u.dest = null; }
  }
  if (u.order === 'idle' && d.alt && u.t !== 'airship') { u.hov = (u.hov || 0) + dt; }
}
function workerStep(u, dt) {
  if (u.order === 'move') { if (u.path && moveAlong(u, dt)) { u.order = 'idle'; u.path = null; u.dest = null; u.idleT = 0; } return; }
  if (u.order === 'idle') { u.idleT = (u.idleT || 0) + dt; if (u.idleT > 1.5) { u.idleT = 0; autoGather(u); } return; }
  if (u.order !== 'gather') return;
  const f = G.fields[u.fld];
  if (u.gs === 0) { // gå till fältet
    if (!f || f.amt <= 0) { autoGather(u); return; }
    if (u.path === null) return;
    if (moveAlong(u, dt) || dist(u.x, u.y, f.i + .5, f.j + .5) < 1.25) { u.path = null; u.gs = 1; u.gt = 3.4; setDir(u, f.i + .5 - u.x, f.j + .5 - u.y); }
  } else if (u.gs === 1) { // bryt
    u.gt -= dt; if (u.gt <= 0) { if (!f || f.amt <= 0) { autoGather(u); return; } const a = Math.min(8, f.amt); f.amt -= a; u.carry = a; if (f.amt <= 0) { buildOcc(); } returnOre(u); }
  } else if (u.gs === 2) { // lämna
    if (u.path === null) return;
    const dep = u.dep;
    if (moveAlong(u, dt) || (dep && dist(u.x, u.y, dep[0], dep[1]) < dep[2] + .8)) {
      const tm = G.teams[u.team]; tm.ore += u.carry * (tm.ai ? DIFF[G.opts.diff].inc : 1);
      if (u.team === ME && u.carry) fx.push({ k: 'txt', x: u.x, y: u.y, z: 26, t: 0, dur: 1.2, s: '+' + u.carry });
      u.carry = 0; u.path = null; u.gs = 0;
      if (f && f.amt > 0) { u.dest = nearestFree(f.i + .5 + (u.x > f.i ? .7 : -.7), f.j + .5 + (u.y > f.j ? .7 : -.7)); pathQ.push(u.id); } else autoGather(u);
    }
  }
}
function turretStep(b, dt) {
  const d = BT[b.t]; const [u, p] = energy(b.team); b.cd -= dt * (u > p ? .6 : 1);
  const x = b.i + .5, y = b.j + .5;
  let t = byId.get(b.tgt); if (!t || t.hp <= 0 || dist(x, y, cx(t), cy(t)) > d.rng + .5 || !visible(b.team, cx(t), cy(t))) { t = findTarget(b.team, x, y, d.rng, d.vs, true); b.tgt = t ? t.id : 0; }
  if (t) { b.aim = Math.atan2(cy(t) - y, cx(t) - x); if (b.cd <= 0) { b.cd = d.rate; fire(b, t, d, b.team); } }
}
function separation(dt) {
  for (const u of G.units) {
    const air = !!UT[u.t].alt, R = air ? .9 : .42;
    unitsNear(u.x, u.y, 1, o => {
      if (o === u || !!UT[o.t].alt !== air) return;
      const dx = u.x - o.x, dy = u.y - o.y, d = Math.hypot(dx, dy);
      if (d < R && d > 1e-4) { const push = (R - d) * .5 * Math.min(1, dt * 8); const nx = u.x + dx / d * push, ny = u.y + dy / d * push; if (air || passableTile(Math.floor(nx), Math.floor(ny))) { u.x = nx; u.y = ny; } }
      else if (d <= 1e-4) { u.x += (Math.random() - .5) * .05; u.y += (Math.random() - .5) * .05; }
    });
    if (!air && !passableTile(Math.floor(u.x), Math.floor(u.y))) { const [fx_, fy_] = nearestFree(u.x, u.y); u.x += (fx_ - u.x) * Math.min(1, dt * 4); u.y += (fy_ - u.y) * Math.min(1, dt * 4); }
  }
}

/* ---------------------------------------------------------------- bygga */
function canPlace(team, t, i, j) {
  const F = BT[t].F; let e0 = null;
  for (let a = 0; a < F; a++) for (let c = 0; c < F; c++) {
    const ii = i + a, jj = j + c; if (ii < 0 || jj < 0 || ii >= N || jj >= N) return false;
    const k = ii + jj * N, tl = TL.T[k];
    if (tl.t === 'w' || tl.t === 'r') return false; if (OCC[k] !== 0) return false; if (TL.props[k]) return false;
    if (TER[k] !== team) return false;
    if (e0 === null) e0 = tl.e; else if (tl.e !== e0) return false;
    let blocked = false; unitsNear(ii + .5, jj + .5, .9, u => { if (!UT[u.t].alt && Math.floor(u.x) === ii && Math.floor(u.y) === jj) blocked = true; }); if (blocked) return false;
  }
  return true;
}
function hasBuilding(team, t, done) { return G.blds.some(b => b.team === team && b.t === t && (!done || b.prog >= 1)); }
function canAffordBuild(team, t) { const d = BT[t]; if (d.need && !hasBuilding(team, d.need, true)) return 'Kräver ' + BT[d.need].n.toLowerCase(); if (G.teams[team].ore < d.cost) return 'För lite malm'; return null; }
function placeBuilding(team, t, i, j) {
  if (!canPlace(team, t, i, j) || canAffordBuild(team, t)) return null;
  G.teams[team].ore -= BT[t].cost; const b = addBuilding(t, team, i, j, 0); buildOcc(); recomputeTerritory();
  // flytta bort enheter
  return b;
}
function canTrain(team, t) { const d = UT[t]; if (d.req && G.teams[team].res[d.req[0]] < d.req[1]) return 'Kräver forskning: ' + RS[d.req[0]].n + ' ' + d.req[1]; if (G.teams[team].ore < d.cost) return 'För lite malm'; return null; }
function queueUnit(b, t) { if (b.prog < 1 || b.q.length >= 5) return false; if (canTrain(b.team, t)) return false; G.teams[b.team].ore -= UT[t].cost; b.q.push(t); if (b.q.length === 1) b.qt = UT[t].time; return true; }
function startResearch(team, k) { const tm = G.teams[team], lv = tm.res[k]; if (tm.rsch || lv >= 3) return false; if (!hasBuilding(team, 'lab', true)) return false; const c = RS[k].cost[lv]; if (tm.ore < c) return false; tm.ore -= c; tm.rsch = { k, t: RS[k].time[lv], T: RS[k].time[lv] }; return true; }
function deployRecruit(team, role, x, y) { const tm = G.teams[team]; if (tm.recruits <= 0) return null; tm.recruits--; const u = addUnit(role, team, x, y); u.drop = 1; if (role === 'worker') u.idleT = 1; return u; }

/* ---------------------------------------------------------------- datormotståndare */
const AI_ORDER = ['power', 'barracks', 'power', 'factory', 'turret', 'lab', 'power', 'airfield', 'turret', 'power', 'barracks', 'radartower', 'power', 'factory', 'turret', 'power'];
function findSpot(team, t, near) {
  const F = BT[t].F, [x0, y0] = near;
  for (let r = 2; r < 12; r++) { const cands = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const i = Math.floor(x0 + dx), j = Math.floor(y0 + dy); if (canPlace(team, t, i, j) && spacingOk(i, j, F)) cands.push([i, j]); }
    if (cands.length) return cands[Math.floor(Math.random() * cands.length)]; }
  return null;
}
function spacingOk(i, j, F) { for (let a = -1; a <= F; a++) for (let c = -1; c <= F; c++) { const ii = i + a, jj = j + c; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; if (OCC[ii + jj * N] > 0) return false; } return true; }
function aiStep(tm, dt) {
  const A = tm.ai, D = DIFF[G.opts.diff]; A.next -= dt; if (A.next > 0) return; A.next = D.think;
  const me = tm.id, hq = G.blds.find(b => b.team === me && b.t === 'hq'); if (!hq) return;
  const H = [hq.i + 1.5, hq.j + 1.5];
  const my = G.units.filter(u => u.team === me);
  const workers = my.filter(u => u.t === 'worker'), scouts = my.filter(u => u.t === 'scout');
  const army = my.filter(u => UT[u.t].dmg && u.t !== 'scout');
  // rekryter
  while (tm.recruits > 0) { const role = workers.length < [7, 9, 11][G.opts.diff] || scouts.length >= 2 ? 'worker' : 'scout'; const [x, y] = nearestFree(H[0] + (Math.random() - .5) * 6, H[1] + (Math.random() - .5) * 6); const u = deployRecruit(me, role, x, y); if (role === 'worker') workers.push(u); else scouts.push(u); }
  if (tm.ore > 250 && workers.length < [8, 11, 14][G.opts.diff] && tm.recruits === 0) { tm.ore -= 75; tm.recruits++; }
  // bygg
  const building = G.blds.filter(b => b.team === me && b.prog < 1).length;
  const [eu, ep] = energy(me);
  let want = AI_ORDER[A.buildIdx % AI_ORDER.length]; if (A.buildIdx >= AI_ORDER.length) want = ['barracks', 'factory', 'turret', 'airfield', 'turret'][A.buildIdx % 5];
  if (eu + 6 > ep) want = 'power';
  if (building < (G.opts.diff === 2 ? 2 : 1) && !canAffordBuild(me, want)) {
    const near = want === 'turret' ? toward(H, 4 + Math.random() * 2) : H;
    const s = findSpot(me, want, near);
    if (s) { placeBuilding(me, want, s[0], s[1]); if (want === AI_ORDER[A.buildIdx % AI_ORDER.length] || A.buildIdx >= AI_ORDER.length) A.buildIdx++; }
    else A.buildIdx++;
  }
  // forskning
  if (!tm.rsch && hasBuilding(me, 'lab', true) && tm.ore > 450) { const ks = ['inf', 'veh', 'air'].filter(k => tm.res[k] < 3).sort((a, b) => tm.res[a] - tm.res[b]); if (ks.length) startResearch(me, ks[0]); }
  // träna
  const enemyAir = G.units.some(u => u.team !== me && UT[u.t].cls === 'air' && dist(u.x, u.y, H[0], H[1]) < 30);
  for (const b of G.blds) {
    if (b.team !== me || b.prog < 1 || !BT[b.t].trains || b.q.length >= 2) continue;
    let pick;
    if (b.t === 'barracks') pick = (tm.res.inf >= 1 && Math.random() < .4) ? 'rocket' : 'soldier';
    else if (b.t === 'factory') pick = enemyAir && Math.random() < .5 ? 'aa' : (!G.units.some(u => u.team === me && u.t === 'radar') && Math.random() < .15) ? 'radar' : Math.random() < .2 ? 'aa' : 'tank';
    else pick = tm.res.air >= 1 && Math.random() < .45 ? 'jet' : (!G.units.some(u => u.team === me && u.t === 'airship') && Math.random() < .15) ? 'airship' : 'heli';
    if (army.length >= [24, 34, 44][G.opts.diff]) continue;
    if (tm.ore - UT[pick].cost > (army.length > 6 ? 120 : 0)) { queueUnit(b, pick); b.rally = toward(H, 5); }
  }
  // utforska och erövra
  for (const s of scouts) {
    if (s.order !== 'idle') continue;
    const free = G.outs.filter(o => o.owner !== me && !G.units.some(u => u.team === me && u !== s && u.t === 'scout' && u.dest && dist(u.dest[0], u.dest[1], o.i + .5, o.j + .5) < 1.5));
    free.sort((a, b) => dist(a.i, a.j, s.x, s.y) - dist(b.i, b.j, s.x, s.y));
    if (free[0]) orderMove(s, free[0].i + .5, free[0].j + .5, 'move');
  }
  // försvar
  const hit = G.blds.find(b => b.team === me && G.time - b.hitT < 6) || (G.units.find(u => u.team === me && u.t === 'worker' && G.time - u.hitT < 4));
  if (hit && G.time - A.lastAlarm > 8) { A.lastAlarm = G.time; const idle = army.filter(u => u.order === 'idle' || dist(u.x, u.y, H[0], H[1]) < 20); formation(idle, cx(hit), cy(hit), 'amove'); return; }
  // anfall
  const ready = army.filter(u => u.order === 'idle');
  if (G.time >= A.attackAt && ready.length >= D.thr + A.wave * 2) {
    const foes = G.teams.filter(t => t.id !== me && t.alive);
    const targets = G.blds.filter(b => foes.some(f => f.id === b.team));
    targets.sort((a, b) => (dist(a.i, a.j, H[0], H[1]) - (a.team === ME ? 12 : 0)) - (dist(b.i, b.j, H[0], H[1]) - (b.team === ME ? 12 : 0)));
    const tg = targets[0] || G.outs.find(o => o.owner >= 0 && o.owner !== me);
    if (tg) { formation(ready, cx(tg) || tg.i + .5, cy(tg) || tg.j + .5, 'amove'); A.wave++; A.attackAt = G.time + D.wave; }
  }
  // samla trupper som står still långt bort
  for (const u of army) if (u.order === 'idle' && dist(u.x, u.y, H[0], H[1]) > 26 && Math.random() < .05) orderMove(u, ...toward(H, 5), 'amove');
}
function toward(H, d) { const vx = N / 2 - H[0], vy = N / 2 - H[1], L = Math.hypot(vx, vy) || 1; return [H[0] + vx / L * d, H[1] + vy / L * d]; }

/* ---------------------------------------------------------------- kamera & rendering */
const cv = $('c'), X = cv.getContext('2d');
let vw, vh, dpr, cam = [0, 0], zoom = 1;
function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); vw = innerWidth; vh = innerHeight; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); setupMini(); }
const clampZ = z => clamp(z, .35, 2.4);
function clampCam() { cam[0] = clamp(cam[0], PAD, WW - PAD); cam[1] = clamp(cam[1], OY - 80, WH - PAD); }
const toScreen = (x, y) => [(x - cam[0]) * zoom + vw / 2, (y - cam[1]) * zoom + vh / 2];
const toWorldPx = (sx, sy) => [cam[0] + (sx - vw / 2) / zoom, cam[1] + (sy - vh / 2) / zoom];
function pxToTile(px, py, e) { const a = (px - OX) / HW, b = (py - OY + e * EL) / HH; return [(a + b) / 2, (b - a) / 2]; }
function screenToTile(sx, sy) { const [px, py] = toWorldPx(sx, sy); let e = 1, x, y; for (let k = 0; k < 3; k++) { [x, y] = pxToTile(px, py, e); const t = TL.tile(Math.floor(x), Math.floor(y)); e = t ? t.e : 1; } return [x, y]; }

const fogC = document.createElement('canvas'), fogG = fogC.getContext('2d');
function updateFogCanvas() {
  if (fogC.width !== N) { fogC.width = N; fogC.height = N; }
  const id = fogG.createImageData(N, N), d = id.data, v = VIS[ME];
  for (let k = 0; k < N * N; k++) { d[k * 4] = 8; d[k * 4 + 1] = 13; d[k * 4 + 2] = 24; d[k * 4 + 3] = v[k] ? 0 : G.explored[k] ? 140 : 238; }
  fogG.putImageData(id, 0, 0); fogDirty = false;
}
function shadowEll(c, x, y, rx, ry, a) { c.fillStyle = `rgba(0,0,0,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill(); }
function hpBar(c, x, y, w, f, col, prog) { c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5); c.fillStyle = prog ? col : f > .55 ? (col || '#4ade80') : f > .28 ? '#facc15' : '#ef4444'; c.fillRect(x - w / 2, y, w * clamp(f, 0, 1), 3); }

function render(now) {
  const t = performance.now() / 1000, c = X;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const bg = c.createRadialGradient(vw / 2, vh / 2, 50, vw / 2, vh / 2, Math.max(vw, vh) * .8); bg.addColorStop(0, '#16253b'); bg.addColorStop(1, '#050910'); c.fillStyle = bg; c.fillRect(0, 0, vw, vh);
  if (!G) return;
  c.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (vw / 2 - cam[0] * zoom), dpr * (vh / 2 - cam[1] * zoom));
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const x0 = cam[0] - vw / 2 / zoom, y0 = cam[1] - vh / 2 / zoom, x1 = cam[0] + vw / 2 / zoom, y1 = cam[1] + vh / 2 / zoom;
  { let made = 0; const t0 = performance.now();
    for (let ky = Math.max(0, Math.floor(y0 / CW)); ky <= Math.min(Math.floor(WH / CW), Math.floor(y1 / CW)); ky++) for (let kx = Math.max(0, Math.floor(x0 / CW)); kx <= Math.min(Math.floor(WW / CW), Math.floor(x1 / CW)); kx++) {
      let ch = getChunk(kx, ky, false); if (!ch && (made < 1 || performance.now() - t0 < 12)) { ch = getChunk(kx, ky, true); made++; }
      if (ch) c.drawImage(ch, kx * CW - CP, ky * CW - CP, CW + CP * 2, CW + CP * 2);
    } }
  const inView = (px, py, m) => px > x0 - m && px < x1 + m && py > y0 - m && py < y1 + m * 1.6;
  const seen = k => G.explored[k] || (G.over);
  // territorium
  for (const k of TERLIST) { const i = k % N, j = (k / N) | 0; const [px, py] = P(i, j, TL.T[k].e); if (!inView(px, py, 40) || !seen(k)) continue; poly(c, corners4(i, j, TL.T[k].e), `rgba(${TEAMS[TER[k]].rgb},.13)`); }
  for (let tm = 0; tm < TERSEG.length; tm++) {
    const s = TERSEG[tm]; if (!s.length) continue; c.beginPath();
    for (let q = 0; q < s.length; q += 5) { if (!seen(s[q + 4])) continue; if (!inView(s[q], s[q + 1], 40)) continue; c.moveTo(s[q], s[q + 1]); c.lineTo(s[q + 2], s[q + 3]); }
    c.lineCap = 'round'; c.strokeStyle = `rgba(${TEAMS[tm].rgb},.25)`; c.lineWidth = 7; c.stroke(); c.strokeStyle = `rgba(${TEAMS[tm].rgb},.95)`; c.lineWidth = 2; c.stroke();
  }
  // byggplacering: rutnät
  if (mode && mode.k === 'build' && mode.at) drawGhost(c, t);
  if (mode && mode.k === 'drop') { for (const k of TERLIST) { if (TER[k] !== ME) continue; const i = k % N, j = (k / N) | 0; const [px, py] = P(i, j, TL.T[k].e); if (!inView(px, py, 40)) continue; if (!passableTile(i, j)) continue; poly(c, corners4(i, j, TL.T[k].e), `rgba(80,255,170,${.06 + .04 * Math.sin(t * 3)})`); } }
  // ritlista
  const L = [];
  for (const f of G.fields) { if (f.amt <= 0) continue; const k = f.i + f.j * N; if (!seen(k)) continue; const e = TL.T[k].e; const [px, py] = P(f.i + .5, f.j + .5, e); if (!inView(px, py, 80)) continue; L.push([f.i + f.j + 1, () => { c.save(); c.translate(px, py); c.scale(1, .5); const gr = c.createRadialGradient(0, 0, 2, 0, 0, 52); const hue = f.kind === 'crystal' ? '79,216,255' : '190,120,255'; gr.addColorStop(0, `rgba(${hue},${.35 + .1 * Math.sin(t * 2 + f.i)})`); gr.addColorStop(1, `rgba(${hue},0)`); c.fillStyle = gr; c.beginPath(); c.arc(0, 0, 52, 0, 7); c.fill(); c.restore(); drawSprite(c, f.kind, null, 0, px, py, .85 + .55 * f.amt / f.max); }]); }
  for (const o of G.outs) { const k = o.i + o.j * N; if (!seen(k)) continue; const [px, py] = P(o.i + .5, o.j + .5, TL.T[k].e); if (!inView(px, py, 100)) continue;
    L.push([o.i + o.j + 1, () => { drawSprite(c, 'outpost', o.owner >= 0 ? o.owner : null, 0, px, py); const beacon = o.owner >= 0 ? TEAMS[o.owner].c : '#ffffff'; c.save(); c.globalAlpha = .5 + .4 * Math.sin(t * 3 + o.i); c.fillStyle = beacon; c.beginPath(); c.arc(px, py - 52, 3.5, 0, 7); c.fill(); c.restore();
      if (o.cap > 0 && o.capT >= 0) { c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 5; c.beginPath(); c.arc(px, py - 10, 22, -Math.PI / 2, Math.PI * 1.5); c.stroke(); c.strokeStyle = TEAMS[o.capT].c; c.lineWidth = 3; c.beginPath(); c.arc(px, py - 10, 22, -Math.PI / 2, -Math.PI / 2 + o.cap * Math.PI * 2); c.stroke(); } }]); }
  for (const b of G.blds) {
    const k = b.i + b.j * N, own = b.team === ME;
    if (!own && !seen(k)) continue;
    const e = TL.T[k].e, [px, py] = P(b.i + b.F / 2, b.j + b.F / 2, e); if (!inView(px, py, 200)) continue;
    L.push([b.i + b.j + b.F * 2 - .5, () => drawBuilding(c, b, px, py, t)]);
  }
  const air = [];
  for (const u of G.units) {
    if (u.team !== ME && !visible(ME, u.x, u.y) && !G.over) continue;
    const [px, py] = P(u.x, u.y, u.ez); if (!inView(px, py, 140)) continue;
    if (UT[u.t].alt) { air.push(u); shadowEll(c, px + 10, py + 3, u.t === 'airship' ? 38 : 18, u.t === 'airship' ? 12 : 6, .18); continue; }
    L.push([u.x + u.y, () => drawUnit(c, u, px, py, t)]);
  }
  L.sort((a, b) => a[0] - b[0]); for (const l of L) l[1]();
  // projektiler och effekter på marken
  drawFx(c, t, false);
  // dimma
  if (fogDirty) updateFogCanvas();
  c.save(); c.transform(HW, HH, -HW, HH, OX, OY - EL); c.imageSmoothingEnabled = true; c.drawImage(fogC, 0, 0, N, N); c.restore();
  // luft
  air.sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(u => { const [px, py] = P(u.x, u.y, u.ez); drawUnit(c, u, px, py, t); });
  drawFx(c, t, true);
  // markör
  if (marker && t - marker.t < .8) { const q = (t - marker.t) / .8; const [px, py] = P(marker.x, marker.y, Et(Math.floor(marker.x), Math.floor(marker.y))); c.strokeStyle = marker.atk ? `rgba(255,90,90,${1 - q})` : `rgba(120,240,255,${1 - q})`; c.lineWidth = 2; c.beginPath(); c.ellipse(px, py, 8 + q * 16, 4 + q * 8, 0, 0, 7); c.stroke(); }
  // ruta för områdesval
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (boxSel) { c.fillStyle = 'rgba(79,216,255,.12)'; c.strokeStyle = 'rgba(79,216,255,.9)'; c.lineWidth = 1.5; const x = Math.min(boxSel[0], boxSel[2]), y = Math.min(boxSel[1], boxSel[3]); c.fillRect(x, y, Math.abs(boxSel[2] - boxSel[0]), Math.abs(boxSel[3] - boxSel[1])); c.strokeRect(x, y, Math.abs(boxSel[2] - boxSel[0]), Math.abs(boxSel[3] - boxSel[1])); }
}
function drawBuilding(c, b, px, py, t) {
  const a = AS[b.t]; const sel = selB === b;
  if (sel) { c.strokeStyle = 'rgba(79,216,255,.9)'; c.lineWidth = 2; c.setLineDash([7, 5]); c.lineDashOffset = -t * 18; poly(c, [P(b.i, b.j, Et(b.i, b.j)), P(b.i + b.F, b.j, Et(b.i, b.j)), P(b.i + b.F, b.j + b.F, Et(b.i, b.j)), P(b.i, b.j + b.F, Et(b.i, b.j))], null, 'rgba(79,216,255,.9)', 2); c.setLineDash([]); }
  if (b.prog < 1) {
    const s = SPR, r = a.res, top = py - a.ay * s, h = r * s, cut = top + h * (1 - b.prog * .85 - .15);
    drawSprite(c, b.t, b.team, 0, px, py, 1, .22);
    c.save(); c.beginPath(); c.rect(px - r * s / 2, cut, r * s, h); c.clip(); drawSprite(c, b.t, b.team, 0, px, py); c.restore();
    c.save(); c.strokeStyle = `rgba(120,240,255,${.6 + .3 * Math.sin(t * 8)})`; c.lineWidth = 1.5; c.shadowColor = '#4fd8ff'; c.shadowBlur = 8; c.beginPath(); c.moveTo(px - r * s * .38, cut); c.lineTo(px + r * s * .38, cut); c.stroke(); c.restore();
    hpBar(c, px, py - a.ay * SPR + 10, 46, b.prog, '#4fd8ff', 1);
  } else {
    drawSprite(c, b.t, b.team, 0, px, py);
    if (b.t === 'factory' || b.t === 'power') for (let k = 0; k < 5; k++) { const p = (t * .25 + k / 5) % 1; if (b.t === 'power') continue; c.fillStyle = `rgba(210,215,222,${.35 * (1 - p)})`; c.beginPath(); c.ellipse(px - 26 + p * 16, py - 70 - p * 40, 3 + p * 9, 2 + p * 6, 0, 0, 7); c.fill(); }
    if (b.t === 'power') { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = `rgba(80,200,255,${.12 + .1 * Math.sin(t * 2.5)})`; c.beginPath(); c.arc(px, py - 42, 22, 0, 7); c.fill(); c.restore(); }
    if (b.t === 'radartower') { const ang = t * 1.2; c.save(); c.translate(px, py); c.scale(1, .5); const gr = c.createRadialGradient(0, 0, 0, 0, 0, 260); gr.addColorStop(0, 'rgba(79,216,255,.18)'); gr.addColorStop(1, 'rgba(79,216,255,0)'); c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 260, ang - .6, ang); c.closePath(); c.fill(); c.restore(); }
    if (b.q.length) { const f = 1 - b.qt / UT[b.q[0]].time; hpBar(c, px, py + 10, 40, f, '#4fd8ff', 1); }
  }
  if ((b.hp < b.mhp * .999 && b.prog >= 1) || sel) hpBar(c, px, py - a.ay * SPR + 2, Math.min(70, 20 + b.F * 16), b.hp / b.mhp);
  if (b.hp < b.mhp * .5 && b.prog >= 1) for (let k = 0; k < 3; k++) { const p = (t * .5 + k / 3) % 1; c.fillStyle = `rgba(40,40,45,${.5 * (1 - p)})`; c.beginPath(); c.arc(px + (k - 1) * 10, py - 30 - p * 50, 4 + p * 10, 0, 7); c.fill(); }
  if (sel && b.rally) { const [rx, ry] = P(b.rally[0], b.rally[1], Et(Math.floor(b.rally[0]), Math.floor(b.rally[1]))); c.strokeStyle = 'rgba(79,216,255,.6)'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(px, py); c.lineTo(rx, ry); c.stroke(); c.setLineDash([]); c.fillStyle = '#4fd8ff'; c.beginPath(); c.arc(rx, ry, 4, 0, 7); c.fill(); }
}
function drawUnit(c, u, px, py, t) {
  const d = UT[u.t], alt = d.alt || 0, sel = selU.indexOf(u) >= 0;
  let y = py - alt;
  if (alt) y += Math.sin(t * 2 + u.id) * 3;
  if (u.drop > 0) { u.drop = Math.max(0, u.drop - .02); y -= u.drop * 220; c.save(); c.globalAlpha = u.drop; c.strokeStyle = '#8ff0ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(px, y - 40); c.lineTo(px, y); c.stroke(); c.restore(); }
  if (!alt) shadowEll(c, px + 2, py + 1, d.cls === 'inf' ? 6 : 16, d.cls === 'inf' ? 3 : 7, .22);
  if (sel) { c.strokeStyle = u.team === ME ? 'rgba(79,216,255,.95)' : 'rgba(255,90,90,.9)'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(px, py, d.cls === 'inf' ? 9 : 20, d.cls === 'inf' ? 4.5 : 10, 0, 0, 7); c.stroke(); }
  drawSprite(c, u.t, u.team, u.dir, px, y);
  if (u.t === 'heli') { c.save(); c.globalAlpha = .18; c.fillStyle = '#cfe9ff'; for (const s of [-1, 1]) { const ang = (u.dir * Math.PI / 4); c.beginPath(); c.ellipse(px + Math.cos(ang + s * Math.PI / 2) * 18, y + Math.sin(ang + s * Math.PI / 2) * 9 - 2, 11, 5.5, 0, 0, 7); c.fill(); } c.restore(); }
  if (u.t === 'worker' && u.carry) { c.fillStyle = '#8ff0ff'; c.beginPath(); c.moveTo(px - 6, y - 26); c.lineTo(px - 3, y - 31); c.lineTo(px, y - 26); c.lineTo(px - 3, y - 22); c.fill(); }
  if (u.t === 'worker' && u.order === 'gather' && u.gs === 1 && Math.sin(t * 25 + u.id) > .5) { c.fillStyle = '#c8f6ff'; c.beginPath(); c.arc(px + 10, y - 8, 1.8, 0, 7); c.fill(); }
  if (u.hp < u.mhp * .999 || sel) hpBar(c, px, y - (d.cls === 'inf' ? 34 : d.cls === 'air' ? 30 : 34), d.cls === 'inf' ? 16 : 28, u.hp / u.mhp, u.team === ME ? null : '#f87171');
}
function drawGhost(c, t) {
  const [i, j] = mode.at, bt = mode.t, F = BT[bt].F, ok = canPlace(ME, bt, i, j) && !canAffordBuild(ME, bt);
  for (let a = 0; a < F; a++) for (let b = 0; b < F; b++) { const ii = i + a, jj = j + b; if (!TL.tile(ii, jj)) continue; poly(c, corners4(ii, jj, Et(ii, jj)), ok ? 'rgba(80,255,170,.22)' : 'rgba(255,80,80,.25)', ok ? 'rgba(120,255,190,.8)' : 'rgba(255,110,110,.8)', 1.2); }
  const e = Et(i, j), [px, py] = P(i + F / 2, j + F / 2, e);
  drawSprite(c, bt, ME, 0, px, py, 1, .45 + .15 * Math.sin(t * 4));
}
function drawFx(c, t, airPass) {
  for (const p of projs) {
    const air = p.sz > 40 || p.tz > 40; if (air !== airPass) continue;
    const q = p.t / p.dur, x = p.sx + (p.tx - p.sx) * q, y = p.sy + (p.ty - p.sy) * q, z = p.sz + (p.tz - p.sz) * q + (p.kind === 'missile' ? Math.sin(q * Math.PI) * 20 : 0);
    const [px, py] = P(x, y, Et(Math.floor(x), Math.floor(y))); const sy = py - z;
    const col = TEAMS[p.team].light;
    if (p.kind === 'bullet') { const q0 = Math.max(0, q - .25), xx = p.sx + (p.tx - p.sx) * q0, yy = p.sy + (p.ty - p.sy) * q0; const [qx, qy] = P(xx, yy, Et(Math.floor(xx), Math.floor(yy))); c.strokeStyle = '#fff5c2'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(qx, qy - (p.sz + (p.tz - p.sz) * q0)); c.lineTo(px, sy); c.stroke(); }
    else if (p.kind === 'rail' || p.kind === 'bolt') { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = p.kind === 'rail' ? '#8ff0ff' : col; c.lineWidth = p.kind === 'rail' ? 3 : 2; const q0 = Math.max(0, q - .35), xx = p.sx + (p.tx - p.sx) * q0, yy = p.sy + (p.ty - p.sy) * q0; const [qx, qy] = P(xx, yy, Et(Math.floor(xx), Math.floor(yy))); c.beginPath(); c.moveTo(qx, qy - (p.sz + (p.tz - p.sz) * q0)); c.lineTo(px, sy); c.stroke(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(px, sy, 2.4, 0, 7); c.fill(); c.restore(); }
    else { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,190,120,.9)'; c.beginPath(); c.arc(px, sy, 2.6, 0, 7); c.fill(); c.fillStyle = 'rgba(200,200,210,.35)'; for (let k = 1; k < 5; k++) { const qq = Math.max(0, q - k * .05), xx = p.sx + (p.tx - p.sx) * qq, yy = p.sy + (p.ty - p.sy) * qq; const [qx, qy] = P(xx, yy, Et(Math.floor(xx), Math.floor(yy))); c.beginPath(); c.arc(qx, qy - (p.sz + (p.tz - p.sz) * qq + Math.sin(qq * Math.PI) * 20), 2 + k * .6, 0, 7); c.fill(); } c.restore(); }
  }
  for (const f of fx) {
    const air = f.z > 40; if (air !== airPass) continue;
    if (!visible(ME, f.x, f.y) && !G.over) continue;
    const [px, py] = P(f.x, f.y, Et(Math.floor(f.x), Math.floor(f.y))); const y = py - f.z, q = f.t / f.dur;
    if (f.k === 'boom') { c.save(); c.globalCompositeOperation = 'lighter'; const r = (14 + 30 * q) * f.s; const gr = c.createRadialGradient(px, y, 0, px, y, r); gr.addColorStop(0, `rgba(255,240,200,${.9 * (1 - q)})`); gr.addColorStop(.4, `rgba(255,140,40,${.7 * (1 - q)})`); gr.addColorStop(1, 'rgba(255,60,0,0)'); c.fillStyle = gr; c.beginPath(); c.arc(px, y, r, 0, 7); c.fill(); c.restore(); c.fillStyle = `rgba(60,60,66,${.45 * (1 - q)})`; c.beginPath(); c.arc(px, y - q * 30 * f.s, (8 + 22 * q) * f.s, 0, 7); c.fill(); }
    else if (f.k === 'spark') { c.fillStyle = `rgba(255,200,120,${1 - q})`; c.fillRect(px - 1, y - 1, 2.4, 2.4); }
    else if (f.k === 'hit') { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = f.kind === 'rail' ? `rgba(140,240,255,${1 - q})` : `rgba(255,220,160,${1 - q})`; c.beginPath(); c.arc(px, y, 3 + q * 9, 0, 7); c.fill(); c.restore(); }
    else if (f.k === 'txt') { c.globalAlpha = 1 - q; c.font = '700 12px "Chakra Petch",sans-serif'; c.textAlign = 'center'; c.fillStyle = '#8ff0ff'; c.fillText(f.s, px, y - q * 18); c.globalAlpha = 1; }
  }
}

/* ---------------------------------------------------------------- minikarta */
const mmc = $('mmc'), M = mmc.getContext('2d'); let MW = 0, MH = 0, mk = 1, mpad = 0;
const mmBase = document.createElement('canvas'), mmTer = document.createElement('canvas');
function setupMini() { const r = mmc.getBoundingClientRect(); if (!r.width) return; MW = r.width; MH = r.height; const d = Math.min(2, window.devicePixelRatio || 1); mmc.width = MW * d; mmc.height = MH * d; M.setTransform(d, 0, 0, d, 0, 0); if (G) { mk = Math.min((MW - 8) / (2 * N), (MH - 8) / N); mpad = (MH - N * mk) / 2; } miniDirty = true; }
function buildMiniBase() {
  setupMini(); mmBase.width = N; mmBase.height = N; const g = mmBase.getContext('2d'); const id = g.createImageData(N, N);
  const col = { w: [42, 111, 142], s: [216, 196, 143], g: [111, 154, 82], f: [63, 107, 58], r: [141, 138, 132] };
  for (let k = 0; k < N * N; k++) { const t = TL.T[k]; const cc = t.t === 'r' && t.e >= 6 ? [220, 228, 236] : col[t.t]; id.data.set([...cc, 255], k * 4); }
  g.putImageData(id, 0, 0); mmTer.width = N; mmTer.height = N; miniDirty = true;
}
const mmP = (x, y) => [(x - y) * mk + MW / 2, (x + y) * mk / 2 + mpad];
function drawMini() {
  if (!G || !MW) return;
  if (miniDirty) { const g = mmTer.getContext('2d'); const id = g.createImageData(N, N); for (let k = 0; k < N * N; k++) { const o = TER[k]; if (o >= 0) id.data.set([...TEAMS[o].rgb, 150], k * 4); } g.putImageData(id, 0, 0); miniDirty = false; }
  M.setTransform(mmc.width / MW, 0, 0, mmc.height / MH, 0, 0); M.clearRect(0, 0, MW, MH);
  M.save(); M.transform(mk, mk / 2, -mk, mk / 2, MW / 2, mpad); M.imageSmoothingEnabled = false; M.drawImage(mmBase, 0, 0); M.drawImage(mmTer, 0, 0); M.imageSmoothingEnabled = true; M.drawImage(fogC, 0, 0); M.restore();
  for (const b of G.blds) { if (b.team !== ME && !G.explored[b.i + b.j * N]) continue; const [x, y] = mmP(b.i + b.F / 2, b.j + b.F / 2); M.fillStyle = TEAMS[b.team].light; M.fillRect(x - 2, y - 1.5, 4, 3); }
  for (const u of G.units) { if (u.team !== ME && !visible(ME, u.x, u.y)) continue; const [x, y] = mmP(u.x, u.y); M.fillStyle = u.team === ME ? '#bfe0ff' : TEAMS[u.team].light; M.fillRect(x - 1, y - 1, 2, 2); }
  for (const o of G.outs) { if (!G.explored[o.i + o.j * N]) continue; const [x, y] = mmP(o.i + .5, o.j + .5); M.strokeStyle = o.owner >= 0 ? TEAMS[o.owner].light : '#fff'; M.lineWidth = 1; M.strokeRect(x - 2, y - 2, 4, 4); }
  if (alarmPos && G.time - (G.alarmT || 0) < 6) { const [x, y] = mmP(...alarmPos); M.strokeStyle = `rgba(255,80,80,${.5 + .5 * Math.sin(performance.now() / 120)})`; M.lineWidth = 1.5; M.beginPath(); M.arc(x, y, 6, 0, 7); M.stroke(); }
  const q = [[0, 0], [vw, 0], [vw, vh], [0, vh]].map(([a, b]) => { const [px, py] = toWorldPx(a, b); return mmP(...pxToTile(px, py, 1)); });
  M.save(); M.beginPath(); M.rect(0, 0, MW, MH); M.clip(); poly(M, q, 'rgba(255,255,255,.06)', 'rgba(255,255,255,.85)', 1.2); M.restore();
}
function miniTo(e) { const r = mmc.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top; const a = (mx - MW / 2) / mk, b = (my - mpad) / (mk / 2); const p = P((a + b) / 2, (b - a) / 2, 1); cam = [p[0], p[1]]; clampCam(); }
let mmDown = false;
mmc.addEventListener('pointerdown', e => { if (!G) return; mmDown = true; mmc.setPointerCapture(e.pointerId); miniTo(e); e.stopPropagation(); });
mmc.addEventListener('pointermove', e => { if (mmDown) miniTo(e); });
mmc.addEventListener('pointerup', () => mmDown = false); mmc.addEventListener('pointercancel', () => mmDown = false);

/* ---------------------------------------------------------------- inmatning */
let selU = [], selB = null, mode = null, marker = null, boxSel = null, boxMode = false, atkMode = false;
const ptr = new Map(); let downInfo = null, lastTap = { t: 0, x: 0, y: 0 };
function zoomAt(sx, sy, f) { const w = toWorldPx(sx, sy); zoom = clampZ(zoom * f); cam = [w[0] - (sx - vw / 2) / zoom, w[1] - (sy - vh / 2) / zoom]; clampCam(); }
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('pointerdown', e => {
  if (!G || paused === 'menu') return; cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptr.size === 1) downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), drag: false, btn: e.button, box: boxMode || (e.shiftKey && e.pointerType === 'mouse') };
  else { downInfo && (downInfo.drag = true); boxSel = null; }
});
cv.addEventListener('pointermove', e => {
  if (!ptr.has(e.pointerId)) { if (G && mode && mode.k === 'build' && e.pointerType === 'mouse') { const [x, y] = screenToTile(e.clientX, e.clientY); mode.at = [Math.floor(x - BT[mode.t].F / 2 + .5), Math.floor(y - BT[mode.t].F / 2 + .5)]; updateCtx(); } return; }
  const prev = ptr.get(e.pointerId), cur = [e.clientX, e.clientY];
  if (ptr.size === 1) {
    if (downInfo && !downInfo.drag && Math.hypot(cur[0] - downInfo.x, cur[1] - downInfo.y) > 8) downInfo.drag = true;
    if (downInfo && downInfo.drag) { if (downInfo.box) boxSel = [downInfo.x, downInfo.y, cur[0], cur[1]]; else { cam[0] -= (cur[0] - prev[0]) / zoom; cam[1] -= (cur[1] - prev[1]) / zoom; clampCam(); } }
  } else {
    let oid = null; for (const k of ptr.keys()) if (k !== e.pointerId) { oid = k; break; } const o = ptr.get(oid);
    const d0 = Math.hypot(prev[0] - o[0], prev[1] - o[1]), d1 = Math.hypot(cur[0] - o[0], cur[1] - o[1]);
    const m0 = [(prev[0] + o[0]) / 2, (prev[1] + o[1]) / 2], m1 = [(cur[0] + o[0]) / 2, (cur[1] + o[1]) / 2];
    const w = toWorldPx(m0[0], m0[1]); if (d0 > 1) zoom = clampZ(zoom * d1 / d0); cam = [w[0] - (m1[0] - vw / 2) / zoom, w[1] - (m1[1] - vh / 2) / zoom]; clampCam();
  }
  ptr.set(e.pointerId, cur);
});
function endPtr(e) {
  if (!ptr.has(e.pointerId)) return; ptr.delete(e.pointerId);
  if (ptr.size === 0 && downInfo) {
    if (boxSel) { finishBox(); boxSel = null; }
    else if (!downInfo.drag && e.type === 'pointerup') { const now = performance.now(); const dbl = now - lastTap.t < 330 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24; lastTap = { t: dbl ? 0 : now, x: e.clientX, y: e.clientY }; tap(e.clientX, e.clientY, dbl, downInfo.btn === 2); }
    downInfo = null;
  }
}
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('wheel', e => { e.preventDefault(); if (G) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015))); }, { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());
function finishBox() {
  const [a, b, c2, d] = boxSel, x0 = Math.min(a, c2), x1 = Math.max(a, c2), y0 = Math.min(b, d), y1 = Math.max(b, d);
  const picked = G.units.filter(u => { if (u.team !== ME) return false; const [px, py] = P(u.x, u.y, u.ez); const [sx, sy] = toScreen(px, py - (UT[u.t].alt || 10)); return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; });
  const army = picked.filter(u => u.t !== 'worker'); selU = army.length ? army : picked; selB = null; if (boxMode) { boxMode = false; $('boxbtn').classList.remove('on'); } updateCtx();
}
function pickAt(sx, sy) {
  let best = null, bd = 1e9;
  for (const u of G.units) { if (u.team !== ME && !visible(ME, u.x, u.y)) continue; const d = UT[u.t]; const [px, py] = P(u.x, u.y, u.ez); const [ux, uy] = toScreen(px, py - (d.alt || 0) - (d.cls === 'inf' ? 12 : 10)); const r = Math.max(18, (d.cls === 'inf' ? 13 : 24) * zoom); const dd = Math.hypot(sx - ux, sy - uy); if (dd < r && dd < bd) { bd = dd; best = u; } }
  if (best) return best;
  const [x, y] = screenToTile(sx, sy); const i = Math.floor(x), j = Math.floor(y);
  for (const b of G.blds) { if (b.team !== ME && !G.explored[b.i + b.j * N]) continue; if (i >= b.i && i < b.i + b.F && j >= b.j && j < b.j + b.F) return b; }
  // träff på byggnadens bild (högt upp)
  for (const b of G.blds) { if (b.team !== ME && !G.explored[b.i + b.j * N]) continue; const [px, py] = P(b.i + b.F / 2, b.j + b.F / 2, Et(b.i, b.j)); const [bx, by] = toScreen(px, py); const w = b.F * HW * zoom, h = (AS[b.t].ay * SPR) * zoom; if (Math.abs(sx - bx) < w * .7 && sy < by && sy > by - h * .9) return b; }
  for (const o of G.outs) if (Math.abs(x - o.i - .5) < 1 && Math.abs(y - o.j - .5) < 1) return { out: o };
  for (let k = 0; k < G.fields.length; k++) { const f = G.fields[k]; if (f.amt > 0 && Math.abs(x - f.i - .5) < .9 && Math.abs(y - f.j - .5) < .9) return { field: k }; }
  return null;
}
function tap(sx, sy, dbl, right) {
  const [x, y] = screenToTile(sx, sy);
  if (mode && mode.k === 'build') {
    const at = [Math.floor(x - BT[mode.t].F / 2 + .5), Math.floor(y - BT[mode.t].F / 2 + .5)];
    if ((mode.at && at[0] === mode.at[0] && at[1] === mode.at[1]) || mode.mouse) { confirmBuild(at); } else { mode.at = at; updateCtx(); }
    return;
  }
  if (mode && mode.k === 'drop') {
    const i = Math.floor(x), j = Math.floor(y); if (i < 0 || j < 0 || i >= N || j >= N) return;
    if (TER[i + j * N] !== ME || !passableTile(i, j)) { toast('Rekryter kan bara landa inom ditt område', 'warn'); return; }
    const u = deployRecruit(ME, mode.role, x, y); if (u && mode.role === 'worker') autoGather(u);
    if (G.teams[ME].recruits <= 0) { mode = null; toast('Alla rekryter är utplacerade'); } updateCtx(); updateHud(); return;
  }
  if (mode && mode.k === 'rally') { if (selB) selB.rally = [x, y]; mode = null; marker = { x, y, t: performance.now() / 1000 }; updateCtx(); return; }
  const hit = pickAt(sx, sy);
  if (selU.length && (right || !(hit && !hit.out && !hit.field && hit.team === ME))) {
    if (hit && !hit.out && !hit.field && hit.team !== ME) { for (const u of selU) if (UT[u.t].dmg && canHit(UT[u.t].vs, hit)) { u.tgt = hit.id; u.order = 'attack'; u.path = null; u.resume = null; } marker = { x: cx(hit), y: cy(hit), t: performance.now() / 1000, atk: true }; return; }
    if (hit && hit.field != null) { const ws = selU.filter(u => u.t === 'worker'); ws.forEach(u => autoGather(u, hit.field)); formation(selU.filter(u => u.t !== 'worker'), x, y); marker = { x, y, t: performance.now() / 1000 }; return; }
    formation(selU, x, y, atkMode ? 'amove' : 'move'); for (const u of selU) if (u.t === 'worker') { u.order = 'move'; u.carry = u.carry; }
    marker = { x, y, t: performance.now() / 1000, atk: atkMode }; if (atkMode) { atkMode = false; updateCtx(); } return;
  }
  if (hit && !hit.out && !hit.field && hit.team === ME) {
    if (isB(hit)) { selB = hit; selU = []; }
    else if (dbl) { selU = G.units.filter(u => u.team === ME && u.t === hit.t && (() => { const [px, py] = P(u.x, u.y, u.ez); const [a, b] = toScreen(px, py); return a > 0 && b > 0 && a < vw && b < vh; })()); selB = null; }
    else { selU = [hit]; selB = null; }
    updateCtx(); return;
  }
  if (hit && !hit.out && !hit.field && hit.team !== ME) { toast(TEAMS[hit.team].name + ' ' + (isB(hit) ? BT[hit.t].n : UT[hit.t].n).toLowerCase()); return; }
  if (hit && hit.out) { toast(hit.out.owner >= 0 ? 'Utpost (' + TEAMS[hit.out.owner].name.toLowerCase() + ')' : 'Neutral utpost – ställ en enhet bredvid för att erövra den'); return; }
  if (selB) { selB = null; updateCtx(); }
}
addEventListener('keydown', e => {
  if (!G || e.target.tagName === 'INPUT') return; const s = 40 / zoom;
  if (e.key === 'ArrowLeft') cam[0] -= s; if (e.key === 'ArrowRight') cam[0] += s; if (e.key === 'ArrowUp') cam[1] -= s; if (e.key === 'ArrowDown') cam[1] += s;
  if (e.key === '+' || e.key === '=') zoomAt(vw / 2, vh / 2, 1.25); if (e.key === '-') zoomAt(vw / 2, vh / 2, .8);
  if (e.key === ' ') { e.preventDefault(); togglePause(); }
  if (e.key === 'Escape') { mode = null; selU = []; selB = null; updateCtx(); }
  if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(+e.key);
  if (e.key === 'a' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); selectGroup('army'); }
  clampCam();
});

/* ---------------------------------------------------------------- gränssnitt */
let paused = false;
function toast(msg, kind) { const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.textContent = msg; $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 2600); setTimeout(() => el.remove(), 3200); }
function fmtT(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); }
function updateHud() {
  if (!G) return; const tm = G.teams[ME], [u, p] = energy(ME);
  $('ore').textContent = Math.floor(tm.ore); $('en').textContent = u + '/' + p; $('en').parentElement.classList.toggle('bad', u > p);
  $('rec').textContent = tm.recruits; $('clock').textContent = fmtT(G.time);
}
const ICON = {};
function makeIcons() {
  for (const n of Object.keys(UT)) ICON[n] = thumb(n, ME, 1, 96);
  for (const n of Object.keys(BT)) ICON[n] = thumb(n, ME, 0, 96);
}
function refreshBuildBar() {
  const bar = $('buildlist'); bar.innerHTML = '';
  for (const t of BUILD_LIST) {
    const d = BT[t], why = G ? canAffordBuild(ME, t) : null;
    const b = document.createElement('button'); b.className = 'btn b' + (why ? ' dim' : ''); b.title = why || d.n;
    b.innerHTML = `<img src="${ICON[t]}" alt=""><span>${d.n}</span><span class="cost">${d.cost}</span>`;
    b.onclick = () => { if (why && why.startsWith('Kräver')) { toast(why); return; } mode = { k: 'build', t, at: null }; selU = []; selB = null; updateCtx(); toast('Tryck där du vill bygga ' + d.n.toLowerCase()); };
    bar.appendChild(b);
  }
}
function selectGroup(g) {
  const all = G.units.filter(u => u.team === ME);
  selU = g === 'army' ? all.filter(u => UT[u.t].dmg && u.t !== 'worker') : g === 'workers' ? all.filter(u => u.t === 'worker') : g === 'air' ? all.filter(u => UT[u.t].alt) : all.filter(u => UT[u.t].cls === g);
  selB = null; if (!selU.length) toast('Inga sådana enheter ännu'); updateCtx();
}
function updateCtx() {
  const ctx = $('ctx'), build = $('build');
  if (!G) return;
  let html = '';
  if (mode && mode.k === 'build') {
    const ok = mode.at && canPlace(ME, mode.t, ...mode.at) && !canAffordBuild(ME, mode.t);
    html = `<div class="row"><div class="ttl">${BT[mode.t].n} <span class="sub">${BT[mode.t].cost} malm</span></div></div><div class="hint">${mode.at ? (ok ? 'Tryck igen eller på Bygg för att placera' : 'Här går det inte att bygga – välj en grön plats i ditt område') : 'Tryck på kartan där du vill bygga'}</div><div class="acts"><button class="btn primary" id="cb" ${ok ? '' : 'disabled'}>Bygg här</button><button class="btn" id="cx">Avbryt</button></div>`;
  } else if (mode && mode.k === 'drop') {
    html = `<div class="row"><div class="ttl">Placera ${mode.role === 'worker' ? 'arbetare' : 'spanare'} <span class="sub">${G.teams[ME].recruits} rekryter kvar</span></div></div><div class="hint">Tryck inom ditt område där rekryten ska landa</div><div class="acts"><button class="btn ${mode.role === 'worker' ? 'on' : ''}" id="rw">Arbetare</button><button class="btn ${mode.role === 'scout' ? 'on' : ''}" id="rs">Spanare</button><button class="btn" id="cx">Klar</button></div>`;
  } else if (mode && mode.k === 'rally') {
    html = `<div class="hint">Tryck på kartan där nya enheter ska samlas</div><div class="acts"><button class="btn" id="cx">Avbryt</button></div>`;
  } else if (selB) {
    const b = selB, d = BT[b.t], tm = G.teams[ME];
    html = `<div class="row"><img class="pic" src="${ICON[b.t]}" alt=""><div class="ttl">${d.n}<div class="hpl"><i style="width:${b.hp / b.mhp * 100}%"></i></div><span class="sub">${b.prog < 1 ? 'Byggs ' + Math.floor(b.prog * 100) + ' %' : Math.ceil(b.hp) + ' / ' + b.mhp}</span></div><button class="btn x" id="cx" aria-label="Stäng">×</button></div>`;
    if (b.prog >= 1 && d.trains) {
      html += '<div class="trains">' + d.trains.map(t => { const why = canTrain(ME, t), cnt = b.q.filter(q => q === t).length; return `<button class="btn tr ${why ? 'dim' : ''}" data-t="${t}" title="${why || ''}"><img src="${ICON[t]}" alt=""><span>${UT[t].n}</span><span class="cost">${UT[t].cost}</span>${cnt ? `<b class="badge">${cnt}</b>` : ''}</button>`; }).join('') + '</div>';
      html += `<div class="acts"><button class="btn" id="rally">Samlingspunkt</button>${b.q.length ? '<button class="btn" id="cq">Avbryt kö</button>' : ''}</div>`;
    }
    if (b.prog >= 1 && b.t === 'lab') {
      html += '<div class="trains">' + Object.keys(RS).map(k => { const lv = tm.res[k], r = RS[k]; const busy = tm.rsch && tm.rsch.k === k; const done = lv >= 3; const cost = done ? '' : r.cost[lv]; const dim = done || (tm.rsch && !busy) || tm.ore < cost; return `<button class="btn tr ${dim ? 'dim' : ''} ${busy ? 'on' : ''}" data-r="${k}"><span class="lvl">${'◆'.repeat(lv)}${'◇'.repeat(3 - lv)}</span><span>${r.n}</span><span class="cost">${busy ? Math.ceil(tm.rsch.t) + ' s' : done ? 'Klar' : cost}</span></button>`; }).join('') + '</div><div class="hint">Varje nivå ger +20 % skada och tålighet. Infanteri 1 låser upp raketsoldat, Flyg 1 låser upp jaktplan.</div>';
    }
    if (b.t === 'hq') html += `<div class="acts"><button class="btn" id="buyrec">Köp rekryt (75)</button><button class="btn" id="droprec">Placera rekryter (${tm.recruits})</button></div>`;
  } else if (selU.length) {
    const counts = {}; for (const u of selU) counts[u.t] = (counts[u.t] || 0) + 1;
    const hpS = selU.reduce((a, u) => a + u.hp, 0), hpM = selU.reduce((a, u) => a + u.mhp, 0);
    html = `<div class="row"><div class="ttl">${selU.length === 1 ? UT[selU[0].t].n : selU.length + ' enheter'}<div class="hpl"><i style="width:${hpS / hpM * 100}%"></i></div><span class="sub">${Object.entries(counts).map(([t, n]) => n + ' ' + UT[t].n.toLowerCase()).join(' · ')}</span></div><button class="btn x" id="cx" aria-label="Avmarkera">×</button></div>
      <div class="hint">Tryck på marken för att flytta, på en fiende för att anfalla${selU.some(u => u.t === 'worker') ? ', på malm för att bryta' : ''}.</div>
      <div class="acts"><button class="btn ${atkMode ? 'on' : ''}" id="atk">Anfallsmarsch</button><button class="btn" id="stop">Stopp</button>${selU.length === 1 ? '<button class="btn" id="same">Välj alla sådana</button>' : ''}</div>`;
  }
  ctx.innerHTML = html; ctx.style.display = html ? 'block' : 'none'; build.style.display = html ? 'none' : 'flex'; document.body.classList.toggle('ctxopen', !!html);
  const on = (id, f) => { const el = $(id); if (el) el.onclick = f; };
  on('cx', () => { mode = null; selU = []; selB = null; atkMode = false; updateCtx(); });
  on('cb', () => confirmBuild(mode.at));
  on('rw', () => { mode.role = 'worker'; updateCtx(); }); on('rs', () => { mode.role = 'scout'; updateCtx(); });
  on('rally', () => { mode = { k: 'rally' }; updateCtx(); });
  on('cq', () => { const b = selB; for (const t of b.q) G.teams[ME].ore += UT[t].cost; b.q = []; updateCtx(); });
  on('buyrec', () => { const tm = G.teams[ME]; if (tm.ore < 75) { toast('För lite malm'); return; } tm.ore -= 75; tm.recruits++; updateCtx(); updateHud(); });
  on('droprec', () => openRecruit());
  on('atk', () => { atkMode = !atkMode; updateCtx(); });
  on('stop', () => { for (const u of selU) { u.order = 'idle'; u.path = null; u.dest = null; u.tgt = 0; } });
  on('same', () => { const t = selU[0].t; selU = G.units.filter(u => u.team === ME && u.t === t); updateCtx(); });
  ctx.querySelectorAll('[data-t]').forEach(el => el.onclick = () => { const t = el.dataset.t; const why = canTrain(ME, t); if (why) { toast(why); return; } if (!queueUnit(selB, t)) { toast('Kön är full'); return; } updateCtx(); updateHud(); });
  ctx.querySelectorAll('[data-r]').forEach(el => el.onclick = () => { const k = el.dataset.r, tm = G.teams[ME]; if (tm.res[k] >= 3) return; if (tm.rsch) { toast('Forskning pågår redan'); return; } if (!startResearch(ME, k)) { toast('För lite malm'); return; } updateCtx(); updateHud(); });
}
function confirmBuild(at) {
  if (!mode || mode.k !== 'build' || !at) return;
  const why = canAffordBuild(ME, mode.t); if (why) { toast(why); return; }
  if (!canPlace(ME, mode.t, at[0], at[1])) { mode.at = at; toast('Här går det inte att bygga'); updateCtx(); return; }
  const b = placeBuilding(ME, mode.t, at[0], at[1]); G.stats.built++;
  mode = null; selB = b; updateCtx(); updateHud(); refreshBuildBar();
}
function openRecruit() { if (G.teams[ME].recruits <= 0) { toast('Inga rekryter just nu – nya kommer med tiden, eller köp vid högkvarteret'); return; } mode = { k: 'drop', role: 'worker' }; selU = []; selB = null; updateCtx(); }
$('recbtn').onclick = () => G && openRecruit();
$('boxbtn').onclick = () => { boxMode = !boxMode; $('boxbtn').classList.toggle('on', boxMode); if (boxMode) toast('Dra över kartan för att markera flera'); };
document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => G && selectGroup(b.dataset.g));
function setSpeed(s) { if (!G) return; G.speed = s; $('spd').textContent = s + '×'; }
$('spd').onclick = () => setSpeed(G.speed % 3 + 1);
$('zin').onclick = () => smoothZoom(1.4); $('zout').onclick = () => smoothZoom(1 / 1.4);
$('home').onclick = () => { const hq = G && G.blds.find(b => b.team === ME && b.t === 'hq'); if (hq) { const p = P(hq.i + 1.5, hq.j + 1.5, 1); glide(p); } };
function smoothZoom(f) { let n = 0; const st = () => { zoomAt(vw / 2, vh / 2, Math.pow(f, 1 / 10)); if (++n < 10) requestAnimationFrame(st); }; st(); }
function glide(p) { const s = [...cam]; let n = 0; const st = () => { n++; const q = sm(n / 22); cam = [s[0] + (p[0] - s[0]) * q, s[1] + (p[1] - s[1]) * q]; if (n < 22) requestAnimationFrame(st); }; st(); }
function togglePause() { if (!G || G.over) return; if (paused === 'menu') return; paused = !paused; $('pausebadge').style.display = paused ? 'block' : 'none'; }
$('menubtn').onclick = () => openMenu('ingame');

/* ---------------------------------------------------------------- spara & ladda */
const SAVE_KEY = 'frontlinje_save_v1';
let store = null, saving = false, lastSaveJSON = '';
(async () => { try { const cl = window.claude; if (!cl || !cl.use) return; const db = await cl.use('db'); const us = await cl.use('user'); const id = us && await us.id(); if (db && id) { store = db.doc('data/users/' + id + '/frontlinje'); refreshMenu(); } } catch (e) { } })();
function packBits(a) { let s = ''; for (let k = 0; k < a.length; k += 8) { let v = 0; for (let b = 0; b < 8; b++) if (a[k + b]) v |= 1 << b; s += String.fromCharCode(v); } return btoa(s); }
function unpackBits(str, n) { const s = atob(str), a = new Uint8Array(n); for (let k = 0; k < n; k++) a[k] = (s.charCodeAt(k >> 3) >> (k & 7)) & 1; return a; }
function serialize() {
  const r1 = v => Math.round(v * 100) / 100;
  return JSON.stringify({
    v: 1, seed: G.seed, opts: G.opts, time: r1(G.time), nextId,
    teams: G.teams.map(t => ({ ore: r1(t.ore), recruits: t.recruits, recT: r1(t.recT), res: t.res, rsch: t.rsch, alive: t.alive, ai: t.ai })),
    units: G.units.map(u => [u.id, u.t, u.team, r1(u.x), r1(u.y), r1(u.hp), r1(u.mhp), u.dir, u.order === 'gather' ? 'gather' : u.order === 'attack' ? 'idle' : u.order, u.dest ? [r1(u.dest[0]), r1(u.dest[1])] : null, u.carry, u.fld]),
    blds: G.blds.map(b => [b.id, b.t, b.team, b.i, b.j, r1(b.hp), r1(b.prog), b.q, r1(b.qt), b.rally]),
    outs: G.outs.map(o => [o.id, o.owner, r1(o.cap), o.capT]), fields: G.fields.map(f => f.amt),
    explored: packBits(G.explored), stats: G.stats, savedAt: Date.now(),
  });
}
function deserialize(json) {
  const s = JSON.parse(json);
  TL = mapGen(s.seed, s.opts.size, s.opts.enemies); CH.clear(); nextId = s.nextId;
  G = { v: 1, seed: s.seed, opts: s.opts, time: s.time, speed: 1, over: null, teams: [], units: [], blds: [], outs: [], fields: TL.fields.map((f, k) => ({ ...f, amt: s.fields[k] ?? f.amt })), explored: unpackBits(s.explored, N * N), msgs: [], stats: s.stats || { built: 0, trained: 0, lost: 0, killed: 0 } };
  s.teams.forEach((t, k) => G.teams.push({ id: k, ...t }));
  for (const [id, t, team, x, y, hp, mhp, dir, order, dest, carry, fld] of s.units) { const u = addUnit(t, team, x, y); Object.assign(u, { id, hp, mhp, dir, carry: carry || 0, fld: fld ?? -1 }); if (order === 'gather' || t === 'worker') { u.order = 'idle'; u.idleT = 1; } else if ((order === 'move' || order === 'amove') && dest) orderMove(u, dest[0], dest[1], order); }
  for (const [id, t, team, i, j, hp, prog, q, qt, rally] of s.blds) { const b = addBuilding(t, team, i, j, prog); Object.assign(b, { id, hp, q: q || [], qt: qt || 0, rally }); }
  TL.outs.forEach(([x, y], k) => { const o = s.outs[k] || [nextId++, -1, 0, -1]; G.outs.push({ id: o[0], i: Math.floor(x), j: Math.floor(y), owner: o[1], cap: o[2], capT: o[3] }); });
  reindex(); VIS = null; afterLoad(); setSpeed(1);
}
async function saveGame(manual) {
  if (!G || G.over) return; const json = serialize();
  try { localStorage.setItem(SAVE_KEY, json); } catch (e) { }
  if (store && !saving) { saving = true; try { await store.set({ v: 1, savedAt: Date.now(), data: json }); if (manual) toast('Spelet är sparat', 'good'); } catch (e) { if (manual) toast('Kunde inte spara till kontot – sparat på den här enheten', 'warn'); } saving = false; }
  else if (manual) toast('Spelet är sparat på den här enheten', 'good');
  lastSaveJSON = json;
}
async function loadSaved() {
  let local = null, remote = null;
  try { const s = localStorage.getItem(SAVE_KEY); if (s) local = s; } catch (e) { }
  if (store) { try { const snap = await Promise.race([store.get(), new Promise((_, rej) => setTimeout(() => rej('tid'), 8000))]); if (snap.exists) { const d = snap.data(); if (d && d.data) remote = d.data; } } catch (e) { } }
  const ts = j => { try { return JSON.parse(j).savedAt || 0; } catch (e) { return 0; } };
  if (local && remote) return ts(remote) >= ts(local) ? remote : local;
  return remote || local;
}
async function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } if (store) { try { await store.delete(); } catch (e) { } } }
addEventListener('visibilitychange', () => { if (document.hidden && G && !G.over) saveGame(false); });
setInterval(() => { if (G && !G.over && paused !== 'menu') saveGame(false); }, 45000);

/* ---------------------------------------------------------------- menyer */
let savedInfo = null;
async function refreshMenu() {
  const j = await loadSaved(); savedInfo = null;
  if (j) { try { const s = JSON.parse(j); if (!s.over) savedInfo = { json: j, t: s.time, opts: s.opts, at: s.savedAt }; } catch (e) { } }
  const c = $('contbtn'); if (c) { c.style.display = savedInfo ? 'flex' : 'none'; if (savedInfo) c.querySelector('small').textContent = `Speltid ${fmtT(savedInfo.t)} · ${['Liten', 'Medel', 'Stor'][[48, 64, 80].indexOf(savedInfo.opts.size)]} karta · ${DIFF[savedInfo.opts.diff].n}`; }
}
function openMenu(kind) {
  $('menu').style.display = 'flex'; $('m-main').style.display = kind === 'ingame' ? 'none' : 'block'; $('m-ingame').style.display = kind === 'ingame' ? 'block' : 'none'; $('m-new').style.display = 'none';
  if (kind === 'ingame') { paused = 'menu'; } refreshMenu();
}
function closeMenu() { $('menu').style.display = 'none'; if (paused === 'menu') paused = false; }
$('newbtn').onclick = () => { $('m-main').style.display = 'none'; $('m-new').style.display = 'block'; };
$('backbtn').onclick = () => { $('m-new').style.display = 'none'; $('m-main').style.display = 'block'; };
document.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => { seg.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); }));
const segVal = id => +document.querySelector('#' + id + ' .on').dataset.v;
$('startbtn').onclick = () => { closeMenu(); $('loading').style.display = 'flex'; setTimeout(() => { newGame({ size: segVal('o-size'), enemies: segVal('o-en'), diff: segVal('o-diff'), peace: segVal('o-peace') }); $('loading').style.display = 'none'; paused = false; setSpeed(1); toast('Placera dina rekryter: tryck på Rekryter uppe till vänster'); saveGame(false); }, 30); };
$('contbtn').onclick = () => { if (!savedInfo) return; closeMenu(); $('loading').style.display = 'flex'; setTimeout(() => { deserialize(savedInfo.json); $('loading').style.display = 'none'; paused = false; toast('Välkommen tillbaka!'); }, 30); };
$('resumebtn').onclick = () => closeMenu();
$('savebtn').onclick = () => saveGame(true);
$('quitbtn').onclick = async () => { await saveGame(false); G = null; $('menu').style.display = 'flex'; $('m-ingame').style.display = 'none'; $('m-main').style.display = 'block'; refreshMenu(); };
$('helpbtn').onclick = () => { $('help').style.display = 'flex'; }; $('helpclose').onclick = () => { $('help').style.display = 'none'; };
$('helpbtn2').onclick = () => { $('help').style.display = 'flex'; };
function endGame(win) {
  G.over = win ? 'win' : 'lose'; paused = 'menu';
  $('end').style.display = 'flex'; $('endttl').textContent = win ? 'Seger!' : 'Förlust';
  $('endtxt').textContent = win ? 'Alla motståndare är besegrade.' : 'Ditt högkvarter har förstörts.';
  $('endstats').innerHTML = `<div><b>${fmtT(G.time)}</b><span>speltid</span></div><div><b>${G.stats.built}</b><span>byggnader</span></div><div><b>${G.stats.trained}</b><span>tränade</span></div><div><b>${G.stats.killed}</b><span>besegrade</span></div>`;
  clearSave();
}
$('endbtn').onclick = () => { $('end').style.display = 'none'; G = null; openMenu('main'); };

/* ---------------------------------------------------------------- huvudslinga */
let lastNow = performance.now(), hudT = 0, ctxT = 0;
function frame(now) {
  const dt = Math.min(.1, (now - lastNow) / 1000); lastNow = now;
  if (G && !paused && !G.over) { let rem = dt * G.speed; while (rem > 0) { const s = Math.min(.05, rem); step(s); rem -= s; } }
  document.body.classList.toggle('ingame', !!G);
  render(now);
  hudT -= dt; if (hudT <= 0 && G) { hudT = .25; updateHud(); drawMini(); }
  ctxT -= dt; if (ctxT <= 0 && G && (selB || (mode && mode.k === 'drop')) ) { ctxT = .5; if (selB && (selB.prog < 1 || selB.q.length || selB.t === 'lab')) updateCtx(); }
  requestAnimationFrame(frame);
}

/* ---------------------------------------------------------------- start */
async function boot() {
  resize(); addEventListener('resize', resize);
  SC = (window.devicePixelRatio || 1) > 1.2 ? 1.35 : 1.1;
  try { await loadAssets(p => { $('loadbar').style.width = Math.round(p * 100) + '%'; }); }
  catch (e) { $('loadtxt').textContent = 'Kunde inte ladda grafiken. Ladda om sidan.'; return; }
  makeIcons(); document.querySelectorAll('[data-icon]').forEach(el => el.src = thumb(el.dataset.icon, ME, el.dataset.icon in UT ? 1 : 0, 96));
  $('loading').style.display = 'none'; openMenu('main');
  requestAnimationFrame(frame);
}
window.__fl = { get G() { return G; }, step, newGame, serialize, deserialize, selectGroup, tap, P, toScreen, setSpeed, get cam() { return cam; }, set cam(v) { cam = v; }, get zoom() { return zoom; }, set zoom(v) { zoom = v; }, queueUnit, placeBuilding, findSpot, deployRecruit, autoGather };
boot();
})();
