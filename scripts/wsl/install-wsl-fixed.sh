#!/bin/bash
# Script melhorado para instalação do Sistema Lino's Panificadora no WSL
# Versão: 2.0
# Data: 25/02/2025

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Banner
clear
echo -e "${GREEN}=================================================================${NC}"
echo -e "${GREEN}     INSTALAÇÃO DO SISTEMA LINO'S PANIFICADORA NO WSL           ${NC}"
echo -e "${GREEN}=================================================================${NC}"
echo -e "${BLUE}Data: $(date)${NC}\n"

# Diretórios
ROOT_DIR=$(pwd)
BACKEND_DIR="${ROOT_DIR}/packages/backend"
FRONTEND_DIR="${ROOT_DIR}/packages/frontend"
LOGS_DIR="${ROOT_DIR}/logs"
BACKUP_DIR="${ROOT_DIR}/backups"

# Função para exibir mensagens de erro e sair
error_exit() {
    echo -e "${RED}ERRO: $1${NC}" >&2
    echo -e "${YELLOW}A instalação foi interrompida devido a um erro.${NC}"
    echo -e "${YELLOW}Por favor, verifique o problema e tente novamente.${NC}"
    exit 1
}

# Função para exibir status de progresso
show_status() {
    echo -e "\n${BLUE}[$1/${TOTAL_STEPS}] $2...${NC}"
}

# Número total de etapas de instalação
TOTAL_STEPS=8

# Função para verificar se está no diretório correto
check_directory() {
    show_status 1 "Verificando diretório do projeto"
    
    if [ ! -d "packages" ] || [ ! -d "scripts" ]; then
        error_exit "Diretório incorreto. Certifique-se de estar na pasta raiz do projeto."
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        error_exit "Diretório backend não encontrado. A estrutura do projeto parece estar alterada."
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        error_exit "Diretório frontend não encontrado. A estrutura do projeto parece estar alterada."
    fi
    
    echo -e "${GREEN}✓ Diretório do projeto verificado: ${ROOT_DIR}${NC}"
}

# Função para criar diretórios necessários
create_directories() {
    show_status 2 "Criando diretórios necessários"
    
    # Criar diretórios de logs e backups
    mkdir -p "${LOGS_DIR}"
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${BACKEND_DIR}/uploads/pdfs"
    mkdir -p "${BACKEND_DIR}/uploads/static"
    
    # Verificar se o logo existe e copiá-lo para o diretório de uploads
    if [ -f "${ROOT_DIR}/Linos.png" ]; then
        cp "${ROOT_DIR}/Linos.png" "${BACKEND_DIR}/uploads/static/logo.png"
        echo -e "${GREEN}✓ Logo copiado para diretório de uploads${NC}"
    elif [ -f "${BACKEND_DIR}/src/assets/images/logo.png" ]; then
        cp "${BACKEND_DIR}/src/assets/images/logo.png" "${BACKEND_DIR}/uploads/static/logo.png"
        echo -e "${GREEN}✓ Logo copiado de assets para diretório de uploads${NC}"
    else
        echo -e "${YELLOW}⚠️ Logo não encontrado. A geração de PDFs pode não funcionar corretamente.${NC}"
    fi
    
    echo -e "${GREEN}✓ Diretórios criados com sucesso${NC}"
}

