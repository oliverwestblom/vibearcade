# Legion TD Vibe – speldesign och bygguppdrag

Version 2.0 · 24 september 2026 · Projekt: `C:\work\b3vibe`

## 1. Uppdrag till byggagenten

Bygg vidare på Legion TD Vibe i den befintliga B3 Vibe-portalen. Den nya spelmodellen är inspirerad av Bloons: fasta torn skjuter på fiender som följer en förutbestämd bana. Denna version ersätter tidigare krav på rörliga försvarare, närstrid, tornhälsa och läkning. Lägg till det färdiga spelet i portalens tillgängliga spellista.

Detta dokument är byggunderlaget, inte en rapport om genomförd implementation eller balansmätning. En spelversion och SVG-filer finns redan under games/ramen-legion-td; återanvänd fungerande delar och kontrollera avvikelser mot denna specifikation.

**Användarens fasta krav:**

- Spelet heter **Legion TD Vibe**.
- Bloons-liknande bandesign: fasta torn, synliga projektiler och fiender som följer banan.
- Fantasifulla, illustrerade torn som laddas från riktiga bildfiler. CSS används för gränssnittet.
- Döda fiender ger pengar.
- Varje våg blir svårare.
- Sparade pengar ger 5 % ränta per runda.
- Valutan heter **Ramen** och saldot får aldrig överstiga **300 000 Ramen**.
- Spelet ska finnas i spellistan i `C:\work\b3vibe`.

**Designförslag som konkretiserar uppdraget:** Tema, enheter, 20 vågor, räntans avräkning och alla balansvärden nedan är föreslagna standardval. Byggagenten kan arbeta direkt från dessa. Balansvärden får justeras efter provspelning; de fasta kraven ska behållas.

## 2. Spelupplevelse och omfattning

Spelnamn: **Legion TD Vibe**. En rosa elefantkung försvarar sitt ramenkök med zebraskyttar, nudelkanoner och andra färgstarka torn. Svensk text, tydliga silhuetter och samma visuella familj som övriga B3 Vibe-spel.

Kärnan är att välja mellan starkare torn nu och mer ränta senare. Placeringen spelar roll genom hur länge tornen kan skjuta på banan: innerkurvor ger lång täckning, raka sträckor passar prickskyttar och stödtorn förstärker grupper. Fiender stannar aldrig för att slåss mot tornen.

Första versionen är ett lokalt enspelarspel med en bana, sex enhetstyper, 20 vågor och ungefär 15–25 minuters speltid. Ingen inloggning eller installation krävs. Fler spelare, skickade fiender, separat arbetarekonomi och permanenta styrkeuppgraderingar ligger utanför första versionen.

## 3. Spelloop

1. En ny match öppnas direkt i byggfas: 500 Ramen, 20 kungaliv och en tom spelplan.
2. Visa nästa vågs fiender, specialegenskaper och beräknad ränta. Spelaren köper, placerar, uppgraderar eller säljer torn.
3. Spelaren väljer **Starta våg**. Ingen tvingande byggtimer i första versionen.
4. Spara räntans underlag och lås byggandet. Tornen står kvar och skjuter automatiskt på mål inom räckvidd.
5. Döda fiender ger Ramen direkt. Fiender som når kungen kostar liv och ger ingen belöning.
6. När alla fiender dött eller läckt avslutas vågen. Om kungen lever betalas räntan ut exakt en gång, följt av en tydlig sammanställning.
7. Behåll tornen på sina platser, ta bort överblivna projektiler och återställ attackernas nedkylningar. Nästa byggfas börjar.
8. Noll kungaliv betyder förlust direkt. Överlevd våg 20 betyder vinst efter slutavräkningen.

Torn saknar hälsa, kan inte skadas och kan inte dö. Ett placerat torn står kvar tills det säljs; det går inte att flytta gratis mellan vågor. Ingen ränta betalas för en våg där matchen förloras. Paus, omladdning och väntan ger ingen extra ränta.

## 4. Ramen och ränta – bindande ekonomiregler

Alla belopp är heltal. Saldot är alltid mellan 0 och 300 000. Köp nekas om pengar saknas. Varje positiv insättning begränsas av hur mycket plats som finns kvar till taket; överskott försvinner och sparas inte i en dold reserv.

**Avräkning:**

