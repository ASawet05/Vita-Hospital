// Vita Hospital — Düzenleme modu: eşya taşıma, döndürme, dekor satın alma ve konfor
//
// Hastane içindeki eşya ve cihazlar seçilip başka bir hücreye taşınabilir ya da döndürülebilir.
// Hasta akışının parçası olan sabit noktalar (bekleme koltukları, muayene ve kan alma
// koltukları, sedyeler, bankolar, asansör) kilitlidir. Her yerleştirmede:
//   - ayak izi aynı odada, boş ve kapı önü / hasta güzergâhı hücrelerinin dışında olmalı,
//   - daha önce ulaşılabilen hiçbir hücre erişilemez hâle gelmemeli (A* bağlantı denetimi).
// Dekorlar (bitki, akvaryum, TV, kanepe, kahve makinesi...) bekleme alanlarının konforunu
// artırır: hastaların sabrı daha yavaş azalır, hastane puanı yükselir.
(function () {
  const VH = (window.VH = window.VH || {});
  const M = () => VH.map, E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };

  // Dekor kataloğu: comfort → bekleme alanı konfor puanı
  const CATALOG = [
    { k: 'potted_plant', name: 'Saksı Bitkisi', icon: '🪴', cost: 400, comfort: 3 },
    { k: 'palm_plant', name: 'Palmiye', icon: '🌴', cost: 700, comfort: 4 },
    { k: 'aquarium', name: 'Akvaryum', icon: '🐠', cost: 2500, comfort: 8, w: 2 },
    { k: 'tv_stand', name: 'Bilgilendirme TV\'si', icon: '📺', cost: 1800, comfort: 6 },
    { k: 'sofa', name: 'Kanepe', icon: '🛋️', cost: 1200, comfort: 5, w: 2 },
    { k: 'coffee_machine', name: 'Kahve Makinesi', icon: '☕', cost: 1500, comfort: 5, need: true },
    { k: 'vending', name: 'Atıştırmalık Otomatı', icon: '🥤', cost: 2000, comfort: 4, need: true },
    { k: 'water_cooler', name: 'Su Sebili', icon: '💧', cost: 600, comfort: 3, need: true },
    { k: 'bookshelf', name: 'Kitaplık', icon: '📚', cost: 900, comfort: 4 },
    { k: 'toy_box', name: 'Oyuncak Kutusu', icon: '🧸', cost: 800, comfort: 5 },
    { k: 'info_kiosk', name: 'Bilgi Kiosku', icon: 'ℹ️', cost: 1600, comfort: 4 },
    { k: 'trash_bin', name: 'Çöp Kutusu', icon: '🗑️', cost: 250, comfort: 2 },
    { k: 'fire_ext', name: 'Yangın Tüpü', icon: '🧯', cost: 300, comfort: 1 },
    { k: 'bench', name: 'Bank', icon: '🪑', cost: 500, comfort: 2 },
  ];
  const COMFORT = {};
  CATALOG.forEach((c) => { COMFORT[c.k] = c.comfort; });
  Object.assign(COMFORT, { play_mat: 4, rug: 2, directory_sign: 1, chair: 1 });
  const NAMES = {
    desk: 'Masa', chair: 'Sandalye', stool: 'Tabure', screen: 'Paravan', bp_stand: 'Tansiyon Aleti', cart: 'Malzeme Arabası', autoclave: 'Otoklav',
    analyzer: 'Analizör', vial_rack: 'Tüp Rafı', centrifuge: 'Santrifüj', microscope: 'Mikroskop', biohazard_bin: 'Tıbbi Atık Kutusu', monitor: 'Hasta Monitörü',
    iv_stand: 'Serum Askısı', ventilator: 'Ventilatör', defibrillator: 'Defibrilatör', oxygen: 'Oksijen Tüpleri', wheelchair: 'Tekerlekli Sandalye',
    med_cabinet: 'İlaç Dolabı', first_aid: 'İlk Yardım Dolabı', sanitizer: 'Dezenfektan', locker: 'Dolap', terminal: 'Arşiv Terminali', archive: 'Arşiv Dolabı',
    queue_display: 'Sıra Ekranı', directory_sign: 'Yönlendirme Tabelası', barrier_posts: 'Sıra Bariyeri', column: 'Sütun', vending: 'Otomat', water_cooler: 'Su Sebili',
    play_mat: 'Oyun Halısı', rug: 'Halı', lamp_post: 'Sokak Lambası', bench: 'Bank', trash_bin: 'Çöp Kutusu', flower_bed: 'Çiçeklik', planter: 'Saksı', flag_pole: 'Bayrak Direği',
    bike_rack: 'Bisiklet Parkı', sign_hospital: 'Hastane Tabelası', fountain: 'Süs Havuzu', bush: 'Çalı',
  };
  CATALOG.forEach((c) => { NAMES[c.k] = c.name; });
  const LOCK_KINDS = new Set(['waiting_chair', 'waiting_row', 'exam_table', 'blood_chair', 'gurney', 'reception_desk', 'elevator', 'bed', 'incubator', 'ambulance_bay',
    'floor_decal', 'road_mark', 'parking_lines', 'crosswalk', 'entrance_canopy', 'or_table', 'dialysis', 'er_sign']);
  const LOCK_TAGS = new Set(['pharmacy_counter', 'triage', 'exam_bed', 'ward_bed', 'nurse_station', 'elevator', 'reception_desk']);
  const FACES = ['S', 'W', 'N', 'E'];

  // Taban nesne sayıları (kayıtta taşınan nesneler indeksle tutulur)
  const baseCount = M().FLOOR_DEFS.map((d) => d.objects.length);

  const state = { active: false, sel: null, ghost: null, mode: null, hover: null, valid: false, why: '' };

  const layout = () => { const st = S(); st.layout = st.layout || { moves: {}, decor: [] }; return st.layout; };
  const floorNow = () => E().player.floor;
  const objs = (f) => M().FLOOR_DEFS[f].objects;
  const nameOf = (o) => NAMES[o.k] || 'Eşya';

  function lockReason(o, f) {
    if (o.z) return 'Masa üstü eşyası; masayla birlikte taşınır.';
    if (LOCK_KINDS.has(o.k) || LOCK_TAGS.has(o.tag)) return 'Hasta akışının parçası: yeri sabit.';
    const i = objs(f).indexOf(o);
    if (i >= baseCount[f] && !o.decor) return 'Bu cihaz sabit kurulumdur.';
    const [W, H] = M().dims(f);
    if (o.x < 0 || o.y < 0 || o.x + o.w > W || o.y + o.h > H) return 'Kampüs dışı alan.';
    return null;
  }

  // ---------------------------------------------------------------- Bağlantı denetimi
  function reach(f, startCells) {
    const [W, H] = M().dims(f);
    // BFS mesafesi (0 = ulaşılamaz, n = başlangıçtan adım sayısı + 1)
    const seen = new Int32Array(W * H);
    const q = [];
    startCells.forEach(([x, y]) => { if (x >= 0 && y >= 0 && x < W && y < H && !M().isBlocked(x, y, f)) { seen[y * W + x] = 1; q.push([x, y]); } });
    for (let qi = 0; qi < q.length; qi++) {
      const [x, y] = q[qi];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx]) continue;
        if (!M().canStep(x, y, nx, ny, f)) continue;
        seen[ny * W + nx] = seen[y * W + x] + 1; q.push([nx, ny]);
      }
    }
    return seen;
  }
  const startOf = (f) => (f === 0 ? [[4, 24]] : [M().floorArrive(f).map(Math.floor)]);

  function reserved(f) {
    const set = new Set();
    const add = (x, y) => set.add(x + ',' + y);
    const def = M().FLOOR_DEFS[f];
    def.doors.forEach((d) => {
      for (let p = 0; p < 2; p++) {
        if (d.e === 'N') { add(d.x + p, d.y); add(d.x + p, d.y - 1); } else { add(d.x, d.y + p); add(d.x - 1, d.y + p); }
      }
    });
    if (f === 0) { E().keySpots().forEach(([x, y]) => add(x, y)); if (VH.hospital.keySpots) VH.hospital.keySpots().forEach(([x, y]) => add(x, y)); }
    else add(...M().floorArrive(f).map(Math.floor));
    E().staff.filter((s) => (s.floor || 0) === f).forEach((s) => (s.def.points || []).forEach((p) => add(Math.floor(p[0]), Math.floor(p[1]))));
    E().patients.concat(E().staff, [E().player]).filter((e) => (e.floor || 0) === f && !e.gone).forEach((e) => add(Math.floor(e.x), Math.floor(e.y)));
    return set;
  }
  const attached = (o, f) => objs(f).filter((p) => p !== o && p.z && p.x >= o.x && p.x < o.x + o.w && p.y >= o.y && p.y < o.y + o.h);

  /** Nesneyi (x,y,face) konumuna koymayı dene; geçersizse eski hâline döner. */
  function tryPlace(o, f, x, y, face, isNew, commit) {
    const [W, H] = M().dims(f);
    let w = o.w || 1, h = o.h || 1;
    const oldFace = o.face || 'S';
    if (face && (FACES.indexOf(face) % 2) !== (FACES.indexOf(oldFace) % 2)) [w, h] = [h, w];
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) return { ok: false, why: 'Alan dışı' };
      if (f === 0 && xx >= 31) return { ok: false, why: 'Ambulans yolu açık kalmalı' };
    }
    const room0 = M().roomIdAt(x, y, f);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      if (M().roomIdAt(xx, yy, f) !== room0) return { ok: false, why: 'Eşya iki odaya taşamaz' };
    }
    if (!room0 && f === 0 && y < 23) return { ok: false, why: 'Alan dışı' };
    const res = reserved(f);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
      const inside = !isNew && xx >= o.x && xx < o.x + o.w && yy >= o.y && yy < o.y + o.h;
      if (res.has(xx + ',' + yy) && !inside) return { ok: false, why: 'Kapı önü / hasta güzergâhı boş kalmalı' };
    }
    // Simülasyon: nesneyi geçici olarak taşı, ızgarayı yeniden kur
    const before = reach(f, startOf(f));
    const saved = { x: o.x, y: o.y, w: o.w, h: o.h, face: o.face };
    const att = isNew ? [] : attached(o, f).map((p) => ({ p, dx: p.x - o.x, dy: p.y - o.y }));
    const list = objs(f);
    if (isNew) list.push(o);
    o.x = x; o.y = y; o.w = w; o.h = h; o.face = face || o.face;
    att.forEach((a) => { a.p.x = x + a.dx; a.p.y = y + a.dy; });
    M().rebuild(f, true);
    let ok = true, why = '';
    // ayak izi başka bir nesneyle çakışmasın
    for (const p of list) {
      if (p === o || p.z || p.flat || VH.art.isFlat(p.k) || p.block === false) continue;
      if (p.x < x + w && p.x + (p.w || 1) > x && p.y < y + h && p.y + (p.h || 1) > y) { ok = false; why = 'Bu hücre dolu'; break; }
    }
    if (ok) {
      const after = reach(f, startOf(f));
      for (let i = 0; i < before.length; i++) {
        if (!before[i] || after[i]) continue;
        const cx = i % W, cy = Math.floor(i / W);
        if (cx >= x && cx < x + w && cy >= y && cy < y + h) continue;
        ok = false; why = 'Bir alana giden yolu kapatıyor'; break;
      }
      // yolu kapatmasa da hasta/personel güzergâhını çok uzatmamalı
      if (ok) for (let i = 0; i < before.length; i++) {
        if (!before[i] || !after[i]) continue;
        if (after[i] - before[i] > 8) { ok = false; why = 'Hasta güzergâhını çok uzatıyor'; break; }
      }
    }
    if (!ok || !commit) {
      if (isNew) list.splice(list.indexOf(o), 1);
      Object.assign(o, saved);
      att.forEach((a) => { a.p.x = saved.x + a.dx; a.p.y = saved.y + a.dy; });
      M().rebuild(f, true);
    } else {
      M().rebuild(f);
      E().buildDevices();
    }
    return { ok, why };
  }

  // ---------------------------------------------------------------- Kayıt
  function recordMove(o, f) {
    const i = objs(f).indexOf(o);
    if (o.decor) return;
    if (i < 0 || i >= baseCount[f]) return;
    layout().moves[f + ':' + i] = [o.x, o.y, o.face || 'S', o.w, o.h];
    attached(o, f).forEach((p) => { const j = objs(f).indexOf(p); if (j >= 0 && j < baseCount[f]) layout().moves[f + ':' + j] = [p.x, p.y, p.face || 'S', p.w, p.h]; });
  }
  function recordDecor() {
    const out = [];
    M().FLOOR_DEFS.forEach((d, f) => d.objects.forEach((o) => { if (o.decor) out.push([f, o.k, o.x, o.y, o.face || 'S', o.w, o.h]); }));
    layout().decor = out;
  }
  function applyLayout() {
    const L = layout();
    const touched = new Set();
    Object.keys(L.moves).forEach((key) => {
      const [f, i] = key.split(':').map(Number);
      const o = objs(f) && objs(f)[i];
      const v = L.moves[key];
      if (!o || !Array.isArray(v) || i >= baseCount[f]) return;
      [o.x, o.y, o.face, o.w, o.h] = v;
      touched.add(f);
    });
    (L.decor || []).forEach(([f, k, x, y, face, w, h]) => {
      if (!M().FLOOR_DEFS[f] || !CATALOG.find((c) => c.k === k)) return;
      objs(f).push({ k, x, y, w, h, face, decor: true });
      touched.add(f);
    });
    touched.forEach((f) => M().rebuild(f));
    if (touched.size) E().buildDevices();
  }
  function sanitize(d) {
    const out = { moves: {}, decor: [] };
    if (!d || typeof d !== 'object') return out;
    const n = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
    const fOk = (f) => Number.isInteger(f) && f >= 0 && f < M().FLOOR_DEFS.length;
    if (d.moves && typeof d.moves === 'object') Object.keys(d.moves).slice(0, 400).forEach((key) => {
      const m = /^(\d):(\d{1,4})$/.exec(key);
      const v = d.moves[key];
      if (!m || !Array.isArray(v) || !fOk(+m[1])) return;
      const [x, y, face, w, h] = v;
      if (!n(x, 0, 60) || !n(y, 0, 60) || !FACES.includes(face) || !n(w, 1, 4) || !n(h, 1, 4)) return;
      out.moves[key] = [Math.round(x), Math.round(y), face, Math.round(w), Math.round(h)];
    });
    (Array.isArray(d.decor) ? d.decor : []).slice(0, 120).forEach((v) => {
      if (!Array.isArray(v)) return;
      const [f, k, x, y, face, w, h] = v;
      if (!fOk(f) || !CATALOG.find((c) => c.k === k) || !n(x, 0, 60) || !n(y, 0, 60) || !FACES.includes(face) || !n(w, 1, 4) || !n(h, 1, 4)) return;
      out.decor.push([f, k, Math.round(x), Math.round(y), face, Math.round(w), Math.round(h)]);
    });
    return out;
  }

  // ---------------------------------------------------------------- Konfor
  function comfort() {
    let sum = 0;
    for (const o of objs(0)) {
      if (!COMFORT[o.k]) continue;
      const room = M().roomIdAt(o.x, o.y, 0);
      if (room === 'waiting' || room === 'reception' || room === 'er' || room === 'corridor') sum += COMFORT[o.k];
    }
    return Math.min(100, Math.round(sum * 2.5));
  }
  function factor(k) {
    const c = comfort() / 100;
    if (k === 'patienceDrain') return 1 - 0.28 * c;
    if (k === 'spawnInterval') return 1 - 0.1 * c;
    return 1;
  }

  // ---------------------------------------------------------------- Mod ve girdiler
  function cellAt(px, py, vw, vh) {
    const cam = M().camera;
    const [ix, iy] = cam.toIso(px, py, vw, vh);
    const [wx, wy] = M().isoToWorld(ix, iy);
    return [Math.floor(wx), Math.floor(wy)];
  }
  function objectAt(px, py, vw, vh) {
    const f = floorNow();
    const z = M().camera.zoom;
    for (const dz of [0, 14, 28, 42]) {
      const [cx, cy] = cellAt(px, py + dz * z, vw, vh);
      const cands = objs(f).filter((o) => !o.z && cx >= o.x && cx < o.x + (o.w || 1) && cy >= o.y && cy < o.y + (o.h || 1));
      cands.sort((a, b) => (VH.art.isFlat(a.k) || a.flat ? 1 : 0) - (VH.art.isFlat(b.k) || b.flat ? 1 : 0));
      if (cands.length) return cands[0];
    }
    return null;
  }

  function enter() {
    if (state.active) return;
    state.active = true; state.sel = null; state.ghost = null; state.mode = null;
    UI().closeDialog(true);
    document.body.classList.add('building');
    buildBar();
    UI().toast('🛋️ Düzenleme modu: bir eşyaya tıklayın, sonra yeni yerine tıklayın. T: döndür · Esc: çık', 4200);
  }
  function exit() {
    state.active = false; state.sel = null; state.ghost = null; state.mode = null;
    document.body.classList.remove('building');
    const bar = document.getElementById('build-bar'); if (bar) bar.remove();
    const pal = document.getElementById('build-palette'); if (pal) pal.remove();
    persist();
  }
  function cancel() {
    if (state.mode) { state.mode = null; state.sel = null; state.ghost = null; refreshBar(); return; }
    exit();
  }

  function hover(px, py, vw, vh) {
    if (!state.active || !state.mode) return;
    const [cx, cy] = cellAt(px, py, vw, vh);
    const g = state.ghost;
    if (!g) return;
    // ayak izinin ortası imleçte olsun
    const nx = cx - Math.floor((g.w - 1) / 2), ny = cy - Math.floor((g.h - 1) / 2);
    if (state.hover && state.hover[0] === nx && state.hover[1] === ny && state.hover[2] === g.face) return;
    state.hover = [nx, ny, g.face];
    g.x = nx; g.y = ny;
    const f = floorNow();
    const target = state.mode === 'new' ? Object.assign({}, g) : state.sel;
    const r = tryPlace(target, f, nx, ny, g.face, state.mode === 'new', false);
    state.valid = r.ok; state.why = r.why;
    refreshBar();
  }

  function click(px, py, vw, vh) {
    hover(px, py, vw, vh);
    const f = floorNow();
    if (state.mode === 'move' && state.sel) {
      if (!state.valid) { UI().toast('⛔ ' + (state.why || 'Buraya konamaz'), 1800); sound('error'); return; }
      const [x, y, face] = state.hover;
      const r = tryPlace(state.sel, f, x, y, face, false, true);
      if (!r.ok) { UI().toast('⛔ ' + r.why, 1800); return; }
      recordMove(state.sel, f); recordDecor();
      sound('ok');
      if (VH.emit) VH.emit('decorPlace', { k: state.sel.k, move: true });
      state.mode = null; state.sel = null; state.ghost = null;
      refreshBar(); persist();
      return;
    }
    if (state.mode === 'new' && state.ghost) {
      const item = state.item;
      if (S().budget < item.cost) { UI().toast('Bütçe yetersiz', 1800); return; }
      if (!state.valid) { UI().toast('⛔ ' + (state.why || 'Buraya konamaz'), 1800); sound('error'); return; }
      const [x, y, face] = state.hover;
      const o = { k: item.k, x, y, w: state.ghost.w, h: state.ghost.h, face, decor: true };
      const r = tryPlace(o, f, x, y, face, true, true);
      if (!r.ok) { UI().toast('⛔ ' + r.why, 1800); return; }
      S().budget -= item.cost;
      recordDecor();
      sound('success');
      UI().toast(`${item.icon} ${item.name} yerleştirildi · Konfor %${comfort()}`, 2200);
      if (VH.emit) VH.emit('decorPlace', { k: item.k, cost: item.cost });
      persist();
      refreshBar();
      return;
    }
    const o = objectAt(px, py, vw, vh);
    if (!o) return;
    const why = lockReason(o, f);
    if (why) { UI().toast(`🔒 ${nameOf(o)}: ${why}`, 2000); return; }
    state.sel = o; state.mode = 'move';
    state.ghost = { k: o.k, x: o.x, y: o.y, w: o.w || 1, h: o.h || 1, face: o.face || 'S', tag: o.tag, lvl: o.lvl, tint: o.tint };
    state.hover = null; state.valid = false;
    sound('click');
    refreshBar();
  }

  function rotate() {
    const g = state.ghost;
    if (!g) return;
    if (state.sel && attached(state.sel, floorNow()).length) { UI().toast('Üstünde eşya olan masa döndürülemez', 1800); return; }
    const i = FACES.indexOf(g.face || 'S');
    g.face = FACES[(i + 1) % 4];
    if ((g.w || 1) !== (g.h || 1)) [g.w, g.h] = [g.h, g.w];
    state.hover = null;
    sound('click');
  }
  function sell() {
    const o = state.sel;
    if (!o || !o.decor) { UI().toast('Yalnızca satın aldığınız dekorlar satılabilir', 1800); return; }
    const item = CATALOG.find((c) => c.k === o.k);
    const f = floorNow();
    const list = objs(f);
    list.splice(list.indexOf(o), 1);
    M().rebuild(f); E().buildDevices();
    S().budget += Math.round(item.cost * 0.5);
    recordDecor();
    UI().toast(`${item.name} satıldı (+${money(item.cost * 0.5)})`, 1800);
    state.sel = null; state.mode = null; state.ghost = null;
    persist(); refreshBar();
  }
  function startNew(item) {
    state.mode = 'new'; state.sel = null; state.item = item;
    state.ghost = { k: item.k, x: 0, y: 0, w: item.w || 1, h: item.h || 1, face: 'S', decor: true };
    state.hover = null; state.valid = false;
    refreshBar();
  }

  // ---------------------------------------------------------------- Araç çubuğu ve palet
  function buildBar() {
    const root = document.getElementById('ui-root');
    const bar = el('div', { id: 'build-bar' });
    root.appendChild(bar);
    const pal = el('div', { id: 'build-palette' });
    CATALOG.forEach((it) => {
      const b = el('button', { type: 'button', className: 'pal-item' });
      b.appendChild(el('span', { className: 'pal-icon' }, it.icon));
      b.appendChild(el('span', { className: 'pal-name' }, it.name));
      b.appendChild(el('span', { className: 'pal-cost' }, money(it.cost)));
      b.title = `${it.name} · Konfor +${it.comfort}${it.need ? ' · Hastalar kullanır' : ''}`;
      b.addEventListener('click', (e) => { e.stopPropagation(); startNew(it); });
      pal.appendChild(b);
    });
    root.appendChild(pal);
    refreshBar();
  }
  function refreshBar() {
    const bar = document.getElementById('build-bar');
    if (!bar) return;
    bar.innerHTML = '';
    bar.appendChild(el('span', { className: 'bb-title' }, '🛋️ Düzenleme Modu'));
    bar.appendChild(el('span', { className: 'bb-chip' }, `Konfor %${comfort()}`));
    let info = 'Taşımak için bir eşyaya tıklayın ya da alttan dekor seçin.';
    if (state.mode === 'move') info = `${nameOf(state.sel)} → yeni yerine tıklayın`;
    if (state.mode === 'new') info = `${state.item.icon} ${state.item.name} (${money(state.item.cost)}) → yerleştirmek için tıklayın`;
    if (state.mode && state.hover) info += state.valid ? ' · ✓ Uygun' : ` · ⛔ ${state.why}`;
    bar.appendChild(el('span', { className: 'bb-info' + (state.mode && state.hover && !state.valid ? ' bad' : '') }, info));
    const btn = (label, fn, dis) => { const b = el('button', { type: 'button', className: 'mini-btn' }, label); b.disabled = !!dis; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); bar.appendChild(b); };
    btn('⟳ Döndür (T)', rotate, !state.ghost);
    if (state.sel && state.sel.decor) btn('💰 Sat (%50)', sell);
    if (state.mode) btn('Vazgeç', cancel);
    btn('✓ Bitir', exit);
  }

  // ---------------------------------------------------------------- Çizim
  function drawOverlay(ctx, vw, vh) {
    if (!state.active) return;
    const cam = M().camera;
    ctx.save();
    ctx.translate(vw / 2, vh / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
    const f = floorNow();
    // kilitsiz eşyalar hafif işaretli
    const t = performance.now() / 1000;
    for (const o of objs(f)) {
      if (o === state.sel || lockReason(o, f)) continue;
      const [sx, sy] = M().worldToIso(o.x + (o.w || 1) / 2, o.y + (o.h || 1) / 2);
      ctx.fillStyle = `rgba(46,196,182,${0.35 + 0.2 * Math.sin(t * 3)})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    const outline = (x, y, w, h, col, fill) => {
      const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => M().worldToIso(a, b));
      ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
      ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
    };
    if (state.sel) outline(state.sel.x, state.sel.y, state.sel.w || 1, state.sel.h || 1, 'rgba(242,201,76,0.95)', 'rgba(242,201,76,0.15)');
    if (state.ghost && state.hover) {
      const g = state.ghost;
      outline(g.x, g.y, g.w, g.h, state.valid ? 'rgba(70,196,106,0.95)' : 'rgba(255,90,95,0.95)', state.valid ? 'rgba(70,196,106,0.25)' : 'rgba(255,90,95,0.25)');
      ctx.globalAlpha = 0.6;
      VH.art.draw(ctx, { o: g });
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function renderTab(list) {
    list.appendChild(el('p', {}, `Bekleme alanları konforu: %${comfort()} · Hastaların sabır kaybı %${Math.round(28 * comfort() / 100)} azalır.`));
    list.appendChild(el('p', { className: 'muted' }, 'Düzenleme modunda eşyaları taşıyabilir, döndürebilir ve yeni dekorlar satın alabilirsiniz. Kapı önleri ve hasta güzergâhları her zaman açık kalır; bir alanı kapatan yerleşime izin verilmez.'));
    const b = el('button', { type: 'button', className: 'dlg-btn' }, '🛋️ Düzenleme modunu aç');
    b.addEventListener('click', enter);
    list.appendChild(b);
    list.appendChild(el('div', { className: 'sec-title' }, 'Dekor kataloğu'));
    const grid = el('div', { className: 'cand-grid' });
    CATALOG.forEach((it) => {
      const c = el('div', { className: 'cand-card' });
      c.appendChild(el('div', { className: 'cand-role' }, `${it.icon} ${it.name}`));
      c.appendChild(el('span', { className: 'opt-desc' }, `Konfor +${it.comfort}${it.need ? ' · Bekleyen hastalar kullanır' : ''}`));
      c.appendChild(el('span', { className: 'shop-meta' }, money(it.cost)));
      const bb = el('button', { type: 'button', className: 'mini-btn' }, 'Yerleştir');
      bb.addEventListener('click', () => { enter(); startNew(it); });
      c.appendChild(bb);
      grid.appendChild(c);
    });
    list.appendChild(grid);
  }

  VH.panelTabs.push({ id: 'duzenle', label: '🛋️ Düzenle & Dekor', order: 30, render: renderTab });

  VH.build = {
    CATALOG, COMFORT,
    get active() { return state.active; },
    get state() { return state; },
    enter, exit, cancel, hover, click, rotate, sell, startNew, tryPlace, comfort, factor, drawOverlay, sanitize, renderTab,
    init() { applyLayout(); },
    // test yardımcıları
    _lockReason: lockReason,
    _place: (o, f, x, y, face, isNew) => { const r = tryPlace(o, f, x, y, face, isNew, true); if (r.ok) { if (isNew) recordDecor(); else recordMove(o, f); } return r; },
  };
})();
