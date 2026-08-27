(() => {
  "use strict";

  /*
   * Fase 4 — paridade de background/midground com Fases 1–3.
   *
   * As fases-base deixam a arte-fonte carregar a identidade do ambiente. A Fase 4
   * ainda dependia de grandes blocos procedurais sobre o atlas aquático, o que
   * fazia Canal, Bolhas, Fenda, Gruta e Reservatório parecerem uma segunda linguagem
   * visual. Este passe mantém as transições e o parallax, mas faz os materiais
   * nativos do próprio atlas (tubos, recifes, paredes, vents e piso da arena)
   * dominarem a composição regional. Pequenos retângulos ficam restritos a sombra,
   * moldura e luz de leitura — como apoio, não como arte principal.
   *
   * A camada continua estritamente visual: não toca em física, colisões, IA, rotas,
   * HP, controles, posições ou timers de gameplay.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4BackdropParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const W = 480;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const FAR = { sx: 0, sy: 0, sw: 133, sh: 44 };
  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };
  const TILE_REGION = { x: 0, y: 138 };
  const TILE_LOGICAL = {
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

  const ZONES = [
    { key: "canal", start: 0, end: 900 },
    { key: "bubbles", start: 900, end: 2050 },
    { key: "fissure", start: 2050, end: 3250 },
    { key: "grotto", start: 3250, end: 4350 },
    { key: "reservoir", start: 4350, end: WORLD_END },
  ];

  const PROFILES = {
    canal: { farY: 154, farH: 172, farAlpha: 0.92, midY: 292, midH: 168, midAlpha: 0.92 },
    bubbles: { farY: 132, farH: 190, farAlpha: 1.00, midY: 278, midH: 182, midAlpha: 0.98 },
    fissure: { farY: 118, farH: 208, farAlpha: 0.84, midY: 270, midH: 194, midAlpha: 0.90 },
    grotto: { farY: 126, farH: 202, farAlpha: 0.90, midY: 274, midH: 190, midAlpha: 0.96 },
    reservoir: { farY: 108, farH: 216, farAlpha: 0.82, midY: 260, midH: 204, midAlpha: 0.94 },
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;

  let fallbackCamera = 0;
  let previousTick = performance.now();
  let previousMode = null;
  let renderSerial = 0;
  let farDecorSerial = -1;
  let midDecorSerial = -1;
  let activeState = null;
  let atlasImage = null;

  function atlasTile(local) {
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return {
      sx: TILE_REGION.x + sx,
      sy: TILE_REGION.y + sy,
      sw: ex - sx,
      sh: ey - sy,
    };
  }

  const MATERIALS = Object.freeze(
    Object.fromEntries(Object.entries(TILE_LOGICAL).map(([key, local]) => [key, atlasTile(local)])),
  );

  function matchesSource(args, source) {
    return args.length === 9 &&
      args[1] === source.sx && args[2] === source.sy &&
      args[3] === source.sw && args[4] === source.sh;
  }

  function cameraFor(debug, tick) {
    const sharedCamera = typeof window.__shallStage4CameraParity === "function"
      ? window.__shallStage4CameraParity()
      : null;
    if (Number.isFinite(sharedCamera?.camera)) {
      fallbackCamera = sharedCamera.camera;
      previousTick = tick;
      previousMode = debug?.mode ?? null;
      return fallbackCamera;
    }

    const heroX = debug?.hero?.x ?? 0;
    const bossActive = Boolean(debug?.boss?.active);
    const target = clamp(bossActive ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
    const dt = clamp((tick - previousTick) / 1000, 0, 0.033);
    previousTick = tick;
    if (previousMode !== "play") fallbackCamera = target;
    fallbackCamera += (target - fallbackCamera) * Math.min(1, dt * 4.5);
    previousMode = debug?.mode ?? null;
    return fallbackCamera;
  }

  function zoneState(heroX) {
    let index = ZONES.findIndex((zone) => heroX >= zone.start && heroX < zone.end);
    if (index < 0) index = heroX >= WORLD_END ? ZONES.length - 1 : 0;
    const zone = ZONES[index];
    const transition = Math.min(220, Math.max(140, (zone.end - zone.start) * 0.18));
    const blendStart = zone.end - transition;
    const blend = index < ZONES.length - 1 && heroX > blendStart
      ? clamp((heroX - blendStart) / transition, 0, 1)
      : 0;
    return { key: zone.key, next: ZONES[index + 1]?.key ?? null, blend };
  }

  function stateForFrame() {
    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    const tick = performance.now();
    const heroX = debug?.hero?.x ?? 0;
    return {
      debug,
      tick,
      camera: cameraFor(debug, tick),
      ...zoneState(heroX),
    };
  }

  function profileFor(state) {
    const current = PROFILES[state.key] ?? PROFILES.canal;
    if (!state.next || state.blend <= 0) return current;
    const next = PROFILES[state.next] ?? current;
    const t = state.blend;
    return {
      farY: mix(current.farY, next.farY, t),
      farH: mix(current.farH, next.farH, t),
      farAlpha: mix(current.farAlpha, next.farAlpha, t),
      midY: mix(current.midY, next.midY, t),
      midH: mix(current.midH, next.midH, t),
      midAlpha: mix(current.midAlpha, next.midAlpha, t),
    };
  }

  function px(ctx, x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function drawMaterial(ctx, key, x, y, w, h, alpha = 1, flipX = false) {
    const source = MATERIALS[key];
    if (!source || !atlasImage || w <= 0 || h <= 0 || alpha <= 0) return false;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(Math.round(x + w), Math.round(y));
      ctx.scale(-1, 1);
      previousDrawImage.call(ctx, atlasImage, source.sx, source.sy, source.sw, source.sh, 0, 0, Math.round(w), Math.round(h));
    } else {
      previousDrawImage.call(ctx, atlasImage, source.sx, source.sy, source.sw, source.sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    ctx.restore();
    return true;
  }

  function tileStrip(ctx, key, x, y, count, w, h, gap, alpha, flipAlternate = false) {
    for (let i = 0; i < count; i += 1) {
      drawMaterial(ctx, key, x + i * (w + gap), y, w, h, alpha, flipAlternate && i % 2 === 1);
    }
  }

  function tileStack(ctx, key, x, y, count, w, h, gap, alpha, flipAlternate = false) {
    for (let i = 0; i < count; i += 1) {
      drawMaterial(ctx, key, x, y + i * (h + gap), w, h, alpha, flipAlternate && i % 2 === 1);
    }
  }

  function lamp(ctx, x, y, color, alpha, pulse = 1) {
    px(ctx, x - 4, y - 4, 8, 8, "#061821", alpha * 0.95);
    px(ctx, x - 2, y - 2, 4, 4, color, alpha * pulse);
    px(ctx, x - 1, y - 1, 2, 2, "#efffff", alpha * pulse * 0.8);
  }

  function bubble(ctx, x, y, size, alpha) {
    const s = Math.max(2, Math.round(size / 4));
    px(ctx, x + s, y, s * 2, s, "#b9f6ff", alpha * 0.72);
    px(ctx, x, y + s, s, s * 2, "#63c7d9", alpha * 0.58);
    px(ctx, x + s * 3, y + s, s, s * 2, "#2a829b", alpha * 0.5);
    px(ctx, x + s, y + s * 3, s * 2, s, "#1b647d", alpha * 0.48);
  }

  function farCanal(ctx, state, alpha) {
    const drift = -((state.camera * 0.055) % 144);
    px(ctx, 0, 92, W, 30, "#041923", alpha * 0.42);
    for (let x = drift - 100; x < W + 170; x += 144) {
      px(ctx, x - 4, 88, 44, 232, "#041924", alpha * 0.52);
      tileStack(ctx, "pipe", x, 96, 7, 34, 28, 0, alpha * 0.52, true);
      drawMaterial(ctx, "arenaFloor", x - 28, 116, 94, 26, alpha * 0.38);
    }
    tileStrip(ctx, "arenaFloor", drift - 72, 308, 6, 92, 24, 0, alpha * 0.34, true);
  }

  function farBubbles(ctx, state, alpha) {
    const drift = -((state.camera * 0.07) % 168);
    for (let x = drift - 130; x < W + 190; x += 168) {
      px(ctx, x + 16, 122, 92, 196, "#062431", alpha * 0.32);
      tileStack(ctx, "bubbleVent", x + 28, 196, 4, 62, 34, 0, alpha * 0.46, true);
      drawMaterial(ctx, "coral", x + 6, 286, 48, 38, alpha * 0.34, true);
      drawMaterial(ctx, "coral", x + 78, 278, 48, 38, alpha * 0.3);
      const rise = reducedMotion ? 0 : (state.tick * 0.018 + x * 0.23) % 160;
      for (let i = 0; i < 4; i += 1) {
        bubble(ctx, x + 52 + (i % 2) * 22, 270 - ((rise + i * 43) % 176), 8 + (i % 2) * 4, alpha * 0.48);
      }
    }
  }

  function farFissure(ctx, state, alpha) {
    const shift = ((state.camera * 0.045) % 82 + 82) % 82;
    for (let x = -shift - 82; x < W + 90; x += 82) {
      const phase = Math.abs(Math.floor((x + shift) / 82)) % 4;
      const topH = 58 + phase * 17;
      const bottomH = 50 + ((phase + 2) % 4) * 15;
      tileStack(ctx, "caveWall", x, 58, Math.ceil(topH / 30), 76, 30, -2, alpha * 0.66, phase % 2 === 1);
      drawMaterial(ctx, "cracked", x + 6, 58 + topH - 24, 62, 28, alpha * 0.44, phase % 2 === 0);
      tileStack(ctx, "caveWall", x - 2, 505 - bottomH, Math.ceil(bottomH / 28), 78, 28, -1, alpha * 0.62, phase % 2 === 0);
      drawMaterial(ctx, "cracked", x + 8, 505 - bottomH - 4, 58, 26, alpha * 0.4, phase % 2 === 1);
    }
  }

  function farGrotto(ctx, state, alpha) {
    const drift = -((state.camera * 0.04) % 188);
    for (let x = drift - 155; x < W + 220; x += 188) {
      tileStack(ctx, "reefMiddle", x, 86, 8, 48, 34, -2, alpha * 0.48, true);
      tileStrip(ctx, "reefTop", x + 38, 78, 4, 46, 30, -2, alpha * 0.44, true);
      drawMaterial(ctx, "coral", x + 58, 126, 50, 40, alpha * 0.42);
      drawMaterial(ctx, "coral", x + 112, 196, 46, 38, alpha * 0.36, true);
      const pulse = reducedMotion ? 0.62 : 0.58 + Math.sin(state.tick * 0.003 + x) * 0.16;
      lamp(ctx, x + 28, 170, "#7ee2c0", alpha, pulse);
      lamp(ctx, x + 120, 228, "#b58bd1", alpha, pulse * 0.92);
    }
  }

  function farReservoir(ctx, state, alpha) {
    const drift = -((state.camera * 0.05) % 192);
    for (let x = drift - 160; x < W + 220; x += 192) {
      px(ctx, x + 10, 84, 122, 256, "#041923", alpha * 0.42);
      tileStack(ctx, "pipe", x + 22, 104, 7, 44, 30, 0, alpha * 0.44, true);
      tileStack(ctx, "arenaFloor", x + 72, 100, 7, 48, 30, 0, alpha * 0.38, true);
      drawMaterial(ctx, "cracked", x + 26, 298, 92, 30, alpha * 0.36, true);
      const pulse = reducedMotion ? 0.78 : 0.64 + Math.sin(state.tick * 0.006 + x) * 0.2;
      lamp(ctx, x + 72, 126, "#ffd05f", alpha, pulse);
    }
    tileStrip(ctx, "arenaFloor", drift - 80, 320, 6, 96, 26, 0, alpha * 0.34, true);
  }

  function midCanal(ctx, state, alpha) {
    const drift = -((state.camera * 0.14) % 152);
    for (let x = drift - 110; x < W + 170; x += 152) {
      tileStack(ctx, "pipe", x, 324, 5, 40, 30, -1, alpha * 0.62, true);
      drawMaterial(ctx, "arenaFloor", x - 20, 354, 84, 28, alpha * 0.46);
    }
  }

  function midBubbles(ctx, state, alpha) {
    const drift = -((state.camera * 0.16) % 140);
    for (let x = drift - 90; x < W + 150; x += 140) {
      drawMaterial(ctx, "bubbleVent", x + 16, 428, 76, 50, alpha * 0.62, true);
      drawMaterial(ctx, "coral", x + 8, 398, 42, 34, alpha * 0.4);
      const rise = reducedMotion ? 0 : (state.tick * 0.026 + x * 0.18) % 108;
      bubble(ctx, x + 42, 410 - rise, 10, alpha * 0.54);
      bubble(ctx, x + 68, 386 - ((rise + 48) % 116), 7, alpha * 0.42);
    }
  }

  function midFissure(ctx, state, alpha) {
    const drift = -((state.camera * 0.11) % 96);
    for (let x = drift - 72; x < W + 120; x += 96) {
      const h = 38 + (Math.abs(Math.floor((x + drift) / 96)) % 3) * 18;
      tileStack(ctx, "caveWall", x, 58, Math.ceil(h / 28), 82, 28, -1, alpha * 0.58, true);
      drawMaterial(ctx, "cracked", x + 10, 58 + h - 24, 62, 26, alpha * 0.42);
      drawMaterial(ctx, "reefBottom", x + 10, 505 - h * 0.72, 62, Math.max(28, h * 0.72), alpha * 0.44, true);
    }
  }

  function midGrotto(ctx, state, alpha) {
    const drift = -((state.camera * 0.1) % 146);
    for (let x = drift - 110; x < W + 160; x += 146) {
      drawMaterial(ctx, "reefTop", x + 8, 390, 92, 42, alpha * 0.58, true);
      drawMaterial(ctx, "reefMiddle", x + 12, 428, 84, 48, alpha * 0.54);
      drawMaterial(ctx, "coral", x + 30, 378, 48, 40, alpha * 0.48, true);
      const pulse = reducedMotion ? 0.6 : 0.52 + Math.sin(state.tick * 0.0035 + x) * 0.14;
      lamp(ctx, x + 38, 388, "#8fe2a7", alpha, pulse);
      lamp(ctx, x + 74, 414, "#c397cf", alpha, pulse * 0.86);
    }
  }

  function midReservoir(ctx, state, alpha) {
    const drift = -((state.camera * 0.13) % 158);
    const pressure = clamp(((state.debug?.hero?.x ?? 4350) - 4350) / 1100, 0, 1);
    for (let x = drift - 120; x < W + 180; x += 158) {
      drawMaterial(ctx, "arenaFloor", x + 10, 356, 104, 44, alpha * 0.56, true);
      tileStack(ctx, "pipe", x + 18, 394, 3, 38, 30, -1, alpha * 0.54, true);
      drawMaterial(ctx, "cracked", x + 62, 404, 46, 38, alpha * 0.4);
      for (let i = 0; i < 4; i += 1) {
        px(ctx, x + 40 + i * 13, 384, 8, 18, i <= Math.round(pressure * 3) ? "#d39b45" : "#143743", alpha * 0.7);
      }
    }
  }

  function drawFarScene(ctx, key, state, alpha) {
    if (key === "canal") farCanal(ctx, state, alpha);
    else if (key === "bubbles") farBubbles(ctx, state, alpha);
    else if (key === "fissure") farFissure(ctx, state, alpha);
    else if (key === "grotto") farGrotto(ctx, state, alpha);
    else farReservoir(ctx, state, alpha);
  }

  function drawMidScene(ctx, key, state, alpha) {
    if (key === "canal") midCanal(ctx, state, alpha);
    else if (key === "bubbles") midBubbles(ctx, state, alpha);
    else if (key === "fissure") midFissure(ctx, state, alpha);
    else if (key === "grotto") midGrotto(ctx, state, alpha);
    else midReservoir(ctx, state, alpha);
  }

  function drawBlend(ctx, state, layer) {
    const primaryAlpha = 1 - state.blend * 0.82;
    const secondaryAlpha = state.blend * 0.82;
    if (layer === "far") {
      drawFarScene(ctx, state.key, state, primaryAlpha);
      if (state.next && secondaryAlpha > 0) drawFarScene(ctx, state.next, state, secondaryAlpha);
    } else {
      drawMidScene(ctx, state.key, state, primaryAlpha);
      if (state.next && secondaryAlpha > 0) drawMidScene(ctx, state.next, state, secondaryAlpha);
    }
  }

  function parityDrawImage(...incoming) {
    if (this.canvas?.id !== "stage4-canvas" || incoming.length !== 9) {
      return previousDrawImage.apply(this, incoming);
    }

    const isFar = matchesSource(incoming, FAR);
    const isMid = matchesSource(incoming, MID);
    if (!isFar && !isMid) return previousDrawImage.apply(this, incoming);

    atlasImage = incoming[0];
    const args = [...incoming];
    const dx = Number(args[5]);
    const dw = Number(args[7]);

    if (isFar && dx <= -dw) {
      renderSerial += 1;
      activeState = stateForFrame();
    }

    const state = activeState ?? stateForFrame();
    const profile = profileFor(state);
    const previousAlpha = this.globalAlpha;

    if (isFar) {
      args[6] = Math.round(profile.farY);
      args[8] = Math.round(profile.farH);
      this.globalAlpha *= profile.farAlpha;
    } else {
      args[6] = Math.round(profile.midY);
      args[8] = Math.round(profile.midH);
      this.globalAlpha *= profile.midAlpha;
      if (farDecorSerial !== renderSerial) {
        this.save();
        this.imageSmoothingEnabled = false;
        drawBlend(this, state, "far");
        this.restore();
        farDecorSerial = renderSerial;
      }
    }

    const result = previousDrawImage.apply(this, args);
    this.globalAlpha = previousAlpha;

    if (isMid && dx >= W && midDecorSerial !== renderSerial) {
      this.save();
      this.imageSmoothingEnabled = false;
      drawBlend(this, state, "mid");
      this.restore();
      midDecorSerial = renderSerial;
    }

    return result;
  }

  parityDrawImage.__shallStage4BackdropParity = true;
  proto.drawImage = parityDrawImage;
  proto.__shallStage4BackdropParityInstalled = true;

  window.__shallStage4BackdropParity = () => ({
    zone: activeState?.key ?? "canal",
    nextZone: activeState?.next ?? null,
    blend: Number((activeState?.blend ?? 0).toFixed(2)),
    materialDriven: true,
    materials: Object.keys(MATERIALS),
  });
})();
