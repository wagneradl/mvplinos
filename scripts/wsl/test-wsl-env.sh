#!/bin/bash
# Script para testar o ambiente WSL2 simulando a implantação
# Versão 1.0
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
TEST_DIR="${ROOT_DIR}/.wsl-test"

# Criar diretórios necessários
mkdir -p "${LOGS_DIR}"
mkdir -p "${TEST_DIR}"

# Banner
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Teste de Ambiente WSL para Lino's Panificadora  ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Iniciado em: $(date)${NC}\n"

# Verificar se estamos no WSL
echo -e "${YELLOW}Verificando ambiente WSL...${NC}"
if grep -qi microsoft /proc/version; then
    echo -e "${GREEN}✓ Executando em ambiente WSL${NC}"
else
    echo -e "${YELLOW}⚠️ Não está executando em WSL. Continuando em modo de simulação...${NC}"
fi

# Verificar Node.js e Yarn
echo -e "\n${YELLOW}Verificando Node.js e Yarn...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js instalado: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}✗ Node.js não encontrado${NC}"
    exit 1
fi

if command -v yarn &> /dev/null; then
    YARN_VERSION=$(yarn -v)
    echo -e "${GREEN}✓ Yarn instalado: ${YARN_VERSION}${NC}"
else
    echo -e "${RED}✗ Yarn não encontrado${NC}"
    exit 1
fi

# Verificar se os diretórios do projeto existem
echo -e "\n${YELLOW}Verificando estrutura do projeto...${NC}"
if [ -d "${BACKEND_DIR}" ] && [ -d "${FRONTEND_DIR}" ]; then
    echo -e "${GREEN}✓ Estrutura do projeto OK${NC}"
else
    echo -e "${RED}✗ Estrutura do projeto incompleta${NC}"
    exit 1
fi

# Testar instalação de dependências
echo -e "\n${YELLOW}Testando instalação de dependências...${NC}"
yarn install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependências instaladas com sucesso${NC}"
else
    echo -e "${RED}✗ Erro na instalação de dependências${NC}"
    exit 1
fi

# Testar geração do cliente Prisma
echo -e "\n${YELLOW}Testando geração do cliente Prisma...${NC}"
cd "${BACKEND_DIR}"
npx prisma generate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Cliente Prisma gerado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro na geração do cliente Prisma${NC}"
    exit 1
fi

# Verificar diretórios necessários para o backend
echo -e "\n${YELLOW}Verificando diretórios de upload...${NC}"
UPLOAD_DIR="${BACKEND_DIR}/uploads"
mkdir -p "${UPLOAD_DIR}/pdfs"
mkdir -p "${UPLOAD_DIR}/static"
echo -e "${GREEN}✓ Diretórios de upload criados${NC}"

# Testar build do projeto
echo -e "\n${YELLOW}Testando build do projeto...${NC}"
cd "${ROOT_DIR}"
yarn build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build do projeto concluído com sucesso${NC}"
else
    echo -e "${RED}✗ Erro no build do projeto${NC}"
    exit 1
fi

# Testar inicialização do backend (por 5 segundos)
echo -e "\n${YELLOW}Testando inicialização do backend...${NC}"
cd "${BACKEND_DIR}"
node dist/main.js > "${LOGS_DIR}/backend-test.log" 2>&1 &
BACKEND_PID=$!
echo -e "${BLUE}Backend iniciado com PID ${BACKEND_PID}${NC}"

# Aguardar inicialização
echo -e "${YELLOW}Aguardando 5 segundos para inicialização...${NC}"
sleep 5

# Verificar se o processo está ativo
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend inicializado com sucesso${NC}"
    kill $BACKEND_PID
else
    echo -e "${RED}✗ Erro na inicialização do backend${NC}"
    echo -e "${YELLOW}Verificando logs:${NC}"
    tail -n 20 "${LOGS_DIR}/backend-test.log"
    exit 1
fi

# Testar inicialização do frontend (por 5 segundos)
echo -e "\n${YELLOW}Testando inicialização do frontend...${NC}"
cd "${FRONTEND_DIR}"
NODE_ENV=production node .next/server/server.js > "${LOGS_DIR}/frontend-test.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${BLUE}Frontend iniciado com PID ${FRONTEND_PID}${NC}"

# Aguardar inicialização
echo -e "${YELLOW}Aguardando 5 segundos para inicialização...${NC}"
sleep 5

# Verificar se o processo está ativo
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend inicializado com sucesso${NC}"
    kill $FRONTEND_PID
else
    echo -e "${RED}✗ Erro na inicialização do frontend${NC}"
    echo -e "${YELLOW}Verificando logs:${NC}"
    tail -n 20 "${LOGS_DIR}/frontend-test.log"
    exit 1
fi

# Testes concluídos
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}     Todos os testes concluídos com sucesso!     ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}O ambiente WSL está configurado corretamente para o Sistema Lino's Panificadora${NC}"
echo -e "${YELLOW}Logs disponíveis em: ${LOGS_DIR}${NC}"
