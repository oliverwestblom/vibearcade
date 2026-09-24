const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=640,H=480,GAME='vibe-slash',NAME_KEY='b3vibe-slash-namn',LOCAL_KEY='b3vibe-slash-topp';
// Rorelsen analyseras i lag upplosning: 160x120 = 19200 pixlar per bildruta.
const AW=160,AH=120,GW=20,GH=15,CW=W/GW,CH=H/GH;
const PIXEL_DIFF=26,CELL_HIT=.15,DECAY=4.2,START_LIV=3;
const video=document.createElement('video');
video.playsInline=true;video.muted=true;
const kam=document.createElement('canvas');kam.width=AW;kam.height=AH;
const kctx=kam.getContext('2d',{willReadFrequently:true});
let forra=null,energi=new Float32Array(GW*GH);
let strom=null,kameraPa=false,kameraFel='';
let objekt,bitar,gnistor,popup,blad,liv,poang,combo,comboTid,spawn,svarighet;
let playing=false,over=false,paused=false,last=0,topp=[],toppLage='läser…';
let pekare={x:0,y:0,nere:false,harForra:false};

function rutnat(x,y){const gx=Math.floor(x/CW),gy=Math.floor(y/CH);return gx<0||gy<0||gx>=GW||gy>=GH?-1:gy*GW+gx;}
function marker(x,y,mangd){const i=rutnat(x,y);if(i>=0)energi[i]=Math.min(1.6,energi[i]+mangd);}

async function slaPaKamera(){
  if(kameraPa)return stangKamera();
  try{
    strom=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
    video.srcObject=strom;await video.play();
    kameraPa=true;kameraFel='';forra=null;Foto.lana(video);
    say('Kameran är på. Vifta med handen för att skiva!');
  }catch(error){
    kameraPa=false;strom=null;
    kameraFel=error&&error.name==='NotAllowedError'?'Kameran nekades.':
      error&&error.name==='NotFoundError'?'Ingen kamera hittades.':
      !navigator.mediaDevices?'Kameran kräver https eller localhost.':`Kameran kunde inte startas (${error&&error.name||'fel'}).`;
    say(`${kameraFel} Du kan spela med musen så länge.`);
  }
  knapp();
}
function stangKamera(){
  if(strom)for(const spar of strom.getTracks())spar.stop();
  strom=null;video.srcObject=null;kameraPa=false;forra=null;Foto.slappLan();
  say('Kameran avstängd. Dra med musen för att skiva.');knapp();
}
function knapp(){
  const b=document.querySelector('#kamera');
  b.textContent=kameraPa?'Stäng kameran':'Slå på kameran';
  b.classList.toggle('primary',!kameraPa);
  document.querySelector('#lage').textContent=kameraPa?'kamera':'mus';
}

function lasRorelse(){
  if(!kameraPa||video.readyState<2)return;
  kctx.save();kctx.scale(-1,1);kctx.drawImage(video,-AW,0,AW,AH);kctx.restore();
  const bild=kctx.getImageData(0,0,AW,AH).data;
  const nu=new Uint8Array(AW*AH);
  for(let i=0,p=0;i<nu.length;i++,p+=4)nu[i]=(bild[p]*77+bild[p+1]*150+bild[p+2]*29)>>8;
  if(forra){
    const traffar=new Uint16Array(GW*GH);
    const perCellX=AW/GW,perCellY=AH/GH;
    for(let y=0;y<AH;y++){
      const gy=Math.min(GH-1,(y/perCellY)|0);
      for(let x=0;x<AW;x++){
        const i=y*AW+x;
        if(Math.abs(nu[i]-forra[i])>PIXEL_DIFF)traffar[gy*GW+Math.min(GW-1,(x/perCellX)|0)]++;
      }
    }
    const perCell=(AW/GW)*(AH/GH);
    for(let i=0;i<energi.length;i++){
      const andel=traffar[i]/perCell;
      if(andel>0)energi[i]=Math.min(1.6,energi[i]+andel*1.8);
    }
  }
  forra=nu;
}
function bladpunkt(){
  let sx=0,sy=0,sum=0;
  for(let i=0;i<energi.length;i++){
    if(energi[i]<CELL_HIT)continue;
    const gx=i%GW,gy=(i/GW)|0,v=energi[i];
    sx+=(gx+.5)*CW*v;sy+=(gy+.5)*CH*v;sum+=v;
  }
  return sum>CELL_HIT*1.5?{x:sx/sum,y:sy/sum,kraft:sum}:null;
}

