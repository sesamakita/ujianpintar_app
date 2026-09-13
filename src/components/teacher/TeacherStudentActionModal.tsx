import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Send,
  RotateCcw,
  CheckSquare,
  User,
  Clock,
} from 'lucide-react-native';
import type { StudentProctoring } from '../../types/exam';
import { StatusBadge } from '../common/StatusBadge';
import { typography, colors, radii, shadows, clayColors, clayShadows, clayRadii } from '../../theme';
import { CustomModal } from '../common/CustomModal';

interface TeacherStudentActionModalProps {
  student: StudentProctoring | null;
  visible: boolean;
  onClose: () => void;
  onSendWarning: (nisn: string, message: string) => void;
  onResetSession: (nisn: string) => void;
  onForceSubmit: (nisn: string) => void;
}

export const TeacherStudentActionModal: React.FC<TeacherStudentActionModalProps> = ({
  student,
  visible,
  onClose,
  onSendWarning,
  onResetSession,
  onForceSubmit,
}) => {
  const [warningText, setWarningText] = useState('Harap fokus pada lembar ujian dan jangan beralih aplikasi!');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isForceSubmitModalOpen, setIsForceSubmitModalOpen] = useState(false);

  if (!student) return null;

  const formatRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSend = () => {
    if (!warningText.trim()) return;
    onSendWarning(student.nisn, warningText.trim());
    onClose();
  };

  const handleConfirmReset = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmForceSubmit = () => {
    setIsForceSubmitModalOpen(true);
  };

  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(22, (insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 28 : 16)) + 12);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: bottomPadding }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarBox}>
                <User size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentSubtitle}>
                  NISN: {student.nisn} • {student.className}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Telemetry Status Grid */}
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Status</Text>
              <StatusBadge status={student.status} size="sm" />
            </View>

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Progress</Text>
              <Text style={styles.telemetryVal}>
                {student.progressCount} / {student.totalQuestions} Soal
              </Text>
            </View>

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Sisa Waktu</Text>
              <View style={styles.timerValRow}>
                <Clock size={12} color={colors.primary} />
                <Text style={styles.telemetryVal}>{formatRemaining(student.remainingSeconds)}</Text>
              </View>
            </View>

            <View style={styles.telemetryItem}>
              <Text style={styles.telemetryLabel}>Pelanggaran</Text>
              <Text style={[styles.telemetryVal, student.violationCount > 0 && styles.textDanger]}>
                {student.violationCount} Kali
              </Text>
            </View>
          </View>

          {/* Send Warning Section */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Kirim Teguran ke Layar Siswa</Text>

            {/* Quick Preset Chips */}
            <View style={styles.presetChipsRow}>
              {[
                '👀 Jangan menoleh ke teman!',
                '📱 Tetap fokus pada layar ujian!',
                '📵 Dilarang buka catatan / aplikasi lain!',
                '⏳ Waktu tinggal sedikit, teliti kembali.',
              ].map((chip, cIdx) => (
                <TouchableOpacity
                  key={cIdx}
                  style={styles.presetChip}
                  onPress={() => setWarningText(chip)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.warningInput}
              value={warningText}
              onChangeText={setWarningText}
              placeholder="Tulis pesan teguran..."
              placeholderTextColor={colors.textSubtle}
              multiline
            />
            <TouchableOpacity style={styles.sendWarningBtn} onPress={handleSend} activeOpacity={0.85}>
              <Send size={14} color="#ffffff" />
              <Text style={styles.sendWarningBtnText}>Kirim ke HP Siswa</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.resetBtn]}
              onPress={handleConfirmReset}
              activeOpacity={0.8}
            >
              <RotateCcw size={14} color={colors.warningText} />
              <Text style={styles.resetBtnText}>Reset Sesi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.forceSubmitBtn]}
              onPress={handleConfirmForceSubmit}
              activeOpacity={0.8}
            >
              <CheckSquare size={14} color={colors.danger} />
              <Text style={styles.forceSubmitBtnText}>Paksa Kumpul</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Custom Reset Confirmation Modal */}
      <CustomModal
        visible={isResetModalOpen}
        type="warning"
        title="Reset Sesi Ujian"
        message={`Reset sesi pengerjaan untuk ${student.name}? Siswa dapat masuk kembali jika mengalami kendala perangkat.`}
        confirmText="Reset Sesi"
        cancelText="Batal"
        onConfirm={() => {
          setIsResetModalOpen(false);
          onResetSession(student.nisn);
          onClose();
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />

      {/* Custom Force Submit Confirmation Modal */}
      <CustomModal
        visible={isForceSubmitModalOpen}
        type="danger"
        title="Paksa Kumpulkan Ujian"
        message={`Apakah Anda yakin ingin mengumpulkan lembar jawaban ${student.name} sekarang secara sepihak?`}
        confirmText="Paksa Kumpul"
        cancelText="Batal"
        onConfirm={() => {
          setIsForceSubmitModalOpen(false);
          onForceSubmit(student.nisn);
          onClose();
        }}
        onCancel={() => setIsForceSubmitModalOpen(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 22,
    maxHeight: '85%',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 0,
    ...clayShadows.cardHover,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    ...clayShadows.badge,
  },
  studentName: {
    fontFamily: typography.extraBold,
    fontSize: 15.5,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  studentSubtitle: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#CBD5E1',
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    marginBottom: 16,
    gap: 10,
    ...clayShadows.badge,
  },
  telemetryItem: {
    width: '47%',
    gap: 4,
  },
  telemetryLabel: {
    fontFamily: typography.extraBold,
    fontSize: 10.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  telemetryVal: {
    fontFamily: typography.extraBold,
    fontSize: 13.5,
    color: colors.textPrimary,
  },
  timerValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textDanger: {
    color: '#DC2626',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.whiteBevel,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...clayShadows.card,
  },
  sectionTitle: {
    fontFamily: typography.extraBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  presetChipText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: '#1D4ED8',
  },
  warningInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: 16,
    padding: 12,
    fontSize: 13,
    fontFamily: typography.medium,
    color: colors.textPrimary,
    minHeight: 52,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  sendWarningBtn: {
    backgroundColor: clayColors.primaryBtnBg,
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: clayColors.primaryBtnBorder,
    borderBottomWidth: 4,
    borderBottomColor: clayColors.primaryBtnBevel,
    ...clayShadows.btnPrimary,
  },
  sendWarningBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    gap: 6,
  },
  resetBtn: {
    backgroundColor: '#FFFBEB',
    borderBottomColor: '#FDE68A',
    ...clayShadows.badge,
  },
  resetBtnText: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: '#92400E',
  },
  forceSubmitBtn: {
    backgroundColor: '#FFF1F2',
    borderBottomColor: '#FECDD3',
    ...clayShadows.badge,
  },
  forceSubmitBtnText: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: '#9F1239',
  },
});
