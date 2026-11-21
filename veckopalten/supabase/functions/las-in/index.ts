// Veckopalten – serverfunktionen "las-in".
// Tar emot en länk, text, bild eller PDF, låter Claude hitta prov, läxor, träningar och lov,
// och skickar tillbaka förslag som familjen granskar innan något sparas.
//
// Hemligheter (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   – nyckeln från Claude Console (krävs)
//   VP_AI_MODELL        – valfritt, standard claude-haiku-4-5
//   VP_AI_GRANS_MANAD   – valfritt, max inläsningar per familj och månad, standard 200
// SUPABASE_URL, SUPABASE_ANON_KEY och SUPABASE_SERVICE_ROLE_KEY finns automatiskt.

import { createClient } from "npm:@supabase/supabase-js@2";

const MODELL = Deno.env.get("VP_AI_MODELL") ?? "claude-haiku-4-5";
const GRANS = Number(Deno.env.get("VP_AI_GRANS_MANAD") ?? "200");
const MAX_TEXT = 60_000;
const BILDTYPER = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const svar = (status: number, kropp: unknown) =>
  new Response(JSON.stringify(kropp), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const fel = (status: number, meddelande: string) => svar(status, { fel: meddelande });

// Verktyget Claude ska fylla i. Strukturen styr vad som kommer tillbaka.
const VERKTYG = {
  name: "spara_forslag",
  description: "Spara de skoluppgifter som hittades i underlaget som förslag till familjens kalender.",
  input_schema: {
    type: "object",
    properties: {
      forslag: {
        type: "array",
        description: "En post per prov, läxa, träning, lov eller annan händelse. Tom lista om inget hittades.",
        items: {
          type: "object",
          properties: {
            typ: { type: "string", enum: ["prov", "laxa", "traning", "lov", "ovrigt"] },
            titel: { type: "string", description: "Kort rubrik på svenska, utan ordet Prov/Läxa först, t.ex. 'Glosor kapitel 4'." },
            amne: { type: "string", description: "Skolämne om det framgår, annars tom sträng." },
            datum: { type: "string", description: "YYYY-MM-DD. Första dagen för lov." },
            tid: { type: "string", description: "HH:MM om en tid anges, annars tom sträng." },
            slut_datum: { type: "string", description: "YYYY-MM-DD, bara för lov som pågår flera dagar, annars tom sträng." },
            barn: { type: "string", description: "Namnet på barnet det gäller, exakt som i listan över barn, eller tom sträng om det är oklart eller gäller alla." },
            beskrivning: { type: "string", description: "Vad som ska kunnas eller göras: sidor, kapitel, moment, utrustning. Kort, på svenska." },
            material: {
              type: "array",
              description: "Instuderingsmaterial som hör till just den här händelsen: länkar eller korta texter (t.ex. glosor).",
              items: {
                type: "object",
                properties: {
                  typ: { type: "string", enum: ["lank", "text"] },
                  titel: { type: "string" },
                  url: { type: "string", description: "Fullständig https-länk för typ lank, annars tom sträng." },
                  innehall: { type: "string", description: "Texten för typ text, annars tom sträng." },
                },
                required: ["typ", "titel", "url", "innehall"],
              },
            },
            sakerhet: { type: "string", enum: ["hog", "medel", "lag"], description: "Hur säkert datum och innehåll är." },
          },
          required: ["typ", "titel", "amne", "datum", "tid", "slut_datum", "barn", "beskrivning", "material", "sakerhet"],
        },
      },
      lektioner: {
        type: "array",
        description: "Om underlaget är ett lektionsschema: varje lektion som återkommer varje vecka. Annars tom lista.",
        items: {
          type: "object",
          properties: {
            veckodag: { type: "integer", minimum: 1, maximum: 7, description: "1 = måndag, 5 = fredag." },
            start: { type: "string", description: "HH:MM" },
            slut: { type: "string", description: "HH:MM" },
            amne: { type: "string", description: "Ämnet, kort, t.ex. 'Matematik' eller 'Idrott och hälsa'. Ta med sal i parentes om den står." },
          },
          required: ["veckodag", "start", "slut", "amne"],
        },
      },
      lektionsinnehall: {
        type: "array",
        description: "Vad enskilda lektioner handlar om vissa dagar, t.ex. 'Lekar' på idrotten tisdag eller 'Bråktal' på matten. Bara när underlaget säger det. Prov och läxor läggs inte här.",
        items: {
          type: "object",
          properties: {
            datum: { type: "string", description: "YYYY-MM-DD" },
            amne: { type: "string", description: "Ämnet, med samma namn som i schemat om det finns." },
            innehall: { type: "string", description: "Kort, t.ex. 'Lekar' eller 'Vi börjar med bråktal, ta med miniräknare'." },
            barn: { type: "string", description: "Barnets namn som i listan, eller tom sträng." },
          },
          required: ["datum", "amne", "innehall", "barn"],
        },
      },
      schema_barn: { type: "string", description: "Namnet på barnet schemat gäller, exakt som i listan över barn, eller tom sträng." },
      sammanfattning: { type: "string", description: "En mening på svenska om vad underlaget innehöll." },
    },
    required: ["forslag", "lektioner", "lektionsinnehall", "schema_barn", "sammanfattning"],
  },
};

function htmlTillText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
}

