(() => {
  "use strict";

  /*
   * Fase 4 — paridade visual dos inimigos aquáticos com Fases 1–3.
   *
   * Nas fases-base, inimigos comuns são desenhados bem maiores que suas hitboxes
   * (aprox. 70–104 px; elites chegam a 126 px) e recebem sombra local para manter
   * leitura no mobile. A Fase 4 desenhava água-vivas, baiacus, enguias e caranguejos
   * quase no tamanho da hitbox (aprox. 47–73 px), fazendo-os parecer de outro jogo.
   * Este wrapper amplia somente a região de inimigos do atlas da Fase 4 e mantém
   * física, dano e colisões intactos.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4EnemyParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const ENEMY_REGION = { x: 137, y: 62, w: 80, h: 60 };
  const PROFILES = {
    jelly: { scale: 1.68, yBias: -3, shadow: 0.28 },
    puffer: { scale: 1.82, yBias: -2, shadow: 0.3 },
    crab: { scale: 1.66, yBias: 4, shadow: 0.34 },
    eel: { scale: 1.56, yBias: -1, shadow: 0.26 },
  };

  function insideEnemyRegion(sx, sy, sw, sh) {
    const epsilon = 1;
    return sx >= ENEMY_REGION.x - epsilon &&
      sy >= ENEMY_REGION.y - epsilon &&
      sx + sw <= ENEMY_REGION.x + ENEMY_REGION.w + epsilon &&
      sy + sh <= ENEMY_REGION.y + ENEMY_REGION.h + epsilon;
  }

  function profileFor(dw, dh) {
    const width = Math.abs(dw);
    const height = Math.abs(dh);
    if (!Number.isFinite(width) || !Number.isFinite(height) || height <= 0) return null;
    const ratio = width / height;
    if (ratio < 1.08) return PROFILES.jelly;
    if (ratio < 1.45) return PROFILES.puffer;
    if (ratio < 1.95) return PROFILES.crab;
    return PROFILES.eel;
  }

  function drawEnemyParity(image, ...args) {
    if (this.canvas?.id !== "stage4-canvas" || args.length !== 8) {
      return previousDrawImage.call(this, image, ...args);
    }

    const [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    if (!insideEnemyRegion(sx, sy, sw, sh)) {
      return previousDrawImage.call(this, image, ...args);
    }

    const profile = profileFor(dw, dh);
    if (!profile) return previousDrawImage.call(this, image, ...args);

    const newW = Math.round(dw * profile.scale);
    const newH = Math.round(dh * profile.scale);
    const centerX = dx + dw / 2;
    const centerY = dy + dh / 2;
    const newX = Math.round(centerX - newW / 2);
    const newY = Math.round(centerY - newH / 2 + profile.yBias);

    // A sombra local replica a separação de silhueta usada nas Fases 1–3,
    // adaptada ao ambiente aquático como uma pequena sombra de profundidade.
    this.save();
    this.globalAlpha *= profile.shadow;
    this.fillStyle = "#020309";
    this.beginPath();
    this.ellipse(
      Math.round(centerX),
      Math.round(newY + newH * 0.78),
      Math.max(14, Math.round(newW * 0.34)),
      5,
      0,
      0,
      Math.PI * 2,
    );
    this.fill();
    this.restore();

    return previousDrawImage.call(this, image, sx, sy, sw, sh, newX, newY, newW, newH);
  }

  drawEnemyParity.__shallStage4EnemyParity = true;
  proto.drawImage = drawEnemyParity;
  proto.__shallStage4EnemyParityInstalled = true;
})();
