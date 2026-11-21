// Bygger listsidorna (/spel/, /appar/, /alla/) och en sida per projekt (/projekt/<id>/) från projects.json.
// Kör: node verktyg/bygg-sidor.mjs
import fs from "fs";
import path from "path";
const ROT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { projekt } = JSON.parse(fs.readFileSync(path.join(ROT, "projects.json"), "utf8"));
const V = "5";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TYP = { spel: "Spel", app: "App" };
const PLATTFORM = { frontlinjen: "Webbläsare – bäst på dator eller surfplatta" };

const IKON = {
  tillbaka: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  spela: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>',
  oppna: '<path d="M7 17 17 7M9 7h8v8"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  paus: '<path d="M9 6v12M15 6v12"/>',
  alla: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
};
const ikon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IKON[n]}</svg>`;
const LOGGA = '<svg class="logga" viewBox="0 0 22 18" aria-hidden="true"><ellipse cx="8" cy="9" rx="7.5" ry="7" fill="currentColor"/><rect x="13" y="3" width="3" height="3" fill="currentColor"/><rect x="16" y="7" width="3" height="3" fill="currentColor" opacity=".8"/><rect x="13" y="11" width="3" height="3" fill="currentColor" opacity=".9"/><rect x="19" y="2" width="2" height="2" fill="#C4122F"/></svg>';
const tema = (t) => Object.entries(t).map(([k, v]) => `--${k === "knappText" ? "knapptext" : k}:${v}`).join(";");

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
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Inter:wght@400;500;600;700&family=Silkscreen&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/pop.css?v=${V}">${extra}
</head>`;
}

function sidhuvud(aktiv, tillbaka) {
  const l = (href, text, id) => `<a href="${href}"${aktiv === id ? ' aria-current="page"' : ""}>${text}</a>`;
  return `
  <a class="hoppa" href="#innehall">Hoppa till innehållet</a>
  <header class="pop-huvud">
    <a class="rund" href="${tillbaka}" data-tillbaka aria-label="Tillbaka">${ikon("tillbaka")}<span>Tillbaka</span></a>
    <a class="marke" href="/" aria-label="Palt & pixel, till startsidan">${LOGGA}<span>Palt &amp; pixel</span></a>
    <nav class="segment" aria-label="Bläddra">
      ${l("/spel/", "Spel", "spel")}
      ${l("/appar/", "Appar", "app")}
      ${l("/alla/", "Allt", "alla")}
    </nav>
    <a class="rund bara-mobil" href="/alla/" aria-label="Alla spel och appar">${ikon("alla")}</a>
  </header>`;
}

const fot = `
  <footer class="pop-fot">
    <a href="/">paltpixel.se</a>
    <span>Gjort i Piteå-anda med smör och lingon · <a href="/integritet/">Integritetspolicy</a></span>
  </footer>
  <script src="/assets/js/konfig.js"></script>
  <script src="/assets/js/konto.js?v=${V}"></script>
  <script src="/assets/js/sidor.js?v=${V}" defer></script>
</body>
</html>
`;

export function kort(p) {
  const verb = p.lank ? (p.typ === "spel" ? "Spela" : "Öppna") : "Kommer snart";
  return `<a class="pk pk-${p.format}" href="${esc(p.sida)}" style="${tema(p.tema)}">
        <span class="pk-skarm"><img src="${esc(p.skarmbild)}" alt="" loading="lazy" decoding="async"><video muted loop playsinline preload="none" data-klipp="${esc(p.skarm)}" aria-hidden="true"></video></span>
        <span class="vox v1" aria-hidden="true"></span><span class="vox v2" aria-hidden="true"></span>
        <span class="pk-text">
          <span class="pk-meta">${esc(p.genre)}</span>
          <span class="pk-namn">${esc(p.namn)}</span>
          <span class="pk-ingress">${esc(p.ingress)}</span>
          <span class="pk-cta">${verb} →</span>
        </span>
      </a>`;
}

function lista(id, ord, meta, ingress, urval) {
  const html = huvud(`${ord[0] + ord.slice(1).toLowerCase()} – Palt & pixel`, ingress, urval[0]?.skarmbild || "/assets/img/frontlinjen.webp")
    + `\n<body class="pop pop-lista">` + sidhuvud(id, "/") + `
  <main id="innehall">
    <section class="lista-topp">
      <p class="meta"><span>${meta}</span><span>INGEN INSTALLATION</span></p>
      <h1 class="jatte" style="--n:${ord.length}">${ord}</h1>
      <p class="ingress">${ingress}</p>
    </section>
    <div class="pk-rutnat">
      ${urval.map(kort).join("\n      ")}
    </div>
  </main>` + fot;
  skriv(`${id === "app" ? "appar" : id}/index.html`, html);
}

