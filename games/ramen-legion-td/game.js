'use strict';
const $ = id => document.getElementById(id);
const canvas = $('board'), ctx = canvas.getContext('2d');
const W = 748, H = 652, CELL = 60, GRID_X0 = 14, GRID_Y0 = 46, STEG = 1 / 60;
const SKOTT_FART = 11 * CELL;
const nr = v => Math.round(v).toLocaleString('sv-SE');
const dec = v => v.toLocaleString('sv-SE', { maximumFractionDigits: 2 });
const say = text => { $('status').textContent = text; };
function rutaMitt(kol, rad) { return { x: GRID_X0 + (kol + .5) * CELL, y: GRID_Y0 + (rad + .5) * CELL }; }
const KUNG = { ...rutaMitt(LTD.KUNG_RUTA.kol, LTD.KUNG_RUTA.rad), r: 30 };
let BANPUNKTER = [...LTD.BANA.map(r => rutaMitt(r.kol, r.rad)), KUNG];
const BILDER = {}, assetNames = [...LTD.ENHETER.filter(e => !e.vektor && e.artColumn === undefined && e.extraArt === undefined).map(e => e.id), 'creatures', 'environment', 'projectiles', 'kitchen', 'landscapes', 'arcane', 'reinforcements'];
let assetsReady = false, assetLoading = false, background = null;
let saldo, liv, vagNr, rantebas, spill, lage, pausatLage, fart, arme, nastaId, valdButik, valdArme, markor;
let torn, fiender, skott, spawnKvar, spawnTimer, stridTid, avraknad, texter, effects, enemyId;
let statistik, vagResultat, acc = 0, last = 0, simClock = 0, uiClock = 0, rangePreview = false;
let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastUpgrade = -Infinity, guideTower = 'zebravakt';
let seals = 0, kryddor = {...LTD_RULES.INGA_KRYDDOR}, rewards = [], bossKills = new Set(), expedition = false, activeClass = null;
let activeDifficulty = 'medium', activeMode = 'classic';
function canBuild() { return !!activeClass && ['bygg','strid'].includes(lage); }
function towerStats(a, army = arme) { return LTD_RULES.stats(a, army, kryddor); }

async function loadAssets() {
  if (assetLoading) return;
  assetLoading = true; assetsReady = false; $('retry-assets').hidden = true; $('loading').hidden = false;
  let done = 0;
  const failures = [];
  await Promise.all(assetNames.map(name => new Promise(resolve => {
    const image = new Image();
    image.onload = () => { BILDER[name] = image; done++; $('loading').textContent = `Laddar illustrationer… ${done}/${assetNames.length}`; resolve(); };
    image.onerror = () => { failures.push(name); resolve(); };
    image.src = `bilder/${name}-atlas.webp`;
  })));
  assetLoading = false;
  if (failures.length) {
    $('loading').textContent = `Bilder kunde inte laddas: ${failures.join(', ')}. Försök igen.`;
    $('retry-assets').hidden = false; return;
  }
  assetsReady = true; $('loading').hidden = true; background = makeBackground();
  paintShop(); updateSetupRoster(); renderMapCards(); updateMapPreview(); ritaUI(); if ($('guide-dialog').open) renderGuide();
}
function sprite(g, name, col, row, cols, rows, x, y, width, height = width, flip = false) {
  const image = BILDER[name]; if (!image) return;
  const sw = image.naturalWidth / cols, sh = image.naturalHeight / rows;
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  g.drawImage(image, col * sw, row * sh, sw, sh, -width / 2, -height / 2, width, height); g.restore();
}
function towerArt(g, a, x, y, size) {
  const rank = Math.max(a.damageLevel || 0, a.rangeLevel || 0, a.speedLevel || 0);
  if (a.enhet.extraArt !== undefined) sprite(g,'reinforcements',a.enhet.extraArt%3,Math.floor(a.enhet.extraArt/3),3,2,x,y,size);
  else if (a.enhet.vektor) LTD_ART.rita(g, a.enhet.id, x, y, size, a);
  else if (a.enhet.artColumn !== undefined) {
    // Measured sprite rows: generated artwork is not an exact uniform grid.
    const image=BILDER.arcane, column=a.enhet.artColumn, row=Math.ceil(rank/2);
    const cuts=[[0,305,639,1005,1448],[0,308,643,1005,1448],[0,310,644,1009,1448]][column];
    if(image) {
      const sw=image.naturalWidth/3, sy=cuts[row]/1448*image.naturalHeight, sh=(cuts[row+1]-cuts[row])/1448*image.naturalHeight;
      const scale=size/Math.max(sw,sh); g.drawImage(image,column*sw,sy,sw,sh,x-sw*scale/2,y-sh*scale/2,sw*scale,sh*scale);
    }
  }
  else sprite(g, a.enhet.id, Math.min(3,a.damageLevel), Math.min(3,a.rangeLevel), 4, 4, x, y, size);
  if (rank > 3 || a.rune) {
    g.save(); g.strokeStyle = rank === 6 ? '#ffde89' : '#c0a0f6'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(x, y + size*.34, size*.36, size*.12, 0, 0, Math.PI*2); g.stroke();
    g.fillStyle = '#ffe0a1'; g.font = `bold ${Math.max(10,size*.14)}px Arial`; g.textAlign = 'center';
    g.fillText(a.rune ? LTD_RULES.RUNES.find(r=>r.id===a.rune).icon : '✦', x, y-size*.35); g.restore();
  }
}
function portrait(el, a) {
  const g = el.getContext('2d'); g.clearRect(0, 0, el.width, el.height);
  towerArt(g, a, el.width / 2, el.height / 2, Math.min(el.width, el.height) * .97);
}
function landscape(g, map, width, height) {
  if (map.landscape < 0) g.drawImage(BILDER.environment, 0, 0, width, height);
  else {
    const image = BILDER.landscapes, h = image.naturalHeight / 3;
    g.drawImage(image, 0, map.landscape * h, image.naturalWidth, h, 0, 0, width, height);
  }
}
function updateMapPreview() {
  const map = LTD.MAPS.find(m => m.id === $('map-select').value);
  $('map-select').disabled = !$('setup-class').value;
  for (const card of $('map-choices').children) {
    card.disabled = !assetsReady || !$('setup-class').value;
    card.setAttribute('aria-pressed', String(card.dataset.map === map?.id));
  }
  $('play-map').disabled = !assetsReady || !map || !$('setup-class').value;
  if (!map) {
    $('map-description').textContent='Välj en klass och sedan en karta för att starta.'; $('map-tip').textContent=''; $('active-map').textContent='';
    const c=$('map-preview'); c.getContext('2d').clearRect(0,0,c.width,c.height); return;
  }
  $('map-description').textContent = `${map.difficulty} · ${map.description}`;
  $('map-tip').textContent = map.tip;
  $('active-map').textContent = `Vald karta: ${map.name}`;
  if (!assetsReady) return;
  drawMapPreview($('map-preview'), map);
}
function drawMapPreview(c, map) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height); landscape(g, map, c.width, c.height);
  g.save(); g.scale(c.width / W, c.height / H);
  const maze=$('mode-select').value==='maze';
  const end=maze?rutaMitt(11,4):rutaMitt(LTD.KUNG_RUTA.kol,LTD.KUNG_RUTA.rad);
  const points=maze?LTD_MAZE.route([]).map(p=>rutaMitt(p.kol,p.rad)):[...map.path.map(p=>rutaMitt(p.kol,p.rad)),end];
  g.beginPath(); g.moveTo(points[0].x, points[0].y);
  for (const p of points) g.lineTo(p.x, p.y);
  g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = '#111b22'; g.lineWidth = 26; g.stroke();
  g.strokeStyle = '#ffe3a1'; g.lineWidth = 14; g.stroke();
  for (const [p, color] of [[points[0], '#7cf2be'], [end, '#ff927f']]) {
    g.fillStyle = color; g.beginPath(); g.arc(p.x, p.y, 23, 0, Math.PI * 2); g.fill();
  }
  g.restore(); c.setAttribute('aria-label', `${map.name}: fiender följer den ljusa stigen från grönt till rött.`);
}
function selectMap(id) {
  if (lage !== 'setup' || !assetsReady || !$('setup-class').value || !LTD.MAPS.some(m=>m.id===id)) return;
  $('map-select').value=id; updateMapPreview();
}
function renderMapCards() {
  const box=$('map-choices'); box.replaceChildren();
  for (const map of LTD.MAPS) {
    const card=document.createElement('button'), art=document.createElement('canvas'), name=document.createElement('strong'), description=document.createElement('span'), tip=document.createElement('small');
    card.type='button'; card.className='map-card'; card.dataset.map=map.id;
    art.width=448; art.height=392; art.setAttribute('aria-hidden','true');
    name.textContent=map.name; description.textContent=map.description; tip.textContent=$('mode-select').value==='maze'?'Öppet byggfält. Forma en längre väg med dina torn.':map.tip;
    card.append(art,name,description,tip);
    card.addEventListener('click',()=>selectMap(map.id)); box.append(card);
    if (assetsReady) drawMapPreview(art,map);
  }
}
function selectClass(id) {
  if (lage !== 'setup' || !LTD.KLASSER.some(c=>c.id===id)) return;
  $('setup-class').value=id;
  $('map-select').value='';
  updateClassSelection(); updateMapPreview();
}
function updateClassSelection() {
  for (const card of $('setup-roster').children) {
    const selected=card.dataset.klass===$('setup-class').value;
    card.setAttribute('aria-pressed',String(selected));
    card.classList.toggle('selected',selected);
  }
}
function updateSetupRoster() {
  const box=$('setup-roster'); box.replaceChildren();
  for(const klass of LTD.KLASSER) {
    const card=document.createElement('button'), title=document.createElement('strong'), description=document.createElement('span'), roster=document.createElement('span');
    card.type='button'; card.className='class-choice'; card.dataset.klass=klass.id;
    title.textContent=klass.namn; description.textContent=klass.beskrivning; description.className='class-copy';
    roster.className='class-portraits';
    for(const e of klass.enheter) {
      const member=document.createElement('span'), art=document.createElement('canvas'), name=document.createElement('b'), role=document.createElement('small');
      art.width=art.height=140; art.setAttribute('aria-hidden','true');
      name.textContent=e.namn; role.textContent=e.roll; member.title=e.pris+' Ramen';
      member.append(art,name,role); roster.append(member);
      if(assetsReady)portrait(art,{enhet:e,damageLevel:0,rangeLevel:0,speedLevel:0});
    }
    card.append(title,description,roster); card.addEventListener('click',()=>selectClass(klass.id)); box.append(card);
  }
  updateClassSelection();
}
function updateDifficulty() {
  const settings=LTD.DIFFICULTIES[$('difficulty-select').value];
  $('difficulty-description').textContent=settings ? settings.description : 'Välj svårighetsgrad.';
}
function playMap(id, classId = $('setup-class').value, difficulty = $('difficulty-select').value || 'medium', mode = $('mode-select').value || 'classic') {
  if (!['classic','maze'].includes(mode) || !LTD.DIFFICULTIES[difficulty] || !assetsReady || !LTD.MAPS.some(m => m.id === id) || !LTD.KLASSER.some(c=>c.id===classId)) return false;
  if ((arme.length || vagNr > 1) && !['vinst', 'forlust'].includes(lage) && !confirm('Byta karta och starta en ny match? Den pågående matchen raderas.')) return false;
  activeClass=classId; activeDifficulty=difficulty; activeMode=mode; LTD.setMap(id); BANPUNKTER = [...LTD.BANA.map(r => rutaMitt(r.kol, r.rad)), KUNG];
  nyMatch();
  $('map-select').value = id; updateMapPreview();
  say(`${LTD.activeMap.name}: ${LTD.activeMap.tip} Välj ett torn för att börja.`);
  return true;
}
function makeBackground() {
  const b = document.createElement('canvas'); b.width = W; b.height = H;
  const g = b.getContext('2d'); landscape(g, LTD.activeMap, W, H);
  const colors = LTD.activeMap.colors;
  function path(color, width) {
    g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(BANPUNKTER[0].x, BANPUNKTER[0].y);
    for (const p of BANPUNKTER) g.lineTo(p.x, p.y); g.stroke();
  }
  path('#17202b99', 55); path(colors[0], 48); path(colors[1], 41);
  // Stone tiles follow the actual path; decoration cannot shift the route.
  for (let i = 1; i < BANPUNKTER.length; i++) {
    const a = BANPUNKTER[i - 1], z = BANPUNKTER[i], d = Math.hypot(z.x - a.x, z.y - a.y);
    for (let v = 0; v < d; v += 18) {
      const x = a.x + (z.x - a.x) * v / d, y = a.y + (z.y - a.y) * v / d;
      g.save(); g.translate(x, y); g.rotate(Math.atan2(z.y - a.y, z.x - a.x));
      g.fillStyle = i % 3 ? colors[2] : colors[3]; g.strokeStyle = colors[4]; g.lineWidth = .8;
      g.beginPath(); g.roundRect(-7, -17, 15, 33, 3); g.fill(); g.stroke(); g.restore();
    }
  }
  // Quiet planting pads distinguish buildable ground from the road.
  g.lineWidth = .8;
  for (let r = 0; r < LTD.GRID_RAD; r++) for (let k = 0; k < LTD.GRID_KOL; k++) {
    if (isPath(k,r)) continue;
    const p = rutaMitt(k, r); g.fillStyle = '#22392322'; g.strokeStyle = '#c5ce9960';
    g.beginPath(); g.roundRect(p.x - 24, p.y - 24, 48, 48, 9); g.fill(); g.stroke();
  }
  g.fillStyle = '#182b21cc'; g.beginPath(); g.roundRect(16, 9, 200, 24, 8); g.fill();
  g.fillStyle = '#e2e7b8'; g.font = 'bold 10px Arial'; g.fillText(LTD.activeMap.name.toUpperCase() + ' · FÖRSVARA KÖKET', 24, 25);
  const entry = BANPUNKTER[0], next = BANPUNKTER[1];
  g.save(); g.translate(entry.x, entry.y); g.rotate(Math.atan2(next.y-entry.y, next.x-entry.x));
  g.fillStyle = '#164b3e'; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI*2); g.fill();
  g.strokeStyle = '#a7f7ce'; g.lineWidth = 3; g.beginPath(); g.moveTo(-9,0); g.lineTo(9,0); g.moveTo(3,-6); g.lineTo(9,0); g.lineTo(3,6); g.stroke(); g.restore();
  // Small illustrated lanterns sit outside the playable cells.
  sprite(g, 'creatures', 2, 2, 4, 3, 40, 622, 45); sprite(g, 'creatures', 3, 2, 4, 3, 708, 623, 47);
  return b;
}

