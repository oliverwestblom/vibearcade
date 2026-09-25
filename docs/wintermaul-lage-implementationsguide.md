# Wintermaul-läge för Legion TD Vibe – implementationsguide

Version 1.0 · 25 september 2026 · Projekt: `C:\work\b3vibe\games\ramen-legion-td`

Den här guiden beskriver hur Wintermaul One fungerar i Warcraft III och hur ett liknande spelläge kan byggas i Legion TD Vibe. Den utgår från koden som den ser ut i commit `15ae3a2` ("add improved legion td").

---

## 1. Vad är Wintermaul One?

Wintermaul är en av de klassiska tower defense-kartorna till WC3. Wintermaul One bygger på "Wintermaul Solo". Varje spelare försvarar sin egen del av kartan, vilket tar bort problemet med att andra spelare stjäl ens kills. Kärnan är densamma i alla versioner.

### 1.1 Kärnmekaniker

| Mekanik | Hur det fungerar i WC3 |
|---|---|
| **Mazing** | Det finns ingen fast stig. Fienderna går kortaste vägen från spawn till utgång, och dina torn *är* väggarna. En bra labyrint gör vägen flera gånger längre än den raka linjen, så varje torn hinner skjuta fler gånger. |
| **Checkpoints** | Fienderna måste passera fasta punkter på vägen (spawn → zon → zon → utgång). Du bygger alltså en labyrint mellan varje par av punkter, inte bara en enda. |
| **Blockeringsförbud** | Du får aldrig stänga vägen helt. Kartan nekar ett sådant bygge, eller säljer/tar bort det blockerande tornet automatiskt. |
| **Juggling och anti-juggle** | Juggling var ett välkänt fusk: man byggde och sålde torn under vågen så att fienderna vände fram och tillbaka i evighet. Nyare versioner har ett "anti-juggle"-system som stoppar det. |
| **Byggare (races)** | Wintermaul One har cirka 49 byggarraser med 4–6 torn var. Tornen uppgraderas i nivåer, ofta upp till tier 6. Du har upp till två byggare samtidigt. Enligt recensioner får man en tredje byggare kring våg 15. |
| **Spellägen** | All Pick, All Random, All Random Double, All Same Builder, All Pick Double och Infinite waves, plus flera svårighetsgrader. |
| **Vågor** | 30–40 vågor (beror på version) som blir svårare för varje våg. Pansartyp och element avgör vilka torn som biter. Vissa vågor är flygande och ignorerar labyrinten, vissa är immuna mot magi, och det finns bossvågor. Slutbossen heter Duke Wintermaul. |
| **Pansar mot attacktyp** | WC3:s skadetabell: torn har en attacktyp (Normal, Pierce, Siege, Magic, Chaos) och fiender en pansartyp (Light, Medium, Heavy, Fortified, Hero, Unarmored). Multiplikatorn går från 35 % till 200 %. |
| **Ekonomi** | Guld per kill, begränsat med pengar och ett ständigt val mellan att bygga nu eller spara. Topp-uppgraderingar kräver ofta lumber, en sällsynt andravaluta. |

### 1.2 Varför det känns annorlunda än Legion TD Vibe:s klassiska läge

I klassiskt läge är frågan *var tornet får bäst täckning av en fast stig*. I Wintermaul är frågan *hur tornet förlänger stigen*. Ett billigt torn på rätt ruta kan ge mer än ett dyrt torn på fel ruta. Därför bygger man ofta billiga "väggtorn" i början och byter ut dem senare.

> **Källäge:** Sammanfattningen bygger på webbsökningar. Flera primärkällor (wintermaul.one, hiveworkshop.com, epicwar.com) gick inte att nå från den här miljön. Detaljer som exakta liv, vågnummer för tredje byggaren och lumberpriser är därför ungefärliga. Designen nedan hänger inte på dem.

---

## 2. Vad som redan finns i appen

Spelet har redan ett **Maze-läge** (`mode-select` = `maze`). Det täcker grunden:

