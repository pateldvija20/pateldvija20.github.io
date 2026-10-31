/**
 * Music and birds under the opening shot.
 *
 * Plays `/assets/room/loader/ambience.mp3` when it exists (the Higgsfield
 * take's soundtrack, or a licensed track). Until that file is added, or if it
 * fails to load, it falls back to a small synthesised stand-in: soft
 * music-box notes on a pentatonic scale over a faint breeze, with the odd
 * bird. Either way it fades in, never starts at full volume, and only
 * starts from a real user gesture, because browsers block audio before one.
 * A wheel scroll is not a gesture; a click, a tap or a key is.
 */

const SRC = "/assets/room/loader/ambience.mp3";
const VOLUME = 0.55;
const FADE_IN = 2.4; // seconds

export type Ambience = {
  /** Resolves true once sound is actually playing. */
  start: () => Promise<boolean>;
  setMuted: (muted: boolean) => void;
  dispose: () => void;
};

export function createAmbience(): Ambience {
  let fileOk: boolean | null = null;
  const el = new Audio();
  el.loop = true;
  el.preload = "auto";
  el.volume = 0;
  el.addEventListener("canplaythrough", () => (fileOk = true), { once: true });
  el.addEventListener("error", () => (fileOk = false), { once: true });
  el.src = SRC;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let chirpTimer = 0;
  let melodyTimer = 0;
  let fadeTimer = 0;
  let playing = false;
  let muted = false;

  const fadeFile = () => {
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / (FADE_IN * 1000));
      el.volume = muted ? 0 : VOLUME * k;
      if (k < 1) fadeTimer = requestAnimationFrame(step);
    };
    step();
  };

  const startSynth = async () => {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    await ctx.resume();
    if (ctx.state !== "running") return false;

    master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(muted ? 0 : VOLUME * 0.6, ctx.currentTime + FADE_IN);
    master.connect(ctx.destination);

    // Breeze: brown noise, low-passed hard and swelling slowly.
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
      }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 340;
    const swell = ctx.createGain();
    swell.gain.value = 0.18;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const depth = ctx.createGain();
    depth.gain.value = 0.12;
    lfo.connect(depth).connect(swell.gain);
    noise.connect(lp).connect(swell).connect(master);
    noise.start();
    lfo.start();

    // Music box: C major pentatonic, one note at a time with the odd pair,
    // each a triangle with a long soft tail.
    const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];
    let step = 2;
    const note = (f: number, at: number, level: number) => {
      if (!ctx || !master) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(level, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 1.8);
      o.connect(g).connect(master);
      o.start(at);
      o.stop(at + 1.9);
    };
    const melody = () => {
      if (!ctx) return;
      // A small random walk keeps it tuneful rather than scattered.
      step = Math.max(0, Math.min(SCALE.length - 1, step + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
      const at = ctx.currentTime + 0.02;
      note(SCALE[step], at, 0.09);
      if (Math.random() < 0.25) note(SCALE[Math.max(0, step - 2)] / 2, at, 0.05);
      melodyTimer = window.setTimeout(melody, [520, 520, 780, 1040][Math.floor(Math.random() * 4)]);
    };
    melodyTimer = window.setTimeout(melody, 600);

    const chirp = () => {
      if (!ctx || !master) return;
      const t = ctx.currentTime;
      const notes = 1 + Math.floor(Math.random() * 3);
      for (let n = 0; n < notes; n++) {
        const at = t + n * 0.16;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const f = 1900 + Math.random() * 900;
        o.type = "sine";
        o.frequency.setValueAtTime(f, at);
        o.frequency.exponentialRampToValueAtTime(f * 0.62, at + 0.12);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.03, at + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
        o.connect(g).connect(master);
        o.start(at);
        o.stop(at + 0.16);
      }
      chirpTimer = window.setTimeout(chirp, 4000 + Math.random() * 7000);
    };
    chirpTimer = window.setTimeout(chirp, 1800);
    return true;
  };

  return {
    async start() {
      if (playing) return true;
      if (fileOk !== false) {
        try {
          await el.play();
          playing = true;
          fadeFile();
          return true;
        } catch {
          // Not loaded or not decodable: fall through to the synth.
        }
      }
      playing = await startSynth().catch(() => false);
      return playing;
    },
    setMuted(m) {
      muted = m;
      if (!ctx) el.volume = m ? 0 : VOLUME;
      if (ctx && master) master.gain.setTargetAtTime(m ? 0 : VOLUME * 0.6, ctx.currentTime, 0.3);
    },
    dispose() {
      cancelAnimationFrame(fadeTimer);
      clearTimeout(chirpTimer);
      clearTimeout(melodyTimer);
      el.pause();
      el.removeAttribute("src");
      ctx?.close();
    },
  };
}
