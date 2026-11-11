import React from "react";

interface Props {
  readonly children: React.ReactNode;
  readonly className?: string;
}

export const Card = ({ children, className = "" }: Props) => {
  return (
    <div className={`rounded-lg border border-line bg-card shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] ${className}`}>
      {children}
    </div>
  );
};
