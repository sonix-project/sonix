import { useRef, useEffect, useMemo } from "react";
import { View, Animated, Dimensions, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../Theme";

const { width: W, height: H } = Dimensions.get("window");

/* ───── Geometric Diamond ───── */
function Diamond({ size, color, top, left, rotate = "0deg", opacity = 1, anim }) {
  const base = <View style={{ position: "absolute", top, left, width: size, height: size, borderRadius: size * 0.08, backgroundColor: color, opacity, transform: [{ rotate }, { perspective: 800 }] }} />;
  if (!anim) return base;
  return <Animated.View style={{ position: "absolute", top, left, width: size, height: size, borderRadius: size * 0.08, backgroundColor: color, opacity: anim?.op || opacity, transform: [...(anim?.t || []), { rotate }, { perspective: 800 }] }} />;
}

/* ───── Sunburst — multiple diamonds radiating from a point ───── */
function Sunburst({ cx, cy, count = 12, baseSize = 60, color, speed = 1, delay = 0 }) {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 8000 / speed;
    Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(r, { toValue: 1, duration: dur, useNativeDriver: true }), Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: true })])).start();
  }, []);
  return useMemo(() => Array.from({ length: count }).map((_, i) => {
    const angle = (i * 360 / count);
    const dist = baseSize * 1.2;
    const x = Math.cos(angle * Math.PI / 180) * dist;
    const y = Math.sin(angle * Math.PI / 180) * dist;
    return (
      <Animated.View key={i} style={{ position: "absolute", left: cx + x - 1.5, top: cy + y - 1.5, width: 3, height: baseSize * 0.5, backgroundColor: color, borderRadius: 1.5, opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.015, 0.07] }), transform: [{ rotate: `${angle}deg` }, { translateY: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -baseSize * 0.3, 0] }) }, { scaleY: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] }) }] }} />
    );
  }), []);
}

/* ───── Large Geometric Mandala (rotating star pattern) ───── */
function Mandala() {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(r1, { toValue: 1, duration: 25000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(r2, { toValue: 1, duration: 18000, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(r3, { toValue: 1, duration: 12000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 4000, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 4000, useNativeDriver: true })])).start();
  }, []);
  const s = Math.min(W, H) * 0.75;
  return (
    <View style={{ position: "absolute", top: H / 2 - s / 2, left: W / 2 - s / 2, width: s, height: s, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ position: "absolute", width: s, height: s, borderRadius: s / 2, borderWidth: 0.5, borderColor: COLORS.accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.08] }), transform: [{ rotate: r1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }} />
      <Animated.View style={{ position: "absolute", width: s * 0.8, height: s * 0.8, borderRadius: s * 0.05, borderWidth: 0.5, borderColor: COLORS.accentLight, opacity: 0.05, transform: [{ rotate: r2.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] }) }] }} />
      <Animated.View style={{ position: "absolute", width: s * 0.55, height: s * 0.55, borderRadius: s * 0.025, borderWidth: 0.5, borderColor: COLORS.accentDark, opacity: 0.06, transform: [{ rotate: r3.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] }) }] }} />
      <Animated.View style={{ position: "absolute", width: s * 0.35, height: s * 0.35, borderRadius: s * 0.35, borderWidth: 1, borderColor: "COLORS.accentLight", opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.07] }), transform: [{ rotate: r1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-180deg"] }) }] }} />
      {/* Inner star - crossed diamonds */}
      <Animated.View style={{ position: "absolute", width: s * 0.25, height: s * 0.25, backgroundColor: COLORS.accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.015, 0.04] }), transform: [{ rotate: `${45}deg` }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.1] }) }] }} />
      <Animated.View style={{ position: "absolute", width: s * 0.18, height: s * 0.18, backgroundColor: COLORS.accentLight, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.05] }), transform: [{ rotate: `${45}deg` }] }} />
    </View>
  );
}

/* ───── Constellation — stars connected by golden lines ───── */
const CONSTELLATIONS = [
  [{ x: 0.12, y: 0.15 }, { x: 0.18, y: 0.08 }, { x: 0.25, y: 0.12 }, { x: 0.22, y: 0.2 }, { x: 0.15, y: 0.22 }],
  [{ x: 0.78, y: 0.55 }, { x: 0.85, y: 0.48 }, { x: 0.88, y: 0.58 }, { x: 0.82, y: 0.65 }, { x: 0.75, y: 0.6 }],
  [{ x: 0.6, y: 0.82 }, { x: 0.68, y: 0.78 }, { x: 0.72, y: 0.85 }, { x: 0.65, y: 0.9 }],
  [{ x: 0.35, y: 0.45 }, { x: 0.42, y: 0.38 }, { x: 0.48, y: 0.44 }, { x: 0.44, y: 0.52 }, { x: 0.36, y: 0.52 }],
  [{ x: 0.05, y: 0.75 }, { x: 0.1, y: 0.68 }, { x: 0.16, y: 0.72 }, { x: 0.12, y: 0.8 }],
  [{ x: 0.88, y: 0.15 }, { x: 0.92, y: 0.1 }, { x: 0.95, y: 0.18 }, { x: 0.9, y: 0.22 }],
];

