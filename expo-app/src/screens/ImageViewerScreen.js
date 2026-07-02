import { useState, useRef } from "react";
import { View, Image, StyleSheet, Dimensions, TouchableOpacity, Text, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client, { IMAGE_BASE } from "../api/client";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function ImageViewerScreen({ route, navigation }) {
  const { imageUrl, username } = route.params;
  const insets = useSafeAreaInsets();
  const scale = useRef(new Animated.Value(1)).current;
  const [currentScale, setCurrentScale] = useState(1);

  const fullUrl = imageUrl.startsWith("http") ? imageUrl : `${IMAGE_BASE}${imageUrl}`;

  const zoomIn = () => {
    const newScale = Math.min(currentScale + 0.5, 3);
    Animated.spring(scale, { toValue: newScale, useNativeDriver: true }).start();
    setCurrentScale(newScale);
  };

  const zoomOut = () => {
    const newScale = Math.max(currentScale - 0.5, 0.5);
    Animated.spring(scale, { toValue: newScale, useNativeDriver: true }).start();
    setCurrentScale(newScale);
  };

  const resetZoom = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    setCurrentScale(1);
  };

  return (
    <View style={s.wrap}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.closeBtn}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        {username && <Text style={s.username}>{username}</Text>}
        <View style={s.zoomBtns}>
          <TouchableOpacity onPress={zoomIn} style={s.zoomBtn}><Text style={s.zoomBtnText}>+</Text></TouchableOpacity>
          <TouchableOpacity onPress={zoomOut} style={s.zoomBtn}><Text style={s.zoomBtnText}>−</Text></TouchableOpacity>
          {currentScale !== 1 && <TouchableOpacity onPress={resetZoom} style={s.zoomBtn}><Text style={s.zoomBtnText}>⟲</Text></TouchableOpacity>}
        </View>
      </View>
      <Animated.View style={[s.imgWrap, { transform: [{ scale }] }]}>
        <Image source={{ uri: fullUrl }} style={s.img} resizeMode="contain" />
      </Animated.View>
      <TouchableOpacity style={{ flex: 1, position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={resetZoom} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingBottom: 8 },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, color: "#fff", fontWeight: "600" },
  username: { fontSize: 15, fontWeight: "600", color: "#fff" },
  zoomBtns: { flexDirection: "row", gap: 6 },
  zoomBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  zoomBtnText: { fontSize: 18, color: "#fff", fontWeight: "600" },
  imgWrap: { width: SCREEN_W, height: SCREEN_H },
  img: { width: "100%", height: "100%" },
});
