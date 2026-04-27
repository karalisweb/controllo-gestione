#!/bin/bash

# ╔══════════════════════════════════════════════════════════════╗
# ║          KW CASHFLOW - Deploy Script Completo                ║
# ╠══════════════════════════════════════════════════════════════╣
# ║ App:              KW Cashflow                                ║
# ║ Versione:         (da package.json)                          ║
# ║ Ultimo update:    2026-04-27                                 ║
# ║                                                              ║
# ║ Cartella locale:  ~/Desktop/Sviluppo App Claude Code/       ║
# ║                   CashFlow/kw-cashflow                       ║
# ║ Repo GitHub:      github.com/karalisweb/controllo-gestione  ║
# ║ Cartella server:  /root/karalisweb-finance                   ║
# ║                                                              ║
# ║ Porta locale:     3002                                       ║
# ║ Porta server:     3002 (proxy Nginx su porta 80/443)         ║
# ║                                                              ║
# ║ URL pubblico:     https://finance.karalisdemo.it             ║
# ║ VPS:              185.192.97.108                              ║
# ║ Process manager:  PM2 (nome: karalisweb-finance)             ║
# ║ Restart server:   pm2 restart karalisweb-finance             ║
# ║ Restart locale:   npm run dev                                ║
# ╚══════════════════════════════════════════════════════════════╝
#
# USO:
#   Deploy normale:
#     ./deploy.sh "messaggio commit"
#
#   Deploy con version bump:
#     ./deploy.sh --bump patch "messaggio commit"
#     ./deploy.sh --bump minor "messaggio commit"
#     ./deploy.sh --bump major "messaggio commit"
#
#   Flag opzionali:
#     --dry-run      Mostra cosa farebbe senza eseguire
#     --skip-tests   Salta i test
#     --no-tag       Non creare git tag (solo con --bump)
#     --help         Mostra questa guida

set -e  # Esci se un comando fallisce

# ═══════════════════════════════════════
# COLORI
# ═══════════════════════════════════════
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ═══════════════════════════════════════
# CONFIGURAZIONE
# ═══════════════════════════════════════
APP_NAME="KW Cashflow"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_VERSION=$(grep '"version"' "${SCRIPT_DIR}/package.json" | head -1 | sed 's/.*"version"[^"]*"\([^"]*\)".*/\1/')
VPS_HOST="root@185.192.97.108"
VPS_PATH="/root/karalisweb-finance"
BRANCH="main"
PM2_PROCESS="karalisweb-finance"
LOCAL_PORT=3002
SERVER_PORT=3002
PUBLIC_URL="https://finance.karalisdemo.it"
HEALTH_CHECK_URL="https://finance.karalisdemo.it"
NGINX_CONFIG="/etc/nginx/sites-available/finance.karalisdemo.it"
GITHUB_REPO="github.com/karalisweb/controllo-gestione"

# Timer
DEPLOY_START=$(date +%s)

# ═══════════════════════════════════════
# FUNZIONI DI OUTPUT
# ═══════════════════════════════════════
print_header() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${BOLD}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "\n${GREEN}==> ${BOLD}$1${NC}"
}

print_substep() {
    echo -e "    ${CYAN}→${NC} $1"
}

print_warning() {
    echo -e "    ${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "    ${RED}[X]${NC} $1"
}

print_success() {
    echo -e "    ${GREEN}[OK]${NC} $1"
}

print_dry() {
    echo -e "    ${MAGENTA}[DRY]${NC} $1"
}

# ═══════════════════════════════════════
# FUNZIONE: Mostra help
# ═══════════════════════════════════════
show_help() {
    echo ""
    echo -e "${BOLD}${APP_NAME} - Deploy Script${NC}"
    echo ""
    echo -e "${BOLD}Uso:${NC}"
    echo "  ./deploy.sh \"messaggio commit\"                   Deploy normale"
    echo "  ./deploy.sh --bump patch \"messaggio commit\"      Bump patch + deploy"
    echo "  ./deploy.sh --bump minor \"messaggio commit\"      Bump minor + deploy"
    echo "  ./deploy.sh --bump major \"messaggio commit\"      Bump major + deploy"
    echo ""
    echo -e "${BOLD}Flag opzionali:${NC}"
    echo "  --dry-run        Mostra cosa farebbe senza eseguire"
    echo "  --skip-tests     Salta i test"
    echo "  --no-tag         Non creare git tag (solo con --bump)"
    echo "  --help           Mostra questa guida"
    echo ""
    echo -e "${BOLD}Versione corrente:${NC} ${APP_VERSION}"
    echo ""
    echo -e "${BOLD}Cosa aggiorna con --bump:${NC}"
    echo "  1. package.json                    (version)"
    echo "  2. src/lib/version.ts              (APP_VERSION)"
    echo "  3. DEPLOY.md                       (versione attuale)"
    echo "  4. deploy.sh header                (data ultimo update)"
    echo "  5. CHANGELOG.md                    (nuova entry)"
    echo ""
    echo -e "${BOLD}Step deploy (10 step):${NC}"
    echo "   1. Verifica coerenza versione     6. Git add + commit"
    echo "   2. Verifica CHANGELOG             7. Git tag (se bump)"
    echo "   3. Build locale (Next.js)         8. Push GitHub"
    echo "   4. Test pre-deploy                9. Pull VPS + npm install + build"
    echo "   5. Git status                    10. PM2 restart + health check"
    echo ""
}

