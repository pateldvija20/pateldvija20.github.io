import * as THREE from "three";
import { anim } from "./anim";
import { theme } from "./theme";

/**
 * The spilt coffee (16 Nov). A small simulation drawn as signed-distance shapes that merge like real liquid.
 *
 * Two quads, both drawn by the same shader:
 *  - "air": a stream poured over the cup's lower lip, kept as a chain of linked particles that fall under gravity (so it
 *    arcs, thins as it stretches and breaks into beads when it gets too thin), and the pool it falls into on the tray
 *    (an irregular blob that grows with the volume that has landed, fast at first and then slowing).
 *  - "front": what runs over the tray's front lip: a few rivulets that start at different times, each a thread with a
 *    bulbous head that speeds up as it runs down the machine, then thins, lets go and leaves pendant drops that fall
 *    into a small puddle at the foot.
 * The cup holds a fixed amount of coffee; what leaves it goes into the pool, from the pool over the lip, and from there
 * to the puddle, so nothing grows without end.
 */

const NP = 48; // chain particles
const NT = 2; // rivulets
const ND = 8; // falling drops

const COMMON = /* glsl */ `
  varying vec2 vP;
  uniform float uFade;
  uniform float uDark;
  uniform vec3 uPh;
  float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }
  float capsule(vec2 p, vec2 a, vec2 b, float ra, float rb) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
    return length(pa - ba * h) - mix(ra, rb, h);
  }
  // A wobbly ellipse (an irregular puddle): the outline is pushed in and out with a few lobes.
  float blob(vec2 p, vec4 e, vec3 ph, float amp) {
    if (e.z <= 0.0) return 1e3;
    vec2 q = p - e.xy;
    float th = atan(q.y / e.w, q.x / e.z);
    float m = 1.0 + amp * (0.11 * sin(3.0 * th + ph.x) + 0.07 * sin(5.0 * th + ph.y) + 0.045 * sin(8.0 * th + ph.z));
    vec2 ab = e.zw * m;
    // A squarer-than-an-ellipse outline, so a long thin pool has a rounded end and not a point.
    vec2 u = abs(q / ab);
    float k0 = pow(pow(u.x, 2.6) + pow(u.y, 2.6), 1.0 / 2.6);
    return (k0 - 1.0) * min(ab.x, ab.y) * 0.9;
  }
`;

const VERT = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = (scene: string) => /* glsl */ `
  ${COMMON}
  ${scene}
  void main() {
    float d = field(vP);
    float fw = max(fwidth(d) * 0.8, 1e-5);
    float cov = 1.0 - smoothstep(-fw, fw, d);
    if (cov <= 0.002) discard;
    // Depth into the liquid: a thin film at the edge, deeper (darker) inside; the surface is a soft dome.
    float t = clamp(-d / 0.014, 0.0, 1.0);
    float h = sqrt(max(1.0 - (1.0 - t) * (1.0 - t), 0.0));
    vec2 g = vec2(dFdx(d), dFdy(d));
    vec2 gl = g / max(length(g), 1e-6);
    float slope = (1.0 - t) / max(h, 0.18);
    vec3 n = normalize(vec3(gl * slope, 1.0));
    vec3 L = normalize(vec3(-0.45, 0.8, 0.55));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, H), 0.0), 46.0);
    vec3 deep = mix(vec3(0.115, 0.055, 0.026), vec3(0.30, 0.15, 0.07), uDark);
    vec3 thin = mix(vec3(0.50, 0.29, 0.12), vec3(0.74, 0.46, 0.21), uDark);
    vec3 col = mix(thin, deep, pow(t, 0.65));
    col *= 0.72 + 0.5 * diff;
    col += vec3(1.0, 0.92, 0.8) * spec * 0.85;
    // A golden crema line along the very edge (it also lifts the dark coffee off the dark page).
    // A darker contact line just inside the edge, then a lighter band (the meniscus) a little further in.
    float contact = smoothstep(0.0018, 0.0042, -d) * (1.0 - smoothstep(0.0042, 0.008, -d));
    col *= 1.0 - 0.28 * contact;
    float men = smoothstep(0.007, 0.0105, -d) * (1.0 - smoothstep(0.0105, 0.016, -d));
    col += vec3(0.07, 0.045, 0.02) * men;
    float ring = 1.0 - smoothstep(0.0, 0.0034, -d);
    col = mix(col, vec3(0.86, 0.6, 0.3), ring * mix(0.5, 0.75, uDark));
    float alpha = cov * mix(0.78, 0.98, smoothstep(0.0, 0.01, -d)) * uFade;
    gl_FragColor = vec4(col, alpha);
  }
`;

