# Legion TD Vibe – speldesign och bygguppdrag

Version 4.0 · 24 september 2026 · Projekt: `C:\work\b3vibe`


> Aktuell implementation, 25 september 2026: välj först klass och sedan karta innan matchen börjar. Varje klass har sex torn (18 totalt) och är låst under matchen. Byggande, uppgraderingar och runor tillåts under strid; försäljning endast mellan vågor. Varje uppgraderingsspår har sex nivåer. Dessa regler ersätter äldre motsägande uppgifter nedan. README-avsnitten om expansion och klassval beskriver den aktuella versionen och dess 25 godkända tester.
## 1. Uppdrag till byggagenten

Bygg vidare på Legion TD Vibe i den befintliga B3 Vibe-portalen. Den nya spelmodellen är inspirerad av Bloons: fasta torn skjuter på fiender som följer en förutbestämd bana. Denna version ersätter tidigare krav på rörliga försvarare, närstrid, tornhälsa och läkning. Lägg till det färdiga spelet i portalens tillgängliga spellista.

Detta dokument är byggunderlaget, inte en rapport om genomförd implementation eller balansmätning. En spelversion och SVG-filer finns redan under games/ramen-legion-td; återanvänd fungerande delar och kontrollera avvikelser mot denna specifikation.

**Användarens fasta krav:**

- Spelet heter **Legion TD Vibe**.
- Bloons-liknande bandesign: fasta torn, synliga projektiler och fiender som följer banan.
- Fantasifulla, illustrerade torn som laddas från riktiga bildfiler. CSS används för gränssnittet.
- Varje torn har separata uppgraderingar för skada, räckvidd och eldhastighet, med tydliga priser och effekter.
- Varje torn förklaras i spelet med roll, attack, specialeffekt, styrkor och placeringstips.
- Döda fiender ger pengar.
- Varje våg blir svårare.
- Sparade pengar ger 5 % ränta per runda.
- Valutan heter **Ramen** och saldot får aldrig överstiga **300 000 Ramen**.
- Spelet ska finnas i spellistan i `C:\work\b3vibe`.

**Designförslag som konkretiserar uppdraget:** Tema, enheter, 20 vågor, räntans avräkning och alla balansvärden nedan är föreslagna standardval. Byggagenten kan arbeta direkt från dessa. Balansvärden får justeras efter provspelning; de fasta kraven ska behållas.

## 2. Spelupplevelse och omfattning

Spelnamn: **Legion TD Vibe**. En rosa elefantkung försvarar sitt ramenkök med zebraskyttar, nudelkanoner och andra färgstarka torn. Svensk text, tydliga silhuetter och samma visuella familj som övriga B3 Vibe-spel.

Kärnan är att välja mellan starkare torn nu och mer ränta senare. Placeringen spelar roll genom hur länge tornen kan skjuta på banan: innerkurvor ger lång täckning, raka sträckor passar prickskyttar och stödtorn förstärker grupper. Fiender stannar aldrig för att slåss mot tornen.

Första versionen är ett lokalt enspelarspel med en bana, sex enhetstyper, 20 vågor och ungefär 15–25 minuters speltid. Ingen inloggning eller installation krävs. Fler spelare, skickade fiender, separat arbetarekonomi och styrkeuppgraderingar som följer med mellan matcher ligger utanför första versionen. De separata skade- och räckviddsuppgraderingarna inom en match ingår.

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

Visa tornets räckvidd vid placering och markering. Anfallstorn kan välja målprioritet **Först**, **Sist**, **Starkast** eller **Närmast**. Först är standard och betyder längst fram längs banan, inte närmast tornet. Starkast betyder högst aktuell hälsa. Alla sex torn, inklusive Ramenmunken, har en egen attack och kan välja målprioritet. Använd lägst spawn-ID vid lika värden. Välj bland levande mål inom räckvidd vid varje skott; varje avfyrad projektil låser sitt mål.

Projektiler ska synas och skadan registreras vid träff, inte vid avfyrning. För första versionen kan skott följa målet med högre fart än den snabbaste fienden. Om målet redan dött eller läckt försvinner skottet utan ny belöning. Ett mål som lämnar räckvidden kan fortfarande träffas av ett redan avfyrat skott. Ingen vänlig eld. Områdesskada beräknas kring träffpunkten, en gång per projektil och fiende.

Begränsa en våg till 120 sekunder simuleringstid. Kvarvarande fiender räknas då som läckor utan belöning; visa en nedräkning sista tio sekunderna. Normal banlängd och hastighet ska låta även långsamma fiender nå slutet före tidsgränsen utan kyla.

Vanliga fiender tar ett kungaliv när de läcker. Bossar tar fem. En död eller läckt fiende kan bara avräknas en gång. Alla anfallstorn kan träffa alla fiendetyper i första versionen.

