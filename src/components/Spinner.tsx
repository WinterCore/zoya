interface Props {
  readonly size?: number;
  readonly color?: string;
  readonly className?: string;
}

export const Spinner = ({ size = 36, color = "var(--color-primary)", className = "" }: Props) => {
  return (
    <svg
      className={`spinner shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 50 50"
      role="progressbar"
      aria-label="Loading"
    >
      <circle cx="25" cy="25" r="20" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
};

export const CenteredSpinner = () => {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner size={80} />
    </div>
  );
};
