import { useEffect, useState } from "react";
import type { Sprint } from "./sprint.js";

export const clock = (milliseconds: number) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

export function useTick() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The words since the sprint began, counted from the day's words as they are saved. */
export const sprintWords = (sprint: Sprint, todayWords: number) =>
  Math.max(0, todayWords - (sprint.startWords ?? todayWords));
