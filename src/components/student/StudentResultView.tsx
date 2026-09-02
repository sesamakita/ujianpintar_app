import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Check, ShieldCheck, Award, Home, Lock, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import type { GradeRecord } from '../../types/exam';
import { typography, colors, radii, shadows } from '../../theme';

interface StudentResultViewProps {
  gradeRecord: GradeRecord;
  integritySeal: string;
  syncStatus?: 'synced' | 'pending' | 'syncing';
  onRetrySync?: () => Promise<void>;
  onResetToHome: () => void;
}

export const StudentResultView: React.FC<StudentResultViewProps> = ({
  gradeRecord,
  integritySeal,
  syncStatus = 'synced',
  onRetrySync,
  onResetToHome,
}) => {
  const isPassed = gradeRecord.status === 'Lulus';

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Success Badge */}
      <View style={styles.iconCircle}>
        <Check size={32} color="#ffffff" strokeWidth={3} />
      </View>

      <Text style={styles.title}>Ujian Berhasil Dikumpulkan</Text>
      <Text style={styles.subtitle}>
        Lembar jawaban telah terkoreksi otomatis dan tersimpan aman di basis data pengawas.
      </Text>

      {/* Sync Status Banner */}
      {syncStatus === 'synced' && (
        <View style={styles.syncBannerSuccess}>
          <CheckCircle2 size={15} color={colors.successText} />
          <Text style={styles.syncBannerSuccessText}>Tersinkronisasi ke Server Pengawas</Text>
        </View>
      )}

      {syncStatus === 'pending' && (
        <View style={styles.syncBannerPending}>
          <View style={styles.syncBannerPendingLeft}>
            <CloudOff size={15} color={colors.warningText} />
            <Text style={styles.syncBannerPendingText}>Tersimpan Offline di HP</Text>
          </View>
          {onRetrySync && (
            <TouchableOpacity style={styles.syncRetryBtn} onPress={onRetrySync} activeOpacity={0.8}>
              <RefreshCw size={13} color="#ffffff" />
              <Text style={styles.syncRetryBtnText}>Sinkronkan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {syncStatus === 'syncing' && (
        <View style={styles.syncBannerSyncing}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.syncBannerSyncingText}>Menyinkronkan ke Server Pengawas...</Text>
        </View>
      )}

      {/* Score Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Award size={17} color={colors.primary} />
          <Text style={styles.cardHeaderTitle}>Hasil Evaluasi CBT</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreNumber}>{gradeRecord.score}</Text>
          <Text style={styles.scoreMax}>/ {gradeRecord.maxScore}</Text>
        </View>

        {/* Status Pill */}
        <View style={[styles.statusPill, isPassed ? styles.statusPassed : styles.statusRemedial]}>
          <Text style={[styles.statusPillText, isPassed ? styles.textPassed : styles.textRemedial]}>
            {isPassed ? 'LULUS KKM (75)' : 'REMEDIAL'}
          </Text>
        </View>

        {/* Details Grid */}
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Nama Peserta</Text>
            <Text style={styles.detailValue}>{gradeRecord.name}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>NISN</Text>
            <Text style={styles.detailValue}>{gradeRecord.nisn}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Waktu Pengumpulan</Text>
            <Text style={styles.detailValue}>{gradeRecord.submittedAt}</Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Deteksi Pindah Tab</Text>
            <Text style={[styles.detailValue, gradeRecord.tabViolations > 0 && styles.textDanger]}>
              {gradeRecord.tabViolations} Kali
            </Text>
          </View>
        </View>

        {/* SHA-256 Tamper-Proof Seal Box */}
        <View style={styles.sealBox}>
          <View style={styles.sealHeader}>
            <Lock size={13} color={colors.primary} />
            <Text style={styles.sealTitle}>Stempel Integritas SHA-256</Text>
            <ShieldCheck size={14} color={colors.success} />
          </View>
          <Text style={styles.sealHash} numberOfLines={2} ellipsizeMode="middle">
            {integritySeal}
          </Text>
          <Text style={styles.sealDesc}>
            Kode kriptografi unik ini memverifikasi orisinalitas dan integritas jawaban.
          </Text>
        </View>
      </View>

      {/* Return to Home Button */}
      <TouchableOpacity style={styles.homeBtn} onPress={onResetToHome} activeOpacity={0.85}>
        <Home size={17} color="#ffffff" />
        <Text style={styles.homeBtnText}>Kembali ke Halaman Utama</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    minHeight: '100%',
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: radii.xl,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
    ...shadows.card,
  },
  title: {
    fontFamily: typography.extraBold,
    fontSize: 20,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 5,
    marginBottom: 20,
    maxWidth: 340,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
    marginBottom: 20,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cardHeaderTitle: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 4,
  },
  scoreNumber: {
    fontFamily: typography.extraBold,
    fontSize: 48,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  scoreMax: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: radii.full,
    marginVertical: 8,
    borderWidth: 1,
  },
  statusPassed: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  statusRemedial: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  statusPillText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  textPassed: {
    color: colors.successText,
  },
  textRemedial: {
    color: colors.dangerText,
  },
  detailsGrid: {
    width: '100%',
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    padding: 14,
    gap: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  detailValue: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  textDanger: {
    color: colors.danger,
  },
  sealBox: {
    width: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
  },
  sealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  sealTitle: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sealHash: {
    fontSize: 10,
    fontFamily: typography.semiBold,
    color: colors.primaryDark,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.xs,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    width: '100%',
    textAlign: 'center',
    marginVertical: 5,
  },
  sealDesc: {
    fontFamily: typography.regular,
    fontSize: 10,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 14,
  },
  homeBtn: {
    height: 48,
    backgroundColor: colors.textPrimary,
    borderRadius: radii.md,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 420,
    ...shadows.card,
  },
  homeBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 13.5,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  syncBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.successLight,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.successBorder,
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
  },
  syncBannerSuccessText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.successText,
  },
  syncBannerPending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warningLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
  },
  syncBannerPendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncBannerPendingText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.warningText,
  },
  syncRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.warningText,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  syncRetryBtnText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#ffffff',
  },
  syncBannerSyncing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
  },
  syncBannerSyncingText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
});
