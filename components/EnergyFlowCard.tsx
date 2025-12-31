import React, {useEffect} from "react";
import {StyleSheet, Text, View} from "react-native";
import {Canvas, Circle, Line, vec} from "@shopify/react-native-skia";
import {
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
  useDerivedValue,
  SharedValue,
} from "react-native-reanimated";
import {IconSymbol, IconSymbolName} from "./ui/IconSymbol";
import {Statistics} from "@/lib/statistics";
import {formatDateTime, formatNumber} from "@/lib/format";

interface Props {
  readonly solarPower: number; // in watts
  readonly batteryLevelAndConsumption: Statistics.BatteryPercentageAndConsumption | null;
  readonly isGridOn: boolean;
}

const getBatteryColor = (percent: number): string => {
  if (percent <= 30) return "#EF4444"; // red
  if (percent <= 40) return "#F97316"; // orange
  if (percent <= 55) return "#EAB308"; // yellow
  return "#22C55E"; // green
};

const getBatteryIcon = (percent: number): IconSymbolName => {
  if (percent <= 10) return "battery.0percent";
  if (percent <= 35) return "battery.25percent";
  if (percent <= 60) return "battery.50percent";
  if (percent <= 85) return "battery.75percent";
  return "battery.100percent";
};

const getLoadColor = (watts: number): string => {
  if (watts > 2000) return "#EF4444"; // red
  if (watts > 1600) return "#F97316"; // orange
  if (watts > 1000) return "#EAB308"; // yellow
  return "#22C55E"; // green
};

// Layout constants (based on styles)
const CONTAINER_HEIGHT = 220;
const ICON_SIZE = 80;
const TOP_ROW_MARGIN_BOTTOM = 40;
const BOTTOM_PADDING_HORIZONTAL = 20;

// Calculated positions for icons within the canvas
const getIconPositions = (containerWidth: number) => {
  const batteryX = containerWidth / 2;
  const batteryY = ICON_SIZE / 2;

  const solarX = BOTTOM_PADDING_HORIZONTAL + ICON_SIZE / 2;
  const solarY = ICON_SIZE + TOP_ROW_MARGIN_BOTTOM + ICON_SIZE / 2;

  const gridX = containerWidth - BOTTOM_PADDING_HORIZONTAL - ICON_SIZE / 2;
  const gridY = solarY;

  return {
    battery: { x: batteryX, y: batteryY },
    solar: { x: solarX, y: solarY },
    grid: { x: gridX, y: gridY },
  };
};

// Interpolate position along a line
const lerp = (start: number, end: number, t: number) => {
  "worklet";
  return start + (end - start) * t;
};

// Calculate dot state in a worklet
const getDotState = (progress: number, offset: number) => {
  "worklet";
  const visibleStart = offset;
  const visibleEnd = offset + 0.33;

  const isVisible = progress >= visibleStart && progress <= visibleEnd;

  let t = 0;
  let opacity = 0;

  if (isVisible) {
    t = (progress - visibleStart) / 0.33;
    const fadeIn = Math.min(1, t / 0.15);
    const fadeOut = Math.min(1, (1 - t) / 0.15);
    opacity = Math.min(fadeIn, fadeOut);
  }

  return { t, opacity, isVisible };
};