| Finns redan | Var |
|---|---|
| BFS-kortaste väg i fyra riktningar på 12×9, start `(0,4)` och mål `(11,4)` | [maze.js](../games/ramen-legion-td/maze.js) |
| Nekar bygge som stänger vägen eller stänger in en levande fiende, och drar inga Ramen | `mazePlacement()` i [game.js:242](../games/ramen-legion-td/game.js:242) |
| Levande fiender får ny rutt när tornen ändras | `refreshRoutes()` i [game.js:253](../games/ramen-legion-td/game.js:253) |
| Visar ruttens längd | `maze-info` i [game.js:623](../games/ramen-legion-td/game.js:623) |
| Försäljning bara mellan vågor, vilket redan stoppar sälj-juggling | `salj()` kräver `lage === 'bygg'` |
| Tester för rutter, blockering och omdirigering | [game.test.cjs:420-470](../games/ramen-legion-td/tests/game.test.cjs:420) |

**Vad som saknas för att det ska kännas som Wintermaul:**

1. En större yta och **checkpoints**, så att labyrinten består av flera ben.
2. Ett **anti-juggle**-system. Bygge under strid kan fortfarande få fiender att vända.
3. **Flygande vågor** som ignorerar labyrinten, och torn som inte kan träffa luft.
4. **Attacktyp och pansartyp** i en multiplikatortabell.
5. **Flera byggare** (Dubbel, Slump, tredje byggare) i stället för en låst klass.
6. Ett **längre vågschema** (40 vågor) med speciella vågor och ett oändligt läge.
7. **Balansering för långa labyrinter**. En bra maze ger 5–10 gånger mer skjuttid än nuvarande HP-kurva är gjord för.

---

## 3. Arkitektur i korthet

Följ samma uppdelning som i dag: **data i `data.js`, rena beräkningar i `rules.js` och `maze.js`, tillstånd och rendering i `game.js`.** Allt nytt som kan testas utan DOM ska ligga i de rena filerna.

```text
index.html  ── <option value="wintermaul">Wintermaul · checkpoints & luft</option>
data.js     ── LTD.WM: kartor, vågschema, pansar-/attacktyper, byggarlägen
maze.js     ── LTD_MAZE.create(layout) → { route, routeFrom, isFixed, airRoute }
rules.js    ── LTD_RULES.typeMultiplier(), hit(... attackTyp, pansarTyp), canTarget()
game.js     ── activeMode === 'wintermaul', aktiva klasser, checkpoint-index per fiende
tests/      ── nya tester för varje fas nedan
```

Lägg till `wintermaul` som **ett tredje läge** i stället för att bygga om `maze`. Då är de befintliga testerna för `maze` och `classic` kvar som ett skyddsnät.

---

## 4. Fas 1 – Större bana och checkpoints (första spelbara versionen)

### 4.1 Gör rutnätet konfigurerbart

I dag är `W = 748, H = 652, CELL = 60` konstanter ([game.js:4](../games/ramen-legion-td/game.js:4)) och `GRID_KOL/GRID_RAD = 12/9` i `data.js`. Ett rutnät på **18 × 14 med `CELL = 40`** ryms på samma canvas (18·40 + 14 = 734 ≤ 748 och 14·40 + 46 = 606 ≤ 652).

- Byt `const CELL` mot `let CELL` och sätt värdet i `playMap()` utifrån läget. Samma sak gäller `GRID_KOL/GRID_RAD`, som bör läsas från kartan och inte från `LTD`.
- Räckvidd och fart räknas redan i rutor (`rangeEff * CELL`, `f.fart * CELL`) och skalar automatiskt.
- **Skala manuellt:** fiendernas radie `r` och sprite-storlekar i `art.js`/`towers.js`, klickträffytan i canvas-hanteraren och `omrade * CELL` (skalar redan). Inför `const SKALA = CELL / 60` och multiplicera pixelstorlekar med den.
- Sök igenom `game.js` efter hårdkodade `11`, `12`, `9`, `4` och `8`. De finns bland annat i `isPath`, `refreshRoutes` och `drawMapPreview` och ska ersättas med värden från layouten.

