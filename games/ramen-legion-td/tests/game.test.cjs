const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.join(__dirname, '..');

function engine() {
  let clock = 0;
  const elements = new Map();
  const drawing = new Proxy({}, { get: () => () => {} });
  function element() {
    return { children: [], dataset: {}, classList: { toggle() {} }, addEventListener() {}, setAttribute() {},
      append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
      getContext: () => drawing, getBoundingClientRect: () => ({ left: 0, top: 0, width: 748, height: 652 }),
      focus() {}, showModal() { this.open = true; }, close() { this.open = false; }, width: 192, height: 192 };
  }
  const get = key => { if (!elements.has(key)) elements.set(key, element()); return elements.get(key); };
  const c = vm.createContext({ console, performance: { now: () => clock += 1000 },
    document: { getElementById: get, querySelector: get, createElement: element, addEventListener() {} },
    window: { matchMedia: () => ({ matches: false }) }, requestAnimationFrame() {}, confirm: () => true });
  for (const file of ['data.js', 'rules.js', 'towers.js']) vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), c);
  let game = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
  game = game.replace('nyMatch(); loadAssets(); requestAnimationFrame(frame);', '');
  vm.runInContext(game, c);
  vm.runInContext('ritaUI = () => {}; assetsReady = true; nyMatch();', c);
  return code => vm.runInContext(code, c, { timeout: 30000 });
}

test('all six independent upgrade paths: costs, 16 combinations, caps and rejection', () => {
  const run = engine();
  const costs = JSON.parse(run(`JSON.stringify(LTD.ENHETER.map(enhet => ['damage','range'].flatMap(track => [0,1,2].map(level => LTD_RULES.price({enhet, [track+'Level']:level}, track)))))`));
  assert.deepEqual(costs, [[60,100,160,40,70,110],[90,150,240,60,105,165],[135,220,355,90,155,245],[160,260,420,105,185,290],[120,200,320,80,140,220],[145,240,385,100,170,265]]);
  assert.equal(run(`LTD.ENHETER.every(enhet => {
    for(let d=0;d<4;d++) for(let r=0;r<4;r++) {
      const a={enhet,damageLevel:d,rangeLevel:r,kol:0,rad:1}; const s=LTD_RULES.stats(a,[]);
      if(s.damage !== enhet.skada*LTD_RULES.DAMAGE[d] || s.range !== enhet.rackvidd*LTD_RULES.RANGE[r]) return false;
    } return true;
  })`), true);
  assert.equal(run(`const a={enhet:LTD.ENHET.zebravakt,damageLevel:0,rangeLevel:0};
    LTD_RULES.upgrade(a,'damage',59,'bygg',0) === null && LTD_RULES.upgrade(a,'damage',500,'strid',0) === null &&
    LTD_RULES.upgrade(a,'damage',500,'bygg',1) === null && LTD_RULES.price({...a,damageLevel:3},'damage') === null`), true);
});

test('actual purchase, both upgrades, exact examples, invalid placement and sale', () => {
  const run = engine();
  run(`valjButik('zebravakt'); placera(0,0);`); assert.equal(run('saldo'), 500);
  run(`placera(0,1); uppgradera('damage',0); uppgradera('range',0);`);
  assert.equal(run('saldo'), 300); assert.equal(run('selected().betalt'), 200);
  assert.equal(run('LTD_RULES.stats(selected(),arme).damage'), 28);
  assert.ok(Math.abs(run('LTD_RULES.stats(selected(),arme).range') - 2.99) < 1e-10);
  run(`uppgradera('damage',0);`); assert.equal(run('saldo'), 300, 'stale displayed level cannot debit again');
  run('salj()'); assert.equal(run('saldo'), 440); assert.equal(run('arme.length'), 0);
});

test('Monk auras never stack; upgrades extend aura and Monk attacks', () => {
  const run = engine();
  run(`const z={enhet:LTD.ENHET.zebravakt,damageLevel:1,rangeLevel:1,kol:0,rad:1};
    const m={enhet:LTD.ENHET.ramenmunk,damageLevel:1,rangeLevel:1,kol:2,rad:1};
    const m2={...m,kol:1}; const s=LTD_RULES.stats(z,[z,m,m2]);`);
  assert.equal(run('s.damageEff'), 35); assert.ok(Math.abs(run('s.rangeEff') - 3.4385) < 1e-10);
  assert.equal(run('LTD_RULES.hit(s.damageEff,.25)'), 26);
  assert.equal(run('Math.round(LTD_RULES.stats(m,[m,m2]).damageEff)'), 17);
  assert.equal(run('LTD_RULES.stats(m,[m,m2]).supported'), false);
  assert.equal(run('LTD_RULES.stats(m,[m,m2]).aura'), 2.875);
  assert.equal(run('LTD_RULES.stats(z,[z]).supported'), false);
  assert.equal(run('LTD_RULES.stats({...z,kol:5},[m]).supported'), false);
  assert.equal(run('LTD_RULES.stats({...z,kol:5},[{...m,rangeLevel:3}]).supported'), true);
});

