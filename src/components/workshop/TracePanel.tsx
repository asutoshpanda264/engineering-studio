"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Radio, ShieldAlert, X } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { formatOtelTraces } from "@/simulation/playback/otelTraceFormatter";
import type { OtelSpan, OtelTrace } from "@/simulation/playback/otelTraceFormatter";
import type { EntityId, EntityType } from "@/simulation/types";

/** Keeps the panel legible on a long-running simulation — newest traces first, oldest simply not shown. */
const MAX_TRACES_SHOWN = 15;

/**
 * The Agentic domain's OTel-shaped playback view — `docs/Agentic_AI.md`
 * §2.4: real `gen_ai.*` span attribute names, one `invoke_agent` root per
 * request, nested `chat`/`execute_tool`/... children sharing one
 * `trace_id`, the same shape a reader would see in Datadog/Arize/
 * LangSmith. Purely a formatter over data the engine already produces
 * (`otelTraceFormatter.ts`) — this component only renders it.
 *
 * Self-contained: renders nothing (not even its own toggle button) unless
 * the canvas has at least one agentic-domain entity on it, the same
 * "invisible outside its own domain" pattern `VillainAttackPicker.tsx`
 * uses for Batman Mode.
 */
export function TracePanel() {
  const open = useWorkshopStore((s) => s.tracePanelOpen);
  const setOpen = useWorkshopStore((s) => s.setTracePanelOpen);
  const nodes = useWorkshopStore((s) => s.nodes);
  const events = useWorkshopStore((s) => s.playbackVisibleEvents);

  const isAgenticCanvas = useMemo(
    () => nodes.some((n) => getEntityCatalogItem(n.data.entityType).domain === "agentic"),
    [nodes]
  );

  const traces = useMemo(() => {
    if (!events || events.length === 0) return [];
    const entityTypes: Record<EntityId, EntityType> = {};
    const entityLabels: Record<EntityId, string> = {};
    const entityConfigs: Record<EntityId, Record<string, unknown>> = {};
    for (const node of nodes) {
      entityTypes[node.id] = node.data.entityType;
      entityLabels[node.id] = node.data.label;
      entityConfigs[node.id] = node.data.config;
    }
    return formatOtelTraces(events, entityTypes, entityLabels, entityConfigs).slice(
      0,
      MAX_TRACES_SHOWN
    );
  }, [events, nodes]);

  if (!isAgenticCanvas) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex shrink-0 items-center gap-1.5 border-l border-border px-3 text-xs text-text-muted transition-colors hover:text-text"
        aria-pressed={open}
      >
        <Radio className="size-3.5 shrink-0" aria-hidden />
        Trace{traces.length > 0 ? ` (${traces.length})` : ""}
      </button>
      {open && (
        <div className="fixed bottom-24 left-0 right-80 z-20 flex h-80 flex-col border-t border-border bg-bg-elevated shadow-lg">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
            <div className="flex items-center gap-2">
              <Radio className="size-3.5 text-text-subtle" aria-hidden />
              <h2 className="text-xs font-medium uppercase tracking-wide text-text-subtle">
                Trace — {traces.length} of {events?.length ? "run" : "0"} request
                {traces.length === 1 ? "" : "s"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-text-subtle transition-colors hover:text-text"
              aria-label="Close trace panel"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {traces.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-subtle">
                Run a simulation to see traces here.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {traces.map((trace) => (
                  <TraceRow key={trace.traceId} trace={trace} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TraceRow({ trace }: { trace: OtelTrace }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded border border-border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
      >
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-text-subtle" aria-hidden />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-text-subtle" aria-hidden />
        )}
        <span className="font-mono text-text-subtle">{trace.traceId}</span>
        <OutcomeBadge trace={trace} />
        <span className="ml-auto shrink-0 text-text-subtle">{trace.durationMs.toFixed(0)}ms</span>
      </button>
      {expanded && (
        <div className="border-t border-border px-2 py-1.5">
          <SpanRow span={trace.rootSpan} depth={0} />
        </div>
      )}
    </li>
  );
}

function OutcomeBadge({ trace }: { trace: OtelTrace }) {
  if (trace.compromised) {
    return (
      <span className="flex items-center gap-1 rounded bg-status-degraded/15 px-1.5 py-0.5 text-status-degraded">
        <ShieldAlert className="size-3 shrink-0" aria-hidden />
        compromised{trace.outcome === "completed" ? " — looked like success" : ""}
      </span>
    );
  }
  if (trace.outcome === "failed") {
    return (
      <span className="flex items-center gap-1 rounded bg-status-critical/15 px-1.5 py-0.5 text-status-critical">
        <AlertTriangle className="size-3 shrink-0" aria-hidden />
        failed
      </span>
    );
  }
  if (trace.outcome === "in_progress") {
    return <span className="rounded bg-text-subtle/15 px-1.5 py-0.5 text-text-subtle">in progress</span>;
  }
  return <span className="rounded bg-status-healthy/15 px-1.5 py-0.5 text-status-healthy">completed</span>;
}

function SpanRow({ span, depth }: { span: OtelSpan; depth: number }) {
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 text-xs"
        style={{ paddingLeft: `${depth * 16}px` }}
      >
        <span
          className={`rounded px-1.5 py-0.5 font-mono ${
            span.status === "error"
              ? "bg-status-critical/15 text-status-critical"
              : "bg-signal/10 text-signal"
          }`}
        >
          {span.name}
        </span>
        <span className="truncate text-text">{span.entityLabel}</span>
        <span className="shrink-0 text-text-subtle">
          {(span.endMs - span.startMs).toFixed(0)}ms
        </span>
        {span.status === "error" && (
          <span className="shrink-0 text-status-critical">{span.errorReason}</span>
        )}
      </div>
      {Object.keys(span.attributes).length > 0 && (
        <div
          className="flex flex-wrap gap-x-3 gap-y-0.5 pb-1 font-mono text-[10px] text-text-subtle"
          style={{ paddingLeft: `${depth * 16 + 20}px` }}
        >
          {Object.entries(span.attributes).map(([key, value]) => (
            <span key={key}>
              {key}=<span className="text-text-muted">{String(value)}</span>
            </span>
          ))}
        </div>
      )}
      {span.children.map((child) => (
        <SpanRow key={child.spanId} span={child} depth={depth + 1} />
      ))}
    </div>
  );
}
