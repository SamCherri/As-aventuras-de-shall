(() => {
  "use strict";

  /*
   * Fase 4 — recifes compostos com a mesma arte-fonte do restante da fase.
   *
   * Fases 1–3 deixam panoramas, plataformas e props canônicos carregarem a maior
   * parte da leitura material. O acabamento antigo dos dez recifes da Fase 4 era
   * uma segunda camada procedural: criava rocha, brilho, coral e estratos com uma
   * paleta própria de fillRect por cima dos tiles oficiais. Depois que backdrop,
   * landmarks e foreground foram normalizados para o atlas, esses obstáculos altos
   * continuavam parecendo um sistema gráfico separado no centro da gameplay.
   *
   * Este passe mantém exatamente os dez recifes, posições, dimensões e colisões,
   * mas substitui todo o acabamento procedural por recortes do atlas NATIVO:
   * reefTop/reefBottom nas faces expostas, caveWall/cracked para variação interna
   * e coral/bubbleVent como pequenos detalhes. A decoração é recortada junto ao
   * obstáculo e não cria nova geometria de gameplay.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4ReefParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const nativeStrokeRect = proto.strokeRect;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const TILE_REGION = { x: 0, y: 138 };
  const TILE = Object.freeze({
    reefTop: [0, 0, 40, 30],
    reefMiddle: [0, 32, 40, 32],
    reefBottom: [0, 64, 40, 32],
    caveWall: [40, 0, 40, 32],
    coral: [80, 0, 40, 32],
    pipe: [120, 64, 40, 32],
    bubbleVent: [160, 64, 40, 32],
    arenaFloor: [200, 64, 40, 32],
    cracked: [240, 64, 40, 32],
  });
  const REEFS = Object.freeze([
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
  ]);

  let atlasImage = null;

  function looksLikeStage4Atlas(image) {
    return image instanceof HTMLImageElement &&
      typeof image.src === "string" &&
      image.src.startsWith("data:image/png;base64,");
  }

  function atlasSource(local) {
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [TILE_REGION.x + sx, TILE_REGION.y + sy, ex - sx, ey - sy];
  }

  function drawNative(context, name, x, y, w, h, alpha = 1, flipX = false) {
    const local = TILE[name];
    if (!atlasImage || !local || w <= 0 || h <= 0 || alpha <= 0.001) return false;
    const [sx, sy, sw, sh] = atlasSource(local);

    context.save();
    context.globalAlpha *= alpha;
    context.imageSmoothingEnabled = false;
    if (flipX) {
      context.translate(Math.round(x + w), Math.round(y));
      context.scale(-1, 1);
      previousDrawImage.call(
        context,
        atlasImage,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        Math.round(w),
        Math.round(h),
      );
    } else {
      previousDrawImage.call(
        context,
        atlasImage,
        sx,
        sy,
        sw,
        sh,
        Math.round(x),
        Math.round(y),
        Math.round(w),
        Math.round(h),
      );
    }
    context.restore();
    return true;
  }

  function matchesReef(x, y, w, h) {
    return REEFS.findIndex(([rx, ry, rw, rh]) =>
      Math.abs(x - rx) <= 2 &&
      Math.abs(y - ry) <= 2 &&
      Math.abs(w - rw) <= 2 &&
      Math.abs(h - rh) <= 2,
    );
  }

  function visibleOnCanvas(context, x, w) {
    const transform = typeof context.getTransform === "function" ? context.getTransform() : null;
    const offsetX = transform?.e ?? 0;
    const screenLeft = x + offsetX;
    const screenRight = screenLeft + w;
    const canvasWidth = context.canvas?.width ?? 480;
    return screenRight >= -32 && screenLeft <= canvasWidth + 32;
  }

  function materialStrip(context, name, x, y, width, tileW, tileH, alpha, seed = 0) {
    const step = Math.max(24, tileW - 2);
    for (let px = x, i = 0; px < x + width; px += step, i += 1) {
      const w = Math.min(tileW, x + width - px + 2);
      drawNative(context, name, px, y, w, tileH, alpha, (i + seed) % 2 === 1);
    }
  }

  // Mantém o nome histórico usado pelos smoke tests, mas agora cada “coral” é o
  // recorte oficial do atlas, sem cor ou silhueta procedural inventada no runtime.
  function coral(context, x, y, width, height, index, flip = false) {
    return drawNative(context, "coral", x, y, width, height, 0.58 + (index % 3) * 0.06, flip);
  }

  function barnacles(context, x, y, index, bottom) {
    const size = 22 + (index % 2) * 4;
    const h = 16 + (index % 3) * 2;
    const name = index % 2 ? "bubbleVent" : "coral";
    const yy = bottom ? y : y - h;
    drawNative(context, name, x, yy, size, h, 0.42, index % 2 === 1);
  }

  function sideStrata(context, x, y, w, h, index) {
    // Variação interna vem dos mesmos caveWall/cracked que já constroem gruta,
    // reservatório e arena. Tudo fica dentro da máscara do recife.
    const rows = Math.max(2, Math.floor(h / 66));
    for (let i = 0; i < rows; i += 1) {
      const fromLeft = (i + index) % 2 === 0;
      const width = Math.min(w * 0.42, 42 + ((index + i) % 3) * 9);
      const height = 24 + ((index + i) % 2) * 5;
      const xx = fromLeft ? x + 4 : x + w - width - 4;
      const yy = y + 18 + i * ((h - 48) / Math.max(1, rows - 1));
      drawNative(
        context,
        (i + index) % 3 === 0 ? "cracked" : "caveWall",
        xx,
        Math.min(y + h - height - 4, yy),
        width,
        height,
        0.30 + (i % 2) * 0.06,
        !fromLeft,
      );
    }
  }

  function surfaceLip(context, x, exposedY, w, bottom, index) {
    // Obstáculos que nascem do fundo expõem reefTop; os que descem do teto expõem
    // reefBottom. A faixa ocupa quase toda a face e só avança 4 px para a água,
    // evitando sugerir uma hitbox muito diferente da colisão real.
    const name = bottom ? "reefTop" : "reefBottom";
    const tileH = 26;
    const y = bottom ? exposedY - 4 : exposedY - tileH + 4;
    materialStrip(context, name, x, y, w, 42, tileH, 0.92, index);

    const accentName = index % 3 === 0 ? "cracked" : "reefMiddle";
    const accentY = bottom ? exposedY + 17 : exposedY - 39;
    materialStrip(context, accentName, x + 8, accentY, Math.max(0, w - 16), 38, 23, 0.34, index + 1);
  }

  function finishReef(context, x, y, w, h, index) {
    if (!atlasImage) return;
    const bottom = y > 200;
    const exposedY = bottom ? y : y + h;

    context.save();
    context.imageSmoothingEnabled = false;

    // O acabamento principal fica preso ao corpo do obstáculo. Uma pequena margem
    // vertical permite somente a borda irregular da face exposta, sem nova massa.
    context.beginPath();
    context.rect(
      Math.round(x),
      Math.round(bottom ? y - 4 : y),
      Math.round(w),
      Math.round(h + 4),
    );
    context.clip();

    sideStrata(context, x, y, w, h, index);
    surfaceLip(context, x, exposedY, w, bottom, index);

    const coralCount = w >= 170 ? 3 : 2;
    for (let i = 0; i < coralCount; i += 1) {
      const width = 26 + ((index + i) % 2) * 6;
      const height = 22 + ((index + i) % 3) * 3;
      const px = x + 18 + i * ((w - 54) / Math.max(1, coralCount - 1));
      const py = bottom ? exposedY - 10 : exposedY - height + 10;
      coral(context, px, py, width, height, index + i, (index + i) % 2 === 1);
    }

    const barnacleX = index % 2 ? x + 12 : x + w - 38;
    const barnacleY = bottom ? exposedY + 9 : exposedY - 9;
    barnacles(context, barnacleX, barnacleY, index, bottom);

    context.restore();
  }

  function reefCaptureDrawImage(image, ...args) {
    if (this.canvas?.id === TARGET_CANVAS_ID && looksLikeStage4Atlas(image)) {
      atlasImage = image;
    }
    return previousDrawImage.call(this, image, ...args);
  }

  function parityStrokeRect(x, y, w, h) {
    const result = nativeStrokeRect.call(this, x, y, w, h);
    if (this.canvas?.id !== TARGET_CANVAS_ID) return result;

    const index = matchesReef(x, y, w, h);
    if (index < 0 || !visibleOnCanvas(this, x, w)) return result;

    finishReef(this, x, y, w, h, index);
    return result;
  }

  reefCaptureDrawImage.__shallStage4ReefAtlasCapture = true;
  parityStrokeRect.__shallStage4ReefParity = true;
  proto.drawImage = reefCaptureDrawImage;
  proto.strokeRect = parityStrokeRect;
  proto.__shallStage4ReefParityInstalled = true;

  window.__shallStage4ReefParity = Object.freeze({
    reefs: REEFS.length,
    materials: Object.freeze(["reefTop", "reefBottom", "reefMiddle", "caveWall", "cracked", "coral", "bubbleVent"]),
    nativeAtlasOnly: true,
    proceduralPalette: false,
    maxVisualOverhang: 4,
    gameplayWrites: false,
  });
})();
