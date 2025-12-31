import { Storage } from './storage';
import { Statistics } from './statistics';
import { WatchPower } from './watchpower';

const LAST_GRID_ON_KEY = 'lastGridOnTimestamp';

export namespace GridCache {
  /**
   * Get the cached last grid on timestamp.
   */
  export async function getLastGridOnTimestamp(): Promise<Date | null> {
    const cached = await Storage.getItem(LAST_GRID_ON_KEY);
    if (!cached) {
      return null;
    }
    return new Date(cached);
  }

  /**
   * Update the cache with the last grid on timestamp from the provided data.
   * Only updates if the new timestamp is more recent than the cached one.
   */
  export async function updateFromData(data: readonly WatchPower.InverterDataPoint[]): Promise<Date | null> {
    const lastGridOn = Statistics.getLastGridOnTimestamp(data);

    if (lastGridOn) {
      const cached = await getLastGridOnTimestamp();

      // Only update if newer than cached
      if (!cached || lastGridOn.getTime() > cached.getTime()) {
        await Storage.setItem(LAST_GRID_ON_KEY, lastGridOn.toISOString());
        return lastGridOn;
      }

      return cached;
    }

    // No grid on in this data, return cached value
    return await getLastGridOnTimestamp();
  }

  /**
   * Get hours since last grid on, using cached timestamp.
   */
  export async function getHoursSinceLastGridOn(): Promise<number | null> {
    const lastGridOn = await getLastGridOnTimestamp();
    return Statistics.getHoursSinceLastGridOn(lastGridOn);
  }

  /**
   * Clear the cache.
   */
  export async function clear(): Promise<void> {
    await Storage.removeItem(LAST_GRID_ON_KEY);
  }
}
