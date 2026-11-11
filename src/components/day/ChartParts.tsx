import type {Statistics} from "@/lib/statistics";
import type {TimeScale} from "./chartScale";

interface GridBandsProps {
  readonly scale: TimeScale;
  readonly periods: readonly Statistics.GridOnPeriod[];
  readonly height: number;
}

/** A faint wash behind a chart wherever the grid was on. */
export const GridBands = ({ scale, periods, height }: GridBandsProps) => {
  return periods.map((period) => {
    const x = scale.x(period.start);
    return (
      <rect
        key={period.start}
        className="fill-grid"
        opacity={0.1}
        x={x}
        y={0}
        width={Math.max(1, scale.x(period.end) - x)}
        height={height}
      />
    );
  });
};

interface CursorLineProps {
  readonly x: number;
  readonly height: number;
}

export const CursorLine = ({ x, height }: CursorLineProps) => {
  return <line x1={x} x2={x} y1={0} y2={height} className="stroke-white" strokeOpacity={0.7} strokeWidth={1} />;
};

interface ValueLabelProps {
  readonly y: number;
  readonly children: string;
}

/** A small axis value at the chart's left edge, haloed so it reads over the data. */
export const ValueLabel = ({ y, children }: ValueLabelProps) => {
  return (
    <text
      x={2}
      y={y}
      className="fill-muted stroke-card text-[9px] tabular-nums"
      strokeWidth={3}
      paintOrder="stroke"
      dominantBaseline="hanging"
    >
      {children}
    </text>
  );
};
