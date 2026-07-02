import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Animated, Keyboard, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import client from "../api/client";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import { useLanguage } from "../context/LanguageContext";
import StoryEditor from "../components/StoryEditor";
import Screen3D from "../components/3D/Screen3D";

export default function CreateStoryScreen({ navigation }) {
  const { t } = useLanguage();
  const [media, setMedia] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [step, setStep] = useState("pick");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("");
  const progressAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const animateProgress = (toValue) => {
    Animated.timing(progressAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionNeeded"), t("grantCameraRollPhoto"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setMedia(result.assets[0].uri);
        setMediaType("image");
        setStep("edit");
      }
    } catch (e) {
      Alert.alert(t("error"), t("failedToPickImage"));
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionNeeded"), t("grantCameraRollVideo"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (asset.duration && asset.duration > 60000) {
          Alert.alert(t("tooLong"), t("videoTooLong"));
          return;
        }
        setMedia(asset.uri);
        setMediaType("video");
        setStep("edit");
      }
    } catch (e) {
      Alert.alert(t("error"), t("failedToPickVideo"));
    }
  };

  const capture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(t("permissionNeeded"), t("grantCameraPhoto"));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) {
        setMedia(result.assets[0].uri);
        setMediaType("image");
        setStep("edit");
      }
    } catch (e) {
      Alert.alert(t("error"), t("failedToCapturePhoto"));
    }
  };

  const postStory = async ({ text_overlay, text_color, bg_color, duration, imageUri, videoUri, mediaType: mType, stickers, drawing_data }) => {
    const hasImage = mType !== "video" && imageUri;
    const hasVideo = mType === "video" && videoUri;
    const hasText = text_overlay && text_overlay.trim().length > 0;
    const hasStickers = stickers && stickers.length > 0;
    const hasDrawing = drawing_data && drawing_data.length > 0;

    if (!hasImage && !hasVideo && !hasText) {
      Alert.alert(t("emptyStory"), t("addContent"));
      return;
    }

    Keyboard.dismiss();
    setUploading(true);
    setUploadProgress(0);
    setUploadPhase(t("preparing"));
    animateProgress(0);

    const formData = new FormData();
    if (text_overlay) formData.append("text_overlay", text_overlay);
    if (text_color) formData.append("text_color", text_color);
    if (bg_color) formData.append("bg_color", bg_color);
    formData.append("duration", String(duration || 5));
    if (stickers) formData.append("stickers", JSON.stringify(stickers));
    if (drawing_data) formData.append("drawing_data", JSON.stringify(drawing_data));

    if (hasVideo && videoUri) {
      const filename = `story_${Date.now()}.mp4`;
      const mimeType = "video/mp4";
      formData.append("video", { uri: videoUri, name: filename, type: mimeType });
      setUploadPhase(t("uploadingVideo"));
    } else if (hasImage && imageUri) {
      const filename = `story_${Date.now()}.jpg`;
      const mimeType = "image/jpeg";
      formData.append("image", { uri: imageUri, name: filename, type: mimeType });
      setUploadPhase(t("uploadingPhoto"));
    } else {
      setUploadPhase(t("publishing"));
    }

    animateProgress(0.3);
    setUploadProgress(30);

    try {
      await client.post("/stories", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(percent, 90));
            animateProgress(percent / 100);
          }
        },
      });

      setUploadPhase(t("published"));
      setUploadProgress(100);
      animateProgress(1);

      setTimeout(() => {
        setUploading(false);
        navigation.navigate("Home", { screen: "Feed", params: { refresh: true } });
      }, 600);
    } catch (e) {
      setUploading(false);
      const msg = e?.response?.data?.message || e?.message || t("error");
      Alert.alert(t("error"), t("failedToPostStory").replace("{message}", msg));
    }
  };

  if (step === "edit") {
    return (
      <Screen3D style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
            <TouchableOpacity onPress={() => { setStep("pick"); setMedia(null); Keyboard.dismiss(); }}>
              <Text style={s.backText}>✕</Text>
            </TouchableOpacity>
            <Text style={s.title}>{t("editStory")}</Text>
            <View style={{ width: 36 }} />
          </View>
          <StoryEditor
            imageUri={mediaType === "image" ? media : null}
            videoUri={mediaType === "video" ? media : null}
            mediaType={mediaType}
            onPost={postStory}
          />
        </KeyboardAvoidingView>

        <Modal visible={uploading} transparent animationType="fade" statusBarTranslucent>
          <View style={s.uploadOverlay}>
            <View style={s.uploadBox}>
              <View style={s.uploadIconWrap}>
                {uploadProgress >= 100 ? (
                  <Text style={s.uploadCheckmark}>✓</Text>
                ) : (
                  <ActivityIndicator size="large" color={COLORS.primary} />
                )}
              </View>
              <Text style={s.uploadPhase}>{uploadPhase}</Text>
              <View style={s.progressTrack}>
                <Animated.View
                  style={[s.progressFill, {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  }]}
                />
              </View>
              <Text style={s.progressText}>{uploadProgress}%</Text>
            </View>
          </View>
        </Modal>
      </Screen3D>
    );
  }

  return (
    <Screen3D style={[s.pickContainer, { paddingTop: insets.top }]}>
      <View style={s.pickHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t("addToStory")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={s.optionsGrid}>
        <TouchableOpacity style={s.optionCard} onPress={capture}>
          <View style={[s.optionIcon, { backgroundColor: COLORS.primary + "20" }]}>
            <Text style={s.optionEmoji}>📷</Text>
          </View>
          <Text style={s.optionLabel}>{t("camera")}</Text>
          <Text style={s.optionDesc}>{t("takePhoto")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.optionCard} onPress={pickImage}>
          <View style={[s.optionIcon, { backgroundColor: COLORS.accent + "20" }]}>
            <Text style={s.optionEmoji}>🖼️</Text>
          </View>
          <Text style={s.optionLabel}>{t("gallery")}</Text>
          <Text style={s.optionDesc}>{t("chooseFromLibrary")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.optionCard} onPress={pickVideo}>
          <View style={[s.optionIcon, { backgroundColor: "#E1705530" }]}>
            <Text style={s.optionEmoji}>🎬</Text>
          </View>
          <Text style={s.optionLabel}>{t("video")}</Text>
          <Text style={s.optionDesc}>{t("max60Seconds")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.optionCard} onPress={() => {
          setMedia(null);
          setMediaType("image");
          setStep("edit");
        }}>
          <View style={[s.optionIcon, { backgroundColor: "#FDCB6E30" }]}>
            <Text style={s.optionEmoji}>✏️</Text>
          </View>
          <Text style={s.optionLabel}>{t("text")}</Text>
          <Text style={s.optionDesc}>{t("textOnlyStory")}</Text>
        </TouchableOpacity>
      </View>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  pickContainer: { flex: 1 },
  pickHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 12 },
  backText: { fontSize: 20, color: COLORS.text, ...FONTS.bold, padding: 8 },
  title: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  optionCard: { width: "47%", backgroundColor: COLORS.card, borderRadius: SIZES.radiusLg, padding: 20, alignItems: "center", aspectRatio: 1 },
  optionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  optionEmoji: { fontSize: 26 },
  optionLabel: { fontSize: SIZES.md, ...FONTS.semiBold, color: COLORS.text, marginBottom: 4 },
  optionDesc: { fontSize: SIZES.xs, color: COLORS.muted, textAlign: "center" },
  uploadOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", alignItems: "center", justifyContent: "center" },
  uploadBox: { backgroundColor: COLORS.card, borderRadius: SIZES.radiusLg, padding: 30, alignItems: "center", gap: 16, width: 260 },
  uploadIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary + "20", alignItems: "center", justifyContent: "center" },
  uploadCheckmark: { fontSize: 32, color: COLORS.success, ...FONTS.bold },
  uploadPhase: { color: COLORS.text, fontSize: SIZES.md, ...FONTS.semiBold },
  progressTrack: { width: "100%", height: 6, borderRadius: 3, backgroundColor: COLORS.input, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3, backgroundColor: COLORS.primary },
  progressText: { color: COLORS.muted, fontSize: SIZES.sm },
});
