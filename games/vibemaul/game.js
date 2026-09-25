// Vibemaul – rendering, input och gransnitt. All spellogik finns i sim.js.
const D = VM_DATA, S = VM_SIM;
const $ = id => document.getElementById(id);
const canvas = $('board'), g = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, CELL = 40, X0 = 8, Y0 = 8, STEG = 1 / 60;
const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const px = v => v * CELL;
const cx = kol => X0 + (kol + 0.5) * CELL, cy = rad => Y0 + (rad + 0.5) * CELL;

let s = null;                     // aktuell match
let valtTyp = null, valtTorn = null, hover = null;
const markerade = new Set();   // flerval av torn
let fart = 1, pausad = false, acc = 0, senast = 0, klocka = 0;
let effekter = [], bakgrund = null, sparat = {};
const MALNAMN = { forst: 'Först', sist: 'Sist', stark: 'Starkast', nara: 'Närmast' };

// ---------- inställningar ----------
try { sparat = JSON.parse(localStorage.getItem('vibemaul-val') || '{}') || {}; } catch (e) { sparat = {}; }
let setup = { karta: D.KARTOR[0].id, lage: sparat.lage || 'valj', svarighet: sparat.svarighet || 'normal',
  byggare: Array.isArray(sparat.byggare) ? sparat.byggare : ['frost'], extra: sparat.extra !== false, oandlig: !!sparat.oandlig, test: !!sparat.test };
function spara() { try { localStorage.setItem('vibemaul-val', JSON.stringify(setup)); } catch (e) { /* privat lage */ } }

const say = text => { $('status').textContent = text; };
const nr = n => Math.floor(n).toLocaleString('sv-SE');
const byggarFarg = typ => D.BYGGARE_AV[D.TORN[typ].byggare].farg;

// ---------- bakgrund ----------
function ritaKarta(ctx, karta, skala = 1) {
  const f = karta.farger;
  ctx.save(); ctx.scale(skala, skala);
  ctx.fillStyle = '#0d1018'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = f.mark; ctx.fillRect(X0, Y0, D.KOL * CELL, D.RAD * CELL);
  // Halvrutor (byggnätet) svagt, hela rutor lite tydligare.
  ctx.lineWidth = 1;
  for (let k = 0; k <= D.KOL * 2; k++) { ctx.strokeStyle = k % 2 ? f.rutnat + '66' : f.rutnat; ctx.beginPath(); ctx.moveTo(X0 + k * CELL / 2 + .5, Y0); ctx.lineTo(X0 + k * CELL / 2 + .5, Y0 + D.RAD * CELL); ctx.stroke(); }
  for (let r = 0; r <= D.RAD * 2; r++) { ctx.strokeStyle = r % 2 ? f.rutnat + '66' : f.rutnat; ctx.beginPath(); ctx.moveTo(X0, Y0 + r * CELL / 2 + .5); ctx.lineTo(X0 + D.KOL * CELL, Y0 + r * CELL / 2 + .5); ctx.stroke(); }
  // Snoflingor i marken, deterministiskt utplacerade.
  ctx.fillStyle = '#ffffff0d';
  for (let i = 0; i < 90; i++) { const x = X0 + ((i * 97) % (D.KOL * CELL)), y = Y0 + ((i * 53 + i * i) % (D.RAD * CELL)); ctx.fillRect(x, y, 2, 2); }
  for (const [k, r] of karta.stenar) {
    const x = X0 + k * CELL, y = Y0 + r * CELL;
    ctx.fillStyle = f.sten; rundRekt(ctx, x + 3, y + 3, CELL - 6, CELL - 6, 8); ctx.fill();
    ctx.fillStyle = f.stenKant;
    ctx.beginPath(); ctx.moveTo(x + 12, y + 30); ctx.lineTo(x + 18, y + 10); ctx.lineTo(x + 24, y + 30); ctx.closePath(); ctx.globalAlpha = .6; ctx.fill(); ctx.globalAlpha = 1;
  }
  portal(ctx, karta.start, '#7cf2be', 'S');
  karta.checkpoints.forEach((c, i) => portal(ctx, c, '#ffe08a', String(i + 1)));
  portal(ctx, karta.mal, '#ff6f91', '⚑');
  ctx.restore();
}
function portal(ctx, c, farg, text) {
  const x = cx(c.kol), y = cy(c.rad);
  ctx.fillStyle = farg + '33'; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = farg; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = farg; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}
