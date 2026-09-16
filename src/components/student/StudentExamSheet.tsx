import React, { useState, useEffect } from 'react';
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
} from 'lucide-react-native';
import type { ExamSettings, Question } from '../../types/exam';
import { MathRenderer } from '../common/MathRenderer';
import { QuestionGridModal } from './QuestionGridModal';
import { useCountdown } from '../../hooks/useCountdown';
import { useAntiCheat } from '../../hooks/useAntiCheat';
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

  useEffect(() => {
    const initTimer = async () => {
      const cleanNisn = (nisn || '').trim();
      const endTimeKey = `cbt_exam_end_time_${exam.id}_${cleanNisn}`;
      const savedEndTime = await storage.getItem<number>(endTimeKey);
      const now = Date.now();

      if (savedEndTime && savedEndTime > now) {
        const remaining = Math.max(1, Math.round((savedEndTime - now) / 1000));
        setInitialCountdownSeconds(remaining);
      } else if (!savedEndTime) {
        const targetEnd = now + exam.durationMinutes * 60 * 1000;
        await storage.setItem(endTimeKey, targetEnd);
      }
    };
    initTimer();
  }, [exam.id, exam.durationMinutes, nisn]);

  const { formattedTime, isUrgent, addTime } = useCountdown({
    initialSeconds: initialCountdownSeconds,
    isRunning: true,
    onTimeUp: () => {
      setIsTimeUpModalOpen(true);
    },
  });

  // Real-Time Incoming Warnings & Commands from Teacher/Proctor
  useEffect(() => {
    if (!exam.id || !nisn) return;

    const cleanNisn = (nisn || '').trim();

    const unsubscribe = examService.subscribeToStudentAlerts(
      exam.id,
      cleanNisn,
      (alert) => {
        // Trigger Vibration alert on device
        try {
          Vibration.vibrate([0, 500, 200, 500]);
        } catch {}

        setActiveTeacherWarning({
          message: alert.message,
          timestamp: alert.timestamp,
        });
      },
      (addedMinutes) => {
        // Notification for global time added
        try {
          Vibration.vibrate(300);
          addTime(addedMinutes * 60);

          // Update persisted end time in local storage
          const endTimeKey = `cbt_exam_end_time_${exam.id}_${cleanNisn}`;
          storage.getItem<number>(endTimeKey).then((saved) => {
            const currentTarget = saved && saved > Date.now() ? saved : Date.now();
            storage.setItem(endTimeKey, currentTarget + addedMinutes * 60 * 1000);
          });
        } catch {}
      },
      () => {
        // Teacher force-submitted exam
        handleForceSubmit();
      }
    );

    // Redundant Polling Heartbeat: Check status every 3.5 seconds
    const pollInterval = setInterval(async () => {
      try {
        const status = await examService.getStudentSessionStatus(cleanNisn, exam.id);
        if (status === 'submitted' || status === 'violation_flagged') {
          clearInterval(pollInterval);
          handleForceSubmit();
        }
      } catch {}
    }, 3500);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(pollInterval);
    };
  }, [exam.id, nisn, addTime]);

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

  const handleForceSubmit = () => {
    const cleanNisn = (nisn || '').trim();
    storage.removeItem(`cbt_exam_end_time_${exam.id}_${cleanNisn}`).catch(() => {});
    onSubmitExam({
      selectedAnswers,
      shortAnswers,
      doubtAnswers,
      violationCount,
    });
  };

  const handleConfirmSubmit = () => {
    setIsSubmitModalOpen(true);
  };

  const answeredCount = Object.keys(selectedAnswers).length + Object.keys(shortAnswers).length;
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
    <View style={styles.container}>
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
            onPress={() => setIsGridModalOpen(true)}
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
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
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
        </View>

        {/* Options List */}
        {currentQuestion?.type === 'multiple_choice' && (
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

        {/* Short Answer Input */}
        {currentQuestion?.type === 'short_answer' && (
          <View style={styles.shortAnswerContainer}>
            <Text style={styles.shortAnswerLabel}>Ketik Jawaban Anda:</Text>
            <TextInput
              style={styles.shortAnswerInput}
              value={shortAnswers[currentIndex] || ''}
              onChangeText={handleShortAnswerChange}
              placeholder="Ketik jawaban di sini..."
              placeholderTextColor={colors.textSubtle}
              autoCorrect={false}
              spellCheck={false}
              autoCapitalize="none"
              keyboardType="default"
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Navigation */}
      <View style={styles.footer}>
        {/* Prev Button */}
        <TouchableOpacity
          style={[styles.navBtn, styles.prevBtn, isFirst && styles.btnDisabled]}
          disabled={isFirst}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          activeOpacity={0.75}
        >
          <ArrowLeft size={16} color={isFirst ? colors.textSubtle : colors.textPrimary} />
          <Text style={[styles.prevBtnText, isFirst && styles.textDisabled]}>Sebelumnya</Text>
        </TouchableOpacity>

        {/* Doubt Toggle */}
        <TouchableOpacity
          style={[styles.doubtBtn, isDoubt && styles.doubtBtnActive]}
          onPress={toggleDoubt}
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
            onPress={handleConfirmSubmit}
            activeOpacity={0.85}
          >
            <Check size={16} color="#ffffff" strokeWidth={2.8} />
            <Text style={styles.submitBtnText}>Kumpulkan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navBtn, styles.nextBtn]}
            onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
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
    </View>
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
  shortAnswerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    borderBottomWidth: 5,
    borderBottomColor: clayColors.whiteBevel,
    gap: 8,
    ...clayShadows.cardHover,
  },
  shortAnswerLabel: {
    fontFamily: typography.bold,
    fontSize: 12.5,
    color: colors.textSecondary,
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
    fontSize: 14,
    fontFamily: typography.medium,
    color: colors.textPrimary,
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
