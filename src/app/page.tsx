import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-bg p-8 text-center">
      <div className="max-w-2xl space-y-4">
        <h1 className="text-4xl font-semibold text-text">
          Engineering Studio
        </h1>
        <p className="text-lg text-text-muted">
          Build. Simulate. Break. Learn.
        </p>
        <p className="text-sm text-text-subtle">
          An interactive sandbox for learning distributed systems.
        </p>
        <div className="pt-4">
          <Link
            href="/workshop"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white opacity-60 hover:opacity-100 transition-opacity"
          >
            Enter Workshop
          </Link>
        </div>
      </div>
    </main>
  );
}
