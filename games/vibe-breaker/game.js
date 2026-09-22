const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=720,H=520,PADDLE_Y=470,BRICK_COLS=10,BRICK_ROWS=6,BRICK_W=62,BRICK_H=23,GAP=6;
const colors=['#f76fae','#b9a0ff','#2fc4dc','#d5fb78','#ffb18b','#f3f3f7'],held=new Set();
let paddle,balls,bricks,powerups,particles,score,lives,level,playing,last=0,serveTimer=0,widenTimer=0,levelPending=false,gameId=0;

function makeBricks(){
  bricks=[];
  const startX=(W-(BRICK_COLS*BRICK_W+(BRICK_COLS-1)*GAP))/2;
  for(let row=0;row<BRICK_ROWS;row++)for(let col=0;col<BRICK_COLS;col++){
    const hp=level>=3&&row<Math.min(2,level-1)?2:1;
    bricks.push({x:startX+col*(BRICK_W+GAP),y:66+row*(BRICK_H+GAP),w:BRICK_W,h:BRICK_H,hp,maxHp:hp,color:colors[row]});
  }
}
function makeBall(x=paddle.x,y=PADDLE_Y-31,vx=(Math.random()>.5?1:-1)*190,vy=-285){
  const speed=1+(level-1)*.06;
  return{x,y,vx:vx*speed,vy:vy*speed,r:8,trail:[]};
}
function resetPaddle(){
  paddle={x:W/2,width:108,vx:0};widenTimer=0;
}
function resetGame(){
  gameId++;
  score=0;lives=3;level=1;powerups=[];particles=[];levelPending=false;
  resetPaddle();makeBricks();balls=[makeBall()];serveTimer=.8;updateHud();
}
function updateHud(){
  document.querySelector('#score').textContent=score;
  document.querySelector('#lives').textContent=lives;
  document.querySelector('#level').textContent=level;
}
function burst(x,y,color,count){
  for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*230,vy:(Math.random()-.5)*190,life:.3+Math.random()*.45,color,size:2+Math.random()*4});
}
function maybeDrop(brick){
  if(Math.random()>.13)return;
  const types=['wide','multi','slow','life'];
  const type=types[Math.floor(Math.random()*types.length)];
  powerups.push({x:brick.x+brick.w/2,y:brick.y+brick.h/2,vy:95,type,spin:0});
}
function applyPowerup(type){
  if(type==='wide'){
    paddle.width=164;widenTimer=12;status.textContent='Bred zebra! Plattan är större i 12 sekunder.';
  }else if(type==='multi'){
    const clones=[];
    balls.forEach(ball=>{
      clones.push({...ball,vx:-ball.vx*.92,vy:ball.vy*.96,trail:[]});
      if(balls.length+clones.length<5)clones.push({...ball,vx:ball.vx*.65+120,vy:ball.vy*.94,trail:[]});
    });
    balls.push(...clones.slice(0,5-balls.length));status.textContent='Multivibe! Flera orber är i spel.';
  }else if(type==='slow'){
    balls.forEach(ball=>{ball.vx*=.74;ball.vy*=.74;});status.textContent='Lugn vibe! Orberna saktar ner.';
  }else{
    lives++;updateHud();status.textContent='Extra liv!';
  }
  burst(paddle.x,PADDLE_Y,'#d5fb78',18);
}
function loseLife(){
  lives--;updateHud();powerups=[];
  if(lives<=0){
    playing=false;held.clear();status.textContent=`Väggen vann! Du fick ${score} poäng. Tryck på Spela igen.`;
    return;
  }
  resetPaddle();balls=[makeBall()];serveTimer=.9;
  status.textContent=`Orben försvann. ${lives} liv kvar.`;
}
function nextLevel(){
  level++;score+=500;updateHud();powerups=[];levelPending=false;resetPaddle();makeBricks();balls=[makeBall()];serveTimer=1;
  status.textContent=`Bana ${level}! Blocken blir tåligare och orben snabbare.`;
}

