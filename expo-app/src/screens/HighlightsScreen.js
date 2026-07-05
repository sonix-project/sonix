import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client, { IMAGE_BASE } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function HighlightsScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { userId } = route?.params || {};
  const { user: currentUser } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showStoryPicker, setShowStoryPicker] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [myStories, setMyStories] = useState([]);
  const [selectedStories, setSelectedStories] = useState(new Set());
  const [loadingStories, setLoadingStories] = useState(false);
  const insets = useSafeAreaInsets();

  const isOwner = !userId || userId === currentUser?.id;

  const load = useCallback(async () => {
    try {
      const url = isOwner ? "/stories/highlights/all" : `/users/${userId}/highlights`;
      const res = await client.get(url);
      setHighlights(res.data || []);
    } catch (e) {
      console.warn("Highlights load error", e?.response?.status);
    }
    setLoading(false);
  }, [userId, isOwner]);

  useEffect(() => { load(); }, [load]);

  const loadMyStories = async () => {
    setLoadingStories(true);
    try {
      const res = await client.get("/stories/mine");
      setMyStories(res.data || []);
    } catch (_) {}
    setLoadingStories(false);
  };

  const createHighlight = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const storyIds = Array.from(selectedStories);
      const res = await client.post("/stories/highlights", {
        title: newTitle.trim(),
        story_ids: storyIds.length > 0 ? storyIds : [],
      });
      setHighlights((p) => [res.data, ...p]);
      setNewTitle("");
      setSelectedStories(new Set());
      setShowCreate(false);
    } catch (e) {
      Alert.alert(t("error"), t("failedToCreateHighlight"));
    }
    setCreating(false);
  };

  const updateHighlightTitle = async () => {
    if (!editTitle.trim() || !showEdit) return;
    setCreating(true);
    try {
      const res = await client.put(`/stories/highlights/${showEdit.id}`, { title: editTitle.trim() });
      setHighlights((p) => p.map((h) => h.id === showEdit.id ? res.data : h));
      setEditTitle("");
      setShowEdit(null);
    } catch (e) {
      Alert.alert(t("error"), t("failedToUpdateHighlight"));
    }
    setCreating(false);
  };

  const addStoryToHighlight = async (highlightId, storyId) => {
    try {
      const res = await client.post(`/stories/highlights/${highlightId}/add`, { story_id: storyId });
      setHighlights((p) => p.map((h) => h.id === highlightId ? res.data : h));
      setSelectedStories(new Set());
      setShowStoryPicker(null);
    } catch (_) {}
  };

  const removeStoryFromHighlight = async (highlightId, storyId) => {
    try {
      const res = await client.delete(`/stories/highlights/${highlightId}/stories/${storyId}`);
      setHighlights((p) => p.map((h) => h.id === highlightId ? res.data : h));
    } catch (_) {}
  };

  const deleteHighlight = (id) => {
    Alert.alert(t("deleteHighlight"), t("areYouSure"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
        try {
          await client.delete(`/stories/highlights/${id}`);
          setHighlights((p) => p.filter((h) => h.id !== id));
        } catch (_) {}
      }},
    ]);
  };

  const toggleStorySelection = (storyId) => {
    setSelectedStories((p) => {
      const n = new Set(p);
      n.has(storyId) ? n.delete(storyId) : n.add(storyId);
      return n;
    });
  };

  return (
    <Screen3D style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.backText}>←</Text></TouchableOpacity>
        <Text style={s.title}>{t("highlights")}</Text>
        {isOwner && (
          <TouchableOpacity onPress={() => { setShowCreate(true); loadMyStories(); }}>
            <Text style={s.addBtn}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={highlights}
          keyExtractor={(h) => String(h.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom + 20, 30) }}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={s.emptyIcon}>✨</Text>
              <Text style={s.emptyText}>{t("noHighlights")}</Text>
              {isOwner && <Text style={s.emptyHint}>{t("createHighlightDesc")}</Text>}
            </View>
          }
          renderItem={({ item: h }) => (
            <View style={s.highlightCard}>
              <TouchableOpacity
                style={s.highlightMain}
                onPress={() => {
                  const stories = h.stories || [];
                  if (stories.length === 0) return;
                  navigation.navigate("StoryViewer", {
                    stories,
                    user: stories[0]?.user || currentUser,
                  });
                }}
                onLongPress={() => isOwner && deleteHighlight(h.id)}
              >
                <View style={s.highlightCover}>
                  {h.stories?.[0]?.image ? (
                    <Image source={{ uri: `${IMAGE_BASE}${h.stories[0].image}` }} style={s.coverImg} />
                  ) : h.cover_image ? (
                    <Image source={{ uri: `${IMAGE_BASE}${h.cover_image}` }} style={s.coverImg} />
                  ) : (
                    <Text style={s.coverPlaceholder}>✨</Text>
                  )}
                </View>
                <View style={s.highlightInfo}>
                  <Text style={s.highlightTitle} numberOfLines={1}>{h.title}</Text>
                  <Text style={s.highlightCount}>{t("storyCount").replace("{count}", h.stories?.length || 0)}</Text>
                </View>
              </TouchableOpacity>
              {isOwner && (
                <View style={s.highlightActions}>
                  <TouchableOpacity style={s.highlightActionBtn} onPress={() => { setEditTitle(h.title); setShowEdit(h); }}>
                    <Text style={s.highlightActionText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.highlightActionBtn} onPress={() => { setSelectedStories(new Set()); setShowStoryPicker(h); loadMyStories(); }}>
                    <Text style={s.highlightActionText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.highlightActionBtn} onPress={() => deleteHighlight(h.id)}>
                    <Text style={[s.highlightActionText, { color: COLORS.danger }]}>🗑</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t("newHighlight")}</Text>
            <TextInput
              style={s.modalInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder={t("highlightName")}
              placeholderTextColor={COLORS.muted}
              maxLength={30}
              autoFocus
            />

            <Text style={s.sectionLabel}>{t("selectStories")}</Text>
            {loadingStories ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
            ) : myStories.length > 0 ? (
              <ScrollView style={s.storiesList} nestedScrollEnabled>
                {myStories.map((story) => (
                  <TouchableOpacity
                    key={story.id}
                    style={[s.storySelectRow, selectedStories.has(story.id) && s.storySelectActive]}
                    onPress={() => toggleStorySelection(story.id)}
                  >
                    {story.image ? (
                      <Image source={{ uri: `${IMAGE_BASE}${story.image}` }} style={s.storyThumb} />
                    ) : (
                      <View style={[s.storyThumb, { backgroundColor: story.bg_color || COLORS.card, alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 16 }}>📝</Text>
                      </View>
                    )}
                    <Text style={s.storySelectText} numberOfLines={1}>
                      {story.text_overlay || `Story ${new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </Text>
                    <View style={[s.storyCheckbox, selectedStories.has(story.id) && s.storyCheckboxActive]}>
                      {selectedStories.has(story.id) && <Text style={s.storyCheckmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={s.noStoriesText}>{t("noActiveStories")}</Text>
            )}

            <TouchableOpacity style={[s.createBtn, creating && { opacity: 0.5 }]} onPress={createHighlight} disabled={creating}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.createBtnText}>{t("create")}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!showEdit} transparent animationType="slide" onRequestClose={() => setShowEdit(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t("editHighlight")}</Text>
            <TextInput
              style={s.modalInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder={t("highlightName")}
              placeholderTextColor={COLORS.muted}
              maxLength={30}
              autoFocus
            />
            <TouchableOpacity style={[s.createBtn, creating && { opacity: 0.5 }]} onPress={updateHighlightTitle} disabled={creating}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={s.createBtnText}>{t("save")}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!showStoryPicker} transparent animationType="slide" onRequestClose={() => setShowStoryPicker(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t("addToHighlight").replace("{title}", showStoryPicker?.title || "")}</Text>

            {showStoryPicker?.stories?.length > 0 && (
              <>
                <Text style={s.sectionLabel}>{t("inHighlight")}</Text>
                <ScrollView style={s.storiesList} nestedScrollEnabled>
                  {showStoryPicker.stories.map((story) => (
                    <View key={story.id} style={s.storySelectRow}>
                      {story.image ? (
                        <Image source={{ uri: `${IMAGE_BASE}${story.image}` }} style={s.storyThumb} />
                      ) : (
                        <View style={[s.storyThumb, { backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" }]}>
                          <Text style={{ fontSize: 16 }}>📝</Text>
                        </View>
                      )}
                      <Text style={s.storySelectText} numberOfLines={1}>
                        {story.text_overlay || `Story ${new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </Text>
                      <TouchableOpacity onPress={() => removeStoryFromHighlight(showStoryPicker.id, story.id)}>
                        <Text style={{ color: COLORS.danger, fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[s.sectionLabel, { marginTop: 12 }]}>{t("addFromStories")}</Text>
            {loadingStories ? (
              <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
            ) : myStories.length > 0 ? (
              <ScrollView style={s.storiesList} nestedScrollEnabled>
                {myStories.filter((s) => !showStoryPicker?.stories?.some((hs) => hs.id === s.id)).map((story) => (
                  <TouchableOpacity
                    key={story.id}
                    style={s.storySelectRow}
                    onPress={() => addStoryToHighlight(showStoryPicker.id, story.id)}
                  >
                    {story.image ? (
                      <Image source={{ uri: `${IMAGE_BASE}${story.image}` }} style={s.storyThumb} />
                    ) : (
                      <View style={[s.storyThumb, { backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 16 }}>📝</Text>
                      </View>
                    )}
                    <Text style={s.storySelectText} numberOfLines={1}>
                      {story.text_overlay || `Story ${new Date(story.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                    </Text>
                    <Text style={{ color: COLORS.primary, fontSize: 14, ...FONTS.semiBold }}>{t("addBtn")}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={s.noStoriesText}>{t("noActiveStories")}</Text>
            )}
          </View>
        </View>
      </Modal>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  backText: { fontSize: 22, color: COLORS.text },
  title: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text },
  addBtn: { fontSize: 28, color: COLORS.accent, ...FONTS.bold },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text },
  emptyHint: { fontSize: SIZES.sm, color: COLORS.muted, marginTop: 6 },
  highlightCard: { marginBottom: 16 },
  highlightMain: { flexDirection: "row", alignItems: "center", gap: 14 },
  highlightCover: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: COLORS.border, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card },
  coverImg: { width: "100%", height: "100%" },
  coverPlaceholder: { fontSize: 32 },
  highlightInfo: { flex: 1 },
  highlightTitle: { fontSize: SIZES.md, ...FONTS.semiBold, color: COLORS.text },
  highlightCount: { fontSize: SIZES.xs, color: COLORS.muted, marginTop: 2 },
  highlightActions: { flexDirection: "row", gap: 6, marginTop: 8 },
  highlightActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  highlightActionText: { fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 30, maxHeight: "80%" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.muted, alignSelf: "center", marginBottom: 12 },
  modalTitle: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text, textAlign: "center", marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.input, borderRadius: SIZES.radius, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 16 },
  sectionLabel: { fontSize: SIZES.sm, ...FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 8 },
  storiesList: { maxHeight: 200, marginBottom: 12 },
  storySelectRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  storySelectActive: { backgroundColor: COLORS.primary + "15", borderRadius: 8 },
  storyThumb: { width: 40, height: 40, borderRadius: 8, overflow: "hidden" },
  storySelectText: { flex: 1, color: COLORS.text, fontSize: 13 },
  storyCheckbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.muted, alignItems: "center", justifyContent: "center" },
  storyCheckboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  storyCheckmark: { color: "#fff", fontSize: 12, ...FONTS.bold },
  noStoriesText: { color: COLORS.muted, textAlign: "center", paddingVertical: 20, fontSize: 13 },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  createBtnText: { color: "#fff", ...FONTS.bold, fontSize: SIZES.lg },
});
