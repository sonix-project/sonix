import { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import client from "../api/client";
import { COLORS, SIZES } from "../components/Theme";
import { useLanguage } from "../context/LanguageContext";
import Screen3D from "../components/3D/Screen3D";

const { width: SCREEN_W } = Dimensions.get("window");

export default function CreatePostScreen({ navigation }) {
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const insets = useSafeAreaInsets();

  const pickMedia = async (type) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === "video" ? ["videos"] : ["images"],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType(type);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed"); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType("image");
    }
  };

  const submit = async () => {
    if (!content.trim() && !mediaUri) return;
    setUploading(true);
    try {
      const formData = new FormData();
      if (content.trim()) formData.append("content", content.trim());
      if (mediaUri) {
        const ext = mediaType === "video" ? "mp4" : "jpg";
        const mime = mediaType === "video" ? "video/mp4" : "image/jpeg";
        const filename = mediaUri.split("/").pop() || `media.${ext}`;
        formData.append(mediaType === "video" ? "video" : "image", { uri: mediaUri, name: filename, type: mime });
      }
      await client.post("/posts", formData, { headers: { "Content-Type": "multipart/form-data" } });
      navigation.navigate("Home", { screen: "Feed" });
    } catch (e) {
      Alert.alert(t("error"), e.response?.data?.message || t("failedToCreatePost"));
    }
    setUploading(false);
  };

  const canPost = content.trim() || mediaUri;

  return (
    <Screen3D style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t("newPost")}</Text>
        <TouchableOpacity style={[s.shareBtn, !canPost && s.shareBtnDisabled]} onPress={submit} disabled={uploading || !canPost}>
          <Text style={[s.shareText, !canPost && s.shareTextDisabled]}>{uploading ? t("sharing") : t("share")}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scrollContent} contentContainerStyle={s.scrollContentContainer}>
        <View style={s.authorRow}>
          <View style={[s.authorAvatar, { backgroundColor: COLORS.primary + "30" }]}>
            <Text style={[s.authorAvatarText, { color: COLORS.primary }]}>U</Text>
          </View>
          <View>
            <Text style={s.authorName}>You</Text>
            <Text style={s.authorBadge}>Public</Text>
          </View>
        </View>

        <TextInput
          ref={inputRef}
          style={s.input}
          multiline
          placeholder={t("whatsOnMind")}
          placeholderTextColor={COLORS.muted}
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
          autoFocus
        />

        {mediaUri && (
          <View style={s.mediaContainer}>
            {mediaType === "video" ? (
              <View style={s.videoThumbnail}>
                <Image source={{ uri: mediaUri }} style={s.media} resizeMode="cover" />
                <View style={s.playOverlay}>
                  <View style={s.playCircle}><Text style={s.playIcon}>▶</Text></View>
                </View>
                <View style={s.videoBadge}><Text style={s.videoBadgeText}>🎬 Video</Text></View>
              </View>
            ) : (
              <Image source={{ uri: mediaUri }} style={s.media} resizeMode="cover" />
            )}
            <TouchableOpacity style={s.removeMediaBtn} onPress={() => { setMediaUri(null); setMediaType(null); }}>
              <Text style={s.removeMediaText}>✕</Text>
            </TouchableOpacity>
            <View style={s.mediaOverlay}>
              <TouchableOpacity style={s.changeMediaBtn} onPress={() => pickMedia(mediaType || "image")}>
                <Text style={s.changeMediaText}>{t("changePhoto")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[s.toolbar, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <View style={s.toolActions}>
          <TouchableOpacity style={s.toolBtn} onPress={() => pickMedia("image")}>
            <View style={[s.toolIconWrap, { backgroundColor: COLORS.primary + "20" }]}>
              <Text style={s.toolIcon}>🖼️</Text>
            </View>
            <Text style={s.toolLabel}>{t("gallery")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.toolBtn} onPress={takePhoto}>
            <View style={[s.toolIconWrap, { backgroundColor: COLORS.accent + "20" }]}>
              <Text style={s.toolIcon}>📷</Text>
            </View>
            <Text style={s.toolLabel}>{t("camera")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.toolBtn} onPress={() => pickMedia("video")}>
            <View style={[s.toolIconWrap, { backgroundColor: "#E1705530" }]}>
              <Text style={s.toolIcon}>🎬</Text>
            </View>
            <Text style={s.toolLabel}>{t("video")}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.charCount}>
          <Text style={[s.charText, content.length > 2000 && { color: COLORS.danger }]}>
            {content.length}/2000
          </Text>
        </View>
      </View>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: "center", justifyContent: "center" },
  backText: { fontSize: 16, color: COLORS.text, fontWeight: "700" },
  title: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text },
  shareBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingHorizontal: 20, height: 36, alignItems: "center", justifyContent: "center" },
  shareBtnDisabled: { backgroundColor: COLORS.border },
  shareText: { color: COLORS.text, fontWeight: "700", fontSize: SIZES.md },
  shareTextDisabled: { color: COLORS.muted },
  scrollContent: { flex: 1 },
  scrollContentContainer: { padding: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  authorAvatarText: { fontWeight: "700", fontSize: 16 },
  authorName: { fontSize: SIZES.md, fontWeight: "600", color: COLORS.text },
  authorBadge: { fontSize: SIZES.xs, color: COLORS.muted },
  input: { fontSize: 17, color: COLORS.text, lineHeight: 26, minHeight: 120, padding: 0 },
  mediaContainer: { marginTop: 16, borderRadius: SIZES.radiusLg, overflow: "hidden", position: "relative" },
  media: { width: "100%", height: 280, borderRadius: SIZES.radiusLg },
  videoThumbnail: { position: "relative" },
  playOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  playCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "rgba(255,255,255,0.3)" },
  playIcon: { color: "#fff", fontSize: 22, marginLeft: 4 },
  videoBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  videoBadgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  removeMediaBtn: { position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.overlay, alignItems: "center", justifyContent: "center", zIndex: 2 },
  removeMediaText: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  mediaOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: "rgba(0,0,0,0.5)", flexDirection: "row", justifyContent: "flex-end" },
  changeMediaBtn: { backgroundColor: COLORS.primary + "CC", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  changeMediaText: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: "600" },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: COLORS.border, backgroundColor: COLORS.bg },
  toolActions: { flexDirection: "row", gap: 16 },
  toolBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  toolIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  toolIcon: { fontSize: 18 },
  toolLabel: { fontSize: SIZES.sm, fontWeight: "600", color: COLORS.textSecondary },
  charCount: { alignItems: "flex-end" },
  charText: { fontSize: SIZES.xs, color: COLORS.muted },
});
