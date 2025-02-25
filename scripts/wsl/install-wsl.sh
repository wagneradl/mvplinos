#!/bin/bash
# Script para instalar o Sistema Lino's Panificadora no ambiente WSL2
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
BACKUP_DIR="${ROOT_DIR}/backups"

# Criar diretórios necessários
mkdir -p "${LOGS_DIR}"
mkdir -p "${BACKUP_DIR}"

# Banner
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Instalação do Sistema Lino's Panificadora no WSL2  ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Iniciado em: $(date)${NC}\n"

# Verificar se estamos no WSL
echo -e "${YELLOW}Verificando ambiente WSL...${NC}"
if grep -qi microsoft /proc/version; then
    echo -e "${GREEN}✓ Executando em ambiente WSL${NC}"
else
    echo -e "${YELLOW}⚠️ Não está executando em WSL. Continuando em modo de simulação...${NC}"
fi

# Atualizar pacotes do sistema (somente no WSL)
if grep -qi microsoft /proc/version; then
    echo -e "\n${YELLOW}Atualizando o sistema...${NC}"
    sudo apt update && sudo apt upgrade -y
    echo -e "${GREEN}✓ Sistema atualizado${NC}"
fi

# Instalar dependências do sistema (somente no WSL)
if grep -qi microsoft /proc/version; then
    echo -e "\n${YELLOW}Instalando dependências do sistema...${NC}"
    sudo apt install -y curl git build-essential sqlite3
    echo -e "${GREEN}✓ Dependências do sistema instaladas${NC}"
fi

# Verificar Node.js e Yarn
echo -e "\n${YELLOW}Verificando Node.js e Yarn...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js não encontrado. Instalando...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js instalado: ${NODE_VERSION}${NC}"
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js já instalado: ${NODE_VERSION}${NC}"
fi

if ! command -v yarn &> /dev/null; then
    echo -e "${YELLOW}Yarn não encontrado. Instalando...${NC}"
    npm install -g yarn
    YARN_VERSION=$(yarn -v)
    echo -e "${GREEN}✓ Yarn instalado: ${YARN_VERSION}${NC}"
else
    YARN_VERSION=$(yarn -v)
    echo -e "${GREEN}✓ Yarn já instalado: ${YARN_VERSION}${NC}"
fi

# Verificar se os diretórios do projeto existem
echo -e "\n${YELLOW}Verificando estrutura do projeto...${NC}"
if [ -d "${BACKEND_DIR}" ] && [ -d "${FRONTEND_DIR}" ]; then
    echo -e "${GREEN}✓ Estrutura do projeto OK${NC}"
else
    echo -e "${RED}✗ Estrutura do projeto incompleta${NC}"
    exit 1
fi

# Instalar dependências do projeto
echo -e "\n${YELLOW}Instalando dependências do projeto...${NC}"
yarn install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependências do projeto instaladas com sucesso${NC}"
else
    echo -e "${RED}✗ Erro na instalação das dependências do projeto${NC}"
    exit 1
fi

# Gerar cliente Prisma
echo -e "\n${YELLOW}Gerando cliente Prisma...${NC}"
cd "${BACKEND_DIR}"
npx prisma generate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Cliente Prisma gerado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro na geração do cliente Prisma${NC}"
    exit 1
fi

# Aplicar migrações do banco de dados
echo -e "\n${YELLOW}Aplicando migrações do banco de dados...${NC}"
npx prisma migrate deploy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Migrações aplicadas com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao aplicar migrações${NC}"
    exit 1
fi

# Criar diretórios de upload
echo -e "\n${YELLOW}Criando diretórios de upload...${NC}"
UPLOAD_DIR="${BACKEND_DIR}/uploads"
mkdir -p "${UPLOAD_DIR}/pdfs"
mkdir -p "${UPLOAD_DIR}/static"
echo -e "${GREEN}✓ Diretórios de upload criados${NC}"

