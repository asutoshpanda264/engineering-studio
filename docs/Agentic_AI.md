# Agentic_AI.md

## Pillar A of `Expansion_TODO.md`, expanded into a real plan

This is the deep-dive roadmap for **Agentic AI system design** — the first
pillar picked up from `Expansion_TODO.md`. It's grounded in research on what
the industry is actually building and testing for as of August 2026 (sources
at the bottom), translated into concrete additions to this codebase's
existing simulation engine.

**Status: ✅ Pillar A complete.** All six phases below shipped — every
entity, failure mode, metric, the trace panel, the pass^k reliability
score, all five scenarios, and the full five-category content track (20
lessons total: 4 fundamentals + 6 patterns + 3 protocols-and-infra + 4
inference-and-serving + 3 production). See `Expansion_TODO.md`'s status
table.

---

## Part 1 — What's actually happening in the industry (research summary)

### 1.1 Six canonical design patterns, not a zoo of frameworks

Despite dozens of frameworks, the field has converged on a small pattern
vocabulary that every framework is really just scaffolding around:
**Reflection, Tool Use, Planning, Multi-Agent Collaboration,
Orchestrator-Worker, and Evaluator-Optimizer.** In 2026, "AI system design
interviews won't be about RAG — they test the ability to build robust agents
using orchestrators and secure tool gateways. Designing agent control flow
is now the highest-leverage skill in AI engineering." The orchestrator-worker
pattern specifically earns its keep only when subtasks are heterogeneous and
parallel latency reduction justifies concurrent-call cost — it's explicitly
called out as *overkill for linear, dependent workflows*, which is exactly
the kind of trade-off judgment this product already trains for with load
balancers and caches.

### 1.2 Two protocols now own the wire format

**MCP (Model Context Protocol)**, created by Anthropic, was donated to the
Linux Foundation's new Agentic AI Foundation in December 2025 and has
"effectively won the agent-to-tool layer" — 110M+ monthly downloads, adopted
by Anthropic, OpenAI, Google, and Microsoft. **A2A (Agent2Agent)**, Google's
protocol for agent-to-agent communication, hit v1.0 in early 2026 and has
150+ organizations in production (AWS, Microsoft, Salesforce, SAP, IBM,
ServiceNow). The mental model that stuck: **MCP is USB-C for tools
(vertical, agent→tool); A2A is HTTP for agent collaboration (horizontal,
agent→agent).** Production systems combine both — A2A routes a task to the
right specialist agent, MCP gives that agent its context and tools.

### 1.3 The framework landscape (for our own research grounding, not to embed)

LangGraph has the largest production footprint for enterprise multi-agent
systems (max control, steepest learning curve). CrewAI wins on
prototype-to-demo speed but trails on production observability/error
recovery. Microsoft merged Semantic Kernel + AutoGen into **Microsoft Agent
Framework 1.0** (session state, type safety, telemetry + multi-agent
orchestration in one SDK). Anthropic ships the **Claude Agent SDK**; OpenAI
ships the **Agents SDK**; Google ships **ADK**. We aren't building on top of
any of these — the point is this product *models the concepts these
frameworks all converge on*, the same way the existing workshop teaches load
balancing without embedding nginx.

### 1.4 Context engineering has replaced prompt engineering as the discipline

"Context engineering answers: what does the agent know, see, and remember at
the moment of action?" Its four pillars are **instructions, retrieval,
memory, and tools**. Memory splits into **short-term** (the conversation +
tool history living in the context window) and **long-term** (persists
across sessions — preferences, project conventions, summaries). Production
systems run a **compaction** step once the window fills — either
summarization, or Anthropic's own documented pattern: the model writes a
structured scratchpad to a file outside the context window and re-reads it
later. Context that isn't managed doesn't error — it silently **rots**:
attention to relevant information degrades as irrelevant tokens accumulate.

### 1.5 RAG fractured into three architectures pretending to be one

**Pipeline RAG** (embed → top-k → generate) is the 2023-era baseline.
**Agentic RAG** turns retrieval into a loop — the system decides *whether*
to retrieve, *what* to retrieve, and *when* to stop, critiquing and
re-retrieving until confident or budget-exhausted (real risk: without
redundancy this "self-corrects into a more elaborate hallucination").
**GraphRAG** extracts entities/relationships into a knowledge graph and
retrieves via graph traversal — wins specifically on relationship queries
(compliance analysis, research synthesis) that chunk-similarity search
can't answer. The 2026 best practice is **Adaptive RAG**: a query-complexity
classifier routes each query to the cheapest pipeline that can answer it.

### 1.6 Observability converged on one vendor-neutral vocabulary

