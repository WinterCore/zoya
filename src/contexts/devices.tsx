import {devicesCacheKey, useAccounts} from "@/contexts/accounts";
import {type AsyncData, AsyncDataUtils} from "@/lib/asyncdata";
import {Storage} from "@/lib/storage";
import {WatchPower} from "@/lib/watchpower";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";

type DevicesData = AsyncData<readonly WatchPower.DeviceInfo[]>;

export interface DeviceGroup {
  readonly username: string;
  readonly devices: DevicesData;
}

interface DevicesContextValue {
  /** One group per saved account, in the order the accounts were added. */
  readonly groups: readonly DeviceGroup[];
  readonly reload: (username: string) => void;
}

const DevicesContext = React.createContext<DevicesContextValue | null>(null);

export const DevicesProvider = (props: React.PropsWithChildren) => {
  const { children } = props;
  const { accounts, withAuthRetry } = useAccounts();
  const [byUsername, setByUsername] = useState<Readonly<Record<string, DevicesData>>>({});
  const controllersRef = useRef(new Map<string, AbortController>());

  const load = useCallback(async (username: string) => {
    controllersRef.current.get(username)?.abort();
    const controller = new AbortController();
    controllersRef.current.set(username, controller);

    const update = (fn: (current: DevicesData) => DevicesData) => {
      if (!controller.signal.aborted) {
        setByUsername((prev) => ({ ...prev, [username]: fn(prev[username] ?? AsyncDataUtils.loading()) }));
      }
    };

    // Keep showing whatever we already have while loading.
    update(AsyncDataUtils.loadingWithData);

    // Try to load from cache first
    try {
      const cached = await Storage.getJSON<WatchPower.DeviceInfo[]>(devicesCacheKey(username));
      if (cached) {
        update((current) => current.type === "success" ? current : { type: "success", data: cached, isLoading: true });
      }
    } catch (error) {
      // Cache read failed, continue with network fetch
      console.error(`Failed to read cached devices for ${username}:`, error);
    }

    // Only show an error if we have nothing to fall back on
    const fail = (message: string) => update((current) => current.type === "success"
      ? AsyncDataUtils.success(current.data)
      : AsyncDataUtils.error(message));

    // Fetch fresh data from network
    try {
      const result = await withAuthRetry(username, (session) => WatchPower.getDevices(session));

      if (result.type === "success") {
        update(() => AsyncDataUtils.success(result.data));
        if (!controller.signal.aborted) {
          await Storage.setJSON(devicesCacheKey(username), result.data);
        }
      } else {
        fail(result.message);
      }
    } catch (error) {
      console.error(`Error loading devices for ${username}:`, error);
      fail("An unexpected error occurred while loading devices.");
    }
  }, [withAuthRetry]);

  // Load each account once; newly added accounts are picked up as they appear.
  useEffect(() => {
    const controllers = controllersRef.current;
    const usernames = new Set(accounts.map((account) => account.username));

    for (const username of usernames) {
      if (!controllers.has(username)) {
        void load(username);
      }
    }

    for (const [username, controller] of controllers) {
      if (!usernames.has(username)) {
        controller.abort();
        controllers.delete(username);
      }
    }
  }, [accounts, load]);

  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  const reload = useCallback((username: string) => void load(username), [load]);

  const groups = useMemo(() => accounts.map((account): DeviceGroup => ({
    username: account.username,
    devices: byUsername[account.username] ?? AsyncDataUtils.loading(),
  })), [accounts, byUsername]);

  const value = useMemo(() => ({ groups, reload }), [groups, reload]);

  return (
    <DevicesContext.Provider value={value}>
      {children}
    </DevicesContext.Provider>
  );
};

export const useDevices = (): DevicesContextValue => {
  const context = React.useContext(DevicesContext);

  if (!context) {
    throw new Error("useDevices must be used within a DevicesProvider");
  }

  return context;
};