# ═══════════════════════════════════════
# VERSIONING
# ═══════════════════════════════════════
update_version_in_files() {
    local old_version="$1"
    local new_version="$2"

    # 1. package.json
    if [ -f "${SCRIPT_DIR}/package.json" ]; then
        sed -i '' "s/\"version\": \"${old_version}\"/\"version\": \"${new_version}\"/" "${SCRIPT_DIR}/package.json"
        print_success "package.json → v${new_version}"
    fi

    # 2. version.ts (costante UI)
    if [ -f "${SCRIPT_DIR}/src/lib/version.ts" ]; then
        sed -i '' "s/export const APP_VERSION = \"${old_version}\"/export const APP_VERSION = \"${new_version}\"/" "${SCRIPT_DIR}/src/lib/version.ts"
        print_success "version.ts → v${new_version}"
    fi

    # 3. DEPLOY.md
    if [ -f "${SCRIPT_DIR}/DEPLOY.md" ]; then
        sed -i '' "s/Versione attuale: \*\*${old_version}\*\*/Versione attuale: **${new_version}**/" "${SCRIPT_DIR}/DEPLOY.md"
        print_success "DEPLOY.md → v${new_version}"
    fi

    # 4. deploy.sh header (data ultimo update)
    sed -i '' "s/# ║ Ultimo update:    [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}/# ║ Ultimo update:    $(date '+%Y-%m-%d')/" "${SCRIPT_DIR}/deploy.sh"
    print_success "deploy.sh header → $(date '+%Y-%m-%d')"
}

update_changelog() {
    local version="$1"
    local message="$2"
    local today=$(date '+%Y-%m-%d')

    if [ ! -f "${SCRIPT_DIR}/CHANGELOG.md" ]; then
        print_warning "CHANGELOG.md non trovato, lo creo..."
        cat > "${SCRIPT_DIR}/CHANGELOG.md" << 'CLEOF'
# Changelog

Tutte le modifiche rilevanti al progetto KW Cashflow.

Formato basato su [Keep a Changelog](https://keepachangelog.com/it-IT/1.1.0/).
Versionamento: [Semantic Versioning](https://semver.org/lang/it/).

---
CLEOF
    fi

    # Verifica se la versione esiste gia'
    if grep -q "\[${version}\]" "${SCRIPT_DIR}/CHANGELOG.md" 2>/dev/null; then
        print_warning "CHANGELOG.md contiene gia' [$version], skip"
        return
    fi

    # Inserisci dopo la prima riga "---"
    local tmp=$(mktemp)
    local found=0
    while IFS= read -r line; do
        echo "$line" >> "$tmp"
        if [ "$found" -eq 0 ] && [ "$line" = "---" ]; then
            found=1
            echo "" >> "$tmp"
            echo "## [${version}] - ${today}" >> "$tmp"
            echo "" >> "$tmp"
            echo "### Modificato" >> "$tmp"
            echo "- ${message}" >> "$tmp"
            echo "" >> "$tmp"
            echo "---" >> "$tmp"
        fi
    done < "${SCRIPT_DIR}/CHANGELOG.md"
    mv "$tmp" "${SCRIPT_DIR}/CHANGELOG.md"

    print_success "CHANGELOG.md → v${version} aggiunto"
}

# ═══════════════════════════════════════
# PARSING ARGOMENTI
# ═══════════════════════════════════════
BUMP_TYPE=""
COMMIT_MSG=""
DRY_RUN=false
SKIP_TESTS=false
NO_TAG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --bump)
            BUMP_TYPE="$2"
            if [[ ! "$BUMP_TYPE" =~ ^(patch|minor|major)$ ]]; then
                print_error "Tipo bump non valido: $BUMP_TYPE (usa: patch, minor, major)"
                exit 1
            fi
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-tag)
            NO_TAG=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            if [ -z "$COMMIT_MSG" ]; then
                COMMIT_MSG="$1"
            fi
            shift
            ;;
    esac
