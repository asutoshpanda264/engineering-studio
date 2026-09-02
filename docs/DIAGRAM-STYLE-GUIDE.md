# DIAGRAM-STYLE-GUIDE.md

How `PipelinePhaseDiagram.tsx` (the RAG pipeline figure on
`/case-studies/rag-system`) got from a flat, boxed, monochrome pipeline to
something that actually reads well — and how to reuse the same judgment,
not necessarily the same colors, on the next diagram. Reference
implementation: `src/components/content/diagrams/generic/PipelinePhaseDiagram.tsx`
+ the `--color-rag-*` tokens in `src/app/globals.css`.

**Read Part 1 before Part 2.** Part 2 is a rare, deliberate exception to
this codebase's own rules — it only works because Part 1 was satisfied
first. Skipping straight to "give my diagram bright colors and no box"
without asking whether the diagram earns that is how you get a worse
version of what this file replaced.

---

## Part 1 — Draw the mechanism, not a decoration

This is the actual hard part, and it has nothing to do with color. A
diagram earns its place when it lets a reader see something they'd
otherwise have to assemble from prose — where data flows, which parts
talk, what changes between two options. If a sentence says it faster,
write the sentence instead.

- **Depict the mechanism, not its name.** A box labeled "Retriever" says
  less than the word does. The path a request takes through it, the store
  it reads from, the thing that disappears if you swap it out — that's
  what the picture is for. Before drawing a node, ask what the reader
  couldn't get from the label alone.
- **Comparing options? Draw the difference**, not a list of boxes with
  nothing connecting them. Two architectures side by side, a before/after,
  the one edge each option adds or removes.
- **Match complexity to the stakes.** A one-hop question is a three-box
  diagram. A pipeline with a real offline/online split, like this one, is
  worth the extra structure. Don't force either direction.
- **Label the arrows.** An unlabeled arrow just means "related somehow."
  `query`, `embedded & indexed ahead of time`, `top-k chunks` are each
  doing real work here — they're the only thing that tells the offline
  indexing path apart from the live query path.
- **One figure, one claim.** This figure's whole claim is "embedding,
  retrieval, and generation are three different pieces of machinery, and
  the corpus gets indexed on a completely different schedule than a
  query gets answered." Every other decision in Part 2 exists to make
  that claim more legible, not to make the figure prettier for its own
  sake.

This is also the test for whether Part 2 applies at all — see the
decision rule immediately below.

---

## Part 2 — When to reach for this treatment (rarely)

`PipelinePhaseDiagram` breaks three rules this codebase otherwise holds
everywhere:

1. `globals.css`'s own comment: *"status colors reserved exclusively for
   real simulated state... so they never stop meaning something."*
2. The near-zero radius, hairline-everything visual language (see
   `primitives.tsx`'s `DiagramBox`, `PipelineDiagram`'s plain cards).
3. Every other figure on the site rendering inside `FigureFrame`'s
   bordered panel.

Those rules exist for a reason — a palette that means something only
works if it isn't reused as decoration. So **this is not the new default
diagram style.** Reach for it only when all of these are true:

- The distinction between parts of the diagram is itself the lesson (here:
  embedding vs. retrieval vs. generation vs. plain plumbing — the whole
  point of the surrounding lesson text is that these are different kinds
  of machinery, not one blob labeled "AI").
- A plain, single-accent diagram (`PipelineDiagram`, `ArchitectureDiagram`,
  ...) genuinely can't make that distinction legible — you'd need a legend
  explaining which box is which kind of thing, which is a sign the picture
  itself isn't doing its job.
- It's one figure, not a family — if you find yourself wanting this look
  on five different diagrams, that's a sign the *site's* palette needs a
  real category-color system with its own rules, not five one-off
  exceptions quietly agreeing with each other by accident. Raise that as
  its own decision instead of copy-pasting tokens.

If your diagram doesn't clear that bar, use the existing plain components
and stop reading here — `PipelineDiagram.tsx`, `primitives.tsx`'s
`DiagramBox`/`DiagramArrow`, or whichever generic `LessonBlock` kind
already fits (see `src/content/shared/lesson.ts`'s doc comments — there's
already a kind for tree, sequence, compare, timeline, graph, etc; check
before inventing a new one).

---

## Part 3 — The technique, concretely

