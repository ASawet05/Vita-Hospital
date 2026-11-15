// Vita Hospital — Katların aktif işlevleri, yemekhane ve Başhekim enerjisi
//
// 2. Kat (Yatan Hasta & Pediatri): yatırılan hastaların serum/ilaç/ateş takibi zamanı gelince
//   yatağın üstünde simge belirir. Başhekim ya da servis hemşiresi uygular. Üç takipten sonra
//   hasta taburcu olur. Pediatri odasındaki oyuncaklar çocukların moralini yükseltir.
// 3. Kat (Radyoloji & İleri Tanı): "Daha fazla tetkik" kararı verilen vakalar ve inme şüphesindeki
//   acil hastalar burada görüntülenir. Güvenlik sorusu (MR: implant kontrolü, röntgen: radyasyon
//   koruması) ve tarama mini oyunu vardır. Radyolog gelmezseniz kendisi üstlenir. Diyaliz seansları
//   da bu katta izlenir.
// B1 (Yemekhane): Başhekimin enerji barı zamanla ve koşarken azalır; yemek/kahve ile dolar.
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state, H = () => VH.hospital, M = () => VH.map;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };
  const notify = (i, t, f, k) => { if (VH.notify) VH.notify(i, t, f, k); };

  // ================================================================ 2. Kat: yatan hasta takibi
  const CARE = [['💉', 'Serum değişimi'], ['💊', 'İlaç saati'], ['🌡️', 'Ateş ve tansiyon ölçümü']];
  function wardPatients() { return E().patients.filter((p) => p.floor === 2 && p.state === 'resident' && !p.gone); }
  function ensureCare(p) {
    if (!p.care) p.care = { next: rand(25, 70), need: null, waited: 0, cycles: 0, max: p.admitted ? 3 : 99 };
    return p.care;
  }
  const pedsToys = () => M().floorObjects(2).filter((o) => ['teddy', 'toy_box', 'play_mat'].includes(o.k) && o.x >= 12).length;
  function doCare(p, byPlayer) {
    const c = ensureCare(p);
    if (!c.need) return;
    const child = p.look && p.look.scale;
    const pay = byPlayer ? 260 : 120;
    H().reward(byPlayer ? (child ? 2 : 1) : 0, 1, pay);
    p.emote = { icon: child ? (pedsToys() >= 2 ? '🎈' : '🙂') : '😊', until: performance.now() + 2500 };
    E().say(p, byPlayer ? (child ? 'Hiç acımadı! Teşekkürler doktor amca/teyze!' : 'Çok teşekkür ederim doktor bey.') : 'Hemşire hanım ilgilendi, sağ olsun.', 2200);
    c.need = null; c.waited = 0; c.next = rand(45, 85); c.cycles++;
    if (VH.emit) VH.emit('wardCare', { byPlayer });
    if (c.cycles >= c.max) {
      S().budget += 800;
      notify('🏠', `${p.name} servisten taburcu oldu (+₺800).`, 2, 'discharge');
      E().say(p, 'Taburcu oluyorum, her şey için teşekkürler!', 2400);
      setTimeout(() => { p.gone = true; }, 1500);
    }
  }
  function updateWard(dt) {
    if (!H().has('services', 'ward')) return;
    const nurse = E().staffById('wardNurse');
    for (const p of wardPatients()) {
      const c = ensureCare(p);
      if (!c.need) {
        c.next -= dt;
        if (c.next <= 0) { c.need = pick(CARE); c.waited = 0; if (E().player.floor !== 2 && Math.random() < 0.5) notify(c.need[0], `2. Kat: ${p.name} için ${c.need[1].toLowerCase()} zamanı.`, 2, 'ward'); }
      } else {
        c.waited += dt;
        p.emote = { icon: c.need[0], until: performance.now() + 400 };
        if (nurse && c.waited > 28) doCare(p, false);
        else if (c.waited > 80) { H().reward(-1, -1, 0); c.need = null; c.next = rand(40, 70); }
      }
    }
  }
  /** Hastayı yatan hasta servisine yatır (acil/ameliyat sonrası). */
  function admit(p, reason) {
    if (!H().has('services', 'ward')) return false;
    const beds = M().floorObjects(2).filter((o) => o.tag === 'ward_bed').map((o) => [o.x + 0.5, o.y + 0.5]);
    const taken = (b) => E().patients.some((q) => q.floor === 2 && !q.gone && Math.abs(q.x - b[0]) < 0.1 && Math.abs(q.y - b[1]) < 0.1);
    const bed = beds.find((b) => !taken(b));
    if (!bed) return false;
    const r = E().addResident({ floor: 2, x: bed[0], y: bed[1], lift: 12, name: p.name, age: p.age, look: p.look, complaint: (p.complaint || '') + ' · ' + reason });
    r.admitted = true;
    r.care = { next: rand(12, 25), need: null, waited: 0, cycles: 0, max: 3 };
    notify('🛏️', `${p.name} 2. kata yatırıldı (${reason}).`, 2, 'admit');
    return true;
  }

  // ================================================================ 3. Kat: görüntüleme
  const MODS = {
    xray: { name: 'Röntgen', icon: '🩻', spot: [4.5, 4.5], lie: false, q: { q: 'Röntgen öncesi hangisi doğru?', opts: [['Gereksiz tekrar çekimden kaçın, uygun bölgeye kurşun koruma uygula, doğurganlık çağındaki kadında gebelik olasılığını sor.', true], ['Görüntü net olsun diye aynı çekimi birkaç kez tekrarla.', false], ['Radyasyon dozu önemsiz, koruma gereksiz.', false]] } },
    mri: { name: 'MR', icon: '🧲', spot: [17.5, 11.9], via: [18, 12], lie: true, lift: 20, q: { q: 'MR çekiminden önce mutlaka ne kontrol edilir?', opts: [['Kalp pili, metal implant ya da yabancı cisim olup olmadığı ve cihazın MR uyumluluğu.', true], ['Hastanın en son ne zaman spor yaptığı.', false], ['Hiçbir şey; MR radyasyon içermediği için herkes için tamamen risksizdir.', false]] } },
    ultrasound: { name: 'Ultrason', icon: '📡', spot: [11.75, 4.5], via: [11, 5], lie: true, lift: 13, q: { q: 'Ultrasonun avantajı hangisidir?', opts: [['İyonlaştırıcı radyasyon kullanmaz; birçok değerlendirmede ilk basamaktır.', true], ['Her durumda MR\'dan daha ayrıntılı görüntü verir.', false], ['Yalnızca kemik kırıklarında kullanılır.', false]] } },
    ecg: { name: 'EKG / Ritim kaydı', icon: '💓', spot: [18.75, 3.5], via: [17, 3], lie: true, lift: 13, q: { q: 'Doğru bir EKG kaydı için hangisi gerekir?', opts: [['Elektrotlar doğru yerleştirilir, hasta rahat ve hareketsiz yatar.', true], ['Hasta kayıt sırasında konuşup hareket etmelidir.', false], ['Elektrotların yeri önemli değildir.', false]] } },
  };
  function modalityForCase(c) {
    const t = (c.testsWhat || '') + ' ' + (c.referTo || '');
    if (/EKG|Holter|ritim/i.test(t)) return 'ecg';
    if (/MR|görüntüleme|nörolo/i.test(c.testsWhat || '')) return 'mri';
    if (/ultrason/i.test(t)) return 'ultrasound';
    if (/DEXA|kemik|röntgen|göz dibi/i.test(c.testsWhat || '')) return /göz dibi/i.test(c.testsWhat) ? 'ecg' : 'xray';
    return null;
  }
  const imaging = []; // { p, mod, ready, wait, er, caseRef }
  const wantsImagingER = (def) => !!(def && def.imaging && H().has('services', 'radiology'));
  function sendImaging(p, opt) {
    const mod = opt.er ? opt.er.imaging : modalityForCase(opt.caseRef);
    const m = MODS[mod];
    if (!m) return false;
    const item = { p, mod, ready: false, wait: 0, er: opt.er || null, caseRef: opt.caseRef || null };
    imaging.push(item);
    p.state = 'imaging'; p.chair = false; p.lying = false; p.sitting = false;
    E().say(p, `${m.name} için radyolojiye gidiyorum.`, 2200);
    notify(m.icon, `3. Kat: ${p.name} ${m.name} bekliyor. Görüntülemeyi siz yapın ya da radyolog üstlensin.`, 3, 'imaging');
    E().moveToFloor(p, 3, m.spot[0], m.spot[1], (e) => {
      if (m.lie) { E().sitAt(e, m.spot, m.lift || 13); e.sitting = false; e.lying = true; }
      item.ready = true;
    }, m.via);
    return true;
  }
  function imagingDone(item, score, byPlayer) {
    const i = imaging.indexOf(item);
    if (i >= 0) imaging.splice(i, 1);
    const p = item.p;
    const pay = byPlayer ? 1200 + score * 18 : 700;
    H().reward(byPlayer ? 2 + Math.floor(score / 35) : 1, 1, pay);
    if (VH.emit) VH.emit('imagingDone', { mod: item.mod, byPlayer });
    p.lying = false; p.lift = 0;
    if (item.er) {
      p.erStage = 'pharmacy';
      E().moveToFloor(p, 0, 27.5, 7.4, (e) => { E().toPharmacy(e); });
      H().er.follow = { p, def: item.er };
    } else {
      E().moveToFloor(p, 0, 27.5, 7.4, (e) => { E().toPharmacy(e); });
    }
    return pay;
  }
  function findingText(item) {
    if (item.er) return item.er.imagingFinding || 'Görüntüleme tamamlandı; rapor acil hekimine iletildi.';
    const c = item.caseRef;
    return (c && c.imagingFinding) || `${MODS[item.mod].name} raporu klinik tabloyla birlikte değerlendirilmek üzere uzman hekime iletildi.`;
  }
  let scan = null;
  function startScan(item) {
    if (scan) return;
    const m = MODS[item.mod];
    VH.paused = true;
    UI().closeDialog(true);
    const root = el('div', { id: 'surgery' });
    const card = el('div', { className: 'sg-card' });
    root.appendChild(card);
    document.getElementById('ui-root').appendChild(root);
    scan = { item, root, card, score: 0, raf: 0 };
    const head = () => {
      card.innerHTML = '';
      const h = el('div', { className: 'sg-head' });
      h.appendChild(el('strong', {}, `${m.icon} ${m.name} · ${item.p.name}`));
      const x = el('button', { type: 'button', className: 'dlg-close', title: 'Radyoloğa bırak' }, '✕');
      x.addEventListener('click', () => close(true));
      h.appendChild(x);
      card.appendChild(h);
    };
    const close = (abort) => {
      cancelAnimationFrame(scan.raf); scan.root.remove();
      const s = scan; scan = null; VH.paused = false;
      if (abort) return;
      const pay = imagingDone(item, s.score, true);
      sound(s.score >= 60 ? 'success' : 'ok');
      const node = el('div', {});
      node.appendChild(el('div', { className: 'grade', style: `border-color:${s.score >= 60 ? '#46a758' : '#edae49'}` }, `${m.icon} ${m.name} tamamlandı · ${s.score}/100`));
      node.appendChild(el('div', { className: 'deltas' })).appendChild(el('span', { className: 'delta up' }, `Bütçe +${money(pay)}`));
      node.appendChild(el('div', { className: 'sec-title' }, 'Rapor'));
      node.appendChild(el('p', { className: 'lesson' }, findingText(item)));
      if (item.mod === 'mri' && VH.content) node.appendChild(VH.content.sourcesNode(['mriImplant']));
      node.appendChild(el('div', { className: 'disclaimer' }, 'Eğitim amaçlı sadeleştirilmiş görüntüleme canlandırmasıdır.'));
      UI().openDialog({ icon: m.icon, title: `${m.name} Raporu`, subtitle: `${item.p.name}, ${item.p.age} yaş`, wide: true, node });
    };
    // 1) güvenlik sorusu
    head();
    card.appendChild(el('div', { className: 'sg-title' }, 'Çekim öncesi güvenlik'));
    card.appendChild(el('div', { className: 'sg-sub' }, m.q.q));
    m.q.opts.map((o, i) => [o, i]).sort(() => Math.random() - 0.5).forEach(([[t, ok]]) => {
      const b = el('button', { type: 'button', className: 'opt-btn' }, t);
      b.addEventListener('click', () => { if (ok) { scan.score += 30; sound('ok'); } else { sound('error'); UI().toast('Doğrusu: ' + m.q.opts.find((x) => x[1])[0], 4200); } runScan(); });
      card.appendChild(b);
    });
    // 2) Netleştir ve tanı koy: odak kaydırıcısını doğru frekansa getir, sonra hasarlı bölgeyi işaretle
    function runScan() {
      head();
      card.appendChild(el('div', { className: 'sg-title' }, 'Görüntüyü netleştir ve tanı koy'));
      card.appendChild(el('div', { className: 'sg-sub' }, 'Odak/frekans kaydırıcısını görüntü netleşene kadar ayarlayın, ardından ' + (item.mod === 'ecg' ? 'anormal atımı' : 'kırık / lezyon bölgesini') + ' dokunarak işaretleyin (15 sn).'));
      const cv = el('canvas', { className: 'sg-canvas' });
      const W = 360, Hh = 220, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = Hh * dpr; card.appendChild(cv);
      const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
      const slider = el('input', { type: 'range', min: '0', max: '100', value: '15', className: 'sg-slider' });
      const lbl = el('div', { className: 'sg-sub' }, 'Odak: 15 MHz');
      card.appendChild(slider); card.appendChild(lbl);
      const target = 35 + Math.random() * 50;
      const tolF = VH.equipment ? VH.equipment.scanWindow() : 1;
      // Lezyon konumu ve görüntü (oyun içi soyut, grafik olmayan çizim)
      const lesion = { x: 110 + Math.random() * 140, y: 70 + Math.random() * 80 };
      const img = document.createElement('canvas'); img.width = W; img.height = Hh;
      const g = img.getContext('2d');
      g.fillStyle = '#05090c'; g.fillRect(0, 0, W, Hh);
      if (item.mod === 'xray') {
        g.fillStyle = '#d9e3e8';
        g.beginPath(); g.ellipse(W / 2, Hh / 2, 26, 95, 0.25, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(W / 2 + 60, Hh / 2 + 10, 18, 80, 0.15, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#05090c'; g.lineWidth = 3; g.beginPath(); g.moveTo(lesion.x - 14, lesion.y - 6); g.lineTo(lesion.x + 4, lesion.y + 2); g.lineTo(lesion.x + 14, lesion.y - 4); g.stroke();
        lesion.x = Math.max(80, Math.min(260, lesion.x));
      } else if (item.mod === 'mri') {
        g.fillStyle = '#6f7d87'; g.beginPath(); g.ellipse(W / 2, Hh / 2, 120, 95, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9fb0ba'; g.beginPath(); g.ellipse(W / 2, Hh / 2, 105, 82, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#5b6b75'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(W / 2 + Math.cos(i) * 50, Hh / 2 + Math.sin(i * 1.7) * 40, 22, 0, Math.PI); g.stroke(); }
        g.fillStyle = '#f4f8fa'; g.beginPath(); g.ellipse(lesion.x, lesion.y, 13, 9, 0.4, 0, Math.PI * 2); g.fill();
      } else if (item.mod === 'ultrasound') {
        g.fillStyle = '#2b3a40'; g.beginPath(); g.moveTo(W / 2, 10); g.arc(W / 2, 10, 200, Math.PI * 0.28, Math.PI * 0.72); g.closePath(); g.fill();
        for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(220,230,235,${Math.random() * 0.35})`; g.fillRect(W / 2 + (Math.random() - 0.5) * 300, 20 + Math.random() * 190, 2, 1); }
        g.fillStyle = '#05090c'; g.beginPath(); g.ellipse(lesion.x, lesion.y, 16, 12, 0, 0, Math.PI * 2); g.fill();
      } else {
        g.strokeStyle = '#3d5a4a'; g.lineWidth = 1; for (let x = 0; x < W; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, Hh); g.stroke(); }
        g.strokeStyle = '#66ff99'; g.lineWidth = 2; g.beginPath();
        lesion.y = Hh / 2;
        for (let x = 0; x < W; x++) {
          const beat = x % 60, odd = Math.abs(x - lesion.x) < 30;
          let y = Hh / 2;
          if (beat > 20 && beat < 24) y -= odd ? 10 : 45; else if (beat >= 24 && beat < 28) y += odd ? 30 : 12; else if (odd && beat > 30 && beat < 44) y -= 14;
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      let focus = 15, found = false, wrong = 0, done = false;
      const t0 = performance.now();
      slider.addEventListener('input', () => { focus = +slider.value; lbl.textContent = `Odak: ${focus} MHz`; });
      const blurPx = () => Math.min(14, Math.abs(focus - target) * 0.42 / tolF);
      const finish = () => {
        if (done) return; done = true;
        const tUsed = (performance.now() - t0) / 1000;
        if (found) scan.score += Math.max(20, Math.round(70 - wrong * 10 - Math.max(0, tUsed - 6) * 3));
        close(false);
      };
      cv.addEventListener('pointerdown', (e) => {
        if (done) return;
        const r = cv.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * Hh;
        if (blurPx() > 3) { UI().toast('Önce görüntüyü netleştirin', 1400); return; }
        if (Math.hypot(x - lesion.x, y - lesion.y) < 24 * tolF) { found = true; sound('ok'); setTimeout(finish, 500); }
        else { wrong++; sound('error'); }
      });
      const draw = () => {
        if (done || !scan) return;
        const left = Math.max(0, 15 - (performance.now() - t0) / 1000);
        ctx.clearRect(0, 0, W, Hh);
        ctx.save(); ctx.filter = `blur(${blurPx().toFixed(1)}px)`; ctx.drawImage(img, 0, 0); ctx.restore();
        const sharp = blurPx() <= 3;
        ctx.fillStyle = sharp ? '#46c46a' : '#f2c94c'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'left';
        ctx.fillText(sharp ? '● NET · bulguyu işaretleyin' : '◌ BULANIK · odağı ayarlayın', 10, 18);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(`⏱ ${left.toFixed(1)} sn`, W - 10, 18);
        if (found) { ctx.strokeStyle = '#ff5a5f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(lesion.x, lesion.y, 22, 0, Math.PI * 2); ctx.stroke(); }
        if (left <= 0) { finish(); return; }
        scan.raf = requestAnimationFrame(draw);
      };
      draw();
    }
  }
  function updateImaging(dt) {
    const rad = E().staffById('radiologist');
    for (const it of imaging.slice()) {
      if (!it.ready || scan) continue;
      it.wait += dt;
      if (rad && it.wait > 40) {
        const pay = imagingDone(it, 60, false);
        notify('🧑‍⚕️', `Radyolog ${MODS[it.mod].name} çekimini tamamladı (+${money(pay)}).`, 3, 'imagingAuto');
      }
    }
  }

  // Diyaliz seansları (3. kat diyaliz koltukları)
  function updateDialysis(dt) {
    if (!H().has('services', 'radiology')) return;
    const nurse = E().staffById('dialysisNurse');
    for (const p of E().patients) {
      if (p.floor !== 3 || p.state !== 'resident' || p.gone || p.y < 9) continue;
      p.dial = p.dial || { t: rand(30, 90), done: false, waited: 0 };
      if (!p.dial.done) { p.dial.t -= dt; if (p.dial.t <= 0) p.dial.done = true; }
      else {
        p.dial.waited += dt;
        p.emote = { icon: '🩸', until: performance.now() + 400 };
        if (nurse && p.dial.waited > 25) finishDialysis(p, false);
      }
    }
  }
  function finishDialysis(p, byPlayer) {
    H().reward(byPlayer ? 1 : 0, 1, byPlayer ? 350 : 180);
    p.dial = { t: rand(80, 120), done: false, waited: 0 };
    p.emote = { icon: '✅', until: performance.now() + 2000 };
    E().say(p, 'Seans bitti, kendimi daha iyi hissediyorum.', 2000);
  }

  // ================================================================ B1: yemekhane ve enerji
  const energy = () => { const st = S(); if (typeof st.energy !== 'number') st.energy = 100; return st.energy; };
  let coffeeT = 0, warn30 = false, warn15 = false;
  function setEnergy(v) {
    S().energy = Math.max(0, Math.min(100, v));
    if (S().energy > 40) { warn30 = false; warn15 = false; }
  }
  function updateEnergy(dt) {
    const P = E().player;
    let drain = 0.045;
    if (P.moving) drain += E().input.run ? 0.22 : 0.03;
    setEnergy(energy() - drain * dt);
    if (coffeeT > 0) coffeeT -= dt;
    if (energy() < 30 && !warn30) { warn30 = true; notify('🥱', 'Yoruldunuz: B1 yemekhaneye inip yemek yiyin (hız düşüyor).', 4, 'energy'); }
    if (energy() < 15 && !warn15) { warn15 = true; notify('😵', 'Enerji çok düşük! Koşamazsınız ve işlemler yavaşladı.', 4, 'energy'); }
  }
  function factor(k) {
    const e = energy();
    if (k === 'playerSpeed') return (e < 15 ? 0.7 : e < 35 ? 0.85 : 1) * (coffeeT > 0 ? 1.12 : 1);
    if (k === 'stabTime') return e < 15 ? 1.2 : 1;
    return 1;
  }
  function eat(kind) {
    const food = kind === 'food';
    const cost = food ? 60 : 20;
    if (S().budget < cost) { UI().toast('Bütçe yetersiz', 1600); return; }
    S().budget -= cost;
    setEnergy(energy() + (food ? 60 : 22));
    if (!food) coffeeT = 40;
    E().player.emote = { icon: food ? '😋' : '☕', until: performance.now() + 2200 };
    sound('ok');
    UI().toast(food ? `🍽️ Afiyet olsun! Enerji %${Math.round(energy())}` : `☕ Kahve: enerji %${Math.round(energy())}, 40 sn hız bonusu`, 2200);
    if (VH.emit) VH.emit('eat', { kind });
  }
  const diners = [];
  function initCafe() {
    const look = () => { const l = E().randomPatientLook(30 + Math.random() * 30); l.patient = false; l.cane = false; return l; };
    const seats = [[2.5, 1.85], [5.5, 1.85], [8.15, 2.5], [11.5, 1.85], [2.85, 4.5], [8.5, 4.15], [14.5, 10.85], [17.15, 11.5], [20.5, 11.15]];
    seats.forEach(([x, y], i) => {
      const lk = look();
      if (i % 3 === 0) Object.assign(lk, { coat: '#fbfdff', shirt: '#5aa9e6', pants: '#5aa9e6', stethoscope: true, longCoat: true });
      if (i % 3 === 1) Object.assign(lk, { coat: '#5aa9e6', scrubs: true, pants: '#5aa9e6' });
      const d = E().makeEntity('extra', { name: 'Yemekhane', look: lk, x, y, floor: 4, sitting: true, lift: 9 });
      d.flip = i % 2 === 0;
      diners.push(d); E().extraPeople.push(d);
    });
    [[17.5, 3.3], [19.2, 3.3]].forEach(([x, y]) => {
      const c = E().makeEntity('extra', { name: 'Aşçı', look: { coat: '#ffffff', pants: '#2b333b', skin: '#e8b48f', hair: '#1c1c1c', hairStyle: 'short', cap: '#ffffff', apron: '#eef2f4' }, x, y, floor: 4 });
      c.back = false; diners.push(c); E().extraPeople.push(c);
    });
  }
  let chatT = 4;
  function updateCafe(dt) {
    chatT -= dt;
    if (chatT <= 0 && E().player.floor === 4) {
      chatT = rand(4, 9);
      const d = pick(diners);
      E().say(d, pick(['Çorba bugün çok güzel.', 'Nöbet uzun geçti…', 'Afiyet olsun!', 'Acilde yoğun bir gün.', 'Tatlı da var mı?', 'Ayran alabilir miyim?']), 2400);
    }
  }

  // ================================================================ Hedefler, akışlar, uyarılar
  function targets(pl) {
    const out = [];
    if (pl.floor === 4) {
      for (const d of E().devices) {
        if (d.floor !== 4 || (d.tag !== 'food_counter' && d.tag !== 'coffee_bar')) continue;
        const dd = E().rectDist(pl.x, pl.y, d);
        if (dd > 1.3) continue;
        out.push(d.tag === 'food_counter'
          ? { type: 'cafe', name: `Enerji %${Math.round(energy())} · Günün menüsü`, action: '🍽️ Yemek Al (₺60)', x: d.x, y: d.y, dist: dd - 0.5, handler: () => eat('food') }
          : { type: 'cafe', name: `Enerji %${Math.round(energy())}`, action: '☕ Kahve Al (₺20)', x: d.x, y: d.y, dist: dd - 0.4, handler: () => eat('coffee') });
      }
    }
    if (pl.floor === 2) {
      for (const p of wardPatients()) {
        const c = p.care;
        if (!c || !c.need) continue;
        const d = Math.hypot(p.x - pl.x, p.y - pl.y);
        if (d < 1.9) out.push({ type: 'ward', name: `${p.name} · ${c.need[1]}`, action: `${c.need[0]} ${c.need[1]}`, x: p.x, y: p.y, dist: d - 1, ref: p, handler: (t) => doCare(t.ref, true) });
      }
    }
    if (pl.floor === 3) {
      for (const it of imaging) {
        if (!it.ready) continue;
        const d = Math.hypot(it.p.x - pl.x, it.p.y - pl.y);
        if (d < 2.2) out.push({ type: 'imaging', name: `${it.p.name} · ${MODS[it.mod].name}`, action: `${MODS[it.mod].icon} Görüntüle`, x: it.p.x, y: it.p.y, dist: d - 1.5, ref: it, handler: (t) => startScan(t.ref) });
      }
      for (const p of E().patients) {
        if (p.floor !== 3 || !p.dial || !p.dial.done) continue;
        const d = Math.hypot(p.x - pl.x, p.y - pl.y);
        if (d < 1.9) out.push({ type: 'dial', name: `${p.name} · diyaliz seansı bitti`, action: '🩸 Seansı Tamamla', x: p.x, y: p.y, dist: d - 0.8, ref: p, handler: (t) => finishDialysis(t.ref, true) });
      }
    }
    return out;
  }
  function imagingFlow() {
    const it = imaging[0];
    if (!it) return null;
    const m = MODS[it.mod], P = E().player;
    const left = Math.max(0, 40 - it.wait);
    return { id: 'img', tab: `${m.icon} Görüntüleme`, title: `${m.name} · Radyoloji`, patient: `${it.p.name}, ${it.p.age} yaş`, timer: it.ready ? `${Math.ceil(left)} sn (radyolog)` : null, bar: it.ready ? left / 40 : null, urgent: !!it.er,
      steps: ['3. kata transfer', 'Güvenlik + tarama', 'Rapor'].map((l, i) => ({ label: l, state: i < (it.ready ? 1 : 0) ? 'done' : i === (it.ready ? 1 : 0) ? 'active' : 'todo' })),
      instruction: it.ready ? (P.floor === 3 ? `Hastanın yanına gidip "${m.icon} Görüntüle" (E).` : 'Hasta hazır: asansörle 3. kata çıkın.') : 'Hasta radyolojiye taşınıyor…',
      target: { floor: 3, x: m.spot[0], y: m.spot[1], label: m.name, icon: m.icon }, patientRef: it.p };
  }
  function wardFlow() {
    const p = wardPatients().find((q) => q.care && q.care.need);
    if (!p) return null;
    return { id: 'ward', tab: '🛏️ Servis', title: 'Yatan Hasta Takibi', patient: `${p.name} · ${p.care.need[1]}`, timer: null, bar: Math.max(0, 1 - p.care.waited / 80), urgent: false,
      steps: [{ label: p.care.need[1], state: 'active' }, { label: `Taburcu (${p.care.cycles}/${p.care.max === 99 ? '∞' : p.care.max})`, state: 'todo' }],
      instruction: E().staffById('wardNurse') ? 'Servis hemşiresi birazdan üstlenecek; siz yaparsanız daha çok kazanırsınız.' : 'Yatağın yanına gidip uygulayın.',
      target: { floor: 2, x: p.x, y: p.y + 0.6, label: p.care.need[1], icon: p.care.need[0], ent: p }, patientRef: p };
  }
  function alerts() {
    const out = [];
    if (imaging.length) out.push(['📡', `Görüntüleme bekleyen: ${imaging.length} (3. kat)`, null]);
    const w = wardPatients().filter((p) => p.care && p.care.need).length;
    if (w) out.push(['🛏️', `Serviste bakım bekleyen hasta: ${w} (2. kat)`, null]);
    if (energy() < 30) out.push(['🥱', `Enerjiniz düşük (%${Math.round(energy())}): B1 yemekhane`, null]);
    return out;
  }

  // ---------------------------------------------------------------- Olaylar
  VH.on('erSuccess', () => setEnergy(energy() - 4));
  // "Daha fazla tetkik" kararı + Radyoloji açık + uygun cihaz varsa hasta 3. kata görüntülemeye gider
  VH.on('caseSolved', (d) => { if (d.p && d.choice === 'tests' && d.grade !== 'risky' && H().has('services', 'radiology') && modalityForCase(d.c)) d.p.imagingNext = true; });
  VH.on('surgeryDone', (d) => { if (d.byPlayer) setEnergy(energy() - 10); });
  VH.on('manualRegister', () => setEnergy(energy() - 0.8));

  VH.targetProviders.push(targets);
  VH.flowProviders.push(imagingFlow, wardFlow);
  VH.interactHandlers.push((t) => {
    if (t.type === 'device' && t.ref.tag === 'food_counter') { eat('food'); return true; }
    if (t.type === 'device' && t.ref.tag === 'coffee_bar') { eat('coffee'); return true; }
    return false;
  });

  VH.floors = {
    MODS, admit, sendImaging, wantsImagingER, modalityForCase, alerts, factor, eat, startScan,
    get imaging() { return imaging; },
    get energy() { return energy(); },
    set energy(v) { setEnergy(v); },
    init() { initCafe(); },
    update(dt) { updateWard(dt); updateImaging(dt); updateDialysis(dt); updateEnergy(dt); updateCafe(dt); },
    _doCare: doCare,
  };
})();
