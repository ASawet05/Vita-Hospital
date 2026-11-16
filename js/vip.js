// Vita Hospital — Prestij sistemleri (v9)
//
//  💎 Elmas ekonomisi: kariyer hedefleri, hava ambulansı kurtarmaları, gizemli vakalar ve lig ödülleriyle kazanılır;
//     VitaOS "Prestij Mağazası"nda harcanır (VIP kadro, lüks konfor, altın cihaz teması, anında lojistik,
//     helikopter pisti, temizlik robotları, dezenfektan istasyonları, B1 espresso barı ve masaj koltukları).
//  🚁 Helikopter pisti: bahçeye inşa edilir; inen hava ambulansı 90 sn'lik "Altın Saat" VIP travma vakası getirir.
//     Peş peşe iki mini oyun (defibrilatör + damar yolu) tamamlanınca elmas ve prestij kazanılır.
//  🔍 Gizemli vaka: belirsiz semptomlarla gelen hasta; tahlil + görüntüleme bulgularıyla Teşhis Panosunda 3 olası
//     tanıdan doğrusu seçilirse 3x ödül.
//  🎓 Personel Akademisi, 🏆 Şehir Sağlık Ligi ve 🎯 Kariyer Hedefleri VitaOS uygulamalarıdır.
//  🤖 Temizlik robotları ve 🧴 dezenfektan istasyonları hijyeni (müfettiş puanını) artırır.
// Tüm grafikler koddan çizilir. Ekranlarda kaynakça gösterilmez.
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, M = () => VH.map, H = () => VH.hospital, S = () => VH.cases.state, UI = () => VH.ui;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const sound = (k) => { try { if (VH.audio) VH.audio.play(k); } catch (_) { /* ses yok */ } };
  const persist = () => { if (VH.save) VH.save.save(); };
  const notify = (i, t, f, k, g) => { if (VH.notify) VH.notify(i, t, f, k, g); };
  const bump = (k, n) => { if (VH.progress && VH.progress.bump) VH.progress.bump(k, n); };
  const counters = () => (VH.progress && VH.progress.counters) || {};
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ================================================================ Durum
  const fresh = () => ({ gems: 10, gemsTotal: 10, owned: {}, sanitizers: 0, robots: 0, claimed: {}, academy: {}, league: null, title: false, mysteryNext: 150, heliNext: 45 });
  function data() { const st = S(); st.vip = st.vip || fresh(); return st.vip; }
  function addGems(n, why) {
    const d = data();
    d.gems += n; if (n > 0) d.gemsTotal += n;
    if (n > 0) { UI().toast(`💎 +${n} elmas${why ? ' · ' + why : ''}`, 2400); const P = E().player; if (E().floatText) E().floatText(P.x, P.y, P.floor, `+${n}💎`, '#7fd8ff', 0); }
  }
  const owns = (id) => !!data().owned[id];

  // ================================================================ Prestij Mağazası
  const SHOP = [
    { id: 'vipDoctor', icon: '🧑‍⚕️', name: 'VIP Uzman Kadro (Prof. Dr.)', desc: 'Muayene ve tahlil süreleri %15 kısalır.', gems: 30, cash: 0, once: true },
    { id: 'luxDecor', icon: '🛋️', name: 'Lüks Konfor Dekorasyonu', desc: 'Premium bekleme koltukları ve sanat eserleri: hasta sabrı %15 daha yavaş azalır.', gems: 20, cash: 10000, once: true },
    { id: 'goldTheme', icon: '✨', name: 'Altın Cihaz Teması', desc: 'Tüm tıbbi cihazlara altın şerit ve parıltı (özel prestij teması).', gems: 15, cash: 0, once: true },
    { id: 'instant', icon: '⚡', name: 'Anında Lojistik Teslimatı', desc: 'Bekleyen ilaç/parça siparişini beklemeden yola çıkarır.', gems: 5, cash: 0 },
    { id: 'helipad', icon: '🚁', name: 'Helikopter Pisti (Hava Ambulansı)', desc: 'Bahçeye helikopter pisti: 90 sn "Altın Saat" VIP travma vakaları getirir.', gems: 25, cash: 60000, once: true },
    { id: 'robot', icon: '🤖', name: 'Otonom Temizlik Robotu', desc: 'Koridorlarda dolaşıp çöpleri toplar; hijyen +3 (en fazla 3).', gems: 8, cash: 6000, max: 3, count: 'robots' },
    { id: 'sanitizer', icon: '🧴', name: 'Sensörlü El Dezenfektanı İstasyonu', desc: 'Koridora yerleştirilir; hijyen +4, müfettiş puanı artar (en fazla 6).', gems: 0, cash: 1500, max: 6, count: 'sanitizers' },
    { id: 'espresso', icon: '☕', name: 'B1 Espresso Barı', desc: 'Personel nöbet sonunda +20 enerji toplar; başhekim kahvesi daha güçlü.', gems: 0, cash: 6000, once: true },
    { id: 'massage', icon: '💆', name: 'B1 Masaj Koltukları', desc: 'Nöbet sonunda personel enerjisi +25, moral +5.', gems: 4, cash: 9000, once: true },
  ];
  function canBuy(it) {
    const d = data();
    if (it.once && d.owned[it.id]) return 'Sahipsiniz';
    if (it.max && (d[it.count] || 0) >= it.max) return 'Azami sayı';
    if (it.id === 'instant' && !(VH.logistics && !VH.logistics.truck && VH.logistics.dispatchIn > 0)) return 'Bekleyen sevkiyat yok';
    if (d.gems < it.gems) return `${it.gems}💎 gerekli`;
    if (it.cash && S().budget < it.cash) return 'Bütçe yetersiz';
    return null;
  }
  function buy(it) {
    if (canBuy(it)) return;
    const d = data();
    d.gems -= it.gems; if (it.cash) S().budget -= it.cash;
    if (it.once) d.owned[it.id] = true;
    if (it.count) d[it.count] = (d[it.count] || 0) + 1;
    sound('success');
    if (it.id === 'instant') { VH.logistics._dispatchNow(); UI().toast('⚡ Sevkiyat hemen yola çıktı!', 2200); }
    if (it.id === 'goldTheme' && M().invalidate) M().invalidate();
    if (it.id === 'helipad') { placeHelipad(); d.heliNext = 25; notify('🚁', 'Helikopter pisti hazır! İlk hava ambulansı yakında iniyor.', 0, 'heli'); }
    if (it.id === 'sanitizer') placeSanitizers();
    if (it.id === 'robot') spawnRobots();
    if (it.id === 'espresso' || it.id === 'massage') placeLounge();
    if (it.id !== 'instant') UI().toast(`${it.icon} ${it.name} hazır!`, 2600);
    persist();
  }
  function factor(k) {
    let f = 1;
    if (owns('vipDoctor') && (k === 'examTime' || k === 'labTime')) f *= 0.85;
    if (owns('luxDecor') && k === 'patienceDrain') f *= 0.85;
    const ac = Object.values(data().academy);
    if (k === 'stabTime' && ac.includes('trauma')) f *= 0.85;
    if (k === 'patienceDrain' && ac.includes('triage')) f *= 0.92;
    return f;
  }
  const hygieneBonus = () => (data().sanitizers || 0) * 4 + robots.length * 3;

  // ================================================================ Yerleşim: dezenfektan, B1 dinlenme, helikopter pisti
  const SAN_SPOTS = [[2, 10], [9, 10], [15, 10], [19, 10], [23, 10], [28, 10]];
  function addObj(f, o) { const objs = M().FLOOR_DEFS[f].objects; if (!objs.some((x) => x.k === o.k && x.x === o.x && x.y === o.y)) { objs.push(Object.assign({ w: 1, h: 1 }, o)); return true; } return false; }
  function rebuild(f) { M().rebuild(f); if (E().buildDevices) E().buildDevices(); }
  function placeSanitizers() { let ch = false; for (let i = 0; i < Math.min(6, data().sanitizers || 0); i++) ch = addObj(0, { k: 'sanitizer_stand', x: SAN_SPOTS[i][0], y: SAN_SPOTS[i][1], block: false, vip: true }) || ch; if (ch) rebuild(0); }
  function placeLounge() {
    let ch = false;
    if (owns('espresso')) ch = addObj(4, { k: 'espresso_bar', x: 4, y: 10, w: 2, tag: 'coffee_bar', vip: true }) || ch;
    if (owns('massage')) { ch = addObj(4, { k: 'massage_chair', x: 8, y: 12, vip: true }) || ch; ch = addObj(4, { k: 'massage_chair', x: 9, y: 12, vip: true }) || ch; }
    if (ch) rebuild(4);
  }
  const PAD = { x: 44, y: 23, w: 3, h: 3 }, PADC = [45.5, 24.5];
  function placeHelipad() { if (addObj(0, { k: 'helipad', x: PAD.x, y: PAD.y, w: 3, h: 3, flat: true, block: false, vip: true })) rebuild(0); }

  // ================================================================ Temizlik robotları
  const robots = [];
  const ROBOT_WP = [[4.5, 9.6], [12.5, 10.4], [20.5, 9.6], [27.5, 10.4], [14.5, 16.5], [6.5, 19.5], [24.5, 16.5]];
  function spawnRobots() {
    while (robots.length < (data().robots || 0)) {
      const r = E().makeEntity('extra', { name: 'Temizlik Robotu', look: {}, x: 6.5 + robots.length * 4, y: 9.6, speed: 1.1, floor: 0 });
      r.robot = true; r.phase = Math.random() * 6;
      robots.push(r);
    }
  }
  function updateRobots(dt) {
    const lit = (VH.progress && VH.progress.litter) || [];
    for (const r of robots) {
      r.phase += dt;
      if (r.path && r.path.length) { E().stepPath(r, dt); if (r.target && Math.hypot(r.x - r.target.x, r.y - r.target.y) < 0.6) { VH.progress.clean(r.target, 'robot'); r.target = null; r.path = []; } continue; }
      const l = lit.find((q) => (q.f || 0) === 0 && !q.robot);
      if (l) { l.robot = true; r.target = l; E().goTo(r, l.x, l.y); }
      else if (Math.random() < dt * 0.4) { const w = pick(ROBOT_WP); E().goTo(r, w[0], w[1]); }
    }
  }

  // ================================================================ Helikopter (hava ambulansı) + Altın Saat VIP vakası
  const heli = { phase: null, z: 0, t: 0 };
  let vip = null; // { p, timeLeft, stage }
  const VIP_CASES = [
    { name: 'Kerem Aslan', age: 34, what: 'Motosiklet kazası · çoklu travma, ritim bozukluğu' },
    { name: 'Selin Yurt', age: 27, what: 'Yüksekten düşme · iç kanama şüphesi' },
    { name: 'Hakan Er', age: 52, what: 'İş kazası · ağır kan kaybı ve şok' },
  ];
  function startHeli() {
    heli.phase = 'in'; heli.z = 260; heli.t = 0;
    sound('alarm');
    notify('🚁', 'Hava ambulansı iniyor! Altın Saat VIP travma vakası (90 sn) · helikopter pistine gidin.', 0, 'heli', { floor: 0, x: PADC[0], y: PADC[1] + 1.6, label: 'Helikopter pisti', icon: '🚁', title: 'Altın Saat', instruction: 'Pistteki hastanın yanına gidip "Altın Saat Müdahalesi"ni başlatın.' });
  }
  function landed() {
    const c = pick(VIP_CASES);
    const p = E().makeEntity('patient', { name: c.name, age: c.age, complaint: c.what, look: E().randomPatientLook(c.age), x: PADC[0] - 0.6, y: PADC[1] + 1.4, floor: 0, state: 'vip', timer: 999, speed: 1 });
    p.lying = true; p.lift = 10; p.vipHeli = true; p.patience = 100;
    E().patients.push(p);
    vip = { p, timeLeft: 90, def: c };
  }
  function vipResult(ok, s1, s2) {
    const v = vip; vip = null;
    if (!v) return;
    const night = H().isNightShift;
    if (ok) {
      const cash = Math.round(6000 * (night ? 1.5 : 1));
      H().reward(5, 2, cash); addGems(15, 'Altın Saat kurtarması');
      bump('heli'); bump('er');
      UI().openDialog({ icon: '🚁', title: 'Altın Saat · Hasta Kurtarıldı!', subtitle: `${v.def.name}, ${v.def.age} yaş`, text: `Defibrilatör ${s1}/100 · Damar yolu ve sıvı ${s2}/100.\nHasta stabil olarak yoğun bakıma alındı. +${money(cash)}${night ? ' (gece bonusu dahil)' : ''}, İtibar +5, +15 💎` });
    } else {
      H().reward(-3, -1, 0);
      UI().toast('⌛ Altın Saat kaçırıldı: hasta ekip tarafından devralındı (İtibar −3)', 3200);
    }
    v.p.lying = false; setTimeout(() => { v.p.gone = true; }, 1200);
    heli.phase = 'out'; heli.t = 0;
    data().heliNext = rand(260, 380);
    persist();
  }
  function startVipGame() {
    const MGs = VH.minigames;
    if (!vip || !MGs || MGs.active) return;
    MGs.defib((s1) => {
      if (!vip) return;
      MGs.flow('iv', (s2) => vipResult(s1 >= 50 && s2 >= 50, s1, s2));
    });
  }
  function updateHeli(dt) {
    const d = data();
    if (!owns('helipad')) return;
    if (!heli.phase && !vip) { d.heliNext -= dt; if (d.heliNext <= 0) startHeli(); }
    if (heli.phase === 'in') { heli.z = Math.max(0, heli.z - dt * 60); if (heli.z <= 0) { heli.phase = 'landed'; landed(); } }
    else if (heli.phase === 'out') { heli.t += dt; if (heli.t > 3) heli.z += dt * 70; if (heli.z > 320) heli.phase = null; }
    if (vip) { vip.timeLeft -= dt; if (vip.timeLeft <= 0) vipResult(false, 0, 0); }
  }

  // ================================================================ Gizemli vakalar (Teşhis Panosu)
  const L = (name, value, unit, lo, hi) => ({ name, value, unit, lo, hi });
  const MYSTERIES = [
    { complaint: 'Halsizlik, kilo alma, sürekli üşüme ve kabızlık', labs: [L('TSH', 11.2, 'mIU/L', 0.4, 4.0), L('Serbest T4', 0.6, 'ng/dL', 0.9, 1.7), L('Hemoglobin', 12.6, 'g/dL', 12, 16), L('Kolesterol', 252, 'mg/dL', 0, 200), L('Sodyum', 138, 'mmol/L', 135, 145), L('Glukoz', 90, 'mg/dL', 70, 99)],
      imaging: 'Tiroid ultrasonu: bez hafif büyümüş, heterojen yapıda.', dx: ['Hipotiroidi', 'Demir eksikliği anemisi', 'Depresif bozukluk'] },
    { complaint: 'Ellerde-ayaklarda uyuşma, unutkanlık, dilde yanma (yıllardır metformin kullanıyor)', labs: [L('B12 Vitamini', 140, 'pg/mL', 200, 900), L('MCV', 106, 'fL', 80, 100), L('Hemoglobin', 11.4, 'g/dL', 12, 16), L('Folat', 9.5, 'ng/mL', 4, 20), L('Glukoz', 112, 'mg/dL', 70, 99), L('TSH', 2.2, 'mIU/L', 0.4, 4.0)],
      imaging: 'Beyin MR: yapısal patoloji yok. Spinal MR: arka kolonlarda hafif sinyal artışı.', dx: ['B12 eksikliğine bağlı nöropati ve anemi', 'Multipl skleroz', 'Diyabetik nöropati'] },
    { complaint: 'Uzun süreli ishal, kilo kaybı, demir hapına yanıt vermeyen kansızlık', labs: [L('Hemoglobin', 10.2, 'g/dL', 12, 16), L('Ferritin', 6, 'ng/mL', 15, 150), L('Doku transglutaminaz IgA', 128, 'U/mL', 0, 10), L('Albümin', 3.3, 'g/dL', 3.5, 5.0), L('CRP', 3, 'mg/L', 0, 5), L('TSH', 1.8, 'mIU/L', 0.4, 4.0)],
      imaging: 'Endoskopi ve duodenum biyopsisi: villus atrofisi.', dx: ['Çölyak hastalığı', 'İrritabl bağırsak sendromu', 'Laktoz intoleransı'] },
    { complaint: 'Tekrarlayan böbrek taşı, kemik ağrıları, kabızlık ve dalgınlık', labs: [L('Kalsiyum', 11.4, 'mg/dL', 8.5, 10.5), L('PTH', 128, 'pg/mL', 15, 65), L('Fosfor', 2.1, 'mg/dL', 2.5, 4.5), L('D Vitamini (25-OH)', 22, 'ng/mL', 30, 100), L('Kreatinin', 1.0, 'mg/dL', 0.6, 1.2), L('Albümin', 4.2, 'g/dL', 3.5, 5.0)],
      imaging: 'Boyun ultrasonu: tiroidin arkasında paratiroid adenomu ile uyumlu nodül.', dx: ['Primer hiperparatiroidi', 'D vitamini zehirlenmesi', 'Osteoporoz'] },
    { complaint: 'Çarpıntı, iştah artmasına rağmen kilo kaybı, sıcağa dayanamama, ellerde titreme', labs: [L('TSH', 0.02, 'mIU/L', 0.4, 4.0), L('Serbest T4', 3.1, 'ng/dL', 0.9, 1.7), L('Hemoglobin', 13.8, 'g/dL', 12, 16), L('Glukoz', 94, 'mg/dL', 70, 99), L('Sodyum', 140, 'mmol/L', 135, 145), L('Kalsiyum', 9.6, 'mg/dL', 8.5, 10.5)],
      imaging: 'Tiroid sintigrafisi: bezde yaygın artmış tutulum.', dx: ['Hipertiroidi (Graves hastalığı)', 'Panik bozukluk', 'Aşırı kafein tüketimi'] },
    { complaint: 'Uzun otobüs yolculuğundan sonra tek bacakta şişlik, ağrı ve kızarıklık', labs: [L('D-dimer', 2.8, 'µg/mL', 0, 0.5), L('CRP', 9, 'mg/L', 0, 5), L('Hemoglobin', 14.1, 'g/dL', 12, 16), L('Trombosit', 260, '10³/µL', 150, 400), L('Kreatinin', 0.9, 'mg/dL', 0.6, 1.2), L('Glukoz', 88, 'mg/dL', 70, 99)],
      imaging: 'Bacak Doppler ultrasonu: popliteal vende trombüs.', dx: ['Derin ven trombozu', 'Selülit', 'Kas zorlanması'] },
  ];
  function spawnMystery() {
    const pats = E().patients.filter((p) => !p.gone && p.state !== 'resident');
    if (pats.length > 9) { data().mysteryNext = 40; return; }
    E().spawnPatientNow();
    const p = E().patients[E().patients.length - 1];
    if (!p || p.mystery !== undefined) return;
    const i = Math.floor(Math.random() * MYSTERIES.length);
    p.mystery = i; p.complaint = MYSTERIES[i].complaint;
    p.patience = 100;
    notify('🔍', `Gizemli vaka: ${p.name} · ${p.complaint.toLowerCase()} (Teşhis Panosu ile 3x ödül)`, 0, 'mystery');
    data().mysteryNext = rand(220, 320);
  }
  function openMystery(p) {
    const m = MYSTERIES[p.mystery];
    if (!m || p.mysteryDone) return;
    const MGs = VH.minigames;
    const board = (labScore) => {
      const node = el('div', {});
      node.appendChild(el('p', {}, `Şikâyet: ${m.complaint}.`));
      const tbl = el('div', { className: 'mg-lab' });
      m.labs.forEach((r) => {
        const row = el('div', { className: 'mg-lab-row' + (r.value < r.lo || r.value > r.hi ? ' on' : '') });
        row.appendChild(el('span', { className: 'mg-ln' }, r.name));
        row.appendChild(el('span', { className: 'mg-lv' }, `${r.value} ${r.unit}${r.value < r.lo ? ' ↓' : r.value > r.hi ? ' ↑' : ''}`));
        row.appendChild(el('span', { className: 'mg-lr' }, `${r.lo}–${r.hi}`));
        tbl.appendChild(row);
      });
      node.appendChild(tbl);
      node.appendChild(el('div', { className: 'sec-title' }, 'Görüntüleme bulgusu'));
      node.appendChild(el('p', { className: 'lesson' }, m.imaging));
      node.appendChild(el('div', { className: 'sec-title' }, 'Teşhis Panosu · En olası tanı hangisi?'));
      m.dx.map((t, i) => [t, i === 0]).sort(() => Math.random() - 0.5).forEach(([t, ok]) => {
        const b = el('button', { type: 'button', className: 'opt-btn' }, t);
        b.addEventListener('click', () => {
          p.mysteryDone = true;
          UI().closeDialog(true);
          if (ok) {
            const cash = 3600 + (labScore >= 80 ? 600 : 0);
            H().reward(6, 2, cash); addGems(5, 'Gizemli vaka çözüldü');
            bump('mystery');
            UI().openDialog({ icon: '🔍', title: 'Doğru Tanı! · 3x Ödül', subtitle: `${p.name}`, text: `Tanı: ${m.dx[0]}.\nBulgular tanıyla tam uyumlu. +${money(cash)}, İtibar +6, +5 💎` });
          } else {
            H().reward(-1, 0, 0);
            UI().openDialog({ icon: '🔍', title: 'Tanı Uyuşmadı', subtitle: p.name, text: `Doğru tanı: ${m.dx[0]}.\nBulguları (anormal tahliller ve görüntüleme) birlikte değerlendirmek gerekir. İtibar −1` });
          }
          persist();
        });
        node.appendChild(b);
      });
      UI().openDialog({ icon: '🔍', title: 'Gizemli Vaka · Teşhis Panosu', subtitle: `${p.name}${p.age ? ', ' + p.age + ' yaş' : ''}`, wide: true, node });
    };
    if (MGs && MGs.enabled && !MGs.active) MGs.lab(m.labs, (s) => board(s)); else board(0);
  }
  function updateMystery(dt) {
    const d = data();
    if (E().patients.some((p) => p.mystery !== undefined && !p.mysteryDone && !p.gone)) return;
    d.mysteryNext -= dt;
    if (d.mysteryNext <= 0) spawnMystery();
  }

  // ================================================================ Kariyer hedefleri (kademeli)
  const CAREER = [
    { id: 'er', icon: '🚑', name: 'Acil Kahramanı', key: 'er', text: (n) => `${n} kritik ambulans vakasını kurtar`, tiers: [10, 25, 50] },
    { id: 'surgery', icon: '🩻', name: 'Neşter Ustası', key: 'surgery', text: (n) => `Ameliyathanede ${n} operasyonu bizzat tamamla`, tiers: [5, 15, 30] },
    { id: 'imaging', icon: '🧲', name: 'Radyoloji Uzmanı', key: 'imagingGood', text: (n) => `Radyolojide ${n} doğru tanı koy (60+ puan)`, tiers: [8, 20, 40] },
    { id: 'served', icon: '💚', name: 'Şifa Dağıtan', key: 'served', text: (n) => `${n} hastayı taburcu et`, tiers: [50, 150, 400] },
    { id: 'ward', icon: '🛏️', name: 'Şefkatli Servis', key: 'ward', text: (n) => `Serviste ${n} bakım uygula`, tiers: [10, 30, 60] },
    { id: 'mystery', icon: '🔍', name: 'Tanı Dedektifi', key: 'mystery', text: (n) => `${n} gizemli vakayı doğru teşhis et`, tiers: [1, 5, 12] },
    { id: 'heli', icon: '🚁', name: 'Altın Saat', key: 'heli', text: (n) => `${n} hava ambulansı hastasını kurtar`, tiers: [1, 5, 10] },
  ];
  const TIER_REWARD = [[5000, 5], [12000, 10], [25000, 20]];
  function careerRows(list, rerender) {
    const c = counters(), d = data();
    CAREER.forEach((g) => {
      const done = d.claimed[g.id] || 0;
      const tier = Math.min(done, g.tiers.length - 1), n = g.tiers[tier], have = c[g.key] || 0;
      const card = el('div', { className: 'shop-card' + (done >= g.tiers.length ? ' owned' : '') });
      card.appendChild(el('div', { className: 'shop-icon' }, g.icon));
      const b = el('div', { className: 'shop-body' });
      b.appendChild(el('strong', {}, `${g.name} · Kademe ${Math.min(done + 1, g.tiers.length)}/${g.tiers.length}`));
      b.appendChild(el('span', { className: 'opt-desc' }, done >= g.tiers.length ? 'Tüm kademeler tamamlandı ✓' : `${g.text(n)} · ${Math.min(have, n)}/${n}`));
      const [cash, gems] = TIER_REWARD[tier];
      b.appendChild(el('span', { className: 'shop-meta' }, `Ödül: ${money(cash)} + ${gems} 💎`));
      card.appendChild(b);
      const ready = done < g.tiers.length && have >= n;
      const btn = el('button', { type: 'button', className: 'dlg-btn' + (ready ? '' : ' ghost') }, ready ? 'Ödülü al' : done >= g.tiers.length ? '✓' : 'Devam');
      btn.disabled = !ready;
      btn.addEventListener('click', () => { d.claimed[g.id] = done + 1; S().budget += cash; addGems(gems, g.name); H().reward(3, 0, 0); sound('success'); persist(); rerender(); });
      card.appendChild(btn);
      list.appendChild(card);
    });
  }

  // ================================================================ Personel Akademisi
  const COURSES = [
    { id: 'trauma', icon: '🩸', name: 'Travma Cerrahisi', desc: 'Acil stabilizasyon %15 hızlı; işlem hızı +%15.' },
    { id: 'triage', icon: '🚦', name: 'Hızlı Triyaj', desc: 'Bekleyen hastaların sabrı daha yavaş azalır; işlem hızı +%15.' },
    { id: 'radiology', icon: '🧲', name: 'İleri Radyoloji', desc: 'Görüntüleme ve tahlil yorumunda uzmanlaşır; işlem hızı +%15.' },
  ];
  const COURSE_COST = 3000, COURSE_GEMS = 2;
  function academyApp(list, rerender) {
    list.appendChild(el('p', { className: 'muted' }, `Doktor ve hemşirelerinize uzmanlık eğitimi verin. Eğitim alan personelin önlüğüne altın uzmanlık rozeti takılır ve işlem hızı %15 artar. Kurs: ${money(COURSE_COST)} + ${COURSE_GEMS} 💎 · Elmas: ${data().gems}`));
    const staff = E().staff.filter((s) => s.floor >= 0 && s.def && !/Temizlik|Teknisyen|Resepsiyon/.test(s.def.role || ''));
    staff.forEach((s) => {
      const spec = data().academy[s.id];
      const card = el('div', { className: 'shop-card' + (spec ? ' owned' : '') });
      card.appendChild(el('div', { className: 'shop-icon' }, spec ? COURSES.find((c) => c.id === spec).icon : '🎓'));
      const b = el('div', { className: 'shop-body' });
      b.appendChild(el('strong', {}, s.name));
      b.appendChild(el('span', { className: 'opt-desc' }, `${s.def.role || ''}${spec ? ' · Uzmanlık: ' + COURSES.find((c) => c.id === spec).name : ''}`));
      card.appendChild(b);
      if (!spec) {
        const row = el('div', { className: 'mg-courses' });
        COURSES.forEach((c) => {
          const can = S().budget >= COURSE_COST && data().gems >= COURSE_GEMS;
          const btn = el('button', { type: 'button', className: 'mini-btn', title: c.desc }, `${c.icon} ${c.name}`);
          btn.disabled = !can;
          btn.addEventListener('click', () => {
            S().budget -= COURSE_COST; data().gems -= COURSE_GEMS;
            data().academy[s.id] = c.id;
            applyBadge(s);
            if (VH.emit) VH.emit('train', { staff: s.id });
            sound('success'); UI().toast(`🎓 ${s.name}: ${c.name} eğitimini tamamladı!`, 2600);
            persist(); rerender();
          });
          row.appendChild(btn);
        });
        card.appendChild(row);
      }
      list.appendChild(card);
    });
    if (!staff.length) list.appendChild(el('p', {}, 'Eğitim verilecek doktor/hemşire yok. MedKariyer.com üzerinden kadro alın.'));
  }
  function applyBadge(s) { if (s && s.look) { s.look = Object.assign({}, s.look, { badge: '#e6c66e', cross: true }); } }

  // ================================================================ Şehir Sağlık Ligi
  const RIVALS = [['Anka Şehir Hastanesi', 2600, 120], ['Marmara Tıp Merkezi', 2100, 105], ['Yeşilvadi Devlet Hastanesi', 1500, 90]];
  function league() { const d = data(); if (!d.league) d.league = { rivals: RIVALS.map(([name, score, g]) => ({ name, score, g })), shifts: 0, weeks: 0 }; return d.league; }
  function myScore() {
    const st = S(), c = counters();
    const r = VH.progress ? VH.progress.rating() : 3;
    return Math.round(st.reputation * 12 + (c.served || 0) * 3 + (st.casesTotal || 0) * 4 + r * 150 + (c.er || 0) * 10 + (data().gemsTotal || 0) * 2);
  }
  function standings() {
    const lg = league();
    return lg.rivals.map((x) => ({ name: x.name, score: Math.round(x.score), me: false })).concat([{ name: 'Vita Hospital (siz)', score: myScore(), me: true }]).sort((a, b) => b.score - a.score);
  }
  function leagueWeek() {
    const lg = league();
    lg.weeks++;
    const rank = standings().findIndex((x) => x.me) + 1;
    let cash = 0, gems = 0;
    if (rank === 1) { cash = 10000; gems = 10; data().title = true; }
    else if (rank === 2) { cash = 4000; gems = 3; }
    else if (rank === 3) cash = 1500;
    if (cash) S().budget += cash;
    if (gems) addGems(gems, 'Şehir Sağlık Ligi');
    notify('🏆', rank === 1 ? `Şehir Sağlık Ligi 1.'siniz! "Yılın Hastanesi" unvanı + belediye teşviki ${money(cash)}` : `Lig haftası bitti: ${rank}. sıra${cash ? ' · teşvik ' + money(cash) : ''}`, 0, 'league');
  }
  function leagueApp(list) {
    const lg = league();
    if (data().title) list.appendChild(el('div', { className: 'new-clue' }, '🏆 "Yılın Hastanesi" unvanı sizde!'));
    list.appendChild(el('p', { className: 'muted' }, `Her 3 nöbette bir lig haftası kapanır. 1. sıra: "Yılın Hastanesi" unvanı + ₺10.000 belediye teşviki + 10 💎 · 2.: ₺4.000 + 3 💎 · 3.: ₺1.500. Hafta: ${lg.weeks + 1} · Nöbet ${lg.shifts % 3 + 1}/3`));
    const rows = standings(), max = Math.max(...rows.map((r) => r.score), 1);
    rows.forEach((r, i) => {
      const card = el('div', { className: 'shop-card' + (r.me ? ' owned' : '') });
      card.appendChild(el('div', { className: 'shop-icon' }, ['🥇', '🥈', '🥉', '4.'][i]));
      const b = el('div', { className: 'shop-body' });
      b.appendChild(el('strong', {}, r.name));
      const bar = el('div', { className: 'flow-bar' }); const fill = el('div', { className: 'flow-bar-fill' }); fill.style.width = (r.score / max * 100).toFixed(1) + '%'; fill.style.background = r.me ? '#2ec4b6' : '#7e8d96';
      bar.appendChild(fill); b.appendChild(bar);
      b.appendChild(el('span', { className: 'shop-meta' }, `${r.score.toLocaleString('tr-TR')} puan`));
      card.appendChild(b);
      list.appendChild(card);
    });
  }

  // ================================================================ VitaOS: Prestij & Kariyer uygulaması
  function prestigeApp(list, rerender) {
    const d = data();
    list.appendChild(el('div', { className: 'new-clue' }, `💎 Elmas: ${d.gems} · Bütçe: ${money(S().budget)}`));
    list.appendChild(el('div', { className: 'sec-title' }, '🎯 Kariyer hedefleri'));
    careerRows(list, rerender);
    list.appendChild(el('div', { className: 'sec-title' }, '🛍️ Prestij Mağazası'));
    SHOP.forEach((it) => {
      const why = canBuy(it);
      const owned = it.once && d.owned[it.id];
      const card = el('div', { className: 'shop-card' + (owned ? ' owned' : '') });
      card.appendChild(el('div', { className: 'shop-icon' }, it.icon));
      const b = el('div', { className: 'shop-body' });
      b.appendChild(el('strong', {}, it.name + (it.count ? ` (${d[it.count] || 0}/${it.max})` : '')));
      b.appendChild(el('span', { className: 'opt-desc' }, it.desc));
      b.appendChild(el('span', { className: 'shop-meta' }, [it.gems ? it.gems + ' 💎' : '', it.cash ? money(it.cash) : ''].filter(Boolean).join(' + ')));
      card.appendChild(b);
      const btn = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, owned ? '✓ Aktif' : why || 'Satın al');
      btn.disabled = !!why;
      btn.addEventListener('click', () => { buy(it); rerender(); });
      card.appendChild(btn);
      list.appendChild(card);
    });
  }
  const ICONS = {
    prestij: '<path d="M24 6l7 9h-14z" fill="#fff"/><path d="M10 15h28l-14 27z" fill="#fff" opacity=".85"/><path d="M17 15l7 27 7-27" stroke="#7a4fd1" stroke-width="2" fill="none"/>',
    akademi: '<path d="M24 9 44 18 24 27 4 18z" fill="#fff"/><path d="M12 22v8c0 3 6 6 12 6s12-3 12-6v-8l-12 6z" fill="#fff" opacity=".85"/><path d="M40 19v11" stroke="#ffd166" stroke-width="2.5"/>',
    lig: '<path d="M15 8h18v8a9 9 0 0 1-18 0z" fill="#fff"/><path d="M15 11H9a6 6 0 0 0 6 8M33 11h6a6 6 0 0 1-6 8" stroke="#fff" stroke-width="3" fill="none"/><rect x="20" y="25" width="8" height="8" fill="#fff"/><rect x="14" y="33" width="20" height="6" rx="2" fill="#fff"/>',
  };
  function registerApps() {
    if (!VH.os || !VH.os.registerApp) return;
    VH.os.registerApp({ id: 'prestij', name: 'Prestij & Kariyer', bg: '#7a4fd1', render: prestigeApp, w: 760, h: 600, tabs: ['prestij'] }, ICONS.prestij);
    VH.os.registerApp({ id: 'akademi', name: 'Personel Akademisi', bg: '#b5651d', render: academyApp, w: 720, h: 560, tabs: ['akademi'] }, ICONS.akademi);
    VH.os.registerApp({ id: 'lig', name: 'Şehir Sağlık Ligi', bg: '#c9a227', render: leagueApp, w: 640, h: 520, tabs: ['lig'] }, ICONS.lig);
  }

  // ================================================================ Etkileşim, akış ve çizim
  VH.targetProviders.push((pl) => {
    const out = [];
    if (vip && pl.floor === 0) {
      const d = Math.hypot(vip.p.x - pl.x, vip.p.y - pl.y);
      if (d < 2.4) out.push({ type: 'vip', name: `${vip.def.name} · Altın Saat ${Math.ceil(vip.timeLeft)} sn`, action: '🚁 Altın Saat Müdahalesi', x: vip.p.x, y: vip.p.y, dist: d - 3, handler: startVipGame });
    }
    for (const p of E().patients) {
      if (p.mystery === undefined || p.mysteryDone || p.gone || p.floor !== pl.floor || p.state === 'leaving') continue;
      const d = Math.hypot(p.x - pl.x, p.y - pl.y);
      if (d < 1.9) out.push({ type: 'mystery', name: `${p.name} · Gizemli vaka`, action: '🔍 Teşhis Panosu', x: p.x, y: p.y, dist: d - 1.2, ref: p, handler: (t) => openMystery(t.ref) });
    }
    return out;
  });
  VH.flowProviders.push(() => {
    if (!vip) return null;
    return { id: 'vip', tab: '🚁 Altın Saat', prio: 'red', title: 'Hava Ambulansı · Altın Saat', patient: `${vip.def.name}, ${vip.def.age} yaş · ${vip.def.what}`,
      timer: `${Math.ceil(vip.timeLeft)} sn`, bar: vip.timeLeft / 90, urgent: true,
      steps: ['Piste koş', 'Defibrilatör', 'Damar yolu', 'Yoğun bakım'].map((l, i) => ({ label: l, state: i === 0 ? 'active' : 'todo' })),
      instruction: 'Helikopter pistindeki hastanın yanına gidip "Altın Saat Müdahalesi"ni başlatın: iki mini oyunu peş peşe tamamlayın.',
      target: { floor: 0, x: vip.p.x, y: vip.p.y, label: 'Altın Saat', icon: '🚁', ent: vip.p }, patientRef: vip.p };
  });
  function drawHeli(ctx, sx, sy, z, t) {
    const y = sy - z;
    // gölge
    const sh = Math.max(0.15, 1 - z / 300);
    ctx.fillStyle = `rgba(10,20,25,${0.3 * sh})`; ctx.beginPath(); ctx.ellipse(sx, sy, 44 * sh, 20 * sh, 0, 0, Math.PI * 2); ctx.fill();
    // kuyruk
    ctx.strokeStyle = '#d9dee2'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx + 12, y - 18); ctx.lineTo(sx + 52, y - 30); ctx.stroke();
    ctx.strokeStyle = '#d62828'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx + 20, y - 21); ctx.lineTo(sx + 50, y - 30); ctx.stroke();
    ctx.fillStyle = '#2b333b'; ctx.beginPath(); ctx.ellipse(sx + 53, y - 31, 2, 7 + Math.sin(t * 40) * 2, 0, 0, Math.PI * 2); ctx.fill();
    // kızaklar
    ctx.strokeStyle = '#2b333b'; ctx.lineWidth = 2;
    for (const o of [-8, 8]) { ctx.beginPath(); ctx.moveTo(sx - 24, y - 2 + o * 0.4); ctx.lineTo(sx + 18, y + 4 + o * 0.4); ctx.stroke(); }
    // gövde
    const g = ctx.createLinearGradient(sx - 26, y - 34, sx + 20, y);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9d1d6');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx - 2, y - 17, 27, 15, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,30,40,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#d62828'; ctx.beginPath(); ctx.ellipse(sx - 2, y - 11, 26, 4, -0.12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#22394b'; ctx.beginPath(); ctx.ellipse(sx - 17, y - 21, 10, 8, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(190,225,245,0.45)'; ctx.beginPath(); ctx.ellipse(sx - 19, y - 24, 4, 3, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d62828'; ctx.fillRect(sx + 1, y - 22, 9, 3); ctx.fillRect(sx + 4, y - 25.5, 3, 10);
    // tepe ışığı
    if (Math.floor(t * 3) % 2) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(sx - 2, y - 33, 2.6, 0, Math.PI * 2); ctx.fill(); }
    // ana rotor (bulanık disk + iki pala)
    ctx.fillStyle = 'rgba(60,70,80,0.18)'; ctx.beginPath(); ctx.ellipse(sx - 2, y - 36, 58, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(40,48,56,0.85)'; ctx.lineWidth = 2.5;
    const a = t * (heli.phase === 'landed' && !vip ? 8 : 26);
    for (let i = 0; i < 2; i++) { const b = a + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(sx - 2 - Math.cos(b) * 58, y - 36 - Math.sin(b) * 18); ctx.lineTo(sx - 2 + Math.cos(b) * 58, y - 36 + Math.sin(b) * 18); ctx.stroke(); }
    ctx.fillStyle = '#2b333b'; ctx.beginPath(); ctx.arc(sx - 2, y - 36, 3, 0, Math.PI * 2); ctx.fill();
  }
  function drawRobot(ctx, r, t) {
    const [sx, sy] = M().worldToIso(r.x, r.y);
    ctx.fillStyle = 'rgba(10,30,40,0.25)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9eef1'; ctx.beginPath(); ctx.ellipse(sx, sy - 4, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9d1d6'; ctx.fillRect(sx - 10, sy - 4, 20, 3); ctx.beginPath(); ctx.ellipse(sx, sy - 1, 10, 5, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#2b333b'; ctx.beginPath(); ctx.ellipse(sx, sy - 5, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Math.floor(t * 2 + r.phase) % 2 ? '#2ec4b6' : '#1d6f86'; ctx.beginPath(); ctx.arc(sx + 5, sy - 5, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(46,196,182,0.5)'; ctx.lineWidth = 1;
    const a = t * 9 + r.phase;
    for (let i = 0; i < 3; i++) { const b = a + i * 2.1; ctx.beginPath(); ctx.moveTo(sx - 8, sy - 1); ctx.lineTo(sx - 8 + Math.cos(b) * 4, sy - 1 + Math.sin(b) * 2); ctx.stroke(); }
  }
  function drawables(map) {
    if (map.floor !== 0) return [];
    const out = [], t = performance.now() / 1000;
    for (const r of robots) out.push({ kind: 'robot', key: map.depthAt(r.x, r.y), cx: map.worldToIso(r.x, r.y)[0], cy: map.worldToIso(r.x, r.y)[1], draw: (ctx) => drawRobot(ctx, r, t) });
    if (heli.phase) {
      const [sx, sy] = map.worldToIso(PADC[0], PADC[1]);
      out.push({ kind: 'heli', key: map.depthAt(PADC[0], PADC[1]) + 0.5 + heli.z / 40, cx: sx, cy: sy, draw: (ctx) => drawHeli(ctx, sx, sy, heli.z, t) });
    }
    return out;
  }
  function drawOverlay(ctx, vw, vh) {
    const P = E().player, cam = M().camera, now = performance.now();
    for (const p of E().patients) {
      if (p.mystery === undefined || p.mysteryDone || p.gone || p.floor !== P.floor || p.bubble) continue;
      const [ix, iy] = M().worldToIso(p.x, p.y);
      const [sx, sy] = cam.toScreen(ix, iy - (p.lift || 0) - 60, vw, vh);
      if (sx < -30 || sx > vw + 30 || sy < -30 || sy > vh + 30) continue;
      const bob = Math.sin(now / 300) * 2.5;
      ctx.fillStyle = '#7a4fd1'; ctx.beginPath(); ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '900 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', sx, sy + bob + 1);
    }
    if (vip && P.floor === 0) {
      const [ix, iy] = M().worldToIso(vip.p.x, vip.p.y);
      const [sx, sy] = cam.toScreen(ix, iy - 64, vw, vh);
      const frac = Math.max(0, vip.timeLeft / 90);
      ctx.fillStyle = 'rgba(40,28,6,0.92)'; ctx.fillRect(sx - 44, sy - 14, 88, 22);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; ctx.strokeRect(sx - 44, sy - 14, 88, 22);
      ctx.fillStyle = frac > 0.5 ? '#ffd166' : frac > 0.25 ? '#f2a93b' : '#e5484d'; ctx.fillRect(sx - 42, sy + 4, 84 * frac, 3);
      ctx.fillStyle = '#fff'; ctx.font = '800 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`⏳ ALTIN SAAT ${Math.ceil(vip.timeLeft)} sn`, sx, sy - 4);
    }
  }

  // ================================================================ Olaylar ve nöbet sonu
  VH.on('shiftEnd', (sm) => {
    const d = data();
    // B1 dinlenme salonu: personel enerjisi ve moral
    if (VH.staff && (owns('espresso') || owns('massage'))) {
      for (const s of E().staff) {
        if (s.floor < 0) continue;
        const r = VH.staff.rec(s.id);
        r.energy = Math.min(100, r.energy + (owns('espresso') ? 20 : 0) + (owns('massage') ? 25 : 0));
        if (owns('massage')) r.morale = Math.min(100, r.morale + 5);
      }
      if (sm && sm.extra) sm.extra.push({ icon: '☕', label: 'B1 dinlenme salonu', value: 'Enerji yenilendi', cls: 'up-c' });
    }
    // lig: rakipler ilerler, her 3 nöbette hafta kapanır
    const lg = league();
    lg.rivals.forEach((r) => { r.score += r.g * rand(0.8, 1.25); });
    lg.shifts++;
    if (lg.shifts % 3 === 0) leagueWeek();
    void d;
  });
  VH.on('imagingDone', () => { /* doğru tanı sayacı floors.js'te (puan ≥ 60) */ });

  VH.vip = {
    SHOP, CAREER, MYSTERIES, COURSES,
    get gems() { return data().gems; },
    get theme() { return owns('goldTheme') ? 'gold' : null; },
    get heli() { return heli; },
    get active() { return vip; },
    owns, addGems, buy: (id) => buy(SHOP.find((x) => x.id === id)), canBuy: (id) => canBuy(SHOP.find((x) => x.id === id)),
    factor, hygieneBonus, standings, myScore, openMystery, spawnMystery, startHeli, startVipGame,
    drawables, drawOverlay,
    init() {
      data();
      // Akademi: eğitimli personel %15 hızlı (entities zamanlayıcıları VH.staff.timeFactor'ı kullanır)
      if (VH.staff && !VH.staff._vipTf) {
        const tf = VH.staff.timeFactor;
        VH.staff.timeFactor = (id) => tf(id) * (data().academy[id] ? 0.85 : 1);
        VH.staff._vipTf = true;
      }
      Object.keys(data().academy).forEach((id) => applyBadge(E().staffById(id)));
      if (owns('helipad')) placeHelipad();
      placeSanitizers(); placeLounge(); spawnRobots();
      registerApps();
    },
    update(dt) { updateRobots(dt); updateHeli(dt); updateMystery(dt); },
    sanitize(v) {
      const out = fresh();
      if (!v || typeof v !== 'object') return out;
      const n = (x, lo, hi, def) => (typeof x === 'number' && isFinite(x) ? Math.max(lo, Math.min(hi, x)) : def);
      out.gems = Math.round(n(v.gems, 0, 1e6, 10)); out.gemsTotal = Math.round(n(v.gemsTotal, 0, 1e7, out.gems));
      SHOP.forEach((it) => { if (it.once && v.owned && v.owned[it.id] === true) out.owned[it.id] = true; });
      out.sanitizers = Math.round(n(v.sanitizers, 0, 6, 0)); out.robots = Math.round(n(v.robots, 0, 3, 0));
      CAREER.forEach((g) => { if (v.claimed && typeof v.claimed[g.id] === 'number') out.claimed[g.id] = Math.round(n(v.claimed[g.id], 0, g.tiers.length, 0)); });
      if (v.academy && typeof v.academy === 'object') Object.keys(v.academy).slice(0, 40).forEach((id) => { if (/^[A-Za-z0-9]{1,20}$/.test(id) && COURSES.some((c) => c.id === v.academy[id])) out.academy[id] = v.academy[id]; });
      if (v.league && Array.isArray(v.league.rivals) && v.league.rivals.length === 3) out.league = { rivals: v.league.rivals.map((r, i) => ({ name: RIVALS[i][0], score: n(r.score, 0, 1e8, RIVALS[i][1]), g: RIVALS[i][2] })), shifts: Math.round(n(v.league.shifts, 0, 1e6, 0)), weeks: Math.round(n(v.league.weeks, 0, 1e6, 0)) };
      out.title = v.title === true;
      out.mysteryNext = n(v.mysteryNext, 10, 600, 150); out.heliNext = n(v.heliNext, 10, 600, 45);
      return out;
    },
  };
})();
