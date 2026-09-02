import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Sparkles, ArrowRight, KeyRound, AlertCircle, Shield, ArrowLeft } from 'lucide-react-native';
import { examService } from '../../services/examService';
import type { ExamSettings, Question } from '../../types/exam';
import { typography, colors, radii, shadows } from '../../theme';

interface StudentQuickEntryProps {
  onSuccess: (data: {
    studentName: string;
    nisn: string;
    className: string;
    exam: ExamSettings;
    questions: Question[];
  }) => void;
  onSwitchToTeacher: () => void;
  onBack?: () => void;
}

export const StudentQuickEntry: React.FC<StudentQuickEntryProps> = ({
  onSuccess,
  onSwitchToTeacher,
  onBack,
}) => {
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!nisn.trim() || !name.trim() || !token.trim()) {
      setErrorMsg('Harap lengkapi NISN, Nama Lengkap, dan 6 Digit Token PIN.');
      return;
    }

    if (token.trim().length !== 6) {
      setErrorMsg('Token PIN harus terdiri dari 6 digit.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Direct query to Supabase database by token
      const res = await examService.getExamByToken(token.trim());

      if (res.exam && res.questions && res.questions.length > 0) {
        onSuccess({
          studentName: name.trim(),
          nisn: nisn.trim(),
          className: className.trim() || res.exam.gradeLevel || 'Kelas X',
          exam: res.exam,
          questions: res.questions,
        });
      } else {
        setErrorMsg(
          res.error || `Token PIN '${token.trim()}' tidak ditemukan atau ujian belum aktif.`
        );
      }
    } catch {
      setErrorMsg('Gagal terhubung ke database. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Top Back Navigation */}
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <ArrowLeft size={15} color={colors.textSecondary} />
            <Text style={styles.backBtnText}>Kembali ke Menu Utama</Text>
          </TouchableOpacity>
        )}

        {/* Brand Header */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Sparkles size={22} color={colors.primary} strokeWidth={2.2} />
          </View>
          <Text style={styles.appTitle}>UjianPintar</Text>
          <Text style={styles.appTagline}>Portal Asesmen CBT Terstandar</Text>
        </View>

        {/* Entry Form Card */}
        <View style={styles.card}>
          <Text style={styles.formTitle}>Masuk Sesi Ujian</Text>
          <Text style={styles.formSubtitle}>
            Masukkan identitas peserta dan 6 digit PIN Token yang diberikan oleh pengawas ujian.
          </Text>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NISN Peserta Didik (10 Digit)</Text>
            <TextInput
              style={styles.input}
              value={nisn}
              onChangeText={setNisn}
              placeholder="10 digit nomor NISN"
              placeholderTextColor={colors.textSubtle}
              keyboardType="number-pad"
              maxLength={10}
              autoCorrect={false}
              spellCheck={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap Siswa</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap sesuai daftar hadir"
              placeholderTextColor={colors.textSubtle}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kelas / Rombongan Belajar</Text>
            <TextInput
              style={styles.input}
              value={className}
              onChangeText={setClassName}
              placeholder="Contoh: Kelas X - 1"
              placeholderTextColor={colors.textSubtle}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Token PIN Ujian (6 Digit)</Text>
            <View style={styles.tokenWrapper}>
              <KeyRound size={17} color={colors.primary} style={styles.tokenIcon} />
              <TextInput
                style={[styles.input, styles.tokenInput]}
                value={token}
                onChangeText={(txt) => setToken(txt.toUpperCase())}
                placeholder="TOKEN"
                placeholderTextColor={colors.textSubtle}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>Konfirmasi Masuk Ujian</Text>
                <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Teacher Switch Hint */}
        <TouchableOpacity
          style={styles.teacherSwitchBanner}
          onPress={onSwitchToTeacher}
          activeOpacity={0.7}
        >
          <Shield size={15} color={colors.textMuted} />
          <Text style={styles.teacherSwitchText}>
            Pengawas ujian? <Text style={styles.teacherLink}>Buka Portal Guru</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.bgApp,
  },
  container: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 36,
    alignItems: 'center',
    flexGrow: 1,
    backgroundColor: colors.bgApp,
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
    marginBottom: 16,
  },
  backBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
    includeFontPadding: false,
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appTitle: {
    fontFamily: typography.extraBold,
    fontSize: 22,
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  appTagline: {
    fontFamily: typography.medium,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
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
  formTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  formSubtitle: {
    fontFamily: typography.regular,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: colors.dangerText,
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
    gap: 5,
  },
  label: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.bgApp,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    fontFamily: typography.medium,
    color: colors.textPrimary,
  },
  tokenWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  tokenIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
  },
  tokenInput: {
    paddingLeft: 44,
    borderColor: colors.primaryBorder,
    borderWidth: 1.5,
    color: colors.primaryDark,
    fontFamily: typography.bold,
    letterSpacing: 5,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: colors.primaryLight,
  },
  submitBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...shadows.primaryBtn,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 14,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  teacherSwitchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    height: 40,
    paddingHorizontal: 18,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.card,
  },
  teacherSwitchText: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  teacherLink: {
    fontFamily: typography.bold,
    color: colors.primary,
  },
});
