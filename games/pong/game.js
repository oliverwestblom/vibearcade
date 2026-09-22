const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=720,H=440,PH=86,PW=12;
let player=177,computer=177,playerScore=0,computerScore=0,ball,playing=false,last=0,serveDelay=0;
const held=new Set();
function serve(sign=1){ball={x:W/2,y:H/2,vx:sign*310,vy:(Math.random()>.5?1:-1)*(110+Math.random()*100)};serveDelay=.65;}
function clamp(y){return Math.max(0,Math.min(H-PH,y));}
function scores(){document.querySelector('#player-score').textContent=playerScore;document.querySelector('#computer-score').textContent=computerScore;}
function update(dt){
  if(held.has('up'))player=clamp(player-390*dt);
  if(held.has('down'))player=clamp(player+390*dt);
  if(serveDelay>0){serveDelay-=dt;return;}
  const delta=ball.y-(computer+PH/2);computer=clamp(computer+Math.sign(delta)*Math.min(Math.abs(delta),225*dt));
  ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
  if(ball.y<8){ball.y=8;ball.vy=Math.abs(ball.vy);}if(ball.y>H-8){ball.y=H-8;ball.vy=-Math.abs(ball.vy);}
  function bounce(y,sign,x){const offset=(ball.y-y-PH/2)/(PH/2);ball.vx=sign*Math.min(Math.abs(ball.vx)*1.06,540);ball.vy=offset*300;ball.x=x;}
  if(ball.vx<0 && ball.x-8<=24+PW && ball.x+8>=24 && ball.y+8>=player && ball.y-8<=player+PH)bounce(player,1,24+PW+8);
  if(ball.vx>0 && ball.x+8>=W-24-PW && ball.x-8<=W-24 && ball.y+8>=computer && ball.y-8<=computer+PH)bounce(computer,-1,W-24-PW-8);
  if(ball.x< -8 || ball.x>W+8){
    const missedLeft=ball.x<0;if(missedLeft)computerScore++;else playerScore++;scores();
    if(playerScore===7 || computerScore===7){playing=false;status.textContent=playerScore===7?'Du vann! Snyggt spelat.':'Datorn vann den här rundan. Försök igen!';}
    serve(missedLeft?1:-1);
  }
}
function draw(){ctx.fillStyle='#181d26';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#424253';ctx.setLineDash([8,12]);ctx.beginPath();ctx.moveTo(W/2,0);ctx.lineTo(W/2,H);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#d5fb78';ctx.fillRect(24,player,PW,PH);ctx.fillStyle='#b9a0ff';ctx.fillRect(W-24-PW,computer,PW,PH);ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,8,0,Math.PI*2);ctx.fill();}
function frame(time){const dt=Math.min((time-last)/1000,.025);last=time;if(playing)update(dt);draw();requestAnimationFrame(frame);}
const keyMap={ArrowUp:'up',ArrowDown:'down',w:'up',s:'down'};
document.addEventListener('keydown',e=>{const key=keyMap[e.key]||keyMap[e.key.toLowerCase()];if(key){e.preventDefault();held.add(key);}});
document.addEventListener('keyup',e=>{held.delete(keyMap[e.key]||keyMap[e.key.toLowerCase()]);});
window.addEventListener('blur',()=>held.clear());
document.querySelectorAll('[data-move]').forEach(button=>{button.addEventListener('pointerdown',e=>{button.setPointerCapture(e.pointerId);held.add(button.dataset.move);});for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>held.delete(button.dataset.move));});
function pointer(e){const rect=canvas.getBoundingClientRect();player=clamp((e.clientY-rect.top)*H/rect.height-PH/2);}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointer(e);});canvas.addEventListener('pointermove',e=>{if(e.buttons)pointer(e);});
function start(){player=computer=177;playerScore=computerScore=0;scores();held.clear();serve();playing=true;status.textContent='Först till sju. Lycka till!';document.querySelector('#start').textContent='Spela igen';}
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{if(document.hidden && playing){playing=false;held.clear();status.textContent='Rundan avbröts när du lämnade fliken. Tryck på Spela igen.';}});
start();requestAnimationFrame(frame);
