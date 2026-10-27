// A new note starts with the caret in its first answer; a note opened again keeps the place it had.
// The one who makes the note asks, and the next text loaded into the editor takes the request.
let isAsked = false;

export const askForFirstAnswer = () => void (isAsked = true);

export function takeAskForFirstAnswer() {
  const wasAsked = isAsked;
  isAsked = false;
  return wasAsked;
}
