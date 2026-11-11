import {useMemo} from "react";
import type {AsyncData} from "@/lib/asyncdata";
import type {DaySeries} from "@/lib/daySeries";
import {formatHours, formatWeekday} from "@/lib/format";
import {Statistics} from "@/lib/statistics";
import {Card} from "./Card";

const BAR_AREA_HEIGHT = 96;

export interface HistoryDay {
  readonly date: string;
  readonly day: AsyncData<DaySeries> | undefined;
}

interface Props {
  /** Oldest first, ending with today. */
  readonly days: readonly HistoryDay[];
  readonly today: string;
  readonly selected: string;
  readonly onSelect: (date: string) => void;
}

/** Grid hours per day for the last week; tapping a day opens it in the day card. */
export const GridHistoryCard = ({ days, today, selected, onSelect }: Props) => {
  const columns = useMemo(() => days.map(({ date, day }) => ({
    date,
    day,
    hours: day?.type === "success" ? Statistics.getGridHours(day.data).hours : null,
  })), [days]);

  // Today is still in progress, so it stays out of the average.
  const finished = columns.filter((c) => c.date !== today && c.hours !== null).map((c) => c.hours!);
  const average = finished.length > 0 ? finished.reduce((a, b) => a + b, 0) / finished.length : null;
  const top = Math.max(8, Math.ceil(Math.max(0, ...columns.map((c) => c.hours ?? 0)) / 4) * 4);

  return (
    <Card className="mx-4 mt-4 p-4">
      <p className="text-lg font-medium">Grid hours</p>
      <p className="text-sm text-muted">
        Last 7 days{average !== null && ` · avg ${formatHours(average)}h a day`}
      </p>

      <div className="mt-4 flex gap-1.5">
        {columns.map(({ date, day, hours }) => {
          const isSelected = date === selected;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-label={`${isToday ? "Today" : formatWeekday(date)}: ${hours === null ? "not loaded" : `${formatHours(hours)} hours`}`}
              aria-pressed={isSelected}
              className="flex min-w-0 flex-1 flex-col items-center rounded-md py-1 active:bg-white/5"
            >
              <span className={`h-4 text-[11px] tabular-nums ${isSelected ? "text-white" : "text-muted"}`}>
                {hours !== null && `${formatHours(hours)}h`}
              </span>
              <span className="mt-1 flex w-full items-end justify-center" style={{ height: BAR_AREA_HEIGHT }}>
                {day?.type === "error" ? (
                  <span className="self-center text-base font-bold text-danger">!</span>
                ) : hours === null ? (
                  <span className="h-1/3 w-full max-w-6 animate-pulse rounded-t-[4px] bg-line" />
                ) : (
                  <span
                    className="w-full max-w-6 rounded-t-[4px] bg-grid"
                    style={{
                      height: hours > 0 ? Math.max(2, (hours / top) * BAR_AREA_HEIGHT) : 0,
                      opacity: isSelected ? 1 : 0.45,
                      // Stripes mark today as still in progress.
                      backgroundImage: isToday
                        ? "repeating-linear-gradient(135deg, transparent 0 3px, rgb(0 0 0 / 0.3) 3px 6px)"
                        : undefined,
                    }}
                  />
                )}
              </span>
              <span className="mt-1.5 h-px w-full bg-line" />
              <span className={`mt-1.5 text-xs ${isSelected ? "font-medium text-white" : "text-muted"}`}>
                {isToday ? "Today" : formatWeekday(date)}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