function ConstellationLine({ from, to, color, anim }) {
  const dx = to.x * W - from.x * W;
  const dy = to.y * H - from.y * H;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return (
    <Animated.View style={{ position: "absolute", left: from.x * W, top: from.y * H, width: len, height: 0.5, backgroundColor: color, opacity: anim || 0.04, transform: [{ rotate: `${angle}deg` }] }} />
  );
}

function Constellation({ group, delayBase }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.delay(delayBase * 1000), Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }), Animated.delay(5000), Animated.timing(anim, { toValue: 0, duration: 3000, useNativeDriver: true })])).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.02, 0.08] });
  const starOpacity = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.04, 0.2, 0.15, 0.04] });
  return (
    <View style={{ position: "absolute", inset: 0 }}>
      {group.map((p, i) => i > 0 && <ConstellationLine key={`l${i}`} from={group[i - 1]} to={group[i]} color={COLORS.accentLight} anim={opacity} />)}
      {group.map((p, i) => (
        <Animated.View key={`s${i}`} style={{ position: "absolute", left: p.x * W - 2, top: p.y * H - 2, width: 4 + (i === 0 ? 3 : 0), height: 4 + (i === 0 ? 3 : 0), borderRadius: (4 + (i === 0 ? 3 : 0)) / 2, backgroundColor: i === 0 ? COLORS.accentLight : COLORS.accent, opacity: starOpacity, transform: [{ scale: anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: i === 0 ? [0.5, 1.5, 0.5] : [0.3, 1, 0.3] }) }] }} />
      ))}
    </View>
  );
}

/* ───── Golden Crown Geometry ───── */
function GoldenCrown() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 3000, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 3000, useNativeDriver: true })])).start();
  }, []);
  const cw = W * 0.5;
  const ch = cw * 0.4;
  const cx = W / 2;
  const cy = H * 0.02;
  const op = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.07] });
  return (
    <View style={{ position: "absolute", left: cx - cw / 2, top: cy, width: cw, height: ch, alignItems: "center" }}>
      {/* Crown base line */}
      <Animated.View style={{ position: "absolute", bottom: 0, width: cw, height: 0.5, backgroundColor: COLORS.accent, opacity: op }} />
      {/* Crown peaks */}
      {[0, 1, 2, 3, 4].map(i => {
        const px = (i / 4) * cw;
        const ph = ch * (i === 2 ? 0.8 : i % 2 === 0 ? 0.5 : 0.35);
        return <Animated.View key={i} style={{ position: "absolute", left: px, bottom: 0, width: 1.5, height: ph, backgroundColor: COLORS.accentLight, opacity: op, transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }] }} />;
      })}
      {/* Crown arc connecting peaks */}
      {[0, 1, 2, 3].map(i => <Animated.View key={`a${i}`} style={{ position: "absolute", left: (i / 4) * cw + 1, bottom: ch * 0.3, width: cw / 4 - 2, height: 0.5, backgroundColor: COLORS.accent, opacity: op, transform: [{ rotate: `${(i - 1.5) * 8}deg` }] }} />)}
      {/* Center gem */}
      <Animated.View style={{ position: "absolute", top: ch * 0.15, left: cw / 2 - 5, width: 10, height: 10, backgroundColor: COLORS.primary, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.08] }), transform: [{ rotate: "45deg" }, { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }] }} />
    </View>
  );
}

/* ───── Diamond Rain ───── */
function FallingDiamond() {
  const anim = useRef(new Animated.Value(0)).current;
  const x = 5 + Math.random() * 90;
  const s = 4 + Math.random() * 8;
  const delay = Math.random() * 15000;
  const drift = (Math.random() - 0.5) * 60;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(anim, { toValue: 1, duration: 6000 + Math.random() * 4000, useNativeDriver: true }), Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true })])).start();
  }, []);
  return (
    <Animated.View style={{ position: "absolute", left: x + "%", top: "-5%", width: s, height: s, backgroundColor: Math.random() > 0.5 ? COLORS.accent : COLORS.accentLight, opacity: anim.interpolate({ inputRange: [0, 0.05, 0.95, 1], outputRange: [0, 0.06, 0.04, 0] }), transform: [{ rotate: "45deg" }, { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, H + 50] }) }, { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.2] }) }] }} />
  );
}

