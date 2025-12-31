import {DashboardCard} from '@/components/DashboardCard';
import {Text, View} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Dashboard() {
  return (
    <View style={{ paddingVertical: 16 }}>
      <DashboardCard title="Grid Hours Today" content="24.5h" icon="bolt" color="#00bfff" style={{ marginHorizontal: 16, marginTop: 16 }}>
        <Text style={{ color: "hsl(210 15% 65%)" }}>50.0% of the day</Text>
      </DashboardCard>
      <DashboardCard title="Battery Level" content="78%" icon="batteryblock" color="#26d968" style={{ margin: 16 }}>
      </DashboardCard>
    </View>
  );
}
