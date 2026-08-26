(() => {
  "use strict";

  /*
   * Fase 4 — paridade de escala do Shall com Fases 1–3.
   *
   * O jogo-base desenha Shall dentro de uma presença visual próxima de 124px,
   * independentemente do frame. A Fase 4 usava o recorte bruto de cada pose
   * multiplicado por 1.15, fazendo idle, natação, tiro, dash e dano mudarem
   * bastante de tamanho aparente. Este wrapper atua somente no canvas da Fase 4
   * e somente nos recortes do atlas reservados ao herói. Hitbox e física não mudam.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4HeroParityInstalled) return;

  const nativeDrawImage = proto.drawImage;
  const HERO_REGION = { x: 137, y: 0, w: 80, h: 60 };
  const TARGET_MAX = 124;
  const MAX_UPSCALE = 1.85;
  const Y_BIAS = -5;

  function insideHeroRegion(sx, sy, sw, sh) {
    const epsilon = 1;
    return sx >= HERO_REGION.x - epsilon &&
      sy >= HERO_REGION.y - epsilon &&
      sx + sw <= HERO_REGION.x + HERO_REGION.w + epsilon &&
      sy + sh <= HERO_REGION.y + HERO_REGION.h + epsilon;
  }

  function parityDrawImage(image, ...args) {
    if (this.canvas?.id !== "stage4-canvas" || args.length !== 8) {
      return nativeDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insideHeroRegion(sx, sy, sw, sh)) {
      return nativeDrawImage.call(this, image, ...args);
    }

    const currentMax = Math.max(Math.abs(dw), Math.abs(dh));
    if (!Number.isFinite(currentMax) || currentMax <= 0) {
      return nativeDrawImage.call(this, image, ...args);
    }

    const scale = Math.min(MAX_UPSCALE, Math.max(1, TARGET_MAX / currentMax));
    const newW = Math.round(dw * scale);
    const newH = Math.round(dh * scale);
    const centerX = dx + dw / 2;
    const centerY = dy + dh / 2;
    const newX = Math.round(centerX - newW / 2);
    const newY = Math.round(centerY - newH / 2 + Y_BIAS);

    return nativeDrawImage.call(this, image, sx, sy, sw, sh, newX, newY, newW, newH);
  }

  parityDrawImage.__shallStage4HeroParity = true;
  proto.drawImage = parityDrawImage;
  proto.__shallStage4HeroParityInstalled = true;
})();