import {useCallback, useEffect, useMemo, useState} from "react";
import {Navigate, useParams} from "react-router";
import {MdEdit, MdRefresh} from "react-icons/md";
import {useAccounts} from "@/contexts/accounts";
import {useDeviceNames} from "@/contexts/deviceNames";
import {useDevices} from "@/contexts/devices";
import {useDayHistory, HISTORY_DAYS} from "@/hooks/useDayHistory";
import {useDeviceData} from "@/hooks/useDeviceData";
import {useOnResume} from "@/hooks/useOnResume";
import {usePullToRefresh} from "@/hooks/usePullToRefresh";
import {AsyncDataUtils} from "@/lib/asyncdata";
import {type Sample, toDaySeries} from "@/lib/daySeries";
import {Statistics} from "@/lib/statistics";
import {addDays, toISODateString} from "@/lib/utils";
import {WatchPower} from "@/lib/watchpower";
import {DayCard} from "@/components/day/DayCard";
import {EnergyFlowCard} from "@/components/EnergyFlowCard";
import {ErrorRetry} from "@/components/ErrorRetry";
import {GridHistoryCard, type HistoryDay} from "@/components/GridHistoryCard";
import {HeaderButton, ScreenHeader} from "@/components/ScreenHeader";
import {IndeterminateLinearProgress} from "@/components/IndeterminateLinearProgress";
import {RenameDeviceDialog} from "@/components/RenameDeviceDialog";
import {CenteredSpinner} from "@/components/Spinner";

interface DeviceViewProps {
  readonly username: string;
  readonly device: WatchPower.DeviceInfo;
}