The **OpenTelemetry GenAI semantic conventions** now define the standard
`gen_ai.*` span attributes that Datadog, Arize, and LangSmith all adopted:
`gen_ai.operation.name` (`chat` / `invoke_agent` / `execute_tool`),
`gen_ai.provider.name`, `gen_ai.usage.input_tokens` /
`gen_ai.usage.output_tokens`, `gen_ai.tool.name`, `gen_ai.tool.call.arguments`,
plus MCP-specific attributes (`mcp.method.name`, `mcp.session.id`) when a
tool call crosses MCP. A full agent trace nests as spans: one
`invoke_agent` root, with `chat` spans (model decides an action) and
`execute_tool`/`tools/call` spans as children, all sharing one `trace_id`.
Agent failures often look like *success* in a trace — well-formed, wrong —
which is why the full reasoning chain has to be inspectable, not just a
status code.

### 1.7 A well-documented taxonomy of how agents actually fail

Ten distinct, named failure modes recur across production postmortems, each
with a cause, an observable signal, and a mitigation:

| # | Failure mode | Cause | Mitigation |
|---|---|---|---|
| 1 | Schema violation | Tool call args wrong type/shape | Pre-dispatch schema validation |
| 2 | Hallucinated tool invocation | Agent calls a tool not in its registered set (3–15% of prod tool calls) | Structured-output enforcement, pre-dispatch validation |
| 3 | Context window truncation/rot | Long history pushes tools/results past attention range | Bounded steps, explicit token budgeting, compaction |
| 4 | Silent failure | Tool returns 200 with empty/malformed payload, no error surfaces | Explicit return-object validation, propagation guards |
| 5 | Infinite retry loop | Failed call retried identically, no repeat-failure recognition | Hard iteration limits, output-similarity loop detection |
| 6 | Agent paralysis | Contradictory signals, no action satisfies success criteria | Defined exit conditions + escalation path |
| 7 | Error propagation / cascade | One agent's hallucinated output trusted as fact downstream | Verification checks before forwarding between agents |
| 8 | Context/spec drift | Over long sessions, original constraints deprioritized, no exception fires | Evaluate output against *original* intent, not status codes |
| 9 | Direct prompt injection | Attacker-controlled input overwrites instructions | Runtime output-verification gate vs. original task spec |
| 10 | Indirect prompt injection | Malicious instructions embedded in retrieved/tool content | Trust boundaries, human-in-loop before irreversible actions |

