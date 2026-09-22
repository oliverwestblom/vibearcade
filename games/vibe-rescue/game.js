const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=720,H=500,WATER_Y=410,MAX_MISSES=3;
const held=new Set(),lanes=[90,200,315,430,545,650];
let elephant,zebras,particles,clouds,score,saved,misses,combo,spawnTimer,playing,last=0;

function reset(){
  elephant={x:W/2,vx:0,tilt:0};
  zebras=[];particles=[];score=0;saved=0;misses=0;combo=0;spawnTimer=.8;
  clouds=[{x:40,y:70,s:.75,v:9},{x:310,y:115,s:1,v:13},{x:585,y:55,s:.62,v:7}];
  updateHud();
}
function updateHud(){
  document.querySelector('#score').textContent=score;
  document.querySelector('#saved').textContent=saved;
  document.querySelector('#misses').textContent=misses;
}
function burst(x,y,color,count,upward=false){
  for(let i=0;i<count;i++)particles.push({
    x,y,vx:(Math.random()-.5)*220,vy:(upward?-80:20)+(Math.random()-.5)*150,
    life:.45+Math.random()*.45,color,size:3+Math.random()*4
  });
}
function spawnZebra(){
  const lane=lanes[Math.floor(Math.random()*lanes.length)];
  const difficulty=Math.min(1,score/3000);
  zebras.push({
    x:lane,y:72,vy:52+Math.random()*18+difficulty*42,drift:(Math.random()-.5)*(24+difficulty*20),
    swing:Math.random()*Math.PI*2,swingSpeed:1.8+Math.random()*1.2,chute:['#d5fb78','#b9a0ff','#ffb18b','#2fc4dc'][Math.floor(Math.random()*4)]
  });
}
function finish(){
  playing=false;held.clear();
  status.textContent=`Räddningspasset är slut! ${saved} zebror räddades och gav ${score} poäng.`;
}
function catchZebra(zebra){
  saved++;combo++;const points=100+Math.min(combo-1,5)*20;score+=points;
  burst(zebra.x,WATER_Y-12,'#d5fb78',14,true);updateHud();
  status.textContent=combo>2?`${combo} i rad! +${points} poäng.`:`Zebra räddad! +${points} poäng.`;
}
function missZebra(zebra){
  if(!playing)return;
  misses++;combo=0;burst(zebra.x,WATER_Y+7,'#78dff0',20,true);updateHud();
  if(misses>=MAX_MISSES)finish();
  else status.textContent=`Plask! ${MAX_MISSES-misses} miss kvar innan räddningspasset är slut.`;
}
function update(dt){
  const direction=(held.has('right')?1:0)-(held.has('left')?1:0);
  elephant.vx+=direction*1250*dt;
  elephant.vx*=Math.pow(.0015,dt);
  elephant.x=Math.max(66,Math.min(W-66,elephant.x+elephant.vx*dt));
  elephant.tilt+=(direction*.1-elephant.tilt)*Math.min(1,dt*8);

  spawnTimer-=dt;
  if(spawnTimer<=0){
    spawnZebra();
    spawnTimer=Math.max(.52,1.45-score/4200)+Math.random()*.34;
  }
  zebras=zebras.filter(zebra=>{
    zebra.swing+=zebra.swingSpeed*dt;
    zebra.x+=zebra.drift*dt+Math.sin(zebra.swing)*9*dt;
    zebra.x=Math.max(30,Math.min(W-30,zebra.x));
    zebra.y+=zebra.vy*dt;
    const catchY=WATER_Y-38;
    if(zebra.y>=catchY){
      if(Math.abs(zebra.x-elephant.x)<69){catchZebra(zebra);return false;}
      if(zebra.y>=WATER_Y+17){missZebra(zebra);return false;}
    }
    return true;
  });
  clouds.forEach(cloud=>{cloud.x+=cloud.v*dt;if(cloud.x>W+80)cloud.x=-100;});
}

