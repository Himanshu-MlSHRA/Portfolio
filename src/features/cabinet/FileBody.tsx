import Sheet from "../sheet/Sheet";
import { SECTIONS } from "../../data/content";
import { tabCentre, tabPath, type Geom } from "./geometry";
import "./file.css";

const tabFont = (g: Geom) => Math.min(g.th * 0.36, (g.wd * 0.2 + g.th) / 7.2);

/**
 * One folder with its sheet in it, drawn at reading size. The same drawing is
 * used for the folder on the desk and, scaled down by `g.ss`, for every folder
 * standing in the drawer — so one can replace the other without a seam.
 */
interface FileBodyProps {
  g: Geom;
  index: number;
  /** tab inked in: this is the folder that is out */
  on: boolean;
  page?: number;
  onTurn?: (to: number) => void;
}

export default function FileBody({ g, index, on, page, onTurn }: FileBodyProps) {
  const sec = SECTIONS[index];
  const k = 1 / g.ss;
  const w = g.wd * k;
  const th = g.th * k;
  const tp = tabPath(w, th, g.r * k, w * tabCentre(index), w * 0.2);
  const topH = th + g.r * k;
  return (
    <div
      className={`file__body${on ? " file__body--on" : ""}`}
      style={{ width: w, padding: `${g.sy * k}px 0 ${g.sx * k * 0.7}px ${g.sx * k}px` }}
    >
      <svg className="file__top" width={w} height={topH} viewBox={`0 0 ${w} ${topH}`}>
        <path className="file__fill" d={`${tp.line} H0.75 Z`} />
        <path className="file__ink" d={tp.tab} />
        <path className="file__line" d={tp.line} />
      </svg>
      <div className="file__back" style={{ top: topH }} />
      <span
        className="file__tab"
        style={{ left: tp.a + th * 0.5, width: tp.b - tp.a - th, height: th, fontSize: tabFont(g) * k }}
      >
        {sec.label}
      </span>
      <div className="sheet">
        <Sheet section={sec} page={page} onTurn={onTurn} />
      </div>
    </div>
  );
}