Industry estimates put real-world agent failure rates at **70–95%** depending
on task complexity — this is not an edge case to footnote, it's the median
experience, and OWASP has ranked prompt injection the #1 LLM risk for three
years running with no solved defense, only *containment* (least privilege:
"an agent that cannot call a payment tool cannot be tricked into a
fraudulent payment").

### 1.8 Evaluation shifted from "did it work once" to reliability

**SWE-bench Verified** (500 engineer-reviewed real GitHub issues) and
**τ-bench / τ²-bench** (tool-using agent vs. simulated user, must follow
domain policy) are the reference benchmarks. τ-bench's headline metric is
**pass^k**: does the agent solve the *same* task on *every one* of k tries —
reliability, not luck. Execution-based verification (run the test suite,
check the database's actual end state) beats judge-based scoring. The
sobering production numbers: a **37% gap** between lab benchmark scores and
real deployment performance, and **50x cost variation for similar accuracy**
across otherwise-comparable agents. "Reliability is the headline metric —
single-run accuracy has saturated its information value."

### 1.9 Case study: how Claude Code composes all of the above

Claude Code's own documented design is a genuinely good worked example of
these ideas composed for real: **deny-first with human escalation**,
**graduated trust spectrum**, **defense in depth** (layered mechanisms, not
one gate), and **reversibility-weighted risk assessment** (an irreversible
action gets a harder gate than a reversible one). Critically: "because
reasoning and enforcement occupy separate code paths, a compromised model
cannot override sandboxing rules — the model's only interface to the outside
world is the structured tool-call protocol, which the harness validates
before execution." That's guardrails-as-architecture, not
guardrails-as-prompt — worth teaching as its own lesson.

### 1.10 SLMs, edge deployment, and the cascade pattern

Small Language Models (roughly 0.5B–14B parameters) aren't "worse LLMs" —
they're a different design philosophy: data quality and architectural
efficiency over raw parameter count, purpose-built to run on consumer
hardware, mobile NPUs, and edge SoCs rather than datacenter GPU clusters.
The 2026 rule of thumb is **90/10**: an SLM delivers ~90% of LLM
functionality at ~10% of the cost. Rather than picking one, most 2026
production architectures run **both**, cascaded: an SLM handles the routine
majority of requests and escalates only the hardest cases to a frontier
LLM — the same shape as this product's existing `CircuitBreaker`/
`RateLimiter` "cheap fast path, expensive fallback" pattern, just applied to
model choice instead of infrastructure. On-device inference lands
**sub-20ms** token generation vs. **200–500ms** for a cloud round-trip —
the single clearest number for teaching *why* edge deployment is worth the
capability ceiling it imposes (7B–13B params is the current "Goldilocks
zone" edge NPUs can actually hold).

### 1.11 Quantization: the memory/latency/accuracy dial

Quantization compresses model weights (and sometimes activations) to lower
precision. **FP8/INT8 is production-ready today** — roughly 4x memory
reduction with minimal accuracy loss, and is the recommended first thing to
reach for. **INT4/NF4** pushes to ~8x memory reduction and is "acceptable
for most use cases" but starts to bite — measured accuracy drops in edge
deployments range from -0.6% up to -6.2% depending on model and technique.
Two dominant post-training algorithms trade off differently: **GPTQ**
(minimizes per-layer reconstruction error, 3.25–4.5x speedup on NVIDIA
GPUs) vs. **AWQ** (protects the ~1% of "salient" weight channels identified
by activation statistics before quantizing the rest uniformly) — GPTQ edges
out AWQ on some real-world tasks despite AWQ's typically-better academic
benchmark scores, i.e. **there is no strictly-dominant choice, only a
trade-off surface** — exactly the shape this product already teaches with
load-balancing algorithms. **Quantization-aware training (QAT)** bakes
low-precision behavior in during training and generally beats
post-training quantization, at the cost of needing to retrain at all.
Quantization **compounds** with the serving optimizations in §1.12 rather
than substituting for them.

### 1.12 Inference serving mechanics — why `llm_call` latency isn't just a number

Production LLM serving in 2026 rests on three techniques worth naming
explicitly, because together they explain *why* a real `llm_call`'s latency
depends on concurrent load the same way this product's `BoundedProcessor`
already models bounded-concurrency queueing for `APIServer`/`Database`:

- **PagedAttention** removes the requirement that one request's KV cache
  sit in contiguous memory, scattering it across pages instead — a small
  per-token compute tax (~2–5%) buys dramatic memory utilization (95%+)
  and is what makes serving many concurrent requests off one model
  copy possible at all.
- **Continuous batching** schedules at the *iteration* level, not the
  *batch* level — a finished request's slot is immediately backfilled by a
  new one instead of sitting idle until the whole batch completes. This is
  the direct reason inference throughput scales sub-linearly with
  concurrent requests rather than linearly.
- **Speculative decoding** uses a cheap draft model to propose several
  tokens at once, which the real (target) model verifies in parallel — free
  latency reduction when the draft's guesses are usually right, wasted
  compute when they aren't.

Real numbers at scale: 128+ concurrent requests combining all three on an
H100 delivers 2,200–2,400 tok/s for a 70B model at FP8 — roughly 3-4x a
naive unbatched implementation. The takeaway for entity design: **`llm_call`
latency should be a function of concurrent load, not a flat config value**
— which this codebase already has the exact mechanism for
(`BoundedProcessor`'s admit→queue→reject shape).

### 1.13 Caching and cost economics

Two caching layers do very different jobs and are frequently confused:
**prompt caching** (OpenAI/Anthropic-style — the provider caches a
previously-seen prompt prefix server-side and bills the cached portion at
~1/10th price; it reduces the cost of a call that still happens) vs.
**semantic caching** (a similarity-matched response is served for a
semantically-equivalent query, skipping the model call entirely — production
deployments report 20–45% hit rates; one documented case cut a support
bot's bill 76%, $10,000/mo → $2,361/mo, at 95% cache hit rate). **Model
routing/cascading** (§1.10, formalized as e.g. RouteLLM) achieves roughly
95% of frontier-model quality at a 75–85% cost cut by escalating only
low-confidence responses. And the baseline keeps moving regardless of any
of this: frontier-equivalent inference cost has fallen **~1,000x in three
years** ($20/M tokens late-2022 → ~$0.40/M tokens in 2026), open-weight
hosted APIs now run $0.07–$0.90/M tokens, and **output tokens cost 3–8x
input tokens** — a detail worth making visible in any cost metric, since it
means an agent that reasons verbosely (long chain-of-thought output) pays a
structurally different price than one that reads a lot of context and
answers briefly.

---

## Part 2 — Translating this into the product

### 2.1 The core design decision: composition, not an entity zoo

The existing workshop doesn't have a "load-balanced cluster" entity — it has
Load Balancer + N API Servers the user wires together, and the *pattern*
emerges from composition. Agentic AI gets the same treatment: **the six
canonical patterns are not six entity types.** They're canvas topologies
built from a small set of primitives, taught as paired lesson + build
challenge (same shape as Pillar B's LLD case studies):

| Primitive entity | Role |
|---|---|
| `llm_call` | The reasoning/generation step — **policy-bearing** (§2.7). Maps to a `gen_ai chat` span. |
| `tool_call` | An external action (function/API/MCP tool). Maps to `execute_tool`. |
| `agent_orchestrator` | Routes, plans, loops; owns the iteration cap. Maps to `invoke_agent`. |
| `retriever` | Knowledge lookup — **policy-bearing** (§2.2). |
| `memory_context_store` | The context window — **policy-bearing** (§2.2). |
| `guardrail_validator` | Inline check/scorer; doubles as the "Evaluator" primitive. |
| `human_in_loop_gate` | Approval branch + latency injection before an irreversible action. |
| `model_router` | Routes each request to an `llm_call` by tier — **policy-bearing** (§2.8). |

How the six patterns fall out of composition:

- **Tool Use** — `llm_call` → `tool_call` directly.
- **Planning** — `agent_orchestrator` emits an ordered sequence of subtask
  events to downstream `llm_call`/`tool_call` nodes.
- **Reflection** — `llm_call` → `guardrail_validator` with an edge back into
  the same `llm_call` (self-critique loop, bounded by the orchestrator's
  iteration cap so it's the natural place to *teach* failure mode #5).
- **Orchestrator-Worker** — one `agent_orchestrator` fanning out to N
  heterogeneous `llm_call`/`tool_call` workers in parallel, synthesizing
  results back.
- **Evaluator-Optimizer** — `llm_call` → `guardrail_validator` (as scorer,
  not gate) → loop back with feedback until score threshold or cap.
- **Multi-Agent Collaboration** — 2+ `agent_orchestrator` nodes exchanging
  A2A-shaped messages as peers, not through a shared parent.

### 2.2 Policy-bearing entities need real algorithm choices — not a default

Per the standing product principle from `[[feedback_entity_algorithm_diversity]]`
(load balancer, cache, etc. must offer multiple selectable algorithms with
visible comparison evidence, not one hardcoded behavior), several of the new
primitives are explicitly policy-bearing and get the same treatment as
Load Balancer's round-robin/least-connections split — `retriever` and
`memory_context_store` here; `llm_call`'s tier/quantization/deployment dials
(§2.7) and `model_router`'s cascade modes (§2.8) follow the same rule and
are detailed later once the inference-substrate research (§1.10–§1.13) that
motivates them has been introduced:

- **`retriever`** — selectable mode: *Pipeline* (single-shot top-k),
  *Agentic* (iterative retrieve-critique-reretrieve loop, budget-bounded),
  *GraphRAG* (entity/relationship traversal), *Adaptive* (complexity router
  picks one of the above per query). Each has different latency/cost/
  accuracy characteristics — surfaced via a comparison panel, same idea as
  the CDN "why this helps" latency-bar comparison already built
  (`compareArchitectures.ts`), re-run the same seed with each mode spliced
  in.
- **`memory_context_store`** — selectable compaction policy: *None*
  (truncate oldest — the deliberate "watch context rot happen" option),
  *Summarization*, *Scratchpad/file* (Anthropic's documented pattern). The
  comparison view: same long session, three compaction policies, watch
  when/whether attention-relevant info survives to the final turn.

### 2.3 Failure injection = the 10-item taxonomy from §1.7, directly

Every villain attack in this domain's catalog is one of the ten documented
failure modes, not an invented one — this is what makes "break it" here as
legitimate as timing out a database:

`schema_violation`, `hallucinated_tool_call`, `context_truncation`,
`silent_tool_failure`, `infinite_retry_loop`, `agent_paralysis`,
`error_cascade`, `context_drift`, `direct_prompt_injection`,
`indirect_prompt_injection`.

Each attack targets a specific primitive/config: e.g. `infinite_retry_loop`
requires an `agent_orchestrator` with no iteration cap; `context_truncation`
requires a `memory_context_store` on the "None" compaction policy past
capacity; `indirect_prompt_injection` requires a `retriever` or `tool_call`
whose output isn't passed through a `guardrail_validator` before reaching
an `llm_call`.

### 2.4 The trace panel: real vocabulary, not invented UI

The existing Inspector/event-log/playback UI is already generic over
entity type and needs no new mechanism — just new formatting. Render each
simulated event using the actual OpenTelemetry GenAI attribute names from
§1.6 (`gen_ai.operation.name`, `gen_ai.usage.input_tokens`,
`gen_ai.tool.name`, nested under one `invoke_agent` root, one `trace_id`
per run). The user reading their own architecture's playback is reading the
same shape of trace they'd see in Datadog/Arize/LangSmith in a real job —
cheap to build (it's a formatter, not a new panel), and it's the clearest
"actually useful, not resume-fodder" win in this pillar.

### 2.5 Metrics: cost, loop count, and a signature reliability score

Beyond the existing latency/throughput: **cost** (token-based, $), **loop/
iteration count** (surfaces failure mode #5/#6 directly in the metrics
panel), **guardrail rejection rate**. The headline addition: because the
engine is already seeded/deterministic (`RNG.ts`), we can **re-run the same
architecture across N seeds and report the fraction that reach a successful
terminal state** — a direct, honest implementation of τ-bench's **pass^k**
reliability metric, something a static reading track structurally cannot
offer. This is this pillar's one genuinely novel contribution beyond
"translate an existing idea into our engine."

### 2.6 What stays simulated, deliberately

No live model calls, no real MCP/A2A wire traffic. `llm_call` and
`tool_call` behavior are configurable synthetic distributions (latency,
cost, hallucination rate, schema-failure rate) — model tier, quantization,
and deployment target (§2.7) are additional *inputs* to that same
distribution, not a real inference stack — exactly like `Database`'s
processing-time config today — this is what keeps simulation instant
(<100ms) and deterministic, which is the whole reason this product can do
scrubbable playback at all. MCP/A2A are taught as *content* (what the
protocols are, why they exist, the vocabulary) and *shape the entity
config* (a `tool_call` node can be flagged "via MCP" and gets
`mcp.method.name`-shaped trace attributes) without requiring an actual
protocol implementation.

### 2.7 `llm_call` becomes a third policy-bearing entity: tier, quantization, deployment target

The research in §1.10–§1.12 isn't just flavor text — it's three more real,
comparison-worthy config dials on `llm_call`, same treatment as `retriever`
and `memory_context_store` in §2.2:

- **Model tier** — *SLM* vs. *LLM*: shifts the whole latency/cost/accuracy
  distribution at once (fast/cheap/lower-quality vs. slow/expensive/higher-
  quality), and is what makes a `model_router` (§2.8) meaningful to build at
  all.
- **Quantization** — *None (BF16)* / *FP8* / *INT8* / *INT4*: a genuine
  three-way trade-off (memory & cost down, latency down, accuracy-risk up)
  rather than a single "fast mode" toggle — surfaced the same way as the
  retriever's comparison panel, so the user can *see* the accuracy cost of
  going to INT4, not just take it on faith.
- **Deployment target** — *Cloud* vs. *Edge*: edge caps which model tier is
  even selectable (edge + LLM is disabled — the Goldilocks-zone constraint
  from §1.10 modeled as a real config restriction, not just a lesson claim)
  but removes network round-trip latency entirely. This is the dial that
  makes the sub-20ms-vs-200ms number in §1.10 something the user measures
  themselves instead of reads.

`llm_call`'s latency should also scale with concurrent load per §1.12,
reusing `BoundedProcessor`'s existing admit→queue→reject shape rather than
inventing new queueing logic.

### 2.8 New primitive: `model_router` — the SLM/LLM cascade

A genuinely new addition to the primitive table in §2.1, and the fourth
policy-bearing entity: routes each request to an `llm_call` node based on
selectable mode — *Always-LLM*, *Always-SLM*, *Confidence-cascade* (escalate
to LLM only below a confidence threshold), *Cost-optimized-cascade*
(escalate only when the SLM's own uncertainty signal crosses a budget-aware
threshold). This is where §1.10's 90/10 rule and §1.13's "~95% frontier
quality at 75–85% cost cut" claims stop being trivia and become something
the comparison panel can actually demonstrate — same re-run-with-a-node-
swapped mechanism as `compareArchitectures.ts` already provides for CDN.

### 2.9 Caching composes with existing infrastructure — no new cache entity

Per §1.13's prompt-caching-vs-semantic-caching distinction: **semantic
caching is cache-aside in front of an `llm_call`**, i.e. the existing
`Cache`/`CacheStore` entities (LRU/LFU/FIFO/MRU, already built) wired
upstream of an `llm_call` node, just with a "hit" defined as
similarity-above-threshold instead of exact key match — a config flag on
`Cache`, not a new entity. **Prompt caching** is simpler still: a discount
multiplier on `llm_call`'s own cost function when consecutive requests
through the same node share a prefix (modeled as a cache-hit-rate config on
`llm_call` itself, mirroring the ~1/10th-price discount from §1.13). Net
new surface area: zero new entity types, one new `Cache` config flag, one
new `llm_call` config value.

---

## Part 3 — Content track

Mirrors `/lld`'s existing shape (`types.ts` + `index.ts` +
`lessons/NN-slug.ts`, reusing `LessonSection`/`LessonExercise` from
`src/content/shared/lesson.ts`), with four categories instead of three
(protocols/infra is its own real body of knowledge here):

- **fundamentals** — what is an agent; the LLM call as a primitive;
  ReAct/Tool Use; context engineering's four pillars; memory (short vs.
  long-term, compaction).
- **patterns** — the six canonical patterns (§2.1), each paired with a
  build-this-topology challenge on canvas.
- **protocols-and-infra** — MCP, A2A, RAG's three architectures + Adaptive
  routing, OpenTelemetry GenAI tracing.
- **inference-and-serving** — SLMs vs. LLMs and the cascade pattern (§1.10),
  quantization as a trade-off surface not a toggle (§1.11), why latency
  depends on concurrent load — KV cache, continuous batching, speculative
  decoding (§1.12), prompt vs. semantic caching and the token-cost economics
  behind `model_router` (§1.13/§2.8) — each paired with the matching
  `llm_call`/`model_router`/`Cache` config from Part 2.
- **production** — the ten-item failure taxonomy (§1.7/§2.3), guardrails as
  architecture (§1.9, Claude Code case study), evaluation & reliability
  economics (SWE-bench/τ-bench, pass^k, the 37% lab-to-prod gap and 50x cost
  variance — teaching *why* the reliability metric in §2.5 matters, not just
  that it exists).

---

## Part 4 — Scenarios

Mirrors `src/scenarios/`'s shape (constraints + validator):

1. **Customer-support agent** — τ-bench-shaped: policy-following +
   `tool_call` use, validator checks the agent didn't violate a stated
   policy (e.g. never issue a refund over $X without `human_in_loop_gate`).
2. **Coding agent** — Claude-Code-shaped: sandboxed `tool_call` loop,
   deny-first config, reversibility-weighted gating exercised directly via
   `human_in_loop_gate` before a destructive tool call.
3. **Research assistant** — `retriever` mode choice is the whole point;
   validator/comparison shows GraphRAG winning specifically on a
   relationship-query task Pipeline RAG can't answer.
4. **Autonomous ops agent** — Orchestrator-Worker + Multi-Agent
   Collaboration, `human_in_loop_gate` required before any irreversible
   production action; villain attack: error cascade from an unverified
   worker result.
5. **Cost-constrained edge assistant** — validator sets a $/1000-requests
   budget and a quality floor; the only way to hit both is composing
   `model_router` (SLM-first cascade), quantization, edge deployment, and a
   semantic `Cache` in front of `llm_call` — the direct payoff of §2.7–§2.9,
   and the scenario where "why would I ever accept lower precision" gets a
   concrete, measured answer instead of a lesson's word for it.

---

## Part 5 — Phased roadmap (all ✅ shipped)

Each phase should independently pass `tsc`/`vitest`/`lint` and be a
shippable slice, per this repo's normal workflow (batch UI/CSS checks into
`docs/BROWSER-CHECKS.md` and verify in one browser session per `AGENTS.md`).

**Phase 0 — Content skeleton, no engine changes.**
`src/content/agentic/{types.ts,index.ts,lessons/}` scaffolded; first
fundamentals lessons written (what is an agent, LLM call as primitive,
ReAct, MCP/A2A overview). Ships value with zero simulation-engine risk.

**Phase 1 — Core primitives on canvas.**
`llm_call` + `tool_call` added to `EntityType`, implemented as `Entity`
subclasses, registered in `entityCatalog.ts`, node visuals added, Inspector
config (latency distribution, cost, hallucination/schema-failure rate, plus
`llm_call`'s tier/quantization/deployment-target dials from §2.7, with
latency scaling by concurrent load via `BoundedProcessor`). *Acceptance:*
build "LLM calls a tool," run it, see a cost readout in playback, and see
that readout change when quantization or model tier changes — no
orchestrator yet.

**Phase 2 — Orchestration and the six patterns.**
`agent_orchestrator` (iteration cap, routing config) lands; content pairs
each of the six §2.1 patterns with a build-this-topology challenge.
*Acceptance:* all six patterns are buildable and demonstrably distinct in
their event traces.

**Phase 3 — Memory, retrieval, evaluator-optimizer.**
`memory_context_store` and `retriever`, both policy-bearing per §2.2 with
comparison panels; `guardrail_validator` completes Evaluator-Optimizer and
unblocks Multi-Agent Collaboration (2+ orchestrators).

**Phase 3.5 — Model routing and caching economics.**
`model_router` (§2.8) as the fourth policy-bearing entity, with a
comparison panel against always-LLM; semantic-cache config flag added to
existing `Cache`/`CacheStore` and prompt-cache discount added to `llm_call`
(§2.9) — no new entity types, config + one comparison view only.

**Phase 4 — Failure catalog and the trace panel.**
All ten §1.7 villain attacks implemented; `human_in_loop_gate` added; the
OTel-shaped trace formatter (§2.4) replaces the generic event log for this
domain's playback view, extended to show `gen_ai.request.model`,
quantization tier, and cache-hit outcome per span.

**Phase 5 — Metrics and the reliability score.**
Cost, iteration count, guardrail rejection rate added to
`MetricsSnapshot`; the pass^k-style multi-seed reliability run (§2.5) built
alongside/reusing `compareArchitectures.ts`'s "re-run and compare" shape.

**Phase 6 — Scenarios.**
The five Part 4 scenarios, each with a validator, following
`src/scenarios/`'s existing pattern.

---

## To check

Manual verification pass (2026-08-23): for each of the 8 agentic entities,
run its `/tutorial` recipe end-to-end (add → connect → select → read
config → run → read results → complete) and confirm the simulation
produces a sane, entity-specific result — not just "doesn't crash."
Started via browser automation; the session dropped mid-way through the
last entity. Verified so far (all passed — see git history/session notes
for the actual numbers, not reproduced here since a fresh run will differ):

- [x] `llm_call` — client → llm_call
- [x] `tool_call` — client → llm_call → tool_call
- [x] `agent_orchestrator` — client → agent_orchestrator → llm_call
- [x] `memory_context_store` — client → llm_call → memory_context_store
- [x] `retriever` — client → retriever → llm_call
- [x] `guardrail_validator` — client → llm_call → guardrail_validator (also
      surfaces its own "Guardrail Rejections %" stat — confirm that's
      still there)
- [x] `model_router` — client → model_router → llm_call (also confirm the
      leftover client→llm_call shortcut edge gets flagged and removed
      before results, per tutorialPlanner.ts's step 3)
- [x] `human_in_loop_gate` — client → llm_call → tool_call →
      human_in_loop_gate. Built end-to-end (2026-08-23): all four connect
      steps, config panel read (approval latency 4000ms, jitter 1500ms,
      denial rate 10%, max concurrent 5, max queue length 30), ran, and
      the guide reached "You've built Human-in-the-Loop Gate." Results
      were sane and entity-specific: an "approve" span in the trace at
      ~5480ms (matching the 4000ms+jitter config), heavy backpressure on
      the gate (queue length 29/30, 126 errors, 89–97% utilization across
      the run) cascading into a low overall success rate — a genuine
      bottleneck behavior, not a crash. The OTel-shaped trace panel
      (§2.4) rendered correctly: nested `invoke_agent` → `chat` /
      `execute_tool` / `approve` spans with real `gen_ai.*` attributes
      (`gen_ai.operation.name`, `gen_ai.provider.name`,
      `gen_ai.request.model`, `gen_ai.tool.name`, plus `llm.tier`/
      `llm.quantization`).

Both side items below were confirmed as real (not intentional) during
this pass — see git history for whether/how they were fixed:

- [x] `/tutorial`'s target picker (`TutorialPanel.tsx`) doesn't separate
      the 8 agentic entities into their own "Agentic AI" group the way
      `ComponentSidebar.tsx`'s catalog list does — confirmed live: they
      show up folded into the plain "Modules" list, unlabeled, while
      still being fully clickable/functional (this is how all 8 agentic
      tutorials, including human_in_loop_gate above, were reached).
      **Conclusion: a missed `domain` filter, not intentional** — the
      tutorial planner comment's "not currently a guided-tour target"
      describes there being no *curated* walkthrough (unlike Core Flow),
      not that the picker should hide these entries. `ComponentSidebar`
      already has the `domain === "agentic"` split to copy.
- [x] Switching the tutorial's target while a stale `simulationResult`
      exists from a previous target/architecture — confirmed live:
      chose "Retriever" right after finishing human_in_loop_gate (still
      showing that run's numbers), then deleted Tool Call, deleted
      Human-in-the-Loop Gate, and added Retriever — a completely
      different, never-run architecture. Through all of it the metrics
      footer (Requests 195, Success Rate 20.0%, Avg Latency 18367.6ms,
      Trace (15)) stayed frozen on the *old* human_in_loop_gate run;
      only "Est. Monthly Cost" updated live (it's derived from static
      config, not the simulation result). **Conclusion: real staleness
      bug** — `simulationResult` isn't invalidated on target switch or
      on node/edge-set changes, so a user can read stale numbers as if
      they belonged to the architecture currently on screen.

---

## Sources

- [Agentic Design Patterns: The 2026 Guide](https://www.sitepoint.com/the-definitive-guide-to-agentic-design-patterns-in-2026/)
- [The Complete Agentic AI System Design Interview Guide 2026](https://atul4u.medium.com/the-complete-agentic-ai-system-design-interview-guide-2026-f95d0cfeb7cf)
- [Agentic AI System Design Interview: Orchestrators & Tool Gateways](https://www.coprep.ai/blog/agentic-ai-system-design-interview-orchestrators-tool-gateways)
- [MCP vs A2A: The Complete Guide to AI Agent Protocols in 2026](https://dev.to/pockit_tools/mcp-vs-a2a-the-complete-guide-to-ai-agent-protocols-in-2026-30li)
- [Agent Interoperability Protocols 2026: MCP, A2A, ACP and the Path to Convergence](https://zylos.ai/research/2026-03-26-agent-interoperability-protocols-mcp-a2a-acp-convergence/)
- [Google A2A Protocol in 2026: Adoption, Hype, and Reality](https://www.glukhov.org/ai-systems/comparisons/a2a-protocol-2026-adoption/)
- [LangGraph vs CrewAI vs AutoGen: 2026 Guide](https://dev.to/pockit_tools/langgraph-vs-crewai-vs-autogen-the-complete-multi-agent-ai-orchestration-guide-for-2026-2d63)
- [Best AI Agent Frameworks 2026: 7 Compared](https://alicelabs.ai/en/insights/best-ai-agent-frameworks-2026)
- [AI Agent Failure Modes: Tool-Calling Errors, Infinite Loops & Propagation](https://www.openlayer.com/blog/ai-agent-failure-modes-tool-calling-loops-propagation)
- [The Hitchhiker's Guide to Agentic AI: From Foundations to Systems (arXiv)](https://arxiv.org/pdf/2606.24937)
- [OpenTelemetry GenAI Semantic Conventions (Greptime)](https://greptime.com/blogs/2026-05-09-opentelemetry-genai-semantic-conventions)
- [Inside the LLM Call: GenAI Observability with OpenTelemetry](https://opentelemetry.io/blog/2026/genai-observability/)
- [Context Engineering: A Practical Guide for AI Agents (Sourcegraph)](https://sourcegraph.com/blog/context-engineering)
- [Context Engineering AI: How To Build Smarter LLM Agents In 2026 (mem0)](https://mem0.ai/blog/context-engineering-ai-agents-guide)
- [From context to dreams: architecting memory for AI agents (Red Hat)](https://next.redhat.com/2026/06/01/from-context-to-dreams-architecting-memory-for-ai-agents/)
- [Pipeline RAG vs Agentic RAG vs Knowledge Graph RAG](https://medium.com/@Micheal-Lanham/pipeline-rag-vs-agentic-rag-vs-knowledge-graph-rag-what-actually-works-and-when-47a26649a457)
- [Choosing the Right RAG Architecture in 2026](https://medium.com/@skyhawkbytecode/choosing-the-right-rag-architecture-in-2026-pipeline-agentic-or-knowledge-graph-d573f38171bd)
- [AI Agent Security in 2026: Guardrails, Permissions, Sandboxes, and MCP Threats](https://slavadubrov.github.io/blog/2026/04/20/ai-agent-security/)
- [Prompt Injection Defense for Production AI Agents: 2026 Guide](https://www.getmaxim.ai/articles/prompt-injection-defense-for-production-ai-agents-a-complete-2026-guide/)
- [The 2025 AI Agent Index (arXiv)](https://arxiv.org/pdf/2602.17753)
- [Claude Code vs Devin: AI Agent Compared 2026](https://www.lowcode.agency/blog/claude-code-vs-devin)
- [Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems (arXiv)](https://arxiv.org/html/2604.14228v1)
- [AI Agent Evaluation (2026): Metrics, Frameworks, and Production Failures](https://www.morphllm.com/ai-agent-evaluation)
- [τ-bench (tau-bench) Agent Evaluation Guide (2026)](https://qaskills.sh/blog/tau-bench-agent-evaluation-guide-2026)
- [AI Agent Benchmarking Infrastructure: SWE-bench, GAIA, Terminal-Bench, OSWorld](https://www.spheron.network/blog/ai-agent-benchmarking-gpu-cloud-swebench-gaia/)
- [Small Language Models on Edge Devices: 2.6B Outperforming 671B Models in 2026](https://renard-digital.fr/blog/en/small-language-models-edge-devices-2026/)
- [A Survey on Collaborative Mechanisms Between Large and Small Language Models (arXiv)](https://arxiv.org/pdf/2505.07460)
- [Small vs Large Language Models: The 2026 Reality Check](https://www.index.dev/blog/small-vs-large-language-models)
- [LLM Quantization for Production Inference (2026): INT8, FP8, AWQ, GGUF](https://appscale.blog/en/blog/llm-quantization-production-inference-int8-fp8-awq-gguf-2026)
- [Optimizing LLMs for Performance and Accuracy with Post-Training Quantization (NVIDIA)](https://developer.nvidia.com/blog/optimizing-llms-for-performance-and-accuracy-with-post-training-quantization/)
- [EdgeReasoning: Characterizing Reasoning LLM Deployment on Edge GPUs (arXiv)](https://arxiv.org/pdf/2511.01866)
- [LLM Serving Optimization: Continuous Batching, PagedAttention, Chunked Prefill on H100 (2026)](https://www.spheron.network/blog/llm-serving-optimization-continuous-batching-paged-attention/)
- [vLLM Explained: PagedAttention and Continuous Batching](https://www.runpod.io/articles/guides/vllm-pagedattention-continuous-batching)
- [LLM Caching Strategies: Prompt Caching, Semantic Caching, and When to Use Each](https://neuraltrust.ai/blog/llm-caching-strategies)
- [How to Cut LLM Token Costs in 2026: Routing, Caching, Compression, and the Right Model](https://wavect.io/blog/reduce-llm-token-costs-2026/)
- [LLM Cost Optimization in 2026: Routing, Caching, and Batching (Mavik Labs)](https://www.maviklabs.com/blog/llm-cost-optimization-2026)
- [Inference Unit Economics: The True Cost Per Million Tokens](https://introl.com/blog/inference-unit-economics-true-cost-per-million-tokens-guide)
- [AI Inference Economics: The 1,000× Cost Collapse Reshaping GPUs](https://www.gpunex.com/blog/ai-inference-economics-2026/)
- [On-Device AI Inference in 2026: Sub-20ms on Android, Real Benchmarks](https://www.alephzerolabs.com/blog/on-device-ai-2026-sub-20ms)
- [LLM Inference at the Edge: Mobile, NPU, and GPU Trade-offs Under Sustained Load (arXiv)](https://arxiv.org/html/2603.23640v1)
