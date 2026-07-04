import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, StatusBar, FlatList, Modal, TextInput, ActivityIndicator, Animated, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import client, { IMAGE_BASE } from "../api/client";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";

const { width, height } = Dimensions.get("window");

function StoryMedia({ story, onEnd }) {
  if (story.type === "video") {
    const videoUrl = `${IMAGE_BASE}${story.video}`;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; background: #000; }
  </style>
</head>
<body>
  <video id="v" playsinline webkit-playsinline autoplay controls
    src="${videoUrl}" type="video/mp4"
    style="width:100%;height:100%;object-fit:contain"></video>
  <script>
    var v = document.getElementById('v');
    v.addEventListener('ended', function() { window.ReactNativeWebView.postMessage('ended'); });
    v.addEventListener('error', function(e) { window.ReactNativeWebView.postMessage('error:' + (e.target.error?.message || 'unknown')); });
    v.load();
  </script>
</body>
</html>`;
    return (
      <WebView
        source={{ html }}
        style={{ width, height: "100%", backgroundColor: "#000" }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
        allowsFullscreenVideo={false}
        mixedContentMode="always"
        onMessage={(e) => {
          if (e.nativeEvent.data === "ended") onEnd?.();
        }}
      />
    );
  }
  if (story.type === "text" && !story.image) {
    return <View style={[s.textStoryBg, { backgroundColor: story.bg_color || COLORS.bg }]} />;
  }
  return <Image source={{ uri: `${IMAGE_BASE}${story.image}` }} style={s.image} resizeMode="contain" />;
}

function DrawingOverlay({ drawingData }) {
  if (!drawingData || !Array.isArray(drawingData) || drawingData.length === 0) return null;
  return (
    <View style={s.drawingOverlayWrap} pointerEvents="none">
      {drawingData.map((stroke, si) => {
        if (!stroke || !Array.isArray(stroke)) return null;
        return stroke.map((point, pi) => (
          <View
            key={`${si}-${pi}`}
            style={{
              position: "absolute",
              left: (point.x / 300) * width,
              top: (point.y / 420) * (width * 1.4),
              width: point.size || 4,
              height: point.size || 4,
              borderRadius: (point.size || 4) / 2,
              backgroundColor: point.color || "#fff",
              opacity: 0.9,
            }}
          />
        ));
      })}
    </View>
  );
}

function StickerOverlay({ stickers }) {
  if (!stickers || !stickers.length) return null;
  return (
    <>
      {stickers.map((sticker, i) => (
        <View
          key={i}
          style={[s.stickerItem, {
            left: (sticker.x / 100) * width,
            top: (sticker.y / 100) * (height * 0.7),
            transform: [{ scale: sticker.scale || 1 }],
          }]}
        >
          <Text style={{ fontSize: (sticker.size || 40) }}>{sticker.emoji}</Text>
        </View>
      ))}
    </>
  );
}

function ViewerListModal({ visible, storyId, onClose }) {
  const { t } = useLanguage();
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !storyId) return;
    setLoading(true);
    client.get(`/stories/${storyId}/viewers`)
      .then((res) => setViewers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, storyId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.viewerModal}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t("viewers")}</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(v) => String(v.id)}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={<Text style={s.emptyText}>{t("noViewers")}</Text>}
              renderItem={({ item }) => (
                <View style={s.viewerRow}>
                  <View style={s.viewerAvatar}>
                    <Text style={s.viewerAvatarText}>{item.username?.[0]?.toUpperCase() || "?"}</Text>
                  </View>
                  <Text style={s.viewerName}>{item.username}</Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function ForwardModal({ visible, storyId, onClose }) {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    client.get("/users").then((res) => {
      setUsers((res.data || []).slice(0, 50));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [visible]);

  const toggle = (id) => {
    setSelected((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const send = async () => {
    if (selected.size === 0) return;
    setSending(true);
    try {
      await client.post(`/stories/${storyId}/forward`, { user_ids: Array.from(selected) });
      onClose();
    } catch (_) {}
    setSending(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.viewerModal}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t("shareTo")}</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
          ) : (
            <>
              <FlatList
                data={users}
                keyExtractor={(u) => String(u.id)}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity style={s.forwardRow} onPress={() => toggle(item.id)}>
                    <View style={s.viewerAvatar}>
                      <Text style={s.viewerAvatarText}>{item.username?.[0]?.toUpperCase() || "?"}</Text>
                    </View>
                    <Text style={s.viewerName}>{item.username}</Text>
                    <View style={[s.checkbox, selected.has(item.id) && s.checkboxActive]}>
                      {selected.has(item.id) && <Text style={s.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                )}
              />
              {selected.size > 0 && (
                <TouchableOpacity style={s.forwardBtn} onPress={send} disabled={sending}>
                  {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.forwardBtnText}>{t("shareCount").replace("{count}", selected.size)}</Text>}
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function AnalyticsModal({ visible, storyId, onClose }) {
  const { t } = useLanguage();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible || !storyId) return;
    setLoading(true);
    client.get(`/stories/${storyId}/analytics`)
      .then((res) => setAnalytics(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, storyId]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.viewerModal}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>{t("storyInsights")}</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.accent} style={{ marginTop: 20 }} />
          ) : analytics ? (
            <View style={s.analyticsWrap}>
              <View style={s.analyticsRow}>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsNum}>{analytics.view_count}</Text>
                  <Text style={s.analyticsLabel}>{t("views")}</Text>
                </View>
                <View style={s.analyticsCard}>
                  <Text style={s.analyticsNum}>{analytics.reaction_count}</Text>
                  <Text style={s.analyticsLabel}>{t("reactions")}</Text>
                </View>
              </View>
              {analytics.reactions?.length > 0 && (
                <View style={s.reactionsBreakdown}>
                  <Text style={[s.analyticsLabel, { marginBottom: 8 }]}>{t("reactions")}</Text>
                  {analytics.reactions.map((r, i) => (
                    <View key={i} style={s.reactionLine}>
                      <Text style={{ fontSize: 18 }}>{r.emoji}</Text>
                      <Text style={s.reactionCount}>{r.count}</Text>
                    </View>
                  ))}
                </View>
              )}
              {analytics.recent_viewers?.length > 0 && (
                <View>
                    <Text style={[s.analyticsLabel, { marginBottom: 8, marginTop: 12 }]}>{t("recentViewers")}</Text>
                  {analytics.recent_viewers.map((v) => (
                    <View key={v.id} style={s.viewerRow}>
                      <View style={[s.viewerAvatar, { width: 28, height: 28, borderRadius: 14 }]}>
                        <Text style={[s.viewerAvatarText, { fontSize: 11 }]}>{v.username?.[0]?.toUpperCase() || "?"}</Text>
                      </View>
                      <Text style={[s.viewerName, { fontSize: 13 }]}>{v.username}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default function StoryViewerScreen({ route, navigation }) {
  const { stories, user: storyUser } = route?.params || {};
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [myReactions, setMyReactions] = useState({});
  const [reactionSent, setReactionSent] = useState({});
  const [showViewers, setShowViewers] = useState(false);
  const [showForward, setShowForward] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef(null);
  const pausedRef = useRef(false);
  const viewReported = useRef(new Set());
  const insets = useSafeAreaInsets();
  const swipeX = useRef(new Animated.Value(0)).current;
  const swipeOpacity = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const goBack = useCallback(() => {
    Animated.parallel([
      Animated.timing(swipeOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 0.9, friction: 8, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => navigation.goBack(), 0);
    });
  }, [navigation, swipeOpacity, scaleAnim]);

  const advance = useCallback(() => {
    if (index < (stories?.length || 1) - 1) {
      Animated.sequence([
        Animated.timing(swipeOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(swipeOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setIndex((i) => i + 1);
      setProgress(0);
    } else {
      goBack();
    }
  }, [index, stories, goBack, swipeOpacity]);

  const goBackStory = useCallback(() => {
    if (index > 0) {
      Animated.sequence([
        Animated.timing(swipeOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(swipeOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setIndex((i) => i - 1);
      setProgress(0);
    }
  }, [index, swipeOpacity]);

  const currentStory = stories?.[index];
  const dur = (currentStory?.duration || 5) * 1000;
  const isOwner = currentUser?.id === storyUser?.id;

  useEffect(() => {
    const interval = 100;
    const step = interval / dur;
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setProgress((p) => {
          const next = p + step;
          if (next >= 1) {
            clearInterval(timerRef.current);
            advance();
            return 0;
          }
          return next;
        });
      }
    }, interval);
    return () => clearInterval(timerRef.current);
  }, [index, advance, dur]);

  useEffect(() => {
    if (currentStory && !viewReported.current.has(currentStory.id)) {
      viewReported.current.add(currentStory.id);
      client.post(`/stories/${currentStory.id}/view`).catch(() => {});
    }
  }, [currentStory]);

  useEffect(() => {
    if (currentStory?.my_reaction) {
      setMyReactions((p) => ({ ...p, [currentStory.id]: currentStory.my_reaction }));
    }
  }, [currentStory]);

  const panResponder = useRef(
    require("react-native").PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && index === 0) return;
        swipeX.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        const threshold = width * 0.25;
        if (gestureState.dx < -threshold && index < (stories?.length || 1) - 1) {
          advance();
        } else if (gestureState.dx > threshold && index > 0) {
          goBackStory();
        } else {
          Animated.spring(swipeX, { toValue: 0, friction: 5, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handlePress = (evt) => {
    const x = evt.nativeEvent.locationX;
    if (x < width * 0.3) {
      goBackStory();
    } else {
      advance();
    }
  };

  const sendReaction = async (emoji) => {
    if (!currentStory) return;
    try {
      await client.post(`/stories/${currentStory.id}/react`, { emoji });
      setMyReactions((p) => ({ ...p, [currentStory.id]: emoji }));
      setReactionSent((p) => ({ ...p, [currentStory.id]: emoji }));
      setTimeout(() => setReactionSent((p) => { const n = { ...p }; delete n[currentStory.id]; return n; }), 2000);
    } catch (_) {}
  };

  const sendReply = async () => {
    if (!replyText.trim() || !storyUser) return;
    try {
      await client.post("/messages", { receiver_id: storyUser.id, content: replyText.trim() });
      setReplyText("");
      setShowReplyInput(false);
    } catch (_) {}
  };

  const deleteStory = () => {
    Alert.alert(t("deleteStory"), t("deleteStoryConfirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await client.delete(`/stories/${currentStory.id}`);
            if (stories.length === 1) {
              goBack();
            } else {
              const newStories = stories.filter((_, i) => i !== index);
              if (index >= newStories.length) {
                setIndex(Math.max(0, newStories.length - 1));
              }
              setProgress(0);
            }
          } catch (_) {}
          setDeleting(false);
        },
      },
    ]);
  };

  if (!stories?.length || !currentStory) return null;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: swipeOpacity, transform: [{ scale: scaleAnim }, { translateX: swipeX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handlePress}
          onLongPress={() => { pausedRef.current = true; }}
          onPressOut={() => { pausedRef.current = false; }}
          style={StyleSheet.absoluteFill}
        >
          <StoryMedia key={currentStory.id} story={currentStory} onEnd={advance} />
          <DrawingOverlay drawingData={currentStory.drawing_data} />
          <StickerOverlay stickers={currentStory.stickers} />
        </TouchableOpacity>
      </Animated.View>

      <View style={s.gradientTop} />
      <View style={s.gradientBottom} />

      {currentStory.text_overlay ? (
        <View style={[s.textOverlayWrap, currentStory.bg_color ? { backgroundColor: currentStory.bg_color } : { backgroundColor: "rgba(0,0,0,0.3)" }]}>
          <Text style={[s.textOverlay, { color: currentStory.text_color || "#fff" }]}>{currentStory.text_overlay}</Text>
        </View>
      ) : null}

      <View style={[s.header, { top: insets.top + 10 }]}>
        <View style={s.progressBar}>
          {stories.map((_, i) => (
            <View
              key={i}
              style={[s.progressSegment, { backgroundColor: i < index ? COLORS.primary : i === index ? COLORS.primary + "CC" : "rgba(255,255,255,0.3)" }]}
            >
              {i === index && <View style={[s.progressFill, { width: `${progress * 100}%` }]} />}
            </View>
          ))}
        </View>
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: COLORS.primary + "40" }]}>
            <Text style={[s.avatarText, { color: COLORS.primary }]}>{storyUser?.username?.[0]?.toUpperCase() || "?"}</Text>
          </View>
          <Text style={s.username}>{storyUser?.username}</Text>
          <Text style={s.time}>
            {new Date(currentStory.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {isOwner && (
            <>
              <TouchableOpacity style={s.insightBtn} onPress={() => setShowAnalytics(true)}>
                <Text style={s.insightText}>📊</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.insightBtn, { backgroundColor: "rgba(248,113,113,0.2)" }]} onPress={deleteStory} disabled={deleting}>
                <Text style={[s.insightText, { color: COLORS.danger }]}>{deleting ? "..." : "🗑"}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <TouchableOpacity style={[s.closeBtn, { top: insets.top + 10 }]} onPress={goBack}>
        <Text style={s.closeText}>✕</Text>
      </TouchableOpacity>

      <View style={[s.reactionBar, { bottom: Math.max(insets.bottom + 20, 40) }]}>
        {["❤️", "😂", "😮", "😢", "🔥"].map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[s.reactionBtn, myReactions[currentStory.id] === emoji && s.reactionBtnActive]}
            onPress={() => sendReaction(emoji)}
          >
            <Text style={s.reactionEmoji}>{emoji}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.replyBtn} onPress={() => setShowReplyInput(true)}>
          <Text style={s.replyBtnText}>💬</Text>
        </TouchableOpacity>
        {!isOwner && (
          <TouchableOpacity style={s.forwardBtnSmall} onPress={() => setShowForward(true)}>
            <Text style={s.forwardBtnText2}>↗</Text>
          </TouchableOpacity>
        )}
      </View>

      {reactionSent[currentStory.id] && (
        <View style={[s.sentBadge, { bottom: Math.max(insets.bottom + 70, 90) }]}>
          <Text style={s.sentText}>{t("reactedEmoji").replace("{emoji}", reactionSent[currentStory.id])}</Text>
        </View>
      )}

      {isOwner && currentStory && (
        <TouchableOpacity
          style={[s.viewersBadge, { top: insets.top + 70 }]}
          onPress={() => setShowViewers(true)}
        >
          <Text style={s.viewersText}>👁 {currentStory.view_count || 0}</Text>
        </TouchableOpacity>
      )}

      {showReplyInput && (
        <View style={[s.replyInputBar, { bottom: Math.max(insets.bottom + 20, 40) }]}>
          <TextInput
            style={s.replyInput}
            value={replyText}
            onChangeText={setReplyText}
            placeholder={t("replyToStory")}
            placeholderTextColor={COLORS.muted}
            autoFocus
          />
          <TouchableOpacity style={s.sendBtn} onPress={sendReply}>
            <Text style={s.sendText}>{t("send")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ViewerListModal visible={showViewers} storyId={currentStory?.id} onClose={() => setShowViewers(false)} />
      <ForwardModal visible={showForward} storyId={currentStory?.id} onClose={() => setShowForward(false)} />
      <AnalyticsModal visible={showAnalytics} storyId={currentStory?.id} onClose={() => setShowAnalytics(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  textStoryBg: { flex: 1 },
  image: { width, height: "100%", position: "absolute" },
  drawingOverlayWrap: { ...StyleSheet.absoluteFillObject, zIndex: 3 },
  stickerItem: { position: "absolute", zIndex: 6 },
  textOverlayWrap: { position: "absolute", left: 20, right: 20, top: "40%", paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, alignItems: "center", zIndex: 5 },
  textOverlay: { fontSize: 28, ...FONTS.bold, textAlign: "center", lineHeight: 36 },
  gradientTop: { position: "absolute", top: 0, left: 0, right: 0, height: 120, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 8 },
  gradientBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 160, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 8 },
  header: { position: "absolute", left: 0, right: 0, paddingHorizontal: 12, zIndex: 10 },
  progressBar: { flexDirection: "row", gap: 4, marginBottom: 12 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden", position: "relative" },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#fff" },
  userRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  avatarText: { ...FONTS.semiBold, fontSize: 13 },
  username: { color: "#fff", ...FONTS.semiBold, fontSize: 14 },
  time: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginLeft: "auto" },
  insightBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginLeft: 6 },
  insightText: { fontSize: 14 },
  closeBtn: { position: "absolute", right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#fff", fontSize: 22 },
  reactionBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingHorizontal: 12, zIndex: 10 },
  reactionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  reactionBtnActive: { backgroundColor: COLORS.primary + "80", borderWidth: 2, borderColor: COLORS.primary },
  reactionEmoji: { fontSize: 22 },
  replyBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  replyBtnText: { fontSize: 20 },
  forwardBtnSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  forwardBtnText2: { fontSize: 20, color: "#fff", ...FONTS.bold },
  sentBadge: { position: "absolute", alignSelf: "center", zIndex: 10 },
  sentText: { color: COLORS.accent, fontSize: 13, ...FONTS.semiBold, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  viewersBadge: { position: "absolute", right: 16, zIndex: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)" },
  viewersText: { color: "#fff", fontSize: 12, ...FONTS.semiBold },
  replyInputBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, zIndex: 10 },
  replyInput: { flex: 1, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 16, color: "#fff", fontSize: 14 },
  sendBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.primary },
  sendText: { color: "#fff", ...FONTS.semiBold, fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  viewerModal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingTop: 8, paddingBottom: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.muted, alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text, textAlign: "center", marginBottom: 12 },
  emptyText: { textAlign: "center", color: COLORS.muted, padding: 30 },
  viewerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  viewerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  viewerAvatarText: { color: COLORS.text, ...FONTS.semiBold, fontSize: 13 },
  viewerName: { flex: 1, color: COLORS.text, ...FONTS.medium, fontSize: 14 },
  forwardRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.muted, alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: "#fff", fontSize: 14, ...FONTS.bold },
  forwardBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: "center", marginHorizontal: 16, marginTop: 8 },
  forwardBtnText: { color: "#fff", ...FONTS.bold, fontSize: 15 },
  analyticsWrap: { paddingHorizontal: 16 },
  analyticsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  analyticsCard: { flex: 1, backgroundColor: COLORS.input, borderRadius: SIZES.radius, padding: 16, alignItems: "center" },
  analyticsNum: { fontSize: 28, ...FONTS.bold, color: COLORS.accent },
  analyticsLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  reactionsBreakdown: { backgroundColor: COLORS.input, borderRadius: SIZES.radius, padding: 12, marginBottom: 8 },
  reactionLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  reactionCount: { color: COLORS.text, ...FONTS.medium, fontSize: 14 },
});
