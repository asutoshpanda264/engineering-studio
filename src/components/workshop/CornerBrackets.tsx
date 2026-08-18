/**
 * Viewfinder-style corner marks — the "corner-bracket markers" the design
 * tokens' own header comment in globals.css names as the intended
 * replacement for shadowed rounded cards, but that (until the "blueprint"
 * Workshop style) nothing in the app actually drew. Purely decorative
 * (`pointer-events-none`, `aria-hidden`), sized/positioned by props so the
 * same component can frame a canvas, a card, or any rectangular surface.
 */
export function CornerBrackets({
  size = 18,
  inset = 10,
  className = "",
  colorClassName = "border-border-hover",
}: {
  size?: number;
  inset?: number;
  className?: string;
  /** Border-color utility applied to each mark — defaults to the same
   *  hairline tone used everywhere else, override (e.g. "border-signal")
   *  for an emphasized frame like a selected node's. */
  colorClassName?: string;
}) {
  const corner = `absolute ${colorClassName}`;
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      <span
        className={`${corner} border-t border-l`}
        style={{ top: inset, left: inset, width: size, height: size }}
      />
      <span
        className={`${corner} border-t border-r`}
        style={{ top: inset, right: inset, width: size, height: size }}
      />
      <span
        className={`${corner} border-b border-l`}
        style={{ bottom: inset, left: inset, width: size, height: size }}
      />
      <span
        className={`${corner} border-b border-r`}
        style={{ bottom: inset, right: inset, width: size, height: size }}
      />
    </div>
  );
}
