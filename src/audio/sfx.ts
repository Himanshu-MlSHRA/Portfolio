/*
 * Every sound on the site is synthesised here with the Web Audio API — there
 * are no audio files. An effect is a handful of filtered noise bursts (paper,
 * air, rollers) plus the odd sine for body (thuds, clunks), scheduled on the
 * audio clock so it lands exactly on the animation that triggers it.
 */

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function noiseBuffer(ctx: BaseAudioContext, seconds: number, brown: boolean) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    } else {
      data[i] = w;
    }
  }
  return buf;
}

/**
 * What paper is made of, acoustically: not a hiss but thousands of tiny snaps
 * as individual creases give way. Each snap is a click of noise that dies in
 * a millisecond or two; most are faint, a few are sharp.
 */
function crinkleBuffer(ctx: BaseAudioContext, seconds: number) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  const perSample = 260 / ctx.sampleRate; // snaps per second
  let env = 0;
  let decay = 0.99;
  for (let i = 0; i < data.length; i++) {
    if (Math.random() < perSample) {
      env = Math.max(env, Math.random() ** 3);
      decay = Math.exp(-1 / (ctx.sampleRate * rand(0.0004, 0.0028)));
    }
    data[i] = (Math.random() * 2 - 1) * (env + 0.015);
    env *= decay;
  }
  return buf;
}

/** [fraction of the duration, level] — joined by straight lines, from silence. */
type Env = [number, number][];

interface NoiseOpts {
  t: number;
  dur: number;
  env: Env;
  type?: BiquadFilterType;
  freq: number;
  /** sweep the filter to this frequency over the duration */
  freqTo?: number;
  q?: number;
  pan?: number;
  brown?: boolean;
  /** use the crackly paper noise instead of smooth hiss */
  crisp?: boolean;
  /** < 1 plays the noise slowed down, which makes it coarse and crunchy */
  rate?: number;
  to?: AudioNode;
}

interface ToneOpts {
  t: number;
  dur: number;
  from: number;
  to?: number;
  gain: number;
  type?: OscillatorType;
  attack?: number;
  dest?: AudioNode;
}

