import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import DrawerFront from "./DrawerFront";
import FileBody from "./FileBody";
import PageTurn from "../sheet/PageTurn";
import Resume, { type ResumeHandle } from "../resume/Resume";
import { sfx } from "../../audio/sfx";
import { CONTACT_INDEX, HOME_INDEX, SECTIONS, SUBJECT } from "../../data/content";
import {
  BAR,
  cardHeight,
  clearance,
  computeGeom,
  depthScale,
  layoutFor,
  restY,
  sceneTransform,
  tabCentre,
  tabPath,
  toScreen,
  turn,
  type Geom,
} from "./geometry";
import "./cabinet.css";

/**
 * read   = the folder lies open on the desk
 * drawer = the drawer is out and the folder is held beside it
 * busy   = mid-animation
 */
type Mode = "read" | "busy" | "drawer";

const N = SECTIONS.length;

/* ---------- folders standing in the drawer (unit mass springs) ---------- */
const POS_K = 220; // sliding along the drawer
const POS_C = 22;
const TILT_K = 140; // rocking about the bottom edge
const TILT_C = 11;
const TILT_COUPLING = 40; // neighbours lean on each other
const TILT_MAX = 16;

/* ---------- the loose folder flexing ---------- */
/** it is drawn as this many strips, hinged to one another along its length */
const STRIPS = 7;
const BOW_W = 26; // first mode: the whole length bowing one way (rad/s)
const BOW_DRIVE = 0.16; // degrees/s² of hinge per px/s² the held edge is jerked
const WAVE_W = 55; // second mode: an S-shaped ripple
const WAVE_DRIVE = 0.3;
/** how far each hinge sags under the folder's own weight when held up by one edge */
const SAG = 1.5;
/** free fall, in px/s² — sets how long a folder takes to drop into its slot */
const GRAVITY = 5200;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface FolderState {
  y: number;
  v: number;
  /** tilt in degrees, + = top leans toward the back of the drawer */
  t: number;
  w: number;
  hover: number;
}

interface Motion {
  mode: Mode;
  g: Geom;
  /** drawer offset: 0 = out, g.shut = away off screen */
  dOff: number;
  /**
   * The folder that is out of the drawer. The loose folder stands in for it
   * and its own place in the drawer is drawn empty. -1 only for the instant
   * between one folder dropping in and the next being pulled.
   */
  out: number;
  /** true while the loose folder is "in hand" (drawn above the whole drawer) */
  pTop: boolean;
  /** in hand: screen position of the folder's top-centre, and how it is held */
  p: { x: number; y: number; s: number; rot: number; rx: number; rz: number; lift: number };
  /** in its slot: how far it is drawn out toward the back */
  u: number;
  /** flex of the loose folder, in degrees per hinge, with its rate of change */
  bend: { bow: number; vBow: number; wave: number; vWave: number };
  /** last frame's motion of the loose folder, to get its acceleration from */
  kin: { x: number; y: number; lift: number; u: number; v: number; pTop: boolean; frames: number };
  /** where page layout puts the loose folder; read once, not every frame */
  box: { left: number; top: number; w: number; h: number };
  loud: boolean;
  div: FolderState[];
}

function createMotion(g: Geom): Motion {
  return {
    mode: "read",
    g,
    dOff: g.shut,
    out: HOME_INDEX,
    pTop: true,
    p: { x: 0, y: 0, s: 1, rot: 0, rx: 0, rz: 0, lift: 0 },
    u: 0,
    bend: { bow: 0, vBow: 0, wave: 0, vWave: 0 },
    kin: { x: 0, y: 0, lift: 0, u: 0, v: 0, pTop: true, frames: 0 },
    box: { left: 0, top: 0, w: 0, h: 0 },
    loud: false,
    div: SECTIONS.map((_, i) => ({ y: restY(g, N, i), v: 0, t: 0, w: 0, hover: 0 })),
  };
}

const tween = (target: object, vars: gsap.TweenVars) =>
  new Promise<void>((resolve) => {
    gsap.to(target, { ...vars, onComplete: () => resolve() });
  });

