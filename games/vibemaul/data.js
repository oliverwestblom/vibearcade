// Vibemaul – all balansdata. Motorn (sim.js) laser bara harifran, sa allt som
// behover justeras efter provspelning bor i den har filen.
const VM_DATA = (() => {
  const KOL = 30, RAD = 10;
  const START_GULD = 75;
  const START_LIV = 30;
  const ANTAL_VAGOR = 40;
  const SALJ_ANDEL = 0.75;
  // Kalibrerad mot korridorens sicksack (ca 115 rutor) i tests/bot.cjs.
  const HALSA_FAKTOR = 0.45;

  // En enda karta: en lang rak korridor fran vanster till hoger. Hela ytan
  // utom start och port gar att bygga pa. Motorn stodjer checkpoints och
  // stenar, men korridoren anvander inga.
  const KARTOR = [
    { id: 'korridoren', namn: 'Frostkorridoren',
      beskrivning: 'En lång, rak korridor. Utan torn går fienderna rakt fram – med torn går de dit du vill.',
      tips: 'Bygg väggar tvärs över korridoren med en lucka i varannan ände, så måste de sicksacka hela vägen.',
      start: { kol: 0, rad: 4 }, checkpoints: [], mal: { kol: 29, rad: 4 }, stenar: [],
      farger: { mark: '#1d2a3a', rutnat: '#26364a', sten: '#51627a', stenKant: '#7c90ab' } }
  ];

  // Attacktyp mot pansartyp, forenklad WC3-tabell.
  const TYPTABELL = {
    vanlig:     { latt: 1.0,  medel: 1.5,  tung: 1.0, befast: 0.7,  oskyddad: 1.0 },
    genomtrang: { latt: 2.0,  medel: 0.75, tung: 1.0, befast: 0.35, oskyddad: 1.5 },
    belagring:  { latt: 1.0,  medel: 0.5,  tung: 1.0, befast: 1.5,  oskyddad: 1.5 },
    magi:       { latt: 1.25, medel: 0.75, tung: 2.0, befast: 0.35, oskyddad: 1.0 },
    kaos:       { latt: 1.0,  medel: 1.0,  tung: 1.0, befast: 1.0,  oskyddad: 1.0 }
  };
  const ATTACKNAMN = { vanlig: 'Vanlig', genomtrang: 'Genomträng', belagring: 'Belägring', magi: 'Magi', kaos: 'Kaos' };
  const PANSARNAMN = { latt: 'Lätt', medel: 'Medel', tung: 'Tung', befast: 'Befäst', oskyddad: 'Oskyddad' };

  // Uppgraderingskedjor som i Wintermaul: man bygger bara rasens forsta torn
  // (vaggen). Varje uppgradering gor om tornet till nasta torn i listan.
  // Listorna ar ordnade med starkast sist, och sista steget kraver en
  // frostkristall. Skadan vaxer fran 1x till kurva.skada x langs kedjan
  // (exponentiellt, form > 1 = svagare tidigt och brantare mot slutet), och
  // uppgraderingspriset ar nasta torns pris x kurva.kostnad^position.
  const KURVA = { skada: 11.5, kostnad: 8, form: 1 };

  // mal: 'mark' | 'luft' | 'bada'. rackvidd och omrade ar i rutor.
  // luftSkada: multipel mot flygare (luftvarnstorn traffar aven mark).
  const BYGGARE = [
    { id: 'frost', namn: 'Frostvakten', farg: '#7fe3ff', beskrivning: 'Broms och belägring. Stark mot befästa vågor.', torn: [
      { id: 'iskloss', namn: 'Iskloss', pris: 5, skada: 4, intervall: 1.0, rackvidd: 2.2, attack: 'vanlig', mal: 'bada', roll: 'Billig vägg som också skjuter.' },
      { id: 'frostbage', namn: 'Frostbåge', pris: 20, skada: 13, intervall: 0.9, rackvidd: 4.0, attack: 'genomtrang', mal: 'bada', roll: 'Lång räckvidd, träffar luft.' },
      { id: 'snostorm', namn: 'Snöstormsspira', pris: 35, skada: 12, intervall: 1.2, rackvidd: 3.0, attack: 'magi', mal: 'bada', omrade: 0.9, kyla: { andel: 0.35, tid: 2 }, roll: 'Bromsar grupper, träffar luft. Biter inte på magiimmuna.' },
      { id: 'glaciarkanon', namn: 'Glaciärkanon', pris: 40, skada: 30, intervall: 1.8, rackvidd: 3.4, attack: 'belagring', mal: 'mark', omrade: 1.0, roll: 'Mästartorn: sprängskada. Kan inte skjuta på luft.' }
    ] },
    { id: 'eld', namn: 'Eldsmeden', farg: '#ffb18b', beskrivning: 'Hög skada och kaos. Svag mot luft.', torn: [
      { id: 'glodsten', namn: 'Glödsten', pris: 5, skada: 5, intervall: 1.1, rackvidd: 2.2, attack: 'vanlig', mal: 'bada', roll: 'Billig vägg som också skjuter.' },
      { id: 'pilgnista', namn: 'Pilgnista', pris: 20, skada: 10, intervall: 0.7, rackvidd: 3.6, attack: 'genomtrang', mal: 'bada', roll: 'Snabba pilar, bra mot lätt pansar. Träffar luft.' },
      { id: 'mortel', namn: 'Mortel', pris: 35, skada: 30, intervall: 2.2, rackvidd: 4.0, attack: 'belagring', mal: 'mark', omrade: 1.2, roll: 'Stor sprängradie. Bara mark.' },
      { id: 'lavaspira', namn: 'Lavaspira', pris: 45, skada: 28, intervall: 1.3, rackvidd: 3.2, attack: 'kaos', mal: 'mark', roll: 'Mästartorn: kaos, 100 % mot allt pansar. Bara mark.' }
    ] },
    { id: 'natur', namn: 'Naturväktaren', farg: '#8de06a', beskrivning: 'Gift, rötter och luftvärn.', torn: [
      { id: 'tornbuske', namn: 'Törnbuske', pris: 5, skada: 4, intervall: 0.9, rackvidd: 2.0, attack: 'vanlig', mal: 'bada', roll: 'Billig vägg som också skjuter.' },
      { id: 'ekskytt', namn: 'Ekskytt', pris: 20, skada: 12, intervall: 1.0, rackvidd: 4.4, attack: 'genomtrang', mal: 'bada', luftSkada: 2.5, roll: 'Luftvärn: 2,5× skada mot flygare.' },
      { id: 'giftblomma', namn: 'Giftblomma', pris: 30, skada: 6, intervall: 1.0, rackvidd: 3.0, attack: 'magi', mal: 'bada', gift: { perSekund: 10, tid: 3 }, roll: 'Gift som fortsätter skada. Magi, träffar luft.' },
      { id: 'rotfalla', namn: 'Rotfälla', pris: 40, skada: 20, intervall: 1.2, rackvidd: 2.8, attack: 'vanlig', mal: 'mark', omrade: 0.9, kyla: { andel: 0.3, tid: 1.5 }, roll: 'Mästartorn: bromsar även magiimmuna. Bara mark.' }
    ] },
    { id: 'storm', namn: 'Stormkallaren', farg: '#b9a0ff', beskrivning: 'Kedjeblixtar och vind. Stark mot tungt pansar.', torn: [
      { id: 'gnista', namn: 'Gnista', pris: 5, skada: 5, intervall: 1.0, rackvidd: 2.4, attack: 'magi', mal: 'bada', roll: 'Billig vägg med magiskott.' },
      { id: 'vindtorn', namn: 'Vindtorn', pris: 20, skada: 11, intervall: 0.8, rackvidd: 4.2, attack: 'genomtrang', mal: 'bada', luftSkada: 2.5, roll: 'Luftvärn: 2,5× skada mot flygare. Inte magi.' },
      { id: 'kedjespira', namn: 'Kedjespira', pris: 30, skada: 15, intervall: 1.2, rackvidd: 3.4, attack: 'magi', mal: 'bada', kedja: { hopp: 3, andel: 0.7, radie: 2 }, roll: 'Blixten hoppar mellan tre fiender.' },
      { id: 'askaltare', namn: 'Åskaltare', pris: 40, skada: 42, intervall: 2.0, rackvidd: 3.2, attack: 'kaos', mal: 'mark', omrade: 1.0, roll: 'Mästartorn: tungt kaosnedslag. Bara mark.' }
    ] },
    // Narstrid: slar direkt (ingen projektil) pa fiender i rutorna intill.
    { id: 'berg', namn: 'Bergsklanen', farg: '#d9a066', beskrivning: 'Närstrid. Slår hårt på allt som går tätt förbi.', torn: [
      { id: 'bergvagg', namn: 'Bergvägg', pris: 5, skada: 5, intervall: 1.0, rackvidd: 1.3, attack: 'vanlig', mal: 'mark', narstrid: true, roll: 'Vägg som slår på fiender i rutorna intill.' },
      { id: 'stenslunga', namn: 'Stenslunga', pris: 15, skada: 11, intervall: 0.9, rackvidd: 4.0, attack: 'vanlig', mal: 'bada', luftSkada: 2.5, roll: 'Klanens enda skytt: 2,5× skada mot flygare. Nödvändig mot flygvågor.' },
      { id: 'stenknytnave', namn: 'Stenknytnäve', pris: 25, skada: 18, intervall: 1.0, rackvidd: 1.3, attack: 'vanlig', mal: 'mark', narstrid: true, bossSkada: 1.4, roll: 'Enormt slag i närstrid. +40 % mot bossar.' },
      { id: 'klyvarjatte', namn: 'Klyvarjätte', pris: 35, skada: 16, intervall: 1.2, rackvidd: 1.3, attack: 'vanlig', mal: 'mark', narstrid: true, omrade: 0.9, roll: 'Svingar yxan och träffar hela klungan.' },
      { id: 'jordskalv', namn: 'Jordskalv', pris: 45, skada: 15, intervall: 1.6, rackvidd: 1.7, attack: 'kaos', mal: 'mark', narstrid: true, virvel: true, kyla: { andel: 0.2, tid: 1 }, roll: 'Mästartorn: stampar och bromsar allt runt sig.' }
    ] },
    // Synergi: varje liknande torn inom radien ger mer skada.
    { id: 'tvilling', namn: 'Tvillingorden', farg: '#ffd166', beskrivning: 'Synergi. Svaga ensamma, starka i klungor.', torn: [
      { id: 'spegelsten', namn: 'Spegelsten', pris: 5, skada: 3, intervall: 1.0, rackvidd: 2.2, attack: 'magi', mal: 'bada', synergi: { radie: 1.5, perTorn: 0.15, max: 4, samma: 'byggare' }, roll: 'Vägg. +15 % skada per ordenstorn intill.' },
      { id: 'tvillingpil', namn: 'Tvillingpil', pris: 18, skada: 8, intervall: 0.8, rackvidd: 3.4, attack: 'genomtrang', mal: 'bada', synergi: { radie: 1.5, perTorn: 0.25, max: 4, samma: 'byggare' }, roll: '+25 % skada per ordenstorn intill (max +100 %).' },
      { id: 'solkor', namn: 'Solkör', pris: 35, skada: 16, intervall: 1.3, rackvidd: 3.0, attack: 'magi', mal: 'bada', omrade: 0.8, synergi: { radie: 2.3, perTorn: 0.12, max: 6, samma: 'byggare' }, roll: '+12 % per ordenstorn inom 2 rutor (max +72 %).' },
      { id: 'stjarnkarna', namn: 'Stjärnkärna', pris: 50, skada: 40, intervall: 1.8, rackvidd: 3.6, attack: 'kaos', mal: 'bada', synergi: { radie: 2.6, perTorn: 0.1, max: 8, samma: 'byggare' }, roll: 'Mästartorn: kaos. +10 % per ordenstorn inom 2,5 rutor (max +80 %).' }
    ] },
    // Rackvidd och luftvarn: langa skott som tacker flera gangar i labyrinten.
    { id: 'kristall', namn: 'Kristallväktarna', farg: '#cfe8ff', beskrivning: 'Räckvidd och luftvärn. Skjuter över flera gångar.', torn: [
      { id: 'kristallvagg', namn: 'Kristallvägg', pris: 6, skada: 4, intervall: 1.1, rackvidd: 3.2, attack: 'genomtrang', mal: 'bada', roll: 'Vägg med ovanligt lång räckvidd.' },
      { id: 'splitterspira', namn: 'Splitterspira', pris: 25, skada: 9, intervall: 1.1, rackvidd: 4.5, attack: 'magi', mal: 'bada', multiskott: 3, roll: 'Skjuter på tre fiender samtidigt.' },
      { id: 'prismaskytt', namn: 'Prismaskytt', pris: 35, skada: 30, intervall: 1.6, rackvidd: 6.0, attack: 'genomtrang', mal: 'bada', roll: 'Prickskytt: räckvidd 6 täcker många gångar.' },
      { id: 'himlaglans', namn: 'Himlaglans', pris: 45, skada: 26, intervall: 1.0, rackvidd: 5.0, attack: 'genomtrang', mal: 'bada', multiskott: 2, luftSkada: 2, roll: 'Mästartorn: två mål per salva, dubbel skada mot flygare.' }
    ] },
    // Billig: allt kostar lite och saljs for 90 %. Kraftverket ger fart at grannar.
    { id: 'skrot', namn: 'Skrotverkstan', farg: '#b8c2d6', beskrivning: 'Billig och flexibel. Kraftverk snabbar upp alla torn intill.', kurva: { kostnad: 6 }, torn: [
      { id: 'skrothog', namn: 'Skrothög', pris: 3, skada: 3, intervall: 1.0, rackvidd: 2.0, attack: 'vanlig', mal: 'bada', saljAndel: 0.9, roll: 'Billigaste väggen i spelet.' },
      { id: 'nitpistol', namn: 'Nitpistol', pris: 12, skada: 6, intervall: 0.6, rackvidd: 3.0, attack: 'genomtrang', mal: 'bada', saljAndel: 0.9, roll: 'Billig kulspruta. Träffar luft.' },
      { id: 'kraftverk', namn: 'Kraftverk', pris: 25, skada: 0, intervall: 1, rackvidd: 2.5, attack: 'vanlig', mal: 'bada', stod: true, aura: { fart: 0.2 }, saljAndel: 0.9, roll: 'Skjuter inte. +40 % takt åt ALLA torn inom räckvidden, även andra rasers.' },
      { id: 'krutkanon', namn: 'Krutkanon', pris: 30, skada: 24, intervall: 2.0, rackvidd: 3.4, attack: 'belagring', mal: 'mark', omrade: 1.0, saljAndel: 0.9, roll: 'Mästartorn: billig sprängkanon. Bara mark.' }
    ] },
    // Sen styrka: brantare kurva, svag tidigt men starkast av alla i toppen.
    { id: 'djup', namn: 'Djupets kallare', farg: '#4f8cff', beskrivning: 'Sen styrka. Svag tidigt, våldsam som mästartorn.', kurva: { skada: 22, form: 1.8 }, torn: [
      { id: 'korallvagg', namn: 'Korallvägg', pris: 5, skada: 4, intervall: 1.0, rackvidd: 2.0, attack: 'magi', mal: 'bada', roll: 'Enkel vägg.' },
      { id: 'djuphavsoga', namn: 'Djuphavsöga', pris: 20, skada: 14, intervall: 1.0, rackvidd: 4.4, attack: 'genomtrang', mal: 'bada', luftSkada: 2.5, roll: 'Luftvärn: 2,5× skada mot flygare.' },
      { id: 'tidvatten', namn: 'Tidvattenspira', pris: 30, skada: 13, intervall: 1.0, rackvidd: 3.2, attack: 'magi', mal: 'bada', omrade: 0.9, roll: 'Vågor som träffar klungor, även i luften.' },
      { id: 'valkalla', namn: 'Valkalla', pris: 45, skada: 22, intervall: 1.6, rackvidd: 3.5, attack: 'kaos', mal: 'mark', omrade: 1.3, kyla: { andel: 0.25, tid: 1.5 }, roll: 'Mästartorn: kaosvåg som bromsar, 22× grundskada. Bara mark.' }
    ] }
  ];
  // Profil for varje byggare: stilbrickor, styrkor och svagheter som visas i
  // valet och i butiken.
  const PROFIL = {
    frost: { stil: ['BROMS', 'BELÄGRING'], bra: 'Befästa vågor och snabba fiender som måste bromsas.', svag: 'Mästartornet (kanonen) kan inte skjuta på flygare – låt några stanna som bågar.' },
    eld: { stil: ['SKADA', 'KAOS'], bra: 'Rå skada och kaos som biter på allt pansar.', svag: 'Bara Pilgnistan träffar luft.' },
    natur: { stil: ['GIFT', 'LUFTVÄRN'], bra: 'Gift och luftvärn. Rotfällan bromsar även magiimmuna.', svag: 'Magiimmuna vågor tål giftet.' },
    storm: { stil: ['KEDJA', 'MAGI'], bra: 'Täta grupper och tungt pansar, där blixten studsar.', svag: 'Befäst och magiimmunt pansar.' },
    berg: { stil: ['NÄRSTRID', 'OMRÅDE'], bra: 'Högst skada per guld och bossar. Perfekt i trånga svängar där fienderna går tätt förbi.', svag: 'Räckvidd på bara en ruta. Bara Stenslungan (steg 2) träffar flygare.' },
    tvilling: { stil: ['SYNERGI'], bra: 'Klungor av samma torn. Tio pilar i ett block slår allt annat.', svag: 'Svaga ensamma. Straffar spridda byggen.' },
    kristall: { stil: ['RÄCKVIDD', 'LUFTVÄRN'], bra: 'Lång räckvidd över flera gångar, flera mål åt gången och det bästa luftvärnet.', svag: 'Låg skada per skott mot svärmar. Genomträng tappar mot befäst.' },
    skrot: { stil: ['BILLIG', 'STÖD'], bra: 'Snabb labyrint tidigt. Allt säljs för 90 %, och Kraftverket förstärker även andra byggares torn.', svag: 'Låg toppskada. Behöver en andra byggare sent.' },
    djup: { stil: ['SEN STYRKA', 'OMRÅDE'], bra: 'Mästartornet är starkast av alla. Frostkristallerna ger mest här.', svag: 'Mycket svag de första stegen och dyr att uppgradera.' }
  };
  for (const b of BYGGARE) Object.assign(b, PROFIL[b.id]);
  // steg: tornets plats i rasens kedja (0 = vaggen). nasta: tornet det uppgraderas till.
  const TORN = Object.fromEntries(BYGGARE.flatMap(b => b.torn.map((t, i) => [t.id, { ...t, byggare: b.id, steg: i, antalSteg: b.torn.length, nasta: b.torn[i + 1] ? b.torn[i + 1].id : null }])));
  for (const b of BYGGARE) b.kurva = { ...KURVA, ...(b.kurva || {}) };
  const BYGGARE_AV = Object.fromEntries(BYGGARE.map(b => [b.id, b]));

  const BYGGLAGEN = {
    valj: { namn: 'Välj en', antal: 1, slump: false },
    dubbel: { namn: 'Dubbel', antal: 2, slump: false },
    slump: { namn: 'Slump', antal: 1, slump: true },
    dubbelslump: { namn: 'Dubbel slump', antal: 2, slump: true }
  };
  const EXTRA_BYGGARE_EFTER_VAG = 15;

  const SVARIGHET = {
    latt: { namn: 'Lätt', halsa: 0.75, fart: 0.95 },
    normal: { namn: 'Normal', halsa: 1, fart: 1 },
    svar: { namn: 'Svår', halsa: 1.35, fart: 1.08 }
  };

  // Fiendetyper. antal = multipel av vagens grundantal.
  const FIENDER = {
    normal: { namn: 'Vandrare', halsa: 1, fart: 1, antal: 1, belaning: 1, farg: '#c9d2ff', r: 0.28, spawn: 0.8 },
    snabb: { namn: 'Löpare', halsa: 0.7, fart: 1.7, antal: 1, belaning: 1, farg: '#8de06a', r: 0.24, spawn: 0.6 },
    svarm: { namn: 'Svärm', halsa: 0.4, fart: 1.15, antal: 2, belaning: 0.5, farg: '#ffe08a', r: 0.18, spawn: 0.35 },
    tung: { namn: 'Koloss', halsa: 1.9, fart: 0.75, antal: 0.7, belaning: 1.5, farg: '#9aa7c7', r: 0.34, spawn: 1.1 },
    flyg: { namn: 'Isvråk', halsa: 0.9, fart: 1.1, antal: 0.8, belaning: 1.2, farg: '#9fd8ff', r: 0.26, spawn: 0.8, luft: true },
    immun: { namn: 'Runbärare', halsa: 1.0, fart: 1, antal: 0.8, belaning: 1.2, farg: '#f76fae', r: 0.28, spawn: 0.8, immunMagi: true },
    boss: { namn: 'Boss', halsa: 14, fart: 0.7, antal: 0, belaning: 20, farg: '#ff4f8b', r: 0.45, spawn: 0, boss: true, liv: 5 }
  };

  // 40 fasta vagor: [typ, pansar]. Flyg var 7:e, boss var 5:e.
  const VAGOR = [null,
    ['normal','oskyddad'], ['normal','latt'], ['snabb','latt'], ['svarm','oskyddad'], ['boss','medel'],
    ['tung','tung'], ['flyg','latt'], ['snabb','medel'], ['immun','medel'], ['boss','befast'],
    ['normal','tung'], ['svarm','latt'], ['tung','befast'], ['flyg','medel'], ['boss','tung'],
    ['snabb','latt'], ['immun','tung'], ['svarm','medel'], ['normal','befast'], ['boss','medel'],
    ['flyg','latt'], ['tung','tung'], ['snabb','befast'], ['svarm','oskyddad'], ['boss','befast'],
    ['immun','latt'], ['normal','medel'], ['flyg','tung'], ['tung','befast'], ['boss','tung'],
    ['snabb','medel'], ['svarm','tung'], ['immun','befast'], ['normal','latt'], ['flyg','medel'],
    ['tung','medel'], ['snabb','tung'], ['immun','medel'], ['svarm','befast'], ['boss','befast']
  ];
  const BOSSNAMN = { 5: 'Snöjätten', 10: 'Frostbjörnen', 15: 'Isormen', 20: 'Vinterhäxan', 25: 'Glaciärkungen',
    30: 'Nordanvinden', 35: 'Polarfursten', 40: 'Hertig Frostmaul' };

  function grundHalsa(w) {
    const bas = HALSA_FAKTOR * 26 * Math.pow(1.125, Math.min(w, 40) - 1) + 6 * w;
    return w > 40 ? bas * Math.pow(1.09, w - 40) : bas;
  }
  function grundAntal(w) { return 12 + Math.floor(w / 5); }
  function grundBelaning(w) { return 1 + Math.floor(w / 6); }
  function vagBonus(w) { return 8 + w; }

  // Deterministisk vagkomposition. w > 40 cyklar om med hogre halsa.
  function vag(w, svarighet = 'normal') {
    const s = SVARIGHET[svarighet];
    if (!s) throw new Error('Okänd svårighet');
    const cykel = ((w - 1) % ANTAL_VAGOR) + 1;
    const [typ, pansar] = VAGOR[cykel];
    const t = FIENDER[typ];
    const halsa = grundHalsa(w) * s.halsa;
    const kon = [];
    const gor = (typId, extra = 1) => {
      const ft = FIENDER[typId];
      return { utseende: t.boss && typId !== 'boss' ? cykel-2 : cykel-1, typ: typId, namn: ft.namn, maxHalsa: Math.round(halsa * ft.halsa * extra), fart: 1.6 * ft.fart * s.fart,
        belaning: Math.max(1, Math.round(grundBelaning(w) * ft.belaning)), pansar, luft: !!ft.luft,
        immunMagi: !!ft.immunMagi, boss: !!ft.boss, liv: ft.liv || 1, r: ft.r, farg: ft.farg, spawn: ft.spawn };
    };
    if (t.boss) {
      const slut = cykel === 40;
      const eskort = Math.floor(grundAntal(w) / 2);
      for (let i = 0; i < eskort; i++) kon.push(gor('normal'));
      const boss = gor('boss', slut ? 3 : 1);
      boss.spawn = 1.2;
      if (slut) { boss.liv = 20; boss.r = 0.55; }
      kon.push(boss);
    } else {
      const antal = Math.max(1, Math.round(grundAntal(w) * t.antal));
      for (let i = 0; i < antal; i++) kon.push(gor(typ));
    }
    return { nummer: w, typ, pansar, luft: !!t.luft, immunMagi: !!t.immunMagi, boss: !!t.boss,
      bossnamn: t.boss ? BOSSNAMN[cykel] + (w > 40 ? ' · Återvänd' : '') : null, kon, bonus: vagBonus(w) };
  }

  return { KOL, RAD, START_GULD, START_LIV, ANTAL_VAGOR, SALJ_ANDEL, KARTOR, TYPTABELL, ATTACKNAMN, PANSARNAMN,
    KURVA, BYGGARE, BYGGARE_AV, TORN, BYGGLAGEN, EXTRA_BYGGARE_EFTER_VAG,
    SVARIGHET, FIENDER, VAGOR, BOSSNAMN, vag, grundHalsa, vagBonus };
})();
if (typeof module !== 'undefined') module.exports = VM_DATA;
