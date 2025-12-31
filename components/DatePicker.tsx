import React, {useState, useEffect} from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import RNDateTimePicker, {DateTimePickerEvent} from "@react-native-community/datetimepicker";

interface DatePickerProps {
  visible: boolean;
  value: Date;
  maximumDate?: Date;
  minimumDate?: Date;
  onClose: () => void;
  onChange: (date: Date) => void;
}

export function DatePicker({
  visible,
  value,
  maximumDate,
  minimumDate,
  onClose,
  onChange,
}: DatePickerProps) {
  const [tempDate, setTempDate] = useState(value);

  // Sync temp date when value changes or picker opens
  useEffect(() => {
    if (visible) {
      setTempDate(value);
    }
  }, [visible, value]);

  const handleChange = (event: DateTimePickerEvent, date: Date | undefined) => {
    if (Platform.OS === "android") {
      onClose();
      if (event.type === "set" && date) {
        onChange(date);
      }
    } else {
      if (date) {
        setTempDate(date);
      }
    }
  };

  const handleDone = () => {
    onChange(tempDate);
    onClose();
  };

  if (!visible) {
    return null;
  }

  // Android: render picker directly (it's already a native modal)
  if (Platform.OS === "android") {
    return (
      <RNDateTimePicker
        mode="date"
        display="default"
        onChange={handleChange}
        value={value}
        maximumDate={maximumDate}
        minimumDate={minimumDate}
      />
    );
  }

  // iOS: wrap in custom modal for styling
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDone}>
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <RNDateTimePicker
              mode="date"
              display="spinner"
              onChange={handleChange}
              value={tempDate}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              style={styles.picker}
              textColor="white"
            />
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "hsl(220, 20%, 8%)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: "100%",
  },
  safeArea: {
    width: "100%",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  cancelText: {
    color: "#888",
    fontSize: 16,
  },
  doneText: {
    color: "#00bfff",
    fontSize: 16,
    fontWeight: "600",
  },
  picker: {
    height: 200,
    width: "100%",
  },
});
