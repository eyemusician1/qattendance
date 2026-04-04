import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppNavigator} from './src/navigation/AppNavigator';
import {palette} from './src/tokens';

function App(): React.JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = React.useState(true);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />
      <NavigationContainer>
        <AppNavigator
          isAuthenticated={isAuthenticated}
          onLogin={() => setIsAuthenticated(true)}
          onLogout={() => setIsAuthenticated(false)}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
