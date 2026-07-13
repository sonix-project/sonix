import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image, TextInput, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, SIZES } from "../components/Theme";
import client, { resolveUrl } from "../api/client";
import { useLanguage } from "../context/LanguageContext";

const { width: SCREEN_W } = Dimensions.get("window");
const COL_W = (SCREEN_W - 36) / 3;

export default function ExploreScreen({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState({ trending: [], suggested: [] });
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const fetchExplore = useCallback(async () => {
    try {
      const res = await client.get("/explore");
      setData(res.data);
    } catch (e) { console.warn(e); }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetchExplore(); }, [fetchExplore]));

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); setSearching(false); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await client.get(`/users/search?q=${encodeURIComponent(searchQ)}&per_page=10`);
        setSearchResults(res.data?.data || res.data || []);
      } catch (e) {}
      setSearching(false);
    }, 300);
    setSearching(true);
    return () => clearTimeout(timeout);
  }, [searchQ]);

  const renderTrendingPost = ({ item }) => (
    <TouchableOpacity style={s.gridItem} onPress={() => navigation.navigate("Comments", { postId: item.id })} activeOpacity={0.8}>
      {item.image ? (
        <Image source={{ uri: resolveUrl(item.image) }} style={s.gridImg} resizeMode="cover" />
      ) : (
        <View style={[s.gridImg, s.gridTextBg]}>
          <Text style={s.gridText} numberOfLines={3}>{item.content}</Text>
        </View>
      )}
      <View style={s.gridOverlay}>
        <Text style={s.gridLikes}>❤️ {item.likes_count || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSuggestedUser = ({ item }) => (
    <TouchableOpacity style={s.userRow} onPress={() => navigation.navigate("UserProfile", { userId: item.id })} activeOpacity={0.7}>
      <Image source={{ uri: resolveUrl(item.avatar) }} style={s.userAvatar} />
      <View style={s.userInfo}>
        <Text style={s.userName}>{item.username}</Text>
        {item.bio ? <Text style={s.userBio} numberOfLines={1}>{item.bio}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.topBar}><Text style={s.logo}>{t("sonix")}</Text></View>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 60 }} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <Text style={s.logo}>{t("sonix")}</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Notifications")}><Text style={s.bellIcon}>🔔</Text></TouchableOpacity>
      </View>

      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput style={s.searchInput} value={searchQ} onChangeText={setSearchQ} placeholder={t("searchUsers")} placeholderTextColor={COLORS.muted} returnKeyType="search" />
        {searchQ ? <TouchableOpacity onPress={() => setSearchQ("")}><Text style={s.clearBtn}>✕</Text></TouchableOpacity> : null}
      </View>

      <FlatList
        data={searchQ.trim() ? searchResults : data.suggested}
        keyExtractor={(item) => String(item.id)}
        renderItem={searchQ.trim() ? renderSuggestedUser : renderSuggestedUser}
        ListHeaderComponent={searchQ.trim() ? null : (
          <View>
            {data.trending.length > 0 && (
              <View>
                <Text style={s.sectionTitle}>{t("trending")}</Text>
                <FlatList data={data.trending} keyExtractor={(item) => String(item.id)} renderItem={renderTrendingPost} numColumns={3} scrollEnabled={false} columnWrapperStyle={s.gridRow} />
              </View>
            )}
            <Text style={s.sectionTitle}>{t("suggested")}</Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={searching ? <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.primary} /> : <Text style={s.empty}>{t("noResults")}</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 },
  logo: { fontSize: 24, fontWeight: "800", color: COLORS.text },
  bellIcon: { fontSize: 22 },

  searchBar: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.input, borderRadius: 20, paddingHorizontal: 14, height: 40, gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: SIZES.md, color: COLORS.text, padding: 0 },
  clearBtn: { fontSize: 16, color: COLORS.muted, padding: 4 },

  sectionTitle: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },

  gridRow: { paddingHorizontal: 12, gap: 6, marginBottom: 6 },
  gridItem: { width: COL_W, height: COL_W, borderRadius: 8, overflow: "hidden", position: "relative" },
  gridImg: { width: "100%", height: "100%" },
  gridTextBg: { backgroundColor: COLORS.input, justifyContent: "center", padding: 6 },
  gridText: { fontSize: 11, color: COLORS.text, lineHeight: 15 },
  gridOverlay: { position: "absolute", bottom: 4, left: 4, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  gridLikes: { color: "#fff", fontSize: 10 },

  userRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.border },
  userInfo: { flex: 1 },
  userName: { fontWeight: "600", color: COLORS.text, fontSize: SIZES.md },
  userBio: { fontSize: SIZES.sm, color: COLORS.muted, marginTop: 2 },

  empty: { textAlign: "center", marginTop: 40, color: COLORS.muted, fontSize: SIZES.md },
});

