import { useState, useEffect, useRef, useCallback } from 'react';

interface UseCountdownOptions {
  initialSeconds: number;
  isRunning?: boolean;
  onTimeUp?: () => void;
  targetEndTime?: number;
}

export function useCountdown({ initialSeconds, isRunning = true, onTimeUp, targetEndTime: initialTargetEndTime }: UseCountdownOptions) {
  const [targetEndTime, setTargetEndTime] = useState<number | null>(initialTargetEndTime || null);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
    if (initialTargetEndTime) {
      setTargetEndTime(initialTargetEndTime);
    }
  }, [initialSeconds, initialTargetEndTime]);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      if (targetEndTime) {
        const now = Date.now();
        const rem = Math.max(0, Math.round((targetEndTime - now) / 1000));
        setRemainingSeconds(rem);
        if (rem <= 0) {
          clearInterval(timer);
          if (onTimeUpRef.current) onTimeUpRef.current();
        }
      } else {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            if (onTimeUpRef.current) onTimeUpRef.current();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, remainingSeconds, targetEndTime]);

  const addTime = useCallback((extraSeconds: number) => {
    setTargetEndTime((prev) => (prev ? prev + extraSeconds * 1000 : Date.now() + extraSeconds * 1000));
    setRemainingSeconds((prev) => prev + extraSeconds);
  }, []);

  const recalibrate = useCallback((targetMs: number) => {
    setTargetEndTime(targetMs);
    const rem = Math.max(0, Math.round((targetMs - Date.now()) / 1000));
    setRemainingSeconds(rem);
  }, []);

  const formatTime = () => {
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const isUrgent = remainingSeconds <= 300; // less than 5 minutes

  return {
    remainingSeconds,
    formattedTime: formatTime(),
    isUrgent,
    addTime,
    recalibrate,
    isTimeUp: remainingSeconds === 0,
  };
}
