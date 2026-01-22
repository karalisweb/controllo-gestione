"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarRange,
  Receipt,
  CreditCard,
  Settings,
  Target,
  LogOut,
  User,
} from "lucide-react";

const mainNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/forecast", label: "Previsionale", icon: CalendarRange },
  { href: "/sales", label: "Piano Commerciale", icon: Target },
  { href: "/transactions", label: "Consuntivo", icon: Receipt },
  { href: "/payment-plans", label: "Piani di Rientro", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0f172a]">
          <span className="text-[#d4af37] font-bold text-lg">K</span>
          <span className="text-[#d4af37] font-medium text-sm -ml-0.5">f</span>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">Finance</span>
          <span className="text-xs text-muted-foreground">by Karalisweb v. 2.1</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section - Profile, Settings & Logout */}
      <div className="border-t border-sidebar-border px-4 py-4 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/profile"
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <User className={cn("h-5 w-5", pathname === "/profile" && "text-primary")} />
          <span>Profilo</span>
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className={cn("h-5 w-5", pathname === "/settings" && "text-primary")} />
          <span>Impostazioni</span>
        </Link>

        <Link
          href="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Esci</span>
        </Link>
      </div>
    </aside>
  );
}
