(() => {
  "use strict";

  const stage4Button = document.querySelector("#stage4-button");
  stage4Button?.addEventListener("click", () => {
    location.href = "./stage4.html";
  });

  // A fase 3 já existia antes da fase aquática. Quando o epílogo de Zico termina,
  // interceptamos o antigo botão "JOGAR NOVAMENTE" e seguimos para a fase 4.
  document.addEventListener("click", (event) => {
    const replay = event.target.closest?.("#play-again");
    if (!replay || replay.hidden) return;
    const endingTitle = document.querySelector("#ending-title")?.textContent || "";
    if (!/ZICO/i.test(endingTitle)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.href = "./stage4.html";
  }, true);
})();