function base64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// Google Docs, Kalkylark, Presentationer och Drive-filer läses via deras export-adresser,
// annars får man bara ett tomt skal av sidan.
function googleExport(url: URL): URL {
  if (!/(^|\.)google\.com$/.test(url.hostname)) return url;
  const m = url.pathname.match(/^\/(document|spreadsheets|presentation)\/d\/([\w-]{20,})/);
  if (m && url.hostname === "docs.google.com") {
    if (m[1] === "document") return new URL(`https://docs.google.com/document/d/${m[2]}/export?format=txt`);
    if (m[1] === "spreadsheets") { const gid = url.hash.match(/gid=(\d+)/)?.[1] ?? url.searchParams.get("gid"); return new URL(`https://docs.google.com/spreadsheets/d/${m[2]}/export?format=csv${gid ? "&gid=" + gid : ""}`); }
    return new URL(`https://docs.google.com/presentation/d/${m[2]}/export/txt`);
  }
  const f = url.pathname.match(/^\/file\/d\/([\w-]{20,})/) ?? (url.pathname === "/open" ? [null, url.searchParams.get("id")] : null);
  if (url.hostname === "drive.google.com" && f?.[1]) return new URL(`https://drive.google.com/uc?export=download&id=${f[1]}`);
  return url;
}

// En kalenderhändelse från en .ics-fil eller kalenderprenumeration.
type KalHandelse = { titel: string; datum: string; tid: string | null; plats: string; beskrivning: string; upprepa_veckor: number; upprepa_till: string | null };
function lasIcs(text: string): KalHandelse[] {
  const rader = text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const ut: KalHandelse[] = [];
  const avesc = (v: string) => v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1").trim();
  const sthlm = (d: Date) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
    return { datum: `${p.year}-${p.month}-${p.day}`, tid: `${p.hour}:${p.minute}` };
  };
  const tolka = (nyckel: string, v: string) => {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
    if (!m) return null;
    if (!m[4]) return { datum: `${m[1]}-${m[2]}-${m[3]}`, tid: null };
    if (m[7]) return sthlm(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])));
    return { datum: `${m[1]}-${m[2]}-${m[3]}`, tid: `${m[4]}:${m[5]}` }; // lokal tid (TZID antas vara svensk)
  };
  let h: Record<string, string> | null = null;
  for (const rad of rader) {
    if (rad === "BEGIN:VEVENT") { h = {}; continue; }
    if (rad === "END:VEVENT") {
      if (h && h.DTSTART && h.STATUS !== "CANCELLED") {
        const start = tolka("DTSTART", h.DTSTART);
        if (start) {
          const rr = h.RRULE || "";
          const vecka = /FREQ=WEEKLY/.test(rr);
          const intervall = Math.min(8, Math.max(1, Number(rr.match(/INTERVAL=(\d+)/)?.[1] ?? 1)));
          const until = rr.match(/UNTIL=(\d{8}(?:T\d{6}Z?)?)/)?.[1];
          ut.push({
            titel: avesc(h.SUMMARY || "Aktivitet").slice(0, 120), datum: start.datum, tid: start.tid,
            plats: avesc(h.LOCATION || ""), beskrivning: avesc(h.DESCRIPTION || "").slice(0, 1000),
            upprepa_veckor: vecka ? intervall : 0, upprepa_till: vecka && until ? tolka("UNTIL", until)?.datum ?? null : null,
          });
        }
      }
      h = null; continue;
    }
    if (!h) continue;
    const i = rad.indexOf(":"); if (i < 0) continue;
    const nyckel = rad.slice(0, i).split(";")[0].toUpperCase();
    if (!(nyckel in h)) h[nyckel] = rad.slice(i + 1);
  }
  return ut;
}

