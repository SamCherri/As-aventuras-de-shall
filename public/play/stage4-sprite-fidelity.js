(() => {
  "use strict";

  /*
   * Fase 4 — paridade de fidelidade e silhueta com Fases 1–3.
   *
   * As fases-base usam PNGs canônicos grandes, com contornos fortes e leitura
   * imediata contra cenários ocupados. Já o atlas aquático guarda cenário, VFX
   * e personagens em uma base compacta que precisa ser ampliada no canvas.
   *
   * Este passe mantém o Scale2x 4× para todo o atlas e acrescenta APENAS aos
   * personagens (Shall Mexilhãozinho, inimigos e Água pOtávio) um contorno
   * pixelado em dois níveis. O contorno é criado a partir da máscara alfa do
   * próprio sprite; não redesenha rosto, roupa, paleta ou silhueta interna.
   *
   * O processamento é feito uma única vez por recorte e fica cacheado. Física,
   * hitboxes, animações, IA, câmera, timing e posições de gameplay permanecem
   * intocados.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4SpriteFidelityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const SCALE_PASSES = 2;
  const CHARACTER_OUTLINE = Object.freeze({
    outer: 2,
    inner: 1,
    outerColor: [4, 17, 29, 235],
    innerColor: [12, 39, 50, 245],
  });
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
  let outlinedEntries = 0;

  function regionForSlice(sx, sy, sw, sh) {
    const epsilon = 0.01;
    return REGIONS.find((region) =>
      sx >= region.x - epsilon &&
      sy >= region.y - epsilon &&
      sx + sw <= region.x + region.w + epsilon &&
      sy + sh <= region.y + region.h + epsilon,
    ) || null;
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

  function putPixel(data, width, x, y, color) {
    const p = (y * width + x) * 4;
    data[p] = color[0];
    data[p + 1] = color[1];
    data[p + 2] = color[2];
    data[p + 3] = color[3];
  }

  function characterSilhouette(imageData) {
    const pad = CHARACTER_OUTLINE.outer;
    const width = imageData.width;
    const height = imageData.height;
    const outWidth = width + pad * 2;
    const outHeight = height + pad * 2;
    const output = new Uint8ClampedArray(outWidth * outHeight * 4);
    const source = imageData.data;

    const opaque = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        opaque[y * width + x] = source[(y * width + x) * 4 + 3] > 20 ? 1 : 0;
      }
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!opaque[y * width + x]) continue;
        const ox = x + pad;
        const oy = y + pad;

        for (let yy = -CHARACTER_OUTLINE.outer; yy <= CHARACTER_OUTLINE.outer; yy += 1) {
          for (let xx = -CHARACTER_OUTLINE.outer; xx <= CHARACTER_OUTLINE.outer; xx += 1) {
            const distance = Math.max(Math.abs(xx), Math.abs(yy));
            if (distance === 0 || distance > CHARACTER_OUTLINE.outer) continue;
            const tx = ox + xx;
            const ty = oy + yy;
            if (tx < 0 || ty < 0 || tx >= outWidth || ty >= outHeight) continue;
            const alphaIndex = (ty * outWidth + tx) * 4 + 3;
            if (output[alphaIndex] !== 0) continue;
            putPixel(
              output,
              outWidth,
              tx,
              ty,
              distance <= CHARACTER_OUTLINE.inner
                ? CHARACTER_OUTLINE.innerColor
                : CHARACTER_OUTLINE.outerColor,
            );
          }
        }
      }
    }

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const sourceIndex = (y * width + x) * 4;
        if (source[sourceIndex + 3] === 0) continue;
        const targetIndex = ((y + pad) * outWidth + (x + pad)) * 4;
        output[targetIndex] = source[sourceIndex];
        output[targetIndex + 1] = source[sourceIndex + 1];
        output[targetIndex + 2] = source[sourceIndex + 2];
        output[targetIndex + 3] = source[sourceIndex + 3];
      }
    }

    return {
      imageData: new ImageData(output, outWidth, outHeight),
      pad,
      contentWidth: width,
      contentHeight: height,
    };
  }

  function createRefinedArt(image, sx, sy, sw, sh, region) {
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

    const scaledImageData = unpackPixels(scaled.words, scaled.width, scaled.height);
    const outlined = region.group === "characters"
      ? characterSilhouette(scaledImageData)
      : {
          imageData: scaledImageData,
          pad: 0,
          contentWidth: scaled.width,
          contentHeight: scaled.height,
        };

    const refined = document.createElement("canvas");
    refined.width = outlined.imageData.width;
    refined.height = outlined.imageData.height;
    const refinedContext = refined.getContext("2d");
    if (!refinedContext) return null;
    refinedContext.imageSmoothingEnabled = false;
    refinedContext.putImageData(outlined.imageData, 0, 0);

    if (outlined.pad > 0) outlinedEntries += 1;
    return {
      canvas: refined,
      pad: outlined.pad,
      contentWidth: outlined.contentWidth,
      contentHeight: outlined.contentHeight,
      group: region.group,
      region: region.name,
    };
  }

  function refinedArt(image, sx, sy, sw, sh, region) {
    let imageCache = cache.get(image);
    if (!imageCache) {
      imageCache = new Map();
      cache.set(image, imageCache);
    }

    const key = `${region.name}:${sx},${sy},${sw},${sh}`;
    if (imageCache.has(key)) return imageCache.get(key);

    const refined = createRefinedArt(image, sx, sy, sw, sh, region);
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
    const region = regionForSlice(sx, sy, sw, sh);
    if (!region) {
      return previousDrawImage.call(this, image, ...args);
    }

    const refined = refinedArt(image, sx, sy, sw, sh, region);
    if (!refined) {
      return previousDrawImage.call(this, image, ...args);
    }

    let drawX = dx;
    let drawY = dy;
    let drawW = dw;
    let drawH = dh;
    if (refined.pad > 0 && refined.contentWidth > 0 && refined.contentHeight > 0) {
      const padX = Math.abs(dw) / refined.contentWidth * refined.pad;
      const padY = Math.abs(dh) / refined.contentHeight * refined.pad;
      drawX -= padX;
      drawY -= padY;
      drawW += padX * 2;
      drawH += padY * 2;
    }

    const previousSmoothing = this.imageSmoothingEnabled;
    this.imageSmoothingEnabled = false;
    const result = previousDrawImage.call(this, refined.canvas, drawX, drawY, drawW, drawH);
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
    characterOutline: Object.freeze({
      outer: CHARACTER_OUTLINE.outer,
      inner: CHARACTER_OUTLINE.inner,
    }),
    cacheEntries: () => cacheEntries,
    outlinedEntries: () => outlinedEntries,
  });

  window.__shallStage4ArtFidelity = parityApi;
  window.__shallStage4SpriteFidelity = parityApi;
})();
