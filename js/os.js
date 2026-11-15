// Vita Hospital — Başhekimlik bilgisayarı: "VitaOS" masaüstü arayüzü
//
// Başhekim odasındaki bilgisayara oturulunca tam ekran bir masaüstü açılır:
//  - Masaüstü simgeleri, sürüklenebilir pencereler (simge durumuna küçült / büyüt / kapat)
//  - Görev çubuğu: Başlat menüsü, açık uygulama sekmeleri, bildirim merkezi, saat ve tarih
//  - Uygulamalar:
//      MedKariyer.com (web tarayıcısı)  → iş ilanları, aday özgeçmişleri, işe alım (kota)
//      MedDepo ERP                       → canlı stok, sipariş, kargo takibi
//      BiyoMed Teknik                    → cihaz yıpranma/arıza, yedek parça + teknik servis
//      Yönetim Paneli                    → finans bilançosu, kameralar, doluluk, katlar, acil kredi
//      Personel, Gelişim, Ekipman, Görevler, Karne, Düzenleme Modu
// Simgeler kodla çizilen özgün SVG'lerdir (harici görsel yok). Oyun arka planda akmaya devam eder.
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state, H = () => VH.hospital, M = () => VH.map;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- Özgün SVG simgeler
  const ICON = {
    kariyer: '<rect x="6" y="14" width="36" height="24" rx="4" fill="#fff" opacity=".95"/><rect x="17" y="8" width="14" height="8" rx="2" fill="none" stroke="#fff" stroke-width="3"/><rect x="6" y="22" width="36" height="3" fill="#1f5fbf"/><circle cx="24" cy="30" r="4" fill="#1f5fbf"/>',
    depo: '<path d="M24 6 42 15v18L24 42 6 33V15z" fill="#fff" opacity=".95"/><path d="M6 15l18 9 18-9M24 24v18" stroke="#c96f4a" stroke-width="3" fill="none"/><path d="M15 10.5l18 9" stroke="#c96f4a" stroke-width="2"/>',
    teknik: '<circle cx="24" cy="24" r="9" fill="none" stroke="#fff" stroke-width="5"/><g stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/></g><circle cx="24" cy="24" r="3.5" fill="#fff"/>',
    yonetim: '<rect x="7" y="26" width="7" height="14" rx="1.5" fill="#fff"/><rect x="18" y="18" width="7" height="22" rx="1.5" fill="#fff" opacity=".9"/><rect x="29" y="10" width="7" height="30" rx="1.5" fill="#fff" opacity=".8"/><path d="M7 20l11-7 9 5 13-10" stroke="#ffd166" stroke-width="3" fill="none" stroke-linecap="round"/>',
    personel: '<circle cx="18" cy="17" r="7" fill="#fff"/><path d="M5 40c1-9 6-13 13-13s12 4 13 13z" fill="#fff"/><circle cx="33" cy="19" r="5.5" fill="#fff" opacity=".75"/><path d="M27 29c3-2 5-2 6-2 6 0 9 4 10 11h-9" fill="#fff" opacity=".75"/>',
    gelisim: '<path d="M24 6l5 11 12 1-9 8 3 12-11-7-11 7 3-12-9-8 12-1z" fill="#fff"/>',
    ekipman: '<rect x="8" y="10" width="32" height="22" rx="3" fill="#fff"/><path d="M12 22h6l3-6 4 11 3-5h8" stroke="#2ec4b6" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="20" y="33" width="8" height="5" fill="#fff"/><rect x="14" y="38" width="20" height="3" rx="1.5" fill="#fff"/>',
    gorevler: '<rect x="10" y="7" width="28" height="35" rx="3" fill="#fff"/><path d="M15 17l3 3 6-6M15 28l3 3 6-6" stroke="#46a758" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M28 17h6M28 28h6" stroke="#9aa7b0" stroke-width="3" stroke-linecap="round"/>',
    karne: '<rect x="9" y="6" width="30" height="36" rx="3" fill="#fff"/><text x="24" y="31" font-size="18" font-weight="900" text-anchor="middle" fill="#8e44ad" font-family="system-ui">A</text><path d="M14 12h20" stroke="#9aa7b0" stroke-width="3"/>',
    duzenle: '<rect x="6" y="24" width="24" height="12" rx="3" fill="#fff"/><rect x="9" y="18" width="18" height="8" rx="2" fill="#fff" opacity=".8"/><path d="M33 33l9-9-4-4-9 9-1 5z" fill="#ffd166"/>',
    start: '<g fill="#fff"><rect x="9" y="9" width="13" height="13" rx="2"/><rect x="26" y="9" width="13" height="13" rx="2"/><rect x="9" y="26" width="13" height="13" rx="2"/><rect x="26" y="26" width="13" height="13" rx="2"/></g>',
  };
  const svg = (id, bg) => `<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="11" fill="${bg}"/>${ICON[id] || ''}</svg>`;

  const APPS = [
    { id: 'kariyer', name: 'MedKariyer.com', bg: '#1f5fbf', render: renderKariyer, w: 780, h: 580, browser: true },
    { id: 'depo', name: 'MedDepo ERP', bg: '#c96f4a', render: renderDepo, w: 720, h: 560, live: true },
    { id: 'teknik', name: 'BiyoMed Teknik', bg: '#5a4fcf', render: renderTeknik, w: 720, h: 560 },
    { id: 'yonetim', name: 'Yönetim Paneli', bg: '#0f5e66', render: renderYonetim, w: 820, h: 600, live: true },
    { id: 'personel', name: 'Personel', bg: '#2e6f95', render: (l, r) => VH.staff.renderTab(l, r), w: 720, h: 560 },
    { id: 'gelisim', name: 'Hastane Gelişimi', bg: '#b5651d', render: renderGelisim, w: 720, h: 560 },
    { id: 'ekipman', name: 'Ekipman Yükseltme', bg: '#2ec4b6', render: (l, r) => VH.equipment.renderTab(l, r), w: 720, h: 560 },
    { id: 'gorevler', name: 'Görevler & Başarımlar', bg: '#46a758', render: (l, r) => VH.progress.renderTasks(l, r), w: 700, h: 560 },
    { id: 'karne', name: 'Başhekim Karnesi', bg: '#8e44ad', render: (l) => renderKarne(l), w: 640, h: 520 },
    { id: 'duzenle', name: 'Düzenleme Modu', bg: '#d1495b', action: () => { close(); VH.build.enter(); } },
  ];
  const TAB_APP = { ilan: 'kariyer', stok: 'depo', bakim: 'teknik', ozet: 'yonetim', genel: 'yonetim', servis: 'yonetim', kadro: 'personel', ekipman: 'ekipman',
    gorevler: 'gorevler', karne: 'karne', gelisim: 'gelisim', yukseltme: 'gelisim', personel: 'gelisim', duzenle: 'duzenle' };

  let root = null, z = 10, timer = 0, camTimer = 0, startOpen = false;
  const wins = new Map(); // id → { el, body, min, max, scroll }

  // ---------------------------------------------------------------- Açılış / kapanış
  function open(tab) {
    if (!root) build();
    if (tab && TAB_APP[tab]) launch(TAB_APP[tab]);
  }
  function close() {
    if (!root) return;
    clearInterval(timer); clearInterval(camTimer);
    root.remove(); root = null; wins.clear(); startOpen = false;
    persist();
  }
  const isOpen = () => !!root;

  function build() {
    UI().closeDialog(true);
    if (UI().closeMenus) UI().closeMenus();
    root = el('div', { id: 'os' });
    const desk = el('div', { className: 'os-desktop' });
    desk.appendChild(el('div', { className: 'os-wall-logo' }, '✚ VitaOS'));
    const icons = el('div', { className: 'os-icons' });
    APPS.forEach((a) => {
      const b = el('button', { type: 'button', className: 'os-icon', title: a.name });
      const ic = el('span', { className: 'os-ic' }); ic.innerHTML = svg(a.id, a.bg);
      b.appendChild(ic);
      b.appendChild(el('span', { className: 'os-icon-label' }, a.name));
      b.addEventListener('click', () => launch(a.id));
      icons.appendChild(b);
    });
    desk.appendChild(icons);
    const area = el('div', { className: 'os-windows' });
    desk.appendChild(area);
    root.appendChild(desk);
    // Görev çubuğu
    const bar = el('div', { className: 'os-taskbar' });
    const start = el('button', { type: 'button', className: 'os-start', title: 'Başlat' });
    const sic = el('span', { className: 'os-ic sm' }); sic.innerHTML = svg('start', '#1fa396'); start.appendChild(sic);
    start.appendChild(el('span', { className: 'os-start-label' }, 'Başlat'));
    start.addEventListener('click', (e) => { e.stopPropagation(); toggleStart(); });
    bar.appendChild(start);
    bar.appendChild(el('div', { className: 'os-tasks' }));
    const tray = el('div', { className: 'os-tray' });
    const bell = el('button', { type: 'button', className: 'os-bell', title: 'Bildirim merkezi' }, '🔔');
    bell.appendChild(el('span', { className: 'os-badge' }));
    bell.addEventListener('click', (e) => { e.stopPropagation(); toggleNotes(); });
    tray.appendChild(bell);
    tray.appendChild(el('span', { className: 'os-shift' }));
    const clock = el('div', { className: 'os-clock' });
    clock.appendChild(el('span', { className: 'os-time' }));
    clock.appendChild(el('span', { className: 'os-date' }));
    tray.appendChild(clock);
    const off = el('button', { type: 'button', className: 'os-power', title: 'Bilgisayardan kalk (Esc)' }, '⏻');
    off.addEventListener('click', close);
    tray.appendChild(off);
    bar.appendChild(tray);
    root.appendChild(bar);
    root.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.os-startmenu, .os-start')) hideStart();
      if (!e.target.closest('.os-notes, .os-bell')) hideNotes();
    });
    document.getElementById('ui-root').appendChild(root);
    tick();
    timer = setInterval(tick, 1000);
    camTimer = setInterval(updateLive, 1200);
    sound('door');
  }
  function tick() {
    if (!root) return;
    const d = new Date();
    root.querySelector('.os-time').textContent = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    root.querySelector('.os-date').textContent = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sh = H().shift;
    root.querySelector('.os-shift').textContent = `${H().isNightShift ? '🌙' : '☀️'} Nöbet ${sh.n} · ${money(S().budget)}`;
    const n = (UI().history || []).filter((x) => x.t > (S()._osSeen || 0)).length;
    const badge = root.querySelector('.os-badge'); badge.textContent = n ? String(n) : ''; badge.hidden = !n;
  }

  // ---------------------------------------------------------------- Başlat menüsü ve bildirim merkezi
  function toggleStart() {
    const ex = root.querySelector('.os-startmenu');
    if (ex) { ex.remove(); return; }
    hideNotes();
    const m = el('div', { className: 'os-startmenu' });
    m.appendChild(el('div', { className: 'os-sm-user' }, '🧑‍⚕️ Başhekim · Vita Hospital'));
    APPS.forEach((a) => {
      const b = el('button', { type: 'button', className: 'os-sm-item' });
      const ic = el('span', { className: 'os-ic sm' }); ic.innerHTML = svg(a.id, a.bg); b.appendChild(ic);
      b.appendChild(el('span', {}, a.name));
      b.addEventListener('click', () => { m.remove(); launch(a.id); });
      m.appendChild(b);
    });
    const off = el('button', { type: 'button', className: 'os-sm-item off' }, '⏻  Oturumu kapat (masadan kalk)');
    off.addEventListener('click', close);
    m.appendChild(off);
    root.appendChild(m);
  }
  function hideStart() { const m = root && root.querySelector('.os-startmenu'); if (m) m.remove(); }
  function toggleNotes() {
    const ex = root.querySelector('.os-notes');
    if (ex) { ex.remove(); return; }
    hideStart();
    const p = el('div', { className: 'os-notes' });
    p.appendChild(el('div', { className: 'os-notes-title' }, 'Bildirim Merkezi'));
    const hist = UI().history || [];
    if (!hist.length) p.appendChild(el('p', { className: 'muted' }, 'Yeni bildirim yok.'));
    hist.slice(0, 25).forEach((h) => {
      const r = el('div', { className: 'os-note' + (h.t > (S()._osSeen || 0) ? ' new' : '') });
      r.appendChild(el('span', { className: 'os-note-icon' }, h.icon || 'ℹ️'));
      const b = el('div', {});
      b.appendChild(el('div', {}, h.text));
      b.appendChild(el('div', { className: 'muted', style: 'font-size:11px' }, new Date(h.t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) + (h.floor !== undefined && h.floor !== null ? ' · ' + M().floorName(h.floor).split(' · ')[0] : '')));
      r.appendChild(b);
      p.appendChild(r);
    });
    S()._osSeen = Date.now();
    root.appendChild(p);
    tick();
  }
  function hideNotes() { const p = root && root.querySelector('.os-notes'); if (p) p.remove(); }

  // ---------------------------------------------------------------- Pencereler
  function launch(id) {
    const a = APPS.find((x) => x.id === id);
    if (!a) return;
    if (a.action) { a.action(); return; }
    let w = wins.get(id);
    if (w) { w.min = false; w.el.hidden = false; focus(id); return; }
    const win = el('div', { className: 'os-win' });
    const mobile = window.innerWidth < 760;
    const n = wins.size;
    const W = Math.min(a.w, window.innerWidth - 24), Hh = Math.min(a.h, window.innerHeight - 70);
    Object.assign(win.style, { width: W + 'px', height: Hh + 'px', left: Math.max(8, Math.min(window.innerWidth - W - 8, 140 + n * 28)) + 'px', top: Math.max(8, 30 + n * 24) + 'px' });
    const tb = el('div', { className: 'os-titlebar' });
    const ic = el('span', { className: 'os-ic xs' }); ic.innerHTML = svg(a.id, a.bg); tb.appendChild(ic);
    tb.appendChild(el('span', { className: 'os-title' }, a.name));
    const ctl = (label, title, fn) => { const b = el('button', { type: 'button', className: 'os-ctl', title }, label); b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); tb.appendChild(b); };
    ctl('—', 'Simge durumuna küçült', () => minimize(id));
    ctl('▢', 'Büyüt', () => toggleMax(id));
    ctl('✕', 'Kapat', () => closeWin(id));
    win.appendChild(tb);
    const body = el('div', { className: 'os-body' + (a.browser ? ' browser' : '') });
    win.appendChild(body);
    root.querySelector('.os-windows').appendChild(win);
    w = { el: win, body, min: false, max: mobile, app: a };
    wins.set(id, w);
    if (mobile) win.classList.add('max');
    win.addEventListener('pointerdown', () => focus(id));
    drag(win, tb, id);
    render(id);
    focus(id);
    addTask(a);
    sound('click');
  }
  function render(id) {
    const w = wins.get(id);
    if (!w) return;
    const scroll = (w.body.querySelector('.os-scroll') || {}).scrollTop || 0;
    w.body.innerHTML = '';
    const sc = el('div', { className: 'os-scroll' });
    const list = el('div', { className: 'shop' });
    try { w.app.render(list, () => render(id)); } catch (err) { console.error('[VitaOS]', err); list.appendChild(el('p', { className: 'warn' }, 'Uygulama yüklenemedi.')); }
    if (w.app.browser) w.body.appendChild(browserChrome());
    sc.appendChild(list);
    w.body.appendChild(sc);
    sc.scrollTop = scroll;
  }
  function focus(id) {
    const w = wins.get(id);
    if (!w) return;
    w.el.style.zIndex = String(++z);
    wins.forEach((x, k) => x.el.classList.toggle('focused', k === id));
    root.querySelectorAll('.os-task').forEach((t) => t.classList.toggle('on', t.dataset.app === id && !w.min));
  }
  function minimize(id) { const w = wins.get(id); if (!w) return; w.min = true; w.el.hidden = true; root.querySelectorAll('.os-task').forEach((t) => { if (t.dataset.app === id) t.classList.remove('on'); }); }
  function toggleMax(id) { const w = wins.get(id); if (!w) return; w.max = !w.max; w.el.classList.toggle('max', w.max); }
  function closeWin(id) { const w = wins.get(id); if (!w) return; w.el.remove(); wins.delete(id); const t = root.querySelector(`.os-task[data-app="${id}"]`); if (t) t.remove(); }
  function addTask(a) {
    const t = el('button', { type: 'button', className: 'os-task on' });
    t.dataset.app = a.id;
    const ic = el('span', { className: 'os-ic xs' }); ic.innerHTML = svg(a.id, a.bg); t.appendChild(ic);
    t.appendChild(el('span', { className: 'os-task-label' }, a.name));
    t.addEventListener('click', () => {
      const w = wins.get(a.id);
      if (!w) return;
      if (w.min) { w.min = false; w.el.hidden = false; focus(a.id); } else if (w.el.classList.contains('focused')) minimize(a.id); else focus(a.id);
    });
    root.querySelector('.os-tasks').appendChild(t);
  }
  function drag(win, handle, id) {
    let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.os-ctl') || wins.get(id).max) return;
      on = true; sx = e.clientX; sy = e.clientY; ox = win.offsetLeft; oy = win.offsetTop;
      try { handle.setPointerCapture(e.pointerId); } catch (_) { /* yok */ }
    });
    handle.addEventListener('pointermove', (e) => {
      if (!on) return;
      win.style.left = Math.max(-win.offsetWidth + 80, Math.min(window.innerWidth - 80, ox + e.clientX - sx)) + 'px';
      win.style.top = Math.max(0, Math.min(window.innerHeight - 90, oy + e.clientY - sy)) + 'px';
    });
    handle.addEventListener('pointerup', () => { on = false; });
    handle.addEventListener('dblclick', () => toggleMax(id));
  }

  // ---------------------------------------------------------------- MedKariyer.com (tarayıcı)
  let browserTab = 'ilan';
  function browserChrome() {
    const c = el('div', { className: 'br-chrome' });
    const tabs = el('div', { className: 'br-tabs' });
    [['ilan', '🔵 MedKariyer · İlanlarım'], ['basvuru', '📄 Başvurular'], ['kadro', '👥 Kadrom']].forEach(([id, label]) => {
      const b = el('button', { type: 'button', className: 'br-tab' + (browserTab === id ? ' on' : '') }, label);
      b.addEventListener('click', () => { browserTab = id; render('kariyer'); });
      tabs.appendChild(b);
    });
    c.appendChild(tabs);
    const nav = el('div', { className: 'br-nav' });
    const back = el('button', { type: 'button', className: 'br-btn', title: 'Geri' }, '←');
    back.addEventListener('click', () => { browserTab = 'ilan'; render('kariyer'); });
    const ref = el('button', { type: 'button', className: 'br-btn', title: 'Yenile' }, '⟳');
    ref.addEventListener('click', () => render('kariyer'));
    nav.appendChild(back); nav.appendChild(ref);
    const url = el('div', { className: 'br-url' });
    url.appendChild(el('span', { className: 'br-lock' }, '🔒'));
    url.appendChild(el('span', {}, `https://www.medkariyer.com/kurum/vita-hospital/${browserTab === 'ilan' ? 'ilanlar' : browserTab === 'basvuru' ? 'basvurular' : 'kadro'}`));
    nav.appendChild(url);
    c.appendChild(nav);
    return c;
  }
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
  function renderKariyer(list, rerender) {
    const st = VH.staff, d = st.quota();
    const hero = el('div', { className: 'mk-hero' });
    hero.appendChild(el('div', { className: 'mk-logo' }, 'Med', ));
    hero.firstChild.appendChild(el('b', {}, 'Kariyer'));
    hero.appendChild(el('div', { className: 'mk-sub' }, 'Sağlık profesyonelleri için kariyer platformu · Kurum: Vita Hospital'));
    list.appendChild(hero);
    const meta = el('div', { className: 'exam-meta' });
    [`👤 Bu nöbet kalan işe alım: ${d.hiresLeft}/3`, `📢 Kalan ilan yenileme: ${d.refreshLeft}/2`, `💰 Bütçe ${money(S().budget)}`].forEach((t) => meta.appendChild(el('span', {}, t)));
    list.appendChild(meta);
    if (browserTab === 'kadro') { VH.staff.renderTab(list, rerender); return; }
    if (browserTab === 'ilan') {
      list.appendChild(el('div', { className: 'sec-title' }, 'Yayındaki ilanlarım'));
      const ad = el('div', { className: 'mk-ad' });
      ad.appendChild(el('strong', {}, 'Vita Hospital · Sağlık Personeli Alımı (Hemşire, Nöbetçi Doktor, Teknisyen, Temizlik)'));
      ad.appendChild(el('span', { className: 'muted' }, `${st.candidates.length} yeni başvuru · İlan yenileme ₺500`));
      const pb = el('button', { type: 'button', className: 'dlg-btn' }, `📢 Yeni ilan yayınla (₺500 · ${d.refreshLeft} hak)`);
      pb.disabled = d.refreshLeft <= 0 || S().budget < 500 || S().budget <= 0;
      pb.addEventListener('click', () => { if (st.postAd()) { browserTab = 'basvuru'; UI().toast('📢 İlan yayınlandı: yeni başvurular geldi', 2000); } rerender(); });
      ad.appendChild(pb);
      list.appendChild(ad);
      const open = st.CORE_JOBS.filter((j) => !(S().core && S().core[j.id]));
      if (open.length) {
        list.appendChild(el('div', { className: 'sec-title' }, 'Kadro açıkları · otomasyon'));
        open.forEach((j) => {
          const card = el('div', { className: 'mk-cv' });
          card.appendChild(el('div', { className: 'mk-avatar', style: 'background:#0f5e66' }, j.icon));
          const b = el('div', { className: 'mk-cv-body' });
          b.appendChild(el('strong', {}, j.name));
          b.appendChild(el('span', { className: 'opt-desc' }, j.desc));
          b.appendChild(el('span', { className: 'shop-meta' }, `İşe alım ${money(j.fee)} · Maaş ${money(VH.staff.BASE[j.id].salary)}/nöbet`));
          card.appendChild(b);
          const why = d.hiresLeft <= 0 ? 'Kota doldu' : S().budget <= 0 || S().budget < j.fee ? 'Bütçe yetersiz' : null;
          const btn = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why || 'İşe Al');
          btn.disabled = !!why;
          btn.addEventListener('click', () => { st.hireCore(j.id); rerender(); });
          card.appendChild(btn);
          list.appendChild(card);
        });
      }
      list.appendChild(el('p', { className: 'muted' }, 'Başvuruları "Başvurular" sekmesinden inceleyin.'));
      return;
    }
    // Başvurular: özgeçmiş kartları
    list.appendChild(el('div', { className: 'sec-title' }, `Gelen başvurular (${st.candidates.length})`));
    if (!st.candidates.length) list.appendChild(el('p', { className: 'muted' }, 'Bekleyen başvuru yok. Yeni ilan yayınlayabilirsiniz.'));
    const SCHOOLS = ['Hacettepe Üniversitesi', 'Ege Üniversitesi', 'Ankara Üniversitesi', 'İstanbul Üniversitesi-Cerrahpaşa', 'Dokuz Eylül Üniversitesi', 'Karadeniz Teknik Üniversitesi', 'Atatürk Üniversitesi'];
    st.candidates.forEach((c, i) => {
      const R = st.ROLES[c.role], tr = c.trait ? st.TRAITS[c.trait] : null;
      const h = hash(c.name);
      const exp = 1 + (h % 4) + c.skill * 2;
      const score = Math.min(99, 35 + c.skill * 12 + (h % 9));
      const card = el('div', { className: 'mk-cv' });
      const av = el('div', { className: 'mk-avatar', style: `background:hsl(${h % 360},45%,42%)` }, c.name.replace(/^(Dr\.|Hem\.) /, '').split(' ').map((x) => x[0]).join('').slice(0, 2));
      card.appendChild(av);
      const b = el('div', { className: 'mk-cv-body' });
      b.appendChild(el('strong', {}, c.name));
      b.appendChild(el('span', { className: 'cand-role' }, `${R.icon} ${R.name}`));
      const bar = el('div', { className: 'mini-bar' });
      bar.appendChild(el('span', { className: 'mb-label' }, `Uzmanlık puanı ${score}/100`));
      const trk = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
      fill.style.width = score + '%'; fill.style.background = score > 75 ? '#46c46a' : score > 55 ? '#f2c94c' : '#ff9f43';
      trk.appendChild(fill); bar.appendChild(trk); b.appendChild(bar);
      b.appendChild(el('span', { className: 'opt-desc' }, `🎓 ${SCHOOLS[h % SCHOOLS.length]} · 🕒 Deneyim: ${exp} yıl`));
      b.appendChild(el('span', { className: 'opt-desc' }, tr ? `${tr.icon} ${tr.name}: ${tr.desc}` : 'Referansları olumlu, özel bir özelliği belirtilmemiş.'));
      b.appendChild(el('span', { className: 'shop-meta' }, `Maaş beklentisi ${money(c.salary)}/nöbet · İşe alım ücreti ${money(c.fee)}`));
      card.appendChild(b);
      const full = st.hired.filter((x) => x.role === c.role).length >= R.max;
      const why = full ? 'Kadro dolu' : d.hiresLeft <= 0 ? 'Kota doldu' : S().budget <= 0 || S().budget < c.fee ? 'Bütçe yetersiz' : null;
      const btn = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why || '✓ İşe Al');
      btn.disabled = !!why;
      btn.addEventListener('click', () => { st.hire(i); rerender(); });
      card.appendChild(btn);
      list.appendChild(card);
    });
  }

  // ---------------------------------------------------------------- MedDepo ERP
  const STEPS = [['confirmed', 'Sipariş Onaylandı'], ['enroute', 'Araç Yola Çıktı'], ['dock', 'Yükleme Peronuna Ulaştı'], ['delivered', 'Teslim Edildi']];
  function trackerNode() {
    const box = el('div', { className: 'erp-track' });
    const tr = VH.logistics.track;
    if (!tr.length) { box.appendChild(el('p', { className: 'muted' }, 'Aktif sipariş yok.')); return box; }
    tr.slice(0, 5).forEach((o) => {
      const r = el('div', { className: 'erp-order' });
      const head = el('div', { className: 'erp-oh' });
      head.appendChild(el('strong', {}, `${o.kind === 'part' ? '🔩' : '📦'} ${o.id}`));
      head.appendChild(el('span', { className: 'muted' }, o.label));
      r.appendChild(head);
      const steps = el('div', { className: 'erp-steps' });
      const idx = STEPS.findIndex(([s]) => s === o.status);
      STEPS.forEach(([s, label], i) => steps.appendChild(el('span', { className: 'erp-step' + (i < idx ? ' done' : i === idx ? ' on' : '') }, (i < idx ? '✓ ' : '') + label)));
      r.appendChild(steps);
      if (o.status === 'confirmed' && VH.logistics.dispatchIn >= 0) r.appendChild(el('span', { className: 'muted' }, `⏱ Araç ${Math.ceil(VH.logistics.dispatchIn)} sn içinde yola çıkacak`));
      box.appendChild(r);
    });
    return box;
  }
  function renderDepo(list, rerender) {
    const head = el('div', { className: 'erp-head' });
    head.appendChild(el('strong', {}, 'MedDepo ERP · Eczane ve Tıbbi Sarf Stok Yönetimi'));
    head.appendChild(el('span', { className: 'muted' }, 'Canlı stok · otomatik kritik seviye uyarısı · yerleşke içi yükleme peronuna teslimat'));
    list.appendChild(head);
    VH.logistics.renderStock(list, rerender);
    list.appendChild(el('div', { className: 'sec-title' }, 'Kargo takibi'));
    const t = trackerNode();
    t.id = 'erp-live';
    list.appendChild(t);
  }
  // ---------------------------------------------------------------- BiyoMed Teknik
  function renderTeknik(list, rerender) {
    const head = el('div', { className: 'erp-head teknik' });
    head.appendChild(el('strong', {}, 'BiyoMed Teknik · Tıbbi Cihaz Servis Portalı'));
    const broken = VH.equipment.CATS.filter((c) => VH.equipment.broken(c.id)).length;
    head.appendChild(el('span', { className: 'muted' }, broken ? `⚠️ ${broken} arızalı cihaz grubu: yedek parça + teknik servis talebi oluşturun.` : '✓ Arızalı cihaz yok. Yıpranma yüzdelerini izleyin.'));
    list.appendChild(head);
    VH.equipment.renderParts(list, rerender);
    list.appendChild(el('div', { className: 'sec-title' }, 'Servis talepleri'));
    const t = trackerNode(); t.id = 'erp-live';
    list.appendChild(t);
  }
  // ---------------------------------------------------------------- Hastane Gelişimi
  function renderGelisim(list, rerender) {
    list.appendChild(el('div', { className: 'sec-title' }, 'Gelişim mağazası'));
    H().renderBase('gelisim', list, rerender);
    list.appendChild(el('div', { className: 'sec-title' }, 'Hastane yükseltmeleri'));
    H().renderBase('yukseltme', list, rerender);
    list.appendChild(el('div', { className: 'sec-title' }, 'Uzman kadro'));
    H().renderBase('personel', list, rerender);
  }
  function renderKarne(list) {
    const c = S().lastCard;
    if (!c) { list.appendChild(el('p', { className: 'muted' }, 'İlk nöbet bitince karneniz burada görünecek.')); return; }
    list.appendChild(VH.terminal.cardNode(c));
  }

  // ---------------------------------------------------------------- Yönetim Paneli: finans, kameralar, doluluk, katlar, kredi
  let ymTab = 'finans';
  function renderYonetim(list, rerender) {
    const tabs = el('div', { className: 'tabs' });
    [['finans', '💹 Finans'], ['kamera', '📹 Kameralar'], ['doluluk', '🏥 Doluluk'], ['katlar', '🏗️ Katlar'], ['kredi', '🏦 Acil Kredi'], ['ayar', '⚙️ Genel']].forEach(([id, label]) => {
      const b = el('button', { type: 'button', className: 'tab' + (ymTab === id ? ' on' : '') }, label);
      b.addEventListener('click', () => { ymTab = id; rerender(); });
      tabs.appendChild(b);
    });
    list.appendChild(tabs);
    if (ymTab === 'finans') finans(list);
    else if (ymTab === 'kamera') kameralar(list);
    else if (ymTab === 'doluluk') { const d = el('div', { id: 'occ-live' }); doluluk(d); list.appendChild(d); }
    else if (ymTab === 'katlar') katlar(list, rerender);
    else if (ymTab === 'kredi') kredi(list, rerender);
    else { VH.progress.renderGeneral(list, rerender); }
  }
  function finans(list) {
    const st = S(), sh = H().shift, s = sh.stats || {};
    const income = Math.round(st.budget - (s.budget0 || st.budget) + (s.spent || 0));
    const payroll = VH.staff.payroll();
    const loan = st.loan && st.loan.left > 0 ? st.loan.pay : 0;
    const kpi = el('div', { className: 'shift-grid' });
    const card = (icon, label, value, cls) => { const c = el('div', { className: 'shift-card' + (cls ? ' ' + cls : '') }); c.appendChild(el('span', { className: 'sc-icon' }, icon)); c.appendChild(el('span', { className: 'sc-val' }, value)); c.appendChild(el('span', { className: 'sc-label' }, label)); kpi.appendChild(c); };
    card('💰', 'Kasa', money(st.budget), st.budget > 0 ? 'up-c' : 'down-c');
    card('📈', 'Bu nöbetin geliri', money(income), income >= 0 ? 'up-c' : 'down-c');
    card('🛒', 'Bu nöbetin harcaması', money(s.spent || 0));
    card('💼', 'Nöbet sonu maaş', '−' + money(payroll), 'down-c');
    if (loan) card('🏦', 'Kredi taksiti', '−' + money(loan), 'down-c');
    card('🧮', 'Tahmini net', money(income - payroll - loan), income - payroll - loan >= 0 ? 'up-c' : 'down-c');
    card('🏥', 'Pasif servis geliri', money(H().incomePerMin()) + '/dk');
    list.appendChild(kpi);
    list.appendChild(el('div', { className: 'sec-title' }, 'Gelir – gider bilançosu (son nöbetler)'));
    const log = (st.shiftLog || []).slice(-8);
    if (!log.length) { list.appendChild(el('p', { className: 'muted' }, 'İlk nöbet bitince bilanço oluşur.')); return; }
    const maxV = Math.max(1, ...log.map((x) => Math.max(Math.abs(x.income || 0), x.payroll || 0)));
    const chart = el('div', { className: 'fin-chart' });
    log.forEach((x) => {
      const col = el('div', { className: 'fin-col' });
      const inc = el('span', { className: 'fin-bar inc' }); inc.style.height = Math.max(2, (Math.max(0, x.income) / maxV) * 90) + 'px';
      const out = el('span', { className: 'fin-bar out' }); out.style.height = Math.max(2, ((x.payroll || 0) / maxV) * 90) + 'px';
      const bars = el('div', { className: 'fin-bars' }); bars.appendChild(inc); bars.appendChild(out);
      col.appendChild(bars);
      col.appendChild(el('span', { className: 'fin-lbl' }, `${x.n}.`));
      chart.appendChild(col);
    });
    list.appendChild(chart);
    list.appendChild(el('p', { className: 'muted' }, '🟩 Gelir · 🟥 Maaş gideri'));
    const tbl = el('div', { className: 'fin-table' });
    tbl.appendChild(el('div', { className: 'fin-row head' }, 'Nöbet · Gelir · Maaş · Net · İtibar'));
    log.slice().reverse().forEach((x) => tbl.appendChild(el('div', { className: 'fin-row' }, `${x.n}. ${x.night ? '🌙' : '☀️'} · ${money(x.income)} · −${money(x.payroll || 0)} · ${money((x.income || 0) - (x.payroll || 0))} · ${x.rep >= 0 ? '+' : ''}${x.rep}`)));
    list.appendChild(tbl);
  }
  // Kameralar: her besleme oyunun kendi çizim motoruyla küçük tuvale çizilir
  const FEEDS = [['ACİL SERVİS', 25, 16, 1.1, 0], ['BEKLEME SALONU', 14, 16, 1.05, 0], ['ECZANE', 27.5, 4.5, 1.35, 0], ['GİRİŞ & OTOPARK', 24, 25, 0.62, 0]];
  function kameralar(list) {
    const grid = el('div', { className: 'cam-grid' });
    FEEDS.forEach(([name], i) => {
      const f = el('div', { className: 'cam-feed' });
      const cv = el('canvas', { className: 'cam-cv' });
      cv.width = 320; cv.height = 190; cv.dataset.feed = i;
      f.appendChild(cv);
      f.appendChild(el('span', { className: 'cam-name' }, `● REC · CAM ${i + 1} · ${name}`));
      grid.appendChild(f);
    });
    list.appendChild(grid);
    list.appendChild(el('p', { className: 'muted' }, 'Kameralar zemin katı canlı olarak gösterir (yaklaşık 1 sn gecikmeli).'));
    setTimeout(drawFeeds, 30);
  }
  function drawFeeds() {
    if (!root) return;
    const cvs = root.querySelectorAll('.cam-cv');
    if (!cvs.length || M().floor !== 0) return;
    const cam = M().camera;
    const saved = { x: cam.x, y: cam.y, zoom: cam.zoom, want: cam.want };
    const labels = M().labels;
    M().labels = false;
    try {
      cvs.forEach((cv) => {
        const [, x, y, zoom] = FEEDS[+cv.dataset.feed];
        const ctx = cv.getContext('2d');
        cam.zoom = zoom * 0.55; [cam.x, cam.y] = M().worldToIso(x, y);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        M().draw(ctx, cv.width, cv.height, E().drawables(M()).concat(H().drawables(M()), VH.world.drawables(M()), VH.logistics.drawables(M())), { night: H().night });
        ctx.fillStyle = 'rgba(20,40,30,0.18)'; ctx.fillRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; for (let yy = 0; yy < cv.height; yy += 3) ctx.fillRect(0, yy, cv.width, 1);
        ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(14, 14, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '600 10px monospace'; ctx.fillText(new Date().toLocaleTimeString('tr-TR'), cv.width - 64, 16);
      });
    } finally {
      Object.assign(cam, saved);
      M().labels = labels;
    }
  }
  function occRow(label, used, total) {
    const r = el('div', { className: 'mini-bar' });
    r.appendChild(el('span', { className: 'mb-label' }, `${label} ${used}/${total}`));
    const tr = el('span', { className: 'mb-track' }), fill = el('span', { className: 'mb-fill' });
    const v = total ? used / total : 0;
    fill.style.width = Math.round(v * 100) + '%'; fill.style.background = v > 0.85 ? '#ff5a5f' : v > 0.6 ? '#f2c94c' : '#46c46a';
    tr.appendChild(fill); r.appendChild(tr);
    return r;
  }
  function doluluk(box) {
    box.innerHTML = '';
    const P = E().patients;
    box.appendChild(el('div', { className: 'sec-title' }, 'Birim doluluk oranları (canlı)'));
    const seats = E().openSeatCount;
    box.appendChild(occRow('Bekleme salonu', P.filter((p) => p.state === 'waiting' || p.state === 'toSeat').length, seats));
    box.appendChild(occRow('Muayene odaları', E().EXAMS.filter((x) => x.patient).length, E().EXAMS.filter((x) => E().core(x.doctor)).length));
    box.appendChild(occRow('Kan alma', P.filter((p) => p.state === 'lab' || p.state === 'labWait' || p.state === 'toLab').length, 4));
    box.appendChild(occRow('Acil yatakları', H().BAYS_STATE().filter(Boolean).length, 3));
    box.appendChild(occRow('Eczane kuyruğu', E().pharmacyQueue.length, 5));
    if (H().has('services', 'ward')) box.appendChild(occRow('Yatan hasta servisi', P.filter((p) => p.floor === 2 && p.state === 'resident' && !p.gone).length, M().floorObjects(2).filter((o) => o.tag === 'ward_bed').length));
    if (H().has('services', 'surgery')) box.appendChild(occRow('Ameliyathane', VH.surgery.queue.length, 1));
    if (H().has('services', 'radiology')) box.appendChild(occRow('Görüntüleme sırası', VH.floors.imaging.length, 4));
    const pk = VH.world.parkers;
    box.appendChild(occRow('Ziyaretçi otoparkı', pk.filter((c) => c.state === 'parked').length, 20));
  }
  function katlar(list, rerender) {
    list.appendChild(el('p', { className: 'muted' }, 'Yeni kat açılışı için yeterli bütçe, minimum itibar ve tamamlanmış vaka sayısı gerekir. Bütçe ekside iken onay verilemez.'));
    H().renderBase('servis', list, rerender);
  }
  function kredi(list, rerender) {
    const st = S();
    const ln = st.loan && st.loan.left > 0 ? st.loan : null;
    list.appendChild(el('p', {}, 'Bütçe eksiye düştüğünde kat, cihaz, personel ve sipariş alımları kilitlenir. Acil kredi kasayı hemen toparlar; taksitler sonraki 5 nöbet sonunda maaşlarla birlikte kesilir.'));
    if (ln) {
      list.appendChild(el('div', { className: 'new-clue' }, `🏦 Aktif kredi: kalan ${ln.left} taksit × ${money(ln.pay)}`));
      return;
    }
    const card = el('div', { className: 'shop-card' });
    card.appendChild(el('div', { className: 'shop-icon' }, '🏦'));
    const b = el('div', { className: 'shop-body' });
    b.appendChild(el('strong', {}, 'Sağlık Kalkınma Bankası · Acil Kredi'));
    b.appendChild(el('span', { className: 'opt-desc' }, '₺20.000 hemen hesaba geçer · 5 nöbet × ₺4.800 geri ödeme (toplam ₺24.000)'));
    card.appendChild(b);
    const can = st.budget < 15000;
    const btn = el('button', { type: 'button', className: 'dlg-btn' + (can ? '' : ' ghost') }, can ? 'Krediyi kullan' : 'Kasa yeterli');
    btn.disabled = !can;
    btn.addEventListener('click', () => {
      st.budget += 20000; st.loan = { left: 5, pay: 4800 };
      sound('success'); UI().toast('🏦 ₺20.000 acil kredi hesaba geçti', 2600);
      if (VH.emit) VH.emit('loan', {});
      persist(); rerender();
    });
    card.appendChild(btn);
    list.appendChild(card);
  }

  // Canlı bölümleri (kargo takibi, doluluk, kameralar) yerinde güncelle
  function updateLive() {
    if (!root) return;
    root.querySelectorAll('#erp-live').forEach((n) => { const t = trackerNode(); t.id = 'erp-live'; n.replaceWith(t); });
    const occ = root.querySelector('#occ-live'); if (occ) doluluk(occ);
    if (root.querySelector('.cam-cv')) drawFeeds();
  }

  VH.os = {
    open, close, isOpen, launch,
    openTab(tab) { const id = TAB_APP[tab] || 'yonetim'; if (id === 'kariyer' && tab === 'ilan') browserTab = 'basvuru'; launch(id); if (wins.get(id)) render(id); },
    get windows() { return [...wins.keys()]; },
    APPS,
  };
})();