const SCENE_AIR = /* glsl */ `
  uniform vec4 uSeg[${NP}];
  uniform vec4 uRad[${NP}];
  uniform vec4 uPool;
  uniform vec4 uFing[2];
  uniform float uMode;  // 0: the stream in the air (drawn over the cup's lip), 1: the pool and what has landed in it
  uniform float uAmp;
  float field(vec2 p) {
    float d = 1e3;
    for (int i = 0; i < ${NP}; i++) {
      vec4 r = uRad[i];
      if (r.x > 0.0 && (r.z > 0.5) == (uMode > 0.5)) d = smin(d, capsule(p, uSeg[i].xy, uSeg[i].zw, r.x, r.y), 0.009);
    }
    if (uMode > 0.5) {
      d = smin(d, blob(p, uPool, uPh, uAmp), 0.015);
      for (int i = 0; i < 2; i++) {
        vec4 f = uFing[i];
        if (f.z > 0.0) d = smin(d, (length((p - f.xy) / f.zw) - 1.0) * min(f.z, f.w), 0.015);
      }
    }
    return d;
  }
`;

const SCENE_FRONT = /* glsl */ `
  uniform vec4 uThr[${NT}];   // x, top y, head y, head radius
  uniform vec4 uThr2[${NT}];  // top radius, bottom radius, wiggle phase, on
  uniform vec4 uLip[${NT}];   // the bulge where it spills over the lip: x, y, rx, ry
  uniform vec4 uDrop[${ND}];  // x, y, radius, stretch
  uniform vec4 uBase;
  uniform float uAmpB;
  float field(vec2 p) {
    float d = 1e3;
    for (int i = 0; i < ${NT}; i++) {
      vec4 a = uThr[i]; vec4 b = uThr2[i];
      if (b.w > 0.5) {
        vec2 q = p;
        q.x -= a.x + 0.0032 * sin(p.y * 31.0 + b.z) * smoothstep(0.0, -0.05, p.y);
        float th = capsule(q, vec2(0.0, a.y), vec2(0.0, a.z), b.x, b.y);
        float hd = length((q - vec2(0.0, a.z + a.w * 0.15)) / vec2(a.w, a.w * 1.35)) - 1.0;
        d = smin(d, smin(th, hd * a.w, 0.012), 0.012);
      }
      vec4 l = uLip[i];
      if (l.y < -0.005 && l.z > 0.0) d = smin(d, capsule(p, vec2(l.x, 0.0), l.xy, 0.0036, 0.0026), 0.01);
      if (l.z > 0.0) d = smin(d, (length((p - l.xy) / l.zw) - 1.0) * min(l.z, l.w), 0.014);
    }
    for (int i = 0; i < ${ND}; i++) {
      vec4 s = uDrop[i];
      if (s.z > 0.0) d = smin(d, (length((p - s.xy) / vec2(s.z, s.z * s.w)) - 1.0) * s.z, 0.01);
    }
    return smin(d, blob(p, uBase, uPh * 1.7, uAmpB), 0.015);
  }
`;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const v4 = (n: number) => Array.from({ length: n }, () => new THREE.Vector4());

function material(scene: string, uniforms: Record<string, THREE.IUniform>) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    extensions: { derivatives: true } as never,
    uniforms: { uFade: { value: 1 }, uDark: { value: 0 }, uPh: { value: new THREE.Vector3() }, ...uniforms },
    vertexShader: VERT,
    fragmentShader: FRAG(scene),
  });
}

/** Where the tray's front lip is and how far the machine's front runs down (scene units, relative to the tray top). */
const GRAV = 5.5;
const KEEP = 0.14; // the share left in the cup when it lies on its side
const Q_MAX = 0.54; // pour rate at the start (the cup's volume per second)
const POUR_FROM = 0.3; // anim.tip at which the lip gets below the coffee's surface

