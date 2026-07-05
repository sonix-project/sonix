import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client, { setAuthExpiredHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAuth(); }, []);

  useEffect(() => {
    setAuthExpiredHandler(() => {
      setToken(null);
      setUser(null);
    });
  }, []);

  const loadAuth = async () => {
    try {
      const [t, u] = await AsyncStorage.multiGet(["token", "user"]);
      if (t[1]) {
        try {
          const res = await client.get("/users/me");
          if (res.status === 200) {
            setToken(t[1]);
            setUser(res.data);
            await AsyncStorage.setItem("user", JSON.stringify(res.data));
          }
        } catch (_) {
          await AsyncStorage.multiRemove(["token", "user"]);
        }
      }
    } catch (e) { console.warn("Auth load error", e); } finally { setLoading(false); }
  };

  const login = useCallback(async (email, password) => {
    const res = await client.post("/auth/login", { email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.multiSet([["token", t], ["user", JSON.stringify(u)]]);
    setToken(t);
    setUser(u);
  }, []);

  const register = useCallback(async (username, email, password) => {
    const res = await client.post("/auth/register", { username, email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.multiSet([["token", t], ["user", JSON.stringify(u)]]);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(["token", "user"]);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (userData) => {
    setUser((prev) => {
      const updated = { ...prev, ...userData };
      AsyncStorage.setItem("user", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const value = useMemo(() => ({ user, token, loading, login, register, logout, updateUser }), [user, token, loading, login, register, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
