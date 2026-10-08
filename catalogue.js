/**
 * Catalogue: a card-catalogue cabinet on four legs, six deep drawers in a 2 × 3
 * grid, each front with a label holder and a pull. The drawer under the pointer
 * slides out on its rails, the rest stay shut, and a beat later one index card
 * rises high out of it, tab first, and takes the bright edge: the memory pulled.
 * At rest every drawer is shut and nothing is bright, by the owner's choice.
 * The slider is how far the card comes up.
 *
 * The pattern: one of many, in two beats. Tweens, the card's delayed behind its
 * drawer's on the way out and ahead of it on the way back, a paint order that
 * holds for any pulls, and a hit test on the drawers' resting fronts, which a
 * drawer sliding out from under the pointer cannot move.
 */
const {
  Cam, clamp, facing, fillet, fit, hull, poly, proj, prism, rings, rrect, seg,
  tdone, tset, tval, tween, mk, pointer, put, register, disposer, solid,
} = HL;

const COLS = 2, ROWS = 3, CW = 46, RH = 22, G = 1.8, W = COLS * CW, H = ROWS * RH, D = 46, MAX = 34, LEG = 10;
const BEAT = 260; // ms between the drawer and its card
const num = (i) => String(i + 1).padStart(2, "0");

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  // Read the page's own ground colour, the one its background is painted with: a host can force color-scheme without changing it.
  const root = document.documentElement;
  const theme = () => {
    const css = getComputedStyle(root), g = css.getPropertyValue("--ground").trim();
    const dark = /^#[0-9a-f]{6}$/i.test(g) ? parseInt(g.slice(1, 3), 16) < 128 : /dark/.test(css.colorScheme);
    stage.dataset.hairlineTheme = dark ? "dark" : "light";
  };
  const watch = new MutationObserver(theme);
  watch.observe(root, { attributes: true, attributeFilter: ["data-theme", "class"] });
  bag.add(() => { watch.disconnect(); delete stage.dataset.hairlineTheme; });
  theme();

  let lift = value, act = -1;
  const C = Cam(45, 0.5, 1.7);
  fit(C, [[-6, -2, -LEG], [W + 6, D + MAX, -LEG], [W + 6, -2, -LEG], [-6, D + MAX, -LEG], [-6, -2, H + 8], [W + 6, D + MAX, H], [W - 6, D + 19, H + 50], [6, D + 19, H + 50]], 200, 166);
  const P = proj(C), front = facing(C);
  const g = mk("g", {}, svg);

  // The cabinet: four legs, the carcass, and a top that overhangs it a little.
  for (const [x, y] of [[-1, 3], [W - 5, 3], [-1, D - 7], [W - 5, D - 7]]) {
    const [a, b] = rings(x, y, x + 6, y + 4, 1.4, 0.6);
    put(solid(g), prism(P, front, a, b, -LEG, 0));
  }
  const [ca, cb] = rings(-4, 0, W + 4, D, 3, 1.6);
  put(solid(g), prism(P, front, ca, cb, 0, H + 3));
  // The one corner where the drawer face meets the side, at the outline's weight so both ends of the cabinet match (the owner asked for it).
  mk("path", { d: seg(P(W + 3.12, D - 0.88, 0.6), P(W + 3.12, D - 0.88, H + 3)), class: "nf sil" }, g);
  const [ta, tb] = rings(-6, -2, W + 6, D + 2, 3.5, 1.8);
  put(solid(g), prism(P, front, ta, tb, H + 3, H + 7));

  // The drawers, then every card above them all. Shut drawers lie flat on the cabinet's face, so nothing shut can cover
  // an open drawer or a card: shut ones paint first, open ones after, each set bottom to top and left to right.
  const box = mk("g", {}, g), deck = mk("g", {}, g), drawers = [];
  for (let i = 0; i < ROWS * COLS; i++) {
    const c = i % COLS, r = ROWS - 1 - Math.floor(i / COLS); // drawer 01 is top left
    const x0 = c * CW + G, x1 = (c + 1) * CW - G, z0 = r * RH + G + 1, z1 = (r + 1) * RH - G + 1;
    const s = solid(box);
    const cards = mk("path", { class: "nf lo" }, s.g), label = mk("path", { class: "nf" }, s.g), pull = mk("path", { class: "nf" }, s.g);
    const cg = mk("g", {}, deck);
    const edge = mk("path", { class: "lo" }, cg), card = mk("path", { class: "sil" }, cg), lines = mk("path", { class: "nf lo" }, cg);
    const o0 = 0;
    // Among drawers that are out, one covers those below it in its column and the column to its left, never the other way.
    drawers.push({ i, c, r, x0, x1, z0, z1, s, cg, cards, label, pull, edge, card, lines, o: tween(o0), up: tween(0), o0, drawn: NaN, key: c * ROWS + r });
  }

  const face = (x0, z0, x1, z1, rad, y) => rrect(x0, z0, x1, z1, rad, 4).map((q) => P(q.u, y, q.v));
  function draw(d, o, up) {
    if (o + up * 1e3 === d.drawn) return;
    d.drawn = o + up * 1e3;
    const y = D + o, mx = (d.x0 + d.x1) / 2;
    const fr = face(d.x0, d.z0, d.x1, d.z1, 2, y);
    put(d.s, {
      sil: poly(o > 0.2 ? hull(fr.concat(face(d.x0, d.z0, d.x1, d.z1, 2, D))) : fr),
      crease: poly(face(d.x0 + 1.3, d.z0 + 1.3, d.x1 - 1.3, d.z1 - 1.3, 1.2, y)),
    });
    d.label.setAttribute("d", poly(face(mx - 8, d.z1 - 8, mx + 8, d.z1 - 3.5, 1, y)));
    d.pull.setAttribute("d", poly(face(mx - 5.5, d.z0 + 4, mx + 5.5, d.z0 + 7.2, 1.6, y + 0.6)));
    // The index cards standing in the part of the drawer that is out, their tops just over its sides.
    let cs = "";
    for (let cy = y - 4; cy > D + 2; cy -= 3.4) cs += seg(P(d.x0 + 4, cy, d.z1 + 1.2), P(d.x1 - 4, cy, d.z1 + 1.2));
    d.cards.setAttribute("d", cs);
    // The card pulled: standing in the drawer, cut at its rim, its tab placed by the drawer's number like a real guide card.
    if (up < 0.3) { d.card.setAttribute("d", ""); d.edge.setAttribute("d", ""); d.lines.setAttribute("d", ""); return; }
    const cy = D + o * 0.55, a = d.x0 + 5, b = d.x1 - 5, zb = d.z1, zt = d.z1 + 1.2 + up, t0 = a + 3 + (d.i % 3) * ((b - a - 16) / 2);
    const outline = fillet([[a, zb], [b, zb], [b, zt], [t0 + 10, zt], [t0 + 10, zt + 4.5], [t0, zt + 4.5], [t0, zt], [a, zt]], [0.1, 0.1, 2, 1.2, 1.6, 1.6, 1.2, 2]);
    // A thin plate: its back edge a hair behind the face, then the face over it.
    d.edge.setAttribute("d", poly(outline.map(([u, v]) => P(u, cy - 1, v))));
    d.card.setAttribute("d", poly(outline.map(([u, v]) => P(u, cy, v))));
    // A heading, a rule under it, and three lines of entry, cut off where the card goes into the drawer.
    let ls = "";
    for (const [k, l, r] of [[4, 3, 14], [6.5, 3, 3], [10, 3, 6], [13.5, 3, 10], [17, 3, 8]]) if (zt - k > zb + 1.5) ls += seg(P(a + l, cy, zt - k), P(b - r, cy, zt - k));
    d.lines.setAttribute("d", ls);
  }

  let order = "";
  const B = register(stage, (_dt, now) => {
    let moving = false;
    // A card can stand only as far as its drawer is out, so a drawer shutting takes its card down with it.
    for (const d of drawers) { const o = tval(d.o, now); draw(d, o, Math.min(tval(d.up, now), lift * clamp((o - 6) / (MAX * 0.5), 0, 1))); if (!tdone(d.o, now) || !tdone(d.up, now)) moving = true; }
    const rank = (d) => (tval(d.o, now) > 0.5 ? 100 : 0) + d.key;
    const sorted = drawers.slice().sort((a, b) => rank(a) - rank(b)), next = sorted.map((d) => d.i).join();
    if (next !== order) { order = next; sorted.forEach((d) => { box.appendChild(d.s.g); deck.appendChild(d.cg); }); }
    return moving;
  });
  bag.add(B.unregister);

  /** The drawer under the pointer, read on the cabinet's front at rest, which never moves: -1 off the grid. */
  const o0 = P(0, D, 0), ex = P(1, D, 0)[0] - o0[0], ez = P(0, D, 1)[1] - o0[1];
  function hit([sx, sy]) {
    const x = (sx - o0[0]) / ex, z = (sy - P(x, D, 0)[1]) / ez;
    if (x < 0 || x >= W || z < 0 || z >= H) return -1;
    return (ROWS - 1 - Math.floor(z / RH)) * COLS + Math.floor(x / CW);
  }

  /** Pulls drawer a and, a beat later, its card; the drawer open before shuts first, so two are never out together for long. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), switching = a >= 0 && act >= 0;
    act = a;
    for (const d of drawers) {
      const on = d.i === a;
      // leaving: the card sinks, then the drawer shuts; switching: the old drawer shuts at once and the new one waits a beat
      tset(d.o, on ? MAX : d.o0, now, on ? (switching ? BEAT : 0) : a < 0 ? BEAT * 0.6 : 0);
      tset(d.up, on ? lift : 0, now, on ? (switching ? BEAT * 2 : BEAT) : 0);
      d.card.classList.toggle("hi", on);
    }
    read.textContent = a < 0 ? "rest" : `drawer ${num(a)}`;
    B.wake();
  }
  read.textContent = "rest";

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { lift = v; if (act >= 0) { const a = act; act = -2; setActive(a); } }, destroy: bag.dispose };
}

hairline({
  name: "catalogue",
  means: "A card-catalogue cabinet: the drawer under the pointer slides out, and an index card rises from it.",
  rules: [1, 4, 5, 6],
  range: [26, 36, 44],
  mount,
});