function rundRekt(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function nyBakgrund() {
  const b = document.createElement('canvas'); b.width = W; b.height = H;
  ritaKarta(b.getContext('2d'), s.karta); return b;
}

// ---------- ritning ----------
// punkter i hela rutor ({x, y}), t.ex. rutt.punkter.
function ritaRutt(punkter, farg, streck, bredd = 3) {
  if (!punkter || punkter.length < 2) return;
  g.save(); g.strokeStyle = farg; g.lineWidth = bredd; g.lineJoin = 'round'; g.lineCap = 'round'; g.setLineDash(streck);
  g.lineDashOffset = reduced ? 0 : -klocka * 18;
  g.beginPath(); g.moveTo(X0 + px(punkter[0].x), Y0 + px(punkter[0].y));
  for (const p of punkter) g.lineTo(X0 + px(p.x), Y0 + px(p.y));
  g.stroke(); g.restore();
}

function ritaTorn(t, spoke = false) {
  const def = D.TORN[t.typ], farg = byggarFarg(t.typ), x = cx(t.kol), y = cy(t.rad);
  const index = D.BYGGARE_AV[def.byggare].torn.findIndex(d => d.id === t.typ);
  g.save(); if(spoke)g.globalAlpha=.55;
  // Small race-colored foundations preserve cell readability under detailed art.
  g.fillStyle=farg+'25';g.strokeStyle=farg+'88';g.lineWidth=1;
  rundRekt(g,x-18,y-18,36,36,6);g.fill();g.stroke();
  if(t.niva>=3){g.strokeStyle=t.niva===5?'#ffe5a0':farg;g.lineWidth=t.niva===5?2:1;g.beginPath();g.arc(x,y,17,0,Math.PI*2);g.stroke();}
  const illustrated=VM_ART.draw(g,'towers',t.typ,x,y-2,44);
  g.restore();
  if(illustrated){
    for(let i=0;i<(t.niva||1);i++){g.fillStyle=i===4?'#ffe5a0':'#e5f5ff';g.fillRect(x-12+i*6,y+14,4,3);}
    return;
  }

  g.save(); if (spoke) g.globalAlpha = .55;
  g.fillStyle = '#0c0f16'; rundRekt(g, x - 17, y - 17, 34, 34, 7); g.fill();
  g.fillStyle = farg + '40'; g.strokeStyle = farg; g.lineWidth = 2; rundRekt(g, x - 16, y - 16, 32, 32, 7); g.fill(); g.stroke();
  g.translate(x, y);
  if (index === 0) {
    // Vaggtorn: en kloss med ett litet oga.
    g.fillStyle = farg; rundRekt(g, -9, -9, 18, 18, 4); g.fill();
    g.fillStyle = '#0c0f16'; g.beginPath(); g.arc(0, 0, 3, 0, Math.PI * 2); g.fill();
  } else {
    // Formen visar vad tornet gor: broms = snoflinga, gift = blomma,
    // kedja = kristall, omrade = kanon, kaos = stjarna, annars en pil.
    g.fillStyle = farg; g.strokeStyle = farg;
    if (def.aura) {
      // Kraftverk: pulserande ring med blixt.
      const puls = reduced ? 0 : (Math.sin(klocka * 4) + 1) * 1.5;
      g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 10 + puls, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(3, -9); g.lineTo(-4, 1); g.lineTo(1, 1); g.lineTo(-3, 9); g.lineTo(5, -2); g.lineTo(0, -2); g.closePath(); g.fill();
    } else if (def.narstrid && def.virvel) {
      // Jordskalv: taggig ring.
      g.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 7 : 13, a = i * Math.PI / 8; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    } else if (def.narstrid) {
      // Narstrid: knytnave eller yxa riktad mot malet.
      g.rotate(t.vinkel || 0);
      if (def.omrade) { g.fillRect(-10, -2, 16, 4); g.beginPath(); g.moveTo(4, -11); g.quadraticCurveTo(16, 0, 4, 11); g.lineTo(4, -11); g.fill(); }
      else { rundRekt(g, -6, -9, 16, 18, 5); g.fill(); g.fillStyle = '#0c0f1688'; for (let i = 0; i < 3; i++) g.fillRect(6, -7 + i * 5, 4, 2); }
    } else if (def.synergi) {
      // Synergi: hexagon, fylld i proportion till bonusen.
      const st = s ? S.stats(s, t) : { synergi: 0 };
      g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); } g.closePath(); g.stroke();
      g.globalAlpha *= 0.35 + 0.65 * Math.min(1, st.synergi / (def.synergi.max * def.synergi.perTorn));
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); } g.closePath(); g.fill();
    } else if (def.multiskott) {
      g.rotate(t.vinkel || 0);
      for (const dy of [-7, 0, 7]) { g.beginPath(); g.moveTo(12, dy); g.lineTo(-4, dy - 4); g.lineTo(-4, dy + 4); g.closePath(); g.fill(); }
    } else if (def.kyla) {
      g.lineWidth = 3; g.lineCap = 'round'; g.rotate(klocka * .5);
      for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-12, 0); g.lineTo(12, 0); g.stroke(); }
      g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fill();
    } else if (def.gift) {
      for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -7, 4, 7, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.fill();
    } else if (def.kedja) {
      g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 0); g.lineTo(0, 13); g.lineTo(-9, 0); g.closePath(); g.fill();
      g.fillStyle = '#ffffffcc'; g.beginPath(); g.moveTo(2, -8); g.lineTo(-3, 1); g.lineTo(1, 1); g.lineTo(-2, 8); g.lineTo(4, -1); g.lineTo(0, -1); g.closePath(); g.fill();
    } else if (def.attack === 'kaos' && !def.omrade) {
      g.rotate(klocka);
      g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 13, a = i * Math.PI / 5; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    } else if (def.omrade) {
      g.rotate(t.vinkel || 0);
      g.beginPath(); g.arc(-2, 0, def.attack === 'kaos' ? 10 : 9, 0, Math.PI * 2); g.fill(); g.fillRect(2, -4, 13, 8);
      if (def.attack === 'kaos') { g.fillStyle = '#ffffffaa'; g.beginPath(); g.arc(-2, 0, 3.5, 0, Math.PI * 2); g.fill(); }
    } else {
      g.rotate(t.vinkel || 0);
      g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -9); g.lineTo(-4, 0); g.lineTo(-8, 9); g.closePath(); g.fill();
      if (def.mal !== 'luft') { g.fillStyle = '#ffffff99'; g.fillRect(-11, -1.5, 8, 3); }
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.translate(x, y);
    if (def.mal === 'luft') { g.strokeStyle = '#9fd8ff'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }
  g.restore();
  // Nivapunkter.
  for (let i = 0; i < (t.niva || 1); i++) {
    g.fillStyle = i === 4 ? '#8ff0e8' : '#fff';
    g.beginPath(); g.arc(x - 12 + i * 6, y + 13, i === 4 ? 2.6 : 2, 0, Math.PI * 2); g.fill();
  }
}

function ritaFiende(f) {
  const x=X0+px(f.x),y=Y0+px(f.y),r=px(f.r), size=f.boss?66:f.luft?42:Math.max(28,r*2.8);
  const lift=f.luft?-5:0, pose=VM_ART.motion(f,reduced);
  g.save();
  g.fillStyle='#0006';g.beginPath();g.ellipse(x,y+6,size*.28*pose.shadow,size*.12*pose.shadow,0,0,Math.PI*2);g.fill();
  // Keep feet near the ground while the upper body rocks through each stride.
  g.save();g.translate(x,y+lift+size*.28);
  g.scale(pose.face*pose.sx,pose.sy);g.rotate(pose.tilt);
  if(!VM_ART.draw(g,'enemies',f.utseende??0,0,-size*.28+pose.bob,size)){
    g.fillStyle=f.farg;g.beginPath();g.arc(0,-size*.28,r,0,Math.PI*2);g.fill();
  }
  g.restore();
  if(f.kyla>0){g.strokeStyle='#7fe3ff';g.lineWidth=2;g.beginPath();g.ellipse(x,y+7,size*.32,5,0,0,Math.PI*2);g.stroke();}
  if(f.gift){g.strokeStyle='#8de06a';g.setLineDash([3,3]);g.beginPath();g.arc(x,y+lift,r+4,0,Math.PI*2);g.stroke();g.setLineDash([]);}
  if(f.immunMagi){g.strokeStyle='#f76fae';g.lineWidth=1.5;g.beginPath();g.arc(x,y+lift,r+6,klocka*2,klocka*2+Math.PI*1.4);g.stroke();}
  const bw=f.boss?48:Math.max(20,r*2),barY=y-size*.43+lift,andel=Math.max(0,f.halsa/f.maxHalsa);
  g.fillStyle='#071019';g.fillRect(x-bw/2-1,barY-1,bw+2,5);
  g.fillStyle=f.boss?'#f8c16f':andel>.5?'#8de0ba':andel>.25?'#ffe08a':'#ff6f91';g.fillRect(x-bw/2,barY,bw*andel,3);
  // A wing glyph and boss diamond stay readable independently of the portrait.
  if(f.luft||f.boss){g.fillStyle=f.boss?'#ffd38c':'#aeeaff';g.font='bold 10px Arial';g.textAlign='center';g.fillText(f.boss?'◆':'⌁',x,barY-4);}
  g.restore();
}

