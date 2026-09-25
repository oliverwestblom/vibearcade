# B3 Vibe

En fristående spelportal med Snake, Pong, Elefanten, Elefantungen, Vibe Kong, Vibe Rescue, Vibetris och Vibe Breaker. Inga paket behöver installeras.

## Starta

Öppna en terminal och kör:

```powershell
cd C:\work\b3vibe
python server.py 8000 --bind 127.0.0.1
```

Öppna http://localhost:8000 i webbläsaren. Avsluta servern med Ctrl+C.

`server.py` använder bara Pythons standardbibliotek. Den serverar filerna precis som `python -m http.server`, men lägger till ett litet highscore-API så att Vibetris topplista kan sparas i en fil på disk:

```
GET  /api/highscores?game=vibetris   -> {"scores": [...]}
POST /api/highscores                 -> {"scores": [...]}
```

Listan hamnar i `highscores.json` bredvid `server.py`. Den filen är git-ignorerad, så varje maskin har sin egen topplista och rekorden kan aldrig ge merge-konflikter. Skrivningen sker atomiskt via en temporärfil, och servern validerar spelnamn, poäng och bodystorlek innan något sparas.

Det gamla kommandot fungerar fortfarande:

```powershell
python -m http.server 8000
```

Då finns inget API, och Vibetris faller automatiskt tillbaka på webbläsarens `localStorage` för topplistan. Spelet visar vilket läge det kör i, `(fil)` eller `(lokalt)`, ovanför listan.

Startsidan läser spelen från `games.json`. Kör via webbservern eftersom webbläsare kan blockera hämtning av JSON när HTML-filen dubbelklickas direkt.

## Raspberry Pi: installera och uppdatera

Använd en Git-klon för att kunna hämta uppdateringar. En uppackad ZIP saknar Git-historiken. Klona till en ny mapp om du redan har en ZIP-version:

```bash
git clone https://github.com/oliverwestblom/vibearcade.git ~/vibearcade
cd ~/vibearcade
python3 server.py 8000 --bind 127.0.0.1
```

Öppna http://localhost:8000 i Chromium. Pi:n får sin egen `highscores.json`; eftersom filen är git-ignorerad stoppar `git pull` aldrig på grund av lokala rekord. För att uppdatera, öppna en annan terminal och kör:

```bash
cd ~/vibearcade
bash update.sh
```

Skriptet hämtar `main` från `origin` med `git pull --ff-only`. Det stoppar vid lokala ändringar, nya filer, fel gren eller historik som kräver en merge. Inga lokala ändringar raderas automatiskt. GitHub-inloggning krävs om repot är privat.

Webbservern behöver inte startas om när HTML, CSS och JavaScript uppdateras. Ladda om Chromium med Ctrl+Shift+R efter uppdateringen. `bash update.sh` kräver inga ändrade körbehörigheter och kan även anropas med skriptets fullständiga sökväg.

Om du redan har en Git-klon som saknar skriptet, kör `git pull --ff-only origin main` en gång för att hämta det efter att ändringen publicerats på GitHub.

## Spel

