import {Statistics} from "@/lib/statistics";
import {formatPower} from "@/lib/format";
import {niceWatts, type TimeScale} from "./chartScale";
import {CursorLine, GridBands, ValueLabel} from "./ChartParts";

const HEIGHT = 80;
const PLOT_TOP = 2;
const BAR_GAP = 1;
/** Bars stop growing when zoomed far in. */
const MAX_BAR_PX = 24;

interface Props {
  readonly scale: TimeScale;
  /** Slots are counted from midnight. */
  readonly dayStart: number;
  readonly slotMs: number;
  /** Average load per slot. */
  readonly load: readonly (number | null)[];
  /** Average solar power per slot; null on days without any. */
  readonly solar: readonly (number | null)[] | null;
  readonly periods: readonly Statistics.GridOnPeriod[];
  readonly cursorX: number | null;
}

/** Load as average bars per slot, with solar as a line when there was some. */
export const UsageChart = ({ scale, dayStart, slotMs, load, solar, periods, cursorX }: Props) => {
  const peak = Math.max(0, ...load.map((w) => w ?? 0), ...(solar ?? []).map((w) => w ?? 0));
  const top = niceWatts(peak);
  const y = (watts: number) => HEIGHT - (watts / top) * (HEIGHT - PLOT_TOP);
  const slotX = (slot: number) => scale.x(dayStart + slot * slotMs);
  const isVisible = (slot: number) => slotX(slot + 1) >= 0 && slotX(slot) <= scale.width;
  const cursorSlot = cursorX === null ? null : Math.floor((scale.time(cursorX) - dayStart) / slotMs);

  // The solar line breaks across slots without readings.
  const solarPath = solar?.reduce((path, watts, slot) => {
    if (watts === null) {
      return path;
    }
    const x = (slotX(slot) + slotX(slot + 1)) / 2;
    const command = slot > 0 && solar[slot - 1] !== null ? "L" : "M";
    return `${path}${command}${x.toFixed(1)},${y(watts).toFixed(1)} `;
  }, "");

  return (
    <svg width={scale.width} height={HEIGHT} className="block" aria-hidden>
      <GridBands scale={scale} periods={periods} height={HEIGHT} />

      {[top / 2, top].map((watts) => (
        <line
          key={watts}
          x1={0}
          x2={scale.width}
          y1={Math.round(y(watts)) + 0.5}
          y2={Math.round(y(watts)) + 0.5}
          className="stroke-line"
          shapeRendering="crispEdges"
        />
      ))}

      {load.map((watts, slot) => {
        if (watts === null || watts <= 0 || !isVisible(slot)) {
          return null;
        }
        const x = slotX(slot);
        const slotWidth = slotX(slot + 1) - x;
        const barWidth = Math.max(1, Math.min(MAX_BAR_PX, slotWidth - BAR_GAP));
        const barHeight = Math.max(1, HEIGHT - y(watts));
        return (
          <rect
            key={slot}
            x={x + (slotWidth - barWidth) / 2}
            y={HEIGHT - barHeight}
            width={barWidth}
            height={barHeight}
            rx={1}
            className={slot === cursorSlot ? "fill-white" : "fill-load"}
          />
        );
      })}

      {solarPath && (
        <path d={solarPath} className="stroke-solar" fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      )}

      <line x1={0} x2={scale.width} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} className="stroke-line" shapeRendering="crispEdges" />
      <ValueLabel y={y(top) + 2}>{formatPower(top)}</ValueLabel>
      <ValueLabel y={y(top / 2) + 2}>{formatPower(top / 2)}</ValueLabel>

      {cursorX !== null && <CursorLine x={cursorX} height={HEIGHT} />}
    </svg>
  );
};