## 6. Torn, uppgraderingar och grafik

### 6.1 Grundvärden och gemensamma regler

Varje torn har nu tre **separata uppgraderingsspår: Skada, Räckvidd och Eldhastighet**, vardera från nivå 0 till 3. Alla tre kan maxas på samma torn. Detta ersätter helt den tidigare engångsuppgraderingen. Ramenmunken får också en egen avståndsattack så att skadeuppgraderingen gör konkret skada för samtliga sex torn; dess stödaura finns kvar.

Alla värden nedan är ett konkret balansutkast som ska provspelas. Avstånd mäts i rutor, skada per projektil och intervall i sekunder. DPS betyder skada per sekund mot ett enda mål, före pansar och stöd, vid kontinuerlig eld. Områdesskada kan ge högre sammanlagd skada mot flera fiender.

| Torn | Grundpris | Grundskada | Intervall | Grundräckvidd | Grund-DPS | Specialitet |
|---|---:|---:|---:|---:|---:|---|
| Zebravakt | 100 | 20 | 0,9 | 2,6 | 22,2 | Billig och jämn enmålsskada |
| Nudelskytt | 150 | 55 | 1,6 | 6,0 | 34,4 | Lång räckvidd, kraftiga enstaka träffar |
| Buljongkanon | 220 | 40 | 1,5 | 3,0 | 26,7 | Explosion med radie 1,2 |
| Chilikastare | 260 | 26 | 0,7 | 3,2 | 37,1 | Snabba explosioner med radie 0,9 |
| Iskock | 200 | 14 | 1,2 | 3,0 | 11,7 | Kyla: −35 % rörelsefart i 2 sekunder |
| Ramenmunk | 240 | 12 | 1,5 | 2,5 | 8,0 | Egen attack och aura som förstärker anfall |

Explosioner ger full skada till varje levande fiende inom radien, inklusive huvudmålet exakt en gång. Kyla staplas inte; en ny träff förnyar varaktigheten. Bossar bromsas 12 %. Isprojektilens skada ökar med skadeuppgraderingar, men köldprocent och varaktighet behålls. Chilikastaren har ingen dold brännskada över tid i denna version.

Ramenmunkens aura ger +25 % skada och +15 % attackräckvidd till de fem andra torntyperna. Munkar förstärker varken sig själva eller andra munkar. Flera auror staplas inte. Munken har egen attackräckvidd och auraradie; båda börjar på 2,5 rutor och ökar med munkens räckviddsspår. Skadespåret förbättrar munkens egen projektil, inte aurans +25 %. Visa detta uttryckligen i panelen. Avstånd för auran mäts mellan tornens centrum och kräver ingen fri sikt.

### 6.2 Så fungerar varje torn – text och spelbeteende

Varje torn ska få ett läsbart kort i butiken, en utvecklad informationspanel och en sida i en liten **Tornguide**. Beskrivningarna nedan ska finnas tillgängliga inne i spelet, inte bara i dokumentationen. Nybörjaren ska kunna förstå vad tornet gör före ett köp.

**Zebravakt – den pålitliga snabbskytten**

Butikstext: ”Billig skytt som träffar en fiende åt gången. Bra första torn vid en kurva.” Zebran skjuter en bambupil var 0,9 sekund; den dubbla pipan är visuell och betyder inte två träffar. Varje pil träffar ett mål utan genomslag. Tornet är billigt att sprida ut och bra för att fånga snabba fiender som överlever andra torn. Det har kort räckvidd och tappar effektivitet mot täta svärmar eller pansar. Placera nära en innerkurva där samma fiende passerar inom räckvidden länge. Standardvalet Först fungerar bra. Skada passar när många fiender överlever med lite hälsa; räckvidd passar när tornet står sysslolöst medan fiender går precis utanför cirkeln.

Bild: en zebra med tydliga svartvita ränder, läderremmar, kopparaxelskydd och ett bambuvapen på en låg stenplattform. Synliga skruvar och sammanbundna bamburör ger närbildsdetalj. Vid skott följs en kort rekyl av en liten dammpuff. Skadespår: kopparspetsar → förstärkt laddare → guldförstärkt bambukanon. Räckviddsspår: litet sikte → linsrör → upphöjt spanarperiskop. Behåll antalet faktiska projektiler och attackintervallet genom alla nivåer.

**Nudelskytt – prickskytten**

Butikstext: ”Lång räckvidd och hårda enstaka träffar. Bra mot eliter och bossar.” En koncentrerad nudelbult ger 55 grundskada var 1,6 sekund. Bulten går inte igenom flera fiender. Rekommenderad målprioritet är Starkast när stora fiender blandas med svagare; valet görs av spelaren och ändras inte automatiskt. Tornet kan täcka flera sträckor från mitten av kartan. Det skjuter långsamt och kan slösa stor skada på en nästan död svärmfiende. Skada ökar bosskadan; räckvidd ger mer tid att skjuta, men hjälper inte när hela banan redan täcks.

