(() => {
  "use strict";

  /*
   * Fase 4 — microambientes com materiais do atlas nativo.
   *
   * Fases 1–3 constroem cenário principalmente com arte canônica (PNGs/tiles),
   * não com grandes massas de retângulos CSS-like. Este passe mantém Canal,
   * Bolhas, Fenda, Gruta e Reservatório distintos, mas troca a maior parte das
   * superfícies procedurais por reef/cave/pipe/vent/coral/arena tiles que já
   * pertencem ao pacote oficial da Fase 4. Assim a fase preserva sua temática
   * aquática sem parecer um segundo sistema de arte sobreposto ao jogo.
   *
   * A camada continua sendo desenhada no midground, atrás de gameplay. Ela não
   * escreve em física, hitboxes, IA, HP, dano, correntezas, controles ou rotas.
   */

  const canvas = document.querySelector("#stage4-canvas");
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!canvas || !proto || proto.__shallStage4ZoneParityInstalled) return;

  const ctx = canvas.getContext("2d");
  const previousDrawImage = proto.drawImage;
  const W = canvas.width;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const FAR = { sx: 0, sy: 0, sw: 133, sh: 44 };
  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };
  const ATLAS = {
    tiles: [0, 138, 80, 60],
    vfx: [82, 138, 80, 60],
  };
  const TILE = {
    reefTop: [0, 0, 40, 30],
    reefMiddle: [0, 32, 40, 32],
    reefBottom: [0, 64, 40, 32],
    caveWall: [40, 0, 40, 32],
    coral: [80, 0, 40, 32],
    pipe: [120, 64, 40, 32],
    bubbleVent: [160, 64, 40, 32],
    arenaFloor: [200, 64, 40, 32],
    cracked: [240, 64, 40, 32],
  };
  const VFX = {
    bubble: [0, 0, 80, 60],
  };

  const ZONES = [
    { start: 0, end: 900, key: "canal" },
    { start: 900, end: 2050, key: "bubbles" },
    { start: 2050, end: 3250, key: "fissure" },
    { start: 3250, end: 4350, key: "grotto" },
    { start: 4350, end: 5450, key: "reservoir" },
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let zoneDrawnThisFrame = false;
  let atlasImage = null;

  function matchesSource(args, source) {
    return args.length === 9 &&
      args[1] === source.sx && args[2] === source.sy &&
      args[3] === source.sw && args[4] === source.sh;
  }

  function cameraFor(debug) {
    const parity = typeof window.__shallStage4CameraParity === "function"
      ? window.__shallStage4CameraParity()
      : null;
    if (Number.isFinite(parity?.camera)) return parity.camera;
    const heroX = debug?.hero?.x ?? 0;
    return clamp(debug?.boss?.active ? ARENA_LEFT : heroX - W * 0.3, 0, WORLD_END - W);
  }

  function zoneAt(heroX) {
    if (heroX >= 5450) return { key: "reservoir", local: 1, next: null, blend: 0 };
    const index = ZONES.findIndex((zone) => heroX >= zone.start && heroX < zone.end);
    const safeIndex = Math.max(0, index);
    const zone = ZONES[safeIndex];
    const local = clamp((heroX - zone.start) / Math.max(1, zone.end - zone.start), 0, 1);
    const blend = local > 0.84 && safeIndex < ZONES.length - 1 ? (local - 0.84) / 0.16 : 0;
    return {
      key: zone.key,
      local,
      next: ZONES[safeIndex + 1]?.key ?? null,
      blend: clamp(blend, 0, 1),
    };
  }

  function atlasSource(regionName, local) {
    const region = ATLAS[regionName];
    if (!region) return null;
    const [rx, ry] = region;
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [rx + sx, ry + sy, ex - sx, ey - sy];
  }

  function drawAtlas(regionName, local, x, y, w, h, alpha = 1, flipX = false) {
    if (!atlasImage || alpha <= 0.001 || w <= 0 || h <= 0) return false;
    const source = atlasSource(regionName, local);
    if (!source) return false;
    const [sx, sy, sw, sh] = source;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(Math.round(x + w), Math.round(y));
      ctx.scale(-1, 1);
      previousDrawImage.call(ctx, atlasImage, sx, sy, sw, sh, 0, 0, Math.round(w), Math.round(h));
    } else {
      previousDrawImage.call(ctx, atlasImage, sx, sy, sw, sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }
    ctx.restore();
    return true;
  }

  function tile(name, x, y, w, h, alpha = 1, flipX = false) {
    return drawAtlas("tiles", TILE[name], x, y, w, h, alpha, flipX);
  }

  function vfx(name, x, y, w, h, alpha = 1, flipX = false) {
    return drawAtlas("vfx", VFX[name], x, y, w, h, alpha, flipX);
  }

  function rect(x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function repeatTiles(name, startX, endX, y, step, w, h, alpha, phase = 0) {
    for (let x = startX + phase; x < endX; x += step) {
      tile(name, x, y, w, h, alpha, Math.floor((x - phase) / step) % 2 !== 0);
    }
  }

  function drawCanal(tick, alpha, camera) {
    const drift = -((camera * 0.09) % 96);
    repeatTiles("arenaFloor", drift - 96, W + 96, 58, 64, 66, 42, alpha * 0.66);
    repeatTiles("arenaFloor", drift - 96, W + 96, 462, 64, 66, 42, alpha * 0.48, 24);

    for (let x = drift - 24; x < W + 96; x += 96) {
      tile("pipe", x, 82, 38, 104, alpha * 0.78);
      tile("pipe", x + 4, 400, 34, 104, alpha * 0.62, true);
      tile("caveWall", x - 10, 170, 58, 34, alpha * 0.46, true);
    }

    if (!reducedMotion) {
      const pulse = 0.42 + Math.sin(tick * 0.003) * 0.14;
      rect(W - 34, 104, 8, 8, "#8ee6ce", alpha * pulse);
      rect(W - 32, 106, 4, 4, "#effff6", alpha * pulse);
    }
  }

  function drawBubbleCorridor(tick, alpha, camera) {
    const drift = -((camera * 0.13) % 120);
    repeatTiles("caveWall", drift - 120, W + 120, 58, 80, 82, 36, alpha * 0.42);

    for (let x = drift - 20; x < W + 140; x += 120) {
      tile("bubbleVent", x + 24, 454, 70, 50, alpha * 0.82);
      tile("reefTop", x + 12, 432, 94, 30, alpha * 0.44, true);
      for (let i = 0; i < 4; i += 1) {
        const rise = reducedMotion ? i * 72 : (tick * (0.018 + i * 0.002) + i * 67 + x * 0.18) % 360;
        const by = 444 - rise;
        if (by > 82 && by < 448) {
          vfx("bubble", x + 38 + (i % 2) * 18, by, 38 + (i % 3) * 7, 28 + (i % 2) * 5, alpha * 0.46, i % 2 === 1);
        }
      }
    }
  }

  function drawFissure(tick, alpha, camera) {
    const shift = -((camera * 0.055) % 72);
    for (let x = shift - 72; x < W + 80; x += 72) {
      const step = Math.abs(Math.floor((x - shift) / 72)) % 4;
      const topH = 42 + step * 10;
      const bottomH = 38 + ((step + 2) % 4) * 9;
      tile(step % 2 ? "cracked" : "reefBottom", x, 58, 76, topH, alpha * 0.76, step % 2 === 1);
      tile("reefTop", x - 4, 58 + topH - 10, 84, 18, alpha * 0.62, step % 2 === 0);
      tile(step % 3 ? "reefMiddle" : "cracked", x - 2, 505 - bottomH, 78, bottomH, alpha * 0.68, step % 2 === 0);
      tile("reefTop", x - 6, 505 - bottomH - 6, 86, 16, alpha * 0.58, step % 2 === 1);
    }

    if (!reducedMotion) {
      const flow = (tick * 0.08) % 92;
      for (let y = 140; y < 430; y += 88) {
        vfx("bubble", -48 + flow, y, 44, 28, alpha * 0.16);
        vfx("bubble", 168 + flow, y + 24, 36, 24, alpha * 0.12, true);
        vfx("bubble", 360 + flow, y - 18, 32, 22, alpha * 0.1);
      }
    }
  }

  function drawGrotto(tick, alpha, camera) {
    const drift = -((camera * 0.05) % 108);
    repeatTiles("reefTop", drift - 108, W + 108, 58, 72, 76, 34, alpha * 0.58);
    repeatTiles("reefMiddle", drift - 108, W + 108, 470, 72, 76, 34, alpha * 0.44, 28);

    for (let x = drift - 32; x < W + 110; x += 108) {
      tile("coral", x + 18, 90, 62, 50, alpha * 0.74, Math.floor(x / 108) % 2 !== 0);
      tile("coral", x + 6, 420, 72, 58, alpha * 0.66, Math.floor(x / 108) % 2 === 0);
      const pulse = reducedMotion ? 0.62 : 0.5 + Math.sin(tick * 0.0027 + x * 0.04) * 0.16;
      rect(x + 52, 150, 5, 5, "#a7f1cf", alpha * pulse);
      rect(x + 25, 380, 4, 4, "#d7b8ee", alpha * pulse * 0.9);
    }
  }

  function hazardStripe(x, y, width, alpha) {
    const cell = 20;
    for (let px = 0; px < width; px += cell) {
      rect(x + px, y, Math.min(11, width - px), 6, px / cell % 2 ? "#d18a32" : "#ffe071", alpha);
    }
    rect(x, y + 6, width, 3, "#071925", alpha * 0.88);
  }

  function gauge(x, y, alpha, pressure) {
    tile("arenaFloor", x, y, 54, 36, alpha * 0.72);
    rect(x + 8, y + 8, 38, 18, "#102f3d", alpha * 0.82);
    const bars = 1 + Math.round(clamp(pressure, 0, 1) * 3);
    for (let i = 0; i < 4; i += 1) {
      rect(x + 11 + i * 8, y + 15, 5, 7, i < bars ? (bars >= 4 ? "#efb24f" : "#73d2b5") : "#0a2634", alpha * 0.92);
    }
  }

  function drawReservoir(tick, alpha, camera, debug) {
    const drift = -((camera * 0.075) % 132);
    const pressure = clamp(((debug.hero?.x ?? 4350) - 4350) / 1100, 0, 1);

    repeatTiles("arenaFloor", drift - 132, W + 132, 58, 66, 68, 38, alpha * 0.8);
    hazardStripe(0, 92, W, alpha * (0.38 + pressure * 0.24));

    for (let x = drift - 40; x < W + 150; x += 132) {
      tile("pipe", x + 8, 92, 38, 106, alpha * 0.82);
      tile("pipe", x + 16, 398, 34, 106, alpha * 0.7, true);
      tile("cracked", x - 8, 184, 72, 34, alpha * 0.38, true);
    }

    for (let x = 18 - drift * 0.25; x < W; x += 148) gauge(x, 118, alpha, pressure);
    repeatTiles("arenaFloor", drift - 132, W + 132, 466, 66, 68, 38, alpha * 0.54, 22);

    if (!reducedMotion) {
      const warning = 0.42 + Math.sin(tick * 0.006) * 0.18;
      rect(20, 104, 7, 7, "#ffcf62", alpha * warning);
      rect(W - 27, 104, 7, 7, "#ffcf62", alpha * warning);
    }
  }

  function drawZone(key, tick, alpha, camera, debug) {
    if (alpha <= 0.001 || !atlasImage) return;
    if (key === "canal") drawCanal(tick, alpha, camera);
    else if (key === "bubbles") drawBubbleCorridor(tick, alpha, camera);
    else if (key === "fissure") drawFissure(tick, alpha, camera);
    else if (key === "grotto") drawGrotto(tick, alpha, camera);
    else drawReservoir(tick, alpha, camera, debug);
  }

  function drawZoneFrame() {
    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    if (!debug || debug.mode !== "play" || !atlasImage) return;

    const heroX = debug.hero?.x ?? 0;
    const camera = cameraFor(debug);
    const zone = zoneAt(heroX);
    const tick = performance.now();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    drawZone(zone.key, tick, 1 - zone.blend * 0.72, camera, debug);
    if (zone.next && zone.blend > 0) drawZone(zone.next, tick, zone.blend * 0.72, camera, debug);
    ctx.restore();
  }

  function zoneParityDrawImage(...args) {
    const isFar = this.canvas?.id === "stage4-canvas" && matchesSource(args, FAR);
    const isMid = this.canvas?.id === "stage4-canvas" && matchesSource(args, MID);

    if ((isFar || isMid) && args[0] instanceof HTMLImageElement) atlasImage = args[0];

    if (isFar) {
      const dx = Number(args[5]);
      const dw = Number(args[7]);
      if (Number.isFinite(dx) && Number.isFinite(dw) && dx <= -dw) zoneDrawnThisFrame = false;
    }

    const result = previousDrawImage.apply(this, args);

    if (isMid && !zoneDrawnThisFrame) {
      const dx = Number(args[5]);
      if (Number.isFinite(dx) && dx >= W) {
        zoneDrawnThisFrame = true;
        drawZoneFrame();
      }
    }

    return result;
  }

  zoneParityDrawImage.__shallStage4ZoneParity = true;
  proto.drawImage = zoneParityDrawImage;
  proto.__shallStage4ZoneParityInstalled = true;
})();
