(() => {
  "use strict";

  const canvas = document.querySelector("#stage4-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let visualCamera = 0;
  let previousCameraTick = performance.now();
  let previousMode = null;

  function cameraFor(debug, tick) {
    const heroX = debug.hero?.x ?? 0;
    const target = clamp(debug.boss?.active ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
    const dt = clamp((tick - previousCameraTick) / 1000, 0, 0.033);
    previousCameraTick = tick;

    // Espelha a interpolação usada pelo core da Fase 4 em update():
    // camera += (target - camera) * min(1, dt * 4.5).
    // Assim o foco de luz acompanha a câmera suavizada, não o alvo instantâneo.
    if (previousMode !== "play") visualCamera = 0;
    visualCamera += (target - visualCamera) * Math.min(1, dt * 4.5);
    previousMode = debug.mode;
    return visualCamera;
  }

  function worldGrade(debug) {
    const heroX = debug.hero?.x ?? 0;
    const progress = clamp(heroX / WORLD_END, 0, 1);

    // Fases 1–3 mudam a leitura da cena por trecho/arena; a Fase 4 agora também
    // ganha progressão tonal em vez de manter o mesmo banho azul do início ao fim.
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, `rgba(8, 88, 116, ${0.025 + progress * 0.025})`);
    gradient.addColorStop(0.52, `rgba(3, 44, 76, ${0.018 + progress * 0.04})`);
    gradient.addColorStop(1, `rgba(1, 18, 39, ${0.05 + progress * 0.08})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    if (progress > 0.48 && !debug.boss?.active) {
      const cave = clamp((progress - 0.48) / 0.32, 0, 1);
      ctx.fillStyle = `rgba(2, 18, 34, ${0.035 + cave * 0.055})`;
      ctx.fillRect(0, 78, W, H - 136);
    }
  }

  function surfaceShafts(tick, debug) {
    if (debug.boss?.active) return;
    const heroX = debug.hero?.x ?? 0;
    const progress = clamp(heroX / WORLD_END, 0, 1);
    const motion = reducedMotion ? 0 : tick * 0.00018;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 4; i += 1) {
      const base = 42 + i * 128;
      const drift = Math.sin(motion * (1.3 + i * 0.11) + i * 1.7) * 18;
      const width = 34 + (i % 2) * 14;
      ctx.fillStyle = `rgba(132, 235, 244, ${0.025 + (1 - progress) * 0.018})`;
      ctx.beginPath();
      ctx.moveTo(base + drift, 56);
      ctx.lineTo(base + drift + width, 56);
      ctx.lineTo(base + drift + width + 84, 360);
      ctx.lineTo(base + drift + 36, 360);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function heroFocus(debug, tick) {
    const camera = cameraFor(debug, tick);
    const hero = debug.hero;
    if (!hero) return;
    const x = clamp(hero.x - camera + 27, 24, W - 24);
    const y = clamp(hero.y + 34, 72, H - 52);

    // Mesmo princípio dos glows radiais das arenas das Fases 1–3: o personagem
    // vence o fundo localmente sem receber outline artificial nem alterar sprite.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const glow = ctx.createRadialGradient(x, y, 8, x, y, 118);
    glow.addColorStop(0, "rgba(188, 248, 250, .105)");
    glow.addColorStop(0.42, "rgba(80, 198, 218, .055)");
    glow.addColorStop(1, "rgba(28, 101, 132, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 122, y - 122, 244, 244);
    ctx.restore();
  }

  function arenaLighting(tick, debug) {
    if (!debug.boss?.active) return;
    const phase = clamp(debug.boss?.phase ?? 1, 1, 3);
    const water = clamp(debug.boss?.water ?? 100, 0, 100);
    const pulse = reducedMotion ? 0 : Math.sin(tick * 0.0045) * 0.018;
    const pressure = 1 - water / 100;

    // As arenas de Joyce/Rock usam pulse glow específico de boss. Aqui a fonte
    // fica à direita, junto do Água pOtávio, e muda conforme galão/nível.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const bossGlow = ctx.createRadialGradient(W - 74, 220, 18, W - 74, 220, 270);
    bossGlow.addColorStop(0, `rgba(112, 232, 244, ${0.07 + phase * 0.018 + pulse})`);
    bossGlow.addColorStop(0.48, `rgba(54, 150, 190, ${0.035 + pressure * 0.035})`);
    bossGlow.addColorStop(1, "rgba(14, 63, 94, 0)");
    ctx.fillStyle = bossGlow;
    ctx.fillRect(0, 48, W, H - 96);

    if (phase >= 3 || water <= 27) {
      const dryPulse = ctx.createRadialGradient(W - 78, 205, 12, W - 78, 205, 150);
      dryPulse.addColorStop(0, `rgba(255, 226, 139, ${0.055 + pulse})`);
      dryPulse.addColorStop(1, "rgba(255, 170, 82, 0)");
      ctx.fillStyle = dryPulse;
      ctx.fillRect(W - 250, 48, 250, 330);
    }
    ctx.restore();

    ctx.save();
    const arenaShade = ctx.createLinearGradient(0, 0, W, 0);
    arenaShade.addColorStop(0, `rgba(1, 12, 30, ${0.085 + phase * 0.015})`);
    arenaShade.addColorStop(0.42, "rgba(1, 18, 35, .035)");
    arenaShade.addColorStop(0.78, "rgba(1, 18, 35, 0)");
    ctx.fillStyle = arenaShade;
    ctx.fillRect(0, 58, W, H - 113);
    ctx.restore();
  }

  function readabilityVignette() {
    // O core já possui vinheta; este segundo passe é mais leve e roda depois dos
    // props/oclusores de paridade, integrando-os à mesma profundidade da cena.
    const vignette = ctx.createRadialGradient(W / 2, H * 0.48, 150, W / 2, H * 0.48, 380);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(0.72, "rgba(0, 8, 20, .035)");
    vignette.addColorStop(1, "rgba(0, 6, 18, .11)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function draw(tick) {
    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    if (!debug || debug.mode !== "play") {
      previousMode = debug?.mode ?? null;
      previousCameraTick = tick;
      requestAnimationFrame(draw);
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    worldGrade(debug);
    surfaceShafts(tick, debug);
    heroFocus(debug, tick);
    arenaLighting(tick, debug);
    readabilityVignette();
    ctx.restore();

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
