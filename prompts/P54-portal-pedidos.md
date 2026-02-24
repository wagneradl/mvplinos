# P54 — Portal: Meus Pedidos (Listagem + Criação Simplificada)

## CONTEXTO

Projeto Lino's Panificadora — sistema B2B de gestão de pedidos.
Monorepo: `~/Projetos/Linos/MVP7` (Yarn Workspaces + Turborepo).
Stack: NestJS 10 (packages/backend) + Next.js 15 (packages/frontend) + Prisma/SQLite.
Branch: main. P53 concluído (catálogo portal, 301 testes).

**Objetivo:** Criar tela "Meus Pedidos" no portal — listagem ownership-filtered (só pedidos do cliente logado, via TenantGuard P43) + formulário simplificado de criação de pedido com seleção de produtos do catálogo.

## PRÉ-FLIGHT

```bash
cd ~/Projetos/Linos/MVP7
git status --short
git log --oneline -3
yarn workspace backend test 2>&1 | tail -5
```

Garantir 301 testes passando e working tree limpa.

## TAREFA 1 — Página /portal/pedidos (Listagem)

Criar `packages/frontend/src/app/(portal)/portal/pedidos/page.tsx`:

### Layout
- Título: "Meus Pedidos"
- Botão "Novo Pedido" no topo direito (abre formulário — Tarefa 3)
- Tabela/lista de pedidos do cliente

### Tabela de Pedidos
```
| # Pedido | Data       | Itens | Total    | Status      | Ações        |
|----------|------------|-------|----------|-------------|--------------|
| #42      | 20/02/2026 | 5     | R$ 150   | [Pendente]  | [Ver] [Cancelar?] |
| #38      | 18/02/2026 | 3     | R$ 85    | [Entregue]  | [Ver]        |
```

**Campos:**
- Número/ID do pedido
- Data de criação (formatada pt-BR)
- Quantidade de itens (count)
- Valor total
- Status com `StatusChip` (componente do P48 — reutilizar)
- Ações: "Ver detalhes" (link para P55), "Cancelar" (se status permite)

### Filtros
- Por status: "Todos" | filtros por cada status relevante para cliente
- Por período: opcional (date range picker se simples)

### Dados
- Chamar `GET /pedidos` — TenantGuard já filtra por `clienteId` do JWT (P43)
- Não precisa passar `clienteId` na query — o backend resolve via JWT

### Botão Cancelar
- Apenas visível para pedidos em RASCUNHO ou PENDENTE (verificar TRANSICOES_VALIDAS para papel CLIENTE)
- Dialog de confirmação: "Cancelar pedido #42?"
- Chama `PATCH /pedidos/:id/status` com `{ status: 'CANCELADO' }`
- Reutilizar `atualizarStatus` do service/hook de pedidos (P48)

## TAREFA 2 — Estado Vazio

Se o cliente não tem pedidos:
```
📋 Você ainda não fez nenhum pedido.
[Fazer primeiro pedido] → abre formulário de criação
```

## TAREFA 3 — Formulário de Novo Pedido

Implementar como **página separada** `/portal/pedidos/novo` ou **modal/drawer** na listagem (escolher o mais adequado ao padrão existente).

### Fluxo do Formulário

**Step 1 — Selecionar Produtos:**
```
┌─────────────────────────────────────────────┐
│  Novo Pedido                                │
│                                             │
│  Selecione os produtos:                     │
│  [Busca por nome...]                        │
│                                             │
│  ┌──────────┬──────────┬────────┬────────┐  │
│  │ Produto  │ Preço    │ Qtd    │ Subtot │  │
│  ├──────────┼──────────┼────────┼────────┤  │
│  │ Pão Fr.  │ R$ 0,50  │ [100]  │ R$ 50  │  │
│  │ Bolo Ch. │ R$ 35,00 │ [2]    │ R$ 70  │  │
│  └──────────┴──────────┴────────┴────────┘  │
│                                             │
│  Total: R$ 120,00           [3 itens]       │
│                                             │
│  Observações: [textarea]                    │
│                                             │
│  [Salvar Rascunho]  [Enviar Pedido]         │
└─────────────────────────────────────────────┘
```

