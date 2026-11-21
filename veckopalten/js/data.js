// Datalager: samma funktioner oavsett om appen kör mot Supabase eller i demoläge.
import { isoDatum, laggTillDagar, franIso } from './datum.js';

const K = window.VP_KONFIG || {};
const BAS = new URL('.', location.href.split('#')[0]).href; // t.ex. https://paltpixel.se/veckopalten/
export const DEMO = !(K.supabaseUrl && K.supabaseAnonKey);

// ======================================================================
// Matsedel från Mateo Meny. Försöker hämta direkt, annars via serverfunktionen.
// Svar: { enhet: { 'YYYY-MM-DD': ['Rätt 1', 'Rätt 2'] } }. Sparas en timme i webbläsaren.
// ======================================================================
// Mateo nås i första hand via paltpixel.se/mateo-api/ (en vidarekoppling i vercel.json,
// så webbläsaren slipper CORS), sedan direkt och sist via Supabase-funktionen.
const MATEO_VAGAR = ['/mateo-api/', 'https://meny-api.mateo.se/api/v1/'];
async function mateoGet(vag) {
  for (const bas of MATEO_VAGAR) {
    try {
      const r = await fetch(bas + vag, { headers: { Accept: 'application/json' } });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) continue;
      return await r.json();
    } catch { /* prova nästa väg */ }
  }
  throw new Error('Mateo går inte att nå');
}
async function hamtaMatsedel(enheter, fran, till, viaServer) {
  const unika = [...new Set(enheter.filter(Boolean).map(String))];
  if (!unika.length) return {};
  const nyckel = `vp_mat_${unika.join('_')}_${fran}_${till}`;
  try { const c = JSON.parse(sessionStorage.getItem(nyckel)); if (c && Date.now() - c.t < 36e5) return c.d; } catch {}
  const omvandla = (dagar) => Object.fromEntries((dagar || []).map((d) => [String(d.date).slice(0, 10), (d.meals || []).map((m) => String(m.name).trim()).filter(Boolean)]));
  const ut = {};
  let ratt = null;
  try {
    for (const en of unika) {
      ut[en] = omvandla(await mateoGet(`days/${en}?from=${fran}&to=${till}`));
    }
    ratt = ut;
  } catch {
    try { const svar = await viaServer({ enheter: unika, fran, till }); ratt = Object.fromEntries(Object.entries(svar || {}).map(([k, v]) => [k, omvandla(v)])); } catch { return {}; }
  }
  try { sessionStorage.setItem(nyckel, JSON.stringify({ t: Date.now(), d: ratt })); } catch {}
  return ratt;
}

// Kommuner och skolor i Mateo Meny. Hämtas direkt, annars via serverfunktionen.
const TYP_NAMN = { school: 'Grundskola', highschool: 'Gymnasium', preschool: 'Förskola' };
async function mateoHamta(vag, viaServer, body) {
  const nyckel = 'vp_mateo_' + vag;
  try { const c = JSON.parse(sessionStorage.getItem(nyckel)); if (c && Date.now() - c.t < 864e5) return c.d; } catch {}
  let d;
  try { d = await mateoGet(vag); } catch { d = await viaServer(body); }
  try { sessionStorage.setItem(nyckel, JSON.stringify({ t: Date.now(), d })); } catch {}
  return d;
}
// [{ lan, kommuner: [{ slug, namn }] }]
export async function mateoKommuner(viaServer) {
  const lan = await mateoHamta('counties', viaServer, { lista: 'kommuner' });
  return (lan || []).map((l) => ({ lan: l.name, kommuner: (l.organizations || []).filter((o) => o.slug !== 'mateo').map((o) => ({ slug: o.slug, namn: o.name })).sort((a, b) => a.namn.localeCompare(b.namn, 'sv')) }))
    .filter((l) => l.kommuner.length).sort((a, b) => a.lan.localeCompare(b.lan, 'sv'));
}
// [{ id, namn, typ }]
export async function mateoSkolor(slug, viaServer) {
  const k = await mateoHamta('organizations/' + encodeURIComponent(slug), viaServer, { kommun: slug });
  return (k?.units || []).filter((u) => TYP_NAMN[u.type]).map((u) => ({ id: u.id, namn: String(u.name).trim(), typ: TYP_NAMN[u.type] })).sort((a, b) => a.namn.localeCompare(b.namn, 'sv'));
}

