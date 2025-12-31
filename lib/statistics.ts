import {WatchPower} from "./watchpower";

export namespace Statistics {
  export interface GridOnPeriod {
    readonly start: Date;
    readonly end: Date;
  }

  export const getGridOnPeriods = (data: readonly WatchPower.InverterDataPoint[]): GridOnPeriod[] => {
    const periods: GridOnPeriod[] = [];
    const MAX_GAP_MS = 15 * 60 * 1000; // 15 minutes - tolerates 1 missed record (10 min interval)

    let currentPeriodStart: Date | null = null;
    let lastGridOnTimestamp: Date | null = null;

    for (let i = 0; i < data.length; i += 1) {
      const point = data[i];
      const isGridOn = point.gridVoltage > 0;
      const currentTimestamp = new Date(point.timestamp);

      if (isGridOn) {
        // Check for gap in data that's too large (e.g., internet outage)
        if (lastGridOnTimestamp !== null) {
          const gap = currentTimestamp.getTime() - lastGridOnTimestamp.getTime();
          if (gap > MAX_GAP_MS) {
            // Gap too large - close current period and start a new one
            if (currentPeriodStart !== null) {
              periods.push({ start: new Date(currentPeriodStart), end: lastGridOnTimestamp });
            }
            currentPeriodStart = currentTimestamp;
          }
        }

        if (currentPeriodStart === null) {
          currentPeriodStart = currentTimestamp;
        }
        lastGridOnTimestamp = currentTimestamp;
      } else {
        if (currentPeriodStart !== null && lastGridOnTimestamp !== null) {
          periods.push({ start: new Date(currentPeriodStart), end: lastGridOnTimestamp });
          currentPeriodStart = null;
          lastGridOnTimestamp = null;
        }
      }
    }

    // If the grid is still on at the last data point, create a final period
    if (currentPeriodStart !== null && lastGridOnTimestamp !== null) {
      periods.push({ start: new Date(currentPeriodStart), end: lastGridOnTimestamp });
    }

    return periods;
  };

  interface GridHours {
    readonly hours: number;
    readonly percentage: number;
  }

  export const getGridHours = (data: readonly WatchPower.InverterDataPoint[]): GridHours => {
    if (data.length === 0) {
      return { hours: 0, percentage: 0 };
    }

    const gridPeriods = getGridOnPeriods(data);
    const totalGridMilliseconds = gridPeriods.reduce((acc, period) => acc + (period.end.getTime() - period.start.getTime()), 0);
    const startDate = new Date(data[0]!.timestamp);
    startDate.setHours(0, 0, 0, 0);
    const currentDate = new Date(data.at(-1)!.timestamp);
    const totalDayMilliseconds = currentDate.getTime() - startDate.getTime();

    const hours = totalGridMilliseconds / (1000 * 60 * 60);
    const percentage = totalDayMilliseconds > 0 ? (totalGridMilliseconds / totalDayMilliseconds) : 0;

    return { hours, percentage };
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
      timestamp: new Date(latestPoint.timestamp),
    };
  }
  
  export const getCurrentConsumption = (data: readonly WatchPower.InverterDataPoint[]): number => {
    if (data.length === 0) {
      return 0;
    }

    const latestPoint = data.at(-1)!;
    return latestPoint.acOutputActivePower;;
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

  /**
   * Gets the timestamp of the last time the grid was on.
   * Returns null if grid was never on in the provided data.
   */
  export const getLastGridOnTimestamp = (data: readonly WatchPower.InverterDataPoint[]): Date | null => {
    if (data.length === 0) {
      return null;
    }

    // Iterate backwards to find the last point where grid was on
    for (let i = data.length - 1; i >= 0; i--) {
      const point = data[i];
      if (point.gridVoltage > 0) {
        return new Date(point.timestamp.replace(' ', 'T'));
      }
    }

    return null;
  }

  /**
   * Calculates hours since the grid was last on.
   * Returns null if no last grid on timestamp is provided.
   */
  export const getHoursSinceLastGridOn = (lastGridOnTimestamp: Date | null): number | null => {
    if (!lastGridOnTimestamp) {
      return null;
    }

    const now = new Date();
    const diffMs = now.getTime() - lastGridOnTimestamp.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  export interface HourlyBatteryLevel {
    readonly hour: number;
    readonly percentage: number;
  }

  /**
   * Gets hourly battery levels for a day.
   * Uses the last data point of each hour to show battery trend throughout the day.
   * @param data Array of inverter data points
   * @returns Array of 24 hourly battery levels (0-23 hours)
   */
  export const getHourlyBatteryLevels = (data: readonly WatchPower.InverterDataPoint[]): HourlyBatteryLevel[] => {
    const hourlyBattery: HourlyBatteryLevel[] = [];
    const dataByHour = new Map<number, WatchPower.InverterDataPoint[]>();

    // Group data points by hour
    data.forEach((point) => {
      const date = new Date(point.timestamp);
      const hour = date.getHours();

      if (!dataByHour.has(hour)) {
        dataByHour.set(hour, []);
      }
      dataByHour.get(hour)!.push(point);
    });

    // Get the last data point for each hour (shows end-of-hour battery state)
    for (let hour = 0; hour < 24; hour++) {
      const pointsInHour = dataByHour.get(hour) || [];
      const percentage = pointsInHour.length > 0
        ? pointsInHour[pointsInHour.length - 1].batteryCapacity
        : 0;
      hourlyBattery.push({ hour, percentage });
    }

    return hourlyBattery;
  }
}
