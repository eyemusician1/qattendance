// src/screens/LoginScreen.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { spacing, typography } from '../tokens';

type LoginScreenProps = {
  onLogin?: () => void;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={require('../../assets/images/loginBG.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.overlay, {paddingTop: Math.max(insets.top, spacing.xl)}]}>
        <View pointerEvents="none" style={styles.antiBandingLayer} />

        {/* Ensures the top phone status bar text is white against the dark background */}
        <StatusBar
          barStyle="light-content"
          translucent={Platform.OS === 'android'}
          backgroundColor="transparent"
        />

        <View style={styles.contentContainer}>
          {/* Increased size for the header */}
          <Text style={styles.title}>Attendify</Text>

          {/* Optional subtitle to anchor the massive text */}
          <Text style={styles.subtitle}>Streamlined campus attendance</Text>
        </View>

        {/* Larger button for better tap targets and visual weight */}
        <TouchableOpacity style={styles.googleButton} onPress={onLogin}>
          <Text style={styles.googleButtonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 4, 10, 0.47)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  antiBandingLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 68, // Increased from 56 to 72
    fontFamily: typography.spaceMonoBold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -2, // Tightened slightly more to compensate for the larger font size
  },
  subtitle: {
    fontSize: 16, // Bumped slightly from 16 to 18 to balance the huge title
    fontFamily: typography.spaceMonoRegular,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#E6A817',
    paddingVertical: 22, // Increased from 18
    paddingHorizontal: 56, // Increased from 40
    borderRadius: 100,
    elevation: 6, // Slightly increased shadow to match the bigger size
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  googleButtonText: {
    color: '#3B0918',
    fontSize: 20, // Increased from 18 to 22
    fontFamily: typography.spaceMonoRegular,
  },
});