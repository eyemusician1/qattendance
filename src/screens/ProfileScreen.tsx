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
  ScrollView,
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

  // Real-time Data States
  const [teacherStats, setTeacherStats] = useState({ activeClasses: 0, totalStudents: 0 });
  const [studentStats, setStudentStats] = useState({ enrolledClasses: 0, pendingRequests: 0 });

  // Extract initial for the fallback avatar
  const initial = fullName ? fullName.charAt(0).toUpperCase() : '?';

  // ── REAL-TIME DATA LISTENERS ──
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

      <View style={styles.header}>
        <Text style={styles.pageTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          {/* ── HERO IDENTITY SECTION ── */}
          <View style={styles.heroSection}>
            <View style={styles.avatarWrap}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <Text style={styles.userName} numberOfLines={1}>{fullName || 'Unknown User'}</Text>
            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>{role.toUpperCase()}</Text>
            </View>
          </View>

          {/* ── DYNAMIC ROLE-BASED STATS BENTO ── */}
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

          {/* ── PREFERENCES LIST ── */}
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingRowLeft}>
                <View style={styles.settingIconWrap}>
                  <Ionicons name="notifications-outline" size={20} color={palette.ink} />
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
                  <Ionicons name="help-circle-outline" size={20} color={palette.ink} />
                </View>
                <Text style={styles.settingText}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Spacer forces the Sign Out button to the bottom if screen is tall */}
        <View style={{ flex: 1, minHeight: spacing.xxxl }} />

        {/* ── SIGN OUT BUTTON (Anchored to bottom) ── */}
        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.7}
          onPress={() => setShowLogoutModal(true)}
        >
          <Ionicons name="log-out-outline" size={22} color={palette.primary} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>

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
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                activeOpacity={0.85}
              >
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
  },
  // flexGrow: 1 ensures it stretches to full height, paddingBottom clears the tab bar
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: 110,
  },

  // ── HERO IDENTITY ──
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    elevation: 8,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarText: {
    color: palette.white,
    fontSize: 36,
    fontFamily: typography.primaryBold,
  },
  userName: {
    color: palette.ink,
    fontSize: 24,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  roleChip: {
    backgroundColor: palette.white,
    paddingHorizontal: spacing.lg,
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

  // ── STATS BENTO ──
  bentoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  bentoSquare: {
    flex: 1,
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'space-between',
    minHeight: 120,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  bentoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    marginBottom: spacing.sm,
  },
  statValue: {
    color: palette.ink,
    fontSize: 28,
    fontFamily: typography.primaryBold,
  },
  statValueText: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.primaryBold,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.primaryMedium,
    marginTop: 2,
  },

  // ── PREFERENCES ──
  sectionLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.primaryBold,
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  settingsCard: {
    backgroundColor: palette.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingText: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.primaryMedium,
  },
  settingDivider: {
    height: 1,
    backgroundColor: palette.border,
    marginLeft: 68,
  },

  // ── SIGN OUT BTN ──
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    backgroundColor: '#FFF5F5',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: {
    color: palette.primary,
    fontFamily: typography.primaryBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },

  // ── CUSTOM LOGOUT MODAL ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.xxl,
    alignItems: 'center',
    elevation: 24,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: palette.primary,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSub: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});