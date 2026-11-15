// Vita Hospital — Hastane puanı, temizlik, ücret politikası, olaylar, günlük görevler ve başarımlar
//
// - Hastane Puanı (0-5 ★): itibar, hasta güvenliği, temizlik, konfor, personel morali ve
//   ekipman durumundan hesaplanır; gelir ve hasta akışını etkiler.
// - Temizlik: hastalar yere çöp düşürebilir (çöp kutusu yakınsa düşürmez). Başhekim ya da
//   temizlik görevlisi toplar. Kirli hastanede hastaların sabrı daha hızlı azalır.
// - Ücret politikası: Uygun / Standart / Premium (gelir ↔ hasta memnuniyeti dengesi).
// - Rastgele olaylar: grip salgını, sıcak hava dalgası, zincirleme kaza, bakanlık denetimi, bağış.
// - Günlük görevler (gerçek takvim gününe göre 3 görev) ve kalıcı başarımlar.
(function () {
  const VH = (window.VH = window.VH || {});
  const M = () => VH.map, E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state, H = () => VH.hospital;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };
  const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  const data = () => {
    const st = S();
    st.prog = st.prog || { counters: {}, ach: {}, daily: null, streak: 0, lastFull: '', price: 'normal', inspections: 0 };
    return st.prog;
  };
  const cnt = () => data().counters;
  function bump(k, n) {
    const c = cnt(); c[k] = (c[k] || 0) + (n || 1); dailyBump(k, n || 1); checkAch();
    // Süreli kriz görevi ilerlemesi
    const g = ev.id && EVENTS[ev.id] && EVENTS[ev.id].goal;
    if (g && g.key === k && !ev.done) { ev.prog = (ev.prog || 0) + (n || 1); if (ev.prog >= g.n) crisisDone(true); }
  }
  function crisisDone(ok) {
    const d = EVENTS[ev.id], g = d && d.goal;
    if (!g || ev.done) return;
    ev.done = true;
    if (ok) { S().budget += g.reward; S().reputation = clamp(S().reputation + g.rep, 0, 100); sound('combo'); }
    else { S().reputation = clamp(S().reputation - 2, 0, 100); sound('error'); }
    if (VH.notify) VH.notify(ok ? '🏅' : '⌛', ok ? `Kriz görevi başarıldı: ${d.name} · +${money(g.reward)}, İtibar +${g.rep}` : `Kriz görevi kaçırıldı: ${d.name} (İtibar −2)`, 0, 'crisis');
    if (VH.emit) VH.emit('crisis', { id: ev.id, ok });
  }

  // ================================================================ Temizlik
  const litter = [];
  let litterId = 1;
  function dropLitter(x, y, f) {
    if ((f || 0) !== 0 || litter.length >= 14) return;
    const cx = Math.floor(x), cy = Math.floor(y);
    if (M().isBlocked(cx, cy, 0) || !M().roomIdAt(cx, cy, 0)) return;
    const bin = M().floorObjects(0).some((o) => o.k === 'trash_bin' && Math.hypot(o.x + 0.5 - x, o.y + 0.5 - y) < 3.2);
    if (bin) return;
    litter.push({ id: litterId++, x: cx + 0.3 + Math.random() * 0.4, y: cy + 0.3 + Math.random() * 0.4, v: Math.floor(Math.random() * 3), claimed: null });
  }
  const cleanliness = () => clamp(100 - litter.length * 7, 0, 100);
  function clean(l, by) {
    const i = litter.indexOf(l);
    if (i < 0) return;
    litter.splice(i, 1);
    bump('clean');
    if (!by) sound('click');
  }
  function claimLitter(s) {
    let best = null, bd = Infinity;
    for (const l of litter) {
      if (l.claimed && l.claimed !== s.id) continue;
      const d = Math.hypot(l.x - s.x, l.y - s.y);
      if (d < bd) { bd = d; best = l; }
    }
    if (best) best.claimed = s.id;
    return best;
  }

  // ================================================================ Ücret politikası
  const PRICES = {
    low:    { name: 'Uygun', icon: '🤝', income: 0.8, drain: 0.85, spawn: 0.9, desc: 'Gelir −%20; hastalar daha sabırlı, hasta akışı artar.' },
    normal: { name: 'Standart', icon: '⚖️', income: 1, drain: 1, spawn: 1, desc: 'Dengeli ücret.' },
    high:   { name: 'Premium', icon: '💎', income: 1.3, drain: 1.2, spawn: 1.12, desc: 'Gelir +%30; hastalar daha çabuk sabırsızlanır, akış azalır.' },
  };
  const price = () => PRICES[data().price] || PRICES.normal;

  // ================================================================ Hastane puanı
  function ratingParts() {
    const st = S();
    const staff = E().staff;
    const morale = VH.staff && staff.length ? staff.reduce((a, s) => a + VH.staff.rec(s.id).morale, 0) / staff.length : 70;
    return [
      { k: 'rep', label: 'İtibar', v: st.reputation, w: 0.3 },
      { k: 'safety', label: 'Hasta güvenliği', v: st.safety, w: 0.2 },
      { k: 'clean', label: 'Temizlik', v: cleanliness(), w: 0.15 },
      { k: 'comfort', label: 'Konfor', v: VH.build ? VH.build.comfort() : 30, w: 0.15 },
      { k: 'morale', label: 'Personel morali', v: morale, w: 0.1 },
      { k: 'equip', label: 'Ekipman durumu', v: VH.equipment ? VH.equipment.avgCondition() : 100, w: 0.1 },
    ];
  }
  function rating() {
    const s = ratingParts().reduce((a, p) => a + p.v * p.w, 0);
    return Math.round((s / 20) * 2) / 2;
  }
  const starText = (r) => '★'.repeat(Math.floor(r)) + (r % 1 ? '⯪' : '') + '☆'.repeat(5 - Math.ceil(r));

  // ================================================================ Olaylar
  const EVENTS = {
    flu:        { icon: '🦠', name: 'Grip Salgını', dur: 150, goal: { key: 'served', n: 6, text: '6 hastayı taburcu et', reward: 4000, rep: 4 }, desc: 'Solunum yolu şikâyetiyle gelen hasta sayısı arttı. Hasta akışı %40 fazla, taburcu geliri +%30.' },
    heat:       { icon: '🌡️', name: 'Sıcak Hava Dalgası', dur: 150, goal: { key: 'refresh', n: 3, text: '3 hasta su sebili/otomattan sıvı alsın', reward: 2500, rep: 2 }, desc: 'Sıcak çarpması ve sıvı kaybı vakaları artıyor. Serum ünitesini hazır tutun; su sebilleri daha çok kullanılır.' },
    mci:        { icon: '🚑', name: 'Zincirleme Trafik Kazası', dur: 220, goal: { key: 'er', n: 2, text: '2 kazazedeyi stabilize et', reward: 3000, rep: 5 }, desc: 'Arka arkaya 2 acil vaka geliyor! Her başarılı müdahale +₺1.500 ek ödül.' },
    inspection: { icon: '📋', name: 'Sağlık Bakanlığı Denetimi', dur: 100, desc: 'Denetçiler yolda! Süre bitince hastane puanınız değerlendirilecek: çöpleri toplayın, cihaz bakımlarını yapın.' },
    donation:   { icon: '🎁', name: 'Hayırsever Bağışı', dur: 6, desc: 'Bir hayırsever hastaneye bağış yaptı. Bağış miktarı hastane puanına göre belirlenir.' },
    surprise:   { icon: '🕵️', name: 'Habersiz Müfettiş Denetimi', dur: 60, desc: 'Takım elbiseli biri koridorlarda not alıyor… Habersiz bir Sağlık Müfettişi denetimi olabilir!' },
  };
  const ev = { id: null, t: 0, n: 0 };
  let eventTimer = 75;
  function startEvent(id) {
    const d = EVENTS[id];
    if (!d) return;
    ev.id = id; ev.t = d.dur; ev.n = 0; ev.prog = 0; ev.done = false;
    sound('notify');
    UI().toast(`${d.icon} ${d.name}: ${d.desc}${d.goal ? ' · 🎯 Görev: ' + d.goal.text + ' (' + fmt(d.dur) + ')' : ''}`, 6000);
    if (id === 'mci' && H().er && !H().er.active && !H().er.amb) H().er.nextIn = Math.min(H().er.nextIn, 8);
    if (id === 'surprise') spawnInspector();
    if (id === 'donation') {
      const r = rating();
      const amount = r >= 4 ? 8000 : r >= 3 ? 5000 : 2500;
      S().budget += amount;
      UI().toast(`🎁 Hayırsever bağışı: +${money(amount)} (Hastane Puanı ${r}★)`, 4200);
    }
    if (VH.emit) VH.emit('eventStart', id);
  }
  function endEvent() {
    if (ev.id && EVENTS[ev.id].goal && !ev.done) crisisDone(false);
    const id = ev.id;
    ev.id = null; ev.t = 0;
    if (id === 'inspection') inspect();
    if (id === 'surprise') { inspect(true); if (inspector) inspector.gone = true; }
  }
  let inspector = null;
  function spawnInspector() {
    const look = { coat: '#2b333b', shirt: '#ffffff', tie: '#30638e', pants: '#22223b', skin: '#e8b48f', hair: '#5a4a42', hairStyle: 'short', glasses: true, carry: 'clipboard', longCoat: true };
    inspector = E().makeEntity('extra', { name: 'Müfettiş', look, x: 4.5, y: 31.3, speed: 1.3, floor: 0, route: [[4.5, 15.5], [14.5, 16], [24.5, 15.5], [26.5, 9.6], [12.5, 9.6], [4.5, 24.6]], ri: 0, pause: 0 });
    E().extraPeople.push(inspector);
  }
  function updateInspector(dt) {
    const m = inspector;
    if (!m) return;
    if (m.gone) { const i = E().extraPeople.indexOf(m); if (i >= 0) E().extraPeople.splice(i, 1); inspector = null; return; }
    if (m.path.length) { E().stepPath(m, dt); return; }
    if (m.pause > 0) { m.pause -= dt; return; }
    const wp = m.route[m.ri++];
    if (!wp) return;
    m.pause = 3;
    if (Math.random() < 0.6) E().say(m, pick(['Hmm, not alıyorum…', 'Temizlik nasıl acaba?', 'Bekleme süreleri…', 'Cihaz bakım kayıtları?']), 2200);
    E().goTo(m, wp[0], wp[1]);
  }
  function inspect(surprise) {
    const r = rating();
    let budget, rep, grade;
    if (r >= 3.5) { budget = 6000; rep = 6; grade = 'Mükemmel'; }
    else if (r >= 2.5) { budget = 2000; rep = 2; grade = 'Yeterli'; }
    else { budget = -3000; rep = -5; grade = 'Yetersiz'; }
    S().budget += budget;
    S().reputation = clamp(S().reputation + rep, 0, 100);
    if (r >= 3.5) { data().inspections = (data().inspections || 0) + 1; bump('inspectionPass'); }
    sound(r >= 2.5 ? 'success' : 'error');
    const node = el('div', {});
    node.appendChild(el('div', { className: 'grade', style: `border-color:${r >= 3.5 ? '#46a758' : r >= 2.5 ? '#edae49' : '#e5484d'}` }, `${starText(r)}  ${r} / 5 · ${grade}`));
    const ul = el('div', { className: 'rate-list' });
    ratingParts().forEach((p) => ul.appendChild(rateRow(p)));
    node.appendChild(ul);
    const deltas = el('div', { className: 'deltas' });
    deltas.appendChild(el('span', { className: 'delta ' + (budget >= 0 ? 'up' : 'down') }, `Bütçe ${budget >= 0 ? '+' : ''}${money(budget)}`));
    deltas.appendChild(el('span', { className: 'delta ' + (rep >= 0 ? 'up' : 'down') }, `İtibar ${rep >= 0 ? '+' : ''}${rep}`));
    node.appendChild(deltas);
    UI().openDialog({ icon: surprise ? '🕵️' : '📋', title: surprise ? 'Habersiz Müfettiş Raporu' : 'Denetim Raporu', subtitle: surprise ? 'Az önce koridorlarda dolaşan kişi bir Sağlık Müfettişiydi!' : 'Sağlık Bakanlığı · Hastane Değerlendirmesi', wide: true, node });
    persist();
  }
  function updateEvents(dt) {
    if (ev.id) {
      ev.t -= dt;
      if (ev.t <= 0) endEvent();
      return;
    }
    eventTimer -= dt;
    if (eventTimer <= 0) {
      eventTimer = 200 + Math.random() * 160;
      const pool = ['flu', 'heat', 'mci', 'inspection', 'donation', 'surprise', 'surprise'];
      startEvent(pick(pool));
    }
  }
  /** Acil vaka havuzu: aktif olaya göre ağırlıklandırılır. */
  function erPool(types) {
    const bias = { flu: ['asthma', 'copd', 'pneumonia'], heat: ['heat', 'dehyd'], mci: ['trauma', 'bleed', 'electric'] }[ev.id];
    if (!bias) return types;
    const extra = types.filter((t) => bias.includes(t.id));
    return types.concat(extra, extra, extra, extra);
  }

  function factor(k) {
    const p = price();
    const clean = cleanliness() / 100;
    const r = rating();
    let f = 1;
    if (k === 'patienceDrain') f *= p.drain * (1 + 0.3 * (1 - clean));
    if (k === 'spawnInterval') {
      f *= p.spawn * (1.1 - 0.04 * r);
      if (ev.id === 'flu') f *= 0.6;
    }
    return f;
  }
  const incomeMult = () => price().income * (0.85 + 0.06 * rating()) * (ev.id === 'flu' ? 1.3 : 1);

  // ================================================================ Günlük görevler
  const TASKS = [
    { id: 'served', icon: '🧑‍⚕️', text: (n) => `${n} hastayı taburcu et`, n: [8, 12, 16], reward: 2000 },
    { id: 'er', icon: '🚑', text: (n) => `${n} acil hastayı stabilize et`, n: [2, 3], reward: 2500 },
    { id: 'caseBest', icon: '🏆', text: () => 'Bir vakayı en güvenli kararla çöz', n: [1], reward: 3000 },
    { id: 'counsel', icon: '💊', text: (n) => `Eczanede ${n} doğru bilgilendirme yap`, n: [2, 3, 4], reward: 1800 },
    { id: 'combo3', icon: '🔥', text: () => '3x kombo zinciri yakala', n: [1], reward: 2500 },
    { id: 'clean', icon: '🧹', text: (n) => `${n} çöp topla (siz ya da temizlik ekibi)`, n: [4, 6], reward: 1500 },
    { id: 'decor', icon: '🛋️', text: () => 'Bir dekor yerleştir ya da eşya taşı', n: [1], reward: 1500 },
    { id: 'repair', icon: '🔧', text: () => 'Bir cihaza bakım yap', n: [1], reward: 1500 },
    { id: 'refresh', icon: '🥤', text: (n) => `${n} hasta otomat/su sebilini kullansın`, n: [3, 5], reward: 1200 },
    { id: 'shiftClean', icon: '😊', text: () => 'Hiç hasta kaçırmadan bir nöbeti bitir', n: [1], reward: 3000 },
  ];
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function ensureDaily() {
    const d = data();
    const day = today();
    if (d.daily && d.daily.day === day) return d.daily;
    // dünkü görevlerin hepsi alındıysa seri devam eder
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yKey = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
    if (d.lastFull !== yKey && d.lastFull !== day) d.streak = 0;
    const R = seeded(day.split('-').reduce((a, v) => a * 31 + +v, 7));
    const pool = TASKS.slice();
    const list = [];
    while (list.length < 3 && pool.length) {
      const t = pool.splice(Math.floor(R() * pool.length), 1)[0];
      const n = t.n[Math.floor(R() * t.n.length)];
      list.push({ id: t.id, n, p: 0, claimed: false });
    }
    d.daily = { day, list };
    return d.daily;
  }
  function dailyBump(k, n) {
    const dl = ensureDaily();
    dl.list.forEach((t) => { if (t.id === k && !t.claimed) t.p = Math.min(t.n, t.p + n); });
  }
  function claim(i) {
    const dl = ensureDaily();
    const t = dl.list[i];
    if (!t || t.claimed || t.p < t.n) return;
    const def = TASKS.find((x) => x.id === t.id);
    t.claimed = true;
    S().budget += def.reward;
    S().reputation = clamp(S().reputation + 2, 0, 100);
    sound('success');
    UI().toast(`🎯 Görev tamamlandı: +${money(def.reward)}, İtibar +2`, 2600);
    if (dl.list.every((x) => x.claimed)) {
      const d = data();
      if (d.lastFull !== dl.day) { d.streak = (d.streak || 0) + 1; d.lastFull = dl.day; }
      const bonus = 2000 + 1000 * Math.min(5, d.streak);
      S().budget += bonus;
      UI().toast(`🌟 Günün tüm görevleri tamam! Seri ${d.streak} gün · Bonus +${money(bonus)}`, 3600);
    }
    persist();
  }

  // ================================================================ Başarımlar
  const ACH = [
    { id: 'firstCase', icon: '🔎', name: 'İlk Teşhis', desc: 'İlk klinik vakayı çöz.', test: (c) => (c.cases || 0) >= 1 },
    { id: 'cases10', icon: '🕵️', name: 'Klinik Dedektif', desc: '10 klinik vaka çöz.', test: (c) => (c.cases || 0) >= 10 },
    { id: 'best5', icon: '🥇', name: 'Altın Standart', desc: '5 vakayı en güvenli kararla çöz.', test: (c) => (c.caseBest || 0) >= 5 },
    { id: 'er1', icon: '⏱️', name: 'Altın Saat', desc: 'İlk acil hastayı stabilize et.', test: (c) => (c.er || 0) >= 1 },
    { id: 'er10', icon: '🦸', name: 'Acil Kahramanı', desc: '10 acil hastayı stabilize et.', test: (c) => (c.er || 0) >= 10 },
    { id: 'combo3', icon: '🔥', name: 'Zincirleme Başarı', desc: '3x kombo yap.', test: (c) => (c.combo3 || 0) >= 1 },
    { id: 'served50', icon: '💚', name: 'Şifa Dağıtan', desc: '50 hastayı taburcu et.', test: (c) => (c.served || 0) >= 50 },
    { id: 'served200', icon: '🏙️', name: 'Şehrin Hastanesi', desc: '200 hastayı taburcu et.', test: (c) => (c.served || 0) >= 200 },
    { id: 'floor1', icon: '🏗️', name: 'Büyüyen Hastane', desc: 'İlk servis katını aç.', test: () => Object.keys(S().services || {}).length >= 1 },
    { id: 'floorsAll', icon: '🏥', name: 'Tam Kapasite', desc: 'Üç servis katının hepsini aç.', test: () => Object.keys(S().services || {}).length >= 3 },
    { id: 'hire1', icon: '🤝', name: 'Ekip Ruhu', desc: 'İş başvurularından ilk personelini al.', test: (c) => (c.hire || 0) >= 1 },
    { id: 'team', icon: '👥', name: 'Güçlü Kadro', desc: 'Toplam 14 personele ulaş.', test: () => E().staff.length >= 14 },
    { id: 'train3', icon: '🎓', name: 'Hastane Akademisi', desc: 'Personelini 3 kez eğit.', test: (c) => (c.train || 0) >= 3 },
    { id: 'equip3', icon: '🚀', name: 'Teknoloji Lideri', desc: 'Bir ekipmanı en üst modele yükselt.', test: () => VH.equipment && VH.equipment.CATS.some((x) => VH.equipment.lvl(x.id) >= 3) },
    { id: 'decor10', icon: '🎨', name: 'İç Mimar', desc: '10 dekor yerleştir ya da eşya taşı.', test: (c) => (c.decor || 0) >= 10 },
    { id: 'clean25', icon: '✨', name: 'Pırıl Pırıl', desc: '25 çöp toplansın.', test: (c) => (c.clean || 0) >= 25 },
    { id: 'stars4', icon: '⭐', name: 'Dört Yıldızlı Hastane', desc: 'Hastane puanını 4★ ve üstüne çıkar.', test: () => rating() >= 4 },
    { id: 'shifts10', icon: '🌙', name: 'Nöbet Ustası', desc: '10 nöbet tamamla.', test: (c) => (c.shifts || 0) >= 10 },
    { id: 'inspection', icon: '📋', name: 'Denetimden Tam Not', desc: 'Bakanlık denetiminden 3,5★ ve üstüyle geç.', test: (c) => (c.inspectionPass || 0) >= 1 },
    { id: 'rich', icon: '💰', name: 'Bütçe Sihirbazı', desc: 'Bütçeyi ₺100.000\'e çıkar.', test: () => S().budget >= 100000 },
    { id: 'surgeon', icon: '🩻', name: 'Neşter Ustası', desc: 'İlk ameliyatı bizzat yap.', test: (c) => (c.surgery || 0) >= 1 },
    { id: 'radiologist', icon: '🧲', name: 'İleri Tanı', desc: '3 görüntülemeyi bizzat yap.', test: (c) => (c.imaging || 0) >= 3 },
    { id: 'logistics', icon: '🚚', name: 'Tedarik Zinciri', desc: 'İlk ilaç siparişini teslim al.', test: (c) => (c.delivered || 0) >= 1 },
    { id: 'wardCare', icon: '🛏️', name: 'Şefkatli Bakım', desc: 'Serviste 10 bakım uygula.', test: (c) => (c.ward || 0) >= 10 },
  ];
  let achCheckT = 0;
  function checkAch() {
    const d = data(), c = cnt();
    for (const a of ACH) {
      if (d.ach[a.id]) continue;
      let ok = false;
      try { ok = a.test(c); } catch (_) { ok = false; }
      if (!ok) continue;
      d.ach[a.id] = Date.now();
      S().budget += 1000;
      sound('combo');
      UI().toast(`🏅 Başarım açıldı: ${a.icon} ${a.name} (+₺1.000)`, 3600);
      if (VH.emit) VH.emit('achievement', a.id);
    }
  }

  // ================================================================ Arayüz
  function rateRow(p) {
    const row = el('div', { className: 'mini-bar' });
    row.appendChild(el('span', { className: 'mb-label' }, `${p.label} %${Math.round(p.v)}`));
    const tr = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
    fill.style.width = clamp(p.v, 0, 100) + '%';
    fill.style.background = p.v > 60 ? '#46c46a' : p.v > 30 ? '#f2c94c' : '#ff5a5f';
    tr.appendChild(fill); row.appendChild(tr);
    return row;
  }
  function renderGeneral(list, rerender) {
    const r = rating();
    list.appendChild(el('div', { className: 'sec-title' }, 'Hastane Puanı'));
    list.appendChild(el('div', { className: 'rating-big' }, `${starText(r)}  ${r.toLocaleString('tr-TR')} / 5`));
    const rl = el('div', { className: 'rate-list' });
    ratingParts().forEach((p) => rl.appendChild(rateRow(p)));
    list.appendChild(rl);
    list.appendChild(el('p', { className: 'muted' }, `Puan geliri ve hasta akışını etkiler (şu an gelir ×${incomeMult().toFixed(2)}).`));
    list.appendChild(el('div', { className: 'sec-title' }, 'Ücret politikası'));
    const seg = el('div', { className: 'seg' });
    Object.keys(PRICES).forEach((k) => {
      const P = PRICES[k];
      const b = el('button', { type: 'button', className: 'seg-btn' + (data().price === k ? ' on' : ''), title: P.desc }, `${P.icon} ${P.name}`);
      b.addEventListener('click', () => { data().price = k; persist(); rerender(); });
      seg.appendChild(b);
    });
    list.appendChild(seg);
    list.appendChild(el('p', { className: 'muted' }, price().desc));
    if (ev.id) list.appendChild(el('div', { className: 'new-clue' }, `${EVENTS[ev.id].icon} Aktif olay: ${EVENTS[ev.id].name} · ${fmt(ev.t)} · ${EVENTS[ev.id].desc}`));
  }
  function renderTasks(list, rerender) {
    const dl = ensureDaily();
    const d = data();
    list.appendChild(el('div', { className: 'sec-title' }, `Günlük görevler · ${dl.day} · Seri: ${d.streak || 0} gün`));
    dl.list.forEach((t, i) => {
      const def = TASKS.find((x) => x.id === t.id);
      const card = el('div', { className: 'task-card' + (t.claimed ? ' done' : '') });
      card.appendChild(el('span', { className: 'shop-icon' }, def.icon));
      const body = el('div', { className: 'shop-body' });
      body.appendChild(el('strong', {}, def.text(t.n)));
      const tr = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
      fill.style.width = (t.p / t.n) * 100 + '%'; fill.style.background = '#2ec4b6';
      tr.appendChild(fill); body.appendChild(tr);
      body.appendChild(el('span', { className: 'shop-meta' }, `${t.p}/${t.n} · Ödül ${money(def.reward)} + İtibar 2`));
      card.appendChild(body);
      const b = el('button', { type: 'button', className: 'dlg-btn' + (t.claimed || t.p < t.n ? ' ghost' : '') }, t.claimed ? '✓ Alındı' : t.p >= t.n ? 'Ödülü al' : 'Devam ediyor');
      b.disabled = t.claimed || t.p < t.n;
      b.addEventListener('click', () => { claim(i); rerender(); });
      card.appendChild(b);
      list.appendChild(card);
    });
    list.appendChild(el('p', { className: 'muted' }, 'Görevler her gün yenilenir. Üç görevi de tamamlarsanız seri bonusu kazanırsınız.'));
    const got = ACH.filter((a) => d.ach[a.id]).length;
    list.appendChild(el('div', { className: 'sec-title' }, `Başarımlar · ${got}/${ACH.length}`));
    const grid = el('div', { className: 'ach-grid' });
    ACH.forEach((a) => {
      const on = !!d.ach[a.id];
      const c = el('div', { className: 'ach' + (on ? ' on' : '') });
      c.appendChild(el('span', { className: 'ach-icon' }, on ? a.icon : '🔒'));
      c.appendChild(el('strong', {}, a.name));
      c.appendChild(el('span', { className: 'opt-desc' }, a.desc));
      grid.appendChild(c);
    });
    list.appendChild(grid);
  }

  // ---------------------------------------------------------------- Çizim ve hedefler
  function drawGround(ctx) {
    if (M().floor !== 0) return;
    for (const l of litter) VH.art.draw(ctx, { o: { k: 'litter', x: l.x - 0.5, y: l.y - 0.5, w: 1, h: 1, v: l.v } });
  }
  function targets(player) {
    if (player.floor !== 0) return [];
    let best = null, bd = 1.1;
    for (const l of litter) { const d = Math.hypot(l.x - player.x, l.y - player.y); if (d < bd) { bd = d; best = l; } }
    return best ? [{ type: 'litter', name: 'Yerdeki çöp', action: '🧹 Temizle', x: best.x, y: best.y, dist: bd + 0.2, ref: best, handler: (t) => clean(t.ref) }] : [];
  }

  // ---------------------------------------------------------------- Kayıt doğrulama
  function sanitize(d) {
    const out = { counters: {}, ach: {}, daily: null, streak: 0, lastFull: '', price: 'normal', inspections: 0 };
    if (!d || typeof d !== 'object') return out;
    const n = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
    const keys = ['surgery', 'imaging', 'delivered', 'ward', 'served', 'er', 'cases', 'caseBest', 'counsel', 'combo3', 'clean', 'decor', 'repair', 'refresh', 'shiftClean', 'train', 'hire', 'shifts', 'inspectionPass'];
    keys.forEach((k) => { if (d.counters && n(d.counters[k], 0, 1e7)) out.counters[k] = Math.round(d.counters[k]); });
    ACH.forEach((a) => { if (d.ach && n(d.ach[a.id], 1, 9e15)) out.ach[a.id] = d.ach[a.id]; });
    if (d.daily && typeof d.daily.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.daily.day) && Array.isArray(d.daily.list)) {
      const list = d.daily.list.slice(0, 3).filter((t) => t && TASKS.find((x) => x.id === t.id) && n(t.n, 1, 50) && n(t.p, 0, 50))
        .map((t) => ({ id: t.id, n: Math.round(t.n), p: Math.min(Math.round(t.n), Math.round(t.p)), claimed: t.claimed === true }));
      if (list.length === 3) out.daily = { day: d.daily.day, list };
    }
    if (n(d.streak, 0, 3650)) out.streak = Math.round(d.streak);
    if (typeof d.lastFull === 'string' && /^(\d{4}-\d{2}-\d{2})?$/.test(d.lastFull)) out.lastFull = d.lastFull;
    if (PRICES[d.price]) out.price = d.price;
    if (n(d.inspections, 0, 1e6)) out.inspections = Math.round(d.inspections);
    return out;
  }

  // ---------------------------------------------------------------- Olay dinleyicileri
  VH.on('served', () => bump('served'));
  VH.on('surgeryDone', (d) => { if (d.byPlayer) bump('surgery'); });
  VH.on('imagingDone', (d) => { if (d.byPlayer) bump('imaging'); });
  VH.on('delivered', () => bump('delivered'));
  VH.on('wardCare', (d) => { if (d.byPlayer) bump('ward'); });
  VH.on('erSuccess', () => {
    bump('er');
    if (ev.id === 'mci') {
      S().budget += 1500; ev.n++;
      UI().toast('🚑 Kaza bölgesinden gelen hasta kurtarıldı: +₺1.500', 2400);
      if (ev.n >= 2) endEvent(); else if (H().er) H().er.nextIn = 6;
    }
  });
  VH.on('erFail', () => { if (ev.id === 'mci') { ev.n++; if (ev.n >= 2) endEvent(); else if (H().er) H().er.nextIn = 6; } });
  VH.on('caseSolved', (d) => { bump('cases'); if (d.grade === 'best' && !d.hasty) bump('caseBest'); });
  VH.on('counsel', () => bump('counsel'));
  VH.on('combo', (m) => { if (m >= 3) bump('combo3'); });
  VH.on('decorPlace', () => bump('decor'));
  VH.on('repair', () => bump('repair'));
  VH.on('train', () => bump('train'));
  VH.on('hire', () => bump('hire'));
  VH.on('buy', () => checkAch());
  VH.on('equipUp', () => checkAch());
  VH.on('refresh', (d) => {
    bump('refresh');
    if (d.income) S().budget += d.income;
    if (Math.random() < 0.45) dropLitter(d.x, d.y, 0);
  });
  VH.on('shiftEnd', (sm) => {
    bump('shifts');
    if (!sm.angry) bump('shiftClean');
    const r = rating();
    sm.extra.push({ icon: '⭐', label: 'Hastane puanı', value: r.toLocaleString('tr-TR') + ' / 5', cls: r >= 3 ? 'up-c' : 'warn-c' });
    sm.extra.push({ icon: '🧹', label: 'Temizlik', value: '%' + cleanliness(), cls: cleanliness() >= 70 ? 'up-c' : 'warn-c' });
  });
  VH.on('shiftStart', () => { if (!ev.id && Math.random() < 0.45) startEvent(pick(['flu', 'heat', 'mci', 'inspection', 'donation'])); });

  VH.panelTabs.push({ id: 'gorevler', label: '🎯 Görevler & Başarımlar', order: 5, render: renderTasks });
  VH.targetProviders.push(targets);

  let litterT = 30;
  VH.progress = {
    EVENTS, ACH, TASKS, PRICES,
    factor, incomeMult, rating, ratingParts, cleanliness, erPool,
    get litter() { return litter; },
    get event() { return ev.id ? { id: ev.id, t: ev.t, def: EVENTS[ev.id] } : null; },
    dropLitter, clean, claimLitter, claim, ensureDaily, startEvent, endEvent, inspect, sanitize,
    renderGeneral, renderTasks, drawGround, starText,
    init() { ensureDaily(); checkAch(); },
    update(dt) {
      updateEvents(dt);
      updateInspector(dt);
      // ara sıra kuyruktaki / eczanedeki hastalar yere çöp düşürür
      litterT -= dt;
      if (litterT <= 0) {
        litterT = 25 + Math.random() * 35;
        const cands = E().patients.filter((p) => p.floor === 0 && (p.state === 'queue' || p.state === 'pharmacy' || p.state === 'labWait') && !p.moving);
        if (cands.length) { const p = pick(cands); dropLitter(p.x, p.y, 0); }
      }
      achCheckT -= dt;
      if (achCheckT <= 0) { achCheckT = 5; checkAch(); }
      litter.forEach((l) => { if (l.claimed && !E().staff.some((s) => s.id === l.claimed && s.task)) l.claimed = null; });
    },
    hud() {
      const r = rating();
      UI().setChip('chip-rating', `⭐ ${r.toLocaleString('tr-TR')}`);
      const c = document.getElementById('chip-event');
      if (c) { c.hidden = !ev.id; if (ev.id) { const g = EVENTS[ev.id].goal; UI().setChip('chip-event', `${EVENTS[ev.id].icon} ${EVENTS[ev.id].name}${g ? ' · ' + (ev.done ? '✓' : (ev.prog || 0) + '/' + g.n) : ''} · ${fmt(ev.t)}`); } }
    },
  };
})();
