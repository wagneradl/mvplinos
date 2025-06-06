#!/bin/bash

echo "[supabase-ping] Rodando keep-alive para Supabase..."

curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  "https://vuxmjtpfbcpvncmabnhe.supabase.co/storage/v1/object/list/pedidos-pdfs"