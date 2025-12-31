import React from "react";
import {StyleProp, StyleSheet, View, ViewStyle} from "react-native";

interface Props {
  readonly children: React.ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

export const Card = (props: Props) => {
  return (
    <View style={[styles.container, props.style]}>
      {props.children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "hsl(220, 18%, 12%)",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "hsl(220, 15%, 20%)",
  },
});