export class Spill {
  readonly root = new THREE.Group();
  private air: THREE.Mesh;
  private front: THREE.Mesh;
  private mA: THREE.ShaderMaterial;
  private mS: THREE.ShaderMaterial;
  private stream: THREE.Mesh;
  private mB: THREE.ShaderMaterial;
  // chain
  private x = new Float32Array(NP);
  private y = new Float32Array(NP);
  private vx = new Float32Array(NP);
  private vy = new Float32Array(NP);
  private vol = new Float32Array(NP);
  private r0 = new Float32Array(NP);
  private st = new Uint8Array(NP); // 0 free, 1 flying, 2 landed
  private pin = new Float32Array(NP);
  private id = new Int32Array(NP);
  private prev = new Int32Array(NP);
  private prevId = new Int32Array(NP);
  private rr = new Float32Array(NP); // launch speed
  private nl = new Uint8Array(NP); // 1: never linked to the one before (a bead or a splash droplet)
  private lastSplash = -1;
  private edge = 0;
  private edgeB = 0;
  private sheet = new Float32Array(NT);
  private nextId = 1;
  private last = -1;
  private lastId = 0;
  private acc = 0;
  // cup and pool
  private cupV = 1;
  private pool = 0;
  private poolIn = 0;
  private hw = 0;
  private poolAge = 0;
  // rivulets
  private head = new Float32Array(NT);
  private hv = new Float32Array(NT);
  private top = new Float32Array(NT);
  private tv = new Float32Array(NT);
  private flow = new Float32Array(NT);
  private began = new Uint8Array(NT);
  private pend = new Float32Array(NT);
  private dx = new Float32Array(ND);
  private dy = new Float32Array(ND);
  private dv = new Float32Array(ND);
  private dr = new Float32Array(ND);
  private dAlive = new Uint8Array(ND);
  private base = 0;
  private baseHw = 0;
  private t = 0;
  private lipPrev = new THREE.Vector2();
  private lipVel = new THREE.Vector2();
  private hasLip = false;
  private lastTip = 0;
  private fading = false;
  private rand = rng(7);
  private ph = new THREE.Vector3();
  private floorY = -0.25;
  private rx = [0.019, 0.062];
  private delay = [0, 0.3];
  private stop = [-1, -0.05];
  private fshare = [0.62, 0.38];
  private pth = [0.07, 0.2];

  constructor() {
    const a = new THREE.PlaneGeometry(0.85, 0.62);
    a.translate(0.08, 0.23, 0);
    const b = new THREE.PlaneGeometry(0.34, 0.32);
    b.translate(0.0, -0.13, 0);
    const shared = {
      uSeg: { value: v4(NP) },
      uRad: { value: v4(NP) },
      uPool: { value: new THREE.Vector4() },
      uFing: { value: v4(2) },
      uAmp: { value: 1 },
    };
    this.mA = material(SCENE_AIR, { ...shared, uMode: { value: 1 } });
    this.mS = material(SCENE_AIR, { ...shared, uMode: { value: 0 } });
    this.mS.depthTest = false;
    this.mB = material(SCENE_FRONT, {
      uThr: { value: v4(NT) },
      uThr2: { value: v4(NT) },
      uLip: { value: v4(NT) },
      uDrop: { value: v4(ND) },
      uBase: { value: new THREE.Vector4() },
      uAmpB: { value: 1 },
    });
    this.air = new THREE.Mesh(a, this.mA);
    this.stream = new THREE.Mesh(a, this.mS);
    this.stream.position.z = 0.3;
    this.stream.userData.ink = "skip";
    this.stream.frustumCulled = false;
    this.stream.renderOrder = 4;
    this.front = new THREE.Mesh(b, this.mB);
    this.front.position.z = 0.28;
    this.air.position.z = 0.3; // in front of the tray's front face, behind the cup's own side
    this.front.position.y = -0.03; // the tray's front lip, a little below the tray top
    this.air.userData.ink = "skip";
    this.front.userData.ink = "skip";
    this.air.frustumCulled = false;
    this.front.frustumCulled = false;
    this.air.renderOrder = 3;
    this.front.renderOrder = 3;
    this.root.add(this.air, this.stream, this.front);
    this.root.visible = false;
    this.reset();
  }

