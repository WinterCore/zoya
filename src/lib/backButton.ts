import {App} from "@capacitor/app";
import {Capacitor} from "@capacitor/core";

/** Returns true when it handled the press. */
export type BackHandler = () => boolean;

const handlers: BackHandler[] = [];

/**
 * Registers a handler for the Android back button. The most recently
 * registered handler runs first; if none handles the press, the app exits.
 */
export const pushBackHandler = (handler: BackHandler): (() => void) => {
  handlers.push(handler);
  return () => {
    const index = handlers.lastIndexOf(handler);
    if (index !== -1) {
      handlers.splice(index, 1);
    }
  };
};

if (Capacitor.isNativePlatform()) {
  void App.addListener("backButton", () => {
    for (let i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i]()) {
        return;
      }
    }

    void App.exitApp();
  });
}
