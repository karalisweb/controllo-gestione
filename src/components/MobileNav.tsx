"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarRange,
  Receipt,
  PlusCircle,
  Menu,
} from "lucide-react";

const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/forecast", label: "Previsionale", icon: CalendarRange },
  { href: "/transactions?new=1", label: "Nuovo", icon: PlusCircle },
  { href: "/transactions", label: "Consuntivo", icon: Receipt },
  { href: "/settings", label: "Altro", icon: Menu },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigazione principale mobile"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-card safe-area-bottom"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl transition-all min-w-[56px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn("h-[22px] w-[22px]", isActive ? "opacity-100" : "opacity-70")} />
              </div>
              <span className={cn(
                "text-[11px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
