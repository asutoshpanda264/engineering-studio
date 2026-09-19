# explain_lock-in-mode.md — how Lock-In Mode actually works

## What this is (and what it isn't)

"Lock-In Mode" and "Batman Mode" are the **same feature** in the code —
`src/lib/lockInMode.ts`'s own docblock calls itself "State machine for
'Batman Mode' lock-in." Don't confuse it with the Workshop's separate
night-ops villain-attack mechanic (`WeaponWheel`, `VillainAttackPicker`,
`DetectiveVisionHUD` — injecting failures into a *simulation* run when the
`night-ops` theme is active). That's a different subsystem that happens to
share the same Batman branding and the same theme toggle as its entry
point. This doc covers only the localStorage state machine, the 3-chapter
lesson trilogy, and the victory screen.

The problem it solves: reading a Foundations or LLD lesson is normally a
passive, easy-to-bail-on activity. Lock-In Mode turns "read the next 3
lessons in this course" into a small committed run — a villain per lesson,
a one-question recall check to "defeat" them, and a victory screen at the
end — with just enough friction (a tab-close warning, no way to switch the
theme back mid-run) to make bailing a deliberate choice rather than an
absent-minded one.

## The state machine (`src/lib/lockInMode.ts`)

```ts
interface LockInState {
  active: boolean;
  chapters: [LockInLessonRef, LockInLessonRef, LockInLessonRef] | null;
  chapterIndex: 0 | 1 | 2 | 3;
  defeatedVillainIds: string[];
}
```

Persisted as plain JSON under `localStorage["engineering-studio:lock-in"]`,
with a module-level `cache` + `Set<listener>` + `useSyncExternalStore`
wiring — the same convention `problemProgress.ts` and (originally)
`ThemeProvider.tsx` already use, not this codebase's Zustand `persist`
middleware. Persisting isn't just a nicety here: a refresh mid-run should
resume the run, not silently drop it (that's also why there's a dedicated
test — see below — proving state survives a fresh module instance, i.e. a
simulated reload).

`chapterIndex` runs 0..3:

| Value | Meaning |
|---|---|
| 0, 1, 2 | Currently reading that chapter (villain `VILLAIN_SEQUENCE[chapterIndex]`) |
| 3 | Victory — all three villains defeated, no "current chapter" left |

`active` stays `true` all the way through the victory screen. Only
`resetLockIn()` (called from `VictoryScreen`) clears it back to
`INACTIVE_STATE`. This matters: `getActiveChapter(state)` returns
`undefined` once `chapterIndex === 3` even though `active` is still `true`
— callers that want "is a run in progress at all" must check `active`,
not `getActiveChapter`.

### The four operations

- **`startLockIn(chapters)`** — no-op (`false`) if a run is already
  active; otherwise writes `{active: true, chapterIndex: 0,
  defeatedVillainIds: []}` over the given 3 chapters.
- **`completeCurrentChapter()`** — no-op (`false`) if no run is active or
  it's already at victory (`chapterIndex === 3`); otherwise appends the
  current chapter's villain id to `defeatedVillainIds` and increments
  `chapterIndex` (2 → 3 lands on victory, not a cleared state).
- **`getActiveChapter(state)`** — derives `{lesson, villain}` for the
  current position, or `undefined` at victory/inactive.
- **`resetLockIn()`** — the only sanctioned way back to `INACTIVE_STATE`.

`lockInMode.test.ts` walks the full lifecycle end to end (start → defeat
chapter 1 → 2 → 3 → victory → no-op past victory → reset), and separately
proves persistence by calling `vi.resetModules()` mid-run to force a fresh
`cache` and re-importing the module — confirming state resumes from
`localStorage` alone, not the in-memory cache.

## How a run's 3 chapters get chosen (`resolveLockInChapters`)

An earlier version fixed the trilogy to one curated 3-lesson bundle,
startable only from its own chapter 1. Reworked after real use showed two
problems: it wasn't reachable from most lessons, and going off-track left
no way back to a working "Defeat" action (see the docblocks in
`lockInMode.ts` and `villains.ts` — the code itself carries this history).

