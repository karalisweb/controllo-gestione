"use client";

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-muted ${className ?? ""}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen pb-24">
      {/* Mobile Header skeleton */}
      <header className="lg:hidden sticky top-0 z-30 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8" />
            <SkeletonBlock className="h-5 w-24" />
          </div>
          <SkeletonBlock className="h-8 w-8 rounded-full" />
        </div>
      </header>

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {/* Hero Card - Obiettivo vendite */}
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBlock className="h-5 w-5" />
            <SkeletonBlock className="h-4 w-32" />
            <div className="ml-auto">
              <SkeletonBlock className="h-5 w-24" />
            </div>
          </div>
          <div className="text-center py-4">
            <SkeletonBlock className="h-3 w-20 mx-auto mb-2" />
            <SkeletonBlock className="h-10 w-48 mx-auto" />
          </div>
          <div className="mt-4">
            <div className="flex justify-between mb-1">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-4 w-20 mx-auto mt-2" />
          </div>
        </div>

        {/* Cassa + Runway - 2 cards */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <SkeletonBlock className="h-4 w-4" />
                <SkeletonBlock className="h-3 w-16" />
              </div>
              <SkeletonBlock className="h-8 w-32 mb-2" />
              <SkeletonBlock className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Sostenibilita' mese */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-4 w-40" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-20" />
              </div>
            ))}
            <div className="border-t border-border pt-3">
              <div className="flex justify-between">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-6 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Prossimi 7gg + Ultimi 7gg */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="h-4 w-4" />
                  <SkeletonBlock className="h-4 w-28" />
                </div>
                <SkeletonBlock className="h-4 w-16" />
              </div>
              <div className="space-y-2">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex justify-between">
                    <div className="flex items-center gap-2">
                      <SkeletonBlock className="h-3 w-10" />
                      <SkeletonBlock className="h-3 w-20" />
                    </div>
                    <SkeletonBlock className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trend */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-4">
            <SkeletonBlock className="h-4 w-4" />
            <SkeletonBlock className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg bg-muted/50 p-3 text-center">
                <SkeletonBlock className="h-3 w-8 mx-auto mb-2" />
                <SkeletonBlock className="h-6 w-20 mx-auto mb-1" />
                <SkeletonBlock className="h-3 w-3 mx-auto rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 flex flex-col items-center gap-1">
              <SkeletonBlock className="h-5 w-5" />
              <SkeletonBlock className="h-2 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
