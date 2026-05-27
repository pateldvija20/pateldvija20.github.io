"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import BackgroundPapers from "./BackgroundPapers";
import CuttingMat, {
  BACK_MAT_EXTRA_PX,
  MAT_FULL_WIDTH_VW,
  MAT_START_WIDTH_VW,
} from "./CuttingMat";
import PercentageCounter from "./PercentageCounter";

type LoadingScreenProps = {
  onComplete?: () => void;
};

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const frontClipRef = useRef<HTMLDivElement>(null);
  const backClipRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const front = frontClipRef.current;
    const back = backClipRef.current;
    const overlay = overlayRef.current;
    if (!front || !back || !overlay) return;

    const timeline = gsap.timeline({
      onUpdate() {
        setProgress(Math.round(timeline.progress() * 100));
      },
    });

    timeline.fromTo(
      front,
      { width: `${MAT_START_WIDTH_VW}vw` },
      { width: `${MAT_FULL_WIDTH_VW}vw`, duration: 3, ease: "power2.inOut" },
      0,
    );

    timeline.fromTo(
      back,
      { width: `calc(${MAT_START_WIDTH_VW}vw + ${BACK_MAT_EXTRA_PX}px)` },
      {
        width: `calc(${MAT_FULL_WIDTH_VW}vw + ${BACK_MAT_EXTRA_PX}px)`,
        duration: 3,
        ease: "power2.inOut",
      },
      0,
    );

    // Hold for 0.8s at 100%, then fade out overlay over 0.6s.
    timeline
      .to({}, { duration: 0.8 })
      .to(overlay, {
        opacity: 0,
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => {
          setVisible(false);
          onComplete?.();
        },
      });

    return () => {
      timeline.kill();
      gsap.killTweensOf([front, back, overlay]);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ background: "#F3F2EE" }}
    >
      <BackgroundPapers />
      <CuttingMat frontClipRef={frontClipRef} backClipRef={backClipRef} />
      <PercentageCounter value={progress} />
    </div>
  );
}
