/** A request made in one place and taken once in another, as the next text or screen comes. One
 * that waited longer than `keptMs` is forgotten. */
export function askOnce(keptMs = Infinity) {
  let askedAt: number | null = null;
  return {
    ask: () => void (askedAt = Date.now()),
    take: () => {
      const isAsked = askedAt !== null && Date.now() - askedAt <= keptMs;
      askedAt = null;
      return isAsked;
    },
  };
}

// A new note starts with the caret in its first answer; a note opened again keeps the place it had.
// The one who makes the note asks, and the next text loaded into the editor takes the request.
export const firstAnswerAsk = askOnce();

// "Platshållare kvar" in Publicera on a phone goes back to the text and asks for Granska in the same breath; the
// phone closes Granska whenever a screen changes, so the request is kept for the screen that comes.
export const reviewAsk = askOnce(3000);

// A note just made unfolds its section in the tree, so the writer sees where it went; a note opened
// from Ctrl+K or a name leaves the section as it was.
export const newNoteAsk = askOnce(3000);
