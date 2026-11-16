// Vita Hospital — Yerleşke sınırı, şehir manzarası, ek bina, yemekhane eşyaları ve araçlar
//
// Tümü js/art.js kitiyle kodla çizilir (harici görsel yok). Animasyonlu parçalar:
// bariyer kolu, salıncaklar, şantiye vinci, ocak buharı, gece aydınlanan pencereler.
(function () {
  const VH = (window.VH = window.VH || {});
  const A = VH.art;
  const { C, shade, hash } = A;
  const R = (k, fn, flat) => A.register(k, fn, flat);
  const M = () => VH.map;
  const now = () => performance.now();
  const night = () => (VH.hospital ? VH.hospital.night : 0);
  const servicesOpen = () => {
    const s = VH.cases && VH.cases.state && VH.cases.state.services;
    return s ? Object.keys(s).filter((k) => s[k]).length : 0;
  };

  // ================================================================ Yerleşke sınırı
  R('fence', (k) => {
    k.box(0, 0, 1, 0.1, 0, 7, '#b9b2a4', { top: '#d8d2c6' });
    // Ferforje: tüm çubuklar ve korkuluklar tek yol (performans için)
    k.custom(0.5, 0.05, 7, (c, sx, sy, x, y) => {
      const o = k.o, map = M();
      const a = map.worldToIso(...(o.face === 'N' ? [o.x + 1, o.y + 1] : o.face === 'E' ? [o.x, o.y + 1] : o.face === 'W' ? [o.x + 1, o.y] : [o.x, o.y]));
      const b = map.worldToIso(...(o.face === 'N' ? [o.x, o.y + 1] : o.face === 'E' ? [o.x, o.y] : o.face === 'W' ? [o.x + 1, o.y + 1] : [o.x + 1, o.y]));
      c.strokeStyle = '#2b333b'; c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 1; i < 6; i++) { const t = i / 6, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t; c.moveTo(px, py - 7); c.lineTo(px, py - 31); }
      c.moveTo(a[0], a[1] - 29); c.lineTo(b[0], b[1] - 29);
      c.moveTo(a[0], a[1] - 16); c.lineTo(b[0], b[1] - 16);
      c.stroke();
    });
    if (k.o.post) { k.box(0, -0.02, 0.18, 0.14, 0, 36, '#c9c2b4', { top: '#e6dfd2' }); k.box(-0.02, -0.04, 0.2, 0.16, 36, 39, '#9e9789'); }
  });
  R('gate_pillar', (k) => {
    k.box(0.3, -0.05, 0.7, 0.2, 0, 52, '#c9c2b4', { deco: [{ dir: '*', u0: 0.1, u1: 0.9, z0: 40, z1: 46, color: '#0f5e66', raw: true }] });
    k.box(0.26, -0.08, 0.74, 0.23, 52, 56, '#9e9789');
    k.ball(0.5, 0.07, 60, 4, night() > 0.3 ? '#fff3c4' : '#e6dfd2');
  });
  R('guard_booth', (k) => {
    k.shadow(0.05, 0.05, 0.95, 0.95, 0.22);
    k.box(0.12, 0.12, 0.88, 0.88, 0, 44, '#eef2f4', { deco: [
      { dir: '*', u0: 0.12, u1: 0.88, z0: 18, z1: 38, color: '#7fb8d6', raw: true },
      { dir: '*', u0: 0, u1: 1, z0: 0, z1: 4, color: '#6f7d87' },
    ] });
    k.box(0.02, 0.02, 0.98, 0.98, 44, 48, '#0f5e66', { deco: [{ dir: '*', u0: 0, u1: 1, z0: 44, z1: 46, color: '#2ec4b6', raw: true }] });
    k.custom(0.5, 0.88, 28, (c, sx, sy) => {
      // camın ardındaki görevli
      c.fillStyle = '#2b3a46'; c.fillRect(sx - 4, sy - 2, 8, 9);
      c.fillStyle = '#c98d62'; c.beginPath(); c.arc(sx, sy - 6, 3.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1d2329'; c.fillRect(sx - 3.6, sy - 10, 7.2, 2.4);
    });
    k.custom(0.5, 0.95, 47, (c, sx, sy) => { c.fillStyle = '#fff'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('GÜVENLİK', sx, sy); });
  });
  R('boom_barrier', (k) => {
    k.shadow(0.3, 0.6, 0.8, 1);
    k.box(0.35, 0.65, 0.75, 0.98, 0, 22, '#f2c94c', { deco: [{ dir: '*', u0: 0, u1: 1, z0: 6, z1: 10, color: '#2b333b', raw: true }] });
    const open = VH.world ? VH.world.barrier : 0;
    k.custom(0.6, 0.95, 20, (c, sx, sy, x, y) => {
      const [ex, ey] = M().worldToIso(x + 4.2, y);
      const [px, py] = M().worldToIso(x, y);
      const L = Math.hypot(ex - px, ey - py);
      const tx = px + (ex - px) * (1 - open), ty = sy + (ey - py) * (1 - open) - L * 0.9 * open;
      const n = 8;
      for (let i = 0; i < n; i++) {
        c.strokeStyle = i % 2 ? '#ffffff' : '#d62828'; c.lineWidth = 3; c.lineCap = 'butt';
        c.beginPath(); c.moveTo(sx + (tx - sx) * (i / n), sy + (ty - sy) * (i / n)); c.lineTo(sx + (tx - sx) * ((i + 1) / n), sy + (ty - sy) * ((i + 1) / n)); c.stroke();
      }
      c.fillStyle = Math.floor(now() / 400) % 2 && open > 0.05 && open < 0.95 ? '#ff9f1c' : '#7a5a1d';
      c.beginPath(); c.arc(sx, sy - 6, 2.4, 0, Math.PI * 2); c.fill();
    });
  });

  // ================================================================ Ek bina (dış cephe evrimi)
  R('annex_tower', (k) => {
    const W = k.W, D = k.D, n = servicesOpen();
    const o = k.o;
    const front = M().depthAt(o.x + W / 2, o.y + D / 2) > M().depthAt(17, 11);
    o._alpha = front ? 0.35 : 1;
    if (n === 0) {
      // Şantiye: tahta perde, temel, vinç
      k.box(0.2, 0.2, W - 0.2, D - 0.2, 0, 4, '#a89c88');
      for (let u = 1; u < W - 0.5; u += 1.6) for (const v of [0.6, D - 0.6]) k.pole(u, v, 4, 40, 2.4, '#9aa7b0');
      k.line(1, 0.6, 40, W - 1.2, 0.6, 40, 2.4, '#9aa7b0');
      k.box(0, D - 0.06, W, D, 0, 22, '#d9a441', { deco: [{ dir: 'S', u0: 0.05, u1: 0.95, z0: 8, z1: 14, color: '#2b333b', raw: true }] });
      k.custom(W / 2, D, 11, (c, sx, sy) => { c.fillStyle = '#fff'; c.font = '800 7px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('YENİ BLOK İNŞAATI · YAKINDA', sx, sy); });
      const sw = Math.sin(now() / 3000) * 0.6;
      k.pole(W - 1.2, 1, 0, 150, 4, '#f2c94c');
      k.custom(W - 1.2, 1, 150, (c, sx, sy) => {
        const jx = Math.cos(sw) * 80, jy = Math.sin(sw) * 24;
        c.strokeStyle = '#f2c94c'; c.lineWidth = 4; c.beginPath(); c.moveTo(sx - jx * 0.3, sy - jy * 0.3); c.lineTo(sx + jx, sy + jy); c.stroke();
        c.strokeStyle = '#2b333b'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx + jx * 0.8, sy + jy * 0.8); c.lineTo(sx + jx * 0.8, sy + jy * 0.8 + 60); c.stroke();
        c.fillStyle = '#6f7d87'; c.fillRect(sx + jx * 0.8 - 6, sy + jy * 0.8 + 60, 12, 6);
      });
    } else {
      const fh = 30, h = 26 + n * fh;
      k.shadow(0, 0, W, D, 0.25);
      const deco = [];
      for (let f = 0; f < n + 1; f++) {
        const z0 = 8 + f * fh;
        for (const dir of ['S', 'E', 'W', 'N']) deco.push({ dir, u0: 0.04, u1: 0.96, z0, z1: z0 + 16, color: night() > 0.4 && (f % 2 === 0) ? '#ffe29a' : '#7fb8d6', raw: true });
      }
      deco.push({ dir: '*', u0: 0, u1: 1, z0: 0, z1: 6, color: '#6f7d87' });
      k.box(0.3, 0.3, W - 0.3, D - 0.3, 0, h, '#e9eef1', { deco, top: '#cfd8dc' });
      k.box(0.2, 0.2, W - 0.2, D - 0.2, h, h + 4, '#0f5e66');
      k.custom(W / 2, D - 0.3, h - 6, (c, sx, sy) => { c.fillStyle = '#2ec4b6'; c.font = '900 10px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✚ VITA', sx, sy); });
      if (n >= 3) {
        k.flat([[2.5, 0.8], [6.5, 0.8], [6.5, 3.2], [2.5, 3.2]], h + 4.5, '#3d4852');
        k.custom(4.5, 2, h + 5, (c, sx, sy) => { c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx, sy, 22, 11, 0, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#fff'; c.font = '900 12px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', sx, sy); });
      }
    }
  });

  // ================================================================ Yerleşke içi işaretler
  R('parking_sign', (k) => {
    k.pole(0.5, 0.5, 0, 44, 2.5, '#6f7d87');
    k.box(0.2, 0.45, 0.8, 0.55, 30, 52, '#1f5fbf', { deco: [{ dir: '*', u0: 0.05, u1: 0.95, z0: 31, z1: 51, color: '#2a73d9', raw: true }] });
    k.custom(0.5, 0.55, 41, (c, sx, sy) => { c.fillStyle = '#fff'; c.font = '900 13px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('P', sx, sy - 2); c.font = '700 5px system-ui'; c.fillText('ZİYARETÇİ', sx, sy + 8); });
  });
  R('loading_dock', (k) => {
    const W = k.W, D = k.D;
    k.flat([[0.05, 0.05], [W - 0.05, 0.05], [W - 0.05, D - 0.05], [0.05, D - 0.05]], 0.3, 'rgba(242,201,76,0.18)', 'rgba(242,201,76,0.9)');
    for (let v = 0.3; v < D - 0.2; v += 0.6) k.flat([[0.1, v], [0.45, v - 0.25], [0.6, v - 0.25], [0.25, v]], 0.35, 'rgba(242,201,76,0.85)');
    k.custom(W / 2, D / 2, 0.5, (c, sx, sy) => { c.fillStyle = 'rgba(242,201,76,0.95)'; c.font = '800 8px system-ui'; c.textAlign = 'center'; c.fillText('YÜKLEME PERONU', sx, sy); });
  }, true);
  R('ambulance_bay', (k) => {
    const W = k.W, D = k.D;
    k.flat([[0, 0], [W, 0], [W, D], [0, D]], 0.3, 'rgba(255,255,255,0.12)', '#d62828');
    for (let v = 0.2, i = 0; v < D - 0.1; v += 0.4, i++) k.flat([[0.05, v], [W - 0.05, v], [W - 0.05, v + 0.2], [0.05, v + 0.2]], 0.35, i % 2 ? 'rgba(255,255,255,0.75)' : 'rgba(214,40,40,0.85)');
    k.custom(W / 2, D / 2, 0.6, (c, sx, sy) => { c.fillStyle = '#fff'; c.font = '900 10px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.strokeStyle = '#8a1010'; c.lineWidth = 3; c.strokeText('AMBULANS', sx, sy); c.fillText('AMBULANS', sx, sy); });
  }, true);

  // ================================================================ Şehir
  const APT = ['#d9c7b0', '#c9d6df', '#e3d3c3', '#b9c8b5', '#e6dccb', '#cdbfd6', '#d6cbb8'];
  R('apartment', (k) => {
    const W = k.W, D = k.D, o = k.o;
    const col = APT[(o.tint || 0) % APT.length];
    const fl = o.floors || 3, fh = 22, h = fl * fh + 6;
    const deco = [];
    const lit = night() > 0.4;
    for (let f = 0; f < fl; f++) {
      const z0 = 6 + f * fh + 6;
      const nW = Math.max(2, Math.round(W * 1.6));
      for (const dir of ['S', 'N']) for (let i = 0; i < nW; i++) {
        const on = lit && hash(o.x * 13 + i, f * 7 + o.y) > 0.45;
        deco.push({ dir, u0: (i + 0.25) / nW, u1: (i + 0.75) / nW, z0, z1: z0 + 10, color: on ? '#ffe29a' : '#5f7f92', raw: true });
      }
      const nD = Math.max(2, Math.round(D * 1.6));
      for (const dir of ['E', 'W']) for (let i = 0; i < nD; i++) {
        const on = lit && hash(o.y * 11 + i, f * 5 + o.x) > 0.5;
        deco.push({ dir, u0: (i + 0.25) / nD, u1: (i + 0.75) / nD, z0, z1: z0 + 10, color: on ? '#ffe29a' : '#5f7f92', raw: true });
      }
    }
    deco.push({ dir: '*', u0: 0, u1: 1, z0: 0, z1: 6, color: shade(col, -0.35) });
    k.shadow(0, 0, W, D, 0.25);
    k.box(0.1, 0.1, W - 0.1, D - 0.1, 0, h, col, { deco, top: shade(col, -0.1) });
    k.box(W * 0.7, D * 0.3, W * 0.7 + 0.5, D * 0.3 + 0.5, h, h + 10, '#9aa7b0');
  });
  R('playground', (k) => {
    const W = k.W, D = k.D;
    k.flat([[0, 0], [W, 0], [W, D], [0, D]], 0.4, '#e07a5f');
    k.flat([[0.3, 0.3], [W - 0.3, 0.3], [W - 0.3, D - 0.3], [0.3, D - 0.3]], 0.5, '#f2a65a');
    // salıncak
    const t = now() / 1000;
    for (const u of [0.4, 2.4]) { k.line(u, 0.6, 0, u + 0.2, 1, 40, 2, '#3a8fb7'); k.line(u, 1.4, 0, u + 0.2, 1, 40, 2, '#3a8fb7'); }
    k.line(0.6, 1, 40, 2.6, 1, 40, 2.5, '#3a8fb7');
    [1.1, 1.9].forEach((u, i) => {
      const a = Math.sin(t * 2 + i * 1.7) * 0.5;
      k.custom(u, 1, 40, (c, sx, sy) => {
        const ex = sx + Math.sin(a) * 22, ey = sy + Math.cos(a) * 26;
        c.strokeStyle = '#2b333b'; c.lineWidth = 1; c.beginPath(); c.moveTo(sx - 3, sy); c.lineTo(ex - 3, ey); c.moveTo(sx + 3, sy); c.lineTo(ex + 3, ey); c.stroke();
        c.fillStyle = '#d62828'; c.fillRect(ex - 4, ey - 1, 8, 2.5);
        if (i === 0) { c.fillStyle = '#ffd166'; c.fillRect(ex - 3, ey - 9, 6, 8); c.fillStyle = '#e8b48f'; c.beginPath(); c.arc(ex, ey - 12, 3, 0, Math.PI * 2); c.fill(); }
      });
    });
    // kaydırak
    k.box(3.4, 2.2, 3.8, 2.6, 0, 30, '#06d6a0');
    k.line(3.6, 2.4, 30, 4.6, 3.6, 3, 5, '#ef476f');
    // tahterevalli
    const tilt = Math.sin(t * 1.4) * 6;
    k.custom(1.5, 3, 6, (c, sx, sy) => { c.strokeStyle = '#ffd166'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx - 20, sy - tilt); c.lineTo(sx + 20, sy + tilt); c.stroke(); c.fillStyle = '#6f7d87'; c.fillRect(sx - 2, sy - 2, 4, 8); });
  });

  // ================================================================ Mutfak ve yemekhane
  R('stove', (k) => {
    const W = k.W;
    k.shadow(0.05, 0.2, W - 0.05, 0.9);
    k.box(0.05, 0.25, W - 0.05, 0.85, 0, 26, '#c9d1d6', { deco: [{ dir: 'S', u0: 0.05, u1: 0.95, z0: 6, z1: 18, color: '#3d4852', raw: true }] });
    for (let i = 0; i < 2; i++) {
      const u = 0.45 + i * (W - 0.9);
      k.cyl(u, 0.55, 7, 26, 36, '#9aa7b0');
      k.custom(u, 0.55, 38, (c, sx, sy) => {
        const t = now() / 600 + i;
        c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5;
        for (let j = 0; j < 2; j++) { c.beginPath(); c.moveTo(sx - 3 + j * 5, sy); c.quadraticCurveTo(sx + Math.sin(t + j) * 5, sy - 10, sx + j * 2, sy - 18); c.stroke(); }
      });
    }
  });
  R('food_counter', (k) => {
    const W = k.W;
    k.shadow(0.02, 0.2, W - 0.02, 0.9);
    k.box(0.02, 0.25, W - 0.02, 0.85, 0, 24, '#dfe5ea', { deco: [{ dir: 'S', u0: 0, u1: 1, z0: 8, z1: 12, color: C.teal }, { dir: 'S', u0: 0, u1: 1, z0: 0, z1: 3, color: '#6f7d87' }] });
    k.box(0, 0.7, W, 0.95, 18, 20, '#9aa7b0');
    const foods = ['#f2c94c', '#d64545', '#66a182', '#9b7350', '#f4f1ea', '#e07a5f', '#5aa64f', '#c96f4a'];
    for (let i = 0; i < W * 2; i++) {
      const u = 0.25 + i * 0.5;
      k.box(u - 0.18, 0.35, u + 0.18, 0.6, 24, 26, '#b9c2c8', { top: foods[i % foods.length], edge: false });
    }
    k.box(0.05, 0.3, W - 0.05, 0.34, 26, 44, 'rgba(190,230,245,0.35)', { edge: false });
    k.box(0.05, 0.3, W - 0.05, 0.4, 44, 46, '#9aa7b0');
  });
  R('cash_register', (k) => {
    k.shadow(0.1, 0.2, 0.9, 0.9);
    k.box(0.1, 0.25, 0.9, 0.85, 0, 24, '#2e6f95', { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 8, z1: 12, color: '#2ec4b6', raw: true }] });
    k.box(0.3, 0.4, 0.7, 0.6, 24, 30, '#2b333b');
    k.box(0.25, 0.45, 0.75, 0.5, 30, 40, '#1b2329', { deco: [A.screenDeco('S', 0.1, 0.9, 32, 38, '#0f5e66')] });
  });
  R('menu_board', (k) => {
    k.pole(0.3, 0.5, 0, 40, 2, '#6f7d87'); k.pole(0.7, 0.5, 0, 40, 2, '#6f7d87');
    k.box(0.05, 0.45, 0.95, 0.55, 36, 66, '#1d2329');
    k.custom(0.5, 0.55, 51, (c, sx, sy) => {
      c.fillStyle = '#ffd166'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('GÜNÜN MENÜSÜ', sx, sy - 9); c.fillStyle = '#fff'; c.font = '600 5px system-ui';
      ['Mercimek çorbası', 'Izgara köfte · pilav', 'Mevsim salatası', 'Ayran / meyve'].forEach((t, i) => c.fillText(t, sx, sy - 2 + i * 5.5));
    });
  });
  R('tray_stack', (k) => {
    k.box(0.2, 0.25, 0.8, 0.75, 0, 18, '#9aa7b0');
    for (let i = 0; i < 6; i++) k.box(0.22, 0.27, 0.78, 0.73, 18 + i * 2, 19.4 + i * 2, i % 2 ? '#2e6f95' : '#3a8fb7', { edge: false });
  });
  R('cafe_table', (k) => {
    const col = ['#3a8fb7', '#e07a5f', '#66a182'][Math.floor(hash(k.o.x, k.o.y) * 3)];
    k.shadow(0.1, 0.1, 0.9, 0.9, 0.12);
    for (const [u, v] of [[0.5, 0.08], [0.92, 0.5], [0.5, 0.92], [0.08, 0.5]]) {
      k.box(u - 0.12, v - 0.12, u + 0.12, v + 0.12, 9, 11, col);
      k.pole(u, v, 0, 9, 1.5, C.steelD);
    }
    k.pole(0.5, 0.5, 0, 16, 3, C.steelD);
    k.cyl(0.5, 0.5, 13, 16, 18, '#f4f1ea');
    if (hash(k.o.x + 3, k.o.y) > 0.4) { k.ball(0.42, 0.45, 20, 2.5, '#ffffff'); k.ball(0.6, 0.55, 20, 2, '#d64545'); }
  });

  // ================================================================ Yüksek detaylı tıbbi mobilya
  // Eczane cam rafı: alüminyum çerçeve, cam kapak arkasında renkli ilaç kutuları
  R('med_cabinet', (k) => {
    k.shadow(0.05, 0.15, 0.95, 0.85, 0.22);
    const cols = ['#d1495b', '#edae49', '#00798c', '#30638e', '#66a182', '#8e6c8a', '#f4f1ea'];
    const deco = [];
    for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) deco.push({ dir: 'S', u0: 0.1 + i * 0.165, u1: 0.22 + i * 0.165, z0: 8 + r * 13, z1: 14 + r * 13 - ((i + r) % 3), color: cols[(i * 2 + r) % cols.length], raw: true });
    for (let r = 0; r < 4; r++) deco.push({ dir: 'S', u0: 0.05, u1: 0.95, z0: 6 + r * 13, z1: 7 + r * 13, color: '#c9d1d6', raw: true });
    k.box(0.08, 0.2, 0.92, 0.8, 0, 58, '#e9eef1', { deco, top: '#c9d1d6' });
    k.box(0.06, 0.78, 0.94, 0.82, 4, 56, 'rgba(180,225,245,0.32)', { edge: false });
    k.box(0.06, 0.18, 0.94, 0.84, 56, 60, '#a9b5bd');
    k.custom(0.5, 0.82, 30, (c, sx, sy) => { c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(sx - 10, sy + 14); c.lineTo(sx + 2, sy - 16); c.stroke(); });
  });
  // Tavana asılı çift kafalı ameliyat lambası
  R('surgical_lamp', (k) => {
    const on = performance.now();
    k.pole(0.5, 0.5, 64, 96, 3, '#c9d1d6');
    k.box(0.4, 0.4, 0.6, 0.6, 94, 98, '#a9b5bd');
    k.line(0.5, 0.5, 70, 0.15, 0.3, 62, 3, '#c9d1d6');
    k.line(0.5, 0.5, 70, 0.85, 0.7, 60, 3, '#c9d1d6');
    for (const [u, v, z] of [[0.15, 0.3, 58], [0.85, 0.7, 56]]) {
      k.custom(u, v, z, (c, sx, sy) => {
        c.fillStyle = '#eef2f4'; c.beginPath(); c.ellipse(sx, sy, 15, 8, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#9aa7b0'; c.lineWidth = 1.5; c.stroke();
        const g = c.createRadialGradient(sx, sy + 2, 1, sx, sy + 2, 12);
        g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,255,230,0.2)');
        c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy + 2, 11, 5, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,220,0.10)'; c.beginPath(); c.moveTo(sx - 11, sy + 2); c.lineTo(sx - 26, sy + 52 + Math.sin(on / 900) * 0.5); c.lineTo(sx + 26, sy + 52); c.lineTo(sx + 11, sy + 2); c.closePath(); c.fill();
      });
    }
  });

  // ================================================================ İleri tanı
  R('mri', (k) => {
    const W = k.W, D = k.D;
    k.shadow(0.05, 0.05, W - 0.05, D - 0.05, 0.22);
    k.box(0.1, 0.15, 1.6, D - 0.15, 0, 62, '#eef2f4', { deco: [{ dir: '*', u0: 0.05, u1: 0.95, z0: 50, z1: 54, color: '#2ec4b6', raw: true }] });
    k.custom(1.6, D / 2, 30, (c, sx, sy) => {
      c.fillStyle = '#c9d1d6'; c.beginPath(); c.ellipse(sx, sy, 20, 24, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#2b333b'; c.beginPath(); c.ellipse(sx, sy, 13, 16, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#5ff0d8'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(sx, sy, 15, 18, 0, 0, Math.PI * 2); c.stroke();
    });
    k.box(1.6, D / 2 - 0.3, W - 0.1, D / 2 + 0.3, 0, 18, '#cfd8dc');
    k.box(1.5, D / 2 - 0.26, W - 0.12, D / 2 + 0.26, 18, 21, '#a8d4e6');
    k.custom(W - 0.5, D - 0.1, 2, (c, sx, sy) => { c.fillStyle = '#f2c94c'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.fillText('⚠ MANYETİK ALAN', sx, sy); });
  });

  // ================================================================ Lojistik kamyonu
  R('logistics_truck', (k) => {
    const W = k.W, D = k.D;
    k.shadow(0.05, 0.1, W - 0.05, D - 0.05, 0.3);
    for (const [u, v] of [[0.12, 0.5], [W - 0.12, 0.5], [0.12, D - 0.6], [W - 0.12, D - 0.6]]) k.box(u - 0.07, v - 0.22, u + 0.07, v + 0.22, 0, 10, '#1d2329');
    const cab = D * 0.72;
    k.box(0.05, 0.05, W - 0.05, cab, 6, 44, '#f4f6f8', { deco: [
      { dir: 'E', u0: 0.05, u1: 0.95, z0: 14, z1: 30, color: '#0f5e66', raw: true }, { dir: 'W', u0: 0.05, u1: 0.95, z0: 14, z1: 30, color: '#0f5e66', raw: true },
      { dir: 'N', u0: 0.08, u1: 0.92, z0: 8, z1: 40, color: '#d9dee2' },
    ] });
    k.custom(W / 2, cab / 2, 22, (c, sx, sy) => { c.fillStyle = '#fff'; c.font = '900 7px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VITA LOJİSTİK', sx, sy); });
    k.box(0.08, cab + 0.05, W - 0.08, D - 0.1, 6, 30, '#2ec4b6', { deco: [
      { dir: 'S', u0: 0.08, u1: 0.92, z0: 18, z1: 28, color: '#2b3a46', raw: true },
      { dir: 'S', u0: 0.05, u1: 0.2, z0: 9, z1: 13, color: '#fff3b0', raw: true }, { dir: 'S', u0: 0.8, u1: 0.95, z0: 9, z1: 13, color: '#fff3b0', raw: true },
      { dir: 'E', u0: 0.15, u1: 0.85, z0: 18, z1: 27, color: '#2b3a46', raw: true }, { dir: 'W', u0: 0.15, u1: 0.85, z0: 18, z1: 27, color: '#2b3a46', raw: true },
    ] });
  });
})();

// ================================================================ v6: ayrıntılı araç modelleri
// Sivil sedan/SUV: tekerlek + jant, ön/arka cam, yan camlar ve dikmeler, yan aynalar, farlar,
// stop lambaları, tamponlar, panjur ve zemin gölgesi. Yerel çerçeve: W=genişlik, D=uzunluk, ön yüz 'S'.
(function () {
  const VH = window.VH, A = VH.art, { hash, shade } = A;
  const R = (k, fn, flat) => A.register(k, fn, flat);
  const night = () => (VH.hospital ? VH.hospital.night : 0);
  const PAL = ['#c0392b', '#2f6fa3', '#eef1f3', '#2b333b', '#e0b13a', '#4f8a4b', '#8e8e93', '#6c3483'];
  function wheels(k, W, D, z1, inset) {
    for (const [u, v] of [[inset, 0.55], [W - inset, 0.55], [inset, D - 0.6], [W - inset, D - 0.6]]) {
      k.box(u - 0.07, v - 0.2, u + 0.07, v + 0.2, 0, z1, '#1a1f24', { deco: [
        { dir: 'E', u0: 0.3, u1: 0.7, z0: z1 * 0.3, z1: z1 * 0.72, color: '#aab4bb', raw: true },
        { dir: 'W', u0: 0.3, u1: 0.7, z0: z1 * 0.3, z1: z1 * 0.72, color: '#aab4bb', raw: true }] });
    }
  }
  R('car', (k) => {
    const o = k.o, W = k.W, D = k.D;
    const h = hash(Math.round(o.x * 3), Math.round(o.y * 3));
    const col = o.color || PAL[Math.floor(h * PAL.length)];
    const suv = (o.suv !== undefined ? o.suv : hash(Math.round(o.y * 7), Math.round(o.x * 5)) > 0.62);
    const b0 = 4, b1 = suv ? 17 : 13, c1 = suv ? 29 : 23;          // gövde ve kabin yükseklikleri
    const glass = '#24384a', light = '#fff6c8', tail = o.braking ? '#ff2a2a' : '#b3202a';
    const nt = night();
    k.shadow(0.02, 0.05, W - 0.02, D - 0.02, 0.3);
    wheels(k, W, D, suv ? 10 : 8, 0.14);
    // alt gövde (kaput + bagaj): farlar, panjur, stop lambaları, yan etek ve kapı çizgisi
    k.box(0.1, 0.1, W - 0.1, D - 0.1, b0, b1, col, { deco: [
      { dir: 'S', u0: 0.06, u1: 0.24, z0: b1 - 5, z1: b1 - 2, color: light, raw: true },
      { dir: 'S', u0: 0.76, u1: 0.94, z0: b1 - 5, z1: b1 - 2, color: light, raw: true },
      { dir: 'S', u0: 0.3, u1: 0.7, z0: b0 + 3, z1: b1 - 4, color: '#1f262c', raw: true },
      { dir: 'N', u0: 0.06, u1: 0.26, z0: b1 - 5, z1: b1 - 2, color: tail, raw: true },
      { dir: 'N', u0: 0.74, u1: 0.94, z0: b1 - 5, z1: b1 - 2, color: tail, raw: true },
      { dir: 'N', u0: 0.35, u1: 0.65, z0: b0 + 3, z1: b0 + 6, color: '#e9edf0', raw: true },
      { dir: 'E', u0: 0.02, u1: 0.98, z0: b0, z1: b0 + 1.6, color: '#1f262c', raw: true },
      { dir: 'W', u0: 0.02, u1: 0.98, z0: b0, z1: b0 + 1.6, color: '#1f262c', raw: true },
      { dir: 'E', u0: 0.47, u1: 0.48, z0: b0 + 2, z1: b1, color: shade(col, -0.35), raw: true },
      { dir: 'W', u0: 0.52, u1: 0.53, z0: b0 + 2, z1: b1, color: shade(col, -0.35), raw: true },
    ] });
    // tamponlar
    k.box(0.08, D - 0.12, W - 0.08, D - 0.03, b0 - 1, b0 + 4, '#2a3138');
    k.box(0.08, 0.03, W - 0.08, 0.12, b0 - 1, b0 + 4, '#2a3138');
    // kabin: arka cam, yan camlar (dikmeli), tavan; SUV'de tavan rayı
    const v0 = suv ? D * 0.16 : D * 0.28, v1 = suv ? D * 0.7 : D * 0.68;
    k.box(0.17, v0, W - 0.17, v1, b1, c1, glass, { top: col, deco: [
      { dir: 'E', u0: 0.47, u1: 0.53, z0: b1, z1: c1, color: col, raw: true },
      { dir: 'W', u0: 0.47, u1: 0.53, z0: b1, z1: c1, color: col, raw: true },
      { dir: 'E', u0: 0, u1: 0.06, z0: b1, z1: c1, color: col, raw: true }, { dir: 'W', u0: 0.94, u1: 1, z0: b1, z1: c1, color: col, raw: true },
      { dir: 'E', u0: 0.12, u1: 0.3, z0: b1 + 3, z1: c1 - 2, color: 'rgba(255,255,255,0.18)', raw: true },
    ] });
    // ön cam (kademeli eğim) ve kaput çizgisi
    k.box(0.2, v1, W - 0.2, v1 + D * 0.07, b1, c1 - (suv ? 5 : 4), glass, { top: shade(col, 0.05) });
    if (!suv) k.box(0.2, v0 - D * 0.06, W - 0.2, v0, b1, c1 - 4, glass, { top: shade(col, 0.05) });
    if (suv) { k.box(0.2, v0 + 0.05, 0.26, v1 - 0.05, c1, c1 + 2, '#3b4248'); k.box(W - 0.26, v0 + 0.05, W - 0.2, v1 - 0.05, c1, c1 + 2, '#3b4248'); }
    // yan aynalar
    k.box(0.02, v1 - 0.04, 0.12, v1 + 0.06, b1 + 1, b1 + 4, col);
    k.box(W - 0.12, v1 - 0.04, W - 0.02, v1 + 0.06, b1 + 1, b1 + 4, col);
    // gece farı ışığı
    if (nt > 0.1) k.custom(W / 2, D + 0.6, 1, (c, sx, sy) => {
      const g = c.createRadialGradient(sx, sy, 2, sx, sy, 34);
      g.addColorStop(0, `rgba(255,240,190,${0.35 * nt})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, 34, 16, 0, 0, Math.PI * 2); c.fill();
    });
  });

  // Lojistik kargo kamyoneti: beyaz kasa üzerinde turkuaz şerit ve kırmızı medikal artı, arka kapılar,
  // kabin camları, farlar, tamponlar ve jantlı tekerlekler.
  R('logistics_truck', (k) => {
    const W = k.W, D = k.D;
    k.shadow(0.02, 0.05, W - 0.02, D - 0.02, 0.32);
    wheels(k, W, D, 11, 0.12);
    const cab = D * 0.7;
    k.box(0.05, 0.05, W - 0.05, cab, 7, 46, '#f6f8fa', { deco: [
      { dir: 'E', u0: 0.04, u1: 0.96, z0: 14, z1: 18, color: '#2ec4b6', raw: true }, { dir: 'W', u0: 0.04, u1: 0.96, z0: 14, z1: 18, color: '#2ec4b6', raw: true },
      { dir: 'E', u0: 0.04, u1: 0.96, z0: 7, z1: 9, color: '#0f5e66', raw: true }, { dir: 'W', u0: 0.04, u1: 0.96, z0: 7, z1: 9, color: '#0f5e66', raw: true },
      { dir: 'N', u0: 0.06, u1: 0.49, z0: 9, z1: 43, color: '#e2e7eb' }, { dir: 'N', u0: 0.51, u1: 0.94, z0: 9, z1: 43, color: '#e2e7eb' },
      { dir: 'N', u0: 0.42, u1: 0.47, z0: 24, z1: 30, color: '#6f7d87', raw: true }, { dir: 'N', u0: 0.53, u1: 0.58, z0: 24, z1: 30, color: '#6f7d87', raw: true },
      // yan yüzlerde kırmızı medikal artı
      { dir: 'E', u0: 0.44, u1: 0.56, z0: 22, z1: 40, color: '#d62828', raw: true }, { dir: 'E', u0: 0.36, u1: 0.64, z0: 27, z1: 35, color: '#d62828', raw: true },
      { dir: 'W', u0: 0.44, u1: 0.56, z0: 22, z1: 40, color: '#d62828', raw: true }, { dir: 'W', u0: 0.36, u1: 0.64, z0: 27, z1: 35, color: '#d62828', raw: true },
    ] });
    k.custom(W / 2, cab / 2, 47, (c, sx, sy) => {
      c.fillStyle = '#d62828'; c.fillRect(sx - 7, sy - 2.2, 14, 4.4); c.fillRect(sx - 2.2, sy - 7, 4.4, 14);
    });
    k.box(0.08, cab + 0.04, W - 0.08, D - 0.1, 7, 32, '#2ec4b6', { deco: [
      { dir: 'S', u0: 0.08, u1: 0.92, z0: 19, z1: 30, color: '#24384a', raw: true },
      { dir: 'S', u0: 0.05, u1: 0.2, z0: 10, z1: 14, color: '#fff6c8', raw: true }, { dir: 'S', u0: 0.8, u1: 0.95, z0: 10, z1: 14, color: '#fff6c8', raw: true },
      { dir: 'S', u0: 0.3, u1: 0.7, z0: 9, z1: 13, color: '#1f262c', raw: true },
      { dir: 'E', u0: 0.15, u1: 0.85, z0: 19, z1: 29, color: '#24384a', raw: true }, { dir: 'W', u0: 0.15, u1: 0.85, z0: 19, z1: 29, color: '#24384a', raw: true },
      { dir: 'E', u0: 0, u1: 1, z0: 7, z1: 9, color: '#0f5e66', raw: true }, { dir: 'W', u0: 0, u1: 1, z0: 7, z1: 9, color: '#0f5e66', raw: true },
    ] });
    k.box(0.06, D - 0.12, W - 0.06, D - 0.03, 5, 10, '#2a3138');
    k.box(0.02, D - 0.32, 0.1, D - 0.24, 20, 24, '#2ec4b6'); k.box(W - 0.1, D - 0.32, W - 0.02, D - 0.24, 20, 24, '#2ec4b6');
  });
})();
