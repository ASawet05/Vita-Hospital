// Vita Hospital — Hacimli izometrik araç modelleri (v8)
//
// Kenney'nin CC0 "Isometric Vehicles" render'larının oranları ve ışık-gölge dili referans alınarak
// koddan çizilmiş özgün modeller (harici dosya yok). Eğimli yüzeyler art kitinin quad3 primitifiyle
// çizilir: eğik ön cam ve kaput, daralan kabin, gerçek tavan. Hareketli araçlar map.drawSprite ile
// görünüm anahtarlı yüksek kaliteli sprite olarak önbelleğe alınır.
// Yerel çerçeve: W = genişlik (u), D = uzunluk (v), ön yüz +v ('S').
(function () {
  const VH = (window.VH = window.VH || {});
  const A = VH.art;
  const { hash, shade } = A;
  const R = (k, fn) => A.register(k, fn);
  const night = () => (VH.hospital ? VH.hospital.night : 0);
  const GLASS = '#22394b', GLASS_HI = 'rgba(190,225,245,0.35)';

  // Lastik + jant + çamurluk: tekerlek yan yüzde koyu lastik, ortada açık renkli jant ve göbek
  function wheel(k, u, v, r, z0) {
    // Lastikler gövdeden önce çizilir (dd < 0): gövdenin altından ve çamurluk boşluğundan görünür.
    const zc = (z0 || 0) + r, rv = r / 24;
    const oct = (s, f) => { const pts = []; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; pts.push([u + s, v + Math.cos(a) * rv * f, zc + Math.sin(a) * r * f]); } return pts; };
    const out = u < 0.5 ? -0.075 : 0.075;
    k.quad3(oct(-out, 1), '#101316', { auto: false, dd: -6 });
    k.quad3([[u - 0.075, v - rv, zc], [u + 0.075, v - rv, zc], [u + 0.075, v + rv, zc], [u - 0.075, v + rv, zc]], '#15191d', { auto: false, dd: -5.9 });
    k.quad3(oct(out, 1), '#1b2025', { auto: false, dd: -5.8 });
    k.quad3(oct(out * 1.04, 0.56), '#aeb9c1', { auto: false, dd: -5.7 });
    k.quad3(oct(out * 1.06, 0.2), '#5d6a74', { auto: false, dd: -5.6 });
  }
  /** Daralan kabin: alt dikdörtgen (zb) → üst dikdörtgen (zt); ön/arka cam eğik, yan camlar dikmeli. */
  function cabin(k, c) {
    const { u0, u1, vb0, vb1, vt0, vt1, zb, zt, inset, body } = c;
    const i = inset || 0.04;
    const A0 = [u0, vb0, zb], B0 = [u1, vb0, zb], C0 = [u1, vb1, zb], D0 = [u0, vb1, zb];
    const a = [u0 + i, vt0, zt], b = [u1 - i, vt0, zt], cc = [u1 - i, vt1, zt], d = [u0 + i, vt1, zt];
    const lerp3 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
    // arka cam + yan yüzler + ön cam + tavan
    k.quad3([A0, B0, b, a], c.rearGlass === false ? body : GLASS, { auto: c.rearGlass === false });
    for (const [P0, P1, p1, p0] of [[A0, D0, d, a], [B0, C0, cc, b]]) {
      k.quad3([P0, P1, p1, p0], body);
      // yan camlar: alt kenarın biraz üstünden tavana; ortada B-dikmesi
      const s0 = lerp3(P0, p0, 0.22), s1 = lerp3(P1, p1, 0.22), t0 = lerp3(P0, p0, 0.9), t1 = lerp3(P1, p1, 0.9);
      const split = c.pillar === undefined ? 0.5 : c.pillar;
      for (const [f0, f1] of (c.windows || [[0.08, split - 0.04], [split + 0.04, 0.92]])) {
        k.quad3([lerp3(s0, s1, f0), lerp3(s0, s1, f1), lerp3(t0, t1, f1), lerp3(t0, t1, f0)], GLASS, { auto: false, dd: 0.004 });
      }
      k.quad3([lerp3(s0, s1, 0.1), lerp3(s0, s1, 0.3), lerp3(t0, t1, 0.3), lerp3(t0, t1, 0.1)], GLASS_HI, { auto: false, dd: 0.006 });
    }
    k.quad3([D0, C0, cc, d], GLASS, { auto: false });
    k.quad3([lerp3(D0, d, 0.15), lerp3(lerp3(D0, C0, 0.3), lerp3(d, cc, 0.3), 0.15), lerp3(lerp3(D0, C0, 0.3), lerp3(d, cc, 0.3), 0.8), lerp3(D0, d, 0.8)], GLASS_HI, { auto: false, dd: 0.006 });
    k.quad3([a, b, cc, d], c.roof || body);
  }
  function mirrors(k, W, v, z, col) {
    k.box(-0.06, v - 0.05, 0.08, v + 0.05, z, z + 3.5, col);
    k.box(W - 0.08, v - 0.05, W + 0.06, v + 0.05, z, z + 3.5, col);
  }
  function headGlow(k, W, D) {
    const nt = night();
    if (nt < 0.1) return;
    k.custom(W / 2, D + 0.7, 1, (c, sx, sy) => {
      const g = c.createRadialGradient(sx, sy, 2, sx, sy, 36);
      g.addColorStop(0, `rgba(255,240,190,${0.35 * nt})`); g.addColorStop(1, 'rgba(255,240,190,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, 36, 17, 0, 0, Math.PI * 2); c.fill();
    });
  }

  // ================================================================ Sivil sedan / SUV
  const PAL = ['#c0392b', '#2f6fa3', '#eef1f3', '#2b333b', '#e0b13a', '#4f8a4b', '#8e8e93', '#6c3483'];
  R('car', (k) => {
    const o = k.o, W = k.W, D = k.D;
    const col = o.color || PAL[Math.floor(hash(Math.round(o.x * 3), Math.round(o.y * 3)) * PAL.length)];
    const suv = !!o.suv;
    const b0 = 5, b1 = suv ? 16 : 13, zt = suv ? 28 : 23;
    const tail = o.braking ? '#ff2a2a' : '#b3202a';
    k.shadow(0.0, 0.04, W, D - 0.0, 0.32);
    const r = suv ? 4.8 : 4.3;
    for (const [u, v] of [[0.13, 0.55], [W - 0.13, 0.55], [0.13, D - 0.58], [W - 0.13, D - 0.58]]) wheel(k, u, v, r, 0);
    // alt gövde: arka bagaj, orta, kaput (kaput önde hafif eğimli)
    k.box(0.1, 0.12, W - 0.1, D - 0.32, b0, b1, col, { deco: [
      { dir: 'N', u0: 0.06, u1: 0.26, z0: b1 - 5, z1: b1 - 2, color: tail, raw: true },
      { dir: 'N', u0: 0.74, u1: 0.94, z0: b1 - 5, z1: b1 - 2, color: tail, raw: true },
      { dir: 'N', u0: 0.36, u1: 0.64, z0: b0 + 3, z1: b0 + 6, color: '#e9edf0', raw: true },
      { dir: 'E', u0: 0.02, u1: 0.98, z0: b0, z1: b0 + 1.6, color: '#1f262c', raw: true },
      { dir: 'W', u0: 0.02, u1: 0.98, z0: b0, z1: b0 + 1.6, color: '#1f262c', raw: true },
    ] });
    // eğimli kaput + ön yüz (farlar, panjur)
    k.quad3([[0.1, D - 0.32, b1], [W - 0.1, D - 0.32, b1], [W - 0.1, D - 0.1, b1 - 2.5], [0.1, D - 0.1, b1 - 2.5]], col);
    k.box(0.1, D - 0.32, W - 0.1, D - 0.1, b0, b1 - 2.5, col, { deco: [
      { dir: 'S', u0: 0.05, u1: 0.25, z0: b1 - 6.5, z1: b1 - 3.5, color: '#fff6c8', raw: true },
      { dir: 'S', u0: 0.75, u1: 0.95, z0: b1 - 6.5, z1: b1 - 3.5, color: '#fff6c8', raw: true },
      { dir: 'S', u0: 0.32, u1: 0.68, z0: b0 + 2.5, z1: b1 - 5, color: '#1f262c', raw: true },
    ], edge: false });
    // tamponlar
    k.box(0.07, D - 0.12, W - 0.07, D - 0.03, b0 - 1.5, b0 + 3.5, '#2a3138');
    k.box(0.07, 0.03, W - 0.07, 0.13, b0 - 1.5, b0 + 3.5, '#2a3138');
    // kabin
    if (suv) cabin(k, { u0: 0.14, u1: W - 0.14, vb0: D * 0.12, vb1: D * 0.66, vt0: D * 0.14, vt1: D * 0.56, zb: b1, zt, body: col, windows: [[0.06, 0.34], [0.4, 0.66], [0.72, 0.94]] });
    else cabin(k, { u0: 0.14, u1: W - 0.14, vb0: D * 0.26, vb1: D * 0.66, vt0: D * 0.34, vt1: D * 0.56, zb: b1, zt, body: col });
    if (suv) { k.box(0.2, D * 0.18, 0.25, D * 0.52, zt, zt + 1.6, '#3b4248'); k.box(W - 0.25, D * 0.18, W - 0.2, D * 0.52, zt, zt + 1.6, '#3b4248'); }
    mirrors(k, W, D * 0.64, b1 + 1, col);
    headGlow(k, W, D);
  });

  // ================================================================ Ambulans
  // Eğimli kaputlu kabin, yüksek hasta modülü, kırmızı şeritler, arka çift kapı, yan hilal + artı amblemi,
  // tavanda kırmızı-mavi ışık barı (o.lights: yanıp söner), yan aynalar, jantlı tekerlekler.
  R('ambulance', (k) => {
    const W = k.W, D = k.D, o = k.o;
    const z0 = 5, mod = D * 0.66, roofZ = 42;
    k.shadow(0.0, 0.05, W, D - 0.02, 0.34);
    for (const [u, v] of [[0.14, 0.52], [W - 0.14, 0.52], [0.14, D - 0.62], [W - 0.14, D - 0.62]]) wheel(k, u, v, 6, 0);
    // hasta modülü (arka): beyaz kutu, kırmızı ve mavi şerit, yan pencere, arka çift kapı
    k.box(0.06, 0.06, W - 0.06, mod, z0, roofZ, '#f5f7f9', { deco: [
      { dir: 'E', u0: 0.03, u1: 0.97, z0: 13, z1: 19, color: '#d62828', raw: true },
      { dir: 'W', u0: 0.03, u1: 0.97, z0: 13, z1: 19, color: '#d62828', raw: true },
      { dir: 'E', u0: 0.03, u1: 0.97, z0: 20, z1: 22, color: '#1f5fbf', raw: true },
      { dir: 'W', u0: 0.03, u1: 0.97, z0: 20, z1: 22, color: '#1f5fbf', raw: true },
      { dir: 'E', u0: 0.62, u1: 0.86, z0: 27, z1: 35, color: GLASS, raw: true }, { dir: 'W', u0: 0.14, u1: 0.38, z0: 27, z1: 35, color: GLASS, raw: true },
      // arka çift kapı: iki panel, camlar, kollar, stop lambaları
      { dir: 'N', u0: 0.05, u1: 0.49, z0: 7, z1: 38, color: '#e7ecef' }, { dir: 'N', u0: 0.51, u1: 0.95, z0: 7, z1: 38, color: '#e7ecef' },
      { dir: 'N', u0: 0.12, u1: 0.42, z0: 26, z1: 34, color: GLASS, raw: true }, { dir: 'N', u0: 0.58, u1: 0.88, z0: 26, z1: 34, color: GLASS, raw: true },
      { dir: 'N', u0: 0.05, u1: 0.95, z0: 13, z1: 17, color: '#d62828', raw: true },
      { dir: 'N', u0: 0.43, u1: 0.47, z0: 20, z1: 22, color: '#6f7d87', raw: true }, { dir: 'N', u0: 0.53, u1: 0.57, z0: 20, z1: 22, color: '#6f7d87', raw: true },
      { dir: 'N', u0: 0.0, u1: 0.05, z0: 9, z1: 14, color: '#c62828', raw: true }, { dir: 'N', u0: 0.95, u1: 1.0, z0: 9, z1: 14, color: '#c62828', raw: true },
    ], top: '#e9edf0' });
    // yan amblem: kırmızı hilal + artı (modülün yan yüzlerinde)
    for (const side of ['E', 'W']) k.custom(side === 'E' ? W - 0.06 : 0.06, mod * 0.42, 28, (c, sx, sy) => {
      c.fillStyle = '#d62828';
      c.beginPath(); c.arc(sx - 5, sy, 4.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#f5f7f9'; c.beginPath(); c.arc(sx - 3.6, sy - 0.4, 3.9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d62828'; c.fillRect(sx + 2, sy - 1.1, 6.4, 2.2); c.fillRect(sx + 4.1, sy - 3.2, 2.2, 6.4);
    });
    // tavan: kırmızı-mavi ışık barı + tepe artı
    const flash = o.lights ? Math.floor(performance.now() / 180) % 2 : -1;
    k.box(0.16, mod - 0.22, W - 0.16, mod - 0.04, roofZ, roofZ + 4, '#2b333b', { deco: [
      { dir: '*', u0: 0.03, u1: 0.47, z0: roofZ + 0.5, z1: roofZ + 3.5, color: flash === 0 ? '#ff3b3b' : '#7a1d1d', raw: true },
      { dir: '*', u0: 0.53, u1: 0.97, z0: roofZ + 0.5, z1: roofZ + 3.5, color: flash === 1 ? '#3b8bff' : '#1d3b7a', raw: true },
    ] });
    if (flash >= 0) k.custom(W / 2, mod - 0.13, roofZ + 6, (c, sx, sy) => {
      const g = c.createRadialGradient(sx, sy, 1, sx, sy, 26);
      g.addColorStop(0, flash ? 'rgba(80,150,255,0.55)' : 'rgba(255,70,70,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, 26, 14, 0, 0, Math.PI * 2); c.fill();
    });
    k.custom(W / 2, mod * 0.45, roofZ + 0.5, (c, sx, sy) => { c.fillStyle = '#d62828'; c.fillRect(sx - 7, sy - 2, 14, 4); c.fillRect(sx - 2, sy - 7, 4, 14); });
    // kabin: alt gövde + eğimli kaput + ön cam
    const cb = 20, ct = 35;
    k.box(0.08, mod, W - 0.08, D - 0.34, z0, cb, '#f5f7f9', { deco: [
      { dir: 'E', u0: 0, u1: 1, z0: 13, z1: 19, color: '#d62828', raw: true }, { dir: 'W', u0: 0, u1: 1, z0: 13, z1: 19, color: '#d62828', raw: true },
    ] });
    k.quad3([[0.08, D - 0.34, cb], [W - 0.08, D - 0.34, cb], [W - 0.08, D - 0.08, cb - 4], [0.08, D - 0.08, cb - 4]], '#f5f7f9');
    k.box(0.08, D - 0.34, W - 0.08, D - 0.08, z0, cb - 4, '#f5f7f9', { deco: [
      { dir: 'S', u0: 0.05, u1: 0.22, z0: 9, z1: 12.5, color: '#fff6c8', raw: true }, { dir: 'S', u0: 0.78, u1: 0.95, z0: 9, z1: 12.5, color: '#fff6c8', raw: true },
      { dir: 'S', u0: 0.3, u1: 0.7, z0: 7, z1: 11, color: '#1f262c', raw: true },
    ], edge: false });
    cabin(k, { u0: 0.1, u1: W - 0.1, vb0: mod, vb1: D - 0.36, vt0: mod, vt1: D - 0.6, zb: cb, zt: ct, body: '#f5f7f9', rearGlass: false, windows: [[0.12, 0.88]] });
    k.box(0.06, D - 0.1, W - 0.06, D - 0.02, z0 - 1, z0 + 4, '#2a3138');
    mirrors(k, W, D - 0.42, cb + 2, '#e9edf0');
    headGlow(k, W, D);
  });

  // ================================================================ Lojistik kargo kamyoneti
  R('logistics_truck', (k) => {
    const W = k.W, D = k.D;
    const z0 = 6, box = D * 0.7, top = 48;
    k.shadow(0.0, 0.04, W, D - 0.02, 0.34);
    for (const [u, v] of [[0.13, 0.5], [W - 0.13, 0.5], [0.13, 0.95], [W - 0.13, 0.95], [0.13, D - 0.6], [W - 0.13, D - 0.6]]) wheel(k, u, v, 6, 0);
    // yüksek kapalı kasa: medikal depo logosu, arka kapı, stop lambaları
    k.box(0.04, 0.04, W - 0.04, box, z0, top, '#f6f8fa', { deco: [
      { dir: 'E', u0: 0.03, u1: 0.97, z0: 12, z1: 16, color: '#2ec4b6', raw: true }, { dir: 'W', u0: 0.03, u1: 0.97, z0: 12, z1: 16, color: '#2ec4b6', raw: true },
      { dir: 'E', u0: 0.03, u1: 0.97, z0: 8, z1: 10, color: '#0f5e66', raw: true }, { dir: 'W', u0: 0.03, u1: 0.97, z0: 8, z1: 10, color: '#0f5e66', raw: true },
      { dir: 'N', u0: 0.05, u1: 0.49, z0: 9, z1: 45, color: '#e2e7eb' }, { dir: 'N', u0: 0.51, u1: 0.95, z0: 9, z1: 45, color: '#e2e7eb' },
      { dir: 'N', u0: 0.44, u1: 0.48, z0: 24, z1: 30, color: '#6f7d87', raw: true }, { dir: 'N', u0: 0.52, u1: 0.56, z0: 24, z1: 30, color: '#6f7d87', raw: true },
      { dir: 'N', u0: 0.0, u1: 0.06, z0: 10, z1: 16, color: '#c62828', raw: true }, { dir: 'N', u0: 0.94, u1: 1.0, z0: 10, z1: 16, color: '#c62828', raw: true },
      { dir: 'N', u0: 0.0, u1: 0.06, z0: 16, z1: 18, color: '#f2a93b', raw: true }, { dir: 'N', u0: 0.94, u1: 1.0, z0: 16, z1: 18, color: '#f2a93b', raw: true },
    ], top: '#e9edf0' });
    // kasa yanlarında "MedDepo" logosu: turkuaz rozet içinde kırmızı artı + yazı
    for (const side of ['E', 'W']) k.custom(side === 'E' ? W - 0.04 : 0.04, box * 0.5, 30, (c, sx, sy) => {
      c.fillStyle = '#0f5e66'; c.beginPath(); c.arc(sx - 9, sy, 6.5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(sx - 12.5, sy - 1.3, 7, 2.6); c.fillRect(sx - 10.3, sy - 3.5, 2.6, 7);
      c.fillStyle = '#0f5e66'; c.font = '900 6.5px system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('MedDepo', sx - 1, sy - 1.5);
      c.fillStyle = '#d62828'; c.font = '700 4px system-ui'; c.fillText('TIBBİ LOJİSTİK', sx - 1, sy + 4);
    });
    // kabin: alt gövde, eğik kaput, ön cam
    const cb = 22, ct = 38;
    k.box(0.08, box + 0.03, W - 0.08, D - 0.3, z0, cb, '#2ec4b6', { deco: [
      { dir: 'E', u0: 0, u1: 1, z0: 8, z1: 10, color: '#0f5e66', raw: true }, { dir: 'W', u0: 0, u1: 1, z0: 8, z1: 10, color: '#0f5e66', raw: true },
    ] });
    k.quad3([[0.08, D - 0.3, cb], [W - 0.08, D - 0.3, cb], [W - 0.08, D - 0.08, cb - 4], [0.08, D - 0.08, cb - 4]], '#2ec4b6');
    k.box(0.08, D - 0.3, W - 0.08, D - 0.08, z0, cb - 4, '#2ec4b6', { deco: [
      { dir: 'S', u0: 0.05, u1: 0.22, z0: 10, z1: 13.5, color: '#fff6c8', raw: true }, { dir: 'S', u0: 0.78, u1: 0.95, z0: 10, z1: 13.5, color: '#fff6c8', raw: true },
      { dir: 'S', u0: 0.3, u1: 0.7, z0: 8, z1: 12, color: '#1f262c', raw: true },
    ], edge: false });
    cabin(k, { u0: 0.1, u1: W - 0.1, vb0: box + 0.03, vb1: D - 0.32, vt0: box + 0.03, vt1: D - 0.55, zb: cb, zt: ct, body: '#2ec4b6', rearGlass: false, windows: [[0.12, 0.88]] });
    k.box(0.06, D - 0.1, W - 0.06, D - 0.02, z0 - 1, z0 + 4, '#2a3138');
    mirrors(k, W, D - 0.4, cb + 2, '#2ec4b6');
    headGlow(k, W, D);
  });

  // ================================================================ Şehir otobüsü
  R('city_bus', (k) => {
    const W = k.W, D = k.D;
    const z0 = 5, top = 40;
    k.shadow(0.0, 0.05, W, D - 0.02, 0.32);
    for (const [u, v] of [[0.13, 0.62], [W - 0.13, 0.62], [0.13, D - 0.7], [W - 0.13, D - 0.7]]) wheel(k, u, v, 5.6, 0);
    const win = [];
    const n = Math.round(D * 2.2);
    for (let i = 0; i < n; i++) for (const s of ['E', 'W']) win.push({ dir: s, u0: 0.04 + i * (0.86 / n), u1: 0.04 + (i + 0.82) * (0.86 / n), z0: 22, z1: 34, color: GLASS, raw: true });
    win.push({ dir: 'E', u0: 0, u1: 1, z0: 12, z1: 16, color: '#2ec4b6', raw: true }, { dir: 'W', u0: 0, u1: 1, z0: 12, z1: 16, color: '#2ec4b6', raw: true });
    win.push({ dir: 'N', u0: 0.1, u1: 0.9, z0: 24, z1: 34, color: GLASS, raw: true }, { dir: 'N', u0: 0.04, u1: 0.16, z0: 9, z1: 13, color: '#c62828', raw: true }, { dir: 'N', u0: 0.84, u1: 0.96, z0: 9, z1: 13, color: '#c62828', raw: true });
    k.box(0.06, 0.06, W - 0.06, D - 0.36, z0, top, '#f4f6f7', { deco: win, top: '#dfe5ea' });
    // eğik ön yüz: geniş ön cam ve hat tabelası
    k.quad3([[0.06, D - 0.36, top], [W - 0.06, D - 0.36, top], [W - 0.06, D - 0.08, 18], [0.06, D - 0.08, 18]], GLASS, { auto: false });
    k.quad3([[0.06, D - 0.36, top], [W - 0.06, D - 0.36, top], [W - 0.06, D - 0.3, top - 6], [0.06, D - 0.3, top - 6]], '#2b333b', { auto: false });
    k.box(0.06, D - 0.36, W - 0.06, D - 0.08, z0, 18, '#f4f6f7', { deco: [
      { dir: 'S', u0: 0.06, u1: 0.24, z0: 9, z1: 12.5, color: '#fff6c8', raw: true }, { dir: 'S', u0: 0.76, u1: 0.94, z0: 9, z1: 12.5, color: '#fff6c8', raw: true },
      { dir: 'S', u0: 0, u1: 1, z0: 13, z1: 15, color: '#2ec4b6', raw: true },
    ], edge: false });
    k.custom(W / 2, D - 0.33, top - 3, (c, sx, sy) => { c.fillStyle = '#ffd166'; c.font = '800 5.5px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('34 · HASTANE', sx, sy); });
    mirrors(k, W, D - 0.3, 24, '#2b333b');
    headGlow(k, W, D);
  });
})();
