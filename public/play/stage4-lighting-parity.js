(() => {
  "use strict";

  /*
   * Fase 4 — iluminação sincronizada com o pipeline das Fases 1–3.
   *
   * Nas três fases-base, backdrop, personagens, foreground e atmosfera são
   * compostos dentro do MESMO draw() por frame. A Fase 4 mantinha este passe de
   * iluminação em um requestAnimationFrame independente sobre o mesmo canvas.
   * Isso permitia que grade, fachos e luz da arena fossem pintados entre dois
   * frames do gameplay, por cima de Shall/inimigos/projéteis, gerando leitura
   * mais lavada e risco de pulsação/overdraw no celular.
   *
   * Este módulo passa a usar o boundary de render já exposto pelo core: o primeiro
   * translate horizontal do mundo ocorre logo depois de backdrop() e antes de
   * currents/recifes/personagens. A iluminação é desenhada uma única vez nesse
   * ponto, em coordenadas de tela, e então o renderer continua normalmente.
   *
   * O core da Fase 4 já aplica sua vinheta final após o foreground; por isso a
   * segunda vinheta deste módulo foi removida. Resultado: ambiente continua com
   * profundidade aquática, mas sprites e VFX não recebem uma segunda película.
   * Nenhum estado de gameplay é escrito ou alterado.
   */

  const canvas = document.querySelector("#stage4-canvas");
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!canvas || !proto || proto.__shallStage4LightingParityInstalled) return;

  const ctx = canvas.getContext("2d");
  const previousSetTransform = proto.setTransform;
  const previousTranslate = proto.translate;
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let visualCamera = 0;
  let visualLift = 0;
  let previousCameraTick = performance.now();
  let previousMode = null;
  let frameArmed = false;
  let lightingDrawn = false;

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function cameraFor(debug, tick) {
    const heroX = debug.hero?.x ?? 0;
    const parity = typeof window.__shallStage4CameraParity === "function"
      ? window.__shallStage4CameraParity()
      : null;
    const target = Number.isFinite(parity?.camera)
      ? parity.camera
      : clamp(debug.boss?.active ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
    const targetLift = Number.isFinite(parity?.lift) ? parity.lift : 0;
    const dt = clamp((tick - previousCameraTick) / 1000, 0, 0.033);
    previousCameraTick = tick;

    // Mantém suavização própria somente para o foco de luz. O alvo vem da câmera
    // visual compartilhada, então look-ahead e lift não ficam um frame espacialmente
    // desconectados do enquadramento do Shall.
    if (previousMode !== "play") {
      visualCamera = target;
      visualLift = targetLift;
    } else {
      visualCamera += (target - visualCamera) * Math.min(1, dt * 4.5);
      visualLift += (targetLift - visualLift) * Math.min(1, dt * 5.2);
    }
    previousMode = debug.mode;
    return { camera: visualCamera, lift: visualLift };
  }

  function worldGrade(debug) {
    const heroX = debug.hero?.x ?? 0;
    const progress = clamp(heroX / WORLD_END, 0, 1);

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
    const view = cameraFor(debug, tick);
    const hero = debug.hero;
    if (!hero) return;
    const x = clamp(hero.x - view.camera + 27, 24, W - 24);
    const y = clamp(hero.y + view.lift + 34, 72, H - 52);

    // Glow fica ATRÁS do personagem, como parte do ambiente, em vez de aplicar
    // uma película clara sobre o sprite já renderizado.
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

  function drawLighting(debug, tick) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    worldGrade(debug);
    surfaceShafts(tick, debug);
    heroFocus(debug, tick);
    arenaLighting(tick, debug);
    ctx.restore();
  }

  function isIdentityReset(args) {
    return args.length >= 6 &&
      args[0] === 1 && args[1] === 0 && args[2] === 0 &&
      args[3] === 1 && args[4] === 0 && args[5] === 0;
  }

  function lightingSetTransform(...args) {
    const result = previousSetTransform.apply(this, args);
    if (this.canvas?.id === "stage4-canvas" && isIdentityReset(args)) {
      frameArmed = true;
      lightingDrawn = false;
    }
    return result;
  }

  function lightingTranslate(x, y) {
    if (
      this.canvas?.id === "stage4-canvas" &&
      frameArmed &&
      !lightingDrawn &&
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Math.abs(y) < 0.0001 &&
      x <= 0
    ) {
      const debug = debugState();
      const transform = this.getTransform?.();
      const screenSpaceReady = !transform || (
        Math.abs(transform.a - 1) < 0.001 &&
        Math.abs(transform.d - 1) < 0.001 &&
        Math.abs(transform.b) < 0.001 &&
        Math.abs(transform.c) < 0.001
      );

      if (debug?.mode === "play" && screenSpaceReady) {
        lightingDrawn = true;
        frameArmed = false;
        drawLighting(debug, performance.now());
      }
    }

    return previousTranslate.call(this, x, y);
  }

  proto.setTransform = lightingSetTransform;
  proto.translate = lightingTranslate;
  proto.__shallStage4LightingParityInstalled = true;

  window.__shallStage4LightingParity = Object.freeze({
    pipeline: "synchronous-pre-gameplay",
    independentAnimationLoop: false,
    duplicateVignette: false,
    cameraSource: "shared-camera-parity",
    gameplayWrites: false,
  });
})();