Now (`src/content/lockIn/resolveChapters.ts`), a run can start from *any*
lesson in `foundations` or `lld`: chapter 1 is that lesson, chapters 2 and
3 are just the next two lessons in that course's own array order
(`FOUNDATION_LESSONS`/`LLD_LESSONS` — the same source of truth the
prev/next nav already reads). `resolveLockInChapters` returns `undefined`
when the lesson doesn't exist, or is one of the last two lessons of its
course (nothing left to fill chapter 2 or 3) — confirmed by
`resolveChapters.test.ts`'s boundary cases (defined for the
third-from-last lesson, `undefined` for the last and second-to-last).

The villains themselves (`src/content/lockIn/villains.ts`) are a **fixed,
reusable pack of 3**, decoupled from lesson content since which lessons
make up a run is now dynamic:

| Chapter | Villain | Epithet |
|---|---|---|
| 1 | Ra's al Ghul | The Demon's Head |
| 2 | The Joker | The Clown Prince of Crime |
| 3 | Bane | The Man Who Broke the Bat |

Order mirrors the Nolan trilogy (Begins → Dark Knight → Dark Knight
Rises), which is also why each villain's `taunt` escalates in tone across
chapters even though none of them reference specific lesson content
anymore.

## Entering a run — the theme toggle as the trigger (`LockInEntryPrompt`)

There's no standalone "Start Lock-In" button. `LockInPanel` (mounted on
every `/foundations/[slug]` and `/lld/[slug]` page) always renders
`LockInEntryPrompt`, which watches the current theme via `useTheme()` and
compares it against the previous render's theme with a `useRef`. The
instant it sees a transition *into* `"night-ops"` while reading a lesson
(and no run is already active, and `resolveLockInChapters` succeeds for
this lesson), it pops a confirm modal: "Enter Batman Mode?" with Chapter
1's villain named and a "Start Lock-In" / "Not now" choice. Declining just
leaves the theme switched — the toggle already did its own job, the modal
doesn't revert it.

## While a run is active

Three components enforce the run, each with a narrow, separate job:

