/*
 * Palt & pixel – konto och sparning
 *
 * Används på två sätt:
 *  1. På startsidan och kontosidan: <script src="/assets/js/konto.js"></script>
 *  2. I ett spel, i <head> FÖRE spelets egna skript:
 *     <script src="/assets/js/konfig.js"></script>
 *     <script src="/assets/js/konto.js" data-spel="vaggen" data-nycklar="^(vaggen|oasvaggen)"></script>
 *
 * I spelläget gör skriptet tre saker:
 *  - Tar emot en sparning som flyttas från skolvy.se (#flytt=… i adressen).
 *  - Hämtar sparningen från kontot när man loggat in, och laddar om spelet med den.
 *  - Laddar upp spelets sparning till kontot var 15:e sekund och när man lämnar sidan.
 * Spelen själva behöver inte ändras: allt som matchar data-nycklar i localStorage följer med.
 */
(function () {
  "use strict";
  var skript = document.currentScript;
  var SPEL = (skript && skript.dataset.spel) || null;
  var MONSTER = skript && skript.dataset.nycklar ? new RegExp(skript.dataset.nycklar) : null;
  var K = window.PP_KONFIG || {};
  var HAR_KONTO = !!(K.supabaseUrl && K.supabaseAnonKey);
  var MARKOR = "pp_synk_" + SPEL;
  var ATERSTALL = "pp_aterstall_" + SPEL;
  var meddelanden = [];

  /* ---------- Hjälpfunktioner ---------- */
  function lasNycklar() {
    var o = {};
    if (!MONSTER) return o;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (MONSTER.test(k)) o[k] = localStorage.getItem(k);
    }
    return o;
  }
  function skrivNycklar(o) {
    Object.keys(lasNycklar()).forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(o).forEach(function (k) { localStorage.setItem(k, o[k]); });
  }
  function fingeravtryck(o) {
    var s = Object.keys(o).sort().map(function (k) { return k + "=" + o[k]; }).join("\u0001");
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + ":" + s.length;
  }
  function fran64(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function lasMarkor() { try { return JSON.parse(localStorage.getItem(MARKOR) || "null"); } catch (e) { return null; } }
  function satMarkor(o, tid) { localStorage.setItem(MARKOR, JSON.stringify({ h: fingeravtryck(o), t: tid })); }

  function toast(text, knappar) {
    if (!document.body) { meddelanden.push([text, knappar]); return; }
    var stil = document.getElementById("pp-toast-stil");
    if (!stil) {
      stil = document.createElement("style");
      stil.id = "pp-toast-stil";
      stil.textContent = ".pp-toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000;max-width:min(92vw,460px);background:#0E1526;color:#F4F6FB;font:500 15px/1.4 Inter,system-ui,sans-serif;padding:14px 18px;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.12);display:flex;flex-direction:column;gap:10px}.pp-toast .pp-knappar{display:flex;gap:8px;flex-wrap:wrap}.pp-toast button{font:600 14px Inter,system-ui,sans-serif;border:0;border-radius:999px;padding:10px 14px;min-height:40px;cursor:pointer;background:#F4F6FB;color:#0E1526}.pp-toast button.pp-sekundar{background:transparent;color:#F4F6FB;border:1px solid rgba(255,255,255,.3)}";
      document.head.appendChild(stil);
    }
    var gammal = document.querySelector(".pp-toast");
    if (gammal) gammal.remove();
    var el = document.createElement("div");
    el.className = "pp-toast";
    el.setAttribute("role", "status");
    var p = document.createElement("div");
    p.textContent = text;
    el.appendChild(p);
    if (knappar && knappar.length) {
      var rad = document.createElement("div");
      rad.className = "pp-knappar";
      knappar.forEach(function (k, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = k.text;
        if (i > 0) b.className = "pp-sekundar";
        b.addEventListener("click", function () { el.remove(); k.gor(); });
        rad.appendChild(b);
      });
      el.appendChild(rad);
    } else {
      setTimeout(function () { el.remove(); }, 4500);
    }
    (document.body || document.documentElement).appendChild(el);
  }
  document.addEventListener("DOMContentLoaded", function () {
    meddelanden.splice(0).forEach(function (m) { toast(m[0], m[1]); });
  });

  /* ---------- 1. Flytt från skolvy.se (körs innan spelet startar) ---------- */
  if (SPEL && location.hash.indexOf("#flytt=") === 0) {
    try {
      var paket = JSON.parse(fran64(location.hash.slice(7)));
      if (paket && paket.spel === SPEL && paket.nycklar) {
        var befintlig = lasNycklar();
        if (Object.keys(befintlig).length === 0) {
          skrivNycklar(paket.nycklar);
          toast("Välkommen till nya adressen! Dina framsteg flyttade med.");
        } else if (fingeravtryck(befintlig) !== fingeravtryck(paket.nycklar)) {
          localStorage.setItem("pp_reserv_" + SPEL, JSON.stringify({ tid: Date.now(), nycklar: paket.nycklar }));
          toast("Du har redan spelat här, så den här sparningen behölls. Den gamla från skolvy.se finns kvar som reserv.", [
            { text: "Använd den gamla", gor: function () { skrivNycklar(paket.nycklar); location.reload(); } },
            { text: "Behåll den här", gor: function () {} }
          ]);
        }
      }
    } catch (e) { /* trasig länk: spelet startar som vanligt */ }
    history.replaceState(null, "", location.pathname + location.search);
  }

  /* ---------- 2. Återställ från kontot (förberett av förra sidladdningen) ---------- */
  if (SPEL) {
    var vantande = sessionStorage.getItem(ATERSTALL);
    if (vantande) {
      sessionStorage.removeItem(ATERSTALL);
      try {
        var a = JSON.parse(vantande);
        skrivNycklar(a.nycklar);
        satMarkor(a.nycklar, a.tid);
        var reservText = localStorage.getItem("pp_reserv_" + SPEL);
        if (a.reserv && reservText) {
          toast("Dina framsteg hämtades från ditt konto. Det du spelat på den här enheten innan finns kvar som reserv.", [
            { text: "Okej", gor: function () {} },
            { text: "Använd enhetens i stället", gor: function () {
              try { var r = JSON.parse(reservText); skrivNycklar(r.nycklar); localStorage.removeItem(MARKOR); localStorage.setItem("pp_tvinga_" + SPEL, "1"); location.reload(); } catch (e) { }
            } }
          ]);
        } else {
          toast("Dina framsteg hämtades från ditt konto.");
        }
      } catch (e) { }
    }
  }

  /* ---------- Supabase ---------- */
  var klientLofte = null;
  function klient() {
    if (!HAR_KONTO) return Promise.resolve(null);
    if (!klientLofte) {
      klientLofte = (function(){return window.supabase?Promise.resolve(window.supabase):new Promise(function(ok,nej){var s=document.createElement("script");s.src="/assets/vendor/supabase.js";s.onload=function(){ok(window.supabase)};s.onerror=nej;document.head.appendChild(s)})})().then(function (m) {
        return m.createClient(K.supabaseUrl, K.supabaseAnonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
        });
      }).catch(function () { return null; });
    }
    return klientLofte;
  }
  function session() {
    return klient().then(function (sb) {
      if (!sb) return null;
      return sb.auth.getSession().then(function (r) { return r.data.session ? { sb: sb, s: r.data.session } : null; });
    });
  }

  /* ---------- 3. Synk mellan spelet och kontot ---------- */
  var uppladdar = false, forstaUpp = true, pausad = false;
  function laddaUpp(sb, uid, tvinga) {
    if (uppladdar || pausad) return Promise.resolve();
    var lokal = lasNycklar();
    if (!Object.keys(lokal).length) return Promise.resolve();
    var m = lasMarkor();
    if (!tvinga && m && m.h === fingeravtryck(lokal)) return Promise.resolve();
    uppladdar = true;
    var tid = Date.now();
    return sb.from("sparningar")
      .upsert({ user_id: uid, spel: SPEL, data: { nycklar: lokal }, sparad_at: new Date(tid).toISOString() })
      .then(function (r) {
        uppladdar = false;
        if (r.error) return;
        satMarkor(lokal, tid);
        if (forstaUpp && !m) toast("Dina framsteg sparas nu på ditt konto.");
        forstaUpp = false;
      }, function () { uppladdar = false; });
  }

  function startaSynk() {
    session().then(function (x) {
      if (!x) return;
      var sb = x.sb, uid = x.s.user.id;
      sb.from("sparningar").select("data,sparad_at").eq("spel", SPEL).maybeSingle().then(function (r) {
        var rad = r.data, lokal = lasNycklar(), m = lasMarkor();
        if (localStorage.getItem("pp_tvinga_" + SPEL)) {
          localStorage.removeItem("pp_tvinga_" + SPEL);
          laddaUpp(sb, uid, true);
          return pagaende(sb, uid, false);
        }
        var lokalH = fingeravtryck(lokal);
        if (rad && rad.data && rad.data.nycklar) {
          var moln = rad.data.nycklar, molnT = Date.parse(rad.sparad_at);
          var olika = fingeravtryck(moln) !== lokalH;
          var molnNyare = !m || molnT > m.t + 1000;
          if (olika && molnNyare) {
            var ladda = function (reserv) {
              if (reserv && Object.keys(lokal).length) localStorage.setItem("pp_reserv_" + SPEL, JSON.stringify({ tid: Date.now(), nycklar: lokal }));
              sessionStorage.setItem(ATERSTALL, JSON.stringify({ nycklar: moln, tid: molnT, reserv: !!reserv }));
              location.reload();
            };
            // Första gången på den här enheten: hämta kontots framsteg, spara enhetens som reserv
            if (!m) { ladda(true); return; }
            // Inget nytt spelat här sedan senaste synk: hämta direkt
            if (m.h === lokalH || Object.keys(lokal).length === 0) { ladda(false); return; }
            // Spelat på två ställen sedan sist: fråga
            pausad = true;
            var nar = new Date(molnT).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
            toast("Du har spelat på en annan enhet också (sparat " + nar + "). Vilka framsteg vill du fortsätta med?", [
              { text: "Den andra enhetens", gor: function () { ladda(true); } },
              { text: "Den här enhetens", gor: function () { pausad = false; laddaUpp(sb, uid, true); } }
            ]);
            return pagaende(sb, uid, false);
          }
        }
        pagaende(sb, uid, true);
      });
    });
  }
  function pagaende(sb, uid, direkt) {
    if (direkt) laddaUpp(sb, uid, false);
    setInterval(function () { laddaUpp(sb, uid, false); }, 15000);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") laddaUpp(sb, uid, false);
    });
  }

  if (SPEL && HAR_KONTO) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startaSynk);
    else startaSynk();
  }

  /* ---------- Startsidan: visa inloggningsstatus i menyn ---------- */
  function uppdateraMeny() {
    var lank = document.getElementById("konto-lank");
    session().then(function (x) {
      // Kom man hit efter inloggning från en annan sida (t.ex. Matteträning)? Gå tillbaka dit.
      var tillbaka = null;
      try { tillbaka = sessionStorage.getItem("pp_tillbaka"); } catch (e) { }
      if (x && tillbaka && tillbaka !== location.pathname && /^\/[\w\-\/]*$/.test(tillbaka)) {
        try { sessionStorage.removeItem("pp_tillbaka"); } catch (e) { }
        location.replace(tillbaka); return;
      }
      if (x && lank) {
        lank.textContent = "Mitt konto";
        lank.setAttribute("aria-label", "Mitt konto, inloggad som " + (x.s.user.email || ""));
      }
    });
  }
  if (!SPEL) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", uppdateraMeny);
    else uppdateraMeny();
  }

  window.PPKonto = { klient: klient, session: session, harKonto: HAR_KONTO, toast: toast, inloggning: K.inloggning || [] };
})();