Bild: en lång lackerad nudelarmborst med blankt glas i siktet, lindad trästock, mässingsbeslag och en skytt med turkos halsduk. Förspänd sträng och synlig bult gör funktionen begriplig. Skadespår: stålfjäder → dubbla spännarmar → lysande kärna i bultmagasinet. Räckviddsspår: kort kikarsikte → längre linsuppsättning → stort guldinramat observatörssikte. En skarp rekyl och tunn projektilstrimma skiljer skottet från Zebravaktens.

**Buljongkanon – den tunga sprängaren**

Butikstext: ”Långsamma buljongbomber skadar alla fiender nära träffen. Bra mot täta grupper.” Varje kula ger 40 grundskada inom 1,2 rutor från träffpunkten. Alla inom området kan skadas oavsett vilket mål som valdes. Placera vid en kurva eller nära en Iskock, så fler fiender hinner samlas. Kanonen är svagare mot glest utspridda mål än mot en grupp. Skadespåret ökar varje fiendes träffskada. Räckviddsspåret ökar hur långt bort kanonen kan välja mål; explosionsradien förblir 1,2.

Bild: tung mässingsgryta på ett brett lavettstativ, nitar, keramisk insida, ångventiler, tryckmätare och buljong som lyser genom ett inspektionsfönster. Basen står fast medan vapnet siktar. Skadespår: förstärkt gryta → dubbla tryckkammare → guldklädd övertryckskärna. Räckviddsspår: justerbart sikte → lyftarm för eldröret → optisk avståndsmätare. Kulan har en kort visuellt välvd bana men följer samma träffregler som andra skott. Explosionen blir en snabb buljongstänk-ring som bleknar innan den döljer nästa fiende.

**Chilikastare – svärmrensaren**

Butikstext: ”Snabba chiliskott med liten explosion. Håller trycket uppe mot många svaga fiender.” Varje skott ger 26 grundskada i en radie på 0,9 rutor, var 0,7 sekund. Tornet skjuter tätare än Buljongkanonen men har mindre sprängradie. Det är starkt där fiender passerar samlade, särskilt tillsammans med kyla. Det kostar mer än grundtornen och ersätter inte prickskyttens långa räckvidd. Skada gör varje explosion farligare; räckvidd håller fiender kvar i eldzonen längre. Ingen extra eldskada får räknas utifrån den dekorativa glöden.

Bild: röd drakformad pipa med svarta järnringar, chilimagasin, glödande orange kammare och brända kanter. Drakens käft visar tydligt skjutriktningen. Skadespår: större chilipatroner → glödande tryckkärl → flerskiktad drakkäft. Räckviddsspår: nosring med sikte → förlängd pipinsats → upphöjd riktlins. Små gnistor, snabb rekyl och korta orangeröda träffblommor; inga stora eldväggar.

**Iskock – kontrolltornet**

Butikstext: ”Bromsar fienden så andra torn hinner skjuta mer. Ger också lite direkt skada.” En iskristall ger 14 grundskada och sänker målets rörelsefart 35 % i 2 sekunder. Bossar bromsas 12 %. Flera Iskockar gör inte bromsningen starkare, men kan hålla den aktiv på fler mål. Placera tidigt i ett område som täcks av flera skadetorn. Ensamt har tornet låg skada och kan inte bära försvaret. Skadespåret höjer direkt skada; räckvidd gör att bromsningen kan börja tidigare. Kyla påverkar inte fiendebelöning, pansar eller kungaliv vid läcka.

Bild: en kock med stor vit mössa bakom en blå kristallkittel, silverringar, frostiga beslag och ett tydligt riktat ismunstycke. Skadespår: större iskärna → flerskiktad kristall → ljusblå prismakärna. Räckviddsspår: fokusring → längre kristallmunstycke → tredelad fokuseringslins. Projektilen har en kort iskall svans. Träffad fiende får blå kant och en snöflingesymbol som försvinner när kylan löper ut; den ska aldrig se helt frusen ut när den fortfarande rör sig.

**Ramenmunk – stödet med en egen attack**

Butikstext: ”Förstärker närliggande torn och skjuter små energikulor. Bäst i en grupp.” Munken ger +25 % skada och +15 % attackräckvidd till närliggande anfallstorn. Dess egen lilla nudelorb gör 12 grundskada var 1,5 sekund. Placera där auran når flera torn, inte som ensam första försvarare. Auran behöver inget fiendemål och fungerar hela tiden när de andra tornen är inom auraradien. Skadespåret ökar bara munkens egna skott; räckvidd ökar både munkens skjuträckvidd och området där andra torn kan få stöd. Bonusprocenten och andra torns explosionsradie förändras inte.

