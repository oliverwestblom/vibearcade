// Vibemaul – spelmotorn. Helt fri fran DOM: allt tillstand ligger i ett
// objekt och koordinater ar i rutor, sa samma kod kors i webblasaren och i
// node-testerna. game.js ritar och hanterar input.
const VM_SIM = (() => {
  const D = typeof VM_DATA !== 'undefined' ? VM_DATA : require('./data.js');
  const M = typeof VM_MAZE !== 'undefined' ? VM_MAZE : require('./maze.js');
  const SKOTTFART = 10;          // rutor per sekund
  const MAL_LAGEN = ['forst', 'sist', 'stark', 'nara'];
  const FK = D.KOL * 2, FR = D.RAD * 2;   // fina rutor (halvrutor), som WC3:s pathing-grid

  // ---------- rena regler ----------
  function typMultiplikator(attack, pansar, immunMagi) {
    if (immunMagi && attack === 'magi') return 0;
    return (D.TYPTABELL[attack] || D.TYPTABELL.vanlig)[pansar] ?? 1;
  }
  function kanTraffa(def, f) {
    const mal = def.mal || 'bada';
    return mal === 'bada' || (mal === 'luft') === !!f.luft;
  }
  // Med s raknas aven synergi (liknande torn intill) och kraftverkens aura.
  // Skademultipel for ett steg i kedjan: 1x for vaggen, kurva.skada x for mastartornet.
  function stegSkada(def) {
    const k = D.BYGGARE_AV[def.byggare].kurva, p = def.antalSteg > 1 ? def.steg / (def.antalSteg - 1) : 0;
    return Math.pow(k.skada, Math.pow(p, k.form));
  }
  function tornStats(t, s) {
    const def = D.TORN[t.typ];
    let grannar = 0, fartBonus = 0;
    if (s) for (const o of s.torn) {
      if (o === t) continue;
      const od = D.TORN[o.typ], d = Math.hypot(o.kol - t.kol, o.rad - t.rad);
      if (def.synergi && d <= def.synergi.radie &&
        (def.synergi.samma === 'typ' ? o.typ === t.typ : od.byggare === def.byggare)) grannar++;
      if (od.aura && d <= od.rackvidd)
        fartBonus = Math.max(fartBonus, od.aura.fart * (1 + 0.5 * (o.niva - 1)));
    }
    const synergi = def.synergi ? Math.min(grannar, def.synergi.max) * def.synergi.perTorn : 0;
    const niva = stegSkada(def) * (1 + synergi);
    return { skada: def.skada * niva, rackvidd: def.rackvidd,
      intervall: def.intervall / (1 + fartBonus), gift: def.gift ? def.gift.perSekund * niva : 0,
      grannar, synergi, fartBonus };
  }
  // Statistiken beror pa grannarna, sa den cachas och gors om nar tornen andras.
  function stats(s, t) {
    if (t.cacheVersion !== s.version) { t.cache = tornStats(t, s); t.cacheVersion = s.version; }
    return t.cache;
  }
  // Priset for att uppgradera till nasta torn i kedjan, eller null i toppen.
  function uppgraderingspris(t) {
    const nasta = D.TORN[D.TORN[t.typ].nasta];
    if (!nasta) return null;
    const k = D.BYGGARE_AV[nasta.byggare].kurva;
    return Math.ceil(nasta.pris * Math.pow(k.kostnad, nasta.steg / (nasta.antalSteg - 1)));
  }
  // Mastartornet (sista steget) kraver en frostkristall.
  function kraverKristall(t) { const n = D.TORN[D.TORN[t.typ].nasta]; return !!n && n.steg === n.antalSteg - 1; }
  function saljvarde(s, t) {
    // Byggt i den har byggfasen och aldrig stridit: angra gratis.
    return t.stridat ? Math.floor(t.betalt * (D.TORN[t.typ].saljAndel ?? D.SALJ_ANDEL)) : t.betalt;
  }

  function slump(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function slumpaByggare(rng, antal, utom = []) {
    const kvar = D.BYGGARE.map(b => b.id).filter(id => !utom.includes(id));
    const valda = [];
    while (valda.length < antal && kvar.length) valda.push(kvar.splice(Math.floor(rng() * kvar.length), 1)[0]);
    return valda;
  }

  // ---------- match ----------
  function skapa(opt = {}) {
    const karta = D.KARTOR.find(k => k.id === (opt.karta || D.KARTOR[0].id));
    if (!karta) throw new Error('Okänd karta');
    const svarighet = opt.svarighet || 'normal';
    if (!D.SVARIGHET[svarighet]) throw new Error('Okänd svårighet');
    const byggare = [...new Set(opt.byggare || ['frost'])];
    if (!byggare.length || byggare.some(b => !D.BYGGARE_AV[b])) throw new Error('Okänd byggare');
    // Vagfinningen sker pa halvrutor (FK x FR). Start, checkpoints och port
    // ar hela rutor, 2x2 fina rutor som alltid halls fria.
    const fasta = [], skyddat = new Set();
    const helRuta = (k, r) => [[2 * k, 2 * r], [2 * k + 1, 2 * r], [2 * k, 2 * r + 1], [2 * k + 1, 2 * r + 1]];
    for (const [k, r] of karta.stenar) fasta.push(...helRuta(k, r));
    for (const c of [karta.start, ...karta.checkpoints, karta.mal]) for (const [k, r] of helRuta(c.kol, c.rad)) skyddat.add(r * FK + k);
    const fin = c => ({ kol: 2 * c.kol + 1, rad: 2 * c.rad + 1 });
    const maze = M.skapa({ kol: FK, rad: FR, start: { kol: 0, rad: 2 * karta.start.rad + 1 },
      checkpoints: karta.checkpoints.map(fin), mal: { kol: FK - 1, rad: 2 * karta.mal.rad + 1 }, fasta });
    maze.skyddat = skyddat;
    const s = {
      karta, maze, svarighet, byggare, seed: opt.seed ?? 1, rng: slump(opt.seed ?? 1),
      extraByggare: opt.extraByggare !== false, oandlig: !!opt.oandlig, test: !!opt.test, version: 0,
      // Testlage: oandligt guld och kristaller, och liven tar aldrig slut.
      guld: opt.test ? Infinity : opt.guld ?? D.START_GULD, liv: D.START_LIV, vag: 1, fas: 'bygg', kristaller: opt.test ? Infinity : 0,
      torn: [], fiender: [], skott: [], ko: [], spawnTimer: 0, nastaId: 1, tid: 0,
      erbjudande: null, aktuellVag: null, handelser: [],
      stat: { dodade: 0, lackta: 0, tjanat: 0, byggt: 0 }
    };
    s.rutt = rutt(s, s.torn);
    s.rakLangd = s.rutt.langd;
    return s;
  }

  // Ett torn star pa (kol, rad) i halvrutesteg och tacker 2x2 fina rutor.
  function fotavtryck(kol, rad) {
    const k = Math.round(kol * 2), r = Math.round(rad * 2);
    return [r * FK + k, r * FK + k + 1, (r + 1) * FK + k, (r + 1) * FK + k + 1];
  }
  // Fina rutor -> punkter i hela rutor (det som rackvidd och rorelse anvander).
  function finMitt(c) { return { x: (c.kol + 0.5) / 2, y: (c.rad + 0.5) / 2 }; }
  function rutt(s, torn, extra = []) {
    const sparr = extra.slice();
    for (const t of torn) sparr.push(...fotavtryck(t.kol, t.rad));
    const r = s.maze.rutt(sparr);
    return r && { ...r, langd: r.langd / 2, punkter: r.celler.map(finMitt) };
  }

  function tornPa(s, kol, rad) { return s.torn.find(t => t.kol === kol && t.rad === rad); }
  // Tornet vars ruta innehaller punkten (x, y) i hela rutor.
  function tornVid(s, x, y) { return s.torn.find(t => x >= t.kol && x < t.kol + 1 && y >= t.rad && y < t.rad + 1); }
  function overlappar(s, kol, rad) { return s.torn.find(t => Math.abs(t.kol - kol) < 1 && Math.abs(t.rad - rad) < 1); }
  function handelse(s, h) { s.handelser.push(h); if (s.handelser.length > 200) s.handelser.shift(); }

  // Anti-juggle: fina rutor som nagon levande markfiende fortfarande ska passera.
  function uppbokadeRutor(s) {
    const upptaget = new Set();
    for (const f of s.fiender) {
      if (f.dod || f.luft) continue;
      for (let i = Math.max(0, f.i - 1); i < f.celler.length; i++) upptaget.add(f.celler[i].rad * FK + f.celler[i].kol);
    }
    return upptaget;
  }

  // Kontrollerar ett bygge utan att andra nagot. Returnerar den nya rutten
  // aven nar guldet inte racker, sa forhandsvisningen kan visa den.
  function provaBygge(s, typId, kol, rad) {
    const def = D.TORN[typId];
    if (!['bygg', 'strid'].includes(s.fas) || s.erbjudande) return { ok: false, orsak: 'Du kan inte bygga just nu.' };
    if (!def || !s.byggare.includes(def.byggare)) return { ok: false, orsak: 'Tornet hör inte till dina byggare.' };
    if (def.steg !== 0) return { ok: false, orsak: `Bygg ${D.BYGGARE_AV[def.byggare].torn[0].namn} och uppgradera den till ${def.namn}.` };
    if (!Number.isInteger(kol * 2) || !Number.isInteger(rad * 2) || kol < 0 || rad < 0 || kol > D.KOL - 1 || rad > D.RAD - 1)
      return { ok: false, orsak: 'Utanför fältet.' };
    const fot = fotavtryck(kol, rad);
    if (fot.some(i => s.maze.arFast(i))) return { ok: false, orsak: 'Här står en klippa.' };
    if (fot.some(i => s.maze.skyddat.has(i))) return { ok: false, orsak: 'Start och port måste hållas fria.' };
    if (overlappar(s, kol, rad)) return { ok: false, orsak: 'Platsen är upptagen.' };
    if (s.fas === 'strid') {
      const upptaget = uppbokadeRutor(s);
      const iVagen = fot.some(i => upptaget.has(i)) ||
        s.fiender.some(f => !f.dod && !f.luft && f.x > kol - 0.1 && f.x < kol + 1.1 && f.y > rad - 0.1 && f.y < rad + 1.1);
      if (iVagen) return { ok: false, orsak: 'En fiende är redan på väg genom rutan. Bygg vid sidan av, eller när vågen är över.', juggle: true };
    }
    const nyRutt = rutt(s, s.torn, fot);
    if (!nyRutt) return { ok: false, orsak: 'Bygget skulle stänga vägen. Lämna alltid en öppen passage.', blockerar: true };
    if (s.guld < def.pris) return { ok: false, orsak: `Saknar ${def.pris - s.guld} guld.`, rutt: nyRutt };
    return { ok: true, rutt: nyRutt };
  }

  function bygg(s, typId, kol, rad) {
    const prov = provaBygge(s, typId, kol, rad);
    if (!prov.ok) return prov;
    const def = D.TORN[typId];
    s.guld -= def.pris;
    const t = { id: s.nastaId++, typ: typId, kol, rad, niva: 1, betalt: def.pris, mal: 'forst', kylning: 0,
      vinkel: -Math.PI / 2, stridat: false, skott: 0 };
    s.torn.push(t); s.rutt = prov.rutt; s.stat.byggt++; s.version++;
    return { ok: true, torn: t };
  }

  function uppgradera(s, id) {
    const t = s.torn.find(x => x.id === id);
    if (!t || !['bygg', 'strid'].includes(s.fas)) return { ok: false, orsak: 'Kan inte uppgradera nu.' };
    const pris = uppgraderingspris(t);
    if (pris === null) return { ok: false, orsak: 'Tornet är redan rasens mästartorn.' };
    const kristall = kraverKristall(t);
    if (kristall && s.kristaller < 1) return { ok: false, orsak: `${D.TORN[D.TORN[t.typ].nasta].namn} är ett mästartorn och kräver en frostkristall. Döda en boss.` };
    if (s.guld < pris) return { ok: false, orsak: `Saknar ${pris - s.guld} guld.` };
    const fore = D.TORN[t.typ].namn;
    s.guld -= pris; t.betalt += pris; t.typ = D.TORN[t.typ].nasta; t.niva = D.TORN[t.typ].steg + 1; s.version++;
    if (kristall) { s.kristaller--; t.kristall = true; }
    return { ok: true, pris, fran: fore, till: D.TORN[t.typ].namn };
  }

  function salj(s, id) {
    const t = s.torn.find(x => x.id === id);
    if (!t) return { ok: false, orsak: 'Inget torn valt.' };
    if (s.fas !== 'bygg') return { ok: false, orsak: 'Torn kan bara säljas mellan vågorna.' };
    const varde = saljvarde(s, t);
    s.guld += varde;
    if (t.kristall) s.kristaller++;
    s.torn = s.torn.filter(x => x !== t); s.version++;
    s.rutt = rutt(s, s.torn);
    return { ok: true, varde };
  }

  // Flerval: uppgradera varje torn en niva, billigast forst, sa langt guldet racker.
  function uppgraderaFlera(s, ids) {
    const torn = ids.map(id => s.torn.find(t => t.id === id)).filter(Boolean)
      .filter(t => uppgraderingspris(t) !== null)
      .sort((a, b) => uppgraderingspris(a) - uppgraderingspris(b) || a.id - b.id);
    let antal = 0, kostnad = 0, orsak = null;
    for (const t of torn) {
      const r = uppgradera(s, t.id);
      if (r.ok) { antal++; kostnad += r.pris; } else orsak = orsak || r.orsak;
    }
    return { antal, kostnad, hoppade: torn.length - antal, orsak };
  }
  function saljFlera(s, ids) {
    if (s.fas !== 'bygg') return { antal: 0, varde: 0, orsak: 'Torn kan bara säljas mellan vågorna.' };
    let antal = 0, varde = 0;
    for (const id of ids) { const r = salj(s, id); if (r.ok) { antal++; varde += r.varde; } }
    return { antal, varde };
  }

  function valjMal(s, id, lage) {
    const t = s.torn.find(x => x.id === id);
    if (!t || !MAL_LAGEN.includes(lage)) return false;
    t.mal = lage; return true;
  }

  function valjExtraByggare(s, id) {
    if (!s.erbjudande || !s.erbjudande.includes(id)) return false;
    s.byggare.push(id); s.erbjudande = null;
    return true;
  }

  function startaVag(s) {
    if (s.fas !== 'bygg' || s.erbjudande) return false;
    const v = D.vag(s.vag, s.svarighet);
    s.aktuellVag = v; s.ko = v.kon.map(f => ({ ...f })); s.spawnTimer = 0; s.fas = 'strid';
    for (const t of s.torn) { t.stridat = true; t.kylning = 0; }
    return true;
  }

  // ---------- strid ----------
  function spawna(s, mall) {
    // Flygare tar raka linjer mellan stoppen och bryr sig inte om tornen.
    const celler = mall.luft ? s.maze.luftStopp() : s.rutt.celler;
    const punkter = celler.map(finMitt);
    let total = 0;
    for (let i = 1; i < punkter.length; i++) total += Math.hypot(punkter[i].x - punkter[i - 1].x, punkter[i].y - punkter[i - 1].y);
    s.fiender.push({ ...mall, id: s.nastaId++, halsa: mall.maxHalsa, x: punkter[0].x, y: punkter[0].y,
      celler, punkter, i: 1, gatt: 0, total, kyla: 0, kylaTid: 0, gift: null, dod: false, vinkel: 0 });
  }

  function kvar(f) { return f.total - f.gatt; }

  function doda(s, f) {
    f.dod = true; s.stat.dodade++;
    s.guld += f.belaning; s.stat.tjanat += f.belaning;
    if (f.boss) { s.kristaller++; handelse(s, { typ: 'kristall', x: f.x, y: f.y, namn: f.namn }); }
    handelse(s, { typ: 'dod', x: f.x, y: f.y, farg: f.farg, belaning: f.belaning, boss: f.boss });
  }

  function skada(s, f, belopp, attack) {
    if (f.dod) return 0;
    const d = belopp * typMultiplikator(attack, f.pansar, f.immunMagi);
    if (d <= 0) return 0;
    f.halsa -= d;
    if (f.halsa <= 0) doda(s, f);
    return d;
  }

  function kyl(f, kyla, attack) {
    if (!kyla || f.dod || (attack === 'magi' && f.immunMagi)) return;
    const andel = f.boss ? kyla.andel / 2 : kyla.andel;
    // Starkare kyla behalls; samma eller starkare fornyar tiden.
    if (f.kylaTid <= 0 || andel >= f.kyla) { f.kyla = andel; f.kylaTid = kyla.tid; }
  }

  function lacka(s, f) {
    f.dod = true; s.stat.lackta++; s.stat.lacktaLiv = (s.stat.lacktaLiv || 0) + f.liv;
    if (!s.test) s.liv = Math.max(0, s.liv - f.liv);
    handelse(s, { typ: 'lacka', x: f.x, y: f.y, liv: f.liv });
    if (s.liv <= 0) { s.fas = 'forlust'; handelse(s, { typ: 'forlust' }); }
  }

  function flytta(s, f, dt) {
    if (f.gift) {
      skada(s, f, f.gift.dps * dt, 'magi');
      f.gift.tid -= dt; if (f.gift.tid <= 0) f.gift = null;
      if (f.dod) return;
    }
    if (f.kylaTid > 0) { f.kylaTid -= dt; if (f.kylaTid <= 0) f.kyla = 0; }
    let rest = f.fart * (1 - f.kyla) * dt;
    while (rest > 0 && !f.dod) {
      if (f.i >= f.punkter.length) { lacka(s, f); return; }
      const p = f.punkter[f.i], dx = p.x - f.x, dy = p.y - f.y, d = Math.hypot(dx, dy);
      const steg = Math.min(d, rest);
      if (d > 0) { f.vinkel = Math.atan2(dy, dx); f.x += dx / d * steg; f.y += dy / d * steg; }
      f.gatt += steg; rest -= steg;
      if (d <= steg) f.i++;
    }
  }

  // De n basta malen enligt tornets malval.
  function hittaMal(s, t, st, n = 1) {
    const def = D.TORN[t.typ], kandidater = [];
    for (const f of s.fiender) {
      if (f.dod || !kanTraffa(def, f)) continue;
      const avst = Math.hypot(f.x - (t.kol + 0.5), f.y - (t.rad + 0.5));
      if (avst > st.rackvidd) continue;
      kandidater.push({ f, p: t.mal === 'sist' ? -kvar(f) : t.mal === 'stark' ? -f.halsa : t.mal === 'nara' ? avst : kvar(f) });
    }
    kandidater.sort((a, b) => a.p - b.p || a.f.id - b.f.id);
    return kandidater.slice(0, n).map(k => k.f);
  }

  function traff(s, sk) {
    const def = D.TORN[sk.typ];
    const mal = sk.mal, omrade = sk.omrade ?? def.omrade;
    const traffade = [];
    const belopp = f => sk.skada * (f.boss && def.bossSkada ? def.bossSkada : 1) * (f.luft && def.luftSkada ? def.luftSkada : 1);
    if (omrade) {
      for (const f of s.fiender) {
        if (f.dod || !kanTraffa(def, f)) continue;
        if (Math.hypot(f.x - sk.x, f.y - sk.y) <= omrade) { skada(s, f, belopp(f), def.attack); kyl(f, def.kyla, def.attack); traffade.push(f); }
      }
      handelse(s, { typ: 'small', x: sk.x, y: sk.y, r: omrade, farg: sk.farg });
    } else if (mal && !mal.dod) {
      skada(s, mal, belopp(mal), def.attack); kyl(mal, def.kyla, def.attack); traffade.push(mal);
      if (sk.gift && !mal.dod && !(mal.immunMagi)) {
        if (!mal.gift || mal.gift.dps <= sk.gift) mal.gift = { dps: sk.gift, tid: def.gift.tid };
      }
    }
    if (def.kedja && traffade.length) {
      const anvanda = new Set(traffade.map(f => f.id));
      let fran = traffade[0];
      const blixt = [{ x: sk.x, y: sk.y }];
      for (let h = 0; h < def.kedja.hopp; h++) {
        let nasta = null, bast = Infinity;
        for (const f of s.fiender) {
          if (f.dod || anvanda.has(f.id) || !kanTraffa(def, f)) continue;
          const d = Math.hypot(f.x - fran.x, f.y - fran.y);
          if (d <= def.kedja.radie && d < bast) { nasta = f; bast = d; }
        }
        if (!nasta) break;
        anvanda.add(nasta.id); blixt.push({ x: nasta.x, y: nasta.y });
        skada(s, nasta, sk.skada * def.kedja.andel, def.attack);
        fran = nasta;
      }
      if (blixt.length > 1) handelse(s, { typ: 'blixt', punkter: blixt, farg: sk.farg });
    }
  }

  function steg(s, dt) {
    if (s.fas !== 'strid') return;
    s.tid += dt;
    s.spawnTimer -= dt;
    while (s.spawnTimer <= 0 && s.ko.length) {
      const f = s.ko.shift();
      spawna(s, f);
      s.spawnTimer += (s.ko[0] ? Math.max(f.spawn, s.ko[0].spawn) : 0) || 0.8;
    }
    for (const f of s.fiender) { if (!f.dod) flytta(s, f, dt); if (s.fas !== 'strid') return; }

    for (const t of s.torn) {
      t.kylning -= dt;
      if (t.kylning > 0) continue;
      const def = D.TORN[t.typ];
      if (def.stod) { t.kylning = 1; continue; }
      const st = stats(s, t), mal = hittaMal(s, t, st, def.multiskott || 1);
      if (!mal.length) { t.kylning = 0; continue; }
      const x = t.kol + 0.5, y = t.rad + 0.5, farg = D.BYGGARE_AV[def.byggare].farg;
      t.vinkel = Math.atan2(mal[0].y - y, mal[0].x - x); t.kylning += st.intervall; t.skott++;
      if (def.virvel) {
        // Stampar runt sig sjalv: traffar allt inom rackvidden.
        traff(s, { typ: t.typ, x, y, mal: null, skada: st.skada, omrade: st.rackvidd, farg });
        continue;
      }
      for (const m of mal) {
        const sk = { typ: t.typ, x, y, mal: m, malX: m.x, malY: m.y, skada: st.skada, gift: st.gift, farg, attack: def.attack };
        // Narstrid traffar direkt, utan projektil.
        if (def.narstrid) { sk.x = m.x; sk.y = m.y; traff(s, sk); handelse(s, { typ: 'slag', x: m.x, y: m.y, farg }); }
        else s.skott.push(sk);
      }
    }

    for (const sk of s.skott) {
      if (sk.mal && !sk.mal.dod) { sk.malX = sk.mal.x; sk.malY = sk.mal.y; }
      const dx = sk.malX - sk.x, dy = sk.malY - sk.y, d = Math.hypot(dx, dy), steg = SKOTTFART * dt;
      if (d <= steg) {
        sk.x = sk.malX; sk.y = sk.malY; sk.klar = true;
        if (sk.mal && sk.mal.dod) sk.mal = null;
        if (sk.mal || D.TORN[sk.typ].omrade) traff(s, sk);
      } else { sk.x += dx / d * steg; sk.y += dy / d * steg; }
    }
    s.skott = s.skott.filter(sk => !sk.klar);
    s.fiender = s.fiender.filter(f => !f.dod);
    if (s.fas === 'strid' && !s.ko.length && !s.fiender.length) avslutaVag(s);
  }

  function avslutaVag(s) {
    const v = s.aktuellVag;
    s.guld += v.bonus; s.stat.tjanat += v.bonus;
    s.skott = [];
    handelse(s, { typ: 'vagklar', nummer: v.nummer, bonus: v.bonus });
    if (!s.oandlig && v.nummer === D.ANTAL_VAGOR) { s.fas = 'vinst'; handelse(s, { typ: 'vinst' }); return; }
    s.vag++; s.fas = 'bygg'; s.aktuellVag = null;
    if (s.extraByggare && v.nummer === D.EXTRA_BYGGARE_EFTER_VAG) {
      const val = slumpaByggare(s.rng, 2, s.byggare);
      if (val.length) s.erbjudande = val;
    }
  }

  // Kor en hel vag i fasta steg. Anvands av testerna och "snabbspola".
  function korVag(s, dt = 1 / 30, max = 600) {
    if (!startaVag(s)) return false;
    for (let t = 0; t < max && s.fas === 'strid'; t += dt) steg(s, dt);
    return true;
  }

  return { skapa, provaBygge, bygg, uppgradera, salj, uppgraderaFlera, saljFlera, valjMal, valjExtraByggare, startaVag, steg, korVag,
    tornStats, stats, stegSkada, uppgraderingspris, kraverKristall, saljvarde, typMultiplikator, kanTraffa, slump, slumpaByggare,
    uppbokadeRutor, tornPa, tornVid, overlappar, fotavtryck, finMitt, kvar, MAL_LAGEN, FK, FR };
})();
if (typeof module !== 'undefined') module.exports = VM_SIM;
