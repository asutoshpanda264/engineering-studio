# WORKSHOP-UI.md

# Engineering Studio Workshop

> Where engineering decisions become visible.

---

# 1. Purpose

The Workshop is the heart of Engineering Studio.

Everything else exists to support it.

It is not merely a diagram editor.

It is not simply a simulation viewer.

It is a workspace where developers design distributed systems, observe their behavior, and develop engineering intuition through experimentation.

The Workshop should feel like a professional engineering tool.

Every interaction should reinforce one idea:

> "I am designing a real system."

Users are not drawing boxes.

They are constructing a living architecture.

---

# 1a. The Default Landing Is Blank

Engineering Studio is an educational website.

Its users are here to teach themselves.

So the Workshop always opens onto an empty canvas.

Not a pre-loaded scenario.

Not someone else's architecture.

A blank playground,

ready for the user's own questions.

"What happens if I connect a Client straight to a Database?"

"What happens if I skip the cache?"

Scenarios exist,

but they are opt-in.

A user chooses one deliberately, from the Scenarios tab,

when they want a structured problem instead of open exploration.

The Workshop never decides that for them.

---

# 2. Design Philosophy

The Workshop follows three fundamental principles.

## Build

Users should feel encouraged to experiment.

Nothing should feel irreversible.

Building an architecture should feel lightweight.

Trying ideas should be faster than reading documentation.

---

## Observe

The Workshop should explain.

Every simulation should answer questions.

Not simply display animations.

Users should always understand:

- What happened
- Why it happened
- What changed

---

## Iterate

Engineering is an iterative discipline.

The Workshop should encourage rapid experimentation.

Design.

Run.

Observe.

Improve.

Repeat.

Every interaction should reduce the friction between these steps.

---

# 3. Information Architecture

The Workshop is organized around four responsibilities.

```

Create

↓

Configure

↓

Observe

↓

Improve

```

Everything visible in the interface supports one of these four activities.

If a feature supports none of them,

it does not belong in the Workshop.

---

# 4. Workspace Layout

```

┌──────────────────────────────────────────────────────────────────────────┐
│ Header                                                                   │
├────────────────┬─────────────────────────────────────────┬───────────────┤
│                │                                         │               │
│                │                                         │               │
│ Component      │                                         │   Inspector   │
│ Library        │       Architecture Canvas               │               │
│                │                                         │               │
│                │                                         │               │
├────────────────┴─────────────────────────────────────────┴───────────────┤
│ Playback Timeline                         Live Metrics                   │
└──────────────────────────────────────────────────────────────────────────┘

```

Each region has exactly one responsibility.

No panel should attempt to solve multiple problems.

---

# 5. Header

The header answers one question.

"What am I working on?"

It contains

- Scenario
- Project Name
- Run Simulation
- Reset
- Templates
- Export
- Settings

The Run Simulation button is always the primary action.

It should remain visually dominant.

---

# 6. Component Library

The Component Library introduces infrastructure.

Every item represents an engineering concept.

Examples

Client

API Server

Database

Cache

Load Balancer

Message Queue

CDN

Dragging a component onto the canvas introduces a new participant into the simulation.

The library is therefore a catalogue of infrastructure,

not UI widgets.

---

# 7. Architecture Canvas

The canvas is where users think.

It should disappear into the background.

The architecture should become the focus.

The canvas supports

- Drag
- Drop
- Connect
- Pan
- Zoom
- Multi-select
- Keyboard navigation
- Copy
- Paste
- Delete
- Undo
- Redo

The canvas never performs simulation.

It only edits architecture.

---

# 8. Nodes

Nodes represent infrastructure entities.

A node should communicate three things immediately.

Identity.

Current health.

Current role.

Users should never need to click a node simply to know what it represents.

---

## Node Anatomy

Every node contains

Infrastructure Icon

Name

Status Indicator

Health Indicator

Quick Metrics

Connection Handles

Selection State

Hover State

Simulation State

---

## Node States

Every node supports

Default

Hover

Focused

Selected

Running

Overloaded

Unavailable

Disabled

Error

These states communicate system behavior.

They are not decorative.

---

# 9. Connections

Connections represent communication.

They are directional.

Connections are not merely lines.

