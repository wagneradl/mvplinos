# P72 — Refinamento 2: Bugs E2E + Dashboard Admin KPIs + Edição Pedidos Admin

## CONTEXTO

Projeto Lino's Panificadora — Monorepo `~/Projetos/Linos/MVP7`.
Segunda rodada de testes E2E em produção. 4 bugs + 2 melhorias.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
```

---

## TAREFA 1 — Fix filtro status `pendente_aprovacao` (BLOCKER)

**Problema:** Admin não consegue ver/aprovar clientes pendentes. Frontend envia `?status=pendente_aprovacao` mas o `PageOptionsDto` valida apenas `['ativo', 'inativo']` → 400.

**Fix em** `packages/backend/src/common/dto/page-options.dto.ts`:

Mudar o `@IsIn` do campo `status`:

```typescript
// DE:
@IsIn(['ativo', 'inativo'])

// PARA:
@IsIn(['ativo', 'inativo', 'pendente_aprovacao'])
```

Atualizar também o `enum` do `@ApiPropertyOptional` correspondente.

---

## TAREFA 2 — Fix limit=200 (BLOCKER — catálogo vazio)

**Problema:** Duas páginas do portal enviam `limit=200` que excede o max 100 do backend → 400 silencioso → dados vazios. CLIENTE_USUARIO vê catálogo vazio por causa disso.

**Fix em 2 arquivos:**

1. `packages/frontend/src/app/(portal)/portal/catalogo/page.tsx` linha 87:
```typescript
// DE:
const { produtos, isLoading, meta } = useProdutos(1, 200, 'ativo', debouncedSearch);
// PARA:
const { produtos, isLoading, meta } = useProdutos(1, 100, 'ativo', debouncedSearch);
```

2. `packages/frontend/src/app/(portal)/portal/pedidos/novo/page.tsx` linha ~72:
```typescript
// DE:
const { produtos, isLoading: loadingProdutos } = useProdutos(1, 200, 'ativo', ...);
// PARA:
const { produtos, isLoading: loadingProdutos } = useProdutos(1, 100, 'ativo', ...);
```

**Verificação:** Não devem restar `limit.*200` no frontend:
```bash
grep -rn "200" packages/frontend/src/ --include="*.tsx" --include="*.ts" | grep -i "limit\|useProdutos\|listarTodos" | grep -v node_modules
```

---

## TAREFA 3 — Reescrever Dashboard Admin com KPIs reais

**Problema:** Dashboard admin usa hooks `usePedidos()`, `useClientes()`, `useProdutos()` que buscam TODOS os registros e contam no frontend. Labels incorretas ("Pedidos Hoje" mostra total geral). Lento e impreciso.

**Solução:** Reescrever `packages/frontend/src/app/(admin)/dashboard/page.tsx` para usar o endpoint `GET /pedidos/dashboard` (mesmo que o portal usa via `useDashboard()`).

### Arquitetura do novo dashboard admin:

**Dados do endpoint** (`GET /pedidos/dashboard`):
```typescript
{
  resumo: {
    totalPedidos: number;
    pedidosMes: number;
    valorTotalMes: number;
    pedidosPendentes: number;
  };
  porStatus: Array<{ status: string; quantidade: number; percentual: number }>;
  pedidosRecentes: Array<{ id; dataPedido; status; valorTotal; quantidadeItens }>;
}
```

**Dados adicionais** (manter hooks existentes mas simplificados):
- `useClientes(1, 1)` — só para pegar `meta.totalItems` (total de clientes)
- `useProdutos(1, 1)` — só para pegar `meta.totalItems` (total de produtos)

### Layout dos cards KPI (4 cards):

1. **Total de Pedidos** — `resumo.totalPedidos` (com sub-label "X pendentes")
2. **Pedidos este Mês** — `resumo.pedidosMes`
3. **Faturamento do Mês** — `resumo.valorTotalMes` formatado como moeda
4. **Clientes / Produtos** — totais de clientes ativos e produtos ativos

### Seções adicionais:

- **Status dos Pedidos** — barra de progresso por status usando `porStatus` (mesmo visual do portal)
- **Pedidos Recentes** — tabela com os 5 últimos pedidos usando `pedidosRecentes`, com link clicável para `/pedidos/{id}`
- **Ações Rápidas** — botões: Novo Pedido, Novo Produto, Ver Relatórios

### Detalhes de implementação:

- Usar o hook `useDashboard()` de `@/hooks/usePedidos` (já existe)
- Manter o import de `StatusChip` para os pedidos recentes
- Manter Skeleton loading states
- Manter tratamento de erro com retry
- Labels corretas em PT-BR
- Remover o cálculo de `estatisticas` via `useMemo` (era o approach antigo)

---

## TAREFA 4 — Edição de pedidos no admin (RASCUNHO e PENDENTE)

**Problema:** Backend suporta `PATCH /pedidos/:id` e `PATCH /pedidos/:id/itens/:itemId` para pedidos em RASCUNHO ou PENDENTE, mas o detalhe do pedido no admin (`/pedidos/[id]`) não tem UI para editar.

**Requisitos:**
- Quando o pedido estiver em RASCUNHO ou PENDENTE, exibir UI de edição
- Edição inline de quantidade de cada item (input numérico ao lado da quantidade)
- Botão "Salvar" por item que chama `PATCH /pedidos/:id/itens/:itemId`
- Usar a função `podeEditarPedido(status)` de `@/constants/status-pedido` para condicionar
- Feedback visual: Snackbar de sucesso/erro
- Quando status for pós-CONFIRMADO, manter a exibição atual (somente leitura)

**Em** `packages/frontend/src/app/(admin)/pedidos/[id]/page.tsx`:

Na seção de itens do pedido, para cada item:
- Se `podeEditarPedido(pedido.status)`:
  - Mostrar TextField type="number" com valor da quantidade (estado local)
  - Botão "Salvar" (ícone Save) que chama `PedidosService.atualizarQuantidadeItem(pedidoId, itemId, quantidade)`
  - Desabilitar enquanto salva (loading indicator)
  - Após sucesso, refetch do pedido
- Se não pode editar:
  - Exibir quantidade como texto (comportamento atual)

**Verificar se o service do frontend já tem o método:**
```bash
grep -n "atualizarQuantidade\|updateItemQuantidade" packages/frontend/src/services/pedidos.service.ts
```
Se não tiver, adicionar:
```typescript
async atualizarQuantidadeItem(pedidoId: number, itemId: number, quantidade: number) {
  return api.patch(`/pedidos/${pedidoId}/itens/${itemId}`, { quantidade });
}
```

---

## VALIDAÇÃO

```bash
cd ~/Projetos/Linos/MVP7

