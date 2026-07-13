import { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client, { resolveUrl } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, SIZES } from "../components/Theme";
import Screen3D from "../components/3D/Screen3D";

export default function CreateGroupScreen({ navigation }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.length < 2) { setUsers([]); return; }
      loadUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await client.get("/users/search", { params: { q: search } });
      const data = res.data;
      const raw = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.users) ? data.users : [];
      const list = raw.filter((u) => u.id !== user?.id);
      setUsers(list);
    } catch (e) {
      console.warn("User search error", e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const create = async () => {
    if (!name.trim()) { Alert.alert(t("error"), t("allFieldsRequired")); return; }
    const memberIds = Array.from(selectedIds);
    if (memberIds.length === 0) { Alert.alert(t("error"), t("addMembers")); return; }
    setCreating(true);
    try {
      const res = await client.post("/groups", { name: name.trim(), member_ids: memberIds });
      Alert.alert(t("success"), t("groupCreated"));
      navigation.replace("GroupChat", { groupId: res.data.id, groupName: res.data.name });
    } catch (e) {
      Alert.alert(t("error"), t("error"));
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }) => {
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity style={[s.userRow, selected && s.userRowSelected]} onPress={() => toggleUser(item.id)} activeOpacity={0.7}>
        {item.avatar ? (
          <Image source={{ uri: resolveUrl(item.avatar) }} style={s.avatar} />
        ) : (
          <View style={[s.avatar, s.avatarPlaceholder]}>
            <Text style={s.avatarLetter}>{item.username?.[0]?.toUpperCase() || "?"}</Text>
          </View>
        )}
        <Text style={s.username}>{item.username}</Text>
        <View style={[s.checkbox, selected && s.checkboxSelected]}>
          {selected && <Text style={s.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen3D style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}><Text style={s.backText}>{t("back")}</Text></TouchableOpacity>
        <Text style={s.title}>{t("newGroup")}</Text>
        <TouchableOpacity onPress={create} disabled={creating} style={s.createBtn}><Text style={s.createText}>{creating ? t("loading") : t("createGroup")}</Text></TouchableOpacity>
      </View>

      <View style={s.inputWrap}>
        <Text style={s.label}>{t("groupName")}</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder={t("groupName")} placeholderTextColor={COLORS.muted} autoFocus />
      </View>

      <View style={s.inputWrap}>
        <Text style={s.label}>{t("addMembers")}</Text>
        <TextInput style={s.input} value={search} onChangeText={setSearch} placeholder={t("searchUsers")} placeholderTextColor={COLORS.muted} />
      </View>

      {selectedIds.size > 0 && (
        <Text style={s.selectedCount}>{selectedIds.size} {t("members")}</Text>
      )}

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={search.length > 0 ? <Text style={s.emptyText}>{t("noResults")}</Text> : null}
        />
      )}
    </Screen3D>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4 },
  backText: { color: COLORS.primary, fontSize: SIZES.md, fontWeight: "600" },
  title: { fontSize: SIZES.lg, fontWeight: "700", color: COLORS.text },
  createBtn: { padding: 4 },
  createText: { color: COLORS.primary, fontSize: SIZES.md, fontWeight: "700" },
  inputWrap: { paddingHorizontal: 16, marginBottom: 12 },
  label: { fontSize: SIZES.sm, color: COLORS.muted, marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: COLORS.input, borderRadius: SIZES.radius, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.text, fontSize: SIZES.md },
  selectedCount: { paddingHorizontal: 16, marginBottom: 8, color: COLORS.primary, fontWeight: "600", fontSize: SIZES.sm },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: COLORS.muted, fontSize: SIZES.md, textAlign: "center", marginTop: 40 },
  userRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  userRowSelected: { backgroundColor: COLORS.primary + "15" },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarPlaceholder: { backgroundColor: COLORS.primary + "30", alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: COLORS.primary },
  username: { flex: 1, fontSize: SIZES.md, fontWeight: "500", color: COLORS.text },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.muted, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
