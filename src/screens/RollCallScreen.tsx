// src/screens/RollCallScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import firestore from '@react-native-firebase/firestore';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StudentAttendance = {
  id: string;
  studentUid: string;
  studentName: string;
  checkInTime: string | null;
  status: 'present' | 'absent' | 'late' | 'excused' | 'unmarked';
  validation: string;
};

type DialogType = 'cancel' | 'save' | 'finalize' | null;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const styles_badge = {
  present:  { backgroundColor: '#ECFDF5' },
  absent:   { backgroundColor: '#FEF2F2' },
  late:     { backgroundColor: '#FFFBEB' },
  excused:  { backgroundColor: '#EFF6FF' },
  unmarked: { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border },
};

const styles_text = {
  present:  { color: '#059669' },
  absent:   { color: '#DC2626' },
  late:     { color: '#D97706' },
  excused:  { color: '#2563EB' },
  unmarked: { color: palette.muted },
};

const STATUS_CONFIG: Record<string, { badge: object; text: object; label: string }> = {
  present:  { badge: styles_badge.present,  text: styles_text.present,  label: 'Present'  },
  absent:   { badge: styles_badge.absent,   text: styles_text.absent,   label: 'Absent'   },
  late:     { badge: styles_badge.late,     text: styles_text.late,     label: 'Late'     },
  excused:  { badge: styles_badge.excused,  text: styles_text.excused,  label: 'Excused'  },
  unmarked: { badge: styles_badge.unmarked, text: styles_text.unmarked, label: 'Unmarked' },
};

// ─────────────────────────────────────────────
// Dialog content config
// ─────────────────────────────────────────────

const DIALOG_CONFIG: Record<
  Exclude<DialogType, null>,
  {
    icon: string;
    iconColor: string;
    iconBg: string;
    iconBorder: string;
    title: string;
    body: string;
    confirmLabel: string;
    confirmStyle: 'danger' | 'primary' | 'success';
    cancelLabel: string;
  }
