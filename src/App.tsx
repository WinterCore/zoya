import {BrowserRouter, Navigate, Outlet, Route, Routes} from "react-router";
import {AccountsProvider, useAccounts} from "@/contexts/accounts";
import {DeviceNamesProvider} from "@/contexts/deviceNames";
import {DevicesProvider} from "@/contexts/devices";
import {AppShell} from "@/components/AppShell";
import {DEVICE_ROUTE} from "@/lib/routes";
import {LoginScreen} from "@/screens/LoginScreen";
import {HomeScreen} from "@/screens/HomeScreen";
import {DeviceScreen} from "@/screens/DeviceScreen";
import {SettingsScreen} from "@/screens/SettingsScreen";

const RequireSignedIn = () => {
  const { signedIn } = useAccounts();
  return signedIn ? <Outlet /> : <Navigate to="/login" replace />;
};

const SignedInLayout = () => {
  return (
    <DevicesProvider>
      <AppShell />
    </DevicesProvider>
  );
};

export const App = () => {
  return (
    <AccountsProvider fallback={<div className="h-full bg-night" />}>
      <DeviceNamesProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginScreen />} />
            <Route element={<RequireSignedIn />}>
              <Route element={<SignedInLayout />}>
                <Route index element={<HomeScreen />} />
                <Route path={DEVICE_ROUTE} element={<DeviceScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DeviceNamesProvider>
    </AccountsProvider>
  );
};
