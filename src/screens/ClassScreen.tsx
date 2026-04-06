// src/screens/ClassScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';


const STUDENT_CLASSES = [
  { id: '1', code: 'IT302', name: 'Data Structures', section: 'A1', schedule: 'Mon/Wed • 10:00 AM', status: 'Perfect Attendance', isWarning: false },
  { id: '2', code: 'CS411', name: 'Information Assurance', section: 'B2', schedule: 'Tue/Thu • 1:00 PM', status: 'Warning: 2 Absences', isWarning: true },
  { id: '3', code: 'GE101', name: 'Understanding the Self', section: 'C1', schedule: 'Fri • 9:00 AM', status: 'Present (Current Week)', isWarning: false },
];

type TeacherClass = {
  id: string;
  code: string;
  name: string;
  section: string;
  enrolled: number;
  pending: number;
};

export function ClassScreen() {
  const { role } = useRole();
  const { user, fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // ── STATE ──
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── REAL-TIME LISTENER ──
  useEffect(() => {
    if (role !== 'teacher' || !user) {
      setIsLoadingClasses(false);
      return;
    }

    const unsubscribe = firestore()
      .collection('classes')
      .where('teacherUid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        snapshot => {
          const classesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              code: data.code || '----',
              name: data.name || 'Unnamed Class',
              section: data.section || '---',
              enrolled: data.enrolledCount || 0,
              pending: data.pendingCount || 0,
            };
          });
          setTeacherClasses(classesData);
          setIsLoadingClasses(false);
        },
        error => {
          console.error('Failed to load classes:', error);
          setIsLoadingClasses(false);
        }
      );

    return () => unsubscribe();
  }, [role, user]);

  // ── ACTIONS ──
  const openCreateModal = () => {
    // Generate a random 4-character alphanumeric code (e.g. "X14S")
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setGeneratedCode(code);
    setNewClassName('');
    setNewSection('');
    setShowCreateModal(true);
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !newSection.trim()) {
      Alert.alert('Required Fields', 'Please enter a class name and section.');
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    let createdClassId: string | null = null;

    try {
      const docRef = await firestore().collection('classes').add({
        name: newClassName.trim(),
        section: newSection.trim(),
        code: generatedCode,
        teacherUid: user.uid,
        teacherName: fullName,
        enrolledCount: 0,
        pendingCount: 0,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      createdClassId = docRef.id;
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create class:', error);
      Alert.alert('Error', 'Could not create the class. Please try again.');
    } finally {
      setIsSubmitting(false);

      if (createdClassId) {
        // Give the modal 400ms to fade out, then jump to the new class.
        setTimeout(() => {
          navigation.navigate('ClassDetail', {
            classId: createdClassId,
            name: newClassName.trim(),
            section: newSection.trim(),
            code: generatedCode,
          });
        }, 400);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Classes</Text>
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── STUDENT ── */}
        {role === 'student' && STUDENT_CLASSES.map((cls) => (
          <TouchableOpacity key={cls.id} style={styles.classCard} activeOpacity={0.7}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.primary} style={styles.navIcon} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.className}>{cls.name}</Text>
              <Text style={styles.classSchedule}>{cls.schedule}</Text>
            </View>
            <View style={[styles.snapshotPill, cls.isWarning && styles.snapshotPillWarning]}>
              <Text style={[styles.snapshotText, cls.isWarning && styles.snapshotTextWarning]}>
                {cls.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* ── TEACHER (DYNAMIC FIREBASE LIST) ── */}
        {role === 'teacher' && (
          isLoadingClasses ? (
            <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: spacing.xxxl }} />
          ) : teacherClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color={palette.border} />
              <Text style={styles.emptyStateText}>You haven't created any classes yet.</Text>
            </View>
          ) : (
            teacherClasses.map((cls) => (
              <TouchableOpacity key={cls.id} style={styles.classCard} activeOpacity={0.7}
              onPress={() => navigation.navigate('ClassDetail', {
                classid: cls.id,
                name: cls.name,
                section: cls.section,
                code: cls.code
              })}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
                  <Ionicons name="arrow-forward-outline" size={20} color={palette.primary} style={styles.navIcon} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.classSchedule}>Manage Roster & Attendance</Text>
                </View>
                <View style={styles.pillRow}>
                  <View style={styles.snapshotPill}>
                    <Text style={styles.snapshotText}>{cls.enrolled} Enrolled</Text>
                  </View>
                  {cls.pending > 0 && (
                    <View style={styles.snapshotPillWarning}>
                      <Text style={styles.snapshotTextWarning}>{cls.pending} Needs Review</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )
        )}

        {/* ── ADMIN ── */}
        {role === 'admin' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Admins manage classes via the System Dashboard.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── FLOATING ACTION BUTTON (TEACHER ONLY) ── */}
      {role === 'teacher' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          activeOpacity={0.8}
          onPress={openCreateModal}
        >
          <Ionicons name="add" size={40} color={palette.white} />
        </TouchableOpacity>
      )}

      {/* ── CREATE CLASS MODAL ── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>

                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create class</Text>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={24} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                {/* Subtitle */}
                <Text style={styles.modalSubtitle}>
                  You're creating a class. After you enter the class name and section, you can add students.
                </Text>

                {/* Form Inputs */}
                <TextInput
                  style={styles.input}
                  placeholder="Class name"
                  placeholderTextColor={palette.muted}
                  value={newClassName}
                  onChangeText={setNewClassName}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Section"
                  placeholderTextColor={palette.muted}
                  value={newSection}
                  onChangeText={setNewSection}
                />

                {/* Auto-generated Code Callout */}
                <View style={styles.codeCallout}>
                  <Text style={styles.codeCalloutText}>
                    The class code will be automatically generated: <Text style={styles.codeHighlight}>{generatedCode}</Text>
                  </Text>
                </View>

                {/* Footer Row */}
                <View style={styles.modalFooter}>
                  {/* File Attachment Mock */}
                  <TouchableOpacity style={styles.attachmentBtn} activeOpacity={0.7}>
                    <Ionicons name="attach-outline" size={20} color={palette.ink} />
                    <Text style={styles.attachmentText}>ClassList</Text>
                  </TouchableOpacity>

                  {/* Actions */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.cancelBtn}>
                      <Text style={styles.cancelBtnText}>CANCEL</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.createBtn, isSubmitting && { opacity: 0.7 }]}
                      onPress={handleCreateClass}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color={palette.white} />
                      ) : (
                        <Text style={styles.createBtnText}>CREATE</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

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
    backgroundColor: palette.bg,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
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
  classCard: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.md,
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classCode: {
    color: palette.primary,
    fontSize: 12,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  navIcon: {
    opacity: 0.6,
    transform: [{ rotate: '-45deg' }],
  },
  cardBody: {
    gap: spacing.xs,
  },
  className: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
  },
  classSchedule: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  snapshotPill: {
    alignSelf: 'flex-start',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  snapshotText: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  snapshotPillWarning: {
    alignSelf: 'flex-start',
    backgroundColor: palette.secondarySoft,
    borderColor: palette.secondary,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  snapshotTextWarning: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyStateText: {
    color: palette.muted,
    fontFamily: typography.primaryRegular,
    textAlign: 'center',
    fontSize: 14,
  },

  // ── FLOATING ACTION BUTTON ──
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // ── MODAL STYLES ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.xxl,
    elevation: 24,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
  },
  modalSubtitle: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryRegular,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: typography.primaryRegular,
    color: palette.ink,
    marginBottom: spacing.lg,
  },
  codeCallout: {
    backgroundColor: palette.bg,
    padding: spacing.lg,
    borderRadius: 8,
    marginBottom: spacing.xxl,
  },
  codeCalloutText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryRegular,
  },
  codeHighlight: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10, // Slimmed down from 12
    paddingHorizontal: spacing.md, // Reduced horizontal footprint
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 100,
  },
  attachmentText: {
    color: palette.ink,
    fontSize: 13, // Scaled down from 14
    fontFamily: typography.primaryMedium,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md, // Tightened the gap between Cancel and Create
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs, // Tightened touch target width
  },
  cancelBtnText: {
    color: palette.muted,
    fontSize: 13, // Scaled down from 14
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
  createBtn: {
    backgroundColor: palette.primary,
    paddingVertical: 10, // Slimmed down to perfectly match attachmentBtn
    paddingHorizontal: spacing.xl, // Reduced from xxl to save space
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: palette.white,
    fontSize: 13, // Scaled down from 14
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
});