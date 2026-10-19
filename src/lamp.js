// ─── LAMP AND DUST ───────────────────────────────────────────────────────
// Dust and a few hairs on the condenser show up as dark specks whenever the
// gate is lit; a fainter trace stays over each slide.  Drawn once, then
// nudged a little at every change so it doesn't look painted on.
const Lamp = {
  draw(canvas) {
    const g = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
    const rnd = mulberry32(1926);
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#fff";
    g.fillRect(0, 0, W, H);                      // white is invisible under multiply
    for (let i = 0; i < 70; i++) {
      const r = 0.6 + rnd() * rnd() * 3.2;
      g.fillStyle = "rgba(40,28,16," + (0.25 + rnd() * 0.55).toFixed(2) + ")";
      g.beginPath();
      g.ellipse(rnd() * W, rnd() * H, r, r * (0.6 + rnd() * 0.6), rnd() * Math.PI, 0, 2 * Math.PI);
      g.fill();
    }
    g.lineCap = "round";
    for (let i = 0; i < 4; i++) {                // hairs and fibres
      const x = rnd() * W, y = rnd() * H, len = 40 + rnd() * 110, a = rnd() * Math.PI * 2;
      g.strokeStyle = "rgba(45,32,20," + (0.35 + rnd() * 0.35).toFixed(2) + ")";
      g.lineWidth = 0.8 + rnd() * 1.1;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + Math.cos(a) * len * 0.4 + (rnd() - 0.5) * 50, y + Math.sin(a) * len * 0.4 + (rnd() - 0.5) * 50,
        x + Math.cos(a) * len * 0.7 + (rnd() - 0.5) * 40, y + Math.sin(a) * len * 0.7 + (rnd() - 0.5) * 40,
        x + Math.cos(a) * len, y + Math.sin(a) * len);
      g.stroke();
    }
  },

  jiggle(canvas) {
    const dx = (Math.random() - 0.5) * 3, dy = (Math.random() - 0.5) * 3, r = (Math.random() - 0.5) * 2;
    canvas.style.transform = "translate(" + dx.toFixed(2) + "%, " + dy.toFixed(2) + "%) rotate(" + r.toFixed(2) + "deg) scale(1.06)";
  },
};