/* ───── Light Spears — thin triangles from edges ───── */
function LightSpear({ width, height, color, top, left, rotate, delay = 0 }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(anim, { toValue: 1, duration: 5000, useNativeDriver: true }), Animated.timing(anim, { toValue: 0, duration: 5000, useNativeDriver: true })])).start();
  }, []);
  return (
    <Animated.View style={{ position: "absolute", top, left, width, height: 1, backgroundColor: color, opacity: anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.005, 0.04, 0.03, 0.005] }), transform: [{ rotate }, { scaleY: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 8] }) }] }} />
  );
}

/* ───── Wave Particle ───── */
function WaveParticle() {
  const anim = useRef(new Animated.Value(0)).current;
  const x = 10 + Math.random() * 80;
  const yStart = 10 + Math.random() * 80;
  const s = 2 + Math.random() * 3;
  const freq = 0.02 + Math.random() * 0.03;
  const amp = 15 + Math.random() * 25;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.delay(Math.random() * 12000), Animated.timing(anim, { toValue: 1, duration: 5000 + Math.random() * 5000, useNativeDriver: true }), Animated.timing(anim, { toValue: 0, duration: 2000, useNativeDriver: true })])).start();
  }, []);
  return (
    <Animated.View style={{ position: "absolute", left: x + "%", top: yStart + "%", width: s, height: s, borderRadius: s / 2, backgroundColor: COLORS.accentLight, opacity: anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.5, 0.3, 0] }), transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -80] }) }, { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(x) * amp] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1.5] }) }] }} />
  );
}

/* ───── Geometric Border Frame ───── */
function GeometricFrame() {
  const r = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.loop(Animated.timing(r, { toValue: 1, duration: 30000, useNativeDriver: true })).start(); }, []);
  const inset = 12;
  const fw = W - inset * 2;
  const fh = H - inset * 2;
  return (
    <View style={{ position: "absolute", inset: inset, pointerEvents: "none" }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, width: 40, height: 40, borderTopWidth: 0.5, borderLeftWidth: 0.5, borderColor: COLORS.accent, opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.03, 0.06] }) }} />
      <Animated.View style={{ position: "absolute", top: 0, right: 0, width: 40, height: 40, borderTopWidth: 0.5, borderRightWidth: 0.5, borderColor: COLORS.accent, opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.03] }) }} />
      <Animated.View style={{ position: "absolute", bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 0.5, borderLeftWidth: 0.5, borderColor: COLORS.accent, opacity: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.03, 0.07, 0.03] }) }} />
      <Animated.View style={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 0.5, borderRightWidth: 0.5, borderColor: COLORS.accent, opacity: r.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.06, 0.03, 0.06] }) }} />
    </View>
  );
}