They communicate

Request Flow

Response Flow

Traffic Volume

Failures

Latency

During playback,

connections become active participants in the visualization.

Movement should reinforce causality.

Not decoration.

---

# 10. Inspector

The Inspector explains the currently selected entity.

Rather than overwhelming users with configuration,

the Inspector answers four questions.

Who am I?

How am I configured?

What is happening to me?

Why do I exist?

---

## Sections

Identity

Configuration

Live Metrics

Current Status

Engineering Explanation

Related Concepts

Future Extensions

Users should leave understanding not only how to configure a component,

but why engineers use it.

---

# 11. Simulation Controls

Running a simulation should require exactly one click.

The user should never think about implementation.

Only intention.

Controls include

Run

Stop

Restart

Reset

Simulation is treated as asking a question.

"What happens if this architecture receives traffic?"

The engine answers.

---

# 12. Playback

Playback is independent from simulation.

Users interact with playback exactly like media.

Play

Pause

Seek

Replay

Jump

Playback Speed

Current Time

Simulation Duration

Playback should feel like reviewing history,

not controlling computation.

---

# 13. Metrics

Metrics answer

"How healthy is my architecture?"

Metrics should update continuously during playback.

Examples include

Latency

Throughput

Database Utilization

Cache Hit Rate

Queue Length

Error Rate

Success Rate

Metrics should always be accompanied by visual evidence.

Users should never trust numbers without context.

---

# 14. Challenge Mode

Challenge Mode transforms the Workshop into an engineering exercise.

Instead of asking

"Build anything."

the Workshop asks

"Can you satisfy these constraints?"

Examples

Reduce latency below 100 ms.

Handle 10,000 requests per second.

Stay within budget.

Avoid database overload.

Challenges encourage engineering thinking rather than experimentation alone.

---

# 15. Keyboard Shortcuts

Professional tools reward expertise.

Every common interaction should have a shortcut.

Examples

Delete

Duplicate

Undo

Redo

Run Simulation

Zoom

Search Components

Focus Selected Node

Power users should never feel forced to use the mouse.

---

# 16. Empty States

An empty Workshop should invite exploration.

Instead of displaying an empty canvas,

present users with a clear next step.

Examples

Start from Template

Create New Architecture

Open Challenge

Browse Scenarios

Empty states should reduce uncertainty.

---

# 17. Error States

Errors should educate.

Not frustrate.

Instead of

"Simulation Failed"

explain

"No Client exists.

The simulation requires at least one request source."

Errors should suggest solutions.

Never merely describe problems.

---

# 18. Loading States

Most Workshop interactions should feel instantaneous.

Where loading is unavoidable,

prefer skeletons over spinners.

The interface should always communicate progress.

Users should never wonder whether the application has frozen.

---

# 19. Motion Philosophy

Motion exists to explain causality.

Every animation should answer one question.

"What changed?"

Examples

A request moves because it was routed.

A queue grows because requests arrived faster than they were processed.

A cache lights up because a hit occurred.

Movement should communicate system behavior,

not visual flair.

---

# 20. Accessibility

Every interaction must support

Keyboard Navigation

Visible Focus

Screen Readers

Reduced Motion

High Contrast

Consistent Shortcuts

Accessibility is part of product quality.

Not a post-release enhancement.

---

# 21. UX Principles

Every interaction in the Workshop should preserve these principles.

---

The architecture is always the hero.

The interface supports it.

---

Configuration should feel discoverable.

Never overwhelming.

---

Every engineering decision should have visible consequences.

---

Animations explain.

They never distract.

---

The simulation engine computes.

The Workshop communicates.

---

Users should always know

Where they are.

What is happening.

What they can do next.

---

The best interface is one that quietly disappears,

allowing engineering intuition to take center stage.

---

# Closing Thoughts

The Workshop is where Engineering Studio becomes more than a simulator.

It becomes a conversation between the engineer and the system.

The user proposes an architecture.

The simulation responds with consequences.

The Workshop makes those consequences understandable.

Every drag.

Every connection.

Every animation.

Every metric.

Exists for one purpose:

To help developers build better engineering intuition.

The Workshop is therefore not simply the interface of Engineering Studio.

It is its classroom.