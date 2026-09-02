import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import {
  ShieldCheck,
  Lock,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
  Layers,
} from 'lucide-react-native';
import { authService, TeacherUser } from '../../services/authService';
import type { ExamSettings } from '../../types/exam';
import { typography, colors, radii, shadows } from '../../theme';

interface TeacherAuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (teacher: TeacherUser, matchedExam?: ExamSettings) => void;
}

export const TeacherAuthModal: React.FC<TeacherAuthModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState('');
  const [teacherName, setTeacherName] = useState('Bpk. Rahmat, S.Pd.');
  const [targetExamToken, setTargetExamToken] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [nameFocused, setNameFocused] = useState(false);
  const [pinFocused, setPinFocused] = useState(false);
  const [tokenFocused, setTokenFocused] = useState(false);

  const pinInputRef = useRef<TextInput>(null);
  const nameInputRef = useRef<TextInput>(null);
  const tokenInputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    if (!pin.trim()) {
      setErrorMsg('Harap masukkan PIN Keamanan Pengawas Ruang.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await authService.loginWithPIN(pin, teacherName, targetExamToken);
      if (res.success && res.teacher) {
        onSuccess(res.teacher, res.matchedExam);
        onClose();
        setPin('');
        setTargetExamToken('');
      } else {
        setErrorMsg(res.error || 'PIN Keamanan Pengawas tidak tepat.');
      }
    } catch {
      setErrorMsg('Gagal memverifikasi identitas pengawas.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.kavWrapper}
          >
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.badgePill}>
                  <ShieldCheck size={14} color={colors.primary} strokeWidth={2.4} />
                  <Text style={styles.badgeText}>PORTAL PENGAWAS CBT</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.title}>Akses Ruang Pengawas</Text>
              <Text style={styles.subtitle}>
                Masukkan 6 digit PIN Pengawas yang tertera pada paket bank soal kelas ini untuk langsung memantau pengerjaan siswa di ruangan Anda.
              </Text>

              {/* Error Banner */}
              {errorMsg ? (
                <View style={styles.errorBox}>
                  <AlertCircle size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              {/* Form Input 1: Nama Pengawas */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Guru / Pengawas Ruang</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.leadingIcon} pointerEvents="none">
                    <User size={16} color={nameFocused ? colors.primary : colors.textMuted} />
                  </View>
                  <TextInput
                    ref={nameInputRef}
                    style={[styles.input, styles.inputWithIcon, nameFocused && styles.inputFocused]}
                    value={teacherName}
                    onChangeText={setTeacherName}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    placeholder="Contoh: Bpk. Rahmat, S.Pd."
                    placeholderTextColor={colors.textSubtle}
                    returnKeyType="next"
                    onSubmitEditing={() => pinInputRef.current?.focus()}
                  />
                </View>
              </View>

              {/* Form Input 2: PIN Pengawas */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>PIN Pengawas Ruang (6 Digit)</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPin('123456');
                      setErrorMsg(null);
                    }}
                    activeOpacity={0.7}
                    style={styles.presetChip}
                  >
                    <Sparkles size={11} color={colors.primary} />
                    <Text style={styles.presetText}>Master PIN: 123456</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <View style={styles.leadingIcon} pointerEvents="none">
                    <Lock size={16} color={pinFocused ? colors.primary : colors.textMuted} />
                  </View>
                  <TextInput
                    ref={pinInputRef}
                    style={[
                      styles.input,
                      styles.inputWithIcon,
                      styles.pinInput,
                      pinFocused && styles.inputFocused,
                    ]}
                    value={pin}
                    onChangeText={(txt) => {
                      setPin(txt.toUpperCase());
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setPinFocused(true)}
                    onBlur={() => setPinFocused(false)}
                    placeholder="6 Digit PIN Pengawas Ruang"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="default"
                    secureTextEntry={!showPin}
                    maxLength={6}
                    returnKeyType="next"
                    onSubmitEditing={() => tokenInputRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPin(!showPin)}
                    style={styles.trailingIconBtn}
                    activeOpacity={0.7}
                  >
                    {showPin ? (
                      <EyeOff size={16} color={colors.textMuted} />
                    ) : (
                      <Eye size={16} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Input 3: Token Ujian Kelas (Opsional) */}
              <View style={styles.formGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Token Siswa / Kelas (Opsional)</Text>
                  <Text style={styles.optionalHelperText}>Jika pakai Master PIN</Text>
                </View>
                <View style={styles.inputContainer}>
                  <View style={styles.leadingIcon} pointerEvents="none">
                    <Layers size={16} color={tokenFocused ? colors.primary : colors.textMuted} />
                  </View>
                  <TextInput
                    ref={tokenInputRef}
                    style={[
                      styles.input,
                      styles.inputWithIcon,
                      styles.tokenInput,
                      tokenFocused && styles.inputFocused,
                    ]}
                    value={targetExamToken}
                    onChangeText={(txt) => {
                      setTargetExamToken(txt.toUpperCase());
                      if (errorMsg) setErrorMsg(null);
                    }}
                    onFocus={() => setTokenFocused(true)}
                    onBlur={() => setTokenFocused(false)}
                    placeholder="Contoh: 849201 (Token Siswa Kelas Ini)"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="default"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={handleVerify}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.submitBtnText}>Masuk Dashboard Pengawas</Text>
                    <ArrowRight size={15} color="#ffffff" strokeWidth={2.4} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Kembali ke Mode Siswa</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  kavWrapper: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.xl,
    padding: 22,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: radii.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  badgeText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: colors.primaryDark,
    letterSpacing: 0.4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.bgCardSubtle,
  },
  title: {
    fontFamily: typography.bold,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: colors.dangerText,
    flex: 1,
  },
  formGroup: {
    marginBottom: 13,
    gap: 5,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontFamily: typography.semiBold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.xs,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  presetText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: colors.primary,
  },
  optionalHelperText: {
    fontFamily: typography.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  leadingIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  trailingIconBtn: {
    position: 'absolute',
    right: 8,
    zIndex: 2,
    padding: 6,
  },
  input: {
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: typography.medium,
    color: colors.textPrimary,
    width: '100%',
  },
  inputWithIcon: {
    paddingLeft: 38,
    paddingRight: 40,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.bgSurface,
  },
  pinInput: {
    letterSpacing: 4,
    fontFamily: typography.bold,
    fontSize: 14.5,
  },
  tokenInput: {
    letterSpacing: 2,
    fontFamily: typography.semiBold,
    fontSize: 13,
  },
  submitBtn: {
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    ...shadows.primaryBtn,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 13,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  cancelBtn: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
});
