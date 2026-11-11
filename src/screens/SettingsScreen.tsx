import {useLocation, useNavigate} from "react-router";
import {useBackHandler} from "@/hooks/useBackHandler";
import {ScreenHeader} from "@/components/ScreenHeader";
import {Switch} from "@/components/Switch";

export const SettingsScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useBackHandler(() => {
    if (location.key === "default") {
      navigate("/", { replace: true });
    } else {
      navigate(-1);
    }
    return true;
  });

  return (
    <>
      <ScreenHeader title="Settings" />
      <div className="screen-gradient min-h-0 flex-1 overflow-y-auto p-4">
        <section className="mb-6">
          <h2 className="mb-3 text-xs font-semibold text-subtle uppercase">Settings</h2>
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-base text-white">Battery notification</p>
              <p className="mt-0.5 text-xs text-subtle">Coming soon</p>
            </div>
            <Switch checked={false} disabled label="Battery notification" />
          </div>
        </section>
      </div>
    </>
  );
};
