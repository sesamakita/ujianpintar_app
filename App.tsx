import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, ActivityIndicator, Platform } from 'react-native';
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
import { HeaderBar } from './src/components/common/HeaderBar';
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
import { colors } from './src/theme';

export default function App() {
  // Load Plus Jakarta Sans Google Fonts
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

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
  const [sessionId, setSessionId] = useState<string>(`ses-${Date.now()}`);

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

        if (cachedExam && cachedQuestions && cachedStudent && cachedStep) {
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
    setStudentInfo(studentData);
    setActiveExam(data.exam);
    setActiveQuestions(data.questions);
    setStudentStep(2); // Go to Lobby

    // Pre-cache entire bundle to local disk immediately
    storage.setItem('cbt_active_exam', data.exam).catch(() => {});
    storage.setItem('cbt_active_questions', data.questions).catch(() => {});
    storage.setItem('cbt_student_info', studentData).catch(() => {});
    storage.setItem('cbt_student_step', 2).catch(() => {});
  };

  // Start Exam
  const handleStartExam = async () => {
    // 1. Instantly transition to exam sheet
    setStudentStep(3);
    storage.setItem('cbt_student_step', 3).catch(() => {});

    // 2. Register session in Supabase in background
    try {
      const res = await examService.upsertStudentSession({
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
      } else {
        setSessionId(`ses-${Date.now()}`);
      }
    } catch (err) {
      console.warn('Session upsert warning:', err);
      setSessionId(`ses-${Date.now()}`);
    }
  };

  // Submit Exam (Resilient Offline-First Submission)
  const handleSubmitExam = async (answers: {
    selectedAnswers: Record<number, string>;
    shortAnswers: Record<number, string>;
    doubtAnswers: Record<number, boolean>;
    violationCount: number;
  }) => {
    try {
      // 1. Instant Synchronous Local Auto-Grading (0 ms)
      const studentAnsList = activeQuestions.map((q, idx) => ({
        questionId: q.id,
        selectedOptionId: answers.selectedAnswers[idx],
        answerText: answers.shortAnswers[idx],
      }));

      const result = ScoringEngine.gradeExam(activeQuestions, studentAnsList, 75);

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
        .submitGradeRecord(record, activeExam.id, sessionId)
        .then(() => {
          setSyncStatus('synced');
          setPendingSyncData(null);
          storage.setItem('cbt_sync_status', 'synced').catch(() => {});
          storage.removeItem('cbt_pending_sync_data').catch(() => {});
        })
        .catch((err) => {
          console.warn('Network offline on submit, stored in sync queue:', err);
          setSyncStatus('pending');
          const pending = { record, examId: activeExam.id, sessionId };
          setPendingSyncData(pending);
          storage.setItem('cbt_sync_status', 'pending').catch(() => {});
          storage.setItem('cbt_pending_sync_data', pending).catch(() => {});
        });

      // 5. Clean up temporary answering cache
      const cleanNisn = (studentInfo.nisn || '').trim();
      storage.removeItem(`ans_sel_${activeExam.id}_${cleanNisn}`).catch(() => {});
      storage.removeItem(`ans_short_${activeExam.id}_${cleanNisn}`).catch(() => {});
      storage.removeItem(`ans_doubt_${activeExam.id}_${cleanNisn}`).catch(() => {});
      storage.removeItem(`ans_sel_${activeExam.id}`).catch(() => {});
      storage.removeItem(`ans_short_${activeExam.id}`).catch(() => {});
      storage.removeItem(`ans_doubt_${activeExam.id}`).catch(() => {});
    } catch (err) {
      console.warn('handleSubmitExam error:', err);
      setStudentStep(4);
    }
  };

  // Manual Retry Sync Handler for offline submissions
  const handleRetrySync = async () => {
    if (syncStatus === 'syncing') return;
    setSyncStatus('syncing');
    try {
      const toSync =
        pendingSyncData ||
        (finalGrade ? { record: finalGrade, examId: activeExam.id, sessionId } : null);
      if (toSync) {
        await examService.submitGradeRecord(toSync.record, toSync.examId, toSync.sessionId);
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

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

        {/* Global Header Bar (Only active in Teacher Proctoring Mode) */}
        {currentRole === 'teacher' ? (
          <HeaderBar
            title="UjianPintar Pengawas"
            subtitle={`${teacherUser?.name || 'Guru Penguji'} • ${activeExam.subject} (PIN: ${activeExam.token})`}
            currentRole={currentRole}
            onSwitchRole={() => setIsRoleModalOpen(true)}
            showRoleSwitch={true}
          />
        ) : null}

        {/* Main View Router */}
        <View style={styles.mainContainer}>
          {/* STUDENT MODE */}
          {currentRole === 'student' && (
            <>
              {studentStep === 0 && (
                <WelcomeScreen
                  onSelectStudent={() => setStudentStep(1)}
                  onSelectTeacher={() => setIsTeacherAuthOpen(true)}
                />
              )}

              {studentStep === 1 && (
                <StudentQuickEntry
                  onSuccess={handleStudentEntrySuccess}
                  onSwitchToTeacher={() => setIsTeacherAuthOpen(true)}
                  onBack={() => setStudentStep(0)}
                />
              )}

              {studentStep === 2 && (
                <StudentLobby
                  exam={activeExam}
                  questions={activeQuestions}
                  studentName={studentInfo.name}
                  nisn={studentInfo.nisn}
                  className={studentInfo.className}
                  onStartExam={handleStartExam}
                  onBack={() => setStudentStep(1)}
                />
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
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    width: '100%',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: colors.bgApp,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 520 : '100%',
    alignSelf: 'center',
  },
});
