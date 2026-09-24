const canvas = document.querySelector('#board'), ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const W = 748, H = 652, CELL = 60, GRID_X0 = 14, GRID_Y0 = 46;
const GRID_X1 = GRID_X0 + LTD.GRID_KOL * CELL, GRID_Y1 = GRID_Y0 + LTD.GRID_RAD * CELL;
const STEG = 1 / 60;
const SKOTT_FART = 11 * CELL;   // skottens fart i pixlar per sekund

function rutaMitt(kol, rad) { return { x: GRID_X0 + (kol + 0.5) * CELL, y: GRID_Y0 + (rad + 0.5) * CELL }; }
const BANPUNKTER = LTD.BANA.map(r => rutaMitt(r.kol, r.rad));
const KUNG = { ...rutaMitt(LTD.KUNG_RUTA.kol, LTD.KUNG_RUTA.rad), r: 30 };
BANPUNKTER.push({ x: KUNG.x, y: KUNG.y });

// ---------- bilder ----------
// Egna SVG-filer i bilder/. Ritas med drawImage nar de laddat, och tills dess
// syns en enkel platshallare sa spelet aldrig star tomt.
const BILDER = {};
function laddaBild(namn) {
  if (BILDER[namn]) return BILDER[namn];
  const b = new Image();
  b.src = LTD.BILDMAPP + namn;
  BILDER[namn] = b;
  return b;
}
for (const e of LTD.ENHETER) laddaBild(e.bild);
for (const t of ['standard', 'snabb', 'svarm', 'pansrad', 'elit', 'boss']) laddaBild(`fiende-${t}.svg`);
laddaBild('kung.svg');
function ritaBild(namn, x, y, storlek, vand) {
  const b = BILDER[namn];
  if (!b || !b.complete || !b.naturalWidth) return false;
  ctx.save(); ctx.translate(x, y);
  if (vand) ctx.scale(-1, 1);
  ctx.drawImage(b, -storlek / 2, -storlek / 2, storlek, storlek);
  ctx.restore();
  return true;
}

// ---------- tillstånd ----------
let saldo, liv, vagNr, rantebas, spill;
let lage, pausatLage, fart;
let arme, nastaId, valdButik, valdArme, flyttlage, markor;
let torn, fiender, skott, spawnKvar, spawnTimer, stridTid, avraknad, texter;
let statistik, vagResultat, acc = 0, last = 0;

function nr(v) { return Math.round(v).toLocaleString('sv-SE'); }
function say(text) { status.textContent = text; }

// ---------- ekonomi: enda vägen in och ut ur saldot ----------
function andraSaldo(delta) {
  if (delta >= 0) {
    const plats = LTD.TAK - saldo;
    const in_ = Math.min(delta, plats);
    saldo += in_; spill += delta - in_;
    return in_;
  }
  const ut = Math.min(-delta, saldo);
  saldo -= ut;
  return -ut;
}
function harRad(kostnad) { return saldo >= kostnad; }
function beraknadRanta(bas) { return Math.floor(bas * LTD.RANTA_PROCENT / 100); }

// ---------- match ----------
function forstaByggruta() {
  for (let r = 0; r < LTD.GRID_RAD; r++) for (let k = 0; k < LTD.GRID_KOL; k++) if (!LTD.arBana(k, r)) return { kol: k, rad: r };
  return { kol: 0, rad: 0 };
}
function nyMatch() {
  saldo = LTD.START_RAMEN; liv = LTD.START_LIV; vagNr = 1; rantebas = 0; spill = 0;
  arme = []; nastaId = 1; valdButik = null; valdArme = null; flyttlage = false;
  markor = forstaByggruta();
  torn = []; fiender = []; skott = []; spawnKvar = []; spawnTimer = 0; stridTid = 0;
  avraknad = true; texter = []; vagResultat = null;
  statistik = { dodade: 0, ranta: 0, tjanat: 0, lackta: 0 };
  fart = 1; lage = 'bygg'; pausatLage = null; acc = 0;
  say('Byggfas inför våg 1. Fienderna följer banan — bygg torn bredvid den.');
  ritaUI();
}

