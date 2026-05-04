"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CalendarRange,
  CalendarDays,
  CreditCard,
  Menu,
  History,
  Wand2,
  PiggyBank,
  Users,
  Package,
  Target,
  Wallet,
  TrendingDown,
  TrendingUp,
  User,
  BookOpen,
  LogOut,
  X,
} from "lucide-react";

const mainNavItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/movimenti", label: "Movimenti", icon: CalendarRange },
  { href: "/annuale", label: "Annuale", icon: CalendarDays },
  { href: "/debts", label: "Debiti", icon: CreditCard },
];

const sheetSections = [
  {
    title: "OPERATIVO",
    items: [
      { href: "/storico", label: "Storico", icon: History },
      { href: "/riconcilia", label: "Riconcilia", icon: Wand2 },
      { href: "/fondi", label: "Fondi", icon: PiggyBank },
    ],
  },
  {
    title: "STRUMENTI",
    items: [
      { href: "/anagrafica", label: "Anagrafica", icon: Users },
      { href: "/servizi", label: "Catalogo Servizi", icon: Package },
      { href: "/sales", label: "Piano Commerciale", icon: Target },
      { href: "/settings", label: "Previsionale", icon: Wallet },
    ],
  },
  {
    title: "SETUP",
    items: [
      { href: "/centri-costo", label: "Centri di Costo", icon: TrendingDown },
      { href: "/centri-ricavo", label: "Centri di Ricavo", icon: TrendingUp },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { href: "/profile", label: "Profilo", icon: User },
      { href: "/guida", label: "Guida", icon: BookOpen },
    ],
  },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Errore logout:", error);
      router.push("/login");
    }
  };

  const isPathActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const isAnyMainActive = mainNavItems.some((item) => isPathActive(item.href));
  const altroActive = !isAnyMainActive;

  return (
    <>
      <nav
        aria-label="Navigazione principale mobile"
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-card safe-area-bottom"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.href);

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

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Altro"
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 py-2 px-2 rounded-xl transition-all min-w-[56px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              altroActive
                ? "text-primary"
                : "text-muted-foreground active:scale-95"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
              altroActive && "bg-primary/10"
            )}>
              <Menu className={cn("h-[22px] w-[22px]", altroActive ? "opacity-100" : "opacity-70")} />
            </div>
            <span className={cn(
              "text-[11px] font-medium",
              altroActive ? "text-primary" : "text-muted-foreground"
            )}>
              Altro
            </span>
            {altroActive && (
              <div className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </nav>

      <DialogPrimitive.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className="fixed inset-0 z-50 bg-black/60 lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          />
          <DialogPrimitive.Content
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-card border-t border-border rounded-t-2xl shadow-2xl max-h-[85vh] safe-area-bottom lg:hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-300"
          >
            <DialogPrimitive.Title className="sr-only">Menu altro</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Tutte le voci di navigazione secondarie
            </DialogPrimitive.Description>

            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between px-5 pb-2">
              <span className="text-base font-semibold text-foreground">Altro</span>
              <DialogPrimitive.Close
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </DialogPrimitive.Close>
            </div>

            <div className="overflow-y-auto px-2 pb-3 flex-1">
              {sheetSections.map((section) => (
                <div key={section.title} className="mb-3">
                  <div className="px-3 pt-2 pb-1 text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                    {section.title}
                  </div>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isPathActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSheetOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted active:bg-muted"
                          )}
                        >
                          <Icon className={cn("h-5 w-5", active ? "opacity-100" : "opacity-70")} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                    {section.title === "ACCOUNT" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSheetOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-muted active:bg-muted transition-colors"
                      >
                        <LogOut className="h-5 w-5 opacity-70" />
                        <span>Esci</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
