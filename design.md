# DESIGN-SYSTEM.md

# Engineering Studio Design System

> A professional, minimal, engineering-first interface designed to help users understand complex distributed systems through interaction.

---

# 1. Design Philosophy

Engineering Studio is not a marketing website.

It is a professional engineering tool.

Every visual decision should improve understanding rather than attract attention.

The interface should feel closer to:

- Linear
- Vercel
- Figma
- Raycast
- GitHub

than consumer applications.

Users should immediately feel like they're using software built for engineers.

---

# 2. Design Principles

## Minimal

Only show information that helps the current task.

Avoid decorative UI.

Avoid unnecessary gradients.

Avoid oversized cards.

Whitespace is preferred over visual clutter.

---

## Functional

Every element exists for a reason.

Animations communicate state.

Icons communicate intent.

Color communicates status.

Nothing is purely decorative.

---

## Predictable

Interactions should feel consistent.

Buttons behave identically across the application.

Panels open the same way.

Animations use the same timing.

Spacing follows a single scale.

---

## Calm

Avoid visual noise.

Avoid bright colors.

Avoid unnecessary movement.

The interface should remain comfortable during long engineering sessions.

---

# 3. Color System

The application is dark-mode first.

## Background

Primary Background

Used for the application shell.

Secondary Background

Used for panels.

Elevated Background

Used for floating UI.

Canvas Background

Used behind React Flow.

---

## Foreground

Primary Text

Secondary Text

Muted Text

Disabled Text

---

## Borders

Default Border

Subtle Border

Focused Border

---

## Semantic Colors

Success

Warnings

Errors

Information

Selection

Connection

---

## Simulation Colors

Client

Blue

API Server

Emerald

Database

Amber

Load Balancer

Purple

Cache

Orange

CDN

Cyan

Message Queue

Pink

These colors should remain consistent across:

- Nodes
- Metrics
- Charts
- Connections
- Events
- Legends

---

# 4. Typography

Primary Font

Geist

Fallback

Inter

Monospace

Geist Mono

---

## Type Scale

Display

Page Titles

Section Titles

Panel Titles

Body

Small Labels

Captions

---

## Typography Rules

Never use more than three font sizes inside a panel.

Use font weight rather than font size to create hierarchy.

Avoid excessive bold text.

Numbers should align cleanly.

Metrics should use tabular numerals whenever possible.

---

# 5. Spacing

Use an 8-point grid.

Spacing tokens

4

8

12

16

24

32

48

64

Never invent arbitrary spacing values.

---

# 6. Border Radius

Small

Medium

Large

Round

Maintain consistency across:

Buttons

Panels

Cards

Dropdowns

Nodes

---

# 7. Elevation

Three elevation levels.

Base

Panels

Floating Elements

Avoid heavy shadows.

Prefer subtle separation.

---

# 8. Motion

Animation exists to explain change.

Never animate for decoration.

---

## Standard Duration

Fast

Normal

Slow

---

## Standard Curves

Ease Out

Ease In Out

Spring

---

## Motion Principles

Panel opens

Fade + Slide

Dialog

Fade + Scale

Node Selection

Border + Shadow

Simulation Playback

Linear

Hover

Subtle elevation

Loading

Skeletons over spinners whenever possible.

---

# 9. Iconography

Use Lucide Icons exclusively.

Icons should be simple.

Avoid filled icons.

Prefer outlined icons.

Icons always accompany text unless universally understood.

---

# 10. Component Principles

Every component should have:

Default

Hover

Active

Focused

Disabled

Loading

Error

Empty

states.

No component should exist with only one visual state.

---

# 11. Accessibility

Every interactive element must support:

Keyboard Navigation

Visible Focus

ARIA Labels

Screen Readers

High Contrast

Reduced Motion

Touch Targets (where applicable)

Accessibility is not an enhancement.

It is a requirement.

---

# 12. Responsive Strategy

Desktop is the primary experience.

Supported

Desktop

Laptop

Tablet (limited)

Out of Scope

Mobile drag-and-drop editing

Small-screen architecture building

Future versions may introduce a simplified mobile viewer.

---

# 13. Engineering Aesthetic

The interface should communicate confidence.

Users should feel:

"I am using a professional engineering tool."

not

"I am using an educational toy."

Every interaction should reinforce that feeling.

---

# 14. Definition of Done

Before a screen is complete, verify:

✓ Consistent spacing

✓ Consistent typography

✓ Animation follows motion guidelines

✓ Keyboard accessible

✓ Responsive

✓ Empty states

✓ Error states

✓ Loading states

✓ Dark mode polished

✓ Visual hierarchy is clear

If any item is missing, the screen is not finished.