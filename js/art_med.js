// Vita Hospital — Yüksek detaylı tıbbi cihaz ve oda donanımı çizimleri (v6)
//
// Tümü js/art.js kitiyle kodla çizilir (harici görsel yok). "Düz kutu" görünümünü kaldırmak için
// cihazlar gölgeli, kademeli ve parça parça çizilir; bazı parçalar canlıdır:
//  - MR: silindirik gantri + tünel, içeri kayan hasta sedyesi, nabız gibi atan mavi LED halka
//  - Radyoloji kontrol kabini: mavi camlı kabin, çift monitör (MR kesitleri), oturan radyoloji uzmanı
//  - Ameliyathane: masa, çok kollu LED lamba ve ışık hüzmesi, anestezi cihazı, alet tepsisi, el yıkama
//  - Laboratuvar: dönen santrifüj, sonuç ekranlı analizör, mikroskop, cam kapaklı numune dolabı
//  - Eczane: ışıklı yeşil artı ve ECZANE tabelalı banko, barkod okuyucu, renkli ilaç rafları
//  - Başhekimlik: yönetici masası, döner koltuk, kitaplık, duvar sertifikaları; yemekhane benmari buharı
(function () {
  const VH = (window.VH = window.VH || {});
  const A = VH.art;
  const { C, shade, hash, screenDeco } = A;
  const R = (k, fn, flat) => A.register(k, fn, flat);
  const now = () => performance.now();
  const TUBES = ['#d62828', '#8e44ad', '#2f78b3', '#2f9e44', '#f2c94c', '#e9edf0'];

  // ================================================================ Radyoloji
  // MR: yerel çerçeve W=3 (gantri solda, sedye sağda), D=2.
  const mriState = { s: 0, last: 0 };
  function scanning() {
    const im = VH.floors && VH.floors.imaging;
    return !!(im && im.some && im.some((i) => i && (i.mod === 'mri' || i.mod === 'ultrasound' || i.mod === 'xray' || i.mod === 'ecg')));
  }
  R('mri', (k) => {
    const W = k.W, D = k.D, t = now();
    // Sedye konumu: tarama varken tünele girip çıkar (yumuşak salınım), yoksa dışarıda bekler
    const dt = Math.min(0.1, (t - (mriState.last || t)) / 1000); mriState.last = t;
    const want = scanning() ? 0.5 - 0.5 * Math.cos(t / 2600) : 0;
    mriState.s += (want - mriState.s) * Math.min(1, dt * 2);
    const s = mriState.s;
    k.shadow(0.05, 0.05, W - 0.05, D - 0.05, 0.24);
    // Gantri gövdesi: alt kaide + yuvarlatılmış kabuk (kademeli kutular)
    k.box(0.12, 0.12, 1.55, D - 0.12, 0, 8, '#c3ccd2');
    k.box(0.15, 0.18, 1.5, D - 0.18, 8, 58, '#f1f4f6', { deco: [
      { dir: '*', u0: 0.04, u1: 0.96, z0: 44, z1: 47, color: '#2ec4b6', raw: true },
      { dir: 'S', u0: 0.08, u1: 0.4, z0: 14, z1: 22, color: '#dfe5ea' },
    ] });
    k.box(0.22, 0.26, 1.42, D - 0.26, 58, 64, '#e6ebee');
    // Tünel ağzı (gantri ön yüzü, +u yönü): dış kapak, bore, iç ışık ve LED halka
    const pulse = scanning() ? 0.55 + 0.45 * Math.sin(t / 260) : 0.35;
    k.custom(1.52, D / 2, 30, (c, sx, sy) => {
      c.fillStyle = '#d9e0e5'; c.beginPath(); c.ellipse(sx, sy, 23, 27, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#aab6bd'; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = `rgba(80,180,255,${pulse})`; c.lineWidth = 2.6; c.beginPath(); c.ellipse(sx, sy, 18.5, 22, 0, 0, Math.PI * 2); c.stroke();
      const g = c.createRadialGradient(sx - 3, sy - 4, 2, sx, sy, 16);
      g.addColorStop(0, '#5d7a8c'); g.addColorStop(0.6, '#24323c'); g.addColorStop(1, '#141c22');
      c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy, 14, 17, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(200,235,255,0.35)'; c.beginPath(); c.ellipse(sx - 1, sy + 9, 9, 3, 0, 0, Math.PI * 2); c.fill();
    });
    // Hasta masası kaidesi ve kayan sedye (dış kısmı görünür)
    k.box(1.6, D / 2 - 0.3, W - 0.12, D / 2 + 0.3, 0, 15, '#cfd8dc', { deco: [{ dir: '*', u0: 0.05, u1: 0.95, z0: 4, z1: 6, color: '#9aa7b0', raw: true }] });
    const cu0 = Math.max(1.52, 1.6 - s * 1.0), cu1 = W - 0.05 - s * 1.0;
    if (cu1 > cu0 + 0.05) {
      k.box(cu0, D / 2 - 0.25, cu1, D / 2 + 0.25, 15, 19, '#e9eef1', { top: '#a8d4e6' });
      if (scanning()) {
        // Sedyede yatan hasta: ayaklar dışarıda kalır
        k.box(Math.max(cu0, cu1 - 0.9), D / 2 - 0.18, cu1 - 0.08, D / 2 + 0.18, 19, 23, '#7fb2d6', { top: '#9cc7e6', edge: false });
        if (cu1 - 0.9 > cu0 + 0.15) k.ball(cu1 - 1.0, D / 2, 23, 3.4, '#e8b48f');
      }
    }
    k.custom(W - 0.55, D - 0.08, 2, (c, sx, sy) => {
      c.fillStyle = '#f2c94c'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.fillText('⚠ MANYETİK ALAN · 3T', sx, sy);
    });
  });

  // Radyoloji kontrol kabini: mavi camlı kabin, çift monitörlü bilgisayar ve oturan uzman
  function brainSlice(c, x, y, w, h, t, k2) {
    c.fillStyle = '#05090c'; c.fillRect(x, y, w, h);
    c.fillStyle = '#8f9ea8'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w * 0.38, h * 0.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c7d3da'; c.beginPath(); c.ellipse(x + w / 2, y + h / 2, w * 0.3, h * 0.32, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#6f7d87'; c.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + w / 2 + (i - 1.5) * w * 0.12, y + h / 2, h * 0.12, 0, Math.PI); c.stroke(); }
    const sc = (t / 900 + k2) % 1;
    c.fillStyle = 'rgba(95,240,216,0.55)'; c.fillRect(x, y + sc * h, w, 0.8);
  }
  function seatedPerson(k, u, v, coat, facingBack) {
    k.box(u - 0.14, v - 0.12, u + 0.14, v + 0.12, 0, 15, '#3d4852');                // koltuk
    k.box(u - 0.15, v + (facingBack ? 0.08 : -0.16), u + 0.15, v + (facingBack ? 0.16 : -0.08), 15, 34, '#2b333b'); // sırtlık
    k.box(u - 0.12, v - 0.1, u + 0.12, v + 0.06, 15, 33, coat);                     // gövde
    k.box(u - 0.17, v - 0.16, u - 0.11, v + 0.02, 22, 31, coat);                    // kollar
    k.box(u + 0.11, v - 0.16, u + 0.17, v + 0.02, 22, 31, coat);
    k.ball(u, v - 0.02, 38, 5, '#e8b48f');                                           // baş
    k.ball(u, v + 0.02, 40, 5.2, '#3b2a1e');                                         // saç (arkadan)
  }
  R('control_booth', (k) => {
    const W = k.W, D = k.D, t = now();
    const glass = 'rgba(70,140,215,0.26)', frame = '#8796a0', H = 56;
    k.shadow(0, 0, W, D, 0.18);
    k.flat([[0, 0], [W, 0], [W, D], [0, D]], 0.5, '#d7e4ec');
    // arka cam paneller (önce çizilir)
    k.box(0, 0, W, 0.05, 0, H, glass, { top: frame, edge: false });
    k.box(0, 0, 0.05, D, 0, H, glass, { top: frame, edge: false });
    // iç mekân: çift monitörlü masa ve uzman
    k.box(0.25, 0.12, W - 0.25, 0.62, 0, 25, '#e9eef1', { deco: [{ dir: 'S', u0: 0, u1: 1, z0: 0, z1: 3, color: '#9aa7b0', raw: true }] });
    k.box(0.22, 0.1, W - 0.22, 0.66, 25, 27, '#cfd8dc');
    for (const [u, k2] of [[W / 2 - 0.42, 0], [W / 2 + 0.42, 0.5]]) {
      k.box(u - 0.04, 0.28, u + 0.04, 0.34, 27, 30, C.dark);
      k.box(u - 0.36, 0.26, u + 0.36, 0.31, 30, 50, '#1b2329');
      k.custom(u, 0.31, 40, (c, sx, sy) => brainSlice(c, sx - 14, sy - 8.5, 28, 17, t, k2));
    }
    k.box(W / 2 - 0.3, 0.45, W / 2 + 0.3, 0.55, 27, 28, '#2b333b');                  // klavye
    seatedPerson(k, W / 2, 1.05, '#f7f9fa', true);
    // ön cam paneller + dikmeler + çatı çerçevesi
    k.box(0, D - 0.05, W, D, 0, H, glass, { top: frame, edge: false });
    k.box(W - 0.05, 0, W, D, 0, H, glass, { top: frame, edge: false });
    for (const [u, v] of [[0, 0], [W, 0], [0, D], [W, D]]) k.box(u - 0.04, v - 0.04, u + 0.04, v + 0.04, 0, H + 2, frame);
    k.box(-0.03, D - 0.07, W + 0.03, D + 0.02, H - 4, H + 2, frame);
    k.box(W - 0.07, -0.03, W + 0.02, D + 0.03, H - 4, H + 2, frame);
    k.custom(W / 2, D, H - 1, (c, sx, sy) => {
      c.fillStyle = '#173447'; c.fillRect(sx - 22, sy - 6, 44, 10);
      c.fillStyle = '#e9fffb'; c.font = '800 6px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('MR KONTROL', sx, sy - 1);
    });
  });
  // Radyasyon uyarı levhası (sarı zemin, siyah yonca)
  R('radiation_sign', (k) => {
    k.pole(0.5, 0.2, 0, 34, 2, '#7e8d96');
    k.custom(0.5, 0.2, 44, (c, sx, sy) => {
      c.fillStyle = '#f2c94c'; c.beginPath(); c.moveTo(sx, sy - 11); c.lineTo(sx + 11, sy + 8); c.lineTo(sx - 11, sy + 8); c.closePath(); c.fill();
      c.strokeStyle = '#2b333b'; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = '#1b1b1b';
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 3); c.beginPath(); c.moveTo(sx, sy + 2); c.arc(sx, sy + 2, 6, a - 0.5, a + 0.5); c.closePath(); c.fill(); }
      c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(sx, sy + 2, 1.8, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(sx, sy + 2, 1.1, 0, Math.PI * 2); c.fill();
    });
  });

  // ================================================================ Ameliyathane
  R('or_table', (k) => {
    k.shadow(0.05, 0.1, 0.95, 0.9, 0.22);
    k.box(0.25, 0.3, 0.75, 0.7, 0, 4, '#9aa7b0');                                   // taban plakası
    k.cyl(0.5, 0.5, 5, 4, 20, '#c9d1d6');                                             // hidrolik kolon
    k.box(0.18, 0.05, 0.82, 0.95, 20, 23, '#b8c4cb');                                 // şasi
    // segmentli tabla: baş, gövde, bacak (koyu yeşil-mavi ped)
    k.box(0.2, 0.06, 0.8, 0.3, 23, 27, '#2f6f6a', { top: '#3b8a83' });
    k.box(0.2, 0.32, 0.8, 0.68, 23, 27, '#2f6f6a', { top: '#3b8a83' });
    k.box(0.2, 0.7, 0.8, 0.94, 23, 27, '#2f6f6a', { top: '#3b8a83' });
    // steril örtü
    k.box(0.16, 0.36, 0.84, 0.64, 27, 28, '#4fa38a', { top: '#5fb79b', edge: false });
    // kol tahtaları
    k.box(-0.08, 0.42, 0.2, 0.5, 24, 26, '#2f6f6a'); k.box(0.8, 0.42, 1.08, 0.5, 24, 26, '#2f6f6a');
    k.box(0.4, 0.0, 0.6, 0.06, 27, 34, '#c9d1d6');                                   // anestezi perdesi çubuğu
  });
  R('surgical_lamp', (k) => {
    const t = now();
    // Tavandan sarkan merkez direk + göbek
    k.pole(0.5, 0.5, 78, 112, 4, '#d9e0e5');
    k.box(0.42, 0.42, 0.58, 0.58, 76, 80, '#b8c4cb');
    const heads = [[0.12, 0.3, 64], [0.88, 0.32, 66], [0.5, 0.95, 62]];
    for (const [u, v, z] of heads) k.line(0.5, 0.5, 78, u, v, z + 6, 3, '#d9e0e5');
    for (const [u, v, z] of heads) {
      k.custom(u, v, z, (c, sx, sy) => {
        // ışık hüzmesi (masaya doğru)
        const g0 = c.createLinearGradient(sx, sy, sx, sy + 58);
        g0.addColorStop(0, 'rgba(255,255,235,0.22)'); g0.addColorStop(1, 'rgba(255,255,235,0)');
        c.fillStyle = g0; c.beginPath(); c.moveTo(sx - 12, sy + 2); c.lineTo(sx - 30, sy + 58); c.lineTo(sx + 30, sy + 58); c.lineTo(sx + 12, sy + 2); c.closePath(); c.fill();
        // kubbe ve LED dizisi
        c.fillStyle = '#f4f7f8'; c.beginPath(); c.ellipse(sx, sy - 2, 15, 7.5, 0, Math.PI, 0); c.lineTo(sx + 15, sy); c.ellipse(sx, sy, 15, 7.5, 0, 0, Math.PI); c.closePath(); c.fill();
        c.strokeStyle = '#9aa7b0'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#e8eef0'; c.beginPath(); c.ellipse(sx, sy + 1, 12.5, 6, 0, 0, Math.PI * 2); c.fill();
        for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2 + r * 0.4, rr = r ? 4 : 8.5;
          c.fillStyle = `rgba(255,255,${210 + 40 * Math.sin(t / 300 + i)},1)`;
          c.beginPath(); c.arc(sx + Math.cos(a) * rr, sy + 1 + Math.sin(a) * rr * 0.48, 1.3, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#2ec4b6'; c.beginPath(); c.arc(sx, sy + 1, 1.8, 0, Math.PI * 2); c.fill();
      });
    }
  });
  R('anesthesia', (k) => {
    const t = now();
    k.shadow(0.05, 0.1, 0.95, 0.95, 0.2);
    // gaz tüpleri (arkada)
    k.cyl(0.25, 0.18, 4, 0, 40, '#2f78b3'); k.disc(0.25, 0.18, 40, 3, '#e9edf0');
    k.cyl(0.42, 0.16, 4, 0, 40, '#eef1f3'); k.disc(0.42, 0.16, 40, 3, '#2f9e44');
    // çekmeceli gövde
    k.box(0.15, 0.3, 0.85, 0.9, 0, 34, '#e6ebee', { deco: [
      { dir: 'S', u0: 0.08, u1: 0.92, z0: 4, z1: 12, color: '#d3dbe0' }, { dir: 'S', u0: 0.08, u1: 0.92, z0: 14, z1: 22, color: '#d3dbe0' },
      { dir: 'S', u0: 0.42, u1: 0.58, z0: 8, z1: 9, color: '#7e8d96', raw: true }, { dir: 'S', u0: 0.42, u1: 0.58, z0: 18, z1: 19, color: '#7e8d96', raw: true },
      { dir: 'S', u0: 0.08, u1: 0.92, z0: 25, z1: 32, color: '#2b333b', raw: true },
    ] });
    for (let i = 0; i < 4; i++) k.disc(0.2 + i * 0.2, 0.92, 0, 3, '#2b333b');
    // vaporizatörler (sarı/mor) ve körük
    k.box(0.18, 0.32, 0.32, 0.46, 34, 46, '#f2c94c'); k.box(0.34, 0.32, 0.48, 0.46, 34, 46, '#8e44ad');
    const bel = 6 + 4 * Math.sin(t / 700);
    k.custom(0.68, 0.45, 34, (c, sx, sy) => {
      c.fillStyle = 'rgba(200,230,245,0.55)'; c.fillRect(sx - 6, sy - 22, 12, 22);
      c.strokeStyle = '#2f78b3'; c.lineWidth = 1;
      for (let i = 0; i < 4; i++) { const yy = sy - 3 - i * bel * 0.9; c.beginPath(); c.moveTo(sx - 5, yy); c.lineTo(sx + 5, yy); c.stroke(); }
      c.strokeStyle = '#9aa7b0'; c.strokeRect(sx - 6, sy - 22, 12, 22);
    });
    // kollu monitör: dalga formları
    k.pole(0.8, 0.6, 34, 58, 2, '#9aa7b0');
    k.box(0.55, 0.55, 1.0, 0.62, 56, 74, '#1b2329');
    k.custom(0.78, 0.62, 65, (c, sx, sy) => {
      c.fillStyle = '#071216'; c.fillRect(sx - 11, sy - 7, 22, 14);
      A.ecgLine(c, sx, sy - 3, 10, '#66ff99'); A.ecgLine(c, sx, sy + 3, 10, '#5ab0ff');
      c.fillStyle = '#ffd166'; c.font = '700 4px system-ui'; c.textAlign = 'right'; c.fillText('SpO₂ 98', sx + 10, sy - 4.5);
    });
    k.line(0.6, 0.4, 40, 0.98, 0.1, 28, 1.6, '#5aa0c8');                              // solunum hortumu
  });
  // Mayo alet tepsisi: paslanmaz çelik tepsi ve aletler
  R('mayo_stand', (k) => {
    k.disc(0.5, 0.5, 0, 9, '#7e8d96');
    k.pole(0.5, 0.5, 0, 26, 2.5, '#b8c4cb');
    k.box(0.12, 0.25, 0.88, 0.75, 26, 28, '#d9e0e5', { top: '#e8eef1' });
    k.custom(0.5, 0.5, 28.5, (c, sx, sy) => {
      c.strokeStyle = '#6f7d87'; c.lineWidth = 1.1; c.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const x = sx - 9 + i * 4.5; c.beginPath(); c.moveTo(x - 2, sy - 2 + i * 0.6); c.lineTo(x + 3, sy + 2 + i * 0.6); c.stroke(); }
      c.fillStyle = '#2f9e44'; c.fillRect(sx + 6, sy - 3, 5, 3);
    });
  });
  R('scrub_sink', (k) => {
    k.shadow(0.05, 0.05, 0.95, 0.7);
    k.box(0.08, 0.05, 0.92, 0.12, 0, 60, '#e3e9ed', { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 40, z1: 56, color: 'rgba(170,215,238,0.7)', raw: true }] }); // sıçrama paneli + ayna
    k.box(0.1, 0.12, 0.9, 0.62, 0, 24, '#c9d1d6', { deco: [{ dir: 'S', u0: 0.3, u1: 0.7, z0: 4, z1: 12, color: '#9aa7b0' }] }); // diz paneli
    k.box(0.08, 0.1, 0.92, 0.66, 24, 30, '#e6ebee', { top: '#b8c4cb' });
    for (const u of [0.32, 0.68]) { k.pole(u, 0.14, 30, 40, 2, '#9aa7b0'); k.line(u, 0.14, 40, u, 0.32, 38, 2, '#9aa7b0'); }
    k.box(0.44, 0.08, 0.56, 0.14, 34, 42, '#2ec4b6');                                 // antiseptik dispenseri
    k.custom(0.5, 0.1, 58, (c, sx, sy) => { c.fillStyle = '#103b47'; c.fillRect(sx - 8, sy - 4, 16, 7); c.fillStyle = '#5ff0d8'; c.font = '700 5px system-ui'; c.textAlign = 'center'; c.fillText('2:00', sx, sy + 1); });
  });

  // ================================================================ Laboratuvar
  const labBusy = () => !!(VH.entities && VH.entities.patients && VH.entities.patients.some((p) => p.state === 'lab'));
  R('centrifuge', (k) => {
    const t = now(), spin = labBusy() ? t / 60 : t / 900;
    k.shadow(0.08, 0.1, 0.92, 0.9);
    k.box(0.1, 0.12, 0.9, 0.88, 0, 22, '#e9eef1', { deco: [
      { dir: 'S', u0: 0.1, u1: 0.45, z0: 9, z1: 17, color: '#103b47', raw: true },
      { dir: 'S', u0: 0.6, u1: 0.68, z0: 12, z1: 15, color: Math.floor(t / 400) % 2 ? '#46c46a' : '#1e5a2e', raw: true },
      { dir: 'S', u0: 0.72, u1: 0.8, z0: 12, z1: 15, color: '#f2a93b', raw: true },
    ] });
    k.custom(0.28, 0.88, 13, (c, sx, sy) => { c.fillStyle = '#5ff0d8'; c.font = '700 4.5px system-ui'; c.textAlign = 'center'; c.fillText('4000 rpm', sx, sy + 1); });
    k.cyl(0.5, 0.5, 13, 22, 25, '#d3dbe0');
    k.custom(0.5, 0.5, 25.5, (c, sx, sy) => {
      c.fillStyle = 'rgba(160,210,235,0.45)'; c.beginPath(); c.ellipse(sx, sy, 12, 6, 0, 0, Math.PI * 2); c.fill();
      for (let i = 0; i < 6; i++) {
        const a = spin + i * Math.PI / 3;
        c.fillStyle = TUBES[i]; c.beginPath(); c.ellipse(sx + Math.cos(a) * 7, sy + Math.sin(a) * 3.4, 2, 1.2, 0, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#9aa7b0'; c.lineWidth = 1; c.beginPath(); c.ellipse(sx, sy, 12, 6, 0, 0, Math.PI * 2); c.stroke();
    });
    // yanındaki tüp rafı
    for (let i = 0; i < 5; i++) k.box(0.14 + i * 0.07, 0.16, 0.18 + i * 0.07, 0.22, 22, 30, TUBES[i], { edge: false });
  });
  R('analyzer', (k) => {
    const W = k.W, t = now();
    k.shadow(0.05, 0.1, W - 0.05, 0.95);
    k.box(0.06, 0.1, W - 0.06, 0.9, 0, 30, '#eef2f4', { deco: [
      { dir: 'S', u0: 0.05, u1: 0.95, z0: 0, z1: 4, color: '#9aa7b0', raw: true },
      { dir: 'S', u0: 0.06, u1: 0.55, z0: 10, z1: 26, color: '#0b1a22', raw: true },
    ] });
    k.box(0.1, 0.12, W - 0.1, 0.6, 30, 44, '#e3e9ed', { deco: [{ dir: 'S', u0: 0.05, u1: 0.95, z0: 38, z1: 40, color: C.teal, raw: true }] });
    // dijital sonuç ekranı: değerler ve çubuklar
    k.custom(W * 0.3, 0.9, 18, (c, sx, sy) => {
      const vals = ['WBC 7.2', 'Hb 13.4', 'PLT 245', 'CRP 4.1'];
      c.font = '700 4.2px system-ui'; c.textAlign = 'left';
      vals.forEach((v, i) => {
        c.fillStyle = i === 3 && Math.floor(t / 700) % 2 ? '#ffd166' : '#5ff0d8';
        c.fillText(v, sx - 13, sy - 5 + i * 4.2);
        c.fillStyle = 'rgba(95,240,216,0.5)'; c.fillRect(sx + 4, sy - 7 + i * 4.2, 3 + 6 * hash(i, Math.floor(t / 1500)), 2);
      });
    });
    // LED durum dizisi
    for (let i = 0; i < 4; i++) {
      const on = Math.floor(t / 300 + i * 1.7) % 3 !== 0;
      k.box(0.62 + i * 0.07 * W / 2, 0.88, 0.66 + i * 0.07 * W / 2, 0.9, 20, 23, on ? ['#46c46a', '#46c46a', '#f2a93b', '#5ab0ff'][i] : '#2b333b', { edge: false });
    }
    // numune konveyörü: renkli kapaklı tüpler
    k.box(0.15, 0.62, W - 0.15, 0.86, 30, 32, '#c9d1d6');
    const n = Math.round(W * 6), off = (t / 2400) % 1;
    for (let i = 0; i < n; i++) {
      const u = 0.22 + ((i + off) / n) * (W - 0.44);
      k.box(u - 0.03, 0.7, u + 0.03, 0.78, 32, 40, 'rgba(230,240,245,0.9)', { top: TUBES[i % TUBES.length], edge: false });
    }
  });
  R('microscope', (k) => {
    k.shadow(0.05, 0.1, 0.95, 0.9);
    // laboratuvar tezgâhı
    k.box(0.05, 0.12, 0.95, 0.88, 0, 26, '#e3e9ed', { deco: [{ dir: 'S', u0: 0.05, u1: 0.95, z0: 4, z1: 22, color: '#d3dbe0' }] });
    k.box(0.02, 0.1, 0.98, 0.9, 26, 28, '#f4f7f8');
    // mikroskop: taban, kol, tabla, revolver ve binoküler okülerler
    k.box(0.32, 0.38, 0.68, 0.7, 28, 31, '#2b333b');
    k.box(0.42, 0.6, 0.56, 0.7, 31, 48, '#2b333b');
    k.box(0.3, 0.36, 0.66, 0.58, 37, 39, '#3d4852');
    k.disc(0.47, 0.47, 31.5, 3, '#fff6c8');
    k.cyl(0.48, 0.5, 3, 40, 45, '#9aa7b0');
    k.box(0.4, 0.46, 0.58, 0.62, 47, 52, '#e9eef1');
    k.line(0.45, 0.52, 52, 0.42, 0.42, 58, 2.4, '#2b333b'); k.line(0.53, 0.52, 52, 0.56, 0.42, 58, 2.4, '#2b333b');
    // lam kutusu ve şişeler
    k.box(0.7, 0.2, 0.9, 0.36, 28, 31, '#2f78b3');
    k.cyl(0.18, 0.72, 2.5, 28, 36, '#e07a5f'); k.cyl(0.2, 0.25, 2.5, 28, 34, '#5ab0ff');
  });
  R('sample_fridge', (k) => {
    const t = now();
    k.shadow(0.05, 0.05, 0.95, 0.95, 0.2);
    k.box(0.08, 0.08, 0.92, 0.9, 0, 68, '#eef2f4', { deco: [
      { dir: 'S', u0: 0.08, u1: 0.92, z0: 6, z1: 60, color: 'rgba(120,190,235,0.55)', raw: true },
      { dir: 'S', u0: 0.84, u1: 0.88, z0: 22, z1: 44, color: '#9aa7b0', raw: true },
      { dir: 'S', u0: 0.3, u1: 0.7, z0: 62, z1: 67, color: '#103b47', raw: true },
    ] });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) {
      k.box(0.16 + i * 0.13, 0.84, 0.22 + i * 0.13, 0.88, 10 + r * 13, 17 + r * 13, TUBES[(i + r) % TUBES.length], { edge: false });
    }
    for (let r = 0; r < 4; r++) k.box(0.1, 0.84, 0.9, 0.9, 9 + r * 13, 10 + r * 13, 'rgba(255,255,255,0.6)', { edge: false });
    k.custom(0.5, 0.9, 64.5, (c, sx, sy) => { c.fillStyle = Math.floor(t / 1200) % 2 ? '#5ff0d8' : '#46c46a'; c.font = '700 4.5px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+4°C', sx, sy); });
  });

  // ================================================================ Eczane
  R('pharmacy_counter', (k) => {
    const W = k.W, t = now();
    k.shadow(0.02, 0.2, W - 0.02, 0.95);
    k.box(0.04, 0.3, W - 0.04, 0.92, 0, 26, '#f4f7f8', { deco: [
      { dir: 'S', u0: 0, u1: 1, z0: 0, z1: 4, color: '#6f7d87', raw: true },
      { dir: 'S', u0: 0.03, u1: 0.97, z0: 9, z1: 14, color: '#2f9e44', raw: true },
      { dir: 'S', u0: 0.03, u1: 0.97, z0: 15, z1: 16, color: '#7dff9a', raw: true },
    ] });
    k.box(0, 0.26, W, 0.96, 26, 29, '#e3e9ed', { top: '#f9fbfc' });
    // barkod okuyucu (kırmızı lazer), fiş yazıcı ve ilaç kutuları
    k.box(W - 0.55, 0.45, W - 0.35, 0.6, 29, 31, '#2b333b');
    k.line(W - 0.45, 0.5, 31, W - 0.45, 0.55, 40, 3, '#2b333b');
    k.custom(W - 0.45, 0.62, 30, (c, sx, sy) => {
      if (Math.floor(t / 500) % 3) { c.strokeStyle = 'rgba(255,40,40,0.85)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(sx - 5, sy); c.lineTo(sx + 5, sy + 1); c.stroke(); }
    });
    k.box(0.3, 0.4, 0.62, 0.62, 29, 34, '#d9dee2', { deco: [{ dir: 'S', u0: 0.2, u1: 0.8, z0: 32, z1: 33, color: '#2b333b', raw: true }] });
    k.box(0.7, 0.45, 0.88, 0.6, 29, 33, '#ef476f'); k.box(0.9, 0.45, 1.06, 0.6, 29, 34, '#5ab0ff');
    // ışıklı yeşil artı ve ECZANE tabelası (askılı)
    const glow = 0.75 + 0.25 * Math.sin(t / 500);
    k.line(W / 2 - 0.5, 0.5, 58, W / 2 - 0.5, 0.5, 74, 1, '#7e8d96'); k.line(W / 2 + 0.5, 0.5, 58, W / 2 + 0.5, 0.5, 74, 1, '#7e8d96');
    k.custom(W / 2, 0.5, 52, (c, sx, sy) => {
      c.fillStyle = '#0f3d24'; c.fillRect(sx - 30, sy - 8, 60, 14);
      c.strokeStyle = '#7dff9a'; c.lineWidth = 1; c.strokeRect(sx - 30, sy - 8, 60, 14);
      c.save(); if (!VH.lod) { c.shadowColor = '#46ff7a'; c.shadowBlur = 8 * glow; }
      c.fillStyle = `rgba(90,255,130,${glow})`; c.fillRect(sx - 26, sy - 3.5, 9, 3); c.fillRect(sx - 23, sy - 6.5, 3, 9);
      c.fillStyle = '#eafff0'; c.font = '900 8px system-ui'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('ECZANE', sx - 13, sy - 1);
      c.restore();
    });
  });
  R('pharmacy_shelf', (k) => {
    const W = k.W;
    k.shadow(0.02, 0.05, W - 0.02, 0.6, 0.2);
    k.box(0.02, 0.05, W - 0.02, 0.55, 0, 72, '#e9eef1', { deco: [{ dir: 'S', u0: 0, u1: 1, z0: 68, z1: 72, color: '#2f9e44', raw: true }] });
    const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#f78c6b', '#8e7cc3', '#2f9e44', '#e9edf0', '#d62828'];
    for (let r = 0; r < 5; r++) {
      const z = 6 + r * 12.5;
      k.box(0.03, 0.5, W - 0.03, 0.56, z - 1.5, z, '#b8c4cb', { edge: false });
      const n = Math.round(W * 6);
      for (let i = 0; i < n; i++) {
        const h = hash(k.o.x * 13 + i, k.o.y * 7 + r);
        const u = 0.06 + i * (W - 0.12) / n, w = (W - 0.12) / n * (0.6 + h * 0.3);
        k.box(u, 0.5, u + w, 0.55, z, z + 6 + h * 4, cols[Math.floor(h * cols.length)], { edge: false });
      }
    }
  });

  // ================================================================ Başhekimlik
  R('exec_desk', (k) => {
    const W = k.W, t = now();
    k.shadow(0.02, 0.05, W - 0.02, 0.95, 0.2);
    k.box(0.04, 0.15, W - 0.04, 0.9, 0, 27, '#6b4a33', { deco: [
      { dir: 'S', u0: 0.04, u1: 0.96, z0: 3, z1: 24, color: '#7c573c' },
      { dir: 'S', u0: 0.08, u1: 0.3, z0: 16, z1: 22, color: '#5c3f2b' }, { dir: 'S', u0: 0.7, u1: 0.92, z0: 16, z1: 22, color: '#5c3f2b' },
    ] });
    k.box(0, 0.1, W, 0.95, 27, 30, '#8a6446', { top: '#9b7350' });
    k.box(0.15, 0.45, W - 0.15, 0.85, 30, 30.6, '#2e4a3a', { edge: false });          // deri sümen
    // geniş monitör + klavye + fare
    const mu = W / 2;
    k.box(mu - 0.08, 0.25, mu + 0.08, 0.33, 30, 34, C.dark);
    k.box(mu - 0.42, 0.24, mu + 0.42, 0.29, 34, 54, '#16191d');
    k.custom(mu, 0.29, 44, (c, sx, sy) => {
      const g = c.createLinearGradient(sx - 20, sy - 9, sx + 20, sy + 9); g.addColorStop(0, '#1d6f86'); g.addColorStop(1, '#2ec4b6');
      c.fillStyle = g; c.fillRect(sx - 20, sy - 9, 40, 17);
      c.fillStyle = 'rgba(255,255,255,0.85)'; for (let i = 0; i < 4; i++) c.fillRect(sx - 16 + i * 9, sy - 5, 6, 5);
      c.fillStyle = '#0d2530'; c.fillRect(sx - 20, sy + 6, 40, 2.2);
      c.fillStyle = '#ffd166'; c.font = '700 3.6px system-ui'; c.textAlign = 'right'; c.fillText(new Date(Date.now()).toTimeString().slice(0, 5), sx + 19, sy + 7.6);
    });
    k.box(mu - 0.3, 0.55, mu + 0.3, 0.66, 30, 31, '#2b333b');
    k.box(mu + 0.38, 0.58, mu + 0.46, 0.66, 30, 31.5, '#2b333b');
    // masa lambası, kalemlik, dosyalar, isimlik
    k.pole(0.25, 0.3, 30, 46, 1.6, '#c9a25a'); k.box(0.18, 0.28, 0.36, 0.38, 44, 48, '#2f6b4f');
    k.cyl(W - 0.3, 0.35, 3, 30, 36, '#3d4852');
    k.box(W - 0.55, 0.55, W - 0.25, 0.8, 30, 33, '#f2e8cf'); k.box(W - 0.53, 0.57, W - 0.27, 0.78, 33, 34, '#30638e');
    k.box(0.2, 0.8, 0.6, 0.86, 30, 33, '#c9a25a');
    void t;
  });
  R('swivel_chair', (k) => {
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.line(0.5, 0.5, 2, 0.5 + Math.cos(a) * 0.32, 0.5 + Math.sin(a) * 0.32, 1, 2.2, '#2b333b'); k.disc(0.5 + Math.cos(a) * 0.32, 0.5 + Math.sin(a) * 0.32, 0, 1.8, '#1b1b1b'); }
    k.pole(0.5, 0.5, 2, 15, 3, '#7e8d96');
    k.box(0.22, 0.24, 0.78, 0.76, 15, 20, '#2b2f36', { top: '#3a3f47' });
    k.box(0.18, 0.3, 0.26, 0.7, 20, 26, '#2b2f36'); k.box(0.74, 0.3, 0.82, 0.7, 20, 26, '#2b2f36');
    k.box(0.24, 0.74, 0.76, 0.84, 18, 46, '#2b2f36', { deco: [{ dir: '*', u0: 0.1, u1: 0.9, z0: 26, z1: 42, color: '#353a42' }] });
  });
  R('bookshelf', (k) => {
    const W = k.W;
    k.shadow(0.02, 0.05, W - 0.02, 0.55, 0.2);
    k.box(0.02, 0.05, W - 0.02, 0.5, 0, 70, '#7c573c', { top: '#8a6446' });
    const cols = ['#8c2f39', '#30638e', '#2f6b4f', '#c9a25a', '#3d405b', '#b5651d', '#5b4a91'];
    for (let r = 0; r < 4; r++) {
      const z = 5 + r * 16;
      k.box(0.04, 0.45, W - 0.04, 0.52, z - 2, z, '#5c3f2b', { edge: false });
      const n = Math.round(W * 9);
      for (let i = 0; i < n; i++) {
        const h = hash(k.o.x * 5 + i, k.o.y + r * 3);
        if (h < 0.08) continue;
        const u = 0.06 + i * (W - 0.12) / n;
        k.box(u, 0.46, u + (W - 0.12) / n * 0.85, 0.5, z, z + 9 + h * 4, cols[Math.floor(h * cols.length)], { edge: false });
      }
    }
  });
  R('certificates', (k) => {
    const W = k.W;
    for (let i = 0; i < Math.max(2, Math.round(W * 1.5)); i++) {
      const u = 0.25 + i * (W - 0.5) / Math.max(1, Math.round(W * 1.5) - 1);
      const z = 36 + (i % 2) * 6;
      k.box(u - 0.17, 0.02, u + 0.17, 0.05, z, z + 14, '#c9a25a', { deco: [{ dir: 'S', u0: 0.12, u1: 0.88, z0: z + 2, z1: z + 12, color: '#f6f1e3', raw: true }, { dir: 'S', u0: 0.4, u1: 0.6, z0: z + 3, z1: z + 5, color: '#d62828', raw: true }] , edge: false });
    }
  });
  R('wall_clock', (k) => {
    k.custom(0.5, 0.05, 50, (c, sx, sy) => {
      const d = new Date();
      c.fillStyle = '#f9fbfc'; c.beginPath(); c.arc(sx, sy, 6.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#2b333b'; c.lineWidth = 1.2; c.stroke();
      const ha = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2 - Math.PI / 2, ma = d.getMinutes() / 60 * Math.PI * 2 - Math.PI / 2;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ha) * 3.4, sy + Math.sin(ha) * 3.4); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ma) * 5, sy + Math.sin(ma) * 5); c.stroke();
    });
  });

  // ================================================================ Temizlik: paspas arabası
  R('mop_cart', (k) => {
    const t = now();
    if (k.o.wet) {
      // ıslak zemin parlaması + sarı uyarı tabelası
      k.flat([[-0.3, 0.1], [0.9, -0.1], [1.2, 0.9], [0, 1.1]], 0.2, `rgba(170,215,240,${0.28 + 0.08 * Math.sin(t / 300)})`);
      k.custom(0.95, 0.15, 0, (c, sx, sy) => {
        c.fillStyle = '#f2c94c'; c.beginPath(); c.moveTo(sx - 5, sy); c.lineTo(sx, sy - 17); c.lineTo(sx + 5, sy); c.closePath(); c.fill();
        c.strokeStyle = '#8a6d12'; c.lineWidth = 0.8; c.stroke();
        c.fillStyle = '#2b333b'; c.font = '900 6px system-ui'; c.textAlign = 'center'; c.fillText('!', sx, sy - 5);
      });
    }
    k.shadow(0.2, 0.25, 0.8, 0.75, 0.2);
    for (const [u, v] of [[0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]]) k.disc(u, v, 0, 2, '#1b1b1b');
    k.box(0.22, 0.28, 0.78, 0.72, 2, 5, '#f2c94c');                                   // sarı şasi
    k.box(0.26, 0.32, 0.56, 0.68, 5, 14, '#2f78b3', { top: '#7fb6d8' });               // kova (su)
    k.box(0.32, 0.38, 0.5, 0.62, 14, 17, '#9aa7b0');                                   // sıkma presi
    k.box(0.6, 0.34, 0.76, 0.66, 5, 18, '#3d4852', { top: '#2b333b' });               // çöp torbası
    k.line(0.42, 0.5, 14, 0.36, 0.58, 40, 1.4, '#c39a6b');                             // paspas sapı
  });

  // ================================================================ Yemekhane: benmari buharı
  const baseFood = A.get('food_counter');
  if (baseFood) R('food_counter', (k) => {
    baseFood(k);
    const W = k.W, t = now();
    for (let i = 0; i < W * 2; i++) {
      const u = 0.25 + i * 0.5;
      k.custom(u, 0.48, 27, (c, sx, sy) => {
        for (let j = 0; j < 3; j++) {
          const ph = ((t / 1600) + j / 3 + i * 0.17) % 1;
          c.fillStyle = `rgba(255,255,255,${0.32 * (1 - ph)})`;
          c.beginPath(); c.arc(sx + Math.sin(ph * 6 + i) * 2.5, sy - ph * 18, 2 + ph * 3, 0, Math.PI * 2); c.fill();
        }
      });
    }
  });
})();

