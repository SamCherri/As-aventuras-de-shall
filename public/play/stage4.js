(() => {
  "use strict";

  const canvas = document.querySelector("#stage4-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = 480, H = 560;
  const WORLD_END = 6100, BOSS_START = 5450, ARENA_LEFT = 5580;
  const WATER_TOP = 58, WATER_BOTTOM = 505, POTAVIO_MAX_HEALTH = 300;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const ui = {
    intro: document.querySelector("#stage4-intro"), start: document.querySelector("#stage4-start"),
    win: document.querySelector("#stage4-win"), replay: document.querySelector("#stage4-replay"),
    gameOver: document.querySelector("#stage4-gameover"), retry: document.querySelector("#stage4-retry"),
    lifeFill: document.querySelector("#stage4-life-fill"), lifeText: document.querySelector("#stage4-life-text"),
    shells: document.querySelector("#stage4-shells"), sound: document.querySelector("#stage4-sound"),
    zone: document.querySelector("#stage4-zone"), current: document.querySelector("#stage4-current"),
    toast: document.querySelector("#stage4-toast"), bossHud: document.querySelector("#stage4-boss-hud"),
    bossFill: document.querySelector("#stage4-boss-fill"), bossPhase: document.querySelector("#stage4-boss-phase"),
    waterFill: document.querySelector("#stage4-water-fill"), waterText: document.querySelector("#stage4-water-text"),
  };

  /*
    Atlas real da Fase 4.
    Ele reúne as artes geradas para Shall Mexilhãozinho, Água pOtávio,
    inimigos, tiles, background, midground, foreground e VFX. O PNG é
    transportado em partes Base64 porque o pipeline do repositório é textual.
  */
  const ART_PARTS = Array.from({ length: 14 }, (_, i) =>
    `./assets/stage4/art-atlas.b64.${String(i).padStart(2, "0")}.txt?v=38`
  );
  const ATLAS = {
    far: [0, 0, 133, 44], mid: [0, 46, 133, 44], fore: [0, 92, 133, 44],
    tiles: [0, 138, 80, 60], vfx: [82, 138, 80, 60],
    hero: [137, 0, 80, 60], potavio: [218, 0, 80, 60], enemies: [137, 62, 80, 60],
  };
  let art = null, artReady = false, artError = false;

  async function loadArt() {
    try {
      const chunks = await Promise.all(ART_PARTS.map(async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`asset ${response.status}: ${url}`);
        return (await response.text()).trim();
      }));
      const image = new Image();
      image.src = `data:image/png;base64,${chunks.join("")}`;
      if (image.decode) await image.decode();
      else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
      art = image; artReady = true;
      document.documentElement.classList.add("stage4-art-ready");
      return image;
    } catch (error) {
      artError = true;
      console.warn("Stage 4 art atlas fallback:", error);
      return null;
    }
  }
  const artPromise = loadArt();

  function atlasDraw(region, sx,  