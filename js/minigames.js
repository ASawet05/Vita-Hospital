// Vita Hospital — Ünitelere özel etkileşimli mini oyunlar (5–10 sn)
//
//  1) Acil · Oksijen / Serum bağlama: hortum ucunu hastanın portuna sürükle, ardından akış vanasını
//     (L/dk ya da damla/dk) ayarlayıp ibreyi yeşil bölgede 2,5 sn tut.
//  2) Biyo-Laboratuvar · Santrifüj + tahlil okuma: tüpleri karşılıklı yuvalara yerleştir, çalıştır,
//     hız ibresi yeşildeyken durdur; ardından dijital raporda referans dışı (anormal) değerleri işaretle.
//  3) Acil · Defibrilatör: şarj et (basılı tut), akan EKG'de R dalgası yeşil hedef çizgisindeyken ŞOK.
//  4) Eczane · Hızlı reçete: reçetedeki 2–3 ürünü raftan ilaç poşetine sürükle (ya da dokun), teslim et.
// Mini oyun açıkken simülasyon duraklar; kapatılırsa (✕) normal akış sürer (bonus yok).
// Görseller koddan çizilir; ameliyat mini oyunlarının kart stili (.sg-*) ortak kullanılır.
(function () {
  const VH = (window.VH = window.VH || {});
  const UI = () => VH.ui;
  const sound = (k) => { try { if (VH.audio) VH.audio.play(k); } catch (_) { /* ses yok */ } };
  const el = (tag, props, text) => { const n = document.createElement(tag); if (props) Object.assign(n, props); if (text !== undefined) n.textContent = text; return n; };
  const rand = (a, b) => a + Math.random() * (b - a);

  let cur = null; // { root, card, raf, wasPaused, done }
  function open(icon, title, steps) {
    close(true);
    const root = el('div', { id: 'minigame' });
    const card = el('div', { className: 'sg-card mg-card' });
    root.appendChild(card);
    document.getElementById('ui-root').appendChild(root);
    cur = { root, card, raf: 0, wasPaused: !!VH.paused, icon, title, steps, timers: [] };
    VH.paused = true;
    return cur;
  }
  function close(silent) {
    if (!cur) return;
    cancelAnimationFrame(cur.raf);
    cur.timers.forEach((t) => clearTimeout(t));
    cur.root.remove();
    VH.paused = cur.wasPaused;
    cur = null;
    if (!silent) sound('click');
  }
  /** Kart başlığı + adım çipleri + açıklama. onAbort: ✕ ile kapatma. */
  function frame(stepIdx, title, sub, onAbort) {
    const c = cur.card;
    c.innerHTML = '';
    const head = el('div', { className: 'sg-head' });
    head.appendChild(el('strong', {}, `${cur.icon} ${cur.title}`));
    const st = el('div', { className: 'sg-steps' });
    cur.steps.forEach((s, i) => st.appendChild(el('span', { className: 'sg-step' + (i < stepIdx ? ' done' : i === stepIdx ? ' on' : '') }, s)));
    head.appendChild(st);
    const x = el('button', { type: 'button', className: 'dlg-close', title: 'Atla (bonus yok)' }, '✕');
    x.addEventListener('click', () => { const f = onAbort; close(); if (f) f(); });
    head.appendChild(x);
    c.appendChild(head);
    c.appendChild(el('div', { className: 'sg-title' }, title));
    c.appendChild(el('div', { className: 'sg-sub' }, sub));
  }
  function canvas() {
    const cv = el('canvas', { className: 'sg-canvas' });
    const W = 360, H = 220, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr;
    cur.card.appendChild(cv);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
    return { cv, ctx, W, H, pos };
  }
  function loop(fn) {
    const g = cur;
    const tick = () => { if (cur !== g) return; if (fn() !== false) g.raf = requestAnimationFrame(tick); };
    g.raf = requestAnimationFrame(tick);
  }
  function later(fn, ms) { const g = cur; const t = setTimeout(() => { if (cur === g) fn(); }, ms); cur.timers.push(t); }
  function result(score, lines, onDone, okLabel) {
    const c = cur.card;
    c.innerHTML = '';
    const good = score >= 60;
    c.appendChild(el('div', { className: 'grade', style: `border-color:${good ? '#46a758' : '#edae49'}` }, `${good ? '✅' : '⚠️'} ${cur.title} · ${score}/100`));
    lines.forEach((l) => c.appendChild(el('p', { className: 'sg-sub' }, l)));
    const b = el('button', { type: 'button', className: 'dlg-btn sg-big' }, okLabel || 'Devam');
    b.addEventListener('click', () => { close(); onDone(score); });
    c.appendChild(b);
    sound(good ? 'success' : 'error');
  }
  const rr = (c, x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
  /** Yeşil bölgeli yarım daire gösterge. */
  function gauge(c, cx, cy, r, v, lo, hi, label, unit) {
    c.lineWidth = 12; c.lineCap = 'butt';
    c.strokeStyle = '#2b3a46'; c.beginPath(); c.arc(cx, cy, r, Math.PI, Math.PI * 2); c.stroke();
    c.strokeStyle = '#46c46a'; c.beginPath(); c.arc(cx, cy, r, Math.PI + Math.PI * lo, Math.PI + Math.PI * hi); c.stroke();
    const a = Math.PI + Math.PI * Math.max(0, Math.min(1, v));
    c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (r - 4), cy + Math.sin(a) * (r - 4)); c.stroke();
    c.fillStyle = '#eef4f7'; c.font = '800 13px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(label, cx, cy + 16);
    if (unit) { c.fillStyle = '#8aa1ad'; c.font = '600 10px system-ui'; c.fillText(unit, cx, cy + 30); }
  }

  // ================================================================ 1) Oksijen / Serum bağlama
  function flow(kind, onDone) {
    const ox = kind === 'oxygen' || kind === 'ventilator';
    open(ox ? '🫁' : '💧', ox ? 'Oksijen Bağlama' : 'Serum (IV) Bağlama', ['Bağla', 'Akışı ayarla']);
    let score = 0;
    // Adım 1: hortum ucunu porta sürükle
    frame(0, ox ? 'Oksijen hortumunu maskeye bağlayın' : 'Serum hattını damar yoluna takın', 'Turkuaz uçtan tutup hastanın yanıp sönen bağlantı portuna sürükleyin.', () => onDone(0));
    const { cv, ctx, W, H, pos } = canvas();
    const src = [52, 160], port = [292, 92];
    let tip = src.slice(), drag = false, t0 = performance.now(), linked = false;
    const drawScene = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0b2430'; ctx.fillRect(0, 0, W, H);
      // hasta (yatar) ve port
      ctx.fillStyle = '#6f9fc2'; rr(ctx, 170, 80, 170, 52, 18); ctx.fill();
      ctx.fillStyle = '#e8b48f'; ctx.beginPath(); ctx.arc(318, 100, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b2a1e'; ctx.beginPath(); ctx.arc(322, 92, 15, Math.PI, Math.PI * 2); ctx.fill();
      const blink = Math.floor(performance.now() / 300) % 2;
      ctx.strokeStyle = linked ? '#46c46a' : blink ? '#ffd166' : '#f2a93b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(port[0], port[1], 11, 0, Math.PI * 2); ctx.stroke();
      // kaynak cihaz
      if (ox) { ctx.fillStyle = '#2f9e44'; rr(ctx, 26, 120, 30, 86, 10); ctx.fill(); ctx.fillStyle = '#f2f4f5'; rr(ctx, 30, 108, 22, 16, 6); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(200,232,250,0.9)'; rr(ctx, 30, 40, 36, 52, 8); ctx.fill(); ctx.fillStyle = 'rgba(90,160,216,0.6)'; ctx.fillRect(33, 60, 30, 29); ctx.strokeStyle = '#c9d1d6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(48, 20); ctx.lineTo(48, 40); ctx.stroke(); }
      // hortum
      ctx.strokeStyle = 'rgba(170,220,240,0.95)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox ? 41 : 48, ox ? 110 : 92); ctx.quadraticCurveTo((src[0] + tip[0]) / 2, Math.max(src[1], tip[1]) + 40, tip[0], tip[1]); ctx.stroke();
      ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.arc(tip[0], tip[1], 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'left'; ctx.fillText('⏱ ' + Math.max(0, 8 - (performance.now() - t0) / 1000).toFixed(1) + ' sn', 10, 18);
    };
    cv.addEventListener('pointerdown', (e) => { const p = pos(e); if (Math.hypot(p[0] - tip[0], p[1] - tip[1]) < 22) { drag = true; try { cv.setPointerCapture(e.pointerId); } catch (_) { /* yok */ } } });
    cv.addEventListener('pointermove', (e) => { if (drag && !linked) tip = pos(e); });
    cv.addEventListener('pointerup', () => {
      if (!drag || linked) return;
      drag = false;
      if (Math.hypot(tip[0] - port[0], tip[1] - port[1]) < 22) { linked = true; tip = port.slice(); sound('ok'); score += 40 - Math.min(20, Math.floor((performance.now() - t0) / 400)); later(stage2, 450); }
      else { tip = src.slice(); sound('error'); }
    });
    loop(() => { drawScene(); if (!linked && performance.now() - t0 > 8000) { linked = true; later(stage2, 50); } });
    // Adım 2: vana ile akışı yeşil bölgede 2,5 sn tut
    function stage2() {
      frame(1, ox ? 'Oksijen akışını ayarlayın (L/dk)' : 'Damla hızını ayarlayın (damla/dk)', 'Vanayı çevirerek ibreyi yeşil bölgede toplam 2,5 sn tutun. Akış kendiliğinden sapar, düzeltin!', () => onDone(score));
      const { ctx: c2, W: W2, H: H2 } = canvas();
      const slider = el('input', { type: 'range', min: '0', max: '100', value: '20', className: 'sg-slider' });
      cur.card.appendChild(slider);
      const lo = rand(0.48, 0.62), hi = lo + 0.16;
      let val = 0.2, drift = 0, hold = 0, last = performance.now();
      const start = last;
      slider.addEventListener('input', () => { val = +slider.value / 100; });
      loop(() => {
        const t = performance.now(), dt = Math.min(0.05, (t - last) / 1000); last = t;
        drift += (Math.random() - 0.5) * dt * 0.9; drift *= 0.985;
        val = Math.max(0, Math.min(1, val + drift * dt * 6));
        slider.value = String(Math.round(val * 100));
        const inZone = val >= lo && val <= hi;
        if (inZone) hold += dt;
        c2.clearRect(0, 0, W2, H2); c2.fillStyle = '#0b2430'; c2.fillRect(0, 0, W2, H2);
        const shown = ox ? (val * 15).toFixed(1) + ' L/dk' : Math.round(val * 120) + ' damla/dk';
        gauge(c2, W2 / 2, 140, 92, val, lo, hi, shown, inZone ? '● güvenli aralık' : '◌ aralık dışı');
        c2.fillStyle = '#2b3a46'; rr(c2, 40, 186, 280, 10, 5); c2.fill();
        c2.fillStyle = '#46c46a'; rr(c2, 40, 186, 280 * Math.min(1, hold / 2.5), 10, 5); c2.fill();
        c2.fillStyle = '#fff'; c2.font = '700 12px system-ui'; c2.textAlign = 'left'; c2.fillText('⏱ ' + Math.max(0, 9 - (t - start) / 1000).toFixed(1) + ' sn', 10, 18);
        if (hold >= 2.5 || t - start > 9000) {
          const ok = hold >= 2.5;
          score += ok ? 60 - Math.min(25, Math.floor(Math.max(0, (t - start) / 1000 - 3) * 4)) : Math.round(hold / 2.5 * 30);
          score = Math.max(0, Math.min(100, score));
          result(score, [ok ? (ox ? 'Oksijen satürasyonu yükseliyor, hasta rahatladı.' : 'Sıvı dengesi sağlandı, damla hızı uygun.') : 'Akış aralık dışında kaldı; hemşire düzeltiyor.', score >= 60 ? '⚡ Stabilizasyon hızlandı (hız bonusu).' : 'Stabilizasyon normal hızda sürecek.'], onDone);
          return false;
        }
      });
    }
  }

  // ================================================================ 2) Santrifüj + tahlil okuma
  function lab(labs, onDone) {
    open('🧪', 'Laboratuvar Analizi', ['Santrifüj', 'Sonuç okuma']);
    let score = 0;
    frame(0, 'Santrifüjü dengeleyin ve çalıştırın', 'Kan tüplerini karşılıklı yuvalara yerleştirin (dengesiz rotor çalışmaz), sonra ÇALIŞTIR; hız ibresi yeşildeyken DURDUR.', () => onDone(0));
    const { cv, ctx, W, H, pos } = canvas();
    const N = 8, slots = new Array(N).fill(false);
    let placed = 0, phase = 'place', spin = 0, rpm = 0, msg = '', msgT = 0, t0 = performance.now();
    const cx = 120, cy = 112, R0 = 64;
    const btn = el('button', { type: 'button', className: 'dlg-btn sg-big' }, '▶ Çalıştır');
    btn.disabled = true;
    cur.card.appendChild(btn);
    const lo = 0.62, hi = 0.8;
    btn.addEventListener('click', () => {
      if (phase === 'place' && placed >= 2) { phase = 'spin'; btn.textContent = '⏹ Durdur'; sound('click'); return; }
      if (phase === 'spin') {
        const v = rpm;
        const ok = v >= lo && v <= hi;
        score += ok ? 45 : Math.max(5, 30 - Math.round(Math.abs(v - (lo + hi) / 2) * 80));
        msg = ok ? 'Mükemmel: 4000 rpm' : v < lo ? 'Düşük hız: ayrışma eksik' : 'Aşırı hız: hemoliz riski';
        phase = 'done'; btn.disabled = true; sound(ok ? 'ok' : 'error');
        later(() => report(), 900);
      }
    });
    cv.addEventListener('pointerdown', (e) => {
      if (phase !== 'place') return;
      const [x, y] = pos(e);
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2, sx = cx + Math.cos(a) * R0 * 0.7, sy = cy + Math.sin(a) * R0 * 0.7;
        if (Math.hypot(x - sx, y - sy) < 13 && !slots[i]) {
          // dengeleme kuralı: tek sayıda tüp varsa sıradaki tüp, son tüpün karşısına konmalı
          if (placed % 2 === 1) {
            const lastI = slots.findIndex((s, j) => s === placed);
            if ((lastI + N / 2) % N !== i) { msg = '⚖️ Dengesiz! Karşı yuvaya yerleştirin.'; msgT = performance.now(); sound('error'); score -= 5; return; }
          }
          placed++; slots[i] = placed; sound('click');
          if (placed >= 2 && placed % 2 === 0) btn.disabled = false;
          return;
        }
      }
    });
    const cols = ['#d62828', '#8e44ad', '#2f78b3', '#2f9e44'];
    loop(() => {
      const t = performance.now();
      if (phase === 'spin') { rpm = 0.5 + 0.5 * Math.sin((t - t0) / 520) * Math.min(1, (t - t0) / 900); spin += rpm * 0.6; }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0b2430'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#d3dbe0'; ctx.beginPath(); ctx.arc(cx, cy, R0 + 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5d6a74'; ctx.beginPath(); ctx.arc(cx, cy, R0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + (phase === 'spin' || phase === 'done' ? spin : 0);
        const sx = cx + Math.cos(a) * R0 * 0.7, sy = cy + Math.sin(a) * R0 * 0.7;
        ctx.fillStyle = slots[i] ? cols[(slots[i] - 1) % 4] : '#2b333b';
        ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI * 2); ctx.fill();
        if (!slots[i] && phase === 'place') { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1.5; ctx.stroke(); }
      }
      ctx.fillStyle = '#9aa7b0'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
      gauge(ctx, 280, 128, 58, phase === 'place' ? 0 : rpm, lo, hi, Math.round((phase === 'place' ? 0 : rpm) * 5200) + ' rpm');
      ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(phase === 'place' ? `Tüp: ${placed} · çift sayıda ve karşılıklı` : phase === 'spin' ? 'Yeşil bölgede DURDUR!' : msg, 10, 18);
      if (msg && phase === 'place' && t - msgT < 1200) { ctx.fillStyle = '#ffb347'; ctx.fillText(msg, 10, 210); }
    });
    // Adım 2: dijital rapor — anormal değerleri işaretle
    function report() {
      const rows = (labs && labs.length ? labs : randomLabs()).slice(0, 6);
      const abn = new Set(rows.map((r, i) => (r.value < r.lo || r.value > r.hi ? i : -1)).filter((i) => i >= 0));
      frame(1, 'Referans dışı değerleri işaretleyin', `Rapordaki anormal (yüksek/düşük) sonuçlara dokunun, sonra Onayla. (${abn.size} anormal değer var)`, () => onDone(Math.max(0, score)));
      const tbl = el('div', { className: 'mg-lab' });
      const picked = new Set();
      rows.forEach((r, i) => {
        const b = el('button', { type: 'button', className: 'mg-lab-row' });
        b.appendChild(el('span', { className: 'mg-ln' }, r.name));
        b.appendChild(el('span', { className: 'mg-lv' }, `${r.value} ${r.unit}`));
        b.appendChild(el('span', { className: 'mg-lr' }, `${r.lo}–${r.hi}`));
        b.addEventListener('click', () => { if (picked.has(i)) picked.delete(i); else picked.add(i); b.classList.toggle('on', picked.has(i)); sound('click'); });
        tbl.appendChild(b);
      });
      cur.card.appendChild(tbl);
      const ok = el('button', { type: 'button', className: 'dlg-btn sg-big' }, '✓ Onayla');
      ok.addEventListener('click', () => {
        let hit = 0, wrong = 0;
        picked.forEach((i) => { if (abn.has(i)) hit++; else wrong++; });
        const part = abn.size ? Math.round((hit / abn.size) * 55) - wrong * 12 : 55 - wrong * 12;
        score = Math.max(0, Math.min(100, score + Math.max(0, part)));
        const names = [...abn].map((i) => `${rows[i].name} ${rows[i].value < rows[i].lo ? '↓ düşük' : '↑ yüksek'}`);
        result(score, [`Doğru işaretlenen: ${hit}/${abn.size}${wrong ? ` · yanlış: ${wrong}` : ''}`, names.length ? 'Anormal bulgular: ' + names.join(', ') : 'Tüm değerler referans aralığında.'], onDone, 'Raporu aç');
      });
      cur.card.appendChild(ok);
    }
  }
  function randomLabs() {
    const L = (name, value, unit, lo, hi) => ({ name, value, unit, lo, hi });
    const wbc = Math.random() < 0.5 ? +rand(11.5, 16).toFixed(1) : +rand(5, 9).toFixed(1);
    const crp = Math.random() < 0.5 ? Math.round(rand(14, 60)) : Math.round(rand(1, 4));
    const hb = Math.random() < 0.5 ? +rand(9.2, 11.4).toFixed(1) : +rand(12.6, 15).toFixed(1);
    return [L('WBC', wbc, '10³/µL', 4.0, 10.5), L('CRP', crp, 'mg/L', 0, 5), L('Hemoglobin', hb, 'g/dL', 12, 16), L('Trombosit', Math.round(rand(170, 380)), '10³/µL', 150, 400), L('Sodyum', Math.round(rand(136, 144)), 'mmol/L', 135, 145), L('Glukoz', Math.round(rand(75, 98)), 'mg/dL', 70, 99)];
  }

  // ================================================================ 3) Defibrilatör
  function defib(onDone) {
    open('⚡', 'Defibrilatör · Ritim Şoku', ['Şarj', 'Senkron şok']);
    let score = 0, charge = 0, charging = false, charged = false, tries = 0, hit = false, t0 = performance.now(), msg = '';
    frame(0, 'Cihazı şarj edin, R dalgası hedefteyken şok verin', '“ŞARJ” düğmesini basılı tutarak 200 J\'a kadar doldurun; akan EKG\'de R tepesi yeşil çizgiye geldiğinde “ŞOK”a basın (3 deneme).', () => onDone(0));
    const { ctx, W, H } = canvas();
    const row = el('div', { className: 'sg-row' });
    const chg = el('button', { type: 'button', className: 'dlg-btn sg-big' }, '🔋 ŞARJ (basılı tut)');
    const shk = el('button', { type: 'button', className: 'dlg-btn sg-big danger' }, '⚡ ŞOK');
    shk.disabled = true;
    row.appendChild(chg); row.appendChild(shk); cur.card.appendChild(row);
    const down = (e) => { e.preventDefault(); if (!charged) charging = true; };
    const up = () => { charging = false; };
    chg.addEventListener('pointerdown', down); chg.addEventListener('pointerup', up); chg.addEventListener('pointerleave', up);
    const TX = 250, speed = 120; // hedef çizgisi x, piksel/sn
    const beat = 0.9; // sn
    const peakX = (t) => { const ph = ((t / 1000) % beat) / beat; return W - ph * speed * beat; }; // en yeni R tepesinin x'i
    shk.addEventListener('click', () => {
      if (!charged || hit) return;
      tries++;
      const t = performance.now();
      // ekrandaki tüm R tepeleri: peakX + k*speed*beat
      let best = 1e9;
      for (let k2 = -3; k2 <= 3; k2++) best = Math.min(best, Math.abs(peakX(t) + k2 * speed * beat - TX));
      if (best < 14) { hit = true; score = Math.max(35, 100 - (tries - 1) * 25 - Math.max(0, Math.round(((t - t0) / 1000 - 4) * 4))); msg = 'Senkron şok başarılı! Sinüs ritmi döndü.'; sound('success'); later(() => result(score, [msg, '⚡ Stabilizasyon büyük ölçüde hızlandı.'], onDone), 900); }
      else { msg = best < 30 ? 'Az kaldı! R tepesini bekleyin.' : 'Zamanlama kaçtı.'; sound('error'); charged = false; charge = 0.4; shk.disabled = true; chg.disabled = false;
        if (tries >= 3) { score = 20; later(() => result(score, ['Senkron yakalanamadı; ekip tekrar deniyor.'], onDone), 700); } }
    });
    loop(() => {
      const t = performance.now();
      if (charging && !charged) { charge = Math.min(1, charge + 0.022); if (charge >= 1) { charged = true; charging = false; shk.disabled = false; chg.disabled = true; sound('ok'); } }
      ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#04120d'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(102,255,153,0.08)'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 30); ctx.lineTo(x, 170); ctx.stroke(); }
      // hedef çizgisi
      ctx.strokeStyle = hit ? '#46c46a' : '#2ec4b6'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(TX, 30); ctx.lineTo(TX, 170); ctx.stroke(); ctx.setLineDash([]);
      // EKG (ventriküler taşikardi → şok sonrası sinüs)
      ctx.strokeStyle = '#66ff99'; ctx.lineWidth = 2; ctx.beginPath();
      const p0 = peakX(t);
      for (let x = 0; x <= W; x += 2) {
        let d = ((x - p0) % (speed * beat) + speed * beat) % (speed * beat);
        if (d > speed * beat / 2) d -= speed * beat;
        let y = 100;
        if (Math.abs(d) < 5) y = 100 - (5 - Math.abs(d)) * (hit ? 9 : 12);
        else if (d > 5 && d < 14) y = 100 + (d - 5) * 3;
        else if (d >= 14 && d < 22) y = 127 - (d - 14) * 3.4;
        else if (!hit && d > 26 && d < 46) y = 100 - Math.sin((d - 26) / 20 * Math.PI) * 12;
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      // şarj çubuğu ve bilgi
      ctx.fillStyle = '#2b3a46'; rr(ctx, 14, 186, 200, 12, 6); ctx.fill();
      ctx.fillStyle = charged ? '#ffd166' : '#f2a93b'; rr(ctx, 14, 186, 200 * charge, 12, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(charge * 200)} J ${charged ? '· HAZIR' : ''}`, 222, 196);
      ctx.fillText(msg || `Deneme ${tries}/3`, 10, 18);
      if (!hit && tries < 3 && t - t0 > 14000) { score = 15; result(score, ['Süre doldu; ekip şoku uyguladı.'], onDone); return false; }
    });
  }

  // ================================================================ 4) Eczane · hızlı reçete
  const SHELF = ['Parasetamol 500 mg', 'İbuprofen 400 mg', 'Demir (ferröz) tablet', 'C vitamini 500 mg', 'D3 vitamini damla', 'B12 vitamini', 'Magnezyum sitrat', 'Çinko 15 mg',
    'Folik asit 5 mg', 'ORS sıvı-tuz paketi', 'Salbutamol inhaler', 'Hazneli (spacer) aparat', 'Glukoz tableti', 'Adrenalin oto-enjektör', 'Metformin 500 mg', 'Levotiroksin 50 µg', 'Pantoprazol 40 mg', 'Sevk/randevu formu', 'Bilgilendirme broşürü'];
  const RX_ITEMS = {
    demir: ['Demir (ferröz) tablet', 'C vitamini 500 mg'], dvit: ['D3 vitamini damla'], b12: ['B12 vitamini', 'Bilgilendirme broşürü'],
    magnezyum: ['Magnezyum sitrat'], cinko: ['Çinko 15 mg'], folat: ['Folik asit 5 mg'], agri: ['Parasetamol 500 mg', 'Bilgilendirme broşürü'],
    sivi: ['ORS sıvı-tuz paketi', 'Bilgilendirme broşürü'], sevk: ['Sevk/randevu formu', 'Bilgilendirme broşürü'], inhaler: ['Salbutamol inhaler', 'Hazneli (spacer) aparat'],
    seker: ['Glukoz tableti', 'Bilgilendirme broşürü'], alerji: ['Adrenalin oto-enjektör', 'Bilgilendirme broşürü'], metformin: ['Metformin 500 mg', 'Bilgilendirme broşürü'],
    levotiroksin: ['Levotiroksin 50 µg'], ppi: ['Pantoprazol 40 mg'],
  };
  const BOX_COL = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#8e7cc3', '#2f9e44', '#e9edf0', '#d62828'];
  function pharmacy(patient, rxKey, rxName, onDone) {
    open('💊', 'Hızlı Reçete Hazırlama', ['Raftan seç', 'Teslim']);
    const need = (RX_ITEMS[rxKey] || [rxName.split(' (')[0], 'Bilgilendirme broşürü']).slice(0, 3);
    const pool = SHELF.filter((s) => !need.includes(s)).sort(() => Math.random() - 0.5).slice(0, 8 - need.length);
    const shelf = need.concat(pool).sort(() => Math.random() - 0.5);
    frame(0, 'Reçetedeki ürünleri poşete koyun', `Hasta: ${patient.name}. Reçetedeki ${need.length} ürünü raftan poşete sürükleyin (ya da dokunun). Yanlış ürün puan düşürür.`, () => onDone(0));
    const rxBox = el('div', { className: 'mg-rx' });
    rxBox.appendChild(el('strong', {}, '📄 Reçete'));
    need.forEach((n) => rxBox.appendChild(el('span', { className: 'mg-rx-i' }, '▢ ' + n)));
    cur.card.appendChild(rxBox);
    const wrap = el('div', { className: 'mg-pharm' });
    const grid = el('div', { className: 'mg-shelf' });
    const bag = el('div', { className: 'mg-bag' }, '🛍️ İlaç poşeti');
    const inBag = new Set();
    let wrong = 0;
    const t0 = performance.now();
    const add = (name, btn) => {
      if (inBag.has(name)) return;
      if (!need.includes(name)) { wrong++; sound('error'); btn.classList.add('bad'); setTimeout(() => btn.classList.remove('bad'), 400); return; }
      inBag.add(name); sound('click');
      btn.classList.add('used'); btn.disabled = true;
      bag.appendChild(el('span', { className: 'mg-bag-i' }, '💊 ' + name));
      [...rxBox.querySelectorAll('.mg-rx-i')].forEach((s) => { if (s.textContent.slice(2) === name) s.textContent = '☑ ' + name; });
      if (inBag.size === need.length) deliver.disabled = false;
    };
    shelf.forEach((name, i) => {
      const b = el('button', { type: 'button', className: 'mg-drug', draggable: true });
      b.style.setProperty('--c', BOX_COL[i % BOX_COL.length]);
      b.appendChild(el('span', { className: 'mg-drug-box' }));
      b.appendChild(el('span', { className: 'mg-drug-n' }, name));
      b.addEventListener('click', () => add(name, b));
      b.addEventListener('dragstart', (e) => { try { e.dataTransfer.setData('text/plain', name); } catch (_) { /* yok */ } });
      grid.appendChild(b);
    });
    bag.addEventListener('dragover', (e) => e.preventDefault());
    bag.addEventListener('drop', (e) => { e.preventDefault(); let n = ''; try { n = e.dataTransfer.getData('text/plain'); } catch (_) { /* yok */ } const b = [...grid.children].find((x) => x.querySelector('.mg-drug-n').textContent === n); if (b) add(n, b); });
    wrap.appendChild(grid); wrap.appendChild(bag);
    cur.card.appendChild(wrap);
    const deliver = el('button', { type: 'button', className: 'dlg-btn sg-big' }, '✓ Poşeti teslim et');
    deliver.disabled = true;
    deliver.addEventListener('click', () => {
      const secs = (performance.now() - t0) / 1000;
      const score = Math.max(20, Math.min(100, 100 - wrong * 15 - Math.max(0, Math.round((secs - 6) * 3))));
      result(score, [`Hazırlama süresi: ${secs.toFixed(1)} sn${wrong ? ` · yanlış seçim: ${wrong}` : ''}`, score >= 70 ? '🙂 Hasta memnun: memnuniyet bonusu (+₺120, sabır +15).' : 'Doğru kullanım bilgisini vermeyi unutmayın.'], onDone, 'Bilgilendirmeye geç');
    });
    cur.card.appendChild(deliver);
  }

  VH.minigames = {
    enabled: !/[?&]nomini\b/.test(location.search),
    flow, lab, defib, pharmacy,
    get active() { return !!cur; },
    close: () => close(true),
  };
})();
