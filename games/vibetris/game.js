const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=560,H=520,CELL=24,COLS=10,ROWS=22,HIDDEN=2,BX=158,BY=20;
// Planen skalas upp av CSS pa hoga skarmar, sa rita i dubbel upplosning.
// All ritkod raknar fortfarande i logiska W x H-koordinater.
const RES=2;
canvas.width=W*RES;canvas.height=H*RES;
const GAME='vibetris',NAME_KEY='b3vibe-vibetris-namn',LOCAL_KEY='b3vibe-vibetris-topp';
const COLORS={I:'#2fc4dc',O:'#d5fb78',T:'#b9a0ff',S:'#8de06a',Z:'#f76fae',J:'#5b9ef5',L:'#ffb18b'};
const SHAPES={
  I:[[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]],[[0,2],[1,2],[2,2],[3,2]],[[1,0],[1,1],[1,2],[1,3]]],
  J:[[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
  L:[[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]],
  O:[[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]]],
  S:[[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]],
  T:[[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
  Z:[[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]]
};
const KICKS={
  normal:{'0>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],'1>0':[[0,0],[1,0],[1,-1],[0,2],[1,2]],
    '1>2':[[0,0],[1,0],[1,-1],[0,2],[1,2]],'2>1':[[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],
    '2>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]],'3>2':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],
    '3>0':[[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],'0>3':[[0,0],[1,0],[1,1],[0,-2],[1,-2]]},
  I:{'0>1':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],'1>0':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],
    '1>2':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]],'2>1':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],
    '2>3':[[0,0],[2,0],[-1,0],[2,1],[-1,-2]],'3>2':[[0,0],[-2,0],[1,0],[-2,-1],[1,2]],
    '3>0':[[0,0],[1,0],[-2,0],[1,-2],[-2,1]],'0>3':[[0,0],[-1,0],[2,0],[-1,2],[2,-1]]}
};
const SPAWN={I:3,J:3,L:3,O:4,S:3,T:3,Z:3};
const DAS=.17,ARR=.05,LOCK_DELAY=.5,MAX_RESETS=15;
let grid,piece,queue,bag,hold,holdUsed,score,lines,level,combo,b2b,playing,over,paused;
let fall,lockTimer,lockResets,spunT,clearFx,topp=[],toppLage='läser…',last=0,repeat={dir:0,timer:0};
const held=new Set();

function nyttGrid(){return Array.from({length:ROWS},()=>Array(COLS).fill(null));}
function fyllBag(){const b=['I','J','L','O','S','T','Z'];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}bag.push(...b);}
function nastaTyp(){if(bag.length<7)fyllBag();return bag.shift();}
function celler(type,rot,x,y){return SHAPES[type][rot].map(([cx,cy])=>[x+cx,y+cy]);}
function krock(type,rot,x,y){
  return celler(type,rot,x,y).some(([cx,cy])=>cx<0||cx>=COLS||cy>=ROWS||(cy>=0&&grid[cy][cx]));
}
function spawna(type){
  piece={type,rot:0,x:SPAWN[type],y:0};
  holdUsed=false;spunT=false;lockTimer=0;lockResets=0;fall=0;
  if(krock(type,0,piece.x,piece.y))slut();
}
function nyttStycke(){while(queue.length<4)queue.push(nastaTyp());spawna(queue.shift());}

function flytta(dx,dy){
  if(!playing||paused)return false;
  if(krock(piece.type,piece.rot,piece.x+dx,piece.y+dy))return false;
  piece.x+=dx;piece.y+=dy;spunT=false;
  if(lockTimer>0&&lockResets<MAX_RESETS){lockTimer=0;lockResets++;}
  return true;
}
function rotera(dir){
  if(!playing||paused||piece.type==='O')return false;
  const from=piece.rot,to=(from+dir+4)%4;
  const table=piece.type==='I'?KICKS.I:KICKS.normal;
  for(const[kx,ky]of table[`${from}>${to}`]){
    const nx=piece.x+kx,ny=piece.y-ky;
    if(!krock(piece.type,to,nx,ny)){
      piece.rot=to;piece.x=nx;piece.y=ny;
      spunT=piece.type==='T'&&tSpin();
      if(lockTimer>0&&lockResets<MAX_RESETS){lockTimer=0;lockResets++;}
      return true;
    }
  }
  return false;
}
function tSpin(){
  let horn=0;
  for(const[dx,dy]of[[0,0],[2,0],[0,2],[2,2]]){
    const cx=piece.x+dx,cy=piece.y+dy;
    if(cx<0||cx>=COLS||cy>=ROWS||(cy>=0&&grid[cy][cx]))horn++;
  }
  return horn>=3;
}
function spokY(){let y=piece.y;while(!krock(piece.type,piece.rot,piece.x,y+1))y++;return y;}

