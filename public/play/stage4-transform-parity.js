(() => {
  "use strict";

  /*
   * Fase 4 — ponte visual canônica Shall → Mexilhãozinho.
   *
   * As Fases 1–3 mantêm o Shall canônico visível antes de qualquer transformação
   * e usam antecipação/impacto para comunicar a mudança de forma. A Fase 4 já
   * tinha 2,4 s de transformação, mas, com a arte nativa pronta, substituía Shall
   * imediatamente por um único frame comprimido do atlas aquático.
   *
   * Este passe preserva o MESMO timer e o MESMO estado de gameplay. Durante o
   * draw do frame de transformação, o Shall canônico das Fases 1–3 permanece
   * visível no primeiro ato, comprime/dissolve no segundo e entrega a leitura ao
   * frame do Mexilhãozinho no terceiro. Nenhuma variável de física, HP, posição,
   * colisão, controle ou duração da transformação é escrita por este módulo.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4TransformParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const TARGET_CANVAS_ID = "stage4-canvas";
  const HERO_REGION = { x: 137, y: 0, w: 80, h: 60 };
  const TRANSFORM_LOCAL = [261, 110, 55, 98];
  const CANONICAL_SHALL_SRC = "./assets/shall-short-neck-idle.png";
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const heroName = document.querySelector(".stage4-hud .life-wrap > span");

  const canonicalShall = new Image();
  canonicalShall.decoding = "async";
  canonicalShall.src = CANONICAL_SHALL_SRC;
  let canonicalReady = canonicalShall.complete && canonicalShall.naturalWidth > 0;
  canonicalShall.addEventListener("load", () => { canonicalReady = true; }, { once: true });

  let sawTransform = false;
  let completionAt = 0;
  let lastHudMode = "";

  function atlasSource(local) {
    const sx = Math.floor(local[0] / 4);
    const sy = Math.floor(local[1] / 4);
    const ex = Math.max(sx + 1, Math.floor((local[0] + local[2]) / 4));
    const ey = Math.max(sy + 1, Math.floor((local[1] + local[3]) / 4));
    return [HERO_REGION.x + sx, HERO_REGION.y + sy, ex - sx, ey - sy];
  }

  const TRANSFORM_SOURCE = atlasSource(TRANSFORM_LOCAL);

  function debugState() {
    return typeof window.__shallStage4Debug === "function"
      ? window.__shallStage4Debug()
      : null;
  }

  function insideHeroRegion(sx, sy, sw, sh) {
    const epsilon = 0.01;
    return sx >= HERO_REGION.x - epsilon &&
      sy >= HERO_REGION.y - epsilon &&
      sx + sw <= HERO_REGION.x + HERO_REGION.w + epsilon &&
      sy + sh <= HERO_REGION.y + HERO_REGION.h + epsilon;
  }

  function isTransformFrame(sx, sy, sw, sh) {
    return sx === TRANSFORM_SOURCE[0] &&
      sy === TRANSFORM_SOURCE[1] &&
      sw === TRANSFORM_SOURCE[2] &&
      sh === TRANSFORM_SOURCE[3];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function smoothstep(edge0, edge1, value) {
    const x = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return x * x * (3 - 2 * x);
  }

  function syncHud(debug) {
    if (!heroName || !debug) return;
    const next = debug.transformDone ? "mexilhao" : "shall";
    if (next === lastHudMode) return;
    lastHudMode = next;
    heroName.textContent = next === "mexilhao" ? "SHALL MEXILHÃOZINHO" : "SHALL";
  }

  function pixel(ctx, x, y, w, h, color, alpha = 1) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha *= clamp(alpha, 0, 1);
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    ctx.restore();
  }

  function bracket(ctx, cx, cy, width, height, color, alpha) {
    const x = Math.round(cx - width / 2);
    const y = Math.round(cy - height / 2);
    const arm = Math.max(7, Math.round(width * 0.18));
    const thick = 3;
    pixel(ctx, x, y, arm, thick, color, alpha);
    pixel(ctx, x, y, thick, arm, color, alpha);
    pixel(ctx, x + width - arm, y, arm, thick, color, alpha);
    pixel(ctx, x + width - thick, y, thick, arm, color, alpha);
    pixel(ctx, x, y + height - thick, arm, thick, color, alpha);
    pixel(ctx, x, y + height - arm, thick, arm, color, alpha);
    pixel(ctx, x + width - arm, y + height - thick, arm, thick, color, alpha);
    pixel(ctx, x + width - thick, y + height - arm, thick, arm, color, alpha);
  }

  function orbitPixels(ctx, cx, cy, radius, progress, tick) {
    const phase = reducedMotion ? 0 : tick * 0.0045;
    const count = 10;
    for (let i = 0; i < count; i += 1) {
      const angle = phase + (Math.PI * 2 * i) / count;
      const wobble = reducedMotion ? 0 : Math.sin(tick * 0.009 + i) * 4;
      const x = cx + Math.cos(angle) * (radius + wobble);
      const y = cy + Math.sin(angle) * (radius * 0.72 + wobble * 0.45);
      const size = i % 3 === 0 ? 5 : 3;
      const color = i % 4 === 0 ? "#fff0a2" : i % 2 === 0 ? "#80ecff" : "#58d2e2";
      pixel(ctx, x - size / 2, y - size / 2, size, size, color, 0.18 + progress * 0.38);
    }
  }

  function chargeColumn(ctx, cx, cy, height, progress, tick) {
    if (progress < 0.28) return;
    const local = clamp((progress - 0.28) / 0.72, 0, 1);
    const pulse = reducedMotion ? 1 : 0.72 + Math.sin(tick * 0.025) * 0.18;
    const columnW = 16 + Math.round(local * 10);
    const columnH = height + 42 + Math.round(local * 34);
    pixel(ctx, cx - columnW / 2, cy - columnH / 2, columnW, columnH, "#69d9f2", 0.035 + local * 0.08 * pulse);
    pixel(ctx, cx - 3, cy - columnH / 2 - 6, 6, columnH + 12, "#d9fbff", 0.03 + local * 0.08);
  }

  function transformationLabel(ctx, cx, cy, progress) {
    if (progress < 0.38) return;
    const alpha = progress < 0.78
      ? clamp((progress - 0.38) / 0.18, 0, 1)
      : clamp((1 - progress) / 0.12, 0.25, 1);
    const text = progress < 0.72 ? "TRANSFORMAÇÃO" : "FORMA MEXILHÃO";

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.imageSmoothingEnabled = false;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 12px monospace";
    ctx.fillStyle = "#06172a";
    ctx.fillText(text, Math.round(cx + 2), Math.round(cy - 76 + 2));
    ctx.fillStyle = progress < 0.72 ? "#d9fbff" : "#fff0a2";
    ctx.fillText(text, Math.round(cx), Math.round(cy - 76));
    ctx.restore();
  }

  function drawCharge(ctx, cx, cy, dw, dh, progress, tick) {
    const charge = clamp(progress, 0, 1);
    const contract = 1 - charge;
    const ringRadius = 55 + contract * 36;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    chargeColumn(ctx, cx, cy, dh, charge, tick);
    orbitPixels(ctx, cx, cy, ringRadius, charge, tick);

    const bracketWidth = 108 - charge * 24;
    const bracketHeight = 138 - charge * 26;
    bracket(ctx, cx, cy - 4, bracketWidth, bracketHeight, "#80ecff", 0.16 + charge * 0.34);
    if (charge > 0.58) {
      bracket(ctx, cx, cy - 4, bracketWidth - 14, bracketHeight - 18, "#fff0a2", (charge - 0.58) * 0.72);
    }

    if (charge > 0.72) {
      const strobe = reducedMotion ? 0.28 : 0.18 + (Math.floor(tick / 70) % 2) * 0.18;
      pixel(ctx, cx - dw * 0.64, cy - 3, dw * 1.28, 6, "#d9fbff", strobe * charge);
      pixel(ctx, cx - 3, cy - dh * 0.66, 6, dh * 1.32, "#fff0a2", strobe * charge * 0.85);
    }

    transformationLabel(ctx, cx, cy, charge);
    ctx.restore();
  }

  function drawCanonicalShall(ctx, cx, cy, progress) {
    if (!canonicalReady || !canonicalShall.naturalWidth || !canonicalShall.naturalHeight) return false;

    const fade = 1 - smoothstep(0.28, 0.72, progress);
    if (fade <= 0.001) return false;

    // Aproxima a presença de ~124 px usada pelo Shall nas Fases 1–3 e comprime
    // a silhueta gradualmente antes da forma aquática assumir a leitura.
    const boxW = 104 + progress * 14;
    const boxH = 126 - smoothstep(0.20, 0.72, progress) * 34;
    const scale = Math.min(boxW / canonicalShall.naturalWidth, boxH / canonicalShall.naturalHeight);
    const width = Math.max(1, Math.round(canonicalShall.naturalWidth * scale));
    const height = Math.max(1, Math.round(canonicalShall.naturalHeight * scale));
    const sink = smoothstep(0.18, 0.72, progress) * 8;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(performance.now() * 0.018) * 0.018 * (1 - progress);

    ctx.save();
    ctx.globalAlpha *= fade;
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(cx), Math.round(cy + sink));
    ctx.scale(pulse, 1 / pulse);
    previousDrawImage.call(
      ctx,
      canonicalShall,
      0,
      0,
      canonicalShall.naturalWidth,
      canonicalShall.naturalHeight,
      Math.round(-width / 2),
      Math.round(-height / 2),
      width,
      height,
    );
    ctx.restore();
    return true;
  }

  function drawMorphBands(ctx, cx, cy, progress) {
    if (progress < 0.24 || progress > 0.84) return;
    const local = smoothstep(0.24, 0.52, progress) * (1 - smoothstep(0.68, 0.84, progress));
    const span = 86 - progress * 18;
    const yStep = 13;
    for (let i = -3; i <= 3; i += 1) {
      const stagger = (Math.abs(i) % 2) * 7;
      const width = span - Math.abs(i) * 7;
      const color = i % 2 === 0 ? "#d9fbff" : "#69d9f2";
      pixel(ctx, cx - width / 2 + stagger, cy + i * yStep - 3, width, 4, color, local * 0.16);
    }
  }

  function drawCompletion(ctx, cx, cy, age) {
    const duration = 900;
    const progress = clamp(age / duration, 0, 1);
    if (progress >= 1) return false;

    const ease = 1 - Math.pow(1 - progress, 3);
    const alpha = 1 - progress;
    const radius = 48 + ease * 86;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12;
      const length = 10 + ease * 26;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.72;
      const color = i % 3 === 0 ? "#fff0a2" : i % 2 === 0 ? "#d9fbff" : "#58d2e2";
      pixel(ctx, x, y, length * 0.42, 4, color, alpha * 0.52);
    }

    bracket(ctx, cx, cy - 4, 92 + ease * 52, 116 + ease * 58, "#fff0a2", alpha * 0.48);
    bracket(ctx, cx, cy - 4, 78 + ease * 38, 98 + ease * 42, "#80ecff", alpha * 0.44);

    if (progress < 0.72) {
      const textAlpha = progress < 0.18 ? progress / 0.18 : clamp((0.72 - progress) / 0.22, 0, 1);
      ctx.globalAlpha *= textAlpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "900 15px monospace";
      ctx.fillStyle = "#06172a";
      ctx.fillText("MEXILHÃOZINHO!", Math.round(cx + 2), Math.round(cy - 88 + 2));
      ctx.fillStyle = "#fff0a2";
      ctx.fillText("MEXILHÃOZINHO!", Math.round(cx), Math.round(cy - 88));
    }

    ctx.restore();
    return true;
  }

  function progressFromDrawSize(dw, dh) {
    const widthProgress = (Math.abs(dw) - 70) / 10;
    const heightProgress = (Math.abs(dh) - 90) / 8;
    return clamp((widthProgress + heightProgress) * 0.5, 0, 1);
  }

  function drawNativeTransform(ctx, image, args, progress) {
    // O frame nativo entra apenas depois que Shall foi claramente apresentado.
    // Assim a mudança é lida como transformação do personagem canônico, não como
    // um sprite aquático que já existe desde o primeiro frame da fase.
    const alpha = canonicalReady ? smoothstep(0.30, 0.76, progress) : 1;
    if (alpha <= 0.001) return undefined;
    ctx.save();
    ctx.globalAlpha *= alpha;
    const result = previousDrawImage.call(ctx, image, ...args);
    ctx.restore();
    return result;
  }

  function parityDrawImage(image, ...args) {
    if (this.canvas?.id !== TARGET_CANVAS_ID || args.length !== 8) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insideHeroRegion(sx, sy, sw, sh)) {
      return previousDrawImage.call(this, image, ...args);
    }

    const debug = debugState();
    syncHud(debug);
    const playing = debug?.mode === "play";
    const transforming = playing && !debug?.transformDone && isTransformFrame(sx, sy, sw, sh);
    const now = performance.now();
    const cx = dx + dw / 2;
    const cy = dy + dh / 2 - 5;

    if (transforming) {
      sawTransform = true;
      completionAt = 0;
      const progress = progressFromDrawSize(dw, dh);
      drawCharge(this, cx, cy, dw, dh, progress, now);
      drawCanonicalShall(this, cx, cy - 2, progress);
      drawMorphBands(this, cx, cy, progress);
      return drawNativeTransform(this, image, args, progress);
    }

    const result = previousDrawImage.call(this, image, ...args);

    if (playing && debug?.transformDone && sawTransform) {
      if (!completionAt) completionAt = now;
      const alive = drawCompletion(this, cx, cy, now - completionAt);
      if (!alive) {
        sawTransform = false;
        completionAt = 0;
      }
    } else if (!playing) {
      completionAt = 0;
    }

    return result;
  }

  parityDrawImage.__shallStage4TransformParity = true;
  proto.drawImage = parityDrawImage;
  proto.__shallStage4TransformParityInstalled = true;

  window.__shallStage4TransformParity = Object.freeze({
    language: "canonical-shall-morph-mexilhao",
    transformSource: TRANSFORM_SOURCE.slice(),
    canonicalSource: CANONICAL_SHALL_SRC,
    stages: ["canonical-shall", "compression-crossfade", "mexilhao-reveal"],
    reducedMotion,
    gameplayWrites: false,
  });
})();