// ---------- byggfas ----------
function enhetPa(kol, rad) { return arme.find(a => a.kol === kol && a.rad === rad) || null; }
function uppgraderingsPris(enhet) { return Math.floor(enhet.pris * LTD.UPPGRADERING_FAKTOR); }
function saljVarde(a) { return Math.floor(LTD.FORSALJNING_ANDEL * a.betalt); }

function valjButik(id) {
  if (lage !== 'bygg') return say('Butiken är låst under strid.');
  valdButik = valdButik === id ? null : id;
  valdArme = null; flyttlage = false;
  if (valdButik) say(`${LTD.ENHET[id].namn} vald. Klicka på en ledig ruta bredvid banan.`);
  ritaUI();
}
function placera(kol, rad) {
  if (lage !== 'bygg') return;
  if (kol < 0 || rad < 0 || kol >= LTD.GRID_KOL || rad >= LTD.GRID_RAD) return;
  if (flyttlage && valdArme) {
    const a = arme.find(x => x.id === valdArme);
    if (LTD.arBana(kol, rad)) return say('Där går banan. Välj en ruta bredvid.');
    if (enhetPa(kol, rad)) return say('Rutan är upptagen.');
    a.kol = kol; a.rad = rad; flyttlage = false;
    say(`${a.enhet.namn} flyttad. Flytt är gratis i byggfas.`);
    return ritaUI();
  }
  if (!valdButik) {
    const traff = enhetPa(kol, rad);
    valdArme = traff ? traff.id : null;
    if (traff) say(`${traff.enhet.namn} vald. Du kan flytta, uppgradera eller sälja.`);
    return ritaUI();
  }
  const enhet = LTD.ENHET[valdButik];
  if (LTD.arBana(kol, rad)) return say('Där går banan. Bygg bredvid den. Ingen Ramen har dragits.');
  if (enhetPa(kol, rad)) return say('Rutan är upptagen. Ingen Ramen har dragits.');
  if (!harRad(enhet.pris)) return say(`Du har inte råd med ${enhet.namn} (${nr(enhet.pris)} Ramen). Inget har dragits.`);
  andraSaldo(-enhet.pris);
  arme.push({ id: nastaId++, enhet, kol, rad, uppgraderad: false, betalt: enhet.pris });
  say(`${enhet.namn} placerad för ${nr(enhet.pris)} Ramen.`);
  ritaUI();
}
function startaFlytt() { if (lage === 'bygg' && valdArme) { flyttlage = true; say('Välj en ledig ruta bredvid banan.'); ritaUI(); } }
function uppgradera() {
  if (lage !== 'bygg' || !valdArme) return;
  const a = arme.find(x => x.id === valdArme);
  if (a.uppgraderad) return say('Tornet är redan uppgraderat.');
  const pris = uppgraderingsPris(a.enhet);
  if (!harRad(pris)) return say(`Uppgraderingen kostar ${nr(pris)} Ramen. Du har inte råd. Inget har dragits.`);
  andraSaldo(-pris);
  a.uppgraderad = true; a.betalt += pris;
  say(`${a.enhet.namn} uppgraderad för ${nr(pris)} Ramen: dubbel verkan.`);
  ritaUI();
}
function salj() {
  if (lage !== 'bygg' || !valdArme) return;
  const a = arme.find(x => x.id === valdArme);
  const varde = saljVarde(a), fick = andraSaldo(varde);
  arme = arme.filter(x => x.id !== a.id);
  valdArme = null; flyttlage = false;
  say(`${a.enhet.namn} såld för ${nr(fick)} Ramen${fick < varde ? ' (saldotaket nått)' : ''}.`);
  ritaUI();
}
function avbryt() { valdButik = null; valdArme = null; flyttlage = false; say('Val avbrutet.'); ritaUI(); }

