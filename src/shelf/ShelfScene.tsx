import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import type { Route } from "./routes";
import { WALL } from "./palette";
import CameraRig from "./scene/CameraRig";
import Effects from "./scene/Effects";
import Lighting from "./scene/Lighting";
import ShelfObjects from "./scene/ShelfObjects";
import { Wall } from "./scene/Room";
import BookCabinet from "./scene/BookCabinet";

/** The bookshelf scene: wall, window light, shelf and the 15 objects. */
export default function ShelfScene({ route }: { route: Route }) {
  return (
    <Canvas
      className="shelf-canvas"
      dpr={[1, 2]}
      shadows={{ type: THREE.PCFShadowMap }}
      camera={{ fov: 30, position: [0, 1.2, 9], near: 0.1, far: 100 }}
      // No tone mapping: colours land exactly as picked, and the white wall stays
      // pure white (any tone curve would grey it). Lights are set to suit.
      gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
      onCreated={(state) => {
        // Dev only: lets the browser console inspect the scene while tuning.
        if (import.meta.env.DEV) (window as unknown as { __shelf: unknown }).__shelf = state;
      }}
      data-route={route.kind}
    >
      <color attach="background" args={[WALL]} />
      <CameraRig />
      <Lighting />
      <Wall />
      {/* The yellow cabinet the books stand on (replaced the steel shelf, 12 Nov). */}
      <BookCabinet />
      <ShelfObjects />
      <Effects />
    </Canvas>
  );
}
