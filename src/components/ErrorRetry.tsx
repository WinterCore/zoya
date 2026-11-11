interface Props {
  readonly message?: string;
  readonly onRetry: () => void;
}

export const ErrorRetry = ({ message = "An error occurred! Please try again.", onRetry }: Props) => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-5">
      <p className="text-center text-base text-danger">{message}</p>
      <button type="button" onClick={onRetry} className="rounded-lg p-[15px] text-sm font-bold text-white active:opacity-70">
        Retry
      </button>
    </div>
  );
};
