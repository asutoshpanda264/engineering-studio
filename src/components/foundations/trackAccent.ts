/**
 * Per-track accent color. Originally Paper (the light theme) only, with
 * dark and night-ops both explicitly staying single-accent — flipped after
 * direct feedback that Atlas's dark theme (this app's actual default) also
 * wanted per-track color on its card icons, not just Paper. Night-ops
 * (Batman Mode) is still untouched: `FoundationsAtlas` never renders there
 * in the first place (`FoundationsIndexView` branches to `FoundationsMap`
 * before this component is reached), so there was never a map to add.
 *
 * Two full class tables exist — `TRACK_ACCENTS` (Paper) and
 * `TRACK_ACCENTS_DARK` — rather than one theme-blind table, because the
 * two themes need genuinely different tuning, not just a lightness flip:
 * Paper's hues are pulled *darker* for contrast against a near-white
 * ground (see the hue-spacing math below), while dark's need to be pulled
 * *brighter/more saturated* to actually glow against `--color-bg`'s near-
 * black. `retrieve`/`embed`/`generate` sidestep this by reusing the
 * existing `--color-rag-*` tokens, which already carry their own per-theme
 * tuning (see `globals.css`) — only `azure`/`rose` (hues with no existing
 * token) need their own hand-tuned literal per table. `FoundationsJourney`
 * still only reads `TRACK_ACCENTS` (Paper) — this hasn't been asked for
 * there yet; don't extend it speculatively.
 *
 * Originally reused the app's `signal` accent plus the four `--color-rag-*`
 * tokens (retrieve/embed/generate/corpus) as the five track hues. Two of
 * those five got flagged back directly: `signal` (hue 28, "copper red") and
 * `corpus` (hue 42, close enough to `--color-status-degraded`'s warning
 * gold to read as *that* by accident) both sit within ~15° of Paper's own
 * background hue (`--color-bg` is hue 40) — on this page specifically, a
 * track chip in either color barely separated from the page it sits on.
 * `azure` and `rose` below replace them with hues chosen to sit far from
 * both the background and every other track (see the spacing math in each
 * entry's comment) — genuinely new colors for this file rather than reused
 * tokens, since none of the app's existing accents covered that gap.
 * `retrieve`/`embed`/`generate` are untouched — only the two flagged colors
 * moved.
 */
export type TrackAccent = "azure" | "retrieve" | "embed" | "generate" | "rose";

const ORDER: readonly TrackAccent[] = ["azure", "retrieve", "embed", "generate", "rose"];

export function getTrackAccent(trackIndex: number): TrackAccent {
  return ORDER[trackIndex % ORDER.length];
}

export interface TrackAccentClasses {
  /**
   * Raw `H S% L%` triple (no `hsl()` wrapper) — the same hue baked into
   * `glow` below, exposed separately for the cases a pre-built Tailwind
   * class can't cover: an inline `style` background (a zone's blurred
   * corner blobs, a card's corner color leak) where the alpha needs to be
   * computed at a value Tailwind's static class scanner can't pre-generate
   * a class for.
   */
  hue: string;
  /** Icon/label text color. */
  text: string;
  /** Low-opacity fill — an icon chip's own background, tinted just enough to read as "this track's color" without becoming a card-wide wash. */
  soft: string;
  /** Full-strength small dot/tick/underline. */
  solid: string;
  /** Border at rest. */
  border: string;
  /** A dimmer border — an idle stepper marker, a zone header's rule. */
  borderFaint: string;
  /** LessonCardCorners' hover state — the `group-hover:` modifier is baked into the literal string itself (see file header). */
  cornerHover: string;
  /** A dim tick/line — a spine, a connector segment, an upcoming lesson's tick. */
  lineFaint: string;
  /**
   * A complete literal `shadow` utility (arbitrary-value box-shadow) for
   * the "current lesson" glow ring — hand-baked per table (Tailwind can't
   * resolve a CSS variable's *value* for the alpha-blended glow it needs
   * here), so `TRACK_ACCENTS`' value is Paper-correct and
   * `TRACK_ACCENTS_DARK`'s is dark-correct.
   */
  glow: string;
  /**
   * A soft blurred halo behind the icon chip itself — dark's actual "glow"
   * (a colored light against near-black reads as a glow; the same trick on
   * Paper's near-white ground just reads as a smudge, which is why
   * `AtlasZone`'s own doc comment rules out diffuse glow there in favor of
   * flat color blocks). Empty string in `TRACK_ACCENTS` on purpose — Paper
   * never renders this.
   */
  iconGlow: string;
  /**
   * The icon chip's own elevation shadow — Paper's counterpart to
   * `iconGlow` above, not a substitute for it: a crisp, tightly-offset drop
   * shadow (two close layers, no wide blur radius) reads as "this chip sits
   * a little raised off the page," categorically different from a diffuse
   * ambient halo (still correctly rejected for Paper — see `iconGlow`'s own
   * comment). Empty string in `TRACK_ACCENTS_DARK` on purpose — a gray-ish
   * shadow is invisible against dark's own near-black chip background, and
   * `iconGlow` already carries the "this chip has depth" job there.
   */
  iconShadow: string;
}

