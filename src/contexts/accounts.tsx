import {WatchPower} from "@/lib/watchpower";
import {Storage} from "@/lib/storage";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";

export interface SavedAccount {
  readonly username: string;
  readonly password: string;
  readonly session: WatchPower.SessionData | null;
}

/** The device to open on launch; without a pn, the account's first device. */
export interface LastDevice {
  readonly username: string;
  readonly pn?: string;
}

export type LoginResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string };

interface AccountsContextValue {
  readonly accounts: readonly SavedAccount[];
  readonly signedIn: boolean;
  /** Accounts whose saved password was rejected by the API. */
  readonly failed: ReadonlySet<string>;
  readonly lastDevice: LastDevice | null;
  readonly login: (username: string, password: string) => Promise<LoginResult>;
  readonly enter: (username: string) => Promise<LoginResult>;
  readonly forget: (username: string) => Promise<void>;
  readonly logout: () => void;
  readonly setLastDevice: (lastDevice: LastDevice) => void;
  readonly withAuthRetry: <T>(username: string, fn: (session: WatchPower.SessionData) => Promise<T>) => Promise<T>;
}

const ACCOUNTS_KEY = "accounts";
const SIGNED_IN_KEY = "signedIn";
const LAST_DEVICE_KEY = "lastDevice";

export const devicesCacheKey = (username: string) => `cachedDevices:${username}`;

class CredentialError extends Error {}

// Writes are chained so a slow write can never land after a newer one.
let writeQueue: Promise<void> = Promise.resolve();
const persist = (key: string, value: unknown) => {
  writeQueue = writeQueue
    .then(() => Storage.setJSON(key, value))
    .catch((error) => console.error(`Failed to save "${key}":`, error));
};

const isExpired = (session: WatchPower.SessionData | null) => !session || session.expiresAt <= Date.now();

const AccountsContext = React.createContext<AccountsContextValue | null>(null);