### 4.2 Kartlayout med checkpoints

Lägg till i `data.js`:

```js
// Wintermaul-kartor: start, checkpoints som måste passeras i ordning, mål
// och fasta hinder (stenar) som varken går att bygga på eller gå igenom.
const WM_MAPS = [
  { id: 'isfallet', name: 'Isfallet', kol: 18, rad: 14, landscape: 0,
    start: { kol: 0, rad: 1 },
    checkpoints: [ { kol: 17, rad: 1 }, { kol: 0, rad: 12 } ],
    goal: { kol: 17, rad: 12 },
    rocks: [ [8,6],[9,6],[8,7],[9,7] ],      // mitten-klippa tvingar fram två zoner
    description: 'Tre ben: öst, sydväst, öst. Bygg en labyrint på varje ben.' }
];
```

Checkpoint-rutorna räknas som `isPath`, alltså obyggbara, precis som start och mål i dag.

### 4.3 Generalisera `maze.js`

Gör om `LTD_MAZE` till en fabrik. Behåll `LTD_MAZE.route()` för det gamla läget så att testerna fortsätter att fungera.

```js
const LTD_MAZE = (() => {
  const key = p => p.kol + ',' + p.rad;
  const DIRS = [[1,0],[0,-1],[0,1],[-1,0]];      // fast ordning = deterministiskt

  function bfs(from, to, blocked, cols, rows) { /* dagens route(), parametriserad */ }

  function create(layout) {
    const fixed = new Set(layout.rocks.map(([k,r]) => k + ',' + r));
    const stops = [...layout.checkpoints, layout.goal];

    // Rutt från en punkt, via alla återstående checkpoints, till målet.
    // Returnerar { cells, cpIndex[] } eller null om något ben är blockerat.
    function routeFrom(blockers, from, nextStop = 0) {
      const blocked = new Set([...fixed, ...blockers.map(key)]);
      const cells = [from], marks = [];
      let at = from;
      for (let i = nextStop; i < stops.length; i++) {
        const leg = bfs(at, stops[i], blocked, layout.kol, layout.rad);
        if (!leg) return null;
        cells.push(...leg.slice(1));
        marks.push(cells.length - 1);            // index där checkpoint i nås
        at = stops[i];
      }
      return { cells, marks };
    }
    const route = blockers => routeFrom(blockers, layout.start, 0);

    // Flygare: rak linje mellan stoppen, i pixelvärlden (se fas 3).
    const airStops = () => [layout.start, ...stops];
    return { route, routeFrom, airStops, isFixed: (k, r) => fixed.has(k + ',' + r) };
  }

  // Bakåtkompatibelt: dagens 12×9-läge.
  const legacy = create({ kol: 12, rad: 9, start: {kol:0,rad:4}, checkpoints: [], goal: {kol:11,rad:4}, rocks: [] });
  return { create, start: {kol:0,rad:4}, goal: {kol:11,rad:4},
    route: (b, from) => { const r = legacy.routeFrom(b, from || {kol:0,rad:4}); return r && r.cells; } };
})();
```

**Obs:** BFS på 18×14 = 252 rutor körs gånger (antal ben + antal levande fiender) per byggklick. Det är fortfarande under en millisekund. Ingen A* behövs.

### 4.4 Fienderna håller koll på nästa checkpoint

Varje fiende får `nextStop` (index i `stops`). I `gaBana()` ([game.js:392](../games/ramen-legion-td/game.js:392)) räknas `nextStop` upp när fienden passerar ett index i `route.marks`. I `refreshRoutes()` och `mazePlacement()` anropas sedan `routeFrom(arme, nästaRuta, f.nextStop)` i stället för `route(arme, nästaRuta)`.

**Den viktigaste buggen att undvika:** Om fienden redan har passerat checkpoint 1 och räknas om från start till checkpoint 1 igen vänder den tillbaka. Tester för just detta finns i fas 7.