Bild: liten munk i krämfärgade och violetta kläder på en rund sockel, svävande nudelskål, bönepärlor, två små lyktor och tydliga guldrunor. Skadespår: lysande pärla → dubbla fokuspärlor → gyllene skål med energikärna. Räckviddsspår: liten rökelsehållare → större runbåge → tredelad lyktkrans. Den diskreta auran visas permanent nära sockeln; hela den funktionella auracirkeln visas vid markering. Skottet ser ut som en liten gyllene nudelorb. Påverkade torn får en liten stödsymbol, inte en kontinuerlig vägg av ljusstrålar.

### 6.3 Separata skade- och räckviddsuppgraderingar

Uppgraderingar köps i byggfas för Ramen. Varje spår köps stegvis: 0 → 1 → 2 → 3. Det finns inget krav på att köpa de andra spåren och ingen gemensam gräns på tre köp. Exempel: ett torn får vara Skada 3 / Räckvidd 3 / Eldhastighet 3. Uppgraderingar gäller bara det enskilda tornet och bara den pågående matchen.

| Nivå | Skademultiplikator från grundvärdet | Räckviddsmultiplikator från grundvärdet |
|---|---:|---:|
| 0 | ×1,00 | ×1,00 |
| 1 | ×1,40 | ×1,15 |
| 2 | ×1,90 | ×1,30 |
| 3 | ×2,60 | ×1,50 |

Multiplikatorerna avser grundvärdet, inte föregående nivå. Skade- och räckviddsspåren ändrar inte attackintervall, projektilfart, explosionsradie, köldeffekt eller aurans bonusprocent. Eldhastighet ändrar bara attackintervallet; se avsnitt 6.5. Detta gör att varje knapp har en tydlig och förutsägbar funktion.

Priset för nästa steg beräknas från tornets grundpris och avrundas upp till närmaste 5 Ramen: `5 × ceil(grundpris × kostnadsfaktor / 5)`. Skadesteg 1/2/3 använder faktorerna 0,60 / 1,00 / 1,60. Räckviddssteg 1/2/3 använder 0,40 / 0,70 / 1,10. Tabellen visar kostnaden för varje enskilt köp, inte totalsumman.

| Torn | Skada 1 | Skada 2 | Skada 3 | Räckvidd 1 | Räckvidd 2 | Räckvidd 3 |
|---|---:|---:|---:|---:|---:|---:|
| Zebravakt | 60 | 100 | 160 | 40 | 70 | 110 |
| Nudelskytt | 90 | 150 | 240 | 60 | 105 | 165 |
| Buljongkanon | 135 | 220 | 355 | 90 | 155 | 245 |
| Chilikastare | 160 | 260 | 420 | 105 | 185 | 290 |
| Iskock | 120 | 200 | 320 | 80 | 140 | 220 |
| Ramenmunk | 145 | 240 | 385 | 100 | 170 | 265 |

Skadevärdet utan aura visas som `round(grundskada × skademultiplikator)`. I striden används det oavrundade värdet fram till slutlig avrundning efter aura och pansar. En skada på 104,5 avrundas till 105. Räckvidden beräknas med full precision och visas med upp till två decimaler.

```text
skada_före_pansar = grundskada × skademultiplikator × (stödd ? 1,25 : 1)
träffskada = max(1, round(skada_före_pansar × (pansrad ? 0,75 : 1)))
attackräckvidd = grundräckvidd × räckviddsmultiplikator × (stödd ? 1,15 : 1)
munkens_auraradie = 2,5 × munkens_räckviddsmultiplikator
```

Skada inklusive aura låses vid avfyrning. Pansar beräknas för varje träffad fiende. Aura räknas om efter köp, uppgradering eller försäljning. Den räckvidd som används för målval ska vara samma som cirkeln visar. Ramenmunkar kan aldrig få `stödd = true`.

Exempel: Zebravakt med Skada 1 och Räckvidd 1 gör 28 skada och når 2,99 rutor utan aura. Totalt betalt är 100 + 60 + 40 = 200 Ramen. Med munkstöd gör den 35 skada mot en vanlig fiende och 26 mot pansar. Räckvidden blir 3,4385 rutor, visad som 3,44. Skada 3 ger 52 utan aura; Räckvidd 3 ger 3,90 utan aura.

Exempel för munken: Skada 1 ger 17 visad projektilskada efter avrundning. Räckvidd 1 ger både skjuträckvidd och auraradie 2,875, visat som 2,88. Stöd till andra torn förblir +25 % skada och +15 % räckvidd. Skada 3 / Räckvidd 3 ger 31 visad egen skada och 3,75 i båda räckvidderna.