# Copiar logo (se existir)
if [ -f "${BACKEND_DIR}/src/assets/images/logo.png" ]; then
    echo -e "\n${YELLOW}Copiando logo...${NC}"
    cp "${BACKEND_DIR}/src/assets/images/logo.png" "${UPLOAD_DIR}/static/logo.png"
    echo -e "${GREEN}✓ Logo copiada com sucesso${NC}"
else
    echo -e "\n${YELLOW}⚠️ Arquivo de logo não encontrado${NC}"
fi

# Build do projeto
echo -e "\n${YELLOW}Realizando build do projeto...${NC}"
cd "${ROOT_DIR}"
yarn build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build concluído com sucesso${NC}"
else
    echo -e "${RED}✗ Erro no build do projeto${NC}"
    exit 1
fi

# Criar scripts de inicialização
echo -e "\n${YELLOW}Criando scripts de inicialização...${NC}"

# Script para iniciar o backend
cat > "${ROOT_DIR}/start-backend.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")/packages/backend"
echo "Iniciando backend do Sistema Lino's Panificadora..."
NODE_ENV=production node dist/main.js
EOL
chmod +x "${ROOT_DIR}/start-backend.sh"

# Script para iniciar o frontend
cat > "${ROOT_DIR}/start-frontend.sh" << 'EOL'
#!/bin/bash
cd "$(dirname "$0")/packages/frontend"
echo "Iniciando frontend do Sistema Lino's Panificadora..."
NODE_ENV=production node .next/server/server.js
EOL
chmod +x "${ROOT_DIR}/start-frontend.sh"

# Script para iniciar todo o sistema
cat > "${ROOT_DIR}/start-system.sh" << 'EOL'
#!/bin/bash
# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(dirname "$0")"
LOG_DIR="${ROOT_DIR}/logs"
mkdir -p "${LOG_DIR}"

echo -e "${BLUE}Iniciando Sistema Lino's Panificadora...${NC}"

# Verificar se as portas estão em uso
check_port() {
    local port=$1
    if lsof -i :$port | grep LISTEN > /dev/null; then
        echo -e "${RED}ALERTA: Porta $port já está em uso!${NC}"
        echo -e "${YELLOW}Tentando finalizar o processo...${NC}"
        lsof -i :$port | grep LISTEN | awk '{print $2}' | xargs kill -9
        sleep 2
    fi
}

# Verificar portas necessárias
check_port 3000
check_port 3001

# Iniciar o backend
echo -e "${YELLOW}Iniciando backend...${NC}"
"${ROOT_DIR}/start-backend.sh" > "${LOG_DIR}/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "${ROOT_DIR}/backend.pid"
echo -e "${GREEN}Backend iniciado com PID ${BACKEND_PID}${NC}"

# Aguardar inicialização do backend
echo -e "${YELLOW}Aguardando inicialização do backend...${NC}"
sleep 5

# Verificar se o backend está rodando
if ps -p $BACKEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Backend iniciado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao iniciar o backend${NC}"
    echo -e "${YELLOW}Verificando logs:${NC}"
    tail -n 20 "${LOG_DIR}/backend.log"
    exit 1
fi

# Iniciar o frontend
echo -e "${YELLOW}Iniciando frontend...${NC}"
"${ROOT_DIR}/start-frontend.sh" > "${LOG_DIR}/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "${ROOT_DIR}/frontend.pid"
echo -e "${GREEN}Frontend iniciado com PID ${FRONTEND_PID}${NC}"

# Aguardar inicialização do frontend
echo -e "${YELLOW}Aguardando inicialização do frontend...${NC}"
sleep 5

# Verificar se o frontend está rodando
if ps -p $FRONTEND_PID > /dev/null; then
    echo -e "${GREEN}✓ Frontend iniciado com sucesso${NC}"
