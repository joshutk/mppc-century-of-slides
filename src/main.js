// ─── BOOT AND INPUT ──────────────────────────────────────────────────────
(function boot() {
  const data = window.__SLIDES__;
  Sound.init();
  Shelf.build(data, (i) => Projector.load(i));
  Projector.init(data);

  // audio may only start after a gesture
  document.addEventListener("pointerdown", () => Sound.unlock(), { capture: true });
  document.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("gesturestart", (e) => e.preventDefault());

  // keys respond on pointerdown so a tap feels like pressing a real button
  const bindKey = (el, dir) => {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); Projector.press(dir); });
    el.addEventListener("click", (e) => { if (e.detail === 0) Projector.press(dir); });   // keyboard activation
  };
  bindKey($("fwd"), 1);
  bindKey($("rev"), -1);
  $("to-shelf").addEventListener("click", () => Projector.toShelf());
  $("gate-shelf").addEventListener("click", () => Projector.toShelf());

  const mute = $("mute");
  const showMute = () => {
    mute.setAttribute("aria-pressed", String(Sound.muted));
    mute.setAttribute("aria-label", Sound.muted ? "Turn sound on" : "Mute sound");
  };
  showMute();
  mute.addEventListener("click", () => { Sound.unlock(); Sound.setMuted(!Sound.muted); showMute(); });

  // swipe on the screen: left for the next slide, right for the previous
  let sx = null;
  $("room").addEventListener("pointerdown", (e) => { sx = e.clientX; });
  $("room").addEventListener("pointerup", (e) => {
    if (sx == null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 50) Projector.press(dx < 0 ? 1 : -1);
  });

  document.addEventListener("keydown", (e) => {
    if (e.repeat && !["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const onProjector = !$("projector").hidden;
    const t = e.target;
    const otherButton = t && t.tagName === "BUTTON" && t.id !== "fwd" && t.id !== "rev";
    if (!$("credits").hidden) return;
    if (!onProjector) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= data.trays.length) Projector.load(n - 1);
      return;
    }
    if ((e.key === " " || e.key === "Enter") && otherButton) return;
    const k = e.key;
    if (k === "ArrowRight" || k === "PageDown" || k === " " || k === "Enter") { e.preventDefault(); Projector.press(1); }
    else if (k === "ArrowLeft" || k === "PageUp") { e.preventDefault(); Projector.press(-1); }
    else if (k === "Home") { e.preventDefault(); Projector.press(1, 1); }
    else if (k === "Escape") Projector.toShelf();
    else if (k === "m" || k === "M") mute.click();
  });
})();
