// Bygger startsidan, listsidorna (/spel/, /appar/, /alla/) och en sida per projekt (/projekt/<id>/) från projects.json.
// Projekt med "dold": true visas inte på sidan men ligger kvar på sina egna adresser.
// Kör: node verktyg/bygg-sidor.mjs
import fs from "fs";
import path from "path";
const ROT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const alla = JSON.parse(fs.readFileSync(path.join(ROT, "projects.json"), "utf8")).projekt;
const projekt = alla.filter((p) => !p.dold);
const V = "6";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TYP = { spel: "Spel", app: "App" };
const PLATTFORM = { frontlinjen: "Webbläsare – bäst på dator eller surfplatta" };

const IKON = {
  tillbaka: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  spela: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  oppna: '<path d="M7 17 17 7M9 7h8v8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  paus: '<path d="M9 6v12M15 6v12"/>',
  webb: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3 9h18M6.5 6.8h.01M9 6.8h.01"/>',
  hjarta: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  skola: '<path d="M3 9.5 12 5l9 4.5-9 4.5z"/><path d="M7 11.5V16c1.5 1.4 3.2 2 5 2s3.5-.6 5-2v-4.5"/>',
};
const ikon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[n]}</svg>`;
const farg = (p) => `--accent:${p.tema?.topp || "#2F6B4F"}`;
const verbFor = (p) => (p.lank ? (p.typ === "spel" ? "Spela" : "Öppna") : "Kommer snart");

function huvud(titel, beskrivning, bild, extra = "") {
  return `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(beskrivning)}">
  <meta property="og:title" content="${esc(titel)}">
  <meta property="og:description" content="${esc(beskrivning)}">
  <meta property="og:image" content="${esc(bild)}">
  <meta name="theme-color" content="#FBF8F2">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/typsnitt.css">
  <link rel="stylesheet" href="/assets/css/ljus.css?v=${V}">${extra}
</head>`;
}

function sidhuvud(aktiv) {
  const l = (href, text, id) => `<a href="${href}"${aktiv === id ? ' aria-current="page"' : ""}>${text}</a>`;
  return `
<body>
  <a class="hoppa" href="#innehall">Hoppa till innehållet</a>
  <header class="sidhuvud">
    <div class="sidhuvud-inre">
      <a class="marke" href="/" aria-label="Palt & pixel, till startsidan">
        <img src="/assets/logo.svg" alt="" width="40" height="32"><span>Palt <em>&amp;</em> pixel</span>
      </a>
      <nav class="meny" aria-label="Huvudmeny">
        ${l("/alla/", "Allt", "alla")}
        ${l("/spel/", "Spel", "spel")}
        ${l("/appar/", "Appar", "app")}
        ${l("/om/", "Om", "om")}
      </nav>
      <a class="logga-in" href="/konto/" id="konto-lank">Logga in</a>
    </div>
  </header>`;
}

const fot = `
  <footer class="sidfot">
    <div class="sidfot-inre">
      <div>
        <a class="marke" href="/"><img src="/assets/logo.svg" alt="" width="34" height="27"><span>Palt <em>&amp;</em> pixel</span></a>
        <p>Gratis, utan annonser och utan spårning. Gjort med smör och lingon i Piteå-anda.</p>
      </div>
      <nav aria-label="Mer">
        <a href="/alla/">Alla spel och appar</a>
        <a href="/om/">Om sidan och kontakt</a>
        <a href="/integritet/">Integritetspolicy</a>
      </nav>
    </div>
  </footer>
  <script src="/assets/js/konfig.js"></script>
  <script src="/assets/js/konto.js?v=${V}"></script>
  <script src="/assets/js/sidor.js?v=${V}" defer></script>