const TYPER=['orb','melon','orb','melon','orb'];
function spawna(){
  const antal=1+(Math.random()<svarighet*.5?1:0)+(Math.random()<svarighet*.22?1:0);
  for(let i=0;i<antal;i++){
    const bomb=Math.random()<.13+svarighet*.1;
    const x=70+Math.random()*(W-140);
    objekt.push({
      x,y:H+40,r:bomb?28:30,
      vx:(W/2-x)*.45+(Math.random()-.5)*90,
      vy:-(560+Math.random()*130+svarighet*45),
      rot:Math.random()*6.3,spin:(Math.random()-.5)*3.4,
      typ:bomb?'bomb':TYPER[(Math.random()*TYPER.length)|0]
    });
  }
}
function skiva(o){
  if(o.typ==='bomb'){
    liv--;combo=0;gnista(o.x,o.y,'#ffb18b',26);say(`Det där var ett vibefat! ${Math.max(0,liv)} liv kvar.`);
    if(liv<=0)slut();
    hud();return;
  }
  combo++;comboTid=1.1;
  const varde=(o.typ==='melon'?15:10)*Math.max(1,combo);
  poang+=varde;
  popup.push({x:o.x,y:o.y,text:`+${varde}`,liv:.9});
  gnista(o.x,o.y,o.typ==='melon'?'#f3f3f6':'#2fc4dc',16);
  for(const sida of[-1,1])bitar.push({x:o.x,y:o.y,vx:o.vx*.35+sida*150,vy:o.vy*.35-60,r:o.r,rot:o.rot,spin:sida*4,typ:o.typ,sida,liv:1.5});
  hud();
}
function gnista(x,y,farg,antal){
  for(let i=0;i<antal;i++){
    const a=Math.random()*6.3,f=60+Math.random()*220;
    gnistor.push({x,y,vx:Math.cos(a)*f,vy:Math.sin(a)*f,liv:.35+Math.random()*.4,farg});
  }
}

function say(text){status.textContent=text;}
function hud(){
  document.querySelector('#score').textContent=poang;
  document.querySelector('#lives').textContent=Math.max(0,liv);
}
function slut(){
  if(over)return;
  playing=false;over=true;
  const basta=topp.length?topp[0].score:0;
  say(`Slut! ${poang} poäng.${poang>basta?' Nytt rekord!':''} Tryck på Spela igen.`);
  document.querySelector('#start').textContent='Spela igen';
  if(poang>0)skickaPoang();
}

let toppBild=null,toppBildUrl='';
function laddaToppBild(){
  const url=topp.length&&topp[0].photo?topp[0].photo:'';
  if(url===toppBildUrl)return;
  toppBildUrl=url;toppBild=null;
  if(!url)return;
  const bild=new Image();bild.onload=()=>{toppBild=bild;};bild.src=url;
}
async function hamtaTopp(){
  try{
    const svar=await fetch(`../../api/highscores?game=${GAME}`,{cache:'no-store'});
    if(!svar.ok)throw new Error('nej');
    topp=(await svar.json()).scores||[];toppLage='fil';laddaToppBild();
  }catch(error){
    toppLage='lokalt';
    try{topp=JSON.parse(localStorage.getItem(LOCAL_KEY)||'[]');}catch(e){topp=[];}laddaToppBild();
  }
}
async function skickaPoang(){
  const namn=(document.querySelector('#player').value||'').trim().slice(0,12)||'ANONYM';
  try{localStorage.setItem(NAME_KEY,namn);}catch(error){}
  try{
    const svar=await fetch('../../api/highscores',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({game:GAME,name:namn,score:poang,lines:0,level:Math.round(svarighet*10),photo:Foto.ta()})});
    if(!svar.ok)throw new Error('nej');
    topp=(await svar.json()).scores||[];toppLage='fil';laddaToppBild();
  }catch(error){
    toppLage='lokalt';
    topp=[...topp,{name:namn,score:poang}].sort((a,b)=>b.score-a.score).slice(0,10);
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(topp));}catch(e){}
  }
}

function update(dt){
  for(let i=0;i<energi.length;i++)energi[i]=Math.max(0,energi[i]-DECAY*dt);
  lasRorelse();
  const punkt=kameraPa?bladpunkt():(pekare.nere?{x:pekare.x,y:pekare.y,kraft:1}:null);
  if(punkt)blad.push({x:punkt.x,y:punkt.y,liv:.32});
  blad=blad.filter(p=>{p.liv-=dt;return p.liv>0});

  svarighet=Math.min(1,poang/900);
  spawn-=dt;
  if(spawn<=0){spawna();spawn=1.5-svarighet*.75+Math.random()*.5;}

  objekt=objekt.filter(o=>{
    o.vy+=900*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.rot+=o.spin*dt;
    const i=rutnat(o.x,o.y);
    if(i>=0&&energi[i]>=CELL_HIT){skiva(o);return false;}
    if(o.y>H+80&&o.vy>0){
      if(o.typ!=='bomb'){liv--;combo=0;hud();say(`Missad! ${Math.max(0,liv)} liv kvar.`);if(liv<=0)slut();}
      return false;
    }
    return true;
  });
  bitar=bitar.filter(b=>{b.vy+=900*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.rot+=b.spin*dt;b.liv-=dt;return b.liv>0&&b.y<H+120});
  gnistor=gnistor.filter(g=>{g.vy+=520*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.liv-=dt;return g.liv>0});
  popup=popup.filter(p=>{p.y-=52*dt;p.liv-=dt;return p.liv>0});
  if(comboTid>0){comboTid-=dt;if(comboTid<=0)combo=0;}
}

