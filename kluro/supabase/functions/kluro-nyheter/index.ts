// Kluro – nyhetsquizet. Hämtar veckans nyheter från SVT och låter Claude skriva frågorna.
// Flyttad från skolvy.se (api/public/kluro-news). Kräver hemligheten ANTHROPIC_API_KEY.
// Deployas med verify_jwt=false: spelarna har inga konton, behörigheten kontrolleras nedan
// (spelarkod, spelledarens PIN eller att rummet finns), precis som på skolvy.
import { createClient } from "npm:@supabase/supabase-js@2";

const MODELL = Deno.env.get("KLURO_AI_MODELL") ?? "claude-haiku-4-5";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

const PROF_LABELS: Record<string, string> = {
  skola: "skolpersonal", sjukvard: "sjukvårdspersonal", el: "elektriker", taxi: "taxiförare", forare: "yrkesförare",
  idrott: "idrottsledare", ekonomi: "ekonomer", hr: "HR-personal", psyk: "psykologer och kuratorer", massage: "massageterapeuter",
  it: "IT-personal", kok: "restaurang- och kökspersonal",
};

type Item = { title: string; desc: string; date: number; tag: string };
type Q = { q: string; options: string[]; correct: number; source: string };

function feeds(region: string) {
  const list = [
    { url: "https://www.svt.se/nyheter/inrikes/rss.xml", tag: "Inrikes" },
    { url: "https://www.svt.se/sport/rss.xml", tag: "Sport" },
    { url: "https://www.svt.se/kultur/rss.xml", tag: "Kultur och nöje" },
    { url: "https://www.svt.se/nyheter/vetenskap/rss.xml", tag: "Vetenskap" },
    { url: "https://www.svt.se/nyheter/utrikes/rss.xml", tag: "Utrikes" },
    { url: "https://www.svt.se/rss.xml", tag: "Blandat" },
  ];
  if (region && /^[a-z]+$/.test(region)) list.push({ url: `https://www.svt.se/nyheter/lokalt/${region}/rss.xml`, tag: "Lokalt" });
  return list;
}

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}
function tagVal(block: string, tag: string) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1] ? decode(m[1]) : "";
}
function parseRss(xml: string, tag: string): Item[] {
  const out: Item[] = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
    const b = m[0];
    const title = tagVal(b, "title");
    if (!title) continue;
    const d = Date.parse(tagVal(b, "pubDate"));
    out.push({ title, desc: tagVal(b, "description").slice(0, 280), date: isNaN(d) ? 0 : d, tag });
  }
  return out;
}

async function getNews(region: string, weekDate: string): Promise<Item[]> {
  const end = new Date(weekDate + "T23:59:59+01:00").getTime();
  const start = end - 8 * 24 * 3600 * 1000;
  const results = await Promise.allSettled(
    feeds(region).map(async (f) => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 8000);
      try {
        const r = await fetch(f.url, { signal: ctl.signal, headers: { "User-Agent": "Kluro/1.3 (paltpixel.se)" } });
        if (!r.ok) return [] as Item[];
        return parseRss(await r.text(), f.tag);
      } finally {
        clearTimeout(t);
      }
    }),
  );
  const seen = new Set<string>();
  const all: Item[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const it of r.value.slice(0, 15)) {
      const key = it.title.toLowerCase();
      if (seen.has(key)) continue;
      if (it.date && (it.date < start || it.date > end + 6 * 3600 * 1000)) continue;
      seen.add(key);
      all.push(it);
    }
  }
  return all.slice(0, 80);
}

const SYSTEM = `Du gör ett lättsamt nyhetsquiz för en grupp som spelar tillsammans (vänner, familj, en skolklass eller kollegor).
Regler:
- Skriv exakt 6 frågor på enkel, tydlig svenska.
- Blanda ämnen: helst minst en fråga om sport, en om kultur/nöje/tv/musik, en lokal nyhet (om sådana finns), en inrikesnyhet och gärna en om vetenskap, natur eller något kuriöst. Högst en fråga om utrikespolitik.
- Välj positiva, roliga eller neutrala nyheter. Undvik död, olyckor, brott, krig, våld, terror, sjukdom och andra tunga eller sorgliga ämnen.
- Varje fråga ska gå att besvara utifrån nyhetens rubrik eller ingress. Hitta inte på fakta.
- Fyra svarsalternativ per fråga, exakt ett rätt. Felalternativen ska vara rimliga men tydligt fel.
- "source" ska vara nyhetens rubrik ordagrant.
Svara ENDAST med JSON i formatet:
{"questions":[{"q":"Fråga?","options":["A","B","C","D"],"correct":0,"source":"Rubrik"}]}`;

function shuffleQ(q: Q): Q {
  const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
  return { ...q, options: order.map((i) => q.options[i] ?? ""), correct: order.indexOf(q.correct) };
}
function validate(raw: unknown): Q[] {
  const arr = (raw && typeof raw === "object" && Array.isArray((raw as any).questions)) ? (raw as any).questions : [];
  const out: Q[] = [];
  for (const x of arr) {
    if (!x || typeof x.q !== "string" || !Array.isArray(x.options) || x.options.length !== 4) continue;
    const options = x.options.map((o: unknown) => String(o ?? "").trim());
    const correct = Number(x.correct);
    if (options.some((o: string) => !o) || !Number.isInteger(correct) || !(correct >= 0 && correct <= 3)) continue;
    out.push(shuffleQ({ q: x.q.trim(), options, correct, source: String(x.source ?? "").trim().slice(0, 200) }));
  }
  return out.slice(0, 8);
}


