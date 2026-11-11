import React, {useEffect, useRef} from "react";

const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

/**
 * Pointer handlers for an element that does `onPress` on a tap and
 * `onLongPress` when held. A long press swallows the click that follows it.
 */
export const useLongPress = (onPress: () => void, onLongPress: () => void) => {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);

  const cancel = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => cancel, []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      firedRef.current = false;
      startRef.current = { x: e.clientX, y: e.clientY };
      cancel();
      timerRef.current = window.setTimeout(() => {
        firedRef.current = true;
        timerRef.current = null;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const start = startRef.current;
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) {
        cancel();
      }
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (!firedRef.current) {
        onPress();
      }
      firedRef.current = false;
    },
  };
};
