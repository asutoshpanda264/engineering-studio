# ENGINEERING-DECISIONS.md

# Engineering Studio
## Architecture Decision Records (ADRs)

> Software architecture is the accumulation of engineering decisions.
>
> This document records the reasoning behind the most important decisions in Engineering Studio.
>
> Future contributors should understand **why** these decisions were made before attempting to change them.

---

# What is an ADR?

Every architecture contains trade-offs.

Many implementation choices appear obvious once the code exists.

They rarely are.

Architecture Decision Records preserve the reasoning behind important choices so that future engineers can understand:

- Why was this approach chosen?
- Which alternatives were considered?
- What trade-offs were accepted?
- Under what circumstances should this decision be revisited?

The goal is not to prevent change.

The goal is to make change intentional.

---

# ADR-001

## Simulation is Framework Independent

### Status

Accepted

---

### Context

The simulation engine performs the core reasoning of Engineering Studio.

React is responsible for rendering interfaces.

If simulation logic is embedded inside React components,

the engine becomes difficult to:

- test
- benchmark
- reuse
- debug
- evolve

---

### Decision

The simulation engine must contain zero React dependencies.

React visualizes simulation state.

It never computes simulation behavior.

---

### Consequences

Positive

✓ Unit tests become straightforward.

✓ The engine can execute inside Node.

✓ Future CLI support becomes possible.

✓ Simulation performance is independent of rendering.

Negative

✗ Requires an explicit bridge layer.

✗ Slightly more architectural complexity.

---

# ADR-002

## Simulation and Playback are Separate Systems

### Status

Accepted

---

### Context

Many visual simulators compute state while animations execute.

This tightly couples correctness to rendering speed.

Features such as

- pause
- replay
- seeking
- speed control

become difficult.

---

### Decision

The simulation computes an immutable event timeline.

Playback consumes this timeline independently.

The simulation finishes before playback begins.

---

### Consequences

Positive

✓ Replay becomes trivial.

✓ Playback speed becomes independent.

✓ Deterministic debugging.

✓ UI remains simple.

Negative

✗ Entire simulation history must be stored in memory.

---

# ADR-003

## Virtual Time Instead of Wall Clock Time

### Status

Accepted

---

### Context

Educational simulations should provide immediate feedback.

Waiting sixty seconds to simulate sixty seconds provides no educational value.

---

### Decision

The engine owns a virtual clock.

Time advances only when events occur.

---

### Consequences

Positive

✓ Extremely fast execution.

✓ Deterministic behavior.

✓ Browser-independent results.

Negative

✗ Real-world timing jitter is abstracted away.

---

# ADR-004

## Entities Own Behavior

### Status

Accepted

---

### Context

A simulator containing

if node.type == ...

for every infrastructure component quickly becomes difficult to extend.

---

### Decision

Infrastructure entities encapsulate their own behavior.

The simulation engine merely delivers events.

---

### Consequences

Positive

✓ Open for extension.

✓ Easier testing.

✓ Better separation of concerns.

Negative

✗ Slightly more upfront design.

---

# ADR-005

## Metrics are Derived, Not Updated

### Status

Accepted

---

### Context

Manually updating metrics introduces inconsistency.

Different parts of the system may disagree.

---

### Decision

Metrics emerge from simulation events.

Latency,

throughput,

utilization,

and failures are calculated from recorded history.

---

### Consequences

Positive

✓ Metrics remain internally consistent.

✓ Every number has evidence.

✓ Easier debugging.

Negative

✗ Slightly more computation after simulation.

---

# ADR-006

## Scenarios Begin With Business Problems

### Status

Accepted

---

### Context

Traditional tutorials introduce technologies.

"Today we learn Redis."

This encourages memorization.

---

### Decision

Every scenario begins with a business problem.

Technology appears only when users discover a need.

---

### Consequences

Positive

✓ Better intuition.

✓ Technology becomes purposeful.

✓ More engaging learning experience.

Negative

✗ Scenario design requires more effort.

---

# ADR-007

## Every Infrastructure Component Teaches One Idea

### Status

Accepted

---

### Context

Users should not leave remembering APIs.

They should remember engineering principles.

---

### Decision

Every entity has one Engineering Truth.

Examples

Cache

"I prevent repeated work."

Load Balancer

"I distribute work."

Database

"I remember."

---

### Consequences

Positive

✓ Better mental models.

✓ Easier learning.

✓ Consistent educational philosophy.

Negative

✗ Some implementation details are intentionally abstracted.

---

# ADR-008

## Animation Explains State

### Status

Accepted

---

### Context

Animations are often decorative.

Decorative animations increase cognitive load.

---

### Decision

Every animation must communicate state.

Movement exists only when something meaningful happened.

---

### Consequences

Positive

✓ Clearer understanding.

✓ Better accessibility.

✓ Reduced visual noise.

Negative

✗ Less visual freedom.

---

# ADR-009

## Business Constraints Drive Architecture

### Status

Accepted

---

### Context

There is no universally correct architecture.

Every solution depends on constraints.

---

### Decision

Users design systems around

- budget
- latency
- availability
- traffic
- scale

rather than technologies.

---

### Consequences

Positive

✓ Mirrors real engineering.

✓ Encourages trade-off thinking.

Negative

✗ Requires richer scenario design.

---

# ADR-010

## Simplicity Wins

### Status

Accepted

---

### Context

Engineering Studio will naturally grow.

Without discipline,

complexity will grow faster.

---

### Decision

Every new feature must answer one question.

Does this improve understanding?

If not,

it should not exist.

---

### Consequences

Positive

✓ Cleaner product.

✓ Easier maintenance.

✓ Better user experience.

Negative

✗ Interesting ideas may be postponed.

---

# Revisiting Decisions

Architecture evolves.

These decisions are not permanent.

An ADR should be revisited when:

- Requirements fundamentally change.
- A better design becomes available.
- Existing assumptions are no longer valid.

When changing an ADR,

never overwrite history.

Instead,

create a new decision explaining why the previous approach was replaced.

Engineering decisions should tell the story of how the project evolved.

---

# Closing Thoughts

The goal of Engineering Studio is not simply to build a simulator.

It is to demonstrate thoughtful engineering.

Every major architectural decision should be explainable.

If a future contributor asks,

> "Why is it built this way?"

the answer should already exist in this document.

Software changes.

Good engineering reasoning should remain understandable long after the implementation evolves.