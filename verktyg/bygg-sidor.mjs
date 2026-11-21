// Bygger listsidorna (/spel/, /appar/, /alla/) och en sida per projekt (/projekt/<id>/) från projects.json.
// Kör: node verktyg/bygg-sidor.mjs
import fs from "fs";
import path from "path";
const ROT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { projekt } = JSON.parse(fs.readFileSync(path.join(ROT, "projects.json"), "utf8"));
const V = "4";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TYP = { spel: "Spel", app: "App" };
const PLATTFORM = { frontlinjen: "Webbläsare – bäst på dator eller surfplatta" };

const IKON = {
  tillbaka: '<path d="M15 18l-6-6 6-6"/>',
  spela: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  oppna: '<path d="M7 17 17 7M9 7h8v8"/>',
  moln: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 21h16"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  paus: '<path d="M9 6v12M15 6v12"/>',
};
const ikon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[n]}</svg>`;

function huvud(titel, beskrivning, bild, extra = "") {
  return `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(beskrivning)}">
  <meta property="og:title" content="${esc(titel)}">
  <meta property="og:description" content="${esc(beskrivning)}">
  <meta property="og:image" content="${esc(bild)}">
  <meta name="theme-color" content="#0E1526">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Silkscreen&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/style.css?v=${V}">
  <link rel="stylesheet" href="/assets/css/sidor.css?v=${V}">${extra}
</head>`;
}

function sidhuvud(aktiv, tillbaka) {
  const l = (href, text, id) => `<a href="${href}"${aktiv === id ? ' aria-current="page"' : ""}>${text}</a>`;
  return `<body class="undersida">
  <a class="hoppa" href="#innehall">Hoppa till innehållet</a>
  <header class="sidhuvud">
    <div class="sidhuvud-inre">
      <a class="tillbaka" href="${tillbaka}" data-tillbaka>${ikon("tillbaka")}<span>Tillbaka</span></a>
      <a class="varumarke" href="/" aria-label="Palt & pixel, till startsidan">
        <img src="/assets/logo.svg" alt="" width="45" height="36"><span>Palt <em>&amp;</em> pixel</span>
      </a>
      <nav class="meny" aria-label="Huvudmeny">
        ${l("/spel/", "Spel", "spel")}
        ${l("/appar/", "Appar", "app")}
        ${l("/alla/", "Allt", "alla")}
        <a href="/konto/" id="konto-lank">Logga in</a>
      </nav>
    </div>
  </header>`;
}

const fot = `
  <footer class="sidfot">
    <span><a href="/">paltpixel.se</a></span>
    <span>Gjort med smör och lingon · <a href="/integritet/">Integritetspolicy</a></span>
  </footer>
  <script src="/assets/js/konfig.js"></script>
  <script src="/assets/js/konto.js?v=${V}"></script>
  <script src="/assets/js/sidor.js?v=${V}" defer></script>
