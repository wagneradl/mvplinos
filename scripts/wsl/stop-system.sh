#!/bin/bash
# Script para parar o Sistema Lino's Panificadora
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

# Banner
echo -e "\n${BLUE}=============================================${NC}"
echo -e "${BLUE}      Parando Sistema Lino's Panificadora      ${NC}"
echo -e "${BLUE}=============================================${NC}"

# Parar backend
if [ -f "${ROOT_DIR}/backend.pid" ]; then
    BACKEND_PID=$(cat "${ROOT_DIR}/backend.pid")
    echo -e "${YELLOW}Parando backend (PID: ${BACKEND_PID})...${NC}"
    
    if ps -p $BACKEND_PID > /dev/null; then
        kill $BACKEND_PID
        sleep 2
        
        # Verificar se foi realmente parado
        if ps -p $BACKEND_PID > /dev/null; then
            echo -e "${RED}Falha ao parar backend, forçando encerramento...${NC}"
            kill -9 $BACKEND_PID
        fi
        
        echo -e "${GREEN}Backend parado com sucesso${NC}"
    else
        echo -e "${YELLOW}Processo do backend não encontrado${NC}"
    fi
    
    # Remover arquivo de PID
    rm "${ROOT_DIR}/backend.pid"
else
    echo -e "${YELLOW}Arquivo de PID do backend não encontrado${NC}"
    
    # Tentar encontrar e matar processo na porta 3001
    BACKEND_PID=$(lsof -i :3001 -t 2>/dev/null)
    if [ ! -z "$BACKEND_PID" ]; then
        echo -e "${YELLOW}Encontrado processo na porta 3001 (PID: ${BACKEND_PID}), encerrando...${NC}"
        kill $BACKEND_PID 2>/dev/null
        sleep 2
        kill -9 $BACKEND_PID 2>/dev/null
    fi
fi

# Parar frontend
if [ -f "${ROOT_DIR}/frontend.pid" ]; then
    FRONTEND_PID=$(cat "${ROOT_DIR}/frontend.pid")
    echo -e "${YELLOW}Parando frontend (PID: ${FRONTEND_PID})...${NC}"
    
    if ps -p $FRONTEND_PID > /dev/null; then
        kill $FRONTEND_PID
        sleep 2
        
        # Verificar se foi realmente parado
        if ps -p $FRONTEND_PID > /dev/null; then
            echo -e "${RED}Falha ao parar frontend, forçando encerramento...${NC}"
            kill -9 $FRONTEND_PID
        fi
        
        echo -e "${GREEN}Frontend parado com sucesso${NC}"
    else
        echo -e "${YELLOW}Processo do frontend não encontrado${NC}"
    fi
    
    # Remover arquivo de PID
    rm "${ROOT_DIR}/frontend.pid"
else
    echo -e "${YELLOW}Arquivo de PID do frontend não encontrado${NC}"
    
    # Tentar encontrar e matar processo na porta 3000
    FRONTEND_PID=$(lsof -i :3000 -t 2>/dev/null)
    if [ ! -z "$FRONTEND_PID" ]; then
        echo -e "${YELLOW}Encontrado processo na porta 3000 (PID: ${FRONTEND_PID}), encerrando...${NC}"
        kill $FRONTEND_PID 2>/dev/null
        sleep 2
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
fi

# Verificar portas
echo -e "\n${BLUE}Verificando portas...${NC}"
if lsof -i :3001 -t > /dev/null 2>&1; then
    echo -e "${RED}Porta 3001 ainda ocupada!${NC}"
    echo -e "${YELLOW}Executando limpeza forçada...${NC}"
    lsof -i :3001 -t | xargs kill -9 2>/dev/null
else
    echo -e "${GREEN}✓ Porta 3001 está livre${NC}"
fi

if lsof -i :3000 -t > /dev/null 2>&1; then
    echo -e "${RED}Porta 3000 ainda ocupada!${NC}"
    echo -e "${YELLOW}Executando limpeza forçada...${NC}"
    lsof -i :3000 -t | xargs kill -9 2>/dev/null
else
    echo -e "${GREEN}✓ Porta 3000 está livre${NC}"
fi

# Mensagem final
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}      Sistema parado com sucesso!      ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Para iniciar o sistema novamente, execute:${NC} ${GREEN}./start-system.sh${NC}"
