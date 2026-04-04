// src/screens/HomeScreen.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { palette, spacing, typography } from '../tokens';
import { useRole } from '../context/RoleContext';

export function HomeScreen() {
  const { role } = useRole();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Dashboard</Text>

      {/* ========================================== */}
      {/* STUDENT DASHBOARD                            */}
      {/* ========================================== */}
      {role === 'student' && (
        <View style={styles.bentoContainer}>
          <View style={[styles.cardFull, styles.alertCard]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.alertLabel}>Attendance Warning</Text>
              <Text style={styles.subtleTag}>STATUS</Text>
            </View>
            <View>
              <Text style={styles.cardHeader}>IT302 Limit Nearing</Text>
            </View>
          </View>

          <View style={styles.cardFull}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.badgeActive}>
                <Text style={styles.badgeTextActive}>Open Now</Text>
              </View>
              <Text style={styles.subtleTag}>LIVE SESSION</Text>
            </View>
            <View>
              <Text style={styles.cardHeader}>Information Assurance</Text>
              <Text style={styles.cardSub}>10:00 AM • Room 402</Text>
            </View>
          </View>

          <View style={styles.bentoRow}>
            <TouchableOpacity style={[styles.bentoSquare, styles.bgPrimary]}>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.white} style={styles.squareIconLight} />
              <Text style={styles.squareTextLight}>Mark Present</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]}>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.ink} style={styles.squareIconDark} />
              <Text style={styles.squareTextDark}>Join Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ========================================== */}
      {/* TEACHER DASHBOARD                            */}
      {/* ========================================== */}
      {role === 'teacher' && (
        <View style={styles.bentoContainer}>
          <View style={styles.cardFull}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.label}>Next Class</Text>
              <Text style={styles.subtleTag}>SCHEDULE</Text>
            </View>
            <View>
              <Text style={styles.cardHeader}>Software Engineering</Text>
              <Text style={styles.cardSub}>In 15 mins • Lab B</Text>
            </View>
          </View>

          <View style={styles.bentoRow}>
            <TouchableOpacity style={[styles.bentoSquare, styles.bgPrimary]}>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.white} style={styles.squareIconLight} />
              <Text style={styles.squareTextLight}>Roll Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]}>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.ink} style={styles.squareIconDark} />
              <Text style={styles.squareTextDark}>New Meeting</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.cardFull, styles.alertCard]}>
             <View style={styles.cardHeaderRow}>
               <Text style={styles.alertLabel}>Attention Required</Text>
               <Text style={styles.subtleTag}>STATUS</Text>
             </View>
             <View>
               <Text style={styles.cardHeader}>3 Critical Students</Text>
               <Text style={styles.cardSub}>2 pending reviews</Text>
             </View>
          </View>
        </View>
      )}

      {/* ========================================== */}
      {/* ADMIN DASHBOARD                              */}
      {/* ========================================== */}
      {role === 'admin' && (
        <View style={styles.bentoContainer}>
          <View style={[styles.cardFull, styles.adminAlertCard]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.adminAlertLabel}>Action Needed</Text>
              <Text style={styles.subtleTag}>URGENT</Text>
            </View>
            <View>
              <Text style={styles.cardHeader}>4 Pending Requests</Text>
              <Text style={styles.cardSub}>Teacher role approvals</Text>
            </View>
          </View>

          <View style={styles.bentoRow}>
            <TouchableOpacity style={[styles.bentoSquare, styles.bgPrimary]}>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.white} style={styles.squareIconLight} />
              <Text style={styles.squareTextLight}>Review</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.bentoSquare, styles.bgSurface]}>
              <Ionicons name="arrow-forward-outline" size={20} color={palette.ink} style={styles.squareIconDark} />
              <Text style={styles.squareTextDark}>Sync Status</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl * 2,
  },
  pageTitle: {
    color: palette.ink,
    fontSize: 42,
    fontFamily: typography.primaryBold,
    marginBottom: spacing.xxxl,
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
    backgroundColor: '#FBEED2',
    borderColor: '#EBD197',
  },
  adminAlertCard: {
    backgroundColor: '#F5D0D3',
    borderColor: '#E2AEB3',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subtleTag: {
    fontFamily: typography.primaryRegular,
    fontSize: 10,
    color: palette.muted,
    opacity: 0.5,
    letterSpacing: 1,
  },
  squareIconLight: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.xl,
    opacity: 0.6,
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
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
  },
  bgPrimary: {
    backgroundColor: palette.primary,
  },
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
    color: '#8A6A24',
    fontSize: 13,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  adminAlertLabel: {
    color: '#802B32',
    fontSize: 13,
    fontFamily: typography.primaryBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardHeader: {
    color: palette.ink,
    fontSize: 24,
    fontFamily: typography.primaryBold,
    marginBottom: 4,
  },
  cardSub: {
    color: palette.body,
    fontSize: 16,
    fontFamily: typography.primaryRegular,
  },
  squareTextLight: {
    color: palette.white,
    fontSize: 20,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
  },
  squareTextDark: {
    color: palette.ink,
    fontSize: 20,
    fontFamily: typography.primaryBold,
    textAlign: 'center',
  },
  badgeActive: {
    alignSelf: 'flex-start',
    backgroundColor: palette.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 100,
  },
  badgeTextActive: {
    color: palette.surface,
    fontFamily: typography.primaryBold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});