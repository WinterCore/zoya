import React, {useCallback, useEffect, useState} from "react";
import {toISODateString} from "@/lib/utils";
import {WatchPower} from "@/lib/watchpower";
import {AsyncData, AsyncDataUtils} from "@/lib/asyncdata";
import {useAuthenticatedSessionData} from "@/contexts/session";

export const useDeviceData = (deviceInfo: WatchPower.DeviceInfo, isoDateString: string = toISODateString(new Date())) => {
  const [data, setData] = React.useState<AsyncData<readonly WatchPower.InverterDataPoint[]>>(AsyncDataUtils.loading());
  const session = useAuthenticatedSessionData();
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    const abortController = new AbortController();

    const load = async () => {
      setData(AsyncDataUtils.loadingWithData);

      try {
        const dayData = await WatchPower.getDeviceData(session, deviceInfo, isoDateString);

        if (abortController.signal.aborted) {
          return;
        }

        setData(dayData);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        setData(AsyncDataUtils.error("An unexpected error occurred while fetching device day data."));
        console.error("Failed to fetch device day data:", error);
      }
    };

    load();

    return () => abortController.abort();
  }, [session, deviceInfo, isoDateString, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data,
    reload,
  };
};
