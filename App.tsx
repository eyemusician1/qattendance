import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {palette} from './src/tokens';

// 1. Import the RoleProvider
import {RoleProvider} from './src/context/RoleContext';

function App(): React.JSX.Element {
  // Changed to FALSE so the app launches the Login Screen first!
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  return (
    <SafeAreaProvider>
      {/* This is your default status bar for the app (dark text, off-white bg).
        Your LoginScreen will automatically override this to white text/transparent
        when it mounts, and it will safely revert to this when you log in!
      */}
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