"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  pendingLabel: ReactNode;
  className?: string;
};

export function SubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
