import { useState } from "react";
import { searchChips } from "./searchFilter.js";
import type { Project } from "./useProject.js";

/** The chips under the search: status steps and labels that narrow it. */
export function useChips(project: Project | null) {
  const [only, setOnly] = useState<string[]>([]);
  const chips = (project ? searchChips(project) : []).map((chip) => ({
    ...chip,
    isOn: only.includes(chip.id),
  }));
  const toggleChip = (id: string) =>
    setOnly(only.includes(id) ? only.filter((each) => each !== id) : [...only, id]);
  return { only, chips, toggleChip };
}
