# explain_contributor-pipeline.md — how the frontend half actually works

Backend shapes and decisions live in the backend repo's
`engineering-studio-backend/masterdoc/phase-contributor-pipeline/` —
this doc is strictly "how does this frontend's code call it and render
it," the same split `masterdoc`'s own README draws between itself and
this folder.

## Three API-client modules, one shape each

`src/lib/api/contributions.ts`, `bugReports.ts`,
`contributorApplications.ts` all follow the exact same two-line-per-call
shape every other API module here does (`leaderboards.ts`, `progress.ts`)
— a thin wrapper over `authenticatedRequest` (`src/lib/auth/authStore.ts`),
which itself handles the bearer token and a refresh-and-retry-once on a
401. None of these three modules have any state, caching, or retry logic
of their own — every page that uses them owns its own `useState`/
`useEffect` fetch, same pattern `progress/page.tsx` already established.

## `/contribute` — three states gated on `user.role`

`src/app/contribute/page.tsx`'s top-level branch (around the `!user` /
`!canContribute` checks) is exactly three cases:

1. **Guest** (`!user`) — a plain "Sign in" prompt, nothing else.
2. **Plain USER** (`!canContribute`) — renders `ContributorApplicationPanel`,
   a local component in the same file. This is the actual self-service
   apply flow:
   ```
   ContributorApplicationPanel
     on mount: getMyContributorApplications() -> applications[0] is the
               most recent (backend orders by createdAt desc)
     applications[0].status:
       (none)    -> "Apply to be a Contributor" button -> applyToContribute()
       PENDING   -> "Pending review" badge, no button
       APPROVED  -> "Approved — sign out and back in to pick up your new
                     access" (see the JWT-staleness note below)
       REJECTED  -> the apply button again, plus a small "wasn't approved,
                     you can apply again" note
   ```
   No form fields anywhere in this flow — `applyToContribute()` is a bare
   `POST` with no body (the backend's own decision, see its
   decisions.md #6: the ranking is based on real stats, not a pitch).
3. **CONTRIBUTOR/ADMIN** (`canContribute`) — the actual submission form
   (category/title/body/link) plus a table of everything that user has
   ever submitted, via `getMyContributions()`.

### The JWT-staleness UX

The backend's role change takes effect immediately in the database, but
an already-issued access token keeps its old role claim until it expires
or is refreshed (`phase-1-auth-rbac/industry.md`'s documented trade-off).
Rather than trying to silently force a token refresh, the APPROVED
branch above just tells the user directly what to do about it — the
simplest correct UX for a trade-off this project already decided not to
engineer around.

## `/admin` — three independent panels, one page

`src/app/admin/page.tsx` is one page-level `isAdmin` gate, then three
sibling local components — `ContributionsPanel` (inline in the main
component), `BugReportsPanel`, `ContributorApplicationsPanel` — each with
its own `load()`/`useEffect` fetch and its own approve/reject handlers.
They're independent by design: reviewing a bug report never needs to
know anything about the contribution queue's state, so there's no shared
"admin dashboard state" object tying them together, just three panels
that happen to sit on one page.

`ContributorApplicationsPanel` renders exactly what
`GET /contributor-applications/top` returns — already capped at 5,
already sorted by priority score server-side (see the backend's
`explain_contributor_pipeline.md`). This page does no client-side
filtering or re-sorting of its own; if the top-5 cap or the priority
formula ever needs to change, that's a backend-only change, this
component just renders whatever list comes back.

## `PrimaryNav`'s role-conditional tab

`src/components/layout/PrimaryNav.tsx` calls `useAuth()` directly (it's
not a Context consumer — `useAuth` is a plain `useSyncExternalStore`
hook, see `authStore.ts`'s own header comment) and builds one extra
`NavSection` on top of the fixed three (Learning/Problems/Workshop):

```
status !== "ready" || !user  -> no extra tab at all
user.role === "CONTRIBUTOR"  -> "Contribute" tab -> /contribute
user.role === "ADMIN"        -> "Admin" tab -> /admin
user.role === "USER"         -> no extra tab
```

Never both, and never rendered before `status === "ready"` — the same
"don't flash the wrong state" rule `AuthStatus` already follows, so a
guest or a plain USER never sees a tab flicker in only to disappear once
the real auth state resolves.

## `ReportBugButton` — mounted once, globally

`src/components/support/ReportBugButton.tsx` is mounted a single time in
the root layout (`src/app/layout.tsx`, alongside `AuthBootstrap`), not
per-page — every page gets it for free. It renders nothing at all
(`return null`) until `useAuth()` resolves to a real signed-in user; any
role can file one (`hasAnyRole` isn't even checked client-side — the
backend's own `isAuthenticated()` gate is the real enforcement, this is
just "don't show the button to a guest"). `route`/`navigator.userAgent`
are captured automatically at submit time from `usePathname()` and the
browser itself — the reporter only ever types the description.

Positioned bottom-*left*, not bottom-right — the Workshop canvas's own
React Flow `Controls`/`MiniMap`/attribution already own that corner on
`/workshop`, and this button needed to stay out of their way everywhere,
not just there.
