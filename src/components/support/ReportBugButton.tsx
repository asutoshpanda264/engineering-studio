"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bug, CheckCircle2 } from "lucide-react";
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
 *
 * The trigger + the report card both opt into the same "modern" glass
 * treatment as the login/register redesign (see Modal.tsx's `variant`) —
 * this is the one non-auth surface that redesign explicitly covers.
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
        className="fixed bottom-4 left-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated/90 px-3.5 py-2 text-[11px] font-medium text-text-muted shadow-lg shadow-black/20 backdrop-blur-sm transition-all duration-fast ease-standard hover:-translate-y-0.5 hover:border-signal/50 hover:text-signal"
      >
        <Bug className="size-3.5" aria-hidden />
        Report bug
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report a bug"
        variant="modern"
        icon={<Bug className="size-5" aria-hidden />}
        maxWidthClassName="max-w-md"
      >
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-status-healthy/10 text-status-healthy">
                <CheckCircle2 className="size-6" aria-hidden />
              </span>
              <p className="text-sm font-medium text-text">Thanks — we&apos;ve got it.</p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <Textarea
                variant="modern"
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
              <Button type="submit" variant="primary" shape="pill" loading={submitting} className="self-start">
                Send report
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </Modal>
    </>
  );
}
