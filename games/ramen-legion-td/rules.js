// Pure calculations shared by combat, previews and verification.
const LTD_RULES = (() => {
  const DAMAGE = [1, 1.4, 1.9, 2.6], RANGE = [1, 1.15, 1.3, 1.5];
  const COST = { damage: [60, 100, 160], range: [40, 70, 110] };
  function price(tower, track) {
    const level = tower[track + 'Level'];
    if (!COST[track] || !Number.isInteger(level) || level < 0 || level >= 3) return null;
    return Math.ceil(tower.enhet.pris * COST[track][level] / 500) * 5;
  }
  function stats(tower, army) {
    const e = tower.enhet;
    const supported = !e.stod && army.some(s => s.enhet.stod &&
      Math.hypot(s.kol - tower.kol, s.rad - tower.rad) <= s.enhet.rackvidd * RANGE[s.rangeLevel]);
    const damage = e.skada * DAMAGE[tower.damageLevel];
    const range = e.rackvidd * RANGE[tower.rangeLevel];
    return { damage, range, supported, damageEff: damage * (supported ? 1.25 : 1),
      rangeEff: range * (supported ? 1.15 : 1), aura: e.stod ? range : 0 };
  }
  function upgrade(tower, track, balance, phase, expectedLevel) {
    const cost = price(tower, track);
    if (phase !== 'bygg' || cost === null || balance < cost || tower[track + 'Level'] !== expectedLevel) return null;
    return { cost, level: expectedLevel + 1 };
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
  return { DAMAGE, RANGE, price, stats, upgrade, hit, interest, deposit, sale, target };
})();
