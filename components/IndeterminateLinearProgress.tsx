import React, {useEffect, useRef} from "react";
import {Animated, View} from "react-native";

interface IndeterminateLinearProgressProps {
  visible?: boolean;
}

export function IndeterminateLinearProgress({ visible = true }: IndeterminateLinearProgressProps) {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progressAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(progressAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [progressAnim, visible]);

  return (
    <View style={{ height: 3 }}>
      {visible && (
        <View style={{ backgroundColor: "hsl(220 15% 20%)", overflow: "hidden" }}>
          <Animated.View
            style={{
              height: "100%",
              width: "30%",
              backgroundColor: "#00bfff",
              transform: [{
                translateX: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 350],
                }),
              }],
            }}
          />
        </View>
      )}
    </View>
  );
}
