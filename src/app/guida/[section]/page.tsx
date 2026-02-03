"use client";

import { useParams, useRouter } from "next/navigation";
import { MobileHeader } from "@/components/MobileHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

const guideSections: Record<string, { title: string; content: React.ReactNode }> = {
  "introduzione": {
    title: "Introduzione",
    content: (
      <div className="prose prose-invert max-w-none">
        <h2>Cos&apos;è KW Cashflow?</h2>
        <p>
          KW Cashflow è il tuo strumento per <strong>prendere decisioni rapide sul cashflow aziendale</strong>.
          Non è un software di contabilità, ma un&apos;app decisionale che risponde a 3 domande fondamentali:
        </p>

        <table>
          <thead>
            <tr>
              <th>Domanda</th>
              <th>Dove trovi la risposta</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>💰 <strong>Quanto ho in cassa?</strong></td>
              <td>Dashboard → Saldo disponibile</td>
            </tr>
            <tr>
              <td>📅 <strong>Cosa devo pagare?</strong></td>
              <td>Dashboard → Scadenze prossimi 7 giorni</td>
            </tr>
            <tr>
              <td>🎯 <strong>Quanto devo fatturare?</strong></td>
              <td>Dashboard → Target fatturato</td>
            </tr>
          </tbody>
        </table>

        <h2>Quando usare l&apos;app</h2>
        <table>
          <thead>
            <tr>
              <th>Frequenza</th>
              <th>Cosa fare</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Ogni giorno</strong></td>
              <td>Registra incassi e spese quando avvengono</td>
              <td>30 secondi</td>
            </tr>
            <tr>
              <td><strong>Ogni settimana</strong></td>
              <td>Verifica se le previsioni sono rispettate</td>
              <td>5 minuti</td>
            </tr>
            <tr>
              <td><strong>Ogni mese</strong></td>
              <td>Analizza vendite, aggiusta il target</td>
              <td>15 minuti</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  "accesso-e-login": {
    title: "Accesso e Login",
    content: (
      <div className="prose prose-invert max-w-none">
        <h2>Come accedere</h2>
        <ol>
          <li>Vai su <strong>finance.karalisdemo.it</strong></li>
          <li>Inserisci la tua <strong>email</strong></li>
          <li>Inserisci la tua <strong>password</strong></li>
          <li>Clicca <strong>Accedi</strong></li>
        </ol>

        <h2>Verifica in due passaggi (2FA)</h2>
        <p>Se hai attivato la verifica in due passaggi:</p>
        <ol>
          <li>Dopo aver inserito email e password, riceverai un <strong>codice via email</strong></li>
          <li>Il codice è di <strong>6 cifre</strong> e scade dopo <strong>10 minuti</strong></li>
          <li>Inserisci il codice e clicca <strong>Verifica</strong></li>
        </ol>
        <p className="bg-primary/10 p-3 rounded-lg">
          💡 <strong>Tip:</strong> Se non ricevi il codice, controlla la cartella spam o clicca &quot;Reinvia codice&quot;
        </p>

        <h2>Password dimenticata?</h2>
        <ol>
          <li>Nella pagina di login, clicca <strong>&quot;Password dimenticata?&quot;</strong></li>
          <li>Inserisci la tua email</li>
          <li>Riceverai un codice via email</li>
          <li>Inserisci il codice e la nuova password</li>
          <li>Clicca <strong>Reimposta password</strong></li>
        </ol>
        <p className="bg-amber-500/10 p-3 rounded-lg text-amber-200">
          ⚠️ <strong>Attenzione:</strong> La nuova password deve essere di almeno 6 caratteri
        </p>
      </div>
    ),
  },
  "consuntivo": {
    title: "Consuntivo",
    content: (
      <div className="prose prose-invert max-w-none">
        <p>Il <strong>Consuntivo</strong> è dove registri tutti i movimenti reali: incassi ricevuti e spese effettuate.</p>

        <h2>Come accedere</h2>
        <p>📍 <strong>Menu laterale → Consuntivo</strong></p>

        <h2>Cosa vedi</h2>
        <ul>
          <li><strong>Totale Entrate:</strong> Somma di tutti gli incassi registrati</li>
          <li><strong>Totale Uscite:</strong> Somma di tutte le spese registrate</li>
          <li><strong>Saldo:</strong> Differenza tra entrate e uscite</li>
          <li><strong>Riepilogo Ripartizioni:</strong> Quanto è stato versato ai soci e all&apos;IVA</li>
        </ul>

        <h2>Registrare un incasso</h2>
        <ol>
          <li>Clicca <strong>+ Nuovo Movimento</strong></li>
          <li>Seleziona <strong>Entrata</strong></li>
          <li>Compila:
            <ul>
              <li><strong>Data:</strong> quando hai ricevuto il pagamento</li>
              <li><strong>Importo:</strong> l&apos;importo LORDO (IVA inclusa)</li>
              <li><strong>Descrizione:</strong> nome cliente o motivo</li>
              <li><strong>Centro di ricavo:</strong> categoria (es. Siti Web, Marketing)</li>
            </ul>
          </li>
          <li>Clicca <strong>Salva</strong></li>
        </ol>

        <p className="bg-primary/10 p-3 rounded-lg">
          💡 <strong>Tip:</strong> L&apos;app calcola automaticamente la ripartizione:<br/>
          • <strong>22%</strong> → IVA (da versare allo Stato)<br/>
          • <strong>30%</strong> → Quote soci (Daniela 10% + Alessio 20%)<br/>
          • <strong>48%</strong> → Disponibile per la cassa
        </p>

        <h2>Registrare una spesa</h2>
        <ol>
          <li>Clicca <strong>+ Nuovo Movimento</strong></li>
          <li>Seleziona <strong>Uscita</strong></li>
          <li>Compila:
            <ul>
              <li><strong>Data:</strong> quando hai pagato</li>
              <li><strong>Importo:</strong> l&apos;importo pagato</li>
              <li><strong>Descrizione:</strong> fornitore o motivo</li>
              <li><strong>Centro di costo:</strong> categoria (es. Software, Telefonia)</li>
            </ul>
          </li>
          <li>Clicca <strong>Salva</strong></li>
        </ol>

        <h2>Calcolare la ripartizione di un incasso</h2>
        <p>Quando registri un incasso, puoi vedere come viene ripartito:</p>
        <ol>
          <li>Nella lista movimenti, trova l&apos;incasso</li>
          <li>Clicca il pulsante <strong>Ripartisci</strong> (icona calcolatrice)</li>
          <li>Vedi il dettaglio</li>
        </ol>

        <table>
          <thead>
            <tr>
              <th>Voce</th>
              <th>Percentuale</th>
              <th>Esempio su €1.000</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Lordo IVA</td>
              <td>100%</td>
              <td>€1.000,00</td>
            </tr>
            <tr>
              <td>IVA 22%</td>
              <td>22% del netto</td>
              <td>€180,33</td>
            </tr>
            <tr>
              <td>Daniela</td>
              <td>10% del netto</td>
              <td>€81,97</td>
            </tr>
            <tr>
              <td>Alessio</td>
              <td>20% del netto</td>
              <td>€163,93</td>
            </tr>
            <tr>
              <td><strong>Disponibile</strong></td>
              <td>48% del lordo</td>
              <td><strong>€573,77</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  "previsionale": {
    title: "Previsionale",
    content: (
      <div className="prose prose-invert max-w-none">
        <p>Il <strong>Previsionale</strong> mostra cosa ti aspetti di incassare e spendere nei prossimi mesi.</p>

        <h2>Come accedere</h2>
        <p>📍 <strong>Menu laterale → Previsionale</strong></p>

        <h2>Cosa vedi</h2>
        <p>Una tabella con tutte le voci previste:</p>
        <ul>
          <li><strong>Data:</strong> quando è previsto il movimento</li>
          <li><strong>Descrizione:</strong> cosa è (es. &quot;Wind Telefonica&quot;, &quot;Cliente Rossi&quot;)</li>
          <li><strong>Tipo:</strong> Entrata (verde) o Uscita (rosso)</li>
          <li><strong>Importo:</strong> quanto</li>
          <li><strong>Centro:</strong> categoria associata</li>
        </ul>

        <h2>Affidabilità degli incassi</h2>
        <p>Ogni incasso previsto ha un livello di affidabilità:</p>
        <table>
          <thead>
            <tr>
              <th>Livello</th>
              <th>Significato</th>
              <th>Come viene calcolato</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>🟢 <strong>Alta</strong></td>
              <td>Sicuro al 100%</td>
              <td>Conta tutto nelle proiezioni</td>
            </tr>
            <tr>
              <td>🟡 <strong>Media</strong></td>
              <td>Probabile</td>
              <td>Conta solo dopo quelli &quot;Alta&quot;</td>
            </tr>
            <tr>
              <td>🔴 <strong>Bassa</strong></td>
              <td>Incerto</td>
              <td>NON conta nelle proiezioni</td>
            </tr>
          </tbody>
        </table>
        <p className="bg-primary/10 p-3 rounded-lg">
          💡 <strong>Tip:</strong> L&apos;app è pessimista di default. Gli incassi &quot;Bassa&quot; non vengono mai contati per evitare sorprese.
        </p>

        <h2>Priorità delle spese</h2>
        <table>
          <thead>
            <tr>
              <th>Priorità</th>
              <th>Significato</th>
              <th>Esempi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>🔴 <strong>Essenziale</strong></td>
              <td>DEVE essere pagata</td>
              <td>Server, strumenti vitali</td>
            </tr>
            <tr>
              <td>🟠 <strong>Importante</strong></td>
              <td>Difficile rinunciare</td>
              <td>Affitto, telefono</td>
            </tr>
            <tr>
              <td>🟡 <strong>Investimento</strong></td>
              <td>Utile ma rinviabile</td>
              <td>Software opzionali</td>
            </tr>
            <tr>
              <td>⚪ <strong>Normale</strong></td>
              <td>Ordinaria</td>
              <td>Altro</td>
            </tr>
          </tbody>
        </table>
      </div>
    ),
  },
  "piani-di-rientro-pdr": {
    title: "Piani di Rientro (PDR)",
    content: (
      <div className="prose prose-invert max-w-none">
        <p>I <strong>Piani di Rientro</strong> servono a gestire i debiti da pagare a rate.</p>

        <h2>Come accedere</h2>
        <p>📍 <strong>Menu laterale → Piani di Rientro</strong></p>

        <h2>Cosa vedi</h2>
        <ul>
          <li>Lista di tutti i debiti con rate concordate</li>
          <li>Per ogni piano: creditore, importo totale, rate pagate/totali</li>
          <li>Progresso visivo (barra percentuale)</li>
        </ul>

        <h2>Creare un nuovo piano</h2>
        <ol>
          <li>Clicca <strong>+ Nuovo Piano</strong></li>
          <li>Compila:
            <ul>
              <li><strong>Creditore:</strong> a chi devi i soldi</li>
              <li><strong>Importo totale:</strong> debito complessivo</li>
              <li><strong>Numero rate:</strong> in quante rate paghi</li>
              <li><strong>Data inizio:</strong> quando parte il piano</li>
              <li><strong>Note:</strong> informazioni aggiuntive (opzionale)</li>
            </ul>
          </li>
          <li>Clicca <strong>Salva</strong></li>
        </ol>
        <p className="bg-primary/10 p-3 rounded-lg">
          💡 <strong>Tip:</strong> L&apos;importo della singola rata viene calcolato automaticamente (totale ÷ numero rate)
        </p>

        <h2>Marcare una rata come pagata</h2>
        <ol>
          <li>Trova il piano nella lista</li>
          <li>Clicca per espandere e vedere le rate</li>
          <li>Clicca <strong>Segna come pagata</strong> sulla rata</li>
          <li>Conferma la data di pagamento</li>
        </ol>

        <h2>Strategia consigliata: Effetto Snowball</h2>
        <p>L&apos;app suggerisce di pagare prima i <strong>debiti più piccoli</strong>:</p>
        <ul>
          <li>Chiudi velocemente i debiti minori</li>
          <li>Liberi liquidità per quelli maggiori</li>
          <li>Ottieni motivazione vedendo i progressi</li>
        </ul>
      </div>
    ),
  },
  "piano-commerciale": {
    title: "Piano Commerciale",
    content: (
      <div className="prose prose-invert max-w-none">
        <p>Il <strong>Piano Commerciale</strong> ti aiuta a pianificare quanto devi vendere per raggiungere i tuoi obiettivi.</p>

        <h2>Come accedere</h2>
        <p>📍 <strong>Menu laterale → Piano Commerciale</strong></p>

        <h2>Tipi di voci</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Significato</th>
              <th>Quando usarlo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>📊 <strong>Obiettivo</strong></td>
              <td>Piano generico</td>
              <td>&quot;Voglio vendere 1 sito web a febbraio&quot;</td>
            </tr>
            <tr>
              <td>🎯 <strong>Opportunità</strong></td>
              <td>Trattativa in corso</td>
              <td>&quot;Ho fatto preventivo a Cliente X&quot;</td>
            </tr>
            <tr>
              <td>✅ <strong>Vinta</strong></td>
              <td>Vendita chiusa</td>
              <td>&quot;Cliente X ha accettato&quot;</td>
            </tr>
            <tr>
              <td>❌ <strong>Persa</strong></td>
              <td>Non conclusa</td>
              <td>&quot;Cliente X ha rifiutato&quot;</td>
            </tr>
          </tbody>
        </table>

        <h2>Creare un obiettivo/opportunità</h2>
        <ol>
          <li>Clicca <strong>+ Nuova Voce</strong></li>
          <li>Compila:
            <ul>
              <li><strong>Cliente:</strong> nome (opzionale per obiettivi generici)</li>
              <li><strong>Tipo progetto:</strong> Sito Web, Marketing, MSD, Licenza, Altro</li>
              <li><strong>Importo lordo:</strong> valore totale IVA inclusa</li>
              <li><strong>Mese obiettivo:</strong> quando vuoi chiuderla</li>
              <li><strong>Tipo pagamento:</strong> come incasserai</li>
            </ul>
          </li>
          <li>Clicca <strong>Salva</strong></li>
        </ol>

        <h2>Tipi di pagamento</h2>
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Come funziona</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Sito Web 50/50</strong></td>
              <td>50% subito, 50% alla consegna</td>
            </tr>
            <tr>
              <td><strong>MSD 30/70</strong></td>
              <td>30% subito, 70% alla consegna</td>
            </tr>
            <tr>
              <td><strong>Marketing trimestrale</strong></td>
              <td>Diviso in 4 rate trimestrali</td>
            </tr>
            <tr>
              <td><strong>Immediato</strong></td>
              <td>Tutto subito</td>
            </tr>
            <tr>
              <td><strong>Custom</strong></td>
              <td>Personalizzato</td>
            </tr>
          </tbody>
        </table>

        <h2>Gap Analysis</h2>
        <p>L&apos;app calcola automaticamente il <strong>gap mensile</strong>:</p>
        <p className="bg-muted p-3 rounded-lg font-mono text-sm">
          GAP = Spese previste + Rate PDR - Incassi certi
        </p>
        <p>Se il gap è positivo, devi vendere di più!</p>
        <p className="bg-primary/10 p-3 rounded-lg">
          💡 <strong>Tip:</strong> Il &quot;Target fatturato&quot; nella dashboard ti dice quanto devi vendere in LORDO per coprire il gap (tenendo conto che solo il 48% resta in cassa).
        </p>
      </div>
    ),
  },
  "piano-annuale-impostazioni": {
    title: "Piano Annuale (Impostazioni)",
    content: (
      <div className="prose prose-invert max-w-none">
        <p>Il <strong>Piano Annuale</strong> è dove configuri le spese e gli incassi ricorrenti.</p>

        <h2>Come accedere</h2>
        <p>📍 <strong>Menu laterale → Impostazioni</strong></p>

        <h2>Le 4 sezioni</h2>

        <h3>1. Centri di Costo</h3>
        <p>Categorie per raggruppare le spese:</p>
        <ul>
          <li><strong>Telefonia:</strong> Wind, MyCentralino</li>
          <li><strong>Software:</strong> Asana, servizi online</li>
          <li><strong>Server:</strong> hosting, domini</li>
          <li><strong>Collaboratori:</strong> compensi esterni</li>
          <li><strong>Ufficio:</strong> affitto, utenze</li>
        </ul>

        <h3>2. Spese Previste</h3>
        <p>Le spese che sai già di dover sostenere:</p>
        <ul>
          <li>Abbonamenti mensili</li>
          <li>Affitti</li>
          <li>Rate fisse</li>
        </ul>
        <p><strong>Per aggiungere:</strong> Nome, Centro di costo, Importo, Frequenza, Giorno mese, Date inizio/fine, Priorità</p>

        <h3>3. Centri di Ricavo</h3>
        <p>Categorie per raggruppare gli incassi:</p>
        <ul>
          <li><strong>Siti Web:</strong> sviluppo siti</li>
          <li><strong>Marketing:</strong> campagne, ads</li>
          <li><strong>Domini:</strong> rinnovi domini</li>
          <li><strong>Licenze:</strong> software venduti</li>
        </ul>

        <h3>4. Incassi Previsti</h3>
        <p>Gli incassi ricorrenti che ti aspetti:</p>
        <ul>
          <li>Canoni mensili clienti</li>
          <li>Rinnovi annuali</li>
        </ul>
        <p><strong>Per aggiungere:</strong> Nome cliente, Centro di ricavo, Importo, Frequenza, Giorno mese, Affidabilità</p>

        <h2>Terminare un contratto</h2>
        <p>Se un cliente o un fornitore smette:</p>
        <ol>
          <li>Trova la voce nella lista</li>
          <li>Clicca <strong>Termina</strong></li>
          <li>Inserisci la data di fine</li>
          <li>Conferma</li>
        </ol>
        <p>La voce non verrà più considerata nelle proiezioni future.</p>
      </div>
    ),
  },
  "profilo-e-sicurezza": {
    title: "Profilo e Sicurezza",
    content: (
      <div className="prose prose-invert max-w-none">
        <h2>Come accedere</h2>
        <p>📍 <strong>Menu laterale → Profilo</strong></p>

        <h2>Modificare il nome</h2>
        <ol>
          <li>Clicca sul campo <strong>Nome</strong></li>
          <li>Modifica</li>
          <li>Clicca <strong>Salva</strong></li>
        </ol>

        <h2>Cambiare password</h2>
        <ol>
          <li>Clicca <strong>Cambia Password</strong></li>
          <li>Inserisci la password attuale</li>
          <li>Inserisci la nuova password (minimo 6 caratteri)</li>
          <li>Conferma la nuova password</li>
          <li>Clicca <strong>Salva</strong></li>
        </ol>

        <h2>Attivare la verifica in due passaggi (2FA)</h2>
        <p>La 2FA aggiunge sicurezza: anche se qualcuno scopre la tua password, non può accedere senza il codice.</p>
        <p><strong>Per attivare:</strong></p>
        <ol>
          <li>Vai su <strong>Profilo</strong></li>
          <li>Clicca <strong>Attiva 2FA</strong></li>
          <li>Scegli il metodo:
            <ul>
              <li><strong>Email OTP:</strong> ricevi codice via email ad ogni login</li>
              <li><strong>App TOTP:</strong> usa Google Authenticator o simile</li>
            </ul>
          </li>
          <li>Segui le istruzioni</li>
          <li>Salva i <strong>codici di backup</strong> in un posto sicuro!</li>
        </ol>
        <p className="bg-amber-500/10 p-3 rounded-lg text-amber-200">
          ⚠️ <strong>Importante:</strong> I codici di backup servono se perdi accesso all&apos;email o all&apos;app. Conservali offline!
        </p>

        <h2>Disattivare la 2FA</h2>
        <ol>
          <li>Vai su <strong>Profilo</strong></li>
          <li>Clicca <strong>Disattiva 2FA</strong></li>
          <li>Inserisci la password per confermare</li>
        </ol>

        <h2>Logout</h2>
        <p>Clicca <strong>Esci</strong> nel menu laterale (in basso)</p>
      </div>
    ),
  },
  "domande-frequenti": {
    title: "Domande Frequenti",
    content: (
      <div className="prose prose-invert max-w-none">
        <h2>Quanto ho disponibile in cassa?</h2>
        <p>📍 <strong>Dashboard → Saldo disponibile</strong></p>
        <p>Questo numero tiene conto di:</p>
        <ul>
          <li>Saldo attuale</li>
          <li>Meno le spese previste</li>
          <li>Meno le rate PDR</li>
          <li>Più gli incassi CERTI (solo affidabilità Alta)</li>
        </ul>

        <h2>Quali scadenze ho questa settimana?</h2>
        <p>📍 <strong>Dashboard → Scadenze prossimi 7 giorni</strong></p>
        <p>Vedi l&apos;elenco ordinato per data con icona colorata per priorità e importo.</p>

        <h2>Quanto devo fatturare questo mese?</h2>
        <p>📍 <strong>Dashboard → Target fatturato</strong></p>
        <p>Questo numero ti dice quanto devi vendere IN LORDO per coprire tutte le spese, pagare le rate PDR e mantenere un minimo di buffer.</p>
        <p className="bg-primary/10 p-3 rounded-lg">
          💡 <strong>Ricorda:</strong> Del fatturato lordo, solo il <strong>48%</strong> resta in cassa (dopo IVA e quote soci).
        </p>

        <h2>Perché il &quot;disponibile&quot; è diverso dal totale incassato?</h2>
        <p>Perché ogni incasso viene diviso:</p>
        <ul>
          <li><strong>22%</strong> → IVA (non è tua, va allo Stato)</li>
          <li><strong>30%</strong> → Quote soci (va ai soci)</li>
          <li><strong>48%</strong> → Disponibile (quello che puoi spendere)</li>
        </ul>

        <h2>Come faccio a sapere se sono in difficoltà?</h2>
        <p>📍 <strong>Dashboard → Stato azienda</strong></p>
        <table>
          <thead>
            <tr>
              <th>Stato</th>
              <th>Colore</th>
              <th>Significato</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>DIFESA</strong></td>
              <td>🔴 Rosso</td>
              <td>Meno di 30 giorni prima di non poter pagare</td>
            </tr>
            <tr>
              <td><strong>STABILIZZAZIONE</strong></td>
              <td>🟡 Giallo</td>
              <td>Paghi tutto ma senza margine</td>
            </tr>
            <tr>
              <td><strong>RICOSTRUZIONE</strong></td>
              <td>🟢 Verde</td>
              <td>Hai buffer, puoi investire</td>
            </tr>
          </tbody>
        </table>

        <h2>Posso usare l&apos;app da telefono?</h2>
        <p>Sì! L&apos;app è responsive:</p>
        <ul>
          <li>Su <strong>desktop:</strong> menu laterale sempre visibile</li>
          <li>Su <strong>mobile:</strong> menu in basso (bottom navigation)</li>
        </ul>
      </div>
    ),
  },
};

const sectionOrder = [
  "introduzione",
  "accesso-e-login",
  "consuntivo",
  "previsionale",
  "piani-di-rientro-pdr",
  "piano-commerciale",
  "piano-annuale-impostazioni",
  "profilo-e-sicurezza",
  "domande-frequenti",
];

export default function GuidaSectionPage() {
  const params = useParams();
  const router = useRouter();
  const section = params.section as string;

  const currentIndex = sectionOrder.indexOf(section);
  const prevSection = currentIndex > 0 ? sectionOrder[currentIndex - 1] : null;
  const nextSection = currentIndex < sectionOrder.length - 1 ? sectionOrder[currentIndex + 1] : null;

  const sectionData = guideSections[section];

  if (!sectionData) {
    return (
      <div className="min-h-screen pb-20 lg:pb-6">
        <MobileHeader title="Guida" />
        <div className="p-4 lg:p-6 text-center">
          <p className="text-muted-foreground">Sezione non trovata</p>
          <Button onClick={() => router.push("/guida")} className="mt-4">
            Torna alla guida
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      <MobileHeader title="Guida" />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {/* Back button */}
        <Link
          href="/guida"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna all&apos;indice
        </Link>

        {/* Title */}
        <h1 className="text-2xl lg:text-3xl font-bold mb-6">{sectionData.title}</h1>

        {/* Content */}
        <div className="mb-8">{sectionData.content}</div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-border">
          {prevSection ? (
            <Link
              href={`/guida/${prevSection}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{guideSections[prevSection]?.title}</span>
              <span className="sm:hidden">Precedente</span>
            </Link>
          ) : (
            <div />
          )}

          {nextSection ? (
            <Link
              href={`/guida/${nextSection}`}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <span className="hidden sm:inline">{guideSections[nextSection]?.title}</span>
              <span className="sm:hidden">Successivo</span>
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
