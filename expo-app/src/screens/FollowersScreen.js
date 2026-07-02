import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import client from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function FollowersScreen({ navigation }) {
  const { t } = useLanguage();
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [tab, setTab] = useState("followers");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const [f1, f2] = await Promise.all([
        client.get(`/follow/${user.id}/followers`),
        client.get(`/follow/${user.id}/following`),
      ]);
      setFollowers(f1.data || []);
      setFollowing(f2.data || []);
    } catch (e) { console.warn("Followers load error", e?.response?.status); }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const list = tab === "followers" ? followers : following;

  return (
    <Screen3D style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>{tab === "followers" ? t("followersTab") : t("followingTab")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={s.tabs}>
        <TouchableOpacity onPress={() => setTab("followers")} style={[s.tab, tab === "followers" && s.activeTab]}>
          <Text style={[s.tabText, tab === "followers" && s.activeTabText]}>{t("followersTab")}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTab("following")} style={[s.tab, tab === "following" && s.activeTab]}>
          <Text style={[s.tabText, tab === "following" && s.activeTabText]}>{t("followingTab")}</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(f) => String(f.id)}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 30) }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>{tab === "followers" ? "👥" : "👤"}</Text>
              <Text style={s.empty}>{tab === "followers" ? t("noFollowers") : t("noFollowing")}</Text>
            </View>
          }
          renderItem={({ item: f }) => (
            <View style={s.row}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {tab === "followers" ? (f.follower?.username?.[0]?.toUpperCase() || "?") : (f.following?.username?.[0]?.toUpperCase() || "?")}
                </Text>
              </View>
              <Text style={s.name}>
                {tab === "followers" ? (f.follower?.username || t("unknown")) : (f.following?.username || t("unknown"))}
              </Text>
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
  tabs: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  tab: { flex: 1, padding: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  activeTabText: { color: COLORS.text },
  emptyWrap: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  empty: { textAlign: "center", color: COLORS.muted, fontSize: SIZES.md },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  name: { fontWeight: "600", fontSize: 14, color: COLORS.text },
});
