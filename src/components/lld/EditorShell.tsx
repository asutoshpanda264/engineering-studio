import Link from "next/link";
import { ArrowLeft, Download, Eraser } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { DiagramCanvas } from "@/components/lld/DiagramCanvas";
import { InspectorPanel } from "@/components/lld/InspectorPanel";
import { getChallenge } from "@/lld-modeling/challenges";
import { generateTypeScript } from "@/lld-modeling/codegen";
import { useLldStore, toClassDiagram } from "@/store/lldStore";

/**
 * Phase 5 (stretch): triggers a browser download of `generateTypeScript`'s
 * output — a real, checkable artifact, not just a preview. Plain Blob +
 * temporary-anchor pattern (no library needed for one-off text downloads);
 * the object URL is revoked right after the click so it doesn't leak.
 */
function downloadTypeScript(code: string, filename: string) {
  const blob = new Blob([code], { type: "text/typescript" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * `/lld/editor`'s top-level layout — header, canvas (with its own docked
 * palette), Inspector. Same three-region composition `WorkshopShell.tsx`
 * uses, minus the bottom playback/metrics bar: there's no simulation run
 * to play back here, so that whole region simply doesn't exist.
 */
export function EditorShell() {
  const clear = useLldStore((s) => s.reset);
  const nodes = useLldStore((s) => s.nodes);
  const edges = useLldStore((s) => s.edges);
  const activeChallengeId = useLldStore((s) => s.activeChallengeId);
  const activeChallenge = activeChallengeId ? getChallenge(activeChallengeId) : undefined;

  const handleExport = () => {
    const code = generateTypeScript(toClassDiagram(nodes, edges));
    downloadTypeScript(code, "diagram.ts");
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg font-mono">
      <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-4">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-signal/70 to-transparent"
        />
        <div className="flex items-center gap-3">
          <Link
            href="/lld"
            className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-text-muted transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated"
            aria-label="Back to Low-Level Design"
            title="Back to Low-Level Design"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            LLD
          </Link>
          <div className="h-5 w-px shrink-0 bg-border" aria-hidden />
          <h1 className="text-sm font-semibold text-text">Class Diagram Editor</h1>
          {activeChallenge && <Badge variant="primary">{activeChallenge.title}</Badge>}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="size-4" aria-hidden />}
            onClick={handleExport}
            disabled={nodes.length === 0}
            aria-label="Export as TypeScript"
            title="Download a .ts file with a class/interface stub per box on the canvas"
          >
            Export
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Eraser className="size-4" aria-hidden />}
            onClick={clear}
            aria-label="Clear diagram"
            title="Remove every class and relationship, start from a blank canvas"
          >
            Clear
          </Button>
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <DiagramCanvas />
        <InspectorPanel />
      </div>
    </div>
  );
}
