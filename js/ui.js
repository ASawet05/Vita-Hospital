// Vita Hospital — Arayüz (HUD, paneller, mobil kontroller)
(function () {
  const VH = (window.VH = window.VH || {});
  const $ = (id) => document.getElementById(id);

  VH.ui = {
    loaderProgress(done, total) {
      $('loader-fill').style.width = ((done / total) * 100).toFixed(1) + '%';
      $('loader-text').textContent = `Görseller yükleniyor… ${done}/${total}`;
    },
    loaderErrors(paths) {
      const ul = $('loader-errors');
      ul.hidden = false;
      ul.innerHTML = '';
      paths.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        ul.appendChild(li);
      });
      $('loader-text').textContent = `${paths.length} görsel yüklenemedi:`;
    },
    hideLoader() { $('loader').classList.add('hidden'); },
    showHud(items) {
      const hud = $('hud');
      hud.hidden = false;
      hud.innerHTML = '';
      items.forEach((t) => {
        const s = document.createElement('span');
        s.className = 'hud-chip';
        s.textContent = t;
        hud.appendChild(s);
      });
    },
  };
})();