function las(){
  for(const[cx,cy]of celler(piece.type,piece.rot,piece.x,piece.y)){
    if(cy<0){slut();return;}
    grid[cy][cx]=piece.type;
  }
  const fulla=[];
  for(let y=0;y<ROWS;y++)if(grid[y].every(cell=>cell))fulla.push(y);
  if(fulla.length){
    clearFx={rader:fulla.slice(),t:.28};
    for(const y of fulla){grid.splice(y,1);grid.unshift(Array(COLS).fill(null));}
    lines+=fulla.length;
    const nivaFore=level;level=Math.floor(lines/10)+1;
    const svar=spunT?[400,800,1200,1600][fulla.length]:[0,100,300,500,800][fulla.length];
    const svartSlag=fulla.length===4||spunT;
    let poang=svar*level;
    if(svartSlag&&b2b)poang=Math.floor(poang*1.5);
    combo++;
    if(combo>0)poang+=50*combo*level;
    score+=poang;
    b2b=svartSlag;
    const namn=spunT?`T-spin ${['','single','double','triple'][fulla.length]||''}`.trim():['','Single','Double','Triple','TETRIS'][fulla.length];
    say(`${namn}! +${poang}${b2b&&svartSlag&&combo>0?' (back-to-back)':''}${combo>1?` · combo ${combo}`:''}`);
    if(level>nivaFore)say(`Nivå ${level}! Det går fortare nu.`);
  }else{
    combo=-1;
    if(spunT){score+=400*level;say(`T-spin! +${400*level}`);}
  }
  hud();
  if(playing)nyttStycke();
}
function hardDrop(){
  if(!playing||paused)return;
  const mal=spokY();score+=2*(mal-piece.y);piece.y=mal;las();hud();
}
function hall(){
  if(!playing||paused||holdUsed)return;
  const nuvarande=piece.type;
  if(hold){const byte=hold;hold=nuvarande;spawna(byte);}
  else{hold=nuvarande;nyttStycke();}
  holdUsed=true;hud();
}

function say(text){status.textContent=text;}
function hud(){
  document.querySelector('#score').textContent=score;
  document.querySelector('#level').textContent=level;
  document.querySelector('#lines').textContent=lines;
}
function gravitation(){const n=Math.min(level,20);return Math.pow(.8-(n-1)*.007,n-1);}

async function hamtaTopp(){
  try{
    const svar=await fetch(`../../api/highscores?game=${GAME}`,{cache:'no-store'});
    if(!svar.ok)throw new Error('nej');
    topp=(await svar.json()).scores||[];toppLage='fil';
  }catch(error){
    toppLage='lokalt';
    try{topp=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');}catch(e){topp=[];}
  }
}
async function skickaPoang(){
  const input=document.querySelector('#player');
  const namn=(input.value||'').trim().slice(0,12)||'ANONYM';
  try{localStorage.setItem(NAME_KEY,namn);}catch(error){}
  const post={game:GAME,name:namn,score,lines,level};
  try{
    const svar=await fetch('../../api/highscores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(post)});
    if(!svar.ok)throw new Error('nej');
    topp=(await svar.json()).scores||[];toppLage='fil';
  }catch(error){
    toppLage='lokalt';
    topp=[...topp,{name:namn,score,lines,level}].sort((a,b)=>b.score-a.score).slice(0,10);
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(topp));}catch(e){}
  }
}
function slut(){
  if(over)return;
  playing=false;over=true;paused=false;held.clear();
  const basta=topp.length?topp[0].score:0;
  say(`Slut! ${score} poäng på ${lines} rader.${score>basta?' Nytt rekord!':''} Tryck på Spela igen.`);
  document.querySelector('#start').textContent='Spela igen';
  if(score>0)skickaPoang();
}

