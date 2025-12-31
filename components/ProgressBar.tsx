// Progress bar component in React with TypeScript
import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

interface ProgressBarProps {
  readonly progress: number; // Progress value between 0 and 1
  readonly height?: number; // Optional height of the progress bar
  readonly backgroundColor?: string; // Optional background color of the progress bar
  readonly progressColor?: string; // Optional color of the progress indicator
  readonly style?: StyleProp<ViewStyle>;
}

export const ProgressBar: React.FC<ProgressBarProps> = (props) => {
  const { progress, height = 10, backgroundColor = "hsl(220 15% 18%)", progressColor = "#3b5998", style } = props;

  return (
    <View style={[styles.container, { height, backgroundColor }, style]}>
      <View style={[styles.progress, { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: progressColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
});
