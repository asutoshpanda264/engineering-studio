# Interview Questions — Research Tracker

Working doc for building the `/interview-questions` tab: real, company-tagged
system-design interview questions, sourced (not invented), one company at a
time. Don't bulk-generate — each company gets its own research pass so
sources can actually be checked instead of guessed at.

The schema, ship bar, and code touchpoints below are no longer guesses —
they're what the Google pass actually converged on after two research
passes and a pruning pass. Follow this directly for the next company
rather than re-deriving it.

## Workflow (per company)

1. **Pick the next `Not started` company below**, update its line to
   in-progress.

2. **Research broadly across these buckets** (skip a bucket only if the
   company genuinely has no public trail there — note that explicitly
   rather than silently omitting it):
   - General / classic system design
   - ML / AI system design (if the company hires for ML/AI-flavored roles)
   - FDE / agentic (only if the company has that or an equivalent role —
     thin public trail almost everywhere, don't over-invest here)
   - Scenario-based / operational (incident-response, "how would you
     upgrade/scale X" prompts)

   Search each bucket with `WebSearch` first (company + role + "system
   design interview questions", plus site-specific variants: `site:
   leetcode.com`, `site:teamblind.com`, a Glassdoor guide URL guess, an
   Exponent `?company=<name>&type=system-design` question-DB URL if one
   exists for that company). Also check: LeetCode's curated cross-company
   "Helpful list" post
   (https://leetcode.com/discuss/interview-question/1140451/) for a
   direct link to that company's thread section.

3. **Tooling — use `claude-in-chrome`, not `WebFetch`, for most of these
   sites.** `WebFetch` 403/429s on `leetcode.com`, `glassdoor.com`, and
   `interviewquery.com` (confirmed this pass) — a scripted fetch gets
   bot-blocked; an actual browser session doesn't. Don't burn a `WebFetch`
   retry loop on these — go straight to `claude-in-chrome` (`navigate` +
   `get_page_text`, or `computer` screenshot if `get_page_text` is denied
   for that domain). `WebSearch` itself is fine to use freely — it's the
   *fetch* of a specific page that gets blocked, not the search. Load the
   `claude-in-chrome` skill and its core tool set once at the start of a
   research session rather than reactively after the first 403.

4. **Tag every question's confidence as you record it:**
   - **High** — fetched the primary source page directly (browser or
     successful `WebFetch`) and confirmed the exact text.
   - **Medium** — came through only as a `WebSearch` snippet of a specific
     page; a direct fetch wasn't (yet) confirmed.
   - **Low** — cross-site consensus with no single verifiable source
     behind it, or a topic label rather than actual question text. Never
     ships to the content module — stays in this tracker as a lead to
     chase later, or gets dropped.

   Before trusting any prep/aggregator site you haven't used before (not
   just prachub.com — treat every new one this way), spend one fetch
   checking whether it cites an original source per question, or just
   asserts "real questions" with no per-item provenance. If it's the
   latter, its questions are Low confidence at best — don't quote them as
   if sourced.

5. **Record everything you find in this file's per-company "full research
   catalog" section** (see Google's below for the exact format: grouped by
   round type, numbered, confidence-tagged, deduped across sources,
   dates converted from "N ago" to an approximate absolute month). Do this
   even for entries that will end up excluded — this file is a permanent
   research record, not just a staging queue; don't delete research, only
   mark what didn't ship and why.

6. **Apply the ship bar before writing any code.** A question ships to
   `src/content/interviewQuestions/companies/<company>.ts` only if the
   prompt (or prompt + context together) has real specificity: concrete
   numbers, explicit constraints, a multi-part ask, or an actual
   narrative. A bare imperative like *"Design a rate limiter."* is a real
   reported topic but reads as a title, not a question a candidate could
   sit down and answer — it stays in the tracker, not the app. Expect
   roughly **15-25%** of the full catalog to clear this bar, based on
   Google's pass (8 of 34) — don't be surprised or second-guess the
   research if most of a company's catalog doesn't ship.

7. **Write an `optimalAnswer` for every question that ships** (see
   `types.ts`'s `OptimalAnswer` shape). This is *this app's own authored
   content*, not sourced from a candidate's real answer — say so in the
   file's doc comment, same as `google.ts` does, so nobody mistakes it for
   a leaked "real" answer. Structure, in order:
   - `clarifyingQuestions` — what a strong candidate asks/thinks through
     before designing anything (skip for pure-behavioral questions)
   - `requirements` — the functional + non-functional constraints locked
     in from the prompt
   - `approach` — one short paragraph framing the overall strategy
   - `keyPoints` — the core design decisions, in presentation order
   - `tradeoffs` — alternatives considered and why this approach wins
     (this is what interviewers actually probe — don't skip it)
   - `followUps` — where a sharp interviewer pushes next
   - `relatedLinks` — pointers into this app's own Foundations/LLD lessons
     or buildable Workshop scenarios. **Verify every slug/scenario id
     actually exists before linking**: `grep -n "slug:"
     src/content/foundations/lessons/*.ts` (or `lld/lessons/*.ts`), and
     `grep -n "^  id:" src/scenarios/*.ts` for `/workshop?scenario=`
     links. A broken link here is worse than no link.
   Behavioral/scenario questions get a thinner but still real answer
   (framework/sequence instead of an architecture) — see
   `google-fde-friction-point-behavioral` and
   `google-paged-2am-checkout-latency` in `google.ts` for the pattern.

8. **Code touchpoints to ship a company** (all of this already exists and
   is generic — a new company should need *zero* changes outside its own
   file and the two lines below):
   - Create `src/content/interviewQuestions/companies/<company>.ts`,
     following `google.ts`'s shape and doc-comment convention exactly.
   - In `src/content/interviewQuestions/index.ts`: import the new array
     and spread it into `INTERVIEW_QUESTIONS`. Nothing else in that file
     changes.
   - `src/app/interview-questions/page.tsx` and `.../[id]/page.tsx` need
     **no changes** — company/category filtering, the answer workspace,
     and the optimal-answer disclosure are all already generic over
     `INTERVIEW_QUESTIONS`.
   - `QuestionCategory` in `types.ts` already covers `system-design`,
     `ml-ai-system-design`, `lld-ood`, `fde-agentic`,
     `scenario-operational` — reuse these; only add a new category if a
     question genuinely doesn't fit any of them (check hard before adding
     one, it's a schema change every existing card/filter has to handle).

9. **Verify before calling it done**: `npx tsc --noEmit`, `npx vitest run
   src/content/interviewQuestions` (the validator test catches empty
   fields, low-confidence sources slipping through, and broken-looking
   related-link hrefs), `npm run lint`. Add one `docs/BROWSER-CHECKS.md`
   entry per the project's browser-verification workflow (`AGENTS.md`) —
   don't open a browser to check UI rendering mid-task, queue it.

10. **Update this file's status line** for the company (in-progress →
    done, with the shipped/total count, same as Google's line below) and
    add a dated entry to the shared "Research log" at the bottom
    summarizing what was found, what got blocked, and what's still open.

## Draft entry shape (per question)

```
N. **<Title>** — <Confidence: High|Medium> — [<Source name>](<url>), <reported date, ~absolute month>
   <Any extra one-line context: follow-up asked, level, notable detail>
```

Group entries under a `### <round type>` heading matching the research
buckets in step 2. This is the format the "full research catalog"
sections below actually use — copy it directly rather than the more
free-form template this doc used before the Google pass.

## Companies

### Big Tech
- [x] Google — 8 of 34 researched questions shipped to the app (see "Shipped to app" note below); no optimal answers yet
- [x] Meta — 13 of ~130 researched questions shipped to the app (see "Shipped to app" note below)
- [x] Amazon — 16 of 71 researched items shipped to the app (see "Shipped to app" note below)
- [x] Microsoft — 13 of 47 researched items shipped to the app (see "Shipped to app" note below)
- [x] Apple — 10 of 25 researched items shipped to the app (see "Shipped to app" note below)

### Hyper-scale consumer
- [x] Netflix — 8 of ~26 researched items shipped to the app (see "Shipped to app" note below) (elsewhere)
- [x] Uber — 6 of ~30 researched items shipped to the app (see "Shipped to app" note below)
- [x] Airbnb — 6 of ~27 researched items shipped to the app (see "Shipped to app" note below)
- [x] LinkedIn — 6 of ~23 researched items shipped to the app (see "Shipped to app" note below)
- [x] Twitter / X — 1 of ~13 researched items shipped to the app (see "Shipped to app" note below)

### Fintech / enterprise
- [x] Stripe — 4 of ~18 researched items shipped to the app (see "Shipped to app" note below)
- [x] PayPal — 5 of 15 researched items shipped to the app (see "Shipped to app" note below)
- [ ] Visa — In progress (2026-08-24)
- [x] Bloomberg — 6 of ~20 researched items shipped to the app (see "Shipped to app" note below)

## Google — shipped to app (2026-08-22)

The list below (39 items) is the full research catalog — but only **8** of
them actually shipped into `src/content/interviewQuestions/companies/google.ts`
and the `/interview-questions` tab. The bar: a one-line imperative like
*"Design a rate limiter."* is a real reported topic, but on a practice page
it reads as a bare title, not something a candidate could actually sit down
and answer — no numbers, no constraints, no narrative. Ship-worthy means the
prompt (or prompt + context together) gives real specificity: concrete
requirements, numbers, a multi-part ask, or an actual narrative.

**Shipped** (ids match `google.ts`): `google-metrics-logging-service` (#2),
`google-connection-degree-network` (#13), `google-ticketing-platform` (#18),
`google-ad-serving-decision-api` (#19), `google-translation-service` (#20),
`google-pharmacy-shop-class-design` (#22), `google-fde-friction-point-behavioral`
(#33), `google-paged-2am-checkout-latency` (#34).

**Left in this tracker only** — real, sourced, but too thin to stand alone
as a practice question: every bare "Design X." Exponent-DB/blog item (#1,
3–12, 14–17, 21, 23–27), the generic troubleshooting scenario with no named
service or specifics (#35), and the four short "How would you…"/"What
should…" ops and product-sense questions (#36–39). If any of these later
gets a real elaboration (a specific candidate account with actual detail,
not just a topic-database title), promote it into `google.ts` then.

## Google — full research catalog (2026-08-22 research pass)

Questions only, no optimal answers yet (per instruction — answers come in a
later pass). Grouped by round type since Google's own reqs span classic SWE
system design, ML/GenAI system design, and the newer FDE/agentic track.
Each entry carries a **confidence** tag:

- **High** — fetched the primary source page directly and confirmed the text.
- **Medium** — came through as a search-index snippet of a specific page;
  the site blocked a direct fetch (403/429) so the exact wording is
  secondhand, not independently reread.
- **Low** — consensus across several prep/aggregator sites with no single
  verifiable candidate report behind it, or a topic label rather than an
  actual question. Needs a better source before it ships to the app, or
  should ship labeled as "commonly-covered topic" rather than a quoted
  question.

Dates below are relative-to-fetch ("N ago" as reported on 2026-08-22),
converted to an approximate month — treat as approximate, not exact.

### General / classic system design
1. **Design a rate limiter** — High — [Exponent question DB](https://www.tryexponent.com/questions?company=google&type=system-design), reported ~2026-08-18 (4 days ago)
2. **Design a metrics and logging service** (also phrased "design a logs and metrics pipeline... collect them, process in under a minute, serve to downstream consumers") — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design) (~2026-08-20, 2 days ago) + [Exponent blog](https://www.tryexponent.com/blog/google-system-design-interview)
3. **Design a web crawler** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2026-06 (2 months ago)
4. **Design an ad aggregation system** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2026-08-01 (22 days ago)
5. **How would you build a URL shortener (TinyURL)?** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2026-05 (3 months ago)
6. **Design a Distributed LRU Cache** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2026-05 (3 months ago)
7. **Design a reservation and payment system for a parking garage** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2025-08 (1 year ago)
8. **Design a system to deny service to requests from banned IPs** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2025-08 (1 year ago)
9. **Design a system to log messages in order** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2025-08 (1 year ago)
10. **Design a language detection system** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2024 (2 years ago)
11. **Design a distributed file system** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2024 (2 years ago)
12. **Design TikTok** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2022 (4 years ago)
13. **Design a connection-degree system for a professional network** (LinkedIn-style — given millions of users, opening a profile must instantly show 1st/2nd/3rd-degree connection) — High — [Exponent blog](https://www.tryexponent.com/blog/google-system-design-interview); interviewer reportedly pushed back when candidate proposed a hosted graph DB and asked for the traversal built from scratch
14. **Design a video distribution service** — High — [Exponent blog](https://www.tryexponent.com/blog/google-system-design-interview)
15. **Design a mobile image-search client** — High — [Exponent blog](https://www.tryexponent.com/blog/google-system-design-interview)
16. **Design a Google-scale product such as Maps or YouTube** (open-ended, interviewer picks the product) — High — [Exponent blog](https://www.tryexponent.com/blog/google-system-design-interview)
17. **Design a low-power mesh network for detecting temperature/moisture** (asked at L4/L5) — High — [Blind](https://www.teamblind.com/post/Google-system-design-interview-questions-MwvJeDee)
18. **Design a ticketing platform** (locking tickets per user, releasing on timeout, queueing for massive on-sale events, computing optimal concurrent active users, fraud prevention — think Ticketmaster) (asked at L5) — High — [Blind](https://www.teamblind.com/post/Google-system-design-interview-questions-MwvJeDee)
19. **Design an ad-serving decision API** — given an AdId with a total budget that decreases on each impression, decide whether to show it; must be highly available, low-latency, and scalable, with some tolerance for budget-accounting error — Medium — LeetCode Discuss (indexed via search; direct fetch returned 403, so wording is via search snippet not a reread page)
20. **Design a translation service like Google Translate** — full requirements as reported: English → one target language for now, one meaning per word for now, high availability + low latency, ~100M translations/day, ~100k words per language — how would you store/serve that at scale? — High — [LeetCode Discuss, posted Jun 2019, retitled Aug 2023](https://leetcode.com/discuss/interview-question/system-design/318811/Google-or-System-design-or-Design-a-translation-service-like-Google-Translate), confirmed via full page reread (Chrome, bypasses LeetCode's bot block on scripted fetches); 17 comments discussing trie-in-a-DB, Elasticsearch/Lucene, seq2seq
21. **Design a video-sharing platform like YouTube** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/496042/Design-video-sharing-platform-like-Youtube) — confirmed to exist as a real Google-tagged thread via the curated [LeetCode "Helpful list" post](https://leetcode.com/discuss/interview-question/1140451/helpful-list-of-leetcode-posts-on-system-design-at-facebook-google-amazon-uber-microsoft) (title/thread only, not yet reread in full — do that before shipping if more detail is wanted beyond what's already covered by #16)

### LLD / OOD-flavored ("system design" round, but object design not distributed systems — Google's own candidates argue about which this even is)
22. **Design a class model for a pharmacy shop**: a Pharmacist writes prescriptions, a Cashier takes payment, a Manager manages employees and can also cover as cashier/pharmacist; follow-up: redesign for 100+ managers/employees each with multiple, overlapping job types — High — [LeetCode Discuss, Jun 2020](https://leetcode.com/discuss/interview-question/system-design/692383/Google-or-Onsite-or-Design-a-organization-pharmacy-shop-with-managers), Google | Onsite | System Design tag, full page reread; a commenter explicitly asks "is this HLD or LLD? What does Google even consider a System Design round?" — worth keeping that ambiguity visible rather than force-categorizing. Good candidate for this app's `src/content/lld/` track instead of/in addition to a distributed-systems interview tab.

### ML / GenAI system design (ML Engineer & AI-track roles)
23. **Design an LLM-based Q&A system** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2026-03 (5 months ago)
24. **Design a retrieval-augmented generation (RAG) system over a customer's private data** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2026-05 (3 months ago)
25. **Design an ML experiment tracking and analysis platform** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2025-12 (8 months ago)
26. **Design a denoising system for sounds** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2025-08 (1 year ago)
27. **Design a small LLM that could run on a phone, while keeping it polite** (on-device GenAI, safety framing) — Medium — search-summary of [IGotAnOffer's GenAI system design interview guide](https://igotanoffer.com/en/advice/generative-ai-system-design-interview) (403 on direct refetch via WebFetch; not yet retried via browser — do that before shipping)
28. **Design a system to detect if multimedia/ad content violates terms of service** — Low — cross-site consensus (interviewquery.com, systemdesignhandbook.com); **checked directly via browser this pass** — [InterviewQuery's Google ML Engineer guide](https://www.interviewquery.com/guides/google-ml-engineer) does *not* contain this question (its 30-question bank is 55% ML coding/stats, 25% DSA, 10% concurrent/distributed, 10% MLOps — no system-design questions listed at all, and the ones it does have are paywalled behind signup). So this item's actual source is still unidentified — treat as unsourced until traced further, don't ship as-is
29. **Design autocomplete and spell check for mobile devices** — Low — same cross-site consensus, not found in the InterviewQuery guide either; source still untraced
30. **Design autocomplete for email (Smart Compose-style)** — Low — same, untraced
31. **Design the YouTube recommendation system** — Low — same, untraced

### Forward Deployed Engineer / agentic track (newer role, thinner public trail)
32. **"Designing an Agentic System"** — a system-design round built around orchestrating ML + agent components, evaluated on familiarity with RAG, vector databases, eval design, and production AI deployment — Low — topic label (not verbatim question text) surfaced via Glassdoor-topic extraction, reported through [Dataford's Google FDE guide](https://dataford.io/interview-guides/google/forward-deployed-engineer) and [Exponent's FDE guide](https://www.tryexponent.com/guides/google-forward-deployed-engineer-interview); explicit stance from both sources: "not 'design Twitter at 1B users' — real deployment architecture instead". Tried the actual Glassdoor FDE pages via browser this pass — Google-specific FDE reviews didn't surface (only other companies', e.g. Qventus) — still unconfirmed at the primary source
33. **Behavioral/scenario prompt**: "Tell me about a time you identified a technical 'friction point' in a product and successfully advocated for a change to the engineering team" — Medium — search-summary attribution to Glassdoor-reported FDE candidate experiences, not yet reread directly

### Scenario-based / operational (incident-response style — common at Google broadly, SRE-flavored roles especially)
34. **"You get paged at 2am — the error rate on the checkout service is climbing. Walk me through what you do."** — Medium — cross-site consensus among SRE-interview prep guides (techinterview.org, kore1.com) as "a very common live prompt"; expected shape: mitigate blast radius first, root-cause after
35. **"A critical service is experiencing high latency. Walk me through your troubleshooting process."** — Medium — same source set
36. **How would you upgrade 5,000 servers (live, no downtime)?** — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2025-08 (1 year ago); also independently corroborated in the Exponent blog article
37. **How would you upgrade hundreds of thousands of machines "on the Moon"** (i.e. extreme-latency/limited-connectivity remote fleet) — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2024 (2 years ago)
38. **How would you increase the number of users on YouTube?** (growth/product-sense, not pure architecture) — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2021 (5 years ago)
39. **What should be the north-star metric for Google Photos?** (product-sense) — High — [Exponent DB](https://www.tryexponent.com/questions?company=google&type=system-design), ~2022 (4 years ago)

### Explicitly excluded
- **prachub.com**'s "Google System Design Questions" list (20 items — rate limiter for AI agents, "Design Sora" GPU scheduler, drive-style quota limiter, etc.) was pulled and cross-checked, but the site cites no original source (Glassdoor/Blind/LeetCode/named report) per question — a direct check found only anecdotal "it matched what I got asked" testimonials, no per-question provenance. Dropped per the tracker's own rule (§Workflow step 3: skip anything without a real source). Can revisit if a per-question source surfaces later.

## Meta — shipped to app (2026-08-23)

The full research catalog below runs to roughly 130 items across Exponent's
question DB, LeetCode Discuss, Blind, and Meta-specific prep guides — but
only **13** cleared the same ship bar Google's pass established: real
specificity (concrete numbers, explicit constraints, a multi-part ask, or an
actual narrative), not a bare imperative. That's a lower hit rate than
Google's 8/34 (~24%) mostly because Exponent's Meta DB (96 items alone) skews
even more heavily toward one-line topic titles than Google's did — Meta's
question volume is real, but most of it is "Design X." with no attached
detail.

**Shipped** (ids match `meta.ts`): `meta-ticketmaster-single-event`,
`meta-web-crawler-100-machines`, `meta-post-privacy-visibility`,
`meta-price-tracker-camelcamelcamel`, `meta-chess-api-design-scope`,
`meta-security-layer-stripe-stride`, `meta-em-recommendation-system`,
`meta-crawler-botnet-10000-machines`, `meta-uncle-bernies-website-down`,
`meta-chess-100m-mau`, `meta-audio-system-cross-app`,
`meta-image-storage-dedup`, `meta-packet-upgrade-troubleshoot`.

**Left in this tracker only** — real, sourced, but too thin to stand alone:
every bare "Design X." Exponent-DB item (the ~84 remaining of the 96 in the
general list below), the ML-role-filtered subset (same DB, no new items),
most of the PE design/architecture and networking bullet lists (cache API,
distributed logging, DDoS mitigation, service monitoring, multi-region
failover, DNS/TCP/UDP trivia, etc.), and the two aggregator sources
explicitly excluded (see below). If any later gets a real elaboration (a
specific candidate account, not just a topic-database title), promote it
into `meta.ts` then.

## Meta — full research catalog (2026-08-23 research pass)

Questions only for the bulk list; the narrative items carry enough detail to
double as their own answer material. Grouped by round type, matching the
research buckets. Confidence tags follow the same High/Medium/Low definition
used for Google (see that section's header). Dates below are
relative-to-fetch ("N ago" as reported on 2026-08-23), converted to an
approximate month — treat as approximate.

### General / classic system design

The Exponent question DB is not role-filtered by default (`company=meta-facebook&type=system-design`,
no `role=` param) — it mixes SWE, PM, EM, and Data Scientist reports under
one "System Design" label, same as it would for any company. Kept that way
below (matches how the DB actually presents it); PM/product-sense items are
flagged inline rather than dropped, same precedent as Google's north-star-metric
items (#38–39 in that catalog).

1. **Design an auction page (like an eBay listing).** — High — [Exponent DB](https://www.tryexponent.com/questions?company=meta-facebook&type=system-design), ~2024 (2 years ago)
2. **Design an evaluation framework for ads ranking.** — High — Exponent DB, ~2026-04 (4 months ago); 13 answers, has video answer
3. **Design Instagram.** — High — Exponent DB, ~2026-08-16 (7 days ago); 59 answers, has video — most reported Meta prompt per Exponent's own blog
4. **How would you build a Facebook product for blood donation?** — High — Exponent DB, ~2025-08 (1 year ago); 37 answers, has video
5. **Design a next word prediction system.** — High — Exponent DB, ~2025-08 (1 year ago); 4 answers
6. **Design a system to show the top 10 most frequently listened songs in the last 7 days.** — High — Exponent DB, ~2025-08 (1 year ago); 6 answers
7. **Design an end-to-end ML solution to detect ads selling weapons.** — High — Exponent DB, ~2025-10 (10 months ago); 4 answers
8. **Design TikTok.** — High — Exponent DB, ~2026-08-05 (18 days ago); 23 answers, has video
9. **How would you build TinyURL?** — High — Exponent DB, ~2026-05 (3 months ago); 12 answers, has video
10. **Design Facebook Messenger.** — High — Exponent DB, ~2024 (2 years ago); 63 answers, has video
11. **Design a product recommendation system.** — High — Exponent DB, ~2026-03 (5 months ago); 6 answers
12. **Design Twitter.** — High — Exponent DB, ~2026-05 (3 months ago); 12 answers, has video
13. **What signals would you use to improve Meta's News Feed relevance?** — High — Exponent DB, ~2025-08 (1 year ago); 4 answers
14. **Design a web crawler.** — High — Exponent DB, ~2026-06 (2 months ago); 10 answers, has video
15. **Design an Amazon price tracker.** — High — Exponent DB, ~2025-08 (1 year ago); 5 answers — see #100 below for the full camelcamelcamel narrative this overlaps with
16. **Design a personalized news ranking system.** — High — Exponent DB, ~2023 (3 years ago); 1 answer
17. **What is an API and how does it work?** — High — Exponent DB, ~2026-03 (5 months ago); 5 answers
18. **Design a typeahead box for a search engine.** — High — Exponent DB, ~2025-08 (1 year ago); 13 answers, has video
19. **Design Facebook Newsfeed.** — High — Exponent DB, ~2021 (5 years ago); 3 answers, has video
20. **Design a Facebook-style feed where new posts show up quickly.** — High — Exponent DB, ~2026-05 (3 months ago)
21. **Design the system architecture for WhatsApp.** — High — Exponent DB, ~2025-10 (10 months ago); 9 answers, has video
22. **Design a web crawler to download content from www.example.com without detection.** — High — Exponent DB, ~2024 (2 years ago); 3 answers
23. **Design an online Chess Game that is fast, reliable, and supports 100 million monthly active users playing one game a week.** — High — Exponent DB, ~2023 (3 years ago); 3 answers — concrete scale numbers, shipped separately as `meta-chess-100m-mau`
24. **Design a fake news detection system.** — High — Exponent DB, ~2024 (2 years ago); 1 answer, has video
25. **Design Dropbox.** — High — Exponent DB, ~2026-03 (5 months ago); 10 answers, has video
26. **Design Uber Eats.** — High — Exponent DB, ~2026-03 (5 months ago); 11 answers, has video
27. **How would you design 'Hot Topics' on Instagram?** — High — Exponent DB, ~2024 (2 years ago); 4 answers
28. **How would you build an audio product for Facebook?** — High — Exponent DB, ~2023 (3 years ago); 20 answers, has video
29. **Design a streaming service like Netflix.** — High — Exponent DB, ~2025-12 (8 months ago); 4 answers, has video
30. **Should Facebook consolidate its messaging applications?** — High — Exponent DB, ~2021 (5 years ago); 3 answers, has video — PM/product-sense
31. **Design a payment system.** — High — Exponent DB, ~2026-07-31 (23 days ago)
32. **Design live commenting for Facebook.** — High — Exponent DB, ~2025-10 (10 months ago); 2 answers
33. **Design Facebook Marketplace.** — High — Exponent DB, ~2024 (2 years ago)
34. **How would you authenticate reviews for Facebook Locals?** — High — Exponent DB, ~2021 (5 years ago); 5 answers
35. **Design Google Drive.** — High — Exponent DB, ~2024 (2 years ago); 1 answer
36. **Design an automated comment moderation system.** — High — Exponent DB, ~2023 (3 years ago); 1 answer
37. **Design the 'Top Picks' feature for Netflix.** — High — Exponent DB, ~2024 (2 years ago)
38. **Design a solution for borrowing and lending on Facebook.** — High — Exponent DB, ~2023 (3 years ago); 4 answers
39. **How would you improve Buy and Sell Groups on Facebook?** — High — Exponent DB, ~2026-04 (4 months ago); 3 answers
40. **Design a leaderboard system.** — High — Exponent DB, ~2024 (2 years ago); 1 answer
41. **Design a vending machine.** — High — Exponent DB, ~2021 (5 years ago), has video
42. **Design a recommendation engine.** — High — Exponent DB, ~2025-08 (1 year ago)
43. **Design a DNS cache.** — High — Exponent DB, ~2023 (3 years ago); 2 answers
44. **Design APIs for Facebook live commenting.** — High — Exponent DB, ~2026-01 (7 months ago); 4 answers
45. **Design Git.** — High — Exponent DB, ~2026-06 (2 months ago); 1 answer
46. **Design an app for newcomers in a city to find doctors.** — High — Exponent DB, ~2021 (5 years ago); 4 answers
47. **How would you improve Facebook Marketplace?** — High — Exponent DB, ~2021 (5 years ago); 2 answers
48. **Design a music streaming service for Facebook.** — High — Exponent DB, ~2026-07-31 (23 days ago); 1 answer
49. **Design a shopping experience for Netflix.** — High — Exponent DB, ~2024 (2 years ago); 2 answers
50. **Design an auto-complete feature.** — High — Exponent DB, ~2026-03 (5 months ago); 1 answer
51. **Design a 5:1 audio system for WhatsApp, Instagram, and Messenger, including hardware interfaces, codecs, API endpoints, and the value proposition for Meta.** — High — Exponent DB, ~2025-08 (1 year ago) — multi-part, concrete constraints; shipped as `meta-audio-system-cross-app`
52. **Design Instagram's Explore page.** — High — Exponent DB, ~2023 (3 years ago)
53. **You are PM for Instagram. How would you decide on investing in a verification badge?** — High — Exponent DB, ~2021 (5 years ago); 2 answers — PM/product-sense
54. **Design a system like YouTube.** — High — Exponent DB, ~2025-12 (8 months ago); 3 answers
55. **How would you design security for something like Stripe?** — High — Exponent DB, ~2026-05 (3 months ago) — bare version of the same prompt the Exponent blog gives full narrative for; see #101 below
56. **Explain how microservices work.** — High — Exponent DB, ~2023 (3 years ago); 3 answers
57. **Detect the language of a text input.** — High — Exponent DB, ~2024 (2 years ago)
58. **Design an API for searching a folder.** — High — Exponent DB, ~2022 (4 years ago); 4 answers, has video
59. **Design Facebook to be more secure, private, and intimate.** — High — Exponent DB, ~2021 (5 years ago); 1 answer
60. **Design an auction feature on Instagram.** — High — Exponent DB, ~2025-08 (1 year ago)
61. **Design a live event streaming system that captures user polls and allows user interaction.** — High — Exponent DB, ~2025-08 (1 year ago)
62. **Design YouTube advertising.** — High — Exponent DB, ~2023 (3 years ago)
63. **As a product manager for Meta, design a product for volunteers.** — High — Exponent DB, ~2026-01 (7 months ago); 2 answers — PM/product-sense
64. **Design Chess.com.** — High — Exponent DB, ~2026-05 (3 months ago); 1 answer, has video
65. **Design a recommendation system for locations in a feed for a user who arrives in a new city and wants recommendations for places to visit.** — High — Exponent DB, ~2025-12 (8 months ago)
66. **Design a solution for the world of online learning.** — High — Exponent DB, ~2022 (4 years ago); 3 answers
67. **Design a product for managing parking (not limited to cars).** — High — Exponent DB, ~2022 (4 years ago); 1 answer
68. **Tell me about a time when you were involved in system architecture. What components were involved and what was your role?** — High — Exponent DB, ~2025-08 (1 year ago) — behavioral
69. **Design Twitch or any live streaming platform.** — High — Exponent DB, ~2026-04 (4 months ago)
70. **Design a grocery delivery system for COVID.** — High — Exponent DB, ~2021 (5 years ago)
71. **Design the backend of a feature that allows users to download their data from their Facebook account.** — High — Exponent DB, ~2022 (4 years ago); 1 answer, has video
72. **Design a language learning app for Meta.** — High — Exponent DB, ~2022 (4 years ago); 1 answer
73. **Design an app to search for therapists.** — High — Exponent DB, ~2022 (4 years ago); 1 answer
74. **Design an LCU cache.** — High — Exponent DB, ~2025-08 (1 year ago) — likely a mis-transcription of LRU cache
75. **Given meetings with different conflicts and rooms, find a schedule that works.** — High — Exponent DB, ~2025-12 (8 months ago)
76. **Design an events feature for a kids' messenger app.** — High — Exponent DB, ~2022 (4 years ago); 1 answer
77. **Design an airline booking system.** — High — Exponent DB, ~2025-08 (1 year ago)
78. **Design a question and answer website like Quora.** — High — Exponent DB, ~2021 (5 years ago); 1 answer
79. **How would you improve Facebook's timeline?** — High — Exponent DB, ~2024 (2 years ago); 1 answer
80. **You're the PM for Facebook Rooms. What goals would you set for the next 6 months?** — High — Exponent DB, ~2022 (4 years ago); 1 answer — PM/product-sense
81. **You're a PM for Facebook Group Travel on mobile. What would you build?** — High — Exponent DB, ~2022 (4 years ago) — PM/product-sense
82. **Design a solution for borrowing and lending goods among neighbors on Facebook.** — High — Exponent DB, ~2022 (4 years ago); 1 answer
83. **How would you allow a client to view the performance of a video on their social media ads?** — High — Exponent DB, ~2022 (4 years ago)
84. **Design a birthday app for Facebook.** — High — Exponent DB, ~2022 (4 years ago); 1 answer
85. **Design a system to push updated packages onto a cluster.** — High — Exponent DB, ~2025-08 (1 year ago)
86. **Design Facebook email.** — High — Exponent DB, ~2021 (5 years ago); 1 answer
87. **Design an election system for the University of Washington.** — High — Exponent DB, ~2025-08 (1 year ago)
88. **Design a product for digital well-being.** — High — Exponent DB, ~2021 (5 years ago)
89. **What metrics would you consider for designing a robot at Facebook?** — High — Exponent DB, ~2021 (5 years ago)
90. **Design an investment app.** — High — Exponent DB, ~2021 (5 years ago)
91. **Design the ad management logic for surfacing ads based on user preferences or profiles.** — High — Exponent DB, ~2025-12 (8 months ago)
92. **Design a solution for the sports industry.** — High — Exponent DB, ~2021 (5 years ago)
93. **Design a product for patients to find the right care.** — High — Exponent DB, ~2021 (5 years ago)
94. **If you were building facebook.com, how would you define identity and access management for it?** — High — Exponent DB, ~2025-11 (9 months ago)
95. **Assume you are building an e-commerce site like Amazon. What security threats do you see, and how would you handle them?** — High — Exponent DB, ~2025-11 (9 months ago)
96. **How would you build a "restaurants you may like" feature?** — High — Exponent DB, ~2025-08 (1 year ago)

**Meta Machine Learning Engineer role filter** (`role=ml-engineer` on the
same Exponent DB, 20 items) — every item is a subset of #1–96 above (#2, 3,
5, 7, 8, 11, 16, 17, 24, 25, 31, 33, 36, 37, 42, 50, 52, 57, 62, 65); no new
questions, just Exponent's own role-tagging of which of its Meta items an
MLE candidate reported. Logged here for completeness per the workflow, not
re-numbered.

**Narrative/high-detail items beyond the bare Exponent list** (numbered
continuing from 96):

97. **Ticketmaster clone for a single online event, 100,000 tickets, race-condition follow-up** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/6336311/Meta-System-Design/), Jan 2025. Candidate initially designed for general venue seating (rows/seats) before the interviewer clarified it was one online event with no seat assignment; asked to explain the race-condition fix live. Shipped as `meta-ticketmaster-single-event`.
98. **Web crawler for a Wikipedia-like site: download every page exactly once, minimize traffic from any given node, using exactly 100 machines, tens of millions of pages** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/1935481/meta-system-design-interview-question-e4e5/), Apr 2022, E4/E5. The interviewer explicitly declined to clarify the "minimize traffic from any node" requirement further ("it's not important") — a deliberately underspecified constraint the candidate has to make a defensible call on. Shipped as `meta-web-crawler-100-machines`.
99. **Facebook post privacy: three levels (Public / Friends / Friends of Friends), design the visibility check** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/1628524/facebook-product-design-privacy-feature-of-a-post/), Dec 2021, Singapore onsite, 10+ YOE candidate. Full reported flow: func/non-func requirements, `/get-privacy-settings` `/post-message` `/check-privacy` APIs, `user_post`/`user_friends` tables; follow-ups on friends-of-friends checks, adding new privacy types (group/exclude/include), and a celebrity-user special case. Shipped as `meta-post-privacy-visibility`.
100. **Price tracking app like camelcamelcamel.com — store up to 2 years of price history per product** — High — [Blind](https://www.teamblind.com/post/meta-system-design-interview-fwt0ruxp), Jan 2022, Meta E5 onsite; candidate reported choosing a wide-column store (HBase-style) with a `product_id, created_date, day1...day730` layout and was unsure if that was the right foundation. Candidate later updated the post: selected at E5, TC 200k CAD. Shipped as `meta-price-tracker-camelcamelcamel`.
101. **Design an online chess game — interviewer explicitly narrows scope to API design only, skip distributed systems** — High — [Exponent blog](https://www.tryexponent.com/blog/meta-system-design-interview). Reported as catching the candidate off guard because every mock interview they'd practiced assumed a distributed-systems framing; Exponent's own advice is to follow the interviewer's narrowed scope immediately rather than reverting to a rehearsed answer. Shipped as `meta-chess-api-design-scope`.
102. **Security EM round: "design the security layer for Stripe" — threat-model with STRIDE, not payment infra** — High — [Exponent blog](https://www.tryexponent.com/blog/meta-system-design-interview), M1 Security EM candidate. Framework named explicitly: Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege — identify components, map STRIDE threats, propose mitigations, all at Meta scale. Shipped as `meta-security-layer-stripe-stride`.
103. **M1 Engineering Manager ML round: "design a recommendation system for a specific business use case"** — High — [Exponent blog](https://www.tryexponent.com/blog/meta-system-design-interview), verified M1 loop, asked in both the phone screen and onsite with the same ML framing. Follow-ups probed requirements, data/features, modeling trade-offs, training, evaluation metrics, production concerns, and scale; reported candidate quote: interviewers "expect you to provide depth on your own, even if the interviewer isn't especially good at eliciting it." Shipped as `meta-em-recommendation-system`.
104. **Design a "botnet" of 10,000 low-end machines that crawl web pages and return results — no machine should crawl a page twice** — High — [IGotAnOffer, Meta Production Engineer guide](https://igotanoffer.com/blogs/tech/facebook-production-engineer-interview), "design and architecture" round. Despite the "botnet" framing this is functionally a distributed-crawler dedup problem, at 100x the machine count of #98. Shipped as `meta-crawler-botnet-10000-machines`.
105. **Design a system that stores and retrieves images for Facebook** — High — [IGotAnOffer PE guide](https://igotanoffer.com/blogs/tech/facebook-production-engineer-interview) — bare title on this page, but corroborated with real numbers by a separate source: "design a system to store images for FB and Insta that would require 1000 uploads/sec and handle duplication" — High — [LeetCode Discuss, "Meta Onsite System Design Questions" compiled thread](https://leetcode.com/discuss/interview-experience/4428743/Meta-Onsite-System-Design-Questions), Dec 2023, repeatedly corroborated in the thread's 100+ comments. Shipped as `meta-image-storage-dedup` using the numbered version.
106. **How would you design a cache API?** — High — IGotAnOffer PE guide.
107. **How would you design a system that manipulates content sent from a client (e.g. to clean offensive words in a comment post)?** — High — IGotAnOffer PE guide.
108. **Design a distributed logging system for real-time data ingestion.** — High — IGotAnOffer PE guide.
109. **How would you build a system that detects and mitigates DDoS attacks?** — High — IGotAnOffer PE guide.
110. **Design a scalable service-monitoring system.** — High — IGotAnOffer PE guide.
111. **Architect a multi-region failover system.** — High — IGotAnOffer PE guide.
112. **What systems would you implement to ensure the reliability of a large-scale deployment?** — High — IGotAnOffer PE guide.
113. **Design an Instagram Ranking Model.** — High — [Exponent, Meta MLE interview guide](https://www.tryexponent.com/guides/meta-machine-learning-engineer-interview) — listed as a recently-asked ML design-round prompt; no further detail given beyond the title.

### LLD / OOD-flavored
No Meta-tagged LLD/OOD-specific thread turned up this pass (unlike Google's
pharmacy-shop one) — Meta's "system design" rounds that stay at the
component level (e.g. #106 cache API, #101 chess API-design-scope) read more
like scoped-down distributed-systems questions than true class-modeling
questions. Worth another pass if a dedicated LLD-round report surfaces.

### ML / GenAI system design
Covered inline above — Meta's Exponent ML-Engineer role filter is a subset
of the general list (#2, 3, 5, 7, 8, 11, 16, 17, 24, 25, 31, 33, 36, 37, 42,
50, 52, 57, 62, 65), plus #103 (M1 EM ML recommendation-system round) and
#113 (Instagram Ranking Model). The [Exponent Meta MLE guide](https://www.tryexponent.com/guides/meta-machine-learning-engineer-interview)
also documents Meta's distinctive **AI-assisted coding round** (60 min,
CoderPad, candidate debugs an unfamiliar multi-file codebase using an LLM of
their choice) — not a system-design question at all, so not logged as one,
but worth noting as a genuinely new-format round other companies' guides
don't mention yet.

### Forward Deployed Engineer / agentic track
**Explicitly not applicable.** Meta has no public-facing role equivalent to
Google's or Palantir's Forward Deployed Engineer — searches for "Meta FDE"
and "Meta forward deployed engineer interview" surfaced nothing. The closest
adjacent thing found is the AI-assisted coding round noted above (working
with/critiquing an LLM's output under time pressure), but that's a coding
round testing LLM-collaboration skill, not an agentic-systems design round —
too much of a stretch to log as an `fde-agentic` question. Revisit if Meta
opens a role with that title.

### Scenario-based / operational (Production Engineer-flavored, Meta's SRE-equivalent)
114. **"Uncle Bernie's Website is down. Figure out why."** — High — [The Reliability Whisperer Substack, 2025 Meta E4 PE interview experience](https://reliabilitywhisperer.substack.com/p/2025meta-e4-production-engineer-interview), Mar 2025. Screening-round troubleshooting exercise; reported as the interviewer repeatedly "moving the goalposts" as the candidate investigated, with the eventual root cause being disk-out-of-space. Full context: this was one of two screening components (alongside a coding round) before the onsite loop (coding, PE system design, Linux, behavioral). Shipped as `meta-uncle-bernies-website-down`.
115. **We have a database running unusually slow in production. Why might this be happening?** — High — [IGotAnOffer PE guide](https://igotanoffer.com/blogs/tech/facebook-production-engineer-interview) — bare diagnostic prompt, no narrative attached; left in tracker (parallels Google's excluded "critical service high latency" item, #35 in that catalog).
116. **How would you send packets to remote machines and try to upgrade the packets remotely? How would you troubleshoot if some of the machines are not updated?** — High — IGotAnOffer PE guide, "networking" round. Two-part: design + a troubleshoot-a-partial-failure follow-up. Shipped as `meta-packet-upgrade-troubleshoot`.
117. **Tell me everything that happens on a browser when facebook.com is entered.** — High — IGotAnOffer PE guide, "networking" round. Classic "what happens when you type a URL" pattern, tied to Meta's own product — left in tracker as a topic label rather than shipped (this app already has dedicated Foundations lessons covering the same ground generically).
118. **You receive alerts indicating high latency for a critical API in production. How would you approach identifying the root cause and resolving it?** — Medium — cross-site consensus (kore1.com's SRE interview guide), not yet fetched directly against a Meta-specific candidate report — same caveat pattern as Google's #34/#35.
119. Remaining IGotAnOffer PE "networking" bullet list (DNS/HTTP/TCP/UDP/tcpdump/router basics, TLS 1.2→1.3 comparison, TCP congestion control, "create a protocol similar to memcached", "how is a network process terminated", "where is DNS info stored on the system") — High (page fetched directly) but each is a one-line trivia/topic prompt with no narrative — left in tracker only, not enumerated individually since none clears the ship bar.

### Explicitly excluded
- **Blind's crowdsourced "Meta System design questions (2025)" Google Sheet** (linked from [this Blind post](https://www.teamblind.com/post/Meta-System-design-questions-2025-ANodVgHq)) — a user-compiled spreadsheet aggregating questions "found spread across the internet," same failure mode as prachub.com in the Google pass: no per-question source cited. Not opened/transcribed; would need per-item re-sourcing before any of it could ship.
- **systemdesignhandbook.com's "Meta ML System Design Interview" guide** — checked directly this pass. Its example questions ("How would you design a recommendation engine at Meta scale?", "How do you design a feature store?", "How do you handle model drift?", "How do you scale inference to billions of requests?") are presented as representative topics, not attributed to any specific candidate report or dated source. Dropped per the same rule that excluded prachub.com for Google.

## Amazon — shipped to app (2026-08-23)

The full research catalog below runs to 71 items across Exponent's question DB
(54 items), the Exponent Amazon system-design blog's five named
interviewer/candidate anecdotes, the Amazon Solutions Architect guide, and
several LeetCode Discuss / Blind threads reread in full — of which **16**
cleared the ship bar (real specificity: concrete numbers, explicit
constraints, a multi-part ask, or an actual narrative), a noticeably higher
hit rate than Google's 8/34 (~24%) or Meta's 13/~130 (~10%). That's mostly a
sourcing-mix effect, not a real difference in Amazon's interview style: this
pass leaned harder on the Exponent blog's narrative anecdotes and fully
reread LeetCode threads (both reliably ship-worthy) and less on Exponent's
bare-title question DB (which dominated Meta's catalog and drove its low hit
rate).

**Shipped** (ids match `amazon.ts`): `amazon-ab-experimentation-platform`,
`amazon-delivery-locker-capacity`, `amazon-reverse-system-design-harden`,
`amazon-chess-lld-multiplayer-sync`, `amazon-discount-coupon-stacking`,
`amazon-cdn-from-scratch`, `amazon-food-marketplace-favorites-dashboard`,
`amazon-mars-rover-update`, `amazon-rag-qa-system-bedrock`,
`amazon-region-failure-zero-data-loss`, `amazon-ecommerce-black-friday-surge`,
`amazon-genai-fluency-production-incident`,
`amazon-dream11-leaderboard-100k-teams`, `amazon-monitoring-1000-web-servers`,
`amazon-emoji-messaging-eu-us-traffic-origin`,
`amazon-alexa-peloton-integration`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
or judged redundant with an already-shipped item: 44 of the Exponent DB's 54
bare "Design X." items (everything except the 4 that shipped: Dream11
leaderboard, 1000-web-server monitoring, the emoji-messaging question, and
Alexa-Peloton); the large-scale-ticketing-for-Black-Friday DB item (kept out
as redundant with the shipped ecommerce-Black-Friday item and with Meta's
already-shipped Ticketmaster question); the Blind-reported "distributed data
store" and "Uber-app-then-server-side" questions (real but too thin — see
catalog #67–68); the full Jul-2025 LeetCode HLD/LLD compiled list (catalog
#69 — mostly bare titles, though the Token-Bucket-rate-limiter-with-10-
threads-and-1000-API-calls and OTP-photo-confirmation delivery-workflow items
are flagged there as good candidates for a future pass); the COVID
warehouse-hardware and Alexa break-in-emergency DB items; and every
Low/Medium-confidence ML/AI lead that couldn't be traced to a primary source
(catalog's ML/AI section). If any of these later gets a real elaboration, promote it then.

## Amazon — full research catalog (2026-08-23 research pass)

Questions only, no separate answers section (optimal answers for the 16
shipped items were authored directly into `amazon.ts` this pass, same as
Meta's). Grouped by round type per the workflow's research buckets.
Confidence tags follow the same High/Medium/Low definition used for
Google/Meta (see Google's section header). Dates are relative-to-fetch ("N
ago" as reported on 2026-08-23), converted to an approximate month — treat as
approximate.

### General / classic system design — Exponent question DB (54 items)

The DB is not role-filtered by default (`company=amazon&type=system-design`)
— same caveat as Meta's: it mixes SWE, PM, TPM, and Solutions Architect
reports under one "System Design" label. All High confidence (page fetched
directly, all 3 pages). Shipped items are flagged inline; everything else is
a bare "Design X." title with no attached numbers/narrative.

1. Design S3. — ~2026-06 (2 months ago)
2. Design a system to track reviews abuse on Amazon.com. — ~2025-08 (1 year ago); 37 answers
3. Design an evaluation framework for ads ranking. — ~2026-04 (4 months ago); 13 answers, has video
4. Design Instagram. — ~2026-08-16 (7 days ago); 59 answers, has video
5. Design a distributed logging system. — ~2025-08 (1 year ago); 1 answer
6. Design a system that delivers firmware updates to devices. — ~2026-03 (5 months ago)
7. Design a cashless candy dispensing machine. — ~2024 (2 years ago); 5 answers
8. **Tell me about the design and architecture of the program you managed. Explain the system end-to-end and various technologies you picked with reason.** — ~2025-08 (1 year ago); 11 answers — behavioral/architecture-narrative, real ask but no concrete system named; left in tracker
9. Design Amazon Prime video. — ~2024 (2 years ago); 4 answers
10. How would you build TinyURL? — ~2026-05 (3 months ago); 12 answers, has video
11. Design a system to schedule jobs in a distributed environment. — ~2026-06 (2 months ago); 5 answers
12. Design Slack. — ~2026-04 (4 months ago); 3 answers
13. Design a reservation and payment system for a parking garage. — ~2025-08 (1 year ago); 15 answers, has video
14. Design a system to upgrade hundreds of thousands of machines on the Moon. — ~2024 (2 years ago); 4 answers
15. Design a system that ingests book reviews from Amazon.com and provides book recommendations on your website. — ~2026-06 (2 months ago); 8 answers
16. Design a rate limiter. — ~2026-08-18 (5 days ago); 13 answers, has video
17. **Design the leaderboard for Dream11 fantasy gaming with 100,000 registered teams.** — ~2024 (2 years ago); 5 answers — shipped as `amazon-dream11-leaderboard-100k-teams`
18. Design a file system. — ~2025-08 (1 year ago); 2 answers
19. Design a typeahead box for a search engine. — ~2025-08 (1 year ago); 13 answers, has video
20. Design Airbnb's search functionality. — ~2024 (2 years ago); 5 answers
21. System Design: Design an AirTag system. — ~2023 (3 years ago); 3 answers
22. How would you design a large-scale ticketing system that can handle millions of users during peak events (e.g., Black Friday)? — ~2025-08 (1 year ago); 1 answer — real specificity, but left in tracker as redundant with the shipped `amazon-ecommerce-black-friday-surge` and Meta's already-shipped Ticketmaster question
23. Design a Distributed Message Queue — ~2023 (3 years ago); 1 answer
24. Design a key-value store. — ~2026-04 (4 months ago); 2 answers
25. Design a timer system. — ~2026-03 (5 months ago); 4 answers
26. Design Uber Eats. — ~2026-03 (5 months ago); 11 answers, has video
27. Design Amazon's Kindle payment system. — ~2021 (5 years ago); 10 answers, has video
28. Design Ticketmaster — ~2026-03 (5 months ago), has video
29. Design a URL shortener. — ~2026-08-15 (8 days ago); 23 answers, has video
30. Design Prime Video. — ~2021 (5 years ago); 11 answers, has video
31. How does Alexa process voice commands? — ~2021 (5 years ago); 2 answers
32. Design a performance tracking app for cyclists. — ~2024 (2 years ago)
33. Design a color propensity model for sponsored products ads at Amazon. — ~2024 (2 years ago) — ML-flavored, no elaboration beyond the title
34. How would you launch a standalone Amazon restaurant food delivery app? — ~2021 (5 years ago); 5 answers — PM/product-sense
35. Design a notification system. — ~2026-05 (3 months ago); 1 answer
36. Design the recommendation engine for Amazon's homepage. — ~2025-08 (1 year ago)
37. How would you design a three-tier architecture? — ~2025-08 (1 year ago); 1 answer
38. Design a chair for the disabled. — ~2024 (2 years ago) — product-design, not really a systems question
39. **Design a monitoring system for 1000 web servers.** — ~2024 (2 years ago); 1 answer — shipped as `amazon-monitoring-1000-web-servers`
40. How would digitalize a bank with legacy data? — ~2025-08 (1 year ago); 1 answer
41. **How would you scale the design of a messaging system that only involves emojis for users in Europe and US? How would you identify the origin of traffic?** — ~2025-08 (1 year ago); 1 answer — shipped as `amazon-emoji-messaging-eu-us-traffic-origin`
42. How would you handle an API migration where customers need to do some development work? — ~2022 (4 years ago); 3 answers
43. **Design a system for an Alexa-enabled Peloton. Define the APIs, system architecture, and explain the various components.** — ~2022 (4 years ago) — shipped as `amazon-alexa-peloton-integration`
44. Design an e-commerce website. — ~2026-08-09 (14 days ago)
45. Design Twitch or any live streaming platform. — ~2026-04 (4 months ago)
46. Design an app where customer listening history is collected after they have listened to a song for more than 30 seconds for analytics use. — ~2021 (5 years ago); 1 answer — real numeric threshold, good future-pass candidate, not shipped this pass
47. Design the architecture for a hardware device that measures temperature and social distance among employees in warehouses during COVID. — ~2021 (5 years ago); 1 answer — real narrative (COVID, warehouse hardware), good future-pass candidate, not shipped this pass
48. Design an emergency service system for Alexa for a break-in scenario. — ~2021 (5 years ago); 1 answer — real narrative, good future-pass candidate, not shipped this pass
49. Design Amazon Storage. — ~2021 (5 years ago); 1 answer
50. Design a chess board and a Netflix recommendation engine. — ~2021 (5 years ago)
51. Design an airline booking system. — ~2025-08 (1 year ago)
52. Design a Tic Tac Toe game that allows remote play. — ~2024 (2 years ago); 1 answer
53. For Amazon Video Service, would you recommend keeping or removing the offering? — ~2021 (5 years ago); 1 answer — product-sense
54. Design the front page of a newspaper app. — ~2022 (4 years ago); 1 answer

### General / classic system design — narrative items (numbered continuing from 54)

55. **Design an A/B experimentation platform** — assignment service + streaming metrics pipeline; at L6 add access control, mutual exclusivity, and QA manual overrides — High — [Exponent blog](https://www.tryexponent.com/blog/amazon-system-design-interview), reported directly by a Bar Raiser as a favorite prompt. Shipped as `amazon-ab-experimentation-platform`.
56. **Manage capacity for a network of delivery lockers** — mixed-size slots, minimize cost per package, reason about delivery-date probability and hop-to-hop bottlenecks — High — [Exponent blog](https://www.tryexponent.com/blog/amazon-system-design-interview), a real last-mile problem one interviewer reportedly favors. Shipped as `amazon-delivery-locker-capacity`.
57. **"Reverse system design": walk through and harden a system you actually built** — interviewer probes failure modes live (circuit breakers, thread exhaustion from one slow dependency) — High — [Exponent blog](https://www.tryexponent.com/blog/amazon-system-design-interview). Shipped as `amazon-reverse-system-design-harden`.
58. **Design a chess game, single-player then multiplayer** — move-traversal algorithm, board data structures, websockets vs. SSE for client sync — High — [Exponent blog](https://www.tryexponent.com/blog/amazon-system-design-interview), common LLD prompt especially at junior levels. Shipped as `amazon-chess-lld-multiplayer-sync`.
59. **Design a discount and coupon system** — class hierarchy for percentage/fixed discounts, stacking edge cases — High — [Exponent blog](https://www.tryexponent.com/blog/amazon-system-design-interview), reported by a recent L4 candidate. Shipped as `amazon-discount-coupon-stacking`.
60. **Build a CDN service from scratch** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/1188533/Amazon-System-Design-Interview), SDE2, ~May 2021, full page reread; candidate's S3-replication-based first answer was reportedly unsatisfactory to the interviewer. Shipped as `amazon-cdn-from-scratch`.
61. **Add a favorite-sellers dashboard to an existing food marketplace** — multiple favorites per buyer, dashboard sorted by day, DB schema design — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/2150819/amazon-sde2-system-design-question/), SDE2, Jun 2022, full page reread (10 comments); candidate's column-on-Buyer-table answer was reportedly rejected as unscalable/over-engineered. Shipped as `amazon-food-marketplace-favorites-dashboard`.
62. **Deliver a software update file to a rover on Mars** — deliberately bare prompt; reported discussion covered push/pull, chunking for low bandwidth, retry/corruption handling, and a no-Earth-contact failure case — High — [LeetCode Discuss](https://leetcode.com/discuss/post/5804312/amazon-hld-update-mars-rover-by-nsd14022-svdz/), Sep 2024, full page reread. Shipped as `amazon-mars-rover-update`.
63. **Design a RAG Q&A system for millions of documents and hundreds of thousands of users, with cost-aware model selection on Amazon Bedrock** — High — [Exponent Amazon Solutions Architect guide](https://www.tryexponent.com/guides/amazon-solutions-architect-interview), reported as a recently-asked question reflecting GenAI architecture becoming a mainstream SA-round topic. Shipped as `amazon-rag-qa-system-bedrock`.
64. **Design a system that loses no data if an entire AWS region fails** — High — [Exponent Amazon Solutions Architect guide](https://www.tryexponent.com/guides/amazon-solutions-architect-interview). Shipped as `amazon-region-failure-zero-data-loss`.
65. **Design an ecommerce platform that stays up through a Black Friday traffic surge** — High — [Exponent Amazon Solutions Architect guide](https://www.tryexponent.com/guides/amazon-solutions-architect-interview). Shipped as `amazon-ecommerce-black-friday-surge`.
66. **GenAI Fluency round: resolve a critical production incident within one hour, AI tools allowed** — prioritization/debugging strategy, monitoring/logs use, using AI without over-relying on it — High — [LeetCode Discuss, "Amazon Interview | SDE-1 | Selected"](https://leetcode.com/discuss/post/8029194/), Apr 2026, full page reread. Part of Amazon's newer "GenAI Fluency" round format (Round 3 of this candidate's onsite loop). Shipped as `amazon-genai-fluency-production-incident`.
67. **"How would you implement a distributed data store?"** — asked on both phone screen and onsite by the same hiring manager for an SDE II role, with a follow-up dive into implementation specifics once the candidate mentioned needing one — Medium-High — [Blind](https://www.teamblind.com/post/system-design-example-question-for-amazon-onsite-lnyoivhf), 2018, full page reread. Real and corroborated, but too bare/topic-shaped to ship as an answerable prompt on its own — left in tracker.
68. **iOS/Android SDE2: design the Uber app's client architecture (API calls, sync), then extend to how the server-side would work** — Medium — reported via a comment (not the original post) on [a Blind thread asking how Amazon system design differs for a mobile-focused SDE2 role](https://leetcode.com/discuss/post/998937/systems-design-interview-for-android-sde-h4kh/), candidate interviewed for iOS SDE2 in Canada. Real narrative but secondhand (a reply, not the original poster's own report) — left in tracker.
69. **Jul-2025 LeetCode compiled HLD/LLD list** — High confidence (page fetched directly) but every item is a bare title with no narrative — [LeetCode Discuss, "Amazon HLD LLD DSA Questions"](https://leetcode.com/discuss/post/6906753/amazon-hld-lld-dsa-questions-by-anonymou-sepk/), Jul 2025, candidate's own tracked list from ~4 months of Amazon SDE2 prep. HLD bullets: chat system (×3), collaborative code editor like Google Docs, ride-sharing app like Uber (×2), metrics/distributed-tracing (vague), BookMyShow HLD, Google Docs with scalable link sharing, URL shortener, Google Drive, Twitter with custom requirements, Payment Service HLD, chat app with video messaging/replies, TikTok, autocomplete/search recommendations in Amazon Search given a ranking algorithm, vehicle service center management, Reddit-like news feed with age restriction, Google-Drive-like upload service, image extraction from video frames with purchase links for Amazon Prime, Twitch top-10-viewers-by-watch-time reward tracking, a delivery-workflow system (scan products, update states, trigger emails, OTP/photo delivery confirmation), multi-use-case vehicle tracking, metrics monitoring/alerting, tag management system, a second URL-shortener mention. LLD bullets: Vending Machine, Quick Commerce System, Parking Lot, Amazon Locker, Splitwise, Hotel Reservation System, Customer Reviews for Amazon products, Rate Limiter LLD, Movie Booking System, IRCTC/Railway Reservation (booking module focus), Rate Limiter asked twice with Token Bucket Algorithm named plus a concrete follow-up (10 threads & 1000 API calls), Seller Experience Application, a File Storing System, a WhatsApp/Messenger-style Chat Messenger, Delivery Partner Assignment System, Chess Game, File Download System, LRU Cache, Elevator. None shipped this pass — the Token-Bucket-rate-limiter-with-10-threads/1000-API-calls item and the OTP/photo delivery-confirmation workflow item both have enough concrete follow-up detail to be good candidates for a future pass.
70. **Meta-question thread: does Amazon ask HLD or just LLD/OOP for a mobile SDE2 role?** — [LeetCode Discuss](https://leetcode.com/discuss/post/998937/systems-design-interview-for-android-sde-h4kh/), Jan 2021 — the thread itself is a candidate asking for advice, not a reported question; its one useful reply is catalog item #68 above.
71. **SDE1 bar raiser round: an LLD question ("mapping a variable to some action using some rules")** — Medium — [Blind](https://www.teamblind.com/post/Amazon-SDE1-System-design-interview-KyP3YLcX), May 2021, full page reread; a commenter calls this "expected... LLD is like basics" for SDE1. Too vague to ship as an answerable prompt; corroborates the pattern (also seen in the Exponent SA/SDE guide and the Blind SDE1-vs-OOP thread) that Amazon's junior "system design" round is frequently object-oriented/LLD rather than distributed-systems HLD.

### LLD / OOD-flavored
Covered inline above — three of this pass's narrative items are genuinely
LLD/OOD (`amazon-chess-lld-multiplayer-sync` #58,
`amazon-discount-coupon-stacking` #59, and the DB-schema-centric
`amazon-food-marketplace-favorites-dashboard` #61, categorized as `lld-ood`
in the app since its core challenge is schema/relationship modeling rather
than distributed-systems scale). The Exponent blog and Blind/LeetCode SDE1
threads (#71, #70) corroborate that Amazon's junior-level "system design"
round is frequently LLD/OOP rather than HLD — consistent with what Google's
pharmacy-shop question (`google.ts`) already established for that company.

### ML / GenAI system design
Amazon's [Exponent Machine Learning Engineer interview guide](https://www.tryexponent.com/guides/amazon-machine-learning-engineer-interview)
was fetched directly and confirms the loop structure (system design +
coding + leadership questions blended across 3-4 rounds, no separate
question-type interviews) but its "sample questions" sections render with no
actual question text in this pass — checked directly, no extractable
content, not a source we can cite specific prompts from.

Several other ML-flavored leads surfaced only via `WebSearch` summaries with
no primary source confirmed this pass: an anomaly-detection system for
warehouse sensors/delivery metrics, an in-flight-movie recommender matching
flight time, a clothing recommender, autocomplete/spell-check for mobile —
Low confidence, untraced, left in tracker as leads only (same treatment
Google's #28–31 got after its ML items couldn't be traced to a primary
source). The one High-confidence ML/AI item this pass is the RAG Q&A system
(#63, shipped) from the Solutions Architect guide's GenAI/ML-specialist-role
section — plus catalog item #33 (a bare "color propensity model for
sponsored ads" DB title, real but unelaborated).

### Forward Deployed Engineer / agentic track
Unlike Meta (confirmed no FDE-equivalent role exists at all), Amazon does
have live Forward Deployed Engineer-titled postings — confirmed directly via
[Amazon.jobs](https://www.amazon.jobs/en/jobs/10459090/forward-deployed-engineer-content-brand-technology-and-applied-ai)
("Forward Deployed Engineer, Content, Brand Technology and Applied AI") and
[FDE Pulse's Amazon Web Services page](https://fdepulse.com/companies/amazon-web-services/)
(two active AWS "Prototyping and Customer Engineering" postings — a
Prototyping Architect for Physical AI, and a Principal Solutions Developer).
However, no candidate-reported interview question specific to Amazon's FDE
roles turned up via `WebSearch`, Glassdoor, or Blind this pass — the FDE
Pulse page's "interview process" description is generic market-wide
commentary (technical coding round, customer-deployment system design round,
customer-scenario exercise), not an Amazon-specific candidate account. Thin
trail, same status as Google's FDE section — not "not applicable" the way
Meta's was, since the role genuinely exists here. Revisit if a candidate
report surfaces.

### Scenario-based / operational
The GenAI Fluency incident scenario (#66, shipped) is the strongest item in
this bucket, and "reverse system design" (#57, shipped, categorized as
`scenario-operational` in the app) also functions as one — the interviewer
is live-probing operational failure-handling against a real system, not
grading a fresh design. A general search for Amazon-specific "walk me
through an incident"/on-call prompts surfaced only generic, cross-company
SRE-interview-prep consensus (kore1.com, interviewkickstart.com) with no
Amazon-specific candidate report behind it — Low confidence, not logged as a
distinct catalog item (same treatment as Google's excluded generic
troubleshooting item).

### Explicitly excluded
- **systemdesignhandbook.com**'s "Amazon System Design Interview Questions & Answers" page — checked directly this pass (`WebFetch`). Its 11 example questions ("Design Amazon's Product Catalog / Search System", "Design a Global Order Processing System", etc.) carry no per-question citation to Glassdoor/Blind/LeetCode/a named report — presented as representative topics only. Dropped per the same rule that excluded it for Google and Meta.
- **prachub.com**'s Amazon system-design category page — checked directly this pass (`WebFetch`). Same failure mode: 20 questions listed (Scalable Metrics Monitoring, Amazon Locker Service, Human Avoidance for Warehouse Robots, etc.) with no per-item source. Dropped.
- A Blind thread literally titled ["Amazon System Design interview questions"](https://www.teamblind.com/post/amazon-system-design-interview-questions-tauuyktw) — checked directly via browser this pass. Its comments turned out to be satirical dunks on Amazon's reputation ("design a pip system for employees when stock vesting is near", "minimize restroom usage without triggering a union formation"), not real reported interview questions. Excluded entirely — not logged as sourced content anywhere in this catalog.

## Microsoft — shipped to app (2026-08-23)

The full research catalog below runs to 47 numbered items (plus the "Explicitly
excluded" sources) across Exponent's
25-item Microsoft question DB, the Exponent Microsoft system-design blog's
named candidate/interviewer anecdotes, several LeetCode Discuss threads
reread in full (including two unusually detailed, very recent full-loop
write-ups — one from Dec 2025, one from Feb 2026), Blind candidate posts, and
the Hello Interview Microsoft Senior guide — of which **13** cleared the same
ship bar Google/Meta/Amazon's passes established: real specificity (concrete
numbers, explicit constraints, a multi-part ask, or an actual narrative), not
a bare imperative. Microsoft's own hiring guidance (confirmed independently
across the Exponent blog and multiple candidate accounts) is that there's no
single standard question — the interviewing team writes the round, and it
swings unpredictably between a classic HLD discussion and a coded, low-level
object-oriented exercise. That shows up directly in what shipped: two of the
13 are genuinely LLD (a coded file-system exercise, a parking-lot design that
the interviewer explicitly switched from LLD to HLD mid-round), not the usual
all-HLD mix.

**Shipped** (ids match `microsoft.ts`): `microsoft-firmware-ota-update-devices`,
`microsoft-file-system-lld-coded-exercise`, `microsoft-visual-studio-live-share`,
`microsoft-billion-customer-rule-filter-batch`, `microsoft-parking-lot-lld-to-hld`,
`microsoft-multi-region-customer-data-ux-split`,
`microsoft-chatgpt-style-platform-inference-nodes`,
`microsoft-top-10-products-billions-records`,
`microsoft-url-shortener-snowflake-multi-region`,
`microsoft-idempotent-checkout-fintech`, `microsoft-twitter-celebrity-tweet-fanout`,
`microsoft-azure-key-vault-secrets-service`,
`microsoft-azure-region-migration-ai-prompt-surge`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
or judged redundant with an already-shipped item: 18 of the Exponent DB's 25
bare "Design X." items (everything except Azure Key Vault, which shipped);
the four PM/Product-Design-role items surfaced by the DB (AI resume
evaluator, vending machine for the blind, a smartwatch app, a video game for
a 5-year-old) — checked individually, each turned out to be a product-sense
question with no system-design substance beyond the topic label; the
"ordering service for Microsoft licensing" LeetCode narrative (real
candidate account, but the actual design ask is one sentence with no
elaboration); the Spotify-style music-app LLD from the same Feb 2026 loop
that produced two shipped items (real and reread in full, but thinner than
its loop-mates — no numbers or constraints beyond "pseudocode, not code");
the LeetCode "Compilation" topic-list thread (16 bare titles, confirmed real
via full reread but genuinely just labels); most of the Feb 2025 "SDE-2
Recent questions" consolidated list's LLD/HLD bullets (in-memory KV with
expiration, a rate limiter, a Message Queue system, OS mutex/semaphore +
producer-consumer, a garbage collector, a Star-rating system, a WhatsApp
clone with a data-durability/message-ordering focus, and a plain URL
shortener with hashing-technique detail — this last one specifically
superseded by the richer Snowflake/multi-region version of the same question
from the Feb 2026 loop, which shipped instead); and the Hello Interview
Microsoft Senior guide's "most commonly asked" bare-title lists (rate
limiter, distributed cache, presence service, chat/messaging system, top-K
system) — a credible, interviewer-quoted source overall, but these specific
list items carry no more than a title each. If any of these later gets a
real elaboration (a specific candidate account with actual detail, not just
a topic-database title), promote it into `microsoft.ts` then.

## Microsoft — full research catalog (2026-08-23 research pass)

Questions only in the general/classic and LLD sections; optimal answers for
the 13 shipped items were authored directly into `microsoft.ts` this pass,
same as Meta's and Amazon's. Grouped by round type per the workflow's
research buckets. Confidence tags follow the same High/Medium/Low definition
used for Google/Meta/Amazon. Dates are converted from "N ago" (as reported at
fetch time on 2026-08-23) to an approximate month where the source gave a
relative age.

### General / classic system design

1. **How would you design an AI evaluation system for resumes?** — High — [Exponent DB](https://www.tryexponent.com/questions/6592/design-ai-evaluation-system-resumes), ~Nov 2025 (9 months ago) — checked in full: Product Manager role, the one shared interview experience is about PM-framework style, not a system-design answer. Thin, unshipped.
2. **Design LFU cache.** — High — [Exponent DB](https://www.tryexponent.com/questions/6401/design-lfu-cache-system), ~Apr 2026 (4 months ago)
3. **Design a system to log messages in order.** — High — [Exponent DB](https://www.tryexponent.com/questions/4907/design-system-log-messages-in-order), ~Aug 2025 (a year ago), 15 community answers
4. **Design a system that delivers firmware updates to devices.** — High — [Exponent DB](https://www.tryexponent.com/questions/5984/design-device-firmware-update-system), ~Mar 2026 (5 months ago); candidate account (SDE II, over-the-air update for a car company) reread in full — **shipped** as `microsoft-firmware-ota-update-devices`
5. **Design Facebook Messenger.** — High — [Exponent DB](https://www.tryexponent.com/questions/1376/design-facebook-messenger), ~2024 (2 years ago), 63 community answers
6. **Explain the leader/follower election in a distributed system.** — High — [Exponent DB](https://www.tryexponent.com/questions/6017/explain-leader-follower-election-system), ~Feb 2026 (6 months ago)
7. **Design a file system.** — High — Exponent DB (title-listed, distinct from the coded LLD version below), ~Aug 2025 (a year ago)
8. **What is an API and how does it work?** — High — Exponent DB, ~Mar 2026 (5 months ago) — concept question, not a design prompt; unshipped
9. **How would you scale application security initiatives without scaling the team?** — High — [Exponent DB](https://www.tryexponent.com/questions/7149/scale-application-security-without-team-growth), ~Aug 2025 (a year ago); Technical Program Manager role, one shared experience notes the technical follow-up was "unexpected threat modelling" — real but thin, unshipped
10. **Design the system architecture for WhatsApp.** — High — Exponent DB, ~Oct 2025 (10 months ago), 9 community answers
11. **Design a key-value store.** — High — Exponent DB, ~Apr 2026 (4 months ago)
12. **Design a timer system.** — High — Exponent DB, ~Mar 2026 (5 months ago), 4 community answers
13. **Design Dropbox.** — High — Exponent DB, ~Mar 2026 (5 months ago), 10 community answers
14. **Design Uber Eats.** — High — Exponent DB, ~Mar 2026 (5 months ago), 11 community answers
15. **Design a vending machine for the blind.** — High — [Exponent DB](https://www.tryexponent.com/questions/6534/design-vending-machine-for-blind), ~Mar 2026 (5 months ago); Product Manager role, checked in full — a product-sense case study, not a system design; unshipped
16. **How would you detect fake reviews using machine learning?** — High — Exponent DB, ~Aug 2025 (a year ago)
17. **Design Google Drive.** — High — Exponent DB, ~2024 (2 years ago)
18. **Design a leaderboard system.** — High — Exponent DB, ~2024 (2 years ago)
19. **Design a service like Azure Key Vault that securely stores and retrieves secrets, certificates, and keys for applications and users.** — High — [Exponent DB](https://www.tryexponent.com/questions/5437/system-design-secure-key-vault-service), ~Aug 2025 (a year ago); corroborated by the Exponent blog's Azure-domain bucket — **shipped** as `microsoft-azure-key-vault-secrets-service`
20. **Design a kitchen.** — High — Exponent DB, ~2021 (5 years ago)
21. **You're a PM at Uber; design a smartwatch app.** — High — Exponent DB, ~2022 (4 years ago); Product Manager role, unshipped
22. **Design a health app within the Microsoft ecosystem.** — High — Exponent DB, ~2022 (4 years ago); corroborated by the Exponent blog's Azure-domain bucket, but no further elaboration anywhere; unshipped
23. **Design a video game for a 5-year-old.** — High — Exponent DB, ~2021 (5 years ago); Product Manager role, unshipped
24. **Design a mobile phone for tweens.** — High — Exponent DB, ~2021 (5 years ago); Product Manager role, unshipped
25. **Design a calendar (LLD).** — High — Exponent DB, ~Aug 2025 (a year ago)
26. **Design a chat feature for users of Microsoft Azure.** — High — [Exponent blog](https://www.tryexponent.com/blog/microsoft-system-design-interview), Azure-domain bucket; no elaboration beyond the one line; unshipped
27. **Handle a high volume of AI prompts in a particular region, or migrate Azure services off a struggling West Coast region.** — High — [Exponent blog](https://www.tryexponent.com/blog/microsoft-system-design-interview), Azure-domain bucket — **shipped** (combined as one operational scenario) as `microsoft-azure-region-migration-ai-prompt-surge`
28. **Implement an LRU cache or a fixed-size buffer from a set of function signatures, reverse-engineering the requirements from the headers.** — High — [Exponent blog](https://www.tryexponent.com/blog/microsoft-system-design-interview), LLD bucket; real pattern but no further narrative detail found; unshipped
29. **How would you design Visual Studio Live Share functionality?** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/485856/Microsoft-System-design), Jan 2020, full page + comment thread reread — comments develop real substance (WebRTC vs. WebSockets, screen-share FPS, remote-control hand-off) — **shipped** as `microsoft-visual-studio-live-share`
30. **We have billions of customers in a database; run a daily job checking each against 10-15 business rules (~10 criteria each), output "Customer → Matched Rules."** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/692996/Microsoft-System-Design-Please-help), Jun 2020, full page + comments reread — **shipped** as `microsoft-billion-customer-rule-filter-batch`
31. **Online shopping site: display the top 10 highest-selling products, assuming billions of records in the database.** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/666792/Microsoft-or-System-design-or-Please-help/), Jun 2020, full page + top comment reread — **shipped** as `microsoft-top-10-products-billions-records`
32. **Multi-level, multi-entry/exit parking lot: LLD (classes, closest-spot algorithm, concurrent entry) then HLD (scale, concurrency, sharding, server count) on the same design.** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/598634/Microsoft-or-Onsite-or-System-Design-or-SDE-2), Apr 2020, SDE 2 onsite, full page + comments reread — **shipped** as `microsoft-parking-lot-lld-to-hld`
33. **"Compilation" topic list** — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/1729681/Compilation-or-Microsoft-Design-Questions-or-SDE-ISDE-II/), Aug 2023, full page reread — High confidence the list itself is real (author states it's compiled from 6 months of Microsoft SDE-1/SDE-2 LeetCode Discuss posts), but every entry is a bare topic label, not question text: Tiny URL, Google Docs, Twitter, LeetCode (the product), API Rate Limiter, BookMyShow, Chat Application, E-Commerce Portal, Splitwise, Vending Machine, Google Autosuggest, Uber, Parking Lot, Stock Exchange, Logging System, Authentication Service — author notes Tiny URL, Parking Lot, and BookMyShow were asked most often. Low value for shipping (Low confidence per the doc's own "topic label, not actual question" rule) despite the High-confidence source read.
34. **"Design an ordering service for Microsoft so that companies can buy licenses for services from there."** — High — [LeetCode Discuss — Microsoft Interview Experience: Round 2 & 3](https://leetcode.com/discuss/post/7384653/microsoft-interview-experience-round-2-3-jyfa/), Dec 2025, full page reread — asked by a 20-year Microsoft senior engineer in the final round; candidate (new to system design) could not design it the standard way expected and was not selected specifically because of this round. Real narrative around the outcome, but the design ask itself is one sentence with zero elaboration — stays in the tracker, unshipped.

### LLD / OOD-flavored

35. **Build a working file system (files, directories, symbolic links) as a coded, low-level, object-oriented exercise — "let's code it out," multiple use cases, 45 minutes.** — High — [Exponent blog](https://www.tryexponent.com/blog/microsoft-system-design-interview) (bucket description) + [Exponent — Microsoft SC2 candidate experience](https://www.tryexponent.com/experiences/microsoft-software-engineer-interview-89b7e7), ~3 days before this pass, full page reread — Experience + Devices team, Copilot integration into Microsoft 365 — **shipped** as `microsoft-file-system-lld-coded-exercise`
36. **Round 3 (LLD) — "give LLD of a music playing app like Spotify" — classes, interfaces, enums; pseudocode only, no code expected.** — High — [LeetCode Discuss — Microsoft SDE 2 | L61/62 | Interview Experience](https://leetcode.com/discuss/post/7545165/microsoft-sde-2-l6162-interview-experien-e5q7/), Feb 2026, full multi-round write-up reread — real and cleared, but thinner than its loop-mates (no numbers/constraints beyond "pseudocode not code"); unshipped, left as a lead if a richer account of the same prompt surfaces.
37. **Parking lot LLD→HLD** — see #32 above (categorized under LLD/OOD in the shipped file since the round opened as low-level design).

### ML / GenAI system design

38. **"Design a platform like ChatGPT. Assume inference nodes are a black box (input text → output response text). Focus on chats, sending messages, receiving responses."** — High — [Blind — Got asked System Design in Microsoft L59/L60 interview](https://www.teamblind.com/post/got-asked-system-design-in-microsoft-l59l60-interview-what-is-the-expectation-okzz4rx3), Dec 2025, full post reread — CoreAI org, Prague, most junior SDE band — **shipped** as `microsoft-chatgpt-style-platform-inference-nodes`
39. Microsoft's ML/AI trail is genuinely thin beyond #38. Exponent's Microsoft × ML-Engineer × System-Design filter returns only 2 items, both generic non-ML questions ("What is an API and how does it work?", "Design Dropbox") — no ML-specific system-design content at all. [InterviewQuery's Microsoft AI Engineer guide](https://www.interviewquery.com/prep-guides/microsoft-ai-engineer) was checked directly (same provenance-check rule applied to every new aggregator) — its topic breakdown is 25 DSA + 21 ML + 8 SQL + 5 data-modeling + 4 behavioral questions, no system-design category at all, and the sample questions shown (e.g. "Merge Sorted Lists") are generic coding/stats with the rest paywalled — excluded, same reasoning as Google's InterviewQuery-guide exclusion. [Dataford's Microsoft AI Engineer guide](https://dataford.io/interview-guides/microsoft/ai-engineer) was also checked directly — it presents "example questions or scenarios" (RAG/vector-search latency at billions of documents, multi-agent code-write/test/deploy orchestration, LLM-serving auto-scaling) but with zero per-item citation to an actual candidate or interviewer report, reading as generic AI-role topic-explainer content rather than sourced questions — excluded, same reasoning as `prachub.com`'s prior exclusions.

### Forward Deployed Engineer / agentic track

40. No genuine Microsoft-specific FDE-equivalent role or reported question trail was found this pass. Searches for Microsoft + Copilot/agentic engineering interview questions surface only the same kind of unsourced generic topic-explainer content flagged and excluded in #39 (Dataford's guide again, in this framing: "orchestrate a multi-agent system where one agent writes code, another tests it, a third deploys it"). Logged as an explicit bucket exclusion per the workflow's own instruction, same as Meta's pass — not silently skipped.

### Scenario-based / operational

41. **Idempotency during checkout (Fintech-flavored): write pseudocode for exactly where you'd handle it; interviewer pushed on the transaction's broader lifecycle beyond the initial write.** — High — [LeetCode Discuss — Microsoft SDE 2 | L61/62 | Interview Experience](https://leetcode.com/discuss/post/7545165/microsoft-sde-2-l6162-interview-experien-e5q7/) (Round 5, hiring-manager round), Feb 2026, same write-up as #36 (Round 3 LLD) and #45 (Round 4 HLD) — **shipped** as `microsoft-idempotent-checkout-fintech`
42. **Twitter-style feed: what happens when a celebrity account posts a tweet?** — High — [LeetCode Discuss — Microsoft SDE-2 Recent questions 2025 | Consolidated](https://leetcode.com/discuss/interview-question/6403987/Microsoft-SDE-2-Recent-questions-2025-or-Consolidated/), Feb 2025, full page reread — **shipped** as `microsoft-twitter-celebrity-tweet-fanout`
43. **Azure region migration / AI-prompt volume surge** — see #27 above.
44. **URL shortener — HLD/LLD for generating a tiny URL; how redirection works; hashing techniques discussed (Base64, Base62, SHA1); how many types of load balancers used.** — High — same [Feb 2025 consolidated list](https://leetcode.com/discuss/interview-question/6403987/Microsoft-SDE-2-Recent-questions-2025-or-Consolidated/) as #42, "HLD" section — real and reread in full, but superseded for shipping by the richer Snowflake-ID/multi-region version of the same question from the Feb 2026 loop (#45 below); left here as a corroborating source.
45. **URL shortener — multi-region deployment deep dive, Twitter Snowflake-style ID generation, dedicated ID-generation service, Base62 encoding of auto-increment IDs.** — High — [LeetCode Discuss — Microsoft SDE 2 | L61/62 | Interview Experience](https://leetcode.com/discuss/post/7545165/microsoft-sde-2-l6162-interview-experien-e5q7/) (Round 4, HLD), Feb 2026 — **shipped** as `microsoft-url-shortener-snowflake-multi-region`
46. **Region A/Region B: customer data in one region, UX serving in another; design how the UX resolves and reaches the right region — HTTP redirects, Redis (instance vs. cluster), Kafka-propagated updates, hot/warm Redis for cost.** — High — [Blind — Microsoft SDE2/Senior Software Engineer Interview experience](https://www.teamblind.com/post/microsoft-sde2senior-software-engineer-interview-experience-g70vklcp), Oct 2025, full post reread — **shipped** as `microsoft-multi-region-customer-data-ux-split` (categorized as general system-design rather than operational, since it's a from-scratch architecture question, not an incident/migration scenario)
47. **Feb 2025 "SDE-2 Recent questions" consolidated list — remaining LLD/HLD/Misc bullets, checked in full but each too thin to stand alone:** in-memory key-value store with expiration (LLD); "rate limiter in real world, write the working code"; implement a Message Queueing system, focus on multithreading and design patterns; design a scheduler-based system (asked as both LLD and HLD in different interviews); OS concurrency — thread synchronization, mutex, semaphores, then a producer-consumer discussion "with several scenarios" (real and specific in tone, but the actual scenarios aren't detailed); design a filesystem (bare, distinct from the coded exercise in #35); code an LRU cache; Snake Game with a design-patterns discussion; distributed cache; distributed key-value store; design a garbage collector; a Star-rating system "like Amazon"; a WhatsApp clone with a data-durability/message-ordering focus (real, closest of this group to shippable, but judged redundant with the already-shipped region-split and idempotency questions' coverage of consistency/durability themes); designing a Load Balancer; "how to get rid of deadlocks in a large-scale system"; and a Miscellaneous grab-bag (session persistence on login, cloud authentication flow, e2e CI/CD, SOLID principles, dependency-inversion advantages, Active Directory/login flow, microservice-vs-monolith debugging tradeoffs, correlation IDs across microservices). None promoted — each is a topic label or a one-line ask with no numbers, narrative, or multi-part structure.

### Explicitly excluded (as sources, not as individual questions)

- **interviewquery.com's Microsoft AI Engineer prep guide** — see #39. No system-design category at all in its own topic breakdown; sample questions shown are generic DSA/ML/SQL, the rest paywalled behind signup. Same exclusion reasoning as Google's InterviewQuery-guide check.
- **dataford.io's Microsoft AI Engineer guide** — see #39/#40. Presents plausible-sounding "example questions or scenarios" for RAG, LLM evaluation, multi-agent orchestration, and LLM serving, but with zero per-item citation to an actual candidate or interviewer account — reads as generic AI-role topic-explainer content. Same exclusion reasoning as `prachub.com`'s prior exclusions across Google/Meta/Amazon.
- **Hello Interview's Microsoft L63-64 Senior guide** — checked directly via browser this pass. The guide itself is a credible, detailed source (explicit interviewer quotes about Microsoft's evaluation process, real structural detail about the L63/64 loop) and is cited above for that context, but its "most commonly asked System Design questions" list (Rate Limiter, Distributed Cache System, Presence Service API, Chat/Messaging System, Top-K System) carries no more per-item detail than a title each — not shipped as individual questions, though the surrounding narrative content was used as context.

## Apple — shipped to app (2026-08-23)

The full research catalog below runs to 25 numbered items across Exponent's
17-item Apple question DB, the Exponent Apple system-design blog's named
ICT3/ICT4/ICT5/EM candidate and interviewer anecdotes, the Exponent Apple SWE
guide's product-grounded sample questions, one LeetCode Discuss full-loop
write-up, and a Blind thread with a real Apple-employee comment — of which
**10** cleared the same ship bar Google/Meta/Amazon/Microsoft's passes
established. Apple's own hiring guidance (confirmed across every source
reread this pass) is unusually explicit that there is *no* standard question
at all — every team writes its own, uncoordinated with any other team's —
which shows up directly in this pass's smaller catalog (25 vs. Microsoft's 47)
and in what shipped: unlike every prior company, two of Apple's four
consistently-named evaluation criteria (privacy/security as a first-class
constraint, genuine mobile/on-device system design) aren't optional
supplementary buckets here, they're baked into most of the shipped prompts
themselves.

**Shipped** (ids match `apple.ts`): `apple-observability-storage-migration-block-store`,
`apple-view-hierarchy-hit-test`, `apple-canvas-app-shapes-layers-dragdrop`,
`apple-typeahead-privacy-angle`, `apple-auth-migration-oidc`,
`apple-applicant-tracking-system`, `apple-subscription-form-billions-scale`,
`apple-icloud-photos-sync-devices`, `apple-imessage-delivery-guarantees`,
`apple-ondevice-vs-cloud-decision-feature`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
or judged redundant: 7 of the Exponent DB's 17 bare "Design X." items (rate
limiter, key-value store, job scheduler, Kubernetes cluster manager, "What is
an API", "why use a message queue", a messaging platform with no further
elaboration); two thin-but-real narrative items where the candidate account
itself had real color but the actual design ask was one bare sentence
(the Kubernetes-cluster-manager and AI-lunch-ordering-bot questions, both
from the same SWE candidate's loop); a TPM program-scoping question about
Siri data quality (real Siri-org narrative, but a "how would you scope this"
prompt, not an architecture one); a bare "Design a Data Center" LeetCode
thread with zero elaboration; and topic-label-only context from a Blind
thread with a real Apple-employee comment (push notification system, maps
routing engine, location tracking system — named but never elaborated). If
any of these later gets a real elaboration, promote it into `apple.ts` then.

## Apple — full research catalog (2026-08-23 research pass)

Questions only; optimal answers for the 10 shipped items were authored
directly into `apple.ts` this pass, same as the three prior passes. Grouped
by round type per the workflow's research buckets. Confidence tags follow
the same High/Medium/Low definition used throughout this doc.

### General / classic system design

1. **Design a system to schedule jobs in a distributed environment.** — High — [Exponent DB](https://www.tryexponent.com/questions/3650/design-system-schedule-jobs-distributed-environment), ~May 2026 (3 months ago), 5 community answers; bare title, unshipped
2. **Design a service that manages a set of Kubernetes clusters.** — High — [Exponent DB](https://www.tryexponent.com/questions/7124/design-service-manage-kubernetes-clusters), ~May 2026 (3 months ago); Software Engineer role, checked in full — real narrative around the candidate's loop (referral path, 6-round onsite, "AI system design round that caught me off guard"), but the design ask itself is one bare sentence; unshipped
3. **Design a rate limiter.** — High — Exponent DB, ~Aug 2026 (5 days ago), 13 community answers, has video answer; bare title, unshipped
4. **What is an API and how does it work?** — High — Exponent DB, ~Mar 2026 (5 months ago); concept question, unshipped
5. **Design a typeahead box for a search engine.** — High — [Exponent DB](https://www.tryexponent.com/questions/1601/design-typeahead-box-search-engine), ~Aug 2025 (a year ago), 9 interviews across Pinterest/Meta/Amazon/Apple/TikTok/Adobe/Oracle, 6 community answers reread in full (Trie + caching + API-protocol discussion) — corroborates the Apple-specific privacy-angle framing from the blog (#26 below) — **shipped** as `apple-typeahead-privacy-angle`
6. **Design a key-value store.** — High — Exponent DB, ~Apr 2026 (4 months ago); bare title, unshipped
7. **Design a storage system for large block data, where keys can be up to about 1K and values can be up to about 300K.** — High — [Exponent DB](https://www.tryexponent.com/questions/6315/design-storage-system-large-block-data), ~Mar 2026 (5 months ago), Engineering Manager role, full candidate account reread — **shipped** (combined with #8 and the metrics-migration item below) as `apple-observability-storage-migration-block-store`
8. **How would you design the new storage system, especially the partitioning, as volume grows from millions of records to hundreds of millions or billions?** — High — [Exponent DB](https://www.tryexponent.com/questions/6313/design-partitioned-storage-system-scale), ~Mar 2026 (5 months ago), same EM candidate account as #7 (identical shared interview-experience text, confirming both are the same loop) — **shipped**, combined with #7
9. **We are replacing an old metrics storage system with scaling issues. How would you migrate the data without interrupting live traffic or losing any internal data?** — High — [Exponent DB](https://www.tryexponent.com/questions/6312/plan-metrics-storage-migration), ~Mar 2026 (5 months ago), same EM candidate account as #7/#8 — **shipped**, combined with #7/#8
10. **Design a plan to migrate an existing authentication system to a new one.** — High — [Exponent DB](https://www.tryexponent.com/questions/5394/authentication-system-migration), ~Aug 2025 (a year ago); bare DB title, but a "Hot," upvoted community answer thread on the same page restates the full elaborated prompt (Basic Auth → OIDC, architecture/migration/rollout/backward-compatibility/downtime asks) — **shipped** as `apple-auth-migration-oidc`
11. **Design an Applicant Tracking System (ATS).** — High — [Exponent DB](https://www.tryexponent.com/questions/3222/design-applicant-tracking-system), ~2023 (3 years ago); bare DB title, elaborated (data model, APIs, storage/search trade-offs, role permissions, privacy angle) by the Exponent Apple blog's independent listing of the same question — **shipped** as `apple-applicant-tracking-system`
12. **Design a messaging platform.** — High — Exponent DB, ~2023 (3 years ago); bare title, no further elaboration found this pass; unshipped
13. **Why use a message queue?** — High — Exponent DB, ~2023 (3 years ago), 1 community answer; concept question, unshipped
14. **If you needed to improve data quality on a product like Siri, how would you define the scope?** — High — [Exponent DB](https://www.tryexponent.com/questions/6372/define-scope-data-quality-siri), ~Dec 2025 (8 months ago), Technical Program Manager role, full candidate account reread (Siri AI/ML org, combined process for two EPM roles, rejected) — real narrative, but a program-scoping prompt rather than an architecture one; unshipped
15. **Design a classical music product for Apple Music.** — High — Exponent DB, ~2021 (5 years ago); bare title, product-sense flavored; unshipped
16. **Design an AI bot for ordering lunches for employees.** — High — [Exponent DB](https://www.tryexponent.com/questions/7125/design-ai-bot-ordering-lunches), ~May 2026 (3 months ago), Software Engineer role, full candidate account reread — same candidate/loop as #2 (identical shared interview-experience text) — real narrative around the loop (referral path, JSON-parsing technical screen, 6-round onsite with Go-by-hand coding), but the design ask itself is one bare sentence; unshipped
17. **How would you build social features on Lyft to increase user engagement?** — High — Exponent DB, ~2021 (5 years ago), 3 community answers; mislabeled/cross-posted under Apple in the DB (the prompt itself names Lyft, not an Apple product) — excluded as likely a DB tagging artifact rather than a genuine Apple-asked question

### Mobile / client-side system design (Apple's distinguishing round type)

18. **Given a view hierarchy and a coordinate point, return all views that contain that point.** — High — [Exponent blog](https://www.tryexponent.com/blog/apple-system-design-interview), ICT3-level example, full page reread — **shipped** as `apple-view-hierarchy-hit-test`
19. **Design a canvas application that supports shapes, text, layering, and drag-and-drop repositioning of elements.** — High — [Exponent blog](https://www.tryexponent.com/blog/apple-system-design-interview), ICT4-level example — **shipped** as `apple-canvas-app-shapes-layers-dragdrop`

### ML / AI system design

20. **Design a feature that decides between on-device and cloud processing.** — High — [Exponent Apple SWE guide](https://www.tryexponent.com/guides/apple-software-engineer-interview), listed as a sample system-design question — **shipped** as `apple-ondevice-vs-cloud-decision-feature`
21. Apple's ML/AI-specific catalog is otherwise thin on actual question *text*, though the surrounding context is real and rich: the [Exponent Apple MLE guide](https://www.tryexponent.com/guides/apple-machine-learning-engineer-interview) (5 interview experiences, 55 questions, marked "Verified") confirms Apple runs a genuine ML-system-design round distinct from generic SWE system design — with on-device latency/quantization/privacy as its stated focus, and per-team domain depth (computer vision for Camera, generative AI/RAG/agentic systems for Apple Intelligence teams) — but its "Sample questions" sections render empty (no actual question text recovered this pass, unlike the SWE guide's equivalent sections). Left as a lead for a future pass rather than shipped or force-summarized from the surrounding prose.

### Forward Deployed Engineer / agentic track

22. Apple has real, currently open Forward Deployed Engineer job postings (including a "Lead Forward Deployed Engineer, AI Evaluation Platform" role) — confirmed directly via Apple's own careers site this pass — but, same as Amazon's pass, zero candidate-reported interview questions for the role turned up anywhere searched (Glassdoor, Blind, LeetCode). Logged as the same distinct status Amazon's pass established: a real role exists, but with no public interview-question trail yet, which is a different (weaker) finding than either "role doesn't exist" (Meta) or "thin trail" (Google/Microsoft).

### Scenario-based / operational

23. **Storage migration without live-traffic interruption or data loss** — see #7-#9 above (shipped as a combined scenario-operational item, since the migration constraint is the most distinctive part of that EM candidate's three-part prompt).
24. **You're the network lead for a large volunteer organization; circulate a signup form with a subscription fee, accessed by billions of people — design a robust system for wide-scale usage.** — High — [LeetCode Discuss — Apple Interview Experience | L4 | SDE 2 | Hyderabad](https://leetcode.com/discuss/post/6461783/apple-interview-experience-l4-sde-2-hyde-o46k/), Feb 2025, full multi-round write-up reread (Java Backend Engineer role — Java fundamentals, Spring Boot, a multithreading countdown-timer exercise, then this system-design scenario) — **shipped** as `apple-subscription-form-billions-scale`
25. **"Design a Data Center."** — High (source reread directly) — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/286799/apple-interview-question-design-a-data-center), May 2019; the OP's own post is just the bare title plus "what clarifying questions to ask?" with zero elaboration; two comments discuss generic data-center-placement considerations (distance-minimization, coverage area) but neither ties back to a real reported Apple interview detail. Left unshipped — a topic label, not a question.

### Explicitly excluded (context, not individual questions)

- **Blind — "Apple system design questions"** ([teamblind.com/post/apple-system-design-questions-owkud46f](https://www.teamblind.com/post/apple-system-design-questions-owkud46f)), Mar 2026, full page reread — a real, verified-Apple-employee-labeled comment names push notification systems, maps routing engines, and location-tracking-at-scale as recurring themes, and confirms CAP theorem/consistent hashing/sharding/caching/message-queue fundamentals matter, plus that team-matching happens before the loop starts (so interviewers are already on the candidate's actual team). Genuinely useful context, corroborates the team-driven-hiring framing found everywhere else this pass, but every named topic is a label, not elaborated question text — not shipped as an individual question.
- **Apple MLE guide's "Sample questions" sections** — see #21. Structurally present in the page but rendered with no actual question text recovered this pass across three separate sections (ML fundamentals, coding, ML system design) — worth a retry in a future pass in case it's a rendering/pagination issue specific to this page rather than genuinely empty content.

## Netflix — shipped to app (2026-08-24)

The full research catalog below runs to roughly 26 items — noticeably smaller
than every Big Tech company's catalog (Apple's 25 was previously the
smallest, and even that had a bigger underlying DB) — but **8** of them
cleared the same ship bar established for every prior company: real
specificity (concrete numbers, explicit constraints, a multi-part ask, or an
actual narrative), not a bare imperative. That's roughly 31% (8/26), a
noticeably *higher* hit rate than any Big Tech company despite the smaller
catalog. This isn't Netflix asking more specific questions on average — it's
a sourcing-mix effect, the same one that drove Amazon's above-average hit
rate: Netflix simply doesn't have a large bare-title question DB the way
Google/Meta/Microsoft do (its Exponent DB is only 5 items total), so almost
everything in this catalog comes from Netflix's own dedicated,
narrative-heavy Exponent guides or from fully-reread LeetCode threads, both
of which lean ship-worthy far more often than a bare DB entry does.

**Shipped** (ids match `netflix.ts`): `netflix-dynamic-recommendation-system`,
`netflix-frequency-capping-system`, `netflix-ads-campaign-data-model`,
`netflix-event-logging-own-vs-docs-client`, `netflix-ttl-cache-eviction-compaction`,
`netflix-anonymous-social-app-like-reddit`,
`netflix-distributed-db-multi-region-eventual-consistency`,
`netflix-movie-review-score-prediction`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
or judged out of category for this app's question set: the DB's "Design
Cookie Clicker" and bare "Design a streaming service like Netflix" items
(#1–2); the bare CDN/Twitter items from the system-design blog's own prompt
list (#10–11); the SWE guide's org-chart tree coding question (#13, pure DSA,
no system-design angle); the MLE guide's bare "How would you build a system
like Netflix?" and "What metrics do you monitor after deploying a machine
learning model?" items (#16–17); the Blind-reported "design a job scheduler"
infra-focused lead, too thin/paraphrased to ship (#24); and every aggregator
list excluded outright (see below). If any of these later gets a real
elaboration (a specific candidate account, not just a topic-database title),
promote it into `netflix.ts` then.

## Netflix — full research catalog (2026-08-24 research pass)

Questions only for the bulk list; the narrative items carry enough detail to
double as their own answer material. Grouped by round type, matching the
research buckets. Confidence tags follow the same High/Medium/Low definition
used for every prior company (see Google's section header). Dates below are
relative-to-fetch ("N ago" as reported on 2026-08-24), converted to an
approximate month — treat as approximate.

### General / classic system design — Exponent question DB (5 items, not role-filtered)

Netflix's own general system-design question DB (`company=netflix&type=system-design`)
is only 5 items total — an order of magnitude smaller than Google's,
Meta's, or Amazon's. Confirmed by directly checking the `role=ml-engineer`
and `role=security` filters on the same DB: both returned zero results,
meaning this 5-item list is effectively the whole DB regardless of role.

1. Design Cookie Clicker. — High — [Exponent DB](https://www.tryexponent.com/questions?company=netflix&type=system-design), ~2026-06 (2 months ago)
2. Design a streaming service like Netflix. — High — Exponent DB, ~2025-12 (8 months ago); 4 answers, has video
3. **Build a TTL cache.** — High — Exponent DB, ~2026-04 (4 months ago); 1 answer — corroborated with real follow-up detail by the SWE guide (see narrative #12); combined and shipped as `netflix-ttl-cache-eviction-compaction`
4. **How would you design a frequency capping system?** — High — Exponent DB, ~2026-04 (4 months ago) — corroborated with full numbers/detail by the system-design blog and the SWE guide (see narrative #7); shipped as `netflix-frequency-capping-system`
5. **What data models do you need for an advertiser to start a campaign and show ads to users?** — High — Exponent DB, ~2026-04 (4 months ago) — corroborated with full multi-part detail by the SWE guide's data-modeling round (see narrative #8); shipped as `netflix-ads-campaign-data-model`

### Netflix System Design Interview blog — narrative items (numbered continuing from 5)

All from the dedicated [Exponent Netflix System Design Interview (2026 Guide)](https://www.tryexponent.com/blog/netflix-system-design-interview),
last updated ~3 months before fetch, written from two full candidate
loop accounts plus general SME input. High confidence, full page reread.

6. **"After you open the Netflix app and select a viewing profile, Netflix displays a collection of recommended titles organized into categories... How would you design a dynamic recommendation system for Netflix?"** — High — candidate asked about expected simultaneous users before designing anything and was told a specific number (300 million) which shaped the rest of the discussion. Shipped as `netflix-dynamic-recommendation-system`.
7. **Frequency capping**: "How do you limit ad impressions for a given advertiser to a maximum frequency (e.g., 5 views per user per day, 10 per campaign cycle) across Netflix's full user base? Requires rate limiting at scale, distributed counters, and multiple levels of capping: line item, campaign, and category." — High — same core prompt independently reconfirmed verbatim by the SWE guide's system-design section (narrative #9 below) and the bare DB item (#4). Shipped as `netflix-frequency-capping-system`.
8. **Data modeling round** (separate from system design): entity schema for advertiser campaigns, frequency capping, targeting, and revenue tracking (Ads team) — High — same underlying prompt independently reconfirmed verbatim by the SWE guide's dedicated data-modeling section (narrative #14 below) and the bare DB item (#5). Shipped as `netflix-ads-campaign-data-model`.
9. **Internal event-logging build-vs-buy**: "an internal tooling team candidate got a question about a real architectural decision the team was facing: whether to build and own event logging clients internally or provide documentation and let other teams build their own clients" — High — the interviewer had "clearly shaped the question around a real ongoing debate within the team," per the candidate's own account. Full verbatim prompt independently confirmed by the SWE guide (narrative #13 below). Shipped as `netflix-event-logging-own-vs-docs-client`.
10. Design a content delivery network — High — listed in the blog's own "Netflix system design questions" prompt list; bare, no elaboration beyond the title
11. Design X/Twitter — High — same list; bare, generic, not Netflix-specific

### Netflix Software Engineer Interview Guide — additional items (numbered continuing from 11)

From the [Exponent Netflix Software Engineer Interview Guide](https://www.tryexponent.com/guides/netflix-software-engineer-interview),
updated 22 days before fetch (the most recently updated Netflix guide checked
this pass), marked "Verified" (real, recent, first-hand candidate/interviewer
insights). High confidence, full page reread.

12. **"Implement a TTL cache. What happens if you never evict expired entries? What are some approaches to compacting the cache on a regular cadence?"** — High — reported in the technical-screen round (CodeSignal/CoderPad, 45-60 min); the exact same base prompt as DB item #3, now with the two follow-up questions that give it real specificity. Shipped as `netflix-ttl-cache-eviction-compaction`.
13. **"You're building a product for logging events. Should you own the client libraries that ingest those events, or provide documentation and let other teams build their own clients? Walk through your recommendation."** — High — reported in the onsite system-design round; verbatim match to the blog's narrative account (#9 above). Shipped as `netflix-event-logging-own-vs-docs-client`.
14. **"Describe the data models needed for an advertiser to start a campaign and show ads to users. Cover ad frequency capping, ad targeting, creative delivery, and revenue tracking."** — High — reported in the dedicated data-modeling round; verbatim match to the blog's narrative account (#8 above) and the bare DB item (#5). Shipped as `netflix-ads-campaign-data-model`.
15. "Walk through the full ad stack, from demand sources and campaign setup through to impression-level data. How do you represent this business in data?" — High — same data-modeling round, a second recently-asked prompt; real but judged redundant with #14 once #14 shipped, so left in tracker only
16. "Given an org chart represented as a tree, calculate the level (depth of direct reports) for each employee, determine which employees are 'balanced' (equal number of nodes above and below), and produce a histogram of employees at each level." — High — onsite coding round; a real, detailed DSA prompt, but pure algorithms with no system-design/architecture angle, so out of category for this app's question set
17. "Build a table component that renders a list of event log stream configurations..." / "Build a collapsible list component..." — High — technical-screen and coding-round front-end coding prompts; real but out of category (front-end component implementation, not system design)
18. Recruiter-screen and behavioral-round sample questions ("What excites you about this particular role?", "Tell me about a time you disagreed with a decision...", etc.) — High — real, but pure behavioral/culture-fit with no design content, and Netflix has no confirmed FDE-equivalent role to justify categorizing any of them as `fde-agentic` the way Google's one behavioral item was — left uncategorized/unshipped

### Netflix Machine Learning Engineer (MLE) Interview Guide — additional items (numbered continuing from 18)

From the [Exponent Netflix MLE Interview Guide](https://www.tryexponent.com/guides/netflix-machine-learning-engineer-interview),
updated ~3 months before fetch. High confidence, full page reread.

19. **"You've been given access to 10,000 movie reviews. Each review contains several sentences and a score from 1 to 10. How would you design a system to predict the movie score based on the review text?"** — High — listed under both the "final interviews" technical-screening round and the dedicated "ML system design" section, suggesting it recurs across the loop rather than being a one-off. Shipped as `netflix-movie-review-score-prediction`.
20. "How would you build a system like Netflix?" — High — listed in both the final-interviews and ML-system-design sections; bare, no elaboration
21. "What metrics do you monitor after deploying a machine learning model?" — High — general ML-ops question, not really a system-design prompt; left in tracker
22. "How do you decompose ML model errors into variance and bias?" / "Given a dictionary with weights, write a function in Python that returns a key at random, with a probability proportional to the weights." — High — ML-concept and coding-round items respectively; out of category for this app's system-design-flavored question set

### LLD / OOD-flavored

Covered inline above — `netflix-ttl-cache-eviction-compaction` (#3/#12) and
`netflix-ads-campaign-data-model` (#5/#8/#14) are both categorized `lld-ood`
in the app, the former for its object/data-structure-design core, the latter
for its schema/entity-relationship focus (matching the precedent Amazon's
`amazon-food-marketplace-favorites-dashboard` and Google's pharmacy-shop
question set for a data/object-modeling round distinct from distributed HLD).

### ML / GenAI system design

Covered inline above (#19–22) — the movie-review-score-prediction question
(#19, shipped) is the one genuinely ship-worthy ML item; the rest are either
bare titles or pure ML-concept/coding questions without a system-design
angle.

### Forward Deployed Engineer / agentic track

**Checked, no trail found.** Searched directly for "Netflix forward deployed
engineer interview" — unlike Amazon and Apple (both confirmed to have real,
currently open FDE-titled postings even without a candidate-report trail),
no evidence turned up this pass that Netflix has an FDE-titled role at all.
One search result asserted "'Forward Deployed Engineering' is listed as a
specialized role category at Netflix" without a verifiable source behind
that specific claim — not confirmed directly via Netflix's own careers site
this pass, so treated as unconfirmed rather than cited. Logged as its own
distinct status: not "role doesn't exist" (Meta's confirmed finding) since
it wasn't actively disproven, but weaker than Amazon/Apple's "role exists, no
question trail" finding since the role's existence itself isn't confirmed
either. Revisit if a clearer source surfaces.

### Scenario-based / operational

23. **Blind — "Netflix interview, system design help"**: a candidate interviewing with the Cloud infrastructure engineering org reported the recruiter told them the system-design round would be "something on the lines of 'design a job scheduler', i.e. more infra focussed and not product focussed" — Medium — [Blind](https://www.teamblind.com/post/netflix-interview-system-design-help-tgvgweqo), Jul 2024, full page reread (the post itself, not a comment). This is the candidate's own paraphrase of what a recruiter told them in advance, not a verbatim reported question, and the thread's 17 comments are gated behind a login wall — too thin to ship, but a real, useful corroboration that Netflix's infra-focused teams ask genuinely different (non-product) system-design prompts than the product-team prompts that dominate the rest of this catalog.
24. General "walk me through an incident" / on-call troubleshooting search turned up only generic, cross-company SRE-interview-prep consensus with no Netflix-specific candidate report behind it — same treatment as Google's/Amazon's excluded generic troubleshooting items — not logged as a distinct catalog item.

### Explicitly excluded

- **educative.io's "5 Netflix System Design Interview questions to master in 2026"** — checked directly this pass (browser). Explicitly framed as the blog author's own top-5 picks with the author's own answer content (CDN, fault-tolerant streaming, recommendation system, low-latency streaming, autocomplete search) — zero attribution to any candidate report, date, or level. Same failure mode as `prachub.com` in the Google pass. Dropped.
- **designgurus.io's "Netflix System Design Interview Questions: An In-Depth Guide"** — checked directly this pass (browser). Same pattern: representative example questions and worked answers with no per-item candidate/source citation anywhere on the page. Dropped.
- **Exponent's "Get a Job at Netflix" blog's long per-category question lists** ([tryexponent.com/blog/an-inside-look-into-the-netflix-interview-process](https://www.tryexponent.com/blog/an-inside-look-into-the-netflix-interview-process)) — checked directly this pass. Labeled "examples of real interview questions asked at Netflix" but, unlike the dedicated system-design blog's named-candidate anecdotes or the DB's per-item dates, carries zero per-question attribution (no date, no level, no candidate account) across its Behavioral/Coding/System Design/Data Science/ML/PM sections. Treated as Medium-at-best and, since nearly every item in it is also a bare title, none of it shipped independently of what the DB/dedicated guides already corroborate.
- **LeetCode's personal-practice/tutorial posts** — two Netflix-tagged threads ("Netflix System Design" by Spook, Sep 2021; "System Design of Netflix" by Tech Takshila, Jul 2020) were opened and read in full but turned out to be the poster's own practice diagrams/tutorial content, not a reported real interview question — excluded from the catalog entirely rather than logged as a numbered item, consistent with how Amazon's pass handled the satirical Blind thread (read in full, confirmed not real content, excluded).
- **LeetCode's curated cross-company "Helpful list" post** ([leetcode.com/discuss/interview-question/1140451](https://leetcode.com/discuss/interview-question/1140451/helpful-list-of-leetcode-posts-on-system-design-at-facebook-google-amazon-uber-microsoft)) — checked directly this pass, per the workflow's own step 2 instruction to check it for every company. No Netflix section exists in this list at all (only Facebook/Google/Amazon/Uber/Microsoft) — confirms, rather than just suggests, that Netflix's LeetCode Discuss trail is thin relative to the other Big Tech/hyper-scale companies covered in this tracker.

## Uber — shipped to app (2026-08-24)

The full research catalog below runs to roughly 30 items, but only **6**
cleared the same ship bar established for every prior company: real
specificity (concrete numbers, explicit constraints, a multi-part ask, or an
actual narrative), not a bare imperative. Uber's own Exponent question DB is
tiny (10 items, one page — smaller than every Big Tech company's and close
to Netflix's 5-item DB), so almost everything that shipped this pass came
instead from fully-reread LeetCode Discuss threads and one first-person
Medium account, not the bare-title DB.

**Shipped** (ids match `uber.ts`): `uber-truck-tracking-driver-status`,
`uber-driver-location-upload-search-api`, `uber-driver-heatmap-24h-durable`,
`uber-event-tracking-ingestion-api`, `uber-billions-messages-keyword-index`,
`uber-surge-pricing-engine-regulatory-caps`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
or PM/product-sense prompts with no engineering-design content to fit this
app's five question categories: the DB's 5 remaining bare items (Design
Robinhood, Design Uber, Design Uber Eats, the gift-card-redemption-flow
question, the free-product-monetization question); every PM/product-sense
item from the "Get a Job at Uber" blog (the leadership dashboard, the
e-scooter-rides estimate, the cash-payments-in-Brazil jam-session prompt, the
driver-payout/driver-reward/driver-performance-app jam-session prompts, the
40%-fake-reviews PM question, the airport-drop-offs-vs-pickups PM question,
the UberEATS-basket-size PM question); the bare "how would you implement a
system that matched riders with cars?" item (same specificity level as
"Design Uber," which also didn't ship); the self-practice "Uber System
Design" LeetCode diagram post (real content, but the poster's own untimed
practice diagram, not a reported interview question); and the generic
"Design Uber Backend" LeetCode thread (no Uber-tag confirmation it came from
an actual Uber interview rather than a practice prompt elsewhere). If any of
these later gets a real elaboration (a specific candidate account, not just
a topic-database title), promote it into `uber.ts` then.

## Uber — full research catalog (2026-08-24 research pass)

Questions only for the bulk list; the narrative items carry enough detail to
double as their own answer material. Grouped by round type, matching the
research buckets. Confidence tags follow the same High/Medium/Low definition
used for every prior company (see Google's section header). Dates below are
relative-to-fetch ("N ago" as reported on 2026-08-24), converted to an
approximate month — treat as approximate.

### General / classic system design — Exponent question DB (10 items, not role-filtered)

Uber's own general system-design question DB (`company=uber&type=system-design`)
is only 10 items total. Confirmed by directly checking the
`role=ml-engineer&type=system-design` filter on the same DB (zero results)
and `role=software-engineer` alone (also zero results) — this 10-item list
is effectively the whole DB regardless of role.

1. Design Robinhood. — High — [Exponent DB](https://www.tryexponent.com/questions?company=uber&type=system-design), ~2025-12 (8 months ago), 1 answer
2. Design Uber. — High — Exponent DB, ~2025-08 (1 year ago); 5 answers, has video answer
3. Design Uber Eats. — High — Exponent DB, ~2026-03 (5 months ago); 11 answers, has video answer
4. How would you design the gift card redemption flow? — High — Exponent DB, ~2024 (2 years ago)
5. **Design a truck tracking system that supports filtering by truck number and includes an interface for updating driver status.** — High — Exponent DB, ~2024 (2 years ago); 2 answers — independently corroborated verbatim by the "Get a Job at Uber" blog's own system-design question list (#11 below). Shipped as `uber-truck-tracking-driver-status`.
6. Design a free product. How would you monetize it? — High — Exponent DB, ~2023 (3 years ago); 3 answers — product-sense, not architecture
7. You are a PM at UberEATS. What feature would you build to optimize for average basket size? — High — Exponent DB, ~2021 (5 years ago); 1 answer — PM/product-sense
8. Design a malware scanner reporting dashboard. — High — Exponent DB, ~2025-11 (9 months ago)
9. Design a car rental system. — High — Exponent DB, ~2026-06 (2 months ago)
10. Design a stock ticker system. — High — Exponent DB, ~2026-06 (2 months ago)

### "Get a Job at Uber" Exponent blog — additional items (numbered continuing from 10)

From the [Exponent "Get a Job at Uber" blog](https://www.tryexponent.com/blog/uber-interview-process),
explicitly marked "✅ Verified: This guide was created with the help of an
Uber interviewer" — the strongest single-page source this pass. High
confidence, full page reread.

11. Design a truck tracking system that supports filtering by truck number and includes an interface for updating driver status. — same prompt as #5, listed independently in this blog's own "System design" question list
12. Design Uber. — same as #2
13. How would you implement a system that matched riders with cars? — High — same specificity level as "Design Uber" (no numbers/constraints beyond the one-line scope); unshipped
14. **Design a leadership dashboard showing the top 10 profitable cities for Uber across all business verticals.** — High — data-analytics/PM-flavored; has some real specificity (top 10, across all business verticals) but no category in this app's schema fits a dashboard/reporting prompt cleanly the way an architecture question does; left in tracker only, consistent with every prior company's PM/product-sense items staying unshipped
15. Estimate the potential number of rides per month for e-scooter rentals in San Francisco. — High — data engineering/estimation, not a design prompt
16. Should Uber accept cash payments in Brazil? — High — PM jam-session prompt, product-sense
17. Design an app for drivers to understand how they're doing. — High — PM jam-session prompt
18. How would you handle driver payout? — High — PM jam-session prompt
19. How would you reward long-term drivers? — High — PM jam-session prompt
20. Uber has about 40% fake reviews. How can you approach the issue as a PM at Uber? — High — PM, has a real specific number (40%) but is a product/policy question, not a design one
21. According to one figure, there are more Uber drop-offs at the airport than pick-ups. Why is this the case, and what can you do to improve it? — High — PM, product-sense
22. Data modeling questions listed in the same blog (How would you do the data model for the Uber app? / Design a data warehouse schema for Amazon. / Design a retail application. / Design a rental car service.) — High — bare titles, no further elaboration

### LeetCode Discuss / Blind narratives — the ship-worthy core of this pass (numbered continuing from 22)

23. **Driver location upload + search API**: "Design API to upload Driver location to server after every 3 secs and ability to check/search driver location (from any current / past trip) up to 30 days," with the OP's own worked example — a driver who starts a trip lasting 2 minutes generates 40 location writes (120 seconds ÷ 3-second interval), with an assumption of ~100K active trips running in parallel — plus "decide the database to store this data so we can fetch it faster." — High — [LeetCode Discuss, "System Design Interview Question | Uber | Phone Interview"](https://leetcode.com/discuss/interview-question/system-design/1894358/system-design-interview-question-uber-phone-interview), Mar 2022, full page reread. Shipped as `uber-driver-location-upload-search-api`.
24. **Real-time driver-location heatmap**: "Create a system where every driver is sending their location in real time, plot a heatmap showing the number of drivers in a particular location in the last 20 minutes, consider 1-minute buckets." — High — [LeetCode Discuss, "Uber | System Design Interview"](https://leetcode.com/discuss/interview-question/1887549/uber-system-design-interview/), Mar 2022, full page reread. Independently corroborated with the exact same wording, explicitly framed as an **L6 Staff Engineer round**, by [Blind, "Uber L6 staff engineer system design round"](https://www.teamblind.com/post/Uber-L6-staff-engineer-system-design-round-8EuJe85R), Dec 2022, full page reread — Blind's account adds a genuine third follow-up beyond the base prompt: "make the data of #2 available for analytics after 24 hours (should be durable)," with the candidate reporting they had to address sampling, storage, retrievals, latency, and TTL. Combined and shipped as `uber-driver-heatmap-24h-durable`, using Blind's richer follow-up.
25. A near-identical heatmap variant — "user can input any range of times (in minutes)" rather than a fixed 20-minute/1-minute-bucket window — reported by a candidate who passed the coding round but was explicitly rejected on this system-design round. — High — [LeetCode Discuss, "UBER | ONSITE | REJECT"](https://leetcode.com/discuss/interview-question/1727556/uber-onsite-reject), Jan 2022, full page reread. Real, but redundant with #24 once #24 shipped with the more specific numbers; kept here as corroborating context on how hard the bar is on this exact question, not shipped separately.
26. **Event tracking / analytics ingestion system**: "A system that injects messages from other services. Plus, analyzes this data," reported at a **Senior Software Engineer (SSE) onsite**, with three explicit constraints — the data volume can't fit on a single disk, can't be handled by a single server, and messages can arrive out of order (an end event can arrive before its start event) — and an explicit supported-API surface: `startEvent(event_id, timestamp)`, `endEvent(event_id, timestamp)`, `getOngoingEvents(timestamp)`. — High — [LeetCode Discuss, "System Design | Uber | SSE"](https://leetcode.com/discuss/interview-question/3378926/System-Design-or-Uber-or-SSE/), Apr 2023, full page reread. Shipped as `uber-event-tracking-ingestion-api`.
27. **Keyword index over billions of text messages**: "Given billions of text messages and a list of keywords, design the index for the messages in order to efficiently retrieve messages that contain given keywords," with each message identified/retrieved by a unique sequence number, reported at an **SDE2 round** with three explicit sub-tasks — (1) design the data structure to organize the keyword index, (2) search messages containing a single keyword, (3) search messages containing multiple keywords (optional: implement the method) — and the interviewer explicitly rejecting the candidate's proposed trie-plus-map-of-message-IDs approach on the grounds that message volume is in the billions. — High — [LeetCode Discuss, "Uber | SDE2 | System design"](https://leetcode.com/discuss/interview-question/1715795/uber-sde2-system-design/), Jan 2022, full page reread. Shipped as `uber-billions-messages-keyword-index`.
28. **Real-time surge pricing engine**: a Senior SDE final-round onsite question — "We need a system that can calculate dynamic pricing for every hexagonal zone in a city in near real-time. It should consider current ride requests, available drivers, historical demand patterns, and external factors like weather or events. The multiplier must update at least every 60 seconds." The candidate's own first-person account covers the full round: their proposed H3-hexagonal-grid partitioning (resolution 7, ~5km² hexes), a Kafka→Flink→Redis pipeline recalculating every 30–60 seconds, explicit failure-mode handling (stale-cache TTL fallback, a dead-letter queue plus on-call alert, a circuit breaker defaulting to 1.0x/no-surge), and — critically — the follow-up question that tripped them up: "How do you handle surge pricing across city boundaries where hexagonal zones overlap different regulatory regions?" (different cities cap surge at different multipliers, e.g. NYC at 2.5x), which the candidate couldn't answer beyond a vague per-city config lookup. The candidate was rejected, with recruiter feedback citing insufficient depth on "cross-region system complexity and edge case handling." — High — [Medium, "I Failed Uber's System Design Interview Last Month. Here's Every Question They Asked."](https://medium.com/@emilyhustlenyc/i-failed-ubers-system-design-interview-last-month-here-s-every-question-they-asked-bdaf1bd6e64b), Feb 2026, full page reread, first-person account. Shipped as `uber-surge-pricing-engine-regulatory-caps`.
29. "Uber System Design" — a self-practice diagram post by a candidate practicing under a 40-minute clock, listing Uber (among Meta/FourSquare/DoorDash/Swiggy/Deliveroo) as companies this design might come up at, rather than reporting one specific real interview. — High (real page, real content) but excluded as a shippable question — it's the poster's own untimed practice material, not a candidate report of an actual asked question. [LeetCode Discuss](https://leetcode.com/discuss/interview-question/system-design/1490926/uber-system-design/), Aug 2023 (originally posted Sep 2021).
30. "Design Uber Backend — define use cases, scope on your own, come up with various components, give high and low level design." — High (page confirmed) but the thread carries no "Uber" company tag and no confirmation it came from an actual Uber interview rather than a general practice prompt about the Uber product — left in tracker only, unshipped. [LeetCode Discuss](https://leetcode.com/discuss/interview-question/object-oriented-design/124542/design-uber-backend), Oct 2018.

### ML / AI system design

**Checked, genuinely thin.** Exponent's Uber ML Engineer role filter
(`company=uber&role=ml-engineer&type=system-design`) returns zero results —
confirmed via direct page fetch, not inferred from a search snippet.
Broader searches (InterviewQuery's Uber MLE guide, Dataford, DataInterview,
Interview Node) describe Uber's ML interview loop only in generic
loop-structure terms — feed ranking, pickup-location optimization
trade-offs, LLM/RAG topics for L5a+ candidates — with no actual reported
question text behind any of it. Nothing to ship or even log as a numbered
catalog item; noted explicitly per the workflow's instruction rather than
silently omitted.

### Forward Deployed Engineer / agentic track

**Checked, status unconfirmed either way.** Unlike Amazon/Apple (confirmed
real, currently open FDE-titled postings with no candidate-question trail)
or Meta (confirmed no such role exists), searches for an Uber Forward
Deployed Engineer or agentic-AI-specific role turned up no evidence either
confirming or disproving the role's existence at Uber. Closest in kind to
Netflix's finding from the prior pass — logged as its own distinct status
rather than reused wording from a different company.

### Scenario-based / operational

**Checked, genuinely thin.** No Uber-specific incident-response/on-call
system-design prompt with real narrative specificity was found (unlike
Google's cross-site-corroborated "paged at 2am" prompt). [Mockingly.ai's
"Monitoring & Alerting System Design — Uber"](https://www.mockingly.ai/questions/metrics-monitoring-alerting-system-design-at-uber)
page asserts a metrics-monitoring-and-alerting design question is asked at
"Datadog, Google, Amazon, Meta, Netflix, Cloudflare, and Uber" — but, like
`prachub.com` in the Google pass, cites no actual per-company candidate
report behind that claim; it's the site's own authored mock-interview
content, not a sourced Uber question. Excluded, and not counted as a found
operational item for Uber specifically.

### Explicitly excluded

- **hack2hire.com's Uber system-design question bank** — checked directly this pass per the workflow's per-new-site provenance rule. Claims "9+ problems from 200+ candidate reports" but shows only titles with vague "reported N days/weeks ago" badges and no visible per-question source link — same failure mode as `prachub.com` in the Google pass. Its one Uber-specific title ("Design Driver Location Heatmap") only restates what #24 above already independently confirmed with real text from two better sources, so it added nothing new. Dropped.
- **Medium, "My Uber system design interview journey..." by Kei Zee** (Nov 2025) — checked directly this pass, full page reread. Turned out to be generic system-design-interview prep advice (requirements-gathering, scalability-vs-maintainability tradeoffs, failure-mode thinking) framed around "my mock interviews" over a 3-month prep period, not an account of a real, dated Uber interview loop — no specific reported question with a real date/level/outcome the way the surge-pricing Medium post (#28) has. Excluded as prep-advice content rather than a sourced candidate report.
- **LeetCode's curated cross-company "Helpful list" post** ([leetcode.com/discuss/interview-question/1140451](https://leetcode.com/discuss/interview-question/1140451/helpful-list-of-leetcode-posts-on-system-design-at-facebook-google-amazon-uber-microsoft)) — checked per the workflow's own step 2 instruction. Uber does have a section in this list (unlike Netflix's pass, which found none), but every linked thread in it was already independently found and reread via direct search this pass (#23–27, #29 above) — no new threads recovered from the curated list itself.

## Airbnb — shipped to app (2026-08-24)

The full research catalog below runs to roughly 27 items, but only **6** cleared
the ship bar: real specificity (concrete numbers, explicit constraints, a
multi-part ask, or an actual narrative), not a bare imperative. Airbnb's own
Exponent question DB is the smallest of any company checked so far (2 items,
one page), so — same pattern as Uber's pass — almost everything that shipped
came from fully-reread LeetCode Discuss threads, one fully-reread Blind
thread, and Hello Interview's community question database (a new source this
pass, treated carefully — see the research-log note below on how its
provenance was judged), not the bare-title DB.

**Shipped** (ids match `airbnb.ts`): `airbnb-wallet-payment-system`,
`airbnb-host-guest-messaging-fanout`, `airbnb-booking-platform-hot-partitions`,
`airbnb-booking-waitlist-demand-notifications`, `airbnb-in-memory-file-system`,
`airbnb-recently-viewed-listings`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
generic across many companies rather than confirmed Airbnb-specific, or
failed the per-new-site provenance check: the DB's 2 bare items (Design
Airbnb's search functionality, Design a group chat application); every bare
system-design title from the "Get a Job at Airbnb" blog and the Hello
Interview G9 guide's "most commonly asked" lists (Design Airbnb wallet
payment system as a bare title — superseded by the richer LeetCode-sourced
wallet question that shipped; a chatbot service for the Airbnb platform;
a rental room inventory management system; a system to handle booking
conflicts and cancellations; a notification system; a job scheduler); Hello
Interview's generic, 20-company "Design a Notification System" question
(real per-report Airbnb corroboration exists — a dated Aug 2026 Senior-level
report — but the prompt itself is a canonicalized write-up shared verbatim
across ~20 other companies with no Airbnb-specific elaboration, a
meaningfully weaker signal than the exclusively-Airbnb-tagged waitlist
question that did ship); Hello Interview's "Design a Reservation System for
Airbnb" (same generic-across-companies concern — tagged to Rippling,
headway, and others in addition to Airbnb — left unshipped in favor of the
more specific, exclusively-sourced booking/hot-partition question); Hello
Interview's "Design Fraud detection system" (real, Airbnb-exclusive, two
dated Principal/Staff reports, but zero elaboration beyond the bare title);
`prachub.com`'s "Design a customer LTV prediction system" Airbnb ML question
(failed the per-new-site provenance check — no per-question source citation
at all, same failure mode logged for `prachub.com` since the Google pass);
`dataford.io`'s Airbnb GenAI Engineer question list (same provenance
failure — no dates, no "reported by," no per-item citation, reads as
generic authored prep content rather than sourced candidate reports); the
self-practice "Hotel Booking App" LeetCode LLD writeup (real content, but
the poster's own open-source side project, not a reported interview
question — a commenter directly asked "was this a recent question from a
specific company?" and got no confirming answer); the generic
"Design Uber Backend"-style bare "Design a wallet"/coding-round corroboration
threads that added no new information beyond what the shipped wallet
question already covers; and InterviewMan's "Airbnb Software Engineer
Interview Guide 2026" blog post — read in full, contains a detailed
first-person-styled booking/pricing/double-booking system-design narrative,
but excluded on authenticity grounds: the site's entire business is selling
an "undetectable real-time AI answers during live interviews" cheating tool,
and the post is structured as marketing copy for that product (complete with
mid-narrative product pitches) rather than a verifiable candidate account —
a meaningfully different risk profile than every genuine first-person Medium
account cited elsewhere in this tracker, so nothing from it was used even
though its booking-system narrative is otherwise the same shape as what
shipped from the Jan-2026 LeetCode account.

## Airbnb — full research catalog (2026-08-24 research pass)

Questions only for the bulk list; the narrative items carry enough detail to
double as their own answer material. Grouped by round type, matching the
research buckets. Confidence tags follow the same High/Medium/Low definition
used for every prior company (see Google's section header). Dates below are
relative-to-fetch ("N ago" as reported on 2026-08-24) or the exact dates
shown on the source page, converted to an approximate month where relative —
treat as approximate.

### General / classic system design — Exponent question DB (2 items, not role-filtered)

Airbnb's own general system-design question DB (`company=airbnb&type=system-design`)
is only 2 items total — the smallest of any company checked in this tracker
so far, smaller even than Uber's (10) and Netflix's (5).

1. Design Airbnb's search functionality. — High — [Exponent DB](https://www.tryexponent.com/questions?company=airbnb&type=system-design), ~2024 (2 years ago), 5 answers, has video answer
2. Design a group chat application. — High — Exponent DB, ~2026-04 (4 months ago), 1 answer

### "Get a Job at Airbnb" Exponent blog — additional items (numbered continuing from 2)

From the [Exponent "Get a Job at Airbnb" blog](https://www.tryexponent.com/blog/airbnb-interview-process),
explicitly marked "✅ Verified: This guide was created with the help of an
Airbnb interviewer" — the strongest single-page source this pass, same role
Uber's equivalent blog played in the prior pass. High confidence, full page
reread.

3. Design Airbnb's search functionality. — same as #1
4. Design Airbnb wallet payment system. — bare-title version of what shipped in richer form from LeetCode (#14 below)
5. How would you build a chatbot service for the Airbnb platform? — High — bare imperative, no further elaboration
6. Design a rental room inventory management system. — High — bare imperative
7. Design a system to handle booking conflicts and cancellations. — High — bare imperative; the richer, ship-worthy version of this same theme is the LeetCode double-booking/hot-partition question (#15 below)

### Hello Interview — Airbnb G9 (Senior) guide and community question database (numbered continuing from 7)

New source this pass. [Hello Interview's Airbnb G9 guide](https://www.hellointerview.com/guides/airbnb/g9)
is a detailed, dated (updated Feb 2026), full-loop process writeup with a
direct candidate quote ("During system design round, interviewer asked a lot
of questions in database schema including the data types, which is not
expected.") — used for process/context, not as a question source, since its
own "most commonly asked" lists are bare titles. Its linked community
question database (`hellointerview.com/community/questions/...`) is a
different kind of source than Exponent's DB: each question page shows a
"Question Timeline" of dated, leveled, company-tagged individual reports
(not just a single aggregate count), which is closer in spirit to a
real per-report log than a bare title — treated as High confidence when the
page was read in full and the per-report timeline checked, but flagged with
a note whenever the prompt text itself is Hello Interview's own
canonicalized write-up aggregated across reports rather than one candidate's
verbatim wording. Company-exclusivity of the tag (only Airbnb vs. shared
with many companies) was used as the main signal for how Airbnb-specific a
question actually is — see the shipped/unshipped split below.

8. **Design a booking waitlist system** — exclusively tagged to Airbnb (unlike every other Hello Interview question checked this pass), with three separate dated reports: Staff (mid Jul 2026), Senior (early Jul 2026), Senior Manager (late May 2026). Full functional scope: join/leave waitlist, host-facing aggregated demand view, notify-on-cancellation with a fair time-limited claim window. — High — [Hello Interview](https://www.hellointerview.com/community/questions/booking-waitlist-system/cmf9ygbvj015h08adv95a25un), full page reread. Shipped as `airbnb-booking-waitlist-demand-notifications`.
9. Design a Reservation System for Airbnb — real specificity (search + book + manage, API design + payment integration focus, P95<300ms deep dive) but tagged to multiple other companies (Rippling, headway, +1 more) in addition to Airbnb, with only one dated Airbnb-specific report (Manager, mid Jul 2026) carrying no further elaboration beyond the level — High confidence as a real page, but left unshipped as the weaker, more generic sibling of the booking/hot-partition question that did ship. [Hello Interview](https://www.hellointerview.com/community/questions/airbnb-reservations-api/cm755yj2y01zualw2r9jswa4g), full page reread.
10. Design a Notification System — real specificity (1M notifications/sec, 80/20 critical/promotional split, per-type expiration/dedup TTLs) but shared verbatim across ~20 companies (Coupang, Metropolis, Microsoft, Autodesk, Pinterest, and more) with only one dated Airbnb report (Senior, early Aug 2026) and zero Airbnb-specific elaboration — same generic-multi-company concern as #9, left unshipped. [Hello Interview](https://www.hellointerview.com/community/questions/notification-system-scale/cm758vf17024kalw2qn7e57xs), full page reread.
11. Design Fraud detection system — exclusively tagged to Airbnb, two dated reports (Principal, early Apr 2026; Staff, late Jul 2025), but the question page itself carries zero elaboration beyond the bare title — real and Airbnb-specific, but fails the ship bar on specificity alone. [Hello Interview](https://www.hellointerview.com/community/questions/fraud-detection-system/cmdooh3zd0aovad08rch9uti4), full page reread.
12. Design a booking waitlist system's sibling bare titles from the G9 guide's own "most commonly asked" list (not independently verified as separate DB entries this pass): Design a Job Scheduler, Design a Reservation System for Airbnb (=#9), Design a Chat/Messaging System (=#13 below, richer version shipped from Blind instead).

### LeetCode Discuss / Blind narratives — the ship-worthy core of this pass (numbered continuing from 12)

13. **Host-guest messaging / group chat system**: "Design Group Chat System (group messaging with online and offline delivery and fan-out strategies)," reported for a senior SWE loop, independently corroborated by a second commenter on the same thread: "I got the messaging service question. Basically, on Airbnb, hosts and guests can message each other. It's a group chat of sorts and you can add people to the chat." A third commenter compared it directly to designing WhatsApp. — High — [Blind, "Airbnb system design expectations"](https://www.teamblind.com/post/airbnb-system-design-expectations-qyk5urzo), ~Apr 2026, full page reread (including the AI-generated comment summary, cross-checked against the actual comment text rather than trusted on its own). Shipped as `airbnb-host-guest-messaging-fanout`.
14. **Airbnb wallet**: "Design airbnb wallet" with features (balance, transaction history, transfer between wallet and bank account) and explicit API signatures (`create_transfer(account_number, routing_number, transfer_type, amount)`, `get_transfer_status(vendor_transfer_id)`), plus a CAP-theorem discussion in the comments. Independently corroborated by a second candidate (Nov 2022 comment) who reported getting the identical question and worked real numbers live: ~10M DAU → ~3M transactions/day → ~36 TPS on the payment API, ~1KB/record → ~3GB/day storage, SQL for the hot path with NoSQL archival past 6 months, async/polling for a vendor API that can take hours, Kubernetes restarts or active-passive failover for service failures. A third candidate (Aug 2024 comment) confirmed getting the same question again. — High — [LeetCode Discuss, "Airbnb | System Design Round | Airbnb Wallet"](https://leetcode.com/discuss/interview-question/1352118/airbnb-system-design-round-airbnb-wallet/), Jul 2021, full page reread. Shipped as `airbnb-wallet-payment-system`.
15. **Booking platform avoiding double bookings, with a hot-partition follow-up**: "Design a booking platform for Airbnbs avoiding double bookings. It should support creating, modifying and deleting bookings. The interviewer indicated that we need to build search capability as well. Follow up: How would you handle scenario when a major event is happening in an area say a Taylor Swift concert. If your database is partitioned by zip code, how would you handle hot partitions." Reported for a Senior Engineer onsite, part of a 5-round loop (2 coding, 1 technical-experience, this system-design round, values round); candidate cleared the 3 coding rounds but reported not performing as well here and was given a second attempt at the round. — High — [LeetCode Discuss, "Airbnb | Senior Engineer | Interview Experience"](https://leetcode.com/discuss/post/7517460/airbnb-senior-engineer-interview-experie-yr5o/), Jan 2026, full page reread. Shipped as `airbnb-booking-platform-hot-partitions`.
16. **In-memory file system**: full LeetCode-588-style spec — `ls`, `mkdir`, `addContentToFile`, `readContentFromFile` — with exact method semantics and a worked example, reported for a 45-minute phone screen. — High — [LeetCode Discuss, "Airbnb | Phone Screen | Design In Memory File System"](https://leetcode.com/discuss/post/874876/airbnb-phone-screen-design-in-memory-fil-n2im/), interview dated 2020-09-25, posted Oct 2020, full page reread. Shipped as `airbnb-in-memory-file-system` under the `lld-ood` category rather than `system-design` — it's an OOD/data-structure exercise, not a distributed-systems design, same categorization call Google's pass made for its pharmacy-shop LLD find.
17. **Recently viewed listings**: "Find the recently viewed listings on the website by the user. Example a user looked for hotels in Bangalore. Design a system responsible to return the recent listings for a user." Reported as the 4th and final technical round of an L4 Bangalore onsite loop (after 1 HackerRank round and 2 coding rounds); the candidate reported not performing well specifically on this round and was rejected despite clearing the earlier coding rounds, noting Airbnb weighs code quality (variable names, modular functions) and communication heavily even in this round. — High — [LeetCode Discuss, "AirBnb | Software Engineer | L4 Bangalore"](https://leetcode.com/discuss/post/1775088/airbnb-software-engineer-l4-bangalore-by-yxg5/), Feb 2022, full page reread. Shipped as `airbnb-recently-viewed-listings`.
18. A near-duplicate "Design a wallet" corroboration with no new detail beyond #14 — "Had two hackerrank coding interviews... System design 1: Design a wallet... Not sure why I got a reject but felt most of the rounds went well." — High (real page, real content) but adds nothing beyond #14 already ships with. [LeetCode Discuss, "Airbnb | Feb 2021 | Reject"](https://leetcode.com/discuss/post/1287468/airbnb-feb-2021-reject-by-anonymous_user-rl2c/), Jun 2021 (interview Feb 2021).
19. "Hotel Booking App | System Design | Interview Question" — a detailed, real LLD writeup (HotelService/UserService/RoomService/ReservationService/PricingService/RateService/PaymentService, full data model, working GitHub code) — High (real page, real content) but excluded: a commenter directly asked "was this a recent question from a specific company?" and got no confirming reply; this reads as the poster's own open-source side project inspired by Airbnb/Booking.com/Agoda generically, not a reported interview question. [LeetCode Discuss](https://leetcode.com/discuss/post/3959984/hotel-booking-app-system-design-intervie-gtkb/), Aug 2023.
20. Generic "system design" topic confirmation from an old (2019) Blind thread — "the focus is more on scaling the DB layer and getting the data model right... they keep adding feature requests and you modify it, then increase the scale and ask you to improve it" — High (real page) but a process description, not an answerable question; used for context in the shipped-to-app note above, not shipped as its own item. [Blind, "Airbnb Architecture/System design Interview"](https://www.teamblind.com/post/airbnb-architecturesystem-design-interview-hxjevuzv), May 2019.
21. Bare "Design Booking System" title, corroborating #15's general theme — High — same Blind thread as #13 above (Sonpomn's comment), no elaboration beyond the two-word title itself.

### ML / AI system design

**Checked, genuinely thin — the thinnest bucket this pass.** Exponent's
Airbnb ML Engineer role filter (`company=airbnb&role=ml-engineer&type=system-design`)
returns zero results, confirmed by direct page fetch. The one candidate real
lead — Hello Interview's "Design Fraud detection system" (#11 above,
Airbnb-exclusive, two dated reports) — carries zero elaboration beyond the
bare title. `prachub.com`'s "Design a customer LTV prediction system" Airbnb
question (checked directly, full page reread) reads as a well-written,
detailed ML-system-design prompt, but fails the per-new-site provenance
check the same way it did in the Google pass — no per-question source
citation, no candidate name/date/level, nothing beyond the site's own
"Quick Answer" framing. `dataford.io`'s Airbnb ML/GenAI guides show the same
provenance failure (checked directly, no per-item citation). Broader
searches (InterviewQuery's and DataInterview's Airbnb MLE guides) describe
Airbnb's ML loop only in generic topic terms — trust-and-safety fraud
pipelines, photo/listing-quality models, LTV — with no actual reported
question text behind any of it. Nothing to ship; logged explicitly per the
workflow's instruction rather than silently omitted.

### Forward Deployed Engineer / agentic track

**Confirmed real, currently open GenAI-titled postings; no candidate-question
trail** — the same distinct status Amazon's and Apple's passes established
(as opposed to Meta's "confirmed no such role" or Netflix's/Uber's
"unconfirmed either way"). No posting titled literally "Forward Deployed
Engineer" turned up, but Airbnb's own careers site confirmed multiple real,
currently open GenAI-Systems-flavored engineering roles (Senior Software
Engineer, GenAI Systems; Staff Software Engineer, GenAI Systems; Software
Engineer, BizTech (Python, Java, GenAI); Staff Machine Learning Engineer, AI
Enablement) — several explicitly scoped to Airbnb's Community Support
Platform (CSP) team, i.e. agent-orchestration work for customer support, the
closest thing Airbnb has to an FDE-flavored track. `dataford.io`'s "Airbnb
GenAI Engineer" question list describes RAG pipelines, multi-agent support
orchestration, and prompt-injection guardrails in specific, plausible detail
— but, as noted above, fails the provenance check (no dates, no "reported
by," no per-item citation), so none of it was cited as a sourced question.

### Scenario-based / operational

**Checked, genuinely thin.** No Airbnb-specific incident-response/on-call
system-design prompt with real narrative specificity was found (the way
Google's cross-site-corroborated "paged at 2am" prompt exists). Searches
for Airbnb-specific pricing/search-ranking/trust-and-safety candidate
narratives returned only generic prep-site topic summaries with no
per-question source (educative.io, codinginterview.com, and others) —
consistent with the same generic-topic-summary pattern found for several
other buckets this pass, not a new finding worth its own detailed log entry.

### Explicitly excluded

- **`prachub.com`'s Airbnb category page and its "Design a customer LTV prediction system" question** — checked directly this pass per the workflow's per-new-site provenance rule (prachub.com had already failed this same check in the Google pass, but each new page still gets checked rather than blanket-assumed). Same failure mode: a well-written "Quick Answer" with no per-question source, date, or candidate reference. Dropped.
- **`dataford.io`'s Airbnb Machine Learning Engineer and GenAI Engineer interview guides** — checked directly this pass, both new-to-this-tracker pages under a site (`dataford.io`) not previously checked. Detailed, plausible, well-organized question lists — but zero per-item provenance (no "reported by," no date, no candidate level) across either guide. Reads as the site's own authored prep content, same failure mode as `prachub.com`. Dropped.
- **IGotAnOffer's "Airbnb software engineer interview" guide** — checked directly this pass, full page reread. Unusually, the guide itself explicitly admits it: "It's difficult to find any publicly available system design questions from Airbnb, so as a substitute we've compiled some common questions from Google, Facebook, and Amazon." Its listed "system design" questions are therefore not Airbnb questions at all by the source's own admission — excluded entirely, and its coding-question list (also explicitly Glassdoor-sourced and LeetCode-rephrased, not exact quotes) wasn't used either.
- **InterviewMan's "Airbnb Software Engineer Interview Guide 2026" blog post** — checked directly this pass, full page reread. Contains a detailed, dramatic first-person-styled narrative (a rejection over a "belonging" culture question, then a second successful attempt) including real-shaped technical detail (binary tree path sums, interval merging over "reservation windows," a "build a booking and listing system" prompt with double-booking/pricing/search-ranking follow-ups). Excluded on authenticity grounds rather than specificity grounds: the site's entire product is an "undetectable real-time AI answers during live interviews" tool, and the post is structured as marketing copy for that product (multiple mid-narrative pitches for it), which is a materially different risk profile than a genuine personal blog like the Medium posts cited in the Uber and other passes. Nothing from it was used, even though its booking-system narrative shape overlaps with what shipped from source #15.
- **`systemdesignhandbook.com`'s Airbnb system design guide** — checked directly this pass; the page returned unrelated content (a different article's teaser, "Scalable AI System Design Patterns"), not an Airbnb guide at all. Broken/mismatched page, not a provenance failure — just not usable.
- **LeetCode's curated cross-company "Helpful list" post** — re-checked per the workflow's step 2 instruction. No Airbnb section exists in this list, the same finding as Netflix's pass (Google/Meta/Amazon/Uber/Microsoft all have sections; Netflix and now Airbnb don't).

## LinkedIn — shipped to app (2026-08-24)

The full research catalog below runs to roughly 25 items, but only **6** cleared
the same ship bar established for every prior company: real specificity
(concrete numbers, explicit constraints, a multi-part ask, or an actual
narrative), not a bare imperative. LinkedIn's own Exponent question DB is
small (10 items, not role-filtered — the same "mixed SWE/PM/EM under one
label" shape as Meta's and Uber's DBs) and contributed nothing shippable on
its own; every question that shipped this pass came from fully-reread
LeetCode Discuss and Blind threads instead.

**Shipped** (ids match `linkedin.ts`): `linkedin-top-shared-posts-time-windows`,
`linkedin-flexible-cache-eviction-policies`,
`linkedin-internal-notification-system-scale`,
`linkedin-malicious-request-interceptor`, `linkedin-metrics-gathering-system`,
`linkedin-legacy-app-quality-triage-behavioral`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
or PM/product-sense prompts with no engineering-design content to fit this
app's five question categories: the DB's remaining bare items (ranked cache
system, rate limiter, AI data product, typeahead autocomplete for person
search, the Bitly-URL-lifecycle question, the onboarding-flow PM question,
auto-complete feature, the mistagged "travel app for Meta" item, end-to-end
onboarding, job-postings-by-city); the "Get a Job at LinkedIn" blog's own
bare system-design list (service/product API, recommender system, "Design
Netflix"); "Design KV store" and "Design Job recommendation system"/"Design
Job Scheduler" (all three real, LeetCode-reported, but each stayed a
one-line topic even in a full-loop writeup, unlike the cache/notification
questions from the same and a sibling thread, which got real elaboration);
and the shortest-path-between-connections coding/graph-traversal question
(real, DSA-round content, but an algorithm problem rather than a
system-design or object-design one — doesn't fit any of this app's five
categories). If any of these later gets a real elaboration, promote it into
`linkedin.ts` then.

## LinkedIn — full research catalog (2026-08-24 research pass)

Questions only for the bulk list; the narrative items carry enough detail to
double as their own answer material. Grouped by round type, matching the
research buckets. Confidence tags follow the same High/Medium/Low definition
used for every prior company (see Google's section header). Dates below are
relative-to-fetch ("N ago" as reported on 2026-08-24), converted to an
approximate month — treat as approximate.

### General / classic system design — Exponent question DB (10 items, not role-filtered)

1. Design and implement a ranked cache system. — High — [Exponent DB](https://www.tryexponent.com/questions?company=linkedin&type=system-design), ~2024 (2 years ago); 3 answers
2. Design a rate limiter. — High — Exponent DB, ~2026-08-18 (6 days ago); 13 answers, has video answer
3. Design an AI data product. — High — Exponent DB, ~2026-01 (7 months ago); 5 answers, has video answer — checked the question's own detail page directly: this is a cross-company DB entry (4 interviews logged: Accenture ×2, Scale AI, LinkedIn), and its only reread candidate-experience text is from Scale AI/Accenture, not LinkedIn — the LinkedIn tag itself carries no LinkedIn-specific elaboration
4. Design typeahead autocomplete for person search in LinkedIn. — High — Exponent DB, ~2025-08 (a year ago) — domain-scoped (person search specifically) but still a bare imperative with no further detail found
5. What happens behind the scenes when you visit a Bitly URL in your web browser? — High — Exponent DB, ~2021 (5 years ago); 2 answers, has video answer
6. How would you improve LinkedIn's onboarding flow? — High — Exponent DB, ~2021 (5 years ago); 3 answers — PM/product-sense
7. Design an auto-complete feature. — High — Exponent DB, ~2026-03 (5 months ago); 1 answer
8. Design a travel app experience for Meta. — High — Exponent DB, ~2022 (4 years ago); 1 answer — likely a DB tagging artifact (names a different company directly in its own prompt text), same failure mode Apple's pass flagged for a Lyft-tagged item; excluded regardless of tagging
9. Design the end-to-end user onboarding for an app. — High — Exponent DB, ~2021 (5 years ago); 2 answers
10. Display job postings to users in the same city based on their previous searches. — High — Exponent DB, ~2023 (3 years ago) — also appears in the `role=ml-engineer` filter of the same DB; no ML-specific elaboration beyond the base prompt

Confirmed via direct page fetch that the `role=ml-engineer&type=system-design`
filter on this same DB returns only 2 items (#4 and #10 above, both already
counted), and the broader `role=ml-engineer` (no type filter, 31 items) is
almost entirely coding/stats/ML-fundamentals questions with no additional
system-design-flavored content — logged under the ML/AI section below rather
than treated as a separate bucket.

### "Get a Job at LinkedIn" Exponent blog — additional items (numbered continuing from 10)

From the [Exponent "Get a Job at LinkedIn" blog](https://www.tryexponent.com/blog/linkedin-interview-process),
full page reread. Unlike Uber's and Airbnb's equivalent blogs, this one
carries no "✅ Verified: created with the help of a [Company] interviewer"
badge — treated as High confidence for page content (directly fetched and
reread) but without that extra corroboration signal.

11. Design a service or product API. — High — same bare-title level as every DB item above
12. Design a recommender system. — High — same
13. Design Netflix. — High — same
14. Notable process detail, not a question: LinkedIn has added an "AI coding round" to the onsite — a HackerRank problem with the built-in AI assistant enabled, where candidates are expected to use it; the actual evaluation is the follow-up discussion (why the AI-suggested approach was chosen over its alternatives, how each change would be tested, what would differ in production). Logged as context, not shipped as a question — it's a round-format finding, not a specific prompt, the same distinction Meta's and Amazon's passes drew for their own AI-assisted-round findings.

### LeetCode Discuss / Blind narratives — the ship-worthy core of this pass (numbered continuing from 14)

15. **Top shared posts, dual time windows**: "The shared item can be shared in LinkedIn or could be shared outside the LinkedIn ecosystem. Get top shared items in the last 5 mins or top shared items in the last 24 hours." — High — [LeetCode Discuss, "Design Top shared posts in linkedin."](https://leetcode.com/discuss/post/342381/design-top-shared-posts-in-linkedin/), Jul 2019, full page reread. A second commenter independently confirmed getting the same question in a LinkedIn system-design round; a separate LeetCode "LinkedIn Senior role System Design Questions/Topics" thread lists a top-K/time-window variant as one of the two most commonly repeated LinkedIn system-design topics, and a Blind "System Design (ID3) interview tips" thread corroborates it again ("top k event in last n days"; one commenter reports being asked it 5 years prior and failing it). Shipped as `linkedin-top-shared-posts-time-windows`.
16. **Flexible in-memory cache with pluggable eviction**: "Design a flexible in-memory cache with customizable capacity and eviction policies... Capacity... Eviction Policy: Choose strategies for removing items when the cache is full, such as Least Recently Used (LRU) or Lowest Priority," extended by the interviewer from single-node LLD into a distributed multi-node HLD covering the hot-key problem in a write-heavy setup and Redis internals — reported at a **Staff Software Engineer** onsite (Round 4, System Design). — High — [LeetCode Discuss, "LinkedIn | Staff Software Engineer | Interview Experience | June 2025 | Offer"](https://leetcode.com/discuss/post/6858262/linkedin-staff-software-engineer-intervi-mg5c/), Jun 2025, full page reread, offer outcome. Shipped as `linkedin-flexible-cache-eviction-policies`.
17. **Internal notification system at very large scale**: "Design a LinkedIn internal notification system which can handle a very large scale," with cross-questions specifically about which internal microservices would be involved and how Kafka would be used for async handling — asked in the final 10-15 minutes of the same candidate's **Hiring Manager round**, same loop as #16. — High — same source as #16. Shipped as `linkedin-internal-notification-system-scale`.
18. **Malicious-request interceptor**: "Given a system like Linkedin, you have to design a system where you have to intercept malicious requests and deny them. Assume a service `isMaliciousRequest` is available," reported at a separate **Staff Software Engineer** onsite (Round 3, System Design) — a commenter asked whether an interface was specified for `isMaliciousRequest`; it wasn't, confirming the design is expected to define that contract itself. — High — [LeetCode Discuss, "Staff Software Engineer | Linkedin"](https://leetcode.com/discuss/post/7103201/staff-software-engineer-linkedin-by-anon-3ufy/), Aug 2025, full page reread. Same account's craftsmanship round also reports the legacy-application scenario (see #21). Shipped as `linkedin-malicious-request-interceptor`.
19. **Design KV store** — High — [LeetCode Discuss, "LinkedIn Senior Software Engineer Interview Experience (Systems Infra team) | Reject"](https://leetcode.com/discuss/post/7196831/linkedin-senior-software-engineer-interv-bjx3/), Sep 2025, full page reread — real HLD round ("started with purpose, storage, compute, sharding etc"), but the writeup itself stayed at topic-label depth; unshipped.
20. **Design Job Scheduler** and **Design the Job recommendation system as Linkedin** — High — same Sep 2025 thread (#19) for Job Scheduler; the job-recommendation variant independently reported in the #18 thread's Hiring Manager round too — both real, both bare; unshipped.
21. **Legacy-application quality/prioritization scenario**: "Imagine you join LinkedIn on a massive team that owns a legacy application. The application lacks adequate testing and monitoring and has slow response times. Consumers complain about this. Deployment of the application often contains bugs. What efforts would you do as a Staff SWE? Rank the following in terms of priority: bugs, no testing, no monitoring, slowness. What do you tackle first? How do you eventually turn this into microservices?" — High — reported in near-identical wording independently by **two different Staff SWE candidates** in LinkedIn's dedicated behavioral "Craftsmanship" round: the #16/#17 thread (Jun 2025) and the #18 thread (Aug 2025), both full page rereads. Shipped as `linkedin-legacy-app-quality-triage-behavioral`, categorized `scenario-operational` (engineering-judgment/prioritization framework, not an architecture question) rather than forced into `system-design`.
22. **Metrics gathering system**: "I was asked to design a Metrics gathering system," reported by a **Senior SWE, applications track** candidate who was surprised to get an infra-flavored question on that track — a top comment lays out the expected answer shape in detail (time-series DB, monitoring/alerting on top, a `timer.start`/`timer.stop` SDK, onboarding process, resource allocation/quota/archival policy/SLA, cross-team/tenant/geo health monitoring). — High — [Blind, "LinkedIn onsite interview System design review"](https://www.teamblind.com/post/linkedin-onsite-interview-system-design-review-1buxmbjm), Feb 2025, full page reread. Independently corroborated by 2 more commenters on the same thread ("It's a popular LinkedIn question," "I was also asked this recently") and by a separate LeetCode thread listing "design a metrics system for LinkedIn" as one of the two most commonly repeated LinkedIn system-design topics — strongest multi-source corroboration of this pass alongside #15. One commenter also reports being asked the identical question in a *behavioral* round with an EM, not the dedicated system-design round — logged as context, not a separate question. Shipped as `linkedin-metrics-gathering-system`.
23. **Shortest path between LinkedIn connections**: "An adjacency list is given, a source and a target. Find the connection distance between source and target. Print the path as well," solved via bi-directional BFS — reported in the same Jun 2025 Staff SWE loop (#16/#17) as a **DSA coding round** question, not the system-design round. — High — same source as #16. Real and well-specified, but a graph-traversal coding problem rather than a system-design or object-design one — doesn't fit any of this app's five question categories; unshipped, logged for completeness rather than silently dropped.

### ML / AI system design

**Checked, genuinely thin.** Exponent's LinkedIn ML Engineer role filter
(`company=linkedin&role=ml-engineer`, 31 items across `type=system-design`
and unfiltered) is almost entirely DSA/coding and ML-fundamentals questions
(edit distance, LRU cache, k-means, Bayes' theorem, bias-variance) with only
the same 2 system-design-flavored items already counted in #4 and #10 above
— no distinct ML-system-design narrative (recommendation-pipeline tradeoffs,
feature-store design, training/serving skew) turned up anywhere this pass,
despite LinkedIn's own "Get a Job at LinkedIn" blog explicitly naming the
news feed, recommendation systems, and ads ranking as ML-round topic areas
in general terms. Logged explicitly per the workflow's instruction rather
than silently omitted.

### Forward Deployed Engineer / agentic track

**Checked, no role found.** Unlike Amazon/Apple/Airbnb (confirmed real, open
FDE-or-equivalent-titled postings with no candidate-question trail) or Meta
(confirmed no such role exists), no LinkedIn posting or candidate report
referencing a Forward Deployed Engineer or clearly equivalent agentic-systems
role turned up this pass — closest in status to Netflix's and Uber's "not
actively confirmed or disproven either way" finding, logged as such rather
than defaulting to a different company's framing.

### Scenario-based / operational

The legacy-application quality/prioritization scenario (#21 above) is a real
find here, corroborated by two independent Staff SWE accounts — shipped.
Beyond that, a direct search for a LinkedIn-specific incident-response/
on-call system-design prompt (the way Google's "paged at 2am" question was
cross-site-corroborated) turned up only generic "outage/failover" prep-guide
content with no per-candidate citation — same failure mode as every prior
company's unsourced operational leads, excluded rather than shipped or
logged as a found item beyond #21.

### Explicitly excluded

- **`prachub.com`'s LinkedIn category page** — checked directly this pass per the workflow's per-new-site provenance rule (prachub.com had already failed this same check in the Google, Amazon, and Airbnb passes, but each new company's page still gets its own check rather than a blanket assumption). Same failure mode confirmed again: detailed, plausible-reading system-design prompts ("Design a CI Job Scheduler with Live Build Output," "Design a Global Calendar Service," "Design a Ranked Social Feed with Hybrid Fan-Out," etc.) with zero per-item source, date, or candidate reference — reads as the site's own authored practice content. Dropped.
- **Two thin/no-content Blind threads** — "Airbnb System design interview questions"-style bare-ask posts with no real answers surfaced (`LinkedIn-system-design-interview-Lq0Npp23`: OP never got a real answer from any commenter beyond a generic "basic LLD" one-liner; `Design-questions-for-LinkedIn-Systems-Infrastructure-org-s1wSg30b`: a 2019 thread whose top replies were jokes) — checked directly, both dead ends, nothing extractable.
- **LeetCode's curated cross-company "Helpful list" post** — re-checked per the workflow's step 2 instruction. No LinkedIn section exists in this list, the same finding as Netflix's and Airbnb's passes.

## Twitter / X — shipped to app (2026-08-24)

The full research catalog below runs to roughly 13 items, but only **1**
cleared the ship bar. This is the thinnest pass in the tracker so far, even
thinner than Uber's or Airbnb's: Twitter/X's own Exponent question DB has
only 3 items total (unfiltered — role filters don't shrink it further,
they're already the whole list), no dedicated Exponent system-design blog
or verified interviewer guide exists for this company the way one does for
every Big Tech company plus Uber and Airbnb, and the majority of Blind/
LeetCode threads either withhold the actual question ("can't share, NDA")
or give only loop-structure color ("standard leetcode, standard system
design") with no recoverable prompt text.

**Shipped** (id matches `twitter.ts`): `twitter-bad-expression-tweet-filter`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
not actually Twitter's own question, or failed the per-new-site provenance
check: both Exponent DB bare imperatives (Design Twitter., Design Twitter's
API.); the DB's "Design a Tic Tac Toe game that allows remote play." item
(real topic, but the actual answer content sits behind a login wall this
pass couldn't get past, so there's no elaboration beyond the bare title —
unlike Amazon's chess-LLD question, which shipped because its source
elaborated on board data structures and websockets-vs-SSE sync); the ping-
pong-probability DP question (real, fully reread, but a pure algorithm
question with zero system-design or LLD/OOD framing — doesn't fit any of
this app's five categories, same reasoning that excluded Airbnb's Property
Booking Optimizer and wishlist-recommendation coding questions); the
Twitter SSE round of a multi-company loop write-up (real, fully reread, but
the candidate explicitly withheld exact question text for every round
citing NDA — only vague round-type descriptions survive: an API-design
round about "a wholesale shopping market," and a design round to "design a
twitter feature, with custom requirements"); three Blind threads, all
checked directly, all generic ("standard leetcode and standard system
design," "they focus a lot on design," "domain specific coding questions
and a design question") with no recoverable prompt; two self-authored
practice posts with no company confirmation (a 2018 "let's design Twitter"
LeetCode post with no source claim at all, and a 2024 "review my notes"
post linking to the poster's own Notion doc) — same exclusion reasoning as
Airbnb's self-practice Hotel Booking App LLD post; and `datainterview.com`'s
"Twitter (X) Machine Learning Engineer" guide, excluded on stronger grounds
than a normal provenance failure — see the research-log note below.

## Twitter / X — full research catalog (2026-08-24 research pass)

### General / classic system design — Exponent question DB (3 items, not role-filtered)
1. **Design Twitter.** — Medium — [Exponent DB](https://www.tryexponent.com/questions?company=twitter&type=system-design), ~3 months ago (12 answers, has video answer) — bare imperative, no elaboration recoverable without an account.
2. **Design Twitter's API.** — Medium — [Exponent DB](https://www.tryexponent.com/questions?company=twitter&type=system-design), ~5 years ago — bare imperative.

### LLD / OOD-flavored
3. **Design a Tic Tac Toe game that allows remote play.** — Medium — [Exponent DB](https://www.tryexponent.com/questions?company=twitter&type=system-design), ~2 years ago, 1 answer — real topic (board game + multiplayer sync, the same shape as Amazon's shipped chess-LLD question) but the one answer sits behind a login wall this pass couldn't clear, so there's no elaboration beyond the bare title. Worth a retry in a future pass.
4. **Twitter | Onsite | Bad expressions search** — High — [LeetCode Discuss](https://leetcode.com/discuss/interview-question/1841258/twitter-onsite-bad-expressions-search), Mar 2022, full page reread including a substantive comment thread (Trie vs. Aho-Corasick vs. n-gram/inverted-index approaches debated). Shipped as `twitter-bad-expression-tweet-filter`.

### LeetCode Discuss / Blind narratives — remainder of this pass (numbered continuing from 4)
5. **Ping-pong match-win-probability question** — High — [LeetCode Discuss, "Twitter | Phone Interview | Backend"](https://leetcode.com/discuss/post/1893172/twitter-phone-interview-backend-by-anony-t6pe/), Mar 2022, full page reread. Real, dated, phone-screen-reported, with a DP solution discussed in the comments — but a pure probability/DP algorithm question with no system-design, LLD, or domain framing at all. Doesn't fit any of this app's five `QuestionCategory` values; left in the tracker rather than force-fit.
6. **Multi-company loop write-up, Twitter SSE round** — High (full page reread) — [LeetCode Discuss, "Google L5 | Twitter SSE | LinkedIn SSE | FB E5 | Uber SSE | MS SSE"](https://leetcode.com/discuss/post/1539396/google-l5-twitter-sse-linkedin-sse-fb-e5-fvjy/), Oct 2021. The candidate explicitly declines to share exact question text ("I will not share exact questions for any rounds obviously because of NDA, I will add high-level conceptual information only"), so nothing here clears the ship bar — but the loop structure itself is real and specific: phone screen (one hard "variation of minimum substring" question) → 4 onsite rounds (managerial; a coding round "very similar to one of the famous Twitter tagged questions," unspecified which; an API-design round on "a wholesale shopping market" emphasizing interface/class design, edge cases, and testability; a system-design round to "design a twitter feature, with custom requirements" emphasizing requirement-gathering and database-choice justification). Candidate received and accepted the Twitter offer over Google's (downleveled to L4) and LinkedIn's.
7. **Twitter | Intern | SF | May 2018** — High (full page reread) — [LeetCode Discuss](https://leetcode.com/discuss/post/129506/twitter-intern-sf-may-2018-by-equate_rs-n2kh/), May 2018. Full loop structure reported (online test, 30-min phone screen, 45-min Skype technical round, managerial round) but the one coding question is explicitly unrecalled ("Can't recall the exact problem statement... It started from a very easy problem, then he increased complexity at each stage"). No shippable prompt.
8. **"What kind of technical questions does Twitter ask?"** — High (full page reread) — [Blind](https://www.teamblind.com/post/What-kind-of-technical-questions-does-Twitter-ask-GKLWa3TW), Jul 2020. One-line answer: "Standard leetcode and standard system design for senior. Also standard faang leadership principles." No recoverable prompt.
9. **"Twitter staff engineer interview"** — High (full page reread) — [Blind](https://www.teamblind.com/post/twitter-staff-engineer-interview-rasgvrvr), Apr 2022. "Depends on org, I honestly feel like they are easier than senior ones, at least for me as they focus a lot on design" — real but no recoverable prompt.
10. **"Interview Process - Twitter Backend Engineer"** — High (full page reread) — [Blind](https://www.teamblind.com/post/Interview-Process---Twitter-Backend-Engineer-bc06jLCg), Dec 2020. "On-site: 'Top grading' interviews... Mine had pretty domain specific coding questions and a design question" — real but no recoverable prompt beyond "domain specific."
11. **"Design twitter" self-practice post** — High (full page reread), excluded — [LeetCode Discuss](https://leetcode.com/discuss/post/124689/design-twitter-by-shanelee-z7gj/), Mar 2018. Reads as a self-posed practice prompt ("Let's design a Twitter like social networking service...") with no claim of being asked at any company, real or otherwise — same exclusion reasoning as Airbnb's self-practice Hotel Booking App LLD post.
12. **"Review my Twitter System Design notes" self-study post** — High (full page reread), excluded — [LeetCode Discuss](https://leetcode.com/discuss/post/5062765/review-my-twitter-system-design-notes-by-0e30/), Apr 2024. A candidate's own prep notes (linked out to a personal Notion doc) posted for community review, not a reported interview question.
13. **InMobi SDE-2 candidate asked to draw Twitter's HLD** — real question, but asked *by InMobi*, not Twitter — belongs (if researched) to a future InMobi pass, not this one. Not logged as a Twitter-tagged item; noted here only so it isn't rediscovered and miscategorized later.

### ML / GenAI system design
**Checked, genuinely thin, plus one notable exclusion.** Every search surfaced only topic-level generic guidance (newsfeed/timeline ranking, a recommendation engine blending collaborative and content-based filtering, Trust & Safety bot-detection and Community Notes scoring) with no candidate-reported question text behind any of it — consistent with Uber's and Airbnb's "genuinely thin" ML verdicts. One new-to-this-tracker aggregator, [`datainterview.com`'s "Twitter (X) Machine Learning Engineer" guide](https://www.datainterview.com/blog/twitter-x-machine-learning-engineer-interview), was checked directly and failed the per-new-site provenance rule in a more specific way than a normal citation-free aggregator: its own "sample interview questions" on the Twitter/X page are individually tagged `Airbnb`, `Amazon`, and `Meta` — i.e. the page's example-question content isn't even about this company, strongly suggesting a templated question bank reused verbatim across every company-branded guide on the site. Excluded entirely, logged as its own distinct failure mode (not just "no citation," but "content visibly mismatched to the company the page claims to be about").

### Forward Deployed Engineer / agentic track
**Checked, status unconfirmed either way** — same status as Netflix's and Uber's passes. No FDE-titled posting or agentic-AI-specific role was found (or disproven) for Twitter/X specifically; searches surfaced only generic FDE-role market commentary with no Twitter/X anchor.

### Scenario-based / operational
**Checked, genuinely thin.** No candidate-reported on-call/incident-response system-design prompt turned up. Searches mostly surfaced coverage of X's *real* production outages (Mar 2023 empty-timeline incident, sporadic 2024 disruptions) and generic post-acquisition engineering-culture commentary — real background, but not interview content, so not logged as a catalog item.

### Explicitly excluded
- **A LeetCode Discuss post titled "Twitter Ban Service (X) — How Account Suspension Works"**, surfaced by a targeted search this pass — turned out to be unrelated marketing/spam content (a paid "get an account banned" service, complete with Telegram/WhatsApp contact info) posted to LeetCode's discussion board, not interview content of any kind. Noted here only so a future pass doesn't re-fetch the same URL expecting a real thread; nothing from it was used or acted on.
- **`datainterview.com`'s Twitter (X) MLE guide** — see the ML/GenAI section above for the specific cross-company-tagged-content finding that got it excluded.

## Stripe — shipped to app (2026-08-24)

The full research catalog below runs to roughly 18 items, but only **4** cleared
the ship bar: real specificity (concrete numbers, explicit constraints, a
multi-part ask, or an actual narrative), not a bare imperative. This pass ran
with **no browser session available** (the `claude-in-chrome` extension
reported disconnected for the whole pass) — `WebFetch` alone 403s on
LeetCode/Blind exactly as established in every prior pass, and there was no
way to click through a cookie-consent gate or load client-rendered content
the way the browser tool normally does. The workaround: routing `WebFetch`
through `r.jina.ai`'s reader-mode proxy (`https://r.jina.ai/<url>`), which
successfully rendered and returned full text for Medium articles and Hello
Interview's client-rendered question pages that a direct `WebFetch` couldn't
reach — but Blind stayed fully blocked even through the proxy (every attempt
returned Blind's own "Oops! Something went wrong" error page instead of
content), so Blind contributed nothing to this pass at all, a first for this
tracker. See the research-log entry below for the full breakdown of what
worked and what didn't.

**Shipped** (ids match `stripe.ts`): `stripe-webhook-delivery-noisy-neighbor-ssrf`,
`stripe-payments-api-idempotent-charge`, `stripe-internal-ledger-double-entry`,
`stripe-ai-customer-support-agent`.

**Left in this tracker only** — real, sourced, but too thin to stand alone,
self-practice content with no company confirmation, or failed the per-new-site
provenance check: the DB's other 8 bare items (Design a Distributed LRU
Cache, Design TurboTax, Design a rate limiter, Design an application
performance monitoring system, What is an API and how does it work?, Design
DocuSign, Design a metrics service, Design a login system for all of
Stripe's client-facing sites, Design Twilio); the "Get a Job at Stripe"
blog's bare-title system-design list (superseded by the richer sourced
versions that shipped, except "redesign an internal authorization system
across services... given a fixed number of services and a target
requests-per-second" — real specificity in kind, but the actual numbers
stay templated/unfilled in the source rather than given, so it stays a
tracker-only lead); the self-posed "Design Stripe subscriptions" LeetCode
practice prompt (real, detailed requirements, but explicitly a
"general-discussion" self-practice post modeling Stripe's own public docs,
not a reported interview question — same exclusion logic as Uber's and
Airbnb's earlier self-practice-post finds); Hello Interview's "Rule-Based
Fraud Transaction Detection" (real, Stripe-exclusive, three dated reports,
but it's a HackerRank coding/rules-engine exercise that doesn't cleanly fit
any of this app's five question categories, the same reasoning that excluded
Airbnb's "URL Query String Parser"); `prachub.com`'s Stripe category page
(failed the per-new-site provenance check the same way every prior
`prachub.com` check has); and `educative.io`'s Stripe system-design guide
(checked directly this pass — confirmed generic, zero per-question
citations, same failure mode).

## Stripe — full research catalog (2026-08-24 research pass)

Questions only for the bulk list; the narrative items carry enough detail to
double as their own answer material. Grouped by round type, matching the
research buckets. Confidence tags follow the same High/Medium/Low definition
used for every prior company (see Google's section header). Dates below are
relative-to-fetch ("N ago" as reported on 2026-08-24) or exact dates shown on
the source page, converted to an approximate month where relative — treat as
approximate.

### General / classic system design — Exponent question DB (10 items, not role-filtered)

Stripe's own general system-design question DB (`company=stripe&type=system-design`)
is 10 items total — comparable in size to Uber's (10) and larger than
Airbnb's (2) or Netflix's (5).

1. Design a Distributed LRU Cache — High — [Exponent DB](https://www.tryexponent.com/questions?company=stripe&type=system-design), ~2026-05 (3 months ago), 10 answers
2. Design TurboTax — High — Exponent DB, ~2026-08 (7 days ago) — product-design-flavored, not architecture
3. Design a rate limiter — High — Exponent DB, ~2026-07 (46 days ago), 13 answers
4. Design an application performance monitoring system — High — Exponent DB, ~2024 (2 years ago), 1 answer
5. What is an API and how does it work? — High — Exponent DB, ~2026-03 (5 months ago), 5 answers — concept question, not a design prompt
6. Design DocuSign — High — Exponent DB, ~2026-08 (7 days ago)
7. Design a bookkeeping service — High — Exponent DB, ~2025 (1 year ago) — bare version of the theme the richer, ship-worthy ledger question (#16 below) covers
8. Design a metrics service — High — Exponent DB, ~2022 (4 years ago), 2 answers
9. Design a login system for all of Stripe's client facing sites — High — Exponent DB, ~2026-06 (2 months ago)
10. Design Twilio — High — Exponent DB, ~2026-08 (7 days ago)

### "Get a Job at Stripe" Exponent blog — additional items (numbered continuing from 10)

From the [Exponent "Get a Job at Stripe" blog](https://www.tryexponent.com/blog/stripe-interview-process),
marked "✅ Verified: created with input from recent Stripe candidates and
interviewers." High confidence, full page fetched (direct `WebFetch`, not
proxied — this domain isn't one of the ones that blocks it).

11. Design a ledger service. — same theme as #16 below, shipped in richer form
12. Design a metrics service. — same as #8
13. Design an API rate limiter. — same as #3

### Exponent's dedicated Stripe system-design blog — additional items (numbered continuing from 13)

From [tryexponent.com/blog/stripe-system-design-interview](https://www.tryexponent.com/blog/stripe-system-design-interview)
(2026 guide). High confidence, full page fetched directly, including a
follow-up fetch that pulled verbatim quotes rather than a paraphrase.

14. **Redesign an internal authorization system across services.** — High — verbatim: "Given a fixed number of services and a target requests-per-second, design an authorization scheme that rolls out fleet-wide." Real specificity in kind (explicit RPS target, fleet-wide rollout, and a named distinguishing signal — the strongest candidates split the slow policy-management path from the fast, hot enforcement path) but the actual numbers stay templated/unfilled rather than given a concrete value — left in the tracker rather than shipped.
15. Design the APIs to store transactions and a transaction log. — High — a narrower, API-first cut of the same ledger domain #16 covers, common in product-team loops per the source; not independently elaborated enough to ship as its own question.

### Hello Interview — community question database (numbered continuing from 15)

New source this pass (first used in the Airbnb pass). Each question page
shows a dated, leveled "Question Timeline" of individual per-report entries
rather than a single bare title — closer to a real per-report log than
Exponent's DB. Company-tag exclusivity (only Stripe vs. shared with many
other companies) was used as the main signal for how Stripe-specific a
question actually is, same judgment call as the Airbnb pass. All three pages
below were retrieved via the `r.jina.ai` reader-proxy workaround (direct
`WebFetch` returned only the page shell with no question content, since this
site renders client-side).

16. **Design an internal ledger system** — exclusively tagged to Stripe, three separate dated reports: Staff (early Aug 2026), Senior (early Aug 2026), Senior (late Jul 2026). Full functional scope: account creation with sub-accounts and multi-currency support, idempotent atomic double-entry transactions, current and point-in-time balance queries, transaction history for reconciliation. — High — [Hello Interview](https://www.hellointerview.com/community/questions/internal-ledger-system/cm8lxn4te00033x68eynjv94p), full page retrieved via proxy. Shipped as `stripe-internal-ledger-double-entry`.
17. **Design an AI-powered customer support agent** — tagged to Stripe (only one dated report so far: Senior, early Jun 2026 — thinner corroboration than #16, but the prompt itself carries real scope: four explicit capabilities — understand issues, retrieve context, resolve common requests, escalate complex cases — plus four explicit tensions to balance: accuracy, safety, latency, customer trust). — High — [Hello Interview](https://www.hellointerview.com/community/questions/ai-customer-support-agent/cmpy9mxg001qo09adnj64hc8i), full page retrieved via proxy. Shipped as `stripe-ai-customer-support-agent` under the `fde-agentic` category — the only ship-worthy find in that bucket this pass.
18. Rule-Based Fraud Transaction Detection — High — [Hello Interview](https://www.hellointerview.com/community/questions/rule-based-fraud-detection/cmrmeg60g1ket08adn37p58uy), full page retrieved via proxy; real, Stripe-exclusive, three dated reports (early Aug/late Jul/mid Jul 2026), a genuine multi-module HackerRank exercise (sequential rule evaluation over transaction dicts, default-accept, short-circuit on accept, escalating AND/OR-condition complexity across modules) — but it's a coding/rules-engine exercise, not a fit for any of this app's five question categories (`system-design`/`ml-ai-system-design`/`lld-ood`/`fde-agentic`/`scenario-operational`), the same reasoning that kept Airbnb's "URL Query String Parser" out. Left in the tracker only.

### Medium — first-person narrative accounts (numbered continuing from 18, the ship-worthy core of this pass)

19. **Webhook delivery system, with four escalating follow-ups**: full narrative — 10K events/sec constraint, the candidate's initial Kafka→consumer→Postgres→Redis/Celery→worker-pool architecture, and 45 minutes of the interviewer pressure-testing it across an unresponsive-merchant retry question (answered correctly), a noisy-neighbor/shared-worker-pool question (candidate initially answered with only a fixed timeout, missed circuit-breaker isolation), an SSRF/DNS-rebinding security question (candidate initially answered with resolve-then-validate, missed the pin-to-validated-IP fix), and an exactly-once-delivery question (answered correctly and completely). Candidate was rejected 3 days later with explicit feedback: "your initial architecture was sound, but your ability to reason about failure domains and system abuse was not at the level we needed." — High — [Medium, "Every Question I was asked in Stripe's System Design Interview" by Emily](https://medium.com/@emilyhustlenyc/every-question-i-was-asked-in-stripes-system-design-interview-f6f19c2e62d6), 2026, full article retrieved via the `r.jina.ai` proxy after a direct `WebFetch` 403'd — same author who wrote the first-person Uber surge-pricing Medium post shipped in the Uber pass. Shipped as `stripe-webhook-delivery-noisy-neighbor-ssrf`.
20. **Payments API — charging a card exactly once, with a Senior-vs-Staff-distinguishing follow-up**: "Design the core of our payments API. A merchant wants to charge a card. Walk me through it," with explicit constraints — a few thousand RPS, sub-500-800ms authorization SLA, authorization-only scope — and a specific race-condition follow-up (a retry lands on a different instance while the first attempt hasn't yet written its idempotency record; or the DB write fails after the card network already authorized). The author frames the whole piece around what separates a Senior-level answer (Redis idempotency-key cache, standard scaling patterns) from a Staff-level one (durable state machine with a transactional upsert on the idempotency key, double-entry bookkeeping, an outbox pattern for webhook reliability, background reconciliation for the specific network-authorized/DB-write-failed race) — explicitly framed as the author's own account of failing this exact round once, then retaking it roughly six months later and passing. — High — [Medium, "The Stripe System Design Question That Separates Senior From Staff Engineers"](https://medium.com/h7w/the-stripe-system-design-question-that-separates-senior-from-staff-engineers-ecb9a98af1fd), 2026, full article retrieved via the `r.jina.ai` proxy after a direct `WebFetch` 403'd. Shipped as `stripe-payments-api-idempotent-charge`.

### ML / AI system design

**Checked, genuinely thin beyond what already shipped.** Broader searches
(InterviewQuery's, Dataford's, Prepfully's, CleverPrep's, and Interview
Node's Stripe MLE guides) describe Stripe's ML loop only in generic
topic/framing terms — fraud detection and risk modeling as the dominant
theme, an explicit emphasis on "knowing when *not* to use deep learning" and
tying ML decisions to business outcomes rather than research novelty — with
no actual reported question text behind any of it beyond Hello Interview's
"Rule-Based Fraud Transaction Detection" (#18 above, real and Stripe-tagged
but excluded on category-fit grounds, not on sourcing grounds). Nothing
further to ship; logged explicitly per the workflow's instruction rather
than silently omitted.

### Forward Deployed Engineer / agentic track

**Confirmed real, currently open, and explicitly named "Forward Deployed"** —
a first for this tracker; every prior company's FDE-adjacent finding (Amazon,
Apple, Airbnb) was a same-shape-but-differently-titled GenAI/AI-Systems
role, never the literal words "Forward Deployed." Stripe's own careers
posting for a **"Forward Deployed AI Accelerator"** role (confirmed via
direct coverage: [Yahoo Finance](https://finance.yahoo.com/sectors/technology/articles/stripe-just-created-role-ai-112000089.html))
embeds an AI-workflow specialist inside Stripe's 20-person marketing team,
paying up to $198K, explicitly scoped around "designing, building and
overseeing autonomous, multi-agent workflows" rather than "just prompt
writing," measured by the number of workflows permanently transformed and
team-wide default-to-AI adoption. As with every prior company's version of
this finding, zero candidate-reported interview questions for the role
turned up — logged as its own status (real, open, explicitly FDE-titled,
no question trail) rather than reused wording from a different company's
finding. The Hello Interview "AI Customer Support Agent" question (#17
above) is a plausible adjacent data point — Stripe clearly has real
agentic-AI-flavored engineering surface area beyond this one marketing-team
role — but the two aren't confirmed to be the same team or hiring track, so
they're logged as separate findings rather than merged into one.

### Scenario-based / operational

**Checked, genuinely thin from sources that actually passed the provenance
bar.** `educative.io`'s Stripe guide describes three named failure-mode
scenarios (a checkout timeout while awaiting bank authorization, a regional
network partition needing GDPR-aware consistency handling, and a
fraud-model-degradation fallback) in real, plausible detail — but the same
direct check that excluded it from the general bucket (zero per-question
citations, generic "competitive interview preparation resources" framing)
applies here too, and neither of this pass's two genuine first-person Medium
accounts mentions any of these three scenarios, so none of it was used or
even logged as a found operational item beyond this note.

### Explicitly excluded

- **The self-posed "Design Stripe subscriptions" LeetCode thread** — checked directly this pass (title, exact original-post text, and framing all confirmed via the `r.jina.ai` proxy). Genuinely rich, concrete requirements (10M DAU, uniform 30-day billing cycles, partial billing on mid-cycle cancellation, payment-failure/card-expiry emails, free trials, promo codes, state-based US sales tax) — but the post itself links to Stripe's own public subscriptions documentation and reads as the poster's own "design something like X" practice exercise posted to LeetCode's `general-discussion` board, not a report of an actual asked interview question; a comment on the thread ("There's no way you're going to design for all of those requirements in 1 hour") reads as a peer critiquing the prompt's scope, not corroborating it as real. Same exclusion logic as Uber's self-practice "Uber System Design" diagram post and Airbnb's self-practice "Hotel Booking App" LLD writeup.
- **`prachub.com`'s Stripe category page** — checked directly this pass per the workflow's per-new-site provenance rule (re-checked per-site even though `prachub.com` has already failed this exact check in three prior passes). Same failure mode again: a blanket "actual Stripe interview questions" claim with testimonial-only backing and zero per-item source citation.
- **`educative.io`'s "Stripe System Design interview questions" guide** — checked directly this pass, full page fetched. One single explicit prompt ("Design Stripe's card payment authorization flow") plus three named failure-mode scenarios, but confirmed zero citations to real candidates or dates anywhere in the document — generic prep content, same failure mode as `prachub.com`/`dataford.io` in prior passes.
- **Every Blind thread found this pass** — a first for this tracker. With no browser session available, every attempted Blind URL (via both direct `WebFetch` and the `r.jina.ai` proxy) returned only Blind's own generic "Oops! Something went wrong" error page instead of content, including threads that WebSearch snippets suggested had real detail (e.g. a "URL shortener with a security twist" thread, an "L3 role, HM interview" thread). None of that snippet-level content was used as a citable source per this tracker's own confidence rules (a search-index snippet alone is Medium at best, and in this case the underlying page couldn't even be confirmed to exist in the form the snippet implied) — logged here so a future pass with real browser access knows to revisit Blind for Stripe specifically, since it was a complete blank this time only because of the tooling gap, not because Stripe has no real Blind presence.
- **LeetCode's curated cross-company "Helpful list" post** — re-checked per the workflow's step 2 instruction (via the `r.jina.ai` proxy, direct `WebFetch` still 403s on LeetCode). No Stripe section exists in this list — Google/Meta/Amazon/Uber/Microsoft have sections, Netflix/Airbnb/Stripe don't.

## PayPal — shipped to app (2026-08-24)

PayPal's public trail is far thinner than Big Tech's — Exponent's own company-filtered
question DB has only **3** items total (no role-filter variant returns anything beyond
that), and most LeetCode Discuss / Glassdoor / Blind reports either don't recall the
exact system-design prompt or report it as a bare one-line topic. Of the **15**
general-bucket items logged below (plus a separate fraud-detection ML topic, tracked
but excluded for lacking any real source), **5** cleared the same ship bar Google's and
Meta's passes established — a bare "Design a payment gateway." reads as a topic label,
not something a candidate could sit down and answer.

**Shipped** (ids match `paypal.ts`): `paypal-irctc-ticket-booking`,
`paypal-payment-service-send-money`, `paypal-parking-lot-multi-floor-t24`,
`paypal-parking-garage-ai-monitor`, `paypal-notification-system-idempotency`.

**Left in this tracker only** — real, sourced, but too thin to stand alone: the 3 bare
Exponent-DB items (#1–3), the bare "payment gateway (HLD)" and "Movie Reservation
System" reports (#6, #8), the airplane-booking-like-Expedia report (#9 — real anecdote
about a recruiter/interviewer LLD-vs-HLD mismatch, but the design ask itself is a bare
title), the Railway Ticket Booking System / chat app / vending machine Glassdoor
mentions (#12–14), and the unelaborated Data Engineer topic hint (#15). The fraud
detection ML item (#16) is excluded outright, not just left thin — see that section for
why. If any later gets a real elaboration (a specific candidate account, not just a
topic-database title), promote it into `paypal.ts` then.

**Tooling note for this pass**: the `claude-in-chrome` browser extension was not
connected this session (`tabs_context_mcp` returned "Browser extension is not
connected" on every attempt), so this pass is `WebSearch`/`WebFetch`-only — no LeetCode
Discuss or Glassdoor page could be fully rereread the way Google's pass #2 managed to.
Every LeetCode/Glassdoor/Blind item below is therefore capped at **Medium** confidence
(search-snippet sourced), even where a full reread might well upgrade it later. Retry
with the browser in a future pass if higher confidence is wanted.

## PayPal — full research catalog (2026-08-24 research pass)

Grouped by round type, matching the research buckets. Confidence tags follow the same
High/Medium/Low definition used for Google (see that section's header) — note the
tooling caveat above: every "High" here is an Exponent-DB or roundz.substack.com fetch
that actually loaded via `WebFetch`, never a LeetCode/Glassdoor page (those all 403'd
and are capped at Medium via search snippet).

### General / classic system design

1. **Design an LCU cache.** — High — [Exponent DB](https://www.tryexponent.com/questions?company=paypal&type=system-design), ~2025-08 (a year ago) — bare imperative; also appears verbatim for Meta and WhatsApp in Exponent's DB, likely the same mis-transcription of "LRU cache" noted in the Meta catalog (#74).
2. **Design a price alert tracking UI** — High — [Exponent DB](https://www.tryexponent.com/questions?company=paypal&type=system-design), ~2025-08 (a year ago) — bare imperative.
3. **Design a system that recommends the next Confluence pages a user should view.** — High — [Exponent DB](https://www.tryexponent.com/questions?company=paypal&type=system-design), ~2025-08 (a year ago), 1 answer — bare imperative; also a labeling oddity worth flagging rather than silently shipping — Confluence is an Atlassian product, not PayPal's, so this may be a DB mis-tag rather than a real PayPal-asked question. Left in the tracker only, unshipped either way.
4. **Design a ticket-booking system like IRCTC** — an SDE2 candidate's system-design round: prevent double-booking of seats under concurrent demand, optimize search queries for seat availability; concurrency, caching, and indexing were discussed in depth — Medium — [LeetCode Discuss, "PayPal SDE2 Interview Experience"](https://leetcode.com/discuss/interview-experience/6986184/), reached via search snippet (403 on direct fetch, no browser this pass). Shipped as `paypal-irctc-ticket-booking`.
5. **Design a Payment Service to handle sending money** — a Tier-3-college SDE2 candidate (2.5 YOE), Chennai: covered functional + non-functional requirements, high-level design, API design, database schema, and a flowchart; the same round separately asked the candidate to design an Elevator System — Medium — [LeetCode Discuss, "Paypal | Software Engineer | SDE2 | Chennai"](https://leetcode.com/discuss/interview-experience/6068980/Paypal-or-Software-Engineer-or-SDE2-or-Chennai/), search snippet only. Shipped as `paypal-payment-service-send-money` (the elevator-system aside is folded into `context`, not shipped as its own entry — no elaboration beyond the bare title was recoverable).
6. **Design a payment gateway (high-level design)** — SE3, Bengaluru; described as "a smooth and quite friendly discussion" with no further specifics recalled — Medium — [LeetCode Discuss, "PayPal | SE 3 | Experience | Bengaluru"](https://leetcode.com/discuss/interview-experience/6152678/PayPal-or-SE-3-or-Experience), search snippet only. Bare, not shipped.
7. **Design a parking lot system** — multi-floor support, online booking of parking slots, handling of multiple vehicle types, scalable architecture, database design and choice of database — SE3/T24, Bangalore, Round 4 (~60 min, rated Hard); interviewer emphasized "end-to-end thinking — from how the user interacts with the system to how the data flows and gets stored" — High — [roundz.substack.com, "Interview Experience - PayPal | Software Engineer 3 | SE 3 | T24"](https://roundz.substack.com/p/interview-experience-paypal-software-engineer-se3-t24), full page fetched successfully via `WebFetch` (Substack isn't behind the same bot-block as LeetCode/Glassdoor). Shipped as `paypal-parking-lot-multi-floor-t24`.
8. **Design a Movie Reservation System** — requirement gathering, database schema design, API design — SDE2/L2, Hyderabad, Round 4 (rated Hard); same round also covered Spring Boot concurrency/locks, Java Streams, and SQL `SELECT FOR UPDATE` — High — [roundz.substack.com, "Interview Experience - 158 - PayPal | SDE2 | L2"](https://roundz.substack.com/p/interview-experience-158-paypal-sde2-l2), full page fetched via `WebFetch`. The three named deliverables ("requirement gathering," "database schema," "APIs") are the generic checklist for *any* LLD round rather than a requirement specific to this problem — read as a title plus process-step boilerplate, not shipped.
9. **Design an airplane booking system like Expedia** — Entry/Mid-Level Full-Stack SWE candidate; the recruiter had told the candidate this round would be low-level design, but the interviewer actually asked for full high-level system design — Medium — [LeetCode Discuss, "PayPal || Entry/Mid-Level || Interview Experience (Full-Stack Software Engineer)"](https://leetcode.com/discuss/interview-question/6350517/PayPal-oror-EntryMid-Level-oror-Interview-Experience-(Full-Stack-Software-Engineer)/), search snippet only. The LLD/HLD-mismatch anecdote is real color, but it describes the *round*, not the design's own requirements — the design ask itself is still a bare "like Expedia" title, so not shipped.
10. **Design a system for a parking garage with an AI monitor that can recognize when a car gets in** — Software Engineer I, San Jose, reported ~Mar 2024 — Medium — [Glassdoor, "PayPal Software Engineer I Interview Questions"](https://www.glassdoor.com/Interview/PayPal-Software-Engineer-I-Interview-Questions-EI_IE9848.0,6_KO7,26.htm), reached via search snippet (403 on direct fetch, no browser this pass). Shipped as `paypal-parking-garage-ai-monitor`.
11. **Design a notification system** — started as "design a social media site" and evolved into a notification-system design covering idempotency, scalability, caching, load balancers, regional load balancers, replication, and message queues — Medium — cross-thread consensus surfaced from Glassdoor's PayPal Software Engineer interview-question pages, reached via search-index summary (no single page pinned down and directly confirmed — 403 on Glassdoor without a browser this pass). Shipped as `paypal-notification-system-idempotency`, noting the Medium/search-snippet provenance explicitly in its `source.note`.
12. **Design a Railway Ticket Booking System** — Software Engineer III — Medium — [Glassdoor, "PayPal Software Engineer III Interview Questions"](https://www.glassdoor.com/Interview/PayPal-Software-Engineer-III-Interview-Questions-EI_IE9848.0,6_KO7,28.htm), search snippet only, no elaboration beyond the title. Likely overlaps with the IRCTC-style item (#4) rather than being a fully independent report. Bare, not shipped.
13. **Design a chat-based application** — Low — surfaced only as part of a synthesized cross-page Glassdoor summary; no single page independently pinned down and confirmed this pass. Not shipped.
14. **System design on a vending machine** — Low — same synthesized cross-page Glassdoor summary as #13, same caveat. Not shipped.
15. **PayPal Data Engineer system design: "parking lot or payment system kinda questions"** — Low — [Blind](https://www.teamblind.com/post/paypal-system-design-interview-for-data-engineers-p2muw4pp); the original poster asked the commenter to "please elaborate" and got no reply — a topic-label hint, not a real question. Not shipped.

### LLD / OOD-flavored
No round in this pass was independently labeled (by the candidate report) as a
separate LLD/OOD track the way Google's pharmacy-shop question was — the parking lot
(#7), elevator system (folded into #5), and payment-service (#5) items above were all
reported as part of a generic "System Design" round instead. No separate bucket entry
this pass.

### ML / GenAI system design
16. **Real-time / traditional fraud-detection system design** — Low, **excluded**. Checked
    [prachub.com's "Design a traditional fraud detection system | PayPal Interview
    Question"](https://prachub.com/interview-questions/design-a-traditional-fraud-detection-system)
    directly this pass per the tracker's per-new-site provenance rule: the page cites
    **no** original source (no Glassdoor/Blind/LeetCode link, no named candidate
    report) — it's an in-house-authored prompt labeled "PayPal Interview Question"
    with a "Submit Your Answer to Earn 20XP" CTA, i.e. PracHub's own content, not a
    sourced report. The same prompt (labeling-under-delay, class imbalance,
    behavioral/graph/device/merchant features, sub-100ms scoring) resurfaces
    near-verbatim through `interviewquery.com` and `datainterview.com`
    search-summary text with no independent sourcing either — almost certainly the
    same unsourced content propagating across aggregator sites, not corroboration.
    No candidate-report-backed ML/fraud system-design question was found for PayPal
    this pass. Same exclusion reasoning as Google's prachub.com drop (see that
    section's "Explicitly excluded" note).

### Forward Deployed Engineer / agentic track
Checked, thin. PayPal's closest role is "Solutions Engineer" — Glassdoor lists 5
questions for it, but the only one surfaced by search was a generic behavioral prompt
("Tell me about an experience in which you analyzed information and evaluated results
to choose the best solution to a problem"), with no system-design or technical-
architecture component. Too generic to be worth a catalog slot, and not really
FDE-flavored (no agentic/AI-deployment framing at all) — not logged as an item.

### Scenario-based / operational
Checked, genuinely thin — this bucket has **no shippable item**, and no real
candidate-sourced item at all. Every "production incident," "on-call page," or "scale
for a peak traffic event" prompt found this pass traced back to unsourced aggregator
pages (`finalroundai.com`, `techinterview.org`, `interviewcoder.co`) confirmed via
direct check to present "PayPal-style" questions generically ("Common prompts
include...") rather than citing an actual candidate report. Noted explicitly per the
workflow's rule to flag a genuinely-empty bucket rather than silently omit it.

### Explicitly excluded
- **`systemdesignhandbook.com`'s 10-topic PayPal list**, **`designgurus.io`'s
  3-question "essential guide,"** **`finalroundai.com`'s 4-question blog post,**
  **`interviewcoder.co`'s "21 More PayPal Software Engineer Interview Questions,"**
  and **`techinterview.org`'s PayPal guide** — all checked directly this pass and
  confirmed to present "PayPal-style" or "commonly asked" questions with zero
  per-question source citation (no Glassdoor/Blind/LeetCode link or named candidate
  report behind any individual item — several explicitly hedge with phrasing like
  "PayPal-style questions" rather than claiming these were actually asked). Dropped
  per the tracker's own provenance rule, same reasoning as Google's prior
  prachub.com exclusion.
- **`prachub.com`'s "Design a traditional fraud detection system"** — see the ML/GenAI
  section above for the direct-check finding that got it excluded.

## Bloomberg — shipped to app (2026-08-24)

The full research catalog below runs to roughly 20 items — Bloomberg's public
candidate-report trail is thin (Exponent's own Bloomberg question DB, filtered to
`type=system-design`, returned **zero results** for the general, Solutions Architect,
and Data Engineer roles alike — the smallest/emptiest company DB in this tracker so
far, even thinner than Twitter's/Airbnb's near-empty ones) — but **6** cleared the ship
bar: real specificity (concrete numbers, explicit constraints, a multi-part ask, or an
actual narrative), not a bare imperative.

**Tooling caveat for this pass**: the `claude-in-chrome` browser extension was not
connected this session, so every source below came through `WebSearch` snippets or
`WebFetch` — and `WebFetch` 403'd on every `leetcode.com` and `glassdoor.com` URL
attempted (confirmed, consistent with every prior pass). That caps every LeetCode- and
Glassdoor-sourced item at **Medium** confidence (search-index snippet, not an
independently reread full page) rather than the High a browser session would have
allowed — a meaningfully different ceiling than most prior passes, which used the
browser to upgrade exactly these domains to High. Worth a follow-up pass with the
browser reconnected to try upgrading these.

**Shipped** (ids match `bloomberg.ts`): `bloomberg-multi-exchange-stock-price-topk`,
`bloomberg-stock-price-change-alert-window`, `bloomberg-stock-option-alert-new-grad-rejection`,
`bloomberg-underground-system-subway-tracker`, `bloomberg-intern-market-data-fanout`,
`bloomberg-terminal-stock-exchange-feed`.

**Left in this tracker only** — real, sourced, but too thin to stand alone: the
top-K-by-volume variant (#2, redundant with what shipped as #1), the generic
Hiring-Manager "design a system that processes and stores user information" imperative
(#8, High confidence but a bare title), the "help system for product crashes" and
"optimize Terminal query time" one-liners (#9), the recruiter-only "might be an
Order Book question" lead (#10) with no confirmed report behind it, the Valid Anagram
half of the paired onsite (#11, pure algorithm), the library-checkout LLD and O(1)
lottery-system coding-round items (#12–13, real but reported as coding-round not
design-round content), and the Buy-Side Team NYC domain-topic thread (in "Explicitly
excluded" below — a candidate's own pre-interview question about what to expect, not a
confirmed report of what was actually asked). If any of these later gets a real
elaboration, promote it into `bloomberg.ts` then.

## Bloomberg — full research catalog (2026-08-24 research pass)

Grouped by round type, matching the research buckets. Confidence tags follow the same
High/Medium/Low definition used for Google (see that section's header) — per the
tooling caveat above, every LeetCode/Glassdoor item here is capped at Medium (snippet
only, direct fetch 403'd, no browser this pass); only the two direct `WebFetch`
successes (Exponent's own pages, one Bloomberg careers/Avature page) reach High.

### General / classic system design

1. **Design a system that pulls in stock information from multiple stock exchanges** —
   given 10 exchanges tracking 100,000 stocks, service requests for a given stock's
   price at each exchange in sorted order, and separately identify the top-K stocks
   throughout the day — Medium — [LeetCode Discuss, "Bloomberg | Design a system to
   give prices of a stock"](https://leetcode.com/discuss/interview-question/system-design/431712/Bloomberg-or-Design-a-system-to-give-prices-of-a-stock/)
   and independently reported with the same "multiple exchanges + top-K stocks"
   framing in [LeetCode Discuss, "Bloomberg Onsite System
   Design"](https://leetcode.com/discuss/interview-question/1244116/Bloomberg-Onsite-System-Design)
   — both reached via search snippet, not a reread page. Shipped as
   `bloomberg-multi-exchange-stock-price-topk`.
2. **Top-K trending stocks by volume** — implement `addStocksVolume(stockSymbol,
   volume)` and `topKstocks(k)` so repeated volume updates can be queried for the
   current top-K efficiently — Medium — [LeetCode Discuss, "Bloomberg | Onsite | Top K
   Stocks"](https://leetcode.com/discuss/interview-question/900369/bloomberg-onsite-top-k-stocks/),
   with a near-identical variant (`processStock`/`getTrendingStock`) at [LeetCode
   Discuss, "Bloomberg | Onsite | Trending
   Stock"](https://leetcode.com/discuss/interview-question/627139/Bloomberg-or-Onsite-or-Trending-Stock),
   both search-snippet only. Real and API-specific, but functionally the same
   top-K-over-a-stream shape already covered by #1's shipped follow-up — left
   unshipped as the redundant, thinner sibling rather than double-shipping the same
   core idea.
3. **Stock price change/notification system** — a user subscribes to a company and is
   alerted when its price moves more than X% within a trailing Y-minute window, fed by
   a constant stream of `(stockID, price, timestamp)` ticks arriving roughly every
   millisecond — Medium — [LeetCode Discuss, "Bloomberg | Onsite | Stock Change
   Notification
   System"](https://leetcode.com/discuss/interview-question/968803/bloomberg-onsite-stock-change-notification-system/),
   search snippet; the reporter notes the interview's focus was specifically the
   algorithmic sliding-window-efficiency angle (time and space complexity of computing
   the rolling percentage change), not broad infra. Shipped as
   `bloomberg-stock-price-change-alert-window`.
4. **Stock-option transaction alert, with a real rejection outcome** — design a system
   where users create alerts on stock options and get notified when, e.g., an "AAPL"
   transaction exceeds $100 — reported by a New Grad candidate who was surprised to be
   asked a high-level-design question at all in a fresher-level interview, and was
   rejected specifically over that round — Medium — [LeetCode Discuss, "Bloomberg |
   System Design | New Grad | 2022 |
   Rejection"](https://leetcode.com/discuss/interview-question/1555003/bloomberg-system-design-new-grad-2022-rejection),
   search snippet only. Shipped as `bloomberg-stock-option-alert-new-grad-rejection` —
   distinct enough from #3 (single-symbol threshold rule vs. a continuous
   percent-over-window monitor) and carries a real, quotable expectation-mismatch/
   rejection narrative worth its own entry, the same call Uber's pass made shipping a
   Medium-surge-pricing account specifically for its rejection-feedback detail.
5. **Bloomberg Terminal stock-exchange feed** — "Build a system that takes data from a
   Stock Exchange and displays it on Bloomberg Terminal;" the reporter adds that
   Bloomberg's code questions in general "will not be from LeetCode, they will be
   complex in nature and will require you to think about the DS" — New Grad Software
   Engineer — Medium — [Glassdoor
   QTN_4107656](https://www.glassdoor.com/Interview/-system-design-Build-a-system-that-takes-data-from-a-Stock-Exchange-and-displays-it-on-Bloomberg-Terminal-Code-Questions-QTN_4107656.htm),
   search snippet, 403 on direct fetch. Shipped as `bloomberg-terminal-stock-exchange-feed`
   — real, quoted, and ties directly to Bloomberg's own flagship product rather than a
   generic "design X" reskin.
6. **Intern: fan out exchange trade data to multiple local applications** — an
   external data provider streams information about trades on a stock exchange into a
   program running on one machine, and other applications running as separate
   processes on that same machine need to be able to request data about specific
   stocks from it — Software Engineer Intern, London — Low/Medium — surfaced via
   search-snippet summary of the [LeetCode Discuss, "Bloomberg | Software Engineer
   Intern | London | 2020
   [Pending]"](https://leetcode.com/discuss/interview-question/1000668/bloomberg-london-software-engineer-intern-virtual-onsite-algo-system-design/)
   thread area — the snippet aggregates what reads like a specific reported task, but
   attribution to that exact thread (vs. a reply/related thread nearby) wasn't pinned
   down without a full page reread; flagged as the pass's single lowest-confidence
   shipped item precisely because of that attribution gap. Shipped as
   `bloomberg-intern-market-data-fanout`, with the attribution caveat carried into its
   `source.note` rather than silently upgraded to Medium.
7. **Intern: live comment feature** — implement a live-commenting feature where a
   posted comment appears to other viewers without the page being refreshed — Low —
   [Blind, "intern bloomberg system
   design"](https://www.teamblind.com/post/intern-bloomberg-system-design-hwlxkuel),
   search-snippet summary only, real topic but no elaboration beyond the one-line
   description recoverable this pass. Not shipped.
8. **"Design a system that processes and stores user information, and walk through
   its main components"** — Hiring Manager round — High — [Exponent's Bloomberg SWE
   guide](https://www.tryexponent.com/guides/bloomberg-software-engineer-interview),
   fetched directly via `WebFetch` (200, full page). Real and directly confirmed, but
   reads as a bare imperative with no attached numbers/constraints — same exclusion
   reasoning as Google's "Design a rate limiter." Not shipped.
9. **"How would you design a help system for when parts of the product crash?"** and
   **optimizing query time for Bloomberg-specific Terminal functions** — Medium —
   surfaced via search-snippet summary of [LeetCode Discuss, "Bloomberg New Grad |
   Hiring Manager / System Design Round | Gathering
   Questions"](https://leetcode.com/discuss/interview-question/737605/bloomberg-new-grad-hiring-manager-system-design-round-gathering-questions/)
   (Jul 2020). Real topic labels, no elaboration beyond one line each. Not shipped.
10. **"Might be something to do with an Order Book"** — a recruiter's own hint about
    what the system-design round could cover, not a confirmed post-interview report of
    an actual question asked — Low — surfaced via search-snippet summary of the same
    [LeetCode Discuss, "Need help preparing for Bloomberg system design
    interview"](https://leetcode.com/discuss/interview-question/6114533/Need-help-preparing-for-Bloomberg-system-design-interview/)
    thread, and echoed as generic "matching engine or order book" prep-guide advice
    with no per-candidate citation across multiple aggregator sites checked this pass.
    Real domain-plausible lead (order books/matching engines are core Bloomberg
    territory) but never confirmed as an actually-asked question — stays in the
    tracker, not shipped.

### LLD / OOD-flavored

11. **Valid Anagram + Design Underground System, same onsite** — one interviewer asked
    Valid Anagram (candidate justified a hash-map over an array to save space); the
    second asked Design Underground System (LeetCode #1396: `checkIn(id, stationName,
    t)`, `checkOut(id, stationName, t)`, `getAverageTime(startStation, endStation)`),
    solved with two hash maps, first at O(N) per average-time call then optimized to
    O(1) by avoiding repeated recomputation — Medium — [LeetCode Discuss, "Bloomberg |
    Onsite | Valid Anagram & Design Underground
    System"](https://leetcode.com/discuss/interview-question/925625/bloomberg-onsite-valid-anagram-design-underground-system),
    search snippet. Design Underground System independently recurs across at least
    three more Bloomberg-tagged threads this pass — [LeetCode Discuss, "Bloomberg |
    Phone | Design Underground
    System"](https://leetcode.com/discuss/interview-question/864316/bloomberg-phone-design-underground-system),
    the [2022 New-grad full-loop
    writeup](https://leetcode.com/discuss/interview-question/1789554/bloomberg-new-grad-interview-2022/)
    (paired there with Meeting Rooms II), and [LeetCode Discuss, "Bloomberg | Phone +
    Onsite | Interview
    Questions"](https://leetcode.com/discuss/interview-question/980729/bloomberg-phone-onsite-interview-questions)
    (paired there with Count and Say plus a bonus no-coding OOD question) — a genuinely
    repeated Bloomberg question across 4 independent reports, not a one-off. Shipped
    (Underground System only — Valid Anagram is a pure algorithm exercise, no design
    content) as `bloomberg-underground-system-subway-tracker`.
12. **Library checkout system, low-level design, with a SQL query** — reported only as
    a topic label ("LLD for library checkout with SQL query") in a coding round, no
    further elaboration — Medium — [LeetCode Discuss, "Bloomberg | Interview Experience
    | Senior Software Engineer | NYC | Nov
    2025"](https://leetcode.com/discuss/interview-experience/7363661/), search snippet.
    Not shipped — no recoverable specificity beyond the label.
13. **Insert/delete/get-random in O(1) ("lottery system")** — `addParticipant`,
    `removeParticipant`, `getRandom` all required O(1) — Medium — [LeetCode Discuss,
    "Bloomberg | Interview Experience | Senior Software Engineer - 4+ YOE | NYC | Nov
    2025"](https://leetcode.com/discuss/post/7347254/), search snippet. Real and
    API-specific, but reported explicitly as the second problem of a *coding* round
    (paired with a pure-arithmetic problem), not the system-design round — same
    "coding-round algorithm, not a design question" exclusion as Twitter's
    ping-pong-probability item. Not shipped.

### ML / GenAI system design

14. Bloomberg has real, currently open **Senior AI Engineer — Generative AI & Search**
    postings (Artificial Intelligence org, "AI Experiences" team) confirmed directly
    on Bloomberg's own careers site — multiple live requisition IDs found this pass
    (`10499`, `17468`, `18769`) — High, [Bloomberg
    careers/Avature](https://bloomberg.avature.net/careers/JobDetail/Senior-AI-Engineer-Generative-AI-and-Search-Artificial-Intelligence/10499).
    The role's own listed scope (building RAG systems, LLM-powered search agents,
    evaluation frameworks for search/GenAI quality) is real and specific — but **zero
    candidate-reported interview questions** for it turned up this pass. Logged as the
    same "role confirmed real and open, no question trail" status Amazon's, Apple's,
    and Airbnb's passes each established for their own AI/ML-adjacent roles, rather
    than defaulting to Meta's "role doesn't exist" or Google's "thin trail" framing.
    `interviewquery.com`'s dedicated "Bloomberg L.P. Machine Learning Engineer" guide
    was targeted specifically to try to fill this gap but returned HTTP 429 (rate
    limited) on every attempt this pass — worth a retry in a future pass rather than
    concluding the trail is genuinely empty.

### Forward Deployed Engineer / agentic track

Searched directly for a Bloomberg-titled Forward Deployed Engineer role or an
agentic-AI-specific posting — unlike Amazon/Apple/Airbnb (confirmed real, open
postings with no question trail) or Meta (confirmed no such role at all), no posting
or candidate report turned up either confirming or disproving the role's existence at
Bloomberg this pass. Logged as the same "unconfirmed either way" status Netflix's,
Uber's, and LinkedIn's passes used, rather than force-fitting a different company's
framing.

### Scenario-based / operational

Checked directly, genuinely thin — no candidate-reported on-call/incident-response
system-design prompt was found for Bloomberg specifically. Multiple prep-guide sites
(`interviewing.io`, `coditioning.com`, `systemdesignhandbook.com`) assert generic
"Bloomberg values discussing incident triage, blast-radius containment, and MTTR" framing
with zero per-candidate citation behind any of it — same failure mode as the
aggregator exclusions below, so none of it is logged as a catalog item.
`systemdesignhandbook.com`'s guide separately mentions the real, dated **2015
Bloomberg terminal outage** (hardware failure plus network overload) — but only as its
own illustrative teaching context, not as anything ever asked of a candidate, so it's
noted here rather than logged as an interview-question catalog entry.

### Explicitly excluded

- **`systemdesignhandbook.com`'s Bloomberg guide** — presents exactly four sample
  questions (real-time stock ticker, fault-tolerant global news alert system, a trade
  execution platform with ACID/exactly-once guarantees, distributed market-data
  ingestion) with zero per-question source, date, or candidate citation — confirmed
  directly via `WebFetch` this pass. Same failure mode as every prior company's
  `systemdesignhandbook.com`/`prachub.com`-style exclusion.
- **`engineeringenablement.substack.com`'s "Acing a global financial information
  company like Bloomberg's System Design interview"** — checked directly via
  `WebFetch`: the one example it gives ("design a system that ingests stock price
  updates and delivers them to clients in real time") is explicitly the author's own
  invented illustrative scenario, not a sourced candidate report. Excluded.
- **`refer.me`'s "Bloomberg Software Engineer case: AI Engineer Interview"** — checked
  directly via `WebFetch`: this is the platform's own paywalled, timed practice-case
  content (Product Sense type, difficulty 4/5, 8-minute case), not a report of a real
  Bloomberg interview question — same reasoning as excluding any practice-platform's
  self-generated content. Excluded.
- **`blog.bugfree.ai`'s "Bloomberg SWE Interview Experience — 4 Rounds"** — checked
  directly via `WebFetch`: explicitly framed as a third-person paraphrase "shared by a
  high-scoring Bugfree user," not a first-person candidate account, with no verbatim
  question text, dates, or interviewer detail — only round-level paraphrases ("design
  user registration/login/session management and a 'top active users' feature" for a
  Hiring Manager round; "publisher pushes news → processing/transform →
  storage/index → UI, plus search and scaling" for a Tech Lead round). Real-sounding
  and plausibly Bloomberg-flavored (the news-pipeline framing in particular matches
  Bloomberg's actual news/Terminal product), but not quotable at the ship bar's
  standard — kept in the tracker as a lead, not cited as a source, not shipped.
- **`codinginterview.com`, `interviewcoder.co`, `prachub.com`, `coditioning.com`,
  `interviewing.io`, `ophyai.com`, `techprep.app`, `prepfully.com`, `educative.io`,
  `linkjob.ai`, `algo.monster`'s Bloomberg guides** — all surfaced this pass, all
  generic prep-guide content presenting "commonly asked" or "representative" questions
  with no per-item candidate citation — same failure mode as every prior company's
  aggregator exclusions. Not individually cited above.
- **Bloomberg's Buy-Side Team NYC Senior SWE system-design thread** — [Blind,
  "Bloomberg Senior Software Engineer Buy-Side Team (NYC) – System Design Round
  Expectations"](https://www.teamblind.com/post/bloomberg-senior-software-engineer-buy-side-team-nyc-system-design-round-expectations-dwh5kdwt) —
  real and genuinely useful for framing (the poster names OMS, trade lifecycle, and
  market-data pipeline as the likely domain-specific system the round would center on,
  with heavy pushback expected on tradeoffs/consistency/latency, plus a possible LLD
  class-design/SDK-API sub-question), but it's the candidate's own pre-interview
  question about what to expect, not a confirmed report of what was actually asked —
  same "topic label, not a reported question" gap as Google's FDE items #32–33.
  Referenced above (#18 in the shipped-note's "left in tracker" list) rather than
  cited as a shipped source; worth revisiting if a follow-up post from the same
  candidate ever surfaces confirming the actual round.

## Research log

- **2026-08-22, pass 1 (`WebSearch`/`WebFetch`)** — Sources used: Exponent's company+type-filtered question DB (highest confidence — real dates), Exponent's Google system-design blog article, two Blind/teamblind threads, cross-site consensus for the ML/GenAI and FDE sections where a primary source wasn't reachable. `leetcode.com`, `glassdoor.com`, and `interviewquery.com` all returned 403/429 on direct `WebFetch` (bot-blocked) — those appeared only via search snippet, flagged Medium confidence.
- **2026-08-22, pass 2 (`claude-in-chrome` browser)** — the user asked whether a different tool would get past the 403s. It did: LeetCode Discuss and Glassdoor both load fine through an actual browser session (only the scripted `WebFetch` was being blocked). This pass:
  - Confirmed the LeetCode "Helpful list" curator post is real and pulled its 4 actual Google-tagged thread links (added #20–21 above; 2 more exist — a second YouTube-design thread and the pharmacy-shop LLD one — both now logged).
  - Fully reread the **translation service** thread (#20) — upgraded Low/Medium→High, added the real requirements text and a sense of the comment-thread depth (trie-in-DB, Elasticsearch/Lucene, seq2seq debates).
  - Fully reread the **pharmacy shop** thread (#22) — confirmed real, but it's an OOD/LLD question, not distributed systems; logged it separately with a note to route it toward `src/content/lld/` instead of forcing it into a distributed-systems bucket.
  - Checked Glassdoor's "Google Design Interview Questions" page directly — turned out to be the UX/Product **Design job family**, unrelated to system-design rounds; not a usable source, dropped from consideration (was never cited in the compiled list above, so no correction needed there).
  - Checked InterviewQuery's Google ML Engineer guide directly — it does *not* contain the multimedia-violation / autocomplete / email-autocomplete / YouTube-recs items (#28–31); its actual 30-question bank is coding/stats-heavy, not system-design. Those 4 items' real source is still untraced — they stay Low confidence, unshipped.
  - Glassdoor's Google Forward Deployed Engineer page didn't surface Google-specific reviews (got a different company's FDE reviews instead — Qventus). FDE items (#32–33) are still unconfirmed at a primary source.
  - IGotAnOffer's GenAI guide (#27, the "polite on-device LLM" question) wasn't retried this pass — worth one more browser check before shipping.
- **Net for this pass**: 5 items upgraded to High confidence with full text (#20–22 new, plus #20 translation service and #22 pharmacy shop reread in full); 4 items (#28–31) demoted from "unverified cross-site consensus" to "actively checked, source not found" — meaningfully weaker than they looked in pass 1, worth dropping unless a real source turns up; FDE section (#32–33) still the thinnest part of the batch.
- Next: either (a) do the "optimal answer" outline pass for Google's High-confidence items, (b) spend one more short browser pass chasing #27–31 and the FDE items specifically, or (c) move to the next company (Meta) and leave Google's remaining Medium/Low items open. Awaiting direction.
- **2026-08-23, Meta pass (`WebSearch` + `claude-in-chrome` browser)** — user directed moving to the next company. Went straight to browser for the known-blocked domains (LeetCode, Blind) rather than burning `WebFetch` attempts first, per the lesson from Google's pass. Sources used: Exponent's Meta question DB (96 items, paginated through all 5 pages) and its role-filtered ML-Engineer subset (20 items, all overlapping), the Exponent Meta system-design blog (rich narrative — chess API-scope-narrowing anecdote, Security EM/Stripe/STRIDE anecdote, M1 EM ML-recommendation anecdote), the Exponent Meta MLE guide (AI-assisted coding round, Instagram Ranking Model), 4 LeetCode Discuss threads reread in full (ticketmaster, web crawler, Facebook post privacy — all High confidence with real narrative — plus two lower-value compiled-list threads), 3 Blind posts (one real narrative — camelcamelcamel price tracker — two low-value: a bare "ask me" post and an E6 corroboration thread with no new detail beyond what LeetCode already gave), and IGotAnOffer's Meta Production Engineer guide (fetched via browser after `WebFetch` 403'd it directly — confirms IGotAnOffer joins LeetCode/Glassdoor/interviewquery.com on the "browser only" list from the Google pass).
  - Blind requires accepting/declining its cookie consent dialog before `get_page_text` returns anything — clicked "Reject All" (privacy-preserving default) each time it appeared; worth remembering for future Blind fetches.
  - `systemdesignhandbook.com` and other unlisted domains aren't yet browser-permitted in this session (`navigate` returned "Navigation to this domain is not allowed") — fell back to `WebFetch` for those, which worked fine for `systemdesignhandbook.com` (200, not one of the confirmed-blocked hosts) but 403'd again on `igotanoffer.com` (browser was needed there instead). Domain-blocking behavior isn't fully consistent across tools — check both if one fails.
  - Meta has no discoverable Forward Deployed Engineer role or equivalent — logged as an explicit bucket exclusion rather than silently skipped, per the workflow's own instruction. The AI-assisted coding round (debug with an LLM, CoderPad) is the closest adjacent thing but isn't an agentic-systems design question, so wasn't force-fit into that category.
  - Applied the ship bar and wrote `meta.ts` with 13 questions + full `optimalAnswer` outlines (this pass did the answer-outline work inline, unlike Google's pass which deferred it) — see the "shipped to app" note above for the full list and reasoning.
- Next: Amazon is next in the Big Tech queue. Consider doing Google's deferred `optimalAnswer` pass at some point too — Google shipped 8 questions with no answers yet, while Meta now has answers for all 13 of its shipped questions.
- **2026-08-23, Amazon pass (`WebSearch` + `claude-in-chrome` browser)** — user directed moving to the next company. Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Amazon question DB (54 items, paginated through all 3 pages), the Exponent Amazon system-design blog (five rich named anecdotes — A/B experimentation platform, delivery-locker capacity, "reverse system design", chess LLD, discount/coupon LLD — all traced to a specific interviewer or candidate role, not generic), the Exponent Amazon Solutions Architect guide (RAG Q&A system, zero-data-loss region failure, Black-Friday ecommerce surge — all under "recently asked questions" for that role), the Exponent Amazon MLE guide (fetched, but its sample-question sections carried no actual text this pass — logged as checked-but-empty rather than skipped), 5 LeetCode Discuss threads reread in full (CDN-from-scratch, food-marketplace favorites dashboard, the Jul-2025 compiled HLD/LLD list, Mars Rover update, and the Apr-2026 "GenAI Fluency" incident-scenario interview writeup), and 4 Blind posts (one satirical/joke thread excluded entirely after being read in full, two thin-but-real corroborating threads on the SDE1-gets-LLD pattern, one comment-level Uber-app-then-server-side narrative).
  - The GenAI Fluency round (a distinct, newer Amazon round format pairing a hypothetical production-incident scenario with permitted AI-tool use) is this pass's version of Meta's AI-assisted-coding round from the prior pass — a genuinely new interview-format finding, not just another question.
  - Checked whether Amazon has a Forward Deployed Engineer role at all before assuming Google's "thin trail" framing or Meta's "doesn't exist" framing applied by default — it turned out to be a third case: Amazon.jobs and FDE Pulse both confirm real, currently-open Amazon/AWS FDE-titled postings, but zero candidate-reported interview questions for them turned up. Logged as its own distinct status rather than reusing either prior company's wording.
  - A Blind thread literally titled "Amazon System Design interview questions" turned out, on full read, to be a chain of satirical/dark-humor comments about Amazon's reputation (unionization, layoffs, stock vesting) rather than real reported questions — caught this by actually reading the full thread rather than trusting the search-snippet summary, which had described it as a normal Q&A thread with real content.
  - Checked two new-to-this-tracker aggregator sites (`systemdesignhandbook.com`'s Amazon guide, `prachub.com`'s Amazon category page) per the workflow's per-new-site provenance check — both failed it the same way Google's and Meta's earlier prachub.com checks did (generic question lists, no per-item source), so both are logged as excluded rather than cited.
  - Applied the ship bar and wrote `amazon.ts` with 16 questions + full `optimalAnswer` outlines — a higher hit rate (16/71, ~23%) than Meta's pass mainly because this pass's sourcing leaned more on narrative-rich anecdotes (the Exponent blog, fully-reread LeetCode threads) and less on Exponent's bare-title DB, which dominated Meta's catalog. See the "shipped to app" note above for the full list and reasoning.
- Next: Microsoft is next in the Big Tech queue. Two deferred items worth a future pass regardless of which company comes next: Google's still-missing `optimalAnswer` outlines (8 questions), and the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list (the Token-Bucket rate limiter with a concrete concurrency follow-up, and the OTP/photo delivery-confirmation workflow) if a fuller narrative source for either surfaces later.
- **2026-08-23, Microsoft pass (`WebSearch` + `claude-in-chrome` browser)** — user directed moving to the next company. Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Microsoft question DB (25 items, both pages), the Exponent Microsoft system-design blog (rich narrative — the firmware/OTA SDE II anecdote, the file-system "let's code it out" anecdote, the Azure-domain question bucket), a very recent Exponent candidate-experience page (Dec 2025, SC2/Copilot team, corroborating the file-system anecdote with real team context), 6 LeetCode Discuss threads reread in full (Visual Studio Live Share — notable for a genuinely substantive comment thread rather than just the OP, the billions-of-customers rule-filter batch job, the top-10-products-by-sales query, the parking-lot LLD→HLD onsite, the bare "Compilation" topic-list thread, and two very recent full-loop write-ups — a Dec 2025 one and an unusually detailed Feb 2026 one that alone produced 3 shipped questions across 3 different rounds of the same loop), and 3 Blind posts (the region-A/region-B multi-region narrative, the L59/L60 ChatGPT-platform prompt, plus 2-3 thinner threads that added context but no new shippable questions).
  - This pass's single most valuable source was the Feb 2026 "SDE 2 | L61/62 | Interview Experience" LeetCode write-up — a candidate who logged all 5 rounds of a single loop in detail (DSA, LLD, HLD, hiring-manager) within the last few months. It alone produced the Spotify LLD lead (unshipped, too thin), the Snowflake-ID/multi-region URL shortener (shipped), and the Fintech idempotent-checkout question (shipped) — a reminder that one recent, detailed loop write-up can outperform a dozen bare-title DB entries.
  - Checked two new-to-this-tracker aggregator sites per the workflow's provenance-check rule: `interviewquery.com`'s Microsoft AI Engineer guide (no system-design category at all in its own topic breakdown, same failure mode as its Google ML-Engineer guide from pass 1) and `dataford.io`'s Microsoft AI Engineer guide (plausible-sounding RAG/multi-agent/LLM-serving "example questions" but zero per-item citation to an actual candidate — same failure mode as `prachub.com`). Both excluded.
  - Also checked (but didn't cite as individual questions) Hello Interview's Microsoft L63-64 Senior guide — a credible, interviewer-quoted source overall (used for loop-structure context), but its own "most commonly asked" question list is bare titles with no more detail than Exponent's DB entries.
  - Microsoft's ML/AI and FDE/agentic buckets both came back genuinely thin specific to Microsoft — logged as explicit bucket exclusions (with the aggregator-guide findings as the paper trail) per the workflow's own instruction, rather than silently omitted or padded with unsourced content.
  - Applied the ship bar and wrote `microsoft.ts` with 13 questions + full `optimalAnswer` outlines. Notably, 2 of the 13 are LLD/OOD rather than classic HLD (the coded file-system exercise, the parking-lot LLD→HLD switch) — a direct reflection of Microsoft's own hiring guidance that the round genuinely swings between the two formats depending on the team, not a categorization choice imposed by this pass.
- Next: Apple is next in the Big Tech queue (the last Big Tech company before moving to the Hyper-scale consumer group). Same two deferred items as before remain open: Google's still-missing `optimalAnswer` outlines (8 questions), and the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list.
- **2026-08-23, Apple pass (`WebSearch` + `claude-in-chrome` browser)** — user said "continue," directing straight to the next company without further prompting. Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Apple question DB (only 17 items, one page — noticeably smaller than every prior company's DB), the Exponent Apple system-design blog (rich narrative — the ICT3 view-hierarchy hit-test question, the ICT4 canvas-app question, the M1 EM storage-migration anecdote, explicit ICT3/ICT4/ICT5 leveling detail), the Exponent Apple SWE guide (iCloud Photos sync, iMessage delivery guarantees, APNs, and the on-device-vs-cloud routing question — all listed as real candidate-reported sample questions in a "Verified" guide, though without individual per-question citations the way DB entries have), the Exponent Apple MLE guide (rich process/evaluation-criteria detail, but empty sample-question sections — logged as checked-but-empty), one LeetCode Discuss full-loop write-up (Java Backend Engineer, Feb 2025 — Java/Spring Boot/multithreading rounds plus the "Women Who Code"-framed billions-scale subscription-form system-design question), and a Blind thread with a genuine Apple-employee-labeled comment (topic-level context, not elaborated questions).
  - Confirmed, by directly rereading three separate Exponent DB question pages, that a single EM candidate's one interview loop had been split by Exponent into three separate DB entries (block-storage sizing, partitioning-at-scale, zero-interruption metrics migration) — all three share byte-identical shared "interview experience" text. Combined them into one shipped question rather than three redundant thin ones, which is the same instinct that drove Microsoft's pass to prefer one rich multi-round write-up over several bare DB entries.
  - Apple's own hiring guidance across every source this pass (the blog, the SWE guide, the MLE guide, and the Blind employee comment, independently) converges hard on one point that's unusually explicit compared to the other three companies: there is no standard question at all, every team's interviewer picks their own with zero central coordination. This directly explains why Apple's overall research catalog (25 items) came out noticeably smaller than Microsoft's (47) despite comparable search effort — Apple's public candidate-report trail is thinner because the question space itself is far less concentrated around any repeatable set of prompts.
  - Verified Apple has real, currently open Forward Deployed Engineer postings (via Apple's own careers site) but zero candidate-reported interview questions for the role — same distinct "role exists, no trail" status Amazon's pass established, logged consistently rather than defaulting to Google's "thin trail" or Meta's "role doesn't exist" framing.
  - One DB item (`How would you build social features on Lyft to increase user engagement?`, tagged under Apple's company filter) named a different company (Lyft) directly in its own prompt text — flagged as a likely DB tagging artifact and excluded rather than shipped or force-fit as an Apple question.
  - Applied the ship bar and wrote `apple.ts` with 10 questions + full `optimalAnswer` outlines. Notably, unlike every prior company's pass, most of what shipped required weaving Apple's two recurring, sourced-and-confirmed differentiators — privacy/security as a first-class design constraint, and genuine on-device/mobile system design — directly into the `optimalAnswer` content itself, not just the `context` field, since those constraints are what the source material consistently says actually gets evaluated.
- Next: Apple was the last Big Tech company — the Hyper-scale consumer group (Netflix, Uber, Airbnb, LinkedIn, Twitter/X) is next. Same two deferred items as before remain open: Google's still-missing `optimalAnswer` outlines (8 questions), and the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list. One new deferred lead: the Apple MLE guide's empty sample-question sections (#21 in Apple's catalog) are worth one retry in a future pass in case it's a page-specific rendering issue rather than genuinely empty content.
- **2026-08-24, Netflix pass (`WebSearch` + `claude-in-chrome` browser)** — user said "continue," directing straight to the next company (first `Not started` entry, Netflix). Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Netflix question DB (only 5 items total — the smallest of any company's DB by a wide margin; confirmed both the `role=ml-engineer` and `role=security` filters return zero results, so the general list is effectively the whole DB), the dedicated Exponent Netflix System Design Interview blog (the richest single source this pass — two full candidate loop accounts with verbatim prompts and real follow-up numbers), the Exponent Netflix SWE guide (marked "Verified," updated most recently of any Netflix guide, independently reconfirmed three of the system-design blog's prompts verbatim from a second source), the Exponent Netflix MLE guide (the 10,000-movie-reviews ML prompt), 4 LeetCode Discuss threads reread in full (a real Netflix-tagged Reddit-clone system-design report, a real Netflix-tagged multi-region distributed-database report with a substantive comment thread, and two personal-practice/tutorial posts that turned out not to be real reported questions), and 3 Blind threads (one with a real but too-thin recruiter-paraphrased "job scheduler" infra lead, two with no extractable question content beyond process/format chatter).
  - Netflix's own hiring guidance, confirmed independently across the system-design blog, the SWE guide, and the EM guide's outline, is unusually blunt compared to every prior company: there is no shared question bank *at all* — not "thin coordination" the way Apple's pass found, but an explicit statement that each hiring team designs its own prompt around its own team's actual work, sometimes literally an unresolved internal debate (the event-logging own-vs-document question). This directly explains both the small catalog size (26 items, the smallest yet) and the unusually high ship rate (8/26, ~31%, higher than any Big Tech company) — the sources that exist skew hard toward rich narrative rather than a bare-title DB.
  - Two of Netflix's own dedicated guides (SWE and the system-design blog) independently reported the *same three prompts* nearly verbatim (frequency capping, the ads data model, and the event-logging build-vs-document question) — a rare case of two-source corroboration for narrative (not just DB-listed) questions, strengthening confidence on all three beyond what a single source alone would justify.
  - The Netflix EM guide ([tryexponent.com/guides/netflix-engineering-manager-interview](https://www.tryexponent.com/guides/netflix-engineering-manager-interview)) is paywalled beyond its round-by-round outline ("Unlock this guide" gate) — round structure was usable as context, but no sample-question text was recoverable this pass.
  - Checked whether Netflix has a Forward Deployed Engineer role at all, the way Amazon's and Apple's passes did — unlike those two (confirmed real, open FDE postings with no question trail), no confirmation of the role's existence itself turned up this pass; logged as a fourth, distinct FDE status rather than force-fit into Amazon/Apple's "role exists, no trail" framing.
  - Checked two new-to-this-tracker aggregator sites per the workflow's provenance-check rule (educative.io's and designgurus.io's Netflix system-design guides) — both failed the same way `prachub.com`/`systemdesignhandbook.com`/`igotanoffer.com`'s equivalents did in earlier passes (representative example questions, zero per-item candidate/source citation). Both excluded. Also re-confirmed via the LeetCode "Helpful list" curated post that no Netflix section exists there at all, unlike every other company checked against that list so far.
  - Applied the ship bar and wrote `netflix.ts` with 8 questions + full `optimalAnswer` outlines.
- Next: Uber is next in the Hyper-scale consumer group. Deferred items still open: Google's still-missing `optimalAnswer` outlines (8 questions), the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list, and the Apple MLE guide's empty sample-question sections.
- **2026-08-24, Uber pass (`WebSearch` + `claude-in-chrome` browser)** — user directed moving to the next company (Netflix was already in progress in a parallel session, so this pass skipped straight to Uber, the next `Not started` entry). Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Uber question DB (only 10 items total, one page — confirmed the `role=ml-engineer&type=system-design` filter returns zero results and `role=software-engineer` alone also returns zero, so system-design-flavored questions live entirely in the unfiltered 10-item list), the Exponent "Get a Job at Uber" blog (marked "Verified: created with the help of an Uber interviewer" — the strongest single source this pass, corroborating one DB item and adding several real PM/data prompts), 6 LeetCode Discuss threads reread in full (a Mar-2022 driver-location heatmap report, a Jan-2022 "onsite reject" report of the same heatmap question with a variant time-range constraint, a Mar-2022 driver-location-upload-API phone-interview report with full worked numbers, an Apr-2023 SSE onsite event-tracking-system report with explicit API signatures, a Jan-2022 SDE2 billions-of-messages keyword-index report with 3 explicit sub-tasks, and a self-practice "design Uber" diagram post excluded as not a real reported interview), a Dec-2022 Blind post ("Uber L6 staff engineer system design round") that independently corroborated the heatmap question and added a real, concrete follow-up (24-hour-durable analytics requirement), and a first-person Medium account ("I Failed Uber's System Design Interview Last Month...", Feb 2026) — a full-loop narrative of a Senior SDE final-round surge-pricing-engine question, including the exact interviewer framing, the candidate's own requirements/architecture, the specific follow-up question that tripped them up (per-city regulatory price caps against a globally-running stream job), and the actual rejection feedback.
  - The heatmap question is this pass's strongest multi-source corroboration: the same "every driver streams location in real time, plot density over the last 20 minutes in 1-minute buckets" prompt was independently reported on LeetCode (Mar 2022) and Blind (Dec 2022, explicitly tagged an L6 Staff Engineer round), with Blind's version adding a genuine third follow-up (make the same data durable and queryable for analytics after 24 hours) that the LeetCode version doesn't have — combined into one shipped question using the richer, later-reported follow-up.
  - The Medium surge-pricing account is the richest single narrative found across every company pass so far in one respect: it's the only source in this entire tracker (across 6 companies) that reports the actual interviewer follow-up that specifically defeated the candidate, and the literal rejection-email feedback ("didn't demonstrate sufficient depth in cross-region system complexity and edge case handling") — used directly in the shipped question's `followUps` and context.
  - Checked Exponent's Uber ML Engineer role filter directly (`company=uber&role=ml-engineer&type=system-design`) — zero results, confirmed by a direct page fetch rather than inferred from a search snippet. Broader searches for Uber ML/AI system-design questions (InterviewQuery, Dataford, DataInterview, Interview Node) only returned generic loop-structure and topic-area descriptions (feed ranking, pickup-location optimization, LLM/RAG for L5a+) with no actual reported question text — logged as a genuinely thin bucket for Uber specifically, per the workflow's instruction to note rather than silently skip.
  - Searched directly for an Uber Forward Deployed Engineer or agentic-AI-specific role — unlike Amazon/Apple (confirmed real, open FDE postings with no question trail) or Meta (confirmed no such role), no evidence turned up either way this pass — closest in status to Netflix's "not actively confirmed or disproven" finding, logged as such rather than defaulting to a different company's framing.
  - Searched directly for an Uber-specific incident-response/on-call system-design prompt (the way Google's "paged at 2am" question was cross-site-corroborated) — found only generic loop-structure mentions ("incident narratives" as a behavioral topic for senior+ roles) and one third-party prep site (`mockingly.ai`) asserting a metrics-monitoring-and-alerting question is asked at "Datadog, Google, Amazon, Meta, Netflix, Cloudflare, and Uber" with zero per-company candidate citation — same failure mode as `prachub.com` in the Google pass, excluded rather than shipped or even logged as a found operational item. Scenario-operational is a genuinely thin bucket for Uber this pass.
  - Checked one new-to-this-tracker aggregator site per the workflow's provenance-check rule (`hack2hire.com`'s Uber system-design question bank) — titles only behind a "200+ candidate reports" claim with no visible per-question source link or date beyond a vague "reported N days/weeks ago" badge; its one Uber-specific title ("Design Driver Location Heatmap") only restates what LeetCode/Blind already independently confirmed with real text, so it added no new information and wasn't cited as its own source.
  - Applied the ship bar and wrote `uber.ts` with 6 questions + full `optimalAnswer` outlines. All 6 shipped as `system-design` — unlike every prior company, this pass found no ship-worthy `ml-ai-system-design`, `lld-ood`, `fde-agentic`, or `scenario-operational` item; each of those four buckets came back either empty or only bare-title/topic-label thin, logged explicitly above rather than padded.
- Next: Airbnb is next in the Hyper-scale consumer group. Deferred items still open: Google's still-missing `optimalAnswer` outlines (8 questions), the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list, and the Apple MLE guide's empty sample-question sections.
- **2026-08-24, Airbnb pass (`WebSearch` + `claude-in-chrome` browser)** — user said "continue," directing straight to the next company (first `Not started` entry, Airbnb). Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Airbnb question DB (only 2 items, one page — the smallest of any company's DB in this tracker so far), the Exponent "Get a Job at Airbnb" blog (marked "Verified: created with the help of an Airbnb interviewer" — same role its Uber equivalent played last pass, but every one of its system-design items turned out to be a bare imperative), Hello Interview's Airbnb G9 guide plus its linked community question database (both new to this tracker this pass), 6 LeetCode Discuss threads reread in full (the Airbnb Wallet system-design thread with two independent corroborating candidate comments, a Jan-2026 Senior Engineer full-loop writeup with a booking/hot-partition system-design question, a Sep-2020 in-memory-file-system phone-screen spec, a Feb-2022 L4 Bangalore recently-viewed-listings report, a self-practice Hotel Booking App LLD post excluded for lacking company confirmation, and a thin Feb-2021 reject corroborating the wallet question with no new detail), and one Blind thread ("Airbnb system design expectations") reread in full including its AI-generated comment summary cross-checked against the actual comment text, which independently corroborated the group-chat/messaging question from two separate commenters.
  - **New source this pass: Hello Interview's community question database.** Different provenance shape than Exponent's DB — each question page shows a dated, leveled "Question Timeline" of individual reports rather than just a bare title and an aggregate answer count, which is closer to a real per-report log. Treated as High confidence when fetched and read in full, but with an explicit note whenever the prompt text itself is Hello Interview's own canonicalized write-up aggregated across reports rather than one candidate's verbatim wording. The key judgment call this pass: company-tag exclusivity mattered as much as the prompt's own specificity. The booking-waitlist-system question is tagged *only* to Airbnb across three dated reports and shipped; the Reservation-System and Notification-System questions have comparable prompt specificity but are shared verbatim across many other companies (Rippling/headway/+1 more; and ~20 companies including Coupang/Metropolis/Microsoft, respectively) with only a single thin Airbnb-specific report each — both left unshipped as the weaker, more generic siblings of questions that did ship from richer, Airbnb-exclusive sources.
  - Checked two new-to-this-tracker aggregator sites per the workflow's per-new-site provenance rule: `prachub.com`'s Airbnb category (already failed this check once in the Google pass, but re-checked its Airbnb-specific "Design a customer LTV prediction system" page directly rather than assumed) and `dataford.io`'s Airbnb ML Engineer and GenAI Engineer guides (new site, checked twice — once per role guide). Both failed the same way every prior aggregator failure has: detailed, plausible-reading question content with zero per-item source, date, or candidate reference. Both excluded from the shipped app and logged as explicit exclusions rather than cited.
  - IGotAnOffer's Airbnb SWE guide turned out to be unusually self-aware about its own limitation: it explicitly states it couldn't find real Airbnb system-design questions and substituted generic Google/Facebook/Amazon ones instead — the guide effectively disqualified its own system-design section by its own admission, so nothing from it was used.
  - Found and excluded a new failure mode not seen in any prior company's pass: InterviewMan's "Airbnb Software Engineer Interview Guide 2026" blog post reads as a detailed, dramatic first-person interview narrative with real-shaped technical content, but the site's entire business is selling an "undetectable real-time AI interview-cheating" tool, and the post is structured as marketing copy for that product (mid-narrative product pitches included). Excluded on authenticity grounds — a materially different risk than a genuine personal blog — even though nothing else this pass flagged content specifically as likely-fabricated; worth watching for on future companies' passes, since it suggests this kind of promotional "interview story" content is out there and easy to mistake for a real account at a glance.
  - Verified Airbnb has real, currently open GenAI-Systems-titled engineering roles (via Airbnb's own careers site: Senior/Staff Software Engineer, GenAI Systems; a BizTech GenAI role; a Staff MLE, AI Enablement role), several explicitly tied to the Community Support Platform team — the same "role(s) confirmed real and open, zero candidate-question trail" status Amazon's and Apple's passes established, rather than Meta's "role doesn't exist" or Netflix's/Uber's "unconfirmed either way" framing. No posting titled literally "Forward Deployed Engineer" was found, but the GenAI Systems track is functionally the closest analog.
  - ML/AI and scenario-operational both came back genuinely thin specific to Airbnb — logged as explicit bucket exclusions with the aggregator-guide dead ends as the paper trail, per the workflow's own instruction, rather than silently omitted.
  - Applied the ship bar and wrote `airbnb.ts` with 6 questions + full `optimalAnswer` outlines. 5 shipped as `system-design`, 1 (the in-memory file system) as `lld-ood` — the same categorization call Google's pharmacy-shop LLD find and Microsoft's coded-file-system exercise made, since it's a data-structure/OOD exercise rather than a distributed-systems design despite being asked in a "system design"-labeled round.
- Next: LinkedIn is next in the Hyper-scale consumer group. Deferred items still open: Google's still-missing `optimalAnswer` outlines (8 questions), the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list, and the Apple MLE guide's empty sample-question sections.
- **2026-08-24, Twitter/X pass (`WebSearch` + `claude-in-chrome` browser)** — user directed skipping straight to Twitter/X (Airbnb and LinkedIn were being handled in a parallel session at the same time). Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's Twitter question DB (only 3 items total, confirmed the same 3 items appear whether filtered by `type=system-design` or `role=swe` — the smallest DB of any company in this tracker, tied with Airbnb's), 7 LeetCode Discuss threads reread in full (the bad-expressions-search onsite report with a genuinely substantive comment thread debating Trie vs. Aho-Corasick vs. inverted-index approaches, a ping-pong-probability phone-interview report, a 2018 intern-loop report with the actual question unrecalled, a detailed Oct-2021 multi-company loop write-up whose author explicitly withheld exact question text per NDA, and 3 self-practice/notes posts with no company-confirmation claim), 3 Blind threads (all fully reread, all generic loop-structure color with no recoverable prompt), and one new-to-this-tracker aggregator (`datainterview.com`'s Twitter/X MLE guide).
  - This is the thinnest pass in the tracker to date: no dedicated Exponent system-design blog exists for Twitter/X the way one does for every Big Tech company plus Uber and Airbnb (searches for a "Get a Job at Twitter"-style post came back empty), and no Hello Interview company guide exists for Twitter/X either (unlike Airbnb's G8/G9 guides last pass) — confirmed by direct search, not assumed.
  - Found a genuinely new aggregator failure mode this pass, distinct from the usual "no per-item citation" pattern: `datainterview.com`'s "Twitter (X) Machine Learning Engineer" guide has sample interview questions individually tagged to *other* companies (Airbnb, Amazon, Meta) right there on the Twitter/X-branded page — i.e. the page's own example content isn't even about the company it claims to guide candidates for, strong evidence of templated content reused verbatim across the site's per-company guides rather than real per-company sourcing. Excluded and logged as its own distinct finding (worth watching for on this site specifically in future passes, the way InterviewMan's marketing-copy pattern was flagged during Airbnb's pass).
  - Also encountered, and correctly did not act on, a LeetCode Discuss post surfaced by an on-topic search that turned out to be unrelated spam/marketing content (a paid account-suspension "service" with Telegram/WhatsApp contact info embedded in the post body) — noted in the catalog's "Explicitly excluded" section so a future pass doesn't re-fetch the same URL expecting real content.
  - The one item that shipped (`twitter-bad-expression-tweet-filter`) is algorithmic/LLD in character rather than classic distributed-systems HLD — the same category call Uber's billions-of-messages-keyword-index question made (shipped as `system-design` despite its core challenge being multi-pattern string matching, not infra scaling), applied consistently here since the content-moderation framing and comment-thread depth (Aho-Corasick named explicitly, an inverted-index alternative debated) gave it real system-design texture beyond a pure algorithm exercise.
  - Checked ML/AI, FDE/agentic, and scenario-operational buckets directly — all three came back genuinely thin specific to Twitter/X, logged as explicit bucket exclusions with the dead-end sources named, per the workflow's own instruction, rather than padded or silently omitted.
  - Applied the ship bar and wrote `twitter.ts` with 1 question (the smallest shipped catalog of any company so far) + a full `optimalAnswer` outline, categorized `system-design`.
- Next: Stripe is next (first `Not started` entry, now that Twitter/X closes out the Hyper-scale consumer group alongside Airbnb and LinkedIn — check both, since this pass ran in parallel with a LinkedIn pass in another session). Deferred items still open: Google's still-missing `optimalAnswer` outlines (8 questions), the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list, and the Apple MLE guide's empty sample-question sections.
- **2026-08-24, LinkedIn pass (`WebSearch` + `claude-in-chrome` browser)** — user directed moving to LinkedIn specifically (Airbnb and Twitter/X were already in progress in parallel sessions). Went straight to browser for LeetCode/Blind rather than burning `WebFetch` attempts, per the established lesson. Sources used: Exponent's LinkedIn question DB (10 items, not role-filtered — confirmed the `role=ml-engineer&type=system-design` filter returns only 2 of those same 10 items, and the broader 31-item `role=ml-engineer` list is almost entirely DSA/ML-fundamentals with no new system-design content), the Exponent "Get a Job at LinkedIn" blog (full reread — no "Verified with an interviewer" badge this time, unlike Uber's/Airbnb's equivalents, but did surface a genuine new round-format finding: an onsite "AI coding round" using HackerRank's built-in AI assistant, evaluated on reasoning about the AI's suggestions rather than just accepting them), 4 LeetCode Discuss threads reread in full (the 2019 top-shared-posts thread with 2-source corroboration, a Jun-2025 Staff SWE full-loop offer writeup that alone produced 3 shipped questions across 3 different rounds of the same loop — cache/eviction, notification system, and the legacy-app craftsmanship scenario — plus a DSA-round graph question logged but not shipped, an Aug-2025 second Staff SWE loop independently corroborating both the malicious-request-interceptor question and the legacy-app scenario, and a Sep-2025 Senior SWE rejected-loop writeup for the KV-store/job-scheduler leads that stayed too thin to ship), and 2 Blind threads (the metrics-gathering-system thread — 3-way corroborated as "a popular LinkedIn question" including one report of it recurring in a behavioral/EM round — and the "System Design (ID3) interview tips" thread, useful mainly for structural context on LinkedIn's infra-vs-apps track split and as a third corroboration of the top-shared-posts/top-K question).
  - This pass's single most valuable source was the same pattern Microsoft's and Airbnb's passes already established: one detailed, recent full-loop writeup (the Jun-2025 Staff SWE offer account) outperformed the entire bare-title Exponent DB, producing 3 of the 6 shipped questions plus one more (the connections-graph DSA question) that was real but didn't fit any of this app's five categories.
  - The legacy-application quality/prioritization scenario is this pass's strongest corroboration: reported in near-identical wording by two different Staff SWE candidates in two different LeetCode threads three months apart (Jun 2025 and Aug 2025), both explicitly in LinkedIn's dedicated "Craftsmanship" behavioral round — shipped as `scenario-operational` rather than force-fit into `system-design`, since it's an engineering-judgment/prioritization framework question, not an architecture one.
  - LinkedIn's own Exponent DB, blog, and every LeetCode/Blind account converge on system-design/infra content only — unlike Airbnb's pass immediately before it, this pass found no ship-worthy `ml-ai-system-design` item at all; the ML-engineer role filter's 31 items are overwhelmingly DSA/stats/ML-fundamentals, not ML-system-design narratives, despite LinkedIn's own blog naming recommendation systems/ads-ranking/news-feed as ML-round topic areas in general terms only.
  - Checked one new-to-this-tracker aggregator site per the workflow's provenance-check rule (`prachub.com`'s LinkedIn category page, which had already failed this same check for 3 other companies) — same failure mode again (detailed-reading prompts, zero per-item source/date/candidate citation). Excluded.
- **2026-08-24, PayPal pass (`WebSearch`/`WebFetch` only, no browser)** — user directed moving to PayPal specifically, since Stripe was being handled by another agent in parallel. The `claude-in-chrome` extension reported "not connected" on every `tabs_context_mcp` attempt this session, so — unlike every prior pass since Google's #2 — LeetCode/Glassdoor/Blind pages could not be fully rereread; every item from those three sites is capped at Medium confidence (search-snippet sourced) this pass. Sources used: Exponent's PayPal question DB (only 3 items total, general list; confirmed the `role=data-engineer`, `role=mobile-engineer`, `role=bizops`, and `type=concept` filters all return zero results — this is the thinnest company DB found in this tracker so far, thinner even than Airbnb's/Twitter's 2–3-item DBs since those at least had role variants with content), 2 roundz.substack.com full-loop writeups (Substack isn't behind the same bot-block as LeetCode/Glassdoor, so these two *did* get a full `WebFetch` reread — a parking-lot system-design report from an SE3/T24 Bangalore loop, and a Movie Reservation System report from an SDE2/L2 Hyderabad loop), 8 LeetCode Discuss threads reached via search snippet only (IRCTC-style ticket-booking, payment-service-plus-elevator-system, payment-gateway HLD, and the airplane-booking-like-Expedia recruiter-mismatch report among them), a Glassdoor cross-page consensus (parking-garage-with-AI-monitor, notification-system-from-social-media, Railway Ticket Booking System, chat app, vending machine — none individually confirmed via direct fetch, all 403'd without the browser), and one Blind thread (PayPal Data Engineer system design, thin/unelaborated).
  - The tooling gap mattered concretely this pass: Google's pass #2 established that a real browser session gets past LeetCode/Glassdoor's 403s on scripted fetches, and every company pass since has used it to upgrade Medium→High confidence on its strongest LeetCode finds. Without it here, even the two strongest LeetCode leads (IRCTC ticket-booking and payment-service-plus-elevator) shipped at Medium rather than High — a future pass with the browser available should retry those specific URLs (logged above) before assuming this is as good as the sourcing gets.
  - Checked 6 different prep/aggregator sites against the workflow's per-new-site provenance rule this pass (`systemdesignhandbook.com`, `designgurus.io`, `finalroundai.com`, `interviewcoder.co`, `techinterview.org`, and a repeat check of `prachub.com`, which had already failed this same check for Google/LinkedIn) — every single one failed it, all presenting "PayPal-style" or "commonly asked" questions with zero per-question source citation. This is the highest concentration of failed-provenance aggregators found for any company in this tracker so far, consistent with PayPal's system-design interview trail being thin enough that prep-content sites appear to be filling the gap with generic/synthesized material rather than reporting real candidate accounts.
  - Net result: 5 of 15 general-bucket items shipped (~33%), a higher hit rate than Google's 24% or Meta's ~10% despite — or perhaps because of — the much smaller total catalog; no LLD/OOD, ML/AI, FDE, or scenario-operational item cleared the bar, and all three of those non-general buckets are logged as explicitly, genuinely thin rather than silently skipped.
  - Searched directly for a LinkedIn Forward Deployed Engineer or clearly equivalent agentic role — no posting or candidate report turned up either confirming or disproving it, closest to Netflix's/Uber's "unconfirmed either way" status rather than Amazon/Apple/Airbnb's "role exists, no trail" or Meta's "role doesn't exist."
  - Applied the ship bar and wrote `linkedin.ts` with 6 questions + full `optimalAnswer` outlines — 5 `system-design`, 1 `scenario-operational`; no ship-worthy `ml-ai-system-design`, `lld-ood`, or `fde-agentic` item found this pass, logged explicitly above rather than padded.
- Next: Stripe is next (first `Not started` company, start of the Fintech / enterprise group) once Airbnb and Twitter/X's parallel passes finish. Deferred items still open: Google's still-missing `optimalAnswer` outlines (8 questions), the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list, and the Apple MLE guide's empty sample-question sections.
- **2026-08-24, Stripe pass (`WebSearch` + `WebFetch`, no browser session)** — user said "start stripe," directing straight to the first `Not started` company (start of the Fintech / enterprise group). Marked in-progress immediately; a parallel session picked up PayPal/Visa next once it saw Stripe was already claimed, per that pass's own log entry above. **The `claude-in-chrome` extension reported disconnected for this entire pass** — every `tabs_context_mcp` call failed with "Browser extension is not connected." Rather than block on it, fell back to `WebFetch`, and when that 403'd on the usual blocked domains (LeetCode, Blind — same hosts established as blocked since the Google pass), tried routing through `r.jina.ai`'s reader-mode proxy (`https://r.jina.ai/<url>`) as a substitute for a real browser session. This worked well for Medium (both articles fetched in full after direct 403s) and for Hello Interview specifically (its question pages are client-rendered — a direct `WebFetch` returned only empty page shell, but the proxy rendered and returned full content, including the "Question Timeline" per-report sections) — but Blind stayed completely blocked even through the proxy, returning only its own generic error page on every attempt. This is the first pass in this tracker with zero usable Blind content.
  - Sources used: Exponent's Stripe question DB (10 items, one page), the Exponent "Get a Job at Stripe" blog (marked "✅ Verified... created with input from recent Stripe candidates and interviewers," fetched directly — this domain isn't blocked), Exponent's dedicated "Stripe System Design Interview (2026 Guide)" blog (fetched directly, then a follow-up fetch specifically for verbatim quotes rather than a paraphrase — this distinction mattered, since the first fetch's summary undersold how templated vs. concrete the "internal authorization system" prompt's numbers actually were), 3 Hello Interview community-question pages retrieved via the proxy workaround (an internal ledger system — Stripe-exclusive, 3 dated reports; an AI customer support agent — 1 dated report, this pass's only `fde-agentic` find; a rule-based fraud-detection HackerRank exercise — Stripe-exclusive, 3 dated reports, real but excluded on category-fit grounds), 2 Medium first-person accounts retrieved via the proxy after direct 403s (a webhook-delivery-system account with four escalating interviewer follow-ups; a payments-API-idempotency account explicitly framed around what separates Senior from Staff answers, including the author's own fail-then-retake narrative), one LeetCode thread retrieved via the proxy and confirmed to be a self-practice post rather than a reported interview (excluded), and confirmation via direct press coverage that Stripe has posted a real, currently open, explicitly **"Forward Deployed AI Accelerator"** role.
  - The `r.jina.ai` proxy is a genuinely new finding worth flagging for future passes that hit the same "no browser session" wall: it isn't a substitute for `claude-in-chrome` in general (no clicking, no screenshots, no interactive cookie-consent handling), but for the specific failure mode of "`WebFetch` 403s on a bot-blocked host" or "the page is client-rendered and `WebFetch`'s raw HTML fetch returns an empty shell," it recovered full, apparently-complete content for every domain except Blind. Worth trying before assuming a pass is blind to LeetCode/Hello-Interview-style sites just because the extension is down.
  - Stripe's Forward Deployed role is the most explicitly-named finding of its kind across every company pass so far — every prior company's equivalent (Amazon, Apple, Airbnb) was a same-shape GenAI/AI-Systems title, never the literal words "Forward Deployed." Logged as its own distinct status (real, open, explicitly FDE-titled, zero candidate-question trail) rather than reused wording from a prior company's finding.
  - Checked whether the two Medium narratives and Hello Interview's "AI Customer Support Agent" report might be describing the same hiring team/role (the newly-posted Forward Deployed AI Accelerator role) — no way to confirm that connection, so kept as three separate findings rather than merged.
  - Checked one new-to-this-tracker LeetCode thread ("Design Stripe subscriptions") that read, at a WebSearch-snippet level, like a rich reported interview question — direct proxy fetch of the original post confirmed it's actually a self-posed practice prompt on LeetCode's `general-discussion` board linking to Stripe's own public docs, not a candidate report. This is the second time this pass's own instinct to trust a rich-looking snippet would have shipped something that didn't survive a full-text check — worth remembering that "general-discussion" vs. "interview-question" as a LeetCode URL path segment is itself a useful, checkable signal before investing more time in a thread.
  - Applied the ship bar and wrote `stripe.ts` with 4 questions + full `optimalAnswer` outlines — 3 `system-design`, 1 `fde-agentic` (the first `fde-agentic` ship since Google's pass, and the richest `fde-agentic` prompt of any company so far, since it's a real reported question rather than a behavioral-round proxy for the category the way Google's was). No ship-worthy `ml-ai-system-design` or `scenario-operational` item found this pass — the closest scenario-operational candidate (`educative.io`'s three named failure-mode scenarios) failed the same provenance check that excluded that site from every other bucket.
- Next: PayPal/Visa/Bloomberg are already in progress or done via the parallel session noted above — check this file's Companies checklist for current status before claiming the next one.
- **2026-08-24, Bloomberg pass (`WebSearch` + `WebFetch` only, no browser)** — user said "continue... let's go for bloomberg," directing straight to Bloomberg specifically (Stripe and PayPal were already done, Visa already in progress in a parallel session per the Companies checklist). **The `claude-in-chrome` extension reported "Browser extension is not connected" on every `tabs_context_mcp` attempt this session** — same wall as the Stripe and PayPal passes hit. Unlike the Stripe pass, the `r.jina.ai` reader-proxy workaround wasn't tried this pass (didn't occur to reach for it until after the bulk of research was already done via plain `WebSearch` snippets) — worth trying first in a future browser-down pass rather than defaulting straight to snippet-only `WebFetch`/`WebSearch`. Sources used: Exponent's Bloomberg question DB (confirmed **zero results** for `type=system-design` across the unfiltered, `role=solutions-architect`, and `role=data-engineer` filters alike — the emptiest company DB found in this tracker so far, even emptier than Stripe's/PayPal's/Airbnb's/Twitter's small-but-nonzero ones), the Exponent Bloomberg SWE guide (fetched directly, one usable but bare Hiring-Manager-round imperative), roughly a dozen LeetCode Discuss threads reached via search-snippet only (10/100k-stock multi-exchange price system, top-K-by-volume and its "Trending Stock" near-duplicate, the stock-change percent-alert system, the AAPL-transaction-threshold-alert new-grad rejection account, the Valid-Anagram-paired Design-Underground-System onsite plus 3 more independent reports of Underground System recurring across other loops, a library-checkout LLD-plus-SQL one-liner, and a lottery-system O(1) coding-round pair from a Nov 2025 Staff-ish SDE loop), one Glassdoor question page reached via search snippet only (the "stream exchange data to the Bloomberg Terminal" New Grad prompt, with its own added color that Bloomberg's coding questions generally "will not be from LeetCode"), one Blind thread reached via search snippet (the Buy-Side Team NYC Senior SWE pre-interview question naming OMS/trade-lifecycle/market-data-pipeline as the likely domain), and direct confirmation via Bloomberg's own Avature careers site of multiple live "Senior AI Engineer — Generative AI & Search" requisitions.
  - Bloomberg's own Exponent DB being completely empty for system-design (not just small, like Stripe's 10 or PayPal's 3, but literally zero across every role filter tried) is a new low-water-mark for this tracker — meant this pass leaned on LeetCode/Glassdoor search snippets far more heavily than any prior pass's primary source mix, which is also why every single shipped item this pass caps at Medium confidence rather than High.
  - `interviewquery.com`'s dedicated Bloomberg ML Engineer guide returned HTTP 429 (rate-limited) on every `WebFetch` attempt this pass, both for its own page and the general Bloomberg SWE guide — unlike a 403 (confirmed-blocked host), a 429 suggests a retry after a cooldown might actually succeed; worth trying again in a future pass rather than treating it as permanently inaccessible the way LeetCode/Glassdoor are.
  - Design Underground System (LeetCode #1396, framed as "checkIn/checkOut/getAverageTime" three-method API design) is this pass's strongest multi-source corroboration — independently reported across 4 separate Bloomberg-tagged LeetCode threads spanning a phone round, a paired onsite with Valid Anagram, a 2022 New Grad full-loop writeup, and a Phone+Onsite report — shipped as `lld-ood` rather than `system-design` since it's a single-process data-structure/API design exercise, the same categorization call Google's pharmacy-shop question and Microsoft's coded-file-system exercise made.
  - Checked whether Bloomberg has a Forward Deployed Engineer role, an ML/AI-system-design trail, and a scenario-operational trail, the way every prior company's pass did: confirmed real, currently-open **Senior AI Engineer — Generative AI & Search** postings (role-exists-no-trail status, same as Amazon/Apple/Airbnb), found no evidence either confirming or disproving an FDE-titled role (unconfirmed-either-way status, same as Netflix/Uber/LinkedIn — notably *not* the same as Stripe's pass immediately before this one, which found an explicitly FDE-titled role), and found the scenario-operational bucket genuinely thin (generic incident-triage claims across several aggregator sites, zero per-candidate citation behind any of them, plus one real-but-non-interview data point — the actual 2015 Bloomberg Terminal outage — cited only as a prep guide's own illustrative teaching example, not anything ever asked of a candidate).
  - Checked 5 new-to-this-tracker sources directly per the workflow's per-new-site provenance rule and excluded all 5 for the same no-per-item-citation failure mode established since Google's pass: `systemdesignhandbook.com`'s Bloomberg guide (4 generic sample questions), `engineeringenablement.substack.com`'s Bloomberg guide (its one "example" turned out, on direct fetch, to be explicitly the author's own invented illustration, not a sourced report), `refer.me`'s "AI Engineer" case (confirmed via direct fetch to be the platform's own paywalled practice-case content, not a real interview report), and `blog.bugfree.ai`'s "4 Rounds" writeup (confirmed via direct fetch to be an anonymized third-person paraphrase of "a high-scoring Bugfree user" with no verbatim question text or dates — a new, slightly different failure mode from a pure content-free aggregator, since it does describe two specific rounds in real if unquotable detail, kept in the tracker as an unshipped lead rather than fully discarded).
  - Applied the ship bar and wrote `bloomberg.ts` with 6 questions + full `optimalAnswer` outlines — 5 `system-design`, 1 `lld-ood`; no ship-worthy `ml-ai-system-design`, `fde-agentic`, or `scenario-operational` item found this pass, logged explicitly above (with each bucket's specific dead-end sources named) rather than padded.
- Next: check this file's Companies checklist for the next `Not started`/in-progress entry before claiming one — Visa was still in progress in a parallel session as of this pass. Deferred items still open across the whole tracker: Google's still-missing `optimalAnswer` outlines (8 questions), the two flagged-but-unshipped items from Amazon's Jul-2025 HLD/LLD compiled list, the Apple MLE guide's empty sample-question sections, and a retry of Bloomberg's LeetCode/Glassdoor sources (and the `interviewquery.com` 429s) with the browser reconnected to try upgrading this pass's Medium-confidence items to High.
