import { Feather } from "@expo/vector-icons";
import React, { Component, ComponentType, PropsWithChildren, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const monoFont = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

  return (
    <View style={styles.fallback}>
      <Pressable style={styles.detailsButton} onPress={() => setDetailsOpen(true)}>
        <Feather name="alert-circle" size={20} color="#1A1A2E" />
      </Pressable>
      <View style={styles.fallbackContent}>
        <Text style={styles.fallbackTitle}>Что-то пошло не так</Text>
        <Text style={styles.fallbackText}>Перезагрузите экран или попробуйте ещё раз.</Text>
        <Pressable style={styles.retryButton} onPress={resetError}>
          <Text style={styles.retryText}>Попробовать снова</Text>
        </Pressable>
      </View>

      <Modal visible={detailsOpen} animationType="slide" transparent onRequestClose={() => setDetailsOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Детали ошибки</Text>
              <Pressable onPress={() => setDetailsOpen(false)}>
                <Feather name="x" size={24} color="#1A1A2E" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text selectable style={[styles.errorText, { fontFamily: monoFont }]}>
                {`Error: ${error.message}\n\n${error.stack || ""}`}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    this.props.onError?.(error, info.componentStack);
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const FallbackComponent = this.props.FallbackComponent || ErrorFallback;
    return this.state.error ? <FallbackComponent error={this.state.error} resetError={this.resetError} /> : this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", padding: 24 },
  fallbackContent: { alignItems: "center", gap: 14, width: "100%" },
  fallbackTitle: { color: "#1A1A2E", fontSize: 28, lineHeight: 36, fontFamily: "Inter_700Bold", textAlign: "center" },
  fallbackText: { color: "#6B7280", fontSize: 16, lineHeight: 24, fontFamily: "Inter_400Regular", textAlign: "center" },
  retryButton: { minWidth: 210, minHeight: 52, borderRadius: 16, backgroundColor: "#6B46C1", alignItems: "center", justifyContent: "center" },
  retryText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  detailsButton: { position: "absolute", right: 18, top: 58, width: 44, height: 44, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modal: { height: "88%", backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { minHeight: 64, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  modalTitle: { color: "#1A1A2E", fontSize: 20, fontFamily: "Inter_700Bold" },
  modalBody: { padding: 16 },
  errorText: { color: "#1A1A2E", fontSize: 12, lineHeight: 18 },
});
