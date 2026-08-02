import type { NodeStatus } from "@/store/workshopStore";

/**
 * Explains what the colored dot on each node means — without this, the
 * dots are just colors to anyone who hasn't read the code. Only the
 * statuses a run can actually produce are listed (not "disabled", which
 * nothing currently sets).
 */
const LEGEND_ITEMS: { status: NodeStatus; label: string; dotClass: string }[] = [
  { status: "idle", label: "Idle — not reached yet", dotClass: "bg-text-subtle" },
  { status: "running", label: "Healthy", dotClass: "bg-success" },
  { status: "overloaded", label: "Near capacity", dotClass: "bg-warning" },
  { status: "error", label: "Dropping some requests", dotClass: "bg-error" },
  { status: "unavailable", label: "Crashed — rejecting almost everything", dotClass: "bg-error" },
];

export function StatusLegend() {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2 shadow-elevated">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-subtle">
        Status
      </p>
      <div className="flex flex-col gap-1">
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
  );
}
