// Original illustrated sprites shared by the battlefield and interface.
const VM_ART = (() => {
  const races=['frost','eld','natur','storm','berg','tvilling','kristall','skrot','djup'];
  const waveNames=['Snögobliner','Sköldkobolder','Vintervargar','Isspindlar','Snöjätten','Isgolemer','Frosthökar','Sabeltandskatter','Runkultister','Frostbjörnen','Skelettgardet','Frostskarabéer','Pansarnoshörningar','Isgargoyler','Isormen','Isrävar','Maskmagiker','Grottfladdermöss','Hornriddare','Vinterhäxan','Snöugglor','Obsidiangolemer','Vildsvin','Blåslim','Glaciärkungen','Kristallpräster','Nordräder','Isdrakar','Pansarsköldpaddor','Nordanvinden','Frostraptorer','Taggkrabbor','Runvålnader','Pälsjägare','Polarfénixar','Stenmammutar','Frosthundar','Runväktare','Pansarbaggar','Hertig Frostmaul'];
  const images={}, failed=[];
  // Asset order is permanent even when balance changes reorder the shop.
  const atlasRows=[
    ['iskloss','frostbage','glaciarkanon','snostorm'],
    ['glodsten','pilgnista','mortel','lavaspira'],
    ['tornbuske','ekskytt','giftblomma','rotfalla'],
    ['gnista','kedjespira','vindtorn','askaltare'],
    ['bergvagg','stenknytnave','klyvarjatte','jordskalv','stenslunga'],
    ['spegelsten','tvillingpil','solkor','stjarnkarna'],
    ['kristallvagg','prismaskytt','splitterspira','himlaglans'],
    ['skrothog','nitpistol','krutkanon','kraftverk'],
    ['korallvagg','tidvatten','valkalla','djuphavsoga']
  ];
  function towerCell(id) {
    const row=atlasRows.findIndex(ids=>ids.includes(id));
    return row<0?null:[row,atlasRows[row].indexOf(id)];
  }
  function draw(ctx,kind,id,x,y,size) {
    const img=images[kind]; if(!img)return false;
    let sx,sy,sw,sh;
    if(kind==='towers') {
      const cell=towerCell(id); if(!cell)return false;
      const [row,col]=cell, rows=[0,179,348,524,707,884,1070,1253,1440,1681];
      sx=col*img.width/5; sy=rows[row]*img.height/1681; sw=img.width/5;sh=(rows[row+1]-rows[row])*img.height/1681;
    } else {
      const index=((Number(id)%40)+40)%40;sw=img.width/8;const rows=[0,218,420,615,805,992],row=Math.floor(index/8);sh=(rows[row+1]-rows[row])*img.height/992;sx=(index%8)*sw;sy=rows[row]*img.height/992;
    }
    if(kind==='enemies'){const inset=sw*.045;sx+=inset;sw-=inset*2;sy+=3;sh-=6;}
    const scale=Math.min(size/sw,size/sh);
    ctx.drawImage(img,sx,sy,sw,sh,x-sw*scale/2,y-sh*scale/2,sw*scale,sh*scale);return true;
  }
  // Distance-driven cycles stop with the creature and naturally follow slow/speed effects.
  function motion(f, reduced=false) {
    const face=Math.cos(f.vinkel || 0)<-.15?-1:1;
    if(reduced)return {face,bob:0,tilt:0,sx:1,sy:1,shadow:1,step:0};
    const phase=(f.gatt || 0)*(f.boss?3.8:f.luft?5:7)+(f.id || 0)*2.399;
    const beat=Math.sin(phase), stride=Math.cos(phase), heavy=f.boss?.65:1;
    if(f.luft)return {face,bob:-2.5-beat*2,tilt:stride*.045,sx:1+beat*.09,sy:1-beat*.035,shadow:.9+beat*.08,step:0};
    const crawl=[3,11,14,23,28,31,38].includes(f.utseende);
    return {face,bob:crawl?-Math.abs(beat)*.6:-Math.abs(beat)*1.8*heavy,
      tilt:stride*(crawl?.075:.055)*heavy,sx:1+beat*(crawl?.045:.025),
      sy:1-beat*(crawl?.025:.035),shadow:1-Math.abs(beat)*.08,step:stride};
  }
  function portrait(kind,id,label,size=100) {
    const c=document.createElement('canvas'); c.width=c.height=size*2;c.className='vm-portrait';
    c.dataset.vmArt=kind;c.dataset.artId=id;c.setAttribute('role','img');c.setAttribute('aria-label',label);
    paint(c);return c;
  }
  function paint(c) {
    const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
    if(!draw(ctx,c.dataset.vmArt,c.dataset.artId,c.width/2,c.height/2,c.width*.94)) {
      ctx.fillStyle='#9ab9ce';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText('✦',c.width/2,c.height/2);
    }
  }
  async function load() {
    await Promise.all(['towers','enemies'].map(kind=>new Promise(resolve=>{
      const img=new Image();img.onload=()=>{images[kind]=img;resolve();};
      img.onerror=()=>{failed.push(kind);resolve();};img.src='bilder/'+kind+'-atlas.webp';
    })));
    document.querySelectorAll('canvas[data-vm-art]').forEach(paint);
    return failed;
  }
  return {draw,portrait,load,waveNames,towerCell,motion};
})();