/* ───── Export ───── */
export default function Screen3D({ children, style, noParticles = false, noFadeIn = false }) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!noFadeIn) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 11, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 11, useNativeDriver: true }),
        Animated.spring(rotateAnim, { toValue: 0, tension: 50, friction: 11, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      scaleAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0d0d1a" }}>
      <View style={{ position: "absolute", inset: 0, backgroundColor: "#0f0f22" }} />
      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(124,108,247,0.03)" }} />

      {/* ── Base gradient glows ── */}
      <View style={{ position: "absolute", width: 500, height: 500, borderRadius: 250, backgroundColor: COLORS.primary, opacity: 0.03, top: -150, right: -120 }} />
      <View style={{ position: "absolute", width: 400, height: 400, borderRadius: 200, backgroundColor: COLORS.accent, opacity: 0.025, top: H * 0.2, left: -160 }} />
      <View style={{ position: "absolute", width: 350, height: 350, borderRadius: 175, backgroundColor: COLORS.celestial, opacity: 0.02, bottom: H * 0.1, right: W * 0.1 }} />
      <View style={{ position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: COLORS.primaryLight, opacity: 0.015, top: H * 0.6, left: W * 0.6 }} />

      {/* ── Light Spears from edges ── */}
      <LightSpear width={W * 0.5} color={COLORS.accent} top={H * 0.1} left={-W * 0.05} rotate="-15deg" delay={0} />
      <LightSpear width={W * 0.4} color={COLORS.accentLight} top={H * 0.2} left={W * 0.8} rotate="20deg" delay={2000} />
      <LightSpear width={W * 0.35} color="COLORS.accent" top={H * 0.5} left={-W * 0.02} rotate="-30deg" delay={4000} />
      <LightSpear width={W * 0.3} color={COLORS.accentDark} top={H * 0.7} left={W * 0.75} rotate="25deg" delay={1000} />

      {/* ── Golden Crown at top ── */}
      <GoldenCrown />

      {/* ── Central Mandala ── */}
      <Mandala />

      {/* ── Constellations ── */}
      {CONSTELLATIONS.map((g, i) => <Constellation key={i} group={g} delayBase={i * 2} />)}

      {/* ── Sunbursts ── */}
      <Sunburst cx={W * 0.08} cy={H * 0.2} count={10} baseSize={50} color={COLORS.accentDark} speed={0.6} delay={0} />
      <Sunburst cx={W * 0.92} cy={H * 0.35} count={8} baseSize={40} color={COLORS.accentLight} speed={0.8} delay={1500} />
      <Sunburst cx={W * 0.5} cy={H * 0.75} count={6} baseSize={35} color="COLORS.accentLight" speed={0.5} delay={3000} />

      {/* ── Geometric Frame ── */}
      <GeometricFrame />

      {/* ── Diamond Rain ── */}
      {!noParticles && Array.from({ length: 15 }).map((_, i) => <FallingDiamond key={i} />)}

      {/* ── Wave Particles ── */}
      {!noParticles && Array.from({ length: 20 }).map((_, i) => <WaveParticle key={`w${i}`} />)}

      {/* ── Content ── */}
      <Animated.View style={[{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, opacity: noFadeIn ? 1 : fadeAnim, transform: [{ translateY: noFadeIn ? 0 : slideAnim }, { scale: noFadeIn ? 1 : scaleAnim }, { perspective: 1000 }, { rotateX: noFadeIn ? "0deg" : rotateAnim.interpolate({ inputRange: [0, 0.5], outputRange: ["4deg", "0deg"] }) }] }, style]}>
        {children}
      </Animated.View>
    </View>
  );
}

export function GlassCard({ children, style, noGlow = false, onPress, gold = false }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shadow = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (gold) { Animated.loop(Animated.sequence([Animated.timing(glow, { toValue: 1, duration: 2500, useNativeDriver: true }), Animated.timing(glow, { toValue: 0, duration: 2500, useNativeDriver: true })])).start(); } }, [gold]);
  const onPressIn = () => { Animated.parallel([Animated.spring(scale, { toValue: 0.96, tension: 120, friction: 5, useNativeDriver: true }), Animated.timing(shadow, { toValue: 1, duration: 80, useNativeDriver: true })]).start(); };
  const onPressOut = () => { Animated.parallel([Animated.spring(scale, { toValue: 1, tension: 120, friction: 5, useNativeDriver: true }), Animated.timing(shadow, { toValue: 0, duration: 80, useNativeDriver: true })]).start(); if (onPress) onPress(); };
  const content = (
    <Animated.View style={[styles.glass, gold && styles.glassGold, style, { transform: [{ scale }], shadowOpacity: shadow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.6] }), borderColor: gold ? glow.interpolate({ inputRange: [0, 1], outputRange: ["rgba(124,108,247,0.15)", "rgba(124,108,247,0.4)"] }) : "rgba(124,108,247,0.08)" }]}>
      {!noGlow && <View style={[styles.glassGlow, gold && styles.glassGlowGold]} />}
      {children}
    </Animated.View>
  );
  if (onPress) return <TouchableOpacity activeOpacity={1} onPressIn={onPressIn} onPressOut={onPressOut}>{content}</TouchableOpacity>;
  return content;
}

export function Animated3DItem({ children, index = 0, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.delay(index * 70).start(() => { Animated.spring(anim, { toValue: 1, tension: 45, friction: 10, useNativeDriver: true }).start(); }); }, []);
  return <Animated.View style={[style, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [35, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }, { perspective: 800 }, { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ["12deg", "0deg"] }) }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  glass: { backgroundColor: "rgba(26,26,46,0.55)", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(124,108,247,0.08)", shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 12, overflow: "hidden" },
  glassGold: { shadowColor: COLORS.accent, shadowOpacity: 0.3 },
  glassGlow: { position: "absolute", top: -50, right: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.accent, opacity: 0.03 },
  glassGlowGold: { backgroundColor: COLORS.accentLight, opacity: 0.05 },
});
