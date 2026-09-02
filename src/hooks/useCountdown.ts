import { useState, useEffect, useRef } from 'react';

interface UseCountdownOptions {
  initialSeconds: number;
  isRunning?: boolean;
  onTimeUp?: () => void;
}

export function useCountdown({ initialSeconds, isRunning = true, onTimeUp }: UseCountdownOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setRemainingSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeUpRef.current) onTimeUpRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, remainingSeconds]);

  const addTime = (extraSeconds: number) => {
    setRemainingSeconds((prev) => prev + extraSeconds);
  };

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
    isTimeUp: remainingSeconds === 0,
  };
}
