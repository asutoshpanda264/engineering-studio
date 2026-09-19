"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { UserPlus, User, Mail, Lock } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
import { AuthShowcasePanel } from "@/components/auth/AuthShowcasePanel";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/auth/authStore";
import { ApiError } from "@/lib/api/client";

// Mirrors RegisterRequest's own @Size(min = 8, max = 100) on the backend
// — checked here too so a too-short password shows up as an inline field
// error immediately, not a round-trip to the server first.
const MIN_PASSWORD_LENGTH = 8;

/**
 * Same deliberate break from Trace's flat rule as `/login` — see
 * AuthShowcasePanel's file comment. Kept visually identical (same glass
 * card, same showcase panel) so the two screens read as one flow, not
 * two different design languages.
 */
export default function RegisterPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
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
      <PageMeshBackground isLight={isLight} />

      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-0 -z-10 size-[32rem] rounded-full bg-signal/15 blur-[120px]"
      />

      <AppHeader back={{ href: "/", label: "Engineering Studio" }} />

      <div className="flex flex-1 lg:grid lg:grid-cols-2">
        <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            <div className="rounded-3xl bg-gradient-to-br from-signal/25 via-border to-transparent p-px shadow-2xl shadow-black/40">
              <div className="rounded-[calc(1.5rem-1px)] bg-bg-elevated/90 p-8 backdrop-blur-xl">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-signal-soft text-signal ring-4 ring-signal/10">
                  <UserPlus className="size-5" aria-hidden />
                </span>
                <h1 className="mt-5 text-2xl font-semibold text-text">Create an account</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Track solved problems, points, streaks, and your leaderboard rank.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                  <Input
                    variant="modern"
                    label="Display name"
                    icon={<User className="size-4" aria-hidden />}
                    autoComplete="name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    error={fieldErrors.displayName}
                  />
                  <Input
                    variant="modern"
                    label="Email"
                    type="email"
                    icon={<Mail className="size-4" aria-hidden />}
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                  />
                  <div>
                    <Input
                      variant="modern"
                      label="Password"
                      type="password"
                      icon={<Lock className="size-4" aria-hidden />}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={fieldErrors.password}
                    />
                    {!fieldErrors.password && (
                      <p className="mt-1.5 text-xs text-text-subtle">
                        At least {MIN_PASSWORD_LENGTH} characters.
                      </p>
                    )}
                  </div>
                  {error && !Object.keys(fieldErrors).length && (
                    <p className="text-sm text-status-critical">{error}</p>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    shape="pill"
                    size="lg"
                    loading={submitting}
                    className="mt-1 w-full"
                  >
                    Create account
                  </Button>
                </form>

                <p className="mt-7 text-center text-sm text-text-muted">
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-signal hover:underline">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <AuthShowcasePanel
          headline="Learn the way you'll be evaluated."
          subheadline="Create an account to save your progress, verified attempts, and rank as you go."
        />
      </div>
    </main>
  );
}