function hitBrick(ball,brick,previousX,previousY){
  brick.hp--;score+=brick.hp===0?20*level:5;updateHud();burst(ball.x,ball.y,brick.color,8);
  if(brick.hp===0)maybeDrop(brick);
  const fromTop=previousY+ball.r<=brick.y,fromBottom=previousY-ball.r>=brick.y+brick.h;
  if(fromTop||fromBottom)ball.vy*=-1;else ball.vx*=-1;
  ball.x=previousX;ball.y=previousY;
}
function updateBall(ball,dt){
  ball.trail.unshift({x:ball.x,y:ball.y});if(ball.trail.length>7)ball.trail.pop();
  const previousX=ball.x,previousY=ball.y;
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  if(ball.x-ball.r<8){ball.x=8+ball.r;ball.vx=Math.abs(ball.vx);}
  if(ball.x+ball.r>W-8){ball.x=W-8-ball.r;ball.vx=-Math.abs(ball.vx);}
  if(ball.y-ball.r<8){ball.y=8+ball.r;ball.vy=Math.abs(ball.vy);}
  if(ball.vy>0&&ball.y+ball.r>=PADDLE_Y-8&&ball.y-ball.r<=PADDLE_Y+13&&Math.abs(ball.x-paddle.x)<=paddle.width/2+ball.r){
    const offset=(ball.x-paddle.x)/(paddle.width/2);
    const speed=Math.min(500,Math.hypot(ball.vx,ball.vy)*1.025);
    ball.vx=offset*speed*.82;ball.vy=-Math.sqrt(Math.max(180*180,speed*speed-ball.vx*ball.vx));
    ball.y=PADDLE_Y-8-ball.r;burst(ball.x,ball.y,'#f3f3f7',4);
  }
  const brick=bricks.find(item=>item.hp>0&&ball.x+ball.r>item.x&&ball.x-ball.r<item.x+item.w&&ball.y+ball.r>item.y&&ball.y-ball.r<item.y+item.h);
  if(brick)hitBrick(ball,brick,previousX,previousY);
  return ball.y-ball.r<H+25;
}
function update(dt){
  const direction=(held.has('right')?1:0)-(held.has('left')?1:0);
  paddle.vx+=direction*1500*dt;paddle.vx*=Math.pow(.001,dt);
  paddle.x=Math.max(paddle.width/2+10,Math.min(W-paddle.width/2-10,paddle.x+paddle.vx*dt));
  if(widenTimer>0){
    widenTimer-=dt;
    if(widenTimer<=0){paddle.width=108;paddle.x=Math.max(64,Math.min(W-64,paddle.x));}
  }
  if(serveTimer>0){
    serveTimer-=dt;
    balls.forEach(ball=>{ball.x=paddle.x;ball.y=PADDLE_Y-31;});
  }else{
    balls=balls.filter(ball=>updateBall(ball,dt));
    if(!balls.length&&!levelPending)loseLife();
  }
  powerups=powerups.filter(powerup=>{
    powerup.y+=powerup.vy*dt;powerup.spin+=dt*4;
    if(powerup.y>=PADDLE_Y-10&&powerup.y<=PADDLE_Y+22&&Math.abs(powerup.x-paddle.x)<paddle.width/2+13){applyPowerup(powerup.type);return false;}
    return powerup.y<H+20;
  });
  if(!levelPending&&bricks.every(brick=>brick.hp<=0)){
    const currentGame=gameId;
    levelPending=true;balls=[];setTimeout(()=>{if(playing&&levelPending&&gameId===currentGame)nextLevel();},650);
  }
}

