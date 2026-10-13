import type { Metadata } from "next";

import { ExploreView } from "./explore-view";

export const metadata: Metadata = { title: "Explorar cápsulas" };

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string | string[] }>;
}) {
  const { c } = await searchParams;
  return <ExploreView initialCapsuleId={typeof c === "string" ? c : undefined} />;
}
