# P59 — Bloqueio de Edição Pós-CONFIRMADO

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. 340 testes passando (commit `f93d491`).

**Objetivo:** Impedir edição de pedidos após status CONFIRMADO. Decisão de design D4: bloqueio total — nenhuma alteração de itens, quantidades ou observações após a padaria confirmar o pedido. Apenas transições de status continuam permitidas (gerenciadas pelo mapa de transições existente).

**Referência:** `prompts/P57-diagnostico-m4.md` Seção 3 (E5), Seção 1.7 (estado atual bloqueio).

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Confirmar: 340 testes passando, working tree limpa.

## TAREFA 1 — Backend: Expandir Bloqueio de Edição

### 1.1 Criar constante de estados bloqueados para edição

Em `packages/backend/src/pedidos/constants/transicoes-pedido.ts` (ou arquivo de constantes adequado):

```typescript
export const ESTADOS_BLOQUEIO_EDICAO: StatusPedido[] = [
  'CONFIRMADO',
  'EM_PRODUCAO',
  'PRONTO',
  'ENTREGUE',
  'CANCELADO',
];
```

Ou seja: somente RASCUNHO e PENDENTE permitem edição de conteúdo.

### 1.2 Atualizar validações no PedidosService

Em `packages/backend/src/pedidos/pedidos.service.ts`:

**Método `update()`:**
- Substituir a verificação atual de `ESTADOS_FINAIS` por `ESTADOS_BLOQUEIO_EDICAO`
- Mensagem de erro: `'Pedido não pode ser editado após confirmação'`

**Método `updateItemQuantidade()`:**
- Mesma substituição: verificar `ESTADOS_BLOQUEIO_EDICAO` ao invés de `ESTADOS_FINAIS`
- Mesma mensagem de erro

**NÃO alterar:**
- `atualizarStatus()` — transições de status continuam regidas pelo mapa de transições
- `softDelete()` — cancelamento continua regido pelo mapa de transições
- `repeat()` — repetir pedido cria um NOVO pedido, não edita o existente

### 1.3 Criar helper de verificação (opcional)

Se fizer sentido para DRY, criar método privado:

```typescript
private verificarPermissaoEdicao(pedido: Pedido): void {
  if (ESTADOS_BLOQUEIO_EDICAO.includes(pedido.status as StatusPedido)) {
    throw new BadRequestException('Pedido não pode ser editado após confirmação');
  }
}
```

## TAREFA 2 — Frontend: Desabilitar Edição no Portal

### 2.1 Página de detalhe do pedido (`/portal/pedidos/[id]`)

Verificar quais ações de edição existem nesta página e desabilitá-las quando `status` não for RASCUNHO ou PENDENTE:

- Botão de editar quantidade de itens → desabilitado ou oculto
- Botão/link de editar observações → desabilitado ou oculto
- Botão "Repetir Pedido" → manter **habilitado** (cria novo pedido, não edita)
- Botões de transição de status → manter como estão (já controlados por `TransitionButtons`)
- Botão cancelar → manter como está (já controlado pelo mapa de transições)

### 2.2 Página de listagem de pedidos (`/portal/pedidos`)

Se houver ação de edição inline na listagem, aplicar mesma lógica.

### 2.3 Área admin — mesma regra

Verificar se páginas admin de pedidos (`/(admin)/pedidos/[id]`) também possuem ações de edição de conteúdo. Se sim, aplicar mesma lógica: bloquear edição de conteúdo pós-CONFIRMADO. Admin ainda pode transicionar status normalmente.

### 2.4 Helper frontend (sugestão)

Criar ou adicionar em utils existente:

```typescript
export const podeEditarPedido = (status: string): boolean => {
  return ['RASCUNHO', 'PENDENTE'].includes(status);
};
```

Usar este helper ao invés de hardcodar a lista em cada componente.

## TAREFA 3 — Testes

### 3.1 Testes backend — Bloqueio de edição expandido

Em `packages/backend/src/pedidos/pedidos.service.spec.ts` (ou arquivo de teste adequado):

**Testes para `update()`:**
- Teste: pedido RASCUNHO → edição permitida (já deve existir)
- Teste: pedido PENDENTE → edição permitida
- Teste: pedido CONFIRMADO → `BadRequestException('Pedido não pode ser editado após confirmação')`
- Teste: pedido EM_PRODUCAO → `BadRequestException`
- Teste: pedido PRONTO → `BadRequestException`
- Teste: pedido ENTREGUE → `BadRequestException` (já deve existir para ESTADOS_FINAIS)
- Teste: pedido CANCELADO → `BadRequestException` (já deve existir para ESTADOS_FINAIS)

**Testes para `updateItemQuantidade()`:**
- Teste: item de pedido CONFIRMADO → `BadRequestException`
- Teste: item de pedido EM_PRODUCAO → `BadRequestException`

**Nota:** Alguns destes testes já devem existir para ESTADOS_FINAIS. Ajustar os existentes se necessário e adicionar os novos (CONFIRMADO, EM_PRODUCAO, PRONTO).

### 3.2 Teste da constante

Em `packages/backend/src/pedidos/constants/transicoes-pedido.spec.ts`:

- Teste: `ESTADOS_BLOQUEIO_EDICAO` contém exatamente ['CONFIRMADO', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO']
- Teste: RASCUNHO e PENDENTE NÃO estão em `ESTADOS_BLOQUEIO_EDICAO`

## VALIDAÇÃO FINAL

```bash
cd ~/Projetos/Linos/MVP7

# 1. Testes — todos devem passar (340 existentes + novos)
yarn workspace backend test 2>&1 | tail -10

# 2. Build backend
yarn workspace backend build 2>&1 | tail -5

# 3. Build frontend (verificar que helper compila)
yarn workspace frontend build 2>&1 | tail -5

# 4. Git
git add -A
git status
git commit -m "feat(pedidos): block order editing after CONFIRMADO status

- Add ESTADOS_BLOQUEIO_EDICAO constant (CONFIRMADO+)
- Update PedidosService.update() and updateItemQuantidade() validation
- Disable edit UI in portal and admin when status >= CONFIRMADO
- Add podeEditarPedido() frontend helper
- Only RASCUNHO and PENDENTE allow content changes

Decision D4: total block post-confirmation
refs: M4-F1, E5"
```

## CONTAGEM ESPERADA

- Testes anteriores: 340
- Novos testes estimados: ~6-8 (alguns podem substituir existentes)
- **Meta: 346+ testes passando**

## RESTRIÇÕES

- NÃO alterar lógica de transições de status — apenas edição de conteúdo
- NÃO bloquear `repeat()` — repetir cria novo pedido
- NÃO alterar comportamento de cancelamento — regido pelo mapa de transições
- NÃO refatorar código existente — apenas ajustar validações e adicionar constante
