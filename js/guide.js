// Vita Hospital — Klinik akış rehberi
//
// - "Aktif Vaka Akış Şeması": seçili hastanın tedavi zinciri (acil: 4 adım, poliklinik vakası: 6 adım)
// - Hedef istasyon vurgusu: hedefin üzerinde zıplayan ikon + zemin halkası
// - Zemin yön çizgisi: oyuncudan hedefe A* yolu boyunca kesikli çizgi (başka kattaysa asansöre)
// - Sabır / stabilite barları: hastaların üzerinde yeşil → sarı → kırmızı
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, M = () => VH.map, H = () => VH.hospital, C = () => VH.cases, UI = () => VH.ui;
  const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  let selected = null;
  let flows = [];
  let current = null;
  let path = null, pathTimer = 0, pathKey = '';

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const entTarget = (p, label, icon) => ({ floor: p.floor, x: p.x, y: p.y, label, icon, ent: p });
  function deviceTarget(tags, label, icon) {
    const P = E().player;
    const list = E().devices.filter((d) => d.floor === 0 && tags.includes(d.tag));
    if (!list.length) return null;
    const ref = P.floor === 0 ? P : { x: 29.5, y: 10.4 };
    list.sort((a, b) => Math.hypot(a.x - ref.x, a.y - ref.y) - Math.hypot(b.x - ref.x, b.y - ref.y));
    const d = list[0];
    return { floor: 0, x: d.x, y: d.y, label: label || d.name, icon: icon || d.icon, dev: d };
  }

  // ---------------------------------------------------------------- Akışlar
  function erFlow() {
    const er = H().er, a = er.active, fol = er.follow;
    if (!a && !er.amb && !fol) return null;
    const labels = ['Ambulans Karşılama', 'Triyaj & Tetkik', 'İlgili Ünite Müdahalesi', 'Eczane İlaç Teslimi & Taburcu'];
    const P = E().player;
    let cur = 0, instr = '', target = null, patient = null, bar = null;
    if (fol) {
      patient = fol.p;
      const done = fol.p.state === 'leaving' || fol.p.gone;
      cur = done ? 4 : 3;
      if (done) instr = '✅ Acil vaka tamamlandı: hasta ilacını aldı ve taburcu edildi.';
      else if (fol.p.erStage === 'recover') { instr = 'Hasta stabil, kısa gözlemde. Birazdan eczaneye geçecek: siz de eczane tezgâhına gidin.'; target = deviceTarget(['pharmacy_counter'], 'Eczane', '💊'); }
      else if (E().pharmacyFront === fol.p) { instr = 'Hasta eczane tezgâhında. Yaklaşın ve "İlaç Onayla" ile doğru kullanım bilgisini seçin.'; target = deviceTarget(['pharmacy_counter'], 'İlaç Onayla', '💊'); }
      else { instr = 'Hasta eczaneye yürüyor. Eczane tezgâhına geçin.'; target = deviceTarget(['pharmacy_counter'], 'Eczane', '💊'); }
    } else if (!a) {
      instr = '🚨 Siren! Ambulans geliyor. Acil servisin sağdaki ambulans girişine gidin.';
      target = { floor: 0, x: 29.6, y: 16.9, label: 'Ambulans girişi', icon: '🚑' };
    } else {
      patient = a.p;
      bar = a.timeLeft / H().erMaxTime(a.def);
      if (!a.met && P.floor === 0 && dist(P, a.p) < 2.3) a.met = true;
      const unit = H().UNITS[a.def.need];
      if (!a.met && (a.phase === 'arrive' || a.phase === 'wait')) {
        cur = 0; instr = 'Ambulanstan inen hastayı acil girişinde karşılayın: yanına gidin.'; target = entTarget(a.p, 'Hastayı karşıla', '🚑');
      } else if (a.phase === 'arrive' || a.phase === 'wait') {
        cur = 1; instr = 'Hastaya "Acil Müdahale" (E) → yaşamsal bulgulara bakıp doğru üniteyi seçin.'; target = entTarget(a.p, 'Triyaj', '🩺');
      } else if (a.phase === 'toBay' || a.phase === 'bay') {
        cur = 2; instr = `${unit.icon} ${unit.name}: ${unit.device} yanına gidip "Acil Müdahale" (E) seçin.`;
        target = deviceTarget(unit.tags, unit.name, unit.icon);
      } else if (a.phase === 'stab') {
        cur = 2; instr = `Stabilizasyon %${Math.round((1 - a.stab / a.stabMax) * 100)}: ${a.device.name} yanında kalın!`;
        target = { floor: 0, x: a.device.x, y: a.device.y, label: 'Yanında kalın', icon: unit.icon, dev: a.device };
      }
    }
    return {
      id: 'er', tab: '🚑 Acil', title: 'Acil Vaka', patient: patient ? `${patient.name}, ${patient.age} yaş` : 'Ambulans yolda',
      timer: a ? fmt(a.timeLeft) : null, bar, urgent: true,
      steps: labels.map((l, i) => ({ label: l, state: i < cur ? 'done' : i === cur ? 'active' : 'todo' })),
      instruction: instr, target, patientRef: patient,
    };
  }

  function caseFlow() {
    const a = C().active;
    if (!a) return null;
    const p = a.patient;
    const labels = ['Geliş', 'Kayıt', 'Muayene & Sorgulama', 'Laboratuvar', 'Klinik Karar', 'Sonuç'];
    let cur = 0, instr = '', target = null;
    const examName = p.examRef ? p.examRef.name : 'Muayene odası';
    switch (p.state) {
      case 'queue': cur = 0; instr = '★ Vaka hastası geldi ve resepsiyon kuyruğunda. Kayıt otomatik yapılır.'; target = entTarget(p, 'Vaka hastası', '★'); break;
      case 'registering': cur = 1; instr = 'Resepsiyonda şikâyet ve yaş kaydediliyor…'; target = entTarget(p, 'Kayıt', '📋'); break;
      case 'toSeat': case 'waiting': cur = 2; instr = 'Kayıt tamam. Hasta öncelikli olarak ilk boş muayene odasına çağrılacak.'; break;
      case 'toExam': cur = a.labsReady ? 3 : 2; instr = a.labsReady ? 'Hasta odaya dönüyor. Laboratuvar analizöründe tahlili inceleyin.' : `Hasta ${examName}'na gidiyor. Siz de oraya geçin.`;
        target = a.labsReady && !a.labsReviewed ? deviceTarget(['analyzer'], 'Tahlil İncele', '🧪') : entTarget(p, examName, '🩺'); break;
      case 'labWait': case 'toLab': case 'lab': cur = 3; instr = 'Kan alınıyor… Sonuç hazır olunca analizöre gidin.'; target = deviceTarget(['analyzer'], 'Laboratuvar', '🧪'); break;
      case 'exam':
        if (a.labsReady && !a.labsReviewed) { cur = 3; instr = 'Tahlil sonuçları hazır: laboratuvardaki analizörde "Tahlil İncele".'; target = deviceTarget(['analyzer'], 'Tahlil İncele', '🧪'); }
        else if (a.labsReviewed) { cur = 4; instr = `${examName}: hastaya "Hastayı Muayene Et" → "Klinik Karar Ver".`; target = entTarget(p, 'Klinik karar', '⚖️'); }
        else { cur = 2; instr = `${examName}: hastayı doğru sorularla sorgulayın, sonra kan tahlili isteyin.`; target = entTarget(p, 'Sorgula', '🩺'); }
        break;
      default: cur = 5; instr = 'Vaka sonuçlandı.';
    }
    return {
      id: 'case', tab: '★ Vaka', title: `Vaka: ${a.c.title}`, patient: `${p.name}, ${p.age} yaş · ${a.c.complaint}`,
      timer: null, bar: p.patience !== undefined ? p.patience / 100 : null, urgent: false,
      steps: labels.map((l, i) => ({ label: l, state: i < cur ? 'done' : i === cur ? 'active' : 'todo' })),
      instruction: instr, target, patientRef: p,
    };
  }

  function pharmacyFlow() {
    const p = E().pharmacyFront;
    if (!p || p.erRef || p.caseRef) return null;
    return {
      id: 'pharm', tab: '💊 Eczane', title: 'Eczane Teslimi', patient: `${p.name}${p.age ? ', ' + p.age + ' yaş' : ''}`,
      timer: null, bar: p.patience !== undefined ? p.patience / 100 : null, urgent: false,
      steps: ['Reçete Hazır', 'İlaç Onayla & Bilgilendir', 'Taburcu'].map((l, i) => ({ label: l, state: i < 1 ? 'done' : i === 1 ? 'active' : 'todo' })),
      instruction: 'Eczane tezgâhında "İlaç Onayla": doğru kullanım bilgisi bonus ve kombo kazandırır.',
      target: deviceTarget(['pharmacy_counter'], 'İlaç Onayla', '💊'), patientRef: p,
    };
  }

  /** Hedef başka kattaysa oyuncunun katındaki asansöre yönlendir. */
  function resolveTarget(t) {
    if (!t) return null;
    const P = E().player;
    if (t.floor === P.floor) return t;
    const el = E().devices.find((d) => d.floor === P.floor && d.tag === 'elevator');
    if (!el) return null;
    return { floor: P.floor, x: el.x, y: el.y, label: 'Asansör → ' + M().floorName(t.floor).split(' · ')[0], icon: '🛗', dev: el };
  }

  // ---------------------------------------------------------------- Yol
  function goalCell(t) {
    const f = E().player.floor;
    const tx = Math.floor(t.x), ty = Math.floor(t.y);
    if (!M().isBlocked(tx, ty, f)) return [tx, ty];
    const P = E().player;
    let best = null, bd = Infinity;
    const x0 = t.dev ? t.dev.x0 : tx, x1 = t.dev ? t.dev.x1 - 1 : tx, y0 = t.dev ? t.dev.y0 : ty, y1 = t.dev ? t.dev.y1 - 1 : ty;
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
      if (M().isBlocked(x, y, f)) continue;
      const d = Math.hypot(x + 0.5 - P.x, y + 0.5 - P.y);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }

  function updatePath(t, dt) {
    pathTimer -= dt;
    const P = E().player;
    const key = t ? `${Math.floor(P.x)},${Math.floor(P.y)},${Math.round(t.x * 2)},${Math.round(t.y * 2)},${P.floor}` : '';
    if (!t) { path = null; return; }
    if (key === pathKey && pathTimer > 0) return;
    pathKey = key; pathTimer = 0.35;
    const g = goalCell(t);
    if (!g) { path = null; return; }
    const cells = E()._findPath(Math.floor(P.x), Math.floor(P.y), g[0], g[1], P.floor);
    if (!cells) { path = null; return; }
    path = cells;
  }

  // ---------------------------------------------------------------- Çizim
  function drawGround(ctx) {
    const t = current && current.resolved;
    if (!t) return;
    const map = M(), P = E().player, now = performance.now();
    const col = current.urgent ? '255,107,87' : '46,196,182';
    // kesikli yön çizgisi
    if (path && path.length) {
      const pts = [[P.x, P.y]].concat(path.map(([x, y]) => [x, y]));
      const iso = pts.map(([x, y]) => map.worldToIso(x, y));
      if (Math.hypot(P.x - t.x, P.y - t.y) > 1.2) {
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 6;
        ctx.setLineDash([10, 9]); ctx.lineDashOffset = -now / 40;
        ctx.beginPath(); iso.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.5) : ctx.moveTo(x, y + 1.5))); ctx.stroke();
        ctx.strokeStyle = `rgba(${col},0.95)`; ctx.lineWidth = 3.5;
        ctx.beginPath(); iso.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.setLineDash([]);
        // yön oku (çizginin sonuna yakın)
        const n = iso.length;
        if (n >= 2) {
          const [ax, ay] = iso[Math.max(0, n - 2)], [bx, by] = iso[n - 1];
          const ang = Math.atan2(by - ay, bx - ax);
          ctx.fillStyle = `rgba(${col},0.95)`;
          ctx.translate(bx, by); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -6); ctx.lineTo(-3, 0); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }
    // hedef zemin halkası
    const [sx, sy] = map.worldToIso(t.x, t.y);
    const pulse = (Math.sin(now / 250) + 1) / 2;
    ctx.strokeStyle = `rgba(${col},${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(sx, sy, 24 + pulse * 8, 12 + pulse * 4, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = `rgba(${col},0.12)`;
    ctx.beginPath(); ctx.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawOverlay(ctx, vw, vh) {
    const cam = M().camera, map = M(), now = performance.now(), P = E().player;
    // Sabır / stabilite barları
    const er = H().er.active;
    for (const p of E().patients) {
      if (p.floor !== P.floor || p.gone || p.state === 'resident' || p.state === 'leaving') continue;
      let v = null;
      if (er && er.p === p) v = er.timeLeft / H().erMaxTime(er.def);
      else if (p.patience !== undefined && (p.patience < 99 || p.caseRef)) v = p.patience / 100;
      if (v === null) continue;
      const [ix, iy] = map.worldToIso(p.x, p.y);
      const [bx, by] = cam.toScreen(ix, iy - (p.lift || 0) - 47, vw, vh);
      if (bx < -30 || bx > vw + 30 || by < -20 || by > vh + 20) continue;
      const w = 26;
      ctx.fillStyle = 'rgba(12,32,46,0.85)';
      ctx.fillRect(bx - w / 2 - 1.5, by - 3.5, w + 3, 7);
      ctx.fillStyle = v > 0.6 ? '#46c46a' : v > 0.3 ? '#f2c94c' : '#ff5a5f';
      ctx.fillRect(bx - w / 2, by - 2, w * Math.max(0, Math.min(1, v)), 4);
    }
    // Hedef ikonu (zıplayan) + ekran dışı oku
    const t = current && current.resolved;
    if (!t) return;
    const [ix, iy] = map.worldToIso(t.x, t.y);
    const lift = t.ent ? 70 : 62;
    let [sx, sy] = cam.toScreen(ix, iy - lift, vw, vh);
    const bob = Math.sin(now / 200) * 5;
    const col = current.urgent ? '#ff6b57' : '#2ec4b6';
    const off = sx < 20 || sx > vw - 20 || sy < 60 || sy > vh - 20;
    if (off) {
      const cx = vw / 2, cy = vh / 2;
      const ang = Math.atan2(sy - cy, sx - cx);
      const r = Math.min(vw, vh) / 2 - 46;
      const ex = cx + Math.cos(ang) * r, ey = cy + Math.sin(ang) * r;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(ang);
      ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-8, -12); ctx.lineTo(-3, 0); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      sx = ex - Math.cos(ang) * 30; sy = ey - Math.sin(ang) * 30;
    }
    ctx.save();
    ctx.translate(sx, sy + (off ? 0 : bob));
    ctx.fillStyle = col; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (!off) { ctx.beginPath(); ctx.moveTo(-6, 13); ctx.lineTo(0, 22); ctx.lineTo(6, 13); ctx.closePath(); ctx.fill(); }
    ctx.font = '15px system-ui, "Segoe UI Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(t.icon || '➜', 0, 1);
    ctx.font = '700 11px system-ui, sans-serif';
    const tw = ctx.measureText(t.label).width + 12;
    ctx.fillStyle = 'rgba(12,32,46,0.9)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-tw / 2, -36, tw, 18, 9); else ctx.rect(-tw / 2, -36, tw, 18); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(t.label, 0, -27);
    ctx.restore();
  }

  // ---------------------------------------------------------------- API
  VH.guide = {
    get current() { return current; },
    get flows() { return flows; },
    get path() { return path; },
    select(id) { selected = id; },
    /** Hastaya tıklanınca o hastanın akışını seç. */
    selectPatient(p) {
      if (p && p.erRef) selected = 'er';
      else if (p && p.caseRef) selected = 'case';
    },
    update(dt) {
      const hadEr = flows.some((f) => f.id === 'er');
      flows = [erFlow(), caseFlow(), pharmacyFlow()].filter(Boolean);
      // Yeni acil vaka geldiğinde akış şeması otomatik olarak aciline geçer
      if (!hadEr && flows.some((f) => f.id === 'er')) selected = 'er';
      if (!flows.find((f) => f.id === selected)) selected = flows.length ? flows[0].id : null;
      current = flows.find((f) => f.id === selected) || null;
      if (current) current.resolved = resolveTarget(current.target);
      updatePath(current && current.resolved, dt);
      UI().setFlow(current, flows, (id) => { selected = id; });
    },
    drawGround,
    drawOverlay,
  };
})();
