import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface BatteryWidgetProps {
  batteryPercent: number;
  watts: number;
  timeStr: string;
}

export function BatteryWidgetComponent({ batteryPercent, watts, timeStr }: BatteryWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#222222',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <TextWidget
        text={`${batteryPercent}%`}
        style={{
          fontSize: 32,
          color: '#FFFFFF',
        }}
      />
    </FlexWidget>
  );
}