```text
Vid vågstart:
  ränteunderlag = aktuellt saldo efter alla köp och försäljningar

Vid fiendedöd:
  saldo = min(300000, saldo + fiendens belöning)

Efter överlevd våg, exakt en gång:
  beräknad_ränta = floor(ränteunderlag * 5 / 100)
  utbetald_ränta = min(beräknad_ränta, 300000 - saldo)
  saldo = saldo + utbetald_ränta
```

Ramen som tjänas under vågen ger alltså ränta först från nästa våg, om pengarna fortfarande finns kvar när den startar. Tidigare ränta ingår då i saldot och kan ge ränta i sin tur. Fem procent gäller varje överlevd våg, även om någon fiende läcker.

Exempel: Spelaren har 1 000 Ramen, köper för 400 och startar med 600. Under vågen tjänar spelaren 120. Räntan är 30 och slutsaldot blir 750. Nästa våg kan ge ränta på 750 om inget köps.

Takexempel: Underlaget är 290 000. Fiender ger 8 000, så saldot är 298 000 före ränta. Beräknad ränta är 14 500 men bara 2 000 betalas ut. Slutsaldo: 300 000. Visa att 12 500 inte fick plats.

Visa alltid **Ramen: 1 250 / 300 000** och i byggfas **Ränta nästa våg: 62 Ramen före saldotak**. Under strid visas den låsta räntan. Avrunda aldrig uppåt. Använd exakt saldo i detaljvyn, även om kompakt mobilvisning använder exempelvis 12,5k.

Ingen automatisk rundbonus i första versionen. Inkomsterna kommer från dödade fiender och ränta. Det stora saldotaket är en absolut gräns, inte ett mål som en vanlig 20-vågsmatch måste nå.

## 5. Spelplan och strid

En färgstark bana sedd snett ovanifrån, med logik i ett 12 × 9-rutnät. En tydlig slingrande stig löper från ingång till ramenköket. Återanvänd befintlig banfunktion som utgångspunkt; visa ingång, färdriktning och mål. Bygg endast på lediga markrutor bredvid stigen. Tornen blockerar aldrig fiendernas väg.

Varje torn har en fast position från köp till försäljning. Bara vapendelen får vridas eller animeras när det skjuter. Fiender går längs ordnade vägsegment och deras framsteg mäts som tillryggalagd sträcka. De varken söker, angriper eller kolliderar med tornen. Ingen tornhälsa, närstrid eller läkning finns i regler, butik, statistik eller uppgraderingar.

Visa tornets räckvidd vid placering och markering. Anfallstorn kan välja målprioritet **Först**, **Sist**, **Starkast** eller **Närmast**. Först är standard och betyder längst fram längs banan, inte närmast tornet. Starkast betyder högst aktuell hälsa. Använd lägst spawn-ID vid lika värden. Välj bland levande mål inom räckvidd vid varje skott; varje avfyrad projektil låser sitt mål.

Projektiler ska synas och skadan registreras vid träff, inte vid avfyrning. För första versionen kan skott följa målet med högre fart än den snabbaste fienden. Om målet redan dött eller läckt försvinner skottet utan ny belöning. Ett mål som lämnar räckvidden kan fortfarande träffas av ett redan avfyrat skott. Ingen vänlig eld. Områdesskada beräknas kring träffpunkten, en gång per projektil och fiende.

Begränsa en våg till 120 sekunder simuleringstid. Kvarvarande fiender räknas då som läckor utan belöning; visa en nedräkning sista tio sekunderna. Normal banlängd och hastighet ska låta även långsamma fiender nå slutet före tidsgränsen utan kyla.

Vanliga fiender tar ett kungaliv när de läcker. Bossar tar fem. En död eller läckt fiende kan bara avräknas en gång. Alla anfallstorn kan träffa alla fiendetyper i första versionen.

## 6. Torn – roller, utseende och första balansutkast

Avstånd mäts i rutor. Skada är per projektil och intervall i sekunder. Värdena utgår från befintliga torndata men är inte ett påstående om färdig balans. Alla anfall är avståndsattacker. Stödtornet skjuter inte; dess synliga aura förklarar funktionen.

