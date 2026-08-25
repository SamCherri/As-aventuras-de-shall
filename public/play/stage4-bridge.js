(() => {
  "use strict";

  const stage4Button = document.querySelector("#stage4-button");
  stage4Button?.addEventListener("click", () => {
    location.href = "./stage4.html";
  });

  const isZicoEnding = () => {
    const endingTitle = document.querySelector("#ending-title")?.textContent || "";
    const endingBoss = document.querySelector("#ending-boss")?.getAttribute("src") || "";
    return /ZICO/i.test(`${endingTitle} ${endingBoss}`);
  };

  // A fase 3 já existia antes da fase aquática. Quando o epílogo de Zico termina,
  // deixamos explícito que o antigo botão de replay agora continua para a fase 4.
  const syncStage4ContinuationLabel = () => {
    const replay = document.querySelector("#play-again");
    if (!replay || !isZicoEnding()) return;
    if (replay.textContent !== "FASE 4 ▶") replay.textContent = "FASE 4 ▶";
    replay.setAttribute("aria-label", "Continuar para a Fase 4: Água pOtávio");
  };

  const endingLayer = document.querySelector("#end-layer");
  if (endingLayer) {
    new MutationObserver(syncStage4ContinuationLabel).observe(endingLayer, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["hidden", "src"],
    });
  }
  syncStage4ContinuationLabel();

  document.addEventListener("click", (event) => {
    const replay = event.target.closest?.("#play-again");
    if (!replay || replay.hidden || !isZicoEnding()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = "./stage4.html";
  }, true);
})();
