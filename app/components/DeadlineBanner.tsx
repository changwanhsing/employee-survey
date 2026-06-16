"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days} 天 ${hours} 小時`;
  if (hours > 0) return `${hours} 小時 ${minutes} 分`;
  return `${minutes} 分 ${seconds} 秒`;
}

export default function DeadlineBanner() {
  const [deadline, setDeadline] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/deadline")
      .then((res) => res.json())
      .then((data: { deadline: string | null; expired: boolean }) => {
        setDeadline(data.deadline);
        setExpired(data.expired);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!loaded || !deadline) return null;

  const deadlineMs = new Date(deadline).getTime();
  const remaining = deadlineMs - now;
  const isExpired = expired || remaining <= 0;

  return (
    <div
      className={`mt-4 rounded-2xl border p-4 text-sm ${
        isExpired
          ? "border-red-100 bg-red-50 text-red-700"
          : "border-emerald-100 bg-emerald-50 text-emerald-800"
      }`}
    >
      {isExpired ? (
        <p className="font-semibold">收件已截止</p>
      ) : (
        <p>
          <span className="font-semibold">距離收件截止還有 {formatRemaining(remaining)}</span>
          <br />
          截止時間：{new Date(deadline).toLocaleString("zh-TW")}
        </p>
      )}
    </div>
  );
}
