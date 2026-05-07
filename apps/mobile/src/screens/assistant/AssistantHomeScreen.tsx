import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AssistantStackParamList } from "@app/navigation/types";
import { ActionTile } from "@shared/ui/ActionTile";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<AssistantStackParamList, "AssistantHome">;

export function AssistantHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Голосовой ассистент" subtitle="Речь, сущности и рекомендации по привычкам">
        <ActionTile
          title="Голосовые сценарии"
          description="Распознавание речи и извлечение ключевых сущностей."
        />
        <ActionTile
          title="Привычки и подписки"
          description="Индекс использования и рекомендации по экономии."
          onPress={() => navigation.navigate("HabitInsights")}
        />
      </SectionCard>
    </Screen>
  );
}