function ruta(x,y,color,alpha){
  ctx.globalAlpha=alpha===undefined?1:alpha;
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x+1,y+1,CELL-2,CELL-2,5);ctx.fill();
  ctx.fillStyle='#ffffff38';ctx.beginPath();ctx.roundRect(x+4,y+4,CELL-8,5,2);ctx.fill();
  ctx.globalAlpha=1;
}
function panel(x,y,w,h,rubrik){
  ctx.fillStyle='#a6aabb';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillText(rubrik,x,y-6);
  ctx.fillStyle='#ffffff0d';ctx.beginPath();ctx.roundRect(x,y,w,h,8);ctx.fill();
}
function ritaMini(type,cx,cy,skala){
  const s=CELL*skala,form=SHAPES[type][0];
  const xs=form.map(c=>c[0]),ys=form.map(c=>c[1]);
  const bredd=(Math.max(...xs)-Math.min(...xs)+1)*s,hojd=(Math.max(...ys)-Math.min(...ys)+1)*s;
  const ox=cx-bredd/2-Math.min(...xs)*s,oy=cy-hojd/2-Math.min(...ys)*s;
  for(const[x,y]of form){
    ctx.fillStyle=COLORS[type];ctx.beginPath();ctx.roundRect(ox+x*s+1,oy+y*s+1,s-2,s-2,4);ctx.fill();
  }
}
function ritaTopp(){
  panel(8,158,142,214,`TOPPLISTA (${toppLage})`);
  ctx.font='bold 10px Arial';ctx.textBaseline='middle';
  if(!topp.length){ctx.fillStyle='#6f7486';ctx.textAlign='center';ctx.fillText('inga rekord än',79,264);return;}
  topp.slice(0,9).forEach((rad,i)=>{
    const y=176+i*22;
    ctx.textAlign='left';ctx.fillStyle=i===0?'#d5fb78':'#8d92a3';
    ctx.fillText(`${i+1}`,16,y);
    ctx.fillStyle=i===0?'#f3f3f7':'#a6aabb';
    ctx.fillText(String(rad.name||'ANONYM').slice(0,8),30,y);
    ctx.textAlign='right';ctx.fillStyle=i===0?'#d5fb78':'#8d92a3';
    ctx.fillText(String(rad.score),142,y);
  });
}
function draw(){
  ctx.setTransform(RES,0,0,RES,0,0);
  ctx.fillStyle='#181d26';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#10131a';ctx.fillRect(BX,BY,COLS*CELL,(ROWS-HIDDEN)*CELL);
  ctx.strokeStyle='#ffffff0a';ctx.lineWidth=1;
  for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(BX+x*CELL,BY);ctx.lineTo(BX+x*CELL,BY+(ROWS-HIDDEN)*CELL);ctx.stroke();}
  for(let y=0;y<=ROWS-HIDDEN;y++){ctx.beginPath();ctx.moveTo(BX,BY+y*CELL);ctx.lineTo(BX+COLS*CELL,BY+y*CELL);ctx.stroke();}
  for(let y=HIDDEN;y<ROWS;y++)for(let x=0;x<COLS;x++){
    if(grid[y][x])ruta(BX+x*CELL,BY+(y-HIDDEN)*CELL,COLORS[grid[y][x]]);
  }
  if(clearFx){
    ctx.fillStyle=`rgba(255,255,255,${Math.max(0,clearFx.t)*2})`;
    for(const y of clearFx.rader)if(y>=HIDDEN)ctx.fillRect(BX,BY+(y-HIDDEN)*CELL,COLS*CELL,CELL);
  }
  if(piece&&playing){
    const gy=spokY();
    for(const[cx,cy]of celler(piece.type,piece.rot,piece.x,gy))
      if(cy>=HIDDEN)ruta(BX+cx*CELL,BY+(cy-HIDDEN)*CELL,COLORS[piece.type],.22);
    for(const[cx,cy]of celler(piece.type,piece.rot,piece.x,piece.y))
      if(cy>=HIDDEN)ruta(BX+cx*CELL,BY+(cy-HIDDEN)*CELL,COLORS[piece.type]);
  }
  panel(8,26,142,86,'HÅLL');
  if(hold)ritaMini(hold,79,69,.72);
  ritaTopp();
  panel(406,26,146,212,'NÄSTA');
  queue.slice(0,3).forEach((type,i)=>ritaMini(type,479,62+i*68,i===0?.72:.56));
  const rader=[['POÄNG',score],['NIVÅ',level],['RADER',lines]];
  rader.forEach(([etikett,varde],i)=>{
    const y=274+i*62;
    ctx.fillStyle='#a6aabb';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillText(etikett,406,y);
    ctx.fillStyle='#f3f3f7';ctx.font='bold 22px Arial';ctx.fillText(String(varde),406,y+26);
  });
  if(b2b||combo>0){
    ctx.fillStyle='#d5fb78';ctx.font='bold 10px Arial';ctx.textAlign='left';
    ctx.fillText(`${b2b?'B2B ':''}${combo>0?`COMBO ${combo}`:''}`.trim(),406,470);
  }
  if(paused||over){
    ctx.fillStyle='#0b0d14d0';ctx.fillRect(BX,BY,COLS*CELL,(ROWS-HIDDEN)*CELL);
    ctx.fillStyle='#f3f3f7';ctx.font='bold 26px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(over?'SLUT':'PAUS',BX+COLS*CELL/2,BY+220);
    ctx.fillStyle='#a6aabb';ctx.font='bold 11px Arial';
    ctx.fillText(over?`${score} poäng`:'Tryck P för att fortsätta',BX+COLS*CELL/2,BY+250);
  }
}

