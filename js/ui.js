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
  let actionSig = '';

  VH.ui = {
    joy,

    // ------------------------------------------------------------ Yükleme ekranı
    loaderProgress(done, total) {
      $('loader-fill').style.width = ((done / total) * 100).toFixed(1) + '%';
      $('loader-text').textContent = `Görseller yükleniyor… ${done}/${total}`;
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
      $('ui-root').appendChild(box);
      $('ui-root').appendChild(el('div', { id: 'help-hint' },
        'WASD / Oklar: yürü · Shift: koş · E: etkileşim · Sürükle: kaydır · Tekerlek: yakınlaştır · Q/R: döndür · F: takip'));
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
      VH.ui.closeDialog();
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
      actionSig = '';
    },
    closeDialog() {
      const d = $('dialog');
      if (d) d.remove();
      dialogOpen = false;
      actionSig = '';
    },

    el,

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
