#!/bin/bash
# Script para iniciar o Sistema Lino's Panificadora
# Versão: 1.0
# Data: 25/02/2025

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Diretórios
ROOT_DIR=$(pwd)
BACKEND_DIR="${ROOT_DIR}/packages/backend"
FRONTEND_DIR="${ROOT_DIR}/packages/frontend"
LOGS_DIR="${ROOT_DIR}/logs"

# Criar diretórios necessários se não existirem
mkdir -p "${LOGS_DIR}"
mkdir -p "${BACKEND_DIR}/uploads/pdfs"
mkdir -p "${BACKEND_DIR}/uploads/static"

# Função para verificar se um processo está rodando na porta
check_port() {
    local port=$1
    lsof -i :$port -t > /dev/null 2>&1
    return $?
}

# Banner
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}      Iniciando Sistema Lino's Panificadora      ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Data: $(date)${NC}\n"

# Verificar se o backend já está rodando
if check_port 3001; then
    echo -e "${YELLOW}Backend já está rodando na porta 3001${NC}"
else
    echo -e "${BLUE}Iniciando backend...${NC}"
    cd "${BACKEND_DIR}"
    
    # Verificar se a pasta node_modules existe
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Instalando dependências do backend...${NC}"
        yarn install
    fi
    
    # Iniciar o backend
    yarn dev > "${LOGS_DIR}/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "${ROOT_DIR}/backend.pid"
    echo -e "${GREEN}Backend iniciado com PID ${BACKEND_PID}${NC}"
    
    # Aguardar o backend iniciar
    echo -e "${YELLOW}Aguardando backend iniciar (10 segundos)...${NC}"
    sleep 10
fi

# Verificar se o frontend já está rodando
if check_port 3000; then
    echo -e "${YELLOW}Frontend já está rodando na porta 3000${NC}"
else
    echo -e "${BLUE}Iniciando frontend...${NC}"
    cd "${FRONTEND_DIR}"
    
    # Verificar se a pasta node_modules existe
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Instalando dependências do frontend...${NC}"
        yarn install
    fi
    
    # Iniciar o frontend
    yarn dev > "${LOGS_DIR}/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "${ROOT_DIR}/frontend.pid"
    echo -e "${GREEN}Frontend iniciado com PID ${FRONTEND_PID}${NC}"
    
    # Aguardar o frontend iniciar
    echo -e "${YELLOW}Aguardando frontend iniciar (5 segundos)...${NC}"
    sleep 5
fi

# Verificar se os serviços estão rodando corretamente
echo -e "\n${BLUE}Verificando serviços...${NC}"
if check_port 3001; then
    echo -e "${GREEN}✓ Backend rodando na porta 3001${NC}"
else
    echo -e "${YELLOW}⚠️ Backend não está rodando corretamente${NC}"
    echo -e "${YELLOW}Verifique o log em ${LOGS_DIR}/backend.log${NC}"
fi

if check_port 3000; then
    echo -e "${GREEN}✓ Frontend rodando na porta 3000${NC}"
else
    echo -e "${YELLOW}⚠️ Frontend não está rodando corretamente${NC}"
    echo -e "${YELLOW}Verifique o log em ${LOGS_DIR}/frontend.log${NC}"
fi

# Exibir informações finais
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}      Sistema iniciado com sucesso!      ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Acesse o sistema em:${NC} ${GREEN}http://localhost:3000${NC}"
echo -e "${BLUE}Backend API:${NC} ${GREEN}http://localhost:3001${NC}"
echo -e "${BLUE}Logs:${NC} ${GREEN}${LOGS_DIR}${NC}"

echo -e "\n${BLUE}Para parar o sistema, execute:${NC} ${GREEN}./stop-system.sh${NC}"
echo -e "${BLUE}Para ver o status completo, execute:${NC} ${GREEN}./scripts/wsl/status-report.sh${NC}"
