(() => {
  "use strict";

  /*
   * Fase 4 — paridade de identidade visual com Fases 1–3.
   *
   * As fases-base apresentam personagens com arte canônica real no HUD, nas
   * telas de entrada e num epílogo em quadros. A Fase 4 ainda encerrava em um
   * modal estático. Este módulo reaproveita o atlas nativo para a apresentação
   * canônica e transforma o resultado da fase em um pequeno ending comic,
   * sem escrever em HP, física, IA, colisões ou timers de gameplay.
   */

  const root = document.documentElement;
  const heroPortrait = document.querySelector("#stage4-hero-portrait-art");
  const potavioIntro = document.querySelector("#stage4-intro-potavio-art");
  const canonicalShall = document.querySelector(".stage4-intro-shall-canonical");
  const winLayer = document.querySelector("#stage4-win");
  const winCard = winLayer?.querySelector(".stage4-win-card") || null;
  const replayButton = document.querySelector("#stage4-replay");
  const menuLink = winCard?.querySelector('a[href="./index.html"]') || null;
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
    potavioDrain: [79, 176, 47, 59],
    potavioDefeat: [223, 198, 92, 36],
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
    const context = canvas?.getContext("2d");
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

  function installEndingStyles() {
    if (document.querySelector("#stage4-ending-parity-styles")) return;
    const style = document.createElement("style");
    style.id = "stage4-ending-parity-styles";
    style.textContent = `
      .stage4-result.stage4-ending-parity:not([hidden]) {
        display: grid;
        grid-template-rows: minmax(0, 1fr) auto;
        place-items: stretch;
        gap: 10px;
        padding: 13px;
        background: #080a18;
      }
      .stage4-ending-parity .stage4-win-card {
        width: auto;
        display: block;
        padding: 0;
        border: 0;
        background: transparent;
        box-shadow: none;
        text-align: center;
      }
      .stage4-ending-comic {
        min-height: 0;
        position: relative;
        overflow: hidden;
        border: 4px solid #fff3cf;
        background:
          linear-gradient(180deg, rgba(8,58,88,.16), rgba(3,22,43,.34)),
          linear-gradient(#0b5275 0 55%, #0b3857 55% 74%, #07182d 74%);
        box-shadow: 5px 5px 0 #31516d;
        image-rendering: pixelated;
      }
      .stage4-ending-depth {
        position: absolute;
        inset: 12% 0 22%;
        background:
          repeating-linear-gradient(90deg, #0b2a43 0 52px, #123d58 52px 91px, #0b2942 91px 145px);
        opacity: .92;
      }
      .stage4-ending-depth::before {
        content: "";
        position: absolute;
        inset: 13px 0 auto;
        height: 48%;
        background:
          repeating-linear-gradient(90deg, transparent 0 18px, rgba(113,231,242,.32) 19px 23px, transparent 24px 38px);
      }
      .stage4-ending-floor {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 28%;
        border-top: 7px solid #2f7380;
        background:
          repeating-linear-gradient(115deg, #153b48 0 32px, #0d2b3a 32px 62px);
      }
      .stage4-ending-floor::after {
        content: "";
        position: absolute;
        left: 6%;
        right: 6%;
        top: 16px;
        height: 5px;
        background: repeating-linear-gradient(90deg, #73dce8 0 22px, transparent 22px 42px);
        opacity: .34;
      }
      .stage4-ending-pipe {
        position: absolute;
        right: -10px;
        top: 10%;
        width: 30%;
        height: 56%;
        border: 10px solid #315a69;
        border-left-width: 14px;
        background: #102d40;
        box-shadow: inset 8px 0 #163f51, -5px 6px 0 rgba(1,10,24,.48);
        clip-path: polygon(12% 0,100% 0,100% 100%,0 100%,0 20%,12% 20%);
      }
      .stage4-ending-pipe::after {
        content: "0%";
        position: absolute;
        left: 18%;
        bottom: 18%;
        padding: 3px 5px;
        border: 2px solid #d9fbff;
        background: #071525;
        color: #ffe482;
        font: 900 10px/1 monospace;
        box-shadow: 2px 2px 0 #030914;
      }
      .stage4-ending-hero-art,
      .stage4-ending-potavio-dry,
      .stage4-ending-potavio-defeat {
        position: absolute;
        image-rendering: pixelated;
        filter: drop-shadow(5px 5px 0 rgba(0,0,0,.5));
        transition: opacity 120ms steps(2), transform 180ms steps(3);
      }
      .stage4-ending-hero-art {
        z-index: 4;
        left: 2%;
        bottom: 3%;
        width: 42%;
        height: 78%;
      }
      .stage4-ending-potavio-dry {
        z-index: 3;
        right: 7%;
        bottom: 7%;
        width: 43%;
        height: 72%;
      }
      .stage4-ending-potavio-defeat {
        z-index: 3;
        right: 4%;
        bottom: 11%;
        width: 48%;
        height: 36%;
        opacity: 0;
      }
      .stage4-ending-spray {
        position: absolute;
        z-index: 2;
        inset: 0;
        opacity: 0;
        pointer-events: none;
        background:
          repeating-linear-gradient(118deg, transparent 0 24px, rgba(197,248,255,.22) 25px 28px, transparent 29px 47px);
      }
      .stage4-ending-bubbles {
        position: absolute;
        z-index: 2;
        inset: 0;
        opacity: .72;
        pointer-events: none;
        background:
          radial-gradient(circle at 16% 22%, rgba(217,251,255,.9) 0 2px, transparent 3px),
          radial-gradient(circle at 31% 41%, rgba(217,251,255,.72) 0 3px, transparent 4px),
          radial-gradient(circle at 67% 18%, rgba(217,251,255,.8) 0 2px, transparent 3px),
          radial-gradient(circle at 78% 46%, rgba(217,251,255,.62) 0 4px, transparent 5px),
          radial-gradient(circle at 52% 69%, rgba(217,251,255,.66) 0 2px, transparent 3px);
      }
      .stage4-ending-comic.frame-drain .stage4-ending-potavio-dry {
        animation: stage4-ending-dry 700ms steps(5) infinite alternate;
      }
      .stage4-ending-comic.frame-collapse .stage4-ending-potavio-dry {
        opacity: 0;
      }
      .stage4-ending-comic.frame-collapse .stage4-ending-potavio-defeat {
        opacity: 1;
        animation: stage4-ending-collapse 650ms steps(5) both;
      }
      .stage4-ending-comic.frame-collapse .stage4-ending-hero-art {
        transform: translateX(12%) scale(1.06);
      }
      .stage4-ending-comic.frame-collapse .stage4-ending-spray {
        opacity: .68;
        animation: stage4-ending-speed 580ms steps(5) infinite;
      }
      .stage4-ending-comic.frame-victory .stage4-ending-potavio-dry,
      .stage4-ending-comic.frame-victory .stage4-ending-potavio-defeat,
      .stage4-ending-comic.frame-victory .stage4-ending-pipe {
        opacity: 0;
      }
      .stage4-ending-comic.frame-victory .stage4-ending-hero-art {
        left: 24%;
        width: 52%;
        height: 86%;
        transform: translateY(-1%) scale(1.08);
        animation: stage4-ending-victory 900ms steps(4) infinite alternate;
      }
      .stage4-ending-comic.frame-victory .stage4-ending-bubbles {
        opacity: 1;
        animation: stage4-ending-bubbles 1100ms steps(5) infinite;
      }
      .stage4-ending-copy > small {
        color: var(--cyan);
        font-weight: 900;
        letter-spacing: .12em;
      }
      .stage4-ending-copy h2 {
        margin: 6px 0;
        color: var(--gold);
        font-size: 25px;
        line-height: 1;
        text-shadow: 3px 3px #2f7291;
      }
      .stage4-ending-copy p {
        min-height: 31px;
        margin: 0 auto 8px;
        max-width: 410px;
        color: #d7dbee;
        font-size: 11px;
        line-height: 1.35;
      }
      .stage4-ending-copy .stage4-ending-continua {
        display: block;
        margin: 8px 0 10px;
        color: white;
        font-size: 27px;
        letter-spacing: .08em;
        animation: stage4-ending-blink 1s steps(2) infinite;
      }
      .stage4-ending-copy .stage4-ending-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 7px;
      }
      .stage4-ending-copy .stage4-ending-actions > * {
        min-width: 148px;
        margin-top: 0;
      }
      .stage4-ending-copy .stage4-ending-actions > a {
        display: inline-grid;
        place-items: center;
        text-decoration: none;
      }
      @keyframes stage4-ending-dry {
        from { transform: translateY(0) scaleX(.96); }
        to { transform: translateY(3%) scaleX(.89) scaleY(1.03); }
      }
      @keyframes stage4-ending-collapse {
        from { transform: translate(12%,-28%) rotate(-6deg) scale(.78); }
        to { transform: translate(-4%,2%) rotate(3deg) scale(1); }
      }
      @keyframes stage4-ending-speed {
        to { background-position: 110px 0; }
      }
      @keyframes stage4-ending-victory {
        from { transform: translateY(1%) scale(1.05) rotate(-1deg); }
        to { transform: translateY(-2%) scale(1.09) rotate(1deg); }
      }
      @keyframes stage4-ending-bubbles {
        50% { transform: translateY(-8px); opacity: .72; }
      }
      @keyframes stage4-ending-blink {
        50% { opacity: .45; }
      }
      @media (prefers-reduced-motion: reduce) {
        .stage4-ending-comic *,
        .stage4-ending-copy * {
          animation: none !important;
          transition: none !important;
        }
      }
      @media (max-width: 380px) {
        .stage4-result.stage4-ending-parity:not([hidden]) {
          padding: 9px;
          gap: 7px;
        }
        .stage4-ending-copy h2 { font-size: 21px; }
        .stage4-ending-copy p { font-size: 9px; min-height: 26px; }
        .stage4-ending-copy .stage4-ending-actions > * {
          min-width: 132px;
          padding-left: 9px;
          padding-right: 9px;
          font-size: 10px;
        }
      }
    `;
    document.head.append(style);
  }

  function setupEnding() {
    if (!winLayer || !winCard || !replayButton || !menuLink) return null;
    if (winLayer.dataset.endingParity === "ready") {
      return {
        comic: winLayer.querySelector("#stage4-ending-comic"),
        hero: winLayer.querySelector("#stage4-ending-hero-art"),
        potavioDry: winLayer.querySelector("#stage4-ending-potavio-dry"),
        potavioDefeat: winLayer.querySelector("#stage4-ending-potavio-defeat"),
      };
    }

    installEndingStyles();
    winLayer.dataset.endingParity = "ready";
    winLayer.classList.add("stage4-ending-parity");
    winCard.classList.add("ending-copy", "stage4-ending-copy");

    const kicker = winCard.querySelector("small");
    const title = winCard.querySelector("h2");
    const text = winCard.querySelector("p");
    if (kicker) kicker.id = "stage4-ending-kicker";
    if (title) title.id = "stage4-ending-title";
    if (text) text.id = "stage4-ending-text";

    const comic = document.createElement("div");
    comic.className = "ending-comic stage4-ending-comic frame-drain";
    comic.id = "stage4-ending-comic";
    comic.setAttribute("aria-live", "polite");
    comic.innerHTML = `
      <div class="stage4-ending-depth" aria-hidden="true"></div>
      <div class="stage4-ending-floor" aria-hidden="true"></div>
      <div class="stage4-ending-pipe" aria-hidden="true"></div>
      <canvas class="stage4-ending-potavio-dry" id="stage4-ending-potavio-dry" width="160" height="190" aria-label="Água pOtávio com o galão vazio"></canvas>
      <canvas class="stage4-ending-potavio-defeat" id="stage4-ending-potavio-defeat" width="190" height="100" aria-label="Água pOtávio derrotado"></canvas>
      <canvas class="stage4-ending-hero-art" id="stage4-ending-hero-art" width="150" height="210" aria-label="Shall Mexilhãozinho"></canvas>
      <div class="stage4-ending-bubbles" aria-hidden="true"></div>
      <div class="stage4-ending-spray" aria-hidden="true"></div>
    `;
    winLayer.insertBefore(comic, winCard);

    let continua = winCard.querySelector(".stage4-ending-continua");
    if (!continua) {
      continua = document.createElement("strong");
      continua.className = "stage4-ending-continua";
      continua.textContent = "CONTINUA...";
      continua.hidden = true;
      winCard.insertBefore(continua, replayButton);
    }

    let actions = winCard.querySelector(".stage4-ending-actions");
    if (!actions) {
      actions = document.createElement("div");
      actions.className = "ending-actions stage4-ending-actions";
      winCard.insertBefore(actions, replayButton);
      actions.append(replayButton, menuLink);
    }

    const next = document.createElement("button");
    next.className = "pixel-button primary stage4-ending-next";
    next.type = "button";
    next.textContent = "PRÓXIMO ▶";
    actions.insertBefore(next, replayButton);

    const frames = [
      {
        className: "frame-drain",
        kicker: "DEPOIS DA BATALHA",
        title: "GALÃO VAZIO!",
        text: "Sem água, a barriga murchou e a pressão do Água pOtávio despencou.",
      },
      {
        className: "frame-collapse",
        kicker: "SEM PRESSÃO · SEM POSE",
        title: "ÁGUA pOtÁVIO SECOU!",
        text: "O grandão tenta manter a pose, mas acaba achatado no fundo do reservatório.",
      },
      {
        className: "frame-victory",
        kicker: "FASE 4 CONCLUÍDA",
        title: "MEXILHÃOZINHO VENCEU!",
        text: "Shall olha para a superfície. A aventura continua além do reservatório...",
        final: true,
      },
    ];
    let frameIndex = 0;

    function renderFrame(index = 0) {
      frameIndex = Math.max(0, Math.min(frames.length - 1, index));
      const frame = frames[frameIndex];
      comic.className = `ending-comic stage4-ending-comic ${frame.className}`;
      if (kicker) kicker.textContent = frame.kicker;
      if (title) title.textContent = frame.title;
      if (text) text.textContent = frame.text;
      continua.hidden = !frame.final;
      next.hidden = Boolean(frame.final);
      replayButton.hidden = !frame.final;
      menuLink.hidden = !frame.final;
    }

    next.addEventListener("click", () => renderFrame(frameIndex + 1));
    const observer = new MutationObserver(() => {
      if (!winLayer.hidden) renderFrame(0);
    });
    observer.observe(winLayer, { attributes: true, attributeFilter: ["hidden"] });
    renderFrame(0);

    return {
      comic,
      hero: comic.querySelector("#stage4-ending-hero-art"),
      potavioDry: comic.querySelector("#stage4-ending-potavio-dry"),
      potavioDefeat: comic.querySelector("#stage4-ending-potavio-defeat"),
    };
  }

  const ending = setupEnding();

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
      const potavioDrain = refineSprite(atlas, atlasSource(REGION.potavio, FRAME.potavioDrain));
      const potavioDefeat = refineSprite(atlas, atlasSource(REGION.potavio, FRAME.potavioDefeat));

      if (drawContained(heroPortrait, hero, 0.96, 2)) {
        root.classList.add("stage4-portrait-art-ready");
      }
      if (drawContained(potavioIntro, potavio, 0.98, 3)) {
        root.classList.add("stage4-potavio-intro-art-ready");
      }
      if (ending) {
        const endingHeroReady = drawContained(ending.hero, hero, 0.98, 5);
        const dryReady = drawContained(ending.potavioDry, potavioDrain, 0.98, 4);
        const defeatReady = drawContained(ending.potavioDefeat, potavioDefeat, 0.98, 0);
        if (endingHeroReady && dryReady && defeatReady) {
          root.classList.add("stage4-ending-art-ready");
        }
      }
    } catch (error) {
      console.warn("Stage 4 canonical art fallback:", error);
    }
  }

  renderCanonicalArt();

  window.__shallStage4CanonicalArtParity = Object.freeze({
    source: "native-stage4-atlas",
    canonicalIntroShall: "shall-short-neck-idle.png",
    endingPresentation: "three-frame-comic",
    scaleFactor: 2 ** SCALE_PASSES,
    gameplayWrites: false,
  });
})();