</body>
</html>
`;

// Bilden i ett kort eller på en projektsida: liggande skärmbild, eller en telefon för mobilapparna
function media(p, { klipp = false, autoplay = false } = {}) {
  const video = autoplay
    ? `<video class="banderoll-video" src="${esc(p.skarm)}" poster="${esc(p.skarmbild)}" autoplay muted loop playsinline preload="auto" aria-label="Klipp ur ${esc(p.namn)}"></video>`
    : klipp ? `<video muted loop playsinline preload="none" data-klipp="${esc(p.skarm)}" aria-hidden="true"></video>` : "";
  const bild = autoplay ? "" : `<img src="${esc(p.skarmbild)}" alt="" loading="lazy" decoding="async">`;
  return p.format === "stod"
    ? `<span class="media media-stod" style="${farg(p)}"><span class="telefon">${bild}${video}</span></span>`
    : `<span class="media media-bred" style="${farg(p)}"><span class="skarm">${bild}${video}</span></span>`;
}

export function kort(p, rubrik = "h3") {
  const verb = verbFor(p);
  const oppna = p.lank
    ? `<a class="knapp knapp-liten" href="${esc(p.lank)}">${ikon(p.typ === "spel" ? "spela" : "oppna")}${verb}</a>`
    : `<span class="knapp knapp-liten av">${verb}</span>`;
  return `<article class="kort" style="${farg(p)}">
          ${media(p, { klipp: true })}
          <div class="kort-text">
            <span class="tagg">${esc(p.malgrupp || TYP[p.typ])}</span>
            <${rubrik} class="kort-namn"><a class="kort-lank" href="${esc(p.sida)}">${esc(p.namn)}</a></${rubrik}>
            <p>${esc(p.ingress)}</p>
            <div class="kort-knappar">${oppna}<a class="las-mer" href="${esc(p.sida)}">Läs mer</a></div>
          </div>
        </article>`;
}

function lista(id, rubrik, ingress, urval) {
  const html = huvud(`${rubrik} – Palt & pixel`, ingress, urval[0]?.skarmbild || "/assets/video/julkalender-poster.jpg")
    + sidhuvud(id) + `
  <main id="innehall" class="sida">
    <section class="sid-intro">
      <h1>${rubrik}</h1>
      <p class="ingress">${ingress}</p>
      <p class="info-rad">${ikon("webb")}<span>Allt körs direkt i webbläsaren – inget att installera.</span></p>
    </section>
    <div class="rutnat">
        ${urval.map((p) => kort(p, "h2")).join("\n        ")}
    </div>
  </main>` + fot;
  skriv(`${id === "app" ? "appar" : id}/index.html`, html);
}

function projektsida(p) {
  const andra = projekt.filter((q) => q.id !== p.id).slice(0, 3);
  const verb = verbFor(p);
  const knapp = p.lank
    ? `<a class="knapp knapp-stor" href="${esc(p.lank)}">${ikon(p.typ === "spel" ? "spela" : "oppna")}${verb} ${esc(p.namn)}</a>`
    : `<span class="knapp knapp-stor av" aria-disabled="true">Kommer snart</span>`;
  const fakta = [
    ["Passar för", esc(p.spelare)], ["Typ", `${esc(TYP[p.typ])} · ${esc(p.genre)}`], ["Utgivningsår", esc(p.ar)],
    ["Fungerar på", esc(PLATTFORM[p.id] || "Dator, Chromebook, surfplatta och mobil")],
    ["Installation", "Ingen – körs direkt i webbläsaren"], ["Pris", "Gratis"], ["Utvecklare", "Palt &amp; pixel"],
  ];
  const html = huvud(`${p.namn} – Palt & pixel`, p.ingress, p.poster)
    + sidhuvud(p.typ) + `
  <main id="innehall" class="sida projekt" style="${farg(p)}">
    <a class="bakat" href="/alla/" data-tillbaka>${ikon("tillbaka")}Tillbaka</a>
    <section class="projekt-topp">
      <div class="projekt-text">
        <span class="tagg">${esc(p.malgrupp || TYP[p.typ])}</span>
        <h1>${esc(p.namn)}</h1>
        <p class="ingress">${esc(p.ingress)}</p>
        <div class="knapprad">${knapp}</div>
        <p class="info-rad">${ikon("check")}<span>${p.lank ? "Körs direkt i webbläsaren – inget att installera eller ladda ner." : "Körs i webbläsaren när den är klar."}</span></p>
      </div>
      <div class="projekt-media">
        ${media(p, { autoplay: true })}
        <button class="paus" type="button" aria-label="Pausa klippet" data-paus>${ikon("paus")}</button>
      </div>
    </section>

    <section class="projekt-kropp">
      <div class="beskrivning">
        <h2>Om ${esc(p.namn)}</h2>
        ${p.beskrivning.map((t) => `<p>${esc(t)}</p>`).join("\n        ")}
        <h2>Det här finns</h2>
        <ul class="bockar">
          ${p.hojdpunkter.map((t) => `<li>${ikon("check")}<span>${esc(t)}</span></li>`).join("\n          ")}
        </ul>
      </div>
      <aside class="fakta" aria-label="Fakta">
        <h2>Fakta</h2>
        <dl>
          ${fakta.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("\n          ")}
        </dl>
      </aside>
    </section>

    <section class="film" aria-labelledby="film-rubrik">
      <h2 id="film-rubrik">Se filmen</h2>
      <video controls playsinline preload="none" poster="${esc(p.poster)}" src="${esc(p.video)}"></video>
    </section>

    <section class="fler" aria-labelledby="fler-rubrik">
      <h2 id="fler-rubrik">Mer från Palt &amp; pixel</h2>
      <div class="rutnat">
        ${andra.map((q) => kort(q)).join("\n        ")}
      </div>
    </section>
  </main>` + fot;
  skriv(`projekt/${p.id}/index.html`, html);
}

function startsida() {
  const utvald = projekt.find((p) => p.utvald);
  const html = huvud("Palt & pixel – små spel och verktyg för skolan", "Små spel och verktyg för lärare och klasser, och lite för dig själv. Gratis, utan annonser och utan installation – allt körs direkt i webbläsaren.", utvald?.poster || "/assets/video/vaggen-poster.jpg",
    `\n  <link rel="preload" as="image" href="/assets/img/palt-hero.webp">`)
    + sidhuvud("start") + `
  <main id="innehall">
    <section class="valkommen">
      <div class="valkommen-inre">
        <div class="valkommen-text">
          <p class="liten-etikett">Hej och välkommen!</p>
          <h1>Små spel och verktyg för skolan <span>– och för dig.</span></h1>
          <p class="ingress">Här finns saker att göra tillsammans med klassen, med kollegorna i fikarummet och en stund för dig själv. Allt är gratis och fungerar direkt i webbläsaren.</p>
          <div class="knapprad">
            <a class="knapp knapp-stor" href="#allt">Se allt</a>
            ${utvald ? `<a class="knapp knapp-stor knapp-ljus" href="${esc(utvald.sida)}">${esc(utvald.namn)}</a>` : ""}
          </div>
        </div>
        <div class="valkommen-bild" aria-hidden="true">
          <span class="cirkel"></span>
          <img src="/assets/img/palt-hero.webp" alt="" width="1191" height="532">
        </div>
      </div>
    </section>

    <section class="fordelar" aria-label="Bra att veta">
      <div class="fordel">${ikon("webb")}<div><strong>Inget att installera</strong><span>Öppna och kör i webbläsaren – på datorn, Chromebooken eller storskärmen.</span></div></div>
      <div class="fordel">${ikon("hjarta")}<div><strong>Gratis och reklamfritt</strong><span>Inga annonser och ingen spårning.</span></div></div>
      <div class="fordel">${ikon("skola")}<div><strong>Gjort för skolan</strong><span>Tänkt för lärare och klasser i olika stadier.</span></div></div>
    </section>

    ${utvald ? `<section class="utvald" style="${farg(utvald)}" aria-labelledby="utvald-rubrik">
      ${media(utvald, { klipp: true })}
      <div class="utvald-text">
        <span class="tagg">Aktuellt · ${esc(utvald.malgrupp || "")}</span>
        <h2 id="utvald-rubrik">${esc(utvald.namn)}</h2>
        <p>${esc(utvald.beskrivning[0])}</p>
        <div class="kort-knappar">
          <a class="knapp" href="${esc(utvald.lank)}">${ikon("oppna")}Öppna ${esc(utvald.namn)}</a>
          <a class="las-mer" href="${esc(utvald.sida)}">Läs mer</a>
        </div>
      </div>
    </section>` : ""}

    <section class="sida" id="allt" aria-labelledby="allt-rubrik">
      <div class="del-huvud">
        <h2 id="allt-rubrik">Allt på Palt &amp; pixel</h2>
        <p>${projekt.length} spel och appar</p>
      </div>
      <div class="rutnat">
        ${projekt.map((p) => kort(p)).join("\n        ")}
      </div>
    </section>
  </main>` + fot;
  skriv("index.html", html);
}

function skriv(fil, html) {
  const ut = path.join(ROT, fil);
  fs.mkdirSync(path.dirname(ut), { recursive: true });
  fs.writeFileSync(ut, html);
  console.log("skrev", fil);
}

startsida();
lista("spel", "Spel", "Lugna spel, kluringar och quiz – för fikarummet eller för dig själv.", projekt.filter((p) => p.typ === "spel"));
lista("app", "Appar", "Verktyg och appar för klassrummet och vardagen.", projekt.filter((p) => p.typ === "app"));
lista("alla", "Allt", "Alla spel och appar på ett ställe.", projekt);
projekt.forEach(projektsida);
// Dolda projekt får ingen egen sida
for (const p of alla.filter((q) => q.dold)) {
  const dir = path.join(ROT, "projekt", p.id);
  if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true }); console.log("tog bort", `projekt/${p.id}/`); }
}
