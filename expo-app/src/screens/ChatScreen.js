import { useState, useEffect, useCallback, useRef, memo } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator, Dimensions, Animated, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import client, { IMAGE_BASE } from "../api/client";
import { getEcho } from "../api/websocket";
import { cacheMessages, getCachedMessages, addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from "../api/cache";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const { width: SCREEN_W } = Dimensions.get("window");

const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "🔥", "👍", "👎", "😡"];

const MessageBubble = memo(({ item, isMine, onLongPress }) => {
  const { t } = useLanguage();
  const [showReactions, setShowReactions] = useState(false);

  const handleLongPress = () => {
    if (item.pending) return;
    setShowReactions((s) => !s);
  };

  const handleReaction = async (emoji) => {
    setShowReactions(false);
    try {
      await client.post(`/messages/${item.id}/react`, { emoji });
    } catch (_) {}
  };

  const replyName = item.reply_message?.sender?.username;
  const replyContent = item.reply_message?.content;

  return (
    <View style={[s.bubbleWrap, isMine ? s.bubbleWrapMine : s.bubbleWrapTheirs, item.pending && s.bubblePending]}>
      {item.reply_message && (
        <View style={[s.replyPreview, isMine ? s.replyPreviewMine : s.replyPreviewTheirs]}>
          <Text style={s.replyName}>{replyName || t("message")}</Text>
          <Text style={s.replyText} numberOfLines={1}>{replyContent || "..."}</Text>
        </View>
      )}

      {item.type === "image" && item.image ? (
        <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.8}>
          <Image source={{ uri: `${IMAGE_BASE}${item.image}` }} style={s.messageImage} resizeMode="cover" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onLongPress={handleLongPress} activeOpacity={0.8} style={[s.bubble, isMine ? s.mine : s.theirs, item.pending && s.bubblePendingBg]}>
          <Text style={[s.bubbleText, isMine && s.bubbleTextMine, item.pending && s.bubbleTextPending]}>{item.content}</Text>
        </TouchableOpacity>
      )}

      <View style={[s.bubbleMeta, isMine && s.bubbleMetaMine]}>
        <Text style={[s.bubbleTime, isMine && s.bubbleTimeMine]}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
        {isMine && !item.pending && <Text style={s.readIcon}>{item.read_at ? "✓✓" : "✓"}</Text>}
        {item.pending && <ActivityIndicator size={10} color={COLORS.muted} style={{ marginLeft: 4 }} />}
      </View>

      {item.reactions && item.reactions.length > 0 && (
        <View style={[s.reactionsRow, isMine && s.reactionsRowMine]}>
          {item.reactions.map((r, i) => (
            <View key={i} style={s.reactionChip}>
              <Text style={s.reactionEmoji}>{r.emoji}</Text>
            </View>
          ))}
        </View>
      )}

      {showReactions && (
        <View style={[s.reactionsPicker, isMine ? s.reactionsPickerMine : s.reactionsPickerTheirs]}>
          {EMOJI_LIST.map((emoji) => (
            <TouchableOpacity key={emoji} style={s.reactionOption} onPress={() => handleReaction(emoji)}>
              <Text style={s.reactionOptionText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

function DateSeparator({ date }) {
  const { t } = useLanguage();
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let label;
  if (d.toDateString() === today.toDateString()) label = t("today");
  else if (d.toDateString() === yesterday.toDateString()) label = t("yesterday");
  else label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <View style={s.dateSep}>
      <View style={s.dateSepLine} />
      <Text style={s.dateSepText}>{label}</Text>
      <View style={s.dateSepLine} />
    </View>
  );
}

function TypingIndicator({ username }) {
  const { t } = useLanguage();
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = () => {
      return Animated.sequence([
        Animated.parallel([
          Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]);
    };
    const loop = Animated.loop(animate());
    loop.start();
    return () => loop.stop();
  }, [dot1, dot2, dot3]);

  return (
    <View style={s.typingWrap}>
      <Text style={s.typingText}>{t("isTyping", { username })}</Text>
      <View style={s.typingDots}>
        <Animated.View style={[s.dot, { opacity: dot1 }]} />
        <Animated.View style={[s.dot, { opacity: dot2 }]} />
        <Animated.View style={[s.dot, { opacity: dot3 }]} />
      </View>
    </View>
  );
}

export default function ChatScreen({ route, navigation }) {
  const { userId, username } = route.params;
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user } = useAuth();
  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(async (cursor = null) => {
    try {
      const url = cursor ? `/messages/${userId}?cursor=${cursor}&limit=50` : `/messages/${userId}?limit=50`;
      const res = await client.get(url);
      const newMessages = res.data?.data || [];
      const nextCursor = res.data?.next_cursor;
      const more = res.data?.has_more || false;

      if (cursor) {
        setMessages((prev) => [...newMessages, ...prev]);
      } else {
        setMessages(newMessages);
        await cacheMessages(userId, newMessages);
      }
      setHasMore(more);
    } catch (e) {
      console.warn("Messages load error, trying cache", e?.response?.status);
      if (!cursor) {
        const cached = await getCachedMessages(userId);
        if (cached.length > 0) setMessages(cached);
      }
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const processQueue = async () => {
      const queue = await getOfflineQueue();
      for (const msg of queue) {
        try {
          const payload = { receiver_id: msg.receiver_id, content: msg.content };
          if (msg.reply_to) payload.reply_to = msg.reply_to;
          await client.post("/messages", payload);
          await removeFromOfflineQueue(msg.temp_id);
        } catch (_) {}
      }
    };
    processQueue();
  }, []);

  const loadMore = async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    await load(messages[0]?.id);
    setLoadingMore(false);
  };

  useEffect(() => {
    let echoChannel;
    let typingChannel;

    const setupWebSocket = async () => {
      const echo = await getEcho();
      if (!echo) return;

      echoChannel = echo.private(`messages.${user?.id}`);

      echoChannel.listen(".message.sent", (event) => {
        if (event.sender_id === parseInt(userId) || event.receiver_id === parseInt(userId)) {
          setMessages((prev) => {
            if (prev.find((m) => m.id === event.id)) return prev;
            return [...prev, {
              id: event.id,
              content: event.content,
              type: event.type,
              image: event.image,
              voice: event.voice,
              sender_id: event.sender_id,
              receiver_id: event.receiver_id,
              created_at: event.created_at,
              is_read: event.is_read,
              reply_to: event.reply_to,
              sender: event.sender,
              reply_message: null,
              reactions: [],
            }];
          });
        }
      });

      typingChannel = echo.private(`typing.${user?.id}`);
      typingChannel.listen(".typing.indicator", (event) => {
        if (event.sender_id === parseInt(userId)) {
          setRemoteTyping(event.typing);
        }
      });

      client.post("/messages/online").catch(() => {});
    };

    setupWebSocket();

    const checkOnline = setInterval(async () => {
      try {
        const userRes = await client.get(`/users/${userId}/status`);
        setIsOnline(userRes.data?.is_online || false);
      } catch (_) {}
    }, 10000);

    return () => {
      if (echoChannel) echoChannel.leave();
      if (typingChannel) typingChannel.leave();
      clearInterval(checkOnline);
    };
  }, [user?.id, userId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => {
    client.post(`/messages/read/${userId}`).catch(() => {});
  }, [messages, userId]);

  const send = async () => {
    if (!text.trim() && !replyTo) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    setReplyTo(null);

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      content: msg,
      type: "text",
      sender_id: user?.id,
      receiver_id: parseInt(userId),
      created_at: new Date().toISOString(),
      is_read: false,
      reply_to: replyTo?.id,
      sender: { id: user?.id, username: user?.username, avatar: user?.avatar },
      reply_message: replyTo,
      reactions: [],
      pending: true,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const payload = { receiver_id: userId, content: msg };
      if (replyTo) payload.reply_to = replyTo.id;
      const res = await client.post("/messages", payload);

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...res.data, pending: false } : m))
      );
      await removeFromOfflineQueue(tempId);
    } catch (e) {
      await addToOfflineQueue({ temp_id: tempId, ...optimisticMessage });
      console.warn("Send error, queued offline", e?.response?.status);
    }
    setSending(false);
  };

  const sendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert(t("permissionNeeded")); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSending(true);
      try {
        const formData = new FormData();
        formData.append("receiver_id", userId);
        const uri = result.assets[0].uri;
        const filename = uri.split("/").pop() || "photo.jpg";
        formData.append("image", { uri, name: filename, type: "image/jpeg" });
        await client.post("/messages", formData, { headers: { "Content-Type": "multipart/form-data" } });
        await load();
      } catch (e) { Alert.alert(t("error"), t("failedToSendImage")); }
      setSending(false);
    }
  };

  const sendReaction = async (emoji) => {
    setShowEmojiPicker(false);
    try {
      await client.post("/messages", { receiver_id: userId, content: emoji, reaction: emoji });
      await load();
    } catch (_) {}
  };

  const handleTextChange = (val) => {
    setText(val);
    if (!typingTimerRef.current) {
      client.post("/messages/typing", { receiver_id: userId, typing: true }).catch(() => {});
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      client.post("/messages/typing", { receiver_id: userId, typing: false }).catch(() => {});
      typingTimerRef.current = null;
    }, 2000);
  };

  const deleteMessage = (id) => {
    Alert.alert(t("deleteMessage"), t("deleteMessageConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
        try { await client.delete(`/messages/${id}`); load(); } catch (e) {}
      }},
    ]);
  };

  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((m) => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) {
      groupedMessages.push({ type: "date", date: m.created_at, key: `date_${d}` });
      lastDate = d;
    }
    groupedMessages.push({ ...m, key: String(m.id) });
  });

  return (
    <View style={s.outerContainer}>
    <Screen3D>
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "padding"} keyboardVerticalOffset={0}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.avatarSmall}>
            <Text style={s.avatarText}>{username?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <View>
            <Text style={s.name}>{username}</Text>
            <Text style={[s.statusText, { color: isOnline ? COLORS.success : COLORS.muted }]}>
              {isOnline ? t("online") : t("offline")}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={s.moreBtn}>
          <Text style={s.moreIcon}>⋮</Text>
        </TouchableOpacity>
      </View>

      {replyTo && (
        <View style={s.replyBar}>
          <View style={s.replyBarContent}>
            <Text style={s.replyBarName}>{t("replyingTo", { username: replyTo.sender?.username || t("message") })}</Text>
            <Text style={s.replyBarText} numberOfLines={1}>{replyTo.content}</Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Text style={s.replyBarClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={groupedMessages}
        keyExtractor={(m) => m.key}
        contentContainerStyle={{ padding: 12, paddingBottom: Math.max(insets.bottom + 60, 70) }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} /> : null}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyIcon}>👋</Text>
            <Text style={s.emptyText}>{t("startConvWith").replace("{username}", username)}</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === "date") return <DateSeparator date={item.date} />;
          const mine = item.sender_id === user?.id;
          return (
            <MessageBubble
              item={item}
              isMine={mine}
              onLongPress={() => {
                Alert.alert(t("message"), null, [
                  { text: t("reply"), onPress: () => setReplyTo(item) },
                  ...(mine ? [{ text: t("delete"), style: "destructive", onPress: () => deleteMessage(item.id) }] : []),
                  { text: t("cancel"), style: "cancel" },
                ]);
              }}
            />
          );
        }}
      />

      {remoteTyping && <TypingIndicator username={username} />}

      {showEmojiPicker && (
        <View style={[s.emojiPicker, { bottom: Math.max(insets.bottom + 50, 60) }]}>
          {EMOJI_LIST.map((emoji) => (
            <TouchableOpacity key={emoji} style={s.emojiBtn} onPress={() => sendReaction(emoji)}>
              <Text style={s.emojiBtnText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom + 6, 12) }]}>
        <TouchableOpacity style={s.attachBtn} onPress={sendImage}>
          <Text style={s.attachIcon}>🖼️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.emojiToggleBtn} onPress={() => setShowEmojiPicker((s) => !s)}>
          <Text style={s.emojiToggleIcon}>😊</Text>
        </TouchableOpacity>

        <TextInput
          style={s.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder={t("message") + "..."}
          placeholderTextColor={COLORS.muted}
          returnKeyType="send"
          onSubmitEditing={send}
          multiline
          maxLength={5000}
        />

        <TouchableOpacity
          style={[s.sendBtn, (text.trim() || replyTo) && s.sendBtnActive]}
          onPress={send}
          disabled={sending || (!text.trim() && !replyTo)}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.sendIcon}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </Screen3D>
    </View>
  );
}

