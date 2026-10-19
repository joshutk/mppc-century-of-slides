// ─── SHELF ───────────────────────────────────────────────────────────────
// Six slide trays seen from above, rims tinted with the tray's colour and
// the filled slots showing a pale slide edge.
function traySVG(accent, filled, slots) {
  const c = 100, parts = [];
  parts.push('<svg viewBox="0 0 200 200" aria-hidden="true">');
  parts.push('<circle cx="100" cy="100" r="97" fill="#1b1a18" stroke="' + accent + '" stroke-width="5"/>');
  parts.push('<circle cx="100" cy="100" r="89" fill="#2d2b28"/>');
  for (let i = 0; i <= slots; i++) {
    const a = (i / (slots + 1)) * 2 * Math.PI - Math.PI / 2;
    const cos = Math.cos(a), sin = Math.sin(a);
    parts.push('<line x1="' + (c + 50 * cos).toFixed(1) + '" y1="' + (c + 50 * sin).toFixed(1) +
      '" x2="' + (c + 89 * cos).toFixed(1) + '" y2="' + (c + 89 * sin).toFixed(1) + '" stroke="#121110" stroke-width="1.3"/>');
    if (i >= 1 && i <= filled) {
      const b = a + Math.PI / (slots + 1);
      const bc = Math.cos(b), bs = Math.sin(b);
      parts.push('<line x1="' + (c + 55 * bc).toFixed(1) + '" y1="' + (c + 55 * bs).toFixed(1) +
        '" x2="' + (c + 85 * bc).toFixed(1) + '" y2="' + (c + 85 * bs).toFixed(1) + '" stroke="#d9d0bb" stroke-width="1.8" stroke-linecap="round"/>');
    }
  }
  parts.push('<circle cx="100" cy="100" r="49" fill="#3b3935" stroke="#121110" stroke-width="2"/>');
  parts.push('<circle cx="100" cy="100" r="36" fill="#ece6d8"/>');
  parts.push('<circle cx="100" cy="100" r="36" fill="none" stroke="' + accent + '" stroke-width="2.5" stroke-dasharray="3 3"/>');
  parts.push('<circle cx="100" cy="100" r="9" fill="#2a2926"/><circle cx="100" cy="100" r="3" fill="#77716a"/>');
  parts.push('</svg>');
  return parts.join("");
}

const Shelf = {
  build(data, onPick) {
    const ul = $("trays");
    ul.innerHTML = "";
    data.trays.forEach((t, i) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tray";
      b.setAttribute("aria-label", t.name + ", " + t.slides.length + " slides");
      b.innerHTML = traySVG(t.accent, t.slides.length, 80) +
        '<span class="label">' + t.name.replace(/&/g, "&amp;") + "</span>" +
        '<span class="meta">' + t.slides.length + " slides &middot; " + t.span + "</span>";
      b.addEventListener("click", () => onPick(i));
      li.appendChild(b);
      ul.appendChild(li);
    });
    $("draft-note").hidden = !data.draft;
    this.buildCredits(data.credits || []);
  },

  // Each source with the slides it supplied, grouped by tray:
  // "Buildings & Grounds 8, 9 · Worship & Music 1"
  buildCredits(list) {
    const dl = $("credits-list");
    dl.innerHTML = "";
    for (const c of list) {
      const groups = [];
      for (const [tray, n] of c.slides) {
        const g = groups.find((x) => x.tray === tray);
        if (g) g.n.push(n); else groups.push({ tray, n: [n] });
      }
      const dt = document.createElement("dt");
      dt.textContent = c.source;
      const dd = document.createElement("dd");
      dd.textContent = groups.map((g) => g.tray + " " + g.n.join(", ")).join(" · ");
      dl.append(dt, dd);
    }
    const box = $("credits");
    const open = () => { box.hidden = false; $("close-credits").focus({ preventScroll: true }); };
    const close = () => { box.hidden = true; $("open-credits").focus({ preventScroll: true }); };
    $("open-credits").addEventListener("click", open);
    $("close-credits").addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    document.addEventListener("keydown", (e) => { if (!box.hidden && e.key === "Escape") close(); }, true);
  },
};
