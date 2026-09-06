/**
 * `ReadingRoomView` used to be paired with a `ViewToggle` component here —
 * a manual Journey/Atlas segmented control shared by every reading room's
 * `*IndexView` (`FoundationsIndexView`, `AgenticIndexView`, `LLDIndexView`,
 * `CaseStudiesIndexView`). Removed once all four settled on tying `view`
 * directly to theme instead (Paper -> "journey", dark -> "atlas" — see any
 * of those files' own `view` comment for the reasoning), since the choice
 * is no longer a per-visitor toggle to render. The type stays: every
 * `*IndexView` still types its derived `view` constant against it, and
 * `ReadingRoomJourney`/`ReadingRoomAtlas` are still two real, separately
 * maintained layouts under the hood — this is just how callers pick one.
 */
export type ReadingRoomView = "journey" | "atlas";
