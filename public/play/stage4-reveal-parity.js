(() => {
  "use strict";

  /*
   * Fase 4 — apresentação do chefão alinhada às Fases 1–3.
   *
   * As fases-base exibem um banner forte quando a arena começa. A Fase 4 tinha
   * apenas toast + HUD, então Água pOtávio entrava sem a mesma mudança de ritmo.
   * Este módulo observa SOMENTE o debug público e controla classes/DOM visuais.
   * Não pausa, não escreve em HP/água, não altera física, IA, timers ou controles.
   */

  const screen = document.querySelector(".stage4-screen");
  const banner = document.querySelector("#stage4-boss-banner");
  if (!screen || !banner || typeof window.requestAnimationFrame !== "function") return;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const revealDuration = reducedMotion ? 1200 : 2600;

  let wasBossActive = false;
  let revealUntil = 0;
  let visible = false;

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function showReveal(now, debug) {
    revealUntil = now + revealDuration;
    visible = true;
    banner.hidden = false;
    banner.dataset.phase = String(debug?.boss?.phase ?? 1);
    screen.classList.add("stage4-boss-reveal-active");
  }

  function hideReveal() {
    if (!visible) return;
    visible = false;
    revealUntil = 0;
    banner.hidden = true;
    screen.classList.remove("stage4-boss-reveal-active");
  }

  function frame(now) {
    const debug = debugState();
    const bossActive = Boolean(debug?.mode === "play" && debug?.boss?.active);

    if (bossActive && !wasBossActive) showReveal(now, debug);
    if ((!bossActive && wasBossActive) || (visible && now >= revealUntil)) hideReveal();

    wasBossActive = bossActive;
    window.requestAnimationFrame(frame);
  }

  window.__shallStage4RevealParity = () => ({
    visible,
    bossActive: wasBossActive,
    remainingMs: Math.max(0, Math.round(revealUntil - performance.now())),
  });

  window.requestAnimationFrame(frame);
})();
