"use client";

import { useEffect, useRef, useState } from "react";

export interface TocSection {
  id: string;
  label: string;
}

/**
 * Sticky left-rail "on this page" nav for the entity deep-dive article —
 * the same pattern long-form technical explainers use (e.g. System Design
 * Handbook's blog posts) so a page with this much content stays navigable
 * without leaning on nested bordered boxes to create visual structure.
 * Hidden below `lg` — on narrow screens the reading flow itself is the nav.
 */
export function EntityTableOfContents({ sections }: { sections: TocSection[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const tickingRef = useRef(false);

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    // The "currently reading" line, in px from the viewport top — just
    // below the sticky header. Whichever heading most recently scrolled
    // past this line is the active section. Deliberately a plain scroll
    // listener rather than IntersectionObserver: headings are short
    // elements with long sections of prose between them, so an
    // intersection-ratio approach leaves long stretches of scrolling
    // where no heading is "intersecting" at all and the highlight goes
    // stale.
    const LINE = 120;

    const updateActive = () => {
      tickingRef.current = false;
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= LINE) {
          current = heading.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(updateActive);
    };

    updateActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <nav
      aria-label="On this page"
      className="sticky top-20 hidden h-fit w-44 shrink-0 lg:block"
    >
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-text-muted">
        On this page
      </p>
      <ul className="flex flex-col border-l border-border">
        {sections.map((section) => {
          const active = activeId === section.id;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active ? "location" : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-3 font-mono text-xs transition-colors duration-fast ease-standard ${
                  active
                    ? "border-signal text-signal"
                    : "border-transparent text-text-subtle hover:text-text"
                }`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
