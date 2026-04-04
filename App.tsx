import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {palette} from './src/tokens';

// 1. Import the RoleProvider you just created
import {RoleProvider} from './src/context/RoleContext';

function App(): React.JSX.Element {
  // For testing purposes, you currently have this set to true so it skips the login screen
  const [isAuthenticated, setIsAuthenticated] = React.useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />

      {/* 2. Wrap the NavigationContainer inside the RoleProvider */}
      <RoleProvider>
        <NavigationContainer>
          <AppNavigator
            isAuthenticated={isAuthenticated}
            onLogin={() => setIsAuthenticated(true)}
            onLogout={() => setIsAuthenticated(false)}
          />
        </NavigationContainer>
      </RoleProvider>

    </SafeAreaProvider>
  );
}

export default App;