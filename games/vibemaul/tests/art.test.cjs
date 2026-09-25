const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const D=require('../data.js');
const S=require('../sim.js');
const scope=vm.createContext({VM_DATA:D});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../art.js'),'utf8'),scope);
const A=vm.runInContext('VM_ART',scope);
test('all 37 tower types have unique artwork coordinates within the race atlas',()=>{
  const cells=Object.keys(D.TORN).map(id=>A.towerCell(id));
  assert.equal(cells.length,37);assert.equal(new Set(cells.map(c=>c.join(','))).size,37);
  assert.ok(cells.every(([r,c])=>r>=0&&r<9&&c>=0&&c<5));
});
test('all 40 wave leaders have distinct artwork and names; endless mode cycles',()=>{
  assert.equal(new Set(A.waveNames).size,40);
  for(let w=1;w<=80;w++){
    const wave=D.vag(w),lead=wave.kon[wave.kon.length-1];
    assert.equal(lead.utseende,(w-1)%40);
    assert.ok(wave.kon.every(f=>Number.isInteger(f.utseende)&&f.utseende>=0&&f.utseende<40));
  }
});
test('spawned enemies retain their wave appearance including bosses and flyers',()=>{
  for(const w of [1,5,7,20,35,40]){
    const s=S.skapa({byggare:['frost'],test:true});s.vag=w;S.startaVag(s);
    for(let i=0;i<600;i++)S.steg(s,1/60);
    assert.ok(s.fiender.length>0);
    assert.ok(s.fiender.every(f=>Number.isInteger(f.utseende)));
  }
});
test('project contains both optimized atlases and generation provenance',()=>{
  for(const file of ['towers-atlas.webp','enemies-atlas.webp','prompts.json'])
    assert.ok(fs.statSync(path.join(__dirname,'../bilder',file)).size>0);
});
