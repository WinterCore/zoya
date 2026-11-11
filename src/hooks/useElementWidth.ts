import {useEffect, useState} from "react";

/**
 * The element's current width in px, kept up to date with a ResizeObserver.
 * Pass the element from a callback ref (`ref={setElement}`).
 */
export const useElementWidth = (element: HTMLElement | null): number => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return width;
};
