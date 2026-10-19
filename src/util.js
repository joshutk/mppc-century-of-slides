// ─── UTIL ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mod = (n, m) => ((n % m) + m) % m;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ?lite=1, or the viewer asked for less motion: a plain crossfade, no blur.
const LITE = new URLSearchParams(location.search).has("lite") ||
  (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

// Run a Web Animation and leave the element at its last frame.  Browsers
// without el.animate just jump to the end state.
function play(el, frames, opts) {
  const last = frames[frames.length - 1];
  const settle = () => {
    for (const k of Object.keys(last)) if (k !== "offset" && k !== "easing") el.style[k] = last[k];
  };
  if (!el.animate) { settle(); return Promise.resolve(); }
  for (const a of el.getAnimations()) a.cancel();
  const a = el.animate(frames, Object.assign({ fill: "forwards" }, opts));
  return a.finished.then(() => { settle(); a.cancel(); }, () => {});
}

// Small seeded PRNG so the dust pattern is the same on every load.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── IMAGE PRELOAD ───────────────────────────────────────────────────────
// Decoded images keyed by URL, so a slide is ready before it drops in.
const Preload = {
  cache: new Map(),
  get(url) {
    if (!this.cache.has(url)) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      const p = (img.decode ? img.decode() : new Promise((r, j) => { img.onload = r; img.onerror = j; }))
        .then(() => img, () => img);
      this.cache.set(url, p);
    }
    return this.cache.get(url);
  },
  keep(urls) {
    for (const u of [...this.cache.keys()]) if (!urls.includes(u)) this.cache.delete(u);
    for (const u of urls) this.get(u);
  },
};
