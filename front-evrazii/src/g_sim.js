// ===== Симуляция: государства, города, экономика, армии, удары, дипломатия, боты =====
let S = null, OWN = [];
const EV = { owner() { }, boom() { }, toast() { }, fly() { }, over() { } };
const DIFF = [{ n: 'ЛЕГКО', ai: .7, me: 1.3, grace: 60 }, { n: 'СРЕДНЕ', ai: 1, me: 1, grace: 30 }, { n: 'ТЯЖЕЛО', ai: 1.35, me: .85, grace: 12 }];
const K_INC = .3, WIN_SHARE = .5;
const ruName = f => RU[W.N[f]] || W.N[f];
const key2 = (a, b) => a < b ? a + '|' + b : b + '|' + a;
const atWar = (a, b) => a !== b && S.war[key2(a, b)] != null;
const allied = (a, b) => a === b || S.ally[key2(a, b)] != null;
const lvOf = pop => pop < 140 ? 1 : pop < 320 ? 2 : pop < 650 ? 3 : 4;
const cnt = (c, k) => { const id = BI[k]; let n = 0; for (let j = 0; j < c.b.length; j++) if (c.b[j] === id) n++; return n; };
const slotsOf = c => Math.max(8 + 4 * lvOf(c.pop), (c.s0 || 0) + 1);
const atkOf = g => g.reduce((a, n, k) => a + n * UNITS[k].atk, 0);
const defOf = g => g.reduce((a, n, k) => a + n * UNITS[k].def, 0);
const gSum = g => g.reduce((a, n) => a + n, 0);
const baseRel = (a, b) => Math.round((hash2(Math.min(a, b) * 7 + 3, Math.max(a, b) * 13 + 1) - .42) * 50);
function relOf(a, b) { if (a === b) return 100; const v = S.rel[key2(a, b)]; return v == null ? baseRel(a, b) : v; }
function addRel(a, b, d) { if (a !== b) S.rel[key2(a, b)] = clamp(relOf(a, b) + d, -100, 100); }
function rebuildOwn() { OWN = W.N.map(() => []); S.C.forEach((c, i) => OWN[c.o].push(i)); }
function enemiesOf(f) { const r = []; for (let o = 0; o < S.F.length; o++) if (S.F[o].alive && atWar(f, o)) r.push(o); return r; }
function alliesOf(f) { const r = []; for (let o = 0; o < S.F.length; o++) if (o !== f && S.F[o].alive && allied(f, o)) r.push(o); return r; }
function neighborsOf(f) { const s = new Set(); for (const i of OWN[f]) for (const e of W.adj[i]) { const o = S.C[e.j].o; if (o !== f) s.add(o); } return [...s]; }
function initNear() { if (W.near) return; const C0 = W.C0; W.near = C0.map((a, i) => { const r = []; for (let j = 0; j < C0.length; j++) { if (j === i) continue; const b = C0[j]; if (Math.abs(a.lat - b.lat) > 6.5) continue; const km = kmXY(a, b); if (km < 620) r.push({ j, km }); } return r; }); }

function logMsg(text, kind, ci, fs) {
  S.log.push({ d: Math.floor(S.day), t: text, k: kind || '', c: ci == null ? -1 : ci }); if (S.log.length > 160) S.log.splice(0, S.log.length - 160);
  if (!fs || fs.includes(S.player)) EV.toast(text, kind, ci);
}

// ---------- новая игра ----------
function mkCity(i) {
  const c0 = W.C0[i], f = c0.f, st = statOf(W.N[f]), pw = st[0], ec = st[1], ind = st[3], ur = st[4], nk = st[5], cap = W.capOf[f] === i;
  const h = k => hash2(i * 31 + k, f * 17 + k * 7);
  const pop = Math.round(clamp(12 * Math.pow(c0.pop, .45), 40, 1500)), lv = lvOf(pop), b = [];
  const add = (k, n) => { for (let j = 0; j < (n == null ? 1 : n); j++) b.push(BI[k]); };
  add('house', lv > 1 ? 2 : 1); add('farm', cap && lv > 2 ? 2 : 1);
  add('factory', clamp(Math.round(ind / 4 * (cap ? 1.5 : .8) + h(1) - .5), cap ? 1 : 0, 3));
  if ((c0.dep & 1) && h(2) < .75) add('mine');
  if (c0.dep & 2) { add('oil'); if (h(3) < .5) add('npz'); }
  if ((c0.dep & 4) && ur >= 2) add('umine');
  if (cap || h(4) < .45) add('tec');
  if (cap && (ur >= 6 || nk > 0) && lv >= 3) add('aes');
  if ((c0.dep & 8) && (cap || h(5) < .45)) add('port');
  if (lv >= 2 && h(6) < .6) add('rail');
  if (cap && lv >= 2 && ec >= 5) add('airport');
  if (cap || (pw >= 5 && h(7) < .35)) add('barracks');
  if (pw >= 3 && (cap || h(8) < .3)) add('zsu');
  if (pw >= 5 && (cap || h(9) < .22)) { add('zrk'); if (cap) add('rls'); }
  if (pw >= 7 && cap) add('pro');
  if (pw >= 5 && !cap && h(10) < .2) add('dronep');
  const g = [0, 0, 0, 0, 0, 0];
  g[0] = 1000 * Math.max(1, Math.round(pw * (cap ? 2.4 : .8) * (.6 + .8 * h(12))));
  g[1] = 10 * Math.round(pw * pw / 10 * (cap ? 2 : .6) * (.4 + h(13)));
  if (pw >= 3) g[2] = 10 * Math.round(pw / 3 * (cap ? 1.6 : .7) * (.3 + h(14)));
  if (pw >= 6) g[3] = 5 * Math.round(pw / 4 * (cap ? 1.5 : .5) * h(15));
  if (pw >= 5) g[4] = 10 * Math.round(pw / 4 * h(16));
  return { o: f, pop, base: Math.round(pop * 1.12), b, h: b.map(() => 100), q: { b: [], u: [], w: [] }, g, ruins: 0, seen: -1, rad: -1, aa: {}, ln: {}, s0: 0 };
}
function newGame(player, diff) {
  _seed = ((Date.now() & 0xffffff) | 1) >>> 0; initNear();
  S = { v: 2, day: 0, speed: 0, player, diff, F: [], C: [], war: {}, ally: {}, trade: {}, sanc: {}, rel: {}, truce: {}, moves: [], proj: [], log: [], offers: [], over: 0, won: 0, auto: 20, name: ruName(player) };
  S.C = W.C0.map((_, i) => mkCity(i)); rebuildOwn();
  W.N.forEach((n, f) => {
    const st = statOf(n), pw = st[0], ec = st[1], oil = st[2], ind = st[3], ur = st[4], nk = st[5], L = OWN[f], me = f === player ? DIFF[diff].me : 1;
    const F = { alive: L.length > 0, money: Math.round((600 + ec * 260) * me), metal: 120 + ind * 45, fuel: 90 + oil * 45, food: 350, ur: ur * 5 + nk * 25, stock: WPN.map(() => 0), air: [0, 0, 0], ships: [0, 0, 0, 0, 0],
      ch: n === 'North Korea' ? 5 : n === 'Switzerland' ? 3 : Math.floor(hash2(f * 3 + 1, 5) * CHARS.length), cap: W.capOf[f], inc: 0, gross: 0, upk: 0, enP: 0, enU: 0, eff: 1, foodD: 0, metalD: 0, fuelD: 0, urD: 0, pow: 0, c0: L.length, lost: 0, took: 0, nukes: 0, nukedBy: -1, blk: 0 };
    S.F.push(F); if (!L.length) return;
    const capI = F.cap, rest = L.filter(i => i !== capI), seaL = L.filter(i => W.C0[i].dep & 8);
    const put = (i, ks) => { const c = S.C[i]; for (const k of ks) { c.b.push(BI[k]); c.h.push(100); } };
    const second = rest.length ? rest[0] : capI, third = rest.length > 1 ? rest[1] : second;
    if (pw >= 4) put(capI, ['dronef', 'dronep']);
    if (pw >= 6) put(second, ['rocketf', 'otrk', 'barracks']);
    if (pw >= 5) put(third, ['airbase']);
    if (pw >= 9) put(capI, ['spro']);
    if (nk >= 2) put(third, ['silo']);
    if (pw >= 6 && seaL.length) put(seaL[seaL.length > 1 ? 1 : 0], ['navbase']);
    const s = F.stock;
    if (pw >= 4) { s[WI.kami] = Math.round(pw * 12); s[WI.scout] = 4; }
    if (pw >= 6) { s[WI.heavy] = Math.round(pw * 3); s[WI.cr1] = Math.round((pw - 4) * 3); s[WI.kab5] = Math.round(pw * 2); }
    if (pw >= 7) s[WI.otr] = Math.round(pw - 5);
    if (pw >= 9) s[WI.hyp] = 2;
    s[WI.nukeT] = nk; s[WI.nukeS] = nk >= 2 ? nk - 1 : 0;
    F.air = [Math.max(0, Math.round(pw - 4)) * 2, Math.max(0, Math.round(pw - 5)) * 2, pw >= 8 ? 2 : 0];
    if (seaL.length) F.ships = [Math.round(pw / 2), pw >= 6 ? Math.round(pw - 5) : 0, pw >= 3 ? 1 + (pw >= 6) : 0, pw >= 9 ? 1 : 0, pw >= 7 ? 2 : 0];
  });
  // энергосеть на старте не должна быть в минусе
  for (let f = 0; f < S.F.length; f++) { const L = OWN[f]; if (!L.length) continue; for (let g = 0; g < 40; g++) { ecoDay(f, true); const F = S.F[f]; if (F.enP >= F.enU * 1.08) break; const c = S.C[L[g % L.length]]; c.b.push(BI.tec); c.h.push(100); } }
  S.C.forEach(c => { c.s0 = c.b.length; });
  // стартовые союзы ботов
  for (let f = 0; f < S.F.length; f++) if (S.F[f].alive && f !== player) for (const n of neighborsOf(f)) if (n > f && n !== player && baseRel(f, n) > 21 && alliesOf(f).length < 2 && alliesOf(n).length < 2) S.ally[key2(f, n)] = 0;
  for (let f = 0; f < S.F.length; f++) if (S.F[f].alive) { ecoDay(f, true); S.F[f].pow = powOf(f); }
}

