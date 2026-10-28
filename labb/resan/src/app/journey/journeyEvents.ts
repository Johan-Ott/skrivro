import { createStore } from "@llkit/store.js";
import type { Celebration } from "../../project/inkwell.js";

// Celebrations wait here for the corner to show them, and ink earned anywhere in the app is
// handed to the journey, which saves it.
const shown = createStore<Celebration[]>([]);
let inkTaker: ((points: number) => void) | null = null;

export const celebrate = (celebration: Celebration) => shown.set([...shown.get(), celebration]);
export const dismissCelebration = (celebration: Celebration) =>
  shown.set(shown.get().filter((each) => each !== celebration));

export const useCelebrations = shown.use;

export const earnInk = (points: number) => inkTaker?.(points);
export const takeInk = (taker: ((points: number) => void) | null) => void (inkTaker = taker);

// Badges unlocked where something happens, such as an export, are handed to the journey too.
let badgeTaker: ((id: string) => void) | null = null;
export const earnBadge = (id: string) => badgeTaker?.(id);
export const takeBadge = (taker: ((id: string) => void) | null) => void (badgeTaker = taker);