function drawCloud(cloud){
  ctx.save();ctx.globalAlpha=.18;ctx.translate(cloud.x,cloud.y);ctx.scale(cloud.s,cloud.s);ctx.fillStyle='#fff';
  ctx.beginPath();ctx.arc(0,5,24,0,Math.PI*2);ctx.arc(27,-5,31,0,Math.PI*2);ctx.arc(58,7,23,0,Math.PI*2);ctx.fill();ctx.restore();
}
function drawAirship(){
  ctx.save();ctx.translate(W/2,38);
  ctx.fillStyle='#b9a0ff';ctx.beginPath();ctx.ellipse(0,0,105,27,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#7255bd';ctx.beginPath();ctx.moveTo(-72,6);ctx.lineTo(-108,27);ctx.lineTo(-66,19);ctx.closePath();ctx.fill();
  ctx.fillStyle='#23213a';ctx.fillRect(-35,22,70,20);
  ctx.fillStyle='#2fc4dc';ctx.fillRect(-25,26,17,8);ctx.fillRect(5,26,17,8);
  ctx.fillStyle='#fff';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.fillText('VIBE AIR',0,6);
  ctx.restore();
}
function drawZebra(zebra){
  ctx.save();ctx.translate(zebra.x,zebra.y);
  const sway=Math.sin(zebra.swing)*5;ctx.rotate(sway*.012);
  ctx.strokeStyle='#f3f3f7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-18,-21);ctx.lineTo(-31,-48);ctx.moveTo(18,-21);ctx.lineTo(31,-48);ctx.stroke();
  ctx.fillStyle=zebra.chute;ctx.beginPath();ctx.arc(0,-48,32,Math.PI,Math.PI*2);ctx.lineTo(0,-48);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#ffffff55';ctx.beginPath();ctx.moveTo(0,-48);ctx.lineTo(0,-79);ctx.stroke();
  ctx.fillStyle='#f7f7fa';ctx.beginPath();ctx.ellipse(0,1,14,18,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(0,-15,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#161820';ctx.fillRect(-12,-6,24,4);ctx.fillRect(-13,4,26,4);ctx.fillRect(-7,-19,14,4);
  ctx.fillRect(-10,15,6,14);ctx.fillRect(4,15,6,14);
  ctx.beginPath();ctx.moveTo(-7,-21);ctx.lineTo(-5,-29);ctx.lineTo(-1,-22);ctx.fill();
  ctx.beginPath();ctx.moveTo(7,-21);ctx.lineTo(5,-29);ctx.lineTo(1,-22);ctx.fill();
  ctx.fillStyle='#2fc4dc';ctx.beginPath();ctx.arc(4,-16,2,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawElephant(){
  ctx.save();ctx.translate(elephant.x,WATER_Y-18);ctx.rotate(elephant.tilt);
  ctx.fillStyle='#ffb18b';ctx.beginPath();ctx.ellipse(0,23,72,17,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d77f5d';ctx.fillRect(-55,18,110,8);
  ctx.fillStyle='#e05494';ctx.fillRect(-31,0,16,28);ctx.fillRect(17,0,16,28);
  ctx.fillStyle='#f76fae';ctx.beginPath();ctx.ellipse(0,-20,43,32,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(35,-28,25,25,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e05494';ctx.beginPath();ctx.ellipse(20,-31,17,22,-.25,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f76fae';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(49,-20);ctx.quadraticCurveTo(66,-5,50,8);ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(41,-34,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#15161c';ctx.beginPath();ctx.arc(43,-34,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText('RESCUE',-7,-16);
  ctx.restore();
}
function draw(){
  const sky=ctx.createLinearGradient(0,0,0,WATER_Y);sky.addColorStop(0,'#302647');sky.addColorStop(1,'#182b3c');
  ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  clouds.forEach(drawCloud);drawAirship();
  ctx.fillStyle='#173747';ctx.fillRect(0,WATER_Y,W,H-WATER_Y);
  ctx.strokeStyle='#2fc4dc';ctx.lineWidth=3;
  for(let y=WATER_Y+8;y<H;y+=18){
    ctx.beginPath();
    for(let x=-20;x<=W+20;x+=20)ctx.lineTo(x,y+Math.sin((x+y)/22)*4);
    ctx.stroke();
  }
  zebras.forEach(drawZebra);drawElephant();
  particles.forEach(particle=>{ctx.globalAlpha=Math.max(0,particle.life*1.8);ctx.fillStyle=particle.color;ctx.fillRect(particle.x,particle.y,particle.size,particle.size);});
  ctx.globalAlpha=1;
  for(let i=0;i<MAX_MISSES;i++){
    ctx.fillStyle=i<misses?'#ffb18b':'#ffffff20';ctx.beginPath();ctx.arc(24+i*22,H-21,7,0,Math.PI*2);ctx.fill();
  }
}
function frame(time){
  const dt=Math.min((time-last)/1000,.025);last=time;
  if(playing)update(dt);
  particles=particles.filter(particle=>{particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=220*dt;particle.life-=dt;return particle.life>0;});
  draw();requestAnimationFrame(frame);
}

const keyMap={ArrowLeft:'left',ArrowRight:'right',a:'left',d:'right'};
document.addEventListener('keydown',event=>{const move=keyMap[event.key]||keyMap[event.key.toLowerCase()];if(move){event.preventDefault();held.add(move);}});
document.addEventListener('keyup',event=>held.delete(keyMap[event.key]||keyMap[event.key.toLowerCase()]));
window.addEventListener('blur',()=>held.clear());
document.querySelectorAll('[data-move]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{button.setPointerCapture(event.pointerId);held.add(button.dataset.move);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>held.delete(button.dataset.move));
});
function moveToPointer(event){
  const rect=canvas.getBoundingClientRect();
  elephant.x=Math.max(66,Math.min(W-66,(event.clientX-rect.left)*W/rect.width));
}
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);moveToPointer(event);});
canvas.addEventListener('pointermove',event=>{if(event.buttons)moveToPointer(event);});
function start(){
  reset();playing=true;held.clear();status.textContent='Fånga zebrorna innan de landar i vattnet.';
}
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&playing){playing=false;held.clear();status.textContent='Rundan avbröts när du lämnade fliken. Tryck på Spela igen.';}
});
reset();start();requestAnimationFrame(frame);