- Snake: piltangenter, WASD eller skärmknappar. Tio poäng per matbit.
- Pong: upp/ner, W/S, håll skärmknapparna eller dra på spelplanen. Först till sju mot datorn.
- Elefanten: vänster/höger, A/D, håll skärmknapparna eller dra på planen. Zebran skjuter b3-orber av sig själv; mellanslag eller knappen Hjorden släpper lös hjorden när mätaren är full. Tre liv, bossen har 100 %.
- Elefantungen: ett Tamagotchi. Mata (1), Leka (2), Städa (3), Sova (4) och Medicin (5), eller knapparna under planen. Fyra mätare faller med tiden, ungen bajsar och blir sjuk om något står på noll för länge. Den växer Ägg → Kalv → Unge → Vuxen och sparas i webbläsarens `localStorage`, så den lever vidare mellan besöken. Var du borta räknas högst fyra timmars förfall, och den kan aldrig dö medan du är borta — bara bli sjuk.
- Vibe Kong: piltangenter eller WASD för att gå och klättra, mellanslag för att hoppa. Hjälp zebran uppför stegarna, hoppa över vibefaten och nå stjärnan bredvid den rosa elefanten.
- Vibe Rescue: vänster/höger, A/D, håll skärmknapparna eller dra på planen. Styr den rosa elefantens räddningsflotte och fånga de fallskärmshoppande zebrorna. Tre missar avslutar rundan.
- Vibetris: en Tetris-klon. ← → flyttar, ↑ eller X roterar medurs, Z moturs, ↓ mjukdroppar, mellanslag hårddroppar, C håller en bit, P pausar. Följer riktlinjerna: 7-bag-slump, SRS-rotation med wall kicks, ghost-bit, hold, lock delay, T-spins, back-to-back och combo. Nivån stiger var tionde rad och gravitationen med den. Skriv ditt namn i fältet ovanför planen så sparas poängen i topplistan när rundan tar slut.
- Vibe Breaker: vänster/höger, A/D, håll skärmknapparna eller dra på planen. Studsa den rosa vibe-orben med zebran, krossa alla block och fånga power-ups för bredare platta, fler orber, lägre fart eller extra liv.
- Vibe Slash: skiva b3-orber och zebramelooner, undvik vibefaten. P pausar. Spelet startar i musläge — dra över planen för att skiva. Knappen Slå på kameran byter till handstyrning: bildrutorna jämförs mot varandra i låg upplösning, och rutor där något rör sig blir skivande. Videon analyseras bara lokalt och skickas ingenstans. Kameran stängs automatiskt när du lämnar fliken.
- Alla spel: rundan startar direkt när du väljer spelet på startsidan. Knappen i verktygsraden startar om rundan. I Elefantungen heter den Nytt ägg och kräver en extra klickbekräftelse om ungen hunnit bli äldre än en minut.
- Legion TD Vibe: ett tower defense i tjugo vågor. Fasta torn skjuter på fiender längs en bana; varje torn kan uppgraderas i skada, räckvidd och eldhastighet. Se avsnittet nedan för regler.
- Vibemaul: ett maze TD inspirerat av Wintermaul i WC3. En lång rak korridor (30 × 10) där tornen är väggarna och fienderna går kortaste vägen. Nio byggare med olika stil: Frost (broms), Eld (skada), Natur (gift/luftvärn), Storm (kedja), Berg (närstrid), Tvilling (synergi – starkare i klungor), Kristall (räckvidd/luftvärn), Skrot (billigt + kraftverk som ökar takten) och Djup (svag tidigt, starkast på nivå 5). Testläge i startdialogen ger oändligt guld och kristaller, liv som inte tar slut och fritt val av våg, för att öva labyrinter. Klicka en ruta för att bygga (den gröna linjen visar den nya vägen), 1–9 väljer torn, mellanslag startar vågen, U uppgraderar, S säljer, högerklick eller Q avbryter och P pausar. Vägen får aldrig stängas, och under en våg går det inte att bygga i vägen för fiender som redan är ute (anti-juggle). Flygvågor ignorerar labyrinten, attacktyp mot pansartyp avgör skadan, och bossar ger frostkristaller. Man bygger bara rasens vägg; varje uppgradering gör om tornet till nästa torn i rasens kedja (t.ex. Iskloss → Frostbåge → Snöstormsspira → Glaciärkanon), och sista steget – mästartornet – kräver en frostkristall. Mästartornen skjuter ofta bara på mark, så låt några torn stanna ett steg tidigare som luftvärn. 40 vågor, oändligt läge som tillval. Vibemaul går att installera som app (PWA): öppna spelet i Chrome på telefonen via HTTPS och välj "Installera app". Det startar då i helskärm och liggande läge och fungerar offline. Byt `VERSION` i `games/vibemaul/sw.js` när spelets filer ändras, annars fortsätter installerade appar att visa den gamla versionen. Tester: `node --test games/vibemaul/tests/sim.test.cjs`; `node games/vibemaul/tests/bot.cjs` skriver ut en balansrapport.
- Alla spel: knappen Helskärm i verktygsraden, eller tangenten `F`, fyller skärmen. Rubrik och tillbaka-länk göms då så spelplanen får plats, och den växer till runt 83 % av skärmhöjden. Escape lämnar helskärmen; ett andra Escape går till huvudmenyn.
- Alla spel: tillbaka-länken eller Escape går till huvudmenyn.
- Snake, Pong, Elefanten, Vibe Kong, Vibe Rescue och Vibe Breaker avbryter rundan om fliken döljs; starta en ny runda när du återkommer. Vibetris och Vibe Slash pausar istället, och Elefantungen lever vidare.