test('target priorities use continuous path progress, health and stable IDs', () => {
  const run = engine();
  run(`const enemies=[{id:2,x:2,y:0,progress:19,halsa:20},{id:1,x:1,y:0,progress:20,halsa:10},{id:3,x:3,y:0,progress:18,halsa:100}]; const tower={x:0,y:0};`);
  assert.equal(run(`LTD_RULES.target(enemies,tower,10,'first').id`), 1);
  assert.equal(run(`LTD_RULES.target(enemies,tower,10,'last').id`), 3);
  assert.equal(run(`LTD_RULES.target(enemies,tower,10,'strong').id`), 3);
  assert.equal(run(`LTD_RULES.target(enemies,tower,10,'near').id`), 1);
  assert.equal(run(`LTD_RULES.target(enemies,tower,.5,'first')`), null);
});

test('interest basis, rounding, cap, death payout once, no interest after defeat', () => {
  const run = engine();
  run(`saldo=1000; valjButik('zebravakt'); placera(0,1); valjButik('nudelskytt'); placera(1,1); valjButik('nudelskytt'); placera(2,1); startaVag(); andraSaldo(120); avslutaVag(); avslutaVag();`);
  assert.equal(run('saldo'), 750); assert.equal(run('statistik.ranta'), 30);
  assert.equal(run('LTD_RULES.interest(19,0)'), 0); assert.equal(run('LTD_RULES.interest(20,0)'), 1);
  assert.equal(run('LTD_RULES.interest(290000,298000)'), 2000);
  assert.equal(run('LTD_RULES.deposit(299995,100)'), 300000);
  run(`startaVag(); spawnaNasta(); const f=fiender[0]; const before=saldo; skadaFiende(f,10000); skadaFiende(f,10000);`);
  assert.equal(run('saldo-before'), run('f.belaning'));
  run(`liv=1; const priorInterest=statistik.ranta; lacka({...f,avraknad:false}); avslutaVag();`);
  assert.equal(run('lage'), 'forlust'); assert.equal(run('statistik.ranta-priorInterest'), 0);
});

test('projectile damage arrives at impact; area hit pays once and slow expires', () => {
  const run = engine();
  run(`valjButik('buljongtank'); placera(0,1); startaVag(); spawnaNasta(); const f=fiender[0]; skjut(torn[0],f);`);
  assert.equal(run('f.halsa'), 45);
  run(`const shot={...skott[0],x:f.x,y:f.y}; traff(shot);`);
  assert.equal(run('f.halsa'), 5);
  run(`traff({...shot,skada:100}); const paid=saldo; traff({...shot,skada:100});`);
  assert.equal(run('saldo'), run('paid'));
  run(`spawnaNasta(); const cold=fiender.at(-1); traff({mal:cold,x:cold.x,y:cold.y,skada:1,omrade:0,color:'#fff',kyla:LTD.ENHET.iskock.kyla});`);
  assert.equal(run('cold.kylaAndel'), .35);
  run(`torn=[]; for(let i=0;i<121;i++) steg(1/60);`); assert.equal(run('cold.kylaAndel'), 0);
});

test('pause and timeout cannot award money twice; fixed tower positions', () => {
  const run = engine();
  run(`valjButik('zebravakt'); placera(0,1); startaVag(); const pos=JSON.stringify(torn.map(t=>[t.x,t.y])); pausa(); const money=saldo; steg(30);`);
  assert.equal(run('stridTid'), 0); assert.equal(run('saldo'), run('money'));
  run(`pausa(); for(let i=0;i<120;i++) steg(1/60);`); assert.equal(run('JSON.stringify(torn.map(t=>[t.x,t.y]))'), run('pos'));
  run('timeoutAvrakning(); const after=saldo; timeoutAvrakning();'); assert.equal(run('saldo'), run('after'));
});

test('all 20 waves including four bosses resolve with two purchasing strategies', () => {
  for (const plan of ['mixed', 'sniper']) {
    const run = engine();
    const summary = JSON.parse(run(`JSON.stringify((() => {
      const plan='${plan}', snapshots=[];
      const types=plan==='sniper'?['nudelskytt','zebravakt','ramenmunk']:['zebravakt','buljongtank','iskock','nudelskytt','ramenmunk','chilikastare'];
      const spots=[]; for(const r of [3,1,5,7]) for(const k of [5,3,7,1,9,0,2,4,6,8,10,11]) if(!isPath(k,r)) spots.push({kol:k,rad:r});
      for(let wave=1;wave<=20;wave++) {
        // Purchase only with earned Ramen. Spend on a mixture of new towers and both upgrade tracks.
        for(let action=0;action<40;action++) {
          const type=types[arme.length%types.length], e=LTD.ENHET[type];
          if(arme.length<12 && saldo>=e.pris) { const p=spots[arme.length]; valdButik=type; placera(p.kol,p.rad); continue; }
          let choice=null;
          for(const track of ['damage','range']) for(const a of arme) {
            const cost=LTD_RULES.price(a,track); if(cost!==null && saldo>=cost && (!choice || cost<choice.cost)) choice={a,track,cost};
          }
          if(!choice) break; valdArme=choice.a.id; uppgradera(choice.track,choice.a[choice.track+'Level']);
        }
        startaVag(); let ticks=0; while(lage==='strid' && ticks++<7300) steg(1/60);
        snapshots.push({wave,phase:lage,lives:liv,balance:saldo,towers:arme.length,kills:statistik.dodade});
        if(lage==='forlust') break;
        if(lage==='strid') throw Error('Wave failed to terminate');
      }
      return {plan,phase:lage,lives:liv,wave:vagNr,snapshots};
    })())`));
    console.log('Simulation:', JSON.stringify(summary));
    assert.equal(summary.phase, 'vinst', `${plan} should complete a playable campaign`);
    assert.equal(summary.snapshots.length, 20);
  }
});