function update(dt){
  if(!playing||paused)return;
  if(repeat.dir){
    repeat.timer-=dt;
    if(repeat.timer<=0){flytta(repeat.dir,0);repeat.timer=ARR;}
  }
  const mjuk=held.has('ner');
  fall+=dt*(mjuk?20:1);
  const steg=gravitation();
  while(fall>=steg){
    fall-=steg;
    if(krock(piece.type,piece.rot,piece.x,piece.y+1))break;
    piece.y++;if(mjuk)score++;
  }
  if(krock(piece.type,piece.rot,piece.x,piece.y+1)){
    lockTimer+=dt;
    if(lockTimer>=LOCK_DELAY){las();hud();}
  }else lockTimer=0;
}
function frame(time){
  const dt=Math.min((time-last)/1000,.05);last=time;
  update(dt);
  if(clearFx){clearFx.t-=dt;if(clearFx.t<=0)clearFx=null;}
  draw();
  requestAnimationFrame(frame);
}

function start(){
  grid=nyttGrid();bag=[];queue=[];hold=null;holdUsed=false;
  score=0;lines=0;level=1;combo=-1;b2b=false;clearFx=null;
  playing=true;over=false;paused=false;held.clear();repeat={dir:0,timer:0};
  nyttStycke();hud();
  say('Bygg rader. Mellanslag släpper, C håller, P pausar.');
  document.querySelector('#start').textContent='Spela igen';
}

const moveKeys={ArrowLeft:-1,a:-1,ArrowRight:1,d:1};
document.addEventListener('keydown',event=>{
  if(event.repeat)return;
  const key=event.key,lower=key.toLowerCase();
  const dir=moveKeys[key]!==undefined?moveKeys[key]:moveKeys[lower];
  if(dir!==undefined){event.preventDefault();if(flytta(dir,0)){repeat.dir=dir;repeat.timer=DAS;}return;}
  if(key==='ArrowDown'||lower==='s'){event.preventDefault();held.add('ner');return;}
  if(key==='ArrowUp'||lower==='x'){event.preventDefault();rotera(1);return;}
  if(lower==='z'){event.preventDefault();rotera(-1);return;}
  if(key===' '){event.preventDefault();hardDrop();return;}
  if(lower==='c'||key==='Shift'){event.preventDefault();hall();return;}
  if(lower==='p'){event.preventDefault();if(playing){paused=!paused;say(paused?'Pausat. Tryck P igen.':'Kör igen.');}}
});
document.addEventListener('keyup',event=>{
  const key=event.key,lower=key.toLowerCase();
  if(moveKeys[key]!==undefined||moveKeys[lower]!==undefined)repeat.dir=0;
  if(key==='ArrowDown'||lower==='s')held.delete('ner');
});
window.addEventListener('blur',()=>{held.clear();repeat.dir=0;});
const touch={vanster:()=>flytta(-1,0),hoger:()=>flytta(1,0),rotera:()=>rotera(1),hall:hall,drop:hardDrop};
document.querySelectorAll('[data-tap]').forEach(button=>button.addEventListener('click',()=>touch[button.dataset.tap]()));
const ned=document.querySelector('[data-hold="ner"]');
ned.addEventListener('pointerdown',event=>{ned.setPointerCapture(event.pointerId);held.add('ner');});
for(const name of['pointerup','pointercancel','lostpointercapture'])ned.addEventListener(name,()=>held.delete('ner'));
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&playing&&!over){paused=true;held.clear();repeat.dir=0;say('Pausat när du lämnade fliken. Tryck P för att fortsätta.');}
});

try{document.querySelector('#player').value=localStorage.getItem(NAME_KEY)||'';}catch(error){}
hamtaTopp();
start();requestAnimationFrame(frame);
