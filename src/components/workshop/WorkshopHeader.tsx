import Link from "next/link";
import { ArrowLeft, Download, Eraser, Play, RotateCcw, Settings } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PrimaryNav } from "@/components/layout/PrimaryNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { EnterWorkshopButton } from "@/components/workshop/EnterWorkshopButton";
import { TimedChallengeBar } from "@/components/workshop/TimedChallengeBar";
import { WorkshopAuthStatus } from "@/components/workshop/WorkshopAuthStatus";

export interface WorkshopHeaderProps {
  projectName: string;
  scenarioName?: string;
  isRunning?: boolean;
  onRunSimulation?: () => void;
  onReset?: () => void;
  onClear?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
}

export function WorkshopHeader({
  projectName,
  scenarioName,
  isRunning = false,
  onRunSimulation,
  onReset,
  onClear,
  onExport,
  onOpenSettings,
}: WorkshopHeaderProps) {
  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-signal/70 to-transparent"
      />
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-text-muted transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
          aria-label="Back to Engineering Studio home"
          title="Back to Engineering Studio"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Engineering Studio
        </Link>
        <div className="h-5 w-px shrink-0 bg-border" aria-hidden />
        <h1 className="min-w-0 truncate text-sm font-semibold text-text">{projectName}</h1>
        {scenarioName && <Badge variant="primary">{scenarioName}</Badge>}
        <TimedChallengeBar />
      </div>

      {/* Below `xl` (1280px), Clear/Reset/WorkshopAuthStatus's own streak
          label drop to icon-only — this row needed ~1335px with zero
          breakpoints to avoid overflowing even before auth status was
          added. Each still carries its full label via `aria-label`/
          `title` (already present for the tooltip), so collapsing the
          *visible* text loses nothing but redundant width.
          `PrimaryNav`/`WorkshopAuthStatus` navigate in the same tab —
          Workshop's canvas state lives in `workshopStore`, a module-level
          Zustand singleton that isn't torn down by a same-tab route
          change, so leaving and coming back to `/workshop` doesn't lose
          it (see the Sept 18 nav plan, item 8). */}
      <div className="flex items-center gap-2">
        <EnterWorkshopButton />

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

        <PrimaryNav />

        <div className="flex-1" aria-hidden />

        <ThemeToggle />

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

        <WorkshopAuthStatus />

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="sm"
          icon={<Download className="size-4" aria-hidden />}
          onClick={onExport}
          aria-label="Export"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Settings className="size-4" aria-hidden />}
          onClick={onOpenSettings}
          aria-label="Settings"
        />

        <div className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="sm"
          icon={<Eraser className="size-4" aria-hidden />}
          onClick={onClear}
          aria-label="Clear canvas"
          title="Remove every component and start from a blank canvas"
        >
          <span className="hidden xl:inline">Clear</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="size-4" aria-hidden />}
          onClick={onReset}
          aria-label="Reset"
          title="Re-run-ready: clears simulation results, keeps your architecture"
        >
          <span className="hidden xl:inline">Reset</span>
        </Button>
        <Button
          data-tour-id="run-simulation"
          variant="primary"
          size="md"
          icon={<Play className="size-4" aria-hidden />}
          loading={isRunning}
          onClick={onRunSimulation}
        >
          Run Simulation
        </Button>
      </div>
    </header>
  );
}