// ---------- экономика ----------
function powOf(f) {
  const F = S.F[f]; let p = 0;
  for (const i of OWN[f]) { const g = S.C[i].g; p += (atkOf(g) + defOf(g)) / 2; }
  for (const m of S.moves) if (m.f === f) p += (atkOf(m.g) + defOf(m.g)) / 2;
  F.stock.forEach((n, k) => p += n * WPN[k].cost * .25); F.air.forEach((n, k) => p += n * AIR[k].cost * .5); F.ships.forEach((n, k) => p += n * SHIPS[k].cost * .25);
  return Math.round(p);
}
const navyOf = f => S.F[f].ships.reduce((a, n, k) => a + n * SHIPS[k].pw, 0);
function ecoDay(f, dry) {
  const F = S.F[f], L = OWN[f], se = seasonOf(S.day), sun = [.5, 1, 1.4, .9][se], crop = [.6, 1, 1.25, 1.15][se];
  let tax = 0, facInc = 0, portInc = 0, enP = 0, enU = 0, food = 0, metal = 0, fuel = 0, ur = 0, upk = 0, oilN = 0, npzN = 0, stores = 0, tecN = 0, popSum = 0, army = 0;
  const B = BI;
  for (const i of L) {
    const c = S.C[i]; tax += c.pop * .02; popSum += c.pop; army += c.g[0] / 1000;
    for (let j = 0; j < c.b.length; j++) {
      const k = c.b[j], d = BLD[k], w = c.h[j] > 35 ? 1 : .4;
      if (d.en > 0) { if (k === B.solar) enP += d.en * sun * w; else if (k === B.tec) { tecN++; if (F.fuel > 0) enP += d.en * w; } else enP += d.en * w; } else enU -= d.en;
      if (d.inc) { if (k === B.port) portInc += d.inc * w; else facInc += d.inc * w; }
      if (d.food) food += d.food * crop * w; if (k === B.mine) metal += 12 * w; if (d.fuel) fuel += d.fuel * w; if (d.ur) ur += d.ur * w;
      if (d.up) upk += d.up * .3;
      if (k === B.oil) oilN++; else if (k === B.npz) npzN++; else if (k === B.store) stores++; else if (k === B.aes) ur += .3;
    }
    for (let k = 0; k < 6; k++) upk += c.g[k] / UNITS[k].batch * UNITS[k].cost * .006;
  }
  for (const m of S.moves) if (m.f === f) for (let k = 0; k < 6; k++) upk += m.g[k] / UNITS[k].batch * UNITS[k].cost * .008;
  F.air.forEach((n, k) => upk += n * AIR[k].up * .3); F.ships.forEach((n, k) => upk += n * SHIPS[k].up * .3);
  fuel += Math.min(oilN, npzN) * 14;
  const eff = enU > 0 ? clamp(enP / enU, .2, 1) : 1;
  // блокада: у врага флот заметно сильнее
  let blk = 0; const nv = navyOf(f); for (const e of enemiesOf(f)) if (navyOf(e) > nv * 1.5 + 2) blk = 1;
  let sanc = 0, trade = 0; const myEc = statOf(W.N[f])[1];
  for (let o = 0; o < S.F.length; o++) { if (o === f || !S.F[o].alive) continue; if (S.sanc[o + '>' + f]) sanc += statOf(W.N[o])[1] * .012; if (S.trade[key2(f, o)]) trade += 3 + Math.min(myEc, statOf(W.N[o])[1]) * 2.2; }
  const ch = CHARS[F.ch], mul = (f === S.player ? DIFF[S.diff].me : ch.eco * (.85 + .15 * DIFF[S.diff].ai)) * (1 - Math.min(.5, sanc));
  const gross = (tax + (facInc * eff + (blk ? 0 : portInc)) * K_INC) * mul + trade * (blk ? .5 : 1);
  const foodUse = popSum * .04 + army * .5, fuelUse = tecN * .5;
  Object.assign(F, { gross, upk, inc: gross - upk, enP, enU, eff, foodD: food - foodUse, metalD: metal * K_INC, fuelD: fuel * K_INC - fuelUse, urD: ur, blk, sancK: sanc, tradeI: trade, cap0: 2000 + stores * 1500, popSum });
  if (dry) return;
  F.money += F.inc; const capR = F.cap0;
  F.metal = Math.min(capR, F.metal + F.metalD); F.fuel = clamp(F.fuel + F.fuelD, 0, capR); F.ur = Math.min(capR, F.ur + F.urD);
  F.food += F.foodD; if (F.food > capR) { F.money += (F.food - capR) * .25; F.food = capR; } if (F.food < 0) F.food = 0;
  if (F.money < -300) { // банкротство: часть войск разбегается
    for (const i of L) { const g = S.C[i].g; for (let k = 0; k < 6; k++) g[k] = Math.floor(g[k] * .93 / UNITS[k].batch) * UNITS[k].batch; }
    F.money = -300; if (f === S.player && Math.floor(S.day) % 5 === 0) logMsg('Казна пуста — войска дезертируют!', 'war', -1, [f]);
  }
}
function popCap(c) { return c.base + cnt(c, 'house') * 60 + cnt(c, 'tower') * 260; }
function cityDay(i) {
  const c = S.C[i], F = S.F[c.o], capP = popCap(c); c.aa = {}; c.ln = {};
  if (c.rad > S.day) c.pop = Math.max(10, c.pop * .995);
  else if (F.food <= 0) c.pop = Math.max(20, c.pop * .992);
  else if (c.pop < capP) c.pop = Math.min(capP, c.pop + (capP - c.pop) * .012 + .15 + cnt(c, 'hosp') * .3 + cnt(c, 'airport') * .2);
  else c.pop -= (c.pop - capP) * .01;
  for (let j = 0; j < c.h.length; j++) if (c.h[j] < 100) c.h[j] = Math.min(100, c.h[j] + 1.5);
  const q = c.q, slow = F.eff > .5 ? 1 : .6;
  if (q.b.length) { const it = q.b[0]; it.left -= slow; if (it.left <= 0) { q.b.shift(); c.b.push(it.k); c.h.push(100); if (c.o === S.player) EV.toast(BLD[it.k].n + ' — построено: ' + W.C0[i].n, 'good', i, 1); } }
  const nb = cnt(c, 'barracks');
  if (q.u.length && nb) { const it = q.u[0]; it.left -= 1 + .5 * (nb - 1); if (it.left <= 0) { q.u.shift(); c.g[it.k] += UNITS[it.k].batch; } }
  if (q.w.length) {
    const it = q.w[0], d = (it.t === 'w' ? WPN : it.t === 'a' ? AIR : SHIPS)[it.k], nf = cnt(c, it.t === 'w' ? d.fac : it.t === 'a' ? 'airbase' : 'navbase');
    if (nf) { it.p += nf * slow / d.days; while (it.p >= 1 && it.n > 0) { it.p--; it.n--; if (it.t === 'w') F.stock[it.k]++; else if (it.t === 'a') F.air[it.k]++; else F.ships[it.k]++; } if (it.n <= 0) q.w.shift(); }
  }
}
// ---------- заказы ----------
function canBuild(ci, k) {
  const c = S.C[ci], d = BLD[k], F = S.F[c.o], c0 = W.C0[ci], queued = c.q.b.length;
  if (c.b.length + queued >= slotsOf(c)) return 'нет места';
  if (d.minLv && lvOf(c.pop) < d.minLv) return 'нужен ' + d.minLv + ' ур. города';
  if (d.max && cnt(c, d.k) + c.q.b.filter(x => x.k === k).length >= d.max) return 'лимит';
  if (d.req === 'ore' && !(c0.dep & 1)) return 'нет руды'; if (d.req === 'oil' && !(c0.dep & 2)) return 'нет нефти'; if (d.req === 'ur' && !(c0.dep & 4)) return 'нет урана'; if (d.req === 'sea' && !(c0.dep & 8)) return 'нет моря';
  if (F.money < d.cost) return 'мало денег'; if (F.metal < d.metal) return 'мало металла';
  return '';
}
function orderBuild(ci, k) { const e = canBuild(ci, k); if (e) return e; const c = S.C[ci], d = BLD[k], F = S.F[c.o]; F.money -= d.cost; F.metal -= d.metal; c.q.b.push({ k, left: d.days }); return ''; }
function canUnit(ci, k) { const c = S.C[ci], u = UNITS[k], F = S.F[c.o]; if (!cnt(c, 'barracks')) return 'нужны казармы'; if (u.need && !cnt(c, u.need)) return 'нужна авиабаза'; if (c.q.u.length >= 8) return 'очередь полна'; if (F.money < u.cost) return 'мало денег'; if (F.metal < u.metal) return 'мало металла'; if (k === 0 && c.pop < 30) return 'нет людей'; return ''; }
function orderUnit(ci, k) { const e = canUnit(ci, k); if (e) return e; const c = S.C[ci], u = UNITS[k], F = S.F[c.o]; F.money -= u.cost; F.metal -= u.metal; if (k === 0) c.pop -= 1; c.q.u.push({ k, left: u.days }); return ''; }
function prodDef(t, k) { return (t === 'w' ? WPN : t === 'a' ? AIR : SHIPS)[k]; }
function canProd(ci, t, k, n) {
  const c = S.C[ci], d = prodDef(t, k), F = S.F[c.o], fac = t === 'w' ? d.fac : t === 'a' ? 'airbase' : 'navbase';
  if (!cnt(c, fac)) return 'нужен: ' + BLD[BI[fac]].n; if (c.q.w.length >= 8) return 'очередь полна';
  if (d.nuke && !OWN[c.o].some(i => cnt(S.C[i], 'aes'))) return 'нужна АЭС';
  if (F.money < d.cost * n) return 'мало денег'; if (F.metal < d.metal * n) return 'мало металла'; if (d.ur && F.ur < d.ur * n) return 'мало урана';
  return '';
}
function orderProd(ci, t, k, n) { const e = canProd(ci, t, k, n); if (e) return e; const c = S.C[ci], d = prodDef(t, k), F = S.F[c.o]; F.money -= d.cost * n; F.metal -= d.metal * n; if (d.ur) F.ur -= d.ur * n; const last = c.q.w[c.q.w.length - 1]; if (last && last.t === t && last.k === k) last.n += n; else c.q.w.push({ t, k, n, p: 0 }); return ''; }
function cancelOrder(ci, line, idx) {
  const c = S.C[ci], F = S.F[c.o], it = c.q[line][idx]; if (!it) return; c.q[line].splice(idx, 1);
  if (line === 'b') { F.money += BLD[it.k].cost * .8; F.metal += BLD[it.k].metal * .8; } else if (line === 'u') { F.money += UNITS[it.k].cost * .8; F.metal += UNITS[it.k].metal * .8; } else { const d = prodDef(it.t, it.k); F.money += d.cost * it.n * .8; F.metal += d.metal * it.n * .8; if (d.ur) F.ur += d.ur * it.n; }
}
function demolish(ci, j) { const c = S.C[ci]; if (j < 0 || j >= c.b.length) return; S.F[c.o].money += BLD[c.b[j]].cost * .25; c.b.splice(j, 1); c.h.splice(j, 1); if (c.s0 > c.b.length) c.s0 = c.b.length; }
const PRICE = { food: [1.2, .35], metal: [9, 3], fuel: [7, 2.5] };
function market(f, res, n) { // n>0 купить, n<0 продать
  const F = S.F[f], p = PRICE[res]; if (!p) return 'нет'; if (F.blk) return 'порты в блокаде';
  if (n > 0) { const cost = p[0] * n; if (F.money < cost) return 'мало денег'; F.money -= cost; F[res] = Math.min(F.cap0, F[res] + n); }
  else { n = Math.min(-n, Math.floor(F[res])); if (n <= 0) return 'нечего продавать'; F[res] -= n; F.money += p[1] * n; }
  return '';
}

