// Vita Hospital — 1. Kat: Cerrahi akış ve etkileşimli ameliyat mini oyunları
//
// Acilde stabilize edilen ağır vakalar (travma, akut apandisit, kalça kırığı) Cerrahi katı
// açıksa ameliyathaneye alınır. Başhekim ameliyat masasında ameliyatı bizzat yapabilir:
//   0) Cerrahi Güvenlik Kontrol Listesi (DSÖ; Haynes ve ark., NEJM 2009)
//   1) Anestezi dengesi  — hareketli göstergeyi yeşil aralıkta durdur (3 isabet)
//   2) Kesi              — kesikli çizgiyi parmakla/fareyle takip et
//   3) Dikiş ritmi       — daralan halkalar kapanmadan noktalara dokun
// Oyuncu gelmezse cerrah ameliyatı kendisi üstlenir (daha düşük puan). Ameliyat sonrası hasta
// uyandırma odasına alınır, ardından taburcu olur ya da yatan hasta servisine yatırılır.
// Eğitim amaçlı ve kansız/grafik olmayan sadeleştirilmiş bir canlandırmadır.
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state, H = () => VH.hospital, M = () => VH.map;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };
  const notify = (i, t, f, k) => { if (VH.notify) VH.notify(i, t, f, k); };
  const tol = () => (VH.equipment ? VH.equipment.surgTolerance() : 1);

  const TABLE = [5.5, 3.5], TABLE_VIA = [5, 4];
  const RECOVERY = [[16.5, 2.5], [19.5, 2.5]];
  const queue = [];       // ameliyat bekleyen / masadaki hastalar
  const recovering = [];  // uyandırma odasındakiler
  let game = null;

  const wants = (def) => !!(def && def.surgery && H().has('services', 'surgery'));

  function admit(p, def) {
    const item = { p, def, onTable: false, wait: 0 };
    queue.push(item);
    p.state = 'surgery'; p.chair = false; p.lying = false; p.sitting = false; p.erStage = 'surgery';
    E().say(p, 'Ameliyata mı alınıyorum? Korkuyorum…', 2600);
    notify('🩻', `Ameliyat bekliyor: ${p.name} (${def.surgery.name}). 1. Kat ameliyathaneye çıkın.`, 1, 'surgery');
    E().moveToFloor(p, 1, TABLE[0], TABLE[1], (e) => {
      E().sitAt(e, TABLE, 16);
      e.sitting = false; e.lying = true;
      item.onTable = true;
    }, TABLE_VIA);
  }

  // ---------------------------------------------------------------- Sonuç
  function finish(item, score, byPlayer) {
    const i = queue.indexOf(item);
    if (i >= 0) queue.splice(i, 1);
    const def = item.def, p = item.p;
    const mult = VH.equipment ? VH.equipment.surgReward() : 1;
    const budget = Math.round((byPlayer ? 3500 + score * 45 : 2600 + score * 20) * mult);
    const rep = byPlayer ? 3 + Math.floor(score / 20) : 2;
    H().reward(rep, score >= 45 ? 2 : -2, budget);
    if (VH.emit) VH.emit('surgeryDone', { score, byPlayer, id: def.id });
    sound(score >= 70 ? 'success' : score >= 45 ? 'ok' : 'error');
    // uyandırma odası
    const bed = RECOVERY.find((b) => !recovering.some((r) => r.bed === b)) || RECOVERY[0];
    p.lying = false; p.lift = 0;
    E().goTo(p, bed[0], bed[1] + 1, (e) => { E().sitAt(e, bed, 12); e.sitting = false; e.lying = true; e.state = 'postop'; });
    recovering.push({ p, bed, t: 35 });
    persist();
    return { budget, rep };
  }
  function resultDialog(item, score, res, stagesNote) {
    const def = item.def;
    const node = el('div', {});
    const label = score >= 70 ? '✅ Başarılı ameliyat' : score >= 45 ? '🟡 Ameliyat tamamlandı (uzun sürdü)' : '⚠️ Ek müdahale gerekti';
    node.appendChild(el('div', { className: 'grade', style: `border-color:${score >= 70 ? '#46a758' : score >= 45 ? '#edae49' : '#e5484d'}` }, `${label} · ${score}/100 puan`));
    const d = el('div', { className: 'deltas' });
    d.appendChild(el('span', { className: 'delta up' }, `Bütçe +${money(res.budget)}`));
    d.appendChild(el('span', { className: 'delta up' }, `İtibar +${res.rep}`));
    node.appendChild(d);
    if (stagesNote) node.appendChild(el('p', { className: 'muted' }, stagesNote));
    node.appendChild(el('p', { className: 'lesson' }, def.surgery.lesson));
    node.appendChild(el('div', { className: 'disclaimer' }, 'Eğitim amaçlı, sadeleştirilmiş canlandırmadır; gerçek cerrahi teknik öğretmez.'));
    UI().openDialog({ icon: '🩻', title: def.surgery.name, subtitle: `${item.p.name}, ${item.p.age} yaş · Hasta uyandırma odasına alındı`, wide: true, node });
  }

  // ---------------------------------------------------------------- Mini oyun
  function startGame(item) {
    if (game) return;
    UI().closeDialog(true);
    VH.paused = true;
    const root = el('div', { id: 'surgery' });
    const card = el('div', { className: 'sg-card' });
    root.appendChild(card);
    document.getElementById('ui-root').appendChild(root);
    game = { item, root, card, stage: 0, scores: [0, 0, 0, 0], raf: 0 };
    stageChecklist();
  }
  function endGame(aborted) {
    if (!game) return;
    cancelAnimationFrame(game.raf);
    game.root.remove();
    const g = game; game = null;
    VH.paused = false;
    if (aborted) return;
    const score = Math.max(0, Math.min(100, Math.round(g.scores.reduce((a, b) => a + b, 0))));
    if (g.item.practice) {
      // Eğitim ameliyatı (masada hasta yokken): nöbet başına bir kez küçük ödül
      const sh = H().shift;
      const first = practiceShift !== sh.n;
      practiceShift = sh.n;
      if (first && score >= 60) { S().budget += 300; H().reward(1, 0, 0); }
      UI().openDialog({ icon: '🎓', title: 'Eğitim Ameliyatı Tamamlandı', subtitle: `${score}/100 puan`,
        text: `${score >= 60 ? 'Başarılı bir simülasyon!' : 'Biraz daha pratik gerekiyor.'} ${first && score >= 60 ? 'Nöbetin ilk başarılı eğitimi: +₺300, İtibar +1.' : ''}\nGerçek ameliyatlar acilden gelen travma/apandisit/kalça kırığı hastalarıyla başlar.` });
      return;
    }
    const res = finish(g.item, score, true);
    resultDialog(g.item, score, res, `Kontrol listesi ${Math.round(g.scores[0])}/10 · Anestezi ${Math.round(g.scores[1])}/30 · Kesi ${Math.round(g.scores[2])}/30 · Dikiş ${Math.round(g.scores[3])}/30`);
  }
  function frame(title, sub, stepIdx) {
    const c = game.card;
    c.innerHTML = '';
    const head = el('div', { className: 'sg-head' });
    head.appendChild(el('strong', {}, `🩻 ${game.item.def.surgery.name}`));
    const steps = el('div', { className: 'sg-steps' });
    ['Kontrol listesi', 'Anestezi', 'Kesi', 'Dikiş'].forEach((s, i) => steps.appendChild(el('span', { className: 'sg-step' + (i < stepIdx ? ' done' : i === stepIdx ? ' on' : '') }, s)));
    head.appendChild(steps);
    const x = el('button', { type: 'button', className: 'dlg-close', title: 'Ameliyatı cerraha bırak' }, '✕');
    x.addEventListener('click', () => { endGame(true); });
    head.appendChild(x);
    c.appendChild(head);
    c.appendChild(el('div', { className: 'sg-title' }, title));
    c.appendChild(el('div', { className: 'sg-sub' }, sub));
  }
  function canvas() {
    const cv = el('canvas', { className: 'sg-canvas' });
    const W = 360, H2 = 220;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H2 * dpr;
    game.card.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H2]; };
    return { cv, ctx, W, H: H2, pos };
  }

  // 0) Güvenlik kontrol listesi
  function stageChecklist() {
    frame('Cerrahi Güvenlik Kontrol Listesi', 'Kesiden önce ekipçe doğrulayın. DSÖ kontrol listesi ameliyat komplikasyonlarını ve ölümleri azaltmıştır.', 0);
    const items = ['Hasta kimliği, işlem ve taraf doğrulandı', 'Alerji ve en son ne zaman yiyip içtiği (açlık süresi) soruldu', 'Beklenen kan kaybı ve antibiyotik profilaksisi konuşuldu'];
    const checked = new Set();
    const box = el('div', { className: 'sg-check' });
    const go = el('button', { type: 'button', className: 'dlg-btn' }, 'Anesteziye geç →');
    go.disabled = true;
    items.forEach((t, i) => {
      const b = el('button', { type: 'button', className: 'opt-btn' }, '☐ ' + t);
      b.addEventListener('click', () => { checked.add(i); b.textContent = '☑ ' + t; b.classList.add('on'); sound('click'); go.disabled = checked.size < items.length; });
      box.appendChild(b);
    });
    game.card.appendChild(box);
    go.addEventListener('click', () => { game.scores[0] = 10; stageAnesthesia(); });
    game.card.appendChild(go);
  }

  // 1) Anestezi dengesi: nabız ve oksijen ibresini doz düğmeleriyle yeşil güvenli bölgede tut
  function stageAnesthesia() {
    frame('Anestezi Dengesi', 'Anestezi derinliği kendiliğinden kayar. "− Doz" / "+ Doz" düğmelerini basılı tutarak ibreyi yeşil güvenli bölgede toplam 3 sn tutun: nabız ve oksijen dengede kalsın (en fazla 9 sn).', 1);
    const { ctx, W, H: Hh } = canvas();
    const half = 0.1 * tol();
    let n = 0.5, v = 0, t = 0, inZone = 0, hold = 0, last = performance.now(), done = false;
    const row = el('div', { className: 'sg-row' });
    const mk = (label, dir) => {
      const b = el('button', { type: 'button', className: 'dlg-btn sg-big' }, label);
      const on = (e) => { e.preventDefault(); hold = dir; };
      const off = () => { if (hold === dir) hold = 0; };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      row.appendChild(b);
    };
    mk('− Doz', -1); mk('+ Doz', 1);
    game.card.appendChild(row);
    const draw = () => {
      if (!game || done) return;
      const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      v += (Math.random() - 0.5) * 1.6 * dt + Math.sin(t * 0.9) * 0.18 * dt;
      v *= 0.985;
      n = Math.max(0, Math.min(1, n + v * dt * 3 + hold * 0.42 * dt));
      const ok = Math.abs(n - 0.5) <= half;
      if (ok) inZone += dt;
      const hr = Math.round(72 + (0.5 - n) * 90 + Math.sin(t * 3) * 2);
      const spo2 = Math.max(82, Math.min(100, Math.round(99 - Math.max(0, n - 0.6) * 40 - Math.max(0, 0.35 - n) * 10)));
      ctx.fillStyle = '#0e2230'; ctx.fillRect(0, 0, W, Hh);
      const cx = W / 2, cy = 150, r = 105;
      ctx.lineWidth = 16; ctx.lineCap = 'butt';
      ctx.strokeStyle = '#3b1d24'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = 'rgba(70,196,106,0.85)'; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI + (0.5 - half) * Math.PI, Math.PI + (0.5 + half) * Math.PI); ctx.stroke();
      ctx.fillStyle = '#9bb7c4'; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('YÜZEYEL', cx - r + 10, cy + 18); ctx.fillText('DERİN', cx + r - 10, cy + 18);
      const a = Math.PI + n * Math.PI;
      ctx.strokeStyle = ok ? '#46c46a' : '#ff5a5f'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (r - 12), cy + Math.sin(a) * (r - 12)); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.font = '800 15px system-ui'; ctx.textAlign = 'left';
      ctx.fillStyle = hr > 110 || hr < 50 ? '#ff8a8d' : '#8fd19e'; ctx.fillText('♥ ' + hr + '/dk', 14, 26);
      ctx.fillStyle = spo2 < 92 ? '#ff8a8d' : '#7fd8ff'; ctx.fillText('SpO₂ %' + spo2, W - 110, 26);
      ctx.fillStyle = '#1d3b4f'; ctx.fillRect(20, Hh - 20, W - 40, 8);
      ctx.fillStyle = '#46c46a'; ctx.fillRect(20, Hh - 20, (W - 40) * Math.min(1, t / 9), 8);
      ctx.fillStyle = '#fff'; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('Güvenli bölgede: ' + inZone.toFixed(1) + ' / 3,0 sn', W / 2, Hh - 26);
      if (t >= 9 || inZone >= 3) {
        done = true;
        game.scores[1] = Math.round(30 * Math.min(1, inZone / 3) - Math.max(0, t - 5) * 1.5);
        game.scores[1] = Math.max(0, game.scores[1]);
        sound(game.scores[1] >= 20 ? 'ok' : 'error');
        setTimeout(stageIncision, 400);
        return;
      }
      game.raf = requestAnimationFrame(draw);
    };
    draw();
  }

  // 2) Kesi: kesikli çizgiyi takip
  function stageIncision() {
    if (!game) return;
    frame('Kesi', 'Yeşil noktadan başlayıp kesikli çizgiyi basılı tutarak takip edin, kırmızı noktada bırakın (10 sn).', 2);
    const { cv, ctx, W, H: Hh, pos } = canvas();
    const path = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; path.push([60 + u * 240, 110 + Math.sin(u * Math.PI) * -28 + Math.sin(u * 7) * 4]); }
    const trace = [];
    let drawing = false, done = false, start = performance.now();
    const dist = ([x, y]) => Math.min(...path.map(([a, b]) => Math.hypot(a - x, b - y)));
    const draw = () => {
      const left = Math.max(0, 10 - (performance.now() - start) / 1000);
      ctx.clearRect(0, 0, W, Hh);
      ctx.fillStyle = '#2b5a6b'; ctx.fillRect(0, 0, W, Hh);
      ctx.fillStyle = '#e8c3a6'; ctx.beginPath(); ctx.ellipse(W / 2, 110, 150, 72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(80,140,150,0.6)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.ellipse(W / 2, 110, 158, 80, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([7, 6]); ctx.strokeStyle = '#6a3fb5'; ctx.lineWidth = 2;
      ctx.beginPath(); path.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#46c46a'; ctx.beginPath(); ctx.arc(path[0][0], path[0][1], 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff5a5f'; ctx.beginPath(); ctx.arc(path[40][0], path[40][1], 9, 0, Math.PI * 2); ctx.fill();
      if (trace.length > 1) { ctx.strokeStyle = '#b5303a'; ctx.lineWidth = 2.5; ctx.beginPath(); trace.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = '700 13px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`⏱ ${left.toFixed(1)} sn`, 12, 22);
      if (left <= 0 && !done) finishCut();
      if (!done) game.raf = requestAnimationFrame(draw);
    };
    const finishCut = () => {
      if (done) return;
      done = true; drawing = false;
      const covered = trace.length ? Math.max(...trace.map(([x]) => x)) - Math.min(...trace.map(([x]) => x)) : 0;
      const mean = trace.length ? trace.reduce((s, p) => s + dist(p), 0) / trace.length : 99;
      const cover = Math.min(1, covered / 230);
      const sc = Math.max(0, 30 - Math.max(0, mean - 3 * tol()) * (2.2 / tol())) * cover;
      game.scores[2] = sc;
      sound(sc > 20 ? 'ok' : 'error');
      setTimeout(stageSuture, 500);
    };
    cv.addEventListener('pointerdown', (e) => { const p = pos(e); if (Math.hypot(p[0] - path[0][0], p[1] - path[0][1]) < 22) { drawing = true; trace.length = 0; trace.push(p); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* yok */ } } });
    cv.addEventListener('pointermove', (e) => { if (drawing) { trace.push(pos(e)); const p = trace[trace.length - 1]; if (Math.hypot(p[0] - path[40][0], p[1] - path[40][1]) < 14) finishCut(); } });
    cv.addEventListener('pointerup', () => { if (drawing && trace.length > 10) finishCut(); drawing = false; });
    draw();
  }

  // 3) Dikiş: karşılıklı dikiş noktalarını sırayla sürükleyerek birleştir
  function stageSuture() {
    if (!game) return;
    frame('Dikiş Atma', 'Yanıp sönen soldaki noktadan başlayıp karşısındaki sarı noktaya sürükleyin. 5 dikişi sırayla tamamlayın (12 sn).', 3);
    const { cv, ctx, W, H: Hh, pos } = canvas();
    const pairs = [];
    for (let i = 0; i < 5; i++) { const x = 100 + i * 40; pairs.push([[x - 6, 92], [x + 6, 128]]); }
    let idx = 0, drag = null, done = false, fb = null;
    const start = performance.now();
    const R = 16 * tol();
    const finish = () => { if (done) return; done = true; cancelAnimationFrame(game.raf); setTimeout(() => endGame(false), 450); };
    const draw = () => {
      if (!game || done) return;
      const now = performance.now(), left = Math.max(0, 12 - (now - start) / 1000);
      ctx.clearRect(0, 0, W, Hh);
      ctx.fillStyle = '#2b5a6b'; ctx.fillRect(0, 0, W, Hh);
      ctx.fillStyle = '#e8c3a6'; ctx.beginPath(); ctx.ellipse(W / 2, 110, 150, 72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b5303a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 110); ctx.lineTo(290, 110); ctx.stroke();
      pairs.forEach(([a, b], i) => {
        if (i < idx) { ctx.strokeStyle = '#1d3b7a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); return; }
        const act = i === idx, blink = act && Math.floor(now / 300) % 2;
        ctx.fillStyle = act ? (blink ? '#2ec4b6' : '#5ff0d8') : 'rgba(46,196,182,0.35)';
        ctx.beginPath(); ctx.arc(a[0], a[1], 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = act ? '#ffd166' : 'rgba(255,209,102,0.35)';
        ctx.beginPath(); ctx.arc(b[0], b[1], 6, 0, Math.PI * 2); ctx.fill();
        if (act) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.setLineDash([]); }
      });
      if (drag) { ctx.strokeStyle = '#1d3b7a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(drag.a[0], drag.a[1]); ctx.lineTo(drag.p[0], drag.p[1]); ctx.stroke(); }
      if (fb && now - fb[1] < 600) { ctx.fillStyle = fb[2]; ctx.font = '800 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(fb[0], W / 2, 40); }
      ctx.fillStyle = '#fff'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Dikiş ' + idx + '/5 · ⏱ ' + left.toFixed(1) + ' sn', 12, 20);
      if (left <= 0 || idx >= pairs.length) { finish(); return; }
      game.raf = requestAnimationFrame(draw);
    };
    cv.addEventListener('pointerdown', (e) => {
      if (idx >= pairs.length) return;
      const p = pos(e), a = pairs[idx][0];
      if (Math.hypot(p[0] - a[0], p[1] - a[1]) < R) { drag = { a, p }; try { cv.setPointerCapture(e.pointerId); } catch (_) { /* yok */ } }
    });
    cv.addEventListener('pointermove', (e) => { if (drag) drag.p = pos(e); });
    cv.addEventListener('pointerup', (e) => {
      if (!drag) return;
      const p = pos(e), b = pairs[idx][1];
      if (Math.hypot(p[0] - b[0], p[1] - b[1]) < R) { idx++; game.scores[3] += 6; sound('click'); fb = ['Harika dikiş!', performance.now(), '#8fd19e']; }
      else fb = ['Karşı noktaya ulaşmadı', performance.now(), '#ff8a8d'];
      drag = null;
    });
    draw();
  }

  // ---------------------------------------------------------------- Güncelleme, hedefler, akış
  function update(dt) {
    for (const item of queue.slice()) {
      if (!item.onTable || game) continue;
      item.wait += dt;
      if (item.wait > 45) {
        // Cerrah üstlenir
        const score = Math.round(50 + 10 * ((VH.equipment ? VH.equipment.lvl('surgery') : 1) - 1) + Math.random() * 10);
        const res = finish(item, score, false);
        notify('🧑‍⚕️', `Cerrah ameliyatı tamamladı: ${item.p.name} (${score} puan, +${money(res.budget)})`, 1, 'surgeryAuto');
      }
    }
    for (let i = recovering.length - 1; i >= 0; i--) {
      const r = recovering[i];
      r.t -= dt;
      if (r.t > 0) continue;
      recovering.splice(i, 1);
      const p = r.p;
      p.lying = false; p.lift = 0; p.state = 'leaving';
      if (H().has('services', 'ward') && VH.floors) { VH.floors.admit(p, 'Ameliyat sonrası takip'); p.gone = true; }
      else E().moveToFloor(p, 0, 4.5, 31.4, (e) => { e.gone = true; });
      S().budget += 600;
      notify('🛏️', `${p.name} uyandırma odasından çıktı (+₺600).`, 1, 'postop');
    }
  }
  function targets(pl) {
    if (pl.floor !== 1 || !queue.length) return [];
    const item = queue.find((q) => q.onTable);
    if (!item) return [];
    const d = Math.hypot(pl.x - TABLE[0], pl.y - TABLE[1]);
    if (d > 1.9) return [];
    return [{ type: 'surgery', name: `${item.p.name} · ${item.def.surgery.name}`, action: '🩺 Ameliyata Başla', x: TABLE[0], y: TABLE[1], dist: d - 2, handler: () => startGame(item) }];
  }
  function flow() {
    const item = queue[0];
    if (!item) return null;
    const P = E().player;
    const cur = !item.onTable ? 0 : 1;
    const left = Math.max(0, 45 - item.wait);
    return {
      id: 'surg', tab: '🩻 Ameliyat', title: item.def.surgery.name, patient: `${item.p.name}, ${item.p.age} yaş`, timer: item.onTable ? `${Math.ceil(left)} sn (cerrah bekliyor)` : null,
      bar: item.onTable ? left / 45 : null, urgent: true,
      steps: ['Ameliyathaneye transfer', 'Ameliyat (mini oyun)', 'Uyandırma'].map((l, i) => ({ label: l, state: i < cur ? 'done' : i === cur ? 'active' : 'todo' })),
      instruction: item.onTable ? (P.floor === 1 ? 'Ameliyat masasına gidip "Ameliyata Başla" (E). Gelmezseniz cerrah üstlenir.' : 'Hasta ameliyat masasında: asansörle 1. kata çıkın.') : 'Hasta ameliyathaneye taşınıyor…',
      target: { floor: 1, x: TABLE[0], y: TABLE[1], label: 'Ameliyat masası', icon: '🩻' }, patientRef: item.p,
    };
  }

  VH.targetProviders.push(targets);
  VH.flowProviders.push(flow);
  // Ameliyat masası: hasta masadaysa gerçek ameliyat; değilse eğitim (simülasyon) ameliyatı mini oyunu
  let practiceShift = -1;
  const PRACTICE = { practice: true, p: { name: 'Eğitim mankeni', age: 30 }, def: { id: 'appendicitis', surgery: { name: 'Eğitim Ameliyatı · Laparoskopik Apendektomi' } } };
  VH.interactHandlers.push((t) => {
    if (!(t.type === 'device' && ['operating_table', 'anesthesia', 'surgical_lamp'].includes(t.ref.tag))) return false;
    const item = queue.find((q) => q.onTable);
    startGame(item || PRACTICE);
    return true;
  });

  VH.surgery = {
    wants, admit, update, startGame, endGame,
    get queue() { return queue; },
    get recovering() { return recovering; },
    get game() { return game; },
    _finish: finish,
  };
})();
