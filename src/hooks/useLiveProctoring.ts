import { useState, useEffect, useCallback } from 'react';
import { examService } from '../services/examService';
import { isAppExitViolation } from '../lib/formatters';
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
      const [liveList, remoteLogs] = await Promise.all([
        examService.getLiveStudents(examId),
        examService.getViolationLogs(examId),
      ]);

      if (remoteLogs && remoteLogs.length > 0) {
        setViolationLogs(remoteLogs);
      }

      // Reconcile violationCount from remoteLogs if higher than student session count
      const countByNisn = new Map<string, number>();
      const countByName = new Map<string, number>();
      (remoteLogs || []).forEach((log) => {
        if (!isAppExitViolation(log)) return;
        const n = (log.studentNisn || '').trim();
        const nm = (log.studentName || '').trim().toLowerCase();
        if (n) countByNisn.set(n, (countByNisn.get(n) || 0) + 1);
        if (nm) countByName.set(nm, (countByName.get(nm) || 0) + 1);
      });

      const reconciledList = (liveList || []).map((s) => {
        const fromN = countByNisn.get((s.nisn || '').trim()) || 0;
        const fromNm = countByName.get((s.name || '').trim().toLowerCase()) || 0;
        const logCount = Math.max(fromN, fromNm);
        return {
          ...s,
          violationCount: Math.max(s.violationCount || 0, logCount),
          status: (logCount > 0 && s.status === 'working') ? 'violation_flagged' : s.status,
        };
      });

      setStudents(reconciledList);
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
          const isMatch = (s: StudentProctoring) =>
            (s.id && updatedStudent.id && s.id === updatedStudent.id) ||
            (s.nisn === updatedStudent.nisn && (s.name || '').trim().toLowerCase() === (updatedStudent.name || '').trim().toLowerCase());

          const exists = prev.some(isMatch);
          if (exists) {
            return prev.map((s) => (isMatch(s) ? { ...s, ...updatedStudent } : s));
          }
          return [updatedStudent, ...prev];
        });
      },
      (newLog) => {
        setViolationLogs((prev) => [newLog, ...prev]);
        if (isAppExitViolation(newLog)) {
          setStudents((prev) =>
            prev.map((s) => {
              const isMatch =
                (newLog.studentNisn && s.nisn.trim() === newLog.studentNisn.trim()) ||
                (newLog.studentName && ((s.name || '').trim().toLowerCase() === newLog.studentName.trim().toLowerCase() || s.nisn.trim() === newLog.studentName.trim()));
              if (isMatch) {
                return {
                  ...s,
                  violationCount: (s.violationCount || 0) + 1,
                  status: newLog.severity === 'danger' ? 'violation_flagged' : s.status,
                };
              }
              return s;
            })
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [examId, loadInitialData]);

  // Server-anchored countdown: derive elapsed from startedAt to keep a SINGLE source of truth.
  // No separate decrement happens on the server; the client only ticks an anchor timestamp.
  useEffect(() => {
    const timer = setInterval(() => {
      setStudents((prev) =>
        prev.map((s) => {
          if (s.status === 'submitted' || s.status === 'ready') return s;
          if (!s.startedAt) return s;

          const started = new Date(s.startedAt).getTime();
          if (isNaN(started)) return s;

          // remainingSeconds is the authoritative remaining amount from last sync;
          // startedAt only helps avoid drift from server updates. Keep monotonic.
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

    return examService.addGlobalTimeInDb(examId, minutes);
  };

  const lockAllExams = async () => {
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        remainingSeconds: 0,
        status: 'submitted',
      }))
    );

    return examService.lockAllExamsInDb(examId);
  };

  const resetStudentSession = async (nisn: string, studentName?: string) => {
    const stu = students.find((s) => s.nisn === nisn && (!studentName || (s.name || '').trim().toLowerCase() === studentName.trim().toLowerCase()));
    const targetExamId = stu?.examId || examId;

    // 1. Purge this student's old violation logs from local UI state
    setViolationLogs((prev) =>
      prev.filter((l) => {
        const matchNisn = l.studentNisn && l.studentNisn.trim() === nisn.trim();
        const matchName =
          (studentName && l.studentName && l.studentName.trim().toLowerCase() === studentName.trim().toLowerCase()) ||
          (stu?.name && l.studentName && l.studentName.trim().toLowerCase() === stu.name.trim().toLowerCase());
        return !matchNisn && !matchName;
      })
    );

    // 2. Reset student state in UI (violations to 0, away state cleared)
    setStudents((prev) =>
      prev.map((s) => {
        const match = s.nisn === nisn && (!studentName || (s.name || '').trim().toLowerCase() === studentName.trim().toLowerCase());
        return match
          ? {
              ...s,
              status: 'ready',
              connectionStatus: 'offline',
              violationCount: 0,
              progressCount: 0,
              startedAt: undefined,
              isAway: false,
              leftAt: undefined,
              lastAwaySeconds: 0,
              totalAwaySeconds: 0,
            }
          : s;
      })
    );

    return examService.resetStudentSessionInDb(targetExamId, nisn, stu?.name || studentName);
  };

  const forceSubmitStudent = async (nisn: string, studentName?: string) => {
    const stu = students.find((s) => s.nisn === nisn && (!studentName || (s.name || '').trim().toLowerCase() === studentName.trim().toLowerCase()));
    const targetExamId = stu?.examId || examId;
    setStudents((prev) =>
      prev.map((s) => {
        const match = s.nisn === nisn && (!studentName || (s.name || '').trim().toLowerCase() === studentName.trim().toLowerCase());
        return match
          ? {
              ...s,
              remainingSeconds: 0,
              status: 'submitted',
            }
          : s;
      })
    );

    return examService.forceSubmitStudentInDb(targetExamId, nisn, studentName);
  };

  const sendWarning = async (studentNisn: string, studentName: string, message: string) => {
    const stu = students.find((s) => s.nisn === studentNisn && (!studentName || (s.name || '').trim().toLowerCase() === studentName.trim().toLowerCase()));
    const targetExamId = stu?.examId || examId;
    return examService.sendWarningToStudent(studentNisn, studentName, message, targetExamId);
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