// ---------- армии ----------
function pathFor(f, from, to) { const F = S.F[f]; return findPath(from, to, i => allied(f, S.C[i].o), F.ships[2] > 0, i => S.C[i].o === f && cnt(S.C[i], 'rail') > 0); }
function sendArmy(f, from, to, share, only) {
  const c = S.C[from], t = S.C[to]; if (c.o !== f || from === to) return 'нельзя';
  if (t.o !== f && !atWar(f, t.o)) return allied(f, t.o) ? 'это союзник' : 'нет войны с ' + ruName(t.o);
  const g = c.g.map((n, k) => only != null && only !== k ? 0 : Math.floor(n * share / UNITS[k].batch) * UNITS[k].batch);
  if (!gSum(g)) return 'нет войск';
  const path = pathFor(f, from, to); if (!path) return S.F[f].ships[2] > 0 ? 'нет пути' : 'нет пути (нужны десантные корабли?)';
  for (let k = 0; k < 6; k++) c.g[k] -= g[k];
  let sp = 1e9; for (let k = 0; k < 6; k++) if (g[k]) sp = Math.min(sp, UNITS[k].sp);
  S.moves.push({ f, path, i: 0, prog: 0, g, sp }); return '';
}
function moveStep(m, dt) {
  const F = S.F[m.f]; let left = m.sp * dt * (seasonOf(S.day) === 0 ? .8 : 1) * 2.2;
  let fuelNeed = 0; for (let k = 0; k < 6; k++) fuelNeed += m.g[k] / UNITS[k].batch * UNITS[k].fuel * .12 * dt;
  if (fuelNeed > 0) { if (F.fuel >= fuelNeed) F.fuel -= fuelNeed; else left *= .35; }
  while (left > 0 && !m.done) {
    const a = m.path[m.i], b = m.path[m.i + 1], e = edgeOf(a, b); if (!e) { m.done = 1; break; }
    const rail = !e.sea && S.C[a].o === m.f && S.C[b].o === m.f && cnt(S.C[a], 'rail') && cnt(S.C[b], 'rail');
    const len = e.km * (e.sea ? 1.6 : rail ? .5 : 1), rest = len - m.prog;
    if (left < rest) { m.prog += left; left = 0; break; }
    left -= rest; m.prog = 0; m.i++;
    if (e.sea && enemiesOf(m.f).some(x => S.F[x].ships[4] > 0) && rnd() < .5) { for (let k = 0; k < 6; k++) m.g[k] = Math.floor(m.g[k] * .88 / UNITS[k].batch) * UNITS[k].batch; if (m.f === S.player) logMsg('Подлодки врага топят десант!', 'war', b, [m.f]); }
    arrive(m, b, a);
  }
}
function arrive(m, ci, prev) {
  const c = S.C[ci], f = m.f, last = m.i >= m.path.length - 1;
  if (c.o === f) { if (last) { for (let k = 0; k < 6; k++) c.g[k] += m.g[k]; m.done = 1; } return; }
  if (atWar(f, c.o)) { battle(m, ci, prev); return; }
  if (allied(f, c.o) && !last) return;
  // идти дальше нельзя — назад
  const back = S.C[prev]; if (back.o === f) for (let k = 0; k < 6; k++) back.g[k] += m.g[k]; m.done = 1;
}
function battle(m, ci, prev) {
  const c = S.C[ci], f = m.f, d = c.o, c0 = W.C0[ci], FA = S.F[f], mnt = W.bio[c0.y * W.BW + c0.x] === 9;
  let A = atkOf(m.g) * (1 + Math.min(.3, FA.air[1] * .03)) * (seasonOf(S.day) === 0 ? .9 : 1);
  if (m.g[4] && c.g[1]) A += Math.min(m.g[4] * 30, c.g[1] * 40);
  const D = defOf(c.g) * (1 + .2 * cnt(c, 'bunker')) * (mnt ? 1.25 : 1) * (S.F[d].cap === ci ? 1.15 : 1) + c.pop * 1.5 + 40;
  const r = A / D, win = r * (.85 + rnd() * .3) > 1; m.done = 1;
  if (win) {
    const lossA = clamp(.5 / r, .04, .85); for (let k = 0; k < 6; k++) m.g[k] = Math.floor(m.g[k] * (1 - lossA) / UNITS[k].batch) * UNITS[k].batch;
    const esc = W.adj[ci].map(e => e.j).filter(j => S.C[j].o === d && !W.adj[ci].find(e => e.j === j).sea);
    if (esc.length) { const t = S.C[esc[Math.floor(rnd() * esc.length)]]; for (let k = 0; k < 6; k++) t.g[k] += Math.floor(c.g[k] * .3 / UNITS[k].batch) * UNITS[k].batch; }
    const g = m.g.slice(); captureCity(ci, f, g);
  } else {
    const lossA = clamp(.45 + .35 * (1 - r), .35, .95), lossD = Math.min(.8, .4 * r);
    for (let k = 0; k < 6; k++) { c.g[k] = Math.floor(c.g[k] * (1 - lossD) / UNITS[k].batch) * UNITS[k].batch; m.g[k] = Math.floor(m.g[k] * (1 - lossA) / UNITS[k].batch) * UNITS[k].batch; }
    const back = S.C[prev]; if (back.o === f) for (let k = 0; k < 6; k++) back.g[k] += m.g[k];
    EV.boom(ci, 1);
    logMsg(`${ruName(f)}: штурм города ${c0.n} отбит`, f === S.player ? 'war' : 'good', ci, [f, d]);
  }
}
function captureCity(ci, f, g) {
  const c = S.C[ci], old = c.o, c0 = W.C0[ci], FO = S.F[old], FN = S.F[f], wasCap = FO.cap === ci;
  for (let j = c.b.length - 1; j >= 0; j--) if (BLD[c.b[j]].cat !== 'civ' && rnd() < .5) { c.b.splice(j, 1); c.h.splice(j, 1); c.ruins++; }
  c.o = f; c.g = g; c.q = { b: [], u: [], w: [] }; c.pop = Math.max(20, c.pop * .92); c.s0 = Math.min(c.s0, c.b.length); c.seen = -1;
  FO.lost++; FN.took++; rebuildOwn();
  if (wasCap) { const loot = Math.max(0, FO.money * .3); FO.money -= loot; FN.money += loot; FO.cap = OWN[old].length ? OWN[old].reduce((a, b) => S.C[b].pop > S.C[a].pop ? b : a) : -1; }
  EV.owner(ci); EV.boom(ci, 2);
  logMsg(`${ruName(f)} берёт ${c0.n}${wasCap ? ' — столицу ' + ruName(old) : ''}!`, f === S.player ? 'good' : 'war', ci, [f, old]);
  if (!OWN[old].length) eliminate(old, f);
  checkOver();
}
function eliminate(f, by) {
  const F = S.F[f]; F.alive = false; F.cap = -1;
  for (const o in S.war) if (o.split('|').includes(String(f))) delete S.war[o];
  for (const T of [S.ally, S.trade, S.truce]) for (const o in T) if (o.split('|').includes(String(f))) delete T[o];
  for (const o in S.sanc) if (o.split('>').includes(String(f))) delete S.sanc[o];
  S.moves = S.moves.filter(m => m.f !== f); S.proj = S.proj.filter(p => p.f !== f); S.offers = S.offers.filter(o => o.from !== f);
  logMsg(`${ruName(f)} больше не существует. Победитель — ${ruName(by)}.`, 'war', -1);
}
function checkOver() {
  if (S.over) return; const p = S.player;
  if (!OWN[p].length) { S.over = -1; S.speed = 0; EV.over(-1); }
  else if (!S.won && OWN[p].length >= W.C0.length * WIN_SHARE) { S.won = 1; S.speed = 0; EV.over(1); }
}

