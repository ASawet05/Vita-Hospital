// Vita Hospital — Ek prosedürel nesneler: kampüs canlandırma, araçlar ve dekorasyon kataloğu
//
// Tümü js/art.js çizim kitinin parçalarıyla (kutu, silindir, küre, direk, özel çizim) kurulur;
// harici görsel kullanılmaz. Animasyonlu parçalar (fıskiye suyu, bayrak, tepe lambası)
// her karede performance.now() ile yeniden hesaplanır.
(function () {
  const VH = (window.VH = window.VH || {});
  const A = VH.art;
  const { C, shade, hash } = A;
  const now = () => performance.now();
  const R = (kind, fn, flat) => A.register(kind, fn, flat);

  // ================================================================ Kampüs
  R('entrance_canopy', (k) => {
    const W = k.W, D = k.D;
    for (const [u, v] of [[0.2, 0.25], [W - 0.2, 0.25], [0.2, D - 0.2], [W - 0.2, D - 0.2]]) {
      k.disc(u, v, 0, 5, '#5d6870');
      k.cyl(u, v, 2.6, 0, 60, '#c9d1d6');
    }
    // cam saçak + ön alın bandı
    k.box(0.05, 0.05, W - 0.05, D - 0.02, 60, 63, 'rgba(160,215,230,0.55)', { top: 'rgba(190,232,242,0.5)', edge: false });
    k.box(0.05, D - 0.16, W - 0.05, D - 0.02, 58, 68, '#0f5e66', { deco: [{ dir: 'S', u0: 0, u1: 1, z0: 58, z1: 60, color: '#2ec4b6', raw: true }] });
    k.custom(W / 2, D - 0.02, 63, (c, sx, sy) => {
      c.fillStyle = '#ffffff'; c.font = '800 8px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ANA GİRİŞ · POLİKLİNİK', sx, sy);
    });
  });

  R('fountain', (k) => {
    const t = now() / 1000;
    k.custom(1, 1, 0, (c, sx, sy) => { c.fillStyle = 'rgba(10,30,40,0.2)'; c.beginPath(); c.ellipse(sx, sy + 2, 52, 26, 0, 0, Math.PI * 2); c.fill(); });
    k.cyl(1, 1, 46, 0, 9, '#c9c2b4');
    k.custom(1, 1, 8, (c, sx, sy) => {
      // su yüzeyi ve halkalar
      const g = c.createRadialGradient(sx, sy, 4, sx, sy, 42);
      g.addColorStop(0, '#9fe0f0'); g.addColorStop(1, '#3f9fc0');
      c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, 41, 20.5, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const p = ((t * 0.6 + i / 3) % 1);
        c.globalAlpha = 1 - p;
        c.beginPath(); c.ellipse(sx, sy, 8 + p * 30, (8 + p * 30) / 2, 0, 0, Math.PI * 2); c.stroke();
      }
      c.globalAlpha = 1;
    });
    k.cyl(1, 1, 5, 8, 26, '#d8d2c6');
    k.cyl(1, 1, 15, 24, 28, '#d8d2c6');
    k.custom(1, 1, 28, (c, sx, sy) => {
      c.fillStyle = '#7fd0e6'; c.beginPath(); c.ellipse(sx, sy, 13, 6.5, 0, 0, Math.PI * 2); c.fill();
      // fıskiye damlaları (parabolik)
      c.fillStyle = 'rgba(220,245,255,0.9)';
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const p = (t * 0.9 + i * 0.137) % 1;
        const r = 4 + p * 26;
        const h = 14 * Math.sin(p * Math.PI) - p * 18;
        c.beginPath(); c.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r / 2 - h, 1.3, 0, Math.PI * 2); c.fill();
      }
      c.fillRect(sx - 1, sy - 18, 2, 18);
    });
  });

  const FLAG = {
    10: (c, x, y, w, h) => { c.fillStyle = '#e30a17'; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w * 0.38, y + h / 2, h * 0.27, 0, Math.PI * 2); c.fill(); c.fillStyle = '#e30a17'; c.beginPath(); c.arc(x + w * 0.43, y + h / 2, h * 0.22, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w * 0.62, y + h / 2, h * 0.09, 0, Math.PI * 2); c.fill(); },
    11: (c, x, y, w, h) => { c.fillStyle = '#0f5e66'; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.fillRect(x + w / 2 - 2, y + 2, 4, h - 4); c.fillRect(x + w / 2 - 6, y + h / 2 - 2, 12, 4); },
    12: (c, x, y, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h); c.fillStyle = '#2f9e44'; c.fillRect(x, y + h - 4, w, 4); c.fillStyle = '#2ec4b6'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VITA', x + w / 2, y + h / 2 - 1); },
  };
  R('flag_pole', (k) => {
    k.disc(0.5, 0.5, 0, 5, '#9aa7b0');
    k.pole(0.5, 0.5, 0, 92, 2.5, '#d8dee2');
    k.ball(0.5, 0.5, 93, 2.5, '#e6c66e');
    const draw = FLAG[k.o.tint] || FLAG[11];
    const seed = (k.o.tint || 0) * 1.7;
    k.custom(0.5, 0.5, 88, (c, sx, sy) => {
      // dalgalanan bayrak: dikey şeritlerle bükülme
      const w = 22, h = 14, strips = 8, t = now() / 260 + seed;
      for (let i = 0; i < strips; i++) {
        const off = Math.sin(t + i * 0.7) * (i / strips) * 3;
        c.save();
        c.beginPath(); c.rect(sx + 1 + (i * w) / strips, sy - 1 + off, w / strips + 0.6, h); c.clip();
        draw(c, sx + 1, sy - 1 + off, w, h);
        c.restore();
      }
    });
  });

  R('planter', (k) => {
    const r = hash(k.o.x, k.o.y + 9);
    k.shadow(0.15, 0.15, 0.85, 0.85);
    k.box(0.18, 0.18, 0.82, 0.82, 0, 12, '#8f9aa1', { top: '#5b3f2a' });
    k.ball(0.5, 0.5, 20, 10, r > 0.5 ? '#4f9a4a' : '#3f8a46');
    k.ball(0.38, 0.55, 17, 6, '#5aa64f');
    for (let i = 0; i < 4; i++) k.ball(0.32 + i * 0.12, 0.48 + (i % 2) * 0.1, 22 + (i % 2) * 4, 1.8, ['#ef476f', '#ffd166', '#ffffff', '#b388ff'][(i + Math.floor(r * 4)) % 4]);
  });

  R('bike_rack', (k) => {
    const W = k.W;
    k.box(0.1, 0.45, W - 0.1, 0.55, 0, 2, '#6f7d87');
    for (let u = 0.3; u < W - 0.1; u += 0.45) k.line(u, 0.5, 2, u, 0.5, 14, 2, '#9aa7b0');
    const bike = (u, col) => k.custom(u, 0.5, 6, (c, sx, sy) => {
      c.strokeStyle = '#1d2329'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(sx - 7, sy, 5, 0, Math.PI * 2); c.stroke();
      c.beginPath(); c.arc(sx + 7, sy + 3, 5, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = col; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(sx - 7, sy); c.lineTo(sx - 1, sy - 6); c.lineTo(sx + 7, sy + 3); c.lineTo(sx + 1, sy - 4); c.lineTo(sx - 1, sy - 6); c.stroke();
    });
    bike(0.55, '#d64545'); bike(1.4, '#3a8fb7');
  });

  R('er_sign', (k) => {
    k.shadow(0.2, 0.3, 0.8, 0.7);
    k.box(0.3, 0.42, 0.7, 0.58, 0, 30, '#6f7d87');
    k.box(0.12, 0.4, 0.88, 0.6, 30, 64, '#c62828', { deco: [{ dir: '*', u0: 0, u1: 1, z0: 60, z1: 64, color: '#ffffff', raw: true }] });
    const night = VH.hospital ? VH.hospital.night : 0;
    k.custom(0.5, 0.5, 46, (c, sx, sy) => {
      if (night > 0.2) { c.fillStyle = `rgba(255,80,80,${0.35 * night})`; c.beginPath(); c.ellipse(sx, sy, 26, 18, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#ffffff'; c.font = '900 11px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('ACİL', sx, sy - 4);
      c.font = '700 6px system-ui,sans-serif'; c.fillText('AMBULANS ➔', sx, sy + 7);
    });
  });

  R('bus_stop', (k) => {
    const W = k.W;
    k.shadow(0.05, 0.2, W - 0.05, 0.8);
    for (const u of [0.15, W - 0.15]) k.pole(u, 0.25, 0, 40, 3, '#5d6870');
    k.box(0.1, 0.2, W - 0.1, 0.3, 4, 38, 'rgba(170,215,235,0.45)', { edge: false });
    k.box(0.05, 0.15, W - 0.05, 0.85, 40, 43, '#2e6f95');
    k.box(0.3, 0.3, W - 0.3, 0.55, 10, 13, C.wood);
    k.pole(W - 0.05, 0.85, 0, 46, 2, '#5d6870');
    k.custom(W - 0.05, 0.85, 46, (c, sx, sy) => { c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(sx, sy, 6, 0, Math.PI * 2); c.fill(); c.fillStyle = '#1d2329'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('D', sx, sy + 0.5); });
  });

  R('picnic_table', (k) => {
    const W = k.W;
    k.shadow(0.1, 0.1, W - 0.1, 0.9);
    for (const u of [0.3, W - 0.3]) k.box(u - 0.05, 0.35, u + 0.05, 0.65, 0, 14, C.woodD);
    k.box(0.15, 0.3, W - 0.15, 0.7, 14, 17, C.wood);
    k.box(0.15, 0.05, W - 0.15, 0.2, 7, 9, C.wood);
    k.box(0.15, 0.8, W - 0.15, 0.95, 7, 9, C.wood);
  });

  // ================================================================ Araçlar
  // Ambulans: yerel çerçevede W=genişlik, D=uzunluk; ön yüz +v. o.lights → tepe lambaları.
  R('ambulance', (k) => {
    const W = k.W, D = k.D, o = k.o;
    const lift = 4;
    k.shadow(0.05, 0.1, W - 0.05, D - 0.05, 0.3);
    for (const [u, v] of [[0.12, 0.5], [W - 0.12, 0.5], [0.12, D - 0.55], [W - 0.12, D - 0.55]]) k.box(u - 0.07, v - 0.22, u + 0.07, v + 0.22, 0, 10, '#1d2329');
    const cab = D * 0.7;
    // hasta modülü (arka, yüksek)
    k.box(0.06, 0.08, W - 0.06, cab, lift, 38, '#f4f6f8', { deco: [
      { dir: 'E', u0: 0.05, u1: 0.95, z0: 13, z1: 18, color: '#d62828', raw: true },
      { dir: 'W', u0: 0.05, u1: 0.95, z0: 13, z1: 18, color: '#d62828', raw: true },
      { dir: 'E', u0: 0.05, u1: 0.95, z0: 19, z1: 21, color: '#1f5fbf', raw: true },
      { dir: 'W', u0: 0.05, u1: 0.95, z0: 19, z1: 21, color: '#1f5fbf', raw: true },
      { dir: 'N', u0: 0.08, u1: 0.48, z0: 8, z1: 34, color: '#e3e8ec' }, { dir: 'N', u0: 0.52, u1: 0.92, z0: 8, z1: 34, color: '#e3e8ec' },
      { dir: 'N', u0: 0.15, u1: 0.42, z0: 24, z1: 31, color: '#2b3a46', raw: true }, { dir: 'N', u0: 0.58, u1: 0.85, z0: 24, z1: 31, color: '#2b3a46', raw: true },
      { dir: 'E', u0: 0.55, u1: 0.8, z0: 24, z1: 32, color: '#2b3a46', raw: true }, { dir: 'W', u0: 0.2, u1: 0.45, z0: 24, z1: 32, color: '#2b3a46', raw: true },
    ] });
    // kabin (ön, alçak) + ön cam
    k.box(0.06, cab, W - 0.06, D - 0.12, lift, 28, '#f4f6f8', { deco: [
      { dir: 'S', u0: 0.08, u1: 0.92, z0: 16, z1: 26, color: '#2b3a46', raw: true },
      { dir: 'S', u0: 0.05, u1: 0.2, z0: 7, z1: 11, color: '#fff3b0', raw: true }, { dir: 'S', u0: 0.8, u1: 0.95, z0: 7, z1: 11, color: '#fff3b0', raw: true },
      { dir: 'S', u0: 0.3, u1: 0.7, z0: 5, z1: 9, color: '#c62828', raw: true },
      { dir: 'E', u0: 0.1, u1: 0.8, z0: 16, z1: 25, color: '#2b3a46', raw: true }, { dir: 'W', u0: 0.2, u1: 0.9, z0: 16, z1: 25, color: '#2b3a46', raw: true },
      { dir: 'E', u0: 0, u1: 1, z0: 13, z1: 18, color: '#d62828', raw: true }, { dir: 'W', u0: 0, u1: 1, z0: 13, z1: 18, color: '#d62828', raw: true },
    ] });
    k.box(0.06, D - 0.14, W - 0.06, D - 0.04, lift, 12, '#d0d6db');
    // tepe: yıldız-çarpı ve lamba bandı
    k.custom(W / 2, cab / 2, 38, (c, sx, sy) => {
      c.fillStyle = '#d62828'; c.fillRect(sx - 8, sy - 2.5, 16, 5); c.fillRect(sx - 2.5, sy - 8, 5, 16);
    });
    const flash = o.lights ? Math.floor(now() / 180) % 2 : -1;
    k.box(0.15, cab - 0.18, W - 0.15, cab - 0.02, 38, 42, '#2b333b', { deco: [
      { dir: '*', u0: 0.04, u1: 0.46, z0: 38.5, z1: 41.5, color: flash === 0 ? '#ff3b3b' : '#7a1d1d', raw: true },
      { dir: '*', u0: 0.54, u1: 0.96, z0: 38.5, z1: 41.5, color: flash === 1 ? '#3b8bff' : '#1d3b7a', raw: true },
    ] });
    k.custom(W / 2, cab - 0.1, 44, (c, sx, sy) => {
      if (flash < 0) return;
      const g = c.createRadialGradient(sx, sy, 1, sx, sy, 16);
      const col = flash === 0 ? '255,59,59' : '59,139,255';
      g.addColorStop(0, `rgba(${col},0.9)`); g.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 16, 0, Math.PI * 2); c.fill();
    });
  });

  // ================================================================ Dekorasyon kataloğu (düzenleme modu)
  R('potted_plant', (k) => {
    const r = hash(k.o.x + 5, k.o.y);
    k.shadow(0.25, 0.25, 0.75, 0.75);
    k.cyl(0.5, 0.5, 9, 0, 14, '#c96f4a');
    k.disc(0.5, 0.5, 14, 8, '#5b3f2a');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r;
      k.ball(0.5 + Math.cos(a) * 0.14, 0.5 + Math.sin(a) * 0.14, 22 + (i % 3) * 4, 6, i % 2 ? '#4f9a4a' : '#5aa64f');
    }
    k.ball(0.5, 0.5, 32, 6, '#6aa84f');
  });
  R('palm_plant', (k) => {
    k.shadow(0.2, 0.2, 0.8, 0.8);
    k.cyl(0.5, 0.5, 10, 0, 16, '#e9e2d6');
    k.cyl(0.5, 0.5, 2.5, 16, 46, '#8a6a4c');
    k.custom(0.5, 0.5, 46, (c, sx, sy) => {
      const sw = Math.sin(now() / 1100 + k.o.x) * 1.5;
      c.strokeStyle = '#3f8a46'; c.lineWidth = 3.5; c.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        c.beginPath(); c.moveTo(sx, sy);
        c.quadraticCurveTo(sx + Math.cos(a) * 14, sy - 10 + Math.sin(a) * 4, sx + Math.cos(a) * 22 + sw, sy + 6 + Math.sin(a) * 9);
        c.stroke();
      }
    });
  });
  R('aquarium', (k) => {
    const W = k.W;
    k.shadow(0.05, 0.2, W - 0.05, 0.8);
    k.box(0.08, 0.25, W - 0.08, 0.75, 0, 18, '#3d4852');
    k.box(0.1, 0.28, W - 0.1, 0.72, 18, 42, 'rgba(90,180,220,0.55)', { top: 'rgba(140,210,235,0.6)', edge: false });
    k.custom(W / 2, 0.75, 30, (c, sx, sy) => {
      const t = now() / 1000;
      const cols = ['#ff8c42', '#ffd166', '#ef476f', '#06d6a0'];
      for (let i = 0; i < 4; i++) {
        const x = sx + Math.sin(t * (0.6 + i * 0.17) + i * 2) * 22 * (W / 2);
        const y = sy - 6 + i * 3 + Math.sin(t * 2 + i) * 1.5;
        const dir = Math.cos(t * (0.6 + i * 0.17) + i * 2) > 0 ? 1 : -1;
        c.fillStyle = cols[i];
        c.beginPath(); c.ellipse(x, y, 3.2, 1.8, 0, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(x - dir * 3, y); c.lineTo(x - dir * 6, y - 2); c.lineTo(x - dir * 6, y + 2); c.closePath(); c.fill();
      }
      c.fillStyle = 'rgba(255,255,255,0.7)';
      for (let i = 0; i < 4; i++) { const p = (t * 0.5 + i * 0.25) % 1; c.beginPath(); c.arc(sx + 14 - i * 3, sy + 6 - p * 18, 1, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#3f8a46'; c.fillRect(sx - 18, sy + 2, 2, 8); c.fillRect(sx - 14, sy + 4, 2, 6);
    });
  });
  R('tv_stand', (k) => {
    k.shadow(0.1, 0.3, 0.9, 0.7);
    k.box(0.15, 0.4, 0.85, 0.65, 0, 12, '#5d4636');
    k.box(0.45, 0.5, 0.55, 0.55, 12, 18, '#2b333b');
    k.box(0.05, 0.48, 0.95, 0.56, 18, 46, '#1d2329', { deco: [A.screenDeco('S', 0.05, 0.95, 20, 44, '#1d5f86'), A.screenDeco('N', 0.05, 0.95, 20, 44, '#1d2329')] });
    k.custom(0.5, 0.56, 32, (c, sx, sy) => {
      const t = Math.floor(now() / 3500) % 3;
      c.fillStyle = ['#ffd166', '#5ff0d8', '#ffffff'][t]; c.font = '700 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(['Sağlıklı Beslenme', 'El Hijyeni = Hayat', 'Bol Su İçin 💧'][t], sx, sy);
    });
  });
  R('bookshelf', (k) => {
    const cols = ['#d1495b', '#edae49', '#00798c', '#30638e', '#66a182', '#8e6c8a'];
    const deco = [];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7; i++) deco.push({ dir: 'S', u0: 0.08 + i * 0.12, u1: 0.17 + i * 0.12, z0: 6 + r * 15, z1: 16 + r * 15 - (i % 3), color: cols[(i * 3 + r) % 6], raw: true });
    k.shadow(0.05, 0.3, 0.95, 0.75);
    k.box(0.05, 0.35, 0.95, 0.75, 0, 50, '#9b7350', { deco });
  });
  R('sofa', (k) => {
    const W = k.W, col = k.o.color || '#3a8fb7';
    k.shadow(0.05, 0.15, W - 0.05, 0.9);
    k.box(0.08, 0.2, W - 0.08, 0.85, 4, 13, col);
    k.box(0.08, 0.15, W - 0.08, 0.35, 13, 26, shade(col, -0.1));
    k.box(0.05, 0.2, 0.2, 0.85, 4, 19, shade(col, -0.15));
    k.box(W - 0.2, 0.2, W - 0.05, 0.85, 4, 19, shade(col, -0.15));
    for (const u of [0.15, W - 0.15]) k.box(u - 0.04, 0.25, u + 0.04, 0.8, 0, 4, C.dark);
  });
  R('coffee_machine', (k) => {
    k.shadow(0.15, 0.2, 0.85, 0.8);
    k.box(0.15, 0.25, 0.85, 0.75, 0, 22, '#9b7350');
    k.box(0.25, 0.35, 0.75, 0.65, 22, 44, '#2b333b', { deco: [{ dir: 'S', u0: 0.15, u1: 0.85, z0: 34, z1: 41, color: '#c96f4a', raw: true }, { dir: 'S', u0: 0.35, u1: 0.65, z0: 24, z1: 30, color: '#111', raw: true }] });
    k.custom(0.5, 0.65, 28, (c, sx, sy) => {
      c.fillStyle = '#ffffff'; c.fillRect(sx - 2, sy - 2, 4, 5);
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1;
      const t = now() / 400;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(sx - 1 + i * 2, sy - 3); c.quadraticCurveTo(sx + Math.sin(t + i) * 3, sy - 8, sx + i, sy - 13); c.stroke(); }
    });
  });
  R('toy_box', (k) => {
    k.shadow(0.15, 0.2, 0.85, 0.8);
    k.box(0.18, 0.25, 0.82, 0.75, 0, 14, '#f2c94c', { deco: [{ dir: '*', u0: 0, u1: 1, z0: 6, z1: 9, color: '#ef476f', raw: true }] });
    k.ball(0.35, 0.45, 18, 4.5, '#3a8fb7'); k.ball(0.62, 0.55, 17, 3.5, '#ef476f');
    k.box(0.45, 0.3, 0.6, 0.45, 14, 22, '#06d6a0');
  });
  R('info_kiosk', (k) => {
    k.shadow(0.2, 0.3, 0.8, 0.7);
    k.box(0.3, 0.4, 0.7, 0.6, 0, 24, '#dfe5ea');
    k.box(0.2, 0.42, 0.8, 0.52, 24, 44, '#1b2329', { deco: [A.screenDeco('S', 0.08, 0.92, 26, 42, '#0f5e66')] });
    k.custom(0.5, 0.52, 35, (c, sx, sy) => { c.fillStyle = '#5ff0d8'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BİLGİ', sx, sy - 3); c.fillStyle = '#fff'; c.fillText('ⓘ', sx, sy + 4); });
  });
  R('fire_ext', (k) => {
    k.shadow(0.35, 0.35, 0.65, 0.65);
    k.cyl(0.5, 0.5, 4, 0, 20, '#d62828');
    k.ball(0.5, 0.5, 21, 3, '#2b333b');
    k.line(0.5, 0.5, 22, 0.62, 0.5, 18, 1.5, '#2b333b');
  });
  R('ct_scanner', (k) => {
    const W = k.W;
    k.shadow(0.05, 0.1, W - 0.05, 0.95, 0.22);
    k.box(0.2, 0.05, 0.9, 0.95, 0, 54, '#eef2f4', { deco: [{ dir: '*', u0: 0.1, u1: 0.9, z0: 44, z1: 48, color: '#2ec4b6', raw: true }] });
    k.custom(0.55, 0.95, 26, (c, sx, sy) => { c.fillStyle = '#2b333b'; c.beginPath(); c.ellipse(sx, sy, 13, 16, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#5ff0d8'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(sx, sy, 15, 18, 0, 0, Math.PI * 2); c.stroke(); });
    k.box(0.9, 0.35, W - 0.05, 0.65, 0, 16, '#cfd8dc');
    k.box(0.4, 0.38, W - 0.05, 0.62, 16, 19, '#a8d4e6');
  });

  // Yere düşen çöp (temizlik mekaniği) — progress.js yerleştirir
  R('litter', (k) => {
    const v = k.o.v || 0;
    k.custom(0.5, 0.5, 0.5, (c, sx, sy) => {
      if (v === 0) { c.fillStyle = '#f4f1ea'; c.beginPath(); c.ellipse(sx, sy, 4, 2.5, 0.3, 0, Math.PI * 2); c.fill(); c.fillStyle = '#d64545'; c.fillRect(sx - 2, sy - 1, 4, 1.5); }
      else if (v === 1) { c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(sx - 5, sy); c.lineTo(sx - 1, sy - 3); c.lineTo(sx + 5, sy - 1); c.lineTo(sx + 1, sy + 2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.stroke(); }
      else { c.fillStyle = 'rgba(160,120,60,0.55)'; c.beginPath(); c.ellipse(sx, sy, 9, 4.5, 0, 0, Math.PI * 2); c.fill(); }
    });
  }, true);
})();
