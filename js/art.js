// Vita Hospital — Özgün prosedürel 2.5D izometrik çizim kiti
//
// Oyundaki tüm eşya, cihaz ve dış dünya öğeleri burada kodla çizilir; harici görsel yoktur.
// Her nesne kendi yerel çerçevesinde (u: genişlik, v: derinlik, ön yüz +v) kutu/silindir/küre
// parçalarından kurulur. Parçalar dünya koordinatına çevrilir, kamera dönüşüne göre görünen
// yüzler hesaplanır ve parça merkezlerinin derinliğine göre sıralanarak çizilir.
(function () {
  const VH = (window.VH = window.VH || {});
  const M = () => VH.map;

  // ---------------------------------------------------------------- Renk yardımcıları
  const shadeCache = new Map();
  function shade(c, f) {
    if (!c || c[0] !== '#' || !f) return c;
    const key = c + f;
    let r = shadeCache.get(key);
    if (r) return r;
    const n = parseInt(c.slice(1), 16);
    let R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    R = Math.round(R + (t - R) * p); G = Math.round(G + (t - G) * p); B = Math.round(B + (t - B) * p);
    r = '#' + ((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1);
    shadeCache.set(key, r);
    return r;
  }
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------------------------------------------------------------- Yerel çerçeve
  function frame(o) {
    const x0 = o.x, y0 = o.y, w = o.w || 1, h = o.h || 1;
    const sh = (o.ox || 0) / 40;
    switch (o.face) {
      case 'N': return { W: w, D: h, pt: (u, v) => [x0 + w - u - sh, y0 + h - v], dir: { S: 'N', N: 'S', E: 'W', W: 'E' } };
      case 'E': return { W: h, D: w, pt: (u, v) => [x0 + v, y0 + h - u - sh], dir: { S: 'E', N: 'W', E: 'N', W: 'S' } };
      case 'W': return { W: h, D: w, pt: (u, v) => [x0 + w - v, y0 + u + sh], dir: { S: 'W', N: 'E', E: 'S', W: 'N' } };
      default:  return { W: w, D: h, pt: (u, v) => [x0 + u + sh, y0 + v], dir: { S: 'S', N: 'N', E: 'E', W: 'W' } };
    }
  }

  // ---------------------------------------------------------------- Çizim primitifleri (dünya koordinatı)
  let ctx = null;
  const P = (x, y, z) => { const [sx, sy] = M().worldToIso(x, y); return [sx, sy - z]; };
  function poly(pts, fill, stroke, lw) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  }
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  const FACES = [[0, 1, 0, -1, 'N'], [1, 2, 1, 0, 'E'], [2, 3, 0, 1, 'S'], [3, 0, -1, 0, 'W']];
  function drawBox(x0, y0, x1, y1, z0, z1, color, opt) {
    opt = opt || {};
    const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const B = c.map(([x, y]) => P(x, y, z0)), T = c.map(([x, y]) => P(x, y, z1));
    const map = M();
    for (const [a, b, nx, ny, dir] of FACES) {
      const [rx, ry] = map.rotVec(nx, ny);
      if (rx + ry <= 0) continue;
      const col = (opt.faces && opt.faces[dir]) || color;
      poly([B[a], B[b], T[b], T[a]], shade(col, rx > ry ? -0.07 : -0.2));
      if (opt.deco) for (const d of opt.deco) {
        if (d.dir !== dir && d.dir !== '*') continue;
        const ba = B[a], bb = B[b];
        const p0 = lerp(ba, bb, d.u0), p1 = lerp(ba, bb, d.u1);
        const zz0 = d.z0 - z0, zz1 = d.z1 - z0;
        poly([[p0[0], p0[1] - zz0], [p1[0], p1[1] - zz0], [p1[0], p1[1] - zz1], [p0[0], p0[1] - zz1]], d.raw ? d.color : shade(d.color, rx > ry ? 0 : -0.12));
      }
    }
    poly(T, shade(opt.top || color, 0.1), opt.edge === false ? null : 'rgba(20,35,45,0.18)', 0.8);
    if (opt.topDeco) opt.topDeco(T);
  }

  // ---------------------------------------------------------------- Nesne kiti
  function kit(o, queue) {
    const F = frame(o);
    const zb = o.z || 0;
    const W = (u, v) => F.pt(u, v);
    const push = (u, v, z, fn) => { const [x, y] = W(u, v); queue.push({ d: M().depthAt(x, y), z, fn }); };
    const mapDir = (dir) => (dir === '*' ? '*' : F.dir[dir]);
    return {
      W: F.W, D: F.D, o,
      box(u0, v0, u1, v1, z0, z1, color, opt) {
        const a = W(u0, v0), b = W(u1, v1);
        const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
        let o2 = opt;
        if (opt && (opt.deco || opt.faces)) {
          o2 = Object.assign({}, opt);
          if (opt.deco) o2.deco = opt.deco.map((d) => Object.assign({}, d, { dir: mapDir(d.dir) }));
          if (opt.faces) { o2.faces = {}; for (const k in opt.faces) o2.faces[mapDir(k)] = opt.faces[k]; }
        }
        queue.push({ d: M().depthAt((x0 + x1) / 2, (y0 + y1) / 2), z: z0 + zb, fn: () => drawBox(x0, y0, x1, y1, z0 + zb, z1 + zb, color, o2) });
      },
      cyl(u, v, r, z0, z1, color) {
        push(u, v, z0 + zb, () => {
          const [x, y] = W(u, v);
          const [sx, sy] = P(x, y, 0);
          const yt = sy - z1 - zb, yb = sy - z0 - zb;
          const g = ctx.createLinearGradient(sx - r, 0, sx + r, 0);
          g.addColorStop(0, shade(color, -0.25)); g.addColorStop(0.45, shade(color, 0.12)); g.addColorStop(1, shade(color, -0.35));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(sx, yb, r, r / 2, 0, 0, Math.PI); ctx.lineTo(sx - r, yt); ctx.ellipse(sx, yt, r, r / 2, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
          ctx.fillStyle = shade(color, 0.18);
          ctx.beginPath(); ctx.ellipse(sx, yt, r, r / 2, 0, 0, Math.PI * 2); ctx.fill();
        });
      },
      disc(u, v, z, r, color) {
        push(u, v, z + zb, () => { const [x, y] = W(u, v); const [sx, sy] = P(x, y, z + zb); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, Math.PI * 2); ctx.fill(); });
      },
      ball(u, v, z, r, color) {
        push(u, v, z + zb, () => {
          const [x, y] = W(u, v); const [sx, sy] = P(x, y, z + zb);
          const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
          g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, shade(color, -0.25));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        });
      },
      pole(u, v, z0, z1, w, color) {
        push(u, v, z0 + zb, () => {
          const [x, y] = W(u, v); const [sx, sy] = P(x, y, 0);
          ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(sx, sy - z0 - zb); ctx.lineTo(sx, sy - z1 - zb); ctx.stroke();
        });
      },
      line(u0, v0, z0, u1, v1, z1, w, color) {
        push((u0 + u1) / 2, (v0 + v1) / 2, Math.max(z0, z1) + zb, () => {
          const a = W(u0, v0), b = W(u1, v1); const p = P(a[0], a[1], z0 + zb), q = P(b[0], b[1], z1 + zb);
          ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        });
      },
      flat(pts, z, color, stroke) {
        // zemine yatık çokgen (yerel köşe listesi)
        const cu = pts.reduce((s, p) => s + p[0], 0) / pts.length, cv = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        push(cu, cv, z + zb - 0.5, () => poly(pts.map(([u, v]) => { const [x, y] = W(u, v); return P(x, y, z + zb); }), color, stroke, 1));
      },
      custom(u, v, z, fn) {
        push(u, v, z + zb, () => { const [x, y] = W(u, v); const [sx, sy] = P(x, y, z + zb); fn(ctx, sx, sy, x, y); });
      },
      shadow(u0, v0, u1, v1, a) {
        queue.push({ d: -1e9, z: 0, fn: () => {
          const pts = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => { const [x, y] = W(u, v); return P(x, y, zb); });
          poly(pts, `rgba(10,30,40,${a || 0.16})`);
        } });
      },
    };
  }

  // ---------------------------------------------------------------- Palet
  const C = {
    white: '#eef2f4', offwhite: '#f6f3ec', steel: '#a9b5bd', steelD: '#6f7d87', dark: '#2b333b', screen: '#103b47', glow: '#5ff0d8',
    teal: '#2ec4b6', blue: '#4a7fb5', navy: '#2e4a6b', mint: '#bfe3d6', red: '#d64545', yellow: '#f2c94c', wood: '#c39a6b', woodD: '#9b7350',
    green: '#2f9e44', leaf: '#4f9a4a', leafD: '#3d7f3b', trunk: '#7a5636', glass: 'rgba(170,215,235,0.55)',
  };
  const screenDeco = (dir, u0, u1, z0, z1, col) => ({ dir, u0, u1, z0, z1, color: col || C.screen, raw: true });

  function ecgLine(ctx2, sx, sy, w, col) {
    ctx2.strokeStyle = col || '#66ff99'; ctx2.lineWidth = 1.2;
    ctx2.beginPath();
    const pts = [[-1, 0], [-0.5, 0], [-0.35, -0.6], [-0.2, 0.5], [-0.05, 0], [0.4, 0], [0.5, -0.4], [0.6, 0], [1, 0]];
    pts.forEach(([a, b], i) => (i ? ctx2.lineTo(sx + a * w, sy + b * 4) : ctx2.moveTo(sx + a * w, sy + b * 4)));
    ctx2.stroke();
  }

  // ---------------------------------------------------------------- Nesne türleri
  // Her fonksiyon (k) alır: k.box/cyl/disc/ball/pole/line/flat/custom/shadow ile parçalarını ekler.
  const K = {
    // ---------- Resepsiyon & bekleme
    reception_desk(k) {
      k.shadow(0.05, 0.25, 1.95, 1);
      k.box(0.1, 0.35, 1.9, 0.95, 0, 24, '#e9e2d6', { deco: [{ dir: 'S', u0: 0.03, u1: 0.97, z0: 9, z1: 13, color: C.teal }, { dir: 'S', u0: 0, u1: 1, z0: 0, z1: 4, color: C.woodD }] });
      k.box(0.05, 0.3, 1.95, 1.0, 24, 27, '#f7f4ee');
      k.box(1.3, 0.45, 1.45, 0.55, 27, 30, C.dark);
      k.box(1.12, 0.47, 1.63, 0.52, 30, 41, C.dark, { deco: [screenDeco('N', 0.1, 0.9, 32, 40, '#1d6f86')] });
      k.box(0.95, 0.6, 1.3, 0.75, 27, 28, '#dfe3e6');
      k.cyl(0.35, 0.65, 4, 27, 33, '#c96f4a'); k.ball(0.35, 0.65, 38, 6, C.leaf);
    },
    queue_display(k) {
      k.shadow(0.3, 0.4, 0.7, 0.7);
      k.disc(0.5, 0.55, 0, 9, C.steelD);
      k.pole(0.5, 0.55, 0, 32, 3, C.steelD);
      k.box(0.12, 0.5, 0.88, 0.6, 30, 58, C.dark, { deco: [screenDeco('S', 0.06, 0.94, 33, 55, '#123a4a')] });
      k.custom(0.5, 0.6, 44, (c, sx, sy) => { c.fillStyle = '#5ff0d8'; c.font = '700 8px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SIRA', sx, sy - 5); c.fillStyle = '#ffd166'; c.fillText('A-0' + (Math.floor(performance.now() / 4000) % 90 + 10), sx, sy + 5); });
    },
    directory_sign(k) {
      k.shadow(0.15, 0.4, 0.85, 0.6);
      k.pole(0.2, 0.5, 0, 22, 3, C.steelD); k.pole(0.8, 0.5, 0, 22, 3, C.steelD);
      k.box(0.1, 0.46, 0.9, 0.54, 18, 54, '#2e6f95', { deco: [
        { dir: '*', u0: 0.1, u1: 0.9, z0: 46, z1: 50, color: '#ffffff', raw: true },
        { dir: '*', u0: 0.1, u1: 0.7, z0: 38, z1: 41, color: '#d6ecf5', raw: true },
        { dir: '*', u0: 0.1, u1: 0.8, z0: 31, z1: 34, color: '#d6ecf5', raw: true },
        { dir: '*', u0: 0.1, u1: 0.6, z0: 24, z1: 27, color: '#d6ecf5', raw: true }] });
    },
    barrier_posts(k) {
      for (const u of [0.2, 0.8]) { k.disc(u, 0.5, 0, 6, C.steelD); k.cyl(u, 0.5, 2.5, 0, 26, C.steel); }
      k.line(0.2, 0.5, 23, 0.8, 0.5, 23, 3, '#c0392b');
    },
    column(k) {
      k.shadow(0.15, 0.15, 0.85, 0.85, 0.2);
      k.box(0.2, 0.2, 0.8, 0.8, 0, 66, '#e3e7ea', { deco: [{ dir: '*', u0: 0, u1: 1, z0: 0, z1: 5, color: '#9fb4bf' }, { dir: '*', u0: 0, u1: 1, z0: 30, z1: 33, color: '#9fd3c7' }] });
    },
    chair(k) { chairBase(k, '#6aa58f'); },
    waiting_chair(k) { chairBase(k, '#4a7fb5'); },
    waiting_row(k) {
      k.shadow(0.05, 0.25, 1.95, 0.85);
      k.box(0.05, 0.45, 1.95, 0.55, 6, 9, C.steelD);
      for (const u of [0.15, 1.85]) k.pole(u, 0.5, 0, 9, 2.5, C.steelD);
      for (let i = 0; i < 3; i++) {
        const u0 = 0.08 + i * 0.63;
        k.box(u0, 0.3, u0 + 0.55, 0.78, 10, 14, '#3f6f9f');
        k.box(u0, 0.25, u0 + 0.55, 0.33, 14, 32, '#3f6f9f');
      }
    },
    vending(k) {
      k.shadow(0.05, 0.2, 0.95, 0.9, 0.2);
      const deco = [screenDeco('S', 0.08, 0.66, 18, 56, '#1d2f3d'), { dir: 'S', u0: 0.72, u1: 0.92, z0: 36, z1: 48, color: '#222', raw: true }, { dir: 'S', u0: 0.1, u1: 0.64, z0: 6, z1: 13, color: '#111', raw: true }];
      const cols = ['#ffd166', '#06d6a0', '#ef476f', '#118ab2'];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) deco.push({ dir: 'S', u0: 0.12 + c * 0.18, u1: 0.24 + c * 0.18, z0: 21 + r * 9, z1: 26 + r * 9, color: cols[(r + c) % 4], raw: true });
      k.box(0.1, 0.25, 0.9, 0.85, 0, 60, '#c0392b', { deco, top: '#a93226' });
    },
    water_cooler(k) {
      k.shadow(0.25, 0.25, 0.75, 0.75);
      k.box(0.3, 0.3, 0.7, 0.7, 0, 30, C.white, { deco: [{ dir: 'S', u0: 0.2, u1: 0.8, z0: 16, z1: 24, color: '#9aa7b0' }] });
      k.cyl(0.5, 0.5, 8, 30, 48, '#7fb8e6');
    },
    play_mat(k) {
      const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'];
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) k.flat([[0.1 + i * 0.9, 0.1 + j * 0.9], [0.95 + i * 0.9, 0.1 + j * 0.9], [0.95 + i * 0.9, 0.95 + j * 0.9], [0.1 + i * 0.9, 0.95 + j * 0.9]], 0.5, cols[(i + j * 2) % 4]);
      k.box(0.5, 0.5, 0.7, 0.7, 0, 6, '#ef476f'); k.box(1.2, 0.6, 1.4, 0.8, 0, 6, '#118ab2'); k.box(1.25, 0.62, 1.38, 0.75, 6, 11, '#ffd166');
      k.ball(0.8, 1.4, 6, 6, '#f78c6b');
    },

    // ---------- Muayene
    desk(k) {
      k.shadow(0.05, 0.1, k.W - 0.05, 0.9);
      const W = k.W;
      k.box(0.1, 0.2, 0.22, 0.8, 0, 26, C.woodD); k.box(W - 0.22, 0.2, W - 0.1, 0.8, 0, 26, C.woodD);
      k.box(0.22, 0.7, W - 0.22, 0.76, 8, 26, C.woodD);
      k.box(0.05, 0.15, W - 0.05, 0.85, 26, 29, C.wood);
      const mu = W / 2;
      k.box(mu - 0.06, 0.3, mu + 0.06, 0.38, 29, 32, C.dark);
      k.box(mu - 0.28, 0.3, mu + 0.28, 0.35, 32, 46, C.dark, { deco: [screenDeco('S', 0.08, 0.92, 34, 44, '#1d6f86'), screenDeco('N', 0.08, 0.92, 34, 44, '#1d6f86')] });
      k.box(mu - 0.2, 0.5, mu + 0.2, 0.62, 29, 30, '#d9dee2');
      k.box(0.3, 0.45, 0.6, 0.75, 29, 30, '#ffffff');
      k.cyl(W - 0.35, 0.5, 3.5, 29, 35, '#e07a5f');
    },
    stool(k) {
      k.disc(0.5, 0.5, 0, 8, C.steelD); k.pole(0.5, 0.5, 0, 16, 3, C.steelD);
      k.cyl(0.5, 0.5, 9, 16, 20, '#3d5664');
    },
    exam_table(k) {
      const W = k.W;
      k.shadow(0.1, 0.2, W - 0.1, 0.8);
      k.box(0.18, 0.28, W - 0.18, 0.72, 0, 15, '#dfe5ea');
      k.box(0.1, 0.22, W - 0.1, 0.78, 15, 21, '#3a8fb7');
      k.box(W - 0.45, 0.28, W - 0.15, 0.72, 21, 25, '#ffffff');
      k.box(0.3, 0.3, W - 0.55, 0.7, 21, 21.6, '#f4f8fa', { edge: false });
    },
    screen(k) {
      k.shadow(0.05, 0.4, 0.95, 0.6);
      for (const u of [0.08, 0.5, 0.92]) k.pole(u, 0.5, 0, 46, 2.5, C.steelD);
      k.box(0.1, 0.47, 0.48, 0.53, 8, 42, '#a9d6e5'); k.box(0.52, 0.47, 0.9, 0.53, 8, 42, '#a9d6e5');
    },
    bp_stand(k) {
      k.disc(0.5, 0.5, 0, 9, C.steelD); k.pole(0.5, 0.5, 0, 40, 2.5, C.steel);
      k.box(0.32, 0.42, 0.68, 0.6, 38, 50, C.white, { deco: [screenDeco('S', 0.15, 0.85, 42, 48, '#1b4d3e')] });
      k.box(0.6, 0.45, 0.75, 0.6, 30, 34, C.navy);
    },
    // Küçük masa üstü eşyalar (o.z ile yükseltilir)
    prop_stethoscope(k) {
      k.custom(0.5, 0.5, 0, (c, sx, sy) => { c.strokeStyle = '#1f2a33'; c.lineWidth = 1.6; c.beginPath(); c.ellipse(sx, sy, 7, 3.5, 0, 0, Math.PI * 1.6); c.stroke(); c.fillStyle = '#c0c7cc'; c.beginPath(); c.arc(sx + 5, sy + 2, 2.2, 0, Math.PI * 2); c.fill(); });
    },
    prop_hammer(k) { k.box(0.35, 0.45, 0.65, 0.5, 0, 1.5, '#9aa7b0'); k.box(0.6, 0.4, 0.7, 0.55, 0, 3, '#e07a5f'); },
    prop_penlight(k) { k.box(0.3, 0.48, 0.7, 0.52, 0, 1.5, '#c0c7cc'); k.box(0.66, 0.47, 0.7, 0.53, 0, 2, '#ffd166'); },
    prop_tray(k) { k.box(0.25, 0.3, 0.75, 0.7, 0, 2, '#cfd8dc'); k.line(0.35, 0.4, 2.5, 0.6, 0.45, 2.5, 1, '#6f7d87'); k.line(0.35, 0.55, 2.5, 0.65, 0.6, 2.5, 1, '#6f7d87'); },
    prop_tubes(k) {
      k.box(0.3, 0.42, 0.7, 0.58, 0, 3, '#e3e7ea');
      ['#c0392b', '#7b5ea7', '#2f9e44', '#f2c94c', '#3a8fb7'].forEach((col, i) => k.cyl(0.34 + i * 0.08, 0.5, 1.4, 3, 9, col));
    },
    prop_bottles(k) { [0.35, 0.5, 0.65].forEach((u, i) => k.cyl(u, 0.5 + (i % 2) * 0.08, 2.5, 0, 7 + i, i === 1 ? '#f2f2f2' : '#c98a3b')); },
    prop_pills(k) { k.box(0.3, 0.35, 0.6, 0.55, 0, 2, '#dfe5ea'); k.box(0.5, 0.5, 0.75, 0.68, 0, 2.5, '#f4f8fa'); },
    prop_box_blue(k) { k.box(0.3, 0.38, 0.7, 0.62, 0, 6, '#6fa8dc', { top: '#cfe2f3' }); },
    prop_box_purple(k) { k.box(0.3, 0.38, 0.7, 0.62, 0, 6, '#8e7cc3', { top: '#d9d2e9' }); },
    prop_collar(k) { k.custom(0.5, 0.5, 2, (c, sx, sy) => { c.strokeStyle = '#d9c3a5'; c.lineWidth = 4; c.beginPath(); c.ellipse(sx, sy, 9, 4.5, 0, 0, Math.PI * 2); c.stroke(); }); },

    // ---------- Laboratuvar
    blood_chair(k) {
      k.shadow(0.15, 0.2, 0.85, 0.85);
      k.box(0.3, 0.35, 0.7, 0.75, 0, 10, C.dark);
      k.box(0.15, 0.3, 0.85, 0.82, 10, 18, '#8e3b46');
      k.box(0.15, 0.16, 0.85, 0.34, 18, 40, '#8e3b46');
      k.box(0.82, 0.35, 0.98, 0.78, 18, 21, '#a14b56');
    },
    cart(k) {
      k.shadow(0.15, 0.2, 0.85, 0.8);
      for (const [u, v] of [[0.18, 0.22], [0.82, 0.22], [0.18, 0.78], [0.82, 0.78]]) k.pole(u, v, 0, 24, 2, C.steelD);
      k.box(0.15, 0.2, 0.85, 0.8, 5, 7, '#cfd8dc'); k.box(0.15, 0.2, 0.85, 0.8, 22, 24, '#dfe7eb');
      k.box(0.3, 0.3, 0.55, 0.5, 7, 13, '#6fa8dc');
    },
    autoclave(k) {
      k.shadow(0.05, 0.15, 0.95, 0.9, 0.2);
      k.box(0.1, 0.2, 0.9, 0.85, 0, 44, C.white, { deco: [{ dir: 'S', u0: 0.15, u1: 0.85, z0: 8, z1: 36, color: '#c9d1d6' }, screenDeco('S', 0.6, 0.85, 38, 42, '#1b4d3e')] });
      k.custom(0.5, 0.85, 22, (c, sx, sy) => { c.strokeStyle = '#6f7d87'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx, sy, 9, 9, 0, 0, Math.PI * 2); c.stroke(); });
    },
    analyzer(k) {
      k.shadow(0.05, 0.15, 0.95, 0.9, 0.2);
      k.box(0.1, 0.2, 0.9, 0.85, 0, 34, '#e8e0cf', { deco: [screenDeco('S', 0.15, 0.6, 20, 30, '#103b47'), { dir: 'S', u0: 0.68, u1: 0.88, z0: 6, z1: 18, color: '#c9bfa8' }] });
      k.box(0.25, 0.3, 0.75, 0.6, 34, 37, '#b5ab95');
      for (let i = 0; i < 4; i++) k.cyl(0.33 + i * 0.12, 0.45, 1.6, 37, 43, ['#c0392b', '#7b5ea7', '#2f9e44', '#f2c94c'][i]);
    },
    vial_rack(k) {
      k.shadow(0.05, 0.25, 0.95, 0.75);
      k.box(0.1, 0.3, 0.9, 0.7, 0, 20, C.white);
      k.box(0.2, 0.4, 0.8, 0.6, 20, 24, '#cfd8dc');
      for (let i = 0; i < 6; i++) k.cyl(0.27 + i * 0.09, 0.5, 1.6, 24, 32, ['#c0392b', '#7b5ea7', '#2f9e44', '#f2c94c', '#3a8fb7', '#e07a5f'][i]);
    },
    centrifuge(k) {
      k.shadow(0.02, 0.15, 0.98, 0.9);
      k.box(0.05, 0.2, 0.95, 0.85, 0, 24, '#d5dde2', { deco: [{ dir: 'S', u0: 0.05, u1: 0.95, z0: 18, z1: 20, color: '#9fb4bf' }] });
      k.cyl(0.42, 0.52, 14, 24, 34, C.white);
      k.disc(0.42, 0.52, 34.5, 11, '#3d5664');
      k.box(0.7, 0.4, 0.88, 0.6, 24, 30, '#9aa7b0');
    },
    microscope(k) {
      k.shadow(0.02, 0.15, 0.98, 0.9);
      k.box(0.05, 0.2, 0.95, 0.85, 0, 24, '#d5dde2');
      k.box(0.38, 0.42, 0.62, 0.62, 24, 27, C.dark);
      k.pole(0.45, 0.45, 27, 42, 3, C.dark);
      k.box(0.4, 0.42, 0.62, 0.56, 38, 44, '#f4f6f7');
      k.cyl(0.5, 0.5, 2, 44, 50, C.dark);
      k.cyl(0.78, 0.55, 3, 24, 32, 'rgba(180,220,240,0.9)');
    },
    biohazard_bin(k) {
      k.shadow(0.2, 0.25, 0.8, 0.75);
      k.box(0.25, 0.3, 0.75, 0.7, 0, 24, C.red, { deco: [{ dir: 'S', u0: 0.35, u1: 0.65, z0: 9, z1: 17, color: '#f2c94c', raw: true }] });
      k.box(0.23, 0.28, 0.77, 0.72, 24, 27, C.yellow);
    },

    // ---------- Acil
    gurney(k) {
      const W = k.W;
      k.shadow(0.1, 0.22, W - 0.1, 0.78);
      for (const [u, v] of [[0.25, 0.3], [W - 0.25, 0.3], [0.25, 0.7], [W - 0.25, 0.7]]) { k.pole(u, v, 2, 9, 2, C.steelD); k.disc(u, v, 1, 3, C.dark); }
      k.box(0.12, 0.26, W - 0.12, 0.74, 9, 12, C.steel);
      k.box(0.16, 0.28, W - 0.16, 0.72, 12, 18, '#3f5f78');
      k.box(W - 0.42, 0.32, W - 0.2, 0.68, 18, 22, '#ffffff');
      k.box(0.2, 0.22, W - 0.2, 0.25, 14, 22, C.steel); k.box(0.2, 0.75, W - 0.2, 0.78, 14, 22, C.steel);
    },
    monitor(k) {
      k.disc(0.5, 0.5, 0, 9, C.dark); k.pole(0.5, 0.5, 0, 34, 2.5, C.steel);
      k.box(0.22, 0.42, 0.78, 0.56, 32, 52, C.dark, { deco: [screenDeco('S', 0.08, 0.92, 35, 50, '#062a22'), screenDeco('N', 0.08, 0.92, 35, 50, '#062a22')] });
      k.custom(0.5, 0.56, 44, (c, sx, sy) => ecgLine(c, sx, sy, 9));
    },
    iv_stand(k) {
      k.custom(0.5, 0.5, 0, (c, sx, sy) => { c.strokeStyle = C.steelD; c.lineWidth = 2; c.beginPath(); for (const a of [0, 1.26, 2.51, 3.77, 5.03]) { c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * 9, sy + Math.sin(a) * 4.5); } c.stroke(); });
      k.pole(0.5, 0.5, 0, 58, 2, C.steel);
      k.custom(0.5, 0.5, 58, (c, sx, sy) => {
        c.strokeStyle = C.steel; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - 7, sy); c.lineTo(sx + 7, sy); c.stroke();
        c.fillStyle = 'rgba(200,235,255,0.85)'; c.strokeStyle = '#7fb8e6'; c.lineWidth = 1;
        c.beginPath(); if (c.roundRect) c.roundRect(sx + 2, sy + 1, 7, 11, 2); else c.rect(sx + 2, sy + 1, 7, 11); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(127,184,230,0.8)'; c.beginPath(); c.moveTo(sx + 5.5, sy + 12); c.quadraticCurveTo(sx + 9, sy + 28, sx + 3, sy + 36); c.stroke();
      });
    },
    ventilator(k) {
      k.shadow(0.15, 0.25, 0.85, 0.8);
      k.box(0.2, 0.3, 0.8, 0.75, 0, 30, C.white, { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 22, z1: 26, color: C.teal }] });
      k.box(0.28, 0.38, 0.72, 0.46, 30, 46, C.dark, { deco: [screenDeco('S', 0.08, 0.92, 32, 44, '#062a22'), screenDeco('N', 0.08, 0.92, 32, 44, '#062a22')] });
      k.custom(0.8, 0.6, 20, (c, sx, sy) => { c.strokeStyle = '#7fb8e6'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(sx, sy); c.bezierCurveTo(sx + 14, sy - 6, sx + 14, sy + 14, sx + 4, sy + 16); c.stroke(); });
    },
    defibrillator(k) {
      k.shadow(0.15, 0.25, 0.85, 0.8);
      k.box(0.2, 0.3, 0.8, 0.75, 0, 28, '#c0392b', { deco: [{ dir: '*', u0: 0.1, u1: 0.9, z0: 10, z1: 12, color: '#922b21' }] });
      k.box(0.25, 0.35, 0.75, 0.7, 28, 38, '#f2c94c', { deco: [screenDeco('S', 0.15, 0.6, 30, 36, '#062a22')] });
      k.box(0.3, 0.42, 0.42, 0.6, 38, 41, C.dark); k.box(0.55, 0.42, 0.67, 0.6, 38, 41, C.dark);
    },
    oxygen(k) {
      k.shadow(0.15, 0.3, 0.85, 0.7);
      k.box(0.18, 0.35, 0.82, 0.65, 0, 4, C.steelD);
      for (const u of [0.36, 0.64]) { k.cyl(u, 0.5, 7, 4, 46, '#2f9e44'); k.cyl(u, 0.5, 4, 46, 51, C.white); }
      k.custom(0.5, 0.5, 52, (c, sx, sy) => { c.fillStyle = '#f4f6f7'; c.strokeStyle = C.dark; c.beginPath(); c.arc(sx, sy, 3.5, 0, Math.PI * 2); c.fill(); c.stroke(); });
      k.pole(0.18, 0.5, 4, 40, 2, C.steelD);
    },
    counter(k) {
      const W = k.W;
      k.shadow(0.05, 0.25, W - 0.05, 0.85);
      k.box(0.05, 0.3, W - 0.05, 0.8, 0, 24, '#dfe5ea', { deco: [{ dir: 'S', u0: 0.02, u1: 0.98, z0: 10, z1: 14, color: C.teal }, { dir: 'S', u0: 0, u1: 1, z0: 0, z1: 3, color: '#8fa3ad' }] });
      k.box(0.02, 0.25, W - 0.02, 0.85, 24, 27, '#f7f4ee');
    },
    wheelchair(k) {
      k.shadow(0.2, 0.25, 0.8, 0.8);
      k.box(0.28, 0.32, 0.72, 0.68, 12, 16, '#3a5a80'); k.box(0.28, 0.26, 0.72, 0.33, 16, 34, '#3a5a80');
      for (const u of [0.2, 0.8]) k.custom(u, 0.48, 11, (c, sx, sy) => { c.strokeStyle = '#2b333b'; c.lineWidth = 2; c.beginPath(); c.ellipse(sx, sy, 6, 10, 0, 0, Math.PI * 2); c.stroke(); });
      k.box(0.35, 0.7, 0.65, 0.82, 4, 6, C.steelD);
    },
    floor_decal(k) {
      const D = k.D;
      k.flat([[0.5, 0.1], [0.9, D / 2], [0.5, D - 0.1], [0.1, D / 2]], 0.4, 'rgba(242,201,76,0.8)', '#b8860b');
      k.custom(0.5, D / 2, 0.5, (c, sx, sy) => { c.fillStyle = '#5c4400'; c.font = '700 12px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', sx, sy); });
    },
    ambulance_bay(k) {
      const W = k.W, D = k.D;
      k.flat([[0.05, 0.05], [W - 0.05, 0.05], [W - 0.05, D - 0.05], [0.05, D - 0.05]], 0.3, 'rgba(214,69,69,0.18)', 'rgba(255,255,255,0.9)');
      for (let i = 0; i < 6; i++) { const v = 0.3 + i * 0.6; k.flat([[0.15, v], [W - 0.15, v + 0.25], [W - 0.15, v + 0.4], [0.15, v + 0.15]], 0.4, 'rgba(255,255,255,0.65)'); }
      k.custom(W / 2, D / 2, 1, (c, sx, sy) => { c.fillStyle = '#ffffff'; c.font = '800 10px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('AMBULANS', sx, sy); });
    },

    // ---------- Eczane & ofis
    med_cabinet(k) {
      k.shadow(0.05, 0.15, 0.95, 0.65, 0.2);
      const deco = [{ dir: 'S', u0: 0.08, u1: 0.48, z0: 30, z1: 58, color: '#bfe0ea' }, { dir: 'S', u0: 0.52, u1: 0.92, z0: 30, z1: 58, color: '#bfe0ea' }, { dir: 'S', u0: 0.08, u1: 0.48, z0: 4, z1: 26, color: '#e3e9ec' }, { dir: 'S', u0: 0.52, u1: 0.92, z0: 4, z1: 26, color: '#e3e9ec' }];
      for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) deco.push({ dir: 'S', u0: 0.12 + i * 0.13, u1: 0.18 + i * 0.13, z0: 34 + r * 12, z1: 40 + r * 12, color: ['#e07a5f', '#ffd166', '#06d6a0', '#118ab2', '#ffffff', '#c98a3b'][(i + r) % 6], raw: true });
      k.box(0.1, 0.2, 0.9, 0.6, 0, 62, C.white, { deco });
    },
    first_aid(k) {
      k.shadow(0.25, 0.35, 0.75, 0.65);
      k.box(0.3, 0.4, 0.7, 0.6, 0, 18, C.white, { deco: [{ dir: '*', u0: 0.42, u1: 0.58, z0: 4, z1: 14, color: C.red, raw: true }, { dir: '*', u0: 0.28, u1: 0.72, z0: 7.5, z1: 10.5, color: C.red, raw: true }] });
    },
    sanitizer(k) {
      k.disc(0.5, 0.5, 0, 7, C.steelD); k.pole(0.5, 0.5, 0, 34, 2.5, C.steel);
      k.box(0.38, 0.42, 0.62, 0.58, 30, 44, C.white, { deco: [{ dir: '*', u0: 0.2, u1: 0.8, z0: 33, z1: 37, color: '#3a8fb7', raw: true }] });
    },
    locker(k) {
      k.shadow(0.1, 0.15, 0.9, 0.65, 0.2);
      k.box(0.15, 0.2, 0.85, 0.6, 0, 64, '#9aa7b0', { deco: [{ dir: 'S', u0: 0.3, u1: 0.7, z0: 52, z1: 54, color: '#5c6770', raw: true }, { dir: 'S', u0: 0.3, u1: 0.7, z0: 48, z1: 50, color: '#5c6770', raw: true }, { dir: 'S', u0: 0.75, u1: 0.82, z0: 28, z1: 36, color: '#dfe5ea', raw: true }] });
    },

    // ---------- Üst katlar
    or_table(k) {
      k.shadow(0.05, 0.2, 0.95, 0.8);
      k.box(0.38, 0.4, 0.62, 0.6, 0, 18, C.steel);
      k.box(0.05, 0.25, 0.95, 0.75, 18, 24, '#2f9e8f');
      k.box(0.72, 0.3, 0.92, 0.7, 24, 27, '#3fb5a3');
    },
    surgical_lamp(k) {
      k.disc(0.5, 0.5, 0, 9, C.steelD); k.pole(0.5, 0.5, 0, 62, 3, C.steel);
      k.line(0.5, 0.5, 62, 0.0, 0.5, 58, 3, C.steel);
      k.custom(0.0, 0.5, 56, (c, sx, sy) => {
        const g = c.createRadialGradient(sx, sy + 6, 2, sx, sy + 6, 22); g.addColorStop(0, 'rgba(255,255,220,0.55)'); g.addColorStop(1, 'rgba(255,255,220,0)');
        c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy + 6, 22, 11, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#dfe5ea'; c.beginPath(); c.ellipse(sx, sy, 15, 7, 0, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fffbe0'; c.beginPath(); c.ellipse(sx, sy + 1.5, 11, 5, 0, 0, Math.PI * 2); c.fill();
      });
    },
    anesthesia(k) {
      k.shadow(0.1, 0.2, 0.9, 0.85);
      k.box(0.15, 0.25, 0.85, 0.8, 0, 36, '#dfe5ea', { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 10, z1: 26, color: '#c9d1d6' }] });
      k.box(0.2, 0.3, 0.8, 0.42, 36, 54, C.dark, { deco: [screenDeco('S', 0.08, 0.92, 39, 52, '#062a22'), screenDeco('N', 0.08, 0.92, 39, 52, '#062a22')] });
      k.cyl(0.9, 0.4, 4, 0, 30, '#3a8fb7'); k.cyl(0.9, 0.62, 4, 0, 30, '#2f9e44');
    },
    gauze(k) { for (let i = 0; i < 3; i++) k.cyl(0.4 + (i % 2) * 0.2, 0.5, 6, i * 6, i * 6 + 5, '#ffffff'); },
    scrub_sink(k) {
      k.shadow(0.05, 0.25, 0.95, 0.8);
      k.pole(0.15, 0.5, 0, 18, 3, C.steelD); k.pole(0.85, 0.5, 0, 18, 3, C.steelD);
      k.box(0.05, 0.3, 0.95, 0.78, 18, 28, C.steel, { top: '#8796a0' });
      k.box(0.05, 0.22, 0.95, 0.32, 28, 46, C.white);
      k.line(0.35, 0.3, 40, 0.35, 0.45, 36, 2, C.steelD); k.line(0.65, 0.3, 40, 0.65, 0.45, 36, 2, C.steelD);
    },
    sink(k) {
      k.box(0.4, 0.4, 0.6, 0.6, 0, 16, C.white);
      k.box(0.22, 0.28, 0.78, 0.72, 16, 24, C.white, { top: '#d7e3ea' });
      k.line(0.5, 0.32, 30, 0.5, 0.45, 27, 2, C.steelD);
    },
    uv_cart(k) {
      cartFrame(k);
      k.box(0.3, 0.4, 0.7, 0.55, 24, 46, '#b388ff', { edge: false });
      k.custom(0.5, 0.48, 35, (c, sx, sy) => { const g = c.createRadialGradient(sx, sy, 2, sx, sy, 20); g.addColorStop(0, 'rgba(179,136,255,0.5)'); g.addColorStop(1, 'rgba(179,136,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 20, 0, Math.PI * 2); c.fill(); });
    },
    bed(k) {
      k.shadow(0.06, 0.06, 0.94, 0.94, 0.18);
      for (const [u, v] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) k.disc(u, v, 1, 3, C.dark);
      k.box(0.1, 0.1, 0.9, 0.9, 4, 11, C.steel);
      k.box(0.12, 0.12, 0.88, 0.88, 11, 17, '#ffffff');
      k.box(0.12, 0.38, 0.88, 0.88, 17, 18.5, '#7fb3d5');
      k.box(0.2, 0.15, 0.8, 0.33, 17, 21, '#f7fafc');
      k.box(0.07, 0.07, 0.93, 0.13, 4, 30, '#c9d6df');
      k.box(0.07, 0.88, 0.93, 0.93, 4, 20, '#c9d6df');
    },
    bedside(k) {
      k.shadow(0.15, 0.2, 0.85, 0.8);
      k.box(0.2, 0.25, 0.8, 0.75, 0, 26, '#e8dcc8', { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 17, z1: 18.5, color: '#b9a98f' }, { dir: 'S', u0: 0.42, u1: 0.58, z0: 20, z1: 22, color: '#8d7f72' }] });
      k.box(0.18, 0.23, 0.82, 0.77, 26, 28, '#f4ead8');
      k.cyl(0.65, 0.4, 3, 28, 33, '#7fb8e6');
    },
    linen(k) { ['#ffffff', '#a9d6e5', '#ffffff', '#cfe8de'].forEach((col, i) => k.box(0.25, 0.3, 0.75, 0.7, i * 4, i * 4 + 4, col)); },
    incubator(k) {
      k.shadow(0.1, 0.2, 0.9, 0.8);
      for (const [u, v] of [[0.2, 0.3], [0.8, 0.3], [0.2, 0.7], [0.8, 0.7]]) k.disc(u, v, 1, 2.5, C.dark);
      k.box(0.15, 0.25, 0.85, 0.75, 3, 22, C.white, { deco: [screenDeco('S', 0.1, 0.4, 14, 19, '#062a22')] });
      k.ball(0.5, 0.5, 26, 4, '#f4b8a0');
      k.box(0.15, 0.25, 0.85, 0.75, 22, 38, 'rgba(190,230,255,0.42)', { edge: false, top: 'rgba(220,240,255,0.5)' });
    },
    teddy(k) {
      k.ball(0.5, 0.5, 6, 6, '#a0522d'); k.ball(0.5, 0.5, 15, 4.5, '#b5653a');
      k.ball(0.43, 0.5, 19, 1.8, '#8b4513'); k.ball(0.57, 0.5, 19, 1.8, '#8b4513');
    },
    overbed(k) {
      k.box(0.2, 0.45, 0.8, 0.55, 0, 2, C.steelD); k.pole(0.3, 0.5, 2, 24, 2.5, C.steel);
      k.box(0.15, 0.3, 0.85, 0.7, 24, 26, C.wood);
    },
    xray(k) {
      const W = k.W;
      k.shadow(0.1, 0.25, W - 0.1, 0.8, 0.2);
      k.box(0.5, 0.32, W - 0.15, 0.68, 0, 18, '#dfe5ea');
      k.box(0.45, 0.28, W - 0.1, 0.72, 18, 21, '#f4f6f7');
      k.box(0.12, 0.35, 0.36, 0.65, 0, 66, '#c9d1d6', { deco: [{ dir: '*', u0: 0.15, u1: 0.85, z0: 30, z1: 34, color: C.teal }] });
      k.box(0.25, 0.44, 1.25, 0.56, 58, 63, '#c9d1d6');
      k.box(1.0, 0.38, 1.3, 0.62, 44, 58, '#9aa7b0');
    },
    lightbox(k) {
      k.pole(0.2, 0.5, 0, 22, 2.5, C.steelD); k.pole(0.8, 0.5, 0, 22, 2.5, C.steelD);
      k.box(0.1, 0.45, 0.9, 0.55, 20, 50, '#f5f9fb', { deco: [{ dir: '*', u0: 0.44, u1: 0.56, z0: 26, z1: 44, color: C.green, raw: true }, { dir: '*', u0: 0.3, u1: 0.7, z0: 33, z1: 37, color: C.green, raw: true }] });
    },
    ultrasound(k) {
      k.shadow(0.15, 0.25, 0.85, 0.8);
      k.box(0.25, 0.3, 0.75, 0.72, 0, 30, C.white, { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 24, z1: 28, color: '#3a8fb7' }] });
      k.pole(0.5, 0.45, 30, 36, 3, C.steelD);
      k.box(0.22, 0.38, 0.78, 0.46, 36, 52, C.dark, { deco: [screenDeco('S', 0.08, 0.92, 38, 50, '#0e2836'), screenDeco('N', 0.08, 0.92, 38, 50, '#0e2836')] });
    },
    ecg(k) {
      cartFrame(k);
      k.box(0.2, 0.3, 0.8, 0.7, 24, 32, '#dfe5ea', { deco: [screenDeco('S', 0.1, 0.5, 26, 31, '#062a22')] });
      k.box(0.55, 0.35, 0.8, 0.65, 32, 33, '#ffffff');
      k.custom(0.5, 0.7, 28, (c, sx, sy) => ecgLine(c, sx - 3, sy, 5));
    },
    dialysis(k) {
      k.shadow(0.15, 0.25, 0.85, 0.8);
      k.box(0.2, 0.3, 0.8, 0.72, 0, 50, '#eef2f4', { deco: [screenDeco('S', 0.15, 0.85, 38, 47, '#0e2836'), { dir: 'S', u0: 0.1, u1: 0.9, z0: 6, z1: 10, color: '#3a8fb7' }] });
      k.custom(0.5, 0.72, 26, (c, sx, sy) => { c.strokeStyle = '#6f7d87'; c.lineWidth = 2; for (const dx of [-6, 6]) { c.beginPath(); c.arc(sx + dx, sy, 4, 0, Math.PI * 2); c.stroke(); } c.strokeStyle = '#c0392b'; c.beginPath(); c.moveTo(sx + 10, sy); c.quadraticCurveTo(sx + 22, sy + 8, sx + 16, sy + 22); c.stroke(); });
    },

    // ---------- Prosedürel özel parçalar (önceki sürümden)
    rug(k) {
      const W = k.W, D = k.D;
      k.flat([[0, 0], [W, 0], [W, D], [0, D]], 0.3, '#7a2f3b', '#d9b26a');
      k.flat([[0.3, 0.3], [W - 0.3, 0.3], [W - 0.3, D - 0.3], [0.3, D - 0.3]], 0.4, null, 'rgba(217,178,106,0.7)');
    },
    nameplate(k) { k.box(0.35, 0.45, 0.65, 0.55, 0, 4, '#e6c66e'); },
    terminal(k) {
      k.shadow(0.1, 0.15, 0.9, 0.85);
      k.box(0.1, 0.2, 0.9, 0.8, 0, 18, '#8a6a4c');
      k.box(0.4, 0.4, 0.6, 0.55, 18, 21, '#2a2f36');
      k.box(0.25, 0.4, 0.75, 0.48, 21, 38, '#1b2329', { deco: [screenDeco('S', 0.08, 0.92, 23, 36, '#2ec4b6'), screenDeco('N', 0.08, 0.92, 23, 36, '#2ec4b6')] });
    },
    archive(k) {
      k.shadow(0.05, 0.1, 0.95, 0.9, 0.2);
      const cols = ['#d1495b', '#edae49', '#00798c', '#30638e', '#66a182'];
      const deco = [];
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) deco.push({ dir: '*', u0: 0.1 + i * 0.14, u1: 0.2 + i * 0.14, z0: 4 + r * 14, z1: 14 + r * 14, color: cols[(i + r) % 5], raw: true });
      k.box(0.1, 0.15, 0.9, 0.85, 0, 46, '#c9d1d6', { deco });
    },
    elevator(k) {
      k.shadow(0, 0, 1, 1, 0.22);
      k.box(0.02, 0.02, 0.98, 0.98, 0, 66, '#aab6bd', { deco: [
        { dir: '*', u0: 0.15, u1: 0.49, z0: 0, z1: 50, color: '#d3dce1' }, { dir: '*', u0: 0.51, u1: 0.85, z0: 0, z1: 50, color: '#d3dce1' },
        { dir: '*', u0: 0.4, u1: 0.6, z0: 54, z1: 61, color: '#16323f', raw: true }] });
      k.custom(0.5, 0.5, 66, (c, sx, sy) => {
        // Dinamik kat göstergesi: bulunulan kat + hedef katın yönü
        const LBL = ['Z', '1', '2', '3', 'B1'], LV = [0, 1, 2, 3, -1];
        const f = M().floor;
        const g = VH.guide && VH.guide.current && VH.guide.current.target;
        let arrow = '';
        if (g && g.floor !== undefined && g.floor !== f) arrow = LV[g.floor] > LV[f] ? '▲' : '▼';
        const NAMES = ["Zemin Kat · Asansör", "1. Kat · Cerrahi", "2. Kat · Yatan Hasta", "3. Kat · Radyoloji", "B1 · Yemekhane"];
        c.fillStyle = "#16323f"; c.fillRect(sx - 12, sy - 7, 24, 14);
        c.fillStyle = "#2ec4b6"; c.font = "800 9px system-ui,sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText(LBL[f] || String(f), sx - (arrow ? 4 : 0), sy);
        if (arrow) { c.fillStyle = Math.floor(performance.now() / 400) % 2 ? "#ffd166" : "#f2a93b"; c.fillText(arrow, sx + 7, sy); }
        // Kat adı tabelası (LED panel): bulunulan katın tam adı
        const nm = NAMES[f] || ""; c.font = "700 8.5px system-ui,sans-serif";
        const tw = c.measureText(nm).width + 14;
        c.fillStyle = "rgba(10,24,32,0.92)"; c.beginPath(); c.roundRect ? c.roundRect(sx - tw / 2, sy - 24, tw, 13, 3) : c.rect(sx - tw / 2, sy - 24, tw, 13); c.fill();
        c.strokeStyle = "#2ec4b6"; c.lineWidth = 1; c.stroke();
        c.fillStyle = "#e9fffb"; c.fillText(nm, sx, sy - 17.5);
      });
    },

    // ---------- Dış dünya
    tree(k) {
      const r = hash(k.o.x, k.o.y);
      const s = 0.85 + r * 0.45;
      const leaf = ['#4f9a4a', '#5aa64f', '#3f8a46', '#6aa84f'][Math.floor(r * 4)];
      k.custom(0.5, 0.5, 0, (c, sx, sy) => { c.fillStyle = 'rgba(10,40,20,0.22)'; c.beginPath(); c.ellipse(sx + 6, sy + 2, 22 * s, 11 * s, 0, 0, Math.PI * 2); c.fill(); });
      // Rüzgârda hafif salınım (taç katmanları yükseldikçe daha fazla)
      const sw = Math.sin(performance.now() / 900 + r * 12) * 0.035 * wind;
      k.cyl(0.5, 0.5, 3.5 * s, 0, 24 * s, C.trunk);
      k.ball(0.5 + sw * 0.4, 0.5, 34 * s, 17 * s, shade(leaf, -0.1));
      k.ball(0.36 + sw * 0.7, 0.5, 42 * s, 13 * s, leaf);
      k.ball(0.62 + sw * 0.8, 0.48, 46 * s, 12 * s, shade(leaf, 0.08));
      k.ball(0.5 + sw, 0.42, 54 * s, 10 * s, shade(leaf, 0.15));
    },
    bush(k) {
      const r = hash(k.o.x + 3, k.o.y);
      k.ball(0.35, 0.5, 7, 8, '#4a8f45'); k.ball(0.62, 0.5, 8, 9, '#559c4c'); k.ball(0.5, 0.45, 13, 7, r > 0.5 ? '#6aa84f' : '#5c9e50');
      if (r > 0.6) for (let i = 0; i < 4; i++) k.ball(0.3 + i * 0.13, 0.5, 12 + (i % 2) * 3, 1.6, ['#ef476f', '#ffd166', '#ffffff', '#f78c6b'][i]);
    },
    bench(k) {
      k.shadow(0.05, 0.3, 0.95, 0.7);
      for (const u of [0.15, 0.85]) k.box(u - 0.04, 0.36, u + 0.04, 0.64, 0, 11, C.dark);
      k.box(0.05, 0.38, 0.95, 0.66, 11, 14, C.wood);
      k.box(0.05, 0.32, 0.95, 0.38, 15, 26, C.wood);
    },
    lamp_post(k) {
      k.disc(0.5, 0.5, 0, 6, C.dark); k.pole(0.5, 0.5, 0, 72, 3, '#3d4852');
      k.box(0.4, 0.4, 0.6, 0.6, 70, 76, '#3d4852', { top: '#2b333b' });
      k.custom(0.5, 0.5, 69, (c, sx, sy) => { c.fillStyle = '#fff6c9'; c.beginPath(); c.ellipse(sx, sy, 6, 3, 0, 0, Math.PI * 2); c.fill(); });
    },
    car(k) {
      const col = k.o.color || ['#d64545', '#3a8fb7', '#f2f2f2', '#2b333b', '#f2c94c', '#6aa84f'][Math.floor(hash(k.o.x, k.o.y) * 6)];
      const D = k.D;
      k.shadow(0.1, 0.1, 0.9, D - 0.1, 0.25);
      for (const [u, v] of [[0.14, 0.45], [0.86, 0.45], [0.14, D - 0.45], [0.86, D - 0.45]]) k.box(u - 0.05, v - 0.18, u + 0.05, v + 0.18, 0, 8, '#1d2329');
      k.box(0.12, 0.12, 0.88, D - 0.12, 4, 15, col, { deco: [{ dir: 'S', u0: 0.1, u1: 0.25, z0: 9, z1: 12, color: '#fff3b0', raw: true }, { dir: 'S', u0: 0.75, u1: 0.9, z0: 9, z1: 12, color: '#fff3b0', raw: true }, { dir: 'N', u0: 0.1, u1: 0.25, z0: 9, z1: 12, color: '#e74c3c', raw: true }, { dir: 'N', u0: 0.75, u1: 0.9, z0: 9, z1: 12, color: '#e74c3c', raw: true }] });
      k.box(0.2, 0.55, 0.8, D - 0.5, 15, 24, '#2b3a46', { top: col });
    },
    sign_hospital(k) {
      const W = k.W;
      k.shadow(0.05, 0.35, W - 0.05, 0.65);
      k.box(0.1, 0.38, W - 0.1, 0.62, 0, 6, '#9aa7b0');
      k.box(0.15, 0.45, W - 0.15, 0.55, 6, 40, '#0f5e66', { deco: [{ dir: '*', u0: 0, u1: 1, z0: 36, z1: 40, color: '#2ec4b6', raw: true }] });
      k.custom(W / 2, 0.55, 22, (c, sx, sy) => {
        c.fillStyle = '#ffffff'; c.font = '800 9px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('✚ VITA HOSPITAL', sx, sy - 3); c.font = '600 6px system-ui,sans-serif'; c.fillStyle = '#bff0ea'; c.fillText('ACİL · POLİKLİNİK', sx, sy + 7);
      });
    },
    flower_bed(k) {
      const W = k.W, D = k.D;
      k.box(0.05, 0.05, W - 0.05, D - 0.05, 0, 4, '#a0866b', { top: '#5b3f2a' });
      for (let i = 0; i < 9; i++) { const r = hash(k.o.x * 7 + i, k.o.y); k.ball(0.15 + r * (W - 0.3), 0.2 + hash(i, k.o.y + 1) * (D - 0.4), 6, 2.2, ['#ef476f', '#ffd166', '#ffffff', '#f78c6b', '#b388ff'][i % 5]); }
    },
    trash_bin(k) { k.cyl(0.5, 0.5, 6, 0, 18, '#3f6f4f'); k.disc(0.5, 0.5, 18.5, 6, '#2b333b'); },
    road_mark(k) {
      const W = k.W, D = k.D;
      if (W >= D) for (let u = 0.2; u < W - 0.3; u += 1) k.flat([[u, D / 2 - 0.05], [u + 0.5, D / 2 - 0.05], [u + 0.5, D / 2 + 0.05], [u, D / 2 + 0.05]], 0.3, 'rgba(255,255,255,0.8)');
      else for (let v = 0.2; v < D - 0.3; v += 1) k.flat([[W / 2 - 0.05, v], [W / 2 + 0.05, v], [W / 2 + 0.05, v + 0.5], [W / 2 - 0.05, v + 0.5]], 0.3, 'rgba(255,255,255,0.8)');
    },
    parking_lines(k) {
      const W = k.W, D = k.D;
      for (let v = 0; v <= D + 0.01; v += 2) k.flat([[0, v - 0.04], [W, v - 0.04], [W, v + 0.04], [0, v + 0.04]], 0.3, 'rgba(255,255,255,0.75)');
    },
    crosswalk(k) {
      const W = k.W, D = k.D;
      for (let u = 0.1; u < W; u += 0.5) k.flat([[u, 0.1], [u + 0.28, 0.1], [u + 0.28, D - 0.1], [u, D - 0.1]], 0.3, 'rgba(255,255,255,0.85)');
    },
  };

  function chairBase(k, col) {
    k.shadow(0.2, 0.2, 0.8, 0.8);
    for (const [u, v] of [[0.25, 0.3], [0.75, 0.3], [0.25, 0.75], [0.75, 0.75]]) k.pole(u, v, 0, 12, 2, C.steelD);
    k.box(0.2, 0.25, 0.8, 0.8, 12, 16, col);
    k.box(0.2, 0.2, 0.8, 0.28, 16, 34, col);
  }
  function cartFrame(k) {
    k.shadow(0.15, 0.2, 0.85, 0.8);
    for (const [u, v] of [[0.2, 0.25], [0.8, 0.25], [0.2, 0.75], [0.8, 0.75]]) { k.pole(u, v, 0, 24, 2, C.steelD); k.disc(u, v, 0, 2.5, C.dark); }
    k.box(0.18, 0.22, 0.82, 0.78, 6, 8, '#cfd8dc');
  }

  // Zemin tipi düz nesneler (zemin katmanında çizilir)
  const FLAT = new Set(['play_mat', 'floor_decal', 'ambulance_bay', 'rug', 'road_mark', 'parking_lines', 'crosswalk']);

  let wind = 1;
  // Kaynak kodda zaman, gece, rüzgâr veya canlı oyun durumu okuyan türler "dinamik" sayılır
  const DYN = new Map();
  const DYN_RE = /now\(\)|performance\.now|night\(\)|\bwind\b|Date\(|VH\.(world|floors|entities|hospital|guide|logistics|cases|terminal)|M\(\)\.floor\b|scanning\(|labBusy\(|servicesOpen\(|o\.(lights|braking|wet|open|color)\b/;
  VH.art = {
    get KINDS() { return Object.keys(K); },
    has: (kind) => !!K[kind],
    isFlat: (kind) => FLAT.has(kind),
    shade,
    hash,
    C,
    screenDeco,
    ecgLine,
    set wind(v) { wind = v; },
    /** Yeni nesne türü ekle ya da var olanı sar (art_extra.js, equipment.js). */
    register(kind, fn, flat) { K[kind] = fn; if (flat) FLAT.add(kind); DYN.delete(kind); },
    /** Tür zamanla ya da oyun durumuyla değişiyor mu (animasyon, gece, cihaz durumu)? Değişmeyenler sprite önbelleğine alınır. */
    isDynamic(kind) {
      if (DYN.has(kind)) return DYN.get(kind);
      const fn = K[kind];
      const src = fn ? String(fn) + (fn._src || "") : "";
      const d = DYN_RE.test(src);
      DYN.set(kind, d);
      return d;
    },
    get(kind) { return K[kind]; },
    /** Haritadaki bir nesneyi çiz. it: { o, ... } */
    draw(context, it) {
      const fn = K[it.o.k];
      if (!fn) return;
      ctx = context;
      const q = [];
      fn(kit(it.o, q));
      q.sort((a, b) => a.d - b.d || a.z - b.z);
      const al = it.o._alpha;
      if (al !== undefined && al < 1) ctx.globalAlpha = al;
      for (const p of q) p.fn();
      if (al !== undefined && al < 1) ctx.globalAlpha = 1;
    },
    /** Kutu primitifini dışarıya aç (ambulans vb.). */
    box(context, x0, y0, x1, y1, z0, z1, color, opt) { ctx = context; drawBox(x0, y0, x1, y1, z0, z1, color, opt); },
  };
})();
