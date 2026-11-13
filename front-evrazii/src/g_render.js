// ===== Отрисовка: спрайты, флаги, карта, города, армии, ракеты, эффекты =====
const SETTINGS = { px: 2, autosave: 20, sound: true, music: false, names: true };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('ef2-settings') || '{}')); } catch (e) { }
function saveSettings() { try { localStorage.setItem('ef2-settings', JSON.stringify(SETTINGS)); } catch (e) { } }

const _spr = {}, _ico = {}, _flag = {};
function spriteCanvas(name) {
  if (_spr[name]) return _spr[name];
  const c = document.createElement('canvas'); c.width = 16; c.height = 24; const x = c.getContext('2d');
  for (const t of (SPR[name] || SPR.ruin).split(' ')) { const [a, b, w, h] = t.slice(1).split(',').map(Number); x.fillStyle = PAL[t[0]] || '#f0f'; x.fillRect(a, b + 8, w, h); }
  return _spr[name] = c;
}
function icoUrl(name) { if (_ico[name]) return _ico[name]; const c = document.createElement('canvas'); c.width = 16; c.height = 16; c.getContext('2d').drawImage(spriteCanvas(name), 0, -8); return _ico[name] = c.toDataURL(); }
const ico = (name, l) => `<img class="ico${l ? ' l' : ''}" src="${icoUrl(name)}" alt="">`;
function flagCanvas(f) {
  if (_flag[f]) return _flag[f];
  const c = document.createElement('canvas'); c.width = 12; c.height = 8; const x = c.getContext('2d'), col = COL[f];
  const spec = FLAGS[W.N[f]] || ('h:' + col.slice(1) + ',' + shade(col, -.45).slice(1) + ',' + col.slice(1));
  for (const part of spec.split('+')) {
    const [t, v] = part.split(':'), cs = v.split(',').map(s => '#' + s);
    if (t === 'h') cs.forEach((q, i) => { x.fillStyle = q; x.fillRect(0, Math.round(i * 8 / cs.length), 12, Math.ceil(8 / cs.length)); });
    else if (t === 'v') cs.forEach((q, i) => { x.fillStyle = q; x.fillRect(Math.round(i * 12 / cs.length), 0, Math.ceil(12 / cs.length), 8); });
    else { x.fillStyle = cs[0]; if (t === 'o') { x.fillRect(4, 2, 4, 4); x.fillRect(5, 1, 2, 6); x.fillRect(3, 3, 6, 2); } else if (t === 'n') { x.fillRect(3, 0, 2, 8); x.fillRect(0, 3, 12, 2); } else if (t === 'p') { x.fillRect(5, 1, 2, 6); x.fillRect(3, 3, 6, 2); } else if (t === 't') { for (let i = 0; i < 4; i++) x.fillRect(0, i, i + 1, 8 - 2 * i); } else if (t === 'k') x.fillRect(0, 0, 5, 4); }
  }
  return _flag[f] = c;
}
const _flagUrl = {};
const flagImg = f => `<img class="flag" src="${_flagUrl[f] || (_flagUrl[f] = flagCanvas(f).toDataURL())}" alt="">`;

