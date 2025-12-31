import {DashboardCard} from "@/components/DashboardCard";
import {EnergyFlowCard} from "@/components/EnergyFlowCard";
import {ScreenBackground} from "@/components/ScreenBackground";
import {Card} from "@/components/ui/Card";
import {useDevices} from "@/contexts/devices";
import {useDeviceData} from "@/hooks/useDeviceData";
import {AsyncDataUtils} from "@/lib/asyncdata";
import {formatDate, formatHours, formatPercent} from "@/lib/format";
import {Statistics} from "@/lib/statistics";
import {WatchPower} from "@/lib/watchpower";
import {useTheme} from "@react-navigation/native";
import {LinearGradient} from "expo-linear-gradient";
import {useFocusEffect, useGlobalSearchParams, useNavigation} from "expo-router";
import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {AppState, BackHandler, InteractionManager, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView, Text, View} from "react-native";
import {AnalogClock24} from "@/components/AnalogClock24";
import {BatteryChart} from "@/components/BatteryChart";
import {IndeterminateLinearProgress} from "@/components/IndeterminateLinearProgress";
import {DatePicker} from "@/components/DatePicker";
import {toISODateString} from "@/lib/utils";
import {prepareBatteryNotificationData, updateBatteryNotification} from "@/lib/batteryNotificationService";

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

interface DeviceViewProps {
  device: WatchPower.DeviceInfo;
}

