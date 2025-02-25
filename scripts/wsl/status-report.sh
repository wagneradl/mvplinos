#!/bin/bash
# Script para gerar relatório de status do Sistema Lino's Panificadora
# Este script verifica o estado atual do sistema e gera um relatório para suporte remoto
# Versão: 1.0
# Data: 25/02/2025

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Diretórios
ROOT_DIR=$(pwd)
BACKEND_DIR="${ROOT_DIR}/packages/backend"
FRONTEND_DIR="${ROOT_DIR}/packages/frontend"
LOGS_DIR="${ROOT_DIR}/logs"
BACKUP_DIR="${ROOT_DIR}/backups"
REPORT_DIR="${ROOT_DIR}/reports"

# Criar diretórios necessários
mkdir -p "${LOGS_DIR}"
mkdir -p "${REPORT_DIR}"

# Nome do arquivo de relatório
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/status_report_${TIMESTAMP}.txt"

# Função para verificar status de um serviço
check_service_status() {
    local service_name=$1
    local port=$2
    local pid_file=$3
    
    echo "Verificando status de $service_name..."
    
    # Verificar se o serviço está rodando via PID
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null; then
            echo -e "${GREEN}✓ $service_name está rodando (PID: $pid)${NC}"
            echo "$service_name está rodando (PID: $pid)" >> "$REPORT_FILE"
            
            # Verificar uso de CPU e memória
            local cpu=$(ps -p $pid -o %cpu --no-headers | tr -d ' ')
            local mem=$(ps -p $pid -o %mem --no-headers | tr -d ' ')
            echo -e "  CPU: ${YELLOW}${cpu}%${NC}, Memória: ${YELLOW}${mem}%${NC}"
            echo "  CPU: ${cpu}%, Memória: ${mem}%" >> "$REPORT_FILE"
            
            return 0
        else
            echo -e "${RED}✗ $service_name não está rodando (PID inválido: $pid)${NC}"
            echo "$service_name não está rodando (PID inválido: $pid)" >> "$REPORT_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️ Arquivo PID para $service_name não encontrado${NC}"
        echo "Arquivo PID para $service_name não encontrado" >> "$REPORT_FILE"
    fi
    
    # Verificar se o serviço está rodando via porta
    if command -v lsof > /dev/null; then
        if lsof -i :$port | grep LISTEN > /dev/null; then
            local service_pid=$(lsof -i :$port | grep LISTEN | awk '{print $2}')
            echo -e "${GREEN}✓ $service_name está rodando na porta $port (PID: $service_pid)${NC}"
            echo "$service_name está rodando na porta $port (PID: $service_pid)" >> "$REPORT_FILE"
            return 0
        else
            echo -e "${RED}✗ $service_name não está rodando na porta $port${NC}"
            echo "$service_name não está rodando na porta $port" >> "$REPORT_FILE"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ Comando lsof não disponível para verificar porta${NC}"
        echo "Comando lsof não disponível para verificar porta" >> "$REPORT_FILE"
        return 1
    fi
}

