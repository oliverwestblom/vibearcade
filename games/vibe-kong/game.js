const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=720,H=520,PLATFORM_Y=[118,202,286,370,454],LADDER_X=[610,110,610,110],PLAYER_W=30,PLAYER_H=42;
const held=new Set();
let player,barrels,sparks,score,lives,level,playing=false,last=0,spawnTimer=0,bossBeat=0,screenFlash=0;

function platformDirection(index){return index%2===0?1:-1;}
function resetPlayer(){
  player={x:54,y:PLATFORM_Y[4]-PLAYER_H,platform:4,vy:0,jumping:false,climbing:false,invincible:0,step:0};
}
function resetGame(){
  score=0;lives=3;level=1;barrels=[];sparks=[];spawnTimer=1.4;bossBeat=0;screenFlash=0;
  resetPlayer();updateHud();
}
function updateHud(){
  document.querySelector('#score').textContent=score;
  document.querySelector('#lives').textContent=lives;
  document.querySelector('#level').textContent=level;
}
function burst(x,y,color,count){
  for(let i=0;i<count;i++)sparks.push({x,y,vx:(Math.random()-.5)*260,vy:-70-Math.random()*190,life:.35+Math.random()*.45,color});
}
function spawnBarrel(){
  const speed=112+level*13;
  barrels.push({x:150,y:PLATFORM_Y[0]-14,platform:0,vx:speed,vy:0,falling:false,spin:0,scored:false});
  bossBeat=.22;
}
function jump(){
  if(!playing||player.climbing||player.jumping)return;
  player.jumping=true;player.vy=-390;
}
function startClimb(){
  if(!playing||player.jumping||player.climbing||player.platform===0)return;
  const ladderX=LADDER_X[player.platform-1];
  if(Math.abs(player.x+PLAYER_W/2-ladderX)<34){
    player.climbing=true;player.x=ladderX-PLAYER_W/2;player.vy=0;
  }
}
function hitPlayer(){
  if(player.invincible>0||!playing)return;
  lives--;screenFlash=.24;burst(player.x+PLAYER_W/2,player.y+PLAYER_H/2,'#ffb18b',18);updateHud();
  if(lives<=0){
    playing=false;held.clear();status.textContent='Elefanten vann den här rundan. Tryck på Spela igen.';
    document.querySelector('#start').textContent='Spela igen';
    return;
  }
  barrels=[];spawnTimer=1.2;resetPlayer();player.invincible=1.8;
  status.textContent=`Aj! ${lives} liv kvar. Zebran är tillbaka på startplattformen.`;
}
function completeLevel(){
  score+=1000*level;level++;updateHud();burst(player.x,player.y,'#d5fb78',30);
  barrels=[];spawnTimer=1.2;resetPlayer();player.invincible=1.2;
  status.textContent=`Bana ${level-1} klar! Elefanten ökar tempot på bana ${level}.`;
}

function updatePlayer(dt){
  const movingLeft=held.has('left'),movingRight=held.has('right');
  player.invincible=Math.max(0,player.invincible-dt);
  if(player.climbing){
    if(held.has('up'))player.y-=165*dt;
    if(held.has('down'))player.y+=165*dt;
    const upperY=PLATFORM_Y[player.platform-1]-PLAYER_H;
    const lowerY=PLATFORM_Y[player.platform]-PLAYER_H;
    if(player.y<=upperY){
      player.platform--;player.y=upperY;player.climbing=false;
    }else if(player.y>=lowerY){
      player.y=lowerY;player.climbing=false;
    }
    return;
  }
  const direction=(movingRight?1:0)-(movingLeft?1:0);
  player.x=Math.max(14,Math.min(W-14-PLAYER_W,player.x+direction*230*dt));
  player.step+=Math.abs(direction)*dt*12;
  if(held.has('up'))startClimb();
  if(player.jumping){
    player.vy+=920*dt;player.y+=player.vy*dt;
    const floor=PLATFORM_Y[player.platform]-PLAYER_H;
    if(player.y>=floor){player.y=floor;player.vy=0;player.jumping=false;}
  }
  if(player.platform===0&&player.x>638)completeLevel();
}

