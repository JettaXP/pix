// ===== Мир: проекция, растр стран, рельеф, города, граф дорог =====
const W = { BW: 2000, BH: 0, N: [], C0: [], adj: [], cities: [], capOf: [], nb: [], cen: [], area: [] };
const BIO = { ICE: 0, TUN: 1, TAI: 2, FOR: 3, GRA: 4, DRY: 5, SAV: 6, JUN: 7, DES: 8, MNT: 9 };
const BIOME_ELL = [ // lon, lat, rx, ry, биом
  [0, 23, 18, 8, 8], [25, 24, 13, 8, 8], [47, 23, 9, 8, 8], [57, 32, 5, 4, 8], [61, 40, 8, 4, 8], [83, 39, 8, 3, 8], [104, 42, 10, 4, 8], [71, 27, 3, 3, 8], [19, -24, 6, 6, 8], [14, -20, 2, 7, 8],
  [46, 7, 5, 6, 5], [44, 35, 9, 4, 5], [62, 33, 8, 5, 5], [67, 48, 14, 4, 5], [103, 47, 10, 3, 5], [36, 47.5, 8, 2, 4], [37, -2, 5, 7, 6], [79, 20, 6, 8, 6],
  [88, 33, 13, 5, 9], [78, 42, 6, 2, 9], [44, 42.6, 5, 1, 9], [10, 46.5, 5, 1.2, 9], [59, 60, 1.2, 8, 9], [50, 32.5, 5, 1.6, 9], [39, 10, 3, 4, 9], [-3, 33, 6, 1.3, 9], [90, 49.5, 5, 2, 9], [140, 64, 14, 4, 9], [13, 64, 2, 6, 9],
  [20, 0, 10, 5, 7], [-5, 6, 8, 2, 7], [102, 17, 6, 7, 7], [95, 22, 3, 5, 7], [110, 25, 8, 4, 3], [47, -19, 3, 6, 7]
];
const FARCUT = { 'France': 1500, 'Netherlands': 800, 'United Kingdom': 1500, 'Portugal': 1200, 'Norway': 1500, 'Denmark': 1500, 'Spain': 2600, 'South Africa': 2000 };
const SYN_CAP = { 'N. Cyprus': 'Лефкоша', 'Palestine': 'Рамалла', 'W. Sahara': 'Эль-Аюн', 'Somaliland': 'Харгейса', 'Kosovo': 'Приштина' };

function millerRaw(l, p) { return [l, 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * p))]; }
millerRaw.invert = (x, y) => [x, 2.5 * Math.atan(Math.exp(0.8 * y)) - 0.625 * Math.PI];

