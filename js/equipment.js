// Vita Hospital — Tıbbi ekipman yükseltme, yıpranma ve bakım
//
// Her ekipman kategorisinin 3 modeli vardır (Seviye 1 → 3). Yükseltme ilgili işlem sürelerini
// kısaltır, acil süresine ek saniye kazandırır ve cihazın görünümünü değiştirir (art.js sarmalayıcı).
// Cihazlar kullandıkça yıpranır (Durum %). %50'nin altında işlemler yavaşlar; Teknisyen
// kendiliğinden bakım yapar ya da Başhekim cihazın yanında "Bakım Yap" ile onarır.
(function () {
  const VH = (window.VH = window.VH || {});
  const UI = () => VH.ui, S = () => VH.cases.state, M = () => VH.map, E = () => VH.entities;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };

  // tags: acil stabilizasyonda kullanılan cihaz etiketleri; kinds: görsel olarak değişen nesneler
  const CATS = [
    { id: 'stretcher', icon: '🛏️', name: 'Acil Sedyeleri', kinds: ['gurney'], tags: ['gurney'], erBonus: [0, 4, 8], stab: [1, 0.9, 0.8],
      models: ['Standart Acil Sedyesi', 'Hidrolik Ayarlı Sedye', 'Akıllı Monitörlü Sedye'], costs: [0, 5000, 11000], rep: [0, 40, 60],
      effects: ['', 'Tüm acil stabilizasyonlar %10 hızlanır, acil süresi +4 sn.', 'Stabilizasyon %20 hızlanır, acil süresi +8 sn.'] },
    { id: 'monitor', icon: '💓', name: 'EKG & Hasta Monitörleri', kinds: ['monitor', 'defibrillator', 'ecg'], tags: ['monitor', 'defibrillator'], erBonus: [0, 6, 12], tagStab: [1, 0.85, 0.7],
      models: ['Temel Hasta Monitörü', '12 Kanallı EKG Monitörü', 'Telemetrik İzlem Sistemi'], costs: [0, 6000, 13000], rep: [0, 45, 65],
      effects: ['', 'Ritim hastalarında stabilizasyon %15 hızlı, acil süresi +6 sn.', 'Ritim hastalarında %30 hızlı, +12 sn; triyajda monitör ihtiyacı işaretlenir.'] },
    { id: 'ventilator', icon: '🫁', name: 'Oksijen & Ventilasyon', kinds: ['ventilator', 'oxygen'], tags: ['ventilator', 'oxygen'], tagStab: [1, 0.85, 0.7],
      models: ['Oksijen Tüpü & Temel Ventilatör', 'Yüksek Akışlı Oksijen Sistemi', 'Non-invaziv Ventilatör'], costs: [0, 5500, 12000], rep: [0, 40, 60],
      effects: ['', 'Solunum hastalarında stabilizasyon %15 hızlı.', 'Solunum hastalarında %30 hızlı; triyajda oksijen ihtiyacı işaretlenir.'] },
    { id: 'iv', icon: '💧', name: 'İnfüzyon (Serum) Sistemleri', kinds: ['iv_stand'], tags: ['iv'], tagStab: [1, 0.85, 0.7],
      models: ['Serum Askısı', 'Volumetrik İnfüzyon Pompası', 'Akıllı İnfüzyon Pompası'], costs: [0, 4500, 10000], rep: [0, 35, 55],
      effects: ['', 'Sıvı ihtiyacı olan hastalarda stabilizasyon %15 hızlı.', '%30 hızlı; triyajda sıvı ihtiyacı işaretlenir.'] },
    { id: 'lab', icon: '🧪', name: 'Laboratuvar Analizörleri', kinds: ['analyzer', 'centrifuge', 'microscope'], time: { labTime: [1, 0.8, 0.6] },
      models: ['Yarı Otomatik Analizör', 'Otomatik Biyokimya Analizörü', 'Tam Otomasyon Laboratuvar Hattı'], costs: [0, 7000, 15000], rep: [0, 40, 60],
      effects: ['', 'Kan alma ve tahlil süresi %20 kısalır.', 'Tahlil süresi %40 kısalır.'] },
    { id: 'exam', icon: '🩺', name: 'Muayene Masaları', kinds: ['exam_table'], time: { examTime: [1, 0.9, 0.8] }, casePatience: [0, 1, 2],
      models: ['Standart Muayene Masası', 'Ergonomik Muayene Masası', 'Dijital Muayene Seti'], costs: [0, 4000, 9000], rep: [0, 30, 50],
      effects: ['', 'Muayene %10 kısalır, vaka hastasının sabrı +1 soru.', 'Muayene %20 kısalır, vaka sabrı +2 soru.'] },
    { id: 'pharmacy', icon: '💊', name: 'Eczane Otomasyonu', kinds: ['med_cabinet', 'pharmacy_shelf'], tagKinds: ['pharmacy_counter'], time: { pharmacyWait: [1, 0.85, 0.7] }, autoBonus: [0, 100, 200],
      models: ['Manuel Raf Sistemi', 'Barkodlu Stok Sistemi', 'Robotik Eczane'], costs: [0, 4000, 9000], rep: [0, 30, 50],
      effects: ['', 'Eczane teslimi %15 hızlı, otomatik teslimde +₺100.', 'Teslim %30 hızlı, otomatik teslimde +₺200.'] },
    { id: 'imaging', icon: '📡', name: 'Röntgen, MR & İleri Tanı', kinds: ['xray', 'ultrasound', 'ct_scanner', 'mri'], needs: 'radiology', testsBonus: [0, 500, 1000], scan: [1, 1.3, 1.6],
      models: ['Röntgen, Ultrason & 1,5T MR', 'Dijital Röntgen + Hızlı MR', 'BT Tarayıcı + 3T MR'], costs: [0, 9000, 20000], rep: [0, 50, 70], floor: 3,
      effects: ['', 'Tetkik kararlarında +₺500; görüntüleme mini oyununda tarama penceresi %30 geniş.', 'Ek +₺1.000, pencere %60 geniş; Radyoloji katına BT tarayıcı kurulur.'] },
    { id: 'surgery', icon: '🩻', name: 'Ameliyathane Ekipmanı', kinds: ['or_table', 'surgical_lamp', 'anesthesia'], needs: 'surgery', surg: [1, 1.25, 1.5], reward: [1, 1.2, 1.4],
      models: ['Standart Ameliyat Masası', 'Hibrit Ameliyathane Seti', 'Robot Destekli Ameliyathane'], costs: [0, 12000, 26000], rep: [0, 60, 75], floor: 1,
      effects: ['', 'Cerrahi mini oyunlarda başarı aralıkları %25 geniş, ameliyat ödülü +%20.', 'Aralıklar %50 geniş, ödül +%40; cerrahın otomatik ameliyat puanı artar.'] },
  ];
  const byId = (id) => CATS.find((c) => c.id === id);

  const data = () => {
    const st = S();
    st.equip = st.equip || {};
    CATS.forEach((c) => { if (!st.equip[c.id]) st.equip[c.id] = { lvl: 1, cond: 100, broken: false }; });
    return st.equip;
  };
  const lvl = (id) => data()[id].lvl;
  const cond = (id) => data()[id].cond;
  const broken = (id) => !!data()[id].broken;
  const wearMult = (id) => (broken(id) ? 1.8 : cond(id) >= 50 ? 1 : 1 + (50 - cond(id)) / 100);
  const partCost = (id) => 1500 + 600 * lvl(id);
  const catOfTag = (tag) => CATS.find((c) => (c.tags || []).includes(tag));

  // ---------------------------------------------------------------- Etkiler
  function factor(k) {
    let f = 1;
    for (const c of CATS) {
      if (c.time && c.time[k]) f *= c.time[k][lvl(c.id) - 1] * wearMult(c.id);
    }
    if (k === 'stabTime') f *= byId('stretcher').stab[lvl('stretcher') - 1];
    return f;
  }
  /** Stabilizasyon süresine cihaz etiketine özel çarpan (seviye + yıpranma). */
  function stabFactor(tag) {
    const c = catOfTag(tag);
    let f = wearMult('stretcher');
    if (c && c.tagStab) f *= c.tagStab[lvl(c.id) - 1] * wearMult(c.id);
    return f;
  }
  const erBonus = () => CATS.reduce((s, c) => s + (c.erBonus ? c.erBonus[lvl(c.id) - 1] : 0), 0);
  const casePatienceBonus = () => byId('exam').casePatience[lvl('exam') - 1];
  const imagingBonus = () => (S().services && S().services.radiology ? byId('imaging').testsBonus[lvl('imaging') - 1] : 0);
  const pharmacyBonus = () => byId('pharmacy').autoBonus[lvl('pharmacy') - 1];
  /** Triyajda ihtiyaç ipucu (Seviye 3 monitör/oksijen/infüzyon). */
  function triageHint(need) {
    const map = { monitor: 'monitor', oxygen: 'ventilator', iv: 'iv' };
    return map[need] && lvl(map[need]) >= 3;
  }

  function wear(id, amount) {
    const d = data()[id];
    if (!d) return;
    const before = d.cond;
    d.cond = clamp(d.cond - amount, 0, 100);
    if (before >= 50 && d.cond < 50) UI().toast(`🔧 ${byId(id).name} yıprandı (%${Math.round(d.cond)}): işlemler yavaşlıyor. Bakım yapın ya da teknisyen alın.`, 3600);
    // Arıza: durum sıfırlanınca ya da çok düşükken rastgele bozulur; onarım için yedek parça gerekir
    if (!d.broken && (d.cond <= 0 || (d.cond < 18 && Math.random() < 0.25))) {
      d.broken = true;
      sound('alarm');
      if (VH.notify) VH.notify('⚠️', `ARIZA: ${byId(id).name}. Terminalden yedek parça sipariş edin; teslimattan sonra teknisyen onarır.`, byId(id).floor || 0, 'broken');
      if (VH.emit) VH.emit('breakdown', { id });
    }
  }
  /** Arızalı cihazı yedek parçayla onar (teknisyen ya da Başhekim). */
  function fixBroken(id, silent) {
    const d = data()[id];
    if (!d.broken) return false;
    if (!VH.logistics || !VH.logistics.useParts(id)) { if (!silent) UI().toast('Yedek parça yok: önce terminalden sipariş verin.', 2400); return false; }
    d.broken = false; d.cond = Math.max(d.cond, 70);
    sound('success');
    UI().toast(`🔧 ${byId(id).name} onarıldı.`, 2200);
    if (VH.emit) VH.emit('repair', { id, fixed: true });
    persist();
    return true;
  }
  function repair(id, amount, silent) {
    const d = data()[id];
    if (d.broken) { fixBroken(id, silent); return; }
    d.cond = clamp(d.cond + amount, 0, 100);
    if (!silent) sound('ok');
    if (VH.emit) VH.emit('repair', { id });
  }
  const repairCost = (id) => Math.round((100 - cond(id)) * 12);
  function payRepair(id) {
    const cost = repairCost(id);
    if (broken(id)) { fixBroken(id); return; }
    if (cost <= 0) return;
    if (S().budget < cost || S().budget <= 0) { UI().toast('Bütçe yetersiz', 1800); return; }
    S().budget -= cost;
    repair(id, 100);
    UI().toast(`🔧 ${byId(id).name} bakımı yapıldı (${money(cost)})`, 2200);
    persist();
  }
  /** Teknisyen için en yıpranmış zemin kat cihazı. */
  function needsRepair() {
    let best = null;
    for (const c of CATS) {
      if (c.floor) continue;
      if (broken(c.id)) { if (VH.logistics && VH.logistics.parts[c.id]) { best = c; break; } continue; }
      if (cond(c.id) >= 80) continue;
      if (!best || cond(c.id) < cond(best.id)) best = c;
    }
    if (!best) return null;
    const obj = M().floorObjects(0).find((o) => best.kinds.includes(o.k) || (best.tagKinds && best.tagKinds.includes(o.tag)));
    return obj ? { cat: best.id, obj } : null;
  }

  function upgrade(id) {
    const c = byId(id), L = lvl(id);
    if (L >= 3) return false;
    const cost = c.costs[L], rep = c.rep[L];
    if (c.needs && !(S().services && S().services[c.needs])) { UI().toast(c.needs === 'surgery' ? 'Önce Cerrahi katını açın' : 'Önce Radyoloji katını açın', 2000); return false; }
    if (S().reputation < rep) { UI().toast(`İtibar ${rep} gerekli`, 2000); return false; }
    if (S().budget < cost || S().budget <= 0) { UI().toast('Bütçe yetersiz', 1800); return false; }
    S().budget -= cost;
    data()[id].lvl = L + 1;
    data()[id].broken = false;
    data()[id].cond = 100;
    applyVisuals();
    sound('success');
    UI().toast(`⬆️ ${c.name}: ${c.models[L]} kuruldu!`, 2800);
    if (VH.emit) VH.emit('equipUp', { id, lvl: L + 1 });
    persist();
    return true;
  }

  // ---------------------------------------------------------------- Görsel seviye farkı
  const LEVEL_COL = ['#9aa7b0', '#2ec4b6', '#f2c94c'];
  function extras(kind, k) {
    const L = k.o.lvl || 1;
    // Prestij: Altın Cihaz Teması — tüm cihazlarda altın kaide şeridi ve parıltı
    if (VH.vip && VH.vip.theme === 'gold') {
      k.box(0.06, 0.06, k.W - 0.06, 0.12, 0, 3.5, '#e6c66e', { edge: false });
      k.custom(k.W / 2, 0.5, 2, (c, sx, sy) => { c.fillStyle = 'rgba(255,215,110,0.35)'; c.beginPath(); c.ellipse(sx, sy, 14, 6, 0, 0, Math.PI * 2); c.fill(); });
    }
    if (L < 2) return;
    const W = k.W, col = LEVEL_COL[L - 1];
    switch (kind) {
      case 'gurney':
        k.box(0.2, 0.3, W - 0.46, 0.7, 18, 19.5, L >= 3 ? '#1f7a8c' : '#2ec4b6', { edge: false });
        k.box(0.2, 0.2, W - 0.2, 0.23, 22, 24, col); k.box(0.2, 0.77, W - 0.2, 0.8, 22, 24, col);
        // Sv.2: hidrolik kolonlu, yan korkuluklu sedye
        k.cyl(W / 2, 0.5, 3.5, 2, 12, '#9aa7b0');
        k.box(0.2, 0.18, W - 0.2, 0.21, 19, 26, col); k.box(0.2, 0.79, W - 0.2, 0.82, 19, 26, col);
        if (L >= 3) {
          // Sv.3: akıllı yoğun bakım yatağı — başucu ritim monitörü, serum askısı, ayak ucunda dijital kontrol paneli
          k.pole(0.18, 0.24, 18, 44, 2, '#6f7d87'); k.box(0.08, 0.18, 0.34, 0.26, 40, 52, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 42, 50, '#062a22')] }); k.custom(0.21, 0.26, 46, (c, sx, sy) => VH.art.ecgLine(c, sx, sy, 5));
          k.pole(0.12, 0.85, 0, 50, 1.6, '#c9d1d6');
          k.box(0.06, 0.8, 0.18, 0.9, 40, 49, 'rgba(200,232,250,0.95)', { edge: false });
          k.line(0.12, 0.85, 40, 0.4, 0.6, 22, 0.8, 'rgba(127,184,230,0.9)');
          k.box(W - 0.22, 0.32, W - 0.12, 0.68, 14, 26, '#e9eef1', { deco: [VH.art.screenDeco('E', 0.12, 0.88, 17, 24, '#0b3a5a'), VH.art.screenDeco('W', 0.12, 0.88, 17, 24, '#0b3a5a')] });
        }
        break;
      case 'monitor': case 'ecg': case 'defibrillator':
        k.box(0.62, 0.44, 0.94, 0.54, 30, 44, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 32, 42, '#0b3a5a')] });
        k.custom(0.78, 0.54, 37, (c, sx, sy) => { c.strokeStyle = '#5fd0ff'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo(sx - 5 + i * 1.25, sy + Math.sin(performance.now() / 200 + i) * 1.8); c.stroke(); });
        if (L >= 3) { k.pole(0.3, 0.45, 52, 62, 1.2, '#9aa7b0'); k.ball(0.3, 0.45, 63, 2, Math.floor(performance.now() / 500) % 2 ? '#5ff0d8' : '#1d6f86'); }
        break;
      case 'ventilator': case 'oxygen':
        k.box(0.15, 0.25, 0.85, 0.32, 4, 8, col);
        if (L >= 3) k.box(0.3, 0.45, 0.7, 0.52, 46, 56, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 48, 54, '#062a22')] });
        break;
      case 'iv_stand':
        k.box(0.42, 0.44, 0.62, 0.56, 28, 40, '#eef2f4', { deco: [VH.art.screenDeco('S', 0.15, 0.85, 33, 38, '#0b3a5a')] });
        if (L >= 3) k.box(0.42, 0.44, 0.62, 0.56, 16, 26, '#eef2f4', { deco: [VH.art.screenDeco('S', 0.15, 0.85, 20, 24, '#0b3a5a')] });
        break;
      case 'analyzer': case 'centrifuge': case 'microscope':
        k.box(0.05, 0.1, 0.95, 0.18, 0, 6, col);
        if (kind === 'analyzer') {
          // Sv.2: çift ekranlı ünite
          k.box(W - 0.42, 0.14, W - 0.1, 0.2, 44, 60, '#1b2329', { deco: [VH.art.screenDeco('S', 0.08, 0.92, 46, 58, '#0b3a5a')] });
          k.custom(W - 0.26, 0.2, 52, (c, sx, sy) => { c.fillStyle = '#5ff0d8'; for (let i = 0; i < 3; i++) c.fillRect(sx - 6, sy - 4 + i * 3, 4 + i * 3, 1.4); });
          if (L >= 3) {
            // Sv.3: cam kabinli tam otomatik analiz hattı — tüp taşıma rayı ve yanıp sönen LED şerit
            const t = performance.now();
            k.box(0.04, 0.92, W - 0.04, 1.02, 0, 30, '#c9d1d6');
            k.box(0.04, 0.9, W - 0.04, 1.04, 30, 31.5, '#7e8d96');
            const n = Math.round(W * 6), off = (t / 1600) % 1;
            for (let i = 0; i < n; i++) { const u = 0.08 + ((i + off) / n) * (W - 0.16); k.box(u - 0.025, 0.95, u + 0.025, 0.99, 31.5, 38, 'rgba(235,242,246,0.95)', { top: ['#d62828', '#8e44ad', '#2f78b3', '#2f9e44', '#f2c94c'][i % 5], edge: false }); }
            k.box(0.02, 0.06, W - 0.02, 0.94, 0, 62, 'rgba(160,210,235,0.16)', { top: 'rgba(160,210,235,0.22)', edge: false });
            for (let i = 0; i < 8; i++) { const on = Math.floor(t / 250 + i) % 3 !== 0; k.box(0.1 + i * (W - 0.2) / 8, 0.93, 0.14 + i * (W - 0.2) / 8, 0.95, 58, 61, on ? '#46c46a' : '#164a2a', { edge: false }); }
          }
        }
        break;
      case 'exam_table':
        k.box(W - 0.45, 0.28, W - 0.15, 0.72, 25, 27, col);
        k.box(0.3, 0.3, W - 0.55, 0.7, 21.6, 22.2, '#ffffff', { edge: false });
        if (L >= 3) {
          // Sv.3: bilgisayar monitörü, duvar tipi dijital tanı seti (otoskop/oftalmoskop) ve modern buzlu cam paravan
          k.pole(0.15, 0.25, 0, 46, 2, '#6f7d87'); k.box(0.05, 0.2, 0.35, 0.28, 42, 56, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 44, 54, '#0f5e66')] });
          k.box(W - 0.5, 0.02, W - 0.1, 0.08, 36, 48, '#e9eef1', { deco: [VH.art.screenDeco('S', 0.08, 0.5, 39, 45, '#0b3a5a'), { dir: 'S', u0: 0.6, u1: 0.68, z0: 38, z1: 46, color: '#2b333b', raw: true }, { dir: 'S', u0: 0.78, u1: 0.86, z0: 38, z1: 46, color: '#2b333b', raw: true }] });
          k.box(-0.05, 0.85, W * 0.6, 0.9, 0, 44, 'rgba(210,232,242,0.55)', { top: '#c9d1d6', edge: false, deco: [{ dir: '*', u0: 0, u1: 1, z0: 40, z1: 44, color: '#c9d1d6', raw: true }, { dir: '*', u0: 0, u1: 1, z0: 0, z1: 3, color: '#9aa7b0', raw: true }] });
        }
        break;
      case 'or_table': case 'anesthesia': case 'surgical_lamp':
        k.box(0.1, 0.1, 0.9, 0.18, 0, 4, col);
        if (L >= 3 && kind === 'or_table') { k.pole(0.9, 0.2, 0, 50, 3, '#9aa7b0'); k.line(0.9, 0.2, 50, 0.55, 0.5, 34, 3, '#9aa7b0'); k.box(0.45, 0.4, 0.65, 0.6, 28, 34, '#eef2f4'); }
        if (L >= 2 && kind === 'anesthesia') k.box(0.25, 0.4, 0.75, 0.48, 46, 58, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 48, 56, '#0f5e66')] });
        break;
      case 'mri':
        k.box(0.1, 0.1, 1.6, 0.2, 54, 60, col);
        break;
      case 'xray': case 'ultrasound':
        k.box(0.05, 0.05, 0.3, 0.15, 30, 46, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 32, 44, '#0b3a5a')] });
        break;
      case 'med_cabinet': case 'pharmacy_shelf':
        k.box(0.15, 0.85, 0.85, 0.92, 2, 6, col);
        if (L >= 3 && kind === 'pharmacy_shelf') {
          // Sv.3: rafların yanında camlı otomatik ilaç dağıtım robotu (kartezyen kol + teslim haznesi)
          const u0 = W + 0.02, u1 = W + 0.95;
          k.box(u0, 0.05, u1, 0.6, 0, 6, '#5d6a74');
          k.box(u0, 0.05, u1, 0.6, 6, 70, 'rgba(160,210,235,0.22)', { top: '#c9d1d6', edge: false });
          for (const u of [u0, u1]) for (const v of [0.05, 0.6]) k.box(u - 0.02, v - 0.02, u + 0.02, v + 0.02, 0, 70, '#9aa7b0');
          for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) k.box(u0 + 0.08 + i * 0.2, 0.08, u0 + 0.22 + i * 0.2, 0.14, 12 + r * 13, 18 + r * 13, ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][(i + r) % 4], { edge: false });
          k.box(u0 + 0.05, 0.3, u1 - 0.05, 0.34, 46, 48, '#7e8d96');
          k.box(u0 + 0.4, 0.26, u0 + 0.52, 0.38, 30, 46, '#2ec4b6');
          k.box(u0 + 0.36, 0.24, u0 + 0.56, 0.4, 27, 30, '#2b333b');
          k.box(u0 + 0.25, 0.55, u0 + 0.7, 0.62, 10, 20, '#173447', { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 12, z1: 18, color: '#5ff0d8', raw: true }] });
        }
        break;
      case 'counter': case 'pharmacy_counter':
        if (k.o.tag === 'pharmacy_counter') {
          k.box(0.2, 0.35, 0.45, 0.5, 29, 40, '#1b2329', { deco: [VH.art.screenDeco('S', 0.1, 0.9, 29, 36, '#0f5e66')] });
          k.box(0.6, 0.5, 0.75, 0.6, 29, 33, '#f2c94c');
          if (L >= 3) k.box(W - 0.3, 0.3, W - 0.05, 0.42, 29, 48, '#c9d1d6', { deco: [{ dir: '*', u0: 0.1, u1: 0.9, z0: 40, z1: 43, color: '#2ec4b6', raw: true }] });
        }
        break;
      default: break;
    }
    // Seviye yıldız ışığı
    k.custom(0.5, 0.5, 2, (c, sx, sy) => { c.fillStyle = col; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(sx, sy + 1, 4, 2, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; });
  }
  function wrapArt() {
    const kinds = new Set(['counter', 'pharmacy_counter']);
    CATS.forEach((c) => c.kinds.forEach((k) => kinds.add(k)));
    kinds.forEach((kind) => {
      const orig = VH.art.get(kind);
      if (!orig || orig._lv) return;
      const fn = (k) => { orig(k); extras(kind, k); };
      fn._lv = true;
      fn._src = String(orig) + (orig._src || ""); // sprite önbelleği: iç çizimin canlılığı korunur
      VH.art.register(kind, fn, VH.art.isFlat(kind));
    });
  }
  function applyVisuals() {
    M().FLOOR_DEFS.forEach((def, f) => def.objects.forEach((o) => {
      const c = CATS.find((cc) => cc.kinds.includes(o.k) || (cc.tagKinds && cc.tagKinds.includes(o.tag)));
      if (c) o.lvl = lvl(c.id);
    }));
    // BT tarayıcı (Seviye 3 görüntüleme) radyoloji katına kurulur
    const rad = M().FLOOR_DEFS[3];
    const has = rad.objects.some((o) => o.k === 'ct_scanner');
    if (lvl('imaging') >= 3 && !has) {
      rad.objects.push({ k: 'ct_scanner', x: 18, y: 4, w: 2, h: 2, tag: 'ct', lvl: 3 });
      M().rebuild(3);
      if (E().buildDevices) E().buildDevices();
    }
  }

  // ---------------------------------------------------------------- Bakım hedefleri ve simgeleri
  function catOfObj(o) { return CATS.find((c) => c.kinds.includes(o.k) || (c.tagKinds && c.tagKinds.includes(o.tag))); }
  function targets(player) {
    const out = [];
    const objs = M().floorObjects(player.floor);
    const seen = new Set();
    for (const o of objs) {
      const c = catOfObj(o);
      if (!c || seen.has(c.id) || (cond(c.id) >= 60 && !broken(c.id))) continue;
      const d = E().rectDist(player.x, player.y, { x0: o.x, y0: o.y, x1: o.x + (o.w || 1), y1: o.y + (o.h || 1) });
      if (d > 1.15) continue;
      seen.add(c.id);
      if (broken(c.id)) {
        const hasPart = VH.logistics && VH.logistics.parts[c.id];
        out.push({ type: 'repair', name: `${c.name} · ARIZALI`, action: hasPart ? '🔧 Arızayı Onar (parça hazır)' : '⚠️ Arızalı: parça gerekli', x: o.x + 0.5, y: o.y + 0.5, dist: d + 0.5, cat: c.id,
          handler: (t) => { if (hasPart) fixBroken(t.cat); else if (VH.terminal) VH.terminal.open('bakim'); } });
        continue;
      }
      out.push({ type: 'repair', name: `${c.name} · %${Math.round(cond(c.id))}`, action: `🔧 Bakım Yap ${money(repairCost(c.id))}`, x: o.x + 0.5, y: o.y + 0.5, dist: d + 0.6, cat: c.id, handler: (t) => payRepair(t.cat) });
    }
    return out;
  }
  function drawOverlay(ctx, vw, vh) {
    const cam = M().camera, now = performance.now();
    // Onarım animasyonu: işi başındaki teknisyenin elinden kıvılcımlar
    for (const s of E().staff) {
      if (!s.task || s.task.kind !== 'repair' || s.path.length || s.floor !== E().player.floor || VH.lod) continue;
      const [ix, iy] = M().worldToIso(s.x, s.y);
      const [sx, sy] = cam.toScreen(ix, iy - 22, vw, vh);
      // anahtar simgesi ve ilerleme çubuğu
      if (s.task.t0 === undefined) s.task.t0 = Math.max(0.5, s.task.t || 3);
      const pr = Math.max(0, Math.min(1, 1 - (s.task.t || 0) / s.task.t0));
      ctx.fillStyle = "rgba(10,20,30,0.75)"; ctx.fillRect(sx - 17, sy - 40, 34, 6);
      ctx.fillStyle = "#2ec4b6"; ctx.fillRect(sx - 16, sy - 39, 32 * pr, 4);
      ctx.save(); ctx.translate(sx, sy - 50); ctx.rotate(Math.sin(now / 140) * 0.5);
      ctx.font = "13px system-ui, \"Segoe UI Emoji\", sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🔧", 0, 0);
      ctx.restore();
      for (let i = 0; i < 7; i++) {
        const p = ((now / 420) + i / 7) % 1, a = i * 2.4 + now / 300;
        ctx.fillStyle = `rgba(255,${200 - i * 12},80,${1 - p})`;
        ctx.fillRect(sx + 9 + Math.cos(a) * p * 16, sy + Math.sin(a) * p * 10 - p * 6, 2, 2);
      }
    }
    const bad = new Set(CATS.filter((c) => cond(c.id) < 50 || broken(c.id)).map((c) => c.id));
    if (!bad.size) return;
    const shown = new Set();
    ctx.font = '13px system-ui, "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const o of M().floorObjects(E().player.floor)) {
      const c = catOfObj(o);
      if (!c || !bad.has(c.id) || shown.has(o)) continue;
      shown.add(o);
      const [ix, iy] = M().worldToIso(o.x + (o.w || 1) / 2, o.y + (o.h || 1) / 2);
      const [sx, sy] = cam.toScreen(ix, iy - 58, vw, vh);
      if (sx < -20 || sy < -20 || sx > vw + 20 || sy > vh + 20) continue;
      const b = Math.sin(now / 260) * 2;
      ctx.fillStyle = broken(c.id) || cond(c.id) < 25 ? 'rgba(229,72,77,0.92)' : 'rgba(242,169,59,0.92)';
      ctx.beginPath(); ctx.arc(sx, sy + b, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(broken(c.id) ? '⚠️' : '🔧', sx, sy + b + 1);
    }
  }

  // ---------------------------------------------------------------- Panel sekmesi
  function renderTab(list, rerender) {
    list.appendChild(el('p', { className: 'muted' }, 'Ekipman modelini yükselterek işlemleri hızlandırın. Cihazlar kullandıkça yıpranır; %50 altında işler yavaşlar. Teknisyen alırsanız bakımı kendisi yapar.'));
    CATS.forEach((c) => {
      const L = lvl(c.id), d = data()[c.id];
      const card = el('div', { className: 'equip-card' });
      const head = el('div', { className: 'eq-head' });
      head.appendChild(el('span', { className: 'shop-icon' }, c.icon));
      const t = el('div', { className: 'shop-body' });
      t.appendChild(el('strong', {}, c.name));
      t.appendChild(el('span', { className: 'muted' }, `Kurulu model: ${c.models[L - 1]}`));
      head.appendChild(t);
      head.appendChild(el('span', { className: 'eq-lvl lv' + L }, `Sv. ${L}/3`));
      card.appendChild(head);
      const steps = el('div', { className: 'eq-steps' });
      c.models.forEach((m, i) => steps.appendChild(el('span', { className: 'eq-step' + (i < L ? ' on' : '') }, `${i + 1}. ${m}`)));
      card.appendChild(steps);
      const condRow = el('div', { className: 'mini-bar' });
      condRow.appendChild(el('span', { className: 'mb-label' }, `Durum %${Math.round(d.cond)}`));
      const tr = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
      fill.style.width = d.cond + '%'; fill.style.background = d.cond > 60 ? '#46c46a' : d.cond > 30 ? '#f2c94c' : '#ff5a5f';
      tr.appendChild(fill); condRow.appendChild(tr);
      card.appendChild(condRow);
      const acts = el('div', { className: 'sc-acts' });
      if (L < 3) {
        acts.appendChild(el('span', { className: 'opt-desc eq-next' }, `Sonraki: ${c.models[L]} · ${c.effects[L]}`));
        const locked = c.needs && !(S().services && S().services[c.needs]);
        const why = locked ? (c.needs === 'surgery' ? 'Cerrahi katı gerekli' : 'Radyoloji katı gerekli') : S().budget <= 0 ? 'Bütçe ekside' : S().reputation < c.rep[L] ? `İtibar ${c.rep[L]} gerekli` : S().budget < c.costs[L] ? 'Bütçe yetersiz' : null;
        const b = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why || `⬆️ Yükselt ${money(c.costs[L])}`);
        b.disabled = !!why;
        b.addEventListener('click', () => { upgrade(c.id); rerender(); });
        acts.appendChild(b);
      } else acts.appendChild(el('span', { className: 'opt-desc eq-next' }, '✓ En üst model kurulu'));
      if (d.broken) {
        acts.appendChild(el('span', { className: 'pill', style: 'background:rgba(229,72,77,.35)' }, `⚠️ Arızalı · stokta parça: ${(VH.logistics && VH.logistics.parts[c.id]) || 0}`));
      } else if (d.cond < 100) {
        const rb = el('button', { type: 'button', className: 'mini-btn' }, `🔧 Bakım ${money(repairCost(c.id))}`);
        rb.disabled = S().budget < repairCost(c.id);
        rb.addEventListener('click', () => { payRepair(c.id); rerender(); });
        acts.appendChild(rb);
      }
      card.appendChild(acts);
      list.appendChild(card);
    });
  }

  // ---------------------------------------------------------------- Bakım & Parça (terminal uygulaması)
  function renderParts(list, rerender) {
    const can = VH.logistics ? VH.logistics.deskGate(list) : true;
    const techs = VH.staff ? VH.staff.hired.filter((h) => h.role === 'tech').length : 0;
    list.appendChild(el('p', { className: 'muted' }, `Arızalı cihazlar yedek parça olmadan onarılamaz. Parça lojistik aracıyla gelir; ${techs ? techs + ' teknisyeniniz onarımı kendiliğinden yapar.' : 'teknisyen yoksa cihazın yanına gidip "Arızayı Onar" seçin.'}`));
    CATS.forEach((c) => {
      const d = data()[c.id];
      const row = el('div', { className: 'stock-row' + (d.broken ? ' low' : '') });
      row.appendChild(el('span', { className: 'shop-icon' }, c.icon));
      const body = el('div', { className: 'shop-body' });
      body.appendChild(el('strong', {}, c.name + (d.broken ? ' · ⚠️ ARIZALI' : '')));
      const tr = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
      fill.style.width = d.cond + '%'; fill.style.background = d.broken ? '#ff5a5f' : d.cond > 60 ? '#46c46a' : d.cond > 30 ? '#f2c94c' : '#ff5a5f';
      tr.appendChild(fill); body.appendChild(tr);
      body.appendChild(el('span', { className: 'shop-meta' }, `Durum %${Math.round(d.cond)} · Depoda parça: ${(VH.logistics && VH.logistics.parts[c.id]) || 0} · Parça ${money(partCost(c.id))}`));
      row.appendChild(body);
      const acts = el('div', { className: 'sc-acts' });
      const ob = el('button', { type: 'button', className: 'mini-btn' }, '🔩 Parça sipariş et');
      ob.disabled = !can || S().budget < partCost(c.id) || S().budget <= 0;
      ob.addEventListener('click', () => { if (VH.logistics) VH.logistics.orderPart(c.id, partCost(c.id)); rerender(); });
      acts.appendChild(ob);
      if (!d.broken && d.cond < 100) { const mb = el('button', { type: 'button', className: 'mini-btn' }, `🔧 Bakım ${money(repairCost(c.id))}`); mb.disabled = S().budget < repairCost(c.id) || S().budget <= 0; mb.addEventListener('click', () => { payRepair(c.id); rerender(); }); acts.appendChild(mb); }
      row.appendChild(acts);
      list.appendChild(row);
    });
  }

  function sanitize(d) {
    const out = {};
    CATS.forEach((c) => {
      const v = d && d[c.id];
      const L = v && typeof v.lvl === 'number' ? Math.round(clamp(v.lvl, 1, 3)) : 1;
      const C = v && typeof v.cond === 'number' && isFinite(v.cond) ? clamp(v.cond, 0, 100) : 100;
      out[c.id] = { lvl: L, cond: C, broken: !!(v && v.broken === true) };
    });
    return out;
  }

  // ---------------------------------------------------------------- Olay dinleyicileri
  VH.on('deviceUse', (d) => { const c = catOfTag(d.tag); if (c) wear(c.id, 6); wear('stretcher', 3); });
  VH.on('examDone', () => wear('exam', 1.5));
  VH.on('labDone', () => wear('lab', 2.2));
  VH.on('pharmacyAuto', () => wear('pharmacy', 1.2));
  VH.on('counsel', () => wear('pharmacy', 1));
  VH.on('caseSolved', (d) => { if (d.choice === 'tests') wear('imaging', 4); });

  VH.panelTabs.push({ id: 'ekipman', label: '🔧 Ekipman', order: 20, render: renderTab });
  VH.panelTabs.push({ id: 'bakim', label: '🔩 Bakım & Parça', order: 21, render: renderParts });
  VH.targetProviders.push(targets);

  VH.equipment = {
    CATS, factor, stabFactor, erBonus, casePatienceBonus, imagingBonus, pharmacyBonus, triageHint,
    lvl, cond, wear, repair, repairCost, payRepair, upgrade, needsRepair, sanitize, drawOverlay, renderTab, renderParts,
    broken, fixBroken, partCost,
    surgTolerance: () => byId('surgery').surg[lvl('surgery') - 1] * (broken('surgery') ? 0.7 : 1),
    surgReward: () => byId('surgery').reward[lvl('surgery') - 1],
    scanWindow: () => byId('imaging').scan[lvl('imaging') - 1] * (broken('imaging') ? 0.7 : 1),
    avgCondition: () => CATS.reduce((s, c) => s + cond(c.id), 0) / CATS.length,
    init() { data(); wrapArt(); applyVisuals(); },
  };
})();
