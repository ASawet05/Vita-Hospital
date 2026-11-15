// Vita Hospital — Giriş noktası, oyun döngüsü ve girdiler
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
    const missingPlaced = VH.map.allObjects().filter((o) => !o.k.startsWith('proc:') && !VH.assets.has(o.k)).map((o) => o.k);
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

  // ---------------------------------------------------------------- Durum
  const cam = () => VH.map.camera;
  const pointers = new Map();
  const keys = new Set();
  let dragMoved = false, pinchDist = 0;
  let targets = [];

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

  function doInteract(t) {
    if (!t) return;
    VH.entities.interact(t);
  }

  function clickAt(px, py) {
    if (VH.ui.isDialogOpen()) return;
    const t = VH.entities.hitTest(px, py, vw, vh);
    if (!t) return;
    if (VH.entities.inRange(t)) doInteract(t);
    else VH.ui.toast(`${t.name}: etkileşim için yaklaşın`);
  }

  // ---------------------------------------------------------------- Girdiler
  const MOVE_KEYS = {
    w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
    a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
  };

  function readMoveInput() {
    let x = 0, y = 0;
    keys.forEach((k) => { const v = MOVE_KEYS[k]; if (v) { x += v[0]; y += v[1]; } });
    const kl = Math.hypot(x, y);
    if (kl > 0) { x /= kl; y /= kl; }
    if (VH.ui.joy.active) { x = VH.ui.joy.x; y = VH.ui.joy.y; }
    const inp = VH.entities.input;
    inp.x = x; inp.y = y;
    inp.run = keys.has('shift');
    if ((x || y) && !cam().follow) setFollow(true);
  }

  function bindInput() {
    canvas.addEventListener('pointerdown', (e) => {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* etkin olmayan işaretçi */ }
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
        if (dragMoved || Math.abs(dx) + Math.abs(dy) > 6) {
          dragMoved = true;
          cam().pan(dx, dy);
          setFollow(false);
          p.x = e.clientX; p.y = e.clientY;
        }
      } else if (pointers.size === 2) {
        dragMoved = true;
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) cam().zoomAt(d / pinchDist, (a.x + b.x) / 2, (a.y + b.y) / 2, vw, vh);
        pinchDist = d;
      }
    });
    const up = (e) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (e.type === 'pointerup' && wasSingle && !dragMoved) clickAt(e.clientX, e.clientY);
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
      const k = e.key.toLowerCase();
      if (MOVE_KEYS[k] || k === 'shift') {
        keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();
        return;
      }
      if (e.repeat) return;
      switch (k) {
        case 'e': case 'enter': case ' ':
          e.preventDefault();
          if (VH.ui.isDialogOpen()) VH.ui.closeDialog(); else doInteract(targets[0]);
          break;
        case 'escape': VH.ui.closeDialog(); break;
        case 'q': VH.map.rotate(-1); break;
        case 'r': VH.map.rotate(1); break;
        case '+': case '=': cam().zoomAt(1.2, vw / 2, vh / 2, vw, vh); break;
        case '-': case '_': cam().zoomAt(1 / 1.2, vw / 2, vh / 2, vw, vh); break;
        case 'f': setFollow(!cam().follow); break;
        case 'l': toggleLabels(); break;
        case 'p': VH.hospital.openPanel(); break;
        default: break;
      }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => keys.clear());
  }

  function toggleLabels() {
    VH.map.labels = !VH.map.labels;
    VH.ui.setToggle('btn-labels', VH.map.labels);
  }

  // ---------------------------------------------------------------- Döngü
  let last = performance.now();
  let hudTimer = 0;
  function updateHud() {
    const E = VH.entities;
    const waiting = E.patients.filter((p) => p.state === 'waiting').length;
    const S = VH.cases.state;
    VH.ui.setChip('chip-budget', `💰 ₺${Math.round(S.budget).toLocaleString('tr-TR')}`);
    VH.ui.setChip('chip-rep', `★ İtibar ${S.reputation}`);
    VH.ui.setChip('chip-safety', `🛡️ Güvenlik ${S.safety}`);
    VH.ui.setChip('chip-patients', `Hastalar: ${E.patients.length} · Bekleyen: ${waiting}`);
    VH.ui.setChip('chip-served', `Taburcu: ${E.stats.served}`);
    const room = VH.map.roomAt(E.player.x, E.player.y);
    const fl = VH.map.floor ? VH.map.floorName().split(' · ')[0] + ' · ' : '';
    VH.ui.setChip('chip-where', '📍 ' + fl + (room ? room.name : 'Hastane bahçesi'));
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    readMoveInput();
    VH.entities.update(dt);
    VH.cases.update(dt);
    VH.hospital.update(dt);
    cam().update(dt);
    targets = VH.ui.isDialogOpen() ? [] : VH.entities.nearbyTargets();
    VH.ui.setActions(targets);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    VH.map.draw(ctx, vw, vh, VH.entities.drawables(VH.map).concat(VH.hospital.drawables(VH.map)));
    VH.entities.drawOverlay(ctx, vw, vh, targets[0], VH.ui.isTouch());
    VH.hospital.drawOverlay(ctx, vw, vh);
    hudTimer -= dt;
    if (hudTimer <= 0) { hudTimer = 0.25; updateHud(); }
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
    VH.hospital.init();
    const c = cam();
    c.target = VH.entities.player;

    // Hata ayıklama / test parametreleri: ?rot=1&zoom=0.6&x=15&y=11&follow=0&labels=0
    if (params.has('rot')) VH.map.setRotation(+params.get('rot'));
    if (params.has('zoom')) c.zoom = +params.get('zoom');
    if (params.has('px') && params.has('py')) { VH.entities.player.x = +params.get('px'); VH.entities.player.y = +params.get('py'); }
    if (params.has('x') && params.has('y')) { c.follow = false; c.centerOnWorld(+params.get('x'), +params.get('y')); }
    else c.centerOnWorld(c.target.x, c.target.y);
    if (params.get('follow') === '0') c.follow = false;
    if (params.get('labels') === '0') VH.map.labels = false;
    if (params.has('touch')) document.body.classList.add('touch');

    VH.ui.hideLoader();
    VH.ui.showHud([
      ['chip-brand', '✚ Vita Hospital'],
      ['chip-budget', ''],
      ['chip-rep', ''],
      ['chip-safety', ''],
      ['chip-patients', ''],
      ['chip-served', ''],
      ['chip-where', ''],
    ]);
    VH.ui.buildCameraControls({
      rotL: () => VH.map.rotate(-1),
      rotR: () => VH.map.rotate(1),
      zoomIn: () => c.zoomAt(1.25, vw / 2, vh / 2, vw, vh),
      zoomOut: () => c.zoomAt(1 / 1.25, vw / 2, vh / 2, vw, vh),
      follow: () => setFollow(!c.follow),
      labels: toggleLabels,
      panel: () => VH.hospital.openPanel(),
    });
    VH.ui.buildGameControls((i) => doInteract(targets[i]));
    VH.ui.setToggle('btn-follow', c.follow);
    VH.ui.setToggle('btn-labels', VH.map.labels);
    bindInput();
    updateHud();
    selftest({ map: VH.map.stats(), rot: VH.map.rot, viewport: [vw, vh], cases: VH.cases.CASES.length });
    if (!params.has('nointro') && !params.has('selftest')) VH.cases.start();
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
