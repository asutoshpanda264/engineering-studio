/**
 * Truncates to the last whole word within `maxChars`, appending an
 * ellipsis — a replacement for relying on `line-clamp-N`'s own visual cut,
 * which clips within the last partially-fitting word whenever it doesn't
 * fully fit inside the clamped box, rather than dropping that word
 * entirely (the landing page's scenario cards — long, multi-sentence
 * `Scenario.story` prose — were showing fragments like "…and ord…" for
 * "order" at the 4-column breakpoint's narrower card width). Pre-truncating
 * the string itself guarantees whatever gets shown always ends on a real
 * word, independent of the exact pixel width a particular breakpoint
 * happens to render at.
 *
 * `line-clamp` is still worth keeping alongside this in the caller's own
 * className — it's what makes the card's text region collapse to however
 * many lines the (now word-safe) truncated string actually needs, rather
 * than reserving a fixed height for the worst case. This function's job is
 * only to make sure that clamp's own cut, if it ever fires at all, lands
 * after `maxChars` was already a clean word boundary.
 */
export function truncateAtWord(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const clipped = text.slice(0, maxChars);
  const lastSpace = clipped.lastIndexOf(" ");
  const safe = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped;
  // Drop a trailing comma/period/etc. left dangling by the cut — "…thing."
  // followed by another "…" reads as a typo, not an intentional ellipsis.
  return `${safe.trimEnd().replace(/[.,;:!?]+$/, "")}…`;
}
