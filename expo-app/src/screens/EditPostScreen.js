import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function EditPostScreen({ route, navigation }) {
  const { t } = useLanguage();
  const { postId, initialContent } = route.params;
  const [content, setContent] = useState(initialContent || "");
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const save = async () => {
    if (!content.trim()) return Alert.alert(t("error"), t("contentEmpty"));
    setLoading(true);
    try {
      await client.put(`/posts/${postId}`, { content: content.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert(t("error"), t("failedToUpdatePost"));
    }
    setLoading(false);
  };

  return (
    <Screen3D>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.cancelBtn}>{t("cancel")}</Text></TouchableOpacity>
        <Text style={s.title}>{t("editPost")}</Text>
        <TouchableOpacity onPress={save} disabled={loading || !content.trim()} style={[s.saveBtn, (!content.trim()) && { opacity: 0.5 }]}>
          {loading ? <ActivityIndicator color={COLORS.text} size="small" /> : <Text style={s.saveText}>{t("save")}</Text>}
        </TouchableOpacity>
      </View>
      <TextInput
        style={s.input}
        value={content}
        onChangeText={setContent}
        placeholder={t("editPostPlaceholder")}
        placeholderTextColor={COLORS.muted}
        multiline
        maxLength={5000}
      />
    </Screen3D>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  cancelBtn: { color: COLORS.muted, fontSize: SIZES.lg },
  title: { fontSize: SIZES.lg, fontWeight: "600", color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  saveText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  input: { flex: 1, color: COLORS.text, fontSize: 15, paddingHorizontal: 16, paddingTop: 16, textAlignVertical: "top" },
});
