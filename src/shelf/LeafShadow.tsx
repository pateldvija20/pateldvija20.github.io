import { useMemo } from "react";

/**
 * The shadow of a few tree branches outside the window, falling across the
 * view from the upper left (Dvija, 6 Nov): blurred, faded, barely there, and
 * always swaying a little.
 *
 * - It belongs to the viewport, not the wall, so it stays put while the shelf
 *   moves underneath it.
 * - The branches are drawn and blurred once onto a canvas. After that only
 *   transforms animate, which the browser does on the GPU, so the constant
 *   sway costs almost nothing.
 * - Two branch layers sway on different, unrelated timings (and each layer
 *   mixes two motions), so the movement never visibly repeats.
 * - Reduced motion: the shadow stays, the sway stops (shelf.css).
 */
export default function LeafShadow() {
  const [far, near] = useMemo(() => [drawBranches(3, 0.55), drawBranches(17, 0.8)], []);
  return (
    <div className="leaf-shadow" aria-hidden="true">
      <div className="leaf-sway leaf-sway-a">
        <div className="leaf-layer leaf-layer-far" style={{ backgroundImage: `url(${far})` }} />
      </div>
      <div className="leaf-sway leaf-sway-b">
        <div className="leaf-layer leaf-layer-near" style={{ backgroundImage: `url(${near})` }} />
      </div>
    </div>
  );
}

/**
 * Branches entering from the top-left corner, each with a few side twigs
 * and leaves, drawn in one flat dark tone and blurred.
 */
function drawBranches(seed: number, reach: number): string {
  // Tall canvas: the shadow covers the left half of the screen, top to bottom.
  const W = 760;
  const H = 1240;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rand = mulberry32(seed);
  g.fillStyle = g.strokeStyle = "rgb(40,48,44)";
  g.lineCap = "round";
  g.filter = "blur(9px)";

  const leaf = (x: number, y: number, a: number, len: number) => {
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.beginPath();
    g.ellipse(len / 2, 0, len / 2, len * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };

  const branch = (x: number, y: number, a: number, len: number, width: number, depth: number) => {
    const steps = 14;
    let px = x, py = y, ang = a;
    for (let i = 0; i < steps; i++) {
      ang += (rand() - 0.5) * 0.18;
      const nx = px + Math.cos(ang) * (len / steps);
      const ny = py + Math.sin(ang) * (len / steps);
      g.lineWidth = width * (1 - i / steps) + 1;
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(nx, ny);
      g.stroke();
      if (i > 3 && rand() < 0.55) {
        const side = rand() < 0.5 ? -1 : 1;
        leaf(nx, ny, ang + side * (0.6 + rand() * 0.5), 34 + rand() * 26);
      }
      if (depth > 0 && i > 2 && i < steps - 3 && rand() < 0.16) {
        branch(nx, ny, ang + (rand() < 0.5 ? -1 : 1) * (0.5 + rand() * 0.4), len * 0.45, width * 0.5, depth - 1);
      }
      px = nx;
      py = ny;
    }
    for (let k = 0; k < 4; k++) leaf(px, py, ang + (rand() - 0.5) * 1.6, 30 + rand() * 24);
  };

  // Branches enter along the left and top edges and reach right and down,
  // so the whole area gets dappled rather than just the corner.
  const starts: [number, number, number][] = [
    [180, -20, 1.25],
    [-20, 40, 0.55],
    [-20, 330, 0.3],
    [-20, 620, 0.12],
    [-20, 900, -0.05],
  ];
  for (const [x, y, a] of starts) {
    branch(x, y + (rand() - 0.5) * 80, a + (rand() - 0.5) * 0.2, W * reach, 16, 2);
  }
  return c.toDataURL("image/png");
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
