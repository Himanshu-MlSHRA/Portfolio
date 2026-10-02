import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";
import gsap from "gsap";
import Sheet from "./Sheet";
import { sfx } from "../../audio/sfx";
import type { SectionDef } from "../../data/content";
import "./pageTurn.css";

/** the leaf is drawn as this many strips, hinged to one another down its length */
const LEAVES = 8;
/** most that one strip bends against the next while the leaf is arched, in degrees */
const ARCH = 13;

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface PageTurnProps {
  section: SectionDef;
  /** the page printed on the leaf that turns */
  page: number;
  /** true: the leaf lifts off and goes over the top. false: it comes back down. */
  forward: boolean;
  /** the sheet's place inside the folder */
  left: number;
  top: number;
  width: number;
  /** scrolled back to the top as the leaf goes, so the next page is read from its start */
  scroller: RefObject<HTMLElement | null>;
  onDone: () => void;
}

/**
 * One sheet being turned over the top of its folder, the way a page of a case
 * file is flipped up and back over its fastener.
 *
 * It is taken by the bottom edge. That edge leads, the top stays lying on the
 * sheet beneath until it is pulled off, and the paper between arches — so the
 * leaf peels up from the bottom, stands in a curve, and rolls over the top.
 * A second, smaller ripple runs through it early on and dies away, which is
 * the paper's own springiness catching up with the hand.
 */
export default function PageTurn({ section, page, forward, left, top, width, scroller, onDone }: PageTurnProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const segRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLElement | null)[]>([]);
  const backRefs = useRef<(HTMLElement | null)[]>([]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const height = root?.querySelector<HTMLElement>(".sheet")?.offsetHeight;
    if (!root || !height) return;
    const strip = height / LEAVES;
    root.style.setProperty("--strip", `${strip}px`);

    const turn = { p: forward ? 0 : 1 };
    let was = turn.p;
    let at = performance.now();

    function draw() {
      const p = turn.p;
      // direction from the hinge to the bottom edge, and how arched the leaf is
      const chord = 180 * p;
      const arch = ARCH * Math.sin(Math.PI * p) + 3 * Math.sin(3 * Math.PI * p) * (1 - p);
      let before = 0;
      let drop = 0;
      let low = 0;
      for (let j = 0; j < LEAVES; j++) {
        // a strip can neither sink into the sheet beneath nor fold past flat
        const angle = clamp(chord + arch * (j - (LEAVES - 1) / 2), 0, 180);
        if (j === 0) {
          if (armRef.current) armRef.current.style.transform = `rotateX(${angle}deg)`;
          drop = top * Math.cos(rad(angle));
        } else {
          const seg = segRefs.current[j];
          if (seg) seg.style.transform = `rotateX(${angle - before}deg)`;
        }
        before = angle;
        drop += strip * Math.cos(rad(angle));
        low = angle;
        // lit from above: the steeper a strip stands, the darker its face
        const tilt = Math.sin(rad(angle));
        const shade = shadeRefs.current[j];
        if (shade) shade.style.opacity = String(0.2 * tilt);
        const back = backRefs.current[j];
        if (back) back.style.opacity = String(0.05 + 0.16 * tilt);
      }

      // the shadow the raised edge throws on the sheet beneath it
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translate3d(0,${drop - top}px,0)`;
        shadowRef.current.style.opacity = String(drop > top && low < 100 ? Math.sin(rad(Math.min(low, 90))) : 0);
      }

      // heard as it is seen: air from the swing, crackle from the flexing
      const now = performance.now();
      const speed = Math.abs(p - was) / Math.max(0.004, (now - at) / 1000);
      was = p;
      at = now;
      sfx.play("paper", speed * 0.45, speed * 0.3, 0);
    }

    draw();
    const tl = gsap.timeline({
      onComplete: () => {
        sfx.play("paper", 0, 0, 0);
        onDone();
      },
    });
    tl.to(turn, { p: forward ? 1 : 0, duration: 1.2, ease: "power2.inOut", onUpdate: draw });
    // coming back down it lands on the sheet beneath
    if (!forward) tl.call(() => sfx.play("paperLand"), undefined, "-=0.08");
    if (scroller.current && scroller.current.scrollTop > 0) {
      tl.to(scroller.current, { scrollTop: 0, duration: 0.9, ease: "power2.inOut" }, 0.1);
    }
    return () => {
      tl.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const strip = (j: number): ReactNode => (
    <div
      ref={(el) => {
        segRefs.current[j] = el;
      }}
      className="turn__seg"
      style={{ top: j ? "var(--strip)" : top }}
    >
      <div className="turn__face">
        <div className="sheet" style={{ transform: `translateY(calc(var(--strip) * ${-j}))` }}>
          <Sheet section={section} page={page} />
        </div>
        <i
          ref={(el) => {
            shadeRefs.current[j] = el;
          }}
          className="turn__shade"
        />
      </div>
      <div className="turn__back">
        <i
          ref={(el) => {
            backRefs.current[j] = el;
          }}
          className="turn__shade"
        />
      </div>
      {j < LEAVES - 1 && strip(j + 1)}
    </div>
  );

  return (
    <div ref={rootRef} className="turn" style={{ left, width }} inert>
      <div ref={shadowRef} className="turn__shadow" style={{ top }} />
      {/* hinged at the top of the folder, not of the sheet, so the leaf clears the tab on its way over */}
      <div ref={armRef} className="turn__arm">
        {strip(0)}
      </div>
    </div>
  );
}
