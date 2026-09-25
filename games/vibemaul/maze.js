// Kortaste vagar pa ett fint rutnat (halvrutor), som WC3:s pathing-grid.
// Fienderna gar i atta riktningar, men far inte skara ett horn: ett diagonalt
// steg kraver att bada raka grannarna ar fria. Tva torn som nuddar varandra
// horn i horn tatar alltsa, och forskjutna "trapp"-vaggar haller.
const VM_MAZE = (() => {
  const nyckel = p => p.kol + ',' + p.rad;
  const D2 = Math.SQRT2;
  // Fast ordning (raka forst) gor rutterna deterministiska vid lika langd.
  const RIKTNINGAR = [[1, 0, 1], [0, 1, 1], [-1, 0, 1], [0, -1, 1], [1, 1, D2], [1, -1, D2], [-1, 1, D2], [-1, -1, D2]];

  // Minsta binara heap pa [kostnad, ordning, index].
  function heap() {
    const a = [];
    const mindre = (i, j) => a[i][0] < a[j][0] - 1e-9 || (Math.abs(a[i][0] - a[j][0]) <= 1e-9 && a[i][1] < a[j][1]);
    return {
      get size() { return a.length; },
      push(x) { a.push(x); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (!mindre(i, p)) break; [a[i], a[p]] = [a[p], a[i]]; i = p; } },
      pop() {
        const top = a[0], last = a.pop();
        if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < a.length && mindre(l, m)) m = l; if (r < a.length && mindre(r, m)) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } }
        return top;
      }
    };
  }

  // blockerad: Uint8Array (kol*rad), 1 = spärrad. Returnerar cellerna eller null.
  function vag(fran, till, blockerad, kol, rad) {
    const idx = (k, r) => r * kol + k;
    if (blockerad[idx(fran.kol, fran.rad)] || blockerad[idx(till.kol, till.rad)]) return null;
    const dist = new Float64Array(kol * rad).fill(Infinity), fore = new Int32Array(kol * rad).fill(-1);
    const h = heap(); let ordning = 0;
    const start = idx(fran.kol, fran.rad), mal = idx(till.kol, till.rad);
    dist[start] = 0; h.push([0, ordning++, start]);
    while (h.size) {
      const [d, , i] = h.pop();
      if (d > dist[i] + 1e-9) continue;
      if (i === mal) break;
      const k = i % kol, r = (i - k) / kol;
      for (const [dk, dr, c] of RIKTNINGAR) {
        const nk = k + dk, nr = r + dr;
        if (nk < 0 || nr < 0 || nk >= kol || nr >= rad) continue;
        const n = idx(nk, nr);
        if (blockerad[n]) continue;
        if (dk && dr && (blockerad[idx(k + dk, r)] || blockerad[idx(k, r + dr)])) continue;
        const nd = d + c;
        if (nd < dist[n] - 1e-9) { dist[n] = nd; fore[n] = i; h.push([nd, ordning++, n]); }
      }
    }
    if (dist[mal] === Infinity) return null;
    const celler = [];
    for (let i = mal; i !== -1; i = fore[i]) celler.push({ kol: i % kol, rad: Math.floor(i / kol) });
    return celler.reverse();
  }

  function langd(celler) {
    let l = 0;
    for (let i = 1; i < celler.length; i++) l += Math.hypot(celler[i].kol - celler[i - 1].kol, celler[i].rad - celler[i - 1].rad);
    return l;
  }

  // layout i fina rutor: { kol, rad, start, checkpoints[], mal, fasta[[k,r]] }
  function skapa(layout) {
    const stopp = [...layout.checkpoints, layout.mal];
    const bas = new Uint8Array(layout.kol * layout.rad);
    for (const [k, r] of layout.fasta || []) bas[r * layout.kol + k] = 1;

    // Rutt fran en ruta via alla aterstaende stopp till malet. extra: fina
    // rutor som ar sparrade utover de fasta (tornen). stoppEfter[i]: hur manga
    // stopp som ar avklarade vid cell i. null om nagot ben ar blockerat.
    function ruttFran(extra, fran, nastaStopp = 0) {
      const blockerad = bas.slice();
      for (const i of extra || []) blockerad[i] = 1;
      const celler = [fran], stoppEfter = [nastaStopp];
      let vid = fran;
      for (let i = nastaStopp; i < stopp.length; i++) {
        const ben = vag(vid, stopp[i], blockerad, layout.kol, layout.rad);
        if (!ben) return null;
        for (let j = 1; j < ben.length; j++) { celler.push(ben[j]); stoppEfter.push(j === ben.length - 1 ? i + 1 : i); }
        vid = stopp[i];
      }
      return { celler, stoppEfter, langd: langd(celler) };
    }
    const rutt = extra => ruttFran(extra, layout.start, 0);
    const luftStopp = () => [layout.start, ...stopp];
    const arFast = i => bas[i] === 1;
    return { rutt, ruttFran, luftStopp, arFast, stopp };
  }

  return { skapa, vag, langd, nyckel };
})();
if (typeof module !== 'undefined') module.exports = VM_MAZE;
