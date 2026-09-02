import { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Bug, ExternalLink, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useLldStore, toClassDiagram } from "@/store/lldStore";
import { lintClassDiagram } from "@/lld-modeling/linter";
import type { LintFinding, LintSeverity } from "@/lld-modeling/linter";

const SEVERITY_ICON: Record<LintSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const SEVERITY_CLASSES: Record<LintSeverity, string> = {
  critical: "border-status-critical/40 text-status-critical",
  warning: "border-status-degraded/40 text-status-degraded",
  info: "border-signal/40 text-signal",
};

/**
 * The `/lld/editor` equivalent of `SuggestionsPanel.tsx` — same popover-
 * off-a-corner-button shape, severity-colored cards, badge count of the
 * worst tier. One real difference: there's no "run" step for a static
 * diagram, so this recomputes from the live canvas on every render
 * instead of gating on a finished simulation result. Diagrams here stay
 * small (tens of nodes, not thousands), so relinting on every keystroke
 * is cheap — no memo/debounce needed for a "correct editor" milestone.
 */
export function LintPanel() {
  const [open, setOpen] = useState(false);
  const nodes = useLldStore((s) => s.nodes);
  const edges = useLldStore((s) => s.edges);
  const setSelected = useLldStore((s) => s.setSelected);

  const findings = useMemo(() => lintClassDiagram(toClassDiagram(nodes, edges)), [nodes, edges]);
  const criticalCount = findings.filter((f) => f.severity === "critical").length;

  if (nodes.length === 0) return null;

  return (
    <div className="absolute bottom-3 right-3 z-30 flex flex-col items-end gap-2">
      {open && (
        <div className="max-h-96 w-80 overflow-auto border border-border bg-bg-elevated shadow-dropdown">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-text">Lint</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close lint findings"
              className="text-text-subtle transition-colors hover:text-text"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-col gap-2 p-3">
            {findings.length === 0 ? (
              <p className="text-xs leading-relaxed text-text-subtle">
                Nothing to flag — every class stays reasonably sized, no
                override just throws, nothing depends on a concrete class
                an interface already sits behind, and no method cluster or
                sibling-implementation shape suggests a Strategy or Factory
                Method.
              </p>
            ) : (
              findings.map((finding, i) => (
                <FindingCard
                  key={i}
                  finding={finding}
                  onSelect={() => {
                    if (finding.edgeId) setSelected(finding.edgeId, "edge");
                    else if (finding.classId) setSelected(finding.classId, "node");
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
      <Button
        variant={criticalCount > 0 ? "primary" : "secondary"}
        size="sm"
        icon={<Bug className="size-4" aria-hidden />}
        onClick={() => setOpen((v) => !v)}
      >
        Lint{findings.length > 0 ? ` (${findings.length})` : ""}
      </Button>
    </div>
  );
}

function FindingCard({ finding, onSelect }: { finding: LintFinding; onSelect: () => void }) {
  const Icon = SEVERITY_ICON[finding.severity];
  const clickable = Boolean(finding.classId || finding.edgeId);

  // The main body is a `<button>` (click-to-select on canvas); the
  // "Learn more" link is a sibling `<a>` rather than nested inside it —
  // interactive elements can't nest, and only the two pattern rules ever
  // set `relatedLessonHref` in the first place.
  return (
    <div
      className={`border-l-2 bg-bg-panel py-1.5 pl-2.5 pr-2 ${SEVERITY_CLASSES[finding.severity]}`}
    >
      <button
        type="button"
        onClick={clickable ? onSelect : undefined}
        disabled={!clickable}
        className={`w-full text-left ${clickable ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex items-start gap-1.5">
          <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Badge variant="neutral" className="!py-0">{finding.category}</Badge>
              <p className="truncate text-xs font-medium text-text">{finding.title}</p>
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-text-muted">
              {finding.description}
            </p>
          </div>
        </div>
      </button>
      {finding.relatedLessonHref && (
        <a
          href={finding.relatedLessonHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center gap-1 pl-5 text-[11px] font-medium text-signal transition-colors duration-fast ease-standard hover:underline"
          title="Opens in a new tab — the editor has no autosave, so this keeps your diagram from being lost"
        >
          Learn more <ExternalLink className="size-2.5" aria-hidden />
        </a>
      )}
    </div>
  );
}
