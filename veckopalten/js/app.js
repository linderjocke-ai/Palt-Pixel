import { data, DEMO } from './data.js';
import {
  isoDatum, franIso, laggTillDagar, mandag, veckodagNr, veckonummer, langtDatum, kortTid, minuter,
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
  lunch: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M17 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
  google: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.2-2.7l-3.5-2.7c-1 .7-2.2 1-3.7 1-2.8 0-5.3-1.9-6.1-4.5H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.9 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.1l3.6 2.8C6.7 7.3 9.2 5.4 12 5.4z"/></svg>',
  microsoft: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#F25022" d="M2 2h9.5v9.5H2z"/><path fill="#7FBA00" d="M12.5 2H22v9.5h-9.5z"/><path fill="#00A4EF" d="M2 12.5h9.5V22H2z"/><path fill="#FFB900" d="M12.5 12.5H22V22h-9.5z"/></svg>',
};
const LOGGA = '<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><ellipse cx="15" cy="16" rx="13" ry="11" fill="#A8977F"/><ellipse cx="11" cy="12" rx="4" ry="2.5" fill="#C2B49E"/><path d="M14 10h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z" fill="#F6C945"/></svg>';
const LOGGA_STOR = LOGGA.replace('width="30" height="30"', 'width="64" height="64"');

// ---------------------------------------------------------------- tillstånd
const S = { medlem: null, familj: null, barn: [], filter: null, kalVy: 'vecka', kalSteg: 0, valdDag: null, kalTyp: '' };
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
  const [vag, arg] = location.hash.replace(/^#\/?/, '').split('/');
  window.scrollTo(0, 0);
  try {
    if (vag === 'kalender') return await visaKalender();
    if (vag === 'handelse') return await visaHandelse(arg);
    if (vag === 'ny') return await visaHandelseForm(null, new URLSearchParams(location.hash.split('?')[1] || ''));
    if (vag === 'andra') return await visaHandelseForm(arg);
    if (vag === 'material') return await visaMaterialForm(arg);
    if (vag === 'schema') return await visaSchema();
    if (vag === 'familj') return await visaFamilj();
    return await visaIdag();
  } catch (err) {
    app.innerHTML = ram(`${topp('Hoppsan')}<div class="kort"><p class="fel">${e(err.message)}</p><a class="knapp" href="#/idag">Till Idag</a></div>`, '');
  }
}

// ---------------------------------------------------------------- händelserader
function postRad(h) {
  const d = franIso(h.dag);
  const prov = h.typ === 'prov';
  const delar = [];
  if (h.tid) delar.push(kortTid(h.tid));
  if (h.amne) delar.push(e(h.amne));
  if (h.antal_material) delar.push(`${h.antal_material} material`);
  if (h.resultat && h.resultat.poang != null) delar.push(`resultat ${e(h.resultat.poang)}${h.resultat.max_poang ? '/' + e(h.resultat.max_poang) : ''}`);
  if (h.upprepa === 'vecka') delar.push('varje vecka');
  if (h.slut_datum) delar.push(`till ${franIso(h.slut_datum).getDate()} ${MANADER[franIso(h.slut_datum).getMonth()].slice(0, 3)}`);
  return `<a class="post${prov ? ' prov' : ''}" href="#/handelse/${h.id}">
    <div class="dag"><small>${VD_KORT[d.getDay()]}</small><b>${d.getDate()}</b></div>
    <div class="info"><div class="titel">${e(visTitel(h))}</div>
      <div class="under"><span class="prick liten" style="background:${barnFarg(h.barn_id)}"></span><span class="ut">${e(barnNamn(h.barn_id))}${delar.length ? ' · ' + delar.join(' · ') : ''}</span></div></div>
    ${prov ? '<span class="etikett">Prov</span>' : `<span class="pil">${I.hoger}</span>`}
  </a>`;
}
function visTitel(h) {
  const t = h.titel.trim();
  return new RegExp('^' + TYPER[h.typ], 'i').test(t) ? t : `${TYPER[h.typ]}: ${t}`;
}
const filtrera = (lista) => (S.filter ? lista.filter((h) => h.barn_id === S.filter || h.barn_id === null) : lista);

