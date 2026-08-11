"use client";

import Link from "next/link";
import { ArrowLeft, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useFailureDemoStore } from "@/store/failureDemoStore";

export function FailureDemoHeader({
  entityName,
  entitySlug,
  failureModeName,
}: {
  entityName: string;
  entitySlug: string;
  failureModeName: string;
}) {
  const isSimulating = useFailureDemoStore((s) => s.isSimulating);
  const runSimulation = useFailureDemoStore((s) => s.runSimulation);
  const resetToBaseline = useFailureDemoStore((s) => s.resetToBaseline);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/entities/${entitySlug}`}
          className="flex items-center gap-1.5 text-sm text-text-muted transition-colors duration-fast ease-standard hover:text-text"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {entityName}
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-sm font-semibold text-text">{failureModeName}</h1>
        <Badge variant="primary">Try It</Badge>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="size-4" aria-hidden />}
          onClick={resetToBaseline}
          aria-label="Reset to the broken starting state"
          title="Discards any applied remedy and the last run, back to the broken starting architecture"
        >
          Reset
        </Button>
        <Button
          variant="primary"
          size="md"
          icon={<Play className="size-4" aria-hidden />}
          loading={isSimulating}
          onClick={runSimulation}
        >
          Run Simulation
        </Button>
      </div>
    </header>
  );
}
