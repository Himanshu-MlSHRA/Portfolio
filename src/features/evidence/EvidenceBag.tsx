import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { sfx, type Kit } from "../../audio/sfx";
import { SUBJECT } from "../../data/content";
import "./evidence.css";

/*
 * What happens to a statement once it is sent. The message box is lifted off
 * the page as a slip of paper, folded twice, and dropped into a plastic
 * evidence bag that is zipped shut, labelled, stamped and thrown away — by
 * the visitor, if they grab it, or by itself if they do not.
 *
 * Two things move here. The paper is scripted: a GSAP timeline folds it and
 * carries it to the bag. The bag is simulated: it hangs from the point where
 * it is held, so it swings as a pendulum against whatever that point does,
 * stretches like a spring under its load, and its floppy sides lag behind its
 * swing. The timeline only says where the bag is held; how it hangs from
 * there is worked out every frame, and the sound of the plastic follows the
 * same numbers.
 */

/** px / s² — a gravity that reads right at screen scale */
const G = 2400;
/** the depth of the gap between the two lips when the bag is fully open */
const MOUTH = 34;
/** the height of the zip strip along the top */
const STRIP = 20;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const deg = (r: number) => (r * 180) / Math.PI;

interface Props {
  /** the message box the slip is lifted from */
  source: HTMLTextAreaElement;
  name: string;
  onDone: () => void;
  /** preview only: run silently to this many seconds in and hold still there */
  freezeAt?: number;
}

/* ---------- the slip ---------- */

interface Panel {
  el: HTMLDivElement;
  shades: HTMLDivElement[];
}

/**
 * The slip is cut into equal panels hinged to each other, so that it can be
 * folded for real in 3D: each face carries its own slice of the message, and
 * the back of the panel that ends up outermost is written on like an envelope.
 */
function panel(i: number, pw: number, ink: HTMLDivElement, address?: string): Panel {
  const el = document.createElement("div");
  el.className = "ev__panel";
  el.style.width = `${pw}px`;

  const front = document.createElement("div");
  front.className = "ev__face";
  const slice = ink.cloneNode(true) as HTMLDivElement;
  slice.style.left = `${-i * pw}px`;
  front.append(slice);

  const back = document.createElement("div");
  back.className = "ev__face ev__face--back";
  if (address) {
    const a = document.createElement("div");
    a.className = "ev__address";
    a.textContent = address;
    back.append(a);
  }

  const shades = [front, back].map((face) => {
    const s = document.createElement("div");
    s.className = "ev__shade";
    face.append(s);
    return s;
  });
  el.append(front, back);
  return { el, shades };
}

