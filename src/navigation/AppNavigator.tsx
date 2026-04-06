// src/navigation/AppNavigator.tsx
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeScreen }    from '../screens/HomeScreen';
import { ClassScreen }   from '../screens/ClassScreen';
import { AdminApplicationsScreen } from '../screens/AdminApplicationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LoginScreen }   from '../screens/LoginScreen';
import { palette, typography } from '../tokens';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import { ClassDetailScreen } from '../screens/ClassDetailsScreen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

type AppNavigatorProps = {
  // no props for now; auth is sourced from AuthContext
};

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const { signOut } = useAuth();

  // On Android the gesture nav bar sits below the tab bar.
  // We pad the tab bar by the bottom inset so it always reaches the screen edge.
  // On iOS, SafeAreaView handles this automatically when paddingBottom is set.
  const tabBarPaddingBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom, 8)
    : insets.bottom;

  // Total tab bar height = icon + label + top padding + bottom safe area padding
  const TAB_BAR_HEIGHT = 52 + tabBarPaddingBottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontFamily: typography.primaryRegular,
          fontSize: 11,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          borderTopWidth: 1,
          // Full-bleed height — reaches the physical bottom of the screen
          height: TAB_BAR_HEIGHT,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 8,
          // Extend to the very left/right edges on all devices
          left: 0,
          right: 0,
          position: 'absolute',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'ellipse-outline';
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Applications') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {role === 'admin' ? (
        <Tab.Screen name="Applications" component={AdminApplicationsScreen} />
      ) : (
        <Tab.Screen name="Classes" component={ClassScreen} />
      )}
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} onLogout={signOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function AppNavigator({}: AppNavigatorProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  const isAuthenticated = !!user;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Group>
          <RootStack.Screen name="AppTabs">
            {() => <MainTabs />}
          </RootStack.Screen>

          <RootStack.Screen name="ClassDetail" component={ClassDetailScreen} />
        </RootStack.Group>
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}