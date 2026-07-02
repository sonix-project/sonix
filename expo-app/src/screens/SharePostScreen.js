import { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client, { IMAGE_BASE } from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import { useLanguage } from "../context/LanguageContext";
import Screen3D from "../components/3D/Screen3D";

export default function SharePostScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { postId } = route.params;
  const [users, setUsers] = useState([]);
  const [sending, setSending] = useState(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get("/messages/conversations");
        setUsers(res.data.map((c) => c.user));
      } catch (e) { console.warn("Share load error", e?.response?.status); }
    })();
  }, []);

  const shareWith = async (userId, username) => {
    setSending(userId);
    try {
      const postUrl = `${IMAGE_BASE}/posts/${postId}`;
      await client.post("/messages", { receiver_id: userId, content: `Shared a post with you: ${postUrl}` });
      Alert.alert("Sent", `Post shared with ${username}`);
      navigation.goBack();
    } catch (e) {
      Alert.alert(t("error"), t("failedToShare"));
    }
    setSending(null);
  };

  return (
    <Screen3D style={[s.wrap, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.backBtn}>←</Text></TouchableOpacity>
        <Text style={s.title}>{t("sharePost")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <Text style={s.info}>{t("sharePostDesc")}</Text>
      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>📤</Text>
            <Text style={s.empty}>{t("noConversations")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.userRow} onPress={() => shareWith(item.id, item.username)} disabled={sending === item.id}>
            <View style={s.avatar}><Text style={s.avatarText}>{item.username?.[0]?.toUpperCase() || "?"}</Text></View>
            <Text style={s.username}>{item.username}</Text>
            {sending === item.id ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Text style={s.sendIcon}>➤</Text>}
          </TouchableOpacity>
        )}
      />
    </Screen3D>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  backBtn: { fontSize: 22, color: COLORS.text, padding: 8 },
  title: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  info: { color: COLORS.muted, fontSize: 13, paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  userRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.primary, fontSize: 18, fontWeight: "600" },
  username: { flex: 1, color: COLORS.text, fontSize: 14 },
  sendIcon: { color: COLORS.primary, fontSize: 16 },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  empty: { color: COLORS.muted, fontSize: 14 },
});
