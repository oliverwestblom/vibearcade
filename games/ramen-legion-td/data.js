// Legion TD Vibe – samlad balansdata. Allt som kan behöva justeras efter
// provspelning bor här, så game.js bara läser värden.
const LTD = (() => {
  const START_RAMEN = 500;
  const TAK = 300000;
  const START_LIV = 20;
  const RANTA_PROCENT = 5;
  const ANTAL_VAGOR = 20;
  const STRID_MAX = 120;        // simuleringssekunder per våg
  const NEDRAKNING = 10;        // visa nedräkning sista sekunderna
  const GRID_KOL = 12;
  const GRID_RAD = 9;
  const FORSALJNING_ANDEL = 0.70;


  // Banan slingrar sig fram och tillbaka: raderna 0, 2, 4 och 6 ar genomgaende
  // och kopplas ihop i andarna, sista raden leder fram till kungen. Byggrutor
  // ar alla rutor som inte ar bana, alltsa raderna mellan gangarna -- man
  // bygger bredvid banan, aldrig i den.
  function byggBana() {
    const rutor = [];
    let riktning = 1;
    for (let etapp = 0; etapp < 4; etapp++) {
      const rad = etapp * 2;
      if (riktning === 1) for (let k = 0; k < GRID_KOL; k++) rutor.push({ kol: k, rad });
      else for (let k = GRID_KOL - 1; k >= 0; k--) rutor.push({ kol: k, rad });
      rutor.push({ kol: riktning === 1 ? GRID_KOL - 1 : 0, rad: rad + 1 });
      riktning = -riktning;
    }
    for (let k = 0; k <= 8; k++) rutor.push({ kol: k, rad: GRID_RAD - 1 });
    return rutor;
  }
  const BANA = byggBana();
  const BANA_NYCKLAR = new Set(BANA.map(r => `${r.kol},${r.rad}`));
  function arBana(kol, rad) { return BANA_NYCKLAR.has(`${kol},${rad}`); }
  function antalByggrutor() { return GRID_KOL * GRID_RAD - BANA_NYCKLAR.size; }
  const KUNG_RUTA = { kol: 10.5, rad: GRID_RAD - 1 };

  // Fasta torn. Alla sex har egna skott; munkens aura staplas inte.
  const ENHETER = [
    { id: 'zebravakt', namn: 'Zebravakt', pris: 100, skada: 20, intervall: 0.9, rackvidd: 2.6,
      bild: 'zebravakt.svg', roll: 'Billig allround med kort pipa' },
    { id: 'nudelskytt', namn: 'Nudelskytt', pris: 150, skada: 55, intervall: 1.6, rackvidd: 6.0,
      bild: 'nudelskytt.svg', roll: 'Prickskytt, ser langt langs banan' },
    { id: 'buljongtank', namn: 'Buljongkanon', pris: 220, skada: 40, intervall: 1.5, rackvidd: 3.0,
      omrade: 1.2, bild: 'buljongtank.svg', roll: 'Kanon med stor sprangradie' },
    { id: 'chilikastare', namn: 'Chilikastare', pris: 260, skada: 26, intervall: 0.7, rackvidd: 3.2,
      omrade: 0.9, bild: 'chilikastare.svg', roll: 'Snabb omradesskada mot svarmar' },
    { id: 'iskock', namn: 'Iskock', pris: 200, skada: 14, intervall: 1.2, rackvidd: 3.0,
      kyla: { andel: 0.35, bossAndel: 0.12, tid: 2 }, bild: 'iskock.svg', roll: 'Bromsar det den traffar' },
    { id: 'ramenmunk', namn: 'Ramenmunk', pris: 240, skada: 12, intervall: 1.5, rackvidd: 2.5,
      stod: { skada: 0.25, rackvidd: 0.15 }, bild: 'ramenmunk.svg',
      roll: 'Stod: +25 % skada och +15 % rackvidd at torn intill' }
  ];
  const ENHET = Object.fromEntries(ENHETER.map(e => [e.id, e]));

  // Fiender går längs banan och kan inte skada torn.
  const FIENDETYPER = {
    standard: { namn: 'Standard', halsa: 1, fart: 1, belaning: 1, farg: '#b9a0ff', r: 13 },
    snabb: { namn: 'Snabb', halsa: 0.7, fart: 1.8, belaning: 1, farg: '#8de06a', r: 11 },
    svarm: { namn: 'Svärm', halsa: 0.45, fart: 1.2, belaning: 0.5, farg: '#ffe08a', r: 9 },
    pansrad: { namn: 'Pansrad', halsa: 1.5, fart: 0.8, belaning: 1.5, farg: '#9aa7c7', r: 15, minskadSkada: 0.25 },
    elit: { namn: 'Elit', halsa: 2, fart: 1, belaning: 2, farg: '#f76fae', r: 17 },
    boss: { namn: 'Boss', halsa: 12, fart: 0.7, belaning: 10, farg: '#ff4f8b', r: 30, liv: 5, boss: true }
  };

  const BOSSNAMN = { 5: 'Diskmonstret', 10: 'Chilikrabban', 15: 'Soppdraken', 20: 'Den Hungrige Kocken' };

  // Vågschema enligt designdokumentet. 'boss' betyder boss + eskort av angiven typ.
  const SCHEMA = {
    1: ['standard'], 2: ['standard'], 3: ['snabb'], 4: ['svarm'],
    5: ['boss', 'standard'],
    6: ['pansrad'], 7: ['snabb'], 8: ['svarm'], 9: ['elit'],
    10: ['boss', 'pansrad'],
    11: ['standard'], 12: ['svarm'], 13: ['snabb'], 14: ['elit'],
    15: ['boss', 'snabb'],
    16: ['pansrad'], 17: ['svarm'], 18: ['elit'], 19: ['blandat'],
    20: ['boss', 'blandat']
  };
  const BLANDAT_CYKEL = ['standard', 'snabb', 'pansrad'];

  // Balansutkast för fasta torn. Se tester och README för observerade resultat.
  const TILLVAXT = { halsa: 1.16, antal: 2 };

  function basvarden(w) {
    return {
      vanligt: 8 + TILLVAXT.antal * w,
      halsa: Math.round(45 * Math.pow(TILLVAXT.halsa, w - 1)),
      belaning: 10 + 2 * w,
      fart: 1.5,
      spawn: 0.45
    };
  }

  function gorFiende(typId, bas, extraHalsa) {
    const t = FIENDETYPER[typId];
    return {
      typ: typId,
      namn: t.namn,
      maxHalsa: Math.round(bas.halsa * t.halsa * (extraHalsa || 1)),
      fart: bas.fart * t.fart,
      belaning: Math.floor(bas.belaning * t.belaning),
      r: t.r,
      farg: t.farg,
      minskadSkada: t.minskadSkada || 0,
      boss: !!t.boss,
      liv: t.liv || 1
    };
  }

  // Deterministisk vågkomposition: samma våg ger alltid samma fiender.
  function vag(w) {
    const bas = basvarden(w);
    const schema = SCHEMA[w];
    const kon = [];
    const harBoss = schema[0] === 'boss';
    const eskortTyp = harBoss ? schema[1] : schema[0];

    function laggTill(typId, antal, extraHalsa) {
      for (let i = 0; i < antal; i++) kon.push(gorFiende(typId, bas, extraHalsa));
    }
    function laggBlandat(antal) {
      for (let i = 0; i < antal; i++) kon.push(gorFiende(BLANDAT_CYKEL[i % BLANDAT_CYKEL.length], bas));
    }

    if (harBoss) {
      const antal = Math.ceil(bas.vanligt / 2);
      if (eskortTyp === 'blandat') laggBlandat(antal);
      else laggTill(eskortTyp, antal);
      // Bossen kommer sist.
      kon.push(gorFiende('boss', bas, w === 20 ? 1.5 : 1));
    } else if (eskortTyp === 'svarm') {
      laggTill('svarm', bas.vanligt * 2);
    } else if (eskortTyp === 'elit') {
      laggTill('elit', Math.ceil(bas.vanligt / 2));
    } else if (eskortTyp === 'blandat') {
      laggBlandat(bas.vanligt);
    } else {
      laggTill(eskortTyp, bas.vanligt);
    }
    return { nummer: w, bas, kon, harBoss, bossnamn: harBoss ? BOSSNAMN[w] : null, typer: schema };
  }

  function vagText(w) {
    const v = vag(w);
    const raknare = {};
    for (const f of v.kon) raknare[f.namn] = (raknare[f.namn] || 0) + 1;
    return Object.entries(raknare).map(([n, a]) => `${a}× ${n}`).join(', ');
  }

  return {
    START_RAMEN, TAK, START_LIV, RANTA_PROCENT, ANTAL_VAGOR, STRID_MAX, NEDRAKNING,
    GRID_KOL, GRID_RAD, FORSALJNING_ANDEL,
    ENHETER, ENHET, FIENDETYPER, BOSSNAMN, TILLVAXT, vag, vagText, basvarden, BILDMAPP: 'bilder/',
    BANA, arBana, antalByggrutor, KUNG_RUTA
  };
})();
