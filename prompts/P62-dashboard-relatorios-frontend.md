# P62 — Dashboard Portal + Página Relatórios Portal (Frontend)

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 378 testes passando (commit `d210ab0`).

**Objetivo:** Reescrever a página dashboard do portal com dados reais (KPIs, breakdown por status, pedidos recentes) e criar página de relatórios no portal reutilizando componente `RelatorioVendas` do admin. Este prompt é 100% frontend.

**Backend pronto:**
- `GET /pedidos/dashboard` → retorna `{ resumo, porStatus, pedidosRecentes }` (P61)
- `GET /pedidos/reports/summary` + `GET /pedidos/reports/pdf` → já existem com tenant isolation

**Referência:**
- `prompts/P57-diagnostico-m4.md` Seção 2 (estado frontend), Seção 3 (E1, E4)
- Dashboard atual: `packages/frontend/src/app/(portal)/portal/dashboard/page.tsx` (welcome card com 2 links)
- Admin relatórios: `packages/frontend/src/app/(admin)/relatorios/page.tsx` (DatePicker + RelatorioVendas)

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 378 testes passando, working tree limpa.

## TAREFA 1 — Service e Hook para Dashboard

### 1.1 Adicionar método no pedidos.service.ts

Em `packages/frontend/src/services/pedidos.service.ts`:

```typescript
static async getDashboard(): Promise<DashboardResponse> {
  const response = await api.get('/pedidos/dashboard');
  return response.data;
}
```

Definir `DashboardResponse` interface (espelhar o backend):

```typescript
export interface DashboardResponse {
  resumo: {
    totalPedidos: number;
    pedidosMes: number;
    valorTotalMes: number;
    pedidosPendentes: number;
  };
  porStatus: {
    status: string;
    quantidade: number;
    percentual: number;
  }[];
  pedidosRecentes: {
    id: number;
    dataPedido: string;
    status: string;
    valorTotal: number;
    quantidadeItens: number;
  }[];
}
```

### 1.2 Hook useDashboard

Em `packages/frontend/src/hooks/usePedidos.ts` (ou criar `useDashboard.ts`):

```typescript
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => PedidosService.getDashboard(),
    staleTime: 30_000, // 30s — dados razoavelmente frescos
  });
}
```

## TAREFA 2 — Reescrever Dashboard Portal

### 2.1 Substituir conteúdo de `/portal/dashboard/page.tsx`

Reescrever a página mantendo o `PageContainer` e saudação, mas adicionando dados reais:

**Layout (de cima para baixo):**

1. **Saudação** (manter): "Olá, {nome}!" + subtítulo com data atual

2. **Cards KPI** (4 cards em Grid):
   | Card | Valor | Ícone | Cor |
   |------|-------|-------|-----|
   | Total de Pedidos | `resumo.totalPedidos` | ShoppingCart | primary |
   | Pedidos este Mês | `resumo.pedidosMes` | CalendarMonth | info |
   | Valor do Mês | `R$ resumo.valorTotalMes` (formatado) | AttachMoney | success |
   | Pendentes | `resumo.pedidosPendentes` | HourglassEmpty | warning |

   Cada card: MUI `Card` com `CardContent`, ícone à esquerda, valor grande, label abaixo.

3. **Breakdown por Status** (card com barra horizontal ou chips):
   - Usar `porStatus[]` do backend
   - Exibir cada status com `StatusChip` existente + barra de progresso (MUI `LinearProgress`) + contagem
   - Se não houver pedidos, mostrar mensagem amigável

4. **Pedidos Recentes** (card com tabela simples):
   - Tabela com colunas: #, Data, Status, Valor, Itens
   - Usar `StatusChip` para a coluna de status
   - Formatar data com `date-fns`
   - Formatar valor com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
   - Cada linha clicável → navega para `/portal/pedidos/{id}`
   - Se não houver pedidos, mostrar `EmptyState` com link para catálogo

