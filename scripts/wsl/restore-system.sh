#!/bin/bash
# Script para restaurar backup do Sistema Lino's Panificadora
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
DB_FILE="${BACKEND_DIR}/prisma/dev.db"

# Banner
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}   Restauração de Backup - Lino's Panificadora   ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo -e "${YELLOW}Data: $(date)${NC}\n"

# Verificar argumentos
if [ $# -lt 1 ]; then
    echo -e "${YELLOW}Nenhum arquivo de backup especificado.${NC}"
    echo -e "${YELLOW}Listando backups disponíveis:${NC}"
    echo ""
    
    # Listar backups disponíveis
    if [ -d "${BACKUP_DIR}" ]; then
        BACKUPS=$(find "${BACKUP_DIR}" -name "backup_*.db" | sort -r)
        if [ -z "$BACKUPS" ]; then
            echo -e "${RED}Nenhum backup encontrado em ${BACKUP_DIR}${NC}"
            exit 1
        fi
        
        echo -e "${BLUE}Backups disponíveis:${NC}"
        echo ""
        
        # Mostrar opções de backup
        i=1
        declare -a BACKUP_FILES
        while read -r backup; do
            BACKUP_SIZE=$(du -h "$backup" | awk '{print $1}')
            BACKUP_DATE=$(date -r "$backup" "+%Y-%m-%d %H:%M:%S")
            echo -e "${GREEN}$i)${NC} $(basename "$backup")"
            echo -e "   Data: ${YELLOW}$BACKUP_DATE${NC}, Tamanho: ${YELLOW}$BACKUP_SIZE${NC}"
            echo ""
            BACKUP_FILES[$i]="$backup"
            ((i++))
        done <<< "$BACKUPS"
        
        # Solicitar escolha do usuário
        read -p "Digite o número do backup que deseja restaurar (ou 'q' para sair): " BACKUP_CHOICE
        
        if [[ $BACKUP_CHOICE == "q" || $BACKUP_CHOICE == "Q" ]]; then
            echo -e "${YELLOW}Operação cancelada pelo usuário.${NC}"
            exit 0
        fi
        
        # Verificar se a escolha é válida
        if ! [[ $BACKUP_CHOICE =~ ^[0-9]+$ ]] || [ $BACKUP_CHOICE -lt 1 ] || [ $BACKUP_CHOICE -ge $i ]; then
            echo -e "${RED}Escolha inválida!${NC}"
            exit 1
        fi
        
        BACKUP_FILE="${BACKUP_FILES[$BACKUP_CHOICE]}"
        echo -e "${GREEN}Backup selecionado: ${BACKUP_FILE}${NC}"
    else
        echo -e "${RED}Diretório de backups não encontrado: ${BACKUP_DIR}${NC}"
        exit 1
    fi
else
    BACKUP_FILE="$1"
    
    # Verificar se o arquivo existe
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Arquivo de backup não encontrado: ${BACKUP_FILE}${NC}"
        exit 1
    fi
fi

# Verificar integridade do backup antes de restaurar
if command -v sqlite3 > /dev/null; then
    echo -e "${BLUE}Verificando integridade do backup...${NC}"
    INTEGRITY=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" 2>/dev/null)
    
    if [ "$INTEGRITY" == "ok" ]; then
        echo -e "${GREEN}✓ Integridade do backup verificada${NC}"
    else
        echo -e "${RED}✗ Problemas de integridade no backup!${NC}"
        
        # Perguntar se deve continuar mesmo com problemas
        read -p "Deseja continuar mesmo com problemas de integridade? (n/S): " CONTINUE
        if [[ $CONTINUE != "S" && $CONTINUE != "s" ]]; then
            echo -e "${YELLOW}Operação cancelada pelo usuário.${NC}"
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}sqlite3 não disponível para verificar integridade${NC}"
    echo -e "${YELLOW}Continuando sem verificação...${NC}"
fi