// Hämtar en länk på serversidan (bara http/https, ingen intern adress, max 10 MB).
async function hamtaLank(adress: string) {
  let url: URL;
  try { url = new URL(adress.trim().replace(/^webcals?:\/\//i, "https://")); } catch { throw new Error("Länken går inte att läsa."); }
  url = googleExport(url);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Bara webblänkar (https://) går att läsa in.");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1|0\.)/i.test(url.hostname)) throw new Error("Den adressen går inte att läsa.");
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "Veckopalten/1.0 (+https://paltpixel.se/veckopalten/)" } });
  const arGoogle = /google\.com$/.test(url.hostname);
  if (arGoogle && (/accounts\.google\.com|ServiceLogin/.test(r.url) || r.status === 401 || r.status === 403 || r.status === 404))
    throw new Error("Google-dokumentet är inte delat. Öppna det, tryck Dela och välj Allmän åtkomst: Alla med länken. Försök sedan igen.");
  if (!r.ok) throw new Error(`Sidan svarade med fel ${r.status}. Är den inloggningsskyddad? Kopiera då texten i stället.`);
  const typ = (r.headers.get("content-type") || "").toLowerCase();
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Filen bakom länken är för stor (över 10 MB).");
  if (typ.includes("pdf")) return { pdf: base64(bytes) };
  if (BILDTYPER.some((t) => typ.includes(t))) return { bild: base64(bytes), mediaType: BILDTYPER.find((t) => typ.includes(t))! };
  const text = new TextDecoder().decode(bytes);
  if (typ.includes("calendar") || /^\s*BEGIN:VCALENDAR/.test(text)) return { kalender: lasIcs(text) };
  if (arGoogle && typ.includes("html") && /accounts\.google\.com/.test(text.slice(0, 5000))) throw new Error("Google-dokumentet är inte delat. Öppna det, tryck Dela och välj Allmän åtkomst: Alla med länken. Försök sedan igen.");
  return { text: (typ.includes("html") ? htmlTillText(text) : text).slice(0, MAX_TEXT) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fel(405, "Fel metod.");
  try {
    const nyckel = Deno.env.get("ANTHROPIC_API_KEY");
    if (!nyckel) return fel(500, "AI-inläsningen är inte påslagen ännu (API-nyckel saknas).");

    // Användaren, med användarens egna rättigheter (radsäkerheten gäller).
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return fel(401, "Du är inte inloggad.");
    const { data: medlem } = await sb.from("medlemmar").select("familj_id, roll, barn_id").eq("user_id", user.id).limit(1).maybeSingle();
    if (!medlem) return fel(403, "Du hör inte till någon familj.");
    const { data: barn } = await sb.from("barn").select("id, namn, arskurs").eq("familj_id", medlem.familj_id);

    // Månadstak per familj.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const manadStart = new Date(); manadStart.setUTCDate(1); manadStart.setUTCHours(0, 0, 0, 0);
    const { count } = await admin.from("ai_anvandning").select("*", { count: "exact", head: true }).eq("familj_id", medlem.familj_id).gte("tid", manadStart.toISOString());
    if ((count ?? 0) >= GRANS) return fel(429, `Familjen har använt alla ${GRANS} inläsningar den här månaden.`);

    // Underlaget.
    const in_ = await req.json();
    let underlag: { text?: string; pdf?: string; bild?: string; mediaType?: string; kalender?: KalHandelse[] } = {};
    if (in_.typ === "lank") underlag = await hamtaLank(String(in_.url || ""));
    else if (in_.typ === "text" && /^\s*BEGIN:VCALENDAR/.test(String(in_.text || ""))) underlag = { kalender: lasIcs(String(in_.text)) };
    else if (in_.typ === "text") underlag = { text: String(in_.text || "").slice(0, MAX_TEXT) };
    else if (in_.typ === "pdf") underlag = { pdf: String(in_.data || "") };
    else if (in_.typ === "bild") underlag = { bild: String(in_.data || ""), mediaType: BILDTYPER.includes(in_.mediaType) ? in_.mediaType : "image/jpeg" };
    else return fel(400, "Okänd typ av underlag.");
    // Kalender (.ics / prenumeration): läses direkt, utan AI. Alla kommande aktiviteter blir förslag.
    if (underlag.kalender) {
      const valt = (barn ?? []).find((b) => b.id === in_.barnId);
      const barnId = medlem.roll === "barn" ? medlem.barn_id : (valt?.id ?? null);
      const idagIso = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
      const gräns = new Date(Date.now() + 200 * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
      const kommande = underlag.kalender
        .filter((k) => (k.upprepa_veckor ? (!k.upprepa_till || k.upprepa_till >= idagIso) : k.datum >= idagIso) && k.datum <= gräns)
        .sort((a, b) => (a.datum + (a.tid ?? "")).localeCompare(b.datum + (b.tid ?? ""))).slice(0, 150);
      const forslag = kommande.map((k) => ({
        typ: "traning", titel: k.titel, amne: "", datum: k.datum, tid: k.tid, slut_datum: null, barn_id: barnId,
        beskrivning: [k.plats && `Plats: ${k.plats}`, k.beskrivning].filter(Boolean).join("\n").slice(0, 4000),
        material: [], sakerhet: "hog", upprepa_veckor: k.upprepa_veckor, upprepa_till: k.upprepa_till,
      }));
      return svar(200, { forslag, lektioner: [], lektionsinnehall: [], schema_barn_id: null, kalender: true,
        sammanfattning: forslag.length ? `Kalendern har ${forslag.length} kommande aktiviteter.` : "Kalendern har inga kommande aktiviteter." });
    }
    if (underlag.text !== undefined && underlag.text.trim().length < 5) return fel(400, "Det finns ingen text att läsa.");
    if ((underlag.pdf?.length ?? 0) > 14_000_000 || (underlag.bild?.length ?? 0) > 7_000_000) return fel(400, "Filen är för stor.");

    const idag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });
    const veckodag = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm", weekday: "long" });
    const barnLista = (barn ?? []).map((b) => `- ${b.namn}${b.arskurs ? ` (${b.arskurs})` : ""}`).join("\n") || "- (inga barn inlagda)";
    const valtBarn = (barn ?? []).find((b) => b.id === in_.barnId);
    const instruktion = `Du hjälper en svensk familj att föra in skoluppgifter i en kalender.
Idag är det ${veckodag} ${idag}. Använd det för att räkna ut datum som "på fredag", "nästa vecka" eller "v. 49" (veckor räknas enligt ISO). Datum utan år ligger i närmaste framtid.
Barnen i familjen:
${barnLista}
${valtBarn ? `Underlaget gäller ${valtBarn.namn}. Sätt barn till "${valtBarn.namn}" om inget annat framgår tydligt.` : "Avgör vilket barn det gäller utifrån namn, klass eller årskurs. Är det oklart, lämna barn tomt."}
Hitta alla prov, läxor, träningar, lov och andra händelser med datum. Ta inte med sådant som redan har varit. Hitta inte på något: saknas datum, gissa bara om det tydligt framgår av sammanhanget, och sätt då sakerhet till lag.
Lägg länkar och glosor/faktatexter som hör till en händelse under dess material.
Fyll bara i lektioner om underlaget är ett riktigt lektionsschema (t.ex. från Skola24 eller en schemabild) med ämnen och tider för hela veckan. Ett veckobrev eller en planering är inget schema: aktiviteter där som "Tis: Mattestuga 14:30–15:00" eller "Fre: Schack" blir händelser (typ ovrigt) med datum den veckan, och det som sägs om en vanlig lektion ("Ons: Idrott – bollsport") läggs under lektionsinnehall. Lägg aldrig sådant under lektioner.
Om underlaget är ett lektionsschema: fyll i lektioner med alla lektioner måndag–fredag och lägg dem inte som händelser. Veckodag 1 är måndag, 2 tisdag osv. Kontrollera att varje lektion hamnar på rätt dag. Raster och lunch tas inte med. Prov eller annat som står i schemat läggs ändå som händelser.
Står det vad en lektion ska handla om en viss dag (t.ex. idrott: lekar, slöjd: ta med förkläde), lägg det under lektionsinnehall.
Svara genom att anropa verktyget spara_forslag.`;

    const innehall: unknown[] = [];
    if (underlag.pdf) innehall.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: underlag.pdf } });
    if (underlag.bild) innehall.push({ type: "image", source: { type: "base64", media_type: underlag.mediaType, data: underlag.bild } });
    if (underlag.text) innehall.push({ type: "text", text: `Underlag:\n"""\n${underlag.text}\n"""` });
    innehall.push({ type: "text", text: instruktion });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": nyckel, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELL, max_tokens: 4096, tools: [VERKTYG], tool_choice: { type: "tool", name: "spara_forslag" }, messages: [{ role: "user", content: innehall }] }),
      signal: AbortSignal.timeout(90_000),
    });
    const ai = await r.json();
    if (!r.ok) {
      console.error("Claude-fel", r.status, JSON.stringify(ai).slice(0, 500));
      const t = ai?.error?.type === "invalid_request_error" && /credit/i.test(ai?.error?.message ?? "") ? "Krediterna för AI-inläsningen är slut." : "AI-tjänsten svarade inte som den skulle. Försök igen om en stund.";
      return fel(502, t);
    }
    const anrop = (ai.content ?? []).find((c: { type: string }) => c.type === "tool_use");
    const resultat = anrop?.input ?? { forslag: [], sammanfattning: "" };

    await admin.from("ai_anvandning").insert({ familj_id: medlem.familj_id, user_id: user.id, typ: in_.typ, in_tokens: ai.usage?.input_tokens ?? null, ut_tokens: ai.usage?.output_tokens ?? null });

    // Koppla barnens namn till id. Ett barn får bara förslag för sig själv.
    const namnTillId = new Map((barn ?? []).map((b) => [b.namn.toLowerCase(), b.id]));
    const datumOk = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    const forslag = (resultat.forslag ?? []).filter((f: { datum: string }) => datumOk(f.datum)).map((f: Record<string, unknown>) => {
      let barnId = namnTillId.get(String(f.barn || "").toLowerCase()) ?? (valtBarn?.id ?? null);
      if (medlem.roll === "barn") barnId = medlem.barn_id;
      return {
        typ: f.typ, titel: String(f.titel || "").slice(0, 120), amne: String(f.amne || "").slice(0, 60),
        datum: f.datum, tid: /^\d{1,2}:\d{2}$/.test(String(f.tid)) ? f.tid : null,
        slut_datum: datumOk(String(f.slut_datum)) ? f.slut_datum : null,
        barn_id: f.typ === "lov" && !f.barn ? null : barnId,
        beskrivning: String(f.beskrivning || "").slice(0, 4000),
        material: (Array.isArray(f.material) ? f.material : []).slice(0, 10),
        sakerhet: f.sakerhet,
      };
    });
    const tidOk = (t: string) => /^\d{1,2}[:.]\d{2}$/.test(t);
    const tid = (t: string) => t.replace(".", ":").padStart(5, "0");
    const lektioner = (Array.isArray(resultat.lektioner) ? resultat.lektioner : [])
      .filter((l: Record<string, unknown>) => Number(l.veckodag) >= 1 && Number(l.veckodag) <= 7 && tidOk(String(l.start)) && tidOk(String(l.slut)) && String(l.amne || "").trim())
      .map((l: Record<string, unknown>) => ({ veckodag: Number(l.veckodag), start: tid(String(l.start)), slut: tid(String(l.slut)), amne: String(l.amne).trim().slice(0, 40) }))
      .slice(0, 80);
    let schemaBarn = namnTillId.get(String(resultat.schema_barn || "").toLowerCase()) ?? (valtBarn?.id ?? null);
    if (medlem.roll === "barn") schemaBarn = medlem.barn_id;
    const innehall_ = (Array.isArray(resultat.lektionsinnehall) ? resultat.lektionsinnehall : [])
      .filter((l: Record<string, unknown>) => datumOk(String(l.datum)) && String(l.amne || "").trim() && String(l.innehall || "").trim())
      .map((l: Record<string, unknown>) => ({
        datum: l.datum, amne: String(l.amne).trim().slice(0, 60), innehall: String(l.innehall).trim().slice(0, 500),
        barn_id: medlem.roll === "barn" ? medlem.barn_id : (namnTillId.get(String(l.barn || "").toLowerCase()) ?? valtBarn?.id ?? null),
      })).slice(0, 60);
    return svar(200, { forslag, lektioner, lektionsinnehall: innehall_, schema_barn_id: schemaBarn, sammanfattning: resultat.sammanfattning ?? "" });
  } catch (e) {
    console.error(e);
    return fel(400, e instanceof Error ? e.message : "Något gick fel.");
  }
});
