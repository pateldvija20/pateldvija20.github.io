import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { defaultReflection, mat } from "./materials";
import { brushedTurned, spunMetal } from "./surfaces";

/**
 * A real 3D model (.glb) for one shelf object, with the code-built version
 * as its stand-in (REVIEW.md, "Object detail").
 *
 * - Models are built in Blender (docs/bookshelf-portfolio/blender/) and
 *   Draco-compressed; three.js's own decoder is served from public/draco/.
 * - While a model loads, or if it's missing or fails, the code-built object
 *   shows instead, so the shelf is never empty.
 * - `height` scales the model so its tallest point matches the shelf layout,
 *   and its base sits on the shelf (y = 0), centred on x and z.
 * - `palette` swaps each named Blender material for the site's own matching
 *   material, so models get the same colours, shading and rim glow as the
 *   code-built objects.
 * - `tint` only recolours a named material and keeps its own surface maps
 *   (bumps, roughness), for downloaded models whose detail lives in textures.
 */

/** `glass: true` makes it real see-through glass (light passes through and bends), not a faded colour. */
export type Swatch = { color: string; roughness?: number; metalness?: number; opacity?: number; glass?: boolean };

const glassCache = new Map<string, THREE.MeshPhysicalMaterial>();
function realGlass(color: string, roughness = 0.03) {
  const key = `${color}-${roughness}`;
  let m = glassCache.get(key);
  if (!m) {
    // A faint grey-green tint that builds up where the glass is thickest, so rims
    // and handles show as outlines even against the pure white wall.
    m = new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness: 0,
      transmission: 1,
      thickness: 0.05,
      ior: 1.5,
      envMapIntensity: 2.2,
      attenuationColor: new THREE.Color("#9FB0AE"),
      attenuationDistance: 0.04,
      specularIntensity: 1,
    });
    glassCache.set(key, m);
  }
  return m;
}
type Props = {
  src: string;
  height: number;
  fallback: ReactNode;
  palette?: Record<string, Swatch>;
  tint?: Record<string, string>;
  /** Reflection strength per material name: polished steel needs far more than matte. */
  shine?: Record<string, number>;
  rotationY?: number;
};

const draco = new DRACOLoader().setDecoderPath("/draco/");

/**
 * Full-detail models are big (about 2 MB each), so they start downloading only
 * after the shelf has appeared, keeping the first screen under 3 seconds. The
 * code-built object stands in until then.
 */
const DEFER_MS = 1500;

export default function Model({ src, height, fallback, palette, tint, shine, rotationY = 0 }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), DEFER_MS);
    return () => window.clearTimeout(t);
  }, []);
  if (!ready) return <>{fallback}</>;
  return (
    <ModelBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Loaded src={src} height={height} palette={palette} tint={tint} shine={shine} rotationY={rotationY} />
      </Suspense>
    </ModelBoundary>
  );
}

function Loaded({ src, height, palette, tint, shine, rotationY }: Omit<Props, "fallback"> & { rotationY: number }) {
  const gltf = useLoader(GLTFLoader, src, (loader) => {
    (loader as GLTFLoader).setDRACOLoader(draco);
  });
  const object = useMemo(() => {
    const root = gltf.scene.clone(true);
    root.rotation.y = rotationY;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Downloaded models keep their own materials; give their metal the same
      // stronger reflection as the code-built objects (materials.ts).
      const own = mesh.material as THREE.MeshStandardMaterial;
      if (own.isMeshStandardMaterial) own.envMapIntensity = defaultReflection(own);
      // Button faces (named *_cap, in brushed steel) get a spun-metal finish. They
      // come from Blender without UVs, so lay a flat one across the face.
      if (own.isMeshStandardMaterial && own.name === "steel_brushed" && /_cap$/.test(mesh.name)) {
        const g = mesh.geometry;
        // Always re-project: a flat map across the face, centred, for the rings.
        {
          g.computeBoundingBox();
          const b = g.boundingBox!;
          const p = g.attributes.position;
          const uv = new Float32Array(p.count * 2);
          for (let i = 0; i < p.count; i++) {
            uv[i * 2] = (p.getX(i) - b.min.x) / (b.max.x - b.min.x || 1);
            uv[i * 2 + 1] = (p.getZ(i) - b.min.z) / (b.max.z - b.min.z || 1);
          }
          g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
        }
        const m = own.clone();
        m.normalMap = spunMetal();
        m.normalScale.set(0.45, 0.45);
        m.roughness = 0.3;
        mesh.material = m;
      }
      // Steel parts get the brushed-metal streaks, where the mesh has UVs to carry them.
      if (own.isMeshStandardMaterial && own.name.startsWith("steel") && mesh.geometry.attributes.uv && !own.normalMap) {
        // Turned, so the machine's front panel brushes left to right as on the real one.
        own.normalMap = brushedTurned();
        // Barely there: the steel is mirror-polished, brushing only just shows.
        own.normalScale.set(0.07, 0.07);
      }
      const name = (mesh.material as THREE.Material).name;
      if (tint?.[name] && own.isMeshStandardMaterial) {
        // Tint what the mesh wears now, so earlier finishes (spun button faces) stay.
        mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone();
        (mesh.material as THREE.MeshStandardMaterial).color.set(tint[name]);
      }
      const swatch = palette?.[name];
      if (swatch?.glass) {
        mesh.material = realGlass(swatch.color, swatch.roughness);
      } else if (swatch) {
        mesh.material = mat(swatch.color, {
          roughness: swatch.roughness,
          metalness: swatch.metalness,
          transparent: swatch.opacity !== undefined && swatch.opacity < 1,
          opacity: swatch.opacity,
        });
      }
      const final = mesh.material as THREE.MeshStandardMaterial;
      if (shine?.[name] !== undefined && final.isMeshStandardMaterial) final.envMapIntensity = shine[name];
    });
    root.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
    root.scale.multiplyScalar(size.y > 0 ? height / size.y : 1);
    root.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(root);
    const centre = fitted.getCenter(new THREE.Vector3());
    root.position.x -= centre.x;
    root.position.z -= centre.z;
    root.position.y -= fitted.min.y;
    return root;
  }, [gltf, height, palette, tint, shine, rotationY]);
  return <primitive object={object} />;
}

/** If a model fails to load, keep showing the code-built object. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