function ritaHover() {
  if (!hover || !s || !['bygg', 'strid'].includes(s.fas)) return;
  const { kol, rad } = hover;
  if (valtTyp) {
    if (s.fas === 'strid') {
      g.fillStyle = '#ff4f8b1c';
      for (const i of S.uppbokadeRutor(s)) { const k = i % S.FK, r = (i - k) / S.FK; g.fillRect(X0 + k * CELL / 2, Y0 + r * CELL / 2, CELL / 2, CELL / 2); }
    }
    const prov = S.provaBygge(s, valtTyp, kol, rad);
    if (prov.rutt) ritaRutt(prov.rutt.punkter, prov.ok ? '#d5fb78cc' : '#ffe08a99', [6, 6], 2.5);
    const def = D.TORN[valtTyp];
    g.strokeStyle = prov.ok ? '#d5fb7888' : '#ff6f9188'; g.fillStyle = prov.ok ? '#d5fb7810' : '#ff6f9110';
    g.beginPath(); g.arc(cx(kol), cy(rad), px(def.rackvidd), 0, Math.PI * 2); g.fill(); g.stroke();
    if (prov.ok || prov.rutt) ritaTorn({ typ: valtTyp, kol, rad, niva: 1, vinkel: -Math.PI / 2 }, true);
    if (!prov.ok && !prov.rutt) { g.strokeStyle = '#ff6f91'; g.lineWidth = 3; g.beginPath();
      g.moveTo(cx(kol) - 10, cy(rad) - 10); g.lineTo(cx(kol) + 10, cy(rad) + 10); g.moveTo(cx(kol) + 10, cy(rad) - 10); g.lineTo(cx(kol) - 10, cy(rad) + 10); g.stroke(); }
    if (prov.rutt) {
      const diff = prov.rutt.langd - s.rutt.langd;
      g.font = 'bold 12px Arial'; g.textAlign = 'center'; g.fillStyle = diff > 0 ? '#d5fb78' : '#a6aabb';
      const text = Math.abs(diff) < 0.05 ? '±0' : `${diff > 0 ? '+' : ''}${diff.toFixed(1).replace('.', ',')} rutor`;
      g.fillText(text, cx(kol), cy(rad) - 24);
    }
  } else if (dra && dra.ruta) {
    // Markeringsrektangel.
    const x0 = X0 + px(Math.min(dra.x, hover.x)), y0 = Y0 + px(Math.min(dra.y, hover.y));
    const w = px(Math.abs(hover.x - dra.x)), h = px(Math.abs(hover.y - dra.y));
    g.fillStyle = '#d5fb7814'; g.strokeStyle = '#d5fb78aa'; g.lineWidth = 1.5; g.setLineDash([5, 4]);
    g.fillRect(x0, y0, w, h); g.strokeRect(x0, y0, w, h); g.setLineDash([]);
  } else {
    const t = S.tornVid(s, hover.x, hover.y);
    if (t) { g.strokeStyle = '#ffffff55'; g.lineWidth = 1.5; rundRekt(g, cx(t.kol) - 18, cy(t.rad) - 18, 36, 36, 8); g.stroke(); }
  }
}

function ritaEffekter(dt) {
  for (const e of effekter) {
    e.liv -= dt; const a = Math.max(0, e.liv / e.max);
    g.save(); g.globalAlpha = a;
    if (e.typ === 'text') { g.fillStyle = e.farg; g.font = `bold ${e.storlek || 12}px Arial`; g.textAlign = 'center'; g.fillText(e.text, e.x, e.y - (1 - a) * 22); }
    else if (e.typ === 'ring') { g.strokeStyle = e.farg; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y, e.r * (1.2 - a * .4), 0, Math.PI * 2); g.stroke(); }
    else if (e.typ === 'blixt') { g.strokeStyle = e.farg; g.lineWidth = 2.5; g.beginPath(); e.punkter.forEach((p, i) => {
        const x = X0 + px(p.x) + (i && i < e.punkter.length ? (Math.random() - .5) * 6 : 0), y = Y0 + px(p.y);
        i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); }
    else if (e.typ === 'blink') { g.fillStyle = e.farg; g.fillRect(0, 0, W, H); }
    g.restore();
  }
  effekter = effekter.filter(e => e.liv > 0);
}

function tomHandelser() {
  for (const h of s.handelser) {
    const x = X0 + px(h.x || 0), y = Y0 + px(h.y || 0);
    if (h.typ === 'dod') {
      effekter.push({ typ: 'text', text: `+${h.belaning}`, farg: '#ffe08a', x, y, liv: .8, max: .8 });
      if (!reduced) effekter.push({ typ: 'ring', farg: h.farg, x, y, r: h.boss ? 34 : 14, liv: .3, max: .3 });
    } else if (h.typ === 'slag' && !reduced) effekter.push({ typ: 'ring', farg: h.farg, x, y, r: 10, liv: .15, max: .15 });
    else if (h.typ === 'small' && !reduced) effekter.push({ typ: 'ring', farg: h.farg, x, y, r: px(h.r), liv: .25, max: .25 });
    else if (h.typ === 'blixt') effekter.push({ typ: 'blixt', farg: '#e6dcff', punkter: h.punkter, liv: .18, max: .18 });
    else if (h.typ === 'lacka') {
      effekter.push({ typ: 'text', text: `−${h.liv} liv`, farg: '#ff6f91', x, y, liv: 1.1, max: 1.1, storlek: 14 });
      if (!reduced) effekter.push({ typ: 'blink', farg: '#ff4f8b22', liv: .2, max: .2 });
    } else if (h.typ === 'kristall') {
      effekter.push({ typ: 'text', text: '+1 frostkristall', farg: '#8ff0e8', x, y: y - 16, liv: 1.6, max: 1.6, storlek: 14 });
      say(`${h.namn} föll! Du fick en frostkristall – den låser upp nivå 5 på ett torn.`);
    } else if (h.typ === 'vagklar' && s.fas === 'vinst') say(`Våg ${h.nummer} klar – porten håller och vintern är över!`);
    else if (h.typ === 'vagklar') say(`Våg ${h.nummer} klar. +${h.bonus} guld i vågbonus. Bygg om, uppgradera och starta nästa våg.`);
    else if (h.typ === 'forlust' || h.typ === 'vinst') setTimeout(visaSlut, 600);
  }
  s.handelser.length = 0;
  if (s.erbjudande && !$('erbjudande').open) visaErbjudande();
}

function rita(dt) {
  if (!s) { g.fillStyle = '#0d1018'; g.fillRect(0, 0, W, H); return; }
  g.drawImage(bakgrund, 0, 0);
  const nasta = s.fas === 'bygg' ? D.vag(s.vag, s.svarighet) : s.aktuellVag;
  if (nasta && nasta.luft) ritaRutt(s.maze.luftStopp().map(S.finMitt), '#9fd8ff88', [2, 7], 2.5);
  ritaRutt(s.rutt.punkter, valtTyp && hover ? '#ffffff30' : '#ffffff55', [8, 8], 3);
  const valt = markerade.size === 1 ? s.torn.find(t => t.id === valtTorn) : null;
  if (valt) {
    const st = S.stats(s, valt), vdef = D.TORN[valt.typ];
    // Kraftverkets cirkel ar dess aura; annars rackvidden.
    g.fillStyle = vdef.aura ? '#ffd16614' : '#d5fb7812'; g.strokeStyle = vdef.aura ? '#ffd16688' : '#d5fb7866'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx(valt.kol), cy(valt.rad), px(st.rackvidd), 0, Math.PI * 2); g.fill(); g.stroke();
    // Synergi: linjer till grannarna som raknas.
    if (vdef.synergi) {
      g.strokeStyle = '#ffd166aa'; g.lineWidth = 2;
      for (const o of s.torn) {
        if (o === valt || Math.hypot(o.kol - valt.kol, o.rad - valt.rad) > vdef.synergi.radie) continue;
        if (vdef.synergi.samma === 'typ' ? o.typ !== valt.typ : D.TORN[o.typ].byggare !== vdef.byggare) continue;
        g.beginPath(); g.moveTo(cx(valt.kol), cy(valt.rad)); g.lineTo(cx(o.kol), cy(o.rad)); g.stroke();
      }
    }
  }
  for (const t of s.torn) ritaTorn(t);
  g.strokeStyle = '#d5fb78'; g.lineWidth = 2;
  for (const t of s.torn) if (markerade.has(t.id)) { rundRekt(g, cx(t.kol) - 19, cy(t.rad) - 19, 38, 38, 8); g.stroke(); }
  for (const f of s.fiender) if (!f.luft) ritaFiende(f);
  for (const f of s.fiender) if (f.luft) ritaFiende(f);
  for (const sk of s.skott) {
    g.fillStyle = sk.farg; g.beginPath(); g.arc(X0 + px(sk.x), Y0 + px(sk.y), D.TORN[sk.typ].omrade ? 5 : 3.2, 0, Math.PI * 2); g.fill();
  }
  ritaHover();
  ritaEffekter(dt);
  if (pausad) { g.fillStyle = '#0008'; g.fillRect(0, 0, W, H); g.fillStyle = '#fff'; g.font = 'bold 32px Arial'; g.textAlign = 'center'; g.fillText('PAUS', W / 2, H / 2); }
}