  private reset() {
    this.st.fill(0);
    this.id.fill(0);
    this.nextId = 1;
    this.last = -1;
    this.acc = 0;
    this.cupV = 1;
    this.pool = 0;
    this.poolIn = 0;
    this.hw = 0;
    this.poolAge = 0;
    this.head.fill(0);
    this.hv.fill(0);
    this.top.fill(0);
    this.tv.fill(0);
    this.flow.fill(0);
    this.began.fill(0);
    this.pend.fill(0);
    this.dAlive.fill(0);
    this.base = 0;
    this.baseHw = 0;
    this.t = 0;
    this.lastSplash = -1;
    this.sheet.fill(0);
    this.nl.fill(0);
    this.hasLip = false;
    this.rand = rng(7);
    this.ph.set(this.rand() * 6.28, this.rand() * 6.28, this.rand() * 6.28);
    anim.spillOut = 0;
  }

  /** Call each frame. lipX, lipY: the cup's lower lip in the spill group's own frame (x right, y up from the tray top). */
  update(dt: number, tip: number, lipX: number, lipY: number, floorY: number) {
    dt = Math.min(dt, 1 / 24);
    this.floorY = floorY + 0.03; // in the front quad's own frame
    const spilling = tip > 0.02;
    if (!spilling) {
      if (this.root.visible) this.root.visible = false;
      this.reset();
      this.lastTip = tip;
      return;
    }
    // Un-spilling (the cup stood up again): the coffee fades away; spilling again restarts from nothing.
    if (tip < this.lastTip - 1e-4) this.fading = true;
    else if (tip > this.lastTip + 1e-4) this.fading = false;
    this.lastTip = tip;
    const fade = this.fading ? smooth(0, 0.6, tip) : 1;
    this.root.visible = fade > 0.01 && (this.t > 0 || tip > POUR_FROM);
    if (!this.fading) this.step(dt, tip, lipX, lipY);
    this.mA.uniforms.uFade.value = this.mS.uniforms.uFade.value = this.mB.uniforms.uFade.value = fade;
    this.upload();
  }