| Torn | Pris | Skada / intervall | Räckvidd | Funktion och bildidé |
|---|---:|---:|---:|---|
| Zebravakt | 100 | 20 / 0,9 | 2,6 | Billig snabbskytt; zebra i kopparrustning på rund sockel med dubbel bambupipa |
| Nudelskytt | 150 | 55 / 1,6 | 6,0 | Prickskytt; lång nudelarmborst, kikarsikte och turkos halsduk |
| Buljongkanon | 220 | 40 / 1,5 | 3,0 | Explosiv buljongkula, radie 1,2; stor mässingsgryta med tryckmätare och ånga |
| Chilikastare | 260 | 26 / 0,7 | 3,2 | Snabb områdesskada, radie 0,9; röd drakformad chilikanon med glödande magasin |
| Iskock | 200 | 14 / 1,2 | 3,0 | Isprojektil bromsar 35 % i 2 sekunder; kristallkittel, frost och stor kockmössa |
| Ramenmunk | 240 | Ingen attack | 2,5 aura | +25 % skada och +15 % räckvidd för närliggande anfallstorn; svävande nudelskål och gyllene runring |

Explosioner ger full skada inom angiven radie i första versionen. Kyla påverkar rörelsefart; flera effekter förnyar varaktigheten men staplas inte. Bossar bromsas 12 %. Pansarreduktion appliceras efter tornets skadebonus, och slutlig skada avrundas en gång till närmaste heltal med minimum 1.

Ramenmunkens aura avgörs av tornens centrumavstånd och använder alltid munkens egen auraradie. Auran påverkar inte andra stödtorn eller munken själv. Flera munkar staplas inte: använd den starkaste tillämpliga bonusen. Skadebonus låses när projektilen avfyras. Visa vilka torn som förstärks när munken markeras.

Varje anfallstorn kan uppgraderas en gång i byggfas för 150 % av grundpriset och får dubbel grundskada. Intervall, räckvidd och specialeffekter behålls. Munken uppgraderas för 360 Ramen till +40 % skada och +20 % räckvidd, med samma auraradie. Visa faktiska värden och en tydligt förändrad tornbild efter uppgraderingen.

Torn går inte att flytta efter placering. Försäljning ger `floor(0,70 × totalt betalt för tornet inklusive uppgradering)`, begränsat av saldotaket. Köp, uppgradering och försäljning är låsta under strid. Visa återbetalningen innan försäljning utförs. Att sälja och köpa på en annan plats är det avsiktliga sättet att ändra placering.

### Bildkrav till byggagenten

Målet är ett sammanhängande, illustrerat spelutseende med tydliga material, ljus, skuggor och karaktär. Använd färgstark fantasy i snett ovanifrånperspektiv. Hämta inspiration från läsbarheten och detaljnivån i välgjorda tower defense-spel och skapa en egen uppsättning figurer.

- Leverera egna genererade/illustrerade PNG- eller WebP-bilder med transparent bakgrund för alla sex torn i grundversion och uppgraderad version: minst 12 tornbilder. Befintliga SVG-filer kan användas som skisser eller tillfälliga platshållare; slutleveransen ska uppfylla den illustrerade detaljnivån, inte bara byta filformat på enkla former.
- Skapa separata bilder för de sex fiendetyperna, kungen och minst fem projektiltyper. Lägg till en illustrerad banbakgrund med tydligt synlig stig och byggbar mark.
- Tornbilder bör vara cirka 512 × 512 pixlar före nedskalning, med gemensam baslinje, perspektiv och ljusriktning. Kontrollera läsbarheten vid faktisk spelstorlek, ungefär 48–80 pixlar. Inga texter, knappar eller räckviddsringar inbakade i bilderna.
- Gör silhuetterna olika: lång pipa för prickskytt, bred gryta för kanon, spetsig kristall för is och rund runring för stöd. Uppgraderingar ska ändra utrustning och form, inte bara färg eller storlek.
- Använd bilder i både butik och spelplan. CSS sköter layout och gränssnitt. Canvas kan rita bildfiler, räckviddsringar och effekter, men huvudfigurerna ska komma från bildfiler.
- Rekyl, kort mynningsblixt, träffeffekt och mjuk skugga ger liv. Stödtorn visar en diskret pulserande aura. Effekter ska inte dölja fiender eller göra det svårt att läsa banan.
- Lägg till `bilder/manifest.json` med bildväg, roll och ursprung. För material från ett tillgångsbibliotek ska källa, licens och eventuell attribution dokumenteras. För eget eller genererat material anges detta. Kopiera inte figurer eller bildfiler ur andra spel som genväg; använd egen eller uttryckligen licensierad grafik.
- Ladda bilderna innan matchen startar och visa ett begripligt fel om en fil saknas. Behåll filer lokalt så spelet fungerar utan externa bildanrop. Komprimera bilder och återanvänd inlästa resurser; undvik att ladda om bilder varje bildruta.

