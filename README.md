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
- Alla spel: rundan startar direkt när du väljer spelet på startsidan. Knappen i verktygsraden startar om rundan. I Elefantungen heter den Nytt ägg och kräver en extra klickbekräftelse om ungen hunnit bli äldre än en minut.
- Alla spel: tillbaka-länken eller Escape går till huvudmenyn.
- Snake, Pong, Elefanten, Vibe Kong, Vibe Rescue och Vibe Breaker avbryter rundan om fliken döljs; starta en ny runda när du återkommer. Vibetris pausar istället, och Elefantungen lever vidare.

Memory ligger kvar under `games/memory/` men är borttagen ur `games.json` och visas därför inte på startsidan. Lägg tillbaka posten i `games.json` för att få tillbaka det.

## Lägg till ett spel

Skapa `games/<spelnamn>/index.html` och lägg till ett objekt i `games.json` med `name`, `folder` och `description`. Fälten `tag`, `controls` och `number` är valfria. Mappnamn får innehålla bokstäver, siffror, bindestreck och understreck. Lägg in en länk till `../../index.html` och ladda `../common.js` för Escape-stöd. Listan uppdateras när startsidan laddas om; mappar genomsöks inte automatiskt.
