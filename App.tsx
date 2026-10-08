import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator, Platform, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import type { ExamSettings, Question, GradeRecord } from './src/types/exam';
import { RoleSelectorModal } from './src/components/auth/RoleSelectorModal';
import { TeacherAuthModal } from './src/components/auth/TeacherAuthModal';
import { WelcomeScreen } from './src/components/welcome/WelcomeScreen';
import { StudentQuickEntry } from './src/components/auth/StudentQuickEntry';
import { StudentLobby } from './src/components/student/StudentLobby';
import { StudentExamSheet } from './src/components/student/StudentExamSheet';
import { StudentResultView } from './src/components/student/StudentResultView';
import { TeacherProctoringView } from './src/components/teacher/TeacherProctoringView';
import { TeacherGradeReportView } from './src/components/teacher/TeacherGradeReportView';
import { ScoringEngine } from './src/services/scoringEngine';
import { examService } from './src/services/examService';
import { storage } from './src/lib/storage';
import type { TeacherUser } from './src/services/authService';
import { colors, clayColors, typography } from './src/theme';
import { checkAppUpdate, CURRENT_APP_VERSION } from './src/services/updateService';
import type { AppUpdateInfo } from './src/services/updateService';
import { UpdateAppModal } from './src/components/common/UpdateAppModal';
import { CustomModal } from './src/components/common/CustomModal';

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Gate that blocks the Lobby ("SESI UJIAN SIAP") when the teacher has already
 * force-submitted / locked the exam for this student. Without it, a student who
 * returns to the Lobby keeps sitting there unaware that the exam is closed.
 */
const JoinSessionGate: React.FC<{
  exam: ExamSettings;
  nisn: string;
  studentName: string;
  className: string;
  onAlreadySubmitted?: (grade?: GradeRecord) => void;
  children: React.ReactNode;
}> = ({ exam, nisn, studentName, className, onAlreadySubmitted, children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let done = false;
    const check = async () => {
      try {
        const access = await examService.checkStudentSessionAccess(exam.id, nisn, studentName, className);
        if (cancelled) return;
        setBlocked(!access.allowed && access.reason === 'submitted');
        if (!access.allowed && access.reason === 'submitted') {
          if (onAlreadySubmitted && !done) {
            done = true;
            onAlreadySubmitted();
          }
          return;
        }
        setIsChecking(false);
      } catch {
        if (!cancelled) setIsChecking(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [exam.id, nisn, studentName, className]);

  if (isChecking) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.centerBoxText}>Memeriksa status sesi...</Text>
      </View>
    );
  }

  if (blocked) return null;
  return <>{children}</>;
};

