import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ENTITY_CATALOG } from "@/lib/entityCatalog";
import {
  entityTypeFromSlug,
  getEntityDeepDive,
  getFailureModeDemo,
  slugFromEntityType,
  slugFromFailureModeName,
} from "@/lib/entityDeepDive";
import { FailureDemoWorkspace } from "@/components/failure-demo/FailureDemoWorkspace";

export function generateStaticParams() {
  return ENTITY_CATALOG.flatMap((item) => {
    const deepDive = getEntityDeepDive(item.type);
    return deepDive.failureModes
      .filter((mode) => mode.demo)
      .map((mode) => ({
        slug: slugFromEntityType(item.type),
        failureModeSlug: slugFromFailureModeName(mode.name),
      }));
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; failureModeSlug: string }>;
}): Promise<Metadata> {
  const { slug, failureModeSlug } = await params;
  const type = entityTypeFromSlug(slug);
  if (!type) return {};
  const found = getFailureModeDemo(type, failureModeSlug);
  if (!found) return {};
  const catalogItem = ENTITY_CATALOG.find((item) => item.type === type)!;
  return {
    title: `Try It: ${found.failureMode.name} — ${catalogItem.name} — Engineering Studio`,
    description: found.failureMode.description,
  };
}

export default async function FailureDemoPage({
  params,
}: {
  params: Promise<{ slug: string; failureModeSlug: string }>;
}) {
  const { slug, failureModeSlug } = await params;
  const type = entityTypeFromSlug(slug);
  if (!type) notFound();

  const found = getFailureModeDemo(type, failureModeSlug);
  if (!found) notFound();

  const catalogItem = ENTITY_CATALOG.find((item) => item.type === type)!;

  return (
    <FailureDemoWorkspace
      demo={found.demo}
      entityName={catalogItem.name}
      entitySlug={slug}
      failureModeName={found.failureMode.name}
    />
  );
}
