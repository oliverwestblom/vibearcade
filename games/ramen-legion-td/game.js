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
const BANPUNKTER = [...LTD.BANA.map(r => rutaMitt(r.kol, r.rad)), KUNG];
const BILDER = {}, assetNames = [...LTD.ENHETER.map(e => e.id), 'creatures', 'environment', 'projectiles'];
let assetsReady = false, assetLoading = false, background = null;
let saldo, liv, vagNr, rantebas, spill, lage, pausatLage, fart, arme, nastaId, valdButik, valdArme, markor;
let torn, fiender, skott, spawnKvar, spawnTimer, stridTid, avraknad, texter, effects, enemyId;
let statistik, vagResultat, acc = 0, last = 0, simClock = 0, uiClock = 0, rangePreview = false;
let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lastUpgrade = -Infinity, guideTower = 'zebravakt';

async function loadAssets() {
  if (assetLoading) return;
  assetLoading = true; assetsReady = false; $('retry-assets').hidden = true; $('loading').hidden = false;
  let done = 0;
  const failures = [];
  await Promise.all(assetNames.map(name => new Promise(resolve => {
    const image = new Image();
    image.onload = () => { BILDER[name] = image; done++; $('loading').textContent = `Laddar illustrationer… ${done}/${assetNames.length}`; resolve(); };
    image.onerror = () => { failures.push(name); resolve(); };
    image.src = `bilder/${name}-atlas.png`;
  })));
  assetLoading = false;
  if (failures.length) {
    $('loading').textContent = `Bilder kunde inte laddas: ${failures.join(', ')}. Försök igen.`;
    $('retry-assets').hidden = false; return;
  }
  assetsReady = true; $('loading').hidden = true; background = makeBackground();
  paintShop(); ritaUI();
}
function sprite(g, name, col, row, cols, rows, x, y, width, height = width, flip = false) {
  const image = BILDER[name]; if (!image) return;
  const sw = image.naturalWidth / cols, sh = image.naturalHeight / rows;
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  g.drawImage(image, col * sw, row * sh, sw, sh, -width / 2, -height / 2, width, height); g.restore();
}
function towerArt(g, a, x, y, size) { sprite(g, a.enhet.id, a.damageLevel, a.rangeLevel, 4, 4, x, y, size); }
function portrait(el, a) {
  const g = el.getContext('2d'); g.clearRect(0, 0, el.width, el.height);
  towerArt(g, a, el.width / 2, el.height / 2, Math.min(el.width, el.height) * .97);
}
function makeBackground() {
  const b = document.createElement('canvas'); b.width = W; b.height = H;
  const g = b.getContext('2d'); g.drawImage(BILDER.environment, 0, 0, W, H);
  function path(color, width) {
    g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(BANPUNKTER[0].x, BANPUNKTER[0].y);
    for (const p of BANPUNKTER) g.lineTo(p.x, p.y); g.stroke();
  }
  path('#26382799', 55); path('#827b56', 48); path('#b6a77a', 41);
  // Stone tiles follow the actual path; decoration cannot shift the route.
  for (let i = 1; i < BANPUNKTER.length; i++) {
    const a = BANPUNKTER[i - 1], z = BANPUNKTER[i], d = Math.hypot(z.x - a.x, z.y - a.y);
    for (let v = 0; v < d; v += 18) {
      const x = a.x + (z.x - a.x) * v / d, y = a.y + (z.y - a.y) * v / d;
      g.save(); g.translate(x, y); g.rotate(Math.atan2(z.y - a.y, z.x - a.x));
      g.fillStyle = i % 3 ? '#c9b88a' : '#bdac80'; g.strokeStyle = '#786e4d88'; g.lineWidth = .8;
      g.beginPath(); g.roundRect(-7, -17, 15, 33, 3); g.fill(); g.stroke(); g.restore();
    }
  }
  // Quiet planting pads distinguish buildable ground from the road.
  g.lineWidth = .8;
  for (let r = 0; r < LTD.GRID_RAD; r++) for (let k = 0; k < LTD.GRID_KOL; k++) {
    if (LTD.arBana(k, r) || (r === 8 && k >= 9)) continue;
    const p = rutaMitt(k, r); g.fillStyle = '#22392322'; g.strokeStyle = '#c5ce9960';
    g.beginPath(); g.roundRect(p.x - 24, p.y - 24, 48, 48, 9); g.fill(); g.stroke();
  }
  g.fillStyle = '#182b21cc'; g.beginPath(); g.roundRect(16, 9, 200, 24, 8); g.fill();
  g.fillStyle = '#e2e7b8'; g.font = 'bold 10px Arial'; g.fillText('→ INGÅNG  ·  FÖRSVARA RAMENKÖKET', 24, 25);
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
  saldo = LTD.START_RAMEN; liv = LTD.START_LIV; vagNr = 1; rantebas = 0; spill = 0;
  arme = []; nastaId = 1; valdButik = null; valdArme = null; markor = { kol: 0, rad: 1 };
  torn = []; fiender = []; skott = []; spawnKvar = []; spawnTimer = 0; stridTid = 0; enemyId = 1;
  avraknad = true; texter = []; effects = []; vagResultat = null;
  statistik = { dodade: 0, ranta: 0, tjanat: 0, lackta: 0 };
  fart = 1; lage = 'bygg'; pausatLage = null; acc = 0; simClock = 0; rangePreview = false; lastUpgrade = -Infinity;
  say('Välj ett torn och en ledig ruta bredvid stigen. Markera sedan tornet för att förbättra skada och räckvidd.'); ritaUI();
}
function enhetPa(kol, rad) { return arme.find(a => a.kol === kol && a.rad === rad); }
function selected() { return arme.find(a => a.id === valdArme); }
function isPath(kol, rad) { return LTD.arBana(kol, rad) || (rad === 8 && kol >= 9); }
function valjButik(id) {
  if (!assetsReady || lage !== 'bygg') return;
  valdButik = valdButik === id ? null : id; valdArme = null; rangePreview = false;
  say(valdButik ? `${LTD.ENHET[id].namn}: ${LTD_GUIDE[id].summary} Välj en ledig ruta.` : 'Val avbrutet.'); ritaUI();
}
function placera(kol, rad) {
  if (!assetsReady || kol < 0 || rad < 0 || kol >= LTD.GRID_KOL || rad >= LTD.GRID_RAD) return;
  const existing = enhetPa(kol, rad);
  if (existing) { valdArme = existing.id; valdButik = null; rangePreview = false; ritaUI(); return; }
  if (lage !== 'bygg') return;
  if (!valdButik) { valdArme = null; return ritaUI(); }
  const enhet = LTD.ENHET[valdButik];
  if (isPath(kol, rad)) return say('Här går stigen. Välj en ledig markruta. Ingen Ramen har dragits.');
  if (saldo < enhet.pris) return say(`Saknar ${nr(enhet.pris - saldo)} Ramen för ${enhet.namn}.`);
  andraSaldo(-enhet.pris);
  const a = { id: nastaId++, enhet, kol, rad, damageLevel: 0, rangeLevel: 0, betalt: enhet.pris, target: 'first', pulse: .4 };
  arme.push(a); valdArme = a.id; valdButik = null;
  say(`${enhet.namn} placerad. Skada gör varje träff starkare. Räckvidd låter tornet skjuta längre.`); ritaUI();
}
function uppgradera(track, expected) {
  const a = selected(); if (!a || !assetsReady) return;
  const now = performance.now(); if (now - lastUpgrade < 450) return;
  const result = LTD_RULES.upgrade(a, track, saldo, lage, expected); if (!result) return;
  lastUpgrade = now; andraSaldo(-result.cost); a[track + 'Level'] = result.level; a.betalt += result.cost; a.pulse = .45;
  say(`${a.enhet.namn}: ${track === 'damage' ? 'Skada' : 'Räckvidd'} ${result.level}/3 för ${nr(result.cost)} Ramen.`); ritaUI();
}
function salj() {
  const a = selected(); if (!a || lage !== 'bygg') return;
  const amount = LTD_RULES.sale(a), paid = andraSaldo(amount); arme = arme.filter(t => t !== a); valdArme = null;
  say(`${a.enhet.namn} såld för ${nr(paid)} Ramen${paid < amount ? ' (begränsat av saldotaket)' : ''}.`); ritaUI();
}
function avbryt() { valdButik = null; valdArme = null; rangePreview = false; ritaUI(); }
function byggTorn() {
  torn = arme.map(a => ({ ...a, ...rutaMitt(a.kol, a.rad), ...LTD_RULES.stats(a, arme),
    armeId: a.id, kylTimer: 0, rekyl: 0, angle: 0 }));
}
function startaVag() {
  if (!assetsReady || lage !== 'bygg') return;
  if (!arme.length) return say('Placera minst ett torn innan vågen startar.');
  rantebas = saldo; spawnKvar = LTD.vag(vagNr).kon.map(f => ({ ...f })); fiender = []; skott = []; effects = []; byggTorn();
  spawnTimer = 0; stridTid = 0; avraknad = false; texter = []; lage = 'strid'; acc = 0; valdButik = null; rangePreview = false;
  say(`Våg ${vagNr}. Tornen skjuter automatiskt. Räntan är låst till ${nr(beraknadRanta(rantebas))} Ramen före saldotak.`); ritaUI();
}