Efter nivå 3 visar respektive knapp **MAX NIVÅ** och kan inte debitera fler pengar. Saknas Ramen visar knappen exempelvis **Saknar 35 Ramen**. Under strid visar båda **Tillgängligt mellan vågor**. Validera fas, tornets existens, aktuell nivå och saldo igen när köpet utförs så att dubbelklick inte köper en osynlig extra nivå.

Torn kan inte flyttas efter placering. Försäljning ger `floor(0,70 × totalt faktiskt betalt för tornet och alla tre uppgraderingsspåren)`, begränsat av saldotaket. Visa exakt återbetalning. Zebravakten i exemplet säljs för 140. Sålda nivåer överförs inte till nästa torn.

### 6.4 Grafik – detaljerad art direction och leveranskrav

**Övergripande känsla.** Spelet ska se ut som en illustrerad liten fantasyvärld med ramenkök och uppfinningsrika försvarsmaskiner. Använd samma snett ovanifrån-perspektiv för bana, torn och fiender. Formerna ska vara handmålade och tydliga: varm sten, träfibrer, kopparnitar, blank keramik, frostat glas och tygveck. Ljuset kommer från övre vänster. Skuggor är mjuka och förankrar figurerna i marken. Egna bilder eller licensierade tillgångar används, med gemensam stil.

**Färg och läsbarhet.** Banan har dämpade mossgröna och varma sandfärger; tornens funktionsfärger är koppar/vitt, turkos, mässing, chili­rött, isblått och violett/guld. Hot och läckor signaleras med form, ikon och färg. Markeringar ska inte blandas ihop med projektiler. Små detaljer syns i porträttet, medan stor form och kontrast gör tornet identifierbart på spelplanen. Lägg inte så mycket mönster på marken att fiender försvinner.

**Miljön.** Rita en sammanhängande bakgrund med stenlagd stig, nedtrampade kanter, grästofsar, låga stenmurar, kryddodlingar, bambu, små lyktor och ett ramenkök vid målet. Byggbar mark ska vara lugnare än dekorationerna. Ingången har en port och tydlig riktning. Köket får takpannor, trästolpar, hängande menyplaketter utan liten oläsbar text, ångande gryta och den rosa elefantkungen. Dekoration utanför banan får aldrig se ut som ledig byggmark om den inte är byggbar. Den målade stigens position måste stämma med logikens vägsegment och skalas tillsammans med dem.

**Torngrafik.** Leverera PNG/WebP med riktig transparens. Skapa per torn en fast kropp/bas, fyra vapennivåer (0–3) och tre räckviddstillbehör (1–3; nivå 0 saknar extra tillbehör). Det ger åtta lagerbilder per torn, totalt 48, som kan komponeras till alla 16 kombinationer av Skada 0–3 och Räckvidd 0–3. Detta ersätter version 2:s krav på bara en grundbild och en uppgraderad bild. Alternativt får färdiga kompositbilder levereras för samtliga 16 kombinationer per torn. Använd inte en bild som låtsas visa en uppgradering i det andra spåret.

Lager ska ha gemensamt 512 × 512-format, baslinje, vridpunkt och marginaler. Manifestet anger vilka delar som roteras och vilka som står fast. Kroppen och ansiktet ska inte snurra som en platt bricka när vapnet siktar. Om vapnets perspektiv kräver riktningsbilder, leverera åtta riktningar och välj närmaste riktning vid rendering. Vapnet ska visuellt peka mot skottets riktning och projektilen börja vid mynningen. Separata porträtt eller noggrant beskurna kompositer används i butiken.

**Fiender och bossar.** Skapa sex visuellt åtskilda grundtyper: rund degvarelse för standard, smal chililöpare för snabb, små ärt-/nudelknyten för svärm, sköldförsedd järngryta för pansar och högre maskerad köksväktare för elit. Bossar får fyra egna utseenden: Diskmonstret, Chilikrabban, Soppdraken och Den Hungrige Kocken. Samma bossregler kan användas, men varje boss ska ha egen silhuett och porträtt. Visa gång med minst fyra bildrutor eller en tydlig riggad animation. Fiendens markskugga ska följa dess verkliga position; hälsomätaren sitter över figuren och kan komprimeras i stora svärmar.

**Projektiler och effekter.** Leverera sex projektilbilder: bambupil, nudelbult, buljongkula, chiliskott, iskristall och gyllene nudelorb. Skapa separata korta träffeffekter för fysisk träff, buljongstänk, chili och frost. En enda projektil får bara ge en skadehändelse även om effekten har många bildrutor. Ånga, damm och gnistor är dekorativa. Budgetera högst cirka 120 dekorativa partiklar samtidigt; när gränsen nås tas äldre dekoration bort, aldrig projektiler som fortfarande påverkar striden.

