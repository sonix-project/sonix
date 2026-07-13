import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

function renderLinkable(text) {
  if (!text) return null;
  const parts = text.split(/([#@][\p{L}\p{N}_]+)/gu);
  return parts.map((part, i) => {
    if (part.startsWith("#")) return <Text key={i} style={s.linkHash}>{part}</Text>;
    if (part.startsWith("@")) return <Text key={i} style={s.linkMention}>{part}</Text>;
    return <Text key={i}>{part}</Text>;
  });
}

export default function CommentsScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const { postId } = route.params;
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    try { const res = await client.get(`/posts/${postId}/comments`); setComments(res.data || []); } catch (e) { console.warn("Comments load error", e?.response?.status); }
    setLoading(false);
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!text.trim()) return;
    try {
      await client.post(`/posts/${postId}/comments`, { content: text.trim() });
      setText("");
      await load();
    } catch (e) { console.warn("Comment error", e?.response?.status); }
  };

  const deleteComment = (commentId) => {
    Alert.alert(t("deleteComment"), t("deleteCommentConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
        try {
          await client.delete(`/comments/${commentId}`);
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        } catch (e) { console.warn("Delete comment error", e?.response?.status); }
      }},
    ]);
  };

  return (
    <Screen3D>
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t("comments")}</Text>
        <View style={{ width: 36 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 12, paddingBottom: Math.max(insets.bottom + 60, 70) }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.empty}>{t("noComments")}</Text>
            </View>
          }
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={[s.row, isRTL && { flexDirection: "row-reverse" }]}
              onLongPress={() => c.user?.id === user?.id && deleteComment(c.id)}
              activeOpacity={0.7}
            >
              <View style={s.avatar}><Text style={s.avatarText}>{c.user?.username?.[0]?.toUpperCase() || "?"}</Text></View>
              <View style={s.content}>
                <Text style={s.msg}>
                  <Text style={s.user}>{c.user?.username} </Text>
                  {renderLinkable(c.content)}
                </Text>
                <Text style={s.time}>{new Date(c.created_at).toLocaleDateString()}</Text>
              </View>
              {c.user?.id === user?.id && <Text style={s.delHint}>✕</Text>}
            </TouchableOpacity>
          )}
        />
      )}
      <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom + 6, 12) }]}>
        <TextInput style={s.input} value={text} onChangeText={setText} placeholder={t("addCommentPlaceholder")} placeholderTextColor={COLORS.muted} returnKeyType="send" onSubmitEditing={submit} />
        <TouchableOpacity onPress={submit}>
          <Text style={[s.postBtn, text.trim() && s.postBtnActive]}>{t("post")}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingBottom: 10, paddingHorizontal: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 22, color: COLORS.text },
  title: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  emptyWrap: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  empty: { textAlign: "center", color: COLORS.muted, fontSize: SIZES.md },
  row: { flexDirection: "row", marginBottom: 14, gap: 10, alignItems: "flex-start" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  avatarText: { color: COLORS.text, fontWeight: "600", fontSize: 13 },
  content: { flex: 1 },
  msg: { fontSize: 13, color: COLORS.text, lineHeight: 18 },
  user: { fontWeight: "700" },
  time: { fontSize: 11, color: COLORS.muted, marginTop: 4 },
  delHint: { color: COLORS.muted, fontSize: 12, paddingLeft: 4, paddingTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: COLORS.border, gap: 8 },
  input: { flex: 1, height: 38, borderRadius: 19, backgroundColor: COLORS.input, paddingHorizontal: 16, fontSize: 13, color: COLORS.text },
  postBtn: { fontSize: 14, fontWeight: "600", color: COLORS.accent, opacity: 0.5 },
  postBtnActive: { opacity: 1 },
  linkHash: { color: COLORS.accent, fontWeight: "600" },
  linkMention: { color: COLORS.primary, fontWeight: "600" },
});
