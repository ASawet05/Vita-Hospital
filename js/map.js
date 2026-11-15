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

  const HW = 32, HH = 16;            // yarım karo genişliği / yüksekliği
  let W = 35, H = 26;                // geçerli katın boyutu (hücre)
  const WALL_FULL = 66, WALL_CUT = 14; // tam duvar / kesit (cutaway) duvar yüksekliği

  // ---------------------------------------------------------------- Prosedürel görsel tanımları
  // Tüm zeminler kodla üretilen dokulardır (harici görsel yok).
  const FLOORS = {
    white:    { base: '#eef1ef', speck: '#d8dfdc', pattern: 'speck', indoor: true },
    green:    { base: '#c3dccd', speck: '#a7c8b4', pattern: 'speck', indoor: true },
    corridor: { base: '#e7dfd0', speck: '#cdbfa7', pattern: 'antislip', indoor: true },
    er:       { base: '#e3ebf6', speck: '#c8d6ea', pattern: 'speck', indoor: true },
    vinyl:    { base: '#d4ebe1', speck: '#b9dacb', pattern: 'plank', indoor: true },
    terrazzo: { base: '#dde1de', speck: '#c5cbc8', pattern: 'terrazzo', indoor: true },
    ramp:     { base: '#c7ccc6', speck: '#aeb4ad', pattern: 'brick' },
    pavement: { base: '#c9cbc3', speck: '#b2b5ac', pattern: 'brick' },
    path:     { base: '#ddd2bd', speck: '#c8baa0', pattern: 'brick' },
    asphalt:  { base: '#4b545c', speck: '#5d6870', pattern: 'asphalt', grid: false },
    parking:  { base: '#525c64', speck: '#636e76', pattern: 'asphalt', grid: false },
    road:     { base: '#42494f', speck: '#535c63', pattern: 'asphalt', grid: false },
    grass:    { base: '#6aa25f', speck: '#5b9352', pattern: 'grass', grid: false },
  };

  // Duvar stilleri: yüz rengi, süpürgelik, bant, tırabzan, pencere, kapı rengi
  const WALL_STYLES = {
    ward:          { base: '#e6eef0', trim: '#9fb4bf', accent: '#8fd3b8', door: '#d5e3e8' },
    lab:           { base: '#e7eef1', trim: '#8fa3ad', accent: '#a9cfe0', door: '#d9e4e8' },
    core_straight: { base: '#f0ebe3', trim: '#8d7f72', wainscot: '#e2d6c6', frame: '#bfe0d6', door: '#d8cbb8' },
    core_handrail: { base: '#eef1f2', trim: '#7e8d96', rail: '#9aa7b0', accent: '#2ec4b6', door: '#d5dde2' },
    core_window:   { base: '#eef1f2', trim: '#7e8d96', window: true, door: '#d5dde2' },
    or:            { base: '#dcefe9', trim: '#5e9c8e', accent: '#2f9e8f', door: '#bfe0d6' },
  };
  // ---------------------------------------------------------------- Yerleşim planı
  // r: [x0, y0, x1, y1] (dahil)
  const ROOMS0 = {
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
  const DOORS0 = [
    { e: 'N', x: 3, y: 9 },  { e: 'N', x: 8, y: 9 },  { e: 'N', x: 13, y: 9 },
    { e: 'N', x: 20, y: 9 }, { e: 'N', x: 27, y: 9 },
    { e: 'N', x: 4, y: 11 }, { e: 'N', x: 14, y: 11 }, { e: 'N', x: 24, y: 11 },
    { e: 'N', x: 4, y: 23, name: 'Ana Giriş' },
    { e: 'W', x: 31, y: 16, name: 'Ambulans Girişi' },
    { e: 'W', x: 31, y: 6, name: 'Lojistik Kapısı' },
  ];
  // Duvarsız geçişler (resepsiyon ↔ bekleme salonu geniş kemer)
  const OPEN0 = [{ e: 'W', x: 10, y0: 12, y1: 21 }];

  // Nesneler: k=görsel anahtarı | proc=prosedürel; x,y,w,h=ayak izi; s=ölçek;
  // z=yerden yükseklik (masa üstü eşyalar); flat=zemine yatık; block=çarpışma.
  const O = (k, x, y, extra) => Object.assign({ k, x, y }, extra || {});
  const OBJECTS0 = [
    // 1 — Resepsiyon ve Hasta Kayıt
    O('reception_desk', 2, 14, { w: 2, tag: 'reception_desk' }),
    O('queue_display', 1, 12, { tag: 'queue_display' }),
    O('directory_sign', 7, 20),
    O('barrier_posts', 3, 17),
    O('column', 8, 15),
    O('chair', 1, 19),
    O('chair', 1, 20),

    // 2 — Hasta Bekleme Salonu
    O('waiting_chair', 11, 14), O('waiting_chair', 12, 14), O('waiting_chair', 13, 14),
    O('waiting_chair', 11, 17), O('waiting_chair', 12, 17), O('waiting_chair', 13, 17),
    O('waiting_row', 16, 14, { w: 2 }),
    O('waiting_row', 16, 17, { w: 2 }),
    O('vending', 18, 11),
    O('water_cooler', 17, 11),
    O('play_mat', 11, 20, { w: 2, h: 2, flat: true }),
    // Kapasite geliştirmesiyle kullanıma açılan ek koltuklar
    O('waiting_chair', 14, 20), O('waiting_chair', 15, 20), O('waiting_chair', 16, 20), O('waiting_chair', 17, 20),

    // 3 — Muayene Odası 1
    O('desk', 7, 2, { w: 2, tag: 'exam_desk' }),
    O('stool', 9, 3),
    O('exam_table', 10, 5, { w: 2, tag: 'exam_bed' }),
    O('screen', 11, 3),
    O('bp_stand', 7, 5),
    O('prop_stethoscope', 7, 2, { z: 26, ox: -6, block: false }),
    O('prop_hammer', 8, 2, { z: 26, block: false }),
    O('prop_penlight', 11, 5, { z: 20, block: false }),
    // 3 — Muayene Odası 2
    O('desk', 12, 2, { w: 2, tag: 'exam_desk' }),
    O('stool', 14, 3),
    O('exam_table', 15, 5, { w: 2, tag: 'exam_bed' }),
    O('screen', 16, 3),
    O('bp_stand', 12, 5),
    O('prop_stethoscope', 12, 2, { z: 26, ox: -6, block: false }),
    O('prop_hammer', 13, 2, { z: 26, block: false }),
    O('prop_penlight', 16, 5, { z: 20, block: false }),

    // 4 — Kan Alma ve Biyo-Laboratuvar
    O('blood_chair', 17, 3, { tag: 'blood_chair' }),
    O('blood_chair', 17, 5, { tag: 'blood_chair' }),
    O('cart', 18, 4),
    O('prop_tray', 18, 4, { z: 22, block: false }),
    O('autoclave', 19, 1),
    O('analyzer', 21, 1, { tag: 'analyzer' }),
    O('vial_rack', 22, 1),
    O('centrifuge', 24, 3, { tag: 'centrifuge' }),
    O('prop_tubes', 24, 3, { z: 28, ox: 10, block: false }),
    O('microscope', 24, 5, { tag: 'microscope' }),
    O('biohazard_bin', 17, 7),

    // 5 — Acil Servis ve Ambulans Girişi
    O('gurney', 21, 13, { w: 2, tag: 'gurney' }),
    O('monitor', 20, 12, { tag: 'monitor' }),
    O('iv_stand', 23, 13, { tag: 'iv' }),
    O('gurney', 21, 16, { w: 2, tag: 'gurney' }),
    O('monitor', 20, 15, { tag: 'monitor' }),
    O('iv_stand', 23, 16, { tag: 'iv' }),
    O('gurney', 21, 19, { w: 2, tag: 'gurney' }),
    O('ventilator', 20, 18, { tag: 'ventilator' }),
    O('iv_stand', 23, 19, { tag: 'iv' }),
    O('defibrillator', 27, 12, { tag: 'defibrillator' }),
    O('oxygen', 28, 12, { tag: 'oxygen' }),
    O('counter', 26, 18, { w: 2, tag: 'triage' }),
    O('wheelchair', 29, 21), O('wheelchair', 30, 21),
    O('floor_decal', 29, 16, { h: 2, flat: true }),
    O('ambulance_bay', 32, 15, { w: 2, h: 4, flat: true }),

    // 6 — Eczane ve İlaç Bölümü
    O('med_cabinet', 25, 1),
    O('med_cabinet', 26, 1),
    O('med_cabinet', 30, 2),
    O('counter', 27, 5, { w: 2, tag: 'pharmacy_counter' }),
    O('prop_bottles', 27, 5, { z: 18, block: false }),
    O('prop_pills', 28, 5, { z: 18, block: false }),
    O('cart', 30, 5),
    O('prop_box_blue', 30, 5, { z: 22, ox: -7, block: false }),
    O('prop_box_purple', 30, 5, { z: 22, ox: 7, block: false }),
    O('first_aid', 28, 1),
    O('sanitizer', 25, 7),

    // 7 — Başhekim ve Doktor Odası
    O('rug', 2, 2, { w: 4, h: 4, flat: true }),
    O('desk', 3, 2, { w: 2, tag: 'chief_desk' }),
    O('nameplate', 3, 2, { z: 28, ox: 8, block: false }),
    O('chair', 3, 4),
    O('chair', 4, 4),
    O('locker', 6, 1),
    O('locker', 6, 2),
    O('locker', 6, 3),
    O('terminal', 1, 5, { tag: 'archive_terminal' }),
    O('archive', 1, 6), O('archive', 1, 7),

    // Asansör (koridorun doğu ucu)
    O('elevator', 30, 9, { tag: 'elevator' }),
  ];
  OBJECTS0.push(...campusObjects());

  /** Hastane kampüsü: giriş meydanı, tabela, banklar, lambalar, otopark, yollar ve park ağaçları. */
  function campusObjects() {
    const out = [];
    const jit = (x, y) => { let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) >>> 0; return (h % 1000) / 1000; };
    const add = (k, x, y, extra) => out.push(O(k, x, y, extra));
    // Yol işaretleri ve yaya geçidi (zemine yatık)
    add('road_mark', -8, 27, { w: 53, h: 3, block: false });
    add('road_mark', 31, -8, { w: 4, h: 35, block: false });
    add('crosswalk', 3, 27, { w: 4, h: 3, block: false });
    // Giriş meydanı (ızgara içinde: engelleyici)
    add('sign_hospital', 8, 24, { w: 2 });
    add('flower_bed', 13, 25, { w: 2 }); add('flower_bed', 21, 25, { w: 2 });
    add('bench', 11, 24, { face: 'S' }); add('bench', 16, 24, { face: 'S' }); add('bench', 25, 24, { face: 'S' });
    add('trash_bin', 10, 24); add('trash_bin', 24, 24);
    add('bush', 1, 25); add('bush', 2, 25); add('bush', 28, 25); add('bush', 18, 25);
    for (const x of [7, 19, 29]) add('lamp_post', x, 24);
    // Ambulans yolu ve otopark lambaları (dış alan)
    for (const y of [4, 10, 16, 22]) add('lamp_post', 35, y - 1.5, { block: false });
    // Otopark: çizgiler + araçlar
    [3, 7, 12, 16].forEach((y, row) => {
      add('parking_lines', 35, y, { w: 10, h: 2, face: 'E', block: false });
      for (let i = 0; i < 5; i++) if (jit(i + 3, row + 5) > 0.35) add('car', 35.5 + i * 2, y, { h: 2, face: row % 2 ? 'N' : 'S', block: false });
    });
    // Park ağaçları: kuzey ve batı bantları, cadde güneyi
    const tree = (x, y) => {
      if (x >= 4 && x <= 19 && y <= -2) return; // ek bina / şantiye alanı
      add(jit(x, y) > 0.82 ? 'bush' : 'tree', x + (jit(y, x) - 0.5) * 0.7, y + (jit(x + 1, y) - 0.5) * 0.7, { block: false });
    };
    // Yerleşke sınırı: taş kaideli ferforje korkuluk (ızgara kenarı boyunca), yaya ve araç kapıları
    for (let x = 0; x < 35; x++) {
      if (!(x >= 3 && x <= 6) && !(x >= 31 && x <= 34)) add('fence', x, 26, { face: 'S', block: false, post: x % 3 === 0 || x === 2 || x === 7 || x === 30 });
      if (!(x >= 31 && x <= 34)) add('fence', x, -1, { face: 'N', block: false, post: x % 3 === 0 || x === 30 });
    }
    for (let y = 0; y < 26; y++) {
      add('fence', -1, y, { face: 'W', block: false, post: y % 3 === 0 });
      add('fence', 35, y, { face: 'E', block: false, post: y % 3 === 0 });
    }
    add('gate_pillar', 2, 26, { block: false }); add('gate_pillar', 7, 26, { block: false });
    add('guard_booth', 8, 25);
    add('boom_barrier', 30, 25, { block: false });
    // Ek bina: açılan servis sayısıyla büyür (0 → şantiye ve vinç)
    add('annex_tower', 7, -8, { w: 9, h: 4, block: false });
    // Korkuluk dışındaki şehir: apartmanlar, çocuk parkı
    [[5, 36, 5, 3], [11, 36, 4, 3], [16, 36, 6, 3], [24, 36, 4, 3], [29, 36, 5, 3], [36, 36, 4, 3], [41, 36, 3, 3]].forEach(([x, y, w, h], i) => add('apartment', x, y, { w, h, block: false, floors: 2 + ((i * 7) % 3), tint: i }));
    add('playground', -6, 33, { w: 5, h: 4, block: false });
    for (const x of [0, 9, 15, 23, 28, 35, 40]) add('lamp_post', x, 33, { block: false });
    for (let x = -7; x <= 44; x += 3) { tree(x, -2); tree(x + 1, -6); tree(x, 32); }
    for (let y = 1; y <= 25; y += 3) { tree(-2, y); tree(-6, y + 1); }
    for (const [x, y] of [[-1, 4], [-1, 12], [-1, 20], [6, -1], [16, -1], [26, -1]]) add('lamp_post', x, y, { block: false });
    for (const x of [-5, 2, 12, 22, 33, 41]) add('bench', x, 31, { face: 'N', block: false });
    // Giriş meydanı canlandırma: saçak, süs havuzu, bayraklar, saksılar, bisiklet parkı, acil tabelası
    add('entrance_canopy', 3, 23, { w: 4, h: 2, block: false });
    add('fountain', 14, 23, { w: 2, h: 2 });
    for (const x of [10, 11, 12]) add('flag_pole', x, 23, { tint: x });
    for (const x of [17, 20, 23, 28]) add('planter', x, 23);
    add('bike_rack', 25, 23, { w: 2 });
    add('er_sign', 31, 13);
    add('bus_stop', 39, 25, { w: 3, block: false });
    add('picnic_table', -3, 11, { w: 2, block: false }); add('picnic_table', -3, 17, { w: 2, block: false });
    return out;
  }

  // ---------------------------------------------------------------- Üst katlar (Aşama 5)
  // Her kat ayrı bir harita: kendi odaları, kapıları ve nesneleri. Asansör (1,7) hücresinde.
  const UPPER_CORRIDOR = { num: 0, name: 'Koridor', r: [1, 7, 22, 8], floor: 'corridor', wall: 'core_handrail', noLabel: true };

  const FLOOR_SURGERY = {
    id: 'surgery', name: '1. Kat · Cerrahi & Ameliyathane', W: 24, H: 15, arrive: [2.5, 7.9],
    rooms: {
      or1:       { name: 'Ameliyathane', r: [1, 1, 9, 6], floor: 'terrazzo', wall: 'or' },
      scrub:     { name: 'Cerrahi Hazırlık (Scrub)', r: [10, 1, 14, 6], floor: 'terrazzo', wall: 'lab' },
      recovery:  { name: 'Uyandırma Odası', r: [15, 1, 22, 6], floor: 'vinyl', wall: 'ward' },
      corridor:  UPPER_CORRIDOR,
      surgclin:  { name: 'Cerrahi Poliklinik', r: [1, 9, 11, 13], floor: 'white', wall: 'core_straight' },
      sterile:   { name: 'Steril Malzeme Deposu', r: [12, 9, 22, 13], floor: 'green', wall: 'lab' },
    },
    doors: [{ e: 'N', x: 4, y: 7 }, { e: 'N', x: 11, y: 7 }, { e: 'N', x: 18, y: 7 }, { e: 'N', x: 5, y: 9 }, { e: 'N', x: 16, y: 9 }, { e: 'W', x: 10, y: 3 }],
    open: [],
    objects: [
      O('or_table', 5, 3, { tag: 'operating_table' }),
      O('surgical_lamp', 6, 2, { tag: 'surgical_lamp' }),
      O('anesthesia', 3, 2, { tag: 'anesthesia' }),
      O('monitor', 3, 4),
      O('cart', 7, 3),
      O('prop_tray', 7, 3, { z: 22, block: false }),
      O('gauze', 7, 5),
      O('biohazard_bin', 8, 1),
      O('scrub_sink', 11, 1, { tag: 'scrub' }),
      O('scrub_sink', 13, 1, { tag: 'scrub' }),
      O('sink', 14, 3),
      O('uv_cart', 12, 5),
      O('bed', 16, 2), O('bedside', 17, 2),
      O('bed', 19, 2), O('bedside', 20, 2),
      O('monitor', 21, 2),
      O('iv_stand', 18, 4),
      O('desk', 2, 10, { w: 2 }),
      O('chair', 2, 12), O('chair', 3, 12),
      O('exam_table', 8, 11, { w: 2 }),
      O('screen', 10, 10),
      O('autoclave', 13, 10),
      O('cart', 15, 12),
      O('uv_cart', 18, 11),
      O('linen', 20, 10),
      O('linen', 21, 10),
      O('elevator', 1, 7, { tag: 'elevator' }),
    ],
  };

  const FLOOR_WARD = {
    id: 'ward', name: '2. Kat · Yatan Hasta & Pediatri', W: 24, H: 15, arrive: [2.5, 7.9],
    rooms: {
      ward1:    { name: 'Yatan Hasta Servisi', r: [1, 1, 11, 6], floor: 'vinyl', wall: 'ward' },
      peds:     { name: 'Pediatri Servisi', r: [12, 1, 22, 6], floor: 'vinyl', wall: 'ward' },
      corridor: UPPER_CORRIDOR,
      nurse:    { name: 'Hemşire İstasyonu', r: [1, 9, 8, 13], floor: 'white', wall: 'core_straight' },
      ward2:    { name: 'Yatan Hasta Odaları', r: [9, 9, 22, 13], floor: 'vinyl', wall: 'ward' },
    },
    doors: [{ e: 'N', x: 4, y: 7 }, { e: 'N', x: 16, y: 7 }, { e: 'N', x: 4, y: 9 }, { e: 'N', x: 14, y: 9 }],
    open: [],
    objects: [
      O('bed', 2, 2, { tag: 'ward_bed' }), O('bedside', 3, 2),
      O('bed', 5, 2, { tag: 'ward_bed' }), O('bedside', 6, 2),
      O('bed', 8, 2, { tag: 'ward_bed' }), O('bedside', 9, 2),
      O('iv_stand', 4, 4), O('iv_stand', 10, 4),
      O('incubator', 13, 2, { tag: 'incubator' }),
      O('incubator', 15, 2, { tag: 'incubator' }),
      O('bed', 19, 2, { tag: 'ward_bed' }), O('bed', 21, 2, { tag: 'ward_bed' }),
      O('teddy', 14, 4), O('teddy', 18, 5),
      O('play_mat', 17, 4, { w: 2, h: 2, flat: true }),
      O('counter', 2, 11, { w: 2, tag: 'nurse_station' }),
      O('prop_bottles', 2, 11, { z: 18, block: false }),
      O('med_cabinet', 1, 9),
      O('sanitizer', 7, 10),
      O('bed', 10, 10, { tag: 'ward_bed' }), O('bedside', 11, 10),
      O('bed', 13, 10, { tag: 'ward_bed' }), O('bedside', 14, 10),
      O('bed', 16, 10, { tag: 'ward_bed' }), O('bedside', 17, 10),
      O('bed', 19, 10, { tag: 'ward_bed' }), O('bedside', 20, 10),
      O('overbed', 10, 12),
      O('elevator', 1, 7, { tag: 'elevator' }),
    ],
  };

  const FLOOR_RADIOLOGY = {
    id: 'radiology', name: '3. Kat · Radyoloji & İleri Tanı', W: 24, H: 15, arrive: [2.5, 7.9],
    rooms: {
      xray:     { name: 'Röntgen', r: [1, 1, 7, 6], floor: 'white', wall: 'core_window' },
      us:       { name: 'Ultrason', r: [8, 1, 13, 6], floor: 'vinyl', wall: 'ward' },
      ecg:      { name: 'EKG & Kardiyak Tanı', r: [14, 1, 22, 6], floor: 'white', wall: 'core_straight' },
      corridor: UPPER_CORRIDOR,
      dialysis: { name: 'Diyaliz Ünitesi', r: [1, 9, 14, 13], floor: 'green', wall: 'lab' },
      report:   { name: 'MR Ünitesi & Raporlama', r: [15, 9, 22, 13], floor: 'vinyl', wall: 'core_straight' },
    },
    doors: [{ e: 'N', x: 3, y: 7 }, { e: 'N', x: 10, y: 7 }, { e: 'N', x: 17, y: 7 }, { e: 'N', x: 6, y: 9 }, { e: 'N', x: 18, y: 9 }],
    open: [],
    objects: [
      O('xray', 3, 3, { w: 2, tag: 'xray' }),
      O('lightbox', 6, 1),
      O('prop_collar', 7, 4),
      O('ultrasound', 10, 2, { tag: 'ultrasound' }),
      O('exam_table', 11, 4, { w: 2 }),
      O('stool', 9, 4),
      O('ecg', 16, 2, { tag: 'ecg' }),
      O('exam_table', 18, 3, { w: 2 }),
      O('monitor', 21, 2),
      O('defibrillator', 21, 4),
      O('dialysis', 2, 10, { tag: 'dialysis' }), O('blood_chair', 3, 10),
      O('dialysis', 5, 10, { tag: 'dialysis' }), O('blood_chair', 6, 10),
      O('dialysis', 8, 10, { tag: 'dialysis' }), O('blood_chair', 9, 10),
      O('dialysis', 11, 10, { tag: 'dialysis' }), O('blood_chair', 12, 10),
      O('mri', 15, 11, { w: 3, h: 2, tag: 'mri' }),
      O('desk', 20, 10, { w: 2 }),
      O('terminal', 21, 12, { tag: 'pacs' }),
      O('elevator', 1, 7, { tag: 'elevator' }),
    ],
  };

  // Bodrum kat: yemekhane, servis tezgâhı ve kafeterya (her zaman açık)
  const FLOOR_CAFE = {
    id: 'cafe', name: 'B1 · Yemekhane & Kafeterya', W: 24, H: 15, arrive: [2.5, 7.9], alwaysOpen: true,
    rooms: {
      dining:   { name: 'Yemekhane', r: [1, 1, 14, 6], floor: 'terrazzo', wall: 'core_window' },
      kitchen:  { name: 'Yemek Servisi & Mutfak', r: [15, 1, 22, 6], floor: 'white', wall: 'lab' },
      corridor: UPPER_CORRIDOR,
      cafe:     { name: 'Kafeterya & Dinlenme', r: [1, 9, 12, 13], floor: 'vinyl', wall: 'core_straight' },
      dining2:  { name: 'Ek Yemek Salonu', r: [13, 9, 22, 13], floor: 'terrazzo', wall: 'ward' },
    },
    doors: [{ e: 'N', x: 5, y: 7 }, { e: 'N', x: 11, y: 7 }, { e: 'N', x: 18, y: 7 }, { e: 'N', x: 4, y: 9 }, { e: 'N', x: 16, y: 9 }, { e: 'W', x: 15, y: 3 }],
    open: [],
    objects: [
      O('stove', 16, 1, { w: 2 }), O('stove', 19, 1, { w: 2 }), O('med_cabinet', 22, 1),
      O('food_counter', 16, 4, { w: 4, tag: 'food_counter' }),
      O('cash_register', 20, 4, { tag: 'food_counter' }),
      O('menu_board', 21, 3),
      O('tray_stack', 15, 1),
      ...[2, 5, 8, 11].map((x) => O('cafe_table', x, 2)),
      ...[2, 8, 11].map((x) => O('cafe_table', x, 4)),
      O('potted_plant', 1, 1), O('palm_plant', 14, 1), O('water_cooler', 14, 5),
      O('coffee_machine', 1, 10, { tag: 'coffee_bar' }), O('vending', 11, 9),
      O('sofa', 2, 12, { w: 2, color: '#8e6c8a' }), O('sofa', 6, 12, { w: 2, color: '#3a8fb7' }),
      O('tv_stand', 9, 10), O('bookshelf', 11, 12), O('potted_plant', 1, 13),
      ...[14, 17, 20].map((x) => O('cafe_table', x, 11)),
      O('potted_plant', 22, 13), O('trash_bin', 13, 13),
      O('elevator', 1, 7, { tag: 'elevator' }),
    ],
  };

  const FLOOR_DEFS = [
    { id: 'ground', name: 'Zemin Kat', W: 35, H: 26, rooms: ROOMS0, doors: DOORS0, open: OPEN0, objects: OBJECTS0, arrive: [29.5, 10.4], outdoor: true, deco: { x0: -8, y0: -9, x1: 45, y1: 40 } },
    FLOOR_SURGERY, FLOOR_WARD, FLOOR_RADIOLOGY, FLOOR_CAFE,
  ];

  // ---------------------------------------------------------------- Izgara (kat başına)
  const ek = (e, x, y) => e + ':' + x + ':' + y;

  // Zemin kat dış dünyası: ızgara dışındaki (negatif/taşan) hücreler yalnızca görsel "kampüs"tür.
  //  - x 31..34: ambulans yolu, x 35..44: otopark, y 23..26: giriş meydanı, y 27..29: ana cadde,
  //  - y 30: kaldırım, kuzey/batı: park alanı ve yürüyüş yolu.
  function outdoorFloor(def, x, y) {
    if (!def.outdoor) return null;
    if (y >= 27 && y <= 29) return 'road';
    if (y === 26 || y === 30) return 'pavement';
    if (y >= 31) return y <= 32 ? 'grass' : (x <= 3 ? 'grass' : (y === 33 ? 'path' : 'pavement'));
    if (x >= 31 && x <= 34) return 'asphalt';
    if (x >= 35 && x <= 44 && y >= 2 && y <= 21) return 'parking';
    if (x >= 35 && y >= 22 && y <= 25) return 'pavement';
    if (y === 23 && (x === 4 || x === 5)) return 'ramp';
    if (y >= 23 && y <= 25) {
      if (x >= 3 && x <= 6) return 'pavement';
      if (y === 23) return 'pavement';
      return x < 0 ? 'grass' : (x % 9 === 0 ? 'path' : 'grass');
    }
    if (x === 0 || y === 0) return 'path';
    if (x === -4 || y === -4) return 'path';
    return 'grass';
  }

  function buildFloor(def) {
    const { W, H, rooms } = def;
    const grid = [], floorType = [], blocked = [];
    for (let y = 0; y < H; y++) {
      grid[y] = new Array(W).fill(null);
      blocked[y] = new Array(W).fill(false);
      floorType[y] = [];
    }
    for (const id in rooms) {
      const [x0, y0, x1, y1] = rooms[id].r;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid[y][x] = id;
    }
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        floorType[y][x] = grid[y][x] ? rooms[grid[y][x]].floor : outdoorFloor(def, x, y);
    // Dış alanı olmayan katlarda boş hücreler yürünemez
    if (!def.outdoor) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!grid[y][x]) blocked[y][x] = true;

    def.objects.forEach((o) => {
      o.w = o.w || 1; o.h = o.h || 1;
      const solid = o.block !== undefined ? o.block : !o.flat && !o.z;
      if (!solid) return;
      for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) if (blocked[y] && x >= 0 && x < W) blocked[y][x] = true;
    });

    const special = new Map();
    def.doors.forEach((d, i) => {
      for (let p = 0; p < 2; p++) {
        const x = d.e === 'N' ? d.x + p : d.x;
        const y = d.e === 'N' ? d.y : d.y + p;
        special.set(ek(d.e, x, y), { type: 'door', door: i });
      }
    });
    def.open.forEach((o) => { for (let y = o.y0; y <= o.y1; y++) special.set(ek(o.e, o.x, y), { type: 'open' }); });

    const edgeMap = new Map(), walls = [];
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
    return { def, W, H, grid, floorType, blocked, edgeMap, walls };
  }

  const floors = [];
  let fi = 0;        // geçerli kat
  let ROOMS = ROOMS0, OBJECTS = OBJECTS0;
  let grid = null, floorType = null, blocked = null, edgeMap = null, walls = null;
  function useFloor(i) {
    fi = i;
    const F = floors[i];
    W = F.W; H = F.H; ROOMS = F.def.rooms; OBJECTS = F.def.objects;
    grid = F.grid; floorType = F.floorType; blocked = F.blocked; edgeMap = F.edgeMap; walls = F.walls;
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

  // ---------------------------------------------------------------- Prosedürel zemin karoları
  const floorTiles = {}; // tip -> [canvas varyantları] (2x çözünürlük, 128x64 elmas)
  function diamondPath(c, w, h) {
    c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w, h / 2); c.lineTo(w / 2, h); c.lineTo(0, h / 2); c.closePath();
  }
  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function paintPattern(c, f, R) {
    c.fillStyle = f.base; c.fillRect(0, 0, 128, 64);
    // hafif ton dalgalanması
    const g = c.createLinearGradient(0, 0, 128, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.04)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 64);
    const dots = (n, col, size) => { c.fillStyle = col; for (let i = 0; i < n; i++) c.fillRect(R() * 128, R() * 64, size, size); };
    const isoLines = (step, col, w) => {
      c.strokeStyle = col; c.lineWidth = w;
      for (let k = -128; k < 256; k += step) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 128, 64); c.stroke(); }
    };
    const isoLines2 = (step, col, w) => {
      c.strokeStyle = col; c.lineWidth = w;
      for (let k = -128; k < 256; k += step) { c.beginPath(); c.moveTo(k, 64); c.lineTo(k + 128, 0); c.stroke(); }
    };
    switch (f.pattern) {
      case 'speck': dots(70, f.speck, 2); break;
      case 'terrazzo': ['#9aa3a0', '#c96f4a', '#6f8f9f', '#f4f6f5', '#b5a58a'].forEach((col) => dots(26, col, 2.5)); break;
      case 'plank': isoLines(32, 'rgba(60,110,90,0.18)', 1.5); dots(30, f.speck, 2); break;
      case 'antislip': for (let y = 4; y < 64; y += 8) for (let x = (y % 16) ? 4 : 8; x < 128; x += 8) { c.fillStyle = f.speck; c.fillRect(x, y, 2, 2); } break;
      case 'brick': isoLines(16, 'rgba(70,60,50,0.18)', 1.2); isoLines2(32, 'rgba(70,60,50,0.12)', 1); dots(30, f.speck, 2); break;
      case 'grass':
        dots(40, f.speck, 2);
        for (let i = 0; i < 90; i++) {
          const x = R() * 128, y = R() * 64, h = 2 + R() * 4;
          c.strokeStyle = R() > 0.5 ? 'rgba(130,190,100,0.7)' : 'rgba(50,110,50,0.6)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 2, y - h); c.stroke();
        }
        break;
      case 'asphalt': dots(120, f.speck, 1.5); dots(40, 'rgba(255,255,255,0.05)', 2); break;
      default: break;
    }
  }

  function buildFloorTiles() {
    for (const t in FLOORS) {
      const f = FLOORS[t];
      floorTiles[t] = [0, 1, 2, 3].map((i) => {
        const cv = document.createElement('canvas');
        cv.width = 128; cv.height = 64;
        const c = cv.getContext('2d');
        diamondPath(c, 128, 64);
        c.save(); c.clip();
        paintPattern(c, f, rng(t.length * 97 + i * 131 + 7));
        c.restore();
        if (f.grid !== false) {
          diamondPath(c, 128, 64);
          c.strokeStyle = f.indoor ? 'rgba(30,50,60,0.13)' : 'rgba(0,0,0,0.05)';
          c.lineWidth = 2;
          c.stroke();
        }
        return cv;
      });
    }
  }

  // ---------------------------------------------------------------- Döndürmeye bağlı önbellek
  let cache = null;
  function buildCache() {
    const def = floors[fi].def;
    const ext = def.deco || { x0: 0, y0: 0, x1: W, y1: H };
    const floorsList = [];
    for (let y = ext.y0; y < ext.y1; y++)
      for (let x = ext.x0; x < ext.x1; x++) {
        const inside = inBounds(x, y);
        const t = inside ? floorType[y][x] : outdoorFloor(def, x, y);
        if (!t) continue;
        const [rx, ry] = rotPt(x + 0.5, y + 0.5);
        const cx = Math.floor(rx), cy = Math.floor(ry);
        const [sx, sy] = iso(cx, cy);
        floorsList.push({ sx, sy, t, v: ((x * 7 + y * 13) & 3 + 4) & 3 });
      }

    const items = []; // derinlik sıralı nesne/duvar listesi
    const flats = [];
    const lamps = [];

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
        ext: !frontRoom || !backRoom,
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
      const it = { kind: 'obj', o, cx, cy, key: rx1 + ry1 - 1 + (o.z ? 0.05 : 0) };
      (o.flat || VH.art.isFlat(o.k) ? flats : items).push(it);
      if (o.k === 'lamp_post') { const [lx, ly] = worldToIso(o.x + 0.5, o.y + 0.5); lamps.push([lx, ly]); }
    });
    flats.sort((p, q) => p.key - q.key);
    items.sort((p, q) => p.key - q.key);

    // Harita sınırları (kamera kısıtlaması) — dış dünya dahil
    const cs = [[ext.x0, ext.y0], [ext.x1, ext.y0], [ext.x1, ext.y1], [ext.x0, ext.y1]].map(([x, y]) => worldToIso(x, y));
    const pad = def.deco ? 120 : 0;
    const bounds = {
      x0: Math.min(...cs.map((c) => c[0])) + pad, x1: Math.max(...cs.map((c) => c[0])) - pad,
      y0: Math.min(...cs.map((c) => c[1])) - WALL_FULL + pad / 2, y1: Math.max(...cs.map((c) => c[1])) - pad / 2,
    };
    cache = { floors: floorsList, items, flats, bounds, lamps };
  }

  // ---------------------------------------------------------------- Çizim yardımcıları
  function drawFloor(ctx, f) {
    ctx.drawImage(floorTiles[f.t][f.v], f.sx - 32.4, f.sy - 0.2, 64.8, 32.4);
  }

  const shade = (c, k) => VH.art.shade(c, k);

  /**
   * Prosedürel izometrik duvar: yüz, süpürgelik, bant/tırabzan, pencere, kapı ve
   * arkaya doğru kalınlığı olan üst başlık (derinlik hissi). Kesit duvarlar alçak çizilir.
   */
  function drawWall(ctx, it) {
    const w = it.w, st = WALL_STYLES[it.style];
    const X = it.sx, Y = it.sy, sgn = it.run === 'R' ? 1 : -1;
    const full = it.full, h = full ? WALL_FULL : WALL_CUT;
    const pt = (u, z) => [X + sgn * 32 * u, Y + 16 * u - z];
    const quad = (u0, u1, z0, z1, col) => {
      const a = pt(u0, z0), b = pt(u1, z0), c = pt(u1, z1), d = pt(u0, z1);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    };
    const dk = sgn < 0 ? -0.12 : 0; // sol yüzler biraz daha gölgeli
    const S = (c) => shade(c, dk);

    if (w.type === 'door' && !full) {
      // Kesit görünümde kapı = metal eşik + turkuaz yön şeridi
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(160,175,185,0.9)'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + sgn * 32, Y + 16); ctx.stroke();
      ctx.strokeStyle = 'rgba(46,196,182,0.75)'; ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    if (w.type === 'door') {
      quad(0, 1, 0, h, S(st.base));
      const p = it.part || 0;
      // çift kanatlı kapı: bu hücre kanadın yarısı
      quad(p ? 0 : 0.1, p ? 0.9 : 1, 0, 52, S(st.door || '#cfd8dc'));
      quad(p ? 0.25 : 0.35, p ? 0.65 : 0.75, 30, 46, S('#9ccbe0'));
      quad(p ? 0 : 0.1, p ? 0.9 : 1, 0, 6, S('#8fa3ad'));
      quad(p ? 0 : 0.1, p ? 0.9 : 1, 52, 55, S(st.trim));
      if (p === 0) quad(0.96, 1, 6, 52, S('#7e8d96'));
    } else {
      quad(0, 1, 0, h, S(st.base));
      if (full && st.wainscot) quad(0, 1, 5, 26, S(st.wainscot));
      quad(0, 1, 0, Math.min(5, h), S(st.trim));
      if (full) {
        if (st.accent) quad(0, 1, 30, 34, S(st.accent));
        if (st.rail) { quad(0, 1, 22, 26, S(st.rail)); quad(0, 1, 21, 22, S(shade(st.rail, -0.3))); }
        if (st.window && (it.s & 1) === 0) {
          quad(0.12, 0.88, 28, 56, S('#6f8f9f'));
          quad(0.16, 0.84, 30, 54, S('#a8d4e6'));
          quad(0.16, 0.84, 41, 42.5, S('#6f8f9f'));
          quad(0.48, 0.52, 30, 54, S('#6f8f9f'));
        }
        if (!st.window && st.frame && (it.s % 4) === 1) {
          // çerçeveli tablo / pano
          quad(0.25, 0.75, 34, 52, S('#8d7f72'));
          quad(0.28, 0.72, 36, 50, S(st.frame));
        }
      }
      // Dış cephe evrimi: servis katları açıldıkça cam giydirme, LED bant ve kornişe dönüşür
      if (fi === 0 && it.ext && facadeTier > 0) {
        if (full) {
          quad(0.06, 0.94, 12, 58, S('#5f8fa8'));
          quad(0.09, 0.91, 14, 56, S(facadeTier >= 2 ? '#9fd4ea' : '#b8dbe8'));
          quad(0.48, 0.52, 14, 56, S('#5f8fa8')); quad(0.09, 0.91, 34, 35.5, S('#5f8fa8'));
          if (facadeTier >= 2) quad(0, 1, 60, 63, S('#2ec4b6'));
          if (facadeTier >= 3) quad(0, 1, 63, h, S('#e6c66e'));
        } else {
          quad(0, 1, h - 3, h, S(facadeTier >= 3 ? '#e6c66e' : '#2ec4b6'));
        }
      }
      // panel derzi
      if ((it.s & 1) === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1; const a = pt(0, 0), d = pt(0, h); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
    }

    // Üst başlık: duvarın arka tarafına doğru kalınlık
    const t = 0.16;
    const off = sgn > 0 ? [32 * t, -16 * t] : [-32 * t, -16 * t];
    const a = pt(0, h), b = pt(1, h);
    ctx.fillStyle = full ? '#f1f4f5' : '#e9eef1';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(b[0] + off[0], b[1] + off[1]); ctx.lineTo(a[0] + off[0], a[1] + off[1]); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#3d5664'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
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
  let facadeTier = 0;
  const camera = {
    x: 0, y: 0, zoom: 1.2, minZoom: 0.45, maxZoom: 3.2, base: 1.2, want: null,
    follow: true, target: null,
    toIso(px, py, vw, vh) { return [(px - vw / 2) / this.zoom + this.x, (py - vh / 2) / this.zoom + this.y]; },
    toScreen(ix, iy, vw, vh) { return [(ix - this.x) * this.zoom + vw / 2, (iy - this.y) * this.zoom + vh / 2]; },
    pan(dx, dy) { this.x -= dx / this.zoom; this.y -= dy / this.zoom; this.follow = false; this.clamp(); },
    zoomAt(f, px, py, vw, vh) {
      const [ix, iy] = this.toIso(px, py, vw, vh);
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * f));
      this.base = this.zoom / (this.focusF || 1); this.want = null; this.manual = true;
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
    /** Yumuşak yakınlaştırma geçişi (oda odağı, kat değişimi). */
    glide(z) { this.want = Math.max(this.minZoom, Math.min(this.maxZoom, z)); },
    update(dt) {
      if (this.want !== null) {
        const d = this.want - this.zoom;
        if (Math.abs(d) < 0.004) { this.zoom = this.want; this.want = null; } else this.zoom += d * Math.min(1, dt * 3.2);
      }
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

  /**
   * Ana çizim. extras: derinlik sırasına katılacak dinamik çizilebilirler (karakterler, ambulans).
   * fx.ground(ctx): zemin üstü efektler (yön çizgisi, hedef halkası) — nesnelerden önce çizilir.
   * fx.night: 0..1 gece karartması (vardiya döngüsü).
   */
  function draw(ctx, vw, vh, extras, fx) {
    fx = fx || {};
    ctx.fillStyle = fi === 0 ? '#2f5b3a' : '#14313f';
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const [l, t] = camera.toIso(0, 0, vw, vh);
    const [r, b] = camera.toIso(vw, vh, vw, vh);
    const L = l - 160, R = r + 160, T = t - 40, B = b + 240;

    for (const f of cache.floors) if (f.sx > L - 40 && f.sx < R + 40 && f.sy > T - 40 && f.sy < B) drawFloor(ctx, f);
    for (const it of cache.flats) if (it.cx > L - 200 && it.cx < R + 200 && it.cy > T - 120 && it.cy < B + 120) VH.art.draw(ctx, it);
    if (hover && inBounds(hover.x, hover.y)) drawCellOutline(ctx, hover.x, hover.y, 'rgba(46,196,182,0.9)');
    if (fx.ground) fx.ground(ctx);

    const list = extras && extras.length ? cache.items.concat(extras).sort((p, q) => p.key - q.key) : cache.items;
    for (const it of list) {
      const x = it.sx !== undefined ? it.sx : it.cx;
      const y = it.sy !== undefined ? it.sy : it.cy;
      if (x !== undefined && (x < L || x > R || y < T || y > B)) continue;
      if (it.kind === 'wall') drawWall(ctx, it);
      else if (it.kind === 'obj') VH.art.draw(ctx, it);
      else if (it.draw) it.draw(ctx);
    }

    // Gece nöbeti: karartma + sokak lambası ışıkları
    if (fx.night > 0) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(8,18,48,${0.38 * fx.night})`;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      for (const lp of cache.lamps) {
        const [sx, sy] = lp;
        if (sx < L || sx > R || sy < T || sy > B) continue;
        const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 90);
        g.addColorStop(0, `rgba(255,214,140,${0.32 * fx.night})`);
        g.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(sx, sy, 90, 45, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (fx.lights) fx.lights(ctx, fx.night, [L, T, R, B]);
      ctx.globalCompositeOperation = 'source-over';
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
      const text = room.num ? room.num + ' · ' + room.name : room.name;
      const tw = ctx.measureText(text).width + 16;
      ctx.fillStyle = 'rgba(12,32,46,0.78)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx - tw / 2, sy - 11, tw, 22, 11); else ctx.rect(sx - tw / 2, sy - 11, tw, 22);
      ctx.fill();
      ctx.fillStyle = '#eaf4f8';
      ctx.fillText(text, sx, sy + 0.5);
    }
  }


  // ---------------------------------------------------------------- Çarpışma yardımcıları (kat parametreli)
  const FL = (f) => (f === undefined || f === fi ? floors[fi] : floors[f]);
  function edgeBetween(x, y, nx, ny, f) {
    const E = FL(f).edgeMap;
    if (ny === y - 1) return E.get(ek('N', x, y));
    if (ny === y + 1) return E.get(ek('N', x, ny));
    if (nx === x - 1) return E.get(ek('W', x, y));
    if (nx === x + 1) return E.get(ek('W', nx, y));
    return undefined;
  }
  function canStep(x, y, nx, ny, f) {
    const F = FL(f);
    if (nx < 0 || ny < 0 || nx >= F.W || ny >= F.H || F.blocked[ny][nx]) return false;
    const w = edgeBetween(x, y, nx, ny, f);
    return !w || w.type !== 'wall';
  }
  function isBlockedF(x, y, f) {
    const F = FL(f);
    return x < 0 || y < 0 || x >= F.W || y >= F.H || F.blocked[y][x];
  }

  /** Kat değiştir (rotasyon korunur). */
  function setFloor(i) {
    if (i === fi && cache) return;
    useFloor(i);
    buildCache();
  }

  /** Dünya yön vektörünü döndürülmüş uzaya çevirir (unrotVec'in tersi). */
  function rotVec(vx, vy, r = rot) {
    switch (r & 3) {
      case 0: return [vx, vy];
      case 1: return [-vy, vx];
      case 2: return [-vx, -vy];
      default: return [vy, -vx];
    }
  }


  VH.map = {
    get W() { return W; },
    get H() { return H; },
    get ROOMS() { return ROOMS; },
    get OBJECTS() { return OBJECTS; },
    get floor() { return fi; },
    FLOOR_DEFS,
    floorName(f) { return FLOOR_DEFS[f === undefined ? fi : f].name; },
    floorArrive(f) { return FLOOR_DEFS[f].arrive; },
    floorObjects(f) { return FLOOR_DEFS[f].objects; },
    allObjects() { return FLOOR_DEFS.reduce((a, d) => a.concat(d.objects), []); },
    dims(f) { const F = FL(f); return [F.W, F.H]; },
    TILE_W: 64, TILE_H: 32,
    camera,
    get rot() { return rot; },
    get labels() { return labels; },
    set labels(v) { labels = !!v; },
    set hover(c) { hover = c; },
    get facadeTier() { return facadeTier; },
    set facadeTier(v) { if (v !== facadeTier) { facadeTier = v; } },
    init() {
      FLOOR_DEFS.forEach((d, i) => { floors[i] = buildFloor(d); });
      useFloor(0);
      buildFloorTiles();
      buildCache();
    },
    setFloor,
    rotate,
    /** Kat düzeni değişti (eşya taşındı/eklendi): ızgara, çarpışma ve çizim önbelleği yenilenir. */
    rebuild(f, gridOnly) {
      if (f === undefined) f = fi;
      floors[f] = buildFloor(FLOOR_DEFS[f]);
      if (f === fi) { useFloor(fi); if (!gridOnly) buildCache(); }
    },
    /** Izgara içindeki yürünebilir hücreler (düzenleme modu bağlantı denetimi). */
    blockedGrid(f) { return FL(f).blocked; },
    get viewBounds() { return cache ? cache.bounds : null; },
    setRotation(r) { while (rot !== (r & 3)) rotate(1); },
    draw,
    worldToIso, isoToWorld, depthAt, rotPt, unrotVec, rotVec,
    roomAt(x, y, f) {
      const F = FL(f); x = Math.floor(x); y = Math.floor(y);
      return x >= 0 && y >= 0 && x < F.W && y < F.H && F.grid[y][x] ? F.def.rooms[F.grid[y][x]] : null;
    },
    roomIdAt(x, y, f) {
      const F = FL(f); x = Math.floor(x); y = Math.floor(y);
      return x >= 0 && y >= 0 && x < F.W && y < F.H ? F.grid[y][x] : null;
    },
    isBlocked: isBlockedF,
    canStep, edgeBetween,
    /** Prosedürel çizicisi olmayan nesne türleri (öz-test). */
    missingKinds() { return [...new Set(FLOOR_DEFS.reduce((a, d) => a.concat(d.objects), []).map((o) => o.k).filter((k) => !VH.art.has(k)))]; },
    stats() { return { walls: floors.reduce((s, F) => s + F.walls.length, 0), objects: FLOOR_DEFS.reduce((s, d) => s + d.objects.length, 0), floors: floors.length }; },
  };
})();