const wait = (seconds: number) => tween({}, { duration: seconds });

/** Places a folder's box: pinned by its bottom edge, rocking and scaling about it. */
function cardTransform(g: Geom, d: FolderState, dOff: number) {
  return (
    `${sceneTransform(g)} translate3d(${g.cx}px,${g.bottom + dOff}px,0) rotateX(${d.t}deg) ` +
    `scale(${depthScale(g, d.y)}) translate(${-g.wd / 2}px,${-cardHeight(g, d.y)}px)`
  );
}

export default function Cabinet({ active }: { active: boolean }) {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const layout = layoutFor(size.w, size.h);
  const [mode, setModeState] = useState<Mode>("read");
  const [current, setCurrent] = useState(HOME_INDEX);
  const [muted, setMuted] = useState(sfx.muted);
  // which sheet of the open folder is showing, and the one being turned if any
  const [page, setPage] = useState(0);
  const [turning, setTurning] = useState<{ from: number; to: number } | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const geo = computeGeom(size.w, size.h, N, layout);
  // mutable animation state, deliberately kept out of React's render cycle
  const motionRef = useRef<Motion | null>(null);
  motionRef.current ??= createMotion(geo);
  const m = motionRef.current;

  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<SVGSVGElement>(null);
  const wallsRef = useRef<SVGSVGElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const divRefs = useRef<(HTMLDivElement | null)[]>([]);
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLElement | null)[]>([]);
  const hoverRef = useRef({ index: -1, left: 0 });
  const resumeRef = useRef<ResumeHandle>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);

  function setMode(next: Mode) {
    m.mode = next;
    setModeState(next);
  }

  /* ---------- drawing ---------- */

  /*
   * Everything below only ever writes transforms and opacity, which the
   * browser can apply without laying out or repainting anything — that is
   * what keeps the animation at the display's full refresh rate.
   */

  /** Reads where page layout puts the loose folder. Called when that can have changed. */
  function measure() {
    const file = fileRef.current;
    const shadow = shadowRef.current;
    if (!file || !shadow) return;
    m.box = { left: file.offsetLeft, top: file.offsetTop, w: file.offsetWidth, h: file.offsetHeight };
    file.style.setProperty("--hb", `${m.box.h / STRIPS}px`);
    Object.assign(shadow.style, {
      left: `${m.box.left}px`,
      top: `${m.box.top}px`,
      width: `${m.box.w}px`,
      height: `${m.box.h}px`,
    });
  }

  /** The flex: every strip is hinged to the one before it. */
  function drawFlex() {
    const b = m.bend;
    let total = 0;
    for (let i = 1; i < STRIPS; i++) {
      const angle = b.bow + b.wave * Math.cos((Math.PI * (i - 1)) / (STRIPS - 2));
      total += angle;
      const seg = segRefs.current[i];
      if (seg) seg.style.transform = `rotateX(${angle}deg)`;
      // the further a strip is turned from the light the darker it goes
      const shade = shadeRefs.current[i];
      if (shade) shade.style.opacity = String(Math.min(0.14, Math.abs(total) * 0.006));
    }
  }

  function draw() {
    const g = m.g;
    const scene = sceneTransform(g);

    divRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.transform = cardTransform(g, m.div[i], m.dOff);
      el.style.visibility = m.out === i ? "hidden" : "";
    });

    const left = g.cx - g.DW / 2;
    const wallTop = -(g.layout === "horizontal" ? g.W : g.H);
    if (wallsRef.current) {
      wallsRef.current.style.transform = `${scene} translate3d(${left}px,${wallTop + m.dOff}px,0)`;
    }
    if (panelRef.current) {
      panelRef.current.style.transform = `${scene} translate3d(${left}px,${g.panelTop + m.dOff}px,0)`;
    }
    if (captionRef.current) captionRef.current.style.opacity = String(1 - m.dOff / g.shut);

    const wrap = wrapRef.current;
    const file = fileRef.current;
    const shadow = shadowRef.current;
    if (!wrap || !file || !shadow) return;

    if (m.mode === "read") {
      wrap.style.zIndex = "";
      wrap.style.clipPath = "";
      file.style.transform = "";
      file.style.transformOrigin = "";
      file.style.visibility = "";
      shadow.style.opacity = "0";
      return;
    }

    file.style.visibility = m.out < 0 ? "hidden" : "";
    if (m.out < 0) return;
    drawFlex();

    const p = m.p;
    const box = m.box;
    if (m.pTop) {
      const dx = p.x - box.left - box.w / 2;
      const dy = p.y - box.top;
      const pose = `rotate(${p.rot}deg) scale(${p.s})`;
      wrap.style.zIndex = "";
      wrap.style.clipPath = "";
      file.style.transformOrigin = "50% 0";
      file.style.transform = `translate3d(${dx}px,${dy}px,0) ${pose} rotateX(${p.rx}deg) rotateZ(${p.rz}deg)`;
      // the higher it is held, the further its shadow falls from it
      shadow.style.transform = `translate3d(${dx + p.lift * 22}px,${dy + p.lift * 30}px,0) ${pose}`;
      shadow.style.opacity = String(p.lift * 0.26);
    } else {
      // standing in its slot: exactly where that folder is drawn when it is
      // filed, leaning as it leans, just pulled out by `u`
      const d = m.div[m.out];
      const edge = g.panelTop + g.panelH / 2;
      wrap.style.zIndex = String(10 + 3 * m.out);
      // cut off under the front panel, as the filed folders are (the drawer is
      // standing still whenever a folder is in its slot, so this never changes)
      wrap.style.clipPath =
        g.layout === "horizontal"
          ? `inset(0 ${Math.max(0, g.W - edge)}px 0 0)`
          : `inset(0 0 ${Math.max(0, g.H - edge)}px 0)`;
      file.style.transformOrigin = "0 0";
      file.style.transform =
        `translate3d(${-box.left}px,${-box.top}px,0) ${cardTransform(g, d, m.dOff)} ` +
        `translate3d(0,${-m.u / depthScale(g, d.y)}px,0) scale(${g.ss})`;
      shadow.style.opacity = "0";
    }
  }

  /* ---------- physics ---------- */

  function tick(_time: number, deltaMs: number) {
    if (m.mode === "read") return;
    const g = m.g;
    const k = m.out;
    const p = m.p;
    const frame = Math.min(deltaMs / 1000, 1 / 30) || 1 / 60;

    // how the loose folder moved this frame, along its own length
    const kin = m.kin;
    if (kin.pTop !== m.pTop) kin.frames = 0;
    const slide = (m.u - kin.u) / frame;
    const speed = Math.hypot(p.x - kin.x, p.y - kin.y) / frame;
    let v = 0;
    if (m.pTop) {
      const r = (p.rot * Math.PI) / 180;
      v = (-(p.x - kin.x) * Math.sin(r) + (p.y - kin.y) * Math.cos(r)) / p.s;
      // being raised or lowered jerks it just the same
      v = (v + (p.lift - kin.lift) * 260) / frame;
    } else {
      v = -slide / g.ss;
    }
    const acc = kin.frames > 1 ? clamp((v - kin.v) / frame, -9000, 9000) : 0;
    Object.assign(kin, { x: p.x, y: p.y, lift: p.lift, u: m.u, v, pTop: m.pTop });
    kin.frames++;
    const inSlot = k >= 0 && !m.pTop;
    // + = travelling toward the drawer floor
    const paperV = inSlot && kin.frames > 1 ? -slide : 0;

    const SUB = 3;
    const dt = frame / SUB;
    const b = m.bend;
    // held up by one edge it sags; lying on the desk the desk holds it flat
    const sag = m.pTop ? -SAG * p.lift : 0;
    const damp = m.pTop && p.lift < 0.3 ? 0.9 : 0.2;
    for (let n = 0; n < SUB; n++) {
      for (let i = 0; i < N; i++) {
        const d = m.div[i];
        const target = restY(g, N, i) - d.hover * g.step * 0.45;
        d.v += (-POS_K * (d.y - target) - POS_C * d.v) * dt;
        d.y += d.v * dt;

        // a tall card is harder to rock than a short one
        const lever = Math.min(1, Math.max(0.3, 160 / Math.max(1, g.bottom - d.y)));
        const left = m.div[i - 1]?.t ?? d.t;
        const right = m.div[i + 1]?.t ?? d.t;
        let a =
          -TILT_K * d.t -
          TILT_C * d.w +
          TILT_COUPLING * (left + right - 2 * d.t) +
          // inertia: the top edge trails behind when the card is shoved along
          d.v * 0.35 * lever;
        if (inSlot && i !== k) {
          // friction from the folder sliding past: wedges neighbours apart on
          // the way in, drags them together on the way out
          const behind = i < k;
          const dist = Math.abs(i - k) - 1;
          if (dist < 3) a += (behind ? 1 : -1) * paperV * 0.45 * lever * 0.5 ** dist;
        }
        d.w += a * dt;
        d.t = clamp(d.t + d.w * dt, -TILT_MAX, TILT_MAX);
      }

      // the loose folder: two damped modes, shaken by whatever its held edge does
      b.vBow += (-BOW_W * BOW_W * (b.bow - sag) - 2 * damp * BOW_W * b.vBow + BOW_DRIVE * acc) * dt;
      b.bow = clamp(b.bow + b.vBow * dt, -3.5, 3.5);
      b.vWave += (-WAVE_W * WAVE_W * b.wave - 2 * (damp + 0.1) * WAVE_W * b.vWave - WAVE_DRIVE * acc) * dt;
      b.wave = clamp(b.wave + b.vWave * dt, -2.5, 2.5);
    }

    // folders crackle for as long as they are still moving against each other
    let energy = 0;
    for (const d of m.div) energy += Math.abs(d.v) / 900 + Math.abs(d.w) / 90;
    if (energy > 0.12 && Math.abs(m.dOff) < Math.abs(g.shut) * 0.9) sfx.play("rustle", energy, frame);

    // and the loose one is heard doing exactly what it is seen doing
    const air = k >= 0 && m.pTop ? speed / 2200 : 0;
    const crinkle = k >= 0 ? (Math.abs(b.vBow) + Math.abs(b.vWave)) / 45 : 0;
    const friction = inSlot ? Math.abs(slide) / 1400 : 0;
    const loud = air + crinkle + friction > 0.01;
    if (loud || m.loud) sfx.play("paper", air, crinkle, friction);
    m.loud = loud;

    draw();
  }

  /** A folder hits the drawer floor: its neighbours get knocked apart. */
  function impact(k: number) {
    m.div.forEach((d, i) => {
      if (i === k) return;
      const behind = i < k;
      const fall = 0.55 ** (Math.abs(i - k) - 1);
      d.w += (behind ? 1 : -1) * 70 * fall;
      d.v += (behind ? -1 : 1) * 140 * fall;
    });
  }

  /** The drawer stops dead; everything in it keeps going for a moment. */
  function rattle() {
    const way = Math.sign(m.g.shut);
    m.div.forEach((d, i) => {
      d.w += way * (35 + ((i * 37) % 5) * 9);
    });
  }

  /* ---------- poses of the loose folder ---------- */

  /** Lying on the desk, where the page layout puts it. */
  function deskPose() {
    return { x: m.box.left + m.box.w / 2, y: m.box.top, rot: 0 };
  }

  /**
   * Held upright over the desk's half of the screen, filling it side to side.
   * A long folder runs off the bottom edge, just as it does when it is read.
   */
  function handPose() {
    const g = m.g;
    const s = clamp((g.W - g.deskLeft - 32) / m.box.w, 0.3, 1);
    // centred in the desk's half, but never hanging off the right edge
    const x = Math.min((g.deskLeft + g.W) / 2, g.W - 8 - (m.box.w * s) / 2);
    return { x, y: BAR + 14, s, rot: 0 };
  }

  /** Turned to face the way the drawer does and drawn clear of slot `k`. */
  function hoverPose(k: number) {
    const g = m.g;
    const y = restY(g, N, k);
    const f = depthScale(g, y);
    const u = clearance(g, N, k, m.box.h);
    return { u, ...toScreen(g, g.cx, y - g.th * f - u), s: g.ss * f, rot: turn(g) };
  }

  /* ---------- transitions ---------- */

  /** read -> drawer: pick the folder up and roll the drawer out. Nothing is filed. */
  async function browse() {
    const wrap = wrapRef.current;
    if (m.mode !== "read" || !wrap || turning) return;
    setMode("busy");

    if (wrap.scrollTop > 0) {
      const scroll = { y: wrap.scrollTop };
      await tween(scroll, {
        y: 0,
        duration: Math.min(0.45, 0.15 + scroll.y / 3000),
        ease: "power2.inOut",
        onUpdate: () => {
          wrap.scrollTop = scroll.y;
        },
      });
    }

    measure();
    const p = m.p;
    Object.assign(p, deskPose(), { s: 1, rx: 0, rz: 0, lift: 0 });
    Object.assign(m.bend, { bow: 0, vBow: 0, wave: 0, vWave: 0 });
    m.pTop = true;
    m.kin.frames = 0;

    // picked up off the desk by its top edge
    await tween(p, { s: 1.04, lift: 1, rx: -3, duration: 0.3, ease: "power2.out" });

    // the drawer rolls out while the folder is held out of its way
    sfx.play("drawerSlide", 0.9, true);
    void tween(p, { ...handPose(), rx: 0, lift: 0.8, duration: 0.8, ease: "power2.inOut" });
    await tween(m, { dOff: 0, duration: 0.9, ease: "power3.out" });
    rattle();
    sfx.play("drawerStop");
    await wait(0.1);

    setMode("drawer");
  }

  /** The drawer rolls shut and the folder in hand is laid on the desk. */
  async function toDesk() {
    const p = m.p;
    sfx.play("drawerSlide", 0.6, false);
    gsap.to(m, {
      dOff: m.g.shut,
      duration: 0.6,
      ease: "power2.in",
      onComplete: () => sfx.play("drawerStop", 0.45),
    });
    await tween(p, {
      ...deskPose(),
      s: 1.04,
      rx: -3,
      rz: 0,
      lift: 1,
      duration: 0.74,
      ease: "power2.inOut",
    });
    // lowered: the air under it gives way last, so it eases down rather than drops
    await tween(p, { s: 1, rx: 0, lift: 0, duration: 0.34, ease: "power2.out" });
    sfx.play("paperLand");
    await wait(0.12);

    Object.assign(m.bend, { bow: 0, vBow: 0, wave: 0, vWave: 0 });
    drawFlex();
    sfx.play("paper", 0, 0, 0);
    m.loud = false;
    setMode("read");
    draw();
  }

  /** drawer -> read, same folder: nothing was chosen. */
  async function close() {
    if (m.mode !== "drawer") return;
    setMode("busy");
    await toDesk();
  }

  /** drawer -> read, another folder: the one in hand goes back, `j` comes out. */
  async function swap(j: number) {
    if (m.mode !== "drawer" || j === m.out) return;
    setMode("busy");
    const p = m.p;
    const k = m.out;

    // carried over its own slot, turning to line up with the drawer
    const back = hoverPose(k);
    await tween(p, { x: back.x, y: back.y, s: back.s, rot: back.rot, rz: 0, lift: 0.5, duration: 0.7, ease: "power2.inOut" });

    // let go: it falls under gravity, takes one small bounce off the drawer
    // floor, and buckles as it lands
    m.u = back.u;
    m.pTop = false;
    const fall = Math.sqrt((2 * back.u) / GRAVITY);
    gsap.to(p, { lift: 0, duration: fall });
    await tween(m, { u: 0, duration: fall, ease: "power2.in" });
    impact(k);
    sfx.play("thud");
    await tween(m, { u: 12, duration: 0.09, ease: "power1.out" });
    await tween(m, { u: 0, duration: 0.11, ease: "power1.in" });

    // filed: from here it is just one more folder in the row
    m.out = -1;
    await wait(0.16);

    // take hold of the other one and pull: thrown clear, slowing as it goes
    flushSync(() => {
      setCurrent(j);
      setPage(0);
    });
    measure();
    const pull = hoverPose(j);
    m.u = 0;
    m.kin.frames = 0;
    Object.assign(m.bend, { bow: 0, vBow: 0, wave: 0, vWave: 0 });
    m.out = j;
    draw();
    gsap.to(p, { lift: 0.5, duration: 0.5 });
    await tween(m, { u: pull.u, duration: 0.5, ease: "power3.out" });

    // in hand now: turns upright as the drawer rolls shut, then goes down on the desk
    Object.assign(p, { x: pull.x, y: pull.y, s: pull.s, rot: pull.rot, rx: 0, rz: 0 });
    m.pTop = true;
    await toDesk();
  }

  /**
   * Turns the open folder to another of its sheets. Going forward the new
   * page is already lying underneath as the old one lifts away; going back the
   * old page is brought down on top and only then becomes the one in the folder.
   */
  function turnTo(to: number) {
    if (m.mode !== "read" || turning || to === page) return;
    sfx.play("select");
    setTurning({ from: page, to });
    if (to > page) setPage(to);
  }

  function turned() {
    if (turning) setPage(turning.to);
    setTurning(null);
  }

  /** Brings folder `j` out onto the desk, from wherever things stand. */
  async function bring(j: number) {
    if (m.mode === "read") {
      if (m.out === j) return;
      await browse();
      await wait(0.15);
    }
    if (m.mode !== "drawer") return;
    if (m.out === j) await close();
    else await swap(j);
  }

  function toggle() {
    if (resumeRef.current) return;
    if (m.mode === "read") void browse();
    else if (m.mode === "drawer") void close();
  }

  function choose(i: number) {
    if (m.mode !== "drawer") return;
    sfx.play("select");
    void swap(i);
  }

  function onFileClick(e: MouseEvent) {
    if (m.mode !== "drawer") return;
    e.preventDefault();
    e.stopPropagation();
    void close();
  }

  /* ---------- the résumé ---------- */

  /** The sheet goes back into its button; resolves once it is gone. */
  async function closeResume() {
    await resumeRef.current?.close();
    setResumeOpen(false);
  }

  function toggleResume() {
    if (m.mode === "busy" || turning) return;
    sfx.play("select");
    if (resumeOpen) void closeResume();
    else {
      sfx.play("paperSwish", 0.5);
      setResumeOpen(true);
    }
  }

  /** The résumé is put away, then the drawer rolls out and the contact folder is fetched. */
  async function resumeToContact() {
    sfx.play("select");
    await closeResume();
    await bring(CONTACT_INDEX);
  }

  /* ---------- wiring ---------- */

  // keep the scene in step with the viewport and the chosen layout
  useLayoutEffect(() => {
    m.g = geo;
    m.div.forEach((d, i) => Object.assign(d, { y: restY(geo, N, i), v: 0, t: 0, w: 0 }));
    if (m.mode === "read") m.dOff = geo.shut;
    measure();
    if (m.mode === "drawer") {
      m.dOff = 0;
      Object.assign(m.p, handPose());
    }
    draw();
  }, [size, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const onKey = (e: KeyboardEvent) => {
      // typing in the contact form is not a shortcut
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (resumeRef.current) {
        if (e.key === "Escape") void closeResume();
      } else if (e.key === "Escape" || e.key.toLowerCase() === "m") toggle();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      gsap.ticker.remove(tick);
      gsap.killTweensOf([m, m.p]);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // a sheet can change height while it lies on the desk (the contact form
  // becoming a filed note): the strips it bends with are cut again to match
  useEffect(() => {
    const file = fileRef.current;
    if (!file) return;
    const watch = new ResizeObserver(() => {
      if (m.mode === "read") measure();
    });
    watch.observe(file);
    return () => watch.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // the first folder slides onto the desk once the intro has finished
  useEffect(() => {
    if (!active || !fileRef.current) return;
    sfx.play("paperSwish", 0.6);
    const landing = gsap.delayedCall(0.5, () => sfx.play("paperLand"));
    gsap.fromTo(
      fileRef.current,
      { y: 70, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", clearProps: "transform,opacity" },
    );
    return () => {
      landing.kill();
    };
  }, [active]);

  function toggleSound() {
    sfx.setMuted(!muted);
    setMuted(!muted);
    sfx.play("select");
  }

  /* ---------- markup ---------- */

  const { W, H, DW, wd, th, panelTop } = geo;
  const horizontal = layout === "horizontal";
  const fileW = wd / geo.ss;

  // drawer sides: they run back into the cabinet past the edge of the screen,
  // and splay slightly toward the front
  const wallTop = -(horizontal ? W : H);
  const wallH = panelTop - wallTop;
  const wallKnee = geo.yBack - wallTop;
  const backX = wd * 0.47 + 7;
  const frontX = wd * 0.5 + 9;

  // A folder is cut off a fixed distance down its own length, which lands
  // halfway under the front panel. It can then be knocked about by half the
  // panel's depth either way and its cut end still never shows.
  const cardH = (i: number) => {
    const y = restY(geo, N, i);
    return cardHeight(geo, y) + (geo.panelH / 2 - 30) / depthScale(geo, y);
  };

  const section = SECTIONS[current];

  const strip = (i: number): ReactNode => (
    <div
      ref={(el) => {
        segRefs.current[i] = el;
      }}
      className="file__seg"
      style={{ top: i ? "var(--hb)" : 0 }}
    >
      <div className="file__win">
        <div style={{ transform: `translateY(calc(var(--hb) * ${-i}))` }}>
          <FileBody g={geo} index={current} on page={page} />
        </div>
        <i
          ref={(el) => {
            shadeRefs.current[i] = el;
          }}
          className="file__shade"
        />
      </div>
      {i < STRIPS - 1 && strip(i + 1)}
    </div>
  );

  return (
    <div className={`cab cab--${mode} cab--${layout}${resumeOpen ? " cab--resume" : ""}`}>
      <header className="cab__bar">
        <span className="cab__bar-id">
          H.M
          <span>
            {" "}
            <i>—</i> FILE NO. {SUBJECT.fileNo}
          </span>
        </span>
        <span className="cab__bar-now">
          {section.no} / {section.label}
        </span>
        <span className="cab__bar-end">
          <button
            className="cab__snd"
            onClick={toggleSound}
            aria-pressed={!muted}
            aria-label={muted ? "Turn sound on" : "Turn sound off"}
          >
            <svg viewBox="0 0 22 18" aria-hidden="true">
              <path d="M2,6.5 H6 L11,2.5 V15.5 L6,11.5 H2 Z" />
              {muted ? <path d="M14.5,6 L20,12 M20,6 L14.5,12" /> : <path d="M14,6 Q16.5,9 14,12 M16.5,3.5 Q21,9 16.5,14.5" />}
            </svg>
          </button>
          <button
            ref={resumeBtnRef}
            className="cab__btn cab__res"
            onClick={toggleResume}
            aria-haspopup="dialog"
            aria-expanded={resumeOpen}
          >
            <svg viewBox="0 0 22 22" aria-hidden="true">
              <path d="M4,1.5 H13 L18,6.5 V20.5 H4 Z" />
              <path d="M13,1.5 V6.5 H18 M7.5,10.5 H14.5 M7.5,13.5 H14.5 M7.5,16.5 H12" />
            </svg>
            {resumeOpen ? "Close" : "Resume"}
          </button>
          <button className="cab__btn cab__menu" onClick={toggle} aria-label="Toggle file drawer">
            <svg viewBox="0 0 30 22" aria-hidden="true">
              <path d="M5,1 H25 M3.5,4 H26.5 M2,7 H28" />
              <path d="M1,10 H29 L26.5,21 H3.5 Z" />
              <path d="M11.5,16.5 Q11.5,14 14,14 H16 Q18.5,14 18.5,16.5 Z" />
            </svg>
            {mode === "read" ? "Index" : "Close"}
          </button>
        </span>
      </header>

      {/* drawer sides */}
      <svg
        ref={wallsRef}
        className="cab__static cab__walls"
        style={{ width: DW, height: wallH }}
        viewBox={`0 0 ${DW} ${wallH}`}
      >
        <polyline points={`${DW / 2 - backX},0 ${DW / 2 - backX},${wallKnee} ${DW / 2 - frontX},${wallH}`} />
        <polyline points={`${DW / 2 + backX},0 ${DW / 2 + backX},${wallKnee} ${DW / 2 + frontX},${wallH}`} />
      </svg>

      {/* the folders, back to front. All of a folder that shows is a button. */}
      {SECTIONS.map((sec, i) => {
        const tp = tabPath(wd, th, geo.r, wd * tabCentre(i), wd * 0.2);
        const hits = {
          onClick: () => choose(i),
          onPointerEnter: () => {
            m.div[i].hover = 1;
            // once per folder: its tab and its body are separate targets, and
            // the folder shifting under the pointer must not retrigger it
            const h = hoverRef.current;
            const fresh = h.index !== i || performance.now() - h.left > 350;
            h.index = i;
            if (fresh && m.mode === "drawer") sfx.play("hover");
          },
          onPointerLeave: () => {
            m.div[i].hover = 0;
            hoverRef.current.left = performance.now();
          },
        };
        return (
          <div
            key={sec.id}
            ref={(el) => {
              divRefs.current[i] = el;
            }}
            className="cab__card"
            style={{ width: wd, height: cardH(i), zIndex: 10 + 3 * i }}
          >
            <button
              className="cab__hit"
              style={{ left: tp.a + th * 0.3, width: tp.b - tp.a - th * 0.6, height: th }}
              tabIndex={mode === "drawer" ? 0 : -1}
              aria-label={`Open ${sec.label}`}
              {...hits}
            />
            <div className="cab__hit" style={{ top: th, bottom: 0, left: 0, right: 0 }} {...hits} />
            <div className="cab__filed" style={{ transform: `scale(${geo.ss})` }} inert>
              <FileBody g={geo} index={i} on={false} />
            </div>
          </div>
        );
      })}

      {/* the loose folder: the one on the desk, in hand, or on its way in or out */}
      <div ref={wrapRef} className="cab__wrap">
        <div ref={shadowRef} className="cab__shadow" />
        <div
          ref={fileRef}
          className="file"
          style={{ width: fileW, marginLeft: `calc(50% - ${fileW / 2}px)` }}
          onClickCapture={onFileClick}
        >
          <div className="file__flat">
            <FileBody g={geo} index={current} on page={page} onTurn={turnTo} />
          </div>
          {/* the same folder cut into hinged strips, which is what shows whenever it is off the desk */}
          <div className="file__flex" inert>
            {strip(0)}
          </div>
          {turning && (
            <PageTurn
              section={section}
              page={Math.min(turning.from, turning.to)}
              forward={turning.to > turning.from}
              left={geo.sx / geo.ss}
              top={geo.sy / geo.ss}
              width={geo.sheetW}
              scroller={wrapRef}
              onDone={turned}
            />
          )}
        </div>
      </div>

      <DrawerFront ref={panelRef} g={geo} />

      {resumeOpen && (
        <Resume ref={resumeRef} anchor={resumeBtnRef} onClose={closeResume} onContact={resumeToContact} />
      )}

      <p ref={captionRef} className="cab__caption" style={{ maxWidth: geo.deskLeft - 44 }}>
        {N} files in this drawer. Select a folder to swap it for the one that is out. M or Esc
        closes the drawer.
      </p>
    </div>
  );
}
