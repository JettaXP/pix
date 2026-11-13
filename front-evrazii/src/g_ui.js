// ===== Интерфейс: HUD, панель города, меню, сохранения, ввод =====
const UI = { sel: -1, tab: 'city', bcat: 'civ', fold: 'drone', prio: '', mode: null, hover: -1, modal: '', mtab: 'new', pick: -1, diff: 1, dipF: -1, share: 1, msg: '', held: false, lastP: '', lastH: '' };
const SPEEDS = [0, .2, .8, 3], SPD_LBL = ['❚❚', '▶', '▶▶', '▶▶▶'];
const PRIOS = [['', 'ЛЮБАЯ'], ['aa', 'ПВО'], ['mil', 'ВОЕННЫЕ'], ['civ', 'ЭКОНОМИКА'], ['army', 'ВОЙСКА']];
const CLS_FOLD = [['drone', 'ДРОНЫ', 'kami'], ['kab', 'АВИАБОМБЫ', 'kab'], ['cruise', 'КРЫЛАТЫЕ', 'cruise'], ['ball', 'БАЛЛИСТИКА', 'ball'], ['hyper', 'ГИПЕРЗВУК', 'hyper'], ['nuke', 'ЯДЕРНЫЕ', 'nuke'], ['air', 'АВИАЦИЯ', 'fighter'], ['sea', 'ФЛОТ', 'frigate']];
const foldOf = w => w.cls === 'jet' ? 'drone' : w.cls;
const num = n => fmt(n);
const sgn = n => (n >= 0 ? '+' : '') + (Math.abs(n) < 10 ? (Math.round(n * 10) / 10) : fmt(n));
function costHtml(F, cost, metal, ur, days) { return `<span class="cost ${F.money < cost ? 'no' : ''}">$${num(cost)}</span>${metal ? ` <span class="cost ${F.metal < metal ? 'no' : ''}">${ico('metal')}${metal}</span>` : ''}${ur ? ` <span class="cost ${F.ur < ur ? 'no' : ''}">${ico('uran')}${ur}</span>` : ''}${days ? ` <span class="cost">${days}д</span>` : ''}`; }
function note(t) { UI.msg = t; UI.msgT = performance.now(); if (t) toast(t, ''); }

// ---------- тосты ----------
function toast(text, kind, ci, quiet, offerIdx) {
  const box = $('#toasts'), el = document.createElement('div'); el.className = 'ts ' + (kind === 'offer' ? 'good' : kind || '');
  let h = esc(text);
  if (kind === 'offer' && S.offers[offerIdx]) { const o = S.offers[offerIdx]; h += `<div class="row"><button class="btn sm ok" data-a="offer:${o.from}:${o.t}:1">ПРИНЯТЬ</button><button class="btn sm bad" data-a="offer:${o.from}:${o.t}:0">ОТКАЗ</button></div>`; }
  el.innerHTML = h; if (ci != null && ci >= 0) { el.dataset.c = ci; el.style.cursor = 'pointer'; }
  box.appendChild(el); while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => el.remove(), kind === 'offer' ? 14000 : kind === 'nuke' || kind === 'war' ? 8000 : 5000);
  if (!quiet) SFX.play(kind === 'war' ? 'alert' : kind === 'nuke' ? 'siren' : kind === 'offer' ? 'ping' : kind === 'good' ? 'done' : 'ping');
}

// ---------- HUD ----------
function renderHud() {
  const hud = $('#hud'); let h;
  if (!S) h = `<div class="chip"><span class="who">ФРОНТ ЕВРАЗИИ</span></div><div id="speed"><button class="btn" data-a="menu">≡</button></div>`;
  else {
    const p = S.player, F = S.F[p], en = F.enP - F.enU;
    h = `<div class="chip" data-a="home" style="cursor:pointer">${flagImg(p)}<span class="who">${esc(ruName(p))}</span></div>
    <div class="chip dt">${dateStr(S.day)} ${clockStr(S.day)} · ${SEASONS[seasonOf(S.day)]}</div>
    <div class="res"><span title="Казна и доход в день">${ico('money')}${num(F.money)}<small> ${sgn(F.inc)}</small></span>
    <span title="Энергия: баланс" class="${en < 0 ? 'badc' : ''}">${ico('energy')}${sgn(en)}</span>
    <span title="Еда" class="${F.food <= 0 ? 'badc' : ''}">${ico('food')}${num(F.food)}<small> ${sgn(F.foodD)}</small></span>
    <span title="Металл">${ico('metal')}${num(F.metal)}<small> ${sgn(F.metalD)}</small></span>
    <span title="Топливо">${ico('fuel')}${num(F.fuel)}<small> ${sgn(F.fuelD)}</small></span>
    ${F.ur > 0 || F.urD > 0 ? `<span title="Уран">${ico('uran')}${num(F.ur)}</span>` : ''}
    <span title="Города">${ico('star')}${OWN[p].length}</span>${F.blk ? '<span class="badc">БЛОКАДА</span>' : ''}</div>
    <div id="speed">${SPD_LBL.map((l, i) => `<button class="btn ${S.speed === i ? 'sel' : ''}" data-a="speed:${i}">${l}</button>`).join('')}<button class="btn ${S.offers.length ? 'hi' : ''}" data-a="menu">≡</button></div>`;
  }
  if (h !== UI.lastH) { hud.innerHTML = h; UI.lastH = h; }
}

