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
      <SectionCard title="Collection Module" subtitle="Module 1: import, voice, manual entry">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <MetricPill label="Imports" value="24 this month" />
          <MetricPill label="Voice Notes" value="17 pending" />
        </View>
      </SectionCard>

      <SectionCard title="Transaction Intake">
        <ActionTile
          title="Manual Entry"
          description="Create a transaction with placeholder controls."
          onPress={() => navigation.navigate("TransactionCreate")}
        />
        <ActionTile
          title="Import Center"
          description="CSV/Excel import flow with fake progress and statuses."
          onPress={() => navigation.navigate("ImportCenter")}
        />
        <ActionTile
          title="Voice Input"
          description="Record flow UI and transcription placeholder."
          onPress={() => navigation.navigate("VoiceCapture")}
        />
        <ActionTile
          title="All Transactions"
          description="List, search bar and category chips (mocked)."
          onPress={() => navigation.navigate("TransactionsList")}
        />
      </SectionCard>
    </Screen>
  );
}