// ---------------------------------------------------------------- IDAG
async function visaIdag() {
  const nu = new Date();
  const idag = isoDatum(nu);
  const till = isoDatum(laggTillDagar(nu, 14));
  const [handelser, lektioner] = await Promise.all([data.listaHandelser(idag, till), data.listaLektioner()]);
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
        return `<div class="lektion${forbi ? ' forbi' : ''}${pagar ? ' nu' : ''}"><span class="tid">${kortTid(l.start)}</span><span>${e(l.amne)}</span>${pagar ? '<span class="pagar">pågår</span>' : ''}</div>`;
      }).join('')}</div>`
        : `<p class="tom">${vd > 5 ? 'Helg. Ingen skola idag.' : `Inget schema för ${VECKODAGAR[nu.getDay()]}. ${arForalder() ? '<a href="#/schema">Lägg in schemat</a>' : ''}`}</p>`;
    return `<section class="kort" aria-label="${e(b.namn)}">
      <div class="kort-huvud"><div class="namn"><span class="prick" style="width:12px;height:12px;background:${e(b.farg)}"></span><h2>${e(b.namn)}</h2>${b.arskurs ? `<span class="dampad liten-text">${e(b.arskurs)}</span>` : ''}</div>
        ${provSnart ? `<span class="etikett">Prov ${VD_KORT[franIso(provSnart.dag).getDay()]}</span>` : ''}</div>
      ${lek}
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
  s.addEventListener('click', (ev) => { if (ev.target === s) s.remove(); });
}
function typChips() {
  return `<div class="chips" role="group" aria-label="Visa typ"><button class="chip" data-g="kaltyp" data-t="" aria-pressed="${!S.kalTyp}">Allt</button>${Object.entries(TYPER).map(([k, v]) => `<button class="chip" data-g="kaltyp" data-t="${k}" aria-pressed="${S.kalTyp === k}">${v}</button>`).join('')}</div>`;
}

