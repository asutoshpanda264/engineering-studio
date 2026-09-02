"use client";

export type ReadingRoomView = "journey" | "atlas";

/**
 * The Journey/Atlas compare switch — extracted from
 * `FoundationsIndexView` (the original, and the only place this existed
 * before it needed to run identically on every reading room propagating
 * the same toggle) so each `*IndexView` doesn't hand-roll its own copy of
 * the same segmented control. Same hairline-bordered, mono-uppercase idiom
 * as `Badge`/`TorchToggle` — a small layout preference control, not a pair
 * of full buttons.
 */
export function ViewToggle({
  view,
  onChange,
  label,
}: {
  view: ReadingRoomView;
  onChange: (view: ReadingRoomView) => void;
  /** `aria-label` for the tablist — names which reading room this is switching, e.g. "Foundations layout". */
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="mt-1 inline-flex border border-border bg-bg-panel p-0.5">
      {(["journey", "atlas"] as const).map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={view === option}
          onClick={() => onChange(option)}
          className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors duration-fast ease-standard ${
            view === option ? "bg-signal/10 text-signal" : "text-text-subtle hover:text-text-muted"
          }`}
        >
          {option === "journey" ? "Journey" : "Atlas"}
        </button>
      ))}
    </div>
  );
}
