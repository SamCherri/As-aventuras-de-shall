(() => {
  "use strict";

  /*
   * Fase 4 — paridade de contexto/HUD com Fases 1–3.
   *
   * As fases-base mantêm o canvas limpo e usam o toast canônico para mensagens
   * contextuais. A Fase 4 havia criado um segundo HUD persistente para ZONA e
   * CORRENTE, ocupando permanentemente a área de gameplay. Este módulo mantém
   * exatamente a mesma informação, mas a apresenta temporariamente no toast já
   * existente quando a zona muda. Não altera correntezas, física ou gameplay.
   */

  const depthHud = document.querySelector(".stage4-depth-hud");
  const zone = document.querySelector("#stage4-zone");
  const current = document.querySelector("#stage4-current");
  const toast = document.querySelector("#stage4-toast");

  if (!depthHud || !zone || !current || !toast) return;

  depthHud.hidden = true;
  depthHud.setAttribute("aria-hidden", "true");
  document.documentElement.classList.add("stage4-context-parity-ready");

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function contextualLabel() {
    const zoneLabel = zone.textContent.trim();
    const currentLabel = current.textContent.trim();
    if (!zoneLabel) return "";
    if (!currentLabel || currentLabel === "CALMA") return currentLabel
      ? `${zoneLabel} · ${currentLabel}`
      : zoneLabel;
    return `${zoneLabel} · CORRENTE ${currentLabel}`;
  }

  let queued = false;
  function queueParityToast() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      const debug = debugState();
      if (debug?.mode !== "play" || debug?.boss?.active) return;

      const label = contextualLabel();
      if (!label) return;

      // updateZone() da Fase 4 já abre o toast na mesma pilha de execução.
      // O observer roda em microtask logo depois e apenas normaliza o texto,
      // preservando duração, animação e comportamento canônicos do componente.
      toast.textContent = label;
    });
  }

  const observer = new MutationObserver(queueParityToast);
  observer.observe(zone, { childList: true, characterData: true, subtree: true });
  observer.observe(current, { childList: true, characterData: true, subtree: true });
})();
