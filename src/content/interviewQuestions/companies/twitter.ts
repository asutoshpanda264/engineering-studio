import type { InterviewQuestion } from "../types";

/**
 * Twitter / X — researched 2026-08-24, see `docs/interview_exp.md` for the
 * full research log and the complete list of what was found (and what was
 * excluded, including a couple of generated/synthetic-looking prep sites
 * this pass specifically flagged). This company's public candidate-report
 * trail is genuinely thin compared to earlier passes — most of what
 * surfaced was either a bare "Design Twitter." topic label repeated across
 * a dozen prep sites, or a loop-structure description with the exact
 * question withheld ("can't share details, NDA"). Only one item this pass
 * cleared the same bar the other companies' files use: a real, specific,
 * expansive prompt — not a title. See the tracker's "Shipped to app" note
 * for the full before/after list and reasoning.
 *
 * The question here also carries an `optimalAnswer` — a worked-answer
 * outline (approach, key points, trade-offs, follow-ups), not a
 * transcript to memorize. This is authored by reasoning through the
 * problem the way a strong candidate would, not sourced from a specific
 * candidate's actual answer — unlike `prompt`/`context`, which are sourced
 * and cited, `optimalAnswer` is this app's own content.
 */
export const TWITTER_QUESTIONS: InterviewQuestion[] = [
  {
    id: "twitter-bad-expression-tweet-filter",
    company: "Twitter",
    title: "Design a bad-expression filter for tweets",
    prompt:
      "You are given a list of \"bad expressions\" ahead of time. You can preprocess them, or do whatever you need. You are to implement a method that receives a tweet, and tries to find any of the bad expressions in the tweet, and to return a list of all the bad expressions you found. Example — bad expressions: \"foo\", \"food\", \"frank\", \"this has\", \"is has\", \"return\", \"now now\"; tweet: \"this has been #TK421Tweets. We now return you to your regularly scheduled Twitter.\"; expected result: [\"this has\", \"return\", \"is has\"].",
    category: "system-design",
    tags: ["abuse-content-moderation"],
    source: {
      name: "LeetCode Discuss",
      url: "https://leetcode.com/discuss/interview-question/1841258/twitter-onsite-bad-expressions-search",
      reportedDate: "Mar 2022",
      confidence: "high",
      note: "Onsite round; candidate reported not getting the offer and posted their Trie-based solution asking for a better approach.",
    },
    context:
      "The candidate's own submitted solution built a Trie from the bad expressions and walked it character-by-character from every position in the tweet (O(m·N), where m is the longest bad expression and N is the tweet length). The comment thread pushes past that: one reply names Aho-Corasick as the textbook multi-pattern-matching algorithm for exactly this problem (true O(N+M+K) — tweet length + total pattern length + number of matches, no rescanning from each position), while another suggests an n-gram/inverted-index approach closer to how Lucene handles this kind of lookup.",
    optimalAnswer: {
      clarifyingQuestions: [
        "How large is the bad-expression list, and how often does it change (a stable moderation list vs. one updated throughout the day)?",
        "Does matching need to be case-insensitive, or tolerant of punctuation/spacing variants and simple leetspeak substitutions?",
        "Is this check a synchronous gate before a tweet is allowed to post, or an asynchronous scan run after posting?",
        "Multi-word bad expressions like \"this has\" — do they need to match across arbitrary whitespace, or only that literal substring?",
      ],
      requirements: [
        "Preprocess a list of bad expressions once, ahead of any tweet arriving",
        "Given an arbitrary tweet string, return every bad expression it contains (including overlapping matches, as the example shows with both \"this has\" and \"is has\" found in the same span)",
        "Must not degrade as the bad-expression list grows — an approach that's fine for a handful of patterns has to still hold up for a moderation list with thousands of entries",
        "Cheap enough per tweet to sit inline on the post path at Twitter's write volume, not just correct in isolation",
      ],
      approach:
        "This is a classic multi-pattern string-matching problem wearing a content-moderation costume. The candidate's Trie was the right data structure but the wrong algorithm around it — walking the trie fresh from every character position in the tweet is still quadratic-ish (O(m·N)). The fix is Aho-Corasick: build one automaton from all the bad expressions with failure links, then make a single linear pass over the tweet that never backtracks.",
      keyPoints: [
        "Build an Aho-Corasick automaton from the bad-expression list once, offline: a trie of all patterns, plus a failure link on every node pointing to the longest proper suffix of that node's path that's also a prefix in the trie (exactly like the KMP failure function, generalized to many patterns at once)",
        "To scan a tweet, walk the automaton one character at a time; on a mismatch, follow the failure link instead of restarting from the trie root — this is what turns the candidate's O(m·N) rescan into a single O(N) pass regardless of how many bad expressions there are",
        "At every node visited, follow \"dictionary suffix links\" to report every bad expression that ends at the current position — this is what correctly surfaces overlapping matches like \"this has\" and \"is has\" both ending inside the same substring",
        "Normalize the tweet (case-folding, whitespace collapsing) before matching so \"This Has\" and \"this   has\" both hit the same automaton path, rather than baking normalization into the pattern set itself",
        "Multi-word bad expressions are handled the same way as single words once the tweet is normalized to a plain character stream — the automaton doesn't need to special-case phrase boundaries",
        "Rebuild (or incrementally patch) the automaton only when the bad-expression list itself changes, not per tweet — the expensive part (failure-link construction) is fully amortized across every tweet checked against that list",
      ],
      tradeoffs: [
        "Aho-Corasick automaton vs. the candidate's plain Trie-plus-rescan — both preprocess the same pattern set into a trie, but only Aho-Corasick's failure links avoid re-walking from the root on every mismatch; for a large bad-expression list scanned against high tweet volume, that difference is the whole ballgame",
        "A precompiled automaton walked once per tweet vs. an n-gram/inverted-index (Lucene-style) approach floated in the discussion — an inverted index is built for searching a large, mostly-static corpus for a query; here the corpus is a single incoming tweet and the \"query\" is the whole bad-expression set, which is the reverse access pattern, so a precompiled matcher walked once per tweet fits better",
        "Synchronous gate before posting vs. asynchronous scan after posting — synchronous guarantees flagged content never goes live but adds latency to every tweet, even the overwhelming majority with no violations; async lets posting stay fast but needs a takedown/notification path for anything caught after the fact",
      ],
      followUps: [
        "How would you support fuzzy or leetspeak variants (\"fr4nk\" for \"frank\") without the pattern set (and automaton) exploding combinatorially?",
        "How do you update the automaton when the bad-expression list changes without a full rebuild blocking traffic?",
        "How would this fit into a broader trust-and-safety pipeline that also has to moderate images and video, not just tweet text?",
      ],
      relatedLinks: [
        { label: "Foundations: Database Indexing Deep Dive", href: "/foundations/database-indexing-deep-dive" },
        { label: "Foundations: Rate Limiting", href: "/foundations/rate-limiting" },
      ],
    },
  },
];