Everything below is *how* to execute Part 2 once you've decided it
applies. Treat the numbers as a worked example, not a copy-paste
constant — tune them to your own diagram's actual proportions the same
way these were tuned (see Part 4 for the mistakes that tuning caught).

### Color

- Pick one hue per category that's actually distinct, not a rainbow.
  Here: violet (embedding, transform), teal (retrieval, storage), warm
  coral (generation), muted gold/khaki (raw corpus / offline). Plumbing
  nodes (`Client`, `Combine`, `Output`) stay neutral — they aren't a
  "kind of machinery," they're just data moving through.
- Tune saturation/lightness to your actual background, not in the
  abstract. The first pass here was muted (`hsl(262 32% 62%)` etc.) to
  avoid clashing with the site's warm near-black void — and it read as
  flat and lifeless. The fix wasn't a different hue, it was more
  saturation and lightness at the *same* hues:
  `hsl(262 65% 72%)` (embed), `hsl(168 60% 55%)` (retrieve),
  `hsl(16 75% 62%)` (generate), `hsl(46 45% 60%)` (corpus). Brighter
  read as intentional; muted read as an accident. When in doubt, test
  both directions in the actual browser before settling — don't guess
  from the hex value alone.
- Tune each theme separately if the app has more than one. Night Ops
  (`data-theme="night-ops"`) needed its own pass: same hues brightened a
  bit further for its colder, darker void, and corpus specifically moved
  off khaki to a cool grey-blue (`hsl(220 22% 64%)`) because khaki sat
  too close to Night Ops's gold signal accent. A palette that works on
  one background doesn't automatically work on another.
- Name the tokens for the narrow thing they're for
  (`--color-rag-embed`, not `--color-accent-violet`), and say so in a
  comment right next to the definition — see `globals.css`. A vague name
  is how a deliberate one-off quietly becomes "the palette everyone
  reaches for."

### Typography