// ---------- combat ----------
function spawnaNasta() {
  const f = spawnKvar.shift(); if (!f) return;
  fiender.push({ ...f, id: enemyId++, x: BANPUNKTER[0].x, y: BANPUNKTER[0].y, banSteg: 1, progress: 0,
    halsa: f.maxHalsa, kylaKvar: 0, kylaAndel: 0, avraknad: false, blink: 0, angle: 0,
    r: f.boss ? 24 : f.typ === 'svarm' ? 9 : 12 });
}
function addEffect(x, y, color, radius = 12) {
  if (reduced) return;
  effects.push({ x, y, color, radius, life: .25, max: .25 }); if (effects.length > 120) effects.shift();
}
function skadaFiende(f, damage) {
  if (f.avraknad || lage !== 'strid') return;
  f.halsa -= LTD_RULES.hit(damage, f.minskadSkada); f.blink = .08;
  if (f.halsa <= 0) {
    f.avraknad = true; const paid = andraSaldo(f.belaning); statistik.dodade++; statistik.tjanat += paid;
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
  let remaining = f.fart * CELL * (1 - f.kylaAndel) * dt;
  while (remaining > 0 && !f.avraknad && lage === 'strid') {
    if (f.banSteg >= BANPUNKTER.length) { lacka(f); return; }
    const p = BANPUNKTER[f.banSteg], dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
    const moved = Math.min(d, remaining); if (d) { f.angle = Math.atan2(dy, dx); f.x += dx / d * moved; f.y += dy / d * moved; }
    f.progress += moved; remaining -= moved; if (d <= moved) f.banSteg++;
  }
}
function valjMal(t) { return LTD_RULES.target(fiender, t, t.rangeEff * CELL, t.target); }
function skjut(t, mal) {
  t.angle = Math.atan2(mal.y - t.y, mal.x - t.x); t.rekyl = .12;
  skott.push({ x: t.x + Math.cos(t.angle) * 15, y: t.y - 7 + Math.sin(t.angle) * 15, mal, skada: t.damageEff,
    omrade: (t.enhet.omrade || 0) * CELL, kyla: t.enhet.kyla, type: LTD_GUIDE[t.enhet.id].projectile,
    color: LTD_GUIDE[t.enhet.id].color, angle: t.angle });
}
function traff(s) {
  if (!s.mal || s.mal.avraknad) return;
  const victims = s.omrade ? fiender.filter(f => !f.avraknad && Math.hypot(f.x - s.x, f.y - s.y) <= s.omrade) : [s.mal];
  for (const f of victims) {
    skadaFiende(f, s.skada);
    if (s.kyla && !f.avraknad) { f.kylaAndel = f.boss ? s.kyla.bossAndel : s.kyla.andel; f.kylaKvar = s.kyla.tid; }
  }
  addEffect(s.x, s.y, s.color, s.omrade || 14);
}
function steg(dt) {
  if (lage !== 'strid') return;
  stridTid += dt; simClock += dt;
  if (spawnKvar.length) { spawnTimer -= dt; if (spawnTimer <= 0) { spawnaNasta(); spawnTimer += .45; } }
  for (const f of fiender) {
    if (f.avraknad) continue;
    f.blink = Math.max(0, f.blink - dt); f.kylaKvar = Math.max(0, f.kylaKvar - dt); if (!f.kylaKvar) f.kylaAndel = 0;
    gaBana(f, dt); if (lage !== 'strid') return;
  }
  for (const t of torn) {
    t.rekyl = Math.max(0, t.rekyl - dt); t.kylTimer -= dt;
    if (t.kylTimer > 0) continue;
    const mal = valjMal(t); if (!mal) { t.kylTimer = 0; continue; }
    skjut(t, mal); t.kylTimer += t.enhet.intervall;
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
  if (vagNr === LTD.ANTAL_VAGOR) { lage = 'vinst'; say(`Seger! Alla 20 vågor avklarade med ${liv} kungaliv.`); }
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
  nyMatch();
}

// ---------- rendering ----------
function ring(x, y, radius, color, dash = false) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color + '12'; ctx.lineWidth = 1.5;
  if (dash) ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, W, H); if (!assetsReady) { ctx.fillStyle = '#31432e'; ctx.fillRect(0, 0, W, H); return; }
  ctx.drawImage(background, 0, 0);
  sprite(ctx, 'creatures', 1, 2, 4, 3, KUNG.x, KUNG.y - 4, 78);
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#f4e4b1'; ctx.textAlign = 'center'; ctx.fillText(`${liv} ♥`, KUNG.x, KUNG.y + 37);
  const chosen = selected();
  if (chosen || valdButik) {
    const a = chosen || { enhet: LTD.ENHET[valdButik], damageLevel: 0, rangeLevel: 0, ...markor };
    const p = rutaMitt(a.kol, a.rad), st = LTD_RULES.stats(a, arme);
    ring(p.x, p.y, st.rangeEff * CELL, a.enhet.stod ? '#d0a7ef' : '#e2e9a5');
    if (rangePreview && chosen && a.rangeLevel < 3 && lage === 'bygg') {
      const next = LTD_RULES.stats({ ...a, rangeLevel: a.rangeLevel + 1 }, arme);
      ring(p.x, p.y, next.rangeEff * CELL, '#80ded0', true);
    }
    if (a.enhet.stod) for (const t of arme) if (!t.enhet.stod && Math.hypot(t.kol - a.kol, t.rad - a.rad) <= st.aura) {
      const q = rutaMitt(t.kol, t.rad); ring(q.x, q.y, 24, '#d5b4ff');
    }
  }
  if (lage === 'bygg') {
    const p = rutaMitt(markor.kol, markor.rad);
    ctx.strokeStyle = isPath(markor.kol, markor.rad) ? '#ed8467' : '#e5df93'; ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 26, p.y - 26, 52, 52);
    if (valdButik && !isPath(markor.kol, markor.rad) && !enhetPa(markor.kol, markor.rad)) {
      ctx.globalAlpha = .55; towerArt(ctx, { enhet: LTD.ENHET[valdButik], damageLevel: 0, rangeLevel: 0 }, p.x, p.y - 5, 65); ctx.globalAlpha = 1;
    }
  }
  const fighting = lage === 'strid' || (lage === 'paus' && pausatLage === 'strid');
  const towers = fighting ? torn : arme.map(a => ({ ...a, ...rutaMitt(a.kol, a.rad), ...LTD_RULES.stats(a, arme) }));
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
      if (t.damageLevel || t.rangeLevel || t.id === valdArme) {
        ctx.fillStyle = '#112017dd'; ctx.beginPath(); ctx.roundRect(t.x - 22, t.y + 21, 44, 14, 4); ctx.fill();
        ctx.font = 'bold 9px Arial'; ctx.fillStyle = '#f2ce94'; ctx.fillText(`⚔${t.damageLevel}`, t.x - 10, t.y + 31);
        ctx.fillStyle = '#a4e0d4'; ctx.fillText(`◎${t.rangeLevel}`, t.x + 11, t.y + 31);
      }
      if (t.supported) { ctx.fillStyle = '#ead0ff'; ctx.font = 'bold 13px Arial'; ctx.fillText('✦', t.x + 22, t.y - 22); }
    } else {
      const f = obj.enemy, indexes = { standard: 0, snabb: 1, svarm: 2, pansrad: 3, elit: 4 };
      const tile = f.boss ? 4 + Math.floor(vagNr / 5) : indexes[f.typ];
      const size = f.boss ? 70 : f.typ === 'svarm' ? 30 : f.typ === 'elit' ? 47 : 41;
      const bob = reduced || !fighting ? 0 : Math.sin(simClock * 10 + f.id) * 1.8;
      ctx.fillStyle = '#19211255'; ctx.beginPath(); ctx.ellipse(f.x, f.y + 11, size * .3, size * .11, 0, 0, Math.PI * 2); ctx.fill();
      if (f.blink > 0 && !reduced) ctx.globalAlpha = .65;
      sprite(ctx, 'creatures', tile % 4, Math.floor(tile / 4), 4, 3, f.x, f.y - 6 + bob, size, size, Math.cos(f.angle) < 0); ctx.globalAlpha = 1;
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
  for (const e of effects) { ctx.globalAlpha = Math.max(0, e.life / e.max); ring(e.x, e.y, e.radius * (1 - e.life / e.max * .7), e.color); }
  ctx.globalAlpha = 1;
  for (const t of texter) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#fbebaa'; ctx.strokeStyle = '#243520'; ctx.lineWidth = 3; ctx.strokeText(t.text, t.x, t.y); ctx.fillText(t.text, t.x, t.y); } ctx.globalAlpha = 1;
  const boss = fiender.find(f => f.boss);
  if (boss) { ctx.fillStyle = '#171d16df'; ctx.fillRect(250, 10, 460, 26); ctx.fillStyle = '#b95f58'; ctx.fillRect(256, 28, 448 * Math.max(0, boss.halsa / boss.maxHalsa), 4); ctx.fillStyle = '#ffecd0'; ctx.font = 'bold 11px Arial'; ctx.fillText(LTD.BOSSNAMN[vagNr], 480, 23); }
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
function updatePanel() {
  const a = selected(); $('vald-panel').hidden = !a; $('empty-selection').hidden = !!a; if (!a) return;
  const e = a.enhet, info = LTD_GUIDE[e.id], st = LTD_RULES.stats(a, arme);
  $('vald-namn').textContent = e.namn; $('vald-roll').textContent = info.role; $('vald-info').textContent = info.summary;
  $('levels').textContent = `Skada ${a.damageLevel}/3 · Räckvidd ${a.rangeLevel}/3`;
  portrait($('selected-art'), a); $('tower-stats').replaceChildren();
  statPair('Skada per träff', nr(st.damageEff)); statPair('Skottintervall', `${dec(e.intervall)} s`);
  statPair('Räckvidd', `${dec(st.rangeEff)} rutor`); statPair('Teoretisk DPS', dec(st.damageEff / e.intervall));
  if (e.omrade) statPair('Sprängradie', `${dec(e.omrade)} rutor`);
  if (e.kyla) statPair('Kyla / boss', '35 % / 12 % · 2 s');
  if (e.stod) {
    statPair('Auraradie', `${dec(st.aura)} rutor`);
    statPair('Torn inom auran', arme.filter(t => !t.enhet.stod && Math.hypot(t.kol - a.kol, t.rad - a.rad) <= st.aura).length);
  }
  $('aura-info').hidden = !st.supported && !e.stod;
  $('aura-info').textContent = e.stod ? 'Stöd: +25 % skada och +15 % räckvidd. Skadeuppgraderingen gäller dina egna skott. Räckvidd förbättrar också auran.' : `Munkstöd aktivt: +25 % skada, +15 % räckvidd. Utan stöd: ${nr(st.damage)} skada / ${dec(st.range)} rutor.`;
  $('target-mode').value = a.target; $('target-mode').disabled = ['vinst', 'forlust'].includes(lage);
  for (const track of ['damage', 'range']) {
    const level = a[track + 'Level'], price = LTD_RULES.price(a, track), max = price === null;
    const next = LTD_RULES.stats({ ...a, [track + 'Level']: Math.min(3, level + 1) }, arme);
    $(track + '-level').textContent = `${track === 'damage' ? 'SKADA' : 'RÄCKVIDD'} ${level}/3`;
    $(track + '-preview').textContent = track === 'damage' ? `${nr(st.damageEff)}${max ? '' : ` → ${nr(next.damageEff)}`}` : `${dec(st.rangeEff)}${max ? '' : ` → ${dec(next.rangeEff)}`}`;
    $(track + '-name').textContent = info[track + 'Names'][max ? level : level + 1];
    const button = $('upgrade-' + track); button.dataset.level = level;
    button.disabled = !assetsReady || max || lage !== 'bygg' || saldo < price;
    button.textContent = max ? 'MAX NIVÅ' : lage !== 'bygg' ? 'Mellan vågor' : saldo < price ? `Saknar ${nr(price - saldo)} Ramen` : `Uppgradera · ${nr(price)} Ramen`;
    $(track + '-interest').textContent = !max && lage === 'bygg' ? saldo >= price ? `Ränta: −${nr(beraknadRanta(saldo) - beraknadRanta(saldo - price))} före tak` : `Pris: ${nr(price)} Ramen` : '';
  }
  const sale = LTD_RULES.sale(a); $('salj').textContent = `Sälj · +${nr(Math.min(sale, LTD.TAK - saldo))}${saldo + sale > LTD.TAK ? ' (tak)' : ''}`;
  $('salj').disabled = lage !== 'bygg';
}
function updateHUD() {
  $('ramen').textContent = `${nr(saldo)} / ${nr(LTD.TAK)}`; $('liv').textContent = liv; $('vag').textContent = `${vagNr} / 20`;
  const locked = lage === 'strid' || (lage === 'paus' && pausatLage === 'strid');
  $('ranta').textContent = `${nr(beraknadRanta(locked ? rantebas : saldo))} ${locked ? '(låst)' : 'före tak'}`;
}
function ritaUI() {
  updateHUD(); $('fas').textContent = { bygg: 'Byggfas', strid: 'Strid', paus: 'Pausad', vinst: 'Seger', forlust: 'Förlust' }[lage];
  const v = LTD.vag(vagNr); $('nasta-vag').textContent = `Våg ${vagNr}: ${LTD.vagText(vagNr)}`;
  $('nasta-egenskap').textContent = v.harBoss ? `${v.bossnamn} · Bossen kostar 5 kungaliv vid läcka och bromsas 12 %.` : `Bashälsa ${nr(v.bas.halsa)} · Grundbelöning ${v.bas.belaning} Ramen. Varje vanlig läcka kostar 1 liv.`;
  for (const e of LTD.ENHETER) {
    const button = document.querySelector(`[data-enhet="${e.id}"]`);
    button.disabled = !assetsReady || lage !== 'bygg'; button.classList.toggle('vald', valdButik === e.id); button.classList.toggle('orad', saldo < e.pris);
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
  for (const [title, text] of [['Attack & specialeffekt', info.attack], ['Styrka', info.strength], ['Svaghet', info.weakness], ['Placering & mål', info.placement], ['Vad uppgraderingarna gör', info.upgrades], ['Kostnad & ekonomi', `Byggpris ${e.pris} Ramen. Försäljning ger 70 % av faktiskt betalt, inklusive båda uppgraderingsspåren. Köp sker mellan vågor.`]]) {
    const cell = document.createElement('section'), h = document.createElement('h4'), p = document.createElement('p'); h.textContent = title; p.textContent = text; cell.append(h, p); details.append(cell);
  }
  body.append(details);
  for (const track of ['damage', 'range']) {
    const h = document.createElement('h4'); h.textContent = track === 'damage' ? 'Skadespåret · starkare träffar' : 'Räckviddsspåret · större täckning'; body.append(h);
    const levels = document.createElement('div'); levels.className = 'guide-levels';
    for (let level = 0; level <= 3; level++) {
      const a = { enhet: e, damageLevel: track === 'damage' ? level : 0, rangeLevel: track === 'range' ? level : 0, kol: 0, rad: 0 };
      const figure = document.createElement('figure'), image = document.createElement('canvas'), caption = document.createElement('figcaption'); image.width = image.height = 192;
      const st = LTD_RULES.stats(a, []), previous = { ...a, [track + 'Level']: level - 1 };
      caption.textContent = `Nivå ${level}: ${track === 'damage' ? nr(st.damage) + ' skada' : dec(st.range) + ' rutor'} · ${level ? LTD_RULES.price(previous, track) + ' Ramen' : 'grundvärde'}`;
      figure.append(image, caption); levels.append(figure); portrait(image, a);
    }
    body.append(levels);
  }
}

// ---------- input and loop ----------
for (const [index, e] of LTD.ENHETER.entries()) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'ltd-kort'; button.dataset.enhet = e.id;
  const key = document.createElement('span'); key.className = 'key'; key.textContent = index + 1;
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
canvas.addEventListener('pointermove', event => { if (lage !== 'bygg') return; const p = rutaFranPekare(event); if (p) markor = p; });
$('starta-vag').addEventListener('click', startaVag); $('pausa').addEventListener('click', pausa);
$('fart').addEventListener('click', () => { fart = fart === 1 ? 2 : 1; ritaUI(); }); $('avbryt').addEventListener('click', avbryt);
for (const track of ['damage', 'range']) $('upgrade-' + track).addEventListener('click', event => { if (event.detail > 1) return; uppgradera(track, Number(event.currentTarget.dataset.level)); });
for (const event of ['pointerenter', 'focus']) $('upgrade-range').addEventListener(event, () => { rangePreview = true; });
for (const event of ['pointerleave', 'blur']) $('upgrade-range').addEventListener(event, () => { rangePreview = false; });
$('target-mode').addEventListener('change', event => { const a = selected(); if (a) { a.target = event.target.value; const t = torn.find(t => t.id === a.id); if (t) t.target = a.target; } });
$('salj').addEventListener('click', salj); $('start').addEventListener('click', startaOm);
$('guide-open').addEventListener('click', () => showGuide()); $('tower-help').addEventListener('click', () => showGuide());
$('guide-close').addEventListener('click', () => $('guide-dialog').close()); $('guide-dialog').addEventListener('cancel', event => { event.preventDefault(); $('guide-dialog').close(); });
$('reduced-effects').checked = reduced; $('reduced-effects').addEventListener('change', event => { reduced = event.target.checked; if (reduced) { effects = []; texter = []; } });
$('retry-assets').addEventListener('click', loadAssets);
document.addEventListener('keydown', event => {
  if ($('guide-dialog').open) { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); $('guide-dialog').close(); } return; }
  const tag = event.target?.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tag) || event.target?.isContentEditable || event.ctrlKey || event.metaKey || event.altKey) return;
  const k = event.key; if (event.repeat && ['Enter', ' ', 'p', 'P'].includes(k)) return;
  if (/^[1-6]$/.test(k)) { event.preventDefault(); valjButik(LTD.ENHETER[Number(k) - 1].id); }
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
    uiClock += dt; if (uiClock >= .15) { updateHUD(); uiClock = 0; }
  } else if (lage === 'bygg') {
    simClock += dt; for (const a of arme) a.pulse = Math.max(0, (a.pulse || 0) - dt);
  }
  draw(); requestAnimationFrame(frame);
}
nyMatch(); loadAssets(); requestAnimationFrame(frame);
