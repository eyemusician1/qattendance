// src/screens/HomeScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { palette, spacing, typography } from '../tokens';

type HomeScreenProps = {
  onLogout: () => void;
};

export function HomeScreen({ onLogout }: HomeScreenProps) {

  const handleTemporaryLogout = () => {
    onLogout();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.sub}>Start building your first screen.</Text>

      {/* Temporary Logout Button */}
      <TouchableOpacity
        style={styles.tempLogoutButton}
        onPress={handleTemporaryLogout}
      >
        <Text style={styles.tempLogoutText}>Test Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    color: palette.ink,
    fontSize: 30,
    marginBottom: spacing.sm,
    fontFamily: typography.serif,
  },
  sub: {
    color: palette.body,
    fontSize: 18,
  },
  // New styles for the temporary button
  tempLogoutButton: {
    marginTop: spacing.xxxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: palette.primary, // Using MSU Maroon
    borderRadius: 8, // A standard border radius so you know it's temporary (unlike the pill buttons)
    elevation: 2, // Slight shadow on Android
    shadowColor: palette.ink, // Shadow on iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tempLogoutText: {
    color: palette.surface,
    fontWeight: 'bold',
    fontSize: 16,
  },
});