export function createKit(ctx: BaseAudioContext, out: AudioNode) {
  const white = noiseBuffer(ctx, 2, false);
  const brown = noiseBuffer(ctx, 2, true);
  const crisp = crinkleBuffer(ctx, 3);
  // a hair of look-ahead so nothing is scheduled in the past
  const now = () => ctx.currentTime + 0.006;

  function noise(o: NoiseOpts) {
    const src = ctx.createBufferSource();
    src.buffer = o.brown ? brown : o.crisp ? crisp : white;
    src.loop = true;
    src.playbackRate.value = o.rate ?? 1;

    const filter = ctx.createBiquadFilter();
    filter.type = o.type ?? "bandpass";
    filter.Q.value = o.q ?? 1;
    filter.frequency.setValueAtTime(o.freq, o.t);
    if (o.freqTo) filter.frequency.exponentialRampToValueAtTime(o.freqTo, o.t + o.dur);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, o.t);
    for (const [at, level] of o.env) amp.gain.linearRampToValueAtTime(level, o.t + at * o.dur);
    amp.gain.linearRampToValueAtTime(0, o.t + o.dur);

    src.connect(filter).connect(amp);
    if (o.pan) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = o.pan;
      amp.connect(pan).connect(o.to ?? out);
    } else {
      amp.connect(o.to ?? out);
    }
    src.start(o.t, Math.random() * 1.5);
    src.stop(o.t + o.dur + 0.02);
  }

  function tone(o: ToneOpts) {
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.from, o.t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.t + o.dur);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, o.t);
    amp.gain.linearRampToValueAtTime(o.gain, o.t + (o.attack ?? 0.003));
    amp.gain.exponentialRampToValueAtTime(0.0001, o.t + o.dur);

    osc.connect(amp).connect(o.dest ?? out);
    osc.start(o.t);
    osc.stop(o.t + o.dur + 0.02);
  }

  /* ---------- paper ---------- */

  /** One fibre giving way: the unit every crackle is built from. */
  function grain(gain = 0.5, t = now(), to?: AudioNode) {
    noise({
      t,
      dur: rand(0.004, 0.016),
      env: [[0.08, gain * rand(0.5, 1)]],
      freq: rand(2400, 9000),
      q: rand(1.5, 5),
      pan: rand(-0.6, 0.6),
      to,
    });
  }

  /** `count` grains scattered over `spread` seconds. */
  function crackle(count: number, spread: number, gain = 0.5, t = now()) {
    for (let i = 0; i < count; i++) grain(gain, t + Math.random() * spread);
  }

  /**
   * Called every frame while cards are rubbing together: the livelier they
   * are, the more often a grain fires and the louder it is.
   */
  function rustle(energy: number, frame: number) {
    if (Math.random() < Math.min(48, 16 * energy) * frame) grain(Math.min(0.5, 0.17 + 0.14 * energy));
  }

  /**
   * The folder that is out of the drawer, as three continuous voices whose
   * loudness the animation sets every frame from what the paper is actually
   * doing — so the sound cannot drift out of step with the picture:
   *
   *   air       how fast it is travelling while held
   *   crinkle   how fast it is flexing
   *   friction  how fast it is sliding against its neighbours in the drawer
   */
  let voices: { air: GainNode; crinkle: GainNode; friction: GainNode } | null = null;

  function voice(buffer: AudioBuffer, type: BiquadFilterType, freq: number, q: number, rate: number) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = rate;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = 0;
    src.connect(filter).connect(amp).connect(out);
    src.start(0, Math.random());
    return amp;
  }

  function paper(air: number, crinkle: number, friction: number) {
    voices ??= {
      air: voice(white, "bandpass", 620, 0.6, 1),
      crinkle: voice(crisp, "highpass", 1400, 0.7, 1),
      friction: voice(crisp, "bandpass", 4600, 0.5, 1.6),
    };
    const t = ctx.currentTime;
    voices.air.gain.setTargetAtTime(0.2 * Math.min(1, air) ** 1.5, t, 0.04);
    voices.crinkle.gain.setTargetAtTime(0.45 * Math.min(1, crinkle), t, 0.02);
    voices.friction.gain.setTargetAtTime(0.9 * Math.min(1, friction), t, 0.02);
  }

  /** A sheet sliding in across the desk. */
  function paperSwish(dur: number) {
    const t = now();
    noise({ t, dur, env: [[0.4, 0.3], [0.8, 0.1]], freq: 520, freqTo: 1300, q: 0.9 });
    noise({ t, dur, env: [[0.3, 0.5], [0.8, 0.15]], type: "highpass", freq: 2200, crisp: true });
  }

  /** A sheet settling flat on the desk. */
  function paperLand() {
    const t = now();
    noise({ t, dur: 0.07, env: [[0.06, 0.55]], type: "lowpass", freq: 1500 });
    noise({ t, dur: 0.16, env: [[0.1, 0.32]], type: "highpass", freq: 2600, crisp: true });
    tone({ t, dur: 0.08, from: 170, to: 90, gain: 0.3 });
    crackle(4, 0.12, 0.35, t + 0.02);
  }

  /** The bottom edge of a sheet hitting the drawer floor. */
  function thud(strength = 1) {
    const t = now();
    tone({ t, dur: 0.17, from: 125, to: 52, gain: 0.5 * strength });
    noise({ t, dur: 0.055, env: [[0.05, 0.6 * strength]], type: "lowpass", freq: 950 });
    noise({ t, dur: 0.12, env: [[0.04, 0.45 * strength], [0.4, 0.13 * strength]], type: "highpass", freq: 1800, crisp: true });
    crackle(9, 0.14, 0.55 * strength, t + 0.01);
  }

  /* ---------- interface ---------- */

  function select() {
    const t = now();
    noise({ t, dur: 0.016, env: [[0.05, 0.8]], freq: 3300, q: 1.2 });
    tone({ t, dur: 0.03, from: 1900, to: 900, gain: 0.14 });
    tone({ t, dur: 0.05, from: 320, to: 180, gain: 0.16 });
  }

  function hover() {
    noise({ t: now(), dur: 0.01, env: [[0.1, 0.22]], type: "highpass", freq: 4200 });
  }

  /* ---------- the drawer ---------- */

  /**
   * The drawer rolling on its runners. The rumble follows the speed of the
   * tween driving it (power3.out when opening, power2.in when closing), and
   * the roller ticks are placed at even steps of *distance*, so they bunch up
   * where the drawer is moving fast.
   */
  function drawerSlide(dur: number, opening: boolean) {
    const t = now();
    const speed = (x: number) => (opening ? (1 - x) ** 2 : x);
    const POINTS = 40;
    const curve = (peak: number, floor: number) => {
      const c = new Float32Array(POINTS);
      for (let i = 0; i < POINTS; i++) {
        const x = i / (POINTS - 1);
        // short fades at both ends so the curve never starts or stops with a click
        const edge = Math.min(1, x / 0.05, (1 - x) / 0.05);
        c[i] = (floor + (peak - floor) * speed(x)) * edge;
      }
      return c;
    };

    const layer = (
      buffer: AudioBuffer,
      type: BiquadFilterType,
      freq: number,
      q: number,
      peak: number,
      floor: number,
    ) => {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0, t);
      amp.gain.setValueCurveAtTime(curve(peak, floor), t, dur);
      src.connect(filter).connect(amp).connect(out);
      src.start(t, Math.random());
      src.stop(t + dur + 0.02);
    };

    layer(brown, "lowpass", 380, 0.7, 1.15, 0.12); // weight of the drawer
    layer(white, "bandpass", 1750, 2.5, 0.34, 0.03); // runners
    layer(white, "bandpass", 3600, 5, 0.16, 0.01); // metal hiss

    const TICKS = 16;
    for (let i = 1; i < TICKS; i++) {
      const dist = i / TICKS;
      const x = opening ? 1 - (1 - dist) ** (1 / 3) : Math.sqrt(dist);
      const tt = t + x * dur;
      const level = 0.25 + 0.5 * speed(x);
      noise({ t: tt, dur: 0.007, env: [[0.1, level]], freq: rand(2300, 2900), q: 4 });
      tone({ t: tt, dur: 0.012, from: 1250, to: 800, gain: level * 0.12 });
    }
  }

  /** The drawer hitting its stop, and everything inside rattling on. */
  function drawerStop(strength = 1) {
    const t = now();
    tone({ t, dur: 0.16, from: 98, to: 46, gain: 0.55 * strength });
    noise({ t, dur: 0.045, env: [[0.05, 0.6 * strength]], type: "lowpass", freq: 1500 });
    // the handle ringing
    for (const [f, g] of [[1730, 0.05], [2610, 0.035], [3950, 0.02]]) {
      tone({ t, dur: 0.11, from: f, gain: g * strength, attack: 0.001 });
    }
    crackle(Math.round(12 * strength), 0.4, 0.45 * strength, t + 0.02);
  }

  /* ---------- intro ---------- */

  /**
   * The projector running under the whole intro: shutter flutter, the odd pop
   * of dust on the film, and a low drone. Returns a function that fades it out.
   */
  function introBed(seconds: number) {
    const t = now();
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + 0.25);
    bus.connect(out);

    // shutter: a click every frame at 18fps, never quite even
    for (let tt = 0; tt < seconds; tt += 1 / 18) {
      noise({
        t: t + tt + rand(0, 0.006),
        dur: 0.012,
        env: [[0.1, rand(0.14, 0.26)]],
        freq: rand(1500, 2300),
        q: 2,
        to: bus,
      });
    }
    // dust and scratches
    for (let i = 0; i < seconds * 11; i++) grain(rand(0.15, 0.6), t + Math.random() * seconds, bus);
    // motor hum + unease
    tone({ t, dur: seconds, from: 55, gain: 0.16, attack: 1.2, dest: bus });
    tone({ t, dur: seconds, from: 82.6, to: 78, gain: 0.07, attack: 2, dest: bus });
    noise({ t, dur: seconds, env: [[0.1, 0.5], [0.9, 0.5]], type: "lowpass", freq: 240, brown: true, to: bus });

    return () => {
      const at = ctx.currentTime;
      bus.gain.cancelScheduledValues(at);
      bus.gain.setValueAtTime(bus.gain.value, at);
      bus.gain.linearRampToValueAtTime(0, at + 0.08);
    };
  }

  /** One frame of the picture tearing: hard-gated static, sometimes with a data blip. */
  function glitch(dur: number, strength = 1) {
    const t = now();
    const len = Math.max(0.02, dur);
    noise({
      t,
      dur: len,
      env: [[0.02, rand(0.25, 0.5) * strength], [0.9, rand(0.2, 0.45) * strength]],
      type: "highpass",
      freq: rand(500, 2200),
      rate: rand(0.25, 1),
      pan: rand(-0.7, 0.7),
    });
    if (Math.random() > 0.5) {
      tone({ t, dur: len * 0.8, from: rand(90, 1400), gain: 0.07 * strength, type: "square", attack: 0.001 });
    }
  }

  /** Tension building into the final breakdown. */
  function riser(dur: number) {
    const t = now();
    noise({ t, dur, env: [[0.98, 0.5]], freq: 350, freqTo: 5200, q: 1.4 });
    tone({ t, dur, from: 60, to: 240, gain: 0.1, type: "sawtooth", attack: dur * 0.94 });
  }

  /** The blackout. */
  function hit() {
    const t = now();
    tone({ t, dur: 0.9, from: 82, to: 27, gain: 0.42 });
    tone({ t, dur: 0.4, from: 164, to: 40, gain: 0.15 });
    noise({ t, dur: 0.55, env: [[0.01, 0.45]], type: "lowpass", freq: 7000, freqTo: 180 });
    noise({ t, dur: 0.06, env: [[0.02, 0.3]], type: "highpass", freq: 3000 });
  }

  /** The title landing like a rubber stamp. */
  function stamp() {
    const t = now();
    tone({ t, dur: 0.22, from: 110, to: 45, gain: 0.45 });
    noise({ t, dur: 0.05, env: [[0.04, 0.5]], type: "lowpass", freq: 1800 });
    noise({ t, dur: 0.02, env: [[0.05, 0.4]], freq: 3400, q: 1.5 });
  }

  /* ---------- the evidence bag ---------- */

  /** A fold pressed flat with a thumbnail: a short slide, then the fibres giving way along the crease. */
  function crease() {
    const t = now();
    noise({ t, dur: 0.16, env: [[0.3, 0.22], [0.8, 0.08]], freq: 900, freqTo: 2200, q: 0.8 });
    noise({ t: t + 0.05, dur: 0.12, env: [[0.1, 0.4]], type: "highpass", freq: 2800, crisp: true });
    crackle(10, 0.13, 0.42, t + 0.06);
  }

  /**
   * One crease in a sheet of polythene: thinner and stiffer than paper, so
   * each snap is shorter, brighter and louder.
   */
  function snap(gain: number, t = now()) {
    noise({
      t,
      dur: rand(0.003, 0.009),
      env: [[0.05, gain * rand(0.5, 1)]],
      freq: rand(3800, 11000),
      q: rand(2, 6),
      pan: rand(-0.5, 0.5),
    });
  }

  /** Called every frame while the bag is moving: the more it flexes, the more it crackles. */
  function plastic(energy: number, frame: number) {
    if (Math.random() < Math.min(70, 26 * energy) * frame) snap(Math.min(0.42, 0.1 + 0.2 * energy));
  }

  /** The bag taking a knock: the film buckling all at once, plus whatever hit it. */
  function crumple(strength = 1) {
    const t = now();
    noise({ t, dur: 0.22, env: [[0.04, 0.45 * strength], [0.45, 0.12 * strength]], type: "highpass", freq: 3400, crisp: true, rate: 1.5 });
    tone({ t, dur: 0.1, from: 150, to: 70, gain: 0.2 * strength });
    for (let i = 0; i < 16 * strength; i++) snap(0.4 * strength, t + Math.random() ** 2 * 0.25);
  }

  /** The two lips of the seal being pulled apart, and a breath of air into the bag. */
  function bagOpen() {
    const t = now();
    for (let i = 0; i < 9; i++) snap(0.32, t + (i / 9) ** 1.4 * 0.13);
    noise({ t: t + 0.04, dur: 0.18, env: [[0.2, 0.2]], type: "lowpass", freq: 700, brown: true });
  }

  /**
   * The slider run along the seal. Every tooth is its own click, placed at an
   * even step of distance along the slider's sine in-out run, so they come
   * fastest in the middle — the same curve the picture uses.
   */
  function zip(dur: number) {
    const t = now();
    const TEETH = 42;
    for (let i = 1; i < TEETH; i++) {
      const at = t + (Math.acos(1 - (2 * i) / TEETH) / Math.PI) * dur;
      noise({ t: at, dur: 0.006, env: [[0.1, rand(0.25, 0.42)]], freq: rand(2500, 3600), q: 3 });
      tone({ t: at, dur: 0.01, from: 1700, to: 1050, gain: 0.04 });
    }
    noise({ t, dur, env: [[0.3, 0.12], [0.7, 0.12]], type: "highpass", freq: 5200, crisp: true });
    // the slider hitting the end of the track
    noise({ t: t + dur, dur: 0.03, env: [[0.05, 0.5]], freq: 2100, q: 2 });
    tone({ t: t + dur, dur: 0.05, from: 900, to: 500, gain: 0.08 });
  }

  /** A sheet of plastic pulled through the air. */
  function whoosh(dur: number) {
    const t = now();
    noise({ t, dur, env: [[0.35, 0.4], [0.75, 0.15]], freq: 380, freqTo: 1500, q: 0.7 });
    noise({ t, dur: dur * 0.8, env: [[0.3, 0.22]], type: "highpass", freq: 4200, crisp: true, rate: 1.4 });
  }

  return {
    crease,
    plastic,
    crumple,
    bagOpen,
    zip,
    whoosh,
    rustle,
    paper,
    paperSwish,
    paperLand,
    thud,
    select,
    hover,
    drawerSlide,
    drawerStop,
    introBed,
    glitch,
    riser,
    hit,
    stamp,
  };
}

