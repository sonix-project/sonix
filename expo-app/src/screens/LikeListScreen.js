import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function LikeListScreen({ route, navigation }) {
  const { postId } = route.params;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`/likes/${postId}/users`);
        setUsers(res.data);
      } catch (e) { console.warn("Like list error", e?.response?.status); }
      setLoading(false);
    })();
  }, [postId]);

  return (
    <Screen3D>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.backBtn}>←</Text></TouchableOpacity>
        <Text style={s.title}>Likes</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => String(u.id)}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>❤️</Text>
              <Text style={s.empty}>No likes yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.userRow} onPress={() => navigation.navigate("UserProfile", { userId: item.id })}>
              <View style={s.avatar}><Text style={s.avatarText}>{item.username?.[0]?.toUpperCase() || "?"}</Text></View>
              <Text style={s.username}>{item.username}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen3D>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { fontSize: 22, color: COLORS.text },
  title: { fontSize: SIZES.lg, fontWeight: "600", color: COLORS.text },
  emptyWrap: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  empty: { color: COLORS.muted, textAlign: "center", fontSize: SIZES.md },
  userRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.text, fontSize: 16, fontWeight: "600" },
  username: { color: COLORS.text, fontSize: 14, fontWeight: "500" },
});