### Legion TD Vibe

Ett tower defense-spel med fasta torn och en slingrande bana. Tjugo vågor, sex torn och bossar på våg 5, 10, 15 och 20. Fiender följer stigen till ramenköket; tornen har ingen hälsa och kan inte flyttas.

**Ekonomi.** Start: 500 Ramen och 20 kungaliv. Döda fiender ger Ramen. Vanliga läckor tar ett liv, bossar fem. Saldot är högst 300 000. Vid vågstart låses ränteunderlaget till kvarvarande saldo. En överlevd våg betalar `floor(underlag × 5 / 100)` en gång, begränsat av saldotaket. Nya fiendebelöningar ger ränta först nästa våg. Förlust ger ingen ränta.

**Bygga och uppgradera.** Välj ett torn, tryck på en ledig markruta i rutnätet 12 × 9 och markera sedan tornet. Varje torn har separata spår för **Skada 0–3**, **Räckvidd 0–3** och **Eldhastighet 0–3**. Alla tre kan maxas. Panelen visar aktuell statistik, nästa värde, pris och räntepåverkan. Skademultiplikatorer: 1 / 1,4 / 1,9 / 2,6. Räckvidd: 1 / 1,15 / 1,30 / 1,50. Eldhastighet: 1 / 1,20 / 1,50 / 1,90 gånger grundtakten; skottintervallet delas med faktorn. Varje hastighetssteg kostar 50 %, 90 % respektive 140 % av grundpriset, avrundat upp till närmaste 5 Ramen. Priser beräknas från grundpriset och avrundas upp till närmaste 5 Ramen. Försäljning ger 70 % av hela investeringen. Köp, uppgraderingar och försäljning sker mellan vågor.

**Tornen.** Zebravakt är en billig snabbskytt; Nudelskytt en långdistansprickskytt; Buljongkanon och Chilikastare gör områdesskada; Iskock bromsar fiender; Ramenmunk ger stöd och skjuter egna energikulor. Munkens aura ger +25 % skada och +15 % räckvidd till andra torntyper. Auror staplas aldrig och munkar kan inte förstärka varandra. Munkens skade- och hastighetsuppgraderingar förbättrar egna skott, medan räckvidd förbättrar både skjuträckvidd och aura. **Tornguiden** förklarar styrkor, svagheter, placering och uppgraderingar med bildförhandsvisningar.

**Grafik.** Egna AI-genererade rasterillustrationer finns lokalt i `games/ramen-legion-td/bilder/`. Sex tornatlaser innehåller samtliga 16 kombinationer av skade- och räckviddsnivåer. Där finns även fiender, fyra bossutseenden, kung, miljö och projektiler. `manifest.json` dokumenterar ursprung, atlaslayout och genereringsprompter. Äldre SVG-filer är bevarade men används inte av den nya spelversionen. Minskade effekter stänger av dekorativa rörelser och partiklar; projektiler och funktionella markeringar finns kvar.

