// Vita Hospital — Arayüz (HUD, paneller, kamera kontrolleri)
(function () {
  const VH = (window.VH = window.VH || {});
  const $ = (id) => document.getElementById(id);

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    Object.assign(n, attrs || {});
    if (text !== undefined) n.textContent = text;
    return n;
  }

  VH.ui = {
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

    showHud(items) {
      const hud = $('hud');
      hud.hidden = false;
      hud.innerHTML = '';
      items.forEach((t) => hud.appendChild(el('span', { className: 'hud-chip' }, t)));
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

    /**
     * Kamera kontrol düğmeleri (sağ üst).
     * @param {{rotL:Function,rotR:Function,zoomIn:Function,zoomOut:Function,follow:Function,labels:Function}} h
     */
    buildCameraControls(h) {
      const box = el('div', { id: 'cam-controls' });
      const btn = (id, icon, title, fn) => {
        const b = el('button', { id, className: 'cam-btn', title, type: 'button' }, icon);
        b.setAttribute('aria-label', title);
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        box.appendChild(b);
        return b;
      };
      btn('btn-rot-l', '⟲', 'Sola döndür (Q)', h.rotL);
      btn('btn-rot-r', '⟳', 'Sağa döndür (R)', h.rotR);
      btn('btn-zoom-in', '＋', 'Yakınlaştır (+)', h.zoomIn);
      btn('btn-zoom-out', '－', 'Uzaklaştır (−)', h.zoomOut);
      btn('btn-follow', '◎', 'Başhekimi takip et (F)', h.follow);
      btn('btn-labels', 'Aa', 'Oda etiketleri (L)', h.labels);
      $('ui-root').appendChild(box);

      const help = el('div', { id: 'help-hint' },
        'Sürükle: kaydır · Tekerlek / iki parmak: yakınlaştır · Q/R: döndür · F: takip · L: etiketler');
      $('ui-root').appendChild(help);
    },
    setToggle(id, on) {
      const b = $(id);
      if (b) b.classList.toggle('on', !!on);
    },
  };
})();