const s = StyleSheet.create({
  outerContainer: { flex: 1 },
  container: { flex: 1 },
  topBar: { paddingBottom: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, backgroundColor: COLORS.bg, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 22, color: COLORS.text },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.primary, fontWeight: "700", fontSize: 14 },
  name: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  statusText: { fontSize: 12 },
  moreBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  moreIcon: { fontSize: 22, color: COLORS.text },

  replyBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary + "15", paddingHorizontal: 16, paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  replyBarText: { fontSize: 13, color: COLORS.muted },
  replyBarClose: { fontSize: 16, color: COLORS.muted, padding: 4 },

  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: SIZES.sm, color: COLORS.muted, textAlign: "center" },

  dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 8 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateSepText: { fontSize: 11, color: COLORS.muted, fontWeight: "600" },

  bubbleWrap: { marginBottom: 6, maxWidth: "82%" },
  bubbleWrapMine: { alignSelf: "flex-end" },
  bubbleWrapTheirs: { alignSelf: "flex-start" },
  bubblePending: { opacity: 0.7 },

  replyPreview: { backgroundColor: COLORS.primary + "26", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  replyPreviewMine: { borderLeftColor: COLORS.accent },
  replyPreviewTheirs: { borderLeftColor: COLORS.primary },
  replyName: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  replyText: { fontSize: 12, color: COLORS.muted },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4 },
  bubblePendingBg: { backgroundColor: COLORS.primary + "99" },
  bubbleText: { fontSize: 14, lineHeight: 20, color: COLORS.text },
  bubbleTextMine: { color: "#fff" },
  bubbleTextPending: { fontStyle: "italic" },

  messageImage: { width: SCREEN_W * 0.6, height: SCREEN_W * 0.5, borderRadius: 16 },

  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 4 },
  bubbleMetaMine: { justifyContent: "flex-end", paddingRight: 4 },
  bubbleTime: { fontSize: 10, color: COLORS.muted },
  bubbleTimeMine: { color: COLORS.muted },
  readIcon: { fontSize: 12, color: COLORS.accent },

  reactionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  reactionsRowMine: { justifyContent: "flex-end" },
  reactionChip: { backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.border },
  reactionEmoji: { fontSize: 14 },

  reactionsPicker: { flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 24, padding: 6, gap: 2, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, zIndex: 10 },
  reactionsPickerMine: { alignSelf: "flex-end" },
  reactionsPickerTheirs: { alignSelf: "flex-start" },
  reactionOption: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  reactionOptionText: { fontSize: 20 },

  typingWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 6, gap: 6 },
  typingText: { fontSize: 12, color: COLORS.primary, fontStyle: "italic" },
  typingDots: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  emojiPicker: { position: "absolute", left: 12, right: 12, flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 24, padding: 8, justifyContent: "center", gap: 4, zIndex: 20, borderWidth: 1, borderColor: COLORS.border },
  emojiBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emojiBtnText: { fontSize: 22 },

  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border, backgroundColor: COLORS.bg, gap: 6 },
  attachBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  attachIcon: { fontSize: 18 },
  emojiToggleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  emojiToggleIcon: { fontSize: 18 },
  input: { flex: 1, minHeight: 38, maxHeight: 100, borderRadius: 19, backgroundColor: COLORS.input, paddingHorizontal: 16, fontSize: 14, color: COLORS.text, paddingVertical: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  sendBtnActive: { backgroundColor: COLORS.primary },
  sendIcon: { color: "#fff", fontSize: 18 },
});
