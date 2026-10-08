import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Vibration } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as KeepAwake from 'expo-keep-awake';
import { examService } from '../services/examService';
import { storage } from '../lib/storage';

interface UseAntiCheatOptions {
  enabled: boolean;
  examId: string;
  sessionId?: string;
  studentName: string;
  studentNisn: string;
  onViolation?: (count: number, reason: string) => void;
}

const formatDuration = (sec: number): string => {
  if (sec < 60) return `${sec} detik`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} menit ${s} detik` : `${m} menit`;
};

export function useAntiCheat({
  enabled,
  examId,
  sessionId,
  studentName,
  studentNisn,
  onViolation,
}: UseAntiCheatOptions) {
  const [violationCount, setViolationCount] = useState(0);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const leftTimestampRef = useRef<number | null>(null);
  const totalAwaySecondsRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const cleanNisn = (studentNisn || '').trim();
    const awayStorageKey = `cbt_away_left_${examId}_${cleanNisn}`;

    // 1. Prevent Screenshots and Screen Recording
    const enableScreenProtection = async () => {
      try {
        await ScreenCapture.preventScreenCaptureAsync();
      } catch (e) {
        console.warn('ScreenCapture prevent error:', e);
      }
    };

    // 2. Keep screen awake during exam
    const enableKeepAwake = async () => {
      try {
        await KeepAwake.activateKeepAwakeAsync();
      } catch (e) {
        console.warn('KeepAwake error:', e);
      }
    };

    enableScreenProtection();
    enableKeepAwake();

    // 3. Self-healing check: Detect if app was previously closed/killed while away
    const checkAppKilledWhileAway = async () => {
      try {
        const savedLeftAt = await storage.getItem<number>(awayStorageKey);
        if (savedLeftAt && savedLeftAt > 0) {
          await storage.removeItem(awayStorageKey);
          const elapsedSec = Math.max(1, Math.round((Date.now() - savedLeftAt) / 1000));
          if (elapsedSec >= 2) {
            totalAwaySecondsRef.current += elapsedSec;
            const awayText = formatDuration(elapsedSec);
            const totalText = formatDuration(totalAwaySecondsRef.current);

            try { Vibration.vibrate([0, 500, 200, 500]); } catch {}
            setViolationCount((prev) => {
              const newCount = prev + 1;
              setLastWarning(`⚠️ Peringatan Integritas (#${newCount}): Aplikasi tertutup selama ${awayText}!`);
              if (onViolation) {
                onViolation(newCount, `Aplikasi tertutup/dimatikan selama ${awayText}.`);
              }
              examService.recordViolation({
                examId,
                sessionId,
                studentName,
                studentNisn,
                message: `Siswa membuka kembali aplikasi setelah tertutup selama ${awayText} (Total: ${totalText})`,
                severity: 'danger',
                awaySeconds: elapsedSec,
                totalAwaySeconds: totalAwaySecondsRef.current,
              });
              return newCount;
            });
          }
        }
      } catch (e) {
        console.warn('Check away recovery error:', e);
      }
    };
    checkAppKilledWhileAway();

    // 4. Monitor App Switch / Minimize / Backgrounding with Live Timer Telemetry
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const isLeaving =
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background');

      const isReturning =
        (appState.current === 'inactive' || appState.current === 'background') &&
        nextAppState === 'active';

      if (isLeaving) {
        // --- PHASE 1: STUDENT LEAVES EXAM APP ---
        const now = Date.now();
        leftTimestampRef.current = now;
        await storage.setItem(awayStorageKey, now);

        // Notify server immediately that student is currently away
        examService.setStudentAwayStatus({
          examId,
          studentNisn,
          studentName,
          isAway: true,
          leftAt: new Date(now).toISOString(),
        });
      } else if (isReturning) {
        // --- PHASE 2: STUDENT RETURNS TO EXAM APP ---
        let leftAt = leftTimestampRef.current;
        if (!leftAt) {
          const stored = await storage.getItem<number>(awayStorageKey);
          if (stored) leftAt = stored;
        }

        leftTimestampRef.current = null;
        await storage.removeItem(awayStorageKey);

        if (leftAt) {
          const awaySeconds = Math.max(1, Math.round((Date.now() - leftAt) / 1000));
          totalAwaySecondsRef.current += awaySeconds;

          const awayText = formatDuration(awaySeconds);
          const totalText = formatDuration(totalAwaySecondsRef.current);
          const isDanger = awaySeconds >= 5;

          try { Vibration.vibrate([0, 500, 200, 500]); } catch {}

          setViolationCount((prev) => {
            const newCount = prev + 1;
            setLastWarning(
              `⚠️ Peringatan Integritas (#${newCount}): Anda meninggalkan ujian selama ${awayText}!`
            );

            if (onViolation) {
              onViolation(newCount, `Meninggalkan aplikasi selama ${awayText} (Total: ${totalText}).`);
            }

            // Record violation to server & clear is_away status
            examService.recordViolation({
              examId,
              sessionId,
              studentName,
              studentNisn,
              message: `Siswa kembali ke aplikasi setelah keluar selama ${awayText} (Total: ${totalText})`,
              severity: isDanger || newCount > 2 ? 'danger' : 'warning',
              awaySeconds,
              totalAwaySeconds: totalAwaySecondsRef.current,
            });

            return newCount;
          });
        } else {
          // If no left timestamp recorded, still clear away status on server
          examService.setStudentAwayStatus({
            examId,
            studentNisn,
            studentName,
            isAway: false,
            leftAt: null,
          });
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      KeepAwake.deactivateKeepAwake().catch(() => {});
      // Reset away status when leaving exam screen legitimately
      examService.setStudentAwayStatus({
        examId,
        studentNisn,
        studentName,
        isAway: false,
        leftAt: null,
      }).catch(() => {});
      storage.removeItem(awayStorageKey).catch(() => {});
    };
  }, [enabled, examId, sessionId, studentName, studentNisn, onViolation]);

  return {
    violationCount,
    lastWarning,
    clearLastWarning: () => setLastWarning(null),
  };
}
