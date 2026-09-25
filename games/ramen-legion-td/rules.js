// Pure calculations shared by combat, previews and verification.
const LTD_RULES = (() => {
  // Nivaerna 0-3 kops med Ramen. Niva 4-6 ar mastarnivaer och kraver dessutom
  // ett mastartecken, som bara delas ut nar en boss faktiskt dodas.
  const DAMAGE = [1, 1.4, 1.9, 2.6, 3.6, 5, 7];
  const RANGE = [1, 1.15, 1.3, 1.5, 1.7, 1.9, 2.2];
  const SPEED = [1, 1.2, 1.5, 1.9, 2.3, 2.8, 3.4];
  const COST = { damage: [60, 100, 160, 250, 400, 650], range: [40, 70, 110, 170, 260, 400], speed: [50, 90, 140, 220, 350, 550] };
  const MAX_BAS = 3, MAX_MASTER = 6;
  const RUNES = [
    {id:'slayer', name:'Bossjägare', icon:'◆', text:'+75 % skada mot bossar.'},
    {id:'pierce', name:'Pansarbrytare', icon:'◇', text:'Alla direkta träffar ignorerar allt pansar.'},
    {id:'echo', name:'Runeko', icon:'✦', text:'Var tredje attack gör dubbel direkt skada, inklusive kedjor och explosioner. Gift påverkas inte.'},
    {id:'frost', name:'Frostsigill', icon:'❄', text:'Bromsar 25 % i 2 s (bossar 10 %). Starkare kyla behålls.'}
  ];
  const INGA_KRYDDOR = { skada: 1, rackvidd: 1, fart: 1, belaning: 1 };
  // Utan mastartecken stannar taket pa 3, precis som innan bosspaketen fanns.
  function taket(tecken) { return tecken > 0 ? MAX_MASTER : MAX_BAS; }
  function teckenKostnad(level) { return level >= MAX_BAS ? 1 : 0; }
  function price(tower, track, maxLevel = MAX_MASTER) {
    const level = tower[track + 'Level'];
    const cap = Math.min(maxLevel, MAX_MASTER);
    if (!COST[track] || !Number.isInteger(level) || level < 0 || level >= cap) return null;
    return Math.ceil(tower.enhet.pris * COST[track][level] / 500) * 5;
  }
  function stats(tower, army, kryddor) {
    const e = tower.enhet, k = kryddor || INGA_KRYDDOR;
    const skadaMult = k.skada || 1, rackviddMult = k.rackvidd || 1, fartMult = k.fart || 1;
    const supported = !e.stod && army.some(s => s.enhet.stod &&
      Math.hypot(s.kol - tower.kol, s.rad - tower.rad) <= s.enhet.rackvidd * RANGE[s.rangeLevel] * rackviddMult);
    const damage = e.skada * DAMAGE[tower.damageLevel] * skadaMult;
    const range = e.rackvidd * RANGE[tower.rangeLevel] * rackviddMult;
    const interval = e.intervall / (SPEED[tower.speedLevel || 0] * fartMult);
    return { damage, range, interval, supported,
      damageEff: damage * (supported ? 1.25 : 1),
      rangeEff: range * (supported ? 1.15 : 1),
      aura: e.stod ? range : 0,
      // Tehusets egenskaper. Radierna foljer rackvidden, precis som munkens aura.
      svaghet: e.svaghet ? e.svaghet.andel : 0,
      svaghetRadie: e.svaghet ? range : 0,
      giftPerSekund: e.gift ? e.gift.perSekund * DAMAGE[tower.damageLevel] * skadaMult * (supported ? 1.25 : 1) : 0,
      giftTid: e.gift ? e.gift.tid : 0,
      kedjeHopp: e.kedja ? e.kedja.hopp : 0,
      kedjeAndel: e.kedja ? e.kedja.andel : 0,
      kedjeRadie: e.kedja ? e.kedja.radie : 0 };
  }
  function upgrade(tower, track, balance, phase, expectedLevel, tecken = 0) {
    const cost = price(tower, track);
    if (!['bygg','strid'].includes(phase) || cost === null || balance < cost || tower[track + 'Level'] !== expectedLevel) return null;
    const token = teckenKostnad(expectedLevel);
    if (token > tecken) return null;
    return { cost, level: expectedLevel + 1, token };
  }
  function hit(damage, armor = 0) { return Math.max(1, Math.round(damage * (1 - armor))); }
  function interest(basis, balance) { return Math.max(0, Math.min(Math.floor(basis * 5 / 100), 300000 - balance)); }
  function deposit(balance, amount) { return Math.min(300000, balance + Math.max(0, amount)); }
  function sale(tower) { return Math.floor(tower.betalt * 70 / 100); }
  function target(enemies, tower, range, mode) {
    const candidates = enemies.filter(f => !f.avraknad && Math.hypot(f.x - tower.x, f.y - tower.y) <= range);
    const score = f => mode === 'last' ? f.progress : mode === 'strong' ? -f.halsa :
      mode === 'near' ? Math.hypot(f.x - tower.x, f.y - tower.y) : -f.progress;
    candidates.sort((a, b) => score(a) - score(b) || a.id - b.id);
    return candidates[0] || null;
  }
  // Kedjan hoppar till narmaste otraffade fiende, sedan vidare fran den.
  function kedjemal(enemies, start, radius, hops, redan = []) {
    const used = new Set(redan), chosen = [];
    let point = start;
    for (let i = 0; i < hops; i++) {
      const near = enemies.filter(f => !f.avraknad && !used.has(f.id) &&
        Math.hypot(f.x - point.x, f.y - point.y) <= radius);
      near.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y) || a.id - b.id);
      const next = near[0]; if (!next) break;
      used.add(next.id); chosen.push(next); point = next;
    }
    return chosen;
  }
  // Gonggongarnas sarbarhet staplas inte: den starkaste gallande gongen vinner.
  function sarbarhet(towers, f) {
    let best = 0;
    for (const t of towers) {
      if (!t.svaghet || !t.svaghetPx) continue;
      if (Math.hypot(t.x - f.x, t.y - f.y) <= t.svaghetPx) best = Math.max(best, t.svaghet);
    }
    return best;
  }
  // Alla torn i samma klass raknas, sa butiken kan visa hur mycket en klass anvands.
  function allTracks() { return ['damage', 'range', 'speed']; }
  return { RUNES, DAMAGE, RANGE, SPEED, COST, MAX_BAS, MAX_MASTER, INGA_KRYDDOR, taket, teckenKostnad,
    price, stats, upgrade, hit, interest, deposit, sale, target, kedjemal, sarbarhet, allTracks };
})();