# Verificar que pendente_aprovacao é aceito
grep "pendente_aprovacao" packages/backend/src/common/dto/page-options.dto.ts

# Verificar que não há limit>100 no frontend
grep -rn "200" packages/frontend/src/ --include="*.tsx" --include="*.ts" | grep -i "useProdutos\|listarTodos" | grep -v node_modules
# Deve retornar VAZIO

# Verificar que dashboard usa useDashboard
grep "useDashboard" "packages/frontend/src/app/(admin)/dashboard/page.tsx"

# Verificar que edição existe no admin detalhe pedido
grep "podeEditarPedido\|atualizarQuantidade" "packages/frontend/src/app/(admin)/pedidos/[id]/page.tsx"

# Builds e testes
yarn workspace backend build 2>&1 | tail -5
yarn workspace frontend build 2>&1 | tail -5
yarn workspace backend test --no-coverage 2>&1 | tail -5

git add -A
git status
git commit -m "feat: admin dashboard KPIs + edit pedidos + fix clientes filter

- Rewrite admin dashboard with real KPIs from /pedidos/dashboard endpoint
- Add inline quantity editing for pedidos in RASCUNHO/PENDENTE (admin)
- Add pendente_aprovacao to PageOptionsDto status validation
- Fix limit=200 in portal catalog and novo pedido pages

fixes: clientes filter 400, empty catalog, wrong dashboard data"
```

## RESTRIÇÕES

- NÃO alterar lógica de backend (transições, permissões, guards) exceto o PageOptionsDto
- NÃO fazer git push
- Manter 396+ testes passando
- Se a T3 (dashboard rewrite) ficar muito grande, pode simplificar mantendo a estrutura visual mas trocando os dados para o endpoint real
