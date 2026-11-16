// Vita Hospital — Acil servis zaman yönetimi, eczane danışmanlığı, Başhekim Yönetim & İnşa Paneli
//
// - Acil: belirli aralıklarla siren + ambulans; triyaj (doğru ünite seçimi), sedyeye alma ve
//   ilgili cihazın yanında stabilizasyon; geri sayım biterse hasta başka hastaneye sevk edilir.
// - Eczane: sıradaki hastaya doğru kullanım bilgisini seçerek "İlaç Onayla" → bonus.
// - Yönetim paneli: cihaz yükseltmeleri, personel alımı, yeni servis katları (asansörle erişim).
// Not: Acil senaryolar eğitim amaçlı sadeleştirilmiştir; gerçek triyaj protokolü değildir.
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, M = () => VH.map, UI = () => VH.ui;
  const S = () => VH.cases.state;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const el = (...a) => UI().el(...a);
  const sound = (n) => { if (VH.audio && VH.audio.play) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };

  // ================================================================ Katalog
  const UPGRADES = [
    { id: 'fastLab', icon: '⚡', name: 'Hızlı Tahlil Analizörü', desc: 'Kan alma ve tahlil süresi %50 kısalır.', cost: 6000, rep: 40 },
    { id: 'microscope', icon: '🔬', name: 'Gelişmiş Mikroskop & Analiz Yazılımı', desc: 'Tahlil incelendiğinde gözden kaçan bir kritik ipucu otomatik açılır.', cost: 8000, rep: 50 },
    { id: 'comfort', icon: '🛋️', name: 'Yüksek Konforlu Bekleme Salonu', desc: 'Vaka hastalarının sabrı +2, hasta akışı %25 artar, hizmet başına gelir +₺50.', cost: 5000, rep: 35 },
    { id: 'erKit', icon: '🚑', name: 'Gelişmiş Acil Ekipman Paketi', desc: 'Acil vakalarda müdahale süresi +20 sn.', cost: 7000, rep: 45 },
    { id: 'digitalPharmacy', icon: '💊', name: 'Dijital Eczane Sistemi', desc: 'Doğru ilaç bilgilendirme bonusu 2 katına çıkar.', cost: 4000, rep: 35 },
  ];

  const look = (coat, shirt, pants, skin, hair, hairStyle, extra) => Object.assign({ coat, shirt, pants, skin, hair, hairStyle }, extra || {});
  const HIRES = [
    { id: 'erNurse', icon: '👩‍⚕️', name: 'Acil Hemşiresi', desc: 'Stabilizasyon süresi yarıya iner, acil süresi +10 sn.', cost: 6000, rep: 40,
      staff: { name: 'Hem. Derya Kılınç', role: 'Acil Hemşiresi', look: look('#5aa9e6', '#5aa9e6', '#3d6a8e', '#e8b48f', '#2b1d14', 'bun'),
        points: [[25.5, 15.5], [24.5, 13.5], [25.5, 19.5]], action: 'Personelle Konuş',
        info: 'Acil vakada doğru üniteyi seçin, sonra o cihazın yanında kalın; stabilizasyonu birlikte yaparız.',
        greet: ['Sedyeler hazır Başhekimim!', 'Monitörleri kontrol ettim.', 'Siren duyarsak hemen buradayım.'] } },
    { id: 'erDoctor', icon: '🧑‍⚕️', name: 'Acil Tıp Uzmanı', desc: 'Triyaj ekranında doğru ünite önerisini gösterir.', cost: 9000, rep: 50,
      staff: { name: 'Dr. Mert Aslan', role: 'Acil Tıp Uzmanı', look: look('#fbfdff', '#c0392b', '#2f3e46', '#c98d62', '#1c1c1c', 'short', { stethoscope: true }),
        points: [[26.5, 14.5], [28.5, 15.5], [24.5, 17.5]], action: 'Doktorla Konuş',
        info: 'Triyajda önce hava yolu, solunum ve dolaşıma bakarız: SpO₂ düşükse oksijen, tansiyon düşükse sıvı, göğüs ağrısı ve ritim sorunlarında monitör.',
        greet: ['Acil hazır.', 'Triyajda yanınızdayım.', 'ABC: hava yolu, solunum, dolaşım!'] } },
    { id: 'labTech2', icon: '🧪', name: 'Ek Laborant', desc: 'Kan alma %30 daha hızlı.', cost: 4000, rep: 35,
      staff: { name: 'Seda Uçar', role: 'Laborant', look: look('#f4f7fb', '#3a7d44', '#3a7d44', '#f3cfb1', '#7a5230', 'long', { gloves: '#3a7d44', goggles: true }),
        points: [[22.5, 4.5], [20.5, 5.5], [22.5, 6.5]], action: 'Personelle Konuş',
        info: 'Numuneleri iki kişi çalışınca sonuçlar çok daha hızlı çıkıyor.',
        greet: ['Tüpler santrifüjde!', 'Numune etiketleri tamam.', 'Merhaba Başhekimim.'] } },
    { id: 'pharmTech', icon: '💊', name: 'Eczane Teknisyeni', desc: 'Siz yokken teslim edilen reçetelerden de +₺150 gelir.', cost: 3500, rep: 30,
      staff: { name: 'Emre Yalçın', role: 'Eczane Teknisyeni', look: look('#fbfdff', '#3a7d44', '#3a5a40', '#e8b48f', '#4a3121', 'short', { cross: true }),
        points: [[29.5, 4.5], [25.5, 4.5]], action: 'Personelle Konuş',
        info: 'Stok sayımı ve reçete hazırlığı bende, bilgilendirmeyi siz yapınca hastalar çok memnun kalıyor.',
        greet: ['Raflar düzenli!', 'Reçeteler hazırlanıyor.', 'Hoş geldiniz.'] } },
  ];

  const SERVICES = [
    { id: 'surgery', floor: 1, icon: '🩻', name: 'Cerrahi & Ameliyathane Servisi', income: 250, cost: 45000, rep: 62, cases: 15,
      desc: 'Yeni kat: ameliyathane, cerrahi hazırlık, uyandırma odası. Acilden gelen ağır travma/apandisit/kalça kırığı hastaları burada ameliyat edilir; ameliyatı mini oyunlarla bizzat yapabilirsiniz.' },
    { id: 'ward', floor: 2, icon: '🛏️', name: 'Yatan Hasta & Pediatri Servisi', income: 200, cost: 35000, rep: 55, cases: 10,
      desc: 'Yeni kat: servis yatakları, pediatri, küvöz. Yatırılan hastaların serum/ilaç takibini yaparsınız; pediatri oyun alanı çocukların moralini yükseltir.' },
    { id: 'radiology', floor: 3, icon: '📡', name: 'Radyoloji & İleri Tanı Katı', income: 220, cost: 40000, rep: 65, cases: 25,
      desc: 'Yeni kat: röntgen, ultrason, EKG, MR ve diyaliz. "Daha fazla tetkik" kararları ve inme şüphesindeki görüntülemeler bu katta yapılır.' },
  ];

  const FLOOR_STAFF = {
    surgery: [
      { id: 'surgeon', name: 'Op. Dr. Selim Tan', role: 'Genel Cerrah', look: look('#2f9e8f', '#2f9e8f', '#2f9e8f', '#e8b48f', '#2b1d14', 'short', { cap: '#2f9e8f', mask: '#9fd8ec', scrubs: true, sleeve: '#2f9e8f' }),
        points: [[6.5, 4.5], [12.5, 3.5], [4.5, 5.5]], action: 'Doktorla Konuş', info: 'Ameliyat öncesi en az 2-3 dakika cerrahi el yıkama şart.', greet: ['Ameliyathane steril!', 'Bugün iki planlı ameliyat var.', 'Hoş geldiniz Başhekimim.'] },
      { id: 'anesth', name: 'Dr. Nil Er', role: 'Anestezi Uzmanı', look: look('#2f9e8f', '#2f9e8f', '#2f9e8f', '#f3cfb1', '#a0522d', 'bun', { cap: '#5aa9e6', mask: '#9fd8ec', scrubs: true, sleeve: '#2f9e8f' }),
        points: [[3.5, 3.4], [2.5, 5.5], [8.5, 4.5]], action: 'Doktorla Konuş', info: 'Anesteziden önce hastanın aç kalma süresini ve kullandığı ilaçları mutlaka sorgularız.', greet: ['Cihaz kontrolleri tamam.', 'Hastalar emin ellerde.', 'Merhaba!'] },
    ],
    ward: [
      { id: 'wardNurse', name: 'Hem. Ayla Demir', role: 'Servis Sorumlu Hemşiresi', look: look('#5aa9e6', '#5aa9e6', '#3d6a8e', '#c98d62', '#1c1c1c', 'bun'),
        points: [[4.5, 11.5], [5.5, 4.5], [12.5, 11.5]], action: 'Personelle Konuş', info: 'Yatan hastaların ilaç saatlerini ve düşme riskini düzenli takip ediyoruz.', greet: ['Servis sakin.', 'Vizitler tamamlandı.', 'Hoş geldiniz!'] },
      { id: 'pediatrician', name: 'Dr. Ozan Güler', role: 'Çocuk Hastalıkları Uzmanı', look: look('#fbfdff', '#f2cc8f', '#3d405b', '#e8b48f', '#7a5230', 'short', { stethoscope: true }),
        points: [[16.5, 3.5], [20.5, 4.5], [13.5, 4.5]], action: 'Doktorla Konuş', info: 'Çocuklarda doz ve tedavi kiloya göre hesaplanır; bu yüzden çocuk hekimi değerlendirmesi önemlidir.', greet: ['Minikler iyi!', 'Küvözler kontrol edildi.', 'Merhaba Başhekimim.'] },
    ],
    radiology: [
      { id: 'radiologist', name: 'Dr. Ece Tunç', role: 'Radyolog', look: look('#fbfdff', '#30638e', '#2f3e46', '#f6dcc7', '#4a3121', 'long'),
        points: [[4.5, 4.5], [19.5, 12.5], [10.5, 4.5]], action: 'Doktorla Konuş', info: 'Gereksiz görüntüleme radyasyon ve maliyet demek; doğru endikasyon çok önemli.', greet: ['Raporlar hazır.', 'Röntgen kalibre edildi.', 'Hoş geldiniz.'] },
      { id: 'dialysisNurse', name: 'Hem. Gökhan Uz', role: 'Diyaliz Hemşiresi', look: look('#5aa9e6', '#5aa9e6', '#3d6a8e', '#9c6b47', '#1c1c1c', 'short'),
        points: [[4.5, 11.5], [9.5, 11.5], [12.5, 12.5]], action: 'Personelle Konuş', info: 'Diyaliz hastalarında sıvı ve potasyum takibi hayati.', greet: ['Seanslar sorunsuz.', 'Makineler temizlendi.', 'Merhaba!'] },
    ],
  };
  const FLOOR_RESIDENTS = {
    surgery: [[16.5, 2.5, 12], [19.5, 2.5, 12]],
    ward: [[2.5, 2.5, 12], [8.5, 2.5, 12], [13.5, 10.5, 12], [19.5, 10.5, 12], [19.5, 2.5, 12, true]],
    radiology: [[3.5, 10.5, 9], [6.5, 10.5, 9], [12.5, 10.5, 9]],
  };

  // ================================================================ Durum & değiştiriciler
  const has = (group, id) => !!(S()[group] && S()[group][id]);
  // Vardiya sonu geliştirme mağazası (seviyeli)
  const DEV = [
    { id: 'speed', icon: '🏃', name: 'Başhekim Koşu Hızı', desc: 'Her seviye hareket hızını %15 artırır.', costs: [2500, 5000, 9000] },
    { id: 'treat', icon: '⚕️', name: 'Tedavi Hızı', desc: 'Her seviye stabilizasyon, muayene ve tahlil sürelerini %15 kısaltır.', costs: [3500, 7000, 12000] },
    { id: 'capacity', icon: '🏥', name: 'Hastane Kapasitesi', desc: 'Her seviye +2 hasta kapasitesi, ek bekleme koltukları ve %12 daha sık hasta (daha çok gelir).', costs: [4000, 8000, 13000] },
  ];
  const devLevel = (id) => { const d = S().dev; return d && d[id] ? d[id] : 0; };

  function baseMod(k) {
    const tf = Math.pow(0.85, devLevel('treat'));
    switch (k) {
      case 'labTime': return (has('upgrades', 'fastLab') ? 0.5 : 1) * (has('hires', 'labTech2') ? 0.7 : 1) * tf;
      case 'examTime': return tf;
      case 'spawnInterval': return (has('upgrades', 'comfort') ? 0.75 : 1) * Math.pow(0.88, devLevel('capacity'));
      case 'pharmacyWait': return has('hires', 'pharmTech') ? 0.85 : 1;
      case 'stabTime': return (has('hires', 'erNurse') ? 0.5 : 1) * tf;
      case 'playerSpeed': return 1 + 0.15 * devLevel('speed');
      case 'patienceDrain': return has('upgrades', 'comfort') ? 0.7 : 1;
      default: return 1;
    }
  }
  /**
   * Toplam değiştirici: temel yükseltmeler × personel (staff.js) × ekipman (equipment.js)
   * × hastane durumu (progress.js: ücret politikası, temizlik, konfor, olaylar).
   */
  function mod(k) {
    let v = baseMod(k);
    for (const m of [VH.staff, VH.equipment, VH.progress, VH.build, VH.floors]) if (m && m.factor) v *= m.factor(k);
    return v;
  }

  // ================================================================ KOMBO ZİNCİRİ
  // Bekletmeden (sabır/stabilite barı kırmızıya düşmeden) art arda doğru tedavi → 2x / 3x çarpan.
  const COMBO_WINDOW = 75;
  let gameTime = 0;
  const combo = { streak: 0, mult: 1, until: 0, best: 1, label: '' };
  function comboHit(quality, label) {
    if (quality < 0.3) { comboBreak('Hasta çok bekletildi'); return 1; }
    combo.streak = gameTime <= combo.until ? combo.streak + 1 : 1;
    combo.until = gameTime + COMBO_WINDOW;
    combo.mult = Math.min(3, combo.streak);
    combo.label = label;
    combo.best = Math.max(combo.best, combo.mult);
    if (shift.stats) shift.stats.bestCombo = Math.max(shift.stats.bestCombo, combo.mult);
    if (combo.mult >= 2) { UI().toast(`🔥 ${combo.mult}x ${label} Kombosu! Ödüller ${combo.mult} katı`, 2800); sound('combo'); }
    if (VH.emit) VH.emit('combo', combo.mult);
    return combo.mult;
  }
  function comboBreak(why) {
    if (combo.streak >= 2) UI().toast(`💔 Kombo bozuldu${why ? ': ' + why : ''}`, 2200);
    combo.streak = 0; combo.mult = 1; combo.until = 0;
  }

  // ================================================================ VARDİYA (NÖBET) DÖNGÜSÜ
  const SHIFT_LEN = 300; // oyun saniyesi
  const freshStats = () => ({ treated: 0, er: 0, erFail: 0, cases: 0, pharmacy: 0, angry: 0, rep0: S().reputation, budget0: S().budget, spent: 0, bestCombo: 1 });
  const shift = { n: 1, t: SHIFT_LEN, stats: null };
  let nightF = 0;
  const isNightShift = () => shift.n % 2 === 0;
  const erTimeBonus = () => (has('upgrades', 'erKit') ? 20 : 0) + (has('hires', 'erNurse') ? 10 : 0) + (VH.equipment ? VH.equipment.erBonus() : 0);
  const incomePerMin = () => SERVICES.reduce((s, sv) => s + (has('services', sv.id) ? sv.income : 0), 0);
  function level() {
    const st = S();
    const n = (o) => Object.keys(o || {}).filter((k) => o[k]).length;
    return 1 + n(st.services) * 2 + Math.floor((n(st.upgrades) + n(st.hires)) / 2);
  }

  function reward(rep, safety, budget) {
    const st = S();
    st.reputation = clamp(st.reputation + rep);
    st.safety = clamp(st.safety + safety);
    st.budget += budget;
  }

  // ================================================================ ACİL SERVİS
  const UNITS = {
    monitor: { name: 'Sedye + Monitör (ritim izlemi)', icon: '💓', tags: ['monitor', 'defibrillator'], device: 'Hasta Monitörü / Defibrilatör' },
    oxygen:  { name: 'Oksijen Ünitesi', icon: '🫁', tags: ['oxygen', 'ventilator'], device: 'Oksijen Tüpleri / Ventilatör' },
    iv:      { name: 'Serum (IV) Ünitesi', icon: '💧', tags: ['iv'], device: 'Serum (IV) Askısı' },
  };
  const ER_TYPES = [
    { id: 'asthma', name: 'Zeynep Ay', age: 19, sex: 'K', complaint: 'Şiddetli nefes darlığı, hırıltılı solunum', vitals: { pulse: 118, bp: '125/80', spo2: 87, temp: 36.8, mind: 'Açık, konuşmakta zorlanıyor' }, need: 'oxygen', time: 65,
      why: 'Oksijen satürasyonu düşük ve solunum sıkıntısı var: öncelik solunumu desteklemek.' },
    { id: 'chest', name: 'İsmail Karaca', age: 58, sex: 'E', complaint: 'Göğüste baskı tarzı ağrı, sol kola yayılıyor', vitals: { pulse: 110, bp: '150/95', spo2: 95, temp: 36.6, mind: 'Açık, terli' }, need: 'monitor', time: 70,
      why: 'Göğüs ağrısında kalp ritmi ve EKG izlemi hayati: hasta sedyeye ve monitöre alınmalı.' },
    { id: 'dehyd', name: 'Fadime Yılmaz', age: 81, sex: 'K', complaint: 'Üç gündür ishal, halsizlik, ağız kuruluğu', vitals: { pulse: 124, bp: '85/50', spo2: 96, temp: 37.4, mind: 'Uykuya meyilli' }, need: 'iv', time: 70,
      why: 'Tansiyon düşük, sıvı kaybı belirgin: damar yolundan sıvı desteği öncelikli.' },
    { id: 'hypo', name: 'Murat Şen', age: 44, sex: 'E', complaint: 'Diyabet hastası; terleme, titreme ve bilinç bulanıklığı', vitals: { pulse: 105, bp: '130/80', spo2: 98, temp: 36.5, mind: 'Bulanık' }, need: 'iv', time: 60,
      why: 'Bilinci bulanık diyabet hastasında kan şekeri düşüklüğü olabilir; ağızdan alamayacağı için damar yolu desteği gerekir.' },
    { id: 'arrhythmia', name: 'Selda Kara', age: 66, sex: 'K', complaint: 'Ani çarpıntı ve bayılacak gibi olma', vitals: { pulse: 162, bp: '100/60', spo2: 95, temp: 36.7, mind: 'Açık, sersem' }, need: 'monitor', time: 60,
      why: 'Çok hızlı nabız ve baygınlık hissi ritim bozukluğunu düşündürür: monitör izlemi ve defibrilatör hazır olmalı.' },
    { id: 'heat', name: 'Berk Aydın', age: 27, sex: 'E', complaint: 'Güneş altında çalışırken bulantı, kramp, aşırı terleme', vitals: { pulse: 120, bp: '95/60', spo2: 97, temp: 38.9, mind: 'Açık, bitkin' }, need: 'iv', time: 70,
      why: 'Sıcak çarpmasına bağlı sıvı-elektrolit kaybı: serin ortam ve damar yolundan sıvı.' },
    { id: 'trauma', name: 'Can Öz', age: 34, sex: 'E', complaint: 'Motosiklet kazası, sağ bacakta şekil bozukluğu', vitals: { pulse: 112, bp: '110/70', spo2: 97, temp: 36.6, mind: 'Açık, ağrılı' }, need: 'monitor', time: 75, trauma: true,
      why: 'Travma hastası sedyeye alınıp yaşamsal bulguları izlenmeli; ardından cerrahi değerlendirme gerekebilir.' },
    { id: 'allergy', name: 'Elif Duman', age: 23, sex: 'K', complaint: 'Fıstık yedikten sonra yüzde şişlik ve nefes darlığı', vitals: { pulse: 126, bp: '100/65', spo2: 90, temp: 36.9, mind: 'Açık, kaygılı' }, need: 'oxygen', time: 60,
      why: 'Alerjik reaksiyonda hava yolu tehlikede: oksijen desteği ve hızlı hekim müdahalesi.' },
  ];
  const ER_DOOR_OUT = [31.55, 16.5];
  const TRIAGE_SPOT = [29.5, 16.6];
  const BAYS = [
    { bed: [21.95, 13.5], via: [21, 14], occ: null },
    { bed: [21.95, 16.5], via: [21, 17], occ: null },
    { bed: [21.95, 19.5], via: [21, 20], occ: null },
  ];
  const er = { active: null, nextIn: 70, siren: 0, amb: null, warned: false, leaving: [], follow: null };

  // Ambulans rotası (araç merkezi, dünya koordinatı): ana caddenin kuzey şeridinden gelir,
  // ambulans yoluna döner, acil kapısının önünde durur; dönüşte güney şeridinden ayrılır.
  const AMB_IN = [[57, 33.95], [33.3, 33.95], [33.3, 16.5]];
  const AMB_OUT = [[33.3, 16.5], [33.3, 35.05], [57, 35.05]];
  function startEmergency(forced) {
    const pool = (VH.progress && VH.progress.erPool) ? VH.progress.erPool(ER_TYPES) : ER_TYPES;
    const def = forced ? (ER_TYPES.find((d) => d.id === forced) || pick(pool)) : pick(pool);
    er.siren = 4;
    sound('siren');
    er.amb = { pts: AMB_IN, i: 1, x: AMB_IN[0][0], y: AMB_IN[0][1], heading: 'W', phase: 'arrive', wait: 0, def, v: 7 };
    UI().toast('🚨 ACİL DURUM! Ambulans geliyor: ' + def.complaint, 4200);
    if (VH.emit) VH.emit('erStart', def);
  }

  /** Rota boyunca ilerle; son noktaya varınca true. Yaklaşırken yavaşlar, köşede yön değiştirir. */
  function driveAmb(amb, dt) {
    let remain = 0;
    for (let i = amb.i; i < amb.pts.length; i++) {
      const a = i === amb.i ? [amb.x, amb.y] : amb.pts[i - 1], b = amb.pts[i];
      remain += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    const target = amb.phase === 'arrive' ? Math.min(8, 1.4 + remain * 1.3) : Math.min(8, (amb.v || 1) + dt * 5);
    amb.v = target;
    let step = amb.v * dt;
    while (step > 0 && amb.i < amb.pts.length) {
      const [tx, ty] = amb.pts[amb.i];
      const dx = tx - amb.x, dy = ty - amb.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 1e-4 || Math.abs(dy) > 1e-4) amb.heading = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'W' : 'E') : (dy < 0 ? 'N' : 'S');
      if (d <= step) { amb.x = tx; amb.y = ty; amb.i++; step -= d; if (amb.phase === 'arrive' && amb.i < amb.pts.length) amb.v = Math.min(amb.v, 3.2); }
      else { amb.x += (dx / d) * step; amb.y += (dy / d) * step; step = 0; }
    }
    return amb.i >= amb.pts.length;
  }

  // Paramedik: hastayı tekerlekli sandalyede triyaja kadar iter, teslim eder, ambulansa döner.
  function makeParamedic(p) {
    const m = E().makeEntity('extra', { name: 'Paramedik', role: 'Paramedik', look: E().LOOKS.paramedic, x: p.x + 0.45, y: p.y + 0.35, speed: 1.6, floor: 0, trail: [] });
    E().extraPeople.push(m);
    return m;
  }
  // İki görevli sedyeyi taşır: biri arkadan iter (iz takibi), diğeri önden çeker (hareket yönünde)
  function updateOneMedic(m, dt, lead) {
    if (m.mode === 'push' && m.patient) {
      const p = m.patient, tr = m.trail;
      const last = tr[tr.length - 1];
      if (!last || Math.hypot(p.x - last[0], p.y - last[1]) > 0.05) tr.push([p.x, p.y]);
      let goal = null;
      if (lead) {
        const a = tr[Math.max(0, tr.length - 4)], b = tr[tr.length - 1];
        const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
        if (d > 0.05) goal = [p.x + (dx / d) * 0.7, p.y + (dy / d) * 0.7];
      } else {
        let acc = 0; goal = tr[0];
        for (let i = tr.length - 1; i > 0; i--) { acc += Math.hypot(tr[i][0] - tr[i - 1][0], tr[i][1] - tr[i - 1][1]); if (acc >= 0.7) { goal = tr[i - 1]; break; } }
      }
      if (goal) {
        const dx = goal[0] - m.x, dy = goal[1] - m.y, d = Math.hypot(dx, dy);
        if (d > 0.02) { const s = Math.min(d, 2.6 * dt); m.x += (dx / d) * s; m.y += (dy / d) * s; E().face(m, lead ? dx : p.x - m.x, lead ? dy : p.y - m.y); m.moving = true; m.anim += dt * 10; } else m.moving = false;
      }
      if (tr.length > 80) tr.splice(0, tr.length - 80);
    } else {
      if (m.mode === 'return' && m.wait > 0) { m.wait -= dt; if (m.wait <= 0) E().goTo(m, 31.6, lead ? 15.6 : 17.3, (e) => { e.gone = true; }); }
      E().stepPath(m, dt);
    }
  }
  function updateParamedic(dt) {
    for (const key of ['medic', 'medic2']) {
      const m = er[key];
      if (!m) continue;
      if (m.gone) { const i = E().extraPeople.indexOf(m); if (i >= 0) E().extraPeople.splice(i, 1); er[key] = null; continue; }
      updateOneMedic(m, dt, key === 'medic2');
    }
  }
  /** Acil vakayı kendiliğinden yönetebilecek personel (zemin kattaki uygun hemşire/doktor varlıkları). */
  function erTeam() {
    const ids = [];
    if (has("hires", "erDoctor")) ids.push("erDoctor");
    if (has("hires", "erNurse")) ids.push("erNurse");
    if (VH.staff) VH.staff.hired.filter((h) => h.role === "nurse" || h.role === "doctor").forEach((h) => ids.push(h.id));
    return ids.map((id) => E().staffById(id)).filter((s) => s && s.floor === 0 && !s.gone);
  }
  function paramedicHandover() {
    const m = er.medic;
    if (!m || m.mode !== 'push') return;
    const d = er.active && er.active.def;
    m.mode = 'return';
    m.bubble = { text: d ? `Teslim ediyorum: ${d.age} yaş, ${d.complaint.split(',')[0].toLowerCase()}. Nabız ${d.vitals.pulse}, SpO₂ %${d.vitals.spo2}.` : 'Hasta teslim edildi.', until: performance.now() + 4200 };
    m.wait = 2.5;
    if (er.medic2) { er.medic2.mode = 'return'; er.medic2.wait = 3.2; }
  }

  function ambulanceArrived(def) {
    const female = def.sex === 'K';
    const lk = E().randomPatientLook(def.age);
    lk.hairStyle = female ? pick(['long', 'bun', 'ponytail']) : pick(['short', 'bald', 'curly']);
    if (!female) lk.scarf = null; else lk.beard = false;
    lk.cane = false; lk.carry = null;
    const p = E().makeEntity('patient', {
      name: def.name, age: def.age, complaint: def.complaint, look: lk, erRef: def,
      x: ER_DOOR_OUT[0], y: ER_DOOR_OUT[1], speed: 1.25, state: 'er', timer: 0, floor: 0, stretcher: true,
    });
    E().patients.push(p);
    er.active = { def, p, timeLeft: def.time + erTimeBonus(), phase: 'arrive', wrong: new Set(), bay: null, stab: 0 };
    E().say(p, 'Yardım edin… lütfen!', 2600);
    er.medic = makeParamedic(p);
    er.medic.mode = 'push'; er.medic.patient = p;
    er.medic2 = makeParamedic(p); er.medic2.mode = 'push'; er.medic2.patient = p; er.medic2.x = p.x - 0.5; er.medic2.y = p.y - 0.2;
    er.medic2.look = Object.assign({}, er.medic2.look, { hairStyle: 'ponytail', skin: '#e8b48f', hair: '#4a3121', carry: null });
    E().goTo(p, TRIAGE_SPOT[0], TRIAGE_SPOT[1], () => { if (er.active && er.active.p === p) { er.active.phase = 'wait'; paramedicHandover(); } });
  }

  function vitalsNode(v) {
    const [sys] = String(v.bp).split('/').map(Number);
    const grid = el('div', { className: 'vitals' });
    const cell = (label, value, bad) => {
      const c = el('div', { className: 'vital' + (bad ? ' bad' : '') });
      c.appendChild(el('span', { className: 'v-label' }, label));
      c.appendChild(el('span', { className: 'v-val' }, value));
      grid.appendChild(c);
    };
    cell('Nabız', v.pulse + ' /dk', v.pulse > 100 || v.pulse < 50);
    cell('Tansiyon', v.bp + ' mmHg', sys < 90 || sys > 140);
    cell('SpO₂', '%' + v.spo2, v.spo2 < 94);
    cell('Ateş', v.temp.toLocaleString('tr-TR') + ' °C', v.temp >= 38);
    cell('Bilinç', v.mind, !/^Açık/.test(v.mind));
    return grid;
  }

  const fmtTime = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function openTriage(note) {
    const a = er.active, d = a.def;
    const node = el('div', {});
    node.appendChild(el('div', { className: 'er-timer' }, `⏱️ Kalan süre: ${fmtTime(a.timeLeft)}`));
    node.appendChild(el('p', {}, `Şikâyet: ${d.complaint}.`));
    node.appendChild(vitalsNode(d.vitals));
    if (note) node.appendChild(el('div', { className: 'warn' }, note));
    node.appendChild(el('div', { className: 'sec-title' }, 'Hızlı triyaj: hasta hangi üniteye alınmalı?'));
    Object.keys(UNITS).forEach((k) => {
      const u = UNITS[k];
      const b = el('button', { type: 'button', className: 'opt-btn' });
      const body = el('span', { className: 'opt-body' });
      body.appendChild(el('strong', {}, `${u.icon} ${u.name}`));
      if (has('hires', 'erDoctor') && k === d.need) body.appendChild(el('span', { className: 'opt-desc' }, '★ Acil Tıp Uzmanı önerisi'));
      else if (VH.equipment && VH.equipment.triageHint(k) && k === d.need) body.appendChild(el('span', { className: 'opt-desc' }, '📟 Gelişmiş izlem sistemi bu üniteyi öneriyor'));
      if (a.wrong.has(k)) { b.disabled = true; body.appendChild(el('span', { className: 'opt-desc' }, '✗ Uygun değil')); }
      b.appendChild(body);
      b.addEventListener('click', () => triage(k));
      node.appendChild(b);
    });
    node.appendChild(el('div', { className: 'disclaimer' }, 'Oyun içi sadeleştirilmiş triyajdır; gerçek acil durumda 112\'yi arayın.'));
    UI().openDialog({ icon: '🚨', title: `${d.name}, ${d.age} yaş`, subtitle: 'Acil Servis · Triyaj', wide: true, node, actions: [{ label: 'Kapat', ghost: true }] });
  }

  function triage(k, auto) {
    const a = er.active;
    if (!a) return;
    if (auto && UI().isDialogOpen() && document.querySelector('#dialog .er-timer')) UI().closeDialog(true);
    if (k !== a.def.need) {
      a.wrong.add(k);
      a.timeLeft -= 12;
      sound('error');
      comboBreak('yanlış triyaj');
      openTriage(`Yanlış ünite! −12 sn. Yaşamsal bulgulara tekrar bakın: hangisi en çok bozulmuş?`);
      return;
    }
    if (!auto) UI().closeDialog();
    const bay = BAYS.find((b) => !b.occ) || BAYS[0];
    bay.occ = a.p; a.bay = bay; a.phase = 'toBay';
    sound('ok');
    UI().toast(`✅ Doğru triyaj! Hastayı sedyeye alıyoruz. Şimdi ${UNITS[k].device} ile müdahale edin.`, 3600);
    E().goTo(a.p, bay.bed[0], bay.bed[1], (p) => {
      E().sitAt(p, bay.bed, 17);
      p.sitting = false; p.lying = true; p.chair = false; p.stretcher = false;
      if (er.active && er.active.p === p) er.active.phase = 'bay';
    }, bay.via);
  }

  function startStabilize(dv, byPlayer) {
    const a = er.active;
    a.phase = 'stab';
    a.stab = 3 * mod('stabTime');
    if (VH.equipment) a.stab *= VH.equipment.stabFactor(dv.tag);
    if (VH.emit) VH.emit('deviceUse', { tag: dv.tag });
    a.stabMax = a.stab;
    a.device = dv;
    UI().toast(`🩺 ${dv.name} ile stabilizasyon başladı. Cihazın yanında kalın!`, 2600);
    // Başhekim bizzat bağlıyorsa ünite mini oyunu: oksijen/serum bağlama ya da defibrilatör senkron şoku
    const MG = VH.minigames;
    if (byPlayer && MG && MG.enabled && !MG.active) {
      const done = (score) => {
        if (!er.active || er.active !== a) return;
        if (score >= 60) { a.stab *= score >= 85 ? 0.15 : 0.35; a.timeLeft += 4; UI().toast('⚡ Ustaca müdahale: stabilizasyon hızlandı (+4 sn)', 2400); }
        else if (score >= 30) a.stab *= 0.8;
      };
      if (dv.tag === 'oxygen' || dv.tag === 'ventilator' || dv.tag === 'iv') MG.flow(dv.tag, done);
      else if (dv.tag === 'defibrillator') MG.defib(done);
    }
  }

  function erSuccess() {
    const a = er.active, d = a.def;
    const ward = has('services', 'ward');
    const surgeryBonus = d.trauma && has('services', 'surgery');
    const max = d.time + erTimeBonus();
    const mult = comboHit(a.timeLeft / max, 'Acil Müdahale');
    const rep = 6 + Math.floor(a.timeLeft / 15) + (mult - 1) * 2;
    const budget = Math.round((2000 * (surgeryBonus ? 1.5 : 1) + (ward ? 500 : 0)) * mult);
    reward(rep, 3, budget);
    shift.stats.er++; addCase();
    if (a.p && E().floatText) { E().floatText(a.p.x, a.p.y, a.p.floor || 0, "+₺" + budget, "#ffd166", -12); E().floatText(a.p.x, a.p.y, a.p.floor || 0, "+★" + rep, "#8fe39f", 20); }
    if (VH.emit) VH.emit('erSuccess', { def: d, mult, timeLeft: a.timeLeft, max });
    sound('success');
    const node = el('div', {});
    node.appendChild(el('div', { className: 'grade', style: 'border-color:#46a758' }, '✅ Hasta stabilize edildi'));
    if (mult > 1) node.appendChild(el('div', { className: 'new-clue' }, `🔥 ${mult}x Acil Müdahale Kombosu: bütçe ödülü ${mult} katı, itibar +${(mult - 1) * 2}`));
    const deltas = el('div', { className: 'deltas' });
    deltas.appendChild(el('span', { className: 'delta up' }, `İtibar +${rep}`));
    deltas.appendChild(el('span', { className: 'delta up' }, 'Hasta Güvenliği +3'));
    deltas.appendChild(el('span', { className: 'delta up' }, `Bütçe +${money(budget)}`));
    deltas.appendChild(el('span', { className: 'delta' }, `Kalan süre: ${fmtTime(a.timeLeft)}`));
    node.appendChild(deltas);
    node.appendChild(el('p', { className: 'lesson' }, d.why));
    if (d.sources && VH.content) node.appendChild(VH.content.sourcesNode(d.sources));
    if (surgeryBonus) node.appendChild(el('p', { className: 'lesson' }, '🩻 Cerrahi servis: travma hastası ameliyathane değerlendirmesine alındı (ödül +%50).'));
    node.appendChild(el('p', { className: 'lesson' }, (VH.surgery && VH.surgery.wants(d) ? '🩻 Son adım: hasta ameliyat için 1. kattaki ameliyathaneye alınıyor. Asansörle çıkıp ameliyatı yapın (ya da cerrah üstlensin).' : VH.floors && VH.floors.wantsImagingER(d) ? '📡 Sonraki adım: hasta görüntüleme için 3. kattaki radyoloji birimine alınıyor.' : '💊 Son adım: hasta eczaneye geçiyor. Tezgâhta "İlaç Onayla" ile doğru bilgilendirmeyi yapıp taburcu edin.') + (ward ? ' Ardından gözlem için yatan hasta servisine alınacak (+₺500 dahil).' : '')));
    node.appendChild(el('div', { className: 'disclaimer' }, 'Eğitim amaçlı sadeleştirilmiş senaryodur.'));
    UI().openDialog({ icon: '🚑', title: 'Acil Müdahale Başarılı', subtitle: `${d.name}, ${d.age} yaş`, wide: true, node, actions: [{ label: 'Devam' }] });
    finishEmergency('pharmacy');
    persist();
  }

  function erFail() {
    const a = er.active, d = a.def;
    reward(-8, -10, 0);
    shift.stats.erFail++;
    if (VH.emit) VH.emit('erFail', { def: d });
    comboBreak('acil hasta sevk edildi');
    sound('error');
    UI().openDialog({
      icon: '⚠️', title: 'Süre doldu: hasta sevk edildi', subtitle: `${d.name}, ${d.age} yaş`,
      text: `Hasta zamanında stabilize edilemediği için başka bir hastaneye sevk edildi.\nİtibar −8 · Hasta Güvenliği −10\n\nDoğru yaklaşım: ${UNITS[d.need].name}. ${d.why}`,
    });
    finishEmergency('transfer');
    persist();
  }

  function finishEmergency(kind) {
    const a = er.active;
    const p = a.p;
    er.active = null;
    er.nextIn = rand(100, 160);
    er.warned = false;
    if (kind === 'pharmacy') { p.erStage = 'recover'; er.follow = { p, def: a.def }; }
    // Hasta kısa bir gözlemden sonra ayrılır (oyun zamanıyla)
    er.leaving.push({ a, p, kind, t: kind === 'transfer' ? 0.2 : 3.5 });
  }

  function updateLeaving(dt) {
    for (let i = er.leaving.length - 1; i >= 0; i--) {
      const L = er.leaving[i];
      L.t -= dt;
      if (L.t > 0) continue;
      er.leaving.splice(i, 1);
      const { a, p, kind } = L;
      if (a.bay) a.bay.occ = null;
      p.sitting = false; p.lying = false; p.lift = 0; p.chair = false; p.stretcher = false;
      // Ağır vakalar ameliyathaneye, inme şüphesi radyolojiye yönlenir (katlar açıksa)
      if (kind === 'pharmacy' && VH.surgery && VH.surgery.wants(a.def)) { er.follow = null; VH.surgery.admit(p, a.def); continue; }
      if (kind === 'pharmacy' && VH.floors && VH.floors.wantsImagingER(a.def)) { er.follow = null; VH.floors.sendImaging(p, { er: a.def }); continue; }
      if (kind === 'pharmacy') {
        // 4. adım: eczanede ilaç teslimi ve taburcu (Başhekim onayı)
        p.erStage = 'pharmacy';
        er.follow = { p, def: a.def };
        E().say(p, 'Çok daha iyiyim, teşekkürler! Eczaneye geçiyorum.', 2600);
        E().toPharmacy(p);
      } else E().goTo(p, 33.4, 21.5, (e) => { e.gone = true; });
    }
  }

  // Yatan hasta servisine yatış (2. kat, boş yatak)
  const admitted = [];
  function admitToWard(p) {
    const beds = M().floorObjects(2).filter((o) => o.tag === 'ward_bed').map((o) => [o.x + 0.5, o.y + 0.5]);
    const taken = (b) => E().patients.some((q) => q.floor === 2 && !q.gone && Math.abs(q.x - b[0]) < 0.1 && Math.abs(q.y - b[1]) < 0.1);
    let bed = beds.find((b) => !taken(b));
    if (!bed && admitted.length) { const old = admitted.shift(); old.gone = true; bed = [old.x, old.y]; }
    if (!bed) return;
    const r = E().addResident({ floor: 2, x: bed[0], y: bed[1], lift: 12, name: p.name, age: p.age, look: p.look, complaint: p.complaint + ' (acilden yatış)' });
    admitted.push(r);
  }

  function updateER(dt) {
    updateLeaving(dt);
    if (er.siren > 0) er.siren -= dt;
    // ambulans
    const amb = er.amb;
    updateParamedic(dt);
    if (amb) {
      if (amb.phase === 'arrive') {
        if (driveAmb(amb, dt)) { amb.phase = 'parked'; amb.wait = 7; amb.v = 0; ambulanceArrived(amb.def); }
      } else if (amb.phase === 'parked') {
        amb.wait -= dt;
        // paramedik dönene kadar bekler (en fazla 25 sn)
        if (amb.wait <= 0 && ((!er.medic && !er.medic2) || amb.wait < -18)) { if (er.medic) er.medic.gone = true; if (er.medic2) er.medic2.gone = true; amb.phase = 'leave'; amb.pts = AMB_OUT; amb.i = 1; amb.v = 0.5; }
      } else if (driveAmb(amb, dt)) er.amb = null;
    }
    const a = er.active;
    // Acil ekip otomasyonu: Acil Tıp Uzmanı / Acil Hemşiresi ya da MedKariyer'den alınan hemşire-doktor varsa
    // ambulans kapıya yanaştığı an biri dışarı çıkıp hastayı karşılar; triyaj ve stabilizasyonu ekip üstlenir.
    const team = erTeam();
    if (!a) {
      if (er.responder) { er.responder.busy = false; er.responder = null; }
      if (!er.amb) { er.nextIn -= dt; if (er.nextIn <= 0) startEmergency(); }
      return;
    }
    if (team.length && !er.responder && (a.phase === 'arrive' || a.phase === 'wait')) {
      const r = team[0];
      er.responder = r; r.busy = true; r.path = [];
      E().say(r, 'Acil ekibi geliyor, sedyeyi alıyorum!', 2400);
      E().goTo(r, ER_DOOR_OUT[0] - 0.9, ER_DOOR_OUT[1] + 0.6, (s) => {
        a.met = true;
        E().say(s, `${a.def.name}: hasta bende, acile alıyoruz!`, 2600);
        E().goTo(s, TRIAGE_SPOT[0] - 0.9, TRIAGE_SPOT[1] + 0.7, (s2) => E().faceToward(s2, a.p.x, a.p.y));
      });
    }
    a.timeLeft -= dt;
    if (a.timeLeft <= 10 && !er.warned) { er.warned = true; sound('alarm'); }
    // Otomasyon: Acil Tıp Uzmanı triyajı, acil hemşiresi stabilizasyonu kendiliğinden üstlenir
    const nurses = team.length;
    if (a.phase === "wait" && team.length) {
      a.autoT = (a.autoT || 0) + dt;
      if (a.autoT > (has("hires", "erDoctor") ? 3 : 5)) { UI().toast("🧑‍⚕️ Acil ekibi triyajı yaptı, hasta sedyeyle üniteye alınıyor.", 2400); triage(a.def.need, true); return; }
    }
    if (a.phase === 'bay' && nurses) {
      a.autoB = (a.autoB || 0) + dt;
      if (a.autoB > 6) { const dv = E().devices.find((d) => d.floor === 0 && UNITS[a.def.need].tags.includes(d.tag)); if (dv) { startStabilize(dv); a.auto = true; } }
    }
    if (a.phase === 'stab') {
      const P = E().player;
      const near = P.floor === 0 && E().rectDist(P.x, P.y, a.device) <= 1.4;
      const rate = near ? 1 : nurses ? 0.45 + 0.1 * Math.min(3, nurses) : 0;
      if (rate) {
        a.stab -= dt * rate;
        if (a.stab <= 0) { erSuccess(); return; }
      }
    }
    if (a.timeLeft <= 0) erFail();
  }

  // ================================================================ ECZANE
  const RX = {
    demir: { name: 'Demir takviyesi (hekim önerisiyle)', opts: [['Aç karnına, çay/kahveden en az 1 saat uzak; C vitamini içeren bir içecekle alın.', true], ['Kahvaltıda çayla birlikte alın, daha iyi emilir.', false], ['Kendinizi iyi hissedince dozu ikiye katlayabilirsiniz.', false]] },
    dvit: { name: 'D vitamini', opts: [['Yağ içeren bir öğünle birlikte, önerilen dozda alın.', true], ['Aç karnına, ne kadar çok o kadar iyi.', false], ['Artık güneşlenmenize gerek yok.', false]] },
    b12: { name: 'B12 vitamini', opts: [['Hekimin önerdiği doz ve süreyi aksatmadan kullanın; kontrol tahlilini atlamayın.', true], ['Belirtiler geçince hemen bırakın.', false], ['Enerji içeceklerindeki B12 yeterli, ilaca gerek yok.', false]] },
    magnezyum: { name: 'Magnezyum', opts: [['Akşam yemekten sonra alın; ishal yaparsa hekime bildirin.', true], ['Kramp olunca 3-4 tane birden alın.', false], ['Zayıflama çayıyla birlikte alın.', false]] },
    cinko: { name: 'Çinko', opts: [['Yemekle birlikte alın; demir takviyesiyle aynı saatte almayın.', true], ['Aç karnına alın, bulantı normaldir, devam edin.', false], ['Ne kadar uzun süre alırsanız o kadar iyi.', false]] },
    folat: { name: 'Folik asit', opts: [['Her gün aynı saatte, hekimin önerdiği süre boyunca alın.', true], ['Haftada bir kez toplu alın.', false], ['Artık yeşil yapraklı sebze yemenize gerek yok.', false]] },
    agri: { name: 'Ağrı kesici (kısa süreli)', opts: [['Tok karnına, önerilen en düşük dozda; birkaç günden uzun kullanmayın.', true], ['Her gün koruyucu olarak alın.', false], ['Mide yanarsa iki tane birden alın.', false]] },
    sivi: { name: 'Ağızdan sıvı-tuz (ORS) desteği', opts: [['Paketi tarif edilen miktarda suyla hazırlayıp yudum yudum için.', true], ['Daha etkili olsun diye az suyla koyu hazırlayın.', false], ['Kola ile karıştırın.', false]] },
    sevk: { name: 'Uzman/tetkik yönlendirme bilgilendirmesi', opts: [['Randevu bilgisini ve uyarı işaretlerini yazılı verin; bu belirtiler olursa acile başvursun.', true], ['Uzmana gerek yok, takviye ile geçer deyin.', false], ['İnternetten araştırmasını önerin.', false]] },
  };
  RX.inhaler = { name: 'Kurtarıcı inhaler (hekim reçetesiyle)', opts: [['Önce nefesinizi verin, inhaleri sıkarken yavaş ve derin nefes alın, 10 sn tutun; sık ihtiyaç olursa hekime başvurun.', true], ['Rahatlayana kadar art arda istediğiniz kadar sıkın.', false], ['Nefes darlığı geçince ilacı bir kenara atabilirsiniz.', false]] };
  RX.seker = { name: 'Kan şekeri düşüklüğü bilgilendirmesi', opts: [['Titreme-terlemede hemen hızlı şeker alın, 15 dk sonra ölçün; ilaç dozlarınızı hekiminizle gözden geçirin.', true], ['Şeker düşerse ilacınızın dozunu kendiniz artırın.', false], ['Öğün atlamanın bir sakıncası yok.', false]] };
  RX.alerji = { name: 'Alerji bilgilendirmesi', opts: [['Fıstık içeren ürünlerden kaçının, etiket okuyun; hekim yazdıysa adrenalin oto-enjektörünü yanınızda taşıyın.', true], ['Az miktarda yemekte sakınca yok.', false], ['Belirti olursa beklemeniz yeterli.', false]] };
  const ER_RX = { asthma: 'inhaler', chest: 'sevk', dehyd: 'sivi', hypo: 'seker', arrhythmia: 'sevk', heat: 'sivi', trauma: 'agri', allergy: 'alerji' };
  const CASE_RX = { c01: 'demir', c02: 'b12', c03: 'magnezyum', c04: 'dvit', c05: 'sevk', c06: 'folat', c07: 'cinko', c08: 'sevk', c09: 'magnezyum', c10: 'sevk', c11: 'sevk', c12: 'sevk', c13: 'sevk', c14: 'dvit' };
  const COMPLAINT_RX = [[/yorgun|halsiz/i, 'demir'], [/kramp|uyku|baş ağrı/i, 'magnezyum'], [/eklem|ağrı/i, 'agri'], [/saç/i, 'cinko'], [/uyuşma|dikkat/i, 'b12'], [/mide|iştah/i, 'sivi']];

  // Şikâyete uygun reçete adayları; son verilen 3 bilgilendirme tekrar edilmez
  const COMPLAINT_POOL = [[/yorgun|halsiz/i, ['demir', 'b12', 'dvit', 'folat']], [/kramp/i, ['magnezyum', 'sivi']], [/uyku/i, ['magnezyum', 'kafein']], [/baş ağrı/i, ['agri', 'sivi', 'kafein']],
    [/eklem|ağrı/i, ['agri', 'dvit']], [/saç/i, ['cinko', 'demir', 'folat']], [/uyuşma|dikkat/i, ['b12', 'folat']], [/mide|iştah/i, ['sivi', 'laktoz', 'ppi']], [/baş dönmesi/i, ['sivi', 'demir']], [/nefes/i, ['demir', 'inhaler']]];
  const recentRx = [];
  function rxFor(p) {
    if (p.erRef) return ER_RX[p.erRef.id] || 'sevk';
    if (p.caseRef) return p.caseChoice && p.caseChoice !== 'complete' ? 'sevk' : CASE_RX[p.caseRef.id] || 'dvit';
    const hit = COMPLAINT_POOL.find(([re]) => re.test(p.complaint || ''));
    const all = Object.keys(RX).filter((k) => !['sevk', 'karbon', 'inme', 'antibiyotik', 'koah', 'alerji', 'seker', 'gut', 'metformin', 'ppi', 'levotiroksin', 'antikoagulan'].includes(k));
    let cand = (hit ? hit[1] : all).filter((k) => RX[k] && !recentRx.includes(k));
    if (!cand.length) cand = all.filter((k) => !recentRx.includes(k));
    const k = pick(cand.length ? cand : all);
    recentRx.push(k); if (recentRx.length > 3) recentRx.shift();
    return k;
  }

  function openPharmacy(p) {
    p.rx = p.rx || rxFor(p);
    if (VH.logistics && !VH.logistics.canDispense(p)) {
      const cat = VH.logistics.catOf(p.rx);
      UI().openDialog({ icon: '📦', title: 'Stokta yok', subtitle: `${RX[p.rx].name} · ${cat ? cat.name : ''}`,
        text: `Bu hastanın ilacı stokta kalmadı. Başhekimlik bilgisayarındaki Stok & Lojistik uygulamasından sipariş verin; lojistik aracı ilacı eczaneye getirecek.\nHasta beklerken sabrı azalıyor.`,
        actions: [{ label: '🖥️ Terminale git', fn: () => { UI().closeDialog(); if (VH.terminal) VH.terminal.guide(); } }, { label: 'Kapat', ghost: true }] });
      return;
    }
    p.timer = Math.max(p.timer, 25); // bilgilendirme sırasında beklesin
    const rx = RX[p.rx];
    // Önce hızlı reçete hazırlama mini oyunu (hasta başına bir kez); ardından bilgilendirme seçenekleri
    const MG = VH.minigames;
    if (!p.rxPrepared && MG && MG.enabled && !MG.active) {
      UI().closeDialog(true);
      MG.pharmacy(p, p.rx, rx.name, (score) => {
        p.rxPrepared = true;
        if (score >= 70) { S().budget += 120; p.patience = Math.min(100, (p.patience || 0) + 15); if (E().floatText) E().floatText(p.x, p.y, p.floor || 0, '+₺120', '#ffd166'); }
        if (!p.gone && E().pharmacyQueue.includes(p)) openPharmacy(p);
      });
      return;
    }
    if (!p.rxOrder) p.rxOrder = rx.opts.map((o, i) => i).sort(() => Math.random() - 0.5);
    const node = el('div', {});
    node.appendChild(el('p', {}, `Hasta: ${p.name}${p.age ? ', ' + p.age + ' yaş' : ''}`));
    node.appendChild(el('p', {}, `Teslim edilecek: 💊 ${rx.name}`));
    node.appendChild(el('div', { className: 'sec-title' }, 'Hastaya hangi bilgilendirmeyi yapacaksınız?'));
    p.rxOrder.forEach((i) => {
      const [text, ok] = rx.opts[i];
      const b = el('button', { type: 'button', className: 'opt-btn' });
      b.appendChild(el('span', { className: 'opt-body' }, text));
      b.addEventListener('click', () => counsel(p, ok, rx));
      node.appendChild(b);
    });
    if (rx.sources && VH.content) node.appendChild(VH.content.sourcesNode(rx.sources));
    node.appendChild(el('div', { className: 'disclaimer' }, 'Takviye ve ilaçlar yalnızca hekim/eczacı önerisiyle kullanılmalıdır.'));
    UI().openDialog({ icon: '💊', title: 'İlaç Onayı & Bilgilendirme', subtitle: 'Eczane', wide: true, node, actions: [{ label: 'Kapat', ghost: true }] });
  }

  function counsel(p, ok, rx) {
    const correct = rx.opts.find((o) => o[1])[0];
    if (VH.logistics) VH.logistics.consume(p);
    let mult = 1, bonus = 0;
    if (ok) {
      mult = comboHit((p.erRef ? 1 : (p.patience === undefined ? 100 : p.patience) / 100), 'Eczane');
      bonus = 400 * (has('upgrades', 'digitalPharmacy') ? 2 : 1) * mult;
      reward(mult, 0, bonus); sound('success');
      shift.stats.pharmacy++;
      if (VH.emit) VH.emit('counsel', { p, mult });
    } else { reward(-1, -1, 0); sound('error'); comboBreak('yanlış ilaç bilgisi'); }
    E().say(p, ok ? 'Çok net anlattınız, teşekkürler!' : 'Hmm… emin değilim.', 2600);
    const ward = p.erRef && has('services', 'ward');
    UI().openDialog({
      icon: ok ? '✅' : '⚠️', title: ok ? 'Doğru bilgilendirme' : 'Eksik/yanlış bilgilendirme', subtitle: rx.name,
      text: (ok ? `Hasta ilacını doğru kullanacak. Bütçe +${money(bonus)} · İtibar +${mult}${mult > 1 ? `  (🔥 ${mult}x kombo)` : ''}` : `Doğrusu: ${correct}\nİtibar −1 · Hasta Güvenliği −1`)
        + (p.erRef ? `\n\n✅ Acil vaka tamamlandı: ${ward ? 'hasta gözlem için yatan hasta servisine alınıyor.' : 'hasta taburcu edildi.'}` : ''),
    });
    if (p.erRef) p.erStage = 'done';
    E().approvePharmacy(p, ward ? [29.5, 10.4, (e) => admitToWard(e)] : null);
    persist();
  }

  // ================================================================ YÖNETİM & İNŞA PANELİ
  let panelTab = 'genel';
  // Tüm oyun boyunca tamamlanan toplam vaka (taburcu + acil stabilizasyon); kat kilitleri bunu kullanır
  const casesTotal = () => S().casesTotal || 0;
  function addCase() { S().casesTotal = casesTotal() + 1; }
  /** Kilit şartları: her biri ✓/✗ ile gösterilir. */
  function reqList(item) {
    const st = S();
    const out = [{ k: "budget", label: "Bütçe", need: money(item.cost), have: money(st.budget), ok: st.budget >= item.cost && st.budget > 0 },
      { k: "rep", label: "İtibar Puanı", need: "≥ " + item.rep, have: String(st.reputation), ok: st.reputation >= item.rep }];
    if (item.cases) out.push({ k: "cases", label: "Toplam Tamamlanan Vaka", need: "≥ " + item.cases, have: String(casesTotal()), ok: casesTotal() >= item.cases });
    return out;
  }
  function reqNode(item) {
    const box = el("div", { className: "req-list" });
    reqList(item).forEach((r) => box.appendChild(el("span", { className: "req " + (r.ok ? "ok" : "no") }, (r.ok ? "✓ " : "✗ ") + r.label + ": " + r.have + " / " + r.need)));
    return box;
  }
  function canBuy(item, owned) {
    if (owned) return 'Sahipsiniz';
    if (S().reputation < item.rep) return `İtibar ${item.rep} gerekli`;
    if (item.cases && casesTotal() < item.cases) return `${item.cases} tamamlanan vaka gerekli (${casesTotal()})`;
    if (S().budget <= 0) return 'Bütçe ekside';
    if (S().budget < item.cost) return 'Bütçe yetersiz';
    return null;
  }

  function buy(group, item, rerender) {
    const st = S();
    if (canBuy(item, has(group, item.id))) return;
    st.budget -= item.cost;
    if (shift.stats) shift.stats.spent += item.cost;
    st[group] = st[group] || {};
    st[group][item.id] = true;
    sound('success');
    if (VH.emit) VH.emit('buy', { group, id: item.id });
    if (group === 'hires') E().addStaff(Object.assign({ id: item.id }, item.staff), 0);
    if (group === 'services') { setupService(item.id); UI().toast(`🏗️ ${item.name} açıldı! Asansörle ${M().floorName(item.floor)}'a çıkabilirsiniz.`, 4200); }
    else UI().toast(`✅ ${item.name} hazır.`, 2600);
    persist();
    if (rerender) rerender(); else openPanel(panelTab);
  }

  function itemCard(group, item, rerender) {
    const owned = has(group, item.id);
    const card = el('div', { className: 'shop-card' + (owned ? ' owned' : '') });
    card.appendChild(el('div', { className: 'shop-icon' }, item.icon));
    const body = el('div', { className: 'shop-body' });
    body.appendChild(el('strong', {}, item.name));
    body.appendChild(el('span', { className: 'opt-desc' }, item.desc));
    if (group === "services" && !owned) body.appendChild(reqNode(item));
    else     body.appendChild(el('span', { className: 'shop-meta' }, `${money(item.cost)} · İtibar ≥ ${item.rep}${item.cases ? ' · Vaka ≥ ' + item.cases : ''}`));
    card.appendChild(body);
    const why = canBuy(item, owned);
    const label = owned ? '✓ Aktif' : group === 'hires' ? 'İşe al' : group === 'services' ? 'İnşa et' : 'Satın al';
    const b = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why && !owned ? why : label);
    b.disabled = !!why;
    b.addEventListener('click', () => buy(group, item, rerender));
    card.appendChild(b);
    return card;
  }

  function openPanel(tab) {
    if (VH.os && VH.os.isOpen()) { VH.os.openTab(tab || panelTab); return; }
    const prevDlg = document.getElementById('dialog');
    const keepScroll = prevDlg && prevDlg.dataset.panel === (tab || panelTab) ? (prevDlg.querySelector('.dlg-body') || {}).scrollTop || 0 : 0;
    panelTab = tab || panelTab;
    const remote = VH.terminal && !VH.terminal.atDesk();
    if (remote && !VH.terminal.REMOTE_OK.includes(panelTab)) panelTab = 'ozet';
    const st = S();
    const node = el('div', {});
    const stats = el('div', { className: 'exam-meta' });
    [`🏥 Hastane Seviyesi ${level()}`, `💰 ${money(st.budget)}`, `💎 İtibar ${st.reputation}`, `🛡️ Güvenlik ${st.safety}`, `📈 Pasif gelir ${money(incomePerMin())}/dk`]
      .forEach((t) => stats.appendChild(el('span', {}, t)));
    node.appendChild(stats);
    const tabs = el('div', { className: 'tabs' });
    const extTabs = (VH.panelTabs || []).slice().sort((a, b) => (a.order || 50) - (b.order || 50));
    const first = extTabs.filter((t) => (t.order || 50) <= 5), rest = extTabs.filter((t) => (t.order || 50) > 5);
    first.map((t) => [t.id, t.label]).concat([['genel', 'Genel'], ['servis', 'Servisler & Katlar'], ['gelisim', 'Gelişim'], ['yukseltme', 'Yükseltmeler'], ['personel', 'Uzman Kadro']], rest.map((t) => [t.id, t.label])).filter(([id]) => !remote || VH.terminal.REMOTE_OK.includes(id)).forEach(([id, label]) => {
      const b = el('button', { type: 'button', className: 'tab' + (panelTab === id ? ' on' : '') }, label);
      b.addEventListener('click', () => openPanel(id));
      tabs.appendChild(b);
    });
    node.appendChild(tabs);
    const list = el('div', { className: 'shop' });
    if (panelTab === 'genel') {
      const solved = st.solved.length;
      const n = (o) => Object.keys(o || {}).filter((k) => o[k]).length;
      list.appendChild(el("p", {}, `Toplam tamamlanan vaka: ${casesTotal()} · Çözülen dedektif vakası: ${solved} · Yükseltme: ${n(st.upgrades)}/${UPGRADES.length} · Personel: ${n(st.hires)}/${HIRES.length} · Servis: ${n(st.services)}/${SERVICES.length}`));
      list.appendChild(el('p', { className: 'muted' }, 'Bütçe; vakalar, acil müdahaleler, eczane bilgilendirmeleri, taburcu edilen hastalar ve açılan servislerin pasif gelirinden gelir. İtibar yeni yatırımların kilidini açar.'));
      const ul = el('ul', { className: 'plan' });
      ['Doğru ve güvenli klinik kararlar → itibar ve bütçe', 'Acil vakaları süre bitmeden stabilize edin', 'Eczanede doğru kullanım bilgisini verin', 'Yeni katlar açarak hastaneyi büyütün']
        .forEach((t) => ul.appendChild(el('li', {}, t)));
      list.appendChild(ul);
      // Kayıt bilgisi ve sıfırlama
      const sv = VH.save;
      const when = sv && sv.lastSavedAt ? new Date(sv.lastSavedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—';
      list.appendChild(el('p', { className: 'muted' }, sv && sv.enabled
        ? `💾 Otomatik kayıt açık (her 15 sn ve her önemli olayda). Son kayıt: ${when}`
        : '💾 Bu tarayıcıda kayıt kullanılamıyor (gizli mod ya da depolama kapalı). İlerleme oturum sonunda kaybolur.'));
      const row = el('div', { className: 'dlg-actions', style: 'justify-content:flex-start' });
      const saveBtn = el('button', { type: 'button', className: 'dlg-btn ghost' }, '💾 Şimdi kaydet');
      saveBtn.addEventListener('click', () => { const ok = sv && sv.save(); UI().toast(ok ? '💾 Kaydedildi' : 'Kayıt yapılamadı', 1800); openPanel('genel'); });
      const resetBtn = el('button', { type: 'button', className: 'dlg-btn ghost' }, '🗑️ İlerlemeyi sıfırla');
      resetBtn.addEventListener('click', confirmReset);
      row.appendChild(saveBtn); row.appendChild(resetBtn);
      list.appendChild(row);
    } else if (panelTab === 'yukseltme') UPGRADES.forEach((u) => list.appendChild(itemCard('upgrades', u)));
    else if (panelTab === 'gelisim') list.appendChild(devCards(() => openPanel('gelisim')));
    else if (panelTab === 'personel') HIRES.forEach((u) => list.appendChild(itemCard('hires', u)));
    else if (panelTab === 'servis') SERVICES.forEach((u) => list.appendChild(itemCard('services', u)));
    else { const ext = extTabs.find((t) => t.id === panelTab); if (ext) ext.render(list, () => openPanel(panelTab)); else SERVICES.forEach((u) => list.appendChild(itemCard('services', u))); }
    if (panelTab === 'genel' && VH.progress && VH.progress.renderGeneral) VH.progress.renderGeneral(list, () => openPanel('genel'));
    node.appendChild(list);
    const atDesk = VH.terminal && VH.terminal.atDesk();
    UI().openDialog({ icon: atDesk ? '🖥️' : '🏗️', title: atDesk ? 'Başhekimlik Bilgisayarı · Yönetim Terminali' : 'Yönetim Paneli (uzaktan)', subtitle: atDesk ? 'Stok · Bakım · İş ilanları · Personel · Servisler' : 'Sipariş ve işe alım için Başhekimlik odasındaki bilgisayara gidin', wide: true, node, scrollTop: keepScroll, actions: [{ label: 'Kapat', ghost: true }] });
    const dlg = document.getElementById('dialog'); if (dlg) { dlg.dataset.panel = panelTab; dlg.classList.add('panel'); dlg.classList.toggle('terminal', !!atDesk); }
  }

  // ---------------------------------------------------------------- Geliştirme mağazası & nöbet özeti
  function buyDev(id, rerender) {
    const d = DEV.find((x) => x.id === id);
    const lvl = devLevel(id);
    if (!d || lvl >= d.costs.length) return false;
    const cost = d.costs[lvl];
    if (S().budget < cost || S().budget <= 0) { UI().toast('Bütçe yetersiz', 1800); return false; }
    S().budget -= cost;
    S().dev = S().dev || {};
    S().dev[id] = lvl + 1;
    shift.stats.spent += cost;
    sound('success');
    persist();
    if (rerender) rerender();
    return true;
  }

  function devCards(rerender) {
    const box = el('div', { className: 'shop' });
    DEV.forEach((d) => {
      const lvl = devLevel(d.id), max = d.costs.length;
      const card = el('div', { className: 'shop-card' + (lvl >= max ? ' owned' : '') });
      card.appendChild(el('div', { className: 'shop-icon' }, d.icon));
      const body = el('div', { className: 'shop-body' });
      body.appendChild(el('strong', {}, d.name));
      body.appendChild(el('span', { className: 'opt-desc' }, d.desc));
      body.appendChild(el('span', { className: 'pips' }, '●'.repeat(lvl) + '○'.repeat(max - lvl) + `  Seviye ${lvl}/${max}`));
      card.appendChild(body);
      const cost = d.costs[lvl];
      const short = lvl < max && S().budget < cost;
      const b = el('button', { type: 'button', className: 'dlg-btn' + (lvl >= max || short ? ' ghost' : '') }, lvl >= max ? '✓ Maks.' : `Yükselt ${money(cost)}`);
      b.disabled = lvl >= max || short;
      b.addEventListener('click', () => buyDev(d.id, rerender));
      card.appendChild(b);
      box.appendChild(card);
    });
    return box;
  }

  function endShift() {
    const st = shift.stats;
    const summary = {
      n: shift.n, night: isNightShift(), treated: st.treated, er: st.er, erFail: st.erFail, cases: st.cases, pharmacy: st.pharmacy, angry: st.angry,
      rep: S().reputation - st.rep0, income: Math.round(S().budget - st.budget0 + st.spent), bestCombo: st.bestCombo,
    };
    // Modüller (maaş bordrosu, bakım, değerlendirme) özete ek kart ekler
    summary.extra = [];
    if (VH.emit) VH.emit('shiftEnd', summary);
    const { extra } = summary;
    delete summary.extra;
    S().shiftLog = (S().shiftLog || []).concat([summary]).slice(-10);
    VH.paused = true;
    sound('notify');
    persist();
    openShiftSummary(summary, extra);
  }

  function openShiftSummary(sm, extra) {
    const node = el('div', { className: 'shift' });
    const grid = el('div', { className: 'shift-grid' });
    const card = (icon, label, value, cls) => {
      const c = el('div', { className: 'shift-card' + (cls ? ' ' + cls : '') });
      c.appendChild(el('span', { className: 'sc-icon' }, icon));
      c.appendChild(el('span', { className: 'sc-val' }, value));
      c.appendChild(el('span', { className: 'sc-label' }, label));
      grid.appendChild(c);
    };
    card('🧑‍⚕️', 'Tedavi edilen hasta', String(sm.treated + sm.er));
    card('🚑', 'Acil müdahale', `${sm.er}${sm.erFail ? ' (' + sm.erFail + ' sevk)' : ''}`, sm.erFail ? 'warn-c' : '');
    card('★', 'Kazanılan itibar', (sm.rep >= 0 ? '+' : '') + sm.rep, sm.rep >= 0 ? 'up-c' : 'down-c');
    card('💰', 'Nöbet geliri', money(sm.income), sm.income >= 0 ? 'up-c' : 'down-c');
    card('📋', 'Çözülen vaka', String(sm.cases));
    card('💊', 'Eczane bilgilendirme', String(sm.pharmacy));
    card('🔥', 'En iyi kombo', sm.bestCombo + 'x');
    card('😤', 'Bekleyip giden', String(sm.angry), sm.angry ? 'warn-c' : '');
    (extra || []).forEach((x) => card(x.icon, x.label, x.value, x.cls));
    node.appendChild(grid);
    node.appendChild(el('div', { className: 'sec-title' }, `Geliştirme Mağazası · Bütçe ${money(S().budget)}`));
    const rerender = () => { UI().openDialog(spec()); };
    node.appendChild(devCards(rerender));
    node.appendChild(el('div', { className: 'sec-title' }, 'Yeni servis katları'));
    const sv = el('div', { className: 'shop' });
    SERVICES.forEach((s) => sv.appendChild(itemCard('services', s, rerender)));
    node.appendChild(sv);
    const spec = () => ({
      icon: sm.night ? '🌙' : '☀️', title: `Nöbet Özeti · ${sm.n}. ${sm.night ? 'Gece' : 'Gündüz'} Nöbeti`,
      subtitle: 'Kazandığınız bütçeyle başhekimi ve hastaneyi geliştirin', wide: true, node: (() => { const n2 = node.cloneNode(false); return rebuild(n2); })(),
      actions: [{ label: `▶ ${sm.n + 1}. nöbete başla (${(sm.n + 1) % 2 === 0 ? 'Gece' : 'Gündüz'})`, fn: startNextShift }],
      onClose: startNextShift,
    });
    // Kart içerikleri bütçe değiştikçe yeniden üretilir
    function rebuild(n2) {
      n2.appendChild(grid);
      n2.appendChild(el('div', { className: 'sec-title' }, `Geliştirme Mağazası · Bütçe ${money(S().budget)}`));
      n2.appendChild(devCards(rerender));
      n2.appendChild(el('div', { className: 'sec-title' }, 'Yeni servis katları'));
      const sv2 = el('div', { className: 'shop' });
      SERVICES.forEach((s) => sv2.appendChild(itemCard('services', s, rerender)));
      n2.appendChild(sv2);
      return n2;
    }
    UI().openDialog(spec());
  }

  function startNextShift() {
    if (!VH.paused) return;
    UI().closeDialog(true);
    shift.n += 1;
    shift.t = SHIFT_LEN;
    shift.stats = freshStats();
    VH.paused = false;
    UI().toast(isNightShift() ? `🌙 ${shift.n}. Gece Nöbeti başladı` : `☀️ ${shift.n}. Gündüz Nöbeti başladı`, 2600);
    if (VH.emit) VH.emit('shiftStart', shift.n);
    persist();
  }

  function confirmReset() {
    UI().openDialog({
      icon: '🗑️', title: 'İlerleme sıfırlansın mı?', subtitle: 'Bu işlem geri alınamaz',
      text: 'Bütçe, itibar, açılan katlar, personel, yükseltmeler ve vaka arşivi silinir; oyun baştan başlar.',
      actions: [
        { label: 'Vazgeç', ghost: true, fn: () => openPanel('genel') },
        { label: 'Evet, sıfırla', fn: () => { if (VH.save) VH.save.reset(); window.__vhNoSave = true; location.reload(); } },
      ],
    });
  }

  // ================================================================ KATLAR & ASANSÖR
  const setupDone = {};
  function setupService(id) {
    if (setupDone[id]) return;
    setupDone[id] = true;
    const sv = SERVICES.find((s) => s.id === id);
    (FLOOR_STAFF[id] || []).forEach((d) => E().addStaff(d, sv.floor));
    (FLOOR_RESIDENTS[id] || []).forEach(([x, y, lift, child]) => {
      const lk = E().randomPatientLook();
      if (child) lk.scale = 0.74;
      E().addResident({ floor: sv.floor, x, y, lift, look: lk, age: child ? 7 : undefined });
    });
  }

  /** Kat erişime açık mı (zemin, B1 veya inşa edilmiş servis). */
  function floorOpen(f) {
    const d = M().FLOOR_DEFS[f];
    if (!d) return false;
    if (f === 0 || d.alwaysOpen) return true;
    const sv = SERVICES.find((s) => s.floor === f);
    return !!(sv && has("services", sv.id));
  }
  const serviceOfFloor = (f) => SERVICES.find((s) => s.floor === f) || null;
  function travel(f) {
    const P = E().player;
    UI().closeDialog();
    if (f === P.floor) return;
    P.floor = f;
    const [ax, ay] = M().floorArrive(f);
    P.x = ax; P.y = ay; P.path = [];
    M().setFloor(f);
    const cam = M().camera;
    cam.centerOnWorld(P.x, P.y);
    cam.zoom = (cam.base || cam.zoom) * 0.72; cam.glide(cam.base || 1.2);
    cam.follow = true;
    UI().setToggle('btn-follow', true);
    sound('door');
    UI().toast((floorOpen(f) ? "🛗 " : "🔒 Önizleme · ") + M().floorName(f), 2200);
  }

  function openElevator() {
    const P = E().player;
    const node = el('div', { className: 'shop' });
    M().FLOOR_DEFS.forEach((d, f) => {
      const sv = SERVICES.find((s) => s.floor === f);
      const open = floorOpen(f);
      const card = el("div", { className: "shop-card" + (f === P.floor ? " owned" : "") + (open ? "" : " locked-card") });
      card.appendChild(el('div', { className: 'shop-icon' }, f === 0 ? '🏥' : sv ? sv.icon : '🍽️'));
      const body = el('div', { className: 'shop-body' });
      body.appendChild(el('strong', {}, d.name));
      body.appendChild(el("span", { className: "opt-desc" }, f === P.floor ? "Buradasınız" : open ? "Erişime açık" : "🔒 Kilitli · Başhekim bilgisayarındaki Yönetim Panelinden inşa edin"));
      if (!open && sv) body.appendChild(reqNode(sv));
      card.appendChild(body);
      const b = el("button", { type: "button", className: "dlg-btn" + (f !== P.floor && open ? "" : " ghost") }, f === P.floor ? "Buradasınız" : open ? "Git" : "👁 Önizle");
      b.title = open ? "" : "Kilitli katı gri tonlu önizleme modunda gezin";
      b.disabled = f === P.floor;
      b.addEventListener('click', () => travel(f));
      card.appendChild(b);
      node.appendChild(card);
    });
    UI().openDialog({ icon: '🛗', title: 'Asansör', subtitle: 'Kat seçin', wide: true, node, actions: [{ label: '🏗️ Yönetim Paneli', fn: () => openPanel('servis') }, { label: 'Kapat', ghost: true }] });
  }

  // ================================================================ Etkileşim yönlendirme
  function handleInteract(t) {
    if (t.type === 'device' && t.ref.tag === 'elevator') { openElevator(); return true; }
    if (t.type === 'device' && t.ref.tag === 'chief_desk') { if (VH.terminal) VH.terminal.open(); else openPanel('genel'); return true; }
    // Eczane
    const isPharm = (t.type === 'staff' && t.ref.id === 'pharmacist') || (t.type === 'device' && t.ref.tag === 'pharmacy_counter');
    if (isPharm && E().pharmacyFront) { openPharmacy(E().pharmacyFront); return true; }
    // Acil
    const a = er.active;
    if (t.type === 'patient' && t.ref.erRef) {
      if (!a || a.p !== t.ref) return true;
      if (a.phase === 'arrive' || a.phase === 'wait') openTriage();
      else UI().openDialog({ icon: '🚑', title: `${a.def.name}, ${a.def.age} yaş`, subtitle: `Kalan süre ${fmtTime(a.timeLeft)}`,
        text: a.phase === 'toBay' ? 'Hasta sedyeye alınıyor…' : `Gerekli müdahale: ${UNITS[a.def.need].device}. Cihazın yanına gidip "Acil Müdahale" seçin ve stabilizasyon bitene kadar yanında kalın.` });
      return true;
    }
    if (a && t.type === 'device' && t.ref.floor === 0 && t.ref.action === 'Acil Müdahale') {
      if (a.phase === 'bay') {
        if (UNITS[a.def.need].tags.includes(t.ref.tag)) startStabilize(t.ref, true);
        else UI().toast(`Bu hastanın ihtiyacı: ${UNITS[a.def.need].device}`, 2600);
        return true;
      }
      if (a.phase === 'stab') { UI().toast(`Stabilizasyon sürüyor: ${a.device.name} yanında kalın.`, 2000); return true; }
      if (a.phase === 'arrive' || a.phase === 'wait') { UI().toast('Önce hastanın triyajını yapın (hastaya yaklaşın).', 2400); return true; }
    }
    return false;
  }

  // ================================================================ Çizim
  /** Ambulansın anlık nesne tanımı (art_extra.js 'ambulance' türüyle çizilir). */
  function ambObject(amb) {
    const ns = amb.heading === 'N' || amb.heading === 'S';
    const w = ns ? 1.4 : 2.8, h = ns ? 2.8 : 1.4;
    return { k: 'ambulance', x: amb.x - w / 2, y: amb.y - h / 2, w, h, face: amb.heading, lights: ambLights() };
  }
  const ambLights = () => !!er.amb && (er.amb.phase !== 'parked' || er.siren > 0 || !!er.active);

  function drawables(map) {
    if (map.floor !== 0 || !er.amb) return [];
    const o = ambObject(er.amb);
    const cs = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(([x, y]) => map.rotPt(x, y));
    const key = Math.max(...cs.map((c) => c[0])) + Math.max(...cs.map((c) => c[1])) - 1;
    const [cx, cy] = map.worldToIso(er.amb.x, er.amb.y);
    o.spriteKey = ['amb', o.face, o.w, o.h, o.lights ? Math.floor(performance.now() / 180) % 2 : -1].join('|');
    return [{ kind: 'amb', key, cx, cy, draw: (ctx) => VH.map.drawSprite(ctx, o) }];
  }

  /** Zemin katmanı: dönen tepe lambalarının asfalta vuran kırmızı/mavi ışığı. */
  function drawGroundFx(ctx) {
    if (M().floor !== 0 || !er.amb || !ambLights()) return;
    const [sx, sy] = M().worldToIso(er.amb.x, er.amb.y);
    const ph = performance.now() / 180;
    const red = Math.floor(ph) % 2 === 0;
    for (const [col, ox, on] of [['255,59,59', -26, red], ['59,139,255', 26, !red]]) {
      const g = ctx.createRadialGradient(sx + ox, sy, 4, sx + ox, sy, 70);
      g.addColorStop(0, `rgba(${col},${on ? 0.32 : 0.08})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx + ox, sy, 70, 35, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawOverlay(ctx, vw, vh) {
    const now = performance.now();
    // siren: ekran kenarında kırmızı yanıp sönme
    if (er.siren > 0) {
      const a = 0.18 + 0.14 * Math.sin(now / 90);
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
      g.addColorStop(0, 'rgba(229,72,77,0)');
      g.addColorStop(1, `rgba(229,72,77,${a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
    const a = er.active;
    if (!a || E().player.floor !== 0 || a.p.gone) return;
    const cam = M().camera;
    const [ix, iy] = M().worldToIso(a.p.x, a.p.y);
    const [fx, fy] = cam.toScreen(ix, iy, vw, vh);
    const [hx, hy] = cam.toScreen(ix, iy - (a.p.lift || 0) - 58, vw, vh);
    // ayak halkası
    ctx.strokeStyle = `rgba(229,72,77,${0.6 + 0.4 * Math.sin(now / 150)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(fx, fy, 16 * cam.zoom, 8 * cam.zoom, 0, 0, Math.PI * 2); ctx.stroke();
    // süre çubuğu
    const max = a.def.time + erTimeBonus();
    const frac = Math.max(0, a.timeLeft / max);
    const w = 70;
    ctx.fillStyle = 'rgba(12,32,46,0.9)';
    ctx.fillRect(hx - w / 2 - 2, hy - 16, w + 4, 20);
    ctx.fillStyle = frac > 0.5 ? '#46a758' : frac > 0.25 ? '#edae49' : '#e5484d';
    ctx.fillRect(hx - w / 2, hy - 2, w * frac, 4);
    ctx.fillStyle = '#fff';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚨 ' + fmtTime(a.timeLeft), hx, hy - 9);
    // stabilizasyon halkası
    if (a.phase === 'stab') {
      const p = 1 - a.stab / a.stabMax;
      ctx.strokeStyle = '#2ec4b6'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(hx, hy - 30, 13, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(Math.round(p * 100) + '%', hx, hy - 30);
    }
  }

  function alertText() {
    const a = er.active;
    if (!a) return er.amb ? '🚨 Ambulans geliyor…' : '';
    const step = a.phase === 'arrive' || a.phase === 'wait' ? 'Triyaj yapın' : a.phase === 'toBay' ? 'Sedyeye alınıyor' : a.phase === 'bay' ? `${UNITS[a.def.need].device} ile müdahale` : 'Stabilizasyon…';
    return `🚨 ${fmtTime(a.timeLeft)} · ${a.def.name} · ${step}`;
  }

  // ================================================================ API
  let incomeAcc = 0;
  VH.hospital = {
    UPGRADES, HIRES, SERVICES, ER_TYPES, RX, UNITS, DEV, er, combo, shift, SHIFT_LEN,
    ER_RX, CASE_RX, reward, drawGroundFx, ambObject,
    keySpots: () => [TRIAGE_SPOT, ER_DOOR_OUT, [31.6, 17.3], [29.5, 10.4]].map((p) => [Math.floor(p[0]), Math.floor(p[1])]).concat(BAYS.map((b) => b.via)),
    mod, level, incomePerMin, has, devLevel, comboHit, comboBreak,
    get gameTime() { return gameTime; },
    get night() { return nightF; },
    get isNightShift() { return isNightShift(); },
    erMaxTime: (def) => def.time + erTimeBonus(),
    init() {
      const st = S();
      st.upgrades = st.upgrades || {}; st.hires = st.hires || {}; st.services = st.services || {}; st.dev = st.dev || {};
      if (st.shiftN) shift.n = st.shiftN;
      if (st.shiftT) shift.t = Math.max(20, Math.min(SHIFT_LEN, st.shiftT));
      shift.stats = freshStats();
      nightF = isNightShift() ? 1 : 0;
      // Kayıttan gelen alımları yeniden kur
      HIRES.forEach((h) => { if (st.hires[h.id]) E().addStaff(Object.assign({ id: h.id }, h.staff), 0); });
      SERVICES.forEach((s) => { if (st.services[s.id]) setupService(s.id); });
      // Aşamalı otomasyon: yeni oyunda çekirdek kadro yok (eski kayıtlar ve ?allstaff tam kadro)
      if (!st.core) st.core = new URLSearchParams(location.search).has('allstaff') ? { receptionist: true, pharmacist: true, doctor2: true } : {};
      E().syncCore();
    },
    update(dt) {
      gameTime += dt;
      updateER(dt);
      incomeAcc += dt;
      if (incomeAcc >= 1) {
        S().budget += (incomePerMin() / 60) * incomeAcc;
        incomeAcc = 0;
      }
      // kombo süresi doldu mu?
      if (combo.streak && gameTime > combo.until) { combo.streak = 0; combo.mult = 1; }
      // ER takip: hasta eczaneden ayrılınca akış tamamlanır
      if (er.follow && (er.follow.p.gone || er.follow.p.state === 'leaving')) { er.follow.doneAt = er.follow.doneAt || gameTime; if (gameTime - er.follow.doneAt > 4) er.follow = null; }
      // vardiya
      if (!VH.paused) shift.t -= dt;
      S().shiftN = shift.n; S().shiftT = Math.round(shift.t);
      const target = isNightShift() ? 1 : 0;
      nightF += Math.sign(target - nightF) * Math.min(Math.abs(target - nightF), dt / 6);
      if (shift.t <= 0 && !VH.paused) endShift();
      UI().setAlert(alertText());
    },
    handleInteract,
    priority(t) {
      const a = er.active;
      if (!a) return 0;
      if (t.type === 'patient' && t.ref === a.p && (a.phase === 'arrive' || a.phase === 'wait')) return 2;
      if (t.type === 'device' && (a.phase === 'bay' || a.phase === 'stab') && UNITS[a.def.need].tags.includes(t.ref.tag)) return 2;
      return 0;
    },
    drawables,
    drawOverlay,
    openPanel, openElevator, travel, endShift,
    /** Masaüstü pencereleri için temel sekme içerikleri (yükseltme, gelişim, uzman kadro, servisler). */
    renderBase(tab, list, rerender) {
      if (tab === 'yukseltme') UPGRADES.forEach((u) => list.appendChild(itemCard('upgrades', u, rerender)));
      else if (tab === 'gelisim') list.appendChild(devCards(rerender));
      else if (tab === 'personel') HIRES.forEach((u) => list.appendChild(itemCard('hires', u, rerender)));
      else if (tab === 'servis') SERVICES.forEach((u) => list.appendChild(itemCard('services', u, rerender)));
    },
    erAuto: () => erTeam().length > 0,
    reqList, reqNode, casesTotal, addCase, floorOpen, serviceOfFloor,
    canBuy, money, BAYS_STATE: () => BAYS.map((b) => !!b.occ),
    onServed(p) {
      const fee = Math.round((330 + (has("upgrades", "comfort") ? 60 : 0)) * (VH.progress ? VH.progress.incomeMult() : 1));
      S().budget += fee;
      if (p && E().floatText) { p._paidAt = performance.now(); E().floatText(p.x, p.y, p.floor, "+₺" + fee, "#ffd166", -10); if (!p.erRef && (p.patience === undefined || p.patience > 45)) E().floatText(p.x, p.y, p.floor, "+★", "#8fe39f", 18); }
      if (shift.stats && !(p && p.erRef)) shift.stats.treated++;
      if (!(p && p.erRef)) addCase();
    },
    onPharmacyAuto() { if (has('hires', 'pharmTech')) S().budget += 150; if (VH.equipment) S().budget += VH.equipment.pharmacyBonus(); },
    onAngryLeave() { reward(-1, 0, 0); if (shift.stats) shift.stats.angry++; comboBreak('hasta beklemekten sıkıldı'); },
    onCaseSolved() { if (shift.stats) shift.stats.cases++; },
    // test yardımcıları
    _startEmergency: (id) => startEmergency(id),
    _triage: triage,
    _buy: (group, id) => buy(group, ({ upgrades: UPGRADES, hires: HIRES, services: SERVICES })[group].find((x) => x.id === id)),
    _buyDev: (id) => buyDev(id),
    _counsel: (p, i) => { p.rx = p.rx || rxFor(p); counsel(p, RX[p.rx].opts[i][1], RX[p.rx]); },
    _rxFor: rxFor,
    _setShiftTime: (t) => { shift.t = t; },
  };
})();