**Comportamento:**
- Lista todos os produtos ativos (reutilizar dados do catálogo / GET /produtos)
- Campo de busca para filtrar produtos por nome
- Input numérico de quantidade para cada produto (default 0, incremento com +/-)
- Subtotal calculado automaticamente (preço × quantidade)
- Total geral atualizado em tempo real
- Campo de observações (texto livre, opcional)
- Apenas produtos com quantidade > 0 são incluídos no pedido

**Dois botões de ação:**
- "Salvar como Rascunho" → cria pedido com status `RASCUNHO`
- "Enviar Pedido" → cria pedido com status `RASCUNHO` e imediatamente transiciona para `PENDENTE`
  - Ou se o backend aceitar, cria direto com status `PENDENTE` para papel CLIENTE

### Chamada API para Criação

```typescript
// POST /pedidos
const payload = {
  // cliente_id NÃO precisa — backend usa JWT (TenantGuard)
  observacoes: form.observacoes,
  itens: produtosSelecionados.map(p => ({
    produto_id: p.id,
    quantidade: p.quantidade,
    preco_unitario: p.preco,  // preço no momento da compra
  })),
};
```

**ATENÇÃO:** Verificar o DTO/schema de criação de pedido no backend. O endpoint `POST /pedidos` já existe — verificar quais campos ele aceita (pode ser `items` vs `itens`, `produtoId` vs `produto_id`, etc.). Adaptar o payload ao que o backend espera.

### Validações
- Pelo menos 1 produto com quantidade > 0
- Quantidade deve ser positiva (inteiro)
- Se quantidade 0, não incluir no pedido

### Pós-criação
- Sucesso → toast "Pedido #X criado!" + redirect para `/portal/pedidos`
- Erro → mostrar mensagem de erro (API error)

## TAREFA 4 — Atualizar PortalLayout Navigation

Garantir que o item "Meus Pedidos" na nav do portal aponta para `/portal/pedidos`:

- Dashboard: `/portal/dashboard`
- Catálogo: `/portal/catalogo`
- **Meus Pedidos: `/portal/pedidos`** ← ativo neste prompt

## TAREFA 5 — Validação

### Build frontend
```bash
yarn workspace frontend build
```

### Backend (não deve ser afetado)
```bash
yarn workspace backend test
```
Target: 301 testes passando (inalterado)

### Verificação visual
- `/portal/pedidos` mostra apenas pedidos do cliente logado
- StatusChip renderiza corretamente
- Botão cancelar aparece apenas para RASCUNHO/PENDENTE
- Formulário de novo pedido lista produtos
- Busca de produtos funciona
- Quantidade + subtotal + total calculados corretamente
- Criar pedido funciona (rascunho e envio)
- Estado vazio tratado

## CRITÉRIOS DE SUCESSO

- [ ] Página `/portal/pedidos` com listagem ownership-filtered
- [ ] StatusChip reutilizado do P48
- [ ] Cancelamento de pedidos RASCUNHO/PENDENTE
- [ ] Estado vazio com CTA para criar pedido
- [ ] Formulário de novo pedido com seleção de produtos
- [ ] Busca de produtos no formulário
- [ ] Quantidade + subtotal + total em tempo real
- [ ] Campo de observações
- [ ] Botões "Salvar Rascunho" e "Enviar Pedido"
- [ ] POST /pedidos integrado com payload correto
- [ ] Redirect + toast pós-criação
- [ ] Nav do portal com "Meus Pedidos" ativo
- [ ] Backend: 301 testes (inalterado)
- [ ] Frontend: build sem erros

## NOTAS IMPORTANTES

- **Não modificar backend.** Endpoints já existem (POST /pedidos, GET /pedidos, PATCH /pedidos/:id/status).
- **TenantGuard filtra automaticamente** — GET /pedidos retorna só pedidos do cliente logado.
- **cliente_id é injetado pelo backend** via JWT — não enviar no payload de criação.
- **Verificar DTO de criação** de pedido no backend para nomes exatos dos campos.
- **Reutilizar componentes** existentes: StatusChip (P48), TransitionButtons ou lógica similar, serviço de pedidos.
- **Preço unitário no item:** capturar o preço no momento da criação (snapshot), não referência ao produto.
- **Commitar ao final** com: `feat(m3): portal meus pedidos — listagem, criação, cancelamento`
