// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp, useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type TeacherClassItem = {
  id: string;
  name?: string;
  section?: string;
  code?: string;
  schedule?: string;
};

export function HomeScreen() {
  const { role } = useRole();
  const { user, fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  const [isApplying, setIsApplying] = useState(false);
  const [hasPendingTeacherApplication, setHasPendingTeacherApplication] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // ── TEACHER STATE ──
  const [nextClass, setNextClass] = useState<{name: string; schedule: string} | null>(null);
  const [criticalStudentsCount, setCriticalStudentsCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

  // ── STUDENT STATE (LIVE DATA) ──
  const [studentEnrolledClasses, setStudentEnrolledClasses] = useState<any[]>([]);
  const [studentLiveMeetings, setStudentLiveMeetings] = useState<any[]>([]);
  const [studentWarnings, setStudentWarnings] = useState<any[]>([]);

  // ── SWIPEABLE ROLL CALL SHEET STATE ──
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassItem[]>([]);
  const [activeMeetings, setActiveMeetings] = useState<Record<string, any>>({});
  const [showRollCallModal, setShowRollCallModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const panY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [sheetState, setSheetState] = useState<'closed'|'half'|'full'>('closed');

  // ── ADMIN LISTENERS ──
  useEffect(() => {
    if (role !== 'admin') return;
    const unsubscribe = firestore().collection('roleApplications').where('status', '==', 'pending').onSnapshot(
      snapshot => setAdminPendingCount(snapshot.size),
      error => console.warn('Failed to get pending application count:', error)
    );
    return () => unsubscribe();
  }, [role]);

  const handleAdminSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  // ── ROLE-SPECIFIC REAL-TIME LISTENERS ──
  useEffect(() => {
    if (!user) return;

    if (role === 'teacher') {
      const unsubscribeAllClasses = firestore().collection('classes').where('teacherUid', '==', user.uid).orderBy('createdAt', 'desc').onSnapshot(snap => {
        const classes: TeacherClassItem[] = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }));
        setTeacherClasses(classes);
        setNextClass(classes.length > 0 ? { name: classes[0].name || 'Unnamed Class', schedule: classes[0].schedule || '--' } : null);
      });

      const unsubscribeReviews = firestore().collection('enrollments').where('teacherUid', '==', user.uid).where('status', '==', 'pending').onSnapshot(
        snapshot => setPendingReviewsCount(snapshot.size)
      );

      const unsubscribeCritical = firestore().collection('enrollments').where('teacherUid', '==', user.uid).where('isCritical', '==', true).onSnapshot(
        snapshot => setCriticalStudentsCount(snapshot.size)
      );

      const unsubscribeMeetings = firestore().collection('meetings').where('status', '==', 'open').where('teacherUid', '==', user.uid).onSnapshot(
        snapshot => {
          const mMap: Record<string, any> = {};
          snapshot.docs.forEach(doc => { mMap[doc.data().classId] = { id: doc.id, ...doc.data() }; });
          setActiveMeetings(mMap);
        }
      );

      return () => { unsubscribeAllClasses(); unsubscribeReviews(); unsubscribeCritical(); unsubscribeMeetings(); };
    }

    if (role === 'student') {
      const unsubscribeEnrollments = firestore().collection('enrollments').where('studentUid', '==', user.uid).onSnapshot(snap => {
        const enrolled: any[] = [];
        const warnings: any[] = [];
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'approved') {
            enrolled.push({ id: doc.id, ...data });
            if (data.isWarning) warnings.push({ id: doc.id, ...data });
          }
        });
        setStudentEnrolledClasses(enrolled);
        setStudentWarnings(warnings);
      });

      const unsubscribeMeetings = firestore().collection('meetings').where('status', '==', 'open').onSnapshot(snap => {
        const live: any[] = [];
        snap.docs.forEach(doc => live.push({ id: doc.id, ...doc.data() }));
        setStudentLiveMeetings(live);
      });

      return () => { unsubscribeEnrollments(); unsubscribeMeetings(); };
    }
  }, [role, user]);

  // Derived Student State
  const myLiveMeetings = studentLiveMeetings.filter(m => studentEnrolledClasses.some(c => c.classId === m.classId));
  const currentLiveMeeting = myLiveMeetings.length > 0 ? myLiveMeetings[0] : null;
  const currentWarning = studentWarnings.length > 0 ? studentWarnings[0] : null;

  // ── INSTRUCTOR APPLICATION ──
  const loadPendingTeacherApplication = useCallback(async () => {
    if (!user || role !== 'student') { setHasPendingTeacherApplication(false); return; }
    const snapshot = await firestore().collection('roleApplications').where('ownerUid', '==', user.uid).get();
    const hasPending = snapshot.docs.some(doc => doc.data().requestedRole === 'teacher' && doc.data().status === 'pending');
    setHasPendingTeacherApplication(hasPending);
  }, [role, user]);

  useEffect(() => { loadPendingTeacherApplication().catch(console.error); }, [loadPendingTeacherApplication]);

  const applyAsTeacher = async () => {
    if (!user || role !== 'student' || isApplying) return;
    setIsApplying(true);
    try {
      const existingSnapshot = await firestore().collection('roleApplications').where('ownerUid', '==', user.uid).get();
      const alreadyPending = existingSnapshot.docs.some(doc => doc.data().requestedRole === 'teacher' && doc.data().status === 'pending');

      if (alreadyPending) {
        setHasPendingTeacherApplication(true);
        Alert.alert('Already submitted', 'Your teacher application is still pending review.');
        return;
      }

      await firestore().collection('roleApplications').add({
        ownerUid: user.uid,
        ownerEmail: user.email ?? '',
        ownerName: fullName,
        requestedRole: 'teacher',
        status: 'pending',
        submittedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      setHasPendingTeacherApplication(true);
      setShowNotifPanel(false);
      Alert.alert('Application sent', 'Your instructor application is now pending admin approval.');
    } catch (error) {
      Alert.alert('Submission failed', 'Please try again in a moment.');
    } finally {
      setIsApplying(false);
    }
  };

  const showNotifDot = (role === 'student' && !hasPendingTeacherApplication) || (role === 'teacher' && pendingReviewsCount > 0);

  // ── SWIPEABLE SHEET GESTURE LOGIC ──
  const openRollCallModal = () => {
    panY.setValue(SCREEN_HEIGHT);
    setShowRollCallModal(true);
    setSheetState('full');
    setSelectedClassId(null);
    Animated.spring(panY, { toValue: insets.top + spacing.lg, useNativeDriver: true, bounciness: 4 }).start();
  };

  const closeRollCallModal = () => {
    Animated.timing(panY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start(() => {
      setShowRollCallModal(false);
      setSheetState('closed');
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -50) {
          setSheetState('full');
          Animated.spring(panY, { toValue: insets.top + spacing.lg, useNativeDriver: true, bounciness: 4 }).start();
        } else if (gesture.dy > 50) {
          closeRollCallModal();
        } else {
          Animated.spring(panY, { toValue: insets.top + spacing.lg, useNativeDriver: true, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const handleContinueRollCall = () => {
    if (!selectedClassId) return;
    const cls = teacherClasses.find(c => c.id === selectedClassId);
    if (!cls) return;

    const isLive = !!activeMeetings[cls.id];
    closeRollCallModal();

    setTimeout(() => {
      if (isLive) {
        const meeting = activeMeetings[cls.id];
        navigation.navigate('RollCall', { meetingId: meeting.id, classId: meeting.classId, className: meeting.className, section: meeting.section, date: meeting.date, time: meeting.time });
      } else {
        navigation.navigate('ClassDetail', { classId: cls.id, name: cls.name, section: cls.section, code: cls.code });
      }
    }, 250);
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, spacing.xl) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Dashboard</Text>

          {role !== 'admin' && (
            <TouchableOpacity style={styles.bellButton} activeOpacity={0.75} onPress={() => setShowNotifPanel(true)}>
              <Ionicons name={showNotifDot ? 'notifications' : 'notifications-outline'} size={24} color={palette.ink} />
              {showNotifDot && <View style={styles.notifDot} />}
            </TouchableOpacity>
          )}
        </View>

        {/* ============================== */}
        {/* STUDENT DASHBOARD (LIVE DATA)  */}
        {/* ============================== */}
        {role === 'student' && (
          <View style={styles.bentoContainer}>
            <View style={[styles.cardFull, currentWarning ? styles.alertCard : styles.successCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={currentWarning ? styles.alertLabel : styles.successLabel}>
                  {currentWarning ? 'Attendance Warning' : 'Great Standing'}
                </Text>
                <Text style={currentWarning ? styles.alertTag : styles.successTag}>STATUS</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={currentWarning ? styles.alertHeader : styles.successHeader}>
                  {currentWarning ? currentWarning.classCode || 'Limit Nearing' : 'No warnings'}
                </Text>
                <Text style={currentWarning ? styles.alertSub : styles.successSub}>
                  {currentWarning ? `You have high absences in ${currentWarning.className}` : 'Keep up the perfect attendance!'}
                </Text>
              </View>
            </View>

            <View style={styles.cardFull}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgeBase, currentLiveMeeting ? styles.badgeActive : styles.badgeNeutral]}>
                  <Text style={currentLiveMeeting ? styles.badgeTextActive : styles.badgeTextNeutral}>
                    {currentLiveMeeting ? 'Open Now' : 'No Active Session'}
                  </Text>
                </View>
                <Text style={styles.subtleTag}>LIVE SESSION</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardHeader}>{currentLiveMeeting ? currentLiveMeeting.className : 'Relax, you are free'}</Text>
                <Text style={styles.cardSub}>{currentLiveMeeting ? `${currentLiveMeeting.time} • Section ${currentLiveMeeting.section}` : 'No ongoing classes right now'}</Text>
              </View>
            </View>

            <View style={styles.bentoRow}>
              <TouchableOpacity
                style={[styles.bentoSquare, styles.bgPrimary, !currentLiveMeeting && { opacity: 0.5 }]}
                activeOpacity={0.85}
                disabled={!currentLiveMeeting}
                onPress={() => Alert.alert('Mark Present', 'Student code check-in feature coming soon!')}
              >
                <Ionicons name="checkmark-outline" size={26} color={palette.white} style={[styles.squareIconLight, { transform: [{ rotate: '0deg' }] }]} />
                <Text style={styles.squareTextLight}>Check In</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]} activeOpacity={0.85} onPress={() => navigation.navigate('Classes')}>
                <Ionicons name="add-outline" size={26} color={palette.ink} style={[styles.squareIconDark, { transform: [{ rotate: '0deg' }] }]} />
                <Text style={styles.squareTextDark}>Join Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {role === 'teacher' && (
          <View style={styles.bentoContainer}>
            <View style={styles.cardFull}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.label}>Next Class</Text>
                <Text style={styles.subtleTag}>SCHEDULE</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardHeader}>{nextClass ? nextClass.name : 'No upcoming classes'}</Text>
                <Text style={styles.cardSub}>{nextClass ? nextClass.schedule : '--'}</Text>
              </View>
            </View>

            <View style={styles.bentoRow}>
              <TouchableOpacity
                style={[styles.bentoSquare, styles.bgPrimary]}
                activeOpacity={0.85}
                onPress={openRollCallModal}
              >
                <Ionicons name="clipboard-outline" size={26} color={palette.white} style={[styles.squareIconLight, { transform: [{ rotate: '0deg' }] }]} />
                <Text style={styles.squareTextLight}>Roll Call</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]} activeOpacity={0.85} onPress={() => navigation.navigate('Classes')}>
                <Ionicons name="add-circle-outline" size={26} color={palette.ink} style={[styles.squareIconDark, { transform: [{ rotate: '0deg' }] }]} />
                <Text style={styles.squareTextDark}>Add Class</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.cardFull, (criticalStudentsCount > 0 || pendingReviewsCount > 0) ? styles.alertCard : styles.successCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={(criticalStudentsCount > 0 || pendingReviewsCount > 0) ? styles.alertLabel : styles.successLabel}>
                  {(criticalStudentsCount > 0 || pendingReviewsCount > 0) ? 'Attention Required' : 'All Caught Up'}
                </Text>
                <Text style={(criticalStudentsCount > 0 || pendingReviewsCount > 0) ? styles.alertTag : styles.successTag}>
                  STATUS
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={(criticalStudentsCount > 0 || pendingReviewsCount > 0) ? styles.alertHeader : styles.successHeader}>
                  {criticalStudentsCount} Critical Students
                </Text>
                <Text style={(criticalStudentsCount > 0 || pendingReviewsCount > 0) ? styles.alertSub : styles.successSub}>
                  {pendingReviewsCount} pending reviews
                </Text>
              </View>
            </View>
          </View>
        )}

        {role === 'admin' && (
          <View style={styles.bentoContainer}>
            <View style={[styles.cardFull, adminPendingCount > 0 ? styles.alertCard : styles.successCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={adminPendingCount > 0 ? styles.alertLabel : styles.successLabel}>
                  {adminPendingCount > 0 ? 'Action Needed' : 'All Clear'}
                </Text>
                <Text style={adminPendingCount > 0 ? styles.alertTag : styles.successTag}>
                  {adminPendingCount > 0 ? 'URGENT' : 'UPDATED'}
                </Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={adminPendingCount > 0 ? styles.alertHeader : styles.successHeader}>
                  {adminPendingCount === 0 ? '0 Pending Requests' : `${adminPendingCount} Pending Request${adminPendingCount > 1 ? 's' : ''}`}
                 </Text>
                <Text style={adminPendingCount > 0 ? styles.alertSub : styles.successSub}>
                  Teacher role approvals
                </Text>
              </View>
            </View>

            <View style={styles.bentoRow}>
              <TouchableOpacity style={[styles.bentoSquare, styles.bgPrimary]} activeOpacity={0.85} onPress={() => navigation.navigate('Applications')}>
                <Ionicons name="reader-outline" size={26} color={palette.white} style={[styles.squareIconLight, { transform: [{ rotate: '0deg' }] }]} />
                <Text style={styles.squareTextLight}>Review</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]} activeOpacity={0.85} onPress={handleAdminSync} disabled={isSyncing}>
                <Ionicons name="sync" size={26} color={palette.ink} style={[styles.squareIconDark, { transform: [{ rotate: '0deg' }] }, isSyncing && { opacity: 0.8 }]} />
                <Text style={styles.squareTextDark}>{isSyncing ? 'Syncing...' : 'Sync Status'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── NOTIFICATION MODAL ── */}
      <Modal visible={showNotifPanel} transparent animationType="fade" onRequestClose={() => setShowNotifPanel(false)}>
        <TouchableWithoutFeedback onPress={() => setShowNotifPanel(false)}>
          <View style={styles.notifModalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.notifCard}>

                <View style={styles.notifHeader}>
                  <Text style={styles.notifTitle}>Notifications</Text>
                  <TouchableOpacity onPress={() => setShowNotifPanel(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Ionicons name="close-outline" size={24} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                {role === 'student' && (
                  <View style={styles.notifBody}>
                    <View style={styles.notifIconWrap}>
                      <Ionicons name="school" size={32} color={palette.primary} />
                    </View>
                    <Text style={styles.notifItemTitle}>Become an Instructor</Text>
                    <Text style={styles.notifItemSub}>
                      {hasPendingTeacherApplication
                        ? 'Your application is pending admin review. Please wait for approval.'
                        : 'Unlock teaching tools by applying for an instructor role upgrade.'}
                    </Text>

                    {!hasPendingTeacherApplication ? (
                      <TouchableOpacity
                        style={[styles.notifActionBtn, isApplying && styles.notifActionBtnDisabled]}
                        activeOpacity={0.85}
                        disabled={isApplying}
                        onPress={applyAsTeacher}
                      >
                        <Text style={styles.notifActionText}>{isApplying ? 'Submitting...' : 'Apply Now'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.notifStatusPill}>
                        <Text style={styles.notifStatusText}>PENDING APPROVAL</Text>
                      </View>
                    )}
                  </View>
                )}

                {role === 'teacher' && (
                  <View style={styles.notifBody}>
                    <View style={styles.notifIconWrap}>
                      <Ionicons name="people" size={32} color={palette.primary} />
                    </View>
                    <Text style={styles.notifItemTitle}>Enrollment Requests</Text>
                    <Text style={styles.notifItemSub}>
                      {pendingReviewsCount > 0
                        ? `You have ${pendingReviewsCount} student${pendingReviewsCount > 1 ? 's' : ''} waiting to join your classes. Review them now.`
                        : 'All your classes are up to date. No pending requests.'}
                    </Text>

                    {pendingReviewsCount > 0 ? (
                      <TouchableOpacity
                        style={styles.notifActionBtn}
                        activeOpacity={0.85}
                        onPress={() => {
                          setShowNotifPanel(false);
                          navigation.navigate('Classes');
                        }}
                      >
                        <Text style={styles.notifActionText}>REVIEW NOW</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.notifStatusPill}>
                        <Text style={styles.notifStatusText}>ALL CAUGHT UP</Text>
                      </View>
                    )}
                  </View>
                )}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── EXPANDABLE SWIPEABLE BOTTOM SHEET ── */}
      {showRollCallModal && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableWithoutFeedback onPress={closeRollCallModal}>
            <Animated.View style={[styles.rcModalBackdrop, {
              opacity: panY.interpolate({
                inputRange: [0, SCREEN_HEIGHT],
                outputRange: [1, 0],
                extrapolate: 'clamp'
              })
            }]} />
          </TouchableWithoutFeedback>

          <Animated.View style={[styles.rcBottomSheet, { height: SCREEN_HEIGHT - (insets.top + spacing.lg), transform: [{ translateY: panY }] }]}>

            <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
              <View style={styles.dragIndicator} />
            </View>

            <View style={styles.rcModalHeaderIconWrap}>
              <Ionicons name="clipboard-outline" size={28} color={palette.primary} />
            </View>

            <Text style={styles.rcModalTitle}>Start Roll Call</Text>
            <Text style={styles.rcModalSub}>Pick a class to manage attendance.</Text>

            <Text style={styles.rcListLabel}>CLASS LIST</Text>

            <View style={styles.rcListWrapper}>
              <ScrollView
                style={styles.rcList}
                contentContainerStyle={styles.rcListContent}
                showsVerticalScrollIndicator={false}
              >
                {teacherClasses.length === 0 ? (
                  <View style={styles.emptySheet}>
                    <Text style={styles.emptySheetText}>No classes available.</Text>
                  </View>
                ) : (
                  teacherClasses.map(cls => {
                    const isLive = !!activeMeetings[cls.id];
                    const isSelected = selectedClassId === cls.id;

                    return (
                      <TouchableOpacity
                        key={cls.id}
                        style={[
                          styles.rcClassItem,
                          isSelected && styles.rcClassItemSelected
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setSelectedClassId(cls.id)}
                      >
                        <View style={styles.rcClassInfo}>
                          <Text style={[styles.rcClassName, isSelected && { color: palette.primary }]}>{cls.code} • Section {cls.section}</Text>
                          <Text style={styles.rcClassSubName}>{cls.name}</Text>
                        </View>

                        {isLive && (
                          <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>

            <View style={[styles.rcModalFooter, { paddingBottom: Math.max(insets.bottom + tabBarHeight + spacing.sm, spacing.xl) }]}>
              <TouchableOpacity onPress={closeRollCallModal} style={styles.rcCancelBtn}>
                <Text style={styles.rcCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rcContinueBtn, !selectedClassId && styles.rcContinueBtnDisabled]}
                onPress={handleContinueRollCall}
                disabled={!selectedClassId}
              >
                <Text style={styles.rcContinueText}>CONTINUE</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </View>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl * 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxxl },
  pageTitle: { color: palette.ink, fontSize: 42, fontFamily: typography.primaryBold, lineHeight: 48, includeFontPadding: false },
  bellButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: palette.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
  notifDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary, borderWidth: 1.5, borderColor: palette.white },
  bentoContainer: { gap: spacing.lg },
  bentoRow: { flexDirection: 'row', gap: spacing.lg },
  cardFull: { backgroundColor: palette.white, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: palette.border, height: 180, justifyContent: 'space-between', elevation: 2, shadowColor: palette.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
  alertCard: { backgroundColor: palette.secondarySoft, borderColor: palette.secondary, borderWidth: 1 },
  successCard: { backgroundColor: palette.white, borderColor: palette.border, borderWidth: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardBody: { gap: 4 },
  subtleTag: { fontFamily: typography.primaryBold, fontSize: 10, color: palette.primary, letterSpacing: 1 },
  alertTag: { fontFamily: typography.primaryBold, fontSize: 10, color: palette.ink, letterSpacing: 1 },
  successTag: { fontFamily: typography.primaryBold, fontSize: 10, color: palette.muted, letterSpacing: 1 },
  squareIconLight: { position: 'absolute', top: spacing.xl, right: spacing.xl, opacity: 0.7, transform: [{ rotate: '-45deg' }] },
  squareIconDark: { position: 'absolute', top: spacing.xl, right: spacing.xl, opacity: 0.4, transform: [{ rotate: '-45deg' }] },
  bentoSquare: { flex: 1, aspectRatio: 1, borderRadius: 24, padding: spacing.xl, justifyContent: 'flex-end', elevation: 2, shadowColor: palette.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
  bgPrimary: { backgroundColor: palette.primary },
  bgSurface: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border },
  label: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryRegular, textTransform: 'uppercase', letterSpacing: 1 },
  alertLabel: { color: palette.ink, fontSize: 13, fontFamily: typography.primaryBold, textTransform: 'uppercase', letterSpacing: 1 },
  successLabel: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryBold, textTransform: 'uppercase', letterSpacing: 1 },
  cardHeader: { color: palette.ink, fontSize: 24, fontFamily: typography.primaryBold },
  alertHeader: { color: palette.ink, fontSize: 24, fontFamily: typography.primaryBold },
  successHeader: { color: palette.ink, fontSize: 24, fontFamily: typography.primaryBold },
  cardSub: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular },
  alertSub: { color: palette.ink, fontSize: 15, fontFamily: typography.primaryRegular },
  successSub: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular },
  squareTextLight: { color: palette.white, fontSize: 18, fontFamily: typography.primaryBold },
  squareTextDark: { color: palette.ink, fontSize: 18, fontFamily: typography.primaryBold },

  badgeBase: { alignSelf: 'flex-start', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 100, borderWidth: 1 },
  badgeActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  badgeNeutral: { backgroundColor: palette.bg, borderColor: palette.border },
  badgeTextActive: { color: palette.white, fontFamily: typography.primaryBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  badgeTextNeutral: { color: palette.ink, fontFamily: typography.primaryBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },

  // ── REDESIGNED NOTIFICATION MODAL STYLES ──
  notifModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // Dimmed background
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl
  },
  notifCard: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 28,
    padding: spacing.xxl,
    elevation: 24,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  notifTitle: {
    color: palette.ink,
    fontSize: 18,
    fontFamily: typography.primaryBold,
  },
  notifBody: {
    alignItems: 'center',
  },
  notifIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  notifItemTitle: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  notifItemSub: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  notifActionBtn: {
    width: '100%',
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifActionBtnDisabled: {
    opacity: 0.7,
  },
  notifActionText: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  notifStatusPill: {
    width: '100%',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifStatusText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // ── SWIPEABLE BOTTOM SHEET STYLES ──
  rcModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  rcBottomSheet: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: palette.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: spacing.xxl,
    elevation: 24,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 24
  },
  dragHandleArea: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  dragIndicator: {
    width: 48,
    height: 5,
    backgroundColor: palette.border,
    borderRadius: 3,
  },
  rcModalHeaderIconWrap: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: palette.secondarySoft, borderWidth: 1, borderColor: palette.secondary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  rcModalTitle: { alignSelf: 'center', color: palette.ink, fontSize: 22, fontFamily: typography.primaryBold, textAlign: 'center', marginBottom: 4 },
  rcModalSub: { alignSelf: 'center', color: palette.muted, fontSize: 14, fontFamily: typography.primaryRegular, textAlign: 'center', marginBottom: spacing.xl },
  rcListLabel: { color: palette.ink, fontSize: 12, fontFamily: typography.primaryBold, letterSpacing: 0.5, marginBottom: spacing.sm },

  rcListWrapper: {
    flex: 1,
    width: '100%',
    marginBottom: spacing.lg,
  },
  rcList: {
    width: '100%',
  },
  rcListContent: {
    paddingBottom: spacing.lg,
  },

  rcClassItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: palette.white, padding: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: palette.border, marginBottom: spacing.sm },
  rcClassItemSelected: { borderColor: palette.primary, backgroundColor: '#FFF5F5' },
  rcClassInfo: { flexShrink: 1, paddingRight: spacing.sm },
  rcClassName: { color: palette.ink, fontSize: 15, fontFamily: typography.primaryBold, marginBottom: 2 },
  rcClassSubName: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryMedium },

  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#DC2626', marginRight: 6 },
  liveText: { color: '#DC2626', fontSize: 11, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
  emptySheet: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  emptySheetText: { color: palette.muted, fontFamily: typography.primaryMedium, fontSize: 15 },

  rcModalFooter: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' },
  rcCancelBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  rcCancelText: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
  rcContinueBtn: { backgroundColor: palette.primary, paddingVertical: 14, paddingHorizontal: spacing.xxl, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  rcContinueBtnDisabled: { backgroundColor: palette.border },
  rcContinueText: { color: palette.white, fontSize: 14, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
});