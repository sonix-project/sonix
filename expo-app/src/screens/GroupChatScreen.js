import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client, { resolveUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const MessageBubble = ({ item, isMine }) => {
  const { t } = useLanguage();
  const isImage = item.type === "image" && item.image;
  const showName = !isMine;

  return (
    <View style={[s.bubbleRow, isMine ? s.bubbleMine : s.bubbleOther]}>
      <View style={[s.bubble, isMine ? s.bubbleBgMine : s.bubbleBgOther]}>
        {showName && <Text style={s.senderName}>{item.user?.username || "?"}</Text>}
        {isImage ? (
          <Image source={{ uri: resolveUrl(item.image) }} style={s.bubbleImage} resizeMode="cover" />
        ) : (
          <Text style={[s.bubbleText, isMine && s.bubbleTextMine]}>{item.content}</Text>
        )}
        <Text style={[s.bubbleTime, isMine && s.bubbleTimeMine]}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
    </View>
  );
};

export default function GroupChatScreen({ navigation, route }) {
  const { groupId, groupName } = route.params;
  const { t } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const flatRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadMore, setLoadMore] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: groupName || t("groupChat") });
  }, [navigation, groupName, t]);

  useEffect(() => { loadMessages(); }, []);

  const loadMessages = async (isLoadMore = false) => {
    try {
      if (isLoadMore && !hasMore) return;
      if (isLoadMore) setLoadMore(true);
      else setLoading(true);
      const params = { limit: 50 };
      if (isLoadMore && cursor) params.cursor = cursor;
      const res = await client.get(`/groups/${groupId}/messages`, { params });
      const newMsgs = res.data.data || [];
      if (isLoadMore) {
        setMessages((prev) => [...newMsgs, ...prev]);
      } else {
        setMessages(newMsgs);
      }
      setCursor(res.data.next_cursor);
      setHasMore(res.data.has_more);
    } catch (e) {
      if (!isLoadMore) Alert.alert(t("error"), t("failedToLoad"));
    } finally {
      setLoading(false);
      setLoadMore(false);
    }
  };

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    const prevText = text;
    setText("");
    try {
      const res = await client.post(`/groups/${groupId}/messages`, { content });
      const msg = res.data;
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      setText(prevText);
      Alert.alert(t("error"), t("error"));
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => (
    <MessageBubble item={item} isMine={item.user_id === user?.id} />
  );

  return (
    <Screen3D style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}>
        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, paddingBottom: 20 }}
            onEndReached={() => loadMessages(true)}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<View style={s.centered}><Text style={s.emptyText}>{t("noMessages")}</Text></View>}
            ListFooterComponent={loadMore ? <ActivityIndicator color={COLORS.primary} style={{ padding: 10 }} /> : null}
            inverted={false}
          />
        )}
        <View style={[s.inputBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder={t("message")}
            placeholderTextColor={COLORS.muted}
            returnKeyType="send"
            onSubmitEditing={send}
            multiline
          />
          <TouchableOpacity style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnDisabled]} onPress={send} disabled={!text.trim() || sending}>
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.sendText}>{t("send")}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: COLORS.muted, fontSize: SIZES.md },
  bubbleRow: { marginVertical: 2 },
  bubbleMine: { alignItems: "flex-end" },
  bubbleOther: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleBgMine: { backgroundColor: COLORS.primary + "30" },
  bubbleBgOther: { backgroundColor: COLORS.input },
  senderName: { fontSize: 11, fontWeight: "700", color: COLORS.primary, marginBottom: 2 },
  bubbleText: { fontSize: SIZES.md, color: COLORS.text, lineHeight: 20 },
  bubbleTextMine: { color: COLORS.text },
  bubbleTime: { fontSize: 10, color: COLORS.muted, marginTop: 4, alignSelf: "flex-end" },
  bubbleTimeMine: { color: COLORS.textSecondary },
  bubbleImage: { width: 200, height: 200, borderRadius: 12 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 8, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  input: { flex: 1, backgroundColor: COLORS.input, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontSize: SIZES.md, maxHeight: 100 },
  sendBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: SIZES.md },
});
