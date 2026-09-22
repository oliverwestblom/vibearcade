const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=720,H=480,GROUND=H-64,PLAYER_Y=H-52,BOSS_MAX=100,BOSS_S=.85,START_LIVES=3,HERD_MAX=100;
const held=new Set();
let player,boss,orbs,drops,pillars,herd,sparks,backdrop,lives,herdMeter,playing=false,last=0;

function makeBackdrop(){
  backdrop=[];
  for(let i=0;i<16;i++)backdrop.push({x:Math.random()*W,y:GROUND-46+Math.random()*74,s:.3+Math.random()*.22,v:24+Math.random()*36});
}
function reset(){
  player={x:W/2,hurt:0,fire:0};
  boss={x:W/2,y:140,hp:BOSS_MAX,dir:Math.random()<.5?-1:1,spray:1.6,stomp:5,flash:0,deflate:0};
  orbs=[];drops=[];pillars=[];herd=[];sparks=[];
  lives=START_LIVES;herdMeter=0;makeBackdrop();hud();
}
function hud(){
  document.querySelector('#boss-hp').textContent=Math.max(0,Math.ceil(boss.hp));
  document.querySelector('#lives').textContent=lives;
  document.querySelector('#herd').textContent=Math.floor(herdMeter);
}
function phase(){return boss.hp>66?1:boss.hp>33?2:3;}
function bossHalf(){return{rx:128*BOSS_S,ry:84*BOSS_S};}
function trunkTip(){return{x:boss.x-172*BOSS_S,y:boss.y+132*BOSS_S};}
function burst(x,y,color,count){for(let i=0;i<count;i++)sparks.push({x,y,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,life:.4+Math.random()*.3,color});}

function spray(){
  const wide=phase()===1?3:5,speed=phase()===3?270:215,tip=trunkTip();
  for(let i=0;i<wide;i++){
    const angle=Math.PI/2+(i-(wide-1)/2)*.3;
    drops.push({x:tip.x,y:tip.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed*.8+90});
  }
}
function stomp(){
  for(let i=0;i<3;i++)pillars.push({x:70+Math.random()*(W-140),warn:.85,live:.4,state:'warn'});
}
function callHerd(){
  if(!playing||herdMeter<HERD_MAX)return;
  herdMeter=0;hud();
  for(let i=0;i<14;i++)herd.push({x:-70-i*58,y:110+Math.random()*220,v:440+Math.random()*130,s:.58+Math.random()*.22,hit:false});
  status.textContent='HJORDEN KOMMER!';
}
function hurtPlayer(){
  if(player.hurt>0)return;
  player.hurt=1.4;lives--;hud();burst(player.x,PLAYER_Y,'#ffb18b',14);
  if(lives<=0)finish(false);
  else status.textContent=`Aj! ${lives} liv kvar — fortsätt röra dig.`;
}
function finish(won){
  playing=false;held.clear();
  status.textContent=won?'Du besegrade elefanten! Hjorden är fri. Tryck på Spela igen.':'Elefanten trampade ner hjorden. Tryck på Spela igen.';
  document.querySelector('#start').textContent='Spela igen';
}

function update(dt){
  if(held.has('left'))player.x-=440*dt;
  if(held.has('right'))player.x+=440*dt;
  player.x=Math.max(30,Math.min(W-30,player.x));
  player.hurt=Math.max(0,player.hurt-dt);

  const speed=phase()===3?195:phase()===2?155:118;
  boss.x+=boss.dir*speed*dt;
  if(boss.x<158){boss.x=158;boss.dir=1;}
  if(boss.x>W-125){boss.x=W-125;boss.dir=-1;}
  boss.spray-=dt;
  if(boss.spray<=0){spray();boss.spray=phase()===1?1.7:phase()===2?1.25:.95;}
  boss.stomp-=dt;
  if(boss.stomp<=0){if(phase()>1)stomp();boss.stomp=phase()===3?3.2:4.6;}

  player.fire-=dt;
  if(player.fire<=0){player.fire=.2;orbs.push({x:player.x,y:PLAYER_Y-20});}
  const{rx,ry}=bossHalf();
  orbs=orbs.filter(orb=>{
    orb.y-=560*dt;
    const dx=(orb.x-boss.x)/(rx+9),dy=(orb.y-boss.y)/(ry+9);
    if(boss.deflate===0&&dx*dx+dy*dy<=1){
      boss.hp-=2;boss.flash=.09;herdMeter=Math.min(HERD_MAX,herdMeter+3);hud();
      burst(orb.x,orb.y,'#2fc4dc',5);
      if(boss.hp<=0){boss.hp=0;boss.deflate=.001;hud();finish(true);}
      return false;
    }
    return orb.y>-20;
  });

  drops=drops.filter(drop=>{
    drop.x+=drop.vx*dt;drop.y+=drop.vy*dt;drop.vy+=240*dt;
    if(Math.abs(drop.x-player.x)<22&&Math.abs(drop.y-PLAYER_Y)<24){hurtPlayer();return false;}
    return drop.y<H+20&&drop.x>-30&&drop.x<W+30;
  });

  pillars=pillars.filter(pillar=>{
    if(pillar.state==='warn'){pillar.warn-=dt;if(pillar.warn<=0)pillar.state='live';return true;}
    pillar.live-=dt;
    if(Math.abs(player.x-pillar.x)<38)hurtPlayer();
    return pillar.live>0;
  });

  herd=herd.filter(zebra=>{
    zebra.x+=zebra.v*dt;
    const r=26*zebra.s,hx=(zebra.x-boss.x)/(rx+r),hy=(zebra.y-boss.y)/(ry+r);
    if(!zebra.hit&&boss.deflate===0&&hx*hx+hy*hy<=1){
      zebra.hit=true;boss.hp-=5;boss.flash=.12;hud();burst(zebra.x,zebra.y,'#f6f6f8',8);
      if(boss.hp<=0){boss.hp=0;boss.deflate=.001;hud();finish(true);}
    }
    drops=drops.filter(drop=>Math.hypot(drop.x-zebra.x,drop.y-zebra.y)>48);
    return zebra.x<W+90;
  });
}

