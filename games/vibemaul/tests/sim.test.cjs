const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../data.js');
const M = require('../maze.js');
const S = require('../sim.js');
const { spela } = require('./bot.cjs');

const vagg = [[5,3],[5,4],[5,5]];
function match(opt = {}) { return S.skapa({ byggare: ['frost'], guld: 10000, ...opt }); }
function byggAlla(s, typ, rutor) { for (const [k, r] of rutor) assert.ok(S.bygg(s, typ, k, r).ok, `bygg ${k},${r}`); }
// Bygger rasens vagg och uppgraderar den langs kedjan tills den ar typ.
// Ger guld och kristall vid behov, sa testerna kan borja fran vilket steg som helst.
function byggKedja(s, typ, k, r) {
  const def = D.TORN[typ], bas = D.BYGGARE_AV[def.byggare].torn[0].id;
  const res = S.bygg(s, bas, k, r);
  if (!res.ok) return res;
  const t = res.torn;
  while (t.typ !== typ) {
    const pris = S.uppgraderingspris(t);
    if (s.guld < pris) s.guld += pris;
    if (S.kraverKristall(t) && s.kristaller < 1) s.kristaller += 1;
    assert.ok(S.uppgradera(s, t.id).ok, `uppgradera mot ${typ}`);
  }
  return res;
}

// ---------- korridoren ----------
test('det finns en karta: en rak korridor dar tom rutt ar en rak linje', () => {
  assert.equal(D.KARTOR.length, 1);
  const s = match(), k = s.karta;
  assert.equal(k.start.rad, k.mal.rad);
  assert.equal(k.checkpoints.length, 0); assert.equal(k.stenar.length, 0);
  assert.equal(s.rutt.langd, D.KOL - 0.5);          // fina rutor: fran vänsterkant till högerkant
  assert.ok(s.rutt.punkter.every(p => p.y === s.rutt.punkter[0].y));
});

test('hela korridoren utom start och port gar att bygga pa, aven med halvrutor', () => {
  const s = match(), k = s.karta;
  for (let kol = 0; kol <= D.KOL - 1; kol += 0.5) for (let rad = 0; rad <= D.RAD - 1; rad += 0.5) {
    const nara = c => Math.abs(kol - c.kol) < 1 && Math.abs(rad - c.rad) < 1;
    assert.equal(S.provaBygge(s, 'iskloss', kol, rad).ok, !nara(k.start) && !nara(k.mal), `${kol},${rad}`);
  }
  assert.equal(S.provaBygge(s, 'iskloss', 3.25, 2).ok, false, 'bara halvrutesteg');
});

test('halvrutor: torn far inte overlappa, men kan sta forskjutna en halv ruta', () => {
  const s = match();
  assert.ok(S.bygg(s, 'iskloss', 5, 2).ok);
  assert.equal(S.bygg(s, 'iskloss', 5.5, 2.5).ok, false);
  assert.ok(S.bygg(s, 'iskloss', 6, 2.5).ok, 'en halv ruta nedflyttad bredvid');
  assert.ok(S.tornVid(s, 6.9, 3.4));
  assert.equal(S.tornVid(s, 6.9, 2.4), undefined);
});

test('diagonal trappvagg av forskjutna torn haller tatt, fienden smiter inte mellan horn', () => {
  const s = match();
  // Trappan: varje torn en ruta ner och en halv ruta at hoger. Tornen nuddar
  // varandra bara i horn-/kantbitar, men vagen far inte skara horn.
  for (let i = 0; i < D.RAD - 1; i++) assert.ok(S.bygg(s, 'iskloss', 10 + i * 0.5, i).ok, `trappsteg ${i}`);
  const sista = S.bygg(s, 'iskloss', 10 + (D.RAD - 1) * 0.5, D.RAD - 1);
  assert.equal(sista.ok, false); assert.ok(sista.blockerar, 'sista steget skulle stänga korridoren');
});