const VECKA = /^\d{4}-\d{2}-\d{2}$/;
const RUM = /^\d{6}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "bad_request" }, 405);
  try {
    if (Number(req.headers.get("content-length") || 0) > 18000) return json({ error: "bad_request" }, 400);
    const body = await req.json().catch(() => null) as any;
    if (!body || typeof body.week !== "string" || !VECKA.test(body.week)) return json({ error: "bad_request" }, 400);
    const room: string | null = typeof body.room === "string" && RUM.test(body.room) ? body.room : null;
    if (!room) return json({ error: "bad_request" }, 400);
    const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
    const pin = typeof body.pin === "string" ? body.pin.slice(0, 256) : "";
    const player = body.player && typeof body.player === "object" ? body.player : null;

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const draft = !!body.force || !!text.trim();
    if (draft) {
      const { data, error } = await db.rpc("kr_admin_verify", { p_room: room, p_pin: pin });
      if (error || data !== true) return json({ error: "bad_pin" }, 403);
    } else {
      let allowed = false, isAdmin = false;
      if (player && typeof player.nick === "string" && typeof player.code === "string") {
        const { data, error } = await db.rpc("kr_login", { p_room: room, p_nick: player.nick, p_code: player.code });
        allowed = !error && (data as any)?.id === player.id;
      }
      if (!allowed && pin) {
        const { data, error } = await db.rpc("kr_admin_verify", { p_room: room, p_pin: pin });
        allowed = isAdmin = !error && data === true;
      }
      // Alla i ett befintligt rum får hämta rummets nyhetsquiz; det innehåller inget privat.
      if (!allowed) {
        const { data, error } = await db.rpc("kr_load", { p_room: room });
        allowed = !error && !!(data as any)?.room;
      }
      if (!allowed) return json({ error: "bad_login" }, 403);
      const diff = Math.abs(Date.now() - Date.parse(body.week + "T12:00:00+01:00"));
      if (!isAdmin && (!Number.isFinite(diff) || diff > 8 * 86400000)) return json({ error: "week_out_of_range" }, 400);
      const { data: got } = await db.rpc("kn_get", { p_room: room, p_week: body.week });
      if ((got as any)?.news?.questions?.length) return json((got as any).news);
    }

    let userText = "Gör quizet utifrån den här texten (rubriker/ingresser):\n\n" + text;
    if (!text.trim()) {
      const { data: got } = await db.rpc("kn_get", { p_room: room, p_week: body.week });
      const cfg = ((got as any)?.config || {}) as any;
      const today = new Date().toISOString().slice(0, 10);
      const items = await getNews(String(cfg.svtRegion || "vasterbotten"), body.week > today ? today : body.week);
      if (items.length < 6) return json({ error: "no_news" }, 502);
      userText = `De senaste nyheterna från SVT (fram till ${body.week}):\n\n` + items.map((it) => `[${it.tag}] ${it.title} – ${it.desc}`).join("\n");
      const grades: Record<string, string> = { lag: "förskoleklass–årskurs 3", mel: "årskurs 4–6", hog: "årskurs 7–9", gym: "gymnasiet" };
      if (cfg.edition === "elev") userText += "\nSpelarna är elever i " + (grades[String(cfg.grade)] || "grundskolan") + ". Välj nyheter som passar barn och unga, undvik våld och svåra ämnen, och anpassa språk och svårighet efter åldern.";
      else if (cfg.edition === "familj") userText += "\nSpelarna är en familj med blandade åldrar, även barn. Välj nyheter som passar alla åldrar och skriv lättsamt.";
      else if (cfg.themeOn && cfg.profession) userText += "\nSpelarnas yrkesområde: " + (PROF_LABELS[String(cfg.profession)] || String(cfg.profession));
    }

    const nyckel = Deno.env.get("ANTHROPIC_API_KEY");
    if (!nyckel) return json({ error: "Nyhetsquizet är inte påslaget." }, 503);
    let svar: any = null;
    for (let forsok = 0; forsok < 2 && !svar; forsok++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: AbortSignal.timeout(45000),
        headers: { "x-api-key": nyckel, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELL, max_tokens: 2500, system: SYSTEM, messages: [{ role: "user", content: userText }] }),
      });
      if (r.ok) svar = await r.json();
      else { console.error("kluro-nyheter AI", r.status, await r.text()); if (r.status !== 529 && r.status !== 429 && r.status < 500) break; }
    }
    if (!svar) return json({ error: "Nyhetsfrågorna kunde inte skapas just nu." }, 502);
    const t = String((svar.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("")).replace(/^[\s\S]*?(\{)/, "$1").replace(/\}[^}]*$/, "}");
    const questions = validate(JSON.parse(t));
    if (questions.length < 3) return json({ error: "too_few_questions" }, 502);
    const news = { from: text ? "text" : "svt", generatedAt: new Date().toISOString(), questions };
    if (!draft) {
      const { data: saved, error } = await db.rpc("kn_save_news", { p_room: room, p_week: body.week, p_news: news });
      if (error) { console.error("kluro-nyheter spara", error); return json(news); }
      if ((saved as any)?.questions?.length) return json(saved);
    }
    return json(news);
  } catch (e) {
    console.error("kluro-nyheter", e);
    return json({ error: "Nyhetsquizet är tillfälligt otillgängligt." }, 502);
  }
});
