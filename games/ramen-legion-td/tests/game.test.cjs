const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.join(__dirname, '..');

function engine(klass = 'nudelkoket') {
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
  for (const file of ['data.js', 'maze.js', 'rules.js', 'towers.js', 'art.js']) vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), c);
  let game = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
  game = game.replace('nyMatch(); loadAssets(); requestAnimationFrame(frame);', '');
  vm.runInContext(game, c);
  vm.runInContext(`ritaUI = () => {}; assetsReady = true; activeClass='${klass}'; $('setup-class').value='${klass}'; nyMatch();`, c);
  return code => vm.runInContext(code, c, { timeout: 30000 });
}

function mapEngine() {
  const run = engine();
  run(`BILDER.environment={}; BILDER.landscapes={naturalWidth:774,naturalHeight:2032};`);
  return run;
}

test('four distinct maps have continuous, non-overlapping routes and enforce placement', () => {
  const run = mapEngine();
  assert.equal(run('new Set(LTD.MAPS.map(m=>JSON.stringify(m.path))).size'), 4);
  for (const id of ['bamboo','snow','desert','volcano']) {
    assert.equal(run(`playMap('${id}')`), true);
    assert.equal(run(`LTD.BANA.every((p,i,a)=>p.kol>=0&&p.kol<12&&p.rad>=0&&p.rad<9&&(!i||Math.abs(p.kol-a[i-1].kol)+Math.abs(p.rad-a[i-1].rad)===1))`), true);
    assert.equal(run('new Set(LTD.BANA.map(p=>`${p.kol},${p.rad}`)).size === LTD.BANA.length'), true);
    assert.equal(run('LTD.BANA.every(p=>isPath(p.kol,p.rad))'), true);
    run(`valjButik('zebravakt'); for(const p of LTD.BANA) placera(p.kol,p.rad); placera(10,8);`);
    assert.equal(run('saldo'), 500);
    run(`placera(markor.kol,markor.rad);`);
    assert.equal(run('arme.length'), 1);
    assert.equal(run('saldo'), 400);
  }
});

test('map changes clear combat and economy, cancel preserves match, restart retains map', () => {
  const run = mapEngine();
  run(`valjButik('zebravakt');placera(0,1);startaVag();spawnaNasta();confirm=()=>false;`);
  assert.equal(run(`playMap('snow')`), false);
  assert.equal(run('LTD.activeMap.id'), 'bamboo');
  assert.equal(run('fiender.length'), 1); assert.equal(run('saldo'), 400);
  run(`confirm=()=>true;playMap('snow');`);
  assert.equal(run('LTD.activeMap.id'), 'snow');
  assert.equal(run('saldo'), 500); assert.equal(run('vagNr'), 1);
  assert.equal(run('fiender.length+skott.length+arme.length+spawnKvar.length'), 0);
  assert.equal(run(`playMap('invalid')`), false);
  run('startaOm()'); assert.equal(run('LTD.activeMap.id'), 'snow');
});

test('enemies traverse every map to its kitchen exactly once at every speed', () => {
  const run = mapEngine();
  for(const id of ['bamboo','snow','desert','volcano']) for(const speed of [.7,1,1.8]) {
    run(`playMap('${id}');lage='strid';spawnKvar=[LTD.vag(1).kon[0]];spawnaNasta();
      fiender[0].fart=1.5*${speed};
      for(let i=0;i<7200&&!fiender[0].avraknad;i++)gaBana(fiender[0],1/60);`);
    assert.equal(run('fiender[0].avraknad'), true);
    assert.equal(run('liv'), 19);
    assert.equal(run('Math.hypot(fiender[0].x-KUNG.x,fiender[0].y-KUNG.y)<.001'), true);
    run('gaBana(fiender[0],1)'); assert.equal(run('liv'), 19);
  }
});

