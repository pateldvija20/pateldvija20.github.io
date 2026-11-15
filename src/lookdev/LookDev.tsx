import { useState, type CSSProperties } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Books, Cup } from "../shelf/story/Bright";
import { FlatBooks, FlatCup } from "./FlatBooks";
import FlatDecor from "../shelf/story/FlatDecor";
import InkDecor from "./InkDecor";
import InkPass from "../shelf/story/InkPass";
import { CUP, MACHINE_X, PLANT_X, POSES, SHELF, homePoses, type Frame, type Look } from "../shelf/story/layout";
import Rig from "../shelf/story/Rig";

/**
 * /?lookdev — compares looks for the storyboard's art
 * (docs/storyboard-plan.md, "The look comparison"). Not part of the site.
 *
 *   ?lookdev=flat|ink|allflat   A, B or C
 *   &frame=intro|home           storyboard frame 3 or 4
 *   &drawn=1                    frame 2: the books and cup still drawings
 */

const LOOKS: Look[] = ["flat", "ink", "allflat"];

function readParams() {
  const q = new URLSearchParams(window.location.search);
  const l = q.get("lookdev") as Look;
  const look: Look = LOOKS.includes(l) ? l : "flat";
  const frame: Frame = q.get("frame") === "intro" ? "intro" : "home";
  return { look, frame, drawn: q.get("drawn") === "1" };
}

/** Soft shadows from the bright 3D objects onto the wall behind (the shelf top is edge-on now). */
function WallShadows() {
  return (
    <mesh position={[0, 2, -SHELF.depth / 2 - 0.05]} receiveShadow userData={{ ink: "skip" }}>
      <planeGeometry args={[SHELF.width, 4]} />
      <shadowMaterial opacity={0.1} />
    </mesh>
  );
}

const pill = (on: boolean): CSSProperties => ({
  font: '500 13px/1 "DM Sans", system-ui, sans-serif',
  padding: "8px 12px",
  borderRadius: 999,
  border: "1px solid #1E1E1E",
  background: on ? "#1E1E1E" : "#FFFFFF",
  color: on ? "#FFFFFF" : "#1E1E1E",
  cursor: "pointer",
});

export default function LookDev() {
  const [p, setP] = useState(readParams);
  const set = (next: Partial<typeof p>) => {
    const v = { ...p, ...next };
    setP(v);
    const q = new URLSearchParams({ lookdev: v.look, frame: v.frame });
    if (v.drawn) q.set("drawn", "1");
    history.replaceState(null, "", `/?${q}`);
  };
  const allFlat = p.look === "allflat";
  // The 3D books' outlines in frame 2 come from the ink pass; look B needs it throughout.
  const needsInk = p.look === "ink" || (p.drawn && !allFlat);
  const cup = (
    <group position={[CUP.x, CUP.y, CUP.z]}>{allFlat ? <FlatCup drawn={p.drawn} /> : <Cup drawn={p.drawn} />}</group>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "#FFFFFF" }}>
      <Canvas
        dpr={[1, 2]}
        shadows={{ type: THREE.PCFShadowMap }}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        onCreated={(state) => {
          state.gl.setClearColor("#FFFFFF", 1);
          if (import.meta.env.DEV) (window as unknown as { __look: unknown }).__look = state;
        }}
      >
        <Rig />
        <FrameCounter />
        <hemisphereLight args={["#FFFFFF", "#E9E4DA", 1.5]} />
        <directionalLight
          position={[-3, 5, 8]}
          intensity={2.0}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-radius={6}
          shadow-camera-left={-4}
          shadow-camera-right={4}
          shadow-camera-top={4}
          shadow-camera-bottom={-3}
        />
        {p.look === "ink" ? <InkDecor frame={p.frame} cup={cup} /> : <FlatDecor plantX={PLANT_X[p.frame]} machineX={MACHINE_X[p.frame]} cup={cup} />}
        {allFlat ? <FlatBooks frame={p.frame} drawn={p.drawn} /> : <Books poses={p.frame === "home" ? homePoses() : POSES.intro} drawn={p.drawn} />}
        {!allFlat && !p.drawn && <WallShadows />}
        {needsInk && <InkPass />}
      </Canvas>

      <div style={{ position: "fixed", top: 16, left: 16, display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "calc(100vw - 32px)" }}>
        <button style={pill(p.look === "flat")} onClick={() => set({ look: "flat" })}>A · Flat decor, 3D books</button>
        <button style={pill(p.look === "ink")} onClick={() => set({ look: "ink" })}>B · Ink decor, 3D books</button>
        <button style={pill(allFlat)} onClick={() => set({ look: "allflat" })}>C · All flat</button>
        <span style={{ width: 12 }} />
        <button style={pill(p.drawn)} onClick={() => set({ frame: "intro", drawn: true })}>Frame 2 · all drawn</button>
        <button style={pill(p.frame === "intro" && !p.drawn)} onClick={() => set({ frame: "intro", drawn: false })}>Frame 3 · spines</button>
        <button style={pill(p.frame === "home" && !p.drawn)} onClick={() => set({ frame: "home", drawn: false })}>Frame 4 · home</button>
      </div>
    </div>
  );
}

/** For the screenshot script: how many frames have rendered. */
function FrameCounter() {
  useFrame(() => {
    const w = window as unknown as { __lookFrames?: number };
    w.__lookFrames = (w.__lookFrames ?? 0) + 1;
  });
  return null;
}
