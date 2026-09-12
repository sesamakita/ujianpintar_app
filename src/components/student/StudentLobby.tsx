import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Modal, Linking, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)) + 14;

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
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={[styles.container, { paddingTop: topPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Navigation */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={onBack}
        activeOpacity={0.75}
        disabled={isLoading}
      >
        <ArrowLeft size={16} color={colors.textSecondary} strokeWidth={2.4} />
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
            <View style={styles.metaIconPod}>
              <Clock size={17} color="#2563EB" strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Durasi Pengerjaan</Text>
              <Text style={styles.metaValue}>{exam.durationMinutes} Menit</Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <View style={[styles.metaIconPod, styles.metaIconPodGreen]}>
              <FileQuestion size={17} color="#059669" strokeWidth={2.4} />
            </View>
            <View>
              <Text style={styles.metaLabel}>Jumlah Soal</Text>
              <Text style={styles.metaValue}>{questions.length} Butir</Text>
            </View>
          </View>
        </View>

        {/* Verified Student ID Box */}
        <View style={styles.identityBox}>
          <View style={styles.identityHeader}>
            <User size={15} color="#1D4ED8" strokeWidth={2.4} />
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
            <ShieldCheck size={16} color={colors.textPrimary} strokeWidth={2.4} />
            <Text style={styles.rulesTitle}>Ketentuan Integritas CBT</Text>
          </View>

          <View style={styles.ruleItem}>
            <AlertTriangle size={15} color="#DC2626" style={styles.ruleIcon} strokeWidth={2.4} />
            <Text style={styles.ruleTextDanger}>
              Dilarang beralih aplikasi atau meminimalkan layar selama ujian berlangsung.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <CheckCircle2 size={15} color="#059669" style={styles.ruleIcon} strokeWidth={2.4} />
            <Text style={styles.ruleText}>
              Setiap butir jawaban tersimpan otomatis secara real-time di perangkat & server.
            </Text>
          </View>

          <View style={styles.ruleItem}>
            <CheckCircle2 size={15} color="#059669" style={styles.ruleIcon} strokeWidth={2.4} />
            <Text style={styles.ruleText}>
              Stempel kriptografi SHA-256 otomatis diterbitkan saat lembar jawaban dikirim.
            </Text>
          </View>
        </View>

        {/* Device Readiness & Comfort Box */}
        <View style={styles.deviceTipsBox}>
          <View style={styles.rulesTitleRow}>
            <BellOff size={15} color="#1D4ED8" strokeWidth={2.4} />
            <Text style={styles.deviceTipsTitle}>Tips Kenyamanan Perangkat Siswa</Text>
          </View>

          <View style={styles.deviceTipItem}>
            <View style={styles.deviceTipIconBox}>
              <BellOff size={13} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.deviceTipText}>
              <Text style={styles.deviceTipBold}>Mode Jangan Ganggu (DND): </Text>
              Disarankan mengaktifkan Mode DND/Game agar notifikasi chat & telepon tidak menutupi layar.
            </Text>
          </View>

          <View style={styles.deviceTipItem}>
            <View style={styles.deviceTipIconBox}>
              <Sun size={13} color="#2563EB" strokeWidth={2.2} />
            </View>
            <Text style={styles.deviceTipText}>
              <Text style={styles.deviceTipBold}>Layar Selalu Aktif: </Text>
              Aplikasi otomatis menjaga layar tetap menyala selama ujian (tidak akan mati/sleep).
            </Text>
          </View>

          <View style={styles.deviceTipItem}>
            <View style={styles.deviceTipIconBox}>
              <BatteryCharging size={13} color="#2563EB" strokeWidth={2.2} />
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
            <Play size={17} color="#ffffff" fill="#ffffff" />
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
              <Gamepad2 size={30} color="#2563EB" strokeWidth={2.4} />
            </View>

            <Text style={styles.gameModalTitle}>Peringatan Wajib Mode Game</Text>
            <Text style={styles.gameModalSubtitle}>
              Cegah gangguan layar & diskualifikasi selama ujian
            </Text>

            {/* Warning Content */}
            <View style={styles.gameModalWarningBox}>
              <AlertTriangle size={16} color="#DC2626" style={{ marginTop: 2 }} strokeWidth={2.4} />
              <Text style={styles.gameModalWarningText}>
                Panggilan telepon masuk atau notifikasi aplikasi yang muncul di layar dapat meminimalkan aplikasi dan terdeteksi sebagai pelanggaran.
              </Text>
            </View>

            {/* Checklist */}
            <View style={styles.gameModalChecklist}>
              <View style={styles.gameCheckItem}>
                <Check size={15} color="#059669" strokeWidth={2.8} />
                <Text style={styles.gameCheckText}>Mode Game / Game Space / DND sudah aktif</Text>
              </View>
              <View style={styles.gameCheckItem}>
                <Check size={15} color="#059669" strokeWidth={2.8} />
                <Text style={styles.gameCheckText}>Notifikasi chat & panggilan telepon dibisukan</Text>
              </View>
            </View>

            {/* Open Settings Button */}
            <TouchableOpacity
              style={styles.openSettingsBtn}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.75}
            >
              <Settings size={15} color="#1D4ED8" strokeWidth={2.2} />
              <Text style={styles.openSettingsBtnText}>Buka Pengaturan HP (Settings)</Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.gameModalActions}>
              <TouchableOpacity
                style={styles.gameModalCancelBtn}
                onPress={() => setIsGameModeModalVisible(false)}
                activeOpacity={0.75}
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
                    <Play size={15} color="#ffffff" fill="#ffffff" />
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
  scrollRoot: {
    flex: 1,
    backgroundColor: clayColors.canvas,
  },
  container: {
    padding: 20,
    backgroundColor: clayColors.canvas,
    minHeight: '100%',
    alignItems: 'center',
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: clayRadii.badge,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    marginBottom: 14,
    ...clayShadows.badge,
  },
  backBtnText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textSecondary,
    includeFontPadding: false,
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
    ...clayShadows.cardHover,
  },
  badgeRow: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: clayRadii.badge,
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#A7F3D0',
    ...clayShadows.badge,
  },
  greenDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#059669',
  },
  statusBadgeText: {
    fontFamily: typography.extraBold,
    fontSize: 10.5,
    color: '#065F46',
    letterSpacing: 0.3,
  },
  examTitle: {
    fontFamily: typography.extraBold,
    fontSize: 18.5,
    color: colors.textPrimary,
    lineHeight: 25,
    letterSpacing: -0.3,
  },
  examSubject: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#2563EB',
    marginTop: 4,
    marginBottom: 18,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.badge,
  },
  metaIconPod: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaIconPodGreen: {
    backgroundColor: '#ECFDF5',
    borderBottomColor: '#A7F3D0',
  },
  metaLabel: {
    fontFamily: typography.medium,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  metaValue: {
    fontFamily: typography.extraBold,
    fontSize: 13.5,
    color: colors.textPrimary,
    marginTop: 1,
  },
  identityBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#BFDBFE',
    marginBottom: 16,
    gap: 2,
    ...clayShadows.badge,
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  identityHeaderText: {
    fontFamily: typography.extraBold,
    fontSize: 10.5,
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  studentName: {
    fontFamily: typography.extraBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  studentDetails: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rulesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
    marginBottom: 16,
    gap: 10,
    ...clayShadows.badge,
  },
  rulesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rulesTitle: {
    fontFamily: typography.extraBold,
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
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#9F1239',
    flex: 1,
    lineHeight: 17,
  },
  deviceTipsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
    marginBottom: 20,
    gap: 10,
    ...clayShadows.badge,
  },
  deviceTipsTitle: {
    fontFamily: typography.extraBold,
    fontSize: 11.5,
    color: '#1D4ED8',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  deviceTipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  deviceTipIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    height: 52,
    backgroundColor: clayColors.studentBtnBg,
    borderRadius: clayRadii.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 5.5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  startBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 14.5,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.cardHover,
  },
  gameModalIconBox: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.iconPod,
  },
  gameModalTitle: {
    fontFamily: typography.extraBold,
    fontSize: 17,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  gameModalSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  gameModalWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#FECDD3',
    marginBottom: 14,
    width: '100%',
    ...clayShadows.badge,
  },
  gameModalWarningText: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: '#9F1239',
    flex: 1,
    lineHeight: 16.5,
  },
  gameModalChecklist: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    gap: 9,
    marginBottom: 14,
    ...clayShadows.badge,
  },
  gameCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gameCheckText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.textPrimary,
  },
  openSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: clayRadii.button,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#BFDBFE',
    width: '100%',
    marginBottom: 16,
    ...clayShadows.badge,
  },
  openSettingsBtnText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#1D4ED8',
  },
  gameModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  gameModalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: clayRadii.button,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.badge,
  },
  gameModalCancelText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  gameModalConfirmBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: clayRadii.button,
    backgroundColor: clayColors.studentBtnBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  gameModalConfirmText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#ffffff',
  },
});
