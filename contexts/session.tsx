import {WatchPower} from "@/lib/watchpower";
import React, {useCallback, useMemo, useRef, useState} from "react";
import {ActivityIndicator, Text, View} from "react-native";
import {useTheme} from "@react-navigation/native";
import {Storage} from "@/lib/storage";

interface SessionContextValue {
  readonly session: WatchPower.SessionData | null;
  readonly setSession: (session: WatchPower.SessionData | null) => void;
  readonly withAuthRetry: <T>(fn: (session: WatchPower.SessionData) => Promise<T>) => Promise<T>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export const SessionProvider = (props: React.PropsWithChildren) => {
  const { children } = props;
  
  const [isLoading, setLoading] = useState(true);
  const [session, setSession] = React.useState<WatchPower.SessionData | null>(null);
  const theme = useTheme();
  const sessionRef = useRef(session);
  const refreshPromiseRef = useRef<Promise<WatchPower.SessionData> | null>(null);

  React.useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshSession = useCallback(async (): Promise<WatchPower.SessionData> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async () => {
      const credentialsData = await Storage.getItem("credentials");
      if (!credentialsData) {
        setSession(null);
        await Storage.removeItem("sessionData");
        throw new Error("No credentials stored");
      }

      const credentials: { email: string; password: string } = JSON.parse(credentialsData);
      const result = await WatchPower.login(credentials.email, credentials.password);

      if (result.type === "error") {
        setSession(null);
        await Storage.removeItem("sessionData");
        await Storage.removeItem("credentials");
        throw new Error(result.message);
      }

      await Storage.setItem("sessionData", JSON.stringify(result.data));
      setSession(result.data);
      return result.data;
    })().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = promise;
    return promise;
  }, []);

  const withAuthRetry = useCallback(async <T,>(fn: (session: WatchPower.SessionData) => Promise<T>): Promise<T> => {
    let activeSession = sessionRef.current;
    if (!activeSession) {
      throw new Error("Not authenticated");
    }

    if (activeSession.expiresAt <= Date.now()) {
      activeSession = await refreshSession();
    }

    return fn(activeSession);
  }, [refreshSession]);

  React.useEffect(() => {
    const loadSession = async () => {
      const sessionData = await Storage.getItem("sessionData");

      if (sessionData) {
        const parsed: WatchPower.SessionData = JSON.parse(sessionData);

        if (parsed.expiresAt > Date.now()) {
          setSession(parsed);
        } else {
          const credentialsData = await Storage.getItem("credentials");

          if (credentialsData) {
            const credentials: { email: string; password: string } = JSON.parse(credentialsData);
            const result = await WatchPower.login(credentials.email, credentials.password);

            if (result.type === "success") {
              await Storage.setItem("sessionData", JSON.stringify(result.data));
              setSession(result.data);
            } else {
              await Storage.removeItem("sessionData");
            }
          } else {
            await Storage.removeItem("sessionData");
          }
        }
      }

      setLoading(false);
    };

    loadSession();
  }, []);

  const value = useMemo((): SessionContextValue => {
    return {
      session,
      setSession,
      withAuthRetry,
    };
  }, [session, withAuthRetry]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size={80} color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const value = React.useContext(SessionContext);

  if (!value) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return value;
}

export const useAuthenticatedSessionData = (): WatchPower.SessionData => {
  const session = useSession();

  if (!session.session) {
    throw new Error("useRequireSession must be used within an authenticated SessionProvider");
  }

  return session.session;
}
