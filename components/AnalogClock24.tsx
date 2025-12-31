import {Canvas, Circle, Group, Line, Path, Skia, Text as SkiaText, useFont, vec} from "@shopify/react-native-skia";
import React, {useState, useMemo, useEffect} from "react";
import {View, TouchableOpacity, Pressable, Text, StyleSheet, Modal, Platform} from "react-native";
import {Statistics} from "@/lib/statistics";
import {formatTime} from "@/lib/format";

interface AnalogClock24Props {
  size?: number;
  gridOnPeriods?: Statistics.GridOnPeriod[];
  showClock?: boolean;
}

function dateToAngle(date: Date): number {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const totalHours = hours + minutes / 60 + seconds / 3600;
  // Convert to angle: 0 hours = -90deg (top), each hour = 15deg
  return (totalHours * 15 - 90) * (Math.PI / 180);
}

function hourToLabel(hour: number): string {
  if (hour === 0) return "12am";
  if (hour === 6) return "6am";
  if (hour === 12) return "12pm";
  if (hour === 18) return "6pm";
  return "";
}

function createArcPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  // Guard against Skia being undefined (happens on web)
  if (typeof Skia === 'undefined' || !Skia?.Path?.Make) {
    return null;
  }

  try {
    const path = Skia.Path.Make();

    const outerStartX = centerX + Math.cos(startAngle) * outerRadius;
    const outerStartY = centerY + Math.sin(startAngle) * outerRadius;

    // Start at outer arc start
    path.moveTo(outerStartX, outerStartY);

    // Draw outer arc
    const numSegments = 32;
    for (let i = 1; i <= numSegments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / numSegments);
      const x = centerX + Math.cos(angle) * outerRadius;
      const y = centerY + Math.sin(angle) * outerRadius;
      path.lineTo(x, y);
    }

    // Draw inner arc (reverse direction)
    for (let i = numSegments; i >= 0; i--) {
      const angle = startAngle + (endAngle - startAngle) * (i / numSegments);
      const x = centerX + Math.cos(angle) * innerRadius;
      const y = centerY + Math.sin(angle) * innerRadius;
      path.lineTo(x, y);
    }

    // Close the path
    path.close();

    return path;
  } catch (error) {
    // Fail gracefully if Skia operations fail
    return null;
  }
}

function getArcHitboxPosition(
  centerX: number,
  centerY: number,
  midRadius: number,
  startAngle: number,
  endAngle: number
) {
  const midAngle = (startAngle + endAngle) / 2;
  return {
    x: centerX + Math.cos(midAngle) * midRadius,
    y: centerY + Math.sin(midAngle) * midRadius,
  };
}

