"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Generic "mark this lesson read" toggle for `/lld` and `/agentic` — same
 * deliberate-click shape `/foundations`' own `MarkCompleteButton` uses (no
 * scroll-position/"reached the bottom" heuristic exists anywhere in this
 * codebase), just without that one's locking-specific copy ("opens what
 * comes next on the map") — nothing is gated on these two maps, marking a
 * lesson complete only turns its own node green.
 */
export function MarkCompleteButton({
  isComplete,
  onMarkComplete,
  onMarkIncomplete,
}: {
  isComplete: boolean;
  onMarkComplete: () => void;
  onMarkIncomplete: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-bg-panel p-4">
      <p className="text-sm text-text-muted">
        {isComplete ? "Marked complete — it's green on the map." : "Done with this one? Mark it complete to track it on the map."}
      </p>
      <Button
        type="button"
        variant={isComplete ? "secondary" : "primary"}
        size="sm"
        icon={<Check className="size-3.5" aria-hidden />}
        onClick={isComplete ? onMarkIncomplete : onMarkComplete}
      >
        {isComplete ? "Completed" : "Mark complete"}
      </Button>
    </div>
  );
}