// ---------- дипломатия ----------
function declareWar(a, b, quiet) {
  if (a === b || atWar(a, b) || !S.F[a].alive || !S.F[b].alive) return;
  const k = key2(a, b), broke = S.truce[k] > S.day || allied(a, b);
  S.war[k] = S.day; delete S.ally[k]; delete S.trade[k]; delete S.truce[k]; S.rel[k] = -100;
  logMsg(`ВОЙНА: ${ruName(a)} → ${ruName(b)}`, 'war', S.F[b].cap, a === S.player || b === S.player || statOf(W.N[a])[0] + statOf(W.N[b])[0] >= 11 ? null : [-1]);
  if (quiet) return;
  for (let x = 0; x < S.F.length; x++) {
    if (x === a || x === b || !S.F[x].alive) continue;
    if (relOf(x, b) > 20) addRel(x, a, broke ? -25 : -12);
    if (x === S.player) continue;
    if (allied(x, b) && !atWar(x, a) && !allied(x, a) && rnd() < .75) declareWar(x, a, true);
    else if (allied(x, a) && !atWar(x, b) && !allied(x, b) && rnd() < .35) declareWar(x, b, true);
  }
  if (a !== S.player && b !== S.player) { if (allied(S.player, b)) EV.toast(`Ваш союзник ${ruName(b)} атакован!`, 'war', S.F[b].cap); }
}
function makePeace(a, b) { const k = key2(a, b); if (S.war[k] == null) return; delete S.war[k]; S.truce[k] = S.day + 40; S.rel[k] = -35; logMsg(`МИР: ${ruName(a)} и ${ruName(b)}`, 'good', -1, a === S.player || b === S.player ? null : [-1]); S.moves.forEach(m => { if ((m.f === a || m.f === b)) { const t = S.C[m.path[m.path.length - 1]].o; if (t === (m.f === a ? b : a)) { m.path = m.path.slice(0, m.i + 1).reverse(); m.i = 0; m.prog = 0; if (m.path.length < 2) { const c = S.C[m.path[0]]; if (c.o === m.f) for (let q = 0; q < 6; q++) c.g[q] += m.g[q]; m.done = 1; } } } }); }
// ответ бота на предложение игрока
function aiAnswer(f, what) {
  const p = S.player, F = S.F[f], P = S.F[p], ch = CHARS[F.ch], r = relOf(f, p);
  if (what === 'peace') { const dur = S.day - S.war[key2(f, p)]; return dur > 8 && (F.pow < P.pow * 1.4 || dur > 45 || F.lost > F.took + 1); }
  if (what === 'ally') return r >= 45 && alliesOf(f).length < 3 && ch.k !== 'rogue' && ch.k !== 'iso' && !enemiesOf(p).some(e => allied(f, e));
  if (what === 'trade') return r >= (ch.k === 'trade' ? -20 : 0) && !atWar(f, p);
  return false;
}
function propose(f, what) {
  const p = S.player, k = key2(f, p);
  if (what === 'war') { declareWar(p, f); return ''; }
  if (what === 'gift') { if (S.F[p].money < 300) return 'мало денег'; S.F[p].money -= 300; S.F[f].money += 300; addRel(f, p, 9); return 'Подарок принят: отношения +9'; }
  if (what === 'sanc') { const s = p + '>' + f; if (S.sanc[s]) { delete S.sanc[s]; addRel(f, p, 5); return 'Санкции сняты'; } S.sanc[s] = 1; delete S.trade[k]; addRel(f, p, -25); return 'Санкции введены'; }
  if (what === 'untrade') { delete S.trade[k]; addRel(f, p, -8); return 'Договор расторгнут'; }
  if (what === 'unally') { delete S.ally[k]; addRel(f, p, -30); return 'Союз расторгнут'; }
  const ok = aiAnswer(f, what);
  if (!ok) { if (what !== 'peace') addRel(f, p, -2); return ruName(f) + ' отвечает отказом'; }
  if (what === 'peace') makePeace(f, p); else if (what === 'ally') { S.ally[k] = S.day; S.rel[k] = Math.max(relOf(f, p), 70); logMsg(`СОЮЗ: ${ruName(p)} и ${ruName(f)}`, 'good', -1); } else if (what === 'trade') { S.trade[k] = S.day; addRel(f, p, 8); }
  return ruName(f) + ' соглашается';
}
function answerOffer(idx, yes) {
  const o = S.offers[idx]; if (!o) return; S.offers.splice(idx, 1); const p = S.player, k = key2(o.from, p);
  if (!S.F[o.from].alive) return;
  if (!yes) { addRel(o.from, p, -4); return; }
  if (o.t === 'peace') makePeace(o.from, p); else if (o.t === 'ally') { if (!atWar(o.from, p)) { S.ally[k] = S.day; S.rel[k] = Math.max(relOf(o.from, p), 70); logMsg(`СОЮЗ: ${ruName(p)} и ${ruName(o.from)}`, 'good', -1); } } else if (o.t === 'trade') { if (!atWar(o.from, p)) { S.trade[k] = S.day; addRel(o.from, p, 8); } }
}
function offerToPlayer(f, t) { if (S.offers.some(o => o.from === f && o.t === t)) return; S.offers.push({ from: f, t, exp: S.day + 12 }); EV.toast(`${ruName(f)} предлагает: ${{ peace: 'МИР', ally: 'СОЮЗ', trade: 'ТОРГОВЛЮ' }[t]}`, 'offer', S.F[f].cap, 0, S.offers.length - 1); }

