"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarRange,
  CreditCard,
  Receipt,
  Menu,
} from "lucide-react";

const mobileNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/forecast", label: "Previsionale", icon: CalendarRange },
  { href: "/payment-plans", label: "PDR", icon: CreditCard },
  { href: "/transactions", label: "Consuntivo", icon: Receipt },
  { href: "/settings", label: "Menu", icon: Menu },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-sidebar border-t border-sidebar-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl transition-all min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                isActive && "bg-primary/15"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                isActive && "text-primary"
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
