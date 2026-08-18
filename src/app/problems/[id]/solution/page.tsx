import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { LinkButton } from "@/components/ui/LinkButton";
import { Badge } from "@/components/ui/Badge";
import { ArticleSection } from "@/components/ui/ArticleSection";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { GraphDiagram } from "@/components/content/diagrams/generic/GraphDiagram";
import type { GraphDiagramEdge, GraphDiagramNode } from "@/content/shared/lesson";
import { getScenario, SCENARIOS, SCENARIO_TOPIC_LABEL } from "@/scenarios";
import { getEntityCatalogItem } from "@/lib/entityCatalog";
import { difficultyColorClass, difficultyMeter } from "@/lib/difficultyDisplay";
import type { OptimalSolution } from "@/scenarios";

export function generateStaticParams() {
  return SCENARIOS.filter((s) => s.optimalSolution).map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario) return {};
  return {
    title: `${scenario.title} — Solution — Engineering Studio`,
    description: scenario.optimalSolution?.summary,
  };
}

/**
 * `optimalSolution.entities/connections` → `GraphDiagram`'s node/edge
 * shape. Free x/y positions carry over 1:1 (a scenario entity's own
 * `position`) — `GraphDiagram` was picked over `ArchitectureDiagram`'s
 * col/row grid specifically because it wouldn't misrepresent the
 * reference build's actual layout (see `GraphDiagram.tsx`'s own header).
 * `typeLabel` only renders when it adds information — most scenario
 * entities already label themselves with the plain catalog name (e.g.
 * "Client", "Cache"), so a second identical line would just be noise;
 * it only shows up for a relabeled or numbered node (e.g. "API Server 2").
 */
function toGraphDiagram(solution: OptimalSolution): { nodes: GraphDiagramNode[]; edges: GraphDiagramEdge[] } {
  const nodes: GraphDiagramNode[] = solution.entities.map((entity) => {
    const catalogName = getEntityCatalogItem(entity.type).name;
    return {
      id: entity.id,
      label: entity.label,
      x: entity.position.x,
      y: entity.position.y,
      typeLabel: entity.label === catalogName ? undefined : catalogName,
    };
  });
  const edges: GraphDiagramEdge[] = solution.connections.map((connection) => ({
    from: connection.source,
    to: connection.target,
    label: "",
  }));
  return { nodes, edges };
}

export default async function ProblemSolutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scenario = getScenario(id);
  if (!scenario?.optimalSolution) notFound();

  const solution = scenario.optimalSolution;
  const { nodes, edges } = toGraphDiagram(solution);

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-10 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href="/problems"
            className="flex items-center gap-2 font-mono text-xs uppercase tracking-wide text-text-muted transition-colors duration-fast ease-standard hover:text-signal"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Problems
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <LinkButton href={`/workshop?scenario=${scenario.id}`} variant="secondary" size="sm" className="bg-bg-elevated">
              Try it yourself
            </LinkButton>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <div className="mb-10 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {scenario.topics.map((topic) => (
              <Badge key={topic} variant="neutral">
                {SCENARIO_TOPIC_LABEL[topic]}
              </Badge>
            ))}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">{scenario.title} — Solution</h1>
          <p className={`font-mono text-[11px] tracking-wide ${difficultyColorClass(scenario.difficulty)}`}>
            {difficultyMeter(scenario.difficulty)} {scenario.difficulty}/5
          </p>
          <p className="max-w-xl text-sm text-text-muted">{scenario.story}</p>
        </div>

        <ArticleSection index={1} id="reference-build" title="Reference build" emphasized>
          <div className="mb-4 flex items-start gap-2 border border-signal/40 bg-signal/5 px-4 py-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
            <p className="text-sm text-text">{solution.summary}</p>
          </div>
          <div className="border border-border bg-bg-panel p-4">
            <GraphDiagram nodes={nodes} edges={edges} />
          </div>
          <p className="mt-3 text-xs text-text-subtle">
            A strong, hand-tuned reference — not proven mathematically maximal. A build that beats
            its score earns this scenario&apos;s &ldquo;legendary&rdquo; tier.
          </p>
        </ArticleSection>

        <div className="mt-10">
          <ArticleSection index={2} id="editorial" title="Why this shape">
            <div className="flex flex-col gap-4">
              {solution.editorial.map((paragraph, i) => (
                <p key={i} className="text-sm leading-relaxed text-text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </ArticleSection>
        </div>

        <div className="mt-10 flex justify-center">
          <LinkButton href={`/workshop?scenario=${scenario.id}`}>Build it yourself</LinkButton>
        </div>
      </div>
    </main>
  );
}
