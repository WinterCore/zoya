import React, {useCallback, useEffect, useState} from "react";
import {AsyncData, AsyncDataUtils} from "@/lib/asyncdata";
import {WatchPower} from "@/lib/watchpower";
import {useAuthenticatedSessionData} from "@/contexts/session";
import {Storage} from "@/lib/storage";

const DEVICES_CACHE_KEY = "cachedDevices";

interface UseLoadDevicesResult {
  data: AsyncData<WatchPower.DeviceInfo[]>;
  reload: () => void;
}

export const useLoadDevices = (): UseLoadDevicesResult => {
  const [data, setData] = React.useState<AsyncData<WatchPower.DeviceInfo[]>>(AsyncDataUtils.loading());
  const session = useAuthenticatedSessionData();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    const load = async () => {
      setData(AsyncDataUtils.loading());

      // console.log('trying to load devices...');

      // Try to load from cache first
      try {
        const cached = await Storage.getItem(DEVICES_CACHE_KEY);
        if (cached && !abortController.signal.aborted) {
          const cachedDevices = JSON.parse(cached) as WatchPower.DeviceInfo[];
          // console.log("Loaded devices from cache:", cachedDevices);
          setData(AsyncDataUtils.success(cachedDevices));
        }
      } catch (error) {
        console.error("Failed to read devices from cache:", error);
        // Cache read failed, continue with network fetch
      }

      // Fetch fresh data from network
      try {
        const result = await WatchPower.getDevices(session);

        if (abortController.signal.aborted) {
          return;
        }

        if (result.type === "success") {
          setData(AsyncDataUtils.success(result.data));

          if (! abortController.signal.aborted) {
            // Cache the fresh data
            await Storage.setItem(DEVICES_CACHE_KEY, JSON.stringify(result.data));
          }
        } else {
          // Only show error if we don't have cached data
          setData((current) =>
            current.type === "success"
              ? current
              : AsyncDataUtils.error(result.message ?? "Failed to load devices.")
          );
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("Error loading devices:", error);

        // Only show error if we don't have cached data
        setData((current) =>
          current.type === "success"
            ? current
            : AsyncDataUtils.error("An unexpected error occurred while loading devices.")
        );
      }
    };

    load();

    return () => {
      abortController.abort();
    };
  }, [session, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, reload };
};

export const clearDevicesCache = async (): Promise<void> => {
  await Storage.removeItem(DEVICES_CACHE_KEY);
};
