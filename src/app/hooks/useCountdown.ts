import { useEffect, useState } from "react";

interface UseCountdownOptions {
  startTime: string | null;
  durationSeconds: number;
  onExpire?: () => void;
  syncIntervalSeconds?: number; // Optional drift correction interval (default 10s)
}

export function useCountdown({
  startTime,
  durationSeconds,
  onExpire,
  syncIntervalSeconds = 10,
}: UseCountdownOptions) {
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const [expired, setExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(durationSeconds - elapsed, 0);

      setTimeLeft(remaining);

      if (remaining === 0 && !expired) {
        setExpired(true);
        if (onExpire) onExpire();
      }
    };

    // Initial sync
    updateRemaining();

    // 1s ticking interval
    const tickTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(tickTimer);
          setExpired(true);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 10s server drift correction
    const syncTimer = setInterval(updateRemaining, syncIntervalSeconds * 1000);

    return () => {
      clearInterval(tickTimer);
      clearInterval(syncTimer);
    };
  }, [startTime, durationSeconds, onExpire, expired, syncIntervalSeconds]);

  return { timeLeft, expired };
}
