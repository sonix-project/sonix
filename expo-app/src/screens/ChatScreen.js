import { useState, useEffect, useLayoutEffect, useCallback, useRef, memo } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert, ActivityIndicator, Dimensions, Animated, Keyboard, Modal, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import client, { resolveUrl } from "../api/client";
import { getEcho } from "../api/websocket";
import { cacheMessages, getCachedMessages, addToOfflineQueue, getOfflineQueue, removeFromOfflineQueue } from "../api/cache";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const { width: SCREEN_W } = Dimensions.get("window");
const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "🔥", "👍", "👎", "😡"];
const VANISH_OPTIONS = [
  { label: "5s", seconds: 5 },
  { label: "10s", seconds: 10 },
  { label: "30s", seconds: 30 },
  { label: "1m", seconds: 60 },
  { label: "5m", seconds: 300 },
  { label: "1h", seconds: 3600 },
];

const MessageBubble = memo(({ item, isMine, onLongPress, onDoubleTap }) => {
  const { t } = useLanguage();
  const [showReactions, setShowReactions] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef(null);
  const lastTap = useRef(0);
  const doubleTapTimer = useRef(null);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      clearTimeout(doubleTapTimer.current);
      onDoubleTap?.(item);
    } else {
      doubleTapTimer.current = setTimeout(() => {
        setShowReactions((s) => !s);
      }, 300);
    }
    lastTap.current = now;
  };

  const handleLongPress = () => {
    if (item.pending) return;
    setShowReactions(true);
  };

  const handleReaction = async (emoji) => {
    setShowReactions(false);
    try { await client.post(`/messages/${item.id}/react`, { emoji }); } catch (_) {}
  };

  const toggleVoice = async () => {
    try {
      if (playing && soundRef.current) {
        await soundRef.current.stopAsync();
        setPlaying(false);
        return;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: resolveUrl(item.voice) },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlaying(true);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis);
          setDuration(status.durationMillis || 0);
          if (status.didJustFinish) {
            setPlaying(false);
            sound.unloadAsync();
          }
        }
      });
    } catch (e) {
      console.warn("Voice play error", e);
    }
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const replyName = item.reply_message?.sender?.username;
  const replyContent = item.reply_message?.content;
  const isImage = item.type === "image" && item.image;
  const isVoice = item.type === "voice" && item.voice;
  const isVideo = item.type === "video" && item.video;

  return (
    <View style={[s.bubbleWrap, isMine ? s.bubbleWrapMine : s.bubbleWrapTheirs, item.pending && s.bubblePending]}>
      {item.reply_message && (
        <View style={[s.replyPreview, isMine ? s.replyPreviewMine : s.replyPreviewTheirs]}>
          <Text style={s.replyName}>{replyName || t("message")}</Text>
          <Text style={s.replyText} numberOfLines={1}>{replyContent || "..."}</Text>
        </View>
      )}

      {isImage ? (
        <TouchableOpacity onLongPress={handleLongPress} onPress={handleTap} activeOpacity={0.8}>
          <Image source={{ uri: resolveUrl(item.image) }} style={s.messageImage} resizeMode="cover" />
        </TouchableOpacity>
      ) : isVoice ? (
        <TouchableOpacity onLongPress={handleLongPress} onPress={toggleVoice} activeOpacity={0.8} style={[s.bubble, isMine ? s.mine : s.theirs, s.voiceBubble]}>
          <View style={s.voiceRow}>
            <TouchableOpacity onPress={toggleVoice} style={s.playBtn}>
              <Text style={s.playIcon}>{playing ? "⏸" : "▶"}</Text>
            </TouchableOpacity>
            <View style={s.voiceTrack}>
              <View style={[s.voiceProgress, { width: duration > 0 ? `${(position / duration) * 100}%` : "0%" }]} />
            </View>
          </View>
          <Text style={[s.voiceDuration, isMine && { color: "#ffffffaa" }]}>{formatMs(playing ? position : duration)}</Text>
        </TouchableOpacity>
      ) : isVideo ? (
        <TouchableOpacity onLongPress={handleLongPress} onPress={handleTap} activeOpacity={0.8} style={[s.bubble, isMine ? s.mine : s.theirs, { padding: 0, overflow: "hidden" }]}>
          <View style={s.videoWrap}>
            <Image source={{ uri: resolveUrl(item.video) }} style={s.videoThumb} resizeMode="cover" />
            <View style={s.playOverlay}>
              <Text style={s.playOverlayIcon}>▶</Text>
            </View>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onLongPress={handleLongPress} onPress={handleTap} activeOpacity={0.8} style={[s.bubble, isMine ? s.mine : s.theirs, item.pending && s.bubblePendingBg]}>
          <Text style={[s.bubbleText, isMine && s.bubbleTextMine, item.pending && s.bubbleTextPending]}>{item.content}</Text>
        </TouchableOpacity>
      )}

      <View style={[s.bubbleMeta, isMine && s.bubbleMetaMine]}>
        {item.is_edited && <Text style={[s.editedLabel, isMine && { color: "#ffffff88" }]}>{t("edited")}</Text>}
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

function formatMs(ms) {
  if (!ms || ms === 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

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
    const animate = () => Animated.sequence([
      Animated.parallel([Animated.timing(dot1, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }), Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true })]),
      Animated.parallel([Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }), Animated.timing(dot2, { toValue: 1, duration: 400, useNativeDriver: true }), Animated.timing(dot3, { toValue: 0.3, duration: 400, useNativeDriver: true })]),
      Animated.parallel([Animated.timing(dot1, { toValue: 0.3, duration: 400, useNativeDriver: true }), Animated.timing(dot2, { toValue: 0.3, duration: 400, useNativeDriver: true }), Animated.timing(dot3, { toValue: 1, duration: 400, useNativeDriver: true })]),
    ]);
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
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [vanishMode, setVanishMode] = useState(false);
  const [showVanishPicker, setShowVanishPicker] = useState(false);
  const [vanishSeconds, setVanishSeconds] = useState(30);
  const [showForward, setShowForward] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showInfo, setShowInfo] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [recordCancel, setRecordCancel] = useState(false);
  const [reactAnim, setReactAnim] = useState(null);

  const flatListRef = useRef(null);
  const typingTimerRef = useRef(null);
  const recordTimerRef = useRef(null);
  const recordingRef = useRef(null);

  const load = useCallback(async (cursor = null) => {
    try {
      const url = cursor ? `/messages/${userId}?cursor=${cursor}&limit=50` : `/messages/${userId}?limit=50`;
      const res = await client.get(url);
      const newMessages = res.data?.data || [];
      const nextCursor = res.data?.next_cursor;
      const more = res.data?.has_more || false;
      if (cursor) setMessages((prev) => [...newMessages, ...prev]);
      else { setMessages(newMessages); await cacheMessages(userId, newMessages); }
      setHasMore(more);
    } catch (e) {
      if (!cursor) { const cached = await getCachedMessages(userId); if (cached.length > 0) setMessages(cached); }
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
      try {
        const echo = await getEcho();
        if (!echo) return;
        echoChannel = echo.private(`messages.${user?.id}`);
        echoChannel.listen(".message.sent", (event) => {
          if (event.sender_id === parseInt(userId) || event.receiver_id === parseInt(userId)) {
            setMessages((prev) => {
              if (prev.find((m) => m.id === event.id)) return prev;
              return [...prev, {
                id: event.id, content: event.content, type: event.type, image: event.image,
                voice: event.voice, video: event.video, sender_id: event.sender_id,
                receiver_id: event.receiver_id, created_at: event.created_at,
                is_read: event.is_read, reply_to: event.reply_to, sender: event.sender,
                reply_message: null, reactions: [],
              }];
            });
          }
        });
        typingChannel = echo.private(`typing.${user?.id}`);
        typingChannel.listen(".typing.indicator", (event) => {
          if (event.sender_id === parseInt(userId)) setRemoteTyping(event.typing);
        });
        client.post("/messages/online").catch(() => {});
      } catch (_) {}
    };
    setupWebSocket();
    const checkOnline = setInterval(async () => {
      try { const r = await client.get(`/users/${userId}/status`); setIsOnline(r.data?.is_online || false); } catch (_) {}
    }, 10000);
    return () => { if (echoChannel) echoChannel.leave(); if (typingChannel) typingChannel.leave(); clearInterval(checkOnline); };
  }, [user?.id, userId]);

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => showSub.remove();
  }, []);

  useEffect(() => { client.post(`/messages/read/${userId}`).catch(() => {}); }, [messages, userId]);

  const send = async () => {
    if (editingMsg) {
      try {
        await client.put(`/messages/${editingMsg.id}`, { content: text.trim() });
        setMessages((prev) => prev.map((m) => m.id === editingMsg.id ? { ...m, content: text.trim(), is_edited: true } : m));
        setText("");
        setEditingMsg(null);
      } catch (e) { console.warn("Edit error"); }
      return;
    }
    if (!text.trim() && !replyTo) return;
    const msg = text.trim();
    setText("");
    setSending(true);
    setReplyTo(null);
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage = {
      id: tempId, content: msg, type: "text", sender_id: user?.id,
      receiver_id: parseInt(userId), created_at: new Date().toISOString(),
      is_read: false, reply_to: replyTo?.id,
      sender: { id: user?.id, username: user?.username, avatar: user?.avatar },
      reply_message: replyTo, reactions: [], pending: true,
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const payload = { receiver_id: userId, content: msg };
      if (replyTo) payload.reply_to = replyTo.id;
      if (vanishMode) payload.vanish = true;
      const res = await client.post("/messages", payload);
      if (vanishMode && res.data?.id) {
        client.post(`/messages/${res.data.id}/vanish`, { seconds: vanishSeconds }).catch(() => {});
      }
      setMessages((prev) => prev.map((m) => m.id === tempId ? { ...res.data, pending: false } : m));
      await removeFromOfflineQueue(tempId);
    } catch (e) {
      await addToOfflineQueue({ temp_id: tempId, ...optimisticMessage });
    }
    setSending(false);
  };

  const sendMedia = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === "video" ? ["videos"] : ["images"],
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]) {
        setSending(true);
        try {
          const formData = new FormData();
          formData.append("receiver_id", String(userId));
          const uri = result.assets[0].uri;
          const filename = uri.split("/").pop() || (type === "video" ? "video.mp4" : "photo.jpg");
          const ext = filename.split(".").pop().toLowerCase();
          const mimeMap = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
          const mimeType = mimeMap[ext] || (type === "video" ? "video/mp4" : "image/jpeg");
          formData.append(type === "video" ? "video" : "image", { uri, name: filename, type: mimeType });
          await client.post("/messages", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
          await load();
        } catch (e) {
          Alert.alert(t("error"), t(type === "video" ? "failedToSendVideo" : "failedToSendImage"));
        }
        setSending(false);
      }
    } catch (e) { Alert.alert(t("error"), t("failedToSendImage")); }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert(t("error"), t("failedToRecord")); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordTime(0);
      setRecordCancel(false);
      recordTimerRef.current = setInterval(() => setRecordTime((p) => p + 1), 1000);
    } catch (e) { console.warn("Record error", e); }
  };

  const stopRecording = async (cancel = false) => {
    if (!recordingRef.current) return;
    clearInterval(recordTimerRef.current);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      if (!cancel && recordTime > 0) {
        const uri = recordingRef.current.getURI();
        const formData = new FormData();
        formData.append("receiver_id", String(userId));
        formData.append("duration", String(recordTime));
        const filename = `voice_${Date.now()}.m4a`;
        formData.append("voice", { uri, name: filename, type: "audio/m4a" });
        setSending(true);
        await client.post("/messages", formData, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
        await load();
        setSending(false);
      }
    } catch (e) { console.warn("Stop recording error", e); }
    recordingRef.current = null;
    setIsRecording(false);
    setRecordTime(0);
  };

  const cancelRecording = () => {
    setRecordCancel(true);
    stopRecording(true);
  };

  const handleForward = async (targetId) => {
    if (!forwardMsg) return;
    try {
      await client.post(`/messages/${forwardMsg.id}/forward`, { receiver_id: targetId });
      setShowForward(false);
      setForwardMsg(null);
      Alert.alert(t("success"), t("forward"));
    } catch (e) { console.warn("Forward error"); }
  };

  const loadConversations = async () => {
    try {
      const res = await client.get("/messages/conversations");
      setConversations((res.data || []).filter((c) => c.user.id !== user?.id));
    } catch (e) {}
  };

  const handleDoubleTap = async (item) => {
    if (item.pending) return;
    setReactAnim({ id: item.id, emoji: "❤️" });
    try { await client.post(`/messages/${item.id}/react`, { emoji: "❤️" }); } catch (_) {}
    setTimeout(() => setReactAnim(null), 1000);
  };

  const deleteMessage = (id) => {
    Alert.alert(t("deleteMessage"), t("deleteMessageConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => { try { await client.delete(`/messages/${id}`); load(); } catch (e) {} } },
    ]);
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

  const cancelEdit = () => { setEditingMsg(null); setText(""); };

  const groupedMessages = [];
  let lastDate = null;
  messages.forEach((m) => {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) { groupedMessages.push({ type: "date", date: m.created_at, key: `date_${d}` }); lastDate = d; }
    groupedMessages.push({ ...m, key: String(m.id) });
  });

  const hasText = text.trim().length > 0;

  return (
    <View style={s.outerContainer}>
      <Screen3D>
        <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : "padding"} keyboardVerticalOffset={0}>
          {/* Header */}
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
                <View style={s.statusRow}>
                  <View style={[s.statusDot, { backgroundColor: isOnline ? "#34C759" : COLORS.muted }]} />
                  <Text style={[s.statusText, { color: isOnline ? COLORS.success : COLORS.muted }]}>
                    {isOnline ? t("online") : t("offline")}
                  </Text>
                  {vanishMode && <Text style={s.vanishBadge}>🔥</Text>}
                </View>
              </View>
            </View>
            <TouchableOpacity style={s.moreBtn} onPress={() => setShowMenu(!showMenu)}>
              <Text style={s.moreIcon}>⋮</Text>
            </TouchableOpacity>
          </View>

          {/* Dropdown Menu */}
          {showMenu && (
            <View style={s.dropdownMenu}>
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); setShowVanishPicker(true); }}>
                <Text style={s.menuIcon}>🔥</Text>
                <Text style={s.menuText}>{t("vanishMode")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); client.post(`/messages/mute/${userId}`).then(() => Alert.alert(t("success"))); }}>
                <Text style={s.menuIcon}>🔕</Text>
                <Text style={s.menuText}>{t("mute")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.menuItem} onPress={() => { setShowMenu(false); client.post(`/messages/pin/${userId}`).then(() => Alert.alert(t("success"))); }}>
                <Text style={s.menuIcon}>📌</Text>
                <Text style={s.menuText}>{t("pin")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Edit Bar */}
          {editingMsg && (
            <View style={s.editBar}>
              <View style={s.editBarContent}>
                <Text style={s.editBarLabel}>✏️ {t("editMessage")}</Text>
                <Text style={s.editBarText} numberOfLines={1}>{editingMsg.content}</Text>
              </View>
              <TouchableOpacity onPress={cancelEdit} style={s.editBarClose}>
                <Text style={s.editBarCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Reply Bar */}
          {replyTo && !editingMsg && (
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

          {/* Vanish Timer Bar */}
          {vanishMode && (
            <View style={s.vanishBar}>
              <Text style={s.vanishBarText}>🔥 {t("vanishTimer")}: {vanishSeconds}s</Text>
            </View>
          )}

          {/* Messages */}
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
                <View>
                  <MessageBubble
                    item={item}
                    isMine={mine}
                    onDoubleTap={handleDoubleTap}
                    onLongPress={() => {
                      const opts = [
                        { text: t("reply"), onPress: () => setReplyTo(item) },
                        { text: t("forward"), onPress: () => { setForwardMsg(item); setShowForward(true); loadConversations(); } },
                      ];
                      if (mine) opts.push({ text: t("edit"), onPress: () => { setEditingMsg(item); setText(item.content); } });
                      opts.push({ text: t("messageInfo"), onPress: () => setShowInfo(item) });
                      if (mine) opts.push({ text: t("delete"), style: "destructive", onPress: () => deleteMessage(item.id) });
                      opts.push({ text: t("cancel"), style: "cancel" });
                      Alert.alert(null, null, opts);
                    }}
                  />
                  {reactAnim?.id === item.id && (
                    <View style={[s.reactAnimWrap, mine ? { right: 20 } : { left: 20 }]}>
                      <Text style={s.reactAnimText}>{reactAnim.emoji}</Text>
                    </View>
                  )}
                </View>
              );
            }}
          />

          {remoteTyping && <TypingIndicator username={username} />}

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <View style={[s.emojiPicker, { bottom: Math.max(insets.bottom + 50, 60) }]}>
              {EMOJI_LIST.map((emoji) => (
                <TouchableOpacity key={emoji} style={s.emojiBtn} onPress={() => { setText((p) => p + emoji); setShowEmojiPicker(false); }}>
                  <Text style={s.emojiBtnText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Recording UI */}
          {isRecording && (
            <View style={[s.recordingBar, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
              <TouchableOpacity onPress={cancelRecording} style={s.recCancel}>
                <Text style={s.recCancelText}>✕</Text>
              </TouchableOpacity>
              <View style={s.recCenter}>
                <View style={s.recDot} />
                <Text style={s.recTimer}>{formatMs(recordTime * 1000)}</Text>
              </View>
              <TouchableOpacity onPress={() => stopRecording(false)} style={s.recSend}>
                <Text style={s.recSendIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input Row */}
          {!isRecording && (
            <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom + 6, 12) }]}>
              <TouchableOpacity style={s.attachBtn} onPress={() => sendMedia("image")}>
                <Text style={s.attachIcon}>🖼️</Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.emojiToggleBtn} onPress={() => setShowEmojiPicker((s) => !s)}>
                <Text style={s.emojiToggleIcon}>😊</Text>
              </TouchableOpacity>

              <TextInput
                style={s.input}
                value={text}
                onChangeText={handleTextChange}
                placeholder={editingMsg ? t("editMessage") : t("message") + "..."}
                placeholderTextColor={COLORS.muted}
                returnKeyType="send"
                onSubmitEditing={send}
                multiline
                maxLength={5000}
              />

              {(hasText || editingMsg) ? (
                <TouchableOpacity
                  style={[s.sendBtn, s.sendBtnActive]}
                  onPress={send}
                  disabled={sending}
                >
                  {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendIcon}>➤</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={s.micBtn}
                  onPressIn={startRecording}
                >
                  <Text style={s.micIcon}>🎤</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Vanish Timer Picker Modal */}
          <Modal visible={showVanishPicker} transparent animationType="fade" onRequestClose={() => setShowVanishPicker(false)}>
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowVanishPicker(false)}>
              <View style={s.vanishModal}>
                <Text style={s.vanishModalTitle}>{t("vanishTimer")}</Text>
                {VANISH_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.seconds}
                    style={[s.vanishOption, vanishSeconds === opt.seconds && s.vanishOptionActive]}
                    onPress={() => { setVanishSeconds(opt.seconds); setVanishMode(true); setShowVanishPicker(false); }}
                  >
                    <Text style={[s.vanishOptionText, vanishSeconds === opt.seconds && { color: "#fff" }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
                {vanishMode && (
                  <TouchableOpacity style={s.vanishOffBtn} onPress={() => { setVanishMode(false); setShowVanishPicker(false); }}>
                    <Text style={s.vanishOffText}>{t("cancel")}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Forward Modal */}
          <Modal visible={showForward} transparent animationType="slide" onRequestClose={() => setShowForward(false)}>
            <View style={s.modalOverlay}>
              <View style={s.forwardModal}>
                <Text style={s.forwardTitle}>{t("forwardMessage")}</Text>
                <FlatList
                  data={conversations}
                  keyExtractor={(c) => String(c.user.id)}
                  renderItem={({ item: c }) => (
                    <TouchableOpacity style={s.forwardRow} onPress={() => handleForward(c.user.id)}>
                      <View style={s.forwardAvatar}>
                        <Text style={s.forwardAvatarText}>{c.user.username?.[0]?.toUpperCase()}</Text>
                      </View>
                      <Text style={s.forwardName}>{c.user.username}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />}
                />
                <TouchableOpacity style={s.forwardCancel} onPress={() => setShowForward(false)}>
                  <Text style={s.forwardCancelText}>{t("cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Info Modal */}
          <Modal visible={!!showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(null)}>
            <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowInfo(null)}>
              <View style={s.infoModal}>
                <Text style={s.infoTitle}>{t("messageInfo")}</Text>
                {showInfo && (
                  <>
                    <View style={s.infoRow}>
                      <Text style={s.infoLabel}>{t("sentAt")}</Text>
                      <Text style={s.infoValue}>{new Date(showInfo.created_at).toLocaleString()}</Text>
                    </View>
                    {showInfo.sender_id === user?.id && (
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>{showInfo.read_at ? t("readAt") : t("deliveredAt")}</Text>
                        <Text style={s.infoValue}>{showInfo.read_at ? new Date(showInfo.read_at).toLocaleString() : t("notDelivered")}</Text>
                      </View>
                    )}
                    {showInfo.is_edited && (
                      <View style={s.infoRow}>
                        <Text style={s.infoLabel}>{t("edit")}</Text>
                        <Text style={s.infoValue}>{t("edited")}</Text>
                      </View>
                    )}
                  </>
                )}
                <TouchableOpacity style={s.infoClose} onPress={() => setShowInfo(null)}>
                  <Text style={s.infoCloseText}>{t("done")}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

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
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
  name: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12 },
  vanishBadge: { fontSize: 11 },
  moreBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  moreIcon: { fontSize: 22, color: COLORS.text },

  dropdownMenu: { position: "absolute", top: 70, right: 12, backgroundColor: COLORS.card, borderRadius: 12, padding: 4, zIndex: 100, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10, minWidth: 160 },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  menuIcon: { fontSize: 16 },
  menuText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },

  editBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary + "15", paddingHorizontal: 16, paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  editBarContent: { flex: 1 },
  editBarLabel: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  editBarText: { fontSize: 13, color: COLORS.muted },
  editBarClose: { padding: 4 },
  editBarCloseText: { fontSize: 16, color: COLORS.muted },

  replyBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.primary + "15", paddingHorizontal: 16, paddingVertical: 8, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  replyBarText: { fontSize: 13, color: COLORS.muted },
  replyBarClose: { fontSize: 16, color: COLORS.muted, padding: 4 },

  vanishBar: { backgroundColor: "#FF6B3520", paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#FF6B3540" },
  vanishBarText: { fontSize: 12, color: "#FF6B35", fontWeight: "600", textAlign: "center" },

  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: SIZES.sm, color: COLORS.muted, textAlign: "center" },

  dateSep: { flexDirection: "row", alignItems: "center", marginVertical: 12, gap: 8 },
  dateSepLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dateSepText: { fontSize: 11, color: COLORS.muted, fontWeight: "600" },

  bubbleWrap: { marginBottom: 8, maxWidth: "82%" },
  bubbleWrapMine: { alignSelf: "flex-end" },
  bubbleWrapTheirs: { alignSelf: "flex-start" },
  bubblePending: { opacity: 0.7 },

  replyPreview: { backgroundColor: COLORS.primary + "26", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: COLORS.primary },
  replyPreviewMine: { borderLeftColor: COLORS.accent },
  replyPreviewTheirs: { borderLeftColor: COLORS.primary },
  replyName: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  replyText: { fontSize: 12, color: COLORS.muted },

  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  mine: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  theirs: { backgroundColor: COLORS.card, borderBottomLeftRadius: 4 },
  bubblePendingBg: { backgroundColor: COLORS.primary + "99" },
  bubbleText: { fontSize: 14, lineHeight: 21, color: COLORS.text },
  bubbleTextMine: { color: "#fff" },
  bubbleTextPending: { fontStyle: "italic" },

  messageImage: { width: SCREEN_W * 0.6, height: SCREEN_W * 0.5, borderRadius: 16 },

  videoWrap: { width: SCREEN_W * 0.55, height: SCREEN_W * 0.4, position: "relative" },
  videoThumb: { width: "100%", height: "100%", borderRadius: 16 },
  playOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 16 },
  playOverlayIcon: { fontSize: 40, color: "#fff" },

  voiceBubble: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 180 },
  voiceRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  playIcon: { fontSize: 14, color: "#fff" },
  voiceTrack: { flex: 1, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.3)" },
  voiceProgress: { height: 3, borderRadius: 2, backgroundColor: "#fff" },
  voiceDuration: { fontSize: 11, color: "rgba(255,255,255,0.7)", minWidth: 35 },

  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 4 },
  bubbleMetaMine: { justifyContent: "flex-end", paddingRight: 4 },
  editedLabel: { fontSize: 10, color: COLORS.muted, fontStyle: "italic" },
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

  reactAnimWrap: { position: "absolute", bottom: -10, zIndex: 20 },
  reactAnimText: { fontSize: 28 },

  typingWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 6, gap: 6 },
  typingText: { fontSize: 12, color: COLORS.primary, fontStyle: "italic" },
  typingDots: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  emojiPicker: { position: "absolute", left: 12, right: 12, flexDirection: "row", backgroundColor: COLORS.card, borderRadius: 24, padding: 8, justifyContent: "center", gap: 4, zIndex: 20, borderWidth: 1, borderColor: COLORS.border },
  emojiBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emojiBtnText: { fontSize: 22 },

  recordingBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, backgroundColor: COLORS.bg, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  recCancel: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.danger + "20", alignItems: "center", justifyContent: "center" },
  recCancelText: { fontSize: 18, color: COLORS.danger, fontWeight: "700" },
  recCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF3B30" },
  recTimer: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  recSend: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  recSendIcon: { color: "#fff", fontSize: 18 },

  inputRow: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border, backgroundColor: COLORS.bg, gap: 6 },
  attachBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  attachIcon: { fontSize: 18 },
  emojiToggleBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  emojiToggleIcon: { fontSize: 18 },
  input: { flex: 1, minHeight: 38, maxHeight: 100, borderRadius: 19, backgroundColor: COLORS.input, paddingHorizontal: 16, fontSize: 14, color: COLORS.text, paddingVertical: 8 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  sendBtnActive: { backgroundColor: COLORS.primary },
  sendIcon: { color: "#fff", fontSize: 18 },
  micBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  micIcon: { fontSize: 18 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  vanishModal: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, width: "80%", alignItems: "center" },
  vanishModalTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 16 },
  vanishOption: { width: "100%", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginBottom: 4, backgroundColor: COLORS.input },
  vanishOptionActive: { backgroundColor: "#FF6B35" },
  vanishOptionText: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  vanishOffBtn: { marginTop: 12, paddingVertical: 10 },
  vanishOffText: { fontSize: 14, color: COLORS.danger, fontWeight: "600" },

  forwardModal: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, width: "85%", maxHeight: "60%" },
  forwardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 16, textAlign: "center" },
  forwardRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  forwardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + "30", alignItems: "center", justifyContent: "center" },
  forwardAvatarText: { color: COLORS.primary, fontWeight: "700", fontSize: 16 },
  forwardName: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  forwardCancel: { marginTop: 12, paddingVertical: 10, alignItems: "center" },
  forwardCancelText: { fontSize: 14, color: COLORS.muted, fontWeight: "600" },

  infoModal: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, width: "80%" },
  infoTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 16, textAlign: "center" },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 13, color: COLORS.muted },
  infoValue: { fontSize: 13, color: COLORS.text, fontWeight: "500", flex: 1, textAlign: "right" },
  infoClose: { marginTop: 16, paddingVertical: 10, alignItems: "center", backgroundColor: COLORS.primary, borderRadius: 10 },
  infoCloseText: { fontSize: 14, color: "#fff", fontWeight: "700" },
});