export const AccountsProvider = (props: React.PropsWithChildren<{ readonly fallback: React.ReactNode }>) => {
  const { children, fallback } = props;

  const [isLoading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<readonly SavedAccount[]>([]);
  const [signedIn, setSignedInState] = useState(false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const [lastDevice, setLastDeviceState] = useState<LastDevice | null>(null);

  // The source of truth for code that runs outside render (session refreshes).
  const accountsRef = useRef<readonly SavedAccount[]>([]);
  const refreshesRef = useRef(new Map<string, Promise<WatchPower.SessionData>>());

  useEffect(() => {
    const load = async () => {
      const [savedAccounts, savedSignedIn, savedLastDevice] = await Promise.all([
        Storage.getJSON<SavedAccount[]>(ACCOUNTS_KEY),
        Storage.getJSON<boolean>(SIGNED_IN_KEY),
        Storage.getJSON<LastDevice>(LAST_DEVICE_KEY),
      ]);

      accountsRef.current = savedAccounts ?? [];
      setAccounts(accountsRef.current);
      setSignedInState(!!savedSignedIn && accountsRef.current.length > 0);
      setLastDeviceState(savedLastDevice);
    };

    load()
      .catch((error) => console.error("Failed to load saved accounts:", error))
      .finally(() => setLoading(false));
  }, []);

  const updateAccounts = useCallback((fn: (prev: readonly SavedAccount[]) => readonly SavedAccount[]) => {
    accountsRef.current = fn(accountsRef.current);
    setAccounts(accountsRef.current);
    persist(ACCOUNTS_KEY, accountsRef.current);
  }, []);

  const setSignedIn = useCallback((value: boolean) => {
    setSignedInState(value);
    persist(SIGNED_IN_KEY, value);
  }, []);

  const setLastDevice = useCallback((value: LastDevice | null) => {
    setLastDeviceState(value);
    persist(LAST_DEVICE_KEY, value);
  }, []);

  const markFailed = useCallback((username: string, isFailed: boolean) => {
    setFailed((prev) => {
      if (prev.has(username) === isFailed) {
        return prev;
      }

      const next = new Set(prev);
      if (isFailed) {
        next.add(username);
      } else {
        next.delete(username);
      }
      return next;
    });
  }, []);

  /** Logs in again with the saved password. Concurrent calls share one request. */
  const refreshSession = useCallback((username: string): Promise<WatchPower.SessionData> => {
    const pending = refreshesRef.current.get(username);
    if (pending) {
      return pending;
    }

    const promise = (async () => {
      const account = accountsRef.current.find((a) => a.username === username);
      if (!account) {
        throw new Error(`No saved account for ${username}`);
      }

      const result = await WatchPower.login(account.username, account.password);

      if (result.type === "error") {
        if (WatchPower.isCredentialError(result.err)) {
          markFailed(username, true);
          throw new CredentialError(result.message);
        }
        throw new Error(result.message);
      }

      markFailed(username, false);
      updateAccounts((prev) => prev.map((a) => a.username === username ? { ...a, session: result.data } : a));
      return result.data;
    })().finally(() => {
      refreshesRef.current.delete(username);
    });

    refreshesRef.current.set(username, promise);
    return promise;
  }, [markFailed, updateAccounts]);

  const withAuthRetry = useCallback(async <T,>(username: string, fn: (session: WatchPower.SessionData) => Promise<T>): Promise<T> => {
    const account = accountsRef.current.find((a) => a.username === username);
    if (!account) {
      throw new Error("Not authenticated");
    }

    const session = isExpired(account.session) ? await refreshSession(username) : account.session!;
    return fn(session);
  }, [refreshSession]);

  const enterAccount = useCallback((username: string) => {
    // Re-entering the same account keeps the device that was open last.
    if (lastDevice?.username !== username) {
      setLastDevice({ username });
    }
    setSignedIn(true);
  }, [lastDevice, setLastDevice, setSignedIn]);

  const login = useCallback(async (rawUsername: string, password: string): Promise<LoginResult> => {
    const username = rawUsername.trim();

    try {
      const result = await WatchPower.login(username, password);

      if (result.type === "error") {
        return { ok: false, message: result.message };
      }

      const account: SavedAccount = { username, password, session: result.data };
      updateAccounts((prev) => prev.some((a) => a.username === username)
        ? prev.map((a) => a.username === username ? account : a)
        : [...prev, account]);
      markFailed(username, false);
      enterAccount(username);
      return { ok: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { ok: false, message: "Could not reach WatchPower. Check your connection and try again." };
    }
  }, [enterAccount, markFailed, updateAccounts]);

  const enter = useCallback(async (username: string): Promise<LoginResult> => {
    const account = accountsRef.current.find((a) => a.username === username);
    if (!account) {
      return { ok: false, message: "This account is no longer saved." };
    }

    if (isExpired(account.session)) {
      try {
        await refreshSession(username);
      } catch (error) {
        if (error instanceof CredentialError) {
          return { ok: false, message: "The saved password no longer works. Please log in again." };
        }
        console.error("Re-login failed:", error);
        return { ok: false, message: "Could not reach WatchPower. Check your connection and try again." };
      }
    }

    enterAccount(username);
    return { ok: true };
  }, [enterAccount, refreshSession]);

  const forget = useCallback(async (username: string) => {
    updateAccounts((prev) => prev.filter((a) => a.username !== username));
    markFailed(username, false);

    if (lastDevice?.username === username) {
      const next = accountsRef.current[0];
      setLastDevice(next ? { username: next.username } : null);
    }

    if (accountsRef.current.length === 0) {
      setSignedIn(false);
    }

    await Storage.removeItem(devicesCacheKey(username));
  }, [lastDevice, markFailed, setLastDevice, setSignedIn, updateAccounts]);

  const logout = useCallback(() => setSignedIn(false), [setSignedIn]);

  const value = useMemo((): AccountsContextValue => ({
    accounts,
    signedIn,
    failed,
    lastDevice,
    login,
    enter,
    forget,
    logout,
    setLastDevice,
    withAuthRetry,
  }), [accounts, signedIn, failed, lastDevice, login, enter, forget, logout, setLastDevice, withAuthRetry]);

  if (isLoading) {
    return fallback;
  }

  return (
    <AccountsContext.Provider value={value}>
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = (): AccountsContextValue => {
  const value = React.useContext(AccountsContext);

  if (!value) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }

  return value;
};
