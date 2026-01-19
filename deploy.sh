#!/bin/bash

# ============================================
# Deploy Script - Karalisweb Finance
# ============================================
# Esegue commit, push su GitHub e pull sul server
# Uso: ./deploy.sh "messaggio commit"
# ============================================

set -e  # Esci in caso di errore

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurazione Server
SERVER_HOST="vmi2996361.contaboserver.net"
SERVER_USER="root"
SERVER_PASS="SnEAw5k32Y8"
SERVER_DIR="/root/karalisweb-finance"
PM2_NAME="karalisweb-finance"

# Messaggio commit (parametro opzionale)
COMMIT_MSG="${1:-Auto deploy $(date '+%Y-%m-%d %H:%M')}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   DEPLOY KARALISWEB FINANCE${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# 1. Verifica modifiche locali
echo -e "${YELLOW}[1/5] Verifico modifiche locali...${NC}"
if [[ -z $(git status --porcelain) ]]; then
    echo -e "${GREEN}Nessuna modifica da committare${NC}"
    SKIP_COMMIT=true
else
    git status --short
    SKIP_COMMIT=false
fi
echo ""

# 2. Commit e Push
if [ "$SKIP_COMMIT" = false ]; then
    echo -e "${YELLOW}[2/5] Commit delle modifiche...${NC}"
    git add .
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}Commit completato: $COMMIT_MSG${NC}"
    echo ""
fi

echo -e "${YELLOW}[3/5] Push su GitHub...${NC}"
git push origin main
echo -e "${GREEN}Push completato${NC}"
echo ""

# 3. Deploy sul server
echo -e "${YELLOW}[4/5] Deploy sul server...${NC}"
echo -e "Connessione a ${SERVER_HOST}..."

# Verifica se sshpass è installato
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}sshpass non trovato. Installalo con: brew install hudochenkov/sshpass/sshpass${NC}"
    echo -e "${YELLOW}In alternativa, esegui manualmente:${NC}"
    echo -e "ssh ${SERVER_USER}@${SERVER_HOST}"
    echo -e "cd ${SERVER_DIR} && git pull && npm install && npm run build && pm2 restart ${PM2_NAME}"
    exit 1
fi

sshpass -p "${SERVER_PASS}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
set -e

echo "Navigazione in /root/karalisweb-finance..."
cd /root/karalisweb-finance

echo "Pull da GitHub..."
git pull origin main

echo "Installazione dipendenze..."
npm install

echo "Build applicazione..."
npm run build

echo "Riavvio PM2..."
pm2 restart karalisweb-finance --update-env || pm2 start npm --name "karalisweb-finance" -- start

echo "Stato PM2:"
pm2 list

ENDSSH

echo ""
echo -e "${YELLOW}[5/5] Verifica deploy...${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   DEPLOY COMPLETATO!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "App disponibile su: ${BLUE}https://finance.karalisdemo.it${NC}"
echo ""
