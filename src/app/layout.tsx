import type { Metadata } from "next";
import { Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
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

// Sets `data-theme="light"` on <html> before first paint if that's what
// was saved last time — dark stays the default (no attribute) so a
// first-time visitor sees exactly what they always have. Runs via
// `beforeInteractive` specifically to avoid a flash of the wrong theme;
// ThemeProvider only reconciles React state with whatever this already
// did, it doesn't make the initial choice itself.
const THEME_INIT_SCRIPT = `(function () {
  try {
    if (localStorage.getItem("theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
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
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
