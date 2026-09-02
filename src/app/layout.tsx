import type { Metadata } from "next";
import { Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NightOpsAtmosphere } from "@/components/theme/NightOpsAtmosphere";
import { LockInGuard } from "@/components/lockIn/LockInGuard";
import "./globals.css";

// "Trace" design language: two voices split strictly by role. Serif for
// anything meant to be read (headlines, prose, entity articles); mono for
// anything that is data or interface (nav, labels, buttons, every number).
// Deliberately not Inter/Geist — both are the default pairing of every
// v0/create-next-app scaffold, and reads as unauthored on this product.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Engineering Studio",
  description:
    "Build. Simulate. Break. Learn. An interactive sandbox for learning distributed systems.",
};

// Sets `data-theme` on <html> before first paint to whatever was saved
// last time — dark stays the default (no attribute) so a first-time
// visitor sees exactly what they always have. Runs via `beforeInteractive`
// specifically to avoid a flash of the wrong theme; ThemeProvider only
// reconciles React state with whatever this already did, it doesn't make
// the initial choice itself. "light" and "night-ops" are the two preview
// themes (see globals.css) — kept in sync with ThemeProvider's Theme type
// by hand since this string can't import it.
const THEME_INIT_SCRIPT = `(function () {
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "night-ops" || saved === "light") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-bg text-text font-sans antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ThemeProvider>
          <NightOpsAtmosphere>{children}</NightOpsAtmosphere>
          <LockInGuard />
        </ThemeProvider>
      </body>
    </html>
  );
}
