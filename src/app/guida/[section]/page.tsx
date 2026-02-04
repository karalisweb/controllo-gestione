"use client";

import { useParams } from "next/navigation";
import { MobileHeader } from "@/components/MobileHeader";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Receipt,
  CalendarRange,
  CreditCard,
  Target,
  Settings,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight,
} from "lucide-react";

// ============================================
// COMPONENTI UI PER LA GUIDA
// ============================================

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-8 ${className}`}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold mb-4">{children}</h2>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>;
}

function StepList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 mb-6">{children}</div>;
}

function Step({ number, title, description }: { number: number; title: string; description?: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-medium">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="font-medium">{title}</p>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4">
      <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function KeyPoint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function FlowBox({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="p-4 rounded-lg border border-border/50 bg-card/50 mb-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-md bg-muted text-sm">{step}</span>
            {i < steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="p-4 rounded-lg border border-border/50 bg-card/50">
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

// ============================================
// CONTENUTI DELLE SEZIONI
// ============================================

const sections: Record<string, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  content: React.ReactNode;
}> = {
  "come-funziona": {
    title: "Come funziona KW Cashflow",
    subtitle: "Panoramica dell'app e logica di utilizzo",
    icon: BookOpen,
    color: "bg-blue-500/10 text-blue-500",
    content: (
      <>
        <Section>
          <SectionTitle>A cosa serve</SectionTitle>
          <Paragraph>
            KW Cashflow è uno strumento decisionale per gestire il flusso di cassa della tua attività.
            Ti permette di avere sempre sotto controllo la situazione finanziaria e prendere decisioni informate.
          </Paragraph>
          <Paragraph>
            L&apos;app risponde a tre domande fondamentali:
          </Paragraph>
          <div className="grid gap-3 mb-4">
            <InfoCard title="Quanto ho in cassa?" value="Saldo disponibile" subtitle="Dashboard" />
            <InfoCard title="Cosa devo pagare?" value="Scadenze imminenti" subtitle="Dashboard" />
            <InfoCard title="Quanto devo fatturare?" value="Target mensile" subtitle="Dashboard" />
          </div>
        </Section>

        <Section>
          <SectionTitle>La logica dell&apos;app</SectionTitle>
          <Paragraph>
            L&apos;app distingue tra ciò che è <strong>reale</strong> (già successo) e ciò che è <strong>previsto</strong> (deve ancora succedere):
          </Paragraph>
          <div className="grid gap-3 mb-4">
            <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <p className="font-medium text-green-500 mb-1">Consuntivo = Reale</p>
              <p className="text-sm text-muted-foreground">Soldi che hai già incassato o spese che hai già pagato</p>
            </div>
            <div className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <p className="font-medium text-purple-500 mb-1">Previsionale = Futuro</p>
              <p className="text-sm text-muted-foreground">Incassi e spese che ti aspetti nei prossimi mesi</p>
            </div>
          </div>
        </Section>

        <Section>
          <SectionTitle>Come usarla quotidianamente</SectionTitle>
          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-lg border border-border/50">
              <div className="text-2xl">📅</div>
              <div>
                <p className="font-medium">Ogni giorno (30 secondi)</p>
                <p className="text-sm text-muted-foreground">Quando ricevi un incasso o paghi una spesa, registralo nel Consuntivo</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border border-border/50">
              <div className="text-2xl">📊</div>
              <div>
                <p className="font-medium">Ogni settimana (5 minuti)</p>
                <p className="text-sm text-muted-foreground">Controlla la Dashboard per vedere se sei in linea con le previsioni</p>
              </div>
            </div>
            <div className="flex gap-4 p-4 rounded-lg border border-border/50">
              <div className="text-2xl">🎯</div>
              <div>
                <p className="font-medium">Ogni mese (15 minuti)</p>
                <p className="text-sm text-muted-foreground">Rivedi il Piano Commerciale e aggiusta gli obiettivi di fatturato</p>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <SectionTitle>La ripartizione degli incassi</SectionTitle>
          <Paragraph>
            Ogni volta che incassi dei soldi, non sono tutti &quot;tuoi&quot;. L&apos;app calcola automaticamente come si dividono:
          </Paragraph>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <InfoCard title="IVA" value="22%" subtitle="Da versare allo Stato" />
            <InfoCard title="Soci" value="30%" subtitle="Quote Daniela e Alessio" />
            <InfoCard title="Disponibile" value="48%" subtitle="Per la cassa" />
          </div>
          <Tip>
            Quando nella Dashboard vedi &quot;devi fatturare €10.000&quot;, significa che ti servono €10.000 lordi.
            Di questi, solo €4.800 (il 48%) resteranno disponibili in cassa.
          </Tip>
        </Section>
      </>
    ),
  },

  "consuntivo": {
    title: "Consuntivo",
    subtitle: "Registra incassi e spese reali",
    icon: Receipt,
    color: "bg-green-500/10 text-green-500",
    content: (
      <>
        <Section>
          <SectionTitle>A cosa serve</SectionTitle>
          <Paragraph>
            Il Consuntivo è dove registri tutti i movimenti di denaro <strong>che sono già avvenuti</strong>:
            incassi che hai ricevuto e spese che hai pagato. È la fotografia della tua situazione reale.
          </Paragraph>
          <KeyPoint>
            Il Consuntivo registra solo fatti, non previsioni. Se un cliente ti deve dei soldi ma non te li ha ancora dati, non va qui.
          </KeyPoint>
        </Section>

        <Section>
          <SectionTitle>Quando registrare un incasso</SectionTitle>
          <Paragraph>
            Ogni volta che ricevi un pagamento (bonifico, contanti, carta), devi registrarlo.
            Ma prima di inserirlo, verifica alcune cose:
          </Paragraph>

          <FlowBox
            title="Flusso corretto per registrare un incasso:"
            steps={["Verifica Previsionale", "Controlla Piano Annuale", "Calcola ripartizione", "Registra in Consuntivo"]}
          />

          <StepList>
            <Step
              number={1}
              title="Verifica nel Previsionale"
              description="L'incasso era già previsto? Se sì, troverai una voce corrispondente nel Previsionale. Questo ti aiuta a capire se stai rispettando le previsioni."
            />
            <Step
              number={2}
              title="Controlla il Piano Annuale"
              description="È un cliente che paga regolarmente (es. canone mensile)? Se è la prima volta che ti paga, vai nel Piano Annuale e aggiungilo agli Incassi Previsti così sarà tracciato anche per i mesi futuri."
            />
            <Step
              number={3}
              title="Calcola la ripartizione"
              description="L'app calcola automaticamente quanto va all'IVA (22%), ai soci (30%) e quanto resta disponibile (48%). Verifica che i bonifici ai soci siano stati fatti."
            />
            <Step
              number={4}
              title="Registra nel Consuntivo"
              description="Inserisci l'importo LORDO (IVA inclusa), la data e seleziona il Centro di Ricavo corretto."
            />
          </StepList>

          <Warning>
            Inserisci sempre l&apos;importo LORDO (con IVA). L&apos;app farà i calcoli per te. Se inserisci €1.000,
            il sistema sa che €180 sono IVA e solo €573 sono disponibili per la cassa.
          </Warning>
        </Section>

        <Section>
          <SectionTitle>Quando registrare una spesa</SectionTitle>
          <Paragraph>
            Ogni volta che paghi qualcosa (fornitore, abbonamento, affitto), registralo.
            Il flusso è simile a quello degli incassi:
          </Paragraph>

          <FlowBox
            title="Flusso corretto per registrare una spesa:"
            steps={["Verifica Previsionale", "Controlla Piano Annuale", "Registra in Consuntivo"]}
          />

          <StepList>
            <Step
              number={1}
              title="Verifica nel Previsionale"
              description="La spesa era già prevista? Controlla se c'è una voce corrispondente."
            />
            <Step
              number={2}
              title="Controlla il Piano Annuale"
              description="È una spesa ricorrente (es. abbonamento mensile)? Se è nuova, vai nel Piano Annuale e aggiungila alle Spese Previste."
            />
            <Step
              number={3}
              title="Registra nel Consuntivo"
              description="Inserisci l'importo pagato, la data e seleziona il Centro di Costo corretto."
            />
          </StepList>
        </Section>

        <Section>
          <SectionTitle>Come registrare un movimento</SectionTitle>
          <StepList>
            <Step number={1} title="Vai nella sezione Consuntivo" description="Menu laterale → Consuntivo" />
            <Step number={2} title="Clicca '+ Nuovo Movimento'" />
            <Step number={3} title="Compila i campi" description="Data, importo, descrizione, tipo (entrata/uscita), centro di costo o ricavo" />
            <Step number={4} title="Salva" />
          </StepList>
          <Tip>
            Per gli incassi, dopo aver salvato puoi cliccare &quot;Ripartisci&quot; per vedere nel dettaglio come si dividono i soldi tra IVA, soci e cassa.
          </Tip>
        </Section>
      </>
    ),
  },

  "previsionale": {
    title: "Previsionale",
    subtitle: "Visualizza entrate e uscite future",
    icon: CalendarRange,
    color: "bg-purple-500/10 text-purple-500",
    content: (
      <>
        <Section>
          <SectionTitle>A cosa serve</SectionTitle>
          <Paragraph>
            Il Previsionale mostra tutti gli incassi e le spese che ti aspetti nel futuro.
            È generato automaticamente dal Piano Annuale e dal Piano Commerciale.
          </Paragraph>
          <KeyPoint>
            Il Previsionale non si compila manualmente. Si popola automaticamente quando configuri correttamente il Piano Annuale e il Piano Commerciale.
          </KeyPoint>
        </Section>

        <Section>
          <SectionTitle>Da dove vengono i dati</SectionTitle>
          <div className="space-y-3 mb-4">
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-1">Spese previste</p>
              <p className="text-sm text-muted-foreground">Vengono dal Piano Annuale → sezione &quot;Spese Previste&quot;</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-1">Incassi previsti</p>
              <p className="text-sm text-muted-foreground">Vengono dal Piano Annuale → sezione &quot;Incassi Previsti&quot;</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-1">Rate vendite</p>
              <p className="text-sm text-muted-foreground">Vengono dal Piano Commerciale quando chiudi una vendita</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-1">Rate debiti</p>
              <p className="text-sm text-muted-foreground">Vengono dai Piani di Rientro</p>
            </div>
          </div>
        </Section>

        <Section>
          <SectionTitle>Affidabilità degli incassi</SectionTitle>
          <Paragraph>
            Non tutti gli incassi previsti sono ugualmente certi. Per questo ogni incasso ha un livello di affidabilità:
          </Paragraph>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1.5" />
              <div>
                <p className="font-medium">Alta</p>
                <p className="text-sm text-muted-foreground">Incasso praticamente certo. Viene contato al 100% nelle proiezioni.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
              <div className="w-3 h-3 rounded-full bg-yellow-500 mt-1.5" />
              <div>
                <p className="font-medium">Media</p>
                <p className="text-sm text-muted-foreground">Probabile ma non certo. Viene contato solo dopo quelli ad alta affidabilità.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1.5" />
              <div>
                <p className="font-medium">Bassa</p>
                <p className="text-sm text-muted-foreground">Incerto. NON viene contato nelle proiezioni per sicurezza.</p>
              </div>
            </div>
          </div>
          <Tip>
            L&apos;app è volutamente pessimista. Preferisce dirti che ti mancano soldi piuttosto che farti credere di averne abbastanza quando non è così.
          </Tip>
        </Section>

        <Section>
          <SectionTitle>Come usare il Previsionale</SectionTitle>
          <Paragraph>
            Il Previsionale serve principalmente per <strong>confrontare</strong> ciò che avevi previsto con ciò che è realmente successo:
          </Paragraph>
          <StepList>
            <Step number={1} title="Guarda le voci del mese corrente" description="Quali incassi ti aspettavi? Quali spese?" />
            <Step number={2} title="Confronta con il Consuntivo" description="Gli incassi sono arrivati? Le spese le hai pagate?" />
            <Step number={3} title="Se qualcosa non torna, agisci" description="Cliente in ritardo? Spesa imprevista? Aggiorna le previsioni." />
          </StepList>
        </Section>
      </>
    ),
  },

  "piano-annuale": {
    title: "Piano Annuale",
    subtitle: "Configura spese e incassi ricorrenti",
    icon: Settings,
    color: "bg-orange-500/10 text-orange-500",
    content: (
      <>
        <Section>
          <SectionTitle>A cosa serve</SectionTitle>
          <Paragraph>
            Il Piano Annuale è dove configuri tutte le spese e gli incassi che si ripetono regolarmente.
            Sono i &quot;mattoni&quot; che costruiscono il tuo Previsionale automaticamente.
          </Paragraph>
          <KeyPoint>
            Configura bene il Piano Annuale una volta sola, e il Previsionale si popolerà automaticamente per tutto l&apos;anno.
          </KeyPoint>
        </Section>

        <Section>
          <SectionTitle>Le quattro sezioni</SectionTitle>
          <div className="space-y-4 mb-4">
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-2">1. Centri di Costo</p>
              <p className="text-sm text-muted-foreground mb-2">
                Sono le categorie in cui raggruppare le spese. Esempi: Telefonia, Software, Server, Collaboratori, Ufficio.
              </p>
              <p className="text-xs text-muted-foreground">Servono per capire dove vanno i soldi quando analizzi i report.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-2">2. Spese Previste</p>
              <p className="text-sm text-muted-foreground mb-2">
                Sono le spese ricorrenti che sai di dover pagare. Esempi: abbonamento Wind, Asana, affitto ufficio.
              </p>
              <p className="text-xs text-muted-foreground">Per ogni spesa indichi: importo, frequenza (mensile/trimestrale/annuale), giorno del mese, priorità.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-2">3. Centri di Ricavo</p>
              <p className="text-sm text-muted-foreground mb-2">
                Sono le categorie in cui raggruppare gli incassi. Esempi: Siti Web, Marketing, Licenze, Domini.
              </p>
              <p className="text-xs text-muted-foreground">Servono per capire da dove arrivano i soldi.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/50">
              <p className="font-medium mb-2">4. Incassi Previsti</p>
              <p className="text-sm text-muted-foreground mb-2">
                Sono gli incassi ricorrenti che ti aspetti. Esempi: canone mensile Cliente X, rinnovo annuale Cliente Y.
              </p>
              <p className="text-xs text-muted-foreground">Per ogni incasso indichi: cliente, importo, frequenza, giorno del mese, affidabilità.</p>
            </div>
          </div>
        </Section>

        <Section>
          <SectionTitle>Aggiungere una spesa ricorrente</SectionTitle>
          <StepList>
            <Step number={1} title="Vai in Impostazioni" description="Menu laterale → Impostazioni" />
            <Step number={2} title="Seleziona 'Spese Previste'" />
            <Step number={3} title="Clicca '+ Nuova Spesa'" />
            <Step number={4} title="Compila i campi:" />
          </StepList>
          <div className="pl-11 space-y-2 mb-4 text-sm">
            <p><strong>Nome:</strong> es. &quot;Wind Telefonica&quot;</p>
            <p><strong>Centro di Costo:</strong> es. &quot;Telefonia&quot;</p>
            <p><strong>Importo:</strong> quanto paghi ogni volta</p>
            <p><strong>Frequenza:</strong> mensile, trimestrale, annuale, ecc.</p>
            <p><strong>Giorno del mese:</strong> quando scade di solito</p>
            <p><strong>Priorità:</strong> quanto è importante pagarla</p>
          </div>
          <Tip>
            La priorità aiuta l&apos;app a capire quali spese sono vitali (da pagare assolutamente) e quali sono rinviabili in caso di difficoltà.
          </Tip>
        </Section>

        <Section>
          <SectionTitle>Aggiungere un incasso ricorrente</SectionTitle>
          <StepList>
            <Step number={1} title="Vai in Impostazioni" description="Menu laterale → Impostazioni" />
            <Step number={2} title="Seleziona 'Incassi Previsti'" />
            <Step number={3} title="Clicca '+ Nuovo Incasso'" />
            <Step number={4} title="Compila i campi:" />
          </StepList>
          <div className="pl-11 space-y-2 mb-4 text-sm">
            <p><strong>Cliente:</strong> nome del cliente</p>
            <p><strong>Centro di Ricavo:</strong> es. &quot;Siti Web&quot;</p>
            <p><strong>Importo:</strong> quanto ti paga ogni volta (LORDO)</p>
            <p><strong>Frequenza:</strong> mensile, trimestrale, annuale, ecc.</p>
            <p><strong>Giorno del mese:</strong> quando ti paga di solito</p>
            <p><strong>Affidabilità:</strong> quanto sei sicuro che pagherà</p>
          </div>
          <Warning>
            Sii realistico con l&apos;affidabilità. Se un cliente paga sempre in ritardo o a volte salta, metti &quot;Media&quot; o &quot;Bassa&quot;.
          </Warning>
        </Section>

        <Section>
          <SectionTitle>Terminare un contratto</SectionTitle>
          <Paragraph>
            Se un cliente smette di pagarti o cancelli un abbonamento, non eliminare la voce. Usa la funzione &quot;Termina&quot;:
          </Paragraph>
          <StepList>
            <Step number={1} title="Trova la voce nella lista" />
            <Step number={2} title="Clicca 'Termina'" />
            <Step number={3} title="Inserisci la data di fine" />
          </StepList>
          <Tip>
            Terminare invece di eliminare ti permette di mantenere lo storico e vedere quanto spendevi/incassavi in passato.
          </Tip>
        </Section>
      </>
    ),
  },

  "piano-commerciale": {
    title: "Piano Commerciale",
    subtitle: "Gestisci obiettivi e vendite",
    icon: Target,
    color: "bg-pink-500/10 text-pink-500",
    content: (
      <>
        <Section>
          <SectionTitle>A cosa serve</SectionTitle>
          <Paragraph>
            Il Piano Commerciale ti aiuta a pianificare quanto devi vendere per coprire le spese e i debiti.
            Ti permette di definire obiettivi di vendita e tracciare le trattative in corso.
          </Paragraph>
          <KeyPoint>
            Il Piano Commerciale risponde alla domanda: &quot;Quanto devo fatturare questo mese per stare tranquillo?&quot;
          </KeyPoint>
        </Section>

        <Section>
          <SectionTitle>I quattro stati di una vendita</SectionTitle>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3 p-3 rounded-lg border border-border/50">
              <div className="text-xl">📊</div>
              <div>
                <p className="font-medium">Obiettivo</p>
                <p className="text-sm text-muted-foreground">Un piano generico senza cliente specifico. Es: &quot;Voglio vendere 1 sito web a febbraio&quot;</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg border border-border/50">
              <div className="text-xl">🎯</div>
              <div>
                <p className="font-medium">Opportunità</p>
                <p className="text-sm text-muted-foreground">Una trattativa in corso con un cliente specifico. Hai fatto il preventivo.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg border border-border/50">
              <div className="text-xl">✅</div>
              <div>
                <p className="font-medium">Vinta</p>
                <p className="text-sm text-muted-foreground">Il cliente ha accettato. La vendita è chiusa.</p>
              </div>
            </div>
            <div className="flex gap-3 p-3 rounded-lg border border-border/50">
              <div className="text-xl">❌</div>
              <div>
                <p className="font-medium">Persa</p>
                <p className="text-sm text-muted-foreground">Il cliente ha rifiutato o la trattativa è saltata.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section>
          <SectionTitle>Come usare il Piano Commerciale</SectionTitle>

          <p className="font-medium mb-3">1. A inizio mese: definisci gli obiettivi</p>
          <Paragraph>
            Guarda quanto devi fatturare (lo vedi nella Dashboard) e crea degli obiettivi generici
            per raggiungere quella cifra.
          </Paragraph>

          <p className="font-medium mb-3">2. Durante il mese: traccia le opportunità</p>
          <Paragraph>
            Quando fai un preventivo a un cliente, trasforma l&apos;obiettivo in un&apos;opportunità
            (o creane una nuova) con i dati specifici.
          </Paragraph>

          <p className="font-medium mb-3">3. Quando chiudi: segna come vinta</p>
          <Paragraph>
            Quando il cliente accetta, segna l&apos;opportunità come &quot;Vinta&quot;.
            Le rate di incasso verranno aggiunte automaticamente al Previsionale.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>Tipi di pagamento</SectionTitle>
          <Paragraph>
            Quando crei una vendita, devi indicare come il cliente ti pagherà:
          </Paragraph>
          <div className="space-y-2 mb-4 text-sm">
            <div className="p-3 rounded bg-muted/50">
              <strong>Sito Web 50/50:</strong> 50% all&apos;ordine, 50% alla consegna
            </div>
            <div className="p-3 rounded bg-muted/50">
              <strong>MSD 30/70:</strong> 30% all&apos;ordine, 70% alla consegna
            </div>
            <div className="p-3 rounded bg-muted/50">
              <strong>Marketing trimestrale:</strong> Diviso in 4 rate trimestrali
            </div>
            <div className="p-3 rounded bg-muted/50">
              <strong>Immediato:</strong> Tutto subito
            </div>
          </div>
          <Tip>
            Il tipo di pagamento determina quando vedrai gli incassi nel Previsionale.
            Se vendi un sito da €5.000 con pagamento 50/50, vedrai €2.500 subito e €2.500 alla consegna.
          </Tip>
        </Section>

        <Section>
          <SectionTitle>Gap Analysis</SectionTitle>
          <Paragraph>
            L&apos;app calcola automaticamente il &quot;gap&quot; tra quanto ti serve e quanto hai già venduto:
          </Paragraph>
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50 font-mono text-sm mb-4">
            GAP = (Spese previste + Rate debiti) − Incassi certi
          </div>
          <Paragraph>
            Se il gap è positivo, significa che devi vendere di più. Il &quot;Target fatturato&quot; nella Dashboard
            ti dice esattamente quanto devi vendere in LORDO per colmare il gap.
          </Paragraph>
          <Warning>
            Ricorda: del fatturato lordo, solo il 48% resta disponibile in cassa.
            Se ti servono €5.000 in cassa, devi fatturare circa €10.400.
          </Warning>
        </Section>
      </>
    ),
  },

  "piani-di-rientro": {
    title: "Piani di Rientro",
    subtitle: "Gestisci debiti e rate",
    icon: CreditCard,
    color: "bg-red-500/10 text-red-500",
    content: (
      <>
        <Section>
          <SectionTitle>A cosa serve</SectionTitle>
          <Paragraph>
            I Piani di Rientro (PDR) servono a gestire i debiti che devi pagare a rate.
            Può essere un debito con un fornitore, un finanziamento, o qualsiasi importo che stai restituendo gradualmente.
          </Paragraph>
          <KeyPoint>
            Ogni rata di un PDR viene automaticamente inserita nel Previsionale come spesa da pagare.
          </KeyPoint>
        </Section>

        <Section>
          <SectionTitle>Creare un Piano di Rientro</SectionTitle>
          <StepList>
            <Step number={1} title="Vai in Piani di Rientro" description="Menu laterale → Piani di Rientro" />
            <Step number={2} title="Clicca '+ Nuovo Piano'" />
            <Step number={3} title="Compila i campi:" />
          </StepList>
          <div className="pl-11 space-y-2 mb-4 text-sm">
            <p><strong>Creditore:</strong> a chi devi i soldi</p>
            <p><strong>Importo totale:</strong> quanto devi in tutto</p>
            <p><strong>Numero rate:</strong> in quante rate pagherai</p>
            <p><strong>Data inizio:</strong> quando inizia il piano</p>
          </div>
          <Tip>
            L&apos;importo della singola rata viene calcolato automaticamente dividendo il totale per il numero di rate.
          </Tip>
        </Section>

        <Section>
          <SectionTitle>Segnare una rata come pagata</SectionTitle>
          <StepList>
            <Step number={1} title="Trova il piano nella lista" />
            <Step number={2} title="Espandi per vedere le rate" />
            <Step number={3} title="Clicca 'Segna come pagata' sulla rata" />
            <Step number={4} title="Conferma la data di pagamento" />
          </StepList>
          <Paragraph>
            Quando segni una rata come pagata, il progresso del piano si aggiorna e la rata
            scompare dalle spese future nel Previsionale.
          </Paragraph>
        </Section>

        <Section>
          <SectionTitle>Strategia: Effetto Snowball</SectionTitle>
          <Paragraph>
            Se hai più debiti, l&apos;app suggerisce di usare la strategia &quot;Snowball&quot;:
            paga prima i debiti più piccoli.
          </Paragraph>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">Chiudi velocemente i debiti minori</p>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">Liberi liquidità per quelli maggiori</p>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">Ottieni motivazione vedendo i progressi</p>
            </div>
          </div>
          <Tip>
            Psicologicamente, chiudere un debito (anche piccolo) dà una grande soddisfazione
            e ti motiva a continuare. Non sottovalutare questo effetto!
          </Tip>
        </Section>

        <Section>
          <SectionTitle>PDR e Dashboard</SectionTitle>
          <Paragraph>
            Le rate dei PDR vengono considerate nel calcolo del &quot;Target fatturato&quot;.
            Questo significa che quando l&apos;app ti dice quanto devi fatturare,
            sta già includendo le rate dei debiti da pagare.
          </Paragraph>
          <Warning>
            Non dimenticare di creare un PDR per ogni debito che hai.
            Se non lo fai, l&apos;app non saprà che devi pagare quelle rate e le proiezioni saranno sbagliate.
          </Warning>
        </Section>
      </>
    ),
  },
};

// ============================================
// NAVIGAZIONE TRA SEZIONI
// ============================================

const sectionOrder = [
  "come-funziona",
  "consuntivo",
  "previsionale",
  "piano-annuale",
  "piano-commerciale",
  "piani-di-rientro",
];

// ============================================
// COMPONENTE PAGINA
// ============================================

export default function GuidaSectionPage() {
  const params = useParams();
  const section = params.section as string;

  const currentIndex = sectionOrder.indexOf(section);
  const prevSection = currentIndex > 0 ? sectionOrder[currentIndex - 1] : null;
  const nextSection = currentIndex < sectionOrder.length - 1 ? sectionOrder[currentIndex + 1] : null;

  const sectionData = sections[section];

  if (!sectionData) {
    return (
      <div className="min-h-screen pb-20 lg:pb-6">
        <MobileHeader title="Guida" />
        <div className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Sezione non trovata</p>
          <Link href="/guida" className="text-primary hover:underline">
            Torna alla guida
          </Link>
        </div>
      </div>
    );
  }

  const Icon = sectionData.icon;

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      <MobileHeader title="Guida" />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/guida"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all&apos;indice
        </Link>

        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className={`p-3 rounded-xl ${sectionData.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-1">{sectionData.title}</h1>
            <p className="text-muted-foreground">{sectionData.subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {sectionData.content}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-border/50">
          {prevSection ? (
            <Link
              href={`/guida/${prevSection}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{sections[prevSection]?.title}</span>
              <span className="sm:hidden">Precedente</span>
            </Link>
          ) : (
            <div />
          )}

          {nextSection ? (
            <Link
              href={`/guida/${nextSection}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="hidden sm:inline">{sections[nextSection]?.title}</span>
              <span className="sm:hidden">Successiva</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
