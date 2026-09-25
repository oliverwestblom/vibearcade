// Enkel referensspelare for balans och tester. Den bygger en sicksacklabyrint
// av vaggtorn och uppgraderar sedan vaggarna langs kedjan dar de tacker mest
// av vagen, men behaller alltid nagra torn som kan skjuta pa flygare.
const D = require('../data.js');
const S = require('../sim.js');

function vaggTorn(s) { return s.byggare.map(b => D.BYGGARE_AV[b].torn[0].id); }
function tackning(s, t) {
  const rv = S.stats(s, t).rackvidd;
  let n = 0;
  for (const p of s.rutt.punkter) if (Math.hypot(p.x - (t.kol + 0.5), p.y - (t.rad + 0.5)) <= rv) n++;
  return n;
}
function tackningVid(s, kol, rad, rv) {
  let n = 0;
  for (const p of s.rutt.punkter) if (Math.hypot(p.x - (kol + 0.5), p.y - (rad + 0.5)) <= rv) n++;
  return n;
}

// Basta rutan for ett nytt vaggtorn. labyrint=true: langsta rutt vinner,
// annars basta tackning utan att rutten andras.
function bastaRuta(s, typ, labyrint) {
  let bast = null, poang = -Infinity;
  const def = D.TORN[typ];
  for (let kol = 0; kol < D.KOL; kol++) for (let rad = 0; rad < D.RAD; rad++) {
    const p = S.provaBygge(s, typ, kol, rad);
    if (!p.ok) continue;
    let v;
    if (labyrint) v = p.rutt.langd * 100 + tackningVid(s, kol, rad, def.rackvidd);
    else { if (p.rutt.langd !== s.rutt.langd) continue; v = tackningVid(s, kol, rad, 4); }
    if (v > poang) { poang = v; bast = { kol, rad }; }
  }
  return bast;
}

// Sicksack-plan: tvarvaggar var tredje kolumn med luckan omvaxlande uppe
// och nere. Mellan vaggarna blir det tva rutor breda gangar.
function sicksack() {
  const plan = [];
  let uppe = false;
  for (let kol = 2; kol < D.KOL - 2; kol += 3) {
    const rader = Array.from({ length: D.RAD - 1 }, (_, i) => uppe ? i + 1 : i);
    plan.push(...(uppe ? rader.reverse() : rader).map(rad => ({ kol, rad })));
    uppe = !uppe;
  }
  return plan;
}

const traffarLuft = t => { const d = D.TORN[t.typ]; return d.steg > 0 && d.mal !== 'mark' && !d.stod; };

function spendera(s, { labyrint = true } = {}) {
  const vagg = vaggTorn(s)[0];
  const nasta = D.vag(s.vag, s.svarighet);
  // Vaggar: forst ett grundantal som vaxer med vagen, sedan uppgraderingar,
  // och sist gar overblivet guld till fler vaggar.
  const byggVaggar = max => {
    let n = s.torn.length;
    for (const c of sicksack()) {
      if (n >= max || s.guld < D.TORN[vagg].pris) break;
      if (!S.overlappar(s, c.kol, c.rad) && S.bygg(s, vagg, c.kol, c.rad).ok) n++;
    }
  };
  if (labyrint) {
    byggVaggar(10 + 3 * s.vag);
  } else {
    // Utan labyrint: nya torn langs den raka vagen, sa manga som vagen kraver.
    while (s.torn.length < 4 + Math.floor(s.vag / 2) && s.guld >= D.TORN[vagg].pris) {
      const r = bastaRuta(s, vagg, false);
      if (!r || !S.bygg(s, vagg, r.kol, r.rad).ok) break;
    }
  }
  const minLuft = 2 + Math.floor(s.vag / 7);
  for (let varv = 0; varv < 300; varv++) {
    const luft = s.torn.filter(traffarLuft).length;
    let bast = null, poang = -Infinity;
    for (const t of s.torn) {
      const pris = S.uppgraderingspris(t);
      if (pris === null || pris > s.guld || (S.kraverKristall(t) && s.kristaller < 1)) continue;
      const nu = D.TORN[t.typ], ny = D.TORN[nu.nasta];
      // Tappa inte luftvarnet: ett steg till ett rent marktorn kraver att det finns nog kvar.
      if (traffarLuft(t) && ny.mal === 'mark' && luft - 1 < minLuft) continue;
      let v = tackning(s, t) * (1 + nu.steg) / pris;
      if (nasta.luft && ny.mal !== 'mark' && luft < minLuft) v *= 5;
      if (nasta.immunMagi && ny.attack !== 'magi') v *= 2;
      if (v > poang) { poang = v; bast = t; }
    }
    if (!bast || !S.uppgradera(s, bast.id).ok) break;
  }
  // Spara till nasta uppgradering om den ar nara, annars fler vaggar.
  const billigast = Math.min(...s.torn.map(t => S.uppgraderingspris(t) ?? Infinity));
  if (labyrint && s.guld > billigast * 1.5) byggVaggar(Infinity);
}

function spela(opt = {}, strategi = {}) {
  const s = S.skapa({ seed: 7, ...opt });
  while (s.fas === 'bygg') {
    if (s.erbjudande) S.valjExtraByggare(s, s.erbjudande[0]);
    spendera(s, strategi);
    S.korVag(s);
    if (s.vag > (opt.stoppa || 99)) break;
  }
  return s;
}

module.exports = { spela, spendera, bastaRuta };

if (require.main === module) {
  const nadd = s => s.aktuellVag ? s.aktuellVag.nummer : s.vag;
  for (const byggare of [...D.BYGGARE.map(b => [b.id]), ['frost', 'eld'], ['berg', 'kristall']]) {
    const t0 = Date.now();
    const s = spela({ byggare });
    const rak = spela({ byggare }, { labyrint: false });
    console.log(`${byggare.join('+').padEnd(15)} labyrint: ${s.fas.padEnd(7)} våg ${String(nadd(s)).padEnd(3)} liv ${String(s.liv).padEnd(3)} väg ${s.rutt.langd.toFixed(0)}/${s.rakLangd}  |  rak: våg ${nadd(rak)}  (${Date.now() - t0} ms)`);
  }
}
