import { useState, useRef, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions, PanResponder, Modal, FlatList, Keyboard } from "react-native";
import { WebView } from "react-native-webview";
import { COLORS, SIZES, FONTS } from "./Theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const COLORS_PALETTE = ["#ffffff", "#000000", "#E17055", "#00CEC9", "#6C5CE7", "#FDCB6E", "#FF7675", "#74B9FF", "#55EFC4", "#FD79A8"];
const BG_COLORS = [null, "#000000", "#6C5CE7", "#E17055", "#00CEC9", "#2D3436", "#6C5CE733", "#E1705533", "#00CEC933"];
const DRAW_COLORS = ["#ffffff", "#E17055", "#00CEC9", "#6C5CE7", "#FDCB6E", "#000000"];
const STICKER_EMOJIS = ["😀", "😍", "🔥", "💯", "⭐", "🎉", "👍", "❤️", "😂", "😮", "😢", "🤔", "😎", "🥳", "💀", "👀", "✨", "🌟", "💫", "🎵", "🎶", "📸", "🎬", "🎨", "💡", "🏆", "💪", "🙌", "🫶", "👋", "🤝", "✌️", "🤙", "🦋", "🌈", "☀️", "🌙", "⚡", "❄️", "🌸", "🌺", "🍕", "🍩", "☕", "🧁"];

function DraggableText({ text, color, bgColor, onPositionChange }) {
  const pan = useRef({ x: SCREEN_W * 0.15, y: 100 }).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(0, Math.min(SCREEN_W - 100, pan.x + gesture.dx));
        const newY = Math.max(0, Math.min(SCREEN_H * 0.6, pan.y + gesture.dy));
        pan.x = newX;
        pan.y = newY;
        onPositionChange?.({ x: newX, y: newY });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  if (!text) return null;

  return (
    <View
      {...panResponder.panHandlers}
      style={[draggableStyles.wrap, {
        left: pan.x,
        top: pan.y,
        backgroundColor: bgColor || "rgba(0,0,0,0.4)",
      }]}
    >
      <Text style={[draggableStyles.text, { color }]}>{text}</Text>
    </View>
  );
}

const draggableStyles = StyleSheet.create({
  wrap: { position: "absolute", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, zIndex: 10, maxWidth: SCREEN_W * 0.7 },
  text: { fontSize: 22, ...FONTS.bold, textAlign: "center" },
});

