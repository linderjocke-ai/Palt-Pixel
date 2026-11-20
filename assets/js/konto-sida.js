/* Palt & pixel – kontosidan */
(() => {
  "use strict";
  const K = window.PPKonto;
  const visa = (id) => ["ej-aktiv", "utloggad", "inloggad"].forEach((x) => { document.getElementById(x).hidden = x !== id; });
  const SPELNAMN = { vaggen: "Väggen", frontlinjen: "Frontlinjen" };

  if (!K || !K.harKonto) { visa("ej-aktiv"); return; }

  // Göm inloggningssätt som inte är påslagna
  document.querySelectorAll(".logga-in").forEach((b) => {
    if (!K.inloggning.includes(b.dataset.provider)) b.hidden = true;
  });
  if (!K.inloggning.includes("epost")) document.getElementById("epost-form").hidden = true;

  K.klient().then(async (sb) => {
    if (!sb) { visa("ej-aktiv"); return; }

    const rita = async () => {
      const { data } = await sb.auth.getSession();
      const s = data.session;
      if (!s) { visa("utloggad"); return; }
      document.getElementById("anvandare").textContent = s.user.email || "okänd";
      visa("inloggad");
      const lista = document.getElementById("sparningar");
      const { data: rader } = await sb.from("sparningar").select("spel,sparad_at").order("sparad_at", { ascending: false });
      lista.replaceChildren();
      if (!rader || !rader.length) {
        const li = document.createElement("li");
        li.textContent = "Inga sparade spel än. Spela ett spel så sparas det här automatiskt.";
        lista.appendChild(li);
        return;
      }
      for (const r of rader) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "/" + r.spel + "/";
        a.textContent = SPELNAMN[r.spel] || r.spel;
        const t = document.createElement("span");
        t.textContent = "Sparat " + new Date(r.sparad_at).toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
        li.append(a, t);
        lista.appendChild(li);
      }
    };

    sb.auth.onAuthStateChange(() => { rita(); });
    rita();

    document.querySelectorAll(".logga-in").forEach((b) => {
      b.addEventListener("click", async () => {
        const provider = b.dataset.provider;
        const { error } = await sb.auth.signInWithOAuth({
          provider,
          options: { redirectTo: location.origin + "/konto/", scopes: provider === "azure" ? "email" : undefined }
        });
        if (error) K.toast("Det gick inte att logga in just nu. Försök igen om en stund.");
      });
    });

    const form = document.getElementById("epost-form");
    const fel = document.getElementById("epost-fel");
    const klar = document.getElementById("epost-klar");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const epost = form.epost.value.trim();
      fel.hidden = true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(epost)) {
        fel.textContent = "Skriv en e-postadress, till exempel namn@exempel.se.";
        fel.hidden = false;
        form.epost.focus();
        return;
      }
      const { error } = await sb.auth.signInWithOtp({ email: epost, options: { emailRedirectTo: location.origin + "/konto/" } });
      if (error) {
        fel.textContent = "Länken kunde inte skickas. Försök igen om en stund.";
        fel.hidden = false;
        return;
      }
      form.hidden = true;
      klar.textContent = "Kolla din e-post! Vi har skickat en länk till " + epost + ". Öppna den på den här enheten för att logga in.";
      klar.hidden = false;
    });
    form.epost.addEventListener("input", () => { fel.hidden = true; });

    document.getElementById("logga-ut").addEventListener("click", async () => {
      await sb.auth.signOut();
      rita();
    });
  });
})();
