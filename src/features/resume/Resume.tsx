import { useEffect, useImperativeHandle, useRef, type MouseEvent, type Ref, type RefObject } from "react";
import gsap from "gsap";
import { sfx } from "../../audio/sfx";
import { RESUME } from "../../data/content";
import { BAR } from "../cabinet/geometry";
import "./resume.css";

/** seconds for the sheet to come all the way out of its button, or go all the way back */
const DURATION = 0.62;
/** the sheet is redrawn in rows this tall, each squeezed by a different amount */
const SLICE = 2;
/** the black backing sheet: how far it shows past the paper (matches the CSS) */
const BACK_X = 10;
const BACK_Y = 12;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** What the animation is drawn from: the sheet as it shows on screen, and the button it belongs to. */
interface Shot {
  /** the visible part of the sheet, drawn once at screen resolution */
  img: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
  /** the mouth of the funnel: the bottom edge of the button */
  tx: number;
  ty: number;
  tw: number;
  /** device pixels per CSS pixel */
  k: number;
  ink: string;
}

export interface ResumeHandle {
  /** Sends the sheet back into its button. Resolves once it is gone. */
  close: () => Promise<void>;
}

interface ResumeProps {
  /** the button the sheet comes out of and goes back into */
  anchor: RefObject<HTMLElement | null>;
  ref: Ref<ResumeHandle>;
  onClose: () => void;
  onContact: () => void;
}

/**
 * The résumé, laid over everything. It opens and closes the way a window
 * leaves and returns to the macOS Dock: the edge nearest the button is pinched
 * down to the button's width, and the sheet is then drawn through that funnel.
 *
 * A warp like that cannot be done by moving layers, so for as long as it lasts
 * the real sheet is hidden and a picture of it is redrawn on a canvas, one thin
 * row at a time.
 */