// ---------- stridsuppsättning ----------
function byggTorn() {
  torn = arme.map(a => {
    const e = a.enhet, m = a.uppgraderad ? 2 : 1, p = rutaMitt(a.kol, a.rad);
    return {
      armeId: a.id, enhet: e, x: p.x, y: p.y, uppgraderad: a.uppgraderad,
      skada: e.skada * m, rack: e.rackvidd * CELL,
      skadaEff: e.skada * m, rackEff: e.rackvidd * CELL,
      stodM: e.stod ? m : 0, kylTimer: (a.id % 7) / 7 * (e.intervall || 1),
      vand: false, rekyl: 0
    };
  });
  tillampaStod();
}
// Ramenmunkens aura. Flera munkar staplar multiplikativt, vilket belonar
// kompakt placering precis som designdokumentet vill.
function tillampaStod() {
  for (const t of torn) { t.skadaEff = t.skada; t.rackEff = t.rack; }
  for (const s of torn) {
    if (!s.enhet.stod) continue;
    for (const t of torn) {
      if (t === s || t.enhet.stod) continue;
      if (Math.hypot(t.x - s.x, t.y - s.y) <= s.rack) {
        t.skadaEff *= 1 + s.enhet.stod.skada * s.stodM;
        t.rackEff *= 1 + s.enhet.stod.rackvidd * s.stodM;
      }
    }
  }
}
function startaVag() {
  if (lage !== 'bygg') return;
  if (!arme.length) return say('Placera minst ett torn innan du startar vågen.');
  rantebas = saldo;
  spawnKvar = LTD.vag(vagNr).kon.map(f => ({ ...f }));
  fiender = []; skott = []; byggTorn();
  spawnTimer = 0; stridTid = 0; avraknad = false; texter = [];
  lage = 'strid'; acc = 0;
  say(`Våg ${vagNr} startar. Ränta ${nr(beraknadRanta(rantebas))} Ramen är låst på underlaget ${nr(rantebas)}.`);
  ritaUI();
}

