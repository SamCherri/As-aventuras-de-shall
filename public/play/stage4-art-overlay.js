(() => {
  "use strict";

  const base = document.querySelector("#stage4-canvas");
  if (!base) return;

  const PARTS = Array.from({ length: 14 }, (_, i) =>
    `./assets/stage4/art-atlas.b64.${String(i).padStart(2, "0")}.txt?v=39`
  );
  const REGION = {
    far: [0, 0, 133, 44],
    mid: [0, 46, 133, 44],
    fore: [0, 92, 133, 44],
    tiles: [0, 138, 80, 60],
    vfx: [82, 138, 80, 60],
    hero: [137, 0, 80, 60],
    potavio: [218, 0, 80, 60],
    enemies: [137, 62, 80, 60],
  };
  const REEFS = [
    [620, 58, 130, 215], [850, 330, 165, 175], [1370, 58, 180, 220], [1760, 315, 155, 190],
    [2310, 58, 120, 230], [2710, 310, 185, 195], [3130, 58, 145, 225], [3710, 315, 175, 190],
    [4140, 58, 130, 235], [4820, 305, 160, 200],
  ];
  const WORLD_END = 6100;
  const VIEW_W = 480;
  const ARENA_CAMERA = 5580;

  const overlay = document.createElement("canvas");
  overlay.width = 480;
  overlay.height = 560;
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.stage4ArtOverlay = "true";
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "4",
    imageRendering: "pixelated",
    display: "none",
  });
  document.body.appendChild(overlay);
  const ctx = overlay.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let atlas = null;
  let ready = false;
  let lastHeroX = 0;
  let face = 1;
  let lastFrame = performance.now();

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function syncOverlay() {
    const r = base.getBoundingClientRect();
    overlay.style.left = `${r.left}px`;
    overlay.style.top = `${r.top}px`;
    overlay.style.width = `${r.width}px`;
    overlay.style.height = `${r.height}px`;
  }

  async function loadAtlas() {
    const chunks = await Promise.all(PARTS.map(async (url) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Falha no asset ${response.status}: ${url}`);
      return (await response.text()).trim();
    }));
    const image = new Image();
    image.src = `data:image/png;base64,${chunks.join("")}`;
    if (image.decode) await image.decode();
    else await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    atlas = image;
    ready = true;
    document.documentElement.classList.add("stage4-art-ready");
  }

  function drawRegion(region, dx, dy, dw, dh, alpha = 1) {
    if (!ready) return;
    const [sx, sy, sw, sh] = REGION[region];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }

  function drawSource(sx, sy, sw, sh, dx, dy, dw, dh, flip = false, alpha = 1) {
    if (!ready) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (flip) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(atlas, sx, sy, sw, sh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  function drawParallax(camera, t) {
    const farShift = -((camera * 0.05) % 240);
    for (let x = farShift - 240; x < VIEW_W + 240; x += 240) {
      drawRegion("far", x, 58, 240, 122, 0.22);
    }

    const midShift = -((camera * 0.18) % 290);
    for (let x = midShift - 290; x < VIEW_W + 290; x += 290) {
      drawRegion("mid", x, 178 + Math.sin(t * 0.0008) * 3, 290, 118, 0.56);
    }

    for (const [x, y, w, h] of REEFS) {
      const sx = x - camera;
      if (sx + w < -60 || sx > VIEW_W + 60) continue;
      drawRegion("tiles", sx - 3, y - 5, w + 6, h + 10, 0.78);
    }

    const foreShift = -((camera * 0.38) % 330);
    for (let x = foreShift - 330; x < VIEW_W + 330; x += 330) {
      drawRegion("fore", x, 384, 330, 120, 0.48);
    }
  }

  function drawHero(state, camera, t) {
    if (!state.transformDone || !state.hero) return;
    const h = state.hero;
    if (h.x > lastHeroX + 0.5) face = 1;
    else if (h.x < lastHeroX - 0.5) face = -1;
    lastHeroX = h.x;

    const speed = Math.abs(h.vx || 0);
    let frame = 0;
    if (speed > 20) frame = Math.floor(t / 110) % 5;
    if (speed > 330) frame = 4;

    const sx = REGION.hero[0] + frame * 16;
    const sy = REGION.hero[1] + 1;
    const screenX = h.x - camera;
    const bob = Math.sin(t * 0.009) * (speed < 20 ? 2 : 1);

    if (speed > 330) {
      drawSource(REGION.vfx[0] + 1, REGION.vfx[1] + 1, 24, 18,
        screenX - face * 34 - 6, h.y + 20, 54, 32, face < 0, 0.72);
    }

    drawSource(sx, sy, 16, 28, screenX - 7, h.y - 8 + bob, 68, 86, face < 0, 1);

    if ((state.marbles || 0) > 0) {
      const px = screenX + (face > 0 ? 58 : -10);
      drawSource(REGION.vfx[0] + 31, REGION.vfx[1] + 2, 14, 14, px, h.y + 24, 18, 18, false, 0.9);
    }
  }

  function drawBoss(state, t) {
    if (!state.boss?.active) return;
    const b = state.boss;
    let frame = Math.floor(t / 260) % 4;
    if (b.water <= 30) frame = 3;
    if (b.state === "jet" || b.state === "jet_charge") frame = 2;
    if (b.state === "sneeze" || b.state === "sneeze_charge") frame = 1;

    const sx = REGION.potavio[0] + frame * 20;
    const sy = REGION.potavio[1] + 1;
    const y = 184 + Math.sin(t * 0.004) * 16;

    ctx.save();
    if (b.state === "dead") {
      ctx.translate(385, y + 72);
      ctx.rotate(0.38);
      drawSource(sx, sy, 20, 29, -54, -72, 108, 150, false, 1);
    } else {
      ctx.restore();
      drawSource(sx, sy, 20, 29, 330, y, 112, 154, false, 1);
      if (b.state === "jet") {
        drawSource(REGION.vfx[0] + 22, REGION.vfx[1] + 19, 50, 18, 146, y + 66, 205, 42, true, 0.82);
      }
      return;
    }
    ctx.restore();
  }

  function drawAmbientVfx(t) {
    for (let i = 0; i < 7; i++) {
      const x = (i * 79 + (t * (0.014 + i * 0.001))) % 540 - 30;
      const y = 475 - ((t * (0.018 + i * 0.002) + i * 61) % 390);
      drawSource(REGION.vfx[0] + 1, REGION.vfx[1] + 1, 14, 14, x, y, 18, 18, false, 0.35);
    }
  }

  function render(now) {
    syncOverlay();
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    let state = null;
    try {
      state = window.__shallStage4Debug?.() || null;
    } catch (_) {
      state = null;
    }

    if (!ready || !state || state.mode === "intro") {
      overlay.style.display = "none";
      requestAnimationFrame(render);
      return;
    }

    overlay.style.display = "block";
    const camera = state.boss?.active
      ? ARENA_CAMERA
      : clamp((state.hero?.x || 0) - VIEW_W * 0.30, 0, WORLD_END - VIEW_W);

    drawParallax(camera, now);
    drawAmbientVfx(now);
    drawHero(state, camera, now);
    drawBoss(state, now);
    requestAnimationFrame(render);
  }

  loadAtlas().catch((error) => {
    console.warn("Stage 4 art overlay desativado; gameplay preservada:", error);
  });
  window.addEventListener("resize", syncOverlay, { passive: true });
  window.addEventListener("scroll", syncOverlay, { passive: true });
  requestAnimationFrame(render);
})();
