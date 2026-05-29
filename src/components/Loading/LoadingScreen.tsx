"use client";

import { useCallback, useRef, useState } from "react";
import gsap from "gsap";
import BackgroundPapers from "./BackgroundPapers";
import CuttingMat from "./CuttingMat";
import PercentageCounter from "./PercentageCounter";

type Props = { onComplete?: () => void };

export default function LoadingScreen({ onComplete }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [visible,  setVisible]  = useState(true);

  // Called by CuttingMat once uUnroll hits 1.0.
  // Holds 0.8 s then fades the overlay out over 0.6 s.
  const handleAnimComplete = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    gsap.to(overlay, {
      delay:    0.8,
      opacity:  0,
      duration: 0.6,
      ease:     "power2.in",
      onComplete() {
        setVisible(false);
        onComplete?.();
      },
    });
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: "#F3F2EE" }}
    >
      <BackgroundPapers />
      <CuttingMat
        onProgress={setProgress}
        onAnimationComplete={handleAnimComplete}
      />
      <PercentageCounter value={progress} />
    </div>
  );
}
