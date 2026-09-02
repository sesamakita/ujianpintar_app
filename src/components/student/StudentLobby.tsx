import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Linking } from 'react-native';
import {
  Clock,
  FileQuestion,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Play,
  User,
  BellOff,
  BatteryCharging,
  Sun,
  Gamepad2,
  Settings,
  Check,
} from 'lucide-react-native';
import type { ExamSettings, Question } from '../../types/exam';
import { typography, colors, radii, shadows } from '../../theme';

interface StudentLobbyProps {
  exam: ExamSettings;
  questions: Question[];
  studentName: string;
  nisn: string;
  className: string;
  onStartExam: () => void;
  onBack: () => void;
}

export const StudentLobby: React.FC<StudentLobbyProps> = ({
  exam,
  questions,
  studentName,
  nisn,
  className,
  onStartExam,
  onBack,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGameModeModalVisible, setIsGameModeModalVisible] = useState(false);

  // 1. User taps "Mulai Mengerjakan Ujian" -> Show Game Mode Gatekeeper Modal
  const handleStartPress = () => {
    if (isLoading) return;
    setIsGameModeModalVisible(true);
  };

  // 2. User confirms Game Mode is active -> Proceed to start exam
  const handleConfirmedStartExam = async () => {
    setIsGameModeModalVisible(false);
    setIsLoading(true);
    try {
      await onStartExam();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Top Navigation */}
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7} disabled={isLoading}>
        <ArrowLeft size={15} color={colors.textMuted} />
        <Text style={styles.backBtnText}>Ganti Akun / PIN Token</Text>
      </TouchableOpacity>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <View style={styles.statusBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.statusBadgeText}>SESI UJIAN SIAP</Text>
          </View>
        </View>

        <Text style={styles.examTitle}>{exam.title}</Text>
        <Text style={styles.examSubject}>
          {exam.subject} • {exam.gradeLevel}
        </Text>

        {/* Metadata Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Clock size={16} color={colors.primary} />
            <View>
              <Text style={styles.metaLabel}>Durasi Pengerjaan</Text>
              <Text style={styles.metaValue}>{exam.durationMinutes} Menit</Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <FileQuestion size={16} color={colors.success} />
            <View>
              <Text style={styles.metaLabel}>Jumlah Soal</Text>
              <Text style={styles.metaValue}>{questions.length} Butir</Text>
            </View>
          </View>
        </View>

        {/* Verified Student ID Box */}
        <View style={styles.identityBox}>
          <View style={styles.identityHeader}>
            <User size={14} color={colors.primary} />
            <Text style={styles.identityHeaderText}>Identitas Terverifikasi</Text>
          </View>
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.studentDetails}>
            NISN: {nisn} • {className}
          </Text>
        </View>

        {/* Integrity & Rules Box */}
        <View style={styles.rulesBox}>
          <View style={styles.rulesTitleRow}>
            <ShieldCheck size={16} color={colors.textPrimary} />
            <Text style={styles.rulesTitle}>Ketentuan Integritas CBT</Text>
          </View>

          <View style={styles.ruleItem}>
            <AlertTriangle size={14} color={colors.danger} style={styles.ruleIcon} />
            <Text style={styles.ruleTextDanger}>
              Dilarang beralih aplikasi atau meminimalkan layar selama ujian berlangsung.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <CheckCircle2 size={14} color={colors.success} style={styles.ruleIcon} />
            <Text style={styles.ruleText}>
              Setiap butir jawaban tersimpan otomatis secara real-time di perangkat & server.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <CheckCircle2 size={14} color={colors.success} style={styles.ruleIcon} />
            <Text style={styles.ruleText}>
              Stempel kriptografi SHA-256 otomatis diterbitkan saat lembar jawaban dikirim.
            </Text>
          </View>
        </View>

        {/* Device Readiness & Comfort Box */}
        <View style={styles.deviceTipsBox}>
          <View style={styles.rulesTitleRow}>
            <BellOff size={15} color={colors.primaryDark} />
            <Text style={styles.deviceTipsTitle}>Tips Kenyamanan Perangkat Siswa</Text>
          </View>

          <View style={styles.deviceTipItem}>
            <View style={styles.deviceTipIconBox}>
              <BellOff size={13} color={colors.primary} />
            </View>
            <Text style={styles.deviceTipText}>
              <Text style={styles.deviceTipBold}>Mode Jangan Ganggu (DND): </Text>
              Disarankan mengaktifkan Mode DND/Game agar notifikasi chat & telepon tidak menutupi layar.
            </Text>
          </View>

          <View style={styles.deviceTipItem}>
            <View style={styles.deviceTipIconBox}>
              <Sun size={13} color={colors.primary} />
            </View>
            <Text style={styles.deviceTipText}>
              <Text style={styles.deviceTipBold}>Layar Selalu Aktif: </Text>
              Aplikasi otomatis menjaga layar tetap menyala selama ujian (tidak akan mati/sleep otomatis).
            </Text>
          </View>

          <View style={styles.deviceTipItem}>
            <View style={styles.deviceTipIconBox}>
              <BatteryCharging size={13} color={colors.primary} />
            </View>
            <Text style={styles.deviceTipText}>
              <Text style={styles.deviceTipBold}>Daya Baterai: </Text>
              Pastikan baterai HP minimal 30% atau tersambung pengisi daya.
            </Text>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startBtn, isLoading && { opacity: 0.8 }]}
          onPress={handleStartPress}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Play size={16} color="#ffffff" fill="#ffffff" />
          )}
          <Text style={styles.startBtnText}>
            {isLoading ? 'Menyiapkan Lembar Soal...' : 'Mulai Mengerjakan Ujian'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Game Mode / DND Gatekeeper Confirmation Modal */}
      <Modal
        visible={isGameModeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGameModeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.gameModalCard}>
            {/* Header Icon */}
            <View style={styles.gameModalIconBox}>
              <Gamepad2 size={28} color={colors.primary} />
            </View>

            <Text style={styles.gameModalTitle}>Peringatan Wajib Mode Game</Text>
            <Text style={styles.gameModalSubtitle}>
              Cegah gangguan layar & diskualifikasi selama ujian
            </Text>

            {/* Warning Content */}
            <View style={styles.gameModalWarningBox}>
              <AlertTriangle size={15} color={colors.danger} style={{ marginTop: 2 }} />
              <Text style={styles.gameModalWarningText}>
                Panggilan telepon masuk atau notifikasi aplikasi yang muncul di layar dapat meminimalkan aplikasi dan terdeteksi sebagai pelanggaran oleh pengawas.
              </Text>
            </View>

            {/* Checklist */}
            <View style={styles.gameModalChecklist}>
              <View style={styles.gameCheckItem}>
                <Check size={14} color={colors.success} strokeWidth={2.5} />
                <Text style={styles.gameCheckText}>Mode Game / Game Space / DND sudah aktif</Text>
              </View>
              <View style={styles.gameCheckItem}>
                <Check size={14} color={colors.success} strokeWidth={2.5} />
                <Text style={styles.gameCheckText}>Notifikasi chat & panggilan telepon dibisukan</Text>
              </View>
            </View>

            {/* Open Settings Button */}
            <TouchableOpacity
              style={styles.openSettingsBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.75}
            >
              <Settings size={14} color={colors.primaryDark} />
              <Text style={styles.openSettingsBtnText}>Buka Pengaturan HP (Settings)</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.gameModalActions}>
              <TouchableOpacity
                style={styles.gameModalCancelBtn}
                onPress={() => setIsGameModeModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.gameModalCancelText}>Periksa Dulu</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gameModalConfirmBtn}
                onPress={handleConfirmedStartExam}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Play size={14} color="#ffffff" fill="#ffffff" />
                    <Text style={styles.gameModalConfirmText}>Mulai Ujian</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.bgApp,
    minHeight: '100%',
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: 12,
  },
  backBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  badgeRow: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusBadgeText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: colors.successText,
    letterSpacing: 0.3,
  },
  examTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.textPrimary,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  examSubject: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
    marginBottom: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metaLabel: {
    fontFamily: typography.regular,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  metaValue: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: colors.textPrimary,
    marginTop: 1,
  },
  identityBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: 16,
    gap: 2,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  identityHeaderText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  studentDetails: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  rulesBox: {
    backgroundColor: colors.bgApp,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    gap: 9,
  },
  rulesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rulesTitle: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleIcon: {
    marginTop: 2,
  },
  ruleText: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17,
  },
  ruleTextDanger: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.dangerText,
    flex: 1,
    lineHeight: 17,
  },
  deviceTipsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 10,
  },
  deviceTipsTitle: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  deviceTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  deviceTipIconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  deviceTipText: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16.5,
  },
  deviceTipBold: {
    fontFamily: typography.bold,
    color: colors.textPrimary,
  },
  startBtn: {
    height: 48,
    backgroundColor: colors.success,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.card,
  },
  startBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameModalCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.card,
  },
  gameModalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  gameModalTitle: {
    fontFamily: typography.bold,
    fontSize: 16.5,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 3,
  },
  gameModalSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 14,
  },
  gameModalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.dangerLight,
    borderRadius: radii.md,
    padding: 11,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    marginBottom: 14,
    width: '100%',
  },
  gameModalWarningText: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: colors.dangerText,
    flex: 1,
    lineHeight: 16.5,
  },
  gameModalChecklist: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginBottom: 14,
  },
  gameCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameCheckText: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    width: '100%',
    marginBottom: 16,
  },
  openSettingsBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  gameModalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  gameModalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameModalCancelText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  gameModalConfirmBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.card,
  },
  gameModalConfirmText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#ffffff',
  },
});
