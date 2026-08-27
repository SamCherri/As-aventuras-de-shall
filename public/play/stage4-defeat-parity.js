(() => {
  "use strict";

  /*
   * Fase 4 — paridade de derrota do Água pOtávio com Fases 1–3.
   *
   * As fases-base tratam a derrota do chefão como uma sequência visual: reação,
   * perda de força, queda e leitura clara do estado derrotado antes do ending.
   * A Fase 4 já possui no atlas os frames hurt, drainA, drainB e defeat, mas o
   * runtime pulava direto para defeat durante o estado "dead". Este passe usa
   * esses frames canônicos como uma sequência de colapso, adicionando somente
   * deformação de render e vazamento de água. Nenhum timer, HP, hitbox, dano,
   * física, IA, posição ou estado de gameplay é escrito aqui.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4DefeatParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const POTAVIO_REGION = { x: 218, y: 0, w: 80, h: 60 };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const LOCAL = Object.freeze({
    hurt: [155, 177, 62, 58],
    drainA: [8, 168, 44, 68],
    drainB: [79, 176, 47, 59],
    defeat: [223, 198, 92, 36],
  });

  let deadSince = 0;
  let wasDead = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeOut = (t) => 1 - (1 - t) * (1 - t);

  function atlasSource(local) {
    const [x, y, w, h] = local;
    const sx = Math.floor(x / 4);
    const sy = Math.floor(y / 4);
    const ex = Math.max(sx + 1, Math.floor((x + w) / 4));
    const ey = Math.max(sy + 1, Math.floor((y + h) / 4));
    return [
      POTAVIO_REGION.x + sx,
      POTAVIO_REGION.y + sy,
      ex - sx,
      ey - sy,
    ];
  }

  const FRAMES = Object.freeze({
    hurt: atlasSource(LOCAL.hurt),
    drainA: atlasSource(LOCAL.drainA),
    drainB: atlasSource(LOCAL.drainB),
    defeat: atlasSource(LOCAL.defeat),
  });

  function insidePotavioRegion(sx, sy, sw, sh) {
    const epsilon = 1;
    return sx >= POTAVIO_REGION.x - epsilon &&
      sy >= POTAVIO_REGION.y - epsilon &&
      sx + sw <= POTAVIO_REGION.x + POTAVIO_REGION.w + epsilon &&
      sy + sh <= POTAVIO_REGION.y + POTAVIO_REGION.h + epsilon;
  }

  function pixel(context, x, y, w, h, color, alpha = 1) {
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = color;
    context.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    context.restore();
  }

  function frameFor(progress) {
    if (progress < 0.16) return FRAMES.hurt;
    if (progress < 0.48) return FRAMES.drainA;
    if (progress < 0.78) return FRAMES.drainB;
    return FRAMES.defeat;
  }

  function profileFor(progress, now) {
    const collapse = easeOut(clamp(progress, 0, 1));
    const wobble = reducedMotion ? 0 : Math.sin(now * 0.035) * (1 - progress) * 4;
    const kick = progress < 0.18 ? Math.sin(progress / 0.18 * Math.PI) : 0;
    return {
      scaleX: 1 + kick * 0.08 - collapse * 0.22,
      scaleY: 1 - kick * 0.07 - collapse * 0.34,
      x: wobble + collapse * 5,
      y: collapse * 8,
    };
  }

  function pressureRelease(context, centerX, centerY, width, height, progress) {
    if (reducedMotion || progress > 0.34) return;
    const phase = clamp(progress / 0.34, 0, 1);
    const radius = width * 0.44 + phase * 38;
    const alpha = 0.82 * (1 - phase);
    const colors = ["#d9fbff", "#8cecff", "#57e5f3"];

    for (let i = 0; i < 12; i += 1) {
      const angle = Math.PI * 2 * i / 12;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.66;
      const size = i % 3 === 0 ? 8 : 5;
      pixel(context, x - size / 2, y - size / 2, size, size, colors[i % colors.length], alpha);
    }

    pixel(context, centerX - width * 0.52, centerY - height * 0.37, width * 1.04, 4, "#d9fbff", alpha * 0.55);
  }

  function waterLeaks(context, centerX, bottomY, width, height, progress, now) {
    const active = clamp((progress - 0.08) / 0.72, 0, 1);
    if (active <= 0) return;

    const count = reducedMotion ? 6 : 16;
    for (let i = 0; i < count; i += 1) {
      const lane = (i % 5) / 4 - 0.5;
      const seed = i * 0.173;
      const travel = (active * 1.45 + seed + now * 0.00042) % 1;
      const startX = centerX + lane * width * 0.42;
      const startY = bottomY - height * (0.64 - (i % 3) * 0.09);
      const drift = Math.sin(i * 2.31 + now * 0.006) * (reducedMotion ? 0 : 10);
      const x = startX + drift * travel;
      const y = startY + travel * (height * 0.58 + 34);
      const size = i % 4 === 0 ? 6 : 4;
      const alpha = 0.86 * (1 - Math.max(0, travel - 0.74) / 0.26);
      pixel(context, x, y, size, size + (i % 2) * 3, i % 3 === 0 ? "#d9fbff" : "#69e8f4", alpha);
    }

    const puddle = clamp((progress - 0.42) / 0.58, 0, 1);
    if (puddle > 0) {
      const w = width * (0.34 + puddle * 0.42);
      pixel(context, centerX - w / 2, bottomY + 6, w, 5, "#57cfe6", 0.42 + puddle * 0.22);
      pixel(context, centerX - w * 0.31, bottomY + 12, w * 0.62, 3, "#d9fbff", 0.28 + puddle * 0.2);
    }
  }

  function finalImpact(context, centerX, bottomY, width, progress) {
    if (progress < 0.76) return;
    const p = clamp((progress - 0.76) / 0.24, 0, 1);
    const alpha = (1 - p) * 0.72;
    const spread = 18 + p * 34;
    for (let i = 0; i < 8; i += 1) {
      const side = i < 4 ? -1 : 1;
      const local = i % 4;
      pixel(
        context,
        centerX + side * (width * 0.28 + local * spread * 0.18),
        bottomY + 2 - local * 4,
        7 - local,
        4,
        local % 2 ? "#8cecff" : "#fff0a2",
        alpha,
      );
    }
  }

  function defeatDrawImage(image, ...args) {
    if (this.canvas?.id !== TARGET_CANVAS_ID || args.length !== 8) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insidePotavioRegion(sx, sy, sw, sh)) {
      return previousDrawImage.call(this, image, ...args);
    }

    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    const dead = debug?.boss?.active === true && debug?.boss?.state === "dead";
    const now = performance.now();

    if (!dead) {
      wasDead = false;
      deadSince = 0;
      return previousDrawImage.call(this, image, ...args);
    }

    if (!wasDead) {
      wasDead = true;
      deadSince = now;
    }

    const progress = clamp((now - deadSince) / 1700, 0, 1);
    const frame = frameFor(progress);
    const profile = profileFor(progress, now);
    const centerX = dx + dw / 2;
    const bottomY = dy + dh;
    const drawW = Math.max(28, Math.abs(dw) * profile.scaleX);
    const drawH = Math.max(22, Math.abs(dh) * profile.scaleY);
    const drawX = centerX - drawW / 2 + profile.x;
    const drawY = bottomY - drawH + profile.y;

    pressureRelease(this, centerX, dy + dh * 0.44, Math.abs(dw), Math.abs(dh), progress);
    waterLeaks(this, centerX, bottomY, Math.abs(dw), Math.abs(dh), progress, now);

    const result = previousDrawImage.call(
      this,
      image,
      frame[0],
      frame[1],
      frame[2],
      frame[3],
      drawX,
      drawY,
      drawW,
      drawH,
    );

    finalImpact(this, centerX + profile.x, bottomY + profile.y, drawW, progress);
    return result;
  }

  defeatDrawImage.__shallStage4DefeatParity = true;
  proto.drawImage = defeatDrawImage;
  proto.__shallStage4DefeatParityInstalled = true;

  window.__shallStage4DefeatParity = Object.freeze({
    durationMs: 1700,
    frames: Object.keys(FRAMES),
    reducedMotion,
  });
})();