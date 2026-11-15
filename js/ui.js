// Vita Hospital — Arayüz (HUD, kamera düğmeleri, joystick, eylem düğmeleri, diyalog)
(function () {
  const VH = (window.VH = window.VH || {});
  const $ = (id) => document.getElementById(id);

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    Object.assign(n, attrs || {});
    if (text !== undefined) n.textContent = text;
    return n;
  }

  const joy = { x: 0, y: 0, active: false };
  let dialogOpen = false;
  let dialogOnClose = null;
  let actionSig = '';

  VH.ui = {
    joy,

    // ------------------------------------------------------------ Yükleme ekranı
    loaderProgress(done, total) {
      $('loader-fill').style.width = ((done / total) * 100).toFixed(1) + '%';
      $('loader-text').textContent = `Hastane çiziliyor… ${done}/${total}`;
    },
    loaderErrors(paths) {
      const ul = $('loader-errors');
      ul.hidden = false;
      ul.innerHTML = '';
      paths.forEach((p) => ul.appendChild(el('li', {}, p)));
      $('loader-text').textContent = `${paths.length} görsel yüklenemedi:`;
    },
    hideLoader() { $('loader').classList.add('hidden'); },

    // ------------------------------------------------------------ HUD
    showHud(items) {
      const hud = $('hud');
      hud.hidden = false;
      hud.innerHTML = '';
      items.forEach(([id, t]) => hud.appendChild(el('span', { id, className: 'hud-chip' }, t)));
    },
    setChip(id, text) {
      const c = $(id);
      if (c && c.textContent !== text) c.textContent = text;
    },
    setRoomChip(text) {
      let chip = $('room-chip');
      if (!chip) {
        chip = el('span', { id: 'room-chip', className: 'hud-chip' });
        $('hud').appendChild(chip);
      }
      chip.hidden = !text;
      chip.textContent = text || '';
    },

    // ------------------------------------------------------------ Kamera düğmeleri
    buildCameraControls(h) {
      const box = el('div', { id: 'cam-controls' });
      const btn = (id, icon, title, fn) => {
        const b = el('button', { id, className: 'cam-btn', title, type: 'button' }, icon);
        b.setAttribute('aria-label', title);
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); b.blur(); });
        box.appendChild(b);
      };
      btn('btn-rot-l', '⟲', 'Sola döndür (Q)', h.rotL);
      btn('btn-rot-r', '⟳', 'Sağa döndür (R)', h.rotR);
      btn('btn-zoom-in', '＋', 'Yakınlaştır (+)', h.zoomIn);
      btn('btn-zoom-out', '－', 'Uzaklaştır (−)', h.zoomOut);
      btn('btn-follow', '◎', 'Başhekimi takip et (F)', h.follow);
      btn('btn-labels', 'Aa', 'Oda etiketleri (L)', h.labels);
      if (h.panel) btn('btn-panel', '🏗️', 'Yönetim & İnşa Paneli (P)', h.panel);
      if (h.sound) btn('btn-sound', VH.audio && VH.audio.muted ? '🔇' : '🔊', 'Ses aç/kapat (M)', h.sound);
      // Arayüz düğmelerinde hafif tıklama sesi
      $('ui-root').addEventListener('click', (e) => { if (e.target.closest('button') && VH.audio) VH.audio.play('click'); });
      $('ui-root').appendChild(box);
      $('ui-root').appendChild(el('div', { id: 'help-hint' },
        'WASD / Oklar: yürü · Shift: koş · E: etkileşim · Q/R: döndür · F: takip · P: panel · M: ses'));
    },
    setSoundButton(muted) {
      const b = $('btn-sound');
      if (!b) return;
      b.textContent = muted ? '🔇' : '🔊';
      b.classList.toggle('on', !muted);
      b.setAttribute('aria-label', muted ? 'Sesi aç (M)' : 'Sesi kapat (M)');
    },
    setToggle(id, on) {
      const b = $(id);
      if (b) b.classList.toggle('on', !!on);
    },

    // ------------------------------------------------------------ Mobil joystick + eylem düğmeleri
    isTouch() { return document.body.classList.contains('touch'); },

    buildGameControls(onAction) {
      const root = $('ui-root');

      // Joystick (sol alt)
      const zone = el('div', { id: 'joystick' });
      zone.setAttribute('aria-label', 'Sanal joystick');
      const base = el('div', { className: 'joy-base' });
      const knob = el('div', { className: 'joy-knob' });
      base.appendChild(knob);
      zone.appendChild(base);
      root.appendChild(zone);
      let pid = null;
      const R = 52;
      const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
      const move = (e) => {
        const r = base.getBoundingClientRect();
        let dx = e.clientX - (r.left + r.width / 2);
        let dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy);
        if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
        setKnob(dx, dy);
        const m = Math.hypot(dx, dy) / R;
        joy.x = m < 0.15 ? 0 : dx / R;
        joy.y = m < 0.15 ? 0 : dy / R;
      };
      zone.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pid = e.pointerId; joy.active = true;
        try { zone.setPointerCapture(pid); } catch (_) { /* etkin olmayan işaretçi */ }
        move(e);
      });
      zone.addEventListener('pointermove', (e) => { if (e.pointerId === pid) move(e); });
      const end = (e) => {
        if (e.pointerId !== pid) return;
        pid = null; joy.active = false; joy.x = joy.y = 0; setKnob(0, 0);
      };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);

      // Eylem düğmeleri (sağ alt — hedefe göre dinamik)
      const actions = el('div', { id: 'actions' });
      root.appendChild(actions);
      actions.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]');
        if (!b) return;
        e.stopPropagation();
        onAction(+b.dataset.i);
        b.blur();
      });

      // Dokunmatik algılama
      const markTouch = () => document.body.classList.add('touch');
      if (window.matchMedia && matchMedia('(pointer: coarse)').matches) markTouch();
      window.addEventListener('touchstart', markTouch, { once: true, passive: true });
    },

    /** targets: [{action, name, icon}] — değişmediyse DOM'a dokunmaz. */
    setActions(targets) {
      const sig = targets.map((t) => t.action + '|' + t.name).join(';') + (dialogOpen ? '#d' : '');
      if (sig === actionSig) return;
      actionSig = sig;
      const box = $('actions');
      box.innerHTML = '';
      if (dialogOpen) return;
      targets.slice(0, 3).forEach((t, i) => {
        const b = el('button', { type: 'button', className: 'act-btn' + (i === 0 ? ' primary' : '') });
        b.dataset.i = i;
        if (i === 0) b.appendChild(el('kbd', {}, 'E'));
        b.appendChild(el('span', { className: 'act-label' }, t.action));
        b.appendChild(el('span', { className: 'act-sub' }, t.name));
        box.appendChild(b);
      });
    },

    // ------------------------------------------------------------ Diyalog
    isDialogOpen() { return dialogOpen; },
    openDialog(spec) {
      VH.ui.closeDialog(true);
      const box = el('div', { id: 'dialog', role: 'dialog', className: spec.wide ? 'wide' : '' });
      const head = el('div', { className: 'dlg-head' });
      head.appendChild(el('div', { className: 'dlg-icon' }, spec.icon || '💬'));
      const tt = el('div', { className: 'dlg-titles' });
      tt.appendChild(el('div', { className: 'dlg-title' }, spec.title));
      if (spec.subtitle) tt.appendChild(el('div', { className: 'dlg-sub' }, spec.subtitle));
      head.appendChild(tt);
      const close = el('button', { className: 'dlg-close', type: 'button', title: 'Kapat (Esc)' }, '✕');
      close.addEventListener('click', () => VH.ui.closeDialog());
      head.appendChild(close);
      box.appendChild(head);
      if (spec.node) {
        const body = el('div', { className: 'dlg-body' });
        body.appendChild(spec.node);
        box.appendChild(body);
      } else box.appendChild(el('div', { className: 'dlg-text' }, spec.text || ''));
      const acts = el('div', { className: 'dlg-actions' });
      (spec.actions || [{ label: 'Tamam' }]).forEach((a) => {
        const b = el('button', { type: 'button', className: 'dlg-btn' + (a.ghost ? ' ghost' : '') }, a.label);
        if (a.disabled) { b.disabled = true; if (a.title) b.title = a.title; }
        b.addEventListener('click', () => { if (a.fn) a.fn(); else VH.ui.closeDialog(); });
        acts.appendChild(b);
      });
      box.appendChild(acts);
      $('ui-root').appendChild(box);
      if (spec.scrollTop) { const b = box.querySelector('.dlg-body'); if (b) b.scrollTop = spec.scrollTop; }
      dialogOpen = true;
      dialogOnClose = spec.onClose || null;
      actionSig = '';
    },
    /** silent: başka diyalog açılırken (onClose tetiklenmez). */
    closeDialog(silent) {
      const d = $('dialog');
      if (d) d.remove();
      dialogOpen = false;
      const cb = dialogOnClose;
      dialogOnClose = null;
      if (!silent && cb) cb();
      actionSig = '';
    },

    el,

    /**
     * Aktif Vaka Akış Şeması paneli. model: guide.js akışı; flows: sekmeler; onTab(id).
     * DOM yalnızca yapı değişince yeniden kurulur; süre/bar her karede güncellenir.
     */
    setFlow(model, flows, onTab) {
      let box = $('flow');
      if (!box) {
        box = el('div', { id: 'flow', role: 'region' });
        box.setAttribute('aria-label', 'Aktif Vaka Akış Şeması');
        box.addEventListener('click', (e) => {
          const t = e.target.closest('[data-tab]');
          if (t && box._onTab) box._onTab(t.dataset.tab);
          if (e.target.closest('[data-file]') && VH.cases) VH.cases.openCaseFile();
          if (e.target.closest('[data-min]')) { box.classList.toggle('min'); }
        });
        $('ui-root').appendChild(box);
      }
      box._onTab = onTab;
      const hud = $('hud');
      if (hud) { const top = hud.getBoundingClientRect().bottom + 8; if (box._top !== top) { box._top = top; box.style.top = top + 'px'; } }
      const sig = model ? [model.id, model.title, model.patient, model.instruction, model.steps.map((s) => s.state).join(''), flows.map((f) => f.id).join()].join('|') : 'idle';
      if (box._sig !== sig) {
        box._sig = sig;
        box.innerHTML = '';
        const head = el('div', { className: 'flow-head' });
        head.appendChild(el('span', { className: 'flow-kicker' }, 'Aktif Vaka Akış Şeması'));
        const tabs = el('span', { className: 'flow-tabs' });
        if (model && flows.length > 1) flows.forEach((f) => {
          const b = el('button', { type: 'button', className: 'flow-tab' + (f.id === model.id ? ' on' : '') }, f.tab);
          b.dataset.tab = f.id;
          tabs.appendChild(b);
        });
        head.appendChild(tabs);
        const mn = el('button', { type: 'button', className: 'flow-min', title: 'Küçült/Büyüt' }, '▾');
        mn.dataset.min = '1';
        head.appendChild(mn);
        box.appendChild(head);
        if (!model) {
          box.classList.add('idle');
          box.appendChild(el('div', { className: 'flow-instr' }, '✓ Bekleyen acil vaka yok. Sıradaki ★ vaka hastası ya da ambulans yolda; bu arada eczane ve bekleme salonunu kontrol edin.'));
        } else {
          box.classList.remove('idle');
          box.classList.toggle('urgent', !!model.urgent);
          const pt = el('div', { className: 'flow-patient' });
          pt.appendChild(el('strong', {}, model.title));
          pt.appendChild(el('span', {}, ' · ' + model.patient));
          const tm = el('span', { className: 'flow-timer' });
          pt.appendChild(tm);
          box.appendChild(pt);
          const steps = el('ol', { className: 'flow-steps' });
          model.steps.forEach((s, i) => {
            const li = el('li', { className: 'fs ' + s.state });
            li.appendChild(el('span', { className: 'fs-n' }, s.state === 'done' ? '✓' : String(i + 1)));
            li.appendChild(el('span', { className: 'fs-l' }, s.label));
            steps.appendChild(li);
            if (i < model.steps.length - 1) steps.appendChild(el('li', { className: 'fs-arrow', ariaHidden: 'true' }, '➔'));
          });
          box.appendChild(steps);
          const ins = el('div', { className: 'flow-instr' });
          ins.appendChild(el('span', { className: 'fi-icon' }, '👉'));
          ins.appendChild(el('span', {}, model.instruction));
          if (model.id === 'case') { const fb = el('button', { type: 'button', className: 'flow-link' }, 'Vaka dosyası'); fb.dataset.file = '1'; ins.appendChild(fb); }
          box.appendChild(ins);
          const bar = el('div', { className: 'flow-bar' });
          bar.appendChild(el('div', { className: 'flow-bar-fill' }));
          box.appendChild(bar);
        }
      }
      if (model) {
        const tm = box.querySelector('.flow-timer');
        if (tm) tm.textContent = model.timer ? ' · ⏱ ' + model.timer : '';
        const fill = box.querySelector('.flow-bar-fill');
        if (fill) {
          const v = model.bar === null || model.bar === undefined ? null : Math.max(0, Math.min(1, model.bar));
          fill.parentNode.hidden = v === null;
          if (v !== null) { fill.style.width = (v * 100).toFixed(1) + '%'; fill.style.background = v > 0.6 ? '#46c46a' : v > 0.3 ? '#f2c94c' : '#ff5a5f'; }
        }
      }
    },

    /** Kombo rozeti (streak 0 → gizli). */
    setCombo(mult, frac, streak) {
      const c = $('chip-combo');
      if (!c) return;
      c.hidden = !streak;
      if (!streak) return;
      const text = mult > 1 ? `🔥 Kombo x${mult}` : '🔥 Kombo başladı';
      if (c.firstChild && c.firstChild.nodeType === 3 && c.firstChild.nodeValue === text) { /* aynı */ } else { c.textContent = text; c.appendChild(el('span', { className: 'combo-bar' })); }
      const b = c.querySelector('.combo-bar');
      if (b) b.style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
      c.classList.toggle('hot', mult > 1);
    },

    /** Acil durum çipi (boş metin → gizli). */
    setAlert(text) {
      let c = $('chip-er');
      if (!c) {
        c = el('span', { id: 'chip-er', className: 'hud-chip alert-chip' });
        $('hud').insertBefore(c, $('hud').firstChild);
      }
      c.hidden = !text;
      if (c.textContent !== text) c.textContent = text || '';
    },

    /** HUD'daki vaka hedefi çipi (tıklanınca vaka dosyası açılır). */
    setObjective(text, onClick) {
      let c = $('chip-case');
      if (!c) {
        c = el('button', { id: 'chip-case', type: 'button', className: 'hud-chip case-chip' });
        c.addEventListener('click', () => { if (c._fn) c._fn(); });
        $('hud').appendChild(c);
      }
      c._fn = onClick;
      if (c.textContent !== text) c.textContent = text;
    },

    toast(text, ms) {
      let t = $('toast');
      if (!t) { t = el('div', { id: 'toast' }); $('ui-root').appendChild(t); }
      t.textContent = text;
      t.classList.add('show');
      clearTimeout(t._h);
      t._h = setTimeout(() => t.classList.remove('show'), ms || 1800);
    },
  };
})();