function DeviceView({ device }: DeviceViewProps) {
  const navigation = useNavigation();
  const theme = useTheme();
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
  const selectedDateRef = useRef<Date>(selectedDate);
  selectedDateRef.current = selectedDate;

  useEffect(() => {
    navigation.setOptions({
      title: device.devalias,
    });
  }, [navigation, device.devalias]);

  const { data: todayData, reload: reloadToday } = useDeviceData(device, toISODateString(new Date()));
  const { data: dateData, reload: reloadDate } = useDeviceData(device, toISODateString(selectedDate));

  const reloadData = useCallback(() => {
    reloadToday();
    setSelectedDate(new Date())

    // if selectedDate is today, reload date data as well
    if (isSameDay(selectedDateRef.current, new Date())) {
      reloadDate();
    }
  }, [reloadDate, reloadToday]);


  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        BackHandler.exitApp(); // Exit immediately
        return true; // prevent default behavior
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      reloadData();

      return () => subscription.remove();
    }, [reloadData])
  );

  // Reload data when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        reloadData();
      }
    });

    return () => subscription.remove();
  }, [reloadData]);

  useEffect(() => {
    if (! AsyncDataUtils.isSuccess(todayData)) {
      return;
    }

    const batteryNotificationData = prepareBatteryNotificationData(todayData.data);

    updateBatteryNotification(batteryNotificationData);

  }, [todayData]);

  const onRefresh = () => reloadData();

  const statisticsData = useMemo(() => {
    return AsyncDataUtils.map(todayData, (dataPoints) => {
      const gridHoursToday = Statistics.getGridHours(dataPoints);
      const gridOnPeriods = Statistics.getGridOnPeriods(dataPoints);
      const batteryLevelAndConsumption = Statistics.getBatteryPercentageAndConsumption(dataPoints);
      const solarPower = Statistics.getCurrentSolarPower(dataPoints);
      const gridOn = Statistics.isGridOn(dataPoints);

      return {
        gridHoursToday,
        batteryLevelAndConsumption,
        gridOnPeriods,
        solarPower,
        gridOn,
      };
    });
  }, [todayData]);

  const isRefetching = statisticsData.type === "success" && !!statisticsData.isLoading;

  const dateStatsData = useMemo(() =>{
    return AsyncDataUtils.map(dateData, (dataPoints) => ({
      gridOnPeriods: Statistics.getGridOnPeriods(dataPoints),
      gridOnHours: Statistics.getGridHours(dataPoints),
    }));
  }, [dateData])

  const batteryChartData = useMemo(() => {
    return AsyncDataUtils.map(dateData, (dataPoints) => {
      // 96 slots (4 per hour, 15-minute intervals)
      const slots: { slot: number; percentage: number }[] = [];
      const dataBySlot = new Map<number, WatchPower.InverterDataPoint[]>();

      dataPoints.forEach((point) => {
        const date = new Date(point.timestamp);
        const slot = date.getHours() * 4 + Math.floor(date.getMinutes() / 15);
        if (!dataBySlot.has(slot)) {
          dataBySlot.set(slot, []);
        }
        dataBySlot.get(slot)!.push(point);
      });

      for (let slot = 0; slot < 96; slot++) {
        const pointsInSlot = dataBySlot.get(slot) || [];
        const percentage = pointsInSlot.length > 0
          ? pointsInSlot[pointsInSlot.length - 1].batteryCapacity
          : 0;
        slots.push({ slot, percentage });
      }

      return slots;
    });
  }, [dateData])

  if (AsyncDataUtils.isLoading(statisticsData)) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size={80} color={theme.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }
  
  if (AsyncDataUtils.isError(statisticsData)) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ color: "#FF7074", fontSize: 16, textAlign: "center" }}>
            An error occurred! Please try again.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onRefresh}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  const { gridHoursToday, batteryLevelAndConsumption, solarPower, gridOn } = statisticsData.data;

  return (
    <LinearGradient
      colors={['hsl(220, 20%, 8%)', 'hsl(220, 15%, 18%)', 'hsl(220, 20%, 8%)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <IndeterminateLinearProgress visible={isRefetching} />
      <ScrollView
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl refreshing={false} colors={["#FFF"]} tintColor="#FFF" onRefresh={onRefresh} />
        }>
        <EnergyFlowCard
          solarPower={solarPower}
          batteryLevelAndConsumption={batteryLevelAndConsumption}
          isGridOn={gridOn}
        />
        {/*
        <DashboardCard title="Battery Level" content={`${batteryLevel !== null ? formatPercent(batteryLevel) : "Unknown"}`} icon="batteryblock" color="#26d968" style={{ margin: 16 }}>
          <ProgressBar progress={batteryLevel ?? 0} progressColor="#26d968" style={{ marginTop: 8 }} />
        </DashboardCard>
          */}
        <DashboardCard title="Grid Hours Today" content={`${formatHours(gridHoursToday.hours)}h`} icon="bolt" color="#00bfff" style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={{ color: "hsl(210 15% 65%)", marginTop: 4 }}>{formatPercent(gridHoursToday.percentage)} of the day</Text>
        </DashboardCard>
        <Card style={{ margin: 16, padding: 24 }}>
          <View style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ fontSize: 22, color: "white", fontWeight: 500 }}>Energy Analytics</Text>
            <TouchableOpacity onPress={() => setDatePickerOpen(true)}>
              <Text style={{ color: "#00bfff", fontSize: 16 }}>{formatDate(selectedDate)} </Text>
            </TouchableOpacity>
          </View>
          {(dateStatsData.type === "loading" || (dateStatsData.type === "success" && dateStatsData.isLoading)) &&  (
            <View style={{ height: 300, justifyContent: "center", alignItems: "center", display: "flex" }}>
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 32 }} />
            </View>
          )}
          {dateStatsData.type === "success" && !dateStatsData.isLoading && (
            <>
              <View>
                <Text style={{ color: "hsl(210 15% 65%)", marginTop: 4 }}>Total Grid Hours: {formatHours(dateStatsData.data.gridOnHours.hours)}h</Text>
              </View>
              <View style={{ alignItems: "center", marginTop: 16 }}>
                <AnalogClock24
                  gridOnPeriods={dateStatsData.data.gridOnPeriods}
                  size={280}
                  showClock={isSameDay(selectedDate, new Date())}
                />
              </View>
            </>
          )}
        </Card>

        <BatteryChart data={batteryChartData} selectedDate={selectedDate} />
      </ScrollView>

      <DatePicker
        visible={datePickerOpen}
        value={selectedDate}
        maximumDate={new Date()}
        onClose={() => setDatePickerOpen(false)}
        onChange={setSelectedDate}
      />
    </LinearGradient>
  );
}

export default function DevicePage() {
  const { devices } = useDevices();
  const params = useGlobalSearchParams();
  const selectedDevice = useMemo(() => devices.find((device) => device.pn === params.deviceId), [devices, params.deviceId]);

  // Cache the last valid device to preserve state when drawer pre-mounts with empty params
  const cachedDeviceRef = useRef<WatchPower.DeviceInfo | null>(null);

  if (selectedDevice) {
    cachedDeviceRef.current = selectedDevice;
  }

  const deviceToRender = cachedDeviceRef.current;

  if (!deviceToRender) {
    return null;
  }

  return <DeviceView device={deviceToRender} />;
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
