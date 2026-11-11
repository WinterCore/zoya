import React from "react";
import {MdMenu} from "react-icons/md";
import {useDrawer} from "@/contexts/drawer";

interface Props {
  readonly title: string;
  readonly actions?: React.ReactNode;
}

export const ScreenHeader = ({ title, actions }: Props) => {
  const { open } = useDrawer();

  return (
    <header className="shrink-0 bg-night pt-safe">
      {/* Menu glyph at 16px and title at 54px from the edge, as in the RN header. */}
      <div className="flex h-16 items-center pr-2 pl-[5px]">
        <button
          type="button"
          aria-label="Open menu"
          onClick={open}
          className="flex size-10 items-center justify-center rounded-full text-white active:bg-line"
        >
          <MdMenu size={24} />
        </button>
        <h1 className="ml-[9px] min-w-0 flex-1 truncate text-xl font-medium text-white">{title}</h1>
        {actions}
      </div>
    </header>
  );
};

interface HeaderButtonProps {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}

export const HeaderButton = ({ label, onClick, children }: HeaderButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-white active:bg-line"
    >
      {children}
    </button>
  );
};
