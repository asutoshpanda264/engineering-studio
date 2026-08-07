<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Browser verification workflow

Don't open claude-in-chrome to manually verify every small UI/behavior
change as you make it — each browser session is expensive and this
habit turns a batch of related edits into a batch of separate,
redundant checks. Instead:

- After a change that would normally warrant a quick browser look
  (visual layout, an interaction, an animation, anything CSS/DOM you
  can't confirm from `tsc`/`vitest`/`lint` alone), add one line to
  `docs/BROWSER-CHECKS.md` describing what changed and what to look
  for, and move on.
- Only reach for claude-in-chrome when: the user explicitly asks you
  to check something in the browser right now, or you're doing a
  dedicated verification pass — at which point work through
  `docs/BROWSER-CHECKS.md` in one sitting, batching everything queued
  there into that single session, and delete each entry once
  confirmed (leave failed ones with a note instead of deleting them).
- `npx tsc --noEmit`, `npx vitest run`, and `npm run lint` still run
  after every change as normal — this only changes when a *browser*
  is involved, not automated verification.
