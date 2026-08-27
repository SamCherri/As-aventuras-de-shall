(() => {
  "use strict";

  /*
   * Fase 4 — paridade de fidelidade do atlas com Fases 1–3.
   *
   * As fases-base usam PNGs canônicos grandes e desenham esses assets em hard-edge.
   * Já o atlas aquático guarda background, midground, foreground, tiles, VFX e
   * personagens em uma base muito compacta. Parte desse material é ampliada perto
   * de 4× no canvas (por exemplo, as faixas far/mid de 133×44 chegam a ~532×176),
   * deixando diagonais e contornos mais "8-bit" que o restante do jogo.
   *
   * Este passe não inventa arte nova: ele reconstrói as bordas do atlas em 4× com
   * Scale2x aplicado duas vezes, preservando paleta, transparência, silhueta e o
   * pixel hard-edge. O refinamento agora cobre a linguagem visual inteira da fase:
   * cenário, materiais jogáveis, VFX, Shall Mexilhãozinho, inimigos e pOtávio.
   *
   * O wrapper atua somente no canvas da Fase 4 e apenas em recortes internos do
   * atlas Base64. Física, hitboxes, animações, IA, câmera e timing permanecem intactos.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4SpriteFidelityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const SCALE_PASSES = 2;
  const REGIONS = [
    { name: "far", group: "environment", x: 0, y: 0, w: 133, h: 44 },
    { name: "mid", group: "environment", x: 0, y: 46, w: 133, h: 44 },
    { name: "fore", group: "environment", x: 0, y: 92, w: 133, h: 44 },
    { name: "tiles", group: "environment", x: 0, y: 138, w: 80, h: 60 },
    { name: "vfx", group: "environment", x: 82, y: 138, w: 80, h: 60 },
    { name: "hero", group: "characters", x: 137, y: 0, w: 80, h: 60 },
    { name: "potavio", group: "characters", x: 218, y: 0, w: 80, h: 60 },
    { name: "enemies", group: "characters", x: 137, y: 62, w: 80, h: 60 },
  ];

  const cache = new WeakMap();
  let cacheEntries = 0;

  function insideRegion(sx, sy, sw, sh) {
    const epsilon = 0.01;
    return REGIONS.some((region) =>
      sx >= region.x - epsilon &&
      sy >= region.y - epsilon &&
      sx + sw <= region.x + region.w + epsilon &&
      sy + sh <= region.y + region.h + epsilon,
    );
  }

  function looksLikeStage4Atlas(image) {
    return image instanceof HTMLImageElement &&
      typeof image.src === "string" &&
      image.src.startsWith("data:image/png;base64,");
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
      const rowAbove = Math.max(0, y - 1) * width;
      const rowBelow = Math.min(height - 1, y + 1) * width;

      for (let x = 0; x < width; x += 1) {
        const p = words[row + x];
        const a = words[rowAbove + x];
        const b = words[row + Math.min(width - 1, x + 1)];
        const c = words[row + Math.max(0, x - 1)];
        const d = words[rowBelow + x];

        const e0 = c === a && c !== d && a !== b ? c : p;
        const e1 = a === b && a !== c && b !== d ? b : p;
        const e2 = d === c && d !== b && c !== a ? c : p;
        const e3 = b === d && b !== a && d !== c ? b : p;

        const ox = x * 2;
        const oy = y * 2;
        const outRow = oy * outWidth + ox;
        output[outRow] = e0;
        output[outRow + 1] = e1;
        output[outRow + outWidth] = e2;
        output[outRow + outWidth + 1] = e3;
      }
    }

    return { words: output, width: outWidth, height: outHeight };
  }

  function createRefinedArt(image, sx, sy, sw, sh) {
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = Math.max(1, Math.round(sw));
    sourceCanvas.height = Math.max(1, Math.round(sh));
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    if (!sourceContext) return null;

    sourceContext.imageSmoothingEnabled = false;
    previousDrawImage.call(
      sourceContext,
      image,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
    );

    let imageData;
    try {
      imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    } catch {
      return null;
    }

    let scaled = {
      words: packPixels(imageData),
      width: sourceCanvas.width,
      height: sourceCanvas.height,
    };

    for (let pass = 0; pass < SCALE_PASSES; pass += 1) {
      scaled = scale2x(scaled.words, scaled.width, scaled.height);
    }

    const refined = document.createElement("canvas");
    refined.width = scaled.width;
    refined.height = scaled.height;
    const refinedContext = refined.getContext("2d");
    if (!refinedContext) return null;
    refinedContext.imageSmoothingEnabled = false;
    refinedContext.putImageData(unpackPixels(scaled.words, scaled.width, scaled.height), 0, 0);
    return refined;
  }

  function refinedArt(image, sx, sy, sw, sh) {
    let imageCache = cache.get(image);
    if (!imageCache) {
      imageCache = new Map();
      cache.set(image, imageCache);
    }

    const key = `${sx},${sy},${sw},${sh}`;
    if (imageCache.has(key)) return imageCache.get(key);

    const refined = createRefinedArt(image, sx, sy, sw, sh);
    imageCache.set(key, refined);
    if (refined) cacheEntries += 1;
    return refined;
  }

  function fidelityDrawImage(image, ...args) {
    if (
      this.canvas?.id !== TARGET_CANVAS_ID ||
      args.length !== 8 ||
      !looksLikeStage4Atlas(image)
    ) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insideRegion(sx, sy, sw, sh)) {
      return previousDrawImage.call(this, image, ...args);
    }

    const refined = refinedArt(image, sx, sy, sw, sh);
    if (!refined) {
      return previousDrawImage.call(this, image, ...args);
    }

    const previousSmoothing = this.imageSmoothingEnabled;
    this.imageSmoothingEnabled = false;
    const result = previousDrawImage.call(this, refined, dx, dy, dw, dh);
    this.imageSmoothingEnabled = previousSmoothing;
    return result;
  }

  fidelityDrawImage.__shallStage4SpriteFidelity = true;
  proto.drawImage = fidelityDrawImage;
  proto.__shallStage4SpriteFidelityInstalled = true;

  const parityApi = Object.freeze({
    factor: 2 ** SCALE_PASSES,
    regions: REGIONS.length,
    environmentRegions: REGIONS.filter((region) => region.group === "environment").length,
    characterRegions: REGIONS.filter((region) => region.group === "characters").length,
    regionNames: Object.freeze(REGIONS.map((region) => region.name)),
    cacheEntries: () => cacheEntries,
  });

  window.__shallStage4ArtFidelity = parityApi;
  window.__shallStage4SpriteFidelity = parityApi;
})();
