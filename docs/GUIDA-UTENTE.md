# KW Cashflow - Guida Utente

> **Versione:** 2.1
> **Ultimo aggiornamento:** 3 Febbraio 2026

---

## Indice

1. [Introduzione](#1-introduzione)
2. [Accesso e Login](#2-accesso-e-login)
3. [Consuntivo](#3-consuntivo)
4. [Previsionale](#4-previsionale)
5. [Piani di Rientro (PDR)](#5-piani-di-rientro-pdr)
6. [Piano Commerciale](#6-piano-commerciale)
7. [Piano Annuale (Impostazioni)](#7-piano-annuale-impostazioni)
8. [Profilo e Sicurezza](#8-profilo-e-sicurezza)
9. [Domande Frequenti](#9-domande-frequenti)
10. [Glossario](#10-glossario)

---

## 1. Introduzione

### Cos'è KW Cashflow?

KW Cashflow è il tuo strumento per **prendere decisioni rapide sul cashflow aziendale**. Non è un software di contabilità, ma un'app decisionale che risponde a 3 domande fondamentali:

| Domanda | Dove trovi la risposta |
|---------|------------------------|
| 💰 **Quanto ho in cassa?** | Dashboard → Saldo disponibile |
| 📅 **Cosa devo pagare?** | Dashboard → Scadenze prossimi 7 giorni |
| 🎯 **Quanto devo fatturare?** | Dashboard → Target fatturato |

### Come usare questa guida

Usa l'**indice** per saltare direttamente alla sezione che ti serve. Ogni sezione è autonoma.

### Quando usare l'app

| Frequenza | Cosa fare | Tempo |
|-----------|-----------|-------|
| **Ogni giorno** | Registra incassi e spese quando avvengono | 30 secondi |
| **Ogni settimana** | Verifica se le previsioni sono rispettate | 5 minuti |
| **Ogni mese** | Analizza vendite, aggiusta il target | 15 minuti |

---

## 2. Accesso e Login

### Come accedere

1. Vai su **finance.karalisdemo.it**
2. Inserisci la tua **email**
3. Inserisci la tua **password**
4. Clicca **Accedi**

### Verifica in due passaggi (2FA)

Se hai attivato la verifica in due passaggi:

1. Dopo aver inserito email e password, riceverai un **codice via email**
2. Il codice è di **6 cifre** e scade dopo **10 minuti**
3. Inserisci il codice e clicca **Verifica**

💡 **Tip:** Se non ricevi il codice, controlla la cartella spam o clicca "Reinvia codice"

### Password dimenticata?

1. Nella pagina di login, clicca **"Password dimenticata?"**
2. Inserisci la tua email
3. Riceverai un codice via email
4. Inserisci il codice e la nuova password
5. Clicca **Reimposta password**

⚠️ **Attenzione:** La nuova password deve essere di almeno 6 caratteri

---

## 3. Consuntivo

Il **Consuntivo** è dove registri tutti i movimenti reali: incassi ricevuti e spese effettuate.

### Come accedere

📍 **Menu laterale → Consuntivo**

### Cosa vedi

- **Totale Entrate:** Somma di tutti gli incassi registrati
- **Totale Uscite:** Somma di tutte le spese registrate
- **Saldo:** Differenza tra entrate e uscite
- **Riepilogo Ripartizioni:** Quanto è stato versato ai soci e all'IVA

### Registrare un nuovo movimento

#### Registrare un incasso

1. Clicca **+ Nuovo Movimento**
2. Seleziona **Entrata**
3. Compila:
   - **Data:** quando hai ricevuto il pagamento
   - **Importo:** l'importo LORDO (IVA inclusa)
   - **Descrizione:** nome cliente o motivo
   - **Centro di ricavo:** categoria (es. Siti Web, Marketing)
4. Clicca **Salva**

💡 **Tip:** L'app calcola automaticamente la ripartizione:
- **22%** → IVA (da versare allo Stato)
- **30%** → Quote soci (Daniela 10% + Alessio 20%)
- **48%** → Disponibile per la cassa

#### Registrare una spesa

1. Clicca **+ Nuovo Movimento**
2. Seleziona **Uscita**
3. Compila:
   - **Data:** quando hai pagato
   - **Importo:** l'importo pagato
   - **Descrizione:** fornitore o motivo
   - **Centro di costo:** categoria (es. Software, Telefonia)
4. Clicca **Salva**

### Calcolare la ripartizione di un incasso

Quando registri un incasso, puoi vedere come viene ripartito:

1. Nella lista movimenti, trova l'incasso
2. Clicca il pulsante **Ripartisci** (icona calcolatrice)
3. Vedi il dettaglio:

| Voce | Percentuale | Esempio su €1.000 |
|------|-------------|-------------------|
| Lordo IVA | 100% | €1.000,00 |
| IVA 22% | 22% del netto | €180,33 |
| Daniela | 10% del netto | €81,97 |
| Alessio | 20% del netto | €163,93 |
| **Disponibile** | 48% del lordo | €573,77 |

### Filtrare i movimenti

Usa i **tab** in alto per filtrare:
- **Tutti:** mostra tutto
- **Entrate:** solo incassi
- **Uscite:** solo spese

### Eliminare un movimento

1. Trova il movimento nella lista
2. Clicca l'icona **cestino** (🗑️)
3. Conferma l'eliminazione

⚠️ **Attenzione:** L'eliminazione non può essere annullata

---

## 4. Previsionale

Il **Previsionale** mostra cosa ti aspetti di incassare e spendere nei prossimi mesi.

### Come accedere

📍 **Menu laterale → Previsionale**

### Cosa vedi

Una tabella con tutte le voci previste:
- **Data:** quando è previsto il movimento
- **Descrizione:** cosa è (es. "Wind Telefonica", "Cliente Rossi")
- **Tipo:** Entrata (verde) o Uscita (rosso)
- **Importo:** quanto
- **Centro:** categoria associata

### Affidabilità degli incassi

Ogni incasso previsto ha un livello di affidabilità:

| Livello | Significato | Come viene calcolato |
|---------|-------------|----------------------|
| 🟢 **Alta** | Sicuro al 100% | Conta tutto nelle proiezioni |
| 🟡 **Media** | Probabile | Conta solo dopo quelli "Alta" |
| 🔴 **Bassa** | Incerto | NON conta nelle proiezioni |

💡 **Tip:** L'app è pessimista di default. Gli incassi "Bassa" non vengono mai contati per evitare sorprese.

### Priorità delle spese

Ogni spesa prevista ha una priorità:

| Priorità | Significato | Esempi |
|----------|-------------|--------|
| 🔴 **Essenziale** | DEVE essere pagata | Server, strumenti vitali |
| 🟠 **Importante** | Difficile rinunciare | Affitto, telefono |
| 🟡 **Investimento** | Utile ma rinviabile | Software opzionali |
| ⚪ **Normale** | Ordinaria | Altro |

### Modificare una voce previsionale

1. Trova la voce nella tabella
2. Clicca per modificare **data** o **importo**
3. Le modifiche vengono salvate automaticamente

---

## 5. Piani di Rientro (PDR)

I **Piani di Rientro** servono a gestire i debiti da pagare a rate.

### Come accedere

📍 **Menu laterale → Piani di Rientro**

### Cosa vedi

- Lista di tutti i debiti con rate concordate
- Per ogni piano: creditore, importo totale, rate pagate/totali
- Progresso visivo (barra percentuale)

### Creare un nuovo piano

1. Clicca **+ Nuovo Piano**
2. Compila:
   - **Creditore:** a chi devi i soldi
   - **Importo totale:** debito complessivo
   - **Numero rate:** in quante rate paghi
   - **Data inizio:** quando parte il piano
   - **Note:** informazioni aggiuntive (opzionale)
3. Clicca **Salva**

💡 **Tip:** L'importo della singola rata viene calcolato automaticamente (totale ÷ numero rate)

### Marcare una rata come pagata

1. Trova il piano nella lista
2. Clicca per espandere e vedere le rate
3. Clicca **Segna come pagata** sulla rata
4. Conferma la data di pagamento

### Strategia consigliata: Effetto Snowball

L'app suggerisce di pagare prima i **debiti più piccoli**:
- Chiudi velocemente i debiti minori
- Liberi liquidità per quelli maggiori
- Ottieni motivazione vedendo i progressi

---

## 6. Piano Commerciale

Il **Piano Commerciale** ti aiuta a pianificare quanto devi vendere per raggiungere i tuoi obiettivi.

### Come accedere

📍 **Menu laterale → Piano Commerciale**

### Tipi di voci

| Status | Significato | Quando usarlo |
|--------|-------------|---------------|
| 📊 **Obiettivo** | Piano generico | "Voglio vendere 1 sito web a febbraio" |
| 🎯 **Opportunità** | Trattativa in corso | "Ho fatto preventivo a Cliente X" |
| ✅ **Vinta** | Vendita chiusa | "Cliente X ha accettato" |
| ❌ **Persa** | Non conclusa | "Cliente X ha rifiutato" |

### Creare un obiettivo/opportunità

1. Clicca **+ Nuova Voce**
2. Compila:
   - **Cliente:** nome (opzionale per obiettivi generici)
   - **Tipo progetto:** Sito Web, Marketing, MSD, Licenza, Altro
   - **Importo lordo:** valore totale IVA inclusa
   - **Mese obiettivo:** quando vuoi chiuderla
   - **Tipo pagamento:** come incasserai (50/50, trimestrale, ecc.)
3. Clicca **Salva**

### Tipi di pagamento

| Tipo | Come funziona |
|------|---------------|
| **Sito Web 50/50** | 50% subito, 50% alla consegna |
| **MSD 30/70** | 30% subito, 70% alla consegna |
| **Marketing trimestrale** | Diviso in 4 rate trimestrali |
| **Immediato** | Tutto subito |
| **Custom** | Personalizzato |

### Gap Analysis

L'app calcola automaticamente il **gap mensile**:

```
GAP = Spese previste + Rate PDR - Incassi certi
```

Se il gap è positivo, devi vendere di più!

💡 **Tip:** Il "Target fatturato" nella dashboard ti dice quanto devi vendere in LORDO per coprire il gap (tenendo conto che solo il 48% resta in cassa).

---

## 7. Piano Annuale (Impostazioni)

Il **Piano Annuale** è dove configuri le spese e gli incassi ricorrenti.

### Come accedere

📍 **Menu laterale → Impostazioni** (o **Piano Annuale**)

### Le 4 sezioni

#### 1. Centri di Costo

Categorie per raggruppare le spese:
- **Telefonia:** Wind, MyCentralino
- **Software:** Asana, servizi online
- **Server:** hosting, domini
- **Collaboratori:** compensi esterni
- **Ufficio:** affitto, utenze

**Per aggiungere:**
1. Clicca **+ Nuovo Centro**
2. Inserisci nome e colore
3. Salva

#### 2. Spese Previste

Le spese che sai già di dover sostenere:
- Abbonamenti mensili
- Affitti
- Rate fisse

**Per aggiungere:**
1. Clicca **+ Nuova Spesa**
2. Compila:
   - Nome (es. "Wind Telefonica")
   - Centro di costo
   - Importo
   - Frequenza (mensile, trimestrale, annuale, ecc.)
   - Giorno del mese in cui paghi
   - Data inizio/fine contratto
   - Priorità
3. Salva

#### 3. Centri di Ricavo

Categorie per raggruppare gli incassi:
- **Siti Web:** sviluppo siti
- **Marketing:** campagne, ads
- **Domini:** rinnovi domini
- **Licenze:** software venduti

#### 4. Incassi Previsti

Gli incassi ricorrenti che ti aspetti:
- Canoni mensili clienti
- Rinnovi annuali

**Per aggiungere:**
1. Clicca **+ Nuovo Incasso**
2. Compila:
   - Nome cliente
   - Centro di ricavo
   - Importo
   - Frequenza
   - Giorno del mese
   - Affidabilità (alta/media/bassa)
3. Salva

### Terminare un contratto

Se un cliente o un fornitore smette di pagarti/pagarti:

1. Trova la voce nella lista
2. Clicca **Termina**
3. Inserisci la data di fine
4. Conferma

La voce non verrà più considerata nelle proiezioni future.

---

## 8. Profilo e Sicurezza

### Come accedere

📍 **Menu laterale → Profilo**

### Modificare il nome

1. Clicca sul campo **Nome**
2. Modifica
3. Clicca **Salva**

### Cambiare password

1. Clicca **Cambia Password**
2. Inserisci la password attuale
3. Inserisci la nuova password (minimo 6 caratteri)
4. Conferma la nuova password
5. Clicca **Salva**

### Attivare la verifica in due passaggi (2FA)

La 2FA aggiunge sicurezza: anche se qualcuno scopre la tua password, non può accedere senza il codice.

**Per attivare:**
1. Vai su **Profilo**
2. Clicca **Attiva 2FA**
3. Scegli il metodo:
   - **Email OTP:** ricevi codice via email ad ogni login
   - **App TOTP:** usa Google Authenticator o simile
4. Segui le istruzioni
5. Salva i **codici di backup** in un posto sicuro!

⚠️ **Importante:** I codici di backup servono se perdi accesso all'email o all'app. Conservali offline!

### Disattivare la 2FA

1. Vai su **Profilo**
2. Clicca **Disattiva 2FA**
3. Inserisci la password per confermare

### Logout

1. Clicca **Esci** nel menu laterale (in basso)

---

## 9. Domande Frequenti

### Quanto ho disponibile in cassa?

📍 **Dashboard → Saldo disponibile**

Questo numero tiene conto di:
- Saldo attuale
- Meno le spese previste
- Meno le rate PDR
- Più gli incassi CERTI (solo affidabilità Alta)

### Quali scadenze ho questa settimana?

📍 **Dashboard → Scadenze prossimi 7 giorni**

Vedi l'elenco ordinato per data con:
- Icona colorata per priorità
- Importo
- Tipo (spesa, rata PDR, ecc.)

### Quanto devo fatturare questo mese?

📍 **Dashboard → Target fatturato**

Questo numero ti dice quanto devi vendere IN LORDO per:
- Coprire tutte le spese
- Pagare le rate PDR
- Mantenere un minimo di buffer

💡 **Ricorda:** Del fatturato lordo, solo il **48%** resta in cassa (dopo IVA e quote soci).

### Perché il "disponibile" è diverso dal totale incassato?

Perché ogni incasso viene diviso:
- **22%** → IVA (non è tua, va allo Stato)
- **30%** → Quote soci (va ai soci)
- **48%** → Disponibile (quello che puoi spendere)

### Come faccio a sapere se sono in difficoltà?

📍 **Dashboard → Stato azienda**

L'app mostra 3 stati:

| Stato | Colore | Significato |
|-------|--------|-------------|
| **DIFESA** | 🔴 Rosso | Meno di 30 giorni prima di non poter pagare |
| **STABILIZZAZIONE** | 🟡 Giallo | Paghi tutto ma senza margine |
| **RICOSTRUZIONE** | 🟢 Verde | Hai buffer, puoi investire |

### Posso usare l'app da telefono?

Sì! L'app è responsive:
- Su **desktop:** menu laterale sempre visibile
- Su **mobile:** menu in basso (bottom navigation)

---

## 10. Glossario

| Termine | Significato |
|---------|-------------|
| **Consuntivo** | Movimenti reali, già avvenuti |
| **Previsionale** | Movimenti futuri, previsti |
| **PDR** | Piano Di Rientro (debito a rate) |
| **Split / Ripartizione** | Divisione dell'incasso tra IVA, soci e cassa |
| **Centro di Costo** | Categoria di spesa (es. Software, Telefonia) |
| **Centro di Ricavo** | Categoria di incasso (es. Siti Web, Marketing) |
| **Affidabilità** | Probabilità che un incasso previsto arrivi davvero |
| **Priorità** | Importanza di una spesa (essenziale → normale) |
| **Gap** | Differenza tra uscite e entrate previste |
| **Target fatturato** | Quanto devi vendere per coprire il gap |
| **Buffer** | Margine di sicurezza in cassa |
| **2FA** | Verifica in due passaggi (Two-Factor Authentication) |
| **OTP** | One-Time Password (codice usa e getta) |
| **TOTP** | Time-based OTP (codice da app tipo Google Authenticator) |

---

## Serve aiuto?

Se qualcosa non è chiaro o trovi un problema:
1. Controlla questa guida
2. Prova a ricaricare la pagina
3. Contatta lo sviluppatore

---

*Guida creata il 3 Febbraio 2026*
