import * as THREE from "three";

/** The wall plane's size in scene units; the texture below is laid over it. */
export const WALL_SIZE = { w: 60, h: 30 } as const;

/**
 * The window light, painted straight onto the wall (spec §4). The swaying
 * branch shadow is a separate layer over the viewport (LeafShadow.tsx).
 *
 * Painting it on, rather than projecting it from the light, puts the patch
 * exactly where it should sit (upper left of the opening view, behind the
 * lamp and the case studies) and costs nothing per frame. Objects still get
 * real shadows from the key light.
 *
 * The texture multiplies the wall colour: 1.0 is the sunlit patch, a little
 * under 1 is the rest of the wall.
 */
export function makeWallLight(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const px = (x: number) => ((x + WALL_SIZE.w / 2) / WALL_SIZE.w) * W;
  const py = (y: number) => (1 - (y + WALL_SIZE.h / 2) / WALL_SIZE.h) * H;
  const unit = W / WALL_SIZE.w;

  // The wall outside the patch.
  g.fillStyle = "rgb(222,222,222)";
  g.fillRect(0, 0, W, H);

  // A broad, very soft glow around the window, so the patch sits in light.
  const glow = g.createRadialGradient(px(-2.6), py(0.9), 0, px(-2.6), py(0.9), unit * 6);
  glow.addColorStop(0, "rgba(255,255,255,0.55)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);

  // The window patch: four panes, slanted as light from the upper left would fall.
  g.save();
  g.filter = `blur(${unit * 0.14}px)`;
  g.fillStyle = "rgb(255,255,255)";
  g.translate(px(-2.6), py(0.9));
  g.transform(1, 0, -0.28, 1, 0, 0);
  const pw = unit * 1.15, ph = unit * 1.35, bar = unit * 0.09;
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) g.fillRect(-pw - bar / 2 + i * (pw + bar), -ph - bar / 2 + j * (ph + bar), pw, ph);
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