## 7. Vågor och progression

Använd reproducerbara vågdata, så samma våg har samma fiender i varje normal match. Följande värden är ett startförslag som måste provspelas, inte påstått färdigbalanserade siffror.

För våg `w`, från 1 till 20:

```text
Vanligt antal = 8 + 2 × w
Bashälsa = round(45 × 1,16^(w - 1))
Basbelöning per fiende = 10 + 2 × w
Rörelsefart = 1,5 rutor per sekund
Spawnintervall = 0,45 sekunder; alla följer samma bana från dess ingång
```

Modifierare multiplicerar basvärdena; hälsa avrundas till närmaste heltal efter modifiering, belöning avrundas nedåt.

| Typ | Hälsa | Fart | Belöning | Egenskap |
|---|---:|---:|---:|---|
| Standard | ×1 | ×1 | ×1 | Grundfiende |
| Snabb | ×0,7 | ×1,8 | ×1 | Kort tid inom tornens räckvidd |
| Svärm | ×0,45 | ×1,2 | ×0,5 | Dubbelt antal; bra mål för områdesskada |
| Pansrad | ×1,5 | ×0,8 | ×1,5 | Tar 25 % mindre skada från alla attacker |
| Elit | ×2 | ×1 | ×2 | Färre men starkare mål |
| Boss | ×12 | ×0,7 | ×10 | Fem kungaliv vid läcka; minskad köldeffekt |

Vågtyper:

- 1–4: standard, standard, snabb, svärm.
- 5: boss med standardeskort.
- 6–9: pansrad, snabb, svärm, elit.
- 10: boss med pansrad eskort.
- 11–14: standard, svärm, snabb, elit.
- 15: boss med snabb eskort.
- 16–19: pansrad, svärm, elit, blandat.
- 20: slutboss med blandad eskort. Bossens hälsa får ytterligare ×1,5.

Standard-, snabb- och pansarvågor använder vanligt antal. Svärmvågor använder dubbelt antal. Elitvågor använder `ceil(vanligt antal / 2)`. Blandat växlar deterministiskt mellan standard, snabb och pansrad med totalt vanligt antal. Bossvågor har en boss och `ceil(vanligt antal / 2)` eskorter; bossen kommer sist. Blandad eskort använder samma växling.

Fiendehälsan ökar varje våg; dessutom introduceras nya taktiska problem. Kontrollera genom provspel att typbyten inte gör senare vågor märkbart lättare. Justera antal eller modifierare vid behov och dokumentera ändringen.

## 8. Roliga idéer och prioritering

**Med i första versionen:**

- **Boss var femte våg:** stor figur, separat hälsomätare, tydlig förvarning och ljudsignal. Teman kan vara Diskmonstret, Chilikrabban, Soppdraken och Den Hungrige Kocken. Använd samma grundmekanik för att hålla bygget hanterbart.
- **Tydlig sparspänning:** visa hur varje köp påverkar nästa ränta. Ett köp för 200 betyder normalt 10 mindre i ränta om underlaget minskar med exakt 200.
- **Placering som gör skillnad:** innerkurvor låter torn skjuta längre på samma fiende, is ökar tiden i eldzonen och munken belönar täta torngrupper. Prickskyttar tar stora mål och explosioner slår mot svärmar.
- **Matchsammanfattning:** klarad våg, antal dödade fiender, total utbetald ränta, intjänad Ramen och återstående kungaliv.

**Bra utbyggnader efter en fungerande och balanserad första version:**

1. **Tre kryddval efter bossar.** Välj exempelvis Chili (+10 % skada), Buljong (+15 % explosionsradie) eller Ingefära (+10 % räckvidd). Ger olika tornbyggen mellan matcher utan att ändra räntan.
2. **Riskbeställning.** Före vågen kan spelaren beställa extra fiender med synlig extrabelöning. Räntesatsen är fortfarande 5 %.
3. **Elementkombinationer.** Is kan göra fiender extra sårbara för nästa chiliattack, vilket belönar blandade arméer.
4. **Oändligt läge.** Frivillig fortsättning efter våg 20 med separat resultat och fortsatt svårighetsökning. Kan ge saldotaket större betydelse.
5. **Dagens meny.** Ett dagligt frö ger samma enhetsutbud och vågor för alla, så resultat går att jämföra.
6. **Samarbete.** Två spelare försvarar samma kung på varsin sida. Kräver separat nätverksdesign och ingår inte i detta bygguppdrag.

