# TECHNICAL-SPECIFICATION.md

# Engineering Studio Technical Specification

> The common language shared by every subsystem.

---

# Purpose

Engineering Studio consists of multiple independent systems.

- Workshop UI
- Simulation Engine
- Playback Engine
- Metrics
- Scenarios
- Entities

Each subsystem must communicate through clearly defined contracts.

This document defines those contracts.

No implementation should invent its own data structures.

---

# Design Principles

Every model should be

- Serializable
- Immutable where possible
- Explicit
- Human-readable
- Versionable
- Framework independent

React-specific objects must never appear here.

---

# Core Domain Model

The simulation is built around seven concepts.

```

Scenario

↓

Architecture

↓

Entities

↓

Events

↓

Simulation Result

↓

Playback

↓

Metrics

```

Everything else derives from these.

---

# Scenario

A Scenario defines the engineering problem.

It answers

"What world should the simulation create?"

---

Required Information

Scenario ID

Title

Description

Difficulty

Traffic Pattern

Constraints

Learning Goals

Success Criteria

Allowed Components

Initial Architecture

Failure Events

---

Example

Movie Booking

↓

Peak Users

↓

Latency Target

↓

Budget

↓

Traffic Spike

↓

Expected Learning

---

# Architecture

An Architecture represents the user's design.

It is a directed graph.

It contains

Nodes

Edges

Metadata

Configuration

Validation Status

The architecture contains no runtime information.

Only design.

---

# Node

Every node represents one infrastructure entity.

Required fields

Node ID

Entity Type

Position

Configuration

Display Name

Version

Enabled

Custom Metadata

Nodes do not contain runtime state.

Runtime belongs to the simulation.

---

# Edge

Edges represent communication paths.

Required

Source

Destination

Protocol

Latency Modifier

Bandwidth (future)

Priority (future)

Direction is always explicit.

---

# Entity Configuration

Every entity exposes configuration.

Examples

Database

Maximum Connections

Processing Time

Failure Probability

Load Balancer

Algorithm

Weights

Health Check Interval

Cache

Capacity

TTL

Eviction Policy

Configuration should remain declarative.

Never executable.

---

# Simulation Input

The simulation receives exactly three things.

Scenario

Architecture

Simulation Options

Nothing else.

The simulation should not depend on UI state.

---

# Simulation Output

The engine produces one immutable result.

Simulation Result

contains

Timeline

Metrics

Statistics

Warnings

Errors

Simulation Metadata

Everything shown by the UI originates from this result.

---

# Event

Events are the smallest observable unit inside the simulation.

Every event must contain

Unique ID

Timestamp

Type

Source

Destination

Request ID

Metadata

Events are immutable.

Events are append-only.

Events are the single source of truth.

---

# Event Categories

Infrastructure

Request Created

Request Routed

Request Completed

Request Failed

Timeout

Retry

Entity

Queue Full

Cache Hit

Cache Miss

Database Busy

Connection Rejected

System

Simulation Started

Simulation Finished

Scenario Event

Failure Injected

Traffic Spike

Recovery

Playback

Playback Started

Paused

Resumed

Seeked

These categories allow new features without changing existing events.

---

# Playback Timeline

Playback receives

Ordered Events

Playback Cursor

Current Time

Playback Speed

Playback State

Playback never modifies events.

It only changes which events are visible.

---

# Metrics

Metrics are derived.

Never manually updated.

Categories

Latency

Throughput

Availability

Error Rate

Entity Utilization

Queue Length

Cache Hit Rate

Database Load

Request Distribution

Metrics should be reproducible from the event timeline.

---

# Validation

Before simulation,

every architecture is validated.

Validation checks include

Client Exists

Valid Graph

Reachable Database

No Cycles (where required)

Required Connections

Configuration Completeness

The simulator should never execute invalid architectures.

---

# Warnings

Warnings indicate questionable architecture.

Examples

Database has no clients.

Load Balancer routes to one server.

Cache exists but is unused.

These do not block simulation.

They educate users.

---

# Errors

Errors prevent simulation.

Examples

No Client.

No Request Path.

Disconnected Graph.

Invalid Configuration.

Errors should explain

What happened.

Why.

How to fix it.

---

# Serialization

Every major model must be serializable.

Reasons

Save Projects

Share Architectures

Replay Sessions

Future Collaboration

Version Migration

No runtime references should appear inside serialized models.

---

# Versioning

Every saved architecture should contain

Schema Version

Project Version

Migration History (future)

Backward compatibility should be maintained whenever possible.

---

# Performance Targets

Architecture Validation

< 10 ms

Simulation

< 100 ms

Playback Preparation

< 20 ms

Serialization

Instant for typical projects

Performance targets exist to preserve rapid experimentation.

---

# Extensibility

Future infrastructure should require

New Entity

↓

New Configuration

↓

New Events

↓

Optional Metrics

The engine itself should rarely change.

---

# Compatibility Rules

Simulation never depends on

React

DOM

React Flow

Canvas

Browser APIs

The engine should execute identically inside

Node

Tests

CLI

Future server-side execution

---

# Closing Thoughts

This document defines the vocabulary of Engineering Studio.

Every subsystem should communicate using these contracts.

If two systems disagree about a data model,

this document is the source of truth.

A shared language enables independent evolution.

That is the purpose of this specification.