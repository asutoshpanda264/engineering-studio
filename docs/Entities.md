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