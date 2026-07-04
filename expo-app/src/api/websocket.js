import Echo from "laravel-echo";
import Pusher from "pusher-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IMAGE_BASE } from "./client";

let echoInstance = null;

export const getEcho = async () => {
  if (echoInstance) return echoInstance;

  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) return null;

    echoInstance = new Echo({
      broadcaster: "pusher",
      client: Pusher,
      key: "sonix-reverb-key",
      wsHost: "sonix-production.up.railway.app",
      wsPort: 443,
      wssPort: 443,
      forceTLS: true,
      disableStats: true,
      enabledTransports: ["ws", "wss"],
      authEndpoint: `${IMAGE_BASE}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    });

    return echoInstance;
  } catch (e) {
    console.warn("Echo init failed:", e?.message);
    return null;
  }
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
