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
      sammanfattning: { type: "string", description: "En mening på svenska om vad underlaget innehöll." },
    },
    required: ["forslag", "sammanfattning"],
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

// Hämtar en länk på serversidan (bara http/https, ingen intern adress, max 10 MB).
async function hamtaLank(adress: string) {
  let url: URL;
  try { url = new URL(adress); } catch { throw new Error("Länken går inte att läsa."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Bara webblänkar (https://) går att läsa in.");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1|0\.)/i.test(url.hostname)) throw new Error("Den adressen går inte att läsa.");
  const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "Veckopalten/1.0 (+https://paltpixel.se/veckopalten/)" } });
  if (!r.ok) throw new Error(`Sidan svarade med fel ${r.status}. Är den inloggningsskyddad? Kopiera då texten i stället.`);
  const typ = (r.headers.get("content-type") || "").toLowerCase();
  const bytes = new Uint8Array(await r.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) throw new Error("Filen bakom länken är för stor (över 10 MB).");
  if (typ.includes("pdf")) return { pdf: base64(bytes) };
  if (BILDTYPER.some((t) => typ.includes(t))) return { bild: base64(bytes), mediaType: BILDTYPER.find((t) => typ.includes(t))! };
  const text = new TextDecoder().decode(bytes);
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
    let underlag: { text?: string; pdf?: string; bild?: string; mediaType?: string } = {};
    if (in_.typ === "lank") underlag = await hamtaLank(String(in_.url || ""));
    else if (in_.typ === "text") underlag = { text: String(in_.text || "").slice(0, MAX_TEXT) };
    else if (in_.typ === "pdf") underlag = { pdf: String(in_.data || "") };
    else if (in_.typ === "bild") underlag = { bild: String(in_.data || ""), mediaType: BILDTYPER.includes(in_.mediaType) ? in_.mediaType : "image/jpeg" };
    else return fel(400, "Okänd typ av underlag.");
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
Lägg länkar och glosor/faktatexter som hör till en händelse under dess material. Svara genom att anropa verktyget spara_forslag.`;

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
    return svar(200, { forslag, sammanfattning: resultat.sammanfattning ?? "" });
  } catch (e) {
    console.error(e);
    return fel(400, e instanceof Error ? e.message : "Något gick fel.");
  }
});
