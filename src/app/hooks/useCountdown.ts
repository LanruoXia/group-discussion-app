import { useEffect, useState, useRef } from "react";

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
  const expiredRef = useRef(false); // ✅ 替代 useState
  const [expired, setExpired] = useState<boolean>(false); // 可选：暴露给外部使用

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(durationSeconds - elapsed, 0);

      setTimeLeft(remaining);

      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        setExpired(true); // 更新外部状态
        if (onExpire) onExpire();
      }
    };

    updateRemaining(); // 初始同步一次

    const tickTimer = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          setExpired(true);
          if (onExpire) onExpire();
          clearInterval(tickTimer);
        }
        return Math.max(next, 0);
      });
    }, 1000);

    const syncTimer = setInterval(updateRemaining, syncIntervalSeconds * 1000);

    return () => {
      clearInterval(tickTimer);
      clearInterval(syncTimer);
    };
  }, [startTime, durationSeconds, onExpire, syncIntervalSeconds]);

  return { timeLeft, expired };
}