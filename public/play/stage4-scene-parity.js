(() => {
  "use strict";

  const canvas = document.querySelector("#stage4-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_END = 6100;
  const ARENA_LEFT = 5580;

  const props = [
    { x: 760, kind: "support", label: "CANAL 04" },
    { x: 1690, kind: "pipe", label: "FLUXO" },
    { x: 2860, kind: "support", label: "GRUTA" },
    { x: 3970, kind: "pipe", label: "MEXILHÃO" },
    { x: 4900, kind: "support", label: "PRESSÃO" },
    { x: 5480, kind: "gate", label: "RESERVATÓRIO" },
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rect(x, y, w, h, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
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

  function edgeReef() {
    // Foreground edge framing analogous to the large occluders used in Fases 1–3,
    // but kept outside the central combat/readability corridor.
    rect(0, 438, 480, 66, "#031925", 0.18);
    for (let x = 8; x < W; x += 74) {
      const h = 18 + ((x / 74) % 3) * 8;
      rect(x, 504 - h, 9, h, "#0c4a4e", 0.6);
      rect(x + 9, 500 - h, 7, h + 4, "#176c67", 0.48);
      rect(x + 3, 486 - h, 4, 10, "#55a88d", 0.5);
    }
  }

  function draw() {
    const debug = typeof window.__shallStage4Debug === "function" ? window.__shallStage4Debug() : null;
    if (!debug || debug.mode !== "play") {
      requestAnimationFrame(draw);
      return;
    }

    const heroX = debug.hero?.x ?? 0;
    const bossActive = Boolean(debug.boss?.active);
    const camera = bossActive
      ? ARENA_LEFT
      : clamp(heroX - W * 0.3, 0, WORLD_END - W);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (const prop of props) {
      const sx = prop.x - camera;
      if (sx < -150 || sx > W + 150) continue;
      if (prop.kind === "support") support(sx, prop.label);
      else if (prop.kind === "pipe") pipe(sx, prop.label);
      else gate(sx, prop.label);
    }

    edgeReef();
    ctx.restore();
    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
