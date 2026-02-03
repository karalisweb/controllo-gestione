"use client";

import { MobileHeader } from "@/components/MobileHeader";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import {
  BookOpen,
  LogIn,
  Receipt,
  CalendarRange,
  CreditCard,
  Target,
  Settings,
  User,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

const sections = [
  {
    id: "introduzione",
    title: "Introduzione",
    description: "Cos'è KW Cashflow e come usarlo",
    icon: BookOpen,
  },
  {
    id: "accesso-e-login",
    title: "Accesso e Login",
    description: "Come accedere, 2FA, password dimenticata",
    icon: LogIn,
  },
  {
    id: "consuntivo",
    title: "Consuntivo",
    description: "Registrare incassi e spese reali",
    icon: Receipt,
  },
  {
    id: "previsionale",
    title: "Previsionale",
    description: "Proiezioni e pianificazione",
    icon: CalendarRange,
  },
  {
    id: "piani-di-rientro-pdr",
    title: "Piani di Rientro (PDR)",
    description: "Gestire debiti a rate",
    icon: CreditCard,
  },
  {
    id: "piano-commerciale",
    title: "Piano Commerciale",
    description: "Obiettivi e vendite",
    icon: Target,
  },
  {
    id: "piano-annuale-impostazioni",
    title: "Piano Annuale",
    description: "Centri di costo/ricavo, spese e incassi previsti",
    icon: Settings,
  },
  {
    id: "profilo-e-sicurezza",
    title: "Profilo e Sicurezza",
    description: "Password, 2FA, logout",
    icon: User,
  },
  {
    id: "domande-frequenti",
    title: "Domande Frequenti",
    description: "FAQ e risposte rapide",
    icon: HelpCircle,
  },
];

export default function GuidaPage() {
  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      <MobileHeader title="Guida" />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold mb-2">Guida Utente</h1>
          <p className="text-muted-foreground">
            Tutto quello che ti serve sapere per usare KW Cashflow
          </p>
        </div>

        {/* Quick Answers */}
        <Card className="p-4 mb-8 bg-primary/5 border-primary/20">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Risposte rapide
          </h2>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-primary font-medium">💰</span>
              <div>
                <span className="font-medium">Quanto ho in cassa?</span>
                <span className="text-muted-foreground"> → Dashboard → Saldo disponibile</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-medium">📅</span>
              <div>
                <span className="font-medium">Cosa devo pagare?</span>
                <span className="text-muted-foreground"> → Dashboard → Scadenze 7 giorni</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-primary font-medium">🎯</span>
              <div>
                <span className="font-medium">Quanto devo fatturare?</span>
                <span className="text-muted-foreground"> → Dashboard → Target fatturato</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Sections Grid */}
        <div className="grid gap-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.id}
                href={`/guida/${section.id}`}
                className="block"
              >
                <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{section.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {section.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>KW Cashflow v2.1</p>
          <p>Guida aggiornata al 3 Febbraio 2026</p>
        </div>
      </div>
    </div>
  );
}