# Função para instalar dependências do sistema
install_system_deps() {
    show_status 3 "Instalando dependências do sistema"
    
    # Tenta identificar o gerenciador de pacotes
    if command -v apt-get &> /dev/null; then
        echo -e "${BLUE}Sistema baseado em Debian/Ubuntu detectado${NC}"
        
        # Atualizar lista de pacotes
        echo -e "${BLUE}Atualizando lista de pacotes...${NC}"
        sudo apt-get update || error_exit "Falha ao atualizar lista de pacotes"
        
        # Instalar dependências necessárias
        echo -e "${BLUE}Instalando dependências essenciais...${NC}"
        sudo apt-get install -y sqlite3 build-essential curl ca-certificates gnupg || error_exit "Falha ao instalar dependências básicas"
        
        # Instalar dependências para o Puppeteer (geração de PDFs)
        echo -e "${BLUE}Instalando dependências para geração de PDFs...${NC}"
        sudo apt-get install -y libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 \
            libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 \
            libatk1.0-0 libatk-bridge2.0-0 libpangocairo-1.0-0 libgtk-3-0 || error_exit "Falha ao instalar dependências do Puppeteer"
            
    elif command -v yum &> /dev/null; then
        echo -e "${BLUE}Sistema baseado em RHEL/CentOS/Fedora detectado${NC}"
        sudo yum install -y sqlite sqlite-devel gcc-c++ make curl || error_exit "Falha ao instalar dependências"
    elif command -v brew &> /dev/null; then
        echo -e "${BLUE}Sistema macOS detectado${NC}"
        brew install sqlite || error_exit "Falha ao instalar SQLite"
    else
        error_exit "Nenhum gerenciador de pacotes compatível encontrado"
    fi
    
    echo -e "${GREEN}✓ Dependências do sistema instaladas com sucesso${NC}"
}

# Instalar Node.js e Yarn
install_node_yarn() {
    show_status 4 "Instalando Node.js e Yarn"
    
    # Verificar Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${BLUE}Node.js não encontrado. Instalando...${NC}"
        
        # Instalação do Node.js 20.x LTS
        if command -v apt-get &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || error_exit "Falha ao configurar repositório Node.js"
            sudo apt-get install -y nodejs || error_exit "Falha ao instalar Node.js"
        else
            error_exit "Instalação automática do Node.js não suportada neste sistema"
        fi
    else
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js já instalado: ${NODE_VERSION}${NC}"
    fi
    
    # Verificar Yarn
    if ! command -v yarn &> /dev/null; then
        echo -e "${BLUE}Yarn não encontrado. Instalando...${NC}"
        sudo npm install -g yarn || error_exit "Falha ao instalar Yarn"
    else
        YARN_VERSION=$(yarn --version)
        echo -e "${GREEN}✓ Yarn já instalado: ${YARN_VERSION}${NC}"
    fi
    
    echo -e "${GREEN}✓ Node.js e Yarn configurados com sucesso${NC}"
}

# Configurar backend
setup_backend() {
    show_status 5 "Configurando backend"
    
    # Navegar para o diretório backend
    cd "$BACKEND_DIR" || error_exit "Não foi possível navegar para o diretório backend"
    
    # Criar arquivo .env se não existir
    ENV_FILE=".env"
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${BLUE}Criando arquivo .env...${NC}"
        
        # Caminho para o banco de dados SQLite
        DB_PATH="./prisma/dev.db"
        
        # Criar conteúdo do .env
        cat > "$ENV_FILE" << EOL
# Configuração do banco de dados para desenvolvimento
DATABASE_URL="file:${DB_PATH}"

# Outras configurações de ambiente
NODE_ENV=development
PORT=3001

# Diretório de uploads
UPLOAD_DIR="./uploads"
EOL
        
        echo -e "${GREEN}✓ Arquivo .env criado com sucesso${NC}"
    else
        echo -e "${GREEN}✓ Arquivo .env já existe${NC}"
    fi
    
    # Instalar dependências do backend
    echo -e "${BLUE}Instalando dependências do backend...${NC}"
    yarn install || error_exit "Falha ao instalar dependências do backend"
    
    # Gerar cliente Prisma
    echo -e "${BLUE}Gerando cliente Prisma...${NC}"
    npx prisma generate || error_exit "Falha ao gerar cliente Prisma"
    
    # Aplicar migrações
    echo -e "${BLUE}Aplicando migrações do banco de dados...${NC}"
    npx prisma migrate deploy || error_exit "Falha ao aplicar migrações"
    
    # Verificar banco de dados
    DB_PATH="./prisma/dev.db"
    if [ ! -s "$DB_PATH" ]; then
        echo -e "${YELLOW}⚠️ Banco de dados vazio. Fazendo seed...${NC}"
        npx prisma db seed || error_exit "Falha ao realizar seed do banco de dados"
    else
        echo -e "${GREEN}✓ Banco de dados já existente${NC}"
    fi
    
    echo -e "${GREEN}✓ Backend configurado com sucesso${NC}"
    
    # Retornar ao diretório raiz
    cd "$ROOT_DIR" || error_exit "Não foi possível retornar ao diretório raiz"
}

