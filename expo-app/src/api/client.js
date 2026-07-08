import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = process.env.EXPO_PUBLIC_API_URL || "https://sonix-production.up.railway.app/api";

let onAuthExpired = null;

export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler;
}

const client = axios.create({ baseURL: API, timeout: 60000 });

let currentToken = null;

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  currentToken = token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let last401 = 0;

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    const url = err.config?.url;
    const reqToken = err.config?.headers?.Authorization?.replace("Bearer ", "");

    if (status === 401 && !url.includes("/auth/")) {
      if (reqToken && reqToken !== currentToken) return Promise.reject(err);
      const now = Date.now();
      if (now - last401 > 3000) {
        last401 = now;
        await AsyncStorage.multiRemove(["token", "user"]);
        if (onAuthExpired) onAuthExpired();
      }
    }

    return Promise.reject(err);
  }
);

export const IMAGE_BASE = API.replace("/api", "");

export const resolveUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${IMAGE_BASE}${path}`;
};

export default client;
