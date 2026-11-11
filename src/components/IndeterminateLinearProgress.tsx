interface Props {
  readonly visible?: boolean;
}

export const IndeterminateLinearProgress = ({ visible = true }: Props) => {
  return (
    <div className="h-[3px] shrink-0">
      {visible && (
        <div className="h-full overflow-hidden bg-line">
          <div className="h-full w-[30%] animate-progress bg-grid" />
        </div>
      )}
    </div>
  );
};
