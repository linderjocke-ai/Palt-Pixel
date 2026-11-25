/* Palt & pixel – gemensamt för listsidor, projektsidor och startsidan */
(() => {
  "use strict";
  const lugn = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const kanHovra = matchMedia("(hover: hover)").matches;

  /* Tillbaka: gå till föregående sida om den låg på paltpixel, annars till länkens mål. */
  document.querySelectorAll("[data-tillbaka]").forEach((a) => {
    a.addEventListener("click", (e) => {
      let frånOss = false;
      try { frånOss = document.referrer && new URL(document.referrer).origin === location.origin && document.referrer !== location.href; } catch (_) {}
      if (frånOss && history.length > 1) { e.preventDefault(); history.back(); }
    });
  });

  /* Kort: spela upp ett kort klipp när muspekaren vilar på kortet. */
  function starta(kort) {
    const v = kort.querySelector("video[data-klipp]");
    if (!v || lugn) return;
    if (!v.src) v.src = v.dataset.klipp;
    v.currentTime = 0;
    const p = v.play();
    if (p) p.then(() => kort.classList.add("spelar-klipp")).catch(() => {});
  }
  function stoppa(kort) {
    const v = kort.querySelector("video[data-klipp]");
    kort.classList.remove("spelar-klipp");
    if (v) v.pause();
  }
  if (kanHovra) {
    document.addEventListener("pointerover", (e) => {
      const k = e.target.closest && e.target.closest(".kort:has(video[data-klipp]), .utvald:has(video[data-klipp]), a:has(video[data-klipp])");
      if (k && !k.contains(e.relatedTarget)) starta(k);
    });
    document.addEventListener("pointerout", (e) => {
      const k = e.target.closest && e.target.closest(".kort:has(video[data-klipp]), .utvald:has(video[data-klipp]), a:has(video[data-klipp])");
      if (k && !k.contains(e.relatedTarget)) stoppa(k);
    });
  }
  document.addEventListener("focusin", (e) => { const k = e.target.closest && e.target.closest(".kort:has(video[data-klipp]), .utvald:has(video[data-klipp]), a:has(video[data-klipp])"); if (k && kanHovra) starta(k); });
  document.addEventListener("focusout", (e) => { const k = e.target.closest && e.target.closest(".kort:has(video[data-klipp]), .utvald:has(video[data-klipp]), a:has(video[data-klipp])"); if (k) stoppa(k); });

  /* Banderollen på projektsidan */
  const film = document.querySelector(".banderoll-video");
  const paus = document.querySelector("[data-paus]");
  if (film && paus) {
    const satt = () => {
      const pausad = film.paused;
      paus.setAttribute("aria-label", pausad ? "Spela filmen" : "Pausa filmen");
      paus.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">${pausad ? '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>' : '<path d="M9 6v12M15 6v12"/>'}</svg>`;
    };
    if (lugn) { film.removeAttribute("autoplay"); film.pause(); }
    paus.addEventListener("click", () => { film.paused ? film.play() : film.pause(); });
    film.addEventListener("play", satt);
    film.addEventListener("pause", satt);
    satt();
  }
})();
