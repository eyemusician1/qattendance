// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';

type ProfileScreenProps = {
  onLogout: () => void;
};

export function ProfileScreen({ onLogout }: ProfileScreenProps) {
  const { role } = useRole();
  const { user, fullName } = useAuth();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [teacherStats, setTeacherStats] = useState({ activeClasses: 0, totalStudents: 0 });
  const [studentStats, setStudentStats] = useState({ enrolledClasses: 0, pendingRequests: 0 });

  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';
  const firstName = fullName ? fullName.split(' ')[0] : 'User';
  const displayRole = role ? role.toUpperCase() : 'STUDENT';

  useEffect(() => {
    if (!user) return;

    if (role === 'teacher') {
      const unsubClasses = firestore()
        .collection('classes')
        .where('teacherUid', '==', user.uid)
        .onSnapshot(snap => {
          setTeacherStats(prev => ({ ...prev, activeClasses: snap.size }));
        });

      const unsubStudents = firestore()
        .collection('enrollments')
        .where('teacherUid', '==', user.uid)
        .where('status', '==', 'approved')
        .onSnapshot(snap => {
          setTeacherStats(prev => ({ ...prev, totalStudents: snap.size }));
        });

      return () => { unsubClasses(); unsubStudents(); };
    }

    if (role === 'student') {
      const unsubApproved = firestore()
        .collection('enrollments')
        .where('studentUid', '==', user.uid)
        .where('status', '==', 'approved')
        .onSnapshot(snap => {
          setStudentStats(prev => ({ ...prev, enrolledClasses: snap.size }));
        });

      const unsubPending = firestore()
        .collection('enrollments')
        .where('studentUid', '==', user.uid)
        .where('status', '==', 'pending')
        .onSnapshot(snap => {
          setStudentStats(prev => ({ ...prev, pendingRequests: snap.size }));
        });

      return () => { unsubApproved(); unsubPending(); };
    }
  }, [role, user]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── COHESIVE HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        <TouchableOpacity
          style={styles.avatarWrap}
          activeOpacity={0.8}
          onPress={() => setShowAccountModal(true)}
        >
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initial}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── FIXED CONTENT (NO SCROLLING) ── */}
      <View style={styles.fixedContent}>

        {role === 'admin' ? (
          <View style={styles.bentoRow}>
            <View style={styles.bentoSquare}>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="server-outline" size={24} color={palette.ink} />
              </View>
              <View>
                <Text style={styles.statValueText}>Good</Text>
                <Text style={styles.statLabel}>System Health</Text>
              </View>
            </View>
            <View style={styles.bentoSquare}>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={24} color={palette.ink} />
              </View>
              <View>
                <Text style={styles.statValueText}>Master</Text>
                <Text style={styles.statLabel}>Access Level</Text>
              </View>
            </View>
          </View>
        ) : role === 'teacher' ? (
          <View style={styles.bentoRow}>
            <View style={styles.bentoSquare}>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="book-outline" size={24} color={palette.ink} />
              </View>
              <View>
                <Text style={styles.statValue}>{teacherStats.activeClasses}</Text>
                <Text style={styles.statLabel}>Active Classes</Text>
              </View>
            </View>
            <View style={styles.bentoSquare}>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="people-outline" size={24} color={palette.ink} />
              </View>
              <View>
                <Text style={styles.statValue}>{teacherStats.totalStudents}</Text>
                <Text style={styles.statLabel}>Total Students</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.bentoRow}>
            <View style={styles.bentoSquare}>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="book-outline" size={24} color={palette.ink} />
              </View>
              <View>
                <Text style={styles.statValue}>{studentStats.enrolledClasses}</Text>
                <Text style={styles.statLabel}>Enrolled Classes</Text>
              </View>
            </View>
            <View style={styles.bentoSquare}>
              <View style={styles.bentoIconWrap}>
                <Ionicons name="time-outline" size={24} color={palette.ink} />
              </View>
              <View>
                <Text style={styles.statValue}>{studentStats.pendingRequests}</Text>
                <Text style={styles.statLabel}>Pending Requests</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="notifications-outline" size={22} color={palette.ink} />
              </View>
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: palette.border, true: palette.primary }}
              thumbColor={palette.white}
            />
          </View>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingRow} activeOpacity={0.7}>
            <View style={styles.settingRowLeft}>
              <View style={styles.settingIconWrap}>
                <Ionicons name="help-circle-outline" size={22} color={palette.ink} />
              </View>
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={palette.muted} />
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        {/* ── ENLARGED SIGN OUT BUTTON ── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.7}
          onPress={() => setShowLogoutModal(true)}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </View>

      {/* ── GOOGLE-STYLE ACCOUNT SWITCHER MODAL ── */}
      <Modal visible={showAccountModal} transparent animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
        <View style={styles.accountModalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setShowAccountModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.accountModalCard}>

            <View style={styles.accountModalHeader}>
              <Text style={styles.accountEmail}>{user?.email || 'No email provided'}</Text>
              <TouchableOpacity onPress={() => setShowAccountModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={26} color={palette.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.accountHero}>
              <View style={styles.accountAvatarLarge}>
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.accountAvatarTextLarge}>{initial}</Text>
                )}
              </View>

              <Text style={styles.accountGreeting}>Hi, {firstName}!</Text>

              <TouchableOpacity style={styles.manageAccountBtn} activeOpacity={0.7}>
                <Text style={styles.manageAccountBtnText}>Manage your Account</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accountDivider} />

            {/* Current Active Account Row */}
            <View style={styles.accountRow}>
              <View style={styles.accountRowAvatar}>
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.accountRowAvatarText}>{initial}</Text>
                )}
              </View>
              <View style={styles.accountRowTextGroup}>
                <Text style={styles.accountRowName}>{fullName || 'Unknown User'}</Text>
                <Text style={styles.accountRowRole}>{displayRole}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={24} color={palette.primary} />
            </View>

          </View>
        </View>
      </Modal>

      {/* ── LOGOUT CONFIRMATION MODAL ── */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback onPress={() => setShowLogoutModal(false)}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="log-out-outline" size={32} color={palette.primary} />
            </View>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalSub}>Are you sure you want to sign out of your account? You will need to log back in to access your classes.</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowLogoutModal(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => { setShowLogoutModal(false); onLogout(); }} activeOpacity={0.85}>
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Aligns avatar with the top of the "Profile" text
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerTextGroup: {
    flexShrink: 1,
    paddingRight: spacing.md,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
    lineHeight: 48,
    includeFontPadding: false,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingText: {
    color: palette.muted,
    fontSize: 16,
    fontFamily: typography.primaryMedium,
    flexShrink: 1,
  },
  roleChip: {
    backgroundColor: palette.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: palette.border,
  },
  roleChipText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    color: palette.white,
    fontSize: 22,
    fontFamily: typography.primaryBold,
  },

  fixedContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 110,
  },
  spacer: {
    flex: 1,
  },

  bentoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  bentoSquare: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'space-between',
    minHeight: 125,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  bentoIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.sm,
  },
  statValue: {
    color: palette.ink,
    fontSize: 32,
    fontFamily: typography.primaryBold,
  },
  statValueText: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryMedium,
    marginTop: 2,
  },

  sectionLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.primaryBold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  settingsCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.primaryMedium,
  },
  settingDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: 74,
  },

  // ── ENLARGED SIGN OUT BUTTON ──
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 20, // Taller, more prominent tap target
    backgroundColor: '#FFF5F5',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    elevation: 2,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  signOutText: {
    color: palette.primary,
    fontFamily: typography.primaryBold,
    fontSize: 18, // Larger text
    letterSpacing: 0.5,
  },

  // ── GOOGLE-STYLE ACCOUNT MODAL ──
  accountModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  accountModalCard: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 32,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    elevation: 24,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    overflow: 'hidden',
  },
  accountModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xl,
  },
  accountEmail: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.primaryBold,
  },
  accountHero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  accountAvatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  accountAvatarTextLarge: {
    color: palette.white,
    fontSize: 36,
    fontFamily: typography.primaryBold,
  },
  accountGreeting: {
    color: palette.ink,
    fontSize: 26,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.lg,
  },
  manageAccountBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: palette.border,
  },
  manageAccountBtnText: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: typography.primaryBold,
  },
  accountDivider: {
    height: 1,
    backgroundColor: palette.border,
    width: '100%',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  accountRowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  accountRowAvatarText: {
    color: palette.white,
    fontSize: 16,
    fontFamily: typography.primaryBold,
  },
  accountRowTextGroup: {
    flex: 1,
  },
  accountRowName: {
    color: palette.ink,
    fontSize: 16,
    fontFamily: typography.primaryBold,
  },
  accountRowRole: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryMedium,
  },

  // ── LOGOUT MODAL ──
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: palette.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.xxl, alignItems: 'center', elevation: 24 },
  modalIconWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: palette.primary, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  modalTitle: { color: palette.ink, fontSize: 22, fontFamily: typography.primaryBold, textAlign: 'center', marginBottom: spacing.sm },
  modalSub: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl, paddingHorizontal: spacing.md },
  modalBtnRow: { flexDirection: 'row', width: '100%', gap: spacing.md },
  modalCancelBtn: { flex: 1, borderWidth: 1, borderColor: palette.border, paddingVertical: 16, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { color: palette.ink, fontFamily: typography.primaryBold, fontSize: 15, letterSpacing: 0.5 },
  modalConfirmBtn: { flex: 1, backgroundColor: palette.primary, paddingVertical: 16, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { color: palette.white, fontFamily: typography.primaryBold, fontSize: 15, letterSpacing: 0.5 },
});