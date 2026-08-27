(() => {
  "use strict";

  /*
   * Fase 4 — paridade visual dos recifes/tiles com Fases 1–3.
   *
   * Nas três primeiras fases, superfícies jogáveis recebem borda, sombra,
   * variação de silhueta e pequenos props ambientais. A Fase 4 já possui bons
   * tiles nativos, porém os recifes continuam lendo como blocos retangulares.
   *
   * Este wrapper intercepta somente o strokeRect final dos 10 recifes canônicos
   * da Fase 4 e adiciona um acabamento pixelado imediatamente após o desenho
   * nativo. Colisão, física, rota e dimensões dos obstáculos permanecem intactas.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4ReefParityInstalled) return;

  const nativeStrokeRect = proto.strokeRect;
  const REEFS = [
    [620, 58, 130, 215],
    [850, 330, 165, 175],
    [1370, 58, 180, 220],
    [1760, 315, 155, 190],
    [2310, 58, 120, 230],
    [2710, 310, 185, 195],
    [3130, 58, 145, 225],
    [3710, 315, 175, 190],
    [4140, 58, 130, 235],
    [4820, 305, 160, 200],
  ];

  const PALETTE = {
    ink: "#092f3c",
    deep: "#0e3f4a",
    rock: "#1b5960",
    light: "#2d7477",
    glint: "#70b8ad",
    coral: ["#d16e63", "#dea85e", "#8b78b8", "#5da58c"],
  };

  function matchesReef(x, y, w, h) {
    return REEFS.findIndex(([rx, ry, rw, rh]) =>
      Math.abs(x - rx) <= 2 &&
      Math.abs(y - ry) <= 2 &&
      Math.abs(w - rw) <= 2 &&
      Math.abs(h - rh) <= 2
    );
  }

  function px(ctx, x, y, w, h, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function coral(ctx, x, baseY, direction, color, variant) {
    const stem = variant % 2 ? 4 : 3;
    const height = 8 + (variant % 3) * 3;
    const topY = baseY + direction * height;
    px(ctx, x, Math.min(baseY, topY), stem, Math.abs(topY - baseY) + 2, color, 0.92);
    px(ctx, x - 4, topY + (direction > 0 ? -1 : -2), 6, 3, color, 0.86);
    if (variant % 3 !== 1) px(ctx, x + stem - 1, topY + direction * 2, 6, 3, color, 0.82);
    px(ctx, x + 1, Math.min(baseY, topY), 2, Math.max(3, Math.abs(topY - baseY) - 1), "#f0c98a", 0.24);
  }

  function barnacles(ctx, x, y, index) {
    const count = 2 + (index % 3);
    for (let i = 0; i < count; i += 1) {
      const bx = x + i * 9;
      px(ctx, bx, y, 5, 4, i % 2 ? "#82bfb3" : "#5e9c94", 0.82);
      px(ctx, bx + 1, y, 2, 1, "#c8e1c9", 0.62);
    }
  }

  function surfaceLip(ctx, x, y, w, bottom, index) {
    const exposedY = bottom ? y : y - 1;
    const direction = bottom ? -1 : 1;

    // Borda em blocos: mais próxima das plataformas/props desenhados nas Fases 1–3.
    px(ctx, x + 3, exposedY + (bottom ? 0 : -4), w - 6, 5, PALETTE.ink, 0.96);
    px(ctx, x + 8, exposedY + (bottom ? -2 : -1), w - 16, 4, PALETTE.light, 0.92);
    px(ctx, x + 14, exposedY + (bottom ? -3 : 1), Math.max(18, w - 28), 2, PALETTE.glint, 0.58);

    const chunks = Math.max(3, Math.floor(w / 38));
    for (let i = 0; i < chunks; i += 1) {
      const phase = (i * 13 + index * 7) % 5;
      const cx = x + 9 + i * ((w - 18) / chunks);
      const chunkW = 8 + phase * 2;
      const chunkH = 3 + (phase % 3) * 2;
      const cy = bottom
        ? exposedY - chunkH + 1
        : exposedY + 3;
      px(ctx, cx, cy, chunkW, chunkH, phase % 2 ? PALETTE.rock : PALETTE.deep, 0.95);
      if (phase % 3 === 0) {
        px(ctx, cx + 2, cy + (bottom ? -2 : chunkH), Math.max(3, chunkW - 5), 3, PALETTE.light, 0.75);
      }
    }

    const coralCount = w >= 170 ? 3 : 2;
    for (let i = 0; i < coralCount; i += 1) {
      const variant = index * 3 + i;
      const cx = x + 24 + i * ((w - 48) / Math.max(1, coralCount - 1));
      const base = bottom ? exposedY - 2 : exposedY + 5;
      coral(ctx, cx, base, direction, PALETTE.coral[variant % PALETTE.coral.length], variant);
    }
  }

  function sideStrata(ctx, x, y, w, h, index) {
    const rows = Math.max(3, Math.floor(h / 52));
    for (let i = 0; i < rows; i += 1) {
      const yy = y + 24 + i * ((h - 42) / Math.max(1, rows - 1));
      const fromLeft = (i + index) % 2 === 0;
      const ww = 18 + ((index + i * 5) % 4) * 7;
      const xx = fromLeft ? x + 7 : x + w - ww - 7;
      px(ctx, xx, yy, ww, 4, PALETTE.deep, 0.68);
      px(ctx, xx + (fromLeft ? 3 : 0), yy, Math.max(5, ww - 7), 2, PALETTE.light, 0.43);
    }

    const crackX = x + 22 + ((index * 29) % Math.max(28, w - 50));
    const crackY = y + Math.round(h * 0.42);
    px(ctx, crackX, crackY, 4, 16, PALETTE.ink, 0.64);
    px(ctx, crackX + 4, crackY + 12, 8, 4, PALETTE.ink, 0.58);
    px(ctx, crackX - 4, crackY + 4, 4, 7, PALETTE.light, 0.32);
  }

  function finishReef(ctx, x, y, w, h, index) {
    const bottom = y > 200;
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Parede com estratos e pequenas quebras visuais para reduzir repetição do tile.
    sideStrata(ctx, x, y, w, h, index);

    // A face exposta à água recebe um lábio mais forte e silhueta pixelada.
    surfaceLip(ctx, x, bottom ? y : y + h, w, bottom, index);

    // Pequenos agrupamentos no canto criam leitura de material sem fechar passagens.
    const barnacleY = bottom ? y + 18 : y + h - 24;
    const barnacleX = index % 2 ? x + 16 : x + w - 48;
    barnacles(ctx, barnacleX, barnacleY, index);

    // Pés laterais discretos dão massa aos recifes sem alterar a colisão real.
    px(ctx, x - 3, y + 12, 6, Math.min(28, h - 24), PALETTE.ink, 0.52);
    px(ctx, x + w - 3, y + h - Math.min(38, h / 3), 6, Math.min(28, h - 24), PALETTE.ink, 0.48);

    ctx.restore();
  }

  function parityStrokeRect(x, y, w, h) {
    const result = nativeStrokeRect.call(this, x, y, w, h);
    if (this.canvas?.id !== "stage4-canvas") return result;

    const index = matchesReef(x, y, w, h);
    if (index < 0) return result;

    finishReef(this, x, y, w, h, index);
    return result;
  }

  parityStrokeRect.__shallStage4ReefParity = true;
  proto.strokeRect = parityStrokeRect;
  proto.__shallStage4ReefParityInstalled = true;
})();
