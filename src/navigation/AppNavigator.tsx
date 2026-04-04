import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HomeScreen}    from '../screens/HomeScreen';
import {ExploreScreen} from '../screens/ExploreScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {LoginScreen} from '../screens/LoginScreen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

type AppNavigatorProps = {
  isAuthenticated: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

function MainTabs({onLogout}: {onLogout: () => void}) {
  return (
    <Tab.Navigator screenOptions={{headerShown: false}}>
      <Tab.Screen name="Home">
        {props => <HomeScreen {...props} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