// Every field below is a complete, literal Tailwind class — this is a
// lookup table read at runtime, not a template composing class names
// dynamically (Tailwind's static scanner needs the literal strings to
// appear in source, same convention `Badge.tsx`'s `variantClasses` and
// `PipelinePhaseDiagram`'s per-kind maps already use). `azure`/`rose` use
// arbitrary-value `hsl(...)` utilities instead of a named token (there's no
// `--color-azure`/`--color-rose` — these hues exist only here), same
// literal-hex convention `glow` already used for every entry.
export const TRACK_ACCENTS: Record<TrackAccent, TrackAccentClasses> = {
  // Track 01. Hue 212 (a clear blue) — ~164° from `generate`'s 16°, the
  // hue it sits closest to in the wheel below, and ~172° from the
  // background's hue 40: about as far from "blends with the page" as a
  // hue can get.
  azure: {
    hue: "212 70% 42%",
    text: "text-[hsl(212_70%_38%)]",
    soft: "bg-[hsl(212_70%_42%/0.1)]",
    solid: "bg-[hsl(212_70%_42%)]",
    border: "border-[hsl(212_70%_42%)]",
    borderFaint: "border-[hsl(212_70%_42%/0.3)]",
    cornerHover: "group-hover:border-[hsl(212_70%_42%/0.7)]",
    lineFaint: "bg-[hsl(212_70%_42%/0.25)]",
    glow: "shadow-[0_0_0_1px_hsl(212_70%_42%/0.4),0_20px_45px_-22px_hsl(212_70%_42%/0.45)]",
    iconGlow: "",
    iconShadow: "shadow-[0_1px_2px_hsl(212_70%_42%/0.2),0_8px_16px_-6px_hsl(212_70%_42%/0.35)]",
  },
  retrieve: {
    hue: "168 58% 36%",
    text: "text-rag-retrieve",
    soft: "bg-rag-retrieve/10",
    solid: "bg-rag-retrieve",
    border: "border-rag-retrieve",
    borderFaint: "border-rag-retrieve/30",
    cornerHover: "group-hover:border-rag-retrieve/70",
    lineFaint: "bg-rag-retrieve/25",
    glow: "shadow-[0_0_0_1px_hsl(168_58%_36%/0.4),0_20px_45px_-22px_hsl(168_58%_36%/0.45)]",
    iconGlow: "",
    iconShadow: "shadow-[0_1px_2px_hsl(168_58%_36%/0.2),0_8px_16px_-6px_hsl(168_58%_36%/0.35)]",
  },
  embed: {
    hue: "262 55% 54%",
    text: "text-rag-embed",
    soft: "bg-rag-embed/10",
    solid: "bg-rag-embed",
    border: "border-rag-embed",
    borderFaint: "border-rag-embed/30",
    cornerHover: "group-hover:border-rag-embed/70",
    lineFaint: "bg-rag-embed/25",
    glow: "shadow-[0_0_0_1px_hsl(262_55%_54%/0.4),0_20px_45px_-22px_hsl(262_55%_54%/0.45)]",
    iconGlow: "",
    iconShadow: "shadow-[0_1px_2px_hsl(262_55%_54%/0.2),0_8px_16px_-6px_hsl(262_55%_54%/0.35)]",
  },
  // Track 04. Hue 95 (an olive/chartreuse) — was `--color-rag-generate`
  // (hue 16) until a screenshot on `/foundations`' Atlas view caught it
  // reading as a second "current" marker: Paper's `--color-signal` sits at
  // hue 28, only 12° away, and at this stepper badge's small size + low
  // `borderFaint` alpha the two blend (over the same near-white `--color-bg`)
  // to nearly the same peach — so an *idle* "Distributed Systems Patterns"
  // badge looked just as "lit" as the one track actually marked current a
  // few pixels to its left. `--color-status-degraded` (hue 38-42) sits in
  // that same crowded 20-60° zone, which is why 95 was picked instead: far
  // enough from `signal`/`bg`/`status-degraded` (28/40/42) and from
  // `status-healthy` (150, the "done" checkmark's own hue — close enough to
  // read as "also done" was worth avoiding too), and from every other track
  // hue here (168/212/262/320). A dedicated literal like `azure`/`rose`
  // below, not `--color-rag-generate` reused — this is an Atlas/Journey-only
  // fix; the RAG pipeline diagrams that actually own that token are untouched.
  generate: {
    hue: "95 40% 34%",
    text: "text-[hsl(95_40%_28%)]",
    soft: "bg-[hsl(95_40%_34%/0.1)]",
    solid: "bg-[hsl(95_40%_34%)]",
    border: "border-[hsl(95_40%_34%)]",
    borderFaint: "border-[hsl(95_40%_34%/0.3)]",
    cornerHover: "group-hover:border-[hsl(95_40%_34%/0.7)]",
    lineFaint: "bg-[hsl(95_40%_34%/0.25)]",
    glow: "shadow-[0_0_0_1px_hsl(95_40%_34%/0.4),0_20px_45px_-22px_hsl(95_40%_34%/0.45)]",
    iconGlow: "",
    iconShadow: "shadow-[0_1px_2px_hsl(95_40%_34%/0.2),0_8px_16px_-6px_hsl(95_40%_34%/0.35)]",
  },
  // Track 05. Hue 320 (a magenta/orchid) — ~58° from `embed`'s 262°, ~35°
  // from `--color-status-critical`'s hue 355 (close enough to check, far
  // enough that it doesn't read as "error red"), and ~80° from the
  // background's hue 40.
  rose: {
    hue: "320 55% 45%",
    text: "text-[hsl(320_55%_40%)]",
    soft: "bg-[hsl(320_55%_45%/0.1)]",
    solid: "bg-[hsl(320_55%_45%)]",
    border: "border-[hsl(320_55%_45%)]",
    borderFaint: "border-[hsl(320_55%_45%/0.3)]",
    cornerHover: "group-hover:border-[hsl(320_55%_45%/0.7)]",
    lineFaint: "bg-[hsl(320_55%_45%/0.25)]",
    glow: "shadow-[0_0_0_1px_hsl(320_55%_45%/0.4),0_20px_45px_-22px_hsl(320_55%_45%/0.45)]",
    iconGlow: "",
    iconShadow: "shadow-[0_1px_2px_hsl(320_55%_45%/0.2),0_8px_16px_-6px_hsl(320_55%_45%/0.35)]",
  },
};

