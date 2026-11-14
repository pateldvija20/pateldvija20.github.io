import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/**
 * An <img> that fades in once its file has loaded (`.media-fade` in
 * index.css). An image already in the cache can finish before React attaches
 * `onLoad`, so the mount also checks `complete`.
 */
export function FadeImg({ className, onLoad, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true);
  }, []);
  return (
    <img
      ref={ref}
      {...rest}
      data-loaded={loaded ? "" : undefined}
      onLoad={(e) => {
        setLoaded(true);
        onLoad?.(e);
      }}
      className={`media-fade ${className ?? ""}`}
    />
  );
}
