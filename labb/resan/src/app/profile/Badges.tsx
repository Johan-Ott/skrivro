import { badges, type Badge } from "../../project/badges.js";
import type { Journey } from "../../project/journey.js";
import { bookBadges } from "../../project/bookBadges.js";
import { numberLocale, t } from "../../i18n/i18n.js";

const dateOf = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString(numberLocale(), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

// A medal with the badge's first letter; dim and dashed until it is unlocked.
export function Medal({
  badge,
  day,
}: {
  badge: Pick<Badge, "name" | "hint">;
  day: string | undefined;
}) {
  return (
    <li className={day ? "badge" : "badge locked"} title={badge.hint}>
      <span className="badge-medal" aria-hidden="true">
        {badge.name.charAt(0)}
      </span>
      <span className="badge-name">{badge.name}</span>
      <span className="badge-when">{day ? dateOf(day) : badge.hint}</span>
    </li>
  );
}

/** The book's own badges, under the ones that count every book. */
function BookMedals({ book }: { book: { name: string; held: Record<string, string> } }) {
  const all = bookBadges();
  const unlocked = all.filter((badge) => book.held[badge.id]).length;
  return (
    <>
      <span className="field-label">
        {t("I {book}", { book: book.name })} ·{" "}
        {t("{done} av {count}", { done: unlocked, count: all.length })}
      </span>
      <ul className="badge-grid">
        {all.map((badge) => (
          <Medal key={badge.id} badge={badge} day={book.held[badge.id]} />
        ))}
      </ul>
    </>
  );
}

function FirstJourney({ held }: { held: Record<string, string> }) {
  const steps = badges().filter((badge) => badge.group === "resan");
  const done = steps.filter((badge) => held[badge.id]).length;
  return (
    <>
      <span className="field-label">
        {t("Första resan")} · {t("{done} av {count}", { done, count: steps.length })}
      </span>
      <ol className="first-journey">
        {steps.map((badge) => (
          <li key={badge.id} className={held[badge.id] ? "done" : ""}>
            <span className="first-journey-check" aria-hidden="true" />
            <span>{held[badge.id] ? badge.name : badge.hint}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

/** Första resan as steps to tick off, then every badge, unlocked or still to reach. */
export function Badges({
  journey,
  book,
}: {
  journey: Journey;
  /** The open book's; none on the shelf. */
  book: { name: string; held: Record<string, string> } | null;
}) {
  const milestones = badges().filter((badge) => badge.group === "milstolpe");
  const unlocked = milestones.filter((badge) => journey.badges[badge.id]).length;
  return (
    <section className="profile-badges">
      <FirstJourney held={journey.badges} />
      <span className="field-label">
        {t("Utmärkelser")} · {t("{done} av {count}", { done: unlocked, count: milestones.length })}
      </span>
      <ul className="badge-grid">
        {milestones.map((badge) => (
          <Medal key={badge.id} badge={badge} day={journey.badges[badge.id]} />
        ))}
      </ul>
      {book && <BookMedals book={book} />}
    </section>
  );
}