function DraggableSticker({ sticker, index, onUpdate, onRemove }) {
  const pan = useRef({ x: (sticker.x / 100) * SCREEN_W, y: (sticker.y / 100) * (SCREEN_W * 1.4) }).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(0, Math.min(SCREEN_W - 50, pan.x + gesture.dx));
        const newY = Math.max(0, Math.min(SCREEN_W * 1.4 - 50, pan.y + gesture.dy));
        pan.x = newX;
        pan.y = newY;
        onUpdate(index, {
          x: (newX / SCREEN_W) * 100,
          y: (newY / (SCREEN_W * 1.4)) * 100,
        });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={[stickerDragStyles.wrap, { left: pan.x, top: pan.y }]}
    >
      <Text style={{ fontSize: sticker.size || 40 }}>{sticker.emoji}</Text>
      <TouchableOpacity style={stickerDragStyles.removeBtn} onPress={() => onRemove(index)}>
        <Text style={stickerDragStyles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const stickerDragStyles = StyleSheet.create({
  wrap: { position: "absolute", zIndex: 20 },
  removeBtn: { position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center" },
  removeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});

function StickerPicker({ visible, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.stickerModalOverlay}>
        <View style={s.stickerModal}>
          <View style={s.modalHandle} />
          <Text style={s.stickerModalTitle}>Stickers</Text>
          <FlatList
            data={STICKER_EMOJIS}
            numColumns={8}
            keyExtractor={(e, i) => `${e}-${i}`}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.stickerOption} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={s.stickerEmoji}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

function DrawingCanvas({ visible, strokes, onAddStroke, onUndo, onRedo, canUndo, canRedo, onClose }) {
  const [currentStroke, setCurrentStroke] = useState([]);
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const lastPoint = useRef(null);

  const handleTouch = useCallback((evt) => {
    const { locationX, locationY } = evt.nativeEvent;
    const newPoint = { x: locationX, y: locationY, color: isEraser ? "eraser" : drawColor, size: isEraser ? brushSize * 3 : brushSize };
    if (lastPoint.current) {
      const dist = Math.sqrt(
        Math.pow(locationX - lastPoint.current.x, 2) + Math.pow(locationY - lastPoint.current.y, 2)
      );
      if (dist < 2) return;
    }
    lastPoint.current = { x: locationX, y: locationY };
    setCurrentStroke((p) => [...p, newPoint]);
  }, [drawColor, brushSize, isEraser]);

  const saveStroke = useCallback(() => {
    if (currentStroke.length > 0) {
      onAddStroke([...currentStroke]);
      setCurrentStroke([]);
      lastPoint.current = null;
    }
  }, [currentStroke, onAddStroke]);

  if (!visible) return null;

  return (
    <View style={s.drawingOverlay}>
      <View style={s.drawingTopBar}>
        <View style={s.drawingTopLeft}>
          <TouchableOpacity onPress={onClose} style={s.drawActionBtn}>
            <Text style={s.drawingCancel}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.drawActionBtn, canUndo && s.drawActionActive]}
            onPress={onUndo}
            disabled={!canUndo}
          >
            <Text style={[s.drawActionText, !canUndo && s.drawActionDisabled]}>↩</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.drawActionBtn, canRedo && s.drawActionActive]}
            onPress={onRedo}
            disabled={!canRedo}
          >
            <Text style={[s.drawActionText, !canRedo && s.drawActionDisabled]}>↪</Text>
          </TouchableOpacity>
        </View>

        <View style={s.drawColorRow}>
          {DRAW_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[s.drawColorBtn, { backgroundColor: c }, drawColor === c && !isEraser && s.drawColorActive]}
              onPress={() => { setDrawColor(c); setIsEraser(false); }}
            />
          ))}
          <TouchableOpacity
            style={[s.drawColorBtn, s.eraserBtn, isEraser && s.drawColorActive]}
            onPress={() => setIsEraser(true)}
          >
            <Text style={s.eraserIcon}>◻</Text>
          </TouchableOpacity>
        </View>

        <View style={s.brushRow}>
          {[2, 4, 8, 12].map((sz) => (
            <TouchableOpacity
              key={sz}
              style={[s.brushBtn, brushSize === sz && s.brushActive]}
              onPress={() => setBrushSize(sz)}
            >
              <View style={{ width: sz + 4, height: sz + 4, borderRadius: (sz + 4) / 2, backgroundColor: isEraser ? COLORS.muted : drawColor }} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={1}
        style={s.drawingCanvas}
        onPress={handleTouch}
        onPressOut={saveStroke}
      >
        {(Array.isArray(strokes) ? strokes : []).map((stroke, si) => {
          if (!stroke?.length) return null;
          return stroke.map((point, pi) => {
            if (point.color === "eraser") return null;
            return (
              <View
                key={`${si}-${pi}`}
                style={{
                  position: "absolute",
                  left: point.x - (point.size || 4) / 2,
                  top: point.y - (point.size || 4) / 2,
                  width: point.size || 4,
                  height: point.size || 4,
                  borderRadius: (point.size || 4) / 2,
                  backgroundColor: point.color || "#fff",
                }}
              />
            );
          });
        })}
        {currentStroke.map((point, pi) => {
          if (point.color === "eraser") return null;
          return (
            <View
              key={`cur-${pi}`}
              style={{
                position: "absolute",
                left: point.x - point.size / 2,
                top: point.y - point.size / 2,
                width: point.size,
                height: point.size,
                borderRadius: point.size / 2,
                backgroundColor: point.color,
              }}
            />
          );
        })}
      </TouchableOpacity>
    </View>
  );
}

export default function StoryEditor({ imageUri, videoUri, mediaType, onPost }) {
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState(null);
  const [duration, setDuration] = useState(5);
  const [stickers, setStickers] = useState([]);
  const [drawingStrokes, setDrawingStrokes] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [textPosition, setTextPosition] = useState({ x: SCREEN_W * 0.15, y: 100 });
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [posting, setPosting] = useState(false);

  const addSticker = (emoji) => {
    setStickers((p) => [...p, {
      emoji,
      x: Math.random() * 60 + 20,
      y: Math.random() * 40 + 20,
      size: 40,
      scale: 1,
    }]);
  };

  const updateSticker = (index, updates) => {
    setStickers((p) => p.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeSticker = (index) => {
    setStickers((p) => p.filter((_, i) => i !== index));
  };

  const addDrawingStroke = useCallback((stroke) => {
    setDrawingStrokes((p) => [...p, stroke]);
    setUndoStack([]);
  }, []);

  const undoDrawing = useCallback(() => {
    if (drawingStrokes.length === 0) return;
    const last = drawingStrokes[drawingStrokes.length - 1];
    setDrawingStrokes((p) => p.slice(0, -1));
    setUndoStack((p) => [...p, last]);
  }, [drawingStrokes]);

  const redoDrawing = useCallback(() => {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((p) => p.slice(0, -1));
    setDrawingStrokes((p) => [...p, last]);
  }, [undoStack]);

  const submit = async () => {
    Keyboard.dismiss();
    const hasText = text && text.trim().length > 0;
    const hasImage = mediaType !== "video" && imageUri;
    const hasVideo = mediaType === "video" && videoUri;
    const hasStickers = stickers.length > 0;
    const hasDrawing = drawingStrokes.length > 0;

    if (!hasImage && !hasVideo && !hasText) {
      return;
    }

    setPosting(true);
    try {
      await onPost({
        text_overlay: text || null,
        text_color: textColor,
        bg_color: bgColor,
        duration,
        imageUri,
        videoUri,
        mediaType,
        stickers: stickers.length > 0 ? stickers : null,
        drawing_data: drawingStrokes.length > 0 ? drawingStrokes : null,
      });
    } catch (_) {}
    setPosting(false);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={[s.preview, !imageUri && !videoUri && { backgroundColor: bgColor || "#1a1a2e" }]}>
        {videoUri ? (
          <WebView
            source={{ html: `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
            <video id="v" playsinline webkit-playsinline controls muted src="${videoUri}" style="width:100%;height:100%;object-fit:contain"></video>
            </body></html>` }}
            style={{ width: "100%", height: "100%", position: "absolute" }}
            allowsInlineMediaPlayback
            javaScriptEnabled
          />
        ) : imageUri ? (
          <Image source={{ uri: imageUri }} style={s.previewImage} />
        ) : null}

        {drawingStrokes.length > 0 && drawingStrokes.map((stroke, si) => {
          if (!stroke?.length) return null;
          return stroke.map((point, pi) => {
            if (point.color === "eraser") return null;
            return (
              <View
                key={`d-${si}-${pi}`}
                style={{
                  position: "absolute",
                  left: (point.x / 300) * SCREEN_W,
                  top: (point.y / 420) * (SCREEN_W * 1.4),
                  width: point.size || 4,
                  height: point.size || 4,
                  borderRadius: (point.size || 4) / 2,
                  backgroundColor: point.color || "#fff",
                }}
              />
            );
          });
        })}

        {text ? (
          <DraggableText
            text={text}
            color={textColor}
            bgColor={bgColor}
            onPositionChange={setTextPosition}
          />
        ) : null}

        {stickers.map((sticker, i) => (
          <DraggableSticker
            key={i}
            sticker={sticker}
            index={i}
            onUpdate={updateSticker}
            onRemove={removeSticker}
          />
        ))}

        <View style={s.previewToolbar}>
          <TouchableOpacity style={s.previewToolBtn} onPress={() => setShowStickerPicker(true)}>
            <Text style={s.previewToolIcon}>😀</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.previewToolBtn} onPress={() => setShowDrawing(true)}>
            <Text style={s.previewToolIcon}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.textInputWrap}>
        <TextInput
          style={s.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Add text overlay..."
          placeholderTextColor={COLORS.muted}
          maxLength={200}
          multiline
          returnKeyType="done"
          blurOnSubmit
        />
        <Text style={[s.charCounter, text.length > 180 && s.charCounterWarn]}>
          {text.length}/200
        </Text>
      </View>

      <Text style={s.label}>Text Color</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.colorRow}>
        {COLORS_PALETTE.map((c) => (
          <TouchableOpacity
            key={c}
            style={[s.colorSwatch, { backgroundColor: c }, textColor === c && s.colorSelected, c === "#ffffff" && { borderWidth: 1, borderColor: COLORS.border }]}
            onPress={() => setTextColor(c)}
          />
        ))}
      </ScrollView>

      <Text style={s.label}>Background</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.colorRow}>
        {BG_COLORS.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={[s.colorSwatch, { backgroundColor: c || COLORS.card }, bgColor === c && s.colorSelected, c === null && { borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed" }]}
            onPress={() => setBgColor(c)}
          >
            {c === null && <Text style={s.noneLabel}>∅</Text>}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.label}>Duration: {duration}s</Text>
      <View style={s.durationRow}>
        {[3, 5, 10, 15, 30, 60].map((d) => (
          <TouchableOpacity key={d} style={[s.durBtn, duration === d && s.durActive]} onPress={() => setDuration(d)}>
            <Text style={[s.durText, duration === d && s.durTextActive]}>{d}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      {stickers.length > 0 && (
        <>
          <Text style={s.label}>Stickers ({stickers.length}) — drag to position</Text>
          <View style={s.stickerChips}>
            {stickers.map((st, i) => (
              <TouchableOpacity key={i} style={s.stickerChip} onPress={() => removeSticker(i)}>
                <Text style={s.stickerChipText}>{st.emoji} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {drawingStrokes.length > 0 && (
        <View style={s.drawActions}>
          <TouchableOpacity style={s.undoRedoBtn} onPress={undoDrawing}>
            <Text style={s.undoRedoText}>↩ Undo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.undoRedoBtn} onPress={() => setDrawingStrokes([])}>
            <Text style={[s.undoRedoText, { color: COLORS.danger }]}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[s.postBtn, (posting || (!imageUri && !videoUri && !text.trim())) && s.postBtnDisabled]}
        onPress={submit}
        disabled={posting || (!imageUri && !videoUri && !text.trim())}
      >
        <Text style={s.postBtnText}>{posting ? "Posting..." : "Post Story"}</Text>
      </TouchableOpacity>

      <StickerPicker visible={showStickerPicker} onSelect={addSticker} onClose={() => setShowStickerPicker(false)} />
      <DrawingCanvas
        visible={showDrawing}
        strokes={drawingStrokes}
        onAddStroke={addDrawingStroke}
        onUndo={undoDrawing}
        onRedo={redoDrawing}
        canUndo={drawingStrokes.length > 0}
        canRedo={undoStack.length > 0}
        onClose={() => setShowDrawing(false)}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 60 },
  preview: { height: SCREEN_W * 1.4, backgroundColor: "#000", borderRadius: SIZES.radiusLg, overflow: "hidden", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  previewImage: { width: "100%", height: "100%", position: "absolute" },
  previewToolbar: { position: "absolute", right: 8, bottom: 8, gap: 8, zIndex: 15 },
  previewToolBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  previewToolIcon: { fontSize: 20 },
  textInputWrap: { backgroundColor: COLORS.card, borderRadius: SIZES.radius, marginBottom: 16, overflow: "hidden" },
  textInput: { padding: 14, fontSize: 16, color: COLORS.text, minHeight: 70, textAlignVertical: "top", paddingBottom: 28 },
  charCounter: { position: "absolute", bottom: 6, right: 12, fontSize: 11, color: COLORS.muted },
  charCounterWarn: { color: COLORS.danger },
  label: { fontSize: SIZES.sm, ...FONTS.semiBold, color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 },
  colorRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  colorSelected: { borderWidth: 3, borderColor: COLORS.accent },
  noneLabel: { color: COLORS.muted, fontSize: 14 },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  durBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: SIZES.radius, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  durActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  durText: { color: COLORS.text, ...FONTS.semiBold },
  durTextActive: { color: "#fff" },
  stickerChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  stickerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  stickerChipText: { color: COLORS.text, fontSize: 14 },
  drawActions: { flexDirection: "row", gap: 12, marginBottom: 16 },
  undoRedoBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: SIZES.radius, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  undoRedoText: { color: COLORS.text, ...FONTS.semiBold, fontSize: 14 },
  postBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  postBtnDisabled: { opacity: 0.5 },
  postBtnText: { color: "#fff", fontSize: SIZES.lg, ...FONTS.bold },
  stickerModalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.6)" },
  stickerModal: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "50%", paddingTop: 8, paddingBottom: 20 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.muted, alignSelf: "center", marginBottom: 8 },
  stickerModalTitle: { fontSize: SIZES.md, ...FONTS.bold, color: COLORS.text, textAlign: "center", marginBottom: 12 },
  stickerOption: { flex: 1, alignItems: "center", padding: 10 },
  stickerEmoji: { fontSize: 32 },
  drawingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.bg, zIndex: 100 },
  drawingTopBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, flexWrap: "wrap", gap: 8 },
  drawingTopLeft: { flexDirection: "row", gap: 8 },
  drawActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  drawActionActive: { backgroundColor: COLORS.primary + "30" },
  drawingCancel: { color: COLORS.text, fontSize: 18 },
  drawActionText: { color: COLORS.text, fontSize: 18 },
  drawActionDisabled: { opacity: 0.3 },
  drawColorRow: { flexDirection: "row", gap: 6 },
  drawColorBtn: { width: 28, height: 28, borderRadius: 14 },
  drawColorActive: { borderWidth: 3, borderColor: COLORS.accent },
  eraserBtn: { backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  eraserIcon: { color: COLORS.text, fontSize: 14 },
  brushRow: { flexDirection: "row", gap: 6 },
  brushBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.input, alignItems: "center", justifyContent: "center" },
  brushActive: { borderWidth: 2, borderColor: COLORS.accent },
  drawingCanvas: { flex: 1, backgroundColor: "transparent" },
});
