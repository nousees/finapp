import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AnalysisStackParamList } from "@app/navigation/types";
import { ActionTile } from "@shared/ui/ActionTile";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<AnalysisStackParamList, "AnalysisHome">;

export function AnalysisHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Control Center" subtitle="Budgets, goals, alerts and progress tracking">
        <ActionTile
          title="Budgets"
          description="Category limits and overspend alerts."
          onPress={() => navigation.navigate("Budgets")}
        />
        <ActionTile
          title="Goals"
          description="Savings targets and progress milestones."
          onPress={() => navigation.navigate("Goals")}
        />
        <ActionTile
          title="Notifications"
          description="Reminder and recommendation feed."
          onPress={() => navigation.navigate("Notifications")}
        />
      </SectionCard>
    </Screen>
  );
}