function buildWorld(TOPO, CITYDATA) {
  const rad = Math.PI / 180, BW = W.BW, LON0 = 83, HALF = 109;
  const s = BW / (2 * HALF * rad), yT = millerRaw(0, 77.5 * rad)[1], yB = millerRaw(0, -36.5 * rad)[1];
  const BH = W.BH = Math.round(s * (yT - yB));
  const proj = W.proj = d3.geoProjection(millerRaw).rotate([-LON0, 0]).scale(s).translate([BW / 2, s * yT]).clipExtent([[0, 0], [BW, BH]]);
  let feats = topojson.feature(TOPO, TOPO.objects.c).features;
  const nbr = topojson.neighbors(TOPO.objects.c.geometries);
  // отрезаем заморские куски
  feats.forEach(f => {
    const g = f.geometry; if (g.type !== 'MultiPolygon') return;
    const cut = FARCUT[f.properties.name]; if (!cut) return;
    const parts = g.coordinates.map(c => { const p = { type: 'Polygon', coordinates: c }; return { c, a: d3.geoArea(p), cen: d3.geoCentroid(p) }; });
    const main = parts.reduce((a, b) => b.a > a.a ? b : a);
    g.coordinates = parts.filter(p => d3.geoDistance(p.cen, main.cen) * 6371 < cut).map(p => p.c);
  });
  const NC = feats.length;
  W.N = feats.map(f => f.properties.name); W.nb = nbr;
  // --- растр стран ---
  const cid = W.cid = new Uint8Array(BW * BH).fill(255);
  const sc = document.createElement('canvas'); sc.width = BW; sc.height = BH;
  const sx = sc.getContext('2d', { willReadFrequently: true }), path = d3.geoPath(proj, sx);
  const order = feats.map((f, i) => [i, d3.geoArea(f)]).sort((a, b) => b[1] - a[1]);
  sx.fillStyle = '#000'; sx.strokeStyle = '#000'; sx.lineWidth = 1.1; sx.lineJoin = 'round';
  for (const [i] of order) {
    const b = d3.geoPath(proj).bounds(feats[i]);
    const x0 = clamp(Math.floor(b[0][0]) - 2, 0, BW - 1), y0 = clamp(Math.floor(b[0][1]) - 2, 0, BH - 1), x1 = clamp(Math.ceil(b[1][0]) + 2, 1, BW), y1 = clamp(Math.ceil(b[1][1]) + 2, 1, BH);
    if (!(x1 > x0 && y1 > y0)) continue;
    sx.clearRect(x0, y0, x1 - x0, y1 - y0); sx.beginPath(); path(feats[i]); sx.fill(); sx.stroke();
    const d = sx.getImageData(x0, y0, x1 - x0, y1 - y0).data, w = x1 - x0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (d[((y - y0) * w + (x - x0)) * 4 + 3] > 110) cid[y * BW + x] = i;
  }
  // площадь и центр масс
  const area = W.area = new Float64Array(NC), cx = new Float64Array(NC), cy = new Float64Array(NC);
  for (let y = 0, p = 0; y < BH; y++) for (let x = 0; x < BW; x++, p++) { const c = cid[p]; if (c !== 255) { area[c]++; cx[c] += x; cy[c] += y; } }
  W.cen = W.N.map((_, i) => area[i] ? [cx[i] / area[i], cy[i] / area[i]] : [0, 0]);
  // широта/долгота по строкам и столбцам (проекция разделима)
  const lonOf = W.lonOf = new Float32Array(BW), latOf = W.latOf = new Float32Array(BH);
  for (let x = 0; x < BW; x++) lonOf[x] = proj.invert([x + .5, BH / 2])[0];
  for (let y = 0; y < BH; y++) latOf[y] = proj.invert([BW / 2, y + .5])[1];
  for (let x = 1; x < BW; x++) if (lonOf[x] < lonOf[x - 1]) lonOf[x] += 360;
  // --- города ---
  const landNear = (x, y, r) => { let best = -1, bd = 1e9, bx = x, by = y; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= BW || Y >= BH) continue; const c = cid[Y * BW + X]; if (c !== 255) { const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = c; bx = X; by = Y; } } } return best < 0 ? null : [best, bx, by]; };
  const quota = W.N.map((_, i) => clamp(1 + Math.round(Math.sqrt(area[i]) / 18), 1, 20)), cnt = new Int32Array(NC);
  const C0 = W.C0 = [];
  const cand = CITYDATA.map(c => { const p = proj([c[1], c[2]]); if (!p) return null; const ln = landNear(Math.round(p[0]), Math.round(p[1]), 6); return ln ? { n: c[0], f: ln[0], x: ln[1], y: ln[2], lon: c[1], lat: c[2], pop: Math.max(20, c[3]), cap: c[4] } : null; }).filter(Boolean);
  const far = (c, m) => { for (const o of C0) { const dx = o.x - c.x, dy = o.y - c.y; if (dx * dx + dy * dy < m * m) return false; } return true; };
  const hasCap = new Uint8Array(NC);
  for (const c of cand) if (c.cap && !hasCap[c.f] && far(c, 4)) { hasCap[c.f] = 1; cnt[c.f]++; C0.push(c); }
  for (const c of cand) if (!C0.includes(c) && cnt[c.f] < quota[c.f] && far(c, 10)) { c.cap = hasCap[c.f] ? 0 : 1; hasCap[c.f] = 1; cnt[c.f]++; C0.push(c); }
  for (let i = 0; i < NC; i++) if (!cnt[i] && area[i] > 0) { // синтетическая столица
    let bx = 0, by = 0, bd = 1e9; const [mx, my] = W.cen[i];
    for (let y = 0, p = 0; y < BH; y++) for (let x = 0; x < BW; x++, p++) if (cid[p] === i) { const d = (x - mx) ** 2 + (y - my) ** 2; if (d < bd) { bd = d; bx = x; by = y; } }
    C0.push({ n: SYN_CAP[W.N[i]] || RU[W.N[i]] || W.N[i], f: i, x: bx, y: by, lon: lonOf[bx], lat: latOf[by], pop: 150, cap: 1 }); cnt[i]++;
  }
  // раздвигаем слишком близкие города
  for (let it = 0; it < 6; it++) for (let a = 0; a < C0.length; a++) for (let b = a + 1; b < C0.length; b++) {
    const A = C0[a], B = C0[b]; let dx = B.x - A.x, dy = B.y - A.y; const d = Math.hypot(dx, dy); if (d >= 6) continue;
    if (d < .01) { dx = 1; dy = 0; } const k = 1 / Math.max(d, 1);
    for (const [c, sg] of [[A, -1], [B, 1]]) { const nx = Math.round(c.x + sg * dx * k), ny = Math.round(c.y + sg * dy * k); if (nx >= 0 && ny >= 0 && nx < BW && ny < BH && cid[ny * BW + nx] === c.f) { c.x = nx; c.y = ny; } }
  }
  W.cities = W.N.map(() => []); W.capOf = new Int32Array(NC).fill(-1);
  C0.forEach((c, i) => { W.cities[c.f].push(i); if (c.cap && W.capOf[c.f] < 0) W.capOf[c.f] = i; });
  // --- регионы: ближайший город своей страны ---
  const rid = W.rid = new Uint16Array(BW * BH).fill(65535);
  C0.forEach(c => { c.box = [BW, BH, 0, 0]; c.area = 0; });
  for (let y = 0, p = 0; y < BH; y++) for (let x = 0; x < BW; x++, p++) {
    const c = cid[p]; if (c === 255) continue; const L = W.cities[c]; let best = -1, bd = 1e12;
    for (let k = 0; k < L.length; k++) { const q = C0[L[k]], d = (q.x - x) * (q.x - x) + (q.y - y) * (q.y - y); if (d < bd) { bd = d; best = L[k]; } }
    if (best < 0) continue; rid[p] = best; const q = C0[best], b = q.box; q.area++;
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
  // --- побережье, биомы, шум ---
  const coast = W.coast = new Uint8Array(BW * BH);
  for (let pass = 1; pass <= 3; pass++) for (let y = 1, p; y < BH - 1; y++) for (let x = 1; x < BW - 1; x++) {
    p = y * BW + x; if (cid[p] !== 255 || coast[p]) continue;
    const t = q => pass === 1 ? cid[q] !== 255 : coast[q] === pass - 1;
    if (t(p - 1) || t(p + 1) || t(p - BW) || t(p + BW)) coast[p] = pass;
  }
  const bio = W.bio = new Uint8Array(BW * BH), nz = W.nz = new Uint8Array(BW * BH);
  const vn = (x, y, s) => { const gx = Math.floor(x / s), gy = Math.floor(y / s), fx = x / s - gx, fy = y / s - gy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash2(gx, gy), hash2(gx + 1, gy), u), lerp(hash2(gx, gy + 1), hash2(gx + 1, gy + 1), u), v); };
  for (let y = 0, p = 0; y < BH; y++) {
    const lat = latOf[y];
    for (let x = 0; x < BW; x++, p++) {
      const n1 = vn(x, y, 14), n2 = vn(x + 999, y + 77, 5), fine = hash2(x, y);
      nz[p] = Math.round((n1 * .5 + n2 * .3 + fine * .2) * 255);
      if (cid[p] === 255) continue;
      const lon = lonOf[x], j = (n1 - .5) * 7 + (n2 - .5) * 3, la = lat + j;
      let b = la > 71 ? 1 : la > 57 ? 2 : la > 45 ? 3 : la > 23 ? 4 : la > 9 ? 6 : la > -8 ? 7 : la > -20 ? 6 : 4;
      if (lat > 75.5) b = 0;
      for (let k = 0; k < BIOME_ELL.length; k++) { const e = BIOME_ELL[k], dx = (lon - e[0]) / e[2], dy = (lat - e[1]) / e[3]; if (dx * dx + dy * dy + (n1 - .5) * .7 + (n2 - .5) * .3 < 1) { b = e[4]; if (b === 9) break; } }
      bio[p] = b;
    }
  }
  // --- залежи и выход к морю ---
  C0.forEach((c, i) => {
    const st = statOf(W.N[c.f]); let dep = 0, sea = 0, mnt = 0;
    for (let dy = -7; dy <= 7 && !sea; dy++) for (let dx = -7; dx <= 7; dx++) { const X = c.x + dx, Y = c.y + dy; if (X >= 0 && Y >= 0 && X < BW && Y < BH && cid[Y * BW + X] === 255) { sea = 1; break; } }
    if (bio[c.y * BW + c.x] === 9 || bio[clamp(c.y + 5, 0, BH - 1) * BW + c.x] === 9) mnt = 1;
    if (hash2(i, 11) < (mnt ? .7 : .3)) dep |= 1;
    if (hash2(i, 23) < st[2] / 12 + .04) dep |= 2;
    if (hash2(i, 37) < st[4] / 14 + .015) dep |= 4;
    if (sea) dep |= 8; c.dep = dep;
  });
  for (let f = 0; f < NC; f++) { const L = W.cities[f]; if (L.length && !L.some(i => C0[i].dep & 1)) C0[L[L.length - 1]].dep |= 1; if (statOf(W.N[f])[2] >= 5 && L.length) C0[L[0]].dep |= 2; if (statOf(W.N[f])[4] >= 5 && L.length) C0[L[L.length > 1 ? 1 : 0]].dep |= 4; }
  buildGraph();
}

