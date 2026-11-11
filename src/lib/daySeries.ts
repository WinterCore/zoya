import {WatchPower} from "./watchpower";
import {parseTimestamp} from "./utils";

/** One inverter reading, reduced to what the charts and statistics use. */
export interface Sample {
  /** Epoch ms. */
  readonly time: number;
  /** Battery charge, %. */
  readonly battery: number;
  /** AC output active power, W. */
  readonly load: number;
  /** PV charging power, W. */
  readonly solar: number;
  readonly gridOn: boolean;
  /** Power going into the battery, W. */
  readonly chargeW: number;
  /** Power drawn from the battery, W. */
  readonly dischargeW: number;
}

/** The readings of one day, oldest first. */
export interface DaySeries {
  /** ISO date ("2026-11-11"). */
  readonly date: string;
  readonly samples: readonly Sample[];
}

export const toDaySeries = (date: string, points: readonly WatchPower.InverterDataPoint[]): DaySeries => {
  const samples = points
    .map((point): Sample => ({
      time: parseTimestamp(point.timestamp).getTime(),
      battery: point.batteryCapacity,
      load: point.acOutputActivePower,
      solar: point.pv1ChargingPower + point.pv2ChargingPower,
      gridOn: point.gridVoltage > 0,
      chargeW: point.batteryChargingCurrent * point.batteryVoltage,
      dischargeW: point.batteryDischargeCurrent * point.batteryVoltage,
    }))
    .filter((sample) => Number.isFinite(sample.time))
    .sort((a, b) => a.time - b.time);

  return { date, samples };
};

/** The reading closest to `time`, or null when none is within `maxDistanceMs`. */
export const nearestSample = (samples: readonly Sample[], time: number, maxDistanceMs: number): Sample | null => {
  if (samples.length === 0) {
    return null;
  }

  // Binary search for the first reading at or after `time`.
  let lo = 0;
  let hi = samples.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].time < time) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const candidates = [samples[lo - 1], samples[lo]].filter((s): s is Sample => s !== undefined);
  const nearest = candidates.reduce((best, s) => Math.abs(s.time - time) < Math.abs(best.time - time) ? s : best);
  return Math.abs(nearest.time - time) <= maxDistanceMs ? nearest : null;
};
