import type { SVGProps } from "react";

/**
 * The bat-signal mark. Two earlier versions of this component were a
 * hand-drawn *generic* bat silhouette, deliberately not the actual
 * trademarked Batman emblem — both were live-checked and rejected as
 * "still looks weird." The path below is instead traced from a real
 * bat-signal SVG the user supplied (recolored, bounding box tightened to
 * this viewBox) — this is knowingly the real DC/Batman logo shape, not a
 * generic approximation; that trade-off (fidelity over originality) was
 * an explicit call by the user for this project, not a default to repeat
 * without asking elsewhere.
 *
 * Used for the Night Ops theme-toggle icon and the bat-signal transition
 * (see `night-ops/`) — both via `currentColor`, so this file owns shape
 * only, never color.
 */
export function BatMark({ className, ...rest }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0.5 5.5 38 20"
      fill="currentColor"
      className={className}
      aria-hidden
      {...rest}
    >
      <path
        d="M30.555 23.53c0 0.062 1.951-2.357 0.39-3.981-1.874-2.124-5.116 1.056-5.116 1.056-2.562-5.059-6.424 3.145-6.424 3.145s-3.348-7.731-6.221-3.047c0.062 0-2.383-2.793-4.819-1.481-1.749 1.749 0 4.091 0 4.091-9.119-3.186-9.712-12.492 2.952-16.286-3.576 4.481 6.59 10.649 5.84-0.344l2.155 1.89c0 0 2.171-1.796 2.171-1.921-0.25 10.993 9.369 4.544 6.121 0.484 11.429 3.308 13.381 11.21 2.951 16.394z"
      />
    </svg>
  );
}