// ---------- gränssnitt ----------
function ritaHud() {
  if (!s) return;
  $('guld').textContent = nr(s.guld);
  $('liv').textContent = s.test ? `∞ (läckt ${s.stat.lacktaLiv || 0})` : s.liv;
  const visadVag = s.aktuellVag ? s.aktuellVag.nummer : s.vag;
  $('vag').textContent = `${visadVag} / ${s.oandlig && visadVag > D.ANTAL_VAGOR ? '∞' : D.ANTAL_VAGOR}`;
  $('kristaller').textContent = nr(s.kristaller);
  $('langd').textContent = `${vagText(s.rutt.langd)} (rak ${vagText(s.rakLangd)})`;
  const fas = { bygg: 'Byggfas', strid: 'Strid', vinst: 'Vinst', forlust: 'Förlust' }[s.fas];
  $('fas').textContent = s.fas === 'strid' ? `Strid · ${s.fiender.length + s.ko.length} kvar` : fas;
  $('fas').classList.toggle('strid', s.fas === 'strid');
  $('starta-vag').disabled = s.fas !== 'bygg' || !!s.erbjudande;
  $('fart').textContent = fart + '×';
  $('paus').textContent = pausad ? 'Fortsätt' : 'Paus';
}

function ritaNastaVag() {
  const el = $('nasta-vag');
  if (!s) { el.replaceChildren(); return; }
  const v = s.fas === 'strid' ? s.aktuellVag : D.vag(s.vag, s.svarighet);
  if (!v || s.fas === 'vinst' || s.fas === 'forlust') { el.innerHTML = '<h2>Matchen är slut</h2>'; return; }
  const raknare = {};
  for (const f of v.kon) { const name=v.boss && !f.boss ? 'Eskort' : VM_ART.waveNames[f.utseende]; raknare[name]=(raknare[name]||0)+1; }
  const h = document.createElement('h2');
  h.textContent = `${s.fas === 'strid' ? 'Pågår' : 'Nästa'}: våg ${v.nummer}`;
  const small = document.createElement('small'); small.textContent = `bonus ${v.bonus} guld`; h.append(small);
  const p = document.createElement('p');
  p.textContent = (v.bossnamn ? `${v.bossnamn} + eskort. ` : '') + Object.entries(raknare).map(([n, a]) => `${a}× ${n}`).join(', ') +
    ` · ${nr(v.kon[v.kon.length - 1].maxHalsa)} hp`;
  const chips = document.createElement('div'); chips.className = 'vm-chips';
  const chip = (text, klass = '') => { const c = document.createElement('span'); c.className = 'vm-chip ' + klass; c.textContent = text; chips.append(c); };
  chip(D.PANSARNAMN[v.pansar] + ' pansar');
  if (v.luft) chip('FLYGER · ignorerar labyrinten', 'luft');
  if (v.immunMagi) chip('MAGIIMMUN', 'immun');
  if (v.boss) chip('BOSS · −5 liv vid läcka', 'boss');
  // Tips om vilka attacktyper som bits bäst den här vågen.
  const bast = Object.keys(D.TYPTABELL).filter(a => S.typMultiplikator(a, v.pansar, v.immunMagi) >= 1.25).map(a => D.ATTACKNAMN[a]);
  const tips = document.createElement('p');
  tips.textContent = bast.length ? `Starkt: ${bast.join(', ')}.` : 'Inget har bonus – kaos gör alltid 100 %.';
  const identity=document.createElement('div');identity.className='vm-wave-identity';
  const waveName=document.createElement('strong');waveName.textContent=VM_ART.waveNames[(v.nummer-1)%40];
  identity.append(VM_ART.portrait('enemies',(v.nummer-1)%40,waveName.textContent),waveName);
  el.replaceChildren(h, identity, p, chips, tips);
}

function ritaButik() {
  const el = $('butik'); el.replaceChildren();
  if (!s) return;
  let tangent = 1;
  for (const bid of s.byggare) {
    const b = D.BYGGARE_AV[bid];
    const grupp = document.createElement('div'); grupp.className = 'vm-grupp'; grupp.style.setProperty('--byggfarg', b.farg);
    const h = document.createElement('h3'); h.style.color = b.farg; h.textContent = `${b.namn} · ${b.stil.join(' · ')}`;
    h.title = `Bra på: ${b.bra}\nSvagt: ${b.svag}`;
    const lista = document.createElement('div'); lista.className = 'vm-torn';
    // Bara väggen (steg 1) byggs. Resten av kedjan visas som uppgraderingsvägen.
    b.torn.forEach((rå, i) => {
      const def = D.TORN[rå.id], bygg = i === 0;
      const knapp = document.createElement(bygg ? 'button' : 'div');
      knapp.className = bygg ? '' : 'vm-steg'; knapp.dataset.typ = def.id;
      if (bygg) knapp.type = 'button';
      const namn = document.createElement('b'); namn.textContent = `${i + 1}. ${def.namn}${i === b.torn.length - 1 ? ' ✦' : ''}`;
      const info = document.createElement('small');
      const pris = bygg ? def.pris : S.uppgraderingspris({ typ: b.torn[i - 1].id });
      info.textContent = `${bygg ? 'Bygg' : 'Uppgr.'} ${pris} g · ${D.ATTACKNAMN[def.attack]}${def.mal === 'mark' ? ' · mark' : def.luftSkada ? ' · luftvärn' : ''}`;
      knapp.title = `${def.namn}: ${def.roll}${def.stod ? '' : ` Skada ${nr(def.skada * S.stegSkada(def))}, var ${def.intervall} s, räckvidd ${def.rackvidd}.`}` +
        (bygg ? '' : ` Fås genom att uppgradera ${b.torn[i - 1].namn}${i === b.torn.length - 1 ? ' (kräver frostkristall)' : ''}.`);
      knapp.append(VM_ART.portrait('towers', def.id, def.namn), namn, info);
      if (bygg) {
        if (tangent <= 9) { const k = document.createElement('kbd'); k.textContent = tangent; knapp.append(k); knapp.dataset.tangent = tangent++; }
        knapp.addEventListener('click', () => valjTyp(def.id));
      }
      lista.append(knapp);
    });
    grupp.append(h, lista); el.append(grupp);
  }
  uppdateraButik();
}
function uppdateraButik() {
  if (!s) return;
  for (const knapp of $('butik').querySelectorAll('button')) {
    const def = D.TORN[knapp.dataset.typ];
    knapp.disabled = !['bygg', 'strid'].includes(s.fas) || s.guld < def.pris;
    knapp.classList.toggle('aktiv', valtTyp === def.id);
  }
}