export default function App() {
  // Load Plus Jakarta Sans Google Fonts
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  // Splash Screen Display Timer (3 Seconds)
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Application Modes
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher'>('student');
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isTeacherAuthOpen, setIsTeacherAuthOpen] = useState(false);
  const [teacherUser, setTeacherUser] = useState<TeacherUser | null>(null);

  // Student State Flow (0: Welcome/Feature Overview, 1: QuickEntry, 2: Lobby, 3: ExamSheet, 4: Result)
  const [studentStep, setStudentStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [studentInfo, setStudentInfo] = useState({
    name: 'Budi Santoso',
    nisn: '0082391024',
    className: 'Kelas X - 1',
  });
  const [sessionId, setSessionId] = useState<string>(() => generateUUID());

  // Teacher Tab Flow
  const [teacherTab, setTeacherTab] = useState<'proctoring' | 'grades'>('proctoring');

  // Active Exam & Questions
  const [activeExam, setActiveExam] = useState<ExamSettings>({
    id: 'exam-default-01',
    title: 'Penilaian Sumatif Akhir Semester (CBT)',
    subject: 'Matematika Wajib',
    gradeLevel: 'Kelas X (Fase E)',
    durationMinutes: 45,
    scheduleDate: new Date().toISOString().split('T')[0],
    scheduleTime: '08:00',
    token: '123456',
    antiCheat: {
      detectTabSwitch: true,
      fullScreenLock: true,
      shuffleQuestions: true,
      shuffleOptions: true,
    },
  });

  // Submission Results & Offline Sync
  const [finalGrade, setFinalGrade] = useState<GradeRecord | null>(null);
  const [integritySeal, setIntegritySeal] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing'>('synced');
  const [pendingSyncData, setPendingSyncData] = useState<{
    record: GradeRecord;
    examId: string;
    sessionId: string;
  } | null>(null);

  // In-App Update Checker State
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [isUpdateModalVisible, setIsUpdateModalVisible] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const handleCheckUpdate = async (isManual = false) => {
    if (isCheckingUpdate) return;
    setIsCheckingUpdate(true);
    try {
      const result = await checkAppUpdate();
      if (result.updateInfo && result.updateInfo.hasUpdate) {
        setUpdateInfo(result.updateInfo);
        setIsUpdateModalVisible(true);
      } else if (isManual) {
        if (result.error) {
          setFeedbackModal({
            visible: true,
            type: 'warning',
            title: 'Koneksi Terkendala',
            message: 'Tidak dapat memeriksa pembaruan saat ini. Pastikan HP terhubung ke internet.',
          });
        } else {
          setFeedbackModal({
            visible: true,
            type: 'success',
            title: 'Aplikasi Terkini',
            message: `Aplikasi Anda sudah dalam versi terbaru (v${CURRENT_APP_VERSION.version} Build ${CURRENT_APP_VERSION.versionCode}). Belum ada pembaruan baru.`,
          });
        }
      }
    } catch (_err) {
      if (isManual) {
        setFeedbackModal({
          visible: true,
          type: 'warning',
          title: 'Gagal Memeriksa',
          message: 'Terjadi kesalahan saat memeriksa pembaruan aplikasi.',
        });
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // Auto-check for updates on startup when splash finishes
  useEffect(() => {
    if (!isSplashVisible && studentStep === 0) {
      handleCheckUpdate(false);
    }
  }, [isSplashVisible]);

  // Fetch or Restore Session from Local Cache on Mount (Crash/Reboot Recovery)
  useEffect(() => {
    const checkAndRestoreSession = async () => {
      try {
        const cachedExam = await storage.getItem<ExamSettings>('cbt_active_exam');
        const cachedQuestions = await storage.getItem<Question[]>('cbt_active_questions');
        const cachedStudent = await storage.getItem<{ name: string; nisn: string; className: string }>('cbt_student_info');
        const cachedStep = await storage.getItem<1 | 2 | 3 | 4>('cbt_student_step');
        const cachedGrade = await storage.getItem<GradeRecord>('cbt_final_grade');
        const cachedSeal = await storage.getItem<string>('cbt_integrity_seal');
        const cachedSync = await storage.getItem<'synced' | 'pending'>('cbt_sync_status');
        const cachedPending = await storage.getItem<{ record: GradeRecord; examId: string; sessionId: string }>('cbt_pending_sync_data');
        const cachedSessionId = await storage.getItem<string>('cbt_active_session_id');

        if (cachedSessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cachedSessionId)) {
          setSessionId(cachedSessionId);
        }

        if (cachedExam && cachedQuestions && cachedStudent && cachedStep) {
          // If cachedStep is 3 (in exam sheet), verify with database whether session is still allowed
          if (cachedStep === 3) {
            try {
              const access = await examService.checkStudentSessionAccess(cachedExam.id, cachedStudent.nisn);
              if (!access.allowed) {
                if (access.reason === 'submitted') {
                  setActiveExam(cachedExam);
                  setActiveQuestions(cachedQuestions);
                  setStudentInfo(cachedStudent);
                  if (cachedGrade) setFinalGrade(cachedGrade);
                  setStudentStep(4);
                  return;
                }
              }
            } catch {}
          }

          setActiveExam(cachedExam);
          setActiveQuestions(cachedQuestions);
          setStudentInfo(cachedStudent);
          if (cachedGrade) setFinalGrade(cachedGrade);
          if (cachedSeal) setIntegritySeal(cachedSeal);
          if (cachedSync) setSyncStatus(cachedSync);
          if (cachedPending) setPendingSyncData(cachedPending);
          setStudentStep(cachedStep);
          return;
        }
      } catch (e) {
        console.warn('Session restore error:', e);
      }

      // If no ongoing session, fetch default active exam from Supabase
      try {
        const all = await examService.getAllExams();
        if (all && all.length > 0) {
          const latest = all[0];
          setActiveExam(latest);
          const data = await examService.getExamByToken(latest.token);
          if (data.questions && data.questions.length > 0) {
            setActiveQuestions(data.questions);
          }
        }
      } catch (err) {
        console.warn('Initial exam fetch error:', err);
      }
    };

    checkAndRestoreSession();
  }, []);

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([
    {
      id: 'q1',
      number: 1,
      type: 'multiple_choice',
      questionText: 'Tentukan akar-akar penyelesaian dari persamaan kuadrat berikut:',
      latexFormula: 'x^2 - 7x + 12 = 0',
      options: [
        { id: 'opt1-a', label: 'A', text: 'x = 3 atau x = 4' },
        { id: 'opt1-b', label: 'B', text: 'x = -3 atau x = -4' },
        { id: 'opt1-c', label: 'C', text: 'x = 2 atau x = 6' },
        { id: 'opt1-d', label: 'D', text: 'x = 1 atau x = 12' },
      ],
      correctOptionId: 'opt1-a',
      points: 25,
    },
    {
      id: 'q2',
      number: 2,
      type: 'multiple_choice',
      questionText: 'Nilai perbandingan trigonometri dari sudut istimewa berikut adalah:',
      latexFormula: '\\cos(60^\\circ) + \\sin(30^\\circ)',
      options: [
        { id: 'opt2-a', label: 'A', text: '0.5' },
        { id: 'opt2-b', label: 'B', text: '1.0' },
        { id: 'opt2-c', label: 'C', text: '\\sqrt{3}' },
        { id: 'opt2-d', label: 'D', text: '0' },
      ],
      correctOptionId: 'opt2-b',
      points: 25,
    },
    {
      id: 'q3',
      number: 3,
      type: 'short_answer',
      questionText: 'Hitunglah nilai determinan dari matriks ordo 2x2 berikut:',
      latexFormula: 'A = \\begin{pmatrix} 4 & 2 \\\\ 1 & 3 \\end{pmatrix}',
      options: [],
      correctAnswerText: '10',
      points: 25,
    },
    {
      id: 'q4',
      number: 4,
      type: 'multiple_choice',
      questionText: 'Sebuah benda bergerak dengan kelajuan tetap 15 m/s selama 20 detik. Jarak yang ditempuh adalah:',
      options: [
        { id: 'opt4-a', label: 'A', text: '150 meter' },
        { id: 'opt4-b', label: 'B', text: '200 meter' },
        { id: 'opt4-c', label: 'C', text: '300 meter' },
        { id: 'opt4-d', label: 'D', text: '350 meter' },
      ],
      correctOptionId: 'opt4-c',
      points: 25,
    },
  ]);

  // Handle Quick Entry Success (Silent Background Pre-Caching)
  const handleStudentEntrySuccess = (data: {
    studentName: string;
    nisn: string;
    className: string;
    exam: ExamSettings;
    questions: Question[];
  }) => {
    const studentData = {
      name: data.studentName,
      nisn: data.nisn,
      className: data.className,
    };
    const freshSessionId = generateUUID();
    setSessionId(freshSessionId);
    setStudentInfo(studentData);
    setActiveExam(data.exam);
    setActiveQuestions(data.questions);
    setStudentStep(2); // Go to Lobby

    // Pre-cache entire bundle to local disk immediately
    storage.setItem('cbt_active_session_id', freshSessionId).catch(() => {});
    storage.setItem('cbt_active_exam', data.exam).catch(() => {});
    storage.setItem('cbt_active_questions', data.questions).catch(() => {});
    storage.setItem('cbt_student_info', studentData).catch(() => {});
    storage.setItem('cbt_student_step', 2).catch(() => {});
    storage.removeItem('cbt_final_grade').catch(() => {});
    storage.removeItem('cbt_integrity_seal').catch(() => {});
    storage.removeItem('cbt_sync_status').catch(() => {});
    storage.removeItem('cbt_pending_sync_data').catch(() => {});
    const cleanEntryNisn = (data.nisn || '').trim();
    if (data.exam?.id && cleanEntryNisn) {
      storage.removeItem(`cbt_exam_end_time_${data.exam.id}_${cleanEntryNisn}`).catch(() => {});
      storage.removeItem(`ans_sel_${data.exam.id}_${cleanEntryNisn}`).catch(() => {});
      storage.removeItem(`ans_short_${data.exam.id}_${cleanEntryNisn}`).catch(() => {});
      storage.removeItem(`ans_doubt_${data.exam.id}_${cleanEntryNisn}`).catch(() => {});
    }
    setFinalGrade(null);
    setIntegritySeal('');
  };

  // Start Exam
  const handleStartExam = async () => {
    let currentSessionId = sessionId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentSessionId)) {
      currentSessionId = generateUUID();
      setSessionId(currentSessionId);
    }
    storage.setItem('cbt_active_session_id', currentSessionId).catch(() => {});

    // Clear submission locks so fresh or reset attempts can submit normally
    const cleanNisn = (studentInfo.nisn || '').trim();
    if (activeExam?.id && cleanNisn) {
      submittedSessionsRef.current.delete(`${activeExam.id}_${cleanNisn}`);
      const targetEnd = Date.now() + (activeExam.durationMinutes || 60) * 60 * 1000;
      storage.setItem(`cbt_exam_end_time_${activeExam.id}_${cleanNisn}`, targetEnd).catch(() => {});
    }
    isSubmissionInFlightRef.current = false;

    // 1. Instantly transition to exam sheet
    setStudentStep(3);
    storage.setItem('cbt_student_step', 3).catch(() => {});

    // 2. Register session in Supabase in background
    try {
      const res = await examService.upsertStudentSession({
        id: currentSessionId,
        examId: activeExam.id,
        nisn: studentInfo.nisn,
        studentName: studentInfo.name,
        className: studentInfo.className,
        status: 'working',
        remainingSeconds: (activeExam.durationMinutes || 60) * 60,
        totalQuestions: activeQuestions.length || 5,
        progressCount: 0,
        violationCount: 0,
      });

      if (res && res.session && res.session.id) {
        setSessionId(res.session.id);
        storage.setItem('cbt_active_session_id', res.session.id).catch(() => {});
      }
    } catch (err) {
      console.warn('Session upsert warning:', err);
    }
  };

  // Idempotency guard: prevent double submission (realtime broadcast + polling +
  // postgres UPDATE can all fire force-submit at nearly the same time).
  const submittedSessionsRef = useRef<Set<string>>(new Set());
  const isSubmissionInFlightRef = useRef(false);

  // Submit Exam (Resilient Offline-First Submission)
  const handleSubmitExam = async (answers: {
    selectedAnswers: Record<number, string>;
    shortAnswers: Record<number, string>;
    doubtAnswers: Record<number, boolean>;
    violationCount: number;
  }) => {
    // Guard: only one in-flight submission at a time + never twice per session
    const cleanNisn = (studentInfo.nisn || '').trim();
    const sessionKey = `${activeExam.id}_${cleanNisn}`;
    if (isSubmissionInFlightRef.current) return;
    if (submittedSessionsRef.current.has(sessionKey)) {
      setStudentStep(4);
      return;
    }
    isSubmissionInFlightRef.current = true;
    try {
      // 1. Instant Synchronous Local Auto-Grading (0 ms)
      const studentAnsList = activeQuestions.map((q, idx) => ({
        questionId: q.id,
        selectedOptionId: answers.selectedAnswers[idx],
        answerText: answers.shortAnswers[idx],
      }));

      const result = ScoringEngine.gradeExam(activeQuestions, studentAnsList, 75);

      const fullStudentAnsList = activeQuestions.map((q, idx) => {
        const isEssay = q.type === 'essay';
        return {
          questionId: q.id,
          selectedOptionId: answers.selectedAnswers[idx],
          answerText: answers.shortAnswers[idx],
          isDoubt: !!answers.doubtAnswers[idx],
          isCorrect: isEssay ? null : (result.details?.[q.id]?.isCorrect ?? null),
          scoreEarned: isEssay ? null : (result.details?.[q.id]?.pointsEarned ?? null),
        };
      });

      const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const record: GradeRecord = {
        studentId: `stu-${studentInfo.nisn}`,
        nisn: studentInfo.nisn,
        name: studentInfo.name,
        className: studentInfo.className,
        score: result.totalScore,
        maxScore: result.maxScore || 100,
        submittedAt: nowTimeStr,
        timeSpentMinutes: Math.max(1, Math.round(activeExam.durationMinutes / 3)),
        tabViolations: answers.violationCount,
        status: result.status,
      };

      // 2. Set grade and INSTANTLY transition to Result View (Step 4)
      setFinalGrade(record);
      setStudentStep(4);

      // Persist grade & step to local storage
      storage.setItem('cbt_final_grade', record).catch(() => {});
      storage.setItem('cbt_student_step', 4).catch(() => {});

      // 3. Generate SHA-256 integrity seal locally
      ScoringEngine.generateSubmissionSeal(
        activeExam.id,
        studentInfo.nisn,
        JSON.stringify(studentAnsList),
        answers.violationCount
      )
        .then((seal) => {
          setIntegritySeal(seal);
          storage.setItem('cbt_integrity_seal', seal).catch(() => {});
        })
        .catch((sealErr) => console.warn('Seal generation warning:', sealErr));

      // 4. Try sending to Supabase / server
      examService
        .submitGradeRecord(record, activeExam.id, sessionId, fullStudentAnsList)
        .then(() => {
          setSyncStatus('synced');
          setPendingSyncData(null);
          storage.setItem('cbt_sync_status', 'synced').catch(() => {});
          storage.removeItem('cbt_pending_sync_data').catch(() => {});
        })
        .catch((err) => {
          console.warn('Network offline on submit, stored in sync queue:', err);
          setSyncStatus('pending');
          const pending = { record, examId: activeExam.id, sessionId, answers: fullStudentAnsList };
          setPendingSyncData(pending);
          storage.setItem('cbt_sync_status', 'pending').catch(() => {});
          storage.setItem('cbt_pending_sync_data', pending).catch(() => {});
        });

      // 5. Save durable answer archive for instant offline / local lookup
      const cleanNisn = (studentInfo.nisn || '').trim();
      const archiveData = {
        selectedAnswers: answers.selectedAnswers,
        shortAnswers: answers.shortAnswers,
        doubtAnswers: answers.doubtAnswers,
        submittedAt: nowTimeStr,
      };
      storage.setItem(`ans_archive_${activeExam.id}_${cleanNisn}`, archiveData).catch(() => {});

      // Clean up temporary answering in-flight cache & timer
      storage.removeItem(`ans_sel_${activeExam.id}_${cleanNisn}`).catch(() => {});
      storage.removeItem(`ans_short_${activeExam.id}_${cleanNisn}`).catch(() => {});
      storage.removeItem(`ans_doubt_${activeExam.id}_${cleanNisn}`).catch(() => {});
      storage.removeItem(`ans_sel_${activeExam.id}`).catch(() => {});
      storage.removeItem(`ans_short_${activeExam.id}`).catch(() => {});
      storage.removeItem(`ans_doubt_${activeExam.id}`).catch(() => {});
      storage.removeItem(`cbt_exam_end_time_${activeExam.id}_${cleanNisn}`).catch(() => {});

      submittedSessionsRef.current.add(sessionKey);
    } catch (err) {
      console.warn('handleSubmitExam error:', err);
      setStudentStep(4);
    } finally {
      isSubmissionInFlightRef.current = false;
    }
  };

  // Manual Retry Sync Handler for offline submissions
  const handleRetrySync = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    try {
      const toSync =
        pendingSyncData ||
        (finalGrade ? { record: finalGrade, examId: activeExam.id, sessionId, answers: undefined } : null);
      if (toSync) {
        await examService.submitGradeRecord(toSync.record, toSync.examId, toSync.sessionId, (toSync as any).answers);
        setSyncStatus('synced');
        setPendingSyncData(null);
        await storage.setItem('cbt_sync_status', 'synced');
        await storage.removeItem('cbt_pending_sync_data');
      } else {
        setSyncStatus('synced');
      }
    } catch (err) {
      console.warn('Retry sync error:', err);
      setSyncStatus('pending');
      await storage.setItem('cbt_sync_status', 'pending');
    }
  };

  // Reset Back to Student Welcome Overview Screen
  const handleResetToHome = async () => {
    setStudentStep(0);
    setFinalGrade(null);
    setIntegritySeal('');
    setSyncStatus('synced');
    setPendingSyncData(null);
    const cleanNisn = (studentInfo.nisn || '').trim();
    if (activeExam?.id && cleanNisn) {
      await storage.removeItem(`cbt_exam_end_time_${activeExam.id}_${cleanNisn}`);
    }
    await storage.removeItem('cbt_active_exam');
    await storage.removeItem('cbt_active_questions');
    await storage.removeItem('cbt_student_info');
    await storage.removeItem('cbt_student_step');
    await storage.removeItem('cbt_final_grade');
    await storage.removeItem('cbt_integrity_seal');
    await storage.removeItem('cbt_sync_status');
    await storage.removeItem('cbt_pending_sync_data');
  };

  // Switch Role Handlers
  const handleSelectRole = (role: 'student' | 'teacher') => {
    setIsRoleModalOpen(false);
    if (role === 'teacher') {
      if (!teacherUser) {
        setIsTeacherAuthOpen(true);
      } else {
        setCurrentRole('teacher');
      }
    } else {
      setCurrentRole('student');
    }
  };

  const handleTeacherAuthSuccess = async (teacher: TeacherUser, matchedExam?: ExamSettings) => {
    setTeacherUser(teacher);
    setCurrentRole('teacher');

    if (matchedExam) {
      setActiveExam(matchedExam);
      try {
        const data = await examService.getExamByToken(matchedExam.token);
        if (data.questions && data.questions.length > 0) {
          setActiveQuestions(data.questions);
        }
      } catch (err) {
        console.warn('Load matched exam questions error:', err);
      }
    } else {
      try {
        const all = await examService.getAllExams();
        if (all && all.length > 0) {
          const latest = all[0];
          setActiveExam(latest);
          const data = await examService.getExamByToken(latest.token);
          if (data.questions && data.questions.length > 0) {
            setActiveQuestions(data.questions);
          }
        }
      } catch (err) {
        console.warn('Teacher auth all exams error:', err);
      }
    }
  };

  if (!fontsLoaded || isSplashVisible) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={true} />
        <View style={styles.splashCenterBox}>
          <Image
            source={require('./assets/logo-up.png')}
            style={styles.splashSystemLogo}
            resizeMode="contain"
          />
        </View>
        <View style={styles.splashFooter}>
          <Text style={styles.splashVersionText}>Versi {CURRENT_APP_VERSION.version}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        {/* Main View Router */}
        <View style={styles.mainContainer}>
          {/* STUDENT MODE */}
          {currentRole === 'student' && (
            <>
              {studentStep === 0 && (
                <WelcomeScreen
                  onSelectStudent={() => setStudentStep(1)}
                  onCheckUpdate={() => handleCheckUpdate(true)}
                  isCheckingUpdate={isCheckingUpdate}
                />
              )}

              {studentStep === 1 && (
                <StudentQuickEntry
                  onSuccess={handleStudentEntrySuccess}
                  onTeacherSuccess={handleTeacherAuthSuccess}
                />
              )}

              {studentStep === 2 && (
                <JoinSessionGate
                  exam={activeExam}
                  nisn={studentInfo.nisn}
                  studentName={studentInfo.name}
                  className={studentInfo.className}
                  onAlreadySubmitted={() => {
                    setStudentStep(4);
                  }}
                >
                  <StudentLobby
                    exam={activeExam}
                    questions={activeQuestions}
                    studentName={studentInfo.name}
                    nisn={studentInfo.nisn}
                    className={studentInfo.className}
                    onStartExam={handleStartExam}
                    onBack={() => setStudentStep(1)}
                  />
                </JoinSessionGate>
              )}

              {studentStep === 3 && (
                <StudentExamSheet
                  exam={activeExam}
                  questions={activeQuestions}
                  studentName={studentInfo.name}
                  nisn={studentInfo.nisn}
                  className={studentInfo.className}
                  sessionId={sessionId}
                  onSubmitExam={handleSubmitExam}
                />
              )}

              {studentStep === 4 && (
                <StudentResultView
                  gradeRecord={
                    finalGrade || {
                      studentId: `stu-${studentInfo.nisn}`,
                      nisn: studentInfo.nisn,
                      name: studentInfo.name,
                      className: studentInfo.className,
                      score: 0,
                      maxScore: 100,
                      submittedAt: 'Baru saja',
                      timeSpentMinutes: 1,
                      tabViolations: 0,
                      status: 'Lulus',
                    }
                  }
                  integritySeal={integritySeal}
                  syncStatus={syncStatus}
                  onRetrySync={handleRetrySync}
                  onResetToHome={handleResetToHome}
                  exam={activeExam}
                  sessionId={sessionId}
                  questions={activeQuestions}
                />
              )}
            </>
          )}

          {/* TEACHER MODE */}
          {currentRole === 'teacher' && (
            <>
              {teacherTab === 'proctoring' && (
                <TeacherProctoringView
                  exam={activeExam}
                  teacherName={teacherUser?.name || 'Guru Penguji'}
                  onOpenGradeReport={() => setTeacherTab('grades')}
                  onSelectExam={(selected) => {
                    setActiveExam(selected);
                  }}
                  onSwitchRole={() => setIsRoleModalOpen(true)}
                />
              )}

              {teacherTab === 'grades' && (
                <TeacherGradeReportView
                  exam={activeExam}
                  onBackToProctoring={() => setTeacherTab('proctoring')}
                />
              )}
            </>
          )}
        </View>

        {/* Modals */}
        <RoleSelectorModal
          visible={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          onSelectRole={handleSelectRole}
        />

        <TeacherAuthModal
          visible={isTeacherAuthOpen}
          onClose={() => setIsTeacherAuthOpen(false)}
          onSuccess={handleTeacherAuthSuccess}
        />

        {/* In-App Update Modal */}
        <UpdateAppModal
          visible={isUpdateModalVisible}
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalVisible(false)}
        />

        {/* Feedback Modal for Manual Update Check */}
        <CustomModal
          visible={feedbackModal.visible}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          confirmText="Tutup"
          onConfirm={() => setFeedbackModal((prev) => ({ ...prev, visible: false }))}
          onClose={() => setFeedbackModal((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    backgroundColor: clayColors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  centerBoxText: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  splashCenterBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashSystemLogo: {
    width: 80,
    height: 40,
  },
  splashFooter: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  splashVersionText: {
    fontFamily: typography.semiBold,
    fontSize: 12.5,
    color: '#64748B',
    letterSpacing: 0.6,
  },
  safeArea: {
    flex: 1,
    backgroundColor: clayColors.canvas,
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: clayColors.canvas,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : '100%',
    alignSelf: 'center',
  },
});
