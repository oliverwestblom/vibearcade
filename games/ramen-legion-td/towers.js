// Guidetexter per torn. damageNames och rangeNames har sju poster: niva 0-3
// kops med Ramen, niva 4-6 ar mastarnivaer och kraver ett mastarmarke fran en
// dodad boss.
const LTD_GUIDE = {
  zebravakt: {
    role: 'Snabbskytt', color: '#eabf7b', projectile: 0,
    summary: 'Billig skytt som träffar en fiende åt gången. Ett bra första torn vid en kurva.',
    attack: 'En bambupil ger 20 grundskada var 0,9 sekund. Den dubbla pipan är ett vapen, inte två träffar. Pilar går inte igenom flera fiender.',
    strength: 'Jämn skada till lågt pris. Fångar snabba fiender som överlevt andra torn.',
    weakness: 'Kort räckvidd och ingen områdesskada. Täta svärmar och pansar kräver hjälp.',
    placement: 'Placera nära en innerkurva där tornet kan skjuta länge på samma fiende. Börja med målprioriteten Först.',
    upgrades: 'Skada gör varje pil starkare. Räckvidd låter skytten täcka fler delar av banan. Använd eldhastighet för att skjuta snabbare.',
    damageNames: ['Bambupipa', 'Kopparspetsar', 'Förstärkt laddare', 'Guldkanon', 'Mästarpipa', 'Zebrakungens gevär'],
    rangeNames: ['Öppet sikte', 'Riktsikte', 'Linsrör', 'Spanarperiskop', 'Mästarsikte', 'Örnöga']
  },
  nudelskytt: {
    role: 'Prickskytt', color: '#77d7cf', projectile: 1,
    summary: 'Lång räckvidd och hårda enstaka träffar. Bra mot eliter och bossar.',
    attack: 'En koncentrerad nudelbult ger 55 grundskada var 1,6 sekund. Bulten träffar en fiende utan genomslag.',
    strength: 'Kan bevaka flera bansträckor från kartans mitt. Hög skada per träff.',
    weakness: 'Långsam eld. En stor träff på en nästan död fiende kan slösa mycket skada.',
    placement: 'Placera centralt. Välj Starkast för eliter och bossar, eller Först för att stoppa läckor.',
    upgrades: 'Skada förbättrar bossbekämpning. Räckvidd ger fler skottillfällen, men hjälper inte när hela banan redan täcks.',
    damageNames: ['Träarmborst', 'Stålfjäder', 'Dubbla spännarmar', 'Energimagasin', 'Mästarspännare', 'Drakbultkastare'],
    rangeNames: ['Öppet sikte', 'Kikarsikte', 'Linsuppsättning', 'Observatörssikte', 'Mästarkikare', 'Stjärnsikte']
  },
  buljongtank: {
    role: 'Tung sprängare', color: '#efbf64', projectile: 2,
    summary: 'Buljongbomber skadar alla fiender nära träffen. Stark mot täta grupper.',
    attack: '40 grundskada var 1,5 sekund. Alla fiender inom 1,2 rutor från träffen får full skada, var och en exakt en gång.',
    strength: 'Stor sprängradie. En enda kula kan träffa många fiender.',
    weakness: 'Långsam eld och kortare räckvidd. Glest utspridda fiender utnyttjar svagheten.',
    placement: 'Bra vid kurvor tillsammans med Iskocken, som håller fienderna längre i eldzonen.',
    upgrades: 'Skada höjer skadan på varje träffad fiende. Räckvidd ökar avståndet till målet; explosionsradien stannar på 1,2.',
    damageNames: ['Buljonggryta', 'Förstärkt gryta', 'Tryckkammare', 'Övertryckskärna', 'Mästargryta', 'Vulkankärl'],
    rangeNames: ['Öppet sikte', 'Justerbart sikte', 'Riktarm', 'Avståndsmätare', 'Mästarriktare', 'Ballistikbord']
  },
  chilikastare: {
    role: 'Svärmrensare', color: '#ff986b', projectile: 3,
    summary: 'Snabba chiliskott med liten explosion. Håller trycket uppe mot svärmar.',
    attack: '26 grundskada var 0,7 sekund inom 0,9 rutor från träffen. Den synliga glöden ger ingen extra skada över tid.',
    strength: 'Snabba explosioner rensar täta grupper av svaga fiender.',
    weakness: 'Dyrare än grundtornen och betydligt kortare räckvidd än Nudelskytten.',
    placement: 'Sök en kurva där många fiender befinner sig samtidigt. Kombinera med Iskock och Ramenmunk.',
    upgrades: 'Skada förstärker varje explosion. Räckvidd ger en längre eldzon; sprängradie och eldhastighet behålls.',
    damageNames: ['Chilipipa', 'Chilipatroner', 'Glödkärl', 'Drakkäft', 'Mästarkäft', 'Solkärna'],
    rangeNames: ['Öppet sikte', 'Nosringsikte', 'Pipinsats', 'Riktlins', 'Mästarlins', 'Vidvinkelrör']
  },
  iskock: {
    role: 'Kontroll & kyla', color: '#9bdcf5', projectile: 4,
    summary: 'Bromsar fiender så andra torn hinner skjuta mer. Ger även direkt skada.',
    attack: '14 grundskada var 1,2 sekund. Träffen bromsar 35 % i 2 sekunder, eller 12 % mot bossar. Ny kyla förnyar tiden men staplas inte.',
    strength: 'Ökar tiden fienderna står under flera torns eld. Hjälper särskilt mot snabba fiender.',
    weakness: 'Låg egen skada. Flera Iskockar kan täcka fler mål men gör inte bromsningen starkare.',
    placement: 'Sätt tornet tidigt i en gemensam eldzon framför dina kanoner och snabbskyttar.',
    upgrades: 'Skada höjer kristallens träffskada. Räckvidd låter kylan börja tidigare. Bromsning och varaktighet ändras inte.',
    damageNames: ['Iskärna', 'Stor iskärna', 'Skiktad kristall', 'Prismakärna', 'Mästarkristall', 'Evighetsis'],
    rangeNames: ['Kristallmunstycke', 'Fokusring', 'Långt munstycke', 'Fokuseringslins', 'Mästarlins', 'Frostvidd']
  },
  ramenmunk: {
    role: 'Stöd & energi', color: '#d9bbff', projectile: 5,
    summary: 'Förstärker närliggande torn och skjuter egna energikulor. Bäst i en grupp.',
    attack: 'Nudelorben ger 12 grundskada var 1,5 sekund. Auran ger andra torntyper +25 % skada och +15 % skjuträckvidd.',
    strength: 'Ett enda torn kan förbättra flera andra samtidigt. Auran kräver inget fiendemål.',
    weakness: 'Svagt som ensamt torn. Munkar förstärker inte varandra eller sig själva, och flera auror staplas inte.',
    placement: 'Placera där auran når flera skadetorn. Markera munken för att se exakt vilka som får stöd.',
    upgrades: 'Skada förbättrar bara munkens egna skott. Räckvidd ökar både skjuträckvidd och auraradie. Stödets +25 % / +15 % ändras inte.',
    damageNames: ['Nudelskål', 'Fokuspärla', 'Dubbla pärlor', 'Gyllene energiskål', 'Mästarskål', 'Himmelsk skål'],
    rangeNames: ['Runring', 'Rökelsehållare', 'Runbåge', 'Lyktkrans', 'Mästarkrans', 'Tempelring']
  },

  // ---- Tehuset -----------------------------------------------------------
  tebryggaren: {
    role: 'Kedjeskytt', color: '#8ad7bc', projectile: 5,
    summary: 'Kokhett te som hoppar vidare från fiende till fiende. Starkast mot led av fiender.',
    attack: '34 grundskada var 1,4 sekund. Träffen hoppar sedan till upp till 3 nya fiender inom 2,2 rutor från förra offret. Varje hopp behåller 60 % av föregående skada, alltså 60 %, 36 % och 22 %.',
    strength: 'En enda träff kan skada fyra fiender. Hoppen bryr sig inte om tornets egen räckvidd, bara avståndet mellan fienderna.',
    weakness: 'Mot en ensam boss finns inget att hoppa till, och då är tornet bara medelstarkt.',
    placement: 'Sätt tornet där banan går tätt intill sig själv, så hoppen når fiender i båda banorna.',
    upgrades: 'Skada höjer både första träffen och alla hopp, eftersom hoppen räknas som andelar av den. Räckvidd gäller bara första målet; hoppradien 2,2 rutor är fast.',
    damageNames: ['Lerkanna', 'Järnkanna', 'Jadekanna', 'Guldkanna', 'Mästarkanna', 'Drakkokaren'],
    rangeNames: ['Kort pip', 'Riktat pip', 'Långt pip', 'Tvillingpip', 'Mästarpip', 'Ångtrumpet']
  },
  sojasprutan: {
    role: 'Gift & pansarbrytare', color: '#a97434', projectile: 2,
    summary: 'Marinad som fräter vidare efter träffen och struntar i pansar. Byggd för Pansrade fiender.',
    attack: '6 grundskada direkt, sedan 16 skada per sekund i 3 sekunder. Giftet ignorerar Pansrads 25 % skademinskning helt. Ny träff förnyar tiden men staplas inte.',
    strength: 'Den enda skadan i spelet som går rakt genom pansar. Fungerar också bra mot Soppkockar, eftersom giftet tickar snabbare än de läker.',
    weakness: 'Nästan ingen direktskada. Mot Svärm dör fienden ofta innan giftet hunnit verka, så skadan går till spillo.',
    placement: 'Tidigt på banan, så giftet har hela vägen kvar att verka medan andra torn skjuter.',
    upgrades: 'Skada höjer både träffen och giftets skada per sekund i samma takt. Räckvidd ger fler mål att förgifta. De 3 sekunderna ändras inte.',
    damageNames: ['Tunn sojabrygd', 'Mörk soja', 'Lagrad soja', 'Svart marinad', 'Mästarmarinad', 'Tusenårssoja'],
    rangeNames: ['Kort munstycke', 'Sprutrör', 'Tryckrör', 'Dubbelmunstycke', 'Mästarmunstycke', 'Dimkanon']
  },
  wokmastaren: {
    role: 'Virvel & närförsvar', color: '#f0a03c', projectile: 2,
    summary: 'Träffar allt inom sin korta radie samtidigt, utan att skjuta något skott. Bäst i en flaskhals.',
    attack: '20 grundskada var 0,9 sekund till varje fiende inom räckvidden på 1,9 rutor. Ingen projektil avfyras, så skadan kan aldrig missa eller slösas på en döende fiende.',
    strength: 'Mot en tät grupp är detta spelets högsta skada per sekund. Tio fiender i radien betyder tio gånger skadan.',
    weakness: 'Räckvidden är kortast i spelet. Placerad fel gör tornet nästan ingenting.',
    placement: 'Placera i en innerkurva eller där två bansträckor möts, så att radien täcker så mycket väg som möjligt.',
    upgrades: 'Räckvidd är den viktigaste uppgraderingen här, eftersom den avgör hur många fiender som träffas. Skada gäller varje träffad fiende.',
    damageNames: ['Gjutjärnswok', 'Härdad wok', 'Stålwok', 'Drakjärnswok', 'Mästarwok', 'Solsmidd wok'],
    rangeNames: ['Liten panna', 'Bred panna', 'Storkök', 'Dubbelwok', 'Mästarkök', 'Virvelkök']
  },
  gonggongen: {
    role: 'Sårbarhet & stöd', color: '#c89a44', projectile: 4,
    summary: 'Fiender inom gongens radie tar 25 % mer skada från allt. Förstärker hela försvaret.',
    attack: '10 grundskada var 2,0 sekund. Det viktiga är sårbarheten: varje fiende inom 2,8 rutor tar +25 % skada från alla dina torn, inklusive gift och kedjehopp.',
    strength: 'Höjer skadan från allt annat du byggt. Verkar på alla fiender i radien samtidigt och behöver inget mål.',
    weakness: 'Nästan ingen egen skada. Flera gongar staplas inte, bara den starkaste räknas.',
    placement: 'Placera där dina skadetorn redan skjuter som mest, inte längst fram på banan.',
    upgrades: 'Räckvidd förstorar sårbarhetsradien, vilket är tornets hela poäng. Skada gäller bara gongens egna slag; de 25 % ändras inte.',
    damageNames: ['Bronsgong', 'Tjock gong', 'Klangbrons', 'Tempelgong', 'Mästargong', 'Åskgong'],
    rangeNames: ['Nära klang', 'Bred klang', 'Djup klang', 'Tempelklang', 'Mästarklang', 'Dalgångsklang']
  }
};

