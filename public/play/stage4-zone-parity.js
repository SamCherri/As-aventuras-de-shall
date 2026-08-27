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

  const ZONES = [
    { start: 0, end: 900, key: "canal" },
    { start: 900, end: 2050, key: "bubbles" },
    { start: 2050, end: 3250, key: "fissure" },
    { start: 3250, end: 4350, key: "grotto" },
    { start: 4350, end: 5450, key: "reservoir" },
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let visualCamera = 0;
  let previousTick = performance.now();
  let previousMode = null;

  function rect(x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function cameraFor(debug, tick) {
    const heroX = debug.hero?.x ?? 0;
    const target = clamp(debug.boss?.active ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
    const dt = clamp((tick - previousTick) / 1000, 0, 0.033);
    previousTick = tick;
    if (previousMode !== "play") visualCamera = target;
    visualCamera += (target - visualCamera) * Math.min(1, dt * 4.5);
    previousMode = debug.mode;
    return visualCamera;
  }

  function zoneAt(heroX) {
    if (heroX >= 5450) return { key: "reservoir", local: 1, next: null, blend: 0 };
    const index = ZONES.findIndex((zone) => heroX >= zone.start && heroX < zone.end);
    const zone = ZONES[Math.max(0, index)];
    const local = clamp((heroX - zone.start) / Math.max(1, zone.end - zone.start), 0, 1);
    const blend = local > 0.84 && index < ZONES.length - 1 ? (local - 0.84) / 0.16 : 0;
    return { key: zone.key, local, next: ZONES[index + 1]?.key ?? null, blend: clamp(blend, 0, 1) };
  }

  function pixelBubble(x, y, size, alpha) {
    const s = Math.max(2, Math.round(size / 4) * 2);
    rect(x + s, y, s * 2, s, "#c9fbff", alpha * 0.72);
    rect(x, y + s, s, s * 2, "#73d8e9", alpha * 0.76);
    rect(x + s * 3, y + s, s, s * 2, "#2c8dab", alpha * 0.68);
    rect(x + s, y + s * 3, s * 2, s, "#1b6f91", alpha * 0.62);
    rect(x + s, y + s, s, s, "#e7ffff", alpha * 0.82);
  }

  function hazardStripe(x, y, width, alpha) {
    const cell = 18;
    for (let px = 0; px < width; px += cell) {
      rect(x + px, y, Math.min(10, width - px), 7, px / cell % 2 ? "#d18a32" : "#ffe071", alpha);
    }
    rect(x, y + 7, width, 4, "#071925", alpha * 0.9);
  }

  function drawCanal(tick, alpha, camera) {
    const drift = -((camera * 0.08) % 96);
    rect(0, 58, W, 28, "#061e2b", alpha * 0.72);
    rect(0, 82, W, 5, "#2f6872", alpha * 0.55);
    for (let x = drift - 40; x < W + 80; x += 96) {
      rect(x, 58, 16, 72, "#082634", alpha * 0.82);
      rect(x + 4, 62, 5, 64, "#35727a", alpha * 0.6);
      rect(x - 5, 118, 28, 8, "#041720", alpha * 0.88);
      rect(x, 121, 18, 3, "#5c9aa0", alpha * 0.52);
    }

    const grateY = 452;
    rect(0, grateY, W, 52, "#031720", alpha * 0.28);
    for (let x = drift; x < W + 48; x += 36) {
      rect(x, grateY + 12, 22, 4, "#2d6870", alpha * 0.46);
      rect(x + 8, grateY + 16, 4, 24, "#16434e", alpha * 0.42);
    }

    if (!reducedMotion) {
      const pulse = 0.45 + Math.sin(tick * 0.003) * 0.12;
      rect(W - 38, 104, 11, 11, "#79d4c0", alpha * pulse);
      rect(W - 35, 107, 5, 5, "#e7fff1", alpha * pulse);
    }
  }

  function drawBubbleCorridor(tick, alpha, camera) {
    const drift = ((camera * 0.12) % 120 + 120) % 120;
    rect(0, 58, W, 16, "#0b4256", alpha * 0.42);
    rect(0, 74, W, 4, "#5fc5d4", alpha * 0.34);

    for (let x = -drift; x < W + 120; x += 120) {
      rect(x + 28, 474, 50, 30, "#082835", alpha * 0.6);
      rect(x + 34, 469, 38, 7, "#347e84", alpha * 0.58);
      rect(x + 43, 463, 20, 6, "#78c9c5", alpha * 0.5);
      for (let i = 0; i < 4; i += 1) {
        const rise = reducedMotion ? i * 64 : (tick * (0.018 + i * 0.002) + i * 67 + x * 0.21) % 360;
        const bx = x + 45 + (i % 2) * 18;
        const by = 454 - rise;
        if (by > 78 && by < 468) pixelBubble(bx, by, 8 + (i % 3) * 2, alpha * 0.62);
      }
    }

    rect(8, 96, 8, 330, "#1d6071", alpha * 0.25);
    rect(W - 16, 96, 8, 330, "#1d6071", alpha * 0.25);
  }

  function drawFissure(tick, alpha, camera) {
    const shift = ((camera * 0.05) % 52 + 52) % 52;
    const rockDark = "#071a27";
    const rockMid = "#153746";
    const rockEdge = "#32606a";

    for (let x = -shift - 32; x < W + 40; x += 52) {
      const depth = 18 + ((Math.floor((x + shift) / 52) % 3 + 3) % 3) * 10;
      rect(x, 58, 44, depth, rockDark, alpha * 0.84);
      rect(x + 6, 58 + depth - 5, 31, 5, rockMid, alpha * 0.7);
      rect(x + 11, 58 + depth, 17, 4, rockEdge, alpha * 0.48);

      const bottomH = 20 + ((Math.floor((x + shift) / 52 + 1) % 4 + 4) % 4) * 7;
      rect(x - 4, 505 - bottomH, 48, bottomH, rockDark, alpha * 0.76);
      rect(x + 3, 505 - bottomH, 34, 5, rockEdge, alpha * 0.44);
    }

    const flow = reducedMotion ? 0 : (tick * 0.09) % 72;
    for (let y = 118; y < 440; y += 74) {
      for (let x = -72 + flow; x < W + 72; x += 72) {
        rect(x, y, 18, 4, "#71d7df", alpha * 0.21);
        rect(x + 18, y - 5, 11, 4, "#71d7df", alpha * 0.16);
      }
    }

    rect(0, 58, 18, H - 113, "#03121d", alpha * 0.28);
    rect(W - 18, 58, 18, H - 113, "#03121d", alpha * 0.28);
  }

  function shellCluster(x, y, flip, alpha, pulse) {
    const stemX = flip ? x - 28 : x;
    const midX = flip ? x - 24 : x + 4;
    const innerX = flip ? x - 20 : x + 8;
    const pearlX = flip ? x - 17 : x + 11;
    rect(stemX, y + 18, 28, 6, "#254c4f", alpha * 0.68);
    rect(midX, y + 10, 20, 8, "#8a6ca0", alpha * pulse);
    rect(innerX, y + 3, 12, 7, "#d0a0c2", alpha * pulse);
    rect(pearlX, y, 6, 4, "#f0cfca", alpha * pulse);
  }

  function drawGrotto(tick, alpha, camera) {
    const pulse = reducedMotion ? 0.72 : 0.68 + Math.sin(tick * 0.0028) * 0.12;
    const drift = ((camera * 0.045) % 116 + 116) % 116;

    rect(0, 58, W, 18, "#102536", alpha * 0.56);
    for (let x = -drift - 40; x < W + 120; x += 116) {
      rect(x, 58, 78, 20, "#142f3b", alpha * 0.68);
      rect(x + 10, 76, 58, 7, "#315960", alpha * 0.48);
      shellCluster(x + 26, 84, false, alpha, pulse);
    }

    for (let y = 118; y < 430; y += 92) {
      shellCluster(10, y, false, alpha * 0.78, pulse);
      shellCluster(W - 10, y + 36, true, alpha * 0.78, pulse);
    }

    rect(0, 468, W, 36, "#08202c", alpha * 0.42);
    for (let x = 24 - drift * 0.2; x < W; x += 82) {
      rect(x, 475, 8, 29, "#25584e", alpha * 0.55);
      rect(x + 7, 483, 7, 21, "#4f8370", alpha * 0.46);
      rect(x + 3, 469, 5, 9, "#97c68f", alpha * pulse);
    }
  }

  function gauge(x, y, alpha, pressure) {
    rect(x, y, 48, 34, "#031824", alpha * 0.88);
    rect(x + 4, y + 4, 40, 26, "#183c4b", alpha * 0.86);
    rect(x + 8, y + 8, 32, 4, "#74cbd0", alpha * 0.5);
    const bars = 1 + Math.round(clamp(pressure, 0, 1) * 3);
    for (let i = 0; i < 4; i += 1) {
      rect(x + 9 + i * 8, y + 18, 5, 7, i < bars ? (bars >= 4 ? "#efb24f" : "#73d2b5") : "#0a2634", alpha * 0.9);
    }
  }

  function drawReservoir(tick, alpha, camera, debug) {
    const drift = -((camera * 0.065) % 132);
    const pressure = clamp(((debug.hero?.x ?? 4350) - 4350) / 1100, 0, 1);

    rect(0, 58, W, 22, "#04141f", alpha * 0.82);
    rect(0, 80, W, 6, "#35636b", alpha * 0.62);
    hazardStripe(0, 88, W, alpha * (0.36 + pressure * 0.2));

    for (let x = drift - 60; x < W + 150; x += 132) {
      rect(x, 58, 22, 118, "#041b28", alpha * 0.82);
      rect(x + 5, 62, 8, 108, "#315e67", alpha * 0.66);
      rect(x - 7, 148, 36, 10, "#082331", alpha * 0.86);
      rect(x, 151, 22, 4, "#5b8f93", alpha * 0.54);
    }

    for (let x = 18 - drift * 0.25; x < W; x += 148) gauge(x, 112, alpha, pressure);

    rect(0, 458, W, 46, "#031822", alpha * 0.46);
    for (let x = drift; x < W + 132; x += 132) {
      rect(x + 34, 462, 54, 8, "#315e67", alpha * 0.58);
      rect(x + 28, 470, 66, 8, "#061f2c", alpha * 0.7);
      rect(x + 43, 478, 36, 26, "#123d49", alpha * 0.5);
    }

    if (!reducedMotion) {
      const warning = 0.42 + Math.sin(tick * 0.006) * 0.18;
      rect(20, 96, 7, 7, "#ffcf62", alpha * warning);
      rect(W - 27, 96, 7, 7, "#ffcf62", alpha * warning);
    }
  }

  function drawZone(key, tick, alpha, camera, debug) {
    if (alpha <= 0.001) return;
    if (key === "canal") drawCanal(tick, alpha, camera);
    else if (key === "bubbles") drawBubbleCorridor(tick, alpha, camera);
    else if (key === "fissure") drawFissure(tick, alpha, camera);
    else if (key === "grotto") drawGrotto(tick, alpha, camera);
    else drawReservoir(tick, alpha, camera, debug);
  }

  function draw(tick) {
    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    if (!debug || debug.mode !== "play") {
      previousMode = debug?.mode ?? null;
      previousTick = tick;
      requestAnimationFrame(draw);
      return;
    }

    const heroX = debug.hero?.x ?? 0;
    const camera = cameraFor(debug, tick);
    const zone = zoneAt(heroX);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawZone(zone.key, tick, 1 - zone.blend * 0.72, camera, debug);
    if (zone.next && zone.blend > 0) drawZone(zone.next, tick, zone.blend * 0.72, camera, debug);
    ctx.restore();

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();