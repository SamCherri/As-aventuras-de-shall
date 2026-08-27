(() => {
  "use strict";

  /*
   * Fase 4 — visual storytelling regional alinhado às Fases 1–3.
   *
   * As fases-base marcam cada trecho com landmarks grandes, placas engraçadas e
   * props temáticos. A Fase 4 já tinha microambientes distintos, mas suas placas
   * ainda eram quase todas técnicas. Este passe devolve a personalidade de Shall
   * às transições sem tocar em física, colisões, IA, HP, controles ou rotas.
   *
   * O desenho é injetado no final do midground nativo; portanto fica atrás da
   * gameplay, exatamente como arquitetura e sinalização das Fases 1–3.
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

  const LANDMARKS = [
    { x: 360, kind: "canal", title: "CANAL 04", line: "BOIA NÃO INCLUSA" },
    { x: 1080, kind: "bubbles", title: "BOLHA EXPRESS", line: "FAVOR NÃO ESTOURAR" },
    { x: 2200, kind: "current", title: "CORRENTEZA 220V", line: "NÃO USE NA TOMADA" },
    { x: 3400, kind: "shell", title: "MEXILHÃO VIP", line: "ENTRADA SÓ DE CONCHA" },
    { x: 4540, kind: "reservoir", title: "ÁGUA pOtÁVIO", line: "QUASE POTÁVEL" },
    { x: 5290, kind: "arena", title: "ARENA DO GALÃO", line: "NÃO APERTE A BARRIGA" },
  ];

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

  function pixelText(text, x, y, size, color, align = "center") {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = `900 ${size}px "Courier New", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#02101c";
    ctx.fillText(text, Math.round(x + 2), Math.round(y + 2));
    ctx.fillStyle = color;
    ctx.fillText(text, Math.round(x), Math.round(y));
    ctx.restore();
  }

  function sign(screenX, y, title, line, accent = "#58d2e2", width = 188) {
    const x = Math.round(screenX - width / 2);
    rect(x + 6, y + 6, width, 58, "#010a13", 0.68);
    rect(x, y, width, 58, "#031824", 0.98);
    rect(x + 4, y + 4, width - 8, 50, "#163949", 0.98);
    rect(x + 8, y + 8, width - 16, 5, accent, 0.82);
    rect(x + 8, y + 46, width - 16, 4, "#061d2a", 0.92);
    rect(x - 8, y + 18, 8, 22, "#03111c", 0.96);
    rect(x + width, y + 18, 8, 22, "#03111c", 0.96);
    pixelText(title, screenX, y + 25, title.length > 16 ? 10 : 12, "#fff0bf");
    pixelText(line, screenX, y + 42, line.length > 19 ? 7 : 8, accent);
  }

  function bolts(x, y, w, h, alpha = 0.7) {
    for (let px = x + 8; px < x + w - 5; px += 26) {
      rect(px, y + 7, 4, 4, "#9bdde0", alpha);
      rect(px, y + h - 11, 4, 4, "#06202d", alpha);
    }
  }

  function canalLandmark(x, tick) {
    rect(x - 72, 58, 16, 162, "#031724", 0.96);
    rect(x - 67, 62, 6, 154, "#35717a", 0.72);
    rect(x + 56, 58, 16, 162, "#031724", 0.96);
    rect(x + 61, 62, 6, 154, "#35717a", 0.72);
    rect(x - 80, 70, 160, 17, "#041a27", 0.98);
    rect(x - 74, 74, 148, 6, "#4b8990", 0.68);
    for (let gx = x - 54; gx <= x + 50; gx += 26) rect(gx, 95, 5, 70, "#174653", 0.7);
    const lamp = reducedMotion ? 0.72 : 0.58 + Math.sin(tick * 0.004) * 0.18;
    rect(x - 11, 93, 22, 12, "#082a36", 0.9);
    rect(x - 6, 96, 12, 6, "#86e2c7", lamp);
    sign(x, 172, "CANAL 04", "BOIA NÃO INCLUSA", "#86e2c7", 184);
  }

  function bubblesLandmark(x, tick) {
    rect(x - 64, 428, 128, 76, "#031a27", 0.84);
    rect(x - 55, 438, 110, 58, "#155461", 0.72);
    rect(x - 45, 448, 90, 7, "#69bdc5", 0.62);
    bolts(x - 55, 438, 110, 58);
    for (let i = 0; i < 6; i += 1) {
      const rise = reducedMotion ? i * 44 : (tick * (0.022 + i * 0.0018) + i * 71) % 330;
      const bx = x - 44 + (i % 3) * 42;
      const by = 430 - rise;
      if (by < 98 || by > 424) continue;
      const s = 4 + (i % 2) * 2;
      rect(bx, by + s, s, s * 2, "#56c6d8", 0.58);
      rect(bx + s, by, s * 2, s, "#d9fbff", 0.65);
      rect(bx + s * 3, by + s, s, s * 2, "#237a98", 0.5);
    }
    sign(x, 104, "BOLHA EXPRESS", "FAVOR NÃO ESTOURAR", "#7eeaf2", 206);
  }

  function currentLandmark(x, tick) {
    rect(x - 68, 66, 136, 98, "#061723", 0.9);
    rect(x - 59, 75, 118, 80, "#183a48", 0.88);
    bolts(x - 59, 75, 118, 80);
    const pulse = reducedMotion ? 0.7 : 0.54 + Math.sin(tick * 0.006) * 0.2;
    for (let i = 0; i < 3; i += 1) {
      const px = x - 38 + i * 38;
      rect(px, 100, 18, 28, "#072431", 0.9);
      rect(px + 5, 106, 8, 16, i === 2 ? "#ffc94a" : "#58d2e2", pulse);
    }
    rect(x - 92, 174, 184, 7, "#061a26", 0.9);
    rect(x - 92, 181, 184, 4, "#2f7180", 0.56);
    sign(x, 194, "CORRENTEZA 220V", "NÃO USE NA TOMADA", "#ffc94a", 224);
  }

  function shellLandmark(x, tick) {
    const glow = reducedMotion ? 0.7 : 0.6 + Math.sin(tick * 0.003) * 0.15;
    rect(x - 86, 372, 18, 132, "#092630", 0.74);
    rect(x + 68, 372, 18, 132, "#092630", 0.74);
    rect(x - 76, 356, 152, 20, "#123844", 0.84);
    rect(x - 65, 361, 130, 6, "#5b8e8e", 0.5);
    for (let i = 0; i < 5; i += 1) {
      const px = x - 58 + i * 29;
      rect(px, 337 - (i % 2) * 8, 22, 18, "#775d87", 0.72);
      rect(px + 5, 332 - (i % 2) * 8, 12, 7, "#c290ad", glow);
      rect(px + 9, 330 - (i % 2) * 8, 5, 4, "#ffe2d3", glow);
    }
    sign(x, 276, "MEXILHÃO VIP", "ENTRADA SÓ DE CONCHA", "#d3a9cd", 222);
  }

  function reservoirLandmark(x, tick) {
    rect(x - 70, 70, 140, 178, "#031722", 0.9);
    rect(x - 59, 80, 118, 158, "#164755", 0.8);
    rect(x - 48, 91, 96, 128, "#0b6b86", 0.44);
    bolts(x - 59, 80, 118, 158);
    const waterLine = 112 + (reducedMotion ? 0 : Math.sin(tick * 0.0025) * 4);
    rect(x - 43, waterLine, 86, 97, "#2f9fbd", 0.24);
    rect(x - 43, waterLine, 86, 5, "#8deaff", 0.62);
    rect(x - 92, 246, 184, 14, "#041923", 0.96);
    rect(x - 82, 250, 164, 5, "#4b7e83", 0.62);
    sign(x, 274, "ÁGUA pOtÁVIO", "QUASE POTÁVEL", "#75e6ef", 206);
  }

  function arenaLandmark(x, tick) {
    rect(x - 92, 58, 20, 446, "#03131f", 0.94);
    rect(x + 72, 58, 20, 446, "#03131f", 0.94);
    rect(x - 85, 62, 7, 438, "#315d67", 0.7);
    rect(x + 78, 62, 7, 438, "#315d67", 0.7);
    rect(x - 106, 58, 212, 18, "#02121c", 0.98);
    rect(x - 98, 62, 196, 7, "#4c7d84", 0.62);
    for (let i = 0; i < 7; i += 1) {
      const blink = reducedMotion ? 0.65 : (Math.floor(tick / 210 + i) % 2 ? 0.82 : 0.36);
      rect(x - 76 + i * 25, 85, 9, 7, i < 4 ? "#ffc94a" : "#e94e50", blink);
    }
    sign(x, 110, "ARENA DO GALÃO", "NÃO APERTE A BARRIGA", "#ffcf62", 224);
  }

  function drawLandmark(landmark, screenX, tick) {
    if (landmark.kind === "canal") canalLandmark(screenX, tick);
    else if (landmark.kind === "bubbles") bubblesLandmark(screenX, tick);
    else if (landmark.kind === "current") currentLandmark(screenX, tick);
    else if (landmark.kind === "shell") shellLandmark(screenX, tick);
    else if (landmark.kind === "reservoir") reservoirLandmark(screenX, tick);
    else arenaLandmark(screenX, tick);
  }

  function drawStoryFrame() {
    const debug = debugState();
    if (!debug || debug.mode !== "play") return;

    const camera = cameraFor(debug);
    const tick = performance.now();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    for (const landmark of LANDMARKS) {
      const screenX = landmark.x - camera;
      if (screenX < -150 || screenX > W + 150) continue;
      drawLandmark(landmark, screenX, tick);
    }
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

  window.__shallStage4StoryParity = () => ({
    landmarks: LANDMARKS.length,
    reducedMotion,
  });
})();
