# P69 — Fix Missing Chip Imports + Remover "Sistema de Gestão"

## PROBLEMA 1 — Chip não importado

Runtime error em produção: `Uncaught ReferenceError: Chip is not defined`

6 arquivos usam `<Chip>` do MUI sem importar:

1. `packages/frontend/src/app/(portal)/portal/usuarios/page.tsx`
2. `packages/frontend/src/app/(portal)/portal/catalogo/page.tsx`
3. `packages/frontend/src/app/(admin)/usuarios/papeis/page.tsx`
4. `packages/frontend/src/app/(admin)/usuarios/page.tsx`
5. `packages/frontend/src/app/(admin)/clientes/page.tsx`
6. `packages/frontend/src/app/(admin)/produtos/page.tsx`

### FIX

Em cada arquivo, verificar a linha de import do `@mui/material` e adicionar `Chip` à lista de imports. Ex:

```typescript
// DE:
import { Box, Typography, Button } from '@mui/material';

// PARA:
import { Box, Typography, Button, Chip } from '@mui/material';
```

**Atenção:** Cada arquivo já tem um import de `@mui/material` — apenas adicionar `Chip` ao destructuring existente. NÃO duplicar a linha de import.

## PROBLEMA 2 — Remover "Sistema de Gestão"

Na tela de login, remover o texto "Sistema de Gestão" que aparece abaixo do logo/título. O arquivo provavelmente é:
- `packages/frontend/src/app/login/page.tsx` ou
- `packages/frontend/src/components/LoginForm.tsx`

Localizar o texto "Sistema de Gestão" e removê-lo. Manter o restante do layout intacto.

## VALIDAÇÃO

```bash
cd ~/Projetos/Linos/MVP7
# Verificar que NENHUM arquivo usa <Chip sem importar
for f in $(grep -rn "<Chip" packages/frontend/src/ --include="*.tsx" -l); do
  grep -q "import.*Chip" "$f" || echo "MISSING: $f"
done
# Deve retornar vazio

# Verificar que "Sistema de Gestão" não aparece mais
grep -rn "Sistema de Gestão" packages/frontend/src/ --include="*.tsx"
# Deve retornar vazio

yarn workspace frontend build 2>&1 | tail -5
yarn workspace backend test --no-coverage 2>&1 | tail -5

git add -A
git commit -m "fix(frontend): add missing Chip imports + remove 'Sistema de Gestão'

- Add Chip to MUI imports in 6 files (runtime ReferenceError)
- Remove 'Sistema de Gestão' subtitle from login page

fixes: client-side crash on page load"
```

## RESTRIÇÕES

- NÃO alterar lógica ou layout
- NÃO alterar backend
- NÃO fazer git push
