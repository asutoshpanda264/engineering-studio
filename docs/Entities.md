# ENTITIES.md

# Engineering Studio Infrastructure Entities

> Infrastructure components are autonomous actors that cooperate through events to create the behavior of an entire distributed system.

---

# Philosophy

Engineering Studio does not simulate architectures.

It simulates interactions between infrastructure components.

Every node that users place onto the canvas represents an independent software entity.

Each entity owns:

- State
- Configuration
- Behavior
- Decision making
- Metrics

The simulator never contains infrastructure logic.

Instead,

the simulator simply delivers events.

Entities decide what those events mean.

This mirrors real distributed systems.

A database knows how databases behave.

A cache knows how caches behave.

A load balancer knows how load balancers behave.

The simulation engine merely coordinates communication.

---

# Universal Entity Model

Although every infrastructure component behaves differently,

they all follow the same conceptual lifecycle.

```

Configuration

↓

Receive Event

↓

Inspect Current State

↓

Make Decision

↓

Update Internal State

↓

Generate New Events

↓

Return Control

```

Because every entity follows this lifecycle,

new infrastructure components can be introduced without changing the simulator itself.

---

# Entity Responsibilities

Every entity should answer five questions.

## 1. What am I?

What infrastructure concept does this entity represent?

---

## 2. What do I know?

Internal state.

Examples

Connections

Queue length

Cache entries

Replica health

Current load

---

## 3. What can happen to me?

Incoming events.

Examples

Request arrived

Timeout

Failure

Retry

Cache lookup

Database query

---

## 4. What can I do?

Outgoing events.

Examples

Forward request

Reject request

Generate response

Retry later

Replicate data

---

## 5. What should users learn?

Every entity exists to teach an engineering concept.

Learning is the primary responsibility.

Simulation is the mechanism.

---

# Design Principles

Every entity should follow these rules.

---

## Single Responsibility

An entity should model exactly one infrastructure concept.

The database should not perform load balancing.

The cache should not perform routing.

Responsibilities should remain obvious.

---

## Local Knowledge

Entities only know what they reasonably could know.

A database does not know the state of a CDN.

A cache does not know the internal queue of another cache.

Communication occurs through events.

Never shared global state.

---

## Autonomous Decisions

Entities choose their own behavior.

The simulator never forces an outcome.

Instead,

the simulator asks

"What happens when this event reaches you?"

The entity answers.

---

## Observable Behavior

Every decision made by an entity should eventually become visible.

Users cannot learn from invisible behavior.

If a queue becomes full,

users should observe it.

If a cache saves latency,

users should observe it.

Behavior without visibility has little educational value.

---

## Deterministic Decisions

Given identical state,

identical configuration,

and identical events,

an entity must always behave identically.

Randomness must be explicit,

never accidental.

---

# Core Entities

---

# Client

## Purpose

The Client represents users interacting with the system.

It is the origin of every request.

Clients do not understand infrastructure.

They simply attempt to complete work.

Their perspective defines the user experience.

---

## Engineering Concept

Users judge systems by outcomes.

Not architecture.

The Client therefore measures

- latency
- success
- failure
- responsiveness

Everything else exists only to improve these outcomes.

---

## Internal State

The Client remembers

- requests created
- responses received
- failed requests
- retry attempts

The Client does not know

- database utilization
- cache contents
- server load

Those concerns belong elsewhere.

---

## Incoming Events

Response received

Timeout

Retry complete

Failure notification

---

## Outgoing Events

Generate request

Retry request

Cancel request

---

## Configuration

Request Rate

Concurrent Users

Retry Policy

Timeout

Think Time

---

## Metrics

Average Latency

Completed Requests

Failed Requests

Success Rate

Retry Count

---

## Visualization

Requests originate visually from the Client.

The Client is the only component that creates new work.

Every request begins here.

---

## Learning Goal

The Client teaches that users experience systems only through latency and reliability.

Everything else in the architecture ultimately exists to improve these two outcomes.

---

# Load Balancer

## Purpose

The Load Balancer sits in front of multiple downstream servers and decides which one handles each incoming request.

It has no capacity of its own.

It makes an instant routing decision and forwards.

---

## Engineering Concept

A load balancer does not create capacity.

It only spreads existing capacity more evenly.

Putting one in front of a single overloaded server changes nothing — the servers behind it are what actually need to scale.

Two routing algorithms ship, specifically so their behavior can be compared:

- **Round Robin** — cycles through targets in order, regardless of load. Deterministic, needs no state beyond a counter.
- **Least Connections** — routes to whichever target currently has the fewest in-flight requests.

The two behave identically when every target is equally fast.

They only diverge once one target is slower or overloaded — that divergence is the actual lesson.

---

## Internal State