Bygg inte alla utbyggnader på en gång. Prioritera en tydlig ekonomiloop, läsbar strid och intressanta tornplaceringar.

## 9. Gränssnitt och styrning

Överst: Ramen och tak, låst/förväntad ränta, kungaliv samt våg X/20. Visa alltid aktuell fas. Vid sidan av eller under planen: butik med pris, statistik och tydligt valt föremål. Nästa vågs egenskaper ska vara synliga i byggfas.

Mus och touch: välj enhet i butiken och klicka/tryck på en ledig ruta. Välj placerat torn för att se målprioritet, Uppgradera och Sälj. Visa räckvidd och eventuella aurabonusar. En Avbryt-knapp avbryter placering. Ogiltiga köp eller placeringar visar ett begripligt meddelande utan att dra pengar.

Tangentbord: 1–6 väljer enhet, piltangenter flyttar rutmarkören, Enter placerar eller väljer, mellanslag startar nästa våg i byggfas, P pausar. Genvägar ska inte ta över när fokus ligger i ett inmatningsfält eller orsaka dubbla knapptryckningar. Escape behåller portalens funktion för att återgå till huvudmenyn; använd inte Escape för att avbryta placering.

Knappar: **Starta våg**, **Pausa/Fortsätt**, **1×/2×**, **Starta om**, **Till huvudmenyn**. Hastighetsvalet påverkar hela simuleringen lika och ändrar inga belopp eller sannolikheter. Döljd flik pausar spelet; återkomst kräver Fortsätt. Visa tydligt att en omstart raderar pågående match och kräv bekräftelse om matchen är igång.

Använd stora touchytor, läsbara kontraster och symboler tillsammans med färger. Ljud kan slås av. Layouten ska fungera på dator och mobil; butiken får flyttas under planen. Låt HTML-knappar och statusmeddelanden bära viktig information även om striden ritas i canvas.

## 10. Integration i det befintliga projektet

Kontrollerat i projektet den 24 september 2026: portalen använder statisk HTML, CSS och JavaScript. `app.js` hämtar `games.json`; mappar upptäcks inte automatiskt. Befintligt gemensamt utseende finns i rotens `style.css`. Gemensamma spelkontroller finns i `games/common.js`.

Byggagenten ska läsa eventuella `AGENTS.md` och kontrollera aktuellt arbetsläge före ändringar. Projektet har redan lokala ändringar; bevara dem och andra spel.

Föreslagen filstruktur:

```text
C:\work\b3vibe\games\ramen-legion-td\index.html
C:\work\b3vibe\games\ramen-legion-td\game.js
C:\work\b3vibe\games\ramen-legion-td\style.css
C:\work\b3vibe\games\ramen-legion-td\data.js   (valfri separat balansdata)
```

Återanvänd `../../style.css` och komplettera med lokal, avgränsad CSS. Lägg in `.game-shell`, `.toolbar`, en canvas med uttrycklig bredd/höjd och `#status`, samt ladda `../common.js` med `defer` för befintligt Escape- och helskärmsstöd. Använd `#start` för omstartsknappen om samma verktygsradsmönster används. Ha en synlig länk till `../../index.html`.

När spelet fungerar ska följande objekt läggas till i befintliga `games.json`, utan att ersätta andra poster:

```json
{
  "name": "Legion TD Vibe",
  "folder": "ramen-legion-td",
  "description": "Placera dina torn, stoppa fiendevågorna och få 5 % ränta på sparad Ramen.",
  "tag": "TOWER DEFENSE",
  "controls": "Mus / Touch / 1–6",
  "number": "10"
}
```

Nummer 10 är nästa nummer vid inspektionen; välj nästa lediga nummer om listan har ändrats. Lägg gärna en egen kortillustration under `.game-card.ramen-legion-td` i portalens `style.css` och kontrollera hur befintliga kort ritas innan ändringen. Uppdatera `README.md` med spelets regler och styrning.

Inga nya paket eller byggsteg krävs för att spela. Bildgenerering eller illustration görs under utvecklingen; de färdiga bildfilerna följer med projektet. Se bildkraven i avsnitt 6. Första versionen behöver ingen serverändring eller delad topplista. Ett lokalt personbästa får sparas i en egen versionsmärkt localStorage-nyckel; lagringsfel får aldrig hindra spel. Pågående match behöver inte kunna återupptas efter omladdning.