</body>
</html>
`;

export function kort(p) {
  return `<a class="kort f-${esc(p.farg)}" href="${esc(p.sida)}">
      <div class="kort-bild">
        <img src="${esc(p.poster)}" alt="" loading="lazy" decoding="async" width="960" height="540">
        <video muted loop playsinline preload="none" data-klipp="${esc(p.klipp)}" aria-hidden="true"></video>
        <span class="spelar" aria-hidden="true">${ikon("spela")}</span>
      </div>
      <div class="kort-text">
        <span class="kort-meta">${esc(TYP[p.typ])} · ${esc(p.genre)}</span>
        <h3>${esc(p.namn)}</h3>
        <p>${esc(p.ingress)}</p>
      </div>
    </a>`;
}

function lista(id, titel, kicker, ingress, urval) {
  const html = huvud(`${titel} – Palt & pixel`, ingress, urval[0]?.poster || "/assets/img/frontlinjen.webp")
    + sidhuvud(id, "/") + `
  <main id="innehall" class="listsida">
    <section class="intro">
      <p class="kicker">${kicker}</p>
      <h1>${titel}</h1>
      <p class="ingress">${ingress}</p>
      <p class="webblasare">${ikon("check")}<span>Allt körs direkt i webbläsaren – inget att installera eller ladda ner.</span></p>
    </section>
    <div class="kortlista">
    ${urval.map(kort).join("\n    ")}
    </div>
  </main>` + fot;
  skriv(`${id === "app" ? "appar" : id}/index.html`, html);
}

function projektsida(p) {
  const andra = projekt.filter((q) => q.id !== p.id && q.typ === p.typ).concat(projekt.filter((q) => q.typ !== p.typ)).slice(0, 3);
  const verb = p.typ === "spel" ? "Spela" : "Använd";
  const knapp = p.lank
    ? `<a class="spela-knapp" href="${esc(p.lank)}">${ikon(p.typ === "spel" ? "spela" : "oppna")}<span>${esc(p.knapp)}</span></a>`
    : `<span class="spela-knapp av" aria-disabled="true">${esc(p.knapp)}</span>`;
  const rader = [
    ["Utvecklare", "Palt &amp; pixel"],
    ["Utgivningsår", esc(p.ar)],
    ["Genre", esc(p.genre)],
    ["Typ", esc(TYP[p.typ])],
    [p.typ === "spel" ? "Spelare" : "För", esc(p.spelare)],
    ["Plattform", esc(PLATTFORM[p.id] || "Webbläsare – dator, surfplatta och mobil")],
    ["Installation", "Ingen – körs direkt i webbläsaren"],
  ];
  const tillbaka = p.typ === "spel" ? "/spel/" : "/appar/";
  const html = huvud(`${p.namn} – Palt & pixel`, p.ingress, p.poster, `
  <link rel="preload" as="image" href="${esc(p.poster)}">`)
    + sidhuvud(p.typ, tillbaka) + `
  <main id="innehall" class="projektsida f-${esc(p.farg)}">
    <div class="banderoll">
      <video class="banderoll-video" src="${esc(p.video)}" poster="${esc(p.poster)}" autoplay muted loop playsinline preload="auto" aria-label="Promofilm för ${esc(p.namn)}"></video>
      <button class="banderoll-paus" type="button" aria-label="Pausa filmen" data-paus>${ikon("paus")}</button>
    </div>

    <section class="projekt-huvud">
      <div class="projekt-titel">
        <span class="kort-meta">${esc(TYP[p.typ])} · ${esc(p.genre)}</span>
        <h1>${esc(p.namn)}</h1>
        <p class="ingress">${esc(p.ingress)}</p>
        <div class="knapprad">
          ${knapp}
          <p class="webblasare">${ikon("check")}<span>${p.lank ? `${verb} direkt i webbläsaren` : "Körs i webbläsaren när den är klar"} – inget att installera eller ladda ner.</span></p>
        </div>
      </div>
    </section>

    <div class="projekt-kropp">
      <section class="beskrivning" aria-label="Om ${esc(p.namn)}">
        ${p.beskrivning.map((t) => `<p>${esc(t)}</p>`).join("\n        ")}
        <h2>Det här finns i ${esc(p.namn)}</h2>
        <ul class="hojdpunkter">
          ${p.hojdpunkter.map((t) => `<li>${ikon("check")}<span>${esc(t)}</span></li>`).join("\n          ")}
        </ul>
      </section>
      <aside class="fakta" aria-label="Information">
        <h2>Information</h2>
        <dl>
          ${rader.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("\n          ")}
        </dl>
      </aside>
    </div>

    <section class="fler">
      <h2>Mer från Palt &amp; pixel</h2>
      <div class="kortlista">
      ${andra.map(kort).join("\n      ")}
      </div>
    </section>
  </main>` + fot;
  skriv(`projekt/${p.id}/index.html`, html);
}

function skriv(fil, html) {
  const ut = path.join(ROT, fil);
  fs.mkdirSync(path.dirname(ut), { recursive: true });
  fs.writeFileSync(ut, html);
  console.log("skrev", fil);
}

lista("spel", "Spel", "Spel från Palt & pixel", "Strategi, bygga och mysa, quiz och klurigheter. Håll muspekaren över ett spel för en titt.", projekt.filter((p) => p.typ === "spel"));
lista("app", "Appar", "Appar från Palt & pixel", "Små verktyg för vardagen: plugg, planering och palt.", projekt.filter((p) => p.typ === "app"));
lista("alla", "Allt", "Hela biblioteket", "Alla spel och appar på ett ställe.", projekt);
projekt.forEach(projektsida);
