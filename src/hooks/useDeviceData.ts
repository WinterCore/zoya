import {useCallback, useEffect, useState} from "react";
import {WatchPower} from "@/lib/watchpower";
import {type AsyncData, AsyncDataUtils} from "@/lib/asyncdata";
import {useAccounts} from "@/contexts/accounts";

export const useDeviceData = (username: string, device: WatchPower.DeviceAddress, isoDateString: string) => {
  const [data, setData] = useState<AsyncData<readonly WatchPower.InverterDataPoint[]>>(AsyncDataUtils.loading());
  const { withAuthRetry } = useAccounts();
  const [nonce, setNonce] = useState(0);
  const { pn, devcode, sn, devaddr } = device;

  useEffect(() => {
    const abortController = new AbortController();

    const load = async () => {
      setData(AsyncDataUtils.loadingWithData);

      try {
        const dayData = await withAuthRetry(username, (session) => WatchPower.getDeviceData(session, { pn, devcode, sn, devaddr }, isoDateString));

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
  }, [withAuthRetry, username, pn, devcode, sn, devaddr, isoDateString, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data,
    reload,
  };
};
