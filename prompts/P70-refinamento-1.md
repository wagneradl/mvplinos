# P70 — Refinamento 1: Fix Blockers de Produção

## CONTEXTO

Projeto Lino's Panificadora — Monorepo `~/Projetos/Linos/MVP7`.
Testes E2E em produção revelaram 3 blockers + 1 bug secundário.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
```

Verificar se P69 já foi executado:
```bash
grep "Chip" packages/frontend/src/app/\(admin\)/dashboard/page.tsx | head -3
```
Se Chip JÁ está importado, pular Tarefa 1.

---

## TAREFA 1 — Fix Chip imports (se P69 não executado)

**Problema:** `Uncaught ReferenceError: Chip is not defined` — crash em múltiplas páginas.

6 arquivos usam `<Chip>` do MUI sem importar. Em CADA arquivo, adicionar `Chip` à linha de import existente do `@mui/material`:

1. `packages/frontend/src/app/(portal)/portal/usuarios/page.tsx`
2. `packages/frontend/src/app/(portal)/portal/catalogo/page.tsx`
3. `packages/frontend/src/app/(admin)/usuarios/papeis/page.tsx`
4. `packages/frontend/src/app/(admin)/usuarios/page.tsx`
5. `packages/frontend/src/app/(admin)/clientes/page.tsx`
6. `packages/frontend/src/app/(admin)/produtos/page.tsx`

Também remover o texto "Sistema de Gestão" da tela de login (buscar em `packages/frontend/src/`).

Validação:
```bash
# Nenhum arquivo com <Chip sem import
for f in $(grep -rn "<Chip" packages/frontend/src/ --include="*.tsx" -l); do
  grep -q "import.*Chip" "$f" || echo "MISSING: $f"
done
```

---

## TAREFA 2 — Fix Throttler 429 em todas as rotas

**Problema:** Todas as rotas retornam 429 após poucos requests. O ThrottlerModule global tem APENAS throttlers nomeados (`login`: 5/60s, `reset`: 3/60s) sem um `default`. Como resultado, TODAS as rotas ficam limitadas a 3 req/min.

### 2.1 — Adicionar throttler `default` no app.module.ts

Em `packages/backend/src/app.module.ts`, no array `throttlers` dentro do `ThrottlerModule.forRootAsync`, adicionar um throttler `default` ANTES dos nomeados:

```typescript
throttlers: [
  {
    name: 'default',
    ttl: 60 * 1000,
    limit: config.get<number>('THROTTLE_DEFAULT_LIMIT', 100),
  },
  {
    name: 'login',
    ttl: config.get<number>('THROTTLE_LOGIN_TTL', 60) * 1000,
    limit: config.get<number>('THROTTLE_LOGIN_LIMIT', 5),
  },
  {
    name: 'reset',
    ttl: config.get<number>('THROTTLE_RESET_TTL', 60) * 1000,
    limit: config.get<number>('THROTTLE_RESET_LIMIT', 3),
  },
],
```

### 2.2 — Atualizar TODOS os @SkipThrottle() para especificar nomes

Todos os controllers que NÃO são de auth precisam skipar os throttlers `login` e `reset` (mas permitir o `default`).

Mudar `@SkipThrottle()` para `@SkipThrottle({ login: true, reset: true })` em:

- `packages/backend/src/admin/admin.controller.ts`
- `packages/backend/src/clientes/clientes.controller.ts`
- `packages/backend/src/pedidos/pedidos.controller.ts`
- `packages/backend/src/produtos/produtos.controller.ts`
- `packages/backend/src/usuarios/usuarios.controller.ts`

**NÃO alterar** `health.controller.ts` (já está correto).

**NÃO alterar** `auth.controller.ts` — os endpoints de auth DEVEM ser limitados pelos throttlers `login` e `reset`. Verificar que os `@SkipThrottle()` dentro do auth controller (em endpoints como `/me`, `/refresh`) também sejam atualizados para `@SkipThrottle({ login: true, reset: true })`.

### 2.3 — Atualizar testes se necessário

Se algum teste verifica metadados de throttle (como o teste do health controller fez), atualizar para refletir os novos nomes.

---

## TAREFA 3 — Fix limit=200 no UsuarioForm

**Problema:** `packages/frontend/src/components/UsuarioForm.tsx` linha 120 chama `listarTodosClientes(200, 'ativo')`. Backend valida max 100 → retorna 400.

**Fix:** Mudar de `200` para `100`:

```typescript
// DE:
queryFn: () => ClientesService.listarTodosClientes(200, 'ativo'),
// PARA:
queryFn: () => ClientesService.listarTodosClientes(100, 'ativo'),
```

---

## TAREFA 4 — Fix PDF Relatório 400 em modo mock

**Problema:** `GET /pedidos/reports/pdf?data_inicio=2025-05-01&data_fim=2025-05-30` retorna 400 com `PDF_MOCK=true`.

**Diagnóstico:** O `PdfService.generateReportPdf()` em modo mock cria um arquivo em `relatorios/relatorio-geral-mock.pdf` com path relativo. O `PedidosService` converte para path absoluto com `join(process.cwd(), pdfResult)`. O controller faz `res.sendFile()`.

Investigar por que o 400 ocorre:
1. Verificar se `generateReport(reportDto)` falha ANTES de chegar ao PDF mock (ex: validação de datas, dados vazios)
2. Se o problema é no `generateReport`, garantir que retorne dados válidos mesmo com banco vazio para o período
3. Se o problema é no sendFile, verificar se o path do mock é resolvido corretamente

**Fix provável:** O `generateReport` pode estar falhando com datas que não retornam resultados, ou a data string está em formato inesperado. Verificar a validação e garantir que o fluxo funcione end-to-end em mock.

Se o problema for muito complexo de resolver agora, como alternativa mínima: no frontend, quando `PDF_MOCK=true` (pode checar via env), desabilitar o botão de export PDF com tooltip "PDF indisponível em modo teste". MAS preferir o fix real se possível.

---

## VALIDAÇÃO

```bash
cd ~/Projetos/Linos/MVP7

# Chip imports
for f in $(grep -rn "<Chip" packages/frontend/src/ --include="*.tsx" -l); do
  grep -q "import.*Chip" "$f" || echo "MISSING CHIP: $f"
done

# Throttler: verificar que nenhum controller tem @SkipThrottle() sem args (exceto se intencionado)
grep -rn "@SkipThrottle()" packages/backend/src/ --include="*.ts" | grep -v ".spec." | grep -v "dist/"
# Deve retornar VAZIO (todos devem ter argumentos nomeados)

# limit=200 não existe mais
grep -rn "limit.*200\|200.*limit" packages/frontend/src/ --include="*.tsx" --include="*.ts"
# Deve retornar VAZIO

# Builds e testes
yarn workspace backend build 2>&1 | tail -5
yarn workspace frontend build 2>&1 | tail -5
yarn workspace backend test --no-coverage 2>&1 | tail -5

git add -A
git status
git commit -m "fix: resolve production blockers from E2E testing

- Add missing Chip imports in 6 frontend files (ReferenceError crash)
- Remove 'Sistema de Gestão' from login page
- Add default throttler (100/min) + skip named throttlers on non-auth routes
- Fix limit=200 in UsuarioForm (backend max is 100)
- Fix PDF report mock mode returning 400

fixes: Chip crash, 429 rate limiting, clientes 400, PDF mock"
```

## RESTRIÇÕES

- NÃO alterar lógica de negócio (status, transições, permissões)
- NÃO fazer git push
- Manter 396+ testes passando
- Se Tarefa 4 (PDF) for muito complexa, documentar o problema e avançar com as demais
