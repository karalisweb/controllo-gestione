#!/bin/bash

# ============================================
# Setup Iniziale Server - Karalisweb Finance
# ============================================
# Eseguire UNA SOLA VOLTA sul server per il primo deploy
# Uso: ssh root@185.192.97.108 'bash -s' < server-setup.sh
# ============================================

set -e

echo "============================================"
echo "   SETUP KARALISWEB FINANCE - SERVER"
echo "============================================"
echo ""

# 1. Clone repository
echo "[1/5] Clone repository..."
cd /root
if [ -d "karalisweb-finance" ]; then
    echo "Directory già esistente, skip clone"
else
    git clone https://github.com/karalisweb/controllo-gestione.git karalisweb-finance
fi
cd karalisweb-finance

# 2. Installa dipendenze e build
echo "[2/5] Installazione dipendenze..."
npm install

echo "[3/5] Build applicazione..."
npm run build

# 3. Crea file .env se non esiste
echo "[4/5] Configurazione environment..."
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=3002
EOF
    echo "File .env creato"
else
    echo "File .env già esistente"
fi

# 4. Configura Nginx
echo "[5/5] Configurazione Nginx..."
cat > /etc/nginx/sites-available/finance.karalisdemo.it << 'EOF'
server {
    listen 80;
    server_name finance.karalisdemo.it;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name finance.karalisdemo.it;

    ssl_certificate /etc/letsencrypt/live/finance.karalisdemo.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/finance.karalisdemo.it/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Abilita il sito
ln -sf /etc/nginx/sites-available/finance.karalisdemo.it /etc/nginx/sites-enabled/

# 5. Genera certificato SSL (se non esiste)
echo "Generazione certificato SSL..."
if [ ! -d "/etc/letsencrypt/live/finance.karalisdemo.it" ]; then
    certbot certonly --nginx -d finance.karalisdemo.it --non-interactive --agree-tos --email info@karalisweb.com
fi

# Test e reload Nginx
nginx -t && systemctl reload nginx

# 6. Avvia con PM2
echo "Avvio applicazione con PM2..."
cd /root/karalisweb-finance
pm2 start npm --name "karalisweb-finance" -- start
pm2 save

echo ""
echo "============================================"
echo "   SETUP COMPLETATO!"
echo "============================================"
echo ""
echo "App disponibile su: https://finance.karalisdemo.it"
echo ""
echo "Comandi utili:"
echo "  pm2 logs karalisweb-finance  - Vedi log"
echo "  pm2 restart karalisweb-finance - Riavvia"
echo ""
