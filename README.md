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
- Legion TD Vibe: ett tower defense i tjugo vågor. Fasta torn skjuter på fiender längs en bana; varje torn kan uppgraderas i skada och räckvidd. Se avsnittet nedan för regler.
- Alla spel: knappen Helskärm i verktygsraden, eller tangenten `F`, fyller skärmen. Rubrik och tillbaka-länk göms då så spelplanen får plats, och den växer till runt 83 % av skärmhöjden. Escape lämnar helskärmen; ett andra Escape går till huvudmenyn.
- Alla spel: tillbaka-länken eller Escape går till huvudmenyn.
- Snake, Pong, Elefanten, Vibe Kong, Vibe Rescue och Vibe Breaker avbryter rundan om fliken döljs; starta en ny runda när du återkommer. Vibetris och Vibe Slash pausar istället, och Elefantungen lever vidare.

### Legion TD Vibe

Ett tower defense-spel med fasta torn och en slingrande bana. Tjugo vågor, sex torn och bossar på våg 5, 10, 15 och 20. Fiender följer stigen till ramenköket; tornen har ingen hälsa och kan inte flyttas.

**Ekonomi.** Start: 500 Ramen och 20 kungaliv. Döda fiender ger Ramen. Vanliga läckor tar ett liv, bossar fem. Saldot är högst 300 000. Vid vågstart låses ränteunderlaget till kvarvarande saldo. En överlevd våg betalar `floor(underlag × 5 / 100)` en gång, begränsat av saldotaket. Nya fiendebelöningar ger ränta först nästa våg. Förlust ger ingen ränta.

**Bygga och uppgradera.** Välj ett torn, tryck på en ledig markruta i rutnätet 12 × 9 och markera sedan tornet. Varje torn har separata spår för **Skada 0–3** och **Räckvidd 0–3**. Båda kan maxas. Panelen visar aktuell statistik, nästa värde, pris och räntepåverkan. Skademultiplikatorer: 1 / 1,4 / 1,9 / 2,6. Räckvidd: 1 / 1,15 / 1,30 / 1,50. Priser beräknas från grundpriset och avrundas upp till närmaste 5 Ramen. Försäljning ger 70 % av hela investeringen. Köp, uppgraderingar och försäljning sker mellan vågor.

**Tornen.** Zebravakt är en billig snabbskytt; Nudelskytt en långdistansprickskytt; Buljongkanon och Chilikastare gör områdesskada; Iskock bromsar fiender; Ramenmunk ger stöd och skjuter egna energikulor. Munkens aura ger +25 % skada och +15 % räckvidd till andra torntyper. Auror staplas aldrig och munkar kan inte förstärka varandra. Munkens skadeuppgradering förbättrar egna skott, medan räckvidd förbättrar både skjuträckvidd och aura. **Tornguiden** förklarar styrkor, svagheter, placering och uppgraderingar med bildförhandsvisningar.

**Grafik.** Egna AI-genererade rasterillustrationer finns lokalt i `games/ramen-legion-td/bilder/`. Sex tornatlaser innehåller samtliga 16 kombinationer av skade- och räckviddsnivåer. Där finns även fiender, fyra bossutseenden, kung, miljö och projektiler. `manifest.json` dokumenterar ursprung, atlaslayout och genereringsprompter. Äldre SVG-filer är bevarade men används inte av den nya spelversionen. Minskade effekter stänger av dekorativa rörelser och partiklar; projektiler och funktionella markeringar finns kvar.

**Styrning.** Mus/touch: välj och placera, markera ett torn för uppgraderingar och målprioritet. Tangentbord: `1`–`6` väljer torn, pilar flyttar rutmarkören, `Enter` placerar/markerar, `mellanslag` startar vågen och `P` pausar. `F` öppnar helskärm, `Escape` går till huvudmenyn; om Tornguiden är öppen stänger Escape den först. Målval: Först, Sist, Starkast eller Närmast. Tornguide under strid och dold flik pausar, med manuell Fortsätt. 1×/2× ändrar bara simuleringshastighet. Omstart kräver bekräftelse i pågående match.

**Verifiering.** Kör `node --test games/ramen-legion-td/tests/game.test.cjs` för regler och simulering av den faktiska spelmotorn. Testerna täcker båda uppgraderingsspåren, kostnader, giltiga köp, försäljning, aura, målval, träffskada, kyla, ränta, saldotak, timeout och paus. Två deterministiska köpstrategier genomför 20 vågor med endast intjänad Ramen: blandad armé (20 liv) och snipertung armé (12 liv) i det aktuella balansutkastet. Detta är simuleringsresultat, inte ett påstående om slutlig balans för alla strategier. Raspberry Pi-prestanda är inte verifierad.

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
