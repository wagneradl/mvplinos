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