// Panel for flera markerade torn: sammanfattning och knappar for alla.
function ritaFlera(el, torn) {
  el.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = `${torn.length} torn markerade`;
  const tips = document.createElement('small'); tips.textContent = 'Shift/Ctrl-klick lägger till'; h.append(tips);
  const per = {};
  for (const t of torn) { const k = D.TORN[t.typ].namn; per[k] = (per[k] || 0) + 1; }
  const lista = document.createElement('p'); lista.textContent = Object.entries(per).map(([n, a]) => `${a}× ${n}`).join(', ');
  const uppbara = torn.filter(t => S.uppgraderingspris(t) !== null);
  const kostnad = uppbara.reduce((sum, t) => sum + S.uppgraderingspris(t), 0);
  const kristaller = uppbara.filter(t => S.kraverKristall(t)).length;
  const varde = torn.reduce((sum, t) => sum + S.saljvarde(s, t), 0);
  const knappar = document.createElement('div'); knappar.className = 'vm-knappar';
  const upp = document.createElement('button'); upp.className = 'primary'; upp.type = 'button'; upp.id = 'upp-knapp';
  upp.textContent = uppbara.length ? `Uppgradera alla (U) · ${nr(kostnad)} g${kristaller ? ` + ${kristaller} ✦` : ''}` : 'Alla är max';
  upp.title = 'Varje torn går upp en nivå. Räcker inte guldet uppgraderas de billigaste först.';
  upp.disabled = !uppbara.length || !['bygg', 'strid'].includes(s.fas);
  upp.addEventListener('click', () => gorUppgradering());
  const sal = document.createElement('button'); sal.className = 'control'; sal.type = 'button';
  sal.textContent = `Sälj alla (S) · ${nr(varde)} g`; sal.disabled = s.fas !== 'bygg';
  sal.title = s.fas === 'bygg' ? 'Säljer alla markerade torn.' : 'Torn kan bara säljas mellan vågorna.';
  sal.addEventListener('click', () => gorSalj());
  knappar.append(upp, sal);
  const mal = document.createElement('div'); mal.className = 'vm-mal';
  for (const lage of S.MAL_LAGEN) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = MALNAMN[lage];
    b.classList.toggle('aktiv', torn.every(t => t.mal === lage));
    b.addEventListener('click', () => { for (const t of torn) S.valjMal(s, t.id, lage); ritaValt(); });
    mal.append(b);
  }
  el.append(h, lista, knappar, mal);
}

function ritaValt() {
  const el = $('vald');
  const flera = s ? s.torn.filter(x => markerade.has(x.id)) : [];
  if (flera.length > 1) { el.hidden = false; return ritaFlera(el, flera); }
  const t = s && s.torn.find(x => x.id === valtTorn);
  el.hidden = !t;
  if (!t) return;
  const def = D.TORN[t.typ], st = S.stats(s, t), pris = S.uppgraderingspris(t), nasta = def.nasta ? D.TORN[def.nasta] : null;
  const v = s.fas === 'strid' ? s.aktuellVag : D.vag(s.vag, s.svarighet);
  const mult = v ? S.typMultiplikator(def.attack, v.pansar, v.immunMagi) : 1;
  const kanSkjuta = v ? S.kanTraffa(def, { luft: v.luft }) : true;
  el.innerHTML = '';
  const h = document.createElement('h2'); h.textContent = def.namn;
  const niva = document.createElement('small'); niva.textContent = `steg ${def.steg + 1}/${def.antalSteg}${nasta ? '' : ' · mästartorn'}`; h.append(niva);
  const roll = document.createElement('p'); roll.textContent = def.roll;
  const dl = document.createElement('dl'); dl.className = 'vm-stats';
  const rad = (a, b, klass) => { const dt = document.createElement('dt'); dt.textContent = a; const dd = document.createElement('dd'); dd.textContent = b; if (klass) dd.className = klass; dl.append(dt, dd); };
  if (def.stod) rad('Skada', 'Skjuter inte');
  else rad('Skada', `${nr(st.skada)}${st.gift ? ` + ${nr(st.gift)}/s gift` : ''}${def.multiskott ? ` × ${def.multiskott} mål` : ''}`);
  if (!def.stod) rad('Takt', `${st.intervall.toFixed(2)} s`, st.fartBonus ? 'vm-bra' : '');
  if (st.fartBonus) rad('Kraftfält', `+${Math.round(st.fartBonus * 100)} % takt`, 'vm-bra');
  if (def.aura) rad('Aura', `+${Math.round(def.aura.fart * (1 + 0.5 * (t.niva - 1)) * 100)} % takt åt alla torn i cirkeln`, 'vm-bra');
  if (def.synergi) rad('Synergi', `+${Math.round(st.synergi * 100)} % (${Math.min(st.grannar, def.synergi.max)}/${def.synergi.max} ${def.synergi.samma === 'typ' ? 'likadana' : 'ordenstorn'} nära)`, st.synergi ? 'vm-bra' : 'vm-daligt');
  rad('Räckvidd', st.rackvidd.toFixed(1) + ' rutor');
  if (!def.stod) rad('Attack', `${D.ATTACKNAMN[def.attack]}${def.narstrid ? ' · närstrid' : ''}${def.omrade || def.virvel ? ' · område' : ''}${def.kedja ? ' · kedja' : ''}${def.kyla ? ' · broms' : ''}${def.bossSkada ? ` · boss +${Math.round((def.bossSkada - 1) * 100)} %` : ''}`);
  rad('Mål', { mark: 'Bara mark', luft: 'Bara luft', bada: 'Mark och luft' }[def.mal]);
  if (v) rad(`Mot våg ${v.nummer}`, !kanSkjuta ? 'Kan inte träffa' : `${Math.round(mult * 100)} %`, !kanSkjuta || mult < 1 ? 'vm-daligt' : mult > 1 ? 'vm-bra' : '');
  // Vad nästa steg i kedjan blir, så man ser vad man köper (och om luftvärnet försvinner).
  if (nasta) rad('Nästa steg', `${nasta.namn}: ${nasta.stod ? 'stöd, skjuter inte' : `skada ${nr(nasta.skada * S.stegSkada(nasta))}`}${nasta.mal === 'mark' ? ' · bara mark!' : ''}`,
    nasta.mal === 'mark' && def.mal !== 'mark' ? 'vm-daligt' : '');
  const knappar = document.createElement('div'); knappar.className = 'vm-knappar';
  const upp = document.createElement('button'); upp.className = 'primary'; upp.type = 'button'; upp.id = 'upp-knapp';
  if (pris === null) { upp.textContent = 'Mästartorn – högsta steget'; upp.disabled = true; }
  else {
    const kristall = S.kraverKristall(t);
    upp.textContent = `Uppgradera till ${nasta.namn} (U) · ${pris} g${kristall ? ' + 1 ✦' : ''}`;
    upp.disabled = s.guld < pris || (kristall && s.kristaller < 1) || !['bygg', 'strid'].includes(s.fas);
    upp.title = (kristall ? `${nasta.namn} är rasens mästartorn och kräver en frostkristall från en dödad boss. ` : '') + nasta.roll;
  }
  upp.addEventListener('click', () => gorUppgradering());
  const sal = document.createElement('button'); sal.className = 'control'; sal.type = 'button';
  sal.textContent = `Sälj (S) · ${S.saljvarde(s, t)} g`; sal.disabled = s.fas !== 'bygg';
  sal.title = s.fas === 'bygg' ? (t.stridat ? `${Math.round((def.saljAndel ?? D.SALJ_ANDEL) * 100)} % tillbaka.` : 'Byggt denna byggfas: full återbetalning.') : 'Torn kan bara säljas mellan vågorna.';
  sal.addEventListener('click', () => gorSalj());
  knappar.append(upp, sal);
  const mal = document.createElement('div'); mal.className = 'vm-mal';
  for (const lage of S.MAL_LAGEN) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = MALNAMN[lage]; b.classList.toggle('aktiv', t.mal === lage);
    b.addEventListener('click', () => { S.valjMal(s, t.id, lage); ritaValt(); });
    mal.append(b);
  }
  el.append(VM_ART.portrait('towers',t.typ,def.namn),h, roll, dl, knappar, mal);
}

