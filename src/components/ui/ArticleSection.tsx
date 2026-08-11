import type { ReactNode } from "react";

/**
 * The numbered-heading treatment every long-form article in the product
 * uses (`/entities/[slug]`, `/foundations/[slug]`) — a mono index mark
 * plus a hairline top rule, not a colored accent bar. Shared here so the
 * two reading rooms render as the same publication rather than each
 * inventing its own heading language.
 */
export function ArticleSection({
  index,
  id,
  title,
  emphasized = false,
  children,
}: {
  index: number;
  id: string;
  title: string;
  emphasized?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      {emphasized ? (
        <div className="mb-2 flex items-baseline gap-3">
          <span className="font-mono text-sm text-signal" aria-hidden>
            {String(index).padStart(2, "0")}
          </span>
          <h2 className="text-2xl font-semibold text-text">{title}</h2>
        </div>
      ) : (
        <h2 className="mb-5 flex items-baseline gap-3 border-t border-border pt-5 text-lg font-semibold text-text">
          <span className="font-mono text-sm text-signal" aria-hidden>
            {String(index).padStart(2, "0")}
          </span>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