# Verificar se o sistema está rodando
SYSTEM_RUNNING=false
if lsof -i :3001 -t > /dev/null 2>&1 || lsof -i :3000 -t > /dev/null 2>&1; then
    SYSTEM_RUNNING=true
    echo -e "${YELLOW}Sistema detectado em execução.${NC}"
    echo -e "${RED}O sistema precisa ser parado para restaurar o backup.${NC}"
    
    read -p "Deseja parar o sistema agora? [S/n]: " STOP_SYSTEM
    if [[ $STOP_SYSTEM == "" || $STOP_SYSTEM == "S" || $STOP_SYSTEM == "s" ]]; then
        echo -e "${YELLOW}Parando o sistema...${NC}"
        "${ROOT_DIR}/scripts/wsl/stop-system.sh"
    else
        echo -e "${RED}Não é possível restaurar com o sistema em execução.${NC}"
        exit 1
    fi
fi

# Criar backup do banco atual antes de restaurar
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="${BACKUP_DIR}/pre_restore_${TIMESTAMP}.db"

if [ -f "${DB_FILE}" ]; then
    echo -e "${BLUE}Criando backup do banco de dados atual...${NC}"
    cp "${DB_FILE}" "${CURRENT_BACKUP}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup do banco atual criado: ${CURRENT_BACKUP}${NC}"
    else
        echo -e "${RED}✗ Falha ao criar backup do banco atual!${NC}"
        
        # Perguntar se deve continuar mesmo sem backup
        read -p "Deseja continuar mesmo sem backup do banco atual? (n/S): " CONTINUE
        if [[ $CONTINUE != "S" && $CONTINUE != "s" ]]; then
            echo -e "${YELLOW}Operação cancelada pelo usuário.${NC}"
            exit 1
        fi
    fi
fi

# Restaurar o backup
echo -e "${BLUE}Restaurando banco de dados...${NC}"

# Garantir que o diretório prisma existe
mkdir -p "${BACKEND_DIR}/prisma"

# Copiar o backup para o local do banco de dados
cp "${BACKUP_FILE}" "${DB_FILE}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Banco de dados restaurado com sucesso!${NC}"
    
    # Verificar permissões
    chmod 644 "${DB_FILE}"
    echo -e "${GREEN}✓ Permissões do banco de dados ajustadas${NC}"
    
    # Verificar banco restaurado
    DB_SIZE=$(du -h "${DB_FILE}" | awk '{print $1}')
    echo -e "${BLUE}Tamanho do banco restaurado: ${YELLOW}${DB_SIZE}${NC}"
    
    # Perguntar se deseja iniciar o sistema
    read -p "Deseja iniciar o sistema agora? [S/n]: " START_SYSTEM
    if [[ $START_SYSTEM == "" || $START_SYSTEM == "S" || $START_SYSTEM == "s" ]]; then
        echo -e "${YELLOW}Iniciando o sistema...${NC}"
        "${ROOT_DIR}/scripts/wsl/start-system.sh"
    else
        echo -e "${YELLOW}Sistema não será iniciado automaticamente.${NC}"
        echo -e "${YELLOW}Para iniciar o sistema manualmente, execute: ./scripts/wsl/start-system.sh${NC}"
    fi
    
    # Mensagem final
    echo -e "\n${GREEN}=============================================${NC}"
    echo -e "${GREEN}      Restauração concluída com sucesso!      ${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${BLUE}Banco de dados restaurado a partir de:${NC}"
    echo -e "${GREEN}${BACKUP_FILE}${NC}"
    echo -e "\n${YELLOW}Em caso de problemas, um backup do banco anterior foi criado em:${NC}"
    echo -e "${GREEN}${CURRENT_BACKUP}${NC}"
else
    echo -e "${RED}✗ Falha ao restaurar o backup!${NC}"
    echo -e "${RED}Verifique as permissões e o espaço em disco.${NC}"
    
    # Mensagem de erro
    echo -e "\n${RED}=============================================${NC}"
    echo -e "${RED}      Falha na restauração do backup!      ${NC}"
    echo -e "${RED}=============================================${NC}"
    exit 1
fi