export function AnalogClock24({ size = 280, gridOnPeriods = [], showClock = true }: AnalogClock24Props) {
  const font = useFont(require("@/assets/fonts/SpaceMono-Regular.ttf"), 12);
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if Skia is available (not available on web)
  const isSkiaAvailable = useMemo(() => {
    return typeof Skia !== 'undefined' && Skia?.Path?.Make;
  }, []);

  const clockRadius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;

  const arcInnerRadius = clockRadius * 0.45;
  const arcOuterRadius = clockRadius * 0.75;
  const arcMidRadius = (arcInnerRadius + arcOuterRadius) / 2;
  const hitboxSize = arcOuterRadius - arcInnerRadius;

  const handlePeriodPress = (index: number) => {
    setSelectedPeriodIndex(selectedPeriodIndex === index ? null : index);
  };

  const selectedPeriod = selectedPeriodIndex !== null ? gridOnPeriods[selectedPeriodIndex] : null;

  const dismissTooltip = () => {
    setSelectedPeriodIndex(null);
  };

  return (
    <>
      {/* Modal overlay to dismiss tooltip when clicking outside */}
      <Modal
        visible={selectedPeriod !== null}
        transparent={true}
        animationType="none"
        onRequestClose={dismissTooltip}
      >
        <Pressable
          style={styles.fullScreenOverlay}
          onPress={dismissTooltip}
        />
      </Modal>

      <View style={{ width: size, height: size }}>
        <Canvas style={{ height: size, width: size }}>
          {/* Outer circle */}
          <Circle cx={centerX} cy={centerY} r={clockRadius} color="#1a1a2e" style="fill" />
          <Circle cx={centerX} cy={centerY} r={clockRadius} color="#00bfff" style="stroke" strokeWidth={2} />

        {/* Grid on periods as arc segments */}
        {isSkiaAvailable && gridOnPeriods.map((period, index) => {
          const startAngle = dateToAngle(period.start);
          const endAngle = dateToAngle(period.end);
          const path = createArcPath(
            centerX,
            centerY,
            arcInnerRadius,
            arcOuterRadius,
            startAngle,
            endAngle
          );

          if (!path) return null;

          const isSelected = selectedPeriodIndex === index;

          return (
            <Path
              key={index}
              path={path}
              color={isSelected ? "#00bfff" : "#00bfff70"}
              style="fill"
            />
          );
        })}

        {/* Hour markers and labels */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i * 15 - 90) * (Math.PI / 180);
          const isMainHour = i % 6 === 0;
          const markerLength = isMainHour ? 15 : 8;
          const outerR = clockRadius - 5;
          const innerR = outerR - markerLength;
          const x1 = centerX + Math.cos(angle) * outerR;
          const y1 = centerY + Math.sin(angle) * outerR;
          const x2 = centerX + Math.cos(angle) * innerR;
          const y2 = centerY + Math.sin(angle) * innerR;
          const labelR = clockRadius - 30;
          const labelX = centerX + Math.cos(angle) * labelR;
          const labelY = centerY + Math.sin(angle) * labelR;
          const label = hourToLabel(i);

          return (
            <Group key={i}>
              <Line
                p1={vec(x1, y1)}
                p2={vec(x2, y2)}
                color={isMainHour ? "#00bfff" : "#555"}
                strokeWidth={isMainHour ? 2 : 1}
              />
              {label && font && (
                <SkiaText
                  x={labelX - (label.length * 3) + (i === 6 ? -8 : i === 18 ? 8 : 0)}
                  y={labelY + 4}
                  text={label}
                  font={font}
                  color="#fff"
                />
              )}
            </Group>
          );
        })}

        {/* Hour hand - 24 hour clock, so 15 degrees per hour */}
        {showClock && (() => {
          const hours = currentTime.getHours();
          const minutes = currentTime.getMinutes();
          const hourAngle = ((hours + minutes / 60) * 15 - 90) * (Math.PI / 180);
          const hourHandLength = clockRadius * 0.45;
          const hourX = centerX + Math.cos(hourAngle) * hourHandLength;
          const hourY = centerY + Math.sin(hourAngle) * hourHandLength;
          return (
            <Line
              p1={vec(centerX, centerY)}
              p2={vec(hourX, hourY)}
              color="#fff"
              strokeWidth={4}
              style="stroke"
              strokeCap="round"
            />
          );
        })()}

        {/* Minute hand */}
        {showClock && (() => {
          const minutes = currentTime.getMinutes();
          const seconds = currentTime.getSeconds();
          const minuteAngle = ((minutes + seconds / 60) * 6 - 90) * (Math.PI / 180);
          const minuteHandLength = clockRadius * 0.7;
          const minuteX = centerX + Math.cos(minuteAngle) * minuteHandLength;
          const minuteY = centerY + Math.sin(minuteAngle) * minuteHandLength;
          return (
            <Line
              p1={vec(centerX, centerY)}
              p2={vec(minuteX, minuteY)}
              color="#00bfff"
              strokeWidth={2}
              style="stroke"
              strokeCap="round"
            />
          );
        })()}

        {/* Center dot */}
        {showClock && <Circle cx={centerX} cy={centerY} r={6} color="#00bfff" />}
        {showClock && <Circle cx={centerX} cy={centerY} r={3} color="#fff" />}

        </Canvas>

      {/* Invisible touch targets overlaid on arc segments */}
      {gridOnPeriods.map((period, index) => {
        const startAngle = dateToAngle(period.start);
        const endAngle = dateToAngle(period.end);
        const pos = getArcHitboxPosition(centerX, centerY, arcMidRadius, startAngle, endAngle);

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.hitbox,
              {
                left: pos.x - hitboxSize / 2,
                top: pos.y - hitboxSize / 2,
                width: hitboxSize,
                height: hitboxSize,
              },
            ]}
            onPress={() => handlePeriodPress(index)}
            activeOpacity={0.7}
          />
        );
      })}

      {/* Tooltip */}
      {selectedPeriod && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>Grid On Period</Text>
          <View style={styles.tooltipRow}>
            <Text style={styles.tooltipLabel}>Start </Text>
            <Text style={styles.tooltipValue}>{formatTime(selectedPeriod.start)} </Text>
          </View>
          <View style={styles.tooltipRow}>
            <Text style={styles.tooltipLabel}>End </Text>
            <Text style={styles.tooltipValue}>{formatTime(selectedPeriod.end)} </Text>
          </View>
        </View>
      )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  hitbox: {
    position: 'absolute',
    borderRadius: 50,
  },
  tooltip: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -45 }],
    backgroundColor: 'rgba(20, 20, 35, 0.95)',
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: '#00bfff',
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  tooltipTitle: {
    color: '#00bfff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  tooltipLabel: {
    color: '#888',
    fontSize: 12,
  },
  tooltipValue: {
    color: '#fff',
    fontSize: 12,
  },
});
