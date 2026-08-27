(() => {
  "use strict";

  /*
   * Fase 4 — paridade de animação corporal do Shall com Fases 1–3.
   *
   * Nas fases-base, Shall nunca é apenas uma sequência de frames: o render aplica
   * squash/stretch, inclinação e reação de corpo conforme salto, dano e ação.
   * O Mexilhãozinho já tem bons frames aquáticos, mas ainda troca de pose com o
   * corpo rígido. Este passe atua apenas no desenho dos sprites do herói e adapta
   * a mesma gramática de animação para água, sem escrever em física ou gameplay.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4HeroMotionParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const HERO_ORIGIN = { x: 137, y: 0 };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const LOCAL_FRAMES = {
    idleA: [6, 27, 38, 74],
    idleB: [47, 27, 38, 76],
    swimA: [89, 38, 64, 55],
    swimB: [148, 40, 56, 54],
    swimC: [204, 38, 57, 59],
    swimD: [258, 38, 52, 63],
    upA: [7, 127, 34, 76],
    upB: [45, 125, 38, 80],
    shoot: [79, 141, 54, 65],
    dash: [147, 158, 62, 43],
    hurt: [219, 138, 51, 71],
    transform: [261, 110, 55, 98],
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function atlasSource(local) {
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [
      HERO_ORIGIN.x + sx,
      HERO_ORIGIN.y + sy,
      ex - sx,
      ey - sy,
    ];
  }

  const FRAME_BY_SOURCE = new Map(
    Object.entries(LOCAL_FRAMES).map(([name, local]) => {
      const source = atlasSource(local);
      return [source.join(","), name];
    }),
  );

  function frameName(sx, sy, sw, sh) {
    return FRAME_BY_SOURCE.get(`${sx},${sy},${sw},${sh}`) ?? null;
  }

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function profileFor(name, debug, tick) {
    const vx = debug?.hero?.vx ?? 0;
    const vy = debug?.hero?.vy ?? 0;
    const horizontal = clamp(Math.abs(vx) / 340, 0, 1);
    const vertical = clamp(Math.abs(vy) / 300, 0, 1);
    const pulse = reducedMotion ? 0 : Math.sin(tick * 0.009);
    const swimPulse = reducedMotion ? 0 : Math.sin(tick * 0.018);

    const profile = {
      scaleX: 1,
      scaleY: 1,
      rotate: 0,
      offsetX: 0,
      offsetY: 0,
      wake: 0,
      verticalWake: false,
      kind: name,
    };

    if (name === "idleA" || name === "idleB") {
      profile.scaleX = 1 + pulse * 0.012;
      profile.scaleY = 1 - pulse * 0.016;
      profile.offsetY = pulse * 1.3;
      return profile;
    }

    if (name?.startsWith("swim")) {
      profile.scaleX = 1.035 + horizontal * 0.035 + swimPulse * 0.012;
      profile.scaleY = 0.975 - horizontal * 0.018 - swimPulse * 0.01;
      profile.rotate = reducedMotion ? 0 : clamp(vy / 420, -0.07, 0.07);
      profile.offsetY = swimPulse * 1.5;
      profile.wake = 0.34 + horizontal * 0.46;
      return profile;
    }

    if (name?.startsWith("up")) {
      profile.scaleX = 0.965 - vertical * 0.015;
      profile.scaleY = 1.045 + vertical * 0.035;
      profile.rotate = reducedMotion ? 0 : swimPulse * 0.018;
      profile.offsetY = -1.5;
      profile.wake = 0.28 + vertical * 0.42;
      profile.verticalWake = true;
      return profile;
    }

    if (name === "shoot") {
      profile.scaleX = 0.955;
      profile.scaleY = 1.035;
      profile.offsetX = -3.5;
      profile.rotate = reducedMotion ? 0 : clamp(vy / 520, -0.035, 0.035);
      profile.wake = 0.24;
      return profile;
    }

    if (name === "dash") {
      profile.scaleX = 1.145;
      profile.scaleY = 0.885;
      profile.offsetX = 4;
      profile.rotate = reducedMotion ? 0 : clamp(vy / 420, -0.045, 0.045);
      profile.wake = 1;
      return profile;
    }

    if (name === "hurt") {
      const wobble = reducedMotion ? 0 : Math.sin(tick * 0.042);
      profile.scaleX = 1.12;
      profile.scaleY = 0.86;
      profile.rotate = wobble * 0.055;
      profile.offsetY = 2;
      return profile;
    }

    if (name === "transform") {
      const transformPulse = reducedMotion ? 0 : Math.sin(tick * 0.014);
      profile.scaleX = 1.02 + transformPulse * 0.035;
      profile.scaleY = 0.98 - transformPulse * 0.025;
      profile.rotate = reducedMotion ? 0 : transformPulse * 0.018;
      profile.wake = 0.38;
      profile.verticalWake = true;
    }

    return profile;
  }

  function pixel(ctx, x, y, w, h, color, alpha) {
    if (alpha <= 0 || w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function drawWake(ctx, dw, dh, profile, tick) {
    if (profile.wake <= 0.01) return;

    const intensity = clamp(profile.wake, 0, 1);
    const phase = reducedMotion ? 0 : Math.floor(tick / 90) % 3;
    const backX = -dw / 2 - 6;

    if (profile.verticalWake) {
      const baseY = dh / 2 + 5;
      for (let i = 0; i < 3; i += 1) {
        const x = -10 + i * 9 + (phase === i ? 2 : 0);
        const y = baseY + i * 6;
        const size = i === 1 ? 5 : 4;
        pixel(ctx, x, y, size, size, "#8deaff", 0.18 + intensity * 0.18);
        pixel(ctx, x + size, y + 1, 3, 2, "#d9fbff", 0.12 + intensity * 0.14);
      }
      return;
    }

    for (let i = 0; i < 4; i += 1) {
      const length = 7 + i * 4 + (phase === i % 3 ? 3 : 0);
      const y = -12 + i * 8;
      const x = backX - i * 7;
      pixel(ctx, x, y, length, 3, i % 2 ? "#2c8dab" : "#58d2e2", 0.12 + intensity * 0.2);
      if (i < 3) {
        pixel(ctx, x - 5, y - 2, 3, 3, "#d9fbff", 0.1 + intensity * 0.16);
      }
    }
  }

  function motionDrawImage(image, ...args) {
    if (this.canvas?.id !== TARGET_CANVAS_ID || args.length !== 8) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    const name = frameName(sx, sy, sw, sh);
    if (!name || !Number.isFinite(dw) || !Number.isFinite(dh)) {
      return previousDrawImage.call(this, image, ...args);
    }

    const debug = debugState();
    if (debug?.mode !== "play") {
      return previousDrawImage.call(this, image, ...args);
    }

    const tick = performance.now();
    const profile = profileFor(name, debug, tick);
    const centerX = dx + dw / 2;
    const centerY = dy + dh / 2;

    this.save();
    this.imageSmoothingEnabled = false;

    // Usa transform() em vez de translate() para não conflitar com o wrapper
    // de câmera da Fase 4, que intercepta a primeira translação do mundo.
    this.transform(1, 0, 0, 1, centerX + profile.offsetX, centerY + profile.offsetY);
    if (profile.rotate) this.rotate(profile.rotate);
    this.scale(profile.scaleX, profile.scaleY);

    drawWake(this, dw, dh, profile, tick);

    this.transform(1, 0, 0, 1, -centerX, -centerY);
    const result = previousDrawImage.call(this, image, ...args);
    this.restore();
    return result;
  }

  motionDrawImage.__shallStage4HeroMotionParity = true;
  proto.drawImage = motionDrawImage;
  proto.__shallStage4HeroMotionParityInstalled = true;

  window.__shallStage4HeroMotionParity = Object.freeze({
    frames: FRAME_BY_SOURCE.size,
    reducedMotion,
    language: "squash-stretch-aquatic",
  });
})();