else
    echo -e "${RED}✗ Erro ao iniciar o frontend${NC}"
    echo -e "${YELLOW}Verificando logs:${NC}"
    tail -n 20 "${LOG_DIR}/frontend.log"
    exit 1
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}     Sistema iniciado com sucesso!     ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Acesse: http://localhost:3000${NC}"
echo -e "${YELLOW}Logs disponíveis em: ${LOG_DIR}${NC}"
echo -e "\n${BLUE}Para parar o sistema, execute:${NC}"
echo -e "${YELLOW}./stop-system.sh${NC}"
EOL
chmod +x "${ROOT_DIR}/start-system.sh"

# Script para parar o sistema
cat > "${ROOT_DIR}/stop-system.sh" << 'EOL'
#!/bin/bash
# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ROOT_DIR="$(dirname "$0")"

echo -e "${YELLOW}Parando Sistema Lino's Panificadora...${NC}"

# Parar o backend
if [ -f "${ROOT_DIR}/backend.pid" ]; then
    BACKEND_PID=$(cat "${ROOT_DIR}/backend.pid")
    if ps -p $BACKEND_PID > /dev/null; then
        echo -e "${YELLOW}Parando backend (PID: ${BACKEND_PID})...${NC}"
        kill $BACKEND_PID
        sleep 2
        
        # Verificar se o processo foi encerrado
        if ps -p $BACKEND_PID > /dev/null; then
            echo -e "${RED}✗ Não foi possível encerrar o backend normalmente. Forçando...${NC}"
            kill -9 $BACKEND_PID
        else
            echo -e "${GREEN}✓ Backend parado com sucesso${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Backend não está em execução${NC}"
    fi
    rm "${ROOT_DIR}/backend.pid"
else
    echo -e "${YELLOW}⚠️ Arquivo de PID do backend não encontrado${NC}"
fi

# Parar o frontend
if [ -f "${ROOT_DIR}/frontend.pid" ]; then
    FRONTEND_PID=$(cat "${ROOT_DIR}/frontend.pid")
    if ps -p $FRONTEND_PID > /dev/null; then
        echo -e "${YELLOW}Parando frontend (PID: ${FRONTEND_PID})...${NC}"
        kill $FRONTEND_PID
        sleep 2
        
        # Verificar se o processo foi encerrado
        if ps -p $FRONTEND_PID > /dev/null; then
            echo -e "${RED}✗ Não foi possível encerrar o frontend normalmente. Forçando...${NC}"
            kill -9 $FRONTEND_PID
        else
            echo -e "${GREEN}✓ Frontend parado com sucesso${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ Frontend não está em execução${NC}"
    fi
    rm "${ROOT_DIR}/frontend.pid"
else
    echo -e "${YELLOW}⚠️ Arquivo de PID do frontend não encontrado${NC}"
fi

echo -e "${GREEN}Sistema parado com sucesso!${NC}"
EOL
chmod +x "${ROOT_DIR}/stop-system.sh"

# Script de backup
cat > "${ROOT_DIR}/backup-system.sh" << 'EOL'
#!/bin/bash
# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(dirname "$0")"
BACKUP_DIR="${ROOT_DIR}/backups"
DB_PATH="${ROOT_DIR}/packages/backend/prisma/dev.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.db"

# Criar diretório de backup se não existir
mkdir -p "${BACKUP_DIR}"

echo -e "${BLUE}Iniciando backup do Sistema Lino's Panificadora...${NC}"

# Verificar se o banco de dados existe
if [ ! -f "${DB_PATH}" ]; then
    echo -e "${RED}✗ Arquivo de banco de dados não encontrado: ${DB_PATH}${NC}"
    exit 1
fi

# Verificar integridade do banco de dados
echo -e "${YELLOW}Verificando integridade do banco de dados...${NC}"
sqlite3 "${DB_PATH}" "PRAGMA integrity_check;" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Integridade do banco de dados verificada${NC}"
else
    echo -e "${RED}✗ Verificação de integridade do banco de dados falhou${NC}"
    exit 1
fi

