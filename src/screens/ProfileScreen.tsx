import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {palette, spacing, typography} from '../tokens';

export function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
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
    fontFamily: typography.serif,
  },
});
