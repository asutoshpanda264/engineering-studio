"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";
import { fileBugReport } from "@/lib/api/bugReports";

/**
 * A persistent floating trigger, mounted once in the root layout (like
 * `AuthBootstrap`) so it's available from every page — not per-page
 * wiring. Signed-in users only (any role: USER/CONTRIBUTOR/ADMIN), per
 * the Sept 18 nav plan's item 11; a guest sees nothing here. `route`/
 * `navigator.userAgent` are captured automatically at submit time, not
 * asked for — the reporter only ever types the description.
 */
export function ReportBugButton() {
  const { user, status } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== "ready" || !user) return null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await fileBugReport({
        description,
        route: pathname ?? "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      setSubmitted(true);
      setDescription("");
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
      }, 1500);
    } catch {
      setError("Couldn't send your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Bottom-LEFT, not right — the Workshop canvas's own React Flow
          Controls/MiniMap/attribution already own the bottom-right corner
          on that page; this stays out of their way everywhere. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 border border-border bg-bg-elevated px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-text-muted shadow-elevated transition-colors duration-fast ease-standard hover:border-signal/50 hover:text-signal"
      >
        <Bug className="size-3.5" aria-hidden />
        Report bug
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Report a bug" maxWidthClassName="max-w-md">
        {submitted ? (
          <p className="py-6 text-center text-sm text-status-healthy">Thanks — we&apos;ve got it.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Textarea
              label="What went wrong?"
              required
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What were you doing, and what happened instead?"
            />
            <p className="text-xs text-text-subtle">
              We&apos;ll automatically include the page you&apos;re on and your browser info.
            </p>
            {error && <p className="text-sm text-status-critical">{error}</p>}
            <Button type="submit" variant="primary" loading={submitting} className="self-start">
              Send report
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