A rotating index (Round Robin's cursor).

In-flight request count per downstream target (Least Connections only) — incremented on dispatch, decremented when that target's response passes back through.

---

## Incoming Events

Request arrived (route it onward).

Response passing through (decrement that target's in-flight count, then continue toward the client).

---

## Outgoing Events

Route request to a chosen target.

Forward a response back toward its origin.

---

## Configuration

Algorithm — Round Robin or Least Connections.

---

## Metrics

Per-target request distribution — how many requests each downstream target actually received.

---

## Visualization

A per-target distribution bar in the Inspector, so the algorithm's effect is something a student can see, not just a setting they toggled.

---

## Learning Goal

Different routing algorithms achieve "spread requests evenly" differently once replicas aren't identical. A load balancer with a single hardcoded algorithm can't teach that — comparison is the point.

---

# Cache

## Purpose

The Cache sits in front of slower storage (typically a Database) and answers requests from memory when it can.

A hit skips the expensive path entirely.

A miss falls through, and the fetched value is stored on the way back.

---

## Engineering Concept

This implements the cache-aside pattern: check the cache first, fall through on a miss, store the result afterward.

A cache only helps when the same key is requested often enough to be worth remembering.

Hit rate is a property of both the cache (capacity, eviction policy) and the traffic (how repetitive it actually is) — not something a cache can force on its own.

Like the API Server and Database, both directions — the inbound request and the returning response on a miss — go through the same bounded concurrency and queue admission. A cache has finite throughput even though its work is fast.

---

## Internal State

Cached entries, up to capacity.

Bounded concurrency and queue, same as any other processing entity.

---

## Incoming Events

Request arrived (look up the key).

Response returning from downstream after a miss (store it, then continue responding).

---

## Outgoing Events

Cache hit / cache miss.

Forward request downstream (on a miss).

Forward response back toward its origin.

---

## Configuration

Capacity — distinct keys the cache can hold before it must evict one.

Eviction Policy — LRU, LFU, FIFO, or MRU.

TTL — how long an entry stays valid after being stored (0 = never expires on its own).

---

## Metrics

Hit rate.

---

## Learning Goal

The lesson isn't "use Redis." It's that repeated, identical work is wasteful — a cache only pays off when the same data is requested often enough to be worth remembering.

---

# CDN

## Purpose

The CDN is a cache with geography: several independent edge caches, each closer to some users than a single origin server could be, falling through to the origin on a miss.

---

## Engineering Concept

Same cache-aside idea as Cache, replicated across edges.

Each incoming request is assigned a request-appropriate edge by hashing its key, so the same content consistently lands on the same nearby edge — mirroring how real anycast/geo-DNS routing keeps a given user's requests hitting the same edge rather than fragmenting across all of them.

Each edge has its own latency-to-user (closer edges are faster) and its own independent cache — content warmed at one edge isn't visible at another, exactly like real CDN edges.

More edges mean better worst-case latency, since some user is always closer to *an* edge. But each edge caches independently, so splitting the same traffic across more edges can mean each one is individually colder. Proximity and hit rate pull in different directions — a CDN is a bet that proximity wins.

---

## Internal State

N independent edge caches, each with its own entries and its own distance-to-user latency.

---

## Incoming Events

Request arrived (hash the key to an edge, look it up there).

Response returning from the origin after a miss (store it at the edge that missed, then continue responding).

---

## Outgoing Events

Cache hit / cache miss, per edge.

Forward request to the origin (on a miss).

Forward response back toward its origin.

---

## Configuration

Edge Count — how many geographically distributed edges the CDN operates.

Min / Max Edge Latency — one-way latency to the nearest and farthest edge.

Capacity, Eviction Policy, TTL — same knobs as Cache, applied per edge.

---

## Metrics

Per-edge hit rate and request count.

---

## Visualization

A schematic edge map — distance from center represents latency, color represents hit rate — plus a measured "with vs. without this CDN" latency comparison, so the CDN's benefit is demonstrated rather than asserted.

---

## Learning Goal

Latency is partly a physics problem, not just a capacity problem. No amount of server scaling fixes a request that has to travel halfway around the world — proximity does.

---

# Message Queue

## Purpose

The Message Queue buffers work between a producer and a pool of consumers, so the two can run at different speeds.

---

## Engineering Concept

Not every request needs an immediate answer.

A message queue replies the instant a message is durably admitted — accepted into the queue, or picked up right away — regardless of whether a consumer is free yet. Producers never wait on consumers.

It then dispatches to its own downstream consumer as a separate, independently-simulated request under the same request id: same visual packet, decoupled outcome. That second leg is a real request/response — the downstream entity reacts to it with full capacity checks and real latency, and it ends the same way any other request does, just addressed back to the queue instead of the original client.

Backpressure doesn't have to mean "reject immediately." A queue trades that for "reject only once the buffer itself is full," absorbing bursts a downstream consumer alone couldn't keep up with — at the cost of the consumer seeing work later than the producer sent it.

---

## Internal State

The backlog of messages waiting for a free consumer.

Consumers currently dispatching a message.

---

## Incoming Events

Request arrived (admit it, or reject if the backlog is full).

Dispatch complete (a consumer finished handing a message off; pull the next one off the backlog if any is waiting).

---

## Outgoing Events

Acknowledge the producer, immediately on admission.

Queue full (rejection).

Dispatch to the downstream consumer, as its own independent request.

---

## Configuration

Consumer Count — consumers pulling messages off the backlog at the same time.

Max Queue Length — messages the queue can buffer once every consumer is busy, before rejecting new ones.

Dispatch Time — time a consumer takes to pick up and hand off one message.

---

## Learning Goal

Decoupling "accepted the request" from "finished the request" is how systems absorb traffic spikes without falling over.