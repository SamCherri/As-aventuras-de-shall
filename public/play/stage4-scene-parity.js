(() => {
  "use strict";

  /*
   * Fase 4 — landmarks ambientais alinhados às Fases 1–3.
   *
   * Nas fases-base, estruturas grandes usam a mesma linguagem de material do
   * cenário principal e entram antes da gameplay. A Fase 4 já tinha seis marcos
   * importantes, mas eles ainda eram desenhados quase inteiramente com fillRect,
   * o que criava uma segunda estética procedural por cima do atlas aquático.
   *
   * Este passe mantém os mesmos marcos, posições, labels e watcher do Água
   * pOtávio, porém reconstrói a arquitetura com tiles NATIVOS do atlas oficial
   * (pipe, caveWall, arenaFloor, cracked e reef). Pequenos retângulos continuam
   * apenas onde as Fases 1–3 também usam pixelRect: placas, luzes e detalhes.
   * O antigo edgeReef uniforme foi removido porque o foreground regional já é o
   * responsável pelo plano frontal de cada microambiente.
   *
   * A camada é exclusivamente visual: não escreve em física, hitboxes, HP, dano,
   * correntezas, IA, controles, rotas ou timers de gameplay.
   */

  const canvas = document.querySelector("#stage4-canvas");
  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!canvas || !proto || proto.__shallStage4SceneParityInstalled) return;

  const ctx = canvas.getContext("2d");
  const previousDrawImage = proto.drawImage;
  const W = canvas.width;
  const WORLD_END = 6100;
  const BOSS_START = 5450;
  const ARENA_LEFT = 5580;

  const FAR = { sx: 0, sy: 0, sw: 133, sh: 44 };
  const MID = { sx: 0, sy: 46, sw: 133, sh: 44 };
  const ATLAS = {
    tiles: [0, 138, 80, 60],
    potavio: [218, 0, 80, 60],
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
  const POTAVIO = {
    idleA: [8, 4, 52, 84],
    idleB: [84, 7, 46, 81],
    aim: [243, 10, 49, 78],
    sneeze: [242, 87, 76, 80],
  };

  const props = [
    { x: 760, kind: "support", label: "CANAL 04", variant: 0 },
    { x: 1690, kind: "pipe", label: "FLUXO", variant: 1 },
    { x: 2860, kind: "support", label: "GRUTA", variant: 2 },
    { x: 3970, kind: "pipe", label: "MEXILHÃO", variant: 3 },
    { x: 4900, kind: "support", label: "PRESSÃO", variant: 4 },
    { x: 5480, kind: "gate", label: "RESERVATÓRIO", variant: 5 },
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  let atlasImage = null;
  let sceneDrawnThisFrame = false;

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

  function rect(x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function sign(x, y, label, accent = "#155f73") {
    const width = Math.max(88, label.length * 8 + 22);
    rect(x + 4, y + 4, width, 30, "#020b18", 0.78);
    rect(x, y, width, 30, "#061426");
    rect(x + 3, y + 3, width - 6, 24, accent);
    rect(x + 7, y + 6, width - 14, 3, "#9bf2ec", 0.62);
    rect(x + 7, y + 23, width - 14, 3, "#031522", 0.7);
    ctx.save();
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#e5fbef";
    ctx.shadowColor = "#03101c";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(label, Math.round(x + width / 2), Math.round(y + 16));
    ctx.restore();
  }

  function nativeBeam(x, y, width, alpha = 1, cracked = false) {
    const step = 42;
    for (let px = x; px < x + width; px += step) {
      const w = Math.min(step + 2, x + width - px);
      tile(cracked ? "cracked" : "arenaFloor", px, y, w, 28, alpha, Math.floor((px - x) / step) % 2 === 1);
    }
  }

  function nativeColumn(x, top, bottom, width, variant = 0, alpha = 1) {
    const names = variant % 3 === 0
      ? ["caveWall", "arenaFloor", "caveWall"]
      : variant % 3 === 1
        ? ["arenaFloor", "pipe", "arenaFloor"]
        : ["cracked", "caveWall", "arenaFloor"];
    let y = top;
    let i = 0;
    while (y < bottom) {
      const h = Math.min(42, bottom - y);
      const name = names[i % names.length];
      tile(name, x, y, width, h + 2, alpha * (0.9 - (i % 2) * 0.06), (i + variant) % 2 === 1);
      y += 38;
      i += 1;
    }
  }

  function support(screenX, label, variant) {
    const x = Math.round(screenX);
    const width = 50;
    const accent = variant % 2 ? "#246d72" : "#155f73";

    nativeColumn(x, 58, 172, width, variant, 0.88);
    nativeBeam(x - 14, 58, width + 28, 0.88, variant % 2 === 1);
    tile("pipe", x + width - 13, 72, 25, 92, 0.72, variant % 2 === 0);

    nativeColumn(x + 7, 405, 505, width - 14, variant + 1, 0.82);
    nativeBeam(x - 9, 476, width + 18, 0.78, variant % 2 === 0);
    tile("reefTop", x - 5, 459, width + 10, 24, 0.34, variant % 2 === 1);

    sign(x - 22, 184, label, accent);
  }

  function pipeLandmark(screenX, label, variant) {
    const x = Math.round(screenX);
    const accent = variant % 2 ? "#266b67" : "#1f6678";

    tile("pipe", x, 58, 34, 108, 0.9, false);
    tile("pipe", x + 3, 148, 30, 50, 0.72, true);
    nativeBeam(x - 10, 86, 54, 0.72, false);

    tile("pipe", x - 2, 396, 36, 109, 0.84, true);
    nativeBeam(x - 14, 456, 62, 0.76, variant % 2 === 1);
    tile("bubbleVent", x - 8, 474, 50, 31, 0.36, variant % 2 === 0);

    sign(x - 34, 174, label, accent);
  }

  function gate(screenX, label, variant) {
    const x = Math.round(screenX);
    const left = x - 40;
    const right = x + 54;
    const columnW = 28;

    nativeColumn(left, 58, 505, columnW, variant, 0.94);
    nativeColumn(right, 58, 505, columnW, variant + 1, 0.94);
    nativeBeam(left - 8, 58, right - left + columnW + 16, 0.96, true);
    nativeBeam(left - 2, 478, right - left + columnW + 4, 0.82, false);

    tile("pipe", left + 3, 82, 22, 124, 0.7, false);
    tile("pipe", right + 3, 82, 22, 124, 0.7, true);
    tile("cracked", left - 4, 430, 38, 48, 0.52, false);
    tile("cracked", right - 6, 430, 38, 48, 0.52, true);

    sign(x - 38, 88, label, "#2e6875");
    rect(left + 7, 68, 7, 7, "#ffd46b", 0.84);
    rect(right + 14, 68, 7, 7, "#ffd46b", 0.84);
  }

  function drawWatcherSprite(source, x, y, w, h, alpha) {
    if (!atlasImage) return false;
    const slice = atlasSource("potavio", source);
    if (!slice) return false;
    const [sx, sy, sw, sh] = slice;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.filter = "saturate(1.12) contrast(1.06) brightness(.82)";
    previousDrawImage.call(ctx, atlasImage, sx, sy, sw, sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
  }

  function potavioWatcher(debug, tick) {
    if (!atlasImage || debug.boss?.active) return;
    const heroX = debug.hero?.x ?? 0;
    const start = 620;
    const end = BOSS_START - 180;
    if (heroX < start || heroX > end) return;

    const progress = clamp((heroX - start) / (end - start), 0, 1);
    const idleFrame = Math.floor(tick * 0.0024) % 2 ? POTAVIO.idleA : POTAVIO.idleB;
    const frame = progress < 0.38
      ? idleFrame
      : progress < 0.72
        ? POTAVIO.aim
        : (Math.floor(tick * 0.004) % 2 ? POTAVIO.sneeze : POTAVIO.aim);

    const watcherW = 238 + progress * 48;
    const watcherH = 324 + progress * 54;
    const watcherX = W / 2 - watcherW / 2 + Math.sin(tick * 0.0011) * 6;
    const watcherY = -86 + Math.sin(tick * 0.0017) * 4;
    const apertureX = 66;
    const apertureY = 58;
    const apertureW = W - 132;
    const apertureH = 202;

    ctx.save();
    ctx.beginPath();
    ctx.rect(apertureX, apertureY, apertureW, apertureH);
    ctx.clip();

    const aura = ctx.createRadialGradient(W / 2, 126, 26, W / 2, 126, 210);
    aura.addColorStop(0, `rgba(87,229,243,${0.06 + progress * 0.12})`);
    aura.addColorStop(1, "rgba(10,61,87,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(apertureX, apertureY, apertureW, apertureH);

    drawWatcherSprite(frame, watcherX, watcherY, watcherW, watcherH, 0.34 + progress * 0.28);
    rect(apertureX, apertureY, apertureW, apertureH, "#063451", 0.12);
    ctx.restore();

    // A janela/oclusão também usa materiais do atlas em vez de uma moldura lisa.
    nativeBeam(apertureX - 14, apertureY - 10, apertureW + 28, 0.88, false);
    nativeBeam(apertureX - 14, apertureY + apertureH - 4, apertureW + 28, 0.84, true);
    nativeColumn(apertureX - 14, apertureY - 2, apertureY + apertureH + 8, 18, 1, 0.86);
    nativeColumn(apertureX + apertureW - 4, apertureY - 2, apertureY + apertureH + 8, 18, 2, 0.86);

    for (let x = apertureX + 42; x < apertureX + apertureW - 20; x += 86) {
      tile("pipe", x, apertureY + 2, 16, apertureH, 0.44, Math.floor(x / 86) % 2 === 0);
    }

    if (progress > 0.62) {
      const marks = progress > 0.84 ? 3 : 2;
      for (let i = 0; i < marks; i += 1) {
        const mx = W / 2 - 44 + i * 42;
        const my = 78 + (i % 2) * 12;
        rect(mx, my, 5, 21, progress > 0.84 ? "#fff0a2" : "#7de6eb", 0.8);
        rect(mx + 2, my - 8, 4, 5, progress > 0.84 ? "#fff0a2" : "#7de6eb", 0.72);
      }
    }
  }

  function drawSceneFrame() {
    const debug = typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
    if (!debug || debug.mode !== "play" || !atlasImage) return;

    const tick = performance.now();
    const camera = cameraFor(debug);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    potavioWatcher(debug, tick);

    for (const prop of props) {
      const sx = prop.x - camera;
      if (sx < -170 || sx > W + 170) continue;
      if (prop.kind === "support") support(sx, prop.label, prop.variant);
      else if (prop.kind === "pipe") pipeLandmark(sx, prop.label, prop.variant);
      else gate(sx, prop.label, prop.variant);
    }

    ctx.restore();
  }

  function sceneParityDrawImage(...args) {
    const isFar = this.canvas?.id === "stage4-canvas" && matchesSource(args, FAR);
    const isMid = this.canvas?.id === "stage4-canvas" && matchesSource(args, MID);

    if ((isFar || isMid) && args[0] instanceof HTMLImageElement) atlasImage = args[0];

    if (isFar) {
      const dx = Number(args[5]);
      const dw = Number(args[7]);
      if (Number.isFinite(dx) && Number.isFinite(dw) && dx <= -dw) {
        sceneDrawnThisFrame = false;
      }
    }

    const result = previousDrawImage.apply(this, args);

    if (isMid && !sceneDrawnThisFrame) {
      const dx = Number(args[5]);
      if (Number.isFinite(dx) && dx >= W) {
        sceneDrawnThisFrame = true;
        drawSceneFrame();
      }
    }

    return result;
  }

  sceneParityDrawImage.__shallStage4SceneParity = true;
  proto.drawImage = sceneParityDrawImage;
  proto.__shallStage4SceneParityInstalled = true;

  window.__shallStage4SceneParity = Object.freeze({
    landmarkCount: props.length,
    materialLanguage: "native-atlas-landmarks",
    usesNativeTiles: true,
    uniformEdgeReefRemoved: true,
    gameplayWrites: false,
  });
})();
