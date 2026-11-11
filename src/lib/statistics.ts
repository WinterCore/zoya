import {WatchPower} from "./watchpower";
import type {DaySeries, Sample} from "./daySeries";
import {addDays, parseTimestamp, startOfDay} from "./utils";

export namespace Statistics {
  /**
   * Readings further apart than this are a gap in the data (e.g. an internet
   * outage). Readings come every ~5 minutes, so one or two missed ones are tolerated.
   */
  export const MAX_GAP_MS = 15 * 60 * 1000;

  /** Usage is averaged over slots of this length. */
  export const SLOT_MS = 15 * 60 * 1000;
  /** Slots used when zoomed in; about one reading each. */
  export const FINE_SLOT_MS = 5 * 60 * 1000;

  export interface GridOnPeriod {
    /** Epoch ms of the first reading with the grid on. */
    readonly start: number;
    /** Epoch ms of the last reading with the grid on. */
    readonly end: number;
  }

  export const getGridOnPeriods = (samples: readonly Sample[]): GridOnPeriod[] => {
    const periods: GridOnPeriod[] = [];

    let currentPeriodStart: number | null = null;
    let lastGridOn: number | null = null;

    for (const sample of samples) {
      if (sample.gridOn) {
        // A gap that's too large closes the current period and starts a new one
        if (lastGridOn !== null && sample.time - lastGridOn > MAX_GAP_MS) {
          periods.push({ start: currentPeriodStart!, end: lastGridOn });
          currentPeriodStart = sample.time;
        }

        currentPeriodStart ??= sample.time;
        lastGridOn = sample.time;
      } else if (currentPeriodStart !== null && lastGridOn !== null) {
        periods.push({ start: currentPeriodStart, end: lastGridOn });
        currentPeriodStart = null;
        lastGridOn = null;
      }
    }

    // If the grid is still on at the last reading, close the final period there
    if (currentPeriodStart !== null && lastGridOn !== null) {
      periods.push({ start: currentPeriodStart, end: lastGridOn });
    }

    return periods;
  };

  export interface GridHours {
    readonly hours: number;
    /** Share of the day up to the last reading, 0–1. */
    readonly percentage: number;
  }

  export const getGridHours = (series: DaySeries): GridHours => {
    const last = series.samples.at(-1);
    if (!last) {
      return { hours: 0, percentage: 0 };
    }

    const gridMs = getGridOnPeriods(series.samples).reduce((acc, period) => acc + (period.end - period.start), 0);
    const elapsedMs = last.time - startOfDay(series.date);

    return {
      hours: gridMs / (60 * 60 * 1000),
      percentage: elapsedMs > 0 ? gridMs / elapsedMs : 0,
    };
  };

  /**
   * The average of `pick` over each slot of the day, null for slots without
   * readings. A normal day has 96 slots of 15 minutes.
   */
  export const getSlotAverages = (series: DaySeries, pick: (sample: Sample) => number, slotMs = SLOT_MS): (number | null)[] => {
    const start = startOfDay(series.date);
    const count = Math.round((startOfDay(addDays(series.date, 1)) - start) / slotMs);
    const sums = new Array<number>(count).fill(0);
    const counts = new Array<number>(count).fill(0);

    for (const sample of series.samples) {
      const slot = Math.floor((sample.time - start) / slotMs);
      if (slot >= 0 && slot < count) {
        sums[slot] += pick(sample);
        counts[slot] += 1;
      }
    }

    return sums.map((sum, slot) => counts[slot] > 0 ? sum / counts[slot] : null);
  };

  export interface Extreme {
    readonly value: number;
    /** Epoch ms when the value was first reached. */
    readonly time: number;
  }

  export interface DayTotals {
    readonly fromBatteryWh: number;
    readonly chargedWh: number;
    readonly lowestBattery: Extreme | null;
    readonly peakLoad: Extreme | null;
  }

  /** Energy in Wh, from consecutive readings; gaps longer than MAX_GAP_MS count as unknown. */
  const integrate = (samples: readonly Sample[], pick: (sample: Sample) => number): number => {
    let wh = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const dt = samples[i].time - samples[i - 1].time;
      if (dt <= MAX_GAP_MS) {
        wh += ((pick(samples[i - 1]) + pick(samples[i])) / 2) * (dt / (60 * 60 * 1000));
      }
    }
    return wh;
  };

  const extreme = (samples: readonly Sample[], pick: (sample: Sample) => number, isBetter: (a: number, b: number) => boolean): Extreme | null => {
    let best: Extreme | null = null;
    for (const sample of samples) {
      const value = pick(sample);
      if (!best || isBetter(value, best.value)) {
        best = { value, time: sample.time };
      }
    }
    return best;
  };

  export const getDayTotals = (samples: readonly Sample[]): DayTotals => ({
    fromBatteryWh: integrate(samples, (s) => s.dischargeW),
    chargedWh: integrate(samples, (s) => s.chargeW),
    lowestBattery: extreme(samples, (s) => s.battery, (a, b) => a < b),
    peakLoad: extreme(samples, (s) => s.load, (a, b) => a > b),
  });

  export interface GridRun {
    readonly gridOn: boolean;
    /**
     * Epoch ms the current state began: when the grid was last seen on (while
     * it's off), or first seen on (while it's on).
     */
    readonly since: number;
  }

  /**
   * When the grid last changed state. `days` runs from today backwards and
   * must not skip a day, or a change on the missing day would be overlooked.
   * Returns null when no change is found.
   */
  export const getCurrentRun = (days: readonly (readonly Sample[])[]): GridRun | null => {
    const latest = days[0]?.at(-1);
    if (!latest) {
      return null;
    }

    let later = latest;
    for (const samples of days) {
      for (let i = samples.length - 1; i >= 0; i -= 1) {
        const sample = samples[i];
        if (sample.gridOn !== latest.gridOn) {
          return { gridOn: latest.gridOn, since: latest.gridOn ? later.time : sample.time };
        }
        later = sample;
      }
    }

    return null;
  };

  export interface BatteryPercentageAndConsumption {
    readonly batteryPercentage: number;
    readonly consumption: number;
    readonly timestamp: Date;
  }

  export const getBatteryPercentageAndConsumption = (data: readonly WatchPower.InverterDataPoint[]): BatteryPercentageAndConsumption | null => {
    if (data.length === 0) {
      return null;
    }

    const latestPoint = data.at(-1)!;

    return {
      batteryPercentage: latestPoint.batteryCapacity,
      consumption: latestPoint.acOutputActivePower,
      timestamp: parseTimestamp(latestPoint.timestamp),
    };
  }

  export const getCurrentSolarPower = (data: readonly WatchPower.InverterDataPoint[]): number => {
    if (data.length === 0) {
      return 0;
    }

    const latestPoint = data.at(-1)!;
    return latestPoint.pv1ChargingPower + latestPoint.pv2ChargingPower;
  }

  export const isGridOn = (data: readonly WatchPower.InverterDataPoint[]): boolean => {
    if (data.length === 0) {
      return false;
    }

    const latestPoint = data.at(-1)!;
    return latestPoint.gridVoltage > 0;
  }
}
