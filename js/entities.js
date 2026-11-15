// Vita Hospital — Karakterler, hareket, yapay zekâ (NPC) ve etkileşim hedefleri
//
// - Oyuncu (Başhekim): ekran yönüne göre WASD / ok tuşları / joystick ile yürür,
//   duvar ve mobilyalara karşı daire-ızgara çarpışması yapılır.
// - Personel: resepsiyon görevlisi, 2 muayene doktoru, laborant, eczacı; kendi
//   alanlarında çalışma noktaları arasında dolaşır, oyuncu yaklaşınca selam verir.
// - Hastalar: kapı → resepsiyon kuyruğu → bekleme koltuğu → muayene → (kan alma)
//   → eczane → çıkış akışını A* yol bulma ile yürür.
(function () {
  const VH = (window.VH = window.VH || {});
  const M = () => VH.map;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const mod = (k) => (VH.hospital && VH.hospital.mod ? VH.hospital.mod(k) : 1);
  // Aşamalı otomasyon: çekirdek kadro (resepsiyon, eczacı, 2. muayene doktoru) işe alınana dek işi Başhekim yapar
  const CORE = ['receptionist', 'pharmacist', 'doctor2'];
  const core = (id) => !CORE.includes(id) || !VH.cases || !VH.cases.state.core || VH.cases.state.core[id] === true;
  // Personel verimliliği (yetenek, enerji, moral) — staff.js yoksa 1
  const sf = (id) => (VH.staff && VH.staff.timeFactor ? VH.staff.timeFactor(id) : 1);
  const emit = (n, d) => { if (VH.emit) VH.emit(n, d); };

  // ================================================================ Görünüm
  const SKINS = ['#f3cfb1', '#e8b48f', '#c98d62', '#9c6b47', '#f6dcc7', '#b9825a'];
  const HAIRS = ['#2b1d14', '#4a3121', '#7a5230', '#c9a25a', '#1c1c1c', '#8f8f8f', '#a0522d'];
  const CLOTHES = ['#d1495b', '#edae49', '#00798c', '#30638e', '#66a182', '#8e6c8a', '#e07a5f', '#3d405b', '#f2cc8f', '#5c946e'];
  const PANTS = ['#2f3e46', '#354f52', '#3d405b', '#5a4a42', '#283618', '#6b705c', '#22223b'];

  const LOOKS = {
    chief:        { coat: '#fbfdff', shirt: '#2e6f95', tie: '#b83b3b', pants: '#2f3e4e', skin: '#e9b98f', hair: '#3b2a20', hairStyle: 'short', stethoscope: true, badge: '#e6c66e', longCoat: true, shoes: '#3b2a20' },
    receptionist: { coat: '#2a9d8f', shirt: '#e9f5f3', pants: '#264653', skin: '#f3cfb1', hair: '#4a3121', hairStyle: 'bun', headset: true, badge: '#ffffff' },
    doctorA:      { coat: '#fbfdff', shirt: '#5aa9e6', pants: '#5aa9e6', skin: '#e8b48f', hair: '#1c1c1c', hairStyle: 'long', stethoscope: true, glasses: '#7a1d1d', longCoat: true, carry: 'clipboard' },
    doctorB:      { coat: '#fbfdff', shirt: '#7fc8a9', pants: '#7fc8a9', skin: '#c98d62', hair: '#2b1d14', hairStyle: 'short', stethoscope: true, beard: true, longCoat: true, carry: 'tablet' },
    laborant:     { coat: '#f4f7fb', shirt: '#7b5ea7', pants: '#7b5ea7', skin: '#f6dcc7', hair: '#a0522d', hairStyle: 'curly', gloves: '#7b5ea7', goggles: true, longCoat: true },
    pharmacist:   { coat: '#fbfdff', shirt: '#3a7d44', pants: '#3a5a40', skin: '#e8b48f', hair: '#7a5230', hairStyle: 'ponytail', cross: true, glasses: true },
    paramedic:    { coat: '#d9480f', sleeve: '#d9480f', pants: '#2b333b', skin: '#c98d62', hair: '#1c1c1c', hairStyle: 'short', stripes: true, carry: 'kit', shoes: '#111' },
  };

  function randomPatientLook(age) {
    const old = age >= 62;
    const st = pick(['short', 'long', 'bun', 'short', 'bald', 'curly', 'ponytail']);
    const look = {
      coat: pick(CLOTHES), pants: pick(PANTS), skin: pick(SKINS), hair: old ? pick(['#b9b9b9', '#d6d6d6', '#8f8f8f']) : pick(HAIRS),
      hairStyle: st, patient: true, shoes: pick(['#2b2b2b', '#5a4a42', '#f4f4f4', '#30638e']),
    };
    if (Math.random() < 0.22) look.glasses = true;
    if ((st === 'short' || st === 'bald') && Math.random() < 0.3) look.beard = true;
    if ((st === 'long' || st === 'bun') && Math.random() < (old ? 0.45 : 0.18)) look.scarf = pick(['#8e6c8a', '#30638e', '#d1495b', '#edae49', '#66a182', '#f2cc8f']);
    if (old && Math.random() < 0.4) look.cane = true;
    if (!old && Math.random() < 0.18) look.carry = 'bag';
    return look;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  /**
   * 2.5D insan figürü. (sx, sy) ayakların yere bastığı izo nokta.
   * pose: { t, moving, flip, back, sitting, lift, ring }
   */
  /** Sedyede/yatakta yatan hasta: battaniye altında gövde + yastıkta baş (ekran ekseni boyunca). */
  function drawLying(ctx, sx, sy, look, angle) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.scale(1, 0.62);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    rr(ctx, -17, -5, 34, 13, 6);
    ctx.fillStyle = '#9cc7e6';
    rr(ctx, -16, -7, 28, 14, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-14, -2, 24, 2);
    ctx.fillStyle = look.coat;
    rr(ctx, 6, -6, 7, 12, 3);
    ctx.restore();
    // baş (döndürmeden, okunaklı)
    const hx = sx + Math.cos(angle) * 15, hy = sy + Math.sin(angle) * 15 * 0.62;
    ctx.fillStyle = look.skin;
    ctx.beginPath(); ctx.arc(hx, hy - 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath(); ctx.arc(hx, hy - 4.5, 5.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  }

  function drawPerson(ctx, sx, sy, look, pose) {
    pose = pose || {};
    const t = pose.t || 0;
    const moving = !!pose.moving, back = !!pose.back, sit = !!pose.sitting;
    const swing = moving ? Math.sin(t) : 0;
    const bob = moving ? -Math.abs(Math.cos(t)) * 1.3 : 0;

    if (pose.lying) { drawLying(ctx, sx, sy - (pose.lift || 0), look, pose.angle || 0); return; }
    ctx.save();
    ctx.translate(sx, sy);
    // gölge + oyuncu halkası
    ctx.fillStyle = 'rgba(10,30,40,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    if (pose.ring) {
      ctx.strokeStyle = 'rgba(46,196,182,0.95)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.translate(0, -(pose.lift || 0) + bob);
    if (look.scale) ctx.scale(look.scale, look.scale);
    if (pose.flip) ctx.scale(-1, 1);

    const hip = sit ? -9 : -12;
    // ---- bacaklar
    if (sit) {
      ctx.fillStyle = look.pants;
      rr(ctx, -5, hip - 1, 12, 5, 2);           // uyluk (öne doğru)
      ctx.fillRect(3, hip + 2, 4, 7);           // baldır
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(3, hip + 8, 6, 2);
    } else {
      const lx = swing * 2, ly = Math.max(0, swing) * 1.6;
      const rx = -swing * 2, ry = Math.max(0, -swing) * 1.6;
      ctx.fillStyle = look.pants;
      ctx.fillRect(-5 + lx, hip - 1, 4, 12 - ly);
      ctx.fillRect(1 + rx, hip - 1, 4, 12 - ry);
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(-6 + lx, -2 - ly, 5, 2);
      ctx.fillRect(1 + rx, -2 - ry, 5, 2);
    }

    // ---- gövde / önlük
    const top = hip - 18;
    ctx.fillStyle = look.coat;
    ctx.beginPath();
    ctx.moveTo(-8, hip + 1);
    ctx.lineTo(-7, top + 2);
    ctx.quadraticCurveTo(0, top - 2, 7, top + 2);
    ctx.lineTo(8, hip + 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    if (!back) {
      if (look.shirt) { ctx.fillStyle = look.shirt; ctx.fillRect(-2, top + 1, 4, 9); }
      if (look.tie) { ctx.fillStyle = look.tie; ctx.fillRect(-0.8, top + 2, 1.6, 7); }
      if (!look.patient) { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(0, top + 9); ctx.lineTo(0, hip); ctx.stroke(); }
      if (look.badge) { ctx.fillStyle = look.badge; ctx.fillRect(3, top + 4, 3, 2); }
      if (look.cross) { ctx.fillStyle = '#2f9e44'; ctx.fillRect(3.5, top + 3, 1.5, 4.5); ctx.fillRect(2.5, top + 4.5, 3.5, 1.5); }
      if (look.stethoscope) {
        ctx.strokeStyle = '#1f2a33'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(0, top + 3, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.fillStyle = '#9aa7b0'; ctx.beginPath(); ctx.arc(3, top + 9, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- kollar
    const ay = moving ? swing * 2 : 0;
    ctx.fillStyle = look.coat;
    ctx.fillRect(-10, top + 2 - ay, 3, 12);
    ctx.fillRect(7, top + 2 + ay, 3, 12);
    ctx.fillStyle = look.gloves || look.skin;
    ctx.fillRect(-10, top + 13 - ay, 3, 3);
    ctx.fillRect(7, top + 13 + ay, 3, 3);

    // ---- baş
    const hy = top - 7;
    ctx.fillStyle = look.skin;
    ctx.fillRect(-1.5, top - 2, 3, 3); // boyun
    ctx.beginPath(); ctx.arc(0, hy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = look.hair;
    if (back) {
      if (look.hairStyle !== 'bald') { ctx.beginPath(); ctx.arc(0, hy - 0.5, 6.2, 0, Math.PI * 2); ctx.fill(); }
      if (look.hairStyle === 'long') ctx.fillRect(-6, hy, 12, 8);
      if (look.hairStyle === 'bun') { ctx.beginPath(); ctx.arc(0, hy - 6, 3, 0, Math.PI * 2); ctx.fill(); }
    } else {
      if (look.hairStyle === 'long') { ctx.fillRect(-6.5, hy - 2, 3, 9); ctx.fillRect(3.5, hy - 2, 3, 9); }
      if (look.hairStyle !== 'bald') { ctx.beginPath(); ctx.arc(0, hy - 1.5, 6.3, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); }
      if (look.hairStyle === 'bun') { ctx.beginPath(); ctx.arc(-2, hy - 7, 2.8, 0, Math.PI * 2); ctx.fill(); }
      // yüz (bakış yönüne hafif kaydırılmış)
      ctx.fillStyle = '#1d2329';
      ctx.fillRect(0.5, hy - 0.5, 1.4, 1.6);
      ctx.fillRect(3.4, hy - 0.5, 1.4, 1.6);
      if (look.goggles) { ctx.strokeStyle = 'rgba(120,200,230,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(-0.2, hy - 1.6, 6, 3.4); }
      ctx.fillStyle = 'rgba(160,70,60,0.55)';
      ctx.fillRect(1.8, hy + 2.5, 2.2, 0.9);
    }
    ctx.restore();
  }

  // ================================================================ Varlık temel işlemleri
  let uid = 1;
  function makeEntity(kind, props) {
    return Object.assign({
      id: uid++, kind, floor: 0, x: 0, y: 0, path: [], speed: 2.1, anim: 0, moving: false,
      flip: false, back: false, sitting: false, lift: 0, bubble: null, onArrive: null,
    }, props);
  }

  function face(e, dx, dy) {
    // dünya yön vektörünü ekran yönüne çevir
    const [ax, ay] = M().worldToIso(e.x, e.y);
    const [bx, by] = M().worldToIso(e.x + dx, e.y + dy);
    const ix = bx - ax, iy = by - ay;
    if (Math.abs(ix) > 0.01) e.flip = ix < 0;
    if (Math.abs(iy) > 0.01) e.back = iy < 0;
  }
  const faceToward = (e, x, y) => face(e, x - e.x, y - e.y);

  function say(e, text, dur) {
    e.bubble = { text, until: performance.now() + (dur || 3200) };
  }

  // ---------------------------------------------------------------- A* yol bulma
  function findPath(sx, sy, tx, ty, f) {
    const map = M();
    const [W, H] = map.dims(f);
    const idx = (x, y) => y * W + x;
    if (sx === tx && sy === ty) return [];
    const g = new Float32Array(W * H).fill(Infinity);
    const came = new Int32Array(W * H).fill(-1);
    const closed = new Uint8Array(W * H);
    const open = [idx(sx, sy)];
    g[idx(sx, sy)] = 0;
    const h = (x, y) => { const dx = Math.abs(x - tx), dy = Math.abs(y - ty); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
    const goal = idx(tx, ty);
    while (open.length) {
      let bi = 0, bf = Infinity;
      for (let i = 0; i < open.length; i++) {
        const n = open[i], f = g[n] + h(n % W, (n / W) | 0);
        if (f < bf) { bf = f; bi = i; }
      }
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed[cur] = 1;
      const cx = cur % W, cy = (cur / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = cx + dx, ny = cy + dy;
          let ok;
          if (dx && dy) {
            ok = map.canStep(cx, cy, nx, cy, f) && map.canStep(nx, cy, nx, ny, f) &&
                 map.canStep(cx, cy, cx, ny, f) && map.canStep(cx, ny, nx, ny, f);
          } else ok = map.canStep(cx, cy, nx, ny, f) || (nx === tx && ny === ty && !map.edgeBetween(cx, cy, nx, ny, f));
          if (!ok) continue;
          const ni = idx(nx, ny);
          if (closed[ni]) continue;
          const ng = g[cur] + (dx && dy ? 1.414 : 1);
          if (ng < g[ni]) {
            g[ni] = ng; came[ni] = cur;
            if (!open.includes(ni)) open.push(ni);
          }
        }
    }
    if (came[goal] === -1) return null;
    const out = [];
    for (let n = goal; n !== idx(sx, sy); n = came[n]) out.push([(n % W) + 0.5, ((n / W) | 0) + 0.5]);
    return out.reverse();
  }

  /** Varlığı (tx,ty) noktasına yürüt. via: önce ulaşılacak yürünebilir hücre (koltuk/sedye için). */
  function goTo(e, tx, ty, onArrive, via) {
    e.sitting = false; e.lying = false; e.lift = 0;
    const vx = via ? via[0] : Math.floor(tx), vy = via ? via[1] : Math.floor(ty);
    const p = findPath(Math.floor(e.x), Math.floor(e.y), vx, vy, e.floor);
    if (p === null) { e.x = tx; e.y = ty; e.path = []; e.onArrive = null; if (onArrive) onArrive(e); return; }
    if (p.length) p.pop();
    p.push([vx + 0.5, vy + 0.5]);
    if (via) p.push([tx, ty]); else p[p.length - 1] = [tx, ty];
    e.path = p;
    e.onArrive = onArrive || null;
  }

  function stepPath(e, dt) {
    if (!e.path.length) { e.moving = false; return; }
    const [tx, ty] = e.path[0];
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    const step = e.speed * dt;
    if (d > 0.001) face(e, dx, dy);
    if (d <= step) {
      e.x = tx; e.y = ty; e.path.shift();
      if (!e.path.length) {
        e.moving = false;
        const cb = e.onArrive; e.onArrive = null;
        if (cb) cb(e);
        return;
      }
    } else {
      e.x += (dx / d) * step; e.y += (dy / d) * step;
    }
    e.moving = true;
    e.anim += dt * 11;
  }

  // ================================================================ Oyuncu
  const player = makeEntity('player', { id: 'chief', name: 'Başhekim', role: 'Başhekim', x: 4.5, y: 6.6, look: LOOKS.chief });
  const RADIUS = 0.27;
  const input = { x: 0, y: 0, run: false };

  function collides(px, py) {
    const map = M();
    const cx = Math.floor(px), cy = Math.floor(py);
    if (map.isBlocked(cx, cy)) return true;
    const fx = px - cx, fy = py - cy, r = RADIUS;
    const L = fx < r, R = fx > 1 - r, U = fy < r, D = fy > 1 - r;
    if (L && !map.canStep(cx, cy, cx - 1, cy)) return true;
    if (R && !map.canStep(cx, cy, cx + 1, cy)) return true;
    if (U && !map.canStep(cx, cy, cx, cy - 1)) return true;
    if (D && !map.canStep(cx, cy, cx, cy + 1)) return true;
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (!((dx < 0 ? L : R) && (dy < 0 ? U : D))) continue;
      const kx = cx + (dx > 0 ? 1 : 0), ky = cy + (dy > 0 ? 1 : 0);
      if (Math.hypot(px - kx, py - ky) >= r) continue;
      const nx = cx + dx, ny = cy + dy;
      const ok = map.canStep(cx, cy, nx, cy) && map.canStep(nx, cy, nx, ny) &&
                 map.canStep(cx, cy, cx, ny) && map.canStep(cx, ny, nx, ny);
      if (!ok) return true;
    }
    return false;
  }

  function updatePlayer(dt) {
    const mag = Math.min(1, Math.hypot(input.x, input.y));
    if (mag < 0.12 || (VH.ui.isDialogOpen && VH.ui.isDialogOpen())) { player.moving = false; return; }
    // ekran yönü → döndürülmüş dünya köşegeni → dünya
    let rx = input.x + input.y, ry = input.y - input.x;
    const l = Math.hypot(rx, ry) || 1;
    [rx, ry] = M().unrotVec(rx / l, ry / l);
    const speed = 3.1 * mod("playerSpeed") * (input.run ? 1.6 : 1) * mag;
    const mx = rx * speed * dt, my = ry * speed * dt;
    face(player, rx, ry);
    const ox = player.x, oy = player.y;
    if (!collides(player.x + mx, player.y)) player.x += mx;
    if (!collides(player.x, player.y + my)) player.y += my;
    player.moving = Math.abs(player.x - ox) + Math.abs(player.y - oy) > 1e-5;
    if (player.moving) player.anim += dt * 11 * (input.run ? 1.4 : 1);
  }

  // ================================================================ Personel
  const STAFF_DEF = [
    { id: 'receptionist', name: 'Selin Aksoy', role: 'Resepsiyon Görevlisi', look: 'receptionist', room: 'reception',
      action: 'Personelle Konuş', points: [[2.5, 13.4], [3.5, 13.4], [1.6, 13.4]],
      greet: ['Hoş geldiniz Başhekim!', 'Kayıtlar düzenli ilerliyor.', 'Bekleme salonu bugün kalabalık.'] },
    { id: 'doctor1', name: 'Dr. Elif Kaya', role: 'Muayene Doktoru · Oda 1', look: 'doctorA', room: 'exam1',
      action: 'Doktorla Konuş', points: [[8.0, 1.5], [9.5, 4.4], [8.5, 5.6]], exam: 0,
      greet: ['Başhekimim, buyurun.', 'Sıradaki hastayı bekliyorum.', 'Muayene odası hazır.'] },
    { id: 'doctor2', name: 'Dr. Kerem Demir', role: 'Muayene Doktoru · Oda 2', look: 'doctorB', room: 'exam2',
      action: 'Doktorla Konuş', points: [[13.0, 1.5], [14.5, 4.4], [13.5, 5.6]], exam: 1,
      greet: ['Merhaba Başhekimim!', 'Bugün vakalar ilginç.', 'Bir şey danışmak ister misiniz?'] },
    { id: 'laborant', name: 'Murat Yıldız', role: 'Laborant', look: 'laborant', room: 'lab',
      action: 'Tahlil İncele', points: [[21.5, 2.6], [23.5, 3.5], [23.5, 5.5], [19.5, 4.5]],
      greet: ['Numuneler sırada, Başhekimim.', 'Analizör kalibre edildi.', 'Tüpler etiketlendi.'] },
    { id: 'pharmacist', name: 'Ecz. Zeynep Arslan', role: 'Eczacı', look: 'pharmacist', room: 'pharmacy',
      action: 'İlaç Onayla', points: [[27.5, 3.8], [26.5, 2.4], [29.5, 3.5]],
      greet: ['Reçeteler hazır, onayınızı bekliyor.', 'Stoklar yeterli.', 'Hoş geldiniz!'] },
  ];

  const staff = STAFF_DEF.map((d) => makeEntity('staff', {
    def: d, id: d.id, name: d.name, role: d.role, look: LOOKS[d.look],
    x: d.points[0][0], y: d.points[0][1], speed: 1.7, timer: rand(2, 6), busy: false, greeted: false,
  }));
  const staffById = (id) => staff.find((s) => s.id === id);

  function updateStaff(s, dt) {
    if (s.floor < 0) return; // henüz işe alınmamış çekirdek kadro
    stepPath(s, dt);
    // Oyuncu yaklaşınca selam
    const near = s.floor === player.floor && Math.hypot(player.x - s.x, player.y - s.y) < 2.2;
    if (near && !s.greeted) { s.greeted = true; say(s, pick(s.def.greet)); if (!s.path.length) faceToward(s, player.x, player.y); }
    if (!near && Math.hypot(player.x - s.x, player.y - s.y) > 3.5) s.greeted = false;
    if (s.busy || s.path.length) return;
    s.timer -= dt;
    if (s.timer <= 0) {
      s.timer = rand(4, 9);
      const [px, py] = pick(s.def.points);
      goTo(s, px, py, (e) => { if (e.def.id === 'receptionist') e.back = false; });
    }
  }

  // ================================================================ Hastalar
  const FIRST = ['Ayşe', 'Mehmet', 'Fatma', 'Mustafa', 'Emine', 'Ahmet', 'Hatice', 'Ali', 'Zehra', 'Hüseyin', 'Elif', 'Can', 'Deniz', 'Burak', 'Merve', 'Emre', 'Selin', 'Kemal', 'Yasemin', 'Oğuz', 'Derya', 'Tolga', 'Sibel', 'Hakan'];
  const LAST = ['Y.', 'K.', 'D.', 'Ş.', 'A.', 'T.', 'Ç.', 'Ö.', 'B.', 'E.'];
  const COMPLAINTS = [
    'Sürekli yorgunluk ve halsizlik', 'Sık baş ağrısı', 'Baş dönmesi', 'Uyku bozukluğu',
    'Saç dökülmesi', 'Kas krampları', 'Eklem ağrısı', 'Çabuk nefes nefese kalma',
    'Dikkat dağınıklığı', 'Mide yanması', 'El ve ayaklarda uyuşma', 'İştahsızlık',
  ];
  const ENTRANCE = [4.5, 31.4]; // yaya kapısı (korkuluk içi)
  const RECEPTION_SLOTS = [[2.5, 15.5], [2.5, 16.5], [2.5, 17.5], [2.5, 18.5], [3.5, 18.5], [4.5, 18.5], [5.5, 18.5], [5.5, 17.5]];
  const PHARMACY_SLOTS = [[27.5, 6.5], [27.5, 7.4], [28.5, 7.4], [26.5, 7.4], [29.5, 7.4]];
  const SEATS = [
    ...[11, 12, 13].map((x) => ({ seat: [x + 0.5, 14.55], via: [x, 15] })),
    ...[11, 12, 13].map((x) => ({ seat: [x + 0.5, 17.55], via: [x, 18] })),
    ...[16, 17].map((x) => ({ seat: [x + 0.5, 14.55], via: [x, 15] })),
    ...[16, 17].map((x) => ({ seat: [x + 0.5, 17.55], via: [x, 18] })),
    // Kapasite geliştirmesiyle açılan ek koltuklar (cap = gereken seviye)
    { seat: [1.5, 19.55], via: [2, 19], cap: 1 }, { seat: [1.5, 20.55], via: [2, 20], cap: 1 },
    { seat: [14.5, 20.55], via: [14, 21], cap: 2 }, { seat: [15.5, 20.55], via: [15, 21], cap: 2 },
    { seat: [16.5, 20.55], via: [16, 21], cap: 3 }, { seat: [17.5, 20.55], via: [17, 21], cap: 3 },
  ].map((s) => Object.assign({ cap: 0 }, s, { occ: null }));
  const capLevel = () => (VH.hospital && VH.hospital.devLevel ? VH.hospital.devLevel("capacity") : 0);
  const openSeats = () => SEATS.filter((s) => s.cap <= capLevel());
  const EXAMS = [
    { name: 'Muayene 1', bed: [10.75, 5.5], via: [10, 6], doctor: 'doctor1', docSpot: [9.5, 5.5], patient: null },
    { name: 'Muayene 2', bed: [15.75, 5.5], via: [15, 6], doctor: 'doctor2', docSpot: [14.5, 5.5], patient: null },
  ];
  const LAB_CHAIRS = [
    { seat: [17.5, 3.5], via: [18, 3], tech: [17.6, 4.45], patient: null },
    { seat: [17.5, 5.5], via: [18, 5], tech: [17.6, 4.55], patient: null },
  ];
  const LAB_WAIT = [[18.5, 9.5], [19.5, 9.5], [18.5, 10.4], [19.5, 10.4]];

  const patients = [];
  const receptionQueue = [];
  const pharmacyQueue = [];
  const stats = { registered: 0, served: 0, ticket: 0 };
  let spawnTimer = 2;
  const maxPatients = () => 8 + 2 * capLevel();

  const STATUS = {
    queue: 'Resepsiyon kuyruğunda', registering: 'Kayıt yaptırıyor', toSeat: 'Bekleme salonuna gidiyor',
    waiting: 'Bekleme salonunda sırasını bekliyor', toExam: 'Muayene odasına çağrıldı', exam: 'Muayene ediliyor',
    labWait: 'Kan alma sırası bekliyor', toLab: 'Kan alma odasına gidiyor', lab: 'Kan veriyor',
    toPharmacy: 'Eczaneye gidiyor', pharmacy: 'Eczanede ilaç/bilgilendirme bekliyor', leaving: 'Hastaneden ayrılıyor',
  };

  function spawnPatient() {
    const age = Math.floor(rand(18, 78));
    const p = makeEntity('patient', {
      name: pick(FIRST) + ' ' + pick(LAST), age, complaint: pick(COMPLAINTS),
      look: randomPatientLook(age), x: ENTRANCE[0] + rand(-0.3, 0.3), y: ENTRANCE[1],
      speed: rand(1.5, 2.0), state: 'queue', timer: 0, needsLab: Math.random() < 0.6, waitSince: 0,
    });
    patients.push(p);
    receptionQueue.push(p);
    refreshQueue(receptionQueue, RECEPTION_SLOTS);
    say(p, 'Merhaba, kayıt yaptırmak istiyorum.', 2500);
  }
  /** Otoparka park eden araçtan inen hasta: önce bahçeden ana girişe yürür, sonra kayıt kuyruğuna girer. */
  function spawnPatientAt(x, y) {
    if (patients.filter((q) => q.state !== 'resident').length >= maxPatients()) return null;
    const age = Math.floor(rand(18, 78));
    const p = makeEntity('patient', {
      name: pick(FIRST) + ' ' + pick(LAST), age, complaint: pick(COMPLAINTS), look: randomPatientLook(age),
      x, y, speed: rand(1.5, 2.0), state: 'arriving', timer: 0, needsLab: Math.random() < 0.6, waitSince: 0,
    });
    patients.push(p);
    goTo(p, 5.2, 26.5, (e) => {
      e.state = 'queue';
      receptionQueue.push(e);
      refreshQueue(receptionQueue, RECEPTION_SLOTS);
      say(e, 'Arabamı park ettim, kayıt nerede?', 2400);
    });
    return p;
  }

  /** cases.js'teki bir senaryo için özel hasta (sabit ad/yaş/şikâyet). */
  function spawnCasePatient(c) {
    const female = c.sex === 'K';
    const look = randomPatientLook(c.age);
    look.hairStyle = female ? pick(['long', 'bun', 'ponytail', 'curly']) : pick(['short', 'short', 'bald', 'curly']);
    if (!female) { look.scarf = null; } else look.beard = false;
    if (c.age < 13) { look.cane = false; look.beard = false; look.scarf = null; look.glasses = false; }
    if (c.age < 13) look.scale = 0.74;
    const p = makeEntity('patient', {
      name: c.name, age: c.age, complaint: c.complaint, look, caseRef: c,
      x: ENTRANCE[0] + rand(-0.2, 0.2), y: ENTRANCE[1], speed: 1.8, state: 'queue', timer: 0,
      needsLab: false, waitSince: 0,
    });
    patients.push(p);
    receptionQueue.push(p);
    refreshQueue(receptionQueue, RECEPTION_SLOTS);
    say(p, c.arrival || 'Merhaba… doktora görünmem lazım.', 3200);
    return p;
  }

  function refreshQueue(queue, slots) {
    queue.forEach((p, i) => {
      const slot = slots[Math.min(i, slots.length - 1)];
      if (p.slot === slot) return;
      p.slot = slot;
      goTo(p, slot[0], slot[1], (e) => { e.arrivedSlot = true; });
      p.arrivedSlot = false;
    });
  }

  function sitAt(p, seatPos, lift) {
    p.sitting = true;
    p.lift = lift;
    p.x = seatPos[0]; p.y = seatPos[1];
  }

  function leaveQueue(queue, p, slots) {
    const i = queue.indexOf(p);
    if (i >= 0) queue.splice(i, 1);
    p.slot = null;
    queue.forEach((q) => { q.slot = null; });
    refreshQueue(queue, slots);
  }

  // Bekleme durumlarında sabır kaybı (puan/sn). Tedavi alırken toparlanır.
  const PATIENCE_DRAIN = { queue: 0.55, regWait: 0.6, registering: 0.3, waiting: 0.65, toSeat: 0.3, labWait: 0.5, pharmacy: 0.9, exam: 0.25 };
  function updatePatience(p, dt) {
    if (p.state === 'resident' || p.state === 'leaving' || p.erRef) return;
    if (p.patience === undefined) p.patience = 100;
    let drain = PATIENCE_DRAIN[p.state] || 0;
    if (p.state === 'exam' && !p.caseRef) drain = -6;          // muayene ediliyor → toparlanır
    if (p.state === 'lab' || p.state === 'toExam' || p.state === 'toLab') drain = -3;
    if (p.state === 'pharmacy' && !(pharmacyQueue[0] === p && p.awaitingRx)) drain = 0.3;
    drain *= mod('patienceDrain');
    p.patience = Math.max(0, Math.min(100, p.patience - drain * dt));
    // Kayıt kuyruğunda ya da eczanede sabrı tükenen hasta da ayrılır (Başhekim yetişemediyse)
    if (p.patience <= 0 && !p.caseRef && (p.state === 'queue' || p.state === 'regWait' || p.state === 'pharmacy')) {
      const inPh = p.state === 'pharmacy';
      leaveQueue(inPh ? pharmacyQueue : receptionQueue, p, inPh ? PHARMACY_SLOTS : RECEPTION_SLOTS);
      p.awaitingRx = false;
      say(p, inPh ? 'İlacımı alamadım, gidiyorum!' : 'Kayıt bile yapılmadı, gidiyorum!', 3000);
      if (VH.hospital) VH.hospital.onAngryLeave(p);
      p.angry = true; emit('angry', p);
      p.state = 'leaving';
      goTo(p, ENTRANCE[0], ENTRANCE[1] + 0.4, (e) => { e.gone = true; });
      return;
    }
    // Bekleme salonunda sabrı tükenen hasta söylenerek ayrılır
    if (p.patience <= 0 && p.state === 'waiting' && !p.caseRef) {
      if (p.seatRef) { p.seatRef.occ = null; p.seatRef = null; }
      p.sitting = false; p.lift = 0;
      say(p, 'Çok bekledim, başka hastaneye gidiyorum!', 3000);
      if (VH.hospital) VH.hospital.onAngryLeave(p);
      p.angry = true;
      emit('angry', p);
      p.state = 'leaving';
      goTo(p, ENTRANCE[0], ENTRANCE[1] + 0.4, (e) => { e.gone = true; });
    }
  }

  function updatePatient(p, dt) {
    stepPath(p, dt);
    updatePatience(p, dt);
    p.timer -= dt;
    switch (p.state) {
      case 'queue':
        if (receptionQueue[0] === p && p.arrivedSlot && !core('receptionist')) {
          p.state = 'regWait'; faceToward(p, 2.5, 13.5);
          say(p, 'Kayıt için kimse yok mu? Bekliyorum…', 2600);
          emit('needRegister', p);
        } else if (receptionQueue[0] === p && p.arrivedSlot) {
          p.state = 'registering'; p.timer = rand(2.5, 4) * mod('regTime') * sf('receptionist');
          const rec = staffById('receptionist');
          faceToward(p, 2.5, 13.5);
          say(rec, `Hoş geldiniz ${p.name.split(' ')[0]}, şikâyetiniz nedir?`, 2600);
        }
        break;
      case 'registering':
        if (p.timer <= 0) {
          const seat = openSeats().find((s) => !s.occ);
          if (!seat) { p.timer = 1; break; }
          emit('registered', { staff: 'receptionist', p });
          stats.registered++; stats.ticket++;
          p.ticket = 'A-' + String(stats.ticket).padStart(3, '0');
          say(p, `Şikâyetim: ${p.complaint.toLowerCase()}.`, 2600);
          leaveQueue(receptionQueue, p, RECEPTION_SLOTS);
          if (p.caseRef) hook('onRegistered', p);
          seat.occ = p; p.seatRef = seat; p.state = 'toSeat';
          goTo(p, seat.seat[0], seat.seat[1], (e) => {
            sitAt(e, seat.seat, 7); e.state = 'waiting'; e.waitSince = performance.now();
            e.back = false; e.flip = false;
          }, seat.via);
        }
        break;
      case 'waiting':
        // Bekleyen hasta ara sıra otomat / su sebili / kahve makinesine gider (koltuğu ayrılı kalır)
        if (!p.caseRef && !p.refreshed && p.patience !== undefined && p.patience < 85 && Math.random() < dt * 0.04) goRefresh(p);
        break;
      case 'refresh':
        if (p.refreshAt && p.timer <= 0) finishRefresh(p);
        break;
      case 'exam':
        if (p.timer <= 0) finishExam(p);
        break;
      case 'lab':
        if (p.timer <= 0) finishLab(p);
        break;
      case 'pharmacy':
        // Sıranın başındaki hasta Başhekimin "İlaç Onayla" bilgilendirmesini bekler;
        // süre dolarsa eczacı kendisi teslim eder (bonus yok).
        if (pharmacyQueue[0] === p && p.arrivedSlot) {
          if (p.timer > 90) {
            p.timer = 14 * mod('pharmacyWait') * sf('pharmacist');
            p.awaitingRx = true;
            say(p, 'Reçetem hazır mı? Nasıl kullanacağım?', 2600);
          }
          if (!core('pharmacist')) p.timer = Math.max(p.timer, 1);
          else if (p.timer <= 0 && VH.logistics && !VH.logistics.canDispense(p)) { p.timer = 6; say(staffById('pharmacist'), 'Bu ilaç stokta kalmadı! Sipariş bekliyoruz.', 2600); }
          if (p.timer <= 0) {
            p.awaitingRx = false;
            if (VH.logistics) VH.logistics.consume(p);
            say(staffById('pharmacist'), 'Geçmiş olsun, kullanım bilgilerini anlattım.', 2600);
            if (VH.hospital) VH.hospital.onPharmacyAuto(p);
            emit('pharmacyAuto', { staff: 'pharmacist', p });
            leaveQueue(pharmacyQueue, p, PHARMACY_SLOTS);
            leave(p);
          }
        } else p.timer = 999;
        break;
      case 'leaving':
        break;
    }
  }

  // ---------------------------------------------------------------- Elle kayıt (resepsiyon görevlisi yokken)
  function manualRegister(p) {
    if (!p || p.state !== 'regWait') return false;
    p.state = 'registering'; p.timer = 0.5;
    p.patience = Math.min(100, (p.patience || 0) + 8);
    say(p, 'Teşekkürler doktor bey, kaydım yapıldı.', 2000);
    emit('manualRegister', p);
    return true;
  }
  function registerTargets(pl) {
    if (pl.floor !== 0 || core('receptionist')) return [];
    const p = receptionQueue[0];
    if (!p || p.state !== 'regWait') return [];
    const desk = devices.find((d) => d.tag === 'reception_desk' && d.floor === 0);
    const dDesk = desk ? rectDist(pl.x, pl.y, desk) : 9;
    const dPat = Math.hypot(p.x - pl.x, p.y - pl.y);
    if (Math.min(dDesk, dPat) > 1.6) return [];
    const n = receptionQueue.filter((q) => q.state === 'regWait' || q.state === 'queue').length;
    return [{ type: 'register', name: `${p.name} · kuyrukta ${n} hasta`, action: '📋 Hastayı Kaydet', x: p.x, y: p.y, dist: Math.min(dDesk, dPat) - 1.2, ref: p, handler: (t) => manualRegister(t.ref) }];
  }
  /** Çekirdek kadro görünürlüğü: işe alınmamış kişi haritada yoktur. */
  function syncCore() {
    for (const id of CORE) { const s = staffById(id); if (s) s.floor = core(id) ? 0 : -9; }
  }

  // ---------------------------------------------------------------- İhtiyaçlar (otomat, su, kahve)
  const REFRESH_KINDS = { vending: { icon: '🥤', say: 'Bir şeyler alayım…', gain: 22, income: 25 }, water_cooler: { icon: '💧', say: 'Biraz su içeyim.', gain: 16, income: 0 }, coffee_machine: { icon: '☕', say: 'Kahve iyi gelir.', gain: 26, income: 20 } };
  function accessCell(o) {
    const map = M();
    const cand = [];
    for (let x = o.x - 1; x <= o.x + o.w; x++) for (let y = o.y - 1; y <= o.y + o.h; y++) {
      const inside = x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h;
      const diag = (x < o.x || x >= o.x + o.w) && (y < o.y || y >= o.y + o.h);
      if (inside || diag || map.isBlocked(x, y, 0)) continue;
      cand.push([x, y]);
    }
    return cand.sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))[0] || null;
  }
  function goRefresh(p) {
    const objs = M().floorObjects(0).filter((o) => REFRESH_KINDS[o.k] && o.x >= 0 && o.y >= 0 && o.x < 31 && o.y < 23);
    if (!objs.length) { p.refreshed = true; return; }
    objs.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    const o = objs[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * objs.length)];
    const cell = accessCell(o);
    if (!cell) { p.refreshed = true; return; }
    p.refreshed = true; p.refreshObj = o; p.state = 'refresh'; p.refreshAt = false;
    say(p, REFRESH_KINDS[o.k].say, 1800);
    goTo(p, cell[0] + 0.5, cell[1] + 0.5, (e) => {
      faceToward(e, o.x + o.w / 2, o.y + o.h / 2);
      e.refreshAt = true; e.timer = 2.2;
    });
  }
  function finishRefresh(p) {
    const kind = REFRESH_KINDS[p.refreshObj.k];
    p.patience = Math.min(100, (p.patience || 0) + kind.gain);
    p.emote = { icon: kind.icon, until: performance.now() + 2600 };
    emit('refresh', { p, kind: p.refreshObj.k, income: kind.income, x: p.x, y: p.y });
    p.refreshAt = false;
    const seat = p.seatRef;
    if (!seat) { p.state = 'waiting'; return; }
    p.state = 'toSeat';
    goTo(p, seat.seat[0], seat.seat[1], (e) => { sitAt(e, seat.seat, 7); e.state = 'waiting'; e.back = false; e.flip = false; }, seat.via);
  }

  function callNextPatients() {
    // Boş muayene odası varsa en uzun bekleyen hastayı çağır
    for (const ex of EXAMS) {
      if (ex.patient || !core(ex.doctor)) continue;
      // Vaka hastası her zaman önce çağrılır
      const waiting = patients.filter((p) => p.state === 'waiting')
        .sort((a, b) => (b.caseRef ? 1 : 0) - (a.caseRef ? 1 : 0) || a.waitSince - b.waitSince);
      if (!waiting.length) break;
      const p = waiting[0];
      ex.patient = p;
      p.seatRef.occ = null; p.seatRef = null;
      p.state = 'toExam'; p.examRef = ex;
      say(staffById('receptionist'), `${p.ticket} numaralı hasta, ${ex.name}!`, 3000);
      walkToExam(p, ex);
    }
    // Kan alma koltuğu boşsa bekleyeni al (vaka hastası öncelikli)
    for (const ch of LAB_CHAIRS) {
      if (ch.patient) continue;
      const p = patients.find((q) => q.state === 'labWait' && q.caseRef) || patients.find((q) => q.state === 'labWait');
      if (!p) break;
      ch.patient = p; p.state = 'toLab'; p.labRef = ch;
      goTo(p, ch.seat[0], ch.seat[1], (e) => {
        sitAt(e, ch.seat, 9); e.state = 'lab'; e.timer = rand(5, 8) * mod("labTime") * sf('laborant');
        const tech = staffById('laborant');
        tech.busy = true;
        goTo(tech, ch.tech[0], ch.tech[1], (t) => { faceToward(t, ch.seat[0], ch.seat[1]); say(t, 'Küçük bir iğne batması hissedeceksiniz.', 2400); });
      }, ch.via);
    }
  }

  function hook(name, p) {
    if (VH.cases && VH.cases[name]) VH.cases[name](p);
  }

  function walkToExam(p, ex) {
    goTo(p, ex.bed[0], ex.bed[1], (e) => {
      sitAt(e, ex.bed, 13); e.state = 'exam';
      // Vaka hastası, Başhekim karar verene kadar odada kalır
      e.timer = e.caseRef ? Infinity : rand(7, 11) * mod("examTime") * sf(ex.doctor);
      const doc = staffById(ex.doctor);
      doc.busy = true;
      goTo(doc, ex.docSpot[0], ex.docSpot[1], (d) => { faceToward(d, ex.bed[0], ex.bed[1]); say(d, 'Nasıl şikâyetiniz, anlatın lütfen.', 2600); });
      if (e.caseRef) hook('onExamStart', e);
    }, ex.via);
  }

  /** Vaka hastasını kan almaya gönder; muayene odası rezerve kalır, sonra odaya döner. */
  function sendToLab(p) {
    const ex = p.examRef;
    const doc = staffById(ex.doctor);
    doc.busy = false; doc.timer = 0.5;
    say(doc, 'Kan alma birimine geçelim, sonra burada devam edeceğiz.', 2600);
    p.returnToExam = true;
    p.state = 'labWait';
    const spot = LAB_WAIT[0];
    goTo(p, spot[0], spot[1]);
  }

  /** Vaka sonucu verildikten sonra hastayı eczaneye ve çıkışa yönlendir. */
  function discharge(p) {
    const ex = p.examRef;
    if (ex) {
      ex.patient = null; p.examRef = null;
      const doc = staffById(ex.doctor);
      doc.busy = false; doc.timer = 0.5;
    }
    p.caseDone = true;
    if (p.imagingNext && VH.floors && VH.floors.sendImaging(p, { caseRef: p.caseRef })) return;
    toPharmacy(p);
  }

  function finishExam(p) {
    const ex = p.examRef;
    emit('examDone', { staff: ex.doctor, p });
    ex.patient = null; p.examRef = null;
    const doc = staffById(ex.doctor);
    doc.busy = false; doc.timer = 0.5;
    if (p.needsLab) {
      say(doc, 'Kan tahlili isteyelim.', 2400);
      const spot = LAB_WAIT[patients.filter((q) => q.state === 'labWait').length % LAB_WAIT.length];
      p.state = 'labWait';
      goTo(p, spot[0], spot[1]);
    } else {
      say(doc, 'Eczaneye uğrayıp bilgilendirme alın.', 2400);
      toPharmacy(p);
    }
  }

  function finishLab(p) {
    const ch = p.labRef;
    emit('labDone', { staff: 'laborant', p });
    ch.patient = null; p.labRef = null;
    const tech = staffById('laborant');
    tech.busy = false;
    goTo(tech, 21.5, 2.6, (t) => { t.back = true; });
    p.labDone = true;
    if (p.returnToExam && p.examRef) {
      p.returnToExam = false;
      p.state = 'toExam';
      walkToExam(p, p.examRef);
      hook('onLabDone', p);
      return;
    }
    toPharmacy(p);
  }

  function toPharmacy(p) {
    p.state = 'pharmacy'; p.timer = 999;
    pharmacyQueue.push(p);
    refreshQueue(pharmacyQueue, PHARMACY_SLOTS);
  }

  function leave(p, dest) {
    p.state = 'leaving';
    stats.served++;
    if (VH.hospital) VH.hospital.onServed(p);
    emit('served', p);
    if (dest) goTo(p, dest[0], dest[1], (e) => { e.gone = true; if (dest[2]) dest[2](e); });
    else goTo(p, ENTRANCE[0], ENTRANCE[1] + 0.4, (e) => { e.gone = true; });
  }

  function updatePatients(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = rand(7, 13) * mod("spawnInterval");
      const busySeats = SEATS.filter((s) => s.occ).length;
      if (patients.filter((p) => p.state !== "resident").length < maxPatients() && busySeats < openSeats().length - 1) spawnPatient();
    }
    patients.forEach((p) => updatePatient(p, dt));
    callNextPatients();
    for (let i = patients.length - 1; i >= 0; i--) if (patients[i].gone) patients.splice(i, 1);
  }

  // ================================================================ Etkileşim hedefleri
  const DEVICES = {
    reception_desk:   { name: 'Hasta Kayıt Bankosu', action: 'Kayıtları Gör', icon: '📋' },
    queue_display:    { name: 'Sıra Ekranı', action: 'Sırayı Gör', icon: '🔢' },
    exam_bed:         { name: 'Muayene Sedyesi', action: 'Hastayı Muayene Et', icon: '🩺' },
    analyzer:         { name: 'Hematoloji Analizörü', action: 'Tahlil İncele', icon: '🧪' },
    centrifuge:       { name: 'Santrifüj', action: 'Tahlil İncele', icon: '🧪' },
    microscope:       { name: 'Mikroskop İstasyonu', action: 'Tahlil İncele', icon: '🔬' },
    gurney:           { name: 'Acil Sedyesi', action: 'Acil Müdahale', icon: '🚑' },
    monitor:          { name: 'Hasta Monitörü', action: 'Acil Müdahale', icon: '💓' },
    ventilator:       { name: 'Ventilatör', action: 'Acil Müdahale', icon: '🫁' },
    defibrillator:    { name: 'Defibrilatör', action: 'Acil Müdahale', icon: '⚡' },
    oxygen:           { name: 'Oksijen Tüpleri', action: 'Acil Müdahale', icon: '🫧' },
    triage:           { name: 'Triyaj Bankosu', action: 'Acil Müdahale', icon: '🚨' },
    pharmacy_counter: { name: 'Eczane Bankosu', action: 'İlaç Onayla', icon: '💊' },
    chief_desk:       { name: 'Başhekimlik Bilgisayarı', action: 'Yönetim Terminali', icon: '🖥️' },
    archive_terminal: { name: 'Vaka Arşiv Terminali', action: 'Vaka Arşivi', icon: '🗂️' },
    iv:               { name: 'Serum (IV) Askısı', action: 'Acil Müdahale', icon: '💧' },
    elevator:         { name: 'Asansör', action: 'Asansör', icon: '🛗' },
    // Üst katlar
    operating_table:  { name: 'Ameliyat Masası', action: 'İncele', icon: '🩻', info: 'Ameliyathane hazır. Travma hastaları stabilize edildikten sonra cerrahi değerlendirmeye alınabiliyor (acil travma ödülü +%50).' },
    surgical_lamp:    { name: 'Ameliyat Lambası', action: 'İncele', icon: '💡', info: 'Gölgesiz ameliyat lambası kalibre edildi.' },
    anesthesia:       { name: 'Anestezi Cihazı', action: 'İncele', icon: '😷', info: 'Anestezi cihazı günlük kontrolden geçti.' },
    scrub:            { name: 'Cerrahi El Yıkama İstasyonu', action: 'İncele', icon: '🧼', info: 'Cerrahi el antisepsisi en az 2-3 dakika sürer. Enfeksiyon önlemenin temel adımıdır.' },
    ward_bed:         { name: 'Servis Yatağı', action: 'İncele', icon: '🛏️', info: 'Yatan hasta servisi: acil serviste stabilize edilen hastalar buraya yatırılıyor (+₺500 yatış geliri).' },
    incubator:        { name: 'Küvöz', action: 'İncele', icon: '👶', info: 'Pediatri servisi: çocuk vakalarında doğru uzman yönlendirmesi ek ödül getirir.' },
    nurse_station:    { name: 'Hemşire İstasyonu', action: 'İncele', icon: '📋', info: 'Hemşire istasyonu: ilaç saatleri ve hasta takip çizelgeleri burada tutuluyor.' },
    xray:             { name: 'Röntgen Cihazı', action: 'İncele', icon: '🩻', info: 'Radyoloji katı açık: "Daha fazla tetkik" kararları hastane içinde yapılıyor (+₺1.000).' },
    ultrasound:       { name: 'Ultrason', action: 'İncele', icon: '📡', info: 'Ultrason cihazı radyasyon kullanmaz; birçok tetkikte ilk basamaktır.' },
    ecg:              { name: 'EKG Cihazı', action: 'İncele', icon: '💓', info: 'EKG kalbin elektriksel aktivitesini kaydeder; çarpıntı ve göğüs ağrısında temel tetkiktir.' },
    dialysis:         { name: 'Diyaliz Makinesi', action: 'İncele', icon: '🩸', info: 'Diyaliz ünitesi böbrek hastalarına haftada birkaç seans hizmet verir.' },
    pacs:             { name: 'Görüntüleme Arşivi (PACS)', action: 'İncele', icon: '🖥️', info: 'Tüm görüntüleme raporları dijital arşivde saklanıyor.' },
    mri:              { name: 'MR Cihazı', action: 'İncele', icon: '🧲', info: 'MR güçlü manyetik alan kullanır; kalp pili gibi implantı olan hastalarda çekim öncesi uygunluk mutlaka kontrol edilir.' },
    ct:               { name: 'BT Tarayıcı', action: 'İncele', icon: '🖥️', info: 'Bilgisayarlı tomografi inme ve travmada hızlı tanı sağlar; radyasyon dozu nedeniyle gereksiz çekimden kaçınılır.' },
    food_counter:     { name: 'Yemek Tezgâhı', action: '🍽️ Yemek Al (₺60)', icon: '🍽️' },
    coffee_bar:       { name: 'Kahve Köşesi', action: '☕ Kahve Al (₺20)', icon: '☕' },
  };
  let devices = [];
  function buildDevices() {
    devices = [];
    M().FLOOR_DEFS.forEach((def, f) => def.objects.filter((o) => DEVICES[o.tag]).forEach((o) => devices.push(Object.assign({
      type: 'device', tag: o.tag, obj: o, floor: f,
      x0: o.x, y0: o.y, x1: o.x + (o.w || 1), y1: o.y + (o.h || 1),
      x: o.x + (o.w || 1) / 2, y: o.y + (o.h || 1) / 2,
    }, DEVICES[o.tag]))));
  }

  const RANGE_ENT = 1.7, RANGE_DEV = 1.15;
  function rectDist(px, py, d) {
    const dx = Math.max(d.x0 - px, 0, px - d.x1);
    const dy = Math.max(d.y0 - py, 0, py - d.y1);
    return Math.hypot(dx, dy);
  }

  function targetOfEntity(e) {
    if (e.kind === 'staff') return { type: 'staff', ref: e, name: e.name, action: e.def.action, x: e.x, y: e.y };
    if (e.erRef) return { type: 'patient', ref: e, name: e.name, action: 'Acil Müdahale', x: e.x, y: e.y };
    return { type: 'patient', ref: e, name: e.name, action: 'Hastayı Muayene Et', x: e.x, y: e.y };
  }

  /** Oyuncunun yakınındaki etkileşim hedefleri (en yakın önce, eylem başına tek). */
  function nearbyTargets() {
    const out = [];
    for (const e of staff.concat(patients)) {
      if (e.state === 'leaving' || e.floor !== player.floor || e.gone) continue;
      const d = Math.hypot(e.x - player.x, e.y - player.y);
      if (d <= RANGE_ENT) out.push(Object.assign(targetOfEntity(e), { dist: d }));
    }
    for (const dv of devices) {
      if (dv.floor !== player.floor) continue;
      const d = rectDist(player.x, player.y, dv);
      if (d <= RANGE_DEV) out.push({ type: 'device', ref: dv, name: dv.name, action: dv.action, x: dv.x, y: dv.y, dist: d + 0.3 });
    }
    for (const prov of VH.targetProviders || []) (prov(player) || []).forEach((t) => out.push(t));
    registerTargets(player).forEach((t) => out.push(t));
    // Aktif acil vakada ihtiyaç duyulan cihaz/hasta öne alınır
    if (VH.hospital && VH.hospital.priority) out.forEach((t) => { t.dist -= VH.hospital.priority(t); });
    out.sort((a, b) => a.dist - b.dist);
    const seen = new Set();
    return out.filter((t) => { if (seen.has(t.action)) return false; seen.add(t.action); return true; });
  }

  // ---------------------------------------------------------------- Diyalog içerikleri
  function describe(t) {
    const waiting = patients.filter((p) => p.state === 'waiting').length;
    if (t.type === 'staff') {
      const s = t.ref;
      faceToward(s, player.x, player.y);
      let text;
      switch (s.id) {
        case 'receptionist':
          text = `Bugün ${stats.registered} hasta kaydettik. Kuyrukta ${receptionQueue.length}, bekleme salonunda ${waiting} kişi var.`;
          break;
        case 'doctor1': case 'doctor2': {
          const ex = EXAMS[s.def.exam];
          text = ex.patient
            ? `Şu an ${ex.patient.name} (${ex.patient.age}) ile ilgileniyorum. Şikâyeti: ${ex.patient.complaint.toLowerCase()}. Hastalar başta her şeyi anlatmıyor; doğru sorular sormak gerekiyor.`
            : 'Odam hazır, sıradaki hastayı bekliyorum. Zor bir vaka gelirse sizi çağıracağım Başhekimim.';
          break;
        }
        case 'laborant': {
          const n = patients.filter((p) => p.state === 'lab' || p.state === 'labWait' || p.state === 'toLab').length;
          text = `Kan alma sırasında ${n} hasta var. Hemogram, ferritin, B12, D vitamini panelleri çalışılabiliyor.`;
          break;
        }
        case 'pharmacist':
          text = `Teslim bekleyen ${pharmacyQueue.length} hasta var. Her hastaya ilacın nasıl kullanılacağını anlatıyoruz.`;
          break;
        default:
          text = (s.def.info ? s.def.info + ' ' : '') + pick(s.def.greet);
      }
      return { icon: '👩‍⚕️', title: s.name, subtitle: s.role, text };
    }
    if (t.type === 'patient') {
      const p = t.ref;
      faceToward(p, player.x, player.y);
      say(p, pick(['Merhaba doktor bey.', 'Ne zaman sıra gelir?', 'Biraz yorgunum…', 'Teşekkürler.']), 2200);
      return {
        icon: '🧑', title: `${p.name}, ${p.age} yaş`, subtitle: (p.ticket ? p.ticket + ' · ' : '') + STATUS[p.state],
        text: `Şikâyet: ${p.complaint}.\n"Son zamanlarda kendimi pek iyi hissetmiyorum doktor bey…"`,
      };
    }
    const dv = t.ref;
    let text;
    switch (dv.tag) {
      case 'reception_desk': text = `Bugün kayıt: ${stats.registered} · Taburcu: ${stats.served} · Kuyruk: ${receptionQueue.length}`; break;
      case 'queue_display': text = stats.ticket ? `Son verilen sıra numarası: A-${String(stats.ticket).padStart(3, '0')}` : 'Henüz sıra numarası verilmedi.'; break;
      case 'exam_bed': text = 'Muayene sedyesi temiz ve hazır.'; break;
      case 'analyzer': case 'centrifuge': case 'microscope': {
        const n = patients.filter((p) => p.labDone && p.state !== 'leaving').length;
        text = `${dv.name} hazır. İşlenen numune: ${n}. Referans aralığı dışındaki değerler burada görüntülenecek.`;
        break;
      }
      case 'pharmacy_counter': text = `Onay bekleyen reçete/bilgilendirme: ${pharmacyQueue.length}.`; break;
      case 'chief_desk': text = 'Başhekim Yönetim & İnşa Paneli: bütçe ve itibar biriktikçe yeni servisler açabileceksiniz.'; break;
      case 'archive_terminal': text = 'Vaka arşivi: henüz çözülmüş vaka yok.'; break;
      default: text = dv.info || 'Acil serviste şu an kritik hasta yok. Ambulans geldiğinde siren duyacaksınız.';
    }
    return { icon: dv.icon, title: dv.name, subtitle: dv.action, text };
  }

  function interact(t) {
    if (!t) return;
    if (VH.ui.isDialogOpen()) { VH.ui.closeDialog(); return; }
    if (t.handler) { t.handler(t); return; }
    for (const h of VH.interactHandlers || []) if (h(t)) return;
    if (VH.hospital && VH.hospital.handleInteract(t)) return;
    if (VH.cases && VH.cases.handleInteract(t)) return;
    const spec = describe(t);
    VH.ui.openDialog(spec);
  }

  /** Ekrandaki tıklamayı bir hedefe çevirir (karakter gövdesi veya cihaz ayak izi). */
  function hitTest(px, py, vw, vh) {
    const cam = M().camera;
    let best = null, bestD = Infinity;
    for (const e of staff.concat(patients)) {
      if (e.floor !== player.floor) continue;
      const [ix, iy] = M().worldToIso(e.x, e.y);
      const [sx, sy] = cam.toScreen(ix, iy - (e.lift || 0), vw, vh);
      const z = cam.zoom;
      if (px > sx - 11 * z && px < sx + 11 * z && py > sy - 48 * z && py < sy + 4 * z) {
        const d = Math.abs(px - sx) + Math.abs(py - (sy - 22 * z));
        if (d < bestD) { bestD = d; best = targetOfEntity(e); }
      }
    }
    if (best) return best;
    const [ix, iy] = cam.toIso(px, py, vw, vh);
    const [wx, wy] = M().isoToWorld(ix, iy);
    for (const dv of devices) if (dv.floor === player.floor && rectDist(wx, wy, dv) < 0.35) return { type: 'device', ref: dv, name: dv.name, action: dv.action, x: dv.x, y: dv.y };
    return null;
  }

  function inRange(t) {
    if (t.type === 'device') return rectDist(player.x, player.y, t.ref) <= RANGE_DEV;
    return Math.hypot(t.ref.x - player.x, t.ref.y - player.y) <= RANGE_ENT;
  }

  // ================================================================ Çizim
  function moodOf(e) {
    if (e.kind !== 'patient') return e.kind === 'staff' && VH.staff && VH.staff.energy(e.id) < 25 ? 0 : 1;
    if (e.erRef || e.state === 'resident') return 0;
    if (e.state === 'leaving') return e.angry ? -1 : 1;
    const pt = e.patience === undefined ? 100 : e.patience;
    return pt >= 65 ? 1 : pt >= 30 ? 0 : -1;
  }

  /** Ek karakterler (paramedik, yaya vb.) world.js tarafından eklenir. */
  const extraPeople = [];
  function drawables(map) {
    const now = performance.now();
    const all = [player].concat(staff, patients, extraPeople).filter((e) => e.floor === map.floor && !e.gone);
    return all.map((e) => {
      const [sx, sy] = map.worldToIso(e.x, e.y);
      let angle = 0;
      if (e.lying) { const [ax, ay] = map.worldToIso(e.x + 1, e.y); angle = Math.atan2(ay - sy, ax - sx); }
      if (e.stretcher && !e.lying) {
        // sedye hareket yönüne döner (yönü son hareketten hatırlar)
        const tgt = e.path && e.path[0];
        if (tgt && Math.hypot(tgt[0] - e.x, tgt[1] - e.y) > 0.05) { const [ax, ay] = map.worldToIso(tgt[0], tgt[1]); e._sang = Math.atan2(ay - sy, ax - sx); }
        angle = e._sang !== undefined ? e._sang : 0;
      }
      const working = e.kind === 'staff' && !e.moving && (e.busy || !!e.task);
      return {
        // Oturan karakter, üzerine oturduğu koltuk/sedyeden sonra çizilmeli (ön hücre anahtarını geçer)
        kind: 'ent', key: map.depthAt(e.x, e.y) + (e.sitting || e.lying ? 0.9 : 0.02), cx: sx, cy: sy,
        draw: (ctx) => (VH.people ? VH.people.draw : drawPerson)(ctx, sx, sy, e.look, {
          t: e.anim, t2: now / 1000 + (typeof e.id === 'number' ? e.id : 7) * 0.77, moving: e.moving, flip: e.flip, back: e.back,
          sitting: e.sitting, lift: e.lift, ring: e === player, lying: e.lying, angle, chair: !!e.chair, mood: moodOf(e), stretcher: !!e.stretcher && !e.lying, work: working,
        }),
      };
    });
  }

  function bubble(ctx, x, y, text, accent) {
    ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > 170 && line) { lines.push(line); line = w; } else line = test;
    }
    lines.push(line);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
    const h = lines.length * 15 + 10;
    const bx = x - w / 2, by = y - h - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.strokeStyle = accent || 'rgba(15,42,58,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, w, h, 8); else ctx.rect(bx, by, w, h);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, by + h - 0.5); ctx.lineTo(x, by + h + 6); ctx.lineTo(x + 5, by + h - 0.5); ctx.fill();
    ctx.fillStyle = '#16323f';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x, by + 6 + i * 15));
  }

  /** Ekran-uzayı katmanı: konuşma balonları ve etkileşim ikonu. */
  function drawOverlay(ctx, vw, vh, focus, touch) {
    const cam = M().camera, z = cam.zoom, now = performance.now();
    const head = (e) => {
      const [ix, iy] = M().worldToIso(e.x, e.y);
      return cam.toScreen(ix, iy - (e.lift || 0) - 50, vw, vh);
    };
    for (const e of staff.concat(patients, [player], extraPeople)) {
      if (!e.bubble || e.floor !== player.floor) continue;
      if (now > e.bubble.until) { e.bubble = null; continue; }
      const [sx, sy] = head(e);
      if (sx < -100 || sx > vw + 100 || sy < -60 || sy > vh + 60) continue;
      bubble(ctx, sx, sy + 2 * z, e.bubble.text, e.kind === 'staff' ? 'rgba(46,196,182,0.9)' : null);
    }
    // Duygu / ihtiyaç simgeleri (konuşma balonu yokken): kızgın, susamış, yorgun personel
    ctx.font = '14px system-ui, "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const e of patients.concat(staff)) {
      if (e.bubble || e.floor !== player.floor || e.gone || e.lying) continue;
      let icon = null;
      if (e.emote && now < e.emote.until) icon = e.emote.icon;
      else if (e.kind === 'patient' && !e.caseRef && (e.state === 'waiting' || e.state === 'queue') && e.patience !== undefined && e.patience < 30) icon = '😠';
      else if (e.kind === 'staff' && VH.staff && VH.staff.energy(e.id) < 25) icon = '💤';
      if (!icon) continue;
      const [sx, sy] = head(e);
      if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;
      const fl = Math.sin(now / 350 + (e.id || 0)) * 2;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(sx + 10, sy + 4 + fl, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(sx + 3, sy + 13 + fl, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(icon, sx + 10, sy + 5 + fl);
    }
    // Vaka hastası işareti (altın yıldız)
    for (const p of patients) {
      if (!p.caseRef || p.caseDone || p.bubble || p.floor !== player.floor || (focus && focus.ref === p)) continue;
      const [sx, sy] = head(p);
      if (sx < -40 || sx > vw + 40 || sy < -40 || sy > vh + 40) continue;
      const bob = Math.sin(now / 300) * 3;
      ctx.fillStyle = '#f5b82e';
      ctx.beginPath(); ctx.arc(sx, sy + bob, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#3a2600';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', sx, sy + bob + 1);
    }
    if (focus) {
      let sx, sy;
      const ent = focus.ref && focus.type !== 'device' && typeof focus.ref.x === 'number' && focus.ref.look ? focus.ref : null;
      if (!ent) {
        if (!isFinite(focus.x) || !isFinite(focus.y)) return;
        const [ix, iy] = M().worldToIso(focus.x, focus.y);
        [sx, sy] = cam.toScreen(ix, iy - 46, vw, vh);
      } else {
        if (ent.bubble) return;
        [sx, sy] = head(ent);
      }
      const pulse = 1 + Math.sin(now / 220) * 0.08;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = '#2ec4b6';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#062026';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(touch ? '!' : 'E', 0, 1);
      ctx.restore();
    }
  }

  // ================================================================ Dışa aktarılan API
  VH.entities = {
    player, staff, patients, LOOKS, drawPerson, input, stats,
    list: [player],
    init() {
      buildDevices();
      // Başlangıçta birkaç hasta: biri kuyrukta, ikisi bekleme salonunda
      spawnPatient();
      for (let i = 0; i < 2; i++) {
        const p = makeEntity('patient', {
          name: pick(FIRST) + ' ' + pick(LAST), age: Math.floor(rand(20, 70)), complaint: pick(COMPLAINTS),
          look: randomPatientLook(40), speed: rand(1.5, 2.0), state: 'waiting', needsLab: Math.random() < 0.6,
          waitSince: performance.now() + i * 10000, timer: 0,
        });
        stats.registered++; stats.ticket++;
        p.ticket = 'A-' + String(stats.ticket).padStart(3, '0');
        const seat = SEATS[i * 3 + 1];
        seat.occ = p; p.seatRef = seat;
        sitAt(p, seat.seat, 7); p.back = false;
        patients.push(p);
      }
    },
    update(dt) {
      updatePlayer(dt);
      staff.forEach((s) => updateStaff(s, dt));
      updatePatients(dt);
    },
    drawables,
    drawOverlay,
    nearbyTargets,
    interact,
    hitTest,
    inRange,
    say,
    // test yardımcıları
    _collides: collides,
    _findPath: findPath,
    STATUS, EXAMS,
    spawnCasePatient,
    sendToLab,
    discharge,
    staffById,
    faceToward,
    // Aşama 5 API'si (hospital.js)
    makeEntity, goTo, sitAt, randomPatientLook, rectDist,
    stepPath, face, extraPeople, accessCell, buildDevices,
    _refresh: (p) => goRefresh(p),
    manualRegister, registerTargets, syncCore, core, CORE,
    get receptionQueue() { return receptionQueue; },
    get pharmacyQueue() { return pharmacyQueue; },
    /** Hastayı asansörle başka bir kata taşı ve oradaki hedefe yürüt. */
    moveToFloor(p, f, x, y, cb, via) {
      const lift = p.floor === 0 ? [29.5, 10.4] : [2.5, 7.9];
      goTo(p, lift[0], lift[1], (e) => {
        e.floor = f;
        const [ax, ay] = M().floorArrive(f);
        e.x = ax; e.y = ay; e.path = [];
        goTo(e, x, y, cb, via);
      });
    },
    /** Hasta akışı için ayrılmış hücreler (düzenleme modu bunları kapatamaz). */
    keySpots() {
      const c = (p) => [Math.floor(p[0]), Math.floor(p[1])];
      const out = [c(ENTRANCE), [4, 24]].concat(RECEPTION_SLOTS.map(c), PHARMACY_SLOTS.map(c), LAB_WAIT.map(c));
      SEATS.forEach((s) => { out.push(s.via, c(s.seat)); });
      EXAMS.forEach((e) => { out.push(e.via, c(e.docSpot)); });
      LAB_CHAIRS.forEach((l) => { out.push(l.via, c(l.tech)); });
      return out;
    },
    get EXAMS_LIST() { return EXAMS; },
    get devices() { return devices; },
    get pharmacyFront() {
      const p = pharmacyQueue[0];
      return p && p.arrivedSlot && p.awaitingRx ? p : null;
    },
    /** Eczanede Başhekim onayı verildi: hasta hemen ayrılır. */
    approvePharmacy(p, dest) {
      p.awaitingRx = false;
      leaveQueue(pharmacyQueue, p, PHARMACY_SLOTS);
      leave(p, dest);
    },
    addStaff(def, floor) {
      const s = makeEntity('staff', {
        def, id: def.id, name: def.name, role: def.role, look: def.look, floor: floor || 0,
        x: def.points[0][0], y: def.points[0][1], speed: 1.6, timer: rand(1, 4), busy: false, greeted: false,
      });
      staff.push(s);
      return s;
    },
    /** Yatan/serviste oturan statik hasta (üst katlar). */
    addResident(props) {
      const p = makeEntity('patient', Object.assign({
        name: pick(FIRST) + ' ' + pick(LAST), age: Math.floor(rand(20, 80)), complaint: 'Serviste takip ediliyor',
        look: randomPatientLook(), state: 'resident', timer: 0,
      }, props));
      p.look = Object.assign({}, p.look, { gown: true, cane: false, carry: null });
      p.sitting = true;
      patients.push(p);
      return p;
    },
    spawnPatientNow: spawnPatient,
    spawnPatientAt,
    toPharmacy,
    maxPatients,
    get openSeatCount() { return openSeats().length; },
    randomName: () => pick(FIRST) + ' ' + pick(LAST),
  };
  STATUS.resident = 'Serviste yatıyor';
  STATUS.er = 'Acil hasta';
  STATUS.refresh = 'Otomat / su sebiline gitti';
  STATUS.arriving = 'Otoparktan hastaneye yürüyor';
  STATUS.regWait = 'Kayıt için Başhekimi bekliyor';
})();
