import {useEffect, useEffectEvent} from "react";
import {pushBackHandler} from "@/lib/backButton";

/**
 * Handles the Android back button while the component is mounted and
 * `enabled` is true. Return true from the handler when it handled the press.
 */
export const useBackHandler = (handler: () => boolean, enabled = true) => {
  const onBack = useEffectEvent(handler);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return pushBackHandler(() => onBack());
  }, [enabled]);
};
