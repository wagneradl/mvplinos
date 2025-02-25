#!/bin/bash
# Script para fazer backup do Sistema Lino's Panificadora
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
BACKEND_DIR="${ROOT_DIR}/packages/backend"
BACKUP_DIR="${ROOT_DIR}/backups"

# Criar diretório de backup se não existir
mkdir -p "${BACKUP_DIR}"

# Nome do arquivo de backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.db"
DB_FILE="${BACKEND_DIR}/prisma/dev.db"

# Banner
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}      Backup do Sistema Lino's Panificadora      ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "${YELLOW}Data: $(date)${NC}\n"

# Verificar se o banco de dados existe
if [ ! -f "${DB_FILE}" ]; then
    echo -e "${RED}Banco de dados não encontrado: ${DB_FILE}${NC}"
    echo -e "${YELLOW}Verifique se o caminho está correto e se o banco foi inicializado.${NC}"
    exit 1
fi

# Fazer backup do banco de dados
echo -e "${BLUE}Criando backup do banco de dados...${NC}"

# Verificar se o sistema está rodando
SYSTEM_RUNNING=false
if lsof -i :3001 -t > /dev/null 2>&1 || lsof -i :3000 -t > /dev/null 2>&1; then
    SYSTEM_RUNNING=true
    echo -e "${YELLOW}Sistema detectado em execução.${NC}"
    
    read -p "Deseja parar o sistema antes do backup? (Recomendado) [S/n]: " STOP_SYSTEM
    if [[ $STOP_SYSTEM == "" || $STOP_SYSTEM == "S" || $STOP_SYSTEM == "s" ]]; then
        echo -e "${YELLOW}Parando o sistema...${NC}"
        "${ROOT_DIR}/scripts/wsl/stop-system.sh"
        SYSTEM_STOPPED=true
    else
        echo -e "${YELLOW}Realizando backup com o sistema em execução (hot backup).${NC}"
        echo -e "${YELLOW}Nota: Este método pode resultar em inconsistências se o banco estiver sendo modificado.${NC}"
    fi
fi

# Realizar o backup
if [ -f "${DB_FILE}" ]; then
    echo -e "${BLUE}Copiando banco de dados...${NC}"
    cp "${DB_FILE}" "${BACKUP_FILE}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup criado com sucesso: ${BACKUP_FILE}${NC}"
        
        # Verificar tamanho do backup
        BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | awk '{print $1}')
        echo -e "${BLUE}Tamanho do backup: ${YELLOW}${BACKUP_SIZE}${NC}"
        
        # Verificar integridade do backup
        if command -v sqlite3 > /dev/null; then
            echo -e "${BLUE}Verificando integridade do backup...${NC}"
            INTEGRITY=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;")
            
            if [ "$INTEGRITY" == "ok" ]; then
                echo -e "${GREEN}✓ Integridade do backup verificada${NC}"
            else
                echo -e "${RED}✗ Problemas de integridade no backup!${NC}"
                echo -e "${YELLOW}Detalhes: ${INTEGRITY}${NC}"
            fi
        else
            echo -e "${YELLOW}sqlite3 não disponível para verificar integridade${NC}"
        fi
        
        # Listar backups existentes
        BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "backup_*.db" | wc -l)
        echo -e "${BLUE}Total de backups: ${YELLOW}${BACKUP_COUNT}${NC}"
        
        # Mostrar últimos 5 backups
        echo -e "${BLUE}Últimos backups:${NC}"
        ls -lh "${BACKUP_DIR}" | grep "backup_" | sort -r | head -n 5
    else
        echo -e "${RED}✗ Falha ao criar backup!${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Banco de dados não encontrado após verificação: ${DB_FILE}${NC}"
    exit 1
fi

# Reiniciar o sistema se foi parado
if [ "$SYSTEM_STOPPED" == "true" ]; then
    read -p "Deseja reiniciar o sistema? [S/n]: " RESTART_SYSTEM
    if [[ $RESTART_SYSTEM == "" || $RESTART_SYSTEM == "S" || $RESTART_SYSTEM == "s" ]]; then
        echo -e "${YELLOW}Reiniciando o sistema...${NC}"
        "${ROOT_DIR}/scripts/wsl/start-system.sh"
    else
        echo -e "${YELLOW}Sistema permanecerá parado.${NC}"
    fi
fi

# Mensagem final
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}      Backup concluído com sucesso!      ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Para restaurar este backup, execute:${NC}"
echo -e "${GREEN}./scripts/wsl/restore-system.sh ${BACKUP_FILE}${NC}"
