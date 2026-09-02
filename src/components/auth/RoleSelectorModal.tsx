import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { GraduationCap, ShieldCheck, X } from 'lucide-react-native';
import { typography, colors, radii, shadows } from '../../theme';

interface RoleSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRole: (role: 'student' | 'teacher') => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  visible,
  onClose,
  onSelectRole,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Pilih Peran Aplikasi</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Gunakan mode siswa untuk pengerjaan CBT atau mode guru untuk pemantauan proctoring dan rekapitulasi nilai.
          </Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {/* Student Option */}
            <TouchableOpacity
              style={[styles.roleOption, styles.studentOption]}
              onPress={() => onSelectRole('student')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, styles.studentIconBg]}>
                <GraduationCap size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleName}>Mode Siswa</Text>
                <Text style={styles.roleDesc}>
                  Pengerjaan soal CBT dengan PIN token dan NISN peserta.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Teacher Option */}
            <TouchableOpacity
              style={[styles.roleOption, styles.teacherOption]}
              onPress={() => onSelectRole('teacher')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, styles.teacherIconBg]}>
                <ShieldCheck size={22} color={colors.textPrimary} strokeWidth={2.2} />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleName}>Mode Guru / Pengawas</Text>
                <Text style={styles.roleDesc}>
                  Live Proctoring ruang ujian dan rekapitulasi nilai kelas.
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 22,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: typography.bold,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
  },
  modalSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  optionsContainer: {
    gap: 12,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    gap: 14,
  },
  studentOption: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  teacherOption: {
    backgroundColor: colors.bgCardSubtle,
    borderColor: colors.borderDefault,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentIconBg: {
    backgroundColor: colors.bgSurface,
  },
  teacherIconBg: {
    backgroundColor: colors.bgSurface,
  },
  roleInfo: {
    flex: 1,
    gap: 2,
  },
  roleName: {
    fontFamily: typography.bold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  roleDesc: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
