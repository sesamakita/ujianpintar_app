import { useState, useEffect, useCallback } from 'react';
import { examService } from '../services/examService';
import type { StudentProctoring, ViolationLogItem } from '../types/exam';

export function useLiveProctoring(examId: string) {
  const [students, setStudents] = useState<StudentProctoring[]>([]);
  const [violationLogs, setViolationLogs] = useState<ViolationLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial student roster & violations directly from Supabase
  const loadInitialData = useCallback(async () => {
    if (!examId) return;
    setIsLoading(true);
    try {
      const liveList = await examService.getLiveStudents(examId);
      setStudents(liveList);
    } catch (e) {
      console.warn('Load live students error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    loadInitialData();

    if (!examId) return;

    // Real-time Supabase WebSocket subscription
    const unsubscribe = examService.subscribeToLiveExam(
      examId,
      (updatedStudent) => {
        setStudents((prev) => {
          const exists = prev.some((s) => s.nisn === updatedStudent.nisn);
          if (exists) {
            return prev.map((s) => (s.nisn === updatedStudent.nisn ? { ...s, ...updatedStudent } : s));
          }
          return [updatedStudent, ...prev];
        });
      },
      (newLog) => {
        setViolationLogs((prev) => [newLog, ...prev]);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [examId, loadInitialData]);

  // Local second-by-second countdown for active students
  useEffect(() => {
    const timer = setInterval(() => {
      setStudents((prev) =>
        prev.map((s) => {
          if (s.status === 'submitted') return s;
          const newSec = Math.max(0, s.remainingSeconds - 1);
          return {
            ...s,
            remainingSeconds: newSec,
            status: newSec === 0 ? 'submitted' : s.status,
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const addGlobalTime = async (minutes: number) => {
    const addedSec = minutes * 60;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        remainingSeconds: s.status !== 'submitted' ? s.remainingSeconds + addedSec : s.remainingSeconds,
      }))
    );

    await examService.addGlobalTimeInDb(examId, minutes);
  };

  const lockAllExams = async () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        remainingSeconds: 0,
        status: 'submitted',
      }))
    );

    await examService.lockAllExamsInDb(examId);
  };

  const resetStudentSession = async (nisn: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.nisn === nisn
          ? {
              ...s,
              status: 'working',
              connectionStatus: 'online',
              violationCount: 0,
            }
          : s
      )
    );

    await examService.resetStudentSessionInDb(examId, nisn);
  };

  const forceSubmitStudent = async (nisn: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.nisn === nisn
          ? {
              ...s,
              remainingSeconds: 0,
              status: 'submitted',
            }
          : s
      )
    );

    await examService.forceSubmitStudentInDb(examId, nisn);
  };

  const sendWarning = async (studentNisn: string, studentName: string, message: string) => {
    await examService.sendWarningToStudent(studentNisn, studentName, message, examId);
  };

  return {
    students,
    setStudents,
    violationLogs,
    setViolationLogs,
    isLoading,
    refreshRoster: loadInitialData,
    addGlobalTime,
    lockAllExams,
    resetStudentSession,
    forceSubmitStudent,
    sendWarning,
  };
}
