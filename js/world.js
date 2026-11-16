// Vita Hospital — Canlı dış dünya: trafik, yayalar, güvercinler, kuşlar, yağmur ve far ışıkları
//
// Ana caddede iki şeritli trafik akar; araçlar öndeki araçla mesafe korur, yaya geçidinde
// karşıya geçen yaya varsa durur ve ambulansa yol verir. Kaldırımlarda ve park yolunda
// yayalar (koşucu, köpek gezdiren, otobüs bekleyen) dolaşır. Meydanda güvercinler yem arar,
// Başhekim yaklaşınca havalanır. Bazı nöbetler yağmurlu geçer (şemsiyeler açılır).
(function () {
  const VH = (window.VH = window.VH || {});
  const M = () => VH.map, E = () => VH.entities, H = () => VH.hospital;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ================================================================ Trafik
  const LANES = {
    W: { y0: 33.45, dir: -1, face: 'W', start: 58, end: -11 },
    E: { y0: 34.55, dir: 1, face: 'E', start: -11, end: 58 },
  };
  const COLORS = ['#d64545', '#3a8fb7', '#f2f2f2', '#2b333b', '#f2c94c', '#6aa84f', '#8e6c8a', '#e07a5f', '#9aa7b0'];
  const cars = [];
  const spawnT = { W: 1, E: 3 };
  function spawnCar(lane) {
    const L = LANES[lane];
    if (cars.some((c) => c.lane === lane && Math.abs(c.x - L.start) < 4)) return;
    const kind = Math.random() < 0.12 ? 'bus' : 'car';
    cars.push({ lane, x: L.start, v: 0, vmax: kind === 'bus' ? 3.2 : rand(3.6, 5.2), color: pick(COLORS), kind, len: kind === 'bus' ? 3 : 2, suv: Math.random() < 0.35 });
  }
  const crossing = () => peds.some((p) => p.crossing);
  // Özel araçlar: ambulans ve lojistik kamyonu (trafik bunlara yol verir, bariyer bunlar için açılır)
  const specials = () => [H().er && H().er.amb, VH.logistics && VH.logistics.truck].filter(Boolean);
  const barrierUsers = () => specials().concat(typeof parkers !== 'undefined' ? parkers.filter((p) => p.state !== 'parked') : []);
  function ambOnLane(lane) {
    let best = null;
    for (const a of barrierUsers()) {
      if (lane === 'W' && Math.abs(a.y - 33.95) < 0.3) best = a.x;
      if (lane === 'E' && Math.abs(a.y - 35.05) < 0.3) best = a.x;
    }
    return best;
  }
  let barrier = 0;
  function updateBarrier(dt) {
    const want = barrierUsers().some((a) => a.x > 29 && a.x < 36 && a.y > 27 && a.y < 36.5) ? 1 : 0;
    barrier += Math.sign(want - barrier) * Math.min(Math.abs(want - barrier), dt * 1.6);
  }
  function updateCars(dt) {
    for (const lane of ['W', 'E']) {
      spawnT[lane] -= dt;
      if (spawnT[lane] <= 0) { spawnT[lane] = rand(2.8, 7.5); spawnCar(lane); }
    }
    const cw = crossing();
    for (const c of cars) {
      const L = LANES[c.lane];
      let gap = Infinity;
      for (const o of cars) {
        if (o === c || o.lane !== c.lane) continue;
        const d = (o.x - c.x) * L.dir;
        if (d > 0) gap = Math.min(gap, d - (o.len + c.len) / 2);
      }
      const ax = ambOnLane(c.lane);
      if (ax !== null) { const d = (ax - c.x) * L.dir; if (d > 0) gap = Math.min(gap, d - 2.4); }
      // Ambulans caddeye girerken kavşakta yol ver
      for (const a of specials()) if (a.phase !== 'parked' && a.phase !== 'unload' && a.x > 31 && a.x < 35 && a.y > 30) { const d = (a.x - c.x) * L.dir; if (d > 0 && d < 5) gap = Math.min(gap, d - 2.2); }
      // Yaya geçidi (x 3..7)
      const front = c.x + (L.dir * c.len) / 2;
      if (cw) { const d = L.dir > 0 ? 2.6 - front : front - 7.4; if (d > -0.2) gap = Math.min(gap, d); }
      const want = gap < 0.4 ? 0 : Math.min(c.vmax, gap * 1.6);
      c.v += Math.sign(want - c.v) * Math.min(Math.abs(want - c.v), dt * (want < c.v ? 9 : 3));
      c.x += L.dir * c.v * dt;
      c.braking = want < c.v - 0.2 || c.v < 0.3;
    }
    for (let i = cars.length - 1; i >= 0; i--) { const c = cars[i], L = LANES[c.lane]; if ((c.x - L.end) * L.dir > 0) cars.splice(i, 1); }
  }
  // Araç görünüm anahtarı: paylaşılan yüksek kaliteli sprite önbelleği için (gece farı açık/kapalı dahil)
  const carKey = (o) => ['car', o.color, o.face, o.w, o.h, o.braking ? 1 : 0, o.suv ? 1 : 0, (H() && H().night > 0.1) ? 1 : 0].join('|');
  function carObj(c) {
    const L = LANES[c.lane];
    const o = { k: c.kind === 'bus' ? 'city_bus' : 'car', x: c.x - c.len / 2, y: L.y0, w: c.len, h: 1, face: L.face, color: c.color, braking: c.braking, suv: !!c.suv };
    if (o.k === 'car') o.spriteKey = carKey(o);
    return o;
  }

  // ================================================================ Yerleşke içi otopark (sivil araçlar)
  // Araç caddeden gelir → bariyerden ambulans yolunun doğu şeridine girer → koridordan park yerine.
  const ROWS = { 3: 5.6, 7: 9.8, 12: 14.6, 16: 18.6 }; // sıra üstü y → koridor (aisle) y
  const SLOTS = [];
  Object.keys(ROWS).forEach((r) => { for (let i = 0; i < 5; i++) SLOTS.push({ x: 36 + 2 * i, row: +r, aisle: ROWS[r], car: null }); });
  const parkers = [];
  let parkT = 4;
  function parkerSpawn(initial) {
    const free = SLOTS.filter((s) => !s.car);
    if (!free.length) return;
    const s = free[Math.floor(Math.random() * free.length)];
    const c = { slot: s, color: pick(COLORS), v: 0, heading: 'W', i: 1, state: initial ? 'parked' : 'in', t: rand(70, 200) };
    s.car = c;
    if (initial) { c.x = s.x; c.y = s.row + 1; c.heading = 'N'; }
    else { c.pts = [[58, 33.95], [34.5, 33.95], [34.5, s.aisle], [s.x, s.aisle], [s.x, s.row + 1]]; c.x = 58; c.y = 33.95; }
    parkers.push(c);
  }
  function drivePts(c, dt, vmax) {
    if (c.i >= c.pts.length) return true;
    const [tx, ty] = c.pts[c.i];
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    const last = c.i === c.pts.length - 1;
    const want = last ? Math.min(vmax, 0.8 + d * 1.5) : vmax;
    c.v += Math.sign(want - c.v) * Math.min(Math.abs(want - c.v), dt * 4);
    const step = Math.max(0.3, c.v) * dt;
    if (!c.reverse && d > 1e-3) c.heading = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'W' : 'E') : (dy < 0 ? 'N' : 'S');
    if (d <= step) { c.x = tx; c.y = ty; c.i++; c.reverse = false; return c.i >= c.pts.length; }
    c.x += (dx / d) * step; c.y += (dy / d) * step;
    return false;
  }
  const laneBusy = () => parkers.some((p) => p.state !== 'parked' && p.x < 35.2);
  function updateParkers(dt) {
    parkT -= dt;
    if (parkT <= 0) { parkT = rand(14, 30); if (!laneBusy()) parkerSpawn(false); }
    for (let k = parkers.length - 1; k >= 0; k--) {
      const c = parkers[k];
      if (c.state === 'in') {
        // ambulans/kamyon şeritteyken kavşakta bekle
        const blocked = c.i === 1 && c.x < 40 && specials().some((a) => a.phase !== 'parked' && a.phase !== 'unload' && a.y > 28);
        if (!blocked && drivePts(c, dt, 3.6)) {
          c.state = 'parked'; c.heading = 'N'; c.t = rand(80, 220);
          // sürücü hasta olarak iner ve bahçeden ana girişe yürür
          if (Math.random() < 0.5 && E().spawnPatientAt) E().spawnPatientAt(c.x + 0.7, c.y + 0.3);
        }
      } else if (c.state === 'parked') {
        c.t -= dt;
        if (c.t <= 0 && !laneBusy()) { c.state = 'out'; c.i = 1; c.v = 0; c.reverse = true; c.pts = [[c.x, c.y], [c.x, c.slot.aisle], [34.5, c.slot.aisle], [34.5, 35.05], [58, 35.05]]; }
      } else if (drivePts(c, dt, 3.6)) {
        c.slot.car = null; parkers.splice(k, 1);
      }
    }
  }
  function parkerObj(c) {
    const ns = c.heading === 'N' || c.heading === 'S';
    const w = ns ? 1 : 2, h = ns ? 2 : 1;
    if (c.suv === undefined) c.suv = Math.random() < 0.35;
    const o = { k: 'car', x: c.x - w / 2, y: c.y - h / 2, w, h, face: c.heading, color: c.color, suv: c.suv };
    o.spriteKey = carKey(o);
    return o;
  }

  // Şehir otobüsü (art kitiyle)
  VH.art.register('city_bus', (k) => {
    const D = k.D;
    k.shadow(0.05, 0.1, 0.95, D - 0.05, 0.28);
    for (const [u, v] of [[0.12, 0.6], [0.88, 0.6], [0.12, D - 0.6], [0.88, D - 0.6]]) k.box(u - 0.05, v - 0.2, u + 0.05, v + 0.2, 0, 9, '#1d2329');
    const win = [];
    for (let i = 0; i < 5; i++) { win.push({ dir: 'E', u0: 0.06 + i * 0.18, u1: 0.2 + i * 0.18, z0: 20, z1: 30, color: '#2b3a46', raw: true }); win.push({ dir: 'W', u0: 0.06 + i * 0.18, u1: 0.2 + i * 0.18, z0: 20, z1: 30, color: '#2b3a46', raw: true }); }
    win.push({ dir: 'S', u0: 0.08, u1: 0.92, z0: 18, z1: 32, color: '#2b3a46', raw: true }, { dir: 'S', u0: 0.1, u1: 0.3, z0: 6, z1: 10, color: '#fff3b0', raw: true }, { dir: 'S', u0: 0.7, u1: 0.9, z0: 6, z1: 10, color: '#fff3b0', raw: true });
    win.push({ dir: 'E', u0: 0, u1: 1, z0: 12, z1: 15, color: '#2ec4b6', raw: true }, { dir: 'W', u0: 0, u1: 1, z0: 12, z1: 15, color: '#2ec4b6', raw: true });
    k.box(0.08, 0.08, 0.92, D - 0.08, 4, 36, '#f2f4f5', { deco: win, top: '#d9dee2' });
    k.custom(0.5, D - 0.08, 34, (c, sx, sy) => { c.fillStyle = '#ffd166'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('HASTANE', sx, sy); });
  });

  // ================================================================ Yayalar
  const ROUTES = [
    [[-9, 36.5], [57, 36.5]],
    [[57, 36.5], [-9, 36.5]],
    [[-9, 32.5], [4.5, 32.5], [4.5, 36.5], [57, 36.5]],
    [[57, 36.5], [4.5, 36.5], [4.5, 32.5], [-4.5, 32.5], [-4.5, -9]],
    [[-4.5, -9], [-4.5, 32.5], [57, 32.5]],
    [[57, 32.5], [-4.5, 32.5], [-4.5, -4.5], [57, -4.5]],
    [[-9, -4.5], [57, -4.5]],
    [[57, 36.5], [41.5, 36.5], [41.5, 37.2, 'wait'], [41.5, 36.5], [57, 36.5]],
  ];
  const peds = [];
  let pedT = 0.5;
  function spawnPed(initial) {
    const route = pick(ROUTES);
    const kind = Math.random();
    const look = E().randomPatientLook(Math.floor(rand(16, 80)));
    look.patient = false;
    let speed = rand(1.0, 1.5);
    if (kind < 0.15) { Object.assign(look, { coat: pick(['#ef476f', '#06d6a0', '#118ab2', '#ffd166']), pants: '#22223b', carry: null, cane: false, scarf: null }); speed = rand(2.6, 3.2); }
    if (look.cane) speed = 0.75;
    const p = E().makeEntity('extra', { name: 'Yaya', look, x: route[0][0], y: route[0][1], speed, floor: 0, route, seg: 1, jog: kind < 0.15, dog: kind > 0.82 ? { x: route[0][0], y: route[0][1], t: 0, col: pick(['#8a6a4c', '#f4f1ea', '#2b2b2b', '#c9a25a']) } : null, wait: 0 });
    if (initial) {
      // dağınık başlangıç: rotanın rastgele bir yerinden
      const i = 1 + Math.floor(Math.random() * (route.length - 1));
      const a = route[i - 1], b = route[i], t = Math.random();
      p.x = a[0] + (b[0] - a[0]) * t; p.y = a[1] + (b[1] - a[1]) * t; p.seg = i;
      if (p.dog) { p.dog.x = p.x; p.dog.y = p.y; }
    }
    peds.push(p);
    E().extraPeople.push(p);
  }
  function updatePeds(dt) {
    pedT -= dt;
    if (pedT <= 0) { pedT = rand(3, 7); if (peds.length < 11) spawnPed(false); }
    for (const p of peds) {
      if (p.wait > 0) { p.wait -= dt; p.moving = false; continue; }
      const tgt = p.route[p.seg];
      if (!tgt) { p.gone = true; continue; }
      const dx = tgt[0] - p.x, dy = tgt[1] - p.y, d = Math.hypot(dx, dy);
      // yaya geçidinde: geçerken araçlar durur; araç yaklaşıyorsa kaldırımda bekle
      const onCross = Math.abs(p.x - 4.5) < 0.3 && ((p.y <= 32.8 && tgt[1] > 33) || (p.y >= 36.2 && tgt[1] < 36));
      if (onCross && !p.crossing) {
        const danger = cars.some((c) => { const L = LANES[c.lane]; const front = c.x + (L.dir * c.len) / 2; const dd = L.dir > 0 ? 3 - front : front - 7; return dd > -0.5 && dd < 2.2 && c.v > 1.5; });
        if (danger) { p.moving = false; continue; }
      }
      p.crossing = Math.abs(p.x - 4.5) < 0.6 && p.y > 32.7 && p.y < 36.3;
      const step = p.speed * (VH.world.rain && !p.jog ? 1.15 : 1) * dt;
      if (d <= step) {
        p.x = tgt[0]; p.y = tgt[1]; p.seg++;
        if (tgt[2] === 'wait') p.wait = rand(6, 14);
        if (p.seg >= p.route.length) p.gone = true;
      } else { p.x += (dx / d) * step; p.y += (dy / d) * step; E().face(p, dx, dy); }
      p.moving = d > step || p.seg < p.route.length;
      p.anim += dt * (p.jog ? 15 : 10);
      p.look.umbrella = VH.world.rain && !p.jog;
      if (p.dog) {
        const g = p.dog;
        const bx = p.x - (dx / (d || 1)) * 0.2 + 0.35, by = p.y - (dy / (d || 1)) * 0.2 + 0.35;
        const gx = bx - g.x, gy = by - g.y, gd = Math.hypot(gx, gy);
        if (gd > 0.05) { const s = Math.min(gd, (p.speed + 0.6) * dt); g.x += (gx / gd) * s; g.y += (gy / gd) * s; g.flip = M().worldToIso(g.x + gx, g.y + gy)[0] < M().worldToIso(g.x, g.y)[0]; }
        g.t += dt * 14;
      }
    }
    for (let i = peds.length - 1; i >= 0; i--) {
      if (!peds[i].gone) continue;
      const k = E().extraPeople.indexOf(peds[i]);
      if (k >= 0) E().extraPeople.splice(k, 1);
      peds.splice(i, 1);
    }
  }
  function drawDog(ctx, sx, sy, g) {
    ctx.save(); ctx.translate(sx, sy); if (g.flip) ctx.scale(-1, 1);
    ctx.fillStyle = 'rgba(10,30,40,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
    const leg = Math.sin(g.t) * 1.5;
    ctx.fillStyle = VH.art.shade(g.col, -0.25);
    ctx.fillRect(-5 + leg, -5, 1.6, 5); ctx.fillRect(3 - leg, -5, 1.6, 5);
    ctx.fillStyle = g.col;
    ctx.beginPath(); ctx.ellipse(0, -7, 6.5, 3.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -10, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = VH.art.shade(g.col, -0.3); ctx.beginPath(); ctx.ellipse(5, -12, 1.4, 2.4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = g.col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-9, -12 + Math.sin(g.t * 1.5) * 2, -8, -13); ctx.stroke();
    ctx.fillStyle = '#1d2329'; ctx.fillRect(7, -11, 1, 1);
    ctx.restore();
  }

  // ================================================================ Güvercinler
  const pigeons = [];
  for (let i = 0; i < 7; i++) pigeons.push({ hx: rand(10, 20), hy: rand(26.15, 26.85), x: 0, y: 0, z: 0, t: rand(0, 10), fly: 0, vx: 0, vy: 0, back: 0 });
  pigeons.forEach((p) => { p.x = p.hx; p.y = p.hy; });
  function updatePigeons(dt) {
    const P = E().player;
    for (const b of pigeons) {
      b.t += dt;
      if (b.fly > 0) {
        b.fly -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z = Math.min(140, b.z + dt * 70);
        if (b.fly <= 0) { b.back = rand(12, 25); }
        continue;
      }
      if (b.back > 0) { b.back -= dt; if (b.back <= 0) { b.x = b.hx; b.y = b.hy; b.z = 0; } continue; }
      if (P.floor === 0 && Math.hypot(P.x - b.x, P.y - b.y) < 1.8) {
        b.fly = 3; const a = Math.atan2(b.y - P.y, b.x - P.x) + rand(-0.6, 0.6); b.vx = Math.cos(a) * 4; b.vy = Math.sin(a) * 4;
        continue;
      }
      // yem arama: kısa adımlar
      if (Math.random() < dt * 0.5) { b.hx = Math.max(10, Math.min(20, b.hx + rand(-0.5, 0.5))); b.hy = Math.max(26.1, Math.min(26.9, b.hy + rand(-0.3, 0.3))); }
      b.x += (b.hx - b.x) * Math.min(1, dt * 1.5); b.y += (b.hy - b.y) * Math.min(1, dt * 1.5);
    }
  }
  function drawPigeon(ctx, sx, sy, b) {
    const flying = b.z > 1;
    ctx.save(); ctx.translate(sx, sy);
    if (!flying) { ctx.fillStyle = 'rgba(10,30,40,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.translate(0, -b.z - 3);
    const peck = !flying && Math.sin(b.t * 3) > 0.7 ? 2 : 0;
    ctx.fillStyle = '#8f98a3';
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    if (flying) { const w = Math.sin(b.t * 25) * 4; ctx.fillStyle = '#a7b0ba'; ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-5, -1 - w); ctx.lineTo(1, -1); ctx.fill(); ctx.beginPath(); ctx.moveTo(1, -1); ctx.lineTo(5, -1 - w); ctx.lineTo(-1, -1); ctx.fill(); }
    ctx.fillStyle = '#6f7d87'; ctx.beginPath(); ctx.arc(3.5, -2 + peck, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5aa64f'; ctx.fillRect(2.4, -1 + peck, 1.6, 0.8);
    ctx.fillStyle = '#e8a33d'; ctx.fillRect(5, -2 + peck, 1.4, 0.7);
    ctx.restore();
  }

  // ================================================================ Gökyüzü: kuş sürüleri ve yağmur
  const flock = { on: false, x: 0, y: 0, t: 0, vx: 0, vy: 0 };
  let flockT = 20;
  const drops = [];
  let rain = false;
  function setWeather(n) { rain = n > 1 && Math.random() < 0.3; VH.art.wind = rain ? 2.2 : 1; }

  function drawSky(ctx, vw, vh) {
    if (M().floor !== 0) return;
    const cam = M().camera;
    if (flock.on) {
      ctx.save();
      ctx.translate(vw / 2, vh / 2); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-cam.x, -cam.y);
      const [sx, sy] = M().worldToIso(flock.x, flock.y);
      ctx.strokeStyle = 'rgba(30,40,50,0.75)'; ctx.lineWidth = 1.4;
      for (let i = 0; i < 7; i++) {
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        const bx = sx - row * 12 + (i ? side * row * 2 : 0), by = sy - 170 + row * 7 * side;
        const w = Math.sin(flock.t * 9 + i) * 3;
        ctx.beginPath(); ctx.moveTo(bx - 5, by - w); ctx.lineTo(bx, by); ctx.lineTo(bx + 5, by - w); ctx.stroke();
      }
      ctx.restore();
    }
    if (rain) {
      ctx.save();
      ctx.fillStyle = 'rgba(40,60,80,0.12)'; ctx.fillRect(0, 0, vw, vh);
      ctx.strokeStyle = 'rgba(200,220,240,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of drops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 12); }
      ctx.stroke();
      ctx.restore();
    }
  }
  function updateSky(dt, vw, vh) {
    flockT -= dt;
    if (!flock.on && flockT <= 0) { flock.on = true; flock.t = 0; flock.x = -8; flock.y = rand(-4, 30); flock.vx = rand(3, 5); flock.vy = rand(-1, 1); }
    if (flock.on) { flock.t += dt; flock.x += flock.vx * dt; flock.y += flock.vy * dt; if (flock.x > 48) { flock.on = false; flockT = rand(25, 60); } }
    if (rain) {
      while (drops.length < 140) drops.push({ x: Math.random() * (vw + 60), y: Math.random() * vh, v: rand(500, 700) });
      for (const d of drops) { d.y += d.v * dt; d.x -= d.v * dt * 0.25; if (d.y > vh) { d.y = -12; d.x = Math.random() * (vw + 60); } }
    } else drops.length = 0;
  }

  // ================================================================ Nizamiye güvenlik görevlisi (devriye)
  let guard = null;
  const PATROL = [[6.6, 30.6], [9.6, 30.6], [9.6, 29.2], [6.6, 29.4]];
  function initGuard() {
    guard = E().makeEntity('extra', { name: 'Güvenlik', look: { coat: '#22223b', sleeve: '#22223b', pants: '#1b1d33', skin: '#c98d62', hair: '#1c1c1c', hairStyle: 'short', cap: '#1b1d33', badge: '#e6c66e', shoes: '#111' }, x: 6.6, y: 30.6, floor: 0, speed: 1.0, pi: 1, pause: 0 });
    E().extraPeople.push(guard);
  }
  function updateGuard(dt) {
    if (!guard) return;
    const P = E().player;
    if (P.floor === 0 && Math.hypot(P.x - guard.x, P.y - guard.y) < 1.8 && !guard.greet) { guard.greet = true; E().say(guard, pick(['İyi nöbetler Başhekimim!', 'Nizamiye kontrol altında.', 'Otopark bugün dolu.']), 2200); E().face(guard, P.x - guard.x, P.y - guard.y); }
    if (Math.hypot(P.x - guard.x, P.y - guard.y) > 3) guard.greet = false;
    if (guard.pause > 0) { guard.pause -= dt; guard.moving = false; return; }
    const [tx, ty] = PATROL[guard.pi];
    const dx = tx - guard.x, dy = ty - guard.y, d = Math.hypot(dx, dy), s = guard.speed * dt;
    if (d <= s) { guard.x = tx; guard.y = ty; guard.pi = (guard.pi + 1) % PATROL.length; guard.pause = rand(1.5, 4); guard.moving = false; return; }
    guard.x += (dx / d) * s; guard.y += (dy / d) * s; E().face(guard, dx, dy); guard.moving = true; guard.anim += dt * 9;
  }

  // ================================================================ Gece ışıkları (farlar)
  function drawLights(ctx, night) {
    if (M().floor !== 0) return;
    const cone = (x, y, dirx, diry, col, a) => {
      const [sx, sy] = M().worldToIso(x, y);
      const [ex, ey] = M().worldToIso(x + dirx * 3.2, y + diry * 3.2);
      const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 46);
      g.addColorStop(0, `rgba(${col},${a * night})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse((sx + ex) / 2 + (ex - sx) * 0.3, (sy + ey) / 2 + (ey - sy) * 0.3, 52, 24, Math.atan2(ey - sy, ex - sx), 0, Math.PI * 2); ctx.fill();
    };
    for (const c of cars) {
      const L = LANES[c.lane];
      cone(c.x + (L.dir * c.len) / 2, L.y0 + 0.5, L.dir, 0, '255,240,190', 0.42);
      if (c.braking) { const [sx, sy] = M().worldToIso(c.x - (L.dir * c.len) / 2, L.y0 + 0.5); const g = ctx.createRadialGradient(sx, sy, 1, sx, sy, 16); g.addColorStop(0, `rgba(255,60,60,${0.5 * night})`); g.addColorStop(1, 'rgba(255,60,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI * 2); ctx.fill(); }
    }
    const a = H().er && H().er.amb;
    if (a && a.phase !== 'parked') {
      const d = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] }[a.heading];
      cone(a.x + d[0] * 1.4, a.y + d[1] * 1.4, d[0], d[1], '255,245,210', 0.5);
    }
    // Acil tabelası ve giriş saçağı ışığı
    const glow = (x, y, col, r) => { const [sx, sy] = M().worldToIso(x, y); const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, r); g.addColorStop(0, `rgba(${col},${0.35 * night})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(sx, sy, r, r / 2, 0, 0, Math.PI * 2); ctx.fill(); };
    glow(31.5, 13.5, '255,80,80', 60);
    glow(5, 24, '190,240,255', 80);
  }

  // ================================================================ Çizim ve güncelleme
  function drawables(map) {
    if (map.floor !== 0) return [];
    const out = [];
    const keyOf = (o) => {
      const cs = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(([x, y]) => map.rotPt(x, y));
      return Math.max(...cs.map((c) => c[0])) + Math.max(...cs.map((c) => c[1])) - 1;
    };
    for (const c of cars) {
      const o = carObj(c);
      const [cx, cy] = map.worldToIso(c.x, LANES[c.lane].y0 + 0.5);
      out.push({ kind: 'car', key: keyOf(o), cx, cy, draw: (ctx) => VH.map.drawSprite(ctx, o) });
    }
    for (const c of parkers) {
      const o = parkerObj(c);
      const [cx, cy] = map.worldToIso(c.x, c.y);
      out.push({ kind: 'car', key: keyOf(o), cx, cy, draw: (ctx) => VH.map.drawSprite(ctx, o) });
    }
    for (const p of peds) {
      if (!p.dog) continue;
      const g = p.dog;
      const [sx, sy] = map.worldToIso(g.x, g.y);
      out.push({ kind: 'dog', key: map.depthAt(g.x, g.y) + 0.02, cx: sx, cy: sy, draw: (ctx) => drawDog(ctx, sx, sy, g) });
    }
    for (const b of pigeons) {
      if (b.back > 0 && b.fly <= 0) continue;
      const [sx, sy] = map.worldToIso(b.x, b.y);
      out.push({ kind: 'bird', key: map.depthAt(b.x, b.y) + (b.z > 1 ? 50 : 0.01), cx: sx, cy: sy - b.z, draw: (ctx) => drawPigeon(ctx, sx, sy, b) });
    }
    return out;
  }
  function drawGround(ctx) {
    if (VH.hospital && VH.hospital.drawGroundFx) VH.hospital.drawGroundFx(ctx);
    if (VH.progress) VH.progress.drawGround(ctx);
    if (rain && M().floor === 0) {
      // ıslak zemin parıltısı: dalgalanan su halkaları
      const t = performance.now() / 1000;
      ctx.strokeStyle = 'rgba(220,235,250,0.35)'; ctx.lineWidth = 1;
      for (let i = 0; i < 16; i++) {
        const x = ((i * 7.3) % 44) - 3, y = 32.2 + ((i * 3.7) % 4.6);
        const p = (t * 0.8 + i * 0.37) % 1;
        const [sx, sy] = M().worldToIso(x, y);
        ctx.globalAlpha = 1 - p;
        ctx.beginPath(); ctx.ellipse(sx, sy, 2 + p * 9, (2 + p * 9) / 2, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (VH.guide) VH.guide.drawGround(ctx);
  }

  VH.on('shiftStart', (n) => setWeather(n));

  VH.world = {
    get rain() { return rain; },
    set rain(v) { rain = !!v; VH.art.wind = rain ? 2.2 : 1; },
    get cars() { return cars; },
    get peds() { return peds; },
    pigeons,
    init() {
      for (let i = 0; i < 7; i++) spawnPed(true);
      for (let i = 0; i < 3; i++) { spawnCar('W'); cars[cars.length - 1].x = rand(-6, 44); spawnCar('E'); cars[cars.length - 1].x = rand(-6, 44); }
      cars.forEach((c) => { c.v = c.vmax; });
      for (let i = 0; i < 9; i++) parkerSpawn(true);
      initGuard();
    },
    get barrier() { return barrier; },
    get parkers() { return parkers; },
    update(dt, vw, vh) { updateBarrier(dt); updateCars(dt); updateParkers(dt); updateGuard(dt); updatePeds(dt); updatePigeons(dt); updateSky(dt, vw || 800, vh || 600); },
    drawables, drawGround, drawSky, drawLights,
  };
})();
