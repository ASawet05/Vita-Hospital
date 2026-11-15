// Vita Hospital — Ayrıntılı prosedürel karakter çizimi
//
// Doktor, hemşire, paramedik, temizlik görevlisi ve hastalar aynı iskeletten çizilir;
// rol kıyafetleri (önlük, forma, reflektörlü üniforma, önlük-apron, hasta önlüğü), saç
// modelleri (kısa, uzun, topuz, kıvırcık, at kuyruğu, başörtüsü, cerrahi bone), yüz ifadesi
// (gülümseme / nötr / kızgın), göz kırpma, nefes alma ve yürürken kol-bacak salınımı içerir.
// Aksesuarlar: steteskop, gözlük, maske, kulaklık, sakal, baston, pano, paspas, tablet.
(function () {
  const VH = (window.VH = window.VH || {});
  const shade = (c, f) => (VH.art ? VH.art.shade(c, f) : c);

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  // ---------------------------------------------------------------- Yatan hasta
  function drawLying(ctx, sx, sy, look, angle) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.scale(1, 0.62);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    rr(ctx, -17, -5, 34, 13, 6);
    const g = ctx.createLinearGradient(0, -7, 0, 7);
    g.addColorStop(0, '#b6d8ef'); g.addColorStop(1, '#86b4d6');
    ctx.fillStyle = g;
    rr(ctx, -16, -7, 28, 14, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(-14, -2, 24, 1.5);
    ctx.fillRect(-14, 2, 24, 1);
    ctx.fillStyle = look.gown ? '#a8cfe0' : look.coat;
    rr(ctx, 6, -6, 7, 12, 3);
    ctx.restore();
    const hx = sx + Math.cos(angle) * 15, hy = sy + Math.sin(angle) * 15 * 0.62;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(hx, hy - 1, 8, 4, angle, 0, Math.PI * 2); ctx.fill(); // yastık
    ctx.fillStyle = look.skin;
    ctx.beginPath(); ctx.arc(hx, hy - 3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = look.scarf || look.hair;
    if (look.hairStyle !== 'bald' || look.scarf) { ctx.beginPath(); ctx.arc(hx, hy - 4.5, 5.2, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    ctx.fillStyle = '#1d2329';
    ctx.fillRect(hx - 2, hy - 3, 1.2, 0.8); ctx.fillRect(hx + 1, hy - 3, 1.2, 0.8); // kapalı gözler
  }

  // ---------------------------------------------------------------- Tekerlekli sandalye
  function wheelchairBack(ctx) {
    ctx.strokeStyle = '#4a5560'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-8, -28); ctx.lineTo(-8, -10); ctx.lineTo(8, -10); ctx.stroke();
    ctx.fillStyle = '#2e4a6b'; ctx.fillRect(-8, -27, 3, 14);
  }
  function wheelchairFront(ctx) {
    ctx.strokeStyle = '#2b333b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-4, -7, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#9aa7b0'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-11, -7); ctx.lineTo(3, -7); ctx.moveTo(-4, -14); ctx.lineTo(-4, 0); ctx.stroke();
    ctx.fillStyle = '#2b333b'; ctx.beginPath(); ctx.arc(9, -1.5, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // ---------------------------------------------------------------- Saç
  function hairBack(ctx, look, hy) {
    const st = look.hairStyle;
    ctx.fillStyle = look.hair;
    if (look.scarf) { ctx.fillStyle = look.scarf; ctx.beginPath(); ctx.arc(0, hy, 7.2, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-7, hy, 14, 9); return; }
    if (look.cap) { ctx.fillStyle = look.cap; ctx.beginPath(); ctx.arc(0, hy - 0.5, 6.6, 0, Math.PI * 2); ctx.fill(); return; }
    if (st === 'bald') { ctx.fillStyle = shade(look.skin, -0.06); ctx.beginPath(); ctx.arc(0, hy, 6.1, 0, Math.PI * 2); ctx.fill(); return; }
    ctx.beginPath(); ctx.arc(0, hy - 0.5, 6.4, 0, Math.PI * 2); ctx.fill();
    if (st === 'long') rr(ctx, -6.4, hy, 12.8, 10, 3);
    if (st === 'bun') { ctx.beginPath(); ctx.arc(0, hy - 6.5, 3.2, 0, Math.PI * 2); ctx.fill(); }
    if (st === 'ponytail') { rr(ctx, -1.6, hy + 1, 3.2, 9, 1.6); }
    if (st === 'curly') for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; ctx.beginPath(); ctx.arc(Math.cos(a) * 5.5, hy + Math.sin(a) * 5.5, 2.6, 0, Math.PI * 2); ctx.fill(); }
  }
  function hairFront(ctx, look, hy) {
    const st = look.hairStyle;
    if (look.scarf) {
      ctx.fillStyle = look.scarf;
      ctx.beginPath(); ctx.arc(0, hy, 7.3, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-7.2, hy); ctx.quadraticCurveTo(-6, hy + 9, 0, hy + 9.5); ctx.quadraticCurveTo(6, hy + 9, 7.2, hy); ctx.lineTo(5.6, hy + 3); ctx.quadraticCurveTo(0, hy + 7.5, -5.6, hy + 3); ctx.closePath(); ctx.fill();
      return;
    }
    if (look.cap) {
      ctx.fillStyle = look.cap;
      ctx.beginPath(); ctx.arc(0, hy - 1, 6.7, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillRect(-6.7, hy - 2, 13.4, 2.2);
      return;
    }
    ctx.fillStyle = look.hair;
    if (st === 'long') { rr(ctx, -6.8, hy - 2, 3.2, 10, 1.5); rr(ctx, 3.6, hy - 2, 3.2, 10, 1.5); }
    if (st === 'curly') for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-5 + i * 2, hy - 5.5 + (i % 2), 2.4, 0, Math.PI * 2); ctx.fill(); }
    if (st !== 'bald') { ctx.beginPath(); ctx.arc(0, hy - 1.5, 6.4, Math.PI * 1.0, Math.PI * 2.0); ctx.fill(); }
    if (st === 'short' || st === 'ponytail') { ctx.beginPath(); ctx.moveTo(-6.3, hy - 1.5); ctx.quadraticCurveTo(-1, hy - 3.8, 4, hy - 2.2); ctx.lineTo(6.3, hy - 1.5); ctx.lineTo(6.3, hy - 3); ctx.lineTo(-6.3, hy - 3); ctx.closePath(); ctx.fill(); }
    if (st === 'bun') { ctx.beginPath(); ctx.arc(-2, hy - 7.2, 3, 0, Math.PI * 2); ctx.fill(); }
    if (st === 'ponytail') { ctx.beginPath(); ctx.arc(-6, hy - 1, 2, 0, Math.PI * 2); ctx.fill(); }
  }

  // ---------------------------------------------------------------- Yüz
  function face(ctx, look, hy, pose) {
    const blink = ((pose.t2 || 0) % 4.2) < 0.13;
    const mood = pose.mood || 0; // 1 mutlu, 0 nötr, -1 kızgın
    // kulak
    ctx.fillStyle = shade(look.skin, -0.08);
    ctx.beginPath(); ctx.arc(-5.6, hy + 0.5, 1.6, 0, Math.PI * 2); ctx.fill();
    // gözler (bakış yönüne kaydırılmış)
    ctx.fillStyle = '#1d2329';
    if (blink) { ctx.fillRect(0.4, hy + 0.2, 1.8, 0.7); ctx.fillRect(3.3, hy + 0.2, 1.8, 0.7); }
    else {
      ctx.beginPath(); ctx.arc(1.2, hy + 0.4, 0.95, 0, Math.PI * 2); ctx.arc(4.1, hy + 0.4, 0.95, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(1.3, hy - 0.2, 0.5, 0.5); ctx.fillRect(4.2, hy - 0.2, 0.5, 0.5);
    }
    // kaşlar
    ctx.strokeStyle = shade(look.hairStyle === 'bald' ? '#5a4a42' : look.hair, -0.1); ctx.lineWidth = 0.8;
    ctx.beginPath();
    if (mood < 0) { ctx.moveTo(0.2, hy - 2); ctx.lineTo(2.2, hy - 1.2); ctx.moveTo(5.2, hy - 2); ctx.lineTo(3.2, hy - 1.2); }
    else { ctx.moveTo(0.2, hy - 1.6); ctx.lineTo(2.2, hy - 1.9); ctx.moveTo(3.2, hy - 1.9); ctx.lineTo(5.2, hy - 1.6); }
    ctx.stroke();
    // yanak
    if (mood > 0) { ctx.fillStyle = 'rgba(230,110,110,0.25)'; ctx.beginPath(); ctx.arc(4.8, hy + 2.4, 1.3, 0, Math.PI * 2); ctx.fill(); }
    // ağız
    if (look.mask) {
      ctx.fillStyle = look.mask; rr(ctx, -0.5, hy + 1.6, 6.6, 3.8, 1.2);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, hy + 3); ctx.lineTo(5.8, hy + 3); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(120,50,45,0.85)'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      if (mood > 0) ctx.arc(2.7, hy + 2.2, 1.6, 0.15 * Math.PI, 0.85 * Math.PI);
      else if (mood < 0) ctx.arc(2.7, hy + 4.2, 1.5, 1.2 * Math.PI, 1.8 * Math.PI);
      else { ctx.moveTo(1.8, hy + 3.3); ctx.lineTo(3.7, hy + 3.3); }
      ctx.stroke();
    }
    if (look.beard) { ctx.fillStyle = look.hair; ctx.beginPath(); ctx.arc(1.5, hy + 2.5, 4.6, 0.05 * Math.PI, 0.95 * Math.PI); ctx.fill(); if (!look.mask) { ctx.strokeStyle = 'rgba(255,230,220,0.5)'; ctx.beginPath(); ctx.moveTo(1.8, hy + 3.3); ctx.lineTo(3.7, hy + 3.3); ctx.stroke(); } }
    if (look.glasses) {
      ctx.strokeStyle = look.glasses === true ? '#2b333b' : look.glasses; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(1.2, hy + 0.4, 1.9, 0, Math.PI * 2); ctx.moveTo(6, hy + 0.4); ctx.arc(4.1, hy + 0.4, 1.9, 0, Math.PI * 2); ctx.moveTo(3.1, hy + 0.3); ctx.lineTo(2.2, hy + 0.3); ctx.stroke();
    }
    if (look.goggles) { ctx.strokeStyle = 'rgba(120,200,230,0.95)'; ctx.lineWidth = 1; ctx.strokeRect(-0.6, hy - 1.4, 6.6, 3.6); }
    if (look.headset) { ctx.strokeStyle = '#2b333b'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, hy - 1, 6.8, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5.5, hy + 1); ctx.quadraticCurveTo(-3, hy + 5, 1, hy + 4); ctx.stroke(); }
  }

  // ---------------------------------------------------------------- El aksesuarı
  function carry(ctx, look, x, y) {
    switch (look.carry) {
      case 'clipboard': ctx.fillStyle = '#8a6a4c'; ctx.fillRect(x - 1, y - 7, 6, 8); ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 6, 4, 6); ctx.fillStyle = '#9aa7b0'; ctx.fillRect(x + 1, y - 7.5, 2, 1.5); break;
      case 'tablet': ctx.fillStyle = '#1d2329'; ctx.fillRect(x - 1, y - 7, 6, 8); ctx.fillStyle = '#2ec4b6'; ctx.fillRect(x, y - 6, 4, 6); break;
      case 'bag': ctx.fillStyle = '#7a5636'; rr(ctx, x - 1, y - 2, 7, 6, 1.5); break;
      case 'mop': ctx.strokeStyle = '#c39a6b'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x + 1, y - 20); ctx.lineTo(x + 3, y + 10); ctx.stroke(); ctx.fillStyle = '#eef2f4'; rr(ctx, x - 1, y + 8, 8, 4, 1.5); break;
      case 'kit': ctx.fillStyle = '#d62828'; rr(ctx, x - 1, y - 2, 8, 6, 1.5); ctx.fillStyle = '#fff'; ctx.fillRect(x + 2.3, y - 1, 1.4, 4); ctx.fillRect(x + 1, y + 0.3, 4, 1.4); break;
      default: break;
    }
  }

  /**
   * 2.5D insan figürü. (sx, sy) ayakların yere bastığı izo nokta.
   * pose: { t, t2, moving, flip, back, sitting, lift, ring, lying, angle, chair, mood }
   */
  function draw(ctx, sx, sy, look, pose) {
    pose = pose || {};
    if (pose.lying) { drawLying(ctx, sx, sy - (pose.lift || 0), look, pose.angle || 0); return; }
    const t = pose.t || 0;
    const moving = !!pose.moving, back = !!pose.back, chair = !!pose.chair;
    const sit = !!pose.sitting || chair;
    const swing = moving && !chair ? Math.sin(t) : 0;
    const bob = moving && !chair ? -Math.abs(Math.cos(t)) * 1.3 : 0;
    const breathe = moving ? 0 : Math.sin((pose.t2 || 0) * 2.2) * 0.45;
    const stoop = look.cane ? 1.5 : 0;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = 'rgba(10,30,40,0.28)';
    ctx.beginPath(); ctx.ellipse(0, 0, chair ? 12 : 9, chair ? 6 : 4.5, 0, 0, Math.PI * 2); ctx.fill();
    if (pose.ring) {
      ctx.strokeStyle = 'rgba(46,196,182,0.95)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(46,196,182,0.18)'; ctx.fill();
    }
    ctx.translate(0, -(pose.lift || 0) + bob);
    if (look.scale) ctx.scale(look.scale, look.scale);
    if (pose.flip) ctx.scale(-1, 1);
    if (chair) wheelchairBack(ctx);

    const hip = sit ? -9 - (chair ? 3 : 0) : -12;
    const shoe = look.shoes || '#2b2b2b';
    const legCol = look.gown ? look.skin : look.pants;
    // ---- bacaklar
    if (sit) {
      ctx.fillStyle = look.pants || legCol;
      rr(ctx, -5, hip - 1, 12, 5, 2);
      ctx.fillStyle = legCol;
      ctx.fillRect(3, hip + 2, 4, chair ? 9 : 7);
      ctx.fillStyle = shoe;
      rr(ctx, 3, hip + (chair ? 10 : 8), 6, 2.2, 1);
    } else {
      const lx = swing * 2, ly = Math.max(0, swing) * 1.6;
      const rx = -swing * 2, ry = Math.max(0, -swing) * 1.6;
      ctx.fillStyle = shade(legCol, -0.12);
      ctx.fillRect(1 + rx, hip - 1, 4, 12 - ry);
      ctx.fillStyle = legCol;
      ctx.fillRect(-5 + lx, hip - 1, 4, 12 - ly);
      ctx.fillStyle = shoe;
      rr(ctx, -6 + lx, -2.2 - ly, 5.5, 2.4, 1);
      rr(ctx, 1 + rx, -2.2 - ry, 5.5, 2.4, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(-5 + lx, -2 - ly, 2, 0.8);
    }

    // ---- gövde
    const top = hip - 18 + stoop - breathe;
    const coatLen = look.longCoat ? 6 : 1;
    const body = look.gown ? '#a8cfe0' : look.coat;
    const g = ctx.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, shade(body, back ? -0.12 : 0.06)); g.addColorStop(1, shade(body, back ? -0.02 : -0.14));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-8.2, hip + coatLen);
    ctx.lineTo(-7.2, top + 2);
    ctx.quadraticCurveTo(0, top - 2.2, 7.2, top + 2);
    ctx.lineTo(8.2, hip + coatLen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 1; ctx.stroke();
    if (look.gown) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = -6; i < 7; i += 4) ctx.fillRect(i, top + 4, 1.2, hip - top - 3); }
    if (look.stripes) { ctx.fillStyle = '#e8ff5a'; ctx.fillRect(-8, hip - 6, 16, 1.8); ctx.fillRect(-7.6, top + 6, 15.2, 1.5); }
    if (look.apron) { ctx.fillStyle = look.apron; rr(ctx, -5.5, top + 6, 11, hip - top - 4 + coatLen, 2); }
    if (!back) {
      if (look.scrubs) {
        ctx.fillStyle = shade(body, -0.25);
        ctx.beginPath(); ctx.moveTo(-3, top + 0.5); ctx.lineTo(0, top + 5); ctx.lineTo(3, top + 0.5); ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(body, -0.1); ctx.fillRect(2.5, top + 7, 4, 3.5);
      } else if (look.shirt) {
        ctx.fillStyle = look.shirt;
        ctx.beginPath(); ctx.moveTo(-2.6, top + 0.8); ctx.lineTo(0, top + 9); ctx.lineTo(2.6, top + 0.8); ctx.closePath(); ctx.fill();
        // yaka (önlük ise)
        if (look.coat && /^#f[0-9a-f]/i.test(look.coat)) {
          ctx.fillStyle = shade(look.coat, -0.08);
          ctx.beginPath(); ctx.moveTo(-3.2, top + 0.6); ctx.lineTo(-0.6, top + 9.5); ctx.lineTo(-4.6, top + 4); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(3.2, top + 0.6); ctx.lineTo(0.6, top + 9.5); ctx.lineTo(4.6, top + 4); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(-6.5, hip - 6, 4, 3); ctx.fillRect(2.5, hip - 6, 4, 3); // cepler
          ctx.fillStyle = '#2e6f95'; ctx.fillRect(3.4, hip - 8, 0.9, 3); // kalem
        }
      }
      if (look.tie) { ctx.fillStyle = look.tie; ctx.beginPath(); ctx.moveTo(-0.9, top + 2); ctx.lineTo(0.9, top + 2); ctx.lineTo(1.2, top + 8); ctx.lineTo(0, top + 9.5); ctx.lineTo(-1.2, top + 8); ctx.closePath(); ctx.fill(); }
      if (!look.patient && !look.scrubs && !look.stripes && !look.apron) { ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(0, top + 9); ctx.lineTo(0, hip + coatLen); ctx.stroke(); }
      if (look.badge) { ctx.fillStyle = look.badge; ctx.fillRect(3, top + 4, 3, 2.2); ctx.fillStyle = '#fff'; ctx.fillRect(3.4, top + 4.4, 1, 1); }
      if (look.cross) { ctx.fillStyle = '#2f9e44'; ctx.fillRect(3.5, top + 3, 1.5, 4.5); ctx.fillRect(2.5, top + 4.5, 3.5, 1.5); }
      if (look.stethoscope) {
        ctx.strokeStyle = '#1f2a33'; ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(0, top + 3, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3.5, top + 6.5); ctx.lineTo(3, top + 9); ctx.stroke();
        ctx.fillStyle = '#9aa7b0'; ctx.beginPath(); ctx.arc(3, top + 9.5, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ---- kollar (omuzdan salınım)
    const armSwing = moving && !chair ? swing * 0.35 : 0;
    const sleeve = look.gown ? '#a8cfe0' : look.sleeve || body;
    const hand = look.gloves || look.skin;
    const arm = (x, rot, front) => {
      ctx.save();
      ctx.translate(x, top + 2.5);
      ctx.rotate(rot);
      ctx.fillStyle = front ? sleeve : shade(sleeve, -0.12);
      rr(ctx, -1.6, 0, 3.2, chair || sit ? 10 : 11, 1.5);
      ctx.fillStyle = hand;
      ctx.beginPath(); ctx.arc(0, chair || sit ? 11 : 12.2, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    arm(-8.4, -armSwing + (sit ? 0.25 : 0), false);
    arm(8.4, armSwing - (sit ? 0.25 : 0), true);
    if (!back && look.carry) carry(ctx, look, 8.8, top + 14);
    if (look.cane && !sit) {
      ctx.strokeStyle = '#7a5636'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(9.5, top + 13); ctx.lineTo(11 + armSwing * 4, -0.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(8.5, top + 13, 1.6, Math.PI, Math.PI * 2); ctx.stroke();
    }

    // ---- baş
    const hy = top - 7;
    ctx.fillStyle = shade(look.skin, -0.1);
    ctx.fillRect(-1.6, top - 2.5, 3.2, 3.5);
    if (back) hairBack(ctx, look, hy);
    const hg = ctx.createRadialGradient(1.5, hy - 2, 1, 0, hy, 7);
    hg.addColorStop(0, shade(look.skin, 0.08)); hg.addColorStop(1, shade(look.skin, -0.08));
    ctx.fillStyle = hg;
    if (!back || look.hairStyle === 'bald') { ctx.beginPath(); ctx.arc(0, hy, 6, 0, Math.PI * 2); ctx.fill(); }
    if (!back) {
      face(ctx, look, hy, pose);
      hairFront(ctx, look, hy);
    }
    if (chair) wheelchairFront(ctx);
    if (look.umbrella && !sit) {
      // şemsiye (yağmurlu havada yayalar)
      const uc = look.umbrellaCol || look.coat;
      ctx.strokeStyle = '#2b333b'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(7, top + 12); ctx.lineTo(3, hy - 14); ctx.stroke();
      ctx.fillStyle = uc;
      ctx.beginPath(); ctx.moveTo(-12, hy - 9); ctx.quadraticCurveTo(2, hy - 26, 17, hy - 11);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(13.4 - i * 7.3, hy - 13, 9.8 - i * 7.3 + (i === 3 ? 0.8 : 0), hy - 9.8 + (i === 3 ? 0.8 : 0));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.stroke();
    }
    ctx.restore();
  }

  VH.people = { draw, drawLying };
})();