**Styrning.** Mus/touch: välj och placera, markera ett torn för uppgraderingar och målprioritet. Tangentbord: `1`–`6` väljer torn, pilar flyttar rutmarkören, `Enter` placerar/markerar, `mellanslag` startar vågen och `P` pausar. `F` öppnar helskärm, `Escape` går till huvudmenyn; om Tornguiden är öppen stänger Escape den först. Målval: Först, Sist, Starkast eller Närmast. Tornguide under strid och dold flik pausar, med manuell Fortsätt. 1×/2× ändrar bara simuleringshastighet. Omstart kräver bekräftelse i pågående match.

**Verifiering.** Kör `node --test games/ramen-legion-td/tests/game.test.cjs` för regler och simulering av den faktiska spelmotorn. Testerna täcker alla tre uppgraderingsspåren, kostnader, giltiga köp, försäljning, aura, målval, träffskada, kyla, ränta, saldotak, timeout och paus. Tre deterministiska köpstrategier genomför 20 vågor med endast intjänad Ramen: blandad armé (20 liv) , snipertung armé (12 liv) och blandad armé med eldhastighet (20 liv) i det aktuella balansutkastet. Detta är simuleringsresultat, inte ett påstående om slutlig balans för alla strategier. Raspberry Pi-prestanda är inte verifierad.

Balansdata och banan finns i `data.js`, gemensamma statistikregler i `rules.js`, svensk torninformation i `towers.js` och spelet i `game.js`. Inga nya paket eller byggsteg krävs för att spela.

### Helskärm

Spelplanen skalas efter hur mycket plats som finns. Bredden väljs som det minsta av behållarens bredd och tillgänglig höjd gånger spelets bildförhållande, så båda villkoren uppfylls utan att något klams i efterhand — proportionerna kan alltså inte förvrängas. Bildförhållandet läses ur canvasens egna mått i `games/common.js` och skickas till CSS som `--ratio`.

Tre variabler i `:root` styr storleken: `--game-min` (minsta höjd), `--game-max` (största) och `--game-chrome` (hur mycket som går åt ovanför och under planen). Helskärm sänker `--game-chrome` till 188px och höjer taket, vilket är hela skillnaden.

`F11` och kiosk-läge fyller skärmen utan att sätta `document.fullscreenElement`, så `:fullscreen` matchar inte då. Därför känner `common.js` av det via fönsterhöjden och sätter klassen `skarmfyllt` på `body`, som ger samma stora plan. Det gäller även Chromium i kiosk-läge på Pi:n.

### Rekordbild

Slår du ett rekord kan en bild sparas tillsammans med poängen. Bilden tas bara om du själv har slagit på kameran:

- I Vibe Slash används kameran som redan driver spelet — ingen extra fråga.
- I Vibetris finns knappen Rekordfoto, som är av från början och frågar om kameran när du slår på den.

Bilden skalas ner till 240px bredd, sparas som JPEG i `highscore-photos/` och refereras från `highscores.json`. Mappen är git-ignorerad. Servern litar inte på mime-typen i data-url:en utan kontrollerar filens egna magiska bytes, och avvisar allt som inte är JPEG eller är större än 160 kB. En avvisad bild stoppar aldrig poängen — den sparas utan bild. När en post trillar ur topp-tio raderas dess bildfil, så mappen inte växer för evigt.

### Kameran i Vibe Slash

Webbläsare släpper bara fram kameran i en säker kontext. `http://localhost:8000` räknas som säker, så på datorn där servern kör fungerar den direkt. Når du Pi:n från en annan enhet via `http://<pi-ip>:8000` blockeras kameran — då används musläget, och knappen berättar varför. Vill du ha handstyrning över nätverket krävs https med ett certifikat.

Memory ligger kvar under `games/memory/` men är borttagen ur `games.json` och visas därför inte på startsidan. Lägg tillbaka posten i `games.json` för att få tillbaka det.

## Lägg till ett spel

Skapa `games/<spelnamn>/index.html` och lägg till ett objekt i `games.json` med `name`, `folder` och `description`. Fälten `tag`, `controls` och `number` är valfria. Mappnamn får innehålla bokstäver, siffror, bindestreck och understreck. Lägg in en länk till `../../index.html` och ladda `../common.js` för Escape-stöd. Listan uppdateras när startsidan laddas om; mappar genomsöks inte automatiskt.

