import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Animated, Dimensions, StatusBar, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES, FONTS } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

const { width: W, height: H } = Dimensions.get("window");

function FloatingOrb({ size, color, x, y, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] });
  return (
    <Animated.View style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: 0.15, transform: [{ translateY }, { scale }] }} />
  );
}

function Logo3D() {
  const rotateY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(rotateY, { toValue: 360, duration: 8000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -10, duration: 2000, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
    ])).start();
  }, []);
  const rotate = rotateY.interpolate({ inputRange: [0, 360], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={[s.logoContainer, { transform: [{ translateY: floatAnim }] }]}>
      <View style={s.logoShadow} />
      <Animated.View style={[s.logoCard, { transform: [{ perspective: 800 }, { rotateY: rotate }] }]}>
        <View style={s.logoInner}><Text style={s.logoText}>S</Text></View>
      </Animated.View>
    </Animated.View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const { register } = useAuth();
  const insets = useSafeAreaInsets();

  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const inputAnims = {
    username: useRef(new Animated.Value(0)).current,
    email: useRef(new Animated.Value(0)).current,
    password: useRef(new Animated.Value(0)).current,
  };

  useEffect(() => { Animated.spring(cardAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start(); }, []);

  const focusInput = (field) => { setFocusedField(field); Animated.spring(inputAnims[field], { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }).start(); };
  const blurInput = (field) => { setFocusedField(null); Animated.spring(inputAnims[field], { toValue: 0, tension: 40, friction: 7, useNativeDriver: true }).start(); };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) return Alert.alert(t("error"), t("allFieldsRequired"));
    if (password.length < 6) return Alert.alert(t("error"), t("passwordMin"));
    setLoading(true);
    try { await register(username.trim(), email.trim(), password); }
    catch (e) { Alert.alert(t("registerFailed"), e.response?.data?.message || t("failedToRegister")); }
    setLoading(false);
  };

  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const cardRotateX = cardAnim.interpolate({ inputRange: [0, 1], outputRange: ["15deg", "0deg"] });

  const makeInputAnim = (field) => ({
    transform: [{ scale: inputAnims[field].interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
    shadowOpacity: inputAnims[field].interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.4] }),
  });

  return (
    <Screen3D style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={s.bgGradient}>
        <View style={s.bgOrb1} /><View style={s.bgOrb2} /><View style={s.bgOrb3} />
      </View>
      <FloatingOrb size={120} color={COLORS.accent} x={W * 0.1} y={H * 0.1} delay={0} />
      <FloatingOrb size={80} color={COLORS.primary} x={W * 0.75} y={H * 0.2} delay={500} />
      <FloatingOrb size={60} color={COLORS.warning} x={W * 0.5} y={H * 0.05} delay={1000} />
      <FloatingOrb size={100} color={COLORS.accentLight} x={W * 0.85} y={H * 0.55} delay={1500} />

      <KeyboardAvoidingView style={[s.inner, { paddingTop: insets.top + 10 }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} showsVerticalScrollIndicator={false}>
          <View style={s.topSection}>
            <Logo3D />
            <Text style={s.appName}>{t("sonix")}</Text>
            <Text style={s.tagline}>{t("appSlogan")}</Text>
          </View>

          <Animated.View style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { perspective: 1000 }, { rotateX: cardRotateX }] }]}>
            <View style={s.cardGlow} />

            <Animated.View style={[s.inputWrap, focusedField === "username" && s.inputWrapActive, makeInputAnim("username")]}>
              <View style={[s.inputIconWrap, focusedField === "username" && s.inputIconActive]}><Text style={s.inputIcon}>👤</Text></View>
              <TextInput style={s.input} placeholder={t("username")} placeholderTextColor={COLORS.muted} value={username} onChangeText={setUsername} onFocus={() => focusInput("username")} onBlur={() => blurInput("username")} autoCapitalize="none" />
            </Animated.View>

            <Animated.View style={[s.inputWrap, focusedField === "email" && s.inputWrapActive, makeInputAnim("email")]}>
              <View style={[s.inputIconWrap, focusedField === "email" && s.inputIconActive]}><Text style={s.inputIcon}>✉️</Text></View>
              <TextInput style={s.input} placeholder={t("email")} placeholderTextColor={COLORS.muted} value={email} onChangeText={setEmail} onFocus={() => focusInput("email")} onBlur={() => blurInput("email")} autoCapitalize="none" keyboardType="email-address" />
            </Animated.View>

            <Animated.View style={[s.inputWrap, focusedField === "password" && s.inputWrapActive, makeInputAnim("password")]}>
              <View style={[s.inputIconWrap, focusedField === "password" && s.inputIconActive]}><Text style={s.inputIcon}>🔒</Text></View>
              <TextInput style={s.input} placeholder={t("password")} placeholderTextColor={COLORS.muted} value={password} onChangeText={setPassword} onFocus={() => focusInput("password")} onBlur={() => blurInput("password")} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={s.eyeBtn}><Text style={s.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text></TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleRegister}
                onPressIn={() => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(btnScale, { toValue: 1, tension: 50, friction: 3, useNativeDriver: true }).start()}
                disabled={loading}
                activeOpacity={0.9}
              >
                <View style={s.btnGlow} />
                <Text style={s.btnText}>{loading ? t("creatingAccount") : t("register")}</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <View style={s.divider}>
            <View style={s.dividerLine} /><View style={s.dividerDot} /><View style={s.dividerLine} />
          </View>

          <TouchableOpacity style={s.loginCard} onPress={() => navigation.navigate("Login")} activeOpacity={0.8}>
            <Text style={s.loginText}>{t("hasAccount")} <Text style={s.loginBold}>{t("signIn")}</Text></Text>
          </TouchableOpacity>

          <Text style={s.version}>{t("appVersion")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d1a" },
  bgGradient: { ...StyleSheet.absoluteFillObject },
  bgOrb1: { position: "absolute", width: 350, height: 350, borderRadius: 175, backgroundColor: COLORS.primary, opacity: 0.04, top: -100, right: -80 },
  bgOrb2: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.accent, opacity: 0.03, top: H * 0.3, left: -120 },
  bgOrb3: { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: COLORS.celestial, opacity: 0.02, bottom: H * 0.1, right: W * 0.15 },

  inner: { flex: 1, paddingHorizontal: 24 },
  topSection: { alignItems: "center", marginBottom: 30 },

  logoContainer: { alignItems: "center", marginBottom: 14, width: 90, height: 90 },
  logoShadow: { position: "absolute", bottom: -8, width: 70, height: 12, borderRadius: 6, backgroundColor: COLORS.accent, opacity: 0.25 },
  logoCard: { width: 80, height: 80, borderRadius: 24, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  logoInner: { width: 72, height: 72, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(212,165,116,0.2)" },
  logoText: { color: COLORS.accentLight, fontSize: 36, ...FONTS.black },
  appName: { fontSize: 34, ...FONTS.black, color: COLORS.text, letterSpacing: -1 },
  tagline: { fontSize: SIZES.sm, color: COLORS.muted, marginTop: 4 },

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

  btn: { height: 54, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginTop: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10, overflow: "hidden" },
  btnGlow: { position: "absolute", top: 0, left: 0, right: 0, height: "50%", backgroundColor: "rgba(255,255,255,0.08)", borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: SIZES.lg, ...FONTS.bold, letterSpacing: 0.5 },

  divider: { flexDirection: "row", alignItems: "center", marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.muted },

  loginCard: { backgroundColor: "rgba(26,26,46,0.4)", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  loginText: { color: COLORS.textSecondary, fontSize: SIZES.md },
  loginBold: { color: COLORS.accent, ...FONTS.bold },

  version: { color: COLORS.muted, fontSize: SIZES.xs, textAlign: "center", paddingBottom: 20, marginTop: 20 },
});
