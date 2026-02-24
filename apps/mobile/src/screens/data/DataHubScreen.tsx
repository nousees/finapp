import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { DataStackParamList } from "@app/navigation/types";
import { ActionTile } from "@shared/ui/ActionTile";
import { Screen } from "@shared/ui/Screen";
import { SectionCard } from "@shared/ui/SectionCard";
import { MetricPill } from "@shared/ui/MetricPill";
import { View } from "react-native";

type Props = NativeStackScreenProps<DataStackParamList, "DataHome">;

export function DataHubScreen({ navigation }: Props) {
  return (
    <Screen>
      <SectionCard title="Модуль сбора данных" subtitle="Импорт, голос и ручной ввод">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MetricPill label="Импорты" value="24 за месяц" />
          <MetricPill label="Голосовые" value="17 в очереди" />
        </View>
      </SectionCard>

      <SectionCard title="Ввод транзакций">
        <ActionTile
          title="Ручной ввод"
          description="Форма новой транзакции с полями и шаблонами."
          onPress={() => navigation.navigate("TransactionCreate")}
        />
        <ActionTile
          title="Центр импорта"
          description="Загрузка CSV/Excel и предпросмотр записей."
          onPress={() => navigation.navigate("ImportCenter")}
        />
        <ActionTile
          title="Голосовой ввод"
          description="Запись, транскрибация и извлечение сущностей."
          onPress={() => navigation.navigate("VoiceCapture")}
        />
        <ActionTile
          title="Список транзакций"
          description="Поиск, фильтры и корректировка категорий."
          onPress={() => navigation.navigate("TransactionsList")}
        />
      </SectionCard>
    </Screen>
  );
}
