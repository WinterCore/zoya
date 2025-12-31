import {DarkTheme} from "@react-navigation/native";
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";

export interface CheckboxProps {
  label?: string;
  value: boolean;
  onChange: (newValue: boolean) => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  value,
  onChange,
  style,
  labelStyle,
}) => {
  return (
    <Pressable
      style={[styles.row, style]}
      onPress={() => onChange(!value)}
      hitSlop={8}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value && <View style={styles.checkboxInner} />}
      </View>

      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#007AFF",
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#007AFF",
  },
  label: {
    fontSize: 14,
    color: DarkTheme.colors.text,
    flex: 1,
    marginLeft: 8,
  },
});

export default Checkbox;
