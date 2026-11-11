import {useId} from "react";
import type {Statistics} from "@/lib/statistics";
import type {TimeScale} from "./chartScale";
import {CursorLine} from "./ChartParts";

const HEIGHT = 14;

interface Props {
  readonly scale: TimeScale;
  readonly periods: readonly Statistics.GridOnPeriod[];
  /** For today: the rest of the day is drawn faded, so it doesn't read as "grid off". */
  readonly now: number | null;
  readonly cursorX: number | null;
}

/** The day as one bar, filled in wherever the grid was on. */
export const GridStrip = ({ scale, periods, now, cursorX }: Props) => {
  const clipId = useId();
  const nowX = now === null ? scale.width : Math.min(scale.width, Math.max(0, scale.x(now)));

  return (
    <svg width={scale.width} height={HEIGHT} className="block" aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <rect width={scale.width} height={HEIGHT} rx={4} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width={nowX} height={HEIGHT} className="fill-line" />
        <rect x={nowX} width={scale.width - nowX} height={HEIGHT} className="fill-line" opacity={0.35} />
        {periods.map((period) => {
          const x = scale.x(period.start);
          return (
            <rect
              key={period.start}
              className="fill-grid"
              x={x}
              width={Math.max(2, scale.x(period.end) - x)}
              height={HEIGHT}
            />
          );
        })}
      </g>
      {cursorX !== null && <CursorLine x={cursorX} height={HEIGHT} />}
    </svg>
  );
};