# Função para verificar o banco de dados
check_database() {
    local db_path="${BACKEND_DIR}/prisma/dev.db"
    
    echo "Verificando banco de dados..."
    
    # Verificar se o arquivo de banco de dados existe
    if [ -f "$db_path" ]; then
        local db_size=$(du -h "$db_path" | awk '{print $1}')
        echo -e "${GREEN}✓ Banco de dados encontrado (Tamanho: $db_size)${NC}"
        echo "Banco de dados encontrado (Tamanho: $db_size)" >> "$REPORT_FILE"
        
        # Verificar integridade do banco de dados
        if command -v sqlite3 > /dev/null; then
            echo "Verificando integridade do banco de dados..."
            if sqlite3 "$db_path" "PRAGMA integrity_check;" | grep -q "ok"; then
                echo -e "${GREEN}✓ Integridade do banco de dados OK${NC}"
                echo "Integridade do banco de dados OK" >> "$REPORT_FILE"
                
                # Obter estatísticas básicas
                local tables=$(sqlite3 "$db_path" ".tables" | wc -w)
                echo -e "  Tabelas: ${YELLOW}$tables${NC}"
                echo "  Tabelas: $tables" >> "$REPORT_FILE"
                
                # Contar registros em tabelas principais
                echo "Estatísticas do banco de dados:" >> "$REPORT_FILE"
                for table in "Produto" "Cliente" "Pedido" "ItensPedido"; do
                    local count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM $table;")
                    echo -e "  $table: ${YELLOW}$count registros${NC}"
                    echo "  $table: $count registros" >> "$REPORT_FILE"
                done
                
                return 0
            else
                echo -e "${RED}✗ Verificação de integridade do banco de dados falhou${NC}"
                echo "Verificação de integridade do banco de dados falhou" >> "$REPORT_FILE"
                return 1
            fi
        else
            echo -e "${YELLOW}⚠️ sqlite3 não disponível para verificar integridade do banco de dados${NC}"
            echo "sqlite3 não disponível para verificar integridade do banco de dados" >> "$REPORT_FILE"
            return 0
        fi
    else
        echo -e "${RED}✗ Banco de dados não encontrado: $db_path${NC}"
        echo "Banco de dados não encontrado: $db_path" >> "$REPORT_FILE"
        return 1
    fi
}

# Função para verificar logs
check_logs() {
    echo "Verificando logs do sistema..."
    
    if [ -d "$LOGS_DIR" ]; then
        local log_count=$(find "$LOGS_DIR" -type f -name "*.log" | wc -l)
        echo -e "${GREEN}✓ Diretório de logs encontrado ($log_count arquivos)${NC}"
        echo "Diretório de logs encontrado ($log_count arquivos)" >> "$REPORT_FILE"
        
        # Verificar logs do backend
        local backend_log="${LOGS_DIR}/backend.log"
        if [ -f "$backend_log" ]; then
            local backend_log_size=$(du -h "$backend_log" | awk '{print $1}')
            echo -e "  Log do backend: ${YELLOW}$backend_log_size${NC}"
            echo "  Log do backend: $backend_log_size" >> "$REPORT_FILE"
            
            # Verificar erros recentes
            local recent_errors=$(tail -n 100 "$backend_log" | grep -i "error" | wc -l)
            echo -e "  Erros recentes no backend: ${YELLOW}$recent_errors${NC}"
            echo "  Erros recentes no backend: $recent_errors" >> "$REPORT_FILE"
            
            if [ $recent_errors -gt 0 ]; then
                echo "Últimos erros do backend:" >> "$REPORT_FILE"
                tail -n 100 "$backend_log" | grep -i "error" | tail -n 5 >> "$REPORT_FILE"
            fi
        else
            echo -e "${YELLOW}⚠️ Log do backend não encontrado${NC}"
            echo "Log do backend não encontrado" >> "$REPORT_FILE"
        fi
        
        # Verificar logs do frontend
        local frontend_log="${LOGS_DIR}/frontend.log"
        if [ -f "$frontend_log" ]; then
            local frontend_log_size=$(du -h "$frontend_log" | awk '{print $1}')
            echo -e "  Log do frontend: ${YELLOW}$frontend_log_size${NC}"
            echo "  Log do frontend: $frontend_log_size" >> "$REPORT_FILE"
            
            # Verificar erros recentes
            local recent_errors=$(tail -n 100 "$frontend_log" | grep -i "error" | wc -l)
            echo -e "  Erros recentes no frontend: ${YELLOW}$recent_errors${NC}"
            echo "  Erros recentes no frontend: $recent_errors" >> "$REPORT_FILE"
            
            if [ $recent_errors -gt 0 ]; then
                echo "Últimos erros do frontend:" >> "$REPORT_FILE"
                tail -n 100 "$frontend_log" | grep -i "error" | tail -n 5 >> "$REPORT_FILE"
            fi
        else
            echo -e "${YELLOW}⚠️ Log do frontend não encontrado${NC}"
            echo "Log do frontend não encontrado" >> "$REPORT_FILE"
        fi
        
        return 0
    else
        echo -e "${YELLOW}⚠️ Diretório de logs não encontrado${NC}"
        echo "Diretório de logs não encontrado" >> "$REPORT_FILE"
        return 1
    fi
}

