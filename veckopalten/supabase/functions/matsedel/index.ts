// Veckopalten – serverfunktionen "matsedel".
// Hämtar kommuner, skolor och matsedlar från Mateo Meny (meny-api.mateo.se) och skickar vidare dem.
// Behövs bara om webbläsaren inte får hämta direkt från Mateo.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const svar = (status: number, kropp: unknown, cache = false) =>
  new Response(JSON.stringify(kropp), { status, headers: { ...CORS, "Content-Type": "application/json", ...(cache ? { "Cache-Control": "public, max-age=3600" } : {}) } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const body = await req.json();
    const mateo = async (vag: string) => {
      const r = await fetch(`https://meny-api.mateo.se/api/v1/${vag}`, { headers: { Accept: "application/json", Referer: "https://meny.mateo.se/" }, signal: AbortSignal.timeout(10_000) });
      if (!r.ok) throw new Error("Mateo svarade " + r.status);
      return await r.json();
    };
    // Lista över län och kommuner.
    if (body?.lista === "kommuner") return svar(200, await mateo("counties"), true);
    // Skolorna i en kommun.
    if (typeof body?.kommun === "string") {
      if (!/^[a-zåäöé0-9-]{1,40}$/.test(body.kommun)) return svar(400, { fel: "Okänd kommun." });
      return svar(200, await mateo("organizations/" + encodeURIComponent(body.kommun)), true);
    }
    const { enheter, fran, till } = body;
    const datumOk = (d: unknown) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (!Array.isArray(enheter) || !datumOk(fran) || !datumOk(till)) return svar(400, { fel: "Fel indata." });
    const ut: Record<string, unknown> = {};
    for (const id of enheter.slice(0, 10)) {
      if (!/^\d{1,7}$/.test(String(id))) continue;
      const r = await fetch(`https://meny-api.mateo.se/api/v1/days/${id}?from=${fran}&to=${till}`, {
        headers: { Accept: "application/json", Referer: "https://meny.mateo.se/" },
        signal: AbortSignal.timeout(10_000),
      });
      ut[String(id)] = r.ok ? await r.json() : [];
    }
    return svar(200, ut, true);
  } catch (e) {
    return svar(400, { fel: e instanceof Error ? e.message : "Något gick fel." });
  }
});