// ---------------------------------------------------------------- HÄNDELSE
async function visaHandelse(id) {
  const h = await data.hamtaHandelse(id);
  const d = franIso(h.datum);
  const r = h.resultat || {};
  const datumText = `${langtDatum(d)}${h.slut_datum ? ` – ${langtDatum(franIso(h.slut_datum)).toLowerCase()}` : ''}${h.tid ? ' · ' + kortTid(h.tid) : ''}${h.upprepa === 'vecka' ? ' · varje vecka' : ''}`;
  const kanAndra = arForalder() || (h.barn_id && h.barn_id === S.medlem.barn_id);
  const material = (h.material || []).map((m) => {
    const ikon = I[m.typ === 'lank' ? 'lank' : m.typ] || I.fil;
    const under = `${{ lank: 'Länk', text: 'Text', bild: 'Bild', fil: 'Dokument' }[m.typ]}${m.skapad_av_namn ? ' · tillagd av ' + e(m.skapad_av_namn) : ''}`;
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
        <div style="font-weight:700">${datumText}</div>
        ${h.beskrivning ? `<p style="margin:0;line-height:1.5;white-space:pre-wrap" class="dampad">${e(h.beskrivning)}</p>` : ''}
      </div>
      ${h.typ !== 'lov' ? `<section class="kort"><div class="kort-huvud"><h2>Instuderingsmaterial</h2>${kanAndra ? `<a class="chip" href="#/material/${h.id}">+ Lägg till</a>` : ''}</div>
        ${material || '<p class="tom">Inget material än.</p>'}</section>` : ''}
      ${['prov', 'laxa'].includes(h.typ) ? `<section class="kort"><h2>Resultat</h2>
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
      <label class="falt rad" data-visa="traning" style="flex-direction:row;align-items:center;gap:10px;font-size:15px;color:var(--text)"><input type="checkbox" name="upprepa" ${h.upprepa === 'vecka' ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)">Upprepa varje vecka</label>
      <label class="falt">Beskrivning<textarea name="beskrivning" maxlength="4000" placeholder="Vad ska man kunna? Sidor, kapitel, utrustning…">${e(h.beskrivning || '')}</textarea></label>
      <p class="fel dold" data-fel></p>
      <button class="knapp bred">${id ? 'Spara ändringar' : 'Spara'}</button>
    </form></main>`, '');
  const form = $('form[data-form="handelse"]');
  const uppdatera = () => {
    const t = form.typ.value;
    form.querySelector('[data-visa="lov"]').classList.toggle('dold', t !== 'lov');
    form.querySelector('[data-visa="traning"]').classList.toggle('dold', !['traning', 'ovrigt'].includes(t));
  };
  form.addEventListener('change', uppdatera); uppdatera();
}

// ---------------------------------------------------------------- MATERIAL
async function visaMaterialForm(handelseId) {
  const h = await data.hamtaHandelse(handelseId);
  app.innerHTML = ram(`
    <header class="topp"><div class="topprad"><a class="rundknapp" href="javascript:history.back()" aria-label="Avbryt">${I.vanster}</a></div>
      <div><div class="datumrad">${e(h.titel)}</div><h1>Nytt material</h1></div></header>
    <main><form class="kort" data-form="material" data-handelse="${h.id}">
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

// ---------------------------------------------------------------- SCHEMA
async function visaSchema() {
  const lektioner = await data.listaLektioner();
  const visadeBarn = S.filter ? S.barn.filter((b) => b.id === S.filter) : S.barn;
  const idagVd = veckodagNr(new Date());
  const kort = visadeBarn.map((b) => {
    const dagar = [1, 2, 3, 4, 5].map((vd) => {
      const l = lektioner.filter((x) => x.barn_id === b.id && x.veckodag === vd).sort((x, y) => x.start.localeCompare(y.start));
      return `<div class="daggrupp"><div class="rubrik">${storBokstav(VECKODAGAR[vd % 7])}${vd === idagVd ? ' · idag' : ''}</div>
        ${l.length ? `<div class="lektioner">${l.map((x) => `<div class="lektion"><span class="tid">${kortTid(x.start)}</span><span style="flex:1">${e(x.amne)} <span class="dampad">– ${kortTid(x.slut)}</span></span>${arForalder() ? `<button class="litenx" data-g="tabortlektion" data-id="${x.id}" aria-label="Ta bort ${e(x.amne)} ${kortTid(x.start)}">✕</button>` : ''}</div>`).join('')}</div>` : '<div class="tom">Inga lektioner.</div>'}</div>`;
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
    <p class="tom" style="margin:0">Snart kan du i stället fotografera schemat eller klistra in en Skola24-länk, så läses det in automatiskt.</p></section>` : '';
  app.innerHTML = ram(`${topp('Schema', 'Veckans lektioner')}${barnChips()}<main class="stack" style="margin-top:12px">${kort || '<p class="tom">Inga barn än.</p>'}${form}</main>`, 'schema');
}

// ---------------------------------------------------------------- FAMILJ
async function visaFamilj() {
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
  app.innerHTML = ram(`${topp('Familj', e(S.familj?.namn || ''), '')}<main class="stack">
    ${temaDel}${foralderDel}${demoDel}
    <section class="kort"><div class="rad" style="justify-content:space-between"><span>Inloggad som <b>${e(S.medlem.namn || '')}</b> <span class="dampad liten-text">${arForalder() ? 'vuxen' : 'barn'}</span></span></div>
      <button class="knapp sekundar" data-g="loggaut">Logga ut</button></section>
  </main>`, 'familj');
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
    <div class="tva"><label class="falt">Kommun<input name="kommun" maxlength="40" value="${e(b.kommun || '')}" placeholder="för lunchmenyn"></label>
      <label class="falt">Skola<input name="skola" maxlength="80" value="${e(b.skola || '')}"></label></div>
    <label class="falt">${b.id ? 'Ny PIN (lämna tomt för att behålla)' : 'PIN för inloggning (4–6 siffror)'}<input name="pin" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="off" ${b.id ? '' : 'required'}></label>
    <p class="fel dold" data-fel></p>
    <div class="knapprad"><button class="knapp">${b.id ? 'Spara' : 'Lägg till barn'}</button>${b.id ? `<button type="button" class="knapp fara" data-g="tabortbarn" data-id="${b.id}">Ta bort</button>` : ''}</div>
  </form>`;
}

// ---------------------------------------------------------------- PLUSMENY
function visaPlusmeny() {
  const s = document.createElement('div');
  s.className = 'slojan';
  s.innerHTML = `<div class="ark" role="dialog" aria-modal="true" aria-label="Lägg till">
    <div class="topprad"><h2>Lägg till</h2><button class="rundknapp" data-g="stang" aria-label="Stäng">✕</button></div>
    <button class="kort menyval" data-g="gaTill" data-h="#/ny"><span class="ikon">${I.ny}</span><span><b>Ny händelse</b><span>Prov, läxa, träning${arForalder() ? ', lov' : ''} eller annat</span></span></button>
    <button class="kort menyval" data-g="valjForMaterial"><span class="ikon">${I.fil}</span><span><b>Nytt material</b><span>Länk, text, bild eller dokument till en läxa eller ett prov</span></span></button>
    <button class="kort menyval" disabled><span class="ikon">${I.las}</span><span><b>Läs in</b><span>Veckobrev, länk, fil eller foto – appen hittar prov och läxor. Kommer snart.</span></span></button>
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
    <div class="kort" style="gap:2px">${lista.filter((h) => !sedda.has(h.id) && sedda.add(h.id)).map((h) => postRad(h).replace(`href="#/handelse/${h.id}"`, `href="#/material/${h.id}"`)).join('') || '<p class="tom">Inga kommande händelser. Skapa en händelse först.</p>'}</div>`;
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
    if (g === 'plusmeny') return visaPlusmeny();
    if (g === 'stang') return el.closest('.slojan')?.remove();
    if (g === 'gaTill') { el.closest('.slojan')?.remove(); location.hash = el.dataset.h; return; }
    if (g === 'valjForMaterial') return valjHandelseForMaterial(el.closest('.ark'));
    if (g === 'tema') { sattTema(el.dataset.t); S.medlem.tema = el.dataset.t; await data.sattTema(el.dataset.t); return route(); }
    if (g === 'oauth') return await data.loggaInMed(el.dataset.p);
    if (g === 'loggaut') { await data.loggaUt(); location.hash = ''; location.reload(); return; }
    if (g === 'valjbarn') return visaPin(el.dataset.kod, el.dataset.id, el.dataset.namn);
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
          upprepa: ['traning', 'ovrigt'].includes(v.typ) && v.upprepa ? 'vecka' : 'ingen',
        });
        toast('Sparat'); location.hash = `#/handelse/${sparad.id}`; break;
      }
      case 'material': {
        const typ = v.typ;
        const fil = typ === 'bild' ? f.bild.files[0] : typ === 'fil' ? f.fil.files[0] : null;
        if ((typ === 'bild' || typ === 'fil') && !fil) throw new Error('Välj en fil.');
        if (fil && fil.size > 15 * 1024 * 1024) throw new Error('Filen är större än 15 MB.');
        if (typ === 'lank' && !sakerUrl(v.url)) throw new Error('Skriv en hel webblänk som börjar med https://');
        if (typ === 'text' && !v.innehall.trim()) throw new Error('Skriv eller klistra in text.');
        const titel = v.titel.trim() || (fil ? fil.name : typ === 'lank' ? new URL(v.url).hostname : 'Anteckning');
        await data.sparaMaterial({ handelse_id: f.dataset.handelse, typ, titel, url: typ === 'lank' ? v.url : null, innehall: typ === 'text' ? v.innehall : null }, fil);
        toast('Materialet är sparat'); location.hash = `#/handelse/${f.dataset.handelse}`; break;
      }
      case 'resultat':
        await data.sparaResultat({ handelse_id: S.aktuellHandelse.id, poang: nr(v.poang), max_poang: nr(v.max_poang), kommentar: v.kommentar.trim() });
        toast('Resultatet är sparat'); break;
      case 'lektion':
        if (v.slut <= v.start) throw new Error('Lektionen måste sluta efter att den börjar.');
        await data.sparaLektion({ barn_id: v.barn_id, veckodag: Number(v.veckodag), start: v.start, slut: v.slut, amne: v.amne.trim() });
        toast('Lektionen är tillagd'); await route(); break;
      case 'barn': {
        if (v.pin && !/^\d{4,6}$/.test(v.pin)) throw new Error('PIN ska vara 4–6 siffror.');
        const b = await data.sparaBarn({ id: f.dataset.id || undefined, namn: v.namn.trim(), farg: v.farg, arskurs: v.arskurs.trim(), kommun: v.kommun.trim(), skola: v.skola.trim() });
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
