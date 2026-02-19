import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DashboardStackParamList } from "@app/navigation/types";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { MetricPill } from "@shared/ui/MetricPill";
import { ActionTile } from "@shared/ui/ActionTile";
import { View } from "react-native";

type Props = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;

export function DashboardHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Overview" subtitle="Module 2 dashboard placeholder">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MetricPill label="Income" value="+143,200 RUB" />
          <MetricPill label="Expenses" value="-91,850 RUB" />
        </View>
        <MetricPill label="Balance" value="51,350 RUB" />
      </SectionCard>

      <SectionCard title="Quick Access">
        <ActionTile
          title="Reports & Charts"
          description="Monthly and category report screens."
          onPress={() => navigation.navigate("Reports")}
        />
      </SectionCard>
    </Screen>
  );
}
