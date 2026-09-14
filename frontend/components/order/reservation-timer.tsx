"use client";

import { useEffect, useState } from "react";

const INITIAL_SECONDS = 14 * 60 + 53;

function formatTime(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ReservationTimer() {
  const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-end gap-1" aria-live="polite">
      <span className="text-[20px] leading-8 font-medium text-db-text-primary">
        {formatTime(secondsLeft)}
      </span>
      <span className="text-db-body text-db-text-secondary">Бронирование</span>
    </div>
  );
}
