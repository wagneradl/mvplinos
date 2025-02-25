#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Iniciando deploy do Sistema de Gestão de Pedidos da Lino's Padaria...${NC}"

# Verificar se yarn está instalado
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}Yarn não encontrado. Por favor, instale o Yarn primeiro.${NC}"
    exit 1
fi

# Verificar se os arquivos .env existem
if [ ! -f "./packages/backend/.env" ]; then
    echo -e "${RED}Arquivo .env do backend não encontrado. Por favor, crie o arquivo .env na pasta packages/backend.${NC}"
    exit 1
fi

if [ ! -f "./packages/frontend/.env" ]; then
    echo -e "${RED}Arquivo .env do frontend não encontrado. Por favor, crie o arquivo .env na pasta packages/frontend.${NC}"
    exit 1
fi

# Verificar variáveis de ambiente necessárias
required_backend_vars=("DATABASE_URL" "JWT_SECRET" "PORT")
required_frontend_vars=("NEXT_PUBLIC_API_URL")

echo -e "${YELLOW}Verificando variáveis de ambiente do backend...${NC}"
missing_vars=false
while IFS= read -r line; do
    if [[ $line =~ ^[^#] ]]; then
        var_name=$(echo "$line" | cut -d'=' -f1)
        var_value=$(echo "$line" | cut -d'=' -f2-)
        if [[ " ${required_backend_vars[@]} " =~ " ${var_name} " ]] && [[ -z "$var_value" ]]; then
            echo -e "${RED}Variável de ambiente $var_name não está definida no backend${NC}"
            missing_vars=true
        fi
    fi
done < "./packages/backend/.env"

echo -e "${YELLOW}Verificando variáveis de ambiente do frontend...${NC}"
while IFS= read -r line; do
    if [[ $line =~ ^[^#] ]]; then
        var_name=$(echo "$line" | cut -d'=' -f1)
        var_value=$(echo "$line" | cut -d'=' -f2-)
        if [[ " ${required_frontend_vars[@]} " =~ " ${var_name} " ]] && [[ -z "$var_value" ]]; then
            echo -e "${RED}Variável de ambiente $var_name não está definida no frontend${NC}"
            missing_vars=true
        fi
    fi
done < "./packages/frontend/.env"

if [ "$missing_vars" = true ]; then
    echo -e "${RED}Algumas variáveis de ambiente necessárias não estão definidas. Por favor, verifique os arquivos .env${NC}"
    exit 1
fi

# Instalar dependências
echo -e "${YELLOW}Instalando dependências...${NC}"
yarn install
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao instalar dependências.${NC}"
    exit 1
fi

# Gerar client do Prisma
echo -e "${YELLOW}Gerando client do Prisma...${NC}"
yarn workspace @linos/backend prisma generate
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao gerar client do Prisma.${NC}"
    exit 1
fi

# Executar migrations
echo -e "${YELLOW}Executando migrations...${NC}"
yarn workspace @linos/backend prisma migrate deploy
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao executar migrations.${NC}"
    exit 1
fi

# Build do backend
echo -e "${YELLOW}Building backend...${NC}"
yarn workspace @linos/backend build
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro no build do backend.${NC}"
    exit 1
fi

# Build do frontend
echo -e "${YELLOW}Building frontend...${NC}"
yarn workspace @linos/frontend build
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro no build do frontend.${NC}"
    exit 1
fi

# Criar diretório de backup se não existir
mkdir -p ./backups

# Backup do banco atual
echo -e "${YELLOW}Realizando backup do banco de dados...${NC}"
cp ./packages/backend/prisma/dev.db ./backups/dev.db.$(date +%Y%m%d_%H%M%S)
if [ $? -ne 0 ]; then
    echo -e "${RED}Erro ao realizar backup do banco.${NC}"
    exit 1
fi

# Iniciar aplicação
echo -e "${YELLOW}Iniciando aplicação...${NC}"
yarn start

echo -e "${GREEN}Deploy concluído com sucesso!${NC}"
echo -e "${YELLOW}A aplicação está rodando em:${NC}"
echo -e "Frontend: ${GREEN}http://localhost:3000${NC}"
echo -e "Backend: ${GREEN}http://localhost:3001${NC}"
