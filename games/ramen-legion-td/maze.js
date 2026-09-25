// Deterministic four-direction shortest paths; towers occupy whole cells.
const LTD_MAZE = (() => {
  const start={kol:0,rad:4}, goal={kol:11,rad:4};
  const key=p=>p.kol+','+p.rad;
  function route(blockers, from=start) {
    const blocked=new Set(blockers.map(key));
    if(blocked.has(key(from)) || blocked.has(key(goal))) return null;
    const queue=[from], previous=new Map([[key(from),null]]);
    for(let i=0;i<queue.length;i++) {
      const p=queue[i];
      if(key(p)===key(goal)) {
        const path=[]; let current=p;
        while(current) {path.push(current);current=previous.get(key(current));}
        return path.reverse();
      }
      for(const [dk,dr] of [[1,0],[0,-1],[0,1],[-1,0]]) {
        const n={kol:p.kol+dk,rad:p.rad+dr}, id=key(n);
        if(n.kol<0 || n.kol>=12 || n.rad<0 || n.rad>=9 || blocked.has(id) || previous.has(id))continue;
        previous.set(id,p);queue.push(n);
      }
    }
    return null;
  }
  return {start,goal,route};
})();