// ======================================================================
// Supabase
// ======================================================================
function supabaseLager() {
  let sb = null;
  let medlem = null;

  async function klient() {
    if (sb) return sb;
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    sb = createClient(K.supabaseUrl, K.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true, storageKey: 'veckopalten-inloggning' } });
    return sb;
  }
  const fel = (e) => { if (e) throw new Error(e.message || String(e)); };

  return {
    demo: false,
    async start() {
      const s = await klient();
      const { data: { session } } = await s.auth.getSession();
      if (!session) return { inloggad: false };
      const { data, error } = await s.from('medlemmar').select('id, familj_id, roll, barn_id, namn, tema').eq('user_id', session.user.id).limit(1);
      fel(error);
      medlem = data[0] || null;
      if (!medlem) return { inloggad: true, medlem: null, anonym: !!session.user.is_anonymous };
      const f = await s.from('familjer').select('id, namn').eq('id', medlem.familj_id).single();
      fel(f.error);
      return { inloggad: true, medlem, familj: f.data };
    },
    async loggaInMed(provider) {
      const s = await klient();
      const { error } = await s.auth.signInWithOAuth({ provider, options: { redirectTo: BAS, scopes: provider === 'azure' ? 'email' : undefined } });
      fel(error);
    },
    async loggaInEpost(epost) {
      const s = await klient();
      const { error } = await s.auth.signInWithOtp({ email: epost, options: { emailRedirectTo: BAS } });
      fel(error);
    },
    async loggaUt() { const s = await klient(); await s.auth.signOut(); medlem = null; },
    async barnForKod(kod) {
      const s = await klient();
      const { data, error } = await s.rpc('barn_for_kod', { kod }); fel(error); return data;
    },
    async gaMedSomBarn(kod, barnId, pin) {
      const s = await klient();
      let { data: { session } } = await s.auth.getSession();
      if (!session) { const r = await s.auth.signInAnonymously(); fel(r.error); }
      const { data, error } = await s.rpc('ga_med_som_barn', { kod, b: barnId, pin }); fel(error);
      return !!data;
    },
    async skapaFamilj(familjenamn, mittNamn) {
      const s = await klient();
      const { error } = await s.rpc('skapa_familj', { familjenamn, mitt_namn: mittNamn }); fel(error);
    },
    async gaMedSomVuxen(kod, mittNamn) {
      const s = await klient();
      const { data, error } = await s.rpc('ga_med_som_vuxen', { kod, mitt_namn: mittNamn }); fel(error);
      return !!data;
    },
    async sattTema(t) { const s = await klient(); const { error } = await s.rpc('satt_tema', { t }); fel(error); },
    async familjekoder() {
      const s = await klient();
      const { data, error } = await s.rpc('familjekoder', { f: medlem.familj_id }); fel(error); return data[0] || null;
    },
    async nyaKoder() { const s = await klient(); const { error } = await s.rpc('nya_koder', { f: medlem.familj_id }); fel(error); },
    async nyVuxenkod() { const s = await klient(); const { error } = await s.rpc('ny_vuxenkod_for', { f: medlem.familj_id }); fel(error); },
    async medlemmar() {
      const s = await klient();
      const { data, error } = await s.from('medlemmar').select('id, roll, namn, barn_id').eq('familj_id', medlem.familj_id).order('skapad_at'); fel(error); return data;
    },
    async taBortMedlem(id) { const s = await klient(); const { error } = await s.from('medlemmar').delete().eq('id', id); fel(error); },

    async listaBarn() {
      const s = await klient();
      const { data, error } = await s.from('barn').select('*').eq('familj_id', medlem.familj_id).order('skapad_at'); fel(error); return data;
    },
    async sparaBarn(b) {
      const s = await klient();
      const rad = { namn: b.namn, farg: b.farg, arskurs: b.arskurs || null, kommun: b.kommun || null, skola: b.skola || null, mateo_enhet: b.mateo_enhet || null };
      const q = b.id ? s.from('barn').update(rad).eq('id', b.id).select().single() : s.from('barn').insert({ ...rad, familj_id: medlem.familj_id }).select().single();
      const { data, error } = await q; fel(error); return data;
    },
    async sattMatsedel(id, m) {
      const s = await klient();
      const { error } = await s.from('barn').update({ kommun: m.kommun || null, skola: m.skola || null, mateo_enhet: m.mateo_enhet || null }).eq('id', id); fel(error);
    },
    async mateoKommuner() { return mateoKommuner(async (body) => { const s = await klient(); const { data, error } = await s.functions.invoke('matsedel', { body }); if (error) throw error; return data; }); },
    async mateoSkolor(slug) { return mateoSkolor(slug, async (body) => { const s = await klient(); const { data, error } = await s.functions.invoke('matsedel', { body }); if (error) throw error; return data; }); },
    async taBortBarn(id) { const s = await klient(); const { error } = await s.from('barn').delete().eq('id', id); fel(error); },
    async sattPin(id, pin) { const s = await klient(); const { error } = await s.rpc('satt_pin', { b: id, pin }); fel(error); },

    async listaHandelser(fran, till) {
      const s = await klient();
      // Upprepade händelser som startat tidigare hämtas också.
      const { data, error } = await s.from('handelser').select('*, material(forekomst), resultat(poang, max_poang)')
        .eq('familj_id', medlem.familj_id)
        .or(`and(datum.gte.${fran},datum.lte.${till}),and(upprepa.eq.vecka,datum.lte.${till}),and(slut_datum.gte.${fran},datum.lte.${till})`)
        .order('datum');
      fel(error);
      return data.map(({ material, ...h }) => ({ ...h, material_datum: (material || []).map((m) => m.forekomst), antal_material: (material || []).length, resultat: Array.isArray(h.resultat) ? h.resultat[0] : h.resultat }));
    },
    async hamtaHandelse(id) {
      const s = await klient();
      const { data, error } = await s.from('handelser').select('*, material(*), resultat(*)').eq('id', id).single(); fel(error);
      data.resultat = Array.isArray(data.resultat) ? data.resultat[0] : data.resultat;
      data.material = (data.material || []).sort((a, b) => a.skapad_at.localeCompare(b.skapad_at));
      return data;
    },
    async sparaHandelse(h) {
      const s = await klient();
      const rad = { barn_id: h.barn_id || null, typ: h.typ, titel: h.titel, amne: h.amne || null, beskrivning: h.beskrivning || null, datum: h.datum, tid: h.tid || null, slut_datum: h.slut_datum || null, upprepa: h.upprepa || 'ingen', upprepa_veckor: h.upprepa_veckor || 1, upprepa_till: h.upprepa_till || null };
      const { data: { user } } = await s.auth.getUser();
      const q = h.id ? s.from('handelser').update(rad).eq('id', h.id).select().single() : s.from('handelser').insert({ ...rad, familj_id: medlem.familj_id, skapad_av: user.id }).select().single();
      const { data, error } = await q; fel(error); return data;
    },
    async taBortHandelse(id) { const s = await klient(); const { error } = await s.from('handelser').delete().eq('id', id); fel(error); },
    async sparaMaterial(m, fil) {
      const s = await klient();
      const { data: { user } } = await s.auth.getUser();
      let fil_sokvag = null;
      if (fil) {
        const rent = fil.name.replace(/[^\w.\-]+/g, '_').slice(-80);
        fil_sokvag = `${medlem.familj_id}/${m.handelse_id}/${Date.now()}_${rent}`;
        const up = await s.storage.from('material').upload(fil_sokvag, fil, { contentType: fil.type || undefined }); fel(up.error);
      }
      const { error } = await s.from('material').insert({ familj_id: medlem.familj_id, handelse_id: m.handelse_id, typ: m.typ, titel: m.titel, url: m.url || null, innehall: m.innehall || null, forekomst: m.forekomst || null, fil_sokvag, skapad_av: user.id, skapad_av_namn: medlem.namn });
      fel(error);
    },
    async taBortMaterial(m) {
      const s = await klient();
      if (m.fil_sokvag) await s.storage.from('material').remove([m.fil_sokvag]);
      const { error } = await s.from('material').delete().eq('id', m.id); fel(error);
    },
    async filLank(sokvag) {
      const s = await klient();
      const { data, error } = await s.storage.from('material').createSignedUrl(sokvag, 3600); fel(error); return data.signedUrl;
    },
    async sparaResultat(r) {
      const s = await klient();
      const { error } = await s.from('resultat').upsert({ handelse_id: r.handelse_id, familj_id: medlem.familj_id, poang: r.poang, max_poang: r.max_poang, kommentar: r.kommentar || null, uppdaterad_at: new Date().toISOString() }); fel(error);
    },
    async lasIn(underlag) {
      const s = await klient();
      const { data, error } = await s.functions.invoke('las-in', { body: underlag });
      if (error) {
        let t = 'AI-inläsningen svarade inte. Försök igen om en stund.';
        try { const j = await error.context.json(); if (j?.fel) t = j.fel; } catch {}
        if (error.name === 'FunctionsFetchError' || /not found/i.test(error.message)) t = 'AI-inläsningen är inte påslagen ännu.';
        throw new Error(t);
      }
      return data;
    },
    async listaInnehall(fran, till) {
      const s = await klient();
      const { data, error } = await s.from('lektionsinnehall').select('*').eq('familj_id', medlem.familj_id).gte('datum', fran).lte('datum', till); fel(error); return data;
    },
    async sparaInnehall(rader) {
      const s = await klient();
      const { error } = await s.from('lektionsinnehall').insert(rader.map((r) => ({ ...r, familj_id: medlem.familj_id }))); fel(error);
    },
    async matsedel(enheter, fran, till) { return hamtaMatsedel(enheter, fran, till, async (body) => { const s = await klient(); const { data, error } = await s.functions.invoke('matsedel', { body }); if (error) throw error; return data; }); },
    async listaLektioner() {
      const s = await klient();
      const { data, error } = await s.from('lektioner').select('*').eq('familj_id', medlem.familj_id).order('veckodag').order('start'); fel(error); return data;
    },
    async sparaLektion(l) {
      const s = await klient();
      const { error } = await s.from('lektioner').insert({ ...l, familj_id: medlem.familj_id }); fel(error);
    },
    async taBortLektion(id) { const s = await klient(); const { error } = await s.from('lektioner').delete().eq('id', id); fel(error); },
  };
}

