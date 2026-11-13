import { lazy, Suspense, useEffect } from "react";
import { applyLegacyRedirect, routePath, useRoute } from "./routes";
import Credits from "./Credits";
import LeafShadow from "./LeafShadow";
import "./shelf.css";

/** The 3D scene is its own chunk, so the loading line paints before three.js arrives. */
const ShelfScene = lazy(() => import("./ShelfScene"));
/** The 2D shelf, at /?style=2d while it replaces the 3D one (Dvija, 6 Nov). */
const FlatShelf = lazy(() => import("./flat/FlatShelf"));
const FLAT_TEST = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("style") === "2d";

/**
 * Shown on the wall while the scene loads.
 * TODO(Dvija): the real line is Dvija's to write (spec §11). This is a stand-in.
 */
const LOADING_LINE = "Loading the shelf";

applyLegacyRedirect();

export default function ShelfApp() {
  const route = useRoute();

  useEffect(() => {
    document.documentElement.dataset.route = routePath(route);
  }, [route]);

  return (
    <main className="shelf-root">
      <Suspense fallback={<p className="shelf-loading">{LOADING_LINE}</p>}>
        {FLAT_TEST ? <FlatShelf /> : <ShelfScene route={route} />}
      </Suspense>
      <LeafShadow />
      <Credits />
    </main>
  );
}
