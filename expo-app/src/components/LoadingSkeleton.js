import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { COLORS } from "./Theme";

export function SkeletonBox({ width, height, style, borderRadius = 6 }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: COLORS.border, opacity }, style]} />
  );
}

export function FeedSkeleton() {
  return (
    <View style={{ padding: 12 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <SkeletonBox width={36} height={36} borderRadius={18} />
            <View>
              <SkeletonBox width={100} height={12} />
              <SkeletonBox width={60} height={10} style={{ marginTop: 4 }} />
            </View>
          </View>
          <SkeletonBox width="100%" height={280} borderRadius={12} />
          <View style={{ flexDirection: "row", gap: 14, marginVertical: 10 }}>
            <SkeletonBox width={26} height={26} borderRadius={13} />
            <SkeletonBox width={26} height={26} borderRadius={13} />
            <SkeletonBox width={26} height={26} borderRadius={13} />
          </View>
          <SkeletonBox width={80} height={12} />
          <SkeletonBox width="70%" height={14} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={{ padding: 16, alignItems: "center" }}>
      <SkeletonBox width={86} height={86} borderRadius={43} />
      <SkeletonBox width={100} height={16} style={{ marginTop: 12 }} />
      <SkeletonBox width={200} height={12} style={{ marginTop: 6 }} />
      <View style={{ flexDirection: "row", gap: 30, marginTop: 20 }}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: "center" }}>
            <SkeletonBox width={30} height={18} />
            <SkeletonBox width={40} height={12} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
