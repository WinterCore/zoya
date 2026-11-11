import {useEffect, useEffectEvent} from "react";
import {App} from "@capacitor/app";

/** Runs the callback whenever the app comes back to the foreground. */
export const useOnResume = (callback: () => void) => {
  const onResume = useEffectEvent(callback);

  useEffect(() => {
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        onResume();
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);
};
