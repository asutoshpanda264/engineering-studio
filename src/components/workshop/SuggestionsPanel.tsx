"use client";

import { useState } from "react";
import { AlertCircle, AlertTriangle, Info, Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useWorkshopStore } from "@/store/workshopStore";
import { getSuggestions } from "@/lib/suggestionEngine";
import type { Suggestion, SuggestionSeverity } from "@/lib/suggestionEngine";

const SEVERITY_ICON: Record<SuggestionSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_CLASSES: Record<SuggestionSeverity, string> = {
  critical: "border-error/40 text-error",
  warning: "border-warning/40 text-warning",
  info: "border-primary/40 text-primary",
};

/**
 * Button + popover analyzing the last run and suggesting concrete fixes
 * (WORKSHOP-UI.md §17 — "Errors should educate... suggest solutions").
 * Lives on the canvas rather than the Inspector/results bar so it works
 * regardless of what's selected.
 */
export function SuggestionsPanel() {
  const [open, setOpen] = useState(false);
  const result = useWorkshopStore((s) => s.simulationResult);
  const nodes = useWorkshopStore((s) => s.nodes);

  if (!result) return null;

  const suggestions = getSuggestions(result, nodes);
  const criticalCount = suggestions.filter((s) => s.severity === "critical").length;

  return (
    <div className="flex flex-col items-end gap-2">
      {open && (
        <div className="max-h-96 w-80 overflow-auto rounded-lg border border-border bg-bg-elevated shadow-dropdown">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-text">Suggestions</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close suggestions"
              className="text-text-subtle transition-colors hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {suggestions.map((suggestion, i) => (
              <SuggestionCard key={i} suggestion={suggestion} />
            ))}
          </div>
        </div>
      )}
      <Button
        variant={criticalCount > 0 ? "primary" : "secondary"}
        size="sm"
        icon={<Lightbulb className="size-4" aria-hidden />}
        onClick={() => setOpen((v) => !v)}
      >
        Suggestions{criticalCount > 0 ? ` (${criticalCount})` : ""}
      </Button>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const Icon = SEVERITY_ICON[suggestion.severity];
  return (
    <div className={`rounded-md border-l-2 bg-bg-panel py-1.5 pl-2.5 pr-2 ${SEVERITY_CLASSES[suggestion.severity]}`}>
      <div className="flex items-start gap-1.5">
        <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text">{suggestion.title}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
            {suggestion.description}
          </p>
        </div>
      </div>
    </div>
  );
}
