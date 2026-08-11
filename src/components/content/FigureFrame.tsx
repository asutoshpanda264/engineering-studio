"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ZoomIn } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

/**
 * Shared frame for every rendered diagram under `src/content/` —
 * `LessonBlockRenderer`'s `figure`/`flow`/`sequence`/`tree`/`architecture`/
 * `compare`/`uml` cases all render inside this, so a section mixing
 * several diagram kinds still reads as one visual language (bordered
 * `bg-bg-panel` box) and gets the same zoom affordance for free.
 *
 * Diagrams are hand-drawn SVG sized for a fixed viewBox and then shrunk to
 * fit an ~600px article column (`min-w-[420px]` + `overflow-x-auto` on the
 * inline copy) — legible enough to read the shape, too small on a dense
 * figure to comfortably read every label. The magnifying-glass button
 * reopens the exact same `children` inside a wide `Modal`; the SVG's own
 * `w-full` does the enlarging for free, no per-diagram zoom prop needed.
 */
export function FigureFrame({ children, caption }: { children: ReactNode; caption?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <figure className="relative overflow-x-auto border border-border bg-bg-panel p-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Enlarge diagram"
          className="absolute right-2.5 top-2.5 z-10 flex size-7 items-center justify-center border border-border bg-bg-elevated text-text-subtle transition-colors duration-fast ease-standard hover:border-signal hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <ZoomIn className="size-3.5" aria-hidden />
        </button>
        <div className="min-w-[420px]">{children}</div>
        {caption && (
          <figcaption className="mt-3 text-center font-mono text-[11px] uppercase tracking-wide text-text-subtle">
            {caption}
          </figcaption>
        )}
      </figure>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={typeof caption === "string" ? caption : "Diagram"}
        maxWidthClassName="max-w-5xl"
      >
        <div className="min-w-[420px]">{children}</div>
      </Modal>
    </>
  );
}