function projektsida(p) {
  const andra = projekt.filter((q) => q.id !== p.id && q.typ === p.typ).concat(projekt.filter((q) => q.typ !== p.typ)).slice(0, 3);
  const verb = p.typ === "spel" ? "Spela" : "Öppna";
  const ord = p.namn.toUpperCase();
  const knapp = p.lank
    ? `<a class="spela" href="${esc(p.lank)}"><span class="spela-v">${ikon(p.typ === "spel" ? "spela" : "oppna")}${esc(p.knapp)}</span><span class="spela-h">Ingen installation</span></a>`
    : `<span class="spela av" aria-disabled="true"><span class="spela-v">${esc(p.knapp)}</span><span class="spela-h">Körs i webbläsaren</span></span>`;
  const fakta = [
    ["Utvecklare", "Palt &amp; pixel"], ["Utgivningsår", esc(p.ar)], ["Genre", esc(p.genre)],
    [p.typ === "spel" ? "Spelare" : "För", esc(p.spelare)],
    ["Plattform", esc(PLATTFORM[p.id] || "Webbläsare – dator, surfplatta och mobil")],
    ["Installation", "Ingen – körs direkt i webbläsaren"],
  ];
  const tillbaka = p.typ === "spel" ? "/spel/" : "/appar/";
  const html = huvud(`${p.namn} – Palt & pixel`, p.ingress, p.poster, `
  <meta name="theme-color" content="${p.tema.topp}">
  <link rel="preload" as="image" href="${esc(p.skarmbild)}">`)
    + `\n<body class="pop pop-projekt" style="${tema(p.tema)}">` + sidhuvud(p.typ, tillbaka) + `
  <main id="innehall">
    <section class="scen scen-${p.format}" style="--n:${ord.length}">
      <p class="meta"><span>${esc(TYP[p.typ].toUpperCase())} · ${esc(p.genre.toUpperCase())}</span><span>${esc(p.ar)} · I WEBBLÄSAREN</span></p>
      <h1 class="jatte">${esc(ord)}</h1>
      <div class="svav">
        <span class="skugga" aria-hidden="true"></span>
        <span class="skarm">
          <video class="banderoll-video" src="${esc(p.skarm)}" poster="${esc(p.skarmbild)}" autoplay muted loop playsinline preload="auto" aria-label="Klipp ur ${esc(p.namn)}"></video>
        </span>
        <span class="vox v1" aria-hidden="true"></span><span class="vox v2" aria-hidden="true"></span><span class="vox v3" aria-hidden="true"></span>
        <button class="paus" type="button" aria-label="Pausa klippet" data-paus>${ikon("paus")}</button>
      </div>
    </section>

    <section class="info">
      <div class="info-rad">
        <div><span class="etikett">Genre</span><span class="varde">${esc(p.genre)}</span></div>
        <div class="info-ar"><span class="etikett">Utgiven</span><span class="varde">${esc(p.ar)}</span></div>
      </div>
      <p class="ingress">${esc(p.ingress)}</p>
      <div class="spela-rad">${knapp}</div>
      <p class="webblasare">${ikon("check")}<span>${p.lank ? `${verb} direkt i webbläsaren` : "Körs i webbläsaren när den är klar"} – inget att installera eller ladda ner.</span></p>

      <div class="kropp">
        <div class="beskrivning">
          ${p.beskrivning.map((t) => `<p>${esc(t)}</p>`).join("\n          ")}
          <h2>Det här finns i ${esc(p.namn)}</h2>
          <ul class="hojdpunkter">
            ${p.hojdpunkter.map((t) => `<li>${ikon("check")}<span>${esc(t)}</span></li>`).join("\n            ")}
          </ul>
        </div>
        <aside class="fakta" aria-label="Information">
          <h2>Information</h2>
          <dl>
            ${fakta.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join("\n            ")}
          </dl>
        </aside>
      </div>

      <section class="trailer" aria-label="Trailer">
        <h2>Trailer</h2>
        <video controls playsinline preload="none" poster="${esc(p.poster)}" src="${esc(p.video)}"></video>
      </section>
    </section>

    <section class="fler">
      <h2>Mer från Palt &amp; pixel</h2>
      <div class="pk-rutnat">
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

lista("spel", "SPEL", `${projekt.filter((p) => p.typ === "spel").length} SPEL`, "Strategi, bygga och mysa, quiz och klurigheter. Håll muspekaren över ett spel för en titt.", projekt.filter((p) => p.typ === "spel"));
lista("app", "APPAR", `${projekt.filter((p) => p.typ === "app").length} APPAR`, "Små verktyg för vardagen: plugg, planering och palt.", projekt.filter((p) => p.typ === "app"));
lista("alla", "ALLT", `${projekt.length} PROJEKT`, "Alla spel och appar på ett ställe.", projekt);
projekt.forEach(projektsida);

// Startsidan: korten fylls i mellan markeringarna i index.html
{
  const fil = path.join(ROT, "index.html");
  let s = fs.readFileSync(fil, "utf8");
  const fyll = (namn, urval) => { s = s.replace(new RegExp(`<!--${namn}-->[\\s\\S]*?<!--/${namn}-->`), `<!--${namn}-->\n        ${urval.map(kort).join("\n        ")}\n        <!--/${namn}-->`); };
  fyll("SPEL", projekt.filter((p) => p.typ === "spel"));
  fyll("APPAR", projekt.filter((p) => p.typ === "app"));
  s = s.replace(/<span class="varde">\d+ projekt<\/span>/, `<span class="varde">${projekt.length} projekt</span>`);
  fs.writeFileSync(fil, s);
  console.log("skrev index.html");
}