`progress` används av `target()` för `first`/`last`. Beräkna den som `totalLängd − kvarvarandeLängd`, där `kvarvarandeLängd = (route.cells.length − 1 − banSteg) * CELL + avstånd till nästa punkt`. Då fortsätter "first" att betyda "närmast målet" även efter omdirigering.

### 4.5 Rendering

- Rita stenar som fasta block och checkpoints som numrerade ringar (1, 2, mål).
- Rita den aktuella rutten som en tunn streckad linje. Visa `Vägens längd: 84 rutor (rak väg: 46)` i `maze-info`, där rak väg är `route([]).cells.length − 1`.
- **Förhandsvisning vid hovring:** när spelaren håller ett torn över en ruta, kör `route([...arme, hover])` och rita den nya vägen i ett annat färgtema, eller rött om den blockerar. Det är den enskilt viktigaste UX-förbättringen för ett maze-spel.

---

## 5. Fas 2 – Anti-juggle

Juggling kräver att fiender byter riktning mitt i vågen. Sälj-juggling är redan omöjlig eftersom `salj()` bara fungerar i byggfas. Kvar är **bygg-juggling**: bygg en vägg så att fienderna vänder, bygg en till så att de vänder igen.

**Rekommenderad regel (enkel, lätt att förklara):**

> Under strid får du bara bygga på rutor som **inte** ligger på någon levande fiendes kvarvarande rutt. Nya fiender som spawnar tar den nya vägen.

```js
function juggleSafe(kol, rad) {
  if (lage !== 'strid') return true;
  const id = kol + ',' + rad;
  return fiender.every(f => f.avraknad ||
    !f.routeCells.slice(f.banSteg).some(c => c.kol + ',' + c.rad === id));
}
```

- Levande fienders rutt ändras då aldrig under en våg, så omdirigeringen i `refreshRoutes()` behövs bara för `BANPUNKTER` (nya spawns). Blockeringskontrollen för levande fiender blir trivialt uppfylld.
- Felmeddelande: *"En fiende är redan på väg genom den rutan. Bygg där när vågen är över, eller vid sidan av vägen. Ingen Ramen har dragits."*
- Markera blockerade rutor med ett svagt rött rutmönster medan spelaren håller ett torn under strid.

**Alternativ (mer likt WC3, svårare att balansera):** tillåt omdirigering men ge varje fiende en "juggle-budget" på två omdirigeringar. Neka bygget om det förlänger någon fiendes kvarvarande väg med mer än 50 %. Använd bara det här om regeln ovan känns för stel efter provspelning.

---

## 6. Fas 3 – Flygvågor

Flygande fiender ignorerar labyrinten. Det är Wintermauls sätt att straffa spelare som bara bygger "väggtorn" som inte kan skjuta upp.

### 6.1 Data

```js
// FIENDETYPER
flygare: { namn: 'Flygfisk', halsa: 1.4, fart: 1.1, belaning: 1.5, farg: '#9fd8ff', r: 12, ruta: 1, luft: true },
```

Varje torn får `mal: 'mark' | 'luft' | 'bada'`, med `'bada'` som standard. Förslag:

| Bara mark | Bara luft | Båda |
|---|---|---|
| Buljongkanon, Wokmästaren, Gravitationsaltaret | (inget i dag; ett nytt "Drakdrake"-torn skulle passa) | Alla andra |

### 6.2 Rörelse

Flygare använder `airStops()` omräknat till pixlar (`rutaMitt`). De får alltså en polyline med 3–4 punkter och följer samma `gaBana()`-loop, eftersom den redan bara går mot nästa punkt i `route`. De påverkas **inte** av `refreshRoutes()`.

### 6.3 Mål

Utöka `LTD_RULES.target()` med ett filter:

```js
function canTarget(tower, f) {
  const mal = tower.enhet.mal || 'bada';
  return mal === 'bada' || (mal === 'luft') === !!f.luft;
}
```

