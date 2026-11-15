// Vita Hospital — Başhekimlik bilgisayarı (yönetim terminali) ve vardiya sonu Başhekim Karnesi
//
// Başhekim odasındaki bilgisayarda "Yönetim Terminali" açılır. Terminal, yönetim panelinin
// tüm uygulamalarını toplar: Özet (uyarılar), Stok & Lojistik, Bakım & Parça, İş İlanları,
// Personel, Ekipman, Servisler ve Karne. Sipariş ve işe alım yalnızca bilgisayar başında yapılır;
// başka yerden açıldığında durum izlenebilir ve "Yol göster" ile odaya yön çizgisi çizilir.
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state, H = () => VH.hospital;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');

  function desk() { return E().devices.find((d) => d.tag === 'chief_desk' && d.floor === 0); }
  function atDesk() {
    const P = E().player, d = desk();
    return !!d && P.floor === 0 && E().rectDist(P.x, P.y, d) <= 1.6;
  }
  // Uzaktan (bilgisayar başında değilken) yalnızca salt okunur özet sekmeleri açılır
  const REMOTE_OK = ['ozet', 'genel', 'gorevler', 'karne'];
  function open(tab) {
    if (atDesk() && VH.os) { VH.os.open(tab); return; }
    H().openPanel(REMOTE_OK.includes(tab) ? tab : 'ozet');
  }
  function guide() {
    const d = desk();
    if (!d) return;
    UI().closeDialog(true);
    VH.guide.setGoal({ floor: 0, x: d.x, y: d.y1 + 0.6, label: 'Başhekimlik bilgisayarı', icon: '🖥️', title: 'Yönetim Terminali', reach: 1.5,
      instruction: 'Başhekimlik odasındaki bilgisayara gidin: sipariş, işe alım ve servis yönetimi buradan yapılır.', onReach: () => { UI().toast('🖥️ Terminal hazır: E ile açın.', 2000); } });
    UI().toast('🧭 Başhekimlik odasına yön çizgisi çizildi.', 2000);
  }

  // ---------------------------------------------------------------- Özet (uyarı merkezi)
  function alerts() {
    const out = [];
    const st = S();
    if (VH.logistics) Object.keys(VH.logistics.CATS).forEach((k) => { const n = VH.logistics.stock[k]; if (n <= VH.logistics.CRITICAL) out.push(['📦', `Stok kritik: ${VH.logistics.CATS[k].name} (${n})`, 'stok']); });
    if (VH.equipment) VH.equipment.CATS.forEach((c) => { if (VH.equipment.broken(c.id)) out.push(['⚠️', `Arızalı: ${c.name}`, 'bakim']); else if (VH.equipment.cond(c.id) < 40) out.push(['🔧', `Bakım gerekli: ${c.name} (%${Math.round(VH.equipment.cond(c.id))})`, 'bakim']); });
    if (VH.surgery && VH.surgery.queue.length) out.push(['🩻', `Ameliyat bekleyen hasta: ${VH.surgery.queue.length}`, null]);
    if (VH.floors) VH.floors.alerts().forEach((a) => out.push(a));
    if (!E().core('receptionist')) out.push(['📋', 'Resepsiyon görevlisi yok: kayıtları siz yapıyorsunuz', 'ilan']);
    if (!E().core('pharmacist')) out.push(['💊', 'Eczacı yok: reçeteleri siz teslim ediyorsunuz', 'ilan']);
    if (st.budget <= 0) out.push(['💸', 'Bütçe ekside: satın alımlar kilitli', null]);
    return out;
  }
  function renderOverview(list, rerender) {
    const st = S();
    const head = el('div', { className: 'term-head' });
    head.appendChild(el('span', { className: 'term-dot' + (atDesk() ? ' on' : '') }));
    head.appendChild(el('strong', {}, atDesk() ? 'Başhekimlik Bilgisayarı · Oturum açık' : 'Uzaktan görüntüleme (salt okunur)'));
    if (!atDesk()) { const b = el('button', { type: 'button', className: 'mini-btn' }, '🧭 Bilgisayara git'); b.addEventListener('click', guide); head.appendChild(b); }
    list.appendChild(head);
    const kpi = el('div', { className: 'shift-grid' });
    const card = (icon, label, value, cls) => { const c = el('div', { className: 'shift-card' + (cls ? ' ' + cls : '') }); c.appendChild(el('span', { className: 'sc-icon' }, icon)); c.appendChild(el('span', { className: 'sc-val' }, value)); c.appendChild(el('span', { className: 'sc-label' }, label)); kpi.appendChild(c); };
    card('💰', 'Bütçe', money(st.budget), st.budget > 0 ? 'up-c' : 'down-c');
    card('💎', 'İtibar', String(st.reputation));
    card('⭐', 'Hastane puanı', VH.progress ? VH.progress.rating().toLocaleString('tr-TR') : '—');
    card('💼', 'Bordro / nöbet', VH.staff ? money(VH.staff.payroll()) : '—');
    card('📋', 'Çözülen vaka', String(st.solved.length));
    card('🏥', 'Açık kat', String(Object.keys(st.services || {}).filter((k) => st.services[k]).length) + '/3');
    list.appendChild(kpi);
    list.appendChild(el('div', { className: 'sec-title' }, 'Uyarılar'));
    const al = alerts();
    if (!al.length) list.appendChild(el('p', { className: 'muted' }, '✓ Her şey yolunda. Kritik uyarı yok.'));
    al.forEach(([icon, text, tab]) => {
      const row = el('div', { className: 'alert-row' });
      row.appendChild(el('span', {}, icon));
      row.appendChild(el('span', { className: 'ar-text' }, text));
      if (tab) { const b = el('button', { type: 'button', className: 'mini-btn' }, 'Aç'); b.addEventListener('click', () => H().openPanel(tab)); row.appendChild(b); }
      list.appendChild(row);
    });
    if (st.lastCard) { list.appendChild(el('div', { className: 'sec-title' }, `Son karne · ${st.lastCard.n}. nöbet`)); list.appendChild(cardNode(st.lastCard, true)); }
  }

  // ---------------------------------------------------------------- Başhekim Karnesi
  const LETTERS = ['F', 'D', 'C', 'B', 'A'];
  const grade = (v, cuts) => { let i = 0; while (i < cuts.length && v >= cuts[i]) i++; return i; }; // 0..4
  function makeCard(sm) {
    const morale = VH.staff ? E().staff.filter((s) => s.floor >= 0).reduce((a, s) => a + VH.staff.rec(s.id).morale, 0) / Math.max(1, E().staff.filter((s) => s.floor >= 0).length) : 70;
    const served = sm.treated + sm.er;
    const angryRatio = sm.angry / Math.max(1, served + sm.angry);
    const erTotal = sm.er + sm.erFail;
    const net = sm.income - (sm.payroll || 0);
    const items = [
      { k: 'Hasta memnuniyeti', icon: '😊', g: 4 - grade(angryRatio, [0.05, 0.12, 0.2, 0.3]), note: `${sm.angry} hasta beklemekten sıkılıp gitti` },
      { k: 'Acil servis', icon: '🚑', g: erTotal ? grade(sm.er / erTotal, [0.4, 0.6, 0.75, 0.9]) : null, note: erTotal ? `${sm.er}/${erTotal} acil hasta stabilize edildi` : 'Bu nöbette acil vaka yok' },
      { k: 'Klinik kalite', icon: '🩺', g: grade(sm.rep, [-5, 0, 4, 8]), note: `İtibar ${sm.rep >= 0 ? '+' : ''}${sm.rep}, ${sm.cases} vaka` },
      { k: 'Finans', icon: '💰', g: grade(net, [-3000, 0, 4000, 8000]), note: `Net ${money(net)} (gelir ${money(sm.income)}, maaş ${money(sm.payroll || 0)})` },
      { k: 'Temizlik', icon: '🧹', g: grade(VH.progress ? VH.progress.cleanliness() : 80, [40, 55, 70, 85]), note: `Temizlik %${VH.progress ? VH.progress.cleanliness() : 80}` },
      { k: 'Personel', icon: '👥', g: grade(morale, [40, 55, 65, 75]), note: `Ortalama moral %${Math.round(morale)}` },
    ];
    const valid = items.filter((x) => x.g !== null);
    const avg = valid.reduce((a, x) => a + x.g, 0) / Math.max(1, valid.length);
    const overall = LETTERS[Math.round(avg)] + (avg - Math.round(avg) > 0.2 ? '+' : avg - Math.round(avg) < -0.2 ? '−' : '');
    const weakest = valid.slice().sort((a, b) => a.g - b.g)[0];
    return { n: sm.n, overall, items: items.map((x) => ({ k: x.k, icon: x.icon, g: x.g === null ? '—' : LETTERS[x.g], note: x.note })), tip: weakest ? `Geliştirilecek alan: ${weakest.k.toLowerCase()}` : '' };
  }
  function cardNode(c, compact) {
    const box = el('div', { className: 'report-card' });
    const top = el('div', { className: 'rc-top' });
    top.appendChild(el('span', { className: 'rc-grade g-' + c.overall[0] }, c.overall));
    const tt = el('div', {});
    tt.appendChild(el('strong', {}, `${c.n}. Nöbet · Başhekim Karnesi`));
    tt.appendChild(el('span', { className: 'muted', style: 'display:block' }, c.tip));
    top.appendChild(tt);
    box.appendChild(top);
    if (!compact || true) {
      const g = el('div', { className: 'rc-grid' });
      c.items.forEach((x) => {
        const r = el('div', { className: 'rc-item' });
        r.appendChild(el('span', { className: 'rc-g g-' + x.g[0] }, x.g));
        const t = el('div', {});
        t.appendChild(el('strong', {}, `${x.icon} ${x.k}`));
        t.appendChild(el('span', { className: 'muted', style: 'display:block;font-size:11.5px' }, x.note));
        r.appendChild(t);
        g.appendChild(r);
      });
      box.appendChild(g);
    }
    return box;
  }
  function renderCard(list) {
    const st = S();
    if (!st.lastCard) { list.appendChild(el('p', { className: 'muted' }, 'İlk nöbet bitince karneniz burada görünecek.')); return; }
    list.appendChild(cardNode(st.lastCard));
    if (st.cards && st.cards.length > 1) {
      list.appendChild(el('div', { className: 'sec-title' }, 'Önceki nöbetler'));
      const row = el('div', { className: 'exam-meta' });
      st.cards.slice(-8).reverse().forEach((c) => row.appendChild(el('span', {}, `${c.n}. nöbet: ${c.overall}`)));
      list.appendChild(row);
    }
  }
  // Acil kredi taksiti ve iflas koruması (maaşlar staff.js'te kesildikten sonra)
  VH.on('shiftEnd', (sm) => {
    const st = S();
    if (st.loan && st.loan.left > 0) {
      st.budget -= st.loan.pay; st.loan.left--;
      sm.extra.push({ icon: '🏦', label: `Kredi taksiti (kalan ${st.loan.left})`, value: '−' + money(st.loan.pay), cls: 'down-c' });
      if (st.loan.left <= 0) st.loan = null;
    }
    if (st.budget < 0) {
      sm.extra.push({ icon: '⛔', label: 'İflas koruması: alımlar kilitli', value: money(st.budget), cls: 'down-c' });
      if (VH.notify) VH.notify('⛔', `Bütçe ekside (${money(st.budget)}): kat, cihaz ve personel alımı kilitlendi. Vakaları tamamlayın ya da bilgisayardan acil kredi alın.`, 0, 'bankrupt');
    }
  });
  VH.on('shiftEnd', (sm) => {
    const c = makeCard(sm);
    const st = S();
    st.lastCard = c;
    st.cards = (st.cards || []).concat([{ n: c.n, overall: c.overall }]).slice(-10);
    sm.extra.unshift({ icon: '📝', label: `Başhekim Karnesi · ${c.tip || 'tebrikler'}`, value: c.overall, cls: /^[AB]/.test(c.overall) ? 'up-c' : /^C/.test(c.overall) ? '' : 'down-c' });
    if (VH.emit) VH.emit('reportCard', c);
  });

  function sanitizeCard(c) {
    if (!c || typeof c !== 'object' || !Array.isArray(c.items)) return null;
    const L = /^[A-F—][+−]?$/;
    const items = c.items.slice(0, 8).filter((x) => x && typeof x.k === 'string' && L.test(String(x.g))).map((x) => ({ k: x.k.slice(0, 30), icon: String(x.icon || '').slice(0, 4), g: x.g, note: String(x.note || '').slice(0, 90) }));
    if (!L.test(String(c.overall))) return null;
    return { n: Math.max(1, Math.round(+c.n || 1)), overall: c.overall, items, tip: String(c.tip || '').slice(0, 80) };
  }

  VH.panelTabs.push({ id: 'ozet', label: '🖥️ Özet', order: 0, render: renderOverview });
  VH.panelTabs.push({ id: 'karne', label: '📝 Karne', order: 40, render: renderCard });

  VH.terminal = { REMOTE_OK, atDesk, open, guide, alerts, makeCard, sanitizeCard, cardNode };
})();