interface AnimatedDotProps {
  progress: SharedValue<number>;
  offset: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

const AnimatedDot: React.FC<AnimatedDotProps> = ({
  progress,
  offset,
  startX,
  startY,
  endX,
  endY,
  color,
}) => {
  const cx = useDerivedValue(() => {
    const { t, isVisible } = getDotState(progress.value, offset);
    if (!isVisible) return -100; // off-screen
    return lerp(startX, endX, t);
  });

  const cy = useDerivedValue(() => {
    const { t, isVisible } = getDotState(progress.value, offset);
    if (!isVisible) return -100;
    return lerp(startY, endY, t);
  });

  const opacity = useDerivedValue(() => {
    const { opacity: op } = getDotState(progress.value, offset);
    return op;
  });

  return (
    <Circle
      cx={cx}
      cy={cy}
      r={5}
      color={color}
      opacity={opacity}
    />
  );
};

interface AnimatedDotsProps {
  progress: SharedValue<number>;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
}

const AnimatedDots: React.FC<AnimatedDotsProps> = ({
  progress,
  startX,
  startY,
  endX,
  endY,
  color,
}) => {
  return (
    <>
      <AnimatedDot
        progress={progress}
        offset={0}
        startX={startX}
        startY={startY}
        endX={endX}
        endY={endY}
        color={color}
      />
      <AnimatedDot
        progress={progress}
        offset={0.33}
        startX={startX}
        startY={startY}
        endX={endX}
        endY={endY}
        color={color}
      />
      <AnimatedDot
        progress={progress}
        offset={0.66}
        startX={startX}
        startY={startY}
        endX={endX}
        endY={endY}
        color={color}
      />
    </>
  );
};

export const EnergyFlowCard: React.FC<Props> = ({solarPower, batteryLevelAndConsumption, isGridOn}) => {
  const solarProgress = useSharedValue(0);
  const gridProgress = useSharedValue(0);
  const [containerWidth, setContainerWidth] = React.useState(0);

  const isSolarActive = solarPower >= 50;

  // Solar animation
  useEffect(() => {
    if (isSolarActive) {
      solarProgress.value = 0;
      solarProgress.value = withRepeat(
        withTiming(1, { duration: 5000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(solarProgress);
      solarProgress.value = 0;
    }

    return () => {
      cancelAnimation(solarProgress);
    };
  }, [isSolarActive, solarProgress]);

  // Grid animation
  useEffect(() => {
    if (isGridOn) {
      gridProgress.value = 0;
      gridProgress.value = withRepeat(
        withTiming(1, { duration: 5000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(gridProgress);
      gridProgress.value = 0;
    }

    return () => {
      cancelAnimation(gridProgress);
    };
  }, [isGridOn, gridProgress]);

  const solarW = formatNumber(solarPower);
  const batteryPercent = Math.round(batteryLevelAndConsumption?.batteryPercentage ?? 0);

  const positions = containerWidth > 0 ? getIconPositions(containerWidth) : null;

  return (
    <View style={styles.card}>
      <Text style={{ color: "#999", textAlign: "center", fontSize: 10 }}>
        {batteryLevelAndConsumption ? formatDateTime(batteryLevelAndConsumption.timestamp) : null}
      </Text>
      <Text style={{
        color: batteryLevelAndConsumption ? getLoadColor(batteryLevelAndConsumption.consumption) : "white",
        textAlign: "center",
        fontSize: 20,
        fontWeight: "bold",
        marginTop: 6
      }}>
        Load: {batteryLevelAndConsumption ? formatNumber(batteryLevelAndConsumption.consumption) : "Unknown"} W
      </Text>
      <View
        style={styles.container}
        onLayout={(e) => {
          setContainerWidth(e.nativeEvent.layout.width);
        }}
      >
        {/* Battery - Top Center */}
        <View style={styles.topRow}>
          <View style={styles.item}>
            <View style={[styles.iconContainer, {backgroundColor: getBatteryColor(batteryPercent)}]}>
              <IconSymbol name={getBatteryIcon(batteryPercent)} size={40} color="white" />
            </View>
            <Text style={styles.value}>{batteryPercent}%</Text>
            <Text style={styles.label}>BATTERY</Text>
          </View>
        </View>

        {/* Bottom Row with Solar and Grid */}
        <View style={styles.bottomRow}>
          {/* Solar - Bottom Left */}
          <View style={styles.item}>
            <View style={[styles.iconContainer, {backgroundColor: isSolarActive ? "#F59E0B" : "#6B7280"}]}>
              <IconSymbol name="sun.max.fill" size={40} color="white" />
            </View>
            <Text style={styles.value}>{solarW} W</Text>
            <Text style={styles.label}>SOLAR</Text>
          </View>

          {/* Grid - Bottom Right */}
          <View style={styles.item}>
            <View style={[styles.iconContainer, {backgroundColor: isGridOn ? "#00bfff" : "#6B7280"}]}>
              <IconSymbol name="bolt.fill" size={40} color="white" />
            </View>
            <Text style={styles.value}>{isGridOn ? "ON" : "OFF"}</Text>
            <Text style={styles.label}>GRID</Text>
          </View>
        </View>

        {/* Skia Canvas for lines and animated dots */}
        {positions && containerWidth > 0 && (
          <Canvas style={styles.canvasContainer}>
            {/* Line from Solar to Battery */}
            <Line
              p1={vec(positions.solar.x, positions.solar.y)}
              p2={vec(positions.battery.x - ICON_SIZE / 2 - 10, positions.battery.y)}
              color="#374151"
              strokeWidth={2}
              opacity={0.25}
            />

            {/* Line from Battery to Grid */}
            <Line
              p1={vec(positions.battery.x + ICON_SIZE / 2 + 10, positions.battery.y)}
              p2={vec(positions.grid.x, positions.grid.y)}
              color="#374151"
              strokeWidth={2}
              opacity={0.25}
            />

            {/* Animated dots from Solar to Battery */}
            {isSolarActive && (
              <AnimatedDots
                progress={solarProgress}
                startX={positions.solar.x}
                startY={positions.solar.y}
                endX={positions.battery.x - ICON_SIZE / 2 - 10}
                endY={positions.battery.y}
                color="#F59E0B"
              />
            )}

            {/* Animated dots from Grid to Battery */}
            {isGridOn && (
              <AnimatedDots
                progress={gridProgress}
                startX={positions.grid.x}
                startY={positions.grid.y}
                endX={positions.battery.x + ICON_SIZE / 2 + 10}
                endY={positions.battery.y}
                color="#00bfff"
              />
            )}
          </Canvas>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  container: {
    marginTop: 20,
    position: "relative",
    alignItems: "center",
    width: "100%",
    minHeight: CONTAINER_HEIGHT,
  },
  topRow: {
    alignItems: "center",
    marginBottom: TOP_ROW_MARGIN_BOTTOM,
    zIndex: 2,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: BOTTOM_PADDING_HORIZONTAL,
    zIndex: 2,
  },
  item: {
    alignItems: "center",
  },
  iconContainer: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    width: "100%",
    textAlign: "center",
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: "#9CA3AF",
    width: "100%",
    textAlign: "center",
    marginTop: 4,
  },
  canvasContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});