// ---------- economy and match ----------
function andraSaldo(delta) {
  if (delta >= 0) { const before = saldo; saldo = LTD_RULES.deposit(saldo, delta); spill += delta - (saldo - before); return saldo - before; }
  if (saldo < -delta) return 0;
  saldo += delta; return delta;
}
function beraknadRanta(bas) { return Math.floor(bas * 5 / 100); }
function nyMatch() {
  seals = 0; kryddor = {...LTD_RULES.INGA_KRYDDOR}; rewards = []; bossKills = new Set(); expedition = false;
  saldo = LTD.START_RAMEN; liv = LTD.START_LIV; vagNr = 1; rantebas = 0; spill = 0;
  arme = []; nastaId = 1; valdButik = null; valdArme = null; markor = { kol: 0, rad: 1 };
  if (isPath(markor.kol, markor.rad)) {
    findGround: for (let r = 0; r < LTD.GRID_RAD; r++) for (let k = 0; k < LTD.GRID_KOL; k++) {
      if (!isPath(k,r)) { markor = {kol:k,rad:r}; break findGround; }
    }
  }
  torn = []; fiender = []; skott = []; spawnKvar = []; spawnTimer = 0; stridTid = 0; enemyId = 1;
  avraknad = true; texter = []; effects = []; vagResultat = null;
  statistik = { dodade: 0, ranta: 0, tjanat: 0, lackta: 0 };
  fart = 1; lage = activeClass ? 'bygg' : 'setup'; pausatLage = null; acc = 0; simClock = 0; rangePreview = false; lastUpgrade = -Infinity;
  refreshRoutes();
  say('Välj ett torn och en ledig ruta bredvid stigen. Markera sedan tornet för att förbättra skada, räckvidd och eldhastighet.'); ritaUI();
}
function enhetPa(kol, rad) { return arme.find(a => a.kol === kol && a.rad === rad); }
function selected() { return arme.find(a => a.id === valdArme); }
function isPath(kol, rad) {
  if(activeMode==='maze') return (kol===0 || kol===11) && rad===4;
  return LTD.arBana(kol, rad) || (rad === 8 && kol >= 9);
}
function mazePlacement(kol,rad) {
  const point=rutaMitt(kol,rad), blockers=[...arme,{kol,rad}];
  if(isPath(kol,rad))return false;
  if(fiender.some(f=>!f.avraknad && Math.hypot(f.x-point.x,f.y-point.y)<CELL))return false;
  if(!LTD_MAZE.route(blockers))return false;
  return fiender.every(f=>{
    if(f.avraknad)return true;
    const next=(f.route || BANPUNKTER)[f.banSteg];
    return !next || !!LTD_MAZE.route(blockers,{kol:Math.round((next.x-GRID_X0)/CELL-.5),rad:Math.round((next.y-GRID_Y0)/CELL-.5)});
  });
}
function refreshRoutes() {
  Object.assign(KUNG,rutaMitt(activeMode==='maze'?11:LTD.KUNG_RUTA.kol,activeMode==='maze'?4:LTD.KUNG_RUTA.rad));
  if(activeMode==='maze') {
    BANPUNKTER=LTD_MAZE.route(arme).map(p=>rutaMitt(p.kol,p.rad));
    for(const f of fiender) {
      if(f.avraknad)continue;
      const next=(f.route || BANPUNKTER)[f.banSteg];
      if(!next)continue;
      const cells=LTD_MAZE.route(arme,{kol:Math.round((next.x-GRID_X0)/CELL-.5),rad:Math.round((next.y-GRID_Y0)/CELL-.5)});
      f.route=cells.map(p=>rutaMitt(p.kol,p.rad)); f.banSteg=0;
      f.progress=-Math.hypot(next.x-f.x,next.y-f.y)-(f.route.length-1)*CELL;
    }
  } else BANPUNKTER=[...LTD.BANA.map(p=>rutaMitt(p.kol,p.rad)),KUNG];
  if(assetsReady)background=makeBackground();
}
function updateMode() {
  const maze=$('mode-select').value==='maze';
  $('mode-description').textContent=maze?'Maze: tornen formar vägen från vänster till höger. En öppen väg måste alltid finnas. Kartvalet väljer landskap.':'Klassiskt: fiender följer kartans fasta väg.';
  renderMapCards(); updateMapPreview();
}
function valjButik(id) {
  if (!assetsReady || !canBuild() || !LTD.ENHET[id] || LTD.KLASS_AV[id].id!==activeClass) return;
  valdButik = valdButik === id ? null : id; valdArme = null; rangePreview = false;
  say(valdButik ? `${LTD.ENHET[id].namn}: ${LTD_GUIDE[id].summary} Välj en ledig ruta.` : 'Val avbrutet.'); ritaUI();
}
function placera(kol, rad) {
  if (!assetsReady || kol < 0 || rad < 0 || kol >= LTD.GRID_KOL || rad >= LTD.GRID_RAD) return;
  const existing = enhetPa(kol, rad);
  if (existing) { valdArme = existing.id; valdButik = null; rangePreview = false; ritaUI(); return; }
  if (!canBuild()) return;
  if (!valdButik) { valdArme = null; return ritaUI(); }
  const enhet = LTD.ENHET[valdButik];
  if (!enhet || LTD.KLASS_AV[enhet.id].id!==activeClass) return;
  if (isPath(kol, rad)) return say('Här går stigen. Välj en ledig markruta. Ingen Ramen har dragits.');
  if (activeMode==='maze' && !mazePlacement(kol,rad)) return say('Bygget skulle blockera vägen eller en fiende. Lämna en öppen passage. Ingen Ramen har dragits.');
  if (saldo < enhet.pris) return say(`Saknar ${nr(enhet.pris - saldo)} Ramen för ${enhet.namn}.`);
  andraSaldo(-enhet.pris);
  const a = { id: nastaId++, enhet, kol, rad, damageLevel: 0, rangeLevel: 0, speedLevel: 0, betalt: enhet.pris, target: 'first', pulse: .4 };
  arme.push(a); valdArme = a.id; valdButik = null;
  if(activeMode==='maze')refreshRoutes();
  if(lage==='strid') syncCombatTowers();
  say(`${enhet.namn} placerad. Uppgradera skada, räckvidd och eldhastighet var för sig.`); ritaUI();
}
function uppgradera(track, expected) {
  const a = selected(); if (!a || !assetsReady) return;
  const now = performance.now(); if (now - lastUpgrade < 450) return;
  const result = LTD_RULES.upgrade(a, track, saldo, lage, expected, seals); if (!result) return;
  seals -= result.token; a.spentSeals = (a.spentSeals || 0) + result.token;
  lastUpgrade = now; andraSaldo(-result.cost); a[track + 'Level'] = result.level; a.betalt += result.cost; a.pulse = .45;
  if(lage==='strid') syncCombatTowers();
  say(`${a.enhet.namn}: ${{damage:'Skada',range:'Räckvidd',speed:'Eldhastighet'}[track]} ${result.level}/6 för ${nr(result.cost)} Ramen${result.token ? ' + 1 sigill' : ''}.`); ritaUI();
}
function salj() {
  const a = selected(); if (!a || lage !== 'bygg') return;
  seals += (a.spentSeals || 0) + (a.rune ? 1 : 0);
  const amount = LTD_RULES.sale(a), paid = andraSaldo(amount); arme = arme.filter(t => t !== a); valdArme = null;
  if(activeMode==='maze')refreshRoutes();
  say(`${a.enhet.namn} såld för ${nr(paid)} Ramen${paid < amount ? ' (begränsat av saldotaket)' : ''}.`); ritaUI();
}
function avbryt() { valdButik = null; valdArme = null; rangePreview = false; ritaUI(); }
function byggTorn() {
  torn = arme.map(a => ({ ...a, ...rutaMitt(a.kol, a.rad), ...towerStats(a),
    svaghetPx: towerStats(a).svaghetRadie * CELL, armeId: a.id, kylTimer: 0, rekyl: 0, angle: 0, shots: 0 }));
}
function syncCombatTowers() {
  // Keep live objects and their attack progress: upgrading never grants a free shot.
  const existing=new Map(torn.map(t=>[t.id,t]));
  torn=arme.map(a=>{
    const stats=towerStats(a), t=existing.get(a.id);
    if(t) {
      const remaining=Math.max(0,t.kylTimer)/t.interval;
      Object.assign(t,a,stats,{svaghetPx:stats.svaghetRadie*CELL});
      t.kylTimer=remaining*stats.interval; return t;
    }
    return {...a,...rutaMitt(a.kol,a.rad),...stats,svaghetPx:stats.svaghetRadie*CELL,armeId:a.id,kylTimer:stats.interval,rekyl:0,angle:0,shots:0};
  });
}
function engrave(id) {
  const a = selected();
  if (!assetsReady || !canBuild() || !a || a.rune || seals < 1 || !LTD_RULES.RUNES.some(r=>r.id===id)) return false;
  a.rune = id; seals--; if(lage==='strid')syncCombatTowers(); say(`${a.enhet.namn} har fått ${LTD_RULES.RUNES.find(r=>r.id===id).name}.`); ritaUI(); return true;
}
function chooseReward(wave, id) {
  const reward = rewards.find(r=>r.wave===wave);
  if (!reward || !['bygg','vinst'].includes(lage)) return false;
  const option = reward.options.find(o=>o.id===id); if (!option) return false;
  rewards = rewards.filter(r=>r!==reward);
  if (option.typ==='tecken') seals += option.antal;
  if (option.typ==='krydda') kryddor[option.falt] *= 1+option.andel;
  if (option.typ==='ramen') andraSaldo(option.antal);
  if (option.typ==='liv') liv = Math.min(30,liv+option.antal);
  say(`Bossbonus: ${option.namn}. ${option.text}`); ritaUI(); return true;
}
function continueExpedition() {
  if (lage !== 'vinst' || vagNr !== 20 || expedition) return false;
  expedition = true; vagNr = 21; lage = 'bygg'; vagResultat = null;
  say('Expedition: våg 21–40. Du behåller torn, sigill, bonusar, Ramen och liv.'); ritaUI(); return true;
}
function startaVag() {
  if (!assetsReady || lage !== 'bygg') return;
  if (!arme.length) return say('Placera minst ett torn innan vågen startar.');
  rantebas = saldo; spawnKvar = LTD.vag(vagNr, activeDifficulty).kon.map(f => ({ ...f })); fiender = []; skott = []; effects = []; byggTorn();
  spawnTimer = 0; stridTid = 0; avraknad = false; texter = []; lage = 'strid'; acc = 0; valdButik = null; rangePreview = false;
  say(`Våg ${vagNr}. Tornen skjuter automatiskt. Räntan är låst till ${nr(beraknadRanta(rantebas))} Ramen före saldotak.`); ritaUI();
}

