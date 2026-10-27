import { useState } from "react";
import { searchChips, WITH_NOTES } from "./searchFilter.js";
import type { Project } from "./useProject.js";

// The chips under the search; Med anteckningar can also be turned on by the hint that the notes hold
// the words, which then searches the whole manuscript too.
export function useChips(project: Project | null, setOn: (isOn: boolean) => void) {
  const [only, setOnly] = useState<string[]>([]);
  const chips = (project ? searchChips(project) : []).map((chip) => ({
    ...chip,
    isOn: only.includes(chip.id),
  }));
  const toggleChip = (id: string) =>
    setOnly(only.includes(id) ? only.filter((each) => each !== id) : [...only, id]);
  const showNotes = () => {
    setOn(true);
    setOnly(only.includes(WITH_NOTES) ? only : [...only, WITH_NOTES]);
  };
  return { only, chips, toggleChip, showNotes };
}
