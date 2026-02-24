# P61 — Dashboard do Cliente: Endpoint Backend

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 363 testes passando (commit `6c5bd32`).

**Objetivo:** Criar endpoint dedicado `GET /pedidos/dashboard` que retorna dados agregados para o dashboard do portal do cliente. Decisão D1: endpoint separado de `/reports/summary` pois as queries e estrutura são distintas.

**Referência:** `prompts/P57-diagnostico-m4.md` Seção 3 (E1).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 363 testes passando, working tree limpa.

## TAREFA 1 — Endpoint GET /pedidos/dashboard

### 1.1 Response DTO

Criar DTO para o retorno do dashboard:

```typescript
interface DashboardResponse {
  resumo: {
    totalPedidos: number;
    pedidosMes: number;       // mês corrente
    valorTotalMes: number;    // valor total em R$ do mês corrente
    pedidosPendentes: number; // RASCUNHO + PENDENTE (ação necessária)
  };
  porStatus: {
    status: string;
    quantidade: number;
    percentual: number; // 0-100
  }[];
  pedidosRecentes: {
    id: number;
    dataPedido: string;
    status: string;
    valorTotal: number;
    quantidadeItens: number;
  }[];  // últimos 5 pedidos
}
```

### 1.2 Método no PedidosService

Criar `getDashboard(clienteId?: number)` em `pedidos.service.ts`:

**Query 1 — Resumo:**
- `totalPedidos`: count de pedidos (com tenant filter se clienteId)
- `pedidosMes`: count de pedidos com `data_pedido` no mês corrente
- `valorTotalMes`: sum de `valor_total` com `data_pedido` no mês corrente
- `pedidosPendentes`: count onde status IN ('RASCUNHO', 'PENDENTE')

**Query 2 — Por status:**
- GroupBy `status`, count cada grupo
- Calcular percentual sobre o total
- Ordenar pela sequência lógica do fluxo (RASCUNHO → PENDENTE → ... → CANCELADO)

**Query 3 — Pedidos recentes:**
- Últimos 5 pedidos ordenados por `data_pedido` DESC
- Incluir count de itens (via `_count: { itens: true }` ou similar no Prisma)

**Tenant isolation:** Usar o mesmo pattern dos outros métodos — se `clienteId` presente no request (injetado pelo TenantGuard), filtrar por ele. Admin (sem clienteId) vê dados de todos os clientes.

**Excluir soft-deleted:** Filtrar `deleted_at: null` em todas as queries.

### 1.3 Rota no PedidosController

Em `pedidos.controller.ts`:

```typescript
@Get('dashboard')
@UseGuards(JwtAuthGuard, PermissoesGuard)
@Permissoes('pedidos', 'listar') // reutilizar permissão existente
async getDashboard(@Req() req) {
  return this.pedidosService.getDashboard(req.clienteId);
}
```

**IMPORTANTE:** A rota `dashboard` deve vir ANTES de `:id` no controller para não conflitar com o param parser. Verificar a ordem das rotas.

## TAREFA 2 — Testes

### 2.1 Testes do PedidosService.getDashboard()

Em `pedidos.service.spec.ts` (ou criar `pedidos.dashboard.spec.ts` se o arquivo estiver grande):

**Setup:** Mock do Prisma com dados de teste — criar cenário com pedidos em vários status e datas.

**Testes:**
1. Retorna estrutura correta (`resumo`, `porStatus`, `pedidosRecentes`)
2. `resumo.totalPedidos` conta apenas pedidos não-deletados
3. `resumo.pedidosMes` conta apenas pedidos do mês corrente
4. `resumo.valorTotalMes` soma valores do mês corrente
5. `resumo.pedidosPendentes` conta RASCUNHO + PENDENTE
6. `porStatus` agrupa corretamente e percentuais somam ~100%
7. `pedidosRecentes` retorna máximo 5, ordenados por data DESC
8. `pedidosRecentes` inclui `quantidadeItens`
9. Com `clienteId`: filtra apenas pedidos do cliente (tenant isolation)
10. Sem `clienteId` (admin): retorna todos os pedidos
11. Sem pedidos: retorna zeros e arrays vazios (não erro)

### 2.2 Teste do controller

Em `pedidos.controller.spec.ts`:

- Teste: `GET /pedidos/dashboard` delega para `service.getDashboard(clienteId)`

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes
yarn workspace backend test 2>&1 | tail -10

# 2. Build
yarn workspace backend build 2>&1 | tail -5

# 3. Teste manual rápido (opcional — se dev server disponível)
# curl http://localhost:3000/pedidos/dashboard -H "Authorization: Bearer $TOKEN"

# 4. Git
git add -A
git status
git commit -m "feat(pedidos): add GET /pedidos/dashboard endpoint

- Dashboard aggregation: totals, monthly KPIs, status breakdown, recent orders
- Tenant-isolated: clients see own data, admin sees all
- Separate from /reports/summary (different query shape)
- Reuses pedidos:listar permission

Decision D1: dedicated dashboard endpoint
refs: M4-F2, E1-backend"
```

## CONTAGEM ESPERADA

- Testes anteriores: 363
- Novos testes estimados: ~12-14
- **Meta: 375+ testes passando**

## RESTRIÇÕES

- NÃO alterar endpoints existentes (`/reports/summary`, `/reports/pdf`)
- NÃO criar nova migration — usar queries sobre schema existente
- NÃO incluir lógica de cache (premature optimization para o volume atual)
- NÃO implementar frontend neste prompt (será P62)
