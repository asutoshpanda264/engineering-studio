"use client";

import { useEffect } from "react";
import { markEntityViewed } from "@/lib/entitiesProgress";

/**
 * Renders nothing — just records "this entity's page was opened" on mount,
 * for `EntitiesIndexView`'s progress card. A separate tiny client component
 * rather than making `/entities/[slug]/page.tsx` itself a client component:
 * that page stays server-rendered for `generateStaticParams`/`generateMetadata`,
 * same split every other lesson-with-a-client-sliver page in this app uses
 * (see `MarkCompleteButton` on the Foundations lesson page).
 */
export function EntityViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    markEntityViewed(slug);
  }, [slug]);

  return null;
}