// ---------- удары ----------
const SITE_CAP = { dronep: 12, otrk: 4, silo: 1, airbase: 0 };
function rangeOf(f, w, ci) { let r = w.rng; if (w.cls === 'cruise' && S.F[f].air[2] > 0 && cnt(S.C[ci], 'airbase')) r += 1500; return r; }
// города-пусковые фракции f, достающие до цели
function sitesFor(f, wk, target) {
  const w = WPN[wk], t0 = W.C0[target], F = S.F[f], out = [];
  for (const i of OWN[f]) {
    const c = S.C[i]; let n = cnt(c, w.site), capN;
    if (w.site === 'airbase') { if (!n && !(F.ships[3] > 0 && (W.C0[i].dep & 8) && cnt(c, 'navbase'))) continue; capN = F.air[1] * 4 - (F.kabUsed || 0); }
    else { if (!n) continue; capN = n * SITE_CAP[w.site] - (c.ln[w.site] || 0); }
    if (capN <= 0) continue; const km = kmXY(W.C0[i], t0);
    const carrier = w.air && F.ships[3] > 0 && (t0.dep & 8);
    if (km > rangeOf(f, w, i) && !carrier) continue; out.push({ i, km, cap: capN });
  }
  return out.sort((a, b) => a.km - b.km);
}
function launch(f, wk, target, n, prio) {
  const w = WPN[wk], F = S.F[f], t = S.C[target]; n = Math.min(n, F.stock[wk]);
  if (n <= 0) return 0; if (t.o === f || allied(f, t.o)) return 0; if (w.dmg > 0 && !atWar(f, t.o)) return 0;
  const sites = sitesFor(f, wk, target); let done = 0;
  for (const s of sites) {
    if (done >= n) break; const k = Math.min(n - done, s.cap); if (k <= 0) continue;
    if (w.site === 'airbase') F.kabUsed = (F.kabUsed || 0) + k; else S.C[s.i].ln[w.site] = (S.C[s.i].ln[w.site] || 0) + k;
    const dur = Math.max(s.km / w.sp / 24, w.cls === 'drone' ? .22 : .12);
    S.proj.push({ f, w: wk, from: s.i, to: target, t0: S.day, t1: S.day + dur, n: k, prio: prio || '' }); done += k; EV.fly(wk, s.i, target);
  }
  F.stock[wk] -= done;
  if (done && w.nuke && t.o === S.player) { EV.toast(`ЯДЕРНАЯ ТРЕВОГА! Пуск по городу ${W.C0[target].n}`, 'nuke', target); }
  return done;
}
function aaPool(ci) { // [{c, kind, pk-мод}]
  const o = S.C[ci].o, F = S.F[o], list = [{ i: ci, km: 0 }]; for (const e of W.near[ci]) if (S.C[e.j].o === o) list.push({ i: e.j, km: e.km });
  let radar = false, reb = false, ftr = 0; const guns = [];
  for (const e of list) {
    const c = S.C[e.i]; if (e.km <= 300 && cnt(c, 'rls') && F.eff > .5) radar = true; if (e.km <= 100 && cnt(c, 'reb') && F.eff > .6) reb = true; if (e.km <= 500 && cnt(c, 'airbase')) ftr = 1;
    for (const k in AA) { const n = cnt(c, k); if (n && e.km <= AA[k].r) guns.push({ c, k, n }); }
  }
  return { guns, radar, reb, ftr: ftr ? F.air[0] : 0, F };
}
function resolveStrike(p) {
  const c = S.C[p.to], w = WPN[p.w], f = p.f, d = c.o, c0 = W.C0[p.to]; if (d === f || allied(f, d)) return;
  const pool = aaPool(p.to), cls = w.cls; let hits = 0, shot = 0;
  for (let n = 0; n < p.n; n++) {
    let down = false;
    if (cls === 'drone' && pool.reb && rnd() < .3) down = true;
    if (!down && pool.ftr > 0 && cls !== 'nuke' && cls !== 'hyper') { const used = pool.F.ftrUsed || 0; if (used < pool.ftr * 2) { pool.F.ftrUsed = used + 1; if (rnd() < (cls === 'ball' ? .08 : .3)) down = true; } }
    for (const g of pool.guns) {
      if (down) break; const a = AA[g.k]; let pk = a.pk[cls]; if (!pk) continue;
      if (a.radar) pk *= pool.radar ? 1.25 : .6; else if (pool.radar) pk *= 1.1; if (w.hard) pk *= w.hard;
      for (let s = 0; s < 2 && !down; s++) { const used = g.c.aa[g.k] || 0; if (used >= g.n * a.shots) break; g.c.aa[g.k] = used + 1; if (rnd() < pk) down = true; }
    }
    if (down) shot++; else hits++;
  }
  if (w.k === 'scout') { if (hits && f === S.player) { c.seen = S.day + 40; logMsg(`Разведка: ${c0.n} вскрыт на 40 дней`, 'good', p.to, [f]); } else if (f === S.player) logMsg(`Разведчик сбит над городом ${c0.n}`, '', p.to, [f]); return; }
  if (w.decoy) return;
  const destroyed = [];
  for (let n = 0; n < hits; n++) applyHit(p.to, w, p.prio, destroyed, f);
  if (hits) EV.boom(p.to, w.nuke ? 9 : w.dmg > 120 ? 3 : 2, w.nuke);
  if (w.nuke && hits) {
    S.F[f].nukes++; S.F[d].nukedBy = f;
    for (let x = 0; x < S.F.length; x++) if (x !== f && S.F[x].alive) { addRel(x, f, -45); if (x !== S.player && x !== d && !allied(x, f) && rnd() < .5) S.sanc[x + '>' + f] = 1; }
    logMsg(`ЯДЕРНЫЙ УДАР: ${ruName(f)} → ${c0.n}. Мир в ужасе.`, 'nuke', p.to);
  } else if (f === S.player || d === S.player) {
    const nm = w.n + (p.n > 1 ? ' ×' + p.n : '');
    logMsg(`${f === S.player ? 'Удар' : 'Налёт'}: ${c0.n} — ${nm}: сбито ${shot}, попало ${hits}${destroyed.length ? '. Уничтожено: ' + destroyed.join(', ') : ''}`, d === S.player ? 'war' : hits ? 'good' : '', p.to, [f, d]);
  }
  if (c.pop < 12 && !c.b.length) c.pop = 12;
}
function applyHit(ci, w, prio, out, f) {
  const c = S.C[ci];
  if (w.nuke) {
    const kb = w.nuke === 2 ? 1 : .65, kp = w.nuke === 2 ? .85 : .45, kg = w.nuke === 2 ? 1 : .7;
    for (let j = c.b.length - 1; j >= 0; j--) if (rnd() < kb) { out.push(BLD[c.b[j]].n); c.b.splice(j, 1); c.h.splice(j, 1); c.ruins++; }
    c.pop = Math.max(8, c.pop * (1 - kp)); for (let k = 0; k < 6; k++) c.g[k] = Math.floor(c.g[k] * (1 - kg) / UNITS[k].batch) * UNITS[k].batch;
    c.rad = S.day + 60; c.q = { b: [], u: [], w: [] }; c.s0 = Math.min(c.s0, c.b.length); return;
  }
  const hosp = cnt(c, 'hosp'); c.pop = Math.max(10, c.pop - w.dmg / 140 * (hosp ? .5 : 1));
  const killG = k => { for (let q = 0; q < 6; q++) { const u = UNITS[q]; c.g[q] = Math.max(0, c.g[q] - Math.floor(w.dmg * k / (u.def + 2) / u.batch + rnd()) * u.batch); } };
  if (prio === 'army') { killG(1.6); if (rnd() < .5) return; } else killG(.25);
  for (let rep = 0; rep < (w.area || 1); rep++) {
    if (!c.b.length) return; let cand = [];
    const bun = BI.bunker;
    if (!w.pierce && rnd() < .35) cand = c.b.map((k, j) => k === bun ? j : -1).filter(j => j >= 0);
    if (!cand.length && prio && prio !== 'army') cand = c.b.map((k, j) => BLD[k].cat === prio ? j : -1).filter(j => j >= 0);
    if (!cand.length) cand = c.b.map((_, j) => j);
    const j = cand[Math.floor(rnd() * cand.length)], k = c.b[j];
    c.h[j] -= w.dmg * (.8 + rnd() * .4) * (k === bun ? .5 : 1);
    if (c.h[j] <= 0) { out.push(BLD[k].n); c.b.splice(j, 1); c.h.splice(j, 1); c.ruins++; c.s0 = Math.min(c.s0, c.b.length); }
  }
}

