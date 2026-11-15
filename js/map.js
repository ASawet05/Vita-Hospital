// Vita Hospital — 2.5D izometrik harita motoru, kamera ve başlangıç hastanesi
//
// Koordinatlar:
//  - Dünya (world): hücre birimi, (x, y). Hücre (x,y) [x,x+1) x [y,y+1) alanını kaplar.
//  - Döndürülmüş (rot): kamera yönüne göre 90°'lik adımlarla döndürülmüş dünya.
//  - İzo (iso): ekran pikseli (zoom'suz). iso = ((rx-ry)*32, (rx+ry)*16).
// Derinlik: Painter's algorithm — her çizilebilir nesnenin anahtarı, döndürülmüş
// koordinatta en öndeki noktasının rx+ry toplamıdır (Y-sorting).
(function () {
  const VH = (window.VH = window.VH || {});
  const A = (k) => VH.assets.get(k);

  const HW = 32, HH = 16;            // yarım karo genişliği / yüksekliği
  const W = 35, H = 26;              // harita boyutu (hücre)
  const WALL_FULL = 66, WALL_CUT = 14; // tam duvar / kesit (cutaway) duvar yüksekliği

  const ARCH = 'core/Architecture/hospital_architecture_';
  const FURN = 'core/Furniture/hospital_furniture_';
  const EQ = 'core/Equipment/hospital_equipment_';
  const SUP = 'core/Supplies/hospital_supplies_';
  const PROP = 'core/Props/hospital_props_';
  const DEC = 'core/Decor/hospital_decor_';

  // ---------------------------------------------------------------- Görsel tanımları
  const FLOORS = {
    white:    { tex: ARCH + 'floor_linoleum_white_01' },
    green:    { tex: ARCH + 'floor_linoleum_green_01' },
    corridor: { tex: ARCH + 'floor_corridor_antislip_01' },
    ramp:     { tex: ARCH + 'floor_ramp_entrance_01' },
    er:       { tex: ARCH + 'floor_linoleum_white_01', tint: 'rgba(90,150,230,0.13)' },
    vinyl:    { iso: 'ward/floor_ward_vinyl' },
    terrazzo: { iso: 'lab/floor_or_terrazzo' },
    pavement: { color: '#b3b9b4', speck: '#9ea59f' },
    asphalt:  { color: '#4d5860', speck: '#58646c' },
    grass:    { color: '#5f8f5a', speck: '#6f9f66' },
  };

  const WALL_STYLES = {
    ward:          { kind: 'ta', plainL: 'ward/wall_plain_left', plainR: 'ward/wall_plain_right', doorL: 'ward/wall_double_doors_left', doorR: 'ward/wall_double_doors_right' },
    lab:           { kind: 'ta', plainL: 'lab/wall_plain_left', plainR: 'lab/wall_plain_right', doorL: 'ward/wall_double_doors_left', doorR: 'ward/wall_double_doors_right' },
    core_straight: { kind: 'core', tex: ARCH + 'wall_ward_straight_01', door: ARCH + 'door_double_swing_01' },
    core_handrail: { kind: 'core', tex: ARCH + 'wall_corridor_handrail_01', door: ARCH + 'door_double_swing_01' },
    core_window:   { kind: 'core', tex: ARCH + 'wall_observation_window_01', door: ARCH + 'door_ward_single_01' },
  };

  // ---------------------------------------------------------------- Yerleşim planı
  // r: [x0, y0, x1, y1] (dahil)
  const ROOMS = {
    office:    { num: 7, name: 'Başhekim & Doktor Odası', r: [1, 1, 6, 8], floor: 'vinyl', wall: 'core_straight' },
    exam1:     { num: 3, name: 'Muayene Odası 1', r: [7, 1, 11, 8], floor: 'vinyl', wall: 'ward' },
    exam2:     { num: 3, name: 'Muayene Odası 2', r: [12, 1, 16, 8], floor: 'vinyl', wall: 'ward' },
    lab:       { num: 4, name: 'Kan Alma & Biyo-Laboratuvar', r: [17, 1, 24, 8], floor: 'green', wall: 'lab' },
    pharmacy:  { num: 6, name: 'Eczane', r: [25, 1, 30, 8], floor: 'white', wall: 'core_window' },
    corridor:  { num: 0, name: 'Koridor', r: [1, 9, 30, 10], floor: 'corridor', wall: 'core_handrail', noLabel: true },
    reception: { num: 1, name: 'Resepsiyon & Hasta Kayıt', r: [1, 11, 9, 22], floor: 'white', wall: 'core_straight' },
    waiting:   { num: 2, name: 'Hasta Bekleme Salonu', r: [10, 11, 19, 22], floor: 'white', wall: 'ward' },
    er:        { num: 5, name: 'Acil Servis', r: [20, 11, 30, 22], floor: 'er', wall: 'core_straight' },
  };

  // Kapılar: 2 hücre uzunluğunda. e:'N' → (x,y)-(x+1,y) kenarı x yönünde; e:'W' → y yönünde.
  const DOORS = [
    { e: 'N', x: 3, y: 9 },  { e: 'N', x: 8, y: 9 },  { e: 'N', x: 13, y: 9 },
    { e: 'N', x: 20, y: 9 }, { e: 'N', x: 27, y: 9 },
    { e: 'N', x: 4, y: 11 }, { e: 'N', x: 14, y: 11 }, { e: 'N', x: 24, y: 11 },
    { e: 'N', x: 4, y: 23, name: 'Ana Giriş' },
    { e: 'W', x: 31, y: 16, name: 'Ambulans Girişi' },
  ];
  // Duvarsız geçişler (resepsiyon ↔ bekleme salonu geniş kemer)
  const OPEN = [{ e: 'W', x: 10, y0: 12, y1: 21 }];

  // Nesneler: k=görsel anahtarı | proc=prosedürel; x,y,w,h=ayak izi; s=ölçek;
  // z=yerden yükseklik (masa üstü eşyalar); flat=zemine yatık; block=çarpışma.
  const O = (k, x, y, extra) => Object.assign({ k, x, y }, extra || {});
  const OBJECTS = [
    // 1 — Resepsiyon ve Hasta Kayıt
    O(FURN + 'desk_reception_01', 2, 14, { w: 2, s: 0.5, tag: 'reception_desk' }),
    O(DEC + 'queue_display_blank_01', 1, 12, { s: 0.42, tag: 'queue_display' }),
    O(DEC + 'sign_directory_stand_blank_01', 7, 20, { s: 0.42 }),
    O(DEC + 'barrier_posts_pair_01', 3, 17, { s: 0.36 }),
    O(ARCH + 'column_structural_01', 8, 15, { s: 0.42 }),
    O(FURN + 'chair_visitor_01', 1, 19, { s: 0.36 }),
    O(FURN + 'chair_visitor_01', 1, 20, { s: 0.36 }),

    // 2 — Hasta Bekleme Salonu
    O('ward/waiting_chairs', 11, 14), O('ward/waiting_chairs', 12, 14), O('ward/waiting_chairs', 13, 14),
    O('ward/waiting_chairs', 11, 17), O('ward/waiting_chairs', 12, 17), O('ward/waiting_chairs', 13, 17),
    O(FURN + 'chairs_waiting_row_01', 16, 14, { w: 2, s: 0.42 }),
    O(FURN + 'chairs_waiting_row_01', 16, 17, { w: 2, s: 0.42 }),
    O(DEC + 'vending_machine_blank_01', 18, 11, { s: 0.42 }),
    O(DEC + 'water_dispenser_column_01', 17, 11, { s: 0.42 }),
    O(DEC + 'play_mat_children_01', 11, 20, { w: 2, h: 2, s: 0.45, flat: true }),

    // 3 — Muayene Odası 1
    O(FURN + 'desk_doctor_01', 7, 2, { w: 2, s: 0.42, tag: 'exam_desk' }),
    O(FURN + 'stool_medical_round_01', 9, 3, { s: 0.34 }),
    O(FURN + 'bed_examination_01', 10, 5, { w: 2, s: 0.42, tag: 'exam_bed' }),
    O(FURN + 'curtain_privacy_screen_01', 11, 3, { s: 0.4 }),
    O(EQ + 'blood_pressure_stand_01', 7, 5, { s: 0.4 }),
    O(SUP + 'stethoscope_01', 7, 2, { s: 0.13, z: 26, ox: -6, block: false }),
    O(PROP + 'reflex_hammer_01', 8, 2, { s: 0.12, z: 26, block: false }),
    O(PROP + 'penlight_exam_01', 11, 5, { s: 0.12, z: 20, block: false }),
    // 3 — Muayene Odası 2
    O(FURN + 'desk_doctor_01', 12, 2, { w: 2, s: 0.42, tag: 'exam_desk' }),
    O(FURN + 'stool_medical_round_01', 14, 3, { s: 0.34 }),
    O(FURN + 'bed_examination_01', 15, 5, { w: 2, s: 0.42, tag: 'exam_bed' }),
    O(FURN + 'curtain_privacy_screen_01', 16, 3, { s: 0.4 }),
    O(EQ + 'blood_pressure_stand_01', 12, 5, { s: 0.4 }),
    O(SUP + 'stethoscope_01', 12, 2, { s: 0.13, z: 26, ox: -6, block: false }),
    O(PROP + 'reflex_hammer_01', 13, 2, { s: 0.12, z: 26, block: false }),
    O(PROP + 'penlight_exam_01', 16, 5, { s: 0.12, z: 20, block: false }),

    // 4 — Kan Alma ve Biyo-Laboratuvar
    O('lab/blood_draw_chair', 17, 3, { tag: 'blood_chair' }),
    O('lab/blood_draw_chair', 17, 5, { tag: 'blood_chair' }),
    O(FURN + 'cart_instrument_01', 18, 4, { s: 0.32 }),
    O(SUP + 'syringe_tray_01', 18, 4, { s: 0.12, z: 22, block: false }),
    O(EQ + 'autoclave_sterilizer_01', 19, 1, { s: 0.42 }),
    O('lab/hematology_analyzer', 21, 1, { tag: 'analyzer' }),
    O('lab/specimen_vial_rack', 22, 1),
    O(EQ + 'centrifuge_bench_01', 24, 3, { s: 0.42, tag: 'centrifuge' }),
    O(PROP + 'blood_tubes_rack_01', 24, 3, { s: 0.12, z: 28, ox: 10, block: false }),
    O(EQ + 'microscope_station_01', 24, 5, { s: 0.42, tag: 'microscope' }),
    O('lab/biohazard_waste_bin', 17, 7),

    // 5 — Acil Servis ve Ambulans Girişi
    O(FURN + 'gurney_stretcher_01', 21, 13, { w: 2, s: 0.42, tag: 'gurney' }),
    O(EQ + 'monitor_patient_01', 20, 12, { s: 0.4, tag: 'monitor' }),
    O(FURN + 'iv_stand_01', 23, 13, { s: 0.4 }),
    O(FURN + 'gurney_stretcher_01', 21, 16, { w: 2, s: 0.42, tag: 'gurney' }),
    O(EQ + 'monitor_patient_01', 20, 15, { s: 0.4, tag: 'monitor' }),
    O('ward/iv_drip_stand', 23, 16),
    O(FURN + 'gurney_stretcher_01', 21, 19, { w: 2, s: 0.42, tag: 'gurney' }),
    O(EQ + 'ventilator_01', 20, 18, { s: 0.4, tag: 'ventilator' }),
    O('ward/iv_drip_stand', 23, 19),
    O(EQ + 'defibrillator_01', 27, 12, { s: 0.4, tag: 'defibrillator' }),
    O(EQ + 'oxygen_tanks_pair_01', 28, 12, { s: 0.4, tag: 'oxygen' }),
    O(ARCH + 'wall_nurse_station_low_01', 26, 18, { w: 2, s: 0.42, tag: 'triage' }),
    O('ward/wheelchair', 29, 21), O('ward/wheelchair', 30, 21),
    O(DEC + 'floor_decal_warning_blank_01', 29, 16, { h: 2, s: 0.32, flat: true }),
    O(ARCH + 'curb_ambulance_bay_01', 32, 15, { w: 2, h: 4, s: 0.55, flat: true }),

    // 6 — Eczane ve İlaç Bölümü
    O(FURN + 'cabinet_medicine_01', 25, 1, { s: 0.42 }),
    O(FURN + 'cabinet_medicine_01', 26, 1, { s: 0.42 }),
    O(FURN + 'cabinet_medicine_01', 30, 2, { s: 0.42 }),
    O(ARCH + 'wall_nurse_station_low_01', 27, 5, { w: 2, s: 0.42, tag: 'pharmacy_counter' }),
    O(SUP + 'medicine_bottles_group_01', 27, 5, { s: 0.14, z: 18, block: false }),
    O(SUP + 'pill_blister_packs_01', 28, 5, { s: 0.18, z: 18, block: false }),
    O(FURN + 'cart_instrument_01', 30, 5, { s: 0.32 }),
    O(SUP + 'mask_box_01', 30, 5, { s: 0.11, z: 22, ox: -7, block: false }),
    O(SUP + 'glove_box_01', 30, 5, { s: 0.11, z: 22, ox: 7, block: false }),
    O(SUP + 'first_aid_kit_01', 28, 1, { s: 0.24 }),
    O(SUP + 'sanitizer_dispenser_stand_01', 25, 7, { s: 0.4 }),

    // 7 — Başhekim ve Doktor Odası
    O('proc:rug', 2, 2, { w: 4, h: 4, flat: true }),
    O(FURN + 'desk_doctor_01', 3, 2, { w: 2, s: 0.5, tag: 'chief_desk' }),
    O('proc:nameplate', 3, 2, { z: 28, ox: 8, block: false }),
    O(FURN + 'chair_visitor_01', 3, 4, { s: 0.36 }),
    O(FURN + 'chair_visitor_01', 4, 4, { s: 0.36 }),
    O(DEC + 'locker_staff_narrow_01', 6, 1, { s: 0.42 }),
    O(DEC + 'locker_staff_narrow_01', 6, 2, { s: 0.42 }),
    O(DEC + 'locker_staff_narrow_01', 6, 3, { s: 0.42 }),
    O('proc:terminal', 1, 5, { tag: 'archive_terminal' }),
    O('proc:archive', 1, 6), O('proc:archive', 1, 7),
  ];

  // ---------------------------------------------------------------- Izgara
  const grid = [];      // grid[y][x] = oda kimliği | null (dış alan)
  const floorType = []; // floorType[y][x]
  const blocked = [];   // blocked[y][x] = true → yürünemez (Aşama 3 çarpışma)
  const edgeMap = new Map();
  const walls = [];
  const ek = (e, x, y) => e + ':' + x + ':' + y;

  function outdoorFloor(x, y) {
    if (y === 23 && (x === 4 || x === 5)) return 'ramp';
    if (x >= 31) return 'asphalt';
    if (y >= 23) return 'pavement';
    return 'grass';
  }

  function buildGrid() {
    for (let y = 0; y < H; y++) {
      grid[y] = new Array(W).fill(null);
      blocked[y] = new Array(W).fill(false);
      floorType[y] = [];
    }
    for (const id in ROOMS) {
      const [x0, y0, x1, y1] = ROOMS[id].r;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = id;
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        floorType[y][x] = grid[y][x] ? ROOMS[grid[y][x]].floor : outdoorFloor(x, y);

    OBJECTS.forEach((o) => {
      o.w = o.w || 1; o.h = o.h || 1;
      const solid = o.block !== undefined ? o.block : !o.flat && !o.z;
      if (!solid) return;
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) blocked[y][x] = true;
    });
  }

  function buildWalls() {
    const special = new Map();
    DOORS.forEach((d, i) => {
      for (let p = 0; p < 2; p++) {
        const x = d.e === 'N' ? d.x + p : d.x;
        const y = d.e === 'N' ? d.y : d.y + p;
        special.set(ek(d.e, x, y), { type: 'door', door: i });
      }
    });
    OPEN.forEach((o) => { for (let y = o.y0; y <= o.y1; y++) special.set(ek(o.e, o.x, y), { type: 'open' }); });

    const consider = (e, x, y, a, b) => {
      if (a === b) return;
      const sp = special.get(ek(e, x, y));
      const w = { e, x, y, type: sp ? sp.type : 'wall', door: sp ? sp.door : -1, a, b };
      edgeMap.set(ek(e, x, y), w);
      if (w.type !== 'open') walls.push(w);
    };
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (y > 0) consider('N', x, y, grid[y - 1][x], grid[y][x]);
        if (x > 0) consider('W', x, y, grid[y][x - 1], grid[y][x]);
      }
  }

  // ---------------------------------------------------------------- Döndürme & izo
  let rot = 0;
  function rotPt(x, y, r = rot) {
    switch (r & 3) {
      case 0: return [x, y];
      case 1: return [H - y, x];
      case 2: return [W - x, H - y];
      default: return [y, W - x];
    }
  }
  function unrotPt(x, y, r = rot) {
    switch (r & 3) {
      case 0: return [x, y];
      case 1: return [y, H - x];
      case 2: return [W - x, H - y];
      default: return [W - y, x];
    }
  }
  /** Döndürülmüş uzaydaki bir yön vektörünü dünya uzayına çevirir. */
  function unrotVec(vx, vy, r = rot) {
    switch (r & 3) {
      case 0: return [vx, vy];
      case 1: return [vy, -vx];
      case 2: return [-vx, -vy];
      default: return [-vy, vx];
    }
  }
  const iso = (rx, ry) => [(rx - ry) * HW, (rx + ry) * HH];
  const worldToIso = (x, y) => { const [rx, ry] = rotPt(x, y); return iso(rx, ry); };
  function isoToWorld(ix, iy) {
    const rx = (ix / HW + iy / HH) / 2;
    const ry = (iy / HH - ix / HW) / 2;
    return unrotPt(rx, ry);
  }
  const depthAt = (x, y) => { const [rx, ry] = rotPt(x, y); return rx + ry; };
  const inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;

  // ---------------------------------------------------------------- Zemin karoları
  const floorTiles = {}; // tip -> [canvas varyantları] (2x çözünürlük, 128x64 elmas)
  function diamondPath(c, w, h) {
    c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w, h / 2); c.lineTo(w / 2, h); c.lineTo(0, h / 2); c.closePath();
  }
  function buildFloorTiles() {
    const crops = [[24, 24], [80, 44], [40, 92], [110, 70]];
    for (const t in FLOORS) {
      const f = FLOORS[t];
      if (f.iso) continue;
      floorTiles[t] = crops.map(([cx, cy], i) => {
        const cv = document.createElement('canvas');
        cv.width = 128; cv.height = 64;
        const c = cv.getContext('2d');
        diamondPath(c, 128, 64);
        c.save(); c.clip();
        if (f.tex) {
          c.drawImage(A(f.tex), cx, cy, 128, 64, 0, 0, 128, 64);
          if (f.tint) { c.fillStyle = f.tint; c.fillRect(0, 0, 128, 64); }
        } else {
          c.fillStyle = f.color; c.fillRect(0, 0, 128, 64);
          c.fillStyle = f.speck;
          let seed = 17 + i * 31;
          for (let n = 0; n < 60; n++) {
            seed = (seed * 9301 + 49297) % 233280;
            const px = (seed / 233280) * 128;
            seed = (seed * 9301 + 49297) % 233280;
            const py = (seed / 233280) * 64;
            c.fillRect(px, py, 2, 2);
          }
        }
        c.restore();
        diamondPath(c, 128, 64);
        c.strokeStyle = 'rgba(30,50,60,0.10)';
        c.lineWidth = 2;
        c.stroke();
        return cv;
      });
    }
  }

  // ---------------------------------------------------------------- Döndürmeye bağlı önbellek
  let cache = null;
  function buildCache() {
    const floors = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const [rx, ry] = rotPt(x + 0.5, y + 0.5);
        const cx = Math.floor(rx), cy = Math.floor(ry);
        const [sx, sy] = iso(cx, cy);
        floors.push({ sx, sy, t: floorType[y][x], v: (x * 7 + y * 13) & 3 });
      }

    const items = []; // derinlik sıralı nesne/duvar listesi
    const flats = [];

    const doorParts = {};
    walls.forEach((w) => {
      const p = rotPt(w.x, w.y);
      const q = w.e === 'N' ? rotPt(w.x + 1, w.y) : rotPt(w.x, w.y + 1);
      let run, k, s, front, back;
      if (p[1] === q[1]) { run = 'R'; k = p[1]; s = Math.min(p[0], q[0]); front = [s, k]; back = [s, k - 1]; }
      else { run = 'L'; k = p[0]; s = Math.min(p[1], q[1]); front = [k, s]; back = [k - 1, s]; }
      const fw = unrotPt(front[0] + 0.5, front[1] + 0.5).map(Math.floor);
      const bw = unrotPt(back[0] + 0.5, back[1] + 0.5).map(Math.floor);
      const frontRoom = inBounds(fw[0], fw[1]) ? grid[fw[1]][fw[0]] : null;
      const backRoom = inBounds(bw[0], bw[1]) ? grid[bw[1]][bw[0]] : null;
      const [sx, sy] = run === 'R' ? iso(s, k) : iso(k, s);
      const it = {
        kind: 'wall', w, run, s, sx, sy,
        full: !backRoom,
        style: ROOMS[frontRoom || backRoom].wall,
        key: s + k + 0.5,
      };
      if (w.type === 'door') (doorParts[w.door] = doorParts[w.door] || []).push(it);
      items.push(it);
    });
    Object.values(doorParts).forEach((parts) => {
      const min = Math.min(...parts.map((p) => p.s));
      parts.forEach((p) => { p.part = p.s === min ? 0 : 1; });
    });

    OBJECTS.forEach((o) => {
      const a = rotPt(o.x, o.y), b = rotPt(o.x + o.w, o.y + o.h);
      const rx0 = Math.min(a[0], b[0]), rx1 = Math.max(a[0], b[0]);
      const ry0 = Math.min(a[1], b[1]), ry1 = Math.max(a[1], b[1]);
      const [cx, cy] = iso((rx0 + rx1) / 2, (ry0 + ry1) / 2);
      const it = {
        kind: 'obj', o, cx, cy,
        corners: [iso(rx0, ry0), iso(rx1, ry0), iso(rx1, ry1), iso(rx0, ry1)],
        key: rx1 + ry1 - 1 + (o.z ? 0.05 : 0),
      };
      (o.flat ? flats : items).push(it);
    });

    items.sort((p, q) => p.key - q.key);

    // Harita sınırları (kamera kısıtlaması)
    const cs = [[0, 0], [W, 0], [W, H], [0, H]].map(([x, y]) => worldToIso(x, y));
    const bounds = {
      x0: Math.min(...cs.map((c) => c[0])), x1: Math.max(...cs.map((c) => c[0])),
      y0: Math.min(...cs.map((c) => c[1])) - WALL_FULL, y1: Math.max(...cs.map((c) => c[1])),
    };
    cache = { floors, items, flats, bounds };
  }

  // ---------------------------------------------------------------- Çizim yardımcıları
  const mirrored = () => (rot & 1) === 1;

  function drawFloor(ctx, f) {
    const def = FLOORS[f.t];
    if (def.iso) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(A(def.iso), f.sx - 32, f.sy - 32, 64, 64);
    } else {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(floorTiles[f.t][f.v], f.sx - 32.4, f.sy - 0.2, 64.8, 32.4);
    }
  }

  function faceClip(ctx, X, Y, sgn, h) {
    ctx.beginPath();
    ctx.moveTo(X, Y + 3);
    ctx.lineTo(X + sgn * 32, Y + 19);
    ctx.lineTo(X + sgn * 32, Y + 16 - h);
    ctx.lineTo(X, Y - h);
    ctx.closePath();
    ctx.clip();
  }

  function drawWall(ctx, it) {
    const w = it.w, st = WALL_STYLES[it.style];
    const X = it.sx, Y = it.sy, sgn = it.run === 'R' ? 1 : -1;
    const full = it.full, h = full ? WALL_FULL : WALL_CUT;

    if (w.type === 'door' && !full) {
      // Kesit görünümde kapı = eşik şeridi
      ctx.strokeStyle = 'rgba(46,196,182,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + sgn * 32, Y + 16); ctx.stroke();
      return;
    }

    ctx.save();
    if (!full) faceClip(ctx, X, Y, sgn, h);
    if (st.kind === 'ta') {
      const isDoor = w.type === 'door';
      const img = A(isDoor ? (sgn > 0 ? st.doorR : st.doorL) : (sgn > 0 ? st.plainR : st.plainL));
      const half = isDoor ? it.part : it.s & 1;
      ctx.imageSmoothingEnabled = false;
      if (sgn > 0) ctx.drawImage(img, half * 32, 0, 32, 128, X, Y - 82 - half * 16, 32, 128);
      else ctx.drawImage(img, half ? 0 : 32, 0, 32, 128, X - 31, Y - 82 - half * 16, 32, 128);
    } else {
      const isDoor = w.type === 'door';
      const img = A(isDoor ? st.door : st.tex);
      const cw = img.width - 32, ch = img.height - 32;
      const n = isDoor ? 2 : 3;
      const idx = isDoor ? it.part : it.s % 3;
      const uw = cw / n, u0 = 16 + idx * uw;
      const vh = ch * (h / WALL_FULL), v0 = 16 + ch - vh;
      ctx.imageSmoothingEnabled = true;
      ctx.transform(sgn * 32 / uw, 16 / uw, 0, h / vh, X, Y - h);
      ctx.drawImage(img, u0, v0, uw, vh, 0, 0, uw, vh);
      if (sgn < 0) { ctx.fillStyle = 'rgba(15,40,60,0.14)'; ctx.fillRect(0, 0, uw, vh); }
    }
    ctx.restore();

    if (!full || st.kind === 'core') {
      // Duvar üst kesiti (cutaway kapağı)
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#3d5664';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(X, Y - h); ctx.lineTo(X + sgn * 32, Y + 16 - h); ctx.stroke();
      ctx.strokeStyle = '#e8eef1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function shadow(ctx, cx, cy, size) {
    ctx.fillStyle = 'rgba(10,30,40,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 13 + 9 * (size - 1), (13 + 9 * (size - 1)) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function isoBox(ctx, cx, cy, hw, hh, ht, top, left, right) {
    ctx.fillStyle = left;
    ctx.beginPath(); ctx.moveTo(cx - hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - ht); ctx.lineTo(cx - hw, cy - ht); ctx.fill();
    ctx.fillStyle = right;
    ctx.beginPath(); ctx.moveTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx, cy + hh - ht); ctx.lineTo(cx + hw, cy - ht); ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.moveTo(cx, cy - hh - ht); ctx.lineTo(cx + hw, cy - ht); ctx.lineTo(cx, cy + hh - ht); ctx.lineTo(cx - hw, cy - ht); ctx.fill();
  }

  // Prosedürel çizimler (paketlerde karşılığı olmayan özel parçalar)
  const PROC = {
    rug(ctx, it) {
      const c = it.corners;
      ctx.fillStyle = '#7a2f3b';
      ctx.beginPath(); c.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d9b26a'; ctx.lineWidth = 2; ctx.stroke();
    },
    nameplate(ctx, it) {
      const x = it.cx + (it.o.ox || 0), y = it.cy - (it.o.z || 0);
      isoBox(ctx, x, y, 7, 3.5, 4, '#e6c66e', '#9c7f35', '#b8963f');
    },
    terminal(ctx, it) {
      const { cx, cy } = it;
      isoBox(ctx, cx, cy, 24, 12, 18, '#8a6a4c', '#5d4632', '#6f553d'); // masa
      isoBox(ctx, cx, cy - 18, 11, 5.5, 3, '#2a2f36', '#1b1f24', '#22272d');
      // ekran
      ctx.fillStyle = '#1b2329';
      ctx.fillRect(cx - 12, cy - 44, 24, 18);
      ctx.fillStyle = '#2ec4b6';
      ctx.fillRect(cx - 10, cy - 42, 20, 14);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (let i = 0; i < 4; i++) ctx.fillRect(cx - 8, cy - 40 + i * 3, 8 + ((i * 5) % 9), 1.5);
      ctx.fillStyle = '#1b2329';
      ctx.fillRect(cx - 2, cy - 26, 4, 5);
    },
    archive(ctx, it) {
      const { cx, cy } = it;
      isoBox(ctx, cx, cy, 22, 11, 46, '#c9d1d6', '#8e9aa2', '#a9b4bb');
      const cols = ['#d1495b', '#edae49', '#00798c', '#30638e', '#66a182'];
      for (let r = 0; r < 3; r++)
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = cols[(i + r) % 5];
          const x = cx + 3 + i * 3.6, y = cy + 1 + i * 1.8 - 12 - r * 13;
          ctx.fillRect(x, y, 2.6, 9);
        }
    },
  };

  function drawObject(ctx, it) {
    const o = it.o;
    if (o.k.startsWith('proc:')) { PROC[o.k.slice(5)](ctx, it); return; }
    const img = A(o.k);
    if (!img) return;
    const ta = !o.k.startsWith('core/');
    const s = o.s || (ta ? 1 : 0.4);
    const mir = mirrored();
    const x = it.cx + (o.ox || 0) * (mir ? -1 : 1);
    const y = it.cy - (o.z || 0);
    if (!o.flat && !o.z) shadow(ctx, it.cx, it.cy, Math.max(o.w, o.h));
    ctx.save();
    ctx.translate(x, y);
    if (ta && mir) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = !ta;
    if (ta) ctx.drawImage(img, -32 * s, -48 * s, 64 * s, 64 * s);
    else if (o.flat) ctx.drawImage(img, -img.width * s / 2, -img.height * s / 2, img.width * s, img.height * s);
    else {
      const ax = Math.floor(img.width / 2), ay = img.height - 16;
      ctx.drawImage(img, -ax * s, -ay * s + 6, img.width * s, img.height * s);
    }
    ctx.restore();
  }

  function drawCellOutline(ctx, x, y, color) {
    const pts = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]].map(([a, b]) => worldToIso(a, b));
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.18)');
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ---------------------------------------------------------------- Kamera
  const camera = {
    x: 0, y: 0, zoom: 1.4, minZoom: 0.45, maxZoom: 3.2,
    follow: true, target: null,
    toIso(px, py, vw, vh) { return [(px - vw / 2) / this.zoom + this.x, (py - vh / 2) / this.zoom + this.y]; },
    toScreen(ix, iy, vw, vh) { return [(ix - this.x) * this.zoom + vw / 2, (iy - this.y) * this.zoom + vh / 2]; },
    pan(dx, dy) { this.x -= dx / this.zoom; this.y -= dy / this.zoom; this.follow = false; this.clamp(); },
    zoomAt(f, px, py, vw, vh) {
      const [ix, iy] = this.toIso(px, py, vw, vh);
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * f));
      const [ix2, iy2] = this.toIso(px, py, vw, vh);
      if (!this.follow) { this.x += ix - ix2; this.y += iy - iy2; }
      this.clamp();
    },
    centerOnWorld(x, y) { [this.x, this.y] = worldToIso(x, y); this.clamp(); },
    clamp() {
      if (!cache) return;
      const b = cache.bounds;
      this.x = Math.max(b.x0, Math.min(b.x1, this.x));
      this.y = Math.max(b.y0, Math.min(b.y1, this.y));
    },
    update(dt) {
      if (!this.follow || !this.target) return;
      const [tx, ty] = worldToIso(this.target.x, this.target.y);
      const k = Math.min(1, dt * 6);
      this.x += (tx - this.x) * k;
      this.y += (ty - 20 - this.y) * k;
    },
  };

  /** Kamerayı 90° döndürür (dir: +1 saat yönü, -1 ters). Ekran merkezindeki nokta korunur. */
  function rotate(dir) {
    const center = isoToWorld(camera.x, camera.y);
    rot = (rot + (dir > 0 ? 1 : 3)) & 3;
    buildCache();
    camera.centerOnWorld(center[0], center[1]);
  }

  // ---------------------------------------------------------------- Ana çizim
  let labels = true;
  let hover = null;

  function draw(ctx, vw, vh, extras) {
    ctx.fillStyle = '#14313f';
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const [l, t] = camera.toIso(0, 0, vw, vh);
    const [r, b] = camera.toIso(vw, vh, vw, vh);
    const L = l - 160, R = r + 160, T = t - 40, B = b + 240;

    for (const f of cache.floors) if (f.sx > L && f.sx < R && f.sy > T && f.sy < B) drawFloor(ctx, f);
    for (const it of cache.flats) drawObject(ctx, it);
    if (hover && inBounds(hover.x, hover.y)) drawCellOutline(ctx, hover.x, hover.y, 'rgba(46,196,182,0.9)');

    const list = extras && extras.length ? cache.items.concat(extras).sort((p, q) => p.key - q.key) : cache.items;
    for (const it of list) {
      const x = it.sx !== undefined ? it.sx : it.cx;
      const y = it.sy !== undefined ? it.sy : it.cy;
      if (x !== undefined && (x < L || x > R || y < T || y > B)) continue;
      if (it.kind === 'wall') drawWall(ctx, it);
      else if (it.kind === 'obj') drawObject(ctx, it);
      else if (it.draw) it.draw(ctx);
    }
    ctx.restore();

    if (labels) drawLabels(ctx, vw, vh);
  }

  function drawLabels(ctx, vw, vh) {
    ctx.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const id in ROOMS) {
      const room = ROOMS[id];
      if (room.noLabel) continue;
      // Etiket odanın ekrana en yakın (ön) köşesine yakın durur; karakterleri kapatmaz.
      const [x0, y0, x1, y1] = room.r;
      const a = rotPt(x0, y0), b = rotPt(x1 + 1, y1 + 1);
      const inset = Math.min(1.1, (Math.abs(a[0] - b[0]) - 1) / 2, (Math.abs(a[1] - b[1]) - 1) / 2);
      const [ix, iy] = iso(Math.max(a[0], b[0]) - inset, Math.max(a[1], b[1]) - inset);
      const [sx, sy] = camera.toScreen(ix, iy, vw, vh);
      if (sx < -100 || sx > vw + 100 || sy < -20 || sy > vh + 20) continue;
      const text = room.num + ' · ' + room.name;
      const tw = ctx.measureText(text).width + 16;
      ctx.fillStyle = 'rgba(12,32,46,0.78)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx - tw / 2, sy - 11, tw, 22, 11); else ctx.rect(sx - tw / 2, sy - 11, tw, 22);
      ctx.fill();
      ctx.fillStyle = '#eaf4f8';
      ctx.fillText(text, sx, sy + 0.5);
    }
  }

  // ---------------------------------------------------------------- Çarpışma yardımcıları (Aşama 3)
  function edgeBetween(x, y, nx, ny) {
    if (ny === y - 1) return edgeMap.get(ek('N', x, y));
    if (ny === y + 1) return edgeMap.get(ek('N', x, ny));
    if (nx === x - 1) return edgeMap.get(ek('W', x, y));
    if (nx === x + 1) return edgeMap.get(ek('W', nx, y));
    return undefined;
  }
  function canStep(x, y, nx, ny) {
    if (!inBounds(nx, ny) || blocked[ny][nx]) return false;
    const w = edgeBetween(x, y, nx, ny);
    return !w || w.type !== 'wall';
  }

  // Tasarım belgesinde adı geçen ve haritada kullanılacak görseller.
  // main.js açılışta bunların gerçekten yüklendiğini doğrular.
  const REQUIRED = [
    ARCH + 'floor_linoleum_white_01', FURN + 'desk_reception_01', DEC + 'queue_display_blank_01', DEC + 'sign_directory_stand_blank_01',
    'ward/waiting_chairs', FURN + 'chairs_waiting_row_01', DEC + 'vending_machine_blank_01', DEC + 'water_dispenser_column_01', DEC + 'play_mat_children_01',
    FURN + 'desk_doctor_01', FURN + 'bed_examination_01', FURN + 'curtain_privacy_screen_01', FURN + 'stool_medical_round_01',
    EQ + 'blood_pressure_stand_01', SUP + 'stethoscope_01', PROP + 'reflex_hammer_01', PROP + 'penlight_exam_01',
    ARCH + 'floor_linoleum_green_01', 'lab/blood_draw_chair', 'lab/hematology_analyzer', 'lab/specimen_vial_rack', PROP + 'blood_tubes_rack_01',
    EQ + 'centrifuge_bench_01', EQ + 'microscope_station_01', EQ + 'autoclave_sterilizer_01', SUP + 'syringe_tray_01', 'lab/biohazard_waste_bin',
    ARCH + 'curb_ambulance_bay_01', FURN + 'gurney_stretcher_01', EQ + 'defibrillator_01', EQ + 'monitor_patient_01', EQ + 'ventilator_01',
    EQ + 'oxygen_tanks_pair_01', 'ward/iv_drip_stand', FURN + 'iv_stand_01', 'ward/wheelchair',
    FURN + 'cabinet_medicine_01', SUP + 'medicine_bottles_group_01', SUP + 'pill_blister_packs_01', SUP + 'first_aid_kit_01',
    SUP + 'mask_box_01', SUP + 'glove_box_01', SUP + 'sanitizer_dispenser_stand_01', DEC + 'locker_staff_narrow_01',
    'ward/wall_double_doors_left', 'ward/wall_double_doors_right', 'lab/wall_plain_left', 'lab/wall_plain_right',
    // İleri servisler (Aşama 5)
    'lab/operating_table', 'lab/anesthesia_machine', 'lab/scrub_trough_station', EQ + 'lamp_surgical_01', 'lab/floor_or_terrazzo',
    'ward/hospital_bed', 'ward/bedside_cabinet', 'ward/teddy_bear', 'ward/floor_ward_vinyl', FURN + 'incubator_infant_01',
    EQ + 'xray_machine_01', EQ + 'ultrasound_cart_01', EQ + 'ecg_machine_01', EQ + 'dialysis_machine_01',
  ];

  VH.map = {
    REQUIRED, W, H, ROOMS, OBJECTS, DOORS,
    TILE_W: 64, TILE_H: 32,
    camera,
    get rot() { return rot; },
    get labels() { return labels; },
    set labels(v) { labels = !!v; },
    set hover(c) { hover = c; },
    init() {
      buildGrid();
      buildWalls();
      buildFloorTiles();
      buildCache();
    },
    rotate,
    setRotation(r) { while (rot !== (r & 3)) rotate(1); },
    draw,
    worldToIso, isoToWorld, depthAt, rotPt, unrotVec,
    roomAt(x, y) { x = Math.floor(x); y = Math.floor(y); return inBounds(x, y) && grid[y][x] ? ROOMS[grid[y][x]] : null; },
    roomIdAt(x, y) { x = Math.floor(x); y = Math.floor(y); return inBounds(x, y) ? grid[y][x] : null; },
    isBlocked(x, y) { return !inBounds(x, y) || blocked[y][x]; },
    canStep, edgeBetween,
    stats() { return { walls: walls.length, objects: OBJECTS.length, cells: W * H }; },
  };
})();
