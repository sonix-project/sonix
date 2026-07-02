import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import { COLORS, FONTS } from "../components/Theme";

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [mode, setMode] = useState("photo");
  const [recording, setRecording] = useState(false);
  const [facing, setFacing] = useState("back");
  const [flash, setFlash] = useState("off");
  const [recordTime, setRecordTime] = useState(0);
  const cameraRef = useRef(null);
  const recordTimer = useRef(null);
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => { if (!permission?.granted) requestPermission(); }, [permission]);

  useEffect(() => {
    if (recording) {
      recordTimer.current = setInterval(() => setRecordTime((t) => t + 1), 1000);
    } else {
      clearInterval(recordTimer.current);
      setRecordTime(0);
    }
    return () => clearInterval(recordTimer.current);
  }, [recording]);

  const takeAndUpload = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      const form = new FormData();
      form.append("image", { uri: photo.uri, type: "image/jpeg", name: "story.jpg" });
      await client.post("/stories", form, { headers: { "Content-Type": "multipart/form-data" } });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", "Failed to create story");
    }
    setCapturing(false);
  };

  const toggleRecord = async () => {
    if (!cameraRef.current) return;
    if (recording) {
      setRecording(false);
      try {
        const video = await cameraRef.current.stopRecording();
        const form = new FormData();
        form.append("video", { uri: video.uri, type: "video/mp4", name: "story.mp4" });
        await client.post("/stories", form, { headers: { "Content-Type": "multipart/form-data" } });
        navigation.goBack();
      } catch (e) {
        Alert.alert("Error", "Failed to upload video story");
      }
    } else {
      setRecording(true);
      cameraRef.current.recordAsync({ maxDuration: 30 }).catch(() => setRecording(false));
    }
  };

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Text style={{ color: "#fff", fontSize: 15, marginBottom: 16, textAlign: "center" }}>Camera permission is required</Text>
        <TouchableOpacity style={s.grantBtn} onPress={requestPermission}><Text style={s.grantText}>Grant Permission</Text></TouchableOpacity>
      </View>
    );
  }

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing={facing}
        flash={flash}
        mode={mode === "video" ? "video" : "picture"}
      />

      <View style={[s.topControls, { top: insets.top + 12 }]}>
        <TouchableOpacity style={s.controlBtn} onPress={() => navigation.goBack()}>
          <Text style={s.controlIcon}>✕</Text>
        </TouchableOpacity>

        <View style={s.topRight}>
          <TouchableOpacity style={s.controlBtn} onPress={() => setFlash(flash === "off" ? "on" : "off")}>
            <Text style={s.controlIcon}>{flash === "on" ? "⚡" : "⚡"}</Text>
            <Text style={[s.flashLabel, flash === "on" && { color: "#FDCB6E" }]}>{flash === "on" ? "ON" : "OFF"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.controlBtn} onPress={() => setFacing(facing === "back" ? "front" : "back")}>
            <Text style={s.controlIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {recording && (
        <View style={[s.recordIndicator, { top: insets.top + 60 }]}>
          <View style={s.recordDot} />
          <Text style={s.recordTime}>{formatTime(recordTime)}</Text>
        </View>
      )}

      <View style={[s.controls, { bottom: Math.max(insets.bottom + 20, 40) }]}>
        <TouchableOpacity
          style={[s.modeSwitch, mode === "video" && s.modeActive]}
          onPress={() => setMode(mode === "photo" ? "video" : "photo")}
        >
          <Text style={[s.modeText, mode === "video" && { color: COLORS.primary }]}>
            {mode === "photo" ? "🎥 Video" : "📷 Photo"}
          </Text>
        </TouchableOpacity>

        {mode === "photo" ? (
          <TouchableOpacity style={[s.captureBtn, capturing && s.capturing]} onPress={takeAndUpload} disabled={capturing}>
            {capturing ? <ActivityIndicator color="#fff" size="large" /> : <View style={s.captureInner} />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.recordBtn, recording && s.recordingActive]} onPress={toggleRecord}>
            {recording ? (
              <View style={s.recordingSquare} />
            ) : (
              <View style={s.recordInner} />
            )}
          </TouchableOpacity>
        )}

        <View style={{ width: 60 }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000", padding: 40 },
  topControls: { position: "absolute", left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", zIndex: 10 },
  controlBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  controlIcon: { color: "#fff", fontSize: 18 },
  flashLabel: { color: "#fff", fontSize: 9, ...FONTS.semiBold },
  topRight: { flexDirection: "row", gap: 10 },
  recordIndicator: { position: "absolute", alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 8, zIndex: 10, backgroundColor: "rgba(225,112,85,0.8)", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  recordDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
  recordTime: { color: "#fff", ...FONTS.semiBold, fontSize: 14 },
  controls: { position: "absolute", left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 30 },
  modeSwitch: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)" },
  modeActive: { backgroundColor: COLORS.primary + "40" },
  modeText: { color: "#fff", fontSize: 13, ...FONTS.semiBold },
  captureBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: "#fff" },
  capturing: { opacity: 0.5 },
  recordBtn: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: COLORS.danger, alignItems: "center", justifyContent: "center" },
  recordInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: COLORS.danger },
  recordingActive: { borderColor: COLORS.danger },
  recordingSquare: { width: 30, height: 30, borderRadius: 6, backgroundColor: COLORS.danger },
  grantBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 28 },
  grantText: { color: "#fff", ...FONTS.semiBold, fontSize: 14 },
});