// ---------- combat ----------
function spawnaNasta() {
  const f = spawnKvar.shift(); if (!f) return;
  fiender.push({ ...f, id: enemyId++, x: BANPUNKTER[0].x, y: BANPUNKTER[0].y, banSteg: 1, route: activeMode==='maze' ? [...BANPUNKTER] : null, progress: activeMode==='maze' ? -(BANPUNKTER.length-1)*CELL : 0,
    halsa: f.maxHalsa, kylaKvar: 0, kylaAndel: 0, avraknad: false, blink: 0, angle: 0,
    r: f.boss ? 24 : f.typ === 'svarm' ? 9 : 12 });
}
function addEffect(x, y, color, radius = 12) {
  if (reduced) return;
  effects.push({ x, y, color, radius, life: .25, max: .25 }); if (effects.length > 120) effects.shift();
}
function skadaFiende(f, damage, armorPierce = 0, useVulnerability = true) {
  if (f.avraknad || lage !== 'strid') return;
  f.halsa -= LTD_RULES.hit(damage * (1 + (useVulnerability ? LTD_RULES.sarbarhet(torn, f) : 0)), (f.minskadSkada || 0) * (1-armorPierce)); f.blink = .08;
  if (f.halsa <= 0) {
    f.avraknad = true; const paid = andraSaldo(Math.floor(f.belaning * kryddor.belaning)); statistik.dodade++; statistik.tjanat += paid;
    if (f.boss && !bossKills.has(vagNr)) {
      bossKills.add(vagNr); seals += 2;
      const bonus = andraSaldo(150 + 30*vagNr); statistik.tjanat += bonus;
      rewards.push({wave:vagNr, options:LTD.vag(vagNr, activeDifficulty).paket});
      say(`Boss besegrad! +${bonus} Ramen, +2 bosssigill. Välj en extra bossbonus efter vågen.`);
      updateHUD();
    }
    if (!reduced) { texter.push({ x: f.x, y: f.y - 18, text: `+${paid}`, life: .7 }); if (texter.length > 24) texter.shift(); }
    addEffect(f.x, f.y, '#e2d3a3', 16);
  }
}
function lacka(f) {
  if (f.avraknad || lage !== 'strid') return;
  f.avraknad = true; liv = Math.max(0, liv - f.liv); statistik.lackta++;
  say(`${f.namn} nådde köket. −${f.liv} kungaliv.`);
  if (!liv) forlora();
}
function gaBana(f, dt) {
  const route=f.route || BANPUNKTER;
  let remaining = f.fart * CELL * (1 - f.kylaAndel) * dt;
  while (remaining > 0 && !f.avraknad && lage === 'strid') {
    if (f.banSteg >= route.length) { lacka(f); return; }
    const p = route[f.banSteg], dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
    const moved = Math.min(d, remaining); if (d) { f.angle = Math.atan2(dy, dx); f.x += dx / d * moved; f.y += dy / d * moved; }
    f.progress += moved; remaining -= moved; if (d <= moved) f.banSteg++;
  }
}
function valjMal(t) { return LTD_RULES.target(fiender, t, t.rangeEff * CELL, t.target); }
function skjut(t, mal) {
  t.angle = Math.atan2(mal.y - t.y, mal.x - t.x); t.rekyl = .12;
  t.shots = (t.shots || 0)+1;
  const payload = {rune:t.rune, armorPierce:t.enhet.armorPierce || 0, chain:t.enhet.kedja,
    poison:t.giftPerSekund ? {dps:t.giftPerSekund,time:t.giftTid} : null,
    healBlock:t.enhet.healBlock || 0,
    skada:t.damageEff * (t.rune==='echo' && t.shots%3===0 ? 2 : 1) * (t.enhet.burstEvery && t.shots%t.enhet.burstEvery===0 ? 2 : 1)};
  if (t.enhet.virvel) {
    for (const f of fiender.filter(f=>!f.avraknad && Math.hypot(f.x-t.x,f.y-t.y)<=t.rangeEff*CELL)) hitPayload(f,payload);
    addEffect(t.x,t.y,LTD_GUIDE[t.enhet.id].color,t.rangeEff*CELL); return;
  }
  skott.push({ x: t.x + Math.cos(t.angle) * 15, y: t.y - 7 + Math.sin(t.angle) * 15, mal, skada: t.damageEff,
    omrade: (t.enhet.omrade || 0) * CELL, kyla: t.enhet.kyla, type: LTD_GUIDE[t.enhet.id].projectile,
    color: LTD_GUIDE[t.enhet.id].color, angle: t.angle, ...payload });
}
function applySlow(f, slow) {
  if (!slow || f.avraknad) return;
  const amount = f.boss ? slow.bossAndel : slow.andel;
  if (amount >= f.kylaAndel) { f.kylaAndel = amount; f.kylaKvar = Math.max(f.kylaKvar,slow.tid); }
}
function hitPayload(f, s, multiplier = 1) {
  skadaFiende(f, s.skada * multiplier * (s.rune==='slayer' && f.boss ? 1.75 : 1), s.rune==='pierce' ? 1 : (s.armorPierce || 0));
  applySlow(f,s.kyla); if(s.rune==='frost') applySlow(f,{andel:.25,bossAndel:.1,tid:2});
  if(s.healBlock && !f.avraknad) f.healBlocked=Math.max(f.healBlocked || 0,s.healBlock);
  if (s.poison && !f.avraknad) {
    f.poisonDps = Math.max(f.poisonDps || 0,s.poison.dps*(s.rune==='slayer' && f.boss ? 1.75 : 1)); f.poisonTime = s.poison.time;
  }
}
function traff(s) {
  if (!s.mal || s.mal.avraknad) return;
  const victims = s.omrade ? fiender.filter(f => !f.avraknad && Math.hypot(f.x - s.x, f.y - s.y) <= s.omrade) : [s.mal];
  const chain = s.chain ? LTD_RULES.kedjemal(fiender, s.mal, s.chain.radie*CELL, s.chain.hopp, victims.map(f=>f.id)) : [];
  for (const f of victims) hitPayload(f,s);
  let previous = s.mal;
  for (const [i,f] of chain.entries()) {
    hitPayload(f,s,Math.pow(s.chain.andel,i+1));
    if (!reduced && effects.length<120) effects.push({x:f.x,y:f.y,fromX:previous.x,fromY:previous.y,color:s.color,radius:12,life:.25,max:.25});
    previous = f;
  }
  addEffect(s.x, s.y, s.color, s.omrade || 14);
}
function steg(dt) {
  if (lage !== 'strid') return;
  stridTid += dt; simClock += dt;
  if (spawnKvar.length) { spawnTimer -= dt; if (spawnTimer <= 0) { spawnaNasta(); spawnTimer += .45; } }
  for(const f of fiender) f.healBlocked=Math.max(0,(f.healBlocked || 0)-dt);
  for (const f of fiender) {
    if (f.avraknad) continue;
    if (f.poisonTime > 0) {
      const duration = Math.min(dt,f.poisonTime); f.poisonTime -= duration;
      f.poisonDebt = (f.poisonDebt || 0)+f.poisonDps*duration*(1+LTD_RULES.sarbarhet(torn,f));
      if (f.poisonDebt >= 1 || f.poisonTime <= 0) {
        const damage = f.poisonTime <= 0 ? Math.round(f.poisonDebt) : Math.floor(f.poisonDebt);
        if(damage>0) {skadaFiende(f,damage,1,false); f.poisonDebt-=damage;}
      }
      if(f.poisonTime<=0) {f.poisonDps=0;f.poisonDebt=0;}
      if(f.avraknad) continue;
    }
    if(f.hela) {
      f.healTimer = (f.healTimer || 0)-dt;
      if(f.healTimer<=0) {
        f.healTimer += f.hela.intervall;
        for(const ally of fiender) if(!ally.avraknad && !ally.healBlocked && ally!==f && Math.hypot(ally.x-f.x,ally.y-f.y)<=f.hela.radie*CELL) ally.halsa=Math.min(ally.maxHalsa,ally.halsa+ally.maxHalsa*f.hela.andel);
        addEffect(f.x,f.y,'#86e7b3',f.hela.radie*CELL);
      }
    }
    f.blink = Math.max(0, f.blink - dt); f.kylaKvar = Math.max(0, f.kylaKvar - dt); if (!f.kylaKvar) f.kylaAndel = 0;
    gaBana(f, dt); if (lage !== 'strid') return;
  }
  for (const t of torn) {
    t.rekyl = Math.max(0, t.rekyl - dt); t.kylTimer -= dt;
    if (t.kylTimer > 0) continue;
    const mal = valjMal(t); if (!mal) { t.kylTimer = 0; continue; }
    skjut(t, mal); t.kylTimer += t.interval;
  }
  skott = skott.filter(s => {
    if (s.mal.avraknad) return false;
    const dx = s.mal.x - s.x, dy = s.mal.y - s.y, d = Math.hypot(dx, dy), distance = SKOTT_FART * dt;
    s.angle = Math.atan2(dy, dx);
    if (d <= distance + s.mal.r) { s.x = s.mal.x; s.y = s.mal.y; traff(s); return false; }
    s.x += dx / d * distance; s.y += dy / d * distance; return true;
  });
  fiender = fiender.filter(f => !f.avraknad);
  texter = texter.filter(t => { t.life -= dt; t.y -= dt * 20; return t.life > 0; });
  effects = effects.filter(e => { e.life -= dt; return e.life > 0; });
  if (stridTid >= LTD.STRID_MAX) return timeoutAvrakning();
  if (!spawnKvar.length && !fiender.length) avslutaVag();
}
function timeoutAvrakning() {
  for (const f of [...fiender, ...spawnKvar]) { if (lage !== 'strid') break; lacka(f); }
  spawnKvar = []; fiender = []; skott = []; if (lage === 'strid') avslutaVag();
}
function avslutaVag() {
  if (avraknad || lage !== 'strid' || liv <= 0) return;
  avraknad = true;
  const beraknad = beraknadRanta(rantebas), utbetald = LTD_RULES.interest(rantebas, saldo);
  andraSaldo(utbetald); statistik.ranta += utbetald;
  vagResultat = { vag: vagNr, underlag: rantebas, beraknad, utbetald, tappad: beraknad - utbetald, saldo, liv };
  if (vagNr === (expedition ? 40 : 20)) { lage = 'vinst'; say(`Seger! ${vagNr} vågor avklarade med ${liv} kungaliv.${expedition ? '' : ' Fortsätt till expeditionen när du vill.'}`); }
  else { vagNr++; lage = 'bygg'; say(`Våg ${vagNr - 1} klar. ${nr(utbetald)} Ramen i ränta. Bygg eller uppgradera inför nästa våg.`); }
  torn = []; skott = []; effects = []; ritaUI();
}
function forlora() {
  avraknad = true; lage = 'forlust'; torn = []; fiender = []; skott = []; spawnKvar = []; effects = [];
  say(`Kungen föll på våg ${vagNr}. Ingen ränta betalas ut för förlustvågen.`); ritaUI();
}
function pausa() {
  if ($('guide-dialog').open) return;
  if (lage === 'paus') { lage = pausatLage; pausatLage = null; acc = 0; last = performance.now(); say('Fortsätter.'); }
  else if (lage === 'strid' || lage === 'bygg') { pausatLage = lage; lage = 'paus'; say('Pausat. Välj Fortsätt.'); }
  ritaUI();
}
function startaOm() {
  if ((arme.length || vagNr > 1) && !['vinst', 'forlust'].includes(lage) && !confirm('Starta om? Den pågående matchen raderas.')) return;
  activeClass=null; $('setup-class').value=''; $('map-select').value=''; nyMatch(); updateSetupRoster(); updateMapPreview();
}

