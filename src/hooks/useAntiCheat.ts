import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import * as KeepAwake from 'expo-keep-awake';
import { examService } from '../services/examService';

interface UseAntiCheatOptions {
  enabled: boolean;
  examId: string;
  sessionId?: string;
  studentName: string;
  studentNisn: string;
  onViolation?: (count: number, reason: string) => void;
}

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

  useEffect(() => {
    if (!enabled) return;

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

    // 3. Monitor App Switch / Blur / Backgrounding
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current === 'active' &&
        (nextAppState === 'inactive' || nextAppState === 'background')
      ) {
        // App was minimized or switched away
        const reason = 'Terdeteksi berpindah aplikasi atau meminimalkan layar ujian.';
        setViolationCount((prev) => {
          const newCount = prev + 1;
          setLastWarning(`⚠️ Peringatan Integritas (#${newCount}): Jangan keluar dari aplikasi!`);
          
          if (onViolation) {
            onViolation(newCount, reason);
          }

          // Record violation to server
          examService.recordViolation({
            examId,
            sessionId,
            studentName,
            studentNisn,
            message: `Siswa keluar dari aplikasi ujian (Pelanggaran ke-${newCount})`,
            severity: newCount > 2 ? 'danger' : 'warning',
          });

          return newCount;
        });
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      KeepAwake.deactivateKeepAwake().catch(() => {});
    };
  }, [enabled, examId, sessionId, studentName, studentNisn, onViolation]);

  return {
    violationCount,
    lastWarning,
    clearLastWarning: () => setLastWarning(null),
  };
}
