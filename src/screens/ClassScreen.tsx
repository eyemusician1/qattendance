// src/screens/ClassScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';
import { useAuth } from '../context/AuthContext';
import firestore from '@react-native-firebase/firestore';

type TeacherClass = {
  id: string;
  code: string;
  name: string;
  section: string;
  enrolled: number;
  pending: number;
};

type StudentClass = {
  id: string;
  code: string;
  name: string;
  section: string;
  schedule: string;
  status: string;
  isWarning: boolean;
};

type Meridiem = 'AM' | 'PM';

type AlertModalState = {
  visible: boolean;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'success' | 'confirm';
  confirmText?: string;
  onConfirm?: () => void;
};

export function ClassScreen() {
  const { role } = useRole();
  const { user, fullName } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // ── STATE ──
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([]);
  const [studentClasses, setStudentClasses] = useState<StudentClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  // Custom Alert Modal State
  const [alertModal, setAlertModal] = useState<AlertModalState>({
    visible: false,
    title: '',
    message: '',
    type: 'warning',
  });

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSection, setNewSection] = useState('');
  const [newStartDigits, setNewStartDigits] = useState('');
  const [newEndDigits, setNewEndDigits] = useState('');
  const [startMeridiem, setStartMeridiem] = useState<Meridiem>('AM');
  const [endMeridiem, setEndMeridiem] = useState<Meridiem>('PM');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  // ── PRECISE SCROLL ANIMATION LOGIC ──
  const [isAtTop, setIsAtTop] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // ── EXPANDABLE FAB LOGIC ──
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fabExpanded = React.useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const toValue = isFabOpen ? 0 : 1;
    setIsFabOpen(!isFabOpen);
    Animated.spring(fabExpanded, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 40,
    }).start();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    if (offsetY > 10 && isAtTop) {
      setIsAtTop(false);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    else if (offsetY <= 10 && !isAtTop) {
      setIsAtTop(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const sanitizeTimeDigits = (value: string) => value.replace(/\D/g, '').slice(0, 4);

  const formatTimeDigits = (digits: string) => {
    if (!digits) return '';
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, digits.length - 2)}:${digits.slice(-2)}`;
  };

  const buildTimeLabel = (digits: string, meridiem: Meridiem): string | null => {
    if (digits.length < 3) return null;

    const hourPart = digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2);
    const minutePart = digits.slice(-2);
    const hour = Number(hourPart);
    const minute = Number(minutePart);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    return `${hour}:${minutePart} ${meridiem}`;
  };

  // ── REAL-TIME LISTENERS ──
  useEffect(() => {
    if (!user) return;

    if (role === 'teacher') {
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
            console.error('Failed to load teacher classes:', error);
            setIsLoadingClasses(false);
          }
        );
      return () => unsubscribe();
    }

    if (role === 'student') {
      const unsubscribe = firestore()
        .collection('enrollments')
        .where('studentUid', '==', user.uid)
        .where('status', '==', 'approved')
        .onSnapshot(
          snapshot => {
            const enrolledData = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: data.classId || doc.id,
                code: data.classCode || '----',
                name: data.className || 'Unknown Class',
                section: data.section || '---',
                schedule: data.schedule || 'TBA',
                status: data.attendanceStatus || 'Good Standing',
                isWarning: data.isWarning || false,
              };
            });
            setStudentClasses(enrolledData);
            setIsLoadingClasses(false);
          },
          error => {
            console.error('Failed to load student classes:', error);
            setIsLoadingClasses(false);
          }
        );
      return () => unsubscribe();
    }
  }, [role, user]);

  // ── ACTIONS ──
  const closeAlert = () => setAlertModal(prev => ({ ...prev, visible: false }));

  const openCreateModal = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setGeneratedCode(code);
    setNewClassName('');
    setNewSection('');
    setNewStartDigits('');
    setNewEndDigits('');
    setStartMeridiem('AM');
    setEndMeridiem('PM');
    setShowCreateModal(true);
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim() || !newSection.trim() || !newStartDigits.trim() || !newEndDigits.trim()) {
      setAlertModal({ visible: true, title: 'Required Fields', message: 'Please enter class name, section, start time, and end time.', type: 'warning' });
      return;
    }

    const startTime = buildTimeLabel(newStartDigits, startMeridiem);
    const endTime = buildTimeLabel(newEndDigits, endMeridiem);

    if (!startTime || !endTime) {
      setAlertModal({ visible: true, title: 'Invalid Time', message: 'Enter time as integer digits only (e.g. 230 or 1130).', type: 'warning' });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    let createdClassId: string | null = null;
    const schedule = `${startTime} - ${endTime}`;

    try {
      const docRef = await firestore().collection('classes').add({
        name: newClassName.trim(),
        section: newSection.trim(),
        startTime,
        endTime,
        schedule,
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
      const code = (error as { code?: string })?.code;
      if (code === 'firestore/permission-denied') {
        setAlertModal({ visible: true, title: 'Permission Denied', message: 'Your account does not have teacher access in Firestore yet. Ask an admin to approve your role.', type: 'error' });
      } else {
        setAlertModal({ visible: true, title: 'Error', message: 'Could not create the class. Please try again.', type: 'error' });
      }
    } finally {
      setIsSubmitting(false);
      if (createdClassId) {
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

  const handleDeleteClass = (cls: TeacherClass) => {
    setAlertModal({
      visible: true,
      title: 'Delete Class',
      message: `Delete ${cls.name} (${cls.code})? This will remove the class and all associated meetings and enrollments.`,
      type: 'confirm',
      confirmText: 'Delete',
      onConfirm: async () => {
        closeAlert();
        if (deletingClassId) return;
        setDeletingClassId(cls.id);
        try {
          const [meetingSnap, enrollmentSnap] = await Promise.all([
            firestore().collection('meetings').where('classId', '==', cls.id).get(),
            firestore().collection('enrollments').where('classId', '==', cls.id).get(),
          ]);

          const batch = firestore().batch();
          meetingSnap.docs.forEach(doc => batch.delete(doc.ref));
          enrollmentSnap.docs.forEach(doc => batch.delete(doc.ref));
          batch.delete(firestore().collection('classes').doc(cls.id));
          await batch.commit();
        } catch (error) {
          console.error('Failed to delete class:', error);
          setAlertModal({ visible: true, title: 'Error', message: 'Could not delete the class.', type: 'error' });
        } finally {
          setDeletingClassId(null);
        }
      }
    });
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
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {role === 'student' && (
          isLoadingClasses ? (
            <ActivityIndicator size="large" color={palette.primary} style={{ marginTop: spacing.xxxl }} />
          ) : studentClasses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={48} color={palette.border} />
              <Text style={styles.emptyStateText}>You are not enrolled in any classes.</Text>
            </View>
          ) : (
            studentClasses.map((cls) => (
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
            ))
          )
        )}

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
              <TouchableOpacity
                key={cls.id}
                style={styles.classCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClassDetail', {
                  classId: cls.id,
                  name: cls.name,
                  section: cls.section,
                  code: cls.code
                })}
              >
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.classCode}>{cls.code} • {cls.section}</Text>
                  <Ionicons name="arrow-forward-outline" size={20} color={palette.primary} style={styles.navIcon} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.className}>{cls.name}</Text>
                  <Text style={styles.classSchedule}>Manage Roster & Attendance</Text>
                </View>
                <View style={styles.classCardFooter}>
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

                  <TouchableOpacity
                    style={[styles.deleteClassBtn, deletingClassId === cls.id && styles.deleteClassBtnDisabled]}
                    activeOpacity={0.8}
                    disabled={deletingClassId === cls.id}
                    onPress={(event: any) => {
                      if (event?.stopPropagation) event.stopPropagation();
                      handleDeleteClass(cls);
                    }}
                  >
                    {deletingClassId === cls.id ? (
                      <ActivityIndicator size="small" color="#DC2626" />
                    ) : (
                      <Text style={styles.deleteClassText}>Delete</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )
        )}

        {role === 'admin' && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Admins manage classes via the System Dashboard.</Text>
          </View>
        )}
      </ScrollView>

      {/* ── FULL SCREEN OVERLAY FOR FAB MENU ── */}
      {role === 'teacher' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.fabOverlay,
            { opacity: fabExpanded }
          ]}
          pointerEvents={isFabOpen ? 'auto' : 'none'}
        >
          <TouchableWithoutFeedback onPress={toggleFab}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* ── EXPANDABLE FLOATING ACTION BUTTON (TEACHER ONLY) ── */}
      {role === 'teacher' && (
        <Animated.View
          style={[styles.fabContainer, { bottom: insets.bottom + 80, opacity: fadeAnim }]}
          pointerEvents={isAtTop || isFabOpen ? 'box-none' : 'none'}
        >

          {/* Expanded Menu Options */}
          <Animated.View
            style={[
              styles.fabMenu,
              {
                opacity: fabExpanded,
                transform: [{
                  translateY: fabExpanded.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0]
                  })
                }],
              }
            ]}
            pointerEvents={isFabOpen ? 'auto' : 'none'}
          >
            <TouchableOpacity
              style={styles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => {
                toggleFab();
                setAlertModal({ visible: true, title: 'Upload ClassList', message: 'ClassList CSV upload functionality coming soon.', type: 'success' });
              }}
            >
              <Ionicons name="cloud-upload-outline" size={22} color={palette.ink} />
              <Text style={styles.fabMenuItemText}>Classlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fabMenuItem}
              activeOpacity={0.8}
              onPress={() => {
                toggleFab();
                openCreateModal();
              }}
            >
              <Ionicons name="folder-outline" size={22} color={palette.ink} />
              <Text style={styles.fabMenuItemText}>Create Class</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Primary FAB (Master Toggle) */}
          <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={toggleFab}>
            <Animated.View style={{
              transform: [{
                rotate: fabExpanded.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '45deg']
                })
              }]
            }}>
              <Ionicons name="add" size={40} color={palette.white} />
            </Animated.View>
          </TouchableOpacity>

        </Animated.View>
      )}

      {/* ── CREATE CLASS MODAL ── */}
      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowCreateModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create class</Text>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={24} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalSubtitle}>
                  You're creating a class. After you enter the class name and section, you can add students.
                </Text>

                <TextInput style={styles.input} placeholder="Class name" placeholderTextColor={palette.muted} value={newClassName} onChangeText={setNewClassName} />
                <TextInput style={styles.input} placeholder="Section" placeholderTextColor={palette.muted} value={newSection} onChangeText={setNewSection} />

                <View style={styles.timeRow}>
                  <View style={styles.timeInputBlock}>
                    <View style={styles.timeHeaderRow}>
                      <Text style={styles.timeHeaderLabel}>Start</Text>
                      <View style={styles.periodSwitch}>
                        <TouchableOpacity style={[styles.periodBtn, startMeridiem === 'AM' && styles.periodBtnActive]} onPress={() => setStartMeridiem('AM')}>
                          <Text style={[styles.periodText, startMeridiem === 'AM' && styles.periodTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.periodBtn, startMeridiem === 'PM' && styles.periodBtnActive]} onPress={() => setStartMeridiem('PM')}>
                          <Text style={[styles.periodText, startMeridiem === 'PM' && styles.periodTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TextInput style={[styles.input, styles.timeInput]} placeholder="e.g. 230" placeholderTextColor={palette.muted} keyboardType="number-pad" value={formatTimeDigits(newStartDigits)} onChangeText={text => setNewStartDigits(sanitizeTimeDigits(text))} />
                  </View>

                  <View style={styles.timeInputBlock}>
                    <View style={styles.timeHeaderRow}>
                      <Text style={styles.timeHeaderLabel}>End</Text>
                      <View style={styles.periodSwitch}>
                        <TouchableOpacity style={[styles.periodBtn, endMeridiem === 'AM' && styles.periodBtnActive]} onPress={() => setEndMeridiem('AM')}>
                          <Text style={[styles.periodText, endMeridiem === 'AM' && styles.periodTextActive]}>AM</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.periodBtn, endMeridiem === 'PM' && styles.periodBtnActive]} onPress={() => setEndMeridiem('PM')}>
                          <Text style={[styles.periodText, endMeridiem === 'PM' && styles.periodTextActive]}>PM</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TextInput style={[styles.input, styles.timeInput]} placeholder="e.g. 400" placeholderTextColor={palette.muted} keyboardType="number-pad" value={formatTimeDigits(newEndDigits)} onChangeText={text => setNewEndDigits(sanitizeTimeDigits(text))} />
                  </View>
                </View>
                <Text style={styles.timeHintText}>Enter digits only, format example: 230 for 2:30</Text>

                <View style={styles.codeCallout}>
                  <Text style={styles.codeCalloutText}>
                    The class code will be automatically generated: <Text style={styles.codeHighlight}>{generatedCode}</Text>
                  </Text>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.createBtn, isSubmitting && { opacity: 0.7 }]} onPress={handleCreateClass} disabled={isSubmitting}>
                    {isSubmitting ? <ActivityIndicator size="small" color={palette.white} /> : <Text style={styles.createBtnText}>CREATE</Text>}
                  </TouchableOpacity>
                </View>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── CUSTOM ALERT/FEEDBACK MODAL ── */}
      <Modal visible={alertModal.visible} transparent animationType="fade" onRequestClose={closeAlert}>
        <TouchableWithoutFeedback onPress={closeAlert}>
          <View style={styles.alertBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.alertCard}>

                <View style={[
                  styles.alertIconWrap,
                  alertModal.type === 'success' && { backgroundColor: '#ECFDF5' },
                  alertModal.type === 'error' && { backgroundColor: '#FEF2F2' },
                  alertModal.type === 'warning' && { backgroundColor: '#FFFBEB' },
                  alertModal.type === 'confirm' && { backgroundColor: '#FEF2F2' },
                ]}>
                  <Ionicons
                    name={
                      alertModal.type === 'success' ? 'checkmark-circle' :
                      alertModal.type === 'warning' ? 'alert-circle' : 'warning'
                    }
                    size={32}
                    color={
                      alertModal.type === 'success' ? '#10B981' :
                      alertModal.type === 'warning' ? '#D97706' : '#DC2626'
                    }
                  />
                </View>

                <Text style={styles.alertTitle}>{alertModal.title}</Text>
                <Text style={styles.alertMessage}>{alertModal.message}</Text>

                {alertModal.type === 'confirm' ? (
                  <View style={styles.alertActionRow}>
                    <TouchableOpacity style={styles.alertCancelBtn} onPress={closeAlert}>
                      <Text style={styles.alertCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.alertConfirmBtn} onPress={alertModal.onConfirm}>
                      <Text style={styles.alertConfirmText}>{alertModal.confirmText || 'Confirm'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.alertGotItBtn} onPress={closeAlert}>
                    <Text style={styles.alertGotItText}>Got it</Text>
                  </TouchableOpacity>
                )}

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.bg },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md, backgroundColor: palette.bg },
  pageTitle: { color: palette.ink, fontSize: 42, fontFamily: typography.primaryBold },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xxxl * 2, gap: spacing.lg },
  classCard: { backgroundColor: palette.white, borderRadius: 24, padding: spacing.xl, borderWidth: 1, borderColor: palette.border, gap: spacing.md, elevation: 2, shadowColor: palette.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classCode: { color: palette.primary, fontSize: 12, fontFamily: typography.primaryBold, textTransform: 'uppercase', letterSpacing: 1.2 },
  navIcon: { opacity: 0.6, transform: [{ rotate: '-45deg' }] },
  cardBody: { gap: spacing.xs },
  className: { color: palette.ink, fontSize: 22, fontFamily: typography.primaryBold },
  classSchedule: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular },
  classCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  snapshotPill: { alignSelf: 'flex-start', backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 100 },
  snapshotText: { color: palette.ink, fontFamily: typography.primaryBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  snapshotPillWarning: { alignSelf: 'flex-start', backgroundColor: palette.secondarySoft, borderColor: palette.secondary, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 100 },
  snapshotTextWarning: { color: palette.ink, fontFamily: typography.primaryBold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  deleteClassBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 100 },
  deleteClassBtnDisabled: { opacity: 0.7 },
  deleteClassText: { color: '#DC2626', fontSize: 12, fontFamily: typography.primaryBold, letterSpacing: 0.4 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyStateText: { color: palette.muted, fontFamily: typography.primaryRegular, textAlign: 'center', fontSize: 14 },

  // ── EXPANDABLE FLOATING ACTION BUTTON SYSTEM ──
  fabOverlay: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  fabContainer: {
    position: 'absolute',
    right: spacing.xl,
    alignItems: 'flex-end', // Aligns the menu items and FAB to the right
    gap: spacing.md,
    zIndex: 20,
  },
  fabMenu: {
    alignItems: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: 100,
    gap: spacing.md,
    elevation: 6,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fabMenuItemText: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.3,
  },
  fab: {
    width: 72,
    height: 72,
    borderRadius: 24, // Premium Squircle Shape
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  modalCard: { width: '100%', backgroundColor: palette.white, borderRadius: 16, padding: spacing.xxl, elevation: 24, shadowColor: palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { color: palette.ink, fontSize: 22, fontFamily: typography.primaryBold },
  modalSubtitle: { color: palette.muted, fontSize: 14, fontFamily: typography.primaryRegular, lineHeight: 20, marginBottom: spacing.xl },
  input: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.border, borderRadius: 8, paddingHorizontal: spacing.lg, paddingVertical: 14, fontSize: 16, fontFamily: typography.primaryRegular, color: palette.ink, marginBottom: spacing.lg },
  timeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  timeInputBlock: { flex: 1 },
  timeHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  timeHeaderLabel: { color: palette.ink, fontSize: 13, fontFamily: typography.primaryBold, textTransform: 'uppercase', letterSpacing: 0.6 },
  periodSwitch: { flexDirection: 'row', backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, borderRadius: 100, padding: 2 },
  periodBtn: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: 100 },
  periodBtnActive: { backgroundColor: palette.primary },
  periodText: { color: palette.muted, fontSize: 11, fontFamily: typography.primaryBold, letterSpacing: 0.4 },
  periodTextActive: { color: palette.white },
  timeInput: { marginBottom: 0, textAlign: 'left', textAlignVertical: 'center', color: palette.ink, fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'System', fontSize: 16, backgroundColor: palette.surface, borderColor: 'rgba(31, 31, 31, 0.24)', borderWidth: 1.2, minHeight: 45, paddingVertical: 10 },
  timeHintText: { color: palette.muted, fontSize: 12, fontFamily: typography.primaryRegular, lineHeight: 16, marginTop: 4, marginBottom: spacing.lg },
  codeCallout: { backgroundColor: palette.bg, padding: spacing.lg, borderRadius: 8, marginBottom: spacing.xxl },
  codeCalloutText: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryRegular },
  codeHighlight: { color: palette.ink, fontFamily: typography.primaryBold },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  cancelBtn: { height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
  cancelBtnText: { color: palette.muted, fontSize: 13, fontFamily: typography.primaryBold, letterSpacing: 0.5 },
  createBtn: { backgroundColor: palette.primary, height: 40, paddingHorizontal: spacing.xl, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { color: palette.white, fontSize: 13, fontFamily: typography.primaryBold, letterSpacing: 0.5 },

  // Custom Alert Styles
  alertBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  alertCard: { width: '100%', backgroundColor: palette.white, borderRadius: 28, padding: spacing.xxl, alignItems: 'center', elevation: 24, shadowColor: palette.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  alertTitle: { color: palette.ink, fontSize: 22, fontFamily: typography.primaryBold, textAlign: 'center', marginBottom: spacing.xs },
  alertMessage: { color: palette.muted, fontSize: 15, fontFamily: typography.primaryRegular, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxl },
  alertGotItBtn: { width: '100%', backgroundColor: palette.primary, paddingVertical: 16, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  alertGotItText: { color: palette.white, fontFamily: typography.primaryBold, fontSize: 15, letterSpacing: 0.5 },
  alertActionRow: { flexDirection: 'row', width: '100%', gap: spacing.md },
  alertCancelBtn: { flex: 1, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.border, paddingVertical: 16, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  alertCancelText: { color: palette.ink, fontFamily: typography.primaryBold, fontSize: 15, letterSpacing: 0.5 },
  alertConfirmBtn: { flex: 1, backgroundColor: '#DC2626', paddingVertical: 16, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  alertConfirmText: { color: palette.white, fontFamily: typography.primaryBold, fontSize: 15, letterSpacing: 0.5 },
});