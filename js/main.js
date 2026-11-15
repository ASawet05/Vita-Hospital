// Vita Hospital — Giriş noktası, oyun döngüsü ve kamera girdileri
(function () {
  const VH = (window.VH = window.VH || {});
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  let vw = 0, vh = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
  }

  // ---------------------------------------------------------------- Asset raporu
  function report(result) {
    const missingRequired = VH.map.REQUIRED.filter((k) => !VH.assets.has(k));
    const missingPlaced = VH.map.OBJECTS.filter((o) => !o.k.startsWith('proc:') && !VH.assets.has(o.k)).map((o) => o.k);
    const summary = {
      ok: result.failed.length === 0 && missingRequired.length === 0 && missingPlaced.length === 0,
      loaded: result.loaded,
      total: result.total,
      failed: result.failed,
      missingRequired,
      missingPlaced,
    };
    VH.assetReport = summary;
    console.log('[VH] Asset raporu', summary);
    return summary;
  }

  function selftest(extra) {
    if (!params.has('selftest')) return;
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = 'VH_SELFTEST ' + JSON.stringify(Object.assign({}, VH.assetReport, extra));
    document.body.appendChild(pre);
  }

  // ---------------------------------------------------------------- Kamera girdileri
  const cam = () => VH.map.camera;
  const pointers = new Map();
  let dragMoved = false, pinchDist = 0;

  function setFollow(on) {
    cam().follow = on;
    VH.ui.setToggle('btn-follow', on);
  }

  function updateHover(px, py) {
    const [ix, iy] = cam().toIso(px, py, vw, vh);
    const [wx, wy] = VH.map.isoToWorld(ix, iy);
    const cx = Math.floor(wx), cy = Math.floor(wy);
    VH.map.hover = { x: cx, y: cy };
    const room = VH.map.roomAt(cx, cy);
    VH.ui.setRoomChip(room ? (room.num ? room.num + ' · ' : '') + room.name : '');
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragMoved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (e.pointerType === 'mouse') updateHover(e.clientX, e.clientY);
      if (!p) return;
      if (pointers.size === 1) {
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        if (dragMoved || Math.abs(dx) + Math.abs(dy) > 4) {
          dragMoved = true;
          cam().pan(dx, dy);
          setFollow(false);
          p.x = e.clientX; p.y = e.clientY;
        }
      } else if (pointers.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) cam().zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2, vw, vh);
        pinchDist = d;
      }
    });
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { VH.map.hover = null; VH.ui.setRoomChip(''); } });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      cam().zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY, vw, vh);
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      switch (e.key.toLowerCase()) {
        case 'q': VH.map.rotate(-1); break;
        case 'r': VH.map.rotate(1); break;
        case '+': case '=': cam().zoomAt(1.2, vw / 2, vh / 2, vw, vh); break;
        case '-': case '_': cam().zoomAt(1 / 1.2, vw / 2, vh / 2, vw, vh); break;
        case 'f': setFollow(!cam().follow); break;
        case 'l': toggleLabels(); break;
        default: return;
      }
    });
  }

  function toggleLabels() {
    VH.map.labels = !VH.map.labels;
    VH.ui.setToggle('btn-labels', VH.map.labels);
  }

  // ---------------------------------------------------------------- Döngü
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    VH.entities.update(dt);
    cam().update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    VH.map.draw(ctx, vw, vh, VH.entities.drawables(VH.map));
    requestAnimationFrame(frame);
  }

  async function boot() {
    resize();
    window.addEventListener('resize', resize);
    const result = await VH.assets.preload(VH.ui.loaderProgress);
    const summary = report(result);
    if (!summary.ok) {
      VH.ui.loaderErrors(summary.failed.concat(summary.missingRequired, summary.missingPlaced).map((k) => 'eksik: ' + k));
      selftest();
      return;
    }

    VH.map.init();
    VH.entities.init();
    const c = cam();
    c.target = VH.entities.player;

    // Hata ayıklama / test parametreleri: ?rot=1&zoom=0.6&x=15&y=11&follow=0&labels=0
    if (params.has('rot')) VH.map.setRotation(+params.get('rot'));
    if (params.has('zoom')) c.zoom = +params.get('zoom');
    if (params.has('x') && params.has('y')) { c.follow = false; c.centerOnWorld(+params.get('x'), +params.get('y')); }
    else c.centerOnWorld(c.target.x, c.target.y);
    if (params.get('follow') === '0') c.follow = false;
    if (params.get('labels') === '0') VH.map.labels = false;

    VH.ui.hideLoader();
    VH.ui.showHud(['✚ Vita Hospital', 'Bütçe: ₺50.000', 'İtibar: ★ 50']);
    VH.ui.buildCameraControls({
      rotL: () => VH.map.rotate(-1),
      rotR: () => VH.map.rotate(1),
      zoomIn: () => c.zoomAt(1.25, vw / 2, vh / 2, vw, vh),
      zoomOut: () => c.zoomAt(1 / 1.25, vw / 2, vh / 2, vw, vh),
      follow: () => setFollow(!c.follow),
      labels: toggleLabels,
    });
    VH.ui.setToggle('btn-follow', c.follow);
    VH.ui.setToggle('btn-labels', VH.map.labels);
    bindInput();
    selftest({ map: VH.map.stats(), rot: VH.map.rot, viewport: [vw, vh] });
    requestAnimationFrame(frame);
  }

  boot().catch((err) => {
    console.error(err);
    const pre = document.createElement('pre');
    pre.id = 'selftest';
    pre.textContent = 'VH_SELFTEST_ERROR ' + (err && err.stack || err);
    document.body.appendChild(pre);
  });
})();