// ---------- ход времени ----------
function advance(dt) {
  if (!S || S.over === -1) return; const d0 = Math.floor(S.day); S.day += dt;
  for (const m of S.moves) if (!m.done) moveStep(m, dt);
  if (S.moves.some(m => m.done)) S.moves = S.moves.filter(m => !m.done);
  if (S.proj.length) { const rest = []; for (const p of S.proj) { if (p.t1 <= S.day) resolveStrike(p); else rest.push(p); } S.proj = rest; }
  const d1 = Math.floor(S.day); for (let d = d0; d < d1; d++) simDay();
}
function simDay() {
  const day = Math.floor(S.day);
  for (let f = 0; f < S.F.length; f++) { const F = S.F[f]; if (!F.alive) continue; F.kabUsed = 0; F.ftrUsed = 0; ecoDay(f); }
  for (let i = 0; i < S.C.length; i++) cityDay(i);
  if (day % 2 === 0) for (let f = 0; f < S.F.length; f++) if (S.F[f].alive) S.F[f].pow = powOf(f);
  if (day % 6 === 0) for (const k in S.rel) { const [a, b] = k.split('|'); if (S.war[k] != null) continue; const t = baseRel(+a, +b) + (S.ally[k] != null ? 60 : 0) + (S.trade[k] != null ? 20 : 0); S.rel[k] += Math.sign(t - S.rel[k]) * Math.min(2, Math.abs(t - S.rel[k])); }
  for (let f = 0; f < S.F.length; f++) if (f !== S.player && S.F[f].alive && (day + f) % 3 === 0) aiThink(f, day);
  for (let i = S.offers.length - 1; i >= 0; i--) if (S.offers[i].exp < S.day) S.offers.splice(i, 1);
  checkOver(); if (EV.day) EV.day(day);
}

