import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors } from "@shared/theme/colors";
import { RootTabParamList } from "./types";
import { DashboardStackNavigator } from "./stacks/DashboardStack";
import { DataStackNavigator } from "./stacks/DataStack";
import { AnalysisStackNavigator } from "./stacks/AnalysisStack";
import { AssistantStackNavigator } from "./stacks/AssistantStack";
import { ProfileStackNavigator } from "./stacks/ProfileStack";

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            height: 62,
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={iconName(route.name)} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardStackNavigator} options={{ title: "Home" }} />
        <Tab.Screen name="DataHub" component={DataStackNavigator} options={{ title: "Data" }} />
        <Tab.Screen name="Analysis" component={AnalysisStackNavigator} options={{ title: "Control" }} />
        <Tab.Screen name="Assistant" component={AssistantStackNavigator} options={{ title: "AI" }} />
        <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: "Profile" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function iconName(routeName: keyof RootTabParamList): keyof typeof Ionicons.glyphMap {
  switch (routeName) {
    case "Dashboard":
      return "grid-outline";
    case "DataHub":
      return "swap-horizontal-outline";
    case "Analysis":
      return "pie-chart-outline";
    case "Assistant":
      return "mic-outline";
    case "Profile":
      return "person-outline";
    default:
      return "ellipse-outline";
  }
}
