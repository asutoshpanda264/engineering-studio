"use client";

import { Badge } from "@/components/ui/Badge";
import { BatMark } from "@/components/theme/icons/BatMark";
import type { LockInVillain } from "@/content/lockIn/villains";
import type { LockInChapter } from "@/lib/lockInMode";

/**
 * Shown on a lesson page that matches the active run's *current* chapter
 * (see `LockInPanel`). The actual "Defeat" action lives further down the
 * page, near Summary/Exercise (`LockInChapterAction`) — this component is
 * purely informational: which villain, which chapter, and (once past
 * chapter 1) a one-line recap of whichever villain was just defeated to
 * get here, since that villain's `defeatLine` has nowhere else to show —
 * `completeCurrentChapter()` navigates straight to this page, there's no
 * separate "you defeated them" interstitial.
 */
export function LockInChapterBanner({
  chapter,
  chapterIndex,
  precedingVillain,
}: {
  chapter: LockInChapter;
  chapterIndex: 0 | 1 | 2;
  /** The villain defeated immediately before this chapter, if any (undefined on chapter 1). */
  precedingVillain?: LockInVillain;
}) {
  return (
    <div className="border border-signal/40 bg-bg-panel p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BatMark className="size-4 text-signal" aria-hidden />
          <Badge variant="primary">Lock-In Active</Badge>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wide text-text-subtle">
          Chapter {chapterIndex + 1} of 3
        </span>
      </div>

      {precedingVillain && (
        <p className="mb-4 border-l-2 border-status-healthy/50 pl-4 text-sm leading-relaxed text-status-healthy">
          ✓ {precedingVillain.defeatLine}
        </p>
      )}

      <h2 className="text-lg font-semibold text-text">
        {chapter.villain.name} <span className="text-text-muted">— {chapter.villain.epithet}</span>
      </h2>

      <p className="mt-3 border-l-2 border-signal/50 pl-4 text-sm italic leading-relaxed text-text-muted">
        “{chapter.villain.taunt}”
      </p>

      <p className="mt-4 text-sm leading-relaxed text-text-muted">
        Defeat {chapter.villain.name} at the end of this lesson to continue.
      </p>
    </div>
  );
}