# Função para verificar backups
check_backups() {
    echo "Verificando backups..."
    
    if [ -d "$BACKUP_DIR" ]; then
        local backup_count=$(find "$BACKUP_DIR" -type f -name "backup_*.db" | wc -l)
        echo -e "${GREEN}✓ Diretório de backups encontrado ($backup_count backups)${NC}"
        echo "Diretório de backups encontrado ($backup_count backups)" >> "$REPORT_FILE"
        
        if [ $backup_count -gt 0 ]; then
            # Verificar backup mais recente
            local latest_backup=$(find "$BACKUP_DIR" -type f -name "backup_*.db" | sort -r | head -n 1)
            local backup_date=$(date -r "$latest_backup" "+%Y-%m-%d %H:%M:%S")
            local backup_size=$(du -h "$latest_backup" | awk '{print $1}')
            
            echo -e "  Backup mais recente: ${YELLOW}$backup_date${NC} (${YELLOW}$backup_size${NC})"
            echo "  Backup mais recente: $backup_date ($backup_size)" >> "$REPORT_FILE"
            
            # Verificar integridade do backup mais recente
            if command -v sqlite3 > /dev/null; then
                echo "Verificando integridade do backup mais recente..."
                if sqlite3 "$latest_backup" "PRAGMA integrity_check;" | grep -q "ok"; then
                    echo -e "${GREEN}✓ Integridade do backup OK${NC}"
                    echo "Integridade do backup OK" >> "$REPORT_FILE"
                else
                    echo -e "${RED}✗ Verificação de integridade do backup falhou${NC}"
                    echo "Verificação de integridade do backup falhou" >> "$REPORT_FILE"
                fi
            fi
            
            # Listar backups recentes
            echo "Backups recentes:" >> "$REPORT_FILE"
            find "$BACKUP_DIR" -type f -name "backup_*.db" | sort -r | head -n 5 | while read backup; do
                local bdate=$(date -r "$backup" "+%Y-%m-%d %H:%M:%S")
                local bsize=$(du -h "$backup" | awk '{print $1}')
                echo "  $(basename "$backup"): $bdate ($bsize)" >> "$REPORT_FILE"
            done
        else
            echo -e "${YELLOW}⚠️ Nenhum backup encontrado${NC}"
            echo "Nenhum backup encontrado" >> "$REPORT_FILE"
        fi
        
        return 0
    else
        echo -e "${YELLOW}⚠️ Diretório de backups não encontrado${NC}"
        echo "Diretório de backups não encontrado" >> "$REPORT_FILE"
        return 1
    fi
}

# Função para verificar sistema de arquivos
check_filesystem() {
    echo "Verificando sistema de arquivos..."
    
    # Verificar espaço em disco
    local disk_space=$(df -h . | tail -n 1)
    local disk_used=$(echo "$disk_space" | awk '{print $5}')
    local disk_avail=$(echo "$disk_space" | awk '{print $4}')
    
    echo -e "${GREEN}✓ Espaço em disco: ${YELLOW}$disk_used usado, $disk_avail disponível${NC}"
    echo "Espaço em disco: $disk_used usado, $disk_avail disponível" >> "$REPORT_FILE"
    
    # Verificar diretórios de uploads
    local upload_dir="${BACKEND_DIR}/uploads"
    if [ -d "$upload_dir" ]; then
        local pdf_count=$(find "${upload_dir}/pdfs" -type f -name "*.pdf" 2>/dev/null | wc -l)
        echo -e "${GREEN}✓ Diretório de uploads encontrado ($pdf_count PDFs)${NC}"
        echo "Diretório de uploads encontrado ($pdf_count PDFs)" >> "$REPORT_FILE"
        
        # Verificar logo
        if [ -f "${upload_dir}/static/logo.png" ]; then
            echo -e "${GREEN}✓ Logo encontrada${NC}"
            echo "Logo encontrada" >> "$REPORT_FILE"
        else
            echo -e "${YELLOW}⚠️ Logo não encontrada${NC}"
            echo "Logo não encontrada" >> "$REPORT_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️ Diretório de uploads não encontrado${NC}"
        echo "Diretório de uploads não encontrado" >> "$REPORT_FILE"
    fi
    
    return 0
}

