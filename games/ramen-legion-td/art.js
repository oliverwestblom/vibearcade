// Tehusets torn ritas i kod istallet for att laddas som bildatlas. Stilen ar
// medvetet en annan an Nudelkokets malade sprites: platta farger, tuschkontur,
// porslin och jade. Inga gradienter anvands, sa samma kod gar att kora i
// testmiljons attrapp-canvas.
const LTD_ART = (() => {
  const PORSLIN = '#f4f7f0', PORSLIN_SKUGGA = '#c9d6cd', INK = '#22332e';
  const JADE = '#8ad7bc', JADE_DJUP = '#3d8b76', JADE_LJUS = '#c6efe1';
  const GULD = '#e9c979', GULD_DJUP = '#a8813a';
  const LACK = '#b8483f', LACK_DJUP = '#752623';
  const JARN = '#4a5057', JARN_LJUS = '#767f88';
  const SOJA = '#4b3326', SOJA_LJUS = '#7a5238';

  function drag(g, bredd, farg) {
    g.lineWidth = Math.max(0.6, bredd); g.strokeStyle = farg;
    g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  }
  function fyll(g, farg, kant = INK, bredd = 0) {
    g.fillStyle = farg; g.fill(); if (bredd) drag(g, bredd, kant);
  }
  function polygon(g, punkter, stang = true) {
    g.beginPath();
    punkter.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    if (stang) g.closePath();
  }

  // Stenplint. Rackviddsnivan syns som ringar runt foten, sa spelaren kan lasa
  // av ett torns uppgraderingar direkt pa planen.
  function plint(g, u, rangeLevel) {
    const hexa = (rx, ry, dy) => {
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const v = Math.PI / 6 + i * Math.PI / 3;
        const x = Math.cos(v) * rx * u, y = dy * u + Math.sin(v) * ry * u;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.closePath();
    };
    hexa(29, 9.5, 23); fyll(g, '#66735f', INK, 2 * u);
    hexa(25, 7.6, 19.5); fyll(g, '#8e9c87');
    for (let i = 0; i < rangeLevel; i++) {
      g.beginPath();
      g.ellipse(0, (25 - i * 3.4) * u, (31 + i * 2.6) * u, (10 + i * 0.9) * u, 0, 0, Math.PI * 2);
      drag(g, 1.5 * u, i >= 3 ? GULD : JADE_DJUP);
    }
  }

  // Liten temastare bredvid varje torn, sa Tehuset ocksa har sina gubbar.
  function temastare(g, u, dx, dy, skala, drakt) {
    g.save(); g.translate(dx, dy); g.scale(skala, skala);
    polygon(g, [[-7 * u, 17 * u], [-4.6 * u, -4 * u], [4.6 * u, -4 * u], [7 * u, 17 * u]]);
    fyll(g, drakt, INK, 1.7 * u);
    g.beginPath(); g.moveTo(-5.8 * u, 5 * u); g.lineTo(5.8 * u, 5 * u); drag(g, 2.3 * u, GULD);
    g.beginPath(); g.arc(0, -8.6 * u, 4.5 * u, 0, Math.PI * 2); fyll(g, '#e9caa4', INK, 1.5 * u);
    polygon(g, [[-9.5 * u, -11 * u], [0, -20.5 * u], [9.5 * u, -11 * u]]);
    fyll(g, '#dcc68f', INK, 1.5 * u);
    g.restore();
  }

  function ang(g, u, dx, dy, antal, farg) {
    for (let i = 0; i < antal; i++) {
      const x = dx + (i - (antal - 1) / 2) * 7 * u;
      g.beginPath(); g.moveTo(x, dy);
      g.bezierCurveTo(x - 5 * u, dy - 7 * u, x + 5 * u, dy - 12 * u, x, dy - 19 * u);
      drag(g, 2.2 * u, farg);
    }
  }

  // ---- Tebryggaren: tekanna pa stativ, kokhett te som hoppar vidare -------
  function tebryggaren(g, u, niva) {
    plint(g, u, niva.rangeLevel);
    polygon(g, [[-13 * u, 20 * u], [-8 * u, -2 * u], [8 * u, -2 * u], [13 * u, 20 * u]]);
    fyll(g, PORSLIN_SKUGGA, INK, 2 * u);
    ang(g, u, 0, -34 * u, 1 + Math.min(3, niva.damageLevel), JADE_LJUS);
    // Kannans kropp.
    g.beginPath(); g.ellipse(0, -14 * u, 19 * u, 15 * u, 0, 0, Math.PI * 2);
    fyll(g, JADE, INK, 2.2 * u);
    g.beginPath(); g.ellipse(-6 * u, -19 * u, 7.5 * u, 5 * u, -0.5, 0, Math.PI * 2);
    fyll(g, JADE_LJUS);
    // Pip och handtag i guld.
    g.beginPath(); g.moveTo(-17 * u, -16 * u);
    g.bezierCurveTo(-27 * u, -18 * u, -30 * u, -25 * u, -28 * u, -31 * u);
    drag(g, 4.5 * u, GULD_DJUP);
    g.beginPath(); g.moveTo(-17 * u, -16 * u);
    g.bezierCurveTo(-26 * u, -18 * u, -28.5 * u, -24 * u, -27 * u, -29.5 * u);
    drag(g, 2.2 * u, GULD);
    g.beginPath(); g.moveTo(17 * u, -19 * u);
    g.bezierCurveTo(27 * u, -20 * u, 27 * u, -8 * u, 16 * u, -7 * u);
    drag(g, 4 * u, GULD_DJUP);
    // Lock med knopp.
    g.beginPath(); g.ellipse(0, -28 * u, 10 * u, 3.6 * u, 0, 0, Math.PI * 2);
    fyll(g, PORSLIN, INK, 1.8 * u);
    g.beginPath(); g.arc(0, -32.5 * u, 3.4 * u, 0, Math.PI * 2); fyll(g, GULD, INK, 1.6 * u);
    // Skadenivan syns som ledande band runt kannan.
    for (let i = 0; i < Math.min(5, niva.damageLevel); i++) {
      g.beginPath(); g.ellipse(0, (-8 + i * -5) * u, (18 - i * 1.6) * u, 3 * u, 0, 0, Math.PI * 2);
      drag(g, 1.5 * u, i >= 3 ? GULD : JADE_DJUP);
    }
    temastare(g, u, 24 * u, 6 * u, 0.82, JADE_DJUP);
  }

  // ---- Sojasprutan: fat med munstycke, marinad som frater genom pansar ----
  function sojasprutan(g, u, niva) {
    plint(g, u, niva.rangeLevel);
    polygon(g, [[-16 * u, 19 * u], [-14 * u, -20 * u], [14 * u, -20 * u], [16 * u, 19 * u]]);
    fyll(g, SOJA, INK, 2.2 * u);
    g.beginPath(); g.ellipse(0, -20 * u, 14 * u, 5 * u, 0, 0, Math.PI * 2);
    fyll(g, SOJA_LJUS, INK, 2 * u);
    for (const y of [-12, -1, 10]) {
      g.beginPath(); g.moveTo(-15.4 * u, y * u); g.lineTo(15.4 * u, y * u); drag(g, 2.6 * u, GULD_DJUP);
    }
    // Nivaglas som fylls med skadenivan.
    const fyllnad = 0.35 + Math.min(5, niva.damageLevel) * 0.11;
    g.beginPath(); g.roundRect(-4 * u, -17 * u, 8 * u, 28 * u, 2 * u);
    fyll(g, '#1d1510', INK, 1.5 * u);
    g.beginPath(); g.roundRect(-3 * u, (11 - 27 * fyllnad) * u, 6 * u, 27 * fyllnad * u, 1.5 * u);
    fyll(g, '#9c6b2f');
    // Munstycke och droppe.
    g.beginPath(); g.moveTo(14 * u, -6 * u); g.lineTo(30 * u, -6 * u); drag(g, 6 * u, JARN);
    g.beginPath(); g.moveTo(15 * u, -6 * u); g.lineTo(28 * u, -6 * u); drag(g, 2.4 * u, JARN_LJUS);
    g.beginPath(); g.arc(31 * u, -6 * u, 3.4 * u, 0, Math.PI * 2); fyll(g, '#6b4423', INK, 1.4 * u);
    g.beginPath(); g.arc(33 * u, 2 * u, 2.2 * u, 0, Math.PI * 2); fyll(g, '#a97434');
    // Tryckmatare.
    g.beginPath(); g.arc(-13 * u, -26 * u, 5.5 * u, 0, Math.PI * 2); fyll(g, PORSLIN, INK, 1.8 * u);
    g.beginPath(); g.moveTo(-13 * u, -26 * u);
    g.lineTo(-13 * u + Math.cos(-2.2 + niva.damageLevel * 0.5) * 3.6 * u,
             -26 * u + Math.sin(-2.2 + niva.damageLevel * 0.5) * 3.6 * u);
    drag(g, 1.6 * u, LACK);
    temastare(g, u, -27 * u, 7 * u, 0.78, SOJA_LJUS);
  }

  // ---- Wokmastaren: wok over eld, traffar allt inom sin korta radie -------
  function wokmastaren(g, u, niva) {
    plint(g, u, niva.rangeLevel);
    polygon(g, [[-20 * u, 20 * u], [-15 * u, 2 * u], [15 * u, 2 * u], [20 * u, 20 * u]]);
    fyll(g, '#59504a', INK, 2 * u);
    // Eldtungor, en fler for varje skadeniva.
    for (let i = 0; i <= Math.min(5, niva.damageLevel) + 2; i++) {
      const x = (-17 + i * 34 / (Math.min(5, niva.damageLevel) + 2)) * u;
      polygon(g, [[x - 4 * u, 2 * u], [x, -12 * u], [x + 4 * u, 2 * u]]);
      fyll(g, i % 2 ? '#f0a03c' : '#e5643a');
    }
    // Woken sedd snett ovanifran.
    g.beginPath(); g.ellipse(0, -14 * u, 30 * u, 11 * u, 0, 0, Math.PI * 2);
    fyll(g, JARN, INK, 2.4 * u);
    g.beginPath(); g.ellipse(0, -15.5 * u, 25 * u, 8 * u, 0, 0, Math.PI * 2);
    fyll(g, '#2f353b');
    g.beginPath(); g.ellipse(-8 * u, -17 * u, 9 * u, 3 * u, -0.2, 0, Math.PI * 2);
    fyll(g, JARN_LJUS);
    // Nudlar som kastas i en boge over pannan.
    for (let i = 0; i < 3; i++) {
      g.beginPath(); g.moveTo(-14 * u + i * 4 * u, -18 * u);
      g.bezierCurveTo(-6 * u + i * 5 * u, -34 * u, 10 * u + i * 4 * u, -32 * u, 16 * u + i * 3 * u, -18 * u);
      drag(g, 2 * u, '#f0d99b');
    }
    // Handtag.
    g.beginPath(); g.moveTo(28 * u, -16 * u); g.lineTo(40 * u, -22 * u); drag(g, 4 * u, '#6b4b33');
    temastare(g, u, -28 * u, 0, 0.9, LACK);
    // Tva slevar i handerna markerar virvelattacken.
    g.beginPath(); g.moveTo(-20 * u, -8 * u); g.lineTo(-11 * u, -20 * u); drag(g, 2.4 * u, '#8d6a44');
    g.beginPath(); g.arc(-10 * u, -22 * u, 3.4 * u, 0, Math.PI * 2); fyll(g, JARN_LJUS, INK, 1.4 * u);
  }

  // ---- Gonggongen: bronsgong i lackram, ger sarbarhet at fiender intill ---
  function gonggongen(g, u, niva) {
    plint(g, u, niva.rangeLevel);
    for (const x of [-25, 25]) {
      g.beginPath(); g.moveTo(x * u, 20 * u); g.lineTo(x * u, -30 * u); drag(g, 6 * u, LACK_DJUP);
      g.beginPath(); g.moveTo(x * u, 18 * u); g.lineTo(x * u, -28 * u); drag(g, 2.6 * u, LACK);
    }
    g.beginPath(); g.moveTo(-30 * u, -32 * u); g.lineTo(30 * u, -32 * u); drag(g, 5 * u, LACK_DJUP);
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(s * 30 * u, -32 * u);
      g.bezierCurveTo(s * 37 * u, -33 * u, s * 37 * u, -41 * u, s * 30 * u, -40 * u);
      drag(g, 2.6 * u, GULD_DJUP);
    }
    for (const x of [-16, 16]) {
      g.beginPath(); g.moveTo(x * u, -30 * u); g.lineTo(x * u, -22 * u); drag(g, 1.6 * u, GULD_DJUP);
    }
    // Bronsskivan.
    g.beginPath(); g.arc(0, -6 * u, 22 * u, 0, Math.PI * 2);
    fyll(g, '#c89a44', INK, 2.4 * u);
    g.beginPath(); g.arc(0, -6 * u, 22 * u, Math.PI * 0.15, Math.PI * 0.85);
    drag(g, 3 * u, '#8c6626');
    // Ringar: en per skadeniva, guld pa mastarnivaerna.
    for (let i = 0; i < 2 + Math.min(5, niva.damageLevel); i++) {
      g.beginPath(); g.arc(0, -6 * u, (18 - i * 2.6) * u, 0, Math.PI * 2);
      drag(g, 1.4 * u, i >= 5 ? GULD : '#8c6626');
    }
    g.beginPath(); g.arc(0, -6 * u, 6 * u, 0, Math.PI * 2); fyll(g, GULD, INK, 1.8 * u);
    g.beginPath(); g.arc(-2.5 * u, -9 * u, 2 * u, 0, Math.PI * 2); fyll(g, '#fdf0c8');
    // Klubban hanger pa ramen.
    g.beginPath(); g.moveTo(25 * u, -26 * u); g.lineTo(30 * u, -6 * u); drag(g, 2.4 * u, '#7d5a3a');
    g.beginPath(); g.arc(30.5 * u, -3 * u, 4.6 * u, 0, Math.PI * 2); fyll(g, '#e4d2ad', INK, 1.6 * u);
    temastare(g, u, -33 * u, 6 * u, 0.74, LACK_DJUP);
  }

  const RITARE = { tebryggaren, sojasprutan, wokmastaren, gonggongen };

  function har(id) { return Object.prototype.hasOwnProperty.call(RITARE, id); }
  function rita(g, id, x, y, size, niva) {
    const ritare = RITARE[id]; if (!ritare) return false;
    const u = size / 100;
    g.save(); g.translate(x, y);
    g.fillStyle = '#10201548';
    g.beginPath(); g.ellipse(0, 26 * u, 30 * u, 9 * u, 0, 0, Math.PI * 2); g.fill();
    ritare(g, u, { damageLevel: niva?.damageLevel || 0, rangeLevel: niva?.rangeLevel || 0,
      speedLevel: niva?.speedLevel || 0 });
    g.restore();
    return true;
  }
  return { har, rita, RITARE };
})();