test('fienderna gar diagonalt: rutten ar kortare an manhattan-avstandet runt ett hinder', () => {
  const s = match();
  for (let r = 0; r < D.RAD - 1; r++) S.bygg(s, 'iskloss', 10, r);   // vagg med lucka langst ner
  const manhattan = (D.KOL - 0.5) + 2 * ((D.RAD - 0.25) - (s.karta.start.rad + 0.75));
  assert.ok(s.rutt.langd < manhattan);
  assert.ok(s.rutt.celler.some((c, i) => i && c.kol !== s.rutt.celler[i - 1].kol && c.rad !== s.rutt.celler[i - 1].rad), 'har diagonala steg');
});

test('motorn klarar checkpoints: rutten passerar dem i ordning och ar summan av benen', () => {
  const layout = { kol: 12, rad: 8, start: { kol: 0, rad: 0 }, checkpoints: [{ kol: 11, rad: 0 }, { kol: 0, rad: 7 }], mal: { kol: 11, rad: 7 }, fasta: [[5, 3]] };
  const maze = M.skapa(layout), r = maze.rutt([]);
  const sparr = new Uint8Array(12 * 8); sparr[3 * 12 + 5] = 1;
  let fran = layout.start, summa = 0, index = 0;
  for (const [i, stopp] of maze.stopp.entries()) {
    summa += M.langd(M.vag(fran, stopp, sparr, layout.kol, layout.rad));
    index = r.celler.findIndex((c, j) => j > index && c.kol === stopp.kol && c.rad === stopp.rad);
    assert.ok(index > 0, `når stopp ${i}`);
    assert.equal(r.stoppEfter[index], i + 1);
    fran = stopp;
  }
  assert.ok(Math.abs(r.langd - summa) < 1e-9);
  assert.ok(!r.celler.some(c => c.kol === 5 && c.rad === 3), 'går inte genom stenen');
});

// ---------- flerval ----------
test('flerval: uppgradera alla tar billigast forst, salj alla bara i byggfas', () => {
  const s = match({ guld: 100 });
  const a = S.bygg(s, 'iskloss', 5, 1).torn, b = S.bygg(s, 'iskloss', 8, 1).torn, c = byggKedja(s, 'frostbage', 12, 1).torn;
  s.guld = 90;   // racker till tva vaggar -> frostbage (40 st) men inte frostbage -> snostorm (140)
  const r = S.uppgraderaFlera(s, [a.id, b.id, c.id]);
  assert.equal(r.antal, 2); assert.equal(r.hoppade, 1);
  assert.equal(a.typ, 'frostbage'); assert.equal(b.typ, 'frostbage'); assert.equal(c.typ, 'frostbage');
  S.startaVag(s);
  assert.equal(S.saljFlera(s, [a.id, b.id]).antal, 0);
  while (s.fas === 'strid') S.steg(s, 1 / 30);
  const guld = s.guld, v = S.saljFlera(s, [a.id, b.id, c.id]);
  assert.equal(v.antal, 3); assert.equal(s.torn.length, 0); assert.equal(s.guld, guld + v.varde);
});

test('bygge som stanger nagot ben nekas och kostar inget', () => {
  const s = match();
  // Kolumn 1 tvars over hela korridoren ar en hel vagg.
  const rutor = Array.from({ length: D.RAD }, (_, r) => [1, r]);
  byggAlla(s, 'iskloss', rutor.slice(0, -1));
  const fore = s.guld;
  const p = S.bygg(s, 'iskloss', 1, D.RAD - 1);
  assert.equal(p.ok, false); assert.ok(p.blockerar);
  assert.equal(s.guld, fore);
  assert.ok(s.maze.rutt(s.torn));
});

test('torn fran andra byggare och utan guld nekas', () => {
  const s = match({ guld: 4 });
  assert.equal(S.bygg(s, 'glodsten', 5, 5).ok, false);
  const p = S.bygg(s, 'iskloss', 5, 5);
  assert.equal(p.ok, false); assert.ok(p.rutt, 'forhandsvisningen far rutten aven utan guld');
});

test('en vagg forlanger rutten', () => {
  const s = match();
  const fore = s.rutt.langd;
  byggAlla(s, 'iskloss', vagg);
  assert.ok(s.rutt.langd > fore);
});

