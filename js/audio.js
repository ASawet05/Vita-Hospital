// Vita Hospital — Web Audio ile sentezlenen hafif ses efektleri (ses dosyası yok)
// Tarayıcılar sesi ancak bir kullanıcı etkileşiminden sonra başlatır; ilk dokunuş/tuşta açılır.
(function () {
  const VH = (window.VH = window.VH || {});
  const MUTE_KEY = 'vitaHospital.muted';
  const MASTER = 0.22;

  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = window.localStorage.getItem(MUTE_KEY) === '1'; } catch (_) { /* depolama kapalı */ }
  const last = {};
  const counts = {};

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : MASTER;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (_) { ctx = null; }
    return ctx;
  }

  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  }
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  function tone(freq, at, dur, o) {
    o = o || {};
    const t = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t + dur);
    const vol = o.vol || 0.4;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(at, dur, o) {
    o = o || {};
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.value = o.freq || 800;
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function siren() {
    // Yumuşak, düşük sesli iki tonlu siren (~3 sn)
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 760;
    lfo.frequency.value = 1.6;
    lfoGain.gain.value = 170;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.3);
    g.gain.setValueAtTime(0.09, t + 2.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
    osc.connect(g); g.connect(master);
    osc.start(t); lfo.start(t);
    osc.stop(t + 3.3); lfo.stop(t + 3.3);
  }

  const SOUNDS = {
    step:    { gap: 0.12, fn: () => noise(0, 0.05, { vol: 0.05, freq: 1100, q: 0.8 }) },
    door:    { gap: 0.4, fn: () => { noise(0, 0.28, { vol: 0.07, freq: 450, filter: 'lowpass' }); tone(523, 0.02, 0.14, { vol: 0.08 }); tone(392, 0.12, 0.2, { vol: 0.08 }); } },
    click:   { gap: 0.05, fn: () => tone(880, 0, 0.05, { type: 'triangle', vol: 0.07 }) },
    ok:      { gap: 0.1, fn: () => { tone(660, 0, 0.12, { vol: 0.16 }); tone(880, 0.09, 0.2, { vol: 0.16 }); } },
    clue:    { gap: 0.1, fn: () => { tone(1175, 0, 0.09, { type: 'triangle', vol: 0.12 }); tone(1568, 0.07, 0.18, { type: 'triangle', vol: 0.12 }); } },
    labDone: { gap: 0.3, fn: () => { tone(1319, 0, 0.18, { vol: 0.16 }); tone(988, 0.16, 0.35, { vol: 0.16 }); } },
    notify:  { gap: 0.3, fn: () => { tone(784, 0, 0.1, { vol: 0.14 }); tone(1047, 0.1, 0.22, { vol: 0.14 }); } },
    success: { gap: 0.3, fn: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.28, { vol: 0.15 })) },
    error:   { gap: 0.3, fn: () => tone(220, 0, 0.28, { type: 'square', vol: 0.05, glide: 160 }) },
    alarm:   { gap: 1, fn: () => [0, 0.22, 0.44].forEach((a) => tone(880, a, 0.12, { type: 'square', vol: 0.04 })) },
    siren:   { gap: 3, fn: siren },
    combo:   { gap: 0.5, fn: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.06, 0.16, { type: 'triangle', vol: 0.12 })) },
  };

  function play(name) {
    const s = SOUNDS[name];
    if (!s || muted) return false;
    const c = ensure();
    if (!c || c.state !== 'running') return false;
    const now = c.currentTime;
    if (last[name] !== undefined && now - last[name] < s.gap) return false;
    last[name] = now;
    try { s.fn(); counts[name] = (counts[name] || 0) + 1; return true; } catch (_) { return false; }
  }

  function setMuted(m) {
    muted = !!m;
    try { window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (_) { /* yoksay */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : MASTER, ctx.currentTime, 0.02);
    return muted;
  }

  VH.audio = {
    play,
    setMuted,
    toggle() { return setMuted(!muted); },
    get muted() { return muted; },
    get state() { return ctx ? ctx.state : 'none'; },
    unlock,
    SOUNDS: Object.keys(SOUNDS),
    _counts: counts,
  };
})();
