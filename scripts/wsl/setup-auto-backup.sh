#!/bin/bash
# Script para configurar backup automático do Sistema Lino's Panificadora
# Versão: 1.0
# Data: 25/02/2025

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Diretórios
ROOT_DIR=$(pwd)
BACKUP_DIR="${ROOT_DIR}/backups"
SCRIPTS_DIR="${ROOT_DIR}/scripts/wsl"

# Banner
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}   Configuração de Backup Automático - Lino's Panificadora   ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "${YELLOW}Data: $(date)${NC}\n"

# Criar diretório de backup se não existir
mkdir -p "${BACKUP_DIR}"

# Caminho para o script de backup automático
AUTO_BACKUP_SCRIPT="${SCRIPTS_DIR}/run-auto-backup.sh"

# Criar script de backup automático
echo -e "${BLUE}Criando script de backup automático...${NC}"

cat > "${AUTO_BACKUP_SCRIPT}" << 'EOL'
#!/bin/bash
# Script para executar backup automático do Sistema Lino's Panificadora
# Este script é executado automaticamente pelo cron

# Diretórios
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
ROOT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
BACKUP_DIR="${ROOT_DIR}/backups"
LOGS_DIR="${ROOT_DIR}/logs"
DB_FILE="${ROOT_DIR}/packages/backend/prisma/dev.db"

# Configurar log
mkdir -p "${LOGS_DIR}"
LOG_FILE="${LOGS_DIR}/auto_backup_$(date +%Y%m%d).log"

# Nome do arquivo de backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/auto_backup_${TIMESTAMP}.db"

# Função para registrar log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "${LOG_FILE}"
    echo "$1"
}

# Iniciar log
log "Iniciando backup automático"

# Verificar se o diretório de backup existe
if [ ! -d "${BACKUP_DIR}" ]; then
    mkdir -p "${BACKUP_DIR}"
    log "Criado diretório de backup: ${BACKUP_DIR}"
fi

# Verificar se o banco de dados existe
if [ ! -f "${DB_FILE}" ]; then
    log "ERRO: Banco de dados não encontrado: ${DB_FILE}"
    exit 1
fi

# Criar backup
log "Criando backup: ${BACKUP_FILE}"
cp "${DB_FILE}" "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | awk '{print $1}')
    log "Backup criado com sucesso (${BACKUP_SIZE})"
    
    # Verificar integridade se sqlite3 disponível
    if command -v sqlite3 > /dev/null; then
        INTEGRITY=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" 2>/dev/null)
        if [ "$INTEGRITY" == "ok" ]; then
            log "Integridade do backup verificada: OK"
        else
            log "AVISO: Problemas de integridade no backup: ${INTEGRITY}"
        fi
    fi
    
    # Limpar backups antigos (manter apenas os 10 mais recentes)
    OLD_BACKUPS=$(find "${BACKUP_DIR}" -name "auto_backup_*.db" | sort | head -n -10)
    if [ ! -z "$OLD_BACKUPS" ]; then
        DELETED_COUNT=0
        while read -r old_backup; do
            rm "$old_backup"
            ((DELETED_COUNT++))
        done <<< "$OLD_BACKUPS"
        
        if [ $DELETED_COUNT -gt 0 ]; then
            log "Removidos ${DELETED_COUNT} backups antigos"
        fi
    fi
    
    log "Backup automático concluído com sucesso"
    exit 0
else
    log "ERRO: Falha ao criar backup"
    exit 1
fi
EOL

# Tornar o script executável
chmod +x "${AUTO_BACKUP_SCRIPT}"
echo -e "${GREEN}✓ Script de backup automático criado: ${AUTO_BACKUP_SCRIPT}${NC}"

# Verificar se o cron está disponível
if ! command -v crontab > /dev/null; then
    echo -e "${RED}Erro: crontab não encontrado no sistema${NC}"
    echo -e "${YELLOW}Por favor, instale o cron usando o comando:${NC}"
    echo -e "${GREEN}sudo apt-get update && sudo apt-get install -y cron${NC}"
    exit 1
fi

