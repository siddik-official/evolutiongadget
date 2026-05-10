"use client";

import { ReactNode, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";

export function LoadingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={`transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
