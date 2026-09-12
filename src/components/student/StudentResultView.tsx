import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ShieldCheck, Award, Home, Lock, CloudOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import type { GradeRecord } from '../../types/exam';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)) + 14;
  const isPassed = gradeRecord.status === 'Lulus';

  return (
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 3D Success Badge */}
      <View style={styles.iconCircle}>
        <Check size={34} color="#ffffff" strokeWidth={3.5} />
      </View>

      <Text style={styles.title}>Ujian Berhasil Dikumpulkan</Text>
      <Text style={styles.subtitle}>
        Lembar jawaban telah terkoreksi otomatis dan tersimpan aman di basis data pengawas.
      </Text>

      {/* Sync Status Banner */}
      {syncStatus === 'synced' && (
        <View style={styles.syncBannerSuccess}>
          <CheckCircle2 size={16} color="#065F46" strokeWidth={2.4} />
          <Text style={styles.syncBannerSuccessText}>Tersinkronisasi ke Server Pengawas</Text>
        </View>
      )}

      {syncStatus === 'pending' && (
        <View style={styles.syncBannerPending}>
          <View style={styles.syncBannerPendingLeft}>
            <CloudOff size={16} color="#92400E" strokeWidth={2.4} />
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
          <ActivityIndicator size="small" color="#1D4ED8" />
          <Text style={styles.syncBannerSyncingText}>Menyinkronkan ke Server Pengawas...</Text>
        </View>
      )}

      {/* Score Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerIconPod}>
            <Award size={18} color="#2563EB" strokeWidth={2.4} />
          </View>
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
            <Lock size={14} color="#1D4ED8" strokeWidth={2.4} />
            <Text style={styles.sealTitle}>Stempel Integritas SHA-256</Text>
            <ShieldCheck size={15} color="#059669" strokeWidth={2.4} />
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
        <Home size={18} color="#ffffff" strokeWidth={2.4} />
        <Text style={styles.homeBtnText}>Kembali ke Halaman Utama</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
    backgroundColor: clayColors.canvas,
  },
  container: {
    padding: 20,
    backgroundColor: clayColors.canvas,
    alignItems: 'center',
    minHeight: '100%',
    paddingBottom: 40,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 26,
    backgroundColor: clayColors.studentBtnBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    marginTop: 6,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 5.5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  title: {
    fontFamily: typography.extraBold,
    fontSize: 21,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18.5,
    marginTop: 5,
    marginBottom: 20,
    maxWidth: 340,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    alignItems: 'center',
    marginBottom: 20,
    ...clayShadows.cardHover,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerIconPod: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: {
    fontFamily: typography.extraBold,
    fontSize: 12,
    color: '#2563EB',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginVertical: 4,
  },
  scoreNumber: {
    fontFamily: typography.extraBold,
    fontSize: 50,
    color: colors.textPrimary,
    letterSpacing: -1.2,
  },
  scoreMax: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: clayRadii.badge,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    ...clayShadows.badge,
  },
  statusPassed: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  statusRemedial: {
    backgroundColor: '#FFF1F2',
    borderBottomColor: '#FECDD3',
  },
  statusPillText: {
    fontFamily: typography.extraBold,
    fontSize: 12,
    letterSpacing: 0.4,
  },
  textPassed: {
    color: '#065F46',
  },
  textRemedial: {
    color: '#9F1239',
  },
  detailsGrid: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    gap: 10,
    marginVertical: 14,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.badge,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  detailValue: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: colors.textPrimary,
  },
  textDanger: {
    color: '#DC2626',
  },
  sealBox: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#BFDBFE',
    alignItems: 'center',
    ...clayShadows.badge,
  },
  sealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sealTitle: {
    fontFamily: typography.extraBold,
    fontSize: 11,
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sealHash: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: '#1E40AF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    width: '100%',
    textAlign: 'center',
    marginVertical: 6,
  },
  sealDesc: {
    fontFamily: typography.regular,
    fontSize: 10,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 14,
  },
  homeBtn: {
    height: 52,
    backgroundColor: '#1E293B',
    borderRadius: clayRadii.button,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomWidth: 5,
    borderBottomColor: '#0F172A',
    ...clayShadows.cardHover,
  },
  homeBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  syncBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#A7F3D0',
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
    ...clayShadows.badge,
  },
  syncBannerSuccessText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#065F46',
  },
  syncBannerPending: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#FDE68A',
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
    ...clayShadows.badge,
  },
  syncBannerPendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncBannerPendingText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#92400E',
  },
  syncRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
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
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    marginBottom: 16,
    width: '100%',
    maxWidth: 420,
    ...clayShadows.badge,
  },
  syncBannerSyncingText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#1D4ED8',
  },
});
