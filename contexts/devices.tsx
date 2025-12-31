import {WatchPower} from "@/lib/watchpower";
import React from "react";

interface DevicesContextValue {
  readonly devices: readonly WatchPower.DeviceInfo[];
}

export const DevicesContext = React.createContext<DevicesContextValue | null>(null);

export const DevicesProvider = (props: React.PropsWithChildren<DevicesContextValue>) => {
  const { children, devices } = props;

  return (
    <DevicesContext.Provider value={{ devices }}>
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
