import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, spacing, typography } from '../tokens';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useAuth } from '../context/AuthContext';

type RoleApplication = {
  id: string;
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  requestedRole: 'teacher' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

type FeedbackModalState = {
  visible: boolean;
  title: string;
  message: string;
  type: 'approved' | 'rejected' | 'error';
};

function formatSubmittedAt(value?: FirebaseFirestoreTypes.Timestamp | null) {
  if (!value) {
    return 'Just now';
  }

  const date = value.toDate();
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function AdminApplicationsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [pendingApplications, setPendingApplications] = useState<RoleApplication[]>([]);
  // Tracks IDs of apps we just processed so we can hide them instantly before Firestore syncs
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Custom Modal State
  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    visible: false,
    title: '',
    message: '',
    type: 'approved',
  });

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('roleApplications')
      .where('status', '==', 'pending')
      .orderBy('submittedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const next = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<RoleApplication, 'id'>;
            return {
              id: doc.id,
              ...data,
            };
          });
          setPendingApplications(next);
          setLoading(false);
        },
        error => {
          console.error('Failed to load pending applications:', error);
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  // Filter out the applications we just acted on for an instant UI update
  const displayApplications = useMemo(() => {
    return pendingApplications.filter(app => !processedIds.has(app.id));
  }, [pendingApplications, processedIds]);

  const hasApplications = displayApplications.length > 0;

  const reviewApplication = async (application: RoleApplication, decision: 'approved' | 'rejected') => {
    if (!user || processingId) {
      return;
    }

    setProcessingId(application.id);

    // Instantly hide the card from the UI
    setProcessedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(application.id);
      return newSet;
    });

    try {
      const appRef = firestore().collection('roleApplications').doc(application.id);
      const batch = firestore().batch();

      batch.update(appRef, {
        status: decision,
        reviewedBy: user.uid,
        reviewedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      if (decision === 'approved') {
        const userRef = firestore().collection('users').doc(application.ownerUid);
        batch.set(
          userRef,
          {
            role: application.requestedRole,
            status: 'active',
            approvedBy: user.uid,
            approvedAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();

      // Show success modal
      setFeedbackModal({
        visible: true,
        title: decision === 'approved' ? 'Application Approved' : 'Application Rejected',
        message: decision === 'approved'
          ? `${application.ownerName} has been granted ${application.requestedRole} access.`
          : `The role request for ${application.ownerName} has been declined.`,
        type: decision,
      });

    } catch (error) {
      console.error(`Failed to mark application as ${decision}:`, error);

      // If it fails, un-hide the card so the admin can try again
      setProcessedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(application.id);
        return newSet;
      });

      // Show error modal
      setFeedbackModal({
        visible: true,
        title: 'Action Failed',
        message: 'There was an issue processing this application. Please check your connection and try again.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const closeModal = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Applications</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={palette.primary} />
            <Text style={styles.emptyText}>Loading applications...</Text>
          </View>
        ) : !hasApplications ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-outline" size={32} color={palette.primary} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>No pending role applications.</Text>
          </View>
        ) : displayApplications.map((item) => (
          <View key={item.id} style={styles.applicationCard}>
            <View style={styles.cardTopRow}>
              <Text style={styles.name}>{item.ownerName || 'Unknown User'}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{item.requestedRole.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{item.ownerEmail || 'No email'}</Text>
            <Text style={styles.meta}>Submitted: {formatSubmittedAt(item.submittedAt)}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                activeOpacity={0.8}
                onPress={() => reviewApplication(item, 'rejected')}
                disabled={processingId === item.id}
              >
                <Ionicons name="close-outline" size={16} color={palette.ink} />
                <Text style={styles.rejectText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                activeOpacity={0.8}
                onPress={() => reviewApplication(item, 'approved')}
                disabled={processingId === item.id}
              >
                <Ionicons name="checkmark-outline" size={16} color={palette.white} />
                <Text style={styles.approveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── CUSTOM FEEDBACK MODAL ── */}
      <Modal
        visible={feedbackModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.feedbackModalCard}>

                {/* Dynamic Icon Wrapper */}
                <View style={[
                  styles.modalIconWrap,
                  feedbackModal.type === 'approved' && styles.iconWrapSuccess,
                  feedbackModal.type === 'rejected' && styles.iconWrapReject,
                  feedbackModal.type === 'error' && styles.iconWrapError,
                ]}>
                  <Ionicons
                    name={
                      feedbackModal.type === 'approved' ? 'checkmark-circle' :
                      feedbackModal.type === 'rejected' ? 'close-circle' : 'warning'
                    }
                    size={32}
                    color={
                      feedbackModal.type === 'approved' ? '#10B981' : // Green for success
                      feedbackModal.type === 'rejected' ? palette.ink :
                      '#EF4444' // Red for error
                    }
                  />
                </View>

                <Text style={styles.modalTitle}>{feedbackModal.title}</Text>
                <Text style={styles.modalMessage}>{feedbackModal.message}</Text>

                <TouchableOpacity
                  style={styles.modalButton}
                  activeOpacity={0.8}
                  onPress={closeModal}
                >
                  <Text style={styles.modalButtonText}>Got it</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
    paddingBottom: spacing.md,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
    lineHeight: 48,
    includeFontPadding: false,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl * 2,
    gap: spacing.lg,
  },
  applicationCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.xl,
    gap: spacing.sm,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: {
    flex: 1,
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.primaryBold,
  },
  rolePill: {
    backgroundColor: palette.secondarySoft,
    borderColor: palette.secondary,
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rolePillText: {
    color: palette.ink,
    fontSize: 11,
    fontFamily: typography.primaryBold,
    letterSpacing: 1,
  },
  meta: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryRegular,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 100,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  rejectBtn: {
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  approveBtn: {
    backgroundColor: palette.primary,
  },
  rejectText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  approveText: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl * 2,
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryMedium,
  },

  // ── CUSTOM MODAL STYLES ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  feedbackModalCard: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 28,
    padding: spacing.xxl,
    alignItems: 'center',
    elevation: 24,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconWrapSuccess: {
    backgroundColor: '#ECFDF5', // Light emerald green
  },
  iconWrapReject: {
    backgroundColor: palette.bg,
  },
  iconWrapError: {
    backgroundColor: '#FEF2F2', // Light red
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalMessage: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  modalButton: {
    width: '100%',
    backgroundColor: palette.primary,
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});