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

  const keys = { left: false, right: false, swim: false, shoot: false, dash: false };
  const pointers = new Map();
  let mode = "intro", last = performance.now(), clock = 0, camera = 0, shells = 0;
  let transformTimer = 0, transformed = false, shake = 0, flash = 0, toastUntil = 0, zoneId = -1;
  let muted = localStorage.getItem("shall-muted") === "true", audio = null, gain = null, beatAt = 0, beatStep = 0;

  const hero = { x: 105, y: 105, w: 54, h: 68, vx: 0, vy: 70, face: 1, hp: 100, inv: 0, shotCd: 0, dashCd: 0, dashTime: 0 };
  const boss = { active: false, x: 5915, y: 205, w: 150, h: 188, hp: 300, water: 100, phase: 1, state: "idle", timer: 0, attackCd: 1.2, index: 0, jetY: 280, hitCd: 0, glow: 0 };

  const zones = [
    [0, "ENTRADA DO CANAL", "CALMA"], [900, "CORREDOR DAS BOLHAS", "↗ SUAVE"],
    [2050, "FENDA DA CORRENTEZA", "→ FORTE"], [3250, "GRUTA DO MEXILHÃO", "↙ REVERSA"],
    [4350, "RESERVATÓRIO pOtÁVIO", "↑ PRESSÃO"], [BOSS_START, "ARENA DO GALÃO", "INSTÁVEL"],
  ];
  const currents = [
    { x: 980, y: 105, w: 620, h: 300, fx: 95, fy: -40 },
    { x: 2110, y: 90, w: 700, h: 355, fx: 175, fy: 5 },
    { x: 3350, y: 125, w: 610, h: 315, fx: -125, fy: 58 },
    { x: 4450, y: 90, w: 620, h: 350, fx: 30, fy: -145 },
  ];
  const reefs = [
    [620, 58, 130, 150], [850, 390, 165, 115], [1370, 58, 180, 135], [1760, 345, 155, 160],
    [2310, 58, 120, 180], [2710, 355, 185, 150], [3130, 58, 145, 145], [3710, 365, 175, 140],
    [4140, 58, 130, 185], [4820, 350, 160, 155],
  ].map(([x, y, w, h]) => ({ x, y, w, h }));
  const enemySeed = [
    ["jelly", 520, 285], ["puffer", 920, 210], ["jelly", 1260, 350], ["eel", 1670, 220],
    ["puffer", 2010, 390], ["jelly", 2350, 310], ["eel", 2740, 165], ["puffer", 3100, 285],
    ["jelly", 3450, 405], ["eel", 3820, 250], ["puffer", 4200, 150], ["jelly", 4530, 330],
    ["eel", 4880, 235], ["puffer", 5190, 400], ["jelly", 5370, 170],
  ];
  const shellSeed = [[390,250],[720,300],[1090,170],[1480,320],[1880,220],[2260,390],[2640,130],[3000,290],[3340,390],[3700,175],[4050,330],[4410,220],[4760,145],[5080,310],[5360,390]];

  let enemies = [], pickups = [], marbles = [], shots = [], waves = [], particles = [], bubbles = [];

  function initAudio() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio = new AC(); gain = audio.createGain(); gain.gain.value = .42; gain.connect(audio.destination);
    }
    if (audio.state === "suspended") audio.resume();
  }
  function tone(freq, dur = .07, type = "square", vol = .03, delay = 0) {
    if (muted || !audio || !gain) return;
    const t = audio.currentTime + delay, o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(gain); o.start(t); o.stop(t + dur + .02);
  }
  function sfx(kind) {
    if (kind === "shot") { tone(620,.05,"square",.03); tone(900,.05,"triangle",.018,.025); }
    if (kind === "hit") tone(92,.16,"sawtooth",.05);
    if (kind === "item") { tone(790,.07,"square",.03); tone(1185,.08,"triangle",.025,.05); }
    if (kind === "dash") { tone(190,.12,"sawtooth",.04); tone(390,.07,"square",.02,.04); }
    if (kind === "boss") { tone(82,.22,"sawtooth",.05); tone(123,.2,"square",.03,.08); }
  }
  function music(now) {
    if (muted || !audio || mode !== "play" || now - beatAt < (boss.active ? 105 : 140)) return;
    beatAt = now;
    const calm = [294,370,440,494,587,494,440,370,330,392,494,659,587,494,440,392];
    const fight = [220,277,330,415,370,330,277,247,220,330,415,494,440,370,330,277];
    const note = (boss.active ? fight : calm)[beatStep % 16];
    tone(note,.08,boss.active?"sawtooth":"triangle",boss.active?.021:.016);
    if (beatStep % 2 === 0) tone(boss.active ? 58 : 73,.13,"triangle",.018);
    if (boss.active && boss.phase === 3 && beatStep % 2) tone(note*2,.04,"square",.008,.02);
    beatStep += 1;
  }

  function toast(text, ms = 1700) { ui.toast.textContent = text; ui.toast.hidden = false; toastUntil = performance.now() + ms; }
  function hud() {
    ui.lifeFill.style.width = `${hero.hp}%`; ui.lifeFill.classList.toggle("low", hero.hp <= 35); ui.lifeText.textContent = `${hero.hp} / 100`;
    ui.shells.textContent = String(shells).padStart(3,"0"); ui.bossFill.style.width = `${clamp(boss.hp/POTAVIO_MAX_HEALTH*100,0,100)}%`;
    ui.bossPhase.textContent = `NÍVEL ${boss.phase}`; ui.waterFill.style.width = `${boss.water}%`; ui.waterText.textContent = `${Math.round(boss.water)}%`;
  }
  function burst(x,y,color,n=8,speed=100) {
    for (let i=0;i<n;i++) { const a=Math.PI*2*i/n+Math.random()*.35, f=speed*(.5+Math.random()*.55); particles.push({x,y,vx:Math.cos(a)*f,vy:Math.sin(a)*f,life:.45+Math.random()*.25,color,size:2+Math.random()*3}); }
  }
  function currentAt(body) {
    const x=body.x+body.w/2,y=body.y+body.h/2; return currents.find(c=>x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h)||null;
  }
  function updateZone(force=false) {
    let z=0; for(let i=0;i<zones.length;i++) if(hero.x>=zones[i][0]) z=i;
    if(!force&&z===zoneId)return; zoneId=z; ui.zone.textContent=zones[z][1]; ui.current.textContent=zones[z][2]; if(!force)toast(zones[z][1]);
  }

  function reset() {
    Object.assign(hero,{x:105,y:105,vx:0,vy:70,face:1,hp:100,inv:0,shotCd:0,dashCd:0,dashTime:0});
    Object.assign(boss,{active:false,x:5915,y:205,hp:300,water:100,phase:1,state:"idle",timer:0,attackCd:1.2,index:0,jetY:280,hitCd:0,glow:0});
    enemies=enemySeed.map(([type,x,y],i)=>({type,x,baseX:x,y,baseY:y,w:type==="jelly"?48:type==="puffer"?45:62,h:type==="jelly"?48:type==="puffer"?40:28,alive:true,phase:i*.83,dir:i%2?-1:1}));
    pickups=shellSeed.map(([x,y])=>({x,y,t:x*.01,taken:false})); marbles=[];shots=[];waves=[];particles=[];
    bubbles=Array.from({length:34},(_,i)=>({x:Math.random()*WORLD_END,y:WATER_TOP+Math.random()*430,r:1+i%4,s:14+i%6*5,p:Math.random()*6}));
    camera=0;shells=0;clock=0;shake=0;flash=0;zoneId=-1;transformTimer=2.4;transformed=false;ui.bossHud.hidden=true;ui.win.hidden=true;ui.gameOver.hidden=true;hud();updateZone(true);
  }
  function start() { initAudio();reset();mode="play";ui.intro.hidden=true;last=performance.now();toast("MERGULHO INICIADO — A FÍSICA AGORA É AQUÁTICA",2400); }
  function lose() { if(mode!=="play")return;mode="gameover";Object.keys(keys).forEach(k=>keys[k]=false);ui.gameOver.hidden=false;sfx("hit"); }
  function win() { mode="win";Object.keys(keys).forEach(k=>keys[k]=false);ui.bossHud.hidden=true;ui.win.hidden=false;tone(523,.16,"triangle",.035);tone(659,.18,"triangle",.035,.11);tone(784,.24,"triangle",.04,.23); }
  function damage(n,sourceX) {
    if(hero.inv>0||mode!=="play")return;hero.hp=clamp(hero.hp-n,0,100);hero.inv=.95;hero.vx+=sourceX<hero.x?175:-175;hero.vy-=65;shake=7;flash=.14;burst(hero.x+27,hero.y+34,"#ff7180",12,145);sfx("hit");hud();if(hero.hp<=0)lose();
  }

  function fire() {
    if(mode!=="play"||!transformed||hero.shotCd>0||marbles.length>=8)return;hero.shotCd=.27;const d=hero.face;
    marbles.push({x:hero.x+27+d*22,y:hero.y+28,w:11,h:11,vx:d*420+hero.vx*.2,vy:clamp(hero.vy*.17+(keys.swim?-45:0),-90,80),life:1.8});burst(hero.x+27+d*24,hero.y+34,"#c5f8ff",5,70);sfx("shot");
  }
  function dash() { if(mode!=="play"||!transformed||hero.dashCd>0)return;hero.dashCd=1.25;hero.dashTime=.22;hero.vx=hero.face*520;hero.vy*=.45;hero.inv=Math.max(hero.inv,.18);burst(hero.x+27-hero.face*20,hero.y+35,"#69d9f2",12,150);sfx("dash"); }

  function updateHero(dt) {
    hero.inv=Math.max(0,hero.inv-dt);hero.shotCd=Math.max(0,hero.shotCd-dt);hero.dashCd=Math.max(0,hero.dashCd-dt);hero.dashTime=Math.max(0,hero.dashTime-dt);
    if(!transformed){transformTimer-=dt;hero.vy+=40*dt;hero.y=Math.min(255,hero.y+hero.vy*dt);hero.x+=25*dt;if(transformTimer<=0){transformed=true;hero.y=248;hero.vy=0;burst(hero.x+27,hero.y+34,"#80ecff",28,210);toast("TRANSFORMAÇÃO: SHALL MEXILHÃOZINHO! SEGURE NADAR PARA SUBIR",3200);tone(659,.16,"square",.035);tone(988,.2,"triangle",.03,.1);}return;}
    const ox=hero.x,oy=hero.y,a=hero.dashTime>0?0:610;if(keys.left){hero.vx-=a*dt;hero.face=-1}if(keys.right){hero.vx+=a*dt;hero.face=1}if(keys.swim)hero.vy-=610*dt;else hero.vy+=76*dt;
    const c=currentAt(hero);if(c){hero.vx+=c.fx*dt;hero.vy+=c.fy*dt}hero.vx*=Math.pow(hero.dashTime>0?.62:.17,dt);hero.vy*=Math.pow(.28,dt);hero.vx=clamp(hero.vx,-290,hero.dashTime>0?540:290);hero.vy=clamp(hero.vy,-275,205);hero.x+=hero.vx*dt;hero.y+=hero.vy*dt;
    const minX=boss.active?ARENA_LEFT+18:0,maxX=boss.active?boss.x-hero.w-24:WORLD_END-hero.w-12;hero.x=clamp(hero.x,minX,maxX);if(hero.y<WATER_TOP){hero.y=WATER_TOP;hero.vy=35}if(hero.y+hero.h>WATER_BOTTOM){hero.y=WATER_BOTTOM-hero.h;hero.vy=-30}
    if(!boss.active)for(const r of reefs)if(hit(hero,r)){hero.x=ox;hero.y=oy;hero.vx*=-.2;hero.vy*=-.2;damage(7,r.x+r.w/2);break}
    if(keys.shoot)fire();if(keys.dash)dash();
  }

  function updateEnemies(dt) {
    for(const e of enemies){if(!e.alive)continue;if(e.type==="jelly")e.y=e.baseY+Math.sin(clock*2.8+e.phase)*70;else if(e.type==="puffer"){const d=Math.abs(hero.x-e.x)<260?Math.sign(hero.x-e.x):e.dir;e.x+=d*54*dt;e.y=e.baseY+Math.sin(clock*3.8+e.phase)*32}else{e.x+=e.dir*82*dt;e.y=e.baseY+Math.sin(clock*4.4+e.phase)*24;if(Math.abs(e.x-e.baseX)>120)e.dir*=-1}if(hit(hero,e))damage(e.type==="eel"?18:14,e.x)}
  }
  function updatePickups() {
    for(const p of pickups){if(p.taken)continue;const dx=hero.x+27-p.x,dy=hero.y+34-p.y;if(Math.hypot(dx,dy)<34){p.taken=true;shells++;if(shells%5===0)hero.hp=clamp(hero.hp+12,0,100);burst(p.x,p.y,"#ffe88a",10,110);sfx("item");hud();toast(shells%5===0?"5 CONCHAS — +12 DE ENERGIA":`CONCHA ${shells}`,900)}}
  }

  function waterShot(fast=false,offset=0) {
    const x=boss.x+6,y=boss.y+92+offset,tx=hero.x+27,ty=hero.y+34,dx=tx-x,dy=ty-y,len=Math.max(1,Math.hypot(dx,dy)),speed=fast?400:325;
    shots.push({x,y,w:fast?27:20,h:fast?14:18,vx:dx/len*speed,vy:dy/len*speed,life:4,dmg:fast?18:14,p:Math.random()*6});boss.water=Math.max(0,boss.water-(fast?2.8:1.8));
  }
  function fan() {[-95,0,95].forEach((vy,i)=>shots.push({x:boss.x+5,y:boss.y+90,w:24,h:16,vx:-(335+i*20),vy,life:4,dmg:15+boss.phase,p:i}));boss.water=Math.max(0,boss.water-5.4);}
  function bossState(state) {
    boss.state=state;boss.timer=0;
    if(state==="jet_charge"){boss.jetY=clamp(hero.y+34,WATER_TOP+38,WATER_BOTTOM-38);toast("JATO PRESSURIZADO — MUDE DE ALTURA!",1600);tone(110,.24,"sawtooth",.035)}
    if(state==="jet"){boss.water=Math.max(0,boss.water-14);shake=6}
    if(state==="sneeze_charge"){toast("ESPIRO D'ÁGUA! PROCURE O VÃO DA ONDA!",1800);tone(82,.3,"sawtooth",.04)}
    if(state==="sneeze"){const gap=145+(boss.index%3)*105;waves.push({x:boss.x-10,y:WATER_TOP+8,w:82,h:WATER_BOTTOM-WATER_TOP-16,vx:-240,life:4.5,gap,gapH:92});boss.water=Math.max(0,boss.water-9);shake=9;boss.index++}
  }
  function activateBoss() {if(boss.active)return;boss.active=true;boss.state="intro";boss.timer=0;boss.attackCd=1.1;ui.bossHud.hidden=false;shots=[];enemies.forEach(e=>{if(e.x>ARENA_LEFT-100)e.alive=false});toast("CHEFÃO DA FASE 4 — ÁGUA pOtÁVIO",2600);sfx("boss");hud();}
  function bossPhase(){return boss.water<=27||boss.hp<=95?3:boss.water<=62||boss.hp<=200?2:1}
  function updateBoss(dt) {
    if(!boss.active){if(hero.x>BOSS_START)activateBoss();return}boss.timer+=dt;boss.hitCd=Math.max(0,boss.hitCd-dt);boss.glow=Math.max(0,boss.glow-dt);boss.water=Math.max(0,boss.water-dt*(boss.phase===3?.22:.08));
    const p=bossPhase();if(p>boss.phase){boss.phase=p;boss.glow=1.4;shake=8;toast(p===2?"O GALÃO ESTÁ BAIXANDO — PRESSÃO NÍVEL 2!":"GALÃO QUASE SECO — A BARRIGA ESTÁ MURCHANDO!",2500);sfx("boss")}
    if(boss.state==="intro"){boss.y=205+Math.sin(boss.timer*2.4)*6;if(boss.timer>1.8)bossState("combat");hud();return}
    if(boss.state==="jet_charge"){if(boss.timer>.72)bossState("jet");return}
    if(boss.state==="jet"){const beam={x:ARENA_LEFT,y:boss.jetY-34,w:boss.x-ARENA_LEFT+22,h:68};if(hit(hero,beam)&&boss.hitCd<=0){boss.hitCd=.42;damage(16+boss.phase*2,boss.x);hero.vx-=160}if(boss.timer>1.3)bossState("combat");return}
    if(boss.state==="sneeze_charge"){if(boss.timer>.72)bossState("sneeze");return}
    if(boss.state==="sneeze"){if(boss.timer>.42)bossState("combat");return}
    if(boss.state==="dead"){boss.x+=80*dt;boss.y+=Math.sin(boss.timer*20)*2;if(boss.timer>1.7)win();return}
    boss.y=205+Math.sin(clock*(1.8+boss.phase*.25))*(24+boss.phase*6);boss.attackCd-=dt;if(boss.attackCd<=0){
      if(boss.phase===1){boss.index%3===2?fan():waterShot(false,boss.index%2?18:-14);boss.attackCd=.74;boss.index++}
      else if(boss.phase===2){boss.index%3===1?bossState("jet_charge"):waterShot(true);boss.attackCd=boss.state==="combat"?.78:1.4;boss.index++}
      else{if(boss.index%3===0)bossState("sneeze_charge");else if(boss.index%3===1)bossState("jet_charge");else fan();boss.attackCd=.82;boss.index++}
    }hud();
  }

  function updateProjectiles(dt) {
    for(const m of marbles){m.x+=m.vx*dt;m.y+=m.vy*dt;m.vx*=Math.pow(.985,dt*60);m.life-=dt;for(const e of enemies)if(e.alive&&hit(m,e)){e.alive=false;m.life=0;burst(e.x+e.w/2,e.y+e.h/2,"#9eeeff",10,125);break}if(m.life>0&&boss.active&&!['intro','dead'].includes(boss.state)&&hit(m,boss)){const d=boss.phase===1?5:boss.phase===2?9:15;boss.hp=clamp(boss.hp-d,0,300);boss.water=Math.max(0,boss.water-(boss.phase===3?.7:.35));boss.glow=.22;m.life=0;burst(m.x,m.y,"#fff0a2",12,160);tone(740,.06,"square",.035);shake=4;hud();if(boss.hp<=0){boss.state="dead";boss.timer=0;boss.water=0;shots=[];waves=[];toast("GALÃO SECO! ÁGUA pOtÁVIO PERDEU A PRESSÃO!",3000);sfx("boss")}}}
    marbles=marbles.filter(m=>m.life>0&&m.x>camera-80&&m.x<WORLD_END+80&&m.y>0&&m.y<H+20);
    for(const s of shots){s.x+=s.vx*dt;s.y+=s.vy*dt+Math.sin(clock*7+s.p)*8*dt;s.life-=dt;if(hit(hero,s)){damage(s.dmg,s.x);s.life=0}}shots=shots.filter(s=>s.life>0&&s.x>ARENA_LEFT-100&&s.y>20&&s.y<540);
    for(const w of waves){w.x+=w.vx*dt;w.life-=dt;const top={x:w.x,y:w.y,w:w.w,h:Math.max(0,w.gap-w.gapH/2-w.y)},by=w.gap+w.gapH/2,bottom={x:w.x,y:by,w:w.w,h:Math.max(0,WATER_BOTTOM-by)};if(hit(hero,top)||hit(hero,bottom)){damage(22,w.x);w.life=0}}waves=waves.filter(w=>w.life>0&&w.x>ARENA_LEFT-100);
  }
  function updateFx(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.pow(.5,dt);p.vy-=20*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);for(const b of bubbles){b.y-=b.s*dt;b.x+=Math.sin(clock*1.4+b.p)*8*dt;if(b.y<WATER_TOP-10)b.y=WATER_BOTTOM+Math.random()*40}shake=Math.max(0,shake-dt*17);flash=Math.max(0,flash-dt*1.5)}

  function update(dt){if(mode!=="play")return;clock+=dt;updateHero(dt);if(transformed){updateEnemies(dt);updatePickups();updateProjectiles(dt);updateBoss(dt);updateZone()}updateFx(dt);const target=boss.active?ARENA_LEFT:hero.x-W*.3;camera+=(clamp(target,0,WORLD_END-W)-camera)*Math.min(1,dt*4.5)}

  function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
  function backdrop(t){
    const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,"#087ba1");g.addColorStop(.32,"#075a85");g.addColorStop(.75,"#073457");g.addColorStop(1,"#051d37");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=.2;ctx.strokeStyle="#d9fbff";ctx.lineWidth=3;for(let i=0;i<7;i++){const x=((i*94-camera*.06+t*.012)%(W+110))-55;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+75,215);ctx.stroke()}ctx.globalAlpha=1;rect(0,0,W,WATER_TOP,"#072847");rect(0,WATER_BOTTOM,W,H-WATER_BOTTOM,"#092035");
    for(const b of bubbles){const x=b.x-camera*.72;if(x<-10||x>W+10)continue;ctx.globalAlpha=.2+b.r*.055;ctx.strokeStyle="#c8f9ff";ctx.beginPath();ctx.arc(x,b.y,b.r+2,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
  }
  function drawCurrents(t){ctx.save();ctx.globalAlpha=.22;ctx.strokeStyle="#9ceef7";ctx.lineWidth=3;for(const c of currents){if(c.x+c.w<camera||c.x>camera+W)continue;for(let i=0;i<6;i++){const y=c.y+28+i*(c.h-50)/5,shift=(t*.04*Math.sign(c.fx||1)+i*61)%120,start=c.x+shift;ctx.beginPath();ctx.moveTo(start,y);ctx.quadraticCurveTo(start+Math.sign(c.fx)*36,y+Math.sin(t*.004+i)*12,start+Math.sign(c.fx)*70,y+c.fy*.08);ctx.stroke()}}ctx.restore()}
  function reef(r){rect(r.x,r.y,r.w,r.h,"#174e58");rect(r.x+7,r.y,r.w-14,r.h,"#123e50");const bottom=r.y>200;if(bottom)for(let i=0;i<4;i++){const x=r.x+18+i*(r.w-36)/3;rect(x,r.y-26-(i%2)*15,9,36+(i%2)*15,i%2?"#d25a75":"#d47a55")}else for(let i=0;i<4;i++){ctx.fillStyle=i%2?"#8bcf70":"#5dbb7e";ctx.beginPath();ctx.ellipse(r.x+20+i*(r.w-40)/3,r.y+r.h+15+(i%2)*8,8,20,.35,0,Math.PI*2);ctx.fill()}}
  function shell(p,t){if(p.taken)return;const s=1+Math.sin(t*.006+p.t)*.08;ctx.save();ctx.translate(p.x,p.y);ctx.scale(s,s);ctx.fillStyle="#ffe087";ctx.beginPath();ctx.arc(0,2,12,Math.PI,Math.PI*2);ctx.lineTo(12,9);ctx.lineTo(-12,9);ctx.closePath();ctx.fill();ctx.strokeStyle="#c78b54";ctx.lineWidth=2;[-7,0,7].forEach(x=>{ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x*.7,9);ctx.stroke()});ctx.restore()}
  function enemy(e,t){if(!e.alive)return;ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);if(e.type==="jelly"){ctx.fillStyle="#c785d9";ctx.beginPath();ctx.arc(0,-5,20,Math.PI,Math.PI*2);ctx.lineTo(20,4);ctx.lineTo(-20,4);ctx.closePath();ctx.fill();ctx.strokeStyle="#f0b4e8";ctx.lineWidth=3;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*7,3);ctx.quadraticCurveTo(i*8+Math.sin(t*.01+i)*5,16,i*7,25);ctx.stroke()}}else if(e.type==="puffer"){ctx.fillStyle="#d8b84a";ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#f6e28b";for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*15,Math.sin(a)*15);ctx.lineTo(Math.cos(a)*24,Math.sin(a)*24);ctx.stroke()}}else{ctx.scale(e.dir<0?-1:1,1);ctx.fillStyle="#2e9e87";ctx.beginPath();ctx.ellipse(0,0,28,11,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(-39,-13);ctx.lineTo(-37,13);ctx.closePath();ctx.fill()}ctx.restore()}

  function mexilhao(t){
    ctx.save();ctx.translate(hero.x+27,hero.y+34);ctx.scale(hero.face<0?-1:1,1);if(hero.inv>0&&Math.floor(hero.inv*18)%2===0)ctx.globalAlpha=.35;if(!transformed){rect(-19,-27,38,57,"#171a22");rect(-15,-36,30,26,"#d69a75");ctx.restore();return}
    const kick=Math.sin(t*.012)*5;ctx.fillStyle="#087ed3";ctx.beginPath();ctx.moveTo(-9,25);ctx.lineTo(-36-kick,42);ctx.lineTo(-9,45);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(12,26);ctx.lineTo(38+kick,44);ctx.lineTo(10,46);ctx.closePath();ctx.fill();rect(-21,-6,42,34,"#dd2e31");rect(-18,21,36,15,"#151a25");rect(-21,12,42,6,"#0a67b3");rect(-5,13,10,8,"#ffd24a");
    ctx.fillStyle="#128bd3";ctx.beginPath();ctx.moveTo(-18,-7);ctx.lineTo(-3,9);ctx.lineTo(0,-2);ctx.lineTo(4,9);ctx.lineTo(18,-7);ctx.lineTo(9,-13);ctx.lineTo(0,-5);ctx.lineTo(-9,-13);ctx.closePath();ctx.fill();ctx.fillStyle="#0783d4";ctx.beginPath();ctx.arc(-31,7,9,0,Math.PI*2);ctx.arc(31,7,9,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#e99a64";ctx.beginPath();ctx.ellipse(0,-27,26,25,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(-21,-20,13,0,Math.PI*2);ctx.arc(21,-20,13,0,Math.PI*2);ctx.fill();rect(-15,-42,30,9,"#181821");rect(-14,-31,7,4,"#191923");rect(7,-31,7,4,"#191923");rect(-5,-18,10,3,"#8c3c33");rect(-19,-55,38,10,"#f7f2d9");rect(-14,-63,28,10,"#f7f2d9");rect(-18,-54,36,4,"#126ac0");rect(-2,-61,4,7,"#126ac0");rect(-6,-58,12,3,"#126ac0");ctx.restore();
  }
  function potavio(t){
    if(!boss.active)return;ctx.save();ctx.translate(boss.x+75,boss.y+94);const dry=clamp(1-boss.water/100,0,1),belly=1-dry*.48;if(boss.state==="dead")ctx.rotate(Math.sin(t*.05)*.15);rect(38,-45,28,90,"#314b25");rect(43,-39,18,78,"#72933a");rect(48,-32,7,56,"#e39634");ctx.strokeStyle="#22b5d9";ctx.lineWidth=7;ctx.beginPath();ctx.arc(42,3,42,-Math.PI/2,Math.PI/2);ctx.stroke();rect(-34,48,15,38,"#7033a0");rect(18,48,15,38,"#7033a0");rect(-41,78,27,10,"#e0a538");rect(14,78,27,10,"#e0a538");rect(-42,-5,84,63,"#6f329a");ctx.save();ctx.scale(belly,1);ctx.fillStyle="#53b9dc";ctx.beginPath();ctx.ellipse(0,25,43,37,0,0,Math.PI*2);ctx.fill();ctx.restore();rect(-54,-16,15,55,"#4eacd0");rect(39,-16,15,55,"#4eacd0");ctx.fillStyle="rgba(76,199,239,.22)";ctx.fillRect(-39,-91,78,76);ctx.strokeStyle="#77dcff";ctx.lineWidth=6;ctx.strokeRect(-39,-91,78,76);rect(-18,-101,36,10,"#6bd8f5");rect(-13,-108,26,8,"#e5fbff");ctx.fillStyle="#4eacd0";ctx.beginPath();ctx.ellipse(0,-51,27,28,0,0,Math.PI*2);ctx.fill();rect(-14,-65,28,7,"#162035");rect(-13,-51,6,5,"#0c1730");rect(7,-51,6,5,"#0c1730");rect(-4,-39,13,3,boss.phase===3?"#7a1736":"#263653");if(!['intro','dead'].includes(boss.state)){rect(-91,-4,54,25,"#244d63");rect(-84,1,42,15,"#e19b35");rect(-105,2,23,12,"#58d3ed")}if(boss.glow>0){ctx.globalAlpha=.2*clamp(boss.glow,0,1);rect(-64,-112,128,205,"#fff4a6")}ctx.restore();
  }
  function projectiles(t){for(const m of marbles){ctx.fillStyle="#c6f8ff";ctx.beginPath();ctx.arc(m.x+5,m.y+5,5.5,0,Math.PI*2);ctx.fill()}for(const s of shots){ctx.save();ctx.translate(s.x+s.w/2,s.y+s.h/2);ctx.rotate(Math.atan2(s.vy,s.vx));ctx.fillStyle="#8eeaff";ctx.beginPath();ctx.ellipse(0,0,s.w/2,s.h/2,0,0,Math.PI*2);ctx.fill();ctx.restore()}for(const w of waves){const top=w.gap-w.gapH/2,bottom=w.gap+w.gapH/2;ctx.save();ctx.globalAlpha=.78;rect(w.x,w.y,w.w,Math.max(0,top-w.y),"#55cce9");rect(w.x,bottom,w.w,Math.max(0,WATER_BOTTOM-bottom),"#55cce9");ctx.restore()}if(boss.active&&boss.state==="jet_charge"){ctx.save();ctx.setLineDash([10,8]);ctx.strokeStyle="#fff091";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ARENA_LEFT,boss.jetY);ctx.lineTo(boss.x,boss.jetY);ctx.stroke();ctx.restore()}if(boss.active&&boss.state==="jet"){const width=boss.x-ARENA_LEFT+30;ctx.globalAlpha=.82;rect(ARENA_LEFT,boss.jetY-26,width,52,"#5cd9f5");rect(ARENA_LEFT,boss.jetY-8,width,16,"#d9fbff");ctx.globalAlpha=1}}
  function fx(){for(const p of particles){ctx.globalAlpha=clamp(p.life/.7,0,1);rect(p.x,p.y,p.size,p.size,p.color)}ctx.globalAlpha=1}
  function transformText(){if(transformed||mode!=="play")return;ctx.fillStyle="#fff3a3";ctx.font="bold 13px monospace";ctx.textAlign="center";ctx.fillText(transformTimer>1.2?"A ÁGUA ESTÁ MUDANDO O SHALL...":"MEXILHÃOZINHO!",hero.x+27,hero.y-24)}

  function draw(t){ctx.setTransform(1,0,0,1,0,0);ctx.imageSmoothingEnabled=false;backdrop(t);ctx.save();if(shake)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);ctx.translate(-camera,0);drawCurrents(t);reefs.forEach(reef);pickups.forEach(p=>shell(p,t));enemies.forEach(e=>enemy(e,t));potavio(t);projectiles(t);mexilhao(t);transformText();fx();ctx.restore();if(flash){ctx.globalAlpha=clamp(flash*2.2,0,.35);ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}const v=ctx.createRadialGradient(W/2,H*.48,100,W/2,H*.48,360);v.addColorStop(0,"rgba(0,0,0,0)");v.addColorStop(1,"rgba(1,8,22,.42)");ctx.fillStyle=v;ctx.fillRect(0,0,W,H)}

  function loop(now){const dt=clamp((now-last)/1000,0,.033);last=now;update(dt);draw(now);music(now);if(!ui.toast.hidden&&now>toastUntil)ui.toast.hidden=true;requestAnimationFrame(loop)}
  function release(id){const b=pointers.get(id);if(!b)return;pointers.delete(id);if(![...pointers.values()].some(x=>x.name===b.name))keys[b.name]=false;b.button.classList.toggle("active",keys[b.name])}
  document.querySelectorAll("[data-stage4-control]").forEach(button=>{const name=button.dataset.stage4Control;button.addEventListener("pointerdown",e=>{e.preventDefault();initAudio();button.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{name,button});keys[name]=true;button.classList.add("active");if(name==="shoot")fire();if(name==="dash")dash();navigator.vibrate?.(name==="dash"?[12,20,12]:7)},{passive:false});button.addEventListener("pointerup",e=>release(e.pointerId));button.addEventListener("pointercancel",e=>release(e.pointerId));button.addEventListener("lostpointercapture",e=>release(e.pointerId))});
  const map={arrowleft:"left",a:"left",arrowright:"right",d:"right",arrowup:"swim",w:"swim"," ":"swim",x:"shoot",k:"shoot",c:"dash",e:"dash"};window.addEventListener("keydown",e=>{const a=map[e.key.toLowerCase()];if(!a)return;e.preventDefault();keys[a]=true;initAudio();if(!e.repeat&&a==="shoot")fire();if(!e.repeat&&a==="dash")dash()},{passive:false});window.addEventListener("keyup",e=>{const a=map[e.key.toLowerCase()];if(a)keys[a]=false});window.addEventListener("blur",()=>{pointers.clear();Object.keys(keys).forEach(k=>keys[k]=false)});
  ui.start.addEventListener("click",start);ui.retry.addEventListener("click",start);ui.replay.addEventListener("click",start);ui.sound.classList.toggle("muted",muted);ui.sound.addEventListener("click",()=>{muted=!muted;localStorage.setItem("shall-muted",String(muted));ui.sound.classList.toggle("muted",muted);if(!muted){initAudio();sfx("item")}});
  if("serviceWorker" in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});

  function qa(){if(location.hostname!=="terminal.local")return;const q=new URLSearchParams(location.search).get("qa");if(!q)return;start();transformTimer=0;transformed=true;hero.inv=999;if(q==="aquatic"){hero.x=2150;hero.y=220;camera=1980}if(q==="mexilhao"){hero.x=1450;hero.y=220;camera=1280}if(q.startsWith("potavio")){hero.x=5720;hero.y=250;camera=ARENA_LEFT;activateBoss();boss.state="combat";if(q==="potavio-jet"){boss.phase=2;boss.water=52;bossState("jet");boss.jetY=280}if(q==="potavio-dry"){boss.phase=3;boss.water=12;boss.hp=78}if(q==="potavio-wave"){boss.phase=3;boss.water=22;bossState("sneeze")}hud()}}
  window.__shallStage4Debug=()=>({mode,hero:{x:Math.round(hero.x),y:Math.round(hero.y),vx:Math.round(hero.vx),vy:Math.round(hero.vy),health:hero.hp},transformDone:transformed,shells,current:currentAt(hero),boss:{active:boss.active,health:boss.hp,water:Number(boss.water.toFixed(1)),phase:boss.phase,state:boss.state},marbles:marbles.length,waterShots:shots.length,waves:waves.length});

  reset();qa();draw(performance.now());requestAnimationFrame(loop);
})();
