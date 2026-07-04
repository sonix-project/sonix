import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Screen3D from "../components/3D/Screen3D";
import * as ImagePicker from "expo-image-picker";
import client, { IMAGE_BASE } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES, FONTS } from "../components/Theme";

export default function EditProfileScreen({ navigation }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, updateUser } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    client.get("/users/me").then((res) => {
      setUsername(res.data.username || "");
      setBio(res.data.bio || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) setAvatar(result.assets[0].uri);
  };

  const save = async () => {
    if (!username.trim()) return Alert.alert(t("error"), t("usernameRequired"));
    setSaving(true);
    try {
      const form = new FormData();
      form.append("username", username.trim());
      form.append("bio", bio.trim());
      if (avatar) form.append("avatar", { uri: avatar, name: "avatar.jpg", type: "image/jpeg" });
      const res = await client.post("/users/profile", form, { headers: { "Content-Type": "multipart/form-data" } });
      const userData = { ...res.data };
      if (userData.avatar) userData.avatar = userData.avatar + "?t=" + Date.now();
      await updateUser(userData);
      Alert.alert(t("done"), t("profileUpdated"));
      navigation.goBack();
    } catch (e) {
      Alert.alert(t("error"), e.response?.data?.message || t("failedToUpdate"));
    }
    setSaving(false);
  };

  return (
    <Screen3D style={s.container}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.topBtn}>{t("cancel")}</Text></TouchableOpacity>
        <Text style={s.title}>{t("editProfile")}</Text>
        <TouchableOpacity style={[s.saveBtn, (!username.trim() || saving) && s.saveBtnDisabled]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color={COLORS.text} size="small" /> : <Text style={s.saveText}>{t("done")}</Text>}
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={COLORS.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          <TouchableOpacity style={s.avatarWrap} onPress={pickAvatar}>
            <View style={s.avatar}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={s.avatarImg} />
              ) : (
                <Text style={s.avatarLetter}>{username?.[0]?.toUpperCase() || "?"}</Text>
              )}
            </View>
            <Text style={s.changePhoto}>{t("changePhoto")}</Text>
          </TouchableOpacity>

          <Text style={s.label}>{t("username")}</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder={t("username")} placeholderTextColor={COLORS.muted} autoCapitalize="none" />

          <Text style={s.label}>{t("bio")}</Text>
          <TextInput style={[s.input, s.bioInput]} value={bio} onChangeText={setBio} placeholder={t("bio")} placeholderTextColor={COLORS.muted} multiline maxLength={150} textAlignVertical="top" />
          <Text style={s.count}>{bio.length}/150</Text>
        </ScrollView>
      )}
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingBottom: 10, paddingHorizontal: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topBtn: { fontSize: SIZES.lg, color: COLORS.accent },
  title: { fontSize: SIZES.md, ...FONTS.semiBold, color: COLORS.text },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: 14, paddingVertical: 6 },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: COLORS.text, ...FONTS.semiBold, fontSize: 14 },
  scroll: { padding: 16, alignItems: "center" },
  avatarWrap: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center", marginBottom: 8, overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  avatarLetter: { color: COLORS.text, fontSize: 32, ...FONTS.semiBold },
  changePhoto: { color: COLORS.accent, fontSize: SIZES.md, ...FONTS.semiBold },
  label: { fontSize: 13, color: COLORS.textSecondary, alignSelf: "flex-start", marginBottom: 6, ...FONTS.semiBold },
  input: { backgroundColor: COLORS.input, borderRadius: SIZES.radius, paddingHorizontal: 14, height: 44, fontSize: 15, color: COLORS.text, alignSelf: "stretch", marginBottom: 16 },
  bioInput: { height: 80, paddingTop: 12 },
  count: { fontSize: 11, color: COLORS.muted, alignSelf: "flex-end", marginTop: -10, marginBottom: 16 },
});
