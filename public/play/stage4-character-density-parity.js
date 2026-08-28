(() => {
  "use strict";

  /*
   * Fase 4 — normalização de densidade dos personagens com Fases 1–3.
   *
   * As fases-base desenham Shall, inimigos e chefes a partir de PNGs canônicos
   * com centenas de KB e área de sprite muito maior. O atlas aquático é compacto:
   * os recortes reais dos personagens chegam ao renderer com poucos pixels e ainda
   * precisam ocupar aproximadamente 124 px (Shall) ou mais de 200 px (Água pOtávio)
   * no telefone.
   *
   * O passe de fidelidade existente mantém o ambiente em Scale2x 4×. Este módulo
   * atua SOMENTE nos três blocos de personagens do atlas e acrescenta um estágio
   * final de Scale2x depois do contorno canônico. Assim, herói, inimigos e boss
   * chegam ao desenho com uma malha interna 8×, enquanto cenário/VFX permanecem 4×.
   * Não são inventadas cores, roupas, rostos ou silhuetas: a informação vem apenas
   * do próprio sprite e de vizinhos de mesma paleta.
   *
   * O refinamento é cacheado por recorte. Não escreve em HP, física, colisões, IA,
   * câmera, dificuldade, posições, rotas, controles ou timers de gameplay.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4CharacterDensityParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const BASE_SCALE_PASSES = 2;
  const CHARACTER_DETAIL_PASSES = 1;
  const TOTAL_SCALE_PASSES = BASE_SCALE_PASSES + CHARACTER_DETAIL_PASSES;
  const CHARACTER_FACTOR = 2 ** TOTAL_SCALE_PASSES;

  const CHARACTER_REGIONS = Object.freeze([
    { name: "hero", x: 137, y: 0, w: 80, h: 60 },
    { name: "potavio", x: 218, y: 0, w: 80, h: 60 },
    { name: "enemies", x: 137, y: 62, w: 80, h: 60 },
  ]);

  // Aplicado na malha 4× e depois ampliado junto com o último Scale2x. Isso mantém
  // a espessura percebida próxima do contorno já aprovado, sem engrossar a hitbox.
  const OUTLINE = Object.freeze({
    outer: 2,
    inner: 1,
    outerColor: [4, 17, 29, 235],
    innerColor: [12, 39, 50, 245],
  });

  const cache = new WeakMap();
  let cacheEntries = 0;
  let cacheMisses = 0;

  function looksLikeStage4Atlas(image) {
    return image instanceof HTMLImageElement &&
      typeof image.src === "string" &&
      image.src.startsWith("data:image/png;base64,");
  }

  function regionForSlice(sx, sy, sw, sh) {
    const epsilon = 0.01;
    return CHARACTER_REGIONS.find((region) =>
      sx >= region.x - epsilon &&
      sy >= region.y - epsilon &&
      sx + sw <= region.x + region.w + epsilon &&
      sy + sh <= region.y + region.h + epsilon,
    ) || null;
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

  function scaleImageData2x(imageData) {
    const scaled = scale2x(packPixels(imageData), imageData.width, imageData.height);
    return unpackPixels(scaled.words, scaled.width, scaled.height);
  }

  function putPixel(data, width, x, y, color) {
    const index = (y * width + x) * 4;
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = color[3];
  }

  function addCharacterOutline(imageData) {
    const pad = OUTLINE.outer;
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
        for (let yy = -OUTLINE.outer; yy <= OUTLINE.outer; yy += 1) {
          for (let xx = -OUTLINE.outer; xx <= OUTLINE.outer; xx += 1) {
            const distance = Math.max(Math.abs(xx), Math.abs(yy));
            if (distance === 0 || distance > OUTLINE.outer) continue;
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
              distance <= OUTLINE.inner ? OUTLINE.innerColor : OUTLINE.outerColor,
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

  function createCharacterArt(image, sx, sy, sw, sh, region) {
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
      width: imageData.width,
      height: imageData.height,
    };
    for (let pass = 0; pass < BASE_SCALE_PASSES; pass += 1) {
      scaled = scale2x(scaled.words, scaled.width, scaled.height);
    }

    const base4x = unpackPixels(scaled.words, scaled.width, scaled.height);
    const outlined = addCharacterOutline(base4x);
    let detailed = outlined.imageData;
    for (let pass = 0; pass < CHARACTER_DETAIL_PASSES; pass += 1) {
      detailed = scaleImageData2x(detailed);
    }

    const detailFactor = 2 ** CHARACTER_DETAIL_PASSES;
    const refined = document.createElement("canvas");
    refined.width = detailed.width;
    refined.height = detailed.height;
    const refinedContext = refined.getContext("2d");
    if (!refinedContext) return null;
    refinedContext.imageSmoothingEnabled = false;
    refinedContext.putImageData(detailed, 0, 0);

    return {
      canvas: refined,
      pad: outlined.pad * detailFactor,
      contentWidth: outlined.contentWidth * detailFactor,
      contentHeight: outlined.contentHeight * detailFactor,
      region: region.name,
    };
  }

  function refinedCharacter(image, sx, sy, sw, sh, region) {
    let imageCache = cache.get(image);
    if (!imageCache) {
      imageCache = new Map();
      cache.set(image, imageCache);
    }

    const key = `${region.name}:${sx},${sy},${sw},${sh}`;
    if (imageCache.has(key)) return imageCache.get(key);
    cacheMisses += 1;
    const refined = createCharacterArt(image, sx, sy, sw, sh, region);
    imageCache.set(key, refined);
    if (refined) cacheEntries += 1;
    return refined;
  }

  function densityDrawImage(image, ...args) {
    if (
      this.canvas?.id !== TARGET_CANVAS_ID ||
      args.length !== 8 ||
      !looksLikeStage4Atlas(image)
    ) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    const region = regionForSlice(sx, sy, sw, sh);
    if (!region) return previousDrawImage.call(this, image, ...args);

    const refined = refinedCharacter(image, sx, sy, sw, sh, region);
    if (!refined || refined.contentWidth <= 0 || refined.contentHeight <= 0) {
      return previousDrawImage.call(this, image, ...args);
    }

    const padX = Math.abs(dw) / refined.contentWidth * refined.pad;
    const padY = Math.abs(dh) / refined.contentHeight * refined.pad;
    const drawX = dx - padX;
    const drawY = dy - padY;
    const drawW = dw + padX * 2;
    const drawH = dh + padY * 2;

    const smoothing = this.imageSmoothingEnabled;
    this.imageSmoothingEnabled = false;
    const result = previousDrawImage.call(this, refined.canvas, drawX, drawY, drawW, drawH);
    this.imageSmoothingEnabled = smoothing;
    return result;
  }

  densityDrawImage.__shallStage4CharacterDensityParity = true;
  proto.drawImage = densityDrawImage;
  proto.__shallStage4CharacterDensityParityInstalled = true;

  window.__shallStage4CharacterDensityParity = Object.freeze({
    factor: CHARACTER_FACTOR,
    baseFactor: 2 ** BASE_SCALE_PASSES,
    regions: Object.freeze(CHARACTER_REGIONS.map((region) => region.name)),
    paletteSafe: true,
    gameplayWrites: false,
    cacheEntries: () => cacheEntries,
    cacheMisses: () => cacheMisses,
  });
})();
