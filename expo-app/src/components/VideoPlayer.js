import { useState, memo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "./Theme";

const VideoPlayer = memo(({ uri, style, onEnd }) => {
  const [loading, setLoading] = useState(true);
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
       src="${uri}"></video>
<script>
document.getElementById('v').addEventListener('ended', function() {
  window.ReactNativeWebView.postMessage('ended');
});
</script>
</body></html>`;

  return (
    <View style={[s.wrapper, style]}>
      {loading && (
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}
      <WebView
        source={{ html }}
        style={s.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        scrollEnabled={false}
        onLoadEnd={() => setLoading(false)}
        onMessage={(e) => { if (e.nativeEvent.data === "ended") onEnd?.(); }}
      />
    </View>
  );
});

const s = StyleSheet.create({
  wrapper: { overflow: "hidden", backgroundColor: "#000", position: "relative" },
  webview: { width: "100%", height: "100%", backgroundColor: "#000" },
  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", zIndex: 5 },
});

export default VideoPlayer;
