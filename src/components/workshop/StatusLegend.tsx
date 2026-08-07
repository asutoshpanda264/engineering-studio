"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { NodeStatus } from "@/store/workshopStore";

/**
 * Explains what the colored dot on each node means — without this, the
 * dots are just colors to anyone who hasn't read the code. Only the
 * statuses a run can actually produce are listed (not "disabled", which
 * nothing currently sets).
 *
 * Collapsed by default: parked over the canvas at all times, an
 * always-expanded legend blocks whatever's underneath it. Same
 * toggle-button shape as SuggestionsPanel/CostPanel for consistency.
 */
const LEGEND_ITEMS: { status: NodeStatus; label: string; dotClass: string }[] = [
  { status: "idle", label: "Idle — not reached yet", dotClass: "bg-text-subtle" },
  { status: "running", label: "Healthy", dotClass: "bg-success" },
  { status: "overloaded", label: "Near capacity", dotClass: "bg-warning" },
  { status: "error", label: "Dropping some requests", dotClass: "bg-error" },
  { status: "unavailable", label: "Crashed — rejecting almost everything", dotClass: "bg-error" },
];

export function StatusLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 rounded-lg border border-border bg-bg-elevated shadow-dropdown">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-text">Status</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close status legend"
              className="text-text-subtle transition-colors hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5 p-3">
            {LEGEND_ITEMS.map((item) => (
              <div key={item.status} className="flex items-center gap-1.5">
                <span
                  className={`size-2 shrink-0 rounded-full ${item.dotClass} ${
                    item.status === "unavailable" ? "ring-2 ring-error/30" : ""
                  }`}
                  aria-hidden
                />
                <span className="text-[11px] text-text-muted">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        icon={<Info className="size-4" aria-hidden />}
        onClick={() => setOpen((v) => !v)}
      >
        Status
      </Button>
    </div>
  );
}
