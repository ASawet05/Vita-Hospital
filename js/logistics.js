// Vita Hospital — Eczane stoku, sipariş ve lojistik teslimatı
//
// İlaçlar 5 grupta stoklanır ve eczanede her teslimde azalır. Stok kritik seviyeye düşünce
// eczacı Başhekime haber verir. Başhekimlik bilgisayarındaki "Stok & Lojistik" uygulamasından
// verilen sipariş, yerleşkeye gelen lojistik kamyonuyla teslim edilir: kamyon caddeden gelir,
// bariyerden geçip lojistik kapısının önünde durur, kurye kolileri eczaneye taşır.
// Aynı araç cihazlar için sipariş edilen yedek parçaları da getirir.
(function () {
  const VH = (window.VH = window.VH || {});
  const M = () => VH.map, E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state, H = () => VH.hospital;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };
  const notify = (icon, text, floor, kind) => { if (VH.notify) VH.notify(icon, text, floor, kind); };

  const CATS = {
    vitamin:     { name: 'Vitamin & Mineral', icon: '💊', rx: ['demir', 'dvit', 'b12', 'magnezyum', 'cinko', 'folat'], price: 55 },
    agri:        { name: 'Ağrı & Antiinflamatuvar', icon: '🩹', rx: ['agri', 'gut'], price: 70 },
    solunum:     { name: 'Solunum (İnhaler)', icon: '🫁', rx: ['inhaler', 'koah'], price: 120 },
    antibiyotik: { name: 'Antibiyotik', icon: '🧫', rx: ['antibiyotik'], price: 105 },
    acil:        { name: 'Acil, Kardiyak & Sıvı', icon: '💧', rx: ['sivi', 'seker', 'alerji', 'antikoagulan'], price: 85 },
  };
  const PACK = 10, CRITICAL = 4;
  const catKeyOf = (rx) => Object.keys(CATS).find((k) => CATS[k].rx.includes(rx)) || null;
  const capacity = () => 30 + 10 * ((VH.equipment ? VH.equipment.lvl('pharmacy') : 1) - 1);

  const data = () => {
    const st = S();
    if (!st.stock) { st.stock = {}; Object.keys(CATS).forEach((k) => { st.stock[k] = 14; }); }
    st.pending = st.pending || [];
    st.parts = st.parts || {};
    return st;
  };
  const warned = {};

  // ---------------------------------------------------------------- Stok
  function rxOf(p) { if (!p.rx) p.rx = H()._rxFor(p); return p.rx; }
  function canDispense(p) { const k = catKeyOf(rxOf(p)); return !k || data().stock[k] > 0; }
  function consume(p) {
    const k = catKeyOf(rxOf(p));
    if (!k) return;
    const st = data();
    st.stock[k] = Math.max(0, st.stock[k] - 1);
    if (st.stock[k] <= CRITICAL && !warned[k]) {
      warned[k] = true;
      const ph = E().staffById('pharmacist');
      if (ph && ph.floor === 0) E().say(ph, `Başhekimim, ${CATS[k].name} stoğu kritik (${st.stock[k]})!`, 3600);
      sound('alarm');
      notify(CATS[k].icon, `Stok kritik: ${CATS[k].name} (${st.stock[k]} kutu). Terminalden sipariş verin.`, 0, 'stock');
      if (VH.emit) VH.emit('stockCritical', k);
    }
  }

  // ---------------------------------------------------------------- Sipariş
  const cart = {};
  function cartCost() { return Object.keys(cart).reduce((s, k) => s + cart[k] * PACK * CATS[k].price, 0); }
  function placeStockOrder() {
    const cost = cartCost();
    const items = Object.assign({}, cart);
    if (!cost) return false;
    if (S().budget <= 0 || S().budget < cost) { UI().toast('Bütçe yetersiz', 1800); return false; }
    S().budget -= cost;
    data().pending.push({ kind: 'stock', items });
    Object.keys(cart).forEach((k) => delete cart[k]);
    sound('success');
    UI().toast(`📦 Sipariş verildi (${money(cost)}). Lojistik aracı yola çıkıyor.`, 2800);
    if (VH.emit) VH.emit('order', { kind: 'stock', cost });
    scheduleTruck(10);
    persist();
    return true;
  }
  function orderPart(cat, cost) {
    if (S().budget <= 0 || S().budget < cost) { UI().toast('Bütçe yetersiz', 1800); return false; }
    S().budget -= cost;
    data().pending.push({ kind: 'part', cat });
    sound('success');
    UI().toast('🔩 Yedek parça siparişi verildi; lojistik aracıyla gelecek.', 2600);
    if (VH.emit) VH.emit('order', { kind: 'part', cost });
    scheduleTruck(10);
    persist();
    return true;
  }

  // ---------------------------------------------------------------- Lojistik aracı ve kurye
  const TRUCK_IN = [[48, 27.95], [31.8, 27.95], [31.8, 7.4]];
  const TRUCK_OUT = [[31.8, 7.4], [31.8, -12]];
  let truck = null, dispatchIn = -1, courier = null;
  function scheduleTruck(delay) { if (!truck && dispatchIn < 0) dispatchIn = delay; }
  function dispatch() {
    const load = data().pending.splice(0);
    if (!load.length) return;
    truck = { pts: TRUCK_IN, i: 1, x: TRUCK_IN[0][0], y: TRUCK_IN[0][1], heading: 'W', phase: 'arrive', v: 6, load };
    notify('🚚', 'Lojistik aracı yolda: teslimat birazdan lojistik kapısına ulaşacak.', 0, 'truck');
  }
  function drive(v, dt) {
    let remain = 0;
    for (let i = v.i; i < v.pts.length; i++) { const a = i === v.i ? [v.x, v.y] : v.pts[i - 1], b = v.pts[i]; remain += Math.hypot(b[0] - a[0], b[1] - a[1]); }
    v.v = v.phase === 'arrive' ? Math.min(6, 1.2 + remain * 1.2) : Math.min(6, v.v + dt * 4);
    let step = v.v * dt;
    while (step > 0 && v.i < v.pts.length) {
      const [tx, ty] = v.pts[v.i];
      const dx = tx - v.x, dy = ty - v.y, d = Math.hypot(dx, dy);
      if (d > 1e-4) v.heading = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'W' : 'E') : (dy < 0 ? 'N' : 'S');
      if (d <= step) { v.x = tx; v.y = ty; v.i++; step -= d; if (v.phase === 'arrive' && v.i < v.pts.length) v.v = Math.min(v.v, 2.6); }
      else { v.x += (dx / d) * step; v.y += (dy / d) * step; step = 0; }
    }
    return v.i >= v.pts.length;
  }
  function deliver() {
    const st = data();
    const parts = [], meds = [];
    truck.load.forEach((o) => {
      if (o.kind === 'stock') Object.keys(o.items).forEach((k) => { if (CATS[k]) { st.stock[k] = Math.min(capacity(), st.stock[k] + o.items[k] * PACK); warned[k] = false; meds.push(CATS[k].name); } });
      if (o.kind === 'part') { st.parts[o.cat] = (st.parts[o.cat] || 0) + 1; parts.push(o.cat); }
    });
    sound('ok');
    if (meds.length) notify('📦', `İlaçlar eczaneye teslim edildi: ${[...new Set(meds)].join(', ')}`, 0, 'delivered');
    if (parts.length) notify('🔩', `Yedek parça teslim edildi (${parts.length}). Teknisyen ya da siz arızalı cihazı onarabilirsiniz.`, 0, 'delivered');
    if (VH.emit) VH.emit('delivered', { meds: meds.length, parts });
    persist();
  }
  function update(dt) {
    if (dispatchIn >= 0) { dispatchIn -= dt; if (dispatchIn < 0) dispatch(); }
    if (!truck) return;
    if (truck.phase === 'arrive') {
      if (drive(truck, dt)) {
        truck.phase = 'unload';
        const look = { coat: '#8a6a4c', pants: '#3d405b', skin: '#c98d62', hair: '#2b1d14', hairStyle: 'short', carry: 'bag', badge: '#2ec4b6' };
        courier = E().makeEntity('extra', { name: 'Kurye', look, x: 31.5, y: 7.1, speed: 1.9, floor: 0 });
        E().extraPeople.push(courier);
        E().say(courier, 'Vita Lojistik, teslimat!', 2200);
        E().goTo(courier, 29.5, 4.5, (c) => {
          deliver();
          E().say(c, 'Teslim ettim, iyi nöbetler!', 2200);
          c.look = Object.assign({}, c.look, { carry: null });
          E().goTo(c, 31.5, 7.1, (cc) => { cc.gone = true; });
        });
      }
    } else if (truck.phase === 'unload') {
      if (!courier || courier.gone) {
        if (courier) { const i = E().extraPeople.indexOf(courier); if (i >= 0) E().extraPeople.splice(i, 1); courier = null; }
        truck.phase = 'leave'; truck.pts = TRUCK_OUT; truck.i = 1; truck.v = 0.5;
      } else E().stepPath(courier, dt);
    } else if (drive(truck, dt)) {
      truck = null;
      if (data().pending.length) scheduleTruck(6);
    }
  }
  function truckObject() {
    const ns = truck.heading === 'N' || truck.heading === 'S';
    const w = ns ? 1.3 : 3, h = ns ? 3 : 1.3;
    return { k: 'logistics_truck', x: truck.x - w / 2, y: truck.y - h / 2, w, h, face: truck.heading };
  }
  function drawables(map) {
    if (map.floor !== 0 || !truck) return [];
    const o = truckObject();
    const cs = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(([x, y]) => map.rotPt(x, y));
    const key = Math.max(...cs.map((c) => c[0])) + Math.max(...cs.map((c) => c[1])) - 1;
    const [cx, cy] = map.worldToIso(truck.x, truck.y);
    return [{ kind: 'truck', key, cx, cy, draw: (ctx) => VH.art.draw(ctx, { o }) }];
  }

  // ---------------------------------------------------------------- Terminal uygulaması
  function deskGate(list) {
    if (VH.terminal && !VH.terminal.atDesk()) {
      const w = el('div', { className: 'warn' }, '🖥️ Sipariş vermek için Başhekimlik odasındaki bilgisayarı kullanın. Buradan yalnızca durumu izleyebilirsiniz.');
      const b = el('button', { type: 'button', className: 'mini-btn', style: 'margin-left:8px' }, '🧭 Yol göster');
      b.addEventListener('click', () => VH.terminal.guide());
      w.appendChild(b);
      list.appendChild(w);
      return false;
    }
    return true;
  }
  function renderStock(list, rerender) {
    const st = data();
    const can = deskGate(list);
    const cap = capacity();
    list.appendChild(el('p', { className: 'muted' }, `Her kutu bir hastaya yetecek ilaç içerir. Kapasite: grup başına ${cap} kutu (eczane otomasyonu yükseldikçe artar). Kritik eşik: ${CRITICAL} kutu.`));
    Object.keys(CATS).forEach((k) => {
      const c = CATS[k], n = st.stock[k];
      const row = el('div', { className: 'stock-row' + (n <= CRITICAL ? ' low' : '') });
      row.appendChild(el('span', { className: 'shop-icon' }, c.icon));
      const body = el('div', { className: 'shop-body' });
      body.appendChild(el('strong', {}, c.name));
      const tr = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
      fill.style.width = (n / cap) * 100 + '%'; fill.style.background = n <= CRITICAL ? '#ff5a5f' : n < cap / 2 ? '#f2c94c' : '#46c46a';
      tr.appendChild(fill); body.appendChild(tr);
      body.appendChild(el('span', { className: 'shop-meta' }, `${n}/${cap} kutu · 10'lu koli ${money(PACK * c.price)}${cart[k] ? ' · sepette ' + cart[k] + ' koli' : ''}`));
      row.appendChild(body);
      const b = el('button', { type: 'button', className: 'mini-btn' }, '＋ Koli');
      b.disabled = !can || n + ((cart[k] || 0) + 1) * PACK > cap + PACK - 1;
      b.addEventListener('click', () => { cart[k] = (cart[k] || 0) + 1; rerender(); });
      row.appendChild(b);
      list.appendChild(row);
    });
    const cost = cartCost();
    const act = el('div', { className: 'dlg-actions', style: 'justify-content:flex-start;margin-top:8px' });
    const ob = el('button', { type: 'button', className: 'dlg-btn' + (cost && can && S().budget >= cost && S().budget > 0 ? '' : ' ghost') }, cost ? `🚚 Siparişi ver (${money(cost)})` : 'Sepet boş');
    ob.disabled = !cost || !can || S().budget < cost || S().budget <= 0;
    ob.addEventListener('click', () => { placeStockOrder(); rerender(); });
    act.appendChild(ob);
    if (cost) { const cb = el('button', { type: 'button', className: 'dlg-btn ghost' }, 'Sepeti boşalt'); cb.addEventListener('click', () => { Object.keys(cart).forEach((x) => delete cart[x]); rerender(); }); act.appendChild(cb); }
    list.appendChild(act);
    list.appendChild(el('div', { className: 'sec-title' }, 'Teslimat durumu'));
    const status = truck ? (truck.phase === 'arrive' ? '🚚 Araç yolda' : truck.phase === 'unload' ? '📦 Kurye eczaneye taşıyor' : '↩️ Araç dönüyor')
      : dispatchIn >= 0 ? `⏱️ Araç ${Math.ceil(dispatchIn)} sn içinde yola çıkacak` : st.pending.length ? 'Sipariş sırada' : 'Bekleyen teslimat yok';
    list.appendChild(el('p', {}, status));
  }

  function sanitize(st, d) {
    const out = { stock: {}, pending: [], parts: {} };
    Object.keys(CATS).forEach((k) => { const v = d.stock && d.stock[k]; out.stock[k] = typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(80, Math.round(v))) : 20; });
    (Array.isArray(d.pending) ? d.pending : []).slice(0, 10).forEach((o) => {
      if (o && o.kind === 'stock' && o.items && typeof o.items === 'object') {
        const items = {}; Object.keys(CATS).forEach((k) => { const v = o.items[k]; if (typeof v === 'number' && v > 0 && v < 10) items[k] = Math.round(v); });
        if (Object.keys(items).length) out.pending.push({ kind: 'stock', items });
      }
      if (o && o.kind === 'part' && VH.equipment && VH.equipment.CATS.some((c) => c.id === o.cat)) out.pending.push({ kind: 'part', cat: o.cat });
    });
    if (d.parts && typeof d.parts === 'object' && VH.equipment) VH.equipment.CATS.forEach((c) => { const v = d.parts[c.id]; if (typeof v === 'number' && v > 0) out.parts[c.id] = Math.min(9, Math.round(v)); });
    return out;
  }

  VH.panelTabs.push({ id: 'stok', label: '📦 Stok & Lojistik', order: 12, render: renderStock });

  VH.logistics = {
    CATS, PACK, CRITICAL,
    catOf: (rx) => CATS[catKeyOf(rx)] || null,
    catKeyOf, canDispense, consume, capacity, placeStockOrder, orderPart, cart,
    get stock() { return data().stock; },
    get parts() { return data().parts; },
    get truck() { return truck; },
    get dispatchIn() { return dispatchIn; },
    useParts(cat) { const p = data().parts; if (!p[cat]) return false; p[cat]--; return true; },
    init() { data(); if (data().pending.length) scheduleTruck(8); },
    update, drawables, renderStock, sanitize, deskGate,
    _dispatchNow: () => { dispatchIn = 0.01; },
  };
})();
