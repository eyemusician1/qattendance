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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography } from '../tokens'; // Added palette import

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
      <StatusBar
        barStyle="light-content"
        translucent={Platform.OS === 'android'}
        backgroundColor="transparent"
      />

      <View
        style={[
          styles.overlay,
          {
            // Honour the status bar on Android, notch on iOS
            paddingTop: Math.max(insets.top + spacing.xl, spacing.xxxl),
            // Honour home indicator / gesture bar
            paddingBottom: Math.max(insets.bottom + spacing.xl, spacing.xxxl),
          },
        ]}
      >
        {/* Anti-banding layer — purely visual, no layout impact */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.antiBandingLayer} />
        </View>

        {/* Brand + CTA — all inline, whole group vertically centred (Google Labs style) */}
        <View style={styles.centreGroup}>
          <Text style={styles.title}>Attendify</Text>
          <Text style={styles.subtitle}>Streamlined campus attendance</Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onLogin}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
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
    // Note: Kept your original background color overlay here so the layout remains untouched
    backgroundColor: 'rgba(20, 4, 10, 0.47)',
    flexDirection: 'column',
    paddingHorizontal: spacing.xl,
  },
  antiBandingLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },

  centreGroup: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  contentContainer: {
    alignItems: 'center',
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
    marginBottom: spacing.xxl,
  },

  // --- UPDATED BUTTON STYLES ---
  ctaButton: {
    backgroundColor: palette.secondary, // Uses the unified MSU Gold
    borderWidth: 1, // Added subtle border
    borderColor: 'rgba(255, 255, 255, 0.4)', // Semi-transparent white gives a premium edge
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 100,
    alignSelf: 'center',
    elevation: 6,
    shadowColor: palette.ink, // Tied shadow color to the global palette
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  ctaButtonText: {
    color: palette.ink, // High contrast ink text for legibility
    fontSize: 16,
    fontFamily: typography.primaryBold,
  },
});