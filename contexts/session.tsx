import {WatchPower} from "@/lib/watchpower";
import React, {useMemo, useState} from "react";
import {ActivityIndicator, Text, View} from "react-native";
import {useTheme} from "@react-navigation/native";
import {Storage} from "@/lib/storage";

interface SessionContextValue {
  readonly session: WatchPower.SessionData | null;
  readonly setSession: (session: WatchPower.SessionData | null) => void;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export const SessionProvider = (props: React.PropsWithChildren) => {
  const { children } = props;
  
  const [isLoading, setLoading] = useState(true);
  const [session, setSession] = React.useState<WatchPower.SessionData | null>(null);
  const theme = useTheme();

  React.useEffect(() => {
    const loadSession = async () => {
      const sessionData = await Storage.getItem("sessionData");

      // TODO: Check if existing session is expired and try to login
      if (sessionData) {
        setSession(JSON.parse(sessionData));
      }

      setLoading(false);
    };

    loadSession();
  }, []);

  const value = useMemo((): SessionContextValue => {
    return {
      session,
      setSession,
    };
  }, [session]);

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
