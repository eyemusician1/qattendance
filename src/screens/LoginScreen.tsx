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

        <StatusBar
          barStyle="light-content"
          translucent={Platform.OS === 'android'}
          backgroundColor="transparent"
        />

        <View style={styles.contentContainer}>
          <Text style={styles.title}>Attendify</Text>
          <Text style={styles.subtitle}>Streamlined campus attendance</Text>
        </View>

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
    fontSize: 68,
    fontFamily: typography.primaryBold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: typography.primaryRegular,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  googleButton: {
    backgroundColor: '#E6A817',
    paddingVertical: 22,
    paddingHorizontal: 56,
    borderRadius: 100,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  googleButtonText: {
    color: '#3B0918',
    fontSize: 20,
    fontFamily: typography.primaryBold,
  },
});