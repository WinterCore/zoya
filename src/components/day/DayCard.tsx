import React, {useMemo, useRef, useState} from "react";
import {MdChevronLeft, MdChevronRight, MdClose} from "react-icons/md";
import type {AsyncData} from "@/lib/asyncdata";
import {type DaySeries, nearestSample, type Sample} from "@/lib/daySeries";
import {
  formatClock,
  formatDayLabel,
  formatEnergy,
  formatNumber,
  formatPercent,
  formatPower,
  formatShortDuration,
} from "@/lib/format";
import {Statistics} from "@/lib/statistics";
import {addDays} from "@/lib/utils";
import {useElementWidth} from "@/hooks/useElementWidth";
import {useNow} from "@/hooks/useNow";
import {usePinch} from "@/hooks/usePinch";
import {Card} from "@/components/Card";
import {ErrorRetry} from "@/components/ErrorRetry";
import {Spinner} from "@/components/Spinner";
import {BatteryChart} from "./BatteryChart";
import {dayBounds, timeScale} from "./chartScale";
import {GridStrip} from "./GridStrip";
import {TimeAxis} from "./TimeAxis";
import {UsageChart} from "./UsageChart";

/** The readout shows the reading nearest the cursor, if one is this close. */
const READOUT_RANGE_MS = 10 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
/** How far a touch moves sideways before it counts as dragging the cursor. */
const SCRUB_SLOP_PX = 6;
/** Zooming stops at this much of the day across the chart. */
const MIN_VIEW_MS = HOUR_MS;
/** Zoomed in to this span or less, usage switches to 5-minute bars. */
const FINE_SLOTS_BELOW_MS = 8 * HOUR_MS;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

interface HeaderProps {
  readonly date: string;
  readonly today: string;
  readonly onSelectDate: (date: string) => void;
}

const ArrowButton = ({ label, disabled, onClick, children }: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 items-center justify-center rounded-full text-white active:bg-white/10 disabled:opacity-25"
    >
      {children}
    </button>
  );
};

/** ‹ Today › with the native date picker behind the label. */
const DayHeader = ({ date, today, onSelectDate }: HeaderProps) => {
  const picker = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    try {
      picker.current?.showPicker();
    } catch (error) {
      console.error("Failed to open the date picker:", error);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <ArrowButton label="Previous day" onClick={() => onSelectDate(addDays(date, -1))}>
        <MdChevronLeft size={28} />
      </ArrowButton>
      <div className="relative">
        <button type="button" onClick={openPicker} className="rounded-md px-3 py-1 text-lg font-medium active:bg-white/10">
          {formatDayLabel(date, today)}
        </button>
        <input
          ref={picker}
          type="date"
          max={today}
          value={date}
          onChange={(e) => {
            const value = e.target.value;
            if (value && value <= today) {
              onSelectDate(value);
            }
          }}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <ArrowButton label="Next day" disabled={date >= today} onClick={() => onSelectDate(addDays(date, 1))}>
        <MdChevronRight size={28} />
      </ArrowButton>
    </div>
  );
};

const PanelLabel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`mb-1 flex items-center justify-between text-[10px] font-medium tracking-wider text-muted uppercase ${className}`}>
      {children}
    </div>
  );
};

const Dot = ({ className }: { className: string }) => {
  return <span className={`inline-block size-2 shrink-0 rounded-full ${className}`} />;
};

interface ReadoutProps {
  readonly time: number | null;
  readonly sample: Sample | null;
  readonly onClose: () => void;
}

/** What the chart shows at the cursor; sits above the charts so the finger doesn't cover it. */
const Readout = ({ time, sample, onClose }: ReadoutProps) => {
  if (time === null) {
    return <p className="flex h-7 items-center text-xs text-muted">Drag across the chart for details · pinch to zoom</p>;
  }

  return (
    <div className="flex h-7 items-center gap-3 text-sm tabular-nums">
      <span className="font-medium text-white">{formatClock(sample?.time ?? time)}</span>
      {sample ? (
        <>
          <span className="flex items-center gap-1.5"><Dot className="bg-battery" />{sample.battery}%</span>
          <span className="flex items-center gap-1.5"><Dot className="bg-load" />{formatNumber(sample.load)} W</span>
          <span className="flex items-center gap-1.5">
            <Dot className={sample.gridOn ? "bg-grid" : "bg-subtle"} />
            Grid {sample.gridOn ? "on" : "off"}
          </span>
        </>
      ) : (
        <span className="text-muted">No data</span>
      )}
      <button type="button" aria-label="Hide details" onClick={onClose} className="-mr-1 ml-auto flex size-7 items-center justify-center rounded-full text-muted active:bg-white/10">
        <MdClose size={16} />
      </button>
    </div>
  );
};

