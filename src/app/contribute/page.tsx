"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { PenLine } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/auth/authStore";
import { getMyContributions, submitContribution } from "@/lib/api/contributions";
import { applyToContribute, getMyContributorApplications } from "@/lib/api/contributorApplications";
import { ApiError } from "@/lib/api/client";
import type {
  ContributionCategory,
  ContributionResponse,
  ContributionStatus,
  ContributorApplicationResponse,
} from "@/lib/api/types";

const CATEGORY_OPTIONS = [
  { value: "QUESTION", label: "Interview question" },
  { value: "POST", label: "Post" },
  { value: "VLOG", label: "Vlog (link to external video)" },
];

const STATUS_LABEL: Record<ContributionStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_BADGE_VARIANT: Record<ContributionStatus, "warning" | "success" | "error"> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "error",
};

type LoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; rows: ContributionResponse[] };

/**
 * CONTRIBUTOR/ADMIN-only: submit a QUESTION/POST/VLOG for admin review,
 * and see the status of everything already submitted. A separate,
 * DB-backed "Community" pipeline (`contribution.*` on the backend) — not
 * a change to the existing static `src/content/*` files, per the Sept 18
 * nav plan's Phase B. Points are fixed per category and only ever
 * awarded on approval (`pointsAwarded` stays 0 until then).
 */
export default function ContributePage() {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { user, status: authStatus } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const [category, setCategory] = useState<ContributionCategory>("QUESTION");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const canContribute = user?.role === "CONTRIBUTOR" || user?.role === "ADMIN";

  function loadMine() {
    setState({ kind: "loading" });
    getMyContributions()
      .then((rows) => setState({ kind: "ready", rows }))
      .catch(() => setState({ kind: "error" }));
  }

  useEffect(() => {
    if (!canContribute) return;
    let cancelled = false;
    getMyContributions()
      .then((rows) => {
        if (!cancelled) setState({ kind: "ready", rows });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [canContribute]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await submitContribution({ category, title, body, link: link.trim() ? link.trim() : null });
      setTitle("");
      setBody("");
      setLink("");
      loadMine();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-bg">
      <PageMeshBackground isLight={isLight} />

      <AppHeader back={{ href: "/problems", label: "Problems" }} maxWidthClassName="max-w-3xl" />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium text-text">
            <PenLine className="size-5 text-signal" aria-hidden />
            Contribute
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Submit an interview question, a post, or a vlog for review. Approved contributions earn fixed points
            per category.
          </p>
        </div>

        {authStatus !== "ready" ? null : !user ? (
          <Panel className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-text-muted">Sign in as a contributor to submit content.</p>
            <LinkButton href="/login">Sign In</LinkButton>
          </Panel>
        ) : !canContribute ? (
          <ContributorApplicationPanel />
        ) : (
          <>
            <Panel className="p-5">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Select
                  label="Category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ContributionCategory)}
                  options={CATEGORY_OPTIONS}
                />
                <Input
                  label="Title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={fieldErrors.title}
                />
                <Textarea
                  label="Body"
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  error={fieldErrors.body}
                />
                <Input
                  label="Link (optional — mainly for a vlog)"
                  type="url"
                  placeholder="https://…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  error={fieldErrors.link}
                />
                {error && !Object.keys(fieldErrors).length && (
                  <p className="text-sm text-status-critical">{error}</p>
                )}
                <Button type="submit" variant="primary" loading={submitting} className="mt-2 self-start">
                  Submit for review
                </Button>
              </form>
            </Panel>

            <Panel className="overflow-hidden">
              {state.kind === "loading" ? (
                <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
              ) : state.kind === "error" ? (
                <p className="p-6 text-center text-sm text-status-critical">
                  Couldn&apos;t load your submissions right now.
                </p>
              ) : state.rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">Nothing submitted yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
                      <th className="px-4 py-2 font-medium">Title</th>
                      <th className="px-4 py-2 font-medium">Category</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.rows.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2.5 text-text">{row.title}</td>
                        <td className="px-4 py-2.5 text-text-muted">{row.category}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={STATUS_BADGE_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-text">
                          {row.pointsAwarded > 0 ? row.pointsAwarded : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </>
        )}
      </div>
    </main>
  );
}

type ApplicationLoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; applications: ContributorApplicationResponse[] };

/**
 * Self-service "Apply to be a Contributor" — a plain USER's only path
 * into the CONTRIBUTOR role now (2026-09-19 chat), replacing the old
 * static "reach out to an admin" message. No form fields: an admin's
 * decision is based on the applicant's own real stats (solved count,
 * points, daily streak), not a written pitch — see
 * `ContributorApplicationPriority` on the backend. `findByApplicantId...
 * OrderByCreatedAtDesc` means `applications[0]` is always the most recent
 * one, which is all this needs to decide what to show.
 */
function ContributorApplicationPanel() {
  const [state, setState] = useState<ApplicationLoadState>({ kind: "loading" });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setState({ kind: "loading" });
    getMyContributorApplications()
      .then((applications) => setState({ kind: "ready", applications }))
      .catch(() => setState({ kind: "error" }));
  }

  useEffect(() => {
    let cancelled = false;
    getMyContributorApplications()
      .then((applications) => {
        if (!cancelled) setState({ kind: "ready", applications });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleApply() {
    setApplying(true);
    setError(null);
    try {
      await applyToContribute();
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setApplying(false);
    }
  }

  const latest = state.kind === "ready" ? (state.applications[0] ?? null) : null;

  return (
    <Panel className="flex flex-col items-center gap-3 p-8 text-center">
      {state.kind === "loading" ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : state.kind === "error" ? (
        <p className="text-sm text-status-critical">Couldn&apos;t load your application status right now.</p>
      ) : latest?.status === "PENDING" ? (
        <>
          <Badge variant="warning">Pending review</Badge>
          <p className="text-sm text-text-muted">
            Your application to become a contributor is with an admin now — we&apos;ll let you know once it&apos;s
            reviewed.
          </p>
        </>
      ) : latest?.status === "APPROVED" ? (
        <>
          <Badge variant="success">Approved</Badge>
          <p className="text-sm text-text-muted">
            You&apos;re approved as a contributor — sign out and back in to pick up your new access.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-text-muted">
            Contributing is open to accounts with contributor access. Admins review applications ranked by your
            problems solved, points, and daily streak.
          </p>
          {latest?.status === "REJECTED" && (
            <p className="text-xs text-text-subtle">Your last application wasn&apos;t approved — you can apply again.</p>
          )}
          {error && <p className="text-sm text-status-critical">{error}</p>}
          <Button variant="primary" loading={applying} onClick={handleApply}>
            Apply to be a Contributor
          </Button>
        </>
      )}
    </Panel>
  );
}
