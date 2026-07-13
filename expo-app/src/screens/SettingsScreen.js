import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { lang, changeLanguage, t, isRTL, rtlRow } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [loading, setLoading] = useState("");
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(null);
  const [notifLoading, setNotifLoading] = useState(false);

  const changePasswordFn = async () => {
    if (!currentPassword || !newPassword) return Alert.alert(t("error"), t("fillAllFields"));
    if (newPassword.length < 6) return Alert.alert(t("error"), t("passwordMinError"));
    setLoading("password");
    try {
      await client.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      Alert.alert(t("success"), t("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setShowChangePassword(false);
    } catch (e) {
      Alert.alert(t("error"), e?.response?.data?.message || t("failedToChangePassword"));
    }
    setLoading("");
  };

  const togglePrivacy = async () => {
    setPrivacyLoading(true);
    try {
      const res = await client.post("/users/toggle-privacy");
      setIsPrivate(res.data.is_private);
      Alert.alert(t("success"), res.data.message);
    } catch (e) {
      Alert.alert(t("error"), t("failedToTogglePrivacy"));
    }
    setPrivacyLoading(false);
  };

  const deleteAccount = () => {
    if (!deletePassword) return Alert.alert(t("error"), t("deleteAccountConfirm"));
    Alert.alert(t("deleteAccount"), t("deleteConfirmText"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: async () => {
        setLoading("delete");
        try {
          await client.delete("/auth/account", { data: { password: deletePassword } });
          logout();
        } catch (e) {
          Alert.alert(t("error"), e?.response?.data?.message || t("failedToDeleteAccount"));
        }
        setLoading("");
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert(t("logout"), t("logoutConfirm"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: logout },
    ]);
  };

  const handleLanguage = (newLang) => {
    changeLanguage(newLang);
    setShowLanguage(false);
    Alert.alert(t("success"), t("languageChanged"));
  };

  const loadNotifPrefs = useCallback(async () => {
    try {
      const res = await client.get("/notifications/preferences");
      setNotifPrefs(res.data);
    } catch {}
  }, []);

  const toggleNotif = useCallback(async (key) => {
    if (!notifPrefs) return;
    setNotifLoading(true);
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    try {
      await client.put("/notifications/preferences", next);
      setNotifPrefs(next);
    } catch {
      Alert.alert(t("error"), t("failedToSave"));
    }
    setNotifLoading(false);
  }, [notifPrefs, t]);

  useEffect(() => {
    client.get("/users/me").then((res) => {
      if (res.data?.is_private !== undefined) setIsPrivate(res.data.is_private);
    }).catch(() => {});
    loadNotifPrefs();
  }, [loadNotifPrefs]);

  return (
    <Screen3D style={[s.wrap, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.backBtn}>←</Text></TouchableOpacity>
        <Text style={s.title}>{t("settings")}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* LANGUAGE */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("language").toUpperCase()}</Text>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => setShowLanguage(!showLanguage)}>
            <Text style={s.rowIcon}>🌐</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("language")}</Text>
              <Text style={s.rowHint}>{t("languageDesc")}</Text>
            </View>
            <Text style={s.langCurrent}>{lang === "ar" ? t("arabic") : t("english")}</Text>
            <Text style={s.rowArrow}>{showLanguage ? "⌄" : "›"}</Text>
          </TouchableOpacity>

          {showLanguage && (
            <View style={s.expandSection}>
              <TouchableOpacity
                style={[s.langOption, lang === "ar" && s.langActive]}
                onPress={() => handleLanguage("ar")}
              >
                <Text style={[s.langText, lang === "ar" && s.langTextActive]}>{t("arabic")}</Text>
                {lang === "ar" && <Text style={s.checkMark}>✓</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.langOption, lang === "en" && s.langActive]}
                onPress={() => handleLanguage("en")}
              >
                <Text style={[s.langText, lang === "en" && s.langTextActive]}>{t("english")}</Text>
                {lang === "en" && <Text style={s.checkMark}>✓</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ACCOUNT */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("account").toUpperCase()}</Text>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("EditProfile")}>
            <Text style={s.rowIcon}>👤</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("editProfile")}</Text>
              <Text style={s.rowHint}>{t("usernameBioAvatar")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => setShowChangePassword(!showChangePassword)}>
            <Text style={s.rowIcon}>🔒</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("changePassword")}</Text>
              <Text style={s.rowHint}>{t("updatePasswordDesc")}</Text>
            </View>
            <Text style={s.rowArrow}>{showChangePassword ? "⌄" : "›"}</Text>
          </TouchableOpacity>

          {showChangePassword && (
            <View style={s.expandSection}>
              <TextInput style={s.input} placeholder={t("currentPassword")} placeholderTextColor={COLORS.muted} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
              <TextInput style={s.input} placeholder={t("newPassword")} placeholderTextColor={COLORS.muted} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
              <TouchableOpacity onPress={changePasswordFn} disabled={loading === "password"} style={s.btn}>
                {loading === "password" ? <ActivityIndicator color={COLORS.text} /> : <Text style={s.btnText}>{t("savePassword")}</Text>}
              </TouchableOpacity>
            </View>
          )}

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>🔐</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("privateAccount")}</Text>
              <Text style={s.rowHint}>{isPrivate ? t("privateAccountHint") : t("publicAccountHint")}</Text>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={togglePrivacy}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
              disabled={privacyLoading}
            />
          </View>
        </View>

        {/* NOTIFICATIONS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("notificationsSection").toUpperCase()}</Text>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>🔔</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("pushNotifications")}</Text>
              <Text style={s.rowHint}>{t("pushNotificationsHint")}</Text>
            </View>
            <Switch
              value={notifPrefs?.push_enabled ?? true}
              onValueChange={() => toggleNotif("push_enabled")}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
              disabled={notifLoading}
            />
          </View>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>✉️</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("emailNotifications")}</Text>
              <Text style={s.rowHint}>{t("emailNotificationsHint")}</Text>
            </View>
            <Switch
              value={notifPrefs?.email_enabled ?? false}
              onValueChange={() => toggleNotif("email_enabled")}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
              disabled={notifLoading}
            />
          </View>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>❤️</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("likeNotifications")}</Text>
              <Text style={s.rowHint}>{t("likeNotificationsHint")}</Text>
            </View>
            <Switch
              value={notifPrefs?.like_notifications ?? true}
              onValueChange={() => toggleNotif("like_notifications")}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
              disabled={notifLoading}
            />
          </View>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>💬</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("commentNotifications")}</Text>
              <Text style={s.rowHint}>{t("commentNotificationsHint")}</Text>
            </View>
            <Switch
              value={notifPrefs?.comment_notifications ?? true}
              onValueChange={() => toggleNotif("comment_notifications")}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
              disabled={notifLoading}
            />
          </View>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>👥</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("followNotifications")}</Text>
              <Text style={s.rowHint}>{t("followNotificationsHint")}</Text>
            </View>
            <Switch
              value={notifPrefs?.follow_notifications ?? true}
              onValueChange={() => toggleNotif("follow_notifications")}
              trackColor={{ false: COLORS.input, true: COLORS.accept }}
              thumbColor={COLORS.text}
              disabled={notifLoading}
            />
          </View>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>📩</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("messageNotifications")}</Text>
              <Text style={s.rowHint}>{t("messageNotificationsHint")}</Text>
            </View>
            <Switch
              value={notifPrefs?.message_notifications ?? true}
              onValueChange={() => toggleNotif("message_notifications")}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
              disabled={notifLoading}
            />
          </View>
        </View>

        {/* CONTENT */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("content").toUpperCase()}</Text>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("SavedPosts")}>
            <Text style={s.rowIcon}>🔖</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("savedPostsBtn")}</Text>
              <Text style={s.rowHint}>{t("savedPostsHint")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("BlockedUsers")}>
            <Text style={s.rowIcon}>📌</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("blockedUsers")}</Text>
              <Text style={s.rowHint}>{t("blockedUsersHint")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <View style={[s.row, isRTL && s.rowRtl]}>
            <Text style={s.rowIcon}>🕐</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("activityStatus")}</Text>
              <Text style={s.rowHint}>{t("activityStatusHint")}</Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: COLORS.input, true: COLORS.accent }}
              thumbColor={COLORS.text}
            />
          </View>
        </View>

        {/* SUPPORT */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("support").toUpperCase()}</Text>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("HelpCenter")}>
            <Text style={s.rowIcon}>❓</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("helpCenter")}</Text>
              <Text style={s.rowHint}>{t("helpCenterHint")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("ReportProblem")}>
            <Text style={s.rowIcon}>⚠️</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("reportProblem")}</Text>
              <Text style={s.rowHint}>{t("reportProblemHint")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("Terms")}>
            <Text style={s.rowIcon}>📋</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("termsOfService")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => navigation.navigate("Privacy")}>
            <Text style={s.rowIcon}>🛡️</Text>
            <View style={s.rowContent}>
              <Text style={s.rowLabel}>{t("privacyPolicy")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ABOUT */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("about").toUpperCase()}</Text>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>{t("version")}</Text>
            <Text style={s.aboutValue}>1.0.0</Text>
          </View>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>{t("build")}</Text>
            <Text style={s.aboutValue}>2026.06.23</Text>
          </View>
          <View style={s.aboutRow}>
            <Text style={s.aboutLabel}>{t("platform")}</Text>
            <Text style={s.aboutValue}>React Native + Laravel</Text>
          </View>
        </View>

        {/* DANGER ZONE */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: COLORS.danger }]}>{t("dangerZone").toUpperCase()}</Text>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={handleLogout}>
            <Text style={s.rowIcon}>🚪</Text>
            <View style={s.rowContent}>
              <Text style={[s.rowLabel, { color: COLORS.warning }]}>{t("logout")}</Text>
              <Text style={s.rowHint}>{t("logoutHint")}</Text>
            </View>
            <Text style={s.rowArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[s.row, isRTL && s.rowRtl]} onPress={() => setShowDeleteAccount(!showDeleteAccount)}>
            <Text style={s.rowIcon}>🗑️</Text>
            <View style={s.rowContent}>
              <Text style={[s.rowLabel, { color: COLORS.danger }]}>{t("deleteAccount")}</Text>
              <Text style={s.rowHint}>{t("deleteAccountHint")}</Text>
            </View>
            <Text style={s.rowArrow}>{showDeleteAccount ? "⌄" : "›"}</Text>
          </TouchableOpacity>

          {showDeleteAccount && (
            <View style={s.expandSection}>
              <Text style={s.deleteWarning}>{t("deleteAccountWarning")}</Text>
              <TextInput style={s.input} placeholder={t("deleteAccountConfirm")} placeholderTextColor={COLORS.muted} secureTextEntry value={deletePassword} onChangeText={setDeletePassword} />
              <TouchableOpacity onPress={deleteAccount} disabled={loading === "delete"} style={[s.btn, { backgroundColor: COLORS.danger }]}>
                {loading === "delete" ? <ActivityIndicator color={COLORS.text} /> : <Text style={s.btnText}>{t("deletePermanently")}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  backBtn: { fontSize: 22, color: COLORS.text },
  title: { fontSize: SIZES.lg, ...FONTS.semiBold, color: COLORS.text },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 13, ...FONTS.bold, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, gap: 12 },
  rowRtl: { flexDirection: "row-reverse" },
  rowIcon: { fontSize: 20, width: 30, textAlign: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: SIZES.lg, ...FONTS.medium, color: COLORS.text },
  rowHint: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  rowArrow: { fontSize: 18, color: COLORS.muted },
  expandSection: { backgroundColor: COLORS.card, borderRadius: SIZES.radius, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  input: { backgroundColor: COLORS.input, borderRadius: SIZES.radius, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
  btn: { backgroundColor: COLORS.accent, borderRadius: SIZES.radius, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  btnText: { color: COLORS.text, ...FONTS.semiBold, fontSize: 14 },
  aboutRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  aboutLabel: { fontSize: 14, color: COLORS.muted },
  aboutValue: { fontSize: 14, color: COLORS.text },
  deleteWarning: { color: COLORS.danger, fontSize: 12, marginBottom: 10, lineHeight: 16 },
  langCurrent: { fontSize: 13, color: COLORS.accent, ...FONTS.medium },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, borderRadius: SIZES.radius, marginBottom: 4 },
  langActive: { backgroundColor: COLORS.accent + "20" },
  langText: { fontSize: 16, color: COLORS.text },
  langTextActive: { color: COLORS.accent, ...FONTS.semiBold },
  checkMark: { fontSize: 18, color: COLORS.accent, ...FONTS.bold },
});