- **`LockInGuard`** (mounted once in the root layout, alongside
  `NightOpsAtmosphere`) adds a `beforeunload` listener that triggers the
  browser's native "leave site?" confirm, and renders an always-visible
  floating pill bottom-right on every page except the one it would link
  to — "Batman Mode active — return to {villain} →" mid-run, or "...return
  to claim victory →" once `chapterIndex === 3` and the target is
  `/batman-mode/victory` instead of a lesson. An earlier version tried
  a *hard* lock here — a history-buffer trap plus a forced router redirect
  bouncing any off-track page back — but that turned out fragile (subtle
  bugs from fighting Next's own history/router-cache) and confusing to
  reason about, so it was deliberately simplified to "nag + always-visible
  way back," not "trap." The pill is the only thing that reaches
  in-app `<Link>`/button navigation, since `beforeunload` only fires on
  tab-close/refresh/typed-URL navigation, not client-side routing.
- **`LockInHeaderNav`** wraps a lesson page's header row (the "All
  lessons" link and the theme toggle + "Open Workshop" button). While a
  run is active it swaps both slots for plain non-interactive "Locked" /
  "Batman Mode" indicators instead of rendering them — this is what
  actually closes the escape hatch `LockInGuard` can't reach, since losing
  the theme toggle mid-run means there's no way to step back out of
  `night-ops` (the trigger condition) at all.
- **`HideWhileLockedIn`** hides the prev/next-lesson nav row during a run
  — it walks the whole course sequence rather than the trilogy's 3
  chapters, so during a run it's just an escape hatch worth removing, not
  something that needs a locked-state placeholder in its place (unlike the
  header slots above).

## Advancing a chapter — the interrogation gate (`LockInChapterAction`)

Mounted near Summary/Exercise on a lesson page, only rendering when *this*
lesson is the active run's current chapter. Clicking "Defeat {villain}"
no longer advances on trust alone: it calls
`buildInterrogationQuestion(lesson)` (`src/lib/villainInterrogation.ts`),
which builds a one-question multiple-choice from the lesson's own
authored `keyTakeaways` array — one true takeaway from the lesson just
read, plus 2 decoys drawn from every *other* lesson's takeaways across
both courses, shuffled. Writing hand-vetted quiz content for all ~35
lessons wasn't practical and risked getting facts wrong for lessons the
question-writer wasn't written against; reusing each lesson's already
curated `keyTakeaways` sidesteps that without inventing new content.

Answering wrong just re-shows the taunt with no attempt limit — same "soft
enforcement, never trap the user" contract as the rest of the feature, one
step past "did you click the button." If `buildInterrogationQuestion`
returns `null` (lesson has no `keyTakeaways` yet, or there isn't enough
decoy material anywhere in the course), it falls back to the old
trust-based advance rather than blocking progress on missing content.

On a correct answer, `advance()` does three things in one step:
`completeCurrentChapter()`, sync that module's own arcade-map progress
(`markLessonComplete`/`markLLDLessonComplete` — a chapter finished via
Lock-In is still a lesson genuinely read, so the regular course map should
reflect it too), then route to the next chapter's lesson or
`/batman-mode/victory` if that was chapter 3. This has to happen in one
step: once `completeCurrentChapter()` advances `chapterIndex`, this page
no longer matches the (now-advanced) active chapter, so a separate
"continue" click after the question would land on a page with nothing left
to show a way forward — refreshing mid-transition would be a dead end
otherwise.

`LockInChapterBanner` (top of the lesson page, informational only — no
action) shows which villain/chapter this is, plus — for chapters 2 and 3
only — a one-line recap of the *previous* chapter's `defeatLine`, since
`completeCurrentChapter()` routes straight to the next lesson with no
separate "you defeated them" interstitial in between.

## Victory (`/batman-mode/victory`, `VictoryScreen.tsx`)

Reads `useLockInState()` directly rather than taking props — there's
nothing to pass through a route, only what's already in `localStorage`.
`isVictory = state.active && state.chapterIndex === 3`. If someone
bookmarks or types this URL without actually finishing a run (or reaches
it after `resetLockIn()` already ran), it renders a plain "nothing to show
right now" fallback with a link back to `/learn`, rather than a
broken/blank screen. On a real victory it lists all 3 villains with their
`defeatLine`s and a "Return to Gotham" button that calls `resetLockIn()`
then routes to `/learn` — the one sanctioned exit from an active run.

## Signed-in vs. guest

No distinction exists, anywhere in this feature. The entire state machine
is plain `localStorage`, gated on nothing but "is a run active" —
`AuthBootstrap`, `AppHeader`, and every other auth-aware surface in the
codebase have no lock-in-specific branching (confirmed by grep: the only
mentions are docblock cross-references to where `LockInGuard`/
`LockInHeaderNav` are mounted). A guest and a signed-in student get an
identical Lock-In experience.

This isn't Lock-In deferring to some other layer, either —
`markLessonComplete`/`markLLDLessonComplete` (`foundationsProgress.ts`/
`lldProgress.ts`), the calls `advance()` makes to keep the arcade map in
sync, are the *same* stopgap `localStorage`-only pattern as
`lockInMode.ts` itself: each file's own header comment says plainly "no
accounts exist yet," to be superseded by server-side progress once a
real backend lands. So the whole chain — chapter advance, map sync,
Lock-In state — is guest/signed-in-agnostic today, top to bottom, not
just the Lock-In layer.

## Where this doesn't apply

`LockInPanel`/`LockInChapterAction` are wired into `/foundations/[slug]`
and `/lld/[slug]` only. `/agentic/[slug]` deliberately opts out — its own
page docblock is explicit that adding a third trilogy here would need its
own villain pack and its own `courseModule` variant (`LockInLessonRef` is
a hardcoded `"foundations" | "lld"` union), and that's "a real, separate
design decision," not an oversight or a natural extension of that track's
content skeleton. `/case-studies` and `/entities` were never wired up
either — Lock-In has always been scoped to the two lesson-sequence
reading rooms, not every content track.
