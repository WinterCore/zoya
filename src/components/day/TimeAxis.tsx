import {formatClock} from "@/lib/format";
import type {TimeScale} from "./chartScale";

const MINUTE_MS = 60 * 1000;
/** Tick spacings to choose from; the smallest that leaves room for the labels wins. */
const STEPS_MS = [15, 30, 60, 120, 180, 360].map((minutes) => minutes * MINUTE_MS);
const MIN_LABEL_GAP_PX = 56;
/** Labels this close to an edge are aligned to it instead of centred. */
const EDGE_PX = 20;

/** "6am", or "6:30am" off the hour. */
const tickLabel = (time: number) => formatClock(time).replace(":00", "");

interface Props {
  readonly scale: TimeScale;
  /** Ticks are counted from midnight, so they land on round times. */
  readonly dayStart: number;
}

/** Time labels under the charts; 12am · 6am · 12pm · 6pm · 12am for a whole day. */
export const TimeAxis = ({ scale, dayStart }: Props) => {
  const span = scale.end - scale.start;
  const step = STEPS_MS.find((ms) => (ms / span) * scale.width >= MIN_LABEL_GAP_PX) ?? STEPS_MS.at(-1)!;

  const ticks: number[] = [];
  for (let time = dayStart + Math.ceil((scale.start - dayStart) / step) * step; time <= scale.end; time += step) {
    ticks.push(time);
  }

  return (
    <svg width={scale.width} height={16} className="block" aria-hidden>
      {ticks.map((time) => {
        const x = scale.x(time);
        const anchor = x < EDGE_PX ? "start" : x > scale.width - EDGE_PX ? "end" : "middle";
        return (
          <text key={time} x={x} y={12} textAnchor={anchor} className="fill-muted text-[10px]">
            {tickLabel(time)}
          </text>
        );
      })}
    </svg>
  );
};