- Don't introduce a new typeface for one diagram. This site already
  splits type strictly by role — serif to read, mono for data/interface
  (`globals.css`'s own stated philosophy). Diagram labels are interface,
  not prose: **every label in this figure is `font-mono`**, including the
  node titles, which first shipped inheriting the article's serif body
  font and looked soft as a result. Bold mono (`font-semibold`) at the
  title, regular weight at tags/edge-labels, gives the figure a single
  consistent technical voice without a new font dependency.
- If you're tempted to load a bold display face to match some reference
  image exactly — don't, unless the whole app is getting a third
  typographic role. One diagram doing its own typography is a tell.

### Icons

- Build custom icons on the **same grid and stroke language** the
  surrounding icons already use, not your own style. Here that's a 24×24
  viewBox, `currentColor` stroke, round linecap/linejoin, one stroke
  weight — the same convention Lucide (and this app's `ENTITY_CATALOG`
  icons, which *are* Lucide) already follow. Mismatched icon weights next
  to each other is one of the fastest ways a diagram reads as amateur.
- **Keep any icon that's tied to a real thing elsewhere in the app** — a
  node with an `entityType` should keep its actual `ENTITY_CATALOG` icon
  (same glyph shown on `/entities/[slug]`, the Workshop canvas, etc.),
  never a custom replacement, even if that means one diagram mixes
  "real" icons with hand-drawn conceptual ones. That cross-diagram
  consistency is worth more than a perfectly matched icon family within
  one figure. Only replace icons that were arbitrary to begin with (this
  diagram's `Embedding`/`Vector DB`/`Data Source`/`Combine`/`Output` were
  generic off-the-shelf Lucide picks tied to nothing — safe to redraw).
- Motif-match a reference image if you have one, but redraw it in your
  own icon language rather than copying its exact paths — see the five
  `DiagramIcon` components at the top of `PipelinePhaseDiagram.tsx` for
  the worked example (vector graph, cylinder, stacked pages, braces,
  checked card).

### No box (when to drop `FigureFrame`)

- `FigureFrame` (the bordered `bg-bg-panel` panel + zoom button every
  other diagram renders inside) exists so diagrams of very different
  kinds still read as one visual language. That's a real, valuable
  default — don't drop it reflexively.
- Drop it only when the diagram already carries enough of its own visual
  weight (real color, real hierarchy) that the shared frame reads as a
  box around a box, not as scaffolding the figure needs. That was true
  here specifically *because* of the color work above — a plain
  monochrome diagram almost always still wants the frame's border to
  read as a discrete figure at all.
- If you do drop it, you also drop the zoom-to-enlarge affordance that
  came free with it. That's a real trade, not a non-issue — only make it
  deliberately (see the conversation that led to this file for how that
  question actually got asked before acting on it).

### Sizing — the single biggest "why does this look bad" trap

- `svgResponsiveProps` (in `primitives.tsx`) deliberately grows an SVG to
  `max(100%, its native px width)` so a diagram fills the ~1024px
  article column. That's correct for a dense grid/architecture diagram.
  It is **wrong** for a figure whose proportions were hand-tuned at a
  smaller native size — it silently stretches every icon, stroke, and
  font size past what was actually drawn, and the result reads as
  chunky/tacky for reasons that have nothing to do with the design
  itself. This was the single largest cause of "the site version looks
  worse than the reference" in this session, and it's easy to miss
  because nothing errors — it just quietly oversizes everything.
- If your diagram's proportions matter, cap it at its own native size
  instead:
  ```tsx
  <svg
    viewBox={`0 0 ${width} ${height}`}
    width={width}
    height={height}
    style={{ width: "100%", maxWidth: `${width}px`, height: "auto" }}
    className="mx-auto block ..."
    ...
  />
  ```
  This shrinks on a narrow viewport (same as any responsive image) but
  never grows past its designed scale. `mx-auto block` centers it once
  the container is wider than the capped max-width.

### Labels that wrap instead of clipping

Two real bugs, both worth checking for on any new diagram:

- **Any label whose length isn't bounded by its layout must be wrapped**,
  not assumed to fit. The offline edge label here
  (`"embedded & indexed ahead of time"`) ran clean off the SVG's right
  edge the moment the diagram was capped to its native width, because it
  had previously only "worked" by having far more spare width than it
  needed. Compute the actual available width at the label's position and
  wrap into it — see `sideEdgeLines()`'s use of `estimateMaxChars` +
  `wrapText` (both in `primitives.tsx`) for the pattern.
- **Any box sized to fit "an icon and a short label" needs to actually be
  tall enough for both**, checked against real font metrics, not
  eyeballed. `SIDE_CARD_H` shipped at `40`, one pixel short of fitting an
  18px icon plus a label baseline — invisible until you actually zoom in
  on the render. If a label's line count is data-dependent, size its
  container from the real wrapped line count (`sideRowH` in this file),
  not a guessed constant.

### Layout — the two-row loop, generalized

If a pipeline has more nodes than comfortably fit in one row, wrapping
onto a second row (right-to-left, so the whole thing reads as one loop
rather than running off the page) is the same pattern this figure uses —
written as index math over however many nodes exist
(`colFor`/`xForCol`/`yForRow` in `PipelinePhaseDiagram.tsx`), not
hardcoded to six nodes. Reuse that pattern rather than hand-placing
coordinates per diagram; it's what makes the component still correct if
the case study's own node list ever changes.

---

## Part 4 — Checklist before shipping a new one-off diagram

1. Does Part 1's "one figure, one claim" test actually pass? Say the
   claim in one sentence before drawing anything.
2. Does Part 2's decision rule actually justify breaking the site's
   default look, or would a plain existing component do?
3. Is every accent color reused for a *category* distinction that
   matters to the reader, not decoration? Named and commented as a
   narrow exception in `globals.css`, not a general-purpose token?
4. Tuned in the actual browser, in every theme the app ships (`dark`
   default + `night-ops` here), not eyeballed from hex values alone?
5. Same icon grid/stroke weight as the icons already around it on the
   page? Any entity-backed node still using its real catalog icon?
6. Is the SVG capped to its native size, or is it quietly relying on
   `svgResponsiveProps`'s "fill the column" behavior to stretch it past
   its designed scale?
7. Does every label — especially anything content-authored and
   variable-length, not a short fixed tag — actually wrap within its
   real available width, checked at the size it renders in-app?
8. Is every box actually tall/wide enough for its real content at real
   font metrics, not assumed from a constant that "looked about right"?
9. Dropping `FigureFrame`? Confirm that's deliberate, including losing
   the zoom button — don't drop it as a side effect of something else.

If you can check all nine honestly, you've earned the treatment. If not,
the plain components are usually the better diagram, not a
compromise.
