import type { SVGProps } from "react";

/**
 * A generic bat silhouette — not a reproduction of any specific
 * trademarked logo mark, just a bat shape: two pointed ears with a notch
 * between them, two wide wings each sweeping out to a single tip with one
 * gentle scallop on the trailing edge, tapering to a single point below.
 * Used for the Night Ops theme-toggle icon, the flying swarm transition,
 * and the ambient spotlight symbol (see `night-ops/`).
 *
 * Deliberately few points, concentrated at the ears/wingtips/tail rather
 * than spread evenly around a center — an earlier version alternated
 * in/out points uniformly all the way around, which read as a
 * many-legged bug instead of two solid wings.
 */
export function BatMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="currentColor"
      className={className}
      aria-hidden
      {...rest}
    >
      <polygon
        points="
          100,16 114,0 128,22 200,26 176,50 140,40 108,62 100,80
          92,62 60,40 24,50 0,26 72,22 86,0
        "
      />
    </svg>
  );
}