function drawZebra(x,y,s,alpha){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(s,s);
  ctx.fillStyle='#f6f6f8';
  ctx.fillRect(-22,8,8,24);ctx.fillRect(-8,8,8,24);ctx.fillRect(6,8,8,24);ctx.fillRect(19,8,8,24);
  ctx.beginPath();ctx.ellipse(0,0,31,18,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(16,-10);ctx.lineTo(30,-31);ctx.lineTo(41,-25);ctx.lineTo(22,-2);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.ellipse(36,-25,10,15,-.5,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-28,-8);ctx.lineTo(-40,-24);ctx.lineTo(-31,-5);ctx.closePath();ctx.fill();
  ctx.fillStyle='#15161c';
  ctx.save();ctx.beginPath();ctx.ellipse(0,0,31,18,0,0,Math.PI*2);ctx.clip();
  for(let i=-27;i<30;i+=11)ctx.fillRect(i,-22,5,44);
  ctx.restore();
  ctx.save();ctx.beginPath();ctx.moveTo(16,-10);ctx.lineTo(30,-31);ctx.lineTo(41,-25);ctx.lineTo(22,-2);ctx.closePath();ctx.clip();
  for(let i=14;i<42;i+=8)ctx.fillRect(i,-34,4,38);
  ctx.restore();
  ctx.beginPath();ctx.arc(39,-28,2.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawElephant(){
  const shrink=boss.deflate>0?1-boss.deflate*.95:1;
  if(shrink<=.12)return;
  const pink=boss.flash>0?'#ffd9ea':'#f76fae',dark=boss.flash>0?'#ffc2de':'#e05494';
  ctx.save();
  ctx.translate(boss.x,boss.y+(1-shrink)*96);ctx.scale(BOSS_S*shrink,BOSS_S*shrink);
  ctx.fillStyle=dark;
  for(const part of [[-78,50],[-18,58],[42,56],[92,48]]){ctx.beginPath();ctx.roundRect(part[0],part[1],44,76,18);ctx.fill();}
  ctx.fillStyle=pink;ctx.beginPath();ctx.ellipse(10,0,128,84,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.ellipse(10,0,128,84,0,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#14151a';ctx.fillRect(-26,-90,180,116);
  ctx.strokeStyle='#f3f3f6';ctx.lineWidth=7;ctx.lineCap='round';
  for(let i=0;i<9;i++){ctx.beginPath();ctx.moveTo(-18+i*21,-92);ctx.quadraticCurveTo(-6+i*21,-46,-26+i*21,28);ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='#2fc4dc';ctx.beginPath();ctx.arc(62,-18,35,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('b3',62,-15);
  ctx.fillStyle=pink;ctx.beginPath();ctx.ellipse(-104,-8,62,64,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=pink;ctx.lineCap='round';
  ctx.lineWidth=36;ctx.beginPath();ctx.moveTo(-140,22);ctx.quadraticCurveTo(-190,58,-170,100);ctx.stroke();
  ctx.lineWidth=21;ctx.beginPath();ctx.moveTo(-170,100);ctx.quadraticCurveTo(-158,124,-174,138);ctx.stroke();
  ctx.strokeStyle='#fdfdf4';ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(-130,36);ctx.quadraticCurveTo(-150,76,-136,100);ctx.stroke();
  ctx.fillStyle=dark;ctx.beginPath();ctx.ellipse(-74,-18,41,52,-.18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(-124,-36,17,20,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1d9ad6';ctx.beginPath();ctx.arc(-126,-34,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#10131a';ctx.beginPath();ctx.arc(-126,-34,5,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawHud(){
  ctx.fillStyle='#ffffff18';ctx.fillRect(150,16,W-300,14);
  ctx.fillStyle='#f76fae';ctx.fillRect(150,16,(W-300)*Math.max(0,boss.hp)/BOSS_MAX,14);
  ctx.fillStyle='#a6aabb';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText('ROSA ELEFANTEN',W/2,46);
  for(let i=0;i<START_LIVES;i++){ctx.fillStyle=i<lives?'#d5fb78':'#ffffff22';ctx.fillRect(20+i*20,H-28,14,14);}
  ctx.fillStyle='#ffffff18';ctx.fillRect(W-170,H-28,150,14);
  ctx.fillStyle=herdMeter>=HERD_MAX?'#d5fb78':'#2fc4dc';ctx.fillRect(W-170,H-28,150*herdMeter/HERD_MAX,14);
  ctx.fillStyle=herdMeter>=HERD_MAX?'#1c2510':'#f3f3f7';ctx.font='bold 10px Arial';
  ctx.fillText(herdMeter>=HERD_MAX?'HJORD REDO — MELLANSLAG':'HJORD',W-95,H-17);
}

function draw(){
  ctx.fillStyle='#181d26';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#1f2531';ctx.fillRect(0,GROUND,W,H-GROUND);
  backdrop.forEach(zebra=>drawZebra(zebra.x,zebra.y,zebra.s,.16));
  pillars.forEach(pillar=>{
    ctx.fillStyle=pillar.state==='live'?'#ffb18bb0':Math.floor(pillar.warn*12)%2?'#ffb18b33':'#ffb18b14';
    ctx.fillRect(pillar.x-38,0,76,H);
  });
  drawElephant();
  herd.forEach(zebra=>drawZebra(zebra.x,zebra.y,zebra.s,1));
  ctx.fillStyle='#ffa8d2';
  drops.forEach(drop=>{ctx.beginPath();ctx.arc(drop.x,drop.y,9,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#2fc4dc';
  orbs.forEach(orb=>{ctx.beginPath();ctx.arc(orb.x,orb.y,8,0,Math.PI*2);ctx.fill();});
  sparks.forEach(spark=>{ctx.globalAlpha=Math.max(0,spark.life*2.2);ctx.fillStyle=spark.color;ctx.fillRect(spark.x-2,spark.y-2,5,5);});
  ctx.globalAlpha=1;
  if(player.hurt<=0||Math.floor(player.hurt*12)%2)drawZebra(player.x,PLAYER_Y,.62,1);
  drawHud();
}

function frame(time){
  const dt=Math.min((time-last)/1000,.025);last=time;
  if(playing)update(dt);
  if(boss.flash>0)boss.flash-=dt;
  if(boss.deflate>0)boss.deflate+=dt*1.1;
  backdrop.forEach(zebra=>{zebra.x-=zebra.v*dt;if(zebra.x<-50){zebra.x=W+40+Math.random()*120;zebra.y=GROUND-46+Math.random()*74;}});
  sparks=sparks.filter(spark=>{spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;spark.life-=dt;return spark.life>0;});
  draw();
  requestAnimationFrame(frame);
}

const keyMap={ArrowLeft:'left',ArrowRight:'right',a:'left',d:'right'};
document.addEventListener('keydown',event=>{
  if(event.key===' '){event.preventDefault();callHerd();return;}
  const key=keyMap[event.key]||keyMap[event.key.toLowerCase()];
  if(key){event.preventDefault();held.add(key);}
});
document.addEventListener('keyup',event=>{held.delete(keyMap[event.key]||keyMap[event.key.toLowerCase()]);});
window.addEventListener('blur',()=>held.clear());
document.querySelectorAll('[data-move]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{button.setPointerCapture(event.pointerId);held.add(button.dataset.move);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>held.delete(button.dataset.move));
});
document.querySelector('#herd-button').addEventListener('click',callHerd);
function pointer(event){const rect=canvas.getBoundingClientRect();player.x=Math.max(30,Math.min(W-30,(event.clientX-rect.left)*W/rect.width));}
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);pointer(event);});
canvas.addEventListener('pointermove',event=>{if(event.buttons)pointer(event);});
function start(){
  reset();playing=true;held.clear();
  status.textContent='Undvik snabeln och stampen. Träffa elefanten för att ladda hjorden.';
  document.querySelector('#start').textContent='Spela igen';
}
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&playing){playing=false;held.clear();status.textContent='Rundan avbröts när du lämnade fliken. Tryck på Spela igen.';}
});
start();requestAnimationFrame(frame);
