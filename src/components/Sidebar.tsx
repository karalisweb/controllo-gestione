"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarRange,
  Receipt,
  CreditCard,
  Target,
  Wallet,
  PlusCircle,
  LogOut,
  User,
  BookOpen,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Navigazione Principale (Zona 2)
   Ref: DESIGN-SYSTEM.md sezione 7.1
   ═══════════════════════════════════════════ */

const navSections = [
  {
    title: "MENU",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/forecast", label: "Previsionale", icon: CalendarRange },
      { href: "/transactions", label: "Consuntivo", icon: Receipt },
    ],
  },
  {
    title: "STRUMENTI",
    items: [
      { href: "/payment-plans", label: "Piani di Rientro", icon: CreditCard },
      { href: "/sales", label: "Piano Commerciale", icon: Target },
      { href: "/settings", label: "Piano Annuale", icon: Wallet },
    ],
  },
  {
    title: "AZIONI",
    items: [
      { href: "/transactions?new=1", label: "Nuovo Movimento", icon: PlusCircle },
    ],
  },
];

/* ═══════════════════════════════════════════
   Navigazione Fissa (Zona 3) - OBBLIGATORIA
   Stesse voci e icone in tutte le app KW
   Ref: DESIGN-SYSTEM.md sezione 7.1 Zona 3
   ═══════════════════════════════════════════ */

const fixedNavItems = [
  { href: "/profile", label: "Profilo", icon: User },
  { href: "/guida", label: "Guida", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Errore logout:", error);
      router.push("/login");
    }
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden lg:flex h-screen w-[260px] flex-col border-r border-[#2a2a35] bg-[#132032]">
      {/* ═══ Zona 1 - Header App (Identita) ═══ */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2a2a35]">
        {/* Icona app: Lucide Wallet su sfondo scuro */}
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d1521]">
          <Wallet size={22} className="text-[#d4a726]" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-[0.95rem] text-[#f5f5f7]">
            KW Cashflow
          </span>
          <span className="text-xs text-[#71717a]">
            v2.1.0
          </span>
        </div>
      </div>

      {/* ═══ Zona 2 - Navigazione Principale ═══ */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navSections.map((section, idx) => (
          <div key={section.title}>
            {/* Titolo sezione UPPERCASE */}
            <div
              className={cn(
                "px-6 mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-[#71717a]",
                idx === 0 ? "mt-0" : "mt-4"
              )}
            >
              {section.title}
            </div>

            {/* Item navigazione */}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                        : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      active ? "opacity-100" : "opacity-70"
                    )} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ═══ Zona 3 - Navigazione Fissa (Footer) ═══ */}
      <div className="py-3 border-t border-[#2a2a35]">
        <div className="space-y-0.5">
          {fixedNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-[rgba(255,107,53,0.1)] text-[#d4a726]"
                    : "text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7]"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  active ? "opacity-100" : "opacity-70"
                )} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Esci (logout) */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium text-[#a1a1aa] hover:bg-[#1a2d44] hover:text-[#f5f5f7] transition-all duration-200 w-[calc(100%-1rem)] text-left"
          >
            <LogOut className="h-5 w-5 opacity-70" />
            <span>Esci</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