// Dark theme's table — same five tracks, same hue families (so a reader
// toggling Paper/dark sees "the same track" rather than a different color
// scheme entirely), re-tuned brighter/more saturated so each one actually
// glows against `--color-bg`'s near-black instead of reading as a muddy
// dark smudge. `retrieve`/`embed`/`generate` reuse the `--color-rag-*`
// tokens' own dark-tuned values (see `globals.css`'s `:root` block, the
// default/dark theme) for free — same classes as the Paper table, since
// the token itself already resolves differently per theme. Only
// `azure`/`rose` need a second hand-tuned literal here, same reason the
// Paper table needed one: no `--color-azure`/`--color-rose` token exists.
export const TRACK_ACCENTS_DARK: Record<TrackAccent, TrackAccentClasses> = {
  azure: {
    hue: "212 90% 65%",
    text: "text-[hsl(212_90%_72%)]",
    soft: "bg-[hsl(212_90%_60%/0.16)]",
    solid: "bg-[hsl(212_85%_58%)]",
    border: "border-[hsl(212_85%_58%)]",
    borderFaint: "border-[hsl(212_85%_58%/0.35)]",
    cornerHover: "group-hover:border-[hsl(212_85%_58%/0.8)]",
    lineFaint: "bg-[hsl(212_85%_58%/0.3)]",
    glow: "shadow-[0_0_0_1px_hsl(212_90%_65%/0.5),0_20px_50px_-20px_hsl(212_90%_65%/0.55)]",
    iconGlow: "shadow-[0_0_18px_-3px_hsl(212_90%_65%/0.65)]",
    iconShadow: "",
  },
  retrieve: {
    hue: "168 60% 55%",
    text: "text-rag-retrieve",
    soft: "bg-rag-retrieve/15",
    solid: "bg-rag-retrieve",
    border: "border-rag-retrieve",
    borderFaint: "border-rag-retrieve/35",
    cornerHover: "group-hover:border-rag-retrieve/80",
    lineFaint: "bg-rag-retrieve/30",
    glow: "shadow-[0_0_0_1px_hsl(168_60%_55%/0.5),0_20px_50px_-20px_hsl(168_60%_55%/0.55)]",
    iconGlow: "shadow-[0_0_18px_-3px_hsl(168_60%_55%/0.6)]",
    iconShadow: "",
  },
  embed: {
    hue: "262 65% 72%",
    text: "text-rag-embed",
    soft: "bg-rag-embed/15",
    solid: "bg-rag-embed",
    border: "border-rag-embed",
    borderFaint: "border-rag-embed/35",
    cornerHover: "group-hover:border-rag-embed/80",
    lineFaint: "bg-rag-embed/30",
    glow: "shadow-[0_0_0_1px_hsl(262_65%_72%/0.5),0_20px_50px_-20px_hsl(262_65%_72%/0.55)]",
    iconGlow: "shadow-[0_0_18px_-3px_hsl(262_65%_72%/0.6)]",
    iconShadow: "",
  },
  // Same hue-95 swap as the Paper table above, for the same reason — dark's
  // `--color-signal` (hue 28) and this track's old `--color-rag-generate`
  // (hue 16) are just as close here.
  generate: {
    hue: "95 45% 60%",
    text: "text-[hsl(95_45%_68%)]",
    soft: "bg-[hsl(95_45%_55%/0.16)]",
    solid: "bg-[hsl(95_42%_52%)]",
    border: "border-[hsl(95_42%_52%)]",
    borderFaint: "border-[hsl(95_42%_52%/0.35)]",
    cornerHover: "group-hover:border-[hsl(95_42%_52%/0.8)]",
    lineFaint: "bg-[hsl(95_42%_52%/0.3)]",
    glow: "shadow-[0_0_0_1px_hsl(95_45%_60%/0.5),0_20px_50px_-20px_hsl(95_45%_60%/0.55)]",
    iconGlow: "shadow-[0_0_18px_-3px_hsl(95_45%_60%/0.6)]",
    iconShadow: "",
  },
  rose: {
    hue: "320 75% 65%",
    text: "text-[hsl(320_75%_72%)]",
    soft: "bg-[hsl(320_75%_60%/0.16)]",
    solid: "bg-[hsl(320_70%_58%)]",
    border: "border-[hsl(320_70%_58%)]",
    borderFaint: "border-[hsl(320_70%_58%/0.35)]",
    cornerHover: "group-hover:border-[hsl(320_70%_58%/0.8)]",
    lineFaint: "bg-[hsl(320_70%_58%/0.3)]",
    glow: "shadow-[0_0_0_1px_hsl(320_75%_65%/0.5),0_20px_50px_-20px_hsl(320_75%_65%/0.55)]",
    iconGlow: "shadow-[0_0_18px_-3px_hsl(320_75%_65%/0.65)]",
    iconShadow: "",
  },
};
