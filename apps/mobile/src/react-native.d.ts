// Декларации для React Native и AsyncStorage
declare module 'react' {
  export const useState: <T>(initialState: T | (() => T)) => [T, (value: T) => void];
  export const useEffect: (effect: () => void | (() => void), deps?: any[]) => void;
  export const createContext: <T>(defaultValue: T) => any;
  export const useContext: <T>(context: any) => T;
  export const FC: <P = {}>(props: P) => any;
  export const ReactNode: any;
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const TextInput: any;
  export const TouchableOpacity: any;
  export const StyleSheet: any;
  export const Alert: any;
  export const ActivityIndicator: any;
  export const StatusBar: any;
  export const SafeAreaView: any;
  export const ScrollView: any;
  export const FlatList: any;
  export const Image: any;
  export const Pressable: any;
  export const Dimensions: any;
  export const Platform: any;
}

declare module 'react-native' {
  export * from 'react-native';
}

declare module '@react-native-async-storage/async-storage' {
  export interface AsyncStorageStatic {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
  }
  
  const AsyncStorage: AsyncStorageStatic;
  export default AsyncStorage;
}

declare module '@react-navigation/native' {
  export * from '@react-navigation/native';
}

declare module '@react-navigation/bottom-tabs' {
  export * from '@react-navigation/bottom-tabs';
}

declare module '@react-navigation/native-stack' {
  export * from '@react-navigation/native-stack';
}

declare module 'expo-status-bar' {
  export * from 'expo-status-bar';
}

declare module 'expo-linear-gradient' {
  export * from 'expo-linear-gradient';
}

declare module 'expo-font' {
  export * from 'expo-font';
}

declare module '@expo/vector-icons' {
  export * from '@expo/vector-icons';
}

declare module 'react-native-gesture-handler' {
  export * from 'react-native-gesture-handler';
}

declare module 'react-native-reanimated' {
  export * from 'react-native-reanimated';
}

declare module 'react-native-safe-area-context' {
  export * from 'react-native-safe-area-context';
}

declare module 'react-native-screens' {
  export * from 'react-native-screens';
}

declare module 'react-native-svg' {
  export * from 'react-native-svg';
}

declare module 'react-native-worklets' {
  export * from 'react-native-worklets';
}
