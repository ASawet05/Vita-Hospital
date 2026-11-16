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
    carpet:   { base: '#5b6b8c', speck: '#4f5e7d', pattern: 'carpet', indoor: true },
    sterile:  { base: '#cfe8ea', speck: '#a9d3d8', pattern: 'tile', indoor: true },
    wood:     { base: '#c9a27a', speck: '#b08a62', pattern: 'wood', indoor: true },
    ceramic:  { base: '#e9e5dd', speck: '#d3cdc1', pattern: 'ceramic', indoor: true },
  };

  // Duvar stilleri: yüz rengi, süpürgelik, bant, tırabzan, pencere, kapı rengi
  const WALL_STYLES = {
    ward:          { base: '#e6eef0', trim: '#9fb4bf', accent: '#8fd3b8', door: '#d5e3e8' },
    lab:           { base: '#e7eef1', trim: '#8fa3ad', accent: '#a9cfe0', door: '#d9e4e8' },
    core_straight: { base: '#f0ebe3', trim: '#8d7f72', wainscot: '#e2d6c6', frame: '#bfe0d6', door: '#d8cbb8' },
    core_handrail: { base: '#eef1f2', trim: '#7e8d96', rail: '#9aa7b0', accent: '#2ec4b6', door: '#d5dde2' },
    core_window:   { base: '#eef1f2', trim: '#7e8d96', window: true, door: '#d5dde2' },
    or:            { base: '#dcefe9', trim: '#5e9c8e', accent: '#2f9e8f', door: '#bfe0d6' },
    glass:         { glass: true, base: '#dfe9ee', trim: '#a9b5bd', accent: 'rgba(46,196,182,0.55)', door: 'rgba(190,225,240,0.55)' },
    glass_or:      { glass: true, base: '#dcefe9', trim: '#5e9c8e', accent: 'rgba(47,158,143,0.7)', door: 'rgba(190,235,225,0.55)' },
  };
  // ---------------------------------------------------------------- Yerleşim planı
  // r: [x0, y0, x1, y1] (dahil)
  const ROOMS0 = {
    office:    { num: 7, name: 'Başhekimlik & Doktor Odası', r: [1, 1, 6, 8], floor: 'carpet', wall: 'core_straight' },
    exam1:     { num: 1, label: '1 - Muayene Odası', name: 'Muayene Odası 1', r: [7, 1, 11, 8], floor: 'vinyl', wall: 'glass' },
    exam2:     { num: 2, label: '2 - Muayene Odası', name: 'Muayene Odası 2', r: [12, 1, 16, 8], floor: 'vinyl', wall: 'glass' },
    lab:       { num: 4, name: 'Kan Alma & Biyo-Laboratuvar', r: [17, 1, 24, 8], floor: 'green', wall: 'glass' },
    pharmacy:  { num: 6, name: 'Eczane', r: [25, 1, 30, 8], floor: 'white', wall: 'glass' },
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
    O('sample_fridge', 23, 1),
    O('centrifuge', 24, 3, { tag: 'centrifuge' }),
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
    O('pharmacy_shelf', 25, 1, { w: 2 }),
    O('med_cabinet', 30, 2),
    O('pharmacy_counter', 27, 5, { w: 2, tag: 'pharmacy_counter' }),
    O('cart', 30, 5),
    O('prop_box_blue', 30, 5, { z: 22, ox: -7, block: false }),
    O('prop_box_purple', 30, 5, { z: 22, ox: 7, block: false }),
    O('first_aid', 28, 1),
    O('sanitizer', 25, 7),

    // 7 — Başhekim ve Doktor Odası
    O('rug', 2, 2, { w: 4, h: 4, flat: true }),
    O('exec_desk', 3, 2, { w: 2, tag: 'chief_desk' }),
    O('swivel_chair', 4, 1, { block: false }),
    O('certificates', 1, 1, { w: 2, block: false }),
    O('wall_clock', 5, 1, { block: false }),
    O('nameplate', 3, 2, { z: 28, ox: 8, block: false }),
    O('chair', 3, 4),
    O('chair', 4, 4),
    O('bookshelf', 6, 1),
    O('bookshelf', 6, 2),
    O('locker', 6, 3),
    O('terminal', 1, 5, { tag: 'archive_terminal' }),
    O('archive', 1, 6), O('archive', 1, 7),

    // Asansör (koridorun doğu ucu)
    O('elevator', 30, 9, { tag: 'elevator' }),
  ];
  const CAMPUS_START = OBJECTS0.length;
  OBJECTS0.push(...campusObjects());

  /** Hastane kampüsü: giriş meydanı, tabela, banklar, lambalar, otopark, yollar ve park ağaçları. */
  function campusObjects() {
    const out = [];
    const jit = (x, y) => { let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) >>> 0; return (h % 1000) / 1000; };
    const add = (k, x, y, extra) => out.push(O(k, x, y, extra));
    const R = 33; // ana cadde (korkuluk dışı)
    // Yol işaretleri ve yaya geçidi (zemine yatık)
    add('road_mark', -8, R, { w: 64, h: 3, block: false });
    add('road_mark', 31, -8, { w: 4, h: 40, block: false });
    add('crosswalk', 3, R, { w: 4, h: 3, block: false });
    // Giriş meydanı
    add('sign_hospital', 8, 24, { w: 2 });
    add('flower_bed', 13, 25, { w: 2 }); add('flower_bed', 21, 25, { w: 2 });
    add('bench', 11, 24, { face: 'S' }); add('bench', 16, 24, { face: 'S' }); add('bench', 25, 24, { face: 'S' });
    add('trash_bin', 10, 24); add('trash_bin', 24, 24);
    add('bush', 1, 25); add('bush', 2, 25); add('bush', 28, 25); add('bush', 18, 25);
    for (const x of [7, 19, 29]) add('lamp_post', x, 24);
    // Güney park bahçesi (korkuluk içinde, yürünebilir): gezinti yolu boyunca banklar, ağaçlar, çiçeklikler
    for (const x of [9, 15, 19, 26]) add('bench', x, 27, { face: 'S' });
    for (const x of [9, 16, 26]) add('bench', x, 29, { face: 'N' });
    for (const [x, y] of [[1, 27], [1, 30], [14, 26], [18, 30], [24, 26], [28, 30], [30, 27], [36, 26], [38, 30], [43, 27], [45, 30]]) add('tree', x, y, { block: true });
    for (const [x, y] of [[10, 30], [20, 26], [33, 29], [42, 25], [44, 29]]) add('flower_bed', x, y, { w: 2 });
    for (const x of [11, 21, 32, 39]) add('lamp_post', x, 28.6, { block: false });
    for (const [x, y] of [[13, 30], [23, 30], [41, 26]]) add('trash_bin', x, y);
    add('picnic_table', 34, 30, { w: 2 }); add('picnic_table', 42, 30, { w: 2 });
    for (const [x, y] of [[16, 30], [17, 30]]) add('planter', x, y);
    // Otopark (korkuluk içinde): çizgiler ve aydınlatma; araçlar world.js'te dinamik
    for (const y of [5, 10, 14, 19]) add('lamp_post', 45, y, { block: false });
    [3, 7, 12, 16].forEach((y) => add('parking_lines', 35, y, { w: 10, h: 2, face: 'E', block: false }));
    add('parking_sign', 35, 22);
    // Yükleme peronu ve ambulans yanaşma alanı işaretleri
    add('loading_dock', 31, 5, { w: 2, h: 4, block: false });
    // Park ağaçları: kuzey ve batı bantları (korkuluk dışı), cadde güneyi
    const tree = (x, y) => {
      if (x >= 4 && x <= 19 && y <= -2) return; // ek bina / şantiye alanı
      add(jit(x, y) > 0.82 ? 'bush' : 'tree', x + (jit(y, x) - 0.5) * 0.7, y + (jit(x + 1, y) - 0.5) * 0.7, { block: false });
    };
    // Yerleşke sınırı: taş kaideli ferforje korkuluk (ızgara kenarı boyunca), yaya ve araç kapıları
    for (let x = 0; x < 47; x++) {
      if (!(x >= 3 && x <= 6) && !(x >= 31 && x <= 34)) add('fence', x, 32, { face: 'S', block: false, post: x % 3 === 0 || x === 2 || x === 7 || x === 30 || x === 35 });
      if (!(x >= 31 && x <= 34)) add('fence', x, -1, { face: 'N', block: false, post: x % 3 === 0 || x === 30 || x === 35 });
    }
    for (let y = 0; y < 32; y++) {
      add('fence', -1, y, { face: 'W', block: false, post: y % 3 === 0 });
      add('fence', 47, y, { face: 'E', block: false, post: y % 3 === 0 });
    }
    add('gate_pillar', 2, 32, { block: false }); add('gate_pillar', 7, 32, { block: false });
    add('guard_booth', 8, 31);
    add('boom_barrier', 30, 31, { block: false });
    // Ek bina: açılan servis sayısıyla büyür (0 → şantiye ve vinç)
    add('annex_tower', 7, -8, { w: 9, h: 4, block: false });
    // Korkuluk dışındaki şehir: apartmanlar, çocuk parkı
    [[5, 42, 5, 3], [11, 42, 4, 3], [16, 42, 6, 3], [24, 42, 4, 3], [29, 42, 5, 3], [36, 42, 4, 3], [41, 42, 4, 3], [47, 42, 5, 3]].forEach(([x, y, w, h], i) => add('apartment', x, y, { w, h, block: false, floors: 2 + ((i * 7) % 3), tint: i }));
    add('playground', -6, 39, { w: 5, h: 4, block: false });
    for (const x of [0, 9, 15, 23, 28, 35, 40, 48]) add('lamp_post', x, R + 6, { block: false });
    for (let x = -7; x <= 54; x += 3) { tree(x, -2); tree(x + 1, -6); tree(x, R + 5); }
    for (let y = 1; y <= 31; y += 3) { tree(-2, y); tree(-6, y + 1); tree(49, y); tree(53, y + 1); }
    for (const [x, y] of [[-1, 4], [-1, 12], [-1, 20], [-1, 28], [6, -1], [16, -1], [26, -1]]) add('lamp_post', x, y, { block: false });
    for (const x of [-5, 2, 12, 22, 33, 41, 50]) add('bench', x, R + 4, { face: 'N', block: false });
    // Giriş meydanı canlandırma
    add('entrance_canopy', 3, 23, { w: 4, h: 2, block: false });
    add('fountain', 14, 23, { w: 2, h: 2 });
    add('pond', 35, 23, { w: 4, h: 3 });
    for (const x of [10, 11, 12]) add('flag_pole', x, 23, { tint: x });
    for (const x of [17, 20, 23, 28]) add('planter', x, 23);
    add('bike_rack', 25, 23, { w: 2 });
    add('er_sign', 31, 13);
    add('bus_stop', 40, R + 3, { w: 3, block: false });
    add('picnic_table', -3, 11, { w: 2, block: false }); add('picnic_table', -3, 17, { w: 2, block: false });
    return out;
  }

  // ---------------------------------------------------------------- Üst katlar (Aşama 5)
  // Her kat ayrı bir harita: kendi odaları, kapıları ve nesneleri. Asansör (1,7) hücresinde.
  const UPPER_CORRIDOR = { num: 0, name: 'Koridor', r: [1, 7, 22, 8], floor: 'corridor', wall: 'core_handrail', noLabel: true };

  const FLOOR_SURGERY = {
    id: 'surgery', name: '1. Kat · Cerrahi & Ameliyathane', W: 24, H: 15, arrive: [2.5, 7.9],
    rooms: {
      or1:       { name: 'Ameliyathane', r: [1, 1, 9, 6], floor: 'sterile', wall: 'glass_or' },
      scrub:     { name: 'Cerrahi Hazırlık (Scrub)', r: [10, 1, 14, 6], floor: 'sterile', wall: 'glass_or' },
      recovery:  { name: 'Uyandırma Odası', r: [15, 1, 22, 6], floor: 'vinyl', wall: 'glass' },
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
      O('mayo_stand', 7, 3),
      O('iv_stand', 4, 2),
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
      nurse:    { name: 'Hemşire İstasyonu', r: [1, 9, 8, 13], floor: 'white', wall: 'glass' },
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
      us:       { name: 'Ultrason', r: [8, 1, 13, 6], floor: 'vinyl', wall: 'glass' },
      ecg:      { name: 'EKG & Kardiyak Tanı', r: [14, 1, 22, 6], floor: 'white', wall: 'glass' },
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
      O('control_booth', 20, 9, { w: 3, h: 2 }),
      O('radiation_sign', 15, 10, { block: false }),
      O('terminal', 21, 12, { tag: 'pacs' }),
      O('elevator', 1, 7, { tag: 'elevator' }),
    ],
  };

  // Bodrum kat: yemekhane, servis tezgâhı ve kafeterya (her zaman açık)
  const FLOOR_CAFE = {
    id: 'cafe', name: 'B1 · Yemekhane & Kafeterya', W: 24, H: 15, arrive: [2.5, 7.9], alwaysOpen: true,
    rooms: {
      dining:   { name: 'Yemekhane', r: [1, 1, 14, 6], floor: 'wood', wall: 'core_window' },
      kitchen:  { name: 'Yemek Servisi & Mutfak', r: [15, 1, 22, 6], floor: 'ceramic', wall: 'glass' },
      corridor: UPPER_CORRIDOR,
      cafe:     { name: 'Kafeterya & Dinlenme', r: [1, 9, 12, 13], floor: 'vinyl', wall: 'core_straight' },
      dining2:  { name: 'Ek Yemek Salonu', r: [13, 9, 22, 13], floor: 'wood', wall: 'ward' },
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
    { id: 'ground', name: 'Zemin Kat', W: 47, H: 32, rooms: ROOMS0, doors: DOORS0, open: OPEN0, objects: OBJECTS0, arrive: [29.5, 10.4], outdoor: true, deco: { x0: -8, y0: -9, x1: 56, y1: 46 } },
    FLOOR_SURGERY, FLOOR_WARD, FLOOR_RADIOLOGY, FLOOR_CAFE,
  ];

  // ---------------------------------------------------------------- Izgara (kat başına)
  const ek = (e, x, y) => e + ':' + x + ':' + y;

  // Zemin kat dış dünyası: ızgara dışındaki (negatif/taşan) hücreler yalnızca görsel "kampüs"tür.
  //  - x 31..34: ambulans yolu, x 35..44: otopark, y 23..26: giriş meydanı, y 27..29: ana cadde,
  //  - y 30: kaldırım, kuzey/batı: park alanı ve yürüyüş yolu.
  // Kampüs sınırları (ızgara = korkuluk içi): x 0..46, y 0..31. Cadde y 33..35, kaldırımlar 32 ve 36.
  const ROAD_Y = 33;
  function outdoorFloor(def, x, y) {
    if (!def.outdoor) return null;
    if (y >= ROAD_Y && y <= ROAD_Y + 2) return 'road';
    if (y === ROAD_Y - 1 || y === ROAD_Y + 3) return 'pavement';
    if (y > ROAD_Y + 3) return y <= ROAD_Y + 5 ? 'grass' : (x <= 3 ? 'grass' : (y === ROAD_Y + 6 ? 'path' : 'pavement'));
    if (x >= 31 && x <= 34) return 'asphalt';
    if (x >= 35 && x <= 46 && y >= 1 && y <= 21) return x >= 45 ? 'asphalt' : 'parking';
    if (x >= 47 || x < 0 || y < 0) {
      if (x === -4 || y === -4) return 'path';
      return 'grass';
    }
    if (y === 23 && (x === 4 || x === 5)) return 'ramp';
    if (y >= 23) {
      // Güney park bahçesi: giriş yürüyüş yolu, gezinti yolu ve çimen
      if (x >= 3 && x <= 6) return 'pavement';
      if (y === 23) return 'pavement';
      if (y === 28 || x === 12 || x === 22 || x === 40) return 'path';
      if (x >= 35 && y === 22) return 'pavement';
      return 'grass';
    }
    if (x >= 35 && y === 22) return 'pavement';
    if (x === 0 || y === 0) return 'path';
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
      case 'carpet': dots(260, f.speck, 1.2); dots(80, 'rgba(255,255,255,0.06)', 1); break;
      case 'tile': isoLines(16, 'rgba(70,140,150,0.35)', 1); isoLines2(16, 'rgba(70,140,150,0.35)', 1); dots(20, 'rgba(255,255,255,0.4)', 1.5); break;
      case 'wood': isoLines(10.67, 'rgba(110,70,35,0.35)', 1.2); dots(50, f.speck, 1.5); for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(R() * 128, R() * 64, 10, 1); } break;
      case 'ceramic': isoLines(32, 'rgba(120,110,95,0.35)', 1.5); isoLines2(32, 'rgba(120,110,95,0.35)', 1.5); dots(25, f.speck, 2); break;
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
      // zemine yatık nesnelerin izo sınır kutusu (zemin önbellek parçalarına atamak için)
      const pc = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]].map(([x, y]) => worldToIso(x, y));
      it.bb = [Math.min(...pc.map((p) => p[0])) - 6, Math.min(...pc.map((p) => p[1])) - 24, Math.max(...pc.map((p) => p[0])) + 6, Math.max(...pc.map((p) => p[1])) + 6];
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
    if (fi >= 1 && fi <= 3) bounds.y1 += fi * STOREY; // aşağıdaki bina cephesine kaydırılabilsin
    cache = { floors: floorsList, items, flats, bounds, lamps };
    perfReset();
  }

  // ---------------------------------------------------------------- Performans: önbellekler, kırpma, LOD
  // 1) Zemin katmanı (karo dokuları + zemine yatık sabit nesneler) 512 izo-piksellik parçalar hâlinde
  //    offscreen canvas'lara bir kez çizilir; her karede yalnızca görünen parçalar drawImage ile basılır.
  // 2) Sabit (animasyonsuz) nesneler ilk görüldüklerinde kendi sprite'larına çizilir; sonra tek drawImage.
  //    Animasyonlu/duruma bağlı türler (VH.art.isDynamic) her karede canlı çizilir.
  // 3) Önbellek ölçeği yakınlaştırma × piksel oranına göre kademelidir; çok yakında (≥2.2) canlı çizim yapılır.
  // Kat, rotasyon, yerleşim (inşa/taşıma) veya ekipman seviyesi değişince önbellekler sıfırlanır.
  const CHUNK = 512, SCALES = [0.5, 0.75, 1, 1.5, 2];
  const perf = { chunks: new Map(), sprites: new Map(), bounds: new Map(), px: 0, frame: 0, scale: 1, enabled: true, ratio: 1 };
  function perfReset() { perf.chunks.clear(); perf.sprites.clear(); perf.px = 0; wallSprites.clear(); }
  function scaleBucket(z) { const e = z * perf.ratio; if (e > 2.2) return 0; return SCALES.find((s) => s >= e - 0.05) || 2; }
  const staticFlat = (it) => it.o._alpha === undefined && !VH.art.isDynamic(it.o.k);
  function liveGround(ctx, x0, y0, x1, y1) {
    for (const f of cache.floors) if (f.sx + 33 > x0 && f.sx - 33 < x1 && f.sy + 33 > y0 && f.sy - 1 < y1) drawFloor(ctx, f);
    for (const it of cache.flats) if (staticFlat(it) && it.bb[2] > x0 && it.bb[0] < x1 && it.bb[3] > y0 && it.bb[1] < y1) VH.art.draw(ctx, it);
  }
  function chunkCanvas(cx, cy, s) {
    const pad = 2, c = document.createElement('canvas');
    c.width = Math.ceil((CHUNK + pad * 2) * s); c.height = c.width;
    const g = c.getContext('2d');
    g.setTransform(s, 0, 0, s, (-cx * CHUNK + pad) * s, (-cy * CHUNK + pad) * s);
    liveGround(g, cx * CHUNK - pad, cy * CHUNK - pad, (cx + 1) * CHUNK + pad, (cy + 1) * CHUNK + pad);
    return c;
  }
  /** Görünen zemin parçalarını çizer; bu karede üretilemeyen parça canlı çizilir. */
  function drawGround(ctx, l, t, r, b) {
    const s = perf.scale;
    if (!s || !perf.enabled) { liveGround(ctx, l, t, r, b); return; }
    let budget = 3;
    const pad = 2;
    for (let cy = Math.floor(t / CHUNK); cy <= Math.floor(b / CHUNK); cy++) {
      for (let cx = Math.floor(l / CHUNK); cx <= Math.floor(r / CHUNK); cx++) {
        const key = cx + ',' + cy + '@' + s;
        let ch = perf.chunks.get(key);
        if (!ch && budget > 0) { budget--; ch = { c: chunkCanvas(cx, cy, s), used: 0 }; perf.chunks.set(key, ch); }
        if (ch) { ch.used = perf.frame; ctx.drawImage(ch.c, cx * CHUNK - pad, cy * CHUNK - pad, CHUNK + pad * 2, CHUNK + pad * 2); }
        else liveGround(ctx, cx * CHUNK, cy * CHUNK, (cx + 1) * CHUNK, (cy + 1) * CHUNK);
      }
    }
    if (perf.chunks.size > 48) {
      const old = [...perf.chunks.entries()].sort((a, b2) => a[1].used - b2[1].used).slice(0, perf.chunks.size - 40);
      old.forEach(([k]) => perf.chunks.delete(k));
    }
  }
  // Sprite önbelleği: nesnenin gerçek piksel sınırları küçük bir ölçekte bir kez ölçülür
  const scratch = document.createElement('canvas');
  function measure(it, bkey) {
    let bb = perf.bounds.get(bkey);
    if (bb) return bb;
    const o = it.o, span = ((o.w || 1) + (o.h || 1)) * 32 + 120, up = 420, down = ((o.w || 1) + (o.h || 1)) * 16 + 60;
    const q = 0.25;
    scratch.width = Math.ceil(span * 2 * q); scratch.height = Math.ceil((up + down) * q);
    const g = scratch.getContext('2d');
    g.setTransform(q, 0, 0, q, (span - it.cx) * q, (up - it.cy) * q);
    VH.art.draw(g, it);
    const d = g.getImageData(0, 0, scratch.width, scratch.height).data, W2 = scratch.width;
    let x0 = W2, y0 = scratch.height, x1 = -1, y1 = -1;
    for (let i = 3; i < d.length; i += 4) if (d[i]) { const p = (i - 3) / 4, x = p % W2, y = (p / W2) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    bb = x1 < 0 ? [0, 0, 0, 0] : [x0 / q - span - 6, y0 / q - up - 6, (x1 + 1) / q - span + 6, (y1 + 1) / q - up + 6];
    perf.bounds.set(bkey, bb);
    return bb;
  }
  const NO_SPRITE = new Set(['apartment', 'annex_tower']);
  // Duvar sprite'ları: kapı olmayan duvar parçaları analitik sınır kutusuyla bir kez çizilir
  const wallSprites = new Map();
  function drawWallCached(ctx, it, budget) {
    const s = perf.scale;
    if (!s || !perf.enabled || it.w.type === 'door' || s > 1.5) { drawWall(ctx, it); return budget; }
    const key = facadeTier + '|' + rot + '|' + s + '|' + fi;
    let sp = wallSprites.get(it);
    if (!sp || sp.key !== key) {
      if (budget <= 0) { drawWall(ctx, it); return budget; }
      budget--;
      const sgn = it.run === 'R' ? 1 : -1, h = it.full ? WALL_FULL : WALL_CUT;
      const x0 = Math.min(it.sx, it.sx + 32 * sgn) - 8, x1 = Math.max(it.sx, it.sx + 32 * sgn) + 8;
      const y0 = it.sy - h - 12, y1 = it.sy + 20;
      const c = document.createElement('canvas');
      c.width = Math.ceil((x1 - x0) * s); c.height = Math.ceil((y1 - y0) * s);
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
      wallHQ = true; try { drawWall(g, it); } finally { wallHQ = false; }
      sp = { key, c, x0, y0, w: x1 - x0, h: y1 - y0 };
      wallSprites.set(it, sp);
    }
    ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
    return budget;
  }
  function drawObj(ctx, it, budget) {
    const o = it.o, s = perf.scale;
    const sway = o.k === 'tree' && camera.zoom >= 1; // ağaç salınımı yalnızca yakından görünür
    if (!s || !perf.enabled || o._alpha !== undefined || o.ghost || NO_SPRITE.has(o.k) || sway || (o.k !== 'tree' && VH.art.isDynamic(o.k))) { VH.art.draw(ctx, it); return budget; }
    const key = o.k + '|' + o.x + '|' + o.y + '|' + (o.w || 1) + '|' + (o.h || 1) + '|' + (o.face || 'S') + '|' + (o.lvl || 0) + '|' + rot + '|' + s;
    let sp = perf.sprites.get(o);
    if (!sp || sp.key !== key) {
      if (budget <= 0) { VH.art.draw(ctx, it); return budget; }
      budget--;
      const bb = measure(it, o.k + '|' + (o.w || 1) + '|' + (o.h || 1) + '|' + (o.face || 'S') + '|' + (o.lvl || 0) + '|' + rot + '|' + (o.z || 0) + '|' + (o.ox || 0));
      const w = bb[2] - bb[0], h = bb[3] - bb[1];
      if (w <= 0 || h <= 0) { perf.sprites.set(o, { key, c: null }); return budget; }
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * s)); c.height = Math.max(1, Math.ceil(h * s));
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, (-it.cx - bb[0]) * s, (-it.cy - bb[1]) * s);
      VH.art.hq = true; try { VH.art.draw(g, it); } finally { VH.art.hq = false; }
      if (sp && sp.c) perf.px -= sp.c.width * sp.c.height;
      sp = { key, c, dx: bb[0], dy: bb[1], w, h, used: 0 };
      perf.sprites.set(o, sp);
      perf.px += c.width * c.height;
    }
    sp.used = perf.frame;
    if (sp.c) ctx.drawImage(sp.c, it.cx + sp.dx, it.cy + sp.dy, sp.w, sp.h);
    return budget;
  }
  function trimSprites() {
    if (perf.px < 28e6) return;
    const arr = [...perf.sprites.entries()].filter(([, v]) => v.c).sort((a, b) => a[1].used - b[1].used);
    for (const [o, v] of arr) { if (perf.px < 20e6) break; perf.px -= v.c.width * v.c.height; perf.sprites.delete(o); }
  }
  // Görünüm anahtarlı paylaşılan sprite'lar: hareket eden araçlar (konumdan bağımsız) yüksek kaliteyle bir kez çizilir.
  // o.spriteKey görünümü tam tanımlar (tür, renk, yön, fren/ışık durumu...).
  const shared = new Map();
  let sharedBudget = 6, sharedFrame = -1;
  function drawSprite(ctx, o) {
    const [cx, cy] = worldToIso(o.x + (o.w || 1) / 2, o.y + (o.h || 1) / 2);
    const it = { kind: 'obj', o, cx, cy };
    const s = perf.scale;
    if (!s || !perf.enabled || !o.spriteKey) { VH.art.draw(ctx, it); return; }
    if (sharedFrame !== perf.frame) { sharedFrame = perf.frame; sharedBudget = 6; }
    const key = o.spriteKey + '|' + rot + '|' + s;
    let sp = shared.get(key);
    if (!sp) {
      if (sharedBudget <= 0) { VH.art.draw(ctx, it); return; }
      sharedBudget--;
      const bb = measure(it, 'S|' + o.spriteKey + '|' + rot);
      const w = bb[2] - bb[0], h = bb[3] - bb[1];
      if (w <= 0 || h <= 0) return;
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * s)); c.height = Math.max(1, Math.ceil(h * s));
      const g = c.getContext('2d');
      g.setTransform(s, 0, 0, s, (-cx - bb[0]) * s, (-cy - bb[1]) * s);
      VH.art.hq = true; try { VH.art.draw(g, it); } finally { VH.art.hq = false; }
      sp = { c, dx: bb[0], dy: bb[1], w, h, used: 0 };
      shared.set(key, sp);
      if (shared.size > 260) { const old = [...shared.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, 60); old.forEach(([k]) => shared.delete(k)); }
    }
    sp.used = perf.frame;
    ctx.drawImage(sp.c, cx + sp.dx, cy + sp.dy, sp.w, sp.h);
  }

  /** Sıralı statik liste ile dinamik çizilebilirleri her karede yeniden sıralamadan birleştirir. */
  function mergeSorted(a, b) {
    if (!b.length) return a;
    b.sort((p, q) => p.key - q.key);
    const out = new Array(a.length + b.length);
    let i = 0, j = 0, k = 0;
    while (i < a.length && j < b.length) out[k++] = a[i].key <= b[j].key ? a[i++] : b[j++];
    while (i < a.length) out[k++] = a[i++];
    while (j < b.length) out[k++] = b[j++];
    return out;
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

    if (w.type === 'door') {
      // Çift kanatlı sürgülü otomatik cam kapı: her hücre bir kanat; biri yaklaşınca kanatlar dışa kayar.
      // Kanat 0'ın merkez kenarı u=1'de, kanat 1'in merkez kenarı u=0'dadır.
      const p = it.part || 0, op = doorAmt[w.door] || 0;
      const lh = full ? 52 : WALL_CUT;
      const g0 = p ? 0.02 + 0.8 * op : 0.08, g1 = p ? 0.92 : 0.98 - 0.8 * op;
      if (full) quad(0, 1, 0, h, S(st.base));
      quad(0, 1, 0, 2.5, S('#9aa7b0'));                                   // eşik rayı
      if (g1 > g0 + 0.01) {
        quad(g0, g1, 2.5, lh, 'rgba(165,215,240,0.42)');                 // buzlu cam kanat
        quad(g0, g1, 2.5, 4.5, S('#8fa3ad'));
        quad(p ? g0 : g1 - 0.04, p ? g0 + 0.04 : g1, 2.5, lh, S('#b8c4cb')); // kanat dikmesi (merkez kenar)
        if (full) quad(g0 + 0.1 * (g1 - g0), g0 + 0.3 * (g1 - g0), 20, 46, 'rgba(255,255,255,0.22)');
        else quad(g0, g1, lh - 2, lh, S('#c9d1d6'));
        if (full) quad(g0, g1, 26, 28, 'rgba(46,196,182,0.55)');         // turkuaz güvenlik bandı
      }
      quad(p ? 0.94 : 0, p ? 1 : 0.06, 0, lh + (full ? 3 : 2), S('#7e8d96'));   // dış kasa
      if (full) quad(0, 1, 52, 56, S(st.trim));
      else if (op < 0.2) {
        // kapalıyken yön şeridi
        ctx.strokeStyle = 'rgba(46,196,182,0.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + sgn * 32, Y + 16); ctx.stroke();
      }
      // Kapı üstü birim tabelası (kanat 1 çiziminde, iki hücreyi ortalar)
      if (p === 1) {
        const txt = doorSign(w);
        if (txt) {
          const z0 = full ? 58 : WALL_CUT + 6, z1 = z0 + 11;
          if (!full) { quad(-0.97, -0.92, 0, z1, S('#7e8d96')); quad(0.92, 0.97, 0, z1, S('#7e8d96')); }
          quad(-0.8, 0.8, z0, z1, '#173447');
          quad(-0.8, 0.8, z0, z0 + 1.2, '#2ec4b6');
          const c = pt(0, (z0 + z1) / 2);
          ctx.save(); ctx.translate(c[0], c[1]); ctx.transform(1, 0.5 * sgn, 0, 1, 0, 0);
          ctx.fillStyle = txt === 'ECZANE' ? '#7dff9a' : txt.startsWith('ACİL') ? '#ff8a8d' : '#e9fffb';
          ctx.font = '800 6.5px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText((txt === 'ECZANE' ? '✚ ' : '') + txt, 0, 0.5);
          ctx.restore();
        }
      }
      if (!full) return;
    } else if (st.glass) {
      // Cam bölme: alüminyum kaide, dikmeler, ara kayıt ve yarı saydam cam
      quad(0, 1, 0, Math.min(5, h), S('#a9b5bd'));
      quad(0.03, 0.97, 5, h - (full ? 4 : 1), 'rgba(170,215,238,0.30)');
      quad(0, 0.035, 0, h, S('#c9d1d6')); quad(0.965, 1, 0, h, S('#c9d1d6'));
      if (full) { quad(0, 1, 28, 30, S('#c9d1d6')); quad(0, 1, h - 4, h, S('#c9d1d6')); quad(0.15, 0.3, 36, 58, 'rgba(255,255,255,0.18)'); quad(0.08, 0.92, 31, 33, st.accent || 'rgba(46,196,182,0.6)'); }
      else quad(0, 1, h - 2, h, S('#c9d1d6'));
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
      if (fi === 0 && it.ext && facadeTier > 0 && !st.glass) {
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
      if (wallHQ) {
        // render kalitesi: zemin birleşiminde ortam kapanması, üstte hafif ışık
        quad(0, 1, 0, 10, "rgba(20,30,40,0.09)"); quad(0, 1, 0, 4, "rgba(20,30,40,0.08)");
        if (full) quad(0, 1, h - 8, h, "rgba(255,255,255,0.10)");
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
  let wallHQ = false;
  // ---------------------------------------------------------------- Otomatik kapılar ve birim tabelaları
  const DOOR_SIGNS = {
    office: 'BAŞHEKİMLİK', exam1: '1 - MUAYENE', exam2: '2 - MUAYENE', lab: 'LABORATUVAR', pharmacy: 'ECZANE',
    reception: 'KAYIT', waiting: 'BEKLEME', er: 'ACİL SERVİS', or1: 'AMELİYATHANE', scrub: 'HAZIRLIK', recovery: 'UYANDIRMA',
    surgclin: 'POLİKLİNİK', sterile: 'STERİL DEPO', ward1: 'SERVİS', peds: 'PEDİATRİ', nurse: 'HEMŞİRE', xray: 'RÖNTGEN',
    us: 'ULTRASON', ecg: 'EKG', dialysis: 'DİYALİZ', report: 'MR', dining: 'YEMEKHANE', kitchen: 'MUTFAK', cafe: 'KAFETERYA', dining2: 'SALON',
  };
  const EXT_SIGNS = { 'Ana Giriş': 'ANA GİRİŞ', 'Ambulans Girişi': 'ACİL GİRİŞ', 'Lojistik Kapısı': 'LOJİSTİK' };
  let doorAmt = [], doorAmtF = -1;
  // Her oda için tek tabela: odanın koridora açılan kapılarından asansöre en az 4 hücre uzak olan ilki seçilir
  // (iki oda arasındaki iç kapılara tabela konmaz). Böylece aynı adın tekrarı ve asansör tabelasıyla çakışma önlenir.
  const signOwner = new Map();
  function signOwners() {
    if (signOwner.has(fi)) return signOwner.get(fi);
    const own = {}, def = floors[fi].def;
    const elev = def.objects.filter((o) => o.tag === "elevator");
    const farFromElev = (d) => elev.every((o) => Math.hypot(d.x - o.x, d.y - o.y) >= 4);
    const cand = {};
    walls.forEach((w) => {
      if (w.type !== "door") return;
      const ids = [w.a, w.b];
      if (!ids.includes("corridor") && ids.every((id) => id)) return;
      const r = ids.find((id) => id && id !== "corridor" && DOOR_SIGNS[id]);
      if (!r) return;
      (cand[r] = cand[r] || new Set()).add(w.door);
    });
    Object.keys(cand).forEach((r) => {
      const list = [...cand[r]].sort((a, b) => a - b);
      own[r] = list.find((i) => farFromElev(def.doors[i])) ?? list[0];
    });
    signOwner.set(fi, own);
    return own;
  }
  function doorSign(w) {
    const d = floors[fi].def.doors[w.door];
    if (d && d.name && EXT_SIGNS[d.name]) return EXT_SIGNS[d.name];
    const ids = [w.a, w.b];
    if (!ids.includes("corridor") && ids.every((id) => id)) return "";
    const r = ids.find((id) => id && id !== "corridor" && DOOR_SIGNS[id]);
    if (!r || signOwners()[r] !== w.door) return "";
    return DOOR_SIGNS[r];
  }
  /** Kapı kanatlarını yakındaki karakterlere göre açar/kapatır (ents: geçerli kattaki kişiler). */
  function updateDoors(dt, ents) {
    const ds = floors[fi].def.doors;
    if (doorAmtF !== fi || doorAmt.length !== ds.length) { doorAmt = ds.map(() => 0); doorAmtF = fi; }
    for (let i = 0; i < ds.length; i++) {
      const d = ds[i];
      const cx = d.e === 'N' ? d.x + 1 : d.x, cy = d.e === 'N' ? d.y : d.y + 1;
      let near = 0;
      for (const e of ents) if (Math.abs(e.x - cx) < 1.6 && Math.abs(e.y - cy) < 1.6) { near = 1; break; }
      doorAmt[i] += (near - doorAmt[i]) * Math.min(1, dt * 6);
    }
  }

  // ---------------------------------------------------------------- Kamera
  let facadeTier = 0;
  const camera = {
    x: 0, y: 0, zoom: 1.2, minZoom: 0.45, maxZoom: 3.2, base: 1.2, want: null,
    follow: true, target: null,
    toIso(px, py, vw, vh) { return [(px - vw / 2) / this.zoom + this.x, (py - vh / 2) / this.zoom + this.y]; },
    toScreen(ix, iy, vw, vh) { return [(ix - this.x) * this.zoom + vw / 2, (iy - this.y) * this.zoom + vh / 2]; },
    pan(dx, dy) { this.x -= dx / this.zoom; this.y -= dy / this.zoom; this.follow = false; this.panGoal = null; this.clamp(); },
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
    /** Kamerayı bir dünya noktasına yumuşakça kaydırır (takip kapalıyken). */
    panTo(x, y) { this.panGoal = worldToIso(x, y); },
    glide(z, speed) { this.want = Math.max(this.minZoom, Math.min(this.maxZoom, z)); this.gspeed = speed || 3.2; },
    update(dt) {
      if (this.want !== null) {
        const d = this.want - this.zoom;
        if (Math.abs(d) < 0.004) { this.zoom = this.want; this.want = null; } else this.zoom += d * Math.min(1, dt * (this.gspeed || 3.2));
      }
      if (!this.follow && this.panGoal) {
        const k = Math.min(1, dt * 5);
        this.x += (this.panGoal[0] - this.x) * k; this.y += (this.panGoal[1] - 20 - this.y) * k;
        if (Math.hypot(this.panGoal[0] - this.x, this.panGoal[1] - 20 - this.y) < 1) this.panGoal = null;
        this.clamp();
      }
      if (this.follow) this.panGoal = null;
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

  // ---------------------------------------------------------------- Kat kesiti (cutaway): bina dış cephesi
  // Üst katlardayken alt katların iç mekânı çizilmez; yerine binanın mavi-beyaz seramik ve
  // cam giydirme cephesi kat kat aşağı doğru uzanır, en altta kampüs zemini görünür.
  // Kilitli (inşa edilmemiş) katların cephesi gri tonlu ve kilit rozetlidir. B1'de toprak kesiti çizilir.
  const STOREY = 96;                 // bir katın cephe yüksekliği (izo piksel)
  const TOWER = [1, 1, 23, 14];      // üst katların ortak ayak izi (dünya hücresi)
  const STACK_TREES = [[-3, 3], [-4, 9], [-2, 15], [5, 17], [12, 18], [19, 17], [26, 15], [27, 8], [26, 2], [8, -2], [17, -3]];
  function towerBox(pad) {
    const [x0, y0, x1, y1] = TOWER;
    const pts = [[x0 - pad, y0 - pad], [x1 + pad, y0 - pad], [x1 + pad, y1 + pad], [x0 - pad, y1 + pad]].map(([x, y]) => rotPt(x, y));
    const rx0 = Math.min(...pts.map((p) => p[0])), rx1 = Math.max(...pts.map((p) => p[0]));
    const ry0 = Math.min(...pts.map((p) => p[1])), ry1 = Math.max(...pts.map((p) => p[1]));
    return { A: iso(rx0, ry1), B: iso(rx1, ry1), C: iso(rx1, ry0), D: iso(rx0, ry0), nL: rx1 - rx0, nR: ry1 - ry0 };
  }
  const floorIsOpen = (f) => (VH.hospital && VH.hospital.floorOpen ? VH.hospital.floorOpen(f) : true);
  function fillPoly(ctx, pts, col) {
    ctx.fillStyle = col; ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath(); ctx.fill();
  }
  /** Bir cephe yüzünde (P0→P1) z0..z1 (aşağı pozitif) arasında u0..u1 dörtgeni. */
  function faceQuad(ctx, P0, P1, u0, u1, z0, z1, col) {
    const at = (u, z) => [P0[0] + (P1[0] - P0[0]) * u, P0[1] + (P1[1] - P0[1]) * u + z];
    fillPoly(ctx, [at(u0, z0), at(u1, z0), at(u1, z1), at(u0, z1)], col);
  }
  function drawStorey(ctx, P0, P1, n, zTop, f, dark, night, ground) {
    const open = floorIsOpen(f);
    const t = performance.now() / 1000;
    const base = open ? (dark ? '#d6e2ea' : '#f2f7fa') : (dark ? '#9aa1a6' : '#b4babe');
    const band = open ? (dark ? '#245f8f' : '#2f78b3') : (dark ? '#6d7377' : '#80878b');
    const glass = open ? (dark ? '#5d9cc4' : '#86c0e2') : (dark ? '#5d6468' : '#727a7f');
    const zB = zTop + STOREY;
    faceQuad(ctx, P0, P1, 0, 1, zTop, zB, base);                       // seramik panel zemin
    faceQuad(ctx, P0, P1, 0, 1, zTop, zTop + 7, band);                 // döşeme alnı (mavi bant)
    faceQuad(ctx, P0, P1, 0, 1, zB - 4, zB, open ? '#c4d2dc' : '#8f969a');
    for (let i = 0; i < n; i++) {
      const u0 = (i + 0.12) / n, u1 = (i + 0.88) / n;
      if (ground && i === Math.floor(n / 2)) {                         // zemin kat: cam giriş kapısı ve saçak
        faceQuad(ctx, P0, P1, (i - 0.4) / n, (i + 1.4) / n, zB - 52, zB, '#2b5876');
        faceQuad(ctx, P0, P1, (i - 0.3) / n, (i + 1.3) / n, zB - 48, zB, 'rgba(160,215,240,0.75)');
        faceQuad(ctx, P0, P1, (i - 0.6) / n, (i + 1.6) / n, zB - 58, zB - 52, '#2ec4b6');
        continue;
      }
      faceQuad(ctx, P0, P1, u0, u1, zTop + 16, zB - 14, dark ? '#3e5f75' : '#4f7790'); // pencere çerçevesi
      faceQuad(ctx, P0, P1, u0 + 0.02 / n, u1 - 0.02 / n, zTop + 18, zB - 16, glass);
      // Gece: açık katlarda bazı pencereler sıcak ışıkla yanar
      if (open && night > 0.05 && VH.art.hash(i + f * 31, n) > 0.35) faceQuad(ctx, P0, P1, u0 + 0.02 / n, u1 - 0.02 / n, zTop + 18, zB - 16, `rgba(255,214,140,${0.75 * night})`);
      // cam yansıması
      faceQuad(ctx, P0, P1, u0 + 0.05 / n, u0 + 0.22 / n, zTop + 20, zB - 30, 'rgba(255,255,255,0.22)');
      faceQuad(ctx, P0, P1, u0, u1, zTop + 46, zTop + 48, dark ? '#3e5f75' : '#4f7790');
    }
    if (!open) {
      // Kilit rozeti: yüzün ortasında
      const u = 0.5, mx = P0[0] + (P1[0] - P0[0]) * u, my = P0[1] + (P1[1] - P0[1]) * u + zTop + STOREY / 2;
      const pulse = 1 + Math.sin(t * 3) * 0.04;
      ctx.save(); ctx.translate(mx, my); ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(20,26,32,0.85)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-6, -2, 12, 9);
      ctx.beginPath(); ctx.arc(0, -3, 4.5, Math.PI, 0); ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }
  function drawStack(ctx, night) {
    const isUnder = def0().id === 'cafe';
    const T = towerBox(0);
    if (isUnder) {
      // B1: bodrum kat — toprak kesiti ve temel perdesi
      const depth = 150;
      faceQuad(ctx, T.A, T.B, 0, 1, 0, depth, '#5a4636'); faceQuad(ctx, T.B, T.C, 0, 1, 0, depth, '#4a392c');
      for (let k = 1; k < 5; k++) { faceQuad(ctx, T.A, T.B, 0, 1, k * 30, k * 30 + 3, 'rgba(0,0,0,0.12)'); faceQuad(ctx, T.B, T.C, 0, 1, k * 30, k * 30 + 3, 'rgba(0,0,0,0.12)'); }
      faceQuad(ctx, T.A, T.B, 0, 1, 0, 12, '#8d969c'); faceQuad(ctx, T.B, T.C, 0, 1, 0, 12, '#79828a');
      fillPoly(ctx, [T.A, T.B, T.C, T.D], '#9aa3a8');
      return;
    }
    const n = fi; // altta kalan kat sayısı (zemin + ara katlar)
    // Kampüs zemini (en altta)
    ctx.save();
    ctx.translate(0, n * STOREY);
    const G = towerBox(10), Pv = towerBox(2);
    fillPoly(ctx, [G.A, G.B, G.C, G.D], '#5f9a56');
    fillPoly(ctx, [Pv.A, Pv.B, Pv.C, Pv.D], '#c9cbc3');
    const R1 = towerBox(10), R0 = towerBox(7);
    fillPoly(ctx, [R0.A, R0.B, R1.B, R1.A], '#4a5259');                // ön cadde
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.setLineDash([10, 10]); ctx.lineWidth = 2;
    const mA = [(R0.A[0] + R1.A[0]) / 2, (R0.A[1] + R1.A[1]) / 2], mB = [(R0.B[0] + R1.B[0]) / 2, (R0.B[1] + R1.B[1]) / 2];
    ctx.beginPath(); ctx.moveTo(mA[0], mA[1]); ctx.lineTo(mB[0], mB[1]); ctx.stroke(); ctx.setLineDash([]);
    const c0 = rotPt(TOWER[0], TOWER[1]), c1 = rotPt(TOWER[2], TOWER[3]);
    const fx0 = Math.max(c0[0], c1[0]), fy0 = Math.max(c0[1], c1[1]);
    const front = ([x, y]) => { const r = rotPt(x, y); return r[0] > fx0 - 0.5 || r[1] > fy0 - 0.5; };
    const trees = (fr) => { for (const t of STACK_TREES) if (front(t) === fr) VH.art.draw(ctx, { o: { k: 'tree', x: t[0], y: t[1], w: 1, h: 1 } }); };
    trees(false);
    // bina gölgesi
    fillPoly(ctx, [T.A, T.B, T.C, [T.C[0] + 40, T.C[1] + 20], [T.B[0] + 40, T.B[1] + 20], [T.A[0] + 40, T.A[1] + 20]], 'rgba(10,30,20,0.25)');
    ctx.restore();
    // Kat kat cephe (en alttaki zemin kattan başlayarak)
    for (let s = 0; s < n; s++) {
      const zTop = (n - 1 - s) * STOREY;
      drawStorey(ctx, T.A, T.B, T.nL, zTop, s, false, night, s === 0);
      drawStorey(ctx, T.B, T.C, T.nR, zTop, s, true, night, false);
    }
    ctx.save(); ctx.translate(0, n * STOREY); trees(true); ctx.restore();
    // Zemin kat cephesinde ışıklı "VITA HOSPITAL" tabelası
    const zg = (n - 1) * STOREY;
    const mx = (T.A[0] + T.B[0]) / 2, my = (T.A[1] + T.B[1]) / 2 + zg + 12;
    ctx.save(); ctx.translate(mx, my); ctx.transform(1, (T.B[1] - T.A[1]) / Math.max(1, T.B[0] - T.A[0]), 0, 1, 0, 0);
    ctx.font = '900 13px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (night > 0.05 && !VH.lod) { ctx.shadowColor = '#5ff0d8'; ctx.shadowBlur = 12 * night; }
    ctx.fillStyle = night > 0.05 ? '#d9fffa' : '#1f5f8b'; ctx.fillText('VITA HOSPITAL', 0, 0);
    ctx.restore();
    // Bulunulan katın döşeme alnı (kesit kenarı) ve tavanı açık kat plakası
    faceQuad(ctx, T.A, T.B, 0, 1, -2, 9, '#e3e9ed'); faceQuad(ctx, T.B, T.C, 0, 1, -2, 9, '#c9d3da');
    faceQuad(ctx, T.A, T.B, 0, 1, 7, 9, '#2f78b3'); faceQuad(ctx, T.B, T.C, 0, 1, 7, 9, '#245f8f');
    fillPoly(ctx, [T.A, T.B, T.C, T.D], '#cfd7dc');
  }
  const def0 = () => floors[fi].def;

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
    if (fi >= 1 && fi <= 3) {
      // Üst katlar: gökyüzü arka planı (bina yüksekliği hissi); gece koyulaşır
      const g = ctx.createLinearGradient(0, 0, 0, vh), nt = fx.night || 0;
      g.addColorStop(0, nt > 0.5 ? '#1c2c4a' : '#7fb8de'); g.addColorStop(1, nt > 0.5 ? '#3a4f6b' : '#d5ebf5');
      ctx.fillStyle = g;
    } else ctx.fillStyle = fi === 0 ? '#2f5b3a' : '#1d1612';
    ctx.fillRect(0, 0, vw, vh);

    ctx.save();
    ctx.translate(vw / 2, vh / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    const [l, t] = camera.toIso(0, 0, vw, vh);
    const [r, b] = camera.toIso(vw, vh, vw, vh);
    // Görüş alanı kırpması: ekran + %15 güvenlik payı (uzun nesneler için altta ek pay)
    const mx = Math.max(64, (r - l) * 0.15), my = Math.max(40, (b - t) * 0.15);
    const L = l - mx, R = r + mx, T = t - my, B = b + my + 150;
    perf.frame++;
    perf.scale = scaleBucket(camera.zoom);
    const lod = camera.zoom < 0.75;
    VH.lod = lod;

    if (fi > 0) drawStack(ctx, fx.night || 0);
    drawGround(ctx, l - 40, t - 40, r + 40, b + 40);
    for (const it of cache.flats) if (!staticFlat(it) && it.bb[2] > L && it.bb[0] < R && it.bb[3] > T && it.bb[1] < B) VH.art.draw(ctx, it);
    if (hover && inBounds(hover.x, hover.y)) drawCellOutline(ctx, hover.x, hover.y, 'rgba(46,196,182,0.9)');
    if (fx.ground) fx.ground(ctx);

    const list = extras && extras.length ? mergeSorted(cache.items, extras.slice()) : cache.items;
    let budget = 24;
    for (const it of list) {
      const x = it.sx !== undefined ? it.sx : it.cx;
      const y = it.sy !== undefined ? it.sy : it.cy;
      if (x !== undefined && (x < L || x > R || y < T || y > B)) continue;
      if (it.kind === 'wall') budget = drawWallCached(ctx, it, budget);
      else if (it.kind === 'obj') {
        // Uzak görünümde (LOD) masa üstü mikro eşyalar atlanır
        if (lod && it.o.z && !it.o.big) continue;
        budget = drawObj(ctx, it, budget);
      } else if (it.draw) it.draw(ctx);
    }
    trimSprites();

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
      // Oda etiketi: muayene odaları kapı tabelasıyla birebir aynı numarayı taşır (1 - / 2 - Muayene Odası);
      // diğer odalarda sıra numarası gösterilmez (çakışan numaralar kaldırıldı)
      const text = room.label || room.name;
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
    get campusStart() { return CAMPUS_START; },
    updateDoors,
    /** Performans: cihaz piksel oranı (önbellek ölçeği), önbellek sıfırlama ve durum. */
    set pixelRatio(v) { perf.ratio = v; },
    drawSprite,
    set cacheEnabled(v) { perf.enabled = !!v; },
    invalidate: () => perfReset(),
    get perfStats() { return { chunks: perf.chunks.size, sprites: perf.sprites.size, px: perf.px, scale: perf.scale }; },
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
