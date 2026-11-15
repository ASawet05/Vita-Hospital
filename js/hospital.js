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
    { id: 'surgery', floor: 1, icon: '🩻', name: 'Cerrahi & Ameliyathane Servisi', income: 600, cost: 25000, rep: 60,
      desc: 'Yeni kat: ameliyathane, cerrahi hazırlık, uyandırma odası. Acil travma ödülü +%50, pasif gelir +₺600/dk.' },
    { id: 'ward', floor: 2, icon: '🛏️', name: 'Yatan Hasta & Pediatri Servisi', income: 400, cost: 18000, rep: 55,
      desc: 'Yeni kat: servis yatakları, pediatri, küvöz. Stabilize edilen acil hastalar yatırılır (+₺500), çocuk vakalarında ek ödül, pasif gelir +₺400/dk.' },
    { id: 'radiology', floor: 3, icon: '📡', name: 'Radyoloji & İleri Tanı Katı', income: 500, cost: 15000, rep: 50,
      desc: 'Yeni kat: röntgen, ultrason, EKG, diyaliz. "Daha fazla tetkik" kararları hastane içinde yapılır (+₺1.000), pasif gelir +₺500/dk.' },
  ];

  const FLOOR_STAFF = {
    surgery: [
      { id: 'surgeon', name: 'Op. Dr. Selim Tan', role: 'Genel Cerrah', look: look('#2f9e8f', '#2f9e8f', '#2f9e8f', '#e8b48f', '#2b1d14', 'short'),
        points: [[6.5, 4.5], [12.5, 3.5], [4.5, 5.5]], action: 'Doktorla Konuş', info: 'Ameliyat öncesi en az 2-3 dakika cerrahi el yıkama şart.', greet: ['Ameliyathane steril!', 'Bugün iki planlı ameliyat var.', 'Hoş geldiniz Başhekimim.'] },
      { id: 'anesth', name: 'Dr. Nil Er', role: 'Anestezi Uzmanı', look: look('#2f9e8f', '#2f9e8f', '#2f9e8f', '#f3cfb1', '#a0522d', 'bun'),
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
        points: [[4.5, 4.5], [17.5, 11.5], [10.5, 4.5]], action: 'Doktorla Konuş', info: 'Gereksiz görüntüleme radyasyon ve maliyet demek; doğru endikasyon çok önemli.', greet: ['Raporlar hazır.', 'Röntgen kalibre edildi.', 'Hoş geldiniz.'] },
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
  function mod(k) {
    switch (k) {
      case 'labTime': return (has('upgrades', 'fastLab') ? 0.5 : 1) * (has('hires', 'labTech2') ? 0.7 : 1);
      case 'spawnInterval': return has('upgrades', 'comfort') ? 0.75 : 1;
      case 'pharmacyWait': return has('hires', 'pharmTech') ? 0.85 : 1;
      case 'stabTime': return has('hires', 'erNurse') ? 0.5 : 1;
      default: return 1;
    }
  }
  const erTimeBonus = () => (has('upgrades', 'erKit') ? 20 : 0) + (has('hires', 'erNurse') ? 10 : 0);
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
  const ER_DOOR_OUT = [32.4, 16.5];
  const TRIAGE_SPOT = [29.5, 16.6];
  const BAYS = [
    { bed: [21.95, 13.5], via: [21, 14], occ: null },
    { bed: [21.95, 16.5], via: [21, 17], occ: null },
    { bed: [21.95, 19.5], via: [21, 20], occ: null },
  ];
  const er = { active: null, nextIn: 70, siren: 0, amb: null, warned: false, leaving: [] };

  function startEmergency() {
    const def = pick(ER_TYPES);
    er.siren = 4;
    sound('siren');
    er.amb = { y: 28, target: 16.5, phase: 'arrive', wait: 0, def };
    UI().toast('🚨 ACİL DURUM! Ambulans geliyor: ' + def.complaint, 4200);
  }

  function ambulanceArrived(def) {
    const female = def.sex === 'K';
    const lk = E().randomPatientLook();
    lk.hairStyle = female ? 'long' : 'short';
    if (def.age >= 60) lk.hair = '#b9b9b9';
    const p = E().makeEntity('patient', {
      name: def.name, age: def.age, complaint: def.complaint, look: lk, erRef: def,
      x: ER_DOOR_OUT[0], y: ER_DOOR_OUT[1], speed: 1.25, state: 'er', timer: 0, floor: 0,
    });
    E().patients.push(p);
    er.active = { def, p, timeLeft: def.time + erTimeBonus(), phase: 'arrive', wrong: new Set(), bay: null, stab: 0 };
    E().say(p, 'Yardım edin… lütfen!', 2600);
    E().goTo(p, TRIAGE_SPOT[0], TRIAGE_SPOT[1], () => { if (er.active && er.active.p === p) er.active.phase = 'wait'; });
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
      if (a.wrong.has(k)) { b.disabled = true; body.appendChild(el('span', { className: 'opt-desc' }, '✗ Uygun değil')); }
      b.appendChild(body);
      b.addEventListener('click', () => triage(k));
      node.appendChild(b);
    });
    node.appendChild(el('div', { className: 'disclaimer' }, 'Oyun içi sadeleştirilmiş triyajdır; gerçek acil durumda 112\'yi arayın.'));
    UI().openDialog({ icon: '🚨', title: `${d.name}, ${d.age} yaş`, subtitle: 'Acil Servis · Triyaj', wide: true, node, actions: [{ label: 'Kapat', ghost: true }] });
  }

  function triage(k) {
    const a = er.active;
    if (!a) return;
    if (k !== a.def.need) {
      a.wrong.add(k);
      a.timeLeft -= 12;
      sound('error');
      openTriage(`Yanlış ünite! −12 sn. Yaşamsal bulgulara tekrar bakın: hangisi en çok bozulmuş?`);
      return;
    }
    UI().closeDialog();
    const bay = BAYS.find((b) => !b.occ) || BAYS[0];
    bay.occ = a.p; a.bay = bay; a.phase = 'toBay';
    sound('ok');
    UI().toast(`✅ Doğru triyaj! Hastayı sedyeye alıyoruz. Şimdi ${UNITS[k].device} ile müdahale edin.`, 3600);
    E().goTo(a.p, bay.bed[0], bay.bed[1], (p) => {
      E().sitAt(p, bay.bed, 14);
      if (er.active && er.active.p === p) er.active.phase = 'bay';
    }, bay.via);
  }

  function startStabilize(dv) {
    const a = er.active;
    a.phase = 'stab';
    a.stab = 3 * mod('stabTime');
    a.stabMax = a.stab;
    a.device = dv;
    UI().toast(`🩺 ${dv.name} ile stabilizasyon başladı. Cihazın yanında kalın!`, 2600);
  }

  function erSuccess() {
    const a = er.active, d = a.def;
    const ward = has('services', 'ward');
    const surgeryBonus = d.trauma && has('services', 'surgery');
    const rep = 6 + Math.floor(a.timeLeft / 15);
    let budget = 2000 * (surgeryBonus ? 1.5 : 1) + (ward ? 500 : 0);
    reward(rep, 3, budget);
    sound('success');
    const node = el('div', {});
    node.appendChild(el('div', { className: 'grade', style: 'border-color:#46a758' }, '✅ Hasta stabilize edildi'));
    const deltas = el('div', { className: 'deltas' });
    deltas.appendChild(el('span', { className: 'delta up' }, `İtibar +${rep}`));
    deltas.appendChild(el('span', { className: 'delta up' }, 'Hasta Güvenliği +3'));
    deltas.appendChild(el('span', { className: 'delta up' }, `Bütçe +${money(budget)}`));
    deltas.appendChild(el('span', { className: 'delta' }, `Kalan süre: ${fmtTime(a.timeLeft)}`));
    node.appendChild(deltas);
    node.appendChild(el('p', { className: 'lesson' }, d.why));
    if (surgeryBonus) node.appendChild(el('p', { className: 'lesson' }, '🩻 Cerrahi servis: travma hastası ameliyathane değerlendirmesine alındı (ödül +%50).'));
    node.appendChild(el('p', { className: 'lesson' }, ward ? '🛏️ Hasta yatan hasta servisine yatırıldı (+₺500).' : 'Hasta gözlem sonrası taburcu edilecek. Yatan Hasta Servisi açarak ek gelir elde edebilirsiniz.'));
    node.appendChild(el('div', { className: 'disclaimer' }, 'Eğitim amaçlı sadeleştirilmiş senaryodur.'));
    UI().openDialog({ icon: '🚑', title: 'Acil Müdahale Başarılı', subtitle: `${d.name}, ${d.age} yaş`, wide: true, node, actions: [{ label: 'Devam' }] });
    finishEmergency(ward ? 'admit' : 'discharge');
    persist();
  }

  function erFail() {
    const a = er.active, d = a.def;
    reward(-8, -10, 0);
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
      p.sitting = false; p.lift = 0;
      if (kind === 'admit') E().goTo(p, 29.5, 10.4, (e) => { e.gone = true; admitToWard(e); });
      else E().goTo(p, 33.4, 21.5, (e) => { e.gone = true; });
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
    if (amb) {
      if (amb.phase === 'arrive') {
        amb.y = Math.max(amb.target, amb.y - dt * 5);
        if (amb.y <= amb.target) { amb.phase = 'parked'; amb.wait = 7; ambulanceArrived(amb.def); }
      } else if (amb.phase === 'parked') {
        amb.wait -= dt;
        if (amb.wait <= 0) amb.phase = 'leave';
      } else {
        amb.y += dt * 5;
        if (amb.y > 30) er.amb = null;
      }
    }
    const a = er.active;
    if (!a) {
      if (!er.amb) { er.nextIn -= dt; if (er.nextIn <= 0) startEmergency(); }
      return;
    }
    a.timeLeft -= dt;
    if (a.timeLeft <= 10 && !er.warned) { er.warned = true; sound('alarm'); }
    if (a.phase === 'stab') {
      const P = E().player;
      const near = P.floor === 0 && E().rectDist(P.x, P.y, a.device) <= 1.4;
      if (near) {
        a.stab -= dt;
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
  const CASE_RX = { c01: 'demir', c02: 'b12', c03: 'magnezyum', c04: 'dvit', c05: 'sevk', c06: 'folat', c07: 'cinko', c08: 'sevk', c09: 'magnezyum', c10: 'sevk', c11: 'sevk', c12: 'sevk', c13: 'sevk', c14: 'dvit' };
  const COMPLAINT_RX = [[/yorgun|halsiz/i, 'demir'], [/kramp|uyku|baş ağrı/i, 'magnezyum'], [/eklem|ağrı/i, 'agri'], [/saç/i, 'cinko'], [/uyuşma|dikkat/i, 'b12'], [/mide|iştah/i, 'sivi']];

  function rxFor(p) {
    if (p.caseRef) return p.caseChoice && p.caseChoice !== 'complete' ? 'sevk' : CASE_RX[p.caseRef.id] || 'dvit';
    const hit = COMPLAINT_RX.find(([re]) => re.test(p.complaint || ''));
    return hit ? hit[1] : pick(Object.keys(RX).filter((k) => k !== 'sevk'));
  }

  function openPharmacy(p) {
    p.rx = p.rx || rxFor(p);
    p.timer = Math.max(p.timer, 25); // bilgilendirme sırasında beklesin
    const rx = RX[p.rx];
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
    node.appendChild(el('div', { className: 'disclaimer' }, 'Takviye ve ilaçlar yalnızca hekim/eczacı önerisiyle kullanılmalıdır.'));
    UI().openDialog({ icon: '💊', title: 'İlaç Onayı & Bilgilendirme', subtitle: 'Eczane', wide: true, node, actions: [{ label: 'Kapat', ghost: true }] });
  }

  function counsel(p, ok, rx) {
    const bonus = 400 * (has('upgrades', 'digitalPharmacy') ? 2 : 1);
    const correct = rx.opts.find((o) => o[1])[0];
    if (ok) { reward(1, 0, bonus); sound('success'); }
    else { reward(-1, -1, 0); sound('error'); }
    E().say(p, ok ? 'Çok net anlattınız, teşekkürler!' : 'Hmm… emin değilim.', 2600);
    UI().openDialog({
      icon: ok ? '✅' : '⚠️', title: ok ? 'Doğru bilgilendirme' : 'Eksik/yanlış bilgilendirme', subtitle: rx.name,
      text: ok ? `Hasta ilacını doğru kullanacak. Bütçe +${money(bonus)} · İtibar +1` : `Doğrusu: ${correct}\nİtibar −1 · Hasta Güvenliği −1`,
    });
    E().approvePharmacy(p);
    persist();
  }

  // ================================================================ YÖNETİM & İNŞA PANELİ
  let panelTab = 'genel';
  function canBuy(item, owned) {
    if (owned) return 'Sahipsiniz';
    if (S().reputation < item.rep) return `İtibar ${item.rep} gerekli`;
    if (S().budget < item.cost) return 'Bütçe yetersiz';
    return null;
  }

  function buy(group, item) {
    const st = S();
    if (canBuy(item, has(group, item.id))) return;
    st.budget -= item.cost;
    st[group] = st[group] || {};
    st[group][item.id] = true;
    sound('success');
    if (group === 'hires') E().addStaff(Object.assign({ id: item.id }, item.staff), 0);
    if (group === 'services') { setupService(item.id); UI().toast(`🏗️ ${item.name} açıldı! Asansörle ${M().floorName(item.floor)}'a çıkabilirsiniz.`, 4200); }
    else UI().toast(`✅ ${item.name} hazır.`, 2600);
    persist();
    openPanel(panelTab);
  }

  function itemCard(group, item) {
    const owned = has(group, item.id);
    const card = el('div', { className: 'shop-card' + (owned ? ' owned' : '') });
    card.appendChild(el('div', { className: 'shop-icon' }, item.icon));
    const body = el('div', { className: 'shop-body' });
    body.appendChild(el('strong', {}, item.name));
    body.appendChild(el('span', { className: 'opt-desc' }, item.desc));
    body.appendChild(el('span', { className: 'shop-meta' }, `${money(item.cost)} · İtibar ≥ ${item.rep}`));
    card.appendChild(body);
    const why = canBuy(item, owned);
    const label = owned ? '✓ Aktif' : group === 'hires' ? 'İşe al' : group === 'services' ? 'İnşa et' : 'Satın al';
    const b = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why && !owned ? why : label);
    b.disabled = !!why;
    b.addEventListener('click', () => buy(group, item));
    card.appendChild(b);
    return card;
  }

  function openPanel(tab) {
    panelTab = tab || panelTab;
    const st = S();
    const node = el('div', {});
    const stats = el('div', { className: 'exam-meta' });
    [`🏥 Hastane Seviyesi ${level()}`, `💰 ${money(st.budget)}`, `★ İtibar ${st.reputation}`, `🛡️ Güvenlik ${st.safety}`, `📈 Pasif gelir ${money(incomePerMin())}/dk`]
      .forEach((t) => stats.appendChild(el('span', {}, t)));
    node.appendChild(stats);
    const tabs = el('div', { className: 'tabs' });
    [['genel', 'Genel'], ['yukseltme', 'Yükseltmeler'], ['personel', 'Personel'], ['servis', 'Servisler & Katlar']].forEach(([id, label]) => {
      const b = el('button', { type: 'button', className: 'tab' + (panelTab === id ? ' on' : '') }, label);
      b.addEventListener('click', () => openPanel(id));
      tabs.appendChild(b);
    });
    node.appendChild(tabs);
    const list = el('div', { className: 'shop' });
    if (panelTab === 'genel') {
      const solved = st.solved.length;
      const n = (o) => Object.keys(o || {}).filter((k) => o[k]).length;
      list.appendChild(el('p', {}, `Çözülen vaka: ${solved} · Yükseltme: ${n(st.upgrades)}/${UPGRADES.length} · Personel: ${n(st.hires)}/${HIRES.length} · Servis: ${n(st.services)}/${SERVICES.length}`));
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
    else if (panelTab === 'personel') HIRES.forEach((u) => list.appendChild(itemCard('hires', u)));
    else SERVICES.forEach((u) => list.appendChild(itemCard('services', u)));
    node.appendChild(list);
    UI().openDialog({ icon: '🏗️', title: 'Başhekim Yönetim & İnşa Paneli', subtitle: 'Cihaz yükseltme · Personel · Yeni servisler', wide: true, node, actions: [{ label: 'Kapat', ghost: true }] });
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
    cam.follow = true;
    UI().setToggle('btn-follow', true);
    sound('door');
    UI().toast('🛗 ' + M().floorName(f), 2200);
  }

  function openElevator() {
    const P = E().player;
    const node = el('div', { className: 'shop' });
    M().FLOOR_DEFS.forEach((d, f) => {
      const sv = SERVICES.find((s) => s.floor === f);
      const open = f === 0 || (sv && has('services', sv.id));
      const card = el('div', { className: 'shop-card' + (f === P.floor ? ' owned' : '') });
      card.appendChild(el('div', { className: 'shop-icon' }, f === 0 ? '🏥' : sv.icon));
      const body = el('div', { className: 'shop-body' });
      body.appendChild(el('strong', {}, d.name));
      body.appendChild(el('span', { className: 'opt-desc' }, f === P.floor ? 'Buradasınız' : open ? 'Erişime açık' : `Kilitli: Yönetim Panelinden inşa edin (${money(sv.cost)}, İtibar ≥ ${sv.rep})`));
      card.appendChild(body);
      const b = el('button', { type: 'button', className: 'dlg-btn' + (open && f !== P.floor ? '' : ' ghost') }, f === P.floor ? 'Buradasınız' : open ? 'Git' : '🔒');
      b.disabled = !open || f === P.floor;
      b.addEventListener('click', () => travel(f));
      card.appendChild(b);
      node.appendChild(card);
    });
    UI().openDialog({ icon: '🛗', title: 'Asansör', subtitle: 'Kat seçin', wide: true, node, actions: [{ label: '🏗️ Yönetim Paneli', fn: () => openPanel('servis') }, { label: 'Kapat', ghost: true }] });
  }

  // ================================================================ Etkileşim yönlendirme
  function handleInteract(t) {
    if (t.type === 'device' && t.ref.tag === 'elevator') { openElevator(); return true; }
    if (t.type === 'device' && t.ref.tag === 'chief_desk') { openPanel('genel'); return true; }
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
        if (UNITS[a.def.need].tags.includes(t.ref.tag)) startStabilize(t.ref);
        else UI().toast(`Bu hastanın ihtiyacı: ${UNITS[a.def.need].device}`, 2600);
        return true;
      }
      if (a.phase === 'stab') { UI().toast(`Stabilizasyon sürüyor: ${a.device.name} yanında kalın.`, 2000); return true; }
      if (a.phase === 'arrive' || a.phase === 'wait') { UI().toast('Önce hastanın triyajını yapın (hastaya yaklaşın).', 2400); return true; }
    }
    return false;
  }

  // ================================================================ Çizim
  function drawAmbulance(ctx, amb) {
    const map = M();
    const x0 = 32.25, x1 = 33.75, y0 = amb.y - 1.4, y1 = amb.y + 1.4, h = 34, lift = 4;
    const P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => map.worldToIso(x, y));
    const up = (p, z) => [p[0], p[1] - z];
    // gölge
    ctx.fillStyle = 'rgba(10,20,30,0.3)';
    ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] + 2) : ctx.moveTo(p[0], p[1] + 2))); ctx.closePath(); ctx.fill();
    // tekerlekler
    ctx.fillStyle = '#1d2329';
    [[x0 + 0.1, y0 + 0.5], [x1 - 0.1, y0 + 0.5], [x0 + 0.1, y1 - 0.5], [x1 - 0.1, y1 - 0.5]].forEach(([x, y]) => {
      const [sx, sy] = map.worldToIso(x, y);
      ctx.beginPath(); ctx.ellipse(sx, sy - 3, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    });
    const faces = [
      { a: 0, b: 1, n: [0, -1], front: true }, { a: 1, b: 2, n: [1, 0] }, { a: 2, b: 3, n: [0, 1] }, { a: 3, b: 0, n: [-1, 0] },
    ];
    faces.forEach((f) => {
      const rv = map.rotVec(f.n[0], f.n[1]);
      if (rv[0] + rv[1] <= 0) return;
      const A = up(P[f.a], lift), B = up(P[f.b], lift);
      const quad = (z0, z1, color) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(A[0], A[1] - z0); ctx.lineTo(B[0], B[1] - z0); ctx.lineTo(B[0], B[1] - z1); ctx.lineTo(A[0], A[1] - z1); ctx.closePath(); ctx.fill();
      };
      const shade = rv[0] > rv[1] ? '#e9eef2' : '#d3dbe1';
      quad(0, h, shade);
      quad(10, 15, '#d62828');
      if (f.front) quad(18, 29, '#2b3a46');
      else quad(20, 28, 'rgba(43,58,70,0.55)');
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[0], B[1] - h); ctx.lineTo(A[0], A[1] - h); ctx.closePath(); ctx.stroke();
    });
    // üst yüz
    const T = P.map((p) => up(p, lift + h));
    ctx.fillStyle = '#f7f9fb';
    ctx.beginPath(); T.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
    const [cx, cy] = map.worldToIso((x0 + x1) / 2, amb.y + 0.3);
    ctx.fillStyle = '#d62828';
    ctx.fillRect(cx - 7, cy - lift - h - 2.5, 14, 5);
    ctx.fillRect(cx - 2.5, cy - lift - h - 7, 5, 14);
    // tepe lambaları
    const [lx, ly] = map.worldToIso((x0 + x1) / 2, y0 + 0.35);
    const flash = Math.floor(performance.now() / 220) % 2 === 0;
    const on = amb.phase !== 'parked' || er.siren > 0 || (er.active && er.active.phase !== 'done');
    ctx.fillStyle = on && flash ? '#ff3b3b' : '#7a1d1d';
    ctx.fillRect(lx - 9, ly - lift - h - 6, 8, 5);
    ctx.fillStyle = on && !flash ? '#3b8bff' : '#1d3b7a';
    ctx.fillRect(lx + 1, ly - lift - h - 6, 8, 5);
  }

  function drawables(map) {
    if (map.floor !== 0 || !er.amb) return [];
    const amb = er.amb;
    const [cx, cy] = map.worldToIso(33, amb.y);
    const key = Math.max(map.depthAt(33.75, amb.y + 1.4), map.depthAt(32.25, amb.y + 1.4), map.depthAt(33.75, amb.y - 1.4), map.depthAt(32.25, amb.y - 1.4)) - 0.6;
    return [{ kind: 'amb', key, cx, cy, draw: (ctx) => drawAmbulance(ctx, amb) }];
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
    UPGRADES, HIRES, SERVICES, ER_TYPES, RX, er,
    mod, level, incomePerMin, has,
    init() {
      const st = S();
      st.upgrades = st.upgrades || {}; st.hires = st.hires || {}; st.services = st.services || {};
      // Kayıttan gelen alımları yeniden kur
      HIRES.forEach((h) => { if (st.hires[h.id]) E().addStaff(Object.assign({ id: h.id }, h.staff), 0); });
      SERVICES.forEach((s) => { if (st.services[s.id]) setupService(s.id); });
    },
    update(dt) {
      updateER(dt);
      incomeAcc += dt;
      if (incomeAcc >= 1) {
        S().budget += (incomePerMin() / 60) * incomeAcc;
        incomeAcc = 0;
      }
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
    openPanel, openElevator, travel,
    onServed() { S().budget += 150 + (has('upgrades', 'comfort') ? 50 : 0); },
    onPharmacyAuto() { if (has('hires', 'pharmTech')) S().budget += 150; },
    // test yardımcıları
    _startEmergency: startEmergency,
    _triage: triage,
    _buy: (group, id) => buy(group, ({ upgrades: UPGRADES, hires: HIRES, services: SERVICES })[group].find((x) => x.id === id)),
    _counsel: (p, i) => { p.rx = p.rx || rxFor(p); counsel(p, RX[p.rx].opts[i][1], RX[p.rx]); },
    _rxFor: rxFor,
  };
})();