Object.assign(LTD_GUIDE, {
  stormspire: {
    role:'Arkan · Kedjeblixt',color:'#7ae8ff',projectile:4,
    summary:'Blixtar hoppar mellan upp till tre fiender. Varje hopp gör 70 % av föregående skada.',
    attack:'32 grundskada var 1,3 sekund, följt av upp till två hopp inom 2,1 rutor. Varje fiende träffas högst en gång per kedja.',
    strength:'Stark mot grupper, även när de står för glest för en liten explosion.',
    weakness:'En ensam boss tar bara den första träffen.',
    placement:'Täck kurvor där fiender passerar nära varandra. Runeko förstärker hela kedjan.',
    upgrades:'Skada höjer alla kedjeträffar. Räckvidd gäller första målet. Eldhastighet ger fler kedjor. Hoppavstånd och antal hopp är fasta.',
    damageNames:['Gnistkärna','Laddad kärna','Stormkärna','Åskhjärta'],rangeNames:['Ledare','Runledare','Resonator','Stormantenn']
  },
  prismsentinel: {
    role:'Arkan · Pansarjägare',color:'#ffa8ed',projectile:5,
    summary:'Tunga kristallskott ignorerar 60 % av målets pansarskydd.',
    attack:'85 grundskada var 1,8 sekund. 25 % pansar blir 10 %. Pansarbrytarrunan tar bort även resten.',
    strength:'Hög skada mot eliter och pansar. Bossjägare förbättrar bossbekämpningen.',
    weakness:'Långsam mot svärmar. Pansargenomslag hjälper inte mot opansrade mål.',
    placement:'Placera centralt och välj Starkast för att fokusera hårda mål.',
    upgrades:'Skada höjer kristallträffen, räckvidd ökar täckningen och eldhastighet kortar laddningstiden.',
    damageNames:['Kristallspets','Prismalins','Strålkärna','Stjärnprisma'],rangeNames:['Fokus','Kristallring','Siktarray','Astrallins']
  },
  gravityshrine: {
    role:'Arkan · Fältkontroll',color:'#bb9aff',projectile:5,
    summary:'Gravitationsorber skadar och bromsar hela grupper i en radie på 1,4 rutor.',
    attack:'22 grundskada var 1,7 sekund. Bromsar 25 % i 2,5 s (bossar 10 %). Bromsningar staplas inte.',
    strength:'Håller grupper kvar i kanonernas och Stormspirans eldzon.',
    weakness:'Låg egen skada och svagare enskild broms än Iskocken.',
    placement:'Täck tidiga kurvor med skadetorn runtomkring.',
    upgrades:'Skada höjer områdesträffarna. Räckvidd ökar skjutavståndet och eldhastighet ger tätare fält. Radie och bromsstyrka är fasta.',
    damageNames:['Graviton','Tät kärna','Vakuumkärna','Singularitet'],rangeNames:['Runbas','Orbitalring','Astralbåge','Horisontlins']
  }
});
for (const info of Object.values(LTD_GUIDE)) {
  for (const track of ['damageNames','rangeNames']) {
    const additions = track==='damageNames' ? ['Mästarvapen','Relikvapen','Legendariskt vapen'] : ['Mästarsikte','Astralsikte','Horisontsikte'];
    while(info[track].length<7) info[track].push(additions[info[track].length-4]);
  }
}
const NEW_GUIDES = {
  matchaskytt:{role:'Tehus · Precision',color:'#a8e8ab',projectile:0,summary:'Billig snabbskytt. Var fjärde attack gör dubbel skada.',attack:'18 skada var 0,65 sekund på ett mål. Var fjärde avfyrning gör 36 grundskada. Räknaren börjar om varje våg. Runeko multiplicerar bonusen när båda aktiveras.',strength:'Prisvärd start och jämn skada över långa sträckor.',weakness:'Ingen områdesskada eller pansargenomslag.',placement:'Placera centralt mellan stigar. Snabbare eld ger oftare förstärkta skott.',upgrades:'Skada förstärker vanliga och förstärkta skott. Räckvidd ökar täckningen. Eldhastighet kortar tiden mellan skott.'},
  lotusfontan:{role:'Tehus · Broms',color:'#9ff3dd',projectile:4,summary:'Lotuskristaller bromsar fiender i en liten radie.',attack:'9 skada var 1,1 sekund inom 0,6 rutor. Bromsar 40 % i 2 sekunder; bossar 15 %. Bromsningar staplas inte.',strength:'Köper tid åt gift, kedjor och Wokmästarens närzon.',weakness:'Låg egen skada. Behöver skadetorn intill.',placement:'Placera vid en kurva framför din starkaste eldzon.',upgrades:'Skada, skjuträckvidd och eldhastighet kan nå nivå 6. Bromsstyrka och explosionsradie är fasta.'},
  runvaktare:{role:'Arkan · Snabbskytt',color:'#92ceff',projectile:1,summary:'En billig runskytt som bygger upp klassens tidiga försvar.',attack:'17 skada på ett mål var 0,7 sekund, räckvidd 2,8 rutor.',strength:'Lågt pris gör det lätt att täcka flera kurvor tidigt.',weakness:'Kort räckvidd, ingen områdesskada eller pansarbonus.',placement:'Bygg vid innerkurvor och låt ett observatorium förstärka flera skyttar.',upgrades:'Skada ger starkare träffar, räckvidd täcker fler stigar och eldhastighet ger snabbare eld.'},
  observatorium:{role:'Arkan · Stöd',color:'#dec5ff',projectile:5,summary:'Stjärnauran ger andra närliggande torn +25 % skada och +15 % räckvidd.',attack:'10 skada var 1,8 sekund. Auran har 3,2 rutors grundradie och förstärker andra torn utom stödtorn. Flera stödauror staplas inte.',strength:'Förstärker hela grupper av kristalltorn och runskyttar.',weakness:'Låg egen skada. Stödtorn förstärker inte sig själva eller varandra.',placement:'Placera mitt i en grupp. Markera tornet för att se vilka som får stöd.',upgrades:'Räckvidd förstorar auran. Skada och eldhastighet förbättrar bara observatoriets egna skott.'},
  solfyr:{role:'Arkan · Läkblockerare',color:'#ffce75',projectile:3,summary:'Solexplosioner skadar grupper och hindrar träffade fiender från att läkas.',attack:'32 skada var 1,25 sekund inom 1,1 rutor. Varje träff blockerar all inkommande läkning i 3 sekunder, även för bossar.',strength:'Motverkar Soppkockarnas läkning från våg 16 och hjälper mot svärmar.',weakness:'Blockeringen gör ingen extra skada. Kräver upprepade träffar för ständig täckning.',placement:'Täck grupper kring läkande fiender. Kombinera med Prismaväktarens starka träffar.',upgrades:'Skada höjer explosionen. Räckvidd förbättrar täckningen. Eldhastighet håller läkning blockerad oftare. Blockeringstid och radie är fasta.'}
};
for(const [id,info] of Object.entries(NEW_GUIDES)) LTD_GUIDE[id]={...info,
  damageNames:['Grundvapen','Förstärkt vapen','Förfinat vapen','Elitvapen','Mästarvapen','Relikvapen','Legendariskt vapen'],
  rangeNames:['Grundfokus','Fokusring','Långfokus','Elitfokus','Mästarfokus','Astralfokus','Horisontfokus']};
