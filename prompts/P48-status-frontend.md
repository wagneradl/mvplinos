# P48 — Frontend: Chips de Status, Botões de Transição, Filtros e Timeline

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. P47 concluído (7 estados, mapa transições, 281 testes).

**Objetivo:** Atualizar toda a UI de pedidos para refletir os 7 status, com chips coloridos, botões de transição contextuais, filtros por status e timeline visual de progresso.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 281 testes passando e working tree limpa.

## TAREFA 1 — Constantes de Status no Frontend

Criar `packages/frontend/src/constants/status-pedido.ts`:

```typescript
// Espelhar os status do backend — importar ou duplicar
// Preferir duplicar para evitar dependência cross-package em monorepo

export const STATUS_PEDIDO = {
  RASCUNHO: 'RASCUNHO',
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  EM_PRODUCAO: 'EM_PRODUCAO',
  PRONTO: 'PRONTO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
} as const;

export type StatusPedido = typeof STATUS_PEDIDO[keyof typeof STATUS_PEDIDO];

// Cores para cada status (Tailwind classes)
export const STATUS_CONFIG: Record<StatusPedido, {
  label: string;
  color: string;        // bg + text classes
  icon?: string;         // emoji ou lucide icon name
}> = {
  RASCUNHO:    { label: 'Rascunho',     color: 'bg-gray-100 text-gray-700' },
  PENDENTE:    { label: 'Pendente',      color: 'bg-yellow-100 text-yellow-800' },
  CONFIRMADO:  { label: 'Confirmado',    color: 'bg-blue-100 text-blue-800' },
  EM_PRODUCAO: { label: 'Em Produção',   color: 'bg-orange-100 text-orange-800' },
  PRONTO:      { label: 'Pronto',        color: 'bg-green-100 text-green-800' },
  ENTREGUE:    { label: 'Entregue',      color: 'bg-emerald-100 text-emerald-800' },
  CANCELADO:   { label: 'Cancelado',     color: 'bg-red-100 text-red-700' },
};

// Espelhar as transições do backend para o frontend
// Usado para renderizar botões de ação condicionalmente
export const TRANSICOES_VALIDAS: Record<string, string[]> = {
  RASCUNHO:     ['PENDENTE', 'CANCELADO'],
  PENDENTE:     ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO:   ['EM_PRODUCAO', 'CANCELADO'],
  EM_PRODUCAO:  ['PRONTO', 'CANCELADO'],
  PRONTO:       ['ENTREGUE'],
  ENTREGUE:     [],
  CANCELADO:    [],
};
```

**ATENÇÃO:** Verificar os nomes exatos dos status no backend (P47) e espelhar aqui. Se o backend usa nomes levemente diferentes, usar os do backend.

## TAREFA 2 — Componente StatusChip

Criar `packages/frontend/src/components/StatusChip.tsx`:

```tsx
// Chip colorido reutilizável que exibe o status do pedido
// Props: status (string) — ex: 'PENDENTE'
// Renderiza: <span class="px-2 py-1 rounded-full text-sm font-medium {color}">{label}</span>
// Usar STATUS_CONFIG para cor e label
// Fallback gracioso se status desconhecido
```

**Se já existir** um componente similar para status, refatorar para usar STATUS_CONFIG.

## TAREFA 3 — Componente TransitionButtons

Criar `packages/frontend/src/components/TransitionButtons.tsx`:

```tsx
// Renderiza botões de ação baseados no status atual e no papel do usuário
// Props: statusAtual, papelTipo, onTransition(novoStatus), loading?
//
// Para INTERNO:
//   PENDENTE → botões [Confirmar] [Cancelar]
//   CONFIRMADO → botões [Iniciar Produção] [Cancelar]
//   EM_PRODUCAO → botões [Marcar Pronto] [Cancelar]
//   PRONTO → botão [Registrar Entrega]
//
// Para CLIENTE:
//   RASCUNHO → botões [Enviar Pedido] [Descartar]
//   PENDENTE → botão [Cancelar]
//
// Estados finais (ENTREGUE, CANCELADO) → nenhum botão
//
// Botão Cancelar sempre em vermelho/outline
// Botões positivos em cores correspondentes ao próximo status
// Confirmar ações destrutivas (cancelar) com dialog/confirm
```

