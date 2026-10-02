import type { Ref } from "react";
import type { Geom } from "./geometry";

/** The drawer's front panel: a trapezoid leaning toward the viewer, with a lip and a pull. */
export default function DrawerFront({ g, ref }: { g: Geom; ref: Ref<SVGSVGElement> }) {
  const { DW, panelH } = g;
  const inset = DW * 0.055;
  const lip = 9;
  const outline = `M0.75,0.75 H${DW - 0.75} V${lip} L${DW - inset},${panelH - 0.75} H${inset} L0.75,${lip} Z`;
  // the pull: a rounded grip over two stacked plates
  const mid = DW / 2;
  const hw = DW * 0.105;
  const hy = panelH * 0.42;
  const ha = panelH * 0.13;
  const hb = panelH * 0.085;

  return (
    <svg
      ref={ref}
      className="cab__static cab__panel"
      style={{ width: DW, height: panelH }}
      viewBox={`0 0 ${DW} ${panelH}`}
    >
      <path className="cab__fill" d={outline} />
      <path className="cab__line" d={`${outline} M0.75,${lip} H${DW - 0.75}`} />
      <path
        className="cab__line"
        d={
          `M${mid - hw},${hy + ha} Q${mid - hw},${hy} ${mid - hw + ha},${hy} ` +
          `H${mid + hw - ha} Q${mid + hw},${hy} ${mid + hw},${hy + ha} Z`
        }
      />
      {[0, 1].map((n) => {
        const y = hy + ha + n * hb;
        const w = hw - n * 2;
        return (
          <path
            key={n}
            className="cab__line"
            d={
              `M${mid - w},${y} H${mid + w} Q${mid + w + 3},${y + hb / 2} ${mid + w - 2},${y + hb} ` +
              `H${mid - w + 2} Q${mid - w - 3},${y + hb / 2} ${mid - w},${y} Z`
            }
          />
        );
      })}
    </svg>
  );
}
