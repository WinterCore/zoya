import {useCallback, useEffect, useRef, useState} from "react";
import {useAccounts} from "@/contexts/accounts";
import {type AsyncData, AsyncDataUtils} from "@/lib/asyncdata";
import {DayCache} from "@/lib/dayCache";
import {type DaySeries, toDaySeries} from "@/lib/daySeries";
import {addDays} from "@/lib/utils";
import {WatchPower} from "@/lib/watchpower";

/** How many days before today are loaded up front, for the 7-day card. */
export const HISTORY_DAYS = 6;
const MAX_CONCURRENT = 2;

type DayMap = ReadonlyMap<string, AsyncData<DaySeries>>;

/** Runs at most `max` of the given tasks at a time. */
const createLimiter = (max: number) => {
  let active = 0;
  const waiting: (() => void)[] = [];

  return async <T,>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
};

/**
 * Past days of one device, keyed by ISO date. The HISTORY_DAYS days before
 * `today` load right away; other dates load through `load`. Each day comes
 * from DayCache when possible, otherwise from the API (and is then cached).
 */
export const useDayHistory = (username: string, device: WatchPower.DeviceAddress, today: string) => {
  const { withAuthRetry } = useAccounts();
  const { pn, devcode, sn, devaddr } = device;
  // The ref is the source of truth for the async loaders; the state renders it.
  const daysRef = useRef<DayMap>(new Map());
  const [days, setDays] = useState<DayMap>(() => new Map());
  const controllerRef = useRef<AbortController | null>(null);
  const [limit] = useState(() => createLimiter(MAX_CONCURRENT));

  const update = useCallback((change: (next: Map<string, AsyncData<DaySeries>>) => void) => {
    const next = new Map(daysRef.current);
    change(next);
    daysRef.current = next;
    setDays(next);
  }, []);

  /** Loads a day unless it's loaded or already loading; failed days are tried again. */
  const load = useCallback(async (date: string) => {
    const controller = controllerRef.current;
    const current = daysRef.current.get(date);
    if (!controller || (current && current.type !== "error")) {
      return;
    }

    update((next) => next.set(date, AsyncDataUtils.loading()));

    try {
      const series = await limit(async () => {
        if (controller.signal.aborted) {
          return null;
        }

        const cached = await DayCache.get(pn, date);
        if (cached) {
          return cached;
        }

        const response = await withAuthRetry(username, (session) =>
          WatchPower.getDeviceData(session, { pn, devcode, sn, devaddr }, date));
        if (response.type === "error") {
          throw new Error(response.message);
        }

        const fetched = toDaySeries(date, response.data);
        void DayCache.set(pn, fetched).catch((error) => console.error("Failed to cache day:", error));
        return fetched;
      });

      if (series && !controller.signal.aborted) {
        update((next) => next.set(date, AsyncDataUtils.success(series)));
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error(`Failed to load ${date}:`, error);
        update((next) => next.set(date, AsyncDataUtils.error("Failed to load this day.")));
      }
    }
  }, [limit, update, withAuthRetry, username, pn, devcode, sn, devaddr]);

  const retryFailed = useCallback(() => {
    for (const [date, day] of daysRef.current) {
      if (day.type === "error") {
        void load(date);
      }
    }
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    void DayCache.prune();

    // Newest first: yesterday also tells how long the grid has been off.
    for (let i = 1; i <= HISTORY_DAYS; i += 1) {
      void load(addDays(today, -i));
    }

    return () => {
      controller.abort();
      controllerRef.current = null;
      // Forget the requests that were cut off, so the next run starts them again.
      update((next) => {
        for (const [date, day] of next) {
          if (day.type === "loading") {
            next.delete(date);
          }
        }
      });
    };
  }, [load, update, today]);

  return { days, load, retryFailed };
};