# Copiar o banco de dados
echo -e "${YELLOW}Realizando backup do banco de dados...${NC}"
cp "${DB_PATH}" "${BACKUP_FILE}"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup do banco de dados realizado com sucesso: ${BACKUP_FILE}${NC}"
else
    echo -e "${RED}✗ Erro ao criar backup do banco de dados${NC}"
    exit 1
fi

# Backup dos PDFs
PDF_DIR="${ROOT_DIR}/packages/backend/uploads/pdfs"
if [ -d "${PDF_DIR}" ]; then
    echo -e "${YELLOW}Realizando backup dos PDFs...${NC}"
    PDF_BACKUP_DIR="${BACKUP_DIR}/pdfs_${TIMESTAMP}"
    mkdir -p "${PDF_BACKUP_DIR}"
    
    # Contar arquivos PDF
    PDF_COUNT=$(find "${PDF_DIR}" -name "*.pdf" | wc -l)
    
    if [ $PDF_COUNT -gt 0 ]; then
        cp "${PDF_DIR}"/*.pdf "${PDF_BACKUP_DIR}/"
        echo -e "${GREEN}✓ Backup de ${PDF_COUNT} PDFs realizado com sucesso${NC}"
    else
        echo -e "${YELLOW}⚠️ Nenhum arquivo PDF encontrado para backup${NC}"
        rmdir "${PDF_BACKUP_DIR}"
    fi
fi

# Limpar backups antigos (manter apenas os 7 mais recentes)
echo -e "${YELLOW}Limpando backups antigos...${NC}"
ls -t "${BACKUP_DIR}"/backup_*.db | tail -n +8 | xargs -r rm
echo -e "${GREEN}✓ Limpeza de backups antigos concluída${NC}"

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}     Backup concluído com sucesso!     ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Arquivo de backup: ${BACKUP_FILE}${NC}"
echo -e "${YELLOW}Total de backups: $(ls "${BACKUP_DIR}"/backup_*.db | wc -l)${NC}"
EOL
chmod +x "${ROOT_DIR}/backup-system.sh"

# Script de restauração
cat > "${ROOT_DIR}/restore-system.sh" << 'EOL'
#!/bin/bash
# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT_DIR="$(dirname "$0")"
BACKUP_DIR="${ROOT_DIR}/backups"
DB_PATH="${ROOT_DIR}/packages/backend/prisma/dev.db"

# Verificar se existem backups
if [ ! -d "${BACKUP_DIR}" ] || [ $(ls "${BACKUP_DIR}"/backup_*.db 2>/dev/null | wc -l) -eq 0 ]; then
    echo -e "${RED}✗ Nenhum backup encontrado em ${BACKUP_DIR}${NC}"
    exit 1
fi

# Listar backups disponíveis
echo -e "${BLUE}Backups disponíveis:${NC}"
ls -1t "${BACKUP_DIR}"/backup_*.db | nl

# Solicitar seleção de backup
echo -e "${YELLOW}Digite o número do backup que deseja restaurar (ou 'q' para sair):${NC}"
read selection

# Verificar cancelamento
if [[ "$selection" == "q" ]]; then
    echo -e "${YELLOW}Restauração cancelada pelo usuário.${NC}"
    exit 0
fi

# Verificar seleção válida
if ! [[ "$selection" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}✗ Seleção inválida${NC}"
    exit 1
fi

# Obter caminho do backup selecionado
SELECTED_BACKUP=$(ls -1t "${BACKUP_DIR}"/backup_*.db | sed -n "${selection}p")
if [ -z "$SELECTED_BACKUP" ]; then
    echo -e "${RED}✗ Backup não encontrado${NC}"
    exit 1
fi

echo -e "${YELLOW}Backup selecionado: ${SELECTED_BACKUP}${NC}"

# Verificar se o sistema está em execução
if [ -f "${ROOT_DIR}/backend.pid" ] || [ -f "${ROOT_DIR}/frontend.pid" ]; then
    echo -e "${RED}✗ O sistema está em execução. Por favor, pare o sistema antes de restaurar o backup.${NC}"
    echo -e "${YELLOW}Execute ./stop-system.sh e tente novamente.${NC}"
    exit 1
fi

# Realizar backup do banco atual antes da restauração
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CURRENT_BACKUP="${BACKUP_DIR}/pre_restore_${TIMESTAMP}.db"
if [ -f "${DB_PATH}" ]; then
    echo -e "${YELLOW}Criando backup do banco atual antes da restauração...${NC}"
    cp "${DB_PATH}" "${CURRENT_BACKUP}"
    echo -e "${GREEN}✓ Backup atual salvo como: ${CURRENT_BACKUP}${NC}"
fi

# Restaurar o backup
echo -e "${YELLOW}Restaurando backup...${NC}"
cp "${SELECTED_BACKUP}" "${DB_PATH}"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Banco de dados restaurado com sucesso!${NC}"
else
    echo -e "${RED}✗ Erro ao restaurar o banco de dados${NC}"
    exit 1
fi

# Verificar integridade do banco restaurado
echo -e "${YELLOW}Verificando integridade do banco de dados restaurado...${NC}"
sqlite3 "${DB_PATH}" "PRAGMA integrity_check;" > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Integridade do banco restaurado verificada${NC}"
else
    echo -e "${RED}✗ Verificação de integridade do banco restaurado falhou${NC}"
    echo -e "${YELLOW}Tentando restaurar backup anterior...${NC}"
    cp "${CURRENT_BACKUP}" "${DB_PATH}"
    exit 1
fi

# Restaurar PDFs se existirem
BACKUP_NAME=$(basename "${SELECTED_BACKUP}" .db)
PDF_BACKUP_DIR="${BACKUP_DIR}/pdfs_${BACKUP_NAME#backup_}"
PDF_DIR="${ROOT_DIR}/packages/backend/uploads/pdfs"

if [ -d "${PDF_BACKUP_DIR}" ]; then
    echo -e "${YELLOW}Restaurando PDFs...${NC}"
    mkdir -p "${PDF_DIR}"
    cp "${PDF_BACKUP_DIR}"/*.pdf "${PDF_DIR}/" 2>/dev/null
    PDF_COUNT=$(find "${PDF_BACKUP_DIR}" -name "*.pdf" | wc -l)
    echo -e "${GREEN}✓ ${PDF_COUNT} PDFs restaurados${NC}"
fi

echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}     Restauração concluída com sucesso!     ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Banco de dados restaurado a partir de: ${SELECTED_BACKUP}${NC}"
echo -e "${YELLOW}Para iniciar o sistema, execute: ./start-system.sh${NC}"
EOL
chmod +x "${ROOT_DIR}/restore-system.sh"

# Criar cron job para backup automático
echo -e "\n${YELLOW}Configurando backup automático diário...${NC}"
(crontab -l 2>/dev/null | grep -v "backup-system.sh"; echo "0 23 * * * ${ROOT_DIR}/backup-system.sh >> ${ROOT_DIR}/logs/backup.log 2>&1") | crontab -
echo -e "${GREEN}✓ Backup automático configurado para executar diariamente às 23h${NC}"

# Instalação concluída
echo -e "\n${GREEN}=============================================${NC}"
echo -e "${GREEN}  Instalação concluída com sucesso!  ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}O Sistema Lino's Panificadora foi instalado com sucesso no WSL2!${NC}"
echo -e "\n${YELLOW}Scripts disponíveis:${NC}"
echo -e "${GREEN}./start-system.sh${NC} - Inicia o sistema completo"
echo -e "${GREEN}./stop-system.sh${NC} - Para o sistema"
echo -e "${GREEN}./backup-system.sh${NC} - Realiza backup manual"
echo -e "${GREEN}./restore-system.sh${NC} - Restaura um backup anterior"
echo -e "\n${BLUE}Para acessar o sistema, abra o navegador no Windows e acesse:${NC}"
echo -e "${GREEN}http://localhost:3000${NC}"
echo -e "\n${YELLOW}Um backup automático será executado diariamente às 23h${NC}"
