// Vita Hospital — Personel yönetimi: yetenek, seviye, enerji, moral, maaş ve iş başvuruları
//
// Her personelin bir kaydı vardır: yetenek (1-5 yıldız), seviye/deneyim, enerji, moral, maaş
// ve bir özellik (trait). Verimlilik = yetenek × seviye × enerji × moral × özellik.
// Verimlilik muayene/tahlil/kayıt/eczane sürelerini doğrudan etkiler (entities.js → sf()).
// İş başvurularından hemşire, nöbetçi doktor, temizlik görevlisi ve teknisyen alınabilir:
//  - Hemşire: acil stabilizasyonunu hızlandırır, bekleyen hastaların sabrını korur.
//  - Nöbetçi doktor: muayene süresini kısaltır.
//  - Temizlik görevlisi: yere düşen çöpleri kendiliğinden toplar (temizlik puanı).
//  - Teknisyen: yıpranan cihazların bakımını kendiliğinden yapar.
// Maaşlar her nöbet sonunda ödenir (Nöbet Özeti'nde gösterilir).
(function () {
  const VH = (window.VH = window.VH || {});
  const E = () => VH.entities, UI = () => VH.ui, S = () => VH.cases.state;
  const el = (...a) => UI().el(...a);
  const money = (n) => '₺' + Math.round(n).toLocaleString('tr-TR');
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sound = (n) => { if (VH.audio) VH.audio.play(n); };
  const persist = () => { if (VH.save) VH.save.save(); };

  // ---------------------------------------------------------------- Kataloglar
  const TRAITS = {
    fast:     { name: 'Hızlı', icon: '⚡', desc: 'İşlerini %12 daha hızlı bitirir.', eff: 1.12, pay: 1.1 },
    friendly: { name: 'Güler Yüzlü', icon: '😊', desc: 'Hastaların sabrı daha yavaş azalır.', eff: 1, pay: 1.05, calm: 0.04 },
    diligent: { name: 'Çalışkan', icon: '💪', desc: 'Enerjisi %30 daha yavaş düşer.', eff: 1.03, pay: 1.05, drain: 0.7 },
    expert:   { name: 'Tecrübeli', icon: '🎓', desc: 'Başlangıçtan +1 yıldız etkisi.', eff: 1.1, pay: 1.2 },
    learner:  { name: 'Öğrenmeye Açık', icon: '📚', desc: 'Deneyimi 1,5 kat hızlı kazanır.', eff: 1, pay: 0.95, xp: 1.5 },
    tidy:     { name: 'Titiz', icon: '🧽', desc: 'Temizlik ve bakımda %40 daha etkili.', eff: 1.04, pay: 1.05, tidy: 1.4 },
    grumpy:   { name: 'Huysuz', icon: '😒', desc: 'Ucuzdur ama moral kaybı fazladır.', eff: 0.97, pay: 0.8, morale: -4 },
  };
  const ROLES = {
    nurse:   { name: 'Hemşire', icon: '👩‍⚕️', max: 4, salary: 520, title: 'Hem.', desc: 'Acil stabilizasyonu %7, bekleme sabır kaybını %5 azaltır (verimliliğe göre).',
      points: [[12.5, 16], [15.5, 16], [17.5, 19.5], [24.5, 15.5], [22.5, 18.2], [26.5, 14.6], [18.5, 13]],
      looks: [['#5aa9e6', '#3d6a8e'], ['#2f9e8f', '#22705f'], ['#e07a9f', '#9c4f6c'], ['#8e7cc3', '#5b4a91']],
      greet: ['Bekleme salonu kontrol altında.', 'Serumlar hazır!', 'Hastalarla ilgileniyorum.'] },
    doctor:  { name: 'Nöbetçi Doktor', icon: '🧑‍⚕️', max: 3, salary: 900, title: 'Dr.', desc: 'Muayene süresini %8 kısaltır (verimliliğe göre).',
      points: [[9.5, 9.6], [14.5, 9.6], [19.5, 10.2], [8.5, 6.6], [13.5, 6.6]],
      looks: [['#fbfdff', '#30638e'], ['#fbfdff', '#3d405b'], ['#fbfdff', '#354f52']],
      greet: ['Muayenelere destek veriyorum.', 'Konsültasyon için buradayım.', 'Nöbet sakin, şimdilik.'] },
    janitor: { name: 'Temizlik Görevlisi', icon: '🧹', max: 3, salary: 340, title: '', desc: 'Yere düşen çöpleri kendiliğinden toplar; temizlik puanını korur.',
      points: [[6.5, 9.6], [16.5, 9.6], [24.5, 9.6], [12.5, 21.5], [5.5, 20.5], [18.5, 21]],
      looks: [['#6b705c', '#3f4238'], ['#5c946e', '#2f5a3e']],
      greet: ['Yerler pırıl pırıl!', 'Islak zemin, dikkat!', 'Çöp kutuları boşaltıldı.'] },
    tech:    { name: 'Teknisyen', icon: '🔧', max: 2, salary: 460, title: '', desc: 'Yıpranan tıbbi cihazların bakımını kendiliğinden yapar.',
      points: [[22.5, 9.6], [27.5, 9.6], [21.5, 6.5], [25.5, 20.5]],
      looks: [['#30638e', '#22223b'], ['#d1495b', '#3d405b']],
      greet: ['Cihazlar kontrol edildi.', 'Kalibrasyon tamam.', 'Bir arıza varsa söyleyin.'] },
  };
  // Mevcut personelin maaş ve başlangıç özellikleri
  const BASE = {
    receptionist: { salary: 400, trait: 'friendly', skill: 2 }, doctor1: { salary: 800, trait: 'expert', skill: 3 }, doctor2: { salary: 800, trait: 'friendly', skill: 2 },
    laborant: { salary: 500, trait: 'tidy', skill: 2 }, pharmacist: { salary: 600, trait: 'fast', skill: 2 },
    erNurse: { salary: 620, trait: 'diligent', skill: 3 }, erDoctor: { salary: 1000, trait: 'expert', skill: 3 }, labTech2: { salary: 480, trait: 'learner', skill: 2 }, pharmTech: { salary: 420, trait: 'fast', skill: 2 },
    surgeon: { salary: 1300, trait: 'expert', skill: 4 }, anesth: { salary: 1100, trait: 'diligent', skill: 3 }, wardNurse: { salary: 600, trait: 'friendly', skill: 3 },
    pediatrician: { salary: 1000, trait: 'friendly', skill: 3 }, radiologist: { salary: 1050, trait: 'tidy', skill: 3 }, dialysisNurse: { salary: 600, trait: 'diligent', skill: 2 },
  };
  const FIRST_F = ['Ayşe', 'Zeynep', 'Elif', 'Merve', 'Derya', 'Sibel', 'Gizem', 'Esra', 'Nur', 'Pınar', 'Ece', 'Seda'];
  const FIRST_M = ['Ahmet', 'Mehmet', 'Can', 'Burak', 'Emre', 'Kerem', 'Tolga', 'Onur', 'Serkan', 'Umut', 'Barış', 'Kaan'];
  const LASTN = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Koç', 'Kurt', 'Polat', 'Erdem'];
  const SKINS = ['#f3cfb1', '#e8b48f', '#c98d62', '#9c6b47', '#f6dcc7'];
  const HAIRS = ['#2b1d14', '#4a3121', '#7a5230', '#1c1c1c', '#a0522d', '#c9a25a'];

  // ---------------------------------------------------------------- Durum
  const data = () => {
    const st = S();
    st.staffData = st.staffData || { recs: {}, hired: [], candidates: [], restRoom: false, seq: 1 };
    return st.staffData;
  };
  function rec(id) {
    const d = data();
    if (!d.recs[id]) {
      const b = BASE[id] || { salary: 600, trait: null, skill: 2 };
      d.recs[id] = { skill: b.skill, lvl: 1, xp: 0, energy: 100, morale: 72, salary: b.salary, trait: b.trait };
    }
    return d.recs[id];
  }
  const traitOf = (r) => (r && r.trait && TRAITS[r.trait]) || null;
  const effSkill = (r) => r.skill + (r.trait === 'expert' ? 1 : 0);
  function efficiency(id) {
    const r = rec(id);
    const tr = traitOf(r);
    const energyF = r.energy < 25 ? 0.8 : r.energy < 50 ? 0.93 : 1;
    const moraleF = 0.92 + 0.0012 * r.morale;
    return (0.8 + 0.1 * effSkill(r)) * (1 + 0.03 * (r.lvl - 1)) * energyF * moraleF * (tr ? tr.eff : 1);
  }
  const generic = () => data().hired;
  // Haritada görevde olan personel (işe alınmamış çekirdek kadro floor < 0)
  const activeStaff = () => E().staff.filter((s) => s.floor >= 0);
  const genericOf = (role) => generic().filter((h) => h.role === role);

  // ---------------------------------------------------------------- Etkiler
  function factor(k) {
    let f = 1;
    if (k === 'examTime') genericOf('doctor').forEach((h) => { f *= 1 - 0.08 * efficiency(h.id); });
    if (k === 'stabTime') genericOf('nurse').forEach((h) => { f *= 1 - 0.07 * efficiency(h.id); });
    if (k === 'patienceDrain') {
      genericOf('nurse').forEach((h) => { const tr = traitOf(rec(h.id)); f *= 1 - 0.05 * efficiency(h.id) - (tr && tr.calm ? tr.calm : 0); });
      if (traitOf(rec('receptionist')) && rec('receptionist').trait === 'friendly') f *= 0.97;
    }
    return Math.max(0.35, f);
  }
  const timeFactor = (id) => 1 / Math.max(0.4, efficiency(id));

  // ---------------------------------------------------------------- Deneyim
  function gainXp(id, amount) {
    if (!id) return;
    const r = rec(id), tr = traitOf(r);
    r.xp += amount * (tr && tr.xp ? tr.xp : 1);
    const need = 100 * r.lvl;
    if (r.xp >= need && r.lvl < 10) {
      r.xp -= need; r.lvl += 1;
      r.morale = clamp(r.morale + 4, 0, 100);
      const ent = E().staffById(id);
      if (ent) { ent.emote = { icon: '⭐', until: performance.now() + 3000 }; }
      UI().toast(`⭐ ${ent ? ent.name : id} seviye ${r.lvl} oldu! (verimlilik +%3)`, 2600);
      if (VH.emit) VH.emit('staffLevel', { id, lvl: r.lvl });
    }
  }
  function nurseIds() { return genericOf('nurse').map((h) => h.id).concat(VH.hospital.has('hires', 'erNurse') ? ['erNurse'] : []); }

  // ---------------------------------------------------------------- Personel eylemleri
  function train(id) {
    const r = rec(id);
    if (r.skill >= 5) return;
    const cost = 1200 * r.skill;
    if (S().budget < cost || S().budget <= 0) { UI().toast('Bütçe yetersiz', 1800); return; }
    S().budget -= cost;
    r.skill += 1; r.salary = Math.round(r.salary * 1.12); r.morale = clamp(r.morale + 6, 0, 100);
    sound('success');
    UI().toast(`🎓 Eğitim tamamlandı: ${nameOf(id)} artık ${r.skill}★`, 2400);
    if (VH.emit) VH.emit('train', { id, skill: r.skill });
    persist();
  }
  function raise(id) {
    const r = rec(id);
    r.salary = Math.round(r.salary * 1.1);
    r.morale = clamp(r.morale + 14, 0, 100);
    sound('ok');
    UI().toast(`💸 ${nameOf(id)} için %10 zam: moral yükseldi`, 2200);
    persist();
  }
  function bonus(id) {
    const r = rec(id);
    const cost = 250 + 50 * r.lvl;
    if (S().budget < cost || S().budget <= 0) { UI().toast('Bütçe yetersiz', 1800); return; }
    S().budget -= cost;
    r.morale = clamp(r.morale + 12, 0, 100); r.energy = clamp(r.energy + 25, 0, 100);
    sound('ok');
    UI().toast(`🎁 Prim verildi: ${nameOf(id)} (enerji +25, moral +12)`, 2200);
    persist();
  }
  function fire(id) {
    const d = data();
    const i = d.hired.findIndex((h) => h.id === id);
    if (i < 0) return;
    const h = d.hired[i];
    d.hired.splice(i, 1);
    delete d.recs[id];
    const list = E().staff;
    const k = list.findIndex((s) => s.id === id);
    if (k >= 0) list.splice(k, 1);
    sound('click');
    UI().toast(`${h.name} işten ayrıldı.`, 2000);
    persist();
  }
  function nameOf(id) {
    const ent = E().staffById(id);
    if (ent) return ent.name;
    const h = generic().find((x) => x.id === id);
    return h ? h.name : id;
  }

  // ---------------------------------------------------------------- İş başvuruları
  function candidate() {
    const roleIds = ['nurse', 'nurse', 'doctor', 'janitor', 'janitor', 'tech'];
    const role = pick(roleIds);
    const R = ROLES[role];
    const female = Math.random() < 0.55;
    const first = female ? pick(FIRST_F) : pick(FIRST_M);
    const skill = Math.random() < 0.08 ? 5 : 1 + Math.floor(Math.random() * 4);
    const trait = Math.random() < 0.35 ? null : pick(Object.keys(TRAITS));
    const salary = Math.round(R.salary * (0.75 + 0.15 * skill) * (trait ? TRAITS[trait].pay : 1) / 10) * 10;
    const [c1, c2] = pick(R.looks);
    return {
      role, name: (R.title ? R.title + ' ' : '') + first + ' ' + pick(LASTN), female, skill, trait, salary, fee: salary * 2,
      look: { coat: c1, pants: c2, skin: pick(SKINS), hair: pick(HAIRS), hairStyle: female ? pick(['bun', 'long', 'ponytail', 'curly']) : pick(['short', 'short', 'curly', 'bald']) },
    };
  }
  function refreshCandidates(n) {
    const d = data();
    d.candidates = [];
    for (let i = 0; i < (n || 3); i++) d.candidates.push(candidate());
  }
  function lookFor(h) {
    const L = Object.assign({}, h.look);
    if (h.role === 'nurse') Object.assign(L, { scrubs: true, sleeve: L.coat, pants: L.coat, badge: '#ffffff', carry: Math.random() < 0.5 ? 'clipboard' : null });
    if (h.role === 'doctor') Object.assign(L, { coat: '#fbfdff', shirt: h.look.pants, stethoscope: true, longCoat: true, carry: 'tablet' });
    if (h.role === 'janitor') Object.assign(L, { apron: '#3a8fb7', carry: 'mop', shoes: '#2f3e46' });
    if (h.role === 'tech') Object.assign(L, { stripes: true, carry: 'tablet', badge: '#f2c94c', glasses: true, cap: '#f2a93b' });
    return L;
  }
  function spawnHired(h) {
    const R = ROLES[h.role];
    const def = { id: h.id, name: h.name, role: R.name, look: lookFor(h), points: R.points, action: 'Personel Kartı', greet: R.greet, info: R.desc, generic: true, gRole: h.role };
    const s = E().addStaff(def, 0);
    s.speed = h.role === 'janitor' ? 1.5 : 1.7;
    return s;
  }
  function hire(i) {
    const d = data();
    const c = d.candidates[i];
    if (!c) return;
    if (genericOf(c.role).length >= ROLES[c.role].max) { UI().toast(`${ROLES[c.role].name} kadrosu dolu (en fazla ${ROLES[c.role].max})`, 2200); return; }
    if (d.hiresLeft !== undefined && d.hiresLeft <= 0) { UI().toast('Bu nöbetin işe alım kotası doldu (3).', 2200); return; }
    if (S().budget <= 0 || S().budget < c.fee) { UI().toast('Bütçe yetersiz', 1800); return; }
    S().budget -= c.fee;
    if (d.hiresLeft !== undefined) d.hiresLeft--;
    const id = 'g' + d.seq++;
    const h = { id, role: c.role, name: c.name, look: c.look };
    d.hired.push(h);
    d.recs[id] = { skill: c.skill, lvl: 1, xp: 0, energy: 100, morale: 75, salary: c.salary, trait: c.trait };
    d.candidates.splice(i, 1);
    spawnHired(h);
    sound('success');
    UI().toast(`✅ ${c.name} (${ROLES[c.role].name}) ekibe katıldı!`, 2600);
    if (VH.emit) VH.emit('hire', { role: c.role, id });
    persist();
  }

  // ---------------------------------------------------------------- Otomatik görevler
  function updateTasks(dt) {
    const ents = E().staff;
    for (const s of ents) {
      if (!s.def || !s.def.generic) continue;
      const role = s.def.gRole;
      if (s.task) {
        if (s.path.length) continue;
        s.task.t -= dt;
        if (s.task.t > 0) continue;
        const tk = s.task; s.task = null; s.busy = false; s.timer = rand(1, 3);
        if (tk.kind === 'clean' && VH.progress) { VH.progress.clean(tk.litter, s.id); gainXp(s.id, 5); }
        if (tk.kind === 'repair' && VH.equipment) { const tr = traitOf(rec(s.id)); VH.equipment.repair(tk.cat, 22 * efficiency(s.id) * (tr && tr.tidy ? tr.tidy : 1), true); gainXp(s.id, 6); }
        continue;
      }
      if (s.busy || s.path.length) continue;
      if (role === 'janitor' && VH.progress) {
        const l = VH.progress.claimLitter(s);
        if (l) {
          s.busy = true;
          s.task = { kind: 'clean', litter: l, t: 1.6 / ((traitOf(rec(s.id)) || {}).tidy || 1) };
          E().goTo(s, l.x, l.y, (e) => { e.emote = { icon: '🧹', until: performance.now() + 1600 }; });
        }
      }
      if (role === 'tech' && VH.equipment) {
        const job = VH.equipment.needsRepair();
        if (job) {
          const cell = E().accessCell(job.obj);
          if (cell) {
            s.busy = true;
            s.task = { kind: 'repair', cat: job.cat, t: 3 };
            E().goTo(s, cell[0] + 0.5, cell[1] + 0.5, (e) => { e.emote = { icon: '🔧', until: performance.now() + 3000 }; E().faceToward(e, job.obj.x + 0.5, job.obj.y + 0.5); });
          }
        }
      }
    }
  }

  function updateEnergy(dt) {
    const E2 = E();
    const regBusy = E2.patients.some((p) => p.state === 'registering');
    const d = data();
    for (const s of E2.staff) {
      const r = rec(s.id), tr = traitOf(r);
      const busy = s.busy || !!s.task || (s.id === 'receptionist' && regBusy) || (s.id === 'pharmacist' && !!E2.pharmacyFront);
      let drain = (busy ? 0.17 : 0.035) * (tr && tr.drain ? tr.drain : 1);
      if (d.restRoom) drain -= 0.02;
      r.energy = clamp(r.energy - drain * dt, 0, 100);
    }
  }

  // ---------------------------------------------------------------- Nöbet sonu: maaşlar, dinlenme, moral
  function payroll() {
    let total = 0;
    for (const s of activeStaff()) total += rec(s.id).salary;
    return total;
  }
  function onShiftEnd(sm) {
    const total = payroll();
    S().budget -= total;
    const broke = S().budget < 0;
    for (const s of activeStaff()) {
      const r = rec(s.id), tr = traitOf(r);
      r.energy = clamp(r.energy + 45 + (data().restRoom ? 20 : 0), 0, 100);
      r.morale = clamp(r.morale + (broke ? -10 : 1) + (r.energy < 40 ? -4 : 0) + (tr && tr.morale ? tr.morale : 0), 0, 100);
    }
    const avgM = Math.round(activeStaff().reduce((a, s) => a + rec(s.id).morale, 0) / Math.max(1, activeStaff().length));
    sm.extra.push({ icon: '💼', label: `Maaş gideri (${activeStaff().length} personel)`, value: '−' + money(total), cls: 'down-c' });
    sm.extra.push({ icon: '🙂', label: 'Ortalama moral', value: '%' + avgM, cls: avgM >= 60 ? 'up-c' : 'warn-c' });
    if (broke) sm.extra.push({ icon: '⚠️', label: 'Bütçe ekside: moral düştü', value: money(S().budget), cls: 'warn-c' });
    sm.payroll = total;
  }

  // ---------------------------------------------------------------- Arayüz
  function bar(label, v, cls) {
    const w = el('div', { className: 'mini-bar ' + (cls || '') });
    w.appendChild(el('span', { className: 'mb-label' }, label));
    const tr = el('span', { className: 'mb-track' });
    const fill = el('span', { className: 'mb-fill' });
    fill.style.width = clamp(v, 0, 100).toFixed(0) + '%';
    fill.style.background = v > 60 ? '#46c46a' : v > 30 ? '#f2c94c' : '#ff5a5f';
    tr.appendChild(fill);
    w.appendChild(tr);
    return w;
  }
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));

  function staffCard(s, rerender, compact) {
    const r = rec(s.id), tr = traitOf(r);
    const card = el('div', { className: 'staff-card' });
    const head = el('div', { className: 'sc-head' });
    head.appendChild(el('span', { className: 'sc-avatar' }, s.def && s.def.gRole ? ROLES[s.def.gRole].icon : /Dr\.|Op\./.test(s.name) ? '🧑‍⚕️' : /Hem\./.test(s.name) ? '👩‍⚕️' : '🧑‍💼'));
    const nm = el('div', { className: 'sc-name' });
    nm.appendChild(el('strong', {}, s.name));
    nm.appendChild(el('span', { className: 'muted' }, `${s.role}${s.floor ? ' · ' + VH.map.floorName(s.floor).split(' · ')[0] : ''}`));
    head.appendChild(nm);
    head.appendChild(el('span', { className: 'sc-stars', title: 'Yetenek' }, stars(r.skill)));
    card.appendChild(head);
    const meta = el('div', { className: 'sc-meta' });
    meta.appendChild(el('span', { className: 'pill' }, `Sv. ${r.lvl}`));
    meta.appendChild(el('span', { className: 'pill' }, `💰 ${money(r.salary)}/nöbet`));
    meta.appendChild(el('span', { className: 'pill' }, `⚙️ Verim %${Math.round(efficiency(s.id) * 100)}`));
    if (tr) { const tp = el('span', { className: 'pill trait', title: tr.desc }, `${tr.icon} ${tr.name}`); meta.appendChild(tp); }
    card.appendChild(meta);
    const bars = el('div', { className: 'sc-bars' });
    bars.appendChild(bar('Enerji', r.energy));
    bars.appendChild(bar('Moral', r.morale));
    bars.appendChild(bar('Deneyim', (r.xp / (100 * r.lvl)) * 100, 'xp'));
    card.appendChild(bars);
    const acts = el('div', { className: 'sc-acts' });
    const btn = (label, fn, dis, title) => { const b = el('button', { type: 'button', className: 'mini-btn' + (dis ? ' ghost' : '') }, label); b.disabled = !!dis; if (title) b.title = title; b.addEventListener('click', () => { fn(); rerender(); }); acts.appendChild(b); };
    btn(r.skill >= 5 ? '🎓 Maks.' : `🎓 Eğitim ${money(1200 * r.skill)}`, () => train(s.id), r.skill >= 5 || S().budget < 1200 * r.skill, 'Yetenek +1 yıldız, maaş +%12');
    btn(`🎁 Prim ${money(250 + 50 * r.lvl)}`, () => bonus(s.id), S().budget < 250 + 50 * r.lvl, 'Enerji +25, moral +12');
    btn('💸 Zam %10', () => raise(s.id), false, 'Moral +14, maaş kalıcı olarak +%10');
    if (s.def && s.def.generic) btn('İşten çıkar', () => fire(s.id), false);
    if (!compact) card.appendChild(acts); else card.appendChild(acts);
    return card;
  }

  function renderTab(list, rerender) {
    const staffList = activeStaff();
    const total = payroll();
    const d = data();
    const sum = el('div', { className: 'exam-meta' });
    [`👥 ${staffList.length} personel`, `💼 Bordro ${money(total)}/nöbet`, `⚡ Ort. enerji %${Math.round(staffList.reduce((a, s) => a + rec(s.id).energy, 0) / Math.max(1, staffList.length))}`, `🙂 Ort. moral %${Math.round(staffList.reduce((a, s) => a + rec(s.id).morale, 0) / Math.max(1, staffList.length))}`]
      .forEach((t) => sum.appendChild(el('span', {}, t)));
    list.appendChild(sum);
    // Tesis
    const fac = el('div', { className: 'shop-card' + (d.restRoom ? ' owned' : '') });
    fac.appendChild(el('div', { className: 'shop-icon' }, '☕'));
    const fb = el('div', { className: 'shop-body' });
    fb.appendChild(el('strong', {}, 'Personel Dinlenme Odası'));
    fb.appendChild(el('span', { className: 'opt-desc' }, 'Enerji kaybı azalır, nöbet arasında +20 ek enerji toparlanması.'));
    fac.appendChild(fb);
    const fbtn = el('button', { type: 'button', className: 'dlg-btn' + (d.restRoom || S().budget < 6000 ? ' ghost' : '') }, d.restRoom ? '✓ Aktif' : 'İnşa et ₺6.000');
    fbtn.disabled = d.restRoom || S().budget < 6000;
    fbtn.addEventListener('click', () => { if (S().budget < 6000) return; S().budget -= 6000; d.restRoom = true; sound('success'); if (VH.emit) VH.emit('buy', { group: 'facility', id: 'restRoom' }); persist(); rerender(); });
    fac.appendChild(fbtn);
    list.appendChild(fac);

    const jb = el('button', { type: 'button', className: 'dlg-btn ghost' }, '📋 İş İlanları Portalı (işe alım)');
    jb.addEventListener('click', () => VH.hospital.openPanel('ilan'));
    list.appendChild(jb);

    list.appendChild(el('div', { className: 'sec-title' }, 'Kadro'));
    staffList.slice().sort((a, b) => (a.floor || 0) - (b.floor || 0)).forEach((s) => list.appendChild(staffCard(s, rerender)));
  }

  function openCard(s) {
    const rer = () => { UI().openDialog(spec()); };
    const spec = () => {
      const node = el('div', {});
      node.appendChild(staffCard(s, rer));
      if (s.def && s.def.info) node.appendChild(el('p', { className: 'lesson' }, s.def.info));
      return { icon: s.def && s.def.gRole ? ROLES[s.def.gRole].icon : '👩‍⚕️', title: s.name, subtitle: s.role + ' · Personel Kartı', wide: true, node,
        actions: [{ label: '👥 Personel Yönetimi', fn: () => VH.hospital.openPanel('kadro') }, { label: 'Kapat', ghost: true }] };
    };
    VH.entities.faceToward(s, E().player.x, E().player.y);
    VH.entities.say(s, pick(s.def.greet), 2200);
    rer();
  }

  // ---------------------------------------------------------------- İş İlanları Portalı (Başhekimlik bilgisayarı)
  const CORE_JOBS = [
    { id: 'receptionist', icon: '🧑‍💼', name: 'Resepsiyon Görevlisi', fee: 1800, desc: 'Hasta kayıtlarını otomatik yapar; artık kayıt için bankoya koşmanız gerekmez.' },
    { id: 'pharmacist', icon: '💊', name: 'Eczacı', fee: 2600, desc: 'Reçeteleri otomatik teslim eder, stok kritikleşince sizi uyarır.' },
    { id: 'doctor2', icon: '🧑‍⚕️', name: 'Muayene Doktoru (Oda 2)', fee: 4200, desc: 'İkinci muayene odası açılır; rutin muayeneler iki kat hızlı akar.' },
  ];
  const quota = () => { const d = data(); if (d.hiresLeft === undefined) d.hiresLeft = 3; if (d.refreshLeft === undefined) d.refreshLeft = 2; return d; };
  function hireCore(id) {
    const j = CORE_JOBS.find((x) => x.id === id), d = quota();
    if (!j || (S().core && S().core[id])) return false;
    if (d.hiresLeft <= 0) { UI().toast('Bu nöbetin işe alım kotası doldu (3).', 2200); return false; }
    if (S().budget <= 0 || S().budget < j.fee) { UI().toast('Bütçe yetersiz', 1800); return false; }
    S().budget -= j.fee; d.hiresLeft--;
    S().core = S().core || {}; S().core[id] = true;
    E().syncCore();
    const s = E().staffById(id);
    if (s) { s.x = s.def.points[0][0]; s.y = s.def.points[0][1]; E().say(s, 'Göreve başladım Başhekimim!', 2600); }
    sound('success');
    UI().toast(`✅ ${j.name} işe başladı: süreç otomatikleşti.`, 2800);
    if (VH.emit) VH.emit('hire', { role: id, id, core: true });
    persist();
    return true;
  }
  function renderJobs(list, rerender) {
    const d = quota();
    const can = VH.logistics ? VH.logistics.deskGate(list) : true;
    const meta = el('div', { className: 'exam-meta' });
    [`👤 Kalan işe alım hakkı: ${d.hiresLeft}/3 (bu nöbet)`, `🔄 Kalan ilan yenileme: ${d.refreshLeft}/2`, `💰 Bütçe ${money(S().budget)}`].forEach((t) => meta.appendChild(el('span', {}, t)));
    list.appendChild(meta);
    const open = CORE_JOBS.filter((j) => !(S().core && S().core[j.id]));
    if (open.length) {
      list.appendChild(el('div', { className: 'sec-title' }, 'Kadro açıkları · otomasyon'));
      open.forEach((j) => {
        const card = el('div', { className: 'shop-card' });
        card.appendChild(el('div', { className: 'shop-icon' }, j.icon));
        const b = el('div', { className: 'shop-body' });
        b.appendChild(el('strong', {}, j.name)); b.appendChild(el('span', { className: 'opt-desc' }, j.desc));
        b.appendChild(el('span', { className: 'shop-meta' }, `İşe alım ${money(j.fee)} · Maaş ${money(BASE[j.id].salary)}/nöbet`));
        card.appendChild(b);
        const why = !can ? 'Bilgisayardan' : d.hiresLeft <= 0 ? 'Kota doldu' : S().budget <= 0 || S().budget < j.fee ? 'Bütçe yetersiz' : null;
        const btn = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why || 'İşe al');
        btn.disabled = !!why;
        btn.addEventListener('click', () => { hireCore(j.id); rerender(); });
        card.appendChild(btn);
        list.appendChild(card);
      });
    }
    list.appendChild(el('div', { className: 'sec-title' }, 'Gelen başvurular'));
    if (!d.candidates.length) refreshCandidates(3);
    const grid = el('div', { className: 'cand-grid' });
    d.candidates.forEach((c, i) => {
      const R = ROLES[c.role], tr = c.trait ? TRAITS[c.trait] : null;
      const card = el('div', { className: 'cand-card' });
      card.appendChild(el('div', { className: 'cand-role' }, `${R.icon} ${R.name}`));
      card.appendChild(el('strong', {}, c.name));
      card.appendChild(el('span', { className: 'sc-stars' }, stars(c.skill)));
      card.appendChild(el('span', { className: 'opt-desc' }, tr ? `${tr.icon} ${tr.name}: ${tr.desc}` : 'Özel bir özelliği yok.'));
      card.appendChild(el('span', { className: 'opt-desc' }, R.desc));
      card.appendChild(el('span', { className: 'shop-meta' }, `Maaş ${money(c.salary)}/nöbet · İşe alım ${money(c.fee)}`));
      const full = genericOf(c.role).length >= R.max;
      const why = !can ? 'Bilgisayardan' : full ? 'Kadro dolu' : d.hiresLeft <= 0 ? 'Kota doldu' : S().budget <= 0 || S().budget < c.fee ? 'Bütçe yetersiz' : null;
      const b = el('button', { type: 'button', className: 'dlg-btn' + (why ? ' ghost' : '') }, why || 'İşe al');
      b.disabled = !!why;
      b.addEventListener('click', () => { hire(i); rerender(); });
      card.appendChild(b);
      grid.appendChild(card);
    });
    list.appendChild(grid);
    const rb = el('button', { type: 'button', className: 'dlg-btn ghost' }, `🔄 Yeni ilan yayınla (₺500 · ${d.refreshLeft} hak)`);
    rb.disabled = !can || d.refreshLeft <= 0 || S().budget < 500 || S().budget <= 0;
    rb.addEventListener('click', () => { S().budget -= 500; d.refreshLeft--; refreshCandidates(3); rerender(); });
    list.appendChild(rb);
  }

  // ---------------------------------------------------------------- Kayıt doğrulama
  function sanitize(d) {
    const out = { recs: {}, hired: [], candidates: [], restRoom: false, seq: 1 };
    if (!d || typeof d !== 'object') return out;
    const num = (v, lo, hi, def) => (typeof v === 'number' && isFinite(v) ? clamp(v, lo, hi) : def);
    const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
    const col = (v) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : '#888888');
    const styles = ['short', 'long', 'bun', 'bald', 'curly', 'ponytail'];
    out.restRoom = d.restRoom === true;
    out.seq = Math.round(num(d.seq, 1, 1e6, 1));
    if (typeof d.hiresLeft === 'number') out.hiresLeft = Math.round(num(d.hiresLeft, 0, 3, 3));
    if (typeof d.refreshLeft === 'number') out.refreshLeft = Math.round(num(d.refreshLeft, 0, 2, 2));
    (Array.isArray(d.hired) ? d.hired : []).slice(0, 12).forEach((h) => {
      if (!h || !ROLES[h.role] || typeof h.id !== 'string' || !/^g\d{1,6}$/.test(h.id)) return;
      const lk = h.look || {};
      out.hired.push({ id: h.id, role: h.role, name: str(h.name, 40) || ROLES[h.role].name, look: { coat: col(lk.coat), pants: col(lk.pants), skin: col(lk.skin), hair: col(lk.hair), hairStyle: styles.includes(lk.hairStyle) ? lk.hairStyle : 'short' } });
    });
    const recs = d.recs && typeof d.recs === 'object' ? d.recs : {};
    Object.keys(recs).slice(0, 60).forEach((id) => {
      if (!/^[A-Za-z0-9]{1,20}$/.test(id)) return;
      const r = recs[id] || {};
      out.recs[id] = { skill: Math.round(num(r.skill, 1, 5, 2)), lvl: Math.round(num(r.lvl, 1, 10, 1)), xp: num(r.xp, 0, 1e4, 0), energy: num(r.energy, 0, 100, 100),
        morale: num(r.morale, 0, 100, 72), salary: Math.round(num(r.salary, 0, 1e5, 600)), trait: TRAITS[r.trait] ? r.trait : null };
    });
    return out;
  }

  // ---------------------------------------------------------------- Kayıt ol
  VH.on('registered', (d) => gainXp(d.staff, 6));
  VH.on('examDone', (d) => { gainXp(d.staff, 10); genericOf('doctor').forEach((h) => gainXp(h.id, 3)); });
  VH.on('labDone', (d) => { gainXp(d.staff, 8); if (VH.hospital.has('hires', 'labTech2')) gainXp('labTech2', 4); });
  VH.on('pharmacyAuto', (d) => { gainXp(d.staff, 5); if (VH.hospital.has('hires', 'pharmTech')) gainXp('pharmTech', 4); });
  VH.on('counsel', () => gainXp('pharmacist', 4));
  VH.on('erSuccess', () => { nurseIds().forEach((id) => gainXp(id, 12)); if (VH.hospital.has('hires', 'erDoctor')) gainXp('erDoctor', 12); });
  VH.on('shiftEnd', onShiftEnd);
  VH.on('shiftStart', () => { refreshCandidates(3); const d = data(); d.hiresLeft = 3; d.refreshLeft = 2; });

  VH.panelTabs.push({ id: 'kadro', label: '👥 Personel Yönetimi', order: 10, render: renderTab });
  VH.panelTabs.push({ id: 'ilan', label: '📋 İş İlanları', order: 11, render: renderJobs });
  VH.interactHandlers.push((t) => {
    if (t.type === 'staff' && t.ref.def && t.ref.def.generic) { openCard(t.ref); return true; }
    return false;
  });

  VH.staff = {
    ROLES, TRAITS, BASE,
    factor, timeFactor, efficiency, rec, payroll, gainXp, train, raise, bonus, fire, hire, openCard,
    hireCore, CORE_JOBS, quota,
    /** Yeni ilan yayınla: nöbet başına 2 hak, ₺500. */
    postAd() { const d = quota(); if (d.refreshLeft <= 0 || S().budget < 500 || S().budget <= 0) return false; S().budget -= 500; d.refreshLeft--; refreshCandidates(3); sound('ok'); return true; },
    energy: (id) => (data().recs[id] ? data().recs[id].energy : 100),
    get hired() { return generic(); },
    get candidates() { return data().candidates; },
    refreshCandidates,
    sanitize,
    init() {
      const d = data();
      d.hired.forEach((h) => spawnHired(h));
      if (!d.candidates.length) refreshCandidates(3);
    },
    update(dt) { updateEnergy(dt); updateTasks(dt); },
    renderTab,
  };
})();
