// Ur project/progress.ts. Behöver HEATMAP_WEEKS = 12 och dayAfter, mondayOf, utcOf, Stats därifrån.

export interface HeatmapCell {
  day: string;
  words: number;
  /** 0 to 4 by share of the daily goal; null for days still to come. */
  level: number | null;
}

function levelOf(words: number, goal: number): number {
  if (words <= 0) return 0;
  return Math.min(4, 1 + Math.floor((2 * words) / goal));
}

/** A column per week, starting on Monday. */
export function heatmap(stats: Stats, today: string, dailyGoal: number | null): HeatmapCell[] {
  const start = dayAfter(mondayOf(today), -7 * (HEATMAP_WEEKS - 1));
  const goal = dailyGoal ?? Math.max(1, ...Object.values(stats));
  return Array.from({ length: HEATMAP_WEEKS * 7 }, (_unused, index) => {
    const day = dayAfter(start, index);
    const words = stats[day] ?? 0;
    return { day, words, level: day > today ? null : levelOf(words, goal) };
  });
}