done

# Verifica messaggio commit
if [ -z "$COMMIT_MSG" ]; then
    print_error "Devi specificare un messaggio di commit!"
    echo ""
    echo "Uso: ./deploy.sh \"messaggio commit\""
    echo "     ./deploy.sh --bump patch \"messaggio commit\""
    echo ""
    echo "Per la guida completa: ./deploy.sh --help"
    exit 1
fi

# ═══════════════════════════════════════
# CALCOLO NUOVA VERSIONE (se bump)
# ═══════════════════════════════════════
OLD_VERSION="$APP_VERSION"
NEW_VERSION="$APP_VERSION"

if [ -n "$BUMP_TYPE" ]; then
    IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$APP_VERSION"

    case $BUMP_TYPE in
        patch)
            V_PATCH=$((V_PATCH + 1))
            ;;
        minor)
            V_MINOR=$((V_MINOR + 1))
            V_PATCH=0
            ;;
        major)
            V_MAJOR=$((V_MAJOR + 1))
            V_MINOR=0
            V_PATCH=0
            ;;
    esac

    NEW_VERSION="${V_MAJOR}.${V_MINOR}.${V_PATCH}"
fi

# ═══════════════════════════════════════
# HEADER
# ═══════════════════════════════════════
if [ -n "$BUMP_TYPE" ]; then
    print_header "$APP_NAME - Version Bump + Deploy"
    echo -e "  ${BOLD}Versione:${NC} ${OLD_VERSION} → ${GREEN}${NEW_VERSION}${NC} (${BUMP_TYPE})"
else
    print_header "$APP_NAME v${APP_VERSION} - Deploy"
fi

echo -e "  ${BOLD}Commit:${NC}   ${COMMIT_MSG}"
echo -e "  ${BOLD}Branch:${NC}   ${BRANCH}"

if $DRY_RUN; then
    echo -e "  ${MAGENTA}${BOLD}MODALITA' DRY-RUN - nessuna modifica verra' applicata${NC}"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
#  FASE 1: VERSION BUMP (solo se --bump)
# ═══════════════════════════════════════════════════════════════
if [ -n "$BUMP_TYPE" ]; then

    print_step "Bump - Aggiorno versione ${OLD_VERSION} → ${NEW_VERSION}..."

    if $DRY_RUN; then
        print_dry "package.json: \"${OLD_VERSION}\" → \"${NEW_VERSION}\""
        print_dry "version.ts: \"${OLD_VERSION}\" → \"${NEW_VERSION}\""
        print_dry "DEPLOY.md: **${OLD_VERSION}** → **${NEW_VERSION}**"
        print_dry "CHANGELOG.md: nuova entry [${NEW_VERSION}]"
    else
        update_version_in_files "$OLD_VERSION" "$NEW_VERSION"
        update_changelog "$NEW_VERSION" "$COMMIT_MSG"
    fi

    # Aggiorna la variabile versione per i check successivi
    APP_VERSION="$NEW_VERSION"

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo -e "${GREEN}  Version bump ${OLD_VERSION} → ${NEW_VERSION} completato!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"
    echo ""
fi

# ═══════════════════════════════════════════════════════════════
#  FASE 2: VERIFICHE PRE-DEPLOY
# ═══════════════════════════════════════════════════════════════

TOTAL_STEPS=10

# --- Step 1: Coerenza versione ---
print_step "Deploy 1/${TOTAL_STEPS} - Verifico coerenza versione..."

if $DRY_RUN && [ -n "$BUMP_TYPE" ]; then
    print_dry "Skip verifica (dry-run con bump: file non ancora aggiornati)"
