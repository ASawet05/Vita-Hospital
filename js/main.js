// Vita Hospital — Giriş noktası, oyun döngüsü ve girdiler
(function () {
  const VH = (window.VH = window.VH || {});
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const params = new URLSearchParams(location.search);
  let vw = 0, vh = 0, dpr = 1;

  function resize() {
    // Yüksek çözünürlüklü ekranlarda GPU yükünü sınırla
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    if (VH.map) VH.map.pixelRatio = dpr;
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
  }

  // ---------------------------------------------------------------- Asset raporu
  function report(result) {
    const missingKinds = VH.map.missingKinds();
    const summary = {
      ok: result.failed.length === 0 && missingKinds.length === 0,
      procedural: true,
      kinds: result.total,
      failed: result.failed,
      missingKinds,
    };
    VH.assetReport = summary;
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
  let stepPhase = 0, lastCell = null;

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
    VH.ui.setRoomChip(room ? (room.label || room.name) : '');
  }

  function doInteract(t) {
    if (!t) return;
    // Kilitli kat önizlemesi: yalnızca asansör kullanılabilir
    const pf = VH.entities.player.floor;
    if (VH.hospital.floorOpen && !VH.hospital.floorOpen(pf) && !(t.type === "device" && t.ref && t.ref.tag === "elevator")) {
      VH.ui.toast("🔒 Bu kat henüz inşa edilmedi · şartlar için asansöre dönün", 2200); return;
    }
    VH.entities.interact(t);
  }

  function clickAt(px, py) {
    if (VH.ui.isDialogOpen()) return;
    if (VH.build && VH.build.active) { VH.build.click(px, py, vw, vh); return; }
    const t = VH.entities.hitTest(px, py, vw, vh);
    if (!t) return;
    if (t.type === 'patient') VH.guide.selectPatient(t.ref);
    if (VH.entities.inRange(t)) doInteract(t);
    else VH.ui.toast(`${t.name}: etkileşim için yaklaşın`);
  }

  // ---------------------------------------------------------------- Girdiler
  const MOVE_KEYS = {
    w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1],
    a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
  };

  const AUTO_ZOOM = 1.05;
  let wasMoving = false;
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
    // Yürümeye başlayınca otomatik yakınlaşma: uzaklaştırılmış kamera ~0,35 sn içinde oynanış yakınlığına (1,05) döner
    if ((x || y) && !wasMoving) {
      const c = cam();
      if (c.zoom < AUTO_ZOOM * 0.97 && !VH.build.active) { c.base = AUTO_ZOOM; c.focusF = 1; c.glide(AUTO_ZOOM, 9); lastRoomKey = ""; }
    }
    wasMoving = !!(x || y);
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
      if (VH.build && VH.build.active) VH.build.hover(e.clientX, e.clientY, vw, vh);
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
      if (VH.os && VH.os.isOpen()) { if (k === 'escape') VH.os.close(); return; }
      if (MOVE_KEYS[k] || k === 'shift') {
        keys.add(k);
        if (k.startsWith('arrow')) e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (VH.build && VH.build.active) {
        if (k === 't') { VH.build.rotate(); return; }
        if (k === 'escape') { VH.build.cancel(); return; }
        if (k === 'delete' || k === 'backspace') { VH.build.sell(); return; }
      }
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
        case 'p': VH.terminal.open(); break;
        case 'k': VH.terminal.open('kadro'); break;
        case 'g': VH.terminal.open('gorevler'); break;
        case 'b': if (VH.build.active) VH.build.exit(); else VH.build.enter(); break;
        case 'm': toggleSound(); break;
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

  function toggleSound() {
    VH.audio.unlock();
    const m = VH.audio.toggle();
    VH.ui.setSoundButton(m);
    VH.ui.toast(m ? '🔇 Ses kapalı' : '🔊 Ses açık', 1400);
  }

  /** Adım sesi (yürüme animasyonuna bağlı) ve kapı eşiğinden geçince kapı sesi. */
  function footstepsAndDoors() {
    const P = VH.entities.player;
    if (P.moving) {
      const ph = Math.floor(P.anim / Math.PI);
      if (ph !== stepPhase) { stepPhase = ph; VH.audio.play('step'); }
    }
    const cx = Math.floor(P.x), cy = Math.floor(P.y);
    if (lastCell && lastCell.f === P.floor && (lastCell.x !== cx || lastCell.y !== cy)) {
      const w = VH.map.edgeBetween(lastCell.x, lastCell.y, cx, cy);
      if (w && w.type === 'door') VH.audio.play('door');
    }
    lastCell = { x: cx, y: cy, f: P.floor };
  }

  // ---------------------------------------------------------------- Oda odak kamerası ve yazı boyutu
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* yoksay */ } };
  const load = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  let focusCam = load('vh.focusCam') !== '0';
  let textSize = +(load('vh.textSize') || 1) % 3;
  function applyTextSize() { document.body.classList.remove('ts-0', 'ts-1', 'ts-2'); document.body.classList.add('ts-' + textSize); }
  // Ameliyathane, Başhekimlik, eczane gibi odalara girince kamera yumuşakça yakınlaşır, çıkınca geri döner
  const FOCUS = new Set(['office', 'pharmacy', 'exam1', 'exam2', 'lab', 'or1', 'recovery', 'scrub', 'peds', 'nurse', 'xray', 'us', 'ecg', 'report', 'kitchen', 'dialysis', 'surgclin', 'cafe', 'sterile']);
  let lastRoomKey = '', focusRoom = null, dimA = 0;
  // Odaklanılan odanın dışını hafifçe karartır (oda zemini + duvar yüksekliği kadar dışbükey zarf)
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function drawFocusDim(dt) {
    const want = focusCam && focusRoom && cam().follow ? 1 : 0;
    dimA += Math.sign(want - dimA) * Math.min(Math.abs(want - dimA), dt * 2.5);
    if (dimA < 0.01 || !focusRoom || !VH.map.ROOMS[focusRoom]) return;
    const [x0, y0, x1, y1] = VH.map.ROOMS[focusRoom].r;
    const base = [[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]].map(([x, y]) => VH.map.worldToIso(x, y));
    const poly = hull(base.concat(base.map(([x, y]) => [x, y - 70])));
    const c = cam();
    ctx.save();
    ctx.translate(vw / 2, vh / 2); ctx.scale(c.zoom, c.zoom); ctx.translate(-c.x, -c.y);
    const [l, t] = c.toIso(0, 0, vw, vh), [r, b] = c.toIso(vw, vh, vw, vh);
    ctx.beginPath(); ctx.rect(l - 10, t - 10, r - l + 20, b - t + 20);
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = `rgba(6,16,26,${0.38 * dimA})`;
    ctx.fill('evenodd');
    ctx.restore();
  }
  // Kilitli kat önizlemesi: tüm sahne gri tonlu (monokrom) + kilit rozeti ve açılış şartları.
  // Kat inşa edildiği anda gri ton yumuşakça çekilir ve kat renklenir.
  let lockFade = 0;
  function drawLockedFloor(dt) {
    const H = VH.hospital, f = VH.map.floor;
    const locked = !!(H.floorOpen && !H.floorOpen(f));
    lockFade += Math.sign((locked ? 1 : 0) - lockFade) * Math.min(Math.abs((locked ? 1 : 0) - lockFade), dt * (locked ? 4 : 0.9));
    if (lockFade < 0.01) return;
    ctx.save();
    ctx.globalAlpha = lockFade;
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(12,18,26,0.28)'; ctx.fillRect(0, 0, vw, vh);
    ctx.restore();
    if (!locked) return;
    const sv = H.serviceOfFloor(f);
    if (!sv) return;
    const reqs = H.reqList(sv);
    const w = Math.min(340, vw - 32), h = 70 + reqs.length * 21;
    const x = (vw - w) / 2, y = Math.max(110, vh - h - (vw < 700 ? 240 : 130)); // alt bölümde; mobilde joystick üstünde
    ctx.save();
    ctx.fillStyle = 'rgba(14,22,30,0.9)'; ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, 14); else ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd166'; ctx.font = '800 15px system-ui,sans-serif';
    ctx.fillText('🔒 ' + VH.map.floorName(f), vw / 2, y + 20);
    ctx.fillStyle = '#c9d6de'; ctx.font = '500 11.5px system-ui,sans-serif';
    ctx.fillText('Önizleme · Başhekim bilgisayarından inşa edin', vw / 2, y + 40);
    ctx.textAlign = 'left'; ctx.font = '600 12.5px system-ui,sans-serif';
    reqs.forEach((r, i) => {
      const ly = y + 62 + i * 21;
      ctx.fillStyle = r.ok ? '#46c46a' : '#ff6b6b';
      ctx.fillText((r.ok ? '✓ ' : '✗ ') + r.label, x + 18, ly);
      ctx.textAlign = 'right'; ctx.fillStyle = '#eef4f7';
      ctx.fillText(r.have + ' / ' + r.need, x + w - 18, ly);
      ctx.textAlign = 'left';
    });
    ctx.restore();
  }
  function updateFocus() {
    const c = cam(), P = VH.entities.player;
    if (!focusCam || !c.follow) return;
    const room = VH.map.roomIdAt(P.x, P.y);
    const key = VH.map.floor + ':' + room;
    if (key === lastRoomKey) return;
    lastRoomKey = key;
    const f = FOCUS.has(room) ? 1.45 : 1;
    c.focusF = f;
    focusRoom = f > 1 ? room : null;
    c.glide(Math.min(2.8, (c.base || 1.2) * f));
  }

  // ---------------------------------------------------------------- Döngü
  let last = performance.now();
  let hudTimer = 0;
  function updateHud() {
    const E = VH.entities;
    const waiting = E.patients.filter((p) => p.state === 'waiting').length;
    const S = VH.cases.state;
    VH.ui.setChip('chip-budget', `💰 ₺${Math.round(S.budget).toLocaleString('tr-TR')}`);
    VH.ui.setChip('chip-rep', `💎 ${S.reputation}`);
    const en = Math.round(VH.floors.energy);
    VH.ui.setChip('chip-energy', `${en < 30 ? '🥱' : '⚡'} %${en}`);
    const ce = document.getElementById('chip-energy'); if (ce) ce.classList.toggle('low', en < 30);
    VH.ui.setChip('chip-safety', `🛡️ Güvenlik ${S.safety}`);
    VH.ui.setChip('chip-level', `🏥 Sv. ${VH.hospital.level()}`);
    VH.map.facadeTier = Object.keys(S.services || {}).filter((k) => S.services[k]).length;
    VH.progress.hud();
    VH.ui.tickerSync();
    const sh = VH.hospital.shift, ss = Math.max(0, Math.ceil(sh.t));
    VH.ui.setChip('chip-shift', `${VH.hospital.isNightShift ? '🌙' : '☀️'} Nöbet ${sh.n} · ${Math.floor(ss / 60)}:${String(ss % 60).padStart(2, '0')}`);
    const cb = VH.hospital.combo;
    VH.ui.setCombo(cb.mult, cb.streak ? (cb.until - VH.hospital.gameTime) / 75 : 0, cb.streak);
    VH.ui.setChip('chip-patients', `Hastalar: ${E.patients.length} · Bekleyen: ${waiting}`);
    VH.ui.setChip('chip-served', `Taburcu: ${E.stats.served}`);
    const room = VH.map.roomAt(E.player.x, E.player.y);
    const fl = VH.map.floor ? VH.map.floorName().split(' · ')[0] + ' · ' : '';
    VH.ui.setChip('chip-where', '📍 ' + fl + (room ? room.name : 'Hastane bahçesi'));
  }

  // Döngü koruması: bir modüldeki hata oyunu dondurmasın (hata bir kez raporlanır, döngü sürer)
  const reported = new Set();
  function frame(now) {
    requestAnimationFrame(frame);
    try { tick(now); } catch (err) {
      const k = String(err && err.message);
      if (!reported.has(k)) { reported.add(k); console.error('[VH.frame]', err); }
      if (VH.paused && !VH.ui.isDialogOpen()) VH.paused = false;
    }
  }
  const doorEnts = [];
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!VH.paused) {
      readMoveInput();
      VH.entities.update(dt);
      VH.cases.update(dt);
      VH.hospital.update(dt);
      VH.staff.update(dt);
      VH.progress.update(dt);
      VH.world.update(dt, vw, vh);
      VH.logistics.update(dt);
      VH.surgery.update(dt);
      VH.floors.update(dt);
      VH.save.update(dt);
      footstepsAndDoors();
    }
    VH.guide.update(dt);
    updateFocus();
    cam().update(dt);
    { const E = VH.entities, f = VH.map.floor; doorEnts.length = 0; doorEnts.push(E.player); for (const e of E.staff) if ((e.floor || 0) === f) doorEnts.push(e); for (const e of E.patients) if ((e.floor || 0) === f && !e.gone) doorEnts.push(e); VH.map.updateDoors(dt, doorEnts); }
    targets = VH.ui.isDialogOpen() ? [] : VH.entities.nearbyTargets();
    VH.ui.setActions(targets);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    VH.map.draw(ctx, vw, vh, VH.entities.drawables(VH.map).concat(VH.hospital.drawables(VH.map), VH.world.drawables(VH.map), VH.logistics.drawables(VH.map)),
      { ground: VH.world.drawGround, lights: VH.world.drawLights, night: VH.map.floor === 0 ? VH.hospital.night : VH.hospital.night * 0.35 });
    VH.world.drawSky(ctx, vw, vh);
    drawFocusDim(dt);
    drawLockedFloor(dt);
    VH.build.drawOverlay(ctx, vw, vh);
    VH.equipment.drawOverlay(ctx, vw, vh);
    VH.guide.drawOverlay(ctx, vw, vh);
    VH.entities.drawOverlay(ctx, vw, vh, targets[0], VH.ui.isTouch());
    VH.hospital.drawOverlay(ctx, vw, vh);
    hudTimer -= dt;
    if (hudTimer <= 0) { hudTimer = 0.25; updateHud(); }
  }

  async function boot() {
    resize();
    window.addEventListener('resize', resize);
    const result = await VH.assets.preload(VH.ui.loaderProgress);
    const summary = report(result);
    if (!summary.ok) {
      VH.ui.loaderErrors(summary.failed.concat(summary.missingKinds.map((k) => "çizicisi olmayan tür: " + k)));
      selftest();
      return;
    }

    VH.map.init();
    VH.entities.init();
    const loaded = VH.save.load();
    VH.hospital.init();
    VH.equipment.init();
    VH.build.init();
    VH.staff.init();
    VH.progress.init();
    VH.world.init();
    VH.logistics.init();
    VH.floors.init();
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
    if (params.has('nocache')) VH.map.cacheEnabled = false;
    VH.map.pixelRatio = dpr;
    if (params.has('floor')) { VH.hospital.travel(+params.get('floor')); if (params.has('zoom')) { c.want = null; c.zoom = +params.get('zoom'); } if (params.has('x') && params.has('y')) { c.follow = false; c.centerOnWorld(+params.get('x'), +params.get('y')); } }

    VH.ui.hideLoader();
    // Sade HUD: Seviye · Bütçe · İtibar (💎) · Enerji önde; diğerleri masaüstünde ikincil
    VH.ui.showHud([
      ['chip-level', ''],
      ['chip-budget', ''],
      ['chip-rep', ''],
      ['chip-energy', ''],
      ['chip-rating', ''],
      ['chip-shift', ''],
      ['chip-event', ''],
      ['chip-combo', ''],
      ['chip-safety', ''],
      ['chip-patients', ''],
      ['chip-where', ''],
    ]);
    VH.ui.buildCameraControls({
      rotL: () => VH.map.rotate(-1),
      rotR: () => VH.map.rotate(1),
      zoomIn: () => c.zoomAt(1.25, vw / 2, vh / 2, vw, vh),
      zoomOut: () => c.zoomAt(1 / 1.25, vw / 2, vh / 2, vw, vh),
      follow: () => setFollow(!c.follow),
      labels: toggleLabels,
      sound: toggleSound,
      focus: () => { focusCam = !focusCam; VH.ui.setToggle('btn-focus', focusCam); lastRoomKey = ''; if (!focusCam) { c.focusF = 1; c.glide(c.base); } store('vh.focusCam', focusCam ? '1' : '0'); },
      textSize: () => { textSize = (textSize + 1) % 3; applyTextSize(); store('vh.textSize', String(textSize)); },
      save: () => { const ok = VH.save.save(); VH.ui.toast(ok ? '💾 Oyun kaydedildi' : '💾 Bu tarayıcıda kayıt kullanılamıyor', 2000); },
      goOffice: () => VH.terminal.guide(),
      summary: () => VH.terminal.open(),
    });
    VH.ui.buildGameControls((i) => doInteract(targets[i]));
    VH.ui.setToggle('btn-focus', focusCam);
    applyTextSize();
    VH.ui.setToggle('btn-follow', c.follow);
    VH.ui.setToggle('btn-labels', VH.map.labels);
    VH.ui.setSoundButton(VH.audio.muted);
    bindInput();
    updateHud();
    selftest({ map: VH.map.stats(), rot: VH.map.rot, viewport: [vw, vh], cases: VH.cases.CASES.length });
    if (!params.has('nointro') && !params.has('selftest')) VH.cases.start();
    if (loaded) VH.ui.toast(`💾 Kayıt yüklendi · Hastane Seviyesi ${VH.hospital.level()}`, 2600);
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