function updateBarrels(dt){
  const speedBoost=1+(level-1)*.08;
  let playerHit=false;
  barrels=barrels.filter(barrel=>{
    barrel.spin+=barrel.vx*dt/14;
    if(barrel.falling){
      barrel.vy+=850*dt;barrel.y+=barrel.vy*dt;
      const targetY=PLATFORM_Y[barrel.platform+1]-14;
      if(barrel.y>=targetY){
        barrel.platform++;barrel.y=targetY;barrel.falling=false;barrel.vy=0;
        barrel.vx=Math.abs(barrel.vx)*platformDirection(barrel.platform);
      }
    }else{
      barrel.x+=barrel.vx*dt*speedBoost;
      const atEdge=barrel.vx>0?barrel.x>W-24:barrel.x<24;
      if(atEdge){
        if(barrel.platform===PLATFORM_Y.length-1)return false;
        barrel.x=Math.max(24,Math.min(W-24,barrel.x));barrel.falling=true;barrel.vy=45;
      }
    }
    const px=player.x+PLAYER_W/2,py=player.y+PLAYER_H/2;
    if(Math.hypot(barrel.x-px,barrel.y-py)<25){
      playerHit=true;hitPlayer();return false;
    }
    if(!barrel.scored&&player.jumping&&barrel.platform===player.platform&&Math.abs(barrel.x-px)<28&&barrel.y>player.y+PLAYER_H-5){
      barrel.scored=true;score+=100;updateHud();burst(barrel.x,barrel.y,'#2fc4dc',8);
    }
    return barrel.y<H+30;
  });
  if(playerHit)barrels=[];
}

function update(dt){
  updatePlayer(dt);updateBarrels(dt);
  spawnTimer-=dt;
  if(spawnTimer<=0){
    spawnBarrel();spawnTimer=Math.max(.72,2.05-level*.12+Math.random()*.4);
  }
}

