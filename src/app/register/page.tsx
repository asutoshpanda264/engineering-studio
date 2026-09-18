"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/authStore";
import { ApiError } from "@/lib/api/client";

// Mirrors RegisterRequest's own @Size(min = 8, max = 100) on the backend
// — checked here too so a too-short password shows up as an inline field
// error immediately, not a round-trip to the server first.
const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({ password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, password, displayName });
      router.push("/problems");
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
      {/* `--landing-glow` — the same colored radial-blob background the
          home hero uses, a no-op under the dark theme (see globals.css).
          Auth pages used to be flat `bg-bg` with no color at all, the
          starkest pages in the app under Paper — see the Sept 18 nav
          plan's item 6. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem]"
        style={{ backgroundImage: "var(--landing-glow)" }}
      />

      <AppHeader back={{ href: "/", label: "Engineering Studio" }} />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <Panel className="rounded-[var(--landing-radius-lg)] p-6 shadow-[var(--landing-shadow-card)]">
            <h1 className="mb-1 flex items-center gap-2.5 text-lg font-medium text-text">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-signal-soft text-signal">
                <UserPlus className="size-4" aria-hidden />
              </span>
              Create an account
            </h1>
            <p className="mb-6 text-sm text-text-muted">
              Track solved problems, points, streaks, and your leaderboard rank.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Display name"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                error={fieldErrors.displayName}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password}
              />
              {error && !Object.keys(fieldErrors).length && (
                <p className="text-sm text-status-critical">{error}</p>
              )}
              <Button type="submit" variant="primary" loading={submitting} className="mt-2">
                Create account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-text-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-signal hover:underline">
                Sign in
              </Link>
            </p>
          </Panel>
        </motion.div>
      </div>
    </main>
  );
}
