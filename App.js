import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import TodayScreen    from './src/screens/TodayScreen';
import WeekScreen     from './src/screens/WeekScreen';
import AddScreen      from './src/screens/AddScreen';
import SettingsScreen from './src/screens/SettingsScreen';

import { requestPermissions, scheduleAllNotifications } from './src/utils/notifications';
import { colors } from './src/utils/theme';
import { AuthProvider, useAuth } from './src/utils/authContext';
import { setCurrentUid, loadEvents } from './src/utils/storage';

const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = {
    Today:    focused ? '⊞' : '⊟',
    Week:     '📅',
    Add:      '＋',
    Settings: '⚙️',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center',
      ...(name === 'Add' ? { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, marginBottom: 20 } : {}) }}>
      <Text style={{ fontSize: name === 'Add' ? 26 : 22, color: name === 'Add' ? '#fff' : focused ? colors.primary : colors.textMuted }}>
        {icons[name]}
      </Text>
    </View>
  );
};

function AppNavigator() {
  const { user } = useAuth();

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEvents().then(events => scheduleAllNotifications(events));
  }, [user?.uid]);

  useEffect(() => {
    if (user) setCurrentUid(user.uid);
  }, [user]);

  if (user === undefined) return null;

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            height: 72,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        })}
      >
        <Tab.Screen name="Today"    component={TodayScreen}    options={{ tabBarLabel: '今日' }} />
        <Tab.Screen name="Week"     component={WeekScreen}     options={{ tabBarLabel: '週間' }} />
        <Tab.Screen name="Add"      component={AddScreen}      options={{ tabBarLabel: '' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: '設定' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