test('fiender gar framat till porten och progress okar monotont', () => {
  const s = match();
  byggAlla(s, 'iskloss', vagg);
  S.startaVag(s);
  S.steg(s, 0.01);
  const f = s.fiender[0];
  let senast = -1, maxStopp = 0;
  for (let i = 0; i < 20000 && !f.dod; i++) {
    for (const x of s.fiender) x.halsa = 1e9;       // ingen dor
    S.steg(s, 1 / 30);
    assert.ok(f.gatt >= senast); senast = f.gatt;
    const idx = Math.min(f.i - 1, f.celler.length - 1);
    maxStopp = Math.max(maxStopp, s.rutt.stoppEfter[idx] ?? 0);
  }
  assert.ok(f.dod, 'fienden laeker till slut');
  assert.equal(s.stat.lackta >= 1, true);
});

// ---------- anti-juggle ----------
test('under strid nekas bygge pa en levande fiendes kvarvarande rutt', () => {
  const s = match();
  S.startaVag(s); S.steg(s, 0.05);
  const f = s.fiender[0];
  const pa = f.celler[f.celler.length - 8];     // fin ruta langre fram pa rutten
  const p = S.bygg(s, 'iskloss', Math.floor(pa.kol) / 2, Math.floor(pa.rad) / 2);
  assert.equal(p.ok, false); assert.ok(p.juggle);
});

test('tillatet bygge under strid andrar inte levande fienders rutt, bara nya spawns', () => {
  const s = match();
  S.startaVag(s); S.steg(s, 0.05);
  s.ko = [];                                   // en ensam fiende
  const f = s.fiender[0], fore = JSON.stringify(f.celler);
  f.maxHalsa = f.halsa = 1e9;
  while (f.i < 25) S.steg(s, 1 / 30);           // en bit in i korridoren
  const upptaget = S.uppbokadeRutor(s);
  // Ruta pa nuvarande rutt for framtida fiender men inte pa f:s kvarvarande.
  let byggd = null;
  for (let k = 0; k < D.KOL && !byggd; k++) for (let r = 0; r < D.RAD && !byggd; r++) {
    if (upptaget.has(k + ',' + r)) continue;
    const p = S.provaBygge(s, 'iskloss', k, r);
    if (p.ok && p.rutt.langd !== s.rutt.langd) { S.bygg(s, 'iskloss', k, r); byggd = [k, r]; }
  }
  assert.ok(byggd, 'hittade ett bygge som andrar rutten');
  assert.equal(JSON.stringify(f.celler), fore);
  assert.notEqual(JSON.stringify(s.rutt.celler), fore);
});

test('salj bara mellan vagor, full aterbetalning innan tornet stridat', () => {
  const s = match({ guld: 100 });
  const t = byggKedja(s, 'frostbage', 6, 6).torn;   // 5 + 40 guld
  assert.equal(S.salj(s, t.id).varde, 45);
  const t2 = byggKedja(s, 'frostbage', 6, 6).torn;
  S.startaVag(s);
  assert.equal(S.salj(s, t2.id).ok, false);
  while (s.fas === 'strid') S.steg(s, 1 / 30);
  assert.equal(S.salj(s, t2.id).varde, Math.floor(45 * D.SALJ_ANDEL));
});

// ---------- luft ----------
test('flygare foljer raka linjer mellan stoppen oavsett torn', () => {
  const s = match();
  byggAlla(s, 'iskloss', vagg);
  s.vag = 7;
  S.startaVag(s); S.steg(s, 0.01);
  const f = s.fiender[0];
  assert.ok(f.luft);
  assert.equal(f.celler.length, s.maze.luftStopp().length);
});

test('mark-torn valjer aldrig flygare, varken direkt eller i sprangradie', () => {
  const s = match();
  const kanon = byggKedja(s, 'glaciarkanon', 3, 2).torn;
  s.vag = 7;
  S.startaVag(s);
  for (let i = 0; i < 900 && s.fas === 'strid'; i++) S.steg(s, 1 / 30);
  assert.equal(kanon.skott, 0);
  assert.equal(S.kanTraffa(D.TORN.glaciarkanon, { luft: true }), false);
  assert.equal(S.kanTraffa(D.TORN.frostbage, { luft: true }), true);
  // Luftvarnen traffar bade mark och luft, med bonus mot flygare.
  assert.equal(S.kanTraffa(D.TORN.ekskytt, { luft: false }), true);
  assert.ok(D.TORN.ekskytt.luftSkada > 1);
});