# Configurar frontend
setup_frontend() {
    show_status 6 "Configurando frontend"
    
    # Navegar para o diretório frontend
    cd "$FRONTEND_DIR" || error_exit "Não foi possível navegar para o diretório frontend"
    
    # Criar arquivo .env.local se não existir
    ENV_FILE=".env.local"
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${BLUE}Criando arquivo .env.local...${NC}"
        
        # Criar conteúdo do .env.local
        cat > "$ENV_FILE" << EOL
# Configuração do frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
EOL
        
        echo -e "${GREEN}✓ Arquivo .env.local criado com sucesso${NC}"
    else
        echo -e "${GREEN}✓ Arquivo .env.local já existe${NC}"
    fi
    
    # Instalar dependências do frontend
    echo -e "${BLUE}Instalando dependências do frontend...${NC}"
    yarn install || error_exit "Falha ao instalar dependências do frontend"
    
    echo -e "${GREEN}✓ Frontend configurado com sucesso${NC}"
    
    # Retornar ao diretório raiz
    cd "$ROOT_DIR" || error_exit "Não foi possível retornar ao diretório raiz"
}

# Configurar scripts de inicialização
setup_scripts() {
    show_status 7 "Configurando scripts de inicialização"
    
    # Verificar scripts necessários
    SCRIPTS_DIR="${ROOT_DIR}/scripts/wsl"
    
    # Verificar e tornar executáveis os scripts principais
    for script in start-system.sh stop-system.sh backup-system.sh restore-system.sh status-report.sh; do
        SCRIPT_PATH="${SCRIPTS_DIR}/${script}"
        if [ -f "$SCRIPT_PATH" ]; then
            chmod +x "$SCRIPT_PATH"
            echo -e "${GREEN}✓ Script ${script} encontrado e tornado executável${NC}"
        else
            echo -e "${YELLOW}⚠️ Script ${script} não encontrado${NC}"
        fi
    done
    
    # Tornar executável o script principal WSL
    if [ -f "${ROOT_DIR}/wsl-setup.sh" ]; then
        chmod +x "${ROOT_DIR}/wsl-setup.sh"
        echo -e "${GREEN}✓ Script wsl-setup.sh tornado executável${NC}"
    else
        echo -e "${YELLOW}⚠️ Script wsl-setup.sh não encontrado${NC}"
    fi
    
    # Criar links simbólicos para scripts principais no diretório raiz
    for script in start-system.sh stop-system.sh backup-system.sh restore-system.sh; do
        TARGET="${SCRIPTS_DIR}/${script}"
        LINK="${ROOT_DIR}/${script}"
        
        if [ -f "$TARGET" ]; then
            if [ ! -f "$LINK" ]; then
                ln -s "$TARGET" "$LINK"
                echo -e "${GREEN}✓ Link criado: ${LINK}${NC}"
            else
                echo -e "${GREEN}✓ Link já existe: ${LINK}${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️ Não foi possível criar link para ${script} (arquivo alvo não existe)${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ Scripts configurados com sucesso${NC}"
}