// ---------- панель города ----------
function queueHtml(ci, line, mine) {
  const c = S.C[ci], q = c.q[line]; if (!q.length) return '';
  return q.map((it, idx) => {
    let nm, pr;
    if (line === 'b') { const d = BLD[it.k]; nm = d.n; pr = 1 - it.left / d.days; } else if (line === 'u') { const d = UNITS[it.k]; nm = d.n; pr = 1 - it.left / d.days; } else { const d = prodDef(it.t, it.k); nm = d.n + ' ×' + it.n; pr = it.p; }
    return `<div class="item"><div class="meta"><b>${nm}</b><div class="bar"><i style="width:${idx ? 0 : clamp(pr * 100, 0, 100) | 0}%"></i></div></div>${mine ? `<button class="btn sm bad" data-a="cancel:${line}:${idx}">✕</button>` : ''}</div>`;
  }).join('');
}
function garrisonHtml(g) { const r = g.map((n, k) => n ? `<span class="chipu">${ico(UNITS[k].k)}${num(n)}</span>` : '').join(''); return r || '<span class="dim">нет войск</span>'; }
function bldListHtml(ci, mine) {
  const c = S.C[ci], groups = {}; c.b.forEach((k, j) => { const g = groups[k] || (groups[k] = { n: 0, hp: 100, j }); g.n++; if (c.h[j] < g.hp) { g.hp = c.h[j]; g.j = j; } });
  const rows = Object.keys(groups).map(k => { const g = groups[k], d = BLD[k]; return `<div class="item">${ico(d.k, 1)}<div class="meta"><b>${d.n}${g.n > 1 ? ' ×' + g.n : ''}</b>${g.hp < 100 ? `<div class="bar"><i style="width:${g.hp | 0}%;background:var(--bad)"></i></div>` : `<span class="dim">${d.en > 0 ? '+' + d.en + ' энергии' : d.en < 0 ? d.en + ' энергии' : ''}</span>`}</div>${mine ? `<button class="btn sm" data-a="demol:${g.j}" title="Снести одно (возврат 25%)">СНЕСТИ</button>` : ''}</div>`; });
  return rows.join('') || '<div class="dim">Пусто</div>';
}
function depHtml(c0) { const d = c0.dep, r = []; if (d & 1) r.push(ico('metal') + 'руда'); if (d & 2) r.push(ico('fuel') + 'нефть'); if (d & 4) r.push(ico('uran') + 'уран'); if (d & 8) r.push('море'); return r.join(' · ') || 'нет'; }
function dipCard(f) {
  const p = S.player, F = S.F[f], P = S.F[p], ch = CHARS[F.ch], r = relOf(f, p), k = key2(f, p), war = atWar(f, p), al = allied(f, p), tr = S.trade[k] != null, sn = S.sanc[p + '>' + f];
  if (!F.alive) return `<div class="card"><div class="t">${flagImg(f)} ${esc(ruName(f))}</div><div class="dim">Государство уничтожено.</div></div>`;
  const tags = [war ? '<span class="tag" style="color:var(--bad)">ВОЙНА</span>' : '', al ? '<span class="tag" style="color:var(--ok)">СОЮЗ</span>' : '', tr ? '<span class="tag">ТОРГОВЛЯ</span>' : '', sn ? '<span class="tag">ВАШИ САНКЦИИ</span>' : '', S.sanc[f + '>' + p] ? '<span class="tag" style="color:var(--bad)">САНКЦИИ ПРОТИВ ВАС</span>' : '', S.truce[k] > S.day ? '<span class="tag">ПЕРЕМИРИЕ</span>' : ''].join(' ');
  const en = enemiesOf(f).filter(x => x !== p).map(ruName).slice(0, 5).join(', '), als = alliesOf(f).filter(x => x !== p).map(ruName).slice(0, 5).join(', ');
  return `<div class="card"><div class="t">${flagImg(f)} ${esc(ruName(f))} <span class="tag">${ch.n}</span></div><div class="dim">${ch.d}</div>
  <div class="kv"><span>Отношения</span><span class="${r < -20 ? 'badc' : r > 30 ? 'good' : ''}">${r > 0 ? '+' : ''}${r}</span></div><div class="bar"><i style="width:${(r + 100) / 2}%;background:${r < -20 ? 'var(--bad)' : r > 30 ? 'var(--ok)' : 'var(--hi)'}"></i></div>
  <div class="kv"><span>Военная мощь</span><span>${num(F.pow)} <small class="dim">(у вас ${num(P.pow)})</small></span></div>
  <div class="kv"><span>Городов</span><span>${OWN[f].length}</span></div>${F.nukes ? `<div class="kv"><span>Ядерных ударов</span><span class="badc">${F.nukes}</span></div>` : ''}
  ${en ? `<div class="kv"><span>Воюет с</span><span>${esc(en)}</span></div>` : ''}${als ? `<div class="kv"><span>Союзники</span><span>${esc(als)}</span></div>` : ''}
  <div style="margin:6px 0">${tags}</div>
  <div class="row">${war ? `<button class="btn sm ok" data-a="dip:${f}:peace">ПРЕДЛОЖИТЬ МИР</button>` : `<button class="btn sm bad" data-a="dip:${f}:war">ОБЪЯВИТЬ ВОЙНУ</button>`}
  ${!war ? (al ? `<button class="btn sm" data-a="dip:${f}:unally">РАЗОРВАТЬ СОЮЗ</button>` : `<button class="btn sm" data-a="dip:${f}:ally">СОЮЗ</button>`) : ''}
  ${!war ? (tr ? `<button class="btn sm" data-a="dip:${f}:untrade">РАЗОРВАТЬ ТОРГОВЛЮ</button>` : `<button class="btn sm" data-a="dip:${f}:trade">ТОРГОВЛЯ</button>`) : ''}
  ${!war ? `<button class="btn sm" data-a="dip:${f}:gift">ПОДАРОК $300</button>` : ''}<button class="btn sm" data-a="dip:${f}:sanc">${sn ? 'СНЯТЬ САНКЦИИ' : 'САНКЦИИ'}</button></div></div>`;
}
function panelHtml() {
  const ci = UI.sel; if (!S || ci < 0) return '';
  const c = S.C[ci], c0 = W.C0[ci], p = S.player, F = S.F[p], mine = c.o === p, lv = lvOf(c.pop), cap = S.F[c.o].cap === ci;
  const tabs = mine ? [['city', 'ГОРОД'], ['build', 'СТРОЙКА'], ['army', 'ВОЙСКА'], ['prod', 'ЦЕХА']] : [['info', 'ИНФО'], ['strike', 'УДАР'], ['dip', 'СТРАНА']];
  if (!tabs.some(t => t[0] === UI.tab)) UI.tab = tabs[0][0];
  let b = '';
  if (UI.tab === 'city') {
    b = `<div class="kv"><span>Население</span><span>${num(c.pop)} / ${num(popCap(c))} тыс.</span></div><div class="kv"><span>Уровень города</span><span>${lv}${cap ? ' · СТОЛИЦА' : ''}</span></div>
    <div class="kv"><span>Слоты</span><span>${c.b.length + c.q.b.length} / ${slotsOf(c)}</span></div><div class="kv"><span>Залежи</span><span>${depHtml(c0)}</span></div>
    <div class="kv"><span>Гарнизон</span><span>${garrisonHtml(c.g)}</span></div>${c.rad > S.day ? '<div class="badc">Радиация: население вымирает</div>' : ''}
    ${c.q.b.length ? '<h3 style="margin-top:8px">СТРОИТСЯ</h3>' + queueHtml(ci, 'b', 1) : ''}<h3 style="margin-top:8px">ЗДАНИЯ</h3>${bldListHtml(ci, 1)}`;
  } else if (UI.tab === 'build') {
    b = `<div class="row" style="margin-bottom:6px">${[['civ', 'ЭКОНОМИКА'], ['mil', 'ВОЕННЫЕ'], ['aa', 'ПВО']].map(([k, n]) => `<button class="btn sm ${UI.bcat === k ? 'sel' : ''}" data-a="bcat:${k}">${n}</button>`).join('')}<span class="dim">слоты ${c.b.length + c.q.b.length}/${slotsOf(c)}</span></div>${queueHtml(ci, 'b', 1)}` +
      BLD.filter(d => d.cat === UI.bcat).map(d => { const e = canBuild(ci, d.i); return `<div class="item">${ico(d.k, 1)}<div class="meta"><b>${d.n} ${cnt(c, d.k) ? '<span class="dim">×' + cnt(c, d.k) + '</span>' : ''}</b>${costHtml(F, d.cost, d.metal, 0, d.days)} <span class="cost">${d.en ? ico('energy') + (d.en > 0 ? '+' : '') + d.en : ''}</span><div class="dim sm">${d.d}</div></div><button class="btn sm ${e ? 'off' : 'hi'}" data-a="build:${d.i}" title="${e}">${e ? esc(e.toUpperCase()) : 'СТРОИТЬ'}</button></div>`; }).join('');
  } else if (UI.tab === 'army') {
    const has = gSum(c.g) > 0, br = cnt(c, 'barracks');
    b = `<div class="card"><div class="t">ГАРНИЗОН · оборона ${num(defOf(c.g) * (1 + .2 * cnt(c, 'bunker')))} · атака ${num(atkOf(c.g))}</div>${garrisonHtml(c.g)}
    <div class="row" style="margin-top:6px"><button class="btn sm hi ${has ? '' : 'off'}" data-a="send">ОТПРАВИТЬ ВОЙСКА</button><span class="dim">или правый клик по цели</span></div></div>
    ${queueHtml(ci, 'u', 1)}${br ? '' : '<div class="note">Для набора нужны КАЗАРМЫ (вкладка СТРОЙКА → ВОЕННЫЕ).</div>'}` +
      UNITS.map((u, k) => { const e = canUnit(ci, k); return `<div class="item">${ico(u.k, 1)}<div class="meta"><b>${u.n} <span class="dim">×${u.batch}</span></b>${costHtml(F, u.cost, u.metal, 0, u.days)} <span class="cost">⚔${u.atk} ⛨${u.def}</span><div class="dim sm">${u.d}</div></div><button class="btn sm ${e ? 'off' : 'hi'}" data-a="unit:${k}">${e ? esc(e.toUpperCase()) : 'НАБРАТЬ'}</button></div>`; }).join('');
  } else if (UI.tab === 'prod') {
    b = `<div class="row" style="margin-bottom:6px">${CLS_FOLD.map(([k, n, s]) => `<button class="btn sm ${UI.fold === k ? 'sel' : ''}" data-a="fold:${k}">${ico(s)}${n}</button>`).join('')}</div>${queueHtml(ci, 'w', 1)}`;
    const row = (t, d, k, stock, steps) => { const e = canProd(ci, t, k, 1); return `<div class="item">${ico(t === 'w' ? WSPR[d.k] : d.k, 1)}<div class="meta"><b>${d.n} <span class="good">на складе: ${stock}</span></b>${costHtml(F, d.cost, d.metal, d.ur, d.days)}${d.rng ? ` <span class="cost">${d.rng}км · урон ${d.dmg >= 999 ? '☢' : d.dmg}</span>` : ''}<div class="dim sm">${d.d}</div></div>${e ? `<button class="btn sm off">${esc(e.toUpperCase())}</button>` : steps.map(n => `<button class="btn sm hi ${canProd(ci, t, k, n) ? 'off' : ''}" data-a="prod:${t}:${k}:${n}">+${n}</button>`).join('')}</div>`; };
    if (UI.fold === 'air') b += AIR.map((d, k) => row('a', d, k, F.air[k], [1])).join(''); else if (UI.fold === 'sea') b += SHIPS.map((d, k) => row('s', d, k, F.ships[k], [1])).join('');
    else b += WPN.filter(w => foldOf(w) === UI.fold).map(w => row('w', w, w.i, F.stock[w.i], w.cls === 'drone' ? [1, 10] : w.nuke ? [1] : [1, 5])).join('');
    b += `<div class="note">Оружие идёт на общий склад страны. Пускается с площадок (ДРОНОПОРТ, ОТРК, ШАХТА, АВИАБАЗА) в радиусе действия.</div>`;
  } else if (UI.tab === 'info') {
    const vis = visible(ci), war = atWar(p, c.o);
    b = `<div class="kv"><span>Владелец</span><span>${flagImg(c.o)} ${esc(ruName(c.o))}</span></div><div class="kv"><span>Статус</span><span>${war ? '<span class="badc">ВОЙНА</span>' : allied(p, c.o) ? '<span class="good">СОЮЗНИК</span>' : 'мир'}</span></div>
    <div class="kv"><span>Население</span><span>${num(c.pop)} тыс. · ур. ${lv}${cap ? ' · СТОЛИЦА' : ''}</span></div><div class="kv"><span>Залежи</span><span>${depHtml(c0)}</span></div>`;
    if (vis) b += `<div class="kv"><span>Гарнизон</span><span>${garrisonHtml(c.g)}</span></div><div class="kv"><span>Оборона</span><span>${num(defOf(c.g) * (1 + .2 * cnt(c, 'bunker')) + c.pop * 1.5 + 40)}</span></div><h3 style="margin-top:8px">ЗДАНИЯ${c.seen > S.day ? ' <span class="dim">(разведка ещё ' + Math.ceil(c.seen - S.day) + ' дн.)</span>' : ''}</h3>${bldListHtml(ci, 0)}`;
    else b += `<div class="note">Нет разведданных. Запустите РАЗВЕДЧИК, чтобы увидеть здания, гарнизон и ПВО.</div><button class="btn sm ${F.stock[WI.scout] > 0 && sitesFor(p, WI.scout, ci).length ? 'hi' : 'off'}" data-a="strike:${WI.scout}:1">${ico('scout')} РАЗВЕДЧИК (${F.stock[WI.scout]})</button>`;
    const adj = W.adj[ci].filter(e => S.C[e.j].o === p && gSum(S.C[e.j].g) > 0);
    if (war && adj.length) b += `<h3 style="margin-top:8px">ШТУРМ ИЗ СОСЕДНИХ ГОРОДОВ</h3>` + adj.map(e => `<div class="item"><div class="meta"><b>${esc(W.C0[e.j].n)}${e.sea ? ' (море)' : ''}</b><span class="cost">атака ${num(atkOf(S.C[e.j].g))} · ${e.km} км</span></div><button class="btn sm" data-a="sendfrom:${e.j}:0.5">50%</button><button class="btn sm hi" data-a="sendfrom:${e.j}:1">ВСЕ</button></div>`).join('');
  } else if (UI.tab === 'strike') {
    if (!atWar(p, c.o)) b = `<div class="note">Удары возможны только по врагу. Сейчас с ${esc(ruName(c.o))} — ${allied(p, c.o) ? 'союз' : 'мир'}.</div>${allied(p, c.o) ? '' : `<button class="btn sm bad" data-a="dip:${c.o}:war">ОБЪЯВИТЬ ВОЙНУ</button>`}`;
    else {
      b = `<div class="card"><div class="t">ЦЕЛЬ В ГОРОДЕ</div><div class="row">${PRIOS.map(([k, n]) => `<button class="btn sm ${UI.prio === k ? 'sel' : ''}" data-a="prio:${k}">${n}</button>`).join('')}</div></div>`;
      const ws = WPN.filter(w => F.stock[w.i] > 0);
      if (!ws.length) b += `<div class="note">Склад пуст. Производите оружие во вкладке ЦЕХА своих городов (нужен ДРОНЗАВОД или РАКЕТНЫЙ ЗАВОД).</div>`;
      b += ws.map(w => { const sites = sitesFor(p, w.i, ci), capN = sites.reduce((a, s) => a + s.cap, 0), ok = capN > 0, st = F.stock[w.i]; const steps = w.nuke ? [1] : w.cls === 'drone' ? [1, 5, 20] : [1, 3, 10];
        return `<div class="item">${ico(WSPR[w.k], 1)}<div class="meta"><b>${w.n} <span class="good">×${st}</span></b><span class="cost">${ok ? 'пуск: ' + esc(W.C0[sites[0].i].n) + ' · ' + Math.round(sites[0].km) + ' км · до ' + capN + '/день' : 'нет площадки в радиусе ' + w.rng + ' км'}</span></div>${ok ? steps.filter((n, i) => !i || st >= n).map(n => `<button class="btn sm ${w.nuke ? 'bad' : 'hi'}" data-a="strike:${w.i}:${n}">×${n}</button>`).join('') : ''}</div>`; }).join('');
    }
  } else if (UI.tab === 'dip') b = dipCard(c.o);
  return `<div class="ph">${flagImg(c.o)}<div class="nm">${esc(c0.n)}<br><small class="dim">${esc(ruName(c.o))} · ур. ${lv}</small></div><button class="btn sm" data-a="focus:${ci}">◎</button><button class="btn sm" data-a="unsel">✕</button></div>
  <div class="tabs">${tabs.map(([k, n]) => `<button class="btn sm ${UI.tab === k ? 'sel' : ''}" data-a="tab:${k}">${n}</button>`).join('')}</div><div class="body">${b}</div>`;
}
function renderPanel(force) {
  const el = $('#panel'), h = panelHtml(); el.hidden = !h; if (!h) { UI.lastP = ''; return; }
  if (h === UI.lastP || (UI.held && !force)) return; const body = $('.body', el), sc = body ? body.scrollTop : 0, same = UI.lastP && UI.lastKey === UI.sel + UI.tab + UI.bcat + UI.fold;
  el.innerHTML = h; UI.lastP = h; UI.lastKey = UI.sel + UI.tab + UI.bcat + UI.fold; if (same) $('.body', el).scrollTop = sc;
}
function renderMode() {
  const el = $('#modebar'), m = UI.mode; el.hidden = !m; document.body.classList.toggle('mode', !!m); if (!m) return;
  const h = `<div class="t">ОТПРАВКА ИЗ: ${esc(W.C0[m.from].n)} — выберите свой город или город врага</div><div class="row" style="justify-content:center">${[.25, .5, 1].map(s => `<button class="btn sm ${UI.share === s ? 'sel' : ''}" data-a="share:${s}">${s * 100}%</button>`).join('')}<button class="btn sm bad" data-a="mode-cancel">ОТМЕНА</button></div>`;
  if (el.innerHTML !== h) el.innerHTML = h;
}
function refresh(force) { renderHud(); renderPanel(force); renderMode(); if (UI.modal === 'menu' && (UI.mtab === 'dip' || UI.mtab === 'mkt' || UI.mtab === 'state') && !UI.held) renderMenu(true); }

