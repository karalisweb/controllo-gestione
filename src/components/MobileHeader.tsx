"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Bell, User, ChevronLeft } from "lucide-react";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
}

export function MobileHeader({ title, showBack = false, backHref = "/" }: MobileHeaderProps) {
  const router = useRouter();

  return (
    <header className="lg:hidden sticky top-0 z-30 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          {showBack ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground -ml-2"
              onClick={() => router.push(backHref)}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f172a]">
              <span className="text-[#d4af37] font-bold text-sm">K</span>
              <span className="text-[#d4af37] font-medium text-xs -ml-0.5">f</span>
            </div>
          )}
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Bell className="h-5 w-5" />
          </Button>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <User className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