export default function Resume({ anchor, ref, onClose, onContact }: ResumeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** t: 0 = inside the button, 1 = lying open */
  const anim = useRef<{ t: number; shot: Shot | null; closing: Promise<void> | null }>({
    t: 0,
    shot: null,
    closing: null,
  });

  /** Takes the picture the animation is drawn from, and sizes the canvas to the screen. */
  function snapshot(): Shot | null {
    const paper = paperRef.current;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const button = anchor.current;
    if (!paper || !img || !canvas || !button) return null;

    const k = Math.min(window.devicePixelRatio || 1, 2);
    const r = paper.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    // only what shows: the sheet scrolls away under the top bar and off the bottom
    const top = Math.max(r.top, BAR);
    const bottom = Math.min(r.bottom, window.innerHeight);
    if (bottom <= top) return null;

    const style = getComputedStyle(paper);
    const ink = style.borderTopColor;
    const shot = document.createElement("canvas");
    shot.width = Math.round(r.width * k);
    shot.height = Math.round((bottom - top) * k);
    const g = shot.getContext("2d");
    if (!g) return null;
    g.scale(k, k);
    g.fillStyle = style.backgroundColor;
    g.fillRect(0, 0, r.width, bottom - top);
    if (img.complete && img.naturalWidth) {
      const ir = img.getBoundingClientRect();
      g.imageSmoothingQuality = "high";
      g.drawImage(img, ir.left - r.left, ir.top - top, ir.width, ir.height);
    }
    g.strokeStyle = ink;
    g.lineWidth = 1.5;
    g.strokeRect(0.75, r.top - top + 0.75, r.width - 1.5, r.height - 1.5);

    canvas.width = Math.round(window.innerWidth * k);
    canvas.height = Math.round(window.innerHeight * k);
    return {
      img: shot,
      x: r.left,
      y: top,
      w: r.width,
      h: bottom - top,
      tx: b.left + 5,
      ty: b.bottom - 3,
      tw: b.width - 10,
      k,
      ink,
    };
  }

  function draw() {
    const { t, shot: s } = anim.current;
    const canvas = canvasRef.current;
    if (veilRef.current) veilRef.current.style.opacity = String(0.55 * clamp01(t * 1.5));
    if (actionsRef.current) actionsRef.current.style.opacity = String(clamp01((t - 0.7) / 0.3));
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !s) return;

    const away = 1 - t;
    // first the near edge is pinched in to the button...
    const pinch = (1 - Math.cos(Math.PI * clamp01(away / 0.45))) / 2;
    // ...then the sheet is drawn up through the funnel that leaves, gathering speed
    const span = s.y + s.h - s.ty;
    const slide = clamp01((away - 0.12) / 0.88) ** 2 * span;
    // how far a row at screen height `y` is squeezed: all the way at the
    // button, not at all at the far edge, along an S-curve in between
    const squeeze = (y: number) => (pinch * (1 + Math.cos(Math.PI * clamp01((y - s.ty) / span)))) / 2;

    ctx.setTransform(s.k, 0, 0, s.k, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const from = Math.max(s.ty, s.y - slide);
    const to = s.y + s.h - slide;

    // the backing sheet, then the paper over it
    ctx.fillStyle = s.ink;
    for (let y = from; y < to; y += SLICE) {
      const e = squeeze(y + BACK_Y);
      const w = s.w + (s.tw - s.w) * e;
      ctx.fillRect(s.x + (s.tx - s.x) * e + (BACK_X * w) / s.w, y + BACK_Y, w, SLICE + 0.5);
    }
    for (let y = from; y < to; y += SLICE) {
      const e = squeeze(y);
      ctx.drawImage(
        s.img,
        0,
        (y + slide - s.y) * s.k,
        s.img.width,
        SLICE * s.k,
        s.x + (s.tx - s.x) * e,
        y,
        s.w + (s.tw - s.w) * e,
        // a hair of overlap hides the seam between rows
        SLICE + 0.5,
      );
    }
  }

  /** Animates to fully open (1) or fully put away (0), from wherever it is now. */
  function run(to: number) {
    const a = anim.current;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    gsap.killTweensOf(a);
    // the real sheet stands aside for its picture
    root?.removeAttribute("data-open");
    a.shot = snapshot();
    return new Promise<void>((resolve) => {
      gsap.to(a, {
        t: to,
        duration: DURATION * Math.abs(to - a.t),
        ease: "none",
        onUpdate: draw,
        onComplete: () => {
          draw();
          if (to === 1) root?.setAttribute("data-open", "");
          // nothing left to show: let go of the canvas's memory
          a.shot = null;
          if (canvas) canvas.width = canvas.height = 0;
          resolve();
        },
      });
    });
  }

  useImperativeHandle(
    ref,
    () => ({
      close() {
        const a = anim.current;
        if (!a.closing) {
          sfx.play("paperSwish", 0.45);
          a.closing = run(0);
        }
        return a.closing;
      },
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // comes out of the button as soon as there is a page to show
  useEffect(() => {
    const a = anim.current;
    const img = imgRef.current;
    let live = true;
    const open = () => {
      if (!live || a.closing) return;
      void run(1).then(() => rootRef.current?.focus({ preventScroll: true }));
    };
    if (!img || img.complete) open();
    else img.decode().then(open, open);
    return () => {
      live = false;
      gsap.killTweensOf(a);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // anywhere that is not the sheet puts it away
  function onBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <>
      <div ref={rootRef} className="resume" role="dialog" aria-modal="true" aria-label="Résumé" tabIndex={-1}>
        <div ref={veilRef} className="resume__veil" />
        <div className="resume__scroll" onClick={onBackdrop}>
          <div ref={paperRef} className="resume__paper">
            <img
              ref={imgRef}
              src={RESUME.page}
              width={RESUME.width}
              height={RESUME.height}
              alt="Résumé of Himanshu Mishra. The download button below gives the PDF, with its text and links."
            />
          </div>
        </div>
        <div ref={actionsRef} className="resume__actions">
          <a className="cab__btn" href={RESUME.pdf} download={RESUME.filename} onClick={() => sfx.play("select")}>
            <svg viewBox="0 0 22 22" aria-hidden="true">
              <path d="M11,2.5 V14 M6,9.5 L11,14.5 L16,9.5 M3,15.5 V19.5 H19 V15.5" />
            </svg>
            Download
          </a>
          <button className="cab__btn" onClick={onContact}>
            <svg viewBox="0 0 22 22" aria-hidden="true">
              <path d="M2,4.5 H20 V17.5 H2 Z M2,4.5 L11,12 L20,4.5" />
            </svg>
            Contact
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="resume__genie" aria-hidden="true" />
    </>
  );
}
