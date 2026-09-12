import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { GraduationCap, ShieldCheck, X } from 'lucide-react-native';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.75}>
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
              activeOpacity={0.82}
            >
              <View style={[styles.iconCircle, styles.studentIconBg]}>
                <GraduationCap size={24} color="#1D4ED8" strokeWidth={2.4} />
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
              activeOpacity={0.82}
            >
              <View style={[styles.iconCircle, styles.teacherIconBg]}>
                <ShieldCheck size={24} color="#334155" strokeWidth={2.4} />
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
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.cardHover,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    fontFamily: typography.extraBold,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.2,
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
  modalSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 18,
  },
  optionsContainer: {
    gap: 14,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    gap: 14,
    ...clayShadows.badge,
  },
  studentOption: {
    backgroundColor: '#EFF6FF',
    borderBottomColor: '#BFDBFE',
  },
  teacherOption: {
    backgroundColor: '#F8FAFC',
    borderBottomColor: '#CBD5E1',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: clayRadii.pod,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    ...clayShadows.iconPod,
  },
  studentIconBg: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#BFDBFE',
  },
  teacherIconBg: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#CBD5E1',
  },
  roleInfo: {
    flex: 1,
    gap: 2,
  },
  roleName: {
    fontFamily: typography.bold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  roleDesc: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
});