function drawPlatform(y,index){
  ctx.strokeStyle='#f76fae';ctx.lineWidth=9;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(15,y);ctx.lineTo(W-15,y);ctx.stroke();
  ctx.strokeStyle='#a94475';ctx.lineWidth=3;
  for(let x=28;x<W-20;x+=38){ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+19,y+4);ctx.stroke();}
  ctx.fillStyle='#f3f3f7';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.fillText(`0${PLATFORM_Y.length-index}`,20,y-13);
}
function drawLadder(index){
  const x=LADDER_X[index],top=PLATFORM_Y[index]+5,bottom=PLATFORM_Y[index+1]-4;
  ctx.strokeStyle='#2fc4dc';ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(x-14,top);ctx.lineTo(x-14,bottom);ctx.moveTo(x+14,top);ctx.lineTo(x+14,bottom);ctx.stroke();
  ctx.lineWidth=3;
  for(let y=top+9;y<bottom;y+=15){ctx.beginPath();ctx.moveTo(x-14,y);ctx.lineTo(x+14,y);ctx.stroke();}
}
function drawZebra(x,y,step,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x+PLAYER_W/2,y+PLAYER_H/2);
  const bob=Math.sin(step)*1.5;ctx.translate(0,bob);
  ctx.fillStyle='#f6f6f8';ctx.beginPath();ctx.ellipse(0,4,13,16,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(0,-14,10,10,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#14151a';ctx.fillRect(-10,-1,20,4);ctx.fillRect(-11,7,22,4);ctx.fillRect(-7,-19,14,4);
  ctx.fillRect(-10,17,6,12);ctx.fillRect(4,17,6,12);
  ctx.beginPath();ctx.moveTo(-8,-21);ctx.lineTo(-6,-30);ctx.lineTo(-1,-22);ctx.fill();
  ctx.beginPath();ctx.moveTo(8,-21);ctx.lineTo(6,-30);ctx.lineTo(1,-22);ctx.fill();
  ctx.fillStyle='#2fc4dc';ctx.beginPath();ctx.arc(4,-15,2.3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawElephant(){
  const beat=1+bossBeat*.12;
  ctx.save();ctx.translate(105,72);ctx.scale(beat,beat);
  ctx.fillStyle='#e05494';ctx.fillRect(-36,15,18,31);ctx.fillRect(18,15,18,31);
  ctx.fillStyle='#f76fae';ctx.beginPath();ctx.ellipse(0,0,48,34,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(35,-10,27,26,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#f76fae';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(50,-3);ctx.quadraticCurveTo(68,9,58,27);ctx.stroke();
  ctx.fillStyle='#e05494';ctx.beginPath();ctx.ellipse(20,-12,18,23,-.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(43,-17,6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#15161c';ctx.beginPath();ctx.arc(45,-17,3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 14px Arial';ctx.textAlign='center';ctx.fillText('VIBE',0,5);
  ctx.restore();
}
function drawBarrel(barrel){
  ctx.save();ctx.translate(barrel.x,barrel.y);ctx.rotate(barrel.spin);
  ctx.fillStyle='#b9a0ff';ctx.beginPath();ctx.arc(0,0,14,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#6e56af';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#f3f3f7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();
  ctx.restore();
}
function draw(){
  const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#302540');gradient.addColorStop(1,'#181d26');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffffff08';
  for(let x=0;x<W;x+=48)for(let y=0;y<H;y+=48)ctx.fillRect(x,y,2,2);
  PLATFORM_Y.forEach(drawPlatform);LADDER_X.forEach((_,index)=>drawLadder(index));
  drawElephant();
  ctx.fillStyle='#d5fb78';ctx.beginPath();ctx.arc(672,85,13,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1c2510';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText('★',672,90);
  barrels.forEach(drawBarrel);
  if(player.invincible<=0||Math.floor(player.invincible*12)%2)drawZebra(player.x,player.y,player.step);
  sparks.forEach(spark=>{ctx.globalAlpha=Math.max(0,spark.life*2);ctx.fillStyle=spark.color;ctx.fillRect(spark.x-2,spark.y-2,5,5);});
  ctx.globalAlpha=1;
  ctx.fillStyle='#f3f3f7';ctx.font='bold 12px Arial';ctx.textAlign='right';ctx.fillText('NÅ STJÄRNAN',704,24);
  if(screenFlash>0){ctx.fillStyle='#ffb18b33';ctx.fillRect(0,0,W,H);}
}
function frame(time){
  const dt=Math.min((time-last)/1000,.025);last=time;
  if(playing)update(dt);
  bossBeat=Math.max(0,bossBeat-dt);screenFlash=Math.max(0,screenFlash-dt);
  sparks=sparks.filter(spark=>{spark.x+=spark.vx*dt;spark.y+=spark.vy*dt;spark.vy+=420*dt;spark.life-=dt;return spark.life>0;});
  draw();requestAnimationFrame(frame);
}

const keyMap={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down'};
document.addEventListener('keydown',event=>{
  if(event.code==='Space'){event.preventDefault();jump();return;}
  const action=keyMap[event.key]||keyMap[event.key.toLowerCase()];
  if(action){event.preventDefault();held.add(action);}
});
document.addEventListener('keyup',event=>held.delete(keyMap[event.key]||keyMap[event.key.toLowerCase()]));
window.addEventListener('blur',()=>held.clear());
document.querySelectorAll('[data-action]').forEach(button=>{
  button.addEventListener('pointerdown',event=>{button.setPointerCapture(event.pointerId);held.add(button.dataset.action);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>held.delete(button.dataset.action));
});
document.querySelector('#jump-button').addEventListener('click',jump);
canvas.addEventListener('pointerdown',jump);
function start(){
  resetGame();playing=true;held.clear();status.textContent='Klättra upp, hoppa över vibefaten och nå stjärnan!';
  document.querySelector('#start').textContent='Spela igen';
}
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&playing){playing=false;held.clear();status.textContent='Rundan avbröts när du lämnade fliken. Tryck på Spela igen.';}
});
start();requestAnimationFrame(frame);