const DeviceView = ({ username, device }: DeviceViewProps) => {
  const { setLastDevice } = useAccounts();
  const { displayName } = useDeviceNames();
  const [isRenaming, setRenaming] = useState(false);
  const [today, setToday] = useState(() => toISODateString(new Date()));
  // null follows today, also across midnight.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);
  const [dayCard, setDayCard] = useState<HTMLDivElement | null>(null);
  const { pn } = device;

  const { data: todayData, reload } = useDeviceData(username, device, today);
  const { days: history, load: loadDay, retryFailed } = useDayHistory(username, device, today);

  useEffect(() => {
    setLastDevice({ username, pn });
  }, [setLastDevice, username, pn]);

  const reloadData = useCallback(() => {
    // Moving to a new date triggers a fetch on its own; reload covers the same day.
    setToday(toISODateString(new Date()));
    reload();
    retryFailed();
  }, [reload, retryFailed]);

  // Reload data when app comes to foreground
  useOnResume(reloadData);

  const pull = usePullToRefresh(scroller, reloadData);

  const todaySeries = useMemo(() => {
    return AsyncDataUtils.map(todayData, (points) => toDaySeries(today, points));
  }, [todayData, today]);

  const selectedDate = pickedDate !== null && pickedDate < today ? pickedDate : today;
  const selectedDay = selectedDate === today ? todaySeries : history.get(selectedDate);

  // Days outside the preloaded week load when picked.
  useEffect(() => {
    if (selectedDate !== today && selectedDay === undefined) {
      void loadDay(selectedDate);
    }
  }, [selectedDate, today, selectedDay, loadDay]);

  const selectDate = useCallback((date: string) => {
    if (date >= today) {
      setPickedDate(null);
      return;
    }

    setPickedDate(date);
    // Retries the day if it failed before.
    void loadDay(date);
  }, [today, loadDay]);

  // The day card sits above the week card, so bring it back into view.
  const showDayFromWeek = (date: string) => {
    selectDate(date);
    if (dayCard && scroller && dayCard.getBoundingClientRect().top < scroller.getBoundingClientRect().top) {
      dayCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const retrySelectedDay = () => {
    if (selectedDate === today) {
      reload();
    } else {
      void loadDay(selectedDate);
    }
  };

  // Looks back through the loaded days, newest first, without skipping one.
  const gridRun = useMemo(() => {
    if (todaySeries.type !== "success") {
      return null;
    }

    const days: (readonly Sample[])[] = [todaySeries.data.samples];
    for (let i = 1; i <= HISTORY_DAYS; i += 1) {
      const day = history.get(addDays(today, -i));
      if (day?.type !== "success") {
        break;
      }
      days.push(day.data.samples);
    }
    return Statistics.getCurrentRun(days);
  }, [todaySeries, history, today]);

  const week = useMemo((): HistoryDay[] => {
    return Array.from({ length: HISTORY_DAYS + 1 }, (_, i) => {
      const date = addDays(today, i - HISTORY_DAYS);
      return { date, day: date === today ? todaySeries : history.get(date) };
    });
  }, [today, todaySeries, history]);

  const flowData = useMemo(() => {
    return AsyncDataUtils.map(todayData, (dataPoints) => ({
      batteryLevelAndConsumption: Statistics.getBatteryPercentageAndConsumption(dataPoints),
      solarPower: Statistics.getCurrentSolarPower(dataPoints),
      gridOn: Statistics.isGridOn(dataPoints),
    }));
  }, [todayData]);

  const isRefetching = flowData.type === "success" && !!flowData.isLoading;

  const header = (
    <ScreenHeader
      title={displayName(device)}
      actions={(
        <HeaderButton label="Rename device" onClick={() => setRenaming(true)}>
          <MdEdit size={22} />
        </HeaderButton>
      )}
    />
  );

  const renameDialog = isRenaming && <RenameDeviceDialog device={device} onClose={() => setRenaming(false)} />;

  if (flowData.type === "loading") {
    return (
      <>
        {header}
        <div className="screen-gradient flex min-h-0 flex-1 flex-col">
          <CenteredSpinner />
        </div>
        {renameDialog}
      </>
    );
  }

  const pullProgress = Math.min(1, pull.distance / pull.threshold);

  return (
    <>
      {header}
      <div className="screen-gradient relative flex min-h-0 flex-1 flex-col">
        <IndeterminateLinearProgress visible={isRefetching} />

        {/* Pull-to-refresh indicator */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 z-10 -ml-5 flex size-10 items-center justify-center rounded-full border border-line bg-card text-white shadow-lg"
          style={{
            transform: `translateY(${pull.distance - 44}px) rotate(${pull.distance * 3}deg)`,
            opacity: pullProgress,
            transition: pull.isDragging ? "none" : "transform 200ms ease-out, opacity 200ms ease-out",
          }}
        >
          <MdRefresh size={24} color={pullProgress >= 1 ? "#00bfff" : "white"} />
        </div>

        <div ref={setScroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 pb-safe">
          {/* Without today's data, cached past days stay reachable below. */}
          {flowData.type === "success" ? (
            <EnergyFlowCard
              solarPower={flowData.data.solarPower}
              batteryLevelAndConsumption={flowData.data.batteryLevelAndConsumption}
              isGridOn={flowData.data.gridOn}
            />
          ) : (
            <div className="flex min-h-[200px]">
              <ErrorRetry onRetry={reloadData} />
            </div>
          )}
          <div ref={setDayCard} className="scroll-mt-4">
            <DayCard
              date={selectedDate}
              today={today}
              day={selectedDay}
              gridRun={gridRun}
              onSelectDate={selectDate}
              onRetry={retrySelectedDay}
            />
          </div>
          <GridHistoryCard days={week} today={today} selected={selectedDate} onSelect={showDayFromWeek} />
          <div className="h-4" />
        </div>
      </div>
      {renameDialog}
    </>
  );
};

export const DeviceScreen = () => {
  const { username = "", pn = "" } = useParams();
  const { groups, reload } = useDevices();
  const group = groups.find((g) => g.username === username);

  if (!group) {
    return <Navigate to="/" replace />;
  }

  if (group.devices.type !== "success") {
    return (
      <>
        <ScreenHeader title="" />
        <div className="screen-gradient flex min-h-0 flex-1 flex-col">
          {group.devices.type === "loading"
            ? <CenteredSpinner />
            : <ErrorRetry onRetry={() => reload(username)} />}
        </div>
      </>
    );
  }

  const device = group.devices.data.find((d) => d.pn === pn);

  if (!device) {
    return <Navigate to="/" replace />;
  }

  // Keyed so switching devices starts from a clean slate.
  return <DeviceView key={`${username}/${pn}`} username={username} device={device} />;
};