# Verificação final e resumo
final_check() {
    show_status 8 "Verificação final do sistema"
    
    # Verificar se o backend está pronto
    if [ ! -f "${BACKEND_DIR}/node_modules/.prisma/client/index.js" ]; then
        echo -e "${YELLOW}⚠️ Cliente Prisma pode não estar configurado corretamente${NC}"
    else
        echo -e "${GREEN}✓ Cliente Prisma verificado${NC}"
    fi
    
    # Verificar se o frontend está pronto
    if [ ! -d "${FRONTEND_DIR}/node_modules/.next" ] && [ ! -d "${FRONTEND_DIR}/.next" ]; then
        echo -e "${YELLOW}⚠️ Frontend pode precisar ser construído antes do uso${NC}"
    else
        echo -e "${GREEN}✓ Frontend verificado${NC}"
    fi
    
    # Verificar se o banco de dados existe
    if [ ! -f "${BACKEND_DIR}/prisma/dev.db" ]; then
        echo -e "${YELLOW}⚠️ Banco de dados não encontrado${NC}"
    else
        echo -e "${GREEN}✓ Banco de dados verificado${NC}"
    fi
    
    # Gerar relatório de instalação
    REPORT_FILE="${LOGS_DIR}/installation-report.txt"
    echo -e "${BLUE}Gerando relatório de instalação...${NC}"
    
    mkdir -p "${LOGS_DIR}"
    
    {
        echo "=== Relatório de Instalação do Sistema Lino's Panificadora ==="
        echo "Data: $(date)"
        echo "Diretório de instalação: ${ROOT_DIR}"
        echo ""
        echo "=== Informações do Sistema ==="
        echo "Sistema operacional: $(uname -a)"
        echo "Distribuição: $(grep -E '^(ID|VERSION_ID)=' /etc/os-release 2>/dev/null | tr '\n' ' ' || echo 'Não detectado')"
        echo ""
        echo "=== Versões de Software ==="
        echo "Node.js: $(node --version 2>/dev/null || echo 'Não instalado')"
        echo "Yarn: $(yarn --version 2>/dev/null || echo 'Não instalado')"
        echo "Prisma: $(cd "${BACKEND_DIR}" && npx prisma --version 2>/dev/null || echo 'Não instalado')"
        echo "SQLite: $(sqlite3 --version 2>/dev/null || echo 'Não instalado')"
        echo ""
        echo "=== Status da Instalação ==="
        echo "Backend: $([ -d "${BACKEND_DIR}/node_modules" ] && echo 'Instalado' || echo 'Incompleto')"
        echo "Frontend: $([ -d "${FRONTEND_DIR}/node_modules" ] && echo 'Instalado' || echo 'Incompleto')"
        echo "Banco de dados: $([ -f "${BACKEND_DIR}/prisma/dev.db" ] && echo 'Criado' || echo 'Não encontrado')"
        echo "Scripts de inicialização: $([ -f "${ROOT_DIR}/start-system.sh" ] && echo 'Configurados' || echo 'Incompletos')"
        echo ""
        echo "=== Próximos Passos ==="
        echo "1. Para iniciar o sistema: ./start-system.sh"
        echo "2. Para parar o sistema: ./stop-system.sh"
        echo "3. Para fazer backup: ./backup-system.sh"
        echo "4. Para verificar status: ./scripts/wsl/status-report.sh"
        echo ""
        echo "=== Fim do Relatório ==="
    } > "${REPORT_FILE}"
    
    echo -e "${GREEN}✓ Relatório de instalação salvo em: ${REPORT_FILE}${NC}"
}

# Executar todas as etapas
check_directory
create_directories
install_system_deps
install_node_yarn
setup_backend
setup_frontend
setup_scripts
final_check

# Exibir mensagem final de sucesso
echo -e "\n${GREEN}=================================================================${NC}"
echo -e "${GREEN}       SISTEMA LINO'S PANIFICADORA INSTALADO COM SUCESSO!       ${NC}"
echo -e "${GREEN}=================================================================${NC}"
echo -e "\n${BLUE}Para iniciar o sistema:${NC} ${GREEN}./start-system.sh${NC}"
echo -e "${BLUE}Para parar o sistema:${NC} ${GREEN}./stop-system.sh${NC}"
echo -e "${BLUE}Para fazer backup:${NC} ${GREEN}./backup-system.sh${NC}"
echo -e "${BLUE}Para gerenciar o sistema:${NC} ${GREEN}./wsl-setup.sh${NC}"
echo -e "\n${BLUE}O sistema estará disponível em:${NC} ${GREEN}http://localhost:3000${NC}"
echo -e "\n${GREEN}Obrigado por instalar o Sistema Lino's Panificadora!${NC}"