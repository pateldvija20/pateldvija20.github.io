import { useEffect, useState } from "react";

/** Touch devices have no real hover — pieces that open on hover fall back to
 *  tap-to-toggle there instead. */
export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(typeof window !== "undefined" && "ontouchstart" in window);
  }, []);
  return isTouch;
}
