// src/screens/ProfileScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';

type ProfileScreenProps = {
  onLogout: () => void;
};

const USER_PROFILE = {
  name: 'MSUAN', // Updated back to your name!
  attendanceRate: '96%',
  streak: '14',
};

const TAB_BAR_HEIGHT = 64;

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { role, cycleRole } = useRole();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const H_PAD = spacing.xl;
  const GAP = spacing.lg;

  // Usable height inside the tab screen
  const usableHeight = height - insets.top - insets.bottom - TAB_BAR_HEIGHT;

  // Sections:
  const TITLE_H = 52 + spacing.xl;
  const SQUARE_SIZE = (width - H_PAD * 2 - GAP) / 2;
  const LOGOUT_H = 56;
  const ACTION_CARD_H = 64;
  const NUM_GAPS = 5;
  const remaining = usableHeight - TITLE_H - SQUARE_SIZE - LOGOUT_H - ACTION_CARD_H * 2 - GAP * NUM_GAPS - H_PAD * 2;

  // remaining goes to the identity card
  const identityCardH = Math.max(remaining, 120);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* ── CLEAN SURFACE IDENTITY CARD (Matches Dashboard) ── */}
        <View style={[styles.identityCard, { height: identityCardH }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.userName} numberOfLines={2}>{USER_PROFILE.name}</Text>
            <Text style={styles.subtleTag}>ACCOUNT</Text>
          </View>
          <View style={styles.chipRow}>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>
                {role.toUpperCase()}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* ── STATS BENTO ── */}
        <View style={styles.bentoRow}>
          <View style={[styles.bentoSquare, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
            <Text style={styles.statValue}>{USER_PROFILE.attendanceRate}</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={[styles.bentoSquare, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
            <Text style={styles.statValue}>{USER_PROFILE.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* ── ACTION CARDS ── */}
        <View style={styles.actionGroup}>
          <View style={[styles.actionCard, { height: ACTION_CARD_H }]}>
            <Text style={styles.actionText}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.white}
            />
          </View>
          <TouchableOpacity
            style={[styles.actionCard, { height: ACTION_CARD_H }]}
            onPress={cycleRole}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>Simulate Role</Text>
            <Text style={styles.actionMeta}>{role.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* ── CLEAN LOGOUT BUTTON ── */}
        <TouchableOpacity
          style={[styles.logoutButton, { height: LOGOUT_H }]}
          onPress={onLogout}
          activeOpacity={0.8}
        >
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
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
  },

  // Changed from Solid Maroon to Clean White Surface
  identityCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'space-between',
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
    fontFamily: typography.primaryBold,
    fontSize: 10,
    color: palette.primary, // Maroon Tag
    letterSpacing: 1,
  },
  userName: {
    color: palette.ink, // Dark Ink Text
    fontSize: 28,
    fontFamily: typography.primaryBold,
    lineHeight: 34,
    flex: 1,
    marginRight: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Maroon Background with White Text (Matches Dashboard Active Badge)
  roleChip: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  roleChipText: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 1,
  },

  // Soft Background with Border (Matches Class List Pills)
  statusChip: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  statusChipText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  bentoSquare: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'flex-end',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  statValue: {
    color: palette.ink, // Reverted to Ink for uniformity
    fontSize: 40,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryMedium,
  },
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
  actionMeta: {
    color: palette.primary,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    letterSpacing: 1,
  },

  // Changed from Solid Gold to Clean White with Maroon Text
  logoutButton: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  logoutButtonText: {
    color: palette.primary, // Maroon Text for exit action
    fontFamily: typography.primaryBold,
    fontSize: 18,
  },
});