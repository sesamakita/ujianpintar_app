import React, { useState, useRef, useEffect } from 'react';
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
  StatusBar,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowRight,
  KeyRound,
  AlertCircle,
  Shield,
  GraduationCap,
  User,
  Award,
} from 'lucide-react-native';
import { examService } from '../../services/examService';
import { authService, TeacherUser } from '../../services/authService';
import { formatPersonName, formatClassName } from '../../lib/formatters';
import type { ExamSettings, Question, StudentPublicExamSummary } from '../../types/exam';
import { StudentResultModal } from '../student/StudentResultModal';
import { typography, colors, clayColors, clayShadows, clayRadii } from '../../theme';

interface StudentQuickEntryProps {
  onSuccess: (data: {
    studentName: string;
    nisn: string;
    className: string;
    exam: ExamSettings;
    questions: Question[];
  }) => void;
  onTeacherSuccess?: (teacher: TeacherUser, matchedExam?: ExamSettings) => void;
  onSwitchToTeacher?: () => void;
}

export const StudentQuickEntry: React.FC<StudentQuickEntryProps> = ({
  onSuccess,
  onTeacherSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 20)) + 16;
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Tab State: 'student' or 'teacher'
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

  // Input Focus State: tracks which field is currently active
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const FIELD_OFFSETS: Record<string, number> = {
    nisn: 40,
    name: 110,
    className: 180,
    token: 250,
    teacherName: 80,
    teacherTokenPin: 150,
    checkNisn: 480,
    checkToken: 550,
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const height = e.endCoordinates?.height || 280;
        setKeyboardHeight(height);
        if (focusedField && typeof FIELD_OFFSETS[focusedField] === 'number') {
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: FIELD_OFFSETS[focusedField], animated: true });
          }, 80);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [focusedField]);

  const handleFocusField = (field: string) => {
    setFocusedField(field);
    const targetY = FIELD_OFFSETS[field];
    if (typeof targetY === 'number') {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
      }, 100);
    }
  };

  // Student Form State
  const [nisn, setNisn] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [token, setToken] = useState('');

  // Teacher Form State (Default Nama Pengawas dikosongkan)
  const [teacherName, setTeacherName] = useState('');
  const [teacherTokenPin, setTeacherTokenPin] = useState('');

  // Common State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check Result State (Dedicated Container)
  const [checkNisn, setCheckNisn] = useState('');
  const [checkToken, setCheckToken] = useState('');
  const [isCheckingResult, setIsCheckingResult] = useState(false);
  const [checkErrorMsg, setCheckErrorMsg] = useState<string | null>(null);
  const [publicResultModalOpen, setPublicResultModalOpen] = useState(false);
  const [publicResultData, setPublicResultData] = useState<StudentPublicExamSummary | null>(null);

  const handleCheckResult = async () => {
    if (!checkNisn.trim()) {
      setCheckErrorMsg('Harap masukkan nomor NISN Anda.');
      return;
    }

    setIsCheckingResult(true);
    setCheckErrorMsg(null);

    try {
      const results = await examService.lookupStudentExamHistory(
        checkNisn.trim(),
        checkToken.trim() || undefined
      );

      if (results && results.length > 0) {
        setPublicResultData(results[0]);
        setPublicResultModalOpen(true);
      } else {
        const msg = checkToken.trim()
          ? `Data ujian untuk NISN '${checkNisn.trim()}' dengan Token PIN '${checkToken.trim()}' tidak ditemukan. Pastikan nomor NISN dan Token PIN modul soal ujian sudah sesuai.`
          : `Data ujian untuk NISN '${checkNisn.trim()}' tidak ditemukan. Periksa kembali nomor NISN Anda.`;
        setCheckErrorMsg(msg);
      }
    } catch {
      setCheckErrorMsg('Gagal memeriksa nilai. Pastikan koneksi internet aktif.');
    } finally {
      setIsCheckingResult(false);
    }
  };

  const handleStudentSubmit = async () => {
    const cleanStudentName = formatPersonName(name).trim();
    const cleanClassNameInput = formatClassName(className, false);

    if (!nisn.trim() || !cleanStudentName || !token.trim()) {
      setErrorMsg('Harap lengkapi NISN, Nama Lengkap, dan 6 Digit Token PIN.');
      return;
    }

    if (token.trim().length !== 6) {
      setErrorMsg('Token PIN harus terdiri dari 6 digit angka.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await examService.getExamByToken(token.trim());

      if (res.exam && res.questions && res.questions.length > 0) {
        // Gatekeeper Sesi Siswa: Periksa apakah sesi siswa terkunci, NISN konflik, batas kapasitas, atau kuota sesi bulanan guru
        const resolvedClassName = cleanClassNameInput || formatClassName(res.exam.gradeLevel, false) || 'Kelas X';
        const accessCheck = await examService.checkStudentSessionAccess(res.exam.id, nisn.trim(), cleanStudentName, resolvedClassName);
        if (!accessCheck.allowed) {
          setErrorMsg(accessCheck.message || 'Akses ujian tidak diizinkan. Silakan hubungi guru pengawas.');
          return;
        }

        onSuccess({
          studentName: cleanStudentName,
          nisn: nisn.trim(),
          className: resolvedClassName,
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

  const handleTeacherSubmit = async () => {
    const cleanTeacherName = formatPersonName(teacherName).trim();

    if (!cleanTeacherName) {
      setErrorMsg('Harap isi Nama Pengawas / Guru.');
      return;
    }

    if (!teacherTokenPin.trim()) {
      setErrorMsg('Harap masukkan Token PIN Keamanan.');
      return;
    }

    if (teacherTokenPin.trim().length !== 6) {
      setErrorMsg('Token PIN Keamanan harus terdiri dari 6 digit angka.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await authService.loginWithPIN(
        teacherTokenPin.trim(),
        cleanTeacherName
      );

      if (res.success && res.teacher) {
        if (onTeacherSuccess) {
          onTeacherSuccess(res.teacher, res.matchedExam);
        }
      } else {
        setErrorMsg(res.error || 'Token PIN Keamanan tidak tepat.');
      }
    } catch {
      setErrorMsg('Gagal memverifikasi identitas pengawas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: topPadding,
            paddingBottom: keyboardHeight > 0 ? keyboardHeight + 36 : (Platform.OS === 'ios' ? 36 : 48),
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bounces={false}
      >
        {/* Entry Form Card */}
        <View style={styles.card}>
          {/* Segmented Clay Tabs: Siswa vs Guru */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'student' ? styles.tabBtnActiveStudent : styles.tabBtnInactive,
              ]}
              onPress={() => {
                setActiveTab('student');
                setFocusedField(null);
                setErrorMsg(null);
              }}
              activeOpacity={0.82}
            >
              <GraduationCap
                size={16}
                color={activeTab === 'student' ? '#047857' : colors.textMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'student' ? styles.tabTextActiveStudent : styles.tabTextInactive,
                ]}
              >
                Siswa
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'teacher' ? styles.tabBtnActiveTeacher : styles.tabBtnInactive,
              ]}
              onPress={() => {
                setActiveTab('teacher');
                setFocusedField(null);
                setErrorMsg(null);
              }}
              activeOpacity={0.82}
            >
              <Shield
                size={16}
                color={activeTab === 'teacher' ? '#1D4ED8' : colors.textMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'teacher' ? styles.tabTextActiveTeacher : styles.tabTextInactive,
                ]}
              >
                Guru / Pengawas
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.formTitle}>
            {activeTab === 'student' ? 'Masuk Sesi Ujian' : 'Masuk Ruang Pengawas'}
          </Text>
          <Text style={styles.formSubtitle}>
            {activeTab === 'student'
              ? 'Masukkan identitas peserta dan 6 digit PIN Token yang diberikan oleh pengawas ujian.'
              : 'Masukkan PIN Keamanan Pengawas untuk memantau live pengerjaan siswa & kelola rekap nilai.'}
          </Text>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={17} color="#DC2626" strokeWidth={2.4} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {activeTab === 'student' ? (
            /* TAB 1: STUDENT FORM (Warna Aktif: Emerald / Hijau Siswa) */
            <>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    focusedField === 'nisn' && styles.labelFocusedStudent,
                  ]}
                >
                  NISN Peserta Didik
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'nisn' && styles.inputFocusedStudent,
                  ]}
                  value={nisn}
                  onChangeText={(txt) => setNisn(txt.replace(/[^0-9]/g, ''))}
                  onFocus={() => handleFocusField('nisn')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="nomor NISN"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoCorrect={false}
                  spellCheck={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    focusedField === 'name' && styles.labelFocusedStudent,
                  ]}
                >
                  Nama Lengkap Siswa
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'name' && styles.inputFocusedStudent,
                  ]}
                  value={name}
                  onChangeText={(txt) => setName(formatPersonName(txt))}
                  onFocus={() => handleFocusField('name')}
                  onBlur={() => {
                    setFocusedField(null);
                    setName(formatPersonName(name).trim());
                  }}
                  placeholder="Nama lengkap sesuai daftar hadir"
                  placeholderTextColor={colors.textSubtle}
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    focusedField === 'className' && styles.labelFocusedStudent,
                  ]}
                >
                  Kelas / Rombongan Belajar
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'className' && styles.inputFocusedStudent,
                  ]}
                  value={className}
                  onChangeText={(txt) => setClassName(formatClassName(txt, true))}
                  onFocus={() => handleFocusField('className')}
                  onBlur={() => {
                    setFocusedField(null);
                    setClassName(formatClassName(className, false));
                  }}
                  placeholder="Contoh: XI Ips 1 atau X-1"
                  placeholderTextColor={colors.textSubtle}
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    focusedField === 'token' && styles.labelFocusedStudent,
                  ]}
                >
                  Token PIN Ujian (6 Digit)
                </Text>
                <View style={styles.tokenWrapper}>
                  <KeyRound
                    size={18}
                    color={focusedField === 'token' ? '#059669' : '#10B981'}
                    style={styles.tokenIcon}
                    strokeWidth={2.4}
                  />
                  <TextInput
                    style={[
                      styles.tokenInputStudent,
                      focusedField === 'token' && styles.tokenInputFocusedStudent,
                    ]}
                    value={token}
                    onChangeText={(txt) => setToken(txt.replace(/[^0-9]/g, ''))}
                    onFocus={() => handleFocusField('token')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="PIN 6 DIGIT"
                    placeholderTextColor="#A7F3D0"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCorrect={false}
                    spellCheck={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleStudentSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.btnText}>Konfirmasi Masuk Ujian</Text>
                    <ArrowRight size={17} color="#ffffff" strokeWidth={2.6} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            /* TAB 2: TEACHER FORM (Warna Aktif: Royal Blue / Biru Pengawas) */
            <>
              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    focusedField === 'teacherName' && styles.labelFocusedTeacher,
                  ]}
                >
                  Nama Pengawas / Guru
                </Text>
                <View style={styles.iconInputWrapper}>
                  <User
                    size={17}
                    color={focusedField === 'teacherName' ? '#1D4ED8' : colors.textMuted}
                    style={styles.leadingIcon}
                    strokeWidth={2.2}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      styles.inputWithLeading,
                      focusedField === 'teacherName' && styles.inputFocusedTeacher,
                    ]}
                    value={teacherName}
                    onChangeText={(txt) => setTeacherName(formatPersonName(txt))}
                    onFocus={() => handleFocusField('teacherName')}
                    onBlur={() => {
                      setFocusedField(null);
                      setTeacherName(formatPersonName(teacherName).trim());
                    }}
                    placeholder="Nama lengkap pengawas / guru"
                    placeholderTextColor={colors.textSubtle}
                    autoCorrect={false}
                    spellCheck={false}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[
                    styles.label,
                    focusedField === 'teacherTokenPin' && styles.labelFocusedTeacher,
                  ]}
                >
                  Token PIN Keamanan (6 Digit)
                </Text>
                <View style={styles.tokenWrapper}>
                  <KeyRound
                    size={18}
                    color={focusedField === 'teacherTokenPin' ? '#1D4ED8' : '#3B82F6'}
                    style={styles.tokenIcon}
                    strokeWidth={2.4}
                  />
                  <TextInput
                    style={[
                      styles.tokenInputTeacher,
                      focusedField === 'teacherTokenPin' && styles.tokenInputFocusedTeacher,
                    ]}
                    value={teacherTokenPin}
                    onChangeText={(txt) => setTeacherTokenPin(txt.replace(/[^0-9]/g, ''))}
                    onFocus={() => handleFocusField('teacherTokenPin')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="PIN 6 DIGIT"
                    placeholderTextColor="#93C5FD"
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCorrect={false}
                    spellCheck={false}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.submitBtnTeacher}
                onPress={handleTeacherSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Shield size={18} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.btnText}>Verifikasi & Masuk Pengawas</Text>
                    <ArrowRight size={17} color="#ffffff" strokeWidth={2.6} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* KONTAINER TERPISAH: CEK HASIL NILAI UJIAN SISWA (WARNA KHUSUS INDIGO CLAY) */}
        {activeTab === 'student' && (
          <View style={styles.checkResultCard}>
            {/* Header Kontainer */}
            <View style={styles.checkResultHeader}>
              <View style={styles.checkResultIconCircle}>
                <Award size={22} color="#4338CA" strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.checkResultTitleRow}>
                  <Text style={styles.checkResultTitle}>Cek Hasil Nilai Ujian</Text>
                  <View style={styles.checkResultTag}>
                    <Text style={styles.checkResultTagText}>Mandiri</Text>
                  </View>
                </View>
                <Text style={styles.checkResultSubtitle}>
                  Periksa riwayat skor ujian, rincian jawaban benar/salah, serta unduh SKHU / Rapor PDF.
                </Text>
              </View>
            </View>

            {checkErrorMsg && (
              <View style={styles.checkErrorBanner}>
                <AlertCircle size={14} color="#DC2626" strokeWidth={2.2} />
                <Text style={styles.checkErrorText}>{checkErrorMsg}</Text>
              </View>
            )}

            {/* Kolom 1: NISN Peserta Didik */}
            <View style={styles.inputGroupCompact}>
              <Text style={styles.labelCompact}>NISN Peserta Didik</Text>
              <TextInput
                style={[
                  styles.inputCompact,
                  focusedField === 'checkNisn' && styles.inputCompactFocused,
                ]}
                value={checkNisn}
                onChangeText={(txt) => setCheckNisn(txt.replace(/[^0-9]/g, ''))}
                onFocus={() => handleFocusField('checkNisn')}
                onBlur={() => setFocusedField(null)}
                placeholder="Masukkan 10 digit nomor NISN..."
                placeholderTextColor={colors.textSubtle}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            {/* Kolom 2: Token Ujian */}
            <View style={styles.inputGroupCompact}>
              <Text style={styles.labelCompact}>Token PIN Ujian (Opsional)</Text>
              <TextInput
                style={[
                  styles.inputCompact,
                  focusedField === 'checkToken' && styles.inputCompactFocused,
                ]}
                value={checkToken}
                onChangeText={(txt) => setCheckToken(txt.toUpperCase())}
                onFocus={() => handleFocusField('checkToken')}
                onBlur={() => setFocusedField(null)}
                placeholder="Contoh: 900286"
                placeholderTextColor={colors.textSubtle}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* Tombol Periksa Nilai */}
            <TouchableOpacity
              style={styles.checkSubmitBtn}
              onPress={handleCheckResult}
              disabled={isCheckingResult}
              activeOpacity={0.85}
            >
              {isCheckingResult ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={styles.btnContent}>
                  <Award size={16} color="#ffffff" strokeWidth={2.4} />
                  <Text style={styles.checkSubmitBtnText}>Periksa Nilai Ujian</Text>
                  <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal Hasil Ujian Siswa Mandiri */}
      <StudentResultModal
        visible={publicResultModalOpen}
        onClose={() => setPublicResultModalOpen(false)}
        result={publicResultData}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: clayColors.canvas,
  },
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 36,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    backgroundColor: clayColors.canvas,
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

  /* 2-Segmented Clay Tabs */
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: clayRadii.card,
    padding: 4,
    gap: 6,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: clayRadii.badge,
  },
  tabBtnActiveStudent: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#6EE7B7',
    ...clayShadows.badge,
  },
  tabBtnActiveTeacher: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#93C5FD',
    ...clayShadows.badge,
  },
  tabBtnInactive: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 12.5,
    fontFamily: typography.semiBold,
  },
  tabTextActiveStudent: {
    color: '#065F46',
    fontFamily: typography.bold,
  },
  tabTextActiveTeacher: {
    color: '#1E40AF',
    fontFamily: typography.bold,
  },
  tabTextInactive: {
    color: colors.textMuted,
  },

  formTitle: {
    fontFamily: typography.extraBold,
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
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#FECDD3',
    gap: 8,
    marginBottom: 14,
    ...clayShadows.badge,
  },
  errorText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#9F1239',
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 14,
    gap: 6,
  },
  label: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  labelFocusedStudent: {
    color: '#059669',
  },
  labelFocusedTeacher: {
    color: '#1D4ED8',
  },

  /* Base Input Styling */
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: clayRadii.input,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13.5,
    fontFamily: typography.medium,
    color: colors.textPrimary,
  },

  /* Dynamic Tab Focused Input States */
  inputFocusedStudent: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderBottomColor: '#059669',
    borderBottomWidth: 4,
  },
  inputFocusedTeacher: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderBottomColor: '#1D4ED8',
    borderBottomWidth: 4,
  },

  iconInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  leadingIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  inputWithLeading: {
    paddingLeft: 42,
  },

  tokenWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  tokenIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },

  /* Student Token Styles */
  tokenInputStudent: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    borderBottomWidth: 4.5,
    borderBottomColor: '#6EE7B7',
    borderRadius: clayRadii.input,
    paddingLeft: 46,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 16.5,
    fontFamily: typography.extraBold,
    color: '#065F46',
    letterSpacing: 6,
    textAlign: 'center',
    ...clayShadows.badge,
  },
  tokenInputFocusedStudent: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderBottomColor: '#059669',
    borderBottomWidth: 5,
    color: '#064E3B',
  },

  /* Teacher Token Styles */
  tokenInputTeacher: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    borderBottomWidth: 4.5,
    borderBottomColor: '#93C5FD',
    borderRadius: clayRadii.input,
    paddingLeft: 46,
    paddingRight: 16,
    paddingVertical: 12,
    fontSize: 16.5,
    fontFamily: typography.extraBold,
    color: '#1D4ED8',
    letterSpacing: 6,
    textAlign: 'center',
    ...clayShadows.badge,
  },
  tokenInputFocusedTeacher: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
    borderBottomColor: '#1D4ED8',
    borderBottomWidth: 5,
    color: '#1E40AF',
  },

  submitBtn: {
    height: 52,
    backgroundColor: clayColors.studentBtnBg,
    borderRadius: clayRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 5.5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  submitBtnTeacher: {
    height: 52,
    backgroundColor: '#1E293B',
    borderRadius: clayRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 2,
    borderColor: '#334155',
    borderBottomWidth: 5.5,
    borderBottomColor: '#0F172A',
    ...clayShadows.btnTeacher,
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
    fontSize: 14.5,
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  checkResultCard: {
    backgroundColor: '#EEF2FF', // Pastel Indigo Clay
    borderRadius: clayRadii.modal,
    padding: 22,
    width: '100%',
    maxWidth: 420,
    borderWidth: 2.5,
    borderColor: '#E0E7FF',
    borderBottomWidth: 6,
    borderBottomColor: '#C7D2FE',
    marginTop: 18,
    marginBottom: 28,
    ...clayShadows.cardHover,
  },
  checkResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  checkResultIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
  },
  checkResultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkResultTitle: {
    fontFamily: typography.extraBold,
    fontSize: 16,
    color: '#312E81',
    letterSpacing: -0.2,
  },
  checkResultTag: {
    backgroundColor: '#C7D2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  checkResultTagText: {
    fontFamily: typography.bold,
    fontSize: 10,
    color: '#3730A3',
    textTransform: 'uppercase',
  },
  checkResultSubtitle: {
    fontFamily: typography.medium,
    fontSize: 11.5,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  checkErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  checkErrorText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: '#DC2626',
    flex: 1,
  },
  inputGroupCompact: {
    marginBottom: 12,
  },
  labelCompact: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#334155',
    marginBottom: 5,
  },
  inputCompact: {
    height: 46,
    backgroundColor: '#ffffff',
    borderRadius: clayRadii.input,
    paddingHorizontal: 14,
    fontFamily: typography.semiBold,
    fontSize: 13.5,
    color: '#0F172A',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderBottomWidth: 3.5,
    borderBottomColor: '#94A3B8',
  },
  inputCompactFocused: {
    borderColor: '#4F46E5',
    borderBottomColor: '#3730A3',
  },
  checkSubmitBtn: {
    height: 48,
    backgroundColor: '#4F46E5',
    borderRadius: clayRadii.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderBottomWidth: 4.5,
    borderBottomColor: '#3730A3',
    ...clayShadows.btnTeacher,
  },
  checkSubmitBtnText: {
    fontFamily: typography.bold,
    color: '#ffffff',
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
});
