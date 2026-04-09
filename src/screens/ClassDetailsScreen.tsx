// src/screens/ClassDetailsScreen.tsx
//
// FIX: @react-native-community/datetimepicker is NOT linked in the native
// binary for this project (RN 0.76 New Architecture). Neither the component
// nor the imperative DateTimePickerAndroid.open() API work.
//
// Solution: removed the package import entirely and replaced the date/time
// fields with lightweight masked TextInput components that auto-format as the
// user types — zero native dependencies required.

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
  Platform,
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
  rate: number;
};

// ─── Masked input helpers ─────────────────────────────────────────────────────
//
// These replace @react-native-community/datetimepicker entirely.
// As the user types digits the slashes / colons are inserted automatically.
//
// Date mask: YYYY/MM/DD
// Time mask: HH:MM

function applyDateMask(raw: string): string {
  // Strip everything that isn't a digit
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  if (digits.length <= 4) return y;
  if (digits.length <= 6) return `${y}/${m}`;
  return `${y}/${m}/${d}`;
}

function applyTimeMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  const h = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  if (digits.length <= 2) return h;
  return `${h}:${m}`;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// ─────────────────────────────────────────────────────────────────────────────

export function ClassDetailScreen() {
  const [showRecurrenceDropdown, setShowRecurrenceDropdown] = useState(false);
  const [showStatusDropdown,     setShowStatusDropdown]     = useState(false);
  const recurrenceOptions = ['Daily', 'Weekly'];
  const statusOptions     = ['Open', 'Concluded'];

  const insets     = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const { user, fullName } = useAuth();
  const { classId, name, section, code } = route.params || {};

  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'analysis'>('attendance');

  const [showPastMeetings,  setShowPastMeetings]  = useState(false);
  const [meetings,          setMeetings]          = useState<Meeting[]>([]);
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true);

  const [enrolledStudents,    setEnrolledStudents]    = useState<EnrolledStudent[]>([]);
  const [isLoadingStudents,   setIsLoadingStudents]   = useState(true);
  const [processingStudentId, setProcessingStudentId] = useState<string | null>(null);

  const [summaries,         setSummaries]         = useState<AttendanceSummary[]>([]);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);

  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Date/time stored as formatted strings — populated with today's values
  const [meetingDate, setMeetingDate] = useState(
    () => new Date().toISOString().split('T')[0].replace(/-/g, '/'),
  );
  const [meetingTime, setMeetingTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  // Validation error messages shown below the fields
  const [dateError, setDateError] = useState('');
  const [timeError, setTimeError] = useState('');

  const [isRecurring,    setIsRecurring]    = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('Daily');
  const [endDate,        setEndDate]        = useState('');
  const [status,         setStatus]         = useState('Open');
  const [isSubmitting,   setIsSubmitting]   = useState(false);

  const currentYear  = new Date().getFullYear();
  const academicYear = `${currentYear}–${currentYear + 1}`;

  // ── Meetings listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!classId || !user) return;
    const unsubscribe = firestore()
      .collection('meetings')
      .where('classId', '==', classId)
      .where('teacherUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          setMeetings(snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id:          doc.id,
              date:        d.date        || '--',
              time:        d.time        || '--',
              status:      d.status      || 'unknown',
              isRecurring: d.isRecurring || false,
            };
          }));
          setIsLoadingMeetings(false);
        },
        error => {
          console.error('Failed to load meetings:', error);
          setIsLoadingMeetings(false);
        },
      );
    return () => unsubscribe();
  }, [classId, user]);

  // ── Enrollments listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!classId || !user) return;
    const unsubscribe = firestore()
      .collection('enrollments')
      .where('classId', '==', classId)
      .onSnapshot(
        snapshot => {
          setEnrolledStudents(
            snapshot.docs.map(doc => {
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
            }),
          );
          setIsLoadingStudents(false);
        },
        error => {
          console.error('Failed to load enrolled students:', error);
          setIsLoadingStudents(false);
        },
      );
    return () => unsubscribe();
  }, [classId, user]);

  // ── Analysis fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!classId || activeTab !== 'analysis' || !user) return;
    setIsLoadingAnalysis(true);

    (async () => {
      try {
        const meetingsSnap = await firestore()
          .collection('meetings')
          .where('classId', '==', classId)
          .where('teacherUid', '==', user.uid)
          .where('status', '==', 'closed')
          .get();

        if (meetingsSnap.empty) { setSummaries([]); return; }

        const allAttendance = await Promise.all(
          meetingsSnap.docs.map(m =>
            firestore().collection('meetings').doc(m.id).collection('attendance').get(),
          ),
        );

        const totals: Record<string, { name: string; present: number; absent: number; late: number; total: number }> = {};
        allAttendance.forEach(snap =>
          snap.docs.forEach(doc => {
            const d   = doc.data();
            const uid = d.studentUid || doc.id;
            if (!totals[uid]) totals[uid] = { name: d.studentName || 'Unknown', present: 0, absent: 0, late: 0, total: 0 };
            totals[uid].total += 1;
            if (d.status === 'present')     totals[uid].present += 1;
            else if (d.status === 'absent') totals[uid].absent  += 1;
            else if (d.status === 'late')   totals[uid].late    += 1;
          }),
        );

        setSummaries(
          Object.values(totals)
            .map(t => ({ studentName: t.name, present: t.present, absent: t.absent, late: t.late, rate: t.total > 0 ? Math.round((t.present / t.total) * 100) : 0 }))
            .sort((a, b) => a.rate - b.rate),
        );
      } catch (err) {
        console.error('Failed to build analysis:', err);
      } finally {
        setIsLoadingAnalysis(false);
      }
    })();
  }, [classId, activeTab, user]);

  const visibleMeetings      = showPastMeetings ? meetings : meetings.filter(m => m.status === 'open');
  const pendingStudentsCount = enrolledStudents.filter(s => s.status === 'pending').length;

  // ── Student action ────────────────────────────────────────────────────────
  const handleStudentAction = async (enrollment: EnrolledStudent, decision: 'approved' | 'rejected') => {
    if (processingStudentId) return;
    setProcessingStudentId(enrollment.id);
    try {
      await firestore().collection('enrollments').doc(enrollment.id).update({
        status: decision, updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      const code = (err as { code?: string })?.code;
      Alert.alert('Error', code === 'firestore/permission-denied'
        ? 'Permission denied. Ensure your teacher role is approved.'
        : 'Could not update enrollment. Please try again.');
    } finally {
      setProcessingStudentId(null);
    }
  };

  // ── Create meeting ────────────────────────────────────────────────────────
  const handleCreateMeeting = async () => {
    // Validate before submitting
    let valid = true;
    if (!isValidDate(meetingDate)) {
      setDateError('Enter a valid date: YYYY/MM/DD');
      valid = false;
    } else {
      setDateError('');
    }
    if (!isValidTime(meetingTime)) {
      setTimeError('Enter a valid time: HH:MM (24h)');
      valid = false;
    } else {
      setTimeError('');
    }
    if (!valid || !user) return;

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

      // Auto-populate attendance for all approved students
      const enrollSnap = await firestore()
        .collection('enrollments')
        .where('classId', '==', classId)
        .where('status', '==', 'approved')
        .get();

      const batch = firestore().batch();
      enrollSnap.docs.forEach(doc => {
        const d = doc.data();
        batch.set(
          firestore().collection('meetings').doc(meetingRef.id).collection('attendance').doc(d.studentUid),
          { studentUid: d.studentUid, studentName: d.studentName || 'Unknown Student', status: 'unmarked', checkInTime: null, validation: '' },
        );
      });
      await batch.commit();

      setShowMeetingModal(false);
      setTimeout(() => {
        navigation.navigate('RollCall', { meetingId: meetingRef.id, classId, className: name, section, date: meetingDate, time: meetingTime });
      }, 300);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      Alert.alert('Error', 'Could not create the attendance record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Overview</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Class info */}
        <View style={styles.infoCard}>
          <Text style={styles.className}>{name || 'Unnamed Class'}</Text>
          <Text style={styles.classMeta}>Section: {section || '--'} | Academic Year: {academicYear}</Text>
          <Text style={styles.classMeta}>Class Code: <Text style={styles.codeHighlight}>{code || '----'}</Text></Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {(['attendance', 'students', 'analysis'] as const).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
              <View style={styles.tabIconWrap}>
                <Ionicons
                  name={tab === 'attendance' ? 'time-outline' : tab === 'students' ? 'people-outline' : 'bar-chart-outline'}
                  size={20}
                  color={activeTab === tab ? palette.primary : palette.muted}
                />
                {tab === 'students' && pendingStudentsCount > 0 && (
                  <View style={styles.tabNotifBadge}>
                    <Text style={styles.tabNotifText}>{pendingStudentsCount > 9 ? '9+' : String(pendingStudentsCount)}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'attendance' ? 'ATTENDANCE' : tab === 'students' ? 'STUDENTS' : 'ANALYSIS'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>

          {/* ── ATTENDANCE TAB ── */}
          {activeTab === 'attendance' && (
            <View style={styles.attendanceContent}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.sectionTitle}>Meetings ({meetings.length})</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Past Meetings</Text>
                  <Switch value={showPastMeetings} onValueChange={setShowPastMeetings} trackColor={{ false: palette.border, true: palette.primary }} thumbColor={palette.white} />
                </View>
              </View>

              {isLoadingMeetings ? (
                <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
              ) : visibleMeetings.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={40} color={palette.border} />
                  <Text style={styles.emptyText}>{showPastMeetings ? 'No meetings created yet.' : 'No open meetings right now.'}</Text>
                </View>
              ) : (
                visibleMeetings.map(meeting => (
                  <TouchableOpacity
                    key={meeting.id}
                    style={styles.meetingCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('RollCall', { meetingId: meeting.id, classId, className: name, section, date: meeting.date, time: meeting.time })}
                  >
                    <View style={styles.meetingInfo}>
                      <View style={styles.meetingIconBox}>
                        <Ionicons name="calendar" size={24} color={meeting.status === 'open' ? palette.primary : palette.ink} />
                      </View>
                      <View>
                        <Text style={styles.meetingDate}>{meeting.date}</Text>
                        <Text style={styles.meetingTime}>{meeting.time}{meeting.isRecurring ? ' • Recurring' : ''}</Text>
                      </View>
                    </View>
                    <View style={[styles.badgeBase, meeting.status === 'open' ? styles.badgePrimary : styles.badgeNeutral]}>
                      <Text style={[styles.badgeBaseText, meeting.status === 'open' ? styles.badgePrimaryText : styles.badgeNeutralText]}>{meeting.status.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ── STUDENTS TAB ── */}
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
                      <Text style={styles.studentName}>{student.studentName}</Text>
                      <Text style={styles.studentEmail}>{student.studentEmail}</Text>
                      {student.status === 'approved' && (
                        <Text style={styles.studentAbsences}>{student.absenceCount} absence{student.absenceCount !== 1 ? 's' : ''}</Text>
                      )}
                    </View>
                    {student.status === 'pending' ? (
                      <View style={styles.studentActions}>
                        <TouchableOpacity style={styles.rejectBtn} disabled={processingStudentId === student.id} onPress={() => handleStudentAction(student, 'rejected')}>
                          <Ionicons name="close-outline" size={16} color={palette.ink} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.approveBtn} disabled={processingStudentId === student.id} onPress={() => handleStudentAction(student, 'approved')}>
                          <Ionicons name="checkmark-outline" size={16} color={palette.white} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={[styles.badgeBase, student.status === 'approved' ? styles.badgePrimary : styles.badgeNeutral]}>
                        <Text style={[styles.badgeBaseText, student.status === 'approved' ? styles.badgePrimaryText : styles.badgeNeutralText]}>{student.status.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* ── ANALYSIS TAB ── */}
          {activeTab === 'analysis' && (
            <View>
              {isLoadingAnalysis ? (
                <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: 40 }} />
              ) : summaries.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={40} color={palette.border} />
                  <Text style={styles.emptyText}>No closed meetings yet. Finalize a roll call to see analysis.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.analysisSubtitle}>
                    Based on {meetings.filter(m => m.status === 'closed').length} closed meeting{meetings.filter(m => m.status === 'closed').length !== 1 ? 's' : ''}
                  </Text>
                  {summaries.map((s, i) => (
                    <View key={i} style={styles.analysisCard}>
                      <View style={styles.analysisNameRow}>
                        <Text style={styles.analysisName}>{s.studentName}</Text>
                        <Text style={[styles.analysisRate, { color: s.rate >= 80 ? palette.primary : s.rate >= 60 ? palette.ink : palette.muted }]}>{s.rate}%</Text>
                      </View>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${s.rate}%` as any, backgroundColor: s.rate >= 80 ? palette.primary : s.rate >= 60 ? palette.ink : palette.muted }]} />
                      </View>
                      <View style={styles.analysisPillRow}>
                        <View style={[styles.badgeBase, styles.badgePrimary]}><Text style={[styles.badgeBaseText, styles.badgePrimaryText]}>{s.present} present</Text></View>
                        <View style={[styles.badgeBase, styles.badgeNeutral]}><Text style={[styles.badgeBaseText, styles.badgeNeutralText]}>{s.absent} absent</Text></View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      {activeTab === 'attendance' && (
        <TouchableOpacity style={[styles.extendedFab, { bottom: Math.max(insets.bottom + 24, spacing.xl) }]} activeOpacity={0.85} onPress={() => setShowMeetingModal(true)}>
          <Ionicons name="add" size={22} color={palette.white} />
          <Text style={styles.extendedFabText}>New Meeting</Text>
        </TouchableOpacity>
      )}

      {/* ── CREATE ATTENDANCE MODAL ── */}
      <Modal visible={showMeetingModal} transparent animationType="fade" onRequestClose={() => setShowMeetingModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMeetingModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>

                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Create Attendance Record</Text>
                    <Text style={styles.modalSubtitle}>{name} - Section {section}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowMeetingModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={26} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContentWrapper}>

                  {/* ── Date + Time ── */}
                  <View style={styles.inputRow}>

                    {/* Date — masked input, auto-inserts slashes */}
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>Date</Text>
                      <View style={[styles.inputFieldBox, !!dateError && styles.inputFieldBoxError]}>
                        <Ionicons name="calendar-outline" size={18} color={dateError ? palette.primary : palette.muted} style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.inputText}
                          value={meetingDate}
                          onChangeText={raw => {
                            setMeetingDate(applyDateMask(raw));
                            setDateError('');
                          }}
                          placeholder="YYYY/MM/DD"
                          placeholderTextColor={palette.muted}
                          keyboardType="number-pad"
                          maxLength={10}
                          returnKeyType="done"
                        />
                      </View>
                      {!!dateError && <Text style={styles.fieldError}>{dateError}</Text>}
                    </View>

                    {/* Time — masked input, auto-inserts colon */}
                    <View style={styles.inputWrap}>
                      <Text style={styles.inputLabel}>Time</Text>
                      <View style={[styles.inputFieldBox, !!timeError && styles.inputFieldBoxError]}>
                        <Ionicons name="time-outline" size={18} color={timeError ? palette.primary : palette.muted} style={{ marginRight: 6 }} />
                        <TextInput
                          style={styles.inputText}
                          value={meetingTime}
                          onChangeText={raw => {
                            setMeetingTime(applyTimeMask(raw));
                            setTimeError('');
                          }}
                          placeholder="HH:MM"
                          placeholderTextColor={palette.muted}
                          keyboardType="number-pad"
                          maxLength={5}
                          returnKeyType="done"
                        />
                      </View>
                      {!!timeError && <Text style={styles.fieldError}>{timeError}</Text>}
                    </View>
                  </View>

                  {/* Recurring toggle */}
                  <View style={styles.modalToggleRow}>
                    <Switch value={isRecurring} onValueChange={setIsRecurring} trackColor={{ false: palette.border, true: palette.primary }} thumbColor={palette.white} />
                    <Text style={styles.modalToggleLabel}>Recurring Meeting</Text>
                  </View>

                  {isRecurring && (
                    <View style={styles.inputRow}>
                      <View style={styles.inputWrap}>
                        <Text style={styles.inputLabel}>Recurrence Type</Text>
                        <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7} onPress={() => setShowRecurrenceDropdown(true)}>
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
                            onChangeText={raw => setEndDate(applyDateMask(raw))}
                            placeholder="YYYY/MM/DD"
                            placeholderTextColor={palette.muted}
                            keyboardType="number-pad"
                            maxLength={10}
                          />
                          <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Status */}
                  <View style={styles.inputWrapSingle}>
                    <Text style={styles.inputLabel}>Status</Text>
                    <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7} onPress={() => setShowStatusDropdown(true)}>
                      <Text style={styles.inputText}>{status}</Text>
                      <Ionicons name="caret-down" size={16} color={palette.muted} />
                    </TouchableOpacity>
                  </View>

                  {/* Recurrence dropdown */}
                  {showRecurrenceDropdown && (
                    <Modal transparent animationType="fade" visible={showRecurrenceDropdown} onRequestClose={() => setShowRecurrenceDropdown(false)}>
                      <TouchableWithoutFeedback onPress={() => setShowRecurrenceDropdown(false)}>
                        <View style={styles.modalBackdrop}>
                          <View style={[styles.modalCard, { padding: 0, maxWidth: 220 }]}>
                            {recurrenceOptions.map(opt => (
                              <TouchableOpacity key={opt} style={{ padding: 18 }} onPress={() => { setRecurrenceType(opt); setShowRecurrenceDropdown(false); }}>
                                <Text style={{ fontSize: 16, color: palette.ink }}>{opt}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </Modal>
                  )}

                  {/* Status dropdown */}
                  {showStatusDropdown && (
                    <Modal transparent animationType="fade" visible={showStatusDropdown} onRequestClose={() => setShowStatusDropdown(false)}>
                      <TouchableWithoutFeedback onPress={() => setShowStatusDropdown(false)}>
                        <View style={styles.modalBackdrop}>
                          <View style={[styles.modalCard, { padding: 0, maxWidth: 220 }]}>
                            {statusOptions.map(opt => (
                              <TouchableOpacity key={opt} style={{ padding: 18 }} onPress={() => { setStatus(opt); setShowStatusDropdown(false); }}>
                                <Text style={{ fontSize: 16, color: palette.ink }}>{opt}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </TouchableWithoutFeedback>
                    </Modal>
                  )}

                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setShowMeetingModal(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.createBtn} onPress={handleCreateMeeting} activeOpacity={0.85} disabled={isSubmitting}>
                    {isSubmitting
                      ? <ActivityIndicator size="small" color={palette.white} />
                      : <Text style={styles.createBtnText}>CREATE RECORD</Text>}
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, backgroundColor: palette.bg },
  headerTitle: { color: palette.ink, fontSize: 18, fontFamily: typography.primaryBold },
  infoCard: { padding: spacing.xl, backgroundColor: palette.bg },
  className: { color: palette.ink, fontSize: 32, fontFamily: typography.primaryBold, marginBottom: spacing.xs },
  classMeta: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryMedium, marginBottom: 4 },
  codeHighlight: { color: palette.ink, fontFamily: typography.primaryBold },
  scrollContent: { paddingBottom: 100 },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, paddingHorizontal: spacing.xl },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingVertical: spacing.lg, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: spacing.xs },
  tabButtonActive: { borderBottomColor: palette.primary },
  tabIconWrap: { position: 'relative' },
  tabNotifBadge: { position: 'absolute', top: -7, right: -12, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },
  tabNotifText: { color: palette.white, fontSize: 9, fontFamily: typography.primaryBold, lineHeight: 11 },
  tabText: { color: palette.muted, fontSize: 10, fontFamily: typography.primaryBold, letterSpacing: 0.5, textAlign: 'center' },
  tabTextActive: { color: palette.primary },

  content: { padding: spacing.xl },
  attendanceContent: { flex: 1 },
  attendanceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  sectionTitle: { color: palette.ink, fontSize: 20, fontFamily: typography.primaryMedium },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  toggleLabel: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryMedium },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: spacing.md },
  emptyText: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular, textAlign: 'center' },

  meetingCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, paddingRight: spacing.xl, backgroundColor: palette.white, borderRadius: 20, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.md, elevation: 2, shadowColor: palette.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
  meetingIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md, borderWidth: 1, borderColor: palette.border },
  meetingInfo: { flexDirection: 'row', alignItems: 'center' },
  meetingDate: { color: palette.ink, fontSize: 16, fontFamily: typography.primaryBold, marginBottom: 2 },
  meetingTime: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryMedium },

  badgeBase: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  badgeBaseText: { fontSize: 10, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
  badgePrimary: { backgroundColor: palette.white, borderColor: palette.primary },
  badgePrimaryText: { color: palette.primary },
  badgeNeutral: { backgroundColor: palette.bg, borderColor: palette.border },
  badgeNeutralText: { color: palette.ink },

  studentCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: palette.white, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.border, elevation: 1, shadowColor: palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  studentInfo: { flex: 1, paddingRight: spacing.md },
  studentName: { color: palette.ink, fontSize: 16, fontFamily: typography.primaryBold },
  studentEmail: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryRegular, marginTop: 2 },
  studentAbsences: { color: palette.muted, fontSize: 12, fontFamily: typography.primaryMedium, marginTop: 2 },
  studentActions: { flexDirection: 'row', gap: spacing.sm },
  rejectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.primary, alignItems: 'center', justifyContent: 'center' },

  analysisSubtitle: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryRegular, marginBottom: spacing.lg },
  analysisCard: { backgroundColor: palette.white, borderRadius: 16, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: palette.border, gap: spacing.sm, elevation: 1, shadowColor: palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  analysisNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  analysisName: { color: palette.ink, fontSize: 16, fontFamily: typography.primaryBold, flex: 1 },
  analysisRate: { fontSize: 18, fontFamily: typography.primaryBold },
  progressTrack: { height: 6, backgroundColor: palette.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  analysisPillRow: { flexDirection: 'row', gap: spacing.sm },

  extendedFab: { position: 'absolute', right: spacing.xl, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 100, elevation: 8, shadowColor: palette.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 8, gap: spacing.xs },
  extendedFabText: { color: palette.white, fontFamily: typography.primaryBold, fontSize: 14, letterSpacing: 0.5 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', maxHeight: '85%', backgroundColor: palette.white, borderRadius: 28, padding: spacing.xxl, elevation: 24, shadowColor: palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
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
  inputFieldBoxError: { borderColor: palette.primary },
  fieldError: { color: palette.primary, fontSize: 11, fontFamily: typography.primaryRegular, marginTop: 4 },
  inputText: { flex: 1, color: palette.ink, fontFamily: typography.primaryRegular, fontSize: 15, paddingVertical: 0 },
  modalToggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  modalToggleLabel: { color: palette.ink, fontSize: 15, fontFamily: typography.primaryMedium },
  dropdownBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: spacing.md, backgroundColor: palette.white, height: 48 },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  cancelBtnText: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
  createBtn: { backgroundColor: palette.primary, height: 40, paddingHorizontal: spacing.xl, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: palette.white, fontSize: 13, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
});