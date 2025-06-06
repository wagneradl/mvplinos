#!/bin/bash

echo "[supabase-ping] Iniciando keep-alive loop infinito para Supabase..."

while true; do
  echo "[supabase-ping] Rodando keep-alive para Supabase..."

  curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST \
    -d '{"prefix": ""}' \
    "$SUPABASE_URL/storage/v1/object/list/$SUPABASE_BUCKET"

  sleep 60  # 6 horas (ajuste pra 60 se quiser testar)
done