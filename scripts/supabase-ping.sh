#!/bin/bash

echo "[supabase-ping] Iniciando keep-alive loop infinito para Supabase..."

while true; do
  echo "[supabase-ping] Rodando keep-alive para Supabase..."
  curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_TOKEN" \
    "$SUPABASE_URL/storage/v1/object/list/$SUPABASE_BUCKET?prefix="

  sleep 60
done