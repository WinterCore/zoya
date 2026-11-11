import React, {useState} from "react";
import type {IconType} from "react-icons";
import {MdBattery0Bar, MdBattery2Bar, MdBattery4Bar, MdBattery5Bar, MdBatteryFull, MdBolt, MdWbSunny} from "react-icons/md";
import {Statistics} from "@/lib/statistics";
import {formatDateTime, formatNumber} from "@/lib/format";
import {useElementWidth} from "@/hooks/useElementWidth";

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

const getBatteryIcon = (percent: number): IconType => {
  if (percent <= 10) return MdBattery0Bar;
  if (percent <= 35) return MdBattery2Bar;
  if (percent <= 60) return MdBattery4Bar;
  if (percent <= 85) return MdBattery5Bar;
  return MdBatteryFull;
};

const getLoadColor = (watts: number): string => {
  if (watts > 2000) return "#EF4444"; // red
  if (watts > 1600) return "#F97316"; // orange
  if (watts > 1000) return "#EAB308"; // yellow
  return "#22C55E"; // green
};

// Layout constants (based on styles)
const ICON_SIZE = 80;
const TOP_ROW_MARGIN_BOTTOM = 40;
const BOTTOM_PADDING_HORIZONTAL = 20;

// Calculated positions for icons within the flow area
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

interface Point {
  readonly x: number;
  readonly y: number;
}

/** A dot that keeps travelling from `from` to `to`. */
const FlowDot = ({ from, to, color }: { from: Point; to: Point; color: string }) => {
  return (
    <span
      className="flow-dot absolute -top-[5px] -left-[5px] z-[1] size-2.5 rounded-full"
      style={{
        backgroundColor: color,
        "--x1": `${from.x}px`,
        "--y1": `${from.y}px`,
        "--x2": `${to.x}px`,
        "--y2": `${to.y}px`,
      } as React.CSSProperties}
    />
  );
};

interface FlowItemProps {
  readonly icon: IconType;
  readonly color: string;
  readonly value: string;
  readonly label: string;
}

const FlowItem = ({ icon: Icon, color, value, label }: FlowItemProps) => {
  return (
    <div className="flex flex-col items-center">
      <div className="flex size-20 items-center justify-center rounded-2xl" style={{ backgroundColor: color }}>
        <Icon size={40} color="white" />
      </div>
      <p className="mt-2 w-full text-center text-xl font-bold text-white">{value}</p>
      <p className="mt-1 w-full text-center text-xs text-[#9CA3AF]">{label}</p>
    </div>
  );
};

export const EnergyFlowCard = ({ solarPower, batteryLevelAndConsumption, isGridOn }: Props) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerWidth = useElementWidth(container);

  const isSolarActive = solarPower >= 50;
  const batteryPercent = Math.round(batteryLevelAndConsumption?.batteryPercentage ?? 0);
  const positions = containerWidth > 0 ? getIconPositions(containerWidth) : null;

  // The lines stop 10px short of the battery icon's sides.
  const batteryLeft = positions && { x: positions.battery.x - ICON_SIZE / 2 - 10, y: positions.battery.y };
  const batteryRight = positions && { x: positions.battery.x + ICON_SIZE / 2 + 10, y: positions.battery.y };

  return (
    <div className="mx-4 mt-4 mb-2">
      <p className="min-h-[14px] text-center text-[10px] text-[#999]">
        {batteryLevelAndConsumption ? formatDateTime(batteryLevelAndConsumption.timestamp) : null}
      </p>
      <p
        className="mt-1.5 text-center text-xl font-bold"
        style={{ color: batteryLevelAndConsumption ? getLoadColor(batteryLevelAndConsumption.consumption) : "white" }}
      >
        Load: {batteryLevelAndConsumption ? formatNumber(batteryLevelAndConsumption.consumption) : "Unknown"} W
      </p>

      <div ref={setContainer} className="relative mt-5 flex min-h-[220px] w-full flex-col items-center">
        {/* Battery - Top Center */}
        <div className="relative z-[2] mb-10">
          <FlowItem
            icon={getBatteryIcon(batteryPercent)}
            color={getBatteryColor(batteryPercent)}
            value={`${batteryPercent}%`}
            label="BATTERY"
          />
        </div>

        {/* Bottom Row with Solar and Grid */}
        <div className="relative z-[2] flex w-full justify-between px-5">
          <FlowItem
            icon={MdWbSunny}
            color={isSolarActive ? "#F59E0B" : "#6B7280"}
            value={`${formatNumber(solarPower)} W`}
            label="SOLAR"
          />
          <FlowItem
            icon={MdBolt}
            color={isGridOn ? "#00bfff" : "#6B7280"}
            value={isGridOn ? "ON" : "OFF"}
            label="GRID"
          />
        </div>

        {/* Connecting lines and animated dots, drawn behind the icons */}
        {positions && batteryLeft && batteryRight && (
          <>
            <svg className="pointer-events-none absolute inset-0 z-[1] size-full" aria-hidden>
              <line
                x1={positions.solar.x}
                y1={positions.solar.y}
                x2={batteryLeft.x}
                y2={batteryLeft.y}
                stroke="#374151"
                strokeWidth={2}
                opacity={0.25}
              />
              <line
                x1={batteryRight.x}
                y1={batteryRight.y}
                x2={positions.grid.x}
                y2={positions.grid.y}
                stroke="#374151"
                strokeWidth={2}
                opacity={0.25}
              />
            </svg>
            {isSolarActive && <FlowDot from={positions.solar} to={batteryLeft} color="#F59E0B" />}
            {isGridOn && <FlowDot from={positions.grid} to={batteryRight} color="#00bfff" />}
          </>
        )}
      </div>
    </div>
  );
};