test('all six independent upgrade paths: costs, 16 combinations, caps and rejection', () => {
  const run = engine();
  const costs = JSON.parse(run(`JSON.stringify(LTD.ENHETER.map(enhet => ['damage','range'].flatMap(track => [0,1,2].map(level => LTD_RULES.price({enhet, [track+'Level']:level}, track)))))`));
  assert.deepEqual(costs.slice(0,6), [[60,100,160,40,70,110],[90,150,240,60,105,165],[135,220,355,90,155,245],[160,260,420,105,185,290],[120,200,320,80,140,220],[145,240,385,100,170,265]]);
  assert.equal(run(`LTD.ENHETER.every(enhet => {
    for(let d=0;d<4;d++) for(let r=0;r<4;r++) {
      const a={enhet,damageLevel:d,rangeLevel:r,kol:0,rad:1}; const s=LTD_RULES.stats(a,[]);
      if(s.damage !== enhet.skada*LTD_RULES.DAMAGE[d] || s.range !== enhet.rackvidd*LTD_RULES.RANGE[r]) return false;
    } return true;
  })`), true);
  assert.equal(run(`const a={enhet:LTD.ENHET.zebravakt,damageLevel:0,rangeLevel:0};
    LTD_RULES.upgrade(a,'damage',59,'bygg',0) === null && LTD_RULES.upgrade(a,'damage',500,'paus',0) === null &&
    LTD_RULES.upgrade(a,'damage',500,'bygg',1) === null && LTD_RULES.price({...a,damageLevel:6},'damage') === null`), true);
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

test('all 20 waves including bosses: three garden strategies and all new maps', () => {
  for (const [map,plan] of [['bamboo','mixed'],['bamboo','sniper'],['bamboo','mixed-speed'],['snow','mixed-speed'],['desert','mixed-speed'],['volcano','mixed-speed']]) {
    const run = mapEngine();
    run(`playMap('${map}')`);
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
          for(const track of (plan==='mixed-speed'?['damage','range','speed']:['damage','range'])) for(const a of arme) {
            const cost=LTD_RULES.price(a,track); if(cost!==null && saldo>=cost && seals>=LTD_RULES.teckenKostnad(a[track+'Level']) && (!choice || cost<choice.cost)) choice={a,track,cost};
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
    console.log('Simulation:', JSON.stringify({map,plan:summary.plan,phase:summary.phase,lives:summary.lives,waves:summary.snapshots.length}));
    assert.equal(summary.phase, 'vinst', `${map}/${plan} should complete a playable campaign`);
    assert.equal(summary.snapshots.length, 20);
  }
});

test('speed upgrades for all six towers: all 64 combinations and capped costs', () => {
  const run = engine();
  const costs = JSON.parse(run(`JSON.stringify(LTD.ENHETER.map(enhet => [0,1,2].map(speedLevel => LTD_RULES.price({enhet,speedLevel},'speed'))))`));
  assert.deepEqual(costs.slice(0,6), [[50,90,140],[75,135,210],[110,200,310],[130,235,365],[100,180,280],[120,220,340]]);
  assert.equal(run(`LTD.ENHETER.every(enhet => {
    for(let d=0;d<4;d++) for(let r=0;r<4;r++) for(let s=0;s<4;s++) {
      const a={enhet,damageLevel:d,rangeLevel:r,speedLevel:s,kol:0,rad:1}; const st=LTD_RULES.stats(a,[]);
      if(st.damage !== enhet.skada*LTD_RULES.DAMAGE[d] || st.range !== enhet.rackvidd*LTD_RULES.RANGE[r] || st.interval !== enhet.intervall/LTD_RULES.SPEED[s]) return false;
    } return true;
  })`), true);
  run(`valjButik('zebravakt');placera(0,1);uppgradera('speed',0);`);
  assert.equal(run('saldo'), 350); assert.equal(run('selected().speedLevel'), 1);
  assert.equal(run('selected().damageLevel'), 0); assert.equal(run('selected().rangeLevel'), 0);
  assert.equal(run('LTD_RULES.stats(selected(),arme).interval'), .75);
  run(`uppgradera('speed',1);uppgradera('speed',2);const money=saldo;uppgradera('speed',3);`);
  assert.equal(run('selected().speedLevel'), 3); assert.equal(run('saldo'), run('money'));
  assert.equal(run('LTD_RULES.sale(selected())'), 266);
});

test('actual firing cadence increases for every tower, including the Monk', () => {
  for (const id of ['zebravakt','nudelskytt','buljongtank','chilikastare','iskock','ramenmunk']) {
    const results=[];
    for(const level of [0,3]) {
      const run=engine();
      results.push(run(`valjButik('${id}');placera(0,1);selected().speedLevel=${level};startaVag();spawnaNasta();spawnKvar=[];
        fiender[0].fart=0;fiender[0].x=torn[0].x;fiender[0].y=torn[0].y;fiender[0].halsa=999999;
        let fired=0;skjut=()=>{fired++;};for(let i=0;i<600;i++)steg(1/60);fired;`));
    }
    assert.ok(results[1] >= results[0]*1.7, `${id}: ${results} should fire faster`);
  }
});

test('master progression reaches level 6 on all tracks with exact seal spending and refunds', () => {
  const run=engine();
  run(`saldo=300000;valjButik('zebravakt');placera(0,1);`);
  for(const track of ['damage','range','speed']) {
    run(`for(let i=0;i<3;i++)uppgradera('${track}',i);const before${track}=saldo;uppgradera('${track}',3);`);
    assert.equal(run(`selected().${track}Level`),3); assert.equal(run('saldo'),run(`before${track}`));
    run(`seals+=3;for(let i=3;i<6;i++)uppgradera('${track}',i);`);
    assert.equal(run(`selected().${track}Level`),6); assert.equal(run('seals'),0);
    assert.equal(run(`LTD_RULES.price(selected(),'${track}')`),null);
  }
  assert.equal(run('selected().spentSeals'),9);
  assert.equal(run('towerStats(selected()).damage'),140);
  run(`seals=1;engrave('slayer');const refund=LTD_RULES.sale(selected());const money=saldo;salj();salj();`);
  assert.equal(run('seals'),10); assert.equal(run('saldo-money'),run('refund'));
});

test('boss kill grants loot once; leaks grant nothing; reward choice is one-shot and phase guarded', () => {
  const run=engine();
  run(`valjButik('zebravakt');placera(0,1);vagNr=5;startaVag();spawnKvar=[LTD.vag(5).kon.find(f=>f.boss)];spawnaNasta();const f=fiender[0];skadaFiende(f,1e9);skadaFiende(f,1e9);`);
  assert.equal(run('seals'),2);assert.equal(run('rewards.length'),1);
  assert.equal(run(`chooseReward(5,'hetta')`),false);
  run('avslutaVag()');assert.equal(run(`chooseReward(5,'hetta')`),true);
  assert.equal(run(`chooseReward(5,'hetta')`),false);
  assert.equal(run('kryddor.skada'),1.12);
  assert.equal(run('towerStats(arme[0]).damage'),22.400000000000002);
  run(`nyMatch();valjButik('zebravakt');placera(0,1);vagNr=5;startaVag();spawnKvar=[LTD.vag(5).kon.find(f=>f.boss)];spawnaNasta();lacka(fiender[0]);avslutaVag();`);
  assert.equal(run('seals'),0);assert.equal(run('rewards.length'),0);
});

test('runes: boss multiplier, armor piercing, third-shot echo, slow and one slot', () => {
  const run=engine();
  run(`valjButik('zebravakt');placera(0,1);seals=2;engrave('echo');`);
  assert.equal(run(`engrave('slayer')`),false);assert.equal(run('seals'),1);
  run(`startaVag();spawnaNasta();const f=fiender[0];f.halsa=10000;f.boss=true;f.minskadSkada=.25;f.fart=0;
    hitPayload(f,{skada:100,rune:'slayer'});`);
  assert.equal(run('f.halsa'),9869);
  run(`hitPayload(f,{skada:100,rune:'pierce'});`);assert.equal(run('f.halsa'),9769);
  run(`skott=[];for(let i=0;i<3;i++)skjut(torn[0],f);`);
  assert.equal(run('JSON.stringify(skott.map(s=>s.skada))'),'[20,20,40]');
  run(`hitPayload(f,{skada:1,rune:'frost'});`); assert.equal(run('f.kylaAndel'),.1);
  run(`applySlow(f,{andel:.35,bossAndel:.12,tid:2});hitPayload(f,{skada:1,rune:'frost'});`);assert.equal(run('f.kylaAndel'),.12);
});

test('new tower attacks: unique chain targets, piercing, area slow and poison through armor', () => {
  const run=engine();
  run(`lage='strid';fiender=[0,1,2,3].map(id=>({id,x:id*60,y:0,halsa:1000,maxHalsa:1000,avraknad:false,kylaAndel:0,kylaKvar:0,minskadSkada:0,fart:0}));
    traff({mal:fiender[0],x:0,y:0,skada:32,chain:LTD.ENHET.stormspire.kedja,color:'#fff'});`);
  assert.equal(run('JSON.stringify(fiender.map(f=>f.halsa))'),'[968,978,984,1000]');
  run(`fiender[0].minskadSkada=.25;hitPayload(fiender[0],{skada:100,armorPierce:.6});`);assert.equal(run('fiender[0].halsa'),878);
  run(`traff({mal:fiender[0],x:0,y:0,skada:22,omrade:84,kyla:LTD.ENHET.gravityshrine.kyla,color:'#fff'});`);
  assert.equal(run('fiender[0].kylaAndel'),.25); assert.equal(run('fiender[1].kylaAndel'),.25); assert.equal(run('fiender[2].kylaAndel'),0);
  run(`activeClass='tehuset';nyMatch();valjButik('sojasprutan');placera(0,1);startaVag();spawnaNasta();spawnKvar=[];const f=fiender[0];f.halsa=f.maxHalsa=1000;f.fart=0;f.minskadSkada=1;
    hitPayload(f,{skada:0,poison:{dps:16,time:3}});const initial=f.halsa;torn=[];for(let i=0;i<181;i++)steg(1/60);`);
  assert.equal(run('initial-f.halsa'),48);
});

test('Tea House vulnerability does not stack, whirlwind hits area, healers restore nearby enemies', () => {
  const run=engine();
  run(`const f={x:0,y:0};const g={x:0,y:0,svaghet:.25,svaghetPx:100};`);
  assert.equal(run('LTD_RULES.sarbarhet([g,g],f)'),.25);
  run(`activeClass='tehuset';valjButik('wokmastaren');placera(0,1);startaVag();spawnaNasta();const enemy=fiender[0];enemy.x=torn[0].x;enemy.y=torn[0].y;enemy.halsa=100;skjut(torn[0],enemy);`);
  assert.equal(run('enemy.halsa'),80);assert.equal(run('skott.length'),0);
  run(`torn=[];spawnKvar=[];enemy.halsa=10;enemy.fart=0;const healer={...enemy,id:999,hela:{radie:2,andel:.06,intervall:1.2},healTimer:0};fiender.push(healer);steg(1/60);`);
  assert.ok(run('enemy.halsa')>10);
});

test('expedition keeps progression, repeats boss types and resets cleanly', () => {
  const run=engine();
  run(`valjButik('zebravakt');placera(0,1);lage='vinst';vagNr=20;seals=5;kryddor.skada=1.12;`);
  assert.equal(run('continueExpedition()'),true);assert.equal(run('continueExpedition()'),false);
  assert.equal(run('vagNr'),21);assert.equal(run('arme.length'),1);assert.equal(run('seals'),5);
  assert.equal(run('LTD.vag(25).harBoss'),true);assert.ok(run('LTD.vag(40).kon.every(f=>Number.isFinite(f.maxHalsa))'));
  run('nyMatch()');assert.equal(run('expedition'),false);assert.equal(run('seals'),0);assert.equal(run('kryddor.skada'),1);
});

test('all 18 towers support 343 upgrade combinations without invalid stats',()=>{
  const run=engine();
  assert.equal(run('LTD.ENHETER.length'),18);
  assert.equal(run(`LTD.ENHETER.every(enhet=>{
    for(let d=0;d<=6;d++)for(let r=0;r<=6;r++)for(let s=0;s<=6;s++){
      const a={enhet,damageLevel:d,rangeLevel:r,speedLevel:s,kol:0,rad:1};const v=LTD_RULES.stats(a,[]);
      if(![v.damage,v.range,v.interval].every(n=>Number.isFinite(n)&&n>0))return false;
    }return true;
  })`),true);
});

test('40-wave expeditions using each locked class and earned resources',()=>{
 for(const klass of ['nudelkoket','tehuset','arkan']) {
  const run=engine(klass);
  const summary=JSON.parse(run(`JSON.stringify((()=>{
    const types=LTD.KLASSER.find(c=>c.id===activeClass).enheter.slice().sort((a,b)=>a.pris-b.pris).map(e=>e.id);
    const spots=[];for(let rad=0;rad<9;rad++)for(let kol=0;kol<12;kol++)if(!isPath(kol,rad))spots.push({kol,rad});
    spots.sort((a,b)=>LTD.BANA.filter(p=>Math.hypot(p.kol-b.kol,p.rad-b.rad)<=3).length-LTD.BANA.filter(p=>Math.hypot(p.kol-a.kol,p.rad-a.rad)<=3).length);
    let completed=0;
    for(let wave=1;wave<=40;wave++){
      if(lage==='vinst')continueExpedition();
      for(const reward of [...rewards])chooseReward(reward.wave,(reward.options.find(o=>o.typ==='krydda') || reward.options[0]).id);
      for(let action=0;action<150;action++){
        const e=LTD.ENHET[types[arme.length%types.length]];
        if(arme.length<26&&saldo>=e.pris){valdButik=e.id;const p=spots[arme.length];placera(p.kol,p.rad);continue;}
        let choice=null;
        for(const track of ['damage','speed','range'])for(const a of arme){const cost=LTD_RULES.price(a,track);if(cost!==null&&cost<=saldo&&seals>=LTD_RULES.teckenKostnad(a[track+'Level'])&&(!choice||cost<choice.cost))choice={a,track,cost};}
        if(!choice)break;valdArme=choice.a.id;uppgradera(choice.track,choice.a[choice.track+'Level']);
      }
      startaVag();let ticks=0;while(lage==='strid'&&ticks++<7300)steg(1/60);
      if(lage==='forlust'||lage==='strid')break;completed++;
    }
    return {completed,phase:lage,lives:liv,wave:vagNr,types:[...new Set(arme.map(a=>a.enhet.id))].length};
  })())`));
  console.log('Expedition:',JSON.stringify(summary));
  assert.equal(summary.completed,40);assert.equal(summary.phase,'vinst');assert.equal(summary.types,6);
 }
});


test('setup requires valid class and map, locks roster, and restarting returns to setup',()=>{
  const run=mapEngine();run(`activeClass=null;nyMatch();$('setup-class').value='';`);
  run(`valjButik('zebravakt');placera(0,1);startaVag();`);assert.equal(run('lage'),'setup');assert.equal(run('arme.length'),0);
  assert.equal(run(`playMap('snow','')`),false);assert.equal(run(`playMap('invalid','arkan')`),false);
  assert.equal(run(`playMap('snow','arkan')`),true);assert.equal(run('activeClass'),'arkan');
  run(`valjButik('zebravakt');`);assert.equal(run('valdButik'),null);
  run(`valdButik='zebravakt';placera(0,1);`);assert.equal(run('arme.length'),0);
  run(`valjButik('runvaktare');placera(0,1);`);assert.equal(run('arme.length'),1);
  assert.equal(run('LTD.KLASSER.every(c=>c.enheter.length===6)'),true);
  run('startaOm()');assert.equal(run('lage'),'setup');assert.equal(run('activeClass'),null);
});

test('live build and upgrades update combat without resetting shots, projectiles or locked interest',()=>{
  const run=engine();
  run(`saldo=2000;valjButik('zebravakt');placera(0,1);startaVag();spawnaNasta();
    const existing=torn[0];existing.kylTimer=.45;existing.shots=7;skjut(existing,fiender[0]);const shot=skott[0];const basis=rantebas;
    uppgradera('speed',0);`);
  assert.equal(run('torn[0]===existing'),true);assert.equal(run('existing.shots'),8);
  assert.ok(Math.abs(run('existing.kylTimer')-.375)<1e-10);
  assert.equal(run('existing.interval'),.75);
  run(`uppgradera('damage',0);`);assert.equal(run('existing.damageEff'),28);assert.equal(run('shot.skada'),20);
  run(`valjButik('ramenmunk');placera(1,1);`);
  assert.equal(run('torn.length'),2);assert.equal(run('existing.supported'),true);assert.equal(run('existing.damageEff'),35);
  assert.equal(run('torn[1].kylTimer'),run('torn[1].interval'));
  assert.equal(run('rantebas'),run('basis'));assert.equal(run('skott[0]===shot'),true);
  run(`const count=arme.length;pausa();valjButik('zebravakt');placera(2,1);uppgradera('damage',0);`);
  assert.equal(run('arme.length'),run('count'));assert.equal(run('selected().damageLevel'),0);
});

test('live rune engraving affects future attacks only and respects a single socket',()=>{
  const run=engine();run(`valjButik('zebravakt');placera(0,1);seals=1;startaVag();spawnaNasta();skjut(torn[0],fiender[0]);const oldShot=skott[0];`);
  assert.equal(run(`engrave('pierce')`),true);assert.equal(run(`engrave('echo')`),false);
  assert.equal(run('torn[0].rune'),'pierce');assert.equal(run('oldShot.rune'),undefined);
});

test('new specialties: matcha fourth shot, lotus slow, support aura and expiring healing block',()=>{
  const run=engine('tehuset');run(`valjButik('matchaskytt');placera(0,1);startaVag();spawnaNasta();skott=[];for(let i=0;i<4;i++)skjut(torn[0],fiender[0]);`);
  assert.equal(run('JSON.stringify(skott.map(s=>s.skada))'),'[18,18,18,36]');
  run(`hitPayload(fiender[0],{skada:1,kyla:LTD.ENHET.lotusfontan.kyla});`);assert.equal(run('fiender[0].kylaAndel'),.4);
  run(`activeClass='arkan';nyMatch();saldo=1000;valjButik('runvaktare');placera(0,1);valjButik('observatorium');placera(1,1);startaVag();`);
  assert.equal(run('torn[0].supported'),true);assert.equal(run('torn[1].supported'),false);
  run(`spawnaNasta();spawnKvar=[];const f=fiender[0];f.halsa=10;f.maxHalsa=100;f.fart=0;
    const healer={...f,id:999,hela:{radie:2,andel:.06,intervall:1},healTimer:0};fiender.push(healer);torn=[];
    hitPayload(f,{skada:1,healBlock:3});const hp=f.halsa;steg(1/60);`);
  assert.equal(run('f.halsa'),run('hp'));
  run(`for(let i=0;i<240;i++)steg(1/60);`);assert.ok(run('f.halsa')>run('hp'));assert.equal(run('f.healBlocked'),0);
});

test('difficulty scales every wave including bosses without changing rewards or base data', () => {
  const run=engine();
  for(const wave of [1,5,20,21,40]) {
    run('var baseWave=LTD.vag('+wave+');');
    for(const difficulty of ['low','medium','high']) {
      assert.equal(run("LTD.vag("+wave+",'"+difficulty+"').kon.every((e,i)=>e.maxHalsa===Math.max(1,Math.round(baseWave.kon[i].maxHalsa*LTD.DIFFICULTIES['"+difficulty+"'].health)) && e.fart===baseWave.kon[i].fart*LTD.DIFFICULTIES['"+difficulty+"'].speed && e.belaning===baseWave.kon[i].belaning)"),true);
    }
    assert.equal(run('JSON.stringify(baseWave)===JSON.stringify(LTD.vag('+wave+'))'),true);
  }
  assert.equal(run("playMap('bamboo','nudelkoket','invalid')"),false);
  run("playMap('bamboo','nudelkoket','high');valjButik('zebravakt');placera(0,1);startaVag();");
  assert.equal(run("spawnKvar[0].maxHalsa===LTD.vag(1,'high').kon[0].maxHalsa"),true);
  run("$('difficulty-select').value='low';updateDifficulty();");
  assert.equal(run("activeDifficulty"),'high');
});

test('three class cards expose all six members and selection is locked during play', () => {
  const run=engine();
  run("assetsReady=false;activeClass=null;nyMatch();updateSetupRoster();");
  assert.equal(run("$('setup-roster').children.length"),3);
  assert.equal(run("$('setup-roster').children.every(card=>card.children[2].children.length===6)"),true);
  run("selectClass('tehuset');");
  assert.equal(run("$('setup-class').value"),'tehuset');
  assert.equal(run("$('map-select').value"),'');
  run("assetsReady=true;playMap('bamboo','tehuset','low');selectClass('arkan');");
  assert.equal(run('activeClass'),'tehuset');
  assert.equal(run('activeDifficulty'),'low');
});

test('maze shortest paths detour around towers and reject complete walls',()=>{
  const run=engine();
  assert.equal(run('LTD_MAZE.route([]).length'),12);
  assert.equal(run('LTD_MAZE.route([{kol:5,rad:4}]).length'),14);
  assert.equal(run('LTD_MAZE.route(Array.from({length:9},(_,rad)=>({kol:5,rad})))'),null);
  assert.equal(run('LTD_MAZE.route(Array.from({length:8},(_,rad)=>({kol:5,rad}))).length'),20);
});
test('maze builds on original road, rejects blocked exits without charge and reroutes after sale',()=>{
  const run=mapEngine();
  run("playMap('snow','nudelkoket','medium','maze');saldo=10000;valjButik('zebravakt');placera(5,4);");
  assert.equal(run('arme.length'),1);
  assert.equal(run('BANPUNKTER.length'),14);
  run("for(const rad of [0,1,2,3,5,6,7]){valdButik='zebravakt';placera(5,rad);}");
  assert.equal(run('arme.length'),8);
  const balance=run('saldo');
  run("valdButik='zebravakt';placera(5,8);");
  assert.equal(run('arme.length'),8);assert.equal(run('saldo'),balance);
  run("placera(0,4);placera(11,4);");
  assert.equal(run('saldo'),balance);
  run("valdArme=arme.find(a=>a.rad===4).id;salj();");
  assert.equal(run('BANPUNKTER.length'),12);
  run("playMap('bamboo','nudelkoket','medium','classic');");
  assert.equal(run('isPath(5,4)'),true);
  assert.equal(run('KUNG.y===rutaMitt(10.5,8).y'),true);
});
test('maze live builds preserve enemy position, reserve occupied segments and eventually leak once',()=>{
  const run=engine();
  run("playMap('bamboo','nudelkoket','medium','maze');valjButik('zebravakt');placera(2,3);startaVag();spawnaNasta();var creep=fiender[0];gaBana(creep,.3);var originalX=creep.x;var originalY=creep.y;saldo=10000;");
  run("valdButik='zebravakt';placera(1,4);");
  assert.equal(run('arme.length'),1);
  run("valdButik='zebravakt';placera(5,4);");
  assert.equal(run('arme.length'),2);
  assert.equal(run('creep.x===originalX && creep.y===originalY'),true);
  assert.equal(run("creep.route.every(p=>!arme.some(a=>{const t=rutaMitt(a.kol,a.rad);return t.x===p.x&&t.y===p.y;}))"),true);
  run("for(let i=0;i<2000&&!creep.avraknad;i++)gaBana(creep,1/60);");
  assert.equal(run('creep.avraknad'),true);
  assert.equal(run('liv'),19);
  run('gaBana(creep,1);');
  assert.equal(run('liv'),19);
});
test('maze rejects isolating a live enemy even when entrance still has a route',()=>{
  const run=engine();
  run("playMap('bamboo','nudelkoket','medium','maze');saldo=10000;for(const [kol,rad] of [[3,2],[2,3],[4,3]]){valdButik='zebravakt';placera(kol,rad);}startaVag();spawnaNasta();var trapped=fiender[0];Object.assign(trapped,rutaMitt(3,3));trapped.route=[rutaMitt(3,3),rutaMitt(3,4)];trapped.banSteg=0;var before=saldo;valdButik='zebravakt';placera(3,4);");
  assert.equal(run('saldo===before'),true);
  assert.equal(run('arme.length'),3);
});