5. **Links rápidos** (manter os cards de Catálogo e Meus Pedidos do design atual, mas mover para o final da página como "Acesso rápido")

### 2.2 Estados de loading e erro

- **Loading:** Skeleton ou CircularProgress enquanto `useDashboard()` carrega
- **Erro:** `ErrorState` com mensagem e botão retry
- **Sem dados:** Cards com zeros, tabela com EmptyState

### 2.3 Formatação de valores

Criar (ou reutilizar) helper:
```typescript
export const formatCurrency = (value: number): string =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
```

## TAREFA 3 — Página Relatórios Portal

### 3.1 Criar `/portal/relatorios/page.tsx`

Em `packages/frontend/src/app/(portal)/portal/relatorios/page.tsx`:

Reutilizar o pattern da página admin `relatorios/page.tsx`, com estas diferenças:

- **Sem filtro de cliente:** Portal já é tenant-isolated, o cliente só vê seus próprios dados. Remover o `TextField select` de cliente.
- **Manter:** DatePicker de data inicial e final, botão "Gerar Relatório", componente `RelatorioVendas`, export PDF
- **Título:** "Meus Relatórios" ao invés de "Relatório de Vendas"

Será uma versão simplificada da página admin — 2 date pickers + botão + resultado.

### 3.2 Adicionar link na navegação do portal

No layout do portal (`packages/frontend/src/app/(portal)/layout.tsx`):

Adicionar link "Relatórios" na barra de navegação horizontal, entre "Pedidos" e o logout. Usar ícone `Assessment` ou `BarChart` do MUI.

### 3.3 Permissões

Verificar se os papéis CLIENTE_ADMIN e CLIENTE_USUARIO possuem permissões `relatorios:ver` e `relatorios:exportar` no seed.

Se **não** possuem: criar uma nota no final deste prompt para resolver em prompt futuro ou ajustar o seed. **NÃO alterar o seed neste prompt** — apenas frontend.

**Alternativa:** Se a permissão não existir, a página pode usar `pedidos:listar` como guard (o cliente já tem essa permissão e o endpoint de relatório faz query sobre pedidos).

## TAREFA 4 — Dashboard Link no Portal Nav

Se o dashboard atual não tem link proeminente na nav do portal, verificar e garantir que:
- "Dashboard" é o primeiro item na nav
- "Relatórios" foi adicionado (T3.2)

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes backend (não devem quebrar — este prompt é frontend-only)
yarn workspace backend test 2>&1 | tail -5

# 2. Build frontend
yarn workspace frontend build 2>&1 | tail -10

# 3. Verificação visual (se dev server disponível)
# yarn workspace frontend dev
# Navegar para /portal/dashboard e verificar KPIs
# Navegar para /portal/relatorios e verificar filtros

# 4. Git
git add -A
git status
git commit -m "feat(portal): dashboard with real KPIs + reports page

- Rewrite portal dashboard: KPI cards, status breakdown, recent orders
- useDashboard hook with React Query (30s stale time)
- New /portal/relatorios page (reuses RelatorioVendas component)
- Add Relatórios nav link in portal layout
- formatCurrency helper, StatusChip reuse

refs: M4-F2, E1-frontend, E4"
```

## CONTAGEM ESPERADA

- Testes backend: 378 (sem alteração)
- Frontend: sem testes unitários neste prompt (zero testes frontend no projeto)
- **Meta: 378 testes passando, frontend build green**

## RESTRIÇÕES

- NÃO alterar backend — este prompt é 100% frontend
- NÃO alterar seed ou migrations
- NÃO instalar novas dependências (usar MUI e date-fns já disponíveis)
- NÃO criar testes frontend (não existe infra de testes React no projeto)
- NÃO alterar páginas admin — apenas portal
- Reutilizar componentes existentes: StatusChip, EmptyState, ErrorState, PageContainer, RelatorioVendas
