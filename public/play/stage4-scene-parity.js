(() => {
  "use strict";

  /*
   * Fase 4 — composição de cena alinhada às Fases 1–3.
   *
   * Nas fases-base, watcher, arquitetura e grandes oclusores entram no pipeline
   * antes de inimigos, projéteis e Shall. Esta camada usa o mesmo princípio:
   * injeta a composição ambiental logo após o midground nativo da Fase 4,
   * em vez de redesenhar tudo em um requestAnimationFrame independente sobre
   * a gameplay. Assim o cenário continua rico sem "lavar" personagens/ataques.
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

  const ART_PARTS = Array.from({ length: 14 }, (_, i) =>
    `./assets/stage4/art-atlas.b64.${String(i).padStart(2, "0")}.txt?v=40`
  );
  const POTAVIO_REGION = [218, 0, 80, 60];
  const POTAVIO = {
    idleA: [8, 4, 52, 84],
    idleB: [84, 7, 46, 81],
    aim: [243, 10, 49, 78],
    sneeze: [242, 87, 76, 80],
  };

  let watcherAtlas = null;
  let watcherArtReady = false;
  let sceneDrawnThisFrame = false;

  const props = [
    { x: 760, kind: "support", label: "CANAL 04" },
    { x: 1690, kind: "pipe", label: "FLUXO" },
    { x: 2860, kind: "support", label: "GRUTA" },
    { x: 3970, kind: "pipe", label: "MEXILHÃO" },
    { x: 4900, kind: "support", label: "PRESSÃO" },
    { x: 5480, kind: "gate", label: "RESERVATÓRIO" },
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

  async function loadWatcherArt() {
    try {
      const chunks = await Promise.all(ART_PARTS.map(async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`asset ${response.status}: ${url}`);
        return (await response.text()).trim();
      }));
      const image = new Image();
      image.src = `data:image/png;base64,${chunks.join("")}`;
      if (image.decode) await image.decode();
      else await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      watcherAtlas = image;
      watcherArtReady = true;
    } catch (error) {
      console.warn("Stage 4 watcher art unavailable:", error);
    }
  }

  function atlasSource(local) {
    const [rx, ry] = POTAVIO_REGION;
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [rx + sx, ry + sy, ex - sx, ey - sy];
  }

  function rect(x, y, w, h, color, alpha = 1) {
    if (w <= 0 || h <= 0 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function outlineRect(x, y, w, h, fill, edge, highlight) {
    rect(x, y, w, h, edge);
    rect(x + 4, y + 4, w - 8, h - 8, fill);
    rect(x + 8, y + 8, Math.max(4, w - 16), 4, highlight, 0.75);
    rect(x + w - 8, y + 8, 4, Math.max(4, h - 16), "#031727", 0.72);
  }

  function sign(x, y, label) {
    const width = Math.max(88, label.length * 8 + 22);
    rect(x + 4, y + 4, width, 30, "#020b18", 0.78);
    rect(x, y, width, 30, "#061426");
    rect(x + 3, y + 3, width - 6, 24, "#155f73");
    rect(x + 7, y + 6, width - 14, 3, "#7de6eb", 0.72);
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

  function rivets(x, y, w, h) {
    for (let py = y + 14; py < y + h - 10; py += 30) {
      rect(x + 8, py, 4, 4, "#8ddbe0", 0.68);
      rect(x + w - 12, py, 4, 4, "#082f42", 0.9);
    }
  }

  function support(screenX, label) {
    const x = Math.round(screenX);
    const width = 46;
    outlineRect(x, 56, width, 116, "#164a57", "#052231", "#3c8790");
    rivets(x, 56, width, 116);
    rect(x - 14, 56, width + 28, 12, "#062431");
    rect(x - 9, 60, width + 18, 5, "#2d7380");

    outlineRect(x + 7, 406, width - 14, 98, "#153f4b", "#041c2b", "#347a83");
    rect(x - 8, 492, width + 16, 13, "#042132");
    rect(x - 2, 492, width + 4, 4, "#39818b", 0.75);

    sign(x - 22, 184, label);
  }

  function pipe(screenX, label) {
    const x = Math.round(screenX);
    rect(x, 58, 26, 102, "#052432");
    rect(x + 5, 58, 16, 102, "#27626a");
    rect(x + 8, 58, 5, 102, "#58a2a5", 0.75);
    rect(x - 8, 87, 42, 13, "#061d2b");
    rect(x - 4, 90, 34, 6, "#43838a");

    rect(x - 6, 420, 38, 84, "#041d2b");
    rect(x, 420, 26, 84, "#24565f");
    rect(x + 5, 420, 5, 84, "#4d9399", 0.72);
    rect(x - 14, 462, 54, 12, "#031824");
    rect(x - 8, 465, 42, 5, "#3e7d84");

    sign(x - 34, 174, label);
  }

  function gate(screenX, label) {
    const x = Math.round(screenX);
    rect(x - 34, 58, 18, 446, "#031824", 0.94);
    rect(x - 29, 58, 8, 446, "#235460", 0.92);
    rect(x + 52, 58, 18, 446, "#031824", 0.94);
    rect(x + 57, 58, 8, 446, "#235460", 0.92);
    rect(x - 40, 58, 116, 18, "#031824");
    rect(x - 34, 62, 104, 8, "#2e6c77");
    sign(x - 38, 88, label);
  }

  function drawWatcherSprite(source, x, y, w, h, alpha) {
    if (!watcherArtReady || !watcherAtlas) return false;
    const [sx, sy, sw, sh] = atlasSource(source);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.filter = "saturate(1.12) contrast(1.06) brightness(.82)";
    ctx.drawImage(watcherAtlas, sx, sy, sw, sh, Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
    return true;
  }

  function potavioWatcher(debug, tick) {
    if (!watcherArtReady || debug.boss?.active) return;
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

    rect(apertureX - 14, apertureY - 10, apertureW + 28, 14, "#031824", 0.96);
    rect(apertureX - 14, apertureY + apertureH - 4, apertureW + 28, 16, "#031824", 0.96);
    rect(apertureX - 14, apertureY - 2, 14, apertureH + 8, "#041d2b", 0.96);
    rect(apertureX + apertureW, apertureY - 2, 14, apertureH + 8, "#041d2b", 0.96);
    rect(apertureX - 8, apertureY - 4, apertureW + 16, 4, "#39818b", 0.78);
    rect(apertureX - 8, apertureY + apertureH + 3, apertureW + 16, 4, "#235d68", 0.72);

    for (let x = apertureX + 42; x < apertureX + apertureW - 20; x += 86) {
      rect(x, apertureY - 2, 7, apertureH + 8, "#062431", 0.82);
      rect(x + 2, apertureY + 2, 2, apertureH, "#4a9098", 0.55);
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

  function edgeReef() {
    // A moldura permanece nas margens, mas agora fica atrás da camada de gameplay.
    rect(0, 438, W, 66, "#031925", 0.18);
    for (let x = 8; x < W; x += 74) {
      const h = 18 + ((x / 74) % 3) * 8;
      rect(x, 504 - h, 9, h, "#0c4a4e", 0.6);
      rect(x + 9, 500 - h, 7, h + 4, "#176c67", 0.48);
      rect(x + 3, 486 - h, 4, 10, "#55a88d", 0.5);
    }
  }

  function drawSceneFrame() {
    const debug = typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
    if (!debug || debug.mode !== "play") return;

    const tick = performance.now();
    const camera = cameraFor(debug);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    potavioWatcher(debug, tick);

    for (const prop of props) {
      const sx = prop.x - camera;
      if (sx < -150 || sx > W + 150) continue;
      if (prop.kind === "support") support(sx, prop.label);
      else if (prop.kind === "pipe") pipe(sx, prop.label);
      else gate(sx, prop.label);
    }

    edgeReef();
    ctx.restore();
  }

  function sceneParityDrawImage(...args) {
    const isFar = this.canvas?.id === "stage4-canvas" && matchesSource(args, FAR);
    const isMid = this.canvas?.id === "stage4-canvas" && matchesSource(args, MID);

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

  loadWatcherArt();
})();
