import { useMemo } from "react";

/**
 * The fine film grain over the whole frame (spec §4, from the lamp brief).
 *
 * A small random-noise tile, drawn once and repeated over the page with a
 * soft-light blend. Done in CSS rather than as a WebGL pass: it looks the
 * same and costs the GPU nothing.
 */
export default function Grain() {
  const url = useMemo(() => {
    const size = 160;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    const img = g.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }, []);

  return <div className="shelf-grain" aria-hidden="true" style={{ backgroundImage: `url(${url})` }} />;
}
