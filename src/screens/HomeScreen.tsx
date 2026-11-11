import {Navigate} from "react-router";
import {type LastDevice, useAccounts} from "@/contexts/accounts";
import {type DeviceGroup, useDevices} from "@/contexts/devices";
import {devicePath} from "@/lib/routes";
import {ScreenHeader} from "@/components/ScreenHeader";
import {CenteredSpinner} from "@/components/Spinner";
import {ErrorRetry} from "@/components/ErrorRetry";

type Target =
  | { readonly type: "device"; readonly username: string; readonly pn: string }
  | { readonly type: "loading" }
  | { readonly type: "error" }
  | { readonly type: "empty" };

/**
 * The remembered device if it still exists, otherwise the first device of the
 * last-used account, otherwise the first device of any account.
 */
const pickDevice = (groups: readonly DeviceGroup[], lastDevice: LastDevice | null): Target => {
  const preferred = groups.find((group) => group.username === lastDevice?.username);

  if (preferred && lastDevice?.pn) {
    if (preferred.devices.type === "loading") {
      return { type: "loading" };
    }
    if (preferred.devices.type === "success" && preferred.devices.data.some((d) => d.pn === lastDevice.pn)) {
      return { type: "device", username: preferred.username, pn: lastDevice.pn };
    }
  }

  const ordered = preferred ? [preferred, ...groups.filter((group) => group !== preferred)] : groups;
  let hasError = false;

  for (const group of ordered) {
    // Wait for each account in turn so we don't jump past the preferred one.
    if (group.devices.type === "loading") {
      return { type: "loading" };
    }
    if (group.devices.type === "error") {
      hasError = true;
      continue;
    }

    const first = group.devices.data[0];
    if (first) {
      return { type: "device", username: group.username, pn: first.pn };
    }
  }

  return hasError ? { type: "error" } : { type: "empty" };
};

export const HomeScreen = () => {
  const { groups, reload } = useDevices();
  const { lastDevice } = useAccounts();
  const target = pickDevice(groups, lastDevice);

  if (target.type === "device") {
    return <Navigate to={devicePath(target.username, target.pn)} replace />;
  }

  return (
    <>
      <ScreenHeader title="" />
      <div className="screen-gradient flex min-h-0 flex-1 flex-col">
        {target.type === "loading" && <CenteredSpinner />}
        {target.type === "error" && (
          <ErrorRetry onRetry={() => groups.forEach((group) => reload(group.username))} />
        )}
        {target.type === "empty" && (
          <div className="flex flex-1 items-center justify-center p-5">
            <p className="text-center text-xl text-white">No devices found!</p>
          </div>
        )}
      </div>
    </>
  );
};
