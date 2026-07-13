import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl, StyleSheet, Dimensions, Pressable, Alert, Animated, I18nManager } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import client, { resolveUrl } from "../api/client";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const { width: SCREEN_W } = Dimensions.get("window");

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
  return d.toLocaleDateString(I18nManager.isRTL ? "ar" : "en-US", { month: "short", day: "numeric" });
}

function renderContent(text, nav) {
  if (!text) return null;
  const parts = text.split(/([#@][\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#")) {
      const tag = part.slice(1);
      return (
        <Text key={i} style={s.hashtag} onPress={() => nav?.("HashtagPosts", { tag })}>
          {part}
        </Text>
      );
    }
    if (part.startsWith("@")) {
      const username = part.slice(1);
      return (
        <Text key={i} style={s.mention} onPress={() => nav?.("UserProfile", { username })}>
          {part}
        </Text>
      );
    }
    return <Text key={i}>{part}</Text>;
  });
}

const HeartAnimation = memo(({ show }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (show) {
      scale.setValue(0);
      opacity.setValue(1);
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        Animated.delay(400),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [show]);

  if (!show) return null;
  return (
    <Animated.View style={[s.heartOverlay, { transform: [{ scale }], opacity }]}>
      <Text style={s.heartBig}>❤️</Text>
    </Animated.View>
  );
});

