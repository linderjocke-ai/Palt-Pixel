import { data, DEMO } from './data.js';
import {
  upprepText,   isoDatum, franIso, laggTillDagar, mandag, veckodagNr, veckonummer, langtDatum, kortTid, minuter,
  forekomster, arLov, VD_KORT, MANADER, VECKODAGAR, storBokstav,
} from './datum.js';

// ---------------------------------------------------------------- hjälp
const $ = (s, r = document) => r.querySelector(s);
const e = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');
let toastTimer;
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('syns'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('syns'), 2600); }
// Egen bekräftelseruta (confirm() fungerar inte i alla miljöer).
function fraga(text, ja = 'Ta bort') {
  return new Promise((svar) => {
    const s = document.createElement('div');
    s.className = 'slojan';
    s.innerHTML = `<div class="ark" role="alertdialog" aria-modal="true" style="border-radius:26px;margin-bottom:auto;margin-top:auto;width:min(420px,calc(100% - 32px))"><p style="margin:0;font-size:16px;line-height:1.45">${e(text)}</p>
      <div class="knapprad"><button class="knapp fara" data-svar="1">${e(ja)}</button><button class="knapp sekundar" data-svar="0">Avbryt</button></div></div>`;
    s.style.alignItems = 'center';
    const klar = (v) => { s.remove(); svar(v); };
    s.addEventListener('click', (ev) => { const b = ev.target.closest('[data-svar]'); if (b) { ev.stopPropagation(); klar(b.dataset.svar === '1'); } else if (ev.target === s) klar(false); });
    document.body.appendChild(s);
    s.querySelector('[data-svar="0"]').focus();
  });
}
const sakerUrl = (u) => { try { const x = new URL(u); return ['http:', 'https:'].includes(x.protocol) ? x.href : null; } catch { return null; } };

const TYPER = { prov: 'Prov', laxa: 'Läxa', traning: 'Träning', lov: 'Lov', ovrigt: 'Övrigt' };
const BARNFARGER = [['#2F6FD0', 'Älvblå'], ['#D9781A', 'Hjortron'], ['#2E7D5B', 'Tall'], ['#7A4FC9', 'Ljung'], ['#138A8A', 'Hav'], ['#B8336A', 'Lingon']];
const TEMAN = [['soluppgang', 'Soluppgång'], ['kickflip', 'Kickflip'], ['setter', 'Setter']];

const I = {
  person: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  sol: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>',
  kal: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  schema: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  familj: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 15c3 0 6 1.5 6 4"/></svg>',
  plus: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  vanster: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  hoger: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  penna: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  lank: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>',
  text: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 6h14M5 11h14M5 16h9"/></svg>',
  bild: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
  fil: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v4h4"/></svg>',
  las: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z"/></svg>',
  ny: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M12 13v5M9.5 15.5h5"/></svg>',
  filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  gem: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M20 11.5l-8.1 8.1a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.4a1.7 1.7 0 0 1-2.4-2.4l7.7-7.7"/></svg>',
  lunch: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
  google: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.3-1.9-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.1l3.6 2.8C6.7 7.3 9.2 5.4 12 5.4z"/></svg>',
  microsoft: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.5v9.5H2z"/><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00A4EF" d="M2 12.5h9.5V22H2z"/><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z"/></svg>',
};
const loggaSvg = (px, id) => `<svg width="${px}" height="${px}" viewBox="0 0 512 512" aria-hidden="true"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC07A"/><stop offset=".55" stop-color="#F59A8E"/><stop offset="1" stop-color="#8DAEE6"/></linearGradient><radialGradient id="${id}p" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#B9A88F"/><stop offset=".6" stop-color="#8F7D66"/><stop offset="1" stop-color="#6E5E4B"/></radialGradient></defs><rect width="512" height="512" rx="116" fill="url(#${id}g)"/><rect x="104" y="128" width="304" height="272" rx="44" fill="#FFFDF9"/><path d="M104 172a44 44 0 0 1 44-44h216a44 44 0 0 1 44 44v28H104z" fill="#1B2236"/><rect x="164" y="104" width="22" height="58" rx="11" fill="#FFFDF9"/><rect x="326" y="104" width="22" height="58" rx="11" fill="#FFFDF9"/><ellipse cx="240" cy="350" rx="92" ry="14" fill="#1B2236" opacity=".12"/><ellipse cx="240" cy="296" rx="86" ry="62" fill="url(#${id}p)"/><ellipse cx="212" cy="266" rx="30" ry="14" fill="#D6C8B2" opacity=".55"/><path d="M226 262l34-10a8 8 0 0 1 10 5l7 24a8 8 0 0 1-5 10l-34 10a8 8 0 0 1-10-5l-7-24a8 8 0 0 1 5-10z" fill="#F6C945"/><g fill="#C8243A"><circle cx="334" cy="336" r="16"/><circle cx="360" cy="320" r="14"/><circle cx="356" cy="347" r="13"/><circle cx="314" cy="352" r="11"/></g><path d="M362 306c6-10 16-14 26-12-6 8-14 12-26 12z" fill="#3E7D4F"/></svg>`;
const LOGGA = loggaSvg(32, 'lg');
const LOGGA_STOR = loggaSvg(72, 'ls');

// ---------------------------------------------------------------- tillstånd
const S = { medlem: null, familj: null, barn: [], filter: null, kalVy: 'vecka', kalSteg: 0, valdDag: null, kalTyp: '', familjFlik: 'familj' };
const arForalder = () => S.medlem?.roll === 'foralder';
const barnMap = () => Object.fromEntries(S.barn.map((b) => [b.id, b]));
const barnNamn = (id) => (id ? barnMap()[id]?.namn || 'Okänt barn' : 'Hela familjen');
const barnFarg = (id) => (id ? barnMap()[id]?.farg || '#888' : 'var(--dampad)');

function sattTema(t) {
  document.documentElement.dataset.tema = t;
  try { localStorage.setItem('vp_tema', t); } catch {}
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue('--meta-farg').trim() || '#F8E3D3';
}

// ---------------------------------------------------------------- start
async function start() {
  try {
    const st = await data.start();
    if (!st.inloggad) return visaInloggning();
    if (!st.medlem) return visaKomIgang(st.anonym);
    S.medlem = st.medlem; S.familj = st.familj;
    sattTema(S.medlem.tema || 'soluppgang');
    S.barn = await data.listaBarn();
    if (!arForalder()) S.filter = S.medlem.barn_id;
    window.addEventListener('hashchange', route);
    route();
  } catch (err) {
    app.innerHTML = `<div class="inlogg"><div class="kort"><h2>Något gick fel</h2><p class="fel">${e(err.message)}</p><button class="knapp" onclick="location.reload()">Försök igen</button></div></div>`;
  }
}

// ---------------------------------------------------------------- ram och router
function ram(innehall, aktiv) {
  const band = DEMO ? `<div class="demoband">Demoläge – exempeldata som bara sparas i den här webbläsaren</div>` : '';
  return `${band}<div class="ram">${innehall}</div>
  <button class="plus" data-g="plusmeny" aria-label="Lägg till">${I.plus}</button>
  <nav class="nav" aria-label="Huvudmeny">
    <a href="#/idag" ${aktiv === 'idag' ? 'aria-current="page"' : ''}>${I.sol}Idag</a>
    <a href="#/kalender" ${aktiv === 'kalender' ? 'aria-current="page"' : ''}>${I.kal}Kalender</a>
    <a href="#/schema" ${aktiv === 'schema' ? 'aria-current="page"' : ''}>${I.schema}Schema</a>
    <a href="#/familj" ${aktiv === 'familj' ? 'aria-current="page"' : ''}>${I.familj}Familj</a>
  </nav>`;
}
function topp(rubrik, overrad, hoger = `<a class="rundknapp" href="#/familj" aria-label="Familj och inställningar">${I.person}</a>`) {
  return `<header class="topp">
    <div class="topprad"><a class="varumarke" href="#/idag">${LOGGA}<span>Veckopalten</span></a>${hoger}</div>
    <div>${overrad ? `<div class="datumrad">${overrad}</div>` : ''}<h1>${rubrik}</h1></div>
  </header>`;
}
function barnChips() {
  if (!arForalder() || S.barn.length < 2) return '';
  return `<div class="chips" role="group" aria-label="Visa barn">
    <button class="chip" data-g="filter" data-id="" aria-pressed="${!S.filter}">Alla</button>
    ${S.barn.map((b) => `<button class="chip" data-g="filter" data-id="${b.id}" aria-pressed="${S.filter === b.id}"><span class="prick" style="background:${e(b.farg)}"></span>${e(b.namn)}</button>`).join('')}
  </div>`;
}

async function route() {
  const [vag, arg, arg2] = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  if (!S.synkStartad && S.medlem && arForalder()) { S.synkStartad = true; setTimeout(() => autoSynka().catch(() => {}), 1500); }
  try {
    if (vag === 'kalender') return await visaKalender();
    if (vag === 'handelse') return await visaHandelse(arg, arg2);
    if (vag === 'ny') return await visaHandelseForm(null, new URLSearchParams(location.hash.split('?')[1] || ''));
    if (vag === 'andra') return await visaHandelseForm(arg);
    if (vag === 'material') return await visaMaterialForm(arg, arg2);
    if (vag === 'lasin' || vag === 'lagg') return visaLasIn();
    if (vag === 'schema') return await visaSchema();
    if (vag === 'familj') return await visaFamilj();
    return await visaIdag();
  } catch (err) {
    app.innerHTML = ram(`${topp('Hoppsan')}<div class="kort"><p class="fel">${e(err.message)}</p><a class="knapp" href="#/idag">Till Idag</a></div>`, '');
  }
}

// ---------------------------------------------------------------- händelserader
// Länk till en händelse. Upprepade händelser länkas till just det tillfället.
const hLank = (h) => `#/handelse/${h.id}${h.upprepa === 'vecka' && h.dag ? '/' + h.dag : ''}`;
function postRad(h) {
  const d = franIso(h.dag);
  const prov = h.typ === 'prov';
  const delar = [];
  if (h.tid) delar.push(kortTid(h.tid));
  if (h.amne) delar.push(e(h.amne));
  if (h.resultat && h.resultat.poang != null) delar.push(`resultat ${e(h.resultat.poang)}${h.resultat.max_poang ? '/' + e(h.resultat.max_poang) : ''}`);
  if (h.upprepa === 'vecka') delar.push(upprepText(h));
  if (h.slut_datum) delar.push(`till ${franIso(h.slut_datum).getDate()} ${MANADER[franIso(h.slut_datum).getMonth()].slice(0, 3)}`);
  return `<a class="post${prov ? ' prov' : ''}" href="${hLank(h)}">
    <div class="dag"><small>${VD_KORT[d.getDay()]}</small><b>${d.getDate()}</b></div>
    <div class="info"><div class="titel">${e(visTitel(h))}</div>
      <div class="under"><span class="prick liten" style="background:${barnFarg(h.barn_id)}"></span><span class="ut">${e(barnNamn(h.barn_id))}${delar.length ? ' · ' + delar.join(' · ') : ''}</span>${h.antal_material ? `<span class="gem" title="${h.antal_material} material">${I.gem}${h.antal_material}</span>` : ''}</div></div>
    ${prov ? '<span class="etikett">Prov</span>' : `<span class="pil">${I.hoger}</span>`}
  </a>`;
}
function visTitel(h) {
  const t = h.titel.trim();
  return new RegExp('^' + TYPER[h.typ], 'i').test(t) ? t : `${TYPER[h.typ]}: ${t}`;
}
// Varje ämne får en egen färg (samma ämne har alltid samma färg).
const AMNEN = [[/matem|matte/, 215], [/svensk|^sva/, 28], [/engelsk/, 262], [/spansk|tysk|fransk|modersm|språk/, 320], [/^so\b|samhäll|histor|geograf|religion/, 178], [/^no\b|biolog|fysik|kemi|teknik/, 128], [/idrott/, 4], [/^bild/, 48], [/musik/, 290], [/slöjd/, 22], [/hem|hkk/, 95], [/val|mentor|klassråd|rast/, 200]];
function amneHue(amne) {
  const a = (amne || '').toLowerCase().trim();
  for (const [re, h] of AMNEN) if (re.test(a)) return h;
  let x = 7; for (const c of a) x = (x * 31 + c.charCodeAt(0)) % 360;
  return x;
}
const amneNyckel = (a) => (a || '').toLowerCase().replace(/[^a-zåäö]/g, '').slice(0, 4);
// En lektionsrad med färg, och det som hör till just den lektionen just den dagen.
function lektionRad(l, iso, handelser, innehall, klass = '', efter = '') {
  const k = amneNyckel(l.amne);
  const ev = handelser.filter((h) => h.dag === iso && h.barn_id === l.barn_id && h.typ !== 'lov' && h.amne && amneNyckel(h.amne) === k);
  const inn = innehall.filter((r) => r.datum === iso && (!r.barn_id || r.barn_id === l.barn_id) && amneNyckel(r.amne) === k);
  const extra = ev.map((h) => `<a class="lk-hand${h.typ === 'prov' ? ' prov' : ''}" href="${hLank(h)}">${e(visTitel(h))}${h.antal_material ? ` <span class="gem">${I.gem}${h.antal_material}</span>` : ''}</a>`).join('')
    + inn.map((r) => `<span class="lk-inn">${e(r.innehall)}</span>`).join('');
  return `<div class="lektion ${klass}" style="--h:${amneHue(l.amne)}"><span class="tid">${kortTid(l.start)}</span><div class="lk"><span class="amne">${e(l.amne)} <span class="slut">– ${kortTid(l.slut)}</span></span>${extra}</div>${efter}</div>`;
}
// Lunchrad för ett barn en viss dag.
function lunchRad(barn, iso, mat, visaNamn = false) {
  const ratter = barn.mateo_enhet ? mat[String(barn.mateo_enhet)]?.[iso] : null;
  if (!ratter?.length) return '';
  return `<div class="lunch">${I.lunch}<span>${visaNamn ? `<span class="prick liten" style="background:${e(barn.farg)};margin-right:4px"></span>` : ''}<b>Lunch:</b> ${ratter.map(e).join(' <span class="dampad">eller</span> ')}</span></div>`;
}
const hamtaMat = (fran, till) => data.matsedel(S.barn.map((b) => b.mateo_enhet), fran, till).catch(() => ({}));
const filtrera = (lista) => (S.filter ? lista.filter((h) => h.barn_id === S.filter || h.barn_id === null) : lista);