// ---------- rendering ----------
function ring(x, y, radius, color, dash = false) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color + '12'; ctx.lineWidth = 1.5;
  if (dash) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, W, H); if (!assetsReady) { ctx.fillStyle = '#31432e'; ctx.fillRect(0, 0, W, H); return; }
  ctx.drawImage(background, 0, 0);
  sprite(ctx, 'kitchen', 0, 0, 1, 1, KUNG.x + 9, KUNG.y - 11, 96);
  sprite(ctx, 'creatures', 1, 2, 4, 3, KUNG.x - 22, KUNG.y + 9, 51);
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#f4e4b1'; ctx.textAlign = 'center'; ctx.fillText(`${liv} ♥`, KUNG.x, KUNG.y + 37);
  const chosen = selected();
  if (chosen || valdButik) {
    const a = chosen || { enhet: LTD.ENHET[valdButik], damageLevel: 0, rangeLevel: 0, ...markor };
    const p = rutaMitt(a.kol, a.rad), st = towerStats(a);
    ring(p.x, p.y, st.rangeEff * CELL, a.enhet.stod ? '#d0a7ef' : '#e2e9a5');
    if (rangePreview && chosen && a.rangeLevel < LTD_RULES.MAX_MASTER && canBuild()) {
      const next = towerStats({ ...a, rangeLevel: a.rangeLevel + 1 });
      ring(p.x, p.y, next.rangeEff * CELL, '#80ded0', true);
    }
    if (a.enhet.stod) for (const t of arme) if (!t.enhet.stod && Math.hypot(t.kol - a.kol, t.rad - a.rad) <= st.aura) {
      const q = rutaMitt(t.kol, t.rad); ring(q.x, q.y, 24, '#d5b4ff');
    }
  }
  if (canBuild()) {
    const p = rutaMitt(markor.kol, markor.rad);
    ctx.strokeStyle = isPath(markor.kol, markor.rad) ? '#ed8467' : '#e5df93'; ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 26, p.y - 26, 52, 52);
    if (valdButik && !isPath(markor.kol, markor.rad) && !enhetPa(markor.kol, markor.rad)) {
      ctx.globalAlpha = .55; towerArt(ctx, { enhet: LTD.ENHET[valdButik], damageLevel: 0, rangeLevel: 0 }, p.x, p.y - 5, 65); ctx.globalAlpha = 1;
    }
  }
  const fighting = lage === 'strid' || (lage === 'paus' && pausatLage === 'strid');
  const towers = fighting ? torn : arme.map(a => ({ ...a, ...rutaMitt(a.kol, a.rad), ...towerStats(a) }));
  const objects = [...towers.map(t => ({ y: t.y, tower: t })), ...fiender.map(f => ({ y: f.y, enemy: f }))].sort((a, b) => a.y - b.y);
  for (const obj of objects) {
    if (obj.tower) {
      const t = obj.tower;
      ctx.fillStyle = '#10201255'; ctx.beginPath(); ctx.ellipse(t.x, t.y + 18, 24, 9, 0, 0, Math.PI * 2); ctx.fill();
      if (t.enhet.stod) ring(t.x, t.y + 12, 22 + (reduced ? 0 : Math.sin(simClock * 2) * 2), '#c8a5f4');
      towerArt(ctx, t, t.x, t.y - 6 + (!reduced && t.rekyl > 0 ? 2 : 0), 65);
      if (!reduced && t.rekyl > .06) {
        ctx.fillStyle = LTD_GUIDE[t.enhet.id].color; ctx.beginPath(); ctx.arc(t.x + Math.cos(t.angle) * 22, t.y - 7 + Math.sin(t.angle) * 22, 3, 0, Math.PI * 2); ctx.fill();
      }
      if (t.pulse > 0 && !reduced) ring(t.x, t.y, 26 + (1 - t.pulse / .45) * 8, '#f9de89');
      if (t.damageLevel || t.rangeLevel || t.speedLevel || t.id === valdArme) {
        ctx.fillStyle = '#112017dd'; ctx.beginPath(); ctx.roundRect(t.x - 29, t.y + 21, 58, 14, 4); ctx.fill();
        ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#f2ce94'; ctx.fillText(`⚔${t.damageLevel}`, t.x - 19, t.y + 31);
        ctx.fillStyle = '#a4e0d4'; ctx.fillText(`◎${t.rangeLevel}`, t.x, t.y + 31);
        ctx.fillStyle = '#d8b8ff'; ctx.fillText(`↯${t.speedLevel || 0}`, t.x + 19, t.y + 31);
      }
      if (t.supported) { ctx.fillStyle = '#ead0ff'; ctx.font = 'bold 13px Arial'; ctx.fillText('✦', t.x + 22, t.y - 22); }
    } else {
      const f = obj.enemy, indexes = { standard: 0, snabb: 1, svarm: 2, pansrad: 3, elit: 4 };
      const tile = f.boss ? 4 + Math.floor((((vagNr-1)%20)+1) / 5) : (f.ruta ?? indexes[f.typ]);
      const size = f.boss ? 70 : f.typ === 'svarm' ? 30 : f.typ === 'elit' ? 47 : 41;
      const bob = reduced || !fighting ? 0 : Math.sin(simClock * 10 + f.id) * 1.8;
      ctx.fillStyle = '#19211255'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 11, size * .3, size * .11, 0, 0, Math.PI * 2); ctx.fill();
      if (f.blink > 0 && !reduced) ctx.globalAlpha = .65;
      sprite(ctx, 'creatures', tile % 4, Math.floor(tile / 4), 4, 3, f.x, f.y - 6 + bob, size, size, Math.cos(f.angle) < 0); ctx.globalAlpha = 1;
      if(f.hela) {ring(f.x,f.y,22,'#86e7b3');ctx.font='bold 18px Arial';ctx.fillStyle='#b6ffd8';ctx.fillText('+',f.x+20,f.y-18);}
      if(f.poisonTime>0) {ctx.font='bold 10px Arial';ctx.fillStyle='#b3f08a';ctx.fillText('GIFT',f.x,f.y+25);}
      if (f.kylaAndel) { ring(f.x, f.y, size * .42, '#80deff'); ctx.font = '12px Arial'; ctx.fillStyle = '#e0faff'; ctx.fillText('❄', f.x + size * .35, f.y - size * .3); }
      if (f.halsa < f.maxHalsa) {
        ctx.fillStyle = '#182015'; ctx.fillRect(f.x - 17, f.y - size * .52, 34, 4);
        ctx.fillStyle = '#df926e'; ctx.fillRect(f.x - 17, f.y - size * .52, 34 * Math.max(0, f.halsa / f.maxHalsa), 4);
      }
    }
  }
  for (const s of skott) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    // Emissive projectile artwork uses screen blending; its dark backing is not drawn over the terrain.
    ctx.globalCompositeOperation = 'screen';
    ctx.beginPath(); ctx.ellipse(0, 0, s.omrade ? 11 : 9, s.type === 0 || s.type === 1 ? 3 : 8, 0, 0, Math.PI * 2); ctx.clip();
    sprite(ctx, 'projectiles', s.type % 3, Math.floor(s.type / 3), 3, 2, 0, 0, s.omrade ? 22 : 18); ctx.restore();
  }
  for (const e of effects) {
    ctx.globalAlpha = Math.max(0, e.life / e.max);
    if(e.fromX !== undefined) {ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.fromX,e.fromY);ctx.lineTo(e.x,e.y);ctx.stroke();}
    ring(e.x, e.y, e.radius * (1 - e.life / e.max * .7), e.color);
  }
  ctx.globalAlpha = 1;
  for (const t of texter) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#fbebaa'; ctx.strokeStyle = '#243520'; ctx.lineWidth = 3; ctx.strokeText(t.text, t.x, t.y); ctx.fillText(t.text, t.x, t.y); } ctx.globalAlpha = 1;
  const boss = fiender.find(f => f.boss);
  if (boss) { ctx.fillStyle = '#171d16df'; ctx.fillRect(250, 10, 460, 26); ctx.fillStyle = '#b95f58'; ctx.fillRect(256, 28, 448 * Math.max(0, boss.halsa / boss.maxHalsa), 4); ctx.fillStyle = '#ffecd0'; ctx.font = 'bold 11px Arial'; ctx.fillText(LTD.vag(vagNr, activeDifficulty).bossnamn, 480, 23); }
  if (fighting && LTD.STRID_MAX - stridTid <= 10) { ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#ffe0c2'; ctx.fillText(`Tid kvar: ${Math.ceil(LTD.STRID_MAX - stridTid)}`, W / 2, H - 20); }
  if (['paus', 'vinst', 'forlust'].includes(lage)) {
    ctx.fillStyle = '#102017d9'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#f3e6c2'; ctx.font = 'bold 36px Arial';
    ctx.fillText(lage === 'paus' ? 'PAUS' : lage === 'vinst' ? 'KÖKET ÄR RÄDDAT!' : 'KUNGEN FÖLL', W / 2, H / 2 - 20);
    ctx.font = '14px Arial'; ctx.fillStyle = '#cbd6b1';
    ctx.fillText(lage === 'paus' ? 'Välj Fortsätt när du är redo.' : `${statistik.dodade} fiender · ${nr(statistik.tjanat)} intjänat · ${nr(statistik.ranta)} i ränta`, W / 2, H / 2 + 14);
  }
}