**Animation.** Små tomgångsrörelser på 1–2 sekunder: ånga från grytan, svävande skål och svagt glödande kristall. Vid skott: 80–140 ms rekyl och 60–100 ms mynningsblixt. Vid träff: 150–250 ms effekt, följd av kort upplösning vid fiendedöd. Köp placerar tornet med en kort 150 ms nedtonad landning. Uppgradering ger 300–450 ms skimmer och visar direkt den nya utrustningen. Animationstid får aldrig fördröja reglernas träff, köp eller debitering. 2× spelhastighet skalar stridsanimationerna tillsammans med simuleringen.

**Information över grafiken.** Markerat torn får ren kontur, synlig räckvidd och små separata nivåsymboler för svärd/Skada och kikarsikte/Räckvidd. Använd siffra 0–3, inte bara färg. När en räckviddsuppgradering förhandsvisas visas nuvarande cirkel med heldragen kant och nästa med streckad kant. Munken visar olika linjestilar för attack och aura om de någonsin skiljer sig åt. Undvik flytande skadesiffror för varje träff i stora svärmar; de kan vara ett avstängningsbart tillval.

**Gränssnitt.** Butiken får tydliga illustrerade porträtt, svensk rolltext, pris och primär statistik. Informationspanelen använder en ljus eller mörk enfärgad yta som inte konkurrerar med bilderna. Ett stort porträtt visar vapnets material och uppgraderingar. Använd verklig text ovanpå gränssnittet; baka inte in text, priser eller siffror i bildfiler. Menyknappar ska fungera även om en dekorativ bild saknas.

**Leverans och prestanda.** Lägg bildfiler lokalt under spelets `bilder/`. `manifest.json` anger ID, filväg, torntyp, spår/nivå, dimensioner, vridpunkt, bildrutor och ursprung; för externa tillgångar även källa/licens och attribution. Håll basbilder kring 512 px, projektiler kring 64–128 px och bakgrund högst 2048 px på längsta sidan om inget test motiverar större. Komprimera före leverans; sikta på högst 15 MB initiala bildresurser. Sammansätt lager när utseendet ändras och återanvänd resultatet. Undvik att skapa nya fullstora bilder varje bildruta.

Förladda obligatoriska spelbilder och visa laddningsstatus samt Försök igen vid saknad fil. Lokalt spel kräver inga externa bildanrop. Utvecklingsplatshållare får inte stå kvar som slutlig huvudgrafik. Kontrollera rena transparenta kanter utan vit halo, samma perspektiv och inga avklippta vapen i samtliga uppgraderingskombinationer. Testa vid faktisk spelstorlek 48–80 px, på 1×/2× pixeltäthet och i smal mobilvy. Läget **Minskade effekter** stänger av dekorativa partiklar och starka blixtar men behåller skott, mål, kyla och funktionella räckviddsmarkeringar.


### 6.5 Eldhastighet – tredje uppgraderingsspåret

Användarens tillägg: varje torn ska kunna skjuta snabbare. **Eldhastighet** har nivå 0–3, köps separat för varje torn och kan maxas samtidigt som Skada och Räckvidd. Det finns därmed 64 regelkombinationer per torntyp. Tornen står fortfarande helt stilla.

| Nivå | Skott per sekund relativt grundvärdet | Attackintervall |
|---|---:|---|
| 0 | ×1,00 | grundintervall |
| 1 | ×1,20 | grundintervall / 1,20 |
| 2 | ×1,50 | grundintervall / 1,50 |
| 3 | ×1,90 | grundintervall / 1,90 |

Varje steg kostar 50 %, 90 % respektive 140 % av tornets grundpris, avrundat upp till närmaste 5 Ramen. Exempel: Zebravakt kostar 50 / 90 / 140; Nudelskytt 75 / 135 / 210; Buljongkanon 110 / 200 / 310; Chilikastare 130 / 235 / 365; Iskock 100 / 180 / 280; Ramenmunk 120 / 220 / 340.

Skada per träff, målval, projektilfart, räckvidd, explosionsradie, köldstyrka och aurans bonusprocent ändras inte. Iskocken kan förnya kyla oftare men staplar den aldrig. Munkens uppgradering påverkar bara egna energikulor. Vid nivå 3 skjuter en Zebravakt var 0,473684… sekund i stället för var 0,9; panelen visar 0,47 s. Använd full precision i simuleringen.

Panelen visar ett tredje uppgraderingskort: **ELDHASTIGHET X/3**, nuvarande → nästa skottintervall, nästa teoretiska DPS, pris och räntepåverkan. DPS beräknas som avrundad träffskada mot en vanlig fiende dividerad med faktiskt skottintervall. Utrustningsnamn: Grundladdare → Snabbladdare → Automatisk matning → Överladdat verk. På planen visas en separat hastighetssymbol och nivå. Befintliga 16 bildkombinationer för skada/räckvidd behålls; tätare skott och rekyl visar hastighetsförändringen.

