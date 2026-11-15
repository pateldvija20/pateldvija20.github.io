import { Component, Suspense, useMemo, useSyncExternalStore, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { Inked } from "./InkPass";
import type { BookSkin, ObjectMeta, ObjectProps } from "./objects/types";

/**
 * The shelf's objects, each its own file in ./objects (the contract is in
 * objects/types.ts), loaded for the scene one module at a time, so a file
 * that's missing, half-written or broken only ever costs its own object:
 * until it loads, or if it fails (to import, to render, or in its frame
 * loop), a plain box of the right size stands in, drawn by the ink pass.
 */

export const OBJECT_NAMES = ["plant", "hanger", "machine", "cup", "work", "about", "playground"] as const;
export type ObjectName = (typeof OBJECT_NAMES)[number];

/** A point in an object's own space, as the object files give them: [x, y, z] or { x, y, z }. */
export type Point = readonly [number, number, number] | { x: number; y: number; z: number };

export type ObjectModule = {
  default: ComponentType<ObjectProps>;
  meta: ObjectMeta;
  /** Books: the look the book rig (ToyBook) wears. */
  skin?: () => BookSkin;
  /** The machine: where the cup stands (its foot), and the hot-water outlet (the contact links hang from it). */
  CUP_SPOT?: Point;
  OUTLET?: Point;
  /** The hanging plant: the point that hangs at the screen's top edge (else its top is used). */
  PIN?: Point;
};

export const toVec = (p: Point): [number, number, number] => (Array.isArray(p) ? [p[0], p[1], p[2]] : [(p as { x: number }).x, (p as { y: number }).y, (p as { z: number }).z]);

/** Sizes to stand in with while a file is missing (scene units, from layout.ts and the brief). */
export const STAND_IN: Record<ObjectName, { width: number; height: number; depth: number }> = {
  plant: { width: 0.56, height: 1.27, depth: 0.5 },
  hanger: { width: 0.5, height: 0.5, depth: 0.3 },
  machine: { width: 1.24, height: 1.23, depth: 0.9 },
  cup: { width: 0.24, height: 0.42, depth: 0.24 },
  work: { width: 0.92, height: 1.14, depth: 0.19 },
  about: { width: 0.6, height: 0.95, depth: 0.165 },
  playground: { width: 1.5, height: 1.34, depth: 0.2 },
};

const files = import.meta.glob<ObjectModule>("./objects/*.tsx");

type Entry = { status: "missing" | "loading" | "ready" | "broken"; mod?: ObjectModule; done: Promise<void> };
const entries = new Map<ObjectName, Entry>();
const listeners = new Set<() => void>();
let version = 0;
const changed = () => {
  version++;
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
const getVersion = () => version;

function entry(name: ObjectName): Entry {
  const known = entries.get(name);
  if (known) return known;
  const load = files[`./objects/${name}.tsx`];
  if (!load) {
    const e: Entry = { status: "missing", done: Promise.resolve() };
    entries.set(name, e);
    return e;
  }
  const e: Entry = { status: "loading", done: Promise.resolve() };
  e.done = load()
    .then((m) => {
      const ok = m && (typeof m.default === "function" || (typeof m.default === "object" && m.default !== null)) && m.meta;
      if (!ok) throw new Error(`objects/${name}.tsx must export meta and a default component`);
      e.mod = m;
      e.status = "ready";
    })
    .catch((err: unknown) => {
      e.status = "broken";
      console.warn(`[shelf] objects/${name}.tsx didn't load; a stand-in takes its place.`, err);
    })
    .finally(changed);
  entries.set(name, e);
  return e;
}

/** Starts every object loading; resolves once each has loaded or failed (never rejects). */
export function preloadObjects(): Promise<void> {
  return Promise.all(OBJECT_NAMES.map((n) => entry(n).done)).then(() => undefined);
}

/** An object's module once it has loaded (null while it loads, or if it's missing or broken). Re-renders when that changes. */
export function useObjectModule(name: ObjectName): ObjectModule | null {
  useSyncExternalStore(subscribe, getVersion);
  const e = entry(name);
  return e.status === "ready" ? (e.mod ?? null) : null;
}

/** An object's size: its own meta once loaded, else the stand-in's. */
export function sizeOf(name: ObjectName, mod: ObjectModule | null = entry(name).mod ?? null) {
  const m = mod?.meta;
  return m && m.height > 0 ? { width: m.width, height: m.height, depth: m.depth } : STAND_IN[name];
}

/** A box the object's size, foot at the origin, drawn by the ink pass. */
export function Placeholder({ name }: { name: ObjectName }) {
  const s = sizeOf(name);
  return (
    <Inked>
      <mesh position-y={s.height / 2}>
        <boxGeometry args={[s.width, s.height, s.depth]} />
      </mesh>
    </Inked>
  );
}

type BoundaryProps = { name: string; fallback: ReactNode; resetKey: unknown; children: ReactNode };
class ObjectBoundary extends Component<BoundaryProps, { failed: boolean; key: unknown }> {
  state = { failed: false, key: this.props.resetKey };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  static getDerivedStateFromProps(props: BoundaryProps, state: { failed: boolean; key: unknown }) {
    // A new version of the file (hot reload) gets another go.
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.warn(`[shelf] objects/${this.props.name}.tsx failed to draw; a stand-in takes its place.`, error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * One object from ./objects, in its own space (foot at the origin, front
 * to +Z). `standIn` replaces the box while it's missing, loading or broken.
 */
export function SceneObject({ name, drawn, standIn }: { name: ObjectName; drawn?: boolean; standIn?: ReactNode }) {
  const mod = useObjectModule(name);
  const fallback = standIn ?? <Placeholder name={name} />;
  if (!mod) return <>{fallback}</>;
  const Obj = mod.default;
  return (
    <ObjectBoundary name={name} fallback={fallback} resetKey={mod}>
      <Suspense fallback={fallback}>
        <Obj drawn={drawn} />
      </Suspense>
    </ObjectBoundary>
  );
}

/* ---------- Frame-loop guard ---------- */

type FrameRef = { current: (...args: unknown[]) => void };
type Internal = { subscribe: (ref: FrameRef, priority: number, store: unknown) => () => void; __guarded?: boolean };

/**
 * Error boundaries can't see errors thrown inside useFrame, and one of those
 * stops every later callback that frame, the ink pass's drawing included: a
 * half-built object's bad frame callback would blank the whole scene. This
 * wraps every frame callback so one that throws is reported once and
 * switched off, and everything else carries on. Mount it first in the Canvas.
 */
export function FrameGuard() {
  const internal = useThree((s) => s.internal) as unknown as Internal;
  useMemo(() => {
    if (internal.__guarded) return;
    internal.__guarded = true;
    const subscribe = internal.subscribe;
    internal.subscribe = (ref, priority, store) => {
      let dead = false;
      const safe: FrameRef = {
        current: (...args) => {
          if (dead) return;
          try {
            ref.current(...args);
          } catch (err) {
            dead = true;
            console.warn("[shelf] a frame callback threw and was switched off (probably a half-built object):", err);
          }
        },
      };
      return subscribe(safe, priority, store);
    };
  }, [internal]);
  return null;
}
