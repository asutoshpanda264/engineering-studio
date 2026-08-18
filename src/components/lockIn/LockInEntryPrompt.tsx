"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BatMark } from "@/components/theme/icons/BatMark";
import { resolveLockInChapters } from "@/content/lockIn/resolveChapters";
import { villainForChapter, type LockInLessonRef } from "@/content/lockIn/villains";
import { startLockIn, useLockInState } from "@/lib/lockInMode";

/**
 * Watches for the theme toggle landing on `night-ops` while reading a
 * lesson, and offers to start a lock-in run from here — this replaces an
 * earlier static "Start Lock-In" card that only ever appeared on one
 * curated lesson. Now any lesson qualifies (as long as 2 more follow it
 * in the same course, see `resolveLockInChapters`), so the entry point
 * moved from "a card on a specific page" to "a reaction to the one
 * action — flipping into Batman Mode — that means the same thing on
 * every lesson." Declining just leaves the theme switched; it doesn't
 * revert it, since the toggle already did its own job.
 */
export function LockInEntryPrompt({ courseModule, slug }: LockInLessonRef) {
  const { theme } = useTheme();
  const state = useLockInState();
  const previousTheme = useRef(theme);
  const [open, setOpen] = useState(false);

  const chapters = resolveLockInChapters(courseModule, slug);

  useEffect(() => {
    const enteredNightOps = previousTheme.current !== "night-ops" && theme === "night-ops";
    previousTheme.current = theme;
    if (enteredNightOps && !state.active && chapters) {
      setOpen(true);
    }
  }, [theme, state.active, chapters]);

  if (!chapters) return null;

  const villain = villainForChapter(0);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={
        <span className="flex items-center gap-2">
          <BatMark className="size-4 text-signal" aria-hidden />
          Enter Batman Mode?
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="primary">Chapter 1: {villain.name}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-text-muted">
          Lock in for this lesson and the next two, back to back — {villain.name}, then the
          Joker, then Bane, one defeated per lesson finished. No pressure to say yes — the theme
          is already switched either way.
        </p>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              startLockIn(chapters);
              setOpen(false);
            }}
          >
            Start Lock-In
          </Button>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Not now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