Samma regler gäller för köp mellan vågor, maxnivå, saknade pengar, dubbelklick och återbetalning som för andra spår. Försäljning räknar in alla tre spårens faktiska kostnader. En Zebravakt med enbart hastighet 3 har kostat 100 + 50 + 90 + 140 = 380 och säljs för 266 Ramen före saldotak.

Verifiera alla 64 nivåkombinationer per torntyp. Kontrollera faktiskt antal skott i simuleringen vid nivå 0 och 3 för alla sex torn, inte bara de visade siffrorna. Testa att uppgraderad munk fortfarande inte stärker sin egen attack med aura.

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

Mus och touch: välj enhet i butiken och klicka/tryck på en ledig ruta. Välj placerat torn för att se målprioritet, Uppgradera skada, Uppgradera räckvidd och Sälj. Visa räckvidd och eventuella aurabonusar. En Avbryt-knapp avbryter placering. Ogiltiga köp eller placeringar visar ett begripligt meddelande utan att dra pengar.

Tangentbord: 1–6 väljer enhet, piltangenter flyttar rutmarkören, Enter placerar eller väljer, mellanslag startar nästa våg i byggfas, P pausar. Genvägar ska inte ta över när fokus ligger i ett inmatningsfält eller orsaka dubbla knapptryckningar. Escape behåller portalens funktion för att återgå till huvudmenyn; använd inte Escape för att avbryta placering.

Knappar: **Starta våg**, **Pausa/Fortsätt**, **1×/2×**, **Starta om**, **Till huvudmenyn**. Hastighetsvalet påverkar hela simuleringen lika och ändrar inga belopp eller sannolikheter. Döljd flik pausar spelet; återkomst kräver Fortsätt. Visa tydligt att en omstart raderar pågående match och kräv bekräftelse om matchen är igång.

Använd stora touchytor, läsbara kontraster och symboler tillsammans med färger. Ljud kan slås av. Layouten ska fungera på dator och mobil; butiken får flyttas under planen. Låt HTML-knappar och statusmeddelanden bära viktig information även om striden ritas i canvas.

### Tornpanelen och hjälpen i spelet

Markering öppnar en panel med tornets porträtt, namn och roll överst. Visa en kort förklaring i vanlig svenska, följd av **Skada per träff**, **Attackintervall**, **Räckvidd**, **Specialeffekt** och **Målprioritet**. Visa egen statistik och bonus från Ramenmunk separat. DPS ska märkas som teoretisk enmålsskada per sekund; det är inte garanterad faktisk skada. För munken visas dessutom **Aurastyrka**, **Auraradie** och antal berörda torn.

Tre separata uppgraderingskort visar aktuell nivå av 3, nästa värde, pris, aktuell köpmöjlighet och hur köpet påverkar räntan. Båda går att använda via mus, tangentbord och touch. Knappen köper precis den visade nästa nivån. Efter köp uppdateras panel, saldo, förväntad ränta, tornbild och räckvidd direkt. De andra spårens nivåer behålls.

Exempel för en Zebravakt på nivå 0/0 utan stöd:

```text
ZEBRAVAKT · Snabbskytt
Träffar en fiende åt gången. Bra vid kurvor.
Skada 20 · Skott var 0,9 s · Räckvidd 2,60 rutor
Mål: Först

SKADA 0/3                 RÄCKVIDD 0/3
Nästa: 20 → 28            Nästa: 2,60 → 2,99
Pris: 60 Ramen            Pris: 40 Ramen
[Uppgradera skada]        [Uppgradera räckvidd]

[Mer om tornet]           [Sälj: 70 Ramen]
```

Räntepåverkan beräknas från faktiskt saldo: `floor(saldo × 0,05) − floor((saldo − pris) × 0,05)`. Visa skillnaden före saldotak och visa den bara för köp som spelaren har råd med. Vid 500 Ramen kostar skadeuppgraderingen 60 och minskar beräknad ränta från 25 till 22. Säljbeloppet avser tornet i dess aktuella skick; panelen visar eventuell begränsning vid saldotaket.

**Mer om tornet** öppnar den fullständiga förklaringen från avsnitt 6.2, inklusive vad uppgraderingarna inte förändrar. Hjälp som öppnas under strid pausar simuleringen och visar en Fortsätt-knapp. På mobil visas panelen under planen eller som en hopfällbar nederpanel; stängning lämnar tornen och matchen oförändrade. Första gången spelaren markerar ett torn ges kort hjälp: ”Skada gör varje träff starkare. Räckvidd låter tornet skjuta längre.”

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