## 11. Implementeringsprinciper

Separera tillstånden byggfas, strid, vågresultat, paus, vinst och förlust. Paus ska komma ihåg vilket tillstånd som pausades. Använd en gemensam ekonomifunktion för alla saldoändringar och en unik avräkningsmarkör per våg.

Håll definitioner för enheter, fiender och vågor i samlad balansdata. Separera tornens fasta positioner från fiendernas hälsa och framsteg på banan samt projektilernas tillstånd. Rensa gamla fält och logik för tornhälsa, förflyttning, närstrid och läkning, även om de finns kvar i den äldre implementationen. Använd fast tidssteg för simuleringen och `requestAnimationFrame` för rendering; undvik att stridshastighet beror på skärmens bildfrekvens. Återupptagning ska inte spela ikapp dold tid.

Genomför bygget i ordning: portalöppning och spelplan, köp och placering, fungerande strid, vågövergångar, ränta och tak, sex enheter och bossar, mobilstyrning och slutlig provspelning. Registrera den färdiga spelvägen i spellistan och kontrollera att öppning från portalen fungerar.

## 12. Klart när följande är verifierat

- Spelet syns i portalens lista och öppnas utan konsolfel via projektets webbserver. Övriga spelkort finns kvar.
- Ny match börjar med exakt 500 Ramen, 20 kungaliv och byggfas inför våg 1.
- Köp, uppgradering och försäljning fungerar i byggfas och är låsta i strid. Placerade torn kan inte flyttas och banrutor kan inte bebyggas. Ogiltig placering debiterar inget.
- Fiendedöd ger exakt en belöning. Läcka ger ingen belöning och rätt livsförlust. Noll liv stoppar matchen utan ränta.
- Ekonomiexemplet 1 000 − 400 + 120 + 30 ger exakt 750. Underlag 19 ger 0 ränta; underlag 20 ger 1.
- Takexemplet 290 000 + 8 000 + begränsad ränta ger exakt 300 000. Testa även taket vid fiendebelöning och försäljning.
- Ränta kommer en gång per överlevd våg. Dubbelklick, paus, 2× fart och upprepade uppdateringar får inte skapa extra pengar.
- Alla fiender i en våg måste ha spawnat och sedan dött eller läckt före avräkning. Timeout avräknar kvarvarande fiender som läckor en gång.
- Torn behåller exakt samma position mellan och under vågor. Kyla, stödauror och områdesskada följer beskrivna regler; auran kan inte staplas. Ingen tornhälsa eller läkning visas.
- Alla 20 vågor går att spela; bossar finns på 5, 10, 15 och 20. Seger visas bara om kungen överlever slutvågen.
- Minst två olika tornbyggen provas till slutet för balans. Kontrollera särskilt om sparande blir för starkt eller om en enda enhetstyp alltid vinner. Justera föreslagna balansvärden utifrån observerade resultat.
- Mus, touch, tangentbord, paus, omstart, 2× fart, helskärm och återgång till portalen fungerar. Flikbyte ger ingen förlorad matchtid.
- Testa dator och smal mobilvy. Kontrollera prestanda med den största svärmen; redovisa vilken hårdvara/webbläsare som faktiskt testats och markera Raspberry Pi som oprövad om den inte finns tillgänglig.

- Fiender följer hela banan, även när torn finns nära, och söker aldrig upp torn. Först/Sist använder banframsteg, Starkast aktuell hälsa och Närmast avstånd till tornet.
- Skott är synliga, orsakar skada först vid träff och kan inte ge dubbla belöningar om flera projektiler når samma fiende. Räckvidd visas korrekt även med stödaura.
- Alla sex torn har tydligt olika illustrerade bildfiler och synligt ändrad grafik efter uppgradering. Bilderna fungerar i både butik och på planen, även i mobilstorlek. Inga saknade bildfiler eller oavsiktliga vita bakgrunder.
- Bildernas ursprung finns i manifestet och spelet fungerar utan externa bildanrop. Den befintliga spelposten uppdateras i stället för att dupliceras om den redan finns i games.json.

Automatisera främst ekonomi, engångsavräkning, målval och vågtillstånd. Använd verklig provspelning för läsbarhet, känsla och balans. Byggagentens slutrapport ska ange ändrade filer, kontroller som utförts, eventuella balansjusteringar och kvarstående begränsningar.
