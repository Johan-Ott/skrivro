import { browserStorage } from "@llkit/storage/browserStorage.js";
import { createStore } from "@llkit/store.js";

// A writing sprint as a pomodoro: passes to write in with short breaks between them, a long
// break after the last, and the words written meanwhile.

export interface SprintPlan {
  /** Minutes. */
  session: number;
  shortBreak: number;
  longBreak: number;
  /** How many passes. */
  rounds: number;
}

export type Phase = "pass" | "kort" | "lang";

export interface Sprint {
  plan: SprintPlan;
  /** Which of the plan's phases is running, from 0. */
  phase: number;
  endsAt: number;
  /** The day's words when the sprint began; set by the bar the first time it is drawn. */
  startWords: number | null;
}

/** `startWords` and `endedAt` let the result count words still being saved when it ended. */
export interface SprintDone {
  passes: number;
  words: number;
  startWords: number | null;
  endedAt: number;
}

interface SprintState {
  plan: SprintPlan;
  sprint: Sprint | null;
  /** The last sprint's result, shown until it is closed. */
  done: SprintDone | null;
  isPanelOpen: boolean;
}

const PLAN_KEY = "skrivro.sprint";
export const DEFAULT_PLAN: SprintPlan = { session: 25, shortBreak: 5, longBreak: 15, rounds: 2 };

function savedPlan(): SprintPlan {
  try {
    const stored = browserStorage().getItem(PLAN_KEY);
    return stored
      ? { ...DEFAULT_PLAN, ...(JSON.parse(stored) as Partial<SprintPlan>) }
      : DEFAULT_PLAN;
  } catch {
    return DEFAULT_PLAN;
  }
}

const state = createStore<SprintState>({
  plan: savedPlan(),
  sprint: null,
  done: null,
  isPanelOpen: false,
});
const change = (part: Partial<SprintState>) => state.set({ ...state.get(), ...part });

export const useSprint = state.use;

/** Pass, short break, pass, … and a long break after the last pass. */
export const phasesOf = (plan: SprintPlan): Phase[] =>
  Array.from({ length: plan.rounds }, (_slot, index): Phase[] =>
    index === plan.rounds - 1 ? ["pass", "lang"] : ["pass", "kort"],
  ).flat();

const LENGTH: Record<Phase, keyof SprintPlan> = {
  pass: "session",
  kort: "shortBreak",
  lang: "longBreak",
};

export const minutesOf = (plan: SprintPlan, phase: Phase) => plan[LENGTH[phase]];

/** The passes begun so far, counting the one running. */
export const passesBy = (phase: number) => Math.floor(phase / 2) + 1;

export function setPlan(plan: SprintPlan) {
  browserStorage().setItem(PLAN_KEY, JSON.stringify(plan));
  change({ plan });
}

export const setPanelOpen = (isPanelOpen: boolean) => change({ isPanelOpen });

const phaseEnd = (plan: SprintPlan, phase: number) =>
  Date.now() + minutesOf(plan, phasesOf(plan)[phase] ?? "pass") * 60_000;

export function startSprint() {
  const { plan } = state.get();
  change({ sprint: { plan, phase: 0, endsAt: phaseEnd(plan, 0), startWords: null }, done: null });
}

export function setStartWords(words: number) {
  const { sprint } = state.get();
  if (sprint) change({ sprint: { ...sprint, startWords: words } });
}

export function endSprint(words: number) {
  const { sprint } = state.get();
  const passes = sprint ? passesBy(sprint.phase) : 0;
  const startWords = sprint?.startWords ?? null;
  change({ sprint: null, done: { passes, words, startWords, endedAt: Date.now() } });
}

/** On to the next phase, or the sprint's end after the long break. False once it ended. */
export function nextPhase(words: number) {
  const { sprint } = state.get();
  if (!sprint) return false;
  const phase = sprint.phase + 1;
  if (phase >= phasesOf(sprint.plan).length) {
    endSprint(words);
    return false;
  }
  change({ sprint: { ...sprint, phase, endsAt: phaseEnd(sprint.plan, phase) } });
  return true;
}

export const closeSprintResult = () => change({ sprint: null, done: null });
