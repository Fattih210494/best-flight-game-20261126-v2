// WebAudio synth sounds only — no audio files. Starts on first user gesture.
export function createAudio() {
  let ctx = null; let engine = null; let engineGain = null; let wind = null; let windGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engine = ctx.createOscillator();
      engine.type = 'sawtooth';
      engine.frequency.value = 70;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 420;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      engine.connect(lp); lp.connect(engineGain); engineGain.connect(ctx.destination);
      engine.start();
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
      windGain = ctx.createGain(); windGain.gain.value = 0;
      wind.connect(bp); bp.connect(windGain); windGain.connect(ctx.destination);
      wind.start();
    } catch { ctx = null; }
  }
  function unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); }
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }

  return {
    unlock,
    setEngine(speedNorm) {
      if (!ctx || muted) return;
      engine.frequency.setTargetAtTime(60 + speedNorm * 90, ctx.currentTime, 0.1);
      engineGain.gain.setTargetAtTime(0.05 + speedNorm * 0.05, ctx.currentTime, 0.1);
      windGain.gain.setTargetAtTime(speedNorm * 0.06, ctx.currentTime, 0.1);
    },
    ring() { blip(880, 0.18, 'sine', 0.22); blip(1318, 0.28, 'sine', 0.18, 0.08); },
    nearMiss() { blip(1568, 0.12, 'triangle', 0.15); },
    crash() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.5;
      src.connect(g); g.connect(ctx.destination); src.start(t);
      blip(110, 0.4, 'sawtooth', 0.25);
    },
    click() { blip(660, 0.07, 'square', 0.08); },
    toggleMute() { muted = !muted; if (engineGain) engineGain.gain.value = 0; return muted; },
  };
}
