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
  Vibration,
  Linking,
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
  QrCode,
  ScanQrCode,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Users,
  X,
  Sparkles,
  Zap,
  ZapOff,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { examService } from '../../services/examService';
import { authService, TeacherUser } from '../../services/authService';
import { rosterService } from '../../services/rosterService';
import { formatPersonName, formatClassName } from '../../lib/formatters';
import type { ExamSettings, Question, StudentPublicExamSummary, StudentRosterItem } from '../../types/exam';
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
    name: 80,
    nisn: 160,
    className: 240,
    token: 320,
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

  // Student Form State (Susunan: Scan QR -> Nama -> NISN -> Kelas -> Token)
  const [name, setName] = useState('');
  const [nisn, setNisn] = useState('');
  const [className, setClassName] = useState('');
  const [token, setToken] = useState('');

  // QR Scanner & Synced Exam State
  const [permission, requestPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isQrSynced, setIsQrSynced] = useState(false);
  const [syncedExamId, setSyncedExamId] = useState('');
  const [syncedExamTitle, setSyncedExamTitle] = useState('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [scannedLock, setScannedLock] = useState(false);

  // Roster Autocomplete State
  const [classRoster, setClassRoster] = useState<StudentRosterItem[]>([]);
  const [filteredRoster, setFilteredRoster] = useState<StudentRosterItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isRosterSelected, setIsRosterSelected] = useState(false);

  // Teacher Form State (Default Nama Pengawas dikosongkan)
  const [teacherName, setTeacherName] = useState('');
  const [teacherTokenPin, setTeacherTokenPin] = useState('');

  // Common State
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handlers for Real Camera QR Scanner & Roster
  const handleOpenScanner = async () => {
    setErrorMsg(null);
    setCameraError(null);
    setCameraReady(false);
    setScannedLock(false);
    setIsTorchOn(false);
    setIsScannerOpen(true);

    try {
      if (!permission?.granted) {
        await requestPermission();
      }
    } catch (err: any) {
      console.warn('Gagal meminta izin kamera:', err);
    }
  };

  const handleApplySyncedExam = async (payload: {
    examId: string;
    examTitle: string;
    targetClass: string;
    token?: string;
  }) => {
    setSyncedExamId(payload.examId);
    setSyncedExamTitle(payload.examTitle);
    setIsQrSynced(true);
    if (payload.targetClass) {
      setClassName(payload.targetClass);
    }
    // PIN Ujian SELALU dikosongkan agar siswa memasukkannya secara manual atas instruksi pengawas
    setToken('');

    setSyncNotice(
      `Berhasil sinkron modul "${payload.examTitle}" (${payload.targetClass ? 'Kelas ' + payload.targetClass : 'Semua Kelas'})!`
    );

    // Ambil daftar nama siswa kelas target
    try {
      const roster = await rosterService.getPublicClassRoster(payload.examId, payload.targetClass);
      if (roster && roster.length > 0) {
        setClassRoster(roster);
        setFilteredRoster(roster);
        setIsDropdownOpen(true);
      }
    } catch (err) {
      console.warn('Gagal memuat daftar nama siswa:', err);
    }

    setTimeout(() => {
      setSyncNotice(null);
    }, 4500);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedLock) return;
    setScannedLock(true);
    try {
      Vibration.vibrate(80);
    } catch {}
    setIsScannerOpen(false);
    setIsTorchOn(false);

    const parsed = rosterService.parseQrPayload(data);
    if (parsed) {
      handleApplySyncedExam({
        examId: parsed.examId,
        examTitle: parsed.examTitle,
        targetClass: parsed.targetClass,
        token: parsed.token,
      });
    } else {
      setErrorMsg('Format QR Code tidak dikenali atau bukan QR ujian resmi UjianPintar.');
    }
  };

  const handleNameInputChange = (txt: string) => {
    setName(txt);
    if (isRosterSelected) {
      setIsRosterSelected(false);
    }

    if (classRoster.length > 0) {
      const clean = txt.trim().toLowerCase();
      if (clean.length > 0) {
        const matches = classRoster.filter(
          (s) =>
            s.studentName.toLowerCase().includes(clean) ||
            s.nisn.includes(clean)
        );
        setFilteredRoster(matches);
        setIsDropdownOpen(matches.length > 0);
      } else {
        setFilteredRoster(classRoster);
        setIsDropdownOpen(true);
      }
    }
  };

  const handleSelectRosterStudent = (student: StudentRosterItem) => {
    setName(student.studentName);
    setNisn(student.nisn);
    if (student.className) {
      setClassName(student.className);
    }
    setIsRosterSelected(true);
    setIsDropdownOpen(false);
    setToken(''); // Selalu biarkan kolom PIN ujian kosong agar diinput manual oleh siswa
    handleFocusField('token');
  };

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

    if (!cleanStudentName) {
      setErrorMsg('Harap masukkan Nama Lengkap Siswa.');
      return;
    }

    if (!nisn.trim()) {
      setErrorMsg('Harap masukkan nomor NISN Peserta Didik.');
      return;
    }

    if (!token.trim()) {
      setErrorMsg('Harap masukkan 6 Digit Token PIN dari pengawas.');
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
        const resolvedClassName = cleanClassNameInput || formatClassName(res.exam.targetClass || res.exam.gradeLevel, false) || 'Kelas X';
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

  // Dedicated Top-Level Full-Screen QR Scanner (Real Camera)
  if (isScannerOpen) {
    return (
      <View style={styles.scannerDedicatedScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" translucent={true} />

        {/* Scanner Top Bar Header */}
        <View style={[styles.scannerHeader, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <TouchableOpacity
            style={styles.scannerIconBtn}
            onPress={() => {
              setIsScannerOpen(false);
              setIsTorchOn(false);
            }}
            accessibilityLabel="Tutup Pemindai"
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingHorizontal: 4 }}>
            <Text style={styles.scannerHeaderTitle}>Pindai QR Soal</Text>
            <Text style={styles.scannerHeaderSubtitle} numberOfLines={1}>
              Arahkan kamera ke QR proyektor atau cetakan
            </Text>
          </View>

          <View style={styles.scannerHeaderActions}>
            <TouchableOpacity
              style={[styles.scannerIconBtn, isTorchOn && styles.scannerIconBtnActive]}
              onPress={() => setIsTorchOn((prev) => !prev)}
              accessibilityLabel="Lampu Senter"
            >
              {isTorchOn ? <Zap size={18} color="#FBBF24" /> : <ZapOff size={18} color="#94A3B8" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Scanner Content Area */}
        <View style={styles.cameraContainer}>
          {/* Permission State: Loading */}
          {permission === null ? (
            <View style={styles.permissionScreen}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={[styles.loadingCameraBadgeText, { marginTop: 14 }]}>
                Memeriksa izin kamera...
              </Text>
            </View>
          ) : !permission.granted ? (
            /* Permission State: Denied / Not Granted */
            <View style={styles.permissionScreen}>
              <View style={styles.permissionIconCircle}>
                <Camera size={36} color="#10B981" />
              </View>
              <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
              <Text style={styles.permissionDesc}>
                Aplikasi membutuhkan izin kamera untuk memindai kode QR modul ujian dari layar proyektor atau cetakan pengawas secara otomatis.
              </Text>

              <TouchableOpacity
                style={styles.permissionBtn}
                onPress={() => requestPermission()}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionBtnText}>Izinkan Akses Kamera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionSecondaryBtn}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionSecondaryBtnText}>Buka Pengaturan Perangkat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionCancelBtn}
                onPress={() => setIsScannerOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionCancelBtnText}>Kembali ke Form</Text>
              </TouchableOpacity>
            </View>
          ) : cameraError ? (
            /* Camera Error State */
            <View style={styles.permissionScreen}>
              <View style={[styles.permissionIconCircle, { borderColor: '#EF4444' }]}>
                <AlertCircle size={36} color="#EF4444" />
              </View>
              <Text style={styles.permissionTitle}>Kamera Tidak Dapat Dibuka</Text>
              <Text style={styles.permissionDesc}>{cameraError}</Text>
              <TouchableOpacity
                style={[styles.permissionBtn, { backgroundColor: '#334155' }]}
                onPress={() => {
                  setCameraError(null);
                  setCameraReady(false);
                }}
              >
                <Text style={styles.permissionBtnText}>Coba Lagi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.permissionCancelBtn}
                onPress={() => setIsScannerOpen(false)}
              >
                <Text style={styles.permissionCancelBtnText}>Tutup</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Real Camera View with Viewfinder */
            <>
              <CameraView
                style={styles.cameraView}
                facing="back"
                enableTorch={isTorchOn}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scannedLock ? undefined : handleBarcodeScanned}
                onCameraReady={() => {
                  setCameraReady(true);
                  setCameraError(null);
                }}
                onMountError={(e) => {
                  console.error('Camera mount error:', e);
                  setCameraError(e.message || 'Gagal menginisialisasi kamera.');
                }}
              />

              {/* Viewfinder Overlay Mask */}
              <View style={styles.maskContainer} pointerEvents="box-none">
                <View style={styles.maskTop}>
                  {!cameraReady && (
                    <View style={styles.loadingCameraBadge}>
                      <ActivityIndicator size="small" color="#10B981" />
                      <Text style={styles.loadingCameraText}>Mengaktifkan kamera...</Text>
                    </View>
                  )}
                </View>

                <View style={styles.maskMiddleRow}>
                  <View style={styles.maskSide} />
                  <View style={styles.reticleBox}>
                    <View style={[styles.reticleCorner, styles.topLeft]} />
                    <View style={[styles.reticleCorner, styles.topRight]} />
                    <View style={[styles.reticleCorner, styles.bottomLeft]} />
                    <View style={[styles.reticleCorner, styles.bottomRight]} />
                    <View style={styles.scanLaser} />
                  </View>
                  <View style={styles.maskSide} />
                </View>

                <View style={styles.maskBottom}>
                  <View style={styles.instructionPill}>
                    <ScanQrCode size={16} color="#10B981" />
                    <Text style={styles.instructionPillText}>Arahkan kotak tepat ke QR Code</Text>
                  </View>
                  <Text style={styles.instructionSubtext}>
                    Data modul dan daftar siswa akan sinkron otomatis setelah terbaca
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        nestedScrollEnabled={true}
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
              {/* Notifikasi Sinkronisasi Berhasil */}
              {syncNotice && (
                <View style={styles.syncNoticeBanner}>
                  <Sparkles size={16} color="#047857" strokeWidth={2.4} />
                  <Text style={styles.syncNoticeText}>{syncNotice}</Text>
                </View>
              )}

              {/* 1. FITUR SCAN / PINDAI QR CODE SOAL (DI PALING ATAS) */}
              {!isQrSynced ? (
                <View style={styles.qrScanCard}>
                  <View style={styles.qrScanTopRow}>
                    <View style={styles.qrScanIconBox}>
                      <QrCode size={22} color="#059669" strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.qrScanTitle}>Pindai QR Code Soal</Text>
                      <Text style={styles.qrScanSubtitle}>
                        Arahkan kamera ke QR Code di layar proyektor atau lembar ujian untuk sinkronisasi kelas &amp; daftar nama otomatis.
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.qrScanBtn}
                    onPress={handleOpenScanner}
                    activeOpacity={0.85}
                  >
                    <ScanQrCode size={18} color="#ffffff" strokeWidth={2.4} />
                    <Text style={styles.qrScanBtnText}>Buka Kamera Pindai QR</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.qrSyncedBanner}>
                  <View style={styles.qrSyncedTop}>
                    <View style={styles.qrSyncedCheck}>
                      <Check size={16} color="#ffffff" strokeWidth={3} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.qrSyncedLabelRow}>
                        <Text style={styles.qrSyncedLabel}>MODUL &amp; KELAS TERSINKRONISASI</Text>
                        {className ? (
                          <View style={styles.qrClassBadge}>
                            <Text style={styles.qrClassBadgeText}>{className}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.qrSyncedTitle} numberOfLines={1}>
                        {syncedExamTitle || 'Paket Ujian Aktif'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.qrRescanBtn}
                    onPress={handleOpenScanner}
                    activeOpacity={0.8}
                  >
                    <ScanQrCode size={13} color="#047857" strokeWidth={2.4} />
                    <Text style={styles.qrRescanBtnText}>Pindai Ulang</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 2. NAMA LENGKAP SISWA (DENGAN AUTOCOMPLETE DROPDOWN) */}
              <View style={[styles.inputGroup, { zIndex: 100 }]}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      focusedField === 'name' && styles.labelFocusedStudent,
                    ]}
                  >
                    Nama Lengkap Siswa
                  </Text>
                  {isRosterSelected ? (
                    <View style={styles.verifiedBadge}>
                      <Check size={11} color="#059669" strokeWidth={3} />
                      <Text style={styles.verifiedBadgeText}>Terdaftar</Text>
                    </View>
                  ) : classRoster.length > 0 ? (
                    <Text style={styles.labelHint}>
                      {classRoster.length} siswa siap dipilih
                    </Text>
                  ) : null}
                </View>
                <View style={styles.nameInputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.nameInput,
                      focusedField === 'name' && styles.inputFocusedStudent,
                      isRosterSelected && styles.inputSelectedSuccess,
                    ]}
                    value={name}
                    onChangeText={handleNameInputChange}
                    onFocus={() => {
                      handleFocusField('name');
                      if (classRoster.length > 0 && !isRosterSelected) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    onBlur={() => {
                      setFocusedField(null);
                      setName(formatPersonName(name).trim());
                    }}
                    placeholder={
                      classRoster.length > 0
                        ? "Ketik atau pilih nama siswa..."
                        : "Nama lengkap sesuai daftar hadir"
                    }
                    placeholderTextColor={colors.textSubtle}
                    autoCorrect={false}
                    spellCheck={false}
                    autoCapitalize="words"
                  />
                  {classRoster.length > 0 && (
                    <TouchableOpacity
                      style={styles.dropdownToggleBtn}
                      onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                      activeOpacity={0.7}
                    >
                      {isDropdownOpen ? (
                        <ChevronUp size={18} color="#059669" strokeWidth={2.4} />
                      ) : (
                        <ChevronDown size={18} color={colors.textMuted} strokeWidth={2.4} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Dropdown Menu Autocomplete */}
                {isDropdownOpen && filteredRoster.length > 0 && (
                  <View style={styles.dropdownContainer}>
                    <View style={styles.dropdownHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Users size={13} color="#065F46" strokeWidth={2.4} />
                        <Text style={styles.dropdownHeaderText}>
                          PILIH SISWA KELAS ({filteredRoster.length})
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setIsDropdownOpen(false)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={14} color="#047857" strokeWidth={2.4} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      style={styles.dropdownScroll}
                      nestedScrollEnabled={true}
                      showsVerticalScrollIndicator={true}
                      persistentScrollbar={true}
                      keyboardShouldPersistTaps="always"
                    >
                      {filteredRoster.map((student, idx) => (
                        <TouchableOpacity
                          key={student.id || student.nisn || `std-${idx}`}
                          style={[
                            styles.dropdownItem,
                            idx === filteredRoster.length - 1 && styles.dropdownItemLast,
                          ]}
                          onPress={() => handleSelectRosterStudent(student)}
                          activeOpacity={0.7}
                          delayPressIn={0}
                        >
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={styles.dropdownItemName}>{student.studentName}</Text>
                            <Text style={styles.dropdownItemNisn}>
                              NISN: {student.nisn} • {student.className}
                            </Text>
                          </View>
                          <View style={styles.dropdownItemBadge}>
                            <Text style={styles.dropdownItemBadgeText}>Pilih</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* 3. NISN PESERTA DIDIK (DITUKAR DI BAWAH NAMA: OTOMATIS TERISI & TERKUNCI) */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      focusedField === 'nisn' && styles.labelFocusedStudent,
                    ]}
                  >
                    NISN Peserta Didik
                  </Text>
                  {isRosterSelected && (
                    <View style={styles.autoFilledBadge}>
                      <Text style={styles.autoFilledBadgeText}>Otomatis Terisi &amp; Terkunci</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'nisn' && styles.inputFocusedStudent,
                    isRosterSelected && styles.inputLocked,
                  ]}
                  value={nisn}
                  onChangeText={(txt) => setNisn(txt.replace(/[^0-9]/g, ''))}
                  onFocus={() => handleFocusField('nisn')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="10 digit nomor NISN"
                  placeholderTextColor={colors.textSubtle}
                  keyboardType="number-pad"
                  maxLength={10}
                  autoCorrect={false}
                  spellCheck={false}
                  editable={!isRosterSelected}
                />
              </View>

              {/* 4. KELAS / ROMBONGAN BELAJAR */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      focusedField === 'className' && styles.labelFocusedStudent,
                    ]}
                  >
                    Kelas / Rombongan Belajar
                  </Text>
                  {(isQrSynced || isRosterSelected) && (
                    <View style={styles.autoFilledBadge}>
                      <Text style={styles.autoFilledBadgeText}>Terverifikasi</Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'className' && styles.inputFocusedStudent,
                    (isQrSynced || isRosterSelected) && styles.inputLocked,
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
                  editable={!isQrSynced && !isRosterSelected}
                />
              </View>

              {/* 5. TOKEN PIN UJIAN (6 DIGIT) - DIBERIKAN PENGAWAS SAAT UJIAN DIMULAI */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[
                      styles.label,
                      focusedField === 'token' && styles.labelFocusedStudent,
                    ]}
                  >
                    Token PIN Ujian (6 Digit)
                  </Text>
                  <View style={styles.proctorTokenBadge}>
                    <Text style={styles.proctorTokenBadgeText}>Diberikan Pengawas</Text>
                  </View>
                </View>
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
                <Text style={styles.helperText}>
                  * Masukkan PIN token yang diberikan oleh pengawas saat ujian dimulai.
                </Text>
              </View>

              {/* 6. TOMBOL KONFIRMASI MASUK UJIAN */}
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

  /* QR Code Scan & Synced Banner Styles */
  syncNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    marginBottom: 14,
  },
  syncNoticeText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: '#065F46',
    flex: 1,
    lineHeight: 16,
  },
  qrScanCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    borderBottomWidth: 4,
    borderBottomColor: '#6EE7B7',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...clayShadows.badge,
  },
  qrScanTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  qrScanIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  qrScanTitle: {
    fontFamily: typography.extraBold,
    fontSize: 14,
    color: '#065F46',
  },
  qrScanSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: '#047857',
    lineHeight: 15,
    marginTop: 2,
  },
  qrScanBtn: {
    backgroundColor: '#059669',
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#34D399',
    borderBottomWidth: 3.5,
    borderBottomColor: '#047857',
  },
  qrScanBtnText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#ffffff',
  },
  qrSyncedBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#6EE7B7',
    borderBottomWidth: 3.5,
    borderBottomColor: '#34D399',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  qrSyncedTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qrSyncedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrSyncedLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrSyncedLabel: {
    fontFamily: typography.extraBold,
    fontSize: 10,
    color: '#047857',
    letterSpacing: 0.5,
  },
  qrClassBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  qrClassBadgeText: {
    fontFamily: typography.extraBold,
    fontSize: 10,
    color: '#065F46',
  },
  qrSyncedTitle: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#064E3B',
    marginTop: 2,
  },
  qrRescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  qrRescanBtnText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#047857',
    textDecorationLine: 'underline',
  },

  /* Input Labels & Badges */
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelHint: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: '#059669',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifiedBadgeText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: '#065F46',
  },
  autoFilledBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  autoFilledBadgeText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: '#0369A1',
  },
  proctorTokenBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  proctorTokenBadgeText: {
    fontFamily: typography.bold,
    fontSize: 10.5,
    color: '#B45309',
  },

  /* Autocomplete Dropdown Styles */
  nameInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  nameInput: {
    paddingRight: 42,
  },
  inputSelectedSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#34D399',
    borderBottomColor: '#059669',
  },
  dropdownToggleBtn: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  dropdownContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#6EE7B7',
    borderRadius: 14,
    maxHeight: 280,
    overflow: 'hidden',
    ...clayShadows.cardHover,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dropdownHeaderText: {
    fontFamily: typography.extraBold,
    fontSize: 11,
    color: '#065F46',
    letterSpacing: 0.5,
  },
  dropdownScroll: {
    maxHeight: 230,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemName: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  dropdownItemNisn: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  dropdownItemBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dropdownItemBadgeText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#065F46',
  },
  inputLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderBottomColor: '#CBD5E1',
    color: '#475569',
  },
  helperText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },

  /* Full-Screen Real Camera Scanner Styles */
  scannerDedicatedScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },
  cameraView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scannerFullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    elevation: 99999,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    backgroundColor: '#0F172A',
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    zIndex: 10,
  },
  scannerHeaderTitle: {
    fontFamily: typography.extraBold,
    fontSize: 17,
    color: '#ffffff',
  },
  scannerHeaderSubtitle: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: '#94A3B8',
    marginTop: 2,
  },
  scannerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scannerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerIconBtnActive: {
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FBBF24',
  },

  /* Camera Frame & Native Surface */
  cameraFrame: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },

  /* Viewfinder Cutout Mask */
  maskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  maskTop: {
    width: '100%',
    flex: 1,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCameraBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loadingCameraBadgeText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: '#94A3B8',
  },
  loadingCameraText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: '#10B981',
  },
  maskMiddleRow: {
    flexDirection: 'row',
    width: '100%',
    height: 260,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  reticleBox: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  scanLaser: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    height: 2,
    backgroundColor: '#10B981',
    opacity: 0.75,
    borderRadius: 1,
  },
  reticleCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#10B981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4.5,
    borderLeftWidth: 4.5,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4.5,
    borderRightWidth: 4.5,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4.5,
    borderLeftWidth: 4.5,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4.5,
    borderRightWidth: 4.5,
    borderBottomRightRadius: 12,
  },
  maskBottom: {
    width: '100%',
    flex: 1.4,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  instructionPillText: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: '#F8FAFC',
  },
  instructionSubtext: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Camera Permission Screen */
  permissionScreen: {
    flex: 1,
    backgroundColor: '#090D16',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontFamily: typography.extraBold,
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionDesc: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
  },
  permissionBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionBtnText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  permissionSecondaryBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionSecondaryBtnText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#E2E8F0',
  },
  permissionCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  permissionCancelBtnText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: '#94A3B8',
  },
});
