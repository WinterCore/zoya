import type {DaySeries} from "./daySeries";
import {Storage} from "./storage";
import {addDays, startOfDay, toISODateString} from "./utils";

/** Past days are kept this long; the 7-day card needs the last 6. */
const KEEP_DAYS = 14;
/** Readings can reach the server a little late, so a day is final an hour after it ends. */
const SETTLE_MS = 60 * 60 * 1000;
const PREFIX = "day:";
const VERSION = 1;

const keyFor = (pn: string, date: string) => `${PREFIX}${pn}:${date}`;

/** time, battery, load, solar, gridOn (1/0), chargeW, dischargeW */
type Row = [number, number, number, number, 0 | 1, number, number];

interface StoredDay {
  readonly v: number;
  readonly date: string;
  readonly rows: readonly Row[];
}

let pruning: Promise<void> | null = null;

/** Finished days per device. They never change, so each is downloaded once. */
export namespace DayCache {
  export const isFinal = (date: string): boolean => {
    return Date.now() >= startOfDay(addDays(date, 1)) + SETTLE_MS;
  };

  export async function get(pn: string, date: string): Promise<DaySeries | null> {
    const stored = await Storage.getJSON<StoredDay>(keyFor(pn, date));
    if (stored?.v !== VERSION || stored.date !== date || !Array.isArray(stored.rows)) {
      return null;
    }

    return {
      date,
      samples: stored.rows.map(([time, battery, load, solar, gridOn, chargeW, dischargeW]) => ({
        time, battery, load, solar, gridOn: gridOn === 1, chargeW, dischargeW,
      })),
    };
  }

  /** Saves the day if it's final; days still in progress are skipped. */
  export async function set(pn: string, series: DaySeries): Promise<void> {
    if (!isFinal(series.date)) {
      return;
    }

    const stored: StoredDay = {
      v: VERSION,
      date: series.date,
      rows: series.samples.map((s): Row => [
        s.time, s.battery, s.load, s.solar, s.gridOn ? 1 : 0, Math.round(s.chargeW), Math.round(s.dischargeW),
      ]),
    };
    await Storage.setJSON(keyFor(pn, series.date), stored);
  }

  /**
   * Drops days older than KEEP_DAYS, plus the `lastGridOn:` keys an earlier
   * version kept. Runs once per app start.
   */
  export function prune(): Promise<void> {
    pruning ??= (async () => {
      const cutoff = addDays(toISODateString(new Date()), -KEEP_DAYS);
      const stale = (await Storage.keys()).filter((key) =>
        (key.startsWith(PREFIX) && key.slice(key.lastIndexOf(":") + 1) < cutoff) || key.startsWith("lastGridOn:"));
      await Promise.all(stale.map((key) => Storage.removeItem(key)));
    })().catch((error) => {
      console.error("Failed to prune the day cache:", error);
    });

    return pruning;
  }
}
