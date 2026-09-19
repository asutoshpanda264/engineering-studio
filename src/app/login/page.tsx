"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageMeshBackground } from "@/components/layout/PageMeshBackground";
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
                <LogIn className="size-4" aria-hidden />
              </span>
              Sign in
            </h1>
            <p className="mb-6 text-sm text-text-muted">
              Sign in to track solved problems, points, streaks, and your leaderboard rank.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-sm text-status-critical">{error}</p>}
              <Button type="submit" variant="primary" loading={submitting} className="mt-2">
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-text-muted">
              New here?{" "}
              <Link href="/register" className="text-signal hover:underline">
                Create an account
              </Link>
            </p>
          </Panel>
        </motion.div>
      </div>
    </main>
  );
}