> = {
  cancel: {
    icon: 'trash-outline',
    iconColor: '#DC2626',
    iconBg: '#FEF2F2',
    iconBorder: '#FECACA',
    title: 'Delete Meeting',
    body: 'This will permanently remove the meeting record and all attendance data. This action cannot be undone.',
    confirmLabel: 'Yes, Delete',
    confirmStyle: 'danger',
    cancelLabel: 'Keep Meeting',
  },
  save: {
    icon: 'save-outline',
    iconColor: palette.primary,
    iconBg: palette.secondarySoft,
    iconBorder: palette.secondary,
    title: 'Save Progress',
    body: 'Attendance changes will be saved. You can continue editing this meeting later.',
    confirmLabel: 'Save',
    confirmStyle: 'primary',
    cancelLabel: 'Cancel',
  },
  finalize: {
    icon: 'lock-closed-outline',
    iconColor: '#059669',
    iconBg: '#ECFDF5',
    iconBorder: '#A7F3D0',
    title: 'Finalize Roll Call',
    body: 'This will close the meeting and lock all attendance records. Students will no longer be able to check in.',
    confirmLabel: 'Finalize',
    confirmStyle: 'success',
    cancelLabel: 'Go Back',
  },
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function RollCallScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { meetingId, classId, className, section, date, time } = route.params || {};

  const [isLoading,     setIsLoading]     = useState(true);
  const [meetingStatus, setMeetingStatus] = useState('open');
  const [students,      setStudents]      = useState<StudentAttendance[]>([]);
  const [skipPresent,   setSkipPresent]   = useState(false);
  const [activeDialog,  setActiveDialog]  = useState<DialogType>(null);
  const [isProcessing,  setIsProcessing]  = useState(false);

  // ── Live attendance listener ──
  useEffect(() => {
    if (!meetingId) return;

    const unsubscribe = firestore()
      .collection('meetings')
      .doc(meetingId)
      .collection('attendance')
      .onSnapshot(
        snapshot => {
          const attendanceData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id:          doc.id,
              studentUid:  data.studentUid,
              studentName: data.studentName || 'Unknown Student',
              checkInTime: data.checkInTime || null,
              status:      data.status      || 'unmarked',
              validation:  data.validation  || '--',
            } as StudentAttendance;
          });
          setStudents(attendanceData);
          setIsLoading(false);
        },
        error => {
          console.error('Failed to load attendance:', error);
          setIsLoading(false);
        },
      );

    return () => unsubscribe();
  }, [meetingId]);

  // ── Filtered student list ──
  const visibleStudents = skipPresent
    ? students.filter(s => s.status !== 'present')
    : students;

  // ── Metrics ──
  const presentCount  = students.filter(s => s.status === 'present').length;
  const absentCount   = students.filter(s => s.status === 'absent').length;
  const lateCount     = students.filter(s => s.status === 'late').length;
  const unmarkedCount = students.filter(s => s.status === 'unmarked').length;

  // ── Dialog actions ──
  const handleConfirm = async () => {
    if (!activeDialog || isProcessing) return;
    setIsProcessing(true);

    try {
      if (activeDialog === 'cancel') {
        await firestore().collection('meetings').doc(meetingId).delete();
        setActiveDialog(null);
        navigation.goBack();

      } else if (activeDialog === 'save') {
        // Progress is already saved by Firestore real-time; this is a user acknowledgment.
        // If you have local-only edits to flush, do it here.
        setActiveDialog(null);

      } else if (activeDialog === 'finalize') {
        await firestore().collection('meetings').doc(meetingId).update({ status: 'closed' });
        setMeetingStatus('closed');
        setActiveDialog(null);
        navigation.goBack();
      }
    } catch (error) {
      console.error(`Dialog action "${activeDialog}" failed:`, error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Roll Call</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── METRICS BANNER ── */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{className || 'Unnamed Class'}</Text>
              <Text style={styles.bannerSubtitle}>Section {section || '--'} • {date}</Text>
            </View>
            <View style={styles.statusBadgeTop}>
              <Text style={styles.statusBadgeTopText}>{meetingStatus.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            {[
              { value: presentCount,  label: 'Present'  },
              { value: absentCount,   label: 'Absent'   },
              { value: lateCount,     label: 'Late'     },
              { value: unmarkedCount, label: 'Unmarked' },
            ].map(({ value, label }) => (
              <View key={label} style={styles.metricItem}>
                <Text style={styles.metricValue}>{value}</Text>
                <Text style={styles.metricLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── STUDENT LIST ── */}
        <View style={styles.listContainer}>
          <Text style={styles.listHeader}>Roster</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
          ) : visibleStudents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={palette.border} />
              <Text style={styles.emptyStateText}>
                {students.length === 0
                  ? 'No students are enrolled in this class yet.'
                  : 'All present students are filtered out.'}
              </Text>
            </View>
          ) : (
            visibleStudents.map(student => (
              <View key={student.id} style={styles.studentCard}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.studentName}</Text>
                  <Text style={styles.studentTime}>
                    {student.checkInTime
                      ? `Checked in: ${student.checkInTime}`
                      : 'No check-in recorded'}
                  </Text>
                </View>
                <StatusChip status={student.status} />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── FIXED FOOTER ── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + spacing.sm, spacing.xl) }]}>
        <View style={styles.footerTop}>
          <Text style={styles.footerToggleLabel}>Hide Present</Text>
          <Switch
            value={skipPresent}
            onValueChange={setSkipPresent}
            trackColor={{ false: palette.border, true: palette.primary }}
            thumbColor={palette.white}
          />
        </View>

        <View style={styles.footerButtons}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setActiveDialog('cancel')}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>DELETE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => setActiveDialog('save')}
            activeOpacity={0.7}
          >
            <Text style={styles.saveBtnText}>SAVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => setActiveDialog('finalize')}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>FINALIZE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CUSTOM DIALOG MODAL ── */}
      <ConfirmDialog
        visible={activeDialog !== null}
        type={activeDialog}
        isProcessing={isProcessing}
        onConfirm={handleConfirm}
        onCancel={() => !isProcessing && setActiveDialog(null)}
      />

    </View>
  );
}

