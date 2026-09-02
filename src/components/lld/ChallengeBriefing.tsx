import Link from "next/link";
import { useMemo } from "react";
import { Check, Circle } from "lucide-react";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { getChallenge, evaluateChallenge } from "@/lld-modeling/challenges";
import { useLldStore, toClassDiagram } from "@/store/lldStore";

/**
 * Phase 4's "Results panel equivalent" (per `Expansion_TODO.md`) — shown
 * in place of the Inspector's plain empty state whenever a case-study
 * challenge is active, same precedent the real Workshop's
 * `InspectorPanel.tsx` sets with its scenario-briefing empty state. Stays
 * mounted (not a popover) since, unlike Lint/Pattern findings, this is the
 * whole point of being in challenge mode, not an optional aside.
 */
export function ChallengeBriefing({ challengeSlug }: { challengeSlug: string }) {
  const nodes = useLldStore((s) => s.nodes);
  const edges = useLldStore((s) => s.edges);
  const exitChallenge = useLldStore((s) => s.exitChallenge);
  const [solutionOpen, setSolutionOpen] = useState(false);

  const challenge = getChallenge(challengeSlug);
  const results = useMemo(
    () => (challenge ? evaluateChallenge(challenge, toClassDiagram(nodes, edges)) : []),
    [challenge, nodes, edges]
  );

  if (!challenge) {
    return (
      <Panel.Body className="flex flex-col gap-3">
        <p className="text-sm font-medium text-text">Unknown challenge</p>
        <p className="text-xs leading-relaxed text-text-subtle">
          That challenge id doesn&rsquo;t match any case study. It may have moved — browse them from any case-study lesson in{" "}
          <Link href="/lld" className="text-signal hover:underline">/lld</Link>.
        </p>
      </Panel.Body>
    );
  }

  const passedCount = results.filter((r) => r.passed).length;

  return (
    <>
      <Panel.Header
        title="Challenge"
        accent
        action={
          <button
            type="button"
            onClick={exitChallenge}
            className="font-mono text-[10px] uppercase tracking-wide text-text-subtle transition-colors duration-fast ease-standard hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            Exit
          </button>
        }
      />
      <Panel.Body className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text">{challenge.title}</h2>
            <Badge variant={passedCount === results.length ? "success" : "neutral"}>
              {passedCount}/{results.length}
            </Badge>
          </div>
          <p className="text-xs leading-relaxed text-text-subtle">{challenge.prompt}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-subtle">Requirements</p>
          {results.map(({ requirement, passed }) => (
            <div key={requirement.id} className="flex items-start gap-2">
              {passed ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-status-healthy" aria-hidden />
              ) : (
                <Circle className="mt-0.5 size-3.5 shrink-0 text-text-subtle" aria-hidden />
              )}
              <p className={`text-xs leading-relaxed ${passed ? "text-text-muted line-through" : "text-text"}`}>
                {requirement.label}
              </p>
            </div>
          ))}
        </div>

        <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-text-subtle">
          This checks the diagram&rsquo;s shape, not real behavior — there&rsquo;s no code to run. Check the{" "}
          <span className="font-medium text-text-muted">Lint</span> panel too: passing every requirement here
          doesn&rsquo;t mean the design itself is clean.
        </p>

        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/lld/${challenge.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-signal transition-colors duration-fast ease-standard hover:underline"
          >
            Re-read the lesson →
          </Link>
          <button
            type="button"
            onClick={() => setSolutionOpen(true)}
            className="text-xs font-medium text-signal transition-colors duration-fast ease-standard hover:underline"
          >
            Reference solution →
          </button>
        </div>
      </Panel.Body>

      <ReferenceSolutionModal slug={challenge.slug} open={solutionOpen} onClose={() => setSolutionOpen(false)} />
    </>
  );
}
