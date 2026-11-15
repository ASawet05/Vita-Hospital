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
