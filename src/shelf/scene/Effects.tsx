import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

/**
 * Ambient occlusion (Dvija, 11 Nov: lighting first). AO is the soft
 * darkening where surfaces meet or nearly touch: under a pot, between two
 * books, where a book stands on the shelf. Real rooms are full of it, and it
 * is a big part of why the style reference (refs/59) looks rendered.
 *
 * GTAO ("ground-truth" AO) works on the finished frame, from its depth and
 * normals, so it costs the same however many objects there are. It runs at
 * up to 1.5x pixel density to stay smooth on large screens.
 */
export default function Effects() {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(gl, target);
    c.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, 1, 1);
    ao.output = GTAOPass.OUTPUT.Default;
    ao.blendIntensity = 0.9;
    // Radius in scene units (1 unit is about 20 cm), so AO reaches about 6 cm.
    ao.updateGtaoMaterial({ radius: 0.3, distanceExponent: 1.4, thickness: 1, scale: 1.1, samples: 16 });
    ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
    c.addPass(ao);
    c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(Math.min(gl.getPixelRatio(), 1.5));
    composer.setSize(size.width, size.height);
  }, [composer, gl, size]);

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __composer: unknown }).__composer = composer;
    return () => composer.dispose();
  }, [composer]);

  // A positive priority hands rendering over from react-three-fiber to the composer.
  useFrame(() => composer.render(), 1);
  return null;
}
