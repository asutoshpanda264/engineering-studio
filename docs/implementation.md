# IMPLEMENTATION.md

# Engineering Studio Implementation Guide

> "Architecture defines intent. Implementation makes it real."

---

# Purpose

This document describes how Engineering Studio should be implemented.

Unlike the other documentation, this file is intentionally practical.

It defines:

- Repository organization
- Coding standards
- Naming conventions
- State management
- Component boundaries
- Development workflow
- Performance expectations
- Testing strategy

Every implementation decision should respect the philosophy defined in:

- PRODUCT.md
- ARCHITECTURE.md
- DESIGN-SYSTEM.md
- SIMULATION-ENGINE.md
- WORKSHOP-UI.md

If implementation ever contradicts those documents,

the architecture wins.

---

# Guiding Principles

Before writing code, remember:

- Simplicity over cleverness.
- Readability over abstraction.
- Composition over inheritance.
- Functions before classes where appropriate.
- Explicit over implicit.
- State should have a single owner.
- React renders state—it does not compute it.
- Every file should have one clear responsibility.

---

# Repository Structure

```
engineering-studio/
│
├── app/                    # Next.js App Router
│
├── components/             # Reusable UI primitives
│
├── features/               # Feature-specific UI
│
├── simulation/             # Simulation engine
│
├── store/                  # Zustand stores
│
├── hooks/
│
├── lib/
│
├── types/
│
├── utils/
│
├── public/
│
├── docs/
│
└── tests/
```

---

# Folder Responsibilities

## app/

Owns routing.

Contains no business logic.

---

## components/

Reusable presentation components.

Examples

Button

Card

Badge

Tooltip

Modal

Slider

Charts

Panels

No simulation logic.

No Zustand.

Pure UI.

---

## features/

Feature-oriented UI.

Examples

Workshop

Inspector

Playback

Metrics

Challenge

Landing

A feature may compose many reusable components.

---

## simulation/

The heart of the application.

Contains

Engine

Entities

Events

Metrics

Algorithms

Validation

Playback

Zero React imports.

Zero Zustand imports.

Pure TypeScript.

---

## store/

Global application state.

Only UI state belongs here.

Examples

Current selection

Playback state

Theme

Sidebar

Current scenario

Never simulation state.

---

## hooks/

React hooks.

Examples

usePlayback()

useKeyboard()

useSimulation()

Hooks coordinate.

They do not implement business logic.

---

## lib/

Shared libraries.

Examples

Math

Formatting

Random generator

Seed utilities

Color helpers

No React.

---

## utils/

Stateless helper functions.

Prefer lib for reusable domain logic.

Use utils only for lightweight helpers.

---

## types/

Shared TypeScript definitions.

Avoid duplicate interfaces.

Domain types live here.

---

# Feature Architecture

Every feature follows the same structure.

```
feature/

components/

hooks/

types/

utils/

index.ts
```

A feature should be understandable in isolation.

---

# Simulation Architecture

The simulation folder is intentionally independent.

```
simulation/

engine/

entities/

events/

metrics/

playback/

algorithms/

validators/

types/
```

Every folder owns one responsibility.

---

# State Management

Engineering Studio has two independent worlds.

UI State

Simulation State

Never mix them.

---

## UI State

Managed with Zustand.

Examples

Selection

Zoom

Theme

Playback controls

Inspector

Open dialogs

---

## Simulation State

Owned entirely by the simulation engine.

React receives snapshots.

React never mutates simulation state.

---

# Data Flow

The application follows one direction.

```
Canvas

↓

Bridge

↓

Simulation Engine

↓

Event Timeline

↓

Playback

↓

React UI
```

Data never flows backwards.

---

# Component Design

Prefer

```
Small

Composable

Focused
```

over

```
Large

Generic

Config-heavy
```

Every component should answer one question:

"What is my responsibility?"

---

# Naming Conventions

Components

PascalCase

```
PlaybackTimeline.tsx
```

Hooks

camelCase

```
usePlayback.ts
```

Stores

```
playback-store.ts
```

Utilities

```
formatLatency.ts
```

Types

```
simulation.types.ts
```

Constants

```
simulation.constants.ts
```

Avoid abbreviations.

Names should be readable.

---

# Imports

Always prefer feature boundaries.

```
features/workshop/components

NOT

../../../components
```

Use path aliases.

Avoid deep relative imports.

---

# React Guidelines

Prefer

Functional Components

Hooks

Composition

Memoization only when measured.

Avoid

Large Context providers

Prop drilling

Complex HOCs

Inheritance

---

# Styling

TailwindCSS only.

No inline styles.

No magic spacing.

Use design tokens.

Every spacing value should come from the design system.

---

# Animations

Framer Motion only.

Animations communicate state.

Avoid decorative motion.

Respect reduced-motion preferences.

---

# React Flow

React Flow is responsible for

Editing

Dragging

Connecting

Selecting

Nothing else.

It never performs simulation.

---

# Zustand

Zustand owns interface state.

Never business logic.

Stores should remain small.

Prefer multiple stores over one massive global store.

---

# Performance

Target

60 FPS

Avoid unnecessary renders.

Prefer derived values.

Memoize expensive selectors.

Measure before optimizing.

---

# Error Handling

Fail loudly during development.

Fail gracefully in production.

Every error should help developers understand:

What failed?

Why?

How to recover?

---

# Logging

Development

Detailed logs.

Production

Minimal logs.

Simulation debugging should rely on event timelines,

not console statements.

---

# Testing Strategy

Unit Tests

Simulation engine

Algorithms

Entities

Validators

Integration Tests

Workshop

Playback

Bridge

End-to-End

Complete scenarios

Accessibility

Keyboard interactions

Performance

Determinism

---

# Code Reviews

Every Pull Request should answer:

Does this respect the architecture?

Does this improve understanding?

Can this be simplified?

Does it introduce unnecessary abstraction?

Will a new engineer understand this in six months?

---

# Development Workflow

1.

Understand the documentation.

↓

2.

Discuss architecture.

↓

3.

Implement one milestone.

↓

4.

Write tests.

↓

5.

Review.

↓

6.

Refactor.

↓

7.

Move forward.

Never implement multiple major systems simultaneously.

Small, complete iterations are preferred over partially finished features.

---

# Definition of Done

A feature is complete when

✓ Works correctly

✓ Tested

✓ Accessible

✓ Responsive

✓ Follows the design system

✓ Respects architecture boundaries

✓ Has no obvious technical debt

✓ Is understandable by another engineer

Done means maintainable,

not merely functional.

---

# Closing Thoughts

Engineering Studio is intentionally built as a collection of small, well-defined systems.

The implementation should reflect the same philosophy as the product itself.

Clear boundaries.

Clear responsibilities.

Predictable behaviour.

The goal is not to build the largest codebase.

The goal is to build one that another engineer enjoys reading.