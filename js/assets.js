// Vita Hospital — Asset Preloader
// Manifestteki (js/asset-manifest.js) tüm PNG'leri yükler, kırık yolları raporlar.
// Görsellere kısa anahtarla erişilir: "core/Furniture/hospital_furniture_desk_reception_01"
// veya tam yol "assets/core/Furniture/hospital_furniture_desk_reception_01.png".
(function () {
  const VH = (window.VH = window.VH || {});

  const images = new Map(); // anahtar -> HTMLImageElement
  const failed = [];

  function keyOf(path) {
    return path.replace(/^assets\//, '').replace(/\.png$/i, '');
  }

  function loadOne(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        if (img.naturalWidth === 0) { failed.push(path); resolve(false); return; }
        images.set(keyOf(path), img);
        resolve(true);
      };
      img.onerror = () => { failed.push(path); resolve(false); };
      img.src = encodeURI(path);
    });
  }

  /**
   * Tüm manifesti yükler.
   * @param {(done:number,total:number)=>void} onProgress
   * @returns {Promise<{loaded:number,total:number,failed:string[]}>}
   */
  async function preload(onProgress) {
    const list = window.VH_ASSET_MANIFEST || [];
    let done = 0;
    await Promise.all(list.map((p) => loadOne(p).then(() => {
      done++;
      if (onProgress) onProgress(done, list.length);
    })));
    return { loaded: images.size, total: list.length, failed: failed.slice() };
  }

  /** Görseli anahtar ya da tam yol ile getirir; yoksa null (ve konsola uyarı). */
  function get(name) {
    const k = keyOf(name);
    const img = images.get(k);
    if (!img) console.warn('[VH.assets] eksik görsel:', name);
    return img || null;
  }

  VH.assets = { preload, get, has: (n) => images.has(keyOf(n)), images, failed };
})();