// ---------------------------------------------------------------- IDAG
async function visaIdag() {
  const nu = new Date();
  const idag = isoDatum(nu);
  const till = isoDatum(laggTillDagar(nu, 14));
  const [handelser, lektioner, innehall, mat] = await Promise.all([data.listaHandelser(idag, till), data.listaLektioner(), data.listaInnehall(idag, idag), hamtaMat(idag, idag)]);
  const alla = forekomster(handelser, idag, till);
  const vd = veckodagNr(nu);
  const nuMin = nu.getHours() * 60 + nu.getMinutes();
  const visadeBarn = S.filter ? S.barn.filter((b) => b.id === S.filter) : S.barn;
  const lovIdag = arLov(idag, handelser);

  const barnKort = visadeBarn.map((b) => {
    const dagens = lektioner.filter((l) => l.barn_id === b.id && l.veckodag === vd).sort((x, y) => x.start.localeCompare(y.start));
    const provSnart = alla.find((h) => h.barn_id === b.id && h.typ === 'prov');
    const lek = lovIdag ? '<p class="tom">Lov idag. Ingen skola.</p>'
      : dagens.length ? `<div class="lektioner">${dagens.map((l) => {
        const forbi = minuter(l.slut) <= nuMin; const pagar = !forbi && minuter(l.start) <= nuMin;
        return lektionRad(l, idag, alla, innehall, `${forbi ? 'forbi' : ''}${pagar ? ' nu' : ''}`, pagar ? '<span class="pagar">pågår</span>' : '');
      }).join('')}</div>`
        : `<p class="tom">${vd > 5 ? 'Helg. Ingen skola idag.' : `Inget schema för ${VECKODAGAR[nu.getDay()]}. ${arForalder() ? '<a href="#/schema">Lägg in schemat</a>' : ''}`}</p>`;
    return `<section class="kort" aria-label="${e(b.namn)}">
      <div class="kort-huvud"><div class="namn"><span class="prick" style="width:12px;height:12px;background:${e(b.farg)}"></span><h2>${e(b.namn)}</h2>${b.arskurs ? `<span class="dampad liten-text">${e(b.arskurs)}</span>` : ''}</div>
        ${provSnart ? `<span class="etikett">Prov ${VD_KORT[franIso(provSnart.dag).getDay()]}</span>` : ''}</div>
      ${lek}
      ${lovIdag ? '' : lunchRad(b, idag, mat)}
    </section>`;
  }).join('');

  const pagang = filtrera(alla).filter((h) => h.typ !== 'lov' || h.datum >= idag).slice(0, 12);
  const tomBarn = !S.barn.length ? `<section class="kort"><h2>Välkommen!</h2><p class="tom">${arForalder() ? 'Börja med att lägga till barnen i familjen.' : 'Det finns inga barn i familjen än.'}</p>${arForalder() ? '<a class="knapp" href="#/familj">Lägg till barn</a>' : ''}</section>` : '';

  app.innerHTML = ram(`
    ${topp('Idag', `${langtDatum(nu)} · v. ${veckonummer(nu)}`)}
    ${barnChips()}
    <main class="stack" style="margin-top:12px">
      ${tomBarn}${barnKort}
      <section class="kort" aria-labelledby="pagang">
        <h2 id="pagang">På gång</h2>
        <div class="lista">${pagang.length ? pagang.map(postRad).join('') : '<p class="tom">Inget planerat de närmaste två veckorna.</p>'}</div>
        <a href="#/kalender" class="textknapp" style="align-self:flex-start">Visa hela kalendern</a>
      </section>
    </main>`, 'idag');
}

// ---------------------------------------------------------------- KALENDER
async function visaKalender() {
  const nu = new Date();
  const typFilter = (lista) => (S.kalTyp ? lista.filter((h) => h.typ === S.kalTyp) : lista);
  let innehall;
  if (S.kalVy === 'vecka') {
    const start = laggTillDagar(mandag(nu), 7 * S.kalSteg);
    const slut = laggTillDagar(start, 6);
    const fran = isoDatum(start), till = isoDatum(slut);
    const handelser = await data.listaHandelser(fran, till);
    const alla = typFilter(filtrera(forekomster(handelser, fran, till)));
    let dagar = '';
    for (let i = 0; i < 7; i++) {
      const d = laggTillDagar(start, i); const iso = isoDatum(d);
      const dagens = alla.filter((h) => h.dag === iso);
      const lov = arLov(iso, handelser);
      if (!dagens.length && i >= 5) continue;
      dagar += `<div class="daggrupp"><div class="rubrik">${VD_KORT[d.getDay()]} ${d.getDate()}${iso === isoDatum(nu) ? ' · idag' : ''}${lov ? ' · lov' : ''}</div>
        ${dagens.length ? `<div class="kort utan-dag" style="gap:2px;padding:8px 16px">${dagens.map(postRad).join('')}</div>` : '<div class="tom" style="padding:0 4px 4px">Inget planerat.</div>'}</div>`;
    }
    innehall = `
      ${kalHuvud(`Vecka ${veckonummer(start)}`, `${start.getDate()} ${MANADER[start.getMonth()].slice(0, 3)} – ${slut.getDate()} ${MANADER[slut.getMonth()].slice(0, 3)}`, 'veckan')}
      <div class="stack">${dagar}</div>
      ${S.kalSteg ? '<button class="textknapp" data-g="kalsteg" data-d="0">Tillbaka till denna vecka</button>' : ''}`;
    app.innerHTML = ram(`<main class="stack">${innehall}</main>`, 'kalender');
  } else {
    const forsta = new Date(nu.getFullYear(), nu.getMonth() + S.kalSteg, 1);
    const sista = new Date(forsta.getFullYear(), forsta.getMonth() + 1, 0);
    const gridStart = mandag(forsta);
    const gridSlut = laggTillDagar(mandag(sista), 6);
    const fran = isoDatum(gridStart), till = isoDatum(gridSlut);
    const handelser = await data.listaHandelser(fran, till);
    const alla = typFilter(filtrera(forekomster(handelser.filter((h) => h.typ !== 'lov'), fran, till)));
    const lovLista = handelser.filter((h) => h.typ === 'lov');
    if (!S.valdDag || S.valdDag < fran || S.valdDag > till) S.valdDag = (isoDatum(nu) >= isoDatum(forsta) && isoDatum(nu) <= isoDatum(sista)) ? isoDatum(nu) : isoDatum(forsta);
    let rader = '';
    for (let v = gridStart; v <= gridSlut; v = laggTillDagar(v, 7)) {
      rader += `<div class="vrad"><div class="vnr">${veckonummer(v)}</div>`;
      for (let i = 0; i < 7; i++) {
        const d = laggTillDagar(v, i); const iso = isoDatum(d);
        const dagens = alla.filter((h) => h.dag === iso);
        const klass = ['ruta', d.getMonth() !== forsta.getMonth() ? 'annan' : '', i >= 5 ? 'helg' : '', arLov(iso, lovLista) ? 'lov' : '', iso === isoDatum(nu) ? 'idag' : ''].join(' ');
        rader += `<button class="${klass}" data-g="valjdag" data-dag="${iso}" aria-pressed="${S.valdDag === iso}" aria-label="${d.getDate()} ${MANADER[d.getMonth()]}${dagens.length ? ', ' + dagens.length + ' händelser' : ''}">
          <span class="nr">${d.getDate()}</span><span class="prickar">${dagens.slice(0, 6).map((h) => `<span class="prick${h.typ === 'prov' ? ' prov' : ''}" style="background:${h.typ === 'prov' ? 'var(--prov)' : barnFarg(h.barn_id)}"></span>`).join('')}</span></button>`;
      }
      rader += '</div>';
    }
    const valda = alla.filter((h) => h.dag === S.valdDag);
    const vd = franIso(S.valdDag);
    const lovVald = arLov(S.valdDag, lovLista);
    innehall = `
      ${kalHuvud(`${storBokstav(MANADER[forsta.getMonth()])} ${forsta.getFullYear()}`, '', 'månaden')}
      <section class="kort manad" aria-label="Månadskalender">
        <div class="vrad huvud"><div>v.</div><div>MÅ</div><div>TI</div><div>ON</div><div>TO</div><div>FR</div><div>LÖ</div><div>SÖ</div></div>
        ${rader}
      </section>
      <div class="forklaring">${S.barn.map((b) => `<span><span class="prick liten" style="background:${e(b.farg)}"></span>${e(b.namn)}</span>`).join('')}<span><span class="prick liten" style="background:var(--prov);border-radius:2px"></span>Prov</span><span><span style="width:14px;height:8px;border-radius:2px;background:var(--lov-bg);display:inline-block"></span>Lov</span></div>
      <section class="kort" aria-live="polite"><h2>${storBokstav(VECKODAGAR[vd.getDay()])} ${vd.getDate()} ${MANADER[vd.getMonth()]}${lovVald ? ' · lov' : ''}</h2>
        <div class="lista">${valda.length ? valda.map(postRad).join('') : '<p class="tom">Inget planerat.</p>'}</div>
        <a class="textknapp" style="align-self:flex-start" href="#/ny?datum=${S.valdDag}">Lägg till den här dagen</a></section>`;
    app.innerHTML = ram(`<main class="stack">${innehall}</main>`, 'kalender');
  }
}
// Kompakt huvud för kalendern: rubrik med pilar, sedan vy-val och ett filter.
function kalHuvud(titel, under, enhet) {
  const aktiva = [S.filter && barnNamn(S.filter), S.kalTyp && TYPER[S.kalTyp]].filter(Boolean);
  const filterKnapp = `<button class="chip" data-g="kalfilter" aria-pressed="${aktiva.length > 0}" aria-haspopup="dialog">${I.filter}${aktiva.length ? e(aktiva.join(' · ')) : 'Filter'}</button>`;
  return `<header class="kalhuvud">
    <div class="topprad">
      <div><h1>${e(titel)}</h1>${under ? `<div class="datumrad">${e(under)}</div>` : ''}</div>
      <div class="rad"><button class="rundknapp" data-g="kalsteg" data-d="-1" aria-label="${enhet === 'veckan' ? 'Förra veckan' : 'Förra månaden'}">${I.vanster}</button><button class="rundknapp" data-g="kalsteg" data-d="1" aria-label="${enhet === 'veckan' ? 'Nästa vecka' : 'Nästa månad'}">${I.hoger}</button></div>
    </div>
    <div class="topprad">
      <div class="segment" role="group" aria-label="Vy"><button data-g="kalvy" data-v="vecka" aria-pressed="${S.kalVy === 'vecka'}">Vecka</button><button data-g="kalvy" data-v="manad" aria-pressed="${S.kalVy === 'manad'}">Månad</button></div>
      ${filterKnapp}
    </div>
  </header>`;
}
function visaKalFilter() {
  const s = document.createElement('div');
  s.className = 'slojan';
  const barnDel = arForalder() && S.barn.length > 1 ? `<h3>Barn</h3><div class="chips wrap" role="group" aria-label="Barn">
      <button class="chip" data-g="filter" data-id="" aria-pressed="${!S.filter}">Alla</button>
      ${S.barn.map((b) => `<button class="chip" data-g="filter" data-id="${b.id}" aria-pressed="${S.filter === b.id}"><span class="prick" style="background:${e(b.farg)}"></span>${e(b.namn)}</button>`).join('')}</div>` : '';
  s.innerHTML = `<div class="ark" role="dialog" aria-modal="true" aria-label="Filter">
    <div class="topprad"><h2>Visa</h2><button class="rundknapp" data-g="stang" aria-label="Stäng">✕</button></div>
    ${barnDel}
    <h3>Typ</h3>${typChips().replace('class="chips"', 'class="chips wrap"')}
    <button class="knapp bred" data-g="stang">Klar</button></div>`;
  document.body.appendChild(s);
  if (material) valjHandelseForMaterial(s.querySelector('.ark'));
  s.addEventListener('click', (ev) => { if (ev.target === s) s.remove(); });
}
function typChips() {
  return `<div class="chips" role="group" aria-label="Visa typ"><button class="chip" data-g="kaltyp" data-t="" aria-pressed="${!S.kalTyp}">Allt</button>${Object.entries(TYPER).map(([k, v]) => `<button class="chip" data-g="kaltyp" data-t="${k}" aria-pressed="${S.kalTyp === k}">${v}</button>`).join('')}</div>`;
}

