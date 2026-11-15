// Vita Hospital — Karakterler
// Aşama 2: kamera takibi için Başhekim figürü (yürüme, NPC'ler ve animasyon Aşama 3'te).
(function () {
  const VH = (window.VH = window.VH || {});

  /** Basit 2.5D insan figürü; (sx, sy) ayakların yere bastığı izo nokta. */
  function drawPerson(ctx, sx, sy, look) {
    // gölge
    ctx.fillStyle = 'rgba(10,30,40,0.25)';
    ctx.beginPath(); ctx.ellipse(sx, sy, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    // bacaklar
    ctx.fillStyle = look.pants;
    ctx.fillRect(sx - 5, sy - 13, 4, 12);
    ctx.fillRect(sx + 1, sy - 13, 4, 12);
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(sx - 6, sy - 2, 5, 2);
    ctx.fillRect(sx + 1, sy - 2, 5, 2);
    // gövde / önlük
    ctx.fillStyle = look.coat;
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 11); ctx.lineTo(sx - 7, sy - 29); ctx.quadraticCurveTo(sx, sy - 33, sx + 7, sy - 29);
    ctx.lineTo(sx + 8, sy - 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1; ctx.stroke();
    if (look.shirt) { ctx.fillStyle = look.shirt; ctx.fillRect(sx - 2, sy - 30, 4, 10); }
    // kollar
    ctx.fillStyle = look.coat;
    ctx.fillRect(sx - 10, sy - 28, 3, 13);
    ctx.fillRect(sx + 7, sy - 28, 3, 13);
    ctx.fillStyle = look.skin;
    ctx.fillRect(sx - 10, sy - 16, 3, 3);
    ctx.fillRect(sx + 7, sy - 16, 3, 3);
    // stetoskop
    if (look.stethoscope) {
      ctx.strokeStyle = '#1f2a33'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(sx, sy - 27, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      ctx.fillStyle = '#9aa7b0'; ctx.beginPath(); ctx.arc(sx + 3, sy - 21, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // baş
    ctx.fillStyle = look.skin;
    ctx.beginPath(); ctx.arc(sx, sy - 37, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = look.hair;
    ctx.beginPath(); ctx.arc(sx, sy - 39, 6.2, Math.PI * 1.02, Math.PI * 1.98); ctx.fill();
  }

  const LOOKS = {
    chief: { coat: '#f7fafc', shirt: '#2e6f95', pants: '#34495e', skin: '#e9b98f', hair: '#3b2a20', stethoscope: true },
  };

  const player = { id: 'chief', name: 'Başhekim', x: 4.5, y: 6.6, look: LOOKS.chief };

  VH.entities = {
    player,
    list: [player],
    LOOKS,
    drawPerson,
    init() {},
    update(/* dt */) { /* Aşama 3 */ },
    /** Harita derinlik listesine eklenecek çizilebilirler. */
    drawables(map) {
      return this.list.map((e) => {
        const [sx, sy] = map.worldToIso(e.x, e.y);
        return {
          kind: 'ent', key: map.depthAt(e.x, e.y), cx: sx, cy: sy,
          draw: (ctx) => drawPerson(ctx, sx, sy, e.look),
        };
      });
    },
  };
})();