function ritaOrb(x,y,r,rot,halva){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  if(halva)ctx.beginPath(),ctx.rect(halva<0?-r:0,-r,r,r*2),ctx.clip();
  ctx.fillStyle='#2fc4dc';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffffff2e';ctx.beginPath();ctx.arc(-r*.3,-r*.35,r*.42,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(r*.9)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('b3',0,r*.04);
  ctx.restore();
}
function ritaMelon(x,y,r,rot,halva){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  if(halva)ctx.beginPath(),ctx.rect(halva<0?-r:0,-r,r,r*2),ctx.clip();
  ctx.fillStyle='#f3f3f6';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#15161c';
  for(let i=-3;i<=3;i++){ctx.save();ctx.rotate(i*.28);ctx.fillRect(i*r*.34-r*.07,-r*1.2,r*.16,r*2.4);ctx.restore();}
  ctx.restore();
  ctx.restore();
}
function ritaBomb(x,y,r,rot,halva){
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);
  if(halva)ctx.beginPath(),ctx.rect(halva<0?-r:0,-r,r,r*2),ctx.clip();
  ctx.fillStyle='#4a3826';ctx.beginPath();ctx.roundRect(-r*.8,-r,r*1.6,r*2,r*.45);ctx.fill();
  ctx.strokeStyle='#2a1f14';ctx.lineWidth=3;
  for(const dy of[-r*.45,0,r*.45]){ctx.beginPath();ctx.moveTo(-r*.8,dy);ctx.lineTo(r*.8,dy);ctx.stroke();}
  ctx.strokeStyle='#ffb18b';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,-r);ctx.quadraticCurveTo(r*.5,-r*1.4,r*.2,-r*1.7);ctx.stroke();
  ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.arc(r*.2,-r*1.78,4.5,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function ritaSak(o,halva){
  if(o.typ==='orb')ritaOrb(o.x,o.y,o.r,o.rot,halva);
  else if(o.typ==='melon')ritaMelon(o.x,o.y,o.r,o.rot,halva);
  else ritaBomb(o.x,o.y,o.r,o.rot,halva);
}

function draw(){
  ctx.fillStyle='#141824';ctx.fillRect(0,0,W,H);
  if(kameraPa&&video.readyState>=2){
    ctx.save();ctx.globalAlpha=.3;ctx.scale(-1,1);ctx.drawImage(video,-W,0,W,H);ctx.restore();
  }else{
    ctx.fillStyle='#1b2130';
    for(let y=0;y<H;y+=32)for(let x=0;x<W;x+=32)if(((x+y)/32)%2<1)ctx.fillRect(x,y,32,32);
  }
  ctx.fillStyle='#0f1420aa';ctx.fillRect(0,0,W,H);
  for(let i=0;i<energi.length;i++){
    if(energi[i]<.06)continue;
    ctx.fillStyle=`rgba(47,196,220,${Math.min(.3,energi[i]*.22)})`;
    ctx.fillRect((i%GW)*CW,((i/GW)|0)*CH,CW,CH);
  }
  for(const b of bitar){ctx.globalAlpha=Math.min(1,b.liv);ritaSak(b,b.sida);}
  ctx.globalAlpha=1;
  for(const o of objekt)ritaSak(o,0);
  for(const g of gnistor){ctx.globalAlpha=Math.max(0,g.liv*2.4);ctx.fillStyle=g.farg;ctx.fillRect(g.x-2,g.y-2,4,4);}
  ctx.globalAlpha=1;
  if(blad.length>1){
    ctx.strokeStyle='#d5fb78';ctx.lineCap='round';ctx.lineJoin='round';
    for(let i=1;i<blad.length;i++){
      ctx.globalAlpha=blad[i].liv*2.6;ctx.lineWidth=2+blad[i].liv*16;
      ctx.beginPath();ctx.moveTo(blad[i-1].x,blad[i-1].y);ctx.lineTo(blad[i].x,blad[i].y);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  for(const p of popup){ctx.globalAlpha=Math.max(0,p.liv);ctx.fillStyle='#d5fb78';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.fillText(p.text,p.x,p.y);}
  ctx.globalAlpha=1;
  ctx.fillStyle='#f3f3f7';ctx.font='bold 22px Arial';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillText(String(poang),16,34);
  for(let i=0;i<START_LIV;i++){ctx.fillStyle=i<liv?'#f76fae':'#ffffff22';ctx.fillRect(W-30-i*22,18,15,15);}
  if(combo>1){ctx.fillStyle='#d5fb78';ctx.font='bold 14px Arial';ctx.fillText(`COMBO x${combo}`,16,54);}
  ctx.fillStyle='#8d92a3';ctx.font='bold 10px Arial';
  ctx.fillText(kameraPa?'KAMERA':'MUS – DRA FÖR ATT SKIVA',16,H-14);
  if(topp.length){
    ctx.textAlign='right';ctx.fillStyle='#6f7486';
    ctx.fillText(`BÄST (${toppLage}): ${topp[0].name} ${topp[0].score}`,W-16,H-14);
  }
  if(over||paused){
    ctx.fillStyle='#0b0d14cc';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#f3f3f7';ctx.font='bold 30px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(over?'SLUT':'PAUS',W/2,H/2-10);
    ctx.fillStyle='#a6aabb';ctx.font='bold 12px Arial';
    ctx.fillText(over?`${poang} poäng`:'Tryck P för att fortsätta',W/2,H/2+20);
    if(over&&toppBild){
      const bw=150,bh=bw*toppBild.height/toppBild.width,bx=W/2-bw/2,by=H/2+44;
      ctx.drawImage(toppBild,bx,by,bw,bh);
      ctx.strokeStyle='#2fc4dc';ctx.lineWidth=2;ctx.strokeRect(bx,by,bw,bh);
      ctx.fillStyle='#8d92a3';ctx.font='bold 10px Arial';
      ctx.fillText(`REKORDET: ${topp[0].name} · ${topp[0].score}`,W/2,by+bh+14);
    }
  }
}

function frame(time){
  const dt=Math.min((time-last)/1000,.05);last=time;
  if(playing&&!paused)update(dt);
  draw();
  requestAnimationFrame(frame);
}

function start(){
  objekt=[];bitar=[];gnistor=[];popup=[];blad=[];
  energi=new Float32Array(GW*GH);forra=null;
  liv=START_LIV;poang=0;combo=0;comboTid=0;spawn=.7;svarighet=0;
  playing=true;over=false;paused=false;hud();
  say(kameraPa?'Vifta med handen för att skiva. Undvik vibefaten!':'Dra med musen för att skiva. Undvik vibefaten!');
  document.querySelector('#start').textContent='Spela igen';
}

function pekarpunkt(event){
  const r=canvas.getBoundingClientRect();
  const x=(event.clientX-r.left)*W/r.width,y=(event.clientY-r.top)*H/r.height;
  if(pekare.harForra){
    const dx=x-pekare.x,dy=y-pekare.y,langd=Math.hypot(dx,dy);
    // Stega langs draget sa snabba rorelser inte hoppar over objekt.
    const steg=Math.max(1,Math.ceil(langd/16));
    for(let i=1;i<=steg;i++)marker(pekare.x+dx*i/steg,pekare.y+dy*i/steg,.5);
  }
  pekare.x=x;pekare.y=y;pekare.harForra=true;pekare.nere=true;
}
canvas.addEventListener('pointerdown',event=>{canvas.setPointerCapture(event.pointerId);pekare.harForra=false;pekarpunkt(event);});
canvas.addEventListener('pointermove',event=>{if(!kameraPa&&(event.buttons||event.pointerType==='touch'))pekarpunkt(event);});
for(const namn of['pointerup','pointercancel','pointerleave'])canvas.addEventListener(namn,()=>{pekare.nere=false;pekare.harForra=false;});
document.querySelector('#kamera').addEventListener('click',slaPaKamera);
document.querySelector('#start').addEventListener('click',start);
document.addEventListener('keydown',event=>{
  if(event.key.toLowerCase()==='p'&&playing){event.preventDefault();paused=!paused;say(paused?'Pausat. Tryck P igen.':'Kör igen.');}
});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)return;
  if(playing)paused=true;
  // Slack kameralampan nar fliken doljs.
  if(kameraPa){stangKamera();say('Kameran stängdes när du lämnade fliken. Slå på den igen när du vill.');}
});

try{document.querySelector('#player').value=localStorage.getItem(NAME_KEY)||'';}catch(error){}
if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
  document.querySelector('#kamera').disabled=true;
  kameraFel='Kameran kräver https eller localhost.';
}
knapp();hamtaTopp();start();requestAnimationFrame(frame);