// ---------- strid ----------
function spawnaNasta() {
  const f = spawnKvar.shift();
  if (!f) return;
  fiender.push({
    ...f, x: BANPUNKTER[0].x, y: BANPUNKTER[0].y, banSteg: 1,
    halsa: f.maxHalsa, kylaKvar: 0, kylaAndel: 0, avraknad: false, blink: 0,
    r: f.boss ? 24 : f.typ === 'svarm' ? 10 : 14
  });
}
function avstand(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function skadaFiende(f, mangd) {
  if (f.avraknad) return;
  f.halsa -= mangd * (1 - f.minskadSkada);
  f.blink = .08;
  if (f.halsa <= 0) {
    f.avraknad = true;
    const fick = andraSaldo(f.belaning);
    statistik.dodade++; statistik.tjanat += fick;
    texter.push({ x: f.x, y: f.y, text: `+${nr(fick)}`, liv: .9, farg: '#d5fb78' });
  }
}
function lacka(f) {
  if (f.avraknad) return;
  f.avraknad = true;
  liv -= f.liv; statistik.lackta++;
  texter.push({ x: KUNG.x, y: KUNG.y - 38, text: `−${f.liv} liv`, liv: 1.1, farg: '#ff6b5e' });
  if (liv <= 0) { liv = 0; forlora(); }
}
// Fienden foljer banan hela vagen. Torn kan inte angripas.
function gaBana(f, dt) {
  let kvar = f.fart * CELL * (1 - f.kylaAndel) * dt;
  while (kvar > 0) {
    if (f.banSteg >= BANPUNKTER.length) return lacka(f);
    const p = BANPUNKTER[f.banSteg];
    const dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
    if (d <= kvar) { f.x = p.x; f.y = p.y; kvar -= d; f.banSteg++; }
    else { f.x += dx / d * kvar; f.y += dy / d * kvar; kvar = 0; }
  }
}
// Sikta pa den fiende som hunnit langst, alltsa den narmast kungen. Det ar
// standard i tower defense och gor att last skott inte slosas pa nyss inkomna.
function valjMal(t) {
  let bast = null, bastSteg = -1;
  for (const f of fiender) {
    if (f.avraknad) continue;
    if (avstand(t, f) > t.rackEff) continue;
    if (f.banSteg > bastSteg) { bastSteg = f.banSteg; bast = f; }
  }
  return bast;
}
function skjut(t, mal) {
  t.vand = mal.x < t.x;
  t.rekyl = .12;
  skott.push({
    x: t.x, y: t.y, mal, skada: t.skadaEff,
    omrade: t.enhet.omrade ? t.enhet.omrade * CELL : 0,
    kyla: t.enhet.kyla || null, farg: t.enhet.kyla ? '#8fd8f2' : t.enhet.omrade ? '#ff9a4d' : '#ffe08a'
  });
}
function traff(s) {
  const mal = s.mal;
  if (mal && !mal.avraknad) {
    skadaFiende(mal, s.skada);
    if (s.kyla) {
      mal.kylaAndel = Math.max(mal.kylaAndel, mal.boss ? s.kyla.bossAndel : s.kyla.andel);
      mal.kylaKvar = s.kyla.tid;
    }
  }
  if (s.omrade) {
    for (const o of fiender) {
      if (o === mal || o.avraknad) continue;
      if (Math.hypot(o.x - s.x, o.y - s.y) <= s.omrade) {
        skadaFiende(o, s.skada);
        if (s.kyla) { o.kylaAndel = Math.max(o.kylaAndel, o.boss ? s.kyla.bossAndel : s.kyla.andel); o.kylaKvar = s.kyla.tid; }
      }
    }
    texter.push({ x: s.x, y: s.y, text: '', liv: 0, farg: '', krasch: s.omrade });
  }
}

function steg(dt) {
  stridTid += dt;
  if (spawnKvar.length) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnaNasta(); spawnTimer = 0.45; }
  }
  for (const f of fiender) {
    if (f.avraknad) continue;
    if (f.blink > 0) f.blink -= dt;
    if (f.kylaKvar > 0) { f.kylaKvar -= dt; if (f.kylaKvar <= 0) f.kylaAndel = 0; }
    gaBana(f, dt);
  }
  for (const t of torn) {
    if (t.rekyl > 0) t.rekyl -= dt;
    if (!t.enhet.intervall) continue;          // stodtorn skjuter inte
    t.kylTimer -= dt;
    if (t.kylTimer > 0) continue;
    const mal = valjMal(t);
    if (!mal) { t.kylTimer = 0; continue; }
    skjut(t, mal);
    t.kylTimer = t.enhet.intervall;
  }
  skott = skott.filter(s => {
    if (!s.mal || s.mal.avraknad) return false;
    const dx = s.mal.x - s.x, dy = s.mal.y - s.y, d = Math.hypot(dx, dy);
    const steglangd = SKOTT_FART * dt;
    if (d <= steglangd + s.mal.r) { s.x = s.mal.x; s.y = s.mal.y; traff(s); return false; }
    s.x += dx / d * steglangd; s.y += dy / d * steglangd;
    return true;
  });
  fiender = fiender.filter(f => !f.avraknad);
  texter = texter.filter(t => { t.liv -= dt; t.y -= 24 * dt; return t.liv > 0; });
  if (stridTid >= LTD.STRID_MAX) return timeoutAvrakning();
  if (!spawnKvar.length && !fiender.length) avslutaVag();
}
function timeoutAvrakning() {
  for (const f of fiender) if (!f.avraknad) lacka(f);
  for (const f of spawnKvar) lacka({ ...f, avraknad: false });
  spawnKvar = []; fiender = []; skott = [];
  if (lage !== 'forlust') avslutaVag();
}

// ---------- avräkning ----------
function avslutaVag() {
  if (avraknad) return;
  avraknad = true;
  if (liv <= 0) return forlora();
  const beraknad = beraknadRanta(rantebas);
  const utbetald = Math.min(beraknad, LTD.TAK - saldo);
  saldo += utbetald; statistik.ranta += utbetald;
  vagResultat = { vag: vagNr, underlag: rantebas, beraknad, utbetald, tappad: beraknad - utbetald, saldo, liv };
  const extra = utbetald < beraknad ? ` ${nr(beraknad - utbetald)} Ramen fick inte plats under taket.` : '';
  if (vagNr >= LTD.ANTAL_VAGOR) {
    lage = 'vinst';
    say(`Seger! Du klarade alla ${LTD.ANTAL_VAGOR} vågor med ${liv} kungaliv kvar.${extra}`);
  } else {
    vagNr++; lage = 'bygg';
    say(`Våg ${vagResultat.vag} klarad. Ränta ${nr(utbetald)} Ramen på underlaget ${nr(rantebas)}.${extra} Byggfas inför våg ${vagNr}.`);
  }
  torn = []; skott = [];
  ritaUI();
}
function forlora() {
  avraknad = true; lage = 'forlust';
  torn = []; fiender = []; skott = []; spawnKvar = [];
  say(`Kungen föll på våg ${vagNr}. Ingen ränta betalas ut. Tryck på Starta om för en ny match.`);
  ritaUI();
}

