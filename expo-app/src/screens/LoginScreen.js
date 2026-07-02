import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Animated, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import VideoBackground from "../components/VideoBackground";

function Logo3D() {
  const rotateY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(rotateY, { toValue: 360, duration: 8000, useNativeDriver: true })).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[s.logoContainer, { transform: [{ translateY: floatAnim }] }]}>
      <View style={s.logoShadow} />
      <Animated.View style={[s.logoCard, { transform: [{ perspective: 800 }, { rotateY: rotateY.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] }) }] }]}>
        <View style={s.logoInner}><Text style={s.logoText}>S</Text></View>
      </Animated.View>
    </Animated.View>
  );
}

export default function LoginScreen({ navigation }) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const inputAnims = { email: useRef(new Animated.Value(0)).current, password: useRef(new Animated.Value(0)).current };

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
  }, []);

  const focusInput = (field) => { setFocusedField(field); Animated.spring(inputAnims[field], { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start(); };
  const blurInput = (field) => { setFocusedField(null); Animated.spring(inputAnims[field], { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }).start(); };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return Alert.alert(t("error"), t("allFieldsRequired"));
    setLoading(true);
    try { await login(email.trim(), password); }
    catch (e) { Alert.alert(t("loginFailed"), e.response?.data?.message || t("invalidCredentials")); }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <VideoBackground />
      <View style={s.overlay} />

      <KeyboardAvoidingView style={[s.inner, { paddingTop: insets.top + 20 }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={s.topSection}>
          <Logo3D />
          <Text style={s.appName}>{t("sonix")}</Text>
          <Text style={s.tagline}>{t("appSlogan")}</Text>
        </View>

        <Animated.View style={[s.card, { opacity: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }, { perspective: 1000 }, { rotateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: ["10deg", "0deg"] }) }] }]}>
          <View style={s.cardGlow} />

          <Animated.View style={[s.inputWrap, focusedField === "email" && s.inputWrapActive, { transform: [{ scale: inputAnims.email.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }], shadowOpacity: inputAnims.email.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }) }]}>
            <View style={[s.inputIconWrap, focusedField === "email" && s.inputIconActive]}><Text style={s.inputIcon}>✉️</Text></View>
            <TextInput style={s.input} placeholder={t("email")} placeholderTextColor={COLORS.muted} value={email} onChangeText={setEmail} onFocus={() => focusInput("email")} onBlur={() => blurInput("email")} autoCapitalize="none" keyboardType="email-address" textAlign="right" />
          </Animated.View>

          <Animated.View style={[s.inputWrap, focusedField === "password" && s.inputWrapActive, { transform: [{ scale: inputAnims.password.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }], shadowOpacity: inputAnims.password.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }) }]}>
            <View style={[s.inputIconWrap, focusedField === "password" && s.inputIconActive]}><Text style={s.inputIcon}>🔒</Text></View>
            <TextInput style={s.input} placeholder={t("password")} placeholderTextColor={COLORS.muted} value={password} onChangeText={setPassword} onFocus={() => focusInput("password")} onBlur={() => blurInput("password")} secureTextEntry={!showPassword} textAlign="right" />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}><Text style={s.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text></TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={s.forgotBtn}>
            <Text style={s.forgotText}>{t("forgotPassword")}</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, tension: 50, friction: 3, useNativeDriver: true }).start()}
              disabled={loading} activeOpacity={0.9}
            >
              <View style={s.btnGlow} />
              <Text style={s.btnText}>{loading ? t("loggingIn") : t("login")}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        <View style={s.divider}>
          <View style={s.dividerLine} /><View style={s.dividerDot} /><View style={s.dividerLine} />
        </View>

        <TouchableOpacity style={s.signupCard} onPress={() => navigation.navigate("Register")} activeOpacity={0.8}>
          <Text style={s.signupText}>{t("noAccount")} <Text style={s.signupBold}>{t("register")}</Text></Text>
        </TouchableOpacity>

        <Text style={s.version}>{t("appVersion")}</Text>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d1a" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(13,13,26,0.35)", zIndex: 3, pointerEvents: "none" },
  inner: { flex: 1, paddingHorizontal: 24, zIndex: 4 },
  topSection: { alignItems: "center", marginBottom: 32 },

  logoContainer: { alignItems: "center", marginBottom: 14, width: 90, height: 90 },
  logoShadow: { position: "absolute", bottom: -8, width: 70, height: 12, borderRadius: 6, backgroundColor: COLORS.accent, opacity: 0.25 },
  logoCard: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  logoInner: { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(212,165,116,0.2)" },
  logoText: { color: COLORS.accentLight, fontSize: 36, ...FONTS.black },

  appName: { fontSize: 34, ...FONTS.black, color: "#fff", letterSpacing: -1 },
  tagline: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 4 },

  card: { backgroundColor: "rgba(26,26,46,0.55)", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(124,108,247,0.1)", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 30, elevation: 20, overflow: "hidden" },
  cardGlow: { position: "absolute", top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.primary, opacity: 0.06 },

  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.input, borderRadius: 16, paddingHorizontal: 14, height: 54, gap: 10, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 14, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 5 },
  inputWrapActive: { borderColor: COLORS.primary, backgroundColor: "rgba(26,26,46,0.9)" },
  inputIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(124,108,247,0.1)", alignItems: "center", justifyContent: "center" },
  inputIconActive: { backgroundColor: "rgba(124,108,247,0.2)" },
  inputIcon: { fontSize: 15 },
  input: { flex: 1, color: COLORS.text, fontSize: SIZES.md, ...FONTS.medium },
  eyeBtn: { padding: 6 },
  eyeIcon: { fontSize: 16 },

  forgotBtn: { alignItems: "flex-start", marginBottom: 16, marginTop: 2 },
  forgotText: { color: COLORS.accent, fontSize: SIZES.sm, ...FONTS.medium },

  btn: { height: 54, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10, overflow: "hidden" },
  btnGlow: { position: "absolute", top: 0, left: 0, right: 0, height: "50%", backgroundColor: "rgba(255,255,255,0.08)", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: SIZES.lg, ...FONTS.bold, letterSpacing: 0.5 },

  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.muted },

  signupCard: { backgroundColor: "rgba(26,26,46,0.4)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  signupText: { color: COLORS.textSecondary, fontSize: SIZES.md },
  signupBold: { color: COLORS.accent, ...FONTS.bold },

  version: { color: COLORS.muted, fontSize: SIZES.xs, textAlign: "center", paddingBottom: 20, marginTop: "auto" },
});