let senasteUi = '';
function uppdateraUi(tvinga = false) {
  if (!s) return;
  ritaHud();
  // Paneler byggs bara om nar nagot relevant andrats, sa knappar inte
  // tappar fokus eller hover mitt i ett klick.
  const valt = s.torn.find(t => t.id === valtTorn);
  const nyckel = [s.fas, s.vag, s.kristaller, s.version, valtTyp, valtTorn, [...markerade].join(','), valt && valt.niva, valt && valt.mal, s.byggare.join()].join('|');
  if (tvinga || nyckel !== senasteUi) { senasteUi = nyckel; ritaNastaVag(); ritaValt(); ritaTestVal(); }
  uppdateraButik(); uppdateraUppKnapp(); updateMobileBuild();
}
// Guldet andras vid varje kill; da uppdateras bara knapparnas lage.
function uppdateraUppKnapp() {
  const knapp = $('upp-knapp');
  if (!knapp || !s) return;
  const torn = s.torn.filter(x => markerade.has(x.id)).filter(t => S.uppgraderingspris(t) !== null);
  const kanNagon = torn.some(t => s.guld >= S.uppgraderingspris(t) && (!S.kraverKristall(t) || s.kristaller >= 1));
  knapp.disabled = !kanNagon || !['bygg', 'strid'].includes(s.fas);
}

// ---------- handlingar ----------
function valjTyp(id) {
  if (!s || !['bygg', 'strid'].includes(s.fas)) return;
  pendingBuild=null; valtTyp = valtTyp === id ? null : id; markera([]);
  if(mobileScreen.matches){setMobilePanel('build');$('board-viewport').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});}
  if (valtTyp) { const def = D.TORN[id]; say(`${def.namn}: ${def.roll} Klicka för att bygga – tornet kan stå en halv ruta förskjutet (håll Shift för hela rutor). Den gröna linjen visar den nya vägen.`); }
  uppdateraUi(true);
}
const vagText = l => l.toFixed(1).replace('.', ',');
// Markering: valtTorn ar tornet som visas i detalj, markerade alla valda.
function markera(ids, lagg = false) {
  if (!lagg) markerade.clear();
  for (const id of ids) {
    if (lagg && markerade.has(id) && ids.length === 1) markerade.delete(id); else markerade.add(id);
  }
  valtTorn = markerade.size ? [...markerade].at(-1) : null;
}
function avbryt() { pendingBuild=null; valtTyp = null; markera([]); uppdateraUi(true); }
// kol/rad: dar ett torn skulle byggas (halvrutesteg). x/y: klickpunkten i hela rutor.
function klickRuta(kol, rad, x = kol + 0.5, y = rad + 0.5, lagg = false) {
  if (!s) return;
  const t = S.tornVid(s, x, y);
  if (valtTyp && !t) {
    const r = S.bygg(s, valtTyp, kol, rad);
    if (!r.ok) say(r.orsak + (r.juggle || r.blockerar ? ' Inget guld har dragits.' : ''));
    else { say(`${D.TORN[valtTyp].namn} byggd. Vägen är nu ${vagText(s.rutt.langd)} rutor.`); if (s.guld < D.TORN[valtTyp].pris) valtTyp = null; }
  } else if (t) { valtTyp = null; markera([t.id], lagg); }
  else if (!lagg) markera([]);
  uppdateraUi(true);
}
// Dubbelklick: markera alla torn av samma sort, som Ctrl-klick i WC3.
function markeraSammaTyp(x, y) {
  const t = s && S.tornVid(s, x, y); if (!t) return;
  markera(s.torn.filter(o => o.typ === t.typ).map(o => o.id));
  say(`${markerade.size} ${D.TORN[t.typ].namn} markerade.`); uppdateraUi(true);
}
function markeraRuta(a, b, lagg) {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  const inne = s.torn.filter(t => t.kol + 0.5 >= x0 && t.kol + 0.5 <= x1 && t.rad + 0.5 >= y0 && t.rad + 0.5 <= y1).map(t => t.id);
  markera(inne, lagg);
  if (inne.length) say(`${markerade.size} torn markerade. U uppgraderar alla, S säljer alla.`);
  uppdateraUi(true);
}
function gorUppgradering() {
  if (!s || !markerade.size) return;
  if (markerade.size === 1) {
    const t = s.torn.find(x => x.id === valtTorn); if (!t) return;
    const r = S.uppgradera(s, t.id);
    say(r.ok ? `${r.fran} blev ${r.till} för ${r.pris} guld.` : r.orsak);
  } else {
    const r = S.uppgraderaFlera(s, [...markerade]);
    say(r.antal ? `${r.antal} torn uppgraderade för ${nr(r.kostnad)} guld.${r.hoppade ? ` ${r.hoppade} hoppades över: ${r.orsak}` : ''}` : (r.orsak || 'Inget att uppgradera.'));
  }
  uppdateraUi(true);
}
function gorSalj() {
  if (!s || !markerade.size) return;
  const r = S.saljFlera(s, [...markerade]);
  if (r.antal) { markera([]); say(`${r.antal} torn sålda för ${nr(r.varde)} guld. Vägen är nu ${vagText(s.rutt.langd)} rutor.`); } else say(r.orsak || 'Inget sålt.');
  uppdateraUi(true);
}
function startaVag() {
  if (!s || !S.startaVag(s)) return;
  const v = s.aktuellVag;
  say(`Våg ${v.nummer}${v.bossnamn ? ` – ${v.bossnamn}` : ''}! ${v.luft ? 'De flyger rakt över labyrinten. ' : ''}${v.immunMagi ? 'Magi biter inte. ' : ''}Du kan bygga under vågen, men inte i vägen för fiender som redan är ute.`);
  pausad = false; uppdateraUi(true);
}