### Kartor i Legion TD Vibe

Välj landskap ovanför spelplanen och tryck **Spela vald karta**. Förhandsvisningen visar fiendevägen från grönt till rött; kartvalet ändrar inte en pågående match förrän du trycker på knappen. Byte under en pågående match kräver bekräftelse och återställer till våg 1, 20 liv och 500 Ramen. **Starta om** behåller nuvarande karta.

- **Bambulunden:** ursprungliga trädgårdens långa slingor.
- **Frostpasset:** snö och is, hårnålskurvor och lodräta passager.
- **Solravinen:** sandstensklippor, öppna ytor och en lång ytterkant.
- **Glödkratern:** basalt och lava, kortare sicksackväg som kräver mer koncentrerad eldkraft.

Alla kartor har samma 20 vågor, torn, tre uppgraderingsspår och ekonomi. Landskapet är dekorativt; rutorna och den ritade stigen avgör var torn får placeras. Kartdata finns i `data.js`; `landscapes-atlas.webp` innehåller tre originalillustrationer med prompt i `bilder/manifest.json`. Rutterna används gemensamt för rörelse, byggförbud och kartans ritade väg.

Verifiering efter karttillägget: 13 tester godkända, inklusive sammanhängande rutter, byggförbud på samtliga kartor, avbrutna och bekräftade kartbyten, läckor vid köket och sex kompletta 20-vågssimuleringar. De tre nya kartorna klarades med ordinarie intjänad Ramen och alla tre uppgraderingsspåren.

### Expansion: bossbelöningar, runor och tre tornklasser

Den aktuella versionen har **18 torn: sex i varje klass**. Välj först klass och sedan karta innan matchen startar. Klassen är låst under matchen; tangenterna 1–6 väljer bland dess sex torn. Ny match återgår till klass- och kartval.

- Nudelköket: de sex ursprungliga tornen.
- Tehuset: Tebryggaren (kedjeattacker), Sojasprutan (gift genom pansar), Wokmästaren (träffar alla inom räckvidden) Gonggongen (icke staplande +25 % sårbarhet), Matchaskytt (dubbel skada var fjärde attack) och Lotusfontän (områdesbroms).
- Arkana orden: Stormspira (tre kedjemål), Prismaväktare (ignorerar 60 % av pansaret) Gravitationsaltare (områdesskada och broms), Runväktare (billig snabb eld), Stjärnobservatorium (skade- och räckviddsaura) och Solfyr (områdesskada som stoppar läkning i tre sekunder).

Varje torn har **sex nivåer** i vart och ett av spåren skada, räckvidd och eldhastighet: 18 steg samt en separat runplats. Steg 1–3 kostar Ramen. Varje steg till nivå 4–6 kostar även ett bosssigill. Vid försäljning återfås alla använda sigill och 70 % av betald Ramen. Guiden visar alla nivåers värden och priser. Äldre beskrivningar ovan av tre nivåer gäller den tidigare versionen.

En faktiskt dödad boss ger **2 sigill + 150 + 30 × vågnumret i bonus-Ramen**, utöver vanlig dödsbelöning. Efter vågen väljer spelaren dessutom en av tre bonusar: fler sigill, en permanent legionsbonus eller Ramen/liv. Bonusen kan väljas senare mellan vågor; den delas aldrig ut vid läcka och kan inte hämtas två gånger. Extra liv begränsas till 30. Ramen begränsas fortfarande till 300 000 och räntan till 5 % av saldot vid vågstart.

Runverkstaden på det markerade tornet kostar ett sigill och har fyra val:

- Bossjägare: +75 % skada mot bossar, inklusive tornets gift.
- Pansarbrytare: direkta träffar ignorerar allt pansar (gift gör det redan).
- Runeko: var tredje attack gör dubbel direkt skada. Räknaren börjar om varje våg; kedjor och områdesträffar förstärks, gift gör det inte.
- Frostsigill: bromsar 25 % i 2 sekunder, bossar 10 %. Starkare befintlig broms ersätts inte.

