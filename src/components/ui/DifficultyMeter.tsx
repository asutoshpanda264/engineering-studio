import { difficultyColorClass, difficultyFillColorClass } from "@/lib/difficultyDisplay";

/**
 * A signal-strength-bar reading for `Scenario.difficulty` (1-5) — the
 * visual the ASCII `[##---]` meter (`difficultyMeter` in
 * difficultyDisplay.ts) was always standing in for. That meter's own
 * comment explains why it fell back to `#`/`-` glyphs: the intended
 * Geometric Shapes block characters (▮/▯) don't exist in the `latin`
 * Google Fonts subset this app loads, so they rendered as tofu. Real bar
 * elements sidestep the font question entirely and read faster than
 * counting hashes — five bars, rising height, filled up to the level in
 * the same green/amber/red vocabulary the simulation uses for real node
 * health. Used on `/problems` (filter pills and each row); the ASCII
 * meter stays as-is everywhere else (landing teaser, Workshop dropdown)
 * as a smaller, scoped change.
 */
export function DifficultyMeter({
  level,
  showLabel = true,
}: {
  level: number;
  showLabel?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-end gap-[3px]" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`w-1 transition-colors duration-fast ease-standard ${
              i <= level ? difficultyFillColorClass(level) : "bg-border"
            }`}
            style={{ height: `${5 + i * 2}px` }}
          />
        ))}
      </span>
      {showLabel && (
        <span className={`font-mono text-[11px] tracking-wide ${difficultyColorClass(level)}`}>
          {level}/5
        </span>
      )}
    </span>
  );
}