// ---------- interface ----------
function paintShop() {
  for (const e of LTD.ENHETER) portrait(document.querySelector(`[data-art="${e.id}"]`), { enhet: e, damageLevel: 0, rangeLevel: 0 });
}
function statPair(label, value) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; $('tower-stats').append(dt, dd); }
function updateProgression() {
  const setup=lage==='setup';
  $('setup-panel').hidden=!setup; $('match-area').hidden=setup; $('match-hud').hidden=setup;
  $('match-selection').hidden=setup; $('army-bonuses').hidden=setup;
  $('maze-info').hidden=activeMode!=='maze' || lage==='setup';
  $('maze-info').textContent='MAZE · Aktuell väg: '+(BANPUNKTER.length-1)+' rutor (rak väg: 11). Bygg på vägen för att skapa omvägar. Grönt = start, köket = mål. Blockerande byggen stoppas.';
  $('match-selection').textContent=activeClass ? `${LTD.KLASSER.find(c=>c.id===activeClass).namn} · ${LTD.activeMap.name} · ${LTD.DIFFICULTIES[activeDifficulty].name} · ${activeMode==='maze'?'Maze':'Klassiskt'} · 6 torn · Bygg och uppgradera under vågen` : '';
  $('expedition').hidden = !(lage==='vinst' && vagNr===20 && !expedition);
  $('boss-rewards').hidden = rewards.length === 0;
  const box = $('reward-choices'); box.replaceChildren();
  for (const reward of rewards) {
    const row = document.createElement('section'), title = document.createElement('h3');
    title.textContent = `Våg ${reward.wave} · välj en bonus`; row.append(title);
    const cards = document.createElement('div'); cards.className='reward-cards';
    for(const option of reward.options) {
      const button=document.createElement('button'), name=document.createElement('b'), text=document.createElement('span');
      button.className='reward-card'; name.textContent=option.namn; text.textContent=option.text;
      button.append(name,text); button.disabled=!['bygg','vinst'].includes(lage);
      button.addEventListener('click',()=>chooseReward(reward.wave,option.id)); cards.append(button);
    }
    row.append(cards); box.append(row);
  }
  $('army-bonuses').textContent=`Legionsbonusar · Skada +${nr((kryddor.skada-1)*100)} % · Räckvidd +${nr((kryddor.rackvidd-1)*100)} % · Eldhastighet +${nr((kryddor.fart-1)*100)} % · Belöning +${nr((kryddor.belaning-1)*100)} %`;
  for(const button of $('class-tabs').children) button.setAttribute('aria-pressed',String(button.dataset.klass===activeClass));
  $('class-description').textContent=LTD.KLASSER.find(c=>c.id===activeClass)?.beskrivning || '';
  for(const e of LTD.ENHETER) document.querySelector(`[data-enhet="${e.id}"]`).hidden=LTD.KLASS_AV[e.id].id!==activeClass;
}
function updatePanel() {
  const a = selected(); $('vald-panel').hidden = !a; $('empty-selection').hidden = !!a; if (!a) return;
  const e = a.enhet, info = LTD_GUIDE[e.id], st = towerStats(a);
  $('vald-namn').textContent = e.namn; $('vald-roll').textContent = info.role; $('vald-info').textContent = info.summary;
  $('levels').textContent = `Skada ${a.damageLevel}/6 · Räckvidd ${a.rangeLevel}/6 · Fart ${a.speedLevel}/6`;
  portrait($('selected-art'), a); $('tower-stats').replaceChildren();
  statPair('Skada per träff', nr(st.damageEff)); statPair('Skottintervall', `${dec(st.interval)} s`);
  statPair('Räckvidd', `${dec(st.rangeEff)} rutor`); statPair('Teoretisk DPS', dec(Math.round(st.damageEff) / st.interval));
  if (e.omrade) statPair('Sprängradie', `${dec(e.omrade)} rutor`);
  if (e.kyla) statPair('Kyla / boss', `${nr(e.kyla.andel*100)} % / ${nr(e.kyla.bossAndel*100)} % · ${dec(e.kyla.tid)} s`);
  if(e.kedja) statPair('Kedja', `${e.kedja.hopp+1} mål · ${dec(e.kedja.radie)} rutor/hopp`);
  if(e.gift) statPair('Gift genom pansar', `${dec(st.giftPerSekund)}/s · ${dec(st.giftTid)} s`);
  if(e.svaghet) statPair('Sårbarhet', '+25 % skada inom räckvidden');
  if(e.virvel) statPair('Attack', 'Alla fiender inom räckvidden');
  if(e.armorPierce) statPair('Pansargenomslag', `${nr(e.armorPierce*100)} %`);
  if(e.burstEvery) statPair('Förstärkt skott', `Var ${e.burstEvery}:e attack ×2 skada`);
  if(e.healBlock) statPair('Läkblockering', `${e.healBlock} sekunder`);
  $('rune-status').textContent=a.rune ? `Aktiv: ${LTD_RULES.RUNES.find(r=>r.id===a.rune).name}` : `Ledig runplats · ${seals} sigill tillgängliga`;
  for(const button of $('rune-choices').children) {
    button.disabled=!canBuild() || !!a.rune || seals<1;
    button.setAttribute('aria-pressed',String(a.rune===button.dataset.rune));
  }
  if (e.stod) {
    statPair('Auraradie', `${dec(st.aura)} rutor`);
    statPair('Torn inom auran', arme.filter(t => !t.enhet.stod && Math.hypot(t.kol - a.kol, t.rad - a.rad) <= st.aura).length);
  }
  $('aura-info').hidden = !st.supported && !e.stod;
  $('aura-info').textContent = e.stod ? 'Stöd: +25 % skada och +15 % räckvidd. Skadeuppgraderingen gäller dina egna skott. Räckvidd förbättrar också auran.' : `Munkstöd aktivt: +25 % skada, +15 % räckvidd. Utan stöd: ${nr(st.damage)} skada / ${dec(st.range)} rutor.`;
  $('target-mode').value = a.target; $('target-mode').disabled = ['vinst', 'forlust'].includes(lage);
  for (const track of ['damage', 'range', 'speed']) {
    const level = a[track + 'Level'], price = LTD_RULES.price(a, track), max = price === null;
    const next = towerStats({ ...a, [track + 'Level']: Math.min(LTD_RULES.MAX_MASTER, level + 1) });
    $(track + '-level').textContent = `${{damage:'SKADA',range:'RÄCKVIDD',speed:'ELDHASTIGHET'}[track]} ${level}/6`;
    $(track + '-preview').textContent = track === 'damage' ? `${nr(st.damageEff)}${max ? '' : ` → ${nr(next.damageEff)}`}` : track === 'range' ? `${dec(st.rangeEff)}${max ? '' : ` → ${dec(next.rangeEff)}`}` : `${dec(st.interval)}${max ? '' : ` → ${dec(next.interval)}`} s`;
    $(track + '-name').textContent = track === 'speed' ? `${['Grundladdare','Snabbladdare','Automatisk matning','Överladdat verk','Mästarladdare','Runmotor','Stjärnmotor'][max ? level : level + 1]} · ${dec(Math.round(next.damageEff)/next.interval)} DPS` : info[track + 'Names'][max ? level : level + 1];
    const button = $('upgrade-' + track); button.dataset.level = level;
    const token = LTD_RULES.teckenKostnad(level);
    button.disabled = !assetsReady || max || !canBuild() || saldo < price || seals < token;
    button.textContent = max ? 'MAX NIVÅ' : !canBuild() ? 'Pausat / match avslutad' : saldo < price ? `Saknar ${nr(price - saldo)} Ramen` : seals < token ? 'Kräver 1 bosssigill' : `Uppgradera · ${nr(price)} Ramen${token ? ' + 1 sigill' : ''}`;
    $(track + '-interest').textContent = !max && canBuild() ? lage==='strid' ? 'Vågens ränta är redan låst.' : saldo >= price ? `Ränta: −${nr(beraknadRanta(saldo) - beraknadRanta(saldo - price))} före tak` : `Pris: ${nr(price)} Ramen` : '';
  }
  const sale = LTD_RULES.sale(a); $('salj').textContent = `Sälj · +${nr(Math.min(sale, LTD.TAK - saldo))}${saldo + sale > LTD.TAK ? ' (tak)' : ''}`;
  $('salj').disabled = lage !== 'bygg';
}
function updateHUD() {
  $('seals').textContent = seals;
  $('ramen').textContent = `${nr(saldo)} / ${nr(LTD.TAK)}`; $('liv').textContent = liv; $('vag').textContent = `${vagNr} / ${expedition ? 40 : 20}`;
  const locked = lage === 'strid' || (lage === 'paus' && pausatLage === 'strid');
  $('ranta').textContent = `${nr(beraknadRanta(locked ? rantebas : saldo))} ${locked ? '(låst)' : 'före tak'}`;
}
function ritaUI() {
  updateProgression();
  updateHUD(); $('fas').textContent = { setup:'Välj klass och karta', bygg: 'Byggfas', strid: 'Strid', paus: 'Pausad', vinst: 'Seger', forlust: 'Förlust' }[lage];
  const v = LTD.vag(vagNr, activeDifficulty); $('nasta-vag').textContent = `Våg ${vagNr}: ${LTD.vagText(vagNr)}`;
  $('nasta-egenskap').textContent = v.harBoss ? `${v.bossnamn} · Döda bossen: 2 sigill + ${150+30*vagNr} bonus-Ramen och ett bonusval. Läckage kostar 5 liv och ger ingen skatt.` : `Bashälsa ${nr(v.bas.halsa)} · Grundbelöning ${v.bas.belaning} Ramen. Varje vanlig läcka kostar 1 liv.${vagNr>=16 ? ' Soppkockar läker fiender i närheten: prioritera dem!' : ''}`;
  for (const e of LTD.ENHETER) {
    const button = document.querySelector(`[data-enhet="${e.id}"]`);
    button.disabled = !assetsReady || !canBuild(); button.classList.toggle('vald', valdButik === e.id); button.classList.toggle('orad', saldo < e.pris);
  }
  updatePanel(); $('starta-vag').disabled = !assetsReady || lage !== 'bygg';
  $('pausa').textContent = lage === 'paus' ? 'Fortsätt' : 'Pausa'; $('pausa').disabled = !['bygg', 'strid', 'paus'].includes(lage);
  $('fart').textContent = `${fart}×`; $('resultat').hidden = !vagResultat;
  if (vagResultat) $('resultat').textContent = `Våg ${vagResultat.vag}: ${nr(vagResultat.underlag)} i underlag → ${nr(vagResultat.utbetald)} Ramen i ränta${vagResultat.tappad ? ` · ${nr(vagResultat.tappad)} fick inte plats` : ''}. Totalt: ${statistik.dodade} dödade · ${nr(statistik.tjanat)} från fiender · ${nr(statistik.ranta)} i ränta.`;
}
function showGuide(id) {
  guideTower = id || selected()?.enhet.id || 'zebravakt';
  if (lage === 'strid') { pausatLage = lage; lage = 'paus'; acc = 0; say('Tornguiden har pausat striden. Stäng guiden och välj Fortsätt.'); ritaUI(); }
  renderGuide(); if (!$('guide-dialog').open) $('guide-dialog').showModal();
}
function renderGuide() {
  const e = LTD.ENHET[guideTower], info = LTD_GUIDE[guideTower];
  for (const button of $('guide-tabs').children) button.setAttribute('aria-pressed', String(button.dataset.guide === guideTower));
  const body = $('guide-body'); body.replaceChildren();
  const hero = document.createElement('div'); hero.className = 'guide-hero';
  const art = document.createElement('canvas'); art.width = art.height = 320; art.setAttribute('aria-hidden', 'true');
  const copy = document.createElement('div'), name = document.createElement('h3'), intro = document.createElement('p');
  name.textContent = e.namn; intro.textContent = info.summary; copy.append(name, intro); hero.append(art, copy); body.append(hero);
  portrait(art, { enhet: e, damageLevel: 0, rangeLevel: 0 });
  const details = document.createElement('div'); details.className = 'guide-details';
  for (const [title, text] of [['Attack & specialeffekt', info.attack], ['Styrka', info.strength], ['Svaghet', info.weakness], ['Placering & mål', info.placement], ['Vad uppgraderingarna gör', info.upgrades + ' Eldhastighet kortar tiden mellan skott: +20 %, +50 %, +90 %, +130 %, +180 % och +240 % fler skott per sekund. Skada per träff, aura och köldstyrka ändras inte.'], ['Kostnad & ekonomi', `Byggpris ${e.pris} Ramen. Försäljning ger 70 % av faktiskt betalt, inklusive alla tre uppgraderingsspåren. Bygg och uppgradera under eller mellan vågor. Försäljning sker mellan vågor.`]]) {
    const cell = document.createElement('section'), h = document.createElement('h4'), p = document.createElement('p'); h.textContent = title; p.textContent = text; cell.append(h, p); details.append(cell);
  }
  body.append(details);
  for (const track of ['damage', 'range', 'speed']) {
    const h = document.createElement('h4'); h.textContent = track === 'damage' ? 'Skadespåret · starkare träffar' : track === 'range' ? 'Räckviddsspåret · större täckning' : 'Eldhastighet · kortare skottintervall'; body.append(h);
    const levels = document.createElement('div'); levels.className = 'guide-levels';
    for (let level = 0; level <= LTD_RULES.MAX_MASTER; level++) {
      const a = { enhet: e, damageLevel: track === 'damage' ? level : 0, rangeLevel: track === 'range' ? level : 0, speedLevel: track === 'speed' ? level : 0, kol: 0, rad: 0 };
      const figure = document.createElement('figure'), image = document.createElement('canvas'), caption = document.createElement('figcaption'); image.width = image.height = 192;
      const st = LTD_RULES.stats(a, []), previous = { ...a, [track + 'Level']: level - 1 };
      caption.textContent = `Nivå ${level}: ${track === 'damage' ? nr(st.damage) + ' skada' : track === 'range' ? dec(st.range) + ' rutor' : dec(st.interval) + ' s / skott'} · ${level ? LTD_RULES.price(previous, track) + ' Ramen' + (level > 3 ? ' + 1 sigill' : '') : 'grundvärde'}`;
      figure.append(image, caption); levels.append(figure); portrait(image, a);
    }
    body.append(levels);
  }
}