# Função para verificar rede
check_network() {
    echo "Verificando conectividade de rede..."
    
    # Verificar portas em uso
    if command -v lsof > /dev/null; then
        echo "Portas em uso:" >> "$REPORT_FILE"
        lsof -i -P -n | grep LISTEN >> "$REPORT_FILE"
    fi
    
    # Verificar portas 3000 e 3001
    if command -v nc > /dev/null; then
        # Verificar porta 3000 (frontend)
        if nc -z localhost 3000 2>/dev/null; then
            echo -e "${GREEN}✓ Porta 3000 (frontend) está aberta${NC}"
            echo "Porta 3000 (frontend) está aberta" >> "$REPORT_FILE"
        else
            echo -e "${RED}✗ Porta 3000 (frontend) não está aberta${NC}"
            echo "Porta 3000 (frontend) não está aberta" >> "$REPORT_FILE"
        fi
        
        # Verificar porta 3001 (backend)
        if nc -z localhost 3001 2>/dev/null; then
            echo -e "${GREEN}✓ Porta 3001 (backend) está aberta${NC}"
            echo "Porta 3001 (backend) está aberta" >> "$REPORT_FILE"
        else
            echo -e "${RED}✗ Porta 3001 (backend) não está aberta${NC}"
            echo "Porta 3001 (backend) não está aberta" >> "$REPORT_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️ Comando nc não disponível para verificar portas${NC}"
        echo "Comando nc não disponível para verificar portas" >> "$REPORT_FILE"
    fi
    
    return 0
}

# Função para verificar versões de software
check_versions() {
    echo "Verificando versões de software..."
    
    # Verificar Node.js
    if command -v node > /dev/null; then
        local node_version=$(node -v)
        echo -e "${GREEN}✓ Node.js: ${YELLOW}$node_version${NC}"
        echo "Node.js: $node_version" >> "$REPORT_FILE"
    else
        echo -e "${RED}✗ Node.js não encontrado${NC}"
        echo "Node.js não encontrado" >> "$REPORT_FILE"
    fi
    
    # Verificar Yarn
    if command -v yarn > /dev/null; then
        local yarn_version=$(yarn -v)
        echo -e "${GREEN}✓ Yarn: ${YELLOW}$yarn_version${NC}"
        echo "Yarn: $yarn_version" >> "$REPORT_FILE"
    else
        echo -e "${RED}✗ Yarn não encontrado${NC}"
        echo "Yarn não encontrado" >> "$REPORT_FILE"
    fi
    
    # Verificar ambiente WSL
    if grep -qi microsoft /proc/version; then
        echo -e "${GREEN}✓ Executando em ambiente WSL${NC}"
        echo "Executando em ambiente WSL" >> "$REPORT_FILE"
        
        # Verificar versão do WSL
        if command -v wsl.exe > /dev/null; then
            local wsl_version=$(wsl.exe -l -v | grep Ubuntu | awk '{print $3}')
            echo -e "${GREEN}✓ Versão do WSL: ${YELLOW}$wsl_version${NC}"
            echo "Versão do WSL: $wsl_version" >> "$REPORT_FILE"
        fi
    else
        echo -e "${YELLOW}⚠️ Não está executando em ambiente WSL${NC}"
        echo "Não está executando em ambiente WSL" >> "$REPORT_FILE"
    fi
    
    return 0
}

