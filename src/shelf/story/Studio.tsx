import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/**
 * Studio light for the 3D objects: a soft studio environment for reflections
 * on the satin and cloth, a soft key from the upper left that casts the
 * shadows, a close softbox for gentle gradients on flat covers, a rim from
 * behind so edges separate from the page, and a low fill. Shared by the
 * scene and the object lab, so an object looks the same in both.
 */
export default function Studio({ shadows = true }: { shadows?: boolean }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return (
    <>
      <hemisphereLight args={["#FFFFFF", "#E8E4DC", 0.4]} />
      <directionalLight
        position={[-3, 5, 7]}
        intensity={1.4}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        shadow-radius={8}
        shadow-blurSamples={16}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-3}
      />
      <pointLight position={[-1.6, 2.6, 3.2]} intensity={8} distance={0} decay={2} color="#FFF8EE" />
      <directionalLight position={[4, 3, -5]} intensity={1.6} color="#FFF6EA" />
      <directionalLight position={[-5, 4, -4]} intensity={0.8} color="#EAF0FF" />
      <directionalLight position={[5, 1.5, 6]} intensity={0.35} color="#EAF0FF" />
    </>
  );
}
