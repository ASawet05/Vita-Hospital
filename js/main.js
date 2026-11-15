// Vita Hospital — Giriş noktası ve oyun döngüsü
(function () {
  const VH = (window.VH = window.VH || {});
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  // Asset doğrulama sonucu (?selftest ile sayfaya da yazılır)
  function report(result) {
    const missingRequired = VH.map.REQUIRED.filter((k) => !VH.assets.has(k));
    const ok = result.failed.length === 0 && missingRequired.length === 0;
    const summary = {
      ok,
      loaded: result.loaded,
      total: result.total,
      failed: result.failed,
      missingRequired,
    };
    VH.assetReport = summary;
    console.log('[VH] Asset raporu', summary);
    if (/[?&]selftest\b/.test(location.search)) {
      const pre = document.createElement('pre');
      pre.id = 'selftest';
      pre.textContent = 'VH_SELFTEST ' + JSON.stringify(summary);
      document.body.appendChild(pre);
    }
    return summary;
  }

  function drawPlaceholder() {
    const w = window.innerWidth, h = window.innerHeight;
    ctx.fillStyle = '#0f2a3a';
    ctx.fillRect(0, 0, w, h);
    // Yükleme testini görsel olarak doğrulamak için birkaç sprite çiz
    const demo = [
      'core/Furniture/hospital_furniture_desk_reception_01',
      'ward/hospital_bed',
      'lab/hematology_analyzer',
    ];
    let x = w / 2 - 180;
    demo.forEach((k) => {
      const img = VH.assets.get(k);
      if (!img) return;
      const s = 96 / Math.max(img.width, img.height);
      ctx.drawImage(img, x, h / 2 - 48, img.width * s, img.height * s);
      x += 130;
    });
    ctx.fillStyle = '#9bb7c4';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('İskelet hazır — harita motoru Aşama 2\'de gelecek.', w / 2, h / 2 + 90);
  }

  async function boot() {
    resize();
    window.addEventListener('resize', () => { resize(); drawPlaceholder(); });
    const result = await VH.assets.preload(VH.ui.loaderProgress);
    const summary = report(result);
    if (!summary.ok) {
      VH.ui.loaderErrors(summary.failed.concat(summary.missingRequired.map((k) => 'eksik: ' + k)));
      return;
    }
    VH.ui.hideLoader();
    VH.ui.showHud([`Görseller: ${summary.loaded}/${summary.total} ✓`]);
    drawPlaceholder();
  }

  boot();
})();
