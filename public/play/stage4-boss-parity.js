(() => {
  "use strict";

  /*
   * Fase 4 — paridade de animação/telegraph do Água pOtávio com Fases 1–3.
   *
   * Os chefões das fases-base comunicam intenção com antecipação, deformação curta,
   * impacto e recuperação. A Fase 4 já possui estados de ataque corretos; este passe
   * atua somente no desenho do sprite do Água pOtávio para dar o mesmo peso visual,
   * sem alterar timers, dano, HP, hitbox, IA, física ou projéteis.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4BossParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const POTAVIO_REGION = { x: 218, y: 0, w: 80, h: 60 };
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  const durations = {
    jet_charge: 720,
    jet: 1300,
    sneeze_charge: 720,
    sneeze: 420,
  };

  let lastState = null;
  let stateEnteredAt = performance.now();
  let recoveryUntil = 0;
  let recoveryFrom = null;
  let previousWaterShots = 0;
  let shotBurstUntil = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function insidePotavioRegion(sx, sy, sw, sh) {
    const epsilon = 1;
    return sx >= POTAVIO_REGION.x - epsilon &&
      sy >= POTAVIO_REGION.y - epsilon &&
      sx + sw <= POTAVIO_REGION.x + POTAVIO_REGION.w + epsilon &&
      sy + sh <= POTAVIO_REGION.y + POTAVIO_REGION.h + epsilon;
  }

  function syncState(debug, now) {
    const state = debug?.boss?.state ?? "idle";
    if (state !== lastState) {
      if ((lastState === "jet" || lastState === "sneeze") && state === "combat") {
        recoveryUntil = now + (reducedMotion ? 150 : 330);
        recoveryFrom = lastState;
      }
      lastState = state;
      stateEnteredAt = now;
    }

    const waterShots = Number(debug?.waterShots ?? 0);
    if (waterShots > previousWaterShots) {
      shotBurstUntil = now + (reducedMotion ? 80 : 150);
    }
    previousWaterShots = waterShots;
  }

  function stateProgress(state, now) {
    const duration = durations[state] ?? 500;
    return clamp((now - stateEnteredAt) / duration, 0, 1);
  }

  function profileFor(state, now, phase) {
    const p = stateProgress(state, now);
    const pulse = Math.sin(p * Math.PI * 4);
    const intensity = 1 + Math.max(0, phase - 1) * 0.12;
    const profile = { sx: 1, sy: 1, x: 0, y: 0, rotate: 0 };

    if (state === "jet_charge") {
      profile.sx = 0.91 - Math.abs(pulse) * 0.025 * intensity;
      profile.sy = 1.08 + Math.abs(pulse) * 0.035 * intensity;
      profile.x = 6 + p * 5;
      profile.rotate = -0.025 - p * 0.018;
    } else if (state === "jet") {
      const kick = 1 - p;
      profile.sx = 1.09 + kick * 0.07;
      profile.sy = 0.95 - kick * 0.025;
      profile.x = 8 + kick * 8;
      profile.rotate = 0.02 + kick * 0.025;
    } else if (state === "sneeze_charge") {
      profile.sx = 1.05 + p * 0.09 + Math.abs(pulse) * 0.025;
      profile.sy = 1.03 + p * 0.035;
      profile.y = 3 - p * 5;
      profile.rotate = pulse * 0.018 * intensity;
    } else if (state === "sneeze") {
      const blast = 1 - p;
      profile.sx = 1.15 + blast * 0.08;
      profile.sy = 0.93 - blast * 0.04;
      profile.x = 6 + blast * 8;
      profile.y = -3;
      profile.rotate = -0.04 - blast * 0.025;
    } else if (state === "intro") {
      const breathe = Math.sin(now * 0.006);
      profile.sx = 1 + breathe * 0.018;
      profile.sy = 1 - breathe * 0.012;
    } else if (state === "combat" && now < recoveryUntil) {
      const remain = clamp((recoveryUntil - now) / (reducedMotion ? 150 : 330), 0, 1);
      const sign = recoveryFrom === "jet" ? 1 : -1;
      profile.sx = 1 - remain * 0.05;
      profile.sy = 1 + remain * 0.065;
      profile.x = sign * remain * 5;
      profile.rotate = sign * remain * 0.025;
    }

    return profile;
  }

  function pixel(context, x, y, w, h, color, alpha = 1) {
    context.save();
    context.globalAlpha *= alpha;
    context.fillStyle = color;
    context.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    context.restore();
  }

  function chargeBrackets(context, centerX, centerY, width, height, state, progress, phase) {
    if (reducedMotion) return;
    const cyan = phase >= 3 ? "#fff0a2" : "#8cecff";
    const dark = "#0a4568";
    const pulse = 0.56 + 0.34 * Math.abs(Math.sin(progress * Math.PI * 5));
    const expand = state === "sneeze_charge" ? 18 + progress * 24 : 10 + progress * 12;
    const left = centerX - width * 0.58 - expand;
    const right = centerX + width * 0.58 + expand;
    const top = centerY - height * 0.46 - expand * 0.45;
    const bottom = centerY + height * 0.46 + expand * 0.45;
    const len = state === "sneeze_charge" ? 24 : 34;

    pixel(context, left, top, len, 4, dark, 0.8);
    pixel(context, left, top, 4, len, cyan, pulse);
    pixel(context, right - len, top, len, 4, dark, 0.8);
    pixel(context, right - 4, top, 4, len, cyan, pulse);
    pixel(context, left, bottom - 4, len, 4, cyan, pulse);
    pixel(context, left, bottom - len, 4, len, dark, 0.8);
    pixel(context, right - len, bottom - 4, len, 4, cyan, pulse);
    pixel(context, right - 4, bottom - len, 4, len, dark, 0.8);

    if (state === "jet_charge") {
      const aimY = centerY + 8;
      for (let i = 0; i < 4; i += 1) {
        const x = centerX - width * 0.58 - 22 - i * 18;
        pixel(context, x, aimY - 2, 10, 4, cyan, pulse * (1 - i * 0.12));
      }
    } else {
      const radius = width * 0.42 + 16 + progress * 18;
      for (let i = 0; i < 8; i += 1) {
        const angle = (Math.PI * 2 * i) / 8;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.72;
        pixel(context, x - 3, y - 3, 6, 6, cyan, pulse * 0.9);
      }
    }
  }

  function muzzleBurst(context, x, y, phase, strength = 1) {
    const bright = phase >= 3 ? "#fff0a2" : "#d9fbff";
    const mid = phase >= 3 ? "#ffb458" : "#69e8f4";
    const s = strength;
    pixel(context, x - 18 * s, y - 4 * s, 16 * s, 8 * s, bright, 0.95);
    pixel(context, x - 30 * s, y - 2 * s, 10 * s, 4 * s, mid, 0.82);
    pixel(context, x - 12 * s, y - 15 * s, 5 * s, 8 * s, mid, 0.8);
    pixel(context, x - 12 * s, y + 7 * s, 5 * s, 8 * s, mid, 0.8);
  }

  function pressureBurst(context, centerX, centerY, width, height, progress, phase) {
    if (reducedMotion) return;
    const color = phase >= 3 ? "#fff0a2" : "#8cecff";
    const radius = width * 0.52 + 16 + (1 - progress) * 24;
    const alpha = 0.85 * (1 - progress);
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.72;
      const size = i % 2 === 0 ? 8 : 5;
      pixel(context, x - size / 2, y - size / 2, size, size, color, alpha);
    }
    pixel(context, centerX - width * 0.52, centerY - height * 0.48, width * 1.04, 4, color, alpha * 0.55);
  }

  function bossParityDrawImage(image, ...args) {
    if (this.canvas?.id !== "stage4-canvas" || args.length !== 8) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insidePotavioRegion(sx, sy, sw, sh)) {
      return previousDrawImage.call(this, image, ...args);
    }

    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    if (!debug?.boss?.active) return previousDrawImage.call(this, image, ...args);

    const now = performance.now();
    syncState(debug, now);
    const state = debug.boss.state ?? "combat";
    const phase = Number(debug.boss.phase ?? 1);
    const progress = stateProgress(state, now);
    const profile = profileFor(state, now, phase);
    const centerX = dx + dw / 2;
    const centerY = dy + dh / 2;

    if (state === "jet_charge" || state === "sneeze_charge") {
      chargeBrackets(this, centerX, centerY, Math.abs(dw), Math.abs(dh), state, progress, phase);
    }

    this.save();
    this.translate(centerX + profile.x, centerY + profile.y);
    this.rotate(profile.rotate);
    this.scale(profile.sx, profile.sy);
    const result = previousDrawImage.call(
      this,
      image,
      sx,
      sy,
      sw,
      sh,
      -dw / 2,
      -dh / 2,
      dw,
      dh,
    );
    this.restore();

    const muzzleX = centerX - Math.abs(dw) * 0.42 + profile.x;
    const muzzleY = centerY + 4 + profile.y;
    if (state === "jet") {
      muzzleBurst(this, muzzleX, muzzleY, phase, 1.35);
    } else if (now < shotBurstUntil && state === "combat") {
      muzzleBurst(this, muzzleX, muzzleY, phase, 0.8);
    }

    if (state === "sneeze") {
      pressureBurst(this, centerX + profile.x, centerY + profile.y, Math.abs(dw), Math.abs(dh), progress, phase);
    }

    return result;
  }

  bossParityDrawImage.__shallStage4BossParity = true;
  proto.drawImage = bossParityDrawImage;
  proto.__shallStage4BossParityInstalled = true;
})();
