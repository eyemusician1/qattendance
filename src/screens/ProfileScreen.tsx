// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';

type ProfileScreenProps = {
  onLogout: () => void;
};

// --- MINIMAL MOCK USER DATA ---
const USER_PROFILE = {
  name: 'Cire B. Bayon-on',
  attendanceRate: '96%',
  streak: '14',
};

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { role, cycleRole } = useRole();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Dynamic colors for the role chips
  const getRoleColors = () => {
    switch(role) {
      case 'admin': return { bg: '#F5D0D3', text: '#802B32' };
      case 'teacher': return { bg: '#FBEED2', text: '#8A6A24' };
      default: return { bg: '#D4EDDA', text: '#155724' };
    }
  };

  const roleColors = getRoleColors();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* --- IDENTITY CARD (Perfectly uniformed with HomeScreen cardFull) --- */}
        <View style={styles.identityCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.userName}>{USER_PROFILE.name}</Text>
            <Text style={styles.subtleTag}>ACCOUNT</Text>
          </View>

          <View style={styles.chipRow}>
            <View style={[styles.roleChip, { backgroundColor: roleColors.bg }]}>
              <Text style={[styles.roleChipText, { color: roleColors.text }]}>
                {role.toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* --- STATS BENTO --- */}
        <View style={styles.bentoRow}>
          <View style={styles.bentoSquare}>
            <Text style={styles.statValue}>{USER_PROFILE.attendanceRate}</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>

          <View style={styles.bentoSquare}>
            <Text style={styles.statValue}>{USER_PROFILE.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* --- LARGE ACTION CARDS --- */}
        <View style={styles.actionGroup}>

          <View style={styles.actionCard}>
            <Text style={styles.actionText}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.white}
            />
          </View>

          <TouchableOpacity style={styles.actionCard} onPress={cycleRole} activeOpacity={0.7}>
            <Text style={styles.actionText}>Simulate Role</Text>
          </TouchableOpacity>

        </View>

        {/* --- MASSIVE LOGOUT BUTTON (Anchored to bottom) --- */}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.8}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    flex: 1, // Ensures the content stretches to fill the screen without scrolling
    padding: spacing.xl,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xl,
  },

  // --- IDENTITY CARD (Uniform with cardFull across tabs) ---
  identityCard: {
    backgroundColor: palette.white,
    borderRadius: 24, // Matched to HomeScreen
    padding: spacing.xl, // Matched to HomeScreen
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    height: 180, // Hardcoded height to match the dashboard cards
    justifyContent: 'space-between', // Pushes name to top, chips to bottom
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subtleTag: {
    fontFamily: typography.primaryRegular,
    fontSize: 10,
    color: palette.muted,
    opacity: 0.5,
    letterSpacing: 1,
  },
  userName: {
    color: palette.ink,
    fontSize: 32,
    fontFamily: typography.primaryBold,
    lineHeight: 38,
    maxWidth: '80%', // Prevents long names from colliding with the top right tag
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  roleChipText: {
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  statusChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
    backgroundColor: palette.surface,
  },
  statusChipText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 1,
  },

  // --- STATS BENTO ---
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  bentoSquare: {
    flex: 1,
    aspectRatio: 1, // Uniform with HomeScreen squares
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  statValue: {
    color: palette.ink,
    fontSize: 40,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryMedium,
  },

  // --- LARGE ACTION CARDS ---
  actionGroup: {
    gap: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
    borderRadius: 24,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  actionText: {
    color: palette.ink,
    fontSize: 18,
    fontFamily: typography.primaryBold,
  },

  // --- MASSIVE LOGOUT BUTTON ---
  logoutButton: {
    backgroundColor: palette.ink,
    borderRadius: 100,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto', // Magic fix: Pushes the button to the absolute bottom bounds of the parent View
  },
  logoutButtonText: {
    color: palette.surface,
    fontFamily: typography.primaryBold,
    fontSize: 18,
  },
});