export default function EvidenceBag({ source, name, onDone, freezeAt }: Props) {
  const ids = useId().replace(/:/g, "");
  const rootRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const bagRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<SVGPathElement>(null);
  const gapRef = useRef<SVGPathElement>(null);
  const backStripRef = useRef<SVGPathElement>(null);
  const frontRef = useRef<SVGPathElement>(null);
  const frontClipRef = useRef<SVGPathElement>(null);
  const sealRef = useRef<SVGPathElement>(null);
  const dotsRef = useRef<SVGPathElement>(null);
  const frontStripRef = useRef<SVGPathElement>(null);
  const track1Ref = useRef<SVGPathElement>(null);
  const track2Ref = useRef<SVGPathElement>(null);
  const shineRef = useRef<SVGGElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const fieldsRef = useRef<HTMLDListElement>(null);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // as big as it can be while it, and the slip held above it, still fit on the screen
  const bw = Math.round(Math.min(400, vw * 0.8, (vh - 290) / 1.34));
  const bh = Math.round(bw * 1.34);
  /** everything printed on the bag is drawn for a 300px bag and scaled by this */
  const u = bw / 300;
  const strip = STRIP * u;
  const mouthD = MOUTH * u;
  /** the bag hangs with its bottom just clear of the bottom of the screen */
  const cy = Math.max(120, vh - 40 - bh);
  const labelTop = strip + 12 * u;
  const labelH = Math.round(bw * 0.39);

  const [now] = useState(() => new Date());
  const stamp = {
    date: now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase(),
    time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
  };
  const rows: [string, string][] = [
    ["ITEM", "WRITTEN STATEMENT"],
    ["FROM", (name || "ANONYMOUS").toUpperCase()],
    ["DATE", `${stamp.date}  ${stamp.time}`],
    ["SEALED BY", "H. MISHRA"],
  ];

  useEffect(() => {
    const root = rootRef.current!;
    const silent = freezeAt !== undefined;
    const sound = <K extends keyof Kit>(n: K, ...args: Parameters<Kit[K]>) => {
      if (!silent) sfx.play(n, ...args);
    };

    /* ----- the slip, built to match the message box exactly ----- */

    const rect = source.getBoundingClientRect();
    const W = source.offsetWidth;
    const H = source.offsetHeight;
    /** the sheet may be drawn scaled: this is how much */
    const k = rect.width / W;
    const css = getComputedStyle(source);

    const ink = document.createElement("div");
    ink.className = "ev__ink";
    Object.assign(ink.style, {
      width: `${W}px`,
      height: `${H}px`,
      padding: css.padding,
      font: css.font,
      lineHeight: css.lineHeight,
      letterSpacing: css.letterSpacing,
    });
    ink.textContent = source.value;

    const four = W >= 480;
    const n = four ? 4 : 2;
    const pw = W / n;
    const address = `STATEMENT\nFROM: ${(name || "anonymous").toUpperCase()}\nTO: ${SUBJECT.name.toUpperCase()}`;

    const slip = document.createElement("div");
    slip.className = "ev__slip";
    Object.assign(slip.style, { width: `${W}px`, height: `${H}px` });

    // the hinges, from the panel that never moves outwards
    const Q = four
      ? [panel(0, pw, ink), panel(1, pw, ink), panel(2, pw, ink), panel(3, pw, ink, address)]
      : [panel(0, pw, ink, address), panel(1, pw, ink)];
    if (four) {
      const [q1, q2, q3, q4] = Q;
      q3.el.style.left = `${2 * pw}px`;
      q4.el.style.left = `${pw}px`;
      q4.el.style.transformOrigin = "0 50%";
      q2.el.style.left = `${-pw}px`;
      q2.el.style.transformOrigin = "100% 50%";
      q1.el.style.left = `${-pw}px`;
      q1.el.style.transformOrigin = "100% 50%";
      q2.el.append(q1.el);
      q3.el.append(q2.el, q4.el);
      slip.append(q3.el);
    } else {
      const [q1, q2] = Q;
      q2.el.style.left = `${pw}px`;
      q1.el.style.left = `${-pw}px`;
      q1.el.style.transformOrigin = "100% 50%";
      q2.el.append(q1.el);
      slip.append(q2.el);
    }
    root.append(slip);

    /** the middle of the folded stack, in the slip's own pixels */
    const vcx = four ? 2.5 * pw : 1.5 * pw;
    slip.style.transformOrigin = `${vcx}px ${H / 2}px`;

    /* ----- where things go ----- */

    const cx = vw / 2;
    // folded, the slip is one panel wide: shrink it to fit under the label
    const room = bh - labelTop - labelH - 26;
    const inBag = Math.min(1, (bw * 0.74) / pw, room / H, (cy - 54) / H);
    const hoverY = cy - (H * inBag) / 2 - 34;

    /* ----- the script ----- */

    const S = {
      lift: 0,
      a1: 0,
      a2: 0,
      x: rect.left + vcx * k,
      y: rect.top + (H / 2) * k,
      rot: 0,
      sc: k,
      dim: 0,
      px: cx,
      py: vh + 90,
      open: 0,
      zip: 0,
      type: 0,
      stamp: 0,
      hint: 0,
    };

    /* ----- the simulation ----- */

    /** the point the bag is held by: its top middle */
    const P = { x: S.px, y: S.py, vx: 0, vy: 0, ax: 0, ay: 0 };
    /** swing (rad), stretch (fraction of its height), and their speeds */
    const B = { th: 0, om: 0, al: 0, s: 0, sv: 0 };
    /** the slip once it is in the bag, in the bag's own frame */
    const L = { x: 0, y: 0, vy: 0, rot: 0, phi: 0, pv: 0 };
    let slipIn: "hand" | "falling" | "resting" = "hand";
    let load = 0.15;
    let mode: "script" | "drag" | "free" = "script";
    let grabbable = false;
    let running = true;
    let finished = false;
    let shake = 0;
    let freeFor = 0;
    let fade = 1;
    const aim = { x: 0, y: 0 };
    let typed = -1;

    function release() {
      // from the screen into the bag's frame, then into the bag between its two walls
      const dx = S.x - P.x;
      const dy = S.y - P.y;
      const c = Math.cos(B.th);
      const s = Math.sin(B.th);
      L.x = dx * c + dy * s + bw / 2;
      L.y = -dx * s + dy * c;
      L.rot = S.rot - deg(B.th);
      L.vy = 0;
      slotRef.current!.append(slip);
      slipIn = "falling";
    }

    function kick(om: number, sv = 0) {
      B.om += om;
      B.sv += sv;
    }

    function finish() {
      if (finished) return;
      finished = true;
      running = false;
      onDone();
    }

    // One thing at a time, unhurried: the slip is lifted and folded, then
    // carried up, then the bag comes up to meet it, then it goes in, then the
    // bag is sealed.
    const tl = gsap.timeline({ paused: true });
    tl.to(S, { lift: 1, sc: k * 1.035, duration: 0.5, ease: "power2.out" }, 0)
      .to(S, { dim: 1, duration: 1.1, ease: "sine.out" }, 0)
      .call(() => sound("paperSwish", 0.45), [], 0.02)
      .to(S, { a1: 1, duration: 0.85, ease: "power2.inOut" }, 0.55)
      .call(() => sound("crease"), [], 1.32);
    let t = 1.55;
    if (four) {
      tl.call(
        () => {
          // the far panel now lies on the last one: from here on it folds with it
          const [q1, , , q4] = Q;
          q4.el.append(q1.el);
          q1.el.style.left = "0px";
          q1.el.style.transformOrigin = "50% 50%";
          q1.el.style.transform = "translateZ(1px) rotateY(180deg)";
          Q[1].el.style.transform = "translateZ(1px) rotateY(180deg)";
        },
        [],
        t,
      )
        .to(S, { a2: 1, duration: 0.8, ease: "power2.inOut" }, t)
        .call(() => sound("crease"), [], t + 0.72);
      t += 0.85;
    }

    // the folded slip is carried up to where it will be dropped from
    const tCarry = t + 0.15;
    tl.to(S, { x: cx, y: hoverY, sc: inBag, rot: -3, lift: 0.75, duration: 1.1, ease: "power2.inOut" }, tCarry);

    // and only then does the bag come up to meet it
    const tBag = tCarry + 1.0;
    tl.to(S, { px: cx, py: cy, duration: 1.5, ease: "power3.out" }, tBag).call(() => sound("whoosh", 0.8), [], tBag);

    const tOpen = tBag + 1.4;
    tl.to(S, { open: 1, duration: 0.45, ease: "back.out(2)" }, tOpen).call(
      () => (sound("bagOpen"), kick(0.05)),
      [],
      tOpen,
    );

    const tRelease = tOpen + 0.75;
    tl.call(release, [], tRelease);

    const tZip = tRelease + 1.5;
    tl.to(S, { zip: 1, duration: 1.4, ease: "sine.inOut" }, tZip)
      .call(() => (sound("zip", 1.4), kick(0.1)), [], tZip)
      .call(() => kick(-0.08, 0.01), [], tZip + 1.4);

    const tType = tZip + 1.6;
    tl.to(S, { type: 1, duration: 1.5, ease: "none" }, tType);

    const tStamp = tType + 1.7;
    tl.to(S, { stamp: 1, duration: 0.18, ease: "power4.in" }, tStamp)
      .call(
        () => {
          sound("stamp");
          sound("crumple", 0.45);
          kick(0.16, 0.05);
          shake = 1;
        },
        [],
        tStamp + 0.18,
      )
      .call(() => (grabbable = true), [], tStamp + 0.3)
      .to(S, { hint: 1, duration: 0.5 }, tStamp + 0.7);

    // nobody grabbed it: it is yanked off the desk
    const tYank = tStamp + 3.6;
    tl.call(() => (grabbable = false), [], tYank)
      .to(S, { hint: 0, duration: 0.25 }, tYank)
      .to(S, { py: `+=${30}`, duration: 0.3, ease: "power2.out" }, tYank)
      .to(S, { px: vw + bw * 1.4, py: -bh * 1.7, duration: 0.75, ease: "power3.in" }, tYank + 0.3)
      .call(() => sound("whoosh", 0.6), [], tYank + 0.4)
      .to(S, { dim: 0, duration: 0.6 }, tYank + 0.6)
      .call(finish, [], tYank + 1.2);

    /* ----- one step of the world ----- */

    function physics(dt: number) {
      // where the bag is held
      if (mode === "free") {
        P.ax = 0;
        P.ay = G;
      } else {
        const tx = mode === "drag" ? aim.x : S.px;
        const ty = mode === "drag" ? aim.y : S.py;
        const kk = mode === "drag" ? 700 : 900;
        P.ax = kk * (tx - P.x) - 2 * Math.sqrt(kk) * P.vx;
        P.ay = kk * (ty - P.y) - 2 * Math.sqrt(kk) * P.vy;
      }
      P.vx += P.ax * dt;
      P.vy += P.ay * dt;
      P.x += P.vx * dt;
      P.y += P.vy * dt;

      // the swing: gravity as felt from the moving hand
      const gx = -P.ax;
      const gy = G - P.ay;
      const len = bh * 0.55;
      const damp = mode === "free" ? 0.25 : 2.2;
      B.al = -(gy * Math.sin(B.th) + gx * Math.cos(B.th)) / len - damp * B.om;
      B.om += B.al * dt;
      B.th += B.om * dt;

      // the stretch: heavier when the hand pulls up, lighter when it drops
      const rest = ((0.02 * load) / G) * Math.max(0, gy);
      B.sv += (-420 * (B.s - rest) - 13 * B.sv) * dt;
      B.s += B.sv * dt;

      // the slip inside it
      if (slipIn === "falling") {
        L.vy += G * dt;
        L.y += L.vy * dt;
        L.rot += (0 - L.rot) * Math.min(1, dt * 3);
        const floor = bh + B.s * bh - 9 - (H * inBag) / 2;
        if (L.y >= floor) {
          L.y = floor;
          const hit = L.vy;
          sound("crumple", clamp(hit / 1100, 0.3, 1));
          kick(((L.x - bw / 2) / bw) * hit * 0.002 + 0.12, (hit / bh) * 0.35);
          L.pv += 1.6;
          L.vy = 0;
          slipIn = "resting";
          load = 1;
        }
      } else if (slipIn === "resting") {
        L.y = bh + B.s * bh - 9 - (H * inBag) / 2;
        L.rot += (0 - L.rot) * Math.min(1, dt * 4);
        // it slides about a little when the bag swings, and settles back
        L.pv += (-130 * L.phi - 9 * L.pv - 0.45 * B.al) * dt;
        L.phi += L.pv * dt;
      }
    }

    /* ----- drawing ----- */

    function fold() {
      const a1 = S.a1 * Math.PI;
      const a2 = S.a2 * Math.PI;
      if (four) {
        const [q1, q2, , q4] = Q;
        if (S.a2 === 0 && q1.el.parentElement === q2.el) {
          q2.el.style.transform = `translateZ(${4 * S.a1}px) rotateY(${deg(a1)}deg)`;
        }
        q4.el.style.transform = `translateZ(3px) rotateY(${-deg(a2)}deg)`;
        const world = [q1.el.parentElement === q2.el ? a1 : Math.PI - a2, a1, 0, -a2];
        Q.forEach((q, i) => {
          const o = (1 - Math.abs(Math.cos(world[i]))) * 0.5;
          q.shades.forEach((s) => (s.style.opacity = String(o)));
        });
      } else {
        const [q1] = Q;
        q1.el.style.transform = `translateZ(${S.a1}px) rotateY(${deg(a1)}deg)`;
        const o = (1 - Math.abs(Math.cos(a1))) * 0.5;
        q1.shades.forEach((s) => (s.style.opacity = String(o)));
      }
    }

    function draw(dt: number) {
      const shown = S.dim * fade;
      root.style.setProperty("--dim", String(shown));
      root.style.setProperty("--edge", String(1 - Math.min(1, S.lift * 1.4)));

      shake *= Math.exp(-dt * 16);
      root.style.transform = shake > 0.02 ? `translate(${(Math.random() - 0.5) * 9 * shake}px, ${(Math.random() - 0.5) * 9 * shake}px)` : "";

      fold();

      // the slip: in the hand it is placed on the screen, in the bag inside the bag
      const lifted = slipIn === "hand" ? S.lift : 0.25;
      slip.style.filter = `drop-shadow(0 ${2 + lifted * 16}px ${3 + lifted * 16}px rgba(0,0,0,${0.12 + lifted * 0.22}))`;
      if (slipIn === "hand") {
        slip.style.transform = `translate(${S.x - vcx}px, ${S.y - H / 2}px) rotate(${S.rot}deg) scale(${S.sc})`;
      } else {
        slip.style.transform = `translate(${L.x - vcx + L.phi * 22}px, ${L.y - H / 2}px) rotate(${L.rot + deg(L.phi) * 0.5}deg) scale(${inBag})`;
      }

      // the bag
      const sag = B.s * bh;
      const bend = clamp(-B.om * 10, -18, 18);
      const bulge = 2 + load * 4 + sag * 0.25;
      const droop = 3 + load * 6 + sag * 0.4;
      const bottom = bh + sag;
      const zx = 8 + S.zip * (bw - 16);
      const left = (bw - zx) / bw;
      const fDip = S.open * mouthD * left;
      const bRise = S.open * mouthD * 0.55 * left;
      const mid = (zx + bw) / 2;

      const sides =
        `C ${bw + bulge},${bh * 0.4} ${bw + bend + bulge * 0.6},${bottom - 30} ${bw + bend},${bottom} ` +
        `Q ${bw / 2 + bend},${bottom + droop} ${bend},${bottom} ` +
        `C ${bend - bulge * 0.6},${bottom - 30} ${-bulge},${bh * 0.4} 0,0 Z`;
      const edge = (y: number, dip: number) => `M 0,${y} L ${zx},${y} Q ${mid},${y + dip} ${bw},${y}`;

      backRef.current!.setAttribute("d", `${edge(0, -bRise)} ${sides}`);
      gapRef.current!.setAttribute("d", `M ${zx},0 Q ${mid},${-bRise} ${bw},0 Q ${mid},${fDip} ${zx},0 Z`);
      backStripRef.current!.setAttribute("d", `${edge(0, -bRise)} L ${bw},${strip} L 0,${strip} Z`);
      const front = `${edge(0, fDip)} ${sides}`;
      frontRef.current!.setAttribute("d", front);
      frontClipRef.current!.setAttribute("d", front);
      // only the sides and the bottom are heat-sealed; the top is the zip
      const sealed = `M ${bw},0 ${sides.slice(0, -2)}`;
      sealRef.current!.setAttribute("d", sealed);
      dotsRef.current!.setAttribute("d", sealed);
      frontStripRef.current!.setAttribute(
        "d",
        `${edge(0, fDip)} L ${bw},${strip} Q ${mid},${strip + fDip} ${zx},${strip} L 0,${strip} Z`,
      );
      track1Ref.current!.setAttribute("d", edge(7 * u, fDip));
      track2Ref.current!.setAttribute("d", edge(12 * u, fDip));
      // the light slides across the plastic as it turns
      shineRef.current!.setAttribute("transform", `translate(${-B.th * 90} 0)`);

      sliderRef.current!.style.transform = `translate(${zx - 9 * u}px, ${-5 * u}px)`;
      bagRef.current!.style.transform = `translate(${P.x - bw / 2}px, ${P.y}px) rotate(${B.th}rad)`;
      shadowRef.current!.style.transform = `translate(${P.x - bw / 2 + 18}px, ${P.y + 28}px) rotate(${B.th}rad) scaleY(${1 + B.s})`;

      // the label fills in as if typed
      const chars = Math.floor(S.type * rows.reduce((a, [, v]) => a + v.length, 0));
      if (chars !== typed) {
        if (chars > typed && chars % 3 === 0) sound("hover");
        typed = chars;
        let left = chars;
        fieldsRef.current!.querySelectorAll("dd").forEach((dd, i) => {
          const v = rows[i][1];
          dd.textContent = v.slice(0, Math.max(0, left));
          left -= v.length;
        });
      }

      const st = stampRef.current!;
      st.style.opacity = String(Math.min(1, S.stamp * 4));
      st.style.transform = `rotate(-13deg) scale(${2.4 - 1.4 * S.stamp})`;

      hintRef.current!.style.opacity = String(S.hint * fade);
      bagRef.current!.classList.toggle("ev__bag--grab", grabbable);

      // the plastic crackles as hard as it is being worked
      const energy = Math.abs(B.om) * 0.5 + Math.abs(B.sv) * 6 + Math.hypot(P.vx, P.vy) / 2600;
      if (energy > 0.06) sound("plastic", energy, dt);
    }

    let clock = 0;
    function step(dt: number) {
      if (running && mode === "script") {
        clock += dt;
        tl.time(clock, false);
      }
      const SUB = Math.max(1, Math.ceil(dt / (1 / 240)));
      for (let i = 0; i < SUB; i++) physics(dt / SUB);

      if (mode === "free") {
        freeFor += dt;
        fade = Math.max(0, 1 - freeFor / 0.6);
        const gone = P.y > vh + 40 || P.x < -bh * 1.3 || P.x > vw + bh * 1.3 || freeFor > 3.5;
        if (gone) finish();
      }
      draw(dt);
    }

    /* ----- the visitor's hand ----- */

    const bagEl = bagRef.current!;
    let lastMove = 0;
    function down(e: PointerEvent) {
      if (!grabbable || mode !== "script") return;
      mode = "drag";
      running = false;
      S.hint = 0;
      aim.x = P.x;
      aim.y = P.y;
      lastMove = performance.now();
      bagEl.setPointerCapture(e.pointerId);
      sound("crumple", 0.35);
      grab.x = e.clientX - P.x;
      grab.y = e.clientY - P.y;
    }
    const grab = { x: 0, y: 0 };
    function move(e: PointerEvent) {
      if (mode !== "drag") return;
      aim.x = e.clientX - grab.x;
      aim.y = e.clientY - grab.y;
      lastMove = performance.now();
    }
    function up() {
      if (mode !== "drag") return;
      // held still before letting go: it just drops
      if (performance.now() - lastMove > 120) {
        P.vx *= 0.2;
        P.vy *= 0.2;
      }
      const speed = Math.hypot(P.vx, P.vy);
      const cap = Math.min(1, 4200 / Math.max(1, speed));
      P.vx *= cap;
      P.vy *= cap;
      B.om += clamp(P.vx * 0.0016, -5, 5);
      mode = "free";
      if (speed > 700) sound("whoosh", 0.45);
    }
    bagEl.addEventListener("pointerdown", down);
    bagEl.addEventListener("pointermove", move);
    bagEl.addEventListener("pointerup", up);
    bagEl.addEventListener("pointercancel", up);

    const skip = root.querySelector<HTMLButtonElement>(".ev__skip")!;
    skip.addEventListener("click", finish);

    /* ----- run ----- */

    let tick: ((time: number, deltaMs: number) => void) | null = null;
    if (silent) {
      for (let tt = 0; tt < freezeAt; tt += 1 / 60) step(1 / 60);
    } else {
      step(0);
      tick = (_time, deltaMs) => {
        if (!finished) step(Math.min(deltaMs / 1000, 1 / 20));
      };
      gsap.ticker.add(tick);
    }

    return () => {
      if (tick) gsap.ticker.remove(tick);
      tl.kill();
      slip.remove();
      bagEl.removeEventListener("pointerdown", down);
      bagEl.removeEventListener("pointermove", move);
      bagEl.removeEventListener("pointerup", up);
      bagEl.removeEventListener("pointercancel", up);
      skip.removeEventListener("click", finish);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clip = `ev-clip-${ids}`;
  const sheen = `ev-sheen-${ids}`;
  const streak = `ev-streak-${ids}`;
  const mouth = `ev-mouth-${ids}`;

  return createPortal(
    <div ref={rootRef} className="ev" aria-hidden="true">
      <div className="ev__dim" />
      <div ref={shadowRef} className="ev__shadow" style={{ width: bw, height: bh }} />
      <div ref={bagRef} className="ev__bag" style={{ width: bw, height: bh, ["--u" as string]: u }}>
        <svg className="ev__layer" width={bw} height={bh}>
          <defs>
            <radialGradient id={mouth} cx="50%" cy="0%" r="70%">
              <stop offset="0" stopColor="#000" stopOpacity="0.85" />
              <stop offset="1" stopColor="#000" stopOpacity="0.5" />
            </radialGradient>
          </defs>
          <path ref={backRef} className="ev__back" />
          <path ref={backStripRef} className="ev__strip ev__strip--back" />
          {/* looking into the open bag: the inside of the back lip, in shadow */}
          <path ref={gapRef} fill={`url(#${mouth})`} />
        </svg>

        <div ref={slotRef} className="ev__slot" />

        <svg className="ev__layer" width={bw} height={bh}>
          <defs>
            <clipPath id={clip}>
              <path ref={frontClipRef} />
            </clipPath>
            <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
              <stop offset="0.45" stopColor="#fff" stopOpacity="0.08" />
              <stop offset="0.8" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id={streak} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path ref={frontRef} className="ev__front" fill={`url(#${sheen})`} />
          <g clipPath={`url(#${clip})`}>
            {/* the heat-sealed edges: a frosted band with a pressed texture */}
            <path ref={sealRef} className="ev__seal" />
            <path ref={dotsRef} className="ev__seal ev__seal--pressed" />
            <g ref={shineRef}>
              <rect x={bw * 0.14} y={-20} width={26} height={bh + 60} fill={`url(#${streak})`} transform={`rotate(9 ${bw * 0.14} 0)`} />
              <rect x={bw * 0.66} y={-20} width={11} height={bh + 60} fill={`url(#${streak})`} transform={`rotate(9 ${bw * 0.66} 0)`} opacity="0.7" />
            </g>
            {/* creases the plastic picked up in storage */}
            <g className="ev__creases">
              <path d={`M ${bw * 0.08},${bh * 0.62} q ${bw * 0.2},${-bh * 0.05} ${bw * 0.42},${bh * 0.02}`} />
              <path d={`M ${bw * 0.55},${bh * 0.8} q ${bw * 0.15},${bh * 0.03} ${bw * 0.38},${-bh * 0.06}`} />
              <path d={`M ${bw * 0.2},${bh * 0.9} l ${bw * 0.12},${-bh * 0.13}`} />
            </g>
          </g>
          <path ref={frontStripRef} className="ev__strip" />
          <path ref={track1Ref} className="ev__track" />
          <path ref={track2Ref} className="ev__track ev__track--red" />
        </svg>

        <div className="ev__label" style={{ top: labelTop, height: labelH }}>
          <div className="ev__label-head">
            <b>EVIDENCE</b>
            <span>No. {SUBJECT.fileNo}-07</span>
          </div>
          <dl ref={fieldsRef}>
            {rows.map(([k]) => (
              <div key={k}>
                <dt>{k}:</dt>
                <dd />
              </div>
            ))}
          </dl>
        </div>
        <div ref={stampRef} className="ev__stamp" style={{ top: labelTop + labelH * 0.48 }}>
          SEALED
        </div>
        <div ref={sliderRef} className="ev__slider" />
      </div>
      <div ref={hintRef} className="ev__hint" style={{ top: Math.min(vh - 28, cy + bh + 18) }}>
        GO ON, THROW IT. IT&apos;S EVIDENCE NOW.
      </div>
      <button className="ev__skip">Skip ▸</button>
    </div>,
    document.body,
  );
}
