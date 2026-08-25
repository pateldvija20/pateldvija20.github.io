// useElementScale.ts
import { useEffect, useRef, useState } from "react";

const VERTICAL_MARGIN = 100; // px, top + bottom each

export function useElementScale(baseWidth: number, baseHeight: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const availableHeight = entry.contentRect.height - VERTICAL_MARGIN * 2;
      const next = Math.max(availableHeight / baseHeight, 0);
      setScale(next);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [baseHeight]);

  return { containerRef, scale };
}