Från våg 16 följer helande Soppkockar med. De markeras med grönt plus och läker andra fiender inom 1,6 rutor, 6 % av maxhälsan var 1,2 sekund. Efter seger på våg 20 kan spelaren välja **expedition 21–40**, som behåller armé, ekonomi, sigill och bonusar. Bossarna återkommer var femte våg. Fiendehälsan ökar 10 % per expeditionsvåg. Ny match och kartbyte återställer all progression; ingen progression sparas mellan matcher.

Grafik: Arkana ordens originalillustration finns i `bilder/arcane-atlas.webp`, genererad med image_gen och med ursprungsprompt i manifestet. Spelet använder uppmätta radgränser eftersom atlasen inte har exakt jämnhöga rader. Tehusets befintliga `art.js` använder en annan porslin/jade-stil. Nivå 4–6 får mästarringar och runor får egna märken; originaltornen behåller sina befintliga illustrerade former från nivå 3.

Verifierat: 21 automatiserade tester inklusive alla 343 uppgraderingskombinationer för vart och ett av de 13 tornen, loot utan dubbelutdelning, sigillförbrukning/återbetalning, fyra runor, gift, kedjor, läkning, sex 20-vågssimuleringar och en komplett 40-vågsexpedition med alla klasser och enbart intjänad valuta. Bossval, mästaruppgradering och runval har även kontrollerats i webbläsaren på skrivbord och mobilstorlek.

### Klassval och byggande under strid (25 september 2026)

Detta avsnitt ersätter äldre regler om köp enbart mellan vågor. Matchen börjar först efter ett uttryckligt klassval och kartval; startskärmen visar klassens sex torn med pris och specialitet.

Torn kan byggas, uppgraderas och få runor både mellan vågor och under pågående strid. Försäljning sker fortfarande mellan vågor. Ändrade värden och stöd från nya auratorn gäller direkt. Pågående nedkylning behåller samma återstående andel, redan avfyrade projektiler behåller sina värden och nya torn väntar ett normalt skottintervall innan första attacken. Köp under strid ändrar inte den ränta som låstes vid vågstart.

Verifierat: 25 automatiserade tester, inklusive alla 343 uppgraderingskombinationer per torn, obligatoriska val, klasslås, köp och runor under strid, bevarade nedkylningar, nya specialiteter och tre kompletta 40-vågsexpeditioner med respektive klass och enbart intjänade resurser. Startflödet, köp och eldhastighetsuppgradering under strid har kontrollerats i webbläsaren. Mobil startskärm har kontrollerats vid 390 px bredd utan horisontell överströmning.

De fem nya tornens illustrationer finns i bilder/reinforcements-atlas.webp. Original, layout och full genereringsprompt finns i bildmanifestet.

### Svårighetsgrad och visuellt klassval (25 september 2026)

Startskärmen visar tre klickbara klasskort med bilder, namn och specialiteter för klassens samtliga sex torn. På mobil staplas korten.

Välj Low, Medium eller High före matchstart. Medium är förvalt och behåller originalbalansen. Low multiplicerar alla fienders hälsa med 0,75 och fart med 0,90. High använder 1,35 respektive 1,10. Även bossar och expeditionens vågor påverkas. Hälsa avrundas till heltal. Svårighetsgraden låses när matchen börjar och visas tillsammans med klass och karta. Startresurser, belöningar och ränta ändras inte.

Verifiering: 27 tester godkända. Nya tester kontrollerar skalning, bossar, expedition, oförändrade belöningar, klasskortens 18 torn och att svårighetsgraden förblir låst i matchen. Startflöde med High samt mobilvy vid 390 px kontrollerade i webbläsaren.

Kartvalet visar nu alla fyra kartor som klickbara bildkort med landskap, fiendeväg, start/slut och strategitips. Klass måste väljas innan ett kartkort kan väljas. Vald karta markeras och korten anpassas till skärmens bredd.