Spara damageLevel, rangeLevel och speedLevel separat per torn samt faktiskt investerat belopp. Beräkna statistik från grunddata och nivåer vid behov i stället för att multiplicera redan uppgraderade värden igen. Använd samma beräkning för panel, räckviddscirkel och strid. Versionsmärk eventuell sparad tornstruktur; anta inte att äldre engångsuppgraderingar motsvarar nivåer i båda de nya spåren.

Genomför bygget i ordning: portalöppning och spelplan, köp och placering, fungerande strid, vågövergångar, ränta och tak, sex torn och bossar, alla tre uppgraderingsspåren, fullständig tornguide, illustrerade bilder och animationer, mobilstyrning och slutlig provspelning. Registrera den färdiga spelvägen i spellistan och kontrollera att öppning från portalen fungerar.

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

- Varje torntyp kan köpas och uppgraderas oberoende till Skada 3 / Räckvidd 3. Skadeköp ändrar inte räckviddsnivån eller attackintervallet. Räckviddsköp ändrar inte skadenivån, explosionsradien eller köldeffekten.
- Prislistan stämmer med avrundningsregeln. Köp utan täckning, köp under strid och köp över nivå 3 nekas utan debitering. Ett dubbelklick på en visad nivå ska inte tyst köpa nästa nivå också.
- Zebravakt 1/1 kostar totalt 200, gör 28 grundskada, når 2,99 rutor och säljs för 140. Med stöd är vanlig träffskada 35, pansarträff 26 och räckvidd 3,4385. Panelen och faktisk strid stämmer överens.
- Ramenmunkens båda spår påverkar dess egna skott; räckvidd påverkar även auran. Nivå 1/1 ger 17 visad egen skada och 2,875 i attackräckvidd/auraradie. Munkens stödprocent ändras inte och munkar förstärker aldrig varandra.
- Om flera munkar når samma torn används stöd en gång. Försäljning av en munk tar bort bonusen när ingen annan når tornet. Testa även efter uppgraderad auraradie.
- Testa samtliga 16 nivåpar visuellt per torn: rätt vapen, rätt räckviddstillbehör, inga avklippta bilder och korrekt vridpunkt. Kombination 3/0 får inte se ut som 3/3.
- Butik och Tornguide innehåller en begriplig förklaring för alla sex torn, inklusive svagheter och placeringstips. Båda uppgraderingskorten visar pris och före/efter-värden även på mobil och vid tangentbordsstyrning.
- Banan i bakgrundsbilden följer fiendernas verkliga väg. Detaljer, skuggor och animationer får inte dölja mål, räckvidd eller byggbar mark. Kontrollera reducerade effekter och största svärmen vid 2× hastighet.
- Provspela både tidiga skadeuppgraderingar och tidiga räckviddsuppgraderingar. Kontrollera att fler billiga torn och färre uppgraderade torn båda har användbara roller; rapportera observerad balans utan att påstå att oprövade varianter är verifierade.
Automatisera främst ekonomi, uppgraderingskostnader, statistikberäkning, engångsavräkning, målval och vågtillstånd. Använd verklig provspelning för läsbarhet, känsla och balans. Byggagentens slutrapport ska ange ändrade filer, kontroller som utförts, eventuella balansjusteringar och kvarstående begränsningar.

## Karttillägg: fyra landskap

Implementerat i projektet: Bambulunden (ursprunglig bana), Frostpasset (snö och hårnålskurvor), Solravinen (sandstensravin och lång ytterkant) och Glödkratern (basalt, lava och kortare sicksackväg). Varje karta har unik ortogonal rutt, eget landskap, vägmaterial, miniatyr och placeringstips. Grön startmarkering visar ingång och färdriktning; alla rutter avslutas vid ramenköket.

Kartväljaren förhandsvisar utan att ändra pågående match. Spela vald karta startar en ny match, med bekräftelse om spelaren redan har byggt eller kommit förbi första vågen. Starta om behåller kartan. Alla kartor använder samma ekonomi, fiender och uppgraderingar. Landskapsdekorationer ändrar inte tornens eller fiendernas egenskaper.

## Progressionsexpansion (2026-09-25)

Implementationen omfattar nu 13 torn i Nudelköket, Tehuset och Arkana orden; sex nivåer per skade-, räckvidds- och eldhastighetsspår; fyra valbara specialrunor; bossarnas sigill och bonusval; helande fiender från våg 16 samt valbar expedition till våg 40. Se avsnittet "Expansion: bossbelöningar, runor och tre tornklasser" i README.md för aktuella siffror, begränsningar och verifiering. Dessa regler ersätter tidigare begränsningar till tre nivåer och sex torn i dokumentet.
