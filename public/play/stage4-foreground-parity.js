(() => {
  "use strict";

  /*
   * Fase 4 — paridade de foreground com Fases 1–3.
   *
   * Nas fases-base, o foreground varia por trecho e cria profundidade com props
   * próximos da câmera sem cobrir o corredor principal de gameplay. A Fase 4
   * ainda terminava cada frame com a mesma faixa "fore" repetida em todas as
   * regiões. Este passe mantém essa base e acrescenta um enquadramento foreground
   * específico por microambiente usando somente materiais nativos do atlas.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4ForegroundParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const W = 480;
  const FORE = { sx: 0, sy: 92, sw: 133, sh: 44 };
  const ATLAS = { tiles: [0, 138, 80, 60], vfx: [82, 138, 80, 60] };
  const TILE = {
    reefTop: [0, 0, 40, 30],
    reefMiddle: [0, 32, 40, 32],
    reefBottom: [0, 64, 40, 32],
    caveWall: [40, 0, 40, 32],
    coral: [80, 0, 40, 32],
    pipe: [120, 64, 40, 32],
    bubbleVent: [160, 64, 40, 32],
    arenaFloor: [200, 64, 40, 32],
    cracked: [240, 64, 40, 32],
  };
  const VFX = { bubble: [0, 0, 80, 60] };
  const ZONES = [
    { start: 0, end: 900, key: "canal" },
    { start: 900, end: 2050, key: "bubbles" },
    { start: 2050, end: 3250, key: "fissure" },
    { start: 3250, end: 4350, key: "grotto" },
    { start: 4350, end: 5450, key: "reservoir" },
    { start: 5450, end: 6100, key: "arena" },
  ];
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let atlasImage = null;
  let foregroundDrawn = false;

  function debugState() {
    return typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
  }

  function cameraFor(debug) {
    if (typeof window.__shallStage4CameraParity === "function") {
      const parity = window.__shallStage4CameraParity();
      if (Number.isFinite(parity?.camera)) return parity.camera;
    }
    return clamp((debug?.hero?.x ?? 0) - W * 0.3, 0, 6100 - W);
  }

  function atlasSource(regionName, local) {
    const region = ATLAS[regionName];
    if (!region) return null;
    const [rx, ry] = region;
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [rx + sx, ry + sy, ex - sx, ey - sy];
  }

  function drawAtlas(ctx, regionName, local, x, y, w, h, alpha = 1, flipX = false) {
    if (!atlasImage || alpha <= 0.001 || w <= 0 || h <= 0) return;
    const source = atlasSource(regionName, local);
    if (!source) return;
    const [sx, sy, sw, sh] = source;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(Math.round(x + w), Math.round(y));
      ctx.scale(-1, 1);
      previousDrawImage.call(ctx, atlasImage, sx, sy, sw, sh, 0, 0, Math.round(w), Math.round(h));
    } else {
      previousDrawImage.call(ctx, atlasImage, sx, sy, sw, sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    ctx.restore();
  }

  function tile(ctx, name, x, y, w, h, alpha = 1, flipX = false) {
    drawAtlas(ctx, "tiles", TILE[name], x, y, w, h, alpha, flipX);
  }

  function vfx(ctx, name, x, y, w, h, alpha = 1, flipX = false) {
    drawAtlas(ctx, "vfx", VFX[name], x, y, w, h, alpha, flipX);
  }

  function zoneBlend(heroX) {
    let index = ZONES.findIndex((zone) => heroX >= zone.start && heroX < zone.end);
    if (index < 0) index = ZONES.length - 1;
    const current = ZONES[index];
    const next = ZONES[Math.min(index + 1, ZONES.length - 1)];
    const transitionStart = current.end - 120;
    const blend = next.key === current.key ? 0 : clamp((heroX - transitionStart) / 120, 0, 1);
    return { current: current.key, next: next.key, blend };
  }

  function repeatFloor(ctx, name, offset, y, step, w, h, alpha, gapStart, gapEnd) {
    for (let x = offset - step; x < W + step; x += step) {
      const center = x + w / 2;
      if (center > gapStart && center < gapEnd) continue;
      tile(ctx, name, x, y, w, h, alpha, Math.floor((x - offset) / step) % 2 !== 0);
    }
  }

  function edgeProp(ctx, name, side, y, w, h, alpha, flip = false) {
    const x = side === "left" ? -Math.round(w * 0.32) : W - Math.round(w * 0.68);
    tile(ctx, name, x, y, w, h, alpha, flip || side === "right");
  }

  function drawCanal(ctx, camera, alpha) {
    const drift = -((camera * 1.16) % 74);
    repeatFloor(ctx, "arenaFloor", drift, 500, 74, 78, 38, alpha * 0.78, 128, 352);
    edgeProp(ctx, "pipe", "left", 360, 56, 142, alpha * 0.78);
    edgeProp(ctx, "pipe", "right", 338, 62, 164, alpha * 0.82, true);
    tile(ctx, "caveWall", -18, 58, 92, 36, alpha * 0.42);
    tile(ctx, "caveWall", W - 70, 58, 92, 36, alpha * 0.42, true);
  }

  function drawBubbles(ctx, camera, alpha, tick) {
    const drift = -((camera * 1.14) % 92);
    repeatFloor(ctx, "reefTop", drift, 500, 92, 96, 32, alpha * 0.68, 138, 342);
    edgeProp(ctx, "bubbleVent", "left", 438, 82, 70, alpha * 0.86);
    edgeProp(ctx, "bubbleVent", "right", 430, 92, 78, alpha * 0.82, true);
    edgeProp(ctx, "coral", "left", 374, 78, 72, alpha * 0.64);
    edgeProp(ctx, "coral", "right", 364, 82, 78, alpha * 0.66, true);
    if (!reducedMotion) {
      const rise = (tick * 0.022) % 160;
      vfx(ctx, "bubble", 18, 430 - rise, 46, 34, alpha * 0.26);
      vfx(ctx, "bubble", W - 62, 382 - ((rise + 70) % 160), 42, 32, alpha * 0.24, true);
    }
  }

  function drawFissure(ctx, camera, alpha) {
    const drift = -((camera * 1.12) % 68);
    repeatFloor(ctx, "cracked", drift, 500, 68, 72, 38, alpha * 0.72, 146, 334);
    edgeProp(ctx, "reefMiddle", "left", 332, 94, 170, alpha * 0.76);
    edgeProp(ctx, "reefMiddle", "right", 318, 98, 184, alpha * 0.8, true);
    tile(ctx, "reefBottom", -26, 58, 112, 62, alpha * 0.54);
    tile(ctx, "reefBottom", W - 82, 58, 108, 66, alpha * 0.56, true);
  }

  function drawGrotto(ctx, camera, alpha, tick) {
    const drift = -((camera * 1.1) % 84);
    repeatFloor(ctx, "reefTop", drift, 498, 84, 88, 34, alpha * 0.68, 140, 340);
    edgeProp(ctx, "coral", "left", 340, 88, 166, alpha * 0.78);
    edgeProp(ctx, "coral", "right", 326, 94, 180, alpha * 0.8, true);
    tile(ctx, "reefBottom", -12, 58, 88, 44, alpha * 0.4);
    tile(ctx, "reefBottom", W - 76, 58, 88, 44, alpha * 0.4, true);
    const pulse = reducedMotion ? 0.36 : 0.28 + Math.sin(tick * 0.0032) * 0.08;
    vfx(ctx, "bubble", 34, 292, 34, 24, alpha * pulse);
    vfx(ctx, "bubble", W - 72, 244, 36, 26, alpha * pulse, true);
  }

  function drawReservoir(ctx, camera, alpha, arena = false) {
    const drift = -((camera * 1.18) % 72);
    repeatFloor(ctx, "arenaFloor", drift, 498, 72, 76, 40, alpha * (arena ? 0.86 : 0.78), 132, 348);
    edgeProp(ctx, "pipe", "left", arena ? 330 : 346, 62, arena ? 176 : 154, alpha * 0.82);
    edgeProp(ctx, "pipe", "right", arena ? 296 : 328, 70, arena ? 208 : 174, alpha * 0.88, true);
    tile(ctx, arena ? "cracked" : "arenaFloor", -20, 58, 96, 40, alpha * 0.48);
    tile(ctx, arena ? "cracked" : "arenaFloor", W - 76, 58, 96, 40, alpha * 0.5, true);
    if (arena) {
      tile(ctx, "bubbleVent", 8, 450, 62, 56, alpha * 0.6);
      tile(ctx, "bubbleVent", W - 70, 444, 64, 62, alpha * 0.62, true);
    }
  }

  function drawZone(ctx, key, camera, alpha, tick) {
    if (alpha <= 0.001) return;
    if (key === "canal") drawCanal(ctx, camera, alpha);
    else if (key === "bubbles") drawBubbles(ctx, camera, alpha, tick);
    else if (key === "fissure") drawFissure(ctx, camera, alpha);
    else if (key === "grotto") drawGrotto(ctx, camera, alpha, tick);
    else if (key === "reservoir") drawReservoir(ctx, camera, alpha, false);
    else drawReservoir(ctx, camera, alpha, true);
  }

  function drawForegroundFrame(ctx) {
    const debug = debugState();
    if (!debug || debug.mode !== "play" || !atlasImage) return;
    const zone = zoneBlend(debug.hero?.x ?? 0);
    const camera = cameraFor(debug);
    const tick = performance.now();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawZone(ctx, zone.current, camera, 1 - zone.blend * 0.72, tick);
    if (zone.blend > 0 && zone.next !== zone.current) drawZone(ctx, zone.next, camera, zone.blend * 0.72, tick);
    ctx.restore();
  }

  function matchesFore(args) {
    return args.length === 8 && args[0] === FORE.sx && args[1] === FORE.sy && args[2] === FORE.sw && args[3] === FORE.sh;
  }

  function foregroundDrawImage(image, ...args) {
    const isTarget = this.canvas?.id === TARGET_CANVAS_ID && matchesFore(args);
    if (isTarget && image instanceof HTMLImageElement) atlasImage = image;
    if (isTarget) {
      const dx = Number(args[4]);
      const dw = Number(args[6]);
      if (Number.isFinite(dx) && Number.isFinite(dw) && dx <= -dw) foregroundDrawn = false;
    }

    const result = previousDrawImage.call(this, image, ...args);

    if (isTarget && !foregroundDrawn) {
      const dx = Number(args[4]);
      if (Number.isFinite(dx) && dx >= W) {
        foregroundDrawn = true;
        drawForegroundFrame(this);
      }
    }
    return result;
  }

  proto.drawImage = foregroundDrawImage;
  proto.__shallStage4ForegroundParityInstalled = true;

  window.__shallStage4ForegroundParity = Object.freeze({
    regions: ZONES.map((zone) => zone.key),
    language: "regional-edge-foreground",
    gameplayWrites: false,
    clearGameplayCorridor: [110, 370],
  });
})();
