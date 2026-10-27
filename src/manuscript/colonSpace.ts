/** A label and its answer can stand together in the plain text, "Första gången:Kikaren". At least
 * two letters come before the colon, so "1:a", "3:e" and "S:t Erik" are left as they are. */
export const spaceAfterColon = (text: string) => text.replace(/(?<=\p{L}{2}):(?=\p{L})/gu, ": ");
