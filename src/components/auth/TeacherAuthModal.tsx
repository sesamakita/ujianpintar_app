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
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

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
                  <ShieldCheck size={15} color="#1D4ED8" strokeWidth={2.4} />
                  <Text style={styles.badgeText}>PORTAL PENGAWAS CBT</Text>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  activeOpacity={0.75}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Title & Subtitle */}
              <Text style={styles.title}>Akses Ruang Pengawas</Text>
              <Text style={styles.subtitle}>
                Masukkan 6 digit PIN Pengawas yang tertera pada paket bank soal kelas ini untuk langsung memantau pengerjaan siswa.
              </Text>

              {/* Error Message */}
              {errorMsg && (
                <View style={styles.errorBox}>
                  <AlertCircle size={16} color="#DC2626" strokeWidth={2.4} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* Form Input 1: Nama Pengawas */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nama Pengawas / Guru</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.leadingIcon} pointerEvents="none">
                    <User size={16} color={nameFocused ? '#2563EB' : colors.textMuted} strokeWidth={2.2} />
                  </View>
                  <TextInput
                    ref={nameInputRef}
                    style={[
                      styles.input,
                      styles.inputWithIcon,
                      nameFocused && styles.inputFocused,
                    ]}
                    value={teacherName}
                    onChangeText={setTeacherName}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    placeholder="Nama Pengawas"
                    placeholderTextColor={colors.textSubtle}
                    autoCapitalize="words"
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
                    activeOpacity={0.75}
                    style={styles.presetChip}
                  >
                    <Sparkles size={11} color="#1D4ED8" strokeWidth={2.2} />
                    <Text style={styles.presetText}>Master PIN: 123456</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputContainer}>
                  <View style={styles.leadingIcon} pointerEvents="none">
                    <Lock size={16} color={pinFocused ? '#2563EB' : colors.textMuted} strokeWidth={2.2} />
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
                    placeholder="6 Digit PIN Pengawas"
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
                    activeOpacity={0.75}
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
                    <Layers size={16} color={tokenFocused ? '#2563EB' : colors.textMuted} strokeWidth={2.2} />
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
                    placeholder="Contoh: 123456 (Token Siswa)"
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
                    <ArrowRight size={16} color="#ffffff" strokeWidth={2.6} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                activeOpacity={0.75}
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  kavWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: clayRadii.modal,
    padding: 24,
    width: '100%',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.cardHover,
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
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: clayRadii.badge,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.badge,
  },
  badgeText: {
    fontFamily: typography.extraBold,
    fontSize: 10,
    color: '#1D4ED8',
    letterSpacing: 0.4,
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
  title: {
    fontFamily: typography.extraBold,
    fontSize: 18,
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
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#FECDD3',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#9F1239',
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
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: clayRadii.badge,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  presetText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: '#1D4ED8',
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
    left: 14,
    zIndex: 2,
  },
  trailingIconBtn: {
    position: 'absolute',
    right: 10,
    zIndex: 2,
    padding: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: clayRadii.input,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    fontFamily: typography.medium,
    color: colors.textPrimary,
    width: '100%',
  },
  inputWithIcon: {
    paddingLeft: 42,
    paddingRight: 40,
  },
  inputFocused: {
    borderColor: '#BFDBFE',
    borderBottomColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  pinInput: {
    letterSpacing: 4,
    fontFamily: typography.extraBold,
    fontSize: 14.5,
    color: '#1D4ED8',
  },
  tokenInput: {
    letterSpacing: 2,
    fontFamily: typography.bold,
    fontSize: 13,
  },
  submitBtn: {
    height: 50,
    backgroundColor: clayColors.primaryBtnBg,
    borderRadius: clayRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: clayColors.primaryBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.primaryBtnBevel,
    ...clayShadows.btnPrimary,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 13.5,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  cancelBtn: {
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  cancelBtnText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textMuted,
  },
});
