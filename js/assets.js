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

  // ---------------------------------------------------------------- Olay yolu (modüller arası)
  // Oyun olayları (taburcu, acil başarı, kombo, alım...) buradan yayınlanır; görevler,
  // başarımlar ve personel deneyimi gibi modüller birbirini doğrudan çağırmadan dinler.
  const listeners = {};
  VH.on = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };
  VH.emit = (name, data) => {
    (listeners[name] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error('[VH.emit]', name, e); } });
  };
  // Etkileşim zinciri ve ek hedef sağlayıcılar (temizlik, düzenleme modu vb.)
  VH.interactHandlers = VH.interactHandlers || [];
  VH.targetProviders = VH.targetProviders || [];
  // Yönetim paneline modüllerin eklediği sekmeler: { id, label, order, render(list, rerender) }
  VH.panelTabs = VH.panelTabs || [];
})();
