import React, {useState} from "react";
import {matchPath, useLocation, useNavigate} from "react-router";
import {MdAdd, MdPerson} from "react-icons/md";
import {useAccounts} from "@/contexts/accounts";
import {useDeviceNames} from "@/contexts/deviceNames";
import {type DeviceGroup, useDevices} from "@/contexts/devices";
import {useLongPress} from "@/hooks/useLongPress";
import {DEVICE_ROUTE, devicePath, type LoginRouteState} from "@/lib/routes";
import {WatchPower} from "@/lib/watchpower";
import {RenameDeviceDialog} from "./RenameDeviceDialog";
import {Spinner} from "./Spinner";

export const DRAWER_WIDTH = 260;

interface DrawerItemProps {
  readonly label: React.ReactNode;
  readonly onPress: () => void;
  readonly focused?: boolean;
  readonly className?: string;
}

const itemClass = (focused: boolean, className: string) =>
  `flex h-14 w-full items-center gap-3 rounded-full px-4 text-left text-sm font-medium select-none ${focused ? "bg-active text-white" : "active:bg-line"} ${className}`;

const DrawerItem = ({ label, onPress, focused = false, className = "text-white" }: DrawerItemProps) => {
  return (
    <button type="button" onClick={onPress} className={itemClass(focused, className)}>
      {label}
    </button>
  );
};

const DeviceItem = ({ label, onPress, onLongPress, focused = false }: DrawerItemProps & { onLongPress: () => void }) => {
  const handlers = useLongPress(onPress, onLongPress);

  return (
    <button type="button" {...handlers} className={itemClass(focused, "text-white")}>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
};

interface AccountGroupProps {
  readonly group: DeviceGroup;
  readonly activeDevice: { username: string; pn: string } | null;
  readonly onOpenDevice: (username: string, pn: string) => void;
  readonly onRenameDevice: (device: WatchPower.DeviceInfo) => void;
  readonly onRelogin: (username: string) => void;
}

const AccountGroup = ({ group, activeDevice, onOpenDevice, onRenameDevice, onRelogin }: AccountGroupProps) => {
  const { failed } = useAccounts();
  const { reload } = useDevices();
  const { displayName } = useDeviceNames();
  const { username, devices } = group;
  const loginFailed = failed.has(username);

  return (
    <section className="mt-1 first:mt-0">
      <h2 className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-subtle">
        <MdPerson size={14} className="shrink-0" />
        <span className="min-w-0 truncate">{username}</span>
      </h2>

      {loginFailed && (
        <DrawerItem
          label={<span className="leading-tight">Login failed<br /><span className="text-xs font-normal text-subtle">Tap to log in again</span></span>}
          onPress={() => onRelogin(username)}
          className="text-danger"
        />
      )}

      {devices.type === "loading" && (
        <div className="flex h-14 items-center gap-3 px-4 text-sm text-subtle">
          <Spinner size={18} />
          Loading devices…
        </div>
      )}

      {/* Retrying can't help when the password is the problem. */}
      {devices.type === "error" && !loginFailed && (
        <div className="flex h-14 items-center justify-between gap-2 px-4 text-sm">
          <span className="text-danger">Failed to load</span>
          <button type="button" onClick={() => reload(username)} className="rounded-lg px-2 py-1 font-medium text-grid active:bg-line">
            Retry
          </button>
        </div>
      )}

      {devices.type === "success" && devices.data.length === 0 && (
        <p className="flex h-14 items-center px-4 text-sm text-subtle">No devices</p>
      )}

      {devices.type === "success" && devices.data.map((device) => (
        <DeviceItem
          key={device.pn}
          label={displayName(device)}
          focused={activeDevice?.username === username && activeDevice.pn === device.pn}
          onPress={() => onOpenDevice(username, device.pn)}
          onLongPress={() => onRenameDevice(device)}
        />
      ))}
    </section>
  );
};

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const Drawer = ({ isOpen, onClose }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAccounts();
  const { groups } = useDevices();
  const [renaming, setRenaming] = useState<WatchPower.DeviceInfo | null>(null);

  const activeDevice = matchPath(DEVICE_ROUTE, location.pathname)?.params as { username: string; pn: string } | undefined;

  const go = (to: string, options?: { replace?: boolean; state?: LoginRouteState }) => {
    onClose();
    navigate(to, options);
  };

  return (
    <nav
      aria-label="Devices"
      inert={!isOpen}
      className="absolute inset-y-0 left-0 z-0 flex flex-col overflow-y-auto bg-night px-3 pt-safe pb-safe"
      style={{ width: DRAWER_WIDTH }}
    >
      <div className="flex-1 pt-3.5">
        {groups.map((group) => (
          <AccountGroup
            key={group.username}
            group={group}
            activeDevice={activeDevice ?? null}
            onOpenDevice={(username, pn) => go(devicePath(username, pn), { replace: true })}
            onRenameDevice={setRenaming}
            onRelogin={(username) => go("/login", { state: { username } })}
          />
        ))}

        <DrawerItem
          label={<><MdAdd size={20} className="-ml-0.5 shrink-0 text-subtle" />Add account</>}
          onPress={() => go("/login")}
        />
      </div>

      <div className="mt-2 border-t border-[#333] pt-2 pb-2">
        <DrawerItem label="Settings" onPress={() => go("/settings")} />
        <DrawerItem label="Logout" onPress={() => { onClose(); logout(); }} className="text-danger" />
        <a
          href="https://github.com/winterCore"
          target="_blank"
          rel="noreferrer"
          className="-my-2 flex h-14 items-center rounded-full px-4 text-[11px] font-medium text-link active:bg-line"
        >
          WinterCore
        </a>
      </div>

      {renaming && <RenameDeviceDialog device={renaming} onClose={() => setRenaming(null)} />}
    </nav>
  );
};
