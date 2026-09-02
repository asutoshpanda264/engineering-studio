"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fade-and-rise-in-on-scroll wrapper for the landing page. Only visually
 * does anything under the Paper (light) theme — see globals.css's
 * `.landing-reveal` rule, gated to `[data-theme="light"]` — so the dark
 * theme keeps this page's original "nothing fades in on mount/scroll"
 * behavior (see the file-level comment in page.tsx) untouched: the
 * `.is-visible` class still gets added on every theme, there's just no
 * `.landing-reveal` style outside Paper for it to transition from.
 *
 * A one-shot IntersectionObserver, not scroll-jacking — an element already
 * in the viewport on first paint (the hero) reveals almost immediately,
 * everything below the fold reveals as it's scrolled to, and nothing ever
 * re-hides once shown.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  /** Stagger, in ms, applied only once the element starts revealing. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`landing-reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
