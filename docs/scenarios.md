# SCENARIOS.md

# Engineering Studio Scenarios

> Great engineers are not created by memorizing architectures.
>
> They are created by repeatedly making engineering decisions,
> observing their consequences,
> and refining their thinking.

---

# Philosophy

Engineering Studio does not teach infrastructure.

It teaches engineering judgement.

Every scenario exists to answer one engineering question.

Examples:

- Why does a cache exist?
- Why does a queue improve reliability?
- When should I introduce a load balancer?
- Why does replication improve reads but complicate writes?
- What problem does a CDN actually solve?

The answer should never be presented directly.

Users should discover it through experimentation.

---

# Scenarios Are Opt-In

The Workshop opens as a blank playground, never a pre-loaded scenario (see `WORKSHOP-UI.md` §1a).

A user picks a scenario deliberately, from the Scenarios tab in the Component Library, when they want a structured problem instead of open-ended exploration.

Choosing one replaces the current canvas with that scenario's starting architecture, its story, and its success criteria.

Free experimentation is not a fallback for when no scenario is loaded — it is the primary way this educational site is meant to be used. Scenarios are an additional layer for users who want a defined problem to solve.

---

# Learning Framework

Every scenario follows the same learning cycle.

```

Understand the Problem

↓

Design an Architecture

↓

Run Simulation

↓

Observe Consequences

↓

Improve the Design

↓

Run Again

↓

Build Intuition

```

The simulation provides answers.

The scenario provides questions.

---

# Anatomy of a Scenario

Every scenario is composed of six parts.

---

## 1. Story

Every engineering problem begins with a business problem.

Not a technical one.

Example:

Movie tickets sell out within minutes whenever a blockbuster releases.

Thousands of users attempt to purchase the same seats simultaneously.

The system must remain responsive.

No tickets should be oversold.

The business objective defines the engineering problem.

---

## 2. Constraints

Engineering is the art of working within constraints.

Examples include

Users

Traffic

Latency

Availability

Budget

Timeline

Team Size

Geographic Reach

No architecture is evaluated in isolation.

It is evaluated relative to its constraints.

---

## 3. Starting Point

Every scenario provides an intentionally imperfect architecture.

Users should never begin with the ideal solution.

Instead,

they inherit a system.

Just like real engineers.

Their responsibility is to improve it.

---

## 4. Challenges

During playback,

new challenges emerge.

Traffic spikes.

Servers fail.

Caches become cold.

Queues overflow.

Regions become unavailable.

These events force architectural decisions.

---

## 5. Reflection

After every simulation,

Engineering Studio should explain

What happened?

Why did it happen?

Which decisions helped?

Which decisions made things worse?

Reflection is where learning occurs.

---

## 6. Concepts Learned

Every scenario teaches a small number of engineering ideas.

Users should finish knowing

why a solution works,

not merely

what the solution is.

---

# Difficulty Levels

Engineering intuition develops gradually.

Scenarios are grouped into learning stages.

---

# Level 1 — Foundations

Goal

Understand request flow.

Users work with

Client

↓

API

↓

Database

Concepts

Request lifecycle

Latency

Processing

Bottlenecks

Health

Users should leave understanding

where requests travel,

how latency accumulates,

and why databases become bottlenecks.

---

# Level 2 — Performance

Goal

Reduce unnecessary work.

Users introduce

Cache

Concepts

Cache Hits

Cache Misses

Hot Data

Cold Data

Latency Reduction

Database Offloading

The lesson is not

"Use Redis."

The lesson is

"Repeated work is expensive."

---

# Level 3 — Scalability

Goal

Handle more users.

Users introduce

Load Balancer

Multiple API Servers

Concepts

Horizontal Scaling

Traffic Distribution

Server Utilization

Throughput

The lesson is

A load balancer does not create capacity.

It distributes work across existing capacity.

---

# Level 4 — Reliability

Goal

Survive failures.

Users introduce

Message Queues

Retries

Timeouts

Concepts

Backpressure

Asynchronous Processing

Failure Isolation

Retry Policies

The lesson is

Systems should degrade gracefully.

---

# Level 5 — Distributed Systems

Goal

Operate at internet scale.

Users explore

Replication

Sharding

CDNs

Multi-region Deployments

Concepts

Consistency

Availability

Partition Tolerance

Read Scaling

Write Scaling

Latency vs Correctness

Trade-offs become increasingly important.

---

# Scenario Catalogue

The following scenarios are planned.

---

## Movie Ticket Booking

Difficulty

★★☆☆☆

Problem

Thousands of users attempt to reserve seats simultaneously.

Concepts

Concurrency

Locking

Caching

Read Scaling

Queueing

Challenge

Prevent overselling while remaining responsive.

---

## Flash Sale

Difficulty

★★★☆☆

Problem

Traffic increases by two orders of magnitude.

Concepts

Autoscaling

Rate Limiting

Backpressure

Queues

Challenge

Keep the system available despite sudden demand.

---

## URL Shortener

Difficulty

★☆☆☆☆

Problem

Millions of repeated reads.

Few writes.

Concepts

Caching

Hashing

Hot Keys

Latency

Challenge

Serve requests quickly while minimizing database load.

---

## Ride Sharing

Difficulty

★★★★☆

Problem

Drivers and riders update locations continuously.

Concepts

Real-time Systems

Geospatial Queries

Partitioning

Availability

Challenge

Maintain low latency despite continuous updates.

---

## Video Streaming

Difficulty

★★★★★

Problem

Global users request large media files.

Concepts

CDNs

Regional Caching

Bandwidth

Edge Computing

Challenge

Reduce latency while minimizing infrastructure cost.

---

## Banking System

Difficulty

★★★★★

Problem

Money must never disappear.

Concepts

Transactions

Consistency

Replication

Failure Recovery

Challenge

Correctness matters more than speed.

---

# Scenario Progression

Scenarios intentionally build upon one another.

```

Request Flow

↓

Caching

↓

Scaling

↓

Reliability

↓

Distribution

↓

Global Systems

```

Engineering Studio should never introduce advanced concepts before users understand simpler ones.

Learning should feel natural.

---

# Evaluation

Engineering Studio does not grade users based on matching a reference architecture.

Instead,

architectures are evaluated across engineering dimensions.

Latency

Throughput

Availability

Cost

Complexity

Maintainability

Scalability

Every architecture represents a trade-off.

There is rarely a single correct answer.

---

# Hints

Hints should encourage thinking.

Not provide solutions.

Bad Hint

> Add Redis.

Good Hint

> Which component currently performs the most repeated work?

Questions teach.

Answers merely solve.

---

# Success

A scenario is successful when users understand

why their architecture behaves the way it does.

Not because they memorized the "correct" solution.

Engineering Studio rewards understanding.

Not imitation.

---

# Future Directions

Future scenarios may include

- Social Media Feed
- Search Engine
- Chat Application
- Payment Gateway
- Distributed Analytics
- IoT Telemetry
- Online Gaming
- AI Inference Platform
- Autonomous Vehicles
- Large Language Model Serving

Each new scenario should introduce a genuinely new engineering idea.

Scenarios should never exist simply to increase quantity.

---

# Closing Thoughts

Scenarios are not examples.

They are conversations.

Each one begins with a business problem.

The engineer responds with an architecture.

The simulation responds with consequences.

The scenario concludes with a deeper understanding than either the problem or the solution could provide alone.

Users should leave every scenario asking better engineering questions than when they started.

That is how engineering intuition is built.

One decision at a time.