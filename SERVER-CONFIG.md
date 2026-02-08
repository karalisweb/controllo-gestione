# Configurazione Server VPS Contabo

## Accesso Server
- **IP**: 185.192.97.108
- **Host**: vmi2996361.contaboserver.net
- **User**: root
- **Password**: SnEAw5k32Y8

---

## Applicazioni Deployate

### 1. Content HUB
| Parametro | Valore |
|-----------|--------|
| **URL Pubblico** | https://hub.karalisdemo.it |
| **Porta Interna** | 3000 |
| **Directory** | `/root/content-hub` |
| **PM2 Name** | content-hub |
| **Database** | SQLite (`server/db/content-hub.db`) |
| **Nginx Config** | `/etc/nginx/sites-available/hub.karalisdemo.it` |

### 2. GADS Audit 2
| Parametro | Valore |
|-----------|--------|
| **URL Pubblico** | https://gads.karalisdemo.it |
| **Porta Backend** | 3001 |
| **Directory Backend** | `/root/gads-audit-2/backend` |
| **Directory Frontend** | `/var/www/gads-audit` (build statico) |
| **PM2 Name** | gads-audit |
| **Database** | PostgreSQL (`gadsaudit`) |
| **Nginx Config** | `/etc/nginx/sites-available/gads.karalisdemo.it` |

### 3. Karalisweb Finance
| Parametro | Valore |
|-----------|--------|
| **URL Pubblico** | https://finance.karalisdemo.it |
| **Porta Interna** | 3002 |
| **Directory** | `/root/karalisweb-finance` |
| **PM2 Name** | karalisweb-finance |
| **Database** | SQLite (`data/finance.db`) |
| **Nginx Config** | `/etc/nginx/sites-available/finance.karalisdemo.it` |
| **GitHub** | https://github.com/karalisweb/controllo-gestione |

---

## Porte Utilizzate

| Porta | Servizio | Note |
|-------|----------|------|
| 80 | Nginx | Redirect HTTPS |
| 443 | Nginx | HTTPS |
| 3000 | Content HUB | Backend Node.js |
| 3001 | GADS Audit 2 | Backend NestJS |
| 3002 | Karalisweb Finance | Backend Next.js |
| 3003 | (libera) | Riservata per CRM |

---

## Configurazione Porte (Locale = Server)

| Porta | App | Locale | Server |
|-------|-----|--------|--------|
| 3000 | Content HUB | `npm run dev` | ✅ Online |
| 3001 | GADS Audit 2 Backend | `npm run start:dev` | ✅ Online |
| 5173 | GADS Audit 2 Frontend | `npm run dev` | (build statico) |
| 3002 | Karalisweb Finance | `npm run dev` | ✅ Online |
| 3003 | CRM | `npm run dev` | (non deployato) |

**Script avvio rapido**: `./start-all.sh`

---

## Comandi Utili

### PM2
```bash
# Stato processi
pm2 list

# Log in tempo reale
pm2 logs content-hub
pm2 logs gads-audit

# Riavvio
pm2 restart content-hub
pm2 restart gads-audit

# Riavvio con nuove env
pm2 restart gads-audit --update-env

# Salva configurazione
pm2 save
```

### Nginx
```bash
# Test configurazione
nginx -t

# Ricarica configurazione
systemctl reload nginx

# Vedi config
cat /etc/nginx/sites-available/hub.karalisdemo.it
cat /etc/nginx/sites-available/gads.karalisdemo.it
```

### Deploy
```bash
# Content HUB
cd /root/content-hub && git pull && npm run init-db && pm2 restart content-hub

# GADS Audit 2 Backend
cd /root/gads-audit-2/backend && git pull && npm install && npm run build && pm2 restart gads-audit

# GADS Audit 2 Frontend (rebuild statico)
cd /root/gads-audit-2/frontend && git pull && npm install && npm run build
cp -r dist/* /var/www/gads-audit/

# Karalisweb Finance
cd /root/karalisweb-finance && git pull && npm install && npm run build && pm2 restart karalisweb-finance
```

### Deploy da Locale (Karalisweb Finance)
```bash
# Dalla cartella del progetto, esegui:
./deploy.sh "Descrizione delle modifiche"
```

---

## Certificati SSL
Gestiti da **Let's Encrypt** (Certbot)
- Rinnovo automatico
- Config in `/etc/letsencrypt/`

---

## Database

### Content HUB (SQLite)
- Path: `/root/content-hub/server/db/content-hub.db`
- Backup: `cp content-hub.db content-hub.db.backup`

### GADS Audit 2 (PostgreSQL)
- Host: localhost
- Port: 5432
- User: gadsaudit
- Password: GadsAudit2024
- Database: gadsaudit

```bash
# Accesso
psql -U gadsaudit -d gadsaudit

# Backup
pg_dump -U gadsaudit gadsaudit > backup.sql
```

---

## Note Importanti

1. **Porta 3001 riservata**: Docker la usa, non assegnare ad altre app
2. **Frontend GADS**: È un build statico in `/var/www/gads-audit`, non un processo PM2
3. **Aggiornare PM2**: Dopo modifiche a `.env` usare `pm2 restart --update-env`
4. **SSL**: Certificati si rinnovano automaticamente, non toccare

---

*Ultimo aggiornamento: 17 Gennaio 2026*