function drawBackground(){
  const gradient=ctx.createLinearGradient(0,0,0,H);gradient.addColorStop(0,'#302640');gradient.addColorStop(1,'#151b28');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffffff09';
  for(let x=24;x<W;x+=48)for(let y=24;y<H;y+=48){ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill();}
}
function drawBrick(brick){
  if(brick.hp<=0)return;
  ctx.fillStyle=brick.hp===brick.maxHp?brick.color:'#ffffff55';ctx.beginPath();ctx.roundRect(brick.x,brick.y,brick.w,brick.h,5);ctx.fill();
  ctx.fillStyle='#ffffff28';ctx.fillRect(brick.x+5,brick.y+4,brick.w-10,3);
  if(brick.hp>1){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.strokeRect(brick.x+4,brick.y+4,brick.w-8,brick.h-8);}
}
function drawPaddle(){
  ctx.save();ctx.translate(paddle.x,PADDLE_Y);
  ctx.fillStyle='#f7f7fa';ctx.beginPath();ctx.roundRect(-paddle.width/2,-9,paddle.width,18,9);ctx.fill();
  ctx.save();ctx.beginPath();ctx.roundRect(-paddle.width/2,-9,paddle.width,18,9);ctx.clip();ctx.fillStyle='#161820';
  for(let x=-paddle.width/2;x<paddle.width/2;x+=19){ctx.save();ctx.translate(x,0);ctx.rotate(-.3);ctx.fillRect(0,-16,8,32);ctx.restore();}
  ctx.restore();
  ctx.fillStyle='#f7f7fa';ctx.beginPath();ctx.ellipse(paddle.width/2-5,-7,16,14,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#161820';ctx.beginPath();ctx.moveTo(paddle.width/2-14,-18);ctx.lineTo(paddle.width/2-9,-29);ctx.lineTo(paddle.width/2-3,-18);ctx.fill();
  ctx.fillStyle='#2fc4dc';ctx.beginPath();ctx.arc(paddle.width/2, -10,3,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawBall(ball){
  ball.trail.forEach((point,index)=>{ctx.globalAlpha=(ball.trail.length-index)/ball.trail.length*.16;ctx.fillStyle='#f76fae';ctx.beginPath();ctx.arc(point.x,point.y,ball.r-index*.55,0,Math.PI*2);ctx.fill();});
  ctx.globalAlpha=1;ctx.fillStyle='#f76fae';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x-2.5,ball.y-2.5,2,0,Math.PI*2);ctx.fill();
}
function drawPowerup(powerup){
  const labels={wide:'W',multi:'M',slow:'S',life:'+'};
  ctx.save();ctx.translate(powerup.x,powerup.y);ctx.rotate(Math.sin(powerup.spin)*.14);
  ctx.fillStyle='#d5fb78';ctx.beginPath();ctx.roundRect(-13,-11,26,22,6);ctx.fill();
  ctx.fillStyle='#1c2510';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(labels[powerup.type],0,1);ctx.restore();
}
function draw(){
  drawBackground();bricks.forEach(drawBrick);powerups.forEach(drawPowerup);
  balls.forEach(drawBall);drawPaddle();
  particles.forEach(particle=>{ctx.globalAlpha=Math.max(0,particle.life*2);ctx.fillStyle=particle.color;ctx.fillRect(particle.x,particle.y,particle.size,particle.size);});
  ctx.globalAlpha=1;
}
function frame(time){
  const dt=Math.min((time-last)/1000,.025);last=time;
  if(playing)update(dt);
  particles=particles.filter(particle=>{particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.vy+=260*dt;particle.life-=dt;return particle.life>0;});
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
  paddle.x=Math.max(paddle.width/2+10,Math.min(W-paddle.width/2-10,(event.clientX-rect.left)*W/rect.width));
}
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);moveToPointer(event);});
canvas.addEventListener('pointermove',event=>{if(event.buttons)moveToPointer(event);});
function start(){
  resetGame();playing=true;held.clear();status.textContent='Krossa alla block med vibe-orben.';
}
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&playing){playing=false;held.clear();status.textContent='Rundan avbröts när du lämnade fliken. Tryck på Spela igen.';}
});
resetGame();start();requestAnimationFrame(frame);
