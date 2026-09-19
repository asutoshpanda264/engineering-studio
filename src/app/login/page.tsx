"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn, Mail, Lock } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
import { AuthShowcasePanel } from "@/components/auth/AuthShowcasePanel";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/lib/auth/authStore";
import { ApiError } from "@/lib/api/client";

/**
 * The account half of the real-backend pivot (see the memory note on
 * that decision) — engineering-studio-backend's `POST /auth/login`,
 * wired through `useAuth().login`. A signed-in session is what turns a
 * Workshop run from "instant local scoring" into "a real, server-verified
 * attempt that counts toward points/streaks/leaderboards" — see
 * `@/lib/auth/authStore.ts`'s own header comment for the full shape of
 * that split.
 *
 * Deliberately broken from Trace's flat/zero-radius rule (a scoped,
 * explicit exception — see AuthShowcasePanel's file comment) into a
 * modern split-screen sign-in: a glass card on the left, a branded
 * feature panel on the right, collapsing to just the card below `lg`.
 */
export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push("/problems");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-bg">
      <PageMeshBackground isLight={isLight} />

      {/* Accent glow behind the form card — independent of `--landing-*`
          (zeroed under dark on purpose everywhere else), since this pair
          of screens is a deliberate scoped exception to Trace's flat rule. */}
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
            {/* 1px gradient hairline border, same "glass card" trick as Modal's modern variant */}
            <div className="rounded-3xl bg-gradient-to-br from-signal/25 via-border to-transparent p-px shadow-2xl shadow-black/40">
              <div className="rounded-[calc(1.5rem-1px)] bg-bg-elevated/90 p-8 backdrop-blur-xl">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-signal-soft text-signal ring-4 ring-signal/10">
                  <LogIn className="size-5" aria-hidden />
                </span>
                <h1 className="mt-5 text-2xl font-semibold text-text">Welcome back</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  Sign in to track solved problems, points, streaks, and your leaderboard rank.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
                  <Input
                    variant="modern"
                    label="Email"
                    type="email"
                    icon={<Mail className="size-4" aria-hidden />}
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input
                    variant="modern"
                    label="Password"
                    type="password"
                    icon={<Lock className="size-4" aria-hidden />}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {error && <p className="text-sm text-status-critical">{error}</p>}
                  <Button
                    type="submit"
                    variant="primary"
                    shape="pill"
                    size="lg"
                    loading={submitting}
                    className="mt-1 w-full"
                  >
                    Sign in
                  </Button>
                </form>

                <p className="mt-7 text-center text-sm text-text-muted">
                  New here?{" "}
                  <Link href="/register" className="font-medium text-signal hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        <AuthShowcasePanel
          headline="Build the systems you'll be tested on."
          subheadline="Engineering Studio turns system-design prep into something you actually do, not just read about."
        />
      </div>
    </main>
  );
}
