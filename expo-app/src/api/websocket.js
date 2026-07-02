import Echo from "laravel-echo";
import Pusher from "pusher-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IMAGE_BASE } from "./client";

let echoInstance = null;

export const getEcho = async () => {
  if (echoInstance) return echoInstance;

  const token = await AsyncStorage.getItem("token");

  echoInstance = new Echo({
    broadcaster: "pusher",
    client: Pusher,
    key: "sonix-reverb-key",
    wsHost: "192.168.1.10",
    wsPort: 8080,
    wssPort: 8080,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ["ws"],
    authEndpoint: `${IMAGE_BASE}/api/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  });

  return echoInstance;
};

export const disconnectEcho = () => {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
};
