// Vita Hospital — localStorage kayıt sistemi
// Kaydedilenler: bütçe, itibar, hasta güvenliği, hastane seviyesi, açılan servisler/katlar,
// yükseltmeler, işe alınan personel, çözülen vaka arşivi, vaka sırası, istatistikler, ayarlar.
// Yüklenen veri asla doğrudan güvenilmez: her alan türüne ve izinli değerlere göre doğrulanır.
(function () {
  const VH = (window.VH = window.VH || {});
  const KEY = 'vitaHospital.save.v1';
  const VERSION = 1;
  const params = new URLSearchParams(location.search);
  const disabled = params.has('nosave') || params.has('selftest');
  let timer = 0;
  let lastSavedAt = 0;

  function storage() {
    try {
      const s = window.localStorage;
      const t = '__vh_test__';
      s.setItem(t, '1'); s.removeItem(t);
      return s;
    } catch (_) { return null; }
  }

  const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
  const num = (v, d, lo, hi) => (isNum(v) ? Math.min(hi, Math.max(lo, v)) : d);
  const int = (v, d, lo, hi) => Math.round(num(v, d, lo, hi));
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

  /** Yalnızca katalogda bulunan anahtarlar ve true değerleri kabul edilir. */
  function flags(obj, allowed) {
    const out = {};
    if (obj && typeof obj === 'object') allowed.forEach((k) => { if (obj[k] === true) out[k] = true; });
    return out;
  }

  function snapshot() {
    const st = VH.cases.state, E = VH.entities;
    return {
      v: VERSION,
      savedAt: Date.now(),
      level: VH.hospital.level(),
      budget: Math.round(st.budget),
      reputation: st.reputation,
      safety: st.safety,
      upgrades: st.upgrades, hires: st.hires, services: st.services,
      dev: st.dev, shiftN: st.shiftN, shiftT: st.shiftT, shiftLog: (st.shiftLog || []).slice(-10),
      solved: st.solved.slice(-300),
      casesTotal: st.casesTotal || 0,
      vip: st.vip,
      order: st.order, idx: st.idx,
      stats: { registered: E.stats.registered, served: E.stats.served, ticket: E.stats.ticket },
      introSeen: VH.cases.introSeen,
      staffData: st.staffData, equip: st.equip, layout: st.layout, prog: st.prog,
      loan: st.loan,       core: st.core, stock: st.stock, pending: st.pending, parts: st.parts, energy: st.energy, lastCard: st.lastCard, cards: st.cards,
      settings: { labels: VH.map.labels, rot: VH.map.rot },
    };
  }

  function sanitize(d) {
    const caseIds = VH.cases.CASES.map((c) => c.id);
    const grades = ['best', 'acceptable', 'risky'];
    const choices = ['tests', 'refer', 'complete'];
    const H = VH.hospital;
    const solved = (Array.isArray(d.solved) ? d.solved : []).slice(-300)
      .filter((s) => s && caseIds.includes(s.id) && grades.includes(s.grade) && choices.includes(s.choice))
      .map((s) => ({
        id: s.id, title: str(s.title, 60), name: str(s.name, 60), age: int(s.age, 0, 0, 120),
        grade: s.grade, choice: s.choice, score: int(s.score, 0, 0, 100),
        keyFound: int(s.keyFound, 0, 0, 20), keyTotal: int(s.keyTotal, 1, 1, 20),
        labs: s.labs === true, hasty: s.hasty === true, t: int(s.t, 0, 0, 8.64e15),
      }));
    const order = (Array.isArray(d.order) ? d.order : []).filter((id) => caseIds.includes(id));
    return {
      budget: num(d.budget, 20000, -1e9, 1e9),
      reputation: int(d.reputation, 50, 0, 100),
      safety: int(d.safety, 80, 0, 100),
      upgrades: flags(d.upgrades, H.UPGRADES.map((x) => x.id)),
      hires: flags(d.hires, H.HIRES.map((x) => x.id)),
      services: flags(d.services, H.SERVICES.map((x) => x.id)),
      dev: (() => { const o = {}; ["speed", "treat", "capacity"].forEach((k) => { const v = d.dev && d.dev[k]; if (isNum(v)) o[k] = int(v, 0, 0, 3); }); return o; })(),
      shiftN: int(d.shiftN, 1, 1, 1e6),
      shiftT: int(d.shiftT, 300, 20, 300),
      shiftLog: (Array.isArray(d.shiftLog) ? d.shiftLog : []).slice(-10).filter((s) => s && typeof s === "object").map((s) => ({
        n: int(s.n, 1, 1, 1e6), night: s.night === true, treated: int(s.treated, 0, 0, 1e5), er: int(s.er, 0, 0, 1e5), erFail: int(s.erFail, 0, 0, 1e5),
        cases: int(s.cases, 0, 0, 1e5), pharmacy: int(s.pharmacy, 0, 0, 1e5), angry: int(s.angry, 0, 0, 1e5), rep: int(s.rep, 0, -100, 100),
        income: int(s.income, 0, -1e9, 1e9), bestCombo: int(s.bestCombo, 1, 1, 3), payroll: int(s.payroll, 0, 0, 1e7) })),
      solved, order,
      // Eski kayıtlarda toplam vaka sayacı yoksa taburcu sayısı + çözülen vakalardan tahmin edilir
      casesTotal: isNum(d.casesTotal) ? int(d.casesTotal, 0, 0, 1e7) : int((d.stats && d.stats.served) || 0, 0, 0, 1e7) + solved.length,
      idx: int(d.idx, 0, 0, order.length),
      stats: {
        registered: int(d.stats && d.stats.registered, 0, 0, 1e7),
        served: int(d.stats && d.stats.served, 0, 0, 1e7),
        ticket: int(d.stats && d.stats.ticket, 0, 0, 1e7),
      },
      introSeen: d.introSeen === true,
      staffData: VH.staff ? VH.staff.sanitize(d.staffData) : null,
      equip: VH.equipment ? VH.equipment.sanitize(d.equip) : null,
      layout: VH.build ? VH.build.sanitize(d.layout) : null,
      prog: VH.progress ? VH.progress.sanitize(d.prog) : null,
      vip: VH.vip ? VH.vip.sanitize(d.vip) : null,
      core: d.core && typeof d.core === 'object' ? flags(d.core, ['receptionist', 'pharmacist', 'doctor2']) : null,
      logi: VH.logistics ? VH.logistics.sanitize(null, d) : null,
      energy: num(d.energy, 100, 0, 100),
      loan: d.loan && typeof d.loan === 'object' && isNum(d.loan.left) && d.loan.left > 0 ? { left: int(d.loan.left, 1, 1, 5), pay: int(d.loan.pay, 4800, 0, 10000) } : null,
      lastCard: VH.terminal ? VH.terminal.sanitizeCard(d.lastCard) : null,
      cards: (Array.isArray(d.cards) ? d.cards : []).slice(-10).filter((x) => x && /^[A-F][+−]?$/.test(String(x.overall))).map((x) => ({ n: int(x.n, 1, 1, 1e6), overall: x.overall })),
      settings: {
        labels: !(d.settings && d.settings.labels === false),
        rot: int(d.settings && d.settings.rot, 0, 0, 3),
      },
    };
  }

  /** Kaydı yükler; başarılıysa true. Bozuk/eski kayıtlar sessizce yok sayılır. */
  function load() {
    if (disabled) return false;
    const s = storage();
    if (!s) return false;
    let raw = null;
    try { raw = s.getItem(KEY); } catch (_) { return false; }
    if (!raw) return false;
    let d;
    try { d = JSON.parse(raw); } catch (_) { console.warn('[VH.save] bozuk kayıt yok sayıldı'); return false; }
    if (!d || typeof d !== 'object' || d.v !== VERSION) return false;
    const c = sanitize(d);
    const st = VH.cases.state;
    st.budget = c.budget; st.reputation = c.reputation; st.safety = c.safety;
    st.upgrades = c.upgrades; st.hires = c.hires; st.services = c.services;
    st.dev = c.dev; st.shiftN = c.shiftN; st.shiftT = c.shiftT; st.shiftLog = c.shiftLog;
    st.solved = c.solved; st.order = c.order; st.idx = c.idx;
    st.casesTotal = c.casesTotal;
    if (c.staffData) st.staffData = c.staffData;
    if (c.equip) st.equip = c.equip;
    if (c.layout) st.layout = c.layout;
    if (c.prog) st.prog = c.prog;
    if (c.vip) st.vip = c.vip;
    // Eski kayıtlarda çekirdek kadro alanı yoksa tam kadro kabul edilir (ilerleme kaybolmasın)
    st.core = c.core || { receptionist: true, pharmacist: true, doctor2: true };
    if (c.logi) { st.stock = c.logi.stock; st.pending = c.logi.pending; st.parts = c.logi.parts; }
    st.energy = c.energy;
    st.loan = c.loan;
    if (c.lastCard) st.lastCard = c.lastCard;
    st.cards = c.cards;
    Object.assign(VH.entities.stats, c.stats);
    VH.cases.introSeen = c.introSeen;
    VH.map.labels = c.settings.labels;
    VH.map.setRotation(c.settings.rot);
    lastSavedAt = isNum(d.savedAt) ? d.savedAt : 0;
    return true;
  }

  function save() {
    if (disabled || window.__vhNoSave) return false;
    const s = storage();
    if (!s) return false;
    try {
      s.setItem(KEY, JSON.stringify(snapshot()));
      lastSavedAt = Date.now();
      return true;
    } catch (_) { return false; }
  }

  function reset() {
    const s = storage();
    try { if (s) s.removeItem(KEY); } catch (_) { /* yoksay */ }
    lastSavedAt = 0;
  }

  window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && VH.cases) save(); });
  window.addEventListener('pagehide', () => { if (VH.cases) save(); });

  VH.save = {
    KEY, load, save, reset,
    get enabled() { return !disabled && !!storage(); },
    get lastSavedAt() { return lastSavedAt; },
    /** Periyodik otomatik kayıt (15 sn). */
    update(dt) {
      timer += dt;
      if (timer >= 15) { timer = 0; save(); }
    },
    _sanitize: sanitize,
  };
})();