Gäller även `kedjemal`, `virvel`- och `omrade`-skada. En kanonkula kan inte träffa en flygare som råkar vara i sprängradien.

### 6.4 UI

Visa en ikon för flygvåg i vågförhandsvisningen två vågor i förväg, och rita flyglinjen som en prickad blå linje under byggfasen före en flygvåg.

---

## 7. Fas 4 – Attacktyp mot pansartyp

### 7.1 Tabell (förenklad WC3/TFT-tabell på svenska)

```js
// rules.js – multiplikator[attacktyp][pansartyp]
const TYPTABELL = {
  vanlig:     { latt: 1.0,  medel: 1.5,  tung: 1.0, befast: 0.7,  oskyddad: 1.0 },
  genomtrang: { latt: 2.0,  medel: 0.75, tung: 1.0, befast: 0.35, oskyddad: 1.5 },
  belagring:  { latt: 1.0,  medel: 0.5,  tung: 1.0, befast: 1.5,  oskyddad: 1.5 },
  magi:       { latt: 1.25, medel: 0.75, tung: 2.0, befast: 0.35, oskyddad: 1.0 },
  kaos:       { latt: 1.0,  medel: 1.0,  tung: 1.0, befast: 1.0,  oskyddad: 1.0 }
};
function typeMultiplier(attack = 'vanlig', armor = 'oskyddad', immunMagi = false) {
  if (immunMagi && attack === 'magi') return 0;
  return (TYPTABELL[attack] || TYPTABELL.vanlig)[armor] ?? 1;
}
```

Hjälte-pansar och -attack hoppas över. De tillför inget i ett enspelarspel utan hjältar.

### 7.2 Tilldelning av attacktyper (förslag)

| Klass | Vanlig | Genomträng | Belägring | Magi | Kaos |
|---|---|---|---|---|---|
| Nudelköket | Zebravakt, Ramenmunk | Nudelskytt | Buljongkanon, Chilikastare | Iskock | – |
| Tehuset | Wokmästaren, Gonggongen | Matchaskytt | – | Tebryggaren, Sojasprutan, Lotusfontän | – |
| Arkana orden | Runväktare | – | Gravitationsaltare | Stormspira, Observatorium, Solfyr | Prismaväktare |

Klasserna har då olika svagheter: Tehuset har problem mot befästa vågor, Köket mot medelpansar. Det är samma dynamik som gör byggarvalet i Wintermaul intressant. Prismaväktaren blir kaos och tappar `armorPierce` om den blir för stark.

### 7.3 Ordning i skadeberäkningen

Bestäm den en gång och lägg den i `LTD_RULES.hit()`:

```text
skada = grundskada
      × typeMultiplier(attacktyp, pansartyp, immunMagi)   // ny, bara i wintermaul-läget
      × (1 + sårbarhet från Gonggongen)                     // befintlig
      × (1 − minskadSkada × (1 − armorPierce))             // befintlig platt pansarreduktion
minst 1, avrunda som i dag
```

Gift (`sojasprutan`) räknas som magi och ger 0 mot magiimmuna fiender. Det är avsiktligt och ska stå i tornguiden.

### 7.4 Vågdata

Varje våg får `pansar` och eventuellt `immunMagi: true`. Visa en färgad bricka ("Befäst", "Magiimmun") i vågförhandsvisningen, och i tornpanelen en rad som *"Mot nästa våg: 150 %"* för det markerade tornet.

---

## 8. Fas 5 – Flera byggare

I dag är klassen ett enda värde, `activeClass`, som kontrolleras med `LTD.KLASS_AV[id].id !== activeClass` på flera ställen. Gör om det till en lista.

1. `let activeClasses = []` och hjälpfunktionen `const harKlass = id => activeClasses.includes(LTD.KLASS_AV[id].id)`.
2. Byt alla `KLASS_AV[...].id !== activeClass` mot `!harKlass(...)`. Sök efter `activeClass` i `game.js` och testerna.
3. Butiken visar en flik per aktiv klass.

