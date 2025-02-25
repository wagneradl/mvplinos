#!/bin/bash
# Script para tornar todos os scripts do sistema executáveis
# Versão: 1.0
# Data: 25/02/2025

# Diretórios
ROOT_DIR=$(pwd)
SCRIPTS_DIR="${ROOT_DIR}/scripts/wsl"

# Tornar todos os scripts na pasta scripts/wsl executáveis
chmod +x ${SCRIPTS_DIR}/*.sh

# Tornar os scripts na raiz executáveis
chmod +x ${ROOT_DIR}/*.sh

echo "Todos os scripts agora têm permissão de execução."
