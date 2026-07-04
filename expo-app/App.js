import React, { Component } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./src/context/AuthContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import AppNavigator from "./src/navigation/AppNavigator";

class ErrorBoundary extends Component {
  state = { error: null, info: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { this.setState({ info }); }
  render() {
    if (this.state.error) {
      return (
        <View style={s.errorContainer}>
          <Text style={s.errorTitle}>⚠️ Something went wrong</Text>
          <ScrollView style={s.scrollArea}>
            <Text style={s.errorLabel}>Error:</Text>
            <Text style={s.errorMsg}>{this.state.error.message}</Text>
            {this.state.error.stack && (
              <>
                <Text style={s.errorLabel}>Stack:</Text>
                <Text style={s.errorStack}>{this.state.error.stack}</Text>
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={s.errorBtn} onPress={() => this.setState({ error: null })}>
            <Text style={s.errorBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <LanguageProvider>
            <NavigationContainer>
              <StatusBar style="light" backgroundColor="#0D0D1A" />
              <AppNavigator />
            </NavigationContainer>
          </LanguageProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D0D1A", padding: 20 },
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 16 },
  scrollArea: { flex: 1, width: "100%", marginBottom: 16 },
  errorLabel: { fontSize: 12, fontWeight: "600", color: "#6C5CE7", marginTop: 12, marginBottom: 4 },
  errorMsg: { fontSize: 14, color: "#E17055", backgroundColor: "#1A1A35", padding: 12, borderRadius: 8, fontFamily: "monospace" },
  errorStack: { fontSize: 11, color: "#B2BEC3", backgroundColor: "#1A1A35", padding: 12, borderRadius: 8, fontFamily: "monospace", lineHeight: 16 },
  errorBtn: { backgroundColor: "#6C5CE7", paddingVertical: 12, paddingHorizontal: 40, borderRadius: 12 },
  errorBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
