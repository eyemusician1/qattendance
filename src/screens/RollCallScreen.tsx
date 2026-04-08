// src/screens/RollCallScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
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
import { useAuth } from '../context/AuthContext';
import { dlg, styles } from './styles/RollCallScreen.styles';

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
// Strict Palette Helpers (60:30:10 Rule)
// ─────────────────────────────────────────────

const styles_badge = {
  present:  { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border },
  absent:   { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.primary },
  late:     { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.ink },
  excused:  { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border },
  unmarked: { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border },
};

const styles_text = {
  present:  { color: palette.ink },
  absent:   { color: palette.primary },
  late:     { color: palette.ink },
  excused:  { color: palette.muted },
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
    confirmStyle: 'primary' | 'ink';
    cancelLabel: string;
  }
> = {
  cancel: {
    icon: 'trash-outline',
    iconColor: palette.ink,
    iconBg: palette.bg,
    iconBorder: palette.border,
    title: 'Delete Meeting',
    body: 'This will permanently remove the meeting record and all attendance data. This action cannot be undone.',
    confirmLabel: 'Delete',
    confirmStyle: 'ink',
    cancelLabel: 'Keep Meeting',
  },
  save: {
    icon: 'save-outline',
    iconColor: palette.ink,
    iconBg: palette.white,
    iconBorder: palette.ink,
    title: 'Save Progress',
    body: 'Attendance changes will be saved. You can continue editing this meeting later.',
    confirmLabel: 'Save',
    confirmStyle: 'ink',
    cancelLabel: 'Cancel',
  },
  finalize: {
    icon: 'lock-closed-outline',
    iconColor: palette.primary,
    iconBg: palette.white,
    iconBorder: palette.primary,
    title: 'Finalize Roll Call',
    body: 'This will close the meeting and lock all attendance records. Students will no longer be able to check in.',
    confirmLabel: 'Finalize',
    confirmStyle: 'primary',
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

  // FIX: pull the authenticated user so we can patch legacy teacherUid docs
  const { user } = useAuth();

  const { meetingId, classId, className, section, date, time } = route.params || {};

  const [isLoading,     setIsLoading]     = useState(true);
  const [meetingStatus, setMeetingStatus] = useState('open');
  const [students,      setStudents]      = useState<StudentAttendance[]>([]);
  const [skipPresent,   setSkipPresent]   = useState(false);
  const [activeDialog,  setActiveDialog]  = useState<DialogType>(null);
  const [isProcessing,  setIsProcessing]  = useState(false);
  // Stores a human-readable error to show inside the dialog instead of crashing
  const [dialogError,   setDialogError]   = useState<string | null>(null);

  // ── Live attendance listener ──────────────────────────────────────────────
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
          console.warn('Failed to load attendance:', error.message);
          setIsLoading(false);
        },
      );

    return () => unsubscribe();
  }, [meetingId]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const visibleStudents = students;

  const metrics = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        if (student.status === 'present')  acc.present  += 1;
        if (student.status === 'absent')   acc.absent   += 1;
        if (student.status === 'late')     acc.late     += 1;
        if (student.status === 'unmarked') acc.unmarked += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0, unmarked: 0 },
    );
  }, [students]);

  // ── Dialog actions ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!activeDialog || isProcessing) return;
    setIsProcessing(true);
    setDialogError(null);

    try {
      const meetingRef = firestore().collection('meetings').doc(meetingId);

      if (activeDialog === 'cancel') {
        await meetingRef.delete();
        setActiveDialog(null);
        navigation.goBack();

      } else if (activeDialog === 'save') {
        // Attendance is already persisted in real-time via Firestore.
        // Nothing extra to flush — just dismiss the dialog.
        setActiveDialog(null);

      } else if (activeDialog === 'finalize') {

        // ── STEP 1: Self-heal the teacherUid field if it still holds the
        //    legacy display-name string instead of the real uid.
        //    This ensures the Firestore rule  `resource.data.teacherUid == request.auth.uid`
        //    passes on the very next write, even before re-deploying the updated rules.
        if (user) {
          const meetingSnap = await meetingRef.get();
          const stored = meetingSnap.data()?.teacherUid;
          if (stored && stored !== user.uid) {
            // Overwrite with the real uid so rules evaluate correctly from now on.
            await meetingRef.update({
              teacherUid:  user.uid,
              teacherName: stored, // preserve the original display name for reference
            });
          }
        }

        // ── STEP 2: Mark all still-unmarked students as absent (not present)
        //    before locking the record.
        const attSnap = await meetingRef
          .collection('attendance')
          .where('status', '==', 'unmarked')
          .get();

        if (!attSnap.empty) {
          const batch = firestore().batch();
          attSnap.docs.forEach(doc => {
            batch.update(doc.ref, {
              status:    'absent',
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
        }

        // ── STEP 3: Close the meeting
        await meetingRef.update({
          status:    'closed',
          closedAt:  firestore.FieldValue.serverTimestamp(),
        });

        setMeetingStatus('closed');
        setActiveDialog(null);
        navigation.goBack();
      }

    } catch (error: any) {
      const msg: string = error?.message ?? String(error);
      console.error(`Dialog action "${activeDialog}" failed:`, msg);

      // Determine a user-friendly message based on the Firestore error code
      if (msg.includes('permission-denied') || msg.includes('firestore/p')) {
        setDialogError(
          'Permission denied. Your session may have expired — please sign out and sign back in, then try again.',
        );
      } else if (msg.includes('not-found')) {
        setDialogError('Meeting record not found. It may have already been deleted.');
      } else {
        setDialogError('Something went wrong. Please check your connection and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
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
        <View style={styles.classCardWrapper}>
          <View style={styles.classCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.classCardTitle}>{className || 'Unnamed Class'}</Text>
              <Text style={styles.classCardSubtitle}>Section {section || '--'} • {date}</Text>
            </View>
            <View style={[
              styles.statusBadgeTop,
              meetingStatus === 'open' ? styles.bannerStatusOpen : styles.bannerStatusClosed,
            ]}>
              <Text style={[
                styles.statusBadgeTopText,
                meetingStatus === 'open' ? styles.bannerTextOpen : styles.bannerTextClosed,
              ]}>
                {meetingStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.metricsDivider} />

          <View style={styles.metricsRow}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{metrics.present}</Text>
              <Text style={styles.metricLabel}>PRESENT</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{metrics.absent}</Text>
              <Text style={styles.metricLabel}>ABSENT</Text>
            </View>
            <View style={styles.metricBlock}>
              <Text style={styles.metricValue}>{metrics.late}</Text>
              <Text style={styles.metricLabel}>LATE</Text>
            </View>
            <View style={styles.metricBlockLast}>
              <TouchableOpacity
                style={styles.cancelBtnOutline}
                onPress={() => setActiveDialog('cancel')}
              >
                <Ionicons name="trash-outline" size={16} color={palette.ink} />
                <Text style={styles.cancelBtnOutlineText}>CANCEL</Text>
              </TouchableOpacity>
            </View>
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
                {!(skipPresent && student.status === 'present') && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <StatusChip status={student.status} />
                    {meetingStatus === 'open'
                      && student.status !== 'late'
                      && student.status !== 'absent' && (
                      <TouchableOpacity
                        style={{
                          marginLeft: 4, paddingVertical: 4, paddingHorizontal: 10,
                          borderRadius: 12, backgroundColor: palette.primary,
                        }}
                        onPress={async () => {
                          try {
                            await firestore()
                              .collection('meetings')
                              .doc(meetingId)
                              .collection('attendance')
                              .doc(student.studentUid)
                              .update({ status: 'late' });
                          } catch (e) {
                            // silent — will surface on next sync
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: palette.white, fontSize: 12 }}>Mark Late</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
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
            style={[styles.actionBtn, { backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionBtnText, { color: palette.ink }]}>BACK</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.ink }]}
            onPress={() => setActiveDialog('save')}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>SAVE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: palette.primary }]}
            onPress={() => setActiveDialog('finalize')}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>SUBMIT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── CUSTOM DIALOG MODAL ── */}
      <ConfirmDialog
        visible={activeDialog !== null}
        type={activeDialog}
        isProcessing={isProcessing}
        errorMessage={dialogError}
        onConfirm={handleConfirm}
        onCancel={() => {
          if (!isProcessing) {
            setActiveDialog(null);
            setDialogError(null);
          }
        }}
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
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({
  visible,
  type,
  isProcessing,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!type) return null;

  const cfg = DIALOG_CONFIG[type];
  const confirmBg = cfg.confirmStyle === 'primary' ? palette.primary : palette.ink;

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

              {/* Inline error message — shown only when the action failed */}
              {errorMessage && (
                <View style={dlg.errorBox}>
                  <Ionicons name="warning-outline" size={16} color={palette.primary} style={{ flexShrink: 0 }} />
                  <Text style={dlg.errorText}>{errorMessage}</Text>
                </View>
              )}

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
                  style={[
                    dlg.confirmBtn,
                    { backgroundColor: confirmBg },
                    isProcessing && dlg.confirmDisabled,
                  ]}
                  onPress={onConfirm}
                  disabled={isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={dlg.confirmText}>
                      {errorMessage ? 'Retry' : cfg.confirmLabel}
                    </Text>
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