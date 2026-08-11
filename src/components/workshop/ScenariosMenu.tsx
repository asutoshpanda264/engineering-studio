"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWorkshopStore } from "@/store/workshopStore";
import { SCENARIOS } from "@/scenarios";
import type { Scenario } from "@/scenarios";

/** Same bracket-meter + severity-color language used everywhere else a
    scenario's difficulty is shown (landing page, this dropdown). */
function difficultyMeter(difficulty: number): string {
  return "▮".repeat(difficulty) + "▯".repeat(5 - difficulty);
}

function difficultyColorClass(difficulty: number): string {
  if (difficulty <= 2) return "text-status-healthy";
  if (difficulty === 3) return "text-status-degraded";
  return "text-status-critical";
}

/**
 * Was a permanent tab inside ComponentSidebar, competing with Components
 * for a single strip of screen real estate every time a scenario wasn't
 * being actively browsed. Picking a scenario is an occasional, deliberate
 * action — same shape as Learn (a header-level jump), not a build-surface
 * primitive — so it now lives here as a dropdown, next to Learn.
 *
 * Same collapsed-by-default, click-to-toggle panel as StatusLegend.
 */
export function ScenariosMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeScenarioId = useWorkshopStore((s) => s.activeScenarioId);
  const loadScenario = useWorkshopStore((s) => s.loadScenario);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Capture phase, not bubble: React Flow's pane stops propagation on its
    // own mousedown handler (for drag/pan), so a bubble-phase listener here
    // never sees a click on the canvas — the dropdown would stay open over
    // the single largest click target on the screen. Capture fires on the
    // way down, before that stopPropagation can take effect.
    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (id: string) => {
    loadScenario(id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        icon={<ClipboardList className="size-4" aria-hidden />}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Scenarios
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Scenarios"
          className="absolute right-0 top-full z-20 mt-2 w-80 rounded-lg border border-border bg-bg-elevated shadow-dropdown"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-medium text-text">Scenarios</p>
            <p className="text-[11px] text-text-subtle">
              Loading one replaces the current architecture with its starting point.
            </p>
          </div>
          <div className="flex max-h-96 flex-col gap-1.5 overflow-y-auto p-2">
            {SCENARIOS.map((scenario) => (
              <ScenarioMenuItem
                key={scenario.id}
                scenario={scenario}
                active={scenario.id === activeScenarioId}
                onSelect={() => handleSelect(scenario.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioMenuItem({
  scenario,
  active,
  onSelect,
}: {
  scenario: Scenario;
  active: boolean;
  onSelect: () => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={`flex flex-col gap-1.5 rounded-md border p-2.5 text-left transition-all duration-fast ease-standard
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated
        ${
          active
            ? "cursor-default border-signal/40 bg-signal/10"
            : "cursor-pointer border-transparent hover:border-border-hover hover:bg-bg-panel"
        }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-text">{scenario.title}</p>
        {active && <Badge variant="primary">Active</Badge>}
      </div>
      <p className={`text-[11px] tracking-wide ${difficultyColorClass(scenario.difficulty)}`}>
        {difficultyMeter(scenario.difficulty)}{" "}
        <span className="text-text-subtle">{scenario.difficulty}/5</span>
      </p>
      <p className="line-clamp-2 text-xs text-text-subtle">{scenario.story}</p>
    </div>
  );
}
