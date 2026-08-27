(() => {
  "use strict";

  /*
   * Fase 4 — paridade de enquadramento com Fases 1–3.
   *
   * As três primeiras fases suavizam a câmera, antecipam o deslocamento horizontal
   * e compensam saltos/altura para manter Shall numa faixa de leitura confortável.
   * A Fase 4 aquática mantinha o eixo vertical totalmente fixo, então nadar no topo
   * ou no fundo fazia Shall encostar nas bordas do quadro e deixava a câmera com
   * sensação de protótipo. Este wrapper altera SOMENTE o transform de renderização
   * do mundo no canvas; física, colisões, IA, HP, rotas e coordenadas reais não mudam.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4CameraParityInstalled) return;

  const nativeSetTransform = proto.setTransform;
  const nativeTranslate = proto.translate;
  const W = 480;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;

  const state = {
    frameArmed: false,
    worldTransformApplied: false,
    camera: 0,
    lift: 0,
    look: 0,
    facing: 1,
    lastTick: performance.now(),
    mode: null,
    initialized: false,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function targetFor(debug, tick) {
    const hero = debug?.hero;
    if (!hero) return null;

    const dt = clamp((tick - state.lastTick) / 1000, 0, 0.033);
    state.lastTick = tick;

    if (Math.abs(hero.vx ?? 0) > 18) state.facing = Math.sign(hero.vx) || state.facing;

    const bossActive = Boolean(debug?.boss?.active);
    const speed = Math.abs(hero.vx ?? 0);
    const targetLook = bossActive ? 0 : state.facing * clamp(speed * 0.12, 0, 28);
    state.look += (targetLook - state.look) * Math.min(1, dt * 4.6);

    // Adaptação aquática do cameraLift das Fases 1–3: como Shall nada em 2 eixos,
    // a câmera pode compensar tanto o teto quanto o fundo sem tocar nas coordenadas.
    const targetLift = bossActive ? 0 : clamp((274 - (hero.y ?? 274)) * 0.22, -24, 52);
    state.lift += (targetLift - state.lift) * Math.min(1, dt * 5.2);

    let targetCamera;
    if (bossActive) {
      // Água pOtávio permanece próximo de x=5915 durante o combate. O centro entre
      // herói e boss reproduz o enquadramento de arena usado nas Fases 1–3.
      const heroCenter = (hero.x ?? ARENA_LEFT) + 27;
      const bossCenter = 5915 + 75;
      targetCamera = (heroCenter + bossCenter) / 2 - W / 2;
      targetCamera = clamp(targetCamera, ARENA_LEFT - 26, WORLD_END - W);
    } else {
      // Mantém a base de 30% usada na Fase 4 para não quebrar os props existentes,
      // adicionando apenas o look-ahead suave que falta em relação às Fases 1–3.
      targetCamera = (hero.x ?? 0) - W * 0.3 + state.look;
      targetCamera = clamp(targetCamera, 0, WORLD_END - W);
    }

    if (!state.initialized || state.mode !== debug?.mode) {
      state.camera = targetCamera;
      state.lift = targetLift;
      state.look = targetLook;
      state.initialized = true;
    } else {
      const cameraEase = bossActive ? 3.5 : 4.5;
      state.camera += (targetCamera - state.camera) * Math.min(1, dt * cameraEase);
    }

    state.mode = debug?.mode ?? null;
    return { camera: state.camera, lift: state.lift, look: state.look, bossActive };
  }

  function isIdentityReset(args) {
    return args.length >= 6 &&
      args[0] === 1 && args[1] === 0 && args[2] === 0 &&
      args[3] === 1 && args[4] === 0 && args[5] === 0;
  }

  function paritySetTransform(...args) {
    const result = nativeSetTransform.apply(this, args);
    if (this.canvas?.id === "stage4-canvas" && isIdentityReset(args)) {
      state.frameArmed = true;
      state.worldTransformApplied = false;
    }
    return result;
  }

  function parityTranslate(x, y) {
    if (
      this.canvas?.id === "stage4-canvas" &&
      state.frameArmed &&
      !state.worldTransformApplied &&
      Number.isFinite(x) &&
      Math.abs(y) < 0.0001 &&
      x <= 0
    ) {
      const debug = debugState();
      const transform = this.getTransform?.();
      const transformIsWorldReady = !transform || (
        Math.abs(transform.a - 1) < 0.001 &&
        Math.abs(transform.d - 1) < 0.001 &&
        Math.abs(transform.b) < 0.001 &&
        Math.abs(transform.c) < 0.001
      );

      if (debug?.mode === "play" && transformIsWorldReady) {
        const target = targetFor(debug, performance.now());
        if (target) {
          state.worldTransformApplied = true;
          state.frameArmed = false;
          return nativeTranslate.call(this, -target.camera, target.lift);
        }
      }
    }

    return nativeTranslate.call(this, x, y);
  }

  proto.setTransform = paritySetTransform;
  proto.translate = parityTranslate;
  proto.__shallStage4CameraParityInstalled = true;

  // Estado somente leitura para camadas visuais futuras e QA. Não expõe nem altera
  // objetos internos de gameplay.
  window.__shallStage4CameraParity = () => ({
    camera: Number(state.camera.toFixed(2)),
    lift: Number(state.lift.toFixed(2)),
    look: Number(state.look.toFixed(2)),
    facing: state.facing,
  });
})();