else
    VERSION_TS=$(grep 'APP_VERSION' "${SCRIPT_DIR}/src/lib/version.ts" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [ -n "$VERSION_TS" ] && [ "$VERSION_TS" != "$APP_VERSION" ]; then
        print_error "Versione non allineata! package.json=${APP_VERSION}, version.ts=${VERSION_TS}"
        print_error "Aggiorna entrambi i file prima del deploy (o usa --bump)."
        exit 1
    fi
    print_success "Versione ${APP_VERSION} coerente (package.json = version.ts)"
fi

# --- Step 2: Verifica CHANGELOG ---
print_step "Deploy 2/${TOTAL_STEPS} - Verifico CHANGELOG..."
if $DRY_RUN && [ -n "$BUMP_TYPE" ]; then
    print_dry "Skip verifica (dry-run con bump: CHANGELOG non ancora aggiornato)"
elif [ -f "${SCRIPT_DIR}/CHANGELOG.md" ]; then
    if ! grep -q "\[${APP_VERSION}\]" "${SCRIPT_DIR}/CHANGELOG.md"; then
        print_error "CHANGELOG.md non contiene la versione [${APP_VERSION}]!"
        print_error "Aggiorna il CHANGELOG prima del deploy (o usa --bump)."
        exit 1
    fi
    print_success "CHANGELOG contiene [${APP_VERSION}]"
else
    print_warning "CHANGELOG.md non trovato, skip"
fi

# --- Step 3: Build locale ---
print_step "Deploy 3/${TOTAL_STEPS} - Build locale (Next.js + TypeScript)..."
if $DRY_RUN; then
    print_dry "npm run build"
else
    cd "${SCRIPT_DIR}"
    npm run build
    print_success "Build locale OK"
fi

# --- Step 4: Test pre-deploy ---
print_step "Deploy 4/${TOTAL_STEPS} - Test pre-deploy..."
if $SKIP_TESTS; then
    print_warning "Test skippati (--skip-tests)"
elif [ -f "${SCRIPT_DIR}/node_modules/.bin/jest" ] || [ -f "${SCRIPT_DIR}/node_modules/.bin/vitest" ]; then
    if $DRY_RUN; then
        print_dry "npm test"
    else
        if npm test --passWithNoTests 2>/dev/null; then
            print_success "Test superati"
        else
            print_warning "Test falliti!"
            read -p "  Continuare comunque? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                exit 1
            fi
        fi
    fi
else
    print_warning "Nessun test runner installato, skip test"
fi

# ═══════════════════════════════════════════════════════════════
#  FASE 3: GIT + DEPLOY
# ═══════════════════════════════════════════════════════════════

# Salva hash corrente per info rollback
PREV_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "n/a")

# --- Step 5: Git status ---
print_step "Deploy 5/${TOTAL_STEPS} - Verifico stato Git locale..."
cd "${SCRIPT_DIR}"
if [ -n "$(git status --porcelain | grep -v '\.db')" ]; then
    git status --short | grep -v '\.db'
else
    print_warning "Nessuna modifica da committare (esclusi file .db)"
    read -p "  Vuoi continuare comunque con il deploy? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# --- Step 6: Add e Commit ---
print_step "Deploy 6/${TOTAL_STEPS} - Git add + commit..."
if $DRY_RUN; then
    print_dry "git add ."
    print_dry "git commit -m \"${COMMIT_MSG}\""
else
    git add .
    git commit -m "$COMMIT_MSG" || print_warning "Niente da committare"
    NEW_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "n/a")
    print_success "Commit: ${NEW_HASH}"
fi

# --- Step 7: Git tag (solo se bump) ---
print_step "Deploy 7/${TOTAL_STEPS} - Git tag..."
if [ -n "$BUMP_TYPE" ] && ! $NO_TAG; then
    TAG_NAME="v${APP_VERSION}"
    if $DRY_RUN; then
        print_dry "git tag -a ${TAG_NAME} -m \"Release ${APP_VERSION}\""
    else
        if git tag -l | grep -q "^${TAG_NAME}$"; then
            print_warning "Tag ${TAG_NAME} esiste gia', skip"
        else
            git tag -a "${TAG_NAME}" -m "Release ${APP_VERSION}"
            print_success "Tag ${TAG_NAME} creato"
        fi
    fi
elif $NO_TAG; then
    print_warning "Tag skippato (--no-tag)"
else
    print_substep "Nessun bump, skip tag"
fi

# --- Step 8: Push a GitHub ---
print_step "Deploy 8/${TOTAL_STEPS} - Push a GitHub (${BRANCH})..."
if $DRY_RUN; then
    print_dry "git push origin ${BRANCH}"
    if [ -n "$BUMP_TYPE" ] && ! $NO_TAG; then
        print_dry "git push origin --tags"
    fi
else
    git push origin $BRANCH
    if [ -n "$BUMP_TYPE" ] && ! $NO_TAG; then
        git push origin --tags
    fi
    print_success "Push completato"
fi

