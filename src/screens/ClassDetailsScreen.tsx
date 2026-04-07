// src/screens/ClassDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

type Meeting = {
  id: string;
  date: string;
  time: string;
  status: string;
  isRecurring: boolean;
};

type EnrolledStudent = {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  absenceCount: number;
  isWarning: boolean;
};

type AttendanceSummary = {
  studentName: string;
  present: number;
  absent: number;
  late: number;
  rate: number; // percentage 0–100
};

// ─────────────────────────────────────────────────────────────────────────────

export function ClassDetailScreen() {
  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { user, fullName } = useAuth();
  const { classId, name, section, code } = route.params || {};

  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'analysis'>('attendance');

  // Attendance tab
  const [showPastMeetings,  setShowPastMeetings]  = useState(false);
  const [meetings,          setMeetings]          = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  // Students tab
  const [enrolledStudents,    setEnrolledStudents]    = useState<EnrolledStudent[]>([]);
  const [isLoadingStudents,   setIsLoadingStudents]   = useState(true);
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);

  // Analysis tab
  const [summaries,         setSummaries]         = useState<AttendanceSummary[]>([]);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  // Meeting creation modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState(
    () => new Date().toISOString().split('T')[0].replace(/-/g, '/'),
  );
  const [meetingTime, setMeetingTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });
  const [isRecurring,     setIsRecurring]     = useState(false);
  const [recurrenceType,  setRecurrenceType]  = useState('Daily');
  const [endDate,         setEndDate]         = useState('');
  const [status,          setStatus]          = useState('Open');
  const [isSubmitting,    setIsSubmitting]    = useState(false);

  const currentYear = new Date().getFullYear();
  const academicYear = `${currentYear}–${currentYear + 1}`;

  // ── ATTENDANCE: real-time meetings listener ──────────────────────────────
  useEffect(() => {
    if (!classId || !user) return;
    const unsubscribe = firestore()
      .collection('meetings')
      .where('classId', '==', classId)
      .where('teacherUid', '==', user.uid) // <-- FIX: Added teacherUid filter for rules
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const loadedMeetings = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id:          doc.id,
              date:        data.date        || '--',
              time:        data.time        || '--',
              status:      data.status      || 'unknown',
              isRecurring: data.isRecurring || false,
            };
          });
          setMeetings(loadedMeetings);
          setIsLoadingMeetings(false);
        },
        error => {
          console.error('Failed to load meetings:', error);
          setIsLoadingMeetings(false);
        },
      );
    return () => unsubscribe();
  }, [classId, user]);

  // ── STUDENTS: real-time enrollments listener ─────────────────────────────
  useEffect(() => {
    if (!classId || !user) return;
    const unsubscribe = firestore()
      .collection('enrollments')
      .where('classId', '==', classId)
      .where('teacherUid', '==', user.uid) // <-- FIX: Added teacherUid filter for rules
      .onSnapshot(
        snapshot => {
          const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id:           doc.id,
              studentUid:   d.studentUid   || '',
              studentName:  d.studentName  || 'Unknown Student',
              studentEmail: d.studentEmail || '',
              status:       d.status       || 'pending',
              absenceCount: d.absenceCount || 0,
              isWarning:    d.isWarning    || false,
            } as EnrolledStudent;
          });
          setEnrolledStudents(data);
          setIsLoadingStudents(false);
        },
        error => {
          console.error('Failed to load enrolled students:', error);
          setIsLoadingStudents(false);
        },
      );
    return () => unsubscribe();
  }, [classId, user]);

  // ── ANALYSIS: aggregate attendance from all closed meetings ──────────────
  useEffect(() => {
    if (!classId || activeTab !== 'analysis' || !user) return;
    setIsLoadingAnalysis(true);

    const fetchAnalysis = async () => {
      try {
        const meetingsSnap = await firestore()
          .collection('meetings')
          .where('classId', '==', classId)
          .where('teacherUid', '==', user.uid) // <-- FIX: Added teacherUid filter for rules
          .where('status', '==', 'closed')
          .get();

        if (meetingsSnap.empty) {
          setSummaries([]);
          setIsLoadingAnalysis(false);
          return;
        }

        const attendanceFetches = meetingsSnap.docs.map(mDoc =>
          firestore()
            .collection('meetings')
            .doc(mDoc.id)
            .collection('attendance')
            .get(),
        );
        const attendanceResults = await Promise.all(attendanceFetches);

        const totals: Record<
          string,
          { name: string; present: number; absent: number; late: number; total: number }
        > = {};

        attendanceResults.forEach(snap => {
          snap.docs.forEach(doc => {
            const d = doc.data();
            const uid  = d.studentUid  || doc.id;
            const name = d.studentName || 'Unknown';
            if (!totals[uid]) {
              totals[uid] = { name, present: 0, absent: 0, late: 0, total: 0 };
            }
            totals[uid].total += 1;
            if (d.status === 'present')       totals[uid].present += 1;
            else if (d.status === 'absent')   totals[uid].absent  += 1;
            else if (d.status === 'late')     totals[uid].late    += 1;
          });
        });

        const result: AttendanceSummary[] = Object.values(totals)
          .map(t => ({
            studentName: t.name,
            present:     t.present,
            absent:      t.absent,
            late:        t.late,
            rate:        t.total > 0 ? Math.round((t.present / t.total) * 100) : 0,
          }))
          .sort((a, b) => a.rate - b.rate);

        setSummaries(result);
      } catch (err) {
        console.error('Failed to build analysis:', err);
      } finally {
        setIsLoadingAnalysis(false);
      }
    };

    fetchAnalysis();
  }, [classId, activeTab, user]);

  const visibleMeetings = showPastMeetings
    ? meetings
    : meetings.filter(m => m.status === 'open');

  const handleStudentAction = async (
    enrollment: EnrolledStudent,
    decision: 'approved' | 'rejected',
  ) => {
    if (processingStudentId) return;
    setProcessingStudentId(enrollment.id);
    try {
      await firestore()
        .collection('enrollments')
        .doc(enrollment.id)
        .update({ status: decision, updatedAt: firestore.FieldValue.serverTimestamp() });
    } catch (err) {
      console.error('Failed to update enrollment:', err);
      Alert.alert('Error', 'Could not update enrollment. Please try again.');
    } finally {
      setProcessingStudentId(null);
    }
  };

  const handleCreateMeeting = async () => {
    if (!meetingDate || !meetingTime) {
      Alert.alert('Required Fields', 'Please ensure date and time are set.');
      return;
    }
    if (!user) return;
    setIsSubmitting(true);
    try {
      const meetingRef = await firestore().collection('meetings').add({
        classId,
        className:      name,
        section,
        date:           meetingDate,
        time:           meetingTime,
        isRecurring,
        recurrenceType: isRecurring ? recurrenceType : null,
        endDate:        isRecurring ? endDate : null,
        status:         status.toLowerCase(),
        teacherUid:     user.uid,
        teacherName:    fullName,
        createdAt:      firestore.FieldValue.serverTimestamp(),
      });

      setShowMeetingModal(false);

      setTimeout(() => {
        navigation.navigate('RollCall', {
          meetingId: meetingRef.id,
          classId,
          className: name,
          section,
          date:      meetingDate,
          time:      meetingTime,
        });
      }, 300);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      const code = (error as { code?: string })?.code;
      if (code === 'firestore/permission-denied') {
        Alert.alert(
          'Permission denied',
          'This account is not allowed to create meetings yet. Confirm teacher approval, then sign out and sign in again.',
        );
      } else {
        Alert.alert('Error', 'Could not create the attendance record. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Overview</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Text style={styles.className}>{name || 'Unnamed Class'}</Text>
          <Text style={styles.classMeta}>
            Section: {section || '--'} | Academic Year: {academicYear}
          </Text>
          <Text style={styles.classMeta}>
            Class Code: <Text style={styles.codeHighlight}>{code || '----'}</Text>
          </Text>
        </View>

        <View style={styles.tabContainer}>
          {(['attendance', 'students', 'analysis'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  tab === 'attendance' ? 'time-outline' :
                  tab === 'students'   ? 'people-outline' :
                  'bar-chart-outline'
                }
                size={20}
                color={activeTab === tab ? palette.primary : palette.muted}
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'attendance' ? 'ATTENDANCE' : tab === 'students' ? 'STUDENTS' : 'ANALYSIS'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>

          {activeTab === 'attendance' && (
            <View style={styles.attendanceContent}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.sectionTitle}>Meetings ({meetings.length})</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Past Meetings</Text>
                  <Switch
                    value={showPastMeetings}
                    onValueChange={setShowPastMeetings}
                    trackColor={{ false: palette.border, true: palette.primary }}
                    thumbColor={palette.white}
                  />
                </View>
                <TouchableOpacity
                  style={styles.newMeetingBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowMeetingModal(true)}
                >
                  <Ionicons name="add" size={20} color={palette.white} />
                  <Text style={styles.newMeetingText}>NEW MEETING</Text>
                </TouchableOpacity>
              </View>

              {isLoadingMeetings ? (
                <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
              ) : visibleMeetings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={40} color={palette.border} />
                  <Text style={styles.emptyText}>
                    {showPastMeetings ? 'No meetings created yet.' : 'No open meetings right now.'}
                  </Text>
                </View>
              ) : (
                visibleMeetings.map(meeting => (
                  <TouchableOpacity
                    key={meeting.id}
                    style={styles.meetingCard}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate('RollCall', {
                        meetingId: meeting.id,
                        classId,
                        className: name,
                        section,
                        date: meeting.date,
                        time: meeting.time,
                      })
                    }
                  >
                    <View style={styles.meetingInfo}>
                      <Ionicons name="calendar-outline" size={20} color={palette.ink} />
                      <Text style={styles.meetingDate}>
                        {meeting.date} at {meeting.time}
                      </Text>
                      {meeting.isRecurring && (
                        <Ionicons
                          name="repeat-outline"
                          size={16}
                          color={palette.primary}
                          style={{ marginLeft: 4 }}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: meeting.status === 'open' ? '#ECFDF5' : '#FEF2F2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: meeting.status === 'open' ? '#059669' : '#DC2626' },
                        ]}
                      >
                        {meeting.status.toUpperCase()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {activeTab === 'students' && (
            <View>
              {isLoadingStudents ? (
                <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
              ) : enrolledStudents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={40} color={palette.border} />
                  <Text style={styles.emptyText}>No students enrolled yet.</Text>
                </View>
              ) : (
                enrolledStudents.map(student => (
                  <View key={student.id} style={styles.studentCard}>
                    <View style={styles.studentInfo}>
                      <View style={styles.studentNameRow}>
                        <Text style={styles.studentName}>{student.studentName}</Text>
                        {student.isWarning && (
                          <Ionicons name="warning" size={14} color="#D97706" style={{ marginLeft: 6 }} />
                        )}
                      </View>
                      <Text style={styles.studentEmail}>{student.studentEmail}</Text>
                      {student.status === 'approved' && (
                        <Text style={styles.studentAbsences}>
                          {student.absenceCount} absence{student.absenceCount !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>

                    {student.status === 'pending' ? (
                      <View style={styles.studentActions}>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          disabled={processingStudentId === student.id}
                          onPress={() => handleStudentAction(student, 'rejected')}
                        >
                          <Ionicons name="close-outline" size={16} color={palette.ink} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          disabled={processingStudentId === student.id}
                          onPress={() => handleStudentAction(student, 'approved')}
                        >
                          <Ionicons name="checkmark-outline" size={16} color={palette.white} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.enrollStatusPill,
                          student.status === 'approved'
                            ? styles.enrollStatusApproved
                            : styles.enrollStatusRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.enrollStatusText,
                            { color: student.status === 'approved' ? '#059669' : '#DC2626' },
                          ]}
                        >
                          {student.status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {activeTab === 'analysis' && (
            <View>
              {isLoadingAnalysis ? (
                <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
              ) : summaries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={40} color={palette.border} />
                  <Text style={styles.emptyText}>
                    No closed meetings yet. Finalize a roll call to see analysis.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.analysisSubtitle}>
                    Based on {meetings.filter(m => m.status === 'closed').length} closed meeting
                    {meetings.filter(m => m.status === 'closed').length !== 1 ? 's' : ''}
                  </Text>
                  {summaries.map((s, i) => (
                    <View key={i} style={styles.analysisCard}>
                      <View style={styles.analysisNameRow}>
                        <Text style={styles.analysisName}>{s.studentName}</Text>
                        <Text
                          style={[
                            styles.analysisRate,
                            { color: s.rate >= 80 ? '#059669' : s.rate >= 60 ? '#D97706' : '#DC2626' },
                          ]}
                        >
                          {s.rate}%
                        </Text>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${s.rate}%` as any,
                              backgroundColor:
                                s.rate >= 80 ? '#059669' : s.rate >= 60 ? '#D97706' : '#DC2626',
                            },
                          ]}
                        />
                      </View>

                      <View style={styles.analysisPillRow}>
                        <View style={[styles.miniPill, { backgroundColor: '#ECFDF5' }]}>
                          <Text style={[styles.miniPillText, { color: '#059669' }]}>
                            {s.present} present
                          </Text>
                        </View>
                        <View style={[styles.miniPill, { backgroundColor: '#FEF2F2' }]}>
                          <Text style={[styles.miniPillText, { color: '#DC2626' }]}>
                            {s.absent} absent
                          </Text>
                        </View>
                        <View style={[styles.miniPill, { backgroundColor: '#FFFBEB' }]}>
                          <Text style={[styles.miniPillText, { color: '#D97706' }]}>
                            {s.late} late
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── CREATE ATTENDANCE RECORD MODAL ── */}
      <Modal
        visible={showMeetingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMeetingModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowMeetingModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Create Attendance Record</Text>
                    <Text style={styles.modalSubtitle}>{name} - Section {section}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowMeetingModal(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={26} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContentWrapper}>
                  <View style={styles.inputRow}>
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>Date</Text>
                      <View style={styles.inputFieldBox}>
                        <TextInput
                          style={styles.inputText}
                          value={meetingDate}
                          onChangeText={setMeetingDate}
                        />
                        <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                      </View>
                    </View>

                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>Time</Text>
                      <View style={styles.inputFieldBox}>
                        <TextInput
                          style={styles.inputText}
                          value={meetingTime}
                          onChangeText={setMeetingTime}
                        />
                        <Ionicons name="time-outline" size={20} color={palette.muted} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.modalToggleRow}>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: palette.border, true: palette.primary }}
                      thumbColor={palette.white}
                    />
                    <Text style={styles.modalToggleLabel}>Recurring Meeting</Text>
                  </View>

                  {isRecurring && (
                    <View style={styles.inputRow}>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Recurrence Type</Text>
                        <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7}>
                          <Text style={styles.inputText}>{recurrenceType}</Text>
                          <Ionicons name="caret-down" size={16} color={palette.muted} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>End Date</Text>
                        <View style={styles.inputFieldBox}>
                          <TextInput
                            style={styles.inputText}
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="YYYY/MM/DD"
                            placeholderTextColor={palette.muted}
                          />
                          <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.inputWrapSingle}>
                    <Text style={styles.inputLabel}>Status</Text>
                    <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7}>
                      <Text style={styles.inputText}>{status}</Text>
                      <Ionicons name="caret-down" size={16} color={palette.muted} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Attendance Record Details:</Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryBold}>Class:</Text> {name}
                    </Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryBold}>Date & Time:</Text> {meetingDate} {meetingTime}
                    </Text>
                    {isRecurring && (
                      <Text style={styles.summaryText}>
                        <Text style={styles.summaryBold}>Recurrence:</Text> {recurrenceType} until{' '}
                        {endDate || 'Not set'}
                      </Text>
                    )}
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryBold}>Status:</Text> {status}
                    </Text>
                    <Text style={styles.summaryText}>
                      <Text style={styles.summaryBold}>Teacher:</Text> {fullName}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    onPress={() => setShowMeetingModal(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.createBtn}
                    onPress={handleCreateMeeting}
                    activeOpacity={0.85}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={palette.white} />
                    ) : (
                      <Text style={styles.createBtnText}>CREATE RECORD</Text>
                    )}
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: palette.bg,
  },
  headerTitle: { color: palette.ink, fontSize: 18, fontFamily: typography.primaryBold },
  infoCard: { padding: spacing.xl, backgroundColor: palette.bg },
  className: { color: palette.ink, fontSize: 32, fontFamily: typography.primaryBold, marginBottom: spacing.xs },
  classMeta: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryMedium, marginBottom: 4 },
  codeHighlight: { color: palette.ink, fontFamily: typography.primaryBold },

  // Tabs
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: spacing.xl },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingVertical: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: spacing.xs },
  tabButtonActive: { borderBottomColor: palette.primary },
  tabText: { color: palette.muted, fontSize: 10, fontFamily: typography.primaryBold, letterSpacing: 0.5, textAlign: 'center' },
  tabTextActive: { color: palette.primary },

  content: { padding: spacing.xl },
  attendanceContent: { flex: 1 },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xxxl },
  sectionTitle: { color: palette.ink, fontSize: 20, fontFamily: typography.primaryMedium },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryMedium },
  newMeetingBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: palette.primary, paddingVertical: 10, paddingHorizontal: spacing.xl, borderRadius: 100, gap: spacing.xs },
  newMeetingText: { color: palette.white, fontFamily: typography.primaryBold, fontSize: 13, letterSpacing: 0.5 },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: spacing.md },
  emptyText: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular, textAlign: 'center' },

  // Meeting cards
  meetingCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: spacing.lg, backgroundColor: palette.white,
    borderRadius: 12, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.md,
    shadowColor: palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  meetingInfo: { flexDirection: 'row', alignItems: 'center' },
  meetingDate: { color: palette.ink, fontSize: 15, fontFamily: typography.primaryBold, marginLeft: spacing.sm },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusText: { fontSize: 10, fontFamily: typography.primaryBold, letterSpacing: 0.5 },

  // Student cards
  studentCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: palette.white, borderRadius: 16,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: palette.border,
    elevation: 1, shadowColor: palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4,
  },
  studentInfo: { flex: 1, paddingRight: spacing.md },
  studentNameRow: { flexDirection: 'row', alignItems: 'center' },
  studentName: { color: palette.ink, fontSize: 16, fontFamily: typography.primaryBold },
  studentEmail: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryRegular, marginTop: 2 },
  studentAbsences: { color: palette.muted, fontSize: 12, fontFamily: typography.primaryMedium, marginTop: 2 },
  studentActions: { flexDirection: 'row', gap: spacing.sm },
  rejectBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border,
    alignItems: 'center', justifyContent: 'center',
  },
  approveBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: palette.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  enrollStatusPill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 100 },
  enrollStatusApproved: { backgroundColor: '#ECFDF5' },
  enrollStatusRejected: { backgroundColor: '#FEF2F2' },
  enrollStatusText: { fontSize: 11, fontFamily: typography.primaryBold, letterSpacing: 0.5 },

  // Analysis cards
  analysisSubtitle: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryRegular, marginBottom: spacing.lg },
  analysisCard: {
    backgroundColor: palette.white, borderRadius: 16,
    padding: spacing.lg, marginBottom: spacing.md,
    borderWidth: 1, borderColor: palette.border,
    gap: spacing.sm,
    elevation: 1, shadowColor: palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4,
  },
  analysisNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  analysisName: { color: palette.ink, fontSize: 16, fontFamily: typography.primaryBold, flex: 1 },
  analysisRate: { fontSize: 18, fontFamily: typography.primaryBold },
  progressTrack: { height: 6, backgroundColor: palette.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  analysisPillRow: { flexDirection: 'row', gap: spacing.sm },
  miniPill: { paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: 100 },
  miniPillText: { fontSize: 11, fontFamily: typography.primaryBold },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxHeight: '85%', backgroundColor: palette.white, borderRadius: 20, padding: spacing.xxl, elevation: 24, shadowColor: palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  modalTitleContainer: { flex: 1, paddingRight: spacing.md },
  modalTitle: { color: palette.ink, fontSize: 22, fontFamily: typography.primaryBold, marginBottom: 4 },
  modalSubtitle: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryMedium },
  modalContentWrapper: { marginBottom: spacing.md },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.sm },
  inputWrap: { flex: 1 },
  inputWrapSingle: { marginBottom: spacing.xs },
  inputLabel: { color: palette.muted, fontSize: 12, fontFamily: typography.primaryMedium, marginBottom: spacing.xs },
  inputFieldBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: palette.white, height: 48 },
  inputText: { flex: 1, color: palette.ink, fontFamily: typography.primaryRegular, fontSize: 15, paddingVertical: 0 },
  modalToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  modalToggleLabel: { color: palette.ink, fontSize: 15, fontFamily: typography.primaryMedium },
  dropdownBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: palette.white, height: 48 },
  summaryBox: { backgroundColor: palette.bg, padding: spacing.lg, borderRadius: 8, marginTop: spacing.sm },
  summaryTitle: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryBold, marginBottom: spacing.xs },
  summaryText: { color: palette.ink, fontSize: 14, fontFamily: typography.primaryRegular, lineHeight: 22 },
  summaryBold: { fontFamily: typography.primaryBold },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  cancelBtnText: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
  createBtn: { backgroundColor: palette.primary, height: 40, paddingHorizontal: spacing.xl, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: palette.white, fontSize: 13, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
});