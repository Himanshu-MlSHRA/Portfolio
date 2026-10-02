/*
 * Layout maths for the drawer scene. Everything is derived from the viewport
 * so the drawing keeps its proportions on any screen.
 *
 * The drawer is always described upright, in "scene" coordinates: depth runs
 * down the y axis (back of the drawer at the top, front panel at the bottom)
 * and x runs across it. A folder's `y` is the position of its shoulder line
 * (the top edge its tab grows out of).
 *
 * The two layouts only differ in how the scene is put on screen. In both the
 * drawer slides out of an edge with its front panel leading and fills the
 * left half of the screen:
 *
 *   vertical    scene = screen. The drawer comes down out of the top edge.
 *   horizontal  the scene is turned a quarter turn, so depth runs along the
 *               screen's x axis. The drawer rolls out of the left edge and
 *               the tabs read sideways.
 */

export type Layout = "horizontal" | "vertical";

/** A phone held upright gets the drawer coming down from the top; everything else gets it sideways. */
export function layoutFor(W: number, H: number): Layout {
  return W <= 760 && H >= W ? "vertical" : "horizontal";
}

/** height of the top bar */
export const BAR = 52;

export interface Geom {
  layout: Layout;
  W: number;
  H: number;
  /** centre line of the drawer, across */
  cx: number;
  /** distance between two neighbouring folders */
  step: number;
  /** tab height */
  th: number;
  /** shoulder corner radius */
  r: number;
  /** width of the drawer front panel */
  DW: number;
  /** width of a folder */
  wd: number;
  /** CSS width of a sheet of paper */
  sheetW: number;
  /** a sheet inside its folder, in the folder's own box: scale and offset */
  ss: number;
  sx: number;
  sy: number;
  panelTop: number;
  panelH: number;
  /** shoulder line of the front-most folder */
  yFront: number;
  /** shoulder line of the back-most folder */
  yBack: number;
  /** where every folder's bottom edge sits (hidden behind the front panel) */
  bottom: number;
  /** drawer offset that puts the whole drawer off screen */
  shut: number;
  /** screen x where the drawer's half ends and the desk's half begins */
  deskLeft: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function computeGeom(W: number, H: number, n: number, layout: Layout): Geom {
  const sheetW = Math.min(1000, W * 0.94);
  const horizontal = layout === "horizontal";
  // The screen is split down the middle: drawer on the left, the folder that
  // is out on the right. Narrow screens have no room for that, so the drawer
  // takes what it needs and the folder overlaps it.
  const wide = W > 900;
  const deskLeft = wide ? W * 0.5 : horizontal ? W * 0.8 : W;

  let DW: number, cx: number, panelH: number, panelEnd: number, backEdge: number;
  if (horizontal) {
    const across = H - BAR;
    DW = across - 60;
    cx = across / 2;
    panelH = Math.min(DW * 0.17, W * 0.1);
    panelEnd = deskLeft - 14;
    backEdge = 0;
  } else {
    DW = deskLeft - 36;
    cx = deskLeft / 2;
    panelH = Math.min(H * 0.19, DW * 0.3);
    panelEnd = H - 40;
    backEdge = BAR;
  }

  // the folders are spread to fill the drawer from the edge it comes out of
  // right up to its front panel
  const panelTop = panelEnd - panelH;
  const step = clamp((panelTop - backEdge - 60) / (n - 0.1), 22, 110);
  const th = Math.min(step * 1.3, 46);
  const wd = DW * 0.857;
  const yFront = panelTop - step * 0.9;
  return {
    layout,
    W,
    H,
    cx,
    step,
    th,
    r: 10,
    DW,
    wd,
    sheetW,
    ss: (wd * 0.88) / sheetW,
    sx: (wd - wd * 0.88) / 2,
    sy: th + Math.min(step * 0.3, 14),
    panelTop,
    panelH,
    yFront,
    yBack: yFront - (n - 1) * step,
    bottom: panelTop + 30,
    shut: -(panelEnd + 40),
    deskLeft,
  };
}

/** Resting shoulder line of folder `i`. */
export function restY(g: Geom, n: number, i: number) {
  return g.yFront - (n - 1 - i) * g.step;
}

/** Things at the back of the drawer are drawn a little smaller. */
export function depthScale(g: Geom, y: number) {
  return 0.93 + 0.07 * clamp((y - g.yBack) / (g.yFront - g.yBack), 0, 1);
}

/** Height of a folder's box: its tab plus everything down to the drawer floor. */
export function cardHeight(g: Geom, y: number) {
  return g.th + Math.max(0, (g.bottom - y) / depthScale(g, y));
}

/**
 * How far folder `k` (whose loose box is `fileH` CSS px tall) has to be drawn
 * out of its slot before its bottom edge clears the tabs of the folders in
 * front. Past this point it can be passed from "in the drawer" to "in hand"
 * without anything visibly swapping order.
 */
export function clearance(g: Geom, n: number, k: number, fileH: number) {
  const y = restY(g, n, k);
  const f = depthScale(g, y);
  const clear = k < n - 1 ? restY(g, n, k + 1) - g.th - 14 : g.panelTop - 14;
  return y - g.th * f + fileH * g.ss * f - clear;
}

/** CSS transform that puts scene coordinates on screen. */
export function sceneTransform(g: Geom) {
  return g.layout === "horizontal" ? `translate3d(0,${g.H}px,0) rotate(-90deg)` : "";
}

/** The same mapping for a single point. */
export function toScreen(g: Geom, x: number, y: number) {
  return g.layout === "horizontal" ? { x: y, y: g.H - x } : { x, y };
}

/** Rotation of anything standing in the drawer, in degrees. */
export function turn(g: Geom) {
  return g.layout === "horizontal" ? -90 : 0;
}

/** Outline of a folder's top strip: shoulder line with a tab at `cx`. */
export function tabPath(w: number, th: number, r: number, cx: number, tw: number) {
  const sh = th;
  const a = cx - tw / 2 - sh;
  const b = cx + tw / 2 + sh;
  const t = 0.75;
  return {
    a,
    b,
    line:
      `M${t},${th + r} Q${t},${th} ${r},${th} H${a} ` +
      `C${a + sh * 0.55},${th} ${a + sh * 0.45},${t} ${a + sh},${t} H${b - sh} ` +
      `C${b - sh * 0.45},${t} ${b - sh * 0.55},${th} ${b},${th} ` +
      `H${w - r} Q${w - t},${th} ${w - t},${th + r}`,
    tab:
      `M${a},${th} C${a + sh * 0.55},${th} ${a + sh * 0.45},${t} ${a + sh},${t} H${b - sh} ` +
      `C${b - sh * 0.45},${t} ${b - sh * 0.55},${th} ${b},${th} Z`,
  };
}

/** Where along a folder its tab sits: they alternate so neighbours never hide each other. */
export const tabCentre = (i: number) => (i % 2 === 0 ? 0.5 : 0.745);
