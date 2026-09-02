import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
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
import { typography, colors, radii, shadows } from '../../theme';
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
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
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: 20,
    maxHeight: '85%',
    ...shadows.modal,
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
    gap: 10,
    flex: 1,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    fontFamily: typography.bold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  studentSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.bgApp,
    borderRadius: radii.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
    gap: 8,
  },
  telemetryItem: {
    width: '48%',
    gap: 3,
  },
  telemetryLabel: {
    fontFamily: typography.semiBold,
    fontSize: 10.5,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  telemetryVal: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  timerValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  textDanger: {
    color: colors.danger,
  },
  sectionBox: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 16,
    ...shadows.card,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  presetChipText: {
    fontFamily: typography.medium,
    fontSize: 10.5,
    color: colors.textSecondary,
  },
  warningInput: {
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    padding: 10,
    fontSize: 12.5,
    fontFamily: typography.medium,
    color: colors.textPrimary,
    minHeight: 48,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  sendWarningBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendWarningBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 6,
  },
  resetBtn: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warningBorder,
  },
  resetBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.warningText,
  },
  forceSubmitBtn: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
  },
  forceSubmitBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.danger,
  },
});