// ---------------------------------------------------------------- HÄNDELSE
async function visaHandelse(id, valdDag) {
  const h = await data.hamtaHandelse(id);
  const upprepad = h.upprepa === 'vecka';
  // För en upprepad händelse visas ett tillfälle i taget: det valda, annars nästa från idag.
  let tillfalle = h.datum, forra = null, nasta = null;
  if (upprepad) {
    const steg = 7 * (h.upprepa_veckor || 1);
    const ar = (x) => forekomster([h], x, x).length > 0;
    const idag = isoDatum(new Date());
    tillfalle = valdDag && ar(valdDag) ? valdDag : (forekomster([h], idag < h.datum ? h.datum : idag, isoDatum(laggTillDagar(franIso(idag < h.datum ? h.datum : idag), steg)))[0]?.dag || forekomster([h], h.datum, h.upprepa_till || h.datum).pop()?.dag || h.datum);
    const f = isoDatum(laggTillDagar(franIso(tillfalle), -steg)), n = isoDatum(laggTillDagar(franIso(tillfalle), steg));
    if (f >= h.datum) forra = f;
    if (ar(n)) nasta = n;
    h.material = (h.material || []).filter((m) => (m.forekomst || h.datum) === tillfalle);
  }
  const d = franIso(tillfalle);
  const r = h.resultat || {};
  const datumText = `${langtDatum(d)}${h.slut_datum ? ` – ${langtDatum(franIso(h.slut_datum)).toLowerCase()}` : ''}${h.tid ? ' · ' + kortTid(h.tid) : ''}`;
  const upprepRad = upprepad ? `<div class="rad dampad liten-text" style="gap:8px;flex-wrap:wrap">${forra ? `<a class="chip" style="height:30px" href="#/handelse/${h.id}/${forra}" aria-label="Förra tillfället">${I.vanster}</a>` : ''}<span>Upprepas ${upprepText(h)}${h.upprepa_till ? ` t.o.m. ${franIso(h.upprepa_till).getDate()} ${MANADER[franIso(h.upprepa_till).getMonth()].slice(0, 3)}` : ''}</span>${nasta ? `<a class="chip" style="height:30px" href="#/handelse/${h.id}/${nasta}" aria-label="Nästa tillfälle">${I.hoger}</a>` : ''}</div>` : '';
  const kanAndra = arForalder() || (h.barn_id && h.barn_id === S.medlem.barn_id);
  const bildLankar = {};
  await Promise.all((h.material || []).filter((m) => m.typ === 'bild' && m.fil_sokvag).map(async (m) => { try { bildLankar[m.id] = await data.filLank(m.fil_sokvag); } catch { /* visas utan miniatyr */ } }));
  const filSort = (m) => { const x = (m.fil_sokvag || m.titel || '').split('.').pop().toLowerCase(); return ({ pdf: 'PDF', doc: 'Word', docx: 'Word', ppt: 'PowerPoint', pptx: 'PowerPoint', xls: 'Excel', xlsx: 'Excel', odt: 'Dokument', txt: 'Textfil' })[x] || 'Dokument'; };
  const doman = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
  const material = (h.material || []).map((m) => {
    const ikon = I[m.typ === 'lank' ? 'lank' : m.typ] || I.fil;
    const slag = { lank: `Länk${doman(m.url) ? ' till ' + e(doman(m.url)) : ''}`, text: 'Text att läsa', bild: 'Bild', fil: filSort(m) }[m.typ] || 'Material';
    const under = `${slag}${m.skapad_av_namn ? ' · tillagd av ' + e(m.skapad_av_namn) : ''}`;
    if (m.typ === 'bild' && bildLankar[m.id]) { const ta2 = arForalder() ? `<button class="textknapp" data-g="tabortmaterial" data-id="${m.id}" style="color:var(--fara);text-decoration:none" aria-label="Ta bort ${e(m.titel)}">Ta bort</button>` : ''; return `<div class="mat" style="flex-wrap:wrap"><span class="ikon">${ikon}</span><span class="info"><b>${e(m.titel)}</b><span>${under}</span></span>${ta2}<a class="matbild" href="${e(bildLankar[m.id])}" target="_blank" rel="noopener noreferrer"><img src="${e(bildLankar[m.id])}" alt="${e(m.titel)}" loading="lazy"></a></div>`; }
    const ta = arForalder() ? `<button class="textknapp" data-g="tabortmaterial" data-id="${m.id}" style="color:var(--fara);text-decoration:none" aria-label="Ta bort ${e(m.titel)}">Ta bort</button>` : '';
    if (m.typ === 'text') return `<div class="mat" style="flex-wrap:wrap"><span class="ikon">${ikon}</span><span class="info"><b>${e(m.titel)}</b><span>${under}</span></span>${ta}<div class="textmaterial" style="width:100%">${e(m.innehall)}</div></div>`;
    if (m.typ === 'lank') { const u = sakerUrl(m.url); return `<div class="mat"><span class="ikon">${ikon}</span><a class="info" href="${u ? e(u) : '#'}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:none"><b>${e(m.titel)}</b><span>${under}</span></a>${ta}</div>`; }
    return `<div class="mat"><span class="ikon">${ikon}</span><button class="info" data-g="oppnafil" data-id="${m.id}" style="background:none;border:0;padding:0;text-align:left"><b>${e(m.titel)}</b><span>${under}</span></button>${ta}</div>`;
  }).join('');
  S.aktuellHandelse = h;

  app.innerHTML = ram(`
    <header class="topp"><div class="topprad"><a class="rundknapp" href="javascript:history.back()" aria-label="Tillbaka">${I.vanster}</a>
      <div class="rad">${kanAndra ? `<a class="rundknapp" href="#/andra/${h.id}" aria-label="Ändra">${I.penna}</a>` : ''}</div></div></header>
    <main class="stack">
      <div class="stack" style="gap:6px">
        <div class="rad">${h.typ === 'prov' ? '<span class="etikett">Prov</span>' : `<span class="chip" style="height:28px;font-size:12px">${TYPER[h.typ]}</span>`}<span class="dampad liten-text rad" style="gap:6px"><span class="prick liten" style="background:${barnFarg(h.barn_id)}"></span>${e(barnNamn(h.barn_id))}${h.amne ? ' · ' + e(h.amne) : ''}</span></div>
        <h1 style="font-size:27px;line-height:1.15">${e(h.titel)}</h1>
        <div style="font-weight:700">${datumText}</div>${upprepRad}
        ${h.prenumeration_id ? '<div class="dampad liten-text">Från en kalender som uppdateras automatiskt. Ändrar du tid eller rubrik kan den skrivas över.</div>' : ''}
        ${h.beskrivning ? `<p style="margin:0;line-height:1.5;white-space:pre-wrap" class="dampad">${e(h.beskrivning)}</p>` : ''}
      </div>
      ${h.typ !== 'lov' ? `<section class="kort"><div class="kort-huvud"><h2>Instuderingsmaterial${h.material?.length ? ` <span class="dampad" style="font-weight:600">(${h.material.length})</span>` : ''}</h2>${kanAndra ? `<a class="chip" href="#/material/${h.id}${upprepad ? '/' + tillfalle : ''}">+ Lägg till</a>` : ''}</div>
        ${upprepad ? `<p class="tom" style="margin:0">Gäller bara ${VECKODAGAR[d.getDay()]} ${d.getDate()} ${MANADER[d.getMonth()]}. Varje gång får eget material.</p>` : ''}
        ${material || '<p class="tom">Inget material än.</p>'}</section>` : ''}
      ${['prov', 'laxa'].includes(h.typ) && !upprepad ? `<section class="kort"><h2>Resultat</h2>
        <form class="stack" data-form="resultat" style="gap:10px">
          <div class="tva"><label class="falt">Poäng<input name="poang" inputmode="decimal" value="${e(r.poang ?? '')}" ${kanAndra ? '' : 'disabled'}></label>
          <label class="falt">Av max<input name="max_poang" inputmode="decimal" value="${e(r.max_poang ?? '')}" ${kanAndra ? '' : 'disabled'}></label></div>
          <label class="falt">Kommentar eller betyg<input name="kommentar" maxlength="1000" value="${e(r.kommentar ?? '')}" ${kanAndra ? '' : 'disabled'}></label>
          ${kanAndra ? '<button class="knapp">Spara resultat</button>' : ''}
        </form></section>` : ''}
      ${arForalder() ? `<button class="knapp fara" data-g="tabort" data-id="${h.id}">Ta bort händelsen</button>` : ''}
    </main>`, '');
}

