import {Storage} from "@/lib/storage";
import {WatchPower} from "@/lib/watchpower";
import React, {useCallback, useEffect, useMemo, useState} from "react";

type NamedDevice = Pick<WatchPower.DeviceInfo, "pn" | "devalias">;

interface DeviceNamesContextValue {
  /** The local name if the device was renamed, otherwise its WatchPower alias. */
  readonly displayName: (device: NamedDevice) => string;
  readonly customName: (pn: string) => string | undefined;
  /** Saves a local name for the device; an empty name restores the original. */
  readonly rename: (pn: string, name: string) => void;
}

// Names live only on this device, keyed by the device PN.
const DEVICE_NAMES_KEY = "deviceNames";

const DeviceNamesContext = React.createContext<DeviceNamesContextValue | null>(null);

export const DeviceNamesProvider = (props: React.PropsWithChildren) => {
  const { children } = props;
  const [names, setNames] = useState<Readonly<Record<string, string>> | null>(null);

  useEffect(() => {
    Storage.getJSON<Record<string, string>>(DEVICE_NAMES_KEY)
      .catch((error) => {
        console.error("Failed to load device names:", error);
        return null;
      })
      .then((saved) => setNames(saved ?? {}));
  }, []);

  const rename = useCallback((pn: string, name: string) => {
    const next = { ...names };
    const trimmed = name.trim();

    if (trimmed) {
      next[pn] = trimmed;
    } else {
      delete next[pn];
    }

    setNames(next);
    Storage.setJSON(DEVICE_NAMES_KEY, next)
      .catch((error) => console.error("Failed to save device names:", error));
  }, [names]);

  const value = useMemo((): DeviceNamesContextValue => ({
    displayName: (device) => names?.[device.pn] ?? device.devalias,
    customName: (pn) => names?.[pn],
    rename,
  }), [names, rename]);

  // Wait for saved names so the original alias never flashes first.
  if (!names) {
    return null;
  }

  return (
    <DeviceNamesContext.Provider value={value}>
      {children}
    </DeviceNamesContext.Provider>
  );
};

export const useDeviceNames = (): DeviceNamesContextValue => {
  const context = React.useContext(DeviceNamesContext);

  if (!context) {
    throw new Error("useDeviceNames must be used within a DeviceNamesProvider");
  }

  return context;
};