function kmXY(a, b) { return d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]) * 6371; }
function buildGraph() {
  const C0 = W.C0, BW = W.BW, cid = W.cid, n = C0.length;
  const adj = W.adj = C0.map(() => []), has = (a, b) => adj[a].some(e => e.j === b);
  const add = (a, b, sea) => { if (a === b || has(a, b)) return; const km = Math.max(30, Math.round(kmXY(C0[a], C0[b]))); adj[a].push({ j: b, km, sea }); adj[b].push({ j: a, km, sea }); };
  const scan = (a, b) => { const A = C0[a], B = C0[b]; let sea = 0, other = 0; const S = 28; for (let k = 1; k < S; k++) { const x = Math.round(lerp(A.x, B.x, k / S)), y = Math.round(lerp(A.y, B.y, k / S)), c = cid[y * BW + x]; if (c === 255) sea++; else if (c !== A.f && c !== B.f) other++; } return [sea / S, other / S]; };
  const dl = d3.Delaunay.from(C0, c => c.x, c => c.y), { halfedges, triangles } = dl;
  for (let e = 0; e < triangles.length; e++) {
    if (halfedges[e] > e) continue; const a = triangles[e], b = triangles[e % 3 === 2 ? e - 2 : e + 1];
    const [sf, of] = scan(a, b), km = kmXY(C0[a], C0[b]);
    if (sf <= .22) { if (of <= .3 && km < 2600) add(a, b, 0); }
    else if ((C0[a].dep & 8) && (C0[b].dep & 8) && km < 2300 && of < .2) add(a, b, 1);
  }
  // связность: объединяем компоненты ближайшими парами
  const par = C0.map((_, i) => i), find = x => par[x] === x ? x : (par[x] = find(par[x]));
  const relink = () => { for (let i = 0; i < n; i++) par[i] = i; for (let i = 0; i < n; i++) for (const e of adj[i]) par[find(i)] = find(e.j); };
  for (let guard = 0; guard < 400; guard++) {
    relink(); const root = find(0); let best = null, bd = 1e12;
    for (let i = 0; i < n; i++) if (find(i) !== root) for (let j = 0; j < n; j++) if (find(j) === root) { const d = (C0[i].x - C0[j].x) ** 2 + (C0[i].y - C0[j].y) ** 2; if (d < bd) { bd = d; best = [i, j]; } }
    if (!best) break; add(best[0], best[1], scan(best[0], best[1])[0] > .22 ? 1 : 0);
  }
}
// Путь Дейкстры: pass(i) — можно ли идти через город, seaOk — есть ли десантные корабли
function findPath(from, to, pass, seaOk, railOf) {
  const n = W.C0.length, dist = new Float64Array(n).fill(1e18), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  dist[from] = 0; const open = [from];
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (dist[open[k]] < dist[open[bi]]) bi = k;
    const u = open.splice(bi, 1)[0]; if (done[u]) continue; done[u] = 1; if (u === to) break;
    if (u !== from && !pass(u)) continue;
    for (const e of W.adj[u]) { if (e.sea && !seaOk) continue; const v = e.j; if (done[v]) continue; if (v !== to && !pass(v)) continue; const w = e.km * (e.sea ? 1.6 : railOf && railOf(u) && railOf(v) ? .5 : 1); if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; open.push(v); } }
  }
  if (prev[to] < 0) return null; const p = []; for (let c = to; c !== -1; c = prev[c]) p.push(c); return p.reverse();
}
function edgeOf(a, b) { return W.adj[a].find(e => e.j === b); }
function cityNear(bx, by, r) { let best = -1, bd = r * r; for (let i = 0; i < W.C0.length; i++) { const c = W.C0[i], d = (c.x - bx) ** 2 + (c.y - by) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
function regionAt(bx, by) { bx = Math.floor(bx); by = Math.floor(by); if (bx < 0 || by < 0 || bx >= W.BW || by >= W.BH) return -1; const r = W.rid[by * W.BW + bx]; return r === 65535 ? -1 : r; }
