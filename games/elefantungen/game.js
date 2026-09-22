const canvas=document.querySelector('#board'),ctx=canvas.getContext('2d'),status=document.querySelector('#status');
const W=720,H=480,FLOOR=376,KEY='b3vibe-elefantungen';
const RATE={mat:100/15,humor:100/20,energi:100/30},SLEEP_GAIN=100/8;
const POOP_EVERY=90,MAX_POOP=5,SICK_AFTER=45,DEAD_AFTER=360,OFFLINE_CAP=240;
let pet,fx,anim=0,last=0,blink=0,busy=null,busyTime=0,confirmTime=0,saveTime=0;

function fresh(){return{born:Date.now(),saved:Date.now(),mat:85,humor:85,energi:95,poop:[],poopTime:0,sover:false,sjuk:false,noll:0,sjukTid:0,dod:false,orsak:''};}
function save(){try{pet.saved=Date.now();localStorage.setItem(KEY,JSON.stringify(pet));}catch(error){}}
function load(){try{const raw=localStorage.getItem(KEY);if(!raw)return null;const p=JSON.parse(raw);return p&&typeof p.born==='number'&&Array.isArray(p.poop)?p:null;}catch(error){return null;}}
function alder(){return(Date.now()-pet.born)/60000;}
function steg(){const m=alder();return m<.5?'Ägg':m<15?'Kalv':m<60?'Unge':'Vuxen';}
function renlighet(){return Math.max(0,100-pet.poop.length*20);}

function advance(min,offline){
  if(pet.dod)return;
  const sjukMul=pet.sjuk?1.6:1;
  if(pet.sover){
    pet.energi=Math.min(100,pet.energi+SLEEP_GAIN*min);
    pet.mat=Math.max(0,pet.mat-RATE.mat*.45*min*sjukMul);
    pet.humor=Math.max(0,pet.humor-RATE.humor*.3*min);
    if(pet.energi>=100){pet.sover=false;if(!offline)say('Ungen vaknade utsövd och pigg.');}
  }else{
    pet.mat=Math.max(0,pet.mat-RATE.mat*min*sjukMul);
    pet.humor=Math.max(0,pet.humor-RATE.humor*min);
    pet.energi=Math.max(0,pet.energi-RATE.energi*min*sjukMul);
  }
  if(steg()!=='Ägg'){
    pet.poopTime+=min*60;
    while(pet.poopTime>=POOP_EVERY&&pet.poop.length<MAX_POOP){pet.poopTime-=POOP_EVERY;pet.poop.push({x:110+Math.random()*500});}
    pet.poopTime=Math.min(pet.poopTime,POOP_EVERY);
  }
  const brist=pet.mat<=0||pet.humor<=0||pet.energi<=0||renlighet()<=0;
  pet.noll=brist?pet.noll+min*60:0;
  if(pet.noll>SICK_AFTER&&!pet.sjuk){pet.sjuk=true;if(!offline)say('Ungen har blivit sjuk. Ge medicin!');}
  pet.sjukTid=pet.sjuk?pet.sjukTid+min*60:0;
  if(pet.sjukTid>DEAD_AFTER&&!offline)dod('Ungen blev för sjuk för länge.');
}
function dod(orsak){pet.dod=true;pet.orsak=orsak;pet.sover=false;say(`${orsak} Tryck på Nytt ägg för att börja om.`);save();}
function say(text){status.textContent=text;}
function pop(type,count){for(let i=0;i<count;i++)fx.push({type,x:360+(Math.random()-.5)*120,y:250+(Math.random()-.5)*80,vx:(Math.random()-.5)*60,vy:-40-Math.random()*50,life:.9+Math.random()*.5});}

