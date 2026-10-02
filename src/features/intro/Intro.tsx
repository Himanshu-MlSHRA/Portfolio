import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { sfx } from "../../audio/sfx";
import "./intro.css";

interface IntroProps {
  onComplete: () => void;
}

/** seconds of black screen before the film starts */
const BLANK = 2.5;
/** seconds of black screen after it, while the film's own sound dies away */
const TAIL = 5;

function randomClip() {
  const top = gsap.utils.random(0, 38, 1);
  const bottom = gsap.utils.random(0, 38, 1);
  return `inset(${top}% 0% ${bottom}% 0%)`;
}

export default function Intro({ onComplete }: IntroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLImageElement>(null);
  const tintRRef = useRef<HTMLImageElement>(null);
  const tintBRef = useRef<HTMLImageElement>(null);
  const staticRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const blackoutRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [skippable, setSkippable] = useState(false);
  // browsers hold sound back until the visitor clicks or presses a key, so
  // the film waits behind a title card unless audio is already allowed
  const [phase, setPhase] = useState<"check" | "gate" | "play">(sfx.muted ? "play" : "check");
  const doneRef = useRef(false);

  useEffect(() => {
    if (phase !== "check") return;
    let live = true;
    void sfx.ready().then((ok) => {
      if (live) setPhase(ok ? "play" : "gate");
    });
    return () => {
      live = false;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "gate") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") begin(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useEffect(() => {
    if (phase !== "play") return;
    // a few seconds of nothing, then the film and the voice start together
    let stopBed: (() => void) | undefined;
    let stopVoice: (() => void) | undefined;
    let film: ReturnType<typeof sfx.film>;
    const start = gsap.delayedCall(BLANK, () => {
      const video = videoRef.current;
      if (video) {
        film = sfx.film(video, 3);
        video.muted = !film;
        video.play().catch(() => {});
      }
      stopBed = sfx.play("introBed", 7);
      stopVoice = sfx.sample("introVoice", 2.4, true);
    });

    const skipTimer = setTimeout(() => setSkippable(true), 700);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish, delay: BLANK });

      gsap.set(frameWrapRef.current, { x: 0, y: 0, clipPath: "none" });
      gsap.set([frameRef.current, tintRRef.current, tintBRef.current], {
        opacity: 1,
      });
      gsap.set(titleRef.current, { opacity: 0, y: 14 });

      function burst(steps: number, xRange: number, yRange: number) {
        for (let i = 0; i < steps; i++) {
          const dur = gsap.utils.random(0.025, 0.075);
          const pos = i === 0 ? undefined : "<";
          tl.call(() => sfx.play("glitch", dur + 0.03, xRange / 22), undefined, pos ?? ">");
          tl.to(
            frameWrapRef.current,
            {
              x: gsap.utils.random(-xRange, xRange),
              y: gsap.utils.random(-yRange, yRange),
              clipPath: Math.random() > 0.4 ? randomClip() : "none",
              duration: dur,
              ease: "steps(1)",
            },
            pos,
          );
          tl.to(
            tintRRef.current,
            { x: gsap.utils.random(-xRange * 1.4, xRange * 1.4), duration: dur, ease: "steps(1)" },
            "<",
          );
          tl.to(
            tintBRef.current,
            { x: gsap.utils.random(-xRange * 1.4, xRange * 1.4), duration: dur, ease: "steps(1)" },
            "<",
          );
          tl.to(
            frameRef.current,
            {
              opacity: Math.random() > 0.18 ? 1 : gsap.utils.random(0.05, 0.5),
              duration: Math.max(dur * 0.4, 0.012),
              ease: "steps(1)",
            },
            "<",
          );
          if (Math.random() > 0.65) {
            tl.to(staticRef.current, { opacity: gsap.utils.random(0.25, 0.6), duration: 0.02 }, "<");
            tl.to(staticRef.current, { opacity: 0, duration: dur * 0.6 });
          }
          if (Math.random() > 0.88) {
            tl.to(flashRef.current, { opacity: gsap.utils.random(0.4, 0.85), duration: 0.018 }, "<");
            tl.to(flashRef.current, { opacity: 0, duration: dur * 0.5 });
          }
        }
      }

      // opening chaos
      tl.to(blackoutRef.current, { opacity: 0, duration: 0.1 });
      burst(15, 22, 12);

      tl.set([frameWrapRef.current, tintRRef.current, tintBRef.current], {
        x: 0,
        y: 0,
        clipPath: "none",
      });
      tl.to(frameRef.current, { opacity: 1, duration: 0.15 });
      tl.call(() => sfx.play("stamp"), undefined, "+=0.05");
      tl.to(titleRef.current, { opacity: 1, y: 0, duration: 0.35 }, "<");

      // uneasy hold with light ambient jitter
      for (let i = 0; i < 5; i++) {
        tl.to(frameWrapRef.current, {
          x: gsap.utils.random(-3, 3),
          y: gsap.utils.random(-2, 2),
          duration: 0.35,
          ease: "sine.inOut",
        });
      }

      // second, harder breakdown
      tl.call(() => sfx.play("riser", 0.6), undefined, "-=0.6");
      tl.to(titleRef.current, { opacity: 0.3, duration: 0.08 });
      burst(11, 30, 16);

      tl.to(titleRef.current, { opacity: 0, duration: 0.06 }, "<");
      tl.to(staticRef.current, { opacity: 0.7, duration: 0.03 });
      tl.call(() => {
        stopBed?.();
        sfx.play("hit");
      });
      tl.to(flashRef.current, { opacity: 1, duration: 0.05 }, "<");
      tl.to(blackoutRef.current, { opacity: 1, duration: 0.14 }, "-=0.02");
      tl.to(flashRef.current, { opacity: 0, duration: 0.3 });
      tl.to(staticRef.current, { opacity: 0, duration: 0.2 }, "<");
      // pitch black again: only the film's scratchy soundtrack is left, and it
      // fades to nothing before the portfolio opens
      tl.call(() => film?.fadeOut(TAIL), undefined, "<");
      tl.to({}, { duration: TAIL }, "<");
    }, rootRef);

    return () => {
      clearTimeout(skipTimer);
      stopBed?.();
      start.kill();
      stopVoice?.();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function begin(withSound: boolean) {
    if (withSound) sfx.unlock();
    else sfx.setMuted(true);
    setPhase("play");
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }

  return (
    <div ref={rootRef} className="intro">
      {phase === "gate" && (
        <div className="intro__gate font-mono">
          <span className="intro__gate-no">FILE NO. 0726-A — CLASSIFIED</span>
          <button className="intro__gate-open font-display" onClick={() => begin(true)} autoFocus>
            Open file
          </button>
          <button className="intro__gate-quiet" onClick={() => begin(false)}>
            enter without sound
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        className="intro__video"
        src="/assets/video/filmscratches.mp4"
        muted
        loop
        playsInline
        preload="auto"
      />

      <div ref={frameWrapRef} className="intro__frame-wrap">
        <img
          ref={tintRRef}
          className="intro__frame intro__frame--r"
          src="/assets/images/intro-frame.webp"
          alt=""
        />
        <img
          ref={tintBRef}
          className="intro__frame intro__frame--b"
          src="/assets/images/intro-frame.webp"
          alt=""
        />
        <img
          ref={frameRef}
          className="intro__frame intro__frame--main"
          src="/assets/images/intro-frame.webp"
          alt=""
        />
      </div>

      <div ref={staticRef} className="intro__static" />
      <div className="intro__scanlines" />

      <div ref={titleRef} className="intro__title font-display">
        Himanshu Mishra
        <span className="intro__title-sub font-mono">FILE NO. 0726-A</span>
      </div>

      <div ref={flashRef} className="intro__flash" />
      <div ref={blackoutRef} className="intro__blackout" style={{ opacity: 1 }} />

      {skippable && (
        <button className="intro__skip font-type" onClick={finish}>
          SKIP INTRO &#9656;
        </button>
      )}
    </div>
  );
}
