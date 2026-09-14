"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/BottomNav";
import { PwaRegister } from "@/components/PwaRegister";
import { SessionProvider } from "@/components/SessionProvider";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const chromeFree =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/auth");

  return (
    <SessionProvider>
      <div
        className="app-shell mx-auto min-h-dvh w-full max-w-[480px] bg-black"
        style={{
          paddingBottom: chromeFree
            ? "1.5rem"
            : "calc(5.5rem + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </div>
      {chromeFree ? null : <BottomNav />}
      <PwaRegister />
    </SessionProvider>
  );
}