function agera(name){
  if(pet.dod)return say('Ungen är borta. Tryck på Nytt ägg.');
  if(steg()==='Ägg')return say('Ägget har inte kläckts än. Ge det en stund.');
  if(name==='medicin'){
    if(!pet.sjuk)return say('Ungen är frisk. Spara medicinen.');
    pet.sjuk=false;pet.sjukTid=0;pet.noll=0;busy='medicin';busyTime=1.1;pop('plus',8);say('Medicinen hjälpte. Ungen piggnar till.');
  }else if(name==='sova'){
    pet.sover=!pet.sover;say(pet.sover?'Lampan är släckt. Ungen somnar.':'Ungen vaknade.');
  }else if(pet.sover){
    return say('Ungen sover. Väck den först med Sova.');
  }else if(name==='mata'){
    if(pet.mat>92)return say('Ungen är proppmätt.');
    pet.mat=Math.min(100,pet.mat+30);pet.humor=Math.min(100,pet.humor+3);busy='mata';busyTime=1.2;pop('smula',10);say('Nöff! Ungen sätter i sig maten.');
  }else if(name==='leka'){
    if(pet.energi<12)return say('Ungen är för trött för att leka.');
    pet.humor=Math.min(100,pet.humor+25);pet.energi=Math.max(0,pet.energi-8);pet.mat=Math.max(0,pet.mat-5);
    busy='leka';busyTime=1.3;pop('hjarta',8);say('Ungen skuttar av glädje.');
  }else if(name==='stada'){
    if(!pet.poop.length)return say('Redan rent och fint.');
    pet.poop=[];busy='stada';busyTime=1.1;pop('bubbla',10);say('Utskrapat och skinande rent.');
  }
  hud();save();
}

function hud(){
  document.querySelector('#age').textContent=alder()<60?`${Math.floor(alder())} min`:`${(alder()/60).toFixed(1)} tim`;
  document.querySelector('#stage').textContent=pet.dod?'Borta':steg();
  const med=document.querySelector('[data-action="medicin"]');
  med.disabled=!pet.sjuk||pet.dod;med.classList.toggle('primary',pet.sjuk&&!pet.dod);
}

