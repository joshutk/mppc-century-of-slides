// ─── RING COUNTER ────────────────────────────────────────────────────────
// The numbered rim of the slide tray, seen edge-on like the reference photo:
// even slots carry numbers, odd slots a tick, slot 0 is the load slot.  The
// rim is a cylinder, so numbers squeeze as they turn away toward the edges.
// Numbers increase to the left of the pointer; Forward turns the rim so it
// moves right and the number under the pointer goes up.
const SVGNS = "http://www.w3.org/2000/svg";

const Ring = {
  P: 81, pos: 0, nodes: [], raf: 0,
  CX: 500, R: 520, MAX: 1.36,        // half-width of visible arc, radians (~78 deg)

  build(svg, slots) {
    // slots 1..N, the load slot 0, and one unnumbered gap after N so 0 sits
    // evenly between N and 2, as on the real tray ("4 2 0 80 78")
    this.P = slots + 2;
    svg.innerHTML = "";
    const el = (tag, attrs, parent) => {
      const e = document.createElementNS(SVGNS, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      (parent || svg).appendChild(e);
      return e;
    };
    const defs = el("defs", {});
    const band = el("linearGradient", { id: "rg-band", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [["0", "#4a4844"], [".12", "#2f2d2a"], [".85", "#1c1b19"], ["1", "#0e0d0c"]]
      .forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, band));
    const lip = el("linearGradient", { id: "rg-lip", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    [["0", "#77736c"], ["1", "#3b3935"]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, lip));
    const shade = el("linearGradient", { id: "rg-shade", x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    [["0", "#000", "1"], [".16", "#000", ".55"], [".34", "#000", "0"], [".66", "#000", "0"], [".84", "#000", ".55"], ["1", "#000", "1"]]
      .forEach(([o, c, a]) => el("stop", { offset: o, "stop-color": c, "stop-opacity": a }, shade));

    el("rect", { x: 0, y: 6, width: 1000, height: 22, fill: "url(#rg-lip)" });       // top lip of the tray
    el("rect", { x: 0, y: 28, width: 1000, height: 78, fill: "url(#rg-band)" });     // numbered rim
    this.g = el("g", {});
    this.nodes = [];
    for (let k = 0; k < this.P; k++) {
      const g = el("g", {}, this.g);
      el("line", { x1: 0, y1: 8, x2: 0, y2: 26, stroke: "#1a1917", "stroke-width": 3 }, g);   // slot divider
      if (k === 0) {
        el("rect", { x: -26, y: 42, width: 52, height: 46, rx: 4, fill: "none", stroke: "#e9e4d8", "stroke-width": 3 }, g);
        el("text", { x: 0, y: 78, "text-anchor": "middle", class: "rn" }, g).textContent = "0";
      } else if (k % 2 === 0) {
        el("text", { x: 0, y: 78, "text-anchor": "middle", class: "rn" }, g).textContent = String(k);
      } else {
        el("line", { x1: 0, y1: 54, x2: 0, y2: 76, stroke: "#bdb7aa", "stroke-width": 3, "stroke-linecap": "round" }, g);
      }
      this.nodes.push(g);
    }
    el("rect", { x: 0, y: 6, width: 1000, height: 100, fill: "url(#rg-shade)", "pointer-events": "none" });
    el("path", { d: "M500 112 L482 140 L518 140 Z", fill: "#f1ece0" });                // index pointer
    const style = el("style", {});
    style.textContent = ".rn{font:600 38px 'Open Sans',sans-serif;fill:#ebe6da}";
    this.layout();
  },

  layout() {
    const step = (2 * Math.PI) / this.P;
    for (let k = 0; k < this.P; k++) {
      let d = mod(k - this.pos + this.P / 2, this.P) - this.P / 2;
      const th = d * step;
      const n = this.nodes[k];
      if (Math.abs(th) > this.MAX) { n.setAttribute("visibility", "hidden"); continue; }
      const x = this.CX - this.R * Math.sin(th);
      const c = Math.cos(th);
      n.setAttribute("visibility", "visible");
      n.setAttribute("transform", "translate(" + x.toFixed(1) + " 0) scale(" + c.toFixed(3) + " 1)");
    }
  },

  span(target, dir) { return dir > 0 ? mod(target - this.pos, this.P) : mod(this.pos - target, this.P); },

  set(p) { cancelAnimationFrame(this.raf); this.pos = mod(p, this.P); this.layout(); },

  // Turn to slot `target` in direction dir (+1 forward, -1 reverse).
  turn(target, dir, ms) {
    cancelAnimationFrame(this.raf);
    const from = this.pos;
    const delta = dir > 0 ? mod(target - from, this.P) : -mod(from - target, this.P);
    if (!delta) return Promise.resolve();
    const dur = ms || clamp(300 + Math.abs(delta) * 14, 340, 1100);
    const t0 = performance.now();
    return new Promise((res) => {
      const tick = (now) => {
        const t = clamp((now - t0) / dur, 0, 1);
        this.pos = mod(from + delta * easeInOut(t), this.P);
        this.layout();
        if (t < 1) this.raf = requestAnimationFrame(tick);
        else { this.pos = mod(target, this.P); this.layout(); res(); }
      };
      this.raf = requestAnimationFrame(tick);
    });
  },
};