// ================================================================ v6: kampüs — süs havuzu ve gece tabelası
(function () {
  const VH = window.VH, A = VH.art;
  const R = (k, fn, flat) => A.register(k, fn, flat);
  const night = () => (VH.hospital ? VH.hospital.night : 0);
  // Dalga animasyonlu süs havuzu: taş kenar, su yüzeyinde hareketli dalga çizgileri, nilüferler ve balıklar
  R('pond', (k) => {
    const W = k.W, D = k.D, t = performance.now() / 1000;
    k.box(0, 0, W, D, 0, 5, '#b9b2a4', { top: '#d8d2c6' });
    k.flat([[0.18, 0.18], [W - 0.18, 0.18], [W - 0.18, D - 0.18], [0.18, D - 0.18]], 5.2, '#2f7fa8');
    k.custom(W / 2, D / 2, 5.4, (c, sx, sy) => {
      const rw = (W - 0.4) * 32 * 0.5, rh = (D - 0.4) * 16 * 0.5;
      c.save();
      c.beginPath(); c.ellipse(sx, sy, rw * 1.05, rh * 1.6, 0, 0, Math.PI * 2); c.clip();
      // dalgalar
      c.strokeStyle = 'rgba(210,240,255,0.55)'; c.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        const yy = sy - rh + i * (rh * 2 / 6);
        c.beginPath();
        for (let x = -rw; x <= rw; x += 4) { const y = yy + Math.sin(x / 9 + t * 2 + i) * 1.6; x === -rw ? c.moveTo(sx + x, y) : c.lineTo(sx + x, y); }
        c.stroke();
      }
      // balıklar
      for (let f = 0; f < 3; f++) {
        const a = t * (0.5 + f * 0.13) + f * 2.1;
        const fx = sx + Math.cos(a) * rw * 0.55, fy = sy + Math.sin(a) * rh * 0.55;
        c.fillStyle = f === 1 ? '#f4f1ea' : '#f08a24';
        c.beginPath(); c.ellipse(fx, fy, 3.2, 1.6, a + Math.PI / 2, 0, Math.PI * 2); c.fill();
      }
      // nilüfer yaprakları
      for (const [u, v] of [[-0.55, -0.3], [0.5, 0.35], [0.2, -0.55]]) {
        c.fillStyle = '#4f9a4a'; c.beginPath(); c.ellipse(sx + u * rw, sy + v * rh, 5, 2.6, 0, 0.3, Math.PI * 2 - 0.3); c.lineTo(sx + u * rw, sy + v * rh); c.fill();
      }
      c.fillStyle = '#ffb3c6'; c.beginPath(); c.arc(sx + 0.5 * rw + 1, sy + 0.35 * rh - 1, 1.6, 0, Math.PI * 2); c.fill();
      // gece: su yüzeyinde ışık yansıması
      const n = night();
      if (n > 0.05) { c.fillStyle = `rgba(255,214,140,${0.18 * n})`; c.beginPath(); c.ellipse(sx + rw * 0.3, sy, 10, 3, 0, 0, Math.PI * 2); c.fill(); }
      c.restore();
    });
  });
  // Giriş tabelası geceleri ışıklı: turkuaz hale ve parlayan yazı
  const baseSign = A.get('sign_hospital');
  if (baseSign) R('sign_hospital', (k) => {
    baseSign(k);
    const n = night();
    if (n < 0.05) return;
    k.custom(k.W / 2, 0.55, 22, (c, sx, sy) => {
      c.save();
      c.globalCompositeOperation = 'lighter';
      const g = c.createRadialGradient(sx, sy - 3, 4, sx, sy - 3, 46);
      g.addColorStop(0, `rgba(95,240,216,${0.45 * n})`); g.addColorStop(1, 'rgba(95,240,216,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(sx, sy - 3, 46, 26, 0, 0, Math.PI * 2); c.fill();
      if (!VH.lod) { c.shadowColor = '#5ff0d8'; c.shadowBlur = 10 * n; }
      c.fillStyle = '#e9fffb'; c.font = '800 9px system-ui,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('✚ VITA HOSPITAL', sx, sy - 3);
      c.restore();
    });
  });
})();

