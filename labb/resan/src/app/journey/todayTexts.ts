import { sceneTitle, splitSceneFile } from "../../manuscript/sceneFile.js";
import { dayKey } from "../../project/stats.js";

/** The words each text got today, on this device; a new day starts empty. */
interface TodayTexts {
  day: string;
  texts: Record<string, { title: string; words: number }>;
}

const KEY = "skrivro.todayTexts";

function read(): TodayTexts {
  const today = dayKey(Date.now());
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null") as TodayTexts | null;
    return stored?.day === today ? stored : { day: today, texts: {} };
  } catch {
    return { day: today, texts: {} };
  }
}

/** Only words added count, as in the rest of the journey. */
export function recordText(key: string, sceneText: string, added: number) {
  if (added <= 0) return;
  const today = read();
  const title = sceneTitle(splitSceneFile(sceneText).frontMatter) ?? "";
  const words = (today.texts[key]?.words ?? 0) + added;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...today, texts: { ...today.texts, [key]: { title, words } } }),
    );
  } catch {
    // Without storage Dagens mål shows the day's total only.
  }
}

/** Today's texts, most words first. */
export const textsToday = () =>
  Object.values(read().texts).sort((one, two) => two.words - one.words);
