#!/bin/bash
# Script principal para gerenciamento do Sistema Lino's Panificadora no WSL
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
SCRIPTS_DIR="${ROOT_DIR}/scripts/wsl"

# Verificar se está no WSL
check_wsl() {
    if grep -qi microsoft /proc/version 2>/dev/null || grep -qi docker /proc/1/cgroup 2>/dev/null; then
        return 0  # Está no WSL ou Docker
    else
        return 1  # Não está no WSL
    fi
}

# Banner
clear
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}     Sistema Lino's Panificadora no WSL     ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo -e "${BLUE}Data: $(date)${NC}\n"

# Verificar ambiente WSL
if check_wsl; then
    echo -e "${GREEN}✓ Executando em ambiente Linux compatível${NC}"
else
    echo -e "${YELLOW}⚠️ Não está executando em ambiente WSL/Docker${NC}"
    echo -e "${YELLOW}Algumas funcionalidades podem não funcionar corretamente.${NC}"
    
    read -p "Deseja continuar mesmo assim? (S/n): " CONTINUE
    if [[ $CONTINUE == "n" || $CONTINUE == "N" ]]; then
        echo -e "${YELLOW}Operação cancelada pelo usuário.${NC}"
        exit 0
    fi
fi

# Verificar scripts necessários
MISSING_SCRIPTS=0

check_script() {
    if [ ! -f "$1" ]; then
        echo -e "${RED}✗ Script não encontrado: $1${NC}"
        MISSING_SCRIPTS=$((MISSING_SCRIPTS+1))
        return 1
    else
        if [ ! -x "$1" ]; then
            chmod +x "$1"
            echo -e "${YELLOW}⚠️ Permissão de execução adicionada para: $1${NC}"
        fi
        return 0
    fi
}

echo -e "\n${BLUE}Verificando scripts necessários...${NC}"
check_script "${SCRIPTS_DIR}/install-wsl.sh"
check_script "${SCRIPTS_DIR}/test-wsl-env.sh"
check_script "${SCRIPTS_DIR}/status-report.sh"
check_script "${SCRIPTS_DIR}/start-system.sh"
check_script "${SCRIPTS_DIR}/stop-system.sh"
check_script "${SCRIPTS_DIR}/backup-system.sh"
check_script "${SCRIPTS_DIR}/restore-system.sh"
check_script "${SCRIPTS_DIR}/setup-auto-backup.sh"

if [ $MISSING_SCRIPTS -gt 0 ]; then
    echo -e "${RED}$MISSING_SCRIPTS script(s) necessário(s) não encontrado(s).${NC}"
    echo -e "${YELLOW}Por favor, verifique a instalação.${NC}"
    exit 1
fi

# Criar links simbólicos para scripts principais no diretório raiz
echo -e "\n${BLUE}Configurando links para scripts...${NC}"

# Lista de scripts para criar links
scripts_to_link=(
    "start-system.sh"
    "stop-system.sh"
    "backup-system.sh"
    "restore-system.sh"
)

# Criar links simbólicos
for script in "${scripts_to_link[@]}"; do
    target="${SCRIPTS_DIR}/${script}"
    link="${ROOT_DIR}/${script}"
    
    if [ ! -f "$link" ]; then
        ln -s "$target" "$link"
        echo -e "${GREEN}✓ Link criado: ${link}${NC}"
    fi
done

# Menu principal
while true; do
    echo -e "\n${GREEN}=============================================${NC}"
    echo -e "${GREEN}                 MENU PRINCIPAL               ${NC}"
    echo -e "${GREEN}=============================================${NC}"
    echo -e "${YELLOW}1)${NC} Iniciar sistema"
    echo -e "${YELLOW}2)${NC} Parar sistema"
    echo -e "${YELLOW}3)${NC} Verificar status do sistema"
    echo -e "${YELLOW}4)${NC} Realizar backup do sistema"
    echo -e "${YELLOW}5)${NC} Restaurar backup do sistema"
    echo -e "${YELLOW}6)${NC} Configurar backup automático"
    echo -e "${YELLOW}7)${NC} Testar ambiente"
    echo -e "${YELLOW}8)${NC} Reinstalar sistema"
    echo -e "${YELLOW}0)${NC} Sair"
    echo -e "${GREEN}=============================================${NC}"
    
    read -p "Escolha uma opção: " MENU_CHOICE
    
    case $MENU_CHOICE in
        1)
            # Iniciar sistema
            clear
            "${SCRIPTS_DIR}/start-system.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        2)
            # Parar sistema
            clear
            "${SCRIPTS_DIR}/stop-system.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        3)
            # Verificar status
            clear
            "${SCRIPTS_DIR}/status-report.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        4)
            # Realizar backup
            clear
            "${SCRIPTS_DIR}/backup-system.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        5)
            # Restaurar backup
            clear
            "${SCRIPTS_DIR}/restore-system.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        6)
            # Configurar backup automático
            clear
            "${SCRIPTS_DIR}/setup-auto-backup.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        7)
            # Testar ambiente
            clear
            "${SCRIPTS_DIR}/test-wsl-env.sh"
            read -p "Pressione Enter para continuar..."
            ;;
        8)
            # Reinstalar sistema
            clear
            echo -e "${YELLOW}Atenção: Esta operação reinstalará o sistema.${NC}"
            echo -e "${RED}Todos os dados serão mantidos, mas as configurações podem ser redefinidas.${NC}"
            read -p "Tem certeza que deseja continuar? (s/N): " CONFIRM
            
            if [[ $CONFIRM == "s" || $CONFIRM == "S" ]]; then
                # Parar o sistema antes de reinstalar
                "${SCRIPTS_DIR}/stop-system.sh" > /dev/null
                
                # Executar instalação
                clear
                "${SCRIPTS_DIR}/install-wsl.sh"
            else
                echo -e "${YELLOW}Reinstalação cancelada pelo usuário.${NC}"
            fi
            
            read -p "Pressione Enter para continuar..."
            ;;
        0)
            # Sair
            clear
            echo -e "${GREEN}=============================================${NC}"
            echo -e "${GREEN}      Obrigado por usar o Sistema Lino's      ${NC}"
            echo -e "${GREEN}=============================================${NC}"
            echo -e "${BLUE}Para iniciar o sistema:${NC} ${GREEN}./start-system.sh${NC}"
            echo -e "${BLUE}Para parar o sistema:${NC} ${GREEN}./stop-system.sh${NC}"
            echo -e "${BLUE}Para gerenciar o sistema:${NC} ${GREEN}./wsl-setup.sh${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Opção inválida. Por favor, tente novamente.${NC}"
            ;;
    esac
    
    clear
done
