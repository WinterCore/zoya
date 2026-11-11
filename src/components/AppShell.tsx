import {useCallback, useMemo, useRef, useState} from "react";
import {Outlet} from "react-router";
import {DrawerContext} from "@/contexts/drawer";
import {useBackHandler} from "@/hooks/useBackHandler";
import {Drawer, DRAWER_WIDTH} from "./Drawer";

/**
 * Layout for the signed-in screens. The drawer sits behind the screen, which
 * slides right to reveal it (React Navigation's "back" drawer type).
 */
export const AppShell = () => {
  const [isOpen, setOpen] = useState(false);
  const swipeStartRef = useRef<number | null>(null);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  useBackHandler(() => {
    close();
    return true;
  }, isOpen);

  return (
    <DrawerContext.Provider value={value}>
      <div className="relative h-full overflow-hidden bg-night">
        <Drawer isOpen={isOpen} onClose={close} />

        <div
          className="absolute inset-0 z-10 flex flex-col bg-night transition-transform duration-250 ease-out"
          style={{ transform: isOpen ? `translateX(${DRAWER_WIDTH}px)` : "none" }}
          inert={isOpen}
        >
          <Outlet />
        </div>

        {/* Dims the screen while the drawer is open; tap or swipe left to close. */}
        <div
          aria-hidden
          onClick={close}
          onTouchStart={(e) => {
            swipeStartRef.current = e.touches[0].clientX;
          }}
          onTouchMove={(e) => {
            if (swipeStartRef.current !== null && e.touches[0].clientX - swipeStartRef.current < -40) {
              swipeStartRef.current = null;
              close();
            }
          }}
          className={`absolute inset-0 z-20 bg-black/50 transition-[opacity,transform] duration-250 ease-out ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
          style={{ transform: isOpen ? `translateX(${DRAWER_WIDTH}px)` : "none" }}
        />
      </div>
    </DrawerContext.Provider>
  );
};