# Iniciar relatório
echo "====== Relatório de Status do Sistema Lino's Panificadora ======" > "$REPORT_FILE"
echo "Data: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "Hostname: $(hostname)" >> "$REPORT_FILE"
echo "Usuário: $(whoami)" >> "$REPORT_FILE"
echo "Versão do sistema: 1.0.0" >> "$REPORT_FILE"
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Banner
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}    Diagnóstico do Sistema Lino's Panificadora    ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Gerando relatório de status...${NC}\n"

# Verificar versões de software
echo -e "\n${BLUE}Verificando versões de software...${NC}"
check_versions
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar status dos serviços
echo -e "\n${BLUE}Verificando status dos serviços...${NC}"
echo "Status dos Serviços:" >> "$REPORT_FILE"
check_service_status "Backend" "3001" "${ROOT_DIR}/backend.pid"
check_service_status "Frontend" "3000" "${ROOT_DIR}/frontend.pid"
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar banco de dados
echo -e "\n${BLUE}Verificando banco de dados...${NC}"
echo "Status do Banco de Dados:" >> "$REPORT_FILE"
check_database
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar logs
echo -e "\n${BLUE}Verificando logs...${NC}"
echo "Status dos Logs:" >> "$REPORT_FILE"
check_logs
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar backups
echo -e "\n${BLUE}Verificando backups...${NC}"
echo "Status dos Backups:" >> "$REPORT_FILE"
check_backups
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar sistema de arquivos
echo -e "\n${BLUE}Verificando sistema de arquivos...${NC}"
echo "Status do Sistema de Arquivos:" >> "$REPORT_FILE"
check_filesystem
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar rede
echo -e "\n${BLUE}Verificando rede...${NC}"
echo "Status da Rede:" >> "$REPORT_FILE"
check_network
echo "=======================================================" >> "$REPORT_FILE"
echo >> "$REPORT_FILE"

# Verificar ambiente WSL (se aplicável)
if grep -qi microsoft /proc/version; then
    echo -e "\n${BLUE}Coletando informações do ambiente WSL...${NC}"
    echo "Informações do WSL:" >> "$REPORT_FILE"
    wsl.exe -l -v >> "$REPORT_FILE" 2>/dev/null
    echo >> "$REPORT_FILE"
    echo "Configuração do WSL:" >> "$REPORT_FILE"
    cat /proc/version >> "$REPORT_FILE" 2>/dev/null
    echo "=======================================================" >> "$REPORT_FILE"
    echo >> "$REPORT_FILE"
fi

# Resumo do diagnóstico
echo -e "\n${BLUE}Compilando resumo do diagnóstico...${NC}"
echo "Resumo do Diagnóstico:" >> "$REPORT_FILE"
echo "- Backend: $(check_service_status "Backend" "3001" "${ROOT_DIR}/backend.pid" > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "- Frontend: $(check_service_status "Frontend" "3000" "${ROOT_DIR}/frontend.pid" > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "- Banco de Dados: $(check_database > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "- Logs: $(check_logs > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "- Backups: $(check_backups > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "- Sistema de Arquivos: $(check_filesystem > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "- Rede: $(check_network > /dev/null && echo "OK" || echo "FALHA")" >> "$REPORT_FILE"
echo "=======================================================" >> "$REPORT_FILE"

# Finalização
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}    Relatório de status gerado com sucesso!    ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Arquivo: ${YELLOW}${REPORT_FILE}${NC}"
echo -e "${BLUE}Use este arquivo para diagnóstico e suporte remoto.${NC}"
echo -e "${YELLOW}Para enviar o relatório para suporte técnico:${NC}"
echo -e "${GREEN}  cat \"${REPORT_FILE}\" | tee /dev/tty | nc termbin.com 9999${NC}"
echo -e "${BLUE}O comando acima irá gerar uma URL que pode ser compartilhada com o suporte técnico.${NC}"

# Tornar o script executável
chmod +x "$REPORT_FILE"