// ─────────────────────────────────────────────
// StatusChip sub-component
// ─────────────────────────────────────────────

function StatusChip({ status }: { status: StudentAttendance['status'] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unmarked;
  return (
    <View style={[styles.statusBadge, cfg.badge as any]}>
      <Text style={[styles.statusBadgeText, cfg.text as any]}>
        {cfg.label.toUpperCase()}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// ConfirmDialog sub-component
// ─────────────────────────────────────────────

type ConfirmDialogProps = {
  visible: boolean;
  type: DialogType;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({ visible, type, isProcessing, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!type) return null;

  const cfg = DIALOG_CONFIG[type];

  const confirmBg =
    cfg.confirmStyle === 'danger'  ? '#DC2626' :
    cfg.confirmStyle === 'success' ? '#059669' :
    palette.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={dlg.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={dlg.sheet}>

              {/* Icon */}
              <View style={[dlg.iconWrap, { backgroundColor: cfg.iconBg, borderColor: cfg.iconBorder }]}>
                <Ionicons name={cfg.icon} size={28} color={cfg.iconColor} />
              </View>

              {/* Text */}
              <View style={dlg.textGroup}>
                <Text style={dlg.title}>{cfg.title}</Text>
                <Text style={dlg.body}>{cfg.body}</Text>
              </View>

              {/* Actions */}
              <View style={dlg.actions}>
                <TouchableOpacity
                  style={dlg.cancelBtn}
                  onPress={onCancel}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  <Text style={dlg.cancelText}>{cfg.cancelLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[dlg.confirmBtn, { backgroundColor: confirmBg }, isProcessing && dlg.confirmDisabled]}
                  onPress={onConfirm}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={dlg.confirmText}>{cfg.confirmLabel}</Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// StyleSheet
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: palette.bg,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 18,
    fontFamily: typography.primaryBold,
  },

  scrollContent: { paddingBottom: spacing.xxxl },

  // Banner
  bannerCard: {
    backgroundColor: palette.primary,
    marginHorizontal: spacing.xl,
    borderRadius: 24,
    padding: spacing.xxl,
    elevation: 6,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    marginBottom: spacing.lg,
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerTitle: {
    color: palette.white,
    fontSize: 26,
    fontFamily: typography.primaryBold,
    marginBottom: 4,
    flex: 1,
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: typography.primaryMedium,
  },
  statusBadgeTop: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  statusBadgeTopText: {
    color: palette.white,
    fontSize: 10,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xxl,
    backgroundColor: 'rgba(0,0,0,0.15)',
    padding: spacing.md,
    borderRadius: 16,
  },
  metricItem: { alignItems: 'center', gap: 2, flex: 1 },
  metricValue: { color: palette.white, fontSize: 20, fontFamily: typography.primaryBold },
  metricLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Roster
  listContainer: { flex: 1, paddingHorizontal: spacing.xl },
  listHeader: {
    color: palette.ink,
    fontSize: 18,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  emptyState: { paddingVertical: spacing.xxxl, alignItems: 'center', gap: spacing.md },
  emptyStateText: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
  },

  // Student card
  studentCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  studentInfo: { flex: 1, paddingRight: spacing.md },
  studentName: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.primaryBold,
    marginBottom: 4,
  },
  studentTime: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryMedium,
  },

  // Status badge (base — colors applied via styles_badge/styles_text maps)
  statusBadge:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusBadgeText: { fontSize: 11, fontFamily: typography.primaryBold, letterSpacing: 0.5 },

  // Footer
  footer: {
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  footerToggleLabel: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.primaryMedium,
  },
  footerButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
  saveBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
  submitBtn: {
    flex: 1.5,
    backgroundColor: palette.primary,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: palette.white,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
});

// Dialog-specific styles kept separate for clarity
const dlg = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
    alignItems: 'center',
    // thin top border for polish
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textGroup: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  title: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
  },
  body: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  cancelText: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: palette.white,
    fontSize: 15,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
});