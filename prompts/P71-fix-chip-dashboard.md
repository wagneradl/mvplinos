# P71 — Fix REAL do Chip import (admin dashboard)

## PROBLEMA

`packages/frontend/src/app/(admin)/dashboard/page.tsx` usa `<Chip` nas linhas 213, 263, 313 mas NÃO importa `Chip` do `@mui/material`.

Linha 7 atual:
```typescript
import { Box, Grid, Paper, Typography, CircularProgress, Button, Alert } from '@mui/material';
```

Falta `Chip` nesta linha.

## FIX

Em `packages/frontend/src/app/(admin)/dashboard/page.tsx`, linha 7, adicionar `Chip`:

```typescript
import { Box, Grid, Paper, Typography, CircularProgress, Button, Alert, Chip } from '@mui/material';
```

## VERIFICAÇÃO EXAUSTIVA

Antes de commitar, executar esta verificação que pega `<Chip` seguido de espaço OU newline:

```bash
cd ~/Projetos/Linos/MVP7
for f in $(grep -rn "<Chip" packages/frontend/src/ --include="*.tsx" -l | grep -v node_modules); do
  USES=$(grep -c "<Chip" "$f")
  # Verificar se Chip (não StatusChip) está importado do @mui/material
  HAS=$(grep "@mui/material" "$f" | grep -cw "Chip")
  if [ "$USES" -gt 0 ] && [ "$HAS" -eq 0 ]; then
    # Verificar se não é só StatusChip
    REAL_USES=$(grep "<Chip" "$f" | grep -cv "StatusChip")
    if [ "$REAL_USES" -gt 0 ]; then
      echo "❌ MISSING: $f (uses Chip $REAL_USES times, no import)"
    fi
  fi
done
```

Se encontrar OUTROS arquivos com import faltando, corrigir também.

## VALIDAÇÃO

```bash
yarn workspace frontend build 2>&1 | tail -5

git add -A
git commit -m "fix(frontend): add missing Chip import in admin dashboard

- Dashboard page uses Chip component on 3 lines without importing it
- Causes 'Chip is not defined' ReferenceError in production

fixes: dashboard crash on load"
```

## RESTRIÇÕES

- NÃO alterar lógica
- NÃO fazer git push
