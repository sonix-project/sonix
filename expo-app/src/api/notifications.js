import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import client from "./client";
import AsyncStorage from "@react-native-async-storage/async-storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotifications = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    await savePushToken(token.data);
    return token.data;
  } catch (e) {
    console.warn("Push notification registration error:", e);
    return null;
  }
};

export const savePushToken = async (token) => {
  try {
    await AsyncStorage.setItem("push_token", token);
    await client.post("/notifications/register", { token });
  } catch (e) {
    console.warn("Save push token error:", e);
  }
};

export const setupNotificationListeners = (navigation) => {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received:", notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data.type === "message" && data.sender_id) {
      navigation.navigate("Chat", {
        userId: data.sender_id,
        username: data.sender_name || "User",
      });
    } else if (data.type === "story" && data.story_id) {
      navigation.navigate("StoryViewer", { storyId: data.story_id });
    }
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
};