  private step(dt: number, tip: number, lipX: number, lipY: number) {
    // The lip's own velocity (the cup is swinging over): the stream is flung off with it.
    if (this.hasLip) this.lipVel.set((lipX - this.lipPrev.x) / dt, (lipY - this.lipPrev.y) / dt).clampLength(0, 1.4);
    this.lipPrev.set(lipX, lipY);
    this.hasLip = true;
    if (tip < POUR_FROM && this.cupV >= 1) return;
    this.t += dt;
    // --- the pour: a thread at first, then the flux ramps up (with two or three small glugs), then thins as the cup empties
    // and stops by about 3.5 s; what the cup cannot reach stays in it.
    const x = Math.max(0, (this.cupV - KEEP) / (1 - KEEP));
    const glug = 1 + 0.15 * Math.sin((this.t * Math.PI * 2) / 1.1 + 0.6);
    const q = x > 0 ? Q_MAX * smooth(0, 0.6, this.t) * (1 - smooth(2.7, 3.5, this.t)) * glug * Math.pow(x, 0.5) : 0;
    anim.spillOut = Math.min(1, (1 - this.cupV) / 0.78);
    this.acc += dt;
    const qn = Math.min(1.2, q / Q_MAX);
    const r0 = 0.0024 + 0.0062 * Math.sqrt(qn);
    const lv = Math.min(0.5, this.lipVel.length()) / Math.max(1e-4, this.lipVel.length());
    const vx0 = -0.2 + this.lipVel.x * lv * 0.8;
    const vy0 = Math.min(0, this.lipVel.y * lv * 0.8) - 0.02;
    const speed = Math.hypot(vx0, vy0);
    // At the tail the stream is too thin to hold together: it comes as separate beads about 4.5 widths apart.
    const beads = qn < 0.28;
    const s0 = beads ? 9 * r0 : Math.max(0.006, r0);
    const every = s0 / speed;
    let guard = 0;
    while (q > 0.012 && this.acc >= every && guard++ < 4) {
      this.acc -= every;
      const vol = q * every;
      this.cupV -= vol;
      this.spawn(lipX, lipY, vx0, vy0, vol, beads ? r0 * 1.5 : r0, speed, beads);
    }
    if (q <= 0.012) this.acc = 0;
    // --- the particles fall; one that reaches the tray joins the pool
    for (let i = 0; i < NP; i++) {
      if (!this.st[i]) continue;
      if (this.st[i] === 1) {
        this.vy[i] -= GRAV * dt;
        this.x[i] += this.vx[i] * dt;
        this.y[i] += this.vy[i] * dt;
        if (this.y[i] <= 0.005) {
          this.y[i] = 0.003;
          this.st[i] = 2;
          this.pin[i] = this.vol[i] > 0 ? 0.2 : 0.03;
          this.pool += this.vol[i];
          this.poolIn += this.vol[i];
          if (this.hw <= 0 && this.vol[i] > 0) this.hw = 0.004;
          // A small crown: two to four droplets thrown up where the stream lands.
          if (this.vol[i] > 0 && this.t - this.lastSplash > 0.16 && this.vol[i] > 0.0004) {
            this.lastSplash = this.t;
            const n = 2 + Math.floor(this.rand() * 3);
            for (let c = 0; c < n; c++) this.spawn(this.x[i], 0.006, (this.rand() - 0.5) * 0.34, 0.18 + this.rand() * 0.16, 0, 0.0019 + this.rand() * 0.0008, 0, true);
          }
        }
      } else {
        this.pin[i] -= dt;
        if (this.pin[i] <= 0) this.st[i] = 0;
      }
    }
    // --- the pool spreads: quickly at first, then slower and slower, until it has the film's thickness
    this.poolAge += this.poolIn > 0 ? dt : 0;
    // area times depth follows the volume poured, so the radius goes as its square root; it can't pass Rmax.
    const target = 0.022 + 0.125 * Math.sqrt(Math.min(1, this.poolIn / 0.78));
    const rate = 3.4 / (1 + 2.2 * this.poolAge);
    this.edge = Math.min(1, Math.max(0, (target - this.hw) / 0.03));
    if (this.hw > 0) this.hw = Math.min(target, this.hw + (target - this.hw) * Math.min(1, rate * dt) + 0.0);
    // --- over the tray's front lip: rivulets, one after another
    let totalOut = 0;
    for (let i = 0; i < NT; i++) {
      const f = 1.5 * this.fshare[i] * Math.max(0, this.pool - this.pth[i]) * Math.min(1, this.hw / 0.06);
      const fi = Math.min(f, this.pool * 0.6 / Math.max(dt, 1e-3) / NT);
      this.flow[i] = fi;
      totalOut += fi * dt;
    }
    this.pool = Math.max(0, this.pool - totalOut);
    for (let i = 0; i < NT; i++) {
      const fi = this.flow[i];
      if (fi > 0.006) this.sheet[i] += dt;
      if (fi > 0.03 || (fi > 0.006 && !this.began[i])) {
        if (!this.began[i] && this.sheet[i] > 0.5 + this.delay[i]) {
          this.began[i] = 1;
          this.head[i] = -0.004;
          this.hv[i] = 0.03;
          this.top[i] = 0;
          this.tv[i] = 0;
        }
        if (this.began[i]) {
          this.top[i] = 0;
          this.tv[i] = 0;
        }
      } else if (this.began[i] === 1) {
        // The supply has stopped: the thread lets go at the top and drains down into its head.
        this.began[i] = 2;
      }
      if (this.began[i]) {
        const vt = 0.26 + 0.55 * Math.sqrt(Math.min(1, fi / 0.25)) + (this.began[i] === 2 ? 0.1 : 0);
        this.hv[i] += (vt * (this.stop[i] < 0 ? 1 : 0.55) - this.hv[i]) * Math.min(1, 2.4 * dt);
        this.head[i] = Math.max(Math.max(this.stop[i] < 0 ? -9 : this.stop[i], this.floorY + 0.004), this.head[i] - this.hv[i] * dt);
        if (this.began[i] === 2) {
          this.tv[i] += 0.5 * dt + 0.9 * dt * dt * 40;
          this.top[i] = Math.max(this.head[i], this.top[i] - Math.min(this.tv[i], 0.9) * dt);
        }
        // The thread's coffee reaches the foot and adds to the puddle.
        if (this.head[i] <= this.floorY + 0.006 && this.stop[i] < 0) this.base += fi * dt * (this.began[i] === 1 ? 1 : 0);
        // After it lets go and the head is gone down, it leaves a pendant drop at the lip now and then.
      }
      // pendant drop growing at the lip once the thread has let go; it falls when it is heavy enough
      if (this.began[i] === 2 || (this.began[i] === 0 && this.pool > 0.02 && this.hw > 0.08 && this.poolAge > 1.2 && i < 2)) {
        const leak = 0.016 * (i === 0 ? 1 : 0.6) * Math.min(1, this.pool / 0.05);
        this.pend[i] += leak * dt;
        this.pool = Math.max(0, this.pool - leak * dt);
        if (this.pend[i] > 0.011) this.drop(i);
      }
    }
    // --- falling drops
    for (let i = 0; i < ND; i++) {
      if (!this.dAlive[i]) continue;
      this.dv[i] += GRAV * 0.8 * dt;
      this.dy[i] -= this.dv[i] * dt;
      if (this.dy[i] <= this.floorY + 0.004) {
        this.dAlive[i] = 0;
        this.base += 0.011;
      }
    }
    // --- the puddle at the foot
    // area = volume arrived / depth, but no wider than half the tray pool
    const bt = Math.min(0.07, 0.01 + 0.075 * Math.sqrt(this.base));
    this.edgeB = Math.min(1, Math.max(0, (bt - this.baseHw) / 0.03));
    this.baseHw += (bt - this.baseHw) * Math.min(1, 1.6 * dt);
  }

