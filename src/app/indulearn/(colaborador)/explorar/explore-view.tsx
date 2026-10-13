"use client";

import { CapsuleFeed } from "@/components/indulearn/capsule-feed";
import { useCurrentUser } from "@/lib/indulearn/store";

export function ExploreView({ initialCapsuleId }: { initialCapsuleId?: string }) {
  const user = useCurrentUser();
  if (!user) return null;

  // La `key` reinicia el feed al cambiar de perfil demo: otro usuario, otras
  // marcas, otro progreso.
  return <CapsuleFeed key={user.id} user={user} initialCapsuleId={initialCapsuleId} />;
}
