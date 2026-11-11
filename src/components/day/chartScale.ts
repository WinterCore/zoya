import {addDays, startOfDay} from "@/lib/utils";

/** Maps a span of time across a chart's width. */
export interface TimeScale {
  readonly start: number;
  readonly end: number;
  readonly width: number;
  readonly x: (time: number) => number;
  readonly time: (x: number) => number;
}

export const timeScale = (start: number, end: number, width: number): TimeScale => {
  const span = end - start;

  return {
    start,
    end,
    width,
    x: (time) => ((time - start) / span) * width,
    time: (x) => start + (x / width) * span,
  };
};

/** Midnight to midnight, so 23- and 25-hour days around DST changes fit too. */
export const dayBounds = (date: string): { readonly start: number; readonly end: number } => {
  return { start: startOfDay(date), end: startOfDay(addDays(date, 1)) };
};

const NICE_WATTS = [500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10_000];

/** Rounds a chart's top up to a clean number of watts: 500, 1k, 1.5k, 2k, 3k… */
export const niceWatts = (watts: number): number => {
  return NICE_WATTS.find((step) => step >= watts) ?? Math.ceil(watts / 5000) * 5000;
};
