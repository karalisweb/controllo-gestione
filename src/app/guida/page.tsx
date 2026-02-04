"use client";

import { MobileHeader } from "@/components/MobileHeader";
import Link from "next/link";
import {
  BookOpen,
  Receipt,
  CalendarRange,
  CreditCard,
  Target,
  Settings,
  ChevronRight,
  Zap,
} from "lucide-react";

const sections = [
  {
    id: "come-funziona",
    title: "Come funziona KW Cashflow",
    description: "Panoramica dell'app e logica di utilizzo",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    id: "consuntivo",
    title: "Consuntivo",
    description: "Registra incassi e spese reali",
    icon: Receipt,
    color: "bg-green-500/10 text-green-500",
  },
  {
    id: "previsionale",
    title: "Previsionale",
    description: "Visualizza entrate e uscite future",
    icon: CalendarRange,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    id: "piano-annuale",
    title: "Piano Annuale",
    description: "Configura spese e incassi ricorrenti",
    icon: Settings,
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    id: "piano-commerciale",
    title: "Piano Commerciale",
    description: "Gestisci obiettivi e vendite",
    icon: Target,
    color: "bg-pink-500/10 text-pink-500",
  },
  {
    id: "piani-di-rientro",
    title: "Piani di Rientro",
    description: "Gestisci debiti e rate",
    icon: CreditCard,
    color: "bg-red-500/10 text-red-500",
  },
];

export default function GuidaPage() {
  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      <MobileHeader title="Guida" />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Guida</h1>
          <p className="text-muted-foreground">
            Impara a usare KW Cashflow in modo efficace
          </p>
        </div>

        {/* Quick Start */}
        <div className="mb-8 p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold mb-2">In breve</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                KW Cashflow ti aiuta a capire <strong className="text-foreground">quanto hai</strong>, <strong className="text-foreground">quanto devi pagare</strong> e <strong className="text-foreground">quanto devi fatturare</strong>.
                Non è un software di contabilità, ma uno strumento per prendere decisioni rapide sul tuo cashflow.
              </p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground px-1 mb-4">
            SEZIONI DELLA GUIDA
          </p>

          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={`/guida/${section.id}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:border-border hover:bg-accent/30 transition-all group"
              >
                <div className={`p-2.5 rounded-lg ${section.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium group-hover:text-primary transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-border/50 text-center">
          <p className="text-xs text-muted-foreground">
            KW Cashflow v2.1
          </p>
        </div>
      </div>
    </div>
  );
}
