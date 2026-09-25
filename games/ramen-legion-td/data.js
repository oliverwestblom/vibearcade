// Legion TD Vibe – samlad balansdata. Allt som kan behöva justeras efter
// provspelning bor här, så game.js bara läser värden.
const LTD = (() => {
  const DIFFICULTIES = {
    low: {name:'Low', health:0.75, speed:0.9, description:'25 % mindre fiendehälsa och 10 % långsammare fiender.'},
    medium: {name:'Medium', health:1, speed:1, description:'Originalbalansen: normal fiendehälsa och hastighet.'},
    high: {name:'High', health:1.35, speed:1.1, description:'35 % mer fiendehälsa och 10 % snabbare fiender.'}
  };
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
  // Expand orthogonal waypoints to cells so drawing, placement and movement agree.
  function route(points) {
    const cells = [{ kol: points[0][0], rad: points[0][1] }];
    for (const [kol, rad] of points.slice(1)) {
      const last = cells[cells.length - 1];
      if (kol !== last.kol && rad !== last.rad) throw new Error('Diagonal map segment');
      let x = last.kol, y = last.rad;
      while (x !== kol || y !== rad) {
        x += Math.sign(kol - x); y += Math.sign(rad - y);
        cells.push({ kol: x, rad: y });
      }
    }
    return cells;
  }
  const MAPS = [
    { id: 'bamboo', name: 'Bambulunden', difficulty: 'Lugn start', landscape: -1,
      description: 'En grön trädgård med långa slingor. Många chanser att stoppa fienderna.',
      tip: 'Bygg mellan två stigar så kan samma torn täcka båda.',
      colors: ['#827b56', '#b6a77a', '#c9b88a', '#bdac80', '#786e4d88'], path: byggBana() },
    { id: 'snow', name: 'Frostpasset', difficulty: 'Medelsvår', landscape: 0,
      description: 'Snötäckta berg och isblå sten. Stigen viker genom snäva hårnålskurvor.',
      tip: 'Kanoner trivs vid kurvorna; lång räckvidd täcker passets lodräta sträckor.',
      colors: ['#587a91', '#b4d8e7', '#deeff4', '#c1dce9', '#61879e99'],
      path: route([[0,0],[3,0],[3,3],[0,3],[0,6],[5,6],[5,1],[8,1],[8,6],[11,6],[11,7],[8,7],[8,8]]) },
    { id: 'desert', name: 'Solravinen', difficulty: 'Medelsvår', landscape: 1,
      description: 'Sandstensklippor, varm sand och en vidsträckt krok runt ravinen.',
      tip: 'Nudelskyttar når över öppna ytor. Fördela försvaret längs den långa ytterkanten.',
      colors: ['#936447', '#dba367', '#f0c58b', '#e5b67a', '#9c704b99'],
      path: route([[0,4],[0,0],[10,0],[10,3],[3,3],[3,6],[0,6],[0,8],[8,8]]) },
    { id: 'volcano', name: 'Glödkratern', difficulty: 'Utmanande', landscape: 2,
      description: 'Mörk basalt och glödande lava. Den kortare sicksackvägen ger mindre tid att skjuta.',
      tip: 'Kombinera Iskockens broms med hög eldhastighet vid de centrala svängarna.',
      colors: ['#342b42', '#63546b', '#89778d', '#75637d', '#f08b5177'],
      path: route([[0,1],[8,1],[8,3],[2,3],[2,5],[11,5],[11,7],[6,7],[6,8],[8,8]]) }
  ];
  let activeMap = MAPS[0];
  let BANA_NYCKLAR = new Set(activeMap.path.map(r => `${r.kol},${r.rad}`));
  function setMap(id) {
    const map = MAPS.find(m => m.id === id);
    if (!map) return false;
    activeMap = map;
    BANA_NYCKLAR = new Set(map.path.map(r => `${r.kol},${r.rad}`));
    return true;
  }
  function arBana(kol, rad) { return BANA_NYCKLAR.has(`${kol},${rad}`); }
  function antalByggrutor() { return GRID_KOL * GRID_RAD - BANA_NYCKLAR.size; }
  const KUNG_RUTA = { kol: 10.5, rad: GRID_RAD - 1 };

  // Tva klasser. Nudelkoket ar de malade grundtornen; Tehuset ar ritade for
  // hand i porslin och jade och har helt egna stridsmekaniker.
  const NUDELKOKET = [
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
  // Tehuset ritas i kod (vektor: true) och laddar darfor inga bildatlaser.
  const TEHUSET = [
    { id: 'tebryggaren', namn: 'Tebryggaren', pris: 280, skada: 34, intervall: 1.4, rackvidd: 3.4,
      vektor: true, kedja: { hopp: 3, andel: 0.6, radie: 2.2 },
      roll: 'Kokhett te hoppar mellan fiender' },
    { id: 'sojasprutan', namn: 'Sojasprutan', pris: 230, skada: 6, intervall: 1.0, rackvidd: 3.0,
      vektor: true, gift: { perSekund: 16, tid: 3 },
      roll: 'Marinad som fratar genom pansar' },
    { id: 'wokmastaren', namn: 'Wokmastaren', pris: 340, skada: 20, intervall: 0.9, rackvidd: 1.9,
      vektor: true, virvel: true,
      roll: 'Traffar allt inom sin korta radie' },
    { id: 'gonggongen', namn: 'Gonggongen', pris: 300, skada: 10, intervall: 2.0, rackvidd: 2.8,
      vektor: true, svaghet: { andel: 0.25 },
      roll: 'Sarbarhet: fiender intill tar +25 % skada' },
    { id:'matchaskytt', namn:'Matchaskytt', pris:120, skada:18, intervall:.65, rackvidd:4,
      extraArt:0, burstEvery:4, roll:'Snabb precisionseld, dubbel skada var fjärde attack' },
    { id:'lotusfontan', namn:'Lotusfontän', pris:180, skada:9, intervall:1.1, rackvidd:3,
      extraArt:1, omrade:.6, kyla:{andel:.4,bossAndel:.15,tid:2}, roll:'Bromsar grupper med lotuskristaller' }
  ];
  const ARKAN = [
    { id:'stormspire', namn:'Stormspira', pris:280, skada:32, intervall:1.3, rackvidd:3.4,
      artColumn:0, kedja:{hopp:2,radie:2.1,andel:.7}, roll:'Kedjeblixt mot täta grupper' },
    { id:'prismsentinel', namn:'Prismaväktare', pris:320, skada:85, intervall:1.8, rackvidd:4.8,
      artColumn:1, armorPierce:.6, roll:'Kristallskott som ignorerar 60 % av pansaret' },
    { id:'gravityshrine', namn:'Gravitationsaltare', pris:300, skada:22, intervall:1.7, rackvidd:3.1,
      artColumn:2, omrade:1.4, kyla:{andel:.25,bossAndel:.1,tid:2.5}, roll:'Områdesskada och bromsande gravitationsfält' },
    { id:'runvaktare', namn:'Runväktare', pris:110, skada:17, intervall:.7, rackvidd:2.8,
      extraArt:2, roll:'Billig och snabb runskytt' },
    { id:'observatorium', namn:'Stjärnobservatorium', pris:250, skada:10, intervall:1.8, rackvidd:3.2,
      extraArt:3, stod:{skada:.25,rackvidd:.15}, roll:'Stjärnaura stärker närliggande torn' },
    { id:'solfyr', namn:'Solfyr', pris:240, skada:32, intervall:1.25, rackvidd:3.2,
      extraArt:4, omrade:1.1, healBlock:3, roll:'Solexplosioner blockerar fiendeläkning' }
  ];
  const KLASSER = [
    { id: 'nudelkoket', namn: 'Nudelköket', kort: 'Koket',
      beskrivning: 'Målade grundtorn: ren skada, sprängradie, broms och stöd.',
      enheter: NUDELKOKET },
    { id: 'tehuset', namn: 'Tehuset', kort: 'Tehuset',
      beskrivning: 'Porslin och jade: kedjor, gift, virvlar och sårbarhet.',
      enheter: TEHUSET },
    { id:'arkan', namn:'Arkana orden', kort:'Arkan', beskrivning:'Kristaller och runor: kedjeblixt, pansarjakt och gravitationsfält.', enheter:ARKAN }
  ];
  const ENHETER = KLASSER.flatMap(k => k.enheter);
  const KLASS_AV = Object.fromEntries(KLASSER.flatMap(k => k.enheter.map(e => [e.id, k])));
  const ENHET = Object.fromEntries(ENHETER.map(e => [e.id, e]));

  // Fiender går längs banan och kan inte skada torn.
  const FIENDETYPER = {
    standard: { namn: 'Standard', halsa: 1, fart: 1, belaning: 1, farg: '#b9a0ff', r: 13, ruta: 0 },
    snabb: { namn: 'Snabb', halsa: 0.7, fart: 1.8, belaning: 1, farg: '#8de06a', r: 11, ruta: 1 },
    svarm: { namn: 'Svärm', halsa: 0.45, fart: 1.2, belaning: 0.5, farg: '#ffe08a', r: 9, ruta: 2 },
    pansrad: { namn: 'Pansrad', halsa: 1.5, fart: 0.8, belaning: 1.5, farg: '#9aa7c7', r: 15, minskadSkada: 0.25, ruta: 3 },
    elit: { namn: 'Elit', halsa: 2, fart: 1, belaning: 2, farg: '#f76fae', r: 17, ruta: 4 },
    // Soppkocken laker sina foljeslagare. Gift fran Sojasprutan bryter igenom
    // pansar, och Gonggongens sarbarhet gor lakningen otillracklig.
    helare: { namn: 'Soppkock', halsa: 1.3, fart: 0.85, belaning: 2, farg: '#7fe3a6', r: 15, ruta: 4,
      hela: { andel: 0.06, radie: 1.6, intervall: 1.2 } },
    boss: { namn: 'Boss', halsa: 12, fart: 0.7, belaning: 10, farg: '#ff4f8b', r: 30, liv: 5, boss: true }
  };

  const BOSSNAMN = { 5: 'Diskmonstret', 10: 'Chilikrabban', 15: 'Soppdraken', 20: 'Den Hungrige Kocken' };

  // Bosspaket. Ges bara nar bossen faktiskt dodas, och alltid samma tre val
  // per vag sa att en match gar att spela om och testa likadant.
  // 'tecken' = mastartecken som laser upp niva 4-6, 'krydda' = permanent global
  // forstarkning, 'ramen' och 'liv' ar engangsbelopp.
  const BOSSPAKET = {
    5: [
      { id: 'tecken2', namn: 'Bosssigill ×2', typ: 'tecken', antal: 2,
        text: 'Två sigill. Varje sigill används tillsammans med Ramen för en uppgradering till nivå 4, 5 eller 6 på valfritt torn.' },
      { id: 'hetta', namn: 'Chilihetta', typ: 'krydda', falt: 'skada', andel: 0.12,
        text: '+12 % skada för varje torn du har nu och bygger sedan. Gäller resten av matchen.' },
      { id: 'ramenregn', namn: 'Ramenregn', typ: 'ramen', antal: 700,
        text: '700 Ramen direkt. Räntan nästa våg räknas på det högre saldot.' }
    ],
    10: [
      { id: 'tecken2', namn: 'Bosssigill ×2', typ: 'tecken', antal: 2,
        text: 'Två sigill till mästarnivåerna. Spara dem till tornet du satsar på.' },
      { id: 'sikte', namn: 'Långsikte', typ: 'krydda', falt: 'rackvidd', andel: 0.12,
        text: '+12 % räckvidd för alla torn. Förstorar även munkens aura och gongens sårbarhet.' },
      { id: 'kockar', namn: 'Nya kockar', typ: 'liv', antal: 4,
        text: '+4 kungaliv. Bra om läckorna redan har kostat dig marginal.' }
    ],
    15: [
      { id: 'tecken3', namn: 'Bosssigill ×3', typ: 'tecken', antal: 3,
        text: 'Tre sigill. Räcker från nivå 3 till 6 på ett spår.' },
      { id: 'vasskniv', namn: 'Vass kniv', typ: 'krydda', falt: 'fart', andel: 0.15,
        text: '+15 % eldhastighet för alla torn. Samma skada per träff, fler träffar.' },
      { id: 'tacksamhet', namn: 'Tacksamma gäster', typ: 'krydda', falt: 'belaning', andel: 0.3,
        text: '+30 % Ramen från varje dödad fiende. Ökar nästa vågs möjliga ränteunderlag.' }
    ]
  };

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
      // The expedition keeps growing, but limited mastery seals need a gentler curve.
      halsa: Math.round(45 * Math.pow(TILLVAXT.halsa, Math.min(w,20) - 1) * Math.pow(1.1, Math.max(0,w-20))),
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
      liv: t.liv || 1,
      ruta: t.ruta === undefined ? 0 : t.ruta,
      hela: t.hela || null
    };
  }

  // Deterministisk vågkomposition: samma våg ger alltid samma fiender.
  function vag(w, difficulty = 'medium') {
    const settings = DIFFICULTIES[difficulty];
    if (!settings) throw new Error('Unknown difficulty');
    const bas = basvarden(w);
    const cycle = ((w - 1) % ANTAL_VAGOR) + 1;
    const schema = SCHEMA[cycle];
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
      kon.push(gorFiende('boss', bas, cycle === 20 ? 1.5 : 1));
    } else if (eskortTyp === 'svarm') {
      laggTill('svarm', bas.vanligt * 2);
    } else if (eskortTyp === 'elit') {
      laggTill('elit', Math.ceil(bas.vanligt / 2));
    } else if (eskortTyp === 'blandat') {
      laggBlandat(bas.vanligt);
    } else {
      laggTill(eskortTyp, bas.vanligt);
    }
    // Fran vag 16 foljer soppkockar med. De spawnar efter bossen men ar
    // snabbare, sa de hinner upp koen och laker den underifran.
    if (w >= 16) laggTill('helare', w >= 19 ? 3 : 2);
    for (const enemy of kon) {
      enemy.maxHalsa = Math.max(1, Math.round(enemy.maxHalsa * settings.health));
      enemy.fart *= settings.speed;
    }
    bas.halsa = Math.max(1, Math.round(bas.halsa * settings.health));
    return { nummer: w, bas, kon, harBoss, bossnamn: harBoss ? BOSSNAMN[cycle] + (w > 20 ? ' · Uppväckt' : '') : null,
      typer: schema, paket: harBoss ? (BOSSPAKET[cycle] || BOSSPAKET[15]) : null };
  }

  function vagText(w) {
    const v = vag(w);
    const raknare = {};
    for (const f of v.kon) raknare[f.namn] = (raknare[f.namn] || 0) + 1;
    return Object.entries(raknare).map(([n, a]) => `${a}× ${n}`).join(', ');
  }

  return {
    DIFFICULTIES, START_RAMEN, TAK, START_LIV, RANTA_PROCENT, ANTAL_VAGOR, STRID_MAX, NEDRAKNING,
    GRID_KOL, GRID_RAD, FORSALJNING_ANDEL,
    ENHETER, ENHET, KLASSER, KLASS_AV, FIENDETYPER, BOSSNAMN, BOSSPAKET, TILLVAXT,
    vag, vagText, basvarden, BILDMAPP: 'bilder/',
    MAPS, setMap, get activeMap() { return activeMap; }, get BANA() { return activeMap.path; }, arBana, antalByggrutor, KUNG_RUTA
  };
})();
