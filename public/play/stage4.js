(() => {
  "use strict";

  const canvas = document.querySelector("#stage4-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_END = 6900;
  const BOSS_START = 5580;
  const ARENA_LEFT = 5650;
  const WATER_TOP = 58;
  const WATER_BOTTOM = 505;
  const POTAVIO_MAX_HEALTH = 300;

  const ui = {
    intro: document.querySelector("#stage4-intro"),
    start: document.querySelector("#stage4-start"),
    win: document.querySelector("#stage4-win"),
    replay: document.querySelector("#stage4-replay"),
    gameOver: document.querySelector("#stage4-gameover"),
    retry: document.querySelector("#stage4-retry"),
    lifeFill: document.querySelector("#stage4-life-fill"),
    lifeText: document.querySelector("#stage4-life-text"),
    shells: document.querySelector("#stage4-shells"),
    sound: document.querySelector("#stage4-sound"),
    zone: document.querySelector("#stage4-zone"),
    current: document.querySelector("#stage4-current"),
    toast: document.querySelector("#stage4-toast"),
    bossHud: document.querySelector("#stage4-boss-hud"),
    bossFill: document.querySelector("#stage4-boss-fill"),
    bossPhase: document.querySelector("#stage4-boss-phase"),
    waterFill: document.querySelector("#stage4-water-fill"),
    waterText: document.querySelector("#stage4-water-text"),
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const center = (body) => ({ x: body.x + body.w / 2, y: body.y + body.h / 2 });

  const input = { left: false, right: false, swim: false, shoot: false, dash: false };
  const activePointers = new Map();
  let mode = "intro";
  let previousTime = performance.now();
  let gameTime = 0;
  let camera = 0;
  let screenShake = 0;
  let flash = 0;
  let toastUntil = 0;
  let toastMessage = "";
  let zoneIndex = -1;
  let shells = 0;
  let transformTimer = 0;
  let transformDone = false;
  let bossBannerTimer = 0;
  let muted = localStorage.getItem("shall-muted") === "true";

  let audioContext = null;
  let masterGain = null;
  let lastMusicBeat = 0;
  let musicStep = 0;

  const hero = {
    x: 105, y: 115, w: 54, h: 68,
    vx: 0, vy: 0, face: 1,
    health: 100, invincible: 0,
    shootCooldown: 0, dashCooldown: 0, dashTimer: 0,
    swimCycle: 0,
  };

  const zones = [
    { x: 0, label: "ENTRADA DO CANAL", current: "CALMA" },
    { x: 980, label: "CORREDOR DAS BOLHAS", current: "↗ SUAVE" },
    { x: 2200, label: "FENDA DA CORRENTEZA", current: "→ FORTE" },
    { x: 3550, label: "GRUTA DO MEXILHÃO", current: "↙ REVERSA" },
    { x: 4680, label: "RESERVATÓRIO pOtÁVIO", current: "↑ PRESSÃO" },
    { x: BOSS_START, label: "ARENA DO GALÃO", current: "INSTÁVEL" },
  ];

  const currents = [
    { x: 1040, y: 105, w: 660, h: 290, fx: 92, fy: -38, color: "#7ae8ee" },
    { x: 2260, y: 90, w: 770, h: 350, fx: 170, fy: 8, color: "#5ed3ed" },
    { x: 3620, y: 130, w: 620, h: 310, fx: -118, fy: 56, color: "#8adfe9" },
    { x: 4740, y: 92, w: 610, h: 340, fx: 32, fy: -142, color: "#78e6ff" },
  ];

  const reefs = [
    { x: 620, y: WATER_TOP, w: 130, h: 150, side: "top" },
    { x: 850, y: 390, w: 165, h: WATER_BOTTOM - 390, side: "bottom" },
    { x: 1420, y: WATER_TOP, w: 185, h: 135, side: "top" },
    { x: 1810, y: 345, w: 155, h: 160, side: "bottom" },
    { x: 2460, y: WATER_TOP, w: 120, h: 180, side: "top" },
    { x: 2870, y: 355, w: 185, h: 150, side: "bottom" },
    { x: 3280, y: WATER_TOP, w: 145, h: 145, side: "top" },
    { x: 3910, y: 365, w: 175, h: 140, side: "bottom" },
    { x: 4330, y: WATER_TOP, w: 130, h: 185, side: "top" },
    { x: 4920, y: 350, w: 160, h: 155, side: "bottom" },
  ];

  const enemySeed = [
    ["jelly", 520, 285], ["puffer", 920, 210], ["jelly", 1280, 350],
    ["eel", 1690, 220], ["puffer", 2050, 390], ["jelly", 2390, 310],
    ["eel", 2760, 165], ["puffer", 3160, 285], ["jelly", 3470, 405],
    ["eel", 3820, 250], ["puffer", 4210, 150], ["jelly", 4540, 330],
    ["eel", 4870, 235], ["puffer", 5230, 400], ["jelly", 5440, 170],
  ];

  const shellSeed = [
    [390, 250], [720, 300], [1110, 170], [1510, 320], [1920, 220], [2310, 390],
    [2690, 130], [3050, 290], [3370, 390], [3740, 175], [4110, 330], [4470, 220],
    [4820, 145], [5140, 310], [5420, 390],
  ];

  let enemies = [];
  let collectibles = [];
  let marbles = [];
  let waterShots = [];
  let waves = [];
  let particles = [];
  let bubbles = [];

  const boss = {
    active: false,
    x: 6440, y: 208, w: 150, h: 188,
    health: POTAVIO_MAX_HEALTH,
    maxHealth: POTAVIO_MAX_HEALTH,
    water: 100,
    phase: 1,
    state: "idle",
    timer: 0,
    attackTimer: 1.4,
    shotIndex: 0,
    face: -1,
    flash: 0,
    jetY: 0,
    jetHitCooldown: 0,
    vulnerablePulse: 0,
  };

  function initAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      audioContext = new AudioCtor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.42;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume();
  }

  function tone(freq, duration = 0.07, type = "square", volume = 0.035, delay = 0) {
    if (muted || !audioContext || !masterGain) return;
    const start = audioContext.currentTime + delay;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(masterGain);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function sfx(name) {
    if (name === "shoot") { tone(610, .045, "square", .035); tone(880, .04, "triangle", .018, .025); }
    if (name === "hit") { tone(92, .16, "sawtooth", .05); }
    if (name === "shell") { tone(790, .07, "square", .03); tone(1185, .08, "triangle", .025, .055); }
    if (name === "dash") { tone(190, .12, "sawtooth", .04); tone(380, .08, "square", .018, .045); }
    if (name === "boss") { tone(82, .2, "sawtooth", .055); tone(123, .22, "square", .03, .09); }
  }

  function updateMusic(now) {
    if (muted || !audioContext || mode === "intro" || mode === "gameover") return;
    const bossMode = boss.active;
    const stepMs = bossMode ? 102 : 138;
    if (now - lastMusicBeat < stepMs) return;
    lastMusicBeat = now;
    const waterMelody = [294, 370, 440, 494, 587, 494, 440, 370, 330, 392, 494, 659, 587, 494, 440, 392];
    const battle = [220, 277, 330, 415, 370, 330, 277, 247, 220, 330, 415, 494, 440, 370, 330, 277];
    const melody = bossMode ? battle : waterMelody;
    const note = melody[musicStep % melody.length];
    const phaseBoost = bossMode ? boss.phase - 1 : 0;
    tone(note * (1 + phaseBoost * .03), .085, bossMode ? "sawtooth" : "triangle", bossMode ? .022 : .017);
    if (musicStep % 2 === 0) tone((bossMode ? 55 : 73) * (musicStep % 8 < 4 ? 1 : 1.25), .15, "triangle", .02);
    if (musicStep % 4 === 0) tone(note / 2, .18, "sine", .012);
    if (bossMode && boss.phase === 3 && musicStep % 2 === 1) tone(note * 2, .04, "square", .009, .025);
    musicStep += 1;
  }

  function notify(message, duration = 1800) {
    toastMessage = message;
    toastUntil = performance.now() + duration;
  }

  function renderToast(now) {
    const visible = now < toastUntil;
    ui.toast.hidden = !visible;
    if (visible) ui.toast.textContent = toastMessage;
  }

  function updateHud() {
    ui.lifeFill.style.width = `${hero.health}%`;
    ui.lifeFill.classList.toggle("low", hero.health <= 35);
    ui.lifeText.textContent = `${hero.health} / 100`;
    ui.shells.textContent = String(shells).padStart(3, "0");
    const percent = clamp((boss.health / boss.maxHealth) * 100, 0, 100);
    ui.bossFill.style.width = `${percent}%`;
    ui.bossPhase.textContent = `NÍVEL ${boss.phase}`;
    ui.waterFill.style.width = `${boss.water}%`;
    ui.waterText.textContent = `${Math.round(boss.water)}%`;
  }

  function makeEnemy([type, x, y], index) {
    const size = type === "jelly" ? [48, 48] : type === "puffer" ? [45, 40] : [62, 28];
    return { type, x, baseX: x, y, baseY: y, w: size[0], h: size[1], alive: true, phase: index * .91, dir: index % 2 ? -1 : 1, speed: type === "eel" ? 82 : type === "puffer" ? 54 : 32, flash: 0 };
  }

  function resetWorld() {
    hero.x = 105; hero.y = 105; hero.vx = 0; hero.vy = 75; hero.face = 1;
    hero.health = 100; hero.invincible = 0; hero.shootCooldown = 0; hero.dashCooldown = 0; hero.dashTimer = 0; hero.swimCycle = 0;
    camera = 0; gameTime = 0; shells = 0; zoneIndex = -1; screenShake = 0; flash = 0;
    transformTimer = 2.45; transformDone = false; bossBannerTimer = 0;
    enemies = enemySeed.map(makeEnemy);
    collectibles = shellSeed.map(([x, y]) => ({ x, y, r: 12, collected: false, phase: x * .01 }));
    marbles = []; waterShots = []; waves = []; particles = [];
    bubbles = Array.from({ length: 34 }, (_, i) => ({ x: Math.random() * WORLD_END, y: WATER_TOP + Math.random() * 430, r: 1 + (i % 4), speed: 13 + (i % 6) * 5, phase: Math.random() * Math.PI * 2 }));
    Object.assign(boss, {
      active: false, x: 6440, y: 208, health: POTAVIO_MAX_HEALTH, maxHealth: POTAVIO_MAX_HEALTH,
      water: 100, phase: 1, state: "idle", timer: 0, attackTimer: 1.4, shotIndex: 0,
      face: -1, flash: 0, jetY: 0, jetHitCooldown: 0, vulnerablePulse: 0,
    });
    ui.bossHud.hidden = true;
    ui.win.hidden = true;
    ui.gameOver.hidden = true;
    updateHud();
    updateZone(true);
  }

  function startGame() {
    initAudio();
    resetWorld();
    mode = "play";
    ui.intro.hidden = true;
    previousTime = performance.now();
    notify("MERGULHO INICIADO — A FÍSICA AGORA É AQUÁTICA", 2500);
  }

  function showGameOver() {
    if (mode !== "play") return;
    mode = "gameover";
    Object.keys(input).forEach((key) => { input[key] = false; });
    ui.gameOver.hidden = false;
    sfx("hit");
  }

  function showWin() {
    mode = "win";
    Object.keys(input).forEach((key) => { input[key] = false; });
    ui.bossHud.hidden = true;
    ui.win.hidden = false;
    notify("ÁGUA pOtÁVIO FICOU SEM PRESSÃO!", 2800);
    tone(523, .18, "triangle", .035);
    tone(659, .2, "triangle", .035, .12);
    tone(784, .28, "triangle", .04, .25);
  }

  function damageHero(amount, sourceX) {
    if (hero.invincible > 0 || mode !== "play") return;
    hero.health = clamp(hero.health - amount, 0, 100);
    hero.invincible = 1;
    hero.vx += sourceX < hero.x ? 185 : -185;
    hero.vy -= 70;
    screenShake = Math.max(screenShake, 7);
    flash = Math.max(flash, .15);
    burst(hero.x + hero.w / 2, hero.y + hero.h / 2, "#ff7180", 12, 150);
    sfx("hit");
    updateHud();
    if (hero.health <= 0) showGameOver();
  }

  function burst(x, y, color, count = 8, speed = 100) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * i / count + Math.random() * .4;
      const force = speed * (.45 + Math.random() * .65);
      particles.push({ x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, life: .35 + Math.random() * .4, maxLife: .75, color, size: 2 + Math.random() * 3 });
    }
  }

  function currentAt(body) {
    const middle = center(body);
    return currents.find((zone) => middle.x >= zone.x && middle.x <= zone.x + zone.w && middle.y >= zone.y && middle.y <= zone.y + zone.h) || null;
  }

  function updateZone(force = false) {
    let next = 0;
    for (let i = 0; i < zones.length; i += 1) if (hero.x >= zones[i].x) next = i;
    if (!force && next === zoneIndex) return;
    zoneIndex = next;
    ui.zone.textContent = zones[next].label;
    ui.current.textContent = zones[next].current;
    if (!force) notify(zones[next].label, 1700);
  }

  function fireMarble() {
    if (mode !== "play" || hero.shootCooldown > 0 || marbles.length >= 8 || !transformDone) return;
    hero.shootCooldown = .28;
    const direction = hero.face;
    marbles.push({ x: hero.x + hero.w / 2 + direction * 22, y: hero.y + 29, w: 11, h: 11, vx: direction * 420 + hero.vx * .22, vy: clamp(hero.vy * .18 + (input.swim ? -45 : 0), -90, 80), life: 1.8, rotation: 0 });
    burst(hero.x + hero.w / 2 + direction * 25, hero.y + 34, "#bff8ff", 5, 70);
    sfx("shoot");
  }

  function triggerDash() {
    if (mode !== "play" || hero.dashCooldown > 0 || !transformDone) return;
    hero.dashCooldown = 1.25;
    hero.dashTimer = .22;
    hero.vx = hero.face * 520;
    hero.vy *= .45;
    hero.invincible = Math.max(hero.invincible, .18);
    screenShake = Math.max(screenShake, 3);
    burst(hero.x + hero.w / 2 - hero.face * 20, hero.y + hero.h / 2, "#69d9f2", 12, 155);
    sfx("dash");
  }

  function resolveReefCollisions(oldX, oldY) {
    for (const reef of reefs) {
      if (!overlap(hero, reef)) continue;
      const cameFromLeft = oldX + hero.w <= reef.x + 4;
      const cameFromRight = oldX >= reef.x + reef.w - 4;
      const cameFromTop = oldY + hero.h <= reef.y + 5;
      const cameFromBottom = oldY >= reef.y + reef.h - 5;
      if (cameFromLeft) { hero.x = reef.x - hero.w; hero.vx = Math.min(0, hero.vx) * -.25; }
      else if (cameFromRight) { hero.x = reef.x + reef.w; hero.vx = Math.max(0, hero.vx) * -.25; }
      else if (cameFromTop) { hero.y = reef.y - hero.h; hero.vy = Math.min(0, hero.vy) * -.25; }
      else if (cameFromBottom) { hero.y = reef.y + reef.h; hero.vy = Math.max(0, hero.vy) * -.25; }
      else { hero.x = oldX; hero.y = oldY; hero.vx *= -.18; hero.vy *= -.18; }
      damageHero(7, reef.x + reef.w / 2);
      return;
    }
  }

  function updateHero(dt) {
    hero.invincible = Math.max(0, hero.invincible - dt);
    hero.shootCooldown = Math.max(0, hero.shootCooldown - dt);
    hero.dashCooldown = Math.max(0, hero.dashCooldown - dt);
    hero.dashTimer = Math.max(0, hero.dashTimer - dt);

    if (!transformDone) {
      transformTimer -= dt;
      hero.vy += 40 * dt;
      hero.y += hero.vy * dt;
      hero.x += 26 * dt;
      hero.y = Math.min(hero.y, 255);
      if (transformTimer <= 0) {
        transformDone = true;
        hero.y = 248;
        hero.vy = 0;
        burst(hero.x + hero.w / 2, hero.y + hero.h / 2, "#80ecff", 28, 220);
        notify("TRANSFORMAÇÃO: SHALL MEXILHÃOZINHO! SEGURE NADAR PARA SUBIR", 3200);
        tone(659, .16, "square", .035);
        tone(988, .2, "triangle", .03, .1);
      }
      return;
    }

    const oldX = hero.x;
    const oldY = hero.y;
    const accel = hero.dashTimer > 0 ? 0 : 610;
    if (input.left) { hero.vx -= accel * dt; hero.face = -1; }
    if (input.right) { hero.vx += accel * dt; hero.face = 1; }

    if (input.swim) {
      hero.vy -= 610 * dt;
      hero.swimCycle += dt * 7;
      if (Math.floor(gameTime * 14) % 5 === 0) burst(hero.x + hero.w / 2 - hero.face * 15, hero.y + hero.h - 12, "#b5f7ff", 2, 32);
    } else {
      hero.vy += 76 * dt;
    }

    const activeCurrent = currentAt(hero);
    if (activeCurrent) {
      hero.vx += activeCurrent.fx * dt;
      hero.vy += activeCurrent.fy * dt;
    }

    if (hero.dashTimer <= 0) {
      hero.vx *= Math.pow(.17, dt);
      hero.vy *= Math.pow(.28, dt);
    } else {
      hero.vx *= Math.pow(.62, dt);
    }

    hero.vx = clamp(hero.vx, -290, hero.dashTimer > 0 ? 540 : 290);
    hero.vy = clamp(hero.vy, -275, 205);
    hero.x += hero.vx * dt;
    hero.y += hero.vy * dt;

    const minX = boss.active ? ARENA_LEFT + 20 : 0;
    hero.x = clamp(hero.x, minX, WORLD_END - hero.w - 18);
    if (hero.y < WATER_TOP) { hero.y = WATER_TOP; hero.vy = Math.max(30, -hero.vy * .25); }
    if (hero.y + hero.h > WATER_BOTTOM) { hero.y = WATER_BOTTOM - hero.h; hero.vy = Math.min(-25, -hero.vy * .22); }

    if (!boss.active) resolveReefCollisions(oldX, oldY);
    if (input.shoot) fireMarble();
    if (input.dash) triggerDash();
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.flash = Math.max(0, enemy.flash - dt);
      if (enemy.type === "jelly") {
        enemy.y = enemy.baseY + Math.sin(gameTime * 2.8 + enemy.phase) * 70;
        enemy.x += Math.sin(gameTime * 1.2 + enemy.phase) * 11 * dt;
      } else if (enemy.type === "puffer") {
        const chase = Math.abs(hero.x - enemy.x) < 260 ? Math.sign(hero.x - enemy.x) : enemy.dir;
        enemy.x += chase * enemy.speed * dt;
        enemy.y = enemy.baseY + Math.sin(gameTime * 3.8 + enemy.phase) * 32;
      } else {
        enemy.x += enemy.dir * enemy.speed * dt;
        enemy.y = enemy.baseY + Math.sin(gameTime * 4.4 + enemy.phase) * 24;
        if (Math.abs(enemy.x - enemy.baseX) > 120) enemy.dir *= -1;
      }
      if (overlap(hero, enemy)) damageHero(enemy.type === "eel" ? 18 : 14, enemy.x);
    }
  }

  function updateCollectibles() {
    for (const item of collectibles) {
      if (item.collected) continue;
      const dx = hero.x + hero.w / 2 - item.x;
      const dy = hero.y + hero.h / 2 - item.y;
      if (Math.hypot(dx, dy) < 34) {
        item.collected = true;
        shells += 1;
        if (shells % 5 === 0) hero.health = clamp(hero.health + 12, 0, 100);
        burst(item.x, item.y, "#ffe88a", 10, 110);
        sfx("shell");
        updateHud();
        notify(shells % 5 === 0 ? "5 CONCHAS — +12 DE ENERGIA" : `CONCHA ${shells}`, 900);
      }
    }
  }

  function spawnWaterShot(kind = "shot", offset = 0) {
    const originX = boss.x + 12;
    const originY = boss.y + 93 + offset;
    const targetX = hero.x + hero.w / 2;
    const targetY = hero.y + hero.h / 2;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const speed = kind === "fast" ? 390 : 300 + boss.phase * 24;
    waterShots.push({ x: originX, y: originY, w: kind === "fast" ? 28 : 20, h: kind === "fast" ? 14 : 18, vx: dx / length * speed, vy: dy / length * speed, life: 4, kind, damage: kind === "fast" ? 17 : 12 + boss.phase * 2, phase: Math.random() * 6 });
    boss.water = Math.max(0, boss.water - (kind === "fast" ? 2.8 : 1.8));
  }

  function spawnFan() {
    [-95, 0, 95].forEach((offset, index) => {
      const speed = 330 + index * 22;
      waterShots.push({ x: boss.x + 8, y: boss.y + 90, w: 24, h: 16, vx: -speed, vy: offset, life: 4, kind: "fan", damage: 14 + boss.phase, phase: index });
    });
    boss.water = Math.max(0, boss.water - 5.4);
  }

  function beginBossState(next) {
    boss.state = next;
    boss.timer = 0;
    if (next === "jet_charge") {
      boss.jetY = clamp(hero.y + hero.h / 2, WATER_TOP + 35, WATER_BOTTOM - 35);
      notify("JATO PRESSURIZADO — MUDE DE ALTURA!", 1600);
      tone(110, .24, "sawtooth", .035);
    }
    if (next === "jet") {
      boss.water = Math.max(0, boss.water - 14);
      screenShake = Math.max(screenShake, 6);
    }
    if (next === "sneeze_charge") {
      notify("ESPIRO D'ÁGUA! PROCURE O VÃO DA ONDA!", 1800);
      tone(82, .3, "sawtooth", .04);
    }
    if (next === "sneeze") {
      const gapY = 135 + (boss.shotIndex % 3) * 105;
      waves.push({ x: boss.x - 20, y: WATER_TOP + 10, w: 82, h: WATER_BOTTOM - WATER_TOP - 20, vx: -235, life: 5, gapY, gapH: 88, phase: boss.shotIndex++ });
      boss.water = Math.max(0, boss.water - 9);
      screenShake = Math.max(screenShake, 9);
    }
  }

  function phaseForBoss() {
    if (boss.water <= 27 || boss.health <= 95) return 3;
    if (boss.water <= 62 || boss.health <= 200) return 2;
    return 1;
  }

  function activateBoss() {
    if (boss.active) return;
    boss.active = true;
    boss.state = "intro";
    boss.timer = 0;
    boss.attackTimer = 1.1;
    bossBannerTimer = 3;
    ui.bossHud.hidden = false;
    waterShots = [];
    enemies.forEach((enemy) => { if (enemy.x > ARENA_LEFT - 120) enemy.alive = false; });
    notify("CHEFÃO DA FASE 4 — ÁGUA pOtÁVIO", 2600);
    sfx("boss");
    updateHud();
  }

  function updateBoss(dt) {
    if (!boss.active) {
      if (hero.x > BOSS_START) activateBoss();
      return;
    }
    boss.timer += dt;
    boss.flash = Math.max(0, boss.flash - dt);
    boss.jetHitCooldown = Math.max(0, boss.jetHitCooldown - dt);
    boss.vulnerablePulse = Math.max(0, boss.vulnerablePulse - dt);
    boss.water = Math.max(0, boss.water - dt * (boss.phase === 3 ? .22 : .08));
    const nextPhase = phaseForBoss();
    if (nextPhase > boss.phase) {
      boss.phase = nextPhase;
      boss.vulnerablePulse = 1.4;
      screenShake = Math.max(screenShake, 8);
      notify(boss.phase === 2 ? "O GALÃO ESTÁ BAIXANDO — PRESSÃO NÍVEL 2!" : "GALÃO QUASE SECO — A BARRIGA ESTÁ MURCHANDO!", 2600);
      sfx("boss");
    }

    if (boss.state === "intro") {
      boss.x = 6440;
      boss.y = 205 + Math.sin(boss.timer * 2.4) * 6;
      if (boss.timer > 1.9) beginBossState("combat");
      return;
    }

    if (boss.state === "jet_charge") {
      if (boss.timer >= .72) beginBossState("jet");
      return;
    }
    if (boss.state === "jet") {
      const beam = { x: ARENA_LEFT, y: boss.jetY - 34, w: boss.x - ARENA_LEFT + 28, h: 68 };
      if (overlap(hero, beam) && boss.jetHitCooldown <= 0) {
        boss.jetHitCooldown = .42;
        damageHero(16 + boss.phase * 2, boss.x);
        hero.vx -= 170;
      }
      if (boss.timer >= 1.35) beginBossState("combat");
      return;
    }
    if (boss.state === "sneeze_charge") {
      if (boss.timer >= .72) beginBossState("sneeze");
      return;
    }
    if (boss.state === "sneeze") {
      if (boss.timer >= .45) beginBossState("combat");
      return;
    }
    if (boss.state === "defeated") {
      boss.y += Math.sin(boss.timer * 20) * 2;
      boss.x += 82 * dt;
      if (boss.timer > 1.8) showWin();
      return;
    }

    boss.y = 205 + Math.sin(gameTime * (1.8 + boss.phase * .25)) * (24 + boss.phase * 6);
    boss.attackTimer -= dt;
    if (boss.attackTimer <= 0) {
      if (boss.phase === 1) {
        if (boss.shotIndex % 3 === 2) spawnFan();
        else spawnWaterShot("shot", (boss.shotIndex % 2 ? 20 : -16));
        boss.attackTimer = .72;
        boss.shotIndex += 1;
      } else if (boss.phase === 2) {
        if (boss.shotIndex % 3 === 1) beginBossState("jet_charge");
        else spawnWaterShot("fast", 0);
        boss.attackTimer = boss.state === "combat" ? .75 : 1.5;
        boss.shotIndex += 1;
      } else {
        if (boss.shotIndex % 3 === 0) beginBossState("sneeze_charge");
        else if (boss.shotIndex % 3 === 1) beginBossState("jet_charge");
        else spawnFan();
        boss.attackTimer = .78;
        boss.shotIndex += 1;
      }
    }
    updateHud();
  }

  function updateProjectiles(dt) {
    for (const marble of marbles) {
      marble.x += marble.vx * dt;
      marble.y += marble.vy * dt;
      marble.vx *= Math.pow(.985, dt * 60);
      marble.rotation += dt * 16;
      marble.life -= dt;
      let consumed = false;
      for (const enemy of enemies) {
        if (!enemy.alive || !overlap(marble, enemy)) continue;
        enemy.alive = false;
        marble.life = 0;
        consumed = true;
        burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#9eeeff", 10, 130);
        sfx("shell");
        break;
      }
      if (consumed) continue;
      if (boss.active && !["intro", "defeated"].includes(boss.state) && overlap(marble, boss)) {
        const damage = boss.phase === 1 ? 5 : boss.phase === 2 ? 9 : 15;
        boss.health = clamp(boss.health - damage, 0, boss.maxHealth);
        boss.water = Math.max(0, boss.water - (boss.phase === 3 ? .7 : .35));
        boss.flash = .22;
        boss.vulnerablePulse = .22;
        marble.life = 0;
        burst(marble.x, marble.y, "#fff0a2", 12, 165);
        tone(740, .06, "square", .035);
        screenShake = Math.max(screenShake, 4);
        updateHud();
        if (boss.health <= 0) {
          boss.state = "defeated";
          boss.timer = 0;
          boss.water = 0;
          waterShots = [];
          waves = [];
          notify("GALÃO SECO! ÁGUA pOtÁVIO PERDEU A PRESSÃO!", 3000);
          sfx("boss");
        }
      }
    }
    marbles = marbles.filter((m) => m.life > 0 && m.x > camera - 80 && m.x < WORLD_END + 80 && m.y > 0 && m.y < H + 20);

    for (const shot of waterShots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt + Math.sin(gameTime * 7 + shot.phase) * 8 * dt;
      shot.life -= dt;
      if (overlap(hero, shot)) {
        damageHero(shot.damage, shot.x);
        shot.life = 0;
      }
    }
    waterShots = waterShots.filter((s) => s.life > 0 && s.x > ARENA_LEFT - 120 && s.y > 20 && s.y < 540);

    for (const wave of waves) {
      wave.x += wave.vx * dt;
      wave.life -= dt;
      const topBox = { x: wave.x, y: wave.y, w: wave.w, h: Math.max(0, wave.gapY - wave.gapH / 2 - wave.y) };
      const bottomY = wave.gapY + wave.gapH / 2;
      const bottomBox = { x: wave.x, y: bottomY, w: wave.w, h: Math.max(0, WATER_BOTTOM - bottomY) };
      if (overlap(hero, topBox) || overlap(hero, bottomBox)) {
        damageHero(22, wave.x);
        wave.life = 0;
      }
    }
    waves = waves.filter((wave) => wave.life > 0 && wave.x > ARENA_LEFT - 120);
  }

  function updateEffects(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(.5, dt);
      p.vy -= 20 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const bubble of bubbles) {
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(gameTime * 1.4 + bubble.phase) * 8 * dt;
      if (bubble.y < WATER_TOP - 10) bubble.y = WATER_BOTTOM + Math.random() * 45;
    }
    screenShake = Math.max(0, screenShake - dt * 17);
    flash = Math.max(0, flash - dt * 1.6);
    bossBannerTimer = Math.max(0, bossBannerTimer - dt);
  }

  function update(dt) {
    if (mode !== "play") return;
    gameTime += dt;
    updateHero(dt);
    if (transformDone) {
      updateEnemies(dt);
      updateCollectibles();
      updateProjectiles(dt);
      updateBoss(dt);
      updateZone();
    }
    updateEffects(dt);

    const targetCamera = boss.active ? ARENA_LEFT : hero.x - W * .3;
    const maxCamera = WORLD_END - W;
    camera += (clamp(targetCamera, 0, maxCamera) - camera) * Math.min(1, dt * 4.4);
  }

  function pixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackdrop(tick) {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#087ba1");
    grad.addColorStop(.3, "#075a85");
    grad.addColorStop(.72, "#073457");
    grad.addColorStop(1, "#051d37");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = .22;
    ctx.strokeStyle = "#d9fbff";
    ctx.lineWidth = 3;
    for (let i = 0; i < 7; i += 1) {
      const x = ((i * 94 - camera * .06 + tick * .012) % (W + 110)) - 55;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 75, 215);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    pixelRect(0, 0, W, WATER_TOP, "#072847");
    ctx.globalAlpha = .45;
    for (let x = -30; x < W + 40; x += 36) {
      ctx.fillStyle = "#a8f5ff";
      ctx.beginPath();
      ctx.arc(x + Math.sin(tick * .004 + x) * 9, WATER_TOP, 22, Math.PI, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const bubble of bubbles) {
      const sx = bubble.x - camera * .72;
      if (sx < -10 || sx > W + 10) continue;
      ctx.globalAlpha = .2 + bubble.r * .055;
      ctx.strokeStyle = "#c8f9ff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, bubble.y, bubble.r + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    pixelRect(0, WATER_BOTTOM, W, H - WATER_BOTTOM, "#092035");
    for (let x = -20; x < W + 50; x += 55) {
      const parallaxX = ((x - camera * .14) % (W + 70)) - 10;
      pixelRect(parallaxX, WATER_BOTTOM - 6, 45, 18, x % 110 ? "#1e5962" : "#174756");
    }
  }

  function drawCurrents(tick) {
    for (const flow of currents) {
      if (flow.x + flow.w < camera - 40 || flow.x > camera + W + 40) continue;
      ctx.save();
      ctx.globalAlpha = .22;
      ctx.strokeStyle = flow.color;
      ctx.lineWidth = 3;
      const direction = Math.sign(flow.fx || 1);
      for (let i = 0; i < 6; i += 1) {
        const y = flow.y + 28 + i * (flow.h - 50) / 5;
        const shift = (tick * .04 * direction + i * 61) % 120;
        const start = flow.x - camera + shift;
        ctx.beginPath();
        ctx.moveTo(start, y);
        ctx.quadraticCurveTo(start + direction * 36, y + Math.sin(tick * .004 + i) * 12, start + direction * 70, y + flow.fy * .08);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawReef(reef) {
    const x = reef.x;
    const y = reef.y;
    const coral = reef.side === "top" ? "#174e58" : "#205b5a";
    pixelRect(x, y, reef.w, reef.h, coral);
    pixelRect(x + 7, y, reef.w - 14, reef.h, "#123e50");
    if (reef.side === "bottom") {
      for (let i = 0; i < 4; i += 1) {
        const cx = x + 18 + i * ((reef.w - 36) / 3);
        pixelRect(cx, y - 26 - (i % 2) * 15, 9, 36 + (i % 2) * 15, i % 2 ? "#d25a75" : "#d47a55");
        pixelRect(cx - 8, y - 23 - (i % 2) * 15, 11, 7, "#ed8a86");
        pixelRect(cx + 6, y - 13 - (i % 2) * 15, 11, 7, "#ed8a86");
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        const sx = x + 18 + i * ((reef.w - 36) / 3);
        ctx.fillStyle = i % 2 ? "#8bcf70" : "#5dbb7e";
        ctx.beginPath();
        ctx.ellipse(sx, y + reef.h + 13 + (i % 2) * 8, 8, 20, .35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawMexilhao(tick) {
    const x = hero.x;
    const y = hero.y;
    const flip = hero.face < 0 ? -1 : 1;
    ctx.save();
    ctx.translate(x + hero.w / 2, y + hero.h / 2);
    ctx.scale(flip, 1);
    const kick = transformDone ? Math.sin(tick * .012 + hero.swimCycle) * 5 : 0;
    if (hero.invincible > 0 && Math.floor(hero.invincible * 18) % 2 === 0) ctx.globalAlpha = .35;

    ctx.fillStyle = "rgba(1,12,24,.32)";
    ctx.beginPath();
    ctx.ellipse(0, 35, 31, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!transformDone) {
      pixelRect(-19, -27, 38, 57, "#171a22");
      pixelRect(-15, -36, 30, 26, "#d69a75");
      ctx.restore();
      return;
    }

    ctx.fillStyle = "#087ed3";
    ctx.beginPath(); ctx.moveTo(-9, 25); ctx.lineTo(-36 - kick, 42); ctx.lineTo(-9, 45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(12, 26); ctx.lineTo(38 + kick, 44); ctx.lineTo(10, 46); ctx.closePath(); ctx.fill();
    pixelRect(-21, 23, 12, 18, "#0b66ae");
    pixelRect(9, 23, 12, 18, "#0b66ae");

    pixelRect(-21, -6, 42, 34, "#dd2e31");
    pixelRect(-18, 21, 36, 15, "#151a25");
    pixelRect(-21, 12, 42, 6, "#0a67b3");
    pixelRect(-5, 13, 10, 8, "#ffd24a");
    ctx.fillStyle = "#128bd3";
    ctx.beginPath(); ctx.moveTo(-18, -7); ctx.lineTo(-3, 9); ctx.lineTo(0, -2); ctx.lineTo(4, 9); ctx.lineTo(18, -7); ctx.lineTo(9, -13); ctx.lineTo(0, -5); ctx.lineTo(-9, -13); ctx.closePath(); ctx.fill();

    pixelRect(-31, 0, 13, 12, "#d88d60");
    pixelRect(18, 0, 13, 12, "#d88d60");
    ctx.fillStyle = "#0783d4";
    ctx.beginPath(); ctx.arc(-32, 7, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(32, 7, 9, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#e99a64";
    ctx.beginPath(); ctx.ellipse(0, -27, 26, 25, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-21, -20, 13, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(21, -20, 13, 0, Math.PI * 2); ctx.fill();
    pixelRect(-15, -42, 30, 9, "#181821");
    pixelRect(-14, -31, 7, 4, "#191923");
    pixelRect(7, -31, 7, 4, "#191923");
    pixelRect(-5, -18, 10, 3, "#8c3c33");

    pixelRect(-19, -55, 38, 10, "#f7f2d9");
    pixelRect(-14, -63, 28, 10, "#f7f2d9");
    pixelRect(-18, -54, 36, 4, "#126ac0");
    pixelRect(-2, -61, 4, 7, "#126ac0");
    pixelRect(-6, -58, 12, 3, "#126ac0");

    ctx.restore();
  }

  function drawEnemy(enemy, tick) {
    if (!enemy.alive) return;
    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    if (enemy.flash > 0) ctx.globalAlpha = .4;
    if (enemy.type === "jelly") {
      ctx.fillStyle = "#c785d9";
      ctx.beginPath(); ctx.arc(0, -5, 20, Math.PI, Math.PI * 2); ctx.lineTo(20, 4); ctx.lineTo(-20, 4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#f0b4e8"; ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.moveTo(i * 7, 3); ctx.quadraticCurveTo(i * 8 + Math.sin(tick * .01 + i) * 5, 16, i * 7, 25); ctx.stroke(); }
      pixelRect(-10, -8, 4, 4, "#231b36"); pixelRect(6, -8, 4, 4, "#231b36");
    } else if (enemy.type === "puffer") {
      ctx.fillStyle = "#d8b84a"; ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#f6e28b"; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i += 1) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15); ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.stroke(); }
      pixelRect(-8, -5, 4, 4, "#1c2630"); pixelRect(5, -5, 4, 4, "#1c2630");
    } else {
      ctx.scale(enemy.dir < 0 ? -1 : 1, 1);
      ctx.fillStyle = "#2e9e87"; ctx.beginPath(); ctx.ellipse(0, 0, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-39, -13); ctx.lineTo(-37, 13); ctx.closePath(); ctx.fill();
      pixelRect(12, -5, 5, 4, "#071c27");
    }
    ctx.restore();
  }

  function drawShell(item, tick) {
    if (item.collected) return;
    const pulse = 1 + Math.sin(tick * .006 + item.phase) * .08;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(255,235,139,.2)"; ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffe087"; ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI, Math.PI * 2); ctx.lineTo(12, 9); ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#c78b54"; ctx.lineWidth = 2;
    [-7, 0, 7].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x * .7, 9); ctx.stroke(); });
    ctx.restore();
  }

  function drawPotavio(tick) {
    if (!boss.active) return;
    ctx.save();
    ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
    if (boss.flash > 0 && Math.floor(boss.flash * 35) % 2 === 0) ctx.globalAlpha = .36;
    const dry = clamp(1 - boss.water / 100, 0, 1);
    const bellyScale = 1 - dry * .48;
    if (boss.state === "defeated") ctx.rotate(Math.sin(tick * .05) * .15);

    pixelRect(38, -45, 28, 90, "#314b25");
    pixelRect(43, -39, 18, 78, "#72933a");
    pixelRect(48, -32, 7, 56, "#e39634");
    ctx.strokeStyle = "#22b5d9"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(42, 3, 42, -Math.PI / 2, Math.PI / 2); ctx.stroke();

    pixelRect(-34, 48, 15, 38, "#7033a0"); pixelRect(18, 48, 15, 38, "#7033a0");
    pixelRect(-41, 78, 27, 10, "#e0a538"); pixelRect(14, 78, 27, 10, "#e0a538");
    pixelRect(-42, -5, 84, 63, "#6f329a");

    ctx.save(); ctx.scale(bellyScale, 1); ctx.fillStyle = "#53b9dc"; ctx.beginPath(); ctx.ellipse(0, 25, 43, 37, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = "rgba(202,249,255,.55)"; ctx.beginPath(); ctx.ellipse(-8 * bellyScale, 10, 12 * bellyScale, 7, -.4, 0, Math.PI * 2); ctx.fill();

    pixelRect(-54, -16, 15, 55, "#4eacd0"); pixelRect(39, -16, 15, 55, "#4eacd0");
    pixelRect(-57, 27, 18, 11, "#4eacd0"); pixelRect(39, 27, 18, 11, "#4eacd0");

    ctx.fillStyle = "rgba(76,199,239,.22)"; ctx.fillRect(-39, -91, 78, 76);
    ctx.strokeStyle = "#77dcff"; ctx.lineWidth = 6; ctx.strokeRect(-39, -91, 78, 76);
    pixelRect(-18, -101, 36, 10, "#6bd8f5"); pixelRect(-13, -108, 26, 8, "#e5fbff");
    ctx.fillStyle = "#4eacd0"; ctx.beginPath(); ctx.ellipse(0, -51, 27, 28, 0, 0, Math.PI * 2); ctx.fill();
    pixelRect(-14, -65, 28, 7, "#162035");
    pixelRect(-13, -51, 6, 5, "#0c1730"); pixelRect(7, -51, 6, 5, "#0c1730");
    pixelRect(-4, -39, 13, 3, boss.phase === 3 ? "#7a1736" : "#263653");

    if (["combat", "jet_charge", "jet", "sneeze_charge", "sneeze"].includes(boss.state)) {
      pixelRect(-91, -4, 54, 25, "#244d63");
      pixelRect(-84, 1, 42, 15, "#e19b35");
      pixelRect(-105, 2, 23, 12, "#58d3ed");
    }

    if (boss.vulnerablePulse > 0) {
      ctx.globalAlpha = .24 * clamp(boss.vulnerablePulse, 0, 1);
      ctx.fillStyle = "#fff4a6"; ctx.fillRect(-64, -112, 128, 205);
    }
    ctx.restore();
  }

  function drawProjectiles(tick) {
    for (const marble of marbles) {
      ctx.fillStyle = "rgba(121,231,249,.24)"; ctx.beginPath(); ctx.arc(marble.x - Math.sign(marble.vx) * 11, marble.y + 5, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c6f8ff"; ctx.beginPath(); ctx.arc(marble.x + 5, marble.y + 5, 5.5, 0, Math.PI * 2); ctx.fill();
      pixelRect(marble.x + 3, marble.y + 2, 3, 3, "#ffffff");
    }
    for (const shot of waterShots) {
      ctx.save(); ctx.translate(shot.x + shot.w / 2, shot.y + shot.h / 2); ctx.rotate(Math.atan2(shot.vy, shot.vx));
      ctx.fillStyle = "rgba(127,228,255,.22)"; ctx.beginPath(); ctx.ellipse(13, 0, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8eeaff"; ctx.beginPath(); ctx.ellipse(0, 0, shot.w / 2, shot.h / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const wave of waves) {
      const topEnd = wave.gapY - wave.gapH / 2;
      const bottomStart = wave.gapY + wave.gapH / 2;
      ctx.save(); ctx.globalAlpha = .75;
      ctx.fillStyle = "#55cce9"; ctx.fillRect(wave.x, wave.y, wave.w, Math.max(0, topEnd - wave.y)); ctx.fillRect(wave.x, bottomStart, wave.w, Math.max(0, WATER_BOTTOM - bottomStart));
      ctx.strokeStyle = "#d0faff"; ctx.lineWidth = 5;
      for (let y = wave.y + 10; y < WATER_BOTTOM; y += 26) {
        if (y > topEnd && y < bottomStart) continue;
        ctx.beginPath(); ctx.arc(wave.x + wave.w / 2, y, 20 + Math.sin(tick * .01 + y) * 5, Math.PI * .65, Math.PI * 1.35); ctx.stroke();
      }
      ctx.restore();
    }
    if (boss.active && boss.state === "jet_charge") {
      ctx.save(); ctx.setLineDash([10, 8]); ctx.strokeStyle = "rgba(255,240,145,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ARENA_LEFT, boss.jetY); ctx.lineTo(boss.x, boss.jetY); ctx.stroke(); ctx.restore();
    }
    if (boss.active && boss.state === "jet") {
      const x = ARENA_LEFT;
      const width = boss.x - ARENA_LEFT + 32;
      ctx.save(); ctx.globalAlpha = .82; ctx.fillStyle = "#5cd9f5"; ctx.fillRect(x, boss.jetY - 26, width, 52); ctx.fillStyle = "#d9fbff"; ctx.fillRect(x, boss.jetY - 8, width, 16); ctx.globalAlpha = .45;
      for (let px = x + 10; px < x + width; px += 38) { ctx.beginPath(); ctx.arc(px, boss.jetY + Math.sin(tick * .02 + px) * 15, 10, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
      pixelRect(p.x, p.y, p.size, p.size, p.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawTransformOverlay(tick) {
    if (transformDone || mode !== "play") return;
    const progress = clamp(1 - transformTimer / 2.45, 0, 1);
    ctx.save();
    ctx.globalAlpha = .18 + progress * .32;
    const glow = ctx.createRadialGradient(hero.x + hero.w / 2, hero.y + hero.h / 2, 8, hero.x + hero.w / 2, hero.y + hero.h / 2, 100 + progress * 30);
    glow.addColorStop(0, "#e1fbff"); glow.addColorStop(.45, "#58d8ec"); glow.addColorStop(1, "rgba(10,98,143,0)");
    ctx.fillStyle = glow; ctx.fillRect(hero.x - 120, hero.y - 130, 260, 270);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff3a3"; ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
    ctx.fillText(progress < .45 ? "A ÁGUA ESTÁ MUDANDO O SHALL..." : "MEXILHÃOZINHO!", hero.x + hero.w / 2, hero.y - 24);
    ctx.restore();
  }

  function drawBossBanner() {
    if (!boss.active || bossBannerTimer <= 0) return;
    const alpha = clamp(bossBannerTimer < .5 ? bossBannerTimer * 2 : 1, 0, 1);
    ctx.save(); ctx.globalAlpha = alpha * .9;
    pixelRect(ARENA_LEFT + 115, 120, 390, 88, "rgba(2,16,35,.9)");
    ctx.strokeStyle = "#62e7f3"; ctx.lineWidth = 4; ctx.strokeRect(ARENA_LEFT + 115, 120, 390, 88);
    ctx.fillStyle = "#79eaf7"; ctx.font = "bold 12px monospace"; ctx.textAlign = "center"; ctx.fillText("CHEFÃO DA FASE 4", ARENA_LEFT + 310, 147);
    ctx.fillStyle = "#fff0a2"; ctx.font = "bold 24px monospace"; ctx.fillText("ÁGUA pOtÁVIO", ARENA_LEFT + 310, 178);
    ctx.restore();
  }

  function draw(tick) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    drawBackdrop(tick);
    ctx.save();
    if (screenShake > 0) ctx.translate((Math.random() - .5) * screenShake, (Math.random() - .5) * screenShake);
    ctx.translate(-camera, 0);
    drawCurrents(tick);
    reefs.forEach(drawReef);
    collectibles.forEach((item) => drawShell(item, tick));
    enemies.forEach((enemy) => drawEnemy(enemy, tick));
    drawPotavio(tick);
    drawProjectiles(tick);
    drawMexilhao(tick);
    drawTransformOverlay(tick);
    drawParticles();
    drawBossBanner();
    ctx.restore();

    if (flash > 0) {
      ctx.globalAlpha = clamp(flash * 2.2, 0, .35);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    const vignette = ctx.createRadialGradient(W / 2, H * .48, 100, W / 2, H * .48, 360);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(1,8,22,.42)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(now) {
    const dt = clamp((now - previousTime) / 1000, 0, .033);
    previousTime = now;
    update(dt);
    draw(now);
    updateMusic(now);
    renderToast(now);
    requestAnimationFrame(loop);
  }

  function setControl(name, pressed, button) {
    input[name] = pressed;
    button?.classList.toggle("active", pressed);
  }

  function releasePointer(pointerId) {
    const binding = activePointers.get(pointerId);
    if (!binding) return;
    activePointers.delete(pointerId);
    const stillPressed = [...activePointers.values()].some((item) => item.name === binding.name);
    if (!stillPressed) input[binding.name] = false;
    binding.button.classList.toggle("active", stillPressed);
  }

  document.querySelectorAll("[data-stage4-control]").forEach((button) => {
    const name = button.dataset.stage4Control;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      initAudio();
      button.setPointerCapture?.(event.pointerId);
      activePointers.set(event.pointerId, { name, button });
      setControl(name, true, button);
      if (name === "shoot") fireMarble();
      if (name === "dash") triggerDash();
      navigator.vibrate?.(name === "dash" ? [12, 20, 12] : 7);
    }, { passive: false });
    button.addEventListener("pointerup", (event) => releasePointer(event.pointerId));
    button.addEventListener("pointercancel", (event) => releasePointer(event.pointerId));
    button.addEventListener("lostpointercapture", (event) => releasePointer(event.pointerId));
  });

  const keyMap = { arrowleft: "left", a: "left", arrowright: "right", d: "right", arrowup: "swim", w: "swim", " ": "swim", x: "shoot", k: "shoot", c: "dash", e: "dash" };
  window.addEventListener("keydown", (event) => {
    const action = keyMap[event.key.toLowerCase()];
    if (!action) return;
    event.preventDefault();
    input[action] = true;
    initAudio();
    if (!event.repeat && action === "shoot") fireMarble();
    if (!event.repeat && action === "dash") triggerDash();
  }, { passive: false });
  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.key.toLowerCase()];
    if (action) input[action] = false;
  });
  window.addEventListener("blur", () => {
    activePointers.clear();
    Object.keys(input).forEach((key) => { input[key] = false; });
    document.querySelectorAll("[data-stage4-control].active").forEach((button) => button.classList.remove("active"));
  });

  ui.start.addEventListener("click", startGame);
  ui.retry.addEventListener("click", startGame);
  ui.replay.addEventListener("click", startGame);
  ui.sound.classList.toggle("muted", muted);
  ui.sound.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("shall-muted", String(muted));
    ui.sound.classList.toggle("muted", muted);
    if (!muted) { initAudio(); sfx("shell"); }
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(() => {});

  function applyQaScenario() {
    if (location.hostname !== "terminal.local") return false;
    const scenario = new URLSearchParams(location.search).get("qa");
    if (!scenario) return false;
    startGame();
    transformTimer = 0;
    transformDone = true;
    hero.invincible = 999;
    if (scenario === "aquatic") { hero.x = 2350; hero.y = 220; camera = 2170; }
    if (scenario === "mexilhao") { hero.x = 1500; hero.y = 220; camera = 1320; }
    if (scenario.startsWith("potavio")) {
      hero.x = 5900; hero.y = 255; camera = ARENA_LEFT; activateBoss(); boss.state = "combat"; boss.timer = 0;
      if (scenario === "potavio-jet") { boss.phase = 2; boss.water = 52; beginBossState("jet"); boss.jetY = 280; }
      if (scenario === "potavio-dry") { boss.phase = 3; boss.water = 12; boss.health = 78; boss.state = "combat"; }
      if (scenario === "potavio-wave") { boss.phase = 3; boss.water = 22; beginBossState("sneeze"); }
      updateHud();
    }
    return true;
  }

  window.__shallStage4Debug = () => ({
    mode, hero: { x: Math.round(hero.x), y: Math.round(hero.y), vx: Math.round(hero.vx), vy: Math.round(hero.vy), health: hero.health },
    transformDone, shells, current: currentAt(hero) ? { ...currentAt(hero) } : null,
    boss: { active: boss.active, health: boss.health, water: Number(boss.water.toFixed(1)), phase: boss.phase, state: boss.state },
    marbles: marbles.length, waterShots: waterShots.length, waves: waves.length,
  });

  resetWorld();
  applyQaScenario();
  draw(performance.now());
  requestAnimationFrame(loop);
})();