// ---------- faser ----------
function pausa() {
  if (lage === 'paus') { lage = pausatLage; pausatLage = null; acc = 0; say('Fortsätter.'); }
  else if (lage === 'strid' || lage === 'bygg') { pausatLage = lage; lage = 'paus'; say('Pausat. Tryck på Fortsätt.'); }
  ritaUI();
}
function vaxlaFart() { fart = fart === 1 ? 2 : 1; ritaUI(); }
function startaOm() {
  const igang = lage !== 'forlust' && lage !== 'vinst' && (vagNr > 1 || arme.length);
  if (igang && !window.confirm('Starta om? Den pågående matchen raderas.')) return;
  nyMatch();
}

// ---------- rendering ----------
function ritaBana() {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b3446'; ctx.lineWidth = CELL - 8;
  ctx.beginPath(); ctx.moveTo(BANPUNKTER[0].x, BANPUNKTER[0].y);
  for (const p of BANPUNKTER) ctx.lineTo(p.x, p.y);
  ctx.stroke();
  ctx.strokeStyle = '#3d4962'; ctx.lineWidth = 2; ctx.setLineDash([7, 10]);
  ctx.beginPath(); ctx.moveTo(BANPUNKTER[0].x, BANPUNKTER[0].y);
  for (const p of BANPUNKTER) ctx.lineTo(p.x, p.y);
  ctx.stroke(); ctx.setLineDash([]);
  const s = BANPUNKTER[0];
  ctx.fillStyle = '#8de06a';
  ctx.beginPath(); ctx.moveTo(s.x - 20, s.y - 11); ctx.lineTo(s.x - 4, s.y); ctx.lineTo(s.x - 20, s.y + 11); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6f7486'; ctx.font = 'bold 9px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('FIENDER IN', s.x - 20, s.y - 18);
}
function halsostapel(x, y, bredd, andel, farg) {
  ctx.fillStyle = '#00000099'; ctx.fillRect(x - bredd / 2, y, bredd, 4);
  ctx.fillStyle = farg; ctx.fillRect(x - bredd / 2, y, bredd * Math.max(0, andel), 4);
}
function fiendeStorlek(f) {
  return f.boss ? 62 : f.typ === 'svarm' ? 26 : f.typ === 'elit' ? 42 : f.typ === 'pansrad' ? 40 : 34;
}
function draw() {
  ctx.fillStyle = '#151a25'; ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < LTD.GRID_RAD; r++) for (let k = 0; k < LTD.GRID_KOL; k++) {
    if (LTD.arBana(k, r)) continue;
    const m = rutaMitt(k, r);
    ctx.fillStyle = '#1e2636';
    ctx.beginPath(); ctx.roundRect(m.x - CELL / 2 + 2, m.y - CELL / 2 + 2, CELL - 4, CELL - 4, 6); ctx.fill();
    ctx.strokeStyle = lage === 'bygg' ? '#39445a' : '#2a3344'; ctx.lineWidth = 1; ctx.stroke();
  }
  ritaBana();
  if (!ritaBild('kung.svg', KUNG.x, KUNG.y, 78, false)) {
    ctx.fillStyle = '#f76fae'; ctx.beginPath(); ctx.arc(KUNG.x, KUNG.y, 26, 0, Math.PI * 2); ctx.fill();
  }
  if (lage === 'bygg') {
    const m = rutaMitt(markor.kol, markor.rad);
    const gilt = !LTD.arBana(markor.kol, markor.rad);
    ctx.strokeStyle = !gilt ? '#ff6b5e' : (valdButik || flyttlage) ? '#d5fb78' : '#5b6a82';
    ctx.lineWidth = 2;
    ctx.strokeRect(m.x - CELL / 2 + 3, m.y - CELL / 2 + 3, CELL - 6, CELL - 6);
    const vald = valdArme ? arme.find(a => a.id === valdArme) : null;
    const visa = valdButik ? LTD.ENHET[valdButik] : vald ? vald.enhet : null;
    if (visa) {
      const p = valdButik ? m : rutaMitt(vald.kol, vald.rad);
      ctx.strokeStyle = visa.stod ? '#d5fb7877' : '#2fc4dc66'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, visa.rackvidd * CELL, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const strid = lage === 'strid' || (lage === 'paus' && pausatLage === 'strid');
  const lista = strid ? torn : arme.map(a => ({ enhet: a.enhet, ...rutaMitt(a.kol, a.rad), uppgraderad: a.uppgraderad, armeId: a.id, vand: false, rekyl: 0 }));
  for (const t of lista) {
    const dy = t.rekyl > 0 ? 2 : 0;
    if (!ritaBild(t.enhet.bild, t.x, t.y + dy, 46, t.vand)) {
      ctx.fillStyle = '#5b6a82'; ctx.beginPath(); ctx.arc(t.x, t.y, 16, 0, Math.PI * 2); ctx.fill();
    }
    if (t.uppgraderad) {
      ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('★', t.x, t.y - 22);
    }
    if (!strid && valdArme === t.armeId) {
      ctx.strokeStyle = '#d5fb78'; ctx.lineWidth = 2;
      ctx.strokeRect(t.x - CELL / 2 + 3, t.y - CELL / 2 + 3, CELL - 6, CELL - 6);
    }
  }
  for (const f of fiender) {
    const st = fiendeStorlek(f);
    if (f.blink > 0) { ctx.save(); ctx.globalAlpha = .6; }
    if (!ritaBild(`fiende-${f.typ}.svg`, f.x, f.y, st, true)) {
      ctx.fillStyle = f.farg; ctx.beginPath(); ctx.arc(f.x, f.y, st / 2.6, 0, Math.PI * 2); ctx.fill();
    }
    if (f.blink > 0) ctx.restore();
    if (f.kylaAndel > 0) {
      ctx.strokeStyle = '#8fd8f2'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, st / 2 + 2, 0, Math.PI * 2); ctx.stroke();
    }
    if (f.halsa < f.maxHalsa) halsostapel(f.x, f.y - st / 2 - 7, Math.max(24, st * .8), f.halsa / f.maxHalsa, '#ff6b5e');
  }
  for (const s of skott) {
    ctx.fillStyle = s.farg;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.omrade ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  for (const t of texter) {
    if (t.krasch) {
      ctx.strokeStyle = '#ff9a4d'; ctx.globalAlpha = Math.max(0, t.liv * 3); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.krasch, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    ctx.globalAlpha = Math.min(1, t.liv * 1.6); ctx.fillStyle = t.farg; ctx.font = 'bold 12px Arial';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  const boss = fiender.find(f => f.boss);
  if (boss) {
    ctx.fillStyle = '#a6aabb'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
    ctx.fillText((LTD.BOSSNAMN[vagNr] || 'BOSS').toUpperCase(), W / 2, 15);
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(W / 2 - 190, 21, 380, 11);
    ctx.fillStyle = '#ff4f8b'; ctx.fillRect(W / 2 - 190, 21, 380 * Math.max(0, boss.halsa / boss.maxHalsa), 11);
  }
  if (lage === 'strid') {
    const kvar = LTD.STRID_MAX - stridTid;
    if (kvar <= LTD.NEDRAKNING) {
      ctx.fillStyle = '#ff6b5e'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(kvar).toString(), W / 2, 34);
    }
  }
  if (lage === 'paus' || lage === 'vinst' || lage === 'forlust') {
    ctx.fillStyle = '#0b0d14cc'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f3f3f7'; ctx.font = 'bold 34px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(lage === 'paus' ? 'PAUS' : lage === 'vinst' ? 'SEGER' : 'FÖRLUST', W / 2, H / 2 - 16);
    ctx.fillStyle = '#a6aabb'; ctx.font = 'bold 13px Arial';
    ctx.fillText(lage === 'paus' ? 'Tryck P eller Fortsätt'
      : `${nr(saldo)} Ramen · ${statistik.dodade} dödade · ${nr(statistik.ranta)} Ramen i ränta`, W / 2, H / 2 + 20);
  }
}

// ---------- HTML-gränssnitt ----------
function ritaUI() {
  document.querySelector('#ramen').textContent = `${nr(saldo)} / ${nr(LTD.TAK)}`;
  document.querySelector('#liv').textContent = liv;
  document.querySelector('#vag').textContent = `${Math.min(vagNr, LTD.ANTAL_VAGOR)} / ${LTD.ANTAL_VAGOR}`;
  document.querySelector('#fas').textContent =
    lage === 'bygg' ? 'byggfas' : lage === 'strid' ? 'strid' : lage === 'paus' ? 'pausad' : lage === 'vinst' ? 'seger' : 'förlust';
  document.querySelector('#ranta').textContent =
    lage === 'strid' ? `${nr(beraknadRanta(rantebas))} (låst)` : `${nr(beraknadRanta(saldo))} före saldotak`;
  const nastaVag = Math.min(vagNr, LTD.ANTAL_VAGOR);
  document.querySelector('#nasta-vag').textContent = `Våg ${nastaVag}: ${LTD.vagText(nastaVag)}`;
  const v = LTD.vag(nastaVag);
  document.querySelector('#nasta-egenskap').textContent = v.harBoss
    ? `Bossvåg – ${v.bossnamn}. Boss tar 5 kungaliv vid läcka och bromsas bara 12 %.`
    : `Bashälsa ${nr(v.bas.halsa)}, belöning ${nr(v.bas.belaning)} per fiende.`;
  for (const e of LTD.ENHETER) {
    const knapp = document.querySelector(`[data-enhet="${e.id}"]`);
    knapp.classList.toggle('vald', valdButik === e.id);
    knapp.disabled = lage !== 'bygg';
    knapp.classList.toggle('orad', lage === 'bygg' && !harRad(e.pris));
  }
  const panel = document.querySelector('#vald-panel');
  const a = valdArme ? arme.find(x => x.id === valdArme) : null;
  if (a && lage === 'bygg') {
    panel.hidden = false;
    const upp = uppgraderingsPris(a.enhet), m = a.uppgraderad ? 2 : 1;
    document.querySelector('#vald-namn').textContent = `${a.enhet.namn}${a.uppgraderad ? ' ★' : ''}`;
    document.querySelector('#vald-info').textContent = a.enhet.stod
      ? `Ger +${Math.round(a.enhet.stod.skada * m * 100)} % skada och +${Math.round(a.enhet.stod.rackvidd * m * 100)} % räckvidd åt torn inom ${a.enhet.rackvidd} rutor.`
      : `Skada ${a.enhet.skada * m} varje ${a.enhet.intervall} s, räckvidd ${a.enhet.rackvidd} rutor${a.enhet.omrade ? `, område ${a.enhet.omrade} rutor` : ''}.`;
    const uppKnapp = document.querySelector('#uppgradera');
    uppKnapp.disabled = a.uppgraderad || !harRad(upp);
    uppKnapp.textContent = a.uppgraderad ? 'Uppgraderad' : `Uppgradera (${nr(upp)})`;
    document.querySelector('#salj').textContent = `Sälj (+${nr(saljVarde(a))})`;
  } else panel.hidden = true;
  document.querySelector('#starta-vag').disabled = lage !== 'bygg';
  document.querySelector('#pausa').textContent = lage === 'paus' ? 'Fortsätt' : 'Pausa';
  document.querySelector('#pausa').disabled = !(lage === 'strid' || lage === 'bygg' || lage === 'paus');
  document.querySelector('#fart').textContent = `${fart}×`;
  const res = document.querySelector('#resultat');
  if (vagResultat) {
    res.hidden = false;
    res.textContent = `Våg ${vagResultat.vag}: underlag ${nr(vagResultat.underlag)} → ränta ${nr(vagResultat.utbetald)}`
      + (vagResultat.tappad > 0 ? ` (${nr(vagResultat.tappad)} fick inte plats)` : '')
      + ` · saldo ${nr(vagResultat.saldo)} · ${vagResultat.liv} kungaliv`
      + ` · totalt ${statistik.dodade} dödade, ${nr(statistik.tjanat)} Ramen från fiender, ${nr(statistik.ranta)} Ramen i ränta`;
  } else res.hidden = true;
}

// ---------- loop ----------
function frame(tid) {
  const dt = Math.min((tid - last) / 1000, .1);
  last = tid;
  if (lage === 'strid') {
    acc += dt * fart;
    let varv = 0;
    while (acc >= STEG && varv < 12 && lage === 'strid') { steg(STEG); acc -= STEG; varv++; }
    if (acc > STEG * 12) acc = 0;
    ritaUI();
  }
  draw();
  requestAnimationFrame(frame);
}

// ---------- styrning ----------
function rutaFranPekare(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * W / rect.width, y = (event.clientY - rect.top) * H / rect.height;
  if (x < GRID_X0 || x > GRID_X1 || y < GRID_Y0 || y > GRID_Y1) return null;
  return { kol: Math.floor((x - GRID_X0) / CELL), rad: Math.floor((y - GRID_Y0) / CELL) };
}
canvas.addEventListener('pointerdown', event => {
  const ruta = rutaFranPekare(event);
  if (!ruta) return;
  markor = ruta;
  placera(ruta.kol, ruta.rad);
});
for (const e of LTD.ENHETER) document.querySelector(`[data-enhet="${e.id}"]`).addEventListener('click', () => valjButik(e.id));
document.querySelector('#starta-vag').addEventListener('click', startaVag);
document.querySelector('#pausa').addEventListener('click', pausa);
document.querySelector('#fart').addEventListener('click', vaxlaFart);
document.querySelector('#avbryt').addEventListener('click', avbryt);
document.querySelector('#flytta').addEventListener('click', startaFlytt);
document.querySelector('#uppgradera').addEventListener('click', uppgradera);
document.querySelector('#salj').addEventListener('click', salj);
document.querySelector('#start').addEventListener('click', startaOm);

function flyttaMarkor(dk, dr) {
  for (let i = 1; i <= Math.max(LTD.GRID_KOL, LTD.GRID_RAD); i++) {
    const k = markor.kol + dk * i, r = markor.rad + dr * i;
    if (k < 0 || r < 0 || k >= LTD.GRID_KOL || r >= LTD.GRID_RAD) return;
    if (!LTD.arBana(k, r)) { markor = { kol: k, rad: r }; return ritaUI(); }
  }
}
document.addEventListener('keydown', event => {
  const mal = event.target;
  if (mal && (mal.tagName === 'INPUT' || mal.tagName === 'TEXTAREA' || mal.isContentEditable)) return;
  const k = event.key;
  if (k >= '1' && k <= '6') { event.preventDefault(); return valjButik(LTD.ENHETER[+k - 1].id); }
  if (k === 'ArrowLeft') { event.preventDefault(); return flyttaMarkor(-1, 0); }
  if (k === 'ArrowRight') { event.preventDefault(); return flyttaMarkor(1, 0); }
  if (k === 'ArrowUp') { event.preventDefault(); return flyttaMarkor(0, -1); }
  if (k === 'ArrowDown') { event.preventDefault(); return flyttaMarkor(0, 1); }
  if (k === 'Enter') { event.preventDefault(); return placera(markor.kol, markor.rad); }
  if (k === ' ') { event.preventDefault(); if (lage === 'bygg') startaVag(); return; }
  if (k === 'p' || k === 'P') { event.preventDefault(); return pausa(); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (lage === 'strid' || lage === 'bygg')) {
    pausatLage = lage; lage = 'paus';
    say('Pausat när fliken doldes. Tryck på Fortsätt.'); ritaUI();
  }
});

nyMatch();
requestAnimationFrame(frame);
