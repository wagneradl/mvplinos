#!/bin/bash

# Cores para melhor visualização
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Script para resetar o banco de dados do Lino's Panificadora ===${NC}"
echo -e "${BLUE}Este script irá manter apenas os usuários admin e operador${NC}"
echo ""

# Configurações
API_URL="https://linos-backend.onrender.com"
ADMIN_EMAIL="admin@linos.com"
ADMIN_PASSWORD="admin123" # Substitua pela senha correta se necessário

echo -e "${BLUE}1. Obtendo token JWT para o usuário administrador...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"senha\":\"$ADMIN_PASSWORD\"}")

# Verificar se o login foi bem-sucedido
if [[ $LOGIN_RESPONSE == *"token"* ]]; then
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  echo -e "${GREEN}Login realizado com sucesso!${NC}"
else
  echo -e "${RED}Falha ao fazer login. Resposta:${NC}"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo ""
echo -e "${BLUE}2. Resetando o banco de dados...${NC}"
RESET_RESPONSE=$(curl -s -X POST "$API_URL/admin/reset-database" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Verificar se o reset foi bem-sucedido
if [[ $RESET_RESPONSE == *"sucesso"* ]]; then
  echo -e "${GREEN}Banco de dados resetado com sucesso!${NC}"
  echo -e "${GREEN}Resposta: $RESET_RESPONSE${NC}"
else
  echo -e "${RED}Falha ao resetar o banco de dados. Resposta:${NC}"
  echo $RESET_RESPONSE
fi

echo ""
echo -e "${BLUE}Processo concluído.${NC}"