const Stat = ({ label, value, detail }: { label: string; value: string; detail?: string }) => {
  return (
    <div className="rounded-md bg-night/50 px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {detail && <p className="text-xs text-muted tabular-nums">{detail}</p>}
    </div>
  );
};

interface ContentProps {
  readonly series: DaySeries;
  readonly isToday: boolean;
  readonly gridRun: Statistics.GridRun | null;
  readonly width: number;
}

const DayContent = ({ series, isToday, gridRun, width }: ContentProps) => {
  const now = useNow(60_000);
  const [cursor, setCursor] = useState<{ date: string; time: number } | null>(null);
  // The visible part of the day; null shows all of it.
  const [view, setView] = useState<{ date: string; start: number; end: number } | null>(null);
  const [chartArea, setChartArea] = useState<HTMLDivElement | null>(null);
  const gesture = useRef<{ x: number; y: number; scrubbing: boolean } | null>(null);
  // The view when the current pinch began; null when not pinching.
  const pinchBase = useRef<{ start: number; end: number } | null>(null);

  // A new day starts without a cursor, zoomed out.
  if (cursor !== null && cursor.date !== series.date) {
    setCursor(null);
  }
  if (view !== null && view.date !== series.date) {
    setView(null);
  }

  const bounds = useMemo(() => dayBounds(series.date), [series.date]);
  const viewStart = view?.date === series.date ? view.start : bounds.start;
  const viewEnd = view?.date === series.date ? view.end : bounds.end;
  const isZoomed = viewEnd - viewStart < bounds.end - bounds.start;
  const scale = useMemo(() => timeScale(viewStart, viewEnd, width), [viewStart, viewEnd, width]);

  const stats = useMemo(() => {
    const hasSolar = series.samples.some((s) => s.solar > 0);
    const slots = (slotMs: number) => ({
      slotMs,
      load: Statistics.getSlotAverages(series, (s) => s.load, slotMs),
      solar: hasSolar ? Statistics.getSlotAverages(series, (s) => s.solar, slotMs) : null,
    });

    return {
      periods: Statistics.getGridOnPeriods(series.samples),
      gridHours: Statistics.getGridHours(series),
      usage: slots(Statistics.SLOT_MS),
      fineUsage: slots(Statistics.FINE_SLOT_MS),
      totals: Statistics.getDayTotals(series.samples),
    };
  }, [series]);

  usePinch(chartArea, {
    onStart: () => {
      // The second finger turns the gesture into a pinch, never a cursor move.
      gesture.current = null;
      pinchBase.current = { start: viewStart, end: viewEnd };
    },
    onMove: ({ scale: spread, startX, x }) => {
      const base = pinchBase.current;
      if (!base || width === 0) {
        return;
      }

      // Zoom around the fingers: the time under their midpoint stays under it.
      const baseSpan = base.end - base.start;
      const span = clamp(baseSpan / spread, MIN_VIEW_MS, bounds.end - bounds.start);
      const anchor = base.start + (startX / width) * baseSpan;
      const start = clamp(anchor - (x / width) * span, bounds.start, bounds.end - span);
      setView({ date: series.date, start, end: start + span });
    },
    onEnd: () => {
      pinchBase.current = null;
    },
  });

  if (series.samples.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">No readings for this day.</p>;
  }

  const { periods, gridHours, totals } = stats;
  const usage = viewEnd - viewStart <= FINE_SLOTS_BELOW_MS ? stats.fineUsage : stats.usage;
  const last = series.samples.at(-1)!;
  const cursorTime = cursor?.date === series.date ? cursor.time : null;
  const cursorSample = cursorTime === null ? null : nearestSample(series.samples, cursorTime, READOUT_RANGE_MS);
  const cursorX = cursorTime === null ? null : scale.x(cursorSample?.time ?? cursorTime);

  const scrub = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    setCursor({ date: series.date, time: scale.time(x) });
  };

  // A touch moves the cursor once it heads sideways, or on a tap. A vertical
  // drag scrolls the page instead, which cancels the pointer.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const onButton = e.target instanceof Element && e.target.closest("button") !== null;
    if (pinchBase.current || onButton) {
      return;
    }

    const isMouse = e.pointerType === "mouse";
    gesture.current = { x: e.clientX, y: e.clientY, scrubbing: isMouse };
    if (isMouse) {
      scrub(e);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || pinchBase.current) {
      return;
    }
    if (!g.scrubbing) {
      const dx = Math.abs(e.clientX - g.x);
      if (dx < SCRUB_SLOP_PX || dx < Math.abs(e.clientY - g.y)) {
        return;
      }
      g.scrubbing = true;
    }
    scrub(e);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current && !gesture.current.scrubbing) {
      scrub(e);
    }
    gesture.current = null;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-sm">
          <span className="font-semibold">{formatShortDuration(gridHours.hours * HOUR_MS)}</span>
          <span className="text-muted"> on grid · {formatPercent(gridHours.percentage)} of the day{isToday ? " so far" : ""}</span>
        </p>
        {isToday && gridRun && (
          <p className="flex items-center gap-1.5 rounded-full bg-night/50 px-2.5 py-0.5 text-xs">
            <Dot className={gridRun.gridOn ? "bg-grid" : "bg-subtle"} />
            {gridRun.gridOn ? "On" : "Off"} for {formatShortDuration(now - gridRun.since)}
          </p>
        )}
      </div>

      <div className="mt-2">
        <Readout time={cursorTime} sample={cursorSample} onClose={() => setCursor(null)} />
      </div>

      <div
        ref={setChartArea}
        data-scrub
        className="mt-1 touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          gesture.current = null;
        }}
      >
        <PanelLabel className="h-5">
          <span>Grid</span>
          {isZoomed && (
            <button
              type="button"
              onClick={() => setView(null)}
              className="flex items-center gap-1 rounded-full bg-night/50 px-2 py-0.5 tracking-normal text-white normal-case tabular-nums active:bg-white/10"
            >
              {formatClock(viewStart)} – {formatClock(viewEnd)}
              <span className="text-muted">· Whole day</span>
            </button>
          )}
        </PanelLabel>
        <GridStrip scale={scale} periods={periods} now={isToday ? now : null} cursorX={cursorX} />

        <PanelLabel className="mt-3">Battery</PanelLabel>
        <BatteryChart scale={scale} samples={series.samples} periods={periods} cursor={cursorSample} cursorX={cursorX} />

        <PanelLabel className="mt-3">
          <span>
            Usage <span className="tracking-normal normal-case">· {usage.slotMs / 60_000}-min average</span>
          </span>
          {usage.solar && (
            <span className="flex items-center gap-3 tracking-normal normal-case">
              <span className="flex items-center gap-1"><span className="size-2 rounded-[2px] bg-load" />Load</span>
              <span className="flex items-center gap-1"><span className="h-0.5 w-3 rounded-full bg-solar" />Solar</span>
            </span>
          )}
        </PanelLabel>
        <UsageChart
          scale={scale}
          dayStart={bounds.start}
          slotMs={usage.slotMs}
          load={usage.load}
          solar={usage.solar}
          periods={periods}
          cursorX={cursorX}
        />
        <TimeAxis scale={scale} dayStart={bounds.start} />
      </div>

      <div className="mt-4">
        <PanelLabel>Grid on</PanelLabel>
        {periods.length === 0 ? (
          <p className="text-sm text-muted">{isToday ? "No grid yet today" : "No grid this day"}</p>
        ) : (
          <ul className="divide-y divide-line">
            {periods.map((period) => {
              const ongoing = isToday && last.gridOn && period.end === last.time;
              return (
                <li key={period.start} className="flex items-center justify-between py-1.5 text-sm tabular-nums">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-1 rounded-full bg-grid" />
                    {formatClock(period.start)} – {ongoing ? "now" : formatClock(period.end)}
                  </span>
                  <span className="text-muted">{formatShortDuration((ongoing ? now : period.end) - period.start)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="From battery" value={formatEnergy(totals.fromBatteryWh)} />
        <Stat label="Charged" value={formatEnergy(totals.chargedWh)} />
        {totals.lowestBattery && (
          <Stat label="Lowest battery" value={`${totals.lowestBattery.value}%`} detail={`at ${formatClock(totals.lowestBattery.time)}`} />
        )}
        {totals.peakLoad && (
          <Stat label="Peak load" value={formatPower(totals.peakLoad.value)} detail={`at ${formatClock(totals.peakLoad.time)}`} />
        )}
      </div>
    </>
  );
};

interface Props {
  readonly date: string;
  readonly today: string;
  readonly day: AsyncData<DaySeries> | undefined;
  /** Today only: how long the grid has been in its current state. */
  readonly gridRun: Statistics.GridRun | null;
  readonly onSelectDate: (date: string) => void;
  readonly onRetry: () => void;
}

/** One day: when the grid was on, battery %, usage and totals, on a shared time axis. */
export const DayCard = ({ date, today, day, gridRun, onSelectDate, onRetry }: Props) => {
  const [body, setBody] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(body);

  return (
    <Card className="mx-4 mt-5 p-4">
      <DayHeader date={date} today={today} onSelectDate={onSelectDate} />
      <div ref={setBody} className="mt-3">
        {day === undefined || day.type === "loading" ? (
          <div className="flex h-[420px] items-center justify-center">
            <Spinner size={48} />
          </div>
        ) : day.type === "error" ? (
          <div className="flex h-[200px]">
            <ErrorRetry message="Couldn't load this day." onRetry={onRetry} />
          </div>
        ) : width > 0 && (
          <DayContent series={day.data} isToday={date === today} gridRun={gridRun} width={width} />
        )}
      </div>
    </Card>
  );
};