const PostCard = memo(({ post, currentUser, onLike, onBookmark, onComment, onShare, onImagePress, onVideoPress, onMenuPress, onUserPress, onLikesPress, onHashtagPress }) => {
  const { t } = useLanguage();
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);
  const tapTimer = useRef(null);
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(cardAnim, { toValue: 1, tension: 40, friction: 9, useNativeDriver: true }).start(); }, []);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      clearTimeout(tapTimer.current);
      if (post.liked === 0) {
        onLike(post.id, false, post.likes_count);
      }
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800);
    } else {
      tapTimer.current = setTimeout(() => {
        if (post.image) onImagePress(post);
        else if (post.type === "video" && post.video) onVideoPress(post);
      }, 300);
    }
    lastTap.current = now;
  };

  const cardStyle = {
    opacity: cardAnim,
    transform: [
      { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
      { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      { perspective: 800 },
      { rotateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: ["5deg", "0deg"] }) },
    ],
  };

  return (
    <Animated.View style={[s.card, cardStyle]}>
      <View style={s.cardHeader}>
        <TouchableOpacity style={s.cardHeaderLeft} onPress={() => onUserPress(post.user?.id)} activeOpacity={0.7}>
          {post.user?.avatar ? (
            <Image source={{ uri: `${resolveUrl(post.user.avatar)}${post.user?.id === currentUser?.id ? "?t=" + Date.now() : ""}` }} style={[s.cardAvatar, { backgroundColor: COLORS.primary + "30" }]} />
          ) : (
            <View style={[s.cardAvatar, { backgroundColor: COLORS.primary + "30" }]}>
              <Text style={[s.cardAvatarText, { color: COLORS.primary }]}>{post.user?.username?.[0]?.toUpperCase() || "?"}</Text>
            </View>
          )}
          <View>
            <Text style={s.cardUsername}>{post.user?.username}</Text>
            <Text style={s.cardTime}>{formatTime(post.created_at, t)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onMenuPress(post)} style={s.menuBtn}>
          <Text style={s.menuDots}>•••</Text>
        </TouchableOpacity>
      </View>

      {(post.type === "video" && post.video) || post.image ? (
        <Pressable onPress={handleTap} style={s.imagePressable}>
          {post.type === "video" && post.video ? (
            <>
              <Image source={{ uri: resolveUrl(post.image || "") }} style={s.postImg} resizeMode="cover" />
              {!post.image && <View style={s.videoPlaceholder}><Text style={s.videoPlaceholderIcon}>🎬</Text></View>}
              <TouchableOpacity style={s.playOverlayIcon} onPress={() => onVideoPress(post)} activeOpacity={0.8}>
                <View style={s.playCircle}><Text style={s.playTriangle}>▶</Text></View>
              </TouchableOpacity>
            </>
          ) : post.image ? (
            <Image source={{ uri: resolveUrl(post.image) }} style={s.postImg} resizeMode="cover" />
          ) : null}
          <HeartAnimation show={showHeart} />
        </Pressable>
      ) : null}

      {post.content ? (
        <View style={[s.contentWrap, !post.image && !(post.type === "video" && post.video) && s.textContentNoImage]}>
          <Text style={[s.contentText, !post.image && !(post.type === "video" && post.video) && s.textContentLarge]}>
            <Text style={s.contentUser}>{post.user?.username} </Text>
            {renderContent(post.content, onHashtagPress)}
          </Text>
        </View>
      ) : null}

      <View style={s.actionsBar}>
        <View style={s.actionsLeft}>
          <Pressable onPress={() => onLike(post.id, post.liked > 0, post.likes_count)} style={s.actionBtn}>
            <Text style={[s.actionIcon, post.liked > 0 && s.likedIcon]}>
              {post.liked > 0 ? "❤️" : "🤍"}
            </Text>
          </Pressable>
          <TouchableOpacity onPress={() => onComment(post.id)} style={s.actionBtn}>
            <Text style={s.actionIcon}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShare(post.id)} style={s.actionBtn}>
            <Text style={s.actionIcon}>📤</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onBookmark(post.id)} style={s.actionBtn}>
          <Text style={[s.actionIcon, post.bookmarked && s.bookmarkedIcon]}>
            {post.bookmarked ? "🔖" : "🏷️"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => onLikesPress(post.id)}>
        <Text style={s.likesText}>{t("likes").replace("{count}", post.likes_count || 0)}</Text>
      </TouchableOpacity>

      {post.comments && post.comments.length > 0 && (
        <View style={s.commentsPreview}>
          {post.comments.slice(0, 2).map((comment) => (
            <TouchableOpacity key={comment.id} onPress={() => onComment(post.id)} style={s.commentRow}>
              <Text style={s.commentUser}>{comment.user?.username}</Text>
              <Text style={s.commentText} numberOfLines={1}>{comment.content}</Text>
            </TouchableOpacity>
          ))}
          {post.comments_count > 2 && (
            <TouchableOpacity onPress={() => onComment(post.id)}>
              <Text style={s.viewAllComments}>{t("viewComments").replace("{count}", post.comments_count)}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {(!post.comments || post.comments.length === 0) && (
        <TouchableOpacity onPress={() => onComment(post.id)}>
          <Text style={s.viewAllComments}>{t("addComment")}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

export default function FeedScreen({ navigation, route }) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const { user } = useAuth();
  const loadingRef = useRef(false);
  const insets = useSafeAreaInsets();

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(pageNum === 1 && !append);
    try {
      const res = await client.get(`/feed?page=${pageNum}&per_page=20`);
      const newPosts = res.data?.data || [];
      if (append) setPosts((prev) => [...prev, ...newPosts]);
      else setPosts(newPosts);
      setHasMore(newPosts.length >= 20);
      setPage(pageNum);
    } catch (e) {
      console.warn("Feed error:", e?.code || e?.message, e?.config?.url, e?.response?.status);
    }
    loadingRef.current = false;
    setLoading(false);
  }, []);

  const loadStories = useCallback(async () => {
    try {
      const res = await client.get("/stories");
      setStories(res.data || []);
    } catch (e) {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message || e?.message || "unknown";
      console.warn("Stories error:", status, msg, e?.config?.url);
    }
  }, []);

  const loadHighlights = useCallback(async () => {
    try { const res = await client.get("/stories/highlights/all"); setHighlights(res.data || []); } catch (e) { /* silent */ }
  }, []);

  const refreshAll = useCallback(() => {
    load(1);
    loadStories();
    loadHighlights();
  }, [load, loadStories, loadHighlights]);

  useFocusEffect(
    useCallback(() => {
      loadingRef.current = false;
      refreshAll();
      return () => { loadingRef.current = false; };
    }, [refreshAll])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    await Promise.all([load(1), loadStories(), loadHighlights()]);
    setRefreshing(false);
  }, [load, loadStories, loadHighlights]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, load]);

  const likePost = useCallback(async (postId, liked, count) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked: liked ? 0 : 1, likes_count: count + (liked ? -1 : 1) } : p));
    try { await client.post("/likes", { post_id: postId }); }
    catch (e) { setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, liked: liked ? 1 : 0, likes_count: count } : p)); }
  }, []);

  const toggleBookmark = useCallback(async (postId) => {
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p));
    try { await client.post("/bookmarks", { post_id: postId }); }
    catch (e) { setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, bookmarked: !p.bookmarked } : p)); }
  }, []);

  const deletePost = useCallback((postId) => {
    Alert.alert(t("deletePost"), t("deletePostConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
        try { await client.delete(`/posts/${postId}`); setPosts((prev) => prev.filter((p) => p.id !== postId)); }
        catch (e) { Alert.alert(t("error"), t("failedToDelete")); }
      }},
    ]);
  }, [t]);

  const showPostMenu = useCallback((post) => {
    const isMine = post.user?.id === user?.id;
    const options = [];
    if (isMine) {
      options.push({ text: `✏️ ${t("edit")}`, onPress: () => navigation.navigate("EditPost", { postId: post.id, initialContent: post.content }) });
      options.push({ text: `🗑️ ${t("deletePost")}`, style: "destructive", onPress: () => deletePost(post.id) });
    } else {
      options.push({ text: `⚠️ ${t("report")}`, onPress: async () => {
        try { await client.post("/reports", { type: "post", id: post.id, reason: "Inappropriate" }); Alert.alert(t("success"), t("reported")); } catch (e) {}
      }});
    }
    options.push({ text: t("cancel"), style: "cancel" });
    Alert.alert(null, null, options);
  }, [user, t, navigation, deletePost]);

  const navigateComments = useCallback((id) => navigation.navigate("Comments", { postId: id }), [navigation]);
  const navigateShare = useCallback((id) => navigation.navigate("SharePost", { postId: id }), [navigation]);
  const navigateImage = useCallback((p) => navigation.navigate("ImageViewer", { imageUrl: p.image, username: p.user?.username }), [navigation]);
  const navigateVideo = useCallback((p) => navigation.navigate("VideoPost", { videoUrl: p.video, username: p.user?.username }), [navigation]);
  const navigateUser = useCallback((id) => navigation.navigate("UserProfile", { userId: id }), [navigation]);
  const navigateLikes = useCallback((id) => navigation.navigate("LikeList", { postId: id }), [navigation]);
  const navigateHashtag = useCallback((screen, params) => navigation.navigate(screen, params), [navigation]);

  const storiesData = useMemo(() => [
    { _k: "me", isMe: true },
    ...stories.map((s, i) => ({ ...s, _k: `s_${s.user?.id || i}` })),
  ], [stories]);

  const header = useMemo(() => (
    <View>
      <View style={[s.topBar, { paddingTop: insets.top + 4 }]}>
          <Text style={s.logo}>{t("sonix")}</Text>
        <View style={s.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate("Notifications")} style={s.topBtn}>
            <Text style={s.topBtnIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.storiesWrap}>
        <FlatList
          horizontal
          data={storiesData}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item._k}
          contentContainerStyle={s.storiesInner}
          renderItem={({ item }) => {
            if (item.isMe) {
              return (
                <TouchableOpacity style={s.storyItem} onPress={() => navigation.navigate("CreateStory")} activeOpacity={0.7}>
                  <View style={s.myStoryRing}>
                    <View style={s.myStoryAvatar}>
                      <Text style={s.myStoryInitial}>{user?.username?.[0]?.toUpperCase() || "?"}</Text>
                    </View>
                    <View style={s.plusBadge}><Text style={s.plusText}>+</Text></View>
                  </View>
                  <Text style={s.storyLabel}>{t("yourStory")}</Text>
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity style={s.storyItem} onPress={() => navigation.navigate("StoryViewer", { stories: item.stories, user: item.user })} activeOpacity={0.7}>
                <View style={[s.storyRing, !item.has_unseen && { borderColor: COLORS.border }]}>
                  <View style={s.storyAvatar}>
                    {item.user?.avatar ? (
                      <Image source={{ uri: `${resolveUrl(item.user.avatar)}${item.user?.id === user?.id ? "?t=" + Date.now() : ""}` }} style={{ width: "100%", height: "100%", borderRadius: 29 }} />
                    ) : (
                      <Text style={s.storyInitial}>{item.user?.username?.[0]?.toUpperCase() || "?"}</Text>
                    )}
                  </View>
                  {item.stories?.some((s) => s.type === "video") && (
                    <View style={s.videoBadge}>
                      <Text style={s.videoBadgeIcon}>🔊</Text>
                    </View>
                  )}
                </View>
                <Text style={s.storyLabel} numberOfLines={1}>{item.user?.username}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {highlights.length > 0 && (
        <View style={s.highlightsWrap}>
          <View style={s.highlightsHeader}>
            <Text style={s.highlightsTitle}>{t("highlights")}</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Highlights")}>
              <Text style={s.highlightsSeeAll}>{t("seeAll")}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={highlights}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(h) => String(h.id)}
            contentContainerStyle={s.highlightsInner}
            renderItem={({ item: h }) => (
              <TouchableOpacity style={s.highlightItem} onPress={() => navigation.navigate("Highlights")}>
                <View style={s.highlightRing}>
                  <View style={s.highlightAvatar}>
                    <Text style={s.highlightEmoji}>✨</Text>
                  </View>
                </View>
                <Text style={s.highlightLabel} numberOfLines={1}>{h.title}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  ), [insets, storiesData, user, highlights, loading, stories]);

  if (loading && posts.length === 0) {
    return (
      <Screen3D>
        <View style={[s.topBar, { paddingTop: insets.top + 4 }]}>
        <Text style={s.logo}>{t("sonix")}</Text>
        </View>
        <View style={s.skeletonWrap}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={s.skeletonCard}>
              <View style={s.skeletonHeader}>
                <View style={s.skeletonAvatar} />
                <View style={s.skeletonLines}>
                  <View style={[s.skeletonLine, { width: 120 }]} />
                  <View style={[s.skeletonLine, { width: 60, height: 8 }]} />
                </View>
              </View>
              <View style={s.skeletonImage} />
              <View style={s.skeletonActions}>
                <View style={[s.skeletonLine, { width: 40 }]} />
                <View style={[s.skeletonLine, { width: 40 }]} />
                <View style={[s.skeletonLine, { width: 40 }]} />
              </View>
            </View>
          ))}
        </View>
      </Screen3D>
    );
  }

  return (
    <Screen3D>
        <FlatList
        data={posts}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        extraData={posts.length}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={11}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={s.emptyCircle}>
              <Text style={s.emptyIcon}>✨</Text>
            </View>
            <Text style={s.emptyTitle}>{t("emptyFeed")}</Text>
            <Text style={s.emptySub}>{t("followPeople")}</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.getParent()?.navigate("Explore")}>
              <Text style={s.emptyBtnText}>{t("findPeople")}</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={loadingMore ? (
          <View style={s.loadingFooter}>
            <View style={s.loadingDot} />
            <View style={[s.loadingDot, { opacity: 0.6 }]} />
            <View style={[s.loadingDot, { opacity: 0.3 }]} />
          </View>
        ) : null}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}
        renderItem={({ item: post }) => (
          <PostCard
            post={post}
            currentUser={user}
            onLike={likePost}
            onBookmark={toggleBookmark}
            onComment={navigateComments}
            onShare={navigateShare}
            onImagePress={navigateImage}
            onVideoPress={navigateVideo}
            onMenuPress={showPostMenu}
            onUserPress={navigateUser}
            onLikesPress={navigateLikes}
            onHashtagPress={navigateHashtag}
          />
        )}
        />
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  topBar: { paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 28, fontWeight: "900", color: COLORS.amethystLight, letterSpacing: -1 },
  topActions: { flexDirection: "row", gap: 8 },
  topBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: COLORS.border },
  topBtnIcon: { fontSize: 18 },

  storiesWrap: { paddingVertical: 12 },
  storiesInner: { paddingHorizontal: 12, gap: 12 },
  storyItem: { alignItems: "center", width: 68 },
  myStoryRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  myStoryAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  myStoryInitial: { color: COLORS.primary, fontSize: 20, fontWeight: "700" },
  plusBadge: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.bg },
  plusText: { color: COLORS.text, fontSize: 14, fontWeight: "700", marginTop: -1 },
  storyRing: { width: 66, height: 66, borderRadius: 33, borderWidth: 3, borderColor: COLORS.accent, padding: 2, marginBottom: 4 },
  storyAvatar: { width: "100%", height: "100%", borderRadius: 29, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  storyInitial: { color: COLORS.text, fontSize: 20, fontWeight: "700" },
  storyLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: "center" },
  videoBadge: { position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: "#000", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: COLORS.bg },
  videoBadgeIcon: { fontSize: 11 },

  highlightsWrap: { paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  highlightsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  highlightsTitle: { fontSize: SIZES.md, ...FONTS.bold, color: COLORS.text },
  highlightsSeeAll: { fontSize: SIZES.sm, color: COLORS.accent },
  highlightsInner: { paddingHorizontal: 12, gap: 16 },
  highlightItem: { alignItems: "center", width: 68 },
  highlightRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  highlightAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  highlightEmoji: { fontSize: 24 },
  highlightLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: "center" },

  skeletonWrap: { padding: 12 },
  skeletonCard: { backgroundColor: COLORS.card, borderRadius: SIZES.radiusLg, marginBottom: 16, overflow: "hidden" },
  skeletonHeader: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  skeletonAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.border },
  skeletonLines: { gap: 6 },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: COLORS.border, width: 100 },
  skeletonImage: { width: "100%", height: SCREEN_W - 48, backgroundColor: COLORS.border },
  skeletonActions: { flexDirection: "row", gap: 12, padding: 12 },

  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(124,108,247,0.08)", alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 1, borderColor: "rgba(124,108,247,0.15)" },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: SIZES.xl, fontWeight: "700", color: COLORS.text, marginBottom: 6 },
  emptySub: { fontSize: SIZES.sm, color: COLORS.muted, textAlign: "center", marginBottom: 20 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: SIZES.md },

  card: { backgroundColor: "rgba(26,26,46,0.5)", marginBottom: 8, paddingHorizontal: 12, borderRadius: SIZES.radius, marginHorizontal: 6, borderWidth: 0.5, borderColor: "rgba(124,108,247,0.08)", overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  cardAvatarText: { fontWeight: "700", fontSize: 14 },
  cardUsername: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  cardTime: { fontSize: SIZES.xs, color: COLORS.muted },
  menuBtn: { padding: 8 },
  menuDots: { fontSize: 16, color: COLORS.text, fontWeight: "900", letterSpacing: 1 },

  imagePressable: { position: "relative" },
  postImg: { width: SCREEN_W - 24, height: SCREEN_W - 24, borderRadius: SIZES.radius, backgroundColor: COLORS.card },
  playOverlayIcon: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  playCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.3)" },
  playTriangle: { color: "#fff", fontSize: 22, marginLeft: 4 },
  videoPlaceholder: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card },
  videoPlaceholderIcon: { fontSize: 48, opacity: 0.3 },

  heartOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", zIndex: 10 },
  heartBig: { fontSize: 80 },

  contentWrap: { paddingVertical: 8 },
  textContentNoImage: { paddingHorizontal: 4, paddingVertical: 14 },
  textContentLarge: { fontSize: 16, lineHeight: 24 },
  contentText: { fontSize: SIZES.md, color: COLORS.text, lineHeight: 22 },
  contentUser: { fontWeight: "700" },

  actionsBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  actionsLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionBtn: { padding: 6 },
  actionIcon: { fontSize: 22 },
  likedIcon: { transform: [{ scale: 1.1 }] },
  bookmarkedIcon: { transform: [{ scale: 1.1 }] },
  hashtag: { color: COLORS.accent, fontWeight: "600" },
  mention: { color: COLORS.primary, fontWeight: "600" },

  likesText: { fontSize: SIZES.sm, fontWeight: "700", color: COLORS.text, paddingVertical: 2 },

  commentsPreview: { paddingVertical: 4, gap: 4 },
  commentRow: { flexDirection: "row", gap: 4, alignItems: "center" },
  commentUser: { fontSize: SIZES.sm, fontWeight: "700", color: COLORS.text },
  commentText: { fontSize: SIZES.sm, color: COLORS.muted, flex: 1 },
  viewAllComments: { fontSize: SIZES.sm, color: COLORS.muted, paddingVertical: 4 },

  loadingFooter: { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 20 },
  loadingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
});