  private spawn(x: number, y: number, vx: number, vy: number, vol: number, r0: number, v0: number, noLink: boolean) {
    let k = -1;
    for (let i = 0; i < NP; i++) if (!this.st[i]) {
      k = i;
      break;
    }
    if (k < 0) {
      this.cupV += 0; // chain full: drop the oldest by reusing the first landed one
      for (let i = 0; i < NP; i++) if (this.st[i] === 2) { k = i; break; }
      if (k < 0) k = 0;
    }
    this.x[k] = x;
    this.y[k] = y;
    this.vx[k] = vx;
    this.vy[k] = vy;
    this.vol[k] = vol;
    this.r0[k] = r0;
    this.st[k] = 1;
    this.id[k] = this.nextId++;
    this.prev[k] = this.last;
    this.prevId[k] = this.lastId;
    if (!noLink) {
      this.last = k;
      this.lastId = this.id[k];
    }
    this.rr[k] = v0;
    this.nl[k] = noLink ? 1 : 0;
  }

  private drop(i: number) {
    for (let k = 0; k < ND; k++) {
      if (this.dAlive[k]) continue;
      this.dAlive[k] = 1;
      this.dx[k] = this.rx[i] + (this.rand() - 0.5) * 0.006;
      this.dy[k] = -0.014;
      this.dv[k] = 0.04;
      this.dr[k] = 0.0038 + 0.0105 * Math.sqrt(this.pend[i] / 0.011);
      break;
    }
    this.pend[i] = 0;
  }

