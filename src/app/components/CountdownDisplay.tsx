// src/components/CountdownDisplay.tsx
import React from "react";

interface CountdownDisplayProps {
  timeLeft: number;
}

export function CountdownDisplay({ timeLeft }: CountdownDisplayProps) {
  const minutes = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="text-center text-lg mt-2">
      ⏳ Time left:{" "}
      <span className="font-mono text-xl">
        {minutes}:{seconds}
      </span>
    </div>
  );
}
