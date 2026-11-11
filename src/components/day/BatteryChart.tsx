import {Statistics} from "@/lib/statistics";
import type {Sample} from "@/lib/daySeries";
import type {TimeScale} from "./chartScale";
import {CursorLine, GridBands, ValueLabel} from "./ChartParts";

const HEIGHT = 150;
const PLOT_TOP = 4;
const PLOT_BOTTOM = HEIGHT - 1;
const TICKS = [25, 50, 75, 100];

const y = (percent: number) => PLOT_BOTTOM - (percent / 100) * (PLOT_BOTTOM - PLOT_TOP);

/** Splits the readings wherever the data has a gap, so the line doesn't bridge it. */
const toSegments = (samples: readonly Sample[]): Sample[][] => {
  const segments: Sample[][] = [];
  let current: Sample[] = [];

  for (const sample of samples) {
    const previous = current.at(-1);
    if (previous && sample.time - previous.time > Statistics.MAX_GAP_MS) {
      segments.push(current);
      current = [];
    }
    current.push(sample);
  }

  if (current.length > 0) {
    segments.push(current);
  }
  return segments;
};

interface Props {
  readonly scale: TimeScale;
  readonly samples: readonly Sample[];
  readonly periods: readonly Statistics.GridOnPeriod[];
  readonly cursor: Sample | null;
  readonly cursorX: number | null;
}

/** Battery % on a fixed 0–100 scale, one point per reading. */
export const BatteryChart = ({ scale, samples, periods, cursor, cursorX }: Props) => {
  const segments = toSegments(samples);

  return (
    <svg width={scale.width} height={HEIGHT} className="block" aria-hidden>
      <GridBands scale={scale} periods={periods} height={HEIGHT} />

      {TICKS.map((tick) => (
        <line
          key={tick}
          x1={0}
          x2={scale.width}
          y1={Math.round(y(tick)) + 0.5}
          y2={Math.round(y(tick)) + 0.5}
          className="stroke-line"
          shapeRendering="crispEdges"
        />
      ))}
      <line x1={0} x2={scale.width} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} className="stroke-line" shapeRendering="crispEdges" />

      {segments.map((segment) => {
        const points = segment.map((s) => `${scale.x(s.time).toFixed(1)},${y(s.battery).toFixed(1)}`);
        const firstX = scale.x(segment[0].time).toFixed(1);
        const lastX = scale.x(segment.at(-1)!.time).toFixed(1);
        return (
          <g key={segment[0].time}>
            <path d={`M${firstX},${PLOT_BOTTOM} L${points.join(" L")} L${lastX},${PLOT_BOTTOM} Z`} className="fill-battery" opacity={0.1} />
            <path
              d={`M${points.join(" L")}`}
              className="stroke-battery"
              fill="none"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </g>
        );
      })}

      {TICKS.map((tick) => <ValueLabel key={tick} y={y(tick) + 2}>{`${tick}%`}</ValueLabel>)}

      {cursorX !== null && <CursorLine x={cursorX} height={HEIGHT} />}
      {cursor && (
        <circle cx={scale.x(cursor.time)} cy={y(cursor.battery)} r={4} className="fill-battery stroke-card" strokeWidth={2} />
      )}
    </svg>
  );
};
