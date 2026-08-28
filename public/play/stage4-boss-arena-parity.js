(() => {
  "use strict";

  /*
   * Fase 4 — apresentação do Água pOtávio alinhada aos chefões das Fases 1–3.
   *
   * Nas fases-base, o chefão tem presença maior que o herói e pertence fisicamente
   * à arena: banca, estruturas, piso e oclusores são desenhados no mesmo espaço de
   * mundo/câmera. A Fase 4 ainda dependia de pseudo-elementos CSS fixos na tela
   * para sombra e oclusão, que podiam deslizar em relação ao boss quando a câmera
   * reenquadrava a luta.
   *
   * Este passe faz três coisas somente no renderer:
   * 1) normaliza a presença visual do Água pOtávio para ~216 px de altura máxima,
   *    próxima da apresentação dos chefões das fases-base;
   * 2) cria uma estação de pressão atrás dele com os tiles NATIVOS do atlas;
   * 3) cria um brace/oclusor frontal em coordenadas de mundo, preso à mesma câmera.
   *
   * Não escreve em HP, dano, hitbox, IA, física, velocidade, posição, rotas,
   * controles ou timers de gameplay.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4BossArenaParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const W = 480;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const BOSS_CENTER_X = 5915 + 75;
  const BOSS_RIGHT_BRACE_X = 6042;
  const BASE_SCALE = 1.12;

  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };
  const FORE = { sx: 0, sy: 92, sw: 133, sh: 44 };
  const POTAVIO_REGION = { x: 218, y: 0, w: 80, h: 60 };
  const TILES_REGION = { x: 0, y: 138 };
  const TILE = {
    caveWall: [40, 0, 40, 32],
    pipe: [120, 64, 40, 32],
    bubbleVent: [160, 64, 40, 32],
    arenaFloor: [200, 64, 40, 32],
    cracked: [240, 64, 40, 32],
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let atlasImage = null;
  let backgroundDrawn = false;
  let foregroundDrawn = false;

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function cameraFor(debug) {
    if (typeof window.__shallStage4CameraParity === "function") {
      const parity = window.__shallStage4CameraParity();
      if (Number.isFinite(parity?.camera)) return parity.camera;
    }
    const heroX = debug?.hero?.x ?? ARENA_LEFT;
    return clamp(debug?.boss?.active ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
  }

  function matchesSource(args, source) {
    return args.length === 8 &&
      args[0] === source.sx && args[1] === source.sy &&
      args[2] === source.sw && args[3] === source.sh;
  }

  function insidePotavioRegion(sx, sy, sw, sh) {
    const epsilon = 1;
    return sx >= POTAVIO_REGION.x - epsilon &&
      sy >= POTAVIO_REGION.y - epsilon &&
      sx + sw <= POTAVIO_REGION.x + POTAVIO_REGION.w + epsilon &&
      sy + sh <= POTAVIO_REGION.y + POTAVIO_REGION.h + epsilon;
  }

  function atlasSource(local) {
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [TILES_REGION.x + sx, TILES_REGION.y + sy, ex - sx, ey - sy];
  }

  function tile(context, name, x, y, w, h, alpha = 1, flipX = false) {
    if (!atlasImage || alpha <= 0.001 || w <= 0 || h <= 0) return;
    const source = atlasSource(TILE[name]);
    if (!source) return;
    const [sx, sy, sw, sh] = source;
    context.save();
    context.globalAlpha *= alpha;
    context.imageSmoothingEnabled = false;
    if (flipX) {
      context.translate(Math.round(x + w), Math.round(y));
      context.scale(-1, 1);
      previousDrawImage.call(context, atlasImage, sx, sy, sw, sh, 0, 0, Math.round(w), Math.round(h));
    } else {
      previousDrawImage.call(context, atlasImage, sx, sy, sw, sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    context.restore();
  }

  function rect(context, x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = color;
    context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    context.restore();
  }

  function beam(context, x, y, width, alpha = 1, cracked = false) {
    const step = 42;
    for (let px = x, i = 0; px < x + width; px += step, i += 1) {
      const w = Math.min(step + 2, x + width - px);
      tile(context, cracked ? "cracked" : "arenaFloor", px, y, w, 30, alpha, i % 2 === 1);
    }
  }

  function column(context, x, top, bottom, width, variant = 0, alpha = 1) {
    const names = variant % 2 ? ["caveWall", "pipe", "arenaFloor"] : ["cracked", "arenaFloor", "caveWall"];
    for (let y = top, i = 0; y < bottom; y += 38, i += 1) {
      const h = Math.min(42, bottom - y);
      tile(context, names[i % names.length], x, y, width, h + 2, alpha * (i % 2 ? 0.88 : 0.96), (i + variant) % 2 === 1);
    }
  }

  function drawPressureStation(context, debug) {
    if (!atlasImage || !debug?.boss?.active) return;
    const camera = cameraFor(debug);
    const centerX = BOSS_CENTER_X - camera;
    if (centerX < -220 || centerX > W + 220) return;

    const left = centerX - 132;
    const right = centerX + 102;

    // Estrutura traseira: o boss passa a ocupar um nicho material da própria arena,
    // como Joyce/Rock/Zico ocupam banca, bar ou horta nas fases-base.
    column(context, left, 82, 458, 34, 1, 0.82);
    column(context, right, 82, 458, 34, 2, 0.86);
    beam(context, left - 12, 78, right - left + 80, 0.9, true);
    beam(context, left - 4, 432, right - left + 62, 0.76, false);

    tile(context, "pipe", left + 31, 112, 30, 276, 0.58, false);
    tile(context, "pipe", right - 27, 112, 30, 276, 0.62, true);
    tile(context, "bubbleVent", left + 19, 396, 58, 48, 0.52, false);
    tile(context, "bubbleVent", right - 36, 396, 58, 48, 0.56, true);

    // Sombra em degraus no MESMO espaço do boss. Ela acompanha o reenquadramento
    // horizontal da arena em vez de ficar presa a uma porcentagem da tela.
    rect(context, centerX - 82, 407, 164, 6, "#010814", 0.36);
    rect(context, centerX - 66, 413, 132, 7, "#010814", 0.31);
    rect(context, centerX - 45, 420, 90, 5, "#010814", 0.24);

    // Base/placa de pressão atrás dos pés do sprite, usando exclusivamente material
    // aprovado do atlas aquático.
    for (let x = centerX - 112, i = 0; x < centerX + 112; x += 46, i += 1) {
      tile(context, i % 3 === 2 ? "cracked" : "arenaFloor", x, 425, 48, 34, 0.7, i % 2 === 1);
    }
  }

  function drawWorldForegroundBrace(context, debug) {
    if (!atlasImage || !debug?.boss?.active) return;
    const camera = cameraFor(debug);
    const x = BOSS_RIGHT_BRACE_X - camera;
    if (x < -90 || x > W + 70) return;

    // Oclusor frontal preso ao reservatório, não ao viewport. Ele cobre apenas a
    // borda direita do Água pOtávio e reforça profundidade sem esconder o corredor.
    column(context, x, 302, 505, 58, 3, 0.94);
    tile(context, "pipe", x - 10, 316, 38, 174, 0.82, true);
    tile(context, "cracked", x - 18, 438, 78, 68, 0.86, false);
    tile(context, "arenaFloor", x - 24, 474, 92, 32, 0.9, true);
  }

  function scaledBossArgs(args, debug) {
    if (!debug?.boss?.active || args.length !== 8) return args;
    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insidePotavioRegion(sx, sy, sw, sh)) return args;
    const centerX = dx + dw / 2;
    const centerY = dy + dh / 2;
    const width = dw * BASE_SCALE;
    const height = dh * BASE_SCALE;
    return [
      sx, sy, sw, sh,
      Math.round(centerX - width / 2),
      Math.round(centerY - height / 2),
      Math.round(width),
      Math.round(height),
    ];
  }

  function bossArenaDrawImage(image, ...args) {
    if (this.canvas?.id !== TARGET_CANVAS_ID) {
      return previousDrawImage.call(this, image, ...args);
    }

    const isMid = matchesSource(args, MID);
    const isFore = matchesSource(args, FORE);
    if ((isMid || isFore) && image instanceof HTMLImageElement) atlasImage = image;

    if (isMid || isFore) {
      const dx = Number(args[4]);
      const dw = Number(args[6]);
      if (Number.isFinite(dx) && Number.isFinite(dw) && dx <= -dw) {
        if (isMid) backgroundDrawn = false;
        if (isFore) foregroundDrawn = false;
      }
    }

    const debug = debugState();
    const result = previousDrawImage.call(this, image, ...scaledBossArgs(args, debug));

    // drawTiledLayer emite um tile de cauda fora da borda direita. Usamos esse
    // marcador para inserir a estação no fim do midground e o brace no fim do
    // foreground, mantendo ambos no mesmo frame do renderer principal.
    if (isMid && !backgroundDrawn) {
      const dx = Number(args[4]);
      if (Number.isFinite(dx) && dx >= W) {
        backgroundDrawn = true;
        drawPressureStation(this, debug);
      }
    }
    if (isFore && !foregroundDrawn) {
      const dx = Number(args[4]);
      if (Number.isFinite(dx) && dx >= W) {
        foregroundDrawn = true;
        drawWorldForegroundBrace(this, debug);
      }
    }

    return result;
  }

  bossArenaDrawImage.__shallStage4BossArenaParity = true;
  proto.drawImage = bossArenaDrawImage;
  proto.__shallStage4BossArenaParityInstalled = true;

  window.__shallStage4BossArenaParity = Object.freeze({
    baseScale: BASE_SCALE,
    targetBossHeight: 216,
    bossCenterWorldX: BOSS_CENTER_X,
    foregroundBraceWorldX: BOSS_RIGHT_BRACE_X,
    worldSpaceScenery: true,
    usesNativeAtlasTiles: true,
    replacesFixedCssDepth: true,
    gameplayWrites: false,
  });
})();