function drawBar(x,y,label,value,color){
  ctx.fillStyle='#a6aabb';ctx.font='bold 10px Arial';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillText(label,x,y-6);
  ctx.fillStyle='#ffffff18';ctx.fillRect(x,y,155,12);
  ctx.fillStyle=value<25?'#ff7a7a':color;ctx.fillRect(x,y,155*Math.max(0,Math.min(100,value))/100,12);
}
function drawEgg(cx,base,t){
  const tilt=pet.dod?0:Math.sin(t*2.2)*.09;
  ctx.save();ctx.translate(cx,base-52);ctx.rotate(tilt);
  ctx.fillStyle='#f76fae';ctx.beginPath();ctx.ellipse(0,0,46,58,0,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.ellipse(0,0,46,58,0,0,Math.PI*2);ctx.clip();
  ctx.strokeStyle='#14151a';ctx.lineWidth=9;ctx.lineCap='round';
  for(let i=-2;i<3;i++){ctx.beginPath();ctx.moveTo(i*24-10,-62);ctx.quadraticCurveTo(i*24+12,0,i*24-8,62);ctx.stroke();}
  ctx.restore();
  ctx.restore();
}
function drawUnge(cx,base,t){
  const s=steg(),scale=s==='Kalv'?.74:s==='Unge'?.92:1.08;
  const glad=pet.humor>70&&!pet.sjuk,lag=pet.mat<25||pet.humor<25||pet.energi<25;
  const hop=pet.dod?0:pet.sover?Math.sin(t*1.4)*2:Math.sin(t*3)*(glad?6:3);
  ctx.save();ctx.translate(cx,base-hop);ctx.scale(scale,scale);
  if(pet.dod){ctx.globalAlpha=.55;ctx.rotate(.18);}
  const pink=pet.sjuk?'#d99bb8':'#f76fae',dark=pet.sjuk?'#bf83a0':'#e05494';
  ctx.fillStyle=dark;
  ctx.beginPath();ctx.roundRect(-46,-32,22,32,9);ctx.fill();
  ctx.beginPath();ctx.roundRect(24,-32,22,32,9);ctx.fill();
  ctx.fillStyle=pink;
  ctx.beginPath();ctx.roundRect(-36,-36,26,36,10);ctx.fill();
  ctx.beginPath();ctx.roundRect(10,-36,26,36,10);ctx.fill();
  ctx.beginPath();ctx.ellipse(0,-62,56,40,0,0,Math.PI*2);ctx.fill();
  if(s==='Vuxen'){
    ctx.save();ctx.beginPath();ctx.ellipse(0,-62,56,40,0,0,Math.PI*2);ctx.clip();
    ctx.fillStyle='#14151a';ctx.fillRect(-60,-106,120,34);
    ctx.strokeStyle='#f3f3f6';ctx.lineWidth=5;ctx.lineCap='round';
    for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(-56+i*18,-108);ctx.quadraticCurveTo(-48+i*18,-90,-58+i*18,-70);ctx.stroke();}
    ctx.restore();
    ctx.fillStyle='#2fc4dc';ctx.beginPath();ctx.arc(34,-58,17,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.font='bold 17px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('b3',34,-57);
  }
  ctx.fillStyle=dark;
  ctx.beginPath();ctx.ellipse(-54,-122,26,32,-.25,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(54,-122,26,32,.25,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=pink;ctx.beginPath();ctx.arc(0,-120,47,0,Math.PI*2);ctx.fill();
  const blinkar=blink>0&&!pet.sover&&!pet.dod;
  for(const side of[-1,1]){
    const ex=side*18,ey=-128;
    if(pet.dod){
      ctx.strokeStyle='#14151a';ctx.lineWidth=4;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(ex-7,ey-7);ctx.lineTo(ex+7,ey+7);ctx.moveTo(ex+7,ey-7);ctx.lineTo(ex-7,ey+7);ctx.stroke();
    }else if(pet.sover||blinkar){
      ctx.strokeStyle='#14151a';ctx.lineWidth=4;ctx.lineCap='round';
      ctx.beginPath();ctx.arc(ex,ey,9,.25*Math.PI,.75*Math.PI);ctx.stroke();
    }else{
      ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(ex,ey,11,12,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#1d9ad6';ctx.beginPath();ctx.arc(ex+side*1.5,ey+1,6.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#10131a';ctx.beginPath();ctx.arc(ex+side*1.5,ey+1,3.2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ex+side*1.5-2.5,ey-2.5,1.8,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.strokeStyle=pink;ctx.lineCap='round';
  const curl=pet.sover?6:Math.sin(t*2.6)*7,reach=busy==='mata'?14:0;
  ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(0,-104);ctx.quadraticCurveTo(6,-78,2+curl*.4,-58+reach);ctx.stroke();
  ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(2+curl*.4,-58+reach);ctx.quadraticCurveTo(10+curl,-44+reach,-2+curl,-34+reach);ctx.stroke();
  if(s!=='Kalv'){
    ctx.strokeStyle='#fdfdf4';ctx.lineWidth=7;
    ctx.beginPath();ctx.moveTo(-22,-98);ctx.quadraticCurveTo(-30,-82,-24,-72);ctx.stroke();
    ctx.beginPath();ctx.moveTo(22,-98);ctx.quadraticCurveTo(30,-82,24,-72);ctx.stroke();
  }
  if(!pet.dod&&!pet.sover){
    ctx.strokeStyle='#b8386f';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.beginPath();
    if(glad)ctx.arc(0,-96,13,.15*Math.PI,.85*Math.PI);
    else if(lag||pet.sjuk)ctx.arc(0,-78,13,1.15*Math.PI,1.85*Math.PI);
    else{ctx.moveTo(-9,-90);ctx.lineTo(9,-90);}
    ctx.stroke();
  }
  if(pet.sjuk&&!pet.dod){
    ctx.fillStyle='#9fd98a';
    ctx.beginPath();ctx.arc(-32,-104,7,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(32,-104,7,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}
function drawFx(){
  const glyph={hjarta:'♥',smula:'●',bubbla:'○',plus:'+',zzz:'z'};
  const color={hjarta:'#f76fae',smula:'#ffb18b',bubbla:'#2fc4dc',plus:'#d5fb78',zzz:'#b9a0ff'};
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const p of fx){
    ctx.globalAlpha=Math.max(0,Math.min(1,p.life));
    ctx.fillStyle=color[p.type];ctx.font=`bold ${p.type==='zzz'?22:18}px Arial`;
    ctx.fillText(glyph[p.type],p.x,p.y);
  }
  ctx.globalAlpha=1;
}
function draw(t){
  ctx.fillStyle='#181d26';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#232a36';ctx.fillRect(0,FLOOR,W,H-FLOOR);
  drawBar(20,40,'MAT',pet.mat,'#d5fb78');
  drawBar(195,40,'HUMÖR',pet.humor,'#f76fae');
  drawBar(370,40,'ENERGI',pet.energi,'#b9a0ff');
  drawBar(545,40,'RENT',renlighet(),'#2fc4dc');
  if(pet.sover){ctx.fillStyle='#0b0d14aa';ctx.fillRect(0,60,W,H-60);}
  for(const p of pet.poop){
    ctx.fillStyle='#6b4a32';
    ctx.beginPath();ctx.ellipse(p.x,FLOOR+22,15,9,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(p.x,FLOOR+11,10,7,0,0,Math.PI*2);ctx.fill();
  }
  if(steg()==='Ägg'&&!pet.dod)drawEgg(360,FLOOR,t);else drawUnge(360,FLOOR,t);
  drawFx();
  if(pet.sover){ctx.fillStyle='#b9a0ff';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText('SOVER',360,H-24);}
}

function frame(time){
  const dt=Math.min((time-last)/1000,.05);last=time;anim+=dt;
  const gap=Date.now()-pet.saved;
  if(gap>500){advance(gap/60000,false);pet.saved=Date.now();}
  blink=blink>0?blink-dt:(Math.random()<dt*.35?.16:0);
  if(busyTime>0){busyTime-=dt;if(busyTime<=0)busy=null;}
  if(confirmTime>0){confirmTime-=dt;if(confirmTime<=0)document.querySelector('#start').textContent='Nytt ägg';}
  if(pet.sover&&Math.random()<dt*1.1)fx.push({type:'zzz',x:390+Math.random()*30,y:240,vx:16,vy:-34,life:1.4});
  fx=fx.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;return p.life>0;});
  saveTime+=dt;if(saveTime>5){saveTime=0;save();}
  hud();draw(anim);
  requestAnimationFrame(frame);
}

function nyttAgg(){pet=fresh();fx=[];busy=null;say('Ett nytt ägg! Det kläcks om en liten stund.');document.querySelector('#start').textContent='Nytt ägg';confirmTime=0;hud();save();}

document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>agera(button.dataset.action)));
const keyMap={1:'mata',2:'leka',3:'stada',4:'sova',5:'medicin'};
document.addEventListener('keydown',event=>{const name=keyMap[event.key];if(name){event.preventDefault();agera(name);}});
document.querySelector('#start').addEventListener('click',()=>{
  if(pet.dod||alder()<1||confirmTime>0)return nyttAgg();
  confirmTime=3.5;document.querySelector('#start').textContent='Säkert? Klicka igen';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
window.addEventListener('pagehide',save);

pet=load()||fresh();fx=[];
const borta=Date.now()-pet.saved;
if(borta>60000&&!pet.dod){
  advance(Math.min(borta/60000,OFFLINE_CAP),true);
  const min=Math.floor(borta/60000);
  say(pet.sjuk?`Du var borta i ${min} min. Ungen hann bli sjuk — ge medicin!`:`Välkommen tillbaka! Du var borta i ${min} min.`);
}else if(pet.dod)say(`${pet.orsak} Tryck på Nytt ägg för att börja om.`);
else say('Sköt om din elefantunge. Mata, lek, städa och släck lampan.');
pet.saved=Date.now();hud();save();requestAnimationFrame(frame);
