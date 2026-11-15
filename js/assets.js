// Vita Hospital — Görsel hazırlayıcı
// Oyunda harici görsel dosyası yoktur: tüm zemin, duvar, eşya ve karakterler js/art.js,
// js/map.js ve js/entities.js içinde kodla (HTML5 Canvas) çizilir. Bu modül yalnızca
// açılış ekranının ilerleme çubuğunu besler ve çizim kitinin hazır olduğunu doğrular.
(function () {
  const VH = (window.VH = window.VH || {});

  async function preload(onProgress) {
    const steps = ['Çizim kiti', 'Zemin dokuları', 'Duvar stilleri', 'Karakterler'];
    for (let i = 0; i < steps.length; i++) {
      if (onProgress) onProgress(i + 1, steps.length);
      await new Promise((r) => setTimeout(r, 0));
    }
    const kinds = VH.art ? VH.art.KINDS.length : 0;
    return { loaded: kinds, total: kinds, failed: VH.art ? [] : ['js/art.js yüklenemedi'] };
  }

  VH.assets = { preload, procedural: true };
})();
