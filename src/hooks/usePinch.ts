import {useEffect, useEffectEvent} from "react";

export interface PinchUpdate {
  /** Finger spread now, relative to the start: above 1 when spreading. */
  readonly scale: number;
  /** Midpoint between the fingers at the start, in px from the element's left edge. */
  readonly startX: number;
  /** Midpoint between the fingers now, in px from the element's left edge. */
  readonly x: number;
}

interface PinchHandlers {
  readonly onStart: () => void;
  readonly onMove: (update: PinchUpdate) => void;
  readonly onEnd: () => void;
}

/**
 * Two-finger pinch and drag on an element. While two fingers are down the
 * page doesn't scroll; one-finger touches are left alone.
 * Pass the element from a callback ref (`ref={setElement}`).
 */
export const usePinch = (element: HTMLElement | null, handlers: PinchHandlers) => {
  const onStart = useEffectEvent(handlers.onStart);
  const onMove = useEffectEvent(handlers.onMove);
  const onEnd = useEffectEvent(handlers.onEnd);

  useEffect(() => {
    if (!element) {
      return;
    }

    let start: { distance: number; x: number } | null = null;

    const measure = (touches: TouchList) => {
      const [a, b] = [touches[0], touches[1]];
      return {
        distance: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
        x: (a.clientX + b.clientX) / 2 - element.getBoundingClientRect().left,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        start = measure(e.touches);
        onStart();
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!start || e.touches.length < 2) {
        return;
      }

      // Two-finger moves belong to the pinch, not to page scrolling.
      if (e.cancelable) {
        e.preventDefault();
      }

      const current = measure(e.touches);
      onMove({ scale: current.distance / start.distance, startX: start.x, x: current.x });
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (start && e.touches.length < 2) {
        start = null;
        onEnd();
      }
    };

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);

    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [element]);
};
