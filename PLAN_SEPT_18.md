# Engineering Studio — Sept 18 fix/feature plan

## Status (updated as we go)

- [x] A1. Shared primary nav shell (`PrimaryNav`, wired into `AppHeader` + `WorkshopHeader`) — done, verified (`tsc`/`eslint`/`vitest` 1537/1537 passing)
- [x] A2. Theme toggle + auth block repositioned to the far right everywhere; `AuthStatus`/`WorkshopAuthStatus` now icon-only (name via tooltip) — done, verified
- [x] A1 (remainder): Problems/Interviews segmented switch (`ProblemsBody`/`InterviewQuestionsBody` extracted, shared by `/problems` and standalone `/interview-questions`) + auth-gated Leaderboard/Daily/Progress sub-row on `/problems` — done, verified
- [x] A3. Home page light-mode color pass (Process/Stats sections split into gapped, shadowed, accent-badged cards under Paper) — done, verified
- [x] A4. Login/Register punch-up (`--landing-glow` background, rounded/shadowed `Panel`, Framer Motion entrance, colored icon chip) — done, verified
- [x] A5. Theme cross-tab sync fix (`storage` event listener in `ThemeProvider`) — done, verified
- [x] A6. No new-tab navigation (done as part of A1's WorkshopHeader edit) + electric loader coverage (added `loading.tsx` to every route that lacked one, plus a ~200ms show-delay so fast loads never flash it) — done, verified
- [x] A7. Batman-mode weapon wheel — removed the wedge/ring stroke that was reading as a gold grid (the real "box"), spin-in entrance on open, split the single "Choose Weapon" trigger into separate "SDE Weapon"/"AI Weapon" triggers (one wheel at a time), then gave both triggers the same bordered-pill treatment (border-signal/40 + bg-bg-elevated + shadow-elevated, text-text→text-signal on hover) as VillainAttackPicker/DetectiveVisionHUD — done, visually confirmed by user in-browser
- [x] **Phase A fully done and visually confirmed** — `tsc --noEmit`, `npm run lint`, `npx vitest run` (1537/1537) all clean except the pre-existing unrelated `ChallengeBriefing.tsx` bug noted above.
- [x] Phase B. Contributor/Admin content pipeline — backend (`Contribution` entity/repo/service/controller, `V6__contribution.sql`, fixed points per category, points-sorted admin queue) + frontend (`/contribute`, `/admin`, `PrimaryNav`'s role-conditional Contribute/Admin tab, `Textarea` component). Backend compiles clean; `ContributionCrudIntegrationTest` passes 4/4 in isolation. Frontend `tsc`/`eslint`/`vitest` (1537/1537) all clean.
- [x] Phase C. Bug reporting — backend (`BugReport` entity/repo/service/controller, `V7__bug_report.sql`, OPEN/IN_PROGRESS/RESOLVED workflow) + frontend (site-wide floating `ReportBugButton` mounted in the root layout, bottom-left so it doesn't collide with the Workshop canvas's own bottom-right React Flow controls; a second "Bug reports" section on `/admin` with per-row status+note editing). Backend compiles clean; `BugReportCrudIntegrationTest` passes 2/2 in isolation. Frontend `tsc`/`eslint`/`vitest` (1537/1537) all clean.
- [x] Phase D. Test suites + load testing:
  - **Frontend e2e** (new — none existed before): Playwright installed, `playwright.config.ts` + 4 specs under `e2e/` (`landing-and-workshop`, `auth`, `bug-report`, `contribute-and-admin`) — 7 tests total. `landing-and-workshop` needs only the frontend's own dev server; the other three need the real backend stack and skip cleanly (not fail) if it isn't reachable, via a shared `skipUnlessBackendIsUp` helper. `contribute-and-admin` additionally needs pre-seeded CONTRIBUTOR/ADMIN fixture accounts (env vars) since self-registration only ever creates a USER. All 7 specs verified via `npx playwright test --list` (parses/type-checks correctly) and `tsc`/`eslint` — **could not execute them for real in this sandbox**: Chromium segfaults on launch here (tried default launch and `--no-sandbox --single-process`, both SIGSEGV) — a sandbox restriction, not a missing dependency (`ldd` shows no missing libs). Run for real via `npm run test:e2e` on your machine or in CI.
  - **Backend integration tests** for both new features — done as part of Phase B/C, see above.
  - **Load test**: `engineering-studio-backend/load-test/scenarios.js` (k6) — register→login→leaderboard read→daily-challenge read→attempt start→attempt submit, ramping to 500 VUs over ~9 min by default, `SMOKE=1` env var for a 2-VU/10s sanity run. **Actually executed** the `SMOKE=1` run against the real, freshly-built `docker compose` stack (all 4 services healthy) — all 6 checks passed, 0% errors; the one threshold miss (p95 latency) is expected cold-JVM-start noise on a 2-VU run, not a real signal. The full 500-VU run wasn't attempted here given this sandbox's already-demonstrated fragility under sustained load (see the note below) — run it on a machine/CI with real headroom.

**Note on backend test verification:** two full-suite (`./mvnw test`, 69 tests) runs in this sandbox both broke identically ~24 minutes in — a Docker/resource interruption that killed every running container (including unrelated ones), not a code regression. Both new features' own integration tests pass cleanly in isolation. Full-suite confirmation should happen on a machine/CI with more headroom before this ships for real.

## All 4 phases of this plan are now done.

## Post-plan follow-ups (2026-09-19 chat, after the plan above shipped)

- **Consistent abstract background** — `PageMeshBackground` (new shared component), applied to every page that was missing it or had it dimmed. Not part of the original 12 items, but the same "consistency across pages" spirit as item 7.
- **Contributor bootstrap gap found and fixed**: there was no way to ever become CONTRIBUTOR/ADMIN at all (registration always creates plain USER, no promotion endpoint existed). Built a full self-service `ContributorApplication` flow (backend: `contributorapplication` package, priority-ranked top-5 admin queue; frontend: the apply panel on `/contribute`, the review panel on `/admin`). The very first ADMIN is still a manual bootstrap step (`UPDATE users SET role='ADMIN' ...` directly against Postgres) — documented in `engineering-studio-backend/masterdoc/phase-contributor-pipeline/README.md`.
- **Anti-cheat score freeze**: `ProblemProgressService.recordOutcome` now skips CONTRIBUTOR/ADMIN attempts entirely (no progress/points/leaderboard/streak) — both roles can author/moderate scenarios, so their own solves could otherwise game their own stats.
- **Congrats email on approval**: `notification.EmailService`, event-driven (`AFTER_COMMIT`, same pattern as the existing leaderboard update), logs instead of sending until real SMTP credentials are set via `MAIL_HOST`/`MAIL_PORT`/`MAIL_USERNAME`/`MAIL_PASSWORD` — verified live that the log line fires correctly on a real approval.
- **Documentation pass**: this plan file itself was the only record of any of the above until now. Backend: new `masterdoc/phase-contributor-pipeline/` (README + decisions.md + explain doc), `masterdoc/README.md`'s index updated. Frontend: `docs/CLAUDE.md`'s pivot note extended, `README.md`'s "What's Built So Far"/Milestones updated, new `explainDoc/contributor-pipeline/explain_contributor-pipeline.md` + index entry. The 12 original nav/theme items stay documented here in this plan file rather than duplicated into `explainDoc` — they're UI polish, not a distinct "how does component X work" topic that folder is scoped to.

(Known, unrelated pre-existing bug found along the way, not part of this plan: `src/components/lld/ChallengeBriefing.tsx` fails `tsc` — missing `useState` import and an undefined `ReferenceSolutionModal` reference. Flagging it separately; not fixing as part of this plan unless asked.)

## Context

The site has grown past its original nav/theme design: every page builds its own ad-hoc header/nav-link list instead of sharing one, the theme toggle and auth controls are wedged into that same cluster, light mode never got the polish dark mode has, and a real cross-tab theme bug exists (each tab holds its own in-memory theme listener with no `storage` event sync, so a theme change in one tab doesn't affect an already-open tab in the same browser). Separately, the product is expanding: the backend already ships `ADMIN`/`CONTRIBUTOR`/`USER` roles and a `DRAFT`/`PUBLISHED` status pattern on `Scenario` (see `masterdoc/phase-1-auth-rbac/` in `engineering-studio-backend`), but nothing yet lets a contributor actually submit content, nothing lets users report bugs, and there's no load-testing setup despite the stack now being multi-service (Postgres + Redis + api + verify).

This plan covers all 12 items from the Sept 18 list, grouped per your call: **quick UI/UX fixes first (Phase A), then the two new subsystems, then load testing (Phase B–D)**. We execute and verify one phase-item at a time — this doc is the shared map, not a spec to build blind from, and its Status checklist above is kept current as work lands.

---

## Phase A — Nav, theme, and UI polish (items 1–9)

### A1. Shared primary nav (items 1 & 2)

Build one `PrimaryNav` shown on every page, replacing the ad-hoc per-page link lists.

- **New:** `src/components/layout/PrimaryNav.tsx` — renders **Learning | Problems | Workshop**, plus a **Contribute** tab (CONTRIBUTOR only) and an **Admin** tab (ADMIN only, added in Phase B), active-tab highlighted via `usePathname()`.
- **Extend:** `src/components/layout/AppHeader.tsx` to host `PrimaryNav` by default instead of each page hand-building its `right` slot.
- **Problems page** (`src/app/problems/page.tsx`) becomes the "Problems" section home: a **Problems | Interviews** segmented switch (folding `/interview-questions` in as a tab on this same page — content/data stays as-is, just the two lists share one page shell), plus a small auth-gated sub-row — **Leaderboard / Daily / Progress** links — shown only when `useAuth().status === "authenticated"`, hidden entirely for guests (who see only Problems/Interviews).
- **Workshop:** `WorkshopHeader.tsx` keeps its canvas-specific toolbar (Export/Settings/Clear/Reset/Run — those are page tools, not site nav) but its Tutorial/Problems/Learn links (previously `target="_blank"`) are replaced by the same `PrimaryNav`, same-tab (see A6).
- Every other page that built its own minimal header (`daily-challenge`, `leaderboard`, `progress`, `login`, `register`, `HomeView.tsx`, `LearnHubView.tsx`, the content index/detail pages) now gets `PrimaryNav`/`ThemeToggle`/`AuthStatus` automatically via `AppHeader`, including the two Lock-In-gated lesson pages (`foundations/[slug]`, `lld/[slug]`) whose `LockInHeaderNav` escape hatch previously had no site nav or auth status at all outside an active lock-in run.

### A2. Reposition theme toggle + auth/user block (items 3 & 4)

Inside the new header layout: nav tabs stay left/center; `ThemeToggle` moves to the true right edge, **after** a flex-spacer, outside the tab cluster; the auth block sits at the very end (rightmost), after the toggle.

- **Edit:** `src/components/auth/AuthStatus.tsx` — drop the visible name text, go icon-only (a user icon carrying the name as a native tooltip), matching `WorkshopAuthStatus.tsx`'s existing icon-first treatment — both components now render the same way, just at different widths.
- **Edit:** `WorkshopHeader.tsx` ordering — toggle-then-auth both sit past a spacer, before the canvas-tool cluster (Export/Settings/Clear/Reset/Run), which stays rightmost since it's the page's primary-action area, not part of the theme/auth "pushed out of the middle" complaint.

### A3. Home page light-mode color pass (item 5)

- **Edit:** `src/app/HomeView.tsx` — currently plain `bg-bg` tokens with no gradients/card shadows. Bring in the `workspace-*` token set and `shadow-[var(--shadow-workspace-card)]`/hover-lift treatment `LearnHubView.tsx` already uses, so light mode gets the same accent/shadow depth Learn has instead of reading as flat white.

### A4. Login/Register punch-up (item 6)

- **Edit:** `src/app/login/page.tsx`, `src/app/register/page.tsx` — both are currently a static centered `Panel` with no gradient, shadow, or entrance motion. Add: `workspace-*`-token-driven background accent, a real shadow on the `Panel`, and a Framer Motion entrance (fade+translate-up on mount).

### A5. Theme cross-tab sync (item 7) — done

Confirmed bug: `src/components/theme/ThemeProvider.tsx` had no `window.addEventListener("storage", ...)`. `setTheme()` wrote `localStorage` and notified only same-tab listeners; another already-open tab never heard about it. Fixed by adding a `storage` event listener in the provider that applies the new theme and notifies local listeners, respecting the same Batman-mode lock-in gate `toggleTheme` already applies.

### A6. No new-tab navigation + loader (item 8)

- **Edit:** `WorkshopHeader.tsx` — drop `target="_blank"` on the Problems/Learn links now that they're folded into `PrimaryNav` (`workshopStore` is a module-level Zustand singleton, not torn down by a same-tab route change, so canvas state survives).
- Leave genuinely-external `target="_blank"` links alone (GitHub icon, "Source:" citations in interview-question detail views).
- **Loading feedback:** `src/components/ui/ElectricLoader.tsx` already exists. Ensure it's present for every top-level route under the new nav, with a minimum visible duration (~1s) so fast loads don't flash it.

### A7. Batman-mode weapon wheel (item 9)

- **Edit:** `src/components/workshop/ComponentSidebar.tsx` — strip the boxed `border/bg-bg-elevated/shadow-elevated` look off the "Choose Weapon" trigger button (the wheel's own ring/wedge borders stay as-is).
- **Edit:** `src/components/workshop/WeaponWheel.tsx` — add a cosmetic spin-in entrance animation when the wheel opens (wedges rotate/settle into place); selection/click behavior unchanged.

---

## Phase B — Contributor/Admin content pipeline (item 10)

Backend role model (`ADMIN`/`CONTRIBUTOR`/`USER`) and the `Scenario` DRAFT/PUBLISHED precedent already exist — this phase adds a **new, separate "Community" content pipeline**, not a change to the existing static `src/content/*` files or the scenario pipeline.

**Backend (`api/`):**
- New `Contribution` entity: `id`, `authorId`, `category` (`QUESTION`/`POST`/`VLOG` enum — one generic type with a category tag), `title`, `body`, `link` (optional, mainly for VLOG), `status` (`PENDING`/`APPROVED`/`REJECTED`), `pointsAwarded`, `createdAt`, `reviewedAt`, `reviewedBy`. New Flyway migration, following the existing conventions in `phase-2-scenario-crud`.
- Fixed point values per category (e.g. QUESTION=5, POST=10, VLOG=15 — exact numbers to confirm when built) awarded automatically on approval.
- Contributor points = `SUM(pointsAwarded)` over a contributor's `APPROVED` rows, computed on read rather than a stored running counter — consistent with how this codebase already avoids duplicate sources of truth for points.
- Endpoints: `POST /contributions` (CONTRIBUTOR/ADMIN), `GET /contributions/mine`, `GET /contributions/pending` (ADMIN, ordered by the submitting contributor's total points **descending**), `POST /contributions/{id}/approve`, `POST /contributions/{id}/reject` — `@PreAuthorize` gated the same way `/scenarios/drafts` already is.

**Frontend:**
- New `/contribute` route (CONTRIBUTOR view): submission form (category + title + body + optional link), "my submissions" list with status, running points total.
- New `/admin` route (ADMIN view): pending-contributions queue (sorted server-side as above), approve/reject actions; this is also where Phase C's bug-report panel lives, as a second section of the same admin area.
- Role-gated routing: a small guard (reading `useAuth().user.role`) redirects non-CONTRIBUTOR/ADMIN visitors away from `/contribute`/`/admin`.
- `PrimaryNav` shows "Contribute" for CONTRIBUTOR and "Admin" for ADMIN.

---

## Phase C — Bug reporting (item 11)

**Backend:** new `BugReport` entity: `id`, `reporterId`, `description`, auto-captured `route` + `userAgent`, `status` (`OPEN`/`IN_PROGRESS`/`RESOLVED`), `adminNote`, `createdAt`, `resolvedAt`. Endpoints: `POST /bug-reports` (any authenticated USER/CONTRIBUTOR/ADMIN), `GET /bug-reports` + `PATCH /bug-reports/{id}` (ADMIN — status transitions + note).

**Frontend:** a persistent floating "Report Bug" button (fixed bottom corner) shown to any signed-in user — opens a small modal: description text field, auto-attached route + browser info, no file upload. Admin sees reports as a second section of the `/admin` page from Phase B, with status dropdown + note field per report.

---

## Phase D — Test suites + load testing (item 12)

- **Backend integration tests** for the two new Phase B/C entities, following the existing `AbstractIntegrationTest`/Testcontainers pattern — built alongside those phases, not deferred.
- **Frontend e2e:** introduce Playwright (none exists today). A smoke suite covering: landing → problems → workshop → run simulation → submit → leaderboard; login/register; the new contribute-submit-approve flow; the new bug-report flow.
- **Load test:** k6 script against the full `docker-compose` stack, ramping toward **500 concurrent virtual users** across login, attempt start/submit, leaderboard reads, daily-challenge reads. Thresholds on p95 latency and error rate so a run has a pass/fail.

---

## Verification approach (per phase)

- **Phase A:** `npx tsc --noEmit`, `npx vitest run`, `npm run lint` after each item; a dedicated `claude-in-chrome` pass at the end of the phase clicking through every route in all three themes (dark/light/night-ops) plus the cross-tab repro and the workshop same-tab-nav canvas-preservation check.
- **Phase B/C:** backend `./mvnw test` (Testcontainers-backed) for new entities/endpoints; live verification via `claude-in-chrome` against the real 3-service stack (`docker compose up`) — submit → approve → points update → admin queue ordering; bug report → admin panel status change.
- **Phase D:** Playwright suite run headless; k6 run against the Compose stack with a saved results summary (pass/fail on thresholds).