// ---------------------------------------------------------------- NY / ÄNDRA HÄNDELSE
async function visaHandelseForm(id, param = new URLSearchParams()) {
  const h = id ? await data.hamtaHandelse(id) : { typ: param.get('typ') || 'laxa', datum: param.get('datum') || isoDatum(new Date()), barn_id: arForalder() ? (S.filter || S.barn[0]?.id || '') : S.medlem.barn_id };
  const barnVal = arForalder()
    ? `<label class="falt">Gäller<select name="barn_id">${S.barn.map((b) => `<option value="${b.id}" ${h.barn_id === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}<option value="" ${!h.barn_id && id ? 'selected' : ''}>Hela familjen</option></select></label>`
    : `<input type="hidden" name="barn_id" value="${e(S.medlem.barn_id)}">`;
  app.innerHTML = ram(`
    <header class="topp"><div class="topprad"><a class="rundknapp" href="javascript:history.back()" aria-label="Avbryt">${I.vanster}</a></div><h1>${id ? 'Ändra' : 'Ny händelse'}</h1></header>
    <main><form class="kort" data-form="handelse" data-id="${id || ''}">
      <div class="chips wrap" role="radiogroup" aria-label="Typ">${Object.entries(TYPER).filter(([k]) => arForalder() || k !== 'lov').map(([k, v]) => `<label class="chip" style="cursor:pointer"><input type="radio" name="typ" value="${k}" ${h.typ === k ? 'checked' : ''} style="accent-color:var(--accent)">${v}</label>`).join('')}</div>
      ${barnVal}
      <label class="falt">Rubrik<input name="titel" required maxlength="120" value="${e(h.titel || '')}" placeholder="t.ex. Glosor kapitel 4"></label>
      <label class="falt">Ämne<input name="amne" maxlength="60" value="${e(h.amne || '')}" placeholder="t.ex. Spanska"></label>
      <div class="tva"><label class="falt">Datum<input type="date" name="datum" required value="${e(h.datum)}"></label>
        <label class="falt">Tid<input type="time" name="tid" value="${e(kortTid(h.tid))}"></label></div>
      <label class="falt" data-visa="lov">Sista dag (lov)<input type="date" name="slut_datum" value="${e(h.slut_datum || '')}"></label>
      <div class="tva" data-visa="upprepa"><label class="falt">Upprepas<select name="upprepa">${[[0, 'Nej'], [1, 'Varje vecka'], [2, 'Varannan vecka'], [3, 'Var tredje vecka'], [4, 'Var fjärde vecka']].map(([n, t]) => `<option value="${n}" ${(h.upprepa === 'vecka' ? (h.upprepa_veckor || 1) : 0) === n ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="falt" data-visa="till">Till och med<input type="date" name="upprepa_till" value="${e(h.upprepa_till || '')}"></label></div>
      <label class="falt">Beskrivning<textarea name="beskrivning" maxlength="4000" placeholder="Vad ska man kunna? Sidor, kapitel, utrustning…">${e(h.beskrivning || '')}</textarea></label>
      <p class="fel dold" data-fel></p>
      <button class="knapp bred">${id ? 'Spara ändringar' : 'Spara'}</button>
    </form></main>`, '');
  const form = $('form[data-form="handelse"]');
  const uppdatera = () => {
    const t = form.typ.value;
    form.querySelector('[data-visa="lov"]').classList.toggle('dold', t !== 'lov');
    form.querySelector('[data-visa="upprepa"]').classList.toggle('dold', !['laxa', 'traning', 'ovrigt'].includes(t));
    form.querySelector('[data-visa="till"]').style.visibility = form.upprepa.value === '0' ? 'hidden' : '';
  };
  form.addEventListener('change', uppdatera); uppdatera();
}

// ---------------------------------------------------------------- MATERIAL
async function visaMaterialForm(handelseId, dag) {
  const h = await data.hamtaHandelse(handelseId);
  const forekomst = h.upprepa === 'vecka' && /^\d{4}-\d{2}-\d{2}$/.test(dag || '') ? dag : '';
  app.innerHTML = ram(`
    <header class="topp"><div class="topprad"><a class="rundknapp" href="javascript:history.back()" aria-label="Avbryt">${I.vanster}</a></div>
      <div><div class="datumrad">${e(h.titel)}${forekomst ? ` · ${VD_KORT[franIso(forekomst).getDay()]} ${franIso(forekomst).getDate()}/${franIso(forekomst).getMonth() + 1}` : ''}</div><h1>Nytt material</h1></div></header>
    <main><form class="kort" data-form="material" data-handelse="${h.id}" data-forekomst="${forekomst}">
      <div class="chips wrap" role="radiogroup" aria-label="Typ av material">
        ${[['lank', 'Länk'], ['text', 'Text'], ['bild', 'Bild'], ['fil', 'Dokument']].map(([k, v], i) => `<label class="chip" style="cursor:pointer"><input type="radio" name="typ" value="${k}" ${i === 0 ? 'checked' : ''} style="accent-color:var(--accent)">${v}</label>`).join('')}
      </div>
      <label class="falt">Rubrik<input name="titel" maxlength="160" placeholder="t.ex. Glosor på Quizlet"></label>
      <label class="falt" data-visa="lank">Webblänk<input name="url" type="url" inputmode="url" placeholder="https://…"></label>
      <label class="falt dold" data-visa="text">Text<textarea name="innehall" maxlength="20000" placeholder="Klistra in eller skriv"></textarea></label>
      <label class="falt dold" data-visa="bild">Bild<input name="bild" type="file" accept="image/*" capture="environment"></label>
      <label class="falt dold" data-visa="fil">Dokument<input name="fil" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.odt,.odp,.txt,.rtf,.pages,.key"></label>
      <p class="fel dold" data-fel></p>
      <button class="knapp bred">Spara material</button>
    </form></main>`, '');
  const form = $('form[data-form="material"]');
  form.addEventListener('change', () => { const t = form.typ.value; form.querySelectorAll('[data-visa]').forEach((el) => el.classList.toggle('dold', el.dataset.visa !== t)); });
}

// ---------------------------------------------------------------- LÄGG TILL
// En enda väg in: klistra in en länk eller text, eller välj en fil. Appen avgör själv vad det är.
function visaLasIn() {
  S.lasForslag = null; S.lasRes = null; S.lasUnderlag = null;
  const barnVal = arForalder() && S.barn.length
    ? `<label class="falt">Gäller<select name="barnId"><option value="">Låt appen avgöra</option>${S.barn.map((b) => `<option value="${b.id}" ${S.filter === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}</select></label>` : '';
  app.innerHTML = ram(`
    <header class="topp"><div class="topprad"><a class="rundknapp" href="javascript:history.back()" aria-label="Tillbaka">${I.vanster}</a></div>
      <div><div class="datumrad">Veckobrev, schema, läxor, material eller lagets kalender – appen ser själv vad det är.</div><h1>Lägg till</h1></div></header>
    <main class="stack">
      <form class="kort" data-form="lasin">
        <label class="falt">Länk eller text<textarea name="inmatning" maxlength="60000" placeholder="Klistra in en länk (Google Docs, webbsida, kalender) eller text från skolan" style="min-height:110px"></textarea></label>
        <div class="rad" style="gap:8px"><label class="chip filval" style="cursor:pointer;position:relative">${I.fil}<span data-filnamn>Välj fil eller foto</span><input name="fil" type="file" accept="application/pdf,.pdf,image/*" class="osynlig"></label>
          <button type="button" class="litenx dold" data-g="rensafil" aria-label="Ta bort filen">✕</button></div>
        ${barnVal}
        <p class="fel dold" data-fel></p>
        <button class="knapp bred">${I.las} Läs in</button>
      </form>
      <div id="lasresultat"></div>
      <p class="tom" style="text-align:center;margin:0">Hellre skriva själv? <a href="#/ny">Prov eller läxa</a> · <button type="button" class="textknapp" data-g="materialark">Material till en läxa</button></p>
      <section id="kalendrar"></section>
    </main>`, '');
  const form = $('form[data-form="lasin"]');
  form.fil.addEventListener('change', () => {
    const fil = form.fil.files[0];
    form.querySelector('[data-filnamn]').textContent = fil ? fil.name : 'Välj fil eller foto';
    form.querySelector('[data-g="rensafil"]').classList.toggle('dold', !fil);
  });
  visaKalendrar();
}

// Familjens kalenderprenumerationer.
async function visaKalendrar() {
  const ruta = $('#kalendrar'); if (!ruta) return;
  const lista = await data.listaPren().catch(() => []);
  if (!lista.length) { ruta.innerHTML = ''; return; }
  ruta.innerHTML = `<div class="kort" style="gap:8px"><h2>Kalendrar som hämtas automatiskt</h2>
    ${lista.map((p) => `<div class="rad" style="gap:10px;align-items:center"><span class="prick" style="background:${barnFarg(p.barn_id)};width:10px;height:10px;flex:none"></span>
      <span style="flex:1;min-width:0"><b>${e(p.namn)}</b><br><span class="dampad liten-text">${p.barn_id ? e(barnNamn(p.barn_id)) : 'Hela familjen'}${p.synkad_at ? ` · uppdaterad ${new Date(p.synkad_at).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span></span>
      ${arForalder() ? `<button class="chip" style="height:32px" data-g="synkapren" data-id="${p.id}">Uppdatera</button><button class="litenx" data-g="tabortpren" data-id="${p.id}" aria-label="Ta bort ${e(p.namn)}">✕</button>` : ''}</div>`).join('')}</div>`;
  S.prenLista = lista;
}

// Lägger in eller uppdaterar aktiviteterna från en kalender. Ändrade tider uppdateras, inställda tas bort.
async function synkaPren(p, forslag) {
  const idag = isoDatum(new Date());
  const finns = p ? await data.handelserForPren(p.id) : [];
  const perUid = new Map(finns.map((h) => [h.extern_uid, h]));
  const sedda = new Set(); let nya = 0, andrade = 0, borta = 0;
  for (const f of forslag) {
    const uid = f.uid || `${f.datum}-${f.titel}`;
    if (sedda.has(uid)) continue; sedda.add(uid);
    const rad = { typ: 'traning', barn_id: p ? (p.barn_id || null) : (f.barn_id || null), titel: f.titel, amne: '', beskrivning: f.beskrivning || '', datum: f.datum, tid: f.tid || null, slut_datum: null,
      upprepa: f.upprepa_veckor ? 'vecka' : 'ingen', upprepa_veckor: f.upprepa_veckor || 1, upprepa_till: f.upprepa_till || null, prenumeration_id: p?.id || null, extern_uid: uid };
    const g = perUid.get(uid);
    if (!g) { await data.sparaHandelse(rad); nya++; }
    else if (g.datum !== rad.datum || kortTid(g.tid) !== (rad.tid || '') || g.titel !== rad.titel || (g.beskrivning || '') !== rad.beskrivning || g.upprepa !== rad.upprepa || (g.barn_id || null) !== rad.barn_id) { await data.sparaHandelse({ ...rad, id: g.id }); andrade++; }
  }
  if (p && forslag.length) for (const h of finns) if (!sedda.has(h.extern_uid) && (h.datum >= idag || h.upprepa === 'vecka')) { await data.taBortHandelse(h.id); borta++; }
  if (p) await data.sattSynkad(p.id);
  return { nya, andrade, borta };
}
// Hämtar kalendrarna igen i bakgrunden (för föräldrar, högst var sjätte timme).
async function autoSynka(tvinga = null) {
  const lista = (await data.listaPren().catch(() => [])).filter((p) => tvinga ? p.id === tvinga : (!p.synkad_at || Date.now() - new Date(p.synkad_at) > 6 * 3600e3));
  let summa = { nya: 0, andrade: 0, borta: 0 };
  for (const p of lista) {
    try {
      const res = await data.lasIn({ typ: 'lank', url: p.url, barnId: p.barn_id });
      if (!res.kalender) continue;
      const r = await synkaPren(p, res.forslag || []);
      summa = { nya: summa.nya + r.nya, andrade: summa.andrade + r.andrade, borta: summa.borta + r.borta };
    } catch (err) { if (tvinga) throw err; }
  }
  const delar = [summa.nya && `${summa.nya} nya`, summa.andrade && `${summa.andrade} ändrade`, summa.borta && `${summa.borta} inställda`].filter(Boolean);
  if (delar.length) { toast(`Kalendern är uppdaterad: ${delar.join(', ')}`); if (/^#\/(idag|kalender|lasin|lagg)?$/.test(location.hash) || !location.hash) route(); }
  else if (tvinga) toast('Inget nytt i kalendern');
}

const SORTER = { handelser: 'Prov och läxor', schema: 'Schema', material: 'Instuderingsmaterial', kalender: 'Kalender' };
async function visaForslag(res) {
  S.lasRes = res;
  S.lasSort = res.kalender ? 'kalender' : (SORTER[res.sort] ? res.sort : ((res.lektioner || []).length ? 'schema' : 'handelser'));
  const sorter = res.kalender ? ['kalender', 'handelser'] : ['handelser', 'schema', 'material'];
  $('#lasresultat').innerHTML = `<section class="stack" aria-live="polite"><div class="kort" style="gap:10px">
      <div class="liten-text dampad" style="font-weight:700">Det här ser ut som</div>
      <div class="chips wrap" role="radiogroup" aria-label="Vad är det?">${sorter.map((k) => `<button type="button" class="chip" data-g="lassort" data-s="${k}" aria-pressed="${S.lasSort === k}">${SORTER[k]}</button>`).join('')}</div>
      ${res.sammanfattning ? `<p class="dampad" style="margin:0">${e(res.sammanfattning)}</p>` : ''}
    </div><div id="lasdel" class="stack"></div></section>`;
  await visaLasDel();
}
async function visaLasDel() {
  const res = S.lasRes, ruta = $('#lasdel'); if (!ruta) return;
  document.querySelectorAll('[data-g="lassort"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === S.lasSort)));
  if (S.lasSort === 'schema') return delSchema(res, ruta);
  if (S.lasSort === 'material') return delMaterial(res, ruta);
  if (S.lasSort === 'kalender') return delKalender(res, ruta);
  return delHandelser(res, ruta);
}

function delSchema(res, ruta) {
  const lek = res.lektioner || [];
  S.lasLektioner = lek;
  if (!lek.length) { ruta.innerHTML = '<div class="kort"><p class="tom" style="margin:0">Appen hittade inga lektioner med tider här. Är det ett schema kan du prova en tydligare bild eller PDF:en från Skola24.</p></div>'; return; }
  if (!arForalder()) { ruta.innerHTML = '<div class="kort"><h2>Det här är ett schema</h2><p class="tom" style="margin:0">Be en förälder läsa in det, så hamnar lektionerna under Schema.</p></div>'; return; }
  ruta.innerHTML = `<form class="kort" data-form="sparaschema">
      <h2>${lek.length} lektioner</h2>
      <label class="falt">Schemat gäller<select name="barn">${S.barn.map((b) => `<option value="${b.id}" ${res.schema_barn_id === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}</select></label>
      ${[1, 2, 3, 4, 5].map((vd) => { const d = lek.filter((l) => l.veckodag === vd).sort((x, y) => x.start.localeCompare(y.start)); return d.length ? `<div class="daggrupp"><div class="rubrik">${storBokstav(VECKODAGAR[vd])}</div><div class="lektioner">${d.map((l) => `<div class="lektion" style="--h:${amneHue(l.amne)}"><span class="tid">${e(l.start)}</span><div class="lk"><span class="amne">${e(l.amne)} <span class="slut">– ${e(l.slut)}</span></span></div></div>`).join('')}</div></div>` : ''; }).join('')}
      <p class="tom" style="margin:0">Lektionerna läggs till i schemat. Det som redan finns ligger kvar.</p>
      <p class="fel dold" data-fel></p>
      <button class="knapp bred">Spara schemat</button></form>`;
}

async function delHandelser(res, ruta) {
  const lista = res.forslag || [];
  const inn = res.lektionsinnehall || [];
  S.lasInnehall = inn;
  if (lista.length) {
    const datum = lista.map((f) => f.datum).sort();
    const finns = await data.listaHandelser(datum[0], datum[datum.length - 1]);
    for (const f of lista) f.finns = finns.some((h) => h.datum === f.datum && h.typ === f.typ && (h.titel.toLowerCase().includes(f.titel.toLowerCase().slice(0, 12)) || f.titel.toLowerCase().includes(h.titel.toLowerCase().slice(0, 12))));
  }
  S.lasForslag = lista;
  if (!lista.length && !inn.length) { ruta.innerHTML = '<div class="kort"><p class="tom" style="margin:0">Appen hittade inga prov, läxor eller aktiviteter med datum. Välj en annan sort ovan om det är något annat.</p></div>'; return; }
  const kompakt = lista.length > 3;
  const barnOpt = (vald, i) => arForalder()
    ? `<select name="barn_${i}">${S.barn.map((b) => `<option value="${b.id}" ${vald === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}<option value="" ${!vald ? 'selected' : ''}>Hela familjen</option></select>`
    : `<input type="hidden" name="barn_${i}" value="${e(S.medlem.barn_id)}"><input disabled value="${e(barnNamn(S.medlem.barn_id))}">`;
  ruta.innerHTML = `<form class="stack" data-form="sparaforslag">
    ${kompakt ? `<button class="knapp bred" data-antal>Lägg till ${lista.filter((f) => !f.finns && f.sakerhet !== 'lag').length} st</button>
    <details class="kort granska" style="margin:0"><summary><b>Granska och ändra</b> <span class="dampad liten-text">${lista.length} st${lista.some((f) => f.finns) ? ` · ${lista.filter((f) => f.finns).length} finns redan` : ''}</span></summary><div class="stack" style="margin-top:12px">`
      : lista.length ? '<p class="tom" style="margin:0 4px">Bocka i det som ska sparas. Du kan ändra datum, barn och rubrik först.</p>' : ''}
    ${lista.map((f, i) => `<fieldset class="kort" style="margin:0">
      <label class="rad" style="gap:10px;font-weight:700;cursor:pointer"><input type="checkbox" name="med_${i}" ${f.finns || f.sakerhet === 'lag' ? '' : 'checked'} style="width:22px;height:22px;accent-color:var(--accent)">
        <span>${e(TYPER[f.typ] || 'Övrigt')}</span>${f.typ === 'prov' ? '<span class="etikett">Prov</span>' : ''}
        ${f.finns ? '<span class="chip" style="height:26px;font-size:12px">Finns redan</span>' : ''}${f.sakerhet === 'lag' ? '<span class="chip" style="height:26px;font-size:12px">Osäkert – kontrollera</span>' : ''}</label>
      <label class="falt">Rubrik<input name="titel_${i}" maxlength="120" value="${e(f.titel)}"></label>
      <div class="tva"><label class="falt">Datum<input type="date" name="datum_${i}" value="${e(f.datum)}"></label><label class="falt">Tid<input type="time" name="tid_${i}" value="${e(f.tid || '')}"></label></div>
      <div class="tva"><label class="falt">Typ<select name="typ_${i}">${Object.entries(TYPER).filter(([k]) => arForalder() || k !== 'lov').map(([k, v]) => `<option value="${k}" ${f.typ === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label class="falt">Gäller${barnOpt(f.barn_id, i)}</label></div>
      ${f.beskrivning ? `<label class="falt">Beskrivning<textarea name="besk_${i}" style="min-height:70px">${e(f.beskrivning)}</textarea></label>` : ''}
      ${f.material?.length ? `<div class="liten-text dampad">Material som följer med: ${f.material.map((m) => e(m.titel)).join(', ')}</div>` : ''}
      ${f.upprepa_veckor ? `<div class="liten-text dampad">Upprepas ${upprepText({ upprepa: 'vecka', upprepa_veckor: f.upprepa_veckor })}</div>` : ''}
    </fieldset>`).join('')}
    ${kompakt ? '</div></details>' : ''}
    ${inn.length ? `<fieldset class="kort" style="margin:0"><h2>Vad lektionerna handlar om</h2><p class="tom" style="margin:0">Det här visas på lektionen i schemat den dagen.</p>
      ${inn.map((r, i) => `<label class="rad" style="gap:10px;align-items:flex-start;cursor:pointer"><input type="checkbox" name="inn_${i}" checked style="width:22px;height:22px;flex:none;accent-color:var(--accent)">
        <span><b>${e(r.amne)}</b> <span class="dampad liten-text">${e(storBokstav(VECKODAGAR[franIso(r.datum).getDay()]))} ${franIso(r.datum).getDate()}/${franIso(r.datum).getMonth() + 1}${r.barn_id ? ' · ' + e(barnNamn(r.barn_id)) : ''}</span><br>${e(r.innehall)}</span></label>`).join('')}</fieldset>` : ''}
    <p class="fel dold" data-fel></p>
    ${kompakt ? '' : '<button class="knapp bred">Spara valda</button>'}
  </form>`;
  const f = ruta.querySelector('form'), antalKnapp = ruta.querySelector('[data-antal]');
  if (antalKnapp) f.addEventListener('change', () => { const n = f.querySelectorAll('input[name^="med_"]:checked').length + f.querySelectorAll('input[name^="inn_"]:checked').length; antalKnapp.textContent = n ? `Lägg till ${n} st` : 'Inget valt'; });
}

async function delMaterial(res, ruta) {
  const mi = res.material_info || {}, u = S.lasUnderlag || {};
  let vad = 'Text';
  if (u.fil) vad = u.fil.type.startsWith('image/') ? 'Bild' : `PDF: ${u.fil.name}`;
  else if (u.typ === 'lank') { try { vad = `Länk till ${new URL(u.url).hostname.replace(/^www\./, '')}`; } catch { vad = 'Länk'; } }
  const titel = mi.titel || (u.fil ? u.fil.name.replace(/\.[^.]+$/, '') : vad);
  const barnId = res.schema_barn_id || (arForalder() ? S.filter : S.medlem.barn_id) || null;
  const idag = isoDatum(new Date()), till = isoDatum(laggTillDagar(new Date(), 90));
  const kom = forekomster(await data.listaHandelser(idag, till), idag, till)
    .filter((h) => h.typ !== 'lov' && h.typ !== 'traning' && (arForalder() || h.barn_id === S.medlem.barn_id))
    .sort((a, b) => a.dag.localeCompare(b.dag));
  const k = amneNyckel(mi.amne);
  const poang = (h) => (k && h.amne && amneNyckel(h.amne) === k ? 100 : 0) + (mi.datum && h.dag === mi.datum ? 50 : 0) + (barnId && h.barn_id === barnId ? 20 : 0) + (mi.prov && h.typ === 'prov' ? 10 : 0);
  const bast = kom.reduce((m, h) => (!m || poang(h) > poang(m) ? h : m), null);
  const forval = bast && poang(bast) >= 100 ? bast : null;
  const val = (h) => `${h.id}|${h.upprepa === 'vecka' ? h.dag : ''}`;
  const kortD = (iso) => `${VD_KORT[franIso(iso).getDay()]} ${franIso(iso).getDate()}/${franIso(iso).getMonth() + 1}`;
  const nyVal = forval ? '' : (mi.prov ? 'ny:prov' : 'ny:laxa');
  ruta.innerHTML = `<form class="kort" data-form="sparamaterial" style="gap:12px">
      <div class="mat"><span class="ikon">${u.fil ? (u.fil.type.startsWith('image/') ? I.bild || I.fil : I.fil) : u.typ === 'lank' ? I.lank : I.fil}</span><span class="info"><b>${e(vad)}</b><span>${u.typ === 'text' && !u.fil ? `${u.text.length} tecken` : 'Sparas som instuderingsmaterial'}</span></span></div>
      <label class="falt">Rubrik<input name="titel" maxlength="160" value="${e(titel)}"></label>
      <label class="falt">Hör till<select name="koppla">
        ${kom.length ? `<optgroup label="Kommande prov och läxor">${kom.map((h) => `<option value="${e(val(h))}" ${forval === h ? 'selected' : ''}>${e(TYPER[h.typ])}: ${e(visTitel(h))} – ${kortD(h.dag)}${S.barn.length > 1 && h.barn_id ? ' · ' + e(barnNamn(h.barn_id)) : ''}</option>`).join('')}</optgroup>` : ''}
        <optgroup label="Skapa ny"><option value="ny:laxa" ${nyVal === 'ny:laxa' ? 'selected' : ''}>Ny läxa</option><option value="ny:prov" ${nyVal === 'ny:prov' ? 'selected' : ''}>Nytt prov</option></optgroup>
      </select></label>
      ${forval ? `<p class="tom" style="margin:-4px 0 0">Föreslaget eftersom ämnet stämmer.</p>` : ''}
      <div data-ny class="stack ${forval ? 'dold' : ''}" style="gap:10px">
        <div class="tva"><label class="falt">Ämne<input name="amne" maxlength="60" value="${e(mi.amne || '')}"></label><label class="falt">Datum<input type="date" name="datum" value="${e(mi.datum || '')}"></label></div>
        ${arForalder() && S.barn.length ? `<label class="falt">Gäller<select name="barn_id">${S.barn.map((b) => `<option value="${b.id}" ${barnId === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}<option value="">Hela familjen</option></select></label>` : ''}
      </div>
      <p class="fel dold" data-fel></p>
      <button class="knapp bred">Spara materialet</button></form>`;
  const f = ruta.querySelector('form');
  f.koppla.addEventListener('change', () => f.querySelector('[data-ny]').classList.toggle('dold', !f.koppla.value.startsWith('ny:')));
}

function delKalender(res, ruta) {
  const lista = res.forslag || [], u = S.lasUnderlag || {};
  const antal = {}; for (const f of lista) antal[f.titel] = (antal[f.titel] || 0) + 1;
  const namn = (Object.entries(antal).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Kalender').slice(0, 60);
  const kortD = (iso) => `${VD_KORT[franIso(iso).getDay()]} ${franIso(iso).getDate()}/${franIso(iso).getMonth() + 1}`;
  if (!lista.length) { ruta.innerHTML = '<div class="kort"><p class="tom" style="margin:0">Kalendern har inga kommande aktiviteter just nu.</p></div>'; }
  if (!arForalder()) { ruta.innerHTML = '<div class="kort"><p class="tom" style="margin:0">Be en förälder lägga till kalendern, så kommer alla aktiviteter med automatiskt.</p></div>'; return; }
  const prenumerera = u.typ === 'lank';
  ruta.innerHTML = `<form class="kort" data-form="prenumerera" style="gap:12px">
      <h2>${lista.length} kommande aktiviteter</h2>
      <p class="tom" style="margin:0">${prenumerera ? 'Alla läggs in. Appen hämtar sedan nya och ändrade tider automatiskt.' : 'Alla läggs in i kalendern.'}</p>
      ${prenumerera ? `<label class="falt">Namn<input name="namn" maxlength="80" value="${e(namn)}"></label>` : ''}
      <label class="falt">Gäller<select name="barn_id">${S.barn.map((b) => `<option value="${b.id}" ${res.schema_barn_id === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}<option value="" ${!res.schema_barn_id ? 'selected' : ''}>Hela familjen</option></select></label>
      <p class="fel dold" data-fel></p>
      <button class="knapp bred">${prenumerera ? 'Lägg till kalendern' : `Lägg till ${lista.length} st`}</button>
      ${lista.length ? `<details class="granska"><summary><span class="dampad">Visa aktiviteterna</span></summary><div class="stack" style="gap:4px;margin-top:10px">${lista.map((f) => `<div class="rad liten-text" style="gap:10px"><span style="width:76px;flex:none;font-weight:700">${kortD(f.datum)}</span><span style="width:42px;flex:none">${e(f.tid || '')}</span><span>${e(f.titel)}${f.upprepa_veckor ? ` <span class="dampad">(${upprepText({ upprepa: 'vecka', upprepa_veckor: f.upprepa_veckor })})</span>` : ''}</span></div>`).join('')}</div></details>` : ''}
    </form>`;
}

// Gör bilder mindre innan de skickas (högst 1800 px, JPEG).
function forminskaBild(fil) {
  return new Promise((ok, nej) => {
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, 1800 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * skala); c.height = Math.round(img.height * skala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      ok(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    };
    img.onerror = () => nej(new Error('Bilden gick inte att öppna. Prova en JPEG- eller PNG-bild.'));
    img.src = URL.createObjectURL(fil);
  });
}
const tillBase64 = (fil) => new Promise((ok, nej) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => nej(new Error('Filen gick inte att läsa.')); r.readAsDataURL(fil); });


// ---------------------------------------------------------------- SCHEMA
async function visaSchema() {
  const man = mandag(laggTillDagar(new Date(), [0, 6].includes(new Date().getDay()) ? 2 : 0)); const fran = isoDatum(man), till = isoDatum(laggTillDagar(man, 4));
  const [lektioner, handelser, innehall, mat] = await Promise.all([data.listaLektioner(), data.listaHandelser(fran, till), data.listaInnehall(fran, till), hamtaMat(fran, till)]);
  const alla = forekomster(handelser, fran, till);
  const visadeBarn = S.filter ? S.barn.filter((b) => b.id === S.filter) : S.barn;
  const idagVd = veckodagNr(new Date());
  const kort = visadeBarn.map((b) => {
    const dagar = [1, 2, 3, 4, 5].map((vd) => {
      const l = lektioner.filter((x) => x.barn_id === b.id && x.veckodag === vd).sort((x, y) => x.start.localeCompare(y.start));
      const iso = isoDatum(laggTillDagar(man, vd - 1));
      const lov = alla.some((h) => h.typ === 'lov' && h.dag === iso && (!h.barn_id || h.barn_id === b.id));
      return `<div class="daggrupp"><div class="rubrik">${storBokstav(VECKODAGAR[vd % 7])} ${franIso(iso).getDate()}/${franIso(iso).getMonth() + 1}${vd === idagVd ? ' · idag' : ''}${lov ? ' · lov' : ''}</div>
        ${lov ? '' : lunchRad(b, iso, mat).replace('class="lunch"', 'class="lunch" style="margin:0 0 6px"')}
        ${l.length ? `<div class="lektioner">${l.map((x) => lektionRad(x, iso, alla, innehall, '', arForalder() ? `<button class="litenx" data-g="tabortlektion" data-id="${x.id}" aria-label="Ta bort ${e(x.amne)} ${kortTid(x.start)}">✕</button>` : '')).join('')}</div>` : '<div class="tom">Inga lektioner.</div>'}
</div>`;
    }).join('');
    return `<section class="kort"><div class="namn"><span class="prick" style="width:12px;height:12px;background:${e(b.farg)}"></span><h2>${e(b.namn)}</h2></div>${dagar}</section>`;
  }).join('');
  const form = arForalder() && S.barn.length ? `<section class="kort"><h2>Lägg till lektion</h2>
    <form class="stack" data-form="lektion" style="gap:10px">
      <div class="tva"><label class="falt">Barn<select name="barn_id">${S.barn.map((b) => `<option value="${b.id}" ${S.filter === b.id ? 'selected' : ''}>${e(b.namn)}</option>`).join('')}</select></label>
      <label class="falt">Dag<select name="veckodag">${[1, 2, 3, 4, 5].map((vd) => `<option value="${vd}">${storBokstav(VECKODAGAR[vd])}</option>`).join('')}</select></label></div>
      <label class="falt">Ämne<input name="amne" required maxlength="40" placeholder="t.ex. Matematik"></label>
      <div class="tva"><label class="falt">Börjar<input type="time" name="start" required></label><label class="falt">Slutar<input type="time" name="slut" required></label></div>
      <p class="fel dold" data-fel></p>
      <button class="knapp">Lägg till</button>
    </form>
    <p class="tom" style="margin:0">Snabbare: <a href="#/lasin">läs in schemat</a> från en PDF eller ett foto, så fyller appen i lektionerna åt dig.</p></section>` : '';
  app.innerHTML = ram(`${topp('Schema', `Vecka ${veckonummer(man)}`)}${barnChips()}<main class="stack" style="margin-top:12px">${kort || '<p class="tom">Inga barn än.</p>'}${form}</main>`, 'schema');
}

// ---------------------------------------------------------------- FAMILJ
const famFlikar = () => `<div class="segment" role="tablist" aria-label="Familj" style="margin-bottom:12px"><button role="tab" data-g="famflik" data-f="familj" aria-pressed="${S.familjFlik !== 'matsedel'}">Familj</button><button role="tab" data-g="famflik" data-f="matsedel" aria-pressed="${S.familjFlik === 'matsedel'}">Matsedel</button></div>`;
async function visaFamilj() {
  if (S.familjFlik === 'matsedel') return visaMatsedelFlik();
  const tema = document.documentElement.dataset.tema;
  const temaDel = `<section class="kort"><h2>Utseende</h2><div class="temaval" role="group" aria-label="Utseende">
    ${TEMAN.map(([k, v]) => `<button data-g="tema" data-t="${k}" aria-pressed="${tema === k}"><span class="prov-bild tp-${k}"></span>${v}${k === 'soluppgang' ? ' <span class="dampad" style="font-weight:500">(standard)</span>' : ''}</button>`).join('')}
  </div></section>`;
  let foralderDel = '';
  if (arForalder()) {
    const [koder, medlemmar] = await Promise.all([data.familjekoder(), data.medlemmar()]);
    const barnLista = S.barn.map((b) => `<details class="kort" style="gap:8px"><summary class="rad" style="cursor:pointer;list-style:none;justify-content:space-between"><span class="namn"><span class="prick" style="background:${e(b.farg)}"></span><b>${e(b.namn)}</b>${b.arskurs ? `<span class="dampad liten-text">${e(b.arskurs)}</span>` : ''}</span><span class="dampad liten-text">Ändra</span></summary>
      ${barnForm(b)}</details>`).join('');
    foralderDel = `
      <section class="stack" aria-labelledby="barnrubrik"><h2 id="barnrubrik" style="padding:0 2px">Barn</h2>${barnLista}
        <details class="kort" ${S.barn.length ? '' : 'open'}><summary style="cursor:pointer;font-weight:700">+ Lägg till barn</summary>${barnForm({})}</details></section>
      <section class="kort"><h2>Koder</h2>
        <div><div class="dampad liten-text">Familjekod – barnen loggar in med den och sin PIN</div><div class="kod">${e(koder?.familjekod || '–')}</div></div>
        <div><div class="dampad liten-text">Vuxenkod – bjud in en annan vuxen. Gäller en gång${koder?.vuxenkod_giltig_till ? ', till ' + giltigTill(koder.vuxenkod_giltig_till) : ''}.</div><div class="kod">${e(koder?.vuxenkod || '–')}</div></div>
        <div class="knapprad"><button class="textknapp" data-g="nyvuxenkod">Ny vuxenkod</button><button class="textknapp" data-g="nyakoder">Byt båda koderna</button></div>
      </section>
      <section class="kort"><h2>Medlemmar</h2>${medlemmar.map((m) => `<div class="rad" style="justify-content:space-between"><span>${e(m.namn || 'Utan namn')} <span class="dampad liten-text">${m.roll === 'foralder' ? 'vuxen' : 'barn'}</span></span>${m.id !== S.medlem.id ? `<button class="textknapp" data-g="tabortmedlem" data-id="${m.id}" style="color:var(--fara);text-decoration:none">Ta bort</button>` : '<span class="dampad liten-text">du</span>'}</div>`).join('')}</section>`;
  }
  const demoDel = DEMO ? `<section class="kort"><h2>Demoläge</h2><p class="tom" style="margin:0">Prova hur appen ser ut för ett barn. Barnens PIN i demoläget är 1234.</p>
    <div class="chips"><button class="chip" data-g="demosom" data-id="" aria-pressed="${arForalder()}">Förälder</button>${S.barn.map((b) => `<button class="chip" data-g="demosom" data-id="${b.id}" aria-pressed="${S.medlem.barn_id === b.id}">${e(b.namn)}</button>`).join('')}</div>
    <button class="textknapp" style="align-self:flex-start" data-g="demoaterstall">Börja om med exempeldata</button></section>` : '';
  app.innerHTML = ram(`${topp('Familj', e(S.familj?.namn || ''), '')}${famFlikar()}<main class="stack">
    ${temaDel}${foralderDel}${demoDel}
    <section class="kort"><div class="rad" style="justify-content:space-between"><span>Inloggad som <b>${e(S.medlem.namn || '')}</b> <span class="dampad liten-text">${arForalder() ? 'vuxen' : 'barn'}</span></span></div>
      <button class="knapp sekundar" data-g="loggaut">Logga ut</button></section>
  </main>`, 'familj');
}
// Matsedel: välj kommun och skola för varje barn. Listorna kommer från Mateo Meny.
async function visaMatsedelFlik() {
  const barnLista = arForalder() ? S.barn : S.barn.filter((b) => b.id === S.medlem.barn_id);
  app.innerHTML = ram(`${topp('Familj', e(S.familj?.namn || ''), '')}${famFlikar()}<main class="stack"><p class="tom">Hämtar kommuner …</p></main>`, 'familj');
  const man = mandag(laggTillDagar(new Date(), [0, 6].includes(new Date().getDay()) ? 2 : 0));
  const fran = isoDatum(man), till = isoDatum(laggTillDagar(man, 4));
  const [lan, mat] = await Promise.all([data.mateoKommuner().catch(() => null), hamtaMat(fran, till)]);
  if (S.familjFlik !== 'matsedel' || !location.hash.startsWith('#/familj')) return;
  const kommunNamn = Object.fromEntries((lan || []).flatMap((l) => l.kommuner.map((k) => [k.slug, k.namn])));
  const kort = barnLista.map((b) => {
    const vecka = b.mateo_enhet ? [0, 1, 2, 3, 4].map((i) => { const iso = isoDatum(laggTillDagar(man, i)); const r = mat[String(b.mateo_enhet)]?.[iso]; return `<div class="matdag"><b>${storBokstav(VD_KORT[(i + 1) % 7])}</b><span>${r?.length ? r.map(e).join(' <span class="dampad">eller</span> ') : '<span class="dampad">–</span>'}</span></div>`; }).join('') : '';
    const vald = b.mateo_enhet ? `<div class="liten-text"><b>${e(b.skola || 'Vald skola')}</b>${b.kommun ? ', ' + e(kommunNamn[b.kommun] || b.kommun) : ''}</div>` : '<p class="tom" style="margin:0">Ingen skola vald än.</p>';
    const form = arForalder() ? `<form class="stack" data-form="matsedel" data-id="${b.id}" style="gap:10px">
        <label class="falt">Kommun<select name="kommun" data-mateo-kommun required><option value="">Välj kommun</option>${(lan || []).map((l) => `<optgroup label="${e(l.lan)}">${l.kommuner.map((k) => `<option value="${e(k.slug)}" ${b.kommun === k.slug ? 'selected' : ''}>${e(k.namn)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <label class="falt">Skola<select name="skola" data-mateo-skola required disabled><option value="">Välj kommun först</option></select></label>
        <p class="fel dold" data-fel></p>
        <div class="knapprad"><button class="knapp">Spara</button>${b.mateo_enhet ? `<button type="button" class="textknapp" data-g="tabortmatsedel" data-id="${b.id}">Ingen matsedel</button>` : ''}</div>
      </form>` : '';
    return `<section class="kort"><div class="namn"><span class="prick" style="width:12px;height:12px;background:${e(b.farg)}"></span><h2>${e(b.namn)}</h2></div>
      ${vald}${vecka ? `<div class="matvecka">${vecka}</div>` : ''}${form}</section>`;
  }).join('');
  const felLista = lan ? '' : '<p class="fel">Kunde inte hämta kommunerna från Mateo just nu. Försök igen om en stund.</p>';
  app.innerHTML = ram(`${topp('Familj', e(S.familj?.namn || ''), '')}${famFlikar()}<main class="stack">
    <p class="tom" style="margin:0 2px">Välj kommun och skola för varje barn. Lunchen visas sedan under Idag, Schema och Kalender.</p>
    ${felLista}${kort || '<p class="tom">Inga barn än.</p>'}
    <p class="dampad liten-text" style="margin:0 2px">Matsedlarna kommer från Mateo Meny. Finns inte kommunen eller skolan med använder den inte Mateo.</p></main>`, 'familj');
  for (const f of app.querySelectorAll('form[data-form="matsedel"]')) {
    const b = S.barn.find((x) => x.id === f.dataset.id);
    const kSel = f.querySelector('[data-mateo-kommun]'), sSel = f.querySelector('[data-mateo-skola]');
    const fyll = async (forval) => {
      const slug = kSel.value;
      sSel.disabled = true;
      if (!slug) { sSel.innerHTML = '<option value="">Välj kommun först</option>'; return; }
      sSel.innerHTML = '<option value="">Hämtar skolor …</option>';
      let skolor = [];
      try { skolor = await data.mateoSkolor(slug); } catch { sSel.innerHTML = '<option value="">Kunde inte hämta skolorna</option>'; return; }
      if (kSel.value !== slug) return;
      if (!skolor.length) { sSel.innerHTML = '<option value="">Kommunen har inga matsedlar i Mateo</option>'; return; }
      const grupper = [...new Set(skolor.map((x) => x.typ))];
      sSel.innerHTML = '<option value="">Välj skola</option>' + grupper.map((g) => `<optgroup label="${e(g)}">${skolor.filter((x) => x.typ === g).map((x) => `<option value="${x.id}" data-namn="${e(x.namn)}" ${String(forval) === String(x.id) ? 'selected' : ''}>${e(x.namn)}</option>`).join('')}</optgroup>`).join('');
      sSel.disabled = false;
    };
    kSel.addEventListener('change', () => fyll(null));
    if (kSel.value) fyll(b?.mateo_enhet);
  }
}
function giltigTill(t) {
  const d = new Date(t);
  if (d < new Date()) return 'har gått ut';
  return `${d.getDate()} ${MANADER[d.getMonth()]} kl. ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`;
}
function barnForm(b) {
  return `<form class="stack" data-form="barn" data-id="${b.id || ''}" style="gap:10px">
    <div class="tva"><label class="falt">Namn<input name="namn" required maxlength="40" value="${e(b.namn || '')}"></label>
      <label class="falt">Årskurs<input name="arskurs" maxlength="20" value="${e(b.arskurs || '')}" placeholder="t.ex. åk 4"></label></div>
    <fieldset style="border:0;padding:0;margin:0"><legend class="dampad liten-text" style="font-weight:700;margin-bottom:6px">Färg</legend><div class="chips wrap">
      ${BARNFARGER.map(([f, n], i) => `<label class="chip" style="cursor:pointer"><input type="radio" name="farg" value="${f}" ${(b.farg || BARNFARGER[S.barn.length % BARNFARGER.length][0]) === f ? 'checked' : ''} style="accent-color:${f}"><span class="prick" style="background:${f}"></span>${n}</label>`).join('')}
    </div></fieldset>

    <label class="falt">${b.id ? 'Ny PIN (lämna tomt för att behålla)' : 'PIN för inloggning (4–6 siffror)'}<input name="pin" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off" ${b.id ? '' : 'required'}></label>
    <p class="fel dold" data-fel></p>
    <div class="knapprad"><button class="knapp">${b.id ? 'Spara' : 'Lägg till barn'}</button>${b.id ? `<button type="button" class="knapp fara" data-g="tabortbarn" data-id="${b.id}">Ta bort</button>` : ''}</div>
  </form>`;
}

// ---------------------------------------------------------------- PLUSMENY
function visaPlusmeny(material = false) {
  const s = document.createElement('div');
  s.className = 'slojan';
  s.innerHTML = `<div class="ark" role="dialog" aria-modal="true" aria-label="Lägg till">
    <div class="topprad"><h2>Lägg till</h2><button class="rundknapp" data-g="stang" aria-label="Stäng">✕</button></div>
    <button class="kort menyval" data-g="gaTill" data-h="#/ny"><span class="ikon">${I.ny}</span><span><b>Ny händelse</b><span>Prov, läxa, träning${arForalder() ? ', lov' : ''} eller annat</span></span></button>
    <button class="kort menyval" data-g="valjForMaterial"><span class="ikon">${I.fil}</span><span><b>Nytt material</b><span>Länk, text, bild eller dokument till en läxa eller ett prov</span></span></button>
    <button class="kort menyval" data-g="gaTill" data-h="#/lasin"><span class="ikon">${I.las}</span><span><b>Läs in</b><span>Veckobrev, länk, PDF, foto eller text – appen hittar prov och läxor åt dig</span></span></button>
  </div>`;
  document.body.appendChild(s);
  s.addEventListener('click', (ev) => { if (ev.target === s) s.remove(); });
  s.querySelector('[data-g="stang"]').focus();
}
async function valjHandelseForMaterial(ark) {
  const idag = isoDatum(new Date());
  const lista = filtrera(forekomster(await data.listaHandelser(idag, isoDatum(laggTillDagar(new Date(), 60))), idag, isoDatum(laggTillDagar(new Date(), 60))))
    .filter((h) => h.typ !== 'lov' && (arForalder() || h.barn_id === S.medlem.barn_id));
  const sedda = new Set();
  ark.innerHTML = `<div class="topprad"><h2>Till vilken händelse?</h2><button class="rundknapp" data-g="stang" aria-label="Stäng">✕</button></div>
    <div class="kort" style="gap:2px">${lista.filter((h) => !sedda.has(h.id) && sedda.add(h.id)).map((h) => postRad(h).replace(`href="${hLank(h)}"`, `href="#/material/${h.id}${h.upprepa === 'vecka' ? '/' + h.dag : ''}"`)).join('') || '<p class="tom">Inga kommande händelser. Skapa en händelse först.</p>'}</div>`;
}

// ---------------------------------------------------------------- INLOGGNING
function visaInloggning() {
  doljAvstangda();
  app.innerHTML = `${DEMO ? '<div class="demoband">Demoläge – ingen riktig inloggning</div>' : ''}<main class="inlogg">
    <div class="logga">${LOGGA_STOR}<span>Veckopalten</span><p class="dampad" style="margin:0">Familjens skolvecka på ett ställe.</p></div>
    <section class="kort"><h2>Vuxen</h2>
      <button class="knapp sekundar bred leverantor" data-g="oauth" data-p="google">${I.google}Fortsätt med Google</button>
      <button class="knapp sekundar bred leverantor" data-g="oauth" data-p="azure">${I.microsoft}Fortsätt med Microsoft</button>
      <div class="eller">eller med e-post</div>
      <form class="stack" data-form="epost" style="gap:10px"><label class="falt"><span class="sr">E-post</span><input type="email" name="epost" required autocomplete="email" placeholder="din@epost.se"></label>
        <button class="knapp bred">Skicka inloggningslänk</button><p class="fel dold" data-fel></p></form>
    </section>
    <section class="kort"><h2>Barn</h2><p class="tom" style="margin:0">Logga in med familjekoden och din PIN.</p>
      <form class="stack" data-form="familjekod" style="gap:10px"><label class="falt">Familjekod<input name="kod" required inputmode="numeric" pattern="[0-9]{6}" autocomplete="off" maxlength="6" placeholder="6 siffror" style="letter-spacing:.2em"></label>
        <button class="knapp bred">Fortsätt</button><p class="fel dold" data-fel></p></form>
    </section>
    <p class="tom" style="text-align:center;margin:0"><a href="/integritet/">Integritetspolicy</a></p>
  </main>`;
}
// Visa bara knappar för inloggningssätt som är påslagna i Supabase.
async function doljAvstangda() {
  const K = window.VP_KONFIG || {};
  if (!K.supabaseUrl) return;
  try {
    const r = await fetch(`${K.supabaseUrl}/auth/v1/settings`, { headers: { apikey: K.supabaseAnonKey } });
    const ext = (await r.json()).external || {};
    for (const p of ['google', 'azure']) if (!ext[p]) document.querySelector(`[data-g="oauth"][data-p="${p}"]`)?.remove();
  } catch {}
}
function visaBarnVal(kod, barn) {
  app.innerHTML = `<main class="inlogg"><div class="logga">${LOGGA_STOR}<span>Vem är du?</span></div>
    <div class="stack">${barn.map((b) => `<button class="kort menyval" data-g="valjbarn" data-id="${b.id}" data-namn="${e(b.namn)}" data-kod="${e(kod)}"><span class="ikon" style="background:${e(b.farg)};color:#fff;font-weight:700;font-size:18px">${e(b.namn[0] || '?')}</span><span><b>${e(b.namn)}</b></span></button>`).join('')}</div>
    <button class="textknapp" onclick="location.reload()">Tillbaka</button></main>`;
}
function visaPin(kod, id, namn) {
  app.innerHTML = `<main class="inlogg"><div class="logga">${LOGGA_STOR}<span>Hej ${e(namn)}!</span><p class="dampad" style="margin:0">Skriv din PIN-kod.</p></div>
    <form class="kort" data-form="pin" data-kod="${e(kod)}" data-id="${e(id)}">
      <label class="falt"><span class="sr">PIN</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" required autocomplete="off" style="text-align:center;font-size:28px;letter-spacing:.4em"></label>
      <p class="fel dold" data-fel></p><button class="knapp bred">Logga in</button></form>
    <button class="textknapp" onclick="location.reload()">Tillbaka</button></main>`;
  $('input[name="pin"]').focus();
}
function visaKomIgang(anonym) {
  if (anonym) { data.loggaUt().then(() => location.reload()); return; }
  app.innerHTML = `<main class="inlogg"><div class="logga">${LOGGA_STOR}<span>Kom igång</span></div>
    <section class="kort"><h2>Skapa en familj</h2>
      <form class="stack" data-form="skapafamilj" style="gap:10px"><label class="falt">Ditt namn<input name="mittnamn" required maxlength="40" autocomplete="given-name"></label>
        <label class="falt">Familjens namn<input name="familjenamn" required maxlength="60" placeholder="t.ex. Familjen Linder"></label>
        <button class="knapp bred">Skapa familj</button><p class="fel dold" data-fel></p></form></section>
    <section class="kort"><h2>Gå med i en familj</h2><p class="tom" style="margin:0">Har en annan vuxen redan skapat familjen? Skriv vuxenkoden (sex siffror) du fått. Den gäller en gång.</p>
      <form class="stack" data-form="gamed" style="gap:10px"><label class="falt">Ditt namn<input name="mittnamn" required maxlength="40"></label>
        <label class="falt">Vuxenkod<input name="kod" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="off" placeholder="6 siffror" style="letter-spacing:.2em"></label>
        <button class="knapp sekundar bred">Gå med</button><p class="fel dold" data-fel></p></form></section>
    <button class="textknapp" data-g="loggaut">Logga ut</button></main>`;
}

// ---------------------------------------------------------------- händelser (klick)
document.addEventListener('click', async (ev) => {
  const el = ev.target.closest('[data-g]');
  if (!el) return;
  const g = el.dataset.g;
  try {
    if (g === 'kalfilter') return visaKalFilter();
    if (g === 'filter') { S.filter = el.dataset.id || null; await route(); if (el.closest('.ark')) { el.closest('.slojan').remove(); visaKalFilter(); } return; }
    if (g === 'kalvy') { S.kalVy = el.dataset.v; S.kalSteg = 0; return route(); }
    if (g === 'kalsteg') { S.kalSteg = el.dataset.d === '0' ? 0 : S.kalSteg + Number(el.dataset.d); S.valdDag = null; return route(); }
    if (g === 'kaltyp') { S.kalTyp = el.dataset.t; await route(); if (el.closest('.ark')) { el.closest('.slojan').remove(); visaKalFilter(); } return; }
    if (g === 'valjdag') { S.valdDag = el.dataset.dag; return route(); }
    if (g === 'plusmeny') { location.hash = '#/lagg'; return; }
    if (g === 'materialark') return visaPlusmeny(true);
    if (g === 'lassort') { S.lasSort = el.dataset.s; return visaLasDel(); }
    if (g === 'rensafil') { const f = el.closest('form'); f.fil.value = ''; f.fil.dispatchEvent(new Event('change')); return; }
    if (g === 'synkapren') { el.disabled = true; el.textContent = 'Hämtar…'; try { await autoSynka(el.dataset.id); } catch (err) { toast(err.message || 'Kunde inte hämta kalendern'); } return visaKalendrar(); }
    if (g === 'tabortpren') { const p = (S.prenLista || []).find((x) => x.id === el.dataset.id); if (p && await fraga(`Ta bort kalendern "${p.namn}" och alla dess aktiviteter?`)) { await data.taBortPren(p.id); toast('Kalendern är borttagen'); visaKalendrar(); } return; }
    if (g === 'stang') return el.closest('.slojan')?.remove();
    if (g === 'gaTill') { el.closest('.slojan')?.remove(); location.hash = el.dataset.h; return; }
    if (g === 'valjForMaterial') return valjHandelseForMaterial(el.closest('.ark'));
    if (g === 'tema') { sattTema(el.dataset.t); S.medlem.tema = el.dataset.t; await data.sattTema(el.dataset.t); return route(); }
    if (g === 'oauth') return await data.loggaInMed(el.dataset.p);
    if (g === 'loggaut') { await data.loggaUt(); location.hash = ''; location.reload(); return; }
    if (g === 'valjbarn') return visaPin(el.dataset.kod, el.dataset.id, el.dataset.namn);
    if (g === 'famflik') { S.familjFlik = el.dataset.f; await route(); return; }
    if (g === 'tabortmatsedel') { if (await fraga(`Sluta visa lunch för ${barnNamn(el.dataset.id)}?`)) { await data.sattMatsedel(el.dataset.id, {}); S.barn = await data.listaBarn(); toast('Matsedeln är borttagen'); await route(); } return; }
    if (g === 'tabort') { if (await fraga('Ta bort händelsen och allt material som hör till den?')) { await data.taBortHandelse(el.dataset.id); toast('Händelsen är borttagen'); location.hash = '#/idag'; } return; }
    if (g === 'tabortmaterial') { const m = S.aktuellHandelse.material.find((x) => x.id === el.dataset.id); if (await fraga(`Ta bort "${m.titel}"?`)) { await data.taBortMaterial(m); toast('Materialet är borttaget'); route(); } return; }
    if (g === 'oppnafil') {
      const m = S.aktuellHandelse.material.find((x) => x.id === el.dataset.id);
      const url = m.fil_sokvag ? await data.filLank(m.fil_sokvag) : m.url;
      if (url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); }
      return;
    }
    if (g === 'tabortlektion') { await data.taBortLektion(el.dataset.id); return route(); }
    if (g === 'tabortbarn') { const b = barnMap()[el.dataset.id]; if (await fraga(`Ta bort ${b.namn} och allt som hör till ${b.namn}?`)) { await data.taBortBarn(b.id); S.barn = await data.listaBarn(); if (S.filter === b.id) S.filter = null; toast(`${b.namn} är borttagen`); route(); } return; }
    if (g === 'tabortmedlem') { if (await fraga('Ta bort personen från familjen?')) { await data.taBortMedlem(el.dataset.id); route(); } return; }
    if (g === 'nyvuxenkod') { await data.nyVuxenkod(); toast('Ny vuxenkod skapad'); return route(); }
    if (g === 'nyakoder') { if (await fraga('Byta både familjekod och vuxenkod? De gamla slutar fungera, men alla som redan är inloggade förblir det.', 'Byt koder')) { await data.nyaKoder(); route(); } return; }
    if (g === 'demosom') { await data.demoVisaSom(el.dataset.id || null); location.hash = '#/idag'; location.reload(); return; }
    if (g === 'demoaterstall') { await data.demoAterstall(); location.reload(); return; }
  } catch (err) { toast(err.message); }
});

// ---------------------------------------------------------------- formulär
const nr = (v) => (v === '' || v == null ? null : Number(String(v).replace(',', '.')));
document.addEventListener('submit', async (ev) => {
  const f = ev.target.closest('form[data-form]');
  if (!f) return;
  ev.preventDefault();
  const fel = f.querySelector('[data-fel]');
  const visaFel = (t) => { if (fel) { fel.textContent = t; fel.classList.remove('dold'); } else toast(t); };
  const knapp = f.querySelector('button:not([type="button"])');
  if (knapp) knapp.disabled = true;
  const v = Object.fromEntries(new FormData(f));
  try {
    switch (f.dataset.form) {
      case 'epost':
        await data.loggaInEpost(v.epost.trim());
        f.innerHTML = `<p style="margin:0">Kolla din e-post! Vi har skickat en inloggningslänk till <b>${e(v.epost)}</b>.</p>`;
        break;
      case 'familjekod': {
        const barn = await data.barnForKod(v.kod);
        if (!/^\d{6}$/.test(v.kod.trim())) throw new Error('Familjekoden är sex siffror.');
        if (!barn.length) throw new Error('Hittade ingen familj med den koden.');
        visaBarnVal(v.kod.trim().toUpperCase(), barn); break;
      }
      case 'pin': {
        const ok = await data.gaMedSomBarn(f.dataset.kod, f.dataset.id, v.pin);
        if (!ok) throw new Error('Fel PIN. Försök igen.');
        location.hash = '#/idag'; location.reload(); break;
      }
      case 'skapafamilj': await data.skapaFamilj(v.familjenamn.trim(), v.mittnamn.trim()); location.hash = '#/familj'; location.reload(); break;
      case 'gamed': {
        if (!/^\d{6}$/.test(v.kod.trim())) throw new Error('Vuxenkoden är sex siffror.');
        const ok = await data.gaMedSomVuxen(v.kod.trim(), v.mittnamn.trim());
        if (!ok) throw new Error('Koden stämmer inte eller har gått ut. Be den andra vuxna om en ny vuxenkod.');
        location.reload(); break;
      }
      case 'handelse': {
        if (!v.titel.trim()) throw new Error('Skriv en rubrik.');
        if (v.typ === 'lov' && v.slut_datum && v.slut_datum < v.datum) throw new Error('Sista dagen kan inte vara före första dagen.');
        const sparad = await data.sparaHandelse({
          id: f.dataset.id || undefined, typ: v.typ, barn_id: v.barn_id || null, titel: v.titel.trim(), amne: v.amne.trim(),
          beskrivning: v.beskrivning.trim(), datum: v.datum, tid: v.tid || null,
          slut_datum: v.typ === 'lov' ? (v.slut_datum || null) : null,
          ...(() => { const n = ['laxa', 'traning', 'ovrigt'].includes(v.typ) ? Number(v.upprepa) || 0 : 0;
            if (n && v.upprepa_till && v.upprepa_till < v.datum) throw new Error('Sista gången kan inte vara före första.');
            return { upprepa: n ? 'vecka' : 'ingen', upprepa_veckor: n || 1, upprepa_till: n ? (v.upprepa_till || null) : null }; })(),
        });
        toast('Sparat'); location.hash = `#/handelse/${sparad.id}${sparad.upprepa === 'vecka' ? '/' + sparad.datum : ''}`; break;
      }
      case 'material': {
        const typ = v.typ;
        const fil = typ === 'bild' ? f.bild.files[0] : typ === 'fil' ? f.fil.files[0] : null;
        if ((typ === 'bild' || typ === 'fil') && !fil) throw new Error('Välj en fil.');
        if (fil && fil.size > 15 * 1024 * 1024) throw new Error('Filen är större än 15 MB.');
        if (typ === 'lank' && !sakerUrl(v.url)) throw new Error('Skriv en hel webblänk som börjar med https://');
        if (typ === 'text' && !v.innehall.trim()) throw new Error('Skriv eller klistra in text.');
        const titel = v.titel.trim() || (fil ? fil.name : typ === 'lank' ? new URL(v.url).hostname : 'Anteckning');
        await data.sparaMaterial({ handelse_id: f.dataset.handelse, forekomst: f.dataset.forekomst || null, typ, titel, url: typ === 'lank' ? v.url : null, innehall: typ === 'text' ? v.innehall : null }, fil);
        toast('Materialet är sparat'); location.hash = `#/handelse/${f.dataset.handelse}${f.dataset.forekomst ? '/' + f.dataset.forekomst : ''}`; break;
      }
      case 'lasin': {
        const fil = f.fil.files[0], txt = (v.inmatning || '').trim();
        const underlag = { barnId: v.barnId || (arForalder() ? null : S.medlem.barn_id) };
        const u = { fil: null, typ: '', url: '', text: '' };
        if (fil) {
          if (fil.size > 15 * 1024 * 1024) throw new Error('Filen är större än 15 MB.');
          if (fil.type === 'application/pdf' || /\.pdf$/i.test(fil.name)) { if (fil.size > 10 * 1024 * 1024) throw new Error('PDF-filen är större än 10 MB.'); underlag.typ = 'pdf'; underlag.data = await tillBase64(fil); }
          else if (fil.type.startsWith('image/')) { underlag.typ = 'bild'; underlag.data = await forminskaBild(fil); underlag.mediaType = 'image/jpeg'; }
          else throw new Error('Den filtypen går inte att läsa. Välj en PDF eller en bild – eller kopiera texten.');
          u.fil = fil; u.typ = underlag.typ;
        } else if (/^(https?|webcals?):\/\/\S+$/i.test(txt)) {
          const url = txt.replace(/^webcals?:\/\//i, 'https://');
          if (!sakerUrl(url)) throw new Error('Länken går inte att läsa.');
          underlag.typ = 'lank'; underlag.url = url; u.typ = 'lank'; u.url = url;
        } else if (txt.length >= 5) { underlag.typ = 'text'; underlag.text = txt; u.typ = 'text'; u.text = txt; }
        else throw new Error('Klistra in en länk eller text, eller välj en fil.');
        S.lasUnderlag = u;
        if (knapp) knapp.innerHTML = 'Läser… det tar oftast 10–30 sekunder';
        const res = await data.lasIn(underlag);
        if (knapp) knapp.innerHTML = `${I.las} Läs in igen`;
        await visaForslag(res);
        break;
      }
      case 'sparamaterial': {
        const u = S.lasUnderlag;
        let hid, forekomst = null;
        if (!v.koppla) throw new Error('Välj vilket prov eller vilken läxa materialet hör till.');
        if (v.koppla.startsWith('ny:')) {
          if (!v.datum) throw new Error(v.koppla === 'ny:prov' ? 'Välj vilken dag provet är.' : 'Välj vilken dag läxan ska vara klar.');
          const h = await data.sparaHandelse({ typ: v.koppla.slice(3), barn_id: arForalder() ? (v.barn_id || null) : S.medlem.barn_id, titel: v.titel.trim() || 'Instudering', amne: (v.amne || '').trim(), beskrivning: '', datum: v.datum, tid: null, slut_datum: null, upprepa: 'ingen' });
          hid = h.id;
        } else { [hid, forekomst] = v.koppla.split('|'); forekomst = forekomst || null; }
        const titel = v.titel.trim() || 'Material';
        if (u.fil) await data.sparaMaterial({ handelse_id: hid, forekomst, typ: u.fil.type.startsWith('image/') ? 'bild' : 'fil', titel }, u.fil);
        else if (u.typ === 'lank') await data.sparaMaterial({ handelse_id: hid, forekomst, typ: 'lank', titel, url: u.url });
        else await data.sparaMaterial({ handelse_id: hid, forekomst, typ: 'text', titel, innehall: u.text.slice(0, 20000) });
        toast('Materialet är sparat'); location.hash = `#/handelse/${hid}${forekomst ? '/' + forekomst : ''}`; break;
      }
      case 'prenumerera': {
        const u = S.lasUnderlag, res = S.lasRes;
        let p = null;
        if (u.typ === 'lank') p = await data.sparaPren({ namn: (v.namn || '').trim() || 'Kalender', url: u.url, barn_id: v.barn_id || null });
        const r = await synkaPren(p, (res.forslag || []).map((x) => ({ ...x, barn_id: v.barn_id || null })));
        toast(`${r.nya} aktiviteter tillagda${p ? ' – kalendern uppdateras automatiskt' : ''}`);
        location.hash = '#/kalender'; break;
      }
      case 'sparaschema': {
        const barnId = v.barn;
        // Kompletterar bara: lektioner som redan finns (samma dag, tid och ämne) hoppas över.
        const nu = (await data.listaLektioner()).filter((l) => l.barn_id === barnId);
        const finns = (l) => nu.some((x) => x.veckodag === l.veckodag && kortTid(x.start) === l.start && x.amne.toLowerCase() === l.amne.toLowerCase());
        const nya = S.lasLektioner.filter((l) => !finns(l));
        for (const l of nya) await data.sparaLektion({ barn_id: barnId, veckodag: l.veckodag, start: l.start, slut: l.slut, amne: l.amne });
        toast(nya.length ? `${nya.length} lektioner tillagda för ${barnNamn(barnId)}` : 'Lektionerna fanns redan i schemat');
        S.filter = arForalder() && S.barn.length > 1 ? barnId : S.filter;
        location.hash = '#/schema';
        break;
      }
      case 'sparaforslag': {
        const valda = S.lasForslag.map((fs, i) => ({ fs, i })).filter(({ i }) => v[`med_${i}`]);
        const valdaInn = (S.lasInnehall || []).filter((_, i) => v[`inn_${i}`]);
        if (!valda.length && !valdaInn.length) throw new Error('Bocka i minst ett förslag.');
        if (valdaInn.length) await data.sparaInnehall(valdaInn.map((r) => ({ barn_id: r.barn_id || null, datum: r.datum, amne: r.amne, innehall: r.innehall })));
        for (const { fs, i } of valda) {
          const typ = v[`typ_${i}`];
          const h = await data.sparaHandelse({
            typ, barn_id: v[`barn_${i}`] || null, titel: (v[`titel_${i}`] || fs.titel).trim(), amne: fs.amne || '',
            beskrivning: (v[`besk_${i}`] ?? fs.beskrivning ?? '').trim(), datum: v[`datum_${i}`], tid: v[`tid_${i}`] || null,
            slut_datum: typ === 'lov' ? fs.slut_datum : null,
            upprepa: fs.upprepa_veckor ? 'vecka' : 'ingen', upprepa_veckor: fs.upprepa_veckor || 1, upprepa_till: fs.upprepa_till || null,
          });
          for (const m of fs.material || []) {
            if (m.typ === 'lank' && sakerUrl(m.url)) await data.sparaMaterial({ handelse_id: h.id, typ: 'lank', titel: m.titel || 'Länk', url: m.url });
            else if (m.typ === 'text' && (m.innehall || '').trim()) await data.sparaMaterial({ handelse_id: h.id, typ: 'text', titel: m.titel || 'Text', innehall: m.innehall });
          }
        }
        toast(valda.length ? `${valda.length} ${valda.length === 1 ? 'händelse' : 'händelser'} sparade` : 'Lektionsinnehållet är sparat');
        location.hash = valda.length ? '#/idag' : '#/schema';
        break;
      }
      case 'resultat':
        await data.sparaResultat({ handelse_id: S.aktuellHandelse.id, poang: nr(v.poang), max_poang: nr(v.max_poang), kommentar: v.kommentar.trim() });
        toast('Resultatet är sparat'); break;
      case 'lektion':
        if (v.slut <= v.start) throw new Error('Lektionen måste sluta efter att den börjar.');
        await data.sparaLektion({ barn_id: v.barn_id, veckodag: Number(v.veckodag), start: v.start, slut: v.slut, amne: v.amne.trim() });
        toast('Lektionen är tillagd'); await route(); break;
      case 'matsedel': {
        const opt = f.skola.selectedOptions[0];
        if (!v.kommun || !v.skola) throw new Error('Välj både kommun och skola.');
        await data.sattMatsedel(f.dataset.id, { kommun: v.kommun, skola: opt?.dataset.namn || '', mateo_enhet: Number(v.skola) });
        S.barn = await data.listaBarn(); toast(`Matsedeln för ${barnNamn(f.dataset.id)} är sparad`); await route(); break;
      }
      case 'barn': {
        if (v.pin && !/^\d{4,6}$/.test(v.pin)) throw new Error('PIN ska vara 4–6 siffror.');
        const gammal = S.barn.find((x) => x.id === f.dataset.id) || {};
        const b = await data.sparaBarn({ id: f.dataset.id || undefined, namn: v.namn.trim(), farg: v.farg, arskurs: v.arskurs.trim(), kommun: gammal.kommun, skola: gammal.skola, mateo_enhet: gammal.mateo_enhet });
        const bid = f.dataset.id || b?.id;
        if (v.pin && bid) await data.sattPin(bid, v.pin);
        S.barn = await data.listaBarn(); toast('Sparat'); await route(); break;
      }
    }
  } catch (err) { visaFel(err.message); }
  finally { if (knapp && document.contains(knapp)) knapp.disabled = false; }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') document.querySelector('.slojan')?.remove(); });

start();
