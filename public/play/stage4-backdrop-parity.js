(() => {
  "use strict";

  /*
   * Fase 4 — paridade de background/midground com Fases 1–3.
   *
   * As fases-base mudam a silhueta do fundo e a profundidade conforme o jogador
   * avança. A Fase 4 já tinha microambientes em overlays, mas o atlas "far/mid"
   * continuava praticamente idêntico do começo ao reservatório. Este wrapper
   * atua SOMENTE nas duas camadas de backdrop do atlas nativo, antes de gameplay,
   * preservando hitboxes, física, IA, rotas e desenho de personagens.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4BackdropParityInstalled) return;

  const nativeDrawImage = proto.drawImage;
  const W = 480;
  const H = 560;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const FAR = { sx: 0, sy: 0, sw: 133, sh: 44 };
  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };
  const ZONES = [
    { key: "canal", start: 0, end: 900 },
    { key: "bubbles", start: 900, end: 2050 },
    { key: "fissure", start: 2050, end: 3250 },
    { key: "grotto", start: 3250, end: 4350 },
    { key: "reservoir", start: 4350, end: WORLD_END },
  ];

  const PROFILES = {
    canal: { farY: 154, farH: 172, farAlpha: 0.92, midY: 292, midH: 168, midAlpha: 0.92 },
    bubbles: { farY: 132, farH: 190, farAlpha: 1.04, midY: 278, midH: 182, midAlpha: 1.00 },
    fissure: { farY: 118, farH: 208, farAlpha: 0.82, midY: 270, midH: 194, midAlpha: 0.88 },
    grotto: { farY: 126, farH: 202, farAlpha: 0.88, midY: 274, midH: 190, midAlpha: 0.94 },
    reservoir: { farY: 108, farH: 216, farAlpha: 0.78, midY: 260, midH: 204, midAlpha: 0.92 },
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;
  let visualCamera = 0;
  let previousTick = performance.now();
  let previousMode = null;
  let renderSerial = 0;
  let farDecorSerial = -1;
  let midDecorSerial = -1;
  let activeState = null;

  function matchesSource(args, source) {
    return args.length === 9 &&
      args[1] === source.sx && args[2] === source.sy &&
      args[3] === source.sw && args[4] === source.sh;
  }

  function cameraFor(debug, tick) {
    const heroX = debug?.hero?.x ?? 0;
    const bossActive = Boolean(debug?.boss?.active);
    const target = clamp(bossActive ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
    const dt = clamp((tick - previousTick) / 1000, 0, 0.033);
    previousTick = tick;
    if (previousMode !== "play") visualCamera = target;
    visualCamera += (target - visualCamera) * Math.min(1, dt * 4.5);
    previousMode = debug?.mode ?? null;
    return visualCamera;
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
    const drift = -((state.camera * 0.055) % 126);
    px(ctx, 0, 92, W, 34, "#06202d", alpha * 0.56);
    for (let x = drift - 80; x < W + 150; x += 126) {
      px(ctx, x, 88, 26, 230, "#061b28", alpha * 0.72);
      px(ctx, x + 7, 94, 8, 218, "#214e58", alpha * 0.48);
      px(ctx, x - 18, 118, 62, 12, "#0b3441", alpha * 0.62);
      px(ctx, x + 44, 121, 55, 7, "#2a6470", alpha * 0.42);
    }
    px(ctx, 0, 312, W, 8, "#133d49", alpha * 0.42);
  }

  function farBubbles(ctx, state, alpha) {
    const drift = -((state.camera * 0.07) % 156);
    for (let x = drift - 120; x < W + 180; x += 156) {
      px(ctx, x + 20, 126, 72, 186, "#073144", alpha * 0.48);
      px(ctx, x + 27, 136, 58, 176, "#0a4a5c", alpha * 0.38);
      px(ctx, x + 14, 118, 84, 12, "#1b6671", alpha * 0.46);
      px(ctx, x + 38, 96, 36, 24, "#0b3949", alpha * 0.56);
      const rise = reducedMotion ? 0 : (state.tick * 0.018 + x * 0.23) % 160;
      for (let i = 0; i < 4; i += 1) bubble(ctx, x + 48 + (i % 2) * 20, 272 - ((rise + i * 43) % 176), 8 + (i % 2) * 4, alpha * 0.46);
    }
  }

  function farFissure(ctx, state, alpha) {
    const shift = ((state.camera * 0.045) % 72 + 72) % 72;
    for (let x = -shift - 72; x < W + 80; x += 72) {
      const phase = Math.abs(Math.floor((x + shift) / 72)) % 4;
      const topH = 66 + phase * 18;
      const bottomH = 54 + ((phase + 2) % 4) * 17;
      px(ctx, x, 58, 64, topH, "#041722", alpha * 0.84);
      px(ctx, x + 8, 58 + topH - 9, 46, 9, "#173642", alpha * 0.58);
      px(ctx, x - 4, 505 - bottomH, 68, bottomH, "#041722", alpha * 0.78);
      px(ctx, x + 10, 505 - bottomH, 42, 7, "#254b53", alpha * 0.48);
    }
    px(ctx, 0, 182, W, 8, "#173c4b", alpha * 0.18);
  }

  function farGrotto(ctx, state, alpha) {
    const drift = -((state.camera * 0.04) % 184);
    for (let x = drift - 150; x < W + 220; x += 184) {
      px(ctx, x, 74, 46, 290, "#071a29", alpha * 0.74);
      px(ctx, x + 12, 86, 22, 266, "#163447", alpha * 0.48);
      px(ctx, x + 46, 76, 138, 20, "#09202f", alpha * 0.62);
      px(ctx, x + 70, 96, 18, 46, "#102b3c", alpha * 0.56);
      px(ctx, x + 118, 96, 14, 30, "#15394a", alpha * 0.48);
      const pulse = reducedMotion ? 0.62 : 0.58 + Math.sin(state.tick * 0.003 + x) * 0.16;
      lamp(ctx, x + 29, 170, "#7ee2c0", alpha, pulse);
      lamp(ctx, x + 118, 224, "#b58bd1", alpha, pulse * 0.92);
    }
  }

  function farReservoir(ctx, state, alpha) {
    const drift = -((state.camera * 0.05) % 190);
    for (let x = drift - 160; x < W + 220; x += 190) {
      px(ctx, x + 16, 86, 112, 250, "#041923", alpha * 0.8);
      px(ctx, x + 25, 96, 94, 232, "#0a3440", alpha * 0.56);
      px(ctx, x + 34, 106, 76, 10, "#346873", alpha * 0.48);
      px(ctx, x + 34, 304, 76, 9, "#315d66", alpha * 0.42);
      px(ctx, x - 18, 138, 34, 18, "#092b37", alpha * 0.7);
      px(ctx, x + 128, 138, 44, 18, "#092b37", alpha * 0.7);
      const pulse = reducedMotion ? 0.78 : 0.64 + Math.sin(state.tick * 0.006 + x) * 0.2;
      lamp(ctx, x + 72, 126, "#ffd05f", alpha, pulse);
    }
    px(ctx, 0, 326, W, 12, "#0c3340", alpha * 0.48);
  }

  function midCanal(ctx, state, alpha) {
    const drift = -((state.camera * 0.14) % 148);
    for (let x = drift - 110; x < W + 170; x += 148) {
      px(ctx, x, 318, 32, 150, "#071b25", alpha * 0.64);
      px(ctx, x + 7, 326, 12, 134, "#27515a", alpha * 0.44);
      px(ctx, x - 18, 355, 68, 12, "#103844", alpha * 0.56);
    }
  }

  function midBubbles(ctx, state, alpha) {
    const drift = -((state.camera * 0.16) % 136);
    for (let x = drift - 90; x < W + 150; x += 136) {
      px(ctx, x + 14, 438, 72, 42, "#092734", alpha * 0.56);
      px(ctx, x + 24, 428, 52, 12, "#2a6970", alpha * 0.48);
      px(ctx, x + 38, 416, 24, 14, "#66a7a5", alpha * 0.34);
      const rise = reducedMotion ? 0 : (state.tick * 0.026 + x * 0.18) % 108;
      bubble(ctx, x + 40, 410 - rise, 10, alpha * 0.52);
      bubble(ctx, x + 66, 386 - ((rise + 48) % 116), 7, alpha * 0.4);
    }
  }

  function midFissure(ctx, state, alpha) {
    const drift = -((state.camera * 0.11) % 92);
    for (let x = drift - 70; x < W + 120; x += 92) {
      const h = 36 + (Math.abs(Math.floor((x + drift) / 92)) % 3) * 18;
      px(ctx, x, 58, 72, h, "#0a202c", alpha * 0.62);
      px(ctx, x + 10, 58 + h - 6, 50, 6, "#355a60", alpha * 0.38);
      px(ctx, x + 8, 505 - h * 0.72, 58, h * 0.72, "#091e29", alpha * 0.58);
    }
  }

  function midGrotto(ctx, state, alpha) {
    const drift = -((state.camera * 0.1) % 142);
    for (let x = drift - 110; x < W + 160; x += 142) {
      px(ctx, x + 12, 392, 82, 80, "#0b2431", alpha * 0.54);
      px(ctx, x + 20, 400, 66, 12, "#37535c", alpha * 0.34);
      const pulse = reducedMotion ? 0.6 : 0.52 + Math.sin(state.tick * 0.0035 + x) * 0.14;
      lamp(ctx, x + 38, 388, "#8fe2a7", alpha, pulse);
      lamp(ctx, x + 72, 414, "#c397cf", alpha, pulse * 0.86);
    }
  }

  function midReservoir(ctx, state, alpha) {
    const drift = -((state.camera * 0.13) % 154);
    const pressure = clamp(((state.debug?.hero?.x ?? 4350) - 4350) / 1100, 0, 1);
    for (let x = drift - 120; x < W + 180; x += 154) {
      px(ctx, x + 10, 354, 98, 116, "#061d28", alpha * 0.66);
      px(ctx, x + 18, 364, 82, 14, "#365f66", alpha * 0.48);
      px(ctx, x + 26, 390, 66, 46, "#0d3945", alpha * 0.52);
      for (let i = 0; i < 4; i += 1) {
        px(ctx, x + 32 + i * 13, 402, 8, 20, i <= Math.round(pressure * 3) ? "#d39b45" : "#143743", alpha * 0.62);
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
      return nativeDrawImage.apply(this, incoming);
    }

    const isFar = matchesSource(incoming, FAR);
    const isMid = matchesSource(incoming, MID);
    if (!isFar && !isMid) return nativeDrawImage.apply(this, incoming);

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

    const result = nativeDrawImage.apply(this, args);
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
})();