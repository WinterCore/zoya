import {useEffect, useEffectEvent, useState} from "react";

const THRESHOLD = 72;
const MAX_PULL = 120;
const RESISTANCE = 0.5;

interface PullState {
  /** How far the indicator is pulled down, in px. */
  readonly distance: number;
  readonly isDragging: boolean;
  readonly threshold: number;
}

/**
 * Pull-down-to-refresh for a scroll container, replacing React Native's
 * RefreshControl. Calls onRefresh when released past the threshold.
 * Pass the element from a callback ref (`ref={setElement}`).
 */
export const usePullToRefresh = (element: HTMLElement | null, onRefresh: () => void): PullState => {
  const [distance, setDistance] = useState(0);
  const [isDragging, setDragging] = useState(false);
  const refresh = useEffectEvent(onRefresh);

  useEffect(() => {
    if (!element) {
      return;
    }

    let startY: number | null = null;
    let current = 0;

    const onTouchStart = (e: TouchEvent) => {
      // Dragging across a chart moves its cursor, so it never pulls.
      const onChart = e.target instanceof Element && e.target.closest("[data-scrub]") !== null;
      startY = element.scrollTop <= 0 && !onChart ? e.touches[0].clientY : null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) {
        return;
      }

      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) {
        current = 0;
        setDistance(0);
        setDragging(false);
        return;
      }

      // Stop the page from scrolling while the indicator is being pulled.
      if (e.cancelable) {
        e.preventDefault();
      }

      current = Math.min(MAX_PULL, dy * RESISTANCE);
      setDistance(current);
      setDragging(true);
    };

    const onTouchEnd = () => {
      if (startY === null) {
        return;
      }

      if (current >= THRESHOLD) {
        refresh();
      }

      startY = null;
      current = 0;
      setDistance(0);
      setDragging(false);
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

  return { distance, isDragging, threshold: THRESHOLD };
};