// ---------- меню ----------
function openMenu(tab) { UI.modal = 'menu'; if (tab) UI.mtab = tab; if (S && S.speed) { UI.resume = S.speed; S.speed = 0; } renderMenu(); }
function closeModal() { UI.modal = ''; $('#modal').hidden = true; if (S && UI.resume) { S.speed = UI.resume; } UI.resume = 0; UI.lastM = ''; }
function saveList() { try { return JSON.parse(localStorage.getItem('ef2-saves') || '[]'); } catch (e) { return []; } }
function putSaves(l) { try { localStorage.setItem('ef2-saves', JSON.stringify(l)); return true; } catch (e) { return false; } }
function doSave(name, auto) {
  if (!S) return; const l = saveList().filter(s => !(auto && s.auto)); const sp = S.speed; S.speed = 0;
  l.unshift({ name: name || (auto ? 'Автосейв' : 'Сейв'), auto: !!auto, who: ruName(S.player), date: dateStr(S.day), data: JSON.stringify(S) }); S.speed = sp;
  while (l.length > 8) l.pop(); if (!putSaves(l)) { l.splice(1); putSaves(l); }
}
function loadState(o) {
  if (typeof o === 'string') o = JSON.parse(o); if (o && o.S) o = o.S;
  if (!o || o.v !== 2 || !o.C || o.C.length !== W.C0.length) throw new Error('Не тот формат сохранения');
  S = o; S.speed = 0; initNear(); rebuildOwn(); paintAll(); UI.sel = -1; UI.mode = null; UI.lastP = UI.lastH = ''; closeModal(); fitFaction(S.player); refresh(true);
}
function menuHtml() {
  const tabs = S ? [['state', 'СТРАНА'], ['dip', 'ДИПЛОМАТИЯ'], ['news', 'НОВОСТИ'], ['mkt', 'РЫНОК'], ['save', 'СЕЙВЫ'], ['set', 'НАСТРОЙКИ'], ['help', 'ПОМОЩЬ'], ['new', 'НОВАЯ ИГРА']] : [['new', 'НОВАЯ ИГРА'], ['save', 'СЕЙВЫ'], ['set', 'НАСТРОЙКИ'], ['help', 'ПОМОЩЬ']];
  if (!tabs.some(t => t[0] === UI.mtab)) UI.mtab = tabs[0][0];
  let b = ''; const t = UI.mtab, p = S ? S.player : -1;
  if (t === 'new') {
    const list = W.N.map((n, f) => f).filter(f => W.cities[f].length).sort((a, b2) => statOf(W.N[b2])[0] - statOf(W.N[a])[0] || W.cities[b2].length - W.cities[a].length);
    const st = UI.pick >= 0 ? statOf(W.N[UI.pick]) : null;
    b = `<div class="logo">ФРОНТ ЕВРАЗИИ<small>Пиксельная стратегия на реальной карте: 139 стран, 433 города.</small></div>
    ${saveList().length && !S ? `<div class="row" style="margin:8px 0"><button class="btn ok" data-a="load:0">ПРОДОЛЖИТЬ: ${esc(saveList()[0].who)} · ${esc(saveList()[0].date)}</button></div>` : ''}
    <h3>СЛОЖНОСТЬ</h3><div class="row" style="margin-bottom:8px">${DIFF.map((d, i) => `<button class="btn ${UI.diff === i ? 'sel' : ''}" data-a="diff:${i}">${d.n}</button>`).join('')}</div>
    <h3>ВАША СТРАНА${UI.pick >= 0 ? ' · ' + esc(ruName(UI.pick)) : ''}</h3>
    ${st ? `<div class="card">${flagImg(UI.pick)} сила ${st[0]} · экономика ${st[1]} · нефть ${st[2]} · промышленность ${st[3]} · уран ${st[4]}${st[5] ? ' · ☢ ' + st[5] : ''} · городов ${W.cities[UI.pick].length}</div>` : ''}
    <div class="clist">${list.map(f => `<button class="btn ${UI.pick === f ? 'sel' : ''}" data-a="pick:${f}">${flagImg(f)}${esc(ruName(f))}</button>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button class="btn hi ${UI.pick < 0 ? 'off' : ''}" data-a="begin">НАЧАТЬ ИГРУ</button></div><div class="note">Игровые значения силы и экономики условные и нужны для баланса. Это не реальные данные.</div>`;
  } else if (t === 'state') {
    const F = S.F[p], tot = {}; OWN[p].forEach(i => S.C[i].b.forEach(k => tot[k] = (tot[k] || 0) + 1));
    const army = [0, 0, 0, 0, 0, 0]; OWN[p].forEach(i => S.C[i].g.forEach((n, k) => army[k] += n)); S.moves.forEach(m => { if (m.f === p) m.g.forEach((n, k) => army[k] += n); });
    b = `<div class="grid2"><div class="card"><div class="t">КАЗНА</div><div class="kv"><span>Доходы</span><span class="good">+${num(F.gross)}</span></div><div class="kv"><span>Содержание армии и ПВО</span><span class="badc">−${num(F.upk)}</span></div><div class="kv"><span>Торговые договоры</span><span>+${num(F.tradeI)}</span></div><div class="kv"><span>Санкции</span><span>−${Math.round(Math.min(.5, F.sancK) * 100)}%</span></div><div class="kv"><span>Энергосеть</span><span class="${F.eff < 1 ? 'badc' : 'good'}">${Math.round(F.enP)} / ${Math.round(F.enU)} (${Math.round(F.eff * 100)}%)</span></div><div class="kv"><span>Население</span><span>${num(F.popSum)} тыс.</span></div><div class="kv"><span>Лимит склада</span><span>${num(F.cap0)}</span></div></div>
    <div class="card"><div class="t">ВООРУЖЁННЫЕ СИЛЫ · ${num(F.pow)}</div><div>${garrisonHtml(army)}</div><div style="margin-top:4px">${AIR.map((a, k) => F.air[k] ? `<span class="chipu">${ico(a.k)}${F.air[k]}</span>` : '').join('')}${SHIPS.map((a, k) => F.ships[k] ? `<span class="chipu">${ico(a.k)}${F.ships[k]}</span>` : '').join('')}</div><div style="margin-top:4px">${WPN.map(w => F.stock[w.i] ? `<span class="chipu">${ico(WSPR[w.k])}${F.stock[w.i]}</span>` : '').join('') || '<span class="dim">ракет и дронов нет</span>'}</div></div></div>
    <div class="card"><div class="t">ЦЕЛЬ: ${Math.ceil(W.C0.length * WIN_SHARE)} ГОРОДОВ — У ВАС ${OWN[p].length}</div><div class="bar"><i style="width:${Math.min(100, OWN[p].length / (W.C0.length * WIN_SHARE) * 100)}%"></i></div></div>
    <h3>ГОРОДА</h3>${OWN[p].slice().sort((a, b2) => S.C[b2].pop - S.C[a].pop).map(i => { const c = S.C[i]; return `<div class="bk"><div class="m"><b>${esc(W.C0[i].n)}${S.F[p].cap === i ? ' ★' : ''}</b><span class="dim">${num(c.pop)} тыс. · зданий ${c.b.length}/${slotsOf(c)} · оборона ${num(defOf(c.g))}${c.q.b.length ? ' · стройка' : ''}</span></div><button class="btn sm" data-a="goto:${i}">ОТКРЫТЬ</button></div>`; }).join('')}`;
  } else if (t === 'dip') {
    if (UI.dipF >= 0) b = `<div class="row" style="margin-bottom:6px"><button class="btn sm" data-a="dipsel:-1">← СПИСОК</button><button class="btn sm" data-a="gotof:${UI.dipF}">ПОКАЗАТЬ НА КАРТЕ</button></div>${dipCard(UI.dipF)}`;
    else {
      const offers = S.offers.map(o => `<div class="bk"><div class="m"><b>${flagImg(o.from)} ${esc(ruName(o.from))} предлагает ${{ peace: 'МИР', ally: 'СОЮЗ', trade: 'ТОРГОВЛЮ' }[o.t]}</b></div><button class="btn sm ok" data-a="offer:${o.from}:${o.t}:1">ПРИНЯТЬ</button><button class="btn sm bad" data-a="offer:${o.from}:${o.t}:0">ОТКАЗ</button></div>`).join('');
      const list = S.F.map((F, f) => f).filter(f => f !== p && S.F[f].alive).sort((a, b2) => (atWar(p, b2) - atWar(p, a)) || (allied(p, b2) - allied(p, a)) || S.F[b2].pow - S.F[a].pow);
      b = offers + `<div class="note">Сильнейшие державы. Нажмите на страну, чтобы вести переговоры.</div>` + list.slice(0, 60).map(f => { const F = S.F[f], r = relOf(f, p); return `<div class="bk" data-a="dipsel:${f}" style="cursor:pointer"><div class="m"><b>${flagImg(f)} ${esc(ruName(f))} ${atWar(p, f) ? '<span class="tag" style="color:var(--bad)">ВОЙНА</span>' : allied(p, f) ? '<span class="tag" style="color:var(--ok)">СОЮЗ</span>' : ''}${S.trade[key2(p, f)] != null ? ' <span class="tag">ТОРГ</span>' : ''}</b><span class="dim">${CHARS[F.ch].n} · мощь ${num(F.pow)} · городов ${OWN[f].length} · войн ${enemiesOf(f).length}</span></div><span class="${r < -20 ? 'badc' : r > 30 ? 'good' : ''}">${r > 0 ? '+' : ''}${r}</span></div>`; }).join('');
    }
  } else if (t === 'news') b = S.log.slice().reverse().map(l => `<div class="bk" ${l.c >= 0 ? `data-a="goto:${l.c}" style="cursor:pointer"` : ''}><div class="m"><span class="dim">${dateStr(l.d)}</span> <span class="${l.k === 'war' ? 'badc' : l.k === 'good' ? 'good' : l.k === 'nuke' ? 'nukec' : ''}">${esc(l.t)}</span></div></div>`).join('') || '<div class="note">Пока тихо.</div>';
  else if (t === 'mkt') {
    const F = S.F[p]; b = `<div class="note">Казна: $${num(F.money)}. Лимит склада: ${num(F.cap0)} (стройте СКЛАДЫ). В блокаде рынок закрыт.</div>` + [['food', 'ЕДА', 'food'], ['metal', 'МЕТАЛЛ', 'metal'], ['fuel', 'ТОПЛИВО', 'fuel']].map(([k, n, ic]) => `<div class="bk"><div class="m"><b>${ico(ic)} ${n}: ${num(F[k])}</b><span class="dim">купить $${PRICE[k][0]} · продать $${PRICE[k][1]} за ед.</span></div><button class="btn sm" data-a="mkt:${k}:-100">ПРОДАТЬ 100</button><button class="btn sm hi" data-a="mkt:${k}:100">КУПИТЬ 100</button><button class="btn sm hi" data-a="mkt:${k}:500">500</button></div>`).join('');
  } else if (t === 'save') {
    const l = saveList();
    b = `${S ? `<div class="row" style="margin-bottom:8px"><button class="btn hi" data-a="save">СОХРАНИТЬ СЕЙЧАС</button><button class="btn" data-a="export">ЭКСПОРТ В ТЕКСТ</button></div>` : ''}
    ${l.map((s, i) => `<div class="bk"><div class="m"><b>${esc(s.name)} · ${esc(s.who)}</b><span class="dim">${esc(s.date)}</span></div><button class="btn sm ok" data-a="load:${i}">ЗАГРУЗИТЬ</button><button class="btn sm bad" data-a="del:${i}">✕</button></div>`).join('') || '<div class="note">Сохранений нет.</div>'}
    <h3 style="margin-top:10px">ИМПОРТ / ЭКСПОРТ</h3><textarea id="io" placeholder="Вставьте сюда текст сохранения и нажмите ИМПОРТ"></textarea><div class="row" style="margin-top:6px"><button class="btn" data-a="import">ИМПОРТ</button><span class="dim" id="iomsg"></span></div>`;
  } else if (t === 'set') {
    const sm = SETTINGS.sound ? (SETTINGS.music ? 0 : 1) : 2;
    b = `<div class="card"><div class="t">ЗВУК</div><div class="row">${['ЗВУК + МУЗЫКА', 'ТОЛЬКО ЗВУК', 'ТИШИНА'].map((n, k) => `<button class="btn sm ${sm === k ? 'sel' : ''}" data-a="sndmode:${k}">${n}</button>`).join('')}</div></div>
    <div class="card"><div class="t">РАЗМЕР ПИКСЕЛЯ</div><div class="row">${[1, 2, 3, 4].map(n => `<button class="btn sm ${SETTINGS.px === n ? 'sel' : ''}" data-a="set-px:${n}">×${n}</button>`).join('')}</div></div>
    <div class="card"><div class="t">АВТОСЕЙВ (дней игры)</div><div class="row">${[10, 20, 40, 0].map(n => `<button class="btn sm ${SETTINGS.autosave === n ? 'sel' : ''}" data-a="set-auto:${n}">${n || 'ВЫКЛ'}</button>`).join('')}</div></div>
    <div class="card"><div class="t">НАЗВАНИЯ ГОРОДОВ</div><div class="row"><button class="btn sm ${SETTINGS.names ? 'sel' : ''}" data-a="names">${SETTINGS.names ? 'ВКЛ' : 'ВЫКЛ'}</button></div></div>`;
  } else if (t === 'help') b = `<div class="note" style="color:var(--ink)">
    <p><b class="hl">КАРТА.</b> Тяните мышью или пальцем, колесо / щипок — масштаб. Вблизи видны здания каждого города. Клик по городу открывает панель.</p>
    <p><b class="hl">ЭКОНОМИКА.</b> ЗАВОДЫ дают деньги и требуют энергию (ТЭЦ, СОЛНЦЕ, АЭС). КОЛХОЗЫ кормят города и пехоту. РУДНИКИ, НЕФТЬ и УРАН ставятся только на залежах. Дома и высотки поднимают лимит населения, а с ним уровень города и число слотов.</p>
    <p><b class="hl">АРМИЯ.</b> В КАЗАРМАХ набираются войска. Вкладка ВОЙСКА → ОТПРАВИТЬ, затем клик по своему городу или городу врага (или правый клик по цели). Войска идут по дорогам между городами; через море — только с ДЕСАНТНЫМИ кораблями. Вокзалы ускоряют марш вдвое.</p>
    <p><b class="hl">УДАРЫ.</b> ДРОНЗАВОД и РАКЕТНЫЙ ЗАВОД производят оружие на общий склад, ДРОНОПОРТ / ОТРК / ШАХТА / АВИАБАЗА запускают его. Откройте город врага → УДАР. ПВО бывает разной: ЗСУ и ПЕРЕХВАТЧИКИ бьют дроны, ЗРК — крылатые, ПРО — баллистику, СТРАТ. ПРО — ядерные. Обманки съедают выстрелы ПВО. РАЗВЕДЧИК вскрывает город на 40 дней.</p>
    <p><b class="hl">ДИПЛОМАТИЯ.</b> У каждого бота свой характер. Союзники вступают в войну за своих, торговля даёт доход, санкции режут экономику. Ядерный удар портит отношения со всем миром.</p>
    <p><b class="hl">ПОБЕДА.</b> Взять половину городов карты. Потеряете все — поражение.</p>
    <p><kbd>ПРОБЕЛ</kbd> пауза · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> скорость · <kbd>ESC</kbd> отмена · <kbd>M</kbd> меню</p></div>`;
  return `<div class="win pxbox"><div class="wh"><h2>${S ? esc(ruName(p)) + ' · ' + dateStr(S.day) : 'ФРОНТ ЕВРАЗИИ'}</h2>${S ? '<button class="btn sm" data-a="close">✕</button>' : ''}</div><div class="tabs" style="display:flex;gap:4px;flex-wrap:wrap;padding:4px 12px">${tabs.map(([k, n]) => `<button class="btn sm ${t === k ? 'sel' : ''}" data-a="mtab:${k}">${n}</button>`).join('')}</div><div class="wb">${b}</div></div>`;
}
function renderMenu(keep) {
  const el = $('#modal'), h = menuHtml(); el.hidden = false; if (h === UI.lastM) return;
  if (keep && document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
  const wb = $('.wb', el), sc = wb ? wb.scrollTop : 0, cl = $('.clist', el), sc2 = cl ? cl.scrollTop : 0; el.innerHTML = h; UI.lastM = h; if (keep || UI.keepScroll) { const w2 = $('.wb', el); if (w2) w2.scrollTop = sc; const c2 = $('.clist', el); if (c2) c2.scrollTop = sc2; } UI.keepScroll = 0;
}
function showOver(k) {
  UI.modal = 'over'; const el = $('#modal'); el.hidden = false; SFX.play(k > 0 ? 'win' : 'lose');
  el.innerHTML = `<div class="win pxbox"><div class="wb" style="text-align:center"><div class="logo">${k > 0 ? 'МИРОВОЕ ГОСПОДСТВО' : 'СТРАНА ПАЛА'}</div><p>${k > 0 ? 'Под вашим флагом половина городов карты. ' + dateStr(S.day) + '.' : 'Последний город потерян ' + dateStr(S.day) + '.'}</p><div class="row" style="justify-content:center">${k > 0 ? '<button class="btn ok" data-a="close">ИГРАТЬ ДАЛЬШЕ</button>' : ''}<button class="btn hi" data-a="newgame">НОВАЯ ИГРА</button></div></div></div>`;
}

// ---------- действия ----------
function selectCity(ci) { UI.sel = ci; UI.lastP = ''; if (ci >= 0) SFX.play('click'); refresh(true); }
function trySend(from, to, share) { const e = sendArmy(S.player, from, to, share); if (e) note(e); else { SFX.play('ping'); note(`Войска вышли: ${W.C0[from].n} → ${W.C0[to].n}`); } refresh(true); return !e; }
function act(a, el) {
  const [cmd, x, y, z2] = a.split(':'), p = S ? S.player : -1, ci = UI.sel; SFX.init(); let err = '';
  switch (cmd) {
    case 'speed': S.speed = +x; if (S.over === -1) S.speed = 0; break;
    case 'menu': openMenu(S ? (S.offers.length ? 'dip' : UI.mtab === 'new' ? 'state' : UI.mtab) : 'new'); break;
    case 'mtab': UI.mtab = x; UI.dipF = -1; renderMenu(); break;
    case 'close': closeModal(); break;
    case 'newgame': UI.mtab = 'new'; UI.modal = 'menu'; UI.lastM = ''; renderMenu(); break;
    case 'home': if (S.F[p].cap >= 0) { focusCity(S.F[p].cap, 3.5); selectCity(S.F[p].cap); } break;
    case 'pick': UI.pick = +x; UI.keepScroll = 1; if (!S || UI.mtab === 'new') { const cp = W.capOf[+x]; if (cp >= 0) { V.z = Math.max(V.z, 1.2); focusCity(cp); } } renderMenu(); break;
    case 'diff': UI.diff = +x; UI.keepScroll = 1; renderMenu(); break;
    case 'begin': if (UI.pick >= 0) startNew(UI.pick, UI.diff); break;
    case 'tab': UI.tab = x; break;
    case 'bcat': UI.bcat = x; break;
    case 'fold': UI.fold = x; break;
    case 'prio': UI.prio = x || ''; break;
    case 'unsel': UI.sel = -1; UI.mode = null; break;
    case 'focus': focusCity(+x, 4); break;
    case 'goto': closeModal(); focusCity(+x, 3.5); selectCity(+x); break;
    case 'gotof': { const f = +x; closeModal(); if (S.F[f].cap >= 0) { focusCity(S.F[f].cap, 2); selectCity(S.F[f].cap); UI.tab = 'dip'; } break; }
    case 'build': err = orderBuild(ci, +x); if (!err) SFX.play('done'); break;
    case 'demol': demolish(ci, +x); break;
    case 'cancel': cancelOrder(ci, x, +y); break;
    case 'unit': err = orderUnit(ci, +x); if (!err) SFX.play('ping'); break;
    case 'prod': err = orderProd(ci, x, +y, +z2); if (!err) SFX.play('ping'); break;
    case 'send': UI.mode = { t: 'move', from: ci }; break;
    case 'share': UI.share = +x; break;
    case 'mode-cancel': UI.mode = null; break;
    case 'sendfrom': trySend(+x, ci, +y); break;
    case 'strike': { const w = WPN[+x], n = launch(p, +x, ci, +y, UI.prio); if (!n) err = 'Пуск невозможен: нет площадки в радиусе или лимит пусков на сегодня'; else note(`Пуск: ${w.n} ×${n} → ${W.C0[ci].n}`); break; }
    case 'dip': { if (x != null && y === 'war' && !el.dataset.sure) { el.dataset.sure = 1; el.textContent = 'ТОЧНО? НАЖМИТЕ ЕЩЁ РАЗ'; UI.held = true; setTimeout(() => { UI.held = false; }, 2500); return; } UI.held = false; const r = propose(+x, y); if (r) note(r); if (UI.modal === 'menu') { UI.lastM = ''; renderMenu(true); } break; }
    case 'dipsel': UI.dipF = +x; UI.lastM = ''; renderMenu(); break;
    case 'offer': { const i = S.offers.findIndex(o => o.from === +x && o.t === y); if (i >= 0) answerOffer(i, z2 === '1'); const ts = el.closest('.ts'); if (ts) ts.remove(); if (UI.modal === 'menu') { UI.lastM = ''; renderMenu(true); } break; }
    case 'mkt': err = market(p, x, +y); UI.lastM = ''; renderMenu(true); break;
    case 'save': doSave('Сейв'); UI.lastM = ''; renderMenu(true); note('Сохранено'); break;
    case 'load': try { loadState(saveList()[+x].data); note('Загружено'); } catch (e) { note('Ошибка: ' + e.message); } break;
    case 'del': { const l = saveList(); l.splice(+x, 1); putSaves(l); UI.lastM = ''; renderMenu(true); break; }
    case 'export': { const ta = $('#io'); ta.value = JSON.stringify({ app: 'front-evrazii', fmt: 2, S }); ta.select(); try { navigator.clipboard.writeText(ta.value); $('#iomsg').textContent = 'Скопировано в буфер'; } catch (e) { $('#iomsg').textContent = 'Скопируйте текст вручную'; } return; }
    case 'import': try { loadState($('#io').value.trim()); note('Загружено'); } catch (e) { $('#iomsg').textContent = 'Ошибка: ' + e.message; } return;
    case 'sndmode': { const m = [[1, 1], [1, 0], [0, 0]][+x]; SETTINGS.sound = !!m[0]; saveSettings(); SFX.init(); SFX.music(!!m[1]); UI.lastM = ''; renderMenu(true); break; }
    case 'set-px': SETTINGS.px = +x; saveSettings(); resize(); UI.lastM = ''; renderMenu(true); break;
    case 'set-auto': SETTINGS.autosave = +x; saveSettings(); UI.lastM = ''; renderMenu(true); break;
    case 'names': SETTINGS.names = !SETTINGS.names; saveSettings(); UI.lastM = ''; renderMenu(true); break;
  }
  if (err) { note(err.charAt(0).toUpperCase() + err.slice(1)); }
  refresh(true);
}
function startNew(player, diff) {
  newGame(player, diff); paintAll(); UI.sel = -1; UI.mode = null; UI.tab = 'city'; UI.resume = 0; closeModal(); resize(); fitFaction(player);
  S.speed = 1; SFX.play('war'); refresh(true);
  toast(`${ruName(player)}: вы у власти. Откройте столицу и начните стройку. Пауза — ПРОБЕЛ.`, 'good', S.F[player].cap, 1);
}

// ---------- ввод ----------
function evXY(e) { const r = cv.getBoundingClientRect(), px = SETTINGS.px; return [(e.clientX - r.left) / px, (e.clientY - r.top) / px]; }
function cityFromXY(x, y) { const bx = V.x + x / V.z, by = V.y + y / V.z; let ci = cityNear(bx, by, Math.max(7, 12 / V.z)); if (ci < 0) ci = regionAt(bx, by); return ci; }
function mapClick(x, y, right) {
  const ci = cityFromXY(x, y);
  if (!S) { if (ci >= 0) { UI.pick = W.C0[ci].f; UI.keepScroll = 1; renderMenu(); } return; }
  const p = S.player;
  if (UI.mode && UI.mode.t === 'move') { if (ci < 0 || ci === UI.mode.from) { UI.mode = null; refresh(true); return; } if (trySend(UI.mode.from, ci, UI.share)) { UI.mode = null; refresh(true); } return; }
  if (right) { if (ci >= 0 && UI.sel >= 0 && S.C[UI.sel].o === p && ci !== UI.sel) trySend(UI.sel, ci, 1); return; }
  selectCity(ci);
}
function initInput() {
  const ptr = new Map(); let moved = 0, pinch = 0, lastTap = 0;
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button }); if (ptr.size === 1) moved = 0; if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } SFX.init(); });
  cv.addEventListener('pointermove', e => {
    const pt = ptr.get(e.pointerId), px = SETTINGS.px;
    if (!pt) { const [x, y] = evXY(e); UI.hover = S ? cityFromXY(x, y) : -1; return; }
    const dx = e.clientX - pt.x, dy = e.clientY - pt.y; pt.x = e.clientX; pt.y = e.clientY;
    if (ptr.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) { V.x -= dx / px / V.z; V.y -= dy / px / V.z; clampView(); } }
    else if (ptr.size === 2) { const [a, b] = [...ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = cv.getBoundingClientRect(); if (pinch > 0) zoomAt(((a.x + b.x) / 2 - r.left) / px, ((a.y + b.y) / 2 - r.top) / px, d / pinch); pinch = d; moved = 99; }
  });
  const up = e => { const pt = ptr.get(e.pointerId); if (!pt) return; ptr.delete(e.pointerId); if (e.type === 'pointerup' && moved <= 6 && ptr.size === 0) { const [x, y] = evXY(e); mapClick(x, y, pt.b === 2); } };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = evXY(e); zoomAt(x, y, e.deltaY < 0 ? 1.25 : .8); }, { passive: false });
  document.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t && !t.classList.contains('off')) { act(t.dataset.a, t); return; } const ts = e.target.closest('.ts'); if (ts && ts.dataset.c && S) { focusCity(+ts.dataset.c, 3); selectCity(+ts.dataset.c); ts.remove(); } });
  document.addEventListener('pointerdown', e => { if (e.target.closest('#panel,#modal')) UI.held = true; }, true);
  document.addEventListener('pointerup', () => { setTimeout(() => { UI.held = false; }, 60); }, true);
  document.addEventListener('pointercancel', () => { UI.held = false; }, true);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && S && UI.modal === 'menu') closeModal(); });
  window.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || !S) return;
    if (e.code === 'Space') { e.preventDefault(); if (UI.modal) return; S.speed = S.speed ? 0 : (UI.prevSp || 1); }
    else if (e.key >= '1' && e.key <= '3') { if (!UI.modal) S.speed = +e.key; }
    else if (e.key === 'Escape') { if (UI.modal === 'menu') closeModal(); else if (UI.mode) UI.mode = null; else UI.sel = -1; }
    else if (e.key === 'm' || e.key === 'ь' || e.key === 'M') { UI.modal ? closeModal() : openMenu(); }
    else return; if (S.speed) UI.prevSp = S.speed; refresh(true);
  });
  window.addEventListener('resize', resize);
}

// ---------- запуск ----------
let _last = 0, _ui = 0;
function loop(now) {
  requestAnimationFrame(loop); const dt = Math.min(.1, (now - _last) / 1000 || 0); _last = now;
  if (S && S.speed && !UI.modal) { let d = dt * SPEEDS[S.speed]; while (d > 0) { const s = Math.min(d, .2); advance(s); d -= s; } }
  updateFx(dt); draw(now);
  if (now - _ui > 300) { _ui = now; refresh(); }
}
function boot() {
  cv = $('#map'); ctx = cv.getContext('2d'); $('#hud').innerHTML = '<div class="chip"><span class="who">ФРОНТ ЕВРАЗИИ — строим мир…</span></div>';
  setTimeout(() => {
    buildWorld(JSON.parse($('#topo').textContent), JSON.parse($('#citydata').textContent)); initNear(); initMap(); paintAll();
    EV.owner = ci => { paintCity(ci); UI.lastP = ''; };
    EV.boom = fxBoom; EV.toast = toast;
    EV.fly = (wk) => { const w = WPN[wk]; SFX.play(w.nuke ? 'nukeLaunch' : w.cls === 'drone' ? 'drone' : 'missile'); };
    EV.over = k => showOver(k);
    EV.day = day => { if (SETTINGS.autosave && day > 0 && day % SETTINGS.autosave === 0) doSave('Автосейв', true); };
    resize(); V.z = V.zmin / .8; V.x = (W.BW - CW / V.z) / 2; V.y = (W.BH - CH / V.z) / 2; clampView();
    initInput(); openMenu('new'); requestAnimationFrame(loop);
  }, 30);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