export type Kit = ReturnType<typeof createKit>;

/* ---------- the live instance ---------- */

const MUTE_KEY = "himanshu-portfolio:muted";
/** overall loudness of the site, 0 to 1 */
const VOLUME = 0.55;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let kit: Kit | null = null;
let muted = localStorage.getItem(MUTE_KEY) === "1";

/* recorded clips, played through the same output as everything synthesised */
const SAMPLES = {
  introVoice: "/assets/audio/intro-voice.mp3",
};
type SampleName = keyof typeof SAMPLES;
const loading: Partial<Record<SampleName, Promise<AudioBuffer | null>>> = {};
const loaded: Partial<Record<SampleName, AudioBuffer>> = {};
/** a video element can only ever be wired into the audio graph once */
const films = new WeakMap<HTMLVideoElement, GainNode>();

function loadSamples(c: AudioContext) {
  for (const name of Object.keys(SAMPLES) as SampleName[]) {
    loading[name] = fetch(SAMPLES[name])
      .then((res) => res.arrayBuffer())
      .then((data) => c.decodeAudioData(data))
      .then((buf) => (loaded[name] = buf))
      .catch(() => null);
  }
}

function boot() {
  if (ctx) return ctx;
  ctx = new AudioContext({ latencyHint: "interactive" });
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  // catches the peaks when several effects land on the same frame
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 8;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  master.connect(limiter).connect(ctx.destination);
  kit = createKit(ctx, master);
  loadSamples(ctx);
  return ctx;
}

