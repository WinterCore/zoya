import {useState} from "react";
import {createPortal} from "react-dom";
import {useDeviceNames} from "@/contexts/deviceNames";
import {useBackHandler} from "@/hooks/useBackHandler";
import {WatchPower} from "@/lib/watchpower";

interface Props {
  readonly device: Pick<WatchPower.DeviceInfo, "pn" | "devalias">;
  readonly onClose: () => void;
}

export const RenameDeviceDialog = ({ device, onClose }: Props) => {
  const { customName, rename } = useDeviceNames();
  const savedName = customName(device.pn);
  const [name, setName] = useState(savedName ?? device.devalias);

  useBackHandler(() => {
    onClose();
    return true;
  });

  const save = () => {
    // Saving the original alias (or nothing) just drops the custom name.
    rename(device.pn, name.trim() === device.devalias ? "" : name);
    onClose();
  };

  const reset = () => {
    rename(device.pn, "");
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-device-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="w-full max-w-sm rounded-xl border border-line bg-card p-5 shadow-xl"
      >
        <h2 id="rename-device-title" className="text-lg font-medium text-white">Rename device</h2>
        <p className="mt-1 text-sm text-muted">
          The new name is only kept in this app. WatchPower name: {device.devalias}
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={(e) => e.target.select()}
          maxLength={40}
          aria-label="Device name"
          className="mt-4 w-full rounded-[10px] border border-line bg-night px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#888] focus:border-grid"
          placeholder={device.devalias}
        />
        <div className="mt-5 flex items-center gap-1">
          {savedName !== undefined && (
            <button type="button" onClick={reset} className="rounded-lg px-2 py-2 text-sm text-grid active:bg-line">
              Reset name
            </button>
          )}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-[#bbb] active:bg-line">
            Cancel
          </button>
          <button type="submit" className="rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white active:opacity-80">
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
};
