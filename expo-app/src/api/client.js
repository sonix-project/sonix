import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = "https://sonix-production.up.railway.app/api";

let onAuthExpired = null;

export function setAuthExpiredHandler(handler) {
  onAuthExpired = handler;
}

const client = axios.create({ baseURL: API, timeout: 60000 });

client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
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

    if (status === 401 && !url.includes("/auth/")) {
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

export default client;
