(() => {
  "use strict";

  /*
   * Fase 4 — backdrop nativo em PNG, alinhado às Fases 1–3.
   *
   * As três fases-base dependem de arte-fonte PNG para construir silhueta,
   * profundidade e leitura de cada região. A Fase 4 ainda desenhava grande parte
   * do backdrop regional com dezenas de fillRect em runtime. Este wrapper troca
   * esse acabamento procedural por um atlas PNG dedicado e zone-specific, mantendo
   * o atlas aquático original como base/fallback e sem tocar em gameplay.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4BackdropParityInstalled) return;

  const nativeDrawImage = proto.drawImage;
  const W = 480;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const PANEL_W = 960;
  const PANEL_H = 220;

  const FAR = { sx: 0, sy: 0, sw: 133, sh: 44 };
  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };
  const ZONES = [
    { key: "canal", start: 0, end: 900, row: 0 },
    { key: "bubbles", start: 900, end: 2050, row: 1 },
    { key: "fissure", start: 2050, end: 3250, row: 2 },
    { key: "grotto", start: 3250, end: 4350, row: 3 },
    { key: "reservoir", start: 4350, end: WORLD_END, row: 4 },
  ];

  const PROFILES = {
    canal: { farY: 154, farH: 172, farAlpha: 0.82, midY: 292, midH: 168, midAlpha: 0.86 },
    bubbles: { farY: 132, farH: 190, farAlpha: 0.88, midY: 278, midH: 182, midAlpha: 0.92 },
    fissure: { farY: 118, farH: 208, farAlpha: 0.76, midY: 270, midH: 194, midAlpha: 0.82 },
    grotto: { farY: 126, farH: 202, farAlpha: 0.80, midY: 274, midH: 190, midAlpha: 0.86 },
    reservoir: { farY: 108, farH: 216, farAlpha: 0.74, midY: 260, midH: 204, midAlpha: 0.88 },
  };

  const BACKDROP_PARTS = Array.from({ length: 4 }, (_, i) =>
    `./assets/stage4/stage4-backdrop-native.b64.${String(i).padStart(2, "0")}.txt?v=1`
  );
  const backdrop = new Image();
  let backdropReady = false;
  let backdropError = false;

  async function loadBackdrop() {
    try {
      const chunks = await Promise.all(BACKDROP_PARTS.map(async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`backdrop ${response.status}: ${url}`);
        return (await response.text()).trim();
      }));
      backdrop.decoding = "async";
      backdrop.src = `data:image/png;base64,${chunks.join("")}`;
      if (backdrop.decode) await backdrop.decode();
      else await new Promise((resolve, reject) => { backdrop.onload = resolve; backdrop.onerror = reject; });
      backdropReady = true;
    } catch (error) {
      backdropError = true;
      console.warn("Stage 4 native backdrop fallback:", error);
    }
  }
  loadBackdrop();

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;
  let visualCamera = 0;
  let previousTick = performance.now();
  let previousMode = null;
  let renderSerial = 0;
  let farArtSerial = -1;
  let midArtSerial = -1;
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
    return { zone, next: ZONES[index + 1] ?? null, blend };
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
    const current = PROFILES[state.zone.key] ?? PROFILES.canal;
    if (!state.next || state.blend <= 0) return current;
    const next = PROFILES[state.next.key] ?? current;
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

  function drawWrappedPanel(ctx, row, layer, state, alpha) {
    if (!backdropReady || backdropError || alpha <= 0) return;

    const isFar = layer === "far";
    const speed = isFar ? 0.055 : 0.145;
    const y = isFar ? 104 : 286;
    const h = isFar ? 222 : 220;
    const sourceY = (isFar ? row : row + 5) * PANEL_H;
    const offset = ((Math.floor(state.camera * speed) % PANEL_W) + PANEL_W) % PANEL_W;
    const firstWidth = Math.min(W, PANEL_W - offset);
    const secondWidth = W - firstWidth;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    nativeDrawImage.call(ctx, backdrop, offset, sourceY, firstWidth, PANEL_H, 0, y, firstWidth, h);
    if (secondWidth > 0) {
      nativeDrawImage.call(ctx, backdrop, 0, sourceY, secondWidth, PANEL_H, firstWidth, y, secondWidth, h);
    }
    ctx.restore();
  }

  function drawAuthoredBackdrop(ctx, state, layer) {
    if (!backdropReady) return;
    const primary = 1 - state.blend * 0.86;
    const secondary = state.blend * 0.86;
    drawWrappedPanel(ctx, state.zone.row, layer, state, primary);
    if (state.next && secondary > 0) drawWrappedPanel(ctx, state.next.row, layer, state, secondary);
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
      if (farArtSerial !== renderSerial) {
        drawAuthoredBackdrop(this, state, "far");
        farArtSerial = renderSerial;
      }
    }

    const result = nativeDrawImage.apply(this, args);
    this.globalAlpha = previousAlpha;

    if (isMid && dx >= W && midArtSerial !== renderSerial) {
      drawAuthoredBackdrop(this, state, "mid");
      midArtSerial = renderSerial;
    }

    return result;
  }

  parityDrawImage.__shallStage4BackdropParity = true;
  proto.drawImage = parityDrawImage;
  proto.__shallStage4BackdropParityInstalled = true;

  window.__shallStage4BackdropNative = () => ({
    ready: backdropReady,
    error: backdropError,
    width: backdrop.naturalWidth || 0,
    height: backdrop.naturalHeight || 0,
  });
})();
