import {StyleProp, StyleSheet, Text, View, ViewStyle} from "react-native";
import {Card} from "./ui/Card";
import {IconSymbol, IconSymbolName} from "./ui/IconSymbol";

interface Props {
  readonly style?: StyleProp<ViewStyle>;
  readonly title: string;
  readonly content?: string;
  readonly color: string;
  readonly icon: IconSymbolName;
  readonly children?: React.ReactNode;
}

export const DashboardCard: React.FC<Props> = (props) => {
  const { style, color, title, content, icon, children } = props;

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        <IconSymbol name={icon} size={22} color={color} />
      </View>
      <Text style={{ fontSize: 48, color, fontWeight: "bold", fontFamily: "Inter", marginTop: 2 }}>
        {content}
      </Text>
      {children}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 24,
  },
  titleContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: 700,
    color: "white",
  },
});
