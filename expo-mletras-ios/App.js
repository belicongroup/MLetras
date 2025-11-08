import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SearchScreen from './src/screens/SearchScreen';
import BookmarksScreen from './src/screens/BookmarksScreen';
import NotesScreen from './src/screens/NotesScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F3F4F6',
  },
};

const screenOptions = ({ route }) => ({
  headerShown: false,
  tabBarActiveTintColor: '#2563EB',
  tabBarInactiveTintColor: '#9CA3AF',
  tabBarStyle: {
    paddingVertical: 8,
    height: 60,
  },
  tabBarIcon: ({ color, size, focused }) => {
    let iconName = 'musical-notes';

    switch (route.name) {
      case 'Search':
        iconName = focused ? 'search' : 'search-outline';
        break;
      case 'Bookmarks':
        iconName = focused ? 'heart' : 'heart-outline';
        break;
      case 'Notes':
        iconName = focused ? 'document-text' : 'document-text-outline';
        break;
      case 'Settings':
        iconName = focused ? 'settings' : 'settings-outline';
        break;
      default:
        break;
    }

    return <Ionicons name={iconName} size={size} color={color} />;
  },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Tab.Navigator screenOptions={screenOptions}>
          <Tab.Screen name="Search" component={SearchScreen} />
          <Tab.Screen name="Bookmarks" component={BookmarksScreen} />
          <Tab.Screen name="Notes" component={NotesScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
