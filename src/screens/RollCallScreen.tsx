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
// Dialog content config (Strict Palette)
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
          console.warn('Failed to load attendance:', error.message);
          setIsLoading(false);
        },
      );

    return () => unsubscribe();
  }, [meetingId]);

  // ── Filtered student list ──
  const visibleStudents = useMemo(
    () => (skipPresent ? students.filter(s => s.status !== 'present') : students),
    [skipPresent, students]
  );

  // Single-pass counters to avoid repeated full-array scans.
  const metrics = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        if (student.status === 'present') acc.present += 1;
        if (student.status === 'absent') acc.absent += 1;
        if (student.status === 'late') acc.late += 1;
        if (student.status === 'unmarked') acc.unmarked += 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0, unmarked: 0 }
    );
  }, [students]);

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
        <View style={styles.classCardWrapper}>
          <View style={styles.classCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.classCardTitle}>{className || 'Unnamed Class'}</Text>
              <Text style={styles.classCardSubtitle}>Section {section || '--'} • {date}</Text>
            </View>
            <View style={[styles.statusBadgeTop, meetingStatus === 'open' ? styles.bannerStatusOpen : styles.bannerStatusClosed]}>
              <Text style={[styles.statusBadgeTopText, meetingStatus === 'open' ? styles.bannerTextOpen : styles.bannerTextClosed]}>
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
               <TouchableOpacity style={styles.cancelBtnOutline} onPress={() => setActiveDialog('cancel')}>
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
    cfg.confirmStyle === 'primary' ? palette.primary : palette.ink;

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

