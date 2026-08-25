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

  // Pacote visual nativo da Fase 4. O atlas já existe no repositório em 14
  // partes Base64. O carregamento é assíncrono e nunca bloqueia start/reset/loop.
  const ART_PARTS = Array.from({ length: 14 }, (_, i) =>
    `./assets/stage4/art-atlas.b64.${String(i).padStart(2, "0")}.txt?v=40`
  );
  const ATLAS = {
    far:[0,0,133,44], mid:[0,46,133,44], fore:[0,92,133,44],
    tiles:[0,138,80,60], vfx:[82,138,80,60],
    hero:[137,0,80,60], potavio:[218,0,80,60], enemies:[137,62,80,60],
  };
  let atlas = null, artReady = false, artError = false;

  async function loadArt(){
    try {
      const chunks = await Promise.all(ART_PARTS.map(async (url) => {
        const response = await fetch(url, { cache: "force-cache" });
        if (!response.ok) throw new Error(`asset ${response.status}: ${url}`);
        return (await response.text()).trim();
      }));
      const image = new Image();
      image.src = `data:image/png;base64,${chunks.join("")}`;
      if (image.decode) await image.decode();
      else await new Promise((resolve,reject)=>{ image.onload=resolve; image.onerror=reject; });
      atlas = image; artReady = true;
      document.documentElement.classList.add("stage4-native-art-ready");
    } catch (error) {
      artError = true;
      console.warn("Stage 4 native art fallback:", error);
    }
  }
  loadArt();

  const HERO = {
    idleA:[6,27,38,74], idleB:[47,27,38,76], swimA:[89,38,64,55], swimB:[148,40,56,54],
    swimC:[204,38,57,59], swimD:[258,38,52,63], upA:[7,127,34,76], upB:[45,125,38,80],
    shoot:[79,141,54,65], dash:[147,158,62,43], hurt:[219,138,51,71], transform:[261,110,55,98],
  };
  const POTAVIO = {
    idleA:[8,4,52,84], idleB:[84,7,46,81], move:[157,10,54,78], aim:[243,10,49,78],
    shot:[2,91,64,72], jet:[70,101,177,64], sneeze:[242,87,76,80], drainA:[8,168,44,68],
    drainB:[79,176,47,59], hurt:[155,177,62,58], defeat:[223,198,92,36],
  };
  const ENEMY = {
    jelly:[[23,4,55,63],[112,4,82,56],[218,6,93,60]],
    puffer:[[23,72,51,40],[106,71,83,42],[218,63,94,60]],
    eel:[[18,114,55,57],[103,120,94,44],[217,122,93,49]],
    crab:[[19,172,60,59],[115,168,77,61],[212,171,98,60]],
  };
  const TILE = {
    reefTop:[0,0,40,30], reefMiddle:[0,32,40,32], reefBottom:[0,64,40,32],
    caveWall:[40,0,40,32], coral:[80,0,40,32], pipe:[120,64,40,32],
    bubbleVent:[160,64,40,32], arenaFloor:[200,64,40,32], cracked:[240,64,40,32],
  };
  const VFX = {
    bubble:[0,0,80,60], splash:[80,0,80,60], dash:[160,0,80,60], spray:[240,0,80,60],
    jet:[0,60,160,60], wave:[160,60,160,60], transform:[80,120,80,60], impact:[160,120,80,60],
  };

  function atlasSource(regionName, local){
    const [rx,ry] = ATLAS[regionName];
    if (!local) return ATLAS[regionName];
    const sx=Math.floor(local[0]/4), sy=Math.floor(local[1]/4);
    const ex=Math.max(sx+1,Math.floor((local[0]+local[2])/4));
    const ey=Math.max(sy+1,Math.floor((local[1]+local[3])/4));
    return [rx+sx,ry+sy,ex-sx,ey-sy];
  }
  function drawSheet(image, source, dx, dy, dw, dh, flipX=false, alpha=1){
    if (!image || !source) return false;
    const [sx,sy,sw,sh]=source;
    ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;
    if(flipX){ctx.translate(Math.round(dx+dw),Math.round(dy));ctx.scale(-1,1);ctx.drawImage(image,sx,sy,sw,sh,0,0,Math.round(dw),Math.round(dh));}
    else ctx.drawImage(image,sx,sy,sw,sh,Math.round(dx),Math.round(dy),Math.round(dw),Math.round(dh));
    ctx.restore();return true;
  }
  function drawAsset(regionName, local, dx,dy,dw,dh,flipX=false,alpha=1){
    if(!artReady||!atlas)return false;
    return drawSheet(atlas,atlasSource(regionName,local),dx,dy,dw,dh,flipX,alpha);
  }
  const keys = { left: false, right: false, swim: false, shoot: false, dash: false };
  const pointers = new Map();
  let mode = "intro", last = performance.now(), clock = 0, camera = 0, shells = 0;
  let transformTimer = 0, transformed = false, shake = 0, flash = 0, toastUntil = 0, zoneId = -1;
  let muted = localStorage.getItem("shall-muted") === "true", audio = null, gain = null, beatAt = 0, beatStep = 0;

  const hero = { x:105, y:105, w:54, h:68, vx:0, vy:70, face:1, hp:100, inv:0, shotCd:0, dashCd:0, dashTime:0, shootAnim:0 };
  const boss = { active:false, x:5915, y:205, w:150, h:188, hp:300, water:100, phase:1, state:"idle", timer:0, attackCd:1.2, index:0, jetY:280, hitCd:0, glow:0 };

  const zones = [
    [0,"ENTRADA DO CANAL","CALMA"], [900,"CORREDOR DAS BOLHAS","↗ SUAVE"],
    [2050,"FENDA DA CORRENTEZA","→ FORTE"], [3250,"GRUTA DO MEXILHÃO","↙ REVERSA"],
    [4350,"RESERVATÓRIO pOtÁVIO","↑ PRESSÃO"], [BOSS_START,"ARENA DO GALÃO","INSTÁVEL"],
  ];
  const currents = [
    {x:980,y:105,w:620,h:300,fx:95,fy:-40}, {x:2110,y:90,w:700,h:355,fx:175,fy:5},
    {x:3350,y:125,w:610,h:315,fx:-125,fy:58}, {x:4450,y:90,w:620,h:350,fx:30,fy:-145},
  ];
  const reefs = [
    [620,58,130,215], [850,330,165,175], [1370,58,180,220], [1760,315,155,190],
    [2310,58,120,230], [2710,310,185,195], [3130,58,145,225], [3710,315,175,190],
    [4140,58,130,235], [4820,305,160,200],
  ].map(([x,y,w,h]) => ({x,y,w,h}));
  const enemySeed = [
    ["jelly",520,285], ["puffer",920,210], ["jelly",1260,350], ["eel",1670,220],
    ["puffer",2010,390], ["crab",2180,420], ["jelly",2350,310], ["eel",2740,165],
    ["puffer",3100,285], ["jelly",3450,405], ["crab",3580,430], ["eel",3820,250],
    ["puffer",4200,150], ["jelly",4530,330], ["eel",4880,235], ["puffer",5190,400], ["jelly",5370,170],
  ];
  const shellSeed = [[390,250],[720,300],[1090,170],[1480,320],[1880,220],[2260,390],[2640,130],[3000,290],[3340,390],[3700,175],[4050,330],[4410,220],[4760,145],[5080,310],[5360,390]];

  let enemies=[], pickups=[], marbles=[], shots=[], waves=[], particles=[], bubbles=[];

  function initAudio(){
    if(!audio){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;audio=new AC();gain=audio.createGain();gain.gain.value=.42;gain.connect(audio.destination)}
    if(audio.state==="suspended")audio.resume();
  }
  function tone(freq,dur=.07,type="square",vol=.03,delay=0){
    if(muted||!audio||!gain)return;const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(gain);o.start(t);o.stop(t+dur+.02);
  }
  function sfx(kind){
    if(kind==="shot"){tone(620,.05,"square",.03);tone(900,.05,"triangle",.018,.025)}
    if(kind==="hit")tone(92,.16,"sawtooth",.05);
    if(kind==="item"){tone(790,.07,"square",.03);tone(1185,.08,"triangle",.025,.05)}
    if(kind==="dash"){tone(190,.12,"sawtooth",.04);tone(390,.07,"square",.02,.04)}
    if(kind==="boss"){tone(82,.22,"sawtooth",.05);tone(123,.2,"square",.03,.08)}
  }
  function music(now){
    if(muted||!audio||mode!=="play"||now-beatAt<(boss.active?105:140))return;beatAt=now;
    const calm=[294,370,440,494,587,494,440,370,330,392,494,659,587,494,440,392],fight=[220,277,330,415,370,330,277,247,220,330,415,494,440,370,330,277];
    const note=(boss.active?fight:calm)[beatStep%16];tone(note,.08,boss.active?"sawtooth":"triangle",boss.active?.021:.016);if(beatStep%2===0)tone(boss.active?58:73,.13,"triangle",.018);if(boss.active&&boss.phase===3&&beatStep%2)tone(note*2,.04,"square",.008,.02);beatStep++;
  }

  function toast(text,ms=1700){ui.toast.textContent=text;ui.toast.hidden=false;toastUntil=performance.now()+ms}
  function hud(){
    ui.lifeFill.style.width=`${hero.hp}%`;ui.lifeFill.classList.toggle("low",hero.hp<=35);ui.lifeText.textContent=`${hero.hp} / 100`;
    ui.shells.textContent=String(shells).padStart(3,"0");ui.bossFill.style.width=`${clamp(boss.hp/POTAVIO_MAX_HEALTH*100,0,100)}%`;ui.bossPhase.textContent=`NÍVEL ${boss.phase}`;ui.waterFill.style.width=`${boss.water}%`;ui.waterText.textContent=`${Math.round(boss.water)}%`;
  }
  function burst(x,y,color,n=8,speed=100){for(let i=0;i<n;i++){const a=Math.PI*2*i/n+Math.random()*.35,f=speed*(.5+Math.random()*.55);particles.push({x,y,vx:Math.cos(a)*f,vy:Math.sin(a)*f,life:.45+Math.random()*.25,color,size:2+Math.random()*3})}}
  function currentAt(body){const x=body.x+body.w/2,y=body.y+body.h/2;return currents.find(c=>x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h)||null}
  function updateZone(force=false){let z=0;for(let i=0;i<zones.length;i++)if(hero.x>=zones[i][0])z=i;if(!force&&z===zoneId)return;zoneId=z;ui.zone.textContent=zones[z][1];ui.current.textContent=zones[z][2];if(!force)toast(zones[z][1])}

  function reset(){
    Object.assign(hero,{x:105,y:105,vx:0,vy:70,face:1,hp:100,inv:0,shotCd:0,dashCd:0,dashTime:0,shootAnim:0});
    Object.assign(boss,{active:false,x:5915,y:205,hp:300,water:100,phase:1,state:"idle",timer:0,attackCd:1.2,index:0,jetY:280,hitCd:0,glow:0});
    enemies=enemySeed.map(([type,x,y],i)=>({type,x,baseX:x,y,baseY:y,w:type==="jelly"?48:type==="puffer"?45:type==="crab"?58:62,h:type==="jelly"?48:type==="puffer"?40:type==="crab"?34:28,alive:true,phase:i*.83,dir:i%2?-1:1}));
    pickups=shellSeed.map(([x,y])=>({x,y,t:x*.01,taken:false}));marbles=[];shots=[];waves=[];particles=[];
    bubbles=Array.from({length:34},(_,i)=>({x:Math.random()*WORLD_END,y:WATER_TOP+Math.random()*430,r:1+i%4,s:14+i%6*5,p:Math.random()*6}));
    camera=0;shells=0;clock=0;shake=0;flash=0;zoneId=-1;transformTimer=2.4;transformed=false;ui.bossHud.hidden=true;ui.win.hidden=true;ui.gameOver.hidden=true;hud();updateZone(true);
  }
  function start(){initAudio();reset();mode="play";ui.intro.hidden=true;last=performance.now();toast("MERGULHO INICIADO — A FÍSICA AGORA É AQUÁTICA",2400)}
  function lose(){if(mode!=="play")return;mode="gameover";Object.keys(keys).forEach(k=>keys[k]=false);ui.gameOver.hidden=false;sfx("hit")}
  function win(){mode="win";Object.keys(keys).forEach(k=>keys[k]=false);ui.bossHud.hidden=true;ui.win.hidden=false;tone(523,.16,"triangle",.035);tone(659,.18,"triangle",.035,.11);tone(784,.24,"triangle",.04,.23)}
  function damage(n,sourceX){if(hero.inv>0||mode!=="play")return;hero.hp=clamp(hero.hp-n,0,100);hero.inv=.95;hero.vx+=sourceX<hero.x?175:-175;hero.vy-=65;shake=7;flash=.14;burst(hero.x+27,hero.y+34,"#ff7180",12,145);sfx("hit");hud();if(hero.hp<=0)lose()}

  function fire(){
    if(mode!=="play"||!transformed||hero.shotCd>0||marbles.length>=8)return;hero.shotCd=.27;hero.shootAnim=.18;const d=hero.face;
    marbles.push({x:hero.x+27+d*22,y:hero.y+28,w:11,h:11,vx:d*420+hero.vx*.2,vy:clamp(hero.vy*.17+(keys.swim?-45:0),-90,80),life:1.8});burst(hero.x+27+d*24,hero.y+34,"#c5f8ff",5,70);sfx("shot");
  }
  function dash(){if(mode!=="play"||!transformed||hero.dashCd>0)return;hero.dashCd=1.25;hero.dashTime=.22;hero.vx=hero.face*520;hero.vy*=.45;hero.inv=Math.max(hero.inv,.18);burst(hero.x+27-hero.face*20,hero.y+35,"#69d9f2",12,150);sfx("dash")}

  function updateHero(dt){
    hero.inv=Math.max(0,hero.inv-dt);hero.shotCd=Math.max(0,hero.shotCd-dt);hero.dashCd=Math.max(0,hero.dashCd-dt);hero.dashTime=Math.max(0,hero.dashTime-dt);hero.shootAnim=Math.max(0,hero.shootAnim-dt);
    if(!transformed){transformTimer-=dt;hero.vy+=40*dt;hero.y=Math.min(255,hero.y+hero.vy*dt);hero.x+=25*dt;if(transformTimer<=0){transformed=true;hero.y=248;hero.vy=0;burst(hero.x+27,hero.y+34,"#80ecff",28,210);toast("TRANSFORMAÇÃO: SHALL MEXILHÃOZINHO! SEGURE NADAR PARA SUBIR",3200);tone(659,.16,"square",.035);tone(988,.2,"triangle",.03,.1)}return}
    const ox=hero.x,oy=hero.y,a=hero.dashTime>0?0:610;if(keys.left){hero.vx-=a*dt;hero.face=-1}if(keys.right){hero.vx+=a*dt;hero.face=1}if(keys.swim)hero.vy-=610*dt;else hero.vy+=76*dt;
    const c=currentAt(hero);if(c){hero.vx+=c.fx*dt;hero.vy+=c.fy*dt}hero.vx*=Math.pow(hero.dashTime>0?.62:.17,dt);hero.vy*=Math.pow(.28,dt);hero.vx=clamp(hero.vx,-290,hero.dashTime>0?540:290);hero.vy=clamp(hero.vy,-275,205);hero.x+=hero.vx*dt;hero.y+=hero.vy*dt;
    const minX=boss.active?ARENA_LEFT+18:0,maxX=boss.active?boss.x-hero.w-24:WORLD_END-hero.w-12;hero.x=clamp(hero.x,minX,maxX);if(hero.y<WATER_TOP){hero.y=WATER_TOP;hero.vy=35}if(hero.y+hero.h>WATER_BOTTOM){hero.y=WATER_BOTTOM-hero.h;hero.vy=-30}
    if(!boss.active)for(const r of reefs)if(hit(hero,r)){hero.x=ox;hero.y=oy;hero.vx*=-.2;hero.vy*=-.2;break}
    if(keys.shoot)fire();if(keys.dash)dash();
  }

  function updateEnemies(dt){
    for(const e of enemies){if(!e.alive)continue;
      if(e.type==="jelly")e.y=e.baseY+Math.sin(clock*2.8+e.phase)*70;
      else if(e.type==="puffer"){const d=Math.abs(hero.x-e.x)<260?Math.sign(hero.x-e.x):e.dir;e.x+=d*54*dt;e.y=e.baseY+Math.sin(clock*3.8+e.phase)*32}
      else if(e.type==="crab"){e.x+=e.dir*46*dt;e.y=e.baseY+Math.sin(clock*2.4+e.phase)*4;if(Math.abs(e.x-e.baseX)>90)e.dir*=-1}
      else{e.x+=e.dir*82*dt;e.y=e.baseY+Math.sin(clock*4.4+e.phase)*24;if(Math.abs(e.x-e.baseX)>120)e.dir*=-1}
      if(hit(hero,e))damage(e.type==="eel"?18:e.type==="crab"?16:14,e.x);
    }
  }
  function updatePickups(){for(const p of pickups){if(p.taken)continue;const dx=hero.x+27-p.x,dy=hero.y+34-p.y;if(Math.hypot(dx,dy)<34){p.taken=true;shells++;if(shells%5===0)hero.hp=clamp(hero.hp+12,0,100);burst(p.x,p.y,"#ffe88a",10,110);sfx("item");hud();toast(shells%5===0?"5 CONCHAS — +12 DE ENERGIA":`CONCHA ${shells}`,900)}}}

  function waterShot(fast=false,offset=0){const x=boss.x+6,y=boss.y+92+offset,tx=hero.x+27,ty=hero.y+34,dx=tx-x,dy=ty-y,len=Math.max(1,Math.hypot(dx,dy)),speed=fast?400:325;shots.push({x,y,w:fast?27:20,h:fast?14:18,vx:dx/len*speed,vy:dy/len*speed,life:4,dmg:fast?18:14,p:Math.random()*6});boss.water=Math.max(0,boss.water-(fast?2.8:1.8))}
  function fan(){[-95,0,95].forEach((vy,i)=>shots.push({x:boss.x+5,y:boss.y+90,w:24,h:16,vx:-(335+i*20),vy,life:4,dmg:15+boss.phase,p:i}));boss.water=Math.max(0,boss.water-5.4)}
  function bossState(state){boss.state=state;boss.timer=0;if(state==="jet_charge"){boss.jetY=clamp(hero.y+34,WATER_TOP+38,WATER_BOTTOM-38);toast("JATO PRESSURIZADO — MUDE DE ALTURA!",1600);tone(110,.24,"sawtooth",.035)}if(state==="jet"){boss.water=Math.max(0,boss.water-14);shake=6}if(state==="sneeze_charge"){toast("ESPIRO D'ÁGUA! PROCURE O VÃO DA ONDA!",1800);tone(82,.3,"sawtooth",.04)}if(state==="sneeze"){const gap=145+(boss.index%3)*105;waves.push({x:boss.x-10,y:WATER_TOP+8,w:82,h:WATER_BOTTOM-WATER_TOP-16,vx:-240,life:4.5,gap,gapH:92});boss.water=Math.max(0,boss.water-9);shake=9;boss.index++}}
  function activateBoss(){if(boss.active)return;boss.active=true;boss.state="intro";boss.timer=0;boss.attackCd=1.1;ui.bossHud.hidden=false;shots=[];enemies.forEach(e=>{if(e.x>ARENA_LEFT-100)e.alive=false});toast("CHEFÃO DA FASE 4 — ÁGUA pOtÁVIO",2600);sfx("boss");hud()}
  function bossPhase(){return boss.water<=27||boss.hp<=95?3:boss.water<=62||boss.hp<=200?2:1}
  function updateBoss(dt){
    if(!boss.active){if(hero.x>BOSS_START)activateBoss();return}boss.timer+=dt;boss.hitCd=Math.max(0,boss.hitCd-dt);boss.glow=Math.max(0,boss.glow-dt);boss.water=Math.max(0,boss.water-dt*(boss.phase===3?.22:.08));
    const p=bossPhase();if(p>boss.phase){boss.phase=p;boss.glow=1.4;shake=8;toast(p===2?"O GALÃO ESTÁ BAIXANDO — PRESSÃO NÍVEL 2!":"GALÃO QUASE SECO — A BARRIGA ESTÁ MURCHANDO!",2500);sfx("boss")}
    if(boss.state==="intro"){boss.y=205+Math.sin(boss.timer*2.4)*6;if(boss.timer>1.8)bossState("combat");hud();return}
    if(boss.state==="jet_charge"){if(boss.timer>.72)bossState("jet");return}
    if(boss.state==="jet"){const beam={x:ARENA_LEFT,y:boss.jetY-34,w:boss.x-ARENA_LEFT+22,h:68};if(hit(hero,beam)&&boss.hitCd<=0){boss.hitCd=.42;damage(16+boss.phase*2,boss.x);hero.vx-=160}if(boss.timer>1.3)bossState("combat");return}
    if(boss.state==="sneeze_charge"){if(boss.timer>.72)bossState("sneeze");return}
    if(boss.state==="sneeze"){if(boss.timer>.42)bossState("combat");return}
    if(boss.state==="dead"){boss.x+=80*dt;boss.y+=Math.sin(boss.timer*20)*2;if(boss.timer>1.7)win();return}
    boss.y=205+Math.sin(clock*(1.8+boss.phase*.25))*(24+boss.phase*6);boss.attackCd-=dt;if(boss.attackCd<=0){if(boss.phase===1){boss.index%3===2?fan():waterShot(false,boss.index%2?18:-14);boss.attackCd=.74;boss.index++}else if(boss.phase===2){boss.index%3===1?bossState("jet_charge"):waterShot(true);boss.attackCd=boss.state==="combat"?.78:1.4;boss.index++}else{if(boss.index%3===0)bossState("sneeze_charge");else if(boss.index%3===1)bossState("jet_charge");else fan();boss.attackCd=.82;boss.index++}}hud();
  }

  function updateProjectiles(dt){
    for(const m of marbles){m.x+=m.vx*dt;m.y+=m.vy*dt;m.vx*=Math.pow(.985,dt*60);m.life-=dt;for(const e of enemies)if(e.alive&&hit(m,e)){e.alive=false;m.life=0;burst(e.x+e.w/2,e.y+e.h/2,"#9eeeff",10,125);break}if(m.life>0&&boss.active&&!['intro','dead'].includes(boss.state)&&hit(m,boss)){const d=boss.phase===1?5:boss.phase===2?9:15;boss.hp=clamp(boss.hp-d,0,300);boss.water=Math.max(0,boss.water-(boss.phase===3?.7:.35));boss.glow=.22;m.life=0;burst(m.x,m.y,"#fff0a2",12,160);tone(740,.06,"square",.035);shake=4;hud();if(boss.hp<=0){boss.state="dead";boss.timer=0;boss.water=0;shots=[];waves=[];toast("GALÃO SECO! ÁGUA pOtÁVIO PERDEU A PRESSÃO!",3000);sfx("boss")}}}
    marbles=marbles.filter(m=>m.life>0&&m.x>camera-80&&m.x<WORLD_END+80&&m.y>0&&m.y<H+20);
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt+Math.sin(clock*7+s.p)*8*dt;s.life-=dt;if(hit(hero,s)){damage(s.dmg,s.x);s.life=0}}shots=shots.filter(s=>s.life>0&&s.x>ARENA_LEFT-100&&s.y>20&&s.y<540);
    for(const w of waves){w.x+=w.vx*dt;w.life-=dt;const top={x:w.x,y:w.y,w:w.w,h:Math.max(0,w.gap-w.gapH/2-w.y)},by=w.gap+w.gapH/2,bottom={x:w.x,y:by,w:w.w,h:Math.max(0,WATER_BOTTOM-by)};if(hit(hero,top)||hit(hero,bottom)){damage(22,w.x);w.life=0}}waves=waves.filter(w=>w.life>0&&w.x>ARENA_LEFT-100);
  }
  function updateFx(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.5,dt);p.vy-=20*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const b of bubbles){b.y-=b.s*dt;b.x+=Math.sin(clock*1.4+b.p)*8*dt;if(b.y<WATER_TOP-10)b.y=WATER_BOTTOM+Math.random()*40}shake=Math.max(0,shake-dt*17);flash=Math.max(0,flash-dt*1.5)}
  function update(dt){if(mode!=="play")return;clock+=dt;updateHero(dt);if(transformed){updateEnemies(dt);updatePickups();updateProjectiles(dt);updateBoss(dt);updateZone()}updateFx(dt);const target=boss.active?ARENA_LEFT:hero.x-W*.3;camera+=(clamp(target,0,WORLD_END-W)-camera)*Math.min(1,dt*4.5)}

  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function drawTiledLayer(regionName, factor, y, drawH, alpha=1){
    if(!artReady||!atlas)return false;const source=ATLAS[regionName],ratio=source[2]/source[3],drawW=Math.max(W,Math.round(drawH*ratio)),offset=-((camera*factor)%drawW);
    ctx.save();ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=false;for(let x=offset-drawW;x<W+drawW;x+=drawW)ctx.drawImage(atlas,source[0],source[1],source[2],source[3],Math.round(x),Math.round(y),drawW,Math.round(drawH));ctx.restore();return true;
  }
  function backdrop(t){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#087ba1");g.addColorStop(.32,"#075a85");g.addColorStop(.75,"#073457");g.addColorStop(1,"#051d37");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    drawTiledLayer("far",.08,150,176,.58);
    ctx.globalAlpha=.16;ctx.strokeStyle="#d9fbff";ctx.lineWidth=3;for(let i=0;i<7;i++){const x=((i*94-camera*.06+t*.012)%(W+110))-55;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+75,215);ctx.stroke()}ctx.globalAlpha=1;
    drawTiledLayer("mid",.32,286,176,.68);
    rect(0,0,W,WATER_TOP,"rgba(4,31,57,.82)");rect(0,WATER_BOTTOM,W,H-WATER_BOTTOM,"rgba(4,24,43,.88)");
    for(const b of bubbles){const x=b.x-camera*.72;if(x<-10||x>W+10)continue;ctx.globalAlpha=.2+b.r*.055;ctx.strokeStyle="#c8f9ff";ctx.beginPath();ctx.arc(x,b.y,b.r+2,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
  }
  function drawCurrents(t){ctx.save();ctx.globalAlpha=.19;ctx.strokeStyle="#9ceef7";ctx.lineWidth=2;for(const c of currents){if(c.x+c.w<camera||c.x>camera+W)continue;for(let i=0;i<6;i++){const y=c.y+28+i*(c.h-50)/5,shift=(t*.04*Math.sign(c.fx||1)+i*61)%120,start=c.x+shift;ctx.beginPath();ctx.moveTo(start,y);ctx.quadraticCurveTo(start+Math.sign(c.fx)*36,y+Math.sin(t*.004+i)*12,start+Math.sign(c.fx)*70,y+c.fy*.08);ctx.stroke()}}ctx.restore()}

  function tileAt(source,x,y,w=32,h=32){return drawAsset("tiles",source,x,y,w,h,false,1)}
  function reefFallback(r){rect(r.x,r.y,r.w,r.h,"#174e58");rect(r.x+6,r.y,r.w-12,r.h,"#123e50")}
  function reef(r){
    if(!artReady){reefFallback(r);return}
    const size=32,bottom=r.y>200;ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
    for(let y=r.y;y<r.y+r.h;y+=size){for(let x=r.x;x<r.x+r.w;x+=size){let source=TILE.reefMiddle;if(bottom&&y===r.y)source=TILE.reefTop;if(!bottom&&y+size>=r.y+r.h)source=TILE.reefBottom;if((Math.floor((x-r.x)/size)+Math.floor((y-r.y)/size))%5===4)source=TILE.caveWall;tileAt(source,x,y,size,size)}}
    ctx.restore();
    ctx.save();ctx.strokeStyle="rgba(142,229,238,.36)";ctx.lineWidth=2;ctx.strokeRect(Math.round(r.x)+1,Math.round(r.y)+1,Math.round(r.w)-2,Math.round(r.h)-2);ctx.restore();
  }
  function shell(p,t){if(p.taken)return;const s=1+Math.sin(t*.006+p.t)*.08;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);ctx.fillStyle="#ffe087";ctx.beginPath();ctx.arc(0,2,12,Math.PI,Math.PI*2);ctx.lineTo(12,9);ctx.lineTo(-12,9);ctx.closePath();ctx.fill();ctx.strokeStyle="#c78b54";ctx.lineWidth=2;[-7,0,7].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x*.7,9);ctx.stroke()});ctx.restore()}

  function enemyFallback(e,t){ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);ctx.fillStyle=e.type==="jelly"?"#c785d9":e.type==="puffer"?"#d8b84a":e.type==="crab"?"#d76049":"#2e9e87";ctx.beginPath();ctx.ellipse(0,0,e.w*.42,e.h*.42,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  function enemy(e,t){
    if(!e.alive)return;const frames=ENEMY[e.type];if(!frames||!artReady){enemyFallback(e,t);return}const frame=frames[Math.floor((t*.007+e.phase)%frames.length)];
    const scale=e.type==="eel"?1.18:e.type==="crab"?1.1:1.05,dw=Math.round(e.w*scale),dh=Math.round(e.h*scale);drawAsset("enemies",frame,e.x+(e.w-dw)/2,e.y+(e.h-dh)/2,dw,dh,e.dir<0,.98);
  }

  function normalShallFallback(){rect(hero.x+8,hero.y+7,38,57,"#171a22");rect(hero.x+12,hero.y-2,30,26,"#d69a75")}
  function mexilhaoFallback(){ctx.save();ctx.translate(hero.x+27,hero.y+34);ctx.scale(hero.face<0?-1:1,1);rect(-21,-6,42,34,"#dd2e31");rect(-18,21,36,15,"#151a25");ctx.fillStyle="#e99a64";ctx.beginPath();ctx.ellipse(0,-27,26,25,0,0,Math.PI*2);ctx.fill();rect(-19,-55,38,10,"#f7f2d9");ctx.restore()}
  function heroFrame(){
    if(!transformed)return HERO.transform;
    if(hero.inv>0&&hero.inv>.55)return HERO.hurt;
    if(hero.dashTime>0)return HERO.dash;
    if(hero.shootAnim>0)return HERO.shoot;
    if(keys.swim&&hero.vy<-65)return Math.floor(clock*7)%2?HERO.upA:HERO.upB;
    if(Math.abs(hero.vx)>45)return [HERO.swimA,HERO.swimB,HERO.swimC,HERO.swimD][Math.floor(clock*8)%4];
    return Math.floor(clock*3)%2?HERO.idleA:HERO.idleB;
  }
  function mexilhao(t){
    if(!transformed){if(artReady){const source=HERO.transform,phase=clamp(1-transformTimer/2.4,0,1),dw=70+Math.round(phase*10),dh=90+Math.round(phase*8);drawAsset("hero",source,hero.x+27-dw/2,hero.y+34-dh/2,dw,dh,hero.face<0,.45+.45*phase)}else normalShallFallback();return}
    if(!artReady){mexilhaoFallback();return}
    const source=heroFrame(),dw=78,dh=88,alpha=hero.inv>0&&Math.floor(hero.inv*18)%2===0?.35:1;drawAsset("hero",source,hero.x+27-dw/2,hero.y+34-dh/2,dw,dh,hero.face<0,alpha);
  }

  function potavioFallback(t){if(!boss.active)return;ctx.save();ctx.translate(boss.x+75,boss.y+94);const dry=clamp(1-boss.water/100,0,1),belly=1-dry*.48;rect(-42,-5,84,63,"#6f329a");ctx.save();ctx.scale(belly,1);ctx.fillStyle="#53b9dc";ctx.beginPath();ctx.ellipse(0,25,43,37,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.strokeStyle="#77dcff";ctx.lineWidth=6;ctx.strokeRect(-39,-91,78,76);ctx.restore()}
  function potavioFrame(){
    if(boss.state==="dead")return POTAVIO.defeat;if(boss.glow>0&&boss.glow<.4)return POTAVIO.hurt;if(boss.state==="jet"||boss.state==="jet_charge")return POTAVIO.jet;if(boss.state==="sneeze"||boss.state==="sneeze_charge")return POTAVIO.sneeze;if(boss.water<=27)return POTAVIO.drainB;if(boss.water<=62)return POTAVIO.drainA;if(boss.index%4===3)return POTAVIO.aim;return Math.floor(clock*3)%2?POTAVIO.idleA:POTAVIO.idleB;
  }
  function potavio(t){if(!boss.active)return;if(!artReady){potavioFallback(t);return}const source=potavioFrame(),dry=clamp(1-boss.water/100,0,1),dw=Math.round(172-dry*18),dh=Math.round(194-dry*20);drawAsset("potavio",source,boss.x+75-dw/2,boss.y+94-dh/2,dw,dh,false,boss.state==="dead"?.9:1)}

  function projectiles(t){
    for(const m of marbles){if(!drawAsset("vfx",VFX.bubble,m.x-5,m.y-5,22,18,false,.95)){ctx.fillStyle="#c6f8ff";ctx.beginPath();ctx.arc(m.x+5,m.y+5,5.5,0,Math.PI*2);ctx.fill()}}
    for(const s of shots){ctx.save();ctx.translate(s.x+s.w/2,s.y+s.h/2);ctx.rotate(Math.atan2(s.vy,s.vx));if(!drawAsset("vfx",VFX.spray,-s.w*.75,-s.h*.75,s.w*1.5,s.h*1.5,false,.95)){ctx.fillStyle="#8eeaff";ctx.beginPath();ctx.ellipse(0,0,s.w/2,s.h/2,0,0,Math.PI*2);ctx.fill()}ctx.restore()}
    for(const w of waves){const top=w.gap-w.gapH/2,bottom=w.gap+w.gapH/2;ctx.save();ctx.globalAlpha=.82;if(artReady){for(let y=w.y;y<top;y+=48)drawAsset("vfx",VFX.wave,w.x,y,w.w,48,false,.8);for(let y=bottom;y<WATER_BOTTOM;y+=48)drawAsset("vfx",VFX.wave,w.x,y,w.w,48,false,.8)}else{rect(w.x,w.y,w.w,Math.max(0,top-w.y),"#55cce9");rect(w.x,bottom,w.w,Math.max(0,WATER_BOTTOM-bottom),"#55cce9")}ctx.restore()}
    if(boss.active&&boss.state==="jet_charge"){ctx.save();ctx.setLineDash([10,8]);ctx.strokeStyle="#fff091";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ARENA_LEFT,boss.jetY);ctx.lineTo(boss.x,boss.jetY);ctx.stroke();ctx.restore()}
    if(boss.active&&boss.state==="jet"){const width=boss.x-ARENA_LEFT+30;if(artReady){for(let x=ARENA_LEFT;x<boss.x;x+=120)drawAsset("vfx",VFX.jet,x,boss.jetY-30,128,60,false,.88)}else{ctx.globalAlpha=.82;rect(ARENA_LEFT,boss.jetY-26,width,52,"#5cd9f5");rect(ARENA_LEFT,boss.jetY-8,width,16,"#d9fbff");ctx.globalAlpha=1}}
  }
  function fx(){for(const p of particles){ctx.globalAlpha=clamp(p.life/.7,0,1);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1}
  function transformText(){if(transformed||mode!=="play")return;ctx.fillStyle="#fff3a3";ctx.font="bold 13px monospace";ctx.textAlign="center";ctx.fillText(transformTimer>1.2?"A ÁGUA ESTÁ MUDANDO O SHALL...":"MEXILHÃOZINHO!",hero.x+27,hero.y-24)}
  function foreground(){drawTiledLayer("fore",1.14,376,150,.42)}

  function draw(t){
    ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;backdrop(t);
    ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);ctx.translate(-camera,0);drawCurrents(t);reefs.forEach(reef);pickups.forEach(p=>shell(p,t));enemies.forEach(e=>enemy(e,t));potavio(t);projectiles(t);mexilhao(t);transformText();fx();ctx.restore();
    foreground();
    if(flash){ctx.globalAlpha=clamp(flash*2.2,0,.35);ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
    const v=ctx.createRadialGradient(W/2,H*.48,100,W/2,H*.48,360);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(1,8,22,.34)");ctx.fillStyle=v;ctx.fillRect(0,0,W,H);
  }

  function loop(now){const dt=clamp((now-last)/1000,0,.033);last=now;update(dt);draw(now);music(now);if(!ui.toast.hidden&&now>toastUntil)ui.toast.hidden=true;requestAnimationFrame(loop)}
  function release(id){const b=pointers.get(id);if(!b)return;pointers.delete(id);if(![...pointers.values()].some(x=>x.name===b.name))keys[b.name]=false;b.button.classList.toggle("active",keys[b.name])}
  document.querySelectorAll("[data-stage4-control]").forEach(button=>{const name=button.dataset.stage4Control;button.addEventListener("pointerdown",e=>{e.preventDefault();initAudio();button.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{name,button});keys[name]=true;button.classList.add("active");if(name==="shoot")fire();if(name==="dash")dash();navigator.vibrate?.(name==="dash"?[12,20,12]:7)},{passive:false});button.addEventListener("pointerup",e=>release(e.pointerId));button.addEventListener("pointercancel",e=>release(e.pointerId));button.addEventListener("lostpointercapture",e=>release(e.pointerId))});
  const map={arrowleft:"left",a:"left",arrowright:"right",d:"right",arrowup:"swim",w:"swim"," ":"swim",x:"shoot",k:"shoot",c:"dash",e:"dash"};window.addEventListener("keydown",e=>{const a=map[e.key.toLowerCase()];if(!a)return;e.preventDefault();keys[a]=true;initAudio();if(!e.repeat&&a==="shoot")fire();if(!e.repeat&&a==="dash")dash()},{passive:false});window.addEventListener("keyup",e=>{const a=map[e.key.toLowerCase()];if(a)keys[a]=false});window.addEventListener("blur",()=>{pointers.clear();Object.keys(keys).forEach(k=>keys[k]=false)});
  ui.start.addEventListener("click",start);ui.retry.addEventListener("click",start);ui.replay.addEventListener("click",start);ui.sound.classList.toggle("muted",muted);ui.sound.addEventListener("click",()=>{muted=!muted;localStorage.setItem("shall-muted",String(muted));ui.sound.classList.toggle("muted",muted);if(!muted){initAudio();sfx("item")}});
  if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});

  function qa(){if(location.hostname!=="terminal.local")return;const q=new URLSearchParams(location.search).get("qa");if(!q)return;start();transformTimer=0;transformed=true;hero.inv=999;if(q==="aquatic"){hero.x=2150;hero.y=220;camera=1980}if(q==="mexilhao"){hero.x=1450;hero.y=220;camera=1280}if(q.startsWith("potavio")){hero.x=5720;hero.y=250;camera=ARENA_LEFT;activateBoss();boss.state="combat";if(q==="potavio-jet"){boss.phase=2;boss.water=52;bossState("jet");boss.jetY=280}if(q==="potavio-dry"){boss.phase=3;boss.water=12;boss.hp=78}if(q==="potavio-wave"){boss.phase=3;boss.water=22;bossState("sneeze")}hud()}}
  window.__shallStage4Debug=()=>({mode,hero:{x:Math.round(hero.x),y:Math.round(hero.y),vx:Math.round(hero.vx),vy:Math.round(hero.vy),health:hero.hp},transformDone:transformed,shells,current:currentAt(hero),boss:{active:boss.active,health:boss.hp,water:Number(boss.water.toFixed(1)),phase:boss.phase,state:boss.state},marbles:marbles.length,waterShots:shots.length,waves:waves.length,art:{ready:artReady,error:artError,atlas:atlas?`${atlas.naturalWidth}x${atlas.naturalHeight}`:null}});

  reset();qa();draw(performance.now());requestAnimationFrame(loop);
})();