# Perguntar ao usuário sobre a frequência do backup
echo -e "\n${BLUE}Configuração da frequência de backup${NC}"
echo -e "${YELLOW}Escolha a frequência do backup automático:${NC}"
echo -e "  ${GREEN}1)${NC} Diário (1x por dia)"
echo -e "  ${GREEN}2)${NC} A cada 12 horas (2x por dia)"
echo -e "  ${GREEN}3)${NC} A cada 6 horas (4x por dia)"
echo -e "  ${GREEN}4)${NC} Personalizado"

read -p "Escolha uma opção (1-4): " FREQUENCY_CHOICE

# Configurar expressão cron baseada na escolha
case $FREQUENCY_CHOICE in
    1)
        # Diário (às 02:00)
        CRON_EXPRESSION="0 2 * * *"
        FREQUENCY_DESC="diariamente às 02:00"
        ;;
    2)
        # A cada 12 horas (00:00 e 12:00)
        CRON_EXPRESSION="0 0,12 * * *"
        FREQUENCY_DESC="duas vezes por dia (00:00 e 12:00)"
        ;;
    3)
        # A cada 6 horas (00:00, 06:00, 12:00, 18:00)
        CRON_EXPRESSION="0 0,6,12,18 * * *"
        FREQUENCY_DESC="quatro vezes por dia (00:00, 06:00, 12:00, 18:00)"
        ;;
    4)
        # Personalizado
        echo -e "\n${YELLOW}Digite a expressão cron personalizada:${NC}"
        echo -e "${BLUE}Formato:${NC} minuto hora dia mês dia_semana"
        echo -e "${BLUE}Exemplo:${NC} 30 3 * * * (diariamente às 03:30)"
        read -p "Expressão cron: " CRON_EXPRESSION
        FREQUENCY_DESC="conforme configuração personalizada ($CRON_EXPRESSION)"
        ;;
    *)
        echo -e "${RED}Opção inválida. Usando configuração padrão.${NC}"
        CRON_EXPRESSION="0 2 * * *"
        FREQUENCY_DESC="diariamente às 02:00 (padrão)"
        ;;
esac

# Criar arquivo temporário com o trabalho cron atual
TEMP_CRON=$(mktemp)
crontab -l > "$TEMP_CRON" 2>/dev/null

# Verificar se o backup já está configurado
if grep -q "${AUTO_BACKUP_SCRIPT}" "$TEMP_CRON"; then
    # Atualizar configuração existente
    sed -i "/$(basename "${AUTO_BACKUP_SCRIPT}")/d" "$TEMP_CRON"
    echo -e "${YELLOW}Removida configuração anterior do cron${NC}"
fi

# Adicionar novo trabalho cron
echo "$CRON_EXPRESSION $AUTO_BACKUP_SCRIPT # Backup automático do Sistema Lino's Panificadora" >> "$TEMP_CRON"

# Instalar novo crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

# Verificar se o crontab foi instalado com sucesso
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup automático configurado com sucesso!${NC}"
    echo -e "${BLUE}Frequência: ${YELLOW}${FREQUENCY_DESC}${NC}"
    
    # Mostrar configuração atual
    echo -e "\n${BLUE}Configuração atual do cron:${NC}"
    crontab -l | grep -v "^#" | grep -v "^$"
else
    echo -e "${RED}✗ Falha ao configurar o backup automático!${NC}"
    exit 1
fi

# Mensagem final
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Configuração de backup automático concluída!  ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Para testar o backup automático, execute:${NC}"
echo -e "${GREEN}${AUTO_BACKUP_SCRIPT}${NC}"
echo -e "\n${BLUE}Os backups automáticos serão armazenados em:${NC}"
echo -e "${GREEN}${BACKUP_DIR}${NC}"
echo -e "\n${BLUE}Logs de backup serão gravados em:${NC}"
echo -e "${GREEN}${ROOT_DIR}/logs/auto_backup_*.log${NC}"
echo -e "\n${YELLOW}Nota: Apenas os 10 backups automáticos mais recentes serão mantidos.${NC}"
