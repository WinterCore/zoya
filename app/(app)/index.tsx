import {useDevices} from "@/contexts/devices";
import {useLoadDevices} from "@/hooks/useDevices";
import {Redirect} from "expo-router";
import {Text, View} from "react-native";

export default function IndexPage() {
  const { devices } = useDevices();

  if (devices.length === 0) {
    return (
      <View style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "white", fontSize: 20, textAlign: "center" }}>No devices found!</Text>
      </View>
    );
  }

  return (
    <Redirect href={`/${devices[0].pn}`} />
  );
}