**Byggarlägen** (valbara vid matchstart, bara i Wintermaul-läget):

| Läge | Wintermaul-förebild | Implementering |
|---|---|---|
| Välj en | All Pick | Dagens flöde |
| Dubbel | All Pick Double | Välj två klasser i setup |
| Slump | All Random | `activeClasses = [slumpa(1)]` med fast seed per match så att omstart ger samma resultat |
| Dubbel slump | All Random Double | `slumpa(2)` |
| + Tredje byggare | Recensionernas "third race" | Efter våg 15 visas en dialog med den sista klassen (eller ett av två slumpade val). Använd samma modal-mönster som bosspaketen. |

Med bara tre klasser betyder "Dubbel + tredje" att spelaren har alla klasser mot slutet. Det är okej. Läget blir intressantare med varje ny klass som läggs till.

---

## 9. Fas 6 – Vågschema, 40 vågor + oändligt

Lägg ett separat `WM_SCHEMA` i `data.js`. Rör inte `SCHEMA`, så att klassiskt läge inte ändras. Behåll formen `[typ, eskort]` och lägg till pansar per våg.

```js
// w: [typ(er), pansar, flaggor]
const WM_SCHEMA = {
   1: [['standard'],        'oskyddad'],
   2: [['standard'],        'latt'],
   3: [['snabb'],           'latt'],
   4: [['svarm'],           'oskyddad'],
   5: [['boss','standard'], 'medel'],
   6: [['pansrad'],         'tung'],
   7: [['flygare'],         'latt',   { luft: true }],
   8: [['snabb'],           'medel'],
   9: [['elit'],            'medel',  { immunMagi: true }],
  10: [['boss','pansrad'],  'befast'],
  // 11–39: rotera typerna, flyg var 7:e våg, magiimmun var 9:e,
  //        boss var 5:e med växlande pansar, helare från våg 16 (som i dag)
  40: [['boss','blandat'],  'befast', { slutboss: 'Hertig Frostkock' }]
};
```

- Håll vågorna **deterministiska** (samma som `vag()` i dag), så att tester och omspelningar blir identiska.
- **Oändligt läge:** efter våg 40, `cycle = ((w − 1) % 40) + 1`, och HP-skalningen fortsätter med samma `1.1^(w − 40)`-mönster som `basvarden()` redan har efter våg 20.
- Återanvänd bosspaketen (`BOSSPAKET`) var 5:e våg. Sigillen fyller samma funktion som lumber i Wintermaul, som valuta för de översta uppgraderingarna, så inget nytt valutasystem behövs.

---

## 10. Fas 7 – Balansering för långa labyrinter

Det här är den del som oftast blir fel. I klassiskt läge är vägen fast, 50–60 rutor. I Wintermaul-läget varierar den från ~46 rutor (inga torn) till kanske 150+ med en skicklig labyrint. Skjuttiden varierar lika mycket.

**Tumregel för att sätta HP:**

```text
tid i labyrinten ≈ vägLängd / fart                 (sekunder, fart i rutor/s)
krävd DPS        ≈ (antal × HP) / tid × andel torn som når
```

**Arbetsgång:**

1. Skriv ett test som bygger en **referenslabyrint** (hårdkodad lista med torn som ger ungefär 110 rutors väg på `isfallet`) och simulerar våg 1–40 med en enkel köpstrategi, på samma sätt som de befintliga simuleringstesterna i `game.test.cjs`.
2. Sätt `LTD.WM.halsaFaktor` så att referensspelaren på Medium läcker 0–3 liv på bossvågorna och nästan inget annars.
3. Kör samma test med en **rak väg** (inga väggtorn, bara torn längs kanten). Den spelaren ska förlora före våg 15. Då belönar läget att bygga labyrint.
4. Låt svårighetsgraderna (`DIFFICULTIES`) multiplicera ovanpå som i dag.

Justera **inte** tornens värden för det här läget. Det är vågorna som ska skalas, så att tornen känns likadana i alla lägen.

