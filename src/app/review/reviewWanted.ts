// "Visa i Att kolla" on a phone goes back to the text and asks for Granska in the same breath; the
// phone closes Granska whenever a screen changes, so the request is kept for the screen that comes.
const KEPT_MS = 3000;
let askedAt = 0;

export const askForReviewOnNextScreen = () => void (askedAt = Date.now());

/** True once, for a request made a moment ago. */
export function takeAskForReview() {
  const isAsked = Date.now() - askedAt < KEPT_MS;
  askedAt = 0;
  return isAsked;
}
