import { useState, useEffect, useCallback, memo, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, RefreshControl, TextInput, Alert, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import client, { IMAGE_BASE } from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const ConversationItem = memo(({ item, onPress, onLongPress, onDelete, onMute, onPin, t }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastX = useRef(0);

  const handlePanEnd = (_, gestureState) => {
    if (gestureState.dx < -100) {
      Animated.spring(translateX, { toValue: -120, useNativeDriver: true }).start();
    } else {
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    }
  };

  const resetSwipe = () => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
  };

  return (
    <View style={s.rowWrap}>
      <View style={s.swipeActions}>
        <TouchableOpacity style={[s.swipeAction, { backgroundColor: COLORS.primary }]} onPress={() => { resetSwipe(); onPin(item.user.id); }}>
          <Text style={s.swipeText}>{item.is_pinned ? "📌" : "📍"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.swipeAction, { backgroundColor: "#F39C12" }]} onPress={() => { resetSwipe(); onMute(item.user.id); }}>
          <Text style={s.swipeText}>{item.is_muted ? "🔔" : "🔕"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.swipeAction, { backgroundColor: COLORS.danger }]} onPress={() => { resetSwipe(); onDelete(item.user.id, item.user.username); }}>
          <Text style={s.swipeText}>🗑️</Text>
        </TouchableOpacity>
      </View>
      <Animated.View style={[s.row, { transform: [{ translateX }] }]}>
        <TouchableOpacity style={s.rowInner} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
          <View style={s.avatarWrap}>
            {item.user.avatar ? (
              <Image source={{ uri: `${IMAGE_BASE}${item.user.avatar}` }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatar, { backgroundColor: COLORS.primary + "30" }]}>
                <Text style={[s.avatarText, { color: COLORS.primary }]}>{item.user.username?.[0]?.toUpperCase() || "?"}</Text>
              </View>
            )}
            {item.user.is_online && <View style={s.onlineDot} />}
          </View>
          <View style={s.info}>
            <View style={s.nameRow}>
              <View style={s.nameLeft}>
                {item.is_pinned && <Text style={s.pinIcon}>📌</Text>}
                <Text style={s.name} numberOfLines={1}>{item.user.username}</Text>
              </View>
              <View style={s.nameRight}>
                {item.is_muted && <Text style={s.muteIcon}>🔕</Text>}
                {item.last_message?.created_at && (
                  <Text style={s.time}>{formatTime(item.last_message.created_at, t)}</Text>
                )}
              </View>
            </View>
            <View style={s.previewRow}>
              <Text style={[s.preview, item.unread_count > 0 && { color: COLORS.text, fontWeight: "600" }]} numberOfLines={1}>
                {item.last_message?.type === "image" ? `📷 ${t("photo")}` : item.last_message?.type === "voice" ? `🎤 ${t("voice")}` : item.last_message?.is_mine ? t("you") : ""}{item.last_message?.content || t("startConv")}
              </Text>
              {item.unread_count > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.unread_count > 9 ? "9+" : item.unread_count}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

function formatTime(dateStr, t) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return t("now");
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MessagesScreen({ navigation }) {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try { const res = await client.get("/messages/conversations"); setConversations(res.data || []); } catch (e) { console.warn("Conversations error", e?.response?.status); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation?.addListener?.("focus", () => load());
    return unsub;
  }, [navigation, load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const deleteConversation = (userId, username) => {
    Alert.alert(t("deleteConversation"), t("deleteConvConfirm").replace("{username}", username), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
        try { await client.delete(`/messages/conversation/${userId}`); load(); } catch (e) {}
      }},
    ]);
  };

  const toggleMute = async (userId) => {
    try { await client.post(`/messages/mute/${userId}`); load(); } catch (e) {}
  };

  const togglePin = async (userId) => {
    try { await client.post(`/messages/pin/${userId}`); load(); } catch (e) {}
  };

  const filtered = search
    ? conversations.filter((c) => c.user.username.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <Screen3D style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>{t("messages")}</Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn} onPress={() => navigation.navigate("Search")}>
            <Text style={s.headerBtnIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder={t("searchConversations")}
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Text style={s.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.user.id)}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyCircle}>
              <Text style={s.emptyIcon}>💬</Text>
            </View>
            <Text style={s.emptyTitle}>{search ? t("noResults") : t("noMessages")}</Text>
            <Text style={s.emptySub}>{search ? t("tryDifferentSearch") : t("startConversation")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ConversationItem
            item={item}
            onPress={() => navigation.navigate("Chat", { userId: item.user.id, username: item.user.username })}
            onLongPress={() => {
              Alert.alert(item.user.username, null, [
                { text: item.is_pinned ? t("unpin") : t("pin"), onPress: () => togglePin(item.user.id) },
                { text: item.is_muted ? t("unmute") : t("mute"), onPress: () => toggleMute(item.user.id) },
                { text: t("delete"), style: "destructive", onPress: () => deleteConversation(item.user.id, item.user.username) },
                { text: t("cancel"), style: "cancel" },
              ]);
            }}
            onDelete={deleteConversation}
            onMute={toggleMute}
            onPin={togglePin}
            t={t}
          />
        )}
      />
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: SIZES.title, fontWeight: "900", color: COLORS.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center" },
  headerBtnIcon: { fontSize: 18 },
  searchWrap: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.input, borderRadius: SIZES.radius, paddingHorizontal: 12, height: 44, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: SIZES.md },
  clearBtn: { color: COLORS.muted, fontSize: 16, padding: 4 },
  rowWrap: { overflow: "hidden" },
  swipeActions: { position: "absolute", right: 0, top: 0, bottom: 0, flexDirection: "row", alignItems: "center" },
  swipeAction: { width: 40, height: 70, alignItems: "center", justifyContent: "center", marginLeft: 2 },
  swipeText: { fontSize: 18 },
  row: { backgroundColor: COLORS.bg },
  rowInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatarWrap: { position: "relative" },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { fontWeight: "700", fontSize: 20 },
  onlineDot: { position: "absolute", bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 3, borderColor: COLORS.bg },
  info: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  nameLeft: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  nameRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontSize: SIZES.lg, fontWeight: "600", color: COLORS.text, flex: 1 },
  time: { fontSize: SIZES.xs, color: COLORS.muted },
  pinIcon: { fontSize: 12 },
  muteIcon: { fontSize: 12 },
  previewRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  preview: { fontSize: SIZES.sm, color: COLORS.muted, flex: 1 },
  badge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginLeft: 8 },
  badgeText: { color: COLORS.text, fontSize: SIZES.xs, fontWeight: "700" },
  emptyWrap: { alignItems: "center", paddingTop: 80, paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: SIZES.sm, color: COLORS.muted, textAlign: "center", lineHeight: 20 },
});