# --- Step 9: Pull sul VPS + npm install + Build ---
print_step "Deploy 9/${TOTAL_STEPS} - Pull sul VPS + build..."
if $DRY_RUN; then
    print_dry "ssh ${VPS_HOST} \"cd ${VPS_PATH} && git pull origin ${BRANCH}\""
    print_dry "npm install (se package.json cambiato)"
    print_dry "npm run build (sul server)"
else
    ssh $VPS_HOST "cd $VPS_PATH && git pull origin $BRANCH"
    print_success "Pull completato"

    # npm install solo se package.json e' cambiato
    PACKAGE_CHANGED=$(ssh $VPS_HOST "cd $VPS_PATH && git diff HEAD~1 --name-only 2>/dev/null | grep package.json" 2>/dev/null || echo "")
    if [ -n "$PACKAGE_CHANGED" ]; then
        print_substep "package.json modificato, npm install in corso..."
        ssh $VPS_HOST "cd $VPS_PATH && npm install"
        print_success "npm install completato"
    else
        print_success "npm install non necessario (package.json invariato)"
    fi

    print_substep "Build Next.js sul server..."
    ssh $VPS_HOST "cd $VPS_PATH && npm run build"
    print_success "Build server completata"
fi

# --- Step 10: Restart PM2 + Health check ---
print_step "Deploy 10/${TOTAL_STEPS} - Restart ${PM2_PROCESS} + health check..."
if $DRY_RUN; then
    print_dry "ssh ${VPS_HOST} \"pm2 restart ${PM2_PROCESS}\""
    print_dry "curl ${HEALTH_CHECK_URL}"
else
    ssh $VPS_HOST "cd $VPS_PATH && pm2 restart $PM2_PROCESS --update-env || pm2 start npm --name '$PM2_PROCESS' -- start"
    print_success "PM2 restart completato"

    # Health check
    print_substep "Attendo 3 secondi per l'avvio..."
    sleep 3
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_CHECK_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        print_success "Server risponde: HTTP ${HTTP_CODE}"
    elif [ "$HTTP_CODE" = "000" ]; then
        print_warning "Health check timeout - verificare manualmente: ${PUBLIC_URL}"
    else
        print_warning "Server risponde: HTTP ${HTTP_CODE} - verificare manualmente"
    fi
fi

# ═══════════════════════════════════════
# RIEPILOGO FINALE
# ═══════════════════════════════════════
DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                          ║${NC}"
if $DRY_RUN; then
echo -e "${GREEN}║${NC}   ${MAGENTA}${BOLD}DRY-RUN completato (nessuna modifica)${NC}  ${GREEN}║${NC}"
else
echo -e "${GREEN}║${NC}   ${BOLD}Deploy completato con successo!${NC}        ${GREEN}║${NC}"
fi
echo -e "${GREEN}║                                          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}App:${NC}        ${APP_NAME}"
if [ -n "$BUMP_TYPE" ]; then
echo -e "  ${BOLD}Versione:${NC}   ${OLD_VERSION} → ${GREEN}${NEW_VERSION}${NC} (${BUMP_TYPE})"
else
echo -e "  ${BOLD}Versione:${NC}   ${APP_VERSION}"
fi
echo -e "  ${BOLD}Commit:${NC}     ${COMMIT_MSG}"
echo -e "  ${BOLD}Branch:${NC}     ${BRANCH}"
if [ -n "$BUMP_TYPE" ] && ! $NO_TAG; then
echo -e "  ${BOLD}Tag:${NC}        v${APP_VERSION}"
fi
echo -e "  ${BOLD}Server:${NC}     ${VPS_HOST} (porta ${SERVER_PORT})"
echo -e "  ${BOLD}PM2:${NC}        ${PM2_PROCESS}"
echo -e "  ${BOLD}URL:${NC}        ${PUBLIC_URL}"
echo -e "  ${BOLD}Data:${NC}       $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  ${BOLD}Durata:${NC}     ${DEPLOY_DURATION} secondi"
echo ""
if ! $DRY_RUN; then
echo -e "  ${YELLOW}Rollback:${NC}   git revert ${PREV_HASH}..HEAD"
fi
echo ""

if [ -n "$BUMP_TYPE" ]; then
    echo -e "  ${BOLD}File aggiornati dal version bump:${NC}"
    echo -e "    ${CYAN}1.${NC} package.json"
    echo -e "    ${CYAN}2.${NC} src/lib/version.ts"
    echo -e "    ${CYAN}3.${NC} DEPLOY.md"
    echo -e "    ${CYAN}4.${NC} deploy.sh (header data)"
    echo -e "    ${CYAN}5.${NC} CHANGELOG.md"
    echo ""
fi
