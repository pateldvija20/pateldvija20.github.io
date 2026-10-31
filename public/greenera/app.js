// Greenera prototype: navigation between the four screens, the scan card, and
// the looping demo used to record the case study's hero.
//
// Everything that moves runs on springs (Apple's damping + response, see spring()),
// always from where it is on screen, so any motion can be grabbed and reversed.
// The card follows a drag 1:1 and is thrown by the release velocity; pushed screens
// can be swiped back from the left edge the same way.
(() => {
  const params = new URLSearchParams(location.search);
  const bare = params.get("frame") === "0";
  const demo = params.get("demo");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const device = document.getElementById("device");
  const stage = document.getElementById("stage");
  const $ = (id) => document.getElementById(id);

  // ?rec=1&bg=FFF7CC: the framed phone alone on a flat colour, for the case study's clips.
  const rec = params.get("rec") === "1";
  if (rec) {
    document.body.classList.add("rec");
    if (params.get("bg")) document.body.style.background = `#${params.get("bg")}`;
  }

  // On a phone, or for a recording, the screen fills the window with no frame.
  const phone = !rec && matchMedia("(max-width: 500px)").matches;
  if (bare || phone) document.body.classList.add("bare");

  function fit() {
    const pad = document.body.classList.contains("bare") ? 0 : 56;
    // Always the whole screen in the window, never cropped: a short window would hide
    // the sheets and toasts that rise from the bottom. A recording window is exactly
    // 393 x 852, so it still renders at 1.
    const s = Math.min(1, (innerWidth - pad) / 393, (innerHeight - pad) / 852);
    // On a phone the screen is as large as it can be without cropping either edge.
    const w = document.documentElement.clientWidth, h = innerHeight;
    const fill = phone ? Math.min(w / 393, h / 852) : s;
    device.style.setProperty("--s", String(fill));
  }
  fit();
  addEventListener("resize", fit);

  /* ------------------------------ physics ------------------------------ */

  /**
   * A value moved by a spring. `to()` re-targets from the current value and
   * velocity, so a new target mid-flight bends the motion instead of restarting it.
   * damping 1 settles without overshoot; below 1 it overshoots. response is roughly
   * the seconds it takes to get there (not a fixed duration). `eps` is how close
   * counts as there, in the value's own units.
   */
  function spring(value, render, eps = 0.5) {
    let v = 0, target = value, raf = 0, opts = {}, done = null;
    const step = (prev) => (now) => {
      // Fixed small steps keep the integration stable on slow frames
      let dt = Math.min(0.064, (now - prev) / 1000);
      const k = Math.pow((2 * Math.PI) / opts.response, 2);
      const c = (4 * Math.PI * opts.damping) / opts.response;
      while (dt > 0) {
        const h = Math.min(dt, 1 / 240);
        v += (-k * (value - target) - c * v) * h;
        value += v * h;
        dt -= h;
      }
      render(value);
      if (Math.abs(v) < eps && Math.abs(value - target) < eps) {
        value = target;
        v = 0;
        render(value);
        raf = 0;
        const d = done;
        done = null;
        d && d();
        return;
      }
      raf = requestAnimationFrame(step(now));
    };
    return {
      get value() { return value; },
      get target() { return target; },
      to(t, { response = 0.4, damping = 1, velocity, onDone } = {}) {
        target = t;
        opts = { response, damping };
        if (velocity !== undefined) v = velocity;
        done = onDone || null;
        if (reduce) return this.set(t, onDone);
        if (!raf) raf = requestAnimationFrame(step(performance.now()));
        return this;
      },
      set(t, onDone) {
        cancelAnimationFrame(raf);
        raf = 0;
        value = target = t;
        v = 0;
        render(value);
        done = null;
        onDone && onDone();
        return this;
      },
    };
  }

  /** Where a flick would come to rest, as scroll deceleration does. */
  const project = (velocity, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);
  /** Past an edge the element follows less and less, rather than stopping dead. */
  const rubber = (over, dim, c = 0.55) => (over * dim * c) / (dim + c * Math.abs(over));

  /** Pointer position in the 393 x 852 screen, whatever the device is scaled to. */
  function local(e) {
    const r = stage.getBoundingClientRect();
    const k = 393 / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, t: e.timeStamp };
  }
  /** Velocity over the last ~80ms of pointer samples, in screen px per second. */
  function velocity(samples) {
    const last = samples[samples.length - 1];
    let first = last;
    for (let i = samples.length - 1; i >= 0 && last.t - samples[i].t < 80; i--) first = samples[i];
    const dt = (last.t - first.t) / 1000 || 1;
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
  }
  /** Swallows the click that follows a drag, so dragging the card never also taps a row. */
  let dragged = false;
  stage.addEventListener("pointerdown", () => { dragged = false; }, true);
  stage.addEventListener("click", (e) => {
    if (dragged) {
      e.stopPropagation();
      e.preventDefault();
      dragged = false;
    }
  }, true);

  /* ------------------------------ navigation ------------------------------ */

  // A stack of screens. `nav` is how far the top screen is in: 1 is fully in, 0 is
  // off to the right. The one under it drifts left and dims as the top comes in.
  const stack = ["scan"];
  const screen = (id) => $(id);
  const renderNav = (x) => {
    const top = screen(stack[stack.length - 1]);
    const under = stack.length > 1 ? screen(stack[stack.length - 2]) : null;
    for (const el of stage.querySelectorAll(".screen")) {
      if (el !== top && el !== under) {
        el.style.visibility = "hidden";
        el.classList.remove("is-current");
      }
    }
    top.style.visibility = "visible";
    top.classList.add("is-current");
    top.style.transform = reduce ? "" : `translateX(${(1 - x) * 100}%)`;
    top.style.opacity = reduce ? String(x) : "";
    if (under) {
      under.style.visibility = x < 1 || reduce ? "visible" : "hidden";
      under.style.transform = reduce ? "" : `translateX(${-28 * x}%)`;
      under.style.filter = `brightness(${1 - 0.08 * x})`;
    }
  };
  const nav = spring(1, renderNav, 0.001);
  // Reduced motion: a short cross-fade stands in for the slide
  const fade = (from, to, onDone) => {
    const t0 = performance.now();
    const f = (now) => {
      const k = Math.min(1, (now - t0) / 160);
      renderNav(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(f);
      else onDone && onDone();
    };
    requestAnimationFrame(f);
  };

  /** Pushes a screen, opened at `at` (its own y) when it scrolls. */
  function go(id, at = 0) {
    if (stack[stack.length - 1] === id) return;
    // A page already in the stack (Fern, then Moss, then Fern again) moves to the top
    const was = stack.indexOf(id);
    if (was > 0) stack.splice(was, 1);
    closeSearch();
    const sc = screen(id).querySelector(".scroll");
    if (sc) sc.scrollTop = at;
    stack.push(id);
    if (id === "ingredients") introIngredients();
    if (reduce) {
      renderNav(0);
      fade(0, 1);
      return;
    }
    nav.set(0);
    nav.to(1, { response: 0.42, damping: 1 });
  }
  function back(velocity) {
    if (stack.length < 2) return;
    closeSearch();
    const settle = () => {
      const leaving = screen(stack.pop());
      leaving.style.transform = "";
      leaving.style.visibility = "hidden";
      leaving.classList.remove("is-current");
      nav.set(1);
    };
    if (reduce) return fade(1, 0, settle);
    nav.to(0, { response: 0.42, damping: 1, velocity, onDone: settle });
  }
  function home() {
    closeSearch();
    closeSheet();
    while (stack.length > 1) {
      const el = screen(stack.pop());
      el.style.visibility = "hidden";
      el.style.transform = "";
      el.classList.remove("is-current");
    }
    const scan = screen("scan");
    scan.style.transform = "";
    scan.style.filter = "";
    nav.set(1);
    reset();
  }

  // Swipe back from the left edge of a pushed screen: the screen follows the
  // finger, then the release velocity decides whether it goes or comes back.
  function edgeSwipe(el) {
    const id = el.id;
    let start = null, samples = [];
    el.addEventListener("pointerdown", (e) => {
      const p = local(e);
      if (p.x > 24 || stack[stack.length - 1] !== id) return;
      start = p;
      samples = [p];
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!start) return;
      const p = local(e);
      samples.push(p);
      const dx = Math.max(0, p.x - start.x);
      if (dx > 4) dragged = true;
      nav.set(1 - dx / 393);
    });
    const end = (e) => {
      if (!start) return;
      const p = local(e);
      const dx = Math.max(0, p.x - start.x);
      const v = velocity(samples).x;
      start = null;
      if (dx + project(v) > 393 / 2) back(-v / 393);
      else nav.to(1, { response: 0.4, damping: 1, velocity: -v / 393 });
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }
  edgeSwipe(screen("ingredients"));

  /* ------------------------------ the scan card ------------------------------ */

  // The card's position in px: 0 is the collapsed card, OPEN() is fully expanded,
  // and below 0 it slides down out of view (HIDDEN()). One spring drives all three,
  // so a drag can carry it from any one to any other.
  const sheet = $("sheet"), more = $("more"), inner = more.firstElementChild;
  const toggle = $("toggle"), toggleLabel = $("toggleLabel"), scrim = $("scrim");
  const OPEN = () => inner.offsetHeight;
  const HIDDEN = () => -(sheet.offsetHeight - more.offsetHeight + 16);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const handle = sheet.querySelector(".handle");
  const renderSheet = (pos) => {
    const open = OPEN();
    // The grabber grows in with the card: 14px tall when open, nothing when collapsed,
    // its -12px margin cancelling the card's gap until it appears
    const p = clamp01(pos / open);
    handle.style.height = `${14 * p}px`;
    handle.style.marginBottom = `${-12 * (1 - p)}px`;
    handle.style.opacity = String(p);
    if (pos >= 0) {
      more.style.height = `${pos}px`;
      inner.style.opacity = String(clamp01((pos / open - 0.15) / 0.6));
      sheet.style.transform = "translateY(0)";
    } else {
      more.style.height = "0px";
      inner.style.opacity = "0";
      sheet.style.transform = `translateY(${-pos}px)`;
    }
    scrim.style.opacity = String(clamp01(1 + pos / -HIDDEN()));
  };
  const card = spring(-2000, renderSheet);
  requestAnimationFrame(() => card.set(HIDDEN()));

  /** Points the card at one of its three rests and keeps the labels and fills in step. */
  function settleTo(rest, opts = {}) {
    const open = rest === "open";
    more.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggleLabel.textContent = open ? "Collapse" : "Expand";
    sheet.classList.toggle("is-up", rest !== "hidden");
    if (rest === "hidden") restoreCamera();
    const at = rest === "open" ? OPEN() : rest === "closed" ? 0 : HIDDEN();
    card.to(at, { response: 0.45, damping: 1, ...opts });
  }
  function scanNow(key = "calma") {
    if (sheet.classList.contains("is-up")) return;
    setScan(key);
    const f = $("flash");
    f.classList.remove("go"); void f.offsetWidth; f.classList.add("go");
    setTimeout(() => settleTo("closed"), reduce ? 0 : 140);
  }
  const setOpen = (open) => settleTo(open ? "open" : "closed");
  const reset = () => settleTo("hidden");

  // Drag the card: 1:1 with the finger from where it was grabbed, a soft edge past
  // fully open, then a throw to whichever rest the flick is heading for.
  {
    const glass = sheet.querySelector(".glass");
    let start = null, from = 0, samples = [], live = false;
    glass.addEventListener("pointerdown", (e) => {
      if (!sheet.classList.contains("is-up")) return;
      start = local(e);
      from = card.value;
      samples = [start];
      live = false;
    });
    // Moves and the release are heard on the window: the finger can leave the card
    // before it has travelled far enough to count as a drag, and the card only takes
    // the pointer once it does, so a tap on a row inside it still lands on the row.
    addEventListener("pointermove", (e) => {
      if (!start) return;
      const p = local(e);
      samples.push(p);
      const dy = p.y - start.y;
      // A little travel first, so a tap on a row stays a tap
      if (!live && Math.abs(dy) < 8) return;
      if (!live) {
        live = true;
        dragged = true;
        try { glass.setPointerCapture(e.pointerId); } catch {}
      }
      const open = OPEN();
      let pos = from - dy;
      if (pos > open) pos = open + rubber(pos - open, open);
      card.set(pos);
    });
    const end = () => {
      if (!start) return;
      start = null;
      if (!live) return;
      const vy = velocity(samples).y;
      const v = -vy;
      const aim = card.value + project(v);
      const rests = [["open", OPEN()], ["closed", 0], ["hidden", HIDDEN()]];
      const [rest] = rests.reduce((a, b) => (Math.abs(b[1] - aim) < Math.abs(a[1] - aim) ? b : a));
      // A flick carries its own momentum, so it gets a touch of overshoot; a slow drag does not
      settleTo(rest, { velocity: v, damping: Math.abs(v) > 300 ? 0.82 : 1, response: 0.38 });
    };
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }

  $("shutter").addEventListener("click", () => scanNow());
  $("close").addEventListener("click", reset);
  toggle.addEventListener("click", () => setOpen(!more.classList.contains("is-open")));
  $("toProduct").addEventListener("click", () => go(pageOf(scan.key)));
  $("toPick").addEventListener("click", () => scan.pick && go(pageOf(scan.pick)));
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => back()));
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (searchOpen()) return closeSearch(true);
    if (sheetOpen()) return closeSheet();
    back();
  });

  // A tap that lands on nothing shows, briefly, everything that can be tapped.
  let revealTimer;
  stage.addEventListener("click", (e) => {
    if (e.target.closest("button, input, label, a, .g-sheet, .g-scrim, .ing-scrim, .search-scrim, .search-panel, .gallery")) return;
    stage.classList.add("reveal");
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => stage.classList.remove("reveal"), 450);
  });

  /* ------------------------------ products ------------------------------ */

  const CHEV = '<svg class="chev" width="6" height="10" viewBox="0 0 6 10" aria-hidden="true"><path d="M1 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const DOWN = '<svg class="down" width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5L6 6l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW = '<svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true"><path d="M1 5h9.5M6.5 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const STAR = (fill) => `<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><defs><linearGradient id="st${Math.round(fill * 100)}"><stop offset="${fill}" stop-color="${PALETTE.orange[300]}"/><stop offset="${fill}" stop-color="${PALETTE.ink[200]}"/></linearGradient></defs><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9l-5.2 2.8 1-5.9L1.5 7.7l5.9-.8z" fill="url(#st${Math.round(fill * 100)})"/></svg>`;
  const stars = (r) => [0, 1, 2, 3, 4].map((i) => STAR(Math.max(0, Math.min(1, r - i)))).join("");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const money = (n) => `$${n.toFixed(2)}`;

  // Ingredient notes, shared across products: `line` for the list, `about` for the
  // sheet. Calma's come from the Greenera Figma screens; the rest are written in the
  // same short voice for the prototype's mock products.
  const NOTES = {
    "Aqua / Water / Eau": ["The base solvent. No known concerns.", "The base solvent that carries the other ingredients. No known concerns."],
    "Glycerin": ["Pulls moisture into skin.", "A humectant that draws moisture into skin. Widely regarded as safe and non-irritating."],
    "Coco-Betaine": ["Mild foaming agent. Rare sensitivity.", "A coconut-derived surfactant that creates the cleanser's foam. Generally mild, with rare contact-allergy sensitivity reported."],
    "Propylene Glycol": ["Spreads the formula. Can irritate some skin.", "A humectant that keeps the formula lightweight and helps it spread evenly. Considered safe in rinse-off products, though flagged more often than plant-derived alternatives as a mild irritant for very reactive skin."],
    "Sodium Cocoyl Glycinate": ["Ultra-mild cleanser, gentle foam.", "An ultra-mild, coconut-derived secondary cleanser. Well tolerated by sensitive skin."],
    "PEG-120 Methyl Glucose Dioleate": ["Emulsifier. Possible trace contaminants.", "A sugar-derived emulsifier that helps the formula foam and rinse cleanly. PEG compounds carry a small, well-documented risk of trace manufacturing contaminants."],
    "Sodium Chloride": ["Common thickener. No known concerns.", "Common salt, used to thicken the formula. No known concerns."],
    "Ceramide NP": ["Restores the skin's natural barrier.", "A skin-identical lipid that restores and reinforces the skin's natural barrier."],
    "Niacinamide": ["Strengthens the skin barrier.", "Vitamin B3 that strengthens the skin barrier and helps even tone over time."],
    "Sodium Hydroxide": ["Balances pH. Safe at rinse-off levels.", "Balances the formula's pH. Safe at the levels used in rinse-off products."],
    "Disodium EDTA": ["Keeps the formula stable.", "Keeps the formula stable by binding trace minerals. Safe for skin, but slow to biodegrade."],
    "Capryloyl Glycine": ["Supports skin and the preservative system.", "Supports the skin and helps the preservative system work."],
    "Caprylyl Glycol": ["Gentle preservative booster.", "A gentle preservative booster that helps keep the formula fresh."],
    "Citric Acid": ["Fine-tunes pH. Generally safe.", "Fine-tunes the formula's pH. Generally safe."],
    "Acrylates Copolymer": ["Thickens the gel. No known concerns.", "A polymer that thickens the gel. No known concerns."],
    "Sodium Lauroyl Methyl Isethionate": ["Gentle cleanser, rich lather.", "A mild, coconut-derived cleanser that lathers well without stripping the skin."],
    "Cocamidopropyl Betaine": ["Foaming agent. Can irritate some skin.", "A coconut-derived surfactant that boosts foam. Mild for most, but linked to contact allergies in sensitive skin."],
    "Decyl Glucoside": ["Plant-based cleanser. Very mild.", "A sugar-derived cleanser that is gentle enough for sensitive skin and breaks down readily."],
    "Aloe Barbadensis Leaf Juice": ["Soothes and hydrates.", "Aloe vera juice that soothes and adds moisture. No known concerns."],
    "Panthenol": ["Vitamin B5. Softens and hydrates.", "Provitamin B5, which helps skin hold moisture and feel soft."],
    "Allantoin": ["Calms and soothes skin.", "A skin-soothing ingredient that helps calm irritation. No known concerns."],
    "Sodium Benzoate": ["Preservative. Generally safe.", "A common food-grade preservative that keeps the formula free of microbes."],
    "Potassium Sorbate": ["Gentle preservative.", "A mild, food-grade preservative that works alongside sodium benzoate."],
    "Caprylic/Capric Triglyceride": ["Light emollient from coconut oil.", "A lightweight, coconut-derived emollient that leaves skin soft without feeling greasy."],
    "Cetearyl Alcohol": ["Fatty alcohol. Softens, not drying.", "A fatty alcohol that thickens the cream and softens skin. Not drying, unlike simple alcohols."],
    "Glyceryl Stearate": ["Emulsifier. Keeps the cream smooth.", "An emulsifier that keeps oil and water blended for a smooth texture."],
    "Sodium Cocoyl Glutamate": ["Very mild cleanser.", "An amino-acid-based cleanser that is among the gentlest available."],
    "Butyrospermum Parkii (Shea) Butter": ["Nourishing plant butter.", "Shea butter, a rich plant fat that nourishes and protects dry skin."],
    "Squalane": ["Lightweight moisturiser.", "A stable, lightweight oil that mimics skin's own sebum and locks in moisture."],
    "Xanthan Gum": ["Natural thickener.", "A fermentation-derived gum that thickens the cream. No known concerns."],
    "Tocopherol": ["Vitamin E. Protects the formula.", "Vitamin E, an antioxidant that protects the oils in the formula from going off."],
    "Phenoxyethanol": ["Preservative. Can irritate at high levels.", "A widely used preservative. Considered safe at low levels, but it can irritate very sensitive skin."],
    "Ethylhexylglycerin": ["Preservative booster. Rare irritation.", "Boosts the preservative system and conditions skin. Occasional reports of irritation."],
    "Sodium Laureth Sulfate": ["Strong cleanser. Can dry skin.", "A strong, high-foaming cleanser. Effective, but it can strip and dry sensitive skin."],
    "Salicylic Acid": ["Exfoliating acid. Can irritate.", "A beta-hydroxy acid that unclogs pores. Useful for oily skin, but it can irritate and dry sensitive skin."],
    "Parfum / Fragrance": ["Added scent. Common irritant.", "A blend of scent ingredients that brands do not have to list one by one. A frequent cause of skin irritation."],
    "Limonene": ["Citrus scent. Known allergen.", "A citrus scent compound. A known allergen, especially once it oxidises on exposure to air."],
    "Linalool": ["Floral scent. Known allergen.", "A floral scent compound. A known allergen for some people once it oxidises."],
    "Methylisothiazolinone": ["Preservative. Strong sensitiser.", "A preservative that is a well-documented cause of contact allergies. Restricted in many leave-on products."],
  };
  /** A formula from "Name (care)" style entries, in label order. */
  const formula = (list) => list.map((x) => {
    const care = x.endsWith("*");
    const name = care ? x.slice(0, -1) : x;
    const [line, about] = NOTES[name];
    return { name, care, line, about };
  });

  /** What each score factor measures, shown when its row in the breakdown is opened. */
  const FACTORS = {
    "Dermal Safety": "How likely the formula is to irritate or sensitise skin, from the hazard data on each ingredient at its concentration.",
    "Allergen Transparency": "Whether known allergens are named on the label, rather than hidden inside “fragrance” or “parfum”.",
    "Microbial Purity": "How well the preservative system protects the formula once opened, and how gentle that system is.",
    "Chemical Runoff": "How readily the ingredients break down once rinsed down the drain, and how toxic they are to aquatic life.",
    "Animal Welfare": "Whether the brand and its suppliers test on animals, and whether that is independently certified.",
    "Resource Preservation": "Where the raw materials come from and what growing or extracting them costs land and water.",
    "Human Rights": "Labour conditions in the factories and farms behind the product, from audits and certifications.",
    "Energy Mix": "How much of the manufacturing runs on renewable energy, as the brand or its certifier reports it.",
    "Packaging Circularity": "Whether the packaging is recyclable or refillable where it is sold, and how much recycled material it uses.",
  };
  const CATS = [
    ["Health Impact", "How safe this formula is for the person using it", ["Dermal Safety", "Allergen Transparency", "Microbial Purity"]],
    ["Ecosystem Impact", "The formula's environmental footprint.", ["Chemical Runoff", "Animal Welfare", "Resource Preservation"]],
    ["Supply Chain", "How the product is made and sourced.", ["Human Rights", "Energy Mix", "Packaging Circularity"]],
  ];
  const BAR_NAMES = CATS.map((c) => c[0]);

  /** The palette from styles.css, for colours written into SVG and inline styles. Keep in step. */
  const PALETTE = {
    ink: { 100: "#F9F9F9", 200: "#E3E4E1", 300: "#9A9E97", 400: "#5C6159", 500: "#131910" },
    green: { 100: "#EEF7EC", 200: "#CDE7C7", 300: "#7DC173", 400: "#579A4C", 500: "#2F5E28" },
    yellow: { 100: "#FFF9D6", 200: "#FFEF8F", 300: "#FFD900", 400: "#C9A800", 500: "#6E5C00" },
    orange: { 100: "#FFF1DB", 200: "#FFD699", 300: "#FFA500", 400: "#CC8000", 500: "#7A4C00" },
    lavender: { 100: "#F1F1FF", 200: "#D9D9FF", 300: "#9F9FFF", 400: "#6B6BD6", 500: "#3D3D8C" },
  };

  // Calma is the scanned product, its page drawn in Figma; the other three are mock
  // products approved for the prototype, in the same layout. A trailing * in an
  // ingredient list marks "use with care". `factors` are the breakdown's nine values
  // in CATS order, null where the brand has not disclosed it; each category is the
  // average of what is known. `tint` is each photo's own backdrop colour: the photo
  // sits on it, so the two must match or the photo's edge shows.
  // Claims: [label, icon, source, note]; source is "ai" (checked against the
  // ingredient list), "brand" (the brand's word only) or "cert" (certified).
  const PRODUCTS = {
    calma: {
      name: "Calma Gentle Foaming Cleanser", brand: "Calma", photo: "assets/calma.jpg", tint: "#F8FAFB", page: "product",
      sub: "Oil-Free Cleanser for Sensitive Skin", form: "Foaming gel", skin: "Sensitive", pack: "Bottle with pump",
      tags: ["Fragrance-free", "Sensitive skin"], desc: "Oil-free face wash for sensitive skin with niacinamide and ceramides",
      was: 23.49, sizes: [["6.76 fl oz (Pack of 1)", 11.99, 6.76], ["13.52 fl oz (Pack of 1)", 19.99, 13.52], ["13.52 fl oz (Pack of 2)", 37.99, 27.04]], size: 1, scents: ["Unscented"],
      short: "<b>Mixed:</b> gentle on sensitive skin, little sourcing data disclosed.",
      verdict: "Strong on dermatology testing and formula safety; scores lower on undisclosed sourcing data",
      factors: [100, 83, 60, 50, 30, null, 66, 50, null],
      claims: [
        ["Soap-Free", "soap", "ai", "No soap-based cleansers in the ingredient list; it cleans with mild synthetic surfactants."],
        ["Fragrance-Free", "fragrance", "ai", "No fragrance, parfum or scent allergens in the ingredient list."],
        ["Oil-Free", "oil", "ai", "No plant or mineral oils in the ingredient list."],
        ["Non-Comedogenic", "comedogenic", "brand", "Reported by the brand. No test results are published, so Greenera can't confirm it."],
        ["Paraben-Free", "paraben", "ai", "No parabens in the ingredient list."],
        ["Dermatologist-Tested", "derm", "brand", "Reported by the brand. The test itself hasn't been published."],
        ["Sulfate-Free", "sulfate", "ai", "No sulfate cleansers, such as SLS or SLES, in the ingredient list."],
        ["Allergy-Tested", "allergy", "brand", "Reported by the brand. How it was tested, and on whom, isn't published."],
      ],
      highlight: ["Niacinamide", "Ceramide NP", "Glycerin", "Sodium Cocoyl Glycinate", "Disodium EDTA"],
      ai: "This product is Cradle to Cradle Certified at the Silver level, covering safer chemicals, cleaner manufacturing, and worker well-being. Calma hasn't published packaging, animal-welfare, or raw-material sourcing data.",
      claim: ["“97% naturally derived”", "The brand's own figure. Calma hasn't said how it was calculated, and no certifier has checked it."],
      certs: [
        ["Cradle to Cradle Certified: Safer Chemicals", "Made with chemicals safer for human health and the environment. Certification #9781, Silver Achievement Level.", "c2c"],
        ["Cradle to Cradle Certified: Manufacturing Practices", "Manufactured using processes that reduce environmental impact. Certification #9781, Silver Achievement Level.", "c2c"],
        ["Cradle to Cradle Certified: Worker Well-Being", "Manufactured in facilities that protect the rights and health of workers. Certification #9781, Silver Achievement Level.", "c2c"],
      ],
      rating: 4.7, count: 45450, hist: [78, 13, 5, 2, 2],
      reviews: [["Finally doesn't sting", "My skin reacts to almost everything. This one doesn't, and it rinses clean.", 5], ["Good, wish the pump were refillable", "Gentle and does the job. I go through a bottle a month and the pump goes in the bin.", 4]],
      ingredients: formula(["Aqua / Water / Eau", "Glycerin", "Coco-Betaine*", "Propylene Glycol*", "Sodium Cocoyl Glycinate", "PEG-120 Methyl Glucose Dioleate*", "Sodium Chloride", "Ceramide NP", "Niacinamide", "Sodium Hydroxide", "Disodium EDTA*", "Capryloyl Glycine", "Caprylyl Glycol", "Citric Acid", "Acrylates Copolymer"]),
    },
    fern: {
      name: "Fern Daily Gel Cleanser", brand: "Fern", photo: "assets/fern.jpg", tint: "#D8D8DC",
      sub: "Gel Cleanser for All Skin Types", form: "Gel", skin: "All skin types", pack: "Squeeze tube",
      tags: ["Fragrance-free", "All skin types"], desc: "Gentle everyday gel cleanser with aloe, panthenol and allantoin",
      was: 16.99, sizes: [["6.76 fl oz (Pack of 1)", 14.99, 6.76], ["6.76 fl oz (Pack of 2)", 27.99, 13.52]], size: 0, scents: ["Unscented"],
      short: "<b>Good pick:</b> mild formula, cruelty-free certified, packaging data missing.",
      verdict: "Mild, well-labelled formula and certified cruelty-free; packaging recyclability not disclosed",
      factors: [90, 80, 82, 80, 70, 66, 80, 76, null],
      claims: [
        ["Soap-Free", "soap", "ai", "No soap-based cleansers in the ingredient list."],
        ["Fragrance-Free", "fragrance", "ai", "No fragrance, parfum or scent allergens in the ingredient list."],
        ["Sulfate-Free", "sulfate", "ai", "No sulfate cleansers in the ingredient list."],
        ["Paraben-Free", "paraben", "ai", "No parabens in the ingredient list; it is preserved with sodium benzoate and potassium sorbate."],
        ["Oil-Free", "oil", "ai", "No plant or mineral oils in the ingredient list."],
        ["Non-Comedogenic", "comedogenic", "brand", "Reported by the brand. No test results are published, so Greenera can't confirm it."],
      ],
      ai: "Fern is Leaping Bunny certified cruelty-free, and every ingredient is named on the label. Fern hasn't published packaging or recycled-content data.",
      claim: ["“Recyclable tube”", "The brand's own claim. Whether the tube is accepted for recycling depends on where you live, and Fern hasn't said what it's made of."],
      certs: [["Leaping Bunny: Cruelty Free", "No animal testing at any stage of product development, by the brand or its suppliers. Licence #LB-2231.", "lb"]],
      rating: 4.6, count: 12880, hist: [72, 17, 6, 3, 2],
      reviews: [["My everyday wash", "Light gel, no smell, leaves my skin soft rather than tight.", 5], ["Good value", "Cheaper than what I used before and gentler.", 4]],
      ingredients: formula(["Aqua / Water / Eau", "Glycerin", "Sodium Lauroyl Methyl Isethionate", "Cocamidopropyl Betaine*", "Decyl Glucoside", "Aloe Barbadensis Leaf Juice", "Panthenol", "Allantoin", "Sodium Chloride", "Citric Acid", "Sodium Benzoate", "Potassium Sorbate"]),
    },
    moss: {
      name: "Moss Cream Cleanser", brand: "Moss", photo: "assets/moss.jpg", tint: "#D8D8DC",
      sub: "Cream Cleanser for Dry Skin", form: "Cream", skin: "Dry", pack: "Bottle with pump",
      tags: ["Cream", "Dry skin"], desc: "Non-foaming cream cleanser with shea butter, squalane and ceramides",
      was: 19.99, sizes: [["5 fl oz (Pack of 1)", 17.49, 5], ["5 fl oz (Pack of 2)", 32.99, 10]], size: 0, scents: ["Unscented"],
      short: "<b>Good pick:</b> nourishing formula, sourcing partly disclosed.",
      verdict: "Nourishing, low-irritation formula; raw-material sourcing and packaging only partly disclosed",
      factors: [86, 72, 82, 64, 60, null, 78, 70, null],
      claims: [
        ["Soap-Free", "soap", "ai", "No soap-based cleansers in the ingredient list."],
        ["Sulfate-Free", "sulfate", "ai", "No sulfate cleansers in the ingredient list."],
        ["Paraben-Free", "paraben", "ai", "No parabens in the ingredient list; it is preserved with phenoxyethanol."],
        ["Fragrance-Free", "fragrance", "ai", "No fragrance or scent allergens in the ingredient list."],
        ["Dermatologist-Tested", "derm", "brand", "Reported by the brand. The test itself hasn't been published."],
        ["Allergy-Tested", "allergy", "brand", "Reported by the brand. How it was tested, and on whom, isn't published."],
      ],
      ai: "Moss is Leaping Bunny certified cruelty-free. It says its shea butter is sustainably sourced, but hasn't published where it comes from or who checks it.",
      claim: ["“Sustainably sourced shea”", "The brand's own claim. No sourcing certificate or supplier list is published."],
      certs: [["Leaping Bunny: Cruelty Free", "No animal testing at any stage of product development, by the brand or its suppliers. Licence #LB-4108.", "lb"]],
      rating: 4.5, count: 8214, hist: [66, 20, 8, 3, 3],
      reviews: [["Winter saviour", "Doesn't foam, which took getting used to, but my dry patches are gone.", 5], ["A bit heavy for summer", "Lovely in the cold months; too rich for me when it's humid.", 4]],
      ingredients: formula(["Aqua / Water / Eau", "Glycerin", "Caprylic/Capric Triglyceride", "Cetearyl Alcohol", "Glyceryl Stearate", "Sodium Cocoyl Glutamate", "Butyrospermum Parkii (Shea) Butter", "Squalane", "Ceramide NP", "Xanthan Gum", "Tocopherol", "Phenoxyethanol*", "Ethylhexylglycerin*"]),
    },
    birch: {
      name: "Birch Clarifying Gel Cleanser", brand: "Birch", tint: PALETTE.ink[200],
      sub: "Clarifying Cleanser for Oily Skin", form: "Gel", skin: "Oily", pack: "Bottle with pump",
      tags: ["Clarifying", "Oily skin"], desc: "Salicylic acid gel cleanser for oily and blemish-prone skin",
      was: 14.99, sizes: [["8 fl oz (Pack of 1)", 12.99, 8], ["16 fl oz (Pack of 1)", 21.99, 16]], size: 0, scents: ["Citrus", "Unscented"],
      short: "<b>Use with care:</b> several known irritants, little sourcing data disclosed.",
      verdict: "Effective on oil, but several known irritants and allergens; almost no sourcing data disclosed",
      factors: [62, 40, 72, 28, 40, null, null, 46, null],
      claims: [
        ["Oil-Free", "oil", "ai", "No plant or mineral oils in the ingredient list."],
        ["Paraben-Free", "paraben", "ai", "No parabens in the ingredient list, though it is preserved with methylisothiazolinone, a strong sensitiser."],
        ["Dermatologist-Tested", "derm", "brand", "Reported by the brand. The test itself hasn't been published."],
        ["Non-Comedogenic", "comedogenic", "brand", "Reported by the brand. No test results are published, and the formula contains several known irritants."],
      ],
      ai: "Birch hasn't published any third-party certifications. Its “natural” claim comes from the brand alone, and the formula lists fragrance and two scent allergens.",
      claim: ["“Natural formula”", "The brand's own claim, and “natural” has no agreed definition. The formula contains a synthetic preservative."],
      certs: [],
      rating: 4.1, count: 3902, hist: [48, 24, 12, 8, 8],
      reviews: [["Works on oil, but stings", "Clears my T-zone, though it burns a little around my nose.", 3], ["Love the smell", "Fresh citrus scent and it really cuts through oil.", 5]],
      ingredients: formula(["Aqua / Water / Eau", "Sodium Laureth Sulfate*", "Cocamidopropyl Betaine*", "Propylene Glycol*", "Glycerin", "Salicylic Acid*", "Sodium Chloride", "Parfum / Fragrance*", "Limonene*", "Linalool*", "Citric Acid", "Methylisothiazolinone*", "Disodium EDTA*"]),
    },
  };
  // Each mock product's packaging as the ingredient screen's bottle, in its 192.7 x 589 frame.
  // Only the right part shows on the rail, so every body's right edge runs down x = 186 to 192.7
  // as Calma's does, keeping one even gap to the list: Fern's squeeze tube, cap down, barely
  // tapered; Moss's and Birch's pump bottles, nozzles to the left, off the rail.
  PRODUCTS.fern.outline = "M4 6 H188.7 Q192.7 6 192.7 10 V40 C192.7 140 191 400 186 506 Q185 520 170 520 H140 V572 Q140 589 123 589 H70 Q53 589 53 572 V520 H23 Q8 520 7 506 C2 400 0 140 0 40 V10 Q0 6 4 6 Z";
  PRODUCTS.moss.outline = "M10 34 H62 V28 H130 V60 H120 V108 H142 Q192 108 192 158 V559 Q192 589 162 589 H32 Q2 589 2 559 V158 Q2 108 52 108 H72 V60 H62 V46 H10 Q4 46 4 40 Q4 34 10 34 Z";
  PRODUCTS.birch.outline = "M0 24 Q0 18 6 18 H130 Q138 18 138 26 V40 H120 V70 H134 Q144 70 144 80 V108 H156 Q192 108 192 144 V555 Q192 589 158 589 H34 Q0 589 0 555 V144 Q0 108 36 108 H48 V80 Q48 70 58 70 H72 V40 H6 Q0 40 0 34 Z";
  // Derived: the three category scores, the overall score, and the default price
  const avg = (xs) => { const k = xs.filter((x) => x != null); return k.length ? Math.round(k.reduce((a, b) => a + b, 0) / k.length) : null; };
  for (const pr of Object.values(PRODUCTS)) {
    pr.bars = [0, 1, 2].map((c) => avg(pr.factors.slice(c * 3, c * 3 + 3)));
    pr.score = Math.round(pr.bars.reduce((a, b) => a + b, 0) / 3);
    pr.price = money(pr.sizes[pr.size][1]);
    pr.oz = pr.sizes[pr.size][0].replace(/ \(.*/, "");
  }

  /** 70 and above green, 40 to 69 yellow, below 40 orange, as a palette colour. */
  const tone = (v) => PALETTE[v >= 70 ? "green" : v >= 40 ? "yellow" : "orange"];
  const band = (v) => tone(v)[300];
  /** A score pill: the 200 fill with 500 text. */
  const pillStyle = (v) => `background:${tone(v)[200]};color:${tone(v)[500]}`;
  const pageOf = (key) => PRODUCTS[key].page || `pdp-${key}`;
  const betterThan = (key) => Object.keys(PRODUCTS).filter((k) => k !== key && PRODUCTS[k].score > PRODUCTS[key].score).sort((a, b) => PRODUCTS[b].score - PRODUCTS[a].score);
  const summaryOf = (key) => {
    const list = PRODUCTS[key].ingredients, care = list.filter((x) => x.care).length;
    return `${list.length - care} with no known concerns, ${care} to use with care`;
  };
  // Birch has no photo, so its plain amber pump bottle is drawn here, label blank but its name
  const BIRCH_ART = `<svg viewBox="0 0 160 260" width="150" height="244" aria-hidden="true">
      <defs><linearGradient id="birchGlass" x1="0" x2="1"><stop offset="0" stop-color="#B9772F"/><stop offset="0.35" stop-color="#D99A4E"/><stop offset="0.5" stop-color="#E9B573"/><stop offset="1" stop-color="#A9672A"/></linearGradient></defs>
      <rect x="62" y="8" width="56" height="10" rx="4" fill="${PALETTE.ink[100]}" stroke="${PALETTE.ink[200]}"/>
      <rect x="30" y="6" width="36" height="8" rx="3" fill="${PALETTE.ink[100]}" stroke="${PALETTE.ink[200]}"/>
      <rect x="70" y="18" width="20" height="26" rx="3" fill="${PALETTE.ink[100]}" stroke="${PALETTE.ink[200]}"/>
      <rect x="62" y="40" width="36" height="22" rx="6" fill="${PALETTE.ink[100]}" stroke="${PALETTE.ink[200]}"/>
      <rect x="28" y="62" width="104" height="190" rx="22" fill="url(#birchGlass)"/>
      <rect x="40" y="70" width="10" height="170" rx="5" fill="#fff" opacity="0.28"/>
      <rect x="46" y="118" width="68" height="84" rx="4" fill="#fff"/>
      <text x="80" y="166" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-size="15" fill="${PALETTE.ink[500]}">Birch</text>
    </svg>`;
  /** A product's picture at a given size: its photo on its own backdrop, or Birch's drawing. */
  const art = (key, cls = "thumb") => {
    const pr = PRODUCTS[key];
    return pr.photo ? `<img class="${cls}" src="${pr.photo}" alt="" style="background:${pr.tint}">` : `<span class="${cls} art-mini" style="background:${pr.tint}">${BIRCH_ART}</span>`;
  };

  /* ------------------------------ shared: sheet and toast ------------------------------ */

  // One bottom sheet for every picker and detail: springs up, drags down to close.
  const gs = $("gSheet"), gScrim = $("gScrim"), gBody = $("gBody");
  const gsH = () => gs.offsetHeight + 20;
  const gsY = spring(1000, (y) => {
    gs.style.transform = `translateY(${y}px)`;
    gScrim.style.opacity = String(Math.max(0, 1 - y / gsH()));
  });
  let gsOnClose = null;
  const sheetOpen = () => !gs.hidden && gScrim.classList.contains("is-on");
  function openSheet(html, setup, onClose) {
    gBody.innerHTML = html;
    gBody.scrollTop = 0;
    gs.hidden = false;
    gScrim.classList.add("is-on");
    gsOnClose = onClose || null;
    setup && setup(gBody);
    gsY.set(gsH());
    gsY.to(0, { response: 0.4, damping: 1 });
    const f = gBody.querySelector("[autofocus], button");
    f && f.focus({ preventScroll: true });
  }
  function closeSheet(velocity) {
    if (gs.hidden) return;
    gScrim.classList.remove("is-on");
    gsY.to(gsH(), { response: 0.36, damping: 1, velocity, onDone: () => (gs.hidden = true) });
    const f = gsOnClose;
    gsOnClose = null;
    f && f();
  }
  gScrim.addEventListener("click", () => closeSheet());
  gBody.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeSheet(); });
  {
    let start = null, samples = [], live = false;
    gs.addEventListener("pointerdown", (e) => {
      // Dragging the list inside scrolls it; only a sheet at its top is dragged down
      if (e.target.closest(".g-body") && gBody.scrollTop > 0) return;
      if (e.target.closest("input, select")) return;
      start = local(e); samples = [start]; live = false;
    });
    addEventListener("pointermove", (e) => {
      if (!start) return;
      const p = local(e);
      samples.push(p);
      const dy = p.y - start.y;
      if (!live && (dy < 8 || gBody.scrollHeight > gBody.clientHeight && dy < 0)) return;
      live = true;
      dragged = true;
      gsY.set(dy > 0 ? dy : -rubber(-dy, gsH()));
    });
    const end = () => {
      if (!start) return;
      start = null;
      if (!live) return;
      const v = velocity(samples).y;
      if (gsY.value + project(v) > gsH() / 2) closeSheet(v);
      else gsY.to(0, { response: 0.36, damping: Math.abs(v) > 300 ? 0.82 : 1, velocity: v });
    };
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }
  /** A list of choices in the sheet, the current one ticked. */
  function openPicker(title, options, current, onPick) {
    const tick = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    openSheet(`<h3 class="gs-title">${title}</h3><div class="gs-list" role="listbox" aria-label="${title}">${options.map((o, i) => `<button type="button" class="gs-opt" role="option" aria-selected="${i === current}" data-i="${i}"><span><b>${o[0]}</b>${o[1] ? `<small>${o[1]}</small>` : ""}</span>${i === current ? tick : ""}</button>`).join("")}</div>`, (root) => {
      root.querySelectorAll(".gs-opt").forEach((b) => b.addEventListener("click", () => { onPick(Number(b.dataset.i)); closeSheet(); }));
    });
  }

  const toastEl = $("toast"), toastAct = $("toastAct");
  let toastTimer;
  function toast(text, action, onAction) {
    $("toastText").textContent = text;
    toastAct.hidden = !action;
    toastAct.textContent = action || "";
    toastAct.onclick = onAction ? () => { hideToast(); onAction(); } : null;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 3600 : 2400);
  }
  const hideToast = () => toastEl.classList.remove("is-on");

  /* ------------------------------ search ------------------------------ */

  // Every top bar gets a live search field, laid exactly over the one drawn in the
  // bar's export. Typing suggests products by name, brand, type or tag, and by
  // ingredient ("Contains Niacinamide"); arrows move through them, Enter opens one.
  const panel = $("searchPanel"), sScrim = $("searchScrim");
  const MAG = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="7.8" cy="7.8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12.2 12.2L16 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  let sInput = null, sResults = [], sAt = -1;
  const searchOpen = () => !panel.hidden;
  function addSearch(sec, width) {
    const box = document.createElement("label");
    box.className = "search";
    box.style.width = `${width}px`;
    box.innerHTML = `${MAG}<input type="text" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" placeholder="Search or scan a product" aria-label="Search products" role="combobox" aria-expanded="false" aria-controls="searchPanel"><button type="button" class="search-clear" aria-label="Clear search" hidden><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`;
    sec.appendChild(box);
    const input = box.querySelector("input"), clear = box.querySelector(".search-clear");
    input.addEventListener("focus", () => { sInput = input; renderSearch(); });
    input.addEventListener("input", () => { sAt = -1; clear.hidden = !input.value; renderSearch(); });
    clear.addEventListener("click", (e) => { e.preventDefault(); input.value = ""; clear.hidden = true; input.focus(); renderSearch(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = panel.querySelectorAll(".s-row").length;
        if (!n) return;
        sAt = (sAt + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
        markActive();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const rows = panel.querySelectorAll(".s-row");
        (rows[Math.max(0, sAt)] || rows[0])?.click();
      }
    });
  }
  function results(q) {
    q = q.trim().toLowerCase();
    if (!q) return Object.keys(PRODUCTS).sort((a, b) => PRODUCTS[b].score - PRODUCTS[a].score).map((key) => ({ key, sub: `${PRODUCTS[key].oz} · ${PRODUCTS[key].sub}` }));
    const out = [];
    for (const [key, pr] of Object.entries(PRODUCTS)) {
      const name = pr.name.toLowerCase();
      const fields = [pr.sub, `${pr.form} cleanser`, ...pr.tags, "Face wash"];
      const meta = fields.find((f) => f.toLowerCase().includes(q));
      const ingr = pr.ingredients.find((x) => x.name.toLowerCase().includes(q));
      const rank = name.startsWith(q) ? 0 : name.split(/\s+/).some((w) => w.startsWith(q)) ? 1 : name.includes(q) ? 2 : meta ? 3 : ingr ? 4 : -1;
      if (rank < 0) continue;
      out.push({ key, rank, sub: rank < 3 ? `${pr.oz} · ${pr.sub}` : rank === 3 ? meta : `Contains ${ingr.name}`, hit: rank < 3 ? "name" : rank === 3 ? "sub" : "ing" });
    }
    return out.sort((a, b) => a.rank - b.rank || PRODUCTS[b.key].score - PRODUCTS[a.key].score);
  }
  /** The query's letters in bold where they match, the rest as is. */
  const hl = (text, q) => {
    const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
  };
  function renderSearch() {
    if (!sInput) return;
    const q = sInput.value.trim();
    sResults = results(q);
    const head = q ? (sResults.length ? `${sResults.length} ${sResults.length === 1 ? "product" : "products"}` : "") : "Suggested for you";
    panel.innerHTML = `${head ? `<p class="s-head">${head}</p>` : ""}${
      sResults.length
        ? sResults.map((r, i) => {
            const pr = PRODUCTS[r.key];
            return `<button type="button" class="s-row" role="option" id="s-opt-${i}" data-key="${r.key}">${art(r.key, "s-thumb")}<span class="s-txt"><b>${r.hit === "name" ? hl(pr.name, q) : esc(pr.name)}</b><small>${r.hit === "ing" ? `Contains ${hl(r.sub.slice(9), q)}` : r.hit === "sub" ? hl(r.sub, q) : esc(r.sub)}</small></span><span class="s-end"><span class="pill" style="${pillStyle(pr.score)}">${pr.score}%</span><span class="s-price">${pr.price}</span></span></button>`;
          }).join("")
        : `<div class="s-empty"><b>No products match “${esc(q)}”</b><small>Try a brand, a product type or an ingredient, or scan the barcode.</small></div>`
    }<button type="button" class="s-scan"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 6V4a2 2 0 0 1 2-2h2M12 2h2a2 2 0 0 1 2 2v2M16 12v2a2 2 0 0 1-2 2h-2M6 16H4a2 2 0 0 1-2-2v-2M5 9h8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>Scan a product instead</button>`;
    const sec = sInput.closest(".screen");
    panel.hidden = false;
    sScrim.hidden = false;
    sec.classList.add("is-searching");
    sInput.setAttribute("aria-expanded", "true");
    markActive();
  }
  function markActive() {
    panel.querySelectorAll(".s-row").forEach((r, i) => r.classList.toggle("is-active", i === sAt));
    sInput?.setAttribute("aria-activedescendant", sAt >= 0 ? `s-opt-${sAt}` : "");
    panel.querySelector(".s-row.is-active")?.scrollIntoView({ block: "nearest" });
  }
  function closeSearch(keepText) {
    if (!sInput) return;
    panel.hidden = true;
    sScrim.hidden = true;
    sInput.setAttribute("aria-expanded", "false");
    sInput.closest(".screen")?.classList.remove("is-searching");
    if (!keepText) { sInput.value = ""; sInput.nextElementSibling.hidden = true; }
    sInput.blur();
    sInput = null;
    sAt = -1;
  }
  // Rows are pressed, not focused, so the field keeps the keyboard until one is chosen
  panel.addEventListener("pointerdown", (e) => e.preventDefault());
  panel.addEventListener("click", (e) => {
    const row = e.target.closest(".s-row");
    if (row) return go(pageOf(row.dataset.key));
    if (e.target.closest(".s-scan")) home();
  });
  sScrim.addEventListener("click", () => closeSearch(true));

  /* ------------------------------ the scan card, for any product ------------------------------ */

  // Which product the card shows. The shutter scans the bottle in front of the camera
  // (Calma); a photo from the library scans whichever product is in it.
  const scan = { key: "calma", pick: null };
  function setScan(key) {
    const pr = PRODUCTS[key], C = 188.5;
    scan.key = key;
    scan.pick = betterThan(key)[0] || null;
    $("ringNum").textContent = pr.score;
    sheet.style.setProperty("--ring-off", (C * (1 - pr.score / 100)).toFixed(1));
    sheet.style.setProperty("--ring-col", tone(pr.score)[200]);
    $("verdict").innerHTML = pr.short;
    $("tiles").innerHTML = pr.bars.map((v, i) => `<div class="tile"><i class="bar" style="width:${v}%;background:${tone(v)[200]}"></i><span class="tile-name">${BAR_NAMES[i].replace(" ", "<br>")}</span><span class="tile-num">${v}%</span></div>`).join("");
    $("prodThumb").innerHTML = art(key);
    $("prodName").textContent = pr.name;
    $("prodSize").textContent = pr.oz;
    $("prodSub").textContent = pr.sub;
    $("prodPrice").textContent = pr.price;
    const pick = $("toPick");
    pick.hidden = !scan.pick;
    if (scan.pick) {
      const pp = PRODUCTS[scan.pick];
      $("pickThumb").innerHTML = art(scan.pick);
      $("pickPill").textContent = `${pp.score}%`;
      $("pickPill").setAttribute("style", pillStyle(pp.score));
      $("pickName").textContent = pp.name;
      $("pickPrice").textContent = pp.price;
    }
  }
  setScan("calma");
  // A library photo replaces the camera until the card is closed
  const STATUS_BAR = `<span class="status-bar" aria-hidden="true"><b>9:41</b><i class="island"></i><span class="sb-icons"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.6-3a3.6 3.6 0 0 0-5.2 0zM3.6 6.6a6.2 6.2 0 0 1 8.8 0l1.5-1.7a8.6 8.6 0 0 0-11.8 0zM.6 3.2a10.6 10.6 0 0 1 14.8 0L16 2.5a11.6 11.6 0 0 0-16 0z"/></svg><span class="sb-batt">80</span></span></span>`;
  function showPhoto(key) {
    const bg = $("photoBg"), pr = PRODUCTS[key];
    bg.style.background = pr.tint;
    // The close button and a note that this is a photo, since the camera's own are hidden under it
    // The photo fills the screen: blurred to the edges behind, sharp in the middle, with
    // the status bar drawn over it rather than a strip of the camera's scene
    const blur = pr.photo ? `<img class="photo-blur" src="${pr.photo}" alt="">` : "";
    bg.innerHTML = `${blur}${pr.photo ? `<img class="photo-main" src="${pr.photo}" alt="${esc(pr.name)}">` : BIRCH_ART}${STATUS_BAR}<span class="photo-x" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><span class="photo-chip">Photo from your library</span>`;
    bg.hidden = false;
  }
  function restoreCamera() {
    $("photoBg").hidden = true;
    if (scan.key !== "calma") setScan("calma");
  }
  // The flash: a torch over the scene, on until it is turned off
  const BOLT = (on) => `<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 2L4.5 11.2h5L8.6 18 15.5 8.6h-5z" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>${on ? "" : '<path d="M3 3l14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'}</svg>`;
  const flashBtn = $("flashBtn");
  let torch = false;
  const renderFlash = () => {
    flashBtn.innerHTML = BOLT(torch);
    flashBtn.setAttribute("aria-pressed", String(torch));
    flashBtn.classList.toggle("is-on", torch);
    $("scan").classList.toggle("torch", torch);
  };
  renderFlash();
  flashBtn.addEventListener("click", () => { torch = !torch; renderFlash(); toast(torch ? "Flash on" : "Flash off"); });
  $("photosBtn").addEventListener("click", () => {
    openSheet(`<h3 class="gs-title">Scan a photo</h3><p class="gs-sub">Pick a photo of a product's front or barcode.</p><div class="gs-photos">${Object.keys(PRODUCTS).map((k) => `<button type="button" class="gs-photo" data-key="${k}" aria-label="Photo of ${esc(PRODUCTS[k].name)}">${art(k, "gs-photo-img")}</button>`).join("")}</div>`, (root) => {
      root.querySelectorAll(".gs-photo").forEach((b) => b.addEventListener("click", () => {
        const key = b.dataset.key;
        closeSheet();
        if (sheet.classList.contains("is-up")) settleTo("hidden");
        setTimeout(() => { showPhoto(key); scanNow(key); }, reduce ? 0 : 260);
      }));
    });
  });

  /* ------------------------------ product pages ------------------------------ */

  // Claim icons: the eight from the Figma page, cut at 2x from its export (assets/claims/)
  const claimIcon = (c) => `<img class="claim-ico" src="assets/claims/${c[1]}.png" width="24" height="24" alt="">`;
  const SOURCE = { ai: ["AI-analyzed", "lav"], brand: ["Brand-reported", "ink"], cert: ["Certified", "green"] };
  const CERT_STD = {
    c2c: ["Cradle to Cradle Certified", "Cradle to Cradle Products Innovation Institute", "A product standard assessed by an independent body across five categories, each awarded a level from Bronze to Platinum. The product's overall level is its lowest category.", ["Material health", "Product circularity", "Clean air and climate protection", "Water and soil stewardship", "Social fairness"]],
    lb: ["Leaping Bunny", "Cruelty Free International", "A cruelty-free standard: no new animal testing by the brand, its manufacturers or its ingredient suppliers, kept up by supplier monitoring and independent audits.", ["No animal testing after a fixed cut-off date", "Supplier monitoring system", "Independent audits", "Renewed every year"]],
  };
  const DETAILS = (pr, key) => {
    const care = pr.ingredients.filter((x) => x.care).map((x) => x.name);
    return [
      ["Highlights", `<ul>${[...pr.tags, ...pr.claims.filter((c) => c[2] !== "brand").slice(0, 3).map((c) => c[0])].map((t) => `<li>${t}</li>`).join("")}</ul>`],
      ["Product details", `<dl><dt>Brand</dt><dd>${pr.brand}</dd><dt>Form</dt><dd>${pr.form}</dd><dt>Skin type</dt><dd>${pr.skin}</dd><dt>Scent</dt><dd>${pr.scents.join(", ")}</dd></dl>`],
      ["Specification", `<dl><dt>Size</dt><dd>${pr.sizes.map((s) => s[0]).join("; ")}</dd><dt>Ingredients</dt><dd>${pr.ingredients.length}</dd><dt>Packaging</dt><dd>${pr.pack}</dd><dt>Made in</dt><dd><span class="nd">Not disclosed</span></dd></dl>`],
      ["Shipping & Returns", "<p>Ships in 1 to 2 business days. Free returns within 30 days on unopened items.</p>"],
      ["Policies, terms & Conditions", "<p>Prices and offers are set by the seller. Greenera scores are independent: brands can't pay to change them.</p>"],
      ["Warnings & Disclosure", `<p>For external use only. Avoid contact with eyes; if it gets in them, rinse well with water.${care.length ? ` Use with care if your skin reacts to ${care.slice(0, 3).join(", ")}${care.length > 3 ? " or similar" : ""}.` : ""}</p>`],
    ];
  };

  // The buyer's choices on each page, kept while the prototype is open
  const buy = {};
  const cart = [];

  /** One product page, in the layout of Calma's Figma page. */
  function buildProductPage(key) {
    const pr = PRODUCTS[key];
    buy[key] = { size: pr.size, qty: 1, opt: "one", scent: 0, more: false };
    const sec = document.createElement("section");
    sec.className = "screen scroller pdp";
    sec.id = pageOf(key);
    sec.setAttribute("aria-label", pr.name);
    const better = betterThan(key);
    const others = better.length ? better : Object.keys(PRODUCTS).filter((k) => k !== key).sort((a, b) => PRODUCTS[b].score - PRODUCTS[a].score);
    const pick = better[0];
    const C = 188.5; // the ring's circumference, r = 30
    const shown = pr.highlight ? pr.highlight.map((n) => pr.ingredients.findIndex((x) => x.name === n)) : (() => {
      const good = pr.ingredients.map((x, i) => i).filter((i) => i > 0 && !pr.ingredients[i].care).slice(0, 4);
      const care = pr.ingredients.findIndex((x) => x.care);
      return care >= 0 ? [...good, care] : good;
    })();
    // The gallery: the photo, the front of the pack, and the label's ingredient list
    const photo = key === "calma" ? '<div class="slide-photo calma-photo" role="img" aria-label="Calma Gentle Foaming Cleanser in a splash of water"></div>' : `<div class="slide-photo" style="background:${pr.tint}">${pr.photo ? `<img src="${pr.photo}" alt="${esc(pr.name)}, a plain unbranded bottle">` : BIRCH_ART}</div>`;
    const slides = [
      photo,
      `<div class="slide-card front"><span class="front-brand">${pr.brand}</span><span class="front-name">${pr.name.replace(pr.brand + " ", "")}</span><span class="front-tags">${pr.claims.slice(0, 4).map((c) => c[0]).join(" · ")}</span><span class="front-size">${pr.oz}</span><span class="front-cap">On the front of the pack</span></div>`,
      `<div class="slide-card label"><span class="front-cap">Ingredients, as printed</span><p>${pr.ingredients.map((x) => x.name.toUpperCase()).join(", ")}.</p></div>`,
    ];
    sec.innerHTML = `
      <div class="scroll p-scroll">
        <div class="gallery" role="region" aria-roledescription="carousel" aria-label="Product images">${slides.map((s, i) => `<div class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${slides.length}">${s}</div>`).join("")}</div>
        <div class="dots">${slides.map((_, i) => `<button type="button" class="dot${i ? "" : " is-on"}" data-act="slide" data-i="${i}" aria-label="Image ${i + 1}"></button>`).join("")}</div>
        <div class="p-pad">
          <div class="p-tags">${pr.tags.map((t) => `<span>${t}</span>`).join("")}</div>
          <h2 class="p-title">${pr.name}</h2>
          <p class="p-desc"><span data-oz></span> · ${pr.desc}</p>
          <p class="p-was" data-was>Last Price: <s></s> <span class="p-save" data-save></span></p>
          <p class="p-price"><span data-price></span> <small data-unit></small></p>
          <div class="p-field"><span>Scent:</span>${pr.scents.length > 1 ? `<button type="button" class="p-select" data-act="scent"><span data-scent></span>${DOWN}</button>` : '<span class="p-select is-fixed"><span data-scent></span></span>'}</div>
          <div class="p-field"><span>Size:</span><button type="button" class="p-select" data-act="size"><span data-size></span>${DOWN}</button></div>
          <div class="p-card p-buy">
            <div class="p-opts" role="radiogroup" aria-label="Purchase option">
              <button type="button" class="p-opt" role="radio" data-act="opt" data-v="one"><span class="p-opt-t">One-Time Purchase</span><span class="p-opt-p"><b data-one></b> <small data-one-unit></small></span><span class="p-chip grey">Free returns</span></button>
              <button type="button" class="p-opt" role="radio" data-act="opt" data-v="sub"><span class="p-opt-t">Subscribe &amp; Save</span><span class="p-chip green">Save 5%</span><span class="p-opt-p"><b data-sub></b> <small data-sub-unit></small></span><span class="p-chip coupon">5% coupon applied</span></button>
            </div>
            <div class="p-field inner"><span>Quantity:</span><button type="button" class="p-select" data-act="qty"><span data-qty></span>${DOWN}</button></div>
            <button type="button" class="p-btn green" data-act="cart">Add to Cart</button>
            <button type="button" class="p-btn ink" data-act="buy">Buy Now</button>
            <div class="p-more" data-more><div><dl>
              <dt>Ships from</dt><dd>Greenera</dd><dt>Sold by</dt><dd>${pr.brand}</dd>
              <dt>Delivery</dt><dd>Tomorrow, order within 3 hrs</dd><dt>Returns</dt><dd>Free within 30 days</dd>
            </dl></div></div>
            <button type="button" class="p-more-btn" data-act="more" aria-expanded="false"><span>See more details</span>${DOWN}</button>
          </div>

          <h3 class="p-h">At a Glance</h3>
          <div class="p-card p-glance">
            <div class="p-score">
              <svg class="p-ring" viewBox="0 0 76 76" width="75" height="77" aria-hidden="true">
                <circle cx="38" cy="38" r="30" fill="none" stroke="${PALETTE.ink[100]}" stroke-width="15"/>
                <circle cx="38" cy="38" r="30" fill="none" stroke="${tone(pr.score)[200]}" stroke-width="15" stroke-dasharray="${C}" stroke-dashoffset="${(C * (1 - pr.score / 100)).toFixed(1)}" transform="rotate(-90 38 38)"/>
                <circle cx="38" cy="38" r="37.4" fill="none" stroke="${PALETTE.ink[300]}" stroke-width="0.2"/>
                <circle cx="38" cy="38" r="22.6" fill="none" stroke="${PALETTE.ink[300]}" stroke-width="0.2"/>
              </svg>
              <span class="p-ring-num">${pr.score}%</span>
              <div class="p-score-copy">
                <p class="p-score-title">Verified Score <span class="t-tag">(AI-Generated )</span></p>
                <button type="button" class="p-verdict" data-act="score">${pr.verdict} — expand for the full breakdown →</button>
                <button type="button" class="p-criteria" data-act="score" aria-label="Show scoring criteria">Show scoring criteria</button>
              </div>
            </div>
            <div class="p-tiles">${pr.bars.map((v, i) => `<button type="button" class="p-tile" data-act="score" data-cat="${i}" aria-label="${BAR_NAMES[i]}: ${v}%"><i style="width:${v}%;background:${tone(v)[200]}"></i><span>${BAR_NAMES[i].replace(" ", "<br>")}</span><b>${v}%</b></button>`).join("")}</div>
            <button type="button" class="p-next" data-act="score">See full breakdown ${CHEV}</button>
            <div class="p-claims">${pr.claims.map((c, i) => `<button type="button" class="p-claim" data-act="claim" data-i="${i}">${claimIcon(c)}<span>${c[0]}</span></button>`).join("")}</div>
            ${pick ? `<button class="row pick p-pick" type="button" data-to="${pick}" aria-label="Better pick: ${esc(PRODUCTS[pick].name)}">${art(pick)}<span class="row-text"><span class="pick-line"><span class="t-small">Better pick</span><span class="pill" style="${pillStyle(PRODUCTS[pick].score)}">${PRODUCTS[pick].score}%</span></span><span class="t-name">${PRODUCTS[pick].name}</span></span><span class="row-end"><span class="t-price-sm">${PRODUCTS[pick].price}</span><span class="t-link">details ${CHEV}</span></span></button>` : `<p class="p-best">The highest-scoring cleanser Greenera has checked.</p>`}
          </div>

          <h3 class="p-h">Ingredient Breakdown <span class="t-tag">(AI-Generated)</span></h3>
          <ul class="p-ings">${shown.map((i) => { const x = pr.ingredients[i]; return `<li><button type="button" data-act="ing" data-i="${i}"><i style="background:${x.care ? PALETTE.yellow[300] : PALETTE.green[300]}"></i><b>${x.name}</b><small>${x.line}</small></button></li>`; }).join("")}</ul>
          <button class="p-all" type="button" data-act="all" aria-label="Show all ${pr.ingredients.length} ingredients">Show All (${pr.ingredients.length} ingredients) ${CHEV}</button>

          <h3 class="p-h cert">Certification</h3>
          <div class="p-ai"><b>AI Analysis</b><p>${pr.ai}</p><button type="button" class="p-claimed" data-act="brand"><span>${pr.claim[0]}</span><span>Brand-reported</span></button></div>
          ${pr.certs.length ? pr.certs.map((c, i) => `<div class="p-cert"><b>${c[0]}</b><p>${c[1]}</p><button type="button" data-act="cert" data-i="${i}">View certification standard ${ARROW}</button></div>`).join("") : '<div class="p-cert empty"><b>Third-party certifications</b><span class="nd">Not disclosed</span></div>'}
        </div>

        <div class="p-details">
          <h3 class="p-h">Additional details</h3>
          ${DETAILS(pr, key).map(([t, body]) => `<div class="acc"><button type="button" class="acc-btn" data-act="acc" aria-expanded="false">${t}${DOWN}</button><div class="acc-body"><div>${body}</div></div></div>`).join("")}
        </div>

        <div class="p-pad tail">
          <div class="p-card p-reviews">
            <h3>Reviews</h3>
            <div class="p-rating"><span class="stars" aria-label="${pr.rating} out of 5 stars">${stars(pr.rating)}</span><b>${pr.rating} / 5</b></div>
            <p class="p-rnote">The rating is based on ${pr.count.toLocaleString("en-US")} user reviews.</p>
            <button type="button" class="p-btn ink sm" data-act="reviews">Read reviews</button>
            <p class="p-rfoot">Only people who have purchased the product can leave reviews.</p>
          </div>
          <h3 class="p-h alts">${better.length ? "Better-scoring alternatives" : "Other cleansers"}</h3>
          <div class="p-alts">${others.slice(0, 2).map((k) => `<button class="p-alt" type="button" data-to="${k}" aria-label="${esc(PRODUCTS[k].name)}"><span class="p-alt-img" style="background:${PRODUCTS[k].tint}">${PRODUCTS[k].photo ? `<img src="${PRODUCTS[k].photo}" alt="">` : `<span class="art-mini">${BIRCH_ART}</span>`}</span><span class="p-alt-name">${PRODUCTS[k].name}</span><span class="p-alt-meta"><span class="pill" style="${pillStyle(PRODUCTS[k].score)}">${PRODUCTS[k].score}%</span>${PRODUCTS[k].price}</span></button>`).join("")}</div>
        </div>
      </div>
      <div class="fixed-head" style="background-image:url(assets/product.jpg)"></div>
      <button class="hot" data-back style="left:12px;top:71px;width:40px;height:40px;border-radius:50%" aria-label="Back"></button>
      <button class="hot" data-home style="left:341px;top:71px;width:40px;height:40px;border-radius:50%" aria-label="Scan another product"></button>`;
    stage.insertBefore(sec, $("ingredients"));
    addSearch(sec, 265);
    renderBuy(key);

    // Gallery: the dots follow the swipe, and a dot scrolls to its image
    const gal = sec.querySelector(".gallery"), dots = [...sec.querySelectorAll(".dot")];
    gal.addEventListener("scroll", () => {
      const i = Math.round(gal.scrollLeft / 372);
      dots.forEach((d, j) => d.classList.toggle("is-on", j === i));
    }, { passive: true });

    sec.addEventListener("click", (e) => {
      const to = e.target.closest("[data-to]");
      if (to) return go(pageOf(to.dataset.to));
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const st = buy[key], i = Number(b.dataset.i);
      switch (b.dataset.act) {
        case "slide": gal.scrollTo({ left: i * 372, behavior: reduce ? "auto" : "smooth" }); break;
        case "scent": openPicker("Scent", pr.scents.map((s) => [s, ""]), st.scent, (j) => { st.scent = j; renderBuy(key); }); break;
        case "size": openPicker("Size", pr.sizes.map((s) => [s[0], `${money(s[1])} · ${money(s[1] / s[2])} / fl oz`]), st.size, (j) => { st.size = j; renderBuy(key); }); break;
        case "qty": openPicker("Quantity", [1, 2, 3, 4, 5, 6].map((n) => [String(n), money(unitPrice(key) * n)]), st.qty - 1, (j) => { st.qty = j + 1; renderBuy(key); }); break;
        case "opt": st.opt = b.dataset.v; renderBuy(key); break;
        case "more": st.more = !st.more; renderBuy(key); break;
        case "cart": addToCart(key, b); break;
        case "buy": checkout([line(key)]); break;
        case "score": openScore(key, b.dataset.cat == null ? null : Number(b.dataset.cat)); break;
        case "claim": claimSheet(pr.claims[i]); break;
        case "ing": openBreakdown(key, i); break;
        case "all": openBreakdown(key); break;
        case "brand": openSheet(`<span class="chip src ink">Brand-reported</span><h3 class="gs-title">${pr.claim[0]}</h3><p class="gs-text">${pr.claim[1]}</p><p class="gs-note">Brand-reported claims are shown as the brand wrote them, but they don't count toward the Verified Score until someone independent checks them.</p><button type="button" class="p-btn ink sm" data-close>Got it</button>`); break;
        case "cert": certSheet(pr.certs[i]); break;
        case "acc": {
          const open = b.getAttribute("aria-expanded") !== "true";
          b.setAttribute("aria-expanded", String(open));
          b.parentElement.classList.toggle("is-open", open);
          break;
        }
        case "reviews": reviewsSheet(key); break;
      }
    });
    sec.querySelector("[data-back]").addEventListener("click", () => back());
    sec.querySelector("[data-home]").addEventListener("click", home);
    edgeSwipe(sec);
  }

  const unitPrice = (key) => {
    const st = buy[key], s = PRODUCTS[key].sizes[st.size];
    return st.opt === "sub" ? Math.round(s[1] * 95) / 100 : s[1];
  };
  /** Prices, the chosen option and every select's value, after any change. */
  function renderBuy(key) {
    const sec = $(pageOf(key)), pr = PRODUCTS[key], st = buy[key], [label, price, oz] = pr.sizes[st.size];
    const sub = Math.round(price * 95) / 100;
    const set = (sel, v) => { sec.querySelector(sel).textContent = v; };
    set("[data-price]", money(price));
    set("[data-unit]", `(${money(price / oz)} / fl oz)`);
    // The last price, for this size: the default size's, scaled by volume; hidden when this size is no saving
    const was = Math.round(pr.was * (oz / pr.sizes[pr.size][2]) * 100) / 100;
    set("[data-was] s", money(was));
    set("[data-save]", `Save ${Math.round((1 - price / was) * 100)}%`);
    sec.querySelector("[data-was]").style.visibility = price < was ? "" : "hidden";
    set("[data-oz]", label.replace(/ \(.*/, ""));
    set("[data-scent]", pr.scents[st.scent]);
    set("[data-size]", label);
    set("[data-qty]", String(st.qty));
    set("[data-one]", money(price));
    set("[data-one-unit]", `(${money(price / oz)} / fl oz)`);
    set("[data-sub]", money(sub));
    set("[data-sub-unit]", `(${money(sub / oz)} / fl oz)`);
    sec.querySelectorAll(".p-opt").forEach((o) => {
      const on = o.dataset.v === st.opt;
      o.classList.toggle("is-on", on);
      o.setAttribute("aria-checked", String(on));
    });
    sec.querySelector("[data-more]").classList.toggle("is-open", st.more);
    sec.querySelector('[data-act="more"]').setAttribute("aria-expanded", String(st.more));
    set('[data-act="more"] span', st.more ? "See fewer details" : "See more details");
  }
  const line = (key) => {
    const st = buy[key], pr = PRODUCTS[key];
    return { key, qty: st.qty, each: unitPrice(key), size: pr.sizes[st.size][0], sub: st.opt === "sub", scent: pr.scents[st.scent] };
  };
  function addToCart(key, btn) {
    const l = line(key);
    const same = cart.find((c) => c.key === key && c.size === l.size && c.sub === l.sub && c.scent === l.scent);
    same ? (same.qty += l.qty) : cart.push(l);
    btn.classList.add("is-done");
    btn.textContent = "Added";
    setTimeout(() => { btn.classList.remove("is-done"); btn.textContent = "Add to Cart"; }, 1400);
    const n = cart.reduce((a, c) => a + c.qty, 0);
    toast(`Added to cart · ${n} ${n === 1 ? "item" : "items"}`, "View cart", () => checkout(cart, true));
  }
  /** The order sheet: lines, a delivery choice, the total, then a placed order. */
  function checkout(lines, fromCart) {
    let ship = 0;
    const subtotal = () => lines.reduce((a, l) => a + l.each * l.qty, 0);
    const SHIP = [["Standard", "3 to 5 days · Free", 0], ["Grouped delivery", "With your other orders, fewer trips · Free", 0], ["Express", "Tomorrow · $5.99", 5.99]];
    const draw = (root) => {
      root.innerHTML = `<h3 class="gs-title">${fromCart ? "Your cart" : "Checkout"}</h3>
        <div class="co-lines">${lines.map((l, i) => `<div class="co-line">${art(l.key)}<span class="co-txt"><b>${PRODUCTS[l.key].name}</b><small>${l.size}${l.sub ? " · Subscribe &amp; Save" : ""}</small></span><span class="co-qty"><button type="button" data-q="-1" data-i="${i}" aria-label="One fewer">−</button><span>${l.qty}</span><button type="button" data-q="1" data-i="${i}" aria-label="One more">+</button></span><b class="co-price">${money(l.each * l.qty)}</b></div>`).join("") || '<p class="gs-text">Your cart is empty.</p>'}</div>
        ${lines.length ? `<p class="gs-label">Delivery</p><div class="co-ship" role="radiogroup" aria-label="Delivery">${SHIP.map((s, i) => `<button type="button" role="radio" aria-checked="${i === ship}" class="co-opt${i === ship ? " is-on" : ""}" data-s="${i}"><span><b>${s[0]}</b><small>${s[1]}</small></span><i></i></button>`).join("")}</div>
        <div class="co-total"><span>Total</span><b>${money(subtotal() + SHIP[ship][2])}</b></div>
        <button type="button" class="p-btn ink" data-place>Place order</button>` : '<button type="button" class="p-btn ink sm" data-close>Keep shopping</button>'}`;
      root.querySelectorAll("[data-q]").forEach((b) => b.addEventListener("click", () => {
        const l = lines[Number(b.dataset.i)];
        l.qty += Number(b.dataset.q);
        if (l.qty < 1) lines.splice(Number(b.dataset.i), 1);
        draw(root);
      }));
      root.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { ship = Number(b.dataset.s); draw(root); }));
      root.querySelector("[data-place]")?.addEventListener("click", () => {
        const total = money(subtotal() + SHIP[ship][2]), n = lines.reduce((a, l) => a + l.qty, 0);
        if (fromCart) cart.length = 0;
        root.innerHTML = `<div class="co-done"><span class="co-tick"><svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M7 14.5l4.6 4.5L21 9.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><h3 class="gs-title">Order placed</h3><p class="gs-text">${n} ${n === 1 ? "item" : "items"}, ${total}. ${SHIP[ship][0] === "Grouped delivery" ? "It will travel with your other orders." : `Arriving ${ship === 2 ? "tomorrow" : "in 3 to 5 days"}.`}</p><p class="gs-note">This is a prototype: nothing was charged.</p><button type="button" class="p-btn ink sm" data-close>Done</button></div>`;
      });
    };
    openSheet("", draw);
  }
  function claimSheet(c) {
    const [label, cls] = SOURCE[c[2]];
    openSheet(`<span class="chip src ${cls}">${label}</span><h3 class="gs-title with-ico">${claimIcon(c)}${c[0]}</h3><p class="gs-text">${c[3]}</p><p class="gs-note">${c[2] === "brand" ? "Brand-reported claims don't count toward the Verified Score until someone independent checks them." : c[2] === "cert" ? "Checked by an independent certifier, so it counts toward the score." : "Checked by Greenera against the published ingredient list."}</p><button type="button" class="p-btn ink sm" data-close>Got it</button>`);
  }
  function certSheet(c) {
    const [name, by, text, checks] = CERT_STD[c[2]];
    const id = (c[1].match(/#[\w-]+/) || [""])[0], level = (c[1].match(/(\w+) Achievement Level/) || [])[1];
    openSheet(`<span class="chip src green">Certified</span><h3 class="gs-title">${name}</h3><p class="gs-text">${text}</p><dl class="gs-dl"><dt>Issued by</dt><dd>${by}</dd>${id ? `<dt>Certificate</dt><dd>${id}</dd>` : ""}${level ? `<dt>Level</dt><dd>${level}</dd>` : ""}</dl><p class="gs-label">What it checks</p><ul class="gs-ul">${checks.map((x) => `<li>${x}</li>`).join("")}</ul><button type="button" class="p-btn ink sm" data-close>Close</button>`);
  }
  function reviewsSheet(key) {
    const pr = PRODUCTS[key];
    openSheet(`<h3 class="gs-title">Reviews</h3><div class="rv-top"><b>${pr.rating}</b><span><span class="stars">${stars(pr.rating)}</span><small>${pr.count.toLocaleString("en-US")} reviews</small></span></div>
      <div class="rv-hist">${pr.hist.map((p, i) => `<div><span>${5 - i}</span><i><i style="width:${p}%"></i></i><small>${p}%</small></div>`).join("")}</div>
      ${pr.reviews.map((r) => `<div class="rv"><span class="stars sm">${stars(r[2])}</span><b>${r[0]}</b><p>${r[1]}</p><small>Verified purchase</small></div>`).join("")}`);
  }

  for (const key of Object.keys(PRODUCTS)) buildProductPage(key);

  /* ------------------------------ the Verified Score breakdown ------------------------------ */

  // One screen for every product, rebuilt when opened. Each factor opens to say what
  // it measures; a factor the brand hasn't disclosed is marked, never counted as zero.
  const bd = document.createElement("section");
  bd.className = "screen scroller";
  bd.id = "breakdown";
  bd.setAttribute("aria-label", "Verified Score breakdown");
  // The AI note is pinned to the foot of the screen, as on the ingredient breakdown, and opens the sources
  bd.innerHTML = `<div class="scroll bd-scroll"></div><button type="button" class="ing-foot bd-foot">AI summary from published safety data ${ARROW}</button><div class="fixed-head" style="background-image:url(assets/breakdown.png)"></div><button class="hot" data-back style="left:12px;top:71px;width:40px;height:40px;border-radius:50%" aria-label="Back"></button>`;
  stage.insertBefore(bd, $("ingredients"));
  addSearch(bd, 316);
  bd.querySelector("[data-back]").addEventListener("click", () => back());
  bd.querySelector(".bd-foot").addEventListener("click", sourcesSheet);
  edgeSwipe(bd);
  function openScore(key, cat) {
    const pr = PRODUCTS[key], sc = bd.querySelector(".scroll");
    sc.innerHTML = `
      <h2 class="bd-title">Verified Score Breakdown</h2>
      <p class="bd-intro">${key === "calma" ? "" : `${pr.name}. `}Each category is the average of its factors. Missing data is marked, not counted as zero.</p>
      ${CATS.map(([name, note, factors], c) => {
        const vals = pr.factors.slice(c * 3, c * 3 + 3), known = vals.filter((v) => v != null).length, v = pr.bars[c];
        return `<div class="bd-card" data-cat="${c}">
          <div class="bd-bar"><i style="width:${v}%;background:${tone(v)[200]}"></i><span>${name}</span><b>${v}%</b></div>
          ${factors.map((f, j) => `<div class="bd-f"><button type="button" aria-expanded="false">${CHEV}<span>${f}</span>${vals[j] == null ? '<span class="nd">Not disclosed</span>' : `<b>${vals[j]}%</b>`}</button><div class="bd-more"><div><p>${FACTORS[f]}</p>${vals[j] == null ? `<p class="bd-nd">${pr.brand} hasn't published this, so it is left out of the average rather than scored as zero.</p>` : ""}</div></div></div>`).join("")}
          <p class="bd-note">${note}${known < 3 ? ` Based on ${known} of 3 factors.` : ""}</p>
        </div>`;
      }).join("")}
`;
    sc.querySelectorAll(".bd-f > button").forEach((b) => b.addEventListener("click", () => {
      const open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", String(open));
      b.parentElement.classList.toggle("is-open", open);
    }));
    const at = cat == null ? 0 : sc.querySelector(`[data-cat="${cat}"]`).offsetTop - 131;
    go("breakdown", Math.max(0, at));
  }
  function sourcesSheet() {
    openSheet(`<span class="chip src lav">AI-Generated</span><h3 class="gs-title">How the summary is made</h3><p class="gs-text">Greenera reads the published ingredient list and the brand's disclosures, then checks each ingredient against public safety data. Certifications are checked against the certifier's own register.</p><p class="gs-label">Sources</p><ul class="gs-ul"><li>Cosmetic Ingredient Review safety assessments</li><li>EU CosIng ingredient database</li><li>Certifier registers (Cradle to Cradle, Leaping Bunny)</li><li>The brand's own published disclosures</li></ul><button type="button" class="p-btn ink sm" data-close>Close</button>`);
  }

  /* ------------------------------ ingredient breakdown ------------------------------ */

  // One breakdown screen serves every product: openBreakdown() points it at one and
  // pushes it. The shopper's allergy and flag marks are kept by ingredient name, so a
  // mark made on one product shows on every product that contains the ingredient.
  const ing = {
    screen: $("ingredients"), sc: $("ingredients").querySelector(".scroll"), list: $("ingList"),
    layers: $("layers"), sel: $("layerSel"), marks: $("marks"), bottle: $("bottle"), count: $("ingCount"),
    banner: $("ingBanner"), allergy: new Set(), flag: new Set(), current: -1, open: -1, run: 0,
    product: "calma", built: null, then: -1, pin: -1,
  };
  const items = () => PRODUCTS[ing.product].ingredients;
  /** Calma's bottle, drawn in the Figma ingredient screen; the others are drawn to their packaging below. */
  const CALMA_OUTLINE = ing.bottle.querySelector("svg path").getAttribute("d");
  /** Opens a product's ingredient breakdown; with `i`, that ingredient's sheet once the list is in. */
  function openBreakdown(key, i = -1) {
    ing.product = key;
    ing.then = i;
    if (stack[stack.length - 1] === "ingredients") { introIngredients(); return; }
    go("ingredients");
  }
  addSearch(ing.screen, 316);
  const SVG = "http://www.w3.org/2000/svg";
  // The bottle is 192.7 x 589 in its own coordinates; the bands run its full height,
  // touching, one per ingredient, as the Figma ingredient screen draws them
  const BODY_TOP = 0, BODY_BOTTOM = 589, GAP = 0, BOTTLE_W = 192.7, BOTTLE_H = 589;
  // One band per ingredient, in label order from the top of the bottle down, so the
  // bottle reads in the same order as the list beside it. A product with `percent`
  // (one value per ingredient, in label order) gets bands sized by them; without it,
  // every band is the same height, since no measured share is known.
  const geometry = () => {
    const list = items(), pct = PRODUCTS[ing.product].percent;
    const w = pct && pct.length === list.length ? pct : list.map(() => 1);
    const total = w.reduce((a, b) => a + b, 0);
    let y = BODY_TOP;
    return w.map((v) => { const h = ((BODY_BOTTOM - BODY_TOP) * v) / total; const g = { y, h }; y += h; return g; });
  };
  let GEO = [];
  const layerY = (i) => GEO[i].y;
  const layerH = (i) => GEO[i].h;
  const status = (i) => {
    const n = items()[i].name;
    return ing.flag.has(n) ? "flag" : ing.allergy.has(n) ? "allergy" : items()[i].care ? "care" : "good";
  };
  // Bands take their status colour from the palette: greens for no known concerns and
  // yellows for use with care, each alternating 300 and 200 so neighbours stay apart;
  // orange for an allergy the shopper marked, ink for one they flagged.
  const fillOf = (i) => {
    const st = status(i);
    if (st === "flag") return [PALETTE.ink[400], 1];
    if (st === "allergy") return [PALETTE.orange[300], 1];
    const tone = st === "care" ? PALETTE.yellow : PALETTE.green;
    return [i % 2 ? tone[200] : tone[300], 1];
  };
  const ICON = {
    allergy: `<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M4 1.2v3.2M4 6.3v.3" stroke="${PALETTE.ink[500]}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    flag: '<svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><path d="M2 7V1.3h3.8l-.8 1.3.8 1.3H2" fill="#fff" stroke="#fff" stroke-width="0.8" stroke-linejoin="round"/></svg>',
  };

  function renderIngredients() {
    const list = items();
    const careN = list.filter((x) => x.care).length;
    $("ingGood").textContent = list.length - careN;
    $("ingCare").textContent = careN;
    $("ingProduct").textContent = PRODUCTS[ing.product].name;
    // A different product rebuilds the bottle's layers and the list
    if (ing.built !== ing.product) {
      ing.built = ing.product;
      // The bottle takes the product's own shape: the clip, the fill and the edge share one outline
      const shape = PRODUCTS[ing.product].outline || CALMA_OUTLINE;
      ing.bottle.querySelectorAll("svg path").forEach((p) => p.setAttribute("d", shape));
      ing.layers.innerHTML = "";
      GEO = geometry();
      ing.sel.innerHTML = "";
      list.forEach((_, i) => {
        const r = document.createElementNS(SVG, "rect");
        r.setAttribute("x", "0"); r.setAttribute("width", String(BOTTLE_W));
        r.setAttribute("y", String(layerY(i))); r.setAttribute("height", String(layerH(i)));
        r.classList.add("layer");
        ing.layers.appendChild(r);
      });
      const o = document.createElementNS(SVG, "rect");
      o.setAttribute("x", "1"); o.setAttribute("width", String(BOTTLE_W - 2)); o.setAttribute("height", String(layerH(0))); o.setAttribute("rx", "3");
      o.classList.add("layer-sel"); o.style.opacity = "0";
      ing.sel.appendChild(o);
      ing.current = -1;
      ing.open = -1;
      ing.list.innerHTML = list.map((x, i) => `<li class="${x.care ? "care" : "good"}"><button class="ing-row" data-i="${i}" aria-expanded="false" aria-controls="ing-more-${i}"><span class="dot"></span><span class="txt"><b>${x.name}</b><small>${x.line}</small><span class="chips"></span><span class="ing-status"><span><span class="chip ${x.care ? "care" : "good"}">${x.care ? "Use with care" : "No known concerns"}</span></span></span></span></button>
        <div class="ing-more" id="ing-more-${i}"><div>
          <p class="ing-about">${x.about}</p>
          <div class="sheet-rows">
            <label class="switch-row"><span><b>Mark as allergy</b><small>Turns this layer orange in every product you scan</small></span><input type="checkbox" role="switch" class="sw-allergy" data-mark="allergy" data-i="${i}"><i></i></label>
            <label class="switch-row"><span><b>Flag ingredient</b><small>Adds it to your flagged list</small></span><input type="checkbox" role="switch" class="sw-flag" data-mark="flag" data-i="${i}"><i></i></label>
          </div>
        </div></div></li>`).join("");
      ing.list.querySelectorAll(".ing-row").forEach((b) => b.addEventListener("click", () => toggleIngredient(Number(b.dataset.i))));
      ing.list.querySelectorAll("[data-mark]").forEach((c) => c.addEventListener("change", () => {
        const set = ing[c.dataset.mark], n = items()[Number(c.dataset.i)].name;
        c.checked ? set.add(n) : set.delete(n);
        renderIngredients();
      }));
    }
    [...ing.layers.children].forEach((r, i) => {
      const [c, a] = fillOf(i);
      r.setAttribute("fill", c);
      r.setAttribute("fill-opacity", String(a));
    });
    ing.marks.innerHTML = list.map((_, i) => {
      const st = status(i);
      return st === "allergy" || st === "flag" ? `<span class="mark ${st}" style="top:${((layerY(i) + layerH(i) / 2) / BOTTLE_H) * 100}%">${ICON[st]}</span>` : "";
    }).join("");
    ing.list.querySelectorAll(".ing-row").forEach((b, i) => {
      const st = status(i), n = list[i].name;
      b.querySelector(".dot").style.background = list[i].care ? PALETTE.yellow[300] : PALETTE.green[300];
      const chips = [];
      if (ing.allergy.has(n)) chips.push('<span class="chip allergy">Allergy</span>');
      if (ing.flag.has(n)) chips.push('<span class="chip flag">Flagged</span>');
      const c = b.querySelector(".chips");
      c.innerHTML = chips.join("");
      c.style.display = chips.length ? "" : "none";
      const li = b.parentElement;
      li.querySelector(".sw-allergy").checked = ing.allergy.has(n);
      li.querySelector(".sw-flag").checked = ing.flag.has(n);
      b.setAttribute("aria-label", `${n}: ${st === "care" ? "use with care" : st === "good" ? "no known concerns" : st === "flag" ? "flagged" : "marked as an allergy"}`);
    });
    const hits = list.filter((x) => ing.allergy.has(x.name)).length;
    ing.banner.hidden = !hits;
    ing.banner.textContent = hits === 1 ? "Contains 1 ingredient you marked as an allergy" : `Contains ${hits} ingredients you marked as allergies`;
  }

  /** Outlines one layer in the bottle and its row in the list. */
  function selectIngredient(i) {
    if (i === ing.current) return;
    ing.current = i;
    const o = ing.sel.firstElementChild;
    if (!o) return;
    o.style.opacity = i < 0 ? "0" : "1";
    if (i >= 0) { o.setAttribute("y", String(layerY(i) + 1)); o.setAttribute("height", String(Math.max(0, layerH(i) - 2))); }
    ing.list.querySelectorAll(".ing-row").forEach((b, j) => b.classList.toggle("is-current", j === i));
  }
  // The list scrolls in its own box beside the fixed bottle; the row nearest that box's
  // top edge is the one the bottle outlines.
  const LIST_TOP = 0;
  ing.sc.addEventListener("scroll", () => {
    if (ing.screen.classList.contains("ing-intro")) return;
    // At the end of the list the last rows can't reach the top, so the one tapped
    // (or picked in the bottle) stays selected where it sits
    // While a card opens the list is moving to it: it stays the selected one throughout
    if (ing.sc.classList.contains("is-moving") && ing.pin >= 0) return selectIngredient(ing.pin);
    const atEnd = ing.sc.scrollTop + ing.sc.clientHeight >= ing.sc.scrollHeight - 2;
    if (atEnd && ing.pin >= 0) return selectIngredient(ing.pin);
    const rows = [...ing.list.querySelectorAll(".ing-row")];
    const line = ing.sc.scrollTop + LIST_TOP + 8;
    const top = ing.list.offsetTop;
    let i = rows.findIndex((r) => top + r.parentElement.offsetTop + r.parentElement.offsetHeight > line);
    selectIngredient(Math.max(0, i));
  });
  // Tapping a layer scrolls the list to its row
  ing.bottle.addEventListener("click", (e) => {
    if (ing.screen.classList.contains("ing-intro")) return;
    const r = ing.bottle.getBoundingClientRect();
    const y = ((e.clientY - r.top) / r.height) * BOTTLE_H;
    let i = GEO.findIndex((g) => y >= g.y && y < g.y + g.h);
    if (i < 0) i = y < BODY_TOP ? 0 : GEO.length - 1;
    i = Math.max(0, Math.min(items().length - 1, i));
    toTop(i);
    selectIngredient(i);
  });
  /** Scrolls a row to the top of the list, where it snaps and stays selected. */
  function toTop(i, smooth = !reduce) {
    ing.pin = i;
    const row = ing.list.querySelectorAll("li")[i];
    ing.sc.scrollTo({ top: ing.list.offsetTop + row.offsetTop - LIST_TOP, behavior: smooth ? "smooth" : "auto" });
  }
  /**
   * Opens a row's details below it and brings it to the top in one smooth scroll; tapped
   * again, closes it. Nothing may move the list but that scroll: a card open above closes
   * at once (it is usually off screen), snapping and scroll anchoring are paused, and the
   * room the card is about to grow into is reserved under the list so the scroll can reach
   * its target from the start rather than being cut short and corrected.
   */
  function toggleIngredient(i, force) {
    const open = force ?? ing.open !== i;
    const lis = [...ing.list.children], prev = ing.open, card = lis[i], wasOpen = card.classList.contains("is-open");
    const flush = () => void ing.list.offsetHeight;
    ing.sc.classList.add("is-moving");
    // Lay out the end state at once (the other card closed, this one open or shut) and
    // measure where the row will sit and how far the list will then scroll
    lis.forEach((li) => li.classList.add("instant"));
    lis.forEach((li, j) => {
      const on = open && j === i;
      li.classList.toggle("is-open", on);
      li.querySelector(".ing-row").setAttribute("aria-expanded", String(on));
    });
    flush();
    const target = Math.min(ing.list.offsetTop + card.offsetTop - LIST_TOP, ing.sc.scrollHeight - ing.sc.clientHeight);
    // Then play this card's change as the animation, from where it was
    card.classList.toggle("is-open", wasOpen);
    flush();
    lis.forEach((li) => li.classList.remove("instant"));
    flush();
    card.classList.toggle("is-open", open);
    // Room under the list while the card grows, so the scroll is never cut short
    ing.list.style.paddingBottom = `${16 + ing.sc.clientHeight}px`;
    ing.open = open ? i : -1;
    ing.pin = i;
    selectIngredient(i);
    ing.sc.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
    // Only once the scroll has ended (a long one outlasts the card's 300ms) and the card has
    // grown into the reserved room: hand the room back and resume snapping. Doing it sooner
    // cut the scroll short and snapped it back.
    const run = (ing.moveRun = (ing.moveRun || 0) + 1);
    let scrolled = false, grown = reduce;
    const finish = () => {
      if (run !== ing.moveRun || !scrolled || !grown) return;
      ing.list.style.paddingBottom = "";
      ing.sc.classList.remove("is-moving");
      ing.sc.dispatchEvent(new Event("scroll"));
    };
    ing.sc.addEventListener("scrollend", () => { scrolled = true; finish(); }, { once: true });
    setTimeout(() => { grown = true; finish(); }, 350);
    // No scroll needed, or no scrollend event: don't wait forever
    setTimeout(() => { scrolled = true; finish(); }, 1200);
  }

  /**
   * The load: the empty bottle, 240px tall in the middle, filling bottom to top with the
   * count climbing, a hold, then it settles at full size onto its rail at the left edge,
   * as the design draws it, and the list rises in.
   * Reduced motion skips to the end with a short fade.
   */
  function introIngredients() {
    const run = ++ing.run;
    const later = (ms, f) => setTimeout(() => run === ing.run && f(), ms);
    renderIngredients();
    selectIngredient(-1);
    // Whole cards rise in, their colour with them
    const rows = [...ing.list.children];
    const layers = [...ing.layers.children];
    ing.sc.scrollTop = 0;
    if (reduce) {
      layers.forEach((l) => l.classList.add("is-in"));
      rows.forEach((r) => r.classList.remove("pre", "rise"));
      ing.screen.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
      selectIngredient(0);
      afterIntro();
      return;
    }
    ing.screen.classList.add("ing-intro");
    ing.sc.classList.add("is-locked");
    layers.forEach((l) => l.classList.remove("is-in"));
    rows.forEach((r) => { r.classList.remove("rise"); r.classList.add("pre"); });
    // Where the rail's bottle is, and the move that puts it, twice the size, mid-screen
    const b = ing.bottle;
    b.style.transition = "none";
    b.style.transform = "";
    const st = stage.getBoundingClientRect(), r = b.getBoundingClientRect(), k = 393 / st.width;
    const cx = (r.left + r.width / 2 - st.left) * k, cy = (r.top + r.height / 2 - st.top) * k;
    // The whole bottle, 240px tall, mid-screen; it then grows onto its rail at the left edge
    const tx = 196.5, ty = 380, start = 240 / BOTTLE_H;
    b.style.transform = `translate(${tx - cx}px, ${ty - cy}px) scale(${start})`;
    const label = (n) => `${n} of ${layers.length} ingredients`;
    ing.count.style.top = `${ty + 120 + 16}px`;
    ing.count.textContent = label(0);
    ing.count.classList.add("is-on");
    // Fill, one layer every 80ms, the count in step
    const START = 350, STEP = 80;
    // Liquid fills from the bottom: the last ingredient's band first, the first's last
    [...layers].reverse().forEach((l, k) => later(START + k * STEP, () => { l.classList.add("is-in"); ing.count.textContent = label(k + 1); }));
    const full = START + layers.length * STEP + 200 + 300;
    // Move to the rail
    later(full, () => {
      // Ease out: it sets off quickly and settles onto the rail
      b.style.transition = "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)";
      b.style.transform = "";
      ing.count.classList.remove("is-on");
      ing.screen.classList.remove("ing-intro");
    });
    // The list rises in, 40ms apart
    rows.forEach((row, i) => later(full + 380 + i * 40, () => { row.classList.add("rise"); row.classList.remove("pre"); }));
    later(full + 380 + rows.length * 40 + 300, () => {
      ing.sc.classList.remove("is-locked");
      b.style.transition = "";
      selectIngredient(0);
      afterIntro();
    });
  }
  // An ingredient tapped on the product page: scroll to its row and open its sheet
  function afterIntro() {
    const i = ing.then;
    ing.then = -1;
    if (i < 0) return;
    toggleIngredient(i, true);
  }

  addEventListener("keydown", (e) => {
    if (e.key === "Escape" && ing.open >= 0 && stack[stack.length - 1] === "ingredients") { e.stopImmediatePropagation(); toggleIngredient(ing.open, false); }
  }, true);
  renderIngredients();

  // For the recording script: put the prototype in a state before the camera rolls.
  window.__greenera = { go, back, home, scanNow, setOpen, openBreakdown, openScore };

  // ?demo=hero: hold on the camera, scan, let the score fill, expand, hold, and loop.
  if (demo === "hero") {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    (async function loop() {
      for (;;) {
        reset();
        await wait(1200);
        scanNow();
        await wait(1900);
        setOpen(true);
        await wait(3200);
        setOpen(false);
        await wait(700);
        reset();
        await wait(700);
      }
    })();
  }
})();
