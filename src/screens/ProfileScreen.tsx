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
import { useAuth } from '../context/AuthContext';

type ProfileScreenProps = {
  onLogout: () => void;
};

const USER_PROFILE = {
  attendanceRate: '96%',
  streak: '14',
};

const TAB_BAR_HEIGHT = 64;

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { role } = useRole();
  const { fullName } = useAuth();
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
  const LOGOUT_H = 72; // Increased from 56 for a much larger, prominent button
  const ACTION_CARD_H = 64;

  const NUM_GAPS = 4;
  const remaining = usableHeight - TITLE_H - SQUARE_SIZE - LOGOUT_H - (ACTION_CARD_H * 1) - (GAP * NUM_GAPS) - (H_PAD * 2);

  // remaining goes to the identity card
  const identityCardH = Math.max(remaining, 120);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>

        {/* ── CLEAN SURFACE IDENTITY CARD ── */}
        <View style={[styles.identityCard, { height: identityCardH }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.userName} numberOfLines={2}>{fullName}</Text>
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

        {/* ── ROLE-SPECIFIC STATS BENTO ── */}
        {role === 'admin' ? (
          <View style={styles.bentoRow}>
            <View style={[styles.bentoSquare, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
              <Text style={styles.statValueText}>Good</Text>
              <Text style={styles.statLabel}>System Health</Text>
            </View>
            <View style={[styles.bentoSquare, { width: SQUARE_SIZE, height: SQUARE_SIZE }]}>
              <Text style={styles.statValueText}>Any</Text>
              <Text style={styles.statLabel}>Access Level</Text>
            </View>
          </View>
        ) : (
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
        )}

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
        </View>

        {/* ── ENLARGED LOGOUT BUTTON ── */}
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
    color: palette.primary,
    letterSpacing: 1,
  },
  userName: {
    color: palette.ink,
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
    color: palette.ink,
    fontSize: 40,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
  },
  statValueText: {
    color: palette.ink,
    fontSize: 32, // Slightly smaller to fit text strings comfortably
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
  logoutButton: {
    backgroundColor: palette.white,
    borderWidth: 1.5, // Thicker border for more emphasis
    borderColor: palette.border,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4, // Stronger shadow
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  logoutButtonText: {
    color: palette.primary,
    fontFamily: typography.primaryBold,
    fontSize: 20, // Larger, more legible font
    letterSpacing: 0.5,
  },
});