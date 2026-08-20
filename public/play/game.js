(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const W = canvas.width;
  const H = canvas.height;
  const WORLD_END = 9600;
  const ARENA_START = 8400;
  const BOSS_HOME = 9080;
  const BONUS_START = 9900;
  const BONUS_END = 10750;
  const BOSS_MAX_HEALTH = 180;
  const ROCK_MAX_HEALTH = 192;
  const ZICO_MAX_HEALTH = 270;
  const BOSS_MARBLE_DAMAGE = 12;
  const ROCK_STOMP_DAMAGE = 24;
  const ZICO_ACT_HEALTH = 90;
  const EAT_DURATION = 1.24;
  const BILUIA_DURATION = 13;
  const BILUIA_ZONE_END = 6920;

  const ui = {
    title: document.querySelector("#title-layer"),
    story: document.querySelector("#story-layer"),
    pause: document.querySelector("#pause-layer"),
    ending: document.querySelector("#end-layer"),
    gameOver: document.querySelector("#game-over-layer"),
    lifeFill: document.querySelector("#life-fill"),
    lifeText: document.querySelector("#life-text"),
    coins: document.querySelector("#coin-count"),
    snacks: document.querySelector("#snack-count"),
    eatButton: document.querySelector("#eat-button"),
    shootButton: document.querySelector("#shoot-button"),
    bossHud: document.querySelector("#boss-hud"),
    bossFill: document.querySelector("#boss-fill"),
    bossPhase: document.querySelector("#boss-phase"),
    bossName: document.querySelector("#boss-name"),
    bossBanner: document.querySelector("#boss-banner"),
    bossBannerKicker: document.querySelector("#boss-banner-kicker"),
    bossBannerName: document.querySelector("#boss-banner-name"),
    bossBannerLine: document.querySelector("#boss-banner-line"),
    toast: document.querySelector("#toast"),
    sound: document.querySelector("#sound-button"),
    comicPanel: document.querySelector("#comic-panel"),
    storySpeaker: document.querySelector("#story-speaker"),
    storyText: document.querySelector("#story-text"),
    endingComic: document.querySelector("#ending-comic"),
    endingKicker: document.querySelector("#ending-kicker"),
    endingTitle: document.querySelector("#ending-title"),
    endingText: document.querySelector("#ending-text"),
    endingContinua: document.querySelector("#ending-continua"),
    endingBoss: document.querySelector("#ending-boss"),
    nextEnding: document.querySelector("#next-ending"),
    playAgain: document.querySelector("#play-again"),
    gameOverTitle: document.querySelector("#game-over-title"),
    gameOverText: document.querySelector("#game-over-text"),
  };

  const images = {
    shall: new Image(),
    shallActions: new Image(),
    shallWalk: new Image(),
    shallFunnyActions: new Image(),
    shallFunnyWalk: new Image(),
    cleyde: new Image(),
    joyce: new Image(),
    joyceActions: new Image(),
    joyceWatcher: new Image(),
    rockActions: new Image(),
    rockWatcher: new Image(),
    barEnemies: new Image(),
    carrotEnemies: new Image(),
    carrotElites: new Image(),
    barStreet: new Image(),
    rockArena: new Image(),
    barProps: new Image(),
    stageOneStreet: new Image(),
    joyceArena: new Image(),
    zicoActions: new Image(),
    teiuBees: new Image(),
    mataHorta: new Image(),
    forestEnemies: new Image(),
    biluiaActions: new Image(),
    bossWatchers: new Image(),
  };
  images.shall.src = "./assets/shall-short-neck-idle.png";
  images.shallActions.src = "./assets/shall-actions.png";
  images.shallWalk.src = "./assets/shall-walk-cycle.png";
  images.shallFunnyActions.src = "./assets/shall-short-neck-actions.png";
  images.shallFunnyWalk.src = "./assets/shall-head-back-walk.png";
  images.cleyde.src = "./assets/cleyde.png";
  images.joyce.src = "./assets/joyce-cenorita-v2.png";
  images.joyceActions.src = "./assets/joyce-actions.png";
  images.joyceWatcher.src = "./assets/joyce-watcher-day-32.png";
  images.rockActions.src = "./assets/rock-side-actions.png";
  images.rockWatcher.src = "./assets/rock-front-watcher.png";
  images.barEnemies.src = "./assets/bar-enemies.png";
  images.carrotEnemies.src = "./assets/carrot-enemies.png";
  images.carrotElites.src = "./assets/carrot-elites.png";
  images.barStreet.src = "./assets/bar-district-v2.png";
  images.rockArena.src = "./assets/rock-arena-bg.png";
  images.barProps.src = "./assets/bar-props.png";
  images.stageOneStreet.src = "./assets/stage1-carrot-district-day-32.png";
  images.joyceArena.src = "./assets/joyce-market-arena-day-32.png";
  images.zicoActions.src = "./assets/zico-actions-32.png";
  images.teiuBees.src = "./assets/teiu-bees-32.png";
  images.mataHorta.src = "./assets/mata-horta-stage-32.png";
  images.forestEnemies.src = "./assets/forest-enemies-32.png";
  images.biluiaActions.src = "./assets/biluia-actions-32.png";
  images.bossWatchers.src = "./assets/boss-watchers-32.png";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const input = { left: false, right: false, jump: false, shoot: false, eat: false };

  let mode = "title";
  let camera = 0;
  let cameraLook = 0;
  let cameraLift = 0;
  let zoom = 1;
  let previousTime = performance.now();
  let animationFrame = 0;
  let jumpWasDown = false;
  let jumpQueued = false;
  let shootCooldown = 0;
  let shootLockedTimer = 0;
  let shootUnlockNoticeArmed = false;
  let toastUntil = 0;
  let toastMessage = "";
  let contextHint = "";
  let coinCount = 0;
  let snackCount = 0;
  let gameTime = 0;
  let screenShake = 0;
  let impactFlash = 0;
  let impactColor = "#fff5c4";
  let hitStopTimer = 0;
  let landingPulse = 0;
  let particles = [];
  let damageNumbers = [];
  let endingIndex = 0;
  let currentSection = -1;
  let stageNumber = 1;
  let drunkTimer = 0;
  let drunkLevel = 0;
  let drunkPersistent = false;
  let drunkMessageTimer = 0;
  let visitedFriends = false;
  let biluiaState = "none";
  let biluiaTimer = 0;
  let biluiaIntroTimer = 0;
  let biluiaPickup = null;
  let biluiaRain = [];
  let biluiaRainStarted = false;
  let biluiaFlightCompleted = false;
  let biluiaBossGiftSpawned = false;
  let biluiaBossUsed = false;
  let biluiaLaughTimer = 0;

  const hero = {
    x: 90,
    y: 420,
    w: 38,
    h: 70,
    vx: 0,
    vy: 0,
    face: 1,
    onGround: false,
    health: 100,
    invincible: 0,
    flash: 0,
    shootAnim: 0,
    eatAnim: 0,
    eatHealed: false,
    eatStage: 0,
    squash: 0,
    walkCycle: 0,
    lastFootstep: -1,
    coyote: 0,
    jumpBuffer: 0,
    flightFuel: 0,
  };

  function bossHitbox() {
    if (boss.kind === "zico" && boss.phase === 1) return { x: boss.x - 92, y: boss.y - 40, w: boss.w + 184, h: 120 };
    const bodyHeight = boss.kind === "rock" ? Math.min(142, boss.h) : boss.h;
    return { x: boss.x, y: boss.y + boss.h - bodyHeight, w: boss.w, h: bodyHeight };
  }

  const stageOneGround = [
    { x: 0, y: 500, w: 840, h: 80 },
    { x: 930, y: 500, w: 900, h: 80 },
    { x: 1910, y: 500, w: 940, h: 80 },
    { x: 2940, y: 500, w: 1110, h: 80 },
    { x: 4140, y: 500, w: 1180, h: 80 },
    { x: 5400, y: 500, w: 850, h: 80 },
    { x: 6250, y: 500, w: 1350, h: 80 },
    { x: 7685, y: 500, w: 635, h: 80 },
    { x: ARENA_START, y: 500, w: WORLD_END - ARENA_START, h: 80 },
    { x: BONUS_START, y: 500, w: BONUS_END - BONUS_START, h: 80 },
  ];

  const stageOneLedges = [
    { x: 250, y: 414, w: 120, h: 18 },
    { x: 470, y: 350, w: 145, h: 18 },
    { x: 690, y: 414, w: 105, h: 18 },
    { x: 1030, y: 392, w: 150, h: 18 },
    { x: 1260, y: 326, w: 128, h: 18 },
    { x: 1510, y: 398, w: 170, h: 18 },
    { x: 2050, y: 405, w: 150, h: 18 },
    { x: 2310, y: 345, w: 130, h: 18 },
    { x: 2590, y: 405, w: 165, h: 18 },
    { x: 3050, y: 388, w: 125, h: 18 },
    { x: 3290, y: 320, w: 145, h: 18 },
    { x: 3540, y: 390, w: 155, h: 18 },
    { x: 3820, y: 340, w: 110, h: 18 },
    { x: 4320, y: 402, w: 170, h: 18 },
    { x: 4610, y: 335, w: 120, h: 18 },
    { x: 4870, y: 405, w: 170, h: 18 },
    { x: 5520, y: 395, w: 150, h: 18 },
    { x: 5800, y: 322, w: 150, h: 18 },
    { x: 6480, y: 392, w: 150, h: 18 },
    { x: 6760, y: 326, w: 138, h: 18 },
    { x: 7130, y: 392, w: 170, h: 18 },
    { x: 7460, y: 334, w: 125, h: 18 },
    { x: 7790, y: 400, w: 145, h: 18 },
    { x: 8080, y: 330, w: 155, h: 18 },
    { x: 10080, y: 395, w: 125, h: 18 },
    { x: 10310, y: 330, w: 145, h: 18 },
  ];
  const stageTwoGround = [
    { x: 0, y: 500, w: 1065, h: 80 },
    { x: 1100, y: 500, w: 1170, h: 80 },
    { x: 2305, y: 500, w: 1010, h: 80 },
    { x: 3355, y: 500, w: 1310, h: 80 },
    { x: 4700, y: 500, w: 1080, h: 80 },
    { x: 5820, y: 500, w: 1060, h: 80 },
    { x: 6920, y: 500, w: 1400, h: 80 },
    { x: ARENA_START, y: 500, w: WORLD_END - ARENA_START, h: 80 },
    { x: BONUS_START, y: 500, w: BONUS_END - BONUS_START, h: 80 },
  ];

  const stageTwoLedges = [
    { x: 270, y: 410, w: 145, h: 18 },
    { x: 540, y: 342, w: 135, h: 18 },
    { x: 790, y: 400, w: 155, h: 18 },
    { x: 1230, y: 390, w: 150, h: 18 },
    { x: 1490, y: 325, w: 130, h: 18 },
    { x: 1770, y: 392, w: 175, h: 18 },
    { x: 2050, y: 338, w: 120, h: 18 },
    { x: 2450, y: 405, w: 160, h: 18 },
    { x: 2740, y: 342, w: 145, h: 18 },
    { x: 3050, y: 402, w: 150, h: 18 },
    { x: 3510, y: 390, w: 170, h: 18 },
    { x: 3820, y: 320, w: 135, h: 18 },
    { x: 4200, y: 390, w: 180, h: 18 },
    { x: 4490, y: 337, w: 120, h: 18 },
    { x: 4880, y: 400, w: 165, h: 18 },
    { x: 5200, y: 330, w: 140, h: 18 },
    { x: 5520, y: 397, w: 150, h: 18 },
    { x: 5990, y: 386, w: 165, h: 18 },
    { x: 6320, y: 323, w: 135, h: 18 },
    { x: 6690, y: 390, w: 140, h: 18 },
    { x: 7160, y: 392, w: 175, h: 18 },
    { x: 7500, y: 324, w: 130, h: 18 },
    { x: 7870, y: 393, w: 170, h: 18 },
    { x: 8120, y: 332, w: 145, h: 18 },
    { x: ARENA_START + 120, y: 402, w: 150, h: 18, beerPlatform: "keg" },
    { x: ARENA_START + 390, y: 334, w: 165, h: 18, beerPlatform: "awning" },
    { x: ARENA_START + 680, y: 402, w: 150, h: 18, beerPlatform: "keg" },
    { x: ARENA_START + 945, y: 334, w: 155, h: 18, beerPlatform: "awning" },
    { x: 10080, y: 395, w: 125, h: 18 },
    { x: 10310, y: 330, w: 145, h: 18 },
  ];

  const stageThreeGround = [
    { x: 0, y: 500, w: 995, h: 80 },
    { x: 1030, y: 500, w: 1160, h: 80 },
    { x: 2225, y: 500, w: 1040, h: 80 },
    { x: 3305, y: 500, w: 1180, h: 80 },
    { x: 4520, y: 500, w: 1120, h: 80 },
    { x: 6690, y: 500, w: 1630, h: 80 },
    { x: ARENA_START, y: 500, w: WORLD_END - ARENA_START, h: 80 },
    { x: BONUS_START, y: 500, w: BONUS_END - BONUS_START, h: 80 },
  ];

  const stageThreeLedges = [
    { x: 240, y: 405, w: 145, h: 18, forestPlatform: "stump" },
    { x: 515, y: 335, w: 150, h: 18, forestPlatform: "branch" },
    { x: 765, y: 398, w: 150, h: 18, forestPlatform: "crate" },
    { x: 1160, y: 390, w: 170, h: 18, forestPlatform: "fence" },
    { x: 1450, y: 318, w: 145, h: 18, forestPlatform: "branch" },
    { x: 1770, y: 390, w: 175, h: 18, forestPlatform: "hive" },
    { x: 2050, y: 330, w: 110, h: 18, forestPlatform: "branch" },
    { x: 2380, y: 400, w: 165, h: 18, forestPlatform: "crate" },
    { x: 2680, y: 330, w: 150, h: 18, forestPlatform: "branch" },
    { x: 3000, y: 395, w: 165, h: 18, forestPlatform: "fence" },
    { x: 3450, y: 382, w: 180, h: 18, forestPlatform: "stump" },
    { x: 3800, y: 310, w: 145, h: 18, forestPlatform: "branch" },
    { x: 4200, y: 385, w: 180, h: 18, forestPlatform: "hive" },
    { x: 4670, y: 396, w: 165, h: 18, forestPlatform: "crate" },
    { x: 4990, y: 326, w: 145, h: 18, forestPlatform: "branch" },
    { x: 5960, y: 284, w: 132, h: 18, forestPlatform: "hive" },
    { x: 6460, y: 285, w: 138, h: 18, forestPlatform: "hive" },
    { x: 6705, y: 346, w: 145, h: 18, forestPlatform: "branch" },
    { x: 5350, y: 390, w: 165, h: 18, forestPlatform: "fence" },
    { x: 5820, y: 382, w: 175, h: 18, forestPlatform: "stump" },
    { x: 6160, y: 315, w: 145, h: 18, forestPlatform: "branch" },
    { x: 6500, y: 385, w: 155, h: 18, forestPlatform: "hive" },
    { x: 6900, y: 388, w: 180, h: 18, forestPlatform: "fence" },
    { x: 7260, y: 315, w: 150, h: 18, forestPlatform: "branch" },
    { x: 7620, y: 388, w: 170, h: 18, forestPlatform: "crate" },
    { x: 8040, y: 320, w: 160, h: 18, forestPlatform: "branch" },
    { x: ARENA_START + 130, y: 392, w: 150, h: 18, forestPlatform: "stump" },
    { x: ARENA_START + 430, y: 320, w: 155, h: 18, forestPlatform: "branch" },
    { x: ARENA_START + 760, y: 392, w: 150, h: 18, forestPlatform: "hive" },
    { x: ARENA_START + 1030, y: 325, w: 145, h: 18, forestPlatform: "branch" },
    { x: 10080, y: 395, w: 125, h: 18 },
    { x: 10310, y: 330, w: 145, h: 18 },
  ];

  let ground = stageOneGround;
  let ledges = stageOneLedges;
  let collisionPlatforms = [...ground, ...ledges];

  const stageOneCoinSeed = [
    [310, 370], [520, 305], [735, 372], [990, 445], [1090, 350], [1318, 280], [1580, 350],
    [1980, 450], [2110, 360], [2368, 300], [2650, 360], [3020, 450], [3110, 342], [3350, 274],
    [3610, 342], [3870, 294], [4210, 450], [4380, 355], [4660, 289], [4930, 358], [5150, 450],
    [5480, 450], [5580, 350], [5860, 278], [6090, 445], [6430, 445], [6540, 346], [6828, 280],
    [7200, 346], [7518, 288], [7740, 447], [7860, 354], [8145, 284], [8280, 444], [10080, 350],
    [10370, 285], [10500, 445],
  ];

  const stageOneFoodSeed = [
    { x: 1760, y: 454 },
    { x: 2760, y: 454 },
    { x: 5240, y: 454 },
    { x: 6120, y: 454 },
    { x: 7350, y: 454 },
    { x: 8145, y: 284 },
    { x: 8445, y: 454 },
    { x: 10430, y: 285 },
  ];

  const stageOneEnemySeed = [
    { type: "hopper", x: 610, min: 560, max: 800, speed: 55 },
    { type: "roller", x: 1110, min: 960, max: 1490, speed: 86 },
    { type: "crate", x: 1580, min: 1470, max: 1770, speed: 42 },
    { type: "snack", x: 2210, min: 1970, max: 2710, speed: 64 },
    { type: "hopper", x: 3150, min: 2990, max: 3510, speed: 62 },
    { type: "crate", x: 3720, min: 3500, max: 3980, speed: 48 },
    { type: "roller", x: 4430, min: 4180, max: 4810, speed: 92 },
    { type: "hopper", x: 5060, min: 4860, max: 5260, speed: 60 },
    { type: "roller", x: 5660, min: 5440, max: 6080, speed: 96 },
    { type: "shooter", x: 6460, min: 6400, max: 6660, speed: 24 },
    { type: "burrower", x: 6880, min: 6880, max: 6880, speed: 0 },
    { type: "cart", x: 7200, min: 7000, max: 7530, speed: 86 },
    { type: "shooter", x: 7730, min: 7720, max: 7940, speed: 22 },
    { type: "burrower", x: 8110, min: 8110, max: 8110, speed: 0 },
    { type: "cart", x: 8210, min: 7990, max: 8310, speed: 94 },
    { type: "snack", x: 10150, min: 9970, max: 10530, speed: 67 },
  ];

  const stageOneSections = [
    { x: 0, label: "CENTRO DE BOTUCATU" },
    { x: 1850, label: "LANCHALL CROC" },
    { x: 4050, label: "RUA DA HORTA" },
    { x: 6250, label: "TÚNEL DO SUCO" },
    { x: 7685, label: "FEIRA DO MEIO-DIA" },
    { x: ARENA_START, label: "ARENA CENORITA" },
  ];

  const stageTwoCoinSeed = [
    [300, 365], [600, 298], [850, 355], [1190, 445], [1295, 345], [1548, 280], [1840, 345],
    [2380, 445], [2510, 360], [2795, 297], [3095, 355], [3435, 446], [3580, 342], [3885, 275],
    [4250, 342], [4545, 290], [4800, 445], [4950, 355], [5270, 286], [5575, 350], [5900, 445],
    [6050, 342], [6375, 278], [6725, 444], [7030, 444], [7220, 346], [7560, 279], [7920, 347],
    [8190, 285], [10080, 350], [10370, 285], [10500, 445],
  ];

  const stageTwoFoodSeed = [
    { x: 1550, y: 279 },
    { x: 3200, y: 454 },
    { x: 4620, y: 454 },
    { x: 5700, y: 454 },
    { x: 6820, y: 454 },
    { x: 8125, y: 286 },
    { x: 8445, y: 454 },
    { x: 10430, y: 285 },
  ];

  const stageTwoEnemySeed = [
    { type: "can", x: 620, min: 520, max: 960, speed: 72 },
    { type: "bottle", x: 1320, min: 1170, max: 1710, speed: 48 },
    { type: "keg", x: 1930, min: 1760, max: 2180, speed: 92 },
    { type: "coaster", x: 2600, min: 2380, max: 3150, speed: 76 },
    { type: "can", x: 3560, min: 3430, max: 4030, speed: 79 },
    { type: "bottle", x: 4310, min: 4120, max: 4590, speed: 52 },
    { type: "keg", x: 4950, min: 4780, max: 5480, speed: 98 },
    { type: "can", x: 6130, min: 5940, max: 6700, speed: 84 },
    { type: "bottle", x: 6520, min: 6320, max: 6820, speed: 54 },
    { type: "coaster", x: 7160, min: 7020, max: 7600, speed: 82 },
    { type: "keg", x: 7760, min: 7510, max: 8180, speed: 104 },
    { type: "bottle", x: 8120, min: 7980, max: 8300, speed: 58 },
    { type: "can", x: 10150, min: 9970, max: 10530, speed: 75 },
  ];

  const stageTwoSections = [
    { x: 0, label: "RUA DOS BARES" },
    { x: 1750, label: "ESQUINA DO COPO TORTO" },
    { x: 3380, label: "CALÇADA DAS LATINHAS" },
    { x: 5800, label: "BECO DA GARRAFA VIVA" },
    { x: 7000, label: "ÚLTIMA RODADA" },
    { x: ARENA_START, label: "ESQUINA DO ROCK" },
  ];

  const stageThreeCoinSeed = [
    [300, 360], [575, 290], [835, 350], [1120, 444], [1225, 344], [1515, 270], [1840, 344],
    [2300, 444], [2440, 354], [2745, 284], [3075, 348], [3395, 444], [3535, 335], [3870, 262],
    [4260, 340], [4590, 444], [4740, 350], [5050, 280], [5420, 344], [5760, 444], [5900, 334],
    [6220, 268], [6570, 444], [6810, 444], [6980, 340], [7330, 266], [7690, 342], [8110, 272],
    [8280, 444], [10080, 350], [10370, 285], [10500, 445],
  ];

  const stageThreeFoodSeed = [
    { x: 930, y: 454 }, { x: 2160, y: 454 }, { x: 3220, y: 454 }, { x: 4440, y: 454 },
    { x: 5600, y: 454 }, { x: 6630, y: 454 }, { x: 8070, y: 274 }, { x: 8460, y: 454 },
    { x: 10430, y: 285 },
  ];

  const stageThreeEnemySeed = [
    { type: "workerbee", x: 610, min: 480, max: 930, speed: 88 },
    { type: "beetle", x: 1280, min: 1100, max: 1690, speed: 72 },
    { type: "sprout", x: 1910, min: 1760, max: 2160, speed: 54 },
    { type: "hive", x: 2580, min: 2580, max: 2580, speed: 0 },
    { type: "workerbee", x: 3090, min: 2870, max: 3270, speed: 98 },
    { type: "beetle", x: 3650, min: 3420, max: 4050, speed: 78 },
    { type: "sprout", x: 4310, min: 4150, max: 4490, speed: 59 },
    { type: "workerbee", x: 4860, min: 4660, max: 5350, speed: 106 },
    { type: "hive", x: 5570, min: 5570, max: 5570, speed: 0 },
    { type: "workerbee", x: 5725, min: 5570, max: 5960, speed: 122 },
    { type: "workerbee", x: 6040, min: 5830, max: 6260, speed: 128 },
    { type: "beetle", x: 6130, min: 5860, max: 6500, speed: 84 },
    { type: "workerbee", x: 6420, min: 6200, max: 6690, speed: 134 },
    { type: "workerbee", x: 6650, min: 6440, max: 6920, speed: 140 },
    { type: "workerbee", x: 6840, min: 6660, max: 7180, speed: 112 },
    { type: "sprout", x: 7380, min: 7220, max: 7700, speed: 64 },
    { type: "hive", x: 7910, min: 7910, max: 7910, speed: 0 },
    { type: "workerbee", x: 8180, min: 7980, max: 8320, speed: 118 },
    { type: "beetle", x: 10160, min: 9980, max: 10520, speed: 82 },
  ];

  const stageThreeSections = [
    { x: 0, label: "TRILHA DA MATA" },
    { x: 1700, label: "HORTA DO ZANGÃO" },
    { x: 3300, label: "CANTEIROS DO ENXAME" },
    { x: 5200, label: "OFICINA NA FLORESTA" },
    { x: 6700, label: "CORREDOR DAS COLMEIAS" },
    { x: ARENA_START, label: "CLAREIRA DO ZICO" },
  ];

  let coinSeed = stageOneCoinSeed;
  let foodSeed = stageOneFoodSeed;
  let enemySeed = stageOneEnemySeed;
  let levelSections = stageOneSections;

  let coins = [];
  let foods = [];
  let enemies = [];
  let marbles = [];
  let carrots = [];
  let cans = [];
  let rockMarbles = [];
  let alcoholBreaths = [];
  let zicoHazards = [];

  const boss = {
    x: BOSS_HOME,
    y: 520,
    w: 148,
    h: 178,
    health: BOSS_MAX_HEALTH,
    maxHealth: BOSS_MAX_HEALTH,
    kind: "joyce",
    name: "JOYCE CENORITA",
    active: false,
    state: "hidden",
    timer: 0,
    throwTimer: 0,
    shotIndex: 0,
    vulnerable: false,
    flash: 0,
    throwAnim: 0,
    hitCount: 0,
    phase: 1,
    phaseFlash: 0,
    attackIndex: 0,
  };

  const storyFrames = [
    { speaker: "NARRADOR", text: "Em algum lugar, numa noite silenciosa...", className: "" },
    { speaker: "CLEYDE", text: "Shall? É você aí?", className: "frame-shadow" },
    { speaker: "NARRADOR", text: "Uma sombra misteriosa surgiu — sem rosto, sem nome.", className: "frame-grab" },
    { speaker: "SHALL", text: "Cleyde?! Aguenta firme. Eu vou encontrar você!", className: "frame-shall" },
  ];
  let storyIndex = 0;

  let muted = localStorage.getItem("shall-muted") === "true";
  let audioContext = null;
  let noiseBuffer = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let audioCompressor = null;
  let outputGain = null;
  let musicDelay = null;
  let musicEchoGain = null;
  let musicChorusDelay = null;
  let musicChorusGain = null;
  let musicChorusLfo = null;
  let musicReverb = null;
  let musicReverbGain = null;
  let musicDrive = null;
  let musicPresence = null;
  let musicTheme = "title";
  let musicStep = 0;
  let lastMusicBeat = 0;
  const musicThemes = {
    title: {
      stepMs: 176,
      melody: [330, 0, 392, 440, 523, 0, 440, 392, 349, 0, 440, 523, 659, 523, 440, 392],
      bass: [110, 110, 147, 147, 131, 131, 165, 147],
      harmony: [220, 247, 262, 294],
      wave: "triangle",
      drums: "light",
    },
    story: {
      stepMs: 215,
      melody: [147, 0, 139, 0, 123, 0, 110, 0, 147, 165, 0, 139, 123, 0, 110, 98],
      bass: [73, 73, 65, 65, 55, 55, 49, 49],
      harmony: [0, 110, 0, 98],
      wave: "sine",
      drums: "pulse",
    },
    street: {
      stepMs: 132,
      melody: [330, 392, 440, 523, 440, 392, 349, 330, 392, 440, 523, 659, 587, 523, 440, 392, 330, 392, 494, 587, 523, 494, 440, 392, 349, 440, 523, 698, 659, 523, 440, 392],
      bass: [110, 110, 147, 147, 131, 131, 165, 147, 110, 110, 147, 165, 131, 131, 147, 165],
      harmony: [220, 262, 294, 330, 247, 294, 330, 294],
      wave: "triangle",
      drums: "drive",
    },
    boss: {
      stepMs: 112,
      melody: [294, 349, 370, 440, 370, 349, 294, 247, 294, 349, 440, 494, 440, 370, 349, 294, 262, 330, 349, 440, 349, 330, 262, 220, 262, 330, 392, 440, 494, 440, 392, 330],
      bass: [73, 73, 87, 87, 65, 65, 82, 82, 73, 73, 87, 98, 65, 65, 73, 82],
      harmony: [147, 175, 185, 220, 131, 165, 175, 196],
      wave: "sawtooth",
      drums: "battle",
    },
    bar: {
      stepMs: 136,
      swing: 12,
      melody: [220, 0, 262, 294, 330, 0, 294, 262, 220, 262, 294, 392, 330, 294, 262, 196, 220, 0, 262, 294, 349, 330, 294, 262, 220, 262, 330, 392, 440, 392, 330, 294],
      bass: [55, 82, 55, 98, 65, 98, 73, 110, 55, 82, 55, 98, 65, 98, 73, 82],
      harmony: [165, 196, 220, 196, 147, 185, 220, 185],
      wave: "triangle",
      drums: "shuffle",
    },
    rock: {
      stepMs: 106,
      swing: 5,
      melody: [220, 247, 262, 330, 294, 262, 247, 220, 196, 220, 247, 294, 330, 294, 262, 247, 220, 262, 294, 392, 330, 294, 262, 220, 196, 247, 294, 330, 392, 330, 294, 247],
      bass: [55, 55, 65, 65, 73, 73, 82, 73, 55, 55, 65, 73, 49, 49, 55, 65],
      harmony: [110, 131, 147, 165, 98, 123, 147, 165],
      wave: "sawtooth",
      drums: "battle",
    },
    forest: {
      stepMs: 130,
      swing: 7,
      melody: [294, 370, 440, 494, 440, 370, 330, 294, 247, 294, 370, 440, 494, 587, 494, 440, 294, 330, 370, 494, 440, 370, 330, 247, 294, 370, 440, 587, 554, 494, 440, 370],
      bass: [73, 73, 98, 98, 82, 82, 110, 98, 73, 73, 98, 110, 82, 82, 98, 110],
      harmony: [147, 185, 220, 247, 165, 196, 247, 220],
      wave: "triangle",
      drums: "jungle",
    },
    zico: {
      stepMs: 104,
      swing: 3,
      melody: [294, 370, 440, 554, 494, 440, 370, 294, 330, 392, 494, 587, 554, 494, 440, 370, 294, 370, 466, 554, 494, 440, 370, 330, 247, 330, 440, 587, 659, 587, 494, 440],
      bass: [49, 49, 61.7, 61.7, 73, 73, 82, 73, 49, 49, 61.7, 73, 55, 55, 61.7, 73],
      harmony: [98, 123, 147, 185, 110, 147, 165, 196],
      wave: "sawtooth",
      drums: "battle",
    },
    ending: {
      stepMs: 164,
      melody: [262, 330, 392, 523, 392, 523, 659, 784, 698, 659, 523, 587, 523, 440, 392, 523],
      bass: [131, 131, 165, 165, 196, 196, 220, 262],
      harmony: [330, 392, 440, 523],
      wave: "triangle",
      drums: "victory",
    },
  };

  function initAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioCtor) audioContext = new AudioCtor();
    }
    if (audioContext && !masterGain) {
      masterGain = audioContext.createGain();
      musicGain = audioContext.createGain();
      sfxGain = audioContext.createGain();
      audioCompressor = audioContext.createDynamicsCompressor();
      outputGain = audioContext.createGain();
      musicDelay = audioContext.createDelay(0.35);
      musicEchoGain = audioContext.createGain();
      musicChorusDelay = audioContext.createDelay(0.06);
      musicChorusGain = audioContext.createGain();
      musicReverb = audioContext.createConvolver();
      musicReverbGain = audioContext.createGain();
      musicDrive = audioContext.createWaveShaper();
      musicPresence = audioContext.createBiquadFilter();
      musicGain.gain.value = 2.95;
      sfxGain.gain.value = 1.8;
      masterGain.gain.value = 1.5;
      outputGain.gain.value = 1.34;
      musicDelay.delayTime.value = 0.115;
      musicEchoGain.gain.value = 0.13;
      musicChorusDelay.delayTime.value = 0.021;
      musicChorusGain.gain.value = 0.19;
      musicReverbGain.gain.value = 0.105;
      const driveCurve = new Float32Array(512);
      for (let i = 0; i < driveCurve.length; i += 1) {
        const x = i * 2 / (driveCurve.length - 1) - 1;
        driveCurve[i] = Math.tanh(x * 1.65) / Math.tanh(1.65);
      }
      musicDrive.curve = driveCurve;
      musicDrive.oversample = "2x";
      musicPresence.type = "peaking";
      musicPresence.frequency.value = 1650;
      musicPresence.Q.value = 0.72;
      musicPresence.gain.value = 3.8;
      audioCompressor.threshold.value = -21;
      audioCompressor.knee.value = 10;
      audioCompressor.ratio.value = 7;
      audioCompressor.attack.value = 0.003;
      audioCompressor.release.value = 0.17;
      musicGain.connect(musicDrive).connect(musicPresence).connect(masterGain);
      musicGain.connect(musicDelay).connect(musicEchoGain).connect(masterGain);
      musicGain.connect(musicChorusDelay).connect(musicChorusGain).connect(masterGain);
      const impulseLength = Math.floor(audioContext.sampleRate * 0.72);
      const impulse = audioContext.createBuffer(2, impulseLength, audioContext.sampleRate);
      for (let channelIndex = 0; channelIndex < impulse.numberOfChannels; channelIndex += 1) {
        const data = impulse.getChannelData(channelIndex);
        for (let i = 0; i < impulseLength; i += 1) {
          const decay = Math.pow(1 - i / impulseLength, 2.7);
          data[i] = (Math.random() * 2 - 1) * decay * (channelIndex ? 0.82 : 1);
        }
      }
      musicReverb.buffer = impulse;
      musicGain.connect(musicReverb).connect(musicReverbGain).connect(masterGain);
      musicChorusLfo = audioContext.createOscillator();
      const chorusDepth = audioContext.createGain();
      musicChorusLfo.type = "sine";
      musicChorusLfo.frequency.value = 0.38;
      chorusDepth.gain.value = 0.0038;
      musicChorusLfo.connect(chorusDepth).connect(musicChorusDelay.delayTime);
      musicChorusLfo.start();
      sfxGain.connect(masterGain);
      masterGain.connect(audioCompressor).connect(outputGain).connect(audioContext.destination);
    }
    if (audioContext && !noiseBuffer) {
      const frameCount = Math.floor(audioContext.sampleRate * 0.22);
      noiseBuffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
      const channel = noiseBuffer.getChannelData(0);
      for (let i = 0; i < frameCount; i += 1) {
        const fade = 1 - i / frameCount;
        channel[i] = (Math.random() * 2 - 1) * fade;
      }
    }
    if (audioContext?.state === "suspended") audioContext.resume();
  }

  function tone(frequency, duration = 0.08, type = "square", volume = 0.025, delay = 0, bus = "sfx") {
    if (muted || !audioContext || !frequency) return;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const destination = bus === "music" ? musicGain : sfxGain;
    const attack = bus === "music" ? 0.012 : 0.006;
    const releaseStart = start + Math.max(attack + 0.012, duration * (bus === "music" ? 0.58 : 0.72));
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + attack);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.68), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    if (bus === "music" && audioContext.createStereoPanner) {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = frequency >= 220 ? -0.18 : 0.04;
      oscillator.connect(gain).connect(panner).connect(destination);
    } else {
      oscillator.connect(gain).connect(destination);
    }
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    if (bus === "music") {
      const companion = audioContext.createOscillator();
      const companionGain = audioContext.createGain();
      companion.type = type === "square" || type === "sawtooth" ? "triangle" : "sine";
      companion.frequency.setValueAtTime(frequency, start);
      companion.detune.setValueAtTime(frequency >= 180 ? 7 : -5, start);
      companionGain.gain.setValueAtTime(0.0001, start);
      companionGain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.28), start + attack + 0.004);
      companionGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 1.08);
      if (audioContext.createStereoPanner) {
        const companionPanner = audioContext.createStereoPanner();
        companionPanner.pan.value = frequency >= 220 ? 0.24 : -0.08;
        companion.connect(companionGain).connect(companionPanner).connect(destination);
      } else {
        companion.connect(companionGain).connect(destination);
      }
      companion.start(start);
      companion.stop(start + duration * 1.08 + 0.025);
    }
  }

  function drumHit(kind, volume = 0.012, delay = 0, bus = "sfx") {
    if (muted || !audioContext) return;
    const start = audioContext.currentTime + delay;
    const destination = bus === "music" ? musicGain : sfxGain;
    if (kind === "kick" || kind === "tom") {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(kind === "tom" ? 210 : 145, start);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "tom" ? 82 : 46, start + (kind === "tom" ? 0.15 : 0.105));
      gain.gain.setValueAtTime(Math.max(0.0002, volume * (kind === "tom" ? 1.35 : 1.7)), start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (kind === "tom" ? 0.18 : 0.13));
      oscillator.connect(gain).connect(destination);
      oscillator.start(start);
      oscillator.stop(start + (kind === "tom" ? 0.2 : 0.15));
      return;
    }
    if (!noiseBuffer) return;
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = noiseBuffer;
    filter.type = kind === "snare" ? "bandpass" : "highpass";
    filter.frequency.setValueAtTime(kind === "snare" ? 1650 : 5200, start);
    filter.Q.setValueAtTime(kind === "snare" ? 0.8 : 0.4, start);
    const duration = kind === "snare" ? 0.105 : 0.035;
    gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(destination);
    source.start(start);
    source.stop(start + duration + 0.01);
  }

  function sfx(name) {
    const sounds = {
      jump: [390, 0.09, "square", 0.035],
      coin: [880, 0.09, "square", 0.035],
      shoot: [540, 0.045, "square", 0.028],
      hit: [95, 0.16, "sawtooth", 0.045],
      heal: [523, 0.18, "triangle", 0.035],
      stomp: [170, 0.1, "square", 0.035],
      bossHit: [740, 0.08, "square", 0.04],
      door: [330, 0.13, "triangle", 0.035],
      bite: [165, 0.08, "square", 0.035],
      gulp: [262, 0.14, "triangle", 0.032],
    };
    const sound = sounds[name];
    if (!sound) return;
    tone(sound[0], sound[1], sound[2], sound[3]);
    if (name === "coin" || name === "heal") tone(sound[0] * 1.5, sound[1], sound[2], sound[3] * 0.7, 0.07);
    if (name === "jump") tone(585, 0.055, "square", 0.016, 0.035);
    if (name === "hit") {
      drumHit("kick", 0.026);
      tone(62, 0.2, "triangle", 0.028);
    }
    if (name === "stomp") {
      drumHit("kick", 0.024);
      drumHit("snare", 0.012, 0.025);
    }
    if (name === "bossHit") {
      drumHit("kick", 0.03);
      tone(148, 0.14, "sawtooth", 0.028, 0.018);
    }
  }

  function musicIntensity() {
    if (!["boss", "rock", "zico"].includes(musicTheme) || !boss.active) return 1;
    return clamp(boss.phase || 1, 1, 3);
  }

  function playMusicStinger(theme, level = 1) {
    if (muted || !audioContext) return;
    const root = theme === "rock" ? 55 : theme === "zico" ? 49 : theme === "boss" ? 73 : theme === "ending" ? 131 : 110;
    const notes = level >= 3 ? [root, root * 1.5, root * 2, root * 3] : [root, root * 1.25, root * 1.5, root * 2];
    notes.forEach((note, index) => {
      tone(note, 0.12 + index * 0.025, index < 2 ? "square" : "sawtooth", 0.015, index * 0.075, "music");
    });
    drumHit("kick", 0.018, 0, "music");
    drumHit("snare", 0.012, 0.22, "music");
  }

  function playBossPhaseStinger(level) {
    lastMusicBeat = performance.now() + 220;
    playMusicStinger(musicTheme, level);
    if (level >= 2) drumHit("kick", 0.018, 0.3, "music");
    if (level >= 3) {
      drumHit("snare", 0.014, 0.36, "music");
      drumHit("tom", 0.013, 0.43, "music");
      tone(musicTheme === "rock" ? 440 : musicTheme === "zico" ? 659 : 587, 0.28, "sawtooth", 0.014, 0.37, "music");
    }
  }

  function updateMusic(now) {
    if (muted || !audioContext || mode === "pause" || mode === "gameover") return;
    const theme = musicThemes[musicTheme] || musicThemes.street;
    const intensity = musicIntensity();
    const bossBoost = ["boss", "rock", "zico"].includes(musicTheme) ? (intensity - 1) * (musicTheme === "rock" ? 15 : musicTheme === "zico" ? 17 : 13) : 0;
    const swing = theme.swing && musicStep % 2 ? theme.swing : 0;
    const beatLength = Math.max(82, theme.stepMs - bossBoost + swing);
    if (now - lastMusicBeat < beatLength) return;
    lastMusicBeat = now;
    const note = theme.melody[musicStep % theme.melody.length];
    const battleTheme = ["boss", "rock", "zico"].includes(musicTheme);
    const drivingTheme = battleTheme || ["street", "bar", "forest"].includes(musicTheme);
    const noteDuration = Math.min(0.18, beatLength / 1000 * 0.9);
    tone(note, noteDuration, theme.wave, battleTheme ? 0.0195 : drivingTheme ? 0.0168 : 0.0142, 0, "music");
    if (battleTheme && note && musicStep % 4 !== 3) {
      tone(note * 2, Math.min(0.095, noteDuration * 0.72), "square", 0.0058 + intensity * 0.0008, 0.012, "music");
    }

    if (musicStep % 2 === 0) {
      const bass = theme.bass[Math.floor(musicStep / 2) % theme.bass.length];
      const bassWave = ["rock", "zico"].includes(musicTheme) ? "sawtooth" : musicTheme === "boss" ? "square" : "triangle";
      tone(bass, Math.min(0.28, beatLength / 1000 * 1.85), bassWave, battleTheme ? 0.0205 : 0.018, 0, "music");
      if (battleTheme) tone(bass * 2, 0.075, "square", 0.0065, 0.025, "music");
    }
    if (musicStep % 4 === 0 || (["boss", "rock", "zico"].includes(musicTheme) && intensity >= 2 && musicStep % 2 === 0)) {
      const harmony = theme.harmony[Math.floor(musicStep / 2) % theme.harmony.length];
      tone(harmony, Math.min(0.19, beatLength / 1000 * 1.25), musicTheme === "rock" ? "square" : "triangle", 0.0074 + intensity * 0.00155, 0, "music");
    }

    if (musicStep % 8 === 0) {
      const padRoot = theme.bass[Math.floor(musicStep / 4) % theme.bass.length];
      const padDuration = Math.max(0.48, beatLength / 1000 * 5.4);
      tone(padRoot * 2, padDuration, "sine", 0.0048 + intensity * 0.00045, 0.012, "music");
      tone(padRoot * 3, padDuration * 0.92, "triangle", 0.0037 + intensity * 0.00035, 0.042, "music");
    }

    if (theme.drums !== "pulse") {
      if (musicStep % 4 === 0 || (battleTheme && intensity >= 2 && musicStep % 4 === 3)) drumHit("kick", 0.015 + intensity * 0.0023, 0, "music");
      if (musicStep % 4 === 2 && theme.drums !== "light") drumHit("snare", 0.012 + intensity * 0.0018, 0, "music");
      if (musicStep % 2 === 1 && (theme.drums !== "light" || musicStep % 4 === 3)) drumHit("hat", 0.0045 + intensity * 0.0008, 0, "music");
      if (battleTheme && intensity >= 2 && musicStep % 8 === 6) drumHit("tom", 0.012 + intensity * 0.0015, 0.018, "music");
    } else if (musicStep % 8 === 0) {
      drumHit("kick", 0.007, 0, "music");
    }

    if (["boss", "rock", "zico"].includes(musicTheme) && intensity >= 2 && note && musicStep % 2 === 1) {
      tone(note * (intensity >= 3 ? 2 : 1.5), 0.045, "square", intensity >= 3 ? 0.0065 : 0.0049, 0.038, "music");
    }
    if (["boss", "rock", "zico"].includes(musicTheme) && intensity >= 3) {
      drumHit("hat", 0.006, 0.048, "music");
    }
    musicStep += 1;
    canvas.dataset.musicTheme = musicTheme;
    canvas.dataset.musicIntensity = String(intensity);
    canvas.dataset.musicStep = String(musicStep);
  }

  function setMusic(theme) {
    if (musicTheme === theme) return;
    musicTheme = theme;
    musicStep = 0;
    lastMusicBeat = 0;
    canvas.dataset.musicTheme = theme;
    canvas.dataset.musicIntensity = String(musicIntensity());
    canvas.dataset.musicStep = "0";
    if (["boss", "rock", "zico", "ending"].includes(theme)) playMusicStinger(theme, boss.phase || 1);
  }

  function notify(message, duration = 1600) {
    toastMessage = message;
    toastUntil = performance.now() + duration;
  }

  function renderToast(now) {
    const message = now < toastUntil ? toastMessage : contextHint;
    ui.toast.hidden = !message;
    if (message) ui.toast.textContent = message;
  }

  function bossPhaseForHealth(health = boss.health) {
    const ratio = health / boss.maxHealth;
    if (ratio <= 0.33) return 3;
    if (ratio <= 0.66) return 2;
    return 1;
  }

  function bossTuning() {
    return [
      null,
      { throwCooldown: 1.28, throwDuration: 6, spinDuration: 5.2, spinInterval: 0.44, spinAmplitude: 96, dizzyDuration: 6.4, carrotDamage: 10, speed: 0.88 },
      { throwCooldown: 1.02, throwDuration: 6.5, spinDuration: 6.3, spinInterval: 0.38, spinAmplitude: 122, dizzyDuration: 5.8, carrotDamage: 12, speed: 1 },
      { throwCooldown: 0.8, throwDuration: 7, spinDuration: 7.4, spinInterval: 0.32, spinAmplitude: 148, dizzyDuration: 5.1, carrotDamage: 14, speed: 1.1 },
    ][boss.phase];
  }

  function updateHud() {
    ui.lifeFill.style.width = `${hero.health}%`;
    ui.lifeFill.classList.toggle("low", hero.health <= 35);
    ui.lifeText.textContent = `${hero.health} / 100`;
    ui.coins.textContent = String(coinCount).padStart(3, "0");
    ui.snacks.textContent = String(snackCount);
    ui.eatButton.classList.toggle("empty", snackCount === 0);
    ui.eatButton.classList.toggle("ready", snackCount > 0 && hero.health < 100);
    ui.eatButton.setAttribute("aria-label", snackCount > 0
      ? `Comer X-salada; ${snackCount} guardado${snackCount === 1 ? "" : "s"}`
      : "Comer X-salada; nenhum guardado");
    const shootLocked = shootLockedTimer > 0;
    const biluiaReady = stageNumber === 3 && boss.active && biluiaPickup?.bossGift && !biluiaPickup.eaten && !biluiaBossUsed;
    ui.shootButton?.classList.toggle("locked", shootLocked);
    ui.shootButton?.classList.toggle("biluia-ready", biluiaReady);
    ui.shootButton?.setAttribute("aria-label", shootLocked
      ? `Gudes bloqueadas por mais ${Math.ceil(shootLockedTimer)} segundos`
      : biluiaReady ? "Ativar modo Biluia" : "Jogar bolinha de gude");
    const shootLabel = ui.shootButton?.querySelector("small");
    if (shootLabel) shootLabel.textContent = shootLocked ? "BLOQUEADA" : biluiaReady ? "BILUIA" : "GUDE";
    const bossPercent = clamp((boss.health / boss.maxHealth) * 100, 0, 100);
    ui.bossFill.style.width = `${bossPercent}%`;
    ui.bossFill.dataset.health = String(boss.health);
    ui.bossFill.classList.toggle("danger", boss.phase === 3);
    if (ui.bossPhase) ui.bossPhase.textContent = `NÍVEL ${boss.phase}`;
    if (ui.bossName) ui.bossName.textContent = boss.name;
    ui.bossFill.parentElement?.setAttribute("aria-label", `Energia de ${boss.name}: ${boss.health} de ${boss.maxHealth}; nível ${boss.phase}`);
  }

  function makeEnemy(seed, index) {
    const sizes = {
      hopper: [34, 42],
      roller: [38, 38],
      crate: [44, 44],
      snack: [46, 39],
      shooter: [42, 58],
      burrower: [38, 54],
      cart: [66, 42],
      can: [32, 42],
      bottle: [31, 54],
      keg: [52, 46],
      coaster: [44, 24],
      workerbee: [42, 34],
      beetle: [46, 34],
      sprout: [40, 50],
      hive: [52, 58],
    };
    const [w, h] = sizes[seed.type];
    return {
      ...seed,
      w,
      h,
      y: 500 - h,
      dir: index % 2 ? -1 : 1,
      alive: true,
      phase: index * 0.83,
      step: 0,
      squash: 0,
      hitFlash: 0,
      shotTimer: 0.7 + (index % 3) * 0.35,
      anchorX: seed.x,
      active: true,
    };
  }

  function configureStage(number) {
    stageNumber = [2, 3].includes(number) ? number : 1;
    const isRockStage = stageNumber === 2;
    const isZicoStage = stageNumber === 3;
    ground = isZicoStage ? stageThreeGround : isRockStage ? stageTwoGround : stageOneGround;
    ledges = isZicoStage ? stageThreeLedges : isRockStage ? stageTwoLedges : stageOneLedges;
    collisionPlatforms = [...ground, ...ledges];
    coinSeed = isZicoStage ? stageThreeCoinSeed : isRockStage ? stageTwoCoinSeed : stageOneCoinSeed;
    foodSeed = isZicoStage ? stageThreeFoodSeed : isRockStage ? stageTwoFoodSeed : stageOneFoodSeed;
    enemySeed = isZicoStage ? stageThreeEnemySeed : isRockStage ? stageTwoEnemySeed : stageOneEnemySeed;
    levelSections = isZicoStage ? stageThreeSections : isRockStage ? stageTwoSections : stageOneSections;
  }

  function resetWorld(targetStage = stageNumber) {
    configureStage(targetStage);
    hero.x = 90;
    hero.y = 500 - hero.h;
    hero.vx = 0;
    hero.vy = 0;
    hero.face = 1;
    hero.health = 100;
    hero.invincible = 0;
    hero.flash = 0;
    hero.shootAnim = 0;
    hero.eatAnim = 0;
    hero.eatHealed = false;
    hero.eatStage = 0;
    hero.squash = 0;
    hero.walkCycle = 0;
    hero.lastFootstep = -1;
    hero.coyote = 0.12;
    hero.jumpBuffer = 0;
    hero.onGround = true;
    camera = 0;
    cameraLook = 0;
    cameraLift = 0;
    zoom = 1;
    gameTime = 0;
    coinCount = 0;
    snackCount = 0;
    jumpWasDown = false;
    jumpQueued = false;
    shootCooldown = 0;
    shootLockedTimer = 0;
    shootUnlockNoticeArmed = false;
    activePointers.clear();
    input.left = input.right = input.jump = input.shoot = input.eat = false;
    document.querySelectorAll("[data-control].active").forEach((button) => button.classList.remove("active"));
    currentSection = 0;
    coins = coinSeed.map(([x, y]) => ({ x, y, r: 12, collected: false }));
    foods = foodSeed.map((food) => ({ ...food, w: 38, h: 28, collected: false }));
    enemies = enemySeed.map(makeEnemy);
    marbles = [];
    carrots = [];
    particles = [];
    damageNumbers = [];
    screenShake = 0;
    impactFlash = 0;
    impactColor = "#fff5c4";
    hitStopTimer = 0;
    landingPulse = 0;
    drunkTimer = 0;
    drunkLevel = 0;
    drunkPersistent = false;
    drunkMessageTimer = 0;
    visitedFriends = false;
    biluiaState = "none";
    biluiaTimer = 0;
    biluiaIntroTimer = 0;
    biluiaPickup = null;
    biluiaRain = [];
    biluiaRainStarted = false;
    biluiaFlightCompleted = false;
    biluiaBossGiftSpawned = false;
    biluiaBossUsed = false;
    biluiaLaughTimer = 0;
    hero.flightFuel = 0;
    Object.assign(boss, {
      x: BOSS_HOME,
      y: 520,
      health: stageNumber === 3 ? ZICO_MAX_HEALTH : stageNumber === 2 ? ROCK_MAX_HEALTH : BOSS_MAX_HEALTH,
      maxHealth: stageNumber === 3 ? ZICO_MAX_HEALTH : stageNumber === 2 ? ROCK_MAX_HEALTH : BOSS_MAX_HEALTH,
      kind: stageNumber === 3 ? "zico" : stageNumber === 2 ? "rock" : "joyce",
      name: stageNumber === 3 ? "TEIÚ DO ZICO" : stageNumber === 2 ? "ROCK DENTE DE CAVALO" : "JOYCE CENORITA",
      active: false,
      state: "hidden",
      timer: 0,
      throwTimer: 0,
      shotIndex: 0,
      vulnerable: false,
      flash: 0,
      throwAnim: 0,
      hitCount: 0,
      phase: 1,
      phaseFlash: 0,
      attackIndex: 0,
      dir: -1,
      turnFlash: 0,
      biteCooldown: 0,
      retaliationShots: 0,
      stompCount: 0,
      lastStompHealth: null,
      breathShots: 0,
      cycleCount: 0,
      companionTimer: 0,
    });
    cans = [];
    rockMarbles = [];
    alcoholBreaths = [];
    zicoHazards = [];
    ui.bossHud.hidden = true;
    ui.bossBanner.hidden = true;
    contextHint = "";
    updateHud();
  }

  function hideLayers() {
    ui.title.hidden = true;
    ui.story.hidden = true;
    ui.pause.hidden = true;
    ui.ending.hidden = true;
    ui.gameOver.hidden = true;
  }

  function renderStory() {
    const frame = storyFrames[storyIndex];
    ui.comicPanel.className = `comic-panel ${frame.className}`.trim();
    ui.storySpeaker.textContent = frame.speaker;
    ui.storyText.textContent = frame.text;
    document.querySelector("#next-story").textContent = storyIndex === storyFrames.length - 1 ? "COMEÇAR ▶" : "PRÓXIMO ▶";
  }

  function beginStory() {
    initAudio();
    hideLayers();
    mode = "story";
    storyIndex = 0;
    ui.story.hidden = false;
    setMusic("story");
    renderStory();
  }

  function startGame() {
    initAudio();
    hideLayers();
    resetWorld(stageNumber);
    mode = "play";
    setMusic(stageNumber === 3 ? "forest" : stageNumber === 2 ? "bar" : "street");
    previousTime = performance.now();
    notify(stageNumber === 3
      ? "FASE 3 · ENTRE NA MATA E SIGA O ZUMBIDO"
      : stageNumber === 2 ? "FASE 2 · SIGA A RUA DOS BARES" : "SIGA O RASTRO PELAS RUAS", 2400);
  }

  function showGameOver() {
    if (mode !== "play") return;
    mode = "gameover";
    input.left = input.right = input.jump = input.shoot = input.eat = false;
    ui.gameOver.hidden = false;
    ui.gameOverTitle.textContent = `SHALL VOLTA AO COMEÇO DA FASE ${stageNumber}`;
    ui.gameOverText.textContent = stageNumber === 3
      ? "Guarde X-saladas. O Biluia vence a abelha, mas o Teiú come a transformação se estiver no mapa."
      : stageNumber === 2
        ? "Guarde X-saladas, desvie das latinhas e pule para escapar das três baforadas do Rock."
        : "Colete X-saladas e use o botão COMER para recuperar 25 pontos.";
    ui.bossBanner.hidden = true;
    sfx("hit");
  }

  function showEnding() {
    mode = "ending";
    input.left = input.right = input.jump = input.shoot = input.eat = false;
    ui.bossHud.hidden = true;
    ui.ending.hidden = false;
    ui.endingBoss.src = stageNumber === 3 ? "./assets/zico-flee-32.png" : stageNumber === 2 ? "./assets/rock-flee.png" : "./assets/joyce-cenorita-v2.png";
    setMusic("ending");
    endingIndex = 0;
    renderEnding();
  }

  const endingFramesJoyce = [
    { className: "frame-flee", kicker: "DEPOIS DA BATALHA", title: "JOYCE FUGIU!", text: "“Vocês não viram a última cenoura!”" },
    { className: "frame-clue", kicker: "ALGO CAIU DA BANCA", title: "UMA FOTOGRAFIA...", text: "É uma foto de Shall e Cleyde." },
    { className: "frame-vow", kicker: "SHALL RECONHECE A PISTA", title: "CLEYDE ESTEVE AQUI", text: "“Eu vou encontrar você. Eu prometo!”" },
    { className: "frame-shadow", kicker: "NO ALTO DE UM PRÉDIO...", title: "A SOMBRA OBSERVA", text: "A próxima pista aponta para a Cuesta." },
  ];

  const endingFramesRock = [
    { className: "frame-flee", kicker: "DEPOIS DA BATALHA", title: "ROCK DEU NO PÉ!", text: "As latinhas caem no chão enquanto ele foge de chinelo." },
    { className: "frame-clue", kicker: "PERTO DO BALCÃO", title: "OUTRA PISTA...", text: "Um bilhete mostra que Cleyde passou pela rua dos bares." },
    { className: "frame-vow", kicker: "SHALL RESPIRA FUNDO", title: "A BUSCA CONTINUA", text: "“Cleyde... agora eu sei que estou no caminho certo!”" },
    { className: "frame-shadow", kicker: "NA PRÓXIMA ESQUINA...", title: "ALGUÉM OBSERVA", text: "Uma nova criatura espera Shall na noite de Botucatu." },
  ];

  const endingFramesZico = [
    { className: "frame-flee", kicker: "DEPOIS DO TERCEIRO COMBATE", title: "ZICO BATEU EM RETIRADA!", text: "O Zangão foge pela mata enquanto o Teiú e o enxame se espalham." },
    { className: "frame-clue", kicker: "JUNTO À BANCADA", title: "UMA FERRAMENTA MARCADA...", text: "No cabo há uma fita roxa que pertence a Cleyde." },
    { className: "frame-vow", kicker: "SHALL APERTA A PISTA", title: "ELA PASSOU PELA HORTA", text: "“Cleyde, eu estou cada vez mais perto de você!”" },
    { className: "frame-shadow", kicker: "ALÉM DA MATA...", title: "O CAMINHO CONTINUA", text: "Um zumbido distante aponta para a próxima aventura." },
  ];

  function currentEndingFrames() {
    return stageNumber === 3 ? endingFramesZico : stageNumber === 2 ? endingFramesRock : endingFramesJoyce;
  }

  function renderEnding() {
    const endingFrames = currentEndingFrames();
    const frame = endingFrames[endingIndex];
    ui.endingComic.className = `ending-comic ${frame.className}`;
    ui.endingKicker.textContent = frame.kicker;
    ui.endingTitle.textContent = frame.title;
    ui.endingText.textContent = frame.text;
    const isLast = endingIndex === endingFrames.length - 1;
    ui.endingContinua.hidden = !isLast;
    ui.nextEnding.hidden = isLast;
    ui.playAgain.hidden = !isLast;
    ui.playAgain.textContent = stageNumber === 1 ? "FASE 2 · ROCK ▶" : stageNumber === 2 ? "FASE 3 · ZICO ▶" : "JOGAR NOVAMENTE";
    ui.ending.dataset.frame = frame.className;
  }

  function togglePause(forceResume = false) {
    if (mode === "play") {
      mode = "pause";
      input.left = input.right = input.jump = input.shoot = input.eat = false;
      ui.pause.hidden = false;
    } else if (mode === "pause" || forceResume) {
      mode = "play";
      ui.pause.hidden = true;
      previousTime = performance.now();
    }
  }

  function damageHero(amount, sourceX) {
    if (hero.invincible > 0 || mode !== "play") return;
    hero.health = clamp(hero.health - amount, 0, 100);
    hero.invincible = 1.15;
    hero.flash = 0.5;
    hero.squash = 0.28;
    screenShake = Math.max(screenShake, 8);
    triggerImpact(0.12, 0.045, "#ff5363");
    hero.vx = sourceX < hero.x ? 230 : -230;
    hero.vy = -260;
    updateHud();
    sfx("hit");
    if (hero.health <= 0) showGameOver();
  }

  function applyDrunkEffect(level, source = "breath") {
    const nextLevel = clamp(level, 1, 3);
    const upgraded = nextLevel > drunkLevel;
    drunkLevel = Math.max(drunkLevel, nextLevel);
    // A baforada do Rock não pode ser curada ou anulada durante a batalha.
    drunkPersistent = source === "breath" || drunkPersistent;
    drunkTimer = drunkPersistent
      ? Math.max(drunkTimer, 90)
      : Math.max(drunkTimer, nextLevel === 2 ? 10 : 8);
    if (source === "breath" && !upgraded) return;
    drunkMessageTimer = source === "friends" ? 0.4 : 2.8;
    screenShake = Math.max(screenShake, 5 + nextLevel * 2);
    navigator.vibrate?.(nextLevel === 3 ? [45, 35, 45, 35, 70] : [28, 35, 42]);
    const message = nextLevel === 1
      ? "BAFORADA NÍVEL 1 — A VISÃO COMEÇOU A ONDULAR!"
      : nextLevel === 2
        ? "BAFORADA NÍVEL 2 — VISÃO DUPLA E PASSOS TORTOS!"
        : "BAFORADA NÍVEL 3 — DISTORÇÃO MÁXIMA; ROCK ESTÁ APELANDO!";
    notify(message, nextLevel === 3 ? 3300 : 2600);
    tone(nextLevel === 3 ? 82 : nextLevel === 2 ? 110 : 147, 0.28, "sawtooth", 0.028);
  }

  function fireMarble() {
    if (stageNumber === 3 && boss.active && boss.phase >= 2 && biluiaState !== "active" && biluiaPickup && !biluiaPickup.eaten && !biluiaBossUsed) {
      if (activateBossBiluia()) return;
    }
    if (shootLockedTimer > 0) {
      if (shootCooldown <= 0) {
        shootCooldown = 0.45;
        notify("ROCK CONFISCOU AS GUDES — DESVIE DA RAJADA!", 1100);
        navigator.vibrate?.([16, 28, 16]);
      }
      return;
    }
    if (shootCooldown > 0 || marbles.length >= 6 || hero.eatAnim > 0) return;
    shootCooldown = 0.36;
    hero.shootAnim = 0.32;
    marbles.push({
      x: hero.x + (hero.face > 0 ? hero.w + 4 : -8),
      y: hero.y + 29,
      w: 10,
      h: 10,
      vx: hero.face * 430,
      vy: -18,
      life: 1.45,
      age: 0,
      rotation: 0,
      biluia: biluiaState === "active",
    });
    burst(hero.x + (hero.face > 0 ? hero.w + 8 : -4), hero.y + 34, "#b9efff", 4, 70);
    sfx("shoot");
  }

  function eatSnack() {
    if (mode !== "play" || hero.eatAnim > 0) return;
    if (snackCount <= 0) {
      notify("NENHUM X-SALADA GUARDADO", 1200);
      navigator.vibrate?.([18, 28, 18]);
      return;
    }
    if (hero.health >= 100) {
      notify("ENERGIA JÁ ESTÁ CHEIA — LANCHE PRESERVADO", 1500);
      return;
    }
    snackCount -= 1;
    hero.eatAnim = EAT_DURATION;
    hero.eatHealed = false;
    hero.eatStage = 0;
    hero.vx *= 0.34;
    updateHud();
    notify("NHAC! SHALL ESTÁ COMENDO...", 1250);
    navigator.vibrate?.([10, 40, 10]);
    tone(185, 0.07, "square", 0.022);
  }

  function spawnBiluiaRain() {
    if (stageNumber !== 3 || biluiaRainStarted) return;
    biluiaRainStarted = true;
    biluiaRain = Array.from({ length: 24 }, (_, index) => ({
      x: index === 0 ? hero.x + 120 : 4580 + (index % 12) * 96 + Math.random() * 54,
      y: index === 0 ? 448 : 40 - Math.floor(index / 12) * 210 - Math.random() * 180,
      w: 28,
      h: 22,
      vy: index === 0 ? 75 : 52 + Math.random() * 42,
      drift: Math.random() * Math.PI * 2,
      landed: false,
      frame: index % 2,
    }));
    notify("CHUVA DE ALELUIAS! SHALL PAROU PARA ADMIRAR...", 2500);
    playMusicStinger("forest", 2);
  }

  function transformIntoBiluia(source = "map") {
    if (biluiaState === "active") return;
    biluiaState = "active";
    biluiaTimer = source === "boss" ? 18 : BILUIA_DURATION;
    hero.flightFuel = biluiaTimer;
    biluiaIntroTimer = 1.15;
    biluiaBossUsed ||= source === "boss";
    hero.vy = -260;
    hero.onGround = false;
    screenShake = Math.max(screenShake, 8);
    triggerImpact(0.18, 0.06, "#fff3a5");
    burst(hero.x + hero.w / 2, hero.y + hero.h / 2, "#f4d778", 24, 205);
    notify("OLHA, BILUIA! ASAS ATIVADAS — SEGURE PULAR PARA VOAR!", 3400);
    updateHud();
    tone(659, 0.18, "square", 0.035);
    tone(988, 0.22, "sawtooth", 0.024, 0.1);
  }

  function updateBiluia(dt) {
    if (stageNumber !== 3) return;
    if (!biluiaRainStarted && hero.x > 4450 && !boss.active) spawnBiluiaRain();
    for (const bug of biluiaRain) {
      if (bug.landed) continue;
      bug.y += bug.vy * dt;
      bug.x += Math.sin(gameTime * 4.8 + bug.drift) * 18 * dt;
      if (bug.y >= 472) {
        bug.y = 472;
        bug.landed = true;
      }
    }
    if (biluiaState === "none" && biluiaRainStarted) {
      const candidate = biluiaRain.find((bug) => bug.landed && Math.abs(hero.x + hero.w / 2 - bug.x) < 42);
      if (candidate) {
        biluiaState = "admire";
        biluiaPickup = candidate;
        biluiaIntroTimer = 1.9;
        hero.vx = 0;
        notify("QUE INSETO DIFERENTE... SHALL PEGOU UMA ALELUIA!", 1900);
      }
    } else if (biluiaState === "admire") {
      biluiaIntroTimer -= dt;
      hero.vx *= Math.pow(0.002, dt);
      if (biluiaIntroTimer <= 0.95 && biluiaPickup && !biluiaPickup.eaten) {
        biluiaPickup.eaten = true;
        sfx("bite");
        notify("NHAC!", 650);
      }
      if (biluiaIntroTimer <= 0) transformIntoBiluia("map");
    } else if (boss.active && boss.kind === "zico" && biluiaState !== "active" && biluiaPickup?.bossGift && !biluiaPickup.eaten && overlap(hero, biluiaPickup)) {
      if (zicoHazards.some((hazard) => hazard.kind === "teiu" && hazard.life > 0)) {
        activateBossBiluia();
      } else {
        biluiaPickup.eaten = true;
        transformIntoBiluia("boss");
      }
    } else if (biluiaPickup?.bossGift && !biluiaPickup.eaten && overlap(hero, biluiaPickup)) {
      if (zicoHazards.some((hazard) => hazard.kind === "teiu" && hazard.life > 0)) {
        activateBossBiluia();
      } else {
        biluiaPickup.eaten = true;
        transformIntoBiluia("boss");
      }
    } else if (biluiaState === "active") {
      biluiaTimer = Math.max(0, biluiaTimer - dt);
      hero.flightFuel = biluiaTimer;
      if (hero.x > BILUIA_ZONE_END && !boss.active) biluiaTimer = Math.min(biluiaTimer, 1.2);
      if (biluiaTimer <= 0) {
        biluiaState = "spent";
        biluiaFlightCompleted = true;
        hero.flightFuel = 0;
        notify("AS ASAS DO BILUIA SUMIRAM — DE VOLTA AO CHÃO!", 2200);
        burst(hero.x + hero.w / 2, hero.y + 28, "#e9d296", 12, 120);
        if (!boss.active) biluiaPickup = null;
        updateHud();
      }
    }
    biluiaLaughTimer = Math.max(0, biluiaLaughTimer - dt);
  }

  function activateBossBiluia() {
    if (!boss.active || boss.kind !== "zico" || !biluiaPickup || biluiaPickup.eaten || biluiaBossUsed) return false;
    if (zicoHazards.some((hazard) => hazard.kind === "teiu" && hazard.life > 0)) {
      biluiaPickup.eaten = true;
      biluiaBossUsed = true;
      biluiaLaughTimer = 2.2;
      notify("NHAC! O TEIÚ COMEU O BILUIA E RIU DA CARA DO SHALL!", 3200);
      tone(82, 0.32, "sawtooth", 0.04);
      updateHud();
      setTimeout(() => {
        if (mode === "play") {
          hero.health = 0;
          updateHud();
          showGameOver();
        }
      }, 1050);
      return true;
    }
    biluiaPickup.eaten = true;
    transformIntoBiluia("boss");
    return true;
  }

  function recoverFromMapGap() {
    if (hero.y < 535 || hero.vy < 0) return false;
    const currentGround = ground.find((segment) => hero.x + hero.w / 2 >= segment.x && hero.x + hero.w / 2 <= segment.x + segment.w);
    if (currentGround) return false;
    const nearest = ground
      .filter((segment) => segment.x < ARENA_START || boss.active)
      .map((segment) => ({ segment, distance: Math.min(Math.abs(hero.x - segment.x), Math.abs(hero.x - (segment.x + segment.w - hero.w))) }))
      .sort((a, b) => a.distance - b.distance)[0]?.segment;
    if (!nearest || Math.abs(hero.x - nearest.x) > 190) return false;
    hero.x = clamp(hero.x, nearest.x + 8, nearest.x + nearest.w - hero.w - 8);
    hero.y = nearest.y - hero.h;
    hero.vy = 0;
    hero.onGround = true;
    hero.health = Math.max(1, hero.health - 10);
    updateHud();
    notify("SHALL SE AGARROU NA BEIRADA — -10 DE ENERGIA", 1500);
    return true;
  }

  function nearestDoor() {
    if (stageNumber === 3) return null;
    if (hero.x > BONUS_START - 120) {
      return Math.abs(hero.x + hero.w / 2 - (BONUS_END - 130)) < 58 ? "exit" : null;
    }
    const streetDoor = stageNumber === 2 ? 3650 : 2020;
    return Math.abs(hero.x + hero.w / 2 - streetDoor) < 58 ? "enter" : null;
  }

  function travelThroughDoor(which) {
    sfx("door");
    if (which === "enter") {
      hero.x = BONUS_START + 70;
      hero.y = 500 - hero.h;
      hero.vx = hero.vy = 0;
      if (stageNumber === 2) {
        applyDrunkEffect(1, "friends");
        drunkTimer = 15;
        visitedFriends = true;
        notify("OS AMIGOS DO SHALL! O MUNDO FICOU TORTO...", 2400);
      } else {
        notify("LOJA OPCIONAL: LANCHALL", 1800);
      }
    } else {
      hero.x = stageNumber === 2 ? 3715 : 2085;
      hero.y = 500 - hero.h;
      hero.vx = hero.vy = 0;
      notify(stageNumber === 2 ? "DE VOLTA À RUA... OU QUASE" : "DE VOLTA ÀS RUAS", 1500);
    }
    camera = hero.x - W * 0.3;
  }

  function activateBoss() {
    if (boss.active) return;
    boss.active = true;
    boss.state = "rise";
    boss.timer = 0;
    boss.y = 520;
    ui.bossHud.hidden = false;
    ui.bossBanner.hidden = false;
    ui.bossBannerKicker.textContent = stageNumber === 3 ? "CHEFÃO DA FASE 3" : stageNumber === 2 ? "CHEFÃO DA FASE 2" : "CHEFONA DA FASE 1";
    ui.bossBannerName.textContent = stageNumber === 3 ? "ZICO O ZANGÃO" : boss.name;
    ui.bossBannerLine.textContent = stageNumber === 3
      ? "Derrote o Teiú. Ative o Biluia contra a abelha — mas nunca quando o lagarto estiver no mapa!"
      : stageNumber === 2
        ? "Se o bafo pegar, a distorção permanece. Pule na cabeça dele durante o frenesi!"
        : "Desvie do furacão. Quando ela ficar zonza, ataque!";
    setMusic(stageNumber === 3 ? "zico" : stageNumber === 2 ? "rock" : "boss");
    setTimeout(() => {
      if (boss.active) ui.bossBanner.hidden = true;
    }, 2600);
  }

  function bossState(next) {
    boss.state = next;
    boss.timer = 0;
    boss.throwTimer = next === "throw" ? 0.72 : 0;
    boss.throwAnim = 0;
    boss.vulnerable = next === "dizzy";
    if (next === "spin") boss.shotIndex = 0;
    if (next === "spin") {
      notify(`FURACÃO FASE ${boss.phase}: OLHE O RITMO E DESVIE!`, 2400);
      screenShake = Math.max(screenShake, 5);
    }
    if (next === "dizzy") {
      carrots = [];
      notify("JOYCE ESTÁ ZONZA — ATAQUE AGORA!", 3600);
    }
  }

  function rockTuning() {
    return [
      null,
      { throwDuration: 4.55, throwCooldown: 1.04, breathDuration: 3.4, breathInterval: 0.28, frenzyDuration: 7.9, stunnedDuration: 1.4, retaliationDuration: 4.4, retaliationInterval: 0.22, damage: 12, runSpeed: 465, speed: 0.98 },
      { throwDuration: 4.15, throwCooldown: 0.86, breathDuration: 3.7, breathInterval: 0.21, frenzyDuration: 9.1, stunnedDuration: 1.2, retaliationDuration: 4.75, retaliationInterval: 0.17, damage: 15, runSpeed: 580, speed: 1.13 },
      { throwDuration: 3.8, throwCooldown: 0.7, breathDuration: 4.05, breathInterval: 0.15, frenzyDuration: 10.4, stunnedDuration: 1, retaliationDuration: 5.05, retaliationInterval: 0.13, damage: 18, runSpeed: 710, speed: 1.28 },
    ][boss.phase];
  }

  function rockState(next) {
    const wasRetaliating = boss.state === "retaliate";
    boss.state = next;
    boss.timer = 0;
    boss.throwTimer = next === "throw" ? 0.78 : 0;
    boss.throwAnim = 0;
    boss.vulnerable = false;
    if (next === "breath") {
      boss.dir = hero.x < boss.x ? -1 : 1;
      boss.throwTimer = 0.72;
      boss.breathShots = 0;
      notify(`ROCK ENCHEU O PEITO — BAFORADA NÍVEL ${boss.phase}!`, 2100);
      screenShake = Math.max(screenShake, 5 + boss.phase);
    }
    if (next === "frenzy") {
      boss.shotIndex = 0;
      boss.dir = hero.x < boss.x ? -1 : 1;
      boss.biteCooldown = 0;
      notify(`ROCK TOMOU UM GOLE — FRENESI NÍVEL ${boss.phase}!`, 2400);
      screenShake = Math.max(screenShake, 7);
    }
    if (next === "dizzy") {
      notify("PISÃO CERTEIRO! ROCK PERDEU O EQUILÍBRIO!", 1800);
    }
    if (next === "retaliate") {
      marbles = [];
      boss.retaliationShots = 0;
      boss.throwTimer = 0.32;
      shootLockedTimer = Math.max(shootLockedTimer, 5.4);
      shootUnlockNoticeArmed = true;
      updateHud();
      notify("HA HA! VOU TE MOSTRAR COMO SE JOGA ISSO!", 2800);
      screenShake = Math.max(screenShake, 8);
    }
    if (wasRetaliating && next !== "retaliate") {
      shootLockedTimer = Math.min(shootLockedTimer, 0.85);
    }
  }

  function spawnAlcoholBreath(index) {
    const level = boss.phase;
    const direction = boss.dir || (hero.x < boss.x ? -1 : 1);
    const laneSets = {
      1: [108],
      2: [110, 48],
      3: [112, 58, 18],
    };
    const lanes = laneSets[level];
    const lane = lanes[index % lanes.length];
    const width = 46 + level * 7;
    const height = 30 + level * 5;
    alcoholBreaths.push({
      x: direction > 0 ? boss.x + boss.w - 22 : boss.x - width + 22,
      y: boss.y + lane,
      w: width,
      h: height,
      vx: direction * (235 + level * 38 + (index % 3) * 14),
      vy: Math.sin(index * 1.7) * (9 + level * 2),
      life: 4.25,
      age: 0,
      level,
      spin: index % 2 ? -1 : 1,
      applied: false,
    });
    boss.throwAnim = Math.max(boss.throwAnim, 0.22);
    boss.breathShots += 1;
    burst(direction > 0 ? boss.x + boss.w - 20 : boss.x + 20, boss.y + 92, level === 3 ? "#ff8f5e" : "#d7bb65", 5 + level, 75);
  }

  function spawnRockMarble(x, y, vx, vy, options = {}) {
    rockMarbles.push({
      x, y, w: 11, h: 11, vx, vy,
      gravity: options.gravity ?? 180,
      damage: options.damage ?? (8 + boss.phase * 2),
      life: options.life ?? 5,
      rotation: Math.random() * Math.PI * 2,
      special: Boolean(options.special),
    });
  }

  function throwRockMarbleVolley(index) {
    const tuning = rockTuning();
    const direction = hero.x < boss.x ? -1 : 1;
    const vertical = [-285, -185, -85, 10, 105][index % 5];
    const speed = (430 + boss.phase * 48 + (index % 3) * 42) * direction;
    [-72, 0, 72].forEach((spread, spreadIndex) => {
      spawnRockMarble(boss.x + boss.w / 2 + direction * 32, boss.y + 62 + spreadIndex * 13, speed + direction * spreadIndex * 28, vertical + spread, {
        gravity: vertical > 0 ? 35 : 220,
        damage: 7 + boss.phase * 2,
        special: index % 4 === 3 || spreadIndex === 1,
      });
    });
    if (index % (boss.phase === 3 ? 3 : 5) === 2) {
      const rainX = clamp(hero.x + (index % 2 ? 80 : -80), ARENA_START + 40, WORLD_END - 50);
      spawnRockMarble(rainX, 70, direction * 20, 80, { gravity: 260, damage: 7 + boss.phase * 2, special: true });
    }
    boss.throwAnim = Math.max(boss.throwAnim, tuning.retaliationInterval + 0.12);
    boss.retaliationShots += 1;
  }

  function rockTakeStomp() {
    if (boss.state !== "frenzy" || boss.health <= 0) return;
    const previousPhase = boss.phase;
    boss.health = clamp(boss.health - ROCK_STOMP_DAMAGE, 0, boss.maxHealth);
    boss.lastStompHealth = boss.health;
    boss.stompCount = (boss.stompCount || 0) + 1;
    boss.phase = bossPhaseForHealth();
    boss.hitCount += 1;
    boss.flash = 0.34;
    hero.y = boss.y - hero.h + 5;
    hero.vy = -520;
    hero.squash = 0.24;
    screenShake = Math.max(screenShake, 13);
    triggerImpact(0.16, 0.065, "#fff0a4");
    burst(boss.x + boss.w / 2, boss.y + 18, "#fff0a4", 18, 235);
    damageNumbers.push({ x: boss.x + boss.w / 2, y: boss.y + 18, text: `-${ROCK_STOMP_DAMAGE}`, life: 0.75 });
    sfx("bossHit");
    updateHud();
    if (boss.health <= 0) {
      cans = [];
      rockMarbles = [];
      alcoholBreaths = [];
      drunkPersistent = false;
      drunkLevel = 0;
      drunkTimer = 0;
      rockState("defeated");
      notify("ROCK PERDEU OS DENTES DE VISTA E SAIU CORRENDO!", 2600);
      return;
    }
    if (boss.phase > previousPhase) {
      boss.phaseFlash = 1.2;
      playBossPhaseStinger(boss.phase);
      notify(boss.phase === 2 ? "ROCK FICOU MAIS RÁPIDO — NÍVEL 2!" : "ÚLTIMA RODADA — CORRIDA MÁXIMA!", 2400);
    }
    rockState("dizzy");
  }

  function spawnCan(x, y, vx, vy, options = {}) {
    cans.push({
      x, y,
      w: options.bottle ? 14 : 18,
      h: options.bottle ? 30 : 16,
      vx, vy,
      gravity: options.gravity ?? 300,
      life: options.life ?? 6.5,
      rotation: 0,
      spin: options.spin ?? (Math.random() > 0.5 ? 1 : -1),
      damage: options.damage ?? rockTuning().damage,
      bottle: Boolean(options.bottle),
      special: Boolean(options.special),
      sequence: options.sequence ?? 0,
    });
  }

  function throwRockPattern() {
    const tuning = rockTuning();
    const direction = hero.x < boss.x ? -1 : 1;
    const pattern = boss.attackIndex % (boss.phase === 1 ? 2 : boss.phase === 2 ? 3 : 4);
    boss.attackIndex += 1;
    boss.throwAnim = 0.42;
    if (pattern === 0) {
      spawnCan(boss.x + 45, boss.y + 72, direction * 390 * tuning.speed, -270, { damage: tuning.damage });
    } else if (pattern === 1) {
      [-275, -95].forEach((vy, index) => spawnCan(boss.x + 45, boss.y + 65 + index * 28, direction * (410 + index * 90) * tuning.speed, vy, { damage: tuning.damage, sequence: index }));
      notify("DUPLA DE LATINHAS!", 1100);
    } else if (pattern === 2) {
      [hero.x - 95, hero.x + 30, hero.x + 155].forEach((x, index) => spawnCan(clamp(x, ARENA_START + 55, WORLD_END - 70), 55 - index * 25, index % 2 ? 20 : -20, 50, { damage: tuning.damage, bottle: index === 1, special: true, sequence: index + 4 }));
      notify("CHUVA DO BALCÃO — OLHE PARA CIMA!", 1450);
    } else {
      spawnCan(boss.x + 40, boss.y + 95, direction * 690 * tuning.speed, 0, { gravity: 0, damage: tuning.damage, bottle: true, special: true, life: 4.5, sequence: 8 });
      notify("GARRAFA RASTEIRA!", 1100);
    }
  }

  function updateRockBoss(dt) {
    boss.timer += dt;
    boss.flash = Math.max(0, boss.flash - dt);
    boss.throwAnim = Math.max(0, boss.throwAnim - dt);
    boss.phaseFlash = Math.max(0, boss.phaseFlash - dt);
    boss.turnFlash = Math.max(0, boss.turnFlash - dt);
    boss.biteCooldown = Math.max(0, boss.biteCooldown - dt);
    const tuning = rockTuning();
    hero.x = clamp(hero.x, ARENA_START + 35, WORLD_END - 55 - hero.w);
    const rockBody = bossHitbox();
    if (boss.state === "frenzy" && overlap(hero, rockBody)) {
      const heroBottomBefore = hero.y + hero.h - hero.vy * dt;
      const landedOnHead = hero.vy > 85 && heroBottomBefore <= rockBody.y + 58 && hero.y + hero.h <= rockBody.y + 88;
      if (landedOnHead) {
        rockTakeStomp();
      } else if (boss.biteCooldown <= 0) {
        boss.biteCooldown = 0.86;
        damageHero(16 + boss.phase * 4, boss.x);
        notify(`NHAC! ROCK MORDEU SHALL — -${16 + boss.phase * 4} DE ENERGIA!`, 1500);
        navigator.vibrate?.([38, 35, 55]);
      }
    } else if (!["rise", "dizzy", "retaliate", "defeated", "flee"].includes(boss.state) && overlap(hero, rockBody)) {
      damageHero(12 + boss.phase * 2, boss.x);
    }
    if (boss.state === "rise") {
      const progress = clamp(boss.timer / 2, 0, 1);
      boss.y = 520 - 198 * (1 - Math.pow(1 - progress, 3));
      if (boss.timer >= 2) rockState("throw");
      return;
    }
    if (boss.state === "throw") {
      boss.x = BOSS_HOME + Math.sin(boss.timer * 1.6) * 38;
      boss.throwTimer -= dt;
      if (boss.throwTimer <= 0) { boss.throwTimer = tuning.throwCooldown; throwRockPattern(); }
      if (boss.timer >= tuning.throwDuration) rockState("drink");
      return;
    }
    if (boss.state === "drink") {
      boss.throwAnim = 0.4;
      if (boss.timer >= 1.15) rockState("breath");
      return;
    }
    if (boss.state === "breath") {
      boss.x = BOSS_HOME + Math.sin(boss.timer * 1.15) * 22;
      boss.throwTimer -= dt;
      if (boss.throwTimer <= 0) {
        boss.throwTimer = tuning.breathInterval;
        spawnAlcoholBreath(boss.breathShots);
      }
      if (boss.timer >= tuning.breathDuration) rockState("frenzy");
      return;
    }
    if (boss.state === "frenzy") {
      boss.x += boss.dir * tuning.runSpeed * dt;
      boss.shotIndex = Math.floor(boss.timer * (9 + boss.phase * 2));
      const leftLimit = ARENA_START + 24;
      const rightLimit = WORLD_END - boss.w - 24;
      if (boss.x <= leftLimit || boss.x >= rightLimit) {
        boss.x = clamp(boss.x, leftLimit, rightLimit);
        boss.dir *= -1;
        boss.turnFlash = 0.28;
        screenShake = Math.max(screenShake, 6);
        burst(boss.x + boss.w / 2, 492, "#d2b080", 9, 150);
      }
      screenShake = Math.max(screenShake, 2.5 + boss.phase * 0.7);
      if (boss.timer >= tuning.frenzyDuration) rockState("throw");
      return;
    }
    if (boss.state === "dizzy") {
      boss.x += Math.sin(boss.timer * 13) * 0.9;
      if (boss.timer >= tuning.stunnedDuration) rockState("throw");
      return;
    }
    if (boss.state === "retaliate") {
      boss.x = BOSS_HOME + Math.sin(boss.timer * 1.3) * 28;
      boss.throwTimer -= dt;
      if (boss.throwTimer <= 0) {
        boss.throwTimer = tuning.retaliationInterval;
        throwRockMarbleVolley(boss.retaliationShots);
      }
      if (boss.timer >= tuning.retaliationDuration) rockState("drink");
      return;
    }
    if (boss.state === "defeated") { if (boss.timer >= 1.15) rockState("flee"); return; }
    if (boss.state === "flee") {
      boss.x += 410 * dt;
      boss.y -= 30 * dt;
      if (boss.x > WORLD_END + 90) showEnding();
    }
  }

  function zicoTuning() {
    return [
      null,
      { speed: 555, tailDamage: 18, stunDuration: 2.75, turns: 3 },
      { beeInterval: 0.62, flightSpeed: 1, damage: 14, cycle: 7.2 },
      { beeInterval: 0.48, toolInterval: 0.78, teiuInterval: 3.25, damage: 17, cycle: 6.2 },
    ][boss.phase];
  }

  function zicoState(next) {
    boss.state = next;
    boss.timer = 0;
    boss.throwTimer = 0;
    boss.throwAnim = 0;
    boss.vulnerable = next === "teiu_stunned" || ["mount_swarm", "mount_dive", "final_tools", "final_surge"].includes(next);
    if (next === "teiu_charge") {
      boss.dir = hero.x < boss.x ? -1 : 1;
      boss.cycleCount = 0;
      notify("O TEIÚ DISPAROU — PULE POR CIMA!", 1600);
    }
    if (next === "teiu_tail") {
      boss.dir = hero.x < boss.x ? -1 : 1;
      notify("RABADA! AFASTE-SE DO ALCANCE!", 1500);
      screenShake = Math.max(screenShake, 7);
    }
    if (next === "teiu_stunned") {
      notify("TEIÚ TONTO — ACERTE COM AS GUDES!", 2500);
      screenShake = Math.max(screenShake, 5);
    }
    if (next === "mount_intro") {
      boss.phase = 2;
      boss.name = "ZICO O ZANGÃO";
      boss.health = Math.max(ZICO_ACT_HEALTH * 2, boss.health);
      boss.x = BOSS_HOME;
      boss.y = 470;
      zicoHazards = [];
      if (!biluiaBossGiftSpawned) {
        biluiaBossGiftSpawned = true;
        biluiaPickup = { x: ARENA_START + 510, y: 392, w: 38, h: 30, landed: true, eaten: false, bossGift: true, frame: 0 };
      }
      updateHud();
      playBossPhaseStinger(2);
      notify("ATO 2 — ZICO SUBIU NA ABELHA! USE O BILUIA PARA LUTAR NO AR!", 3300);
    }
    if (next === "mount_swarm") {
      boss.throwTimer = 0.35;
      notify("ENXAME NO AR — ABRA ESPAÇO E ATIRE!", 1800);
    }
    if (next === "mount_dive") {
      boss.dir = hero.x < boss.x ? -1 : 1;
      notify("MERGULHO DO ZANGÃO!", 1200);
    }
    if (next === "final_intro") {
      boss.phase = 3;
      boss.name = "ZICO O ZANGÃO";
      boss.health = Math.max(ZICO_ACT_HEALTH, boss.health);
      boss.x = BOSS_HOME;
      boss.y = 500;
      zicoHazards = [];
      biluiaPickup = { x: ARENA_START + 610, y: 395, w: 38, h: 30, landed: true, eaten: false, bossGift: true, frame: 1 };
      biluiaBossUsed = false;
      updateHud();
      playBossPhaseStinger(3);
      notify("ATO FINAL — USE BILUIA, MAS ESPERE O TEIÚ SAIR DO MAPA!", 3400);
    }
    if (next === "final_tools") {
      boss.throwTimer = 0.38;
      boss.companionTimer = 1.2;
    }
    if (next === "final_surge") {
      boss.throwTimer = 0.2;
      boss.companionTimer = 0.55;
      notify("ZICO APELOU — TUDO AO MESMO TEMPO!", 2200);
      screenShake = Math.max(screenShake, 9);
    }
    if (next === "defeated") {
      boss.vulnerable = false;
      zicoHazards = [];
      notify("ZICO PERDEU O CONTROLE DO ENXAME!", 2400);
    }
  }

  function spawnZicoBee(fromMount = false, index = 0) {
    const originX = fromMount ? boss.x + boss.w / 2 : (index % 2 ? ARENA_START + 30 : WORLD_END - 60);
    const originY = fromMount ? boss.y + 82 : 120 + (index % 4) * 62;
    const dx = hero.x + hero.w / 2 - originX;
    const dy = hero.y + 22 - originY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const speed = 250 + boss.phase * 38 + (index % 3) * 18;
    zicoHazards.push({
      kind: "bee", x: originX, y: originY, w: 38, h: 30,
      vx: dx / length * speed, vy: dy / length * speed,
      life: 5.4, age: 0, damage: 10 + boss.phase * 2, phase: index * 0.8,
    });
  }

  function spawnZicoTool(index = 0) {
    const direction = hero.x < boss.x ? -1 : 1;
    const kinds = ["hammer", "saw", "chisel"];
    const kind = kinds[index % kinds.length];
    zicoHazards.push({
      kind, x: boss.x + boss.w / 2 + direction * 20, y: boss.y + 72,
      w: kind === "saw" ? 38 : 28, h: kind === "saw" ? 22 : 30,
      vx: direction * (355 + boss.phase * 38 + (index % 3) * 34),
      vy: kind === "chisel" ? -80 : -245 + (index % 3) * 65,
      gravity: kind === "chisel" ? 55 : 310,
      life: 5.2, age: 0, damage: 14 + boss.phase, rotation: 0, spin: index % 2 ? -1 : 1,
    });
    boss.throwAnim = 0.35;
  }

  function spawnTeiuCompanion() {
    const fromLeft = Math.random() > 0.5;
    zicoHazards.push({
      kind: "teiu", x: fromLeft ? ARENA_START - 130 : WORLD_END + 30, y: 424,
      w: 132, h: 76, vx: fromLeft ? 485 : -485, vy: 0,
      life: 4.6, age: 0, damage: 20, phase: Math.random() * 4,
    });
    if (boss.phase === 3 && !biluiaPickup?.eaten) {
      biluiaPickup = { x: clamp(hero.x + 95, ARENA_START + 240, WORLD_END - 220), y: 395, w: 38, h: 30, landed: true, eaten: false, bossGift: true, frame: 0 };
    }
    notify("O TEIÚ VOLTOU CORRENDO!", 1100);
  }

  function updateZicoBoss(dt) {
    boss.timer += dt;
    boss.flash = Math.max(0, boss.flash - dt);
    boss.throwAnim = Math.max(0, boss.throwAnim - dt);
    boss.phaseFlash = Math.max(0, boss.phaseFlash - dt);
    hero.x = clamp(hero.x, ARENA_START + 35, WORLD_END - 55 - hero.w);
    const tuning = zicoTuning();
    const body = bossHitbox();

    if (!["rise", "mount_intro", "final_intro", "teiu_stunned", "defeated", "flee"].includes(boss.state) && overlap(hero, body)) {
      damageHero(boss.phase === 1 ? tuning.tailDamage : 13 + boss.phase * 2, boss.x);
    }

    if (boss.state === "rise") {
      const progress = clamp(boss.timer / 1.65, 0, 1);
      boss.y = 520 - 96 * (1 - Math.pow(1 - progress, 3));
      if (boss.timer >= 1.65) zicoState("teiu_charge");
      return;
    }
    if (boss.state === "teiu_charge") {
      boss.x += boss.dir * tuning.speed * dt;
      const left = ARENA_START + 20;
      const right = WORLD_END - boss.w - 20;
      if (boss.x <= left || boss.x >= right) {
        boss.x = clamp(boss.x, left, right);
        boss.dir *= -1;
        boss.cycleCount += 1;
        screenShake = Math.max(screenShake, 6);
        burst(boss.x + boss.w / 2, 492, "#a97b4e", 10, 155);
      }
      if (boss.cycleCount >= tuning.turns || boss.timer >= 5.8) zicoState("teiu_tail");
      return;
    }
    if (boss.state === "teiu_tail") {
      const tailBox = { x: boss.x - 52, y: boss.y + 82, w: boss.w + 104, h: 72 };
      if (boss.timer > 0.32 && boss.timer < 0.82 && overlap(hero, tailBox)) damageHero(tuning.tailDamage, boss.x);
      if (boss.timer >= 1.18) zicoState("teiu_stunned");
      return;
    }
    if (boss.state === "teiu_stunned") {
      boss.x += Math.sin(boss.timer * 18) * 0.65;
      if (boss.timer >= tuning.stunDuration) zicoState("teiu_charge");
      return;
    }
    if (boss.state === "mount_intro") {
      const progress = clamp(boss.timer / 1.65, 0, 1);
      boss.y = 470 - 310 * (1 - Math.pow(1 - progress, 3));
      if (boss.timer >= 1.65) zicoState("mount_swarm");
      return;
    }
    if (boss.state === "mount_swarm") {
      boss.x = BOSS_HOME + Math.sin(boss.timer * 1.25) * 315;
      boss.y = 135 + Math.sin(boss.timer * 2.2) * 38;
      boss.throwTimer -= dt;
      if (boss.throwTimer <= 0) {
        boss.throwTimer = tuning.beeInterval;
        spawnZicoBee(true, boss.shotIndex++);
      }
      if (boss.timer >= tuning.cycle) zicoState("mount_dive");
      return;
    }
    if (boss.state === "mount_dive") {
      boss.x += boss.dir * 485 * dt;
      boss.y = 155 + Math.sin(boss.timer * 3.4) * 145;
      if (boss.x < ARENA_START + 30 || boss.x > WORLD_END - boss.w - 30) boss.dir *= -1;
      if (boss.timer >= 3.2) zicoState("mount_swarm");
      return;
    }
    if (boss.state === "final_intro") {
      const progress = clamp(boss.timer / 1.6, 0, 1);
      boss.y = 500 - 178 * (1 - Math.pow(1 - progress, 3));
      if (boss.timer >= 1.6) zicoState("final_tools");
      return;
    }
    if (boss.state === "final_tools" || boss.state === "final_surge") {
      const surge = boss.state === "final_surge";
      boss.x = BOSS_HOME + Math.sin(boss.timer * (surge ? 2.1 : 1.2)) * (surge ? 190 : 96);
      boss.throwTimer -= dt;
      boss.companionTimer -= dt;
      if (boss.throwTimer <= 0) {
        boss.throwTimer = surge ? 0.48 : tuning.toolInterval;
        spawnZicoTool(boss.shotIndex);
        if (boss.shotIndex % (surge ? 2 : 3) === 1) spawnZicoBee(false, boss.shotIndex);
        boss.shotIndex += 1;
      }
      if (boss.companionTimer <= 0) {
        boss.companionTimer = surge ? 2.15 : tuning.teiuInterval;
        spawnTeiuCompanion();
      }
      if (!surge && boss.timer >= tuning.cycle) zicoState("final_surge");
      else if (surge && boss.timer >= 4.2) zicoState("final_tools");
      return;
    }
    if (boss.state === "defeated") {
      boss.y += Math.sin(boss.timer * 18) * 1.5;
      if (boss.timer >= 1.25) zicoState("flee");
      return;
    }
    if (boss.state === "flee") {
      boss.x += 430 * dt;
      boss.y -= 42 * dt;
      if (boss.x > WORLD_END + 100) showEnding();
    }
  }

  function spawnCarrot(x, y, vx, vy, options = {}) {
    carrots.push({
      x,
      y,
      w: options.big ? 34 : 27,
      h: options.big ? 16 : 13,
      vx,
      vy,
      gravity: options.gravity ?? 310,
      life: options.life ?? 6.8,
      rotation: 0,
      age: 0,
      spin: Math.random() > 0.5 ? 1 : -1,
      damage: options.damage ?? 12,
      special: Boolean(options.special),
      sequence: options.sequence ?? 0,
      kind: options.kind || "aimed",
    });
  }

  function throwCarrot(vx, vy, options = {}) {
    spawnCarrot(
      boss.x + boss.w * 0.28,
      boss.y + 76 + (options.yOffset || 0),
      vx,
      vy,
      { ...options, damage: options.damage ?? bossTuning().carrotDamage },
    );
    boss.throwAnim = 0.38;
    burst(boss.x + boss.w * 0.3, boss.y + 82, "#f5a244", 5, 92);
  }

  function throwBossPattern() {
    const tuning = bossTuning();
    const direction = hero.x < boss.x ? -1 : 1;
    const distance = Math.abs(hero.x - boss.x);
    const aimedSpeed = direction * clamp(distance * (0.78 + boss.phase * 0.08), 260, 465) * tuning.speed;
    const pattern = boss.attackIndex % (boss.phase === 1 ? 2 : boss.phase === 2 ? 4 : 5);
    boss.attackIndex += 1;

    if (pattern === 0) {
      throwCarrot(aimedSpeed, -285 - boss.phase * 18, {
        gravity: 330 + boss.phase * 20,
        damage: tuning.carrotDamage,
        big: boss.phase === 3,
        kind: "aimed",
      });
      return;
    }

    if (pattern === 1) {
      const fanAngles = boss.phase === 1 ? [-225, 35] : [-235, -70, 65];
      fanAngles.forEach((vy, index) => {
        throwCarrot(direction * (390 + index * 64) * tuning.speed, vy, {
          gravity: index === 2 ? 30 : 230,
          yOffset: -28 + index * 28,
          damage: tuning.carrotDamage,
          special: boss.phase >= 2,
          sequence: index,
          kind: "fan",
        });
      });
      notify("LEQUE DE CENOURAS — MUDE DE ALTURA!", 1400);
      return;
    }

    if (pattern === 2) {
      const count = boss.phase === 3 ? 4 : 3;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * (boss.phase === 3 ? 118 : 150);
        const dropX = clamp(hero.x + offset, ARENA_START + 55, WORLD_END - 70);
        spawnCarrot(dropX, 72 - (i % 2) * 55, (i % 2 ? 22 : -18) * tuning.speed, 45, {
          gravity: 300 + boss.phase * 35,
          life: 5.5,
          damage: tuning.carrotDamage,
          special: true,
          big: i === Math.floor(count / 2),
          sequence: 8 + i,
          kind: "rain",
        });
      }
      boss.throwAnim = 0.42;
      notify("CHUVA DE CENOURAS — OLHE PARA CIMA!", 1650);
      return;
    }

    if (pattern === 3) {
      throwCarrot(direction * 690 * tuning.speed, 0, {
        gravity: 0,
        yOffset: 88,
        life: 4.8,
        damage: tuning.carrotDamage,
        special: true,
        big: true,
        sequence: 12,
        kind: "sweep",
      });
      if (boss.phase === 3) {
        throwCarrot(direction * 625 * tuning.speed, 0, {
          gravity: 0,
          yOffset: -76,
          life: 4.8,
          damage: tuning.carrotDamage,
          special: true,
          sequence: 13,
          kind: "sweep",
        });
      }
      notify("RAJADA RASTEIRA!", 1200);
      return;
    }

    throwCarrot(direction * 760 * tuning.speed, -115, {
      gravity: 80,
      yOffset: -38,
      life: 5.2,
      damage: tuning.carrotDamage,
      special: true,
      big: true,
      sequence: 14,
      kind: "dash",
    });
    screenShake = Math.max(screenShake, 6);
    notify("CENOURA-TORPEDO!", 1150);
  }

  function throwSpinSequence(index) {
    const tuning = bossTuning();
    const direction = hero.x < boss.x ? -1 : 1;
    const sequence = [
      { speed: 500, vy: -265, gravity: 240, yOffset: -30, big: true },
      { speed: 570, vy: -115, gravity: 95, yOffset: -12 },
      { speed: 630, vy: 5, gravity: 18, yOffset: 5 },
      { speed: 590, vy: 115, gravity: 0, yOffset: -65 },
      { speed: 535, vy: -330, gravity: 310, yOffset: 15, big: true },
      { speed: 660, vy: 55, gravity: 0, yOffset: -32 },
    ];
    const shot = sequence[index % sequence.length];
    throwCarrot(direction * shot.speed * tuning.speed, shot.vy, {
      gravity: shot.gravity,
      yOffset: shot.yOffset,
      life: 7.5,
      damage: tuning.carrotDamage,
      special: true,
      big: shot.big,
      sequence: index % sequence.length,
    });

    if (boss.phase >= 2 && index % 10 === 7) {
      throwCarrot(direction * 610 * tuning.speed, -35, {
        gravity: 38,
        yOffset: 48,
        life: 7.5,
        damage: tuning.carrotDamage,
        special: true,
        sequence: 6,
      });
    }
    if (boss.phase === 3 && index % 9 === 5) {
      throwCarrot(direction * 690 * tuning.speed, 35, {
        gravity: 0,
        yOffset: -92,
        life: 7.5,
        damage: tuning.carrotDamage,
        special: true,
        sequence: 7,
      });
    }
  }

  function updateBoss(dt) {
    if (!boss.active) {
      if (hero.x > ARENA_START + 120 && hero.x < BONUS_START) activateBoss();
      return;
    }

    if (boss.kind === "rock") {
      updateRockBoss(dt);
      return;
    }
    if (boss.kind === "zico") {
      updateZicoBoss(dt);
      return;
    }

    boss.timer += dt;
    boss.flash = Math.max(0, boss.flash - dt);
    boss.throwAnim = Math.max(0, boss.throwAnim - dt);
    boss.phaseFlash = Math.max(0, boss.phaseFlash - dt);
    const tuning = bossTuning();
    if (!["defeated", "flee"].includes(boss.state)) hero.x = clamp(hero.x, ARENA_START + 35, WORLD_END - 55 - hero.w);
    if (!["rise", "defeated", "flee"].includes(boss.state) && overlap(hero, boss)) {
      damageHero(18 + boss.phase * 2, boss.x);
    }

    if (boss.state === "rise") {
      const progress = clamp(boss.timer / 2.2, 0, 1);
      boss.y = 520 - 198 * (1 - Math.pow(1 - progress, 3));
      if (boss.timer >= 2.2) bossState("throw");
      return;
    }

    if (boss.state === "throw") {
      boss.x = BOSS_HOME + Math.sin(boss.timer * (1.1 + boss.phase * 0.18)) * (68 + boss.phase * 16);
      boss.throwTimer -= dt;
      if (boss.throwTimer <= 0) {
        boss.throwTimer = tuning.throwCooldown;
        throwBossPattern();
      }
      if (boss.timer >= tuning.throwDuration) bossState("spin");
      return;
    }

    if (boss.state === "spin") {
      boss.x = BOSS_HOME + Math.sin(boss.timer * (2.65 + boss.phase * 0.34)) * tuning.spinAmplitude;
      boss.throwTimer -= dt;
      if (boss.throwTimer <= 0) {
        boss.throwTimer = tuning.spinInterval;
        throwSpinSequence(boss.shotIndex);
        boss.shotIndex += 1;
      }
      screenShake = Math.max(screenShake, 2.5 + boss.phase * 0.7 + Math.sin(boss.timer * 18) * 1.5);
      if (boss.timer >= tuning.spinDuration) {
        boss.x = BOSS_HOME;
        bossState("dizzy");
      }
      return;
    }

    if (boss.state === "dizzy") {
      boss.x += Math.sin(boss.timer * 15) * 0.85;
      if (boss.timer >= tuning.dizzyDuration) bossState("throw");
      return;
    }

    if (boss.state === "defeated") {
      boss.y += Math.sin(boss.timer * 18) * 1.5;
      if (boss.timer >= 1.15) bossState("flee");
      return;
    }

    if (boss.state === "flee") {
      boss.x += 410 * dt;
      boss.y -= 36 * dt;
      if (boss.x > WORLD_END + 90) showEnding();
    }
  }

  function updateEnemies(dt) {
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      const nearHero = Math.abs(hero.x - enemy.x) < 330;
      const moveMultiplier = enemy.type === "cart" && nearHero ? 1.9 : enemy.type === "workerbee" && nearHero ? 1.35 : 1;
      enemy.x += enemy.dir * enemy.speed * moveMultiplier * dt;
      enemy.step += Math.abs(enemy.speed * moveMultiplier * dt);
      if (enemy.x <= enemy.min || enemy.x >= enemy.max) {
        enemy.dir *= -1;
        enemy.squash = 0.18;
      }
      enemy.squash = Math.max(0, enemy.squash - dt);
      const baseY = 500 - enemy.h;
      if (enemy.type === "workerbee") {
        enemy.y = 330 + Math.sin(gameTime * 4.8 + enemy.phase) * 74;
      } else if (enemy.type === "sprout") {
        enemy.y = baseY - Math.abs(Math.sin(gameTime * 3.1 + enemy.phase)) * 44;
      } else if (enemy.type === "hopper") {
        enemy.y = baseY - Math.abs(Math.sin(gameTime * 3.35 + enemy.phase)) * 38;
      } else if (enemy.type === "snack") {
        enemy.y = baseY - 8 + Math.sin(gameTime * 6.5 + enemy.phase) * 6;
      } else if (enemy.type === "burrower") {
        const rise = clamp((Math.sin(gameTime * 2.25 + enemy.phase) + 1) / 2, 0, 1);
        enemy.y = 503 - enemy.h * rise;
        enemy.active = rise > 0.38;
      } else {
        enemy.y = baseY + Math.sin(gameTime * 8 + enemy.phase) * 1.5;
      }

      if (enemy.type === "shooter" && Math.abs(hero.x - enemy.x) < 500 && !boss.active) {
        enemy.shotTimer -= dt;
        if (enemy.shotTimer <= 0) {
          const direction = hero.x < enemy.x ? -1 : 1;
          spawnCarrot(enemy.x + enemy.w / 2, enemy.y + 24, direction * 315, -95, {
            gravity: 175,
            life: 4.2,
            damage: 12,
            sequence: 20,
            kind: "enemy",
          });
          enemy.shotTimer = 1.65 + Math.random() * 0.55;
          enemy.squash = 0.2;
          burst(enemy.x + enemy.w / 2, enemy.y + 25, "#f5a244", 4, 72);
        }
      }

      if (enemy.type === "hive" && Math.abs(hero.x - enemy.x) < 520 && !boss.active) {
        enemy.shotTimer -= dt;
        if (enemy.shotTimer <= 0) {
          const dx = hero.x - enemy.x;
          const dy = hero.y + 20 - enemy.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          zicoHazards.push({ kind: "bee", x: enemy.x + 12, y: enemy.y + 18, w: 34, h: 27, vx: dx / length * 245, vy: dy / length * 245, life: 4.4, age: 0, damage: 12, phase: enemy.phase });
          enemy.shotTimer = 1.8 + Math.random() * 0.5;
          enemy.squash = 0.2;
          burst(enemy.x + enemy.w / 2, enemy.y + 24, "#f2bd37", 6, 85);
        }
      }

      if (!enemy.active) continue;

      const enemyBox = { x: enemy.x, y: enemy.y, w: enemy.w, h: enemy.h };
      if (overlap(hero, enemyBox)) {
        const heroBottomBefore = hero.y + hero.h - hero.vy * dt;
        if (hero.vy > 110 && heroBottomBefore <= enemy.y + 15) {
          enemy.alive = false;
          hero.vy = -330;
          hero.squash = 0.22;
          burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#f58a36", 10, 155);
          triggerImpact(0.075, 0.028, "#ffd56a");
          sfx("stomp");
        } else {
          damageHero(20, enemy.x);
        }
      }
    }
  }

  function updateItems() {
    for (const coin of coins) {
      if (coin.collected) continue;
      if (Math.hypot(hero.x + hero.w / 2 - coin.x, hero.y + hero.h / 2 - coin.y) < 32) {
        coin.collected = true;
        coinCount += 1;
        burst(coin.x, coin.y, "#ffd65f", 7, 82);
        impactFlash = Math.max(impactFlash, 0.025);
        updateHud();
        sfx("coin");
      }
    }
    for (const food of foods) {
      if (food.collected) continue;
      if (overlap(hero, food)) {
        food.collected = true;
        snackCount += 1;
        burst(food.x + food.w / 2, food.y + food.h / 2, "#8fe36b", 10, 98);
        updateHud();
        sfx("coin");
        notify(`X-SALADA GUARDADO • ${snackCount} NO ESTOQUE`, 1700);
      }
    }
  }

  function updateLevelSection() {
    if (hero.x >= BONUS_START - 120 || boss.active) return;
    let nextSection = 0;
    for (let i = 0; i < levelSections.length; i += 1) {
      if (hero.x >= levelSections[i].x) nextSection = i;
    }
    if (nextSection !== currentSection) {
      currentSection = nextSection;
      notify(levelSections[nextSection].label, 1800);
      tone(294 + nextSection * 22, 0.09, "square", 0.018);
    }
  }

  function updateProjectiles(dt) {
    for (const marble of marbles) {
      marble.x += marble.vx * dt;
      marble.y += marble.vy * dt;
      marble.life -= dt;
      marble.age += dt;
      marble.rotation += dt * 18 * Math.sign(marble.vx || 1);

      let hitSomething = false;
      for (const enemy of enemies) {
        if (!enemy.alive || !enemy.active) continue;
        if (overlap(marble, enemy)) {
          enemy.alive = false;
          marble.life = 0;
          hitSomething = true;
          burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#ef8a35", 9, 145);
          sfx("stomp");
          break;
        }
      }
      if (hitSomething) continue;

      for (const hazard of zicoHazards) {
        if (hazard.life <= 0 || !["bee", "hammer", "saw", "chisel"].includes(hazard.kind)) continue;
        if (overlap(marble, hazard)) {
          hazard.life = 0;
          marble.life = 0;
          hitSomething = true;
          burst(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, hazard.kind === "bee" ? "#f4c43b" : "#c8d2d3", 9, 140);
          sfx("stomp");
          break;
        }
      }
      if (hitSomething) continue;

      if (boss.active && !["hidden", "defeated", "flee"].includes(boss.state)) {
        const bossBody = bossHitbox();
        if (overlap(marble, bossBody)) {
          if (boss.kind === "rock") {
            marble.life = 0;
            burst(marble.x + 5, marble.y + 5, "#9ed3dc", 8, 125);
            if (boss.state !== "retaliate") rockState("retaliate");
          } else if (boss.kind === "zico") {
            marble.life = 0;
            if (!boss.vulnerable) {
              marble.vx *= -0.35;
              burst(marble.x + 5, marble.y + 5, "#c8d5a0", 6, 95);
              notify(boss.phase === 1 ? "ESPERE A RABADA — O TEIÚ FICARÁ TONTO" : "ZICO SAIU DA LINHA DE TIRO!", 1200);
            } else {
              if (boss.phase === 2 && biluiaState !== "active") {
                marble.life = 0;
                burst(marble.x + 5, marble.y + 5, "#f2c83e", 7, 105);
                notify("A ABELHA É RÁPIDA DEMAIS — ATIVE O BILUIA!", 1500);
                continue;
              }
              const damage = boss.phase === 1 ? 18 : boss.phase === 2 ? (marble.biluia ? 19 : 15) : (marble.biluia ? 15 : 12);
              const actFloor = boss.phase === 1 ? ZICO_ACT_HEALTH * 2 : boss.phase === 2 ? ZICO_ACT_HEALTH : 0;
              boss.health = Math.max(actFloor, boss.health - damage);
              boss.flash = 0.26;
              boss.hitCount += 1;
              screenShake = Math.max(screenShake, 7);
              triggerImpact(0.14, 0.055, "#ffe373");
              burst(marble.x + 5, marble.y + 5, "#ffe373", 13, 195);
              damageNumbers.push({ x: boss.x + boss.w / 2, y: boss.y + 24, text: `-${damage}`, life: 0.75 });
              sfx("bossHit");
              if (boss.phase === 1 && boss.health <= ZICO_ACT_HEALTH * 2) {
                zicoState("mount_intro");
              } else if (boss.phase === 2 && boss.health <= ZICO_ACT_HEALTH) {
                zicoState("final_intro");
              } else if (boss.phase === 3 && boss.health <= 0) {
                zicoState("defeated");
              } else {
                notify(`ACERTOU! ${boss.name}: ${boss.health} / ${boss.maxHealth}`, 900);
              }
              updateHud();
            }
          } else if (boss.vulnerable) {
            const damage = BOSS_MARBLE_DAMAGE;
            const previousPhase = boss.phase;
            boss.health = clamp(boss.health - damage, 0, boss.maxHealth);
            boss.phase = bossPhaseForHealth();
            boss.hitCount += 1;
            boss.flash = 0.24;
            screenShake = Math.max(screenShake, 6);
            triggerImpact(0.13, 0.052, "#fff1a6");
            marble.life = 0;
            burst(marble.x + 5, marble.y + 5, "#fff1a6", 12, 190);
            damageNumbers.push({ x: boss.x + boss.w / 2, y: boss.y + 30, text: `-${damage}`, life: 0.75 });
            sfx("bossHit");
            updateHud();
            if (boss.phase > previousPhase) {
              boss.phaseFlash = 1.2;
              screenShake = Math.max(screenShake, 12);
              playBossPhaseStinger(boss.phase);
              notify(boss.kind === "rock"
                ? (boss.phase === 2 ? "ROCK FICOU MAIS DOIDÃO — NÍVEL 2!" : "ÚLTIMA RODADA — FRENESI MÁXIMA!")
                : (boss.phase === 2 ? "JOYCE SE ENFURECEU — FASE 2!" : "ÚLTIMA FASE — FURACÃO MÁXIMO!"), 2400);
            } else if (boss.health > 0) {
              notify(`ACERTOU! ${boss.name}: ${boss.health} / ${boss.maxHealth}`, 900);
            }
            if (boss.health <= 0) {
              boss.vulnerable = false;
              carrots = [];
              cans = [];
              if (boss.kind === "rock") rockState("defeated");
              else bossState("defeated");
              notify(`${boss.name} SAIU CORRENDO!`, 2300);
            }
          } else {
            marble.vx *= -0.45;
            marble.vy = -80;
            marble.life = Math.min(marble.life, 0.3);
            burst(marble.x + 5, marble.y + 5, "#9ed3dc", 4, 75);
            notify("A CASCA ESTÁ DURA — ESPERE JOYCE FICAR ZONZA", 1300);
          }
        }
      }
    }
    marbles = marbles.filter((marble) => marble.life > 0 && marble.x > -20 && marble.x < BONUS_END + 50);

    for (const carrot of carrots) {
      carrot.vy += carrot.gravity * dt;
      carrot.x += carrot.vx * dt;
      carrot.y += carrot.vy * dt;
      carrot.rotation += dt * 10 * carrot.spin;
      carrot.life -= dt;
      carrot.age += dt;
      if (overlap(hero, carrot)) {
        damageHero(carrot.damage, carrot.x);
        carrot.life = 0;
      }
      if (carrot.y > 530) carrot.life = 0;
    }
    carrots = carrots.filter((carrot) => carrot.life > 0);

    for (const can of cans) {
      can.vy += can.gravity * dt;
      can.x += can.vx * dt;
      can.y += can.vy * dt;
      can.rotation += dt * 12 * can.spin;
      can.life -= dt;
      if (overlap(hero, can)) {
        damageHero(can.damage, can.x);
        can.life = 0;
      }
      if (can.y > 535) can.life = 0;
    }
    cans = cans.filter((can) => can.life > 0);

    for (const cloud of alcoholBreaths) {
      cloud.age += dt;
      cloud.life -= dt;
      cloud.x += cloud.vx * dt;
      cloud.y += cloud.vy * dt + Math.sin(cloud.age * 8 + cloud.x * 0.01) * 13 * dt;
      cloud.vx *= Math.pow(0.985, dt * 60);
      if (!cloud.applied && overlap(hero, cloud)) {
        applyDrunkEffect(cloud.level, "breath");
        cloud.applied = true;
        cloud.vx *= 0.82;
        burst(hero.x + hero.w / 2, hero.y + 25, cloud.level === 3 ? "#ff7a65" : "#d9c26e", 12, 125);
      }
      if (cloud.x < ARENA_START - 120 || cloud.x > WORLD_END + 120 || cloud.y < 30 || cloud.y > 540) cloud.life = 0;
    }
    alcoholBreaths = alcoholBreaths.filter((cloud) => cloud.life > 0);

    for (const hazard of zicoHazards) {
      hazard.age += dt;
      hazard.life -= dt;
      if (["hammer", "saw", "chisel"].includes(hazard.kind)) {
        hazard.vy += hazard.gravity * dt;
        hazard.rotation += dt * 12 * hazard.spin;
      } else if (hazard.kind === "bee") {
        hazard.vy += Math.sin(hazard.age * 8 + hazard.phase) * 22 * dt;
      }
      hazard.x += hazard.vx * dt;
      hazard.y += hazard.vy * dt;
      if (overlap(hero, hazard)) {
        damageHero(hazard.damage, hazard.x);
        hazard.life = 0;
        burst(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2, hazard.kind === "bee" ? "#f2c23a" : "#b9c4c5", 9, 130);
      }
      const hazardLeftBound = boss.active ? ARENA_START - 180 : -180;
      if (hazard.y > 545 || hazard.x < hazardLeftBound || hazard.x > WORLD_END + 180) hazard.life = 0;
    }
    zicoHazards = zicoHazards.filter((hazard) => hazard.life > 0);

    for (const marble of rockMarbles) {
      marble.vy += marble.gravity * dt;
      marble.x += marble.vx * dt;
      marble.y += marble.vy * dt;
      marble.rotation += dt * 19 * Math.sign(marble.vx || 1);
      marble.life -= dt;
      if (overlap(hero, marble)) {
        damageHero(marble.damage, marble.x);
        marble.life = 0;
        burst(marble.x + 5, marble.y + 5, "#a9efff", 7, 110);
      }
      if (marble.y > 535 || marble.x < ARENA_START - 40 || marble.x > WORLD_END + 40) marble.life = 0;
    }
    rockMarbles = rockMarbles.filter((marble) => marble.life > 0);
  }

  function burst(x, y, color, count = 8, speed = 120) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.PI * 2 * (i / count) + Math.random() * 0.35;
      const force = speed * (0.45 + Math.random() * 0.65);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 35,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  function triggerImpact(flash = 0.08, freeze = 0.03, color = "#fff5c4") {
    impactFlash = Math.max(impactFlash, flash);
    hitStopTimer = Math.max(hitStopTimer, freeze);
    impactColor = color;
  }

  function updateEffects(dt) {
    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 210 * dt;
      particle.life -= dt;
    }
    particles = particles.filter((particle) => particle.life > 0);
    for (const number of damageNumbers) {
      number.y -= 52 * dt;
      number.life -= dt;
    }
    damageNumbers = damageNumbers.filter((number) => number.life > 0);
    screenShake = Math.max(0, screenShake - dt * 18);
    impactFlash = Math.max(0, impactFlash - dt * 1.9);
    landingPulse = Math.max(0, landingPulse - dt * 2.8);
  }

  function updatePhysics(dt) {
    const eating = hero.eatAnim > 0;
    const previousEatAnim = hero.eatAnim;
    hero.eatAnim = Math.max(0, hero.eatAnim - dt);
    const keepRockBreath = drunkPersistent && boss.kind === "rock" && boss.active && boss.health > 0 && !["defeated", "flee"].includes(boss.state);
    if (!keepRockBreath) drunkTimer = Math.max(0, drunkTimer - dt);
    if (drunkTimer <= 0) {
      drunkLevel = 0;
      drunkPersistent = false;
    }
    drunkMessageTimer = Math.max(0, drunkMessageTimer - dt);
    if (drunkTimer > 0 && drunkMessageTimer <= 0 && mode === "play") {
      notify("CLEYDE... CADÊ VOCÊ?", 1500);
      drunkMessageTimer = 3.4;
      tone(175, 0.14, "sawtooth", 0.018);
    }
    if (eating) {
      const eatProgress = clamp(1 - hero.eatAnim / EAT_DURATION, 0, 1);
      const nextEatStage = Math.min(3, Math.floor(eatProgress * 4));
      if (nextEatStage > hero.eatStage) {
        hero.eatStage = nextEatStage;
        if (nextEatStage === 1 || nextEatStage === 2) {
          sfx("bite");
          burst(hero.x + hero.w / 2 + hero.face * 13, hero.y + 19, nextEatStage === 1 ? "#f5c267" : "#76bd54", 5, 66);
          screenShake = Math.max(screenShake, 1.8);
        }
        if (nextEatStage === 3) sfx("gulp");
      }
    }
    const healMoment = EAT_DURATION * 0.48;
    if (previousEatAnim > healMoment && hero.eatAnim <= healMoment && !hero.eatHealed) {
      hero.eatHealed = true;
      hero.health = clamp(hero.health + 25, 0, 100);
      hero.squash = 0.18;
      updateHud();
      sfx("heal");
      burst(hero.x + hero.w / 2, hero.y + 18, "#f5c267", 9, 92);
      notify("X-SALADA: +25 DE ENERGIA", 1300);
    }
    const biluiaFlying = biluiaState === "active";
    const accelerate = (hero.onGround ? 1680 : biluiaFlying ? 1460 : 1040) * (eating ? 0.28 : 1);
    const drunkSteer = drunkTimer > 0 ? Math.sin(gameTime * (3.9 + drunkLevel * 0.6)) * (58 + drunkLevel * 24) : 0;
    if (input.left) {
      hero.vx -= accelerate * dt;
      hero.face = -1;
    }
    if (input.right) {
      hero.vx += accelerate * dt;
      hero.face = 1;
    }
    if (!input.left && !input.right) hero.vx *= Math.pow(hero.onGround ? 0.00005 : 0.075, dt);
    if (drunkTimer > 0) hero.vx += drunkSteer * dt;
    const drunkSpeedPenalty = drunkTimer > 0 ? drunkLevel * 7 : 0;
    const speedLimit = eating ? 112 : (biluiaFlying ? 330 : 252) - drunkSpeedPenalty;
    hero.vx = clamp(hero.vx, -speedLimit, speedLimit);

    const jumpPressed = (input.jump && !jumpWasDown) || jumpQueued;
    jumpQueued = false;
    hero.jumpBuffer = jumpPressed ? 0.2 : Math.max(0, hero.jumpBuffer - dt);
    hero.coyote = hero.onGround ? 0.16 : Math.max(0, hero.coyote - dt);
    const door = nearestDoor();
    contextHint = door ? "APERTE PULAR PARA ENTRAR" : "";
    if (jumpPressed && door) {
      travelThroughDoor(door);
      hero.jumpBuffer = 0;
    } else if (biluiaFlying && input.jump) {
      hero.vy -= 1380 * dt;
      hero.onGround = false;
      hero.jumpBuffer = 0;
      if (Math.floor(gameTime * 12) % 5 === 0) burst(hero.x + hero.w / 2 - hero.face * 10, hero.y + 45, "#e8f3d5", 2, 38);
    } else if (hero.jumpBuffer > 0 && hero.coyote > 0) {
      hero.vy = -620;
      hero.onGround = false;
      hero.coyote = 0;
      hero.jumpBuffer = 0;
      sfx("jump");
    }
    jumpWasDown = input.jump;

    shootCooldown = Math.max(0, shootCooldown - dt);
    hero.shootAnim = Math.max(0, hero.shootAnim - dt);
    hero.squash = Math.max(0, hero.squash - dt);
    if (input.shoot) fireMarble();

    const releaseGravity = biluiaFlying ? (input.jump ? 420 : 760) : (!input.jump && hero.vy < -170 ? 2450 : 1600);
    hero.vy += releaseGravity * dt;
    if (biluiaFlying) hero.vy = clamp(hero.vy, -370, 285);
    hero.x += hero.vx * dt;
    hero.x = clamp(hero.x, 0, BONUS_END - hero.w);
    const oldBottom = hero.y + hero.h;
    hero.y += hero.vy * dt;
    hero.onGround = false;

    for (const platform of collisionPlatforms) {
      const horizontal = hero.x + hero.w > platform.x + 3 && hero.x < platform.x + platform.w - 3;
      const crossedTop = oldBottom <= platform.y + 8 && hero.y + hero.h >= platform.y;
      if (horizontal && crossedTop && hero.vy >= 0) {
        if (!hero.onGround && hero.vy > 240) {
          hero.squash = 0.16;
          landingPulse = Math.max(landingPulse, clamp((hero.vy - 220) / 520, 0.2, 0.75));
          screenShake = Math.max(screenShake, 1.8 + landingPulse * 2);
          burst(hero.x + hero.w / 2, platform.y - 2, stageNumber === 2 ? "#a66a45" : "#8d8f87", 6, 54);
          drumHit("kick", 0.007 + landingPulse * 0.006);
        }
        hero.y = platform.y - hero.h;
        hero.vy = 0;
        hero.onGround = true;
      }
    }

    if (hero.onGround && Math.abs(hero.vx) > 20) {
      hero.walkCycle += Math.abs(hero.vx) * dt / 7.2;
      const footstep = Math.floor(hero.walkCycle);
      if (footstep !== hero.lastFootstep) {
        hero.lastFootstep = footstep;
        if (footstep % 2 === 0) {
          burst(hero.x + hero.w / 2 - hero.face * 9, hero.y + hero.h - 3, "#a89683", 4, 48);
        }
      }
    } else if (hero.onGround) {
      hero.lastFootstep = -1;
    }

    if (recoverFromMapGap()) return;
    if (hero.y > H + 160) {
      hero.health = 0;
      updateHud();
      showGameOver();
    }
  }

  function update(dt) {
    if (mode !== "play") return;
    gameTime += dt;
    const previousShootLock = Number.isFinite(shootLockedTimer) ? shootLockedTimer : 0;
    shootLockedTimer = Math.max(0, previousShootLock - dt);
    const shootLockedNow = shootLockedTimer > 0;
    if (shootUnlockNoticeArmed && previousShootLock > 0.001 && !shootLockedNow) {
      shootUnlockNoticeArmed = false;
      notify("GUDES LIBERADAS! MAS EM ROCK, SÓ O PISÃO FUNCIONA.", 1800);
      updateHud();
    } else if ((previousShootLock > 0) !== shootLockedNow) {
      updateHud();
    }
    hero.invincible = Math.max(0, hero.invincible - dt);
    hero.flash = Math.max(0, hero.flash - dt);
    updatePhysics(dt);
    updateBiluia(dt);
    updateEnemies(dt);
    updateItems();
    updateLevelSection();
    updateProjectiles(dt);
    updateBoss(dt);
    updateEffects(dt);

    const dangerNearby = boss.active || enemies.some((enemy) => enemy.alive && Math.abs(enemy.x - hero.x) < 230);
    const targetZoom = boss.active ? 0.72 : biluiaState === "active" ? 0.82 : dangerNearby ? 0.9 : 1;
    zoom += (targetZoom - zoom) * Math.min(1, dt * 3.7);
    const viewWidth = W / zoom;
    const cameraLead = dangerNearby ? 0.2 : 0.29;
    const targetLook = boss.active ? 0 : hero.face * clamp(Math.abs(hero.vx) * 0.22, 0, 54);
    cameraLook += (targetLook - cameraLook) * Math.min(1, dt * 4.6);
    const targetLift = boss.active ? 0 : clamp((430 - hero.y) * 0.28, 0, 64);
    cameraLift += (targetLift - cameraLift) * Math.min(1, dt * 5.2);
    const targetCamera = boss.active
      ? (hero.x + hero.w / 2 + boss.x + boss.w / 2) / 2 - viewWidth / 2
      : hero.x - viewWidth * cameraLead + cameraLook;
    const maxCamera = (hero.x > BONUS_START - 200 ? BONUS_END : WORLD_END) - viewWidth;
    camera += (clamp(targetCamera, 0, Math.max(0, maxCamera)) - camera) * Math.min(1, dt * 5.3);
    if (location.hostname === "terminal.local") {
      canvas.dataset.qaState = JSON.stringify({
        boss: { x: Math.round(boss.x), y: Math.round(boss.y), health: boss.health, maxHealth: boss.maxHealth, kind: boss.kind, phase: boss.phase, state: boss.state, vulnerable: boss.vulnerable, dir: boss.dir, stompCount: boss.stompCount, lastStompHealth: boss.lastStompHealth },
        hero: { x: Math.round(hero.x), y: Math.round(hero.y), vx: Math.round(hero.vx), vy: Math.round(hero.vy), face: hero.face, health: hero.health, onGround: hero.onGround, walkFrame: Math.floor(hero.walkCycle) % 4 },
        marble: marbles[0] ? { x: Math.round(marbles[0].x), y: Math.round(marbles[0].y), life: Number(marbles[0].life.toFixed(2)) } : null,
        rockMarbles: rockMarbles.length,
        retaliationShots: boss.retaliationShots,
        shootLockedTimer: Number(shootLockedTimer.toFixed(2)),
        controls: { ...input, jumpQueued, jumpWasDown },
        carrots: carrots.length,
        cans: cans.length,
        carrotKinds: [...new Set(carrots.map((carrot) => carrot.kind))],
        activeEnemyTypes: [...new Set(enemies.filter((enemy) => enemy.alive && enemy.active).map((enemy) => enemy.type))],
        section: levelSections[currentSection]?.label || "",
        stageNumber,
        drunkTimer: Number(drunkTimer.toFixed(2)),
        drunkLevel,
        drunkPersistent,
        alcoholBreaths: alcoholBreaths.length,
        zicoHazards: zicoHazards.length,
        biluiaState,
        biluiaTimer: Number(biluiaTimer.toFixed(2)),
        biluiaGift: Boolean(biluiaPickup && !biluiaPickup.eaten),
        biluiaFlightCompleted,
        visitedFriends,
        coyote: Number(hero.coyote.toFixed(2)),
        cameraLift: Math.round(cameraLift),
        audio: masterGain ? {
          state: audioContext?.state || "unknown",
          master: masterGain.gain.value,
          music: musicGain.gain.value,
          sfx: sfxGain.gain.value,
          output: outputGain.gain.value,
          echo: musicEchoGain.gain.value,
          chorus: musicChorusGain.gain.value,
          reverb: musicReverbGain.gain.value,
        } : { state: audioContext?.state || "uninitialized" },
      });
    }
  }

  function pixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function imageReady(image) {
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  }

  function drawSheetFrame(image, frame, columns, rows, x, y, w, h, cropHeight = 1) {
    if (!imageReady(image)) return false;
    const frameWidth = image.naturalWidth / columns;
    const frameHeight = image.naturalHeight / rows;
    const sx = (frame % columns) * frameWidth;
    const sy = Math.floor(frame / columns) * frameHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sx, sy, frameWidth, frameHeight * cropHeight, x, y, w, h);
    return true;
  }

  function drawCarrotGlyph(x, y, scale = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(-0.18);
    pixelRect(-5 * scale, -8 * scale, 4 * scale, 10 * scale, "#67bd52");
    pixelRect(1 * scale, -10 * scale, 4 * scale, 12 * scale, "#83d060");
    pixelRect(-8 * scale, 0, 16 * scale, 22 * scale, "#ee7a30");
    pixelRect(-5 * scale, 20 * scale, 10 * scale, 8 * scale, "#d95c29");
    ctx.restore();
  }

  function drawStageOneDay(viewWidth, viewHeight, tick) {
    if (imageReady(images.stageOneStreet)) {
      const ratio = images.stageOneStreet.naturalWidth / images.stageOneStreet.naturalHeight;
      const drawHeight = viewHeight;
      const drawWidth = Math.max(viewWidth, drawHeight * ratio);
      const panRange = Math.max(0, drawWidth - viewWidth);
      const stageProgress = clamp(camera / Math.max(1, ARENA_START - viewWidth), 0, 1);
      const panX = panRange * stageProgress;
      ctx.drawImage(images.stageOneStreet, -panX, 0, drawWidth, drawHeight);
      const grade = ctx.createLinearGradient(0, 0, 0, viewHeight);
      grade.addColorStop(0, "rgba(255,238,158,.08)");
      grade.addColorStop(0.52, "rgba(255,255,255,0)");
      grade.addColorStop(1, "rgba(94,49,20,.12)");
      ctx.fillStyle = grade;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      ctx.globalAlpha = 0.1 + Math.sin(tick * 0.0022) * 0.018;
      ctx.fillStyle = "#ffe49a";
      ctx.fillRect(0, 351, viewWidth, 3);
      ctx.globalAlpha = 1;
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
    sky.addColorStop(0, "#4fb8ed");
    sky.addColorStop(0.62, "#8ed7ef");
    sky.addColorStop(1, "#eac77e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.fillStyle = "#fff0a0";
    ctx.beginPath();
    ctx.arc(64 - camera * 0.025, 66, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBarBackdrop(viewWidth, viewHeight, tick) {
    if (!imageReady(images.barStreet)) {
      const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
      sky.addColorStop(0, "#060817");
      sky.addColorStop(0.55, "#27142b");
      sky.addColorStop(1, "#5b2f24");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      return;
    }
    const ratio = images.barStreet.naturalWidth / images.barStreet.naturalHeight;
    const drawHeight = viewHeight;
    const drawWidth = Math.max(viewWidth, drawHeight * ratio);
    const panRange = Math.max(0, drawWidth - viewWidth);
    const stageProgress = clamp(camera / Math.max(1, ARENA_START - viewWidth), 0, 1);
    const panX = panRange * stageProgress;
    ctx.drawImage(images.barStreet, -panX, 0, drawWidth, drawHeight);
    const haze = ctx.createLinearGradient(0, 0, 0, viewHeight);
    haze.addColorStop(0, "rgba(5,7,20,.16)");
    haze.addColorStop(0.62, "rgba(18,8,18,.03)");
    haze.addColorStop(1, "rgba(41,19,14,.3)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.globalAlpha = 0.16 + Math.sin(tick * 0.002) * 0.03;
    ctx.fillStyle = "#ffc35a";
    ctx.fillRect(0, 330, viewWidth, 3);
    ctx.globalAlpha = 1;
  }

  function drawForestBackdrop(viewWidth, viewHeight, tick, arena = false) {
    if (imageReady(images.mataHorta)) {
      const ratio = images.mataHorta.naturalWidth / images.mataHorta.naturalHeight;
      const drawHeight = viewHeight;
      const drawWidth = Math.max(viewWidth, drawHeight * ratio);
      const panRange = Math.max(0, drawWidth - viewWidth);
      const progress = arena ? 0.64 : clamp(camera / Math.max(1, ARENA_START - viewWidth), 0, 1);
      ctx.drawImage(images.mataHorta, -panRange * progress, 0, drawWidth, drawHeight);
      const sunlight = ctx.createLinearGradient(0, 0, 0, viewHeight);
      sunlight.addColorStop(0, "rgba(255,242,154,.12)");
      sunlight.addColorStop(0.52, "rgba(91,180,110,.025)");
      sunlight.addColorStop(1, "rgba(37,70,30,.2)");
      ctx.fillStyle = sunlight;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      ctx.globalAlpha = 0.08 + Math.sin(tick * 0.0018) * 0.018;
      ctx.fillStyle = "#dfff9e";
      for (let i = 0; i < 5; i += 1) {
        const x = ((i * 137 + tick * 0.006) % (viewWidth + 100)) - 50;
        ctx.fillRect(x, 70 + (i % 3) * 66, 4, 3);
      }
      ctx.globalAlpha = 1;
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
    sky.addColorStop(0, "#76cde2");
    sky.addColorStop(0.5, "#a9dc93");
    sky.addColorStop(1, "#426f39");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  function drawZicoWatcher(viewWidth, viewHeight, tick) {
    if (boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    const progress = clamp(hero.x / (ARENA_START - 90), 0, 1);
    const frame = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
    const watcherHeight = viewHeight * (1.02 + progress * 0.1);
    const watcherWidth = watcherHeight;
    const x = viewWidth / 2 - watcherWidth / 2 + Math.sin(tick * 0.0011) * 5;
    const y = -watcherHeight * 0.12 - Math.sin(tick * 0.0017) * 3;
    const aura = ctx.createRadialGradient(viewWidth / 2, 125, 30, viewWidth / 2, 125, 245);
    aura.addColorStop(0, `rgba(246,203,55,${0.07 + progress * 0.1})`);
    aura.addColorStop(1, "rgba(246,203,55,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, -20, viewWidth, 370);
    ctx.save();
    ctx.globalAlpha = 0.93;
    const rendered = drawSheetFrame(images.bossWatchers, 6 + frame, 3, 3, x, y, watcherWidth, watcherHeight);
    if (!rendered) {
      pixelRect(viewWidth / 2 - 82, 28, 164, 210, "#28583a");
      pixelRect(viewWidth / 2 - 68, 0, 136, 96, "#a96549");
    }
    ctx.restore();
  }

  function drawForestForeground(viewWidth, tick) {
    if (boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    const sway = Math.sin(tick * 0.0017) * 9;
    ctx.save();
    ctx.strokeStyle = "#28452b";
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(-20, 76 + sway);
    ctx.quadraticCurveTo(viewWidth * 0.28, 142, viewWidth * 0.43, 210 + sway * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(viewWidth + 20, 94 - sway);
    ctx.quadraticCurveTo(viewWidth * 0.72, 142, viewWidth * 0.58, 232 - sway * 0.2);
    ctx.stroke();
    for (let i = 0; i < 13; i += 1) {
      const side = i % 2 ? 1 : -1;
      const x = side < 0 ? 10 + (i % 4) * 36 : viewWidth - 18 - (i % 4) * 34;
      const y = 92 + (i % 6) * 38 + Math.sin(tick * 0.002 + i) * 5;
      ctx.fillStyle = i % 3 ? "#367a42" : "#62a94a";
      ctx.beginPath();
      ctx.ellipse(x, y, 26, 12, side * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    pixelRect(-8, 300, 102, 74, "#68462d");
    pixelRect(4, 312, 78, 48, "#a5763c");
    pixelRect(viewWidth - 88, 316, 103, 67, "#5e402a");
    pixelRect(viewWidth - 77, 326, 80, 44, "#987039");
    for (let i = 0; i < 4; i += 1) {
      const hx = i % 2 ? 36 : viewWidth - 48;
      const hy = 236 + i * 34;
      ctx.fillStyle = "#d39d31";
      ctx.beginPath();
      ctx.ellipse(hx, hy, 22, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      pixelRect(hx - 18, hy - 2, 36, 5, "#78502c");
    }
    ctx.restore();
  }

  function drawJoyceWatcher(viewWidth, viewHeight, tick) {
    if (boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    const progress = clamp(hero.x / (ARENA_START - 90), 0, 1);
    const frame = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
    const pulse = 1 + Math.sin(tick * 0.0025) * 0.012;
    const watcherHeight = viewHeight * (1.03 + progress * 0.08) * pulse;
    const watcherWidth = watcherHeight;
    const x = viewWidth / 2 - watcherWidth / 2 + Math.sin(tick * 0.0012) * 5;
    const y = -watcherHeight * 0.12 - Math.sin(tick * 0.0017) * 4;

    const aura = ctx.createRadialGradient(viewWidth / 2, 128, 22, viewWidth / 2, 128, 238);
    aura.addColorStop(0, `rgba(255,178,72,${0.09 + progress * 0.08})`);
    aura.addColorStop(1, "rgba(255,178,72,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, -20, viewWidth, 360);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(70, 0);
    ctx.lineTo(viewWidth - 70, 0);
    ctx.lineTo(viewWidth - 48, 120);
    ctx.lineTo(viewWidth - 72, 272);
    ctx.lineTo(viewWidth - 122, 326);
    ctx.lineTo(122, 326);
    ctx.lineTo(72, 272);
    ctx.lineTo(48, 120);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.92 + progress * 0.07;
    ctx.filter = `drop-shadow(-5px 7px 0 rgba(74,40,16,.34)) saturate(${1.02 + progress * 0.28}) contrast(1.04)`;
    const rendered = drawSheetFrame(images.bossWatchers, frame, 3, 3, x, y, watcherWidth, watcherHeight);
    if (!rendered && imageReady(images.joyce)) {
      ctx.drawImage(images.joyce, 0, 0, images.joyce.naturalWidth, images.joyce.naturalHeight * 0.62, x, y, watcherWidth, watcherHeight);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.5 + progress * 0.35;
    if (frame === 2) {
      ctx.strokeStyle = "rgba(255,226,151,.8)";
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(viewWidth / 2 - 28 + i * 28, 36 - Math.sin(tick * 0.01 + i) * 5, 8 + i * 2, Math.PI, Math.PI * 1.8);
        ctx.stroke();
      }
    }
    ctx.restore();

  }

  function drawStageOneCityForeground(viewWidth, viewHeight, tick) {
    if (!imageReady(images.stageOneStreet) || boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    const ratio = images.stageOneStreet.naturalWidth / images.stageOneStreet.naturalHeight;
    const drawHeight = viewHeight;
    const drawWidth = Math.max(viewWidth, drawHeight * ratio);
    const panRange = Math.max(0, drawWidth - viewWidth);
    const stageProgress = clamp(camera / Math.max(1, ARENA_START - viewWidth), 0, 1);
    const panX = panRange * stageProgress;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(112, 0);
    ctx.lineTo(132, 205);
    ctx.lineTo(104, 345);
    ctx.lineTo(0, 390);
    ctx.closePath();
    ctx.moveTo(viewWidth, 0);
    ctx.lineTo(viewWidth - 112, 0);
    ctx.lineTo(viewWidth - 132, 205);
    ctx.lineTo(viewWidth - 104, 345);
    ctx.lineTo(viewWidth, 390);
    ctx.closePath();
    ctx.rect(0, 292, viewWidth, Math.max(0, viewHeight - 292));
    ctx.clip();
    ctx.drawImage(images.stageOneStreet, -panX, 0, drawWidth, drawHeight);
    ctx.fillStyle = "rgba(116,64,22,.035)";
    ctx.fillRect(0, 0, viewWidth, 390);
    ctx.restore();

    // Plano frontal: a arquitetura passa diante da Joyce enquanto Shall avança.
    const drift = Math.sin(camera * 0.0032) * 18;
    const awning = (x, y, width, reversed = false) => {
      pixelRect(x - 5, y + 7, width + 10, 12, "rgba(63,37,22,.42)");
      const stripes = 6;
      for (let stripe = 0; stripe < stripes; stripe += 1) {
        const stripeWidth = width / stripes;
        const warm = (stripe + (reversed ? 1 : 0)) % 2 === 0;
        pixelRect(x + stripe * stripeWidth, y, stripeWidth + 1, 27, warm ? "#e9823f" : "#43845d");
        pixelRect(x + stripe * stripeWidth, y, stripeWidth + 1, 5, warm ? "#ffc36f" : "#77bd78");
      }
      pixelRect(x - 4, y + 27, width + 8, 6, "#6d432d");
      for (let scallop = 0; scallop < stripes; scallop += 1) {
        ctx.fillStyle = (scallop + (reversed ? 1 : 0)) % 2 === 0 ? "#d96a37" : "#367250";
        ctx.beginPath();
        ctx.arc(x + (scallop + 0.5) * (width / stripes), y + 31, width / stripes * 0.5, 0, Math.PI);
        ctx.fill();
      }
    };

    ctx.save();
    ctx.strokeStyle = "#59422e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-20, 220 + drift * 0.12);
    ctx.quadraticCurveTo(viewWidth / 2, 258 - drift * 0.08, viewWidth + 20, 218 - drift * 0.1);
    ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const px = 54 + i * ((viewWidth - 108) / 4);
      const py = 230 + Math.sin(i * 1.2 + tick * 0.0015) * 9;
      ctx.fillStyle = i % 2 ? "#f09a43" : "#5a9a65";
      ctx.beginPath();
      ctx.moveTo(px - 8, py);
      ctx.lineTo(px + 8, py);
      ctx.lineTo(px, py + 17);
      ctx.closePath();
      ctx.fill();
    }

    awning(-38 + drift * 0.32, 266, 166, false);
    awning(viewWidth - 126 + drift * 0.2, 282, 166, true);
    pixelRect(103 + drift * 0.32, 292, 11, 112, "#5a3927");
    pixelRect(106 + drift * 0.32, 292, 3, 112, "#bd8150");
    pixelRect(viewWidth - 111 + drift * 0.2, 307, 11, 98, "#5a3927");
    pixelRect(viewWidth - 108 + drift * 0.2, 307, 3, 98, "#bd8150");

    const passingX = ((viewWidth + 180) - ((camera * 0.105) % (viewWidth + 180))) - 90;
    if (passingX > -70 && passingX < viewWidth + 30) {
      pixelRect(passingX, 302, 9, 106, "#4d3528");
      pixelRect(passingX - 27, 316, 63, 45, "#875735");
      pixelRect(passingX - 22, 321, 53, 35, "#ba7540");
      drawCarrotGlyph(passingX - 8, 305, 0.46, 1);
      drawCarrotGlyph(passingX + 14, 309, 0.4, 1);
    }

    for (const [crateX, crateY] of [[8 + drift * 0.25, 344], [viewWidth - 76 + drift * 0.16, 352]]) {
      pixelRect(crateX, crateY, 68, 48, "#75472e");
      pixelRect(crateX + 5, crateY + 6, 58, 35, "#aa6d3c");
      pixelRect(crateX + 5, crateY + 19, 58, 5, "#75472e");
      drawCarrotGlyph(crateX + 22, crateY - 3, 0.42, 1);
      drawCarrotGlyph(crateX + 46, crateY + 1, 0.38, 1);
    }
    ctx.restore();
  }

  function drawRockWatcher(viewWidth) {
    if (boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    const progress = clamp(hero.x / (ARENA_START - 90), 0, 1);
    const frame = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
    const watcherHeight = H * (1.03 + progress * 0.08);
    const watcherWidth = watcherHeight;
    const watcherX = viewWidth / 2 - watcherWidth / 2;
    const watcherY = -watcherHeight * 0.13;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(76, 0);
    ctx.lineTo(viewWidth - 76, 0);
    ctx.lineTo(viewWidth - 76, 112);
    ctx.lineTo(viewWidth - 58, 112);
    ctx.lineTo(viewWidth - 58, 205);
    ctx.lineTo(viewWidth - 82, 205);
    ctx.lineTo(viewWidth - 82, 272);
    ctx.lineTo(viewWidth - 116, 272);
    ctx.lineTo(viewWidth - 116, 328);
    ctx.lineTo(viewWidth - 140, 328);
    ctx.lineTo(viewWidth - 140, 352);
    ctx.lineTo(140, 352);
    ctx.lineTo(140, 328);
    ctx.lineTo(116, 328);
    ctx.lineTo(116, 272);
    ctx.lineTo(82, 272);
    ctx.lineTo(82, 205);
    ctx.lineTo(58, 205);
    ctx.lineTo(58, 112);
    ctx.lineTo(76, 112);
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.82 + progress * 0.14;
    ctx.filter = `drop-shadow(-5px 7px 0 rgba(3,8,24,.45)) saturate(${1.03 + progress * 0.4}) contrast(1.04)`;
    const rendered = drawSheetFrame(images.bossWatchers, 3 + frame, 3, 3, watcherX, watcherY, watcherWidth, watcherHeight);
    if (!rendered) drawSheetFrame(images.rockActions, 0, 4, 2, watcherX, watcherY, watcherWidth, watcherHeight);
    ctx.restore();
    if (progress > 0.34) {
      ctx.save();
      ctx.strokeStyle = progress > 0.68 ? "rgba(255,78,66,.88)" : "rgba(255,181,88,.72)";
      ctx.lineWidth = 6;
      const markCount = progress > 0.68 ? 4 : 2;
      for (let i = 0; i < markCount; i += 1) {
        ctx.beginPath();
        ctx.moveTo(viewWidth / 2 - 76 + i * 48, 54 + (i % 2) * 10);
        ctx.lineTo(viewWidth / 2 - 62 + i * 48, 28 + (i % 2) * 10);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawRockCityForeground(viewWidth, tick) {
    if (boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    const brickDark = "#100f1a";
    const brickMid = "#292033";
    const trim = "#66402f";
    const windowGlow = "#f1a84d";
    const parallax = ((camera * 0.035) % 28 + 28) % 28;

    pixelRect(-parallax, 307, 150, 73, brickDark);
    pixelRect(-parallax, 298, 166, 12, trim);
    pixelRect(18 - parallax, 265, 30, 34, brickMid);
    pixelRect(26 - parallax, 249, 14, 17, "#3b2a35");
    pixelRect(71 - parallax, 325, 32, 30, "#171629");
    pixelRect(78 - parallax, 331, 18, 14, windowGlow);

    pixelRect(viewWidth - 146 + parallax, 315, 166, 65, brickDark);
    pixelRect(viewWidth - 158 + parallax, 306, 178, 12, trim);
    pixelRect(viewWidth - 62 + parallax, 269, 34, 38, brickMid);
    pixelRect(viewWidth - 53 + parallax, 250, 16, 20, "#3b2a35");
    pixelRect(viewWidth - 112 + parallax, 332, 32, 27, "#171629");
    pixelRect(viewWidth - 105 + parallax, 338, 18, 12, windowGlow);

    pixelRect(138, 345, 204, 35, "#0c0c15");
    pixelRect(128, 338, 224, 10, trim);
    for (let x = 148; x < 336; x += 42) {
      pixelRect(x, 353, 23, 18, "#211927");
      pixelRect(x + 5, 357, 13, 8, Math.floor(x / 42) % 2 ? "#e88943" : "#56a9b3");
    }

    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(tick * 0.003) * 0.08;
    ctx.fillStyle = "#ffbf5c";
    ctx.beginPath();
    ctx.arc(132, 342, 5, 0, Math.PI * 2);
    ctx.arc(viewWidth - 128, 344, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBossWatcherOccluders(stage, viewWidth, tick) {
    if (boss.active || hero.x < 180 || hero.x >= ARENA_START - 90 || mode !== "play") return;
    ctx.save();
    const drift = Math.sin(camera * 0.0026 + tick * 0.00015) * 10;
    if (stage === 1) {
      pixelRect(-18, 286, 132, 106, "#6e442b");
      pixelRect(-8, 298, 112, 82, "#ad6d39");
      pixelRect(viewWidth - 110, 300, 126, 92, "#68432d");
      pixelRect(viewWidth - 100, 310, 106, 70, "#a96a39");
      for (let i = 0; i < 4; i += 1) drawCarrotGlyph(22 + i * 25, 280 + (i % 2) * 8, 0.42, 1);
    } else if (stage === 2) {
      pixelRect(-24, 205, 114, 188, "#111421");
      pixelRect(-8, 220, 82, 160, "#37251f");
      pixelRect(viewWidth - 86, 226, 108, 167, "#111421");
      pixelRect(viewWidth - 74, 242, 82, 138, "#3f2921");
      for (let y = 245; y < 380; y += 38) {
        pixelRect(5, y, 48, 30, "#7f4e2c");
        pixelRect(viewWidth - 57, y + 8, 47, 30, "#83512f");
      }
    } else {
      const leaf = (x, y, side) => {
        ctx.fillStyle = side < 0 ? "#286337" : "#3d7d3d";
        ctx.beginPath();
        ctx.ellipse(x, y, 55, 22, side * 0.48, 0, Math.PI * 2);
        ctx.fill();
      };
      pixelRect(-20, 230, 94, 178, "#4a3524");
      pixelRect(viewWidth - 72, 246, 96, 162, "#493322");
      for (let i = 0; i < 7; i += 1) {
        leaf(28 + (i % 2) * 23 + drift, 215 + i * 29, -1);
        leaf(viewWidth - 25 - (i % 2) * 24 - drift, 224 + i * 28, 1);
      }
      ctx.fillStyle = "#d49d31";
      ctx.beginPath();
      ctx.ellipse(54, 360, 43, 31, 0, 0, Math.PI * 2);
      ctx.ellipse(viewWidth - 54, 363, 43, 31, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCanGlyph(x, y, scale = 1, bottle = false) {
    ctx.save();
    ctx.translate(x, y);
    if (bottle) {
      pixelRect(-4 * scale, -15 * scale, 8 * scale, 9 * scale, "#795037");
      pixelRect(-7 * scale, -7 * scale, 14 * scale, 28 * scale, "#4f362c");
      pixelRect(-5 * scale, -4 * scale, 10 * scale, 19 * scale, "#81513a");
    } else {
      pixelRect(-9 * scale, -13 * scale, 18 * scale, 27 * scale, "#a9b8c7");
      pixelRect(-7 * scale, -10 * scale, 14 * scale, 21 * scale, "#557fa0");
      pixelRect(-7 * scale, -2 * scale, 14 * scale, 5 * scale, "#d8d3a0");
      pixelRect(-6 * scale, -13 * scale, 12 * scale, 3 * scale, "#e8eff1");
    }
    ctx.restore();
  }

  function drawRockArenaSky(viewWidth, viewHeight, tick) {
    if (imageReady(images.rockArena)) {
      const ratio = images.rockArena.naturalWidth / images.rockArena.naturalHeight;
      let drawWidth = viewHeight * ratio;
      let drawHeight = viewHeight;
      if (drawWidth < viewWidth) {
        drawWidth = viewWidth;
        drawHeight = drawWidth / ratio;
      }
      ctx.drawImage(images.rockArena, (viewWidth - drawWidth) / 2, viewHeight - drawHeight, drawWidth, drawHeight);
      ctx.fillStyle = "rgba(14,7,9,.18)";
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      const pulseGlow = ctx.createRadialGradient(viewWidth / 2, 150, 15, viewWidth / 2, 150, 240);
      pulseGlow.addColorStop(0, `rgba(255,184,71,${0.12 + Math.sin(tick * 0.004) * 0.03})`);
      pulseGlow.addColorStop(1, "rgba(80,24,12,0)");
      ctx.fillStyle = pulseGlow;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
    sky.addColorStop(0, "#070b1e");
    sky.addColorStop(0.5, "#16274b");
    sky.addColorStop(1, "#563144");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    const glow = ctx.createRadialGradient(viewWidth / 2, 135, 10, viewWidth / 2, 135, 215);
    glow.addColorStop(0, "rgba(116,185,255,.58)");
    glow.addColorStop(0.45, "rgba(78,75,162,.22)");
    glow.addColorStop(1, "rgba(15,20,45,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewWidth, 380);
    ctx.strokeStyle = "rgba(151,207,255,.27)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(viewWidth / 2, 140, 78 + i * 38 + Math.sin(tick * 0.002 + i) * 7, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
  }

  function drawBossArenaSky(viewWidth, viewHeight, tick) {
    if (imageReady(images.joyceArena)) {
      const ratio = images.joyceArena.naturalWidth / images.joyceArena.naturalHeight;
      let drawWidth = viewHeight * ratio;
      let drawHeight = viewHeight;
      if (drawWidth < viewWidth) {
        drawWidth = viewWidth;
        drawHeight = drawWidth / ratio;
      }
      ctx.drawImage(images.joyceArena, (viewWidth - drawWidth) / 2, viewHeight - drawHeight, drawWidth, drawHeight);
      ctx.fillStyle = "rgba(112,58,18,.045)";
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      const pulseGlow = ctx.createRadialGradient(viewWidth / 2, 155, 15, viewWidth / 2, 155, 250);
      pulseGlow.addColorStop(0, `rgba(255,213,105,${0.07 + boss.phase * 0.018 + Math.sin(tick * 0.004) * 0.018})`);
      pulseGlow.addColorStop(1, "rgba(255,147,45,0)");
      ctx.fillStyle = pulseGlow;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, viewHeight);
    sky.addColorStop(0, "#4daee9");
    sky.addColorStop(0.48, "#8cd8ef");
    sky.addColorStop(1, "#f2ca7c");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    const pulse = 64 + Math.sin(tick * 0.004) * 6;
    const glow = ctx.createRadialGradient(viewWidth / 2, 130, 10, viewWidth / 2, 130, 190);
    glow.addColorStop(0, "rgba(255,244,177,.78)");
    glow.addColorStop(0.38, "rgba(255,189,75,.2)");
    glow.addColorStop(1, "rgba(76,145,197,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, viewWidth, 360);
    ctx.fillStyle = "#f4a642";
    ctx.beginPath();
    ctx.arc(viewWidth / 2, 126, pulse, 0, Math.PI * 2);
    ctx.fill();
    drawCarrotGlyph(viewWidth / 2, 94, 2.3, 0.65);

    ctx.strokeStyle = "rgba(247,146,64,.28)";
    ctx.lineWidth = 6;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(viewWidth / 2, 145, 92 + i * 42 + Math.sin(tick * 0.002 + i) * 8, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
  }

  function drawSign(x, y, w, label, color) {
    pixelRect(x - 5, y + 4, w + 10, 38, "rgba(2,3,10,.48)");
    pixelRect(x, y, w, 36, "#080913");
    pixelRect(x + 3, y + 3, w - 6, 30, color);
    pixelRect(x + 6, y + 6, w - 12, 3, "rgba(255,240,190,.38)");
    pixelRect(x + 6, y + 28, w - 12, 3, "rgba(24,7,20,.4)");
    pixelRect(x - 8, y + 10, 8, 17, "#493229");
    pixelRect(x + w, y + 10, 8, 17, "#493229");
    ctx.fillStyle = "#fff2c5";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,.7)";
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(label, x + w / 2, y + 23);
    ctx.shadowColor = "transparent";
  }

  function drawStreetDecor() {
    const signs = [
      [1080, 260, 178, "CENOURA EXPRESS", "#a24c32"],
      [1885, 245, 168, "LANCHALL CROC", "#b64248"],
      [3105, 268, 190, "SUCO DA HORTA", "#4f7839"],
      [4545, 244, 198, "HORTI CENOURITO", "#3d7950"],
      [5450, 260, 180, "MUNDO CENOURA", "#b95a32"],
      [6380, 244, 190, "TÚNEL DO SUCO", "#8f4a2d"],
      [7780, 250, 230, "FEIRA DO MEIO-DIA", "#d06f2d"],
    ];
    signs.forEach(([x, y, w, label, color]) => drawSign(x, y, w, label, color));

    for (let x = 190; x < WORLD_END; x += 530) {
      pixelRect(x, 304, 8, 196, "#514b42");
      pixelRect(x - 17, 300, 42, 9, "#777066");
      pixelRect(x - 8, 309, 23, 18, "#cfe7e7");
      drawCarrotGlyph(x + 4, 286, 0.42, 0.8);
    }

    for (let x = 360; x < 6250; x += 410) {
      pixelRect(x, 476, 62, 8, "#59603d");
      pixelRect(x + 6, 452, 50, 25, "#6e4935");
      drawCarrotGlyph(x + 20, 438, 0.52, 0.95);
      drawCarrotGlyph(x + 42, 442, 0.44, 0.9);
    }

    for (let x = 760; x < 6200; x += 760) {
      ctx.strokeStyle = "#754c43";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 358);
      ctx.lineTo(x + 180, 337);
      ctx.stroke();
      for (let i = 0; i < 5; i += 1) drawCarrotGlyph(x + 18 + i * 38, 351 - i * 4, 0.35, 0.9);
    }

    pixelRect(1980, 407, 82, 93, "#24172a");
    pixelRect(1991, 421, 60, 79, "#613e52");
    pixelRect(2000, 431, 42, 48, "#15182d");
    pixelRect(2019, 451, 6, 6, "#f7d56f");
  }

  function drawBarStreet(tick) {
    const signs = [
      [540, 224, 180, "BAR BARRIL TORTO", "#8b4b20"],
      [1690, 214, 200, "COPO DA ESQUINA", "#853f68"],
      [3330, 218, 230, "PORTA DOS AMIGOS", "#356b77"],
      [4680, 208, 205, "BOTECO DOIS DEDOS", "#8c5a24"],
      [5850, 220, 220, "GARRAFA DANÇANTE", "#4d703c"],
      [7000, 210, 210, "ÚLTIMA RODADA", "#91394b"],
    ];
    signs.forEach(([x, y, w, label, color]) => drawSign(x, y, w, label, color));
    for (let x = 250; x < 8200; x += 520) {
      pixelRect(x, 445, 84, 55, "#5a321f");
      pixelRect(x + 5, 450, 74, 45, "#9b6336");
      pixelRect(x, 457, 84, 6, "#d5aa68");
      pixelRect(x, 480, 84, 6, "#d5aa68");
      drawCanGlyph(x + 104, 466 + Math.sin(tick * 0.004 + x) * 4, 0.82, x % 1040 === 250);
      drawCanGlyph(x + 132, 473, 0.68, false);
    }
    for (let x = 420; x < 8100; x += 760) {
      ctx.strokeStyle = "#8a533d";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 278);
      ctx.quadraticCurveTo(x + 130, 318, x + 280, 276);
      ctx.stroke();
      for (let i = 0; i < 8; i += 1) {
        ctx.fillStyle = i % 3 === 0 ? "#78d6f0" : i % 2 ? "#ffb34f" : "#f0646f";
        ctx.beginPath();
        ctx.arc(x + 18 + i * 35, 284 + Math.sin(i * 1.3) * 13, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    pixelRect(3608, 395, 82, 105, "#140e18");
    pixelRect(3619, 409, 60, 91, "#79522f");
    pixelRect(3628, 420, 42, 59, "#111126");
    pixelRect(3647, 451, 6, 6, "#f7d56f");

    const occluders = [920, 2460, 4010, 5630, 7240, 8150];
    occluders.forEach((x, index) => {
      const pillarWidth = index % 2 ? 66 : 82;
      pixelRect(x, 42, pillarWidth, 458, "#120f19");
      pixelRect(x + 8, 42, pillarWidth - 16, 458, index % 2 ? "#35202c" : "#292337");
      for (let y = 62; y < 485; y += 48) {
        pixelRect(x + 13, y, pillarWidth - 26, 7, index % 2 ? "#724134" : "#4d5264");
      }
      pixelRect(x + pillarWidth - 14, 25, 12, 475, "#874c31");
      pixelRect(x + pillarWidth - 10, 25, 4, 475, "#d38248");
      pixelRect(x + pillarWidth - 12, 88, 66, 13, "#874c31");
      pixelRect(x + pillarWidth + 44, 88, 12, 112, "#874c31");
      if (index % 2 === 0) {
        const awningX = x + pillarWidth - 24;
        pixelRect(awningX, 292, 164, 11, "#211522");
        for (let stripe = 0; stripe < 6; stripe += 1) {
          pixelRect(awningX + stripe * 28, 303, 28, 23, stripe % 2 ? "#c6914d" : "#31545f");
        }
        pixelRect(awningX, 326, 168, 7, "#d3a967");
      } else {
        pixelRect(x - 18, 116, 118, 82, "#18131d");
        pixelRect(x - 10, 124, 102, 66, "#65422d");
        drawCanGlyph(x + 40, 155 + Math.sin(tick * 0.003 + index) * 3, 1.45, true);
      }
    });
  }

  function drawRockArenaDecor(tick) {
    pixelRect(ARENA_START, 430, WORLD_END - ARENA_START, 70, "rgba(30,14,12,.78)");
    pixelRect(ARENA_START, 430, WORLD_END - ARENA_START, 10, "#d08a3d");
    for (let x = ARENA_START + 35; x < WORLD_END - 70; x += 205) {
      pixelRect(x, 382, 76, 48, "#63381f");
      pixelRect(x + 5, 387, 66, 38, "#a86a33");
      pixelRect(x, 393, 76, 6, "#d4b076");
      pixelRect(x, 414, 76, 6, "#d4b076");
      drawCanGlyph(x + 96, 403 + Math.sin(tick * 0.004 + x) * 3, 0.8, x % 410 < 100);
    }
    ctx.strokeStyle = "#9b5b30";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ARENA_START + 80, 250);
    ctx.quadraticCurveTo(ARENA_START + 610, 310, WORLD_END - 70, 245);
    ctx.stroke();
    for (let i = 0; i < 13; i += 1) {
      const x = ARENA_START + 95 + i * 82;
      const y = 258 + Math.sin(i * 1.12) * 18;
      ctx.fillStyle = i % 2 ? "#ffc35a" : "#7ed8e7";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    drawSign(ARENA_START + 340, 202, 290, "PÁTIO DA ÚLTIMA RODADA", "#8b4d22");
  }

  function drawCarrotTunnel(tick) {
    pixelRect(6250, 188, 1350, 312, "rgba(20,20,34,.74)");
    pixelRect(6250, 188, 1350, 14, "#78402f");
    for (let x = 6260; x < 7600; x += 224) {
      ctx.strokeStyle = "#493247";
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.arc(x + 105, 392, 112, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#8d4e37";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x + 105, 392, 112, Math.PI, Math.PI * 2);
      ctx.stroke();
      drawCarrotGlyph(x + 105, 252 + Math.sin(tick * 0.003 + x) * 3, 0.72, 0.75);
    }
    for (let x = 6350; x < 7550; x += 310) {
      pixelRect(x, 410, 96, 90, "#4c3440");
      pixelRect(x + 8, 421, 80, 64, "#773f32");
      pixelRect(x + 18, 434, 60, 10, "#e07833");
      pixelRect(x + 22, 454, 52, 8, "#f5b452");
      ctx.fillStyle = "rgba(246,143,54,.2)";
      ctx.beginPath();
      ctx.arc(x + 48, 405, 42 + Math.sin(tick * 0.004 + x) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDayMarket(tick) {
    pixelRect(7685, 430, ARENA_START - 7685, 70, "#76543d");
    for (let x = 7705; x < ARENA_START - 80; x += 215) {
      pixelRect(x, 365, 170, 135, "#956740");
      pixelRect(x + 8, 390, 154, 104, "#c1844d");
      for (let stripe = 0; stripe < 5; stripe += 1) {
        pixelRect(x + stripe * 34, 340, 34, 42, stripe % 2 ? "#f3c473" : "#bd4d4e");
      }
      pixelRect(x - 5, 378, 180, 10, "#f2dfae");
      for (let crate = 0; crate < 3; crate += 1) {
        pixelRect(x + 18 + crate * 46, 448, 39, 38, "#8f5939");
        drawCarrotGlyph(x + 38 + crate * 46, 430, 0.48, 1);
      }
    }
    ctx.strokeStyle = "#75513e";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(7700, 290);
    ctx.quadraticCurveTo(8035, 340, ARENA_START - 20, 286);
    ctx.stroke();
    for (let i = 0; i < 11; i += 1) {
      const x = 7720 + i * 61;
      const y = 298 + Math.sin(i * 0.78) * 20;
      ctx.fillStyle = i % 2 ? "#f7c85f" : "#f06f46";
      ctx.globalAlpha = 0.65 + Math.sin(tick * 0.006 + i) * 0.25;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawForestTrail(tick) {
    for (let x = 120; x < ARENA_START; x += 430) {
      pixelRect(x, 348, 12, 152, "#4b3624");
      pixelRect(x + 5, 348, 4, 152, "#8d6534");
      pixelRect(x - 28, 370, 68, 10, "#6d4b2c");
      pixelRect(x - 24, 374, 60, 4, "#b28244");
    }
    for (let x = 350; x < ARENA_START; x += 610) {
      pixelRect(x, 458, 140, 42, "#5a3e28");
      pixelRect(x + 6, 463, 128, 31, "#8a6033");
      for (let row = 0; row < 3; row += 1) {
        for (let plant = 0; plant < 5; plant += 1) {
          const px = x + 18 + plant * 25;
          const py = 456 - row * 7;
          ctx.fillStyle = (plant + row) % 2 ? "#4f9f49" : "#77bc4e";
          ctx.beginPath();
          ctx.ellipse(px, py, 8, 4, -0.4, 0, Math.PI * 2);
          ctx.ellipse(px + 8, py - 2, 8, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    for (let x = 820; x < ARENA_START; x += 1220) {
      pixelRect(x, 382, 66, 118, "#4e3524");
      for (let tier = 0; tier < 3; tier += 1) {
        ctx.fillStyle = tier % 2 ? "#d7a334" : "#bd8627";
        ctx.beginPath();
        ctx.ellipse(x + 33, 398 + tier * 29, 31 - tier * 3, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        pixelRect(x + 8, 396 + tier * 29, 50, 5, "#68482a");
      }
      ctx.globalAlpha = 0.45 + Math.sin(tick * 0.006 + x) * 0.16;
      ctx.fillStyle = "#ffe66b";
      ctx.beginPath();
      ctx.arc(x + 33, 390, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const signs = [
      [1110, 245, 178, "TRILHA DA MATA", "#3d7044"],
      [2760, 238, 188, "HORTA DO ZANGÃO", "#83702d"],
      [4890, 242, 190, "OFICINA DO ZICO", "#6c4d31"],
      [6920, 240, 205, "CORREDOR DAS COLMEIAS", "#8a6a25"],
    ];
    signs.forEach(([x, y, w, label, color]) => drawSign(x, y, w, label, color));
  }

  function drawZicoArenaDecor(tick) {
    pixelRect(ARENA_START, 442, WORLD_END - ARENA_START, 58, "rgba(55,72,35,.78)");
    pixelRect(ARENA_START, 442, WORLD_END - ARENA_START, 7, "#a8c861");
    pixelRect(ARENA_START, 449, WORLD_END - ARENA_START, 5, "#6b8b43");
    for (let x = ARENA_START + 20; x < WORLD_END - 20; x += 82) {
      pixelRect(x, 468, 59, 5, "rgba(105,73,39,.74)");
      pixelRect(x + 16, 485, 49, 5, "rgba(48,75,37,.68)");
    }
    [ARENA_START + 58, WORLD_END - 112].forEach((x, index) => {
      pixelRect(x, 302, 16, 140, "#4e3523");
      pixelRect(x + 5, 302, 5, 140, "#956536");
      ctx.fillStyle = "#d5a12f";
      ctx.beginPath();
      ctx.ellipse(x + 8, 320 + Math.sin(tick * 0.002 + index) * 3, 35, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      pixelRect(x - 20, 316, 56, 6, "#674628");
    });
  }

  function drawBossArenaDecor(tick) {
    pixelRect(ARENA_START, 444, WORLD_END - ARENA_START, 56, "rgba(91,60,38,.76)");
    pixelRect(ARENA_START, 444, WORLD_END - ARENA_START, 6, "#efc374");
    pixelRect(ARENA_START, 450, WORLD_END - ARENA_START, 4, "#98673f");
    for (let x = ARENA_START + 24; x < WORLD_END - 20; x += 74) {
      pixelRect(x, 467, 54, 4, "rgba(172,115,64,.62)");
      pixelRect(x + 17, 482, 48, 4, "rgba(104,69,48,.58)");
    }
    [ARENA_START + 72, WORLD_END - 86].forEach((x, index) => {
      pixelRect(x, 292, 10, 152, "#553923");
      pixelRect(x + 3, 292, 3, 152, "#a76a3c");
      pixelRect(x - 12, 280, 34, 13, "#77502e");
      pixelRect(x - 5, 273, 20, 19, index ? "#ef8c3a" : "#f5b64a");
      drawCarrotGlyph(x + 5, 254 + Math.sin(tick * 0.003 + index) * 2, 0.48, 0.72);
    });
  }

  function drawPlatforms() {
    for (const segment of ground) {
      const isBonus = segment.x >= BONUS_START;
      const isBar = stageNumber === 2 && !isBonus;
      const isForest = stageNumber === 3 && !isBonus;
      const base = isBonus ? "#4b342f" : isForest ? "#32452b" : isBar ? "#1a1116" : "#665142";
      const rim = isBonus ? "#e2aa71" : isForest ? "#a6c55e" : isBar ? "#d07a39" : "#e1bd75";
      const edge = isBonus ? "#8a5b46" : isForest ? "#6f8846" : isBar ? "#6d3e31" : "#936d48";
      pixelRect(segment.x, segment.y, segment.w, segment.h, "#070910");
      pixelRect(segment.x, segment.y + 3, segment.w, segment.h - 3, base);
      pixelRect(segment.x, segment.y, segment.w, 7, rim);
      pixelRect(segment.x, segment.y + 7, segment.w, 5, edge);
      pixelRect(segment.x, segment.y + 12, segment.w, 3, "rgba(255,255,255,.08)");
      if (segment.x < BONUS_START) {
        for (let sx = segment.x + 12; sx < segment.x + segment.w; sx += 44) {
          const offset = Math.floor((sx - segment.x) / 44) % 2 ? 9 : 0;
          pixelRect(sx, segment.y + 26, 29, 5, isForest ? "#496337" : isBar ? "#553129" : "#85674d");
          pixelRect(sx + offset, segment.y + 43, 29, 5, isForest ? "#273d2c" : isBar ? "#362227" : "#4d4039");
          pixelRect(sx + 5, segment.y + 17, 14, 2, isForest ? "rgba(195,231,111,.24)" : isBar ? "rgba(222,133,65,.22)" : "rgba(255,226,164,.25)");
        }
      }
    }
    for (const ledge of ledges) {
      const isBonus = ledge.x >= BONUS_START;
      const isBar = stageNumber === 2 && !isBonus;
      const isForest = stageNumber === 3 && !isBonus;
      pixelRect(ledge.x - 3, ledge.y + 4, ledge.w + 6, ledge.h + 5, "rgba(3,4,11,.58)");
      pixelRect(ledge.x, ledge.y, ledge.w, ledge.h, isBonus ? "#79503d" : isForest ? "#5f4a2e" : isBar ? "#6b3b26" : "#795d3e");
      pixelRect(ledge.x, ledge.y, ledge.w, 5, isBonus ? "#f0be7c" : isForest ? "#a8c75f" : isBar ? "#e7ad58" : "#f0ca7d");
      pixelRect(ledge.x + 5, ledge.y + 8, Math.max(0, ledge.w - 10), 3, isForest ? "#7a923f" : isBar ? "#9c6036" : "#aa7d4d");
      if (ledge.beerPlatform === "keg") {
        if (imageReady(images.barProps)) {
          drawSheetFrame(images.barProps, 0, 4, 2, ledge.x - 8, ledge.y - 10, ledge.w + 16, 118);
          continue;
        }
        for (let x = ledge.x + 12; x < ledge.x + ledge.w - 34; x += 52) {
          pixelRect(x, ledge.y + 18, 42, 80, "#7b482b");
          pixelRect(x - 2, ledge.y + 31, 46, 6, "#c8a46d");
          pixelRect(x - 2, ledge.y + 73, 46, 6, "#c8a46d");
        }
      } else if (ledge.beerPlatform === "awning") {
        if (imageReady(images.barProps)) {
          drawSheetFrame(images.barProps, 1, 4, 2, ledge.x - 7, ledge.y - 9, ledge.w + 14, 78);
          continue;
        }
        for (let stripe = 0; stripe < 6; stripe += 1) {
          pixelRect(ledge.x + stripe * (ledge.w / 6), ledge.y + 18, ledge.w / 6 + 1, 26, stripe % 2 ? "#f0bd63" : "#7c3150");
        }
      } else if (ledge.forestPlatform === "branch") {
        pixelRect(ledge.x + 12, ledge.y + 17, ledge.w - 24, 10, "#4d3825");
        pixelRect(ledge.x + 20, ledge.y + 26, ledge.w - 44, 5, "#2f472c");
      } else if (ledge.forestPlatform === "hive") {
        ctx.fillStyle = "#d1a033";
        ctx.beginPath();
        ctx.ellipse(ledge.x + ledge.w / 2, ledge.y + 37, Math.min(42, ledge.w * 0.32), 29, 0, 0, Math.PI * 2);
        ctx.fill();
        pixelRect(ledge.x + ledge.w / 2 - 32, ledge.y + 32, 64, 6, "#6d4a29");
      } else if (ledge.forestPlatform) {
        for (let x = ledge.x + 12; x < ledge.x + ledge.w - 10; x += 34) {
          pixelRect(x, ledge.y + 18, 26, 30, "#704b2c");
          pixelRect(x + 4, ledge.y + 21, 18, 23, "#9a6a37");
        }
      }
    }
  }

  function drawInterior() {
    pixelRect(BONUS_START, 0, BONUS_END - BONUS_START, H + 50, "#261c28");
    for (let x = BONUS_START; x < BONUS_END; x += 48) {
      for (let y = 32; y < 500; y += 48) {
        pixelRect(x, y, 44, 44, (x / 48 + y / 48) % 2 ? "#332334" : "#412b38");
      }
    }
    drawSign(BONUS_START + 180, 100, 260, stageNumber === 2 ? "MESA DOS AMIGOS" : "LANCHALL — SÓ HOJE", stageNumber === 2 ? "#355b78" : "#a94548");
    pixelRect(BONUS_START + 240, 220, 370, 24, "#6f473b");
    pixelRect(BONUS_START + 260, 244, 330, 18, "#321f27");
    for (let x = BONUS_START + 280; x < BONUS_START + 580; x += 74) {
      if (stageNumber === 2) {
        drawCanGlyph(x + 23, 205, 0.85, (x / 74) % 2 > 1);
      } else {
        pixelRect(x, 187, 46, 33, "#d89647");
        pixelRect(x + 5, 180, 36, 9, "#70a45c");
      }
    }
    if (stageNumber === 2) {
      const friends = [
        [BONUS_START + 80, "#6d4a82", "#c78c66"],
        [BONUS_START + 180, "#36756e", "#9c684c"],
        [BONUS_START + 300, "#8a4c54", "#d39a73"],
      ];
      friends.forEach(([x, shirt, skin], index) => {
        pixelRect(x - 18, 311, 36, 42, shirt);
        pixelRect(x - 13, 281, 26, 29, skin);
        pixelRect(x - 15, 278, 30, 9, index % 2 ? "#24191d" : "#3b261e");
        pixelRect(x - 10, 292, 5, 4, "#171622");
        pixelRect(x + 5, 292, 5, 4, "#171622");
        pixelRect(x - 24, 346, 18, 54, "#282b40");
        pixelRect(x + 6, 346, 18, 54, "#282b40");
        drawCanGlyph(x + (index - 1) * 7, 340, 0.55, false);
      });
      ctx.fillStyle = "#fff3c4";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Ê, SHALL! SENTA AÍ!", BONUS_START + 165, 150);
    }
    pixelRect(BONUS_END - 172, 407, 82, 93, "#181529");
    pixelRect(BONUS_END - 161, 421, 60, 79, "#6d4654");
    pixelRect(BONUS_END - 152, 431, 42, 48, "#111527");
  }

  function drawCoin(coin, tick) {
    if (coin.collected) return;
    const width = 4 + Math.abs(Math.sin(tick * 0.006 + coin.x)) * 10;
    ctx.fillStyle = "#ffb52e";
    ctx.beginPath();
    ctx.ellipse(coin.x, coin.y, width, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    pixelRect(coin.x - 2, coin.y - 9, 3, 18, "#fff0a0");
  }

  function drawFood(food) {
    if (food.collected) return;
    const x = food.x;
    const y = food.y;
    pixelRect(x, y + 7, 38, 9, "#e38a39");
    pixelRect(x + 3, y + 3, 32, 7, "#efbd63");
    pixelRect(x + 5, y + 14, 29, 6, "#6cb955");
    pixelRect(x + 4, y + 20, 31, 6, "#8d3a35");
    pixelRect(x + 2, y + 25, 35, 7, "#d79748");
  }

  function drawCarrotBase(x, y, w, h, face = true) {
    pixelRect(x + w * 0.3, y, w * 0.4, 9, "#4fa34f");
    pixelRect(x + w * 0.14, y + 3, w * 0.24, 12, "#6ec455");
    pixelRect(x + w * 0.62, y + 2, w * 0.24, 12, "#6ec455");
    pixelRect(x + 3, y + 11, w - 6, h - 13, "#e96e2c");
    pixelRect(x + 7, y + 14, w - 14, h - 22, "#f28b34");
    if (face) {
      pixelRect(x + w * 0.27, y + h * 0.42, 5, 5, "#1b1b28");
      pixelRect(x + w * 0.64, y + h * 0.42, 5, 5, "#1b1b28");
      pixelRect(x + w * 0.4, y + h * 0.65, w * 0.22, 3, "#863c32");
    }
  }

  function drawEnemy(enemy, tick) {
    if (!enemy.alive) return;
    ctx.save();
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.h / 2;
    const walk = Math.sin(enemy.step * 0.12 + enemy.phase);
    const squashY = enemy.squash > 0 ? 0.82 : 1 + Math.abs(walk) * 0.025;
    const squashX = enemy.squash > 0 ? 1.18 : 1;
    ctx.fillStyle = "rgba(2,3,9,.34)";
    ctx.beginPath();
    ctx.ellipse(cx, enemy.y + enemy.h - 1, Math.max(13, enemy.w * 0.47), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(cx, cy + (1 - squashY) * enemy.h / 2);
    ctx.scale(squashX, squashY);
    if (enemy.hitFlash > 0) ctx.globalAlpha = 0.45;

    const forestFrameStarts = { beetle: 0, sprout: 2, hive: 4, workerbee: 6 };
    if (stageNumber === 3 && Object.prototype.hasOwnProperty.call(forestFrameStarts, enemy.type) && imageReady(images.forestEnemies)) {
      const frame = forestFrameStarts[enemy.type] + ((Math.floor(tick / 160) + Math.floor(enemy.step / 20)) % 2);
      const display = {
        beetle: [86, 68], sprout: [82, 92], hive: [92, 104], workerbee: [78, 66],
      }[enemy.type];
      ctx.scale(enemy.dir < 0 ? -1 : 1, 1);
      drawSheetFrame(images.forestEnemies, frame, 4, 2, -display[0] / 2, enemy.h / 2 - display[1], display[0], display[1]);
      ctx.restore();
      return;
    }

    const barFrameStarts = { can: 0, bottle: 2, keg: 4, coaster: 6 };
    if (stageNumber === 2 && Object.prototype.hasOwnProperty.call(barFrameStarts, enemy.type) && imageReady(images.barEnemies)) {
      const frame = barFrameStarts[enemy.type] + ((Math.floor(tick / 170) + Math.floor(enemy.step / 22)) % 2);
      const display = {
        can: [70, 76], bottle: [72, 92], keg: [96, 80], coaster: [86, 62],
      }[enemy.type];
      ctx.scale(enemy.dir < 0 ? -1 : 1, 1);
      drawSheetFrame(images.barEnemies, frame, 4, 2, -display[0] / 2, enemy.h / 2 - display[1], display[0], display[1]);
      ctx.restore();
      return;
    }

    const carrotFrameStarts = { hopper: 0, roller: 2, crate: 4, snack: 6 };
    if (stageNumber === 1 && Object.prototype.hasOwnProperty.call(carrotFrameStarts, enemy.type) && imageReady(images.carrotEnemies)) {
      const frame = carrotFrameStarts[enemy.type] + ((Math.floor(tick / 170) + Math.floor(enemy.step / 22)) % 2);
      const display = {
        hopper: [76, 78], roller: [82, 82], crate: [84, 84], snack: [92, 76],
      }[enemy.type];
      ctx.scale(enemy.dir < 0 ? -1 : 1, 1);
      drawSheetFrame(images.carrotEnemies, frame, 4, 2, -display[0] / 2, enemy.h / 2 - display[1], display[0], display[1]);
      ctx.restore();
      return;
    }

    const carrotEliteStarts = { shooter: 0, burrower: 2, cart: 4 };
    if (stageNumber === 1 && Object.prototype.hasOwnProperty.call(carrotEliteStarts, enemy.type) && imageReady(images.carrotElites)) {
      const frame = carrotEliteStarts[enemy.type] + ((Math.floor(tick / 190) + Math.floor(enemy.step / 20)) % 2);
      const display = {
        shooter: [88, 102], burrower: [84, 94], cart: [126, 82],
      }[enemy.type];
      ctx.scale(enemy.dir < 0 ? -1 : 1, 1);
      drawSheetFrame(images.carrotElites, frame, 4, 2, -display[0] / 2, enemy.h / 2 - display[1], display[0], display[1]);
      ctx.restore();
      return;
    }

    if (enemy.type === "can") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x + 4, y + 2, enemy.w - 8, enemy.h - 5, "#aebdca");
      pixelRect(x + 7, y + 6, enemy.w - 14, enemy.h - 13, "#4e789a");
      pixelRect(x + 7, y + 17, enemy.w - 14, 6, "#d6d09a");
      pixelRect(x + 5, y, enemy.w - 10, 4, "#e8eff1");
      pixelRect(x + 8, y + 12, 5, 5, "#151722");
      pixelRect(x + enemy.w - 13, y + 12, 5, 5, "#151722");
      pixelRect(x + 5, y + enemy.h - 2, 7, 5 + walk * 2, "#272337");
      pixelRect(x + enemy.w - 12, y + enemy.h - 2, 7, 5 - walk * 2, "#272337");
    } else if (enemy.type === "bottle") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x + 11, y, 9, 13, "#684433");
      pixelRect(x + 6, y + 10, enemy.w - 12, enemy.h - 12, "#4f352b");
      pixelRect(x + 9, y + 14, enemy.w - 18, enemy.h - 20, "#7b5038");
      pixelRect(x + 4, y + 28, enemy.w - 8, 10, "#c3a35e");
      pixelRect(x + 8, y + 21, 5, 5, "#151722");
      pixelRect(x + enemy.w - 13, y + 21, 5, 5, "#151722");
      pixelRect(x + (walk > 0 ? 3 : 7), y + enemy.h - 2, 8, 5, "#272337");
      pixelRect(x + enemy.w - (walk > 0 ? 11 : 15), y + enemy.h - 2, 8, 5, "#272337");
    } else if (enemy.type === "keg") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      ctx.rotate((tick * 0.0035 * enemy.dir) % (Math.PI * 2));
      pixelRect(x + 3, y + 4, enemy.w - 6, enemy.h - 8, "#8b5d3f");
      pixelRect(x, y + 11, enemy.w, 5, "#aeb6c0");
      pixelRect(x, y + enemy.h - 16, enemy.w, 5, "#aeb6c0");
      pixelRect(x + 14, y + 17, 6, 6, "#171622");
      pixelRect(x + enemy.w - 20, y + 17, 6, 6, "#171622");
    } else if (enemy.type === "coaster") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x, y + 5, enemy.w, enemy.h - 7, "#a27145");
      pixelRect(x + 4, y + 8, enemy.w - 8, enemy.h - 13, "#d1a866");
      pixelRect(x + 10, y + 10, 5, 5, "#191723");
      pixelRect(x + enemy.w - 15, y + 10, 5, 5, "#191723");
      pixelRect(x + 4, y + enemy.h - 1, 9, 5 + walk * 2, "#262033");
      pixelRect(x + enemy.w - 13, y + enemy.h - 1, 9, 5 - walk * 2, "#262033");
    } else if (enemy.type === "shooter") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      drawCarrotBase(x + 3, y, enemy.w - 6, enemy.h);
      const recoil = enemy.squash > 0 ? -7 : 0;
      pixelRect(x + (enemy.dir > 0 ? 27 : -17) + recoil * enemy.dir, y + 25, 28, 10, "#9b4f30");
      pixelRect(x + (enemy.dir > 0 ? 46 : -19) + recoil * enemy.dir, y + 27, 9, 6, "#f0a242");
      pixelRect(x + 9, y + 42, 6, 7, "#351d2b");
      pixelRect(x + 28, y + 42, 6, 7, "#351d2b");
    } else if (enemy.type === "burrower") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x - 8, enemy.h / 2 - 9, enemy.w + 16, 10, "#765140");
      pixelRect(x - 2, enemy.h / 2 - 14, enemy.w + 4, 8, "#9d6b45");
      drawCarrotBase(x, y, enemy.w, enemy.h);
      pixelRect(x + 6, y + 24, 8, 5, "#7c2531");
      pixelRect(x + 24, y + 24, 8, 5, "#7c2531");
    } else if (enemy.type === "cart") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x + 4, y + 10, enemy.w - 8, 25, "#8f5538");
      pixelRect(x + 9, y + 14, enemy.w - 18, 16, "#b87342");
      drawCarrotGlyph(x + 18, y + 5, 0.48, 1);
      drawCarrotGlyph(x + 35, y + 1, 0.56, 1);
      drawCarrotGlyph(x + 51, y + 7, 0.44, 1);
      ctx.fillStyle = "#211a27";
      ctx.beginPath();
      ctx.arc(x + 16, y + 37, 8, 0, Math.PI * 2);
      ctx.arc(x + enemy.w - 16, y + 37, 8, 0, Math.PI * 2);
      ctx.fill();
      pixelRect(x + (enemy.dir > 0 ? enemy.w - 4 : -9), y + 21, 13, 6, "#e97b33");
      pixelRect(x + 18, y + 17, 6, 5, "#1c1722");
      pixelRect(x + 42, y + 17, 6, 5, "#1c1722");
    } else if (enemy.type === "roller") {
      ctx.rotate((tick * 0.004 * enemy.dir) % (Math.PI * 2));
      drawCarrotBase(-enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
      ctx.strokeStyle = "rgba(244,151,69,.48)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-enemy.dir * (24 + i * 8), -10 + i * 9);
        ctx.lineTo(-enemy.dir * (43 + i * 10), -10 + i * 9);
        ctx.stroke();
      }
    } else if (enemy.type === "crate") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x, y + 8, enemy.w, enemy.h - 11, "#8a5736");
      pixelRect(x + 4, y + 12, enemy.w - 8, enemy.h - 19, "#b87743");
      pixelRect(x + 7, y + 3, 9, 18, "#62b04d");
      pixelRect(x + 23, y, 10, 20, "#75c658");
      drawCarrotGlyph(x + 23, y + 18, 0.43, 1);
      pixelRect(x + 13, y + 34, 8, 5, "#1d1722");
      pixelRect(x + 29, y + 34, 8, 5, "#1d1722");
      pixelRect(x + (walk > 0 ? 7 : 10), y + 41, 10, 5, "#262033");
      pixelRect(x + (walk > 0 ? 29 : 26), y + 41, 10, 5, "#262033");
    } else if (enemy.type === "snack") {
      const x = -enemy.w / 2;
      const y = -enemy.h / 2;
      pixelRect(x + 3, y + 6, enemy.w - 6, 9, "#dfa654");
      pixelRect(x, y + 15, enemy.w, 6, "#72b153");
      pixelRect(x + 4, y + 21, enemy.w - 8, 8, "#f07b30");
      pixelRect(x + 2, y + 29, enemy.w - 4, 8, "#c78243");
      pixelRect(x + 12, y + 15, 5, 5, "#161522");
      pixelRect(x + 29, y + 15, 5, 5, "#161522");
      pixelRect(x + 18, y - 2, 5, 10, "#68b852");
      pixelRect(x + 7, y + 36, 7, 5 + walk * 2, "#2c2130");
      pixelRect(x + 32, y + 36, 7, 5 - walk * 2, "#2c2130");
    } else {
      drawCarrotBase(-enemy.w / 2, -enemy.h / 2, enemy.w, enemy.h);
      pixelRect(-enemy.w / 2 - 5, -1 + walk * 2, 7, 4, "#e96e2c");
      pixelRect(enemy.w / 2 - 2, -1 - walk * 2, 7, 4, "#e96e2c");
      pixelRect(-11, enemy.h / 2 - 2, 7, 5 + walk * 2, "#2d2130");
      pixelRect(5, enemy.h / 2 - 2, 7, 5 - walk * 2, "#2d2130");
    }
    ctx.restore();
  }

  function drawStall() {
    const x = BOSS_HOME - 70;
    pixelRect(x - 12, 424, 299, 76, "#17111a");
    pixelRect(x - 6, 429, 287, 71, "#5f372d");
    pixelRect(x + 6, 441, 263, 59, "#8c5333");
    for (let yy = 452; yy < 496; yy += 17) pixelRect(x + 12, yy, 251, 4, "#4f2d29");
    for (let cx = x + 18; cx < x + 255; cx += 46) {
      pixelRect(cx, 407, 37, 28, "#6e412f");
      pixelRect(cx + 4, 411, 29, 21, "#a2653a");
      drawCarrotGlyph(cx + 19, 397, 0.48, 1);
      drawCarrotGlyph(cx + 30, 402, 0.37, 0.94);
    }
    pixelRect(x - 18, 344, 311, 13, "#211722");
    pixelRect(x - 13, 351, 301, 46, "#39202d");
    for (let stripe = 0; stripe < 8; stripe += 1) {
      pixelRect(x - 13 + stripe * 38, 351, 38, 40, stripe % 2 ? "#e0b568" : "#773345");
    }
    pixelRect(x - 18, 390, 311, 9, "#f0d08b");
    pixelRect(x - 9, 357, 8, 68, "#3a2227");
    pixelRect(x + 274, 357, 8, 68, "#3a2227");
    drawSign(x + 50, 299, 178, "BANCA CENORITA", "#426f4d");
  }

  function drawBoss(tick) {
    if (boss.kind === "rock") {
      drawRockBoss(tick);
      return;
    }
    if (boss.kind === "zico") {
      drawZicoBoss(tick);
      return;
    }
    drawStall();
    if (!boss.active || boss.state === "hidden") return;

    if (boss.state === "spin") {
      drawTornado(tick);
      return;
    }

    ctx.save();
    ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
    if (boss.state === "flee") ctx.rotate(Math.sin(tick * 0.04) * 0.16);
    if (boss.state === "dizzy") ctx.rotate(Math.sin(tick * 0.028) * 0.045);
    if (boss.flash > 0 && Math.floor(boss.flash * 45) % 2 === 0) ctx.globalAlpha = 0.35;
    let frame = boss.phase - 1;
    if (boss.throwAnim > 0) frame = boss.throwAnim > 0.19 ? 3 : 4;
    if (boss.state === "dizzy" || boss.state === "defeated") frame = 5;
    const rendered = drawSheetFrame(images.joyceActions, frame, 3, 2, -108, -105, 216, 216);
    if (!rendered && imageReady(images.joyce)) ctx.drawImage(images.joyce, -90, -95, 180, 197);
    if (!rendered && !imageReady(images.joyce)) drawCarrotBase(-55, -70, 110, 140);
    if (boss.phaseFlash > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = boss.phaseFlash * 0.48;
      ctx.fillStyle = boss.phase === 3 ? "#ff315c" : "#ff9c42";
      ctx.fillRect(-108, -105, 216, 216);
    }
    ctx.restore();

    if (boss.state === "dizzy") {
      ctx.fillStyle = "#ffe178";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 4; i += 1) {
        const angle = tick * 0.006 + i * Math.PI / 2;
        ctx.fillText("★", boss.x + boss.w / 2 + Math.cos(angle) * 76, boss.y + 8 + Math.sin(angle) * 18);
      }
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "#fff3a7";
      ctx.lineWidth = 4;
      ctx.strokeRect(boss.x - 5, boss.y - 5, boss.w + 10, boss.h + 10);
      ctx.restore();
    }
  }

  function drawZicoBoss(tick) {
    // Bancada de marceneiro e colmeias ancoram o combate na clareira.
    const benchX = BOSS_HOME - 82;
    pixelRect(benchX, 426, 286, 74, "#3f2e20");
    pixelRect(benchX + 9, 438, 268, 62, "#825830");
    pixelRect(benchX + 15, 445, 256, 7, "#c08a48");
    pixelRect(benchX + 31, 420, 38, 10, "#bdc6c3");
    pixelRect(benchX + 96, 414, 44, 14, "#68513b");
    pixelRect(benchX + 173, 416, 48, 12, "#d4b265");
    drawSign(benchX + 28, 286, 225, "OFICINA DO ZANGÃO", "#48653a");
    if (!boss.active || boss.state === "hidden") return;

    ctx.save();
    ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
    const facing = hero.x + hero.w / 2 < boss.x + boss.w / 2 ? -1 : 1;
    if (boss.flash > 0 && Math.floor(boss.flash * 45) % 2 === 0) ctx.globalAlpha = 0.32;
    if (boss.state === "flee") ctx.rotate(Math.sin(tick * 0.04) * 0.14);
    if (boss.state === "teiu_stunned") ctx.rotate(Math.sin(tick * 0.035) * 0.055);
    if (boss.phase === 1) {
      const action = boss.state === "teiu_tail" ? 2 : boss.state === "teiu_stunned" ? 3 : Math.floor(tick / 130) % 2;
      ctx.scale(boss.dir > 0 ? -1 : 1, 1);
      drawSheetFrame(images.teiuBees, action, 4, 2, -180, -263, 360, 360);
    } else if (boss.phase === 2) {
      ctx.scale(facing > 0 ? -1 : 1, 1);
      drawSheetFrame(images.zicoActions, 4, 4, 2, -152, -232, 304, 405);
    } else {
      let frame = boss.throwAnim > 0 ? 5 : 3;
      if (["defeated", "flee"].includes(boss.state)) frame = boss.state === "flee" ? 7 : 6;
      ctx.scale(facing > 0 ? -1 : 1, 1);
      drawSheetFrame(images.zicoActions, frame, 4, 2, -123, -201, 246, 328);
    }
    if (boss.phaseFlash > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = boss.phaseFlash * 0.45;
      ctx.fillStyle = boss.phase === 3 ? "#ff6e42" : "#ffe05f";
      ctx.fillRect(-120, -130, 240, 250);
    }
    ctx.restore();

    if (boss.state === "teiu_tail") {
      ctx.save();
      ctx.strokeStyle = "rgba(237,213,137,.72)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(boss.x + boss.w / 2, boss.y + 120, 105, Math.PI * 0.08, Math.PI * 0.92);
      ctx.stroke();
      ctx.restore();
    }
    if (boss.state === "teiu_stunned") {
      ctx.fillStyle = "#ffe26b";
      ctx.font = "bold 21px monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 4; i += 1) {
        const angle = tick * 0.006 + i * Math.PI / 2;
        ctx.fillText("★", boss.x + boss.w / 2 + Math.cos(angle) * 82, boss.y + 18 + Math.sin(angle) * 18);
      }
    }
  }

  function drawRockBoss(tick) {
    const counterX = BOSS_HOME - 80;
    pixelRect(counterX, 426, 280, 74, "#302116");
    pixelRect(counterX + 10, 440, 260, 60, "#7b4a24");
    pixelRect(counterX + 14, 446, 252, 8, "#d49a49");
    for (let x = counterX + 24; x < counterX + 250; x += 44) drawCanGlyph(x, 421, 0.75, x % 3 === 0);
    drawSign(counterX + 38, 292, 205, "BOTECO DENTE DE CAVALO", "#7a4e20");
    if (!boss.active || boss.state === "hidden") return;
    ctx.save();
    ctx.translate(boss.x + boss.w / 2, boss.y + boss.h / 2);
    const faceDirection = ["frenzy", "breath"].includes(boss.state)
      ? boss.dir
      : (hero.x + hero.w / 2 < boss.x + boss.w / 2 ? -1 : 1);
    if (boss.state === "frenzy") {
      const stride = Math.sin(tick * 0.055);
      ctx.translate(0, -Math.abs(stride) * 5);
      ctx.rotate(stride * 0.035 * faceDirection);
      ctx.scale(1 + Math.abs(stride) * 0.045, 1 - Math.abs(stride) * 0.035);
    }
    if (boss.state === "dizzy") ctx.rotate(Math.sin(tick * 0.028) * 0.06);
    if (boss.state === "flee") ctx.rotate(Math.sin(tick * 0.04) * 0.16);
    if (boss.flash > 0 && Math.floor(boss.flash * 45) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.scale(faceDirection < 0 ? 1 : -1, 1);
    let frame = 0;
    if (boss.state === "drink") frame = 2;
    else if (boss.state === "breath") frame = 5;
    else if (boss.state === "retaliate") frame = boss.timer < 1.05 ? 3 : 1;
    else if (boss.state === "frenzy") frame = boss.biteCooldown > 0.5 ? 5 : (boss.turnFlash > 0 ? 7 : 4);
    else if (boss.state === "dizzy" || boss.state === "defeated") frame = 6;
    else if (boss.state === "flee") frame = 4;
    else if (boss.throwAnim > 0) frame = 1;
    const rendered = drawSheetFrame(images.rockActions, frame, 4, 2, -112, -112, 224, 224);
    if (!rendered) {
      pixelRect(-38, -48, 76, 106, "#213b71");
      pixelRect(-34, -84, 68, 42, "#b87555");
      pixelRect(-18, -60, 36, 12, "#f5e9c7");
    }
    ctx.restore();
    if (boss.state === "breath") {
      const direction = faceDirection;
      const mouthX = direction > 0 ? boss.x + boss.w - 25 : boss.x + 25;
      const mouthY = boss.y + 84;
      ctx.save();
      ctx.globalAlpha = boss.timer < 0.72 ? 0.42 + boss.timer * 0.45 : 0.72;
      ctx.strokeStyle = boss.phase === 3 ? "#ff7a65" : boss.phase === 2 ? "#d999e3" : "#e8d77f";
      ctx.lineWidth = 4 + boss.phase;
      for (let i = 0; i < 3; i += 1) {
        const reach = 18 + i * 18 + Math.max(0, boss.timer - 0.72) * 22;
        ctx.beginPath();
        ctx.arc(mouthX + direction * reach, mouthY + Math.sin(tick * 0.011 + i) * 6, 8 + i * 5, direction > 0 ? -0.8 : Math.PI - 0.8, direction > 0 ? 0.8 : Math.PI + 0.8);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (boss.state === "frenzy") {
      const trailDirection = boss.dir;
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = "#f2cf75";
      ctx.lineWidth = 5;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(boss.x + boss.w / 2 - trailDirection * (55 + i * 18), boss.y + 70 + i * 22);
        ctx.lineTo(boss.x + boss.w / 2 - trailDirection * (112 + i * 25), boss.y + 70 + i * 22);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (boss.state === "retaliate" && boss.timer < 1.9) {
      ctx.save();
      ctx.fillStyle = "#fff2c6";
      ctx.strokeStyle = "#4b2a28";
      ctx.lineWidth = 4;
      ctx.fillRect(boss.x - 96, boss.y - 58, 260, 43);
      ctx.strokeRect(boss.x - 96, boss.y - 58, 260, 43);
      ctx.fillStyle = "#531f2a";
      ctx.font = "bold 12px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VOU TE MOSTRAR COMO SE JOGA!", boss.x + 34, boss.y - 31);
      ctx.restore();
    }
    if (boss.state === "dizzy") {
      ctx.fillStyle = "#a9dfff";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      for (let i = 0; i < 4; i += 1) {
        const angle = tick * 0.006 + i * Math.PI / 2;
        ctx.fillText("★", boss.x + boss.w / 2 + Math.cos(angle) * 76, boss.y + 8 + Math.sin(angle) * 18);
      }
    }
  }

  function drawTornado(tick) {
    const centerX = boss.x + boss.w / 2;
    const centerY = boss.y + boss.h * 0.56;
    ctx.save();
    ctx.translate(centerX, centerY);
    const spin = tick * (0.017 + boss.phase * 0.006);
    const colors = ["#f5a046", "#e8672d", "#f7cf74", "#dc3f63", "#68b855"];

    ctx.globalAlpha = 0.24;
    drawSheetFrame(images.joyceActions, 2, 3, 2, -98, -105, 196, 196);
    ctx.globalAlpha = 1;
    const bandCount = 8 + boss.phase * 3;
    for (let i = 0; i < bandCount; i += 1) {
      const t = i / (bandCount - 1);
      const y = -96 + t * 194;
      const radius = 24 + Math.sin(t * Math.PI) * (66 + boss.phase * 8);
      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.68 + (i % 2) * 0.22;
      ctx.lineWidth = 5 + (i % 3) * 2;
      ctx.beginPath();
      ctx.ellipse(Math.sin(spin + i) * 9, y, radius, 12 + (i % 2) * 5, Math.sin(spin + i) * 0.12, 0.15, Math.PI * 1.8);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    for (let i = 0; i < 5 + boss.phase * 2; i += 1) {
      const angle = spin * (i % 2 ? -1 : 1) + i * 0.93;
      const radius = 37 + (i % 3) * 25;
      ctx.save();
      ctx.translate(Math.cos(angle) * radius, -76 + i * 24 + Math.sin(angle) * 8);
      ctx.rotate(angle + Math.PI / 2);
      drawCarrotGlyph(0, 0, 0.42 + (i % 2) * 0.16, 1);
      ctx.restore();
    }

    if (boss.phase >= 2) {
      ctx.strokeStyle = boss.phase === 3 ? "rgba(255,49,92,.78)" : "rgba(255,224,127,.62)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 98 + Math.sin(spin) * 9, spin, spin + Math.PI * 1.45);
      ctx.stroke();
    }

    ctx.fillStyle = "#1a1020";
    ctx.fillRect(-31, -20, 18, 9);
    ctx.fillRect(13, -20, 18, 9);
    ctx.fillStyle = "#fff0a8";
    ctx.fillRect(-27, -17, 10, 4);
    ctx.fillRect(17, -17, 10, 4);
    ctx.restore();
  }

  function drawHero() {
    const eating = hero.eatAnim > 0;
    const biluiaFlying = biluiaState === "active";
    const biluiaActing = biluiaState === "admire";
    const walking = Math.abs(hero.vx) > 20 && hero.onGround && !eating;
    const bob = 0;
    let legacyFrame = 0;
    let funnyFrame = hero.squash > 0 ? 1 : 0;
    if (eating) funnyFrame = 4 + hero.eatStage;
    else if (hero.shootAnim > 0) {
      funnyFrame = 3;
      legacyFrame = hero.shootAnim > 0.16 ? 4 : 5;
    } else if (!hero.onGround) {
      funnyFrame = 2;
      legacyFrame = 3;
    }
    ctx.save();
    ctx.globalAlpha = hero.invincible > 0 && hero.invincible < 2 && Math.floor(hero.invincible * 16) % 2 === 0 ? 0.35 : 1;
    ctx.fillStyle = "rgba(0,0,0,.3)";
    ctx.beginPath();
    ctx.ellipse(hero.x + hero.w / 2, hero.y + hero.h - 1, walking ? 22 : 20, walking ? 5 : 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(hero.x + hero.w / 2, hero.y + hero.h / 2 + bob);
    const chew = eating ? Math.sin((EAT_DURATION - hero.eatAnim) * 35) * 0.035 : 0;
    const squashY = (hero.squash > 0 ? 0.86 : 1) + chew;
    const stretchY = !hero.onGround && hero.vy < -120 ? 1.05 : 1;
    ctx.scale(hero.face * (hero.squash > 0 ? 1.12 : 1), squashY * stretchY);
    let rendered = false;
    let funnyRendered = false;
    if (biluiaFlying || biluiaActing) {
      let biluiaFrame = biluiaActing ? (biluiaIntroTimer > 0.95 ? 3 : 4) : hero.shootAnim > 0 ? 7 : 5 + (Math.floor(gameTime * 11) % 2);
      funnyRendered = drawSheetFrame(images.biluiaActions, biluiaFrame, 4, 2, -64, -78, 128, 128);
      rendered = funnyRendered;
    } else if (walking && hero.shootAnim <= 0) {
      const walkFrame = Math.floor(hero.walkCycle) % 4;
      funnyRendered = drawSheetFrame(images.shallFunnyWalk, walkFrame, 4, 1, -62, -55, 124, 124);
      rendered = funnyRendered || drawSheetFrame(images.shallWalk, walkFrame, 4, 1, -46, -50, 92, 98);
    }
    if (!rendered) {
      funnyRendered = drawSheetFrame(images.shallFunnyActions, funnyFrame, 4, 2, -62, -79, 124, 124);
      rendered = funnyRendered || drawSheetFrame(images.shallActions, legacyFrame, 3, 2, -44, -49, 88, 96);
    }
    if (!rendered && imageReady(images.shall)) {
      ctx.drawImage(images.shall, -28, -42, 56, 84);
    } else if (!rendered) {
      pixelRect(-19, -33, 38, 66, "#171a22");
      pixelRect(-13, -31, 26, 24, "#d69a75");
    }
    if (hero.shootAnim > 0 && hero.shootAnim < 0.18) {
      ctx.strokeStyle = "rgba(183,235,255,.75)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(31, -5, 18, -0.8, 0.55);
      ctx.stroke();
    }
    if (eating && !funnyRendered) {
      const progress = clamp((EAT_DURATION - hero.eatAnim) / EAT_DURATION, 0, 1);
      const lift = progress < 0.32 ? progress / 0.32 : progress < 0.72 ? 1 : (1 - progress) / 0.28;
      const snackX = 31 - lift * 18;
      const snackY = 10 - lift * 25;
      const bites = progress > 0.55 ? 4 : 0;
      pixelRect(snackX, snackY, 20 - bites, 5, "#e7a34e");
      pixelRect(snackX + 2, snackY + 5, 16 - bites, 3, "#6fc353");
      pixelRect(snackX + 1, snackY + 8, 18 - bites, 4, "#a94c35");
      pixelRect(snackX, snackY + 12, 20 - bites, 5, "#d99545");
      pixelRect(15, 4, 5, 7, "#d79a73");
      if (progress > 0.42 && progress < 0.78) {
        pixelRect(21, -14, 3, 3, "#f2c06a");
        pixelRect(27, -9, 2, 2, "#76bd54");
      }
    }
    ctx.restore();
    if (biluiaFlying) {
      const ratio = clamp(biluiaTimer / (boss.active ? 18 : BILUIA_DURATION), 0, 1);
      ctx.save();
      pixelRect(hero.x - 3, hero.y - 13, hero.w + 6, 6, "#13222b");
      pixelRect(hero.x - 1, hero.y - 11, (hero.w + 2) * ratio, 2, ratio < 0.28 ? "#ff6a55" : "#ffe06a");
      ctx.restore();
    }
    if (eating) {
      const progress = clamp((EAT_DURATION - hero.eatAnim) / EAT_DURATION, 0, 1);
      if (progress > 0.22 && progress < 0.62) {
        ctx.save();
        ctx.translate(hero.x + hero.w / 2 + hero.face * 31, hero.y - 17);
        ctx.rotate(hero.face * -0.08);
        ctx.fillStyle = "#fff3c4";
        ctx.strokeStyle = "#6c3240";
        ctx.lineWidth = 3;
        ctx.fillRect(-25, -15, 50, 25);
        ctx.strokeRect(-25, -15, 50, 25);
        ctx.fillStyle = "#d84d43";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(hero.eatStage >= 2 ? "NHAC!" : "HMMM!", 0, 2);
        ctx.restore();
      }
    }
  }

  function drawProjectiles() {
    for (const marble of marbles) {
      const direction = Math.sign(marble.vx || 1);
      for (let i = 3; i >= 1; i -= 1) {
        ctx.globalAlpha = 0.1 + (3 - i) * 0.08;
        ctx.fillStyle = "#6bc4db";
        ctx.beginPath();
        ctx.arc(marble.x + 5 - direction * i * 7, marble.y + 5, 5 - i * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#a8e9ff";
      ctx.beginPath();
      ctx.arc(marble.x + 5, marble.y + 5, 5, 0, Math.PI * 2);
      ctx.fill();
      pixelRect(marble.x + 3, marble.y + 2, 3, 3, "#ffffff");
      ctx.strokeStyle = "#3f799c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(marble.x + 5, marble.y + 5, 4, marble.rotation, marble.rotation + Math.PI * 0.85);
      ctx.stroke();
    }
    for (const marble of rockMarbles) {
      ctx.save();
      ctx.translate(marble.x + 5.5, marble.y + 5.5);
      ctx.rotate(marble.rotation);
      if (marble.special) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#ff6b66";
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = marble.special ? "#ffcf69" : "#78d7ff";
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fill();
      pixelRect(-2, -3, 3, 3, "#ffffff");
      ctx.strokeStyle = marble.special ? "#a53c43" : "#345d9a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 4.4, 0.2, Math.PI * 1.1);
      ctx.stroke();
      ctx.restore();
    }
    for (const hazard of zicoHazards) {
      ctx.save();
      if (hazard.kind === "bee") {
        ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
        ctx.scale(hazard.vx > 0 ? -1 : 1, 1);
        const frame = 6 + (Math.floor(hazard.age * 12) % 2);
        if (!drawSheetFrame(images.teiuBees, frame, 4, 2, -39, -33, 78, 66)) {
          pixelRect(-15, -8, 30, 16, "#e7b62d");
          pixelRect(-7, -8, 6, 16, "#2a2421");
          pixelRect(4, -8, 6, 16, "#2a2421");
        }
      } else if (hazard.kind === "teiu") {
        ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
        ctx.scale(hazard.vx > 0 ? -1 : 1, 1);
        drawSheetFrame(images.teiuBees, Math.floor(hazard.age * 10) % 2, 4, 2, -86, -50, 172, 100);
      } else {
        ctx.translate(hazard.x + hazard.w / 2, hazard.y + hazard.h / 2);
        ctx.rotate(hazard.rotation);
        if (hazard.kind === "hammer") {
          pixelRect(-4, -18, 8, 36, "#795337");
          pixelRect(-15, -21, 30, 12, "#aeb8b8");
          pixelRect(-11, -18, 22, 5, "#dae0dc");
        } else if (hazard.kind === "saw") {
          pixelRect(-18, -5, 36, 10, "#c4cdca");
          for (let i = -16; i < 17; i += 8) {
            ctx.fillStyle = "#e2e5dd";
            ctx.beginPath();
            ctx.moveTo(i, 5);
            ctx.lineTo(i + 4, 12);
            ctx.lineTo(i + 8, 5);
            ctx.fill();
          }
          pixelRect(12, -8, 12, 16, "#7a5336");
        } else {
          pixelRect(-3, -17, 6, 34, "#b7c2c1");
          pixelRect(-6, 10, 12, 12, "#795337");
        }
      }
      ctx.restore();
    }
    for (const cloud of alcoholBreaths) {
      ctx.save();
      const centerX = cloud.x + cloud.w / 2;
      const centerY = cloud.y + cloud.h / 2;
      ctx.translate(centerX, centerY);
      const direction = Math.sign(cloud.vx || 1);
      const pulse = 1 + Math.sin(cloud.age * 10) * 0.09;
      ctx.scale(pulse, 2 - pulse);
      const palettes = [null, ["#e7d27a", "#b7c56b"], ["#f0b25f", "#b88ad7"], ["#ff755d", "#7ed7c5"]];
      const palette = palettes[cloud.level];
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = palette[1];
      for (let i = 1; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-direction * (cloud.w * 0.42 + i * 13), Math.sin(cloud.age * 7 + i) * 7, Math.max(5, 14 - i * 2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.78;
      for (let i = 0; i < 6 + cloud.level; i += 1) {
        const angle = i * 1.7 + cloud.age * cloud.spin * (1.4 + cloud.level * 0.2);
        const radiusX = cloud.w * (0.18 + (i % 3) * 0.12);
        const radiusY = cloud.h * (0.12 + (i % 2) * 0.17);
        ctx.fillStyle = palette[i % 2];
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * radiusX, Math.sin(angle) * radiusY, 7 + (i % 3) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = cloud.level === 3 ? "#fff0a4" : "#674b38";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, cloud.w * 0.34, cloud.h * 0.32, cloud.age * cloud.spin, 0, Math.PI * 1.55);
      ctx.stroke();
      ctx.restore();
    }
    for (const carrot of carrots) {
      ctx.save();
      ctx.translate(carrot.x + carrot.w / 2, carrot.y + carrot.h / 2);
      ctx.rotate(carrot.rotation);
      ctx.globalAlpha = carrot.special ? 0.45 : 0.25;
      pixelRect(carrot.special ? -42 : -28, -3, carrot.special ? 31 : 17, 6, carrot.sequence % 2 ? "#8fcf60" : "#f5b35d");
      ctx.globalAlpha = 1;
      ctx.fillStyle = carrot.special && boss.phase === 3 ? "#ff5c2f" : "#f07b30";
      ctx.beginPath();
      ctx.moveTo(-carrot.w * 0.52, -carrot.h * 0.46);
      ctx.lineTo(carrot.w * 0.38, 0);
      ctx.lineTo(-carrot.w * 0.52, carrot.h * 0.46);
      ctx.closePath();
      ctx.fill();
      pixelRect(7, -7, 5, 14, "#d95b27");
      pixelRect(10, -7, 10, 5, "#64b558");
      pixelRect(10, 2, 10, 5, "#79c963");
      pixelRect(-8, -3, 4, 3, "#ffc56b");
      ctx.restore();
    }
    for (const can of cans) {
      ctx.save();
      ctx.translate(can.x + can.w / 2, can.y + can.h / 2);
      ctx.rotate(can.rotation);
      if (can.special) {
        ctx.globalAlpha = 0.28;
        pixelRect(-38, -3, 27, 6, can.bottle ? "#936645" : "#8cc8e8");
        ctx.globalAlpha = 1;
      }
      drawCanGlyph(0, 0, can.bottle ? 0.72 : 0.85, can.bottle);
      ctx.restore();
    }
  }

  function drawBiluiaEvents(tick) {
    if (stageNumber !== 3) return;
    for (const bug of biluiaRain) {
      if (bug.eaten) continue;
      const frame = bug.frame ^ (Math.floor(tick / 120) % 2);
      drawSheetFrame(images.biluiaActions, frame, 4, 2, bug.x - 22, bug.y - 19, 44, 44);
    }
    if (biluiaPickup && !biluiaPickup.eaten) {
      const pulse = 1 + Math.sin(tick * 0.009) * 0.08;
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#fff2a3";
      ctx.beginPath();
      ctx.arc(biluiaPickup.x + 19, biluiaPickup.y + 15, 29 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawSheetFrame(images.biluiaActions, biluiaPickup.frame || 0, 4, 2, biluiaPickup.x - 4, biluiaPickup.y - 12, 54, 54);
      ctx.restore();
    }
    if (biluiaLaughTimer > 0) {
      ctx.save();
      ctx.fillStyle = "#fff0a7";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.fillText("HA! HA! NHAC!", ARENA_START + 600, 250);
      ctx.restore();
    }
  }

  function drawEffects() {
    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      pixelRect(particle.x, particle.y, particle.size, particle.size, particle.color);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.font = "bold 22px monospace";
    for (const number of damageNumbers) {
      ctx.globalAlpha = clamp(number.life / 0.75, 0, 1);
      ctx.fillStyle = "#fff3a7";
      ctx.fillText(number.text, number.x, number.y);
      ctx.strokeStyle = "#7b2435";
      ctx.lineWidth = 2;
      ctx.strokeText(number.text, number.x, number.y);
    }
    ctx.globalAlpha = 1;
  }

  function applyDrunkSceneTransform(viewWidth, viewHeight, tick) {
    if (drunkTimer <= 0 || drunkLevel <= 0) return;
    const time = tick * 0.001;
    ctx.translate(viewWidth / 2, viewHeight / 2);
    if (drunkLevel === 1) {
      const wobble = Math.sin(time * 4.7) * 0.035;
      const stretch = 1.055 + Math.sin(time * 6.1) * 0.025;
      ctx.rotate(wobble);
      ctx.transform(1, Math.sin(time * 3.1) * 0.025, Math.cos(time * 4.2) * 0.035, 1, 0, 0);
      ctx.scale(stretch, 2.08 - stretch);
    } else if (drunkLevel === 2) {
      ctx.rotate(Math.sin(time * 4.1) * 0.065);
      ctx.transform(1, Math.sin(time * 3.7) * 0.07, Math.cos(time * 5.2) * 0.095, 1, Math.sin(time * 2.6) * 10, Math.cos(time * 3.3) * 7);
      ctx.scale(1.12 + Math.sin(time * 6.4) * 0.025, 1.1 + Math.cos(time * 5.8) * 0.035);
    } else {
      ctx.rotate(Math.sin(time * 5.4) * 0.105 + Math.cos(time * 2.8) * 0.03);
      ctx.transform(1, Math.sin(time * 5.9) * 0.13, Math.cos(time * 4.7) * 0.16, 1, Math.sin(time * 3.8) * 18, Math.cos(time * 4.4) * 13);
      ctx.scale(1.22 + Math.sin(time * 7.2) * 0.045, 1.18 + Math.cos(time * 6.3) * 0.05);
    }
    ctx.translate(-viewWidth / 2, -viewHeight / 2);
  }

  function drawDrunkScreenOverlay(viewWidth, viewHeight, tick) {
    if (drunkTimer <= 0 || drunkLevel <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.13 + drunkLevel * 0.045 + Math.sin(tick * 0.006) * 0.025;
    const gradient = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
    gradient.addColorStop(0, drunkLevel === 3 ? "#ff5d59" : "#5fc8ff");
    gradient.addColorStop(0.5, "#d85bbd");
    gradient.addColorStop(1, drunkLevel >= 2 ? "#f0b34e" : "#ffd36a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Faixas cromáticas reforçam a visão dupla sem virar ou rodar a tela.
    ctx.globalCompositeOperation = "screen";
    const bands = 3 + drunkLevel * 2;
    for (let i = 0; i < bands; i += 1) {
      const bandY = ((i * 89 + tick * (0.018 + drunkLevel * 0.006)) % (viewHeight + 80)) - 40;
      const offset = Math.sin(tick * 0.004 + i * 1.7) * (4 + drunkLevel * 5);
      ctx.globalAlpha = 0.025 + drunkLevel * 0.012;
      ctx.fillStyle = i % 2 ? "#54d5ff" : "#ff4f86";
      ctx.fillRect(offset, bandY, viewWidth, 12 + drunkLevel * 5);
    }
    ctx.globalCompositeOperation = "source-over";

    ctx.globalAlpha = 0.78;
    ctx.fillStyle = "rgba(10,7,19,.78)";
    ctx.fillRect(12, viewHeight - 42, 143, 28);
    ctx.strokeStyle = drunkLevel === 3 ? "#ff7665" : "#f0cf72";
    ctx.lineWidth = 3;
    ctx.strokeRect(12, viewHeight - 42, 143, 28);
    ctx.fillStyle = "#fff1be";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "left";
    ctx.fillText("BAFÔMETRO", 22, viewHeight - 24);
    for (let i = 1; i <= 3; i += 1) {
      ctx.fillStyle = i <= drunkLevel ? (drunkLevel === 3 ? "#ff705d" : "#f2c45f") : "#4d4762";
      ctx.beginPath();
      ctx.arc(105 + i * 12, viewHeight - 28, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawConsoleAtmosphere(viewWidth, viewHeight, tick, inBossArena) {
    ctx.save();
    const moteColor = stageNumber === 3 ? "#e7d24b" : stageNumber === 2 ? "#efb45a" : "#f39a3d";
    for (let i = 0; i < 12; i += 1) {
      const drift = (tick * (0.006 + (i % 3) * 0.002) + i * 83) % (viewWidth + 80);
      const x = drift - 40;
      const y = 62 + ((i * 73 + Math.sin(tick * 0.0017 + i) * 31) % Math.max(120, viewHeight - 115));
      ctx.globalAlpha = 0.05 + (i % 4) * 0.018;
      ctx.fillStyle = moteColor;
      ctx.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 3 : 2, i % 3 === 0 ? 2 : 1);
    }

    const grade = ctx.createLinearGradient(0, 0, viewWidth, viewHeight);
    grade.addColorStop(0, stageNumber === 3 ? "rgba(27,80,41,.08)" : stageNumber === 2 ? "rgba(20,31,66,.09)" : "rgba(13,31,62,.08)");
    grade.addColorStop(0.52, "rgba(0,0,0,0)");
    grade.addColorStop(1, inBossArena ? "rgba(107,20,35,.11)" : "rgba(75,20,47,.07)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = grade;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.globalAlpha = inBossArena ? 0.045 + boss.phase * 0.012 : 0.035;
    ctx.fillStyle = inBossArena && boss.phase === 3 ? "#ff7e32" : stageNumber === 3 ? "#b1cc48" : stageNumber === 2 ? "#e08b45" : "#ea7739";
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#02040b";
    for (let y = 1; y < viewHeight; y += 4) ctx.fillRect(0, y, viewWidth, 1);

    const vignette = ctx.createRadialGradient(viewWidth / 2, viewHeight * 0.48, viewWidth * 0.18, viewWidth / 2, viewHeight * 0.48, viewWidth * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.72, stageNumber === 3 ? "rgba(13,46,22,.07)" : stageNumber === 2 ? "rgba(2,3,12,.08)" : "rgba(81,45,12,.025)");
    vignette.addColorStop(1, stageNumber === 3 ? "rgba(10,39,19,.35)" : stageNumber === 2 ? "rgba(2,3,12,.48)" : "rgba(81,45,12,.18)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    if (landingPulse > 0) {
      const landingGlow = ctx.createLinearGradient(0, viewHeight - 105, 0, viewHeight);
      landingGlow.addColorStop(0, "rgba(255,219,139,0)");
      landingGlow.addColorStop(1, `rgba(255,219,139,${landingPulse * 0.2})`);
      ctx.fillStyle = landingGlow;
      ctx.fillRect(0, viewHeight - 105, viewWidth, 105);
    }
    if (impactFlash > 0) {
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = clamp(impactFlash * 2.9, 0, 0.38);
      ctx.fillStyle = impactColor;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    ctx.restore();
  }

  function draw(tick) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    const viewWidth = W / zoom;
    const viewHeight = H / zoom;
    ctx.save();
    ctx.scale(zoom, zoom);
    if (screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    const inBonus = hero.x > BONUS_START - 180;
    const inBossArena = boss.active && !inBonus;
    ctx.fillStyle = "#120b18";
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.save();
    applyDrunkSceneTransform(viewWidth, viewHeight, tick);
    if (inBonus) {
      ctx.fillStyle = "#241b29";
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    } else if (inBossArena) {
      if (stageNumber === 3) drawForestBackdrop(viewWidth, viewHeight, tick, true);
      else if (stageNumber === 2) drawRockArenaSky(viewWidth, viewHeight, tick);
      else drawBossArenaSky(viewWidth, viewHeight, tick);
    } else {
      if (stageNumber === 3) drawForestBackdrop(viewWidth, viewHeight, tick);
      else if (stageNumber === 2) drawBarBackdrop(viewWidth, viewHeight, tick);
      else drawStageOneDay(viewWidth, viewHeight, tick);
      if (stageNumber === 3) {
        drawZicoWatcher(viewWidth, viewHeight, tick);
        drawForestForeground(viewWidth, tick);
        drawBossWatcherOccluders(3, viewWidth, tick);
      } else if (stageNumber === 2) {
        drawRockWatcher(viewWidth);
        drawRockCityForeground(viewWidth, tick);
        drawBossWatcherOccluders(2, viewWidth, tick);
      }
      else {
        drawJoyceWatcher(viewWidth, viewHeight, tick);
        drawStageOneCityForeground(viewWidth, viewHeight, tick);
        drawBossWatcherOccluders(1, viewWidth, tick);
      }
    }

    ctx.save();
    ctx.translate(-camera, viewHeight - H + cameraLift);
    if (inBonus) {
      drawInterior();
    } else if (inBossArena) {
      if (stageNumber === 3) drawZicoArenaDecor(tick);
      else if (stageNumber === 2) drawRockArenaDecor(tick);
      else drawBossArenaDecor(tick);
    } else {
      if (stageNumber === 3) {
        drawForestTrail(tick);
      } else if (stageNumber === 2) {
        drawBarStreet(tick);
      } else {
        if (camera + viewWidth > 6200 && camera < 7650) drawCarrotTunnel(tick);
        if (camera + viewWidth > 7620 && camera < ARENA_START + 40) drawDayMarket(tick);
        drawStreetDecor();
      }
    }
    drawPlatforms();
    coins.forEach((coin) => drawCoin(coin, tick));
    foods.forEach(drawFood);
    drawBiluiaEvents(tick);
    enemies.forEach((enemy) => drawEnemy(enemy, tick));
    if (!inBonus) drawBoss(tick);
    drawProjectiles();
    drawHero();
    drawEffects();
    ctx.restore();
    ctx.restore();
    drawConsoleAtmosphere(viewWidth, viewHeight, tick, inBossArena);
    drawDrunkScreenOverlay(viewWidth, viewHeight, tick);
    ctx.restore();
  }

  function loop(now) {
    const dt = clamp((now - previousTime) / 1000, 0, 0.033);
    previousTime = now;
    if (mode === "play" && hitStopTimer > 0) {
      hitStopTimer = Math.max(0, hitStopTimer - dt);
      impactFlash = Math.max(0, impactFlash - dt * 0.65);
      screenShake = Math.max(0, screenShake - dt * 5);
    } else {
      update(dt);
    }
    draw(now);
    updateMusic(now);
    renderToast(now);
    animationFrame = requestAnimationFrame(loop);
  }

  function setControl(name, pressed, button) {
    input[name] = pressed;
    button?.classList.toggle("active", pressed);
  }

  const activePointers = new Map();

  function giveDirectionImpulse(name) {
    if (mode !== "play" || !["left", "right"].includes(name)) return;
    const direction = name === "left" ? -1 : 1;
    hero.face = direction;
    if (Math.sign(hero.vx) !== direction) hero.vx = direction * 72;
    else hero.vx = direction * Math.max(72, Math.abs(hero.vx));
  }

  function releasePointer(pointerId) {
    const binding = activePointers.get(pointerId);
    if (!binding) return;
    activePointers.delete(pointerId);
    const stillPressed = [...activePointers.values()].some((item) => item.name === binding.name);
    if (!stillPressed) input[binding.name] = false;
    binding.button.classList.toggle("active", stillPressed);
  }

  function moveDirectionPointer(event) {
    const binding = activePointers.get(event.pointerId);
    if (!binding || !["left", "right"].includes(binding.name)) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-control="left"], [data-control="right"]');
    if (!target || target === binding.button) return;
    const previousName = binding.name;
    binding.button.classList.remove("active");
    input[previousName] = [...activePointers.entries()].some(([id, item]) => id !== event.pointerId && item.name === previousName);
    binding.name = target.dataset.control;
    binding.button = target;
    input[binding.name] = true;
    target.classList.add("active");
    giveDirectionImpulse(binding.name);
  }

  document.querySelectorAll("[data-control]").forEach((button) => {
    const name = button.dataset.control;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      initAudio();
      releasePointer(event.pointerId);
      button.setPointerCapture?.(event.pointerId);
      activePointers.set(event.pointerId, { name, button });
      setControl(name, true, button);
      navigator.vibrate?.(name === "jump" ? 10 : 6);
      giveDirectionImpulse(name);
      if (name === "jump" && mode === "play") jumpQueued = true;
      if (name === "shoot" && mode === "play") fireMarble();
      if (name === "eat") eatSnack();
    }, { passive: false });
    button.addEventListener("lostpointercapture", (event) => releasePointer(event.pointerId));
  });

  document.addEventListener("pointermove", moveDirectionPointer, { passive: false });
  document.addEventListener("pointerup", (event) => releasePointer(event.pointerId), { passive: true });
  document.addEventListener("pointercancel", (event) => releasePointer(event.pointerId), { passive: true });
  window.addEventListener("blur", () => {
    activePointers.clear();
    input.left = input.right = input.jump = input.shoot = input.eat = false;
    document.querySelectorAll("[data-control].active").forEach((button) => button.classList.remove("active"));
  });

  const keyMap = {
    arrowleft: "left",
    a: "left",
    arrowright: "right",
    d: "right",
    arrowup: "jump",
    w: "jump",
    " ": "jump",
    x: "shoot",
    k: "shoot",
    c: "eat",
    e: "eat",
  };
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (keyMap[key]) {
      event.preventDefault();
      input[keyMap[key]] = true;
      initAudio();
      if (keyMap[key] === "shoot" && !event.repeat && mode === "play") fireMarble();
      if (keyMap[key] === "eat" && !event.repeat && mode === "play") eatSnack();
    }
    if ((key === "escape" || key === "p") && !event.repeat) togglePause();
  }, { passive: false });
  window.addEventListener("keyup", (event) => {
    const action = keyMap[event.key.toLowerCase()];
    if (action) input[action] = false;
  });

  document.querySelector("#start-button").addEventListener("click", () => {
    stageNumber = 1;
    beginStory();
  });
  document.querySelector("#next-story").addEventListener("click", () => {
    if (storyIndex >= storyFrames.length - 1) startGame();
    else {
      storyIndex += 1;
      renderStory();
      tone(390 + storyIndex * 55, 0.06, "square", 0.02);
    }
  });
  document.querySelector("#skip-story").addEventListener("click", startGame);
  document.querySelector("#pause-button").addEventListener("click", () => togglePause());
  document.querySelector("#resume-button").addEventListener("click", () => togglePause(true));
  document.querySelector("#restart-button").addEventListener("click", startGame);
  document.querySelector("#retry-button").addEventListener("click", startGame);
  ui.nextEnding.addEventListener("click", () => {
    const endingFrames = currentEndingFrames();
    if (endingIndex < endingFrames.length - 1) {
      endingIndex += 1;
      renderEnding();
      tone(330 + endingIndex * 70, 0.08, "square", 0.022);
    }
  });
  ui.playAgain.addEventListener("click", () => {
    if (stageNumber === 1) stageNumber = 2;
    else if (stageNumber === 2) stageNumber = 3;
    startGame();
  });
  document.querySelector("#stage2-button").addEventListener("click", () => {
    stageNumber = 2;
    startGame();
  });
  document.querySelector("#stage3-button").addEventListener("click", () => {
    stageNumber = 3;
    startGame();
  });

  ui.sound.classList.toggle("muted", muted);
  ui.sound.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem("shall-muted", String(muted));
    ui.sound.classList.toggle("muted", muted);
    if (!muted) {
      initAudio();
      sfx("coin");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "play") togglePause();
  });
  document.addEventListener("contextmenu", (event) => event.preventDefault());
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    if (location.hostname === "terminal.local") {
      navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    } else {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  function applyQaScenario() {
    if (location.hostname !== "terminal.local") return false;
    const scenario = new URLSearchParams(location.search).get("qa");
    if (!scenario) return false;
    if (scenario.startsWith("zico") || scenario.startsWith("forest")) stageNumber = 3;
    else if (scenario.startsWith("rock") || scenario.startsWith("drunk") || scenario === "bar-door") stageNumber = 2;
    startGame();
    hero.invincible = 999;
    if (scenario === "walk") {
      hero.x = 950;
      hero.y = 500 - hero.h;
      hero.face = 1;
      camera = 780;
      input.right = true;
    }
    if (scenario === "watcher") {
      hero.x = 4200;
      hero.y = 500 - hero.h;
      camera = hero.x - 130;
    }
    if (scenario === "tunnel") {
      hero.x = 6840;
      hero.y = 500 - hero.h;
      camera = hero.x - 140;
      currentSection = 3;
    }
    if (scenario === "market") {
      hero.x = 7900;
      hero.y = 500 - hero.h;
      camera = hero.x - 140;
      currentSection = 4;
    }
    if (scenario === "eat") {
      hero.x = 950;
      hero.y = 500 - hero.h;
      hero.health = 45;
      snackCount = 2;
      camera = 780;
    }
    if (scenario === "rock-watcher") {
      hero.x = 5100;
      hero.y = 500 - hero.h;
      camera = hero.x - 140;
      currentSection = 2;
    }
    if (scenario === "rock-walk") {
      hero.x = 1280;
      hero.y = 500 - hero.h;
      hero.onGround = true;
      hero.face = 1;
      camera = hero.x - 140;
      currentSection = 0;
      input.right = true;
    }
    if (scenario === "zico-watcher" || scenario === "forest-watcher") {
      hero.x = 5100;
      hero.y = 500 - hero.h;
      camera = hero.x - 140;
      currentSection = 3;
    }
    if (scenario === "forest-walk") {
      hero.x = 1280;
      hero.y = 500 - hero.h;
      hero.onGround = true;
      hero.face = 1;
      camera = hero.x - 140;
      currentSection = 0;
      input.right = true;
    }
    if (scenario === "biluia-rain") {
      hero.x = 4740;
      hero.y = 500 - hero.h;
      camera = hero.x - 140;
      spawnBiluiaRain();
      biluiaRain.forEach((bug, index) => { bug.y = 250 + (index % 5) * 42; });
    }
    if (scenario === "biluia-flight") {
      hero.x = 5900;
      hero.y = 270;
      camera = hero.x - 140;
      transformIntoBiluia("map");
      biluiaTimer = 9;
      input.right = true;
    }
    if (scenario.startsWith("drunk")) {
      hero.x = 3780;
      hero.y = 500 - hero.h;
      camera = hero.x - 140;
      drunkTimer = 14;
      drunkLevel = clamp(Number(scenario.split("-")[1]) || 1, 1, 3);
      visitedFriends = true;
    }
    if (scenario === "bar-door") {
      hero.x = 3620;
      hero.y = 500 - hero.h;
      hero.onGround = true;
      camera = hero.x - 140;
      currentSection = 2;
    }
    if (["boss-dizzy", "boss-spin", "boss-throw"].includes(scenario)) {
      const requestedPhase = clamp(Number(new URLSearchParams(location.search).get("phase")) || 1, 1, 3);
      hero.x = BOSS_HOME - 270;
      hero.y = 500 - hero.h;
      hero.face = 1;
      boss.active = true;
      boss.x = BOSS_HOME;
      boss.y = 322;
      boss.state = scenario.replace("boss-", "");
      boss.timer = 0;
      boss.shotIndex = 0;
      boss.phase = requestedPhase;
      boss.health = requestedPhase === 3 ? 48 : requestedPhase === 2 ? 108 : BOSS_MAX_HEALTH;
      boss.vulnerable = scenario === "boss-dizzy";
      ui.bossHud.hidden = false;
      ui.bossBanner.hidden = true;
      camera = ARENA_START + 90;
      zoom = 0.72;
      setMusic("boss");
    }
    if (["rock-dizzy", "rock-frenzy", "rock-throw", "rock-breath", "rock-retaliate", "rock-marble", "rock-stomp", "rock-bite"].includes(scenario)) {
      const requestedPhase = clamp(Number(new URLSearchParams(location.search).get("phase")) || 1, 1, 3);
      hero.x = BOSS_HOME - 270;
      hero.y = 500 - hero.h;
      hero.face = 1;
      boss.active = true;
      boss.x = BOSS_HOME;
      boss.y = 322;
      boss.state = scenario === "rock-stomp" || scenario === "rock-bite" ? "frenzy" : scenario === "rock-marble" ? "throw" : scenario.replace("rock-", "");
      boss.timer = 0;
      boss.shotIndex = 0;
      boss.phase = requestedPhase;
      boss.health = requestedPhase === 3 ? 60 : requestedPhase === 2 ? 120 : ROCK_MAX_HEALTH;
      boss.vulnerable = false;
      boss.dir = -1;
      ui.bossHud.hidden = false;
      ui.bossBanner.hidden = true;
      camera = ARENA_START + 90;
      zoom = 0.72;
      setMusic("rock");
      if (scenario === "rock-breath") {
        hero.x = boss.x - 190;
        rockState("breath");
      }
      if (scenario === "rock-retaliate") rockState("retaliate");
      if (scenario === "rock-marble") {
        hero.x = boss.x - 215;
        hero.y = boss.y + 68;
        hero.face = 1;
        marbles.push({ x: boss.x - 32, y: boss.y + 94, w: 10, h: 10, vx: 430, vy: 0, life: 1.45, age: 0, rotation: 0 });
      }
      if (scenario === "rock-stomp") {
        boss.x = ARENA_START + 570;
        boss.dir = 0;
        hero.x = boss.x + 35;
        hero.y = boss.y + boss.h - 142 - hero.h - 2;
        hero.vy = 190;
        hero.onGround = false;
        hero.coyote = 0;
        hero.jumpBuffer = 0;
        input.jump = false;
        jumpQueued = false;
        jumpWasDown = false;
      }
      if (scenario === "rock-bite") {
        hero.x = boss.x + 78;
        hero.y = 500 - hero.h;
        hero.vy = 0;
        hero.invincible = 0;
      }
    }
    if (["zico-teiu", "zico-tail", "zico-mount", "zico-final", "zico-surge"].includes(scenario)) {
      const phase = scenario === "zico-teiu" || scenario === "zico-tail" ? 1 : scenario === "zico-mount" ? 2 : 3;
      hero.x = BOSS_HOME - 280;
      hero.y = 500 - hero.h;
      boss.active = true;
      boss.phase = phase;
      boss.name = phase === 1 ? "TEIÚ DO ZICO" : "ZICO O ZANGÃO";
      boss.health = phase === 1 ? ZICO_MAX_HEALTH : phase === 2 ? 170 : 70;
      boss.x = BOSS_HOME;
      boss.y = phase === 2 ? 150 : phase === 1 ? 424 : 322;
      boss.state = scenario === "zico-tail" ? "teiu_tail" : phase === 1 ? "teiu_charge" : phase === 2 ? "mount_swarm" : scenario === "zico-surge" ? "final_surge" : "final_tools";
      boss.vulnerable = phase > 1;
      boss.dir = -1;
      boss.timer = 0;
      boss.throwTimer = 0.2;
      boss.companionTimer = 0.5;
      ui.bossHud.hidden = false;
      ui.bossBanner.hidden = true;
      camera = ARENA_START + 90;
      zoom = 0.72;
      setMusic("zico");
      if (scenario === "zico-mount") spawnZicoBee(true, 0);
      if (scenario === "zico-final" || scenario === "zico-surge") {
        spawnZicoTool(0);
        spawnZicoTool(1);
        spawnZicoBee(false, 2);
        if (scenario === "zico-surge") spawnTeiuCompanion();
      }
      updateHud();
    }
    if (scenario === "zico-biluia") {
      biluiaPickup = { x: hero.x + 50, y: hero.y + 28, w: 38, h: 30, landed: true, eaten: false, bossGift: true, frame: 0 };
      transformIntoBiluia("boss");
      boss.phase = 2;
      boss.state = "mount_swarm";
      boss.y = 150;
      boss.vulnerable = true;
      updateHud();
    }
    if (scenario === "zico-teiu-biluia") {
      biluiaPickup = { x: hero.x + 30, y: hero.y + 25, w: 38, h: 30, landed: true, eaten: false, bossGift: true, frame: 0 };
      spawnTeiuCompanion();
      updateHud();
    }
    if (scenario === "ending") {
      showEnding();
    }
    window.__shallDebug = () => ({
      bossHealth: boss.health,
      bossMaxHealth: boss.maxHealth,
      bossKind: boss.kind,
      bossMarbleDamage: BOSS_MARBLE_DAMAGE,
      bossPhase: boss.phase,
      bossState: boss.state,
      bossVulnerable: boss.vulnerable,
      bossTuning: boss.active ? { ...(boss.kind === "zico" ? zicoTuning() : boss.kind === "rock" ? rockTuning() : bossTuning()) } : null,
      marbles: marbles.length,
      rockMarbles: rockMarbles.length,
      retaliationShots: boss.retaliationShots,
      shootLockedTimer: Number(shootLockedTimer.toFixed(2)),
      carrots: carrots.length,
      cans: cans.length,
      stageNumber,
      drunkTimer: Number(drunkTimer.toFixed(2)),
      drunkLevel,
      drunkPersistent,
      alcoholBreaths: alcoholBreaths.length,
      zicoHazards: zicoHazards.length,
      biluiaState,
      biluiaTimer: Number(biluiaTimer.toFixed(2)),
      biluiaGift: Boolean(biluiaPickup && !biluiaPickup.eaten),
      biluiaBossUsed,
      musicTheme,
      musicIntensity: musicIntensity(),
      musicStep,
      audioState: audioContext?.state || "uninitialized",
      audioMix: masterGain ? {
        master: masterGain.gain.value,
        music: musicGain.gain.value,
        sfx: sfxGain.gain.value,
        output: outputGain.gain.value,
        echo: musicEchoGain.gain.value,
        chorus: musicChorusGain.gain.value,
        reverb: musicReverbGain.gain.value,
        format: "layered-32-bit",
        compressorThreshold: audioCompressor.threshold.value,
      } : null,
      visitedFriends,
      walkFrame: Math.floor(hero.walkCycle) % 4,
      heroX: Math.round(hero.x),
      heroHealth: hero.health,
      snackCount,
      eatAnim: Number(hero.eatAnim.toFixed(2)),
      eatStage: hero.eatStage,
      funnyActionsReady: imageReady(images.shallFunnyActions),
      funnyWalkReady: imageReady(images.shallFunnyWalk),
      input: { ...input },
      enemyTypes: [...new Set(enemies.map((enemy) => enemy.type))],
      endingFrame: ui.ending.dataset.frame || null,
    });
    updateHud();
    return true;
  }

  if (!applyQaScenario()) resetWorld();
  draw(performance.now());
  animationFrame = requestAnimationFrame(loop);
  window.addEventListener("beforeunload", () => cancelAnimationFrame(animationFrame));

})();