  private upload() {
    const seg = this.mA.uniforms.uSeg.value as THREE.Vector4[];
    const rad = this.mA.uniforms.uRad.value as THREE.Vector4[];
    // radius from the volume: a stretched stretch of stream is thinner
    for (let i = 0; i < NP; i++) {
      if (!this.st[i]) {
        rad[i].set(0, 0, 0, 0);
        continue;
      }
      const j = this.prev[i];
      const linked = j >= 0 && !this.nl[i] && this.st[j] && this.id[j] === this.prevId[i];
      const r0 = this.r0[i];
      if (linked) {
        // Continuity: the faster it falls, the thinner it gets (width goes as the inverse square root of the speed).
        const len = Math.hypot(this.x[i] - this.x[j], this.y[i] - this.y[j]);
        const sp = Math.max(this.rr[i], Math.hypot(this.vx[i], this.vy[i]));
        const ri = r0 * Math.sqrt(this.rr[i] / sp);
        const spj = Math.max(this.rr[j], Math.hypot(this.vx[j], this.vy[j]));
        const rj = this.r0[j] * Math.sqrt(this.rr[j] / spj);
        if (len < 9 * ri + 0.03) {
          seg[i].set(this.x[i], this.y[i], this.x[j], this.y[j]);
          rad[i].set(ri, rj, this.st[i] === 2 ? 1 : 0, 0);
          continue;
        }
      }
      const rb = r0 * (this.st[i] === 2 ? 0.8 : 0.95);
      seg[i].set(this.x[i], this.y[i], this.x[i], this.y[i]);
      rad[i].set(rb, rb, this.st[i] === 2 ? 1 : 0, 0);
    }
    // pool on the tray: a blob that rests on it
    const hh = (0.012 + 0.01 * Math.sqrt(Math.min(1, this.pool + 0.02))) * (0.3 + 0.7 * smooth(0, 0.07, this.hw));
    const xL = 0.008;
    const cx = xL + this.hw;
    (this.mA.uniforms.uPool.value as THREE.Vector4).set(this.hw > 0 ? cx : 0, -0.016, this.hw, hh);
    // Where it meets the lip the edge reaches out in two unequal tongues, one above each rivulet.
    const fa = smooth(0.06, 0.12, this.hw);
    const fing = this.mA.uniforms.uFing.value as THREE.Vector4[];
    fing[0].set(this.rx[0], -0.026, fa * 0.026, fa * 0.012);
    fing[1].set(this.rx[1], -0.026, fa * 0.017, fa * 0.009);
    // Irregular edge in proportion to how fast it is still spreading.
    this.mA.uniforms.uAmp.value = 0.6 + 1.1 * this.edge;
    const thr = this.mB.uniforms.uThr.value as THREE.Vector4[];
    const thr2 = this.mB.uniforms.uThr2.value as THREE.Vector4[];
    const lip = this.mB.uniforms.uLip.value as THREE.Vector4[];
    for (let i = 0; i < NT; i++) {
      const fi = this.flow[i];
      const on = this.began[i] ? 1 : 0;
      const rr = 0.003 + 0.0065 * Math.sqrt(Math.min(1, fi / 0.3));
      const thin = this.began[i] === 2 ? Math.max(0.0015, rr * 0.5) : rr;
      thr[i].set(this.rx[i], this.top[i], this.head[i], rr * 1.7 + 0.0032);
      thr2[i].set(this.began[i] === 2 ? 0.0015 : thin * 0.8, thin * 1.3, i * 2.1 + this.ph.x, on);
      const lipOn = fi > 0.01 ? 1 : 0;
      // At first it goes over the lip as a sheet (wide), then it draws in to the rivulet's width.
      const sh = smooth(0.0, 0.5 + this.delay[i], this.sheet[i]);
      lip[i].set(this.rx[i], -0.002, lipOn * ((1 - sh) * 0.04 + sh * (rr * 1.7 + 0.006)), lipOn * (0.005 + (1 - sh) * 0.004 + rr * 0.5));
      const p = this.pend[i];
      if (p > 0.0005 && fi <= 0.01) lip[i].set(this.rx[i], -0.012 - p * 0.4, 0.004 + 0.0095 * Math.sqrt(p / 0.011), (0.004 + 0.0095 * Math.sqrt(p / 0.011)) * 1.15);
    }
    const dr = this.mB.uniforms.uDrop.value as THREE.Vector4[];
    for (let k = 0; k < ND; k++) {
      if (this.dAlive[k]) dr[k].set(this.dx[k], this.dy[k], this.dr[k], 1 + Math.min(1.2, this.dv[k] * 1.0));
      else dr[k].set(0, 0, 0, 1);
    }
    this.mB.uniforms.uAmpB.value = 0.8 + 1.2 * this.edgeB;
    const bh = 0.004 + 0.007 * Math.sqrt(Math.min(1, this.base * 3));
    (this.mB.uniforms.uBase.value as THREE.Vector4).set(0.03, this.floorY + bh * 0.5, this.baseHw, bh);
    const dark = theme.mode === "dark" ? 1 : 0;
    this.mA.uniforms.uDark.value = this.mS.uniforms.uDark.value = this.mB.uniforms.uDark.value = dark;
    (this.mA.uniforms.uPh.value as THREE.Vector3).copy(this.ph);
    (this.mS.uniforms.uPh.value as THREE.Vector3).copy(this.ph);
    (this.mB.uniforms.uPh.value as THREE.Vector3).copy(this.ph);
    void smooth;
  }

  dispose() {
    this.air.geometry.dispose();
    this.front.geometry.dispose();
    this.mA.dispose();
    this.mS.dispose();
    this.mB.dispose();
  }
}
