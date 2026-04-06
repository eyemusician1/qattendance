// src/screens/HomeScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

export function HomeScreen() {
  const { role } = useRole();
  const { user, fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<BottomTabNavigationProp<any>>();

  // Student State
  const [isApplying, setIsApplying] = useState(false);
  const [hasPendingTeacherApplication, setHasPendingTeacherApplication] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Admin State
  const [adminPendingCount, setAdminPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Teacher State
  const [nextClass, setNextClass] = useState<{name: string; schedule: string} | null>(null);
  const [criticalStudentsCount, setCriticalStudentsCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);

  // ── ADMIN REAL-TIME LISTENER ──
  useEffect(() => {
    if (role !== 'admin') return;

    const unsubscribe = firestore()
      .collection('roleApplications')
      .where('status', '==', 'pending')
      .onSnapshot(
        snapshot => {
          setAdminPendingCount(snapshot.size);
        },
        error => {
          console.error('Failed to get pending application count:', error);
        }
      );

    return () => unsubscribe();
  }, [role]);

  const handleAdminSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 800);
  };

  // ── TEACHER REAL-TIME LISTENERS ──
  useEffect(() => {
    if (role !== 'teacher' || !user) return;

    // 1. Listen for the teacher's next class
    const unsubscribeClasses = firestore()
      .collection('classes')
      .where('teacherUid', '==', user.uid)
      .limit(1)
      .onSnapshot(
        snapshot => {
          if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            setNextClass({
              name: data.name || 'Unnamed Class',
              schedule: data.schedule || '--',
            });
          } else {
            setNextClass(null);
          }
        },
        error => console.error('Failed to fetch next class:', error)
      );

    // 2. Listen for pending student enrollments/reviews
    const unsubscribeReviews = firestore()
      .collection('enrollments')
      .where('teacherUid', '==', user.uid)
      .where('status', '==', 'pending')
      .onSnapshot(
        snapshot => setPendingReviewsCount(snapshot.size),
        error => console.error('Failed to fetch pending reviews:', error)
      );

    // 3. Listen for critical students (Mocked listener architecture)
    const unsubscribeCritical = firestore()
      .collection('enrollments')
      .where('teacherUid', '==', user.uid)
      .where('isCritical', '==', true)
      .onSnapshot(
        snapshot => setCriticalStudentsCount(snapshot.size),
        error => console.error('Failed to fetch critical students:', error)
      );

    return () => {
      unsubscribeClasses();
      unsubscribeReviews();
      unsubscribeCritical();
    };
  }, [role, user]);


  // ── STUDENT INITIAL LOAD ──
  const loadPendingTeacherApplication = useCallback(async () => {
    if (!user || role !== 'student') {
      setHasPendingTeacherApplication(false);
      return;
    }

    const snapshot = await firestore()
      .collection('roleApplications')
      .where('ownerUid', '==', user.uid)
      .get();

    const hasPending = snapshot.docs.some(doc => {
      const data = doc.data();
      return data.requestedRole === 'teacher' && data.status === 'pending';
    });

    setHasPendingTeacherApplication(hasPending);
  }, [role, user]);

  useEffect(() => {
    loadPendingTeacherApplication().catch(error => {
      console.error('Failed to load pending teacher application:', error);
    });
  }, [loadPendingTeacherApplication]);

  const applyAsTeacher = async () => {
    if (!user || role !== 'student' || isApplying) {
      return;
    }

    setIsApplying(true);
    try {
      const existingSnapshot = await firestore()
        .collection('roleApplications')
        .where('ownerUid', '==', user.uid)
        .get();

      const alreadyPending = existingSnapshot.docs.some(doc => {
        const data = doc.data();
        return data.requestedRole === 'teacher' && data.status === 'pending';
      });

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
      console.error('Failed to submit teacher application:', error);
      Alert.alert('Submission failed', 'Please try again in a moment.');
    } finally {
      setIsApplying(false);
    }
  };

  // ── DYNAMIC NOTIFICATION DOT LOGIC ──
  const showNotifDot =
    (role === 'student' && !hasPendingTeacherApplication) ||
    (role === 'teacher' && pendingReviewsCount > 0);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, spacing.xl) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* ── HEADER ROW ── */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Dashboard</Text>

          {/* Show Bell for Students AND Teachers */}
          {role !== 'admin' && (
            <TouchableOpacity
              style={styles.bellButton}
              activeOpacity={0.75}
              onPress={() => setShowNotifPanel(true)}
            >
              <Ionicons
                name={showNotifDot ? 'notifications' : 'notifications-outline'}
                size={24}
                color={palette.ink}
              />
              {showNotifDot && <View style={styles.notifDot} />}
            </TouchableOpacity>
          )}
        </View>

        {/* ========================================== */}
        {/* STUDENT DASHBOARD                          */}
        {/* ========================================== */}
        {role === 'student' && (
          <View style={styles.bentoContainer}>
            <View style={[styles.cardFull, styles.alertCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.alertLabel}>Attendance Warning</Text>
                <Text style={styles.alertTag}>STATUS</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.alertHeader}>IT302 Limit Nearing</Text>
              </View>
            </View>

            <View style={styles.cardFull}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgeActive}>
                  <Text style={styles.badgeTextActive}>Open Now</Text>
                </View>
                <Text style={styles.subtleTag}>LIVE SESSION</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardHeader}>Information Assurance</Text>
                <Text style={styles.cardSub}>10:00 AM • Room 402</Text>
              </View>
            </View>

            <View style={styles.bentoRow}>
              <TouchableOpacity style={[styles.bentoSquare, styles.bgPrimary]} activeOpacity={0.85}>
                <Ionicons
                  name="checkmark-outline"
                  size={26}
                  color={palette.white}
                  style={[styles.squareIconLight, { transform: [{ rotate: '0deg' }] }]}
                />
                <Text style={styles.squareTextLight}>Mark Present</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]} activeOpacity={0.85}>
                <Ionicons name="arrow-forward-outline" size={24} color={palette.ink} style={styles.squareIconDark} />
                <Text style={styles.squareTextDark}>Join Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ========================================== */}
        {/* TEACHER DASHBOARD                          */}
        {/* ========================================== */}
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
                onPress={() => navigation.navigate('Classes')}
              >
                <Ionicons name="clipboard-outline" size={26} color={palette.white} style={[styles.squareIconLight, { transform: [{ rotate: '0deg' }] }]} />
                <Text style={styles.squareTextLight}>Roll Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bentoSquare, styles.bgSurface]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Classes')}
              >
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

        {/* ========================================== */}
        {/* ADMIN DASHBOARD                            */}
        {/* ========================================== */}
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
              <TouchableOpacity
                style={[styles.bentoSquare, styles.bgPrimary]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('Applications')}
              >
                <Ionicons
                  name="reader-outline"
                  size={26}
                  color={palette.white}
                  style={[styles.squareIconLight, { transform: [{ rotate: '0deg' }] }]}
                />
                <Text style={styles.squareTextLight}>Review</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bentoSquare, styles.bgSurface]}
                activeOpacity={0.85}
                onPress={handleAdminSync}
                disabled={isSyncing}
              >
                <Ionicons
                  name="sync"
                  size={26}
                  color={palette.ink}
                  style={[styles.squareIconDark, { transform: [{ rotate: '0deg' }] }, isSyncing && { opacity: 0.8 }]}
                />
                <Text style={styles.squareTextDark}>{isSyncing ? 'Syncing...' : 'Sync Status'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── NOTIFICATION MODAL ── */}
      <Modal
        visible={showNotifPanel}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotifPanel(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowNotifPanel(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.notifPanel, { top: Math.max(insets.top, spacing.xl) + 52 }]}>

                <View style={styles.notifPanelHeader}>
                  <Text style={styles.notifPanelTitle}>Notifications</Text>
                  <TouchableOpacity
                    onPress={() => setShowNotifPanel(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-outline" size={22} color={palette.muted} />
                  </TouchableOpacity>
                </View>

                {/* Student Notification View */}
                {role === 'student' && (
                  <View style={styles.notifItem}>
                    <View style={styles.notifIconWrap}>
                      <Ionicons name="school" size={28} color={palette.primary} />
                    </View>
                    <View style={styles.notifItemBody}>
                      <Text style={styles.notifItemTitle}>Become an Instructor</Text>
                      <Text style={styles.notifItemSub}>
                        {hasPendingTeacherApplication
                          ? 'Your application is pending admin review. Please wait for approval.'
                          : 'Unlock teaching tools by applying for an instructor role upgrade.'}
                      </Text>
                    </View>

                    {!hasPendingTeacherApplication && (
                      <TouchableOpacity
                        style={[styles.notifActionLarge, isApplying && styles.notifActionDisabled]}
                        activeOpacity={0.85}
                        disabled={isApplying}
                        onPress={applyAsTeacher}
                      >
                        <Text style={styles.notifActionTextLarge}>
                          {isApplying ? 'Submitting...' : 'Apply Now'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {hasPendingTeacherApplication && (
                      <View style={styles.notifStatusPillLarge}>
                        <Text style={styles.notifStatusTextLarge}>PENDING APPROVAL</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Teacher Notification View */}
                {role === 'teacher' && (
                  <View style={styles.notifItem}>
                    <View style={styles.notifIconWrap}>
                      <Ionicons name="people" size={28} color={palette.primary} />
                    </View>
                    <View style={styles.notifItemBody}>
                      <Text style={styles.notifItemTitle}>Enrollment Requests</Text>
                      <Text style={styles.notifItemSub}>
                        {pendingReviewsCount > 0
                          ? `You have ${pendingReviewsCount} student${pendingReviewsCount > 1 ? 's' : ''} waiting to join your classes. Review them now.`
                          : 'All your classes are up to date. No pending requests.'}
                      </Text>
                    </View>

                    {pendingReviewsCount > 0 && (
                      <View style={styles.notifStatusPillLarge}>
                        <Text style={styles.notifStatusTextLarge}>ACTION REQUIRED</Text>
                      </View>
                    )}
                  </View>
                )}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
    lineHeight: 48,
    includeFontPadding: false,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.primary,
    borderWidth: 1.5,
    borderColor: palette.white,
  },

  bentoContainer: {
    gap: spacing.lg,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  cardFull: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    height: 180,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  alertCard: {
    backgroundColor: palette.secondarySoft,
    borderColor: palette.secondary,
    borderWidth: 1,
  },
  successCard: {
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardBody: {
    gap: 4,
  },
  subtleTag: {
    fontFamily: typography.primaryBold,
    fontSize: 10,
    color: palette.primary,
    letterSpacing: 1,
  },
  alertTag: {
    fontFamily: typography.primaryBold,
    fontSize: 10,
    color: palette.ink,
    letterSpacing: 1,
  },
  successTag: {
    fontFamily: typography.primaryBold,
    fontSize: 10,
    color: palette.muted,
    letterSpacing: 1,
  },
  squareIconLight: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    opacity: 0.7,
    transform: [{ rotate: '-45deg' }],
  },
  squareIconDark: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    opacity: 0.4,
    transform: [{ rotate: '-45deg' }],
  },
  bentoSquare: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 24,
    padding: spacing.xl,
    justifyContent: 'flex-end',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  bgPrimary: { backgroundColor: palette.primary },
  bgSurface: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },
  label: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryRegular,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  alertLabel: {
    color: palette.ink,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  successLabel: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardHeader: { color: palette.ink, fontSize: 24, fontFamily: typography.primaryBold },
  alertHeader: { color: palette.ink, fontSize: 24, fontFamily: typography.primaryBold },
  successHeader: { color: palette.ink, fontSize: 24, fontFamily: typography.primaryBold },
  cardSub: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular },
  alertSub: { color: palette.ink, fontSize: 15, fontFamily: typography.primaryRegular },
  successSub: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular },
  squareTextLight: { color: palette.white, fontSize: 18, fontFamily: typography.primaryBold },
  squareTextDark: { color: palette.ink, fontSize: 18, fontFamily: typography.primaryBold },
  badgeActive: {
    alignSelf: 'flex-start',
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  badgeTextActive: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  notifPanel: {
    position: 'absolute',
    right: spacing.xl,
    width: 320,
    backgroundColor: palette.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  notifPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  notifPanelTitle: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
  notifItem: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.lg,
  },
  notifIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.secondarySoft,
    borderWidth: 1,
    borderColor: palette.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemBody: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  notifItemTitle: {
    color: palette.ink,
    fontSize: 18,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
  },
  notifItemSub: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryRegular,
    lineHeight: 20,
    textAlign: 'center',
  },
  notifActionLarge: {
    width: '100%',
    backgroundColor: palette.primary,
    borderRadius: 100,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifActionDisabled: {
    backgroundColor: palette.muted,
  },
  notifActionTextLarge: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  notifStatusPillLarge: {
    width: '100%',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 100,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  notifStatusTextLarge: {
    color: palette.muted,
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 1,
  },
});