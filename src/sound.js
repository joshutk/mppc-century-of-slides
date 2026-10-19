// ─── SOUND ───────────────────────────────────────────────────────────────
// The slide-change "ka-chunk" and a quiet fan hum.  Uses the recorded
// projector sample when window.__AUDIO__ is present (pipeline step 8);
// otherwise the same sequence is synthesised: solenoid click, motor whir,
// tray clunk, slide drop, shutter tick.
//
// Browsers only start audio after a tap, so the AudioContext is created on
// the first pointerdown.  Sound is on by default; mute is remembered.
const MUTE_KEY = "mppcCarousel.muted";

// Tuning for the recorded sample.  RATE below 1 pitches it down and slows
// it equally; the slide timing is stretched to match so picture and sound
// stay together.  SOFTEN is a high-cut that takes the edge off the clicks.
const VOLUME = 0.3;     // about -10 dB
const RATE = 0.9;       // about 2 semitones down
const SOFTEN = 4500;    // Hz

const Sound = {
  ctx: null, master: null, noise: null, fanNodes: null, rec: null,
  muted: false,
  // When each part of the mechanism is heard, ms after the sound starts.
  // The slide animation and the caption follow these.  The recorded sample
  // brings its own (measured by pipeline step 8); these fit the synthesis.
  timing: { lift: 10, lifted: 200, turn: 600, drop: 770, settle: 960 },

  init() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === "1"; } catch (e) { this.muted = false; }
    const A = window.__AUDIO__;
    if (A && A.timing) {
      this.timing = {};
      for (const [k, v] of Object.entries(A.timing)) this.timing[k] = Math.round(v / RATE);
    }
  },

  // How long after scheduling the listener actually hears it.
  latency() {
    if (!this.ctx || this.muted) return 0;
    const l = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
    return clamp(l * 1000, 0, 150) + 10;
  },

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : VOLUME;
      this.master.connect(this.ctx.destination);
      this.soft = this.ctx.createBiquadFilter();
      this.soft.type = "lowpass";
      this.soft.frequency.value = SOFTEN;
      this.soft.Q.value = 0.5;
      this.soft.connect(this.master);
      this.noise = this.makeNoise(2);
      this.loadRecorded();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch (e) { /* private mode */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : VOLUME, this.ctx.currentTime, 0.03);
  },

  loadRecorded() {
    const A = window.__AUDIO__;
    if (!A) return;
    const decode = (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
      return new Promise((res) => this.ctx.decodeAudioData(bytes, res, () => res(null)));
    };
    this.rec = {};
    if (A.kachunk) decode(A.kachunk).then((b) => { this.rec.kachunk = b; });
    if (A.fan) decode(A.fan).then((b) => { this.rec.fan = b; });
  },

  makeNoise(sec) {
    const b = this.ctx.createBuffer(1, Math.round(this.ctx.sampleRate * sec), this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  },

  // filtered noise burst with a fast exponential decay
  burst(t, dur, freq, q, type, gain) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  },

  // low body resonance of the projector housing
  thump(t, f0, f1, dur, gain) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },

  kachunk() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.01;
    if (this.rec && this.rec.kachunk) {
      const s = this.ctx.createBufferSource();
      s.buffer = this.rec.kachunk;
      s.playbackRate.value = RATE;
      s.connect(this.soft);
      s.start(t);
      return;
    }
    const T = this.timing, s = (ms) => t + ms / 1000;
    this.burst(s(T.lift), 0.03, 3200, 1.2, "bandpass", 0.5);         // solenoid click, lift starts
    this.thump(s(T.lift), 180, 90, 0.08, 0.35);
    this.burst(s(T.lifted - 20), 0.04, 2400, 1.5, "bandpass", 0.3);  // lifter arm at the top
    this.burst(s(T.lifted + 20), 0.3, 700, 0.8, "bandpass", 0.07);   // tray turning
    this.burst(s(T.turn), 0.09, 420, 1.5, "bandpass", 0.55);         // tray clicks into the slot
    this.thump(s(T.turn), 120, 60, 0.16, 0.55);
    this.burst(s(T.drop), 0.05, 2100, 2.5, "bandpass", 0.6);         // slide drops into the gate
    this.burst(s(T.drop), 0.03, 5000, 0.7, "highpass", 0.25);
    this.thump(s(T.drop), 160, 80, 0.07, 0.4);
    this.burst(s(T.settle - 60), 0.025, 2800, 2, "bandpass", 0.2);   // shutter opens
  },

  fanOn() {
    if (!this.ctx || this.fanNodes) return;
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.5);
    g.connect(this.master);
    const nodes = [];
    if (this.rec && this.rec.fan) {
      const s = c.createBufferSource();
      s.buffer = this.rec.fan; s.loop = true;
      s.connect(g); s.start(); nodes.push(s);
    } else {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), sg = c.createGain();
      s.buffer = this.noise; s.loop = true;
      f.type = "lowpass"; f.frequency.value = 380; sg.gain.value = 0.035;
      s.connect(f); f.connect(sg); sg.connect(g); s.start();
      const hum = c.createOscillator(), hg = c.createGain();
      hum.frequency.value = 120; hg.gain.value = 0.006;
      hum.connect(hg); hg.connect(g); hum.start();
      nodes.push(s, hum);
    }
    this.fanNodes = { g, nodes };
  },

  fanOff() {
    if (!this.fanNodes) return;
    const { g, nodes } = this.fanNodes, t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0.0001, t, 0.15);
    for (const n of nodes) n.stop(t + 0.8);
    this.fanNodes = null;
  },
};
