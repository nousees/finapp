import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AnalysisStackParamList } from "@app/navigation/types";
import { ActionTile } from "@shared/ui/ActionTile";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<AnalysisStackParamList, "AnalysisHome">;

export function AnalysisHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Центр контроля" subtitle="Бюджеты, цели, уведомления и прогноз">
        <ActionTile
          title="Бюджеты"
          description="Лимиты по категориям и предупреждения о перерасходе."
          onPress={() => navigation.navigate("Budgets")}
        />
        <ActionTile
          title="Цели"
          description="Финансовые цели, взносы и прогресс по датам."
          onPress={() => navigation.navigate("Goals")}
        />
        <ActionTile
          title="Уведомления"
          description="Напоминания и персональные рекомендации."
          onPress={() => navigation.navigate("Notifications")}
        />
      </SectionCard>
    </Screen>
  );
}
