import Link from "next/link";
import { BookOpen, Download, LayoutTemplate, Play, RotateCcw, Settings } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export interface WorkshopHeaderProps {
  projectName: string;
  scenarioName?: string;
  isRunning?: boolean;
  onRunSimulation?: () => void;
  onReset?: () => void;
  onOpenTemplates?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
}

export function WorkshopHeader({
  projectName,
  scenarioName,
  isRunning = false,
  onRunSimulation,
  onReset,
  onOpenTemplates,
  onExport,
  onOpenSettings,
}: WorkshopHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-text">{projectName}</h1>
        {scenarioName && <Badge variant="primary">{scenarioName}</Badge>}
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/entities"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-bg-elevated hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          aria-label="Learn — open the entity reference in a new tab"
          title="Opens in a new tab — your canvas stays exactly as it is"
        >
          <BookOpen className="size-4" aria-hidden />
          Learn
        </Link>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="sm"
          icon={<LayoutTemplate className="size-4" aria-hidden />}
          onClick={onOpenTemplates}
          aria-label="Templates"
        >
          Templates
        </Button>
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

        <div className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          variant="secondary"
          size="sm"
          icon={<RotateCcw className="size-4" aria-hidden />}
          onClick={onReset}
        >
          Reset
        </Button>
        <Button
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
