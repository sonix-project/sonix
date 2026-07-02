import React, { memo, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { COLORS, SIZES } from "../components/Theme";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import FeedScreen from "../screens/FeedScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import ProfileScreen from "../screens/ProfileScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import FollowersScreen from "../screens/FollowersScreen";
import UsersScreen from "../screens/UsersScreen";
import MessagesScreen from "../screens/MessagesScreen";
import ChatScreen from "../screens/ChatScreen";
import CommentsScreen from "../screens/CommentsScreen";
import CameraScreen from "../screens/CameraScreen";
import StoryViewerScreen from "../screens/StoryViewerScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import SavedPostsScreen from "../screens/SavedPostsScreen";
import ImageViewerScreen from "../screens/ImageViewerScreen";
import SharePostScreen from "../screens/SharePostScreen";
import LikeListScreen from "../screens/LikeListScreen";
import EditPostScreen from "../screens/EditPostScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CreateStoryScreen from "../screens/CreateStoryScreen";
import VideoPostScreen from "../screens/VideoPostScreen";
import HighlightsScreen from "../screens/HighlightsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Feed: { active: "🏠", inactive: "🏠" },
  Search: { active: "🔍", inactive: "🔍" },
  Messages: { active: "💬", inactive: "💬" },
  Profile: { active: "👤", inactive: "👤" },
};

const TabBarIcon = memo(({ label, focused }) => {
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (focused) {
      Animated.parallel([
        Animated.spring(pulse, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(pulse, { toValue: 0, duration: 150, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [focused]);

  const icon = TAB_ICONS[label];
  return (
    <Animated.View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive, {
      transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) }],
    }]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
        {icon ? (focused ? icon.active : icon.inactive) : "•"}
      </Text>
      {focused && (
        <>
          <View style={tabStyles.activeDot} />
          <Animated.View style={[tabStyles.activeGlow, {
            opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
            transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
          }]} />
        </>
      )}
    </Animated.View>
  );
});

function CustomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const tabs = state.routes;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={[tabStyles.container, { paddingBottom: Math.max(insets.bottom + 4, 12) }]}>
      <Animated.View style={[tabStyles.tabBar, {
        transform: [{
          translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }),
        }],
      }]}>
        {tabs.map((route, index) => {
          const isFocused = state.index === index;
          const isCreate = route.name === "Create";

          if (isCreate) {
            return <CreateButton key={route.name} navigation={navigation} routeName={route.name} />;
          }

          return (
            <TouchableOpacity
              key={route.name}
              style={tabStyles.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <TabBarIcon label={route.name} focused={isFocused} />
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </View>
  );
}

function CreateButton({ navigation, routeName }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const goldGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulse, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(goldGlow, { toValue: 1, duration: 3000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulse, { toValue: 0, duration: 2000, useNativeDriver: true }),
          Animated.timing(goldGlow, { toValue: 0, duration: 3000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const onPressIn = () => {
    Animated.spring(rotate, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    Animated.spring(rotate, { toValue: 0, tension: 100, friction: 5, useNativeDriver: true }).start();
    navigation.navigate(routeName);
  };

  return (
    <TouchableOpacity
      style={tabStyles.createBtn}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.8}
    >
      <Animated.View style={[tabStyles.createInner, {
        transform: [{
          rotate: rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }),
        }],
        borderColor: goldGlow.interpolate({
          inputRange: [0, 1],
          outputRange: ["rgba(124,108,247,0.15)", "rgba(124,108,247,0.4)"],
        }),
      }]}>
        <Text style={tabStyles.createIcon}>+</Text>
      </Animated.View>
      <Animated.View style={[tabStyles.createPulse, {
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }],
      }]} />
      {/* Gold ring */}
      <Animated.View style={[tabStyles.goldRing, {
        opacity: goldGlow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }),
        transform: [
          { scale: goldGlow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) },
          { rotate: goldGlow.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) },
        ],
      }]} />
    </TouchableOpacity>
  );
}

function HomeTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Search" component={UsersScreen} />
      <Tab.Screen name="Create" component={CreatePostScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.bg },
        animation: "slide_from_right",
        animationDuration: 350,
      }}
    >
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeTabs} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} />
          <Stack.Screen name="Followers" component={FollowersScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Comments" component={CommentsScreen} />
          <Stack.Screen name="Camera" component={CameraScreen} options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="StoryViewer" component={StoryViewerScreen} options={{ animation: "fade" }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="SavedPosts" component={SavedPostsScreen} />
          <Stack.Screen name="ImageViewer" component={ImageViewerScreen} options={{ animation: "fade" }} />
          <Stack.Screen name="SharePost" component={SharePostScreen} />
          <Stack.Screen name="LikeList" component={LikeListScreen} />
          <Stack.Screen name="EditPost" component={EditPostScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="CreateStory" component={CreateStoryScreen} options={{ animation: "slide_from_bottom" }} />
          <Stack.Screen name="VideoPost" component={VideoPostScreen} options={{ animation: "fade" }} />
          <Stack.Screen name="Highlights" component={HighlightsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginHorizontal: 12,
    marginBottom: 4,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    height: 60,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  iconWrapActive: {
    backgroundColor: COLORS.card,
  },
  icon: {
    fontSize: 20,
    opacity: 0.35,
  },
  iconActive: {
    opacity: 1,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
    marginTop: 2,
    zIndex: 2,
  },
  activeGlow: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    top: 2,
  },
  createBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  createInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  createIcon: {
    fontSize: 28,
    color: COLORS.text,
    fontWeight: "300",
    marginTop: -2,
  },
  createPulse: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
  },
  goldRing: {
    position: "absolute",
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
});
