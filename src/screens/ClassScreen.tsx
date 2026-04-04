// src/screens/ClassScreen.tsx
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';

const STUDENT_CLASSES = [
  { id: '1', code: 'IT302', name: 'Data Structures', section: 'A1', schedule: 'Mon/Wed • 10:00 AM', status: 'Perfect Attendance', isWarning: false },
  { id: '2', code: 'CS411', name: 'Information Assurance', section: 'B2', schedule: 'Tue/Thu • 1:00 PM', status: 'Warning: 2 Absences', isWarning: true },
  { id: '3', code: 'GE101', name: 'Understanding the Self', section: 'C1', schedule: 'Fri • 9:00 AM', status: 'Present (Current Week)', isWarning: false },
];

const TEACHER_CLASSES = [
  { id: '1', code: 'SE301', name: 'Software Engineering', section: 'T1', schedule: 'Mon/Wed • 8:00 AM', enrolled: 45, pending: 2 },
  { id: '2', code: 'DB201', name: 'Database Systems', section: 'T2', schedule: 'Fri • 9:00 AM', enrolled: 38, pending: 0 },
];

export function ClassScreen() {
  const { role } = useRole();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Classes</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STUDENT ── */}
        {role === 'student' && STUDENT_CLASSES.map((cls) => (
          <TouchableOpacity key={cls.id} style={styles.classCard} activeOpacity={0.7}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.primary} style={styles.navIcon} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classSchedule}>{cls.schedule}</Text>
            </View>
            <View style={[styles.snapshotPill, cls.isWarning && styles.snapshotPillWarning]}>
              <Text style={[styles.snapshotText, cls.isWarning && styles.snapshotTextWarning]}>
                {cls.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── TEACHER ── */}
        {role === 'teacher' && TEACHER_CLASSES.map((cls) => (
          <TouchableOpacity key={cls.id} style={styles.classCard} activeOpacity={0.7}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.primary} style={styles.navIcon} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classSchedule}>{cls.schedule}</Text>
            </View>
            <View style={styles.pillRow}>
              <View style={styles.snapshotPill}>
                <Text style={styles.snapshotText}>{cls.enrolled} Enrolled</Text>
              </View>
              {cls.pending > 0 && (
                <View style={styles.snapshotPillWarning}>
                  <Text style={styles.snapshotTextWarning}>{cls.pending} Needs Review</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        {/* ── ADMIN ── */}
        {role === 'admin' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Admins manage classes via the System Dashboard.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: palette.bg,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  classCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classCode: {
    color: palette.primary, // Subtle Maroon accent
    fontSize: 12,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  navIcon: {
    opacity: 0.6, // Softens the maroon so it isn't too heavy
    transform: [{ rotate: '-45deg' }], // Matches the diagonal arrow from HomeScreen
  },
  cardBody: {
    gap: spacing.xs,
  },
  className: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
  },
  classSchedule: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  snapshotPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.bg, // Updated to bg for slightly more contrast than surface
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  snapshotText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  snapshotPillWarning: {
    alignSelf: 'flex-start',
    backgroundColor: palette.secondarySoft, // Soft cream background
    borderColor: palette.secondary, // Elegant gold border
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  snapshotTextWarning: {
    color: palette.ink, // High contrast ink
    fontFamily: typography.primaryBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    color: palette.muted,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
    fontSize: 14,
  },
});