// ---------- attack och pansar ----------
test('typtabellen stammer for alla 25 kombinationer och magi mot immun ar 0', () => {
  for (const [attack, rad] of Object.entries(D.TYPTABELL)) for (const [pansar, v] of Object.entries(rad)) {
    assert.equal(S.typMultiplikator(attack, pansar, false), v);
    assert.equal(S.typMultiplikator(attack, pansar, true), attack === 'magi' ? 0 : v);
  }
});

test('gift och magisk broms biter inte pa magiimmuna, rotfallans broms gor det', () => {
  const s = match({ byggare: ['natur', 'frost'] });
  const gift = byggKedja(s, 'giftblomma', 1, 3).torn, storm = byggKedja(s, 'snostorm', 1, 5).torn;
  s.vag = 9;                                   // Runbarare, immunMagi
  S.startaVag(s); S.steg(s, 0.01);
  const f = s.fiender[0];
  assert.ok(f.immunMagi);
  const halsa = f.halsa;
  for (let i = 0; i < 60; i++) S.steg(s, 1 / 30);
  assert.ok(gift.skott > 0 && storm.skott > 0, 'tornen sköt');
  assert.equal(f.gift, null);
  assert.equal(f.kyla, 0);
  assert.equal(f.halsa, halsa);

  const r = match({ byggare: ['natur'] });
  byggKedja(r, 'rotfalla', 1, 5);
  r.vag = 9; S.startaVag(r); S.steg(r, 0.01);
  const g = r.fiender[0];
  g.halsa = g.maxHalsa = 1e9;                      // mastartornet skulle annars doda den direkt
  for (let i = 0; i < 60 && !g.kyla; i++) S.steg(r, 1 / 30);
  assert.ok(g.kyla > 0, 'rotfällan bromsar immun fiende');
});

// ---------- byggare ----------
test('dubbla byggare kan kopa fran bada men inte fran andra', () => {
  const s = match({ byggare: ['frost', 'eld'] });
  assert.ok(S.bygg(s, 'iskloss', 5, 5).ok);
  assert.ok(S.bygg(s, 'glodsten', 5, 7).ok);
  assert.equal(S.bygg(s, 'gnista', 5, 9).ok, false);
});

test('slump med samma seed ger samma byggare', () => {
  const a = S.slumpaByggare(S.slump(42), 2), b = S.slumpaByggare(S.slump(42), 2);
  assert.deepEqual(a, b); assert.equal(new Set(a).size, 2);
});

test('extra byggare erbjuds efter vag 15 och spararen maste valja innan nasta vag', () => {
  const s = match();
  s.vag = 15;
  S.startaVag(s);
  s.ko = []; s.fiender = [];
  S.steg(s, 0.01);
  assert.equal(s.vag, 16);
  assert.equal(s.erbjudande.length, 2);
  assert.equal(S.startaVag(s), false);
  assert.ok(S.valjExtraByggare(s, s.erbjudande[1]));
  assert.equal(s.byggare.length, 2);
  assert.ok(S.startaVag(s));
});

test('uppgradering gor tornet till nasta torn i rasens kedja, mastartornet kraver kristall', () => {
  const s = match();
  assert.equal(S.bygg(s, 'frostbage', 3, 3).ok, false, 'bara väggen går att bygga');
  const t = S.bygg(s, 'iskloss', 6, 6).torn;
  const kedja = D.BYGGARE_AV.frost.torn.map(x => x.id);
  for (let i = 1; i < kedja.length - 1; i++) {
    assert.ok(S.uppgradera(s, t.id).ok);
    assert.equal(t.typ, kedja[i]); assert.equal(t.niva, i + 1);
  }
  assert.ok(S.kraverKristall(t));
  assert.equal(S.uppgradera(s, t.id).ok, false);
  s.kristaller = 1;
  assert.ok(S.uppgradera(s, t.id).ok);
  assert.equal(t.typ, kedja.at(-1)); assert.equal(s.kristaller, 0);
  assert.equal(S.uppgraderingspris(t), null);
  assert.ok(S.salj(s, t.id).ok); assert.equal(s.kristaller, 1);
});

