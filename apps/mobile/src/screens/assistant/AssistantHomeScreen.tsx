import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AssistantStackParamList } from "@app/navigation/types";
import { ActionTile } from "@shared/ui/ActionTile";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";

type Props = NativeStackScreenProps<AssistantStackParamList, "AssistantHome">;

export function AssistantHomeScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Voice Assistant" subtitle="Speech, entities and habit recommendations">
        <ActionTile
          title="Voice Scenarios"
          description="UI cards for speech recognition and entity extraction."
        />
        <ActionTile
          title="Habit Insights"
          description="Subscription usage and recommendation cards."
          onPress={() => navigation.navigate("HabitInsights")}
        />
      </SectionCard>
    </Screen>
  );
}
