import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { IMAGE_BASE } from "../api/client";
import { COLORS } from "../components/Theme";

const { width, height } = Dimensions.get("window");

export default function VideoPostScreen({ route, navigation }) {
  const { videoUrl, username } = route?.params || {};
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  const html = `
<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:#000; display:flex; align-items:center; justify-content:center;
         height:100vh; overflow:hidden; }
  video { width:100%; height:100%; object-fit:contain; }
</style>
</head><body>
<video id="v" playsinline webkit-playsinline controls autoplay
       src="${IMAGE_BASE}${videoUrl}"></video>
</body></html>`;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <WebView
        source={{ html }}
        style={s.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={s.loadingText}>Loading video...</Text>
        </View>
      )}
      <View style={[s.topBar, { top: insets.top + 10 }]}>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={s.closeText}>✕</Text>
        </TouchableOpacity>
        {username && <Text style={s.username}>{username}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { width, height: height * 0.7 },
  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  loadingText: { color: "#fff", marginTop: 12, fontSize: 14 },
  topBar: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12, zIndex: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  closeText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  username: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