test('varje steg i varje ras kedja gor mer skada an det forra', () => {
  for (const b of D.BYGGARE) {
    const skador = b.torn.filter(t => !t.stod).map(t => D.TORN[t.id].skada * S.stegSkada(D.TORN[t.id]) / D.TORN[t.id].intervall);
    for (let i = 1; i < skador.length; i++) assert.ok(skador[i] > skador[i - 1], `${b.id} steg ${i}`);
    const priser = b.torn.slice(0, -1).map(t => S.uppgraderingspris({ typ: t.id }));
    for (let i = 1; i < priser.length; i++) assert.ok(priser[i] > priser[i - 1], `${b.id} pris ${i}`);
  }
});

// ---------- vagor ----------
test('vagor ar deterministiska; flyg var 7:e, boss var 5:e, slutboss pa 40, 41 ar som 1 men starkare', () => {
  for (let w = 1; w <= 80; w++) assert.deepEqual(D.vag(w), D.vag(w));
  for (const w of [7, 14, 21, 28, 35]) assert.ok(D.vag(w).luft, `våg ${w}`);
  for (const w of [5, 10, 15, 20, 25, 30, 35 - 0, 40].filter(w => w % 5 === 0 && w !== 35)) assert.ok(D.vag(w).boss, `våg ${w}`);
  assert.equal(D.vag(40).bossnamn, 'Hertig Frostmaul');
  assert.equal(D.vag(41).typ, D.vag(1).typ);
  assert.equal(D.vag(41).kon.length, D.vag(1).kon.length + Math.floor(41 / 5) - Math.floor(1 / 5));
  assert.ok(D.vag(41).kon[0].maxHalsa > D.vag(1).kon[0].maxHalsa);
});

test('vinst efter vag 40, oandligt lage fortsatter', () => {
  for (const oandlig of [false, true]) {
    const s = match({ oandlig, extraByggare: false });
    s.vag = 40; S.startaVag(s); s.ko = []; s.fiender = []; S.steg(s, 0.01);
    assert.equal(s.fas, oandlig ? 'bygg' : 'vinst');
  }
});

test('lackor kostar liv, boss kostar 5, noll liv ar forlust', () => {
  const s = match();
  s.vag = 5; S.startaVag(s);
  for (let i = 0; i < 40000 && s.fas === 'strid'; i++) S.steg(s, 1 / 30);
  assert.equal(s.liv, D.START_LIV - (D.vag(5).kon.length - 1) - 5);
  s.liv = 1; s.vag = 1; s.fas = 'bygg'; S.startaVag(s);
  for (let i = 0; i < 40000 && s.fas === 'strid'; i++) S.steg(s, 1 / 30);
  assert.equal(s.fas, 'forlust'); assert.equal(s.liv, 0);
});

// ---------- balans ----------
test('balans: referenslabyrint nar langt, utan labyrint forlorar tidigt', () => {
  const lab = spela({ byggare: ['eld'] });
  const rak = spela({ byggare: ['eld'] }, { labyrint: false });
  const nadd = s => s.aktuellVag ? s.aktuellVag.nummer : s.vag;
  assert.ok(nadd(lab) >= 35, `labyrint nådde ${nadd(lab)}`);
  assert.ok(nadd(rak) <= nadd(lab) - 10, `rak väg nådde ${nadd(rak)}, labyrint ${nadd(lab)}`);
  assert.ok(lab.rutt.langd > lab.rakLangd * 2);
});

// ---------- nya klasser ----------
test('synergi: tvillingpil far +25 % per ordenstorn intill, max fyra; andra raser raknas inte', () => {
  const s = match({ byggare: ['tvilling', 'frost'] });
  const mitt = byggKedja(s, 'tvillingpil', 10, 1).torn;
  const ensam = S.stats(s, mitt).skada;
  S.bygg(s, 'iskloss', 10, 0);                     // annan ras raknas inte
  assert.equal(S.stats(s, mitt).grannar, 0);
  for (const [k, r] of [[9,0],[11,0],[9,1],[11,1],[9,2],[10,2]]) S.bygg(s, 'spegelsten', k, r);
  const st = S.stats(s, mitt);
  assert.equal(st.grannar, 6);
  assert.ok(Math.abs(st.skada - ensam * 2) < 1e-9, 'max +100 %');
});

