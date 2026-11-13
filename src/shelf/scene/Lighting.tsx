import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { framing } from "./framing";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Window light from the upper left (spec §4).
 *
 * - The key is one spotlight from the window. It draws every object's soft
 *   shadow on the shelf and the wall. One shadow map keeps phones fast.
 *   The window patch and leaf shadow are painted on the wall (wallLight.ts).
 *   Shadows are kept at half strength: in a soft-lit room they never go dark,
 *   and the frosted glass shelf throws a pale shadow, not a solid one.
 * - A soft sky/ground fill keeps the shadows from going grey-black.
 * - A small studio environment gives metal and glass something to reflect,
 *   which is what makes steel read as steel in a clean product render.
 */
export default function Lighting() {
  const { gl, scene } = useThree();
  const spot = useRef<THREE.SpotLight>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    // Low for matte surfaces. Metal and glass turn their own reflections up
    // (envMapIntensity in materials.ts), so steel still reads bright.
    scene.environmentIntensity = 0.3;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  // The window light travels with the view, so its angle (and every shadow's
  // direction) stays the same along the shelf. In the coffee corner, where the
  // camera has stepped back, it moves up and back to cover the taller view.
  useFrame(() => {
    const s = spot.current;
    if (!s) return;
    const t = framing.t;
    const x = framing.x;
    const lerp = THREE.MathUtils.lerp;
    s.position.set(x + lerp(-1.35, -6, t), lerp(7.5, 15, t), lerp(9, 17, t));
    s.target.position.set(x + lerp(6.05, 1, t), lerp(-0.4, -1.5, t), 0);
    s.target.updateMatrixWorld();
    s.angle = lerp(0.72, 0.62, t);
    s.shadow.camera.far = lerp(30, 50, t);
    s.shadow.camera.updateProjectionMatrix();
  });

  return (
    <>
      <hemisphereLight args={["#F7F6F2", "#DCDAD3", 0.3]} />
      {/* A soft fill from the right, so the side away from the window never goes flat. */}
      <directionalLight position={[6, 3, 6]} intensity={0.15} color="#F4F6FA" />
      <spotLight
        ref={spot}
        position={[-5, 7.5, 9]}
        angle={0.72}
        penumbra={0.6}
        decay={0}
        // Tuned with no tone mapping (11 Nov): the lit front of an object
        // lands close to its picked colour instead of washing out.
        intensity={1.15}
        color="#FFFDF8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-intensity={0.5}
        shadow-camera-near={4}
        shadow-camera-far={30}
      />
    </>
  );
}
