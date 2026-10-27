// A note to self in the middle of a sentence: `[?]` or `[? check the train's name]`. It stays on
// one line; U+FFFC is how the editor's text shows a line break.
export const PLACEHOLDER = /\[\?[^\]\n￼]*\]/g;

/** What stands around the placeholder: about this many words before it, for finding it again. */
const WORDS_BEFORE = 6;

export function placeholdersIn(text: string): { from: number; to: number; text: string }[] {
  return Array.from(text.matchAll(PLACEHOLDER), (match) => ({
    from: match.index,
    to: match.index + match[0].length,
    text: match[0],
  }));
}

export function wordsBefore(text: string, position: number): string {
  return text.slice(0, position).trimEnd().split(/\s+/).slice(-WORDS_BEFORE).join(" ");
}

/** The text with each placeholder blanked out to spaces, so every other offset stays the same. */
export const withoutPlaceholders = (text: string) =>
  text.replace(PLACEHOLDER, (placeholder) => " ".repeat(placeholder.length));