// ================================================================ v7: inşaat bariyeri, servis yatağı, EKG
(function () {
  const VH = window.VH, A = VH.art;
  const R = (k, fn, flat) => A.register(k, fn, flat);
  const now = () => performance.now();
  // Kilitli katın asansör çıkışındaki sarı-siyah şeritli "İnşaat Alanı / Kapalı Kat" bariyeri (yerel: W=1, D=2)
  R('construction_barrier', (k) => {
    const D = k.D;
    k.shadow(0.3, 0.05, 0.7, D - 0.05, 0.18);
    for (const v of [0.15, D - 0.15]) { k.box(0.38, v - 0.06, 0.62, v + 0.06, 0, 30, '#e0b13a'); k.box(0.3, v - 0.12, 0.7, v + 0.12, 0, 3, '#2b333b'); }
    const stripes = [];
    for (let i = 0; i < 10; i++) stripes.push({ dir: '*', u0: i / 10, u1: (i + 0.5) / 10, z0: 20, z1: 28, color: '#1b1b1b', raw: true });
    k.box(0.44, 0.05, 0.56, D - 0.05, 20, 28, '#f2c94c', { deco: stripes });
    k.box(0.44, 0.05, 0.56, D - 0.05, 8, 12, '#f2c94c', { deco: stripes.map((s) => Object.assign({}, s, { z0: 8, z1: 12 })) });
    // uyarı lambaları ve kilit levhası
    const on = Math.floor(now() / 450) % 2;
    for (const v of [0.15, D - 0.15]) k.ball(0.5, v, 33, 2.6, on ? '#ff9f1c' : '#7a4a10');
    k.custom(0.5, D / 2, 40, (c, sx, sy) => {
      c.fillStyle = 'rgba(20,24,30,0.92)'; c.fillRect(sx - 30, sy - 9, 60, 17);
      c.strokeStyle = '#f2c94c'; c.lineWidth = 1.2; c.strokeRect(sx - 30, sy - 9, 60, 17);
      c.fillStyle = '#f2c94c'; c.font = '800 6.5px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText("🔒 İNŞAAT ALANI", sx, sy - 3); c.fillStyle = "#e9edf0"; c.font = "700 5px system-ui"; c.fillText("KAPALI KAT", sx, sy + 4);
    });
  });

  // Yatan hasta yatağı: tekerlekli şasi, yan korkuluklar, yastık, mavi-beyaz desenli nevresim,
  // başucu monitörü; servis yataklarında ayak ucunda serum askısı
  R("bed", (k) => {
    const t = now(), ward = k.o.tag === "ward_bed";
    k.shadow(0.04, 0.04, 0.96, 0.96, 0.2);
    for (const [u, v] of [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) k.disc(u, v, 1, 2.6, "#2b333b");
    k.box(0.12, 0.12, 0.88, 0.88, 3, 9, "#b8c4cb");
    k.box(0.13, 0.13, 0.87, 0.87, 9, 15, "#f4f7f9", { top: "#ffffff" });
    // nevresim: mavi zemin + beyaz şeritler
    k.box(0.12, 0.36, 0.88, 0.88, 15, 17.5, "#3f7fbf", { top: "#4f8fd0", edge: false });
    for (let i = 0; i < 4; i++) k.box(0.12, 0.42 + i * 0.12, 0.88, 0.46 + i * 0.12, 17.5, 17.8, "#e9f2fb", { edge: false });
    k.box(0.11, 0.33, 0.89, 0.38, 15, 18.5, "#ffffff");
    // yastık
    k.box(0.22, 0.15, 0.78, 0.31, 15, 20.5, "#ffffff", { top: "#f3f6f8" });
    // başlık ve ayak ucu panelleri, yan korkuluklar
    k.box(0.08, 0.06, 0.92, 0.12, 3, 32, "#d6e0e6", { deco: [{ dir: "S", u0: 0.15, u1: 0.85, z0: 22, z1: 26, color: "#2ec4b6", raw: true }] });
    k.box(0.08, 0.88, 0.92, 0.94, 3, 22, "#d6e0e6");
    k.box(0.06, 0.3, 0.1, 0.7, 15, 21, "#9aa7b0"); k.box(0.9, 0.3, 0.94, 0.7, 15, 21, "#9aa7b0");
    // başucu monitörü (kol üstünde, canlı ritim)
    k.pole(0.9, 0.08, 32, 44, 1.6, "#9aa7b0");
    k.box(0.72, 0.04, 1.0, 0.1, 42, 54, "#1b2329");
    k.custom(0.86, 0.1, 48, (c, sx, sy) => {
      c.fillStyle = "#06140f"; c.fillRect(sx - 7, sy - 4.5, 14, 9);
      const ph = (t / 900) % 1;
      c.strokeStyle = "#66ff99"; c.lineWidth = 0.9; c.beginPath();
      for (let i = 0; i <= 14; i++) { const x = (i / 14 + ph) % 1, y = Math.abs(x - 0.5) < 0.04 ? -3 : Math.abs(x - 0.56) < 0.03 ? 2 : 0; i ? c.lineTo(sx - 7 + i, sy + y) : c.moveTo(sx - 7, sy + y); }
      c.stroke();
    });
    if (ward) {
      k.disc(0.97, 0.95, 0, 4, "#7e8d96");
      k.pole(0.97, 0.95, 0, 46, 1.5, "#c9d1d6");
      k.line(0.92, 0.95, 46, 1.02, 0.95, 46, 1.4, "#c9d1d6");
      k.box(0.93, 0.92, 1.01, 0.98, 36, 44, "rgba(200,230,250,0.85)");
      k.line(0.97, 0.95, 36, 0.85, 0.75, 18, 0.8, "rgba(160,200,230,0.9)");
    }
  });

  // EKG cihazı: arabası, çok kanallı canlı kalp ritmi ekranı, kâğıt çıktısı ve elektrot kabloları
  R("ecg", (k) => {
    const t = now();
    k.shadow(0.12, 0.2, 0.88, 0.85);
    for (const [u, v] of [[0.2, 0.3], [0.8, 0.3], [0.2, 0.8], [0.8, 0.8]]) k.disc(u, v, 0, 2.4, "#2b333b");
    k.pole(0.5, 0.55, 2, 22, 2.5, "#9aa7b0");
    k.box(0.15, 0.25, 0.85, 0.85, 20, 28, "#e9eef1", { deco: [{ dir: "S", u0: 0.1, u1: 0.9, z0: 22, z1: 24, color: "#2ec4b6", raw: true }] });
    k.box(0.22, 0.3, 0.78, 0.4, 28, 46, "#1b2329");
    k.custom(0.5, 0.4, 37, (c, sx, sy) => {
      c.fillStyle = "#04120d"; c.fillRect(sx - 12, sy - 8, 24, 16);
      const cols = ["#66ff99", "#ffd166", "#5ab0ff"];
      for (let r = 0; r < 3; r++) {
        c.strokeStyle = cols[r]; c.lineWidth = 0.8; c.beginPath();
        const yb = sy - 4.5 + r * 4.6, sh = (t / (700 + r * 90)) % 1;
        for (let i = 0; i <= 24; i++) { const x = ((i / 24) + sh) % 1; const y = Math.abs(x - 0.3) < 0.025 ? -2.6 : Math.abs(x - 0.34) < 0.02 ? 1.4 : Math.abs(x - 0.62) < 0.05 ? -0.8 : 0; i ? c.lineTo(sx - 12 + i, yb + y) : c.moveTo(sx - 12, yb + y); }
        c.stroke();
      }
      c.fillStyle = "#66ff99"; c.font = "700 3.6px system-ui"; c.textAlign = "right"; c.fillText("♥ " + (72 + Math.round(Math.sin(t / 2000) * 3)), sx + 11.5, sy - 5.5);
    });
    // kâğıt çıktısı
    const pl = 6 + ((t / 400) % 6);
    k.custom(0.7, 0.85, 26, (c, sx, sy) => { c.fillStyle = "#fff4f4"; c.fillRect(sx - 4, sy, 8, pl); c.strokeStyle = "#e07a7a"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(sx - 3, sy + pl / 2); c.lineTo(sx - 1, sy + pl / 2 - 1.5); c.lineTo(sx, sy + pl / 2 + 1); c.lineTo(sx + 3, sy + pl / 2); c.stroke(); });
    // elektrot kabloları
    for (const [u, col] of [[0.25, "#d62828"], [0.35, "#f2c94c"], [0.45, "#2f9e44"]]) k.line(u, 0.85, 22, u - 0.15, 1.05, 8, 0.9, col);
  });

  // Eczane rafları: cam kapak ve parıltı
  const shelf = A.get("pharmacy_shelf");
  if (shelf) R("pharmacy_shelf", (k) => {
    shelf(k);
    const W = k.W;
    k.box(0.02, 0.56, W - 0.02, 0.59, 3, 68, "rgba(170,215,238,0.22)", { edge: false, top: "rgba(170,215,238,0.3)" });
    k.box(W / 2 - 0.01, 0.56, W / 2 + 0.01, 0.6, 3, 68, "#b8c4cb", { edge: false });
    k.box(0.1, 0.58, 0.22, 0.6, 20, 60, "rgba(255,255,255,0.25)", { edge: false });
  });
})();

// ================================================================ v8: oksijen ünitesi ve serum askısı
(function () {
  const VH = window.VH, A = VH.art;
  const R = (k, fn) => A.register(k, fn);
  const now = () => performance.now();
  // Oksijen tüpleri + konsantratör: manometre (ibreli), akış ölçer (yüzen bilye), şeffaf su dolu nemlendirici hazne
  R('oxygen', (k) => {
    const t = now();
    k.shadow(0.08, 0.2, 0.92, 0.85, 0.22);
    // tekerlekli taşıma arabası
    k.box(0.12, 0.3, 0.88, 0.75, 0, 5, '#5d6a74');
    for (const [u, v] of [[0.18, 0.72], [0.82, 0.72]]) k.disc(u, v, 0, 2.6, '#1b1b1b');
    // iki yeşil gövdeli, beyaz omuzlu tüp
    for (const u of [0.32, 0.62]) {
      k.cyl(u, 0.48, 7, 5, 44, '#2f9e44');
      k.cyl(u, 0.48, 6.4, 44, 50, '#f2f4f5');
      k.cyl(u, 0.48, 2.4, 50, 54, '#9aa7b0');
    }
    k.box(0.16, 0.42, 0.78, 0.46, 30, 32, '#7e8d96');                                         // kelepçe bandı
    // regülatör: manometre (yuvarlak kadran, titreyen ibre)
    k.custom(0.62, 0.48, 58, (c, sx, sy) => {
      c.fillStyle = '#e9edf0'; c.strokeStyle = '#3d4852'; c.lineWidth = 1.2;
      c.beginPath(); c.arc(sx + 5, sy, 5, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#46c46a'; c.lineWidth = 1.4; c.beginPath(); c.arc(sx + 5, sy, 3.6, Math.PI * 0.9, Math.PI * 1.5); c.stroke();
      const a = Math.PI * (1.05 + 0.32 + Math.sin(t / 700) * 0.04);
      c.strokeStyle = '#d62828'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(sx + 5, sy); c.lineTo(sx + 5 + Math.cos(a) * 4, sy + Math.sin(a) * 4); c.stroke();
      // akış ölçer tüpü ve yüzen bilye
      c.fillStyle = 'rgba(210,235,250,0.85)'; c.strokeStyle = '#7e8d96'; c.lineWidth = 0.8;
      c.fillRect(sx - 4, sy - 9, 4, 14); c.strokeRect(sx - 4, sy - 9, 4, 14);
      c.fillStyle = '#d62828'; c.beginPath(); c.arc(sx - 2, sy - 2 + Math.sin(t / 400) * 1.2, 1.3, 0, Math.PI * 2); c.fill();
      // şeffaf nemlendirici hazne (su + kabarcıklar)
      c.fillStyle = 'rgba(200,232,250,0.55)'; c.strokeStyle = 'rgba(120,170,200,0.9)';
      c.beginPath(); if (c.roundRect) c.roundRect(sx - 6, sy + 6, 8, 11, 2); else c.rect(sx - 6, sy + 6, 8, 11); c.fill(); c.stroke();
      c.fillStyle = 'rgba(90,170,230,0.55)'; c.fillRect(sx - 5.5, sy + 10, 7, 6.5);
      c.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 3; i++) { const ph = ((t / 900) + i / 3) % 1; c.beginPath(); c.arc(sx - 3 + i * 1.6, sy + 16 - ph * 6, 0.7, 0, Math.PI * 2); c.fill(); }
      // hasta hortumu
      c.strokeStyle = 'rgba(160,210,235,0.95)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx - 2, sy + 17); c.quadraticCurveTo(sx - 14, sy + 28, sx - 20, sy + 22); c.stroke();
    });
  });

  // Serum askısı: beş ayaklı tekerlekli taban, krom direk, sıvı dolu serum torbası (seviye çizgisi),
  // damla odacığı (düşen damla), roller klemp ve hasta hattı
  R('iv_stand', (k) => {
    const t = now();
    k.custom(0.5, 0.5, 0, (c, sx, sy) => {
      c.strokeStyle = '#6f7d87'; c.lineWidth = 2; c.beginPath();
      for (const a of [0, 1.26, 2.51, 3.77, 5.03]) { c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * 9, sy + Math.sin(a) * 4.5); }
      c.stroke();
      c.fillStyle = '#1b1b1b'; for (const a of [0, 1.26, 2.51, 3.77, 5.03]) { c.beginPath(); c.arc(sx + Math.cos(a) * 9, sy + Math.sin(a) * 4.5 + 1, 1.4, 0, Math.PI * 2); c.fill(); }
    });
    k.pole(0.5, 0.5, 0, 62, 2.2, '#c9d1d6');
    k.custom(0.5, 0.5, 62, (c, sx, sy) => {
      c.strokeStyle = '#c9d1d6'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(sx - 8, sy + 1); c.lineTo(sx + 8, sy - 1); c.stroke();
      // serum torbası
      const g = c.createLinearGradient(sx + 1, 0, sx + 11, 0);
      g.addColorStop(0, 'rgba(225,242,252,0.95)'); g.addColorStop(1, 'rgba(180,215,238,0.95)');
      c.fillStyle = g; c.strokeStyle = '#7fb8e6'; c.lineWidth = 0.9;
      c.beginPath(); if (c.roundRect) c.roundRect(sx + 1, sy + 1, 10, 15, 2.5); else c.rect(sx + 1, sy + 1, 10, 15); c.fill(); c.stroke();
      c.fillStyle = 'rgba(120,190,235,0.55)'; c.fillRect(sx + 1.6, sy + 6, 8.8, 9.4);                 // sıvı seviyesi
      c.fillStyle = '#ffffff'; c.fillRect(sx + 3, sy + 3, 6, 2.2);                                       // etiket
      c.fillStyle = '#2f78b3'; c.font = '700 2.4px system-ui'; c.textAlign = 'center'; c.fillText('%0,9 NaCl', sx + 6, sy + 4.7);
      // damla odacığı ve düşen damla
      c.fillStyle = 'rgba(220,240,252,0.9)'; c.strokeStyle = '#7fb8e6';
      c.fillRect(sx + 4.6, sy + 16, 2.8, 6); c.strokeRect(sx + 4.6, sy + 16, 2.8, 6);
      const ph = (t / 650) % 1;
      c.fillStyle = '#5aa0d8'; c.beginPath(); c.arc(sx + 6, sy + 16.8 + ph * 4, 0.7, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(90,160,216,0.6)'; c.fillRect(sx + 4.8, sy + 20.6, 2.4, 1.2);
      // hat + roller klemp
      c.strokeStyle = 'rgba(127,184,230,0.85)'; c.lineWidth = 0.9;
      c.beginPath(); c.moveTo(sx + 6, sy + 22); c.quadraticCurveTo(sx + 10, sy + 34, sx + 3, sy + 42); c.stroke();
      c.fillStyle = '#f2f4f5'; c.fillRect(sx + 6.6, sy + 28, 3, 2.4);
    });
  });
})();

// ================================================================ v9: prestij nesneleri
(function () {
  const VH = window.VH, A = VH.art;
  const R = (k, fn, flat) => A.register(k, fn, flat);
  const now = () => performance.now();
  // Helikopter pisti: beton daire, sarı halka, beyaz "H", köşe ışıkları (gece yanıp söner)
  R('helipad', (k) => {
    const W = k.W, D = k.D, t = now();
    k.flat([[0.05, 0.05], [W - 0.05, 0.05], [W - 0.05, D - 0.05], [0.05, D - 0.05]], 0.3, '#8e979d');
    k.custom(W / 2, D / 2, 0.6, (c, sx, sy) => {
      const rx = W * 32 * 0.46, ry = D * 16 * 0.46;
      c.fillStyle = '#6f777d'; c.beginPath(); c.ellipse(sx, sy, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#f2c94c'; c.lineWidth = 3; c.beginPath(); c.ellipse(sx, sy, rx * 0.86, ry * 0.86, 0, 0, Math.PI * 2); c.stroke();
      c.save(); c.translate(sx, sy); c.scale(1, 0.5); c.rotate(Math.PI / 4);
      c.fillStyle = '#ffffff'; c.fillRect(-14, -16, 6, 32); c.fillRect(8, -16, 6, 32); c.fillRect(-8, -3, 16, 6);
      c.restore();
      const on = Math.floor(t / 600) % 2;
      for (const [ux, uy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { c.fillStyle = on ? '#5ff0d8' : '#1d6f86'; c.beginPath(); c.arc(sx + ux * rx, sy + uy * ry, 2.6, 0, Math.PI * 2); c.fill(); }
    });
  }, true);
  // Sensörlü el dezenfektanı standı: ayaklı direk, hazne, sensör LED'i ve damlama tepsisi
  R('sanitizer_stand', (k) => {
    const t = now();
    k.disc(0.5, 0.5, 0, 6, '#7e8d96');
    k.pole(0.5, 0.5, 0, 30, 2.4, '#c9d1d6');
    k.box(0.38, 0.4, 0.62, 0.56, 30, 46, '#f4f7f8', { deco: [{ dir: 'S', u0: 0.15, u1: 0.85, z0: 38, z1: 44, color: '#2ec4b6', raw: true }] });
    k.box(0.42, 0.46, 0.58, 0.6, 26, 28, '#9aa7b0');
    k.custom(0.5, 0.56, 34, (c, sx, sy) => { c.fillStyle = Math.floor(t / 900) % 2 ? '#46c46a' : '#1e5a2e'; c.beginPath(); c.arc(sx, sy, 1.4, 0, Math.PI * 2); c.fill(); });
  });
  // B1 espresso barı: tezgâh, çift gruplu espresso makinesi, öğütücü, fincanlar, buhar
  R('espresso_bar', (k) => {
    const W = k.W, t = now();
    k.shadow(0.02, 0.2, W - 0.02, 0.95);
    k.box(0.04, 0.3, W - 0.04, 0.92, 0, 26, '#4a3324', { deco: [{ dir: 'S', u0: 0.02, u1: 0.98, z0: 18, z1: 21, color: '#c9a25a', raw: true }] });
    k.box(0, 0.26, W, 0.96, 26, 28, '#e9e2d6');
    k.box(0.3, 0.38, 1.1, 0.7, 28, 44, '#c9d1d6', { deco: [{ dir: 'S', u0: 0.1, u1: 0.9, z0: 32, z1: 36, color: '#2b333b', raw: true }] });
    k.box(1.3, 0.42, 1.55, 0.66, 28, 46, '#2b333b');
    for (let i = 0; i < 3; i++) k.cyl(1.7 + i * 0.1, 0.8, 2.2, 28, 31, '#ffffff');
    k.custom(0.7, 0.55, 46, (c, sx, sy) => { for (let j = 0; j < 2; j++) { const ph = ((t / 1400) + j / 2) % 1; c.fillStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`; c.beginPath(); c.arc(sx + Math.sin(ph * 5) * 2, sy - ph * 14, 2 + ph * 3, 0, Math.PI * 2); c.fill(); } });
    k.custom(W / 2, 0.96, 22, (c, sx, sy) => { c.fillStyle = '#ffd166'; c.font = '800 5.5px system-ui'; c.textAlign = 'center'; c.fillText('☕ ESPRESSO', sx, sy); });
  });
  // Masaj koltuğu: koyu deri gövde, ayak bölümü, kontrol kumandası
  R('massage_chair', (k) => {
    k.shadow(0.08, 0.1, 0.92, 0.92);
    k.box(0.15, 0.25, 0.85, 0.8, 0, 14, '#2b2f36');
    k.box(0.12, 0.25, 0.88, 0.8, 14, 20, '#3a3f47', { top: '#4a505a' });
    k.box(0.15, 0.1, 0.85, 0.28, 14, 46, '#2b2f36', { deco: [{ dir: '*', u0: 0.15, u1: 0.85, z0: 22, z1: 40, color: '#353a42' }] });
    k.box(0.08, 0.3, 0.16, 0.78, 16, 28, '#2b2f36'); k.box(0.84, 0.3, 0.92, 0.78, 16, 28, '#2b2f36');
    k.box(0.25, 0.8, 0.75, 0.98, 2, 12, '#3a3f47');
    k.box(0.86, 0.5, 0.94, 0.58, 28, 31, '#2ec4b6');
  });
})();
