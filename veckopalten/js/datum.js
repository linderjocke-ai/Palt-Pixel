// Datumhjälp. Alla datum hanteras som lokala datum (YYYY-MM-DD).
export const VECKODAGAR = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
export const VD_KORT = ['sön', 'mån', 'tis', 'ons', 'tor', 'fre', 'lör'];
export const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'];

const tva = (n) => String(n).padStart(2, '0');
export const isoDatum = (d) => `${d.getFullYear()}-${tva(d.getMonth() + 1)}-${tva(d.getDate())}`;
export const franIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const laggTillDagar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const mandag = (d) => laggTillDagar(d, -((d.getDay() + 6) % 7));
export const veckodagNr = (d) => ((d.getDay() + 6) % 7) + 1; // 1 = måndag

export function veckonummer(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dag = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dag);
  const ar = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - ar) / 864e5 + 1) / 7);
}

export const storBokstav = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const langtDatum = (d) => `${storBokstav(VECKODAGAR[d.getDay()])} ${d.getDate()} ${MANADER[d.getMonth()]}`;
export const kortTid = (t) => (t ? t.slice(0, 5) : '');
export const minuter = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Ger alla förekomster av händelser inom [fran, till] (veckovis upprepning och flerdagars lov).
export function forekomster(handelser, fran, till) {
  const ut = [];
  for (const h of handelser) {
    if (h.upprepa === 'vecka') {
      let d = franIso(h.datum);
      const slut = h.upprepa_till && h.upprepa_till < till ? h.upprepa_till : till;
      while (d < franIso(fran)) d = laggTillDagar(d, 7);
      for (; isoDatum(d) <= slut; d = laggTillDagar(d, 7)) ut.push({ ...h, dag: isoDatum(d) });
    } else if (h.slut_datum && h.slut_datum > h.datum) {
      ut.push({ ...h, dag: h.datum < fran ? fran : h.datum });
    } else if (h.datum >= fran && h.datum <= till) {
      ut.push({ ...h, dag: h.datum });
    }
  }
  return ut.sort((a, b) => (a.dag + (a.tid || '')).localeCompare(b.dag + (b.tid || '')));
}

// Ligger dagen inom ett lov?
export const arLov = (dag, handelser) => handelser.some((h) => h.typ === 'lov' && h.datum <= dag && (h.slut_datum || h.datum) >= dag);
