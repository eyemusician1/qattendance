// src/screens/ClassDetailScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  TextInput
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { useAuth } from '../context/AuthContext';

export function ClassDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { fullName } = useAuth();
  const { name, section, code } = route.params || {};

  const [activeTab, setActiveTab] = useState<'attendance' | 'students' | 'analysis'>('attendance');
  const [showPastMeetings, setShowPastMeetings] = useState(false);

  // ── NEW MEETING MODAL STATE ──
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().split('T')[0].replace(/-/g, '/'));
  const [meetingTime, setMeetingTime] = useState(() => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  });

  // Recurring State
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('Daily');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Open');

  const handleCreateMeeting = () => {
    // Future integration: Save to firestore here, then navigate to Roll Call screen
    setShowMeetingModal(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={26} color={palette.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Overview</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── CLASS INFO HEADER ── */}
        <View style={styles.infoCard}>
          <Text style={styles.className}>{name || 'Unnamed Class'}</Text>
          <Text style={styles.classMeta}>Section: {section || '--'} | Academic Year: 2026</Text>
          <Text style={styles.classMeta}>
            Class Code: <Text style={styles.codeHighlight}>{code || '----'}</Text>
          </Text>
        </View>

        {/* ── CUSTOM TOP TABS ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'attendance' && styles.tabButtonActive]}
            onPress={() => setActiveTab('attendance')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={activeTab === 'attendance' ? palette.primary : palette.muted} />
            <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>ATTENDANCE HISTORY</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'students' && styles.tabButtonActive]}
            onPress={() => setActiveTab('students')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={20} color={activeTab === 'students' ? palette.primary : palette.muted} />
            <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>STUDENTS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'analysis' && styles.tabButtonActive]}
            onPress={() => setActiveTab('analysis')}
            activeOpacity={0.7}
          >
            <Ionicons name="bar-chart-outline" size={20} color={activeTab === 'analysis' ? palette.primary : palette.muted} />
            <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>ANALYSIS</Text>
          </TouchableOpacity>
        </View>

        {/* ── TAB CONTENT ── */}
        <View style={styles.content}>
          {activeTab === 'attendance' && (
            <View style={styles.attendanceContent}>
              <View style={styles.attendanceHeader}>
                <Text style={styles.sectionTitle}>Meetings (0)</Text>

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

              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No attendance records found</Text>
              </View>
            </View>
          )}

          {activeTab === 'students' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No students enrolled yet</Text>
            </View>
          )}

          {activeTab === 'analysis' && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Not enough data for analysis</Text>
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

                {/* Header with Flex Fix for Overlap */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>Create Attendance Record</Text>
                    <Text style={styles.modalSubtitle}>{name} - Section {section}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowMeetingModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={26} color={palette.ink} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  {/* Date & Time Row */}
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

                  {/* Recurring Toggle */}
                  <View style={styles.modalToggleRow}>
                    <Switch
                      value={isRecurring}
                      onValueChange={setIsRecurring}
                      trackColor={{ false: palette.border, true: palette.primary }}
                      thumbColor={palette.white}
                    />
                    <Text style={styles.modalToggleLabel}>Recurring Meeting</Text>
                  </View>

                  {/* Expanded Recurring Fields */}
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

                  {/* Status Dropdown Mock */}
                  <View style={styles.inputWrap}>
                    <Text style={styles.inputLabel}>Status</Text>
                    <TouchableOpacity style={styles.dropdownBox} activeOpacity={0.7}>
                      <Text style={styles.inputText}>{status}</Text>
                      <Ionicons name="caret-down" size={16} color={palette.muted} />
                    </TouchableOpacity>
                  </View>

                  {/* Summary Box */}
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Attendance Record Details:</Text>
                    <Text style={styles.summaryText}><Text style={styles.summaryBold}>Class:</Text> {name}</Text>
                    <Text style={styles.summaryText}><Text style={styles.summaryBold}>Date & Time:</Text> {meetingDate} {meetingTime}</Text>
                    {isRecurring && (
                      <Text style={styles.summaryText}><Text style={styles.summaryBold}>Recurrence:</Text> {recurrenceType} until {endDate || 'Not set'}</Text>
                    )}
                    <Text style={styles.summaryText}><Text style={styles.summaryBold}>Status:</Text> {status}</Text>
                    <Text style={styles.summaryText}><Text style={styles.summaryBold}>Teacher:</Text> {fullName}</Text>
                  </View>
                </ScrollView>

                {/* Footer Actions */}
                <View style={styles.modalFooter}>
                  <TouchableOpacity onPress={() => setShowMeetingModal(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.createBtn} onPress={handleCreateMeeting} activeOpacity={0.85}>
                    <Text style={styles.createBtnText}>CREATE RECORD</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: palette.bg,
  },
  headerTitle: {
    color: palette.ink,
    fontSize: 18,
    fontFamily: typography.primaryBold,
  },
  infoCard: {
    padding: spacing.xl,
    backgroundColor: palette.bg,
  },
  className: {
    color: palette.ink,
    fontSize: 32,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xs,
  },
  classMeta: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryMedium,
    marginBottom: 4,
  },
  codeHighlight: {
    color: palette.ink,
    fontFamily: typography.primaryBold,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingHorizontal: spacing.xl,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: spacing.xs,
  },
  tabButtonActive: {
    borderBottomColor: palette.primary,
  },
  tabText: {
    color: palette.muted,
    fontSize: 10,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  tabTextActive: {
    color: palette.primary,
  },
  content: {
    padding: spacing.xl,
  },
  attendanceContent: {
    flex: 1,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.primaryMedium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleLabel: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryMedium,
  },
  newMeetingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.primary,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: 100,
    gap: spacing.xs,
  },
  newMeetingText: {
    color: palette.white,
    fontFamily: typography.primaryBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: palette.muted,
    fontSize: 15,
    fontFamily: typography.primaryRegular,
  },

  // ── MODAL STYLES ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: palette.white,
    borderRadius: 20,
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
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  modalTitleContainer: {
    flex: 1, // Ensures text doesn't push the close button off screen
    paddingRight: spacing.md,
  },
  modalTitle: {
    color: palette.ink,
    fontSize: 22,
    fontFamily: typography.primaryBold,
    marginBottom: 4,
  },
  modalSubtitle: {
    color: palette.muted,
    fontSize: 14,
    fontFamily: typography.primaryMedium,
  },
  modalScroll: {
    marginBottom: spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  inputWrap: {
    flex: 1,
    marginBottom: spacing.xs,
  },
  inputLabel: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.primaryMedium,
    marginBottom: spacing.xs,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
    height: 48, // Consistent height for inputs and dropdowns
  },
  inputText: {
    flex: 1,
    color: palette.ink,
    fontFamily: typography.primaryRegular,
    fontSize: 15,
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  modalToggleLabel: {
    color: palette.ink,
    fontSize: 15,
    fontFamily: typography.primaryMedium,
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
    height: 48, // Matches input height perfectly
  },
  summaryBox: {
    backgroundColor: palette.bg,
    padding: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  summaryTitle: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.sm,
  },
  summaryText: {
    color: palette.ink,
    fontSize: 14,
    fontFamily: typography.primaryRegular,
    lineHeight: 22,
  },
  summaryBold: {
    fontFamily: typography.primaryBold,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  cancelBtnText: {
    color: palette.muted,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
  createBtn: {
    backgroundColor: palette.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    color: palette.white,
    fontSize: 13,
    fontFamily: typography.primaryBold,
    letterSpacing: 0.5,
  },
});