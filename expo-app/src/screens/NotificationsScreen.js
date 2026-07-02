import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import client from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function NotificationsScreen({ navigation }) {
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try { const res = await client.get("/notifications"); setNotifications(res.data || []); await client.patch("/notifications/seen"); } catch (e) { console.warn("Notifications load error", e?.response?.status); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <Screen3D style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>{t("notifications")}</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 30) }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.text} colors={[COLORS.text]} />}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>🔔</Text>
              <Text style={s.emptyTitle}>{t("noNotifications")}</Text>
            </View>
          }
          renderItem={({ item: n }) => (
            <View style={[s.card, !n.seen && s.unread]}>
              <View style={s.avatar}><Text style={s.avatarText}>{n.sender?.username?.[0]?.toUpperCase() || "?"}</Text></View>
              <Text style={s.msg}><Text style={s.user}>{n.sender?.username}</Text> {n.message}</Text>
              <Text style={s.time}>{new Date(n.created_at).toLocaleDateString()}</Text>
            </View>
          )}
        />
      )}
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingBottom: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 22, color: COLORS.text },
  title: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  emptyWrap: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, color: COLORS.muted },
  card: { flexDirection: "row", padding: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, gap: 10, alignItems: "center" },
  unread: { backgroundColor: COLORS.cardHover },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  msg: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  user: { fontWeight: "700", color: COLORS.text },
  time: { fontSize: 11, color: COLORS.muted },
});
