// src/navigation/AppNavigator.tsx
import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {HomeScreen}    from '../screens/HomeScreen';
import {ClassScreen}   from '../screens/ClassScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {palette, typography} from '../tokens';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

type AppNavigatorProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

function MainTabs({onLogout}: {onLogout: () => void}) {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary, // Using MSU Maroon
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontFamily: typography.primaryRegular, // Just a heads up, make sure you imported spaceMonoRegular in typography.ts!
          fontSize: 12,
        },
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string = 'ellipse-outline';

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}>

      {/* 1. HomeScreen no longer needs the custom render prop */}
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Classes" component={ClassScreen} />

      {/* 2. ProfileScreen now receives the onLogout prop */}
      <Tab.Screen name="Profile">
        {props => <ProfileScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
}

export function AppNavigator({isAuthenticated, onLogin, onLogout}: AppNavigatorProps) {
  return (
    <RootStack.Navigator screenOptions={{headerShown: false}}>
      {isAuthenticated ? (
        <RootStack.Screen name="AppTabs">
          {() => <MainTabs onLogout={onLogout} />}
        </RootStack.Screen>
      ) : (
        <RootStack.Screen name="Login">
          {props => <LoginScreen {...props} onLogin={onLogin} />}
        </RootStack.Screen>
      )}
    </RootStack.Navigator>
  );
}