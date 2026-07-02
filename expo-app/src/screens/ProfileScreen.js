import { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert, Image, StyleSheet, RefreshControl, Dimensions, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import client, { IMAGE_BASE } from "../api/client";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const { width: SCREEN_W } = Dimensions.get("window");
const COLS = 3;
const GAP = 2;
const CELL = (SCREEN_W - GAP * (COLS - 1)) / COLS;

export default function ProfileScreen({ navigation }) {
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0 });
  const [isPrivate, setIsPrivate] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try {
      const [postsRes, statsRes, meRes] = await Promise.all([
        client.get(`/posts/user/${user.id}`),
        client.get(`/users/${user.id}/stats`),
        client.get("/users/me"),
      ]);
      setPosts(postsRes.data?.data || []);
      setStats(statsRes.data);
      setIsPrivate(!!meRes.data.is_private);
    } catch (e) { console.warn("Profile load error", e?.response?.status); }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const loadRequests = async () => {
    try { const res = await client.get("/follow/requests"); setRequests(res.data || []); setShowRequests(true); } catch (e) { console.warn("Load requests error", e?.response?.status); }
  };

  const approveRequest = async (id) => {
    try { await client.post(`/follow/approve/${id}`); setRequests((p) => p.filter((r) => r.id !== id)); load(); } catch (e) { console.warn("Approve error", e?.response?.status); }
  };

  const rejectRequest = async (id) => {
    try { await client.post(`/follow/reject/${id}`); setRequests((p) => p.filter((r) => r.id !== id)); } catch (e) { console.warn("Reject error", e?.response?.status); }
  };

  const togglePrivacy = async () => {
    try { const res = await client.post("/users/toggle-privacy"); setIsPrivate(res.data.is_private); } catch (e) { console.warn("Toggle privacy error", e?.response?.status); }
  };

  const handleLogout = () => {
    Alert.alert(t("logout"), t("areYouSure"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: logout },
    ]);
  };

  const header = useMemo(() => (
    <View style={s.headerWrap}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <Text style={s.username}>{user?.username}</Text>
          <View style={s.topBarRight}>
            <TouchableOpacity onPress={() => navigation.navigate("Settings")} style={s.iconBtn}><Text style={s.icon}>⚙</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={s.iconBtn}><Text style={s.icon}>↗</Text></TouchableOpacity>
          </View>
      </View>

      <View style={s.profileSection}>
        <View style={s.avatarRow}>
          <View style={s.avatarRing}>
            <View style={s.avatarInner}>
              {user?.avatar ? (
                <Image source={{ uri: `${IMAGE_BASE}${user.avatar}?t=${Date.now()}` }} style={{ width: 78, height: 78, borderRadius: 39 }} />
              ) : (
                <Text style={s.avatarLetter}>{user?.username?.[0]?.toUpperCase() || "?"}</Text>
              )}
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statNum}>{stats.posts}</Text>
              <Text style={s.statLbl}>{t("posts")}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("Followers")} style={s.statItem}>
              <Text style={s.statNum}>{stats.followers}</Text>
              <Text style={s.statLbl}>{t("followers")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Followers")} style={s.statItem}>
              <Text style={s.statNum}>{stats.following}</Text>
              <Text style={s.statLbl}>{t("following")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.name}>{user?.username}</Text>
        {user?.bio ? <Text style={s.bio}>{user.bio}</Text> : null}
        <Text style={s.privacy}>{isPrivate ? `🔒 ${t("private")}` : `🌐 ${t("public")}`}</Text>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate("EditProfile")}>
            <Text style={s.editBtnText}>{t("editProfile")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.editBtn} onPress={togglePrivacy}>
            <Text style={s.editBtnText}>{isPrivate ? t("makePublic") : t("makePrivate")}</Text>
          </TouchableOpacity>
          {isPrivate && (
            <TouchableOpacity style={s.requestsBtn} onPress={loadRequests}>
              <Text style={s.requestsBtnText}>{t("requests")} {requests.length > 0 ? `(${requests.length})` : ""}</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={s.savedRow} onPress={() => navigation.navigate("SavedPosts")}>
          <Text style={s.savedIcon}>🔖</Text>
          <Text style={s.savedLabel}>{t("saved")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.savedRow} onPress={() => navigation.navigate("Highlights")}>
          <Text style={s.savedIcon}>✨</Text>
          <Text style={s.savedLabel}>{t("highlights")}</Text>
        </TouchableOpacity>

        {showRequests && requests.length > 0 && (
          <View style={s.requestsSection}>
            {requests.map((r) => (
              <View key={r.id} style={s.reqRow}>
                <View style={s.reqAvatar}><Text style={s.reqAvatarText}>{r.follower?.username?.[0]?.toUpperCase() || "?"}</Text></View>
                <Text style={s.reqName}>{r.follower?.username}</Text>
                <View style={s.reqActions}>
                  <TouchableOpacity onPress={() => approveRequest(r.id)} style={s.approveBtn}><Text style={s.btnCheck}>✓</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => rejectRequest(r.id)} style={s.rejectBtn}><Text style={s.btnX}>✕</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {posts.length === 0 && (
        <View style={s.emptyWrap}>
          <Text style={s.emptyIcon}>📷</Text>
          <Text style={s.emptyTitle}>{t("noPosts")}</Text>
        </View>
      )}
    </View>
  ), [user, stats, isPrivate, requests, showRequests, insets]);

  if (loading) {
    return (
      <Screen3D style={{ alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.accent} size="large" />
      </Screen3D>
    );
  }

  return (
    <Screen3D>
      <FlatList
        style={{ flex: 1 }}
        data={posts}
        numColumns={COLS}
        keyExtractor={(p) => String(p.id)}
        ListHeaderComponent={header}
        columnWrapperStyle={posts.length > 0 ? { gap: GAP } : null}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 30) }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={COLORS.text} colors={[COLORS.text]} />}
        renderItem={({ item: post }) => (
          <TouchableOpacity style={s.cell}>
            {post.image ? (
              <Image source={{ uri: `${IMAGE_BASE}${post.image}` }} style={s.cellImg} resizeMode="cover" />
            ) : (
              <View style={s.cellText}>
                <Text style={s.cellTextContent} numberOfLines={4}>{post.content}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { backgroundColor: "transparent" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  username: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text },
  topBarRight: { flexDirection: "row", gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: COLORS.border },
  icon: { fontSize: 18, color: COLORS.textSecondary },
  profileSection: { paddingHorizontal: 16, paddingBottom: 12 },
  avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 20 },
  avatarRing: { width: 86, height: 86, borderRadius: 43, borderWidth: 2.5, borderColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  avatarInner: { width: 78, height: 78, borderRadius: 39, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  avatarLetter: { color: COLORS.accent, fontSize: 32, ...FONTS.semiBold },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 17, ...FONTS.bold, color: COLORS.text },
  statLbl: { fontSize: 13, color: COLORS.muted },
  name: { fontSize: SIZES.md, ...FONTS.semiBold, color: COLORS.text, marginBottom: 2 },
  bio: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 2 },
  privacy: { fontSize: 12, color: COLORS.accent, marginBottom: 10 },
  btnRow: { flexDirection: "row", gap: 8 },
  editBtn: { flex: 1, paddingVertical: 10, borderRadius: SIZES.radius, backgroundColor: COLORS.accent, alignItems: "center" },
  editBtnText: { fontSize: 13, ...FONTS.semiBold, color: "#0d0d1a" },
  requestsBtn: { flex: 1, paddingVertical: 8, borderRadius: SIZES.radius, backgroundColor: COLORS.primary, alignItems: "center" },
  requestsBtnText: { fontSize: 13, ...FONTS.semiBold, color: "#fff" },
  requestsSection: { marginTop: 12 },
  reqRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  reqAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", marginRight: 10, borderWidth: 0.5, borderColor: COLORS.border },
  reqAvatarText: { color: COLORS.text, ...FONTS.semiBold, fontSize: 14 },
  reqName: { flex: 1, fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
  reqActions: { flexDirection: "row", gap: 8 },
  approveBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.success, alignItems: "center", justifyContent: "center" },
  btnCheck: { color: "#fff", fontSize: 16, ...FONTS.bold },
  rejectBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 0.5, borderColor: COLORS.border },
  btnX: { color: COLORS.danger, fontSize: 16, ...FONTS.bold },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, color: COLORS.muted },
  cell: { width: CELL, height: CELL, marginBottom: GAP },
  cellImg: { width: "100%", height: "100%" },
  cellText: { width: "100%", height: "100%", backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", padding: 6 },
  cellTextContent: { fontSize: 11, color: COLORS.textSecondary, textAlign: "center" },
  savedRow: { flexDirection: "row", alignItems: "center", marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: COLORS.card, borderRadius: SIZES.radius, marginHorizontal: 0 },
  savedIcon: { fontSize: 18, marginRight: 10 },
  savedLabel: { fontSize: 14, ...FONTS.semiBold, color: COLORS.text },
});