// ======================================================================
// Demoläge: allt i localStorage, med påhittade exempel.
// ======================================================================
function demoLager() {
  const NYCKEL = 'vp_demo_v1';
  // localStorage kan saknas eller vara spärrad; då lever demon bara i minnet.
  const minne = {};
  const lager = {
    getItem: (k) => { try { return localStorage.getItem(k); } catch { return minne[k] ?? null; } },
    setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { minne[k] = v; } },
    removeItem: (k) => { try { localStorage.removeItem(k); } catch { delete minne[k]; } },
  };
  const id = () => Math.random().toString(36).slice(2, 10);
  let db;

  function seed() {
    const idag = new Date();
    const d = (n) => isoDatum(laggTillDagar(idag, n));
    // Måndag denna vecka
    const man = laggTillDagar(idag, -((idag.getDay() + 6) % 7));
    const veckodag = (wd) => isoDatum(laggTillDagar(man, wd - 1));
    const alva = 'b-alva', theo = 'b-theo';
    const h = (o) => ({ id: id(), barn_id: null, amne: null, beskrivning: null, tid: null, slut_datum: null, upprepa: 'ingen', upprepa_till: null, skapad_at: new Date().toISOString(), ...o });
    const prov = h({ barn_id: alva, typ: 'prov', titel: 'Prov: Spanska kapitel 3', amne: 'Spanska', datum: d(2), tid: '10:30', beskrivning: 'Glosor och verbböjning i presens (ser, estar, tener). Hörförståelse ingår.' });
    const handelser = [
      prov,
      h({ barn_id: theo, typ: 'laxa', titel: 'Läxa: Multiplikation 7:ans tabell', amne: 'Matematik', datum: d(1) }),
      h({ barn_id: theo, typ: 'traning', titel: 'Innebandy', tid: '17:30', datum: veckodag(4), upprepa: 'vecka' }),
      h({ barn_id: alva, typ: 'laxa', titel: 'Läxa: Glosor nästa vecka', amne: 'Spanska', datum: d(5) }),
      h({ barn_id: theo, typ: 'prov', titel: 'Prov: Sverige och Norden', amne: 'SO', datum: d(9) }),
      h({ barn_id: alva, typ: 'laxa', titel: 'Läxa: Matte s. 40–42', amne: 'Matematik', datum: d(-2) }),
      h({ barn_id: null, typ: 'lov', titel: 'Jullov', datum: '2026-12-19', slut_datum: '2027-01-11' }),
    ];
    const lek = [];
    const dagsschema = {
      [alva]: [['08:10', '09:10', 'Engelska'], ['09:20', '10:20', 'Matematik'], ['10:30', '11:30', 'Spanska'], ['12:40', '13:40', 'SO'], ['14:00', '15:00', 'Idrott']],
      [theo]: [['08:15', '09:00', 'Svenska'], ['09:10', '10:00', 'Matematik'], ['10:20', '11:10', 'NO'], ['12:30', '13:20', 'Bild'], ['13:30', '14:15', 'Engelska']],
    };
    for (const [b, rader] of Object.entries(dagsschema)) for (let wd = 1; wd <= 5; wd++) rader.forEach(([s, e, a], i) => lek.push({ id: id(), barn_id: b, veckodag: wd, start: s, slut: e, amne: wd % 2 && i === 4 ? 'Musik' : a }));
    return {
      familj: { id: 'f-demo', namn: 'Familjen Exempel', familjekod: '424242', vuxenkod: '135790' },
      jag: { id: 'm-1', roll: 'foralder', barn_id: null, namn: 'Förälder', tema: lager.getItem('vp_tema') || 'soluppgang' },
      medlemmar: [{ id: 'm-1', roll: 'foralder', namn: 'Förälder', barn_id: null }, { id: 'm-2', roll: 'barn', namn: 'Alva', barn_id: alva }],
      barn: [
        { id: alva, namn: 'Alva', farg: '#2F6FD0', arskurs: 'åk 7', kommun: 'umea', skola: 'Exempelskolan', mateo_enhet: 1 },
        { id: theo, namn: 'Theo', farg: '#D9781A', arskurs: 'åk 4', kommun: 'umea', skola: 'Lillskolan', mateo_enhet: 2 },
      ],
      handelser,
      material: [
        { id: id(), handelse_id: prov.id, typ: 'lank', titel: 'Glosor kapitel 3 på Quizlet', url: 'https://quizlet.com', skapad_av_namn: 'Förälder', skapad_at: new Date().toISOString() },
        { id: id(), handelse_id: prov.id, typ: 'text', titel: 'Verb att kunna', innehall: 'ser – att vara (permanent)\nestar – att vara (tillfälligt)\ntener – att ha', skapad_av_namn: 'Alva', skapad_at: new Date().toISOString() },
      ],
      resultat: [],
      lektioner: lek,
      innehall: [{ id: id(), barn_id: theo, datum: d(0), amne: 'NO', innehall: 'Vi undersöker magneter' }, { id: id(), barn_id: alva, datum: veckodag(2), amne: 'Idrott', innehall: 'Lekar' }],
      inloggad: true,
    };
  }
  function ladda() { try { db = JSON.parse(lager.getItem(NYCKEL)); } catch (e) { db = null; } if (!db) { db = seed(); spara(); } }
  function spara() { lager.setItem(NYCKEL, JSON.stringify(db)); }
  const synligt = (barnId) => db.jag.roll === 'foralder' || barnId === null || barnId === db.jag.barn_id;
  const kraverForalder = () => { if (db.jag.roll !== 'foralder') throw new Error('Bara föräldrar kan göra det.'); };
  const kanSkriva = (barnId) => { if (!(db.jag.roll === 'foralder' || (barnId && barnId === db.jag.barn_id))) throw new Error('Ingen behörighet.'); };

  return {
    demo: true,
    async start() {
      ladda();
      if (!db.inloggad) return { inloggad: false };
      return { inloggad: true, medlem: { ...db.jag, familj_id: db.familj.id }, familj: { id: db.familj.id, namn: db.familj.namn } };
    },
    async loggaInMed() { db.inloggad = true; db.jag = { ...db.jag, roll: 'foralder', barn_id: null, namn: 'Förälder' }; spara(); location.hash = '#/idag'; location.reload(); },
    async loggaInEpost() { return this.loggaInMed(); },
    async loggaUt() { ladda(); db.inloggad = false; spara(); },
    async barnForKod(kod) { ladda(); return kod.trim().toUpperCase() === db.familj.familjekod ? db.barn.map(({ id, namn, farg }) => ({ id, namn, farg })) : []; },
    async gaMedSomBarn(kod, barnId, pin) {
      ladda();
      if (kod.trim().toUpperCase() !== db.familj.familjekod || pin !== '1234') return false;
      const b = db.barn.find((x) => x.id === barnId);
      db.inloggad = true; db.jag = { ...db.jag, roll: 'barn', barn_id: barnId, namn: b.namn }; spara(); return true;
    },
    async skapaFamilj() {}, async gaMedSomVuxen() { return true; },
    async sattTema(t) { db.jag.tema = t; spara(); },
    async familjekoder() { kraverForalder(); return { familjekod: db.familj.familjekod, vuxenkod: db.familj.vuxenkod, vuxenkod_giltig_till: new Date(Date.now() + 7 * 864e5).toISOString() }; },
    async nyaKoder() { kraverForalder(); },
    async nyVuxenkod() { kraverForalder(); },
    async medlemmar() { return db.jag.roll === 'foralder' ? db.medlemmar : db.medlemmar.filter((m) => m.barn_id === db.jag.barn_id); },
    async taBortMedlem(mid) { kraverForalder(); db.medlemmar = db.medlemmar.filter((m) => m.id !== mid); spara(); },
    async listaBarn() { return db.barn.filter((b) => synligt(b.id)); },
    async sparaBarn(b) { kraverForalder(); if (b.id) Object.assign(db.barn.find((x) => x.id === b.id), b); else db.barn.push({ ...b, id: id() }); spara(); },
    async taBortBarn(bid) { kraverForalder(); db.barn = db.barn.filter((b) => b.id !== bid); db.handelser = db.handelser.filter((h) => h.barn_id !== bid); spara(); },
    async sattPin() { kraverForalder(); },
    async listaHandelser(fran, till) {
      return db.handelser.filter((h) => synligt(h.barn_id) && ((h.datum >= fran && h.datum <= till) || (h.upprepa === 'vecka' && h.datum <= till) || (h.slut_datum && h.slut_datum >= fran && h.datum <= till)))
        .map((h) => ({ ...h, material_datum: db.material.filter((m) => m.handelse_id === h.id).map((m) => m.forekomst || null), antal_material: db.material.filter((m) => m.handelse_id === h.id).length, resultat: db.resultat.find((r) => r.handelse_id === h.id) }))
        .sort((a, b) => a.datum.localeCompare(b.datum));
    },
    async hamtaHandelse(hid) {
      const h = db.handelser.find((x) => x.id === hid);
      if (!h || !synligt(h.barn_id)) throw new Error('Hittade inte händelsen.');
      return { ...h, material: db.material.filter((m) => m.handelse_id === hid), resultat: db.resultat.find((r) => r.handelse_id === hid) };
    },
    async sparaHandelse(h) {
      kanSkriva(h.barn_id || null);
      if (h.id) { const o = db.handelser.find((x) => x.id === h.id); kanSkriva(o.barn_id); Object.assign(o, h); spara(); return o; }
      const ny = { ...h, id: id(), skapad_at: new Date().toISOString() }; db.handelser.push(ny); spara(); return ny;
    },
    async taBortHandelse(hid) { kraverForalder(); db.handelser = db.handelser.filter((h) => h.id !== hid); db.material = db.material.filter((m) => m.handelse_id !== hid); spara(); },
    async sparaMaterial(m, fil) {
      const h = db.handelser.find((x) => x.id === m.handelse_id); kanSkriva(h.barn_id);
      let url = m.url;
      if (fil) url = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(fil); });
      if (fil && fil.size > 1.5e6) throw new Error('I demoläget går det bara att spara filer under 1,5 MB.');
      db.material.push({ ...m, url, id: id(), skapad_av_namn: db.jag.namn, skapad_at: new Date().toISOString() }); spara();
    },
    async taBortMaterial(m) { kraverForalder(); db.material = db.material.filter((x) => x.id !== m.id); spara(); },
    async filLank() { return null; },
    async sparaResultat(r) {
      const h = db.handelser.find((x) => x.id === r.handelse_id); kanSkriva(h.barn_id);
      db.resultat = db.resultat.filter((x) => x.handelse_id !== r.handelse_id); db.resultat.push(r); spara();
    },
    async listaLektioner() { return db.lektioner.filter((l) => synligt(l.barn_id)); },
    async listaInnehall(fran, till) { db.innehall ||= []; return db.innehall.filter((r) => synligt(r.barn_id) && r.datum >= fran && r.datum <= till); },
    async sparaInnehall(rader) { db.innehall ||= []; for (const r of rader) { kanSkriva(r.barn_id); db.innehall.push({ ...r, id: id() }); } spara(); },
    async sattMatsedel(bid, m) { kraverForalder(); Object.assign(db.barn.find((x) => x.id === bid), { kommun: m.kommun || '', skola: m.skola || '', mateo_enhet: m.mateo_enhet || null }); spara(); },
    async mateoKommuner() { return mateoKommuner(async () => [{ name: 'Norrbottens län', organizations: [{ slug: 'pitea', name: 'Piteå' }] }, { name: 'Västerbottens län', organizations: [{ slug: 'umea', name: 'Umeå' }] }]); },
    async mateoSkolor(slug) { return mateoSkolor(slug, async () => ({ units: [{ id: 1, name: 'Exempelskolan', type: 'school' }, { id: 2, name: 'Lillskolan', type: 'school' }, { id: 3, name: 'Gymnasiet', type: 'highschool' }] })); },
    async matsedel(enheter, fran, till) {
      const ratter = [['Köttbullar med potatismos och lingon', 'Vegobullar med potatismos'], ['Fiskgratäng med kokt potatis', 'Grönsaksgratäng'], ['Pasta med köttfärssås', 'Pasta med linsbolognese'], ['Kycklinggryta med ris', 'Kikärtsgryta med ris'], ['Pannkakor med sylt', 'Ärtsoppa']];
      const ut = {};
      for (const en of enheter) { ut[en] = {}; for (let d = franIso(fran); isoDatum(d) <= till; d = laggTillDagar(d, 1)) { const vd = d.getDay(); if (vd >= 1 && vd <= 5) ut[en][isoDatum(d)] = ratter[(vd - 1 + Number(en)) % 5]; } }
      return ut;
    },
    async lasIn(u) {
      await new Promise((ok) => setTimeout(ok, 1200));
      const d = (n) => isoDatum(laggTillDagar(new Date(), n));
      const b = u.barnId || (db.jag.roll === 'barn' ? db.jag.barn_id : 'b-alva');
      if (u.typ === 'lank' && /\.ics|webcal|calendar/i.test(u.url || '')) {
        const forslag = Array.from({ length: 20 }, (_, i) => ({ typ: 'traning', titel: i % 4 === 3 ? 'Match P14' : 'Handbollsträning P14', amne: '', datum: d(1 + i * 3), tid: '18:00', slut_datum: null, barn_id: b, beskrivning: 'Plats: Pitholmshallen', material: [], sakerhet: 'hog' }));
        return { forslag, lektioner: [], lektionsinnehall: [], kalender: true, sammanfattning: `Kalendern har ${forslag.length} kommande aktiviteter.` };
      }
      if (u.typ === 'pdf') return { sammanfattning: 'Exempel i demoläget: ett veckoschema.', forslag: [], schema_barn_id: b,
        lektioner: [1, 2, 3, 4, 5].flatMap((vd) => [['08:10', '09:00', 'Svenska'], ['09:15', '10:05', 'Matematik'], ['10:20', '11:10', vd % 2 ? 'Engelska' : 'NO'], ['12:30', '13:20', vd === 3 ? 'Idrott och hälsa' : 'SO']].map(([start, slut, amne]) => ({ veckodag: vd, start, slut, amne }))) };
      return {
        sammanfattning: 'Exempel i demoläget: veckobrev med ett prov, en läxa och ett lov.',
        forslag: [
          { typ: 'prov', titel: 'Engelska: oregelbundna verb', amne: 'Engelska', datum: d(6), tid: '09:20', slut_datum: null, barn_id: b, beskrivning: 'Verben på sidan 34–35 i textboken.', material: [{ typ: 'lank', titel: 'Öva verben', url: 'https://example.com/verb', innehall: '' }], sakerhet: 'hog' },
          { typ: 'laxa', titel: 'Läsläxa kapitel 5', amne: 'Svenska', datum: d(3), tid: null, slut_datum: null, barn_id: b, beskrivning: 'Läs kapitel 5 och svara på frågorna.', material: [], sakerhet: 'medel' },
          { typ: 'lov', titel: 'Studiedag', amne: '', datum: d(11), tid: null, slut_datum: null, barn_id: null, beskrivning: 'Skolan är stängd.', material: [], sakerhet: 'lag' },
        ],
        lektionsinnehall: [{ datum: d(2), amne: 'Idrott och hälsa', innehall: 'Orientering – ta med ombyte för utomhus', barn_id: b }],
      };
    },
    async sparaLektion(l) { kraverForalder(); db.lektioner.push({ ...l, id: id() }); spara(); },
    async taBortLektion(lid) { kraverForalder(); db.lektioner = db.lektioner.filter((l) => l.id !== lid); spara(); },
    // Bara i demoläget: visa appen som förälder eller som ett barn.
    async demoVisaSom(barnId) {
      if (barnId) { const b = db.barn.find((x) => x.id === barnId); db.jag = { ...db.jag, roll: 'barn', barn_id: barnId, namn: b.namn }; }
      else db.jag = { ...db.jag, roll: 'foralder', barn_id: null, namn: 'Förälder' };
      spara();
    },
    async demoAterstall() { lager.removeItem(NYCKEL); },
  };
}

export const data = DEMO ? demoLager() : supabaseLager();
