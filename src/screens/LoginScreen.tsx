import {useRef, useState} from "react";
import {useLocation, useNavigate} from "react-router";
import {MdClose} from "react-icons/md";
import {useAccounts} from "@/contexts/accounts";
import {useBackHandler} from "@/hooks/useBackHandler";
import type {LoginRouteState} from "@/lib/routes";
import {Spinner} from "@/components/Spinner";

const inputClass = "w-full rounded-[10px] border border-line bg-night px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#888]";

interface SavedAccountsProps {
  readonly busyUsername: string | null;
  readonly disabled: boolean;
  readonly onEnter: (username: string) => void;
}

const SavedAccounts = ({ busyUsername, disabled, onEnter }: SavedAccountsProps) => {
  const { accounts, failed, forget } = useAccounts();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (accounts.length === 0) {
    return null;
  }

  return (
    <section className="mb-4">
      <h2 className="mb-2 text-xs font-semibold text-subtle uppercase">Saved accounts</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-night">
        {accounts.map(({ username }) => (
          <li key={username} className="flex h-14 items-center">
            {confirming === username ? (
              <div className="flex flex-1 items-center gap-2 px-3">
                <span className="min-w-0 flex-1 truncate text-sm text-white">Remove {username}?</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(null);
                    void forget(username);
                  }}
                  className="rounded-lg px-2 py-1.5 text-sm font-semibold text-danger active:bg-line"
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="rounded-lg px-2 py-1.5 text-sm text-[#bbb] active:bg-line"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onEnter(username)}
                  className="flex h-full min-w-0 flex-1 items-center gap-3 pl-3 text-left active:bg-line disabled:opacity-60"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-active text-sm font-semibold text-white uppercase">
                    {username.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{username}</span>
                    {failed.has(username) && <span className="block text-xs text-danger">Login failed</span>}
                  </span>
                  {busyUsername === username && <Spinner size={20} color="white" />}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${username}`}
                  disabled={disabled}
                  onClick={() => setConfirming(username)}
                  className="flex h-full w-12 shrink-0 items-center justify-center text-subtle active:bg-line disabled:opacity-60"
                >
                  <MdClose size={20} />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const LoginScreen = () => {
  const { accounts, signedIn, login, enter } = useAccounts();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as LoginRouteState | null;

  const [username, setUsername] = useState(routeState?.username ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [enteringUsername, setEnteringUsername] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const isBusy = isSubmitting || enteringUsername !== null;
  const isButtonDisabled = username.trim().length === 0 || password.trim().length === 0 || isBusy;

  // Opened from the drawer ("Add account"): back returns to the app.
  const cancel = () => {
    if (location.key === "default") {
      navigate("/", { replace: true });
    } else {
      navigate(-1);
    }
  };
  useBackHandler(() => {
    cancel();
    return true;
  }, signedIn);

  const goToApp = () => navigate("/", { replace: true });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await login(username, password);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      goToApp();
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnter = async (savedUsername: string) => {
    setEnteringUsername(savedUsername);
    setError(null);

    try {
      const result = await enter(savedUsername);

      if (!result.ok) {
        // Let the user type the password again for this account.
        setError(result.message);
        setUsername(savedUsername);
        setPassword("");
        passwordRef.current?.focus();
        return;
      }

      goToApp();
    } finally {
      setEnteringUsername(null);
    }
  };

  return (
    <div className="screen-gradient h-full overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center px-6 pt-safe pb-safe">
        <div className="w-full max-w-[400px] p-3">
          <div className="mb-6 flex justify-center">
            <img src="/logo.png" alt="" className="size-[100px]" />
          </div>
          <h1 className="text-center text-[28px] font-semibold text-white">Zoya</h1>
          <p className="mt-2 mb-6 text-center text-sm text-[#ddd]">Log in to continue</p>

          <SavedAccounts
            busyUsername={enteringUsername}
            disabled={isBusy}
            onEnter={(saved) => void handleEnter(saved)}
          />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isButtonDisabled) {
                void handleSubmit();
              }
            }}
          >
            {accounts.length > 0 && (
              <h2 className="mt-6 text-xs font-semibold text-subtle uppercase">Log in with another account</h2>
            )}

            <label htmlFor="username" className="mt-3 mb-1.5 block text-sm text-[#ddd]">Username</label>
            <input
              id="username"
              className={inputClass}
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <label htmlFor="password" className="mt-3 mb-1.5 block text-sm text-[#ddd]">Password</label>
            <input
              id="password"
              ref={passwordRef}
              autoFocus={!!routeState?.username}
              className={inputClass}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <p role="alert" className="mt-5 min-h-[18px] text-center text-[13px] text-error">
              {error ?? " "}
            </p>

            <button
              type="submit"
              disabled={isButtonDisabled}
              className={`mt-5 flex h-11 w-full items-center justify-center rounded-[10px] text-base font-semibold text-white ${isButtonDisabled ? "bg-[#555] opacity-70" : "bg-primary active:opacity-80"}`}
            >
              {isSubmitting ? <Spinner size={22} color="white" /> : "Log in"}
            </button>

            {signedIn && (
              <button
                type="button"
                onClick={cancel}
                className="mt-3 h-11 w-full rounded-[10px] text-sm font-medium text-[#ddd] active:bg-line"
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
