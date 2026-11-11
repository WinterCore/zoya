import React from "react";

interface DrawerContextValue {
  readonly isOpen: boolean;
  readonly open: () => void;
  readonly close: () => void;
}

export const DrawerContext = React.createContext<DrawerContextValue | null>(null);

export const useDrawer = (): DrawerContextValue => {
  const context = React.useContext(DrawerContext);

  if (!context) {
    throw new Error("useDrawer must be used within an AppShell");
  }

  return context;
};
