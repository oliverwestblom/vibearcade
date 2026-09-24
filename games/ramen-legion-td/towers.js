const LTD_GUIDE = {
  zebravakt: {
    role: 'Snabbskytt', color: '#eabf7b', projectile: 0,
    summary: 'Billig skytt som träffar en fiende åt gången. Ett bra första torn vid en kurva.',
    attack: 'En bambupil ger 20 grundskada var 0,9 sekund. Den dubbla pipan är ett vapen, inte två träffar. Pilar går inte igenom flera fiender.',
    strength: 'Jämn skada till lågt pris. Fångar snabba fiender som överlevt andra torn.',
    weakness: 'Kort räckvidd och ingen områdesskada. Täta svärmar och pansar kräver hjälp.',
    placement: 'Placera nära en innerkurva där tornet kan skjuta länge på samma fiende. Börja med målprioriteten Först.',
    upgrades: 'Skada gör varje pil starkare. Räckvidd låter skytten täcka fler delar av banan. Skottintervallet förblir 0,9 sekunder.',
    damageNames: ['Bambupipa', 'Kopparspetsar', 'Förstärkt laddare', 'Guldkanon'],
    rangeNames: ['Öppet sikte', 'Riktsikte', 'Linsrör', 'Spanarperiskop']
  },
  nudelskytt: {
    role: 'Prickskytt', color: '#77d7cf', projectile: 1,
    summary: 'Lång räckvidd och hårda enstaka träffar. Bra mot eliter och bossar.',
    attack: 'En koncentrerad nudelbult ger 55 grundskada var 1,6 sekund. Bulten träffar en fiende utan genomslag.',
    strength: 'Kan bevaka flera bansträckor från kartans mitt. Hög skada per träff.',
    weakness: 'Långsam eld. En stor träff på en nästan död fiende kan slösa mycket skada.',
    placement: 'Placera centralt. Välj Starkast för eliter och bossar, eller Först för att stoppa läckor.',
    upgrades: 'Skada förbättrar bossbekämpning. Räckvidd ger fler skottillfällen, men hjälper inte när hela banan redan täcks.',
    damageNames: ['Träarmborst', 'Stålfjäder', 'Dubbla spännarmar', 'Energimagasin'],
    rangeNames: ['Öppet sikte', 'Kikarsikte', 'Linsuppsättning', 'Observatörssikte']
  },
  buljongtank: {
    role: 'Tung sprängare', color: '#efbf64', projectile: 2,
    summary: 'Buljongbomber skadar alla fiender nära träffen. Stark mot täta grupper.',
    attack: '40 grundskada var 1,5 sekund. Alla fiender inom 1,2 rutor från träffen får full skada, var och en exakt en gång.',
    strength: 'Stor sprängradie. En enda kula kan träffa många fiender.',
    weakness: 'Långsam eld och kortare räckvidd. Glest utspridda fiender utnyttjar svagheten.',
    placement: 'Bra vid kurvor tillsammans med Iskocken, som håller fienderna längre i eldzonen.',
    upgrades: 'Skada höjer skadan på varje träffad fiende. Räckvidd ökar avståndet till målet; explosionsradien stannar på 1,2.',
    damageNames: ['Buljonggryta', 'Förstärkt gryta', 'Tryckkammare', 'Övertryckskärna'],
    rangeNames: ['Öppet sikte', 'Justerbart sikte', 'Riktarm', 'Avståndsmätare']
  },
  chilikastare: {
    role: 'Svärmrensare', color: '#ff986b', projectile: 3,
    summary: 'Snabba chiliskott med liten explosion. Håller trycket uppe mot svärmar.',
    attack: '26 grundskada var 0,7 sekund inom 0,9 rutor från träffen. Den synliga glöden ger ingen extra skada över tid.',
    strength: 'Snabba explosioner rensar täta grupper av svaga fiender.',
    weakness: 'Dyrare än grundtornen och betydligt kortare räckvidd än Nudelskytten.',
    placement: 'Sök en kurva där många fiender befinner sig samtidigt. Kombinera med Iskock och Ramenmunk.',
    upgrades: 'Skada förstärker varje explosion. Räckvidd ger en längre eldzon; sprängradie och eldhastighet behålls.',
    damageNames: ['Chilipipa', 'Chilipatroner', 'Glödkärl', 'Drakkäft'],
    rangeNames: ['Öppet sikte', 'Nosringsikte', 'Pipinsats', 'Riktlins']
  },
  iskock: {
    role: 'Kontroll & kyla', color: '#9bdcf5', projectile: 4,
    summary: 'Bromsar fiender så andra torn hinner skjuta mer. Ger även direkt skada.',
    attack: '14 grundskada var 1,2 sekund. Träffen bromsar 35 % i 2 sekunder, eller 12 % mot bossar. Ny kyla förnyar tiden men staplas inte.',
    strength: 'Ökar tiden fienderna står under flera torns eld. Hjälper särskilt mot snabba fiender.',
    weakness: 'Låg egen skada. Flera Iskockar kan täcka fler mål men gör inte bromsningen starkare.',
    placement: 'Sätt tornet tidigt i en gemensam eldzon framför dina kanoner och snabbskyttar.',
    upgrades: 'Skada höjer kristallens träffskada. Räckvidd låter kylan börja tidigare. Bromsning och varaktighet ändras inte.',
    damageNames: ['Iskärna', 'Stor iskärna', 'Skiktad kristall', 'Prismakärna'],
    rangeNames: ['Kristallmunstycke', 'Fokusring', 'Långt munstycke', 'Fokuseringslins']
  },
  ramenmunk: {
    role: 'Stöd & energi', color: '#d9bbff', projectile: 5,
    summary: 'Förstärker närliggande torn och skjuter egna energikulor. Bäst i en grupp.',
    attack: 'Nudelorben ger 12 grundskada var 1,5 sekund. Auran ger andra torntyper +25 % skada och +15 % skjuträckvidd.',
    strength: 'Ett enda torn kan förbättra flera andra samtidigt. Auran kräver inget fiendemål.',
    weakness: 'Svagt som ensamt torn. Munkar förstärker inte varandra eller sig själva, och flera auror staplas inte.',
    placement: 'Placera där auran når flera skadetorn. Markera munken för att se exakt vilka som får stöd.',
    upgrades: 'Skada förbättrar bara munkens egna skott. Räckvidd ökar både skjuträckvidd och auraradie. Stödets +25 % / +15 % ändras inte.',
    damageNames: ['Nudelskål', 'Fokuspärla', 'Dubbla pärlor', 'Gyllene energiskål'],
    rangeNames: ['Runring', 'Rökelsehållare', 'Runbåge', 'Lyktkrans']
  }
};
