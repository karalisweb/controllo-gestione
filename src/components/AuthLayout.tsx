"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* ml-[260px] = sidebar width da DESIGN-SYSTEM.md */}
      <main className="flex-1 lg:ml-[260px] pb-20 lg:pb-0">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
