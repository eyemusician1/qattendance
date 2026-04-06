import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {palette} from './src/tokens';

import {RoleProvider} from './src/context/RoleContext';
import {AuthProvider} from './src/context/AuthContext';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />

      <AuthProvider>
        <RoleProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </RoleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;