// ---------- карта ----------
let COL = [], CRGB = [], mapCv = null, mapCtx = null, mapImg = null, terr = null;
const BIOCOL = ['#dfe8ee', '#9aa58c', '#3f6b4a', '#4f8a45', '#8fae4f', '#b9a55a', '#a9a64a', '#2f7a3a', '#d9c07a', '#8a8378'].map(hex2rgb);
const SEACOL = ['#12305f', '#2a5c9c', '#1f4c88', '#183e76'].map(hex2rgb);
function initMap() {
  const BW = W.BW, BH = W.BH, n = BW * BH;
  COL = W.N.map((nm, i) => facColor(nm, i)); CRGB = COL.map(hex2rgb);
  terr = new Uint8ClampedArray(n * 3);
  for (let y = 0, p = 0; y < BH; y++) for (let x = 0; x < BW; x++, p++) {
    const v = W.nz[p] / 255; let c, k;
    if (W.cid[p] === 255) { c = SEACOL[W.coast[p]]; k = W.coast[p] ? 0 : ((x + y * 3) % 7 === 0 && v > .55 ? .08 : v < .3 ? -.08 : 0); }
    else { const b = W.bio[p]; c = BIOCOL[b]; k = v < .4 ? -.13 : v > .62 ? .1 : 0; if (b === 9) { k = v < .42 ? -.28 : v > .7 ? .5 : v > .58 ? .12 : -.05; } else if (b === 8 && (x + y) % 5 === 0 && v > .5) k = .2; else if ((b === 2 || b === 3 || b === 7) && hash2(x, y) < .07) k = -.2; }
    for (let q = 0; q < 3; q++) terr[p * 3 + q] = k < 0 ? c[q] * (1 + k) : c[q] + (255 - c[q]) * k;
  }
  mapCv = document.createElement('canvas'); mapCv.width = BW; mapCv.height = BH; mapCtx = mapCv.getContext('2d'); mapImg = mapCtx.createImageData(BW, BH);
}
function paintMap(x0, y0, x1, y1) {
  const BW = W.BW, BH = W.BH, d = mapImg.data, rid = W.rid, C = S ? S.C : null;
  x0 = clamp(x0 | 0, 0, BW - 1); y0 = clamp(y0 | 0, 0, BH - 1); x1 = clamp(x1 | 0, 0, BW - 1); y1 = clamp(y1 | 0, 0, BH - 1);
  const ow = q => { const r = rid[q]; return r === 65535 ? -1 : C ? C[r].o : W.C0[r].f; };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const p = y * BW + x, o = ow(p), i = p * 4; let r = terr[p * 3], g = terr[p * 3 + 1], b = terr[p * 3 + 2];
    if (o >= 0) {
      const c = CRGB[o]; let a = .5, dark = 1;
      const L = x > 0 ? ow(p - 1) : o, R = x < BW - 1 ? ow(p + 1) : o, U = y > 0 ? ow(p - BW) : o, D = y < BH - 1 ? ow(p + BW) : o;
      if ((L >= 0 && L !== o) || (R >= 0 && R !== o) || (U >= 0 && U !== o) || (D >= 0 && D !== o)) { a = .8; dark = .45; }
      else if (L < 0 || R < 0 || U < 0 || D < 0) { a = .6; dark = .62; }
      else if ((x < BW - 1 && rid[p + 1] !== rid[p]) || (y < BH - 1 && rid[p + BW] !== rid[p])) { dark = ((x + y) & 1) ? .78 : 1; }
      r = (r + (c[0] - r) * a) * dark; g = (g + (c[1] - g) * a) * dark; b = (b + (c[2] - b) * a) * dark;
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  mapCtx.putImageData(mapImg, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
}
function paintCity(ci) { const b = W.C0[ci].box; paintMap(b[0] - 1, b[1] - 1, b[2] + 1, b[3] + 1); }
function paintAll() { paintMap(0, 0, W.BW - 1, W.BH - 1); }

// ---------- вид ----------
let cv, ctx, CW = 0, CH = 0;
const V = { x: 0, y: 0, z: 1, zmin: .3, shake: 0 };
function resize() {
  const r = $('#stage').getBoundingClientRect(), px = SETTINGS.px; CW = Math.max(160, Math.floor(r.width / px)); CH = Math.max(120, Math.floor(r.height / px));
  cv.width = CW; cv.height = CH; cv.style.width = CW * px + 'px'; cv.style.height = CH * px + 'px';
  V.zmin = Math.max(CW / W.BW, CH / W.BH) * .8; clampView();
}
function clampView() { V.z = clamp(V.z, V.zmin, 12); const vw = CW / V.z, vh = CH / V.z, m = 60 / V.z; V.x = vw > W.BW + 2 * m ? (W.BW - vw) / 2 : clamp(V.x, -m, W.BW - vw + m); V.y = vh > W.BH + 2 * m ? (W.BH - vh) / 2 : clamp(V.y, -m, W.BH - vh + m); }
function zoomAt(cx, cy, f) { const bx = V.x + cx / V.z, by = V.y + cy / V.z; V.z = clamp(V.z * f, V.zmin, 12); V.x = bx - cx / V.z; V.y = by - cy / V.z; clampView(); }
function focusCity(ci, z) { const c = W.C0[ci]; if (z) V.z = Math.max(V.z, z); const pw = innerWidth >= 900 && !$('#panel').hidden ? 200 / SETTINGS.px : 0; V.x = c.x - (CW - pw) / 2 / V.z; V.y = c.y - CH / 2 / V.z; clampView(); }
function fitFaction(f) { const L = OWN[f]; if (!L.length) return; let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0; for (const i of L) { const b = W.C0[i].box; x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); } V.z = clamp(Math.min(CW / (x1 - x0 + 80), CH / (y1 - y0 + 120)), V.zmin, 5); V.x = (x0 + x1) / 2 - CW / 2 / V.z; V.y = (y0 + y1) / 2 - CH / 2 / V.z; clampView(); }
const sxOf = bx => Math.round((bx - V.x) * V.z), syOf = by => Math.round((by - V.y) * V.z);

// ---------- эффекты ----------
const FX = { booms: [], parts: [], flash: 0 };
function fxBoom(ci, size, nuke) {
  const c = W.C0[ci]; FX.booms.push({ x: c.x + (Math.random() - .5) * 3, y: c.y + (Math.random() - .5) * 3, t: 0, size, nuke: !!nuke });
  const on = sxOf(c.x) > -40 && sxOf(c.x) < CW + 40 && syOf(c.y) > -40 && syOf(c.y) < CH + 40;
  if (nuke) { FX.flash = 1; V.shake = 14; SFX.play('nuke'); } else if (on) { V.shake = Math.max(V.shake, size * 1.5); SFX.play(size > 2 ? 'bigboom' : 'boom'); }
}
function updateFx(dt) {
  for (const b of FX.booms) b.t += dt / (b.nuke ? 3.2 : .7); FX.booms = FX.booms.filter(b => b.t < 1);
  for (const p of FX.parts) p.t += dt * 2.2; FX.parts = FX.parts.filter(p => p.t < 1); if (FX.parts.length > 500) FX.parts.splice(0, FX.parts.length - 500);
  FX.flash = Math.max(0, FX.flash - dt * .7); V.shake = Math.max(0, V.shake - dt * 22);
}
function txt(s, x, y, col, align, size) {
  ctx.font = (size || 8) + 'px "Press Start 2P",monospace'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillText(s, x - 1, y); ctx.fillText(s, x, y - 1); ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function spr(name, x, y, sc) { const c = spriteCanvas(name); sc = sc || 1; ctx.drawImage(c, Math.round(x - 8 * sc), Math.round(y - 16 * sc), 16 * sc, 24 * sc); }
// видит ли игрок, что внутри города
function visible(ci) { const c = S.C[ci], p = S.player; if (allied(p, c.o) || c.seen > S.day) return true; for (const e of W.adj[ci]) if (!e.sea && S.C[e.j].o === p) return true; return false; }
function moveXY(m) { const a = W.C0[m.path[m.i]], b = W.C0[m.path[Math.min(m.i + 1, m.path.length - 1)]], e = edgeOf(m.path[m.i], m.path[m.i + 1]); let t = 0; if (e) { const rail = !e.sea && S.C[m.path[m.i]].o === m.f && S.C[m.path[m.i + 1]].o === m.f && cnt(S.C[m.path[m.i]], 'rail') && cnt(S.C[m.path[m.i + 1]], 'rail'); t = clamp(m.prog / (e.km * (e.sea ? 1.6 : rail ? .5 : 1)), 0, 1); } return [lerp(a.x, b.x, t), lerp(a.y, b.y, t), e && e.sea]; }

function draw(now) {
  const z = V.z, shx = V.shake ? (Math.random() - .5) * V.shake : 0, shy = V.shake ? (Math.random() - .5) * V.shake : 0;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0c1a38'; ctx.fillRect(0, 0, CW, CH); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(shx), Math.round(shy));
  { const x0 = Math.max(0, Math.floor(V.x)), y0 = Math.max(0, Math.floor(V.y)), x1 = Math.min(W.BW, Math.ceil(V.x + CW / z)), y1 = Math.min(W.BH, Math.ceil(V.y + CH / z)); if (x1 > x0 && y1 > y0) ctx.drawImage(mapCv, x0, y0, x1 - x0, y1 - y0, (x0 - V.x) * z, (y0 - V.y) * z, (x1 - x0) * z, (y1 - y0) * z); }
  if (!S) return;
  const C0 = W.C0, P = S.player, mode = UI.mode, sel = UI.sel, blink = Math.floor(now / 300) % 2;
  const inView = (c, m) => { const x = (c.x - V.x) * z, y = (c.y - V.y) * z; return x > -m && y > -m && x < CW + m && y < CH + m; };
  // дороги
  if (z >= 1.8) {
    ctx.lineWidth = 1;
    for (let i = 0; i < C0.length; i++) { const a = C0[i]; if (!inView(a, 300)) continue; for (const e of W.adj[i]) { if (e.j < i && inView(C0[e.j], 300)) continue; const b = C0[e.j]; ctx.strokeStyle = e.sea ? '#9fd0ff30' : '#0000004d'; ctx.setLineDash(e.sea ? [2, 3] : []); ctx.beginPath(); ctx.moveTo(sxOf(a.x) + .5, syOf(a.y) + .5); ctx.lineTo(sxOf(b.x) + .5, syOf(b.y) + .5); ctx.stroke(); } }
    ctx.setLineDash([]);
  }
  // режим: цели
  if (mode && mode.t === 'move') {
    for (let i = 0; i < C0.length; i++) { const o = S.C[i].o; if (i === mode.from || !(o === P || atWar(P, o)) || !inView(C0[i], 20)) continue; ctx.strokeStyle = o === P ? '#41d98a' : '#ff4d4d'; ctx.lineWidth = 1; const r = 5 + blink; ctx.strokeRect(sxOf(C0[i].x) - r + .5, syOf(C0[i].y) - r + .5, r * 2, r * 2); }
    if (UI.hover >= 0 && UI.hover !== mode.from) { const o = S.C[UI.hover].o; if (o === P || atWar(P, o)) { const path = pathFor(P, mode.from, UI.hover); if (path) { ctx.strokeStyle = '#ffb000'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.lineDashOffset = -now / 60; ctx.beginPath(); path.forEach((i, k) => { const c = C0[i]; k ? ctx.lineTo(sxOf(c.x), syOf(c.y)) : ctx.moveTo(sxOf(c.x), syOf(c.y)); }); ctx.stroke(); ctx.setLineDash([]); } } }
  }
  // города
  const big = z >= 3.2, mid = z >= 1.3, bs = z >= 8 ? 2 : 1;
  for (let i = 0; i < C0.length; i++) {
    const c0 = C0[i]; if (!inView(c0, 90)) continue; const c = S.C[i], x = sxOf(c0.x), y = syOf(c0.y), cap = S.F[c.o].cap === i, mine = c.o === P;
    if (i === sel) { ctx.strokeStyle = blink ? '#ffb000' : '#fff'; ctx.lineWidth = 1; const r = big ? 22 * bs : mid ? 11 : 6; ctx.strokeRect(x - r + .5, y - r + .5, r * 2, r * 2); }
    if (!mid) {
      if (!cap && c.pop < 260 && z < .9) continue;
      ctx.fillStyle = '#000'; ctx.fillRect(x - 2, y - 2, cap ? 5 : 4, cap ? 5 : 4); ctx.fillStyle = cap ? '#ffb000' : '#fff'; ctx.fillRect(x - 1, y - 1, cap ? 3 : 2, cap ? 3 : 2);
      if (SETTINGS.names && cap && (c.pop > 500 || z > .9)) txt(c0.n, x, y + 5, mine ? '#ffe9a8' : '#fff', 'center', 8);
      continue;
    }
    const vis = mine || visible(i);
    if (!big) { spr(cap ? 'hall' : c.pop > 320 ? 'tower' : 'house', x, y + 2, 1); }
    else {
      const list = ['hall']; if (vis) for (const k of c.b) list.push(BLD[k].k); else list.push(c.pop > 320 ? 'tower' : 'house', 'house');
      for (let r = 0; r < Math.min(3, c.ruins); r++) list.push('ruin'); if (c.q.b.length && mine) list.push('crater');
      const cols = Math.ceil(Math.sqrt(list.length * 1.5)), rows = Math.ceil(list.length / cols), cw2 = 16 * bs, rh = 17 * bs;
      list.forEach((n, k) => { const cx = x + ((k % cols) - (cols - 1) / 2) * cw2, cy = y + (Math.floor(k / cols) - (rows - 1) / 2) * rh; spr(n, cx, cy, bs); if (vis && k > 0 && k <= c.b.length && c.h[k - 1] < 60 && blink) { ctx.fillStyle = '#e8912c'; ctx.fillRect(cx - 2 * bs, cy - 3 * bs, 3 * bs, 3 * bs); ctx.fillStyle = '#f2d13c'; ctx.fillRect(cx - bs, cy - 2 * bs, bs, 2 * bs); } });
      if (c.rad > S.day) { ctx.fillStyle = blink ? '#c04dff55' : '#c04dff22'; ctx.fillRect(x - 24, y - 16, 48, 34); }
    }
    const ly = y + (big ? (Math.ceil((1 + (vis ? c.b.length : 2) + Math.min(3, c.ruins)) / Math.ceil(Math.sqrt((1 + (vis ? c.b.length : 2) + Math.min(3, c.ruins)) * 1.5))) * 8.5 + 8) * bs : 11);
    if (SETTINGS.names && (big || cap || c.pop > 200 || z > 2.2)) { ctx.drawImage(flagCanvas(c.o), x - Math.round(ctx.measureText(c0.n).width / 2) - 15, ly); txt(c0.n, x + 1, ly, mine ? '#ffe9a8' : atWar(P, c.o) ? '#ffb4b4' : '#fff', 'center', 8); }
    if (vis && z >= 2) { const pw = Math.round(defOf(c.g)); if (pw > 0) txt(fmt(pw), x, ly + 10, mine ? '#41d98a' : atWar(P, c.o) ? '#ff6b6b' : '#b9c4e8', 'center', 8); }
  }
  // армии в пути
  for (const m of S.moves) {
    const [bx, by, sea] = moveXY(m), x = sxOf(bx), y = syOf(by); if (x < -20 || y < -20 || x > CW + 20 || y > CH + 20) continue;
    if (m.f !== P && !atWar(P, m.f) && z < 1.5) continue;
    if (m.f === P && z >= 1) { const t = C0[m.path[m.path.length - 1]]; ctx.strokeStyle = '#41d98a88'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(x, y); for (let k = m.i + 1; k < m.path.length; k++) ctx.lineTo(sxOf(C0[m.path[k]].x), syOf(C0[m.path[k]].y)); ctx.stroke(); ctx.setLineDash([]); }
    const sc = z >= 5 ? 2 : 1; spr(sea ? 'landing' : m.g[1] ? 'tank' : m.g[5] ? 'heli' : 'inf', x, y + (Math.floor(now / 200) % 2), sc); ctx.fillStyle = '#000'; ctx.fillRect(x - 7, y - 15 * sc - 1, 14, 10); ctx.drawImage(flagCanvas(m.f), x - 6, y - 15 * sc);
  }
  // ракеты и дроны
  for (const p of S.proj) {
    const a = C0[p.from], b = C0[p.to], w = WPN[p.w], t = clamp((S.day - p.t0) / (p.t1 - p.t0), 0, 1), dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
    const arc = w.cls === 'ball' || w.cls === 'nuke' || w.cls === 'hyper' ? Math.min(60, dist * .25) : 0;
    const bx = a.x + dx * t, by = a.y + dy * t - Math.sin(Math.PI * t) * arc, x = sxOf(bx), y = syOf(by); if (x < -30 || y < -30 || x > CW + 30 || y > CH + 30) continue;
    const ang = Math.atan2(dy - Math.cos(Math.PI * t) * Math.PI * arc, dx) + Math.PI / 2, sc = z >= 4 ? 1 : .75, k = Math.min(p.n, 5);
    if (S.speed && Math.random() < .6) FX.parts.push({ x: bx, y: by, t: 0, c: w.cls === 'drone' ? 0 : 1 });
    for (let q = 0; q < k; q++) { ctx.save(); ctx.translate(x + ((q * 37) % 11 - 5) * (k > 1 ? 1.4 : 0), y + ((q * 53) % 9 - 4) * (k > 1 ? 1.4 : 0)); ctx.rotate(ang); ctx.drawImage(spriteCanvas(WSPR[w.k]), -8 * sc, -12 * sc, 16 * sc, 24 * sc); ctx.restore(); }
    if (p.n > 1 && z >= 1.5) txt('×' + p.n, x + 8, y - 4, p.f === P ? '#41d98a' : '#ff6b6b');
  }
  for (const p of FX.parts) { const x = sxOf(p.x), y = syOf(p.y); ctx.fillStyle = p.c ? (p.t < .3 ? '#f2d13c' : p.t < .6 ? '#e8912c' : '#8a8f9888') : '#cfd6e088'; const s = p.t < .5 ? 2 : 1; ctx.fillRect(x, y, s, s); }
  for (const b of FX.booms) {
    const x = sxOf(b.x), y = syOf(b.y), R = (b.nuke ? 26 + b.t * 70 : 3 + b.size * 5 * b.t) * Math.max(.6, Math.min(z, 3) / 2), cols = b.t < .25 ? ['#fff', '#f2d13c'] : b.t < .55 ? ['#f2d13c', '#e8912c'] : ['#c8382c', '#4a4f58'];
    for (let ry = -R; ry <= R; ry += 2) { const hw = Math.sqrt(R * R - ry * ry); ctx.fillStyle = cols[Math.abs(ry) < R * .55 ? 0 : 1]; ctx.globalAlpha = b.t > .7 ? (1 - b.t) / .3 : 1; ctx.fillRect(Math.round(x - hw), Math.round(y + ry), Math.round(hw * 2), 2); }
    ctx.globalAlpha = 1;
    if (b.nuke && b.t > .15) { const h = Math.min(50, (b.t - .15) * 120); ctx.fillStyle = '#4a4f58'; ctx.fillRect(x - 4, y - h, 8, h); ctx.fillStyle = b.t < .6 ? '#e8912c' : '#8a8f98'; ctx.fillRect(x - 16, y - h - 10, 32, 12); ctx.fillRect(x - 10, y - h - 16, 20, 8); }
  }
  if (FX.flash > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,255,240,${Math.min(1, FX.flash * 1.4)})`; ctx.fillRect(0, 0, CW, CH); }
}