**Labels sugeridos para os botões:**
- RASCUNHO → PENDENTE: "Enviar Pedido" (azul/primário)
- PENDENTE → CONFIRMADO: "Confirmar Pedido" (azul)
- CONFIRMADO → EM_PRODUCAO: "Iniciar Produção" (laranja)
- EM_PRODUCAO → PRONTO: "Marcar Pronto" (verde)
- PRONTO → ENTREGUE: "Registrar Entrega" (verde escuro)
- Qualquer → CANCELADO: "Cancelar" (vermelho/outline)

## TAREFA 4 — Atualizar Listagem de Pedidos

Modificar a página de listagem de pedidos em `(admin)/pedidos/page.tsx`:

### 4a — Chips de status
- Substituir texto plano/badges antigos pelo componente `StatusChip`
- Cada linha da tabela mostra o chip colorido

### 4b — Filtro por status
- Adicionar barra de filtros acima da tabela
- Opções: "Todos" + cada status como botão/chip clicável
- Filtro pode ser client-side (filter array) ou query param
- Múltipla seleção: poder ver "PENDENTE + CONFIRMADO" ao mesmo tempo

### 4c — Contadores por status (opcional se simples)
- Badges com contagem ao lado de cada filtro: "Pendente (3)" "Em Produção (2)"
- Se complexo, pular — não é crítico

## TAREFA 5 — Atualizar Detalhe do Pedido

Modificar a página de detalhe `(admin)/pedidos/[id]/page.tsx`:

### 5a — StatusChip no header
- Status atual em destaque com chip grande

### 5b — TransitionButtons
- Abaixo do header, renderizar botões de transição
- Chamar `PATCH /pedidos/:id/status` com o novo status
- Loading state durante a chamada
- Refresh dos dados após sucesso
- Toast/feedback de sucesso/erro

### 5c — Timeline de progresso (visual)
- Barra horizontal ou vertical mostrando a progressão:
```
RASCUNHO → PENDENTE → CONFIRMADO → EM_PRODUCAO → PRONTO → ENTREGUE
  [✓]       [✓]        [●]          [ ]          [ ]       [ ]
```
- Estados completados: check verde
- Estado atual: destacado (pulsante ou borda)
- Estados futuros: cinza
- Se CANCELADO: mostrar ícone X vermelho no ponto onde foi cancelado
- Componente reutilizável `StatusTimeline.tsx`

## TAREFA 6 — Service/Hook de Transição

Criar ou atualizar o service de pedidos no frontend:

```typescript
// Em packages/frontend/src/services/pedidos.service.ts (ou similar)
async function atualizarStatus(pedidoId: number, novoStatus: string): Promise<Pedido> {
  const response = await api.patch(`/pedidos/${pedidoId}/status`, { status: novoStatus });
  return response.data;
}
```

Se existir um hook `usePedidos` ou similar, adicionar a mutation de status com invalidação de cache (React Query/SWR).

## TAREFA 7 — Validação

### Build frontend
```bash
yarn workspace frontend build
```
Target: build sem erros

### Backend (não deve ser afetado)
```bash
yarn workspace backend test
```
Target: 281 testes passando (inalterado)

### Verificação visual (manual com dev server)
- Listagem de pedidos mostra chips coloridos
- Filtros de status funcionam
- Detalhe mostra timeline + botões de transição
- Clicar botão de transição atualiza o status
- Botão cancelar pede confirmação

## CRITÉRIOS DE SUCESSO

- [ ] StatusChip componente criado e usado em listagem + detalhe
- [ ] 7 status com cores distintas e legíveis
- [ ] TransitionButtons renderiza ações corretas por status e papel
- [ ] Filtro por status na listagem funcionando
- [ ] Timeline visual de progresso no detalhe
- [ ] PATCH /pedidos/:id/status integrado com loading + feedback
- [ ] Confirmação para ações destrutivas (cancelar)
- [ ] Backend: 281 testes passando (inalterado)
- [ ] Frontend: build sem erros
- [ ] Componentes reutilizáveis e limpos

## NOTAS IMPORTANTES

- **Não modificar backend.** Apenas frontend.
- **Verificar nomes de status** no backend P47 e espelhar exatamente.
- **Reutilizar design system** existente (Tailwind classes, padrões de botão, etc.).
- **StatusTimeline deve ser reutilizável** — será usado no portal do cliente (P55).
- **TransitionButtons depende do papelTipo** do usuário autenticado — obter do AuthContext.
- **Se a listagem atual não tiver coluna de status**, adicionar.
- **Commitar ao final** com: `feat(m3): UI status pedidos — chips, transições, filtros, timeline`
