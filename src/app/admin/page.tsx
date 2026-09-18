"use client";

import { useEffect, useState } from "react";
import { Bug, Check, ShieldCheck, X } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LinkButton } from "@/components/ui/LinkButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/lib/auth/authStore";
import { approveContribution, getPendingContributions, rejectContribution } from "@/lib/api/contributions";
import { getAllBugReports, reviewBugReport } from "@/lib/api/bugReports";
import type { BugReportResponse, BugReportStatus, PendingContributionResponse } from "@/lib/api/types";

const CATEGORY_LABEL: Record<string, string> = {
  QUESTION: "Question",
  POST: "Post",
  VLOG: "Vlog",
};

const BUG_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "RESOLVED", label: "Resolved" },
];

const BUG_STATUS_BADGE_VARIANT: Record<BugReportStatus, "warning" | "primary" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  RESOLVED: "success",
};

type LoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; rows: PendingContributionResponse[] };
type BugLoadState = { kind: "loading" } | { kind: "error" } | { kind: "ready"; rows: BugReportResponse[] };

/**
 * ADMIN-only moderation queue for the contributor pipeline (Sept 18 nav
 * plan, Phase B). Ordered by each submitter's total approved points,
 * descending — a track-record contributor surfaces first (per the
 * product's own "high rating contributor at the top" requirement), same
 * order `GET /contributions/pending` already returns it in. Phase C's
 * bug-report panel is a second section of this same page once it lands.
 */
export default function AdminPage() {
  const { user, status: authStatus } = useAuth();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [actioningId, setActioningId] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  function load() {
    setState({ kind: "loading" });
    getPendingContributions()
      .then((rows) => setState({ kind: "ready", rows }))
      .catch(() => setState({ kind: "error" }));
  }

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    getPendingContributions()
      .then((rows) => {
        if (!cancelled) setState({ kind: "ready", rows });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  async function handleReview(id: string, action: "approve" | "reject") {
    setActioningId(id);
    try {
      await (action === "approve" ? approveContribution(id) : rejectContribution(id));
      load();
    } finally {
      setActioningId(null);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-bg">
      <AppHeader back={{ href: "/problems", label: "Problems" }} maxWidthClassName="max-w-5xl" />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-10">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium text-text">
            <ShieldCheck className="size-5 text-signal" aria-hidden />
            Admin
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            Contributions awaiting review, ranked by each contributor&apos;s approved-points track record.
          </p>
        </div>

        {authStatus !== "ready" ? null : !user ? (
          <Panel className="flex flex-col items-center gap-4 p-8 text-center">
            <p className="text-sm text-text-muted">Sign in as an admin to review contributions.</p>
            <LinkButton href="/login">Sign In</LinkButton>
          </Panel>
        ) : !isAdmin ? (
          <Panel className="flex flex-col items-center gap-2 p-8 text-center">
            <p className="text-sm text-text-muted">This page is restricted to admin accounts.</p>
          </Panel>
        ) : (
          <Panel className="overflow-hidden">
            {state.kind === "loading" ? (
              <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
            ) : state.kind === "error" ? (
              <p className="p-6 text-center text-sm text-status-critical">Couldn&apos;t load the queue right now.</p>
            ) : state.rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-text-muted">Nothing pending review.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
                    <th className="px-4 py-2 font-medium">Title</th>
                    <th className="px-4 py-2 font-medium">Category</th>
                    <th className="px-4 py-2 text-right font-medium">Contributor&apos;s points</th>
                    <th className="px-4 py-2 text-right font-medium">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map(({ contribution, contributorApprovedPoints }) => (
                    <tr key={contribution.id} className="border-b border-border last:border-b-0 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text">{contribution.title}</p>
                        <p className="mt-1 line-clamp-2 max-w-md text-xs text-text-muted">{contribution.body}</p>
                        {contribution.link && (
                          <a
                            href={contribution.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs text-signal hover:underline"
                          >
                            {contribution.link}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{CATEGORY_LABEL[contribution.category]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text">{contributorApprovedPoints}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Check className="size-3.5" aria-hidden />}
                            loading={actioningId === contribution.id}
                            onClick={() => handleReview(contribution.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<X className="size-3.5" aria-hidden />}
                            loading={actioningId === contribution.id}
                            onClick={() => handleReview(contribution.id, "reject")}
                          >
                            Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        )}

        {isAdmin && <BugReportsPanel />}
      </div>
    </main>
  );
}

/**
 * The second section of `/admin` — bug reports filed via the site-wide
 * `ReportBugButton` (Sept 18 nav plan, item 11). A fuller workflow than
 * contributions' approve/reject: OPEN/IN_PROGRESS/RESOLVED plus a free-text
 * note, saved together per row via `POST /bug-reports/{id}/review`.
 */
function BugReportsPanel() {
  const [state, setState] = useState<BugLoadState>({ kind: "loading" });
  const [drafts, setDrafts] = useState<Record<string, { status: BugReportStatus; adminNote: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function applyRows(rows: BugReportResponse[]) {
    setState({ kind: "ready", rows });
    setDrafts(Object.fromEntries(rows.map((r) => [r.id, { status: r.status, adminNote: r.adminNote ?? "" }])));
  }

  function load() {
    setState({ kind: "loading" });
    getAllBugReports().then(applyRows).catch(() => setState({ kind: "error" }));
  }

  useEffect(() => {
    let cancelled = false;
    getAllBugReports()
      .then((rows) => {
        if (!cancelled) applyRows(rows);
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(id: string) {
    const draft = drafts[id];
    if (!draft) return;
    setSavingId(id);
    try {
      await reviewBugReport(id, { status: draft.status, adminNote: draft.adminNote.trim() ? draft.adminNote : null });
      load();
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-lg font-medium text-text">
        <Bug className="size-4 text-signal" aria-hidden />
        Bug reports
      </h2>
      <Panel className="overflow-hidden">
        {state.kind === "loading" ? (
          <p className="p-6 text-center text-sm text-text-muted">Loading…</p>
        ) : state.kind === "error" ? (
          <p className="p-6 text-center text-sm text-status-critical">Couldn&apos;t load bug reports right now.</p>
        ) : state.rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-muted">No bug reports filed.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-subtle">
                <th className="px-4 py-2 font-medium">Report</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Note</th>
                <th className="px-4 py-2 text-right font-medium">Save</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((report) => {
                const draft = drafts[report.id] ?? { status: report.status, adminNote: report.adminNote ?? "" };
                return (
                  <tr key={report.id} className="border-b border-border last:border-b-0 align-top">
                    <td className="px-4 py-3">
                      <p className="max-w-sm text-text">{report.description}</p>
                      <p className="mt-1 font-mono text-[11px] text-text-subtle">{report.route}</p>
                      <Badge variant={BUG_STATUS_BADGE_VARIANT[report.status]} className="mt-1.5">
                        {BUG_STATUS_OPTIONS.find((o) => o.value === report.status)?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        options={BUG_STATUS_OPTIONS}
                        value={draft.status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [report.id]: { ...draft, status: e.target.value as BugReportStatus },
                          }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={draft.adminNote}
                        placeholder="Optional note"
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [report.id]: { ...draft, adminNote: e.target.value } }))
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" size="sm" loading={savingId === report.id} onClick={() => handleSave(report.id)}>
                        Save
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}
