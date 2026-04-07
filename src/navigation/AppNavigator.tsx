// src/navigation/AppNavigator.tsx
import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { HomeScreen }               from '../screens/HomeScreen';
import { ClassScreen }              from '../screens/ClassScreen';
import { AdminApplicationsScreen }  from '../screens/AdminApplicationsScreen';
import { ProfileScreen }            from '../screens/ProfileScreen';
import { LoginScreen }              from '../screens/LoginScreen';
import { RollCallScreen }           from '../screens/RollCallScreen';
import { ClassDetailScreen }        from '../screens/ClassDetailsScreen';
import { palette, typography }      from '../tokens';
import { useRole }                  from '../context/RoleContext';
import { useAuth }                  from '../context/AuthContext';

// ── Param-list types so navigation.navigate() is fully typed ──
export type RootStackParamList = {
  AppTabs: undefined;
  Login: undefined;
  ClassDetail: {
    classId: string;
    name: string;
    section: string;
    code: string;
  };
  RollCall: {
    meetingId: string;
    classId: string;
    className: string;
    section: string;
    date: string;
    time: string;
  };
};

const Tab       = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { role }   = useRole();
  const { signOut } = useAuth();

  const tabBarPaddingBottom = Platform.OS === 'android'
    ? Math.max(insets.bottom, 8)
    : insets.bottom;

  const TAB_BAR_HEIGHT = 52 + tabBarPaddingBottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontFamily: typography.primaryRegular,
          fontSize: 11,
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor:  palette.border,
          borderTopWidth:  1,
          height:          TAB_BAR_HEIGHT,
          paddingBottom:   tabBarPaddingBottom,
          paddingTop:      8,
          left:            0,
          right:           0,
          position:        'absolute',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'ellipse-outline';
          if (route.name === 'Home')         iconName = focused ? 'home'          : 'home-outline';
          else if (route.name === 'Classes') iconName = focused ? 'school'        : 'school-outline';
          else if (route.name === 'Applications') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person'        : 'person-outline';
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

export function AppNavigator({}: {}) {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {/* Main tab shell */}
          <RootStack.Screen name="AppTabs" component={MainTabs} />

          {/* Full-screen stack screens — sit above the tab bar, no tab UI visible */}
          <RootStack.Screen
            name="RollCall"
            component={RollCallScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <RootStack.Screen
            name="ClassDetail"
            component={ClassDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <RootStack.Screen name="Login" component={LoginScreen} />
      )}
    </RootStack.Navigator>
  );
}