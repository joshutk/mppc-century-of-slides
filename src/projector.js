// ─── PROJECTOR ───────────────────────────────────────────────────────────
// States: shelf -> loading -> showing <-> cycling.  Slot 0 is the empty
// load slot; slides sit in slots 1..N.
//
// One slide change follows the sound (Sound.timing, ms after it starts;
// the recorded sample's are roughly 14 / 199 / 603 / 768 / 972):
//
//   lift    -> lifted   slide lifts out of the gate (on screen it drops
//                       away, the lens flips the picture); caption fades out
//   lifted  -> drop     empty gate: warm lamp light, dust, a flicker;
//                       the tray turns and lands on the "turn" clunk;
//                       the caption stays blank
//   drop    -> settle   next slide drops in: rises into place, bounces on
//                       the settling rattle and comes into focus; the new
//                       caption fades in alongside
//
// The next image is decoded before the sound starts so picture and sound
// stay together.  Presses during a change are remembered (one at most),
// like holding the button.  "Change tray" or Esc cancels cleanly.
const Projector = {
  data: null, tray: null, pos: 0, busy: false, queued: null, token: 0,
  front: 0, showing: false, mounts: [],

  init(data) {
    this.data = data;
    this.mounts = [$("mount-a"), $("mount-b")];
    this.beam = $("beam");
    Lamp.draw($("dust"));
    Ring.build($("ring"), 80);
    if (window.ResizeObserver) new ResizeObserver(() => this.fit(false)).observe($("screen"));
    else window.addEventListener("resize", () => this.fit(false));
  },

  get n() { return this.tray ? this.tray.slides.length : 0; },
  slideAt(p) { return p >= 1 && p <= this.n ? this.tray.slides[p - 1] : null; },

  // Beam takes the shape of the slide in the gate; an empty gate is 3:2.
  fit(animate) {
    const r = $("screen").getBoundingClientRect();
    if (!r.width) return;
    const s = this.slideAt(this.pos);
    const asp = s ? s.w / s.h : 1.5;
    const w = Math.min(r.width * 0.96, r.height * 0.95 * asp);
    this.beam.classList.toggle("resizing", !!animate && !LITE);
    this.beam.style.width = Math.round(w) + "px";
    this.beam.style.height = Math.round(w / asp) + "px";
  },

  async load(i) {
    Sound.unlock();
    const tok = ++this.token;
    this.busy = false; this.queued = null;
    this.tray = this.data.trays[i];
    this.pos = 0; this.showing = false;
    for (const m of this.mounts) { if (m.getAnimations) m.getAnimations().forEach((a) => a.cancel()); m.style.opacity = 0; }
    $("shelf").hidden = true;
    $("projector").hidden = false;
    $("tray-name").textContent = this.tray.name;
    document.documentElement.style.setProperty("--accent", this.tray.accent);
    Ring.build($("ring"), Math.max(80, this.n));
    Ring.set(0);
    this.setLit(true);
    $("gate-msg").hidden = true;
    this.fit(false);
    this.showCaption();
    Sound.fanOn();
    this.preloadAround();
    $("fwd").focus({ preventScroll: true });
    await wait(700);
    if (tok === this.token && this.pos === 0 && !this.busy) this.press(1);
  },

  toShelf() {
    this.token++;
    this.busy = false; this.queued = null; this.tray = null;
    Sound.fanOff();
    $("projector").hidden = true;
    $("shelf").hidden = false;
    const first = document.querySelector(".tray");
    if (first) first.focus({ preventScroll: true });
  },

  setLit(on) {
    this.beam.classList.toggle("showing", !on);
    if (on) {
      this.beam.classList.remove("lit");
      void this.beam.offsetWidth;            // restart the flicker
      this.beam.classList.add("lit");
      Lamp.jiggle($("dust"));
    } else {
      this.beam.classList.remove("lit");
    }
  },

  next(dir) {
    const n = this.n;
    if (dir > 0) return this.pos >= n ? 0 : this.pos + 1;
    return this.pos === 0 ? n : this.pos - 1;
  },

  press(dir, target) {
    Sound.unlock();
    if (!this.tray) return;
    const key = dir > 0 ? $("fwd") : $("rev");
    key.classList.add("pressed");
    setTimeout(() => key.classList.remove("pressed"), 140);
    if (this.busy) { this.queued = { dir, target }; return; }
    this.cycle(dir, target);
  },

  async cycle(dir, target) {
    this.busy = true;
    const tok = ++this.token;
    const to = target != null ? target : this.next(dir);
    const out = this.mounts[this.front], inn = this.mounts[1 - this.front];
    const next = this.slideAt(to);
    const img = inn.querySelector("img");

    // have the next picture decoded before the sound starts, so the drop
    // can't fall behind the clack (normally instant: it was preloaded)
    if (next) {
      await Promise.race([Preload.get(next.src), wait(700)]);
      if (tok !== this.token) return;
      img.src = next.src;
      img.alt = next.year + " " + next.caption;
      try { await Promise.race([img.decode(), wait(300)]); } catch (e) { /* show it anyway */ }
      if (tok !== this.token) return;
    }

    const T = Sound.timing;
    Sound.kachunk();
    const t0 = performance.now() + Sound.latency();
    const at = (ms) => wait(Math.max(0, t0 + ms - performance.now()));
    const live = () => tok === this.token;
    $("gate-msg").hidden = true;

    // 1. lift: slide out, caption out
    await at(T.lift);
    if (!live()) return;
    const liftMs = Math.max(120, T.lifted - T.lift);
    const capOut = this.captionOut(liftMs);
    if (this.showing) {
      if (LITE) await play(out, [{ opacity: 1 }, { opacity: 0 }], { duration: liftMs });
      else await play(out, [
        { transform: "translateY(0)", filter: "blur(0px)", opacity: 1 },
        { transform: "translateY(9%)", filter: "blur(2px)", opacity: 0 },
      ], { duration: liftMs, easing: "cubic-bezier(.55,0,1,.45)" });
    }
    await capOut;
    if (!live()) return;

    // 2. empty gate: lamp light; the tray turns and lands on the clunk
    this.showing = false;
    this.pos = to;
    this.setLit(true);
    this.fit(true);
    const turnFrom = T.lifted + 30;
    // one slot lands on the clunk; a spin through the empty slots (end of
    // the tray) takes as long as it needs
    const oneSlot = Ring.span(to, dir) <= 2;
    const ringDone = Ring.turn(to, dir, oneSlot ? Math.max(200, T.turn - turnFrom) : 0);
    await at(T.drop);
    if (!live()) return;

    // 3. drop: next slide (or the empty-slot message), caption in
    const settleMs = Math.max(160, T.settle - T.drop);
    if (next) {
      this.beam.classList.remove("resizing");
      this.setCaption();
      const capIn = this.captionIn(settleMs + 60);
      if (LITE) await play(inn, [{ opacity: 0 }, { opacity: 1 }], { duration: settleMs });
      else {
        const pop = play(inn, [
          { transform: "translateY(6%)", filter: "blur(3px) contrast(1)", opacity: 0, offset: 0 },
          { transform: "translateY(-0.9%)", filter: "blur(1.6px) contrast(1)", opacity: 1, offset: 0.3 },
          { transform: "translateY(0.4%)", filter: "blur(0.8px) contrast(1.05)", opacity: 1, offset: 0.62 },
          { transform: "translateY(0)", filter: "blur(0px) contrast(1)", opacity: 1, offset: 1 },
        ], { duration: settleMs + 80, easing: "ease-out" });
        await wait(60);
        this.setLit(false);
        await pop;
      }
      await capIn;
      if (!live()) return;
      this.setLit(false);
      this.front = 1 - this.front;
      this.showing = true;
    } else {
      $("gate-text").textContent = dir > 0
        ? "That’s the whole tray. Press Forward to see it again, or choose another tray."
        : "This is the start of the tray. Press Forward for the first slide.";
      $("gate-msg").hidden = false;
      this.setCaption();
      await this.captionIn(settleMs + 60);
    }
    await ringDone;
    if (!live()) return;
    this.preloadAround();
    this.busy = false;
    if (this.queued) {
      const q = this.queued;
      this.queued = null;
      this.cycle(q.dir, q.target);
    }
  },

  // ─── caption ───
  captionParts() { return [$("cap-year"), $("cap-text"), $("cap-count")]; },

  setCaption() {
    const s = this.slideAt(this.pos);
    $("cap-year").textContent = s ? s.year : "";
    $("cap-text").textContent = s ? s.caption : this.tray.name;
    $("cap-count").textContent = s ? this.pos + " of " + this.n : this.n + " slides";
  },

  captionOut(ms) {
    return Promise.all(this.captionParts().map((el) => play(el, [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: LITE ? "translateY(0)" : "translateY(6px)" },
    ], { duration: ms, easing: "ease-in" })));
  },

  captionIn(ms) {
    return Promise.all(this.captionParts().map((el, i) => play(el, [
      { opacity: 0, transform: LITE ? "translateY(0)" : "translateY(-6px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: ms, delay: i * 30, easing: "ease-out" })));
  },

  showCaption() {
    this.setCaption();
    return this.captionIn(300);
  },

  preloadAround() {
    const urls = [];
    for (const p of [this.pos, this.pos + 1, this.pos + 2, this.pos - 1, 1]) {
      const s = this.slideAt(p);
      if (s && !urls.includes(s.src)) urls.push(s.src);
    }
    Preload.keep(urls);
  },
};