export const sfx = {
  get muted() {
    return muted;
  },

  setMuted(next: boolean) {
    muted = next;
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    if (ctx && master) master.gain.setTargetAtTime(next ? 0 : VOLUME, ctx.currentTime, 0.015);
    if (!next) sfx.unlock();
  },

  /** Browsers keep audio suspended until a click or key press; call this from one. */
  unlock() {
    if (muted) return;
    const c = boot();
    if (c.state === "suspended") void c.resume();
  },

  /** Resolves true if sound can play right now, without waiting for a gesture. */
  ready() {
    if (muted) return Promise.resolve(false);
    const c = boot();
    if (c.state === "running") return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      void c.resume().then(() => resolve(true));
      setTimeout(() => resolve(c.state === "running"), 250);
    });
  },

  /**
   * Routes a video's own soundtrack through the site's output, `gain` times
   * louder than it was recorded. Returns nothing when muted (leave the video
   * muted too); otherwise a handle that can fade it away.
   */
  film(video: HTMLVideoElement, gain: number) {
    if (muted) return undefined;
    const c = boot();
    let amp = films.get(video);
    if (!amp) {
      amp = c.createGain();
      c.createMediaElementSource(video).connect(amp).connect(master!);
      films.set(video, amp);
    }
    amp.gain.setValueAtTime(gain, c.currentTime);
    const node = amp;
    return {
      /** Swells a little as everything else cuts out, then dies away over `seconds`. */
      fadeOut(seconds: number) {
        const t = c.currentTime;
        node.gain.cancelScheduledValues(t);
        node.gain.setValueAtTime(node.gain.value, t);
        node.gain.linearRampToValueAtTime(gain * 2.2, t + 0.3);
        node.gain.setTargetAtTime(0, t + 0.3, seconds / 4.5);
      },
    };
  },

  /**
   * Plays a recorded clip. Returns a function that cuts it off, or nothing if
   * it cannot play right now (muted, audio still locked, or not downloaded
   * yet) so the caller can fall back on something else. `patient` waits for
   * the download instead, as long as it lands within half a second.
   */
  sample(name: SampleName, gain = 1, patient = false): (() => void) | undefined {
    if (muted) return undefined;
    const c = boot();
    if (c.state !== "running" || (!loaded[name] && !patient)) return undefined;
    let src: AudioBufferSourceNode | null = null;
    let cancelled = false;
    const asked = performance.now();
    const start = (buf: AudioBuffer | null | undefined) => {
      if (!buf || cancelled || performance.now() - asked > 500) return;
      const amp = c.createGain();
      amp.gain.value = gain;
      src = c.createBufferSource();
      src.buffer = buf;
      src.connect(amp).connect(master!);
      src.start();
    };
    if (loaded[name]) start(loaded[name]);
    else void loading[name]?.then(start);
    return () => {
      cancelled = true;
      src?.stop();
    };
  },

  play<K extends keyof Kit>(name: K, ...args: Parameters<Kit[K]>): ReturnType<Kit[K]> | undefined {
    if (muted) return undefined;
    const c = boot();
    const run = () => (kit![name] as (...a: unknown[]) => ReturnType<Kit[K]>)(...args);
    if (c.state === "running") return run();
    // still locked: play it only if the unlock lands right away, otherwise a
    // backlog of stale sounds would all fire on the visitor's first click
    const asked = performance.now();
    void c.resume().then(() => {
      if (performance.now() - asked < 150) run();
    });
    return undefined;
  },
};

window.addEventListener("pointerdown", sfx.unlock, { capture: true });
window.addEventListener("keydown", sfx.unlock, { capture: true });
