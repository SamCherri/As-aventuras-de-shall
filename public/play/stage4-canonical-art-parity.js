(() => {
  "use strict";

  /*
   * Fase 4 — paridade de identidade visual com Fases 1–3.
   *
   * As fases-base apresentam os personagens com arte canônica real no HUD e nas
   * telas de entrada. A Fase 4 ainda usava ícones CSS de concha/gota justamente
   * nos pontos mais visíveis. Este módulo reaproveita o atlas nativo da fase para
   * mostrar o Shall Mexilhãozinho e o Água pOtávio reais, sem tocar em gameplay.
   */

  const root = document.documentElement;
  const heroPortrait = document.querySelector("#stage4-hero-portrait-art");
  const potavioIntro = document.querySelector("#stage4-intro-potavio-art");
  const canonicalShall = document.querySelector(".stage4-intro-shall-canonical");
  if (!heroPortrait || !potavioIntro) return;

  const ART_PARTS = Array.from({ length: 14 }, (_, i) =>
    `./assets/stage4/art-atlas.b64.${String(i).padStart(2, "0")}.txt?v=40`
  );
  const REGION = {
    hero: { x: 137, y: 0 },
    potavio: { x: 218, y: 0 },
  };
  const FRAME = {
    heroIdle: [6, 27, 38, 74],
    potavioIdle: [8, 4, 52, 84],
  };
  const SCALE_PASSES = 2;

  function markCanonicalShallReady() {
    if (canonicalShall?.naturalWidth > 0) root.classList.add("stage4-intro-shall-art-ready");
  }
  if (canonicalShall) {
    if (canonicalShall.complete) markCanonicalShallReady();
    else canonicalShall.addEventListener("load", markCanonicalShallReady, { once: true });
  }

  function atlasSource(region, local) {
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [region.x + sx, region.y + sy, ex - sx, ey - sy];
  }

  function packPixels(imageData) {
    const source = imageData.data;
    const words = new Int32Array(imageData.width * imageData.height);
    for (let i = 0, p = 0; i < words.length; i += 1, p += 4) {
      if (source[p + 3] === 0) {
        words[i] = 0;
        continue;
      }
      words[i] = source[p] |
        (source[p + 1] << 8) |
        (source[p + 2] << 16) |
        (source[p + 3] << 24);
    }
    return words;
  }

  function unpackPixels(words, width, height) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, p = 0; i < words.length; i += 1, p += 4) {
      const value = words[i];
      data[p] = value & 0xff;
      data[p + 1] = (value >>> 8) & 0xff;
      data[p + 2] = (value >>> 16) & 0xff;
      data[p + 3] = (value >>> 24) & 0xff;
    }
    return new ImageData(data, width, height);
  }

  function scale2x(words, width, height) {
    const outWidth = width * 2;
    const outHeight = height * 2;
    const output = new Int32Array(outWidth * outHeight);

    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      const above = Math.max(0, y - 1) * width;
      const below = Math.min(height - 1, y + 1) * width;
      for (let x = 0; x < width; x += 1) {
        const p = words[row + x];
        const a = words[above + x];
        const b = words[row + Math.min(width - 1, x + 1)];
        const c = words[row + Math.max(0, x - 1)];
        const d = words[below + x];
        const e0 = c === a && c !== d && a !== b ? c : p;
        const e1 = a === b && a !== c && b !== d ? b : p;
        const e2 = d === c && d !== b && c !== a ? c : p;
        const e3 = b === d && b !== a && d !== c ? b : p;
        const ox = x * 2;
        const oy = y * 2;
        const out = oy * outWidth + ox;
        output[out] = e0;
        output[out + 1] = e1;
        output[out + outWidth] = e2;
        output[out + outWidth + 1] = e3;
      }
    }
    return { words: output, width: outWidth, height: outHeight };
  }

  function refineSprite(image, source) {
    const [sx, sy, sw, sh] = source;
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = Math.max(1, sw);
    sourceCanvas.height = Math.max(1, sh);
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) return null;
    sourceContext.imageSmoothingEnabled = false;
    sourceContext.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    let imageData;
    try {
      imageData = sourceContext.getImageData(0, 0, sw, sh);
    } catch {
      return null;
    }

    let scaled = { words: packPixels(imageData), width: sw, height: sh };
    for (let pass = 0; pass < SCALE_PASSES; pass += 1) {
      scaled = scale2x(scaled.words, scaled.width, scaled.height);
    }

    const refined = document.createElement("canvas");
    refined.width = scaled.width;
    refined.height = scaled.height;
    const context = refined.getContext("2d");
    if (!context) return null;
    context.imageSmoothingEnabled = false;
    context.putImageData(unpackPixels(scaled.words, scaled.width, scaled.height), 0, 0);
    return refined;
  }

  function drawContained(canvas, sprite, fill = 0.9, yBias = 0) {
    const context = canvas.getContext("2d");
    if (!context || !sprite) return false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = false;
    const scale = Math.min(canvas.width / sprite.width, canvas.height / sprite.height) * fill;
    const width = Math.max(1, Math.round(sprite.width * scale));
    const height = Math.max(1, Math.round(sprite.height * scale));
    const x = Math.round((canvas.width - width) / 2);
    const y = Math.round((canvas.height - height) / 2 + yBias);
    context.drawImage(sprite, x, y, width, height);
    return true;
  }

  async function loadAtlas() {
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
    return image;
  }

  async function renderCanonicalArt() {
    try {
      const atlas = await loadAtlas();
      const hero = refineSprite(atlas, atlasSource(REGION.hero, FRAME.heroIdle));
      const potavio = refineSprite(atlas, atlasSource(REGION.potavio, FRAME.potavioIdle));

      if (drawContained(heroPortrait, hero, 0.96, 2)) {
        root.classList.add("stage4-portrait-art-ready");
      }
      if (drawContained(potavioIntro, potavio, 0.98, 3)) {
        root.classList.add("stage4-potavio-intro-art-ready");
      }
    } catch (error) {
      console.warn("Stage 4 canonical intro art fallback:", error);
    }
  }

  renderCanonicalArt();

  window.__shallStage4CanonicalArtParity = Object.freeze({
    source: "native-stage4-atlas",
    canonicalIntroShall: "shall-short-neck-idle.png",
    scaleFactor: 2 ** SCALE_PASSES,
    gameplayWrites: false,
  });
})();
