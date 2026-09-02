import type { FoundationLesson } from "../types";

/**
 * Closes a gap this course's own content flagged during an audit: this
 * app's Circuit Breaker entity (a real Closed/Open/Half-Open state machine,
 * with Resilience4j-calibrated benchmarks already sitting in
 * `entityConfigSchema.ts`) had zero corresponding theory lesson anywhere in
 * Foundations. Synthesized from the standard treatment of the circuit
 * breaker pattern (Michael Nygard's "Release It!", Netflix's Hystrix wiki,
 * Resilience4j's documentation) rather than one single source, deliberately
 * sequenced right after Lesson 22 (Rate Limiting) since the two patterns
 * are the course's clearest "which kind of no is this" pairing.
 */
export const CIRCUIT_BREAKERS: FoundationLesson = {
  slug: "circuit-breakers",
  number: 23,
  title: "Circuit Breakers",
  tagline:
    "An electrical circuit breaker trips to stop a fault from becoming a fire. This one trips to stop one struggling dependency from taking down everything that calls it.",
  estimatedMinutes: 40,
  sections: [
    {
      id: "intuition",
      heading: "Intuition first",
      blocks: [
        {
          kind: "paragraph",
          text: "Lesson 22 covered the proactive no: a rate limiter rejects a client before it has sent too much, regardless of whether anything is actually broken. A circuit breaker is the reactive no: it lets every request through normally until the thing it's protecting starts genuinely failing, and only then starts rejecting — fast, and without even trying the dependency again until there's real reason to believe it recovered.",
        },
        {
          kind: "paragraph",
          text: "Without one, a slow or dead dependency doesn't just fail its own requests — it fails them slowly. Every caller waits out the full timeout before giving up, which means every caller's own threads/connections stay tied up waiting, which makes the caller itself start looking unhealthy to whatever calls it. One dependency's outage propagates outward through every layer that was patiently waiting on it — a cascading failure.",
        },
        {
          kind: "insight",
          text: "The fix isn't retrying harder — a retry storm against a genuinely overloaded dependency adds load to exactly the thing that's already drowning, making recovery slower, not faster. A circuit breaker's entire purpose is to stop calling a struggling dependency altogether once failure looks systemic rather than transient, which protects both the caller (fails fast instead of waiting out timeouts) and the dependency (gets a break from traffic instead of more of it while it's down).",
        },
      ],
    },
    {
      id: "state-machine",
      heading: "The state machine",
      blocks: [
        {
          kind: "paragraph",
          text: "A circuit breaker wraps exactly one dependency and tracks the outcome of every call through it, moving between three states.",
        },
        {
          kind: "flow",
          steps: [
            { title: "Closed — normal operation", detail: "every call passes through to the real dependency; failures are counted", tone: "healthy" },
            { title: "Failure Threshold reached", detail: "consecutive (or windowed) failures cross the configured limit", tone: "critical" },
            { title: "Open — failing fast", detail: "every call fails instantly without ever reaching the dependency, for Trip Duration", tone: "critical" },
            { title: "Trip Duration elapses → Half-Open", detail: "a small number of trial probes are let through to test recovery", tone: "signal" },
            { title: "Probes succeed → Closed again", detail: "or: any probe fails → back to Open, timer restarts", tone: "healthy" },
          ],
        },
        {
          kind: "table",
          headers: ["State", "Does it call the dependency?", "What moves it to the next state"],
          rows: [
            ["Closed", "Yes, every call", "Consecutive failures reach the Failure Threshold → Open"],
            ["Open", "No — fails every call instantly", "Trip Duration elapses → Half-Open"],
            ["Half-Open", "Yes, but only up to Half-Open Probes calls at once", "All probes succeed → Closed. Any probe fails → back to Open"],
          ],
        },
        {
          kind: "insight",
          text: "Half-Open is the state most people forget when first describing this pattern, and it's the one that actually matters: without it, a breaker would either have to guess when to reopen (unsafe — the dependency might still be down) or need a human to flip it back on (slow, doesn't scale). A small number of probe requests is the automated, low-risk way to ask \"are you actually better now?\" without fully re-exposing a maybe-still-broken dependency to full traffic the instant the timer runs out.",
        },
      ],
    },
    {
      id: "worked-example",
      heading: "Worked example",
      blocks: [
        {
          kind: "paragraph",
          text: "Failure Threshold = 3, Trip Duration = 5s, Half-Open Probes = 1. A downstream database starts failing:",
        },
        {
          kind: "table",
          headers: ["Time", "Event", "Breaker state after"],
          rows: [
            ["t=0.0s", "Call 1 fails", "Closed (1 consecutive failure)"],
            ["t=0.1s", "Call 2 fails", "Closed (2 consecutive failures)"],
            ["t=0.2s", "Call 3 fails — hits Failure Threshold", "Open"],
            ["t=0.3s – 5.2s", "Calls 4-9 arrive", "Open — every one fails instantly, dependency never touched"],
            ["t=5.2s", "Trip Duration elapsed, call 10 arrives", "Half-Open — this one call is let through as a probe"],
            ["t=5.2s (probe result: fails)", "Dependency still down", "Back to Open, 5s timer restarts"],
            ["t=10.4s (probe result: succeeds)", "Dependency recovered", "Closed — normal traffic resumes"],
          ],
        },
        {
          kind: "insight",
          text: "Notice what didn't happen between t=0.3s and t=5.2s: six calls that would otherwise have each waited out a full timeout against a dead dependency instead failed in effectively zero time. That's the entire value proposition in one row of the table — the breaker converts six slow, resource-holding failures into six instant ones, freeing every one of those callers' threads/connections immediately instead of tying them up waiting on a doomed request.",
        },
      ],
    },
    {
      id: "fallbacks",
      heading: "Failing fast is only half the fix",
      blocks: [
        {
          kind: "paragraph",
          text: "A circuit breaker alone converts a slow failure into a fast one — genuinely valuable for the caller's own resource health, but the end user still sees a failure. What makes an open circuit actually useful to the person waiting on the response is what happens next: a fallback.",
        },
        {
          kind: "list",
          items: [
            "Cached/stale response — serve the last known-good result instead of nothing (a product page's price shown as \"as of a few minutes ago\" beats a blank page).",
            "Default value — a recommendations widget that can't reach its service shows a generic \"popular items\" list instead of nothing.",
            "Degraded functionality — a checkout flow whose fraud-check dependency is down might proceed with a more conservative default (hold for manual review) rather than blocking every checkout entirely.",
            "Fail loudly with a clear error — sometimes there's no safe fallback (a payment can't proceed on a guess), and the honest answer is a fast, clear failure instead of a stale or fabricated success.",
          ],
        },
        {
          kind: "insight",
          text: "Which fallback is right is a product decision, not just an engineering one — this is usually the actual depth an interviewer is probing for once the state machine itself is established: does the candidate reach for \"fail fast\" as the whole answer, or recognize that failing fast is the mechanism and choosing what a user sees next is the real design work.",
        },
      ],
    },
    {
      id: "composition",
      heading: "Where it fits: rate limiter, circuit breaker, load balancer",
      blocks: [
        {
          kind: "paragraph",
          text: "These three resilience patterns are easy to conflate because they all \"protect\" something, but they answer different questions and compose rather than substitute for each other.",
        },
        {
          kind: "table",
          headers: ["Pattern", "Question it answers", "Triggered by"],
          rows: [
            ["Rate Limiter (Lesson 22)", "Has this client sent too much?", "Request volume from one caller, regardless of dependency health"],
            ["Circuit Breaker", "Is this dependency too unhealthy to keep calling?", "Consecutive/windowed failures from one specific dependency"],
            ["Load Balancer (Lesson 13)", "Which healthy target should this request go to?", "Ongoing health checks / distribution algorithm across many targets"],
          ],
        },
        {
          kind: "insight",
          text: "Lesson 13 flagged \"health checks are non-negotiable\" as a load balancer's job, and this app's own Load Balancer deliberately does not implement a second, overlapping health-check state machine to avoid duplicating what a Circuit Breaker already is — the intended composition is architectural: wrap each target a load balancer routes to in its own Circuit Breaker, and let the breaker be the thing that detects \"this specific target is unhealthy\" rather than building that detection twice.",
        },
      ],
    },
    {
      id: "real-world-usage",
      heading: "Real usage",
      blocks: [
        {
          kind: "list",
          items: [
            "Netflix Hystrix — the pattern's namesake implementation, popularized the term at scale (now in maintenance mode; Netflix itself has since moved on internally).",
            "Resilience4j (Java) — Hystrix's spiritual successor, and the library this app's own benchmark numbers (Failure Threshold ~20-call sliding window, Trip Duration default of a full minute, Half-Open permitted-calls default) are calibrated against.",
            "Polly (.NET) — the equivalent pattern library in the .NET ecosystem, same Closed/Open/Half-Open shape.",
            "Istio / service mesh outlier detection — circuit breaking implemented at the infrastructure layer (a sidecar proxy) rather than in application code, so every service gets it without each one implementing the pattern itself.",
          ],
        },
        {
          kind: "insight",
          text: "This app's own Circuit Breaker entity implements exactly this three-state machine — Failure Threshold (consecutive failures to trip), Trip Duration (how long Open lasts before a probe), Half-Open Probes (how many trial calls run concurrently during recovery testing) — and wraps exactly one downstream dependency by design, never more than one at a time, matching the Single Responsibility framing Lesson 13's own composition note already established.",
        },
      ],
    },
    {
      id: "interview-perspective",
      heading: "Interview perspective",
      blocks: [
        { kind: "paragraph", text: "Circuit breaker questions usually check whether the state machine is actually understood, not just the name:" },
        {
          kind: "qa",
          question: "\"Walk me through a circuit breaker's states and what moves it between them.\"",
          answer:
            "\"Closed is normal operation — every call goes through, failures are counted. Enough consecutive failures trips it to Open, where every call fails instantly without ever reaching the dependency, for a configured duration. Once that duration elapses, it moves to Half-Open and lets a small number of probe calls through to test recovery — if they succeed, it closes and resumes normal traffic; if even one fails, it goes straight back to Open and the timer restarts. Half-Open is the part people forget, but it's what makes recovery automatic instead of requiring either a risky full re-exposure or a human flipping it back on manually.\"",
        },
        {
          kind: "qa",
          question: "\"Isn't a circuit breaker just a fancier retry policy?\"",
          answer:
            "\"No — they can even work against each other if you're not careful. A retry policy tries the same call again, which is fine for a transient blip but actively harmful against a genuinely overloaded dependency, since more retries mean more load exactly where there's already too much. A circuit breaker's whole point is the opposite: once failures look systemic rather than transient, stop calling entirely for a while. In practice they're used together — retries for the occasional blip while the breaker is closed, and the breaker there specifically to shut retries off once blips become a sustained outage.\"",
        },
        {
          kind: "qa",
          question: "\"You've added a circuit breaker in front of a recommendations service. It trips. What does the user see, and why does that matter?\"",
          answer:
            "\"That's the real design question — the breaker itself only decides to fail fast, not what the user experiences. For recommendations specifically, I'd fall back to a generic 'popular items' default rather than showing an error or an empty section, since a slightly-less-personalized result is a much better outcome than a visibly broken page for something non-critical. For a payment step behind a different breaker, I'd make the opposite call — no safe fallback exists for a guessed payment outcome, so failing fast with a clear error is the right answer there instead.\"",
        },
      ],
    },
  ],
  summary:
    "A circuit breaker is the reactive counterpart to Lesson 22's proactive rate limiter — it doesn't reject based on how much a client has sent, it rejects based on whether the dependency it wraps is currently healthy. It moves through three states: Closed (normal, failures counted), Open (every call fails instantly once Failure Threshold consecutive failures are hit, for Trip Duration), and Half-Open (a small number of probe calls test recovery once the timer elapses — success closes it, any failure reopens it). The value is converting slow, resource-holding failures into instant ones, which protects both the caller's own resources and the struggling dependency from a retry storm making things worse. Failing fast alone isn't the full fix — a fallback (cached data, a default value, degraded functionality, or a clean error when no safe fallback exists) is what turns a fast failure into something the end user can actually live with. It composes with, rather than replaces, a rate limiter (client-volume-triggered) and a load balancer (this app deliberately keeps health-check detection out of Load Balancer specifically so it can be Circuit Breaker's job instead). Netflix Hystrix, Resilience4j, Polly, and Istio's outlier detection all implement this same three-state pattern.",
  keyTakeaways: [
    "Circuit breaker vs. rate limiter: a rate limiter is proactive and client-caused (has this caller sent too much); a circuit breaker is reactive and dependency-caused (is this specific dependency currently too unhealthy to keep calling). Different triggers, often deployed together.",
    "Three states: Closed (normal, counting failures), Open (fails every call instantly once Failure Threshold is hit, for Trip Duration — the dependency is never touched while open), Half-Open (a small number of probes test recovery once the timer elapses).",
    "The value isn't just 'fail faster' — it's converting many slow, resource-holding failures (each caller waiting out a full timeout) into instant ones, which frees the caller's own threads/connections immediately and stops adding load to an already-struggling dependency (unlike a retry storm, which makes that worse).",
    "Failing fast alone doesn't fix the user's experience — a fallback (cached/stale data, a default value, degraded functionality, or an honest error when no safe fallback exists) is the other half of the pattern, and choosing the right one per dependency is real design work, not an afterthought.",
    "Composes with, doesn't replace, a load balancer: this app's own Load Balancer deliberately doesn't build a second health-check state machine, precisely so 'detect an unhealthy target and stop routing to it' stays Circuit Breaker's single responsibility, wrapping each target individually.",
  ],
  exercise: {
    prompt:
      "Your API server calls a third-party payments service directly, with no circuit breaker, and a 10-second timeout per call. The payments service starts failing every request (still accepting connections, but hanging until timeout). (1) Trace what happens to your API server's own capacity over the next minute under sustained traffic, and explain why a caller with plenty of its own spare CPU/memory can still become unable to serve any requests. (2) You add a Circuit Breaker (Failure Threshold=5, Trip Duration=10s, Half-Open Probes=1) in front of the payments call. Walk through what changes for requests 6 through 50 while the outage continues. (3) The payments service actually recovers at second 7 of a 10-second Open window, but the breaker doesn't find out until the window elapses at second 10 — is those 3 extra seconds of unnecessary rejection a bug? What's the real trade-off Trip Duration is balancing, and would you tune it differently for this specific dependency? (4) Checkout can't safely fall back to a guessed payment outcome, but your 'estimated delivery date' feature also calls a separate, unrelated third-party service. Should these two dependencies share one circuit breaker or use separate ones — justify it in terms of the Single Responsibility framing this lesson used.",
  },
  relatedEntitySlugs: ["circuit-breaker", "load-balancer"],
  prerequisites: ["rate-limiting"],
};
