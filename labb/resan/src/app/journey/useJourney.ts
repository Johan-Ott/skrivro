import { useCallback, useEffect, useRef, useState } from "react";
import { badgeForHour, badges, reachedBadges } from "../../project/badges.js";
import {
  celebrationsBetween,
  goalReached,
  journeySummary,
  type Celebration,
} from "../../project/inkwell.js";
import {
  INK,
  mergedJourney,
  NO_JOURNEY,
  withHoliday,
  withInk,
  withBadge,
  withWords,
  type Journey,
} from "../../project/journey.js";
import { dayKey } from "../../project/stats.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import { thisDevice } from "../useWritingStats.js";
import { celebrate, takeBadge, takeInk } from "./journeyEvents.js";
import { libraryOf, readJourneys, writeOwnJourney } from "./journeyFile.js";
import { t } from "../../i18n/i18n.js";

interface Loaded {
  library: string;
  own: Journey;
  others: Journey;
}

function useLoadedJourney(libraryDir: string | null) {
  const loaded = useRef<Loaded | null>(null);
  const [journey, setJourney] = useState(NO_JOURNEY);
  useEffect(() => {
    loaded.current = null;
    void (async () => {
      const library = await libraryOf(libraryDir);
      const { own, others } = await readJourneys(platform.fileSystem, library, thisDevice());
      loaded.current = { library, own, others };
      const all = mergedJourney([own, others]);
      setJourney(all);
    })().catch(recordFailure("Skrivresan kunde inte läsas"));
  }, [libraryDir]);
  return { loaded, journey, setJourney };
}

// What the numbers reached after a change is unlocked with it.
function withReachedBadges(own: Journey, others: Journey, today: string) {
  const all = mergedJourney([own, others]);
  return reachedBadges(journeySummary(all, today), all.badges).reduce(
    (journey, badge) => withBadge(journey, badge.id, today),
    own,
  );
}

const newBadges = (before: Journey, after: Journey): Celebration[] =>
  badges()
    .filter((badge) => after.badges[badge.id] && !before.badges[badge.id])
    .map((badge) => ({
      kind: "badge",
      title: t("Ny utmärkelse: {name}", { name: badge.name }),
      // The hint says how to earn it, which reads as a request once it is earned.
      text: t("Den finns nu i din profil."),
    }));

type Change = (update: (own: Journey, today: string) => Journey, isGoalReached?: boolean) => void;

// Saved one change at a time; what the change reached is celebrated.
function useJourneyChange(
  loaded: { current: Loaded | null },
  setJourney: (journey: Journey) => void,
): Change {
  const queue = useRef(Promise.resolve());
  return useCallback(
    (update, isGoalReached = false) => {
      queue.current = queue.current
        .then(async () => {
          const current = loaded.current;
          if (!current) return;
          const today = dayKey(Date.now());
          const before = journeySummary(mergedJourney([current.own, current.others]), today);
          const own = withReachedBadges(update(current.own, today), current.others, today);
          await writeOwnJourney(platform.fileSystem, current.library, thisDevice(), own);
          loaded.current = { ...current, own };
          const all = mergedJourney([own, current.others]);
          setJourney(all);
          if (isGoalReached) celebrate(goalReached(all.words[today] ?? 0));
          celebrationsBetween(before, journeySummary(all, today)).forEach(celebrate);
          newBadges(current.own, own).forEach(celebrate);
        })
        .catch(recordFailure("Skrivresan kunde inte sparas"));
    },
    [loaded, setJourney],
  );
}

// The words, the daily goal's ink and badge, and a badge for writing at night or dawn.
function written(own: Journey, today: string, words: number, isGoalReached: boolean) {
  const hourBadge = badgeForHour(new Date().getHours());
  let journey = withWords(own, today, words);
  if (isGoalReached) journey = withBadge(withInk(journey, today, INK.goal), "dagens-mal", today);
  return hourBadge ? withBadge(journey, hourBadge, today) : journey;
}

/** The writer's journey in every book, on every device. */
export function useJourney(libraryDir: string | null) {
  const { loaded, journey, setJourney } = useLoadedJourney(libraryDir);
  const change = useJourneyChange(loaded, setJourney);
  useEffect(() => {
    takeInk((points) => change((own, today) => withInk(own, today, points)));
    takeBadge((id) => change((own, today) => withBadge(own, id, today)));
    return () => (takeInk(null), takeBadge(null));
  }, [change]);
  return {
    journey,
    /** Words a save added; reaching the book's daily goal gives its ink once. */
    record: (words: number, isGoalReached: boolean) =>
      change((own, today) => written(own, today, words, isGoalReached), isGoalReached),
    setHoliday: (isOn: boolean) => change((own, today) => withHoliday(own, isOn, today)),
  };
}
