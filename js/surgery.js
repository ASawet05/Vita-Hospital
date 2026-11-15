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
    if (def.sources) node.appendChild(VH.content.sourcesNode(def.sources));
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
    if (VH.content) game.card.appendChild(VH.content.sourcesNode(['surgicalChecklist', 'fasting']));
    go.addEventListener('click', () => { game.scores[0] = 10; stageAnesthesia(); });
    game.card.appendChild(go);
  }

  // 1) Anestezi dengesi
  function stageAnesthesia() {
    frame('Anestezi Dengesi', 'Gösterge yeşil bölgedeyken "Uygula"ya basın: indüksiyon, analjezi ve kas gevşetici (3 isabet).', 1);
    const { ctx, W, H: Hh } = canvas();
    const zone = 0.16 * tol();
    let t = 0, hits = 0, tries = 0, flash = 0, last = performance.now();
    const btn = el('button', { type: 'button', className: 'dlg-btn sg-big' }, '💉 Uygula');
    game.card.appendChild(btn);
    const center = () => 0.5 + Math.sin(hits * 2.1) * 0.22;
    const mark = () => 0.5 + Math.sin(t * (1.6 + hits * 0.5)) * 0.45;
    const draw = () => {
      const now = performance.now(); t += (now - last) / 1000; last = now;
      ctx.clearRect(0, 0, W, Hh);
      ctx.fillStyle = '#0e2230'; ctx.fillRect(0, 0, W, Hh);
      ctx.fillStyle = '#1d3b4f'; ctx.fillRect(30, 90, W - 60, 40);
      const c = center(), x0 = 30 + (c - zone / 2) * (W - 60);
      ctx.fillStyle = 'rgba(70,196,106,0.75)'; ctx.fillRect(x0, 90, zone * (W - 60), 40);
      const m = 30 + mark() * (W - 60);
      ctx.fillStyle = flash > 0 ? (flash > 0.5 ? '#46c46a' : '#ff5a5f') : '#fff';
      ctx.fillRect(m - 3, 80, 6, 60);
      flash = Math.max(0, flash - 0.03);
      ctx.fillStyle = '#9bb7c4'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`İsabet ${hits}/3 · Deneme ${tries}/7`, W / 2, 170);
      ctx.fillText('Monitör: Nabız 84 · SpO₂ %99 · Tansiyon 118/72', W / 2, 40);
      game.raf = requestAnimationFrame(draw);
    };
    btn.addEventListener('click', () => {
      tries++;
      const ok = Math.abs(mark() - center()) <= zone / 2;
      if (ok) { hits++; flash = 1; sound('ok'); game.scores[1] += 10; } else { flash = 0.45; sound('error'); }
      if (hits >= 3 || tries >= 7) { cancelAnimationFrame(game.raf); setTimeout(stageIncision, 350); }
    });
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

  // 3) Dikiş ritmi
  function stageSuture() {
    if (!game) return;
    frame('Dikiş Ritmi', 'Halka kapanmadan önce noktaya dokunun. 6 dikiş, ritmi bozmayın!', 3);
    const { cv, ctx, W, H: Hh, pos } = canvas();
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([90 + i * 36, 110 + (i % 2 ? 14 : -14)]);
    let idx = 0, t0 = performance.now(), hits = 0, fb = null;
    const life = 1500 * tol();
    const draw = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, W, Hh);
      ctx.fillStyle = '#2b5a6b'; ctx.fillRect(0, 0, W, Hh);
      ctx.fillStyle = '#e8c3a6'; ctx.beginPath(); ctx.ellipse(W / 2, 110, 150, 72, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#b5303a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 110); ctx.lineTo(280, 110); ctx.stroke();
      for (let i = 0; i < idx; i++) { ctx.strokeStyle = '#1d3b7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pts[i][0] - 6, 96); ctx.lineTo(pts[i][0] + 6, 124); ctx.stroke(); }
      if (idx < pts.length) {
        const k = 1 - (now - t0) / life;
        const [x, y] = pts[idx];
        ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 8 + 30 * Math.max(0, k), 0, Math.PI * 2); ctx.stroke();
        if (k <= 0) { fb = ['Kaçtı', now]; next(false); }
      }
      if (fb && now - fb[1] < 500) { ctx.fillStyle = fb[0] === 'Kaçtı' ? '#ff8a8d' : '#8fd19e'; ctx.font = '800 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(fb[0], W / 2, 40); }
      ctx.fillStyle = '#fff'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText(`Dikiş ${idx}/6 · İsabet ${hits}`, 12, 20);
      if (game && idx < pts.length) game.raf = requestAnimationFrame(draw);
    };
    const next = (ok) => {
      if (ok) { hits++; game.scores[3] += 5; sound('click'); }
      idx++; t0 = performance.now();
      if (idx >= pts.length) { cancelAnimationFrame(game.raf); setTimeout(() => endGame(false), 450); }
    };
    cv.addEventListener('pointerdown', (e) => {
      if (idx >= pts.length) return;
      const [x, y] = pos(e), [px, py] = pts[idx];
      if (Math.hypot(x - px, y - py) < 22) { fb = ['Harika!', performance.now()]; next(true); }
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
      else E().moveToFloor(p, 0, 4.5, 25.4, (e) => { e.gone = true; });
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

  VH.surgery = {
    wants, admit, update, startGame, endGame,
    get queue() { return queue; },
    get recovering() { return recovering; },
    get game() { return game; },
    _finish: finish,
  };
})();
