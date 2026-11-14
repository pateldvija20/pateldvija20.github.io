import { useEffect, useRef, useState } from "react";

/**
 * A project's card art: its still, or, when the project has a `heroVideo`, a
 * silent loop that starts on that still.
 *
 * The still is always the loop's first frame (the clips are encoded that way),
 * so it doubles as the poster and as the image the folder sheet and the
 * card-to-page morph use. The loop only plays while it is on screen, and with
 * reduced motion it never plays: the reader gets the still.
 */
export function LoopMedia({
  still,
  video,
  className = "",
  style,
  onAspect,
}: {
  still: string;
  /** Path stem: `${video}.webm` and `${video}.mp4` are both expected. */
  video?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Height/width of the art once known, for callers that size to it. */
  onAspect?: (aspect: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [video, reduce]);

  if (!video || reduce) {
    return (
      <img
        src={still}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (img.naturalWidth) onAspect?.(img.naturalHeight / img.naturalWidth);
        }}
        className={`select-none object-cover ${className}`}
        style={style}
      />
    );
  }
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      poster={still}
      aria-hidden
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.videoWidth) onAspect?.(v.videoHeight / v.videoWidth);
      }}
      className={`select-none object-cover ${className}`}
      style={style}
    >
      <source src={`${video}.webm`} type="video/webm" />
      <source src={`${video}.mp4`} type="video/mp4" />
    </video>
  );
}
