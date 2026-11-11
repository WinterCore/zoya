interface Props {
  readonly checked: boolean;
  readonly onChange?: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly label: string;
}

export const Switch = ({ checked, onChange, disabled = false, label }: Props) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="relative h-[14px] w-[34px] shrink-0 rounded-full transition-colors disabled:opacity-50"
      style={{ backgroundColor: checked ? "#4CAF50" : "#444" }}
    >
      <span
        className="absolute top-1/2 left-0 size-5 rounded-full shadow-md transition-transform"
        style={{
          backgroundColor: checked ? "#fff" : "#888",
          transform: `translate(${checked ? 14 : 0}px, -50%)`,
        }}
      />
    </button>
  );
};
