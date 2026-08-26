(() => {
  "use strict";

  /*
   * Fase 4 — paridade de impacto/VFX com Fases 1–3.
   *
   * As fases-base combinam flash curto, shake, partículas e números de dano para
   * dar peso visual aos acertos. A Fase 4 já possui shake/bursts internos, mas
   * ainda não comunica dano com a mesma clareza. Este passe observa somente o
   * estado público de debug e desenha feedback em uma camada visual separada.
   * Nenhuma hitbox, dano, HP, física, IA, velocidade ou rota é alterada.
   */

  const screen = document.querySelector(".stage4-screen");
  const gameCanvas = document.querySelector("#stage4-canvas");
  if (!screen || !gameCanvas || typeof window.__shallStage4Debug !== "function") return;
  if (document.querySelector("#stage4-impact-parity")) return;

  const overlay = document.createElement("canvas");
  overlay.id = "stage4-impact-parity";
  overlay.width = gameCanvas.width;
  overlay.height = gameCanvas.height;
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "4",
    imageRendering: "pixelated",
  });
  gameCanvas.insertAdjacentElement("afterend", overlay);

  const ctx = overlay.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  const W = overlay.width;
  const H = overlay.height;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const BOSS_X = 5915;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const effects = [];
  const particles = [];
  let flash = 0;
  let flashColor = "#fff1a6";
  let camera = 0;
  let previous = null;
  let previousTime = performance.now();
  let previousMode = null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const snapshot = (debug) => ({
    mode: debug.mode,
    shells: debug.shells,
    hero: { ...debug.hero },
    boss: { ...debug.boss },
  });

  function addParticles(x, y, color, count, speed) {
    const cap = reducedMotion ? Math.ceil(count * 0.45) : count;
    for (let i = 0; i < cap; i++) {
      const angle = (Math.PI * 2 * i) / cap + (i % 2) * 0.22;
      const velocity = speed * (0.62 + (i % 4) * 0.11);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.42 + (i % 3) * 0.08,
        maxLife: 0.58,
        size: 2 + (i % 3),
        color,
      });
    }
    if (particles.length > 72) particles.splice(0, particles.length - 72);
  }

  function addImpact(kind, x, y, value, color) {
    effects.push({
      kind,
      x,
      y,
      value,
      life: reducedMotion ? 0.42 : 0.72,
      maxLife: reducedMotion ? 0.42 : 0.72,
      color,
    });
    if (effects.length > 18) effects.splice(0, effects.length - 18);
    addParticles(x, y, color, kind === "boss" ? 16 : 12, kind === "boss" ? 175 : 145);
  }

  function triggerFlash(color, strength) {
    flashColor = color;
    flash = Math.max(flash, reducedMotion ? strength * 0.5 : strength);
  }

  function screenX(worldX) {
    return worldX - camera;
  }

  function updateCamera(debug, dt) {
    const target = debug.boss.active ? ARENA_LEFT : debug.hero.x - W * 0.3;
    const clamped = clamp(target, 0, WORLD_END - W);
    camera += (clamped - camera) * Math.min(1, dt * 4.5);
  }

  function observe(debug) {
    if (!previous || debug.mode !== previousMode) {
      previous = snapshot(debug);
      previousMode = debug.mode;
      return;
    }
    if (debug.mode !== "play") {
      previous = snapshot(debug);
      return;
    }

    const heroDelta = previous.hero.health - debug.hero.health;
    if (heroDelta > 0) {
      addImpact(
        "hero",
        clamp(screenX(debug.hero.x + 27), 28, W - 28),
        clamp(debug.hero.y + 34, 38, H - 38),
        heroDelta,
        "#ff7180",
      );
      triggerFlash("#ff5363", 0.18);
    } else if (heroDelta < 0) {
      addImpact(
        "heal",
        clamp(screenX(debug.hero.x + 27), 28, W - 28),
        clamp(debug.hero.y + 20, 34, H - 34),
        Math.abs(heroDelta),
        "#91f39a",
      );
      triggerFlash("#91f39a", 0.07);
    }

    const bossDelta = previous.boss.health - debug.boss.health;
    if (bossDelta > 0) {
      const bossX = clamp(screenX(BOSS_X + 75), W * 0.55, W - 42);
      const bossY = 300;
      addImpact("boss", bossX, bossY, bossDelta, "#fff1a6");
      triggerFlash("#fff1a6", 0.12);
    }

    if (debug.boss.phase > previous.boss.phase) {
      effects.push({
        kind: "phase",
        x: clamp(screenX(BOSS_X + 75), W * 0.55, W - 42),
        y: 300,
        value: debug.boss.phase,
        life: reducedMotion ? 0.5 : 1.05,
        maxLife: reducedMotion ? 0.5 : 1.05,
        color: "#69e8f4",
      });
      triggerFlash("#69e8f4", 0.14);
    }

    const shellDelta = debug.shells - previous.shells;
    if (shellDelta > 0) {
      addParticles(
        clamp(screenX(debug.hero.x + 27), 24, W - 24),
        clamp(debug.hero.y + 28, 32, H - 32),
        "#ffe373",
        10,
        105,
      );
    }

    previous = snapshot(debug);
  }

  function update(dt) {
    for (const effect of effects) effect.life -= dt;
    for (let i = effects.length - 1; i >= 0; i--) if (effects[i].life <= 0) effects.splice(i, 1);

    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.18, dt);
      particle.vy *= Math.pow(0.22, dt);
      particle.life -= dt;
    }
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);

    flash = Math.max(0, flash - dt * 1.9);
  }

  function drawImpact(effect) {
    const progress = 1 - effect.life / effect.maxLife;
    const alpha = clamp(effect.life / effect.maxLife, 0, 1);
    const radius = 12 + progress * (effect.kind === "boss" ? 38 : 28);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(Math.round(effect.x), Math.round(effect.y));

    if (effect.kind === "phase") {
      const size = 48 + progress * 120;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 4;
      ctx.strokeRect(Math.round(-size / 2), Math.round(-size / 2), Math.round(size), Math.round(size));
      ctx.globalAlpha *= 0.65;
      ctx.strokeStyle = "#fff3a7";
      ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(-size * 0.36), Math.round(-size * 0.36), Math.round(size * 0.72), Math.round(size * 0.72));
      ctx.restore();
      return;
    }

    ctx.fillStyle = effect.color;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const w = i % 2 === 0 ? 9 : 5;
      const h = i % 2 === 0 ? 4 : 7;
      ctx.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    }

    const box = 14 + Math.round(progress * 18);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(-box, -box, box * 2, box * 2);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 22px monospace";
    const text = effect.kind === "heal" ? `+${effect.value}` : `-${effect.value}`;
    const textY = effect.y - 26 - progress * 36;
    ctx.lineWidth = 4;
    ctx.strokeStyle = effect.kind === "hero" ? "#611f35" : effect.kind === "heal" ? "#17452d" : "#7b2435";
    ctx.strokeText(text, effect.x, textY);
    ctx.fillStyle = effect.kind === "hero" ? "#ffd2d8" : effect.kind === "heal" ? "#d9ffd9" : "#fff3a7";
    ctx.fillText(text, effect.x, textY);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
    }
    ctx.globalAlpha = 1;

    for (const effect of effects) drawImpact(effect);

    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp(flash * 1.9, 0, 0.24);
      ctx.fillStyle = flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function frame(now) {
    const dt = clamp((now - previousTime) / 1000, 0, 0.033);
    previousTime = now;
    const debug = window.__shallStage4Debug?.();
    if (debug) {
      updateCamera(debug, dt);
      observe(debug);
    }
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