// ---------- боты ----------
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function wpick(list) { let s = 0; for (const e of list) s += e[1]; if (s <= 0) return null; let r = rnd() * s; for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; } return list[list.length - 1][0]; }
function aiThink(f, day) {
  const F = S.F[f], L = OWN[f]; if (!L.length) return;
  const ch = CHARS[F.ch], foes = enemiesOf(f), atW = foes.length > 0, hard = DIFF[S.diff].ai;
  const tot = {}; for (const i of L) for (const k of S.C[i].b) tot[BLD[k].k] = (tot[BLD[k].k] || 0) + 1; const T = k => tot[k] || 0;
  const front = [], inner = [];
  for (const i of L) { let en = 0; for (const e of W.adj[i]) if (atWar(f, S.C[e.j].o) && (!e.sea || F.ships[2] > 0)) en++; (en ? front : inner).push(i); }
  // --- стройка ---
  if (F.money > 260) {
    const m = ch.mil * (atW ? 2 : 1), want = [];
    if (F.eff < .98) want.push([F.fuel > 60 ? 'tec' : 'solar', 9]);
    if (F.foodD < 2) want.push(['farm', 8]);
    if (F.metal < 150) want.push(['mine', 4]);
    want.push(['factory', 3 * ch.eco], ['house', 1.2], ['oil', 2.5 * ch.eco], ['npz', T('oil') > T('npz') ? 2 : 0], ['port', 1.5], ['rail', .6], ['store', .25], ['hosp', .3], ['airport', .8], ['tower', .8], ['umine', T('aes') ? 1 : .2],
      ['barracks', T('barracks') < 1 + L.length / 5 ? 3 * m : 0], ['zsu', m * .9], ['zrk', F.money > 900 ? m * .8 : 0], ['rls', T('zrk') > T('rls') * 2 ? m : 0], ['bunker', atW ? m : .15], ['dint', m * .3], ['reb', m * .25],
      ['dronef', F.money > 900 && T('dronef') < 1 + L.length / 8 ? m * 1.2 : 0], ['dronep', T('dronef') && T('dronep') < T('dronef') * 2 ? m * 1.5 : 0], ['rocketf', F.money > 2400 && !T('rocketf') ? m : 0], ['otrk', T('rocketf') && T('otrk') < 2 ? m * 1.5 : 0],
      ['pro', F.money > 3000 ? m * .4 : 0], ['airbase', F.money > 2500 && !T('airbase') ? m * .5 : 0], ['aes', F.money > 4500 && !T('aes') ? .6 : 0]);
    for (let rep = 0; rep < (F.money > 6000 ? 6 : F.money > 2000 ? 4 : 2); rep++) {
      const k = wpick(want); if (!k) break; const d = BLD[BI[k]]; if (F.money < d.cost + 150) continue;
      const pool = (d.cat !== 'civ' && front.length && rnd() < .6 ? front : L);
      for (let t = 0; t < 5; t++) { const ci = pool[Math.floor(rnd() * pool.length)]; if (S.C[ci].q.b.length) continue; if (!orderBuild(ci, d.i)) break; }
    }
  }
  // --- набор ---
  const milCap = F.gross * (.32 * ch.mil + (atW ? .3 : 0) + (F.money > 5000 ? .2 : 0)) * hard;
  if (F.upk < milCap && F.money > (atW ? 150 : 400)) {
    const cs = L.filter(i => cnt(S.C[i], 'barracks') && S.C[i].q.u.length < 2);
    for (let rep = 0; rep < (atW ? 3 : 1) + (F.money > 5000 ? 3 : 0) && cs.length; rep++) {
      const ci = cs[Math.floor(rnd() * cs.length)], k = wpick([[0, 3], [1, F.metal >= 60 ? 2.2 : 0], [2, F.metal >= 50 ? 1.5 : 0], [3, F.metal >= 60 && F.money > 900 ? 1 : 0], [4, 1.5], [5, .4]]);
      if (k != null) orderUnit(ci, k);
    }
  }
  // --- оружие ---
  if (F.money > 500) {
    const m = ch.mil * (atW ? 1.6 : 1) * hard, st = F.stock, find = b => L.find(i => cnt(S.C[i], b) && S.C[i].q.w.length < 2);
    let ci = find('dronef');
    if (ci != null) { if (st[WI.kami] < 40 * m) orderProd(ci, 'w', WI.kami, 10); else if (st[WI.heavy] < 10 * m && F.money > 1200) orderProd(ci, 'w', WI.heavy, 4); else if (st[WI.jet] < 6 * m && F.money > 2500) orderProd(ci, 'w', WI.jet, 3); }
    ci = find('rocketf');
    if (ci != null && F.money > 1200) { if (st[WI.cr1] < 6 * m) orderProd(ci, 'w', WI.cr1, 2); else if (st[WI.otr] < 4 * m && F.money > 2200) orderProd(ci, 'w', WI.otr, 1); else if (st[WI.hyp] < 2 && F.money > 6000) orderProd(ci, 'w', WI.hyp, 1); else if ((ch.k === 'rogue' || ch.k === 'mil') && F.money > 9000 && st[WI.nukeT] < 2) orderProd(ci, 'w', WI.nukeT, 1); }
    ci = find('airbase'); if (ci != null && F.money > 2000) { if (F.air[0] < 4 * m) orderProd(ci, 'a', 0, 1); else if (F.air[1] < 3 * m) orderProd(ci, 'a', 1, 1); }
    ci = find('navbase'); if (ci != null && F.money > 3000 && rnd() < .3) orderProd(ci, 's', F.ships[2] < 2 ? 2 : F.ships[0] < 4 ? 0 : 1, 1);
  }
  // --- война: манёвры ---
  if (atW) {
    const keep = i => S.F[f].cap === i ? .35 : .15; let sent = 0;
    for (const i of front) {
      const c = S.C[i], A = atkOf(c.g); if (A < 200) continue; let best = -1, bd = 1e18;
      for (const e of W.adj[i]) { const t = S.C[e.j]; if (!atWar(f, t.o) || (e.sea && F.ships[2] < 1)) continue; const D = defOf(t.g) * (1 + .2 * cnt(t, 'bunker')) * 1.15 + t.pop * 1.5 + 40; if (D < bd) { bd = D; best = e.j; } }
      if (best >= 0 && A * (1 - keep(i)) > bd * (1.45 - .15 * hard)) { if (!sendArmy(f, i, best, 1 - keep(i))) sent++; }
    }
    if (front.length) for (const i of inner) {
      if (sent >= 5) break; const c = S.C[i]; if (atkOf(c.g) < 150) continue;
      let best = -1, bd = 1e18; for (const j of front) { const d = (W.C0[i].x - W.C0[j].x) ** 2 + (W.C0[i].y - W.C0[j].y) ** 2; if (d < bd) { bd = d; best = j; } }
      if (best >= 0 && !sendArmy(f, i, best, F.cap === i ? .5 : .8)) sent++;
    }
    // --- удары ---
    const st = F.stock, tg = [];
    for (const i of front) for (const e of W.adj[i]) if (atWar(f, S.C[e.j].o)) tg.push(e.j);
    for (const e of foes) { if (S.F[e].cap >= 0) tg.push(S.F[e].cap); const Lf = OWN[e]; if (Lf.length) tg.push(Lf[Math.floor(rnd() * Lf.length)]); }
    if (tg.length) {
      const t1 = tg[Math.floor(rnd() * tg.length)], t2 = tg[Math.floor(rnd() * tg.length)];
      if (st[WI.kami] >= 8) launch(f, WI.kami, t1, Math.min(st[WI.kami], 8 + Math.floor(rnd() * 14)), rnd() < .5 ? 'aa' : 'mil');
      if (st[WI.heavy] >= 3) launch(f, WI.heavy, t1, Math.min(st[WI.heavy], 6), 'aa');
      if (st[WI.jet] >= 2) launch(f, WI.jet, t2, Math.min(st[WI.jet], 4), 'mil');
      if (st[WI.kab5] >= 2) launch(f, WI.kab5, t1, Math.min(st[WI.kab5], 6), 'army');
      if (st[WI.cr1] >= 2 && rnd() < .6) launch(f, WI.cr1, t2, Math.min(st[WI.cr1], 4), rnd() < .5 ? 'mil' : 'civ');
      if (st[WI.cr2] >= 1 && rnd() < .5) launch(f, WI.cr2, t2, Math.min(st[WI.cr2], 2), 'aa');
      if (st[WI.otr] >= 1 && rnd() < .5) launch(f, WI.otr, t1, Math.min(st[WI.otr], 2), 'army');
      if (st[WI.irbm] >= 1 && rnd() < .4) launch(f, WI.irbm, t2, 1, 'mil');
      if (st[WI.hyp] >= 1 && rnd() < .3) launch(f, WI.hyp, t2, 1, 'aa');
      // ядерный порог
      const nk = st[WI.nukeS] > 0 ? WI.nukeS : st[WI.nukeT] > 0 ? WI.nukeT : -1;
      if (nk >= 0 && day > DIFF[S.diff].grace) {
        const desperate = L.length < F.c0 * .6 || foes.includes(F.nukedBy);
        if ((desperate && rnd() < .35) || (ch.k === 'rogue' && rnd() < .02)) { const e = foes.includes(F.nukedBy) ? F.nukedBy : foes[Math.floor(rnd() * foes.length)], Lf = OWN[e].slice().sort((a, b) => S.C[b].pop - S.C[a].pop); for (const t of Lf.slice(0, 4)) if (launch(f, nk, t, 1, '')) break; }
      }
    }
  }
  // --- дипломатия ---
  if ((day + f * 5) % 9 !== 0) return;
  const p = S.player, grace = day < DIFF[S.diff].grace, nb = neighborsOf(f);
  for (const e of foes) {
    const dur = S.day - S.war[key2(f, e)], losing = F.pow < S.F[e].pow * .5 && dur > 10, stale = dur > 35 && !front.length;
    if (!(losing || stale || (dur > 50 && rnd() < .3))) continue;
    if (e === p) offerToPlayer(f, 'peace'); else { const E = S.F[e]; if (stale || dur > 25 || E.pow < F.pow) makePeace(f, e); }
  }
  if (foes.length < 2) for (const n of nb) {
    if (!S.F[n].alive || atWar(f, n) || allied(f, n) || S.truce[key2(f, n)] > S.day) continue; if (n === p && grace) continue;
    const N = S.F[n], w = ch.w, ratio = Math.tanh(Math.log((F.pow + 50) / (N.pow + 50))), res = (statOf(W.N[n])[2] >= 5 && statOf(W.N[f])[2] < 4 ? .6 : 0) + (statOf(W.N[n])[4] >= 5 ? .4 : 0);
    const z = w[0] + w[1] * ratio + w[2] * relOf(f, n) / 100 + w[3] * Math.min(1, OWN[n].length / 8) + w[4] * foes.length + w[5] * alliesOf(n).length / 2 + w[6] * res + (S.trade[key2(f, n)] != null ? -1 : 0);
    if (rnd() < sigmoid(z) * .22 * (n === p ? hard : 1)) { declareWar(f, n); break; }
  }
  for (const n of nb) {
    if (!S.F[n].alive || atWar(f, n)) continue; const r = relOf(f, n), k = key2(f, n);
    if (!allied(f, n) && r > 42 && (ch.k === 'dip' || ch.k === 'trade' || rnd() < .15) && alliesOf(f).length < 3 && rnd() < .12) { if (n === p) offerToPlayer(f, 'ally'); else if (alliesOf(n).length < 3 && !enemiesOf(n).some(e => allied(f, e))) S.ally[k] = S.day; }
    else if (S.trade[k] == null && r > 5 && rnd() < (ch.k === 'trade' ? .3 : .1)) { if (n === p) offerToPlayer(f, 'trade'); else S.trade[k] = S.day; }
  }
  if (ch.k === 'dip') for (let x = 0; x < S.F.length; x++) if (x !== f && S.F[x].alive && S.F[x].nukes > 0 && !allied(f, x)) S.sanc[f + '>' + x] = 1;
}
