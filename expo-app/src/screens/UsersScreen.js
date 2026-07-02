import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import client from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function UsersScreen({ navigation }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const [usersRes, followingRes] = await Promise.all([
        client.get("/users"),
        client.get(`/follow/${user.id}/following`),
      ]);
      setUsers((usersRes.data || []).filter((u) => u.id !== user.id));
      setFollowingIds(new Set((followingRes.data || []).map((f) => f.following_id || f.following?.id)));
    } catch (e) { console.warn("Users load error", e?.response?.status); }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const toggleFollow = async (userId) => {
    try {
      const res = await client.post("/follow", { followingId: userId });
      if (res.data.requested) setRequestedIds((p) => new Set([...p, userId]));
      else if (res.data.following) setFollowingIds((p) => new Set([...p, userId]));
      else { setFollowingIds((p) => { const n = new Set(p); n.delete(userId); return n; }); setRequestedIds((p) => { const n = new Set(p); n.delete(userId); return n; }); }
    } catch (e) { console.warn("Toggle follow error", e?.response?.status); }
  };

  const getState = (u) => {
    if (followingIds.has(u.id)) return "following";
    if (requestedIds.has(u.id)) return "requested";
    return "follow";
  };

  const filtered = search.trim() ? users.filter((u) => u.username?.toLowerCase().includes(search.toLowerCase())) : users;

  return (
    <Screen3D style={s.container}>
      <View style={[s.searchWrap, { paddingTop: insets.top + 6 }]}>
        <TextInput style={s.search} placeholder={t("searchPeople")} placeholderTextColor={COLORS.muted} value={search} onChangeText={setSearch} />
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 30) }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.empty}>{t("noUsersFound")}</Text>
            </View>
          }
          renderItem={({ item: u }) => {
            const state = getState(u);
            return (
              <View style={s.row}>
                <TouchableOpacity style={s.rowLeft} onPress={() => navigation.navigate("UserProfile", { userId: u.id })}>
                  <View style={s.avatar}><Text style={s.avatarText}>{u.username?.[0]?.toUpperCase() || "?"}</Text></View>
                  <Text style={s.name}>{u.username}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleFollow(u.id)} style={[s.followBtn, { backgroundColor: state === "follow" ? COLORS.primary : COLORS.input }]}>
                  <Text style={[s.followText, { color: state === "follow" ? COLORS.text : COLORS.textSecondary }]}>
                    {state === "following" ? t("followingStatus") : state === "requested" ? t("requested") : t("follow")}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: { paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  search: { backgroundColor: COLORS.input, borderRadius: 10, padding: 10, fontSize: 14, color: COLORS.text },
  emptyWrap: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  empty: { textAlign: "center", color: COLORS.muted, fontSize: SIZES.md },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  name: { fontWeight: "600", fontSize: 14, color: COLORS.text },
  followBtn: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 8 },
  followText: { fontWeight: "600", fontSize: 13 },
});