// ---------- input and loop ----------
for (const klass of LTD.KLASSER) {
  const option=document.createElement('option'); option.value=klass.id; option.textContent=`${klass.namn} · 6 torn`; $('setup-class').append(option);
}
$('mode-select').addEventListener('change',updateMode);
$('difficulty-select').addEventListener('change',updateDifficulty);
updateDifficulty();
$('setup-class').addEventListener('change',()=>{
  updateSetupRoster();
  $('map-select').value=''; updateMapPreview();
});
for(const rune of LTD_RULES.RUNES) {
  const button=document.createElement('button'); button.type='button'; button.className='rune-card'; button.dataset.rune=rune.id;
  const title=document.createElement('b'), text=document.createElement('span'); title.textContent=`${rune.icon} ${rune.name}`; text.textContent=rune.text;
  button.append(title,text); button.addEventListener('click',()=>engrave(rune.id)); $('rune-choices').append(button);
}
$('expedition').addEventListener('click',continueExpedition);
for (const [index, e] of LTD.ENHETER.entries()) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'ltd-kort'; button.dataset.enhet = e.id;
  const key = document.createElement('span'); key.className = 'key'; key.textContent = LTD.KLASS_AV[e.id].enheter.indexOf(e) + 1;
  const art = document.createElement('canvas'); art.width = 240; art.height = 160; art.dataset.art = e.id; art.setAttribute('aria-hidden', 'true');
  const name = document.createElement('b'), cost = document.createElement('i'), role = document.createElement('small'); name.textContent = e.namn; cost.textContent = `${e.pris} Ramen`; role.textContent = LTD_GUIDE[e.id].role;
  button.title = LTD_GUIDE[e.id].summary; button.setAttribute('aria-label', `${e.namn}, ${e.pris} Ramen. ${LTD_GUIDE[e.id].summary}`); button.append(key, art, name, cost, role); $('shop').append(button);
  button.addEventListener('click', () => valjButik(e.id));
  const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'control'; tab.dataset.guide = e.id; tab.textContent = e.namn; tab.addEventListener('click', () => { guideTower = e.id; renderGuide(); }); $('guide-tabs').append(tab);
}
function rutaFranPekare(event) {
  const rect = canvas.getBoundingClientRect(), x = (event.clientX - rect.left) * W / rect.width, y = (event.clientY - rect.top) * H / rect.height;
  const kol = Math.floor((x - GRID_X0) / CELL), rad = Math.floor((y - GRID_Y0) / CELL);
  return kol >= 0 && kol < LTD.GRID_KOL && rad >= 0 && rad < LTD.GRID_RAD ? { kol, rad } : null;
}
canvas.addEventListener('pointerdown', event => { const p = rutaFranPekare(event); if (p) { markor = p; placera(p.kol, p.rad); canvas.focus({ preventScroll: true }); } });
canvas.addEventListener('pointermove', event => { if (!canBuild()) return; const p = rutaFranPekare(event); if (p) markor = p; });
$('starta-vag').addEventListener('click', startaVag); $('pausa').addEventListener('click', pausa);
$('fart').addEventListener('click', () => { fart = fart === 1 ? 2 : 1; ritaUI(); }); $('avbryt').addEventListener('click', avbryt);
for (const track of ['damage', 'range', 'speed']) $('upgrade-' + track).addEventListener('click', event => { if (event.detail > 1) return; uppgradera(track, Number(event.currentTarget.dataset.level)); });
for (const event of ['pointerenter', 'focus']) $('upgrade-range').addEventListener(event, () => { rangePreview = true; });
for (const event of ['pointerleave', 'blur']) $('upgrade-range').addEventListener(event, () => { rangePreview = false; });
$('target-mode').addEventListener('change', event => { const a = selected(); if (a) { a.target = event.target.value; const t = torn.find(t => t.id === a.id); if (t) t.target = a.target; } });
$('salj').addEventListener('click', salj); $('start').addEventListener('click', startaOm);
$('guide-open').addEventListener('click', () => showGuide()); $('tower-help').addEventListener('click', () => showGuide());
$('guide-close').addEventListener('click', () => $('guide-dialog').close()); $('guide-dialog').addEventListener('cancel', event => { event.preventDefault(); $('guide-dialog').close(); });
$('reduced-effects').checked = reduced; $('reduced-effects').addEventListener('change', event => { reduced = event.target.checked; if (reduced) { effects = []; texter = []; } });
$('retry-assets').addEventListener('click', loadAssets);
for (const map of LTD.MAPS) {
  const option = document.createElement('option'); option.value = map.id; option.textContent = map.name;
  $('map-select').append(option);
}
renderMapCards();
$('map-select').value = '';
$('map-select').addEventListener('change', updateMapPreview);
$('play-map').addEventListener('click', () => playMap($('map-select').value));
updateMapPreview();
document.addEventListener('keydown', event => {
  if ($('guide-dialog').open) { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); $('guide-dialog').close(); } return; }
  const tag = event.target?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) || event.target?.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
  const k = event.key; if (event.repeat && ['Enter', ' ', 'p', 'P'].includes(k)) return;
  if (/^[1-6]$/.test(k)) { const e = LTD.KLASSER.find(c=>c.id===activeClass)?.enheter[Number(k)-1]; if(e) {event.preventDefault(); valjButik(e.id);} }
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (directions[k]) { event.preventDefault(); const [dk, dr] = directions[k]; markor = { kol: Math.max(0, Math.min(11, markor.kol + dk)), rad: Math.max(0, Math.min(8, markor.rad + dr)) }; }
  if (k === 'Enter') { event.preventDefault(); placera(markor.kol, markor.rad); }
  if (k === ' ') { event.preventDefault(); startaVag(); }
  if (k.toLowerCase() === 'p') { event.preventDefault(); pausa(); }
}, true);
document.addEventListener('visibilitychange', () => { if (document.hidden && ['bygg', 'strid'].includes(lage)) { pausatLage = lage; lage = 'paus'; acc = 0; say('Pausat när fliken doldes. Välj Fortsätt.'); ritaUI(); } });
function frame(time) {
  const dt = Math.max(0, Math.min((time - last) / 1000, .1)); last = time;
  if (lage === 'strid') {
    acc += dt * fart; let steps = 0;
    while (acc >= STEG && steps++ < 12 && lage === 'strid') { steg(STEG); acc = Math.max(0, acc - STEG); }
    if (acc > STEG * 12) acc = 0;
    uiClock += dt; if (uiClock >= .15) { updateHUD(); updatePanel(); uiClock = 0; }
  } else if (lage === 'bygg') {
    simClock += dt; for (const a of arme) a.pulse = Math.max(0, (a.pulse || 0) - dt);
  }
  draw(); requestAnimationFrame(frame);
}
nyMatch(); loadAssets(); requestAnimationFrame(frame);
