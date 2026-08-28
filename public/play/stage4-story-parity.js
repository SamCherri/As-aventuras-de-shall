(() => {
  "use strict";

  /*
   * Fase 4 — sinalização/humor ambiental alinhados às Fases 1–3.
   *
   * As fases-base usam placas grandes e engraçadas (LANCHALL CROC, TÚNEL DO
   * SUCO, FEIRA DO MEIO-DIA...) para dar personalidade ao cenário sem criar uma
   * segunda arquitetura por cima da arte principal. Depois da consolidação dos
   * landmarks da Fase 4, este módulo fica deliberadamente restrito à SINALIZAÇÃO:
   * ele substitui visualmente as placas técnicas dos marcos nativos por placas
   * de duas linhas com humor, preservando a arquitetura de stage4-scene-parity.
   *
   * É uma camada somente visual, inserida no fim do midground. Não escreve em
   * física, hitboxes, HP, dano, IA, correntezas, controles, rotas ou timers.
   */

  const canvas = document.querySelector("#stage4-canvas");
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!canvas || !proto || proto.__shallStage4StoryParityInstalled) return;

  const ctx = canvas.getContext("2d");
  const previousDrawImage = proto.drawImage;
  const W = canvas.width;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const FAR = { sx: 0, sy: 0, sw: 133, sh: 44 };
  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };

  // Mesmas posições dos landmarks NATIVOS de stage4-scene-parity.
  // O offset/y cobre a placa técnica já existente sem duplicar arquitetura.
  const LANDMARKS = Object.freeze([
    { x: 760,  centerOffset: 22, y: 176, width: 188, title: "CANAL 04",        line: "BOIA NÃO INCLUSA",      accent: "#86e2c7", icon: "buoy" },
    { x: 1690, centerOffset: 10, y: 166, width: 206, title: "BOLHA EXPRESS",   line: "FAVOR NÃO ESTOURAR",    accent: "#7eeaf2", icon: "bubble" },
    { x: 2860, centerOffset: 22, y: 176, width: 222, title: "CORRENTEZA 220V", line: "NÃO USE NA TOMADA",     accent: "#ffc94a", icon: "bolt" },
    { x: 3970, centerOffset: 10, y: 166, width: 222, title: "MEXILHÃO VIP",    line: "ENTRADA SÓ DE CONCHA",  accent: "#d3a9cd", icon: "shell" },
    { x: 4900, centerOffset: 22, y: 176, width: 206, title: "ÁGUA pOtÁVIO",    line: "QUASE POTÁVEL",         accent: "#75e6ef", icon: "drop" },
    { x: 5480, centerOffset: 17, y: 80,  width: 224, title: "ARENA DO GALÃO",  line: "NÃO APERTE A BARRIGA",  accent: "#ffcf62", icon: "tank" },
  ]);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let storyDrawnThisFrame = false;

  function matchesSource(args, source) {
    return args.length === 9 &&
      args[1] === source.sx && args[2] === source.sy &&
      args[3] === source.sw && args[4] === source.sh;
  }

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function cameraFor(debug) {
    const parity = typeof window.__shallStage4CameraParity === "function"
      ? window.__shallStage4CameraParity()
      : null;
    if (Number.isFinite(parity?.camera)) return parity.camera;
    const heroX = debug?.hero?.x ?? 0;
    return clamp(debug?.boss?.active ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
  }

  function rect(x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function text(textValue, x, y, size, color) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = `900 ${size}px "Courier New", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#020912";
    ctx.fillText(textValue, Math.round(x + 2), Math.round(y + 2));
    ctx.fillStyle = color;
    ctx.fillText(textValue, Math.round(x), Math.round(y));
    ctx.restore();
  }

  function drawIcon(kind, x, y, accent, pulse) {
    const dark = "#04131f";
    if (kind === "buoy") {
      rect(x + 4, y + 3, 12, 4, accent, pulse);
      rect(x + 1, y + 7, 18, 8, accent, 0.9);
      rect(x + 5, y + 9, 10, 4, dark, 0.95);
      rect(x + 6, y + 15, 8, 3, "#fff0bf", 0.85);
    } else if (kind === "bubble") {
      rect(x + 3, y + 3, 6, 3, "#d9fbff", pulse);
      rect(x, y + 6, 3, 7, accent, 0.86);
      rect(x + 9, y + 5, 3, 9, accent, 0.62);
      rect(x + 5, y + 14, 6, 3, "#2f8fa3", 0.82);
      rect(x + 13, y + 2, 5, 5, "#d9fbff", pulse * 0.75);
    } else if (kind === "bolt") {
      rect(x + 8, y + 1, 7, 7, accent, pulse);
      rect(x + 4, y + 7, 8, 6, accent, pulse);
      rect(x + 8, y + 12, 6, 7, accent, pulse);
      rect(x + 3, y + 9, 5, 4, "#fff0bf", 0.9);
    } else if (kind === "shell") {
      rect(x + 3, y + 7, 15, 9, accent, 0.9);
      rect(x + 6, y + 3, 9, 5, "#f3c28f", 0.88);
      rect(x + 6, y + 10, 3, 6, "#8b5f8f", 0.92);
      rect(x + 12, y + 9, 3, 7, "#fff0bf", 0.72);
    } else if (kind === "drop") {
      rect(x + 8, y + 1, 5, 5, "#d9fbff", pulse);
      rect(x + 5, y + 5, 11, 10, accent, 0.92);
      rect(x + 7, y + 15, 7, 3, "#2f9fbd", 0.9);
      rect(x + 8, y + 7, 3, 5, "#d9fbff", 0.78);
    } else {
      rect(x + 3, y + 2, 15, 14, accent, 0.88);
      rect(x + 6, y + 5, 9, 8, dark, 0.92);
      rect(x + 9, y, 3, 4, "#d9fbff", 0.75);
      rect(x + 7, y + 8, 5, 3, "#ffc94a", pulse);
    }
  }

  function plate(landmark, camera, tick) {
    const centerX = landmark.x - camera + landmark.centerOffset;
    if (centerX < -landmark.width || centerX > W + landmark.width) return;

    const x = Math.round(centerX - landmark.width / 2);
    const y = landmark.y;
    const h = 56;
    const pulse = reducedMotion ? 0.82 : 0.68 + Math.sin(tick * 0.004 + landmark.x * 0.01) * 0.18;

    // Sombra dura + placa com cantos em degraus, mesma gramática dos painéis base.
    rect(x + 5, y + 5, landmark.width, h, "#010814", 0.7);
    rect(x + 4, y, landmark.width - 8, h, "#061426", 0.98);
    rect(x, y + 4, landmark.width, h - 8, "#061426", 0.98);
    rect(x + 4, y + 4, landmark.width - 8, h - 8, "#173744", 0.98);
    rect(x + 8, y + 8, landmark.width - 16, 4, landmark.accent, pulse);
    rect(x + 8, y + h - 12, landmark.width - 16, 4, "#031522", 0.88);

    // Parafusos e ícone temático reforçam que a placa pertence ao cenário.
    rect(x + 7, y + 7, 3, 3, "#d9fbff", 0.68);
    rect(x + landmark.width - 10, y + 7, 3, 3, "#d9fbff", 0.68);
    rect(x + 7, y + h - 10, 3, 3, "#06202d", 0.86);
    rect(x + landmark.width - 10, y + h - 10, 3, 3, "#06202d", 0.86);
    drawIcon(landmark.icon, x + 11, y + 17, landmark.accent, pulse);

    const textCenter = centerX + 7;
    const titleSize = landmark.title.length > 15 ? 9 : 11;
    const lineSize = landmark.line.length > 19 ? 7 : 8;
    text(landmark.title, textCenter, y + 24, titleSize, "#fff0bf");
    text(landmark.line, textCenter, y + 41, lineSize, landmark.accent);
  }

  function drawStoryFrame() {
    const debug = debugState();
    if (!debug || debug.mode !== "play") return;

    const camera = cameraFor(debug);
    const tick = performance.now();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const landmark of LANDMARKS) plate(landmark, camera, tick);
    ctx.restore();
  }

  function storyParityDrawImage(...args) {
    const isFar = this.canvas?.id === "stage4-canvas" && matchesSource(args, FAR);
    const isMid = this.canvas?.id === "stage4-canvas" && matchesSource(args, MID);

    if (isFar) {
      const dx = Number(args[5]);
      const dw = Number(args[7]);
      if (Number.isFinite(dx) && Number.isFinite(dw) && dx <= -dw) {
        storyDrawnThisFrame = false;
      }
    }

    const result = previousDrawImage.apply(this, args);

    if (isMid && !storyDrawnThisFrame) {
      const dx = Number(args[5]);
      if (Number.isFinite(dx) && dx >= W) {
        storyDrawnThisFrame = true;
        drawStoryFrame();
      }
    }

    return result;
  }

  storyParityDrawImage.__shallStage4StoryParity = true;
  proto.drawImage = storyParityDrawImage;
  proto.__shallStage4StoryParityInstalled = true;

  window.__shallStage4StoryParity = Object.freeze({
    landmarkCount: LANDMARKS.length,
    mode: "signage-only",
    architectureWrites: false,
    gameplayWrites: false,
    lines: Object.freeze(LANDMARKS.map(({ title, line }) => `${title} · ${line}`)),
  });
})();
