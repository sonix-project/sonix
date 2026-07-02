import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { IMAGE_BASE } from "../api/client";

const VIDEO_URL = IMAGE_BASE + "/storage/uploads/bg-video.mp4";

export default function VideoBackground({ opacity = 1 }) {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><style>*{margin:0;padding:0}body{width:100vw;height:100vh;overflow:hidden;background:#0d0221}video{position:fixed;top:0;left:0;width:100vw;height:100vh;object-fit:cover}</style></head><body><video id="v" autoplay loop muted playsinline preload="auto"><source src="${VIDEO_URL}" type="video/mp4"></video><script>var v=document.getElementById('v');v.ontimeupdate=function(){if(v.currentTime>=5)v.currentTime=0}</script></body></html>`;

  return (
    <View style={[StyleSheet.absoluteFill, { opacity, zIndex: 0, pointerEvents: "none" }]}>
      <WebView
        source={{ html }}
        style={StyleSheet.absoluteFill}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
      />
    </View>
  );
}