---

## 11. Teststrategi

Följ mönstret i [game.test.cjs](../games/ramen-legion-td/tests/game.test.cjs): rena funktioner testas direkt, spelflöden via `run("playMap(...)...")`. Kör:

```bash
node --test games/ramen-legion-td/tests/game.test.cjs
```

**Nya tester, per fas:**

| Fas | Test |
|---|---|
| 1 | `create(layout).route([])` passerar alla checkpoints i ordning och har längden summan av benen. |
| 1 | Bygge som blockerar *något* ben nekas, och saldot är oförändrat. |
| 1 | Bygge på sten, start, checkpoint eller mål nekas. |
| 1 | En fiende som passerat checkpoint 1 och räknas om går **inte** tillbaka till checkpoint 1. |
| 1 | `progress` ökar monotont för en fiende genom hela rutten, även när `refreshRoutes()` körs mitt i. |
| 2 | Under strid nekas bygge på en ruta i en levande fiendes kvarvarande rutt. Bygge vid sidan av tillåts och ändrar bara `BANPUNKTER`. |
| 2 | En levande fiendes rutt är identisk före och efter ett tillåtet bygge under strid. |
| 3 | Flygare följer `airStops` oavsett torn, och ett torn med `mal: 'mark'` väljer aldrig en flygare. Detsamma gäller sprängradie och kedja. |
| 4 | `typeMultiplier` stämmer för alla 25 kombinationer, och magi mot `immunMagi` ger 0 (även gift). |
| 5 | Med `activeClasses = ['nudelkoket','tehuset']` går torn från båda att köpa, men inte från `arkan`. Slump med samma seed ger samma klasser. |
| 6 | `vag(w)` är deterministisk för 1–80, våg 7 är flyg, våg 40 har slutboss, och våg 41 har samma sammansättning som våg 1 men högre HP. |
| 7 | Referenslabyrint på Medium överlever 40 vågor, och rak väg förlorar före våg 15. |

Alla gamla tester för `classic` och `maze` ska fortsätta passera oförändrade.

---

## 12. Föreslagen ordning och omfattning

| Steg | Innehåll | Spelbart efteråt? |
|---|---|---|
| 1 | Konfigurerbart rutnät, `LTD_MAZE.create`, checkpoints, stenar, hovringsförhandsvisning | Ja: ett längre maze-läge |
| 2 | Anti-juggle-regeln | Ja |
| 3 | 40-vågsschema, referenslabyrint och HP-balans | Ja: första "riktiga" Wintermaul-läget |
| 4 | Flygvågor och `mal` på torn | Ja |
| 5 | Attack- och pansartyper | Ja |
| 6 | Flera byggare och byggarlägen | Ja |
| 7 | Oändligt läge och fler Wintermaul-kartor | Ja |

Steg 1–3 är det minsta som känns som Wintermaul. Steg 4–6 ger djupet, alltså skälet att välja olika byggare. Varje steg ska lämna alla tester gröna och uppdatera README:s verifieringsrad, som tidigare expansioner har gjort.

---

## Källor

- [Wintermaul One Revolution – officiell sajt](https://wintermaul.one/) och [changelog](https://wintermaul.one/changelog/)
- [Wintermaul Wars: the WC3 map that invented a genre – Maul Tactics](https://maultactics.gg/articles/wintermaul-wars-history)
- [Wintermaul One Revolution 1.0 review – Review of the Week](https://weaklyreviews.wordpress.com/2017/12/18/wintermaul-one-revolution-1-0-review/)
- [Wintermaul One – W3Reforged map database](https://maps.w3reforged.com/maps/categories/maul/wintermaul-one)
- [Wintermaul One: Warcraft 3 Map Download – gaming-tools.com](https://gaming-tools.com/warcraft-3/wintermaul-one/)
- [Wintermaul One Revamped v4b – Hive Workshop](https://www.hiveworkshop.com/threads/wintermaul-one-revamped-v4b.212876/)