// ---------- dialoger ----------
function byggarKnapp(b, aktiv, onClick) {
  const k = document.createElement('button'); k.type = 'button'; k.style.setProperty('--byggfarg', b.farg);
  k.classList.toggle('aktiv', aktiv);
  const namn = document.createElement('b'); namn.textContent = b.namn; namn.style.color = b.farg;
  const stil = document.createElement('span'); stil.className = 'vm-stil';
  for (const s of b.stil) { const c = document.createElement('i'); c.textContent = s; stil.append(c); }
  const text = document.createElement('small'); text.textContent = b.beskrivning;
  const bra = document.createElement('small'); bra.className = 'vm-bra-rad'; bra.textContent = `+ ${b.bra}`;
  const svag = document.createElement('small'); svag.className = 'vm-svag-rad'; svag.textContent = `− ${b.svag}`;
  const torn = document.createElement('small'); torn.className = 'vm-tornrad'; torn.textContent = b.torn.map((t, i) => `${t.namn} ${i ? S.uppgraderingspris({ typ: b.torn[i - 1].id }) : t.pris}g`).join(' → ') + ' ✦';
  const roster=document.createElement('span');roster.className='vm-race-roster';
  for(const def of b.torn){
    const member=document.createElement('span'),caption=document.createElement('span');caption.textContent=def.namn;
    member.append(VM_ART.portrait('towers',def.id,def.namn),caption);roster.append(member);
  }
  k.append(namn, stil, roster, text, bra, svag, torn); k.addEventListener('click', onClick); return k;
}
function ritaSetup() {
  const karta = D.KARTOR[0];
  $('kartinfo').textContent = `${karta.namn}: ${D.KOL} × ${D.RAD} rutor, rak väg ${D.KOL - 1} rutor. ${karta.beskrivning}`;
  const lage = D.BYGGLAGEN[setup.lage];
  $('byggar-legend').textContent = lage.slump ? `Byggare – slumpas (${lage.antal})` : `Välj ${lage.antal === 1 ? 'en byggare' : 'två byggare'}`;
  const val = $('byggarval'); val.replaceChildren();
  for (const b of D.BYGGARE) {
    const k = byggarKnapp(b, !lage.slump && setup.byggare.includes(b.id), () => {
      if (lage.antal === 1) setup.byggare = [b.id];
      else if (setup.byggare.includes(b.id)) setup.byggare = setup.byggare.filter(x => x !== b.id);
      else setup.byggare = [...setup.byggare, b.id].slice(-2);
      ritaSetup();
    });
    k.disabled = lage.slump; val.append(k);
  }
  $('bygglage').value = setup.lage; $('svarighet').value = setup.svarighet;
  $('extra').checked = setup.extra; $('oandlig').checked = setup.oandlig; $('testlage').checked = setup.test;
  $('setup-fel').textContent = '';
  $('setup-avbryt').hidden = !s;
}
function oppnaSetup() {
  if (s && s.fas === 'strid' && !pausad) pausad = true;
  ritaSetup(); if (!$('setup').open) $('setup').showModal();
}
function startaMatch(event) {
  event.preventDefault();
  const lage = D.BYGGLAGEN[setup.lage];
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  let byggare = setup.byggare.filter(b => D.BYGGARE_AV[b]);
  if (lage.slump) byggare = S.slumpaByggare(S.slump(seed), lage.antal);
  else if (byggare.length !== lage.antal) { $('setup-fel').textContent = `Välj ${lage.antal === 1 ? 'en byggare' : 'två byggare'}.`; return; }
  if (s && s.fas !== 'vinst' && s.fas !== 'forlust' && (s.torn.length || s.vag > 1) && !confirm('Starta en ny match? Den pågående försvinner.')) return;
  spara();
  s = S.skapa({ karta: setup.karta, byggare, svarighet: setup.svarighet, extraByggare: setup.extra, oandlig: setup.oandlig, test: setup.test, seed });
  pendingBuild=null; setMobilePanel('build'); valtTyp = null; markera([]); pausad = false; effekter = []; bakgrund = nyBakgrund();
  $('setup').close(); ritaButik(); ritaTestVal(); uppdateraUi(true);
  const namn = byggare.map(b => D.BYGGARE_AV[b].namn).join(' och ');
  say(s.test
    ? `TESTLÄGE med ${namn}: oändligt guld och kristaller, och liven tar aldrig slut. Bygg fritt, välj våg uppe till höger och se hur länge fienderna går i labyrinten.`
    : `${s.karta.namn} med ${namn}. ${s.karta.tips} Bygg billiga väggtorn för att forma vägen och starta vågen med mellanslag.`);
}
// Testlaget: hoppa till valfri vag i byggfasen for att prova labyrinten mot den.
function ritaTestVal() {
  const val = $('test-vag');
  val.hidden = !s || !s.test;
  if (val.hidden) return;
  if (!val.options.length) for (let w = 1; w <= D.ANTAL_VAGOR; w++) {
    const v = D.vag(w);
    val.append(new Option(`Våg ${w} · ${VM_ART.waveNames[w-1]}${v.luft ? ' (flyg)' : ''}${v.immunMagi ? ' (immun)' : ''}`, w));
  }
  val.value = String(Math.min(s.vag, D.ANTAL_VAGOR));
  val.disabled = s.fas !== 'bygg';
}
function visaErbjudande() {
  pausad = false;
  const el = $('erbjudande-val'); el.replaceChildren();
  for (const id of s.erbjudande) el.append(byggarKnapp(D.BYGGARE_AV[id], false, () => {
    S.valjExtraByggare(s, id); $('erbjudande').close(); ritaButik(); uppdateraUi(true);
    say(`${D.BYGGARE_AV[id].namn} ansluter. Dess torn finns nu i butiken.`);
  }));
  $('erbjudande').showModal();
}
function visaSlut() {
  if (!s || $('slut').open) return;
  const vinst = s.fas === 'vinst';
  $('slut-rubrik').textContent = vinst ? 'Hertig Frostmaul är besegrad!' : `Porten föll på våg ${s.aktuellVag ? s.aktuellVag.nummer : s.vag}`;
  $('slut-text').textContent = `${s.stat.dodade} fiender dödade, ${s.stat.lackta} läckte, ${nr(s.stat.tjanat)} guld tjänat. ` +
    `Längsta väg: ${vagText(s.rutt.langd)} rutor (rak väg ${vagText(s.rakLangd)}). ${D.SVARIGHET[s.svarighet].namn} på ${s.karta.namn}.`;
  $('slut').showModal();
}

