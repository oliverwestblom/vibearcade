const canvas = document.querySelector('#board');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const scoreElement = document.querySelector('#score');
const size = 24, columns = 25, rows = 20;
let snake, food, direction, nextDirection, score, running = false, timer;
function placeFood() {
  const free = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    if (!snake.some(part => part.x === x && part.y === y)) free.push({x, y});
  }
  food = free[Math.floor(Math.random() * free.length)];
}
function reset() {
  snake = [{x:7,y:10},{x:6,y:10},{x:5,y:10}];
  direction = {x:1,y:0}; nextDirection = direction; score = 0;
  scoreElement.textContent = score; placeFood(); draw();
}
function draw() {
  ctx.fillStyle = '#181d26'; ctx.fillRect(0,0,600,480);
  ctx.strokeStyle = '#242b35';
  for (let x=0;x<=600;x+=size) {ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,480);ctx.stroke();}
  for (let y=0;y<=480;y+=size) {ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(600,y);ctx.stroke();}
  if (food) {ctx.fillStyle='#ffb18b';ctx.beginPath();ctx.arc(food.x*size+12,food.y*size+12,8,0,Math.PI*2);ctx.fill();}
  snake.forEach((part,index)=>{ctx.fillStyle=index===0?'#ecffb9':'#b7e865';ctx.fillRect(part.x*size+2,part.y*size+2,size-4,size-4);});
}
function end(message) {running=false;clearInterval(timer);status.textContent=message;}
function tick() {
  direction = nextDirection;
  const head = {x:snake[0].x+direction.x,y:snake[0].y+direction.y};
  const eats = food && head.x===food.x && head.y===food.y;
  const body = eats ? snake : snake.slice(0,-1);
  if (head.x<0 || head.x>=columns || head.y<0 || head.y>=rows || body.some(p=>p.x===head.x && p.y===head.y)) {
    end(`Slut på rundan! Du fick ${score} poäng. Tryck på Spela igen.`); return;
  }
  snake.unshift(head);
  if (eats) {score+=10;scoreElement.textContent=score;placeFood();if (!food) end('Du fyllde hela spelplanen. Du vann!');}
  else snake.pop();
  draw();
}
const directions = {up:{x:0,y:-1},down:{x:0,y:1},left:{x:-1,y:0},right:{x:1,y:0}};
function steer(name) {const target=directions[name];if(running && target && !(target.x===-direction.x && target.y===-direction.y)) nextDirection=target;}
const keys = {ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
document.addEventListener('keydown',event=>{const name=keys[event.key] || keys[event.key.toLowerCase()];if(name){event.preventDefault();steer(name);}});
document.querySelectorAll('[data-direction]').forEach(button=>button.addEventListener('click',()=>steer(button.dataset.direction)));
function start() {clearInterval(timer);reset();running=true;status.textContent='Håll dig borta från väggarna och din egen svans.';document.querySelector('#start').textContent='Spela igen';timer=setInterval(tick,130);}
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{if(document.hidden && running)end('Rundan avbröts när du lämnade fliken. Tryck på Spela igen.');});
start();