test('kraftverk snabbar upp alla torn inom rackvidd, och auran forsvinner nar det blir krutkanon', () => {
  const s = match({ byggare: ['skrot', 'frost'] });
  const bage = byggKedja(s, 'frostbage', 10, 1).torn;
  const fore = S.stats(s, bage).intervall;
  const kv = byggKedja(s, 'kraftverk', 11, 1).torn;
  assert.ok(Math.abs(S.stats(s, bage).intervall - fore / 1.4) < 1e-9, '+40 % takt');
  const langtBort = byggKedja(s, 'frostbage', 25, 8).torn;
  assert.equal(S.stats(s, langtBort).intervall, D.TORN.frostbage.intervall);
  s.kristaller = 1; assert.ok(S.uppgradera(s, kv.id).ok);
  assert.equal(kv.typ, 'krutkanon');
  assert.equal(S.stats(s, bage).intervall, fore);
});

test('narstrid slar direkt utan projektil och nar inte flygare', () => {
  const s = match({ byggare: ['berg'] });
  const nave = byggKedja(s, 'stenknytnave', 2, 3).torn;
  S.startaVag(s);
  for (let i = 0; i < 300 && nave.skott === 0; i++) S.steg(s, 1 / 30);
  assert.ok(nave.skott > 0);
  assert.equal(s.skott.filter(sk => sk.typ === 'stenknytnave').length, 0);
  assert.equal(S.kanTraffa(D.TORN.stenknytnave, { luft: true }), false);
});

test('multiskott traffar flera mal samtidigt', () => {
  const s = match({ byggare: ['kristall'] });
  const spira = byggKedja(s, 'splitterspira', 6, 3).torn;
  s.vag = 4;                                       // svarm: manga tata fiender
  S.startaVag(s);
  let max = 0;
  for (let i = 0; i < 600 && s.fas === 'strid'; i++) {
    S.steg(s, 1 / 30);
    max = Math.max(max, s.skott.filter(sk => sk.typ === 'splitterspira').length);
  }
  assert.ok(spira.skott > 0);
  assert.equal(max, 3);
});

test('rasens skadekurva, bossbonus och saljandel per torn', () => {
  assert.ok(D.TORN.stenknytnave.bossSkada > 1);
  const s = match({ byggare: ['djup', 'skrot'] });
  const t = byggKedja(s, 'valkalla', 5, 5).torn;
  assert.ok(Math.abs(S.stats(s, t).skada - D.TORN.valkalla.skada * D.BYGGARE_AV.djup.kurva.skada) < 1e-9, 'mästartornet får hela kurvan');
  // Djupets kurva ar brantare: svagare an standard i mitten av kedjan.
  assert.ok(S.stegSkada(D.TORN.djuphavsoga) < Math.pow(D.KURVA.skada, 1 / 3));
  const n = byggKedja(s, 'nitpistol', 7, 7).torn; n.stridat = true;
  assert.equal(S.saljvarde(s, n), Math.floor(n.betalt * 0.9));
});
test('alla byggare har profil med stil, styrkor och svagheter', () => {
  assert.ok(D.BYGGARE.length >= 9);
  for (const b of D.BYGGARE) {
    assert.ok(b.stil.length && b.bra && b.svag, b.id);
    assert.ok(b.torn.some(t => t.mal !== 'mark'), `${b.id} kan skjuta på luft`);
  }
});

// ---------- testläge ----------
test('testlage: oandligt guld och kristaller, liven tar aldrig slut', () => {
  const s = match({ test: true });
  assert.equal(s.guld, Infinity);
  const t = S.bygg(s, 'iskloss', 6, 6).torn;
  while (S.uppgraderingspris(t) !== null) assert.ok(S.uppgradera(s, t.id).ok);
  assert.equal(t.typ, 'glaciarkanon');
  assert.equal(s.guld, Infinity); assert.equal(s.kristaller, Infinity);
  S.salj(s, t.id);
  s.vag = 20; S.startaVag(s);
  for (let i = 0; i < 40000 && s.fas === 'strid'; i++) S.steg(s, 1 / 30);
  assert.equal(s.fas, 'bygg');
  assert.equal(s.liv, D.START_LIV);
  assert.ok(s.stat.lacktaLiv >= 11, 'läckorna räknas men kostar inga liv');
});