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
- Legion TD Vibe: ett Legion TD-inspirerat tower defense i tjugo vågor. Du placerar en armé mellan vågorna och ser den slåss automatiskt. Se avsnittet nedan för regler.
- Alla spel: knappen Helskärm i verktygsraden, eller tangenten `F`, fyller skärmen. Rubrik och tillbaka-länk göms då så spelplanen får plats, och den växer till runt 83 % av skärmhöjden. Escape lämnar helskärmen; ett andra Escape går till huvudmenyn.
- Alla spel: tillbaka-länken eller Escape går till huvudmenyn.
- Snake, Pong, Elefanten, Vibe Kong, Vibe Rescue och Vibe Breaker avbryter rundan om fliken döljs; starta en ny runda när du återkommer. Vibetris och Vibe Slash pausar istället, och Elefantungen lever vidare.

### Legion TD Vibe

En rosa elefantkung försvarar sitt ramenkök i tjugo vågor. Du köper och placerar försvarare i byggfas, trycker **Starta våg**, och striden sköter sig själv.

**Ekonomi.** Valutan heter Ramen. Du börjar med 500 Ramen och 20 kungaliv, och saldot kan aldrig överstiga 300 000.

- Dödade fiender ger Ramen direkt. Fiender som läcker fram till kungen ger ingenting och kostar liv — vanliga fiender ett, bossar fem.
- När en våg startar låses *ränteunderlaget* till ditt saldo i det ögonblicket. Överlever du vågen betalas `floor(underlag × 5 / 100)` ut, exakt en gång. Ramen du tjänar under vågen ger alltså ränta först nästa våg, om pengarna finns kvar då.
- Räntan avrundas alltid nedåt: underlag 19 ger 0, underlag 20 ger 1.
- Träffar du saldotaket försvinner överskottet — det sparas inte i en dold reserv. Verktygsraden visar alltid exakt saldo och vad räntan blir.
- Förlorar du matchen betalas ingen ränta. Paus, flikbyte, omladdning och 2× fart ger aldrig extra pengar.

**Bygga.** Rutnätet är 8 × 6 rutor, en försvarare per ruta. Flytt är gratis, uppgradering kostar 150 % av grundpriset och ger dubbel hälsa och skada, försäljning ger 70 % av allt du betalat. Köp, flytt, uppgradering och försäljning är låsta under strid, och en ogiltig placering drar aldrig Ramen.

**Banan.** Fienderna följer en slingrande bana från hörnet längst upp till vänster, genom fyra gångar fram och tillbaka, och vidare till kungen. Banan är 62 rutor lång, vilket tar drygt 40 sekunder att gå i grundfart. Du bygger i de 47 rutorna mellan gångarna — aldrig i banan, och ett försök att placera där kostar ingen Ramen. Varje byggruta ligger mellan två gångar, så den kan täcka fiender som passerar både ovanför och under.

**Placeringen spelar roll.** Fienderna går hela tiden vidare och slår mot försvarare i förbifarten; de stannar aldrig för att slåss. En försvarare skjuter bara på det som passerar inom dess räckvidd, och får bara lämna sin hemruta 1,3 rutor. Räckvidden avgör därför hur stor del av banan enheten täcker: en närstridsenhet med 0,8 rutor får bara en kort skottlucka, medan en nudelskytt med 3,5 rutor hinner flera attacker per fiende. Enheterna återställs gratis mellan vågorna.

**Vågorna** är reproducerbara — samma våg ger alltid samma fiender. Sex fiendetyper varvas, och boss finns på våg 5, 10, 15 och 20. Rundan avbryts efter 120 sekunders simuleringstid; kvarvarande fiender räknas då som läckor.

**Styrning.** Mus eller touch: välj i butiken, tryck på en ledig ruta. Tryck på en placerad enhet för Flytta, Uppgradera och Sälj. Tangentbord: `1`–`6` väljer enhet, piltangenter flyttar rutmarkören, `Enter` placerar eller väljer, `mellanslag` startar vågen, `P` pausar. `Escape` går till huvudmenyn som i övriga spel. Knappen `1×`/`2×` ändrar bara takten, aldrig några belopp.

Balansdatan ligger samlad i `games/ramen-legion-td/data.js`, med banan definierad i samma fil. Alla avvikelser från designdokumentets utkast är motiverade i kommentarer där de står:

- **Försvararnas skada är tredubblad.** Dokumentets siffror var satta för en öppen arena där fienderna stannade och slogs, så hela armén sköt på samma mål. Med banan går de förbi i stället, och varje enhet hinner bara skjuta på det som passerar dess räckvidd. Med de ursprungliga talen läckte redan våg 1 rakt igenom.
- **Nudelskytten kostar 150 och gör 24 i grundskada** (dokumentet föreslog 140/30).
- **Kopplet `KOPPEL`** i `game.js` är ett tillägg, inte en ändring: utan det sprang hela armén i klump mot närmaste fiende och placeringen slutade spela roll.

**Balansen är inte färdig.** En ren armé av bara nudelskyttar eller bara chilikastare vinner fortfarande alla tjugo vågor utan att förlora ett enda liv, medan en blandad armé vinner med 16 liv kvar. Orsaken är att banan gör räckvidd till den överlägset viktigaste egenskapen, och enhetstabellen är fortfarande balanserad för närstrid. En ordentlig ombalansering mot tower-defense-ekonomi — där priset följer täckt banlängd snarare än skada per slag — återstår.

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
