// src/screens/ClassScreen.tsx
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';

// --- MOCK DATA ---
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>My Classes</Text>

      {/* ========================================== */}
      {/* STUDENT CLASS LIST                           */}
      {/* ========================================== */}
      {role === 'student' && (
        <View style={styles.listContainer}>
          {STUDENT_CLASSES.map((cls) => (
            <TouchableOpacity key={cls.id} style={styles.classCard} activeOpacity={0.7}>

              <View style={styles.cardHeaderRow}>
                <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
                <Ionicons name="arrow-forward-outline" size={20} color={palette.muted} style={styles.navIcon} />
              </View>

              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classSchedule}>{cls.schedule}</Text>

              {/* Current Week Snapshot */}
              <View style={[styles.snapshotPill, cls.isWarning && styles.snapshotPillWarning]}>
                <Text style={[styles.snapshotText, cls.isWarning && styles.snapshotTextWarning]}>
                  {cls.status}
                </Text>
              </View>

            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ========================================== */}
      {/* TEACHER CLASS LIST                           */}
      {/* ========================================== */}
      {role === 'teacher' && (
        <View style={styles.listContainer}>
          {TEACHER_CLASSES.map((cls) => (
            <TouchableOpacity key={cls.id} style={styles.classCard} activeOpacity={0.7}>

              <View style={styles.cardHeaderRow}>
                <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
                <Ionicons name="arrow-forward-outline" size={20} color={palette.muted} style={styles.navIcon} />
              </View>

              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classSchedule}>{cls.schedule}</Text>

              {/* Teacher Snapshot */}
              <View style={styles.snapshotRow}>
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
        </View>
      )}

      {/* Admin empty state for now */}
      {role === 'admin' && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Admins manage classes via the System Dashboard.</Text>
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xxxl,
  },
  listContainer: {
    gap: spacing.lg,
  },
  classCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
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
    marginBottom: spacing.sm,
  },
  classCode: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryMedium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  navIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  className: {
    color: palette.ink,
    fontSize: 24,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
  },
  classSchedule: {
    color: palette.body,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
    marginBottom: spacing.lg,
  },
  snapshotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  snapshotPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  snapshotText: {
    color: palette.ink,
    fontFamily: typography.primaryMedium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  snapshotPillWarning: {
    alignSelf: 'flex-start',
    backgroundColor: '#FBEED2',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  snapshotTextWarning: {
    color: '#8A6A24',
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