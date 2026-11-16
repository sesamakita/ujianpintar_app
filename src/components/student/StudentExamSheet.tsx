import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Vibration,
  Platform,
  BackHandler,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Clock,
  Grid,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  BellRing,
  XCircle,
} from 'lucide-react-native';
import type { ExamSettings, Question } from '../../types/exam';
import { MathRenderer } from '../common/MathRenderer';
import { QuestionGridModal } from './QuestionGridModal';
import { useCountdown } from '../../hooks/useCountdown';
import { useAntiCheat } from '../../hooks/useAntiCheat';
import { useExamHeartbeat } from '../../hooks/useExamHeartbeat';
import { storage } from '../../lib/storage';
import { examService } from '../../services/examService';
import { typography, colors, radii, shadows, clayColors, clayShadows, clayRadii } from '../../theme';
import { CustomModal } from '../common/CustomModal';

interface StudentExamSheetProps {
  exam: ExamSettings;
  questions: Question[];
  studentName: string;
  nisn: string;
  className: string;
  sessionId?: string;
  onSubmitExam: (answers: {
    selectedAnswers: Record<number, string>;
    shortAnswers: Record<number, string>;
    doubtAnswers: Record<number, boolean>;
    violationCount: number;
  }) => void;
}

export const StudentExamSheet: React.FC<StudentExamSheetProps> = ({
  exam,
  questions,
  studentName,
  nisn,
  className,
  sessionId,
  onSubmitExam,
}) => {
  // 1. Keep Screen Awake: Screen will NEVER sleep or timeout during the exam
  useKeepAwake();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [doubtAnswers, setDoubtAnswers] = useState<Record<number, boolean>>({});
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isTimeUpModalOpen, setIsTimeUpModalOpen] = useState(false);
  const [activeTeacherWarning, setActiveTeacherWarning] = useState<{
    message: string;
    timestamp: string;
  } | null>(null);

  // 2. Hardware / Gesture Back Button Guard: Prevent accidental exit
  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        'Ujian Sedang Berlangsung',
        'Anda tidak dapat keluar langsung dari lembar ujian. Silakan selesaikan seluruh soal lalu klik tombol Selesai Ujian.',
        [{ text: 'Lanjutkan Ujian', style: 'cancel' }]
      );
      return true; // block default back action
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // Restore cached answers per student NISN
  useEffect(() => {
    const loadCachedAnswers = async () => {
      const cleanNisn = (nisn || '').trim();
      const cachedSelected = await storage.getItem<Record<number, string>>(`ans_sel_${exam.id}_${cleanNisn}`, {});
      const cachedShort = await storage.getItem<Record<number, string>>(`ans_short_${exam.id}_${cleanNisn}`, {});
      const cachedDoubt = await storage.getItem<Record<number, boolean>>(`ans_doubt_${exam.id}_${cleanNisn}`, {});
      
      setSelectedAnswers(cachedSelected || {});
      setShortAnswers(cachedShort || {});
      setDoubtAnswers(cachedDoubt || {});
    };
    loadCachedAnswers();
  }, [exam.id, nisn]);

  // Anti-Cheat Hook
  const { violationCount, lastWarning, clearLastWarning } = useAntiCheat({
    enabled: exam.antiCheat?.detectTabSwitch ?? true,
    examId: exam.id,
    sessionId,
    studentName,
    studentNisn: nisn,
  });

  // Countdown Hook with Persistence against app reload/crash
  const [initialCountdownSeconds, setInitialCountdownSeconds] = useState<number>(exam.durationMinutes * 60);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(null);

  useEffect(() => {
    const initTimer = async () => {
      const cleanNisn = (nisn || '').trim();
      const endTimeKey = `cbt_exam_end_time_${exam.id}_${cleanNisn}`;
      const savedEndTime = await storage.getItem<number>(endTimeKey);
      const now = Date.now();

      const maxDurationSec = (exam.durationMinutes || 60) * 60;
      if (savedEndTime && savedEndTime > now) {
        const remaining = Math.max(1, Math.round((savedEndTime - now) / 1000));
        setInitialCountdownSeconds(Math.min(remaining, maxDurationSec));
        setTargetEndTime(savedEndTime);
      } else {
        const targetEnd = now + maxDurationSec * 1000;
        await storage.setItem(endTimeKey, targetEnd);
        setInitialCountdownSeconds(maxDurationSec);
        setTargetEndTime(targetEnd);
      }
    };
    initTimer();
  }, [exam.id, exam.durationMinutes, nisn]);

  const { formattedTime, isUrgent, addTime, recalibrate } = useCountdown({
    initialSeconds: initialCountdownSeconds,
    targetEndTime: targetEndTime || undefined,
    isRunning: true,
    onTimeUp: () => {
      setIsTimeUpModalOpen(true);
    },
  });

  // Re-sync timer with absolute wall-clock on returning from background
  useEffect(() => {
    const cleanNisn = (nisn || '').trim();
    const endTimeKey = `cbt_exam_end_time_${exam.id}_${cleanNisn}`;

    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const savedEndTime = await storage.getItem<number>(endTimeKey);
        if (savedEndTime && savedEndTime > 0) {
          recalibrate(savedEndTime);
        }
      }
    });

    return () => sub.remove();
  }, [exam.id, nisn, recalibrate]);

  const scrollViewRef = useRef<ScrollView>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState<boolean>(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);
  const isInputFocusedRef = useRef<boolean>(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setIsKeyboardOpen(true);
        if (isInputFocusedRef.current) {
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 60);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardOpen(false);
        isInputFocusedRef.current = false;
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    Keyboard.dismiss();
    isInputFocusedRef.current = false;
    setIsInputFocused(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentIndex]);

  // Keep a ref to the latest answers so realtime/polling callbacks can always
  // submit the most recent state (avoid stale closures).
  const answersRef = useRef<{
    selectedAnswers: Record<number, string>;
    shortAnswers: Record<number, string>;
    doubtAnswers: Record<number, boolean>;
    violationCount: number;
  }>({
    selectedAnswers: {},
    shortAnswers: {},
    doubtAnswers: {},
    violationCount: 0,
  });
  answersRef.current = {
    selectedAnswers,
    shortAnswers,
    doubtAnswers,
    violationCount,
  };

  const handleForceSubmit = () => {
    const cleanNisn = (nisn || '').trim();
    storage.removeItem(`cbt_exam_end_time_${exam.id}_${cleanNisn}`).catch(() => {});
    const latest = answersRef.current;
    onSubmitExam({
      selectedAnswers: latest.selectedAnswers,
      shortAnswers: latest.shortAnswers,
      doubtAnswers: latest.doubtAnswers,
      violationCount: latest.violationCount,
    });
  };

  // 3. Unified Single Heartbeat & Command Bus (Rock Solid against network drops)
  const answeredCount = Object.keys(selectedAnswers).length + Object.keys(shortAnswers).length;
  useExamHeartbeat({
    examId: exam.id,
    nisn: nisn || '',
    answeredCount,
    onWarning: (alert) => {
      setActiveTeacherWarning({
        message: alert.message,
        timestamp: alert.timestamp,
      });
    },
    onTimeAdded: (addedMinutes) => {
      const cleanNisn = (nisn || '').trim();
      addTime(addedMinutes * 60);
      const endTimeKey = `cbt_exam_end_time_${exam.id}_${cleanNisn}`;
      storage.getItem<number>(endTimeKey).then((saved) => {
        const currentTarget = saved && saved > Date.now() ? saved : Date.now();
        storage.setItem(endTimeKey, currentTarget + addedMinutes * 60 * 1000);
      });
    },
    onForceSubmit: handleForceSubmit,
  });

  const handleSelectOption = async (optionId: string) => {
    const cleanNisn = (nisn || '').trim();
    const updated = { ...selectedAnswers, [currentIndex]: optionId };
    setSelectedAnswers(updated);
    await storage.saveItem(`ans_sel_${exam.id}_${cleanNisn}`, updated);

    if (currentQuestion) {
      if (sessionId) {
        examService.saveStudentAnswer({
          sessionId,
          questionId: currentQuestion.id,
          selectedOptionId: optionId,
          isDoubt: !!doubtAnswers[currentIndex],
        });
        const answeredIndices = new Set([
          ...Object.keys(updated),
          ...Object.entries(shortAnswers).filter(([_, v]) => v && v.trim().length > 0).map(([k]) => k)
        ]);
        examService.updateStudentProgress(sessionId, answeredIndices.size, nisn);
      }
    }
  };

  const handleShortAnswerChange = async (text: string) => {
    const cleanNisn = (nisn || '').trim();
    const updated = { ...shortAnswers, [currentIndex]: text };
    setShortAnswers(updated);
    await storage.saveItem(`ans_short_${exam.id}_${cleanNisn}`, updated);

    if (currentQuestion) {
      if (sessionId) {
        examService.saveStudentAnswer({
          sessionId,
          questionId: currentQuestion.id,
          answerText: text,
          isDoubt: !!doubtAnswers[currentIndex],
        });
        const answeredIndices = new Set([
          ...Object.keys(selectedAnswers),
          ...Object.entries(updated).filter(([_, v]) => v && v.trim().length > 0).map(([k]) => k)
        ]);
        examService.updateStudentProgress(sessionId, answeredIndices.size, nisn);
      }
    }
  };

  const toggleDoubt = async () => {
    const cleanNisn = (nisn || '').trim();
    const updated = { ...doubtAnswers, [currentIndex]: !doubtAnswers[currentIndex] };
    setDoubtAnswers(updated);
    await storage.saveItem(`ans_doubt_${exam.id}_${cleanNisn}`, updated);
  };

  const handleConfirmSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const submitModalMessage =
    unansweredCount > 0
      ? `Perhatian: Masih ada ${unansweredCount} butir soal yang belum dijawab. Apakah Anda yakin ingin mengumpulkan lembar jawaban sekarang?`
      : 'Apakah Anda yakin telah selesai dan ingin mengumpulkan seluruh lembar jawaban ujian?';

  const insets = useSafeAreaInsets();
  const topPadding = (insets.top > 0 ? insets.top : (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 16)) + 8;

  const currentQuestion = questions[currentIndex] || questions[0];
  const isDoubt = !!doubtAnswers[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === questions.length - 1;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <View>
          <Text style={styles.qNumText}>
            Soal {currentIndex + 1} <Text style={styles.qTotalText}>/ {questions.length}</Text>
          </Text>
          <Text style={styles.subjectText}>{exam.subject}</Text>
        </View>

        <View style={styles.headerRight}>
          {/* Live Timer Pill */}
          <View style={[styles.timerPill, isUrgent && styles.timerPillUrgent]}>
            <Clock size={14} color={isUrgent ? '#ffffff' : colors.primary} />
            <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
              {formattedTime}
            </Text>
          </View>

          {/* Grid Button */}
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => {
              Keyboard.dismiss();
              setIsGridModalOpen(true);
            }}
            activeOpacity={0.7}
          >
            <Grid size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Integrity Banner */}
      <View style={styles.integrityBar}>
        <View style={styles.greenDot} />
        <Text style={styles.integrityText}>Mode Layar Penuh • Anti-Cheat Aktif</Text>
      </View>

      {/* Violation Alert Toast */}
      {lastWarning && (
        <TouchableOpacity style={styles.warningToast} onPress={clearLastWarning} activeOpacity={0.9}>
          <AlertTriangle size={15} color="#ffffff" />
          <Text style={styles.warningToastText}>{lastWarning}</Text>
        </TouchableOpacity>
      )}

      {/* Question Content */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: isKeyboardOpen ? 130 : 28 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Question Card Box */}
        <View style={styles.questionCard}>
          <MathRenderer
            text={currentQuestion?.questionText || 'Pertanyaan tidak tersedia.'}
            fontSize={16}
            color={colors.textPrimary}
            fontWeight="600"
          />

          {/* KaTeX Math Formula */}
          {currentQuestion?.latexFormula ? (
            <View style={styles.mathContainer}>
              <MathRenderer math={currentQuestion.latexFormula} block fontSize={18} />
            </View>
          ) : null}

          {/* Question Image Attachment */}
          {currentQuestion?.imageUrl ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: currentQuestion.imageUrl }}
                style={styles.questionImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>

        {/* 1. Multiple Choice Options */}
        {(currentQuestion?.type === 'multiple_choice' || (!currentQuestion?.type && currentQuestion?.options?.length > 0)) && (
          <View style={styles.optionsList}>
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedAnswers[currentIndex] === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  onPress={() => handleSelectOption(opt.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optLabelBox, isSelected && styles.optLabelBoxSelected]}>
                    <Text style={[styles.optLabelText, isSelected && styles.optLabelTextSelected]}>
                      {opt.label}
                    </Text>
                  </View>
                  <View style={styles.optContent}>
                    <MathRenderer
                      key={`opt-math-${currentQuestion.id}-${opt.id}`}
                      text={opt.text || `Pilihan ${opt.label}`}
                      fontSize={16.5}
                      color={isSelected ? colors.primaryDark : colors.textPrimary}
                      fontWeight={isSelected ? '700' : '600'}
                      isOption
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 2. Benar / Salah (True / False) */}
        {currentQuestion?.type === 'true_false' && (() => {
          const rawOptions = Array.isArray(currentQuestion.options) ? currentQuestion.options : [];

          // 1. Identify which option represents Benar (True) vs Salah (False)
          const optTrue = rawOptions.find(
            (o) =>
              /^(b|benar|true|t|ya|yes)$/i.test((o.label || '').trim()) ||
              /^(benar|true|ya|yes)/i.test((o.text || '').trim()) ||
              (o.id && (o.id.endsWith('-t') || o.id.endsWith('_true') || o.id === 'true'))
          );

          const optFalse = rawOptions.find(
            (o) =>
              /^(s|salah|false|f|tidak|no)$/i.test((o.label || '').trim()) ||
              /^(salah|false|tidak|no)/i.test((o.text || '').trim()) ||
              (o.id && (o.id.endsWith('-f') || o.id.endsWith('_false') || o.id === 'false'))
          );

          // 2. Positional fallback to guarantee valid QuestionOption objects
          const trueChoice = optTrue || (rawOptions[0] && rawOptions[0].id !== optFalse?.id ? rawOptions[0] : { id: `opt-${currentQuestion.id}-t`, label: 'Benar', text: 'Benar' });
          let falseChoice = optFalse || (rawOptions[1] && rawOptions[1].id !== trueChoice.id ? rawOptions[1] : (rawOptions[0] && rawOptions[0].id !== trueChoice.id ? rawOptions[0] : { id: `opt-${currentQuestion.id}-f`, label: 'Salah', text: 'Salah' }));

          // 3. Absolute safety guarantee: trueChoice and falseChoice must never share the same ID
          if (trueChoice.id === falseChoice.id) {
            falseChoice = {
              id: `${trueChoice.id}_f`,
              label: 'Salah',
              text: 'Salah',
            };
          }

          const isTrueSelected = selectedAnswers[currentIndex] === trueChoice.id;
          const isFalseSelected = selectedAnswers[currentIndex] === falseChoice.id;

          return (
            <View style={styles.tfContainer}>
              <Text style={styles.sectionHeading}>Pilih Pernyataan:</Text>
              <View style={styles.tfRow}>
                {/* Option Benar */}
                <TouchableOpacity
                  key="tf-true"
                  style={[styles.tfCard, styles.tfCardTrue, isTrueSelected && styles.tfCardTrueSelected]}
                  onPress={() => handleSelectOption(trueChoice.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tfIconBox, styles.tfIconBoxTrue, isTrueSelected && styles.tfIconBoxTrueSelected]}>
                    <CheckCircle2 size={24} color={isTrueSelected ? '#ffffff' : '#059669'} />
                  </View>
                  <Text style={[styles.tfText, isTrueSelected && styles.tfTextTrueSelected]}>
                    BENAR
                  </Text>
                </TouchableOpacity>

                {/* Option Salah */}
                <TouchableOpacity
                  key="tf-false"
                  style={[styles.tfCard, styles.tfCardFalse, isFalseSelected && styles.tfCardFalseSelected]}
                  onPress={() => handleSelectOption(falseChoice.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.tfIconBox, styles.tfIconBoxFalse, isFalseSelected && styles.tfIconBoxFalseSelected]}>
                    <XCircle size={24} color={isFalseSelected ? '#ffffff' : '#DC2626'} />
                  </View>
                  <Text style={[styles.tfText, isFalseSelected && styles.tfTextFalseSelected]}>
                    SALAH
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        {/* 3. Short Answer Input */}
        {currentQuestion?.type === 'short_answer' && (
          <View style={styles.shortAnswerContainer}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.shortAnswerLabel}>Ketik Jawaban Singkat Anda:</Text>
              <Text style={styles.inputBadge}>Isian Singkat</Text>
            </View>
            <TextInput
              style={[styles.shortAnswerInput, isInputFocused && styles.inputFocused]}
              value={shortAnswers[currentIndex] || ''}
              onChangeText={handleShortAnswerChange}
              onFocus={() => {
                isInputFocusedRef.current = true;
                setIsInputFocused(true);
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 120);
              }}
              onBlur={() => {
                isInputFocusedRef.current = false;
                setIsInputFocused(false);
              }}
              placeholder="Ketik jawaban singkat di sini..."
              placeholderTextColor={colors.textSubtle}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
              keyboardType="default"
            />
          </View>
        )}

        {/* 4. Essay / Uraian Input */}
        {currentQuestion?.type === 'essay' && (
          <View style={styles.essayContainer}>
            <View style={styles.inputHeaderRow}>
              <Text style={styles.shortAnswerLabel}>Lembar Jawaban Uraian / Esai:</Text>
              <Text style={[styles.inputBadge, { backgroundColor: '#F3E8FF', color: '#7E22CE' }]}>Soal Uraian</Text>
            </View>
            <TextInput
              style={[styles.essayInput, isInputFocused && styles.inputFocused]}
              value={shortAnswers[currentIndex] || ''}
              onChangeText={handleShortAnswerChange}
              onFocus={() => {
                isInputFocusedRef.current = true;
                setIsInputFocused(true);
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 120);
              }}
              onBlur={() => {
                isInputFocusedRef.current = false;
                setIsInputFocused(false);
              }}
              placeholder="Tuliskan jawaban uraian/esai lengkap Anda di sini..."
              placeholderTextColor={colors.textSubtle}
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
              autoCorrect={false}
              spellCheck={false}
              keyboardType="default"
            />
            <View style={styles.essayFooterRow}>
              <Text style={styles.essayHint}>
                Jawaban uraian akan diperiksa dan dinilai oleh guru pengawas.
              </Text>
              <Text style={styles.charCount}>
                {(shortAnswers[currentIndex] || '').length} karakter
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Navigation */}
      <View style={styles.footer}>
        {/* Prev Button */}
        <TouchableOpacity
          style={[styles.navBtn, styles.prevBtn, isFirst && styles.btnDisabled]}
          disabled={isFirst}
          onPress={() => {
            Keyboard.dismiss();
            setCurrentIndex((prev) => Math.max(0, prev - 1));
          }}
          activeOpacity={0.75}
        >
          <ArrowLeft size={16} color={isFirst ? colors.textSubtle : colors.textPrimary} />
          <Text style={[styles.prevBtnText, isFirst && styles.textDisabled]}>Sebelumnya</Text>
        </TouchableOpacity>

        {/* Doubt Toggle */}
        <TouchableOpacity
          style={[styles.doubtBtn, isDoubt && styles.doubtBtnActive]}
          onPress={() => {
            Keyboard.dismiss();
            toggleDoubt();
          }}
          activeOpacity={0.75}
        >
          <Bookmark size={15} color={isDoubt ? '#ffffff' : colors.warning} fill={isDoubt ? '#ffffff' : 'none'} />
          <Text style={[styles.doubtBtnText, isDoubt && styles.doubtBtnTextActive]}>
            {isDoubt ? 'Ragu-Ragu' : 'Ragu'}
          </Text>
        </TouchableOpacity>

        {/* Next or Submit Button */}
        {isLast ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.submitBtn]}
            onPress={() => {
              Keyboard.dismiss();
              handleConfirmSubmit();
            }}
            activeOpacity={0.85}
          >
            <Check size={16} color="#ffffff" strokeWidth={2.8} />
            <Text style={styles.submitBtnText}>Kumpulkan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn]}
            onPress={() => {
              Keyboard.dismiss();
              setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Berikutnya</Text>
            <ArrowRight size={16} color="#ffffff" strokeWidth={2.4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Grid Modal */}
      <QuestionGridModal
        visible={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        questions={questions}
        currentIndex={currentIndex}
        selectedAnswers={selectedAnswers}
        shortAnswers={shortAnswers}
        doubtAnswers={doubtAnswers}
        onSelectIndex={(idx) => setCurrentIndex(idx)}
        onSubmitExam={handleConfirmSubmit}
      />

      {/* Custom Submit Confirmation Modal */}
      <CustomModal
        visible={isSubmitModalOpen}
        type={unansweredCount > 0 ? 'warning' : 'confirm'}
        title="Konfirmasi Pengumpulan"
        message={submitModalMessage}
        confirmText="Kumpulkan Sekarang"
        cancelText="Periksa Kembali"
        onConfirm={() => {
          setIsSubmitModalOpen(false);
          handleForceSubmit();
        }}
        onCancel={() => setIsSubmitModalOpen(false)}
      />

      {/* Custom Time-Up Modal */}
      <CustomModal
        visible={isTimeUpModalOpen}
        type="time"
        title="Waktu Ujian Berakhir"
        message="Waktu pengerjaan asesmen telah habis. Lembar jawaban Anda akan dikumpulkan dan dinilai secara otomatis."
        confirmText="Kumpulkan Lembar Jawaban"
        onConfirm={() => {
          setIsTimeUpModalOpen(false);
          handleForceSubmit();
        }}
      />

      {/* Real-time Teacher Warning Modal Popup */}
      <Modal
        visible={!!activeTeacherWarning}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.warningModalOverlay}>
          <View style={styles.warningModalCard}>
            <View style={styles.warningIconCircle}>
              <AlertTriangle size={34} color="#ffffff" strokeWidth={2.5} />
            </View>

            <Text style={styles.warningModalTitle}>PERINGATAN PENGAWAS</Text>

            <View style={styles.warningMsgBox}>
              <Text style={styles.warningMsgText}>
                {activeTeacherWarning?.message}
              </Text>
              <Text style={styles.warningTimeText}>
                Tercatat: {activeTeacherWarning?.timestamp}
              </Text>
            </View>

            <Text style={styles.warningSubText}>
              Peringatan ini tercatat resmi dalam riwayat pengawasan. Harap patuhi tata tertib pengerjaan ujian.
            </Text>

            <TouchableOpacity
              style={styles.ackWarningBtn}
              onPress={() => setActiveTeacherWarning(null)}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={16} color="#ffffff" />
              <Text style={styles.ackWarningBtnText}>Saya Mengerti & Lanjutkan Ujian</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: clayColors.canvas,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.badge,
  },
  qNumText: {
    fontFamily: typography.extraBold,
    fontSize: 16.5,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  qTotalText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  subjectText: {
    fontFamily: typography.bold,
    fontSize: 11.5,
    color: '#2563EB',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: clayRadii.badge,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#BFDBFE',
    ...clayShadows.badge,
  },
  timerPillUrgent: {
    backgroundColor: '#DC2626',
    borderBottomColor: '#991B1B',
  },
  timerText: {
    fontFamily: typography.extraBold,
    fontSize: 13.5,
    color: '#1D4ED8',
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: '#ffffff',
  },
  gridBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.badge,
  },
  integrityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#A7F3D0',
  },
  greenDot: {
    width: 6.5,
    height: 6.5,
    borderRadius: 3.5,
    backgroundColor: '#059669',
  },
  integrityText: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: '#065F46',
  },
  warningToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#991B1B',
    ...clayShadows.btnDanger,
  },
  warningToastText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: '#ffffff',
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    marginBottom: 16,
    width: '100%',
    alignSelf: 'stretch',
    ...clayShadows.cardHover,
  },
  questionText: {
    fontFamily: typography.semiBold,
    fontSize: 15.5,
    color: colors.textPrimary,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  mathContainer: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#CBD5E1',
    width: '100%',
  },
  imageContainer: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    width: '100%',
    overflow: 'hidden',
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
    gap: 12,
    ...clayShadows.card,
  },
  optionCardSelected: {
    backgroundColor: '#EFF6FF',
    borderWidth: 2.2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: '#3B82F6',
    ...clayShadows.btnPrimary,
  },
  optLabelBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
  },
  optLabelBoxSelected: {
    backgroundColor: '#2563EB',
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomColor: '#1D4ED8',
  },
  optLabelText: {
    fontFamily: typography.extraBold,
    fontSize: 14,
    color: colors.textSecondary,
    includeFontPadding: false,
    textAlign: 'center',
  },
  optLabelTextSelected: {
    color: '#ffffff',
  },
  optContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 32,
  },
  optText: {
    fontFamily: typography.medium,
    fontSize: 14.5,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 21,
  },
  optTextSelected: {
    fontFamily: typography.bold,
    color: '#1D4ED8',
  },
  sectionHeading: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: -0.1,
  },
  tfContainer: {
    width: '100%',
    marginBottom: 8,
  },
  tfRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  tfCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.card,
  },
  tfCardTrue: {
    borderColor: '#FFFFFF',
  },
  tfCardTrueSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderBottomColor: '#059669',
    ...clayShadows.btnStudent,
  },
  tfCardFalse: {
    borderColor: '#FFFFFF',
  },
  tfCardFalseSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderBottomColor: '#DC2626',
    ...clayShadows.btnDanger,
  },
  tfIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 2.5,
  },
  tfIconBoxTrue: {
    backgroundColor: '#D1FAE5',
    borderBottomColor: '#6EE7B7',
  },
  tfIconBoxTrueSelected: {
    backgroundColor: '#059669',
    borderColor: 'rgba(255,255,255,0.4)',
    borderBottomColor: '#047857',
  },
  tfIconBoxFalse: {
    backgroundColor: '#FEE2E2',
    borderBottomColor: '#FCA5A5',
  },
  tfIconBoxFalseSelected: {
    backgroundColor: '#DC2626',
    borderColor: 'rgba(255,255,255,0.4)',
    borderBottomColor: '#991B1B',
  },
  tfText: {
    fontFamily: typography.extraBold,
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  tfTextTrueSelected: {
    color: '#047857',
  },
  tfTextFalseSelected: {
    color: '#991B1B',
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inputBadge: {
    fontFamily: typography.bold,
    fontSize: 10,
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  shortAnswerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.cardHover,
  },
  shortAnswerLabel: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  shortAnswerInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    fontFamily: typography.medium,
    color: colors.textPrimary,
  },
  essayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    ...clayShadows.cardHover,
  },
  essayInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderBottomWidth: 3.5,
    borderBottomColor: '#CBD5E1',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    fontFamily: typography.medium,
    color: colors.textPrimary,
    minHeight: 140,
    lineHeight: 22,
  },
  inputFocused: {
    borderColor: '#3B82F6',
    borderBottomColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  essayFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  essayHint: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  charCount: {
    fontFamily: typography.bold,
    fontSize: 11,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 3,
    borderTopColor: clayColors.whiteBevel,
    gap: 10,
    ...clayShadows.cardHover,
  },
  navBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 18,
    gap: 6,
  },
  prevBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#CBD5E1',
    ...clayShadows.badge,
  },
  prevBtnText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.textPrimary,
    includeFontPadding: false,
  },
  nextBtn: {
    backgroundColor: clayColors.primaryBtnBg,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: clayColors.primaryBtnBorder,
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.primaryBtnBevel,
    ...clayShadows.btnPrimary,
  },
  nextBtnText: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: '#ffffff',
    includeFontPadding: false,
  },
  submitBtn: {
    backgroundColor: clayColors.studentBtnBg,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: clayColors.studentBtnBorder,
    borderBottomWidth: 4.5,
    borderBottomColor: clayColors.studentBtnBevel,
    ...clayShadows.btnStudent,
  },
  submitBtnText: {
    fontFamily: typography.bold,
    fontSize: 13.5,
    color: '#ffffff',
    includeFontPadding: false,
  },
  doubtBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFBEB',
    borderWidth: 1.8,
    borderColor: '#FFFFFF',
    borderBottomWidth: 4,
    borderBottomColor: '#FDE68A',
    gap: 6,
    ...clayShadows.badge,
  },
  doubtBtnActive: {
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 4.5,
    borderBottomColor: '#92400E',
  },
  doubtBtnText: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: '#92400E',
    includeFontPadding: false,
  },
  doubtBtnTextActive: {
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  textDisabled: {
    color: colors.textSubtle,
  },
  warningModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  warningModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 6,
    borderBottomColor: '#FDE68A',
    ...clayShadows.cardHover,
  },
  warningIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderBottomWidth: 4.5,
    borderBottomColor: '#92400E',
    ...clayShadows.iconPod,
  },
  warningModalTitle: {
    fontFamily: typography.extraBold,
    fontSize: 17,
    color: colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  warningMsgBox: {
    width: '100%',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 3,
    borderBottomColor: '#FDE68A',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    ...clayShadows.badge,
  },
  warningMsgText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    textAlign: 'center',
  },
  warningTimeText: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  warningSubText: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  ackWarningBtn: {
    width: '100%',
    height: 50,
    backgroundColor: clayColors.primaryBtnBg,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: clayColors.primaryBtnBorder,
    borderBottomWidth: 5,
    borderBottomColor: clayColors.primaryBtnBevel,
    ...clayShadows.btnPrimary,
  },
  ackWarningBtnText: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: '#ffffff',
    includeFontPadding: false,
  },
});
