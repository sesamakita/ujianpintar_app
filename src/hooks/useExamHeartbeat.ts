import { useEffect, useRef } from 'react';
import { Vibration } from 'react-native';
import { supabase } from '../lib/supabase';
import { examService } from '../services/examService';

interface UseExamHeartbeatOptions {
  examId: string;
  nisn: string;
  answeredCount: number;
  onWarning: (alert: { message: string; timestamp: string; studentName?: string }) => void;
  onTimeAdded?: (addedMinutes: number) => void;
  onForceSubmit: () => void;
}

export function useExamHeartbeat({
  examId,
  nisn,
  answeredCount,
  onWarning,
  onTimeAdded,
  onForceSubmit,
}: UseExamHeartbeatOptions) {
  const lastCommandIdRef = useRef<number>(0);
  const onWarningRef = useRef(onWarning);
  const onTimeAddedRef = useRef(onTimeAdded);
  const onForceSubmitRef = useRef(onForceSubmit);
  const answeredCountRef = useRef(answeredCount);
  const isHandledForceSubmitRef = useRef(false);
  const mountTimestampRef = useRef<number>(Date.now());

  onWarningRef.current = onWarning;
  onTimeAddedRef.current = onTimeAdded;
  onForceSubmitRef.current = onForceSubmit;
  answeredCountRef.current = answeredCount;

  useEffect(() => {
    if (!examId || !nisn) return;
    const cleanNisn = (nisn || '').trim();
    const isValidUUID = (str?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || '');
    const validExamId = isValidUUID(examId) ? examId : null;

    let isMounted = true;
    let fallbackLastSeenWarningKey: string | null = null;

    const performHeartbeat = async () => {
      if (!isMounted) return;

      try {
        // --- 1. PRIMARY: Try RPC student_heartbeat (Unified Command Bus) ---
        if (validExamId) {
          const { data, error } = await supabase.rpc('student_heartbeat', {
            p_exam_id: validExamId,
            p_nisn: cleanNisn,
            p_progress: answeredCountRef.current,
            p_last_command_id: lastCommandIdRef.current,
          });

          if (!error && data) {
            // Check submission flag
            if (data.is_submitted || data.status === 'submitted') {
              if (!isHandledForceSubmitRef.current) {
                isHandledForceSubmitRef.current = true;
                onForceSubmitRef.current?.();
              }
              return;
            } else if (data.status === 'working') {
              // Reset handled flag when session is back to active/working (e.g. after Reset Sesi)
              isHandledForceSubmitRef.current = false;
            }

            // Process ordered commands with net state reduction
            if (Array.isArray(data.commands) && data.commands.length > 0) {
              let hasEffectiveForceSubmit = false;
              let latestEffectiveWarning: any = null;
              let totalAddedMinutes = 0;

              for (const cmd of data.commands) {
                const cmdId = Number(cmd.id) || 0;
                if (cmdId > lastCommandIdRef.current) {
                  lastCommandIdRef.current = cmdId;
                }

                if (cmd.type === 'FORCE_SUBMIT' || cmd.type === 'LOCK_ALL') {
                  hasEffectiveForceSubmit = true;
                } else if (cmd.type === 'RESET_SESSION') {
                  hasEffectiveForceSubmit = false;
                  latestEffectiveWarning = null;
                } else if (cmd.type === 'WARNING' && cmd.payload?.message) {
                  latestEffectiveWarning = cmd;
                } else if (cmd.type === 'ADD_TIME') {
                  totalAddedMinutes += (Number(cmd.payload?.minutes) || 0);
                }
              }

              // Apply net commands
              if (latestEffectiveWarning) {
                try { Vibration.vibrate([0, 500, 200, 500]); } catch {}
                onWarningRef.current?.({
                  message: latestEffectiveWarning.payload.message,
                  timestamp: latestEffectiveWarning.payload.timestamp || new Date(latestEffectiveWarning.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                });
              }

              if (totalAddedMinutes > 0) {
                try { Vibration.vibrate(300); } catch {}
                onTimeAddedRef.current?.(totalAddedMinutes);
              }

              if (hasEffectiveForceSubmit) {
                if (!isHandledForceSubmitRef.current) {
                  isHandledForceSubmitRef.current = true;
                  onForceSubmitRef.current?.();
                  return;
                }
              } else {
                isHandledForceSubmitRef.current = false;
              }
            }
            return;
          }
        }

        // --- 2. FALLBACK: Standard REST query if RPC is not deployed yet ---
        const status = await examService.getStudentSessionStatus(cleanNisn, examId);
        if (status.status === 'submitted' || (status.remainingSeconds === 0 && !!status.submittedAt)) {
          if (!isHandledForceSubmitRef.current) {
            isHandledForceSubmitRef.current = true;
            onForceSubmitRef.current?.();
          }
          return;
        } else if (status.status === 'working') {
          // Reset handled flag when session is reset by teacher
          isHandledForceSubmitRef.current = false;
        }

        const latestWarn = await examService.getLatestTeacherWarning(cleanNisn, examId);
        if (latestWarn) {
          const warnKey = latestWarn.id || `${latestWarn.timestamp}_${latestWarn.message}`;
          const isWarningFresh = latestWarn.createdAt
            ? (new Date(latestWarn.createdAt).getTime() >= mountTimestampRef.current - 15000)
            : true;

          if (fallbackLastSeenWarningKey === null) {
            fallbackLastSeenWarningKey = warnKey;
            if (isWarningFresh) {
              try { Vibration.vibrate([0, 500, 200, 500]); } catch {}
              onWarningRef.current?.(latestWarn);
            }
          } else if (warnKey !== fallbackLastSeenWarningKey) {
            fallbackLastSeenWarningKey = warnKey;
            try { Vibration.vibrate([0, 500, 200, 500]); } catch {}
            onWarningRef.current?.(latestWarn);
          }
        }
      } catch (_err) {
        // Resilient silent catch
      }
    };

    // Execute immediately on mount
    performHeartbeat();

    // Fast, resilient interval every 3 seconds
    const timer = setInterval(performHeartbeat, 3000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [examId, nisn]);
}
