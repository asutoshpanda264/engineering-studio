"use client";

import { useEffect } from "react";
import { useFailureDemoStore } from "@/store/failureDemoStore";
import type { FailureModeDemo } from "@/lib/entityDeepDive";
import { FailureDemoHeader } from "@/components/failure-demo/FailureDemoHeader";
import { RemediesPanel } from "@/components/failure-demo/RemediesPanel";
import { FailureDemoCanvas } from "@/components/failure-demo/FailureDemoCanvas";
import { FailureDemoInspector } from "@/components/failure-demo/FailureDemoInspector";
import { FailureDemoPlaybackBar } from "@/components/failure-demo/FailureDemoPlaybackBar";
import { FailureDemoResultsBar } from "@/components/failure-demo/FailureDemoResultsBar";

/**
 * Top-level client component for `/entities/[slug]/try/[failureModeSlug]`.
 * Same four-region layout as the real Workshop (header / sidebar-equivalent
 * + canvas + inspector / bottom bar) so it reads as the same tool, just
 * scoped to one curated demo instead of a blank playground.
 */
export function FailureDemoWorkspace({
  demo,
  entityName,
  entitySlug,
  failureModeName,
}: {
  demo: FailureModeDemo;
  entityName: string;
  entitySlug: string;
  failureModeName: string;
}) {
  const loadDemo = useFailureDemoStore((s) => s.loadDemo);

  // Runs once per demo — loadDemo resets the store to this demo's fixed
  // starting architecture. Safe to depend on `demo` directly since it's a
  // static export from entityDeepDive.ts, not something that changes
  // identity across renders in a way that would cause a reset loop.
  useEffect(() => {
    loadDemo(demo);
  }, [demo, loadDemo]);

  return (
    <div className="flex h-screen w-full flex-col bg-bg">
      <FailureDemoHeader
        entityName={entityName}
        entitySlug={entitySlug}
        failureModeName={failureModeName}
      />
      <div className="flex flex-1 overflow-hidden">
        <RemediesPanel />
        <FailureDemoCanvas />
        <FailureDemoInspector />
      </div>
      <div className="flex h-24 shrink-0 border-t border-border bg-bg-elevated">
        <FailureDemoPlaybackBar />
        <FailureDemoResultsBar />
      </div>
    </div>
  );
}