// ---------- input ----------
// x/y: pekaren i hela rutor. kol/rad: tornets hörn, snäppt till halvrutor
// (som WC3) så att tornets mitt hamnar närmast pekaren. Shift snäpper till hela rutor.
function rutaFran(event) {
  const r = canvas.getBoundingClientRect();
  const x = ((event.clientX - r.left) * W / r.width - X0) / CELL, y = ((event.clientY - r.top) * H / r.height - Y0) / CELL;
  if (x < 0 || y < 0 || x >= D.KOL || y >= D.RAD) return null;
  const steg = event.shiftKey && valtTyp ? 1 : 0.5;
  const snapp = (v, max) => Math.min(max, Math.max(0, Math.round((v - 0.5) / steg) * steg));
  return { x, y, kol: snapp(x, D.KOL - 1), rad: snapp(y, D.RAD - 1) };
}
let dra = null;   // pågående klick/dragning: { x, y, ruta: true när det blivit en markeringsrektangel }
canvas.addEventListener('pointermove', e => {
  if(mobileScreen.matches || e.pointerType==='touch') {
    VM_TOUCH.move(touchGesture,e);return;
  }
  const p = rutaFran(e); if (p) hover = p;
  if (dra && hover && !valtTyp && Math.hypot(hover.x - dra.x, hover.y - dra.y) > 0.3) dra.ruta = true;
});
canvas.addEventListener('pointerleave', () => { if (!dra && !pendingBuild) hover = null; });
canvas.addEventListener('pointerdown', e => {
  if (e.button === 2) return;
  if(mobileScreen.matches || e.pointerType==='touch') {
    if(touchGesture){touchGesture.moved=true;return;}
    touchGesture=VM_TOUCH.begin(e);return;
  }
  const p = rutaFran(e); hover = p;
  if (!p) return;
  e.preventDefault();
  dra = { x: p.x, y: p.y, ruta: false, lagg: e.shiftKey || e.ctrlKey || e.metaKey };
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', e => {
  if(mobileScreen.matches || e.pointerType==='touch') {
    const tap=VM_TOUCH.tap(touchGesture,e);touchGesture=null;
    if(!tap)return;
    const p=rutaFran(e);if(!p || !s)return;
    hover=p;
    if(valtTyp && !S.tornVid(s,p.x,p.y)){
      pendingBuild={...p,typ:valtTyp};updateMobileBuild();
    }else{
      pendingBuild=null;klickRuta(p.kol,p.rad,p.x,p.y);
      if(markerade.size)setMobilePanel('selected');
    }
    return;
  }
  if (!dra) return;
  const d = dra; dra = null;
  const p = rutaFran(e); if (p) hover = p;
  if (!hover) return;
  if (d.ruta || (!valtTyp && Math.hypot(hover.x - d.x, hover.y - d.y) > 0.3)) markeraRuta(d, hover, d.lagg);
  else klickRuta(hover.kol, hover.rad, hover.x, hover.y, d.lagg);
});
canvas.addEventListener('pointercancel',()=>{touchGesture=null;dra=null;});
canvas.addEventListener('dblclick', e => { if (!mobileScreen.matches && e.pointerType!=='touch' && !valtTyp) { const p = rutaFran(e); if (p) markeraSammaTyp(p.x, p.y); } });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); avbryt(); });
document.addEventListener('keydown', e => {
  if ($('bestiary').open) return;
  if (e.target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (document.querySelector('dialog[open]')) return;
  if (!s) return;
  if (e.key === ' ') { e.preventDefault(); startaVag(); }
  else if (/^[1-9]$/.test(e.key)) { const k = $('butik').querySelector(`button[data-tangent="${e.key}"]`); if (k && !k.disabled) valjTyp(k.dataset.typ); }
  else if (e.key === 'u' || e.key === 'U') gorUppgradering();
  else if (e.key === 's' || e.key === 'S') gorSalj();
  else if (e.key === 'q' || e.key === 'Q' || e.key === 'x' || e.key === 'X') avbryt();
  else if (e.key === 'p' || e.key === 'P') { pausad = !pausad; uppdateraUi(); }
});
$('starta-vag').addEventListener('click', startaVag);
$('paus').addEventListener('click', () => { if (s) { pausad = !pausad; uppdateraUi(); } });
$('fart').addEventListener('click', () => { fart = fart === 1 ? 2 : fart === 2 ? 3 : 1; uppdateraUi(); });
$('start').addEventListener('click', oppnaSetup);
$('setup-form').addEventListener('submit', startaMatch);
$('setup-avbryt').addEventListener('click', () => $('setup').close());
$('setup').addEventListener('cancel', e => { if (!s) e.preventDefault(); });
$('erbjudande').addEventListener('cancel', e => e.preventDefault());
$('bygglage').addEventListener('change', e => { setup.lage = e.target.value; const n = D.BYGGLAGEN[setup.lage].antal; setup.byggare = setup.byggare.slice(0, n); ritaSetup(); });
$('svarighet').addEventListener('change', e => { setup.svarighet = e.target.value; });
$('extra').addEventListener('change', e => { setup.extra = e.target.checked; });
$('oandlig').addEventListener('change', e => { setup.oandlig = e.target.checked; });
$('testlage').addEventListener('change', e => { setup.test = e.target.checked; });
$('test-vag').addEventListener('change', e => {
  if (!s || !s.test || s.fas !== 'bygg') return;
  s.vag = Number(e.target.value); uppdateraUi(true);
  say(`Nästa våg är nu våg ${s.vag}. Starta den med mellanslag.`);
});
$('slut-stang').addEventListener('click', () => $('slut').close());
$('slut-ny').addEventListener('click', () => { $('slut').close(); oppnaSetup(); });
for (const [id, l] of Object.entries(D.BYGGLAGEN)) $('bygglage').append(new Option(l.namn, id));
for (const [id, sv] of Object.entries(D.SVARIGHET)) $('svarighet').append(new Option(sv.namn, id));
if (!D.BYGGLAGEN[setup.lage]) setup.lage = 'valj';
if (!D.SVARIGHET[setup.svarighet]) setup.svarighet = 'normal';

// ---------- mobile workbench ----------
const mobileScreen=window.matchMedia('(max-width: 900px), (pointer: coarse)');
let pendingBuild=null,touchGesture=null,boardZoom=1,overview=false;
function setMobilePanel(panel) {
  $('mobile-panel').dataset.panel=panel;
  document.querySelectorAll('[data-panel]').forEach(button=>{
    if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.panel===panel));
  });
}
function updateMobileBuild() {
  if(!s)return;
  const valid=pendingBuild && pendingBuild.typ===valtTyp && ['bygg','strid'].includes(s.fas);
  const check=valid?S.provaBygge(s,valtTyp,pendingBuild.kol,pendingBuild.rad):null;
  $('mobile-build').disabled=!check?.ok;
  $('mobile-build').textContent=valtTyp?'Bygg · '+D.TORN[valtTyp].pris+' g':'Bygg här';
  $('mobile-build-hint').textContent=valid?(check.ok?'Placering vald. Tryck Bygg för att köpa.':check.orsak):
    valtTyp?D.TORN[valtTyp].namn+' · Tryck på en plats på banan.':'Välj ett torn, eller tryck på ett byggt torn.';
}
function sizeMobileBoard() {
  const view=$('board-viewport'),middle=(view.scrollLeft+view.clientWidth/2)/Math.max(canvas.clientWidth,1);
  canvas.style.width=mobileScreen.matches&&!overview?Math.round(W*boardZoom)+'px':'';
  $('zoom-label').textContent=overview?'Översikt':Math.round(boardZoom*100)+' %';
  $('zoom-fit').textContent=overview?'Byggvy':'Översikt';
  $('zoom-out').disabled=!overview&&boardZoom<=.75;
  $('zoom-in').disabled=!overview&&boardZoom>=1.5;
  view.scrollLeft=Math.max(0,middle*canvas.clientWidth-view.clientWidth/2);
}
document.querySelectorAll('.vm-mobile-tabs button').forEach(b=>b.addEventListener('click',()=>setMobilePanel(b.dataset.panel)));
$('mobile-build').addEventListener('click',()=>{
  if(!pendingBuild || pendingBuild.typ!==valtTyp)return;
  const p=pendingBuild;pendingBuild=null;klickRuta(p.kol,p.rad,p.x,p.y);updateMobileBuild();
});
$('mobile-cancel').addEventListener('click',avbryt);
$('zoom-in').addEventListener('click',()=>{overview=false;boardZoom=Math.min(1.5,boardZoom+.25);sizeMobileBoard();});
$('zoom-out').addEventListener('click',()=>{overview=false;boardZoom=Math.max(.75,boardZoom-.25);sizeMobileBoard();});
$('zoom-fit').addEventListener('click',()=>{overview=!overview;sizeMobileBoard();});
$('board-viewport').addEventListener('scroll',()=>{if(touchGesture)touchGesture.moved=true;},{passive:true});
mobileScreen.addEventListener('change',()=>{pendingBuild=null;touchGesture=null;dra=null;sizeMobileBoard();});
window.addEventListener('resize',sizeMobileBoard);
sizeMobileBoard();
if(mobileScreen.matches)$('board-viewport').scrollLeft=0;

// ---------- loop ----------
function frame(nu) {
  const dt = Math.min(0.1, (nu - (senast || nu)) / 1000); senast = nu;
  klocka += dt;
  if (s && !pausad && s.fas === 'strid') {
    acc += dt * fart;
    while (acc >= STEG) { S.steg(s, STEG); acc -= STEG; if (s.fas !== 'strid') { acc = 0; break; } }
  }
  if (s) { tomHandelser(); uppdateraUi(); }
  rita(pausad ? 0 : dt);
  requestAnimationFrame(frame);
}
oppnaSetup();
requestAnimationFrame(frame);

VM_ART.load().then(failed=>{
  $('art-status').hidden=!failed.length;
  $('art-status').textContent=failed.length?'Vissa illustrationer kunde inte laddas. Ladda om sidan för att försöka igen.':'';
});

function showBestiary() {
  if(s && s.fas==='strid')pausad=true;
  const box=$('bestiary-grid');box.replaceChildren();
  for(let wave=1;wave<=40;wave++){
    const v=D.vag(wave),card=document.createElement('article'),name=document.createElement('h3'),traits=document.createElement('p');
    name.textContent=wave+' · '+VM_ART.waveNames[wave-1];
    traits.textContent=[D.PANSARNAMN[v.pansar]+' pansar',v.luft?'Flyger':'Mark',v.immunMagi?'Magiimmun':'',v.boss?'Boss':''].filter(Boolean).join(' · ');
    card.append(VM_ART.portrait('enemies',wave-1,VM_ART.waveNames[wave-1]),name,traits);box.append(card);
  }
  $('bestiary').showModal();if(s)ritaHud();
}
$('bestiary-open').addEventListener('click',showBestiary);
$('bestiary-close').addEventListener('click',()=>$('bestiary').close());
