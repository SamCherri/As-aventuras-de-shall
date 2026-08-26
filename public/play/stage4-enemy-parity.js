(() => {
  "use strict";

  /*
   * Fase 4 — paridade visual dos inimigos aquáticos com Fases 1–3.
   *
   * Nas fases-base, os inimigos não são sprites rígidos: além de serem maiores
   * que a hitbox, o render aplica squash/stretch, passo, peso e uma sombra local.
   * A Fase 4 já normaliza a escala aqui; este passe também adiciona uma linguagem
   * de movimento por família sem tocar em IA, hitbox, dano, velocidade ou física.
   */

  const proto = window.CanvasRenderingContext2D?.prototype;
  if (!proto || proto.__shallStage4EnemyParityInstalled) return;

  const previousDrawImage = proto.drawImage;
  const ENEMY_REGION = { x: 137, y: 62, w: 80, h: 60 };
  const PROFILES = {
    jelly: {
      scale: 1.68, yBias: -3, shadow: 0.28,
      cadence: 0.0048, bob: 5.2, stretchX: 0.025, stretchY: 0.065, lean: 0.02,
    },
    puffer: {
      scale: 1.82, yBias: -2, shadow: 0.3,
      cadence: 0.0038, bob: 3.2, stretchX: 0.07, stretchY: 0.045, lean: 0.018,
    },
    crab: {
      scale: 1.66, yBias: 4, shadow: 0.34,
      cadence: 0.0105, bob: 1.4, stretchX: 0.065, stretchY: 0.045, lean: 0.038,
    },
    eel: {
      scale: 1.56, yBias: -1, shadow: 0.26,
      cadence: 0.0065, bob: 4.1, stretchX: 0.055, stretchY: 0.028, lean: 0.085,
    },
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

  function phaseSeed(context, centerX, centerY) {
    let x = centerX;
    let y = centerY;
    if (typeof context.getTransform === "function") {
      const matrix = context.getTransform();
      x = matrix.a * centerX + matrix.c * centerY + matrix.e;
      y = matrix.b * centerX + matrix.d * centerY + matrix.f;
    }
    return (x * 0.031 + y * 0.047) % (Math.PI * 2);
  }

  function motionFor(profile, now, seed) {
    const wave = Math.sin(now * profile.cadence + seed);
    const counter = Math.sin(now * profile.cadence * 0.63 + seed * 1.73);
    const step = Math.abs(wave);

    if (profile === PROFILES.crab) {
      return {
        x: 1 + step * profile.stretchX,
        y: 1 - step * profile.stretchY,
        bob: -step * profile.bob,
        lean: wave * profile.lean,
      };
    }

    if (profile === PROFILES.puffer) {
      const inflate = 0.5 + 0.5 * wave;
      return {
        x: 1 + inflate * profile.stretchX,
        y: 1 + inflate * profile.stretchY,
        bob: counter * profile.bob,
        lean: counter * profile.lean,
      };
    }

    if (profile === PROFILES.eel) {
      return {
        x: 1 + step * profile.stretchX,
        y: 1 - wave * profile.stretchY,
        bob: counter * profile.bob,
        lean: wave * profile.lean,
      };
    }

    return {
      x: 1 - wave * profile.stretchX,
      y: 1 + wave * profile.stretchY,
      bob: counter * profile.bob,
      lean: wave * profile.lean,
    };
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
    const centerY = dy + dh / 2 + profile.yBias;
    const seed = phaseSeed(this, centerX, centerY);
    const motion = motionFor(profile, performance.now(), seed);

    // A sombra fica estável enquanto o corpo respira/nada, reforçando peso e
    // separação de silhueta como nas fases-base sem sugerir uma nova hitbox.
    this.save();
    this.globalAlpha *= profile.shadow;
    this.fillStyle = "#020309";
    this.beginPath();
    this.ellipse(
      Math.round(centerX),
      Math.round(centerY + newH * 0.36),
      Math.max(14, Math.round(newW * 0.34 * (0.96 + (motion.x - 1) * 0.5))),
      5,
      0,
      0,
      Math.PI * 2,
    );
    this.fill();
    this.restore();

    // Movimento visual apenas: água-viva pulsa, baiacu respira, caranguejo
    // "scuttles" e enguia ondula. A posição lógica continua intacta.
    this.save();
    this.translate(centerX, centerY + motion.bob);
    this.rotate(motion.lean);
    this.scale(motion.x, motion.y);
    const result = previousDrawImage.call(
      this,
      image,
      sx,
      sy,
      sw,
      sh,
      -Math.round(newW / 2),
      -Math.round(newH / 2),
      newW,
      newH,
    );
    this.restore();
    return result;
  }

  drawEnemyParity.__shallStage4EnemyParity = true;
  proto.drawImage = drawEnemyParity;
  proto.__shallStage4EnemyParityInstalled = true;
})();
