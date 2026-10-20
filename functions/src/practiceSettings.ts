/** Normalize the optional saved-deck selector from a Firebase callable payload.
 * Firebase clients may encode an omitted property as null. Both undefined and null
 * mean standard practice; only 1, 2 or 3 select a verified collection deck.
 */
export function parsePracticeDeckSlot(value: unknown): number | undefined {
  if (value == null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 3) {
    throw new Error('Invalid collection deck slot.')
  }